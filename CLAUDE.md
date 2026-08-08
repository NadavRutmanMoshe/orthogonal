# Orthogonal

Read this before changing anything. It is the memory of the project.

---

## What the game is

A grid puzzle game about projection. The player is a cube in a voxel world with
one special verb: **collapse the world to 2D** along the current camera axis.
Blocks far apart in depth merge into one silhouette, so gaps close and
unreachable stairs become climbable. **Returning to 3D** places the player on
the block nearest the camera that produced that silhouette — which is how you
cross large distances. The camera rotates in 90° steps, and choosing *which*
axis to collapse is most of the puzzle.

**The player-facing name for the verb is settled: `GO 2D / GO 3D`.** It was
auditioned against `FOLD / UNFOLD` and `FLATTEN / UNFLATTEN` from a menu row,
decided by feel, and that row is now gone — the wording is no longer a setting.
It still lives in one table (`VERBS` in `js/11-sound.js`, reached through
`VB()`) so changing it stays a data edit. Settings saved before the decision may
carry a `verbs` key; `loadSettings` ignores it, which is the migration. The code
and comments still say "fold" throughout; that is deliberate, it is a good word
for the mechanic even though it did not end up on the button.

---

## Rules, in full

1. You occupy one cell. You may walk level, step up exactly one, or fall.
2. Stepping up needs clearance above **both** where you stand and where you are
   going. Without the first check you can slide diagonally past a ceiling.
3. Falling out of the world kills you and resets the level.
4. Collapsing projects everything along the current view axis. If something
   already projects into your square, the fold plays out and then crushes you.
5. Returning to 3D puts you on the supporting block nearest the camera,
   **unless** an anchor is among the candidates — then the anchor wins.
6. You must reach the goal in the volume. Standing on its projection is not
   enough.
7. On a boss level there is no goal: there is an opponent with a gun, and you
   hurt it by folding while you share its column in the one beat it is
   exposed. On a **trial** there is a goal like any other level, and a lethal
   plane sweeping one slice of the world. Both run **on a real clock**, and
   that clock is the one place the game is not turn-based.

Death is solver-equivalent to a blocked move — neither leads anywhere, so no
shortest path routes through it. Adding death changed nothing about any puzzle;
that was verified across all levels.

---

## Layout

No build step. Classic scripts sharing one global scope, loaded in the numeric
order listed in `index.html`. `20-boot.js` is the only file that *runs*
anything; everything before it only declares.

| File | What it holds |
|---|---|
| `js/00-storage.js` | `window.storage` over `localStorage`. The game was born inside a Claude artifact where the host supplied this API; the shim lets identical code run from `file://`, itch.io and a Capacitor WebView. Defines itself only if absent. Falls back to an in-memory map if storage is denied (private browsing). |
| `js/01-coords.js` | `AX[]` — the four camera views, each with `r` (screen-right) and `d` (depth, pointing at the camera). Nearly every coordinate calculation goes through these. Also `K()` and `box()`. |
| `js/02-levels.js` | 72 levels + `SECTIONS` + `LEVEL_RENAMES`. |
| `js/03-rules.js` | `resolveStep()`, block kinds, `makeRules()`, `makeBoss()`, `makeTrial()`, `trialSafety()`. |
| `js/04-solver.js` | `solve()` — BFS over game states; reaches boss cores but does **not** model sweeps. |
| `js/05-state.js` | Mutable state, boss state, tutorial counters. |
| `js/06-persistence.js` | Progress, settings, session, library, wardrobe. |
| `js/07-difficulty.js` | `statsFor()`, `tierOf()`, stars, `statsCached()`, `starsForRecord()`. |
| `js/08-minimizer.js` | Delete each block, re-solve, find what is load-bearing. |
| `js/09-wardrobe.js` | Skins, palettes, the star economy, the display case. |
| `js/10-render.js` | three.js scene, depth shading, the animation loop. |
| `js/11-sound.js` | Web Audio oscillator blips. No assets. Also `settings`, `VERBS`, `applyUI()`. |
| `js/12-play.js` | The verbs: move, shove, collapse, restore, die, win. |
| `js/13-gestures.js` | Swipe / tap / two-finger tap on the world. |
| `js/14-editor.js` | Tap-to-place editor, verify, minimize. |
| `js/15-tutorial.js` | Button cues, the tutorial coach, the hint button. |
| `js/16-panels.js` | Every slide-up panel; `sectionSpans()` for the picker. |
| `js/17-composer.js` | Solution-first level generation. |
| `js/18-ui.js` | `$`, toasts, panel plumbing, `syncHud()`. |
| `js/19-bindings.js` | Every button and key binding. |
| `js/20-boot.js` | Startup order. Runs last on purpose. |

**Splitting the monolith renamed exactly one thing.** `history` became
`moveHistory`, because at global scope it would have shadowed `window.history`.
If you add a top-level `var`, check it is not a Window property name.

---

## Levels

Block format is `[x,y,z,k]` where k is 0 stone, 1 glass, 2 anchor, 3 crate,
4 spike. Levels may carry `keys: [[x,y,z]]`.

- **Glass** is solid but casts nothing: ground in the volume, a hole in the plane.
- **An anchor** holds whatever arrives on it. It overrides the nearest-camera
  landing rule for the player, **and** a crate resting on an anchor can never be
  shoved again.
- **A crate** can be shoved in the volume, and since it casts like stone,
  shoving it reshapes the plane. Crates are the only piece that gives the game
  *state*: the world differs after you touch it. They live outside the static
  sets in `makeRules`, so every world query takes the current crate positions as
  an argument, and a level with no crates behaves exactly as before they existed.
- **A spike** is solid and casts like stone but kills you underfoot — so a spike
  buried deep in the world poisons the entire silhouette column it folds into,
  and ground that is safe in the volume can be lethal in the plane.
- **Keys** are collected **in the plane**, on the square the key folds into, so
  which axis you fold along decides which keys you can reach. They exist in code
  and in the editor but no campaign level uses them.

**The campaign is four sections plus a locked shelf**, listed in `SECTIONS` in
`js/02-levels.js`. Each teaches one mechanic gently, hardens it, then ends on
levels that combine it with everything already taught, then a boss. Four or
five levels in, each section is interrupted by a **trial** — see below:

| | | |
|---|---|---|
| I · FUNDAMENTALS | 9 + trial + boss | turn, depth — the fold itself is the tutorial's job |
| II · SPIKES | 7 + trial + boss | spikes before glass — a hazard reads faster than an absence |
| III · GLASS | 8 + trial + boss | ends on glass + spikes |
| IV · CRATES | 10 + trial + boss | ends on crate + glass + spikes |
| V · EXTRA | 27, locked | opens when every boss is down |

`SECTIONS[].at` holds array indices, so inserting a level means shifting every
marker after it. A section with `locked:true` stays shut until
`sectionsUnlocked()` — which checks the **bosses only**, not every level,
because gating a bonus on 100% turns a reward into a chore.

**Nothing was deleted to get from 62 campaign levels to 34** except one. Anchors and amber
are shelved whole in EXTRA, so turning that section back on is a data move, not
a rebuild. The judgement was that 40 good levels beat 60 that repeat
themselves.

The exception is `01 — Fill the gap`, which is gone for good: its solution was
`→ → FLAT → → → → POP` against the tutorial's `→ FLAT → → → POP` — the same
verbs in the same order, rotation locked in both, starting from the same
square. It was the tutorial with a wider gap. **When a level duplicates a
tutorial step, the tutorial wins**, because the tutorial is unscored and
teaching a thing twice costs a player their first impression of the campaign.

Levels have been renumbered three times. `LEVEL_RENAMES` maps every old name
to its **current** one and `migrateNames()` applies it on load — progress is
keyed by name, so without it every solved level would read unsolved.

**Compose that table, never rewrite it.** A reshuffle regenerated it from
scratch once, which silently broke the oldest saves: names from the original
numbering stopped resolving, because the map only knew the *previous* names.
The fix was to recover the lost map from git and compose the chains, so an
original name still lands on the current one in a single lookup. Verified by
loading a save written in the original numbering and watching every star
survive.

Every special piece is verified load-bearing; every anchor level is verified
**impossible** without its anchor; every crate is verified to be shoved in the
optimal solution.

---

## Trials

**An ordinary level, on a clock.** Four or five turn-based puzzles into a
section, one arrives that will not wait: the goal is drawn amber instead of
green, and a lethal plane sweeps one slice of the world, charging in plain
sight for most of a beat and going live for the last `fire` milliseconds.
Reach the goal in the volume, as always. Three lives, and three intact lives
is three stars.

**This is the second boss design, brought back where it belongs.** It failed
as a boss for a reason still worth keeping — an objective wearing a boss
costume is not a fight, and the vulnerability has to come out of the
opponent's own behaviour. But that is an argument about what a *boss* is, and
it says nothing against the sweep itself. As a change of pace in the middle of
a section it is exactly right, and it costs the fight nothing.

The reason the attack is a plane, and the reason a trial is about the fold
rather than about reflexes: **a sweep down the axis you are looking along
cannot be dodged in the plane at all.** Flattened you are the projection of
every depth at once, so you stand in every slice of that axis simultaneously.
The same sweep is one step to dodge in the volume, and rotating re-labels
which sweeps are survivable. So the question is the one the whole game asks —
which axis, and is this the moment — only now with a metronome running. The
`GO 2D` button carries the warning, pulsing red whenever the charging slice is
one the plane has no answer to; because that is a fact about the clock rather
than about geometry, it is re-judged every frame in the render loop instead of
in `syncHud`, which is the one place a button class is not owned by `syncHud`.

### Details that are load-bearing

- **A trial keeps its section's numbering out of it.** Like a boss it is
  named `TRIAL I …` rather than given a number, because progress is keyed by
  name: inserting `05` in the middle would renumber every level after it and
  cost a `LEVEL_RENAMES` entry each. A landmark should not be able to break a
  save.
- **Two platforms that share a row of z can be joined by one turn and one
  fold.** The first four arenas were solved in three or four moves flat —
  rotate, collapse, land on the goal — because the far side sat at the same
  depth as the start. Offsetting the far side in *both* axes is what makes the
  crossing real. A trial that ends before its second beat is not a trial, and
  `solve()` is the only thing that will tell you.
- **The clock stops the moment you reach the goal**, not when the win card
  appears 380ms later (`levelDone`). Without that a slice could still land on
  a level you had already finished — and the same gap existed for the boss's
  last shot, so the flag guards both.
- **A hit sends you back to the start with the clock restarted**, so you are
  never dropped in front of a slice already halfway to landing. Moves are left
  alone, because moves are not the score here.
- Scored like a boss, through the same two functions: `progress[name]` holds
  lives, read through `starsForRecord()` and written through `betterRecord()`,
  both of which now ask `onTheClock(level)` rather than `level.boss`.

### Verification

`solve()` is allowed a full opinion here, unlike on a boss: a trial is a real
level underneath, so BFS proves the geometry admits a route. What BFS cannot
speak to is the clock, and `trialSafety()` stands in for it: for every square
you can stand on and every beat, either that square is safe or one a step away
is — the arena never corners you. It also checks that you do not respawn
inside the beat that is charging. `node tools/verify.js` runs both on every
trial, and the safety check has already earned its keep: it rejected a catwalk
two squares wide, where the sweep that owns that height leaves the middle
square with nowhere to go.

---

## Bosses

**An opponent with a gun, and a rhythm you fight inside.**

| | |
|---|---|
| **AIM** | it manoeuvres onto your row or column, **plants**, and the line lights up |
| **SHOT** | a projectile crosses the arena a cell at a time. Blocks stop it, so pillars are cover |
| **OPEN** | with the shot spent, it is exposed — the only moment it can be hurt |

**You hurt it by folding while you share its silhouette column, during OPEN.**
Outside that window the identical input kills *you*: in the plane it is solid,
so folding into its column is folding into a wall. The strike and the suicide
are the same button, separated only by timing. That is the fight.

### Four designs, and why the first three failed

1. **Turn-based, walk to a marker.** Provably fair — `solve()` could prune hit
   states — but it did not feel like a fight.
2. **Real-time, walk to a marker.** Better pressure, still an objective wearing
   a boss costume.
3. **Crush it on a static line.** A real attack, but the vulnerability was a
   property of the *floor*, so the fight became manipulating the floor: stand
   still, wait, fold. Making it avoid the lines only taught it to freeze —
   which reads as broken AI — and produced a fresh two-button loop.

**The lesson, paid for three times: a vulnerability that does not come out of
the boss's own behaviour is a condition to farm, not a fight to win.** OPEN is
a consequence of it shooting, so the only way to get one is to make it shoot,
which means being somewhere worth shooting at.

### Details that are load-bearing

- **It plants to shoot.** While a lock is held it does not walk, so the line
  you are shown is the line that fires — a telegraph that drifts is not a
  telegraph — and freezing is the tell that a shot is coming.
- **It only fires down a clear row or column.** An early version fired along
  whichever axis you were further away on, which meant it shot past you almost
  every time and a motionless player was never in danger. It also **will not
  fire into cover**: a blocked shot would hand over the OPEN beat for free,
  and that window is payment for surviving a bullet, not for owning a wall.
  Blocked, it keeps walking until it has an angle — so hiding makes it come.
- **OPEN starts when the bullet is spent, not when it leaves the barrel.**
  This single ordering killed the last exploit: with the window opening at the
  muzzle, a motionless player folded the instant it fired and traded one life
  for one hit point, which against three lives and three hp is exactly enough
  to win by doing nothing.
- **`bossNext` scores alignment above distance.** Purely closing made it
  shuffle diagonally for six seconds looking for an angle, which reads as a
  wander rather than a hunt.
- Scored on lives, three stars for three intact. `progress[name]` holds lives
  for a boss and a move count for everything else — opposite senses in one
  slot — so reads go through `starsForRecord()`, writes through
  `betterRecord()`.

### Verification

`solve()` knows nothing about bosses and must not: none of this is a function
of a move sequence. Two checks stand in, and both have caught real errors:

- **`bossArena()`** (`js/03-rules.js`, shared by `verify.js` and `bossgen.js`)
  — the stage works: the boss can reach you, there is cover to break a firing
  line with, and not so much that the arena is a maze. It rejected two arenas
  where I had spawned the boss **inside a pillar**.
- **`tools/bosssim.js`**, run by `verify.js` — **it plays each fight twice**.
  An IDLE policy that never moves must **lose**; a DUELLIST that breaks the
  line and folds on the opening must **win**. Neither is a good player; they
  are a floor and a ceiling. This exists because a playtester broke two
  designs in about a minute each while every static property still passed —
  none of them was about *play*.

---

## The tutorial

Three levels, one new verb each: walking, collapsing, turning. They carry
`tutorial: true`, which means **no par and no stars**. A level whose job is
teaching should not also grade you, and it should not feed the star economy.
`loadLevel` does not even ask the solver about them — its answer for a teaching
level is often a clever route the lesson is not about, and showing that as par
would punish the student.

`00 — First Steps` carries `lockFlat: true` and disables the verb entirely. It
has to: the solver finds a 4-move fold route through that geometry, so without
the lock the walking lesson would be optional.

**The coach is a predicate, not a pointer.** Each step in a level's `tut` array
is a sentence plus `done(counters, state)`, and the coach always displays the
*first* unsatisfied step. It therefore cannot desynchronise: undo, death, or a
player doing things out of order all just re-evaluate. If you add tutorial
steps, keep them as predicates over state — do not introduce a step index.

Tutorials force the control bar back on screen regardless of the layout
setting (`body.tut` in the CSS). Hiding the controls during the lesson about
the controls would be a joke at the player's expense.

---

## Controls

Three layouts, in the menu: `ON-SCREEN` (d-pad, default), `COMPACT` (no d-pad),
`HIDDEN` (nothing). Gestures work in **every** mode and are additive, never
exclusive — every gesture also has a key and, unless hidden, a button:

- swipe — move
- tap the world — change dimension *(only when the bar is hidden)*
- two-finger tap — turn right *(rotate-left has no gesture; four turns is a circle)*
- arrows / WASD, space, Q / E, Z undo, R restart, H hint, M mute, Shift peek

---

## Things worth knowing before you change them

- **Verify claims with the solver rather than asserting them.** Every level in
  the file has been machine-checked. `node tools/verify.js` — which now covers
  bosses too, where "solved" means a run exists that is never hit.
  `node tools/curve.js` dumps the difficulty curve; `node tools/bossgen.js`
  searches for boss arenas.
- **`resolveStep()` is shared by the game and the solver**, so they can never
  disagree. Keep it that way. Its optional `occHere` argument checks headroom in
  *both* columns; without it you can slide diagonally past a ceiling.
- **Folding into a wall is telegraphed, not blocked.** `foldPeril()` in
  `js/12-play.js` answers "would flattening from here kill me, and which blocks
  are to blame" — the guilty ones are tinted and outlined red in the world and
  the `GO 2D` button pulses. It came from playtesting `08 — Far Side`, where
  the block that crushes you sits one square to your *left* in world space and
  shares your silhouette column only because the view is rotated: nothing on
  screen said so. The move stays legal — dying to it is a real outcome and the
  puzzles still turn on picking the right axis — it just stops being a gotcha.
  Fires on 222 crush and 88 spike positions across 44 levels, so it is a
  general fix rather than a patch for one level. The block loop restores edge
  colours through `perilCleanup`; without that a block stays red after the
  danger passes.
- **A peril-marked block ignores depth shading, on purpose.** Depth shading
  exists to push far blocks back, and the block that crushes you on a fold is
  usually the far one — fading it is the exact mistake the warning is there to
  correct. Crates get the same treatment, and needed it separately: they live
  in `crateMeshes`, not `meshes`, so the block loop never saw them.
- **Depth reading.** Orthographic views make a block six deep look adjacent.
  Two fixes: blocks sharing the player's depth stay full colour while others
  desaturate with distance (`applyDepth`), and the eye button (or Shift) leans
  the camera off-axis so you can read depth **without spending a move**. Peeking
  touches only the camera — `ta`/`tdvx`/`tdvz` carry the true fold axis and every
  geometry transform uses those.
- **Hints are free and unlimited** so nobody gets stuck, but each one lowers the
  star cap: 0 hints → 3★, 1–2 → 2★, 3–4 → 1★, 5+ → 0★. This replaced a
  metered/timer design deliberately — an energy timer teaches people to close
  the app, which is the opposite of what a free game needs. `win()` writes an
  *effective* move count so hints cannot be laundered into currency.
- **Stars.** 3★ = the solver's own move count, 2★ ≤ 120%, 1★ ≤ 140%. Par is
  optimal, so 3★ genuinely means optimal.
- **Worlds only change the world** (background, stone, ink). Piece colours and
  their shape markers never change, so no world can make a mechanic unreadable.
- **A world is two purchases, not one.** `WORLDS3D` sets void + block, `WORLDS2D`
  sets paper + ink; you spend the whole game switching between the two pictures,
  and buying one used to silently buy a look for the other you had never seen.
  Ids are prefixed `v_` / `p_` because `wardrobe.owned` is one flat list and the
  halves would otherwise collide. **A save from before the split carries
  `palette:"rust"`** — `migrateWorlds()` grants both halves for the one purchase
  already made, and the prefixes are what make that decidable. Don't remove it
  while any old save might exist.
- **Pricing tracks desire, not effort**: shapes dearest (max 30), then colours
  (max 14), then worlds (max 12). Nothing exceeds 30, which is what keeps
  `adsFor()` whole — it charges one ad per 10 of price, so 30 is exactly three
  ads and no item is unreachable by watching. Change a cost above 30 and an item
  silently needs a fourth ad.
- **Economy.** `starsEarned()` sums the best result per level and skips
  tutorials; `shards()` subtracts what has been spent. Catalogue totals 394
  against 189 earnable by perfect play (48%), and the gap is what a rewarded ad
  is meant to sell. Two hooks, neither wired: `grantShards(n)` tops up the
  balance, `grantAdView(id)` credits one video against one item and unlocks it
  at `adsFor(cost)`, keeping part-way progress so three ads need not be watched
  in one sitting.
- **The HUD star total counts stars *earned*, not stars left to spend.** They
  are different numbers — the wardrobe's balance falls when you buy something,
  and a total that dropped after a purchase would make the flight from the win
  screen read as a transaction rather than an achievement. The wardrobe labels
  its own "TO SPEND" to keep them apart. It lives outside `.corner` at z-index
  30 so it sits *over* the win overlay: the count has to be visible at the
  moment it goes up.
- **Only newly gained stars fly.** `win()` records `starsBefore`/`starsAfter`
  around the progress write, so replaying a 3★ level pays nothing and 2★→3★
  flies exactly one. Glyphs `[before, after)` are the ones that animate, which
  is why the win card emits `starGlyphsEls()` — you cannot measure the third
  character of a text node to fly it from where it sits.
- **The player carries an adaptive outline** (`addOutline`, recoloured by
  `outlineFor` every frame). Black and White exist because players ask for them,
  but the player is drawn against the void in 3D and paper in 2D — opposite ends
  of the range — so no single colour reads against both. The rim is re-picked
  from the current background instead of fudging the colours to mid-grey.
- **`UNLIMITED_SHARDS` in `js/09-wardrobe.js` is currently `true`** so the whole
  wardrobe can be walked during playtesting — the catalogue costs more than
  perfect play earns, so it is otherwise unreachable. It short-circuits
  `shards()` only; `starsEarned()` and `wardrobe.spent` still do their real
  work, so buying exercises the true purchase path. **Set it back to `false`
  before shipping.**
- **Sound is scaled once at the master**, by `MIX` in `js/11-sound.js`
  (currently 3) via `masterLevel()`. The per-blip gains are a deliberate mix — a
  footstep sits well under the win chord — so correcting overall loudness there
  instead of editing each value keeps that balance. Every write to
  `masterGain.gain.value` must go through `masterLevel()` or the boost is lost
  the first time the volume slider moves.
- **The wardrobe's display case is a second WebGL context**, created when the
  panel opens and explicitly released — `loseContext()`, not just GC — when it
  closes. Browsers cap live contexts (commonly 16) and evict the oldest, which
  would be the game's own renderer, so the teardown lives in `showPanel` and
  `hidePanel` rather than at call sites, and no path may leave one running. For
  the same reason the panel shell is built once per opening and refreshed in
  place: re-running `showPanel` on every tap would burn a context per tap.
  Verified by cycling the panel 25 times and checking the game's context
  survives. It lights the item with Lambert + ambient, unlike the flat
  `MeshBasicMaterial` game, because a flat-shaded sphere is a circle and
  rotation — the whole point of the case — would be invisible.
- **Selecting, buying and equipping are three separate acts.** Tapping a tile
  only puts it on the stand. Buying is armed-then-confirmed on a button under
  the case, and only a confirmed purchase equips. Previously one tap of the
  grid bought *and* equipped, so a mis-tap while scrolling spent stars. A
  consequence worth keeping: a palette does not touch the world until it is
  equipped — the case previews it instead.
- **`body>canvas` in the CSS is load-bearing.** It was a bare `canvas` selector,
  which also caught the wardrobe's preview canvas and pinned it `position:fixed`
  over the whole viewport. The game's renderer is the only canvas that is a
  direct child of `body`; any future in-panel canvas depends on that staying
  scoped.
- **`statsCached()`** wraps `statsFor` — the level picker would otherwise run
  BFS on every level each time it opens.
- A parsing regex over the levels file must match `rotate:(true|false)` — level
  01 has rotation locked, and a regex expecting only `true` silently swallows it
  into its neighbour. That bug cost two rounds of miscounting.

---

## The composer

You dictate a move sequence; the level is built to fit it.

1. **Synthesize** — walk the sequence forward, adding the least geometry each
   move requires. The key insight: a 2D move only constrains the *silhouette*,
   so the bridge block can sit at **any depth**. That free choice is invisible to
   the sequence and becomes the puzzle in 3D. Depths are picked randomly.
2. **Replay** — check the finished geometry actually admits the sequence.
3. **Prove** — run BFS. If anything shorter exists, the sequence is not forced.
4. **Repair** — trace the shortcut, find a square only *it* stands on, fill it.
5. **Reroll** — up to 150 seeds.

This is the generate-and-test family from procedural content generation. Known
relatives: Taylor & Parberry's reverse Sokoban generation (2011); MCTS-based
Sokoban generators; and the rigorous version, Smith & Mateas on Answer Set
Programming for PCG (2011). The exact problem of excluding unwanted solutions is
Smith, Butler & Popović, *Quantifying over play* (2013).

**Measured success rate: 59%** on reversal-free random sequences, 14% if you
allow sequences that double back. That gap is the single most useful thing
learned about the composer: *a sequence that reverses direction can never be
forced*, because returning where you came from means a shorter route always
exists, and "forced" is defined as "the solver agrees this is shortest." The
composer warns about this now. Two hypotheses that were tested and **failed**:
letting the composer place glass (5 → 6 of 90, noise) and letting it place
anchors so landings need not march away from the camera (13% → 12%, noise).

Highest-leverage dials in `synthesize()`: the depth-choice heuristic (currently
`lastDepth ± 2..6`) and the step-up probabilities (0.25 in 3D, 0.3 in 2D).

---

## Known limitations

- **A cautionary note about my own evidence.** I once claimed, from 6,004 random
  placements, that an anchor can never make a level impossible without it. That
  claim was **false**, and it was disproved by a single hand-built level. The
  shape that does it: a column with three or more landing candidates where the
  one you need is strictly in the **middle**. Turning 180° reaches either *end*
  of a column and never the middle, so only an anchor gets you there. The
  generator built connected shelves and picked goals on existing blocks, so it
  essentially never produced that topology — the wrong space had been sampled
  thousands of times and mistaken for proof. **Absence of evidence from a biased
  generator is not evidence of absence.** Chapter VI still reads as contrived:
  the anchor is *necessary* there but the level is built around proving that
  rather than around an idea. The fix came from the same player: **let amber
  hold crates too.** Pinning a crate is irreversible, so where you park it is a
  real decision. That is chapter VIII, and it is what the anchor should have
  been from the start. A piece that only redirects is weak; a piece that
  *removes an option* has teeth.
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
  nothing there to check — but it does mean the machine has no opinion at all
  about the state you spend the crossing in.
- **Sweep pacing is guesswork, exactly like the boss's.** `period` 2500 → 2000
  and `fire` 340 → 300 across the four trials. Nothing says those numbers are
  fun, or that the window to fold, cross and land is one a human can hit.
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
- **`cue("bUndo")` targets a button that does not exist.** When you have wedged
  yourself past recovery, `showHint()` pulses nothing. Related: with controls
  `HIDDEN`, every hint cue points at an invisible button. Both want the same
  fix — `cue()` should fall back to a `flash()` when its target is not on screen.
- **Two-finger tap only rotates right.** There is no left-rotate gesture.
- **Difficulty tiers say "brutal" for every boss** — `statsFor` weights folds
  and path length, and a 20-move three-core fight trips both. Bosses are scored
  on lives and never ask for a par, so this only shows up in `tools/curve.js`.
- **Boss fairness is no longer proved, only sampled.** `bossSafety()` says you
  are never cornered and `bossArena()` says the stage works; neither says the
  fight is winnable at a given reaction speed, or that `step` and `stun` are
  tuned. That is a playtesting question and nothing else can answer it.
- **The boss is the one real-time thing in a turn-based game.** It works, but
  it means the game no longer plays entirely at your own pace, and an
  accessibility option to slow `period` is the obvious missing setting.
- **Boss pacing is guesswork.** `step` 950→780ms, `aim` 1000→750ms, `open`
  1500→1100ms. `bosssim` proves each fight sits between "idle loses" and
  "active play wins"; it says nothing about whether the numbers are *fun*, or
  whether a human can line up and fold inside the OPEN window.
- **The opening approach is slow** — the boss spends a few seconds walking
  into its first firing line. Mid-fight it re-engages quickly, but the first
  few seconds of an arena are quiet.
- **`bosssim`'s herder is not a good player.** It looks one boss-step ahead
  and never plans. A real exploit subtler than standing still would slip
  past it exactly the way the last one slipped past the static checks.

---

## Agreed next steps

1. **Playtest the sections.** The reorder was driven by `statsFor()` and the
   sections now climb, but a machine score is not a feel. The two soft spots to
   watch: the tutorial → section I handoff (16, still the gentlest scored level
   available, and there is no cheaper one to put there), and section IX, which
   is 11 levels and may be two sections wearing one hat.
2. **More gentle levels.** The real gap the curve exposes and the reorder could
   not fix: after the tutorial there is nothing between 16 and 31. The composer
   can make them, but it cannot make crate or key levels, and its 59% hit rate
   means hand-checking a batch. This is the highest-value content work left.
3. **Negative constraint tracking in the composer.** Synthesis is still greedy
   and violations are only caught at verification. Recording "this silhouette
   column must stay empty" as each move demands it would fail fast. The one
   remaining idea with real headroom.
4. **Eject on folding into a wall** instead of crushing — the Fez approach.
   Would let you climb by folding into geometry, genuinely expanding the design
   space, but it *adds* moves rather than removing them, so every level would
   need re-verification and some would break.
5. **More state.** Crates broke the "nothing changes" ceiling; spikes added
   failure. There is still no switch, no door, nothing that changes the *rules*
   mid-level.
6. **Keys.** Currently cut. Collecting them in the plane tied them to the fold,
   but they still read as an errand rather than a puzzle.
7. **Ad integration.** Nothing is wired. When wrapped with Capacitor the
   rewarded-video callback should call `grantShards(n)`. Rewarded-only by
   design: skip a level, or buy shards. No interstitials — they pay poorly on a
   slow puzzle game and are the main cause of uninstalls.
8. **Playtest feedback.** The solver can prove a level is tight; it cannot tell
   whether the insight lands — and, as the anchor episode shows, it cannot tell
   when the generator is failing to imagine the right shape. Both corrections to
   the anchor mechanic came from a person playing, not from search.

### Before mobile

- Safe-area insets: the bar sits at `bottom: 18px` and will collide with the
  iPhone home indicator. Needs `env(safe-area-inset-bottom)`.
- The audio context unlock currently hangs off the intro card's BEGIN button.
  Verify that still counts as a user gesture inside a WebView.
- `user-scalable=no` is set, but iOS Safari ignores it. Pinch-zoom during a
  two-finger tap needs testing.

---

## Working notes

- The owner is learning, not shipping. Explanations of *why* are wanted, not
  just working code.
- Levels can be pasted in and out as JSON from the editor's ⋯ menu.
- After any change to levels, rules or the solver: `node tools/verify.js`.
