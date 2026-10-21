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
    @Published var hasMedia = false
    @Published var lastStatusAt: Date?
    @Published var busy = false
    @Published var message = "Tap the Cast icon to select a device."
    @Published var logs: [String] = []
    private var active = true
    private var client: GCKRemoteMediaClient?
    private var pending: GCKRequest?
    private var timeout: DispatchWorkItem?
    private var pendingLabel = ""
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
        lastStatusAt = nil
    }

    private func finish(_ text: String) {
        timeout?.cancel(); timeout = nil
        pending?.delegate = nil; pending = nil; busy = false
        message = text; log(text)
    }

    private func track(_ request: GCKRequest, label: String) {
        pending = request; pendingLabel = label; busy = true
        request.delegate = self
        message = "\(label) requested. Waiting for receiver response."
        let deadline = DispatchWorkItem { [weak self] in
            guard let self, self.pending?.requestID == request.requestID else { return }
            request.delegate = nil
            request.cancel()
            self.finish("\(label) timed out. Receiver outcome is unknown; refresh status before retrying.")
        }
        timeout = deadline
        DispatchQueue.main.asyncAfter(deadline: .now() + 20, execute: deadline)
    }

    func load(url: String, mime: String, start: String, title: String, live: Bool) {
        guard !busy, let client, connected else { message = "Connect to a device first."; return }
        do {
            guard let seconds = Double(start) else { throw InputError("Enter a numeric start position.") }
            let input = try MediaInput(url: url, mime: mime, startSeconds: seconds)
            let metadata = GCKMediaMetadata(metadataType: .generic)
            metadata.setString(title.isEmpty ? "Direct media test" : title, forKey: kGCKMetadataKeyTitle)
            let info = GCKMediaInformationBuilder(contentURL: input.url)
            info.contentType = input.mime; info.streamType = live ? .live : .buffered; info.metadata = metadata
            let data = GCKMediaLoadRequestDataBuilder()
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

    func seek(_ text: String) {
        guard !busy, let client, connected, hasMedia, canSeek else { message = "This media is not seekable."; return }
        guard let seconds = Double(text), seconds.isFinite, seconds >= 0,
              duration <= 0 || seconds <= duration else { message = "Enter a seek position within the media duration."; return }
        let options = GCKMediaSeekOptions(); options.interval = seconds; options.relative = false
        track(client.seek(with: options), label: "Seek")
    }

    func disconnect() {
        guard !busy, connected else { return }
        message = manager.endSessionAndStopCasting(false) ? "Disconnect requested; receiver may keep playing." : "Could not request disconnection."
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
        canSeek = status.isMediaCommandSupported(kGCKMediaCommandSeek)
        if previous != playback { log("Receiver: \(playback); idle reason: \(status.idleReason.rawValue)") }
    }

    func requestDidComplete(_ request: GCKRequest) {
        guard pending?.requestID == request.requestID else { return }
        finish("\(pendingLabel) request completed. Playback is determined by receiver status.")
    }
    func request(_ request: GCKRequest, didFailWithError error: GCKError) {
        guard pending?.requestID == request.requestID else { return }
        finish("\(pendingLabel) failed (Cast code \(error.code)). Authorization/DRM causes remain unknown.")
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
