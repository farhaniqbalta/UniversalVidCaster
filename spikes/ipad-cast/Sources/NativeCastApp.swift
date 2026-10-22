import SwiftUI
import GoogleCast

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        let criteria = GCKDiscoveryCriteria(applicationID: kGCKDefaultMediaReceiverApplicationID)
        let options = GCKCastOptions(discoveryCriteria: criteria)
        options.startDiscoveryAfterFirstTapOnCastButton = true
        GCKCastContext.setSharedInstanceWith(options)
        return true
    }
}

@main
struct NativeCastApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    var body: some Scene { WindowGroup { CastTestView() } }
}

struct CastButton: UIViewRepresentable {
    func makeUIView(context: Context) -> GCKUICastButton { GCKUICastButton(frame: .zero) }
    func updateUIView(_ uiView: GCKUICastButton, context: Context) {}
}

struct CastTestView: View {
    @StateObject private var cast = CastService()
    @StateObject private var host = ForegroundManifestHost()
    @Environment(\.scenePhase) private var phase
    @State private var url = MediaInput.flower
    @State private var mime = "video/mp4"
    @State private var title = "Flower — iPad Cast test"
    @State private var start = "0"
    @State private var seek = "1"
    @State private var live = false
    @State private var hlsFMP4 = false
    @State private var localBridge = false
    @State private var subtitlesEnabled = false
    @State private var subtitleURL = ""
    @State private var subtitleLanguage = "en"

    var body: some View {
        NavigationStack {
            Form {
                Section("1. Select an existing Cast device") {
                    HStack { Text(cast.device); Spacer(); CastButton().frame(width: 48, height: 48).accessibilityLabel("Select Cast device") }
                    Text("Allow Local Network access when prompted. This app uses the TV's existing Cast receiver.").font(.footnote)
                }
                Section("2. Load direct media") {
                    Toggle("Prepare HLS on this iPad (no Mac)", isOn: $localBridge).disabled(host.busy)
                    TextField("Original media URL", text: $url, axis: .vertical).textInputAutocapitalization(.never).autocorrectionDisabled().privacySensitive()
                    TextField("MIME type", text: $mime).textInputAutocapitalization(.never).autocorrectionDisabled()
                    TextField("Title", text: $title)
                    TextField("Start at (seconds)", text: $start).keyboardType(.decimalPad)
                    Toggle("Live stream (select only when known)", isOn: $live)
                    Toggle("HLS uses fragmented MP4 audio/video", isOn: $hlsFMP4)
                    Button("Use Mac bridge HLS settings") { localBridge = false; mime = "application/vnd.apple.mpegurl"; hlsFMP4 = true; live = false; start = "0"; title = "Mac bridge — iPad Cast test" }.disabled(host.busy)
                    Text("For Mac bridge playback, paste its generated LAN playlist URL above, then use the HLS settings button. Keep the Mac bridge running. This app does not prepare playlists.").font(.footnote)
                    Button("Use flower MP4 preset") { url = MediaInput.flower; mime = "video/mp4"; title = "Flower — iPad Cast test"; start = "0"; live = false; hlsFMP4 = false; localBridge = false; subtitlesEnabled = false }.disabled(host.busy)
                    DisclosureGroup("Subtitles (optional WebVTT)") {
                        Toggle("Include subtitle on next load", isOn: $subtitlesEnabled)
                        if subtitlesEnabled {
                            TextField("Original subtitle URL", text: $subtitleURL, axis: .vertical).textInputAutocapitalization(.never).autocorrectionDisabled().privacySensitive()
                            TextField("Language (en or id)", text: $subtitleLanguage).textInputAutocapitalization(.never).autocorrectionDisabled()
                            Text("Use the complete .vtt URL for this exact video, including its own token. Changing subtitles requires loading the video again; it may restart playback. Subtitles are fetched directly by the TV.").font(.footnote)
                        }
                    }.disabled(host.busy || cast.busy)
                    Button(localBridge ? "Prepare on iPad & play" : "Load & play") {
                        let requestedSubtitle = subtitlesEnabled ? subtitleURL : ""
                        let requestedLanguage = subtitleLanguage
                        if subtitlesEnabled && requestedSubtitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            host.message = "Enter a subtitle URL or turn off Include subtitle."
                            cast.message = host.message
                            return
                        }
                        if localBridge {
                            let original = url; let requestedStart = start; let requestedTitle = title
                            Task {
                                do {
                                    guard let seconds = Double(requestedStart) else { throw InputError("Enter a numeric start position.") }
                                    _ = try MediaInput(url: original, mime: "application/vnd.apple.mpegurl", startSeconds: seconds, hlsFMP4: true)
                                    _ = try SubtitleInput.parse(url: requestedSubtitle, language: requestedLanguage)
                                    let prepared = try await host.prepare(original)
                                    cast.load(url: prepared.absoluteString, mime: "application/vnd.apple.mpegurl", start: requestedStart, title: requestedTitle, live: false, hlsFMP4: true, subtitleURL: requestedSubtitle, subtitleLanguage: requestedLanguage)
                                } catch { host.message = (error as? InputError)?.message ?? "Could not prepare iPad playback." }
                            }
                        } else { cast.load(url: url, mime: mime, start: start, title: title, live: live, hlsFMP4: hlsFMP4, subtitleURL: requestedSubtitle, subtitleLanguage: requestedLanguage) }
                    }.disabled(!cast.connected || cast.busy || host.busy)
                    if localBridge || host.hosting {
                        Text(host.message).font(.footnote)
                        Text("iPad mode uses original HTTPS master URLs with t and pm. VOD only; HLS/fMP4 are automatic. Keep this app foregrounded. Screen auto-lock is disabled while hosting.").font(.footnote)
                        Button("Stop iPad hosting and clear session") { host.clear() }.disabled(host.busy || !host.hosting)
                    }
                    Text("Use the original URL, not a redacted diagnostic link. The TV fetches it directly. No Safari cookies are transferred. Inputs are not saved by this app.").font(.footnote)
                }
                Section("3. Playback controls") {
                    HStack {
                        ForEach(["play", "pause", "stop"], id: \.self) { action in
                            Button(action.capitalized) { cast.control(action) }.buttonStyle(.bordered).disabled(!cast.hasMedia || cast.busy)
                        }
                    }
                    TextField("Seek to (seconds)", text: $seek).keyboardType(.decimalPad)
                    Button("Seek") { cast.seek(seek) }.disabled(!cast.canSeek || !cast.hasMedia || cast.busy)
                    Button("Refresh receiver status") { cast.control("status") }.disabled(!cast.connected || cast.busy)
                    Button("Disconnect (leave playback running)") { cast.disconnect() }.disabled(!cast.connected || cast.busy)
                    Text("Use Stop before Disconnect if you want playback to stop.").font(.footnote)
                }
                Section("Receiver observations") {
                    Text("Session: \(cast.connected ? "connected" : "disconnected")")
                    Text("Playback: \(cast.playback)").monospaced()
                    if let received = cast.lastStatusAt { Text("Last receiver update: \(received.formatted(date: .omitted, time: .standard))").font(.footnote) }
                    Text("Position: \(cast.position, specifier: "%.1f") / \(cast.duration, specifier: "%.1f") seconds")
                    Text(cast.message).accessibilityAddTraits(.updatesFrequently)
                    Text("Confirm the video is visible on the TV. Native playback does not prove Safari integration.").font(.footnote)
                }
                Section("Local diagnostics (media URLs omitted)") {
                    ForEach(Array(cast.logs.enumerated()), id: \.offset) { _, line in Text(line).font(.caption.monospaced()) }
                }
            }
            .navigationTitle("iPad Cast Test")
            .onChange(of: phase) { _, value in
                host.phaseChanged(active: value == .active)
                if value == .active { cast.foreground() } else { cast.background() }
            }
        }
    }
}
