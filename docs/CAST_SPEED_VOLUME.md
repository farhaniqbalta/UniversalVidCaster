# Cast playback speed and media volume

Implemented on `feat/cast-speed-volume-control`, based on `main` independently
of the documentation-cleanup branch.

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
