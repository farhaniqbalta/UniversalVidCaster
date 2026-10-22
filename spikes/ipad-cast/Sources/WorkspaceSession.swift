import Foundation
import Combine

/// Design-independent state. Views receive values, never SDK clients/listeners.
struct WorkspaceCastState {
    var connected = false
    var device = "No device connected"
    var playback = "UNKNOWN"
    var position = 0.0
    var duration = 0.0
    var canSeek = false
    var playbackRate = 1.0
    var volume = 0.0
    var muted = false
    var canChangeRate = false
    var canChangeVolume = false
    var canMute = false
    var hasMedia = false
    var lastStatusAt: Date?
    var busy = false
    var message = "Choose your TV with the Cast icon."
    var logs: [String] = []
    var mediaTitle = ""
}

struct WorkspaceHostState {
    var busy = false
    var hosting = false
    var endsAt: Date?
    var expired = false
    var message = ""
}

@MainActor protocol WorkspaceCastClient: AnyObject {
    var workspaceState: WorkspaceCastState { get }
    var workspaceChanges: AnyPublisher<Void, Never> { get }
    func load(url: String, mime: String, start: String, title: String, live: Bool, hlsFMP4: Bool, subtitleURL: String, subtitleLanguage: String)
    func control(_ action: String)
    func seek(_ text: String)
    func setPlaybackRate(_ rate: Double)
    func setVolume(_ volume: Double)
    func setMuted(_ muted: Bool)
    @discardableResult func disconnect() -> Bool
    func stopForEnding() async -> Bool
    func foreground()
    func background()
}

@MainActor protocol WorkspaceHostClient: AnyObject {
    var workspaceState: WorkspaceHostState { get }
    var workspaceChanges: AnyPublisher<Void, Never> { get }
    func prepare(_ original: String) async throws -> URL
    func clear()
    func phaseChanged(active: Bool)
}

/// Owns the use cases and survives replacing any screen/theme. No SwiftUI,
/// UIKit, GoogleCast, design tokens, sheet state, or navigation belongs here.
@MainActor final class WorkspaceSession: ObservableObject {
    @Published var draft = PlaybackDraft()
    @Published private(set) var cast: WorkspaceCastState
    @Published private(set) var host: WorkspaceHostState
    @Published private(set) var error: String?
    @Published private(set) var preparing = false
    @Published private(set) var ending = false
    @Published private(set) var isActive = true
    @Published private(set) var submittedTitle = ""
    @Published private(set) var submittedSubtitleLanguage: String?
    @Published private(set) var loadSubmitted = false
    @Published private(set) var endResult: String?
    private let castClient: any WorkspaceCastClient
    private let hostClient: any WorkspaceHostClient
    private var subscriptions = Set<AnyCancellable>()

    init(cast: any WorkspaceCastClient, host: any WorkspaceHostClient) {
        castClient = cast; hostClient = host
        self.cast = cast.workspaceState; self.host = host.workspaceState
        // ObservableObject announces before mutations. Deliver on the next main
        // queue turn to snapshot settled values, and coalesce updates for views.
        cast.workspaceChanges.merge(with: host.workspaceChanges)
            .receive(on: DispatchQueue.main).sink { [weak self] in self?.refresh() }
            .store(in: &subscriptions)
    }

    var working: Bool { preparing || host.busy || cast.busy || ending }
    var sessionExists: Bool { loadSubmitted || cast.hasMedia || host.hosting }
    var canSeek: Bool { isActive && cast.connected && cast.hasMedia && cast.canSeek && cast.duration.isFinite && cast.duration > 0 && !working }
    var playerTitle: String { cast.mediaTitle.isEmpty ? (submittedTitle.isEmpty ? "Your video" : submittedTitle) : cast.mediaTitle }
    var playbackLabel: String { isActive && cast.lastStatusAt != nil ? cast.playback.capitalized : "Unknown" }

    private func refresh() {
        cast = castClient.workspaceState; host = hostClient.workspaceState
    }

    @discardableResult func validateDraft() -> Bool {
        do { _ = try draft.validated(); error = nil; return true }
        catch { self.error = (error as? InputError)?.message ?? "Check your video input."; return false }
    }

    func load() async {
        refresh()
        guard !working, isActive, cast.connected, validateDraft() else { return }
        let snapshot = draft
        let input: MediaInput
        do { input = try snapshot.validated() } catch { return }
        preparing = true; endResult = nil
        defer { preparing = false; refresh() }
        do {
            let target = snapshot.prepareOnIPad ? try await hostClient.prepare(input.url.absoluteString) : input.url
            refresh()
            guard isActive, cast.connected, !cast.busy else { throw InputError("Return to the app and reconnect to your TV before loading.") }
            submittedTitle = snapshot.title.isEmpty ? "Untitled video" : snapshot.title
            submittedSubtitleLanguage = snapshot.includeSubtitle ? snapshot.language : nil
            loadSubmitted = true
            castClient.load(url: target.absoluteString, mime: input.mime, start: String(input.startSeconds), title: submittedTitle,
                            live: snapshot.prepareOnIPad ? false : snapshot.live, hlsFMP4: snapshot.prepareOnIPad || snapshot.fmp4,
                            subtitleURL: snapshot.includeSubtitle ? snapshot.subtitleURL : "", subtitleLanguage: snapshot.language)
        } catch {
            self.error = (error as? InputError)?.message ?? "Could not prepare this video. Copy a fresh original link and retry."
        }
    }

    func control(_ action: String) {
        refresh(); guard !working, isActive else { return }
        castClient.control(action); refresh()
    }
    func seek(to position: Double) {
        refresh(); guard canSeek, position.isFinite else { return }
        castClient.seek(String(min(max(0, position), cast.duration))); refresh()
    }
    static let playbackRates: [Double] = [0.5, 0.75, 1, 1.25, 1.5, 2]
    var canAdjustMedia: Bool { isActive && cast.connected && cast.hasMedia && cast.lastStatusAt != nil && !working }
    func setPlaybackRate(_ rate: Double) {
        refresh(); guard canAdjustMedia, cast.canChangeRate, Self.playbackRates.contains(rate) else { return }
        castClient.setPlaybackRate(rate); refresh()
    }
    func setVolume(_ volume: Double) {
        refresh(); guard canAdjustMedia, cast.canChangeVolume, volume.isFinite, (0...1).contains(volume) else { return }
        castClient.setVolume(volume); refresh()
    }
    func setMuted(_ muted: Bool) {
        refresh(); guard canAdjustMedia, cast.canMute else { return }
        castClient.setMuted(muted); refresh()
    }
    func skip(_ delta: Double) { seek(to: cast.position + delta) }
    func disconnect() {
        refresh(); guard !working else { return }
        castClient.disconnect(); refresh() // Never invent confirmed disconnection.
    }
    func clearHosting() {
        refresh(); guard !working else { return }
        hostClient.clear(); refresh()
    }
    func endCasting() async {
        refresh(); guard !working else { return }
        ending = true; defer { ending = false; refresh() }
        let stopped = await castClient.stopForEnding()
        hostClient.clear()
        refresh()
        let wasConnected = cast.connected
        let requested = wasConnected ? castClient.disconnect() : false
        endResult = "TV Stop: \(stopped ? "acknowledged" : "not confirmed"). iPad sharing: cleared. Disconnect: \(requested ? "requested; awaiting session confirmation" : wasConnected ? "could not be requested" : "already disconnected")."
        error = stopped && (!wasConnected || requested) ? nil : "Some TV actions were not confirmed. Check the TV and connection status."
        loadSubmitted = false
    }
    func setActive(_ active: Bool) {
        isActive = active
        hostClient.phaseChanged(active: active)
        if active { castClient.foreground() } else { castClient.background() }
        refresh()
    }
    func useFlowerPreset() {
        guard !working else { return }
        draft = PlaybackDraft(); draft.url = MediaInput.flower; draft.title = "Flower"
    }
    @discardableResult func importSafariTransfer(_ text: String) -> Bool {
        refresh(); guard !working else { return false }
        do {
            let imported = try SafariHandoff.draft(from: text)
            draft = imported; error = nil
            return true // Only input changes. Never load, clear, or disconnect.
        } catch { self.error = (error as? InputError)?.message ?? "Could not import Safari transfer."; return false }
    }
    func useMacHLSPreset() {
        guard !working else { return }
        draft.prepareOnIPad = false; draft.mime = "application/vnd.apple.mpegurl"; draft.fmp4 = true; draft.live = false
    }
}
