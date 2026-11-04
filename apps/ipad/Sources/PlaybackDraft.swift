import Foundation

struct PlaybackDraft {
    var url = ""
    var title = ""
    var start = "0:00"
    var prepareOnIPad = false
    var mime = ""
    var fmp4 = false
    var live = false
    var includeSubtitle = false
    var subtitleURL = ""
    var language = "en"

    var resolvedMIME: String {
        if prepareOnIPad { return "application/vnd.apple.mpegurl" }
        let explicit = mime.trimmingCharacters(in: .whitespacesAndNewlines)
        if !explicit.isEmpty { return explicit }
        switch URL(string: url.trimmingCharacters(in: .whitespacesAndNewlines))?.pathExtension.lowercased() {
        case "mp4": return "video/mp4"
        case "m3u8": return "application/vnd.apple.mpegurl"
        case "mpd": return "application/dash+xml"
        default: return ""
        }
    }

    static func seconds(_ raw: String) throws -> Double {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return 0 }
        let pieces = trimmed.split(separator: ":", omittingEmptySubsequences: false)
        guard pieces.count <= 3 else { throw InputError("Enter seconds, mm:ss, or hh:mm:ss.") }
        if pieces.count == 1 {
            guard let value = Double(trimmed), value.isFinite, value >= 0, value <= 31_536_000 else { throw InputError("Enter a valid start time, such as 1:30.") }
            return value
        }
        var total = 0.0
        for (index, part) in pieces.enumerated() {
            guard !part.isEmpty, part.allSatisfy({ $0.isASCII && $0.isNumber }),
                  let value = Double(part), value.isFinite, value <= 31_536_000,
                  index == 0 || value < 60 else { throw InputError("Enter a valid time, such as 1:30 or 1:02:03.") }
            total = total * 60 + value
            guard total <= 31_536_000 else { throw InputError("Start time is too large.") }
        }
        return total
    }

    func validated() throws -> MediaInput {
        let input = try MediaInput(url: url, mime: resolvedMIME, startSeconds: Self.seconds(start), hlsFMP4: prepareOnIPad || fmp4)
        if prepareOnIPad {
            let items = URLComponents(url: input.url, resolvingAgainstBaseURL: false)?.queryItems ?? []
            guard input.url.scheme?.lowercased() == "https", ["t", "pm"].allSatisfy({ name in items.contains { $0.name == name && !($0.value ?? "").isEmpty } }) else {
                throw InputError("Prepare on iPad needs the original HTTPS master link with t and pm.")
            }
        }
        if includeSubtitle {
            guard try SubtitleInput.parse(url: subtitleURL, language: language) != nil else { throw InputError("Paste a subtitle link or turn subtitles off.") }
        }
        return input
    }
}
