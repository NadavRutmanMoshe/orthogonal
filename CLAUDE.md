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
| `js/02-levels.js` | 66 levels. 3 tutorial + 63 campaign in nine chapters. |
| `js/03-rules.js` | `resolveStep()`, block kinds, `makeRules()`. |
| `js/04-solver.js` | `solve()` — BFS over game states, capped at 250k. |
| `js/05-state.js` | Mutable state, tutorial counters. |
| `js/06-persistence.js` | Progress, settings, session, library, wardrobe. |
| `js/07-difficulty.js` | `statsFor()`, `tierOf()`, stars, `statsCached()`. |
| `js/08-minimizer.js` | Delete each block, re-solve, find what is load-bearing. |
| `js/09-wardrobe.js` | Skins, palettes, the star economy, the display case. |
| `js/10-render.js` | three.js scene, depth shading, the animation loop. |
| `js/11-sound.js` | Web Audio oscillator blips. No assets. Also `settings`, `VERBS`, `applyUI()`. |
| `js/12-play.js` | The verbs: move, shove, collapse, restore, die, win. |
| `js/13-gestures.js` | Swipe / tap / two-finger tap on the world. |
| `js/14-editor.js` | Tap-to-place editor, verify, minimize. |
| `js/15-tutorial.js` | Button cues, the tutorial coach, the hint button. |
| `js/16-panels.js` | `CHAPTERS` and every slide-up panel. |
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

Chapters: 0 Tutorial (0–2), I Folding (3–5), II Turning (6–13), III Glass
(14–18), IV Spikes (19–25), V Crates (26–32), VI Anchors (33–39),
VII Confluence (40–48), VIII Amber (49–57), IX Bonus (58–65). **`CHAPTERS[].at`
holds array indices — inserting a level means shifting every marker after it.**

Every special piece is verified load-bearing; every anchor level is verified
**impossible** without its anchor; every crate is verified to be shoved in the
optimal solution.

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
  the file has been machine-checked. `node tools/verify.js`.
- **`resolveStep()` is shared by the game and the solver**, so they can never
  disagree. Keep it that way. Its optional `occHere` argument checks headroom in
  *both* columns; without it you can slide diagonally past a ceiling.
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
- **Palettes only change the world** (background, stone, ink). Piece colours and
  their shape markers never change, so no palette can make a mechanic unreadable.
- **Economy.** `starsEarned()` sums the best result per level and skips
  tutorials; `shards()` subtracts what has been spent. Catalogue totals 283
  against 189 earnable by perfect play (67%), and the gap is what a rewarded ad
  is meant to sell. `grantShards(n)` is the single hook an ad SDK calls. No ad
  code exists and the button is deliberately disabled rather than faked.
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
  BFS on all 66 levels every time it opens.
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

---

## Agreed next steps

1. **Level progression.** The current order is chapter-by-mechanic, which is how
   the levels were *built*, not necessarily how they should be *played*.
   Difficulty inside a chapter is uneven and the tutorial-to-chapter-I step is
   probably still too large. `statsFor()` gives a machine-readable score for
   every level — start by dumping it and looking at the curve before moving
   anything.
2. **A boss.** Nothing structurally exists for this yet. The honest version is
   probably a long level that demands every mechanic in sequence rather than a
   new enemy type; the game has no adversary and inventing one would be a
   different game. Worth deciding what "boss" means here before building it.
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
