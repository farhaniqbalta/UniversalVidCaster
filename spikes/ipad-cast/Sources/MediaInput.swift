import Foundation

struct MediaInput {
    static let flower = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
    let url: URL
    let mime: String
    let startSeconds: Double

    init(url text: String, mime: String, startSeconds: Double) throws {
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.contains("[REDACTED]"),
              !(text.removingPercentEncoding ?? text).contains("[REDACTED]"),
              text.rangeOfCharacter(from: .whitespacesAndNewlines) == nil,
              let parts = URLComponents(string: text),
              ["http", "https"].contains(parts.scheme?.lowercased() ?? ""),
              let host = parts.host, !host.isEmpty,
              parts.user == nil, parts.password == nil,
              let url = parts.url else {
            throw InputError("Enter an original direct HTTP(S) URL without credentials. Redacted diagnostic URLs cannot be played.")
        }
        let mime = mime.trimmingCharacters(in: .whitespacesAndNewlines)
        guard mime.range(of: #"^[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+$"#, options: .regularExpression) != nil else {
            throw InputError("Enter a MIME type, such as video/mp4 or application/vnd.apple.mpegurl.")
        }
        guard startSeconds.isFinite, startSeconds >= 0 else {
            throw InputError("Start position must be a finite non-negative number.")
        }
        self.url = url; self.mime = mime; self.startSeconds = startSeconds
    }
}

struct InputError: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}
