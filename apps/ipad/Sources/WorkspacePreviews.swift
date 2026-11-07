#if DEBUG
import SwiftUI
import Combine

/// Preview-only clients: no Cast SDK initialization, networking, or real tokens.
@MainActor private final class PreviewCast: ObservableObject, WorkspaceCastClient {
    @Published var workspaceState: WorkspaceCastState
    var workspaceChanges: AnyPublisher<Void, Never> { objectWillChange.map { _ in () }.eraseToAnyPublisher() }
    init(playing: Bool, connected: Bool = true, paused: Bool = false, seekable: Bool = true) {
        workspaceState = WorkspaceCastState(connected: connected, device: connected ? "Living Room TV" : "No device connected", playback: playing ? (paused ? "PAUSED" : "PLAYING") : "IDLE",
                                            position: playing ? 78 : 0, duration: 1440, canSeek: playing && seekable, hasMedia: playing,
                                            lastStatusAt: Date(), message: "Design preview · no real TV connected.", mediaTitle: playing ? "Sample episode" : "")
        workspaceState.volume = 0.5
        workspaceState.canChangeRate = playing; workspaceState.canChangeVolume = playing; workspaceState.canMute = playing
    }
    func load(url: String, mime: String, start: String, title: String, live: Bool, hlsFMP4: Bool, subtitleURL: String, subtitleLanguage: String) {
        workspaceState.playback = "PLAYING"; workspaceState.hasMedia = true; workspaceState.canSeek = true
        workspaceState.mediaTitle = title; workspaceState.lastStatusAt = Date()
    }
    func control(_ action: String) {
        if action == "pause" { workspaceState.playback = "PAUSED" }
        if action == "play" { workspaceState.playback = "PLAYING" }
        if action == "stop" { workspaceState.playback = "IDLE"; workspaceState.hasMedia = false }
        workspaceState.lastStatusAt = Date()
    }
    func setPlaybackRate(_ rate: Double) { workspaceState.playbackRate = rate }
    func setVolume(_ volume: Double) { workspaceState.volume = volume }
    func setMuted(_ muted: Bool) { workspaceState.muted = muted }
    func seek(_ text: String) { workspaceState.position = Double(text) ?? 0 }
    func disconnect() -> Bool { workspaceState.connected = false; return true }
    func stopForEnding() async -> Bool { control("stop"); return true }
    func foreground() { workspaceState.lastStatusAt = Date() }
    func background() { workspaceState.lastStatusAt = nil }
}
@MainActor private final class PreviewHost: ObservableObject, WorkspaceHostClient {
    @Published var workspaceState: WorkspaceHostState
    var workspaceChanges: AnyPublisher<Void, Never> { objectWillChange.map { _ in () }.eraseToAnyPublisher() }
    init(playing: Bool) {
        workspaceState = WorkspaceHostState(hosting: playing, endsAt: playing ? Date().addingTimeInterval(1800) : nil,
                                            message: "Design preview · no playlist listener running.")
    }
    func prepare(_ original: String) async throws -> URL {
        workspaceState.hosting = true; workspaceState.endsAt = Date().addingTimeInterval(1800)
        return URL(string: "http://preview.example.test/hls/example.m3u8")!
    }
    func clear() { workspaceState.hosting = false; workspaceState.endsAt = nil }
    func phaseChanged(active: Bool) { }
}

@MainActor private func designPreview(playing: Bool = false, connected: Bool = true, imported: Bool = false, paused: Bool = false, seekable: Bool = true) -> WorkspaceSession {
    let session = WorkspaceSession(cast: PreviewCast(playing: playing, connected: connected, paused: paused, seekable: seekable), host: PreviewHost(playing: playing))
    if playing || imported {
        session.draft.prepareOnIPad = true
        session.draft.url = "https://media.example.test/master.json?t=EXAMPLE&pm=browser"
    }
    return session
}

#Preview("Setup · no SDK or network") {
    CastWorkspaceView(session: designPreview(connected: false), devicePicker: AnyView(Image(systemName: "tv")))
}
#Preview("Imported · disconnected") {
    CastWorkspaceView(session: designPreview(connected: false, imported: true), devicePicker: AnyView(Image(systemName: "tv")))
}
#Preview("Imported · connected") {
    CastWorkspaceView(session: designPreview(imported: true), devicePicker: AnyView(Image(systemName: "tv")))
}
#Preview("Playing · landscape", traits: .landscapeLeft) {
    CastWorkspaceView(session: designPreview(playing: true), devicePicker: AnyView(Image(systemName: "tv")))
}
#Preview("Paused · compact") {
    CastWorkspaceView(session: designPreview(playing: true, paused: true), devicePicker: AnyView(Image(systemName: "tv")))
        .frame(width: 390, height: 800)
}
#Preview("Playing · seeking unavailable") {
    CastWorkspaceView(session: designPreview(playing: true, seekable: false), devicePicker: AnyView(Image(systemName: "tv")))
}
#endif
