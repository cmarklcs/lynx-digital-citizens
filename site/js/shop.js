/* Coin Shop (Week 5, ties to the PYP Money and Exchange unit): buy everything on the
   party list with pretend coins, skip wants that blow the budget, close the trick ad,
   and ask a grown-up before paying. */
Engines.shop = (api, act) => {
  const list = shuffle(act.needs).slice(0, 3);
  const listCost = list.reduce((t, x) => t + x.price, 0);
  const budget = listCost + 3;
  const cur = act.currency || '🪙';
  let coins = budget, adShown = false, adOpen = false, checkingOut = false;
  const cart = [];
  const coinEl = h('b', null), listEl = h('ul', { class: 'shop-list' }), cartEl = h('div', { class: 'shop-cart' });
  const shelf = h('div', { class: 'shop-shelf' });
  const pay = h('button', { class: 'big-btn go shop-pay', type: 'button' }, '🧾 ' + act.checkout);
  const ad = h('div', { class: 'shop-ad hidden' });

  shuffle([...list, ...act.wants]).forEach(item => {
    const b = h('button', { class: 'shop-item', type: 'button' },
      h('span', { class: 'si-emoji' }, item.emoji), h('span', { class: 'si-name' }, item.label), h('span', { class: 'si-price' }, cur + ' ' + item.price));
    b.addEventListener('click', () => buy(item, b));
    shelf.append(b);
  });

  api.stage.append(h('div', { class: 'shop' },
    h('div', { class: 'shop-side' },
      h('div', { class: 'shop-wallet' }, h('span', null, act.wallet || '👛'), coinEl, h('small', null, act.coinsLabel)),
      h('div', { class: 'shop-listbox' }, h('div', { class: 'shop-h' }, '📝 ' + act.listLabel, speaker([act.listLabel, ...list.map(x => x.label)])), listEl),
      h('div', { class: 'shop-h' }, '🛒 ' + act.cartLabel), cartEl, pay),
    shelf, ad));
  api.progress(0, 3);
  render();
  api.say([act.intro, act.listSay, ...list.map(x => x.label)], act.intro);

  function render() {
    coinEl.textContent = coins;
    listEl.replaceChildren(...list.map(x => h('li', { class: cart.includes(x) ? 'got' : '' }, (cart.includes(x) ? '✅ ' : '⬜ ') + x.emoji + ' ' + x.label)));
    cartEl.replaceChildren(...(cart.length ? cart.map(x => {
      const c = h('button', { class: 'cart-item', type: 'button', 'aria-label': 'Take out' }, x.emoji, h('small', null, '✕'));
      c.addEventListener('click', () => { if (checkingOut) return; cart.splice(cart.indexOf(x), 1); coins += x.price; Sfx.tap(); api.say(act.putBack); render(); });
      return c;
    }) : [h('span', { class: 'cart-empty' }, '—')]));
    const got = list.filter(x => cart.includes(x)).length;
    api.progress(got === list.length ? 2 : got > 0 ? 1 : 0, 3);
  }
  function buy(item, b) {
    if (adOpen || checkingOut) { if (adOpen) { wiggle(ad); api.say(act.closeAdFirst); } return; }
    if (cart.includes(item)) { api.say(act.already); return; }
    if (item.price > coins) { Sfx.oops(); wiggle(b); api.say(act.notEnough); return; }
    coins -= item.price; cart.push(item); Sfx.tap(); burst(b, cur);
    const want = !list.includes(item);
    const left = list.filter(x => !cart.includes(x)).reduce((t, x) => t + x.price, 0);
    if (want && left > coins) api.say([item.label, act.wantWarning]);
    else if (want) api.say([item.label, act.wantOk]);
    else api.say(item.label);
    render();
    if (!adShown && cart.length >= 2) api.later(showAd, 900);
  }
  function showAd() {
    adShown = adOpen = true;
    const close = h('button', { class: 'ad-x', type: 'button', 'aria-label': 'Close' }, '✕');
    const bait = h('button', { class: 'ad-bait', type: 'button' }, h('span', null, act.adEmoji || '🎁'), h('b', null, act.adText), h('span', { class: 'ad-tap' }, act.adButton));
    bait.addEventListener('click', () => { Sfx.oops(); wiggle(ad); api.say(act.adTrick); });
    close.addEventListener('click', () => { adOpen = false; ad.classList.add('hidden'); Sfx.good(); api.say(act.adClosed); });
    ad.replaceChildren(h('div', { class: 'ad-card pop-in' }, close, bait));
    ad.classList.remove('hidden');
    api.say(act.adAppears);
  }
  pay.addEventListener('click', () => {
    if (adOpen) { wiggle(ad); api.say(act.closeAdFirst); return; }
    if (list.some(x => !cart.includes(x))) { wiggle(pay); api.say(act.finishList); return; }
    checkingOut = true; api.progress(2, 3);
    const box = h('div', { class: 'shop-ask pop-in' });
    ad.replaceChildren(box); ad.classList.remove('hidden');
    scenarioViewInto(box, api, act.payQuiz, () => {
      ad.classList.add('hidden'); api.progress(3, 3);
      api.win(act.winSay);
    });
  });
};

/* A single scenario question drawn inside `box` instead of the whole stage. */
function scenarioViewInto(box, api, it, onDone) {
  let solved = false;
  const feedback = h('div', { class: 'feedback' });
  const rows = shuffle(it.choices).map(ch => {
    const b = h('button', { class: 'choice', type: 'button' }, ch.text);
    b.addEventListener('click', () => {
      if (solved || b.disabled) return;
      if (ch.good) { solved = true; b.classList.add('right'); Sfx.good(); burst(b); api.say([api.right(), ch.feedback], ch.feedback); setTimeout(onDone, 2600); }
      else { b.classList.add('wrong'); b.disabled = true; Sfx.oops(); wiggle(b); feedback.className = 'feedback wrong'; feedback.textContent = '🤔 ' + ch.feedback; api.say(ch.feedback); }
    });
    return h('div', { class: 'choice-row' }, speaker(ch.text), b);
  });
  box.replaceChildren(h('div', { class: 'story' }, h('div', { class: 'story-emoji' }, it.emoji), h('div', { class: 'story-text' }, it.text)), h('div', { class: 'choices' }, rows), feedback);
  api.say(it.text, it.text);
}
