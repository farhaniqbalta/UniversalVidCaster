import SwiftUI

extension CastWorkspaceView {
    var player: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Now Playing").font(.title2.bold())
            if let error { InlineMessage(text: error) }
            if !sessionExists && !cast.hasMedia {
                VStack(spacing: 16) {
                    Image(systemName: "tv").font(.system(size: 52)).accessibilityHidden(true)
                    Text("Nothing is casting yet").font(.title3.bold())
                    Text("Paste a media link, choose your TV, and cast.").multilineTextAlignment(.center)
                }.frame(maxWidth: .infinity, minHeight: 240).vcCard()
            } else {
                VStack(alignment: .leading, spacing: 16) {
                    Text(playerTitle).font(.title.bold()).lineLimit(3)
                    Text(cast.device).foregroundStyle(VC.Palette.textSecondary)
                    if let language = submittedSubtitleLanguage {
                        Label("Subtitle configured · \(language)", systemImage: "captions.bubble").font(.subheadline)
                        Text("Track requested on load. Check captions and timing on your TV.").font(.footnote).foregroundStyle(VC.Palette.textSecondary)
                    }
                    ViewThatFits(in: .horizontal) {
                        HStack { tvPill; hostPill; playbackPill }
                        VStack(alignment: .leading, spacing: 8) { tvPill; hostPill; playbackPill }
                    }
                    Image(systemName: "tv.and.mediabox").font(.system(size: 56)).foregroundStyle(VC.Palette.accent)
                        .frame(maxWidth: .infinity, minHeight: 130).background(VC.Palette.surfaceRaised, in: RoundedRectangle(cornerRadius: 16)).accessibilityHidden(true)
                    Slider(value: Binding(get: { min(max(0, dragging ? seekDraft : cast.position), max(1, cast.duration)) }, set: { seekDraft = $0 }), in: 0...max(1, cast.duration), onEditingChanged: { editing in
                        if editing { seekDraft = min(max(0, cast.position), max(1, cast.duration)); dragging = true }
                        else { dragging = false; session.seek(to: seekDraft) }
                    }).disabled(!canSeek).accessibilityLabel("Playback position")
                        .accessibilityValue("\(Format.spoken(cast.position)) of \(Format.spoken(cast.duration))")
                    HStack { Text(Format.time(dragging ? seekDraft : cast.position)); Spacer(); Text(cast.duration > 0 ? Format.time(cast.duration) : "Duration unknown") }.monospacedDigit()
                    if !canSeek { Text("Seeking needs a fresh, seekable receiver session.").font(.footnote).foregroundStyle(VC.Palette.textSecondary) }
                    transportRow
                    Button("Refresh receiver status", systemImage: "arrow.clockwise") { session.control("status") }.disabled(!cast.connected || working)
                    if let date = cast.lastStatusAt { Text("Last TV update: \(date.formatted(date: .omitted, time: .standard))").font(.caption).foregroundStyle(VC.Palette.textSecondary) }
                }.vcCard()
            }
            Text(cast.message).font(.footnote).foregroundStyle(VC.Palette.textSecondary).accessibilityAddTraits(.updatesFrequently)
            if let endResult { Text(endResult).font(.footnote).accessibilityAddTraits(.updatesFrequently) }
            if preparing || host.hosting || host.expired {
                VStack(alignment: .leading, spacing: 10) {
                    Label(host.expired ? "Sharing ended" : "Keep this app open and the screen on", systemImage: host.expired ? "clock.badge.exclamationmark" : "info.circle")
                    Text(host.message).font(.footnote)
                    if let endsAt = host.endsAt { Text("Sharing ends at \(endsAt.formatted(date: .omitted, time: .shortened)). Website access may expire sooner.").font(.footnote) }
                    if host.hosting && !cast.connected { InlineMessage(text: "Disconnected. Your TV may still be playing, and this iPad is still sharing.", tone: .warn) }
                }.vcCard()
            }
            if sessionExists || host.hosting || cast.connected {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Session actions").font(.headline)
                    Button("End casting", role: .destructive) { confirmEnd = true }.disabled(working)
                    Text("Request Stop, clear local playlists, then disconnect.").font(.footnote)
                    Button("Disconnect TV (leave playback running)") { session.disconnect() }.disabled(!cast.connected || working)
                    if host.hosting {
                        Button("Stop sharing from this iPad", role: .destructive) { confirmClear = true }.disabled(working)
                    }
                }.vcCard()
            }
        }.foregroundStyle(VC.Palette.textPrimary)
    }

    var tvPill: some View { StatusPill(text: cast.connected ? "TV · Connected" : "TV · Not connected", symbol: "tv", tone: cast.connected ? .ok : .unknown) }
    var hostPill: some View { StatusPill(text: host.busy ? "iPad · Preparing" : host.hosting ? (session.isActive ? "iPad · Sharing" : "iPad · Availability unknown") : host.expired ? "iPad · Expired" : "iPad · Not sharing", symbol: "wifi", tone: host.busy ? .progress : host.hosting && session.isActive ? .ok : .unknown) }
    var playbackPill: some View { StatusPill(text: "Playback · \(playbackLabel)", symbol: cast.playback == "PLAYING" ? "play.fill" : "questionmark.circle", tone: playbackLabel == "Playing" ? .ok : .unknown) }

    var transportRow: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 12) { backButton; playButton; forwardButton; stopButton }
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) { backButton; playButton; forwardButton }
                stopButton
            }
        }.buttonStyle(.bordered)
    }
    var backButton: some View { Button { session.skip(-15) } label: { Image(systemName: "gobackward.15").frame(minWidth: 44, minHeight: 52) }.disabled(!canSeek).accessibilityLabel("Back 15 seconds") }
    var forwardButton: some View { Button { session.skip(15) } label: { Image(systemName: "goforward.15").frame(minWidth: 44, minHeight: 52) }.disabled(!canSeek).accessibilityLabel("Forward 15 seconds") }
    var stopButton: some View { Button { session.control("stop") } label: { Image(systemName: "stop.fill").frame(minWidth: 44, minHeight: 52) }.disabled(!cast.hasMedia || working).accessibilityLabel("Stop TV playback, keep sharing") }
    var playButton: some View {
        Button { session.control(cast.playback == "PLAYING" ? "pause" : "play") } label: {
            Label(cast.playback == "PLAYING" ? "Pause" : "Play", systemImage: cast.playback == "PLAYING" ? "pause.fill" : "play.fill").frame(minHeight: 52)
        }.disabled(!cast.hasMedia || working || !["PLAYING", "PAUSED"].contains(cast.playback))
    }

}
