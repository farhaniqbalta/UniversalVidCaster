import SwiftUI

struct CastWorkspaceView: View {
    @ObservedObject var session: WorkspaceSession
    let devicePicker: AnyView
    @Environment(\.dynamicTypeSize) var typeSize
    @State var editingVideo = true
    @State var editingSubtitle = true
    @State var languageChoice = "en"
    @State var showPlayer = false
    @State var showDiagnostics = false
    @State var confirmReplace = false
    @State var confirmEnd = false
    @State var confirmClear = false
    @State var seekDraft = 0.0
    @State var dragging = false
    @FocusState var focused: Bool

    var cast: WorkspaceCastState { session.cast }
    var host: WorkspaceHostState { session.host }
    var draft: PlaybackDraft {
        get { session.draft }
        nonmutating set { session.draft = newValue }
    }
    var error: String? { session.error }
    var preparing: Bool { session.preparing }
    var ending: Bool { session.ending }
    var endResult: String? { session.endResult }
    var submittedSubtitleLanguage: String? { session.submittedSubtitleLanguage }
    var working: Bool { session.working }
    var sessionExists: Bool { session.sessionExists }
    var canSeek: Bool { session.canSeek }
    var playerTitle: String { session.playerTitle }
    var playbackLabel: String { session.playbackLabel }

    var body: some View {
        NavigationStack {
            GeometryReader { geometry in
                let wide = geometry.size.width >= 950 && !typeSize.isAccessibilitySize
                Group {
                    if wide {
                        HStack(alignment: .top, spacing: 20) {
                            setup.frame(width: 380)
                            ScrollView { player.padding(20) }.frame(maxWidth: .infinity)
                        }.padding(.horizontal, 20)
                    } else {
                        setup.safeAreaInset(edge: .bottom) {
                            if sessionExists {
                                Button { showPlayer = true } label: {
                                    HStack {
                                        Image(systemName: "tv")
                                        VStack(alignment: .leading) {
                                            Text(playerTitle).lineLimit(1)
                                            Text("\(cast.device) · \(playbackLabel)").font(.caption)
                                        }
                                        Spacer(); Image(systemName: "chevron.up")
                                    }.padding().frame(maxWidth: .infinity)
                                }.buttonStyle(.plain).background(.regularMaterial)
                                .accessibilityLabel("Open Now Playing. \(playbackLabel)")
                            }
                        }
                    }
                }.background(VC.Palette.canvas)
            }
            .navigationTitle("Universal VidCaster")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showDiagnostics = true } label: { Label("Diagnostics", systemImage: "ellipsis.circle") }
                }
                ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Done") { focused = false; UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil) } }
            }
            .sheet(isPresented: $showPlayer) {
                NavigationStack {
                    ScrollView { player.padding(20) }.background(VC.Palette.canvas)
                        .navigationTitle("Now Playing").navigationBarTitleDisplayMode(.inline)
                        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Setup") { showPlayer = false } } }
                }
            }
            .sheet(isPresented: $showDiagnostics) { diagnostics }
            .confirmationDialog("Replace the current video?", isPresented: $confirmReplace, titleVisibility: .visible) {
                Button("Replace video", role: .destructive) { beginLoad() }
                Button("Keep watching", role: .cancel) { }
            } message: {
                Text("This loads the new input from the Start at time. If sharing from this iPad, the old playlists are replaced when preparation finishes. The previous session cannot be restored automatically.")
            }
            .confirmationDialog("End casting?", isPresented: $confirmEnd, titleVisibility: .visible) {
                Button("End casting", role: .destructive) { endCasting() }
                Button("Cancel", role: .cancel) { }
            } message: { Text("Request a stop on the TV, clear this iPad’s playlists, then request disconnection. If the TV is unreachable, stopping cannot be confirmed.") }
            .confirmationDialog("Stop sharing from this iPad?", isPresented: $confirmClear, titleVisibility: .visible) {
                Button("Stop sharing", role: .destructive) { session.clearHosting() }
                Button("Keep sharing", role: .cancel) { }
            } message: { Text("This clears the prepared playlists. It does not send Stop to the TV, but playback may fail when the TV needs another playlist.") }
            .onChange(of: cast.playback) { _, state in
                if state == "PLAYING" || state == "PAUSED" || state == "BUFFERING" {
                    UIAccessibility.post(notification: .announcement, argument: "TV playback \(state.lowercased())")
                }
            }
        }.tint(VC.Palette.accent)
    }

    func beginLoad() {
        guard !working, cast.connected else { return }
        focused = false; editingVideo = false; editingSubtitle = false
        Task { await session.load() }
    }
    func endCasting() { Task { await session.endCasting() } }
}
