import SwiftUI
import UIKit

// MARK: - Dynamic light/dark colors from hex

extension Color {
    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { trait in
            let hex = trait.userInterfaceStyle == .dark ? dark : light
            return UIColor(
                red: CGFloat((hex >> 16) & 0xFF) / 255,
                green: CGFloat((hex >> 8) & 0xFF) / 255,
                blue: CGFloat(hex & 0xFF) / 255,
                alpha: 1)
        })
    }
}

// MARK: - Design tokens (spec section 1)

enum VC {
    enum Palette {
        static let canvas        = Color(light: 0xF4F5F8, dark: 0x0E1014)
        static let surface       = Color(light: 0xFFFFFF, dark: 0x181B22)
        static let surfaceRaised = Color(light: 0xEEF0F5, dark: 0x222631)
        static let stroke        = Color(light: 0xD9DCE5, dark: 0x2D3240)
        static let textPrimary   = Color(light: 0x14161C, dark: 0xF2F4F8)
        static let textSecondary = Color(light: 0x4F5565, dark: 0xA9AFBF)
        static let accent        = Color(light: 0x3F4FD0, dark: 0x93A0FF)
        static let onAccent      = Color(light: 0xFFFFFF, dark: 0x0E1014)
        static let ok            = Color(light: 0x1B7F46, dark: 0x5FD08C)
        static let progress      = Color(light: 0x8A5A00, dark: 0xFFC857)
        static let error         = Color(light: 0xB3261E, dark: 0xFF8A80)
        static let unknown       = Color(light: 0x5A6072, dark: 0x98A0B4)
    }
    enum Space {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
    }
    enum Radius {
        static let card: CGFloat = 20
        static let field: CGFloat = 12
    }
}

enum Tone {
    case ok, progress, warn, error, unknown, neutral
    var color: Color {
        switch self {
        case .ok: VC.Palette.ok
        case .progress, .warn: VC.Palette.progress
        case .error: VC.Palette.error
        case .unknown: VC.Palette.unknown
        case .neutral: VC.Palette.textSecondary
        }
    }
}

// MARK: - Reusable styling

struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(VC.Space.xl)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(VC.Palette.surface,
                        in: RoundedRectangle(cornerRadius: VC.Radius.card, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: VC.Radius.card, style: .continuous)
                .strokeBorder(VC.Palette.stroke, lineWidth: 1))
    }
}

struct FieldModifier: ViewModifier {
    var hasError: Bool
    func body(content: Content) -> some View {
        content
            .padding(.horizontal, VC.Space.md)
            .frame(minHeight: 48)
            .background(VC.Palette.surfaceRaised,
                        in: RoundedRectangle(cornerRadius: VC.Radius.field, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: VC.Radius.field, style: .continuous)
                .strokeBorder(hasError ? VC.Palette.error : VC.Palette.stroke,
                              lineWidth: hasError ? 2 : 1))
    }
}

extension View {
    func vcCard() -> some View { modifier(CardModifier()) }
    func vcField(error: Bool = false) -> some View { modifier(FieldModifier(hasError: error)) }
}

struct VCPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        Body(configuration: configuration)
    }
    private struct Body: View {
        let configuration: ButtonStyleConfiguration
        @Environment(\.isEnabled) private var isEnabled
        var body: some View {
            configuration.label
                .font(.headline)
                .foregroundStyle(VC.Palette.onAccent)
                .frame(maxWidth: .infinity, minHeight: 56)
                .background(VC.Palette.accent.opacity(isEnabled ? (configuration.isPressed ? 0.85 : 1) : 0.4),
                            in: Capsule())
        }
    }
}

struct StatusPill: View {
    let text: String
    let symbol: String
    let tone: Tone
    var body: some View {
        Label(text, systemImage: symbol)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(tone.color)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(tone.color.opacity(0.14), in: Capsule())
    }
}

struct CardHeader: View {
    let number: String?
    let title: String
    var body: some View {
        HStack(spacing: VC.Space.sm) {
            if let number {
                Text(number)
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(VC.Palette.onAccent)
                    .frame(width: 24, height: 24)
                    .background(VC.Palette.accent, in: Circle())
                    .accessibilityHidden(true)
            }
            Text(title).font(.title3.weight(.semibold)).foregroundStyle(VC.Palette.textPrimary)
        }
        .accessibilityAddTraits(.isHeader)
    }
}

struct InlineMessage: View {
    let text: String
    var tone: Tone = .error
    var body: some View {
        Label(text, systemImage: tone == .error ? "exclamationmark.triangle.fill" : "info.circle")
            .font(.footnote)
            .foregroundStyle(tone.color)
            .fixedSize(horizontal: false, vertical: true)
    }
}

enum Format {
    static func time(_ s: Double) -> String {
        let t = max(0, Int(s.rounded()))
        let h = t / 3600, m = (t % 3600) / 60, sec = t % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, sec) : String(format: "%d:%02d", m, sec)
    }
    static func spoken(_ s: Double) -> String {
        let t = max(0, Int(s.rounded()))
        let m = t / 60, sec = t % 60
        return "\(m) minutes \(sec) seconds"
    }
}
