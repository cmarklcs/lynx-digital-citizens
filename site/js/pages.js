/* Pages: home, week, activity and teacher guide. Hash routes:
   #/  ·  #/week/3  ·  #/play/password  ·  #/teacher */

function homePage(mount) {
  mount.append(
    h('div', { class: 'hero' },
      h('div', null,
        h('h1', null, 'Lynx Digital Citizens'),
        h('p', { class: 'hero-sub' }, 'Safe, kind and responsible online')),
      h('div', { class: 'hero-art', 'aria-hidden': 'true' }, '🦸📱')),
    h('div', { class: 'week-grid' }, CONTENT.weeks.map(w => {
      const done = w.activities.filter(a => Progress.has(a.id)).length;
      const a = h('a', { class: 'week-card', href: '#/week/' + w.n, style: { '--wk': w.color } },
        h('span', { class: 'wc-num' }, 'Week ' + w.n),
        h('span', { class: 'wc-emoji' }, w.emoji),
        h('span', { class: 'wc-title' }, w.kidTitle),
        h('span', { class: 'wc-progress' }, w.activities.map(x => h('i', { class: Progress.has(x.id) ? 'on' : '' }))),
        done === w.activities.length ? h('span', { class: 'wc-badge' }, '🏅') : null);
      a.append(speaker(`Week ${w.n}. ${w.kidTitle}`, 'corner'));
      return a;
    })),
    h('footer', { class: 'foot' }, h('a', { href: '#/teacher' }, '👩‍🏫 Teacher guide')));
}

function weekPage(mount, n) {
  const w = CONTENT.weeks.find(x => x.n === n);
  if (!w) return homePage(mount);
  const prev = CONTENT.weeks.find(x => x.n === n - 1), next = CONTENT.weeks.find(x => x.n === n + 1);
  mount.append(...[
    h('div', { class: 'week-head', style: { '--wk': w.color } },
      h('a', { class: 'back-btn', href: '#/', 'aria-label': 'Home' }, '🏠'),
      h('div', { class: 'wh-emoji' }, w.emoji),
      h('div', null, h('div', { class: 'wh-num' }, 'Week ' + w.n), h('h1', null, w.kidTitle)),
      speaker([`Week ${w.n}. ${w.kidTitle}`, w.bigIdea])),
    h('div', { class: 'big-idea' }, h('b', null, '💡 Big idea: '), w.bigIdea),
    h('div', { class: 'words' }, w.words.map(x => {
      const b = h('button', { class: 'word-chip', type: 'button' }, h('b', null, '🔊 ' + x.word), h('span', null, x.meaning));
      b.addEventListener('click', () => Voice.say(`${x.word}. ${x.meaning}.`));
      return b;
    })),
    h('div', { class: 'act-grid' }, w.activities.map((a, i) => {
      const card = h('a', { class: 'act-card', href: '#/play/' + a.id, style: { '--wk': w.color } },
        h('span', { class: 'ac-num' }, i + 1),
        h('span', { class: 'ac-emoji' }, a.emoji),
        h('span', { class: 'ac-title' }, a.title),
        h('span', { class: 'ac-done' }, Progress.has(a.id) ? '🏅' : ''));
      card.append(speaker(a.title, 'corner'));
      return card;
    })),
    h('div', { class: 'week-nav' },
      prev ? h('a', { class: 'big-btn alt', href: '#/week/' + prev.n }, '⬅ Week ' + prev.n) : h('span'),
      next ? h('a', { class: 'big-btn alt', href: '#/week/' + next.n }, 'Week ' + next.n + ' ➡') : h('span'))
  ]);
  Voice.say([`Week ${w.n}. ${w.kidTitle}`, w.bigIdea]);
}

function teacherPage(mount) {
  const T = TEACHER;
  const allCodes = CONTENT.weeks.flatMap(w => T.weeks[w.n].check.map(c => c.split(' ')[0]));
  const printList = h('button', { class: 'tp-btn', type: 'button' }, '🖨️ Print skills checklist');
  printList.addEventListener('click', () => { document.body.classList.add('print-checklist'); window.print(); setTimeout(() => document.body.classList.remove('print-checklist'), 500); });
  const reset = h('button', { class: 'tp-btn warn', type: 'button' }, 'Clear badges on this iPad');
  reset.addEventListener('click', () => { if (confirm('Clear the badges on this iPad?')) { Progress.reset(); App.route(); } });

  mount.append(h('div', { class: 'teacher' },
    h('div', { class: 'tp-head' }, h('a', { class: 'back-btn', href: '#/', 'aria-label': 'Home' }, '🏠'),
      h('div', null, h('h1', null, 'Teacher guide'), h('p', null, 'Second Grade Digital Citizenship · six weekly lessons on iPad'))),
    h('section', { class: 'tp-card' },
      h('h2', null, 'Course overview'), h('p', null, T.overview), h('p', { class: 'tp-note' }, '📐 ' + T.standard),
      h('p', { class: 'tp-note' }, '🌍 PYP link: ' + T.pyp)),
    h('section', { class: 'tp-card' },
      h('h2', null, 'Six weeks at a glance'),
      h('table', { class: 'tp-table' },
        h('thead', null, h('tr', null, ['Week', 'Topic', 'I can…', 'Activities'].map(t => h('th', null, t)))),
        h('tbody', null, CONTENT.weeks.map(w => h('tr', null,
          h('td', null, h('a', { href: '#/week/' + w.n }, w.emoji + ' ' + w.n)),
          h('td', null, w.title),
          h('td', null, T.weeks[w.n].ican),
          h('td', null, w.activities.map(a => h('a', { class: 'tp-act', href: '#/play/' + a.id }, a.emoji + ' ' + a.title)))))))),
    h('section', { class: 'tp-card tp-two' },
      h('div', null, h('h2', null, 'Every lesson'),
        h('table', { class: 'tp-table' }, h('tbody', null, T.routine.map(([m, part, what]) => h('tr', null, h('td', null, m), h('td', null, h('b', null, part)), h('td', null, what)))))),
      h('div', null, h('h2', null, 'Before you begin'),
        h('ul', { class: 'tp-check' }, T.before.map(t => h('li', null, h('label', null, h('input', { type: 'checkbox' }), ' ' + t)))))),
    CONTENT.weeks.map(w => {
      const t = T.weeks[w.n];
      return h('section', { class: 'tp-card tp-week', style: { '--wk': w.color } },
        h('h2', null, `${w.emoji} Week ${w.n}: ${w.title}`),
        h('p', null, h('b', null, 'I can: '), t.ican),
        h('p', null, h('b', null, 'Big idea: '), w.bigIdea),
        h('p', null, h('b', null, 'Vocabulary: '), w.words.map((x, i) => [i ? ' · ' : '', h('i', null, x.word), ' – ' + x.meaning])),
        h('p', null, h('b', null, 'Hook: '), t.hook),
        h('p', null, h('b', null, 'Activities: '), w.activities.map((a, i) => [i ? ' · ' : '', h('a', { href: '#/play/' + a.id }, a.title)])),
        h('div', null, h('b', null, 'Discussion questions:'), h('ul', null, t.discuss.map(q => h('li', null, q)))),
        h('p', { class: 'tp-note' }, '🌍 PYP Money and Exchange: ' + t.pyp),
        h('p', { class: 'tp-note' }, '🏠 Home connection: ' + t.home),
        h('p', null, h('b', null, 'Checklist: '), t.check.join(' · ')));
    }),
    h('section', { class: 'tp-card' },
      h('h2', null, 'This iPad'),
      h('p', null, `Class iPads are shared, so badges only last for one student’s lesson. They clear by themselves after an hour with no play, or when a student taps “New student” on the start screen. Names are never saved, and nothing is sent online. Badges on this iPad right now: 🏅 ${Progress.count()}.`),
      reset),
    h('section', { class: 'tp-card checklist' },
      h('div', { class: 'tp-row' }, h('h2', null, 'Skills checklist'), printList),
      h('p', null, h('b', null, 'Rating key: '), T.checklistKey),
      h('table', { class: 'tp-table codes' }, h('tbody', null, CONTENT.weeks.flatMap(w => T.weeks[w.n].check.map(c => h('tr', null, h('td', null, c.slice(0, 2)), h('td', null, c.slice(3)))))))),
      h('table', { class: 'tp-table roster' },
        h('thead', null, h('tr', null, h('th', null, 'Student'), allCodes.map(c => h('th', null, c)), h('th', null, 'Notes'))),
        h('tbody', null, Array.from({ length: 22 }, () => h('tr', null, h('td'), allCodes.map(() => h('td')), h('td')))))));
}

const App = {
  stop: null,
  route() {
    if (this.stop) { this.stop(); this.stop = null; }
    Voice.stop();
    const mount = document.getElementById('app');
    mount.innerHTML = '';
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    document.body.dataset.page = parts[0] || 'home';
    if (parts[0] === 'week') weekPage(mount, +parts[1]);
    else if (parts[0] === 'play' && findActivity(parts[1])) this.stop = runActivity(parts[1], mount);
    else if (parts[0] === 'teacher') teacherPage(mount);
    else homePage(mount);
    window.scrollTo(0, 0);
  }
};

window.addEventListener('hashchange', () => App.route());
const muteBtn = document.getElementById('muteBtn');
muteBtn.textContent = Sfx.muted() ? '🔇' : '🔊';
muteBtn.addEventListener('click', () => {
  const m = !Sfx.muted(); Store.set('muted', m);
  muteBtn.textContent = m ? '🔇' : '🔊';
  if (m) Voice.stop();
});
updateBadgeCount();

/* iPads need one tap before any sound can play, so the first screen is a big start button. */
const start = document.getElementById('start');
const fresh = start.querySelector('.start-new');
if (Progress.count()) fresh.classList.remove('hidden');
fresh.addEventListener('click', () => { Progress.reset(); fresh.textContent = '✓ 🏅 0'; Voice.unlock(); Voice.say(P.freshStart); });
start.querySelector('.start-btn').addEventListener('click', () => {
  Voice.unlock();
  start.remove();
  App.route();
});
if (location.hash.startsWith('#/teacher')) { start.remove(); App.route(); }
