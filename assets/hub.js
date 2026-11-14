// Shared helpers for the simulation hub. Data lives in data/catalog.json.
export async function loadCatalog(){
  const r = await fetch('data/catalog.json?v=4', {cache:'no-cache'});
  return r.json();
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
    .map(c => `<a href="course.html?id=${c.id}">${esc(c.name)}</a>`).join(' · ');
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
        <a class="btn" href="${esc(s.teacher)}" title="Includes model answers and the quiz answer key">📋 Teacher version</a>
      </div>
    </div>
  </article>`;
}
