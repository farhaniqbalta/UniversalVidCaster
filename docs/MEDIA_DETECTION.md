# DOM media detection

`@uvc/detector` is a framework-independent consumer of the core media model. It
does not depend on Cast or Safari APIs and makes no network requests.

```typescript
import { HtmlVideoDetector } from '@uvc/detector';

const { candidates, limitations } = new HtmlVideoDetector().detect(document);
```

Each candidate extends `MediaCandidate` with `sources`: the zero-based video
index and discovery method (`currentSrc`, `video-src`, or `source-src`). URLs
resolve against the document's base URI. Repeated resolved URLs are combined,
preserving their provenance. For each video, currentSrc is inspected before
fallback sources, and only that active URL receives the current playback position.
The detector returns a snapshot; call it again after dynamic page/player changes.

Source MIME attributes are preferred to extension hints. MP4, HLS, and DASH
extensions provide hints only. An extensionless URL remains a candidate with
unknown MIME; enter the content type manually before loading it through the core.
Title comes from the video title attribute or document title.

Only HTTP(S) URLs without embedded credentials are returned. Blob, media-stream,
data, and invalid URLs produce limitations. Attached `mediaKeys` produce a warning;
their absence does not prove media is unprotected. Frame contents are not traversed,
including same-origin frames. The caller can separately supply a document it is
permitted to access. Other tabs, closed shadow roots, hidden player internals,
network requests, cookies, and native media pipelines are not inspected.

Results never guarantee authorization, codec compatibility, URL lifetime, or
receiver playback. No SUPPORTED classification or automatic castability indicator
is implemented. Detection is optional and never blocks manual casting.

## Harness check

1. Start the harness using the README instructions.
2. Select **Inspect page videos**, even if the Cast SDK is unavailable.
3. Check that the flower MP4 appears with `video/mp4` and source provenance.
4. Select **Use this source**. Check the URL, MIME, title, and start fields are
   populated. This action should neither cast nor start local playback.
5. Connect and select **Load & play** to test the existing Cast flow.
6. Play or seek the local fixture and inspect again to check currentSrc/position.
7. Enter a different manual URL and MIME type. Inspection is not required for load.

These UI steps still require manual confirmation. Automated detector tests cover
DOM extraction and limitations; they do not validate a physical Cast device or
Safari extension permissions.
