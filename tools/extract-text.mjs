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
s = fs.readFileSync('sims/blood-vessels/student.html','utf8');
{ const a = s.indexOf('{', s.search(/const\s+PARTS\s*=/)), b = s.indexOf('\n};', a) + 2;
  const P = new Function('const Y0=-12.5, Y1=12.5; return ' + s.slice(a, b))();
  out['blood-vessels'] = { sections:[{title:'Guided tour', items: grabArray(s,'STAGES').map(x=>({h:x.name, t:strip(x.text)}))},
    {title:'The parts', items: Object.values(P).map(p=>({h:p.name, t:strip(p.job)}))},
    {title:'Common mix-ups', items: grabArray(s,'MISCON').map(([w,r])=>({h:'Mix-up: '+w, t:'Right idea: '+r}))}],
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
{ const src = fs.readFileSync('sims/esol-at-the-doctors/student.html','utf8');
  const dlg = src.slice(src.indexOf('/* ---------- Dialogue'), src.indexOf('</script>', src.indexOf('/* ---------- Dialogue')));
  const {QS, CLOSE: close} = new Function(dlg + '\nreturn {QS, CLOSE};')();
  out['esol-at-the-doctors'] = { sections:[
    {title:'The conversation', items: QS.map(q=>({h:'Dr Shah: '+q.doc, t:'Your notes: '+q.notes.join(' ')+' A good answer: '+q.model+(q.alt?' Or: '+q.alt:'')}))},
    {title:"Dr Shah's advice", items:[{h:'At the end', t:close}]}],
    quiz: [
      {q:'Which sentence is correct?', o:["I have it since Monday.","I've had it since Monday."]},
      {q:'Which sentence is correct?', o:["I've had it for four days.","I've had it since four days."]},
      {q:'Which sentence is correct?', o:["I have lifted some boxes on Monday.","I lifted some boxes on Monday."]},
      {q:'Which sentence is correct?', o:["I took some ibuprofen last night.","I have taken some ibuprofen last night."]},
      {q:'Which sentence is correct?', o:["No, I never had back pain before.","No, I've never had back pain before."]},
      {q:'You still work at the warehouse. Which sentence is correct?', o:["I worked there for two years.","I've worked there for two years."]}] }; }
{ const src = fs.readFileSync('sims/esol-shoe-shop-listen/student.html','utf8');
  const dlg = src.slice(src.indexOf('/* ---------- Dialogue'), src.indexOf('</script>', src.indexOf('/* ---------- Dialogue')));
  const {SETS, OPENING, CLOSE: close, QTARGET} = new Function(dlg + '\nreturn {SETS, OPENING, CLOSE, QTARGET};')();
  out['esol-shoe-shop-listen'] = { sections:[
    {title:'Before you start', items:[{h:'Jenny', t:OPENING}, {h:'Your clue', t:'"You might want to write this down." This means: write down what I say next. It is important.'}]},
    ...Object.entries(SETS).map(([k,items])=>({title:'Information: set '+k, items: items.map(it=>({h:it.fields.map(f=>f.label).join(' and '), t:'Jenny says: '+it.show+' Write: '+it.fields.map(f=>f.ans).join(', ')}))})),
    {title:'Ways to ask Jenny', items: Object.values(QTARGET).map(q=>({h:q.model, t:q.focus}))},
    {title:'Listening tips', items:[{h:'"oh" in a number', t:'Write 0 (zero).'},{h:'"double five"', t:'Write 55.'},{h:'"at" and "dot" in an email', t:'Write @ and a full stop: shoes@brookesstores.co.uk'},{h:'"slash" in a website', t:'Write /'}]},
    {title:'At the end', items:[{h:'Jenny', t:close}]}],
    quiz: [
      {q:'Which question is correct?', o:['You can spell that?','Can you spell that, please?']},
      {q:'Which question is correct?', o:['How you spell it?','How do you spell that?']},
      {q:'Which question is correct?', o:['Can you say that again slowly, please?','Can you say it slow?']},
      {q:'Which question is correct?', o:['Can you repeat that, please?','Can you repeat me?']},
      {q:'Which is more polite?', o:['What?','Sorry, can you say that again, please?']},
      {q:'Jenny says "oh one six three two". What do you write?', o:['O1632','01632']}] }; }
fs.writeFileSync('tools/sim-text.json', JSON.stringify(out,null,1));
for(const [k,v] of Object.entries(out)) console.log(k, v.sections.map(x=>x.title+':'+x.items.length).join(', '), 'quiz:'+v.quiz.length);
