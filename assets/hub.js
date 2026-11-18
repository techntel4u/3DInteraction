// Shared helpers for the simulation hub. Data lives in data/catalog.json.
export async function loadCatalog(){
  const r = await fetch('data/catalog.json?v=22', {cache:'no-cache'});
  return r.json();
}
/* ---------- Staff sign-in (Google, college staff accounts only) ----------
   Students never sign in and only see "Open simulation". Staff sign in with their
   @wolvcoll.ac.uk Google account to see the sharing tools and teacher versions.
   The Google sign-in script is only loaded when someone presses "Staff sign in". */
const CLIENT_ID = '435550109047-sse2gb0less85l7t5clnq3i38aego42m.apps.googleusercontent.com';
const STAFF_KEY = 'hub.staff', STAFF_DAYS = 30;
const STAFF_RE = /@wolvcoll\.ac\.uk$/i, STUDENT_RE = /@students\.wolvcoll\.ac\.uk$/i;
export function staff(){
  try { const s = JSON.parse(localStorage.getItem(STAFF_KEY)); if (s && s.exp > Date.now() && STAFF_RE.test(s.email)) return s; } catch(e){}
  return null;
}
export function initStaff(){
  const s = staff();
  document.body.classList.toggle('staff', !!s);
  const wrap = document.querySelector('header.top .wrap'); if (!wrap) return;
  const bar = document.createElement('div'); bar.className = 'staffbar';
  bar.innerHTML = s
    ? `<a class="linkbtn" href="${requestLink()}" target="_blank" rel="noopener">📝 Request a simulation</a><span>👩‍🏫 Teacher mode · ${esc(s.email)}</span> <button type="button" class="linkbtn" id="staffOut">Sign out</button>`
    : `<button type="button" class="linkbtn" id="staffIn">Staff sign in</button>`;
  wrap.prepend(bar);
  initInstall(bar);
  const out = bar.querySelector('#staffOut'), inn = bar.querySelector('#staffIn');
  if (out) out.onclick = () => { try{ localStorage.removeItem(STAFF_KEY); window.google?.accounts?.id?.disableAutoSelect(); }catch(e){} location.reload(); };
  if (inn) inn.onclick = openSignIn;
}
function loadGsi(){
  return new Promise((ok, bad) => {
    if (window.google?.accounts?.id) return ok();
    const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
    sc.onload = () => ok(); sc.onerror = () => bad(new Error('Google sign-in could not load')); document.head.appendChild(sc);
  });
}
function decodeJwt(t){
  const b = t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
  return JSON.parse(decodeURIComponent(atob(b).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
}
async function openSignIn(){
  let d = document.getElementById('staffDlg');
  if (!d){ d = document.createElement('dialog'); d.id = 'staffDlg'; document.body.appendChild(d); }
  d.innerHTML = `<h3 style="margin:0 0 6px">Staff sign in</h3>
    <p class="note" style="margin:0 0 12px">Sign in with your college staff Google account (…@wolvcoll.ac.uk) to see the sharing tools and teacher versions.</p>
    <div id="gbtn" style="min-height:44px">Loading…</div><p id="staffMsg" class="note" role="status" style="margin:10px 0 0"></p>
    <button class="btn" id="staffClose" style="margin-top:12px">Close</button>`;
  d.querySelector('#staffClose').onclick = () => d.close();
  d.showModal();
  const msg = d.querySelector('#staffMsg'), gb = d.querySelector('#gbtn');
  try { await loadGsi(); } catch(e){ gb.textContent = ''; msg.textContent = 'Google sign-in could not load. Check your connection and try again.'; return; }
  window.google.accounts.id.initialize({ client_id: CLIENT_ID, hd: 'wolvcoll.ac.uk', ux_mode: 'popup', callback: r => {
    let p; try { p = decodeJwt(r.credential); } catch(e){ msg.textContent = 'Sign-in failed. Please try again.'; return; }
    const email = String(p.email || '');
    if (p.email_verified && STAFF_RE.test(email)) {
      localStorage.setItem(STAFF_KEY, JSON.stringify({ email, exp: Date.now() + STAFF_DAYS*864e5 }));
      location.reload();
    } else if (STUDENT_RE.test(email)) {
      msg.textContent = 'This is a student account. The sharing tools are for staff only – you can still open every simulation.';
    } else {
      msg.textContent = 'Please sign in with your college staff account (…@wolvcoll.ac.uk).';
    }
  }});
  gb.textContent = '';
  window.google.accounts.id.renderButton(gb, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill' });
}

export const qs = k => new URLSearchParams(location.search).get(k);
export const abs = rel => new URL(rel, location.href).href;
export const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const classroomUrl = (url, title='', body='') => 'https://classroom.google.com/share?url=' + encodeURIComponent(url)
  + (title ? '&title=' + encodeURIComponent(title) : '') + (body ? '&body=' + encodeURIComponent(body) : '');

export function toast(msg){
  let t = document.querySelector('.toast');
  if(!t){ t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role','status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove('on'), 2200);
}
export async function copy(url){
  try { await navigator.clipboard.writeText(url); toast('Link copied'); }
  catch(e){ const i=document.createElement('input'); i.value=url; document.body.appendChild(i); i.select(); try{document.execCommand('copy'); toast('Link copied');}catch(_){ prompt('Copy this link:', url); } i.remove(); }
}
export function showQR(url, title){
  let d = document.getElementById('qrDlg');
  if(!d){ d = document.createElement('dialog'); d.id='qrDlg'; document.body.appendChild(d); }
  const q = window.qrcode(0, 'M'); q.addData(url); q.make();
  d.innerHTML = `<h3 style="margin:0 0 6px">${esc(title)}</h3><div>${q.createSvgTag({cellSize:6, margin:2, scalable:true})}</div>
    <p class="note" style="word-break:break-all">${esc(url)}</p><button class="btn primary" autofocus>Close</button>`;
  d.querySelector('button').onclick = () => d.close();
  d.showModal();
}
// share buttons: copy link, Google Classroom, QR
// The Classroom link opens in a new tab with the title and instructions filled in.
export function shareButtons(url, title, body=''){
  if (!staff()) return '';
  return `<button class="btn" data-copy="${esc(url)}">🔗 Copy link</button>
  <a class="btn gc" href="${esc(classroomUrl(url, title, body))}" target="_blank" rel="noopener">🎓 Share to Google Classroom</a>
  <button class="btn" data-qr="${esc(url)}" data-title="${esc(title)}">▦ QR code</button>`;
}
// "Save for offline": shows ✓ when every file of a simulation is saved on this device
const simDirOf = rel => { const p = new URL(rel, location.href).pathname; return p.slice(0, p.lastIndexOf('/') + 1); };
async function offlineState(dir){
  try {
    const r = (await caches.match(dir + 'offline.json')) || (await fetch(dir + 'offline.json')); if (!r.ok) return null;
    const list = await r.clone().json(); let have = 0;
    for (const f of list.files) if (await caches.match(location.origin + dir + f)) have++;
    return {total: list.files.length, have};
  } catch(e){ return null; }
}
function wireOffline(root){
  if (!('serviceWorker' in navigator) || !window.caches) return;
  root.querySelectorAll('[data-offline]').forEach(async b => {
    const dir = simDirOf(b.dataset.offline);
    const done = () => { b.textContent = '✓ Saved for offline'; b.classList.add('saved'); b.disabled = true; b.title = 'This simulation works on this device without internet'; };
    const st = await offlineState(dir); b.hidden = false;
    if (st && st.total && st.have >= st.total) return done();
    b.onclick = async () => {
      b.disabled = true; b.textContent = 'Saving…';
      try {
        const reg = await navigator.serviceWorker.ready;
        const res = await new Promise((ok, bad) => { const ch = new MessageChannel(); ch.port1.onmessage = e => ok(e.data);
          (reg.active || navigator.serviceWorker.controller).postMessage({type: 'save-sim', dir}, [ch.port2]); setTimeout(() => bad(new Error('timeout')), 120000); });
        if (res && res.total && res.saved >= res.total) { done(); toast('Saved – it will work without internet'); }
        else { b.disabled = false; b.textContent = '⬇ Save for offline'; toast('Could not save everything – check your connection and try again'); }
      } catch(e){ b.disabled = false; b.textContent = '⬇ Save for offline'; toast('Saving needs an internet connection – try again'); }
    };
  });
}
// Teacher mode: usage numbers per simulation from GoatCounter's public counter
// (needs "Allow adding visitor counts on your website" switched on in GoatCounter settings).
export const STATS_SITE = 'wolvcoll-3dsims';
export const STATS_DASH = 'https://' + STATS_SITE + '.goatcounter.com';
async function gcCount(path){
  const key = 'gc:' + path, now = Date.now();
  try { const c = JSON.parse(sessionStorage.getItem(key)); if (c && now - c.t < 10*60e3) return c.n; } catch(e){}
  const r = await fetch(STATS_DASH + '/counter/' + encodeURIComponent(path) + '.json', {cache: 'no-store'});
  let n;
  if (r.status === 404) n = 0;
  else if (!r.ok) throw new Error('counter ' + r.status);
  else { const j = await r.json(); n = parseInt(String(j.count ?? 0).replace(/[^0-9]/g, ''), 10) || 0; }
  try { sessionStorage.setItem(key, JSON.stringify({t: now, n})); } catch(e){}
  return n;
}
function wireUsage(root){
  if (!staff()) return;
  root.querySelectorAll('[data-usage]').forEach(async el => {
    if (el.dataset.done) return; el.dataset.done = 1;
    const id = el.dataset.usage, ev = n => 'sim/' + id + '/' + n;
    const rows = [['Opened', '/sim/' + id], ['Narration started', ev('narration-started')], ['Finished tour', ev('tour-complete')], ['Quiz completed', ev('quiz-complete')]];
    if (id === 'cavity-wall') rows.push(['Found all faults', ev('faults-complete')]);
    if (id === 'disc-brakes') rows.push(['Fault challenge', ev('challenge-complete')]);
    try {
      const nums = await Promise.all(rows.map(r => gcCount(r[1])));
      el.innerHTML = `<b>📊 Student use (all time)</b><span class="uv">${rows.map((r,i) => `<span><b>${nums[i].toLocaleString('en-GB')}</b> ${esc(r[0].toLowerCase())}</span>`).join('')}</span>
        <a href="${STATS_DASH}/?filter=${encodeURIComponent(id)}" target="_blank" rel="noopener">Full stats ↗</a>`;
    } catch(e){
      el.innerHTML = `📊 Usage numbers aren't available yet. In GoatCounter, switch on <i>Settings → Allow adding visitor counts on your website</i>. <a href="${STATS_DASH}" target="_blank" rel="noopener">Open GoatCounter ↗</a>`;
    }
  });
}
export function wireShare(root=document){
  wireOffline(root);
  wireUsage(root);
  root.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copy(b.dataset.copy));
  root.querySelectorAll('[data-qr]').forEach(b => b.onclick = () => showQR(b.dataset.qr, b.dataset.title));
}
// "New" lasts 21 days from a simulation's added date; the home page shows at most NEW_MAX cards,
// and several new parts of one series share a single card.
export const NEW_DAYS = 21, NEW_MAX = 6;
export const isNew = s => s.added && (Date.now() - new Date(s.added).getTime()) < NEW_DAYS*864e5;
/* ---------- Series: experiences made of several simulations, shown together in order ---------- */
export const seriesOf = (cat, s) => (cat.series || []).find(x => x.id === s.series) || null;
export function partPill(cat, s){ const sr = seriesOf(cat, s); return sr ? `<span class="pill ser" title="${esc(sr.title)} series">📚 Part ${s.part} of ${sr.parts.length}</span>` : ''; }
export const seriesLink = (sr, areaId) => abs('area.html?id=' + (areaId || sr.areas[0]) + '&series=' + sr.id);
export const seriesInArea = (cat, areaId) => (cat.series || []).filter(sr => sr.areas.includes(areaId) && sr.parts.some(p => cat.sims.some(s => s.id === p.sim)));
// Which simulations this device has opened (for ✓ ticks and "Continue with Part n"). Stays on this device only.
const OPENED_KEY = 'hub.opened';
export function opened(){ try { return new Set(JSON.parse(localStorage.getItem(OPENED_KEY)) || []); } catch(e){ return new Set(); } }
function markOpened(id){ try { const o = opened(); o.add(id); localStorage.setItem(OPENED_KEY, JSON.stringify([...o])); } catch(e){} }
const minsOf = sims => { let lo = 0, hi = 0; sims.forEach(s => { const m = String(s.minutes||'').match(/(\d+)\D+(\d+)/) || String(s.minutes||'').match(/(\d+)/); if (m){ lo += +m[1]; hi += +(m[2]||m[1]); } }); return lo ? (lo === hi ? lo : lo + '–' + hi) + ' min' : ''; };
// A series panel: compact by default (title, numbered parts you can open directly, start/continue button);
// "Show all parts" expands the full cards with transcripts, offline saving and the staff tools.
export function seriesBlock(sr, cat, visible, areaId, expanded=false){
  const op = opened();
  const parts = sr.parts.map(p => ({...p, s: cat.sims.find(x => x.id === p.sim) || null}));
  const live = parts.filter(p => p.s), shown = parts.filter(p => !p.s || visible.includes(p.s));
  const next = live.find(p => !op.has(p.sim)) || live[0];
  const started = live.some(p => op.has(p.sim));
  const levels = [...new Set(live.map(p => p.s.level))].join(', ');
  const mins = minsOf(live.map(p => p.s));
  const anyNew = live.some(p => isNew(p.s));
  return `<section class="series${expanded ? ' open' : ''}" id="series-${esc(sr.id)}" aria-labelledby="sh-${esc(sr.id)}">
    <div class="series-head">
      <div class="series-tag">📚 Series · ${parts.length} parts${anyNew ? ' <span class="pill new">New</span>' : ''}</div>
      <h3 id="sh-${esc(sr.id)}">${esc(sr.title)}</h3>
      <p class="series-sum">${esc(sr.summary || '')}</p>
      <p class="note">${[levels, live.length + ' of ' + parts.length + ' parts available', mins ? 'about ' + mins : '', sr.spec].filter(Boolean).map(esc).join(' · ')}</p>
      <ol class="steps" aria-label="Parts in ${esc(sr.title)}">${parts.map(p => p.s
        ? `<li class="live${op.has(p.sim) ? ' done' : ''}"><a href="${esc(p.s.student)}" data-open-id="${esc(p.sim)}" title="Open Part ${p.n}: ${esc(p.title)}"><b>${op.has(p.sim) ? '✓' : p.n}</b><span>${esc(p.title)}<small>${esc(p.s.minutes || '')}${op.has(p.sim) ? ' · opened' : ''}</small></span></a></li>`
        : `<li class="soon"><b>${p.n}</b><span>${esc(p.title)}<small>Coming soon</small></span></li>`).join('')}</ol>
      <div class="btns">${next ? `<a class="btn primary" href="${esc(next.s.student)}" data-open-id="${esc(next.sim)}">▶ ${started ? 'Continue with' : 'Start with'} Part ${next.n}</a>` : ''}
        <button type="button" class="btn" data-toggle-series="${esc(sr.id)}" aria-expanded="${expanded}" aria-controls="sp-${esc(sr.id)}">${expanded ? 'Hide details ▴' : 'Show all parts ▾'}</button>
        ${shareButtons(seriesLink(sr, areaId), sr.title + ' – 3D simulation series', 'Work through the parts of this series in order, starting with Part 1. Use headphones and keep the sound on.')}</div>
    </div>
    <div class="series-parts" id="sp-${esc(sr.id)}" ${expanded ? '' : 'hidden'}>${shown.map(p => p.s ? simCard(p.s, cat)
      : `<div class="soon-card"><span class="num">${p.n}</span><span><b>Part ${p.n}: ${esc(p.title)}</b><small>Coming soon – this part is being built.</small></span></div>`).join('')}</div>
  </section>`;
}
export function wireSeries(root=document){
  root.querySelectorAll('[data-toggle-series]').forEach(b => b.onclick = () => {
    const sec = b.closest('.series'), box = sec.querySelector('.series-parts'), open = box.hidden;
    box.hidden = !open; sec.classList.toggle('open', open); b.setAttribute('aria-expanded', open); b.textContent = open ? 'Hide details ▴' : 'Show all parts ▾';
    if (open) wireShare(box);
  });
}
export function simCard(s, cat, compact=false){
  const url = abs(s.student);
  const courseNames = s.courses.map(id => cat.courses.find(c => c.id===id)).filter(Boolean)
    .map(c => `<a href="area.html?id=${c.areaId}&course=${c.id}">${esc(c.name)}</a>`).join(' · ');
  const sr = seriesOf(cat, s);
  const more = `<p class="note">${esc(s.spec)} · ${esc(s.minutes)} · Narration: ${esc(s.narration)}${courseNames?`<br>Used on: ${courseNames}`:''}</p>
      <div class="btns">
        <a class="btn primary" href="${esc(s.student)}" data-open-id="${esc(s.id)}">▶ Open simulation</a>
        <button class="btn offl" data-offline="${esc(s.student)}" hidden>⬇ Save for offline</button>
        ${s.transcript?`<a class="btn" href="${esc(s.transcript)}" title="Everything the narrator says, as text">📄 Transcript</a>`:''}
        ${shareButtons(url, s.classroomTitle||s.title, s.instructions||'')}
        ${s.worksheet&&staff()?`<a class="btn" href="${esc(s.worksheet)}" title="Printable worksheet with tasks and quiz questions">🖨 Worksheet</a>`:''}
        ${s.teacher&&staff()?`<a class="btn" href="${esc(s.teacher)}" title="Includes model answers and the quiz answer key">📋 Teacher version</a>`:''}
      </div>
      ${staff()?`<div class="usage" data-usage="${esc(s.id)}" role="status">📊 Usage: loading…</div>`:''}`;
  const pills = `<div>${s.tags.map(t=>`<span class="pill">${esc(t)}</span>`).join('')}<span class="pill y">${esc(s.level)}</span>${isNew(s)?'<span class="pill new">New</span>':''}</div>
      ${sr?`<div>${partPill(cat,s)}<span class="note">${esc(sr.title)} series</span></div>`:''}`;
  if (compact) return `<article class="sim tile" id="part-${esc(s.id)}">
    <img src="${esc(s.thumb)}" alt="Screenshot of the ${esc(s.title)} simulation" loading="lazy">
    <div class="tile-body">
      <h3>${esc(s.title)}</h3>
      <div><span class="pill y">${esc(s.level)}</span><span class="pill">${esc(s.minutes)}</span>${isNew(s)?'<span class="pill new">New</span>':''}</div>
      <p class="clamp">${esc(s.summary)}</p>
      <div class="btns"><a class="btn primary" href="${esc(s.student)}" data-open-id="${esc(s.id)}">▶ Open</a></div>
      <details class="more"><summary>More: transcript, offline${staff()?', sharing':''}</summary>${pills}<p>${esc(s.summary)}</p>${more}</details>
    </div>
  </article>`;
  return `<article class="sim" id="part-${esc(s.id)}">
    <img src="${esc(s.thumb)}" alt="Screenshot of the ${esc(s.title)} simulation" loading="lazy">
    <div>
      <h3>${esc(s.title)}</h3>
      ${pills}
      <p>${esc(s.summary)}</p>
      ${more}
    </div>
  </article>`;
}
// remember which simulations were opened on this device
addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-open-id]'); if (a) markOpened(a.dataset.openId); }, true);

// Stats strip shown on the home page and area pages
const LEVELS = ['Entry Level 1','Entry Level 2','Entry Level 3','Level 1','Level 2','Level 3','Level 4','Level 5','Level 6','Level 7'];
export function statsHtml(sims, extra=[]){
  if(!sims.length) return '';
  let lo = 0, hi = 0;
  sims.forEach(s => { const m = String(s.minutes||'').match(/(\d+)\D+(\d+)/) || String(s.minutes||'').match(/(\d+)/); if(m){ lo += +m[1]; hi += +(m[2]||m[1]); } });
  const lv = [...new Set(sims.map(s => s.level))].sort((x,y) => LEVELS.indexOf(x) - LEVELS.indexOf(y));
  const narrated = sims.filter(s => s.narration).length;
  const upd = sims.map(s => s.updated).filter(Boolean).sort().pop();
  const items = [
    [sims.length, sims.length > 1 ? 'simulations' : 'simulation'],
    ...extra,
    [lo ? (lo === hi ? lo : lo + '–' + hi) + ' min' : '', sims.length > 1 ? 'in total' : 'to complete'],
    [lv.length > 1 ? lv[0] + ' to ' + lv[lv.length-1] : lv[0], lv.length > 1 ? 'levels' : 'level'],
    [narrated === sims.length ? 'All' : narrated + ' of ' + sims.length, 'narrated'],
    [upd ? new Date(upd).toLocaleDateString('en-GB', {month:'short', year:'numeric'}) : '', 'last updated'],
  ].filter(x => x[0] !== '' && x[0] !== undefined);
  return items.map(([v,l]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('');
}

// Compact card for the "New" row on the home page
export function miniCard(s, cat){
  const a = cat.areas.find(x => s.areas.includes(x.id));
  return `<a class="mini" href="${esc(s.student)}"><img src="${esc(s.thumb)}" alt="" loading="lazy">
    <span><b>${esc(s.title)}</b><small>${a?esc(a.icon+' '+a.name)+' · ':''}${esc(s.level)}${seriesOf(cat,s)?' · Part '+s.part+' of '+seriesOf(cat,s).parts.length:''}</small><span class="pill new">New</span></span></a>`;
}
// The home page "New" row: newest first, one card per series, at most NEW_MAX cards
export function newRow(cat){
  const fresh = cat.sims.filter(isNew).sort((a,b) => String(b.added).localeCompare(String(a.added)));
  const seen = new Set(), items = [];
  for (const s of fresh){
    const sr = seriesOf(cat, s);
    if (!sr){ items.push(miniCard(s, cat)); continue; }
    if (seen.has(sr.id)) continue; seen.add(sr.id);
    const parts = fresh.filter(x => x.series === sr.id).map(x => x.part).sort((a,b) => a-b);
    if (parts.length === 1){ items.push(miniCard(s, cat)); continue; }
    const a = cat.areas.find(x => sr.areas.includes(x.id));
    const label = parts.length === 2 ? parts.join(' and ') : parts.slice(0,-1).join(', ') + ' and ' + parts[parts.length-1];
    items.push(`<a class="mini" href="area.html?id=${esc(sr.areas[0])}&series=${esc(sr.id)}"><img src="${esc(s.thumb)}" alt="" loading="lazy">
      <span><b>${esc(sr.title)}</b><small>${a?esc(a.icon+' '+a.name)+' · ':''}Series · Parts ${label} of ${sr.parts.length} are new</small><span class="pill new">New</span></span></a>`);
  }
  return items.slice(0, NEW_MAX).join('');
}
// Staff-only "Request a simulation": opens the Microsoft Form in a new tab
export const REQUEST_FORM = 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=MGiE95mlWECLAJ2oTSWGmuO6R6IeSGFPiHGI99lOOwhUOUtJQTBXSjVFSVRDUURWT0VaWEY0UVZTVSQlQCN0PWcu';
export function requestLink(){ return REQUEST_FORM; }

// "Install app": uses the browser's own install prompt where it exists (Chrome/Edge on computers and Android);
// on iPhone/iPad and other phone browsers it shows the taps needed to add the hub to the home screen.
let installEvt = null;
addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); installEvt = ev; document.getElementById('installBtn')?.removeAttribute('hidden'); });
function initInstall(bar){
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) return;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const phone = ios || /Android|Mobile/i.test(ua);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'linkbtn'; b.id = 'installBtn'; b.textContent = '📲 Install app';
  if (!phone && !installEvt) b.hidden = true;   // computers: only when the browser can install
  b.onclick = async () => {
    if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch(e){} installEvt = null; return; }
    showInstallHelp(ios, ua);
  };
  bar.prepend(b);
}
function showInstallHelp(ios, ua){
  let d = document.getElementById('installDlg');
  if (!d) { d = document.createElement('dialog'); d.id = 'installDlg'; document.body.appendChild(d); }
  const inApp = /FBAN|FBAV|Instagram|Line\/|GSA\/|wv\)/.test(ua);
  const steps = inApp
    ? ['Tap the <b>⋮</b> or <b>…</b> menu and choose <b>Open in browser</b>.', 'Then tap <b>📲 Install app</b> again.']
    : ios
    ? (/CriOS|FxiOS|EdgiOS/.test(ua)
        ? ['Tap the <b>Share</b> button <span aria-hidden="true">(⬆)</span> in the address bar.', 'Choose <b>Add to Home Screen</b>.', 'Tap <b>Add</b>.']
        : ['Tap the <b>Share</b> button <span aria-hidden="true">(⬆)</span> at the bottom of Safari.', 'Scroll down and choose <b>Add to Home Screen</b>.', 'Tap <b>Add</b>.'])
    : /SamsungBrowser/.test(ua)
    ? ['Tap the <b>☰ menu</b> at the bottom right.', 'Choose <b>Add page to</b> → <b>Home screen</b>.', 'Tap <b>Add</b>.']
    : /Firefox/.test(ua)
    ? ['Tap the <b>⋮ menu</b>.', 'Choose <b>Install</b> or <b>Add to Home screen</b>.']
    : ['Tap the <b>⋮ menu</b> at the top right.', 'Choose <b>Install app</b> or <b>Add to Home screen</b>.', 'Tap <b>Install</b>.'];
  d.innerHTML = `<h3 style="margin:0 0 6px">Install the hub on this phone</h3>
    <p class="note" style="margin:0 0 10px">You'll get a 3D Sims icon on your home screen. Simulations you save for offline then work without internet.</p>
    <ol style="margin:0 0 14px;padding-left:20px;line-height:1.6">${steps.map(s => `<li>${s}</li>`).join('')}</ol>
    <button class="btn primary" autofocus>Got it</button>`;
  d.querySelector('button').onclick = () => d.close();
  d.showModal();
}
