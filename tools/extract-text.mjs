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
fs.writeFileSync('tools/sim-text.json', JSON.stringify(out,null,1));
for(const [k,v] of Object.entries(out)) console.log(k, v.sections.map(x=>x.title+':'+x.items.length).join(', '), 'quiz:'+v.quiz.length);
