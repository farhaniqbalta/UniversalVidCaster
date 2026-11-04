import Combine

/// Production adapters. Alternate designs and model tests do not import the SDK.
extension CastService: WorkspaceCastClient {
    var workspaceChanges: AnyPublisher<Void, Never> { objectWillChange.map { _ in () }.eraseToAnyPublisher() }
    var workspaceState: WorkspaceCastState {
        WorkspaceCastState(connected: connected, device: device, playback: playback,
                           position: position, duration: duration, canSeek: canSeek,
                           playbackRate: playbackRate, volume: volume, muted: muted,
                           canChangeRate: canChangeRate, canChangeVolume: canChangeVolume, canMute: canMute,
                           hasMedia: hasMedia, lastStatusAt: lastStatusAt, busy: busy,
                           message: message, logs: logs, mediaTitle: mediaTitle)
    }
}
extension ForegroundManifestHost: WorkspaceHostClient {
    var workspaceChanges: AnyPublisher<Void, Never> { objectWillChange.map { _ in () }.eraseToAnyPublisher() }
    var workspaceState: WorkspaceHostState {
        WorkspaceHostState(busy: busy, hosting: hosting, endsAt: endsAt, expired: expired, message: message)
    }
}
