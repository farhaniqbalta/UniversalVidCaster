import { HtmlVideoDetector } from '@uvc/detector';

// Injected only on an explicit click using activeTab permission.
// The popup can repeat inspection without accumulating message listeners.
const result = new HtmlVideoDetector().detect(document);
// Return a JSON snapshot to scripting.executeScript via a separate read function.
(globalThis as typeof globalThis & { __uvcSafariProbe?: unknown }).__uvcSafariProbe = result;
