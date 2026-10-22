import XCTest
@testable import MediaInput

final class LocalManifestServerTests: XCTestCase {
    func testServesPublishedPlaylistsWithCORSAndRejectsUnknownPathsAndWrites() async throws {
        let server = LocalManifestServer()
        let origin = try await server.start(address: "127.0.0.1", wifiOnly: false)
        defer { server.stop() }
        let session = URLSession(configuration: .ephemeral)
        defer { session.invalidateAndCancel() }
        let body = Data("#EXTM3U\n#EXT-X-ENDLIST".utf8)
        await server.publish(["/hls/test.m3u8": body])
        let url = URL(string: "/hls/test.m3u8", relativeTo: origin)!.absoluteURL
        let (data, response) = try await session.data(from: url)
        let http = response as! HTTPURLResponse
        XCTAssertEqual(http.statusCode, 200)
        XCTAssertEqual(data, body)
        XCTAssertEqual(http.value(forHTTPHeaderField: "Access-Control-Allow-Origin"), "*")
        XCTAssertEqual(http.value(forHTTPHeaderField: "Content-Type"), "application/vnd.apple.mpegurl")
        XCTAssertEqual(http.value(forHTTPHeaderField: "Cache-Control"), "no-store")
        var request = URLRequest(url: url); request.httpMethod = "HEAD"
        let (head, headResponse) = try await session.data(for: request)
        XCTAssertTrue(head.isEmpty)
        XCTAssertEqual((headResponse as! HTTPURLResponse).value(forHTTPHeaderField: "Content-Length"), String(body.count))
        request.httpMethod = "POST"
        let (_, rejected) = try await session.data(for: request)
        XCTAssertEqual((rejected as! HTTPURLResponse).statusCode, 405)
        let (_, missing) = try await session.data(from: origin.appendingPathComponent("unknown"))
        XCTAssertEqual((missing as! HTTPURLResponse).statusCode, 404)
    }
}
