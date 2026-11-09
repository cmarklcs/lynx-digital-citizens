/* Week 1 hands-on games: Meet the iPad, Walk It to the Cart, Ready for the Next Friend. */

/* ---------- Meet the iPad: listen, then tap the part ---------- */
Engines.parts = (api, act) => {
  const NAMES = { screen: 'Screen', camera: 'Camera', top: 'Top button', volume: 'Volume', port: 'Charging port' };
  const names = shuffle(act.parts).map(p => ({ ...p, q: p.ask }));
  const clues = shuffle(act.parts).map(p => ({ ...p, q: p.clue, clueRound: true }));
  const order = names.concat(clues);
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
    api.say(first ? [act.intro, p.q] : p.q, p.q);
  }
  function tap(id, b) {
    if (busy || i >= order.length) return;
    const p = order[i];
    if (id !== p.id) { Sfx.oops(); wiggle(b); api.say([act.wrongSay, p.q], p.q); return; }
    Sfx.good(); burst(b);
    i++; api.progress(i, order.length);
    if (i === names.length) {
      // start the clue round: hide the name tags so kids must remember
      b.classList.add('found');
      busy = true;
      api.say([api.right(), p.info, act.clueIntro, order[i].q], order[i].q);
      api.later(() => { Object.values(spots).forEach(x => x.classList.remove('found')); ipad.classList.add('clue-round'); busy = false; }, 1200);
      return;
    }
    b.classList.add('found');
    if (i < order.length) api.say(p.clueRound ? [api.right(), order[i].q] : [api.right(), p.info, order[i].q], order[i].q);
    else { busy = true; api.say([act.clueRight], act.clueRight); api.later(() => api.win(), 2200); }
  }
  ask(true);
};

/* ---------- Walk It to the Cart: drag slowly around things on the floor ---------- */
Engines.carry = (api, act) => {
  // [x%, y%, moves?]  moving things roll up and down
  const LEVELS = [
    [[35, 50], [65, 50]],
    [[30, 50], [50, 18], [50, 82], [70, 50]],
    [[25, 50], [42, 15], [42, 85], [58, 50, 1], [75, 25], [75, 75]],
    [[22, 30], [22, 85], [38, 50, 1], [54, 15], [54, 85], [66, 50, 1], [80, 30], [80, 75]]
  ];
  const SPEED = 1.5;   // px per ms; faster than this is "running"
  const HIT = 52;      // px between centers that counts as bumping
  let round = 0, done = false, raf = 0;
  api.cleanup(() => cancelAnimationFrame(raf));
  const field = h('div', { class: 'carry-field' });
  api.stage.append(field);
  api.progress(0, LEVELS.length);

  function setup(first) {
    const hz = shuffle(act.hazards);
    const desk = h('div', { class: 'carry-desk' }, '🪑');
    const cart = h('div', { class: 'carry-cart' }, h('span', null, '🛒'), h('b', null, 'Cart'));
    let mv = 0;
    const hazards = LEVELS[round].map(([x, y, moves], k) => {
      const d = moves ? act.movers[mv++ % act.movers.length] : hz[k % hz.length];
      const el = h('div', { class: 'hazard' + (moves ? ' mover' : ''), style: { left: x + '%', top: y + '%' } }, d.emoji);
      el._say = d.say; el._y = y; el._moves = moves; el._phase = Math.random() * 6;
      return el;
    });
    const pad = h('div', { class: 'carry-ipad', role: 'img', 'aria-label': 'iPad' }, '📱');
    field.replaceChildren(desk, cart, ...hazards, pad);
    const home = () => ({ x: field.clientWidth * 0.08, y: field.clientHeight * 0.5 });
    const put = (x, y) => { pad.style.left = x + 'px'; pad.style.top = y + 'px'; };
    put(home().x, home().y);
    if (first) api.say(act.intro);
    let held = null;
    const t0 = performance.now();
    const tick = now => {
      if (!field.isConnected || done) return;
      for (const el of hazards) if (el._moves) el.style.top = (50 + 34 * Math.sin((now - t0) / 900 + el._phase)) + '%';
      if (held) held();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

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
        held = null;
      };
      const hitCheck = () => {
        const x = pad.offsetLeft, y = pad.offsetTop;
        for (const el of hazards) if (Math.hypot(x - el.offsetLeft, y - el.offsetTop) < HIT) { fail(el._say, el); return true; }
        return false;
      };
      held = hitCheck;
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
        if (hitCheck()) return;
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
    cancelAnimationFrame(raf); pad.remove(); cart.classList.add('full'); Sfx.good(); burst(cart, '💛');
    round++; api.progress(round, LEVELS.length);
    if (round >= LEVELS.length) { done = true; api.win(act.winSay); return; }
    api.say([act.roundDone, act.nextRound], act.nextRound);
    api.later(() => setup(false), 1400);
  }
  setup(true);
};

/* ---------- Ready for the Next Friend: close apps, find the numbered spot, plug in ---------- */
Engines.handoff = (api, act) => {
  const num = 12 + Math.floor(Math.random() * 17);          // 12–28
  const rev = +String(num).split('').reverse().join('');
  const pool = new Set([num, num + 1, num - 1, num + 10, num - 10, rev].filter(n => n >= 10 && n <= 99));
  while (pool.size < 12) pool.add(10 + Math.floor(Math.random() * 30));
  const nums = [...pool].slice(0, 12).sort((a, b) => a - b);
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
    const filled = new Set(shuffle(nums.filter(n => n !== num && n !== rev && Math.abs(n - num) !== 1)).slice(0, 5));
    const slots = nums.map(n => h('div', { class: 'slot' + (filled.has(n) ? ' taken' : ''), 'data-n': n },
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

/* ---------- harder Learn It jobs ---------- */
Object.assign(LearnDo, {
  /* find every right one; wrong ones explain why */
  pickMany(d, api, finish) {
    let left = d.items.filter(it => it.good).length;
    const box = h('div', { class: 'do-box do-many' }, d.center ? h('div', { class: 'do-center' }, d.center) : null);
    shuffle(d.items).forEach(it => {
      const b = h('button', { class: 'do-item', type: 'button' }, h('span', { class: 'do-emoji' }, it.emoji), h('span', { class: 'do-label' }, it.label));
      b.addEventListener('click', () => {
        if (b.classList.contains('on') || b.disabled) return;
        if (it.good) {
          b.classList.add('on'); Sfx.good(); burst(b);
          api.say(sayOf(it), d.ask);
          if (--left === 0) setTimeout(finish, 1400);
        } else {
          b.classList.add('bad'); b.disabled = true; Sfx.oops(); wiggle(b);
          api.say(it.say, d.ask);
        }
      });
      box.append(b);
    });
    return box;
  },
  /* doors with signs: find the one place that is not for kids; wrong doors open to show a fun place */
  doorPick(d, api, finish) {
    const box = h('div', { class: 'do-box do-doors' });
    let solved = false;
    shuffle(d.items).forEach(it => {
      const emo = h('span', { class: 'do-emoji' }, '🚪');
      const b = h('button', { class: 'do-item', type: 'button' }, emo, h('span', { class: 'do-label sign' }, it.sign));
      b.addEventListener('click', () => {
        if (solved || b.classList.contains('on')) return;
        emo.textContent = it.emoji; b.classList.add('on');
        if (it.good) { solved = true; b.classList.add('bad'); Sfx.oops(); api.say(it.say, it.say); setTimeout(finish, 4200); }
        else { Sfx.tap(); api.say(it.say, d.ask); }
      });
      box.append(b);
    });
    return box;
  },
  /* tap something on the left, then what it goes with on the right */
  pairs(d, api, finish) {
    let sel = null, left = d.pairs.length;
    const L = h('div', { class: 'do-col' }), R = h('div', { class: 'do-col right' });
    d.pairs.forEach((p, n) => {
      const a = h('button', { class: 'do-item small', type: 'button' }, h('span', { class: 'do-emoji' }, p.a.emoji), h('span', { class: 'do-label' }, p.a.label));
      a.dataset.n = n;
      a.addEventListener('click', () => {
        if (a.classList.contains('on')) return;
        L.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
        a.classList.add('sel'); sel = a; Sfx.tap(); api.say(p.a.label, d.ask);
      });
      L.append(a);
    });
    shuffle(d.pairs.map((p, n) => ({ p, n }))).forEach(({ p, n }) => {
      const b = h('button', { class: 'do-item small wide', type: 'button' }, h('span', { class: 'do-label' }, p.b.label));
      b.addEventListener('click', () => {
        if (b.classList.contains('on')) return;
        if (!sel) { api.say([p.b.label, d.pickFirst], d.ask); return; }
        if (+sel.dataset.n === n) {
          sel.classList.remove('sel'); sel.classList.add('on', 'pair' + n); b.classList.add('on', 'pair' + n);
          Sfx.good(); burst(b); api.say(p.b.say || p.b.label, d.ask); sel = null;
          if (--left === 0) setTimeout(finish, 2200);
        } else { Sfx.oops(); wiggle(b); api.say(d.tryAgain, d.ask); }
      });
      R.append(b);
    });
    return h('div', { class: 'do-box do-pairs' }, L, R);
  },
  /* one card at a time: tap the box it belongs in */
  sortMini(d, api, finish) {
    const items = shuffle(d.items);
    let i = 0;
    const card = h('div', { class: 'do-card' });
    const bins = d.bins.map(bn => {
      const b = h('button', { class: 'do-item mbin', type: 'button' }, h('span', { class: 'do-emoji' }, bn.emoji), h('span', { class: 'do-label' }, bn.label), h('span', { class: 'do-count' }));
      b.addEventListener('click', () => {
        const it = items[i];
        if (!it) return;
        if (it.bin === bn.id) {
          Sfx.good(); burst(b); b.querySelector('.do-count').textContent += it.emoji;
          i++;
          if (i < items.length) { showCard(); api.say([api.right(), items[i].label], d.ask); }
          else { card.replaceChildren(); card.classList.add('empty'); finish(); }
        } else { Sfx.oops(); wiggle(card); api.say(it.say, d.ask); }
      });
      return b;
    });
    function showCard() {
      const it = items[i];
      card.replaceChildren(h('span', { class: 'do-emoji' }, it.emoji), h('span', null, it.label), speaker(it.label));
      card.classList.remove('pop-in'); void card.offsetWidth; card.classList.add('pop-in');
    }
    showCard();
    return h('div', { class: 'do-box do-sortmini' }, card, h('div', { class: 'do-bins' }, bins));
  },
  /* tap the steps in the right order */
  order(d, api, finish) {
    let next = 0;
    const box = h('div', { class: 'do-box do-order' });
    shuffle(d.steps.map((s, n) => ({ s, n }))).forEach(({ s, n }) => {
      const num = h('span', { class: 'do-num' }, '?');
      const b = h('button', { class: 'do-item', type: 'button' }, num, h('span', { class: 'do-emoji' }, s.emoji), h('span', { class: 'do-label' }, s.label));
      b.addEventListener('click', () => {
        if (b.classList.contains('on')) return;
        if (n === next) {
          next++; num.textContent = next; b.classList.add('on'); Sfx.good(); burst(b);
          api.say(s.label, d.ask);
          if (next === d.steps.length) setTimeout(finish, 1200);
        } else { Sfx.oops(); wiggle(b); api.say(d.wrongOrder, d.ask); }
      });
      box.append(b);
    });
    return box;
  }
});
