import Combine
import UIKit

@MainActor
final class ForegroundManifestHost: ObservableObject {
    @Published var busy = false
    @Published var hosting = false
    @Published private(set) var endsAt: Date?
    @Published private(set) var expired = false
    @Published var message = "Paste the original master URL. Keep this app open while casting."
    private var server: LocalManifestServer?
    private var expiryTask: Task<Void, Never>?

    func prepare(_ original: String) async throws -> URL {
        guard !busy else { throw InputError("Playlist preparation is already running.") }
        busy = true
        UIApplication.shared.isIdleTimerDisabled = true
        defer { busy = false; if !hosting { UIApplication.shared.isIdleTimerDisabled = false } }
        let input = try MediaInput(url: original, mime: "application/vnd.apple.mpegurl", startSeconds: 0, hlsFMP4: true)
        guard let address = LocalManifestServer.wifiAddresses().first else { throw InputError("Connect the iPad to the TV’s Wi-Fi network.") }
        message = "Preparing playlists on iPad…"
        let candidate = LocalManifestServer()
        let fetcher = ManifestFetcher()
        defer { fetcher.close() }
        do {
            let origin = try await candidate.start(address: address)
            let prepared = try await ManifestPreparation(fetch: fetcher.fetch).prepare(master: input.url, origin: origin)
            try Task.checkCancellation()
            await candidate.publish(prepared.pages)
            clear()
            server = candidate; hosting = true; UIApplication.shared.isIdleTimerDisabled = true
            endsAt = Date().addingTimeInterval(1800)
            message = "iPad hosting ready (30-minute session). Keep this app open and screen awake."
            expiryTask = Task { [weak self] in
                try? await Task.sleep(nanoseconds: 1_800_000_000_000)
                guard !Task.isCancelled else { return }
                self?.clear(); self?.expired = true; self?.message = "Sharing ended after 30 minutes. Prepare a fresh original link to continue."
            }
            return prepared.entry
        } catch {
            candidate.stop()
            message = (error as? InputError)?.message ?? "Playlist preparation failed. Check the fresh URL, Wi-Fi, and access."
            throw InputError(message)
        }
    }
    func clear() {
        expiryTask?.cancel(); expiryTask = nil
        server?.stop(); server = nil; hosting = false
        endsAt = nil; expired = false
        UIApplication.shared.isIdleTimerDisabled = false
        message = "iPad hosting stopped and session cleared."
    }
    func phaseChanged(active: Bool) {
        if hosting { message = active ? "iPad hosting active. If playback stopped, refresh receiver status or prepare a new session." : "App inactive: playlist hosting may be suspended. Return to this app to continue reliably." }
    }
}
