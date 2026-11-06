# Universal VidCaster for Mac

This macOS app installs the shared Universal VidCaster Safari Web Extension in
Mac Safari. It is the containing app for the same web extension source used by
the iPad app. The Mac app shows extension status and opens Safari's extension
settings.

## Build and install

1. From the repository root, run `npm ci` if dependencies are not installed,
   then `npm run build:safari-probe` to generate the shared extension resources.
2. Open `apps/mac/UniversalVidCasterMac.xcodeproj` in Xcode and select the
   shared **UniversalVidCasterMac** scheme with **My Mac** as the destination.
3. Select your development team for the Mac app and
   **UniversalVidCasterMacSafariExtension** targets if Xcode asks, then Run.
4. In Safari → Settings → Extensions, enable **Universal VidCaster Safari** and
   grant access to the video website. Add the extension to Safari's toolbar if
   its button is hidden.

If the extension is enabled but its button is missing, open a normal Safari
window and choose **View → Customize Toolbar**. Drag **Universal VidCaster
Safari** into the toolbar if it appears in the palette. If the window uses a
Safari profile, enable the extension for that profile under **Safari → Settings
→ Profiles → [profile] → Extensions**. Quit and reopen Safari after changing
these settings. For an unsigned development build, re-enable **Allow unsigned
extensions** in Safari's Developer settings after restarting Safari.

Run the Mac app at least once after installing it so Safari registers the
embedded extension. After changing TypeScript, HTML, CSS, the manifest, or
images in `spikes/safari-google-cast/extension`, rebuild the web resources and
run the Mac app again.

The Mac host has its own bundle identifiers, so it can be registered alongside
the older Safari Probe during development. In Safari Settings → Extensions,
look for **Universal VidCaster Safari**. The older probe is not needed and can
remain disabled. To disable its PlugInKit registration for the current macOS
user without deleting the old app, run:

```sh
pluginkit -e ignore -i dev.universalvidcaster.safariprobe.Extension
```

Check with `pluginkit -m -v -p com.apple.Safari.web-extension`: a leading `-`
on the old probe means it is ignored. The setting is local to this Mac and does
not affect the iPad extension. The new Mac extension remains available across
app rebuilds; Safari may require **Allow unsigned extensions** again after a
browser restart during unsigned development.

The Mac extension has its own `SafariExtension/manifest.json` for its display
name and description; rebuilding the shared web resources does not rename the
iPad extension.

## Current scope

The Safari extension can inspect pages, find candidate video and subtitles,
and copy a transfer. Its **Open in Universal VidCaster** action uses the iPad
app's `universalvidcaster://` handler; this Mac app does not import that link
or cast to a TV. Mac playback and casting require a separate native sender flow.
