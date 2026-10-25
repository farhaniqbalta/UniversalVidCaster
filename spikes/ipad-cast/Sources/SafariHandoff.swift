import Foundation

/// Validated setup import from clipboard or an explicit app link; never auto-load.
struct SafariHandoff: Decodable {
    struct Video: Decodable {
        let url: String
        let mimeType: String?
        let method: String
        let startSeconds: Double
    }
    struct Subtitle: Decodable { let url: String; let language: String }
    let type: String
    let version: Int
    let video: Video
    let subtitle: Subtitle?

    static func transfer(from url: URL) throws -> String {
        guard url.absoluteString.utf8.count <= 196_608,
              let parts = URLComponents(url: url, resolvingAgainstBaseURL: false),
              parts.scheme == "universalvidcaster", parts.host == "import",
              parts.path.isEmpty, parts.query == nil, parts.user == nil,
              parts.password == nil, parts.port == nil,
              let encoded = parts.percentEncodedFragment,
              let text = encoded.removingPercentEncoding else {
            throw InputError("Invalid app transfer. Inspect the video again or use Paste Safari transfer.")
        }
        _ = try draft(from: text)
        return text
    }

    static func draft(from text: String) throws -> PlaybackDraft {
        let data = Data(text.utf8)
        guard data.count <= 65536 else { throw InputError("Safari transfer is too large. Copy the selected video again.") }
        let payload: SafariHandoff
        do { payload = try JSONDecoder().decode(Self.self, from: data) }
        catch { throw InputError("This is not a Safari transfer. Use Open in Universal VidCaster or Copy transfer for iPad in the extension.") }
        guard payload.type == "universal-vidcaster.handoff", payload.version == 1,
              ["direct", "prepare-on-ipad"].contains(payload.video.method),
              payload.video.startSeconds.isFinite, payload.video.startSeconds >= 0,
              payload.video.startSeconds <= 31_536_000 else { throw InputError("Unsupported Safari transfer. Inspect and copy the current video again.") }
        var draft = PlaybackDraft()
        draft.url = payload.video.url
        draft.mime = payload.video.mimeType ?? ""
        draft.prepareOnIPad = payload.video.method == "prepare-on-ipad"
        draft.start = String(payload.video.startSeconds)
        if let subtitle = payload.subtitle {
            guard try SubtitleInput.parse(url: subtitle.url, language: subtitle.language) != nil else { throw InputError("The transfer contains an empty subtitle link.") }
            draft.includeSubtitle = true; draft.subtitleURL = subtitle.url; draft.language = subtitle.language
        }
        _ = try draft.validated()
        return draft
    }
}
