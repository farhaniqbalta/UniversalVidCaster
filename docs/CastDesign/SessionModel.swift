import Foundation
import SwiftUI
import Observation

enum PrimaryState: Equatable {
    case needsLink, needsTV, ready(String), working(String), replace
}

@MainActor @Observable
final class SessionModel {
    // Inputs (memory only)
    var input = VideoInput()
    var showValidation = false

    // Three truths
    var discovery: DiscoveryState = .needsPermissionContext
    var tv: TVState = .notConnected
    var host: HostState = .notUsed
    var playback: PlaybackState = .idle

    // Session
    var phase: CastPhase = .idle
    var failure: FailureKind?
    var title = ""
    var position: Double = 0
    var duration: Double?
    var canSeek = false
    var isSeeking = false
    var lastStatusDate: Date?
    var hostingEndsAt: Date?          // [New] needs a structured expiry from the host
    var subtitle: SubtitleStatus = .off
    var subtitleToggleSupported = false // [New] keep false until validated on a real TV
    var toast: String?
    var sessionMethod: PlayMethod = .direct

    @ObservationIgnored let backend: CastBackend
    @ObservationIgnored private var timeoutTask: Task<Void, Never>?
    @ObservationIgnored private var toastTask: Task<Void, Never>?

    init(backend: CastBackend) {
        self.backend = backend
        backend.attach(self)
    }

    // MARK: Derived

    var videoError: String? { InputValidator.videoLink(input.urlText) }
    var startError: String? { InputValidator.start(input.startText).error }
    var subtitleLinkError: String? { InputValidator.subtitleLink(input.subtitleURLText) }
    var languageError: String? {
        guard input.hasSubtitles else { return nil }
        return InputValidator.language(input.languageCode)
    }
    var isInputValid: Bool {
        videoError == nil && startError == nil && subtitleLinkError == nil && languageError == nil
    }

    var isWorking: Bool { phase == .preparing || phase == .sending }
    var hostRetained: Bool { host.isRetained }
    var hasSession: Bool { phase == .waitingForTV || phase == .active || hostRetained }
    var disconnectedButHosting: Bool { !tv.isConnected && hostRetained }
    var tvName: String { tv.name ?? "your TV" }

    var primary: PrimaryState {
        switch phase {
        case .preparing: return .working(Copy.preparing)
        case .sending: return .working(Copy.sending(tvName))
        default: break
        }
        if videoError != nil { return .needsLink }
        if !tv.isConnected { return .needsTV }
        if hasSession { return .replace }
        return .ready(input.method == .direct ? Copy.ctaDirect(tvName) : Copy.ctaPrepare(tvName))
    }

    // MARK: Cast

    func makeRequest() -> CastRequest? {
        guard isInputValid else { return nil }
        let isIPad = input.method == .prepareOnIPad
        let subtitle = input.hasSubtitles
            ? SubtitleRequest(url: input.subtitleURLText.trimmed, language: input.languageCode) : nil
        return CastRequest(
            videoURL: input.urlText.trimmed,
            title: input.title.trimmed.isEmpty ? nil : input.title.trimmed,
            startSeconds: InputValidator.start(input.startText).seconds,
            method: input.method,
            subtitle: subtitle,
            mimeType: (isIPad || input.mimeType.trimmed.isEmpty) ? nil : input.mimeType.trimmed,
            usesFMP4: isIPad ? true : input.usesFMP4,
            isLive: isIPad ? false : input.isLive)
    }

    func castTapped() async {
        showValidation = true
        guard let request = makeRequest(), tv.isConnected, !isWorking else { return }
        timeoutTask?.cancel()
        failure = nil
        sessionMethod = input.method
        title = request.title ?? Copy.untitled
        position = request.startSeconds
        duration = nil; canSeek = false; isSeeking = false
        playback = .idle
        subtitle = request.subtitle.map { .configured(language: $0.language) } ?? .off
        subtitleToggleSupported = false
        phase = request.method == .prepareOnIPad ? .preparing : .sending
        do {
            try await backend.prepareAndCast(request)
            if phase == .preparing || phase == .sending {
                phase = .waitingForTV
                playback = .sentToTV
                startTimeoutWatch()
            }
        } catch CastFailure.cancelled {
            phase = .idle
        } catch CastFailure.preparation {
            failure = .preparation; phase = .failed
        } catch {
            failure = .load; phase = .failed
        }
    }

    /// 20 s with no receiver update means UNKNOWN outcome, not failure (spec section 8).
    private func startTimeoutWatch() {
        timeoutTask?.cancel()
        timeoutTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(20))
            guard !Task.isCancelled, let self, self.phase == .waitingForTV else { return }
            self.playback = .unknown
        }
    }

    /// Backend pushes real receiver status here.
    func receiverUpdate(playback p: PlaybackState, position: Double?, duration: Double?, canSeek: Bool) {
        lastStatusDate = Date()
        playback = p
        if let position { self.position = position }
        self.duration = duration
        self.canSeek = canSeek && duration != nil
        isSeeking = false
        if phase == .waitingForTV, [.buffering, .playing, .paused, .error].contains(p) {
            phase = .active
            timeoutTask?.cancel()
        }
    }

    // MARK: Transport

    func play() { backend.play() }
    func pause() { backend.pause() }
    func stop() {
        backend.stop()
        showToast(hostRetained ? Copy.stopSentSharing : Copy.stopSent)
    }
    func seek(to s: Double) {
        let upper = duration ?? s
        isSeeking = true
        backend.seek(to: min(max(0, s), upper))
    }
    func skip(_ delta: Double) { seek(to: position + delta) }
    func refresh() { backend.refreshStatus() }
    func toggleSubtitles(_ on: Bool) { backend.setSubtitlesEnabled(on) }

    // MARK: Ending

    func disconnect() { backend.disconnect(); tv = .notConnected }
    func stopSharing() { backend.stopSharing(); host = .cleared; hostingEndsAt = nil }

    func endCasting() async {
        let r = await backend.endCasting()
        timeoutTask?.cancel()
        if r.cleared { host = .cleared; hostingEndsAt = nil }
        if r.disconnected { tv = .notConnected }
        phase = .idle
        playback = .idle
        failure = nil
        if !r.allOK { showToast(Copy.endPartial) }
    }

    // MARK: Lifecycle

    func appBecameInactive() {
        if host == .sharing { host = .suspended }   // hosting may be suspended; promise nothing
    }
    func appBecameActive() {
        guard hasSession else { return }
        playback = .unknown          // stale until a fresh update
        backend.refreshStatus()      // backend should also restore/refresh `host`
    }

    func showToast(_ text: String) {
        toast = text
        toastTask?.cancel()
        toastTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(4))
            guard !Task.isCancelled else { return }
            self?.toast = nil
        }
    }
}
