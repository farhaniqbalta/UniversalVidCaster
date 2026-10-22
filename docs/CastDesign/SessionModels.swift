import Foundation
import SwiftUI

// MARK: - Input

enum PlayMethod: String, CaseIterable, Identifiable {
    case direct, prepareOnIPad
    var id: String { rawValue }
    var label: String { self == .direct ? Copy.directLabel : Copy.prepareLabel }
    var help: String { self == .direct ? Copy.directHelp : Copy.prepareHelp }
}

enum SubtitleLanguageChoice: String, CaseIterable, Identifiable {
    case english, indonesian, other
    var id: String { rawValue }
    var label: String {
        switch self {
        case .english: "English (en)"
        case .indonesian: "Indonesian (id)"
        case .other: "Other…"
        }
    }
}

extension String {
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
}

/// Everything the user types. Memory only. Never persisted (spec section 9).
struct VideoInput: Equatable {
    var urlText = ""
    var title = ""
    var startText = ""
    var method: PlayMethod = .direct
    var subtitleURLText = ""
    var subtitleLanguage: SubtitleLanguageChoice = .english
    var customLanguageCode = ""
    // Advanced (Direct mode only; fixed automatically in iPad mode)
    var mimeType = ""
    var usesFMP4 = false
    var isLive = false

    var hasSubtitles: Bool { !subtitleURLText.trimmed.isEmpty }
    var languageCode: String {
        switch subtitleLanguage {
        case .english: "en"
        case .indonesian: "id"
        case .other: customLanguageCode.trimmed
        }
    }
}

// MARK: - UI-level validation (the backend's validation stays authoritative)

enum InputValidator {
    /// Heuristic only: shareable diagnostic reports redact query values.
    static func looksRedacted(_ t: String) -> Bool {
        let lower = t.lowercased()
        if lower.contains("redacted") || t.contains("…") || t.contains("***") { return true }
        if let comps = URLComponents(string: t), let items = comps.queryItems {
            return items.contains { ($0.value ?? "").isEmpty && t.contains("\($0.name)=") }
        }
        return false
    }

    private static func parsedHTTP(_ t: String) -> URL? {
        guard let url = URL(string: t), let scheme = url.scheme?.lowercased(),
              ["http", "https"].contains(scheme), url.host() != nil else { return nil }
        return url
    }

    static func videoLink(_ raw: String) -> String? {
        let t = raw.trimmed
        if t.isEmpty { return Copy.errEmpty }
        if looksRedacted(t) { return Copy.errRedacted }
        guard let url = parsedHTTP(t) else { return Copy.errNotURL }
        if ["html", "htm", "php", "asp", "aspx"].contains(url.pathExtension.lowercased()) { return Copy.errWebPage }
        return nil
    }

    /// Accepts "", "90", "1:30", "1:02:03".
    static func start(_ raw: String) -> (seconds: Double, error: String?) {
        let t = raw.trimmed
        if t.isEmpty { return (0, nil) }
        let parts = t.split(separator: ":", omittingEmptySubsequences: false).map { Int($0) }
        guard parts.count <= 3, !parts.contains(where: { $0 == nil || $0! < 0 }) else { return (0, Copy.errStart) }
        let nums = parts.compactMap { $0 }
        let seconds = nums.reduce(0) { $0 * 60 + $1 }
        return (Double(seconds), nil)
    }

    static func subtitleLink(_ raw: String) -> String? {
        let t = raw.trimmed
        if t.isEmpty { return nil }
        if looksRedacted(t) { return Copy.errRedacted }
        return parsedHTTP(t) == nil ? Copy.errSubtitleURL : nil
    }

    static func subtitleExtensionWarning(_ raw: String) -> String? {
        guard let url = parsedHTTP(raw.trimmed) else { return nil }
        return url.pathExtension.lowercased() == "vtt" ? nil : Copy.warnSubtitleExt
    }

    static func language(_ code: String) -> String? {
        code.range(of: "^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$", options: .regularExpression) == nil ? Copy.errLanguage : nil
    }

    /// Host plus a neutral label; never the signature.
    static func summary(_ raw: String, method: PlayMethod) -> String {
        let host = URL(string: raw.trimmed)?.host() ?? "link"
        return "\(host) · " + (method == .direct ? "Direct file link" : "Prepared-stream link")
    }
}

// MARK: - The three independent truths (spec section 4)

enum DiscoveryState { case needsPermissionContext, denied, discovering, noneFound, found }

enum TVState: Equatable {
    case notConnected, connecting, connected(name: String), lost
    var name: String? { if case let .connected(n) = self { n } else { nil } }
    var isConnected: Bool { name != nil }
    var label: String {
        switch self {
        case .notConnected: "Not connected"
        case .connecting: "Connecting…"
        case .connected(let n): "Connected to \(n)"
        case .lost: "Connection lost"
        }
    }
    var symbol: String {
        switch self {
        case .notConnected: "tv.slash"
        case .connecting: "arrow.triangle.2.circlepath"
        case .connected: "tv"
        case .lost: "wifi.exclamationmark"
        }
    }
    var tone: Tone {
        switch self {
        case .connected: .ok
        case .connecting: .progress
        case .lost: .error
        case .notConnected: .unknown
        }
    }
}

enum HostState: Equatable {
    case notUsed, preparing, sharing, suspended, expired, cleared
    var label: String {
        switch self {
        case .notUsed: "Not used"
        case .preparing: "Preparing"
        case .sharing: "Sharing"
        case .suspended: "Paused (app in background)"
        case .expired: "Ended (30 min limit)"
        case .cleared: "Cleared"
        }
    }
    var symbol: String {
        switch self {
        case .notUsed: "minus.circle"
        case .preparing: "gearshape"
        case .sharing: "externaldrive.connected.to.line.below"
        case .suspended: "pause.circle"
        case .expired: "clock.badge.xmark"
        case .cleared: "xmark.circle"
        }
    }
    var tone: Tone {
        switch self {
        case .sharing: .ok
        case .preparing, .suspended: .progress
        case .expired: .warn
        case .notUsed, .cleared: .unknown
        }
    }
    var isRetained: Bool { self == .sharing || self == .suspended || self == .preparing }
}

enum PlaybackState: Equatable {
    case idle, sentToTV, buffering, playing, paused, stopped, error, unknown
    var label: String {
        switch self {
        case .idle: "Idle"
        case .sentToTV: "Sent to TV"
        case .buffering: "Buffering"
        case .playing: "Playing"
        case .paused: "Paused"
        case .stopped: "Stopped"
        case .error: "Problem"
        case .unknown: "Unknown"
        }
    }
    var symbol: String {
        switch self {
        case .idle: "moon.zzz"
        case .sentToTV: "paperplane"
        case .buffering: "hourglass"
        case .playing: "play.fill"
        case .paused: "pause.fill"
        case .stopped: "stop.fill"
        case .error: "exclamationmark.triangle.fill"
        case .unknown: "questionmark.circle"
        }
    }
    var tone: Tone {
        switch self {
        case .playing, .paused: .ok
        case .buffering, .sentToTV: .progress
        case .error: .error
        case .idle, .stopped, .unknown: .unknown
        }
    }
}

enum CastPhase: Equatable { case idle, preparing, sending, waitingForTV, active, failed }
enum FailureKind: Equatable { case preparation, load }

enum SubtitleStatus: Equatable {
    case off
    case configured(language: String)   // configured, not confirmed rendering
    case active(language: String)       // receiver reported the track active
    case trackFailed
}

// MARK: - Backend contract (the ONLY thing the real Cast/hosting code must implement)

struct SubtitleRequest { let url: String; let language: String }

struct CastRequest {
    let videoURL: String          // full original URL, including authorization query
    let title: String?
    let startSeconds: Double
    let method: PlayMethod
    let subtitle: SubtitleRequest?
    let mimeType: String?         // Direct mode only
    let usesFMP4: Bool            // Direct mode only
    let isLive: Bool              // Direct mode only
}

enum CastFailure: Error { case preparation, load, cancelled }

struct EndCastingReport {
    var stopped: Bool, cleared: Bool, disconnected: Bool
    var allOK: Bool { stopped && cleared && disconnected }
}

@MainActor
protocol CastBackend: AnyObject {
    /// Called once by SessionModel. Keep a weak reference and push state back into it.
    func attach(_ model: SessionModel)

    func requestLocalNetworkAccess()
    func rescan()

    /// iPad mode: prepare + host, then send load. Direct mode: send load.
    /// Set model.host / model.hostingEndsAt as hosting changes; set model.phase = .sending after preparation.
    /// Return when the load request is acknowledged. Throw CastFailure otherwise.
    /// After return, report receiver state via model.receiverUpdate(...).
    func prepareAndCast(_ request: CastRequest) async throws

    func play()
    func pause()
    func stop()
    func seek(to seconds: Double)
    func refreshStatus()
    func disconnect()
    func stopSharing()
    /// Composite [New]: stop, then clear hosting, then disconnect. Report each step.
    func endCasting() async -> EndCastingReport
    /// [New, needs validation on a real receiver]. Set model.subtitleToggleSupported when proven.
    func setSubtitlesEnabled(_ on: Bool)

    /// Return the official GCUICastButton wrapped for SwiftUI.
    func makeCastButton() -> AnyView
}
