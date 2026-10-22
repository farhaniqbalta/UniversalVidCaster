import XCTest
@testable import MediaInput

final class MediaInputTests: XCTestCase {
    func testFMP4RequiresHLSAndPreservesLANBridgeURL() throws {
        let raw = "http://192.168.1.20:8787/hls/session/playlist.m3u8"
        for mime in ["application/vnd.apple.mpegurl", "application/x-mpegURL"] {
            let input = try MediaInput(url: raw, mime: mime, startSeconds: 20, hlsFMP4: true)
            XCTAssertTrue(input.hlsFMP4)
            XCTAssertEqual(input.url.absoluteString, raw)
            XCTAssertEqual(input.startSeconds, 20)
        }
        XCTAssertThrowsError(try MediaInput(url: MediaInput.flower, mime: "video/mp4", startSeconds: 0, hlsFMP4: true))
        XCTAssertFalse(try MediaInput(url: MediaInput.flower, mime: "video/mp4", startSeconds: 0).hlsFMP4)
    }
    func testPreservesSignedQueryWithoutLoggingOrRewritingIt() throws {
        let raw = "https://example.test/video.mp4?signature=a%2Bb&expires=100"
        let input = try MediaInput(url: raw, mime: "video/mp4", startSeconds: 1.25)
        XCTAssertEqual(input.url.absoluteString, raw)
        XCTAssertEqual(input.startSeconds, 1.25)
    }

    func testRejectsNontransferableAndCredentialURLs() {
        for raw in ["blob:https://example.test/id", "file:///movie", "ftp://example.test/a", "https://user:password@example.test/a", "https://", "https://example.test/a b"] {
            XCTAssertThrowsError(try MediaInput(url: raw, mime: "video/mp4", startSeconds: 0))
        }
    }

    func testRejectsRedactedReportsInsteadOfSendingInvalidMedia() {
        for raw in ["https://example.test/a?t=[REDACTED]", "https://example.test/a?t=%5BREDACTED%5D"] {
            XCTAssertThrowsError(try MediaInput(url: raw, mime: "video/mp4", startSeconds: 0))
        }
    }

    func testRejectsInvalidStartPositions() {
        for value in [-1.0, Double.nan, Double.infinity] {
            XCTAssertThrowsError(try MediaInput(url: MediaInput.flower, mime: "video/mp4", startSeconds: value))
        }
    }

    func testMIMEValidation() throws {
        for mime in ["", "mp4", "video/", "video/mp4\nsecret"] {
            XCTAssertThrowsError(try MediaInput(url: MediaInput.flower, mime: mime, startSeconds: 0))
        }
        XCTAssertEqual(try MediaInput(url: "https://example.test/config.json?t=original", mime: "application/vnd.apple.mpegurl", startSeconds: 0).mime, "application/vnd.apple.mpegurl")
    }

    func testValidationMessagesDoNotExposePrivateURL() {
        do {
            _ = try MediaInput(url: "https://user:private-password@example.test/a", mime: "video/mp4", startSeconds: 0)
            XCTFail("Expected rejection")
        } catch {
            XCTAssertFalse(error.localizedDescription.contains("private-password"))
        }
    }
}
