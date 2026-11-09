# Lynx Digital Citizens

Six weeks of digital citizenship activities for Lausanne second graders on iPad. Static site in `site/`, published by GitHub Pages on every push to `main`.

| Week | Topic | Activities |
|---|---|---|
| 1 | My iPad, My Job | iPad Care (sort), What Would You Do? (stories), Real World, Online World (match) |
| 2 | Screen Time, Green Time | Screen or Green? (sort), Balance My Day (planner), How Does It Feel? (stories) |
| 3 | Keep It Private | Private or OK to Share? (sort), Super Password Maker, Should I Share? (stories) |
| 4 | Kind Words Online | Kind or Unkind? (sort), Pick a Kind Reply (pretend chat), Think Before You Send (stories) |
| 5 | Stop, Think, Tell | Stop, Think, Tell (stories), Spot the Ads, Who Can I Tell? (sort) |
| 6 | My Digital Footprint | Footprint Check (sort), Be an Upstander (stories), Digital Citizen Pledge, Certificate |

The teacher guide is at `#/teacher`: lesson routine, I-can statements, hooks, discussion questions, home connections and a printable skills checklist.

## Read-aloud

Every student-facing line is recorded with the Mac's System voice (set to Siri) by `build.py`, so iPads play a natural voice. Lines without a recording fall back to the iPad's built-in voice. iPads only allow sound after a tap, which is why the site opens on a "Tap to start" screen.

## Editing

1. Change words in `data/content.json` (student activities) or `data/teacher.json` (teacher guide).
2. Run `python3 build.py`. It records any new lines and rewrites `site/js/content.js`.
3. Bump the `?v=` numbers in `site/index.html`, then commit and push.

Badges, the pledge and the student's name are saved in Safari on each iPad (localStorage). Nothing is sent anywhere.
