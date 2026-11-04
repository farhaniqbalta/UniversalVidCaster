import XCTest
@testable import MediaInput

final class PlaybackDraftTests: XCTestCase {
    func testBoundedStartTimes() throws {
        XCTAssertEqual(try PlaybackDraft.seconds("1:30"), 90)
        XCTAssertEqual(try PlaybackDraft.seconds("1:02:03"), 3723)
        XCTAssertEqual(try PlaybackDraft.seconds("1.25"), 1.25)
        XCTAssertEqual(try PlaybackDraft.seconds(""), 0)
        for value in ["1:99", "1::2", "-1", "nan", "inf", "999999999999999999999999999999999", "10000000:00", "1:2:3:4"] {
            XCTAssertThrowsError(try PlaybackDraft.seconds(value))
        }
    }
    func testDirectMIMEInferenceAndCredentialsValidation() throws {
        var draft = PlaybackDraft(); draft.url = MediaInput.flower
        XCTAssertEqual(try draft.validated().mime, "video/mp4")
        draft.url = "https://user:secret@example.test/a.mp4"
        XCTAssertThrowsError(try draft.validated())
        draft.url = "https://example.test/config.json"
        XCTAssertThrowsError(try draft.validated())
    }
    func testIPadModeOverridesAdvancedOptionsAndPreservesSeparateSubtitle() throws {
        var draft = PlaybackDraft()
        draft.prepareOnIPad = true; draft.url = "https://example.test/master.json?t=own%2Btoken&pm=browser"
        draft.mime = "video/mp4"; draft.start = "2:00"
        draft.includeSubtitle = true; draft.subtitleURL = "https://subtitle.test/a.vtt?t=other&pm=browser"; draft.language = "id"
        let input = try draft.validated()
        XCTAssertEqual(input.mime, "application/vnd.apple.mpegurl")
        XCTAssertTrue(input.hlsFMP4)
        XCTAssertEqual(input.startSeconds, 120)
        XCTAssertEqual(input.url.absoluteString, draft.url)
        draft.subtitleURL = ""
        XCTAssertThrowsError(try draft.validated())
        draft.includeSubtitle = false
        XCTAssertNoThrow(try draft.validated())
        draft.url = "https://example.test/master.json"
        XCTAssertThrowsError(try draft.validated())
    }
}
