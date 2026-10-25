import XCTest
@testable import MediaInput

final class SafariHandoffTests: XCTestCase {
    func testAppLinkPreservesOriginalQueriesAndRejectsOtherRoutes() throws {
        let raw = #"{"type":"universal-vidcaster.handoff","version":1,"video":{"url":"https://media.test/a.mp4?t=a%2Bb&pm=browser","method":"direct","startSeconds":0},"subtitle":{"url":"https://sub.test/a.vtt?t=own%2Ftoken","language":"id"}}"#
        var parts = URLComponents(); parts.scheme = "universalvidcaster"; parts.host = "import"; parts.fragment = raw
        let text = try SafariHandoff.transfer(from: XCTUnwrap(parts.url))
        XCTAssertEqual(text, raw)
        XCTAssertEqual(try SafariHandoff.draft(from: text).subtitleURL, "https://sub.test/a.vtt?t=own%2Ftoken")
        for link in ["https://import#x", "universalvidcaster://other#x", "universalvidcaster://import/path#x",
                     "universalvidcaster://import?payload=x#x", "universalvidcaster://user@import#x",
                     "universalvidcaster://import:80#x", "universalvidcaster://import", "universalvidcaster://import#%7B%7D"] {
            XCTAssertThrowsError(try SafariHandoff.transfer(from: XCTUnwrap(URL(string: link))))
        }
    }

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
