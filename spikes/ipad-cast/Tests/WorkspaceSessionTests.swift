import XCTest
import Combine
@testable import MediaInput

@MainActor private final class FakeCastClient: WorkspaceCastClient {
    var workspaceState = WorkspaceCastState(connected: true)
    let changes = PassthroughSubject<Void, Never>()
    var workspaceChanges: AnyPublisher<Void, Never> { changes.eraseToAnyPublisher() }
    var loads: [(url: String, mime: String, subtitle: String, fmp4: Bool)] = []
    var seeks: [Double] = []
    var actions: [String] = []
    var stopResult = false
    var disconnectResult = true
    func load(url: String, mime: String, start: String, title: String, live: Bool, hlsFMP4: Bool, subtitleURL: String, subtitleLanguage: String) {
        loads.append((url, mime, subtitleURL, hlsFMP4))
    }
    func control(_ action: String) { actions.append(action) }
    func seek(_ text: String) { seeks.append(Double(text)!) }
    func disconnect() -> Bool { actions.append("disconnect"); return disconnectResult }
    func stopForEnding() async -> Bool { actions.append("stop"); return stopResult }
    func foreground() { actions.append("foreground"); workspaceState.lastStatusAt = nil; workspaceState.playback = "UNKNOWN" }
    func background() { actions.append("background"); workspaceState.lastStatusAt = nil; workspaceState.playback = "UNKNOWN" }
}

@MainActor private final class FakeHostClient: WorkspaceHostClient {
    var workspaceState = WorkspaceHostState()
    let changes = PassthroughSubject<Void, Never>()
    var workspaceChanges: AnyPublisher<Void, Never> { changes.eraseToAnyPublisher() }
    var prepared: [String] = []
    var failure = false
    var cleared = false
    var suspend = false
    var continuation: CheckedContinuation<URL, Error>?
    let result = URL(string: "http://192.168.1.8:1234/hls/session/master.m3u8")!
    func prepare(_ original: String) async throws -> URL {
        prepared.append(original)
        if failure { throw InputError("Preparation failed.") }
        if suspend { return try await withCheckedThrowingContinuation { continuation = $0 } }
        workspaceState.hosting = true
        return result
    }
    func clear() { cleared = true; workspaceState.hosting = false }
    func phaseChanged(active: Bool) { }
}

final class WorkspaceSessionTests: XCTestCase {
    @MainActor func testImportOnlyUpdatesDraftClearsOldSubtitleAndRetainsPlayback() {
        let cast = FakeCastClient(); let host = FakeHostClient()
        cast.workspaceState.playback = "PLAYING"; cast.workspaceState.hasMedia = true
        let session = WorkspaceSession(cast: cast, host: host)
        session.draft.includeSubtitle = true; session.draft.subtitleURL = "https://old.test/a.vtt"
        XCTAssertTrue(session.importSafariTransfer(#"{"type":"universal-vidcaster.handoff","version":1,"video":{"url":"https://media.test/a.mp4","method":"direct","startSeconds":0}}"#))
        XCTAssertFalse(session.draft.includeSubtitle)
        XCTAssertEqual(session.cast.playback, "PLAYING")
        XCTAssertTrue(cast.loads.isEmpty); XCTAssertFalse(host.cleared)
        let draft = session.draft.url
        XCTAssertFalse(session.importSafariTransfer("private-invalid-input"))
        XCTAssertEqual(session.draft.url, draft)
        XCTAssertFalse(session.error?.contains("private-invalid-input") == true)
    }
    @MainActor func testDirectLoadPreservesSubtitleWithoutClaimingPlaying() async {
        let cast = FakeCastClient(); let host = FakeHostClient()
        let session = WorkspaceSession(cast: cast, host: host)
        session.draft.url = MediaInput.flower
        session.draft.includeSubtitle = true; session.draft.subtitleURL = "https://subtitle.test/a.vtt?t=own%2Btoken"; session.draft.language = "en"
        await session.load()
        XCTAssertEqual(cast.loads.first?.url, MediaInput.flower)
        XCTAssertEqual(cast.loads.first?.subtitle, session.draft.subtitleURL)
        XCTAssertTrue(host.prepared.isEmpty)
        XCTAssertEqual(session.playbackLabel, "Unknown")
        XCTAssertEqual(session.draft.url, MediaInput.flower)
    }

    @MainActor func testIPadLoadPreparesOriginalAndUsesGeneratedURL() async {
        let cast = FakeCastClient(); let host = FakeHostClient()
        let session = WorkspaceSession(cast: cast, host: host)
        let original = "https://media.test/master.json?t=private&pm=browser"
        session.draft.url = original; session.draft.prepareOnIPad = true
        await session.load()
        XCTAssertEqual(host.prepared, [original])
        XCTAssertEqual(cast.loads.first?.url, host.result.absoluteString)
        XCTAssertEqual(cast.loads.first?.mime, "application/vnd.apple.mpegurl")
        XCTAssertEqual(cast.loads.first?.fmp4, true)
        XCTAssertEqual(session.draft.url, original)
    }

    @MainActor func testPreparationFailureRetainsInputsAndDoesNotLoad() async {
        let cast = FakeCastClient(); let host = FakeHostClient(); host.failure = true
        let session = WorkspaceSession(cast: cast, host: host)
        session.draft.url = "https://media.test/master.json?t=private&pm=browser"; session.draft.prepareOnIPad = true
        await session.load()
        XCTAssertEqual(session.error, "Preparation failed.")
        XCTAssertTrue(cast.loads.isEmpty)
        XCTAssertFalse(session.working)
        XCTAssertTrue(session.draft.url.contains("t=private"))
    }

    @MainActor func testDuplicateLoadAndLoadAfterAppLeavesAreBlocked() async {
        let cast = FakeCastClient(); let host = FakeHostClient(); host.suspend = true
        let session = WorkspaceSession(cast: cast, host: host)
        session.draft.url = "https://media.test/master.json?t=private&pm=browser"; session.draft.prepareOnIPad = true
        let first = Task { await session.load() }
        for _ in 0..<100 { if host.continuation != nil { break }; await Task.yield() }
        XCTAssertNotNil(host.continuation)
        await session.load()
        XCTAssertEqual(host.prepared.count, 1)
        session.setActive(false)
        host.continuation?.resume(returning: host.result); host.continuation = nil
        await first.value
        XCTAssertTrue(cast.loads.isEmpty)
        XCTAssertNotNil(session.error)
    }

    @MainActor func testPartialEndAndDisconnectDoNotInventReceiverState() async {
        let cast = FakeCastClient(); let host = FakeHostClient()
        cast.workspaceState.playback = "PLAYING"; cast.workspaceState.hasMedia = true; cast.workspaceState.lastStatusAt = Date()
        cast.disconnectResult = false; host.workspaceState.hosting = true
        let session = WorkspaceSession(cast: cast, host: host)
        await session.endCasting()
        XCTAssertEqual(cast.actions, ["stop", "disconnect"])
        XCTAssertTrue(host.cleared)
        XCTAssertEqual(session.cast.playback, "PLAYING")
        XCTAssertTrue(session.cast.connected)
        XCTAssertNotNil(session.error)
        XCTAssertTrue(session.endResult?.contains("not confirmed") == true)
    }

    @MainActor func testSeekingClampsAndInactiveControlsAreBlocked() {
        let cast = FakeCastClient(); let host = FakeHostClient()
        cast.workspaceState.hasMedia = true; cast.workspaceState.canSeek = true; cast.workspaceState.duration = 100
        let session = WorkspaceSession(cast: cast, host: host)
        session.seek(to: 120); session.seek(to: -15); session.seek(to: .nan)
        XCTAssertEqual(cast.seeks, [100, 0])
        session.setActive(false)
        session.control("play"); session.seek(to: 20)
        XCTAssertEqual(cast.seeks, [100, 0])
        XCTAssertFalse(cast.actions.contains("play"))
        XCTAssertEqual(session.playbackLabel, "Unknown")
    }

    @MainActor func testServiceUpdatesReachPresentationWithoutScreenOwnership() async {
        let cast = FakeCastClient(); let session = WorkspaceSession(cast: cast, host: FakeHostClient())
        cast.changes.send() // Like @Published: announces before the state changes.
        cast.workspaceState.playback = "PLAYING"; cast.workspaceState.lastStatusAt = Date()
        await withCheckedContinuation { continuation in DispatchQueue.main.async { continuation.resume() } }
        XCTAssertEqual(session.playbackLabel, "Playing")
    }
}
