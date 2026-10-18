# Web sender integration decisions

Reviewed 2026-10-18 against Google's official documentation:

- [Web Sender setup](https://developers.google.com/cast/docs/web_sender): supported
  Cast browsers, HTTPS requirement, and lack of iOS Chrome Cast support.
- [Web Sender integration](https://developers.google.com/cast/docs/web_sender/integrate):
  SDK callback, framework initialization, media load, controls, and session events.
- [CastContext reference](https://developers.google.com/cast/docs/reference/web_sender/cast.framework.CastContext):
  SDK-managed session requests and state events.

## Decisions

- Load `https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1`
  after registering `__onGCastApiAvailable`. Report unavailable, download failure,
  and timeout states. Reload the page after SDK initialization failure.
- Use `chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID` and origin-scoped auto
  joining. No custom receiver or receiver registration is planned.
- `connect()` invokes `CastContext.requestSession()` within the user's click,
  without an asynchronous prerequisite. The SDK owns discovery and device choice;
  the draft `discover()/connect(deviceId)` contract is therefore replaced.
- Listen to session/Cast state changes and remote player changes, including
  resumed sessions and external controls. Use receiver `playerState`, not the
  result of a load promise, to report PLAYING.
- Use `CastSession.loadMedia()` with MIME, metadata, autoplay, and seconds converted
  from the core's milliseconds. Use media-session callback commands so control
  failures reject rather than being optimistically reported as success.
- `disconnect()` calls `endSession(false)` to leave playback running; Stop is a
  separate media operation. Dispose removes listeners without ending playback.
- Google documents HTTPS for hosted senders. Local development uses a trustworthy
  localhost origin and checks `window.isSecureContext`. Successful localhost
  casting remains a physical validation item.

Receiver IDLE reasons are exposed without inferring authentication or DRM from
generic load failures. Those causes can remain UNKNOWN without more evidence.

This adapter targets supported Chrome environments and is not a Safari solution.
