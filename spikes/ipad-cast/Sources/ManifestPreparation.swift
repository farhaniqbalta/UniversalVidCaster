import Foundation

struct PreparedManifests {
    let entry: URL
    let pages: [String: Data]
}

final class ManifestPreparation {
    typealias Fetch = (URL) async throws -> String
    private let fetch: Fetch
    init(fetch: @escaping Fetch) { self.fetch = fetch }

    func prepare(master: URL, origin: URL) async throws -> PreparedManifests {
        let auth = URLComponents(url: master, resolvingAgainstBaseURL: false)?.queryItems ?? []
        guard let token = auth.first(where: { $0.name == "t" })?.value, !token.isEmpty,
              let mode = auth.first(where: { $0.name == "pm" })?.value, !mode.isEmpty else {
            throw InputError("Original master URL must include t and pm.")
        }
        let prefix = "/hls/\(UUID().uuidString)/"
        var paths: [URL: String] = [:]
        var pages: [String: Data] = [:]
        var active = Set<URL>()
        var total = 0
        func authorized(_ reference: String, base: URL) throws -> URL {
            guard let url = URL(string: reference, relativeTo: base)?.absoluteURL,
                  url.scheme?.lowercased() == "https", url.user == nil, url.password == nil,
                  url.port == nil || url.port == 443,
                  var parts = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
                throw InputError("Playlist references must use HTTPS without credentials on port 443.")
            }
            let items = parts.queryItems ?? []
            var query = parts.percentEncodedQuery ?? ""
            for (name, value) in [("t", token), ("pm", mode)] where !items.contains(where: { $0.name == name }) {
                var addition = URLComponents()
                addition.queryItems = [URLQueryItem(name: name, value: value)]
                let encoded = addition.percentEncodedQuery!.replacingOccurrences(of: "+", with: "%2B")
                query += (query.isEmpty ? "" : "&") + encoded
            }
            parts.percentEncodedQuery = query; parts.fragment = nil
            guard let result = parts.url else { throw InputError("Invalid playlist reference.") }
            return result
        }
        func visit(_ url: URL, depth: Int) async throws -> URL {
            try Task.checkCancellation()
            guard depth <= 4, !active.contains(url) else { throw InputError("Playlist nesting or cycle is unsupported.") }
            if let path = paths[url] { return URL(string: path, relativeTo: origin)!.absoluteURL }
            guard paths.count < 32 else { throw InputError("Playlist graph exceeds 32 playlists.") }
            let path = prefix + UUID().uuidString + ".m3u8"
            paths[url] = path; active.insert(url)
            defer { active.remove(url) }
            let text = try await fetch(url)
            total += text.utf8.count
            guard text.utf8.count <= 1_048_576, total <= 8_388_608 else { throw InputError("Playlist memory limit exceeded.") }
            let lines = text.components(separatedBy: .newlines)
            guard text.trimmingCharacters(in: .whitespacesAndNewlines).hasPrefix("#EXTM3U"), !text.contains("{$") else {
                throw InputError("Expected HLS without variable substitution.")
            }
            let masterPlaylist = lines.contains { $0.hasPrefix("#EXT-X-STREAM-INF:") }
            if !masterPlaylist && !lines.contains(where: { $0.trimmingCharacters(in: .whitespacesAndNewlines) == "#EXT-X-ENDLIST" }) {
                throw InputError("Only finite VOD playlists are supported. Live playlists are not supported.")
            }
            let pattern = try NSRegularExpression(pattern: "URI=\"([^\"]*)\"")
            var output: [String] = []
            for line in lines {
                let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
                if trimmed.hasPrefix("#EXT-X-KEY:") || trimmed.hasPrefix("#EXT-X-SESSION-KEY:") {
                    guard trimmed.components(separatedBy: ":").dropFirst().joined(separator: ":").components(separatedBy: ",").contains("METHOD=NONE") else {
                        throw InputError("Encrypted playlists are outside this test.")
                    }
                }
                if trimmed.isEmpty { output.append(""); continue }
                if !trimmed.hasPrefix("#") {
                    let child = try authorized(trimmed, base: url)
                    let result = masterPlaylist ? try await visit(child, depth: depth + 1) : child
                    output.append(result.absoluteString); continue
                }
                let isPlaylist = ["#EXT-X-MEDIA:", "#EXT-X-I-FRAME-STREAM-INF:"].contains(where: { trimmed.hasPrefix($0) })
                var rewritten = line
                for match in pattern.matches(in: line, range: NSRange(line.startIndex..., in: line)).reversed() {
                    guard let range = Range(match.range(at: 1), in: line), let replace = Range(match.range(at: 1), in: rewritten) else { continue }
                    let child = try authorized(String(line[range]), base: url)
                    let result = isPlaylist ? try await visit(child, depth: depth + 1) : child
                    rewritten.replaceSubrange(replace, with: result.absoluteString)
                }
                output.append(rewritten)
            }
            pages[path] = Data(output.joined(separator: "\n").utf8)
            return URL(string: path, relativeTo: origin)!.absoluteURL
        }
        let input = try MediaInput(url: master.absoluteString, mime: "application/vnd.apple.mpegurl", startSeconds: 0)
        guard input.url.scheme == "https", input.url.port == nil || input.url.port == 443 else { throw InputError("Use an original HTTPS master URL on port 443.") }
        let entry = try await visit(input.url, depth: 0)
        return PreparedManifests(entry: entry, pages: pages)
    }
}

final class ManifestFetcher: NSObject, URLSessionTaskDelegate {
    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.httpCookieStorage = nil; config.httpShouldSetCookies = false
        config.urlCredentialStorage = nil; config.urlCache = nil
        config.timeoutIntervalForRequest = 15; config.timeoutIntervalForResource = 20
        return URLSession(configuration: config, delegate: self, delegateQueue: nil)
    }()
    func close() { session.invalidateAndCancel() }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
    func fetch(_ url: URL) async throws -> String {
        var request = URLRequest(url: url)
        request.setValue("application/vnd.apple.mpegurl", forHTTPHeaderField: "Accept")
        let (bytes, response) = try await session.bytes(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw InputError("Playlist request refused or failed (HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0)).")
        }
        var data = Data()
        for try await byte in bytes {
            if data.count >= 1_048_576 { throw InputError("Playlist exceeds 1 MiB.") }
            data.append(byte)
        }
        guard let text = String(data: data, encoding: .utf8) else { throw InputError("Playlist is not UTF-8 text.") }
        return text
    }
}
