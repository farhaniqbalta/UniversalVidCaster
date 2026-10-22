import XCTest
@testable import MediaInput

final class SafariHandoffTests: XCTestCase {
    func testImportsSignedHLSAndIndependentSubtitle() throws {
        let raw = #"{"type":"universal-vidcaster.handoff","version":1,"video":{"url":"https://media.test/master.json?t=own%2Btoken&pm=browser","mimeType":"application/vnd.apple.mpegurl","method":"prepare-on-ipad","startSeconds":0},"subtitle":{"url":"https://sub.test/a.vtt?t=other%2Btoken","language":"id"}}"#
        let draft = try SafariHandoff.draft(from: raw)
        XCTAssertTrue(draft.prepareOnIPad)
        XCTAssertEqual(draft.url, "https://media.test/master.json?t=own%2Btoken&pm=browser")
        XCTAssertEqual(draft.subtitleURL, "https://sub.test/a.vtt?t=other%2Btoken")
        XCTAssertEqual(draft.language, "id")
    }
    func testNoSubtitleCreatesFreshDraftAndUnknownVersionsFail() throws {
        let raw = #"{"type":"universal-vidcaster.handoff","version":1,"video":{"url":"https://media.test/a.mp4","method":"direct","startSeconds":0}}"#
        let draft = try SafariHandoff.draft(from: raw)
        XCTAssertFalse(draft.includeSubtitle); XCTAssertEqual(draft.subtitleURL, "")
        XCTAssertThrowsError(try SafariHandoff.draft(from: raw.replacingOccurrences(of: "\"version\":1", with: "\"version\":9")))
        XCTAssertThrowsError(try SafariHandoff.draft(from: "https://media.test/a.mp4"))
        XCTAssertThrowsError(try SafariHandoff.draft(from: String(repeating: "x", count: 65537)))
    }
}
