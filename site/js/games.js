/* Activity engines. Each takes (api, activity) and reads its words from
   data/content.json, so every line it speaks has a Siri recording. */

/* ---------- sort: drag (or tap) each card into the right box ---------- */
Engines.sort = (api, act) => {
  const cards = shuffle(act.cards);
  let i = 0, busy = false, card = null;
  const slot = h('div', { class: 'card-slot' });
  const bins = act.bins.map(b => {
    const pile = h('div', { class: 'bin-pile' });
    const el = h('button', { class: 'bin', type: 'button' },
      h('span', { class: 'bin-emoji' }, b.emoji), h('span', { class: 'bin-label' }, b.label), pile);
    el.append(speaker(b.label, 'corner'));
    el.addEventListener('click', () => { if (card && !busy) place({ b, el, pile }); });
    return { b, el, pile };
  });
  api.stage.append(h('div', { class: 'sort' }, bins[0].el, slot, bins[1].el));
  api.progress(0, cards.length);

  function show() {
    const c = cards[i];
    card = h('div', { class: 'sort-card pop-in' }, h('div', { class: 'sc-emoji' }, c.emoji), h('div', { class: 'sc-text' }, c.text), speaker(c.text, 'corner'));
    makeDraggable(card, {
      onTap: () => { card.classList.add('selected'); Sfx.tap(); api.say([c.text, P.nowTapBox], c.text); },
      onDrop: (x, y) => { const t = bins.find(o => hitTest(o.el, x, y)); return t ? place(t) : false; }
    });
    slot.replaceChildren(card);
  }
  function place(t) {
    const c = cards[i];
    if (c.bin !== t.b.id) {
      Sfx.oops(); wiggle(card); wiggle(t.el);
      api.say([api.wrong(), c.text], c.text);
      return false;
    }
    busy = true; Sfx.good(); burst(t.el);
    t.pile.append(h('span', { class: 'pop-in' }, c.emoji));
    card.remove(); card = null;
    i++; api.progress(i, cards.length);
    const praise = api.right();
    if (i === cards.length) {
      api.say([praise, c.why], c.why);
      api.later(() => api.win(), 2600);
    } else {
      show();
      api.say([praise, c.why, cards[i].text], c.why);
    }
    busy = false;
    return true;
  }
  show();
  api.say([act.intro, P.tapCard, cards[0].text], act.intro);
};

/* ---------- scenario: read a story, pick the best choice ---------- */
function scenarioView(api, items, { intro, onDone }) {
  let i = 0;
  const wrap = h('div', { class: 'scenario' });
  api.stage.append(wrap);
  function show(first) {
    const it = items[i];
    const feedback = h('div', { class: 'feedback' });
    const nextBtn = h('button', { class: 'big-btn go next-btn hidden', type: 'button' }, P.next + ' ➡');
    let solved = false;
    const choices = shuffle(it.choices).map(ch => {
      const btn = h('button', { class: 'choice', type: 'button' }, ch.text);
      btn.addEventListener('click', () => {
        if (solved || btn.disabled) return;
        if (ch.good) {
          solved = true; btn.classList.add('right'); Sfx.good(); burst(btn);
          choices.forEach(o => { if (o.btn !== btn) o.btn.disabled = true; });
          feedback.className = 'feedback right'; feedback.textContent = '✅ ' + ch.feedback;
          nextBtn.classList.remove('hidden');
          if (items.length > 1) api.progress(i + 1, items.length);
          api.say([api.right(), ch.feedback], ch.feedback);
        } else {
          btn.classList.add('wrong'); btn.disabled = true; Sfx.oops(); wiggle(btn);
          feedback.className = 'feedback wrong'; feedback.textContent = '🤔 ' + ch.feedback;
          api.say(ch.feedback);
        }
      });
      return { btn, row: h('div', { class: 'choice-row' }, speaker(ch.text), btn) };
    });
    nextBtn.addEventListener('click', () => { i++; i < items.length ? show() : onDone(); });
    wrap.replaceChildren(
      h('div', { class: 'story pop-in' }, h('div', { class: 'story-emoji' }, it.emoji), h('div', { class: 'story-text' }, it.text), speaker(it.text, 'corner')),
      h('div', { class: 'choices' }, choices.map(c => c.row)),
      feedback, nextBtn);
    api.say(first && intro ? [intro, it.text] : it.text, it.text);
  }
  if (items.length > 1) api.progress(0, items.length);
  show(true);
}
Engines.scenario = (api, act) => scenarioView(api, act.items, { intro: act.intro, onDone: () => api.win() });

/* Learn It: a read-aloud picture story that teaches the week's idea, then one quick check question. */
Engines.learn = (api, act) => {
  let i = 0;
  const total = act.slides.length + 1;
  const doneSlides = new Set();
  const wrap = h('div', { class: 'learn' });
  api.stage.append(wrap);
  function show(first) {
    const s = act.slides[i];
    const back = h('button', { class: 'big-btn alt', type: 'button', 'aria-label': P.learnBack }, '⬅');
    const next = h('button', { class: 'big-btn go', type: 'button' }, P.learnNext + ' ➡');
    back.disabled = i === 0;
    back.addEventListener('click', () => { if (i > 0) { i--; Sfx.tap(); show(); } });
    next.addEventListener('click', () => {
      if (next.classList.contains('locked')) { wiggle(next); api.say(s.do.ask); return; }
      Sfx.tap(); i++;
      if (i < act.slides.length) show();
      else { api.progress(total, total); wrap.remove(); scenarioView(api, [act.check], { intro: P.learnCheck, onDone: () => api.win() }); }
    });
    const card = h('div', { class: 'learn-card pop-in' + (s.do ? ' has-do' : '') },
      s.do ? null : h('div', { class: 'learn-emoji' }, s.emoji),
      h('div', { class: 'learn-text' }, s.text),
      speaker(s.do ? [s.text, s.do.ask] : s.text, 'corner'),
      h('div', { class: 'learn-count' }, `${i + 1} / ${act.slides.length}`));
    if (s.do) {
      const idx = i;
      const finish = () => {
        if (!card.isConnected || doneSlides.has(idx)) return;
        doneSlides.add(idx);
        next.classList.remove('locked'); next.classList.add('ready');
        Sfx.good(); burst(next);
        if (s.do.done) api.say(s.do.done, s.do.done);
      };
      if (!doneSlides.has(i)) next.classList.add('locked');
      else next.classList.add('ready');
      card.append(LearnDo[s.do.kind](s.do, api, finish));
    }
    wrap.replaceChildren(card, h('div', { class: 'learn-nav' }, back, next));
    api.progress(i + 1, total);
    const lines = [first ? act.intro : null, s.text, s.do ? s.do.ask : null].filter(Boolean);
    api.say(lines, s.do ? s.do.ask : s.text);
  }
  show(true);
};

/* Hands-on actions inside a Learn It slide. Each calls finish() once the child has done it. */
const sayOf = it => it.say || it.label;
const LearnDo = {
  /* tap every item; layout: ring (around a center), cards (flip to reveal), doors (peek inside), collect (fly to center) */
  tapAll(d, api, finish) {
    let left = d.items.length;
    const center = d.center ? h('div', { class: 'do-center' }, d.center) : null;
    const box = h('div', { class: 'do-box do-' + d.layout }, center);
    d.items.forEach((it, n) => {
      const hidden = d.layout === 'cards' || d.layout === 'doors';
      const b = h('button', { class: 'do-item', type: 'button', style: { '--n': n, '--of': d.items.length } },
        h('span', { class: 'do-emoji' }, hidden ? (d.layout === 'doors' ? '🚪' : '❓') : it.emoji),
        h('span', { class: 'do-label' }, hidden ? '' : it.label));
      b.addEventListener('click', () => {
        api.say(sayOf(it), d.ask);
        if (b.classList.contains('on')) return;
        b.classList.add('on'); Sfx.tap(); burst(b, it.bad ? '❗' : '⭐');
        if (hidden) { b.querySelector('.do-emoji').textContent = it.emoji; b.querySelector('.do-label').textContent = it.label; }
        if (it.bad) b.classList.add('bad');
        if (center) { center.classList.remove('pulse-once'); void center.offsetWidth; center.classList.add('pulse-once'); }
        if (--left === 0) setTimeout(finish, it.say ? 3800 : 1500);
      });
      box.append(b);
    });
    if (d.layout === 'ring') box.prepend(h('div', { class: 'do-lines' }));
    return box;
  },
  /* one right answer; layout: light (traffic light) or switch (Wi-Fi toggle on an iPad) */
  pickOne(d, api, finish) {
    const box = h('div', { class: 'do-box do-' + d.layout });
    let screen = null;
    if (d.layout === 'switch') {
      screen = h('div', { class: 'do-screen' }, h('span', null, '😴'), h('b', null, 'Offline'));
      box.append(screen);
    }
    let solved = false;
    d.items.forEach(it => {
      const b = h('button', { class: 'do-item', type: 'button' }, h('span', { class: 'do-emoji' }, it.emoji), h('span', { class: 'do-label' }, it.label));
      b.addEventListener('click', () => {
        if (solved) return;
        if (it.good) {
          solved = true; b.classList.add('on'); box.classList.add('solved');
          if (screen) screen.replaceChildren(h('span', null, '🌐'), h('b', null, 'Online'));
          api.say(sayOf(it), it.say || d.ask);
          setTimeout(finish, it.say ? 2600 : 600);
        } else { Sfx.oops(); wiggle(b); api.say(sayOf(it), d.ask); }
      });
      box.append(b);
    });
    return box;
  },
  /* drag one thing to a target */
  drag(d, api, finish) {
    const thing = h('div', { class: 'do-thing' }, d.item);
    const target = h('div', { class: 'do-target' }, h('span', null, d.to), h('small', null, d.toLabel));
    const box = h('div', { class: 'do-box do-drag' },
      h('div', { class: 'do-from' }, h('span', null, d.from), h('small', null, d.fromLabel), thing),
      h('div', { class: 'do-arrow' }, '➡'),
      target);
    makeDraggable(thing, {
      onTap: () => api.say(d.ask),
      onDrop: (x, y) => {
        if (!hitTest(target, x, y, 30)) return false;
        thing.remove(); target.append(h('div', { class: 'do-thing given' }, d.item)); target.classList.add('on');
        finish();
        return true;
      }
    });
    return box;
  }
};

/* ---------- match: pair each real-world card with its online card ---------- */
Engines.match = (api, act) => {
  let sel = null, matched = 0;
  const make = (side, pair, n) => {
    const el = h('button', { class: 'match-card', type: 'button' }, h('span', { class: 'mc-emoji' }, side.emoji), h('span', null, side.text));
    el.dataset.pair = n;
    el.addEventListener('click', () => tap(el, side.text));
    return el;
  };
  const left = act.pairs.map((p, n) => make(p.left, p, n));
  const right = shuffle(act.pairs.map((p, n) => make(p.right, p, n)));
  api.stage.append(h('div', { class: 'match' },
    h('div', { class: 'match-col' }, h('div', { class: 'match-head' }, '🏡 Real world'), left),
    h('div', { class: 'match-col' }, h('div', { class: 'match-head' }, '📱 Online'), right)));
  api.progress(0, act.pairs.length);
  function tap(el, text) {
    if (el.classList.contains('done')) return;
    const sameSide = sel && (left.includes(sel) === left.includes(el));
    if (!sel || sameSide || sel === el) {
      if (sel) sel.classList.remove('selected');
      sel = el; el.classList.add('selected'); Sfx.tap();
      api.say([text, P.matchPick], text);
      return;
    }
    if (sel.dataset.pair === el.dataset.pair) {
      [sel, el].forEach(x => { x.classList.remove('selected'); x.classList.add('done', 'pair' + el.dataset.pair); });
      Sfx.good(); burst(el); matched++;
      api.progress(matched, act.pairs.length);
      sel = null;
      if (matched === act.pairs.length) api.win();
      else api.say([api.right(), text], text);
    } else {
      Sfx.oops(); wiggle(el); api.say([api.wrong(), text], text);
    }
  }
  api.say([act.intro, P.matchStart], act.intro);
};

/* ---------- balance: plan an afternoon with screen time and green time ---------- */
Engines.balance = (api, act) => {
  const TIMES = ['3:00', '3:30', '4:00', '4:30', '5:00', '5:30'];
  const plan = Array(6).fill(null);
  const slots = TIMES.map((t, n) => {
    const s = h('button', { class: 'day-slot', type: 'button' }, h('span', { class: 'ds-time' }, t), h('span', { class: 'ds-body' }, '＋'));
    s.addEventListener('click', () => { if (plan[n]) { plan[n] = null; Sfx.tap(); render(); } });
    return s;
  });
  const beam = h('div', { class: 'beam' });
  const scale = h('div', { class: 'scale' },
    h('div', { class: 'scale-side' }, '📱', h('b', { class: 'sc-screen' }, '0')),
    h('div', { class: 'scale-mid' }, beam, h('div', { class: 'fulcrum' })),
    h('div', { class: 'scale-side' }, '🌳', h('b', { class: 'sc-green' }, '0')));
  const tiles = act.activities.map(a => {
    const el = h('div', { class: 'tile ' + a.kind }, h('span', { class: 'tile-emoji' }, a.emoji), h('span', null, a.text), speaker(a.text, 'corner'));
    makeDraggable(el, {
      onTap: () => add(a),
      onDrop: (x, y) => {
        const n = slots.findIndex(s => hitTest(s, x, y, 4));
        if (n < 0) return false;
        plan[n] = a; Sfx.tap(); render(); return false;
      }
    });
    return el;
  });
  const reset = h('button', { class: 'big-btn alt small', type: 'button' }, '↺ ' + P.clearBalance);
  reset.addEventListener('click', () => { plan.fill(null); render(); Voice.say(P.clearBalance); });
  api.stage.append(h('div', { class: 'balance' },
    h('div', { class: 'day' }, h('div', { class: 'day-head' }, '🎒 After school', reset), h('div', { class: 'day-slots' }, slots)),
    scale,
    h('div', { class: 'tiles' }, tiles)));
  function add(a) {
    const n = plan.indexOf(null);
    if (n < 0) { wiggle(slots[5]); return; }
    plan[n] = a; Sfx.tap(); render();
    if (plan.includes(null)) Voice.say(a.text);
  }
  let won = false;
  function render() {
    slots.forEach((s, n) => {
      const a = plan[n];
      s.className = 'day-slot' + (a ? ' filled ' + a.kind : '');
      s.querySelector('.ds-body').textContent = a ? a.emoji + ' ' + a.text : '＋';
    });
    const screen = plan.filter(a => a && a.kind === 'screen').length, green = plan.filter(a => a && a.kind === 'green').length;
    scale.querySelector('.sc-screen').textContent = screen;
    scale.querySelector('.sc-green').textContent = green;
    beam.style.transform = `rotate(${Math.max(-18, Math.min(18, (green - screen) * 5))}deg)`;
    api.progress(screen + green, 6);
    if (plan.includes(null)) return;
    if (screen >= 3) { Sfx.oops(); api.say(act.tooMuchSay); }
    else {
      api.say(screen === 0 ? act.noScreenSay : act.goodSay);
      if (!won) { won = true; Sfx.good(); api.later(() => api.win(null, { keepGoing: true }), 3500); }
    }
  }
  render();
  api.say(act.intro);
};

/* ---------- password: build a long, silly password, then a secret-keeping quiz ---------- */
Engines.password = (api, act) => {
  const picks = { 0: null, 1: null, 2: null, num: null, sym: null };
  const out = h('div', { class: 'pw-out' });
  const meter = h('div', { class: 'pw-meter' }, Array.from({ length: 5 }, () => h('i')));
  const row = (key, items, cls = '') => h('div', { class: 'pw-row ' + cls }, items.map(w => {
    const b = h('button', { class: 'pw-chip', type: 'button' }, w);
    b.addEventListener('click', () => {
      picks[key] = picks[key] === w ? null : w;
      b.parentElement.querySelectorAll('.pw-chip').forEach(x => x.classList.toggle('on', x.textContent === picks[key]));
      Sfx.tap(); update(/[a-z]/i.test(w) ? w : null);
    });
    return b;
  }));
  const board = h('div', { class: 'pw' },
    h('div', { class: 'pw-screen' }, h('span', { class: 'pw-lock' }, '🔒'), out),
    meter,
    act.rows.map((r, n) => row(n, r)),
    h('div', { class: 'pw-small' }, row('num', act.numbers, 'num'), row('sym', act.symbols, 'sym')));
  api.stage.append(board);
  let last = 0;
  function update(word) {
    const pw = [picks[0], picks[1], picks[2], picks.num, picks.sym].filter(Boolean).join('');
    out.textContent = pw || '…';
    const score = Object.values(picks).filter(Boolean).length;
    meter.className = 'pw-meter s' + score;
    meter.querySelectorAll('i').forEach((m, n) => m.classList.toggle('on', n < score));
    if (score === 5) {
      Sfx.good(); burst(meter);
      api.say(P.passwordStrong);
      api.later(() => {
        board.remove();
        scenarioView(api, [act.quiz], { intro: P.passwordSecret, onDone: () => api.win() });
      }, 4500);
    } else if (score > last) {
      api.say([word, score >= 3 ? P.passwordOk : P.passwordWeak].filter(Boolean), score >= 3 ? P.passwordOk : P.passwordWeak);
    } else if (word) Voice.say(word);
    last = score;
  }
  update();
  api.say(P.passwordIntro);
};

/* ---------- chat: pick the kind reply in a pretend message app ---------- */
Engines.chat = (api, act) => {
  let i = 0;
  const thread = h('div', { class: 'thread' });
  const replies = h('div', { class: 'replies' });
  const head = h('div', { class: 'phone-head' });
  api.stage.append(h('div', { class: 'phone' }, head, thread, replies));
  api.progress(0, act.items.length);
  const bubble = (who, text, emoji) => h('div', { class: 'bubble ' + who + ' pop-in' }, who === 'them' ? h('span', { class: 'avatar' }, emoji) : null, h('span', { class: 'bubble-text' }, text));
  function show(first) {
    const it = act.items[i];
    head.replaceChildren(h('span', { class: 'avatar' }, it.from), it.name);
    thread.replaceChildren(bubble('them', it.text, it.from));
    thread.lastChild.append(speaker(it.text));
    let solved = false;
    const btns = shuffle(it.replies).map(r => {
      const b = h('button', { class: 'reply', type: 'button' }, r.text);
      b.addEventListener('click', () => {
        if (solved || b.disabled) return;
        if (r.good) {
          solved = true; Sfx.good();
          replies.replaceChildren();
          thread.append(bubble('me', r.text));
          api.say([P.chatSent, r.feedback], r.feedback);
          api.later(() => {
            thread.append(bubble('them', it.react, it.from));
            Sfx.tap();
            i++; api.progress(i, act.items.length);
            const next = h('button', { class: 'big-btn go', type: 'button' }, P.next + ' ➡');
            next.addEventListener('click', () => i < act.items.length ? show() : api.win());
            replies.replaceChildren(next);
          }, 1400);
        } else {
          b.disabled = true; b.classList.add('wrong'); Sfx.oops(); wiggle(b);
          api.say(r.feedback);
        }
      });
      return h('div', { class: 'choice-row' }, speaker(r.text), b);
    });
    replies.replaceChildren(...btns);
    api.say(first ? [act.intro, it.text] : it.text, act.intro);
  }
  show(true);
};

/* ---------- spot: tap every ad on a pretend web page ---------- */
Engines.spot = (api, act) => {
  const ads = act.blocks.filter(b => b.ad).length;
  let found = 0;
  // shuffled, with random tints, so ads must be spotted by what they say
  const tints = ['#FFFBEA', '#FFF0F6', '#EEF7FF', '#F0FAF0', '#F6F0FF', '#FAFCFD'];
  const grid = h('div', { class: 'web-grid' }, shuffle(act.blocks).map(b => {
    const el = h('button', { class: 'web-block' + (b.ad ? ' is-ad' : ''), type: 'button', style: { background: pick(tints) } }, h('span', { class: 'wb-emoji' }, b.emoji), h('span', null, b.text));
    el.addEventListener('click', () => {
      if (el.classList.contains('found')) return;
      if (b.ad) {
        el.classList.add('found'); el.append(h('span', { class: 'ad-stamp' }, 'AD'));
        Sfx.good(); burst(el, '🔍'); found++;
        api.progress(found, ads);
        if (found === ads) { api.say([b.why, P.spotAllFound]); api.later(() => api.win(P.spotAllFound), 3800); }
        else api.say([b.why, P.spotLeft], b.why);
      } else {
        Sfx.oops(); wiggle(el); api.say([P.notAnAd, b.text], P.notAnAd);
      }
    });
    return el;
  }));
  api.stage.append(h('div', { class: 'browser' },
    h('div', { class: 'browser-bar' }, h('span', { class: 'b-dots' }, '● ● ●'), h('span', { class: 'b-url' }, '🔒 penguinfacts.kids')),
    h('h3', { class: 'web-title' }, '🐧 ' + act.pageTitle),
    grid));
  api.progress(0, ads);
  api.say(act.intro);
};

/* ---------- pledge: choose promises, sign, print ---------- */
Engines.pledge = (api, act) => {
  const chosen = new Set();
  const list = act.options.map((o, n) => {
    const b = h('button', { class: 'promise', type: 'button' }, h('span', { class: 'check' }), h('span', { class: 'pr-emoji' }, o.emoji), h('span', null, o.text));
    b.addEventListener('click', () => {
      chosen.has(n) ? chosen.delete(n) : chosen.add(n);
      b.classList.toggle('on', chosen.has(n));
      Sfx.tap(); if (chosen.has(n)) Voice.say(o.text);
      sign.classList.toggle('ready', chosen.size >= 3);
    });
    return h('div', { class: 'choice-row' }, speaker(o.text), b);
  });
  const sign = h('button', { class: 'big-btn go', type: 'button' }, '✍️ ' + P.next);
  sign.addEventListener('click', () => {
    if (chosen.size < 3) { wiggle(sign); api.say(P.pledgeNeed); return; }
    signStep();
  });
  api.stage.append(h('div', { class: 'pledge' }, h('div', { class: 'promises' }, list), sign));
  api.say(act.intro);

  function signStep() {
    const input = h('input', { class: 'name-input', maxlength: 24, placeholder: '✍️', 'aria-label': 'Your name', autocomplete: 'off' });
    const done = h('button', { class: 'big-btn go', type: 'button' }, '✓');
    const poster = () => {
      const name = input.value.replace(/[^A-Za-z \-']/g, '').trim();
      if (!name) { wiggle(input); api.say(P.nameFirst); return; }
      api.stage.replaceChildren(pledgePoster(act, [...chosen], name));
      api.win(null, { keepGoing: true });
    };
    done.addEventListener('click', poster);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') poster(); });
    api.stage.replaceChildren(h('div', { class: 'sign' },
      h('div', { class: 'sign-emoji' }, '✍️'), h('h2', null, P.pledgeDone), input, done));
    api.say([P.pledgeDone, P.typeName], P.pledgeDone);
  }
};
function pledgePoster(act, chosen, name) {
  const print = h('button', { class: 'big-btn no-print', type: 'button' }, '🖨️ Print');
  print.addEventListener('click', () => { Voice.say(P.printAsk); setTimeout(() => window.print(), 300); });
  return h('div', { class: 'poster-wrap' },
    h('div', { class: 'poster' },
      h('div', { class: 'poster-kicker' }, '🐾 Lynx Digital Citizens'),
      h('h2', null, 'My Digital Citizen Pledge'),
      h('ul', null, chosen.map(n => h('li', null, act.options[n].emoji + ' ' + act.options[n].text))),
      h('div', { class: 'poster-sign' }, h('span', null, name), h('small', null, 'Signed'))),
    print);
}

/* ---------- certificate ---------- */
Engines.certificate = (api, act) => {
  const input = h('input', { class: 'name-input', maxlength: 24, placeholder: '✍️', 'aria-label': 'Your name', autocomplete: 'off' });
  const go = h('button', { class: 'big-btn go', type: 'button' }, '✓');
  const show = () => {
    const n = input.value.replace(/[^A-Za-z \-']/g, '').trim();
    if (!n) { wiggle(input); api.say(P.nameFirst); return; }
    const print = h('button', { class: 'big-btn go no-print', type: 'button' }, '🖨️ Print');
    print.addEventListener('click', () => { Voice.say(P.printAsk); setTimeout(() => window.print(), 300); });
    api.stage.replaceChildren(h('div', { class: 'cert-wrap' },
      h('div', { class: 'cert' },
        h('div', { class: 'cert-paws' }, '🐾 🐾 🐾'),
        h('div', { class: 'cert-kicker' }, 'Lausanne Collegiate School · Second Grade'),
        h('h2', { class: 'cert-title' }, 'Digital Citizen'),
        h('div', { class: 'cert-sub' }, 'This certificate is awarded to'),
        h('div', { class: 'cert-name' }, n),
        h('div', { class: 'cert-for' }, 'for being safe, kind and responsible online.'),
        h('div', { class: 'cert-badges' }, CONTENT.weeks.map(w => h('div', { class: 'cert-badge' + (' on') }, h('span', null, w.emoji), w.kidTitle))),
        h('div', { class: 'cert-foot' }, h('span', null, new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })))),
      print));
    if (!Progress.has(act.id)) Progress.add(act.id);
    confetti(60); Sfx.win();
    api.say(act.intro);
  };
  go.addEventListener('click', show);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') show(); });
  api.stage.append(h('div', { class: 'sign' }, h('div', { class: 'sign-emoji' }, '🏆'), input, go));
  api.say(P.typeName);
};
