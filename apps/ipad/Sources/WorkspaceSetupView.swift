import SwiftUI

extension CastWorkspaceView {
    var setup: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Set up your video").font(.title2.bold())
                VStack(alignment: .leading, spacing: 12) {
                    CardHeader(number: nil, title: "Destination")
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Label(cast.connected ? cast.device : "Choose your TV", systemImage: "tv")
                                .lineLimit(2)
                            Text(cast.connected ? "Connected" : cast.busy ? "Connecting…" : "Not connected")
                                .font(.footnote).foregroundStyle(VC.Palette.textSecondary)
                        }.frame(maxWidth: .infinity, alignment: .leading)
                        devicePicker.frame(width: 48, height: 48).accessibilityLabel("Choose or change Cast TV")
                    }
                    if !cast.connected {
                        Text("Use the Cast icon. Allow Local Network access and keep both devices on the same Wi-Fi.")
                            .font(.footnote).foregroundStyle(VC.Palette.textSecondary)
                        Button { if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) } } label: {
                            Text("Open app settings").font(.footnote).frame(minHeight: 44)
                        }
                    }
                }.vcCard()
                VStack(alignment: .leading, spacing: 14) {
                    CardHeader(number: nil, title: "Your video")
                    if draft.url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        Text("No video selected yet").foregroundStyle(VC.Palette.textSecondary)
                        Button {
                            showMediaOptions = true; editingVideo = true
                        } label: {
                            Text("Enter media URL manually").frame(minHeight: 44)
                        }
                    } else {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 6) {
                                Label("Video ready", systemImage: "film").font(.headline)
                                Text(URL(string: draft.url.trimmingCharacters(in: .whitespacesAndNewlines))?.host ?? "Media link")
                                    .font(.subheadline).foregroundStyle(VC.Palette.textSecondary).lineLimit(2)
                                Text("Playback: \(draft.prepareOnIPad ? "Prepare on iPad" : "Direct media")")
                                Text("Subtitles: \(subtitleSummary)")
                            }
                            Spacer(minLength: 8)
                            Button { showMediaOptions = true; editingVideo = true } label: {
                                Text("Edit video").frame(minHeight: 44)
                            }
                        }
                    }
                    PasteButton(payloadType: String.self) { values in
                        guard let text = values.first else { return }
                        _ = session.importSafariTransfer(text)
                    }.accessibilityLabel("Paste Safari transfer")
                    Text("Import from Safari or enter a media link. Review your selection before casting.")
                        .font(.footnote).foregroundStyle(VC.Palette.textSecondary)
                    DisclosureGroup("Media options", isExpanded: $showMediaOptions) {
                        VStack(alignment: .leading, spacing: 14) {
                            PrivateLinkField(title: "Original media link", value: $session.draft.url, editing: $editingVideo)
                            Text("Paste the video’s media link, not its website page address.")
                                .font(.footnote).foregroundStyle(VC.Palette.textSecondary)
                            Text("How to play it").font(.subheadline.bold())
                            ViewThatFits(in: .horizontal) {
                                Picker("How to play it", selection: $session.draft.prepareOnIPad) {
                                    Text("Direct").tag(false); Text("Prepare on iPad").tag(true)
                                }.pickerStyle(.segmented).frame(minWidth: 300)
                                Toggle("Prepare on this iPad", isOn: $session.draft.prepareOnIPad)
                            }
                            Text(draft.prepareOnIPad ? "Your iPad prepares and shares playlists. Website access and sharing may expire." : "Your TV loads the media directly. Best for ordinary MP4 links.")
                                .font(.footnote).foregroundStyle(VC.Palette.textSecondary)
                            labeled("Title (optional)") { TextField("Your video", text: $session.draft.title).vcField() }
                            labeled("Start at (seconds or mm:ss)") {
                                TextField("0:00", text: $session.draft.start).keyboardType(.numbersAndPunctuation).focused($focused).vcField()
                            }
                            DisclosureGroup(draft.includeSubtitle ? "Subtitles · Included on next load" : "Subtitles · Off") {
                                VStack(alignment: .leading, spacing: 12) {
                                    Toggle("Include on next load", isOn: $session.draft.includeSubtitle)
                                    if draft.includeSubtitle {
                                        PrivateLinkField(title: "Original WebVTT subtitle link", value: $session.draft.subtitleURL, editing: $editingSubtitle)
                                        Picker("Language", selection: $languageChoice) {
                                            Text("English").tag("en"); Text("Indonesian").tag("id"); Text("Other…").tag("other")
                                        }.onChange(of: languageChoice) { _, value in if value != "other" { draft.language = value } }
                                        if languageChoice == "other" {
                                            TextField("Language code, e.g. en-US", text: $session.draft.language).textInputAutocapitalization(.never).autocorrectionDisabled().vcField()
                                        }
                                        Text("Use a subtitle for this exact video, including its own access token. Changes apply on the next load.").font(.footnote)
                                        Text("If Safari finds none, use Watch new subtitle requests and toggle captions off/on in the website player.").font(.footnote).foregroundStyle(VC.Palette.textSecondary)
                                    }
                                }.padding(.top, 12)
                            }
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
                            }
                            Button {
                                showMediaOptions = false; editingVideo = false; editingSubtitle = false; focused = false
                            } label: {
                                Text("Done editing").frame(minHeight: 44)
                            }
                        }.padding(.top, 12)
                    }
                }.vcCard().disabled(working)
            }.padding(16)
        }
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .bottom) { loadBar }
    }

    var subtitleSummary: String {
        guard draft.includeSubtitle else { return "Off" }
        switch draft.language.lowercased() {
        case "en": return "English"
        case "id": return "Indonesian"
        case "", "und": return "Language unspecified"
        default:
            return draft.language.range(of: #"^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$"#, options: .regularExpression) != nil
                ? draft.language : "Language unspecified"
        }
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
                    Text(preparing ? "Preparing on this iPad…" : cast.busy ? "Waiting for TV…" : sessionExists ? "Replace video" : cast.connected && !cast.device.isEmpty ? "Cast to \(cast.device)" : "Cast to TV").lineLimit(1)
                }.frame(maxWidth: .infinity)
            }.buttonStyle(VCPrimaryButtonStyle()).disabled(!cast.connected || working || draft.url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                .keyboardShortcut(.return, modifiers: .command)
            if draft.url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text(cast.connected ? "Add a video to continue." : "Choose a TV and add a video.").font(.footnote)
            } else if !cast.connected { Text("Choose a TV to continue.").font(.footnote) }
            if draft.prepareOnIPad { Text("Keep this app open. Auto-lock is disabled while sharing.").font(.footnote).foregroundStyle(VC.Palette.textSecondary) }
        }.padding(16).background(.regularMaterial)
    }

}
