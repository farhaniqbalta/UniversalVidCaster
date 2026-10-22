export interface SubtitleObservation {
  url: string;
  language: string | null;
  method: 'track-element' | 'resource-timing';
  association: 'current-track-element' | 'matching-media-id';
}

function mediaLocation(value: string): { identity: string; resource: string } | undefined {
  try {
    // Provider-specific evidence from this site's media URL layout, not a
    // universal mapping from arbitrary CDN URLs to episodes.
    const url = new URL(value);
    const namespaced = /^\/v\/(z\d+)\/([^/]+)\/(.+)$/.exec(url.pathname);
    if (namespaced) return { identity: `namespaced:${namespaced[1]}/${namespaced[2]}`, resource: namespaced[3] };
    const flat = /^\/v\/([^/]+)\/((?:config[^/]*\.json|p\/.+|subs-legacy\/.+|i18n\/.+))$/.exec(url.pathname);
    return flat ? { identity: `flat:${flat[1]}`, resource: flat[2] } : undefined;
  } catch { return undefined; }
}

function mediaIdentity(value: string): string | undefined { return mediaLocation(value)?.identity; }

export function subtitleDiagnostics(doc: Document, mediaUrls: string[], resources: { name: string }[], matches: SubtitleObservation[]) {
  const identities = new Set(mediaUrls.map(mediaIdentity).filter(Boolean));
  const observedVttUrls = Array.from(new Set(resources.map(resource => resource.name).filter(value => {
    try { return /^https?:$/.test(new URL(value).protocol) && /\.vtt$/i.test(new URL(value).pathname); }
    catch { return false; }
  }))).slice(-20);
  return {
    currentMediaIdentityCount: identities.size,
    resourceEntryCount: resources.length,
    trackElementCount: doc.querySelectorAll('video track[src], audio track[src]').length,
    observedVttUrls,
    matchedSubtitleCount: matches.length,
  };
}

export function collectSubtitles(doc: Document, mediaUrls: string[], resources: { name: string; startTime?: number }[] = []): SubtitleObservation[] {
  const identities = new Set(mediaUrls.map(mediaIdentity).filter((id): id is string => !!id));
  const current = identities.size === 1 ? Array.from(identities)[0] : undefined;
  const recentPlayback = resources.map((resource, index) => ({ ...resource, order: resource.startTime ?? index }))
    .filter(resource => {
      const location = mediaLocation(resource.name);
      return !!location && /^(?:p\/|config[^/]*\.json$)/.test(location.resource);
    }).sort((a, b) => b.order - a.order)[0];
  // A source element can lag behind a player transition. Do not associate old
  // captions when newer playback requests already belong to another media ID.
  if (recentPlayback && current && mediaIdentity(recentPlayback.name) !== current) return [];
  const found = new Map<string, SubtitleObservation>();
  function add(value: string, language: string | null, method: SubtitleObservation['method']) {
    try {
      const url = new URL(value, doc.baseURI);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return;
      const identity = mediaIdentity(url.href);
      if (identity && (!current || identity !== current)) return;
      // Timing history can include requests from earlier SPA episodes. Never
      // choose the newest/first VTT unless it matches one current media ID.
      if (method === 'resource-timing' && (!current || identity !== current)) return;
      if (method === 'track-element' && identities.size > 1) return;
      if (!found.has(url.href)) found.set(url.href, {
        url: url.href, language,
        method, association: identity ? 'matching-media-id' : 'current-track-element',
      });
    } catch { /* Invalid observations do not become copyable candidates. */ }
  }
  doc.querySelectorAll('video track[src], audio track[src]').forEach(track => {
    if (!['subtitles', 'captions'].includes(track.getAttribute('kind') ?? 'subtitles')) return;
    const source = track.getAttribute('src');
    if (source?.trim()) add(source, track.getAttribute('srclang') || null, 'track-element');
  });
  for (const resource of resources) {
    try {
      if (/\.vtt$/i.test(new URL(resource.name).pathname)) add(resource.name, null, 'resource-timing');
    } catch { /* Ignore invalid resource names. */ }
  }
  return Array.from(found.values());
}
