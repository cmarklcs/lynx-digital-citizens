/* Keyboard work for the iPad keyboards: a letter-by-letter typing box,
   Meet the Keyboard (Week 1), and Type a Kind Reply (Week 4). */

/* Type `target` into a real text box. Each right letter turns green; a wrong one is
   rejected. Punctuation and emoji fill in by themselves unless `exact` is set
   (passwords need every capital and symbol). Press Return when it's all typed. */
function typeBox(api, target, { exact = false, mask = false, onDone } = {}) {
  const cps = [...target];            // code points, so emoji count as one
  let typed = [], done = false;
  const auto = ch => !exact && !/[A-Za-z0-9 ]/.test(ch);
  const letters = cps.map(ch => h('span', { class: 'tb-ch' + (ch === ' ' ? ' sp' : '') }, ch === ' ' ? '␣' : ch));
  const input = h('input', { class: 'tb-input', type: mask ? 'password' : 'text', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Type here' });
  const ret = h('button', { class: 'big-btn go tb-return', type: 'button' }, '⏎ ' + P.returnKey);
  const box = h('div', { class: 'typebox' }, h('div', { class: 'tb-target' }, letters), h('div', { class: 'tb-row' }, input, ret));
  const fill = () => { while (typed.length < cps.length && auto(cps[typed.length])) typed.push(cps[typed.length]); };
  function render() {
    const n = typed.length;
    letters.forEach((l, k) => { l.classList.toggle('ok', k < n); l.classList.toggle('next', k === n); });
    input.value = typed.join('');
    ret.classList.toggle('ready', n === cps.length);
  }
  input.addEventListener('input', () => {
    if (done) return;
    const v = [...input.value];
    if (v.length <= typed.length) { typed = typed.slice(0, v.length); render(); return; }
    for (const ch of v.slice(typed.length)) {
      const want = cps[typed.length];
      if (want == null) break;
      const ok = exact ? ch === want : ch.toLowerCase() === want.toLowerCase();
      if (!ok) {
        Sfx.oops(); wiggle(letters[typed.length]);
        if (exact && ch.toLowerCase() === want.toLowerCase()) api.say(want === want.toUpperCase() ? P.needShift : P.noShift);
        else if (want === ' ') api.say(P.needSpace);
        break;
      }
      typed.push(ch); fill();
    }
    if (typed.length === cps.length) Sfx.good();
    render();
  });
  const finish = () => {
    if (done) return;
    if (typed.length < cps.length) { wiggle(input); api.say(P.keepTyping); input.focus(); return; }
    done = true; input.blur(); onDone && onDone();
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finish(); } });
  ret.addEventListener('click', finish);
  fill(); render();
  setTimeout(() => input.focus(), 50);
  return box;
}

/* ---------- Meet the Keyboard ---------- */
Engines.keyboard = (api, act) => {
  const ROWS = [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'delete'],
                ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'return'],
                ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'arrows'],
                ['space']];
  const LABEL = { delete: '⌫ delete', return: 'return ⏎', shift: '⇧ shift', space: 'space', arrows: '◀ ▶' };
  const KEYMAP = { ' ': 'space', Enter: 'return', Backspace: 'delete', Shift: 'shift', ArrowLeft: 'arrows', ArrowRight: 'arrows', ArrowUp: 'arrows', ArrowDown: 'arrows' };
  const keys = {};
  const board = h('div', { class: 'kb' }, ROWS.map(r => h('div', { class: 'kb-row' }, r.map(k => {
    const b = h('button', { class: 'kb-key k-' + k + (k.length > 1 ? ' wide' : ''), type: 'button', tabindex: '-1' }, LABEL[k] || k);
    b.addEventListener('click', () => press(k, true));
    keys[k] = b; return b;
  }))));
  const area = h('div', { class: 'kb-wrap' }, h('div', { class: 'kb-tip' }, '⌨️ ' + act.tip), board);
  api.stage.append(area);
  const named = shuffle(act.keys).map(k => ({ ...k, q: k.ask }));
  const clues = shuffle(act.keys).map(k => ({ ...k, q: k.clue, clue: true }));
  const order = named.concat(clues);
  const total = order.length + 1;
  let i = 0, busy = false, typing = false;
  const onKey = e => {
    if (typing) return;
    const k = KEYMAP[e.key] || (/^[a-z]$/i.test(e.key) ? e.key.toLowerCase() : null);
    if (!k) return;
    e.preventDefault();
    press(k, false);
  };
  window.addEventListener('keydown', onKey);
  api.cleanup(() => window.removeEventListener('keydown', onKey));
  api.progress(0, total);

  function press(k, tapped) {
    const b = keys[k];
    if (b) { b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 180); }
    if (busy || typing || i >= order.length) return;
    const want = order[i];
    if (k !== want.id) {
      if (b) { Sfx.oops(); wiggle(b); }
      api.say([act.wrongSay, want.q], want.q);
      return;
    }
    Object.values(keys).forEach(x => x.classList.remove('lit'));
    b.classList.add('lit', 'found'); Sfx.good(); burst(b);
    i++; api.progress(i, total);
    const lines = [tapped ? act.tapNote : api.right(), want.clue ? null : want.info].filter(Boolean);
    if (i === named.length) {
      busy = true;
      api.say([...lines, act.clueIntro, order[i].q], order[i].q);
      api.later(() => { Object.values(keys).forEach(x => x.classList.remove('found')); busy = false; }, 1200);
    } else if (i < order.length) api.say([...lines, order[i].q], order[i].q);
    else typeRound(lines);
  }
  function typeRound(lines) {
    typing = true;
    const tb = typeBox(api, act.typeWord, { onDone: () => { api.progress(total, total); api.win(act.winSay); } });
    area.prepend(h('div', { class: 'kb-type pop-in' }, tb));
    api.say([...lines, act.typeAsk], act.typeAsk);
  }
  api.say([act.intro, order[0].q], order[0].q);
};

/* ---------- Type a Kind Reply: pick the kind reply, then type it and press Return ---------- */
Engines.typechat = (api, act) => {
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
    const rows = shuffle(it.replies).map(r => {
      const b = h('button', { class: 'reply', type: 'button' }, r.text);
      b.addEventListener('click', () => {
        if (solved || b.disabled) return;
        if (!r.good) { b.disabled = true; b.classList.add('wrong'); Sfx.oops(); wiggle(b); api.say(r.feedback); return; }
        solved = true; Sfx.good();
        const tb = typeBox(api, r.text, { onDone: () => send(it, r) });
        replies.replaceChildren(tb);
        api.say([r.feedback, act.typeAsk], act.typeAsk);
      });
      return h('div', { class: 'choice-row' }, speaker(r.text), b);
    });
    replies.replaceChildren(...rows);
    api.say(first ? [act.intro, it.text] : it.text, act.intro);
  }
  function send(it, r) {
    replies.replaceChildren();
    thread.append(bubble('me', r.text));
    api.say(P.chatSent);
    api.later(() => {
      thread.append(bubble('them', it.react, it.from)); Sfx.tap();
      i++; api.progress(i, act.items.length);
      if (i >= act.items.length) { api.later(() => api.win(act.winSay), 900); return; }
      const next = h('button', { class: 'big-btn go', type: 'button' }, P.next + ' ➡');
      next.addEventListener('click', () => show());
      replies.replaceChildren(next);
    }, 1200);
  }
  show(true);
};
