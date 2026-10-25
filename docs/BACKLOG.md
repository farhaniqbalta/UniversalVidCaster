# Product backlog

## TV/device volume control

Requested 2026-10-23. Replace current media-stream volume/mute with Cast device
volume/mute, retaining the existing UI. Read values from the Cast session and
handle unsupported operations. Physically verify whether the target TV changes
its system volume or only the Cast receiver output level. Implemented 2026-10-25;
superseded by the user’s media-slider + hardware-button preference. The slider
is restored to media volume; the official SDK hardware-button option is enabled
and was user-confirmed working on the tested iPad/TV on 2026-10-25. This request
is complete for that setup; Google’s documented iOS limitations mean broader
compatibility still needs verification. No extra on-screen TV buttons are requested.

## App icon

Requested 2026-10-23. Supplied app and Safari icon resources were integrated
2026-10-25. Build/package checks pass; physical appearance review remains.
