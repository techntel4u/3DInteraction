// Builds sims/<id>/transcript.html and sims/<id>/worksheet.html from data/catalog.json + tools/sim-text.json.
// Re-run after changing a sim's narration or quiz:  node tools/extract-text.mjs && node tools/build-pages.mjs
import fs from 'fs';
const cat = JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const txt = JSON.parse(fs.readFileSync('tools/sim-text.json','utf8'));
const esc = s => String(s??'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const css = `
:root{--navy:#17305a;--ink:#1d2330;--muted:#4a5466;--line:#d5dbe4}
*{box-sizing:border-box} body{margin:0;font:16px/1.55 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--ink);background:#f3f5f9}
.wrap{max-width:820px;margin:0 auto;padding:20px}
header{background:var(--navy);color:#fff} header .wrap{padding:18px 20px} header a{color:#fff}
h1{margin:6px 0 2px;font-size:clamp(22px,4vw,30px)} h2{color:var(--navy);margin:26px 0 8px;font-size:20px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 18px;margin:10px 0}
.card h3{margin:0 0 4px;font-size:17px;color:var(--navy)} .card p{margin:0}
.warn{margin-top:8px!important;padding:6px 10px;border-left:4px solid #b42318;background:#fdecea;border-radius:6px;font-size:14.5px}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
.btn{display:inline-flex;align-items:center;min-height:44px;padding:8px 14px;border-radius:11px;border:1px solid var(--line);background:#fff;color:var(--navy);font:inherit;font-weight:600;text-decoration:none;cursor:pointer}
.btn.primary{background:var(--navy);color:#fff;border-color:var(--navy)}
.meta{opacity:.9;font-size:14.5px}
.fields{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin:14px 0}
.field{border-bottom:1.5px solid #888;padding-top:18px;font-size:13px;color:var(--muted)}
ol.tasks>li{margin:0 0 14px} .lines{border-bottom:1px solid #aaa;height:30px} .q{break-inside:avoid;margin:0 0 14px}
.q ol{list-style:upper-alpha;margin:6px 0 0} .score{margin-top:20px;font-weight:600}
@media print{body{background:#fff;font-size:12pt}header{background:#fff;color:#000;border-bottom:2px solid #000}header a,.noprint{display:none}.card{border:0;padding:0 0 8px;margin:0 0 6px}.wrap{padding:0 6mm}}
`;
const page = (title, body, sim) => `<!DOCTYPE html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>${css}</style></head><body>
${body}
<script>if('serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js',{scope:'../../'}).catch(function(){});</script>
</body></html>`;
for(const s of cat.sims){
  const t = txt[s.id]; if(!t) continue;
  const dir = 'sims/' + s.id + '/', open = s.student.split('/').pop();
  // Transcript (everyone)
  const tr = t.sections.map(sec => `<h2>${esc(sec.title)}</h2>` + sec.items.map((it,i) =>
    `<div class="card"><h3>${sec.items.length>3 && sec.title!=='The parts' ? (i+1)+'. ' : ''}${esc(it.h)}</h3><p>${esc(it.t)}</p>${it.warn?`<p class="warn"><b>Common mistake:</b> ${esc(it.warn)}</p>`:''}</div>`).join('')).join('');
  fs.writeFileSync(dir+'transcript.html', page(s.title+' – transcript', `
<header><div class="wrap"><a href="../../index.html">← 3D Learning Simulations</a><h1>${esc(s.title)}</h1><div class="meta">Transcript of the narration · ${esc(s.level)}</div></div></header>
<main class="wrap">
  <div class="btns noprint"><a class="btn primary" href="${esc(open)}">▶ Open the simulation</a><button class="btn" onclick="print()">🖨 Print</button></div>
  <p>Everything the narrator says, in order. Use it if you can't use sound, or to revise afterwards.</p>
  ${tr}
</main>`, s));
  // Worksheet (shown to staff on the hub)
  const tasks = String(s.instructions||'').split('\n').filter(l => /^\d+\./.test(l.trim())).map(l => l.trim().replace(/^\d+\.\s*/,''));
  const intro = String(s.instructions||'').split('\n')[0];
  const ws = `
<header><div class="wrap"><a class="noprint" href="../../index.html">← 3D Learning Simulations</a><h1>${esc(s.title)} – worksheet</h1><div class="meta">${esc(s.level)} · ${esc(s.spec)} · ${esc(s.minutes)}</div></div></header>
<main class="wrap">
  <div class="btns noprint"><button class="btn primary" onclick="print()">🖨 Print or save as PDF</button><a class="btn" href="${esc(open)}">▶ Open the simulation</a><a class="btn" href="transcript.html">📄 Transcript</a></div>
  <div class="fields"><div class="field">Name</div><div class="field">Group</div><div class="field">Date</div></div>
  <p>${esc(intro)}</p>
  <h2>Tasks</h2>
  <ol class="tasks">${tasks.map(x => `<li>${esc(x)}<div class="lines"></div><div class="lines"></div></li>`).join('')}</ol>
  <h2>Test yourself</h2>
  <p>Circle one answer for each question, then check your answers in the simulation.</p>
  ${t.quiz.map((q,i) => `<div class="q"><b>${i+1}. ${esc(q.q)}</b><ol>${q.o.map(o=>`<li>${esc(o)}</li>`).join('')}</ol></div>`).join('')}
  <p class="score">Quiz score in the simulation: ______ / ${t.quiz.length}</p>
</main>`;
  fs.writeFileSync(dir+'worksheet.html', page(s.title+' – worksheet', ws, s));
  s.transcript = dir+'transcript.html'; s.worksheet = dir+'worksheet.html';
}
// offline.json: every file a sim needs, saved by the service worker when the sim is first opened
for(const s of cat.sims){
  const dir = 'sims/' + s.id + '/';
  const walk = d => fs.readdirSync(dir + d, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(d + e.name + '/') : [d + e.name]);
  const files = walk('').filter(f => f !== 'offline.json').sort();
  fs.writeFileSync(dir + 'offline.json', JSON.stringify({files}, null, 0));
}
// "added" dates (used for the New badge) – keep any existing value
for(const s of cat.sims) s.added = s.added || s.updated;
fs.writeFileSync('data/catalog.json', JSON.stringify(cat,null,1));
console.log('built', cat.sims.map(s=>s.id).join(', '));
