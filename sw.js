/* Offline support for the 3D Learning Simulations hub.
   - Pages, scripts and data: network first, so updates show straight away; saved copy used when offline.
   - Audio and images: saved copy first (fast), refreshed in the background.
   - Opening a simulation saves all of its files (listed in sims/<id>/offline.json) for offline use. */
const CACHE = 'sims-hub-v22';
const SIMS = 'sims-files';   // saved simulations: kept across hub updates
const CORE = ['./', 'index.html', 'area.html', 'course.html', 'manifest.webmanifest',
  'assets/hub.css?v=25', 'assets/hub.js?v=27', 'data/catalog.json?v=27', 'vendor/qrcode/qrcode.js',
  'vendor/three/three.module.js', 'vendor/three/addons/controls/OrbitControls.js', 'vendor/three/addons/renderers/CSS2DRenderer.js',
  'vendor/three/addons/utils/BufferGeometryUtils.js', 'vendor/three-mesh-bvh/index.module.js', 'vendor/three-bvh-csg/index.module.js',
  'icons/icon-192.png', 'assets/stats.js?v=2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== SIMS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const isMedia = p => /\.(mp3|jpg|jpeg|png|webp|svg)$/i.test(p);
const simDir = p => { const m = p.match(/^(.*\/sims\/[^/]+\/)/); return m ? m[1] : null; };
const saving = new Map();

async function saveSim(dir){
  if (saving.has(dir)) return saving.get(dir);
  const job = (async () => {
    let total = 0, saved = 0;
    try {
      const r = await fetch(dir + 'offline.json', {cache: 'no-cache'}); if (!r.ok) return {total, saved};
      const list = await r.json(), c = await caches.open(SIMS);
      await c.put(dir + 'offline.json', new Response(JSON.stringify(list), {headers: {'Content-Type': 'application/json'}}));
      total = list.files.length;
      for (const f of list.files) {
        const u = new URL(f, self.location.origin + dir).href;
        if (await c.match(u)) { saved++; continue; }
        try { const res = await fetch(u); if (res.ok && res.status === 200) { await c.put(u, res); saved++; } } catch(_){}
      }
    } catch(_){}
    return {total, saved};
  })();
  saving.set(dir, job); job.finally(() => saving.delete(dir));
  return job;
}
const cacheFor = url => caches.open(/\/sims\//.test(new URL(url).pathname) ? SIMS : CACHE);

async function networkFirst(req){
  const c = await cacheFor(req.url);
  try {
    // 'no-cache' asks GitHub whether the page changed, so updates reach phones straight away
    const res = await fetch(req, {cache: 'no-cache'});
    if (res.ok && res.status === 200) c.put(req, res.clone());
    return res;
  } catch (err) {
    return (await caches.match(req)) || (await caches.match(req, {ignoreSearch: true})) ||
      (req.mode === 'navigate' ? (await caches.match('index.html')) : undefined) || Response.error();
  }
}

// Serve a byte range from a saved full file (needed for audio on iPhone/Safari)
async function rangeFrom(res, range){
  const buf = await res.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range || '');
  let start = m && m[1] ? +m[1] : 0, end = m && m[2] ? +m[2] : size - 1;
  if (m && !m[1] && m[2]) { start = size - +m[2]; end = size - 1; }
  end = Math.min(end, size - 1);
  if (start >= size || start > end) return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${size}`}});
  return new Response(buf.slice(start, end + 1), {status: 206, headers: {
    'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
    'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes'}});
}

async function mediaFirst(req, url){
  const key = url.href.split('#')[0];
  const c = await cacheFor(key);
  let cached = await caches.match(key);
  const refresh = fetch(key).then(res => { if (res.ok && res.status === 200) { c.put(key, res.clone()); } return res; }).catch(() => null);
  if (!cached) {
    const res = await refresh;
    if (!res) return Response.error();
    cached = res.status === 200 ? res.clone() : res;
    if (!req.headers.get('range') || res.status !== 200) return res;
  }
  return req.headers.get('range') ? rangeFrom(cached, req.headers.get('range')) : cached;
}

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== self.location.origin) return;
  const dir = simDir(url.pathname);
  if (dir && (req.mode === 'navigate' || /\.html$/.test(url.pathname))) e.waitUntil(saveSim(dir));
  e.respondWith(isMedia(url.pathname) ? mediaFirst(req, url) : networkFirst(req));
});

// "Save for offline" button on the hub asks the service worker to save a whole simulation
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'save-sim') {
    e.waitUntil(saveSim(e.data.dir).then(r => { if (e.ports[0]) e.ports[0].postMessage(r); }));
  }
});
