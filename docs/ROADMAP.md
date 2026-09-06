# Roadmap — known limitations and agreed next steps

> Moved out of `CLAUDE.md`, verbatim.

## Known limitations

- **The crates section's trial has no crate in it.** Every other trial uses
  the piece its section teaches — spikes take away the squares you would have
  dodged into, glass is the fold platform, and `TRIAL IV` mixes all three
  sweep axes — but a crate needs somewhere to be shoved *to*, and every
  arrangement tried either left the crate unshovable (you can only push it
  along the row you are standing in, so a crate on a one-wide catwalk can
  never leave its column) or made it decoration. The shape that would work is
  a crate that supplies a silhouette column no stone supplies, which needs a
  lane at another depth to shove it along; that is a real level and it has not
  been built yet.
- **`trialSafety()` checks the volume only.** In the plane a sweep down the
  view axis is unsurvivable, which is the mechanic and not a bug, so there is
  nothing there to check — but the machine has no opinion at all about the
  state you spend the crossing in.
- **Boss and sweep pacing are both guesswork, and they are now the only
  answer to "it is too fast".** Trials run `period` 2500, **2050**, 2100,
  2000. `TRIAL II` sits just inside the two after it rather than well past
  them, and the reason is its own geometry: every crossing there is a fold
  taken from a particular side, so the player spends a leg turning and
  folding rather than walking, and standing still under a slow beat is a
  level waiting for you. It was played at 1850 and wound back — these are
  players four levels into their second section, and a beat that punishes a
  turn you are still learning to plan is a wall rather than tension. Bosses ramp
  *within* a fight and *across* the campaign — `BOSS I` runs 1100/1300 down
  to 870/1020 and `BOSS IV` 720/850 down to 570/660, so the opening fight is
  about 40% slower than it was and the last one is where it always sat.
  **This ramp is what the `Pace` setting used to stand in for**, and with
  that row gone it has to carry the whole load: a first boss slow enough to
  think in, rather than a menu asking a new player to diagnose their own
  difficulty. Every number in it is invented. The checks bracket each fight;
  they say nothing about whether the numbers are *fun*, or whether a human
  can read a line, decide the axis, rotate and fold inside one beat.
- **Nobody has played the phased fights.** Four bosses × three phases is a lot
  of authored pacing that has only ever been machine-checked. The specific
  open questions: does phase 1 read as a tutorial or as filler; is the
  arrival of the pillars legible or does it just feel like being interrupted;
  and does a `cunning` hunter read as *smart* or merely as evasive.
- **`bosssim`'s duellist is not a good player.** It never herds — it does not
  pick a square in order to put a hunter on a line — and it reacts every
  200ms with perfect knowledge. It clears the four arenas in 4 to 7 seconds,
  which says the fights are winnable, not that they are the right length.
  It has needed two corrections, both facts about the rules rather than
  heuristics, and both found when it declared a fine arena unwinnable. It has
  to be told that height matters (a square at the wrong `y` cannot be attacked
  from at all), or it climbs the first pillar between it and a hunter and
  oscillates above anything it could kill. And it needs the same best-distance
  patience valve the hunters have, or refusing to stand in a pillar's shadow
  — worth more to it than one step of distance — makes it pace between two
  squares forever while it is charged. Crossing a shadow was always safe; it
  is folding from one that kills.
- **The lunge is instant and unblockable once the beat ends.** It is
  telegraphed for `aim` milliseconds and breaking the line cancels it, so it
  is fair — but there is no partial answer, no grazing hit, and a player who
  misreads the axis simply takes it.
- **Real time is the one thing the game is not, and the `Pace` setting that
  conceded it is gone.** `NORMAL` / `EASED` / `SLOW` = 1 / .75 / .5 let a
  player slow every clock in the game. It went on the owner's call, for the
  reason that was always written under it: a menu row asking a new player to
  diagnose their own difficulty stands in for a fight that is not tuned, and
  the fights are tuned per fight now. What is left for somebody stuck is the
  skip, on the fifth loss. **`paceScale()` stays** — still one multiplication
  on `dt` at the top of `bossFrame` and `trialFrame` — because that
  multiplication is the seam it would come back through, and it is why every
  window in a fight keeps its ratio when it does: `step` and `aim` belong to
  the *phase*, and `creep`, `rage`, `period`, `fire` and the beat of grace
  are all measured against the same clock. **`pace` is deliberately no longer
  read by `loadSettings()`**, so a save written while somebody was on SLOW
  cannot pin every clock in the game at half speed with no row left to change
  it — the whitelist trap, running the other way.
- **The composer cannot generate crates or keys.** It synthesises geometry move
  by move from a solution; a push changes the world, so the geometry cannot be
  derived that way without re-deriving everything downstream. Crate and key
  levels come from random small worlds filtered by the solver instead.
- **Repair fails when the shortcut shares every square with the intended path.**
  No cell to block. Currently unfixable; reported to the user.
- **Collapse immediately followed by restore** does no work in the plane, so the
  solver usually skips the pair. Warned about, not blocked.
- **Difficulty tiers are calibrated against single-fold levels**, so any
  multi-fold level reads hard or brutal by construction. That is the scale, not
  necessarily the feel.
- **A solved level is inert, and `levelOver()` is what makes it so.** For a
  long time `levelDone` stopped the boss and trial clocks and nothing else —
  the win card is a full-bleed overlay, so it blocked every other control by
  physically sitting in front of it. That is a physical guard, not a logical
  one, and the moment anything dismissed the card without leaving the level
  (the win card's `LEVELS` button does exactly that) you could walk, fold,
  turn, undo and spend hints on a level already scored and written. Every
  turn-based verb now asks `levelOver()` first, and it **re-shows the win
  card** rather than swallowing the input — the card is the only thing that
  explains why nothing is responding, and it carries the ways out. It stays
  quiet while a panel is open, because at z-index 20 it would bury the picker
  the player just asked for.
- **The two-finger drag is unproven on real glass.** It is the one gesture that
  asks iOS to keep its hands off a two-finger move, and `user-scalable=no` is
  ignored there — `touch-action:none` on the body is what should hold it, and
  that has not been tested on a device.
- **The follow camera is OFF, and the bigger world is why.** `FOLLOW=0` is
  the old, arena-framing camera. It was on trial to give depth back as
  *motion* — step in depth and the world slides vertically — and it worked at
  the old framing, where every hunter spawn stayed on screen with the player
  in the worst corner (worst 0.87). It does not survive the bigger world:
  measured again after the frustum change, **every boss and trial had spawns
  outside the frustum** with the player in a corner, worst 1.38. Being able
  to see the puzzle beats a motion cue, especially on the two kinds of level
  that already beat the first real playtester. `FOLLOW=1` brings it back at
  the cost of that framing.
- **A fold preview is the obvious next thing and is not built.** The owner's
  idea, worth testing: a control that shows *which blocks you would travel
  to* if you folded along the current axis — the mirror of peek, answering
  the question one move earlier. It must not replace `GO 2D`; it would be its
  own control, and on the default layout that means a gesture as well.
- **Two-finger tap only rotates right.** There is no left-rotate gesture.
- **The gesture tutorial has no keyboard half yet, and the default now walks
  straight into that.** HIDDEN is the default layout, the lesson follows the
  layout, so a desktop first run is shown a swiping hand by somebody holding
  a mouse. The intended end state is one lesson that teaches whatever the
  device actually has — gestures on glass, keys on a desktop. `TUT_SAY`
  already has the shape for it: a third table of phrases and a third
  demonstration (a key cap rather than a hand), keyed by the same cue ids.
- **The ghost hand has never been played, only screenshotted.** The open
  questions are all feel: is a hand looping for the whole step help or noise,
  is .62 against 1.0 enough of a step up when the guided lock arms, and does
  the two-finger demo read as *two fingers* rather than as a wide swipe.

---

## Agreed next steps

0. **Build the keyboard half of the lesson**: a `keys` table in `TUT_SAY`
   and a key-cap demonstration beside the hand. **The bar is off by default
   now** — `settings.ui` starts at `none` — and the lesson follows the
   layout, so a desktop first run gets a swiping hand shown to somebody
   holding a mouse. That is the gap this closes.
1. **Playtest the three phased bosses.** They are real-time, which is the one
   thing no tool here can judge, and the ramp has still barely been felt. The
   questions: can a human read which axis to fold along while a line is lit,
   is `aim` long enough to rotate first, does the trial's beat of grace read
   as mercy or as being let off, and does the arc — nothing, then the ground,
   then two of them — land in three beats now that the `cunning` phase has
   gone.
2. **More gentle levels — the opening is fixed, the middle is not.** Section I
   was the urgent case and now runs 14, 21, 16, 28 out of the tutorial.
   What is left is thinner and further in: `II` still jumps 17 → 27 in one
   step and `III` 24 → 29, and every level in the locked shelf reads `brutal`
   — a whole section with one texture. The composer can make ordinary levels
   but not crate or key ones, and its 59% hit rate means hand-checking a
   batch.
3. **A crate trial**, per the limitation above.
3a. **Move `IV · CRATES` in front of `III · WATER`** — the owner's call, taken
   and deferred deliberately because it is not a reorder: crate levels teach
   against geometry that assumes what came before, several later levels mix
   the two, and every affected level needs re-verifying and a
   `LEVEL_RENAMES` entry. Worth doing, worth doing on its own.
4. **Negative constraint tracking in the composer.** Synthesis is still greedy
   and violations are only caught at verification. Recording "this silhouette
   column must stay empty" as each move demands it would fail fast. The one
   remaining idea with real headroom.
5. **Eject on folding into a wall** instead of crushing — the Fez approach.
   Would let you climb by folding into geometry, genuinely expanding the design
   space, but it *adds* moves rather than removing them, so every level would
   need re-verification and some would break.
6. **More state.** Crates broke the "nothing changes" ceiling; spikes added
   failure. There is still no switch, no door, nothing that changes the *rules*
   mid-level.
7. **Keys.** Currently cut. Collecting them in the plane tied them to the fold,
   but they still read as an errand rather than a puzzle.
8. **Explain the four things that beat the first real playtester** — the
   owner's mother, who died repeatedly on trials and bosses. In order of how
   much they cost her: **which block you land on** coming out of a fold,
   **how a trial works** (three cores, a sweeping plane, three lives), **how
   a boss works** (the line is both its attack and yours), and **why a block
   turns red** (`foldPeril` — it is about to crush you).
   **The first is done, and done twice over**: the landing rings show it on
   every fold that decides something, peek in the plane previews it, and
   `00 — First Landing` now *states* the rule on a card, marks the block it
   names, and forces both halves of the experiment before the campaign
   starts. **The machinery that took is worth reusing for the other three** —
   an explanation card (`card:{h,p}` on a tutorial step), a derived world
   marker (`show:"landing"`) and a step that gates the other verbs
   (`hold:true`) are between them a way to say a rule in words, point at the
   thing it is about, and make the player do it. **The second and third are
   done, and not with a card.** Both got one and both stopped needing it: the
   falling blocks, the folding telegraph and the replay each say on the board
   what a paragraph had been saying in words, and one line in each level's
   `hint` carries what is left — see **The brief**, above. What is left is the
   fourth, why a block turns red (`foldPeril`), which is turn-based and so
   could still take a real teaching level. The lesson from the three that are
   finished: **a card is what you reach for when the picture cannot be made to
   say it — not before.**
9. **Ad integration.** Nothing is wired. When wrapped with Capacitor the
   rewarded-video callback should call `grantShards(n)`, `grantAdView(id)`,
   `grantSkip(name)` or `grantHints(n)` — four hooks, one per thing an ad can
   buy. Rewarded-only
   by design: skip a level, or buy shards. No interstitials — they pay poorly
   on a slow puzzle game and are the main cause of uninstalls.
   **The rule that keeps this out of pay-to-win: ads buy progress, never
   score.** A skip awards no stars and leaves the level playable, so nothing
   bought can ever appear in `starsEarned()`.

### Before mobile

- Safe-area insets: the bar sits at `bottom: 18px` and will collide with the
  iPhone home indicator. Needs `env(safe-area-inset-bottom)`.
- The audio context unlock now hangs off the sting's tap surface — a
  full-bleed div, so a touch anywhere counts, which is the best chance this
  has of working inside a WebView. Still unverified on a device, and `BEGIN`
  calls `audio()` too, so a WebView that refuses the first gesture has a
  second one behind it.
- `user-scalable=no` is set, but iOS Safari ignores it. Pinch-zoom during a
  two-finger tap needs testing.

---
