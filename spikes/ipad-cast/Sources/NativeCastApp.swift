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
    @Environment(\.scenePhase) private var phase
    @State private var url = MediaInput.flower
    @State private var mime = "video/mp4"
    @State private var title = "Flower — iPad Cast test"
    @State private var start = "0"
    @State private var seek = "1"
    @State private var live = false

    var body: some View {
        NavigationStack {
            Form {
                Section("1. Select an existing Cast device") {
                    HStack { Text(cast.device); Spacer(); CastButton().frame(width: 48, height: 48).accessibilityLabel("Select Cast device") }
                    Text("Allow Local Network access when prompted. This app uses the TV's existing Cast receiver.").font(.footnote)
                }
                Section("2. Load direct media") {
                    TextField("Original media URL", text: $url, axis: .vertical).textInputAutocapitalization(.never).autocorrectionDisabled().privacySensitive()
                    TextField("MIME type", text: $mime).textInputAutocapitalization(.never).autocorrectionDisabled()
                    TextField("Title", text: $title)
                    TextField("Start at (seconds)", text: $start).keyboardType(.decimalPad)
                    Toggle("Live stream (select only when known)", isOn: $live)
                    Button("Use flower MP4 preset") { url = MediaInput.flower; mime = "video/mp4"; title = "Flower — iPad Cast test"; start = "0"; live = false }
                    Button("Load & play") { cast.load(url: url, mime: mime, start: start, title: title, live: live) }.disabled(!cast.connected || cast.busy)
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
                if value == .active { cast.foreground() } else { cast.background() }
            }
        }
    }
}
