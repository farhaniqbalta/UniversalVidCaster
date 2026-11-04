import SwiftUI

extension CastWorkspaceView {
    func labeled<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) { Text(label).font(.subheadline.bold()); content().accessibilityLabel(label) }
    }
}

struct PrivateLinkField: View {
    let title: String
    @Binding var value: String
    @Binding var editing: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.subheadline.bold())
            if editing || value.isEmpty {
                TextField("https://…", text: $value, axis: .vertical)
                    .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                    .lineLimit(1...3).privacySensitive().vcField().accessibilityLabel(title)
                    .onSubmit { editing = false }
            } else {
                HStack {
                    Label(URL(string: value.trimmingCharacters(in: .whitespacesAndNewlines))?.host ?? "Media link", systemImage: "link").lineLimit(2)
                    Spacer(); Button("Edit") { editing = true }
                }.vcField()
            }
            PasteButton(payloadType: String.self) { strings in
                if let first = strings.first { value = first; editing = false }
            }.accessibilityLabel("Paste \(title)")
        }
    }
}
