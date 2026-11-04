import Foundation
import Network
import Darwin

// All mutable networking state is confined to queue.
final class LocalManifestServer: @unchecked Sendable {
    private let queue = DispatchQueue(label: "uvc.manifest-server")
    private var listener: NWListener?
    private var pages: [String: Data] = [:]
    private var connections: [UUID: NWConnection] = [:]
    private var expires = Date.distantPast

    static func wifiAddresses() -> [String] {
        var head: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&head) == 0 else { return [] }
        defer { freeifaddrs(head) }
        var results: [String] = []
        var cursor = head
        while let item = cursor {
            defer { cursor = item.pointee.ifa_next }
            guard let address = item.pointee.ifa_addr, address.pointee.sa_family == UInt8(AF_INET),
                  String(cString: item.pointee.ifa_name) == "en0" else { continue }
            var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            if getnameinfo(address, socklen_t(address.pointee.sa_len), &host, socklen_t(host.count), nil, 0, NI_NUMERICHOST) == 0 {
                let value = String(cString: host)
                if !value.hasPrefix("169.254.") { results.append(value) }
            }
        }
        return results
    }

    func start(address: String, wifiOnly: Bool = true) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            queue.async { [self] in
                do {
                    let parameters = NWParameters.tcp
                    if wifiOnly { parameters.requiredInterfaceType = .wifi }
                    let listener = try NWListener(using: parameters, on: .any)
                    self.listener = listener
                    var completed = false
                    func finish(_ result: Result<URL, Error>) {
                        guard !completed else { return }; completed = true
                        continuation.resume(with: result)
                    }
                    listener.stateUpdateHandler = { state in
                        switch state {
                        case .ready:
                            guard let port = listener.port, let origin = URL(string: "http://\(address):\(port.rawValue)") else { return }
                            finish(.success(origin))
                        case .failed, .cancelled:
                            finish(.failure(InputError("Could not start the iPad playlist listener. Check Wi-Fi and Local Network permission.")))
                        default: break
                        }
                    }
                    listener.newConnectionHandler = { [weak self] connection in self?.accept(connection) }
                    listener.start(queue: self.queue)
                    self.queue.asyncAfter(deadline: .now() + 10) {
                        if !completed { listener.cancel(); finish(.failure(InputError("Playlist listener timed out."))) }
                    }
                } catch { continuation.resume(throwing: InputError("Could not create the iPad playlist listener.")) }
            }
        }
    }

    func publish(_ pages: [String: Data]) async {
        await withCheckedContinuation { continuation in
            queue.async { self.pages = pages; self.expires = Date().addingTimeInterval(1800); continuation.resume() }
        }
    }

    func stop() {
        queue.async {
            self.listener?.cancel(); self.listener = nil; self.pages.removeAll()
            for connection in self.connections.values { connection.cancel() }
            self.connections.removeAll()
        }
    }

    private func accept(_ connection: NWConnection) {
        guard connections.count < 16 else { connection.cancel(); return }
        let key = UUID(); connections[key] = connection
        connection.start(queue: queue)
        queue.asyncAfter(deadline: .now() + 10) { [weak self] in self?.connections.removeValue(forKey: key)?.cancel() }
        receive(connection, key: key, data: Data())
    }

    private func receive(_ connection: NWConnection, key: UUID, data: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 4096) { [weak self] chunk, _, complete, error in
            guard let self else { connection.cancel(); return }
            var data = data; if let chunk { data.append(chunk) }
            if data.count > 8192 || error != nil { self.finish(connection, key: key); return }
            guard data.range(of: Data("\r\n\r\n".utf8)) != nil else {
                if complete { self.finish(connection, key: key) }
                else { self.receive(connection, key: key, data: data) }; return
            }
            let first = String(decoding: data, as: UTF8.self).components(separatedBy: "\r\n")[0].split(separator: " ")
            guard first.count == 3, ["GET", "HEAD", "OPTIONS"].contains(String(first[0])) else {
                self.reply(connection, key: key, code: 405, body: Data(), head: false); return
            }
            if first[0] == "OPTIONS" { self.reply(connection, key: key, code: 204, body: Data(), head: false); return }
            let path = String(first[1])
            let body = self.expires > Date() ? self.pages[path] : nil
            if self.expires <= Date() { self.pages.removeAll() }
            self.reply(connection, key: key, code: body == nil ? 404 : 200, body: body ?? Data(), head: first[0] == "HEAD")
        }
    }
    private func finish(_ connection: NWConnection, key: UUID) { connections.removeValue(forKey: key); connection.cancel() }
    private func reply(_ connection: NWConnection, key: UUID, code: Int, body: Data, head: Bool) {
        let reason = [200: "OK", 204: "No Content", 404: "Not Found", 405: "Method Not Allowed"][code]!
        let header = "HTTP/1.1 \(code) \(reason)\r\nContent-Type: application/vnd.apple.mpegurl\r\nContent-Length: \(body.count)\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, HEAD, OPTIONS\r\nAccess-Control-Allow-Headers: Range\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n"
        var response = Data(header.utf8); if !head { response.append(body) }
        connection.send(content: response, completion: .contentProcessed { [weak self] _ in self?.finish(connection, key: key) })
    }
}
