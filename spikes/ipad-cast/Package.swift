// swift-tools-version: 5.9
import PackageDescription

// Offline tests for the app's shared validation source; no Cast dependency.
let package = Package(
    name: "iPadCastInputTests",
    platforms: [.macOS(.v13)],
    targets: [
        .target(name: "MediaInput", path: "Sources", exclude: ["NativeCastApp.swift", "CastService.swift"], sources: ["MediaInput.swift"]),
        .testTarget(name: "MediaInputTests", dependencies: ["MediaInput"], path: "Tests"),
    ]
)
