import XCTest
@testable import MediaInput

final class ManifestPreparationTests: XCTestCase {
    let master = URL(string: "https://site.test/master.json?t=own%2Btoken&pm=browser")!
    let origin = URL(string: "http://192.168.1.10:12345")!

    func testPreloadsVideoAndAudioAndAuthorizesDirectMedia() async throws {
        let preparer = ManifestPreparation { url in
            if url.path == "/master.json" {
                return "#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,URI=\"audio.json\",GROUP-ID=\"a\"\n#EXT-X-STREAM-INF:BANDWIDTH=1,AUDIO=\"a\"\nvideo.json"
            }
            XCTAssertEqual(URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "t" })?.value, "own+token")
            return "#EXTM3U\n#EXT-X-MAP:URI=\"https://cdn.test/runtime.js\"\n#EXTINF:6,\nhttps://other.test/style.css?t=keep%2Bown\n#EXT-X-ENDLIST"
        }
        let prepared = try await preparer.prepare(master: master, origin: origin)
        XCTAssertEqual(prepared.pages.count, 3)
        XCTAssertEqual(prepared.entry.host, origin.host)
        let root = String(decoding: prepared.pages[prepared.entry.path]!, as: UTF8.self)
        XCTAssertTrue(root.contains("http://192.168.1.10:12345/hls/"))
        XCTAssertFalse(root.contains("own%2Btoken"))
        let bodies = prepared.pages.values.map { String(decoding: $0, as: UTF8.self) }.joined()
        XCTAssertTrue(bodies.contains("https://cdn.test/runtime.js?t=own%2Btoken&pm=browser"))
        XCTAssertTrue(bodies.contains("https://other.test/style.css?t=keep%2Bown&pm=browser"))
    }

    func testRejectsLiveEncryptionVariablesAndNonHLS() async {
        for text in ["#EXTM3U\n#EXTINF:6,\na.ts", "#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"key\"\n#EXT-X-ENDLIST", "#EXTM3U\n{$var}\n#EXT-X-ENDLIST", "<html>bad</html>"] {
            do { _ = try await ManifestPreparation(fetch: { _ in text }).prepare(master: master, origin: origin); XCTFail("Expected rejection") }
            catch { XCTAssertTrue(error is InputError) }
        }
    }

    func testRejectsCyclesAndUnsafeReferences() async {
        for reference in ["master.json", "http://cdn.test/a.json", "https://user:password@cdn.test/a.json"] {
            do {
                _ = try await ManifestPreparation(fetch: { _ in "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\n\(reference)" }).prepare(master: master, origin: origin)
                XCTFail("Expected rejection")
            } catch { XCTAssertTrue(error is InputError) }
        }
    }

    func testRequiresOriginalAuthorizationAndBoundsPayload() async {
        do {
            _ = try await ManifestPreparation(fetch: { _ in XCTFail("Should not fetch"); return "" }).prepare(master: URL(string: "https://site.test/master")!, origin: origin)
            XCTFail("Expected missing token failure")
        } catch { XCTAssertTrue(error is InputError) }
        do {
            _ = try await ManifestPreparation(fetch: { _ in String(repeating: "x", count: 1_048_577) }).prepare(master: master, origin: origin)
            XCTFail("Expected size failure")
        } catch { XCTAssertTrue(error is InputError) }
    }
}
