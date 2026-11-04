import SwiftUI

extension CastWorkspaceView {
    var diagnostics: some View {
        NavigationStack {
            List {
                Section("Testing presets") {
                    Button("Use flower MP4") { session.useFlowerPreset(); editingVideo = false; showDiagnostics = false }
                    Button("Use Mac bridge HLS settings") { session.useMacHLSPreset(); showDiagnostics = false }
                }.disabled(working)
                Section("Receiver") {
                    Text("\(cast.device) · \(playbackLabel)")
                    Text("\(Format.time(cast.position)) / \(Format.time(cast.duration))")
                    Button("Refresh status") { session.control("status") }.disabled(!cast.connected || working)
                }
                Section("Local diagnostics · media URLs omitted") {
                    ForEach(Array(cast.logs.enumerated()), id: \.offset) { _, line in Text(line).font(.caption.monospaced()) }
                    Text("Device names may appear. No video or subtitle links are included.").font(.footnote)
                }
            }.navigationTitle("Diagnostics").toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { showDiagnostics = false } } }
        }
    }

}
