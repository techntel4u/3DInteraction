// Shared helpers for the simulation hub. Data lives in data/catalog.json.
export async function loadCatalog(){
  const r = await fetch('data/catalog.json?v=9', {cache:'no-cache'});
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
    ? `<span>👩‍🏫 Teacher mode · ${esc(s.email)}</span> <button type="button" class="linkbtn" id="staffOut">Sign out</button>`
    : `<button type="button" class="linkbtn" id="staffIn">Staff sign in</button>`;
  wrap.prepend(bar);
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
export function wireShare(root=document){
  root.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copy(b.dataset.copy));
  root.querySelectorAll('[data-qr]').forEach(b => b.onclick = () => showQR(b.dataset.qr, b.dataset.title));
}
export function simCard(s, cat){
  const url = abs(s.student);
  const courseNames = s.courses.map(id => cat.courses.find(c => c.id===id)).filter(Boolean)
    .map(c => `<a href="area.html?id=${c.areaId}&course=${c.id}">${esc(c.name)}</a>`).join(' · ');
  return `<article class="sim">
    <img src="${esc(s.thumb)}" alt="Screenshot of the ${esc(s.title)} simulation" loading="lazy">
    <div>
      <h3>${esc(s.title)}</h3>
      <div>${s.tags.map(t=>`<span class="pill">${esc(t)}</span>`).join('')}<span class="pill y">${esc(s.level)}</span></div>
      <p>${esc(s.summary)}</p>
      <p class="note">${esc(s.spec)} · ${esc(s.minutes)} · Narration: ${esc(s.narration)}${courseNames?`<br>Used on: ${courseNames}`:''}</p>
      <div class="btns">
        <a class="btn primary" href="${esc(s.student)}">▶ Open simulation</a>
        ${shareButtons(url, s.classroomTitle||s.title, s.instructions||'')}
        ${s.teacher&&staff()?`<a class="btn" href="${esc(s.teacher)}" title="Includes model answers and the quiz answer key">📋 Teacher version</a>`:''}
      </div>
    </div>
  </article>`;
}

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
