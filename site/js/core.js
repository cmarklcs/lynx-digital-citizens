/* Lynx Digital Citizens — shared helpers for iPad: storage, recorded voice,
   sound effects, touch dragging, and the activity frame every game plugs into. */

const Store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('ldc.' + key); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('ldc.' + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  },
  remove(key) { try { localStorage.removeItem('ldc.' + key); } catch (e) {} }
};

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') for (const [p, val] of Object.entries(v)) {
      if (p.startsWith('--')) el.style.setProperty(p, val); else el.style[p] = val;
    }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const P = CONTENT.phrases;

/* ---------- sound effects ---------- */
const Sfx = {
  ctx: null,
  muted() { return Store.get('muted', false); },
  unlock() {
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {}
  },
  tone(freq, dur = 0.15, type = 'sine', delay = 0, vol = 0.14) {
    if (this.muted() || !this.ctx) return;
    try {
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  },
  tap() { this.tone(900, 0.05, 'triangle', 0, 0.06); },
  good() { this.tone(660, 0.12, 'triangle'); this.tone(990, 0.18, 'triangle', 0.1); },
  oops() { this.tone(220, 0.2, 'sine', 0, 0.1); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', i * 0.12)); }
};

/* ---------- read-aloud: recorded Siri clips, device voice as a fallback ----------
   iPads only allow sound after a tap, so one audio element is unlocked on the
   first touch and reused for every clip. */
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const Voice = {
  player: new Audio(),
  queue: [], token: 0, unlocked: false,
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try { this.player.src = SILENT; this.player.play().catch(() => {}); } catch (e) {}
    try { speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) {}
    Sfx.unlock();
  },
  say(texts) {
    this.stop();
    if (Sfx.muted()) return;
    this.queue = [].concat(texts).filter(Boolean);
    const my = ++this.token;
    this.next(my);
  },
  next(my) {
    if (my !== this.token) return;
    const text = this.queue.shift();
    if (text == null) return;
    const file = AUDIO[text];
    if (file) {
      this.player.src = 'audio/' + file;
      this.player.onended = () => this.next(my);
      this.player.play().catch(() => this.device(text, my));
    } else this.device(text, my);
  },
  device(text, my) {
    if (!('speechSynthesis' in window)) return this.next(my);
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F000}-\u{1FAFF}☀-➿]/gu, ''));
      const v = speechSynthesis.getVoices().find(v => /Samantha|Siri|Google US English/i.test(v.name) && /^en/.test(v.lang));
      if (v) u.voice = v;
      u.rate = 0.92;
      u.onend = () => this.next(my);
      speechSynthesis.speak(u);
    } catch (e) { this.next(my); }
  },
  stop() {
    this.token++; this.queue = [];
    try { this.player.pause(); this.player.onended = null; } catch (e) {}
    try { speechSynthesis.cancel(); } catch (e) {}
  }
};
document.addEventListener('pointerdown', () => Voice.unlock(), { capture: true });

/* A round 🔊 button that reads `text`, without triggering what it sits on. */
function speaker(text, cls = '') {
  const b = h('button', { class: 'speaker ' + cls, 'aria-label': 'Read aloud', type: 'button' }, '🔊');
  b.addEventListener('pointerdown', e => e.stopPropagation());
  b.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); Voice.say(text); });
  return b;
}

/* ---------- effects ---------- */
function confetti(count = 40) {
  const fx = document.getElementById('fx');
  for (let i = 0; i < count; i++) {
    const s = h('span', { class: 'confetti' }, Math.random() < 0.5 ? pick(['⭐', '🎉', '✨', '💛', '💙']) : '');
    if (!s.textContent) { s.classList.add('chip'); s.style.background = pick(['#FFCB05', '#017EA7', '#00274C', '#E53935', '#43A047', '#8E24AA']); }
    s.style.left = rand(0, 100) + 'vw';
    s.style.animationDuration = rand(1.4, 2.6) + 's';
    s.style.animationDelay = rand(0, 0.4) + 's';
    s.style.fontSize = rand(18, 34) + 'px';
    fx.append(s);
    setTimeout(() => s.remove(), 3200);
  }
}
function burst(el, emoji = '⭐') {
  const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const fx = document.getElementById('fx');
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8, d = rand(50, 90);
    const s = h('span', { class: 'burst' }, emoji);
    s.style.left = x + 'px'; s.style.top = y + 'px';
    s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    fx.append(s);
    setTimeout(() => s.remove(), 800);
  }
}
function wiggle(el) { el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); }

/* ---------- badges ----------
   Class iPads are shared, so badges belong to one student's lesson: they clear
   after an hour with no play, or when the teacher taps New student. */
const Progress = {
  STALE: 60 * 60 * 1000,
  all() {
    const d = Store.get('done', null);
    if (!d || !d.t || Date.now() - d.t > this.STALE) return {};
    return d.ids || {};
  },
  has(id) { return !!this.all()[id]; },
  add(id) { const p = this.all(); p[id] = 1; Store.set('done', { t: Date.now(), ids: p }); updateBadgeCount(); },
  count() { return Object.keys(this.all()).length; },
  reset() { Store.remove('done'); updateBadgeCount(); }
};
function updateBadgeCount() {
  const el = document.getElementById('badgeCount');
  if (el) el.textContent = '🏅 ' + Progress.count();
}

/* ---------- touch dragging ---------- */
function makeDraggable(node, { onDrop, onTap } = {}) {
  node.classList.add('draggable');
  node.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    node.style.transition = 'none';
    const move = ev => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 10) return;
      moved = true; node.classList.add('dragging');
      node.style.transform = `translate(${ev.clientX - sx}px, ${ev.clientY - sy}px) scale(1.05)`;
    };
    const up = ev => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      node.classList.remove('dragging');
      if (!moved) { node.style.transform = ''; onTap && onTap(); return; }
      const kept = onDrop && onDrop(ev.clientX, ev.clientY);
      if (!kept) { node.style.transition = 'transform .35s cubic-bezier(.3,1.5,.6,1)'; node.style.transform = ''; }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
}
function hitTest(el, x, y, pad = 16) {
  const r = el.getBoundingClientRect();
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
}

/* ---------- activity frame ---------- */
const Engines = {};
function findActivity(id) {
  for (const w of CONTENT.weeks) { const a = w.activities.find(a => a.id === id); if (a) return { act: a, week: w }; }
  return null;
}

function runActivity(id, mount) {
  const { act, week } = findActivity(id);
  const cleanups = [];
  let finished = false, lastSaid = act.intro || '';
  const promptText = h('div', { class: 'prompt-text' });
  const dots = h('div', { class: 'dots' });
  const stage = h('div', { class: 'stage stage-' + act.type });
  const prompt = h('button', { class: 'prompt', type: 'button' }, h('span', { class: 'prompt-speaker' }, '🔊'), promptText);
  prompt.addEventListener('click', () => Voice.say(lastSaid));
  mount.append(h('section', { class: 'activity', style: { '--wk': week.color } },
    h('div', { class: 'act-bar' },
      h('a', { class: 'back-btn', href: '#/week/' + week.n, 'aria-label': 'Back' }, '⬅'),
      h('div', { class: 'act-title' }, h('span', null, act.emoji), act.title),
      dots),
    prompt,
    stage));

  const idx = week.activities.indexOf(act);
  const nextAct = week.activities[idx + 1];
  const api = {
    stage, act, week,
    say(text, show) { lastSaid = text; promptText.textContent = show || (Array.isArray(text) ? text[text.length - 1] : text); Voice.say(text); },
    progress(cur, total) {
      dots.innerHTML = '';
      for (let i = 0; i < total; i++) dots.append(h('span', { class: 'dot' + (i < cur ? ' on' : '') }));
    },
    later(fn, ms) { const t = setTimeout(() => { if (!finished) fn(); }, ms); cleanups.push(() => clearTimeout(t)); },
    cleanup(fn) { cleanups.push(fn); },
    right() { return pick(P.right); },
    wrong() { return pick(P.wrong); },
    win(message, opts = {}) {
      if (finished) return; finished = true;
      Progress.add(id);
      Sfx.win(); confetti(50);
      const overlay = h('div', { class: 'win' },
        h('div', { class: 'win-card' },
          h('div', { class: 'win-badge' }, act.emoji),
          h('h2', null, message || P.earnedBadge),
          h('p', null, '🏅 ' + P.earnedBadge),
          h('div', { class: 'win-actions' },
            opts.keepGoing ? h('button', { class: 'big-btn', onclick: () => { overlay.remove(); finished = false; } }, '✏️ ' + P.keepGoing)
              : h('button', { class: 'big-btn', onclick: () => App.route() }, '🔁 ' + P.again),
            nextAct ? h('a', { class: 'big-btn go', href: '#/play/' + nextAct.id }, P.next + ' ➡') : null,
            h('a', { class: 'big-btn alt', href: '#/week/' + week.n }, `Week ${week.n} 🏠`))));
      stage.append(overlay);
      const allDone = week.activities.every(a => Progress.has(a.id));
      Voice.say([message, allDone ? P.allDone : P.earnedBadge].filter(Boolean));
    }
  };
  Engines[act.type](api, act);  // each engine reads its own intro
  return () => { finished = true; cleanups.forEach(fn => { try { fn(); } catch (e) {} }); Voice.stop(); };
}
