import SwiftUI
import GoogleCast

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        let criteria = GCKDiscoveryCriteria(applicationID: kGCKDefaultMediaReceiverApplicationID)
        let options = GCKCastOptions(discoveryCriteria: criteria)
        options.startDiscoveryAfterFirstTapOnCastButton = true
        // User-confirmed on the tested iPad (2026-10-25). Google still documents
        // iOS limitations, so other OS/device combinations need verification.
        options.physicalVolumeButtonsWillControlDeviceVolume = true
        GCKCastContext.setSharedInstanceWith(options)
        return true
    }
}
@main
struct NativeCastApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    var body: some Scene { WindowGroup { CastAppRoot() } }
}

struct CastButton: UIViewRepresentable {
    func makeUIView(context: Context) -> GCKUICastButton { GCKUICastButton(frame: .zero) }
    func updateUIView(_ uiView: GCKUICastButton, context: Context) {}
}

/// Composition root: changing a screen does not recreate SDK/host ownership.
struct CastAppRoot: View {
    @StateObject private var session = WorkspaceSession(cast: CastService(), host: ForegroundManifestHost())
    @Environment(\.scenePhase) private var phase
    var body: some View {
        CastWorkspaceView(session: session, devicePicker: AnyView(CastButton()))
            .onOpenURL { url in _ = session.importSafariURL(url) }
            .onChange(of: phase) { _, value in session.setActive(value == .active) }
    }
}
