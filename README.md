# Lynx Digital Citizens

Six weeks of digital citizenship activities for Lausanne second graders on shared class iPads. No prior knowledge is assumed: each week starts with a Learn It read-aloud picture story that explains the idea, then a quick check question, before the practice activities. Static site in `site/`, published by GitHub Pages on every push to `main`.

| Week | Topic | Activities |
|---|---|---|
| 1 | My iPad, My Job | Learn It: What Is Online? (puzzles), Meet the iPad (names, then clues), iPad Care (sort), Walk It to the Cart (4 levels, moving obstacles), What Would You Do? (stories), Ready for the Next Friend (close apps, two-digit cart spot, plug in), Where Do iPads Come From? (producers, consumers, goods, services), Real World, Online World (match) |
| 2 | Screen Time, Green Time | Learn It: What Is Screen Time? (puzzles), Screen or Green? (sort), Spend My Time Coins (planner), How Does It Feel? (stories), Screen-Free Times (challenge), Saturday Time Budget (budget game) |
| 3 | Keep It Private | Learn It: What Is Private? (puzzles), Private or OK to Share? (sort), Super Password Maker, Should I Share? (stories), Password and Privacy Detective (challenge) |
| 4 | Kind Words Online | Learn It: Real People, Real Feelings (puzzles), Kind or Unkind? (sort), Pick a Kind Reply (pretend chat), Think Before You Send (stories), Fix the Message (challenge) |
| 5 | Stop, Think, Tell | Learn It: Stop, Think, Tell (puzzles), Stop, Think, Tell (stories), Spot the Ads, Who Can I Tell? (sort), Coin Shop (budget game), Real or Trick? (challenge) |
| 6 | My Digital Footprint | Learn It: What Is a Digital Footprint? (puzzles), Footprint Check (sort), Be an Upstander (stories), The Grandma Test (challenge), Digital Citizen Pledge, Certificate |

**PYP link.** The course ties into the PYP unit on Money and Exchange (How we organize ourselves). Weeks 1 and 2 are fully integrated: shared iPads as a resource bought with money, fair turn-taking, producers and consumers, goods and services, time as a currency, budgets, and trade-offs. Weeks 3–6 carry the thread through information as something of value, fair trades, needs vs. wants, ads, and real money in games. Each week's PYP note is in the teacher guide.

The teacher guide is at `#/teacher`: lesson routine, I-can statements, hooks, discussion questions, home connections and a printable skills checklist.

## Read-aloud

Every student-facing line is recorded with the Mac's System voice (set to Siri) by `build.py`, so iPads play a natural voice. Lines without a recording fall back to the iPad's built-in voice. iPads only allow sound after a tap, which is why the site opens on a "Tap to start" screen.

## Editing

1. Change words in `data/content.json` (student activities) or `data/teacher.json` (teacher guide).
2. Run `python3 build.py`. It records any new lines and rewrites `site/js/content.js`.
3. Bump the `?v=` numbers in `site/index.html`, then commit and push.

The iPads are shared, so badges only last one student's lesson: they clear after an hour with no play, or when a student taps "New student" on the start screen. Names typed on the pledge and certificate are never saved. Nothing is sent anywhere.
