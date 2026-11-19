// Pulls narration text and quiz questions out of each sim page (used to build transcripts and worksheets).
import fs from 'fs';
function grabArray(src, name){
  const re = new RegExp('const\\s+' + name + '\\s*=\\s*\\[');
  const m = re.exec(src); if(!m) return null;
  let i = m.index + m[0].length - 1, depth = 0, inStr = null;
  for(let j = i; j < src.length; j++){
    const ch = src[j];
    if(inStr){ if(ch === '\\'){ j++; continue; } if(ch === inStr) inStr = null; continue; }
    if(ch === "'" || ch === '"' || ch === '`'){ inStr = ch; continue; }
    if(ch === '[' || ch === '{') depth++;
    else if(ch === ']' || ch === '}'){ depth--; if(depth === 0) return new Function('return ' + src.slice(i, j+1))(); }
  }
  return null;
}
const strip = t => String(t||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const out = {};
let s = fs.readFileSync('sims/cavity-wall/student.html','utf8');
out['cavity-wall'] = { sections:[{title:'Guided tour', items: grabArray(s,'STAGES').map(x=>({h:x.name, t:strip(x.cap)}))}],
  quiz: grabArray(s,'QUIZ').map(q=>({q:q.q, o:q.o})) };
s = fs.readFileSync('sims/disc-brakes/index.html','utf8');
const TOUR = grabArray(s,'TOUR'), STEPS = grabArray(s,'STEPS');
const INFO = new Function('return ' + s.slice(s.indexOf('{', s.search(/const\s+INFO\s*=/)), s.indexOf('\n};', s.search(/const\s+INFO\s*=/))+2))();
out['disc-brakes'] = { sections:[
  {title:'Guided tour', items: TOUR.map(x=>({h:x.title, t:strip(x.text)}))},
  {title:'What happens when you brake', items: STEPS.map(x=>({h:x.name, t:strip(x.say||x.cap)}))},
  {title:'The parts', items: Object.values(INFO).map(i=>({h:i.name, t:strip(i.job)+' What to check: '+strip(i.chk)}))}],
  quiz: grabArray(s,'QUIZ').map(q=>({q:q.q, o:q.opts})) };
s = fs.readFileSync('sims/threadripper-cpu/index.html','utf8');
out['threadripper-cpu'] = { sections:[{title:'Step by step', items: grabArray(s,'STAGES').map(x=>({h:x.name, t:strip(x.cap||x.narr), warn: strip(x.warn||'')}))}],
  quiz: grabArray(s,'QUIZ').map(q=>({q:q.q, o:q.o})) };
s = fs.readFileSync('sims/xray-ct/index.html','utf8');
{ const parts=[]; const re=/reg\('(\w+)',\w+,\{name:'([^']*)',job:'((?:[^'\\]|\\.)*)'(?:,hu:'([^']*)')?\}\)/g; let m;
  while((m=re.exec(s))) parts.push({h:m[2], t:strip(m[3].replace(/\\'/g,"'").replace(/\\u2019/g,'’'))+(m[4]?' Typical CT number: '+m[4]+'.':'')});
  out['xray-ct'] = { sections:[{title:'Guided tour', items: grabArray(s,'STAGES').map(x=>({h:x.name.replace(/^\d+ · /,''), t:strip(x.cap)}))},
    {title:'The parts', items: parts}],
    quiz: [{q:'Match the image to the tissue: on the CT slice in the simulation, which tissue is at each of points A, B, C and D? (Each answer is used once.)', o:['Air-filled lung (about −700 HU)','Fat (about −100 HU)','Soft tissue / blood (about +40 HU)','Bone (+400 HU or more)']}]
      .concat(grabArray(s,'QS').map(q=>({q:q.q, o:q.o}))) }; }
s = fs.readFileSync('sims/gamma-pet/index.html','utf8');
{ const parts=[]; const re=/reg\('(\w+)',\w+,\{name:'([^']*)',job:'((?:[^'\\]|\\.)*)'\}\)/g; let m;
  while((m=re.exec(s))) parts.push({h:m[2], t:strip(m[3].replace(/\\'/g,"'"))});
  out['gamma-pet'] = { sections:[{title:'Guided tour', items: grabArray(s,'STAGES').map(x=>({h:x.name.replace(/^\d+ · /,''), t:strip(x.cap)}))},
    {title:'The parts', items: parts}], quiz: grabArray(s,'QS').map(q=>({q:q.q, o:q.o})) }; }
s = fs.readFileSync('sims/heart/student.html','utf8');
{ const P = new Function('return ' + s.slice(s.indexOf('{', s.search(/const\s+PARTS\s*=/)), s.indexOf('\n};', s.search(/const\s+PARTS\s*=/))+2))();
  out['heart'] = { sections:[{title:'Guided tour', items: grabArray(s,'STAGES').map(x=>({h:x.name, t:strip(x.text)}))},
    {title:'The parts', items: Object.values(P).map(p=>({h:p.name, t:strip(p.job)}))}],
    quiz: grabArray(s,'QUIZ').map(q=>({q:q.q, o:q.o})) }; }
for (const [id, file] of [['bonds-stretcher','sims/bonds-stretcher/student.html'],['bonds-english-flemish','sims/bonds-english-flemish/student.html']]) {
  const src = fs.readFileSync(file,'utf8');
  const a = src.indexOf('{', src.search(/const\s+PARTS\s*=/)), b = src.indexOf('\n}};', a) + 3;
  const PARTS = new Function('return ' + src.slice(a, b))();
  const part = +src.match(/const PART = (\d)/)[1], P = PARTS[part];
  out[id] = { sections:[{title:'Guided tour', items: P.stages.map(x=>({h:x.name, t:strip(x.cap)}))},
    {title:'Common mix-ups', items: P.misc.map(([w,r])=>({h:'Mix-up: '+w, t:'Right idea: '+r}))}],
    quiz: P.quiz.map(q=>({q:q.q, o:q.o})) };
}
{ const src = fs.readFileSync('sims/suspended-floors/student.html','utf8');
  const a = src.indexOf('{', src.search(/const\s+PART_INFO\s*=/)), b = src.indexOf('\n};', a) + 2;
  const PI = new Function('return ' + src.slice(a, b))();
  const faults = []; const re = /\{id:'f\d', name:'([^']*)', pos:\[[^\]]*\], text:'((?:[^'\\]|\\.)*)'\}/g; let m;
  while((m = re.exec(src))) faults.push({h:m[1], t:strip(m[2].replace(/\\'/g,"'"))});
  out['suspended-floors'] = { sections:[
    {title:'Guided tour', items: grabArray(src,'STAGES').map(x=>({h:x.name, t:strip(x.cap)+(x.more?' '+strip(x.more):'')}))},
    {title:'The parts', items: Object.values(PI).map(p=>({h:p.label, t:strip(p.job)}))},
    {title:'Spot the faults', items: faults}],
    quiz: grabArray(src,'QUIZ').map(q=>({q:q.q, o:q.o})) }; }
fs.writeFileSync('tools/sim-text.json', JSON.stringify(out,null,1));
for(const [k,v] of Object.entries(out)) console.log(k, v.sections.map(x=>x.title+':'+x.items.length).join(', '), 'quiz:'+v.quiz.length);
