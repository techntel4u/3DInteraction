/* On-device speech recognition for browsers without the Web Speech API
   (for example Chrome, Edge and Firefox on iPhone and iPad).
   Whisper tiny.en (OpenAI, MIT licence) exported to ONNX by k2-fsa/sherpa-onnx,
   re-quantised to int8. Runs in the browser with onnxruntime-web (MIT). No audio leaves the device. */
(function(){
  const BASE = new URL('./', document.currentScript.src).href;
  const FILES = {enc: BASE+'encoder.onnx', dec: BASE+'decoder.onnx', tok: BASE+'tokens.txt', mel: BASE+'melfilters.bin'};
  const CACHE = 'esol-stt-v1';
  const SR = 16000, NFFT = 400, HOP = 160, NMEL = 80, NFRAMES = 3000, MAXSEC = 20;
  const SOT = 50257, NO_TS = 50362, EOT = 50256;
  let state = 'idle', loadPromise = null, enc = null, dec = null, tokens = null, melF = null;
  let win = null, cosT = null, sinT = null;

  async function fetchCached(url, onBytes){
    let res = null, cache = null;
    try{ cache = await caches.open(CACHE); res = await cache.match(url); }catch(e){}
    if(res){ const b = await res.arrayBuffer(); onBytes && onBytes(b.byteLength, b.byteLength); return b; }
    const r = await fetch(url); if(!r.ok) throw new Error('fetch '+url+' '+r.status);
    const total = +r.headers.get('content-length') || 0;
    let buf;
    if(r.body && r.body.getReader){
      const rd = r.body.getReader(), parts = []; let got = 0;
      for(;;){ const {done, value} = await rd.read(); if(done) break; parts.push(value); got += value.length; onBytes && onBytes(got, total); }
      buf = new Uint8Array(got); let o = 0; for(const p of parts){ buf.set(p, o); o += p.length; } buf = buf.buffer;
    } else { buf = await r.arrayBuffer(); }
    try{ if(cache) await cache.put(url, new Response(buf.slice(0), {headers:{'content-type':'application/octet-stream'}})); }catch(e){}
    return buf;
  }

  function load(onProgress){
    if(loadPromise) return loadPromise;
    state = 'loading';
    loadPromise = (async () => {
      const sizes = {enc:11.4e6, dec:30.4e6, tok:0.84e6}, got = {enc:0, dec:0, tok:0};
      const tot = sizes.enc + sizes.dec + sizes.tok;
      const prog = k => (n) => { got[k] = n; onProgress && onProgress(Math.min(0.99, (got.enc+got.dec+got.tok)/tot)); };
      const ort = window.ort;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = new URL('../ort/', BASE).href;
      const [eb, db, tb, mb] = await Promise.all([fetchCached(FILES.enc, prog('enc')), fetchCached(FILES.dec, prog('dec')), fetchCached(FILES.tok, prog('tok')), fetchCached(FILES.mel)]);
      melF = new Float32Array(mb);
      tokens = new Map();
      new TextDecoder().decode(tb).split('\n').forEach(l => { const p = l.trim().split(' '); if(p.length === 2){ const s = atob(p[0]); const u = new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); tokens.set(+p[1], u); } });
      const opt = {executionProviders:['wasm'], graphOptimizationLevel:'all'};
      enc = await ort.InferenceSession.create(new Uint8Array(eb), opt);
      dec = await ort.InferenceSession.create(new Uint8Array(db), Object.assign({}, opt, {extra:{session:{disable_quant_qdq:'1'}}}));
      win = new Float32Array(NFFT); for(let i=0;i<NFFT;i++) win[i] = 0.5 - 0.5*Math.cos(2*Math.PI*i/NFFT);
      const nb = NFFT/2+1; cosT = new Float32Array(nb*NFFT); sinT = new Float32Array(nb*NFFT);
      for(let k=0;k<nb;k++) for(let n=0;n<NFFT;n++){ const a = 2*Math.PI*k*n/NFFT; cosT[k*NFFT+n] = Math.cos(a); sinT[k*NFFT+n] = Math.sin(a); }
      state = 'ready'; onProgress && onProgress(1);
      return true;
    })().catch(e => { state = 'error'; loadPromise = null; throw e; });
    return loadPromise;
  }

  /* Whisper log-mel spectrogram, padded to 30 s */
  function logMel(audio){
    const n = Math.min(audio.length, SR*30);
    const padded = new Float32Array(SR*30 + NFFT); // reflect pad 200 at start, zeros after audio
    for(let i=0;i<n;i++) padded[200+i] = audio[i];
    for(let i=1;i<=200;i++) padded[200-i] = audio[Math.min(i, n-1)] || 0;
    const nb = NFFT/2+1, used = Math.min(NFRAMES, Math.ceil(n/HOP)+2);
    const T = Math.min(NFRAMES, Math.max(500, (used+300) & ~1)); // speech plus 3 s of silence is enough
    const out = new Float32Array(NMEL*T), pw = new Float32Array(nb), frame = new Float32Array(NFFT);
    let mx = -Infinity;
    for(let t=0;t<T;t++){
      if(t < used){
        const o = t*HOP; for(let i=0;i<NFFT;i++) frame[i] = padded[o+i]*win[i];
        for(let k=0;k<nb;k++){ let re=0, im=0; const b=k*NFFT; for(let i=0;i<NFFT;i++){ re += frame[i]*cosT[b+i]; im -= frame[i]*sinT[b+i]; } pw[k] = re*re+im*im; }
        for(let m=0;m<NMEL;m++){ let s=0; const b=m*nb; for(let k=0;k<nb;k++) s += melF[b+k]*pw[k]; const v = Math.log10(Math.max(s,1e-10)); out[m*T+t] = v; if(v>mx) mx=v; }
      } else { for(let m=0;m<NMEL;m++) out[m*T+t] = -10; }
    }
    const floor = mx - 8;
    for(let i=0;i<out.length;i++){ const v = Math.max(out[i], floor); out[i] = (v+4)/4; }
    return {data: out, T};
  }

  async function transcribe(audio16k){
    await load();
    const ort = window.ort;
    const mel = logMel(audio16k);
    const eo = await enc.run({mel: new ort.Tensor('float32', mel.data, [1, NMEL, mel.T])});
    const ck = eo.n_layer_cross_k, cv = eo.n_layer_cross_v;
    let sk = new ort.Tensor('float32', new Float32Array(4*448*384), [4,1,448,384]);
    let sv = new ort.Tensor('float32', new Float32Array(4*448*384), [4,1,448,384]);
    let toks = [SOT, NO_TS], off = 0; const out = [];
    for(let step=0; step<60; step++){
      const r = await dec.run({tokens: new ort.Tensor('int64', BigInt64Array.from(toks.map(BigInt)), [1, toks.length]),
        in_n_layer_self_k_cache: sk, in_n_layer_self_v_cache: sv, n_layer_cross_k: ck, n_layer_cross_v: cv,
        offset: new ort.Tensor('int64', BigInt64Array.from([BigInt(off)]), [1])});
      off += toks.length; sk = r.out_n_layer_self_k_cache; sv = r.out_n_layer_self_v_cache;
      const lg = r.logits.data, V = 51864, base = (r.logits.dims[1]-1)*V;
      let best = 0, bv = -Infinity; for(let i=0;i<V;i++){ const v = lg[base+i]; if(v>bv){ bv=v; best=i; } }
      if(best === EOT || best >= 50257) break;
      if(out.length > 3 && out.slice(-3).every(x => x === best)) break; // stop runaway repeats
      out.push(best); toks = [best];
    }
    let total = 0; out.forEach(i => total += (tokens.get(i)||[]).length);
    const bytes = new Uint8Array(total); let o = 0; out.forEach(i => { const t = tokens.get(i); if(t){ bytes.set(t, o); o += t.length; } });
    return new TextDecoder().decode(bytes).replace(/\[[^\]]*\]|\([^)]*\)/g,'').trim();
  }

  /* microphone capture → 16 kHz mono Float32.
     One AudioContext is kept for the whole visit: iPhones limit how many can exist, and closing one
     can hang on iOS, which used to leave the second answer stuck. */
  let rec = null, shared = null, lastLevel = 0;
  const later = (p, ms) => Promise.race([p, new Promise(ok => setTimeout(ok, ms))]);
  function newContext(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!shared || shared.state === 'closed'){ shared = new AC(); shared._worklet = null; }
    try{ shared.resume(); }catch(e){}
    return shared;
  }
  function freshContext(){ const old = shared; shared = null; try{ old && old.close(); }catch(e){} return newContext(); }
  const WORKLET = "registerProcessor('rec-tap',class extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage(c.slice(0));return true;}})";
  async function startRecording(stream, ctx){
    ctx = ctx || newContext();
    if(ctx.state !== 'running'){ try{ await later(ctx.resume(), 1500); }catch(e){} }
    const src = ctx.createMediaStreamSource(stream);
    const chunks = []; let len = 0; const max = ctx.sampleRate*MAXSEC;
    const push = d => { if(len > max) return; chunks.push(d); len += d.length;
      let s = 0; for(let i=0;i<d.length;i++) s += d[i]*d[i]; lastLevel = Math.sqrt(s/Math.max(1,d.length)); };
    const mute = ctx.createGain(); mute.gain.value = 0;
    let node = null;
    // AudioWorklet records off the main thread, so the 3D scene can't cause gaps; ScriptProcessor is the fallback
    if(ctx.audioWorklet && window.AudioWorkletNode){
      try{
        if(!ctx._worklet){
          const url = URL.createObjectURL(new Blob([WORKLET], {type:'application/javascript'}));
          ctx._worklet = later(ctx.audioWorklet.addModule(url).then(() => true), 3000); }
        if(await ctx._worklet !== true){ ctx._worklet = null; throw new Error('worklet'); }
        node = new AudioWorkletNode(ctx, 'rec-tap', {numberOfInputs:1, numberOfOutputs:1, outputChannelCount:[1]});
        node.port.onmessage = e => push(e.data);
      }catch(e){ node = null; }
    }
    if(!node){
      node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = e => push(new Float32Array(e.inputBuffer.getChannelData(0)));
    }
    src.connect(node); node.connect(mute); mute.connect(ctx.destination);
    lastLevel = 0;
    rec = {ctx, src, proc: node, mute, chunks, stream, rate: ctx.sampleRate, get len(){ return len; }};
    return rec;
  }
  async function stopRecording(){
    if(!rec) return new Float32Array(0);
    const r = rec; rec = null;
    try{ if(r.proc.port) r.proc.port.onmessage = null; r.proc.onaudioprocess = null; r.src.disconnect(); r.proc.disconnect(); r.mute.disconnect(); }catch(e){}
    try{ r.stream.getTracks().forEach(t => t.stop()); }catch(e){}
    let n = 0; r.chunks.forEach(c => n += c.length);
    const all = new Float32Array(n); let o = 0; r.chunks.forEach(c => { all.set(c, o); o += c.length; });
    return resample(all, r.rate);
  }
  function resample(x, rate){
    if(rate === SR) return x;
    const ratio = rate/SR, n = Math.floor(x.length/ratio), y = new Float32Array(n);
    for(let i=0;i<n;i++){ const a = i*ratio, b = Math.min(x.length, (i+1)*ratio); let s = 0, c = 0; for(let j=Math.floor(a); j<b; j++){ s += x[j]; c++; } y[i] = c ? s/c : 0; }
    return y;
  }
  function level(audio){ let s=0; for(let i=0;i<audio.length;i++) s += audio[i]*audio[i]; return Math.sqrt(s/Math.max(1,audio.length)); }

  window.LocalSTT = { newContext, freshContext, load, transcribe, startRecording, stopRecording, level, get state(){ return state; }, isRecording: () => !!rec, recorded: () => rec ? rec.len : 0, liveLevel: () => lastLevel };
})();
