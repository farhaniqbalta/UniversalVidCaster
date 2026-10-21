import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import { BlockList, isIP } from 'node:net';
import { networkInterfaces } from 'node:os';
import { randomBytes } from 'node:crypto';
import { originalUrl, rewritePlaylist } from './playlist.mjs';

const port = 8787;
const sessions = new Map();
const blocked = new BlockList();
for (const [address, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]]) blocked.addSubnet(address, prefix);
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
function publicAddress(address, family) {
  return family === 4 ? !blocked.check(address) : globalV6.check(address, 'ipv6');
}
function lookup(hostname, options, callback) {
  dns.lookup(hostname, { all: true }, (error, addresses) => {
    const safe = addresses?.filter(a => publicAddress(a.address, a.family));
    if (error || !safe?.length) return callback(new Error('Public HTTPS destination required.'));
    if (options.all) callback(null, safe);
    else callback(null, safe[0].address, safe[0].family);
  });
}
function fetchPlaylist(value) {
  const url = originalUrl(value);
  const literal = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(literal) && !publicAddress(literal, isIP(literal))) throw new Error('Public HTTPS destination required.');
  if (url.port && url.port !== '443') throw new Error('HTTPS port 443 required.');
  return new Promise((resolve, reject) => {
    const request = https.get(url, { lookup, headers: { Accept: 'application/vnd.apple.mpegurl', 'Accept-Encoding': 'identity' } }, response => {
      if (response.statusCode !== 200) {
        response.resume(); reject(new Error(`Upstream playlist HTTP ${response.statusCode}.`)); return;
      }
      const chunks = []; let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 1024 * 1024) { request.destroy(); reject(new Error('Playlist exceeds 1 MiB limit.')); }
        else chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      response.on('error', () => reject(new Error('Playlist response failed.')));
    });
    const timer = setTimeout(() => request.destroy(new Error('timeout')), 15000);
    request.on('close', () => clearTimeout(timer));
    request.on('error', () => reject(new Error('HTTPS playlist request failed or timed out.')));
  });
}
const id = () => randomBytes(24).toString('hex');
const localPeer = request => ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(request.socket.remoteAddress);
const localHost = request => ['localhost:8787','127.0.0.1:8787'].includes(request.headers.host);
function send(response, status, body, type = 'text/plain') {
  response.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  response.end(body);
}
function route(session, upstream) {
  let key = session.urls.get(upstream);
  if (!key) {
    if (session.urls.size >= 128) throw new Error('Too many child playlists.');
    key = id(); session.urls.set(upstream, key); session.routes.set(key, upstream);
  }
  return `${session.origin}/hls/${session.id}/${key}.m3u8`;
}
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Local HLS bridge</title>
<style>body{font:18px system-ui;max-width:800px;margin:40px auto;padding:20px}input,select,button{font:inherit;padding:10px;box-sizing:border-box;width:100%;margin:8px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere}label{display:block;margin:20px 0}</style>
<h1>Prepare a playlist for Cast</h1><p>Keep this Mac running on the TV's network. Paste a fresh original master URL. Only playlists pass through the Mac; media goes directly to the TV.</p>
<form id="form"><label>Original master playlist URL<input id="master" type="url" required autocomplete="off"></label><label>Mac address reachable by TV<select id="address"></select></label><p>Preparing uses this URL's t and pm on HTTPS child resources listed by the playlist, including other hosts. Existing child values are preserved. Session expires after 30 minutes.</p><button>Prepare playlist</button></form><pre id="status"></pre><input id="result" readonly hidden aria-label="Prepared playlist URL"><button id="copy" hidden>Copy playlist URL</button><button id="clear">Clear all bridge sessions</button>
<script>
const $=id=>document.getElementById(id);
fetch('/addresses').then(r=>r.json()).then(addresses=>{for(const address of addresses){const o=document.createElement('option');o.value=address;o.textContent=address;$('address').append(o);}});
$('form').onsubmit=async e=>{e.preventDefault();$('result').hidden=true;$('copy').hidden=true;$('status').textContent='Preparing…';try{const r=await fetch('/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:$('master').value,address:$('address').value})});const data=await r.json();if(!r.ok)throw Error(data.error);$('result').value=data.url;$('result').hidden=false;$('copy').hidden=false;$('master').value='';$('status').textContent='Ready. Copy this playlist URL into the Chrome Cast harness. Set HLS MIME, enable fragmented MP4, then connect and Load & play.';}catch(e){$('status').textContent=e.message;}};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('result').value);$('status').textContent='Copied.';}catch{$('result').select();$('status').textContent='Press Command-C to copy.';}};
$('clear').onclick=async()=>{await fetch('/sessions',{method:'DELETE'});$('result').value='';$('master').value='';$('result').hidden=true;$('copy').hidden=true;$('status').textContent='Sessions cleared.';};
</script>`;
function addresses() {
  return Object.values(networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')).map(a => a.address);
}
const server = http.createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (request.method === 'OPTIONS') return send(response, 204, '');
    const match = /^\/hls\/([a-f0-9]{48})\/([a-f0-9]{48})\.m3u8$/.exec(path);
    if (match && ['GET','HEAD'].includes(request.method)) {
      const session = sessions.get(match[1]);
      const upstream = session?.routes.get(match[2]);
      if (!session || !upstream || session.expires < Date.now()) return send(response, 404, 'Session missing or expired.');
      const source = await fetchPlaylist(upstream);
      const rewritten = rewritePlaylist(source, upstream, session.authorization, url => route(session, url));
      return send(response, 200, request.method === 'HEAD' ? '' : rewritten, 'application/vnd.apple.mpegurl');
    }
    if (!localPeer(request) || !localHost(request)) return send(response, 403, 'Open controls at http://localhost:8787.');
    if (request.method === 'GET' && path === '/') return send(response, 200, html, 'text/html');
    if (request.method === 'GET' && path === '/addresses') return send(response, 200, JSON.stringify(addresses()), 'application/json');
    if (['POST','DELETE'].includes(request.method) && path === '/sessions') {
      if (request.headers.origin !== 'http://localhost:8787' && request.headers.origin !== 'http://127.0.0.1:8787') return send(response, 403, 'Local control origin required.');
      if (request.method === 'DELETE') { sessions.clear(); return send(response, 200, '{}', 'application/json'); }
      let body = '';
      for await (const chunk of request) { body += chunk; if (body.length > 16384) return send(response, 413, '{"error":"Input too large."}', 'application/json'); }
      const input = JSON.parse(body);
      if (!addresses().includes(input.address)) throw new Error('Choose this Mac’s network address.');
      const master = originalUrl(input.url);
      const authorization = Object.fromEntries(['t','pm'].map(key => [key, master.searchParams.get(key)]));
      if (!authorization.t || !authorization.pm) throw new Error('Master URL must include t and pm.');
      if (sessions.size >= 8) throw new Error('Clear previous sessions first.');
      const session = { id: id(), origin: `http://${input.address}:${port}`, authorization, urls: new Map(), routes: new Map(), expires: Date.now() + 30*60*1000 };
      const source = await fetchPlaylist(master.href);
      rewritePlaylist(source, master.href, authorization, url => route(session, url));
      const url = route(session, master.href);
      sessions.set(session.id, session);
      return send(response, 200, JSON.stringify({ url }), 'application/json');
    }
    send(response, 404, 'Not found.');
  } catch (error) {
    // Never include upstream URLs, tokens, or low-level network errors.
    const safe = /^(Use an original|Upstream response|Encrypted playlists|HLS variable|HTTPS playlist|Upstream playlist HTTP|Playlist exceeds|Playlist response|Choose this Mac|Master URL|Clear previous|Too many child|Public HTTPS|HTTPS port)/.test(error.message);
    send(response, 400, JSON.stringify({ error: safe ? error.message : 'Bridge request failed. Check the fresh URL and network.' }), 'application/json');
  }
});
setInterval(() => { for (const [key, session] of sessions) if (session.expires < Date.now()) sessions.delete(key); }, 60000).unref();
server.listen(port, '0.0.0.0', () => console.log('HLS bridge controls: http://localhost:8787 (Ctrl-C to stop and clear tokens).'));
server.on('error', () => { console.error('Bridge could not listen on port 8787.'); process.exitCode = 1; });
