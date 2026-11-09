/* Week 1 hands-on games: Meet the iPad, Walk It to the Cart, Ready for the Next Friend. */

/* ---------- Meet the iPad: listen, then tap the part ---------- */
Engines.parts = (api, act) => {
  const NAMES = { screen: 'Screen', camera: 'Camera', top: 'Top button', volume: 'Volume', port: 'Charging port' };
  const order = shuffle(act.parts);
  let i = 0, busy = false;
  const spots = {};
  const spot = (id, ...kids) => {
    const b = h('button', { class: 'ipad-part p-' + id, type: 'button', 'aria-label': NAMES[id] }, ...kids, h('span', { class: 'part-tag' }, NAMES[id]));
    b.addEventListener('click', e => { e.stopPropagation(); tap(id, b); });
    spots[id] = b;
    return b;
  };
  const ipad = h('div', { class: 'ipad' },
    spot('top'), spot('volume', h('i'), h('i')),
    h('div', { class: 'ipad-body' },
      spot('camera', h('i')),
      spot('screen', h('span', { class: 'ipad-time' }, '9:41'), h('span', { class: 'ipad-apps' }, '📚 🎨 🧮 🎵 📷 ⚙️'))),
    spot('port', h('i')));
  api.stage.append(h('div', { class: 'parts' }, ipad));
  api.progress(0, order.length);

  function ask(first) {
    const p = order[i];
    api.say(first ? [act.intro, p.ask] : p.ask, p.ask);
  }
  function tap(id, b) {
    if (busy || i >= order.length) return;
    const p = order[i];
    if (id !== p.id) { Sfx.oops(); wiggle(b); api.say([act.wrongSay, p.ask], p.ask); return; }
    b.classList.add('found'); Sfx.good(); burst(b);
    i++; api.progress(i, order.length);
    if (i < order.length) api.say([api.right(), p.info, order[i].ask], order[i].ask);
    else { busy = true; api.say([api.right(), p.info], p.info); api.later(() => api.win(), 5200); }
  }
  ask(true);
};

/* ---------- Walk It to the Cart: drag slowly around things on the floor ---------- */
Engines.carry = (api, act) => {
  const LEVELS = [
    [[38, 30], [64, 72]],
    [[30, 70], [50, 26], [70, 70]],
    [[28, 20], [28, 84], [50, 52], [72, 18], [72, 84]]
  ];
  const SPEED = 1.5;   // px per ms; faster than this is "running"
  const HIT = 52;      // px between centers that counts as bumping
  let round = 0, done = false;
  const field = h('div', { class: 'carry-field' });
  api.stage.append(field);
  api.progress(0, LEVELS.length);

  function setup(first) {
    const hz = shuffle(act.hazards);
    const desk = h('div', { class: 'carry-desk' }, '🪑');
    const cart = h('div', { class: 'carry-cart' }, h('span', null, '🛒'), h('b', null, 'Cart'));
    const hazards = LEVELS[round].map(([x, y], k) => {
      const el = h('div', { class: 'hazard', style: { left: x + '%', top: y + '%' } }, hz[k % hz.length].emoji);
      el._say = hz[k % hz.length].say;
      return el;
    });
    const pad = h('div', { class: 'carry-ipad', role: 'img', 'aria-label': 'iPad' }, '📱');
    field.replaceChildren(desk, cart, ...hazards, pad);
    const home = () => ({ x: field.clientWidth * 0.08, y: field.clientHeight * 0.5 });
    const put = (x, y) => { pad.style.left = x + 'px'; pad.style.top = y + 'px'; };
    put(home().x, home().y);
    if (first) api.say(act.intro);

    pad.addEventListener('pointerdown', e => {
      if (done) return;
      e.preventDefault();
      pad.style.transition = 'none';
      const fr = field.getBoundingClientRect();
      const ox = e.clientX - pad.offsetLeft - fr.left, oy = e.clientY - pad.offsetTop - fr.top;
      const trail = [];
      pad.classList.add('held');
      const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
        pad.classList.remove('held');
      };
      const fail = (say, el) => {
        stop(); Sfx.oops(); if (el) wiggle(el);
        pad.classList.add('bump');
        api.say(say);
        pad.style.transition = 'left .6s ease, top .6s ease';
        put(home().x, home().y);
        setTimeout(() => pad.classList.remove('bump'), 600);
      };
      const move = ev => {
        const r = field.getBoundingClientRect();
        const x = Math.max(30, Math.min(r.width - 30, ev.clientX - r.left - ox));
        const y = Math.max(30, Math.min(r.height - 30, ev.clientY - r.top - oy));
        put(x, y);
        const now = performance.now();
        trail.push({ t: now, x, y });
        while (trail.length && now - trail[0].t > 160) trail.shift();
        const a = trail[0], dt = now - a.t;
        if (dt > 60 && Math.hypot(x - a.x, y - a.y) / dt > SPEED) return fail(act.tooFast);
        for (const el of hazards) {
          if (Math.hypot(x - el.offsetLeft, y - el.offsetTop) < HIT) return fail(el._say, el);
        }
        const c = cart.getBoundingClientRect();
        if (ev.clientX > c.left && ev.clientX < c.right && ev.clientY > c.top && ev.clientY < c.bottom) {
          stop(); arrive(cart, pad);
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
    });
  }
  function arrive(cart, pad) {
    pad.remove(); cart.classList.add('full'); Sfx.good(); burst(cart, '💛');
    round++; api.progress(round, LEVELS.length);
    if (round >= LEVELS.length) { done = true; api.win(act.winSay); return; }
    api.say([act.roundDone, act.nextRound], act.nextRound);
    api.later(() => setup(false), 1400);
  }
  setup(true);
};

/* ---------- Ready for the Next Friend: close apps, find the numbered spot, plug in ---------- */
Engines.handoff = (api, act) => {
  const num = 1 + Math.floor(Math.random() * 6);
  const wrap = h('div', { class: 'handoff' });
  api.stage.append(wrap);
  api.progress(0, 3);

  /* step 1: swipe each app card up */
  function apps(first) {
    let left = act.apps.length;
    const cards = act.apps.map(a => {
      const card = h('div', { class: 'app-card' }, h('div', { class: 'app-shot' }, a.emoji), h('div', { class: 'app-name' }, a.text));
      card.addEventListener('pointerdown', e => {
        e.preventDefault();
        const sy = e.clientY; let dy = 0;
        card.style.transition = 'none';
        const move = ev => { dy = Math.min(0, ev.clientY - sy); card.style.transform = `translateY(${dy}px)`; card.style.opacity = 1 + dy / 300; };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          card.style.transition = 'transform .3s ease, opacity .3s ease';
          if (dy < -60) {
            card.style.transform = 'translateY(-140%)'; card.style.opacity = 0; card.classList.add('gone');
            Sfx.tap();
            if (--left === 0) setTimeout(spot, 450);
          } else {
            card.style.transform = ''; card.style.opacity = '';
            if (dy > -10) { wiggle(card); api.say(act.swipeHint); }
          }
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
      return card;
    });
    wrap.replaceChildren(h('div', { class: 'mock-ipad' },
      h('div', { class: 'mock-screen switcher' }, cards, h('div', { class: 'swipe-hint', 'aria-hidden': 'true' }, '👆'))));
    api.say(first ? [act.intro, act.closeApps] : act.closeApps, act.closeApps);
  }

  /* step 2: drag the iPad to the cart slot with the same number */
  function spot() {
    api.progress(1, 3); Sfx.good();
    const pad = h('div', { class: 'ho-ipad' }, h('span', null, '📱'), h('b', null, num));
    const filled = new Set(shuffle([1, 2, 3, 4, 5, 6].filter(n => n !== num)).slice(0, 3));
    const slots = [1, 2, 3, 4, 5, 6].map(n => h('div', { class: 'slot' + (filled.has(n) ? ' taken' : ''), 'data-n': n },
      h('b', null, n), filled.has(n) ? h('span', null, '📱') : null));
    const cart = h('div', { class: 'ho-cart' }, slots);
    wrap.replaceChildren(h('div', { class: 'ho-row' }, h('div', { class: 'ho-start' }, pad), cart));
    makeDraggable(pad, {
      onTap: () => api.say(act.findSpot),
      onDrop: (x, y) => {
        const s = slots.find(el => hitTest(el, x, y, 6));
        if (!s) return false;
        if (+s.dataset.n !== num) { Sfx.oops(); wiggle(s); api.say(act.wrongSpot); return false; }
        pad.remove(); s.classList.add('mine'); s.append(h('span', null, '📱'));
        Sfx.good(); burst(s);
        setTimeout(plug, 700);
        return true;
      }
    });
    api.say([act.appsClosed, act.findSpot], act.findSpot);
  }

  /* step 3: drag the plug into the charging port */
  function plug() {
    api.progress(2, 3);
    const battery = h('div', { class: 'ho-battery' }, '🪫');
    const port = h('div', { class: 'ho-port' });
    const plugEl = h('div', { class: 'ho-plug' }, '🔌');
    wrap.replaceChildren(h('div', { class: 'ho-charge' },
      h('div', { class: 'ho-plug-home' }, plugEl, h('div', { class: 'ho-cord' })),
      h('div', { class: 'ho-tall-ipad' }, h('b', null, num), battery, port)));
    makeDraggable(plugEl, {
      onTap: () => api.say(act.plugIn),
      onDrop: (x, y) => {
        if (!hitTest(port, x, y, 50)) { api.say(act.plugIn); return false; }
        plugEl.remove(); port.classList.add('in'); battery.textContent = '🔋⚡';
        api.progress(3, 3);
        api.win(act.winSay);
        return true;
      }
    });
    api.say(act.plugIn);
  }
  apps(true);
};
