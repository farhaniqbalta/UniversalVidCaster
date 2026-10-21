import test from 'node:test';
import assert from 'node:assert/strict';
import { originalUrl, rewritePlaylist } from './playlist.mjs';

const base = 'https://media.example.test/path/master.json?t=session&pm=browser';
const auth = { t: 'session', pm: 'browser' };
test('master audio, video and iframe references become bridge routes with authorized upstream URLs', () => {
  const urls = [];
  const output = rewritePlaylist('#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,URI="audio.json",GROUP-ID="a"\n#EXT-X-I-FRAME-STREAM-INF:URI="iframe.json",BANDWIDTH=1\n#EXT-X-STREAM-INF:BANDWIDTH=123,AUDIO="a"\nvideo.json', base, auth, url => { urls.push(url); return `http://192.168.1.2/hls/${urls.length}.m3u8`; });
  assert.equal(urls.length, 3);
  assert.equal(urls[0], 'https://media.example.test/path/audio.json?t=session&pm=browser');
  assert.equal(urls[2], 'https://media.example.test/path/video.json?t=session&pm=browser');
  assert.match(output, /URI="http:\/\/192.168.1.2\/hls\/1.m3u8"/);
  assert.match(output, /\nhttp:\/\/192.168.1.2\/hls\/3.m3u8$/);
});
test('initialization and segments use direct authorized URLs, even across hosts', () => {
  const output = rewritePlaylist('#EXTM3U\n#EXT-X-MAP:URI="https://cdn.example.test/runtime.js"\n#EXTINF:6,\nhttps://other.example.test/style.css\n#EXT-X-ENDLIST', base, auth, () => assert.fail('media must remain direct'));
  assert.match(output, /URI="https:\/\/cdn.example.test\/runtime.js\?t=session&pm=browser"/);
  assert.match(output, /https:\/\/other.example.test\/style.css\?t=session&pm=browser/);
  assert.match(output, /#EXT-X-ENDLIST$/);
});
test('preserves existing child authorization, other query parameters and byte ranges', () => {
  const output = rewritePlaylist('#EXTM3U\n#EXT-X-MAP:URI="init?t=own&x=1",BYTERANGE="128@0"\n#EXT-X-BYTERANGE:256@128\nsegment?pm=special', base, auth, () => assert.fail());
  assert.match(output, /init\?t=own&x=1&pm=browser/);
  assert.match(output, /segment\?pm=special&t=session/);
  assert.match(output, /BYTERANGE="128@0"/);
  assert.match(output, /#EXT-X-BYTERANGE:256@128/);
});
test('does not copy unrelated master query secrets', () => {
  const output = rewritePlaylist('#EXTM3U\nsegment', `${base}&other=private`, auth, () => assert.fail());
  assert.doesNotMatch(output, /other|private/);
});
test('rejects encryption without requesting keys', () => {
  assert.throws(() => rewritePlaylist('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\na.ts', base, auth, () => assert.fail()), /Encrypted/);
  assert.throws(() => rewritePlaylist('#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=SAMPLE-AES,URI="key"', base, auth, () => assert.fail()), /Encrypted/);
  assert.doesNotThrow(() => rewritePlaylist('#EXTM3U\n#EXT-X-KEY:METHOD=NONE\na.ts', base, auth, () => assert.fail()));
});
test('rejects non-HLS, unsupported schemes, variables and embedded credentials', () => {
  assert.throws(() => rewritePlaylist('<html>error</html>', base, auth, () => ''), /not an HLS/);
  for (const reference of ['http://cdn.test/a', 'data:abc', 'https://user:password@cdn.test/a']) {
    assert.throws(() => rewritePlaylist(`#EXTM3U\n${reference}`, base, auth, () => ''), /HTTPS/);
  }
  assert.throws(() => rewritePlaylist('#EXTM3U\n{$variable}/a', base, auth, () => ''), /variable/);
  assert.throws(() => originalUrl('https://example.test/a?t=%5BREDACTED%5D'), /original/);
});
