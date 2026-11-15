/* Anonymous usage stats for the 3D Learning Simulations hub (GoatCounter).
   - No cookies, no names, no Google accounts: only page paths and simple events.
   - Staff in teacher mode, "Do Not Track" browsers and automated tests are not counted.
   - Set CODE to the GoatCounter site code to switch it on (blank = off). */
(function(){
  var CODE = 'wolvcoll-3dsims';
  var off = !CODE || navigator.webdriver || navigator.doNotTrack === '1' || window.doNotTrack === '1';
  try { var st = JSON.parse(localStorage.getItem('hub.staff')); if (st && st.exp > Date.now()) off = true; } catch(e){}
  var path = location.pathname.replace(/^.*?(\/sims\/|\/[^\/]*\.html$|\/$)/, function(m, g){ return g; });
  var q = new URLSearchParams(location.search), sim = (location.pathname.match(/\/sims\/([^\/]+)\//) || [])[1];
  var page = sim ? '/sim/' + sim + (/(teacher|transcript|worksheet)\.html$/.test(location.pathname) ? '/' + RegExp.$1 : '')
    : /area\.html$/.test(location.pathname) ? '/area/' + (q.get('id') || '') + (q.get('course') ? '/' + q.get('course') : '')
    : '/hub';
  function send(p, title, ev, beacon){
    if (off) return;
    var u = 'https://' + CODE + '.goatcounter.com/count?p=' + encodeURIComponent(p) + '&t=' + encodeURIComponent(title || '') +
      (ev ? '&e=true' : '') + '&s=' + encodeURIComponent(screen.width + ',' + screen.height + ',' + (window.devicePixelRatio || 1)) + '&rnd=' + Math.random().toString(36).slice(2);
    try { if (beacon && navigator.sendBeacon) { navigator.sendBeacon(u); return; } } catch(e){}
    var img = new Image(); img.src = u;
  }
  var sent = {};
  window.simStats = {
    once: function(name){ if (!sim || sent[name]) return; sent[name] = 1; send('sim/' + sim + '/' + name, name, true); }
  };
  send(page, document.title);
  if (!sim || /(transcript|worksheet)\.html$/.test(location.pathname)) return;
  // Narration started (first audio clip or browser voice)
  var mp = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function(){ var r = mp.apply(this, arguments); if (r && r.then) r.then(function(){ simStats.once('narration-started'); }, function(){}); return r; };
  // Time spent with the page visible, sent once when the student leaves
  var shown = 0, since = document.visibilityState === 'visible' ? Date.now() : 0, done = false;
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') since = Date.now(); else if (since) { shown += Date.now() - since; since = 0; }
  });
  addEventListener('pagehide', function(){
    if (done) return; done = true; if (since) shown += Date.now() - since;
    var m = shown / 60000, b = m < 2 ? 'under-2-min' : m < 5 ? '2-5-min' : m < 10 ? '5-10-min' : m < 20 ? '10-20-min' : '20-min-plus';
    if (!off) send('sim/' + sim + '/time-' + b, 'time ' + b, true, true);
  });
})();
