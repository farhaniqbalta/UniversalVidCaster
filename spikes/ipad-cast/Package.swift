// swift-tools-version: 5.9
import PackageDescription

// Offline tests for the app's shared validation source; no Cast dependency.
let package = Package(
    name: "iPadCastInputTests",
    platforms: [.macOS(.v13)],
    targets: [
        .target(name: "MediaInput", path: "Sources", exclude: ["NativeCastApp.swift", "CastService.swift", "ForegroundManifestHost.swift", "DesignTokens.swift", "CastWorkspaceView.swift", "WorkspaceServices.swift", "WorkspaceSetupView.swift", "WorkspacePlayerView.swift", "WorkspaceDiagnosticsView.swift", "WorkspaceComponents.swift", "WorkspacePreviews.swift"], sources: ["MediaInput.swift", "ManifestPreparation.swift", "LocalManifestServer.swift", "PlaybackDraft.swift", "WorkspaceSession.swift"]),
        .testTarget(name: "MediaInputTests", dependencies: ["MediaInput"], path: "Tests"),
    ]
)
