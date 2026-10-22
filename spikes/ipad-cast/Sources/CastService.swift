import Combine
import Foundation
import GoogleCast

@MainActor
final class CastService: NSObject, ObservableObject, @preconcurrency GCKSessionManagerListener, @preconcurrency GCKRemoteMediaClientListener, @preconcurrency GCKRequestDelegate {
    @Published var connected = false
    @Published var device = "No device connected"
    @Published var playback = "UNKNOWN"
    @Published var position = 0.0
    @Published var duration = 0.0
    @Published var canSeek = false
    @Published var playbackRate = 1.0
    @Published var volume = 0.0
    @Published var muted = false
    @Published var canChangeRate = false
    @Published var canChangeVolume = false
    @Published var canMute = false
    @Published var hasMedia = false
    @Published var lastStatusAt: Date?
    @Published var busy = false
    @Published var message = "Tap the Cast icon to select a device."
    @Published var logs: [String] = []
    @Published var mediaTitle = ""
    private var pendingOutcome: ((Bool) -> Void)?
    private var active = true
    private var client: GCKRemoteMediaClient?
    private var pending: GCKRequest?
    private var timeout: DispatchWorkItem?
    private var pendingLabel = ""
    private var pendingStartedAt = Date.distantPast
    private var manager: GCKSessionManager { GCKCastContext.sharedInstance().sessionManager }

    override init() {
        super.init()
        manager.add(self)
        attach(manager.currentCastSession)
    }

    private func log(_ text: String) {
        logs.append("\(Date().formatted(date: .omitted, time: .standard))  \(text)")
        if logs.count > 80 { logs.removeFirst(logs.count - 80) }
    }

    private func attach(_ session: GCKCastSession?) {
        client?.remove(self)
        connected = session?.connectionState == .connected
        device = connected ? (session?.device.friendlyName ?? "Cast device") : "No device connected"
        client = connected ? session?.remoteMediaClient : nil
        client?.add(self)
        resetStatus()
        if connected { _ = client?.requestStatus() }
    }

    private func resetStatus() {
        playback = "UNKNOWN"; position = 0; duration = 0; hasMedia = false; canSeek = false
        playbackRate = 1; volume = 0; muted = false
        canChangeRate = false; canChangeVolume = false; canMute = false
        lastStatusAt = nil
        mediaTitle = ""
    }

    private func finish(_ text: String, succeeded: Bool = false) {
        timeout?.cancel(); timeout = nil
        pending?.delegate = nil; pending = nil; busy = false
        message = text; log(text)
        let outcome = pendingOutcome; pendingOutcome = nil; outcome?(succeeded)
    }

    private func track(_ request: GCKRequest, label: String) {
        pending = request; pendingLabel = label; busy = true
        pendingStartedAt = Date()
        request.delegate = self
        message = "\(label) requested. Waiting for receiver response."
        let deadline = DispatchWorkItem { [weak self] in
            guard let self, self.pending?.requestID == request.requestID else { return }
            request.delegate = nil
            request.cancel()
            if self.lastStatusAt == nil || self.lastStatusAt! < self.pendingStartedAt { self.resetStatus() }
            self.finish("\(label) timed out. Receiver outcome is unknown; refresh status before retrying.")
        }
        timeout = deadline
        DispatchQueue.main.asyncAfter(deadline: .now() + 20, execute: deadline)
    }

    func load(url: String, mime: String, start: String, title: String, live: Bool, hlsFMP4: Bool, subtitleURL: String = "", subtitleLanguage: String = "en") {
        guard !busy, let client, connected else { message = "Connect to a device first."; return }
        do {
            guard let seconds = Double(start) else { throw InputError("Enter a numeric start position.") }
            let input = try MediaInput(url: url, mime: mime, startSeconds: seconds, hlsFMP4: hlsFMP4)
            let subtitle = try SubtitleInput.parse(url: subtitleURL, language: subtitleLanguage)
            let metadata = GCKMediaMetadata(metadataType: .generic)
            metadata.setString(title.isEmpty ? "Direct media test" : title, forKey: kGCKMetadataKeyTitle)
            let info = GCKMediaInformationBuilder(contentURL: input.url)
            info.contentType = input.mime; info.streamType = live ? .live : .buffered; info.metadata = metadata
            if input.hlsFMP4 {
                info.hlsSegmentFormat = .FMP4
                info.hlsVideoSegmentFormat = .FMP4
            }
            let data = GCKMediaLoadRequestDataBuilder()
            if let subtitle {
                guard let track = GCKMediaTrack(identifier: 1, contentIdentifier: subtitle.url.absoluteString,
                                               contentType: "text/vtt", type: .text, textSubtype: .subtitles,
                                               name: "\(subtitle.language) subtitles", languageCode: subtitle.language, customData: nil) else {
                    throw InputError("Could not configure the subtitle track.")
                }
                info.mediaTracks = [track]
                data.activeTrackIDs = [NSNumber(value: 1)]
            }
            data.mediaInformation = info.build(); data.autoplay = true; data.startTime = input.startSeconds
            resetStatus()
            track(client.loadMedia(with: data.build()), label: "Load")
        } catch let error as InputError { message = error.message }
        catch { message = "Invalid media input." }
    }

    func control(_ action: String) {
        guard !busy, let client, connected else { return }
        if action == "status" { track(client.requestStatus(), label: "Status"); return }
        guard hasMedia else { message = "Load media first."; return }
        switch action {
        case "play": track(client.play(), label: "Play")
        case "pause": track(client.pause(), label: "Pause")
        case "stop": track(client.stop(), label: "Stop")
        default: break
        }
    }

    func setPlaybackRate(_ rate: Double) {
        guard !busy, connected, hasMedia, canChangeRate, let client,
              WorkspaceSession.playbackRates.contains(rate) else { return }
        track(client.setPlaybackRate(Float(rate)), label: "Playback speed")
    }
    func setVolume(_ volume: Double) {
        guard !busy, connected, hasMedia, canChangeVolume, let client,
              volume.isFinite, (0...1).contains(volume) else { return }
        track(client.setStreamVolume(Float(volume)), label: "Media volume")
    }
    func setMuted(_ muted: Bool) {
        guard !busy, connected, hasMedia, canMute, let client else { return }
        track(client.setStreamMuted(muted), label: muted ? "Mute" : "Unmute")
    }

    func seek(_ text: String) {
        guard !busy, let client, connected, hasMedia, canSeek else { message = "This media is not seekable."; return }
        guard let seconds = Double(text), seconds.isFinite, seconds >= 0,
              duration <= 0 || seconds <= duration else { message = "Enter a seek position within the media duration."; return }
        let options = GCKMediaSeekOptions(); options.interval = seconds; options.relative = false
        track(client.seek(with: options), label: "Seek")
    }

    @discardableResult
    func disconnect() -> Bool {
        guard !busy, connected else { return false }
        let requested = manager.endSessionAndStopCasting(false)
        message = requested ? "Disconnect requested; receiver may keep playing." : "Could not request disconnection."
        return requested
    }

    func stopForEnding() async -> Bool {
        guard !busy, connected, let client else { return false }
        if !hasMedia { return playback == "IDLE" && lastStatusAt != nil }
        return await withCheckedContinuation { continuation in
            pendingOutcome = { continuation.resume(returning: $0) }
            track(client.stop(), label: "Stop")
        }
    }

    func foreground() {
        active = true
        finish("App active; refreshing session and receiver state.")
        attach(manager.currentCastSession)
    }

    func background() {
        active = false
        finish("App inactive. Receiver state is unknown until refreshed.")
        resetStatus()
    }

    func remoteMediaClient(_ client: GCKRemoteMediaClient, didUpdate mediaStatus: GCKMediaStatus?) {
        guard active, client === self.client else { return }
        guard let status = mediaStatus else { resetStatus(); return }
        lastStatusAt = Date()
        mediaTitle = status.mediaInformation?.metadata?.string(forKey: kGCKMetadataKeyTitle) ?? ""
        let previous = playback
        switch status.playerState {
        case .playing: playback = "PLAYING"
        case .paused: playback = "PAUSED"
        case .buffering: playback = "BUFFERING"
        case .idle: playback = "IDLE"
        default: playback = "UNKNOWN"
        }
        position = status.streamPosition.isFinite ? status.streamPosition : 0
        let seconds = status.mediaInformation?.streamDuration ?? 0
        duration = seconds.isFinite ? seconds : 0
        hasMedia = status.mediaInformation != nil && status.playerState != .idle
        playbackRate = Double(status.playbackRate)
        volume = Double(status.volume); muted = status.isMuted
        canChangeRate = status.isMediaCommandSupported(kGCKMediaCommandSetPlaybackRate)
        canChangeVolume = status.isMediaCommandSupported(kGCKMediaCommandSetVolume)
        canMute = status.isMediaCommandSupported(kGCKMediaCommandToggleMute)
        canSeek = status.isMediaCommandSupported(kGCKMediaCommandSeek)
        if previous != playback { log("Receiver: \(playback); idle reason: \(status.idleReason.rawValue)") }
    }

    func requestDidComplete(_ request: GCKRequest) {
        guard pending?.requestID == request.requestID else { return }
        finish("\(pendingLabel) request completed. Playback is determined by receiver status.", succeeded: true)
    }
    func request(_ request: GCKRequest, didFailWithError error: GCKError) {
        guard pending?.requestID == request.requestID else { return }
        finish("\(pendingLabel) failed (Cast code \(error.code)). Check receiver status and whether the TV supports this action.")
    }
    func request(_ request: GCKRequest, didAbortWith abortReason: GCKRequestAbortReason) {
        guard pending?.requestID == request.requestID else { return }
        finish("\(pendingLabel) tracking aborted (\(abortReason.rawValue)); receiver outcome is unknown.")
    }
    func sessionManager(_ sessionManager: GCKSessionManager, didStart session: GCKCastSession) {
        attach(session); finish("Cast session connected; media playback not yet established.")
    }
    func sessionManager(_ sessionManager: GCKSessionManager, didResumeSession session: GCKSession) {
        attach(sessionManager.currentCastSession); finish("Session resumed; awaiting receiver status.")
    }
    func sessionManager(_ sessionManager: GCKSessionManager, didEnd session: GCKSession, withError error: Error?) {
        attach(nil); finish(error == nil ? "Disconnected." : "Session ended with error (\((error! as NSError).code)).")
    }
    func sessionManager(_ sessionManager: GCKSessionManager, didFailToStart session: GCKSession, withError error: Error) {
        attach(nil); finish("Connection failed (\((error as NSError).code)). Check local-network permission and device availability.")
    }
    func sessionManager(_ sessionManager: GCKSessionManager, didSuspend session: GCKSession, with reason: GCKConnectionSuspendReason) {
        attach(nil); finish("Session suspended (\(reason.rawValue)); reconnect or wait for resumption.")
    }
}
