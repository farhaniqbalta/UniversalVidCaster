import SwiftUI

extension CastWorkspaceView {
    var setup: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Set up your video").font(.title2.bold())
                VStack(alignment: .leading, spacing: 10) {
                    Text("Paste Safari transfer").font(.headline)
                    PasteButton(payloadType: String.self) { values in
                        guard let text = values.first, session.importSafariTransfer(text) else { return }
                        editingVideo = false; editingSubtitle = false
                        languageChoice = ["en", "id"].contains(draft.language) ? draft.language : "other"
                    }.accessibilityLabel("Paste Safari transfer")
                    Text("In the Safari extension, inspect and copy video + subtitle for app. Paste here to fill this form, then review and cast.").font(.footnote)
                }.vcCard().disabled(working)
                VStack(alignment: .leading, spacing: 14) {
                    CardHeader(number: "1", title: "Video link")
                    PrivateLinkField(title: "Original media link", value: $session.draft.url, editing: $editingVideo)
                    Text("Paste the video’s media link, not its website page address.").font(.footnote).foregroundStyle(VC.Palette.textSecondary)
                    Text("How to play it").font(.subheadline.bold())
                    ViewThatFits(in: .horizontal) {
                        Picker("How to play it", selection: $session.draft.prepareOnIPad) {
                            Text("Direct").tag(false); Text("Prepare on iPad").tag(true)
                        }.pickerStyle(.segmented).frame(minWidth: 300)
                        Toggle("Prepare on this iPad", isOn: $session.draft.prepareOnIPad)
                    }
                    Text(draft.prepareOnIPad ? "Your iPad prepares and shares playlists. Keep this app open and the screen on while casting." : "Your TV loads the media directly. Best for ordinary MP4 links.")
                        .font(.footnote).foregroundStyle(VC.Palette.textSecondary)
                    labeled("Title (optional)") { TextField("Your video", text: $session.draft.title).vcField() }
                    labeled("Start at (seconds or mm:ss)") {
                        TextField("0:00", text: $session.draft.start).keyboardType(.numbersAndPunctuation).focused($focused).vcField()
                    }
                }.vcCard().disabled(working)

                VStack(alignment: .leading, spacing: 12) {
                    DisclosureGroup {
                        Toggle("Include on next load", isOn: $session.draft.includeSubtitle)
                        if draft.includeSubtitle {
                            PrivateLinkField(title: "Original WebVTT subtitle link", value: $session.draft.subtitleURL, editing: $editingSubtitle)
                            Picker("Language", selection: $languageChoice) {
                                Text("English").tag("en"); Text("Indonesian").tag("id"); Text("Other…").tag("other")
                            }.onChange(of: languageChoice) { _, value in if value != "other" { draft.language = value } }
                            if languageChoice == "other" {
                                TextField("Language code, e.g. en-US", text: $session.draft.language).textInputAutocapitalization(.never).autocorrectionDisabled().vcField()
                            }
                            Text("Use a subtitle for this exact video, including its own access token. Changes apply when you reload from the Start at time.").font(.footnote)
                            Text("If Safari finds none: start Watch new subtitle requests, toggle subtitles off/on in the website player, then inspect and copy again.").font(.footnote).foregroundStyle(VC.Palette.textSecondary)
                        }
                    } label: { Label(draft.includeSubtitle ? "Subtitles · Included on next load" : "Subtitles · Off", systemImage: "captions.bubble") }
                }.vcCard().disabled(working)

                VStack(alignment: .leading, spacing: 12) {
                    CardHeader(number: "3", title: "TV")
                    HStack {
                        Label(cast.connected ? cast.device : "Choose your TV", systemImage: "tv").frame(maxWidth: .infinity, alignment: .leading)
                        devicePicker.frame(width: 48, height: 48).accessibilityLabel("Choose or change Cast TV")
                    }
                    Text("Use the Cast icon. Allow Local Network access when asked, and keep both devices on the same Wi-Fi.")
                        .font(.footnote).foregroundStyle(VC.Palette.textSecondary)
                    Button("Open app settings") { if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) } }
                        .font(.footnote)
                }.vcCard().disabled(working)

                DisclosureGroup("Advanced") {
                    VStack(alignment: .leading, spacing: 12) {
                        if draft.prepareOnIPad {
                            Text("HLS, fragmented MP4, and on-demand playback are set automatically.").font(.footnote)
                        } else {
                            labeled("MIME type (optional when inferred)") {
                                TextField("video/mp4", text: $session.draft.mime).textInputAutocapitalization(.never).autocorrectionDisabled().vcField()
                            }
                            Toggle("Fragmented MP4 HLS", isOn: $session.draft.fmp4)
                            Toggle("Live stream (only when known)", isOn: $session.draft.live)
                        }
                    }.padding(.top, 12)
                }.vcCard().disabled(working)
            }.padding(16)
        }
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .bottom) { loadBar }
    }

    var loadBar: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let error { InlineMessage(text: error).accessibilityLabel("Problem. \(error)") }
            Button {
                guard session.validateDraft() else { return }
                if sessionExists { confirmReplace = true } else { beginLoad() }
            } label: {
                HStack {
                    if preparing || cast.busy || ending { ProgressView() }
                    Text(preparing ? "Preparing on this iPad…" : cast.busy ? "Waiting for TV…" : sessionExists ? "Replace video" : draft.prepareOnIPad ? "Prepare & cast" : "Cast to TV")
                }.frame(maxWidth: .infinity)
            }.buttonStyle(VCPrimaryButtonStyle()).disabled(!cast.connected || working)
                .keyboardShortcut(.return, modifiers: .command)
            if !cast.connected { Text("Choose your TV using the Cast icon above.").font(.footnote) }
            if draft.prepareOnIPad { Text("Keep this app open. Auto-lock is disabled while sharing.").font(.footnote).foregroundStyle(VC.Palette.textSecondary) }
        }.padding(16).background(.regularMaterial)
    }

}
