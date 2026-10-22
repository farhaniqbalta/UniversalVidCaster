import Foundation

/// All user-facing strings (spec section 5). Replace with String Catalog keys when localizing.
enum Copy {
    static let appTitle = "Universal VidCaster"

    // Validation
    static let pasteToContinue = "Paste a video link to continue."
    static let errEmpty = "Paste a video link to continue."
    static let errNotURL = "This doesn’t look like a link. Copy the full video link and paste it again."
    static let errRedacted = "This link has hidden parts and can’t play. Copy the original media link again."
    static let errWebPage = "This looks like a web page, not a video. Copy the video’s own media link instead."
    static let errStart = "Enter a time like 1:30."
    static let errLanguage = "Choose a language or enter a code like “en”."
    static let errSubtitleURL = "Subtitles need a complete link. Copy the original subtitle link again."
    static let warnSubtitleExt = "This link doesn’t end in .vtt. It may still work if the site serves WebVTT."

    // Link section
    static let linkHelper = "Paste a direct video file link or a stream link you copied from your browser. A website page address won’t work."
    static let directLabel = "Direct file"
    static let prepareLabel = "Prepare on this iPad"
    static let directHelp = "Your TV downloads the video straight from the link. Best for ordinary MP4 files."
    static let prepareHelp = "For streams that need a small preparation step. Your iPad shares the stream’s playlists with your TV over Wi-Fi. The video itself still comes from the website."
    static let advancedFooter = "Only change these if a direct link won’t play."
    static let advancedFixed = "These are set automatically when preparing on this iPad."

    // Permission / discovery
    static let permTitle = "Find TVs on your Wi-Fi"
    static let permBody = "To find your TV and share the stream with it, VidCaster needs access to devices on your local network. Nothing leaves your home network for this step."
    static let permButton = "Continue"
    static let permDenied = "Local Network access is off. Turn it on in Settings to find your TV."
    static let openSettings = "Open Settings"
    static let discovering = "Looking for TVs on this Wi-Fi…"
    static let noTV = "No TV found. Check that your TV is on, uses Google Cast, and is on the same Wi-Fi as this iPad."
    static let tryAgain = "Try again"
    static let chooseTV = "Choose your TV"

    // Primary actions
    static let ctaChoose = "Choose a TV to cast"
    static func ctaDirect(_ tv: String) -> String { "Cast to \(tv)" }
    static func ctaPrepare(_ tv: String) -> String { "Prepare & cast to \(tv)" }
    static let preparing = "Preparing on this iPad…"
    static func sending(_ tv: String) -> String { "Sending to \(tv)…" }
    static let replace = "Replace video"
    static let chooseTVHint = "Choose your TV in step 3."

    // Foreground hosting
    static let foregroundPre = "Keep VidCaster open and the screen on while casting."
    static let foregroundNow = "Keep this app open and the screen on. If you leave, playback may stop."
    static let welcomeBack = "Welcome back. Checking your TV…"

    // Phases
    static let phaseChecked = "Link checked"
    static let phasePreparing = "Preparing playlists on this iPad…"
    static let phaseSending = "Sending to your TV"
    static let phaseWaiting = "Waiting for the TV to start"

    // Failures / status
    static let prepFailed = "Couldn’t prepare this video. The link may have expired, the site may have refused it, the network may have dropped, or this video type isn’t supported. Copy a fresh original link from the website and try again."
    static let loadFailed = "Couldn’t send this video to your TV. Check that it’s on and connected, then try again."
    static let sentWaiting = "Sent to your TV. Waiting for it to start…"
    static let noUpdate = "No update from the TV yet. It may still be starting. Check your TV, or tap Refresh."
    static let receiverIdle = "Your TV stopped playing this video. Try again, or prepare a fresh link."
    static let refresh = "Refresh status"
    static let editLink = "Edit link"
    static let seekUnavailable = "Seeking isn’t available for this video."

    // Subtitles
    static let subtitlesHelper = "Subtitles have their own access. The video link’s access isn’t shared with them."
    static func subtitlesSet(_ lang: String) -> String { "Subtitles set · \(lang)" }
    static let subtitlesLoadedUnconfirmed = "Subtitles loaded, not confirmed on screen."
    static let captionsOn = "Captions on"
    static let subtitlesFailed = "Couldn’t load subtitles. The video can still play. Check the subtitle link and language."

    // Replace
    static let replaceTitle = "Replace the current video?"
    static let replaceBody = "The current video will stop sharing from this iPad as soon as the new one is ready. It can’t be resumed."
    static let replaceWithSubsBody = "The current video will stop sharing from this iPad as soon as the new one is ready. It can’t be resumed. The new video will start with your subtitles."
    static let keepWatching = "Keep watching"

    // Expiry
    static let expired = "Sharing from this iPad ended after 30 minutes. Your TV may stop at the next chunk. Prepare the video again to keep watching."
    static func sharingEnds(_ time: String) -> String { "Sharing ends at \(time)." }
    static let prepareAgain = "Prepare again"

    // Ending a session
    static let stopPlaybackExp = "Stops the video on your TV. Your TV stays connected."
    static let disconnectExp = "Disconnects from your TV. The video may keep playing, and this iPad keeps sharing until you stop it."
    static let stopSharingExp = "Removes the prepared stream from this iPad. Your TV may fail soon after."
    static let endCastingExp = "Stops playback, stops sharing, and disconnects."
    static func endConfirm(_ tv: String) -> String {
        "End casting to \(tv)? This stops the video, clears the prepared stream from this iPad, and disconnects."
    }
    static let endPartial = "Casting ended, but the TV didn’t confirm it stopped. Check your TV."
    static let disconnectedBanner = "Disconnected from your TV. The video may still be playing, and this iPad is still sharing. Reconnect to control it, or choose Stop sharing."
    static let stopSentSharing = "Stop sent to your TV. This iPad is still sharing."
    static let stopSent = "Stop sent to your TV."
    static let untitled = "Untitled video"
}
