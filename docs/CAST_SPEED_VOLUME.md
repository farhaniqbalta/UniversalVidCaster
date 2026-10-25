# Cast playback speed and media volume

## Current behavior — media slider and hardware TV buttons (2026-10-25)

At the user's request, the on-screen slider and mute again control media-stream
volume and use media status/capabilities. New loads still initialize media volume
to 100% and unmute the stream after load acknowledgement. Device volume/mute
is not changed by that initialization. No extra on-screen TV controls were added.

The app now enables `physicalVolumeButtonsWillControlDeviceVolume` before
initializing CastContext. The user confirmed on 2026-10-25 that this combination
works on the tested iPad/TV: the app slider controls media volume and physical
iPad buttons control TV/device volume. This is a user-reported functional pass.
Compatibility with other setups is not established: [Google's current guide](https://developers.google.com/cast/docs/ios_sender/integrate#physical_button_volume_control)
warns physical-button support is unavailable due to iOS changes despite retaining
the SDK option. The local physical result does not remove that documented
limitation for other devices or OS versions.
This supersedes the device-slider implementation below.

Test with the app foregrounded and a Cast session playing: lower the media slider,
confirm audio changes, then press the iPad hardware volume buttons. Check whether
the TV volume changes independently and whether the media slider stays unchanged.
Also check normal local volume behavior after disconnect. Test at a comfortable
TV level. No volume interception workaround or background guarantee is included.

## Device-volume update — 2026-10-25

The existing slider and mute button now control **TV device volume**, using
Cast session device-volume/mute requests and session-reported values. This
supersedes the media-volume behavior described in the original implementation
record below. Playback-speed behavior and layout are unchanged.

Device capability traits gate the controls, independently of loaded media and
its supported media commands. No optimistic changes or automatic maximum-volume
device requests are added. Requests retain existing timeout/failure reporting.

Each successful new media load is followed by tracked stream-volume 100% and
stream-unmute requests. These normalize the player audio beneath device volume;
they do not raise or unmute the TV device. The pinned SDK has no load-time
stream-volume field, so this runs after the load acknowledgement and a brief
initial interval may still use the receiver's previous stream level. Controls
stay busy through initialization; errors/timeouts are reported without inventing
success. Physical confirmation of this initialization remains pending.

Physical check: run from Xcode, cast a video, lower device volume slightly, then
raise it moderately. Test mute/unmute and use the TV remote to check whether the
slider follows external changes. Check the TV's own volume indicator: some Cast
devices expose receiver output volume rather than the TV's system level.
The earlier user-confirmed media-volume result does not validate this change.

## Original implementation record

Implemented on `feat/cast-speed-volume-control` and merged into `main`. The
`docs-cleanup` branch now includes this implementation through a merge from main;
the broader documentation cleanup remains separate.

Physical result (2026-10-23): the user confirmed the new controls work after
installation on the iPad. Record playback speed, media volume, and mute/unmute
as a user-reported functional pass on the tested TV. Individual speed presets,
both playback paths, subtitle timing, and recovery cases were not separately
reported; the checklist below remains useful for broader regression testing.

Now Playing includes speeds 0.5×, 0.75×, 1×, 1.25×, 1.5×, and 2×, a media-volume
slider, and mute/unmute. These control the current Cast media session, not the
iPad speaker or necessarily the TV's system-wide volume. Volume is sent on slider
release. Settings are read from receiver status, not persisted or optimistically
reported as successful. A new load uses receiver/default behavior.

Controls require an active connected app, loaded media, receiver status, no
pending session operation, and the corresponding advertised media command.
Requests use existing tracked acknowledgements/timeouts; failure does not fabricate
a changed speed, volume, or mute state. Unsupported commands are disabled.
No hosting, subtitle, or media URL preparation changes are required.

## Physical check

1. Build/run the updated iPad app, connect to the TV, and load a sufficiently
   long playable video. The short flower clip is inconvenient for this test.
2. In Now Playing, try 1.5×, 2×, and back to 1×. Confirm the displayed receiver
   value and actual TV speed/audio. Repeat with Direct and Prepare on iPad.
3. At a comfortable starting level, move media volume down, then up moderately;
   check actual audio, mute, and unmute. No command automatically sets maximum volume.
4. Seek/pause/resume and check subtitles at increased speed. Verify replacement
   and disconnect clear stale control availability. Refresh status after a timeout.
5. Record disabled controls or request errors with the TV/media type. SDK support
   alone does not establish that this TV supports each operation.

Automated session tests cover validation, capability/session gating, and preserving
receiver truth. All 31 native tests and the unsigned iPad build passed at
implementation; the user subsequently confirmed the physical functional result
above.

## Speed control usability update

Speed presets are visible immediately below transport controls, replacing the
menu with one-tap buttons. An adaptive grid wraps in narrow windows; each preset
has a minimum 44pt height, selected border/weight, and VoiceOver selected trait.
Selection follows receiver status rather than the last tapped value. Volume
layout and behavior are unchanged.

This placement is a product-specific recommendation for frequent speed changes,
not a universal platform requirement. References:
[Apple grouped selection guidance](https://developer.apple.com/design/human-interface-guidelines/segmented-controls)
and [YouTube's settings-based speed pattern](https://blog.youtube/news-and-events/viewer-hacks/).
Physical usability of this revised layout still needs confirmation.
