import XCTest
@testable import MediaInput

final class SubtitleInputTests: XCTestCase {
    func testPreservesIndependentAuthorization() throws {
        let raw = "https://captions.example.test/en.vtt?t=subtitle%2Btoken&pm=browser"
        let subtitle = try XCTUnwrap(SubtitleInput.parse(url: raw, language: " en-US "))
        XCTAssertEqual(subtitle.url.absoluteString, raw)
        XCTAssertEqual(subtitle.language, "en-US")
    }
    func testOptionalSubtitleAndSupportedLanguageInputs() throws {
        XCTAssertNil(try SubtitleInput.parse(url: "  ", language: ""))
        for language in ["en", "id", "en-US", "zh-Hant"] {
            XCTAssertNotNil(try SubtitleInput.parse(url: "https://example.test/a.vtt", language: language))
        }
    }
    func testRejectsInvalidSubtitleURLsWithoutLeakingSecrets() {
        for raw in ["blob:https://example.test/secret", "https://user:private-password@example.test/a.vtt", "https://example.test/a.vtt?t=%5BREDACTED%5D", "invalid-secret"] {
            do { _ = try SubtitleInput.parse(url: raw, language: "en"); XCTFail("Expected rejection") }
            catch {
                XCTAssertTrue(error is InputError)
                XCTAssertFalse(error.localizedDescription.contains("private-password"))
                XCTAssertFalse(error.localizedDescription.contains("invalid-secret"))
            }
        }
    }
    func testRejectsMissingOrMalformedLanguage() {
        for language in ["", "English subtitles", "en_US", "<en>"] {
            XCTAssertThrowsError(try SubtitleInput.parse(url: "https://example.test/a.vtt", language: language))
        }
    }
}
