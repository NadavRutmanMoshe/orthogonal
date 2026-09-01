# Orthogonal

Read this before changing anything. It is the memory of how the game works
**now**: the rules, the invariants, and the things that will bite you.

**`docs/HISTORY.md` holds the design history** — every version of a mechanic
that was tried and dropped, and what it cost to find that out. Read it before
*redesigning* something, not before editing it. Most of what is in there
looked correct on paper and will look attractive again.

---

## What the game is

A grid puzzle game about projection. The player is a cube in a voxel world with
one special verb: **collapse the world to 2D** along the current camera axis.
Blocks far apart in depth merge into one silhouette, so gaps close and
unreachable stairs become climbable. **Returning to 3D** places the player on
the block nearest the camera that produced that silhouette — which is how you
cross large distances. The camera rotates in 90° steps, and choosing *which*
axis to collapse is most of the puzzle.

**The player-facing name for the verb is settled: `GO 2D / GO 3D`.** It lives
in one table (`VERBS` in `js/11-sound.js`, reached through `VB()`) so changing
it stays a data edit, but it is no longer a setting. The code and comments say
"fold" throughout; that is deliberate — it is a good word for the mechanic even
though it did not end up on the button.

---

## Rules, in full

1. You occupy one cell. You may walk level, step up exactly one, or fall.
2. Stepping up needs clearance above **both** where you stand and where you are
   going. Without the first check you can slide diagonally past a ceiling.
3. Falling out of the world kills you and resets the level — except on a
   clock, where it spends a life instead and the cores you have already
   reached stay reached.
4. Collapsing projects everything along the current view axis. If something
   already projects into your square, the fold plays out and then crushes you.
5. Returning to 3D puts you on the supporting block nearest the camera,
   **unless** an anchor is among the candidates — then the anchor wins.
6. You must reach the goal in the volume. Standing on its projection is not
   enough.
7. On a boss level there is no goal. All four are packs of hunters run in
   **three phases**: one walks onto your row, plants, and charges down it, and
   you kill it by folding while it shares your silhouette column — the same
   line. Clearing what is on the board begins the next phase, which changes
   the fight rather than repeating it. On a **trial** there is a goal like any
   other level, and a lethal plane sweeping one slice of the world. All of
   them run **on a real clock**, and that clock is the one place the game is
   not turn-based.

Death is solver-equivalent to a blocked move — neither leads anywhere, so no
shortest path routes through it. Adding death changed nothing about any puzzle;
that was verified across all levels.

---

## Layout

No build step. Classic scripts sharing one global scope, loaded in the numeric
order listed in `index.html`. `21-boot.js` is the only file that *runs*
anything; everything before it only declares.

| File | What it holds |
|---|---|
| `js/00-storage.js` | `window.storage` over `localStorage`. The game was born inside a Claude artifact where the host supplied this API; the shim lets identical code run from `file://`, itch.io and a Capacitor WebView. Defines itself only if absent. Falls back to an in-memory map if storage is denied (private browsing). |
| `js/01-coords.js` | `AX[]` — the four camera views, each with `r` (screen-right) and `d` (depth, pointing at the camera). Nearly every coordinate calculation goes through these. Also `K()` and `box()`. |
| `js/02-levels.js` | 75 levels + `SECTIONS` + `LEVEL_RENAMES`. |
| `js/03-rules.js` | `resolveStep()`, block kinds, `makeRules()`, `makeBoss()`, `bossPhases()`, `bossBlocksAt()`, `bossNext()`, `bossLine()`, `foldKills()`, `bossArena()`, `makeTrial()`, `trialSafety()`. |
| `js/04-solver.js` | `solve()` — BFS over game states. Solves trials; knows nothing of bosses, on purpose. |
| `js/05-state.js` | Mutable state, the pack, the trial clock, tutorial counters. |
| `js/06-persistence.js` | Progress, settings, session, library, wardrobe. |
| `js/07-difficulty.js` | `statsFor()`, `tierOf()`, stars, `statsCached()`, `starsForRecord()`, `onTheClock()`. |
| `js/08-minimizer.js` | Delete each block, re-solve, find what is load-bearing. |
| `js/09-wardrobe.js` | Skins, palettes, the star economy, the display case. |
| `js/10-render.js` | three.js scene, depth shading, the animation loop. |
| `js/11-sound.js` | Web Audio oscillator blips and the master limiter. No assets. Also `settings`, `VERBS`, `applyUI()`. |
| `js/12-play.js` | The verbs: move, shove, collapse, restore, die, win. Also the fight, the trial clock, and the replay. |
| `js/13-gestures.js` | Swipe / tap / two-finger tap on the world. |
| `js/14-editor.js` | Tap-to-place editor, verify, minimize. |
| `js/15-tutorial.js` | Control cues, the coach, the ghost hand, hints. |
| `js/16-panels.js` | The home screen; every slide-up panel; `sectionSpans()`; the map. |
| `js/17-composer.js` | Solution-first level generation. |
| `js/18-ui.js` | `$`, toasts, panel plumbing, `syncHud()`. |
| `js/19-bindings.js` | Every button and key binding. |
| `js/20-splash.js` | The studio sting: the `nadaz` wordmark, and the tap that unlocks audio. |
| `js/21-boot.js` | Startup order. Runs last on purpose. |

**Splitting the monolith renamed exactly one thing.** `history` became
`moveHistory`, because at global scope it would have shadowed `window.history`.
If you add a top-level `var`, check it is not a Window property name.

---

## Levels

Block format is `[x,y,z,k]` where k is 0 stone, 1 water, 2 anchor, 3 crate,
4 fire. Levels may carry `keys: [[x,y,z]]`.

**Kinds 1 and 4 were renamed, not changed.** Glass became **water** and a
spike became **fire**: identical rules, identical solver, not one level
re-verified. The code still says `glass` and `spike` throughout, the same way
it still says "fold" for a verb the button calls `GO 2D` — the names are good
and renaming them would be a large diff that fixes nothing. What changed is
that each now carries a *reason*: water spills, which is why the plane has no
record of it; fire burns you, which is a sentence a player already knows where
"a spike you cannot see until you fold" had to be taught.

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
five levels in, each section is interrupted by a **trial**:

| | | |
|---|---|---|
| I · FUNDAMENTALS | 8 + trial + boss | the owner's own opening: the fold, then peril, then the turn |
| II · SPIKES | 7 + trial + boss | spikes before glass — a hazard reads faster than an absence |
| III · GLASS | 8 + trial + boss | ends on glass + spikes |
| IV · CRATES | 10 + trial + boss | ends on crate + glass + spikes |
| V · EXTRA | 27, locked | opens when every boss is down; anchors and amber live here |

`SECTIONS[].at` holds array indices, so inserting a level means shifting every
marker after it. A section with `locked:true` stays shut until
`sectionsUnlocked()` — which checks the **bosses only**, not every level,
because gating a bonus on 100% turns a reward into a chore.

**Bosses and trials carry no number**, only a numeral: `BOSS I …`, `TRIAL II
…`. Progress is keyed by name, so a numbered landmark in the middle of a
section would renumber every level after it and cost a `LEVEL_RENAMES` entry
each. A landmark must not be able to break a save.

**SECTION I IS THE OWNER'S OWN, AND IT IS THE ANSWER TO "ARE THESE AI MADE?"**
The opening was re-cut around eleven hand-authored levels. It runs
`00 — First Steps, 00 — First Fold` (the tutorial), then `01 … 05,
TRIAL I, 06, 07, 08, 09, 10, 11` and the boss. Each one is a sentence, and no
two sentences are the same:

| | |
|---|---|
| `00 — First Steps` | walking, stepping up, stepping down. No fold route exists through the geometry at all, so the lesson cannot be short-circuited even before `lockFlat` refuses the verb. |
| `00 — First Fold` | fold, cross, stand up — **and the landing rule for free**: the far bank is three deep in one silhouette column, so you come back on the front block and the goal is one step behind it. |
| `01 — Not Every Square` | some squares are lethal to fold from. 4 of 9, including the start square. |
| `02 — Step Down First` | the same, hardened: 6 of 8, and the only safe square is one you step *down* onto. |
| `03 — Come Back Early` | the plane is a shortcut, not a delivery — pop partway and walk the rest. |
| `04 — The Way Back` | the plane has no preferred direction; the goal is behind you and above you. |
| `05 — One Safe Square` | the peril lesson at its limit: 8 of 9 squares are lethal to fold from, and the survivor is one you have to *climb* to. |
| `06 — No Way From Here` | **impossible without rotating**, proved by `solve()` both ways — and taught, so the player proves it too. |
| `07 / 08 — Turn One Way / the Other` | the same three moves conjugated: `rot+` and `rot-`. |
| `09 — Four Across` | walking *is* par. The control half of the scoring pair. |
| `10 — Five Across` | one column wider, so walking is one move over and the fold is the shortcut. The star is the only thing that says you missed it. |
| `11 — Two Windows` | everything at once, into the boss. |

- **ROTATION DOES NOT EXIST UNTIL `05`.** Every level before it carries
  `rotate:false`, including `TRIAL I` — checked leg by leg with the solver
  rather than assumed, at 11, 9 and 8 moves. Without that lock four of the
  early levels collapse to the same three moves (`rot+ FLAT POP`), which is
  the shortcut that skips the lesson: measured, and the reason the owner's
  `rotate:true` was flipped on all of them.
- **AND THE TURN BUTTONS ARE NOT DRAWN UNTIL `05` EITHER.** Disabled was the
  old behaviour and it is still right for the *flat* case, where they come
  back the moment you stand up. A level with no turn is a different sentence,
  and eight levels of dead controls in the bar would spend the reveal in
  advance. `body.norot`, set in `syncHud`.
- **THE SCORING PAIR IS A SETUP AND A PUNCHLINE.** `09` is trivial on
  purpose — the floor is open and walking is exactly optimal — and it is the
  level `starsOffer()` explains three stars on. The player is told to aim for
  them, gets them free, and then meets `10`, which looks identical, is one
  column wider, and where walking scores 4 against a par of 3. Testers ignore
  the star system because nothing ever points at it; this is the pointing.
- **`06` IS THE THIRD TUTORIAL, AND ITS LESSON IS A PROOF THE PLAYER
  PERFORMS.** A card saying "this one needs the other axis" is a claim;
  folding, standing up and finding the world exactly where you left it is a
  demonstration. So the first two steps ask for the fold and the pop that do
  **not** work, and only then does the turn arrive. All three carry
  `free:true` — `tutGuide()` replaces any step whose cue disagrees with the
  solver, and the solver would never spend a fold here — and the third needs
  it for a second reason: standing up out of the wasted fold puts the player
  on the block at the *front* of their column, one square off the line the
  solver's route starts from. The lesson then stops and hands the rest to the
  solver, which is what `tutGuide()` does on any level once the steps run
  out. It is `tutorial:true` because those two wasted moves are moves the
  solver does not count, and a player who does as they are told must not be
  marked down for it. **And it carries `tutFree:true`, so the coach stops
  dead once the turn has been shown** rather than naming every move to the
  goal: handing the player a verb and then narrating the puzzle they now own
  takes back the thing that was just given them. That flag is the one seam
  between "get a first-time player to the goal" and "hand them the game".
- **The peril pair was verified, not assumed.** `01` and `02` add blocks at
  head height that change no route at all — the optimal is the same as the
  level before — and turn four then six of the standable squares into places
  where `GO 2D` kills you. That is what makes them different levels rather
  than decoration, and it is the first time `foldPeril()`'s red block has a
  level built for it.
- **The old opening is on the shelf, not deleted.** Thirteen levels moved to
  `V · EXTRA` and were renumbered `65..77` — two levels called `01` is a map
  with two nodes reading 01. That also fixes something the shelf needed: it
  read `brutal` end to end, and now opens on gentle ones.
- **`00 — First Landing` was dropped**, on the owner's call. Its lesson is
  not gone: `00 — First Fold` now lands you on the front block with the goal
  one step behind it, so the rule is watched rather than read, and
  `08 — The Same Column` is still the exam. **All of its machinery is live
  and unused** — `card:{h,p}`, `show:"landing"`, `hold:true`, `L.tint` — the
  same way the twin boss and `cunning` are; restoring it is one level-data
  paste. Its notes are kept below for that reason.

The measured curve is **8, 14, 14, 16, 14, 16, 22 (trial), 19, 11, 11, 26,
31**. The two elevens are the deliberately tiny rotation pair; measured from
`05` the ramp into the boss is 19 → 26 → 31.

**Two levels teaching the same thing is a bug, and the curve will not catch
it.** `03 — The Other Axis` and `04 — Turn to see` scored 19 and 21 and
looked like a clean ramp; played, they were both "the bridge only exists along
the other axis" and the second one taught nothing. The check is the one the
owner applies: say in one sentence what each level teaches, and if two
sentences match, one of them goes. Difficulty is a curve you can
measure — `node tools/curve.js` prints it, and a step of more than about +10
in the opening section is a bug in the campaign, not a hard level.

**`SECTIONS[].at` are array indices, and `verify.js` now asserts they still
line up.** Inserting a level pushes every marker after it, and the failure is
quiet rather than loud: the levels still play, they are just filed under the
wrong section — wrong sky, wrong stone, wrong horizon, wrong tab on the map.
It was found by noticing a volcano behind `BOSS I`. The invariant that catches
it is the campaign's own shape: every section but the prologue and the shelf
ends on its boss, and the bosses come in order. Deliberately broken and seen
to fail the run.

**`node tools/verify.js` now asserts both `LEVEL_RENAMES` invariants**, which
is what makes composing it checkable rather than careful: every value must
name a level that exists, and no value may also be a key pointing somewhere
else. Both failure modes are tested — the check has been deliberately broken
and seen to fire.

`LEVEL_RENAMES` maps every old level name to its **current** one and
`migrateNames()` applies it on load. **Compose that table, never rewrite it** —
regenerating it from scratch once silently broke the oldest saves. The story is
in `docs/HISTORY.md`. Composing means two edits, not one: every existing key
keeps its key and has its *value* re-pointed at the new current name, and one
new entry maps today's name to tomorrow's. Two invariants make that checkable
and both are worth asserting mechanically, because `migrateNames()` makes a
single unordered pass — **no key may be dropped**, and **no value may also be
a key** that points somewhere else, or a chain half-applies depending on
enumeration order. An entry that ends up mapping a name to *itself* is fine
and will happen: numbers come back round, and a save under that name is
already correct.

Every special piece is verified load-bearing; every anchor level is verified
**impossible** without its anchor; every crate is verified to be shoved in the
optimal solution.

---

## Trials

**An ordinary level, on a clock, three times over.** Four or five turn-based
puzzles into a section, one arrives that will not wait: a lethal plane sweeps
one slice of the world, charging in plain sight for most of a beat and going
live for the last `fire` milliseconds. Reach the amber core in the volume, as
always — and then the next one, somewhere else, and then the third. Three
lives, and three intact lives is three stars.

**Three cores, not one.** A trial that ends on the first arrival is over
before its second beat, on whatever rhythm you happened to arrive with. Three
crossings is what makes it a rhythm you have to learn: the first teaches the
beat, the second is a return trip you now have to time, and the third runs
under a clock that has been going long enough to have sped you up. This was
got wrong once — the first version had a single goal and was reported, fairly,
as stopping after one — and it is why `checkWin()` advances `trialCore` rather
than winning, and why the renderer draws `liveGoal()` rather than `L.goal`.
The old boss had precisely this bug in reverse: its marker stayed on the first
core and the fight became unfinishable.

The reason the attack is a plane, and the reason a trial is about the fold
rather than about reflexes: **a sweep down the axis you are looking along
cannot be dodged in the plane at all.** Flattened you are the projection of
every depth at once, so you stand in every slice of that axis simultaneously.
The same sweep is one step to dodge in the volume, and rotating re-labels
which sweeps are survivable. So the question is the one the whole game asks —
which axis, and is this the moment — only now with a metronome running.

**So the slices run down the depth axis, and that is the point rather than a
setting.** Views 0 and 2 both look down z, so while a `z` slice is live, being
flat in the opening view is death wherever you stand — the fold itself is on
the clock. They used to be `x` slices, which are precisely the ones you can
safely be flat under in the starting view, so the sweep had no opinion about
the one verb the game has and a trial was a walking-timing puzzle. Now a
crossing has to be timed *between* beats, or taken from a view turned 90° off
the one the silhouette needs — which costs the move you were trying to save.

Two consequences worth knowing before changing a beat list:

- **The fold danger is a property of the axis, not of `at`.** One `z` beat
  anywhere makes every fold in views 0 and 2 lethal while it is live. Moving
  `at` around only changes who is threatened in the volume — so pick `at`
  values that sit on rows the player actually stands in. A slice that threatens
  nobody is decoration.
- **Spikes and the sweep axis are coupled.** `TRIAL II` keeps one `x` slice
  because its spikes were placed to take the squares an `x` sweep leaves you,
  which means they also take the `z` escapes: all three depth slices over its
  near island corner somebody, and `trialSafety()` rejects every one. That is
  not a bug in either piece — it is what happens when a hazard is authored
  against a specific sweep.

**THE HAZARD IS BLOCKS FALLING OUT OF THE SKY, and that is the whole
redesign.** For a long time the attack was a translucent red pane and nothing
else — an abstraction a player has to be told about, which on a clock is the
one thing there is no time for. A block falling onto a marked square is a
sentence everybody already owns. **The rule did not move**: the plates were
already being drawn, `TR.hits` is untouched, `trialSafety()` is untouched, and
the block simply rides the beat the plate's own ramp already rode. Height
falls as `ph²` rather than linearly, because that is what falling looks
like — barely moving while there is still time, quick at the end — and it is
the same curve, so the shadow darkening and the block arriving are one event.

- **THE WHOLE SLICE FALLS AT ONCE, and that is not a detail.** The lethal
  thing here is a slice and not a square: flattened you are every depth at
  once, so you stand in all of it, which is the entire reason a trial is
  about the fold rather than about walking. One bomb per square was the
  first idea and it is a prettier drawing of a different game — separate
  per-cell hazards make folding no longer uniquely fatal.
- **The slab is the plane's indicator now, and only the plane's.** In the
  volume the blocks answer both *where* and *how long*, on the squares, where
  it can be acted on; a red pane on top of that is a second drawing of one
  fact, so it drops to a frame with almost no fill.
- **ONE RANK, BOTH PICTURES.** The volume used to drop a block only on the
  squares that happened to have floor under them while the plane dropped a
  row straight across, so a player who folded watched blocks arrive where
  nothing had been hanging a moment earlier. `drawFallRank()` builds both
  from the same beat and the same curve, and they differ only in which axis
  the rank runs along: in the volume the length of the slice, across the
  arena, **at the height the player is standing at** — which is the honest
  height, because the slice is lethal at every one and theirs is the one that
  decides whether they live; in the plane along screen-right, across the
  whole board. The floor plates stay as the shadows.
- **AND THE ROW FALLS IN THE PLANE TOO, ALL THE WAY ACROSS.** Flat, the
  per-square shadows are hidden — they would point at world blocks that are
  not there any more — so for one build the blocks fell only in the volume
  and the plane got a red wash instead. That is a drawing that contradicts
  itself: a block lands on you with nothing above you. The rule says the
  opposite and says it plainly — flattened you are at every depth at once, so
  you are standing on *every* square of that slice together — so the honest
  picture is a rank of blocks straight across the whole board at the height
  you are standing on. `drawPlaneFall()` builds it off the arena's own u
  range. A slice you could still dodge (one with a screen-right component,
  which survives the fold as a single column) drops one block, on that
  column. The wash stays but comes down to .30: it is the ground the row is
  read against now, not the message.
- **The blocks have teeth.** Four points on the underside, so a falling cube
  reads as a thing that crushes rather than as one being delivered.
  Deliberately *not* the fire block's orange, which was the first idea: that
  colour is a piece with rules of its own, and borrowing it would say the
  trial's hazard is something you can learn to walk around.

**The warning is drawn on the squares, not in the air.** A plane carries a
position only seen *edge-on*, where it is a wall standing somewhere on screen.
Face-on it is a sheet of colour over everything — and orthographically it does
not even shift as its depth changes, so once the slices moved onto the depth
axis the opening view could not locate them at all and you had to rotate to
find out, which costs a move on a clock. So:

- **One plate per standable square in the slice** (`trialMarks`, built in
  `buildDynamic`). Empty space has no landmarks; the floor does. It is also
  strictly the more useful set — a square you cannot stand on was never going
  to kill you.
- **The slab is suppressed exactly when it says nothing.** `faceOn` is the
  same test the hit rule uses: a slice whose axis has no screen-right
  component is one you are looking down. Face-on, the fill drops to a tenth
  and the tiles carry it; edge-on it keeps its old weight, because there it is
  the best indicator there is.
- **The slab is sized to the arena, not to the sky.** At span 20 its outline
  was off screen, so the one part of it that carries a position was never
  visible.
- **The square you are standing on is louder than the rest** — brighter and
  slightly larger. "There is a slice" and "you are in it" are different
  sentences and the second one is the urgent one.
- **Every standable square is outlined, not only the lethal ones.** A trial
  draws its own floor. Screen-vertical in this projection is height and depth
  added together, so a block one further back and a block one higher land in
  the same place and the edge of a platform is genuinely ambiguous until you
  rotate — which on a clock is a move you cannot spare, and stepping into
  nothing is a life. The plates already existed for the sweep, so this is
  free.
- **In the plane the tiles are hidden and the slab goes back to full span.**
  There the world *is* a silhouette, so a marker on a world block points at a
  place that no longer exists — and the whole board going red is the correct
  answer, being the only warning that the fold you are in is the wrong one.

### Details that are load-bearing

- **Every death costs a life, not the level.** Falling, spikes and folding
  into a wall all spend a life and put you back at the start with your cores,
  your clock and the pack's damage intact; only running out is a real reset.
  Restarting the level for a mistimed step took back the rhythm you had spent
  two crossings learning, which turned three crossings into one tightrope.
- **A life lost buys a shield, and nothing can take a second one while it is
  up.** `SHIELD_MS` (1000) is set wherever a life is spent and asked wherever
  one would be. It exists because a clock level had *three* ways to charge you
  and no single place that said "you have just been charged": `bossGraceMs`
  stopped hunters touching you again, `trialGrace` stopped the sweep landing
  twice, and neither had any opinion about `die()` — so being caught by the
  sweep and then falling out of the world in the same moment cost two lives
  for one mistake. Reported from a playtest, on a trial. The shield does
  **not** tick while you are dying, because it shares the fight's clock and
  the fight is paused through a death animation — which is exactly the window
  the bug lived in, and 820ms of animation must not eat the second it is
  covering. When it absorbs a `die()` the *consequence* still happens: you
  fell out of the world, so you go back to the start (`respawn()`, factored
  out of `spendLife()`). It is only the life that is not spent.
- **`deathPending` freezes the shield the moment a fatal move is COMMITTED,
  not when it lands**, and that is what makes a second of shield worth a
  second. Folding into a wall or onto a spike is deliberately not instant —
  `doFlatten` lets the fold play out and schedules the death 420ms later,
  because being crushed has to be seen to happen — and the fight runs through
  those 420ms. So the animation was eating most of the window: measured, a
  hit followed by a fold into a pillar **800ms later still cost two lives**,
  which is the exact case that was reported on a boss. Frozen at the commit
  point, the shield covers a full second of the player's own reaction time.
  It also stops a charge landing inside that 420ms and taking a life for a
  moment already lost. One predicate, `shielded()`, is what every path asks.
- **The shield is drawn, because invulnerability you cannot see is
  invulnerability you will not use.** A bubble round the player: a faint fill
  in their own colour, and a ring **turned to face the camera every frame**,
  in the rim colour `outlineFor()` re-picks from the background so it reads
  against the void and the paper alike. A wireframe sphere was the obvious
  drawing and does not survive the size — the player is about thirty pixels
  across and at 14×10, then 10×6, the cage closed into a fuzzy ball that
  buried them. A circle reads at any size and leaves them visible inside it.
  It swells as it expires, so it reads as running out rather than as
  switching off.
- **The bubble replaces the blink while it is up.** They are two different
  promises — the blink says "the sweep cannot land on you", the bubble says
  "nothing at all can take a life" — and the bubble's is stronger and
  shorter, so it speaks first and the blink carries the rest of the beat.
  Drawing both gives you a bubble around a player flickering in and out of
  existence, which reads as a rendering fault.
- **THE RUN IS PART OF THE SESSION, and leaving it out read as the cores
  never going down.** `saveSession()` stores the cores you have reached and
  the lives you have spent (`co`/`lv`), and `resumeSession()` reads them back
  **only on a trial** — a boss resumes at phase 1 with a fresh pack, so it
  has to resume with fresh lives too. Without them, CONTINUE put the player
  back on their square with the amber row full again and the marker on a core
  they were standing on, so the row could not go down until they stepped off
  and came back. Reported from a playtest by somebody who had closed the game
  between crossings — which is why the owner never saw it in one sitting. The
  clock's own count is deliberately *not* stored: a rhythm restarts cleanly,
  and being dropped back mid-beat is a hit nobody earned.
- **`respawn()` writes the session, and that is the half that made it a
  falling bug.** `saveSession()` refuses to write while `dying` is set, so a
  death recorded nothing and the stored board was the one from *before* the
  fall — full lives, old square. It runs after `die()` has cleared `dying`,
  so what is stored is the board the player comes back to. `trialHurt()`
  writes for the same reason, and also calls `checkWin()`: being pulled out
  of the plane by a sweep lands you on a real square in the volume, and it
  was the one way of arriving on a core that did not go through it.
- **A sweep hit costs a life and nothing else.** You keep your square, the clock
  keeps its count, and you get one beat of grace, spent visibly as a blink.
  Resetting the clock on a hit is what made the arena appear to switch off;
  see `docs/HISTORY.md`. If you were flat you are pulled back into the
  volume, because the plane is where being caught means being caught
  everywhere.
- **The charge ramp starts high**, not at nothing (slab .15, outline .5). The
  ramp is for *how long you have left*, not for whether there is a slice at
  all. Every beat also ticks, so the rhythm can be heard as well as watched.
- **The clock stops the moment you reach the goal**, not when the win card
  appears 380ms later (`levelDone`). The same flag guards the boss.
- **Offset the far platform in both axes.** Two platforms sharing a row of z
  are joined by one turn and one fold, and the level ends in four moves. Only
  `solve()` will tell you.
- Scored like a boss: `progress[name]` holds lives, read through
  `starsForRecord()` and written through `betterRecord()`, both of which ask
  `onTheClock(level)`.

### Verification

`solve()` is allowed a full opinion here, unlike on a boss: a trial is a real
level underneath, so BFS proves the geometry admits a route — **every leg of
it**, start to the first core and then core to core, because a trial whose way
back is a wall passes a check that only looks at the first. `TRIAL III` was
exactly that: the glass that makes the crossing interesting also makes it
one-way, so its middle core is the bridge block rather than a return to the
island. The obvious fix, a stepping stone that opens a route back, quietly
made the glass optional — which the load-bearing check caught. What BFS cannot
speak to is the clock, and `trialSafety()` stands in: for every square you can
stand on and every beat, either that square is safe or one a step away is —
the arena never corners you. `node tools/verify.js` runs both. The safety
check has already earned its keep, rejecting a catwalk two squares wide where
the sweep that owns that height leaves the middle square nowhere to go.

---

## Bosses

**A pack of hunters, and one line that belongs to both of you.**

Hunters walk the volume toward you on a real clock. Touching you costs a life.
There is no gun, no window to wait for, and nothing to farm.

| | |
|---|---|
| **THE LINE** | a hunter that gets onto your row or column **plants**, and the line lights up |
| **THE CHARGE** | at the end of that beat it comes down the line — the whole distance at once, because distance is what this game does not respect |
| **THE FOLD** | fold while it shares your silhouette column and it dies there instead |

**The same line is its attack and yours, and whoever acts first wins it.**
Being lined up is not an opening you wait for; it is a knife-edge you are
already standing on. And which axis you collapse decides *which* line you can
win: a hunter locked onto your row is only in your silhouette column when you
are facing along that row, so the answer to "it is charging me" is often a
rotation first — which costs you the beat you had. That is the fight: the
game's one question, asked while something is running at you.

**The pillars are their cover, not your weapon.** Rule 4 is unchanged and
still applies to you: fold from a column that already holds a block and it
kills you. So a hunter standing in a column with a pillar in it cannot be
folded on, and blocks stop a charge exactly as they stop you. One piece of
geometry, both jobs, opposite signs — which is why `BOSS III — The Search` is
the arena it is. Glass casts nothing, so the columns that *look* blocked are
precisely the ones you can attack from.

This is the fifth boss design. The four that failed, and the two versions of
this one the simulator rejected, are in `docs/HISTORY.md` — **read it before
changing the kill rule**, because the two most obvious alternatives have both
already been built and measured.

### Three phases, because a fight with no arc has only one dial

Every fight runs **three phases**, and clearing what is on the board begins the
next. Each phase changes the question rather than the speed:

| | |
|---|---|
| **1** | one hunter, a **bare floor**, the slowest clock in the fight |
| **2** | **the whole arena rises** — every pillar, spike, pane and crate the fight will ever have |
| **3** | **two** at once, on that same ground |

**There were four.** A third phase put a single `cunning` hunter — one that
refuses lines you could answer — between the arena rising and the pair
arriving. It went because three beats is the arc this fight actually has:
nothing, then the ground, then more of them. A fourth made the middle sag,
and "one smarter versus two ordinary" turned out to be a comparison the
design was interested in rather than the player. **The machinery is
untouched** — `cunning` and `hold` still work in `bossPhases()` and
`bossNext()` — so restoring it is one line of level data, exactly like the
twin.

**All the geometry arrives in phase 2, and nothing is added after.** Two
reasons, both found in playtest. It makes a phase legible: phase 2 is the one
where the *arena* changes and 3 and 4 are the ones where the *opponent* does,
so a player who dies knows which kind of thing beat them — a pillar rising in
a pillar rising in phase 3 read as more of phase 2 and buried the change it was meant to
announce. And it makes 3 and 4 a fair comparison: same board, so the only
variable is one smarter against two ordinary, which is the whole question
those phases exist to ask.

The reasoning is a diagnosis, not a taste. Every dial this fight used to
expose — `step`, `aim`, hunter count, `creep` — moves *execution* difficulty:
how fast you must act once you already know what to do. But the verb set is
three slow buttons and there is no dexterity ceiling to climb, so a faster
clock does not make the player better, it shortens the window for a decision
that takes as long as it takes. Phases move the other axis — how hard it is
to work out what to do at all — which is the axis a puzzle game is good at.
And they make failure legible: you know which phase beat you, and phase one
becomes muscle memory, so the retry is short.

**The comparison that used to live here is settled.** Phases 3 and 4 were two
answers to one question — is a single smarter opponent better than two
ordinary ones? — laid out consecutively so a player could feel both in one
sitting. Played, the answer was that the question belonged to the design
rather than to the player: two ordinary hunters on ground you already
understand is the ending, and the smarter one in front of it made the middle
of the fight sag. Three phases now, and the fourth is recoverable.

- **Every hunter prefers the line you cannot answer.** `bossNext`'s `lineTo`
  callback answers 0 / 1 / 2 — no line, a line, a line the player cannot fold
  on from where they stand — and grade 2 outscores grade 1 (48 over 40). Only
  the *ordering* matters: neighbours differ in distance by at most two, so the
  margin decides ties among adjacent squares and never sends a hunter across
  the arena hunting for one. That bound is the thing to preserve — widen it
  and preferring a line becomes circling, which is design 3 again.
- **This is what stops a stationary player winning.** A hunter that seeks
  *any* line walks into the one silhouette column a player standing still can
  fold on, so never moving beat every arena. Preferring the unanswerable line
  means the answer is a rotation, and a player who will not rotate loses.
- **`cunning` is kept but unused by any level.** A cunning hunter
  additionally declines to plant on a line you could answer — but only `hold`
  times (currently 2), the same patience valve the twin uses and for the same
  reason: an opponent that will not attack from anywhere you can punish stops
  attacking. It never stops *walking*, so it closes on you the whole time it
  is being fussy. Measured, phase 3 produces 18–21 declines against a passive
  player where phase 2 produces none.
- **The player's counter to `cunning` is rotating**, which relabels every line
  at once — so turning stops being a way to aim and becomes the answer. That
  is the fight's own question asked one level up.
- **Rising blocks genuinely edit `L.blocks`** and rebuild `R`, so the pristine
  list is kept in `L.arenaBase` and restored by `bossReset()`. It is captured
  **exactly once**, the first time the level is ever loaded, and never
  overwritten — capturing it again on a later load is the bug that ordering
  avoids, because by then the last attempt's pillars are already up.
- **A pillar rising into an occupied square lifts you onto it** rather than
  burying you (`liftPlayer`). The flat case is the *common* one, not the
  exception: you clear a phase by folding, so the next phase's pillars almost
  always come up while you are in the plane, and there it is `flatPos.y` that
  has to rise, because that is the height `doUnflatten` lands you on.
- **Crates may only arrive in one phase.** Putting them on the board means
  rebuilding the crate list, which snaps any crate you had already shoved back
  to where it started. `bossArena()` has no opinion on this — it is a note,
  not a check.
- **The crush verdict is taken before `bossFoldCrush()` runs.** Clearing a
  phase raises pillars, and asking `R` afterwards asks a world that has grown
  one since you committed — the player is crushed by the reward for the kill
  they just made. This is the twin's old bug in a new place; see below.

### The twin — retired, and recoverable

`BOSS I` used to be one creature with two mirrored bodies. Playtesting called
it too hard and it was parked; when the campaign went to phases it was
replaced by `BOSS I — The Hunt` — since renamed again to `BOSS I — The
Sighting` — and `LEVEL_RENAMES` carries both.

**All of its code is still live and working** — `makeBoss`'s `twin` branch,
`twinSpawn`, `twinMirror`, `twinAligned`, `bossNext`'s `avoid` path, and the
twin arm of `bossArena` — so restoring it is one level-data paste, which is in
`docs/HISTORY.md` along with what was wrong with it. Two bugs there are worth
not re-introducing anywhere: the crush test must be taken **before** the fold
resolves (the phased fight hit exactly this, and it is why `doFlatten` now
captures both verdicts up front), and the green strike cue has to check for a
pillar in your column as well as a body, or it lights up while telling you to
walk into a wall.

### Details that are load-bearing

- **A charge needs the same height, not just the same row.** `bossLine()`
  used to check only x and z, so a hunter standing on a pillar had a line on
  a player on the floor below it and charged straight through the block it
  was standing on. Everything else already agreed height mattered —
  `foldKills()` checks it, `hunterTouching()` checks it, and `bosssim` had to
  be told about it before it would stop climbing pillars — so the line was
  the one place the rule was missing.
- **It plants to charge.** While a lock is held it does not walk, so the line
  you are shown is the line that fires — a telegraph that drifts is not a
  telegraph — and its stillness is the tell before the line even brightens.
  Stepping off the line breaks the lock; that is the dodge, and folding is
  the other answer to the same question.
- **The telegraph's ramp reads the *phase's* `aim`, through `bossAim()`.**
  Pacing lives per phase, so there is no `B.aim` to read. It used to read one
  directly, and when that moved the ramp silently became `NaN` — which does
  not throw, it just stops drawing the line, so the charge arrived with no
  warning and was reported, correctly, as being shot from across the arena.
  A telegraph that fails silently is worse than none, because the mechanic it
  is explaining still fires.
- **The charge line is always red, including when you can answer it.** It used
  to turn green whenever the hunter was foldable, and green is this game's
  colour for the goal — for *safe* — so the one drawing whose job is "you are
  about to be hit" said "you are fine" at the moment of maximum danger. It was
  reported, exactly, as not indicating anything. The line says one thing: the
  charge lands along here. The opportunity is said in the two places you are
  already looking — the hunter's own body turns green and swells, and the
  `GO 2D` button turns green and pulses — and being answerable only *adds*
  brightness to the line, so the contested one reads as live rather than as
  harmless. Three cues, one danger reading that never inverts.
- **IT FOLDS THE ROW ONTO YOU, and the telegraph says so.** The charge used
  to be a thin bar that brightened — a perfectly clear warning about a thing
  the player has no name for. It is a **pane standing along the line that
  collapses to nothing as the beat closes**: the fold, done to that row, by
  the other side. Nothing about the rules moved and nothing needed
  re-verifying; it is the same line, the same beat and the same hit, told in
  the one verb the player already owns. It works because the attack was
  already that shape — a hunter on your row *is* a hunter in your silhouette
  column the moment you face along that row, which is why folding answers it.
  The Census was already saying it too: they live in the plane. A hunter that
  can genuinely fold is a sixth design and a different question; see
  `docs/HISTORY.md`.
- **THE REPLAY: the last seconds, played back from the other side.** A charge
  is instant and it comes from across the arena, so the one event a player
  most needs to understand is over before they have looked at it. A still
  camera swung at the moment of the hit says some of it; playing the seconds
  *before* it says all of it — you watch the thing walk onto your row, plant,
  and then do to you the one move you could have made first. On a **death**
  it follows the hunter that hit you, from the view in which its line runs
  across the screen, and ends by folding the world onto you. On a **kill** it
  only runs on the fold that CLEARS a phase — killing one of a pair ends
  nothing, and a film there would interrupt a fight that is still going —
  **including the kill that wins the fight**, which the first version skipped
  because `bossAdvance()` goes straight to `win()` there and the card cut off
  the film the moment it was earned.
- **And the last death gets one, which was skipped for the same reason.**
  That path goes straight to `die("boss")`, and `die()` takes the board away
  820ms later. It is the worst one to skip: the run has just ended and the
  player is about to fight the whole thing again, which is exactly when they
  want to know what happened. `bossPendingDeath` holds the reset behind the
  film, the way `bossPendingAdvance` holds a phase clear — and it is checked
  first in `replayEnd()`, because if the run is over there is no phase to
  advance into.
- **THE ANGLE THAT KILLED YOU IS THE ONE LOOKING ALONG THE LINE**, and it
  took two tries to get there. The first version took the view whose
  screen-*right* is the charge direction, so the thing entered from the left
  and ran at you across the screen. That is a fine drawing of a charge and
  the wrong drawing of *this* charge, because it never shows why the charge
  is a kill: the kill is a shared silhouette column, a silhouette column is
  what you get by collapsing the **depth** axis, and so the two of you only
  land in one square when the camera is looking **down** the line you share.
  Across it, the fold at the end squashes the row sideways and you stay two
  separate things on screen — which is exactly the question the replay
  exists to answer. So it is the view whose depth axis is the charge
  direction **reversed**: `AX[v].d` points at the camera, so matching it to
  where the charge came *from* puts the hunter at the front and you behind
  it — you are looking over the thing that killed you, down the line it took,
  at yourself at the far end. Then the fold closes that depth and the two of
  you land in one square, which is the kill. The 180 is the owner's call and
  the right one: the film belongs to the other side, so the other side is
  what the camera is behind. Turned to by the shortest way round.
- **THE 180 IS PRESENTATION, NOT A RULE, and it is worth knowing which.** The
  fold collapses the depth axis, so a hunter sharing your silhouette column
  dies whether it is in front of you or behind you — the kill is symmetrical
  and always was, and nothing about which way the camera faces changes what
  happens. It is kept because it reads better: the film belongs to the other
  side, so the other side is what the camera sits behind. Do not derive a
  mechanic from it.
- **The replay's `view` is the camera's, and the silhouette is recomputed to
  match.** The renderer derives every position from `viewAngle`, so the
  picture was already right — but `flatPos.u` is a coordinate in whichever
  view it was measured in, and a death replay deliberately swings a right
  angle away from that. Left alone, a player who was flat during the filmed
  seconds is drawn in the wrong column, in the film whose whole subject is
  which column you share. `player.x/z` are untouched by folding, so the
  square is always there to re-project from.
- **A replay has to look like one.** It runs slower than life
  (`REP_RATE` .55), and it wears the three things film has used to say *this
  is footage* since before games existed: bars top and bottom, a wash over
  the world, and a label. Without them it was reported, fairly, as the game
  behaving oddly. The wash is a flat overlay and not a filter on the canvas —
  a filter on a full-screen WebGL canvas repaints every frame, on a phone, at
  the most expensive moment in the game. The HUD and the control bar dim with
  it, because they are inert and should look it.
- **No shield bubble in the film.** It is a recording of a moment when there
  was no shield, and a bubble round a recorded pose says the player was
  protected in a second they very much were not.
- **The film always plays in the volume, whatever was recorded.** A death
  taken while flat used to replay flat — the world was already collapsed, so
  there was no depth to look down and no fold left to close, and the one
  thing the film exists to show had happened before it started.
- **Standing a flat pose up means RE-DERIVING the square, not reading it.**
  `player.x/z` is the square you folded *from* and it does not move while you
  are flat: walking in the plane changes `flatPos.u` and nothing else. So a
  player who folded and took three steps replayed standing back where they
  had left, never arriving anywhere near the thing that killed them — in the
  film whose entire subject is that the two of you ended up in one place.
  What a plane pose means in the volume is the square you would have come
  back to, so it is `R.landings()`/`R.pick()` on the recorded column, the
  same pair `GO 3D` itself calls. That square is in the silhouette column the
  hunter shares, which is what the kill *is*, so they line up by
  construction — and a plane step then reads as a sideways step in the
  volume, which is what it was.
- **A kill puts YOU nearest the camera, and the fix for that was the mark
  rather than the angle.** A kill was replaying from the victim's side, and
  the cause was the last recorded frame: taken up to 50ms before the fold, it
  held the player *standing* at their real square rather than flat — and a
  standing player is at their own depth, which is behind the victim as often
  as not. `replayMark()` in `bossFoldCrush` now takes the frame after `flat`
  is set and before the splice, so the film ends with the player flat and the
  victim still on the board, and `replayPose()` stands them up on the
  front-most block of their column. The camera's own kill-side swing is then
  nearly always a no-op — the victim shares the column at the player's height,
  so the block under it is one of their landing candidates and `R.pick()`
  takes the nearest. It is kept for the one case that breaks that: `pick()`
  prefers amber over nearest, so an anchor in that column can land the player
  *behind* the thing they just killed.
- **The last frame has to be the kill itself.** Sampling at 20Hz means the
  newest frame can be 50ms stale, and 50ms is exactly the window in which a
  charge crosses the arena and lands — so the film ended a moment *before*
  the two of them met. Worse, the pack goes back to its spawns and the player
  is sent home before the replay starts, so by then the kill pose is gone
  entirely. `replayMark()` takes it on the first line of `bossHurt`, before
  anything moves.
- **MOST DEATHS ARRIVE WITH NO LINE AT ALL, and that is what kept the camera
  broken through three fixes.** Three of `bossHurt`'s four callers pass none
  — *it closed on you*, *it reached you*, *you walked into it* — and only the
  charge passes one. **A flat kill is always one of the three**: waiting in
  the plane means a hunter walks into your silhouette column and
  `hunterTouching()` fires. The derivation below was guarded on a line object
  *with zeroes in it*, which is what `huntLine()` returns while flat but not
  what those callers send, so it never ran. "Press `GO 2D` on `BOSS I` and
  wait" reproduced it every time, and each of the earlier fixes was correct
  about a path that repro never took. **When a bug survives a fix, re-derive
  which code path the reported steps actually go down before improving the
  one you were looking at.**
- **A flat death still has a direction even though `huntLine()` reports
  none.** Flattened, a hunter has a line on you the moment it shares your
  silhouette column, which means differing **only in depth** — so the
  direction is the current view's own depth axis, signed from the hunter
  toward you. Without that the flat deaths got no swing and played from
  whatever angle the player happened to be facing, which is the one angle
  that cannot show what happened.
- **THE FILM IS TOLD THE MOMENT, BECAUSE THE BOARD HAS ALREADY LEFT IT.**
  Everything in `bossHurt` after the hit moves off the kill: the pack is
  thrown back to its spawns, so the hunter object the replay was handed is
  standing somewhere else by the time it starts; and `bossSendHome()` resets
  `flat`, `flatPos` and `view` to the opening pose. So the camera worked out
  which way round to film from a board that no longer described the kill —
  which on a flat death is *every* input it has, and it showed as the thing
  that killed you being behind you. Reported twice from screenshots. Fixed by
  copying rather than reordering: the reset has to happen before the film, so
  the player is put back somewhere known, and the film has to be handed the
  moment. `at` is that copy, taken beside `replayMark()`.
- **And the sign is measured from the square the film DRAWS you at, not
  from `player.x/z`.** While flat those are the square you folded *from*,
  which is wherever you happened to start and sits on either side of the
  hunter about half the time — so the direction came out backwards half the
  time and the film put the thing that killed you behind you. The position
  the camera has to reason about is the one `replayPose()` uses: `R.pick()`
  on the player's own column in the **recorded** view. Because the block the
  hunter stands on is always one of those candidates — a hunter only has a
  line on a flat player at the player's own height — the drawn player is
  always at or in front of it, so a flat death always ends up a half turn
  round. The arithmetic is kept rather than folded into a constant, because
  it is the arithmetic that explains why.
- **It records state, not inputs, and that is a decision rather than a
  shortcut.** The two families are re-simulation from recorded inputs plus a
  seed, and a ring of state snapshots. The first is tiny and needs exact
  determinism, which this fight does not have and cannot cheaply be given —
  the pack advances on wall-clock `dt`, so a frame arriving 3ms late moves
  everything and the replay would drift from what the player actually saw.
  The second costs memory, and here that argument is not close: the world is
  a handful of integer cells, so six seconds at **20Hz** is 120 frames of
  about a dozen numbers. 20Hz is not a tuned number — everything moves in
  whole cells on beats of 600ms and up, so a sample every 50ms catches every
  position the game was ever in and there is nothing to interpolate.
- **Playback writes the recorded pose into the live state**, and that is safe
  precisely because nothing is running: `bossHolding()` refuses all four
  verbs and `bossFrame` returns. Every drawing path — the fold, the telegraph
  pane, the depth fade, the peril tint — then works on the film exactly as it
  works on the fight, for no extra code. The live state is saved at the start
  and put back at the end.
- **A phase clear WAITS for its replay** (`bossPendingAdvance`). Advancing
  first would leave `replayEnd()` restoring a board that had already moved on
  — the same class of bug as the twin's respawn and the phase-2 crush.
- **The restore is unconditional, and the first version's was not.** It
  guarded on the cam still running while the caller had stopped it a line
  earlier, so `viewAngleTarget` kept the 90° the swing had added and `view`
  did not — and from then on the arrows moved the player at a right angle to
  the screen. Reported exactly as up/down/left/right getting stuck after a
  kill. **A camera that borrows a state value has to give it back on every
  path out.**
- **The camera follows its subject, and only here.** `FOLLOW` is off in play
  because the bigger world put hunter spawns outside the frustum; during a
  replay nothing is being played, so following is free — and it is what makes
  the film read as somebody's point of view rather than as the same board
  with different things on it. It leans rather than locks (35% back toward
  the arena centre) and zooms in a little, both clamped to the arena.
- **Slow motion on the two moments the fight is decided.** A kill and a hit
  are both instant, and both happen on a beat the player is already reacting
  to, so the thing they most need to see — which column it was, which line it
  came down — is over before they have looked at it. `slowMo()` runs the
  fight at `SLOWMO_RATE` for `SLOWMO_MS`, as one multiplication on `dt` in the
  same place `paceScale()` lives, so every window slows together and keeps its
  ratio. Its own counter runs on **real** time, or the slowing would slow the
  thing that ends it. Fired on a kill, on a hit, and when a fold into a wall
  is committed.
- **The telegraph is drawn in the volume and does not fold with the world.**
  The charge happens along that row whichever way you are looking, and the
  whole tension is that the axis you must fold along to answer it may not be
  the one you are facing. Swinging the line around with the camera would tell
  that lie.
- **`bossNext` scores alignment far above distance**, and does not avoid
  anything. Purely closing made a hunter shuffle diagonally for six seconds
  looking for an angle, which reads as a wander rather than a hunt; avoidance
  made it freeze.
- **Two escalations, because nothing else stops a kite.** `rage` is what the
  survivors of a fold get for surviving it, so a fold that kills nothing is
  worse than free; `creep` tightens the whole pack every few seconds whatever
  you do. Both floor out at `floorStep` so it stays human.
- **A hit throws the pack back to its spawns AND sends you home**, which
  reverses an earlier call, on the owner's say. The old argument stands — it
  costs the position you spent twenty seconds building, on top of the life —
  but a hit is the moment the board changes most, and being put back
  somewhere known, standing, facing the way the level opens, is what makes
  what follows readable rather than a scramble from wherever you were caught.
  It happens **before** the replay starts, so the pose the replay saves and
  restores is the one the player is meant to come back to.
- **Clearing a phase throws *you* back to your corner** (`bossSendHome`),
  which is the deliberate opposite. Killing means folding and folding means
  being where it is, so the square beside a spawn is the best in the arena:
  stand there and take each arrival as it appears. That is farming, it was
  found in the first playtest, and winning the exchange is the moment you can
  afford to give ground up.
- **It is a phase boundary, not a kill.** The camp it closes is the one
  *between* phases: every phase puts its hunter on the same cell, so holding
  that cell means the next arrives beside you already. Inside a phase there is
  no queue to farm — phase 4's two hunters walk at you once and only return to
  their spawns if they hit you — so killing the first of them moves nobody.
  Taking back ground you earned would charge you for playing well, which is
  precisely what a hit is careful not to do.
- **A phase boundary is a held breath, not a cut.** `bossPause`
  (`BOSS_PAUSE`, 1900ms) stops the fight between phases: nothing walks,
  nothing lands, and none of the four verbs answers. The order matters and is
  the order a player can follow — **reset first, geometry second**. They are
  stood up, put back on their corner and turned to the opening view while the
  board is still the one they know; only then do the pillars rise; then they
  get most of two seconds to look at it. It used to raise the pillars, drop a
  fresh hunter in and teleport the player home 420ms later with the clock
  running, so the board you were reading was never the board you were
  standing on.
- **The pause is taken before the grace beat, not inside it.** `B.grace` is
  for the moment the fight restarts; burning it while the player reads a card
  would hand it back already spent.
- **Standing the player up is also what stops 2D sticking after a win.** You
  kill by folding, so a boss is nearly always beaten from inside the plane —
  and the plane is a whole *theme*, not just a camera, so winning flat left
  the win card, the map and the menu on 2D's paper until something else
  loaded. `bossAdvance()` calls `bossSendHome()` before `win()`.
- **It puts the whole view back to the opening: start square, volume,
  starting rotation.** Arriving at a new phase still folded and facing an axis
  chosen for the last one means reading a board that changed while you were
  not looking at it straight on.
- **Standing the player up costs the fight its anti-camp property, and that
  had to be paid for elsewhere.** Being flat after a kill is exposure, and it
  was the exposure that punished never moving: measured, keeping the player
  flat on a clear makes `bosssim`'s idle policy die in phase 2, and standing
  it up lets idle win all four unhit. What replaced it is `bossNext`'s line
  preference — see below.
- **No hunter may spawn within 5 of the start square, or on its row or
  column.** The player is returned there after every phase *and* every life
  lost, standing and facing the opening view, so it is where they keep
  reappearing rather than somewhere they pass through once. A spawn sharing a
  line with it has a line on the player from the first instant of the phase,
  before they have moved. `bossArena()` checks both; every second spawn in the
  game broke one or the other.
- **The start square must be foldable in at least one view**, also checked,
  for the same reason: it is where the player is repeatedly dropped, and a
  square whose every silhouette column is blocked is one they arrive at unable
  to answer anything.
- **No two hunters may spawn sharing a silhouette column.** They respawn
  together after every hit, so a pair that shares one there is a standing
  gift, renewed. `bossArena()` checks it, per phase.
- **A hit throws the pack back to the *current phase's* spawns**, and the
  arena keeps whatever has risen. Losing a life does not rewind the fight.
- **And it buys a shield: one second in which nothing can take a second
  life**, drawn as a bubble round the player. It is shared with the trial and
  the reasoning is written up there — `bossGraceMs` only ever stopped hunters
  touching you again, and had no opinion about falling out of the world in
  the same moment.
- **On a clock, the `GO 2D` button is re-judged every frame** in the render
  loop rather than in `syncHud`. It is the one place a button class is not
  owned by `syncHud`, and it has to be: hunters move while you do not, so a
  cue computed at your last keypress describes a board that has moved on.
- **`bossHp` counts phases remaining, not bodies.** The bars in the HUD are
  the arc of the fight; killing one of a phase's two hunters moves nothing.
- **The HUD's two rows are "you" and "them", and each wears its own side's
  colour.** Lives are hearts in the player colour; the row underneath is a
  boss's phases in the hunters' own red or a trial's cores in the amber those
  cores are actually drawn in. It used to be violet for both, to match the
  map — but the map is separating one landmark from another in a list, and
  the HUD is separating you from the thing in front of you, which is a
  different job. The map keeps violet.
- Scored on lives, three stars for three intact. `progress[name]` holds lives
  for a boss or a trial and a move count for everything else — opposite
  senses in one slot — so reads go through `starsForRecord()`, writes through
  `betterRecord()`, and both ask `onTheClock()`.
- **Undo does not touch a fight at all.** It cannot: there is no tick to step
  back to, and rewinding a kill while they kept walking would produce a state
  that never happened.

### Verification

`solve()` knows nothing about bosses and must not: none of this is a function
of a move sequence. Two checks stand in.

- **`bossArena()`** — the stage works: every hunter can reach you, none spawns
  inside a block or in another's column, and enough of the floor is under a
  pillar's shadow to make position matter without leaving nowhere to fight
  from. **Every phase is checked as its own board**, because pillars that rise
  later can seal a spawn off or hand the pack a free kill exactly as authored
  ones can. The one check not applied per phase is the *lower* bound on lethal
  columns: an opening phase with a bare floor has none by design, and that is
  what it is for, so only the finished arena is asked for somewhere to fight.
- **`tools/bosssim.js`**, run by `verify.js` — it plays each fight twice, all
  the way through its phases, raising each phase's blocks as it reaches them.
  An IDLE policy that never moves and takes every free kill must **lose**; a
  DUELLIST that lines up, turns to re-aim and folds must **win**. Neither is
  a good player — the duellist never *herds*, which is the actual skill — so
  a fight it wins is winnable by doing considerably less than the design asks.
- **The simulator cannot see whether `cunning` is interesting**, only that it
  is survivable. The duellist ends a phase in about five moves, so the phase-3
  hunter rarely lives long enough to plant at all — measured: zero declines in
  a full run, and 18–21 when the same phase is played against a passive
  policy. That the mechanic *fires* is checked; whether it is fun is a
  playtest, per the working agreement.

**Both of these are optional when the owner is playtesting a fight** — see
Working notes. They are worth running when the *rules* change; they are not
worth running to tune a number the owner is about to feel out anyway.

---

---

## The look — the block, the sky and the air

**The complaint was that it had good mechanics and did not feel like a game**,
and the first answer — a finer texture on a flat cube — was correctly rejected
as a finish rather than a redesign. What landed changes the *shape* and the
*value structure* of a block, and gives every section its own weather.

### The block

A block is a dark case with a **lit rim** — one of three languages rendered
side by side and picked from the screenshots. Two things make it free:

- **It is one merged geometry shared by every block in the world**
  (`makeBlockGeo`, built by `mergeBoxes`), so a block is still exactly one
  mesh and one draw call. The rim is four thin bars riding the top edges,
  geometry rather than lines, so it survives the fold and the depth fade like
  everything else.
- **Per-face brightness is baked into a vertex-colour attribute**, which
  three.js multiplies by `material.color` — and `material.color` is rewritten
  every frame by the block loop (depth fade, peril red, the lerp to ink). So
  the whole redesign inherited that behaviour without the block loop changing
  by a line. This is the same trick a texture would have used, and it is the
  reason to reach for `map` or `color` attributes rather than for the one
  channel the game already owns.
- **The rim is a value, not a colour** — the body's hue pushed past 1 — so a
  section that tints the stone tints the rim with it, and there is no second
  palette to keep in sync.
- **`boxGeo` and `edgeGeo` were swapped in place** rather than joined by a new
  name, because blocks and crates are the only things that used them.
  `edgeGeo` is cut from the **case** (.9), not from a full cell, or a hairline
  floats in the seam the inset creates.

### The sky and the air

Both hang off the **camera**, not the scene. The camera turns in 90° steps and
the player never sees these move with it, so they read as screen-space
atmosphere rather than as objects in the world the fold would have to account
for.

- **The sky is one quad with two real gradient stops** written into its colour
  attribute — not a white-to-black ramp times a material colour, because one
  multiply cannot make two hues.
- **It folds to paper with everything else.** It replaced `scene.background`,
  which was being lerped void-to-paper every frame; a gradient that stayed
  dark behind a white page would be the one thing on screen that had not
  noticed. `scene.background` is **kept alive anyway** — the loop still hands
  it to `outlineFor()` as "what the player is drawn against". Nulling it was
  tried and threw once a frame.
- **The air is a handful of round motes**, rebuilt per section. Round because a
  drifting square reads as debris; and **`depthTest` stays on**, because
  three.js renders transparent objects after opaque ones whatever their
  `renderOrder`, so without it the weather draws over the puzzle.
- **A section may `flare`** — the void warms for a beat every `flare` ms. That
  is the eruption, expressed as the sky doing something rather than as a
  mountain drawn behind an abstract puzzle. It starts a third of the way into
  its cycle: from zero it landed about a second after the level opened, while
  the player was still reading the board, and read as a glitch.

### What a section does — and the one rule that keeps it safe

`SECTIONS[].theme` is a sky gradient, a stone colour and an ambient field.
`col` beside it is a **UI** colour that has to read as a tab on a dark panel;
they are deliberately not the same value. `applyTheme()` runs once per level
from `loadLevel`, not per frame.

**THE STONE IS DESATURATED ON PURPOSE.** The pieces carry fixed identities —
fire is orange, water is cyan, a crate is violet, an anchor is amber — and
they are what a puzzle is made of. A saturated world was rendered and it hid
the piece it was teaching: a red world swallowed a fire block whole, a blue
one swallowed water. **Muted world, saturated pieces, and both read.** If you
raise a `block` value, go and look at that section's fire and water before you
keep it.

**THE SECTIONS ARE ELEMENTS: nature, fire, water, sand.** That is the owner's
call and it reverses a permutation this file used to argue for — the old rule
put the fire section in *frost* and the water section in *ember*, on the
grounds that theming a section in the colour of the piece it teaches
camouflages exactly what it exists to show. The camouflage risk is real and
has been paid for rather than ignored: **the element lives in the horizon,
the weather and the sound, and the sky over it still leans the other way.**
So section III is an ocean at *sunset* — unmistakably water, with a warm sky
that keeps a cyan water block singing — and section II keeps its near-black
basalt under a fiery sky rather than glowing orange. The desaturation rule
below is untouched, and it is still the check: **if you raise a section's
`block` value, go and look at that section's fire and water.**

**`IV · CRATES` moved off violet onto sand**, which fixes the one place the
old permutation was broken anyway: a crate is drawn violet, so the section
teaching crates was wearing the colour of its own piece. Sand is kept pale
and low in chroma so it does not collide with the trial's saturated amber
either; the node shapes are what actually tell those apart.

The same rule one level up put `I · FUNDAMENTALS` on olive rather than a true
green: the goal is a saturated teal-green wireframe and it appears in *every*
section.

**Each section carries an `amb` and its own moving layer.** `theme.amb` names
the ambience (`birds`, `fire`, `sea`, `wind`) and `theme.scene` names both
the baked horizon and the sprites that go over it — `trees` brings birds,
`hell` brings meteors, `ocean` brings sailing boats, `desert` brings a
tumbleweed and a dust devil. One field decides both, so the sound and the
picture cannot drift apart.

### Surfaces, and why water lost its ring

**Water and fire are their own shape now** — a full cell with a surface plate
a little below the top (`makeLiquidGeo`), where stone is the inset case with
the lit rim. They are told apart in silhouette before a colour is read, which
is what retired water's marker.

**Only the anchor still carries a symbol.** Water became a shape and lost its
ring; a crate became obsidian and lost its bars. The anchor is the last piece
that is still ordinary stone in a different colour — amber — so it is the
last one that needs a mark. **The rule is that a marker is what stands in for
a form a piece does not yet have**, and it comes off the moment the piece
gets one; it was never decoration.

**A crate is obsidian**: a near-black glassy body with sharp facets and
violet fire in the cracks. It is the first piece whose texture also drives
`emissiveMap`, which is what makes the veins *light* the block rather than
being painted on it — a multiply alone leaves a vein exactly as dark as the
body it runs through. It keeps its two-bar marker, because obsidian and
basalt are both near-black and until a crate has a form of its own the marker
is the thing that says which is which.

**Surfaces are drawn, never loaded**, one canvas per look, laid out as
`[ side | top ]` in one image. `mergeBoxes` remaps the UVs so faces +Y/-Y
sample the right half and the four sides the left. **This is the only way to
get two hues onto one block**: a grass block is green over brown, and no
multiply of one `material.color` makes two colours. The map is a *relative*
statement, so `material.color` still carries the section tint, the depth
fade, the peril red and the lerp to ink — the block loop never changed.

- `magFilter` is `NearestFilter`: the chunky read is the point, and a
  smoothed 128px texture is just mush at play size.
- **THE GRAIN IS DELIBERATELY NOT A PIXEL GRID, and that is a commercial
  decision rather than a taste one.** The first cut drew square cells on a
  16px lattice, which is a very particular published game's look. Nothing was
  ever copied — there are no image files in this project and every pixel is
  drawn by `10-render.js` — but a style is recognisable without an asset
  changing hands, and this game is meant to be sold. So the grain is rounded
  and irregular (`blobs`, lumpy six-point discs on a jittered lattice), the
  greens are brighter and warmer than the obvious ones, the sides are clay
  rather than dirt, and water and lava are drawn as **flowing bands and veins**
  rather than as hot and cold cells. Basalt is the one angular surface,
  because it should read as broken rather than as grown. **If you retouch
  these, keep them off the lattice.**
- **A section's stone colour goes near-white when it has a surface**
  (`0xbdbdbd` for grass), because the texture is carrying the hue and a
  saturated tint would double it into ink.

**A block outlives its level, and that bit.** `syncMeshes` keys meshes by cell
and `addMesh` returns early when one is already there, so a block standing in
the same place in the next level is *reused* — and keeps the surface it was
built with. Crossing from grass into basalt left every shared cell wearing the
old ground. `applyTheme` now drops all block meshes when the surface changes
and lets `syncMeshes` rebuild them.

### The things that move in front of the horizon

**The band is baked, so everything alive is a second layer.** `spriteTex()`
builds one canvas texture per kind and `spriteGroup()` hangs a few planes
off the camera sharing it; `layoutAtmosphere()` places them in **frustum
fractions**, so they hold their place on screen while the camera follows the
player, exactly as the sky and the band do. All of them fade with the fold —
there is no distance in a silhouette, so there is nowhere for a bird to be.

- **Birds are a V, and the flap is the V opening and closing** — a scale on
  one axis, not a second drawing. At fifteen pixels a V is the whole of what
  a bird is.
- **The wind is one number moving three things.** `windAt()` is two sines at
  unrelated rates, and it leans the treeline band, carries the birds and
  blows the leaves. The treeline cannot move — it is baked — so what sells
  wind is everything *else* agreeing about it. A horizon that leans while
  nothing else does reads as the camera wobbling.
- **Leaves fall and tumble** (`air.kind:"leaf"`). The tumble is a squash on
  one axis rather than a spin, because these are little discs and a disc
  turning on its own axis is still a disc.
- **A meteor waits, and then it LANDS.** `wait` holds each one off screen for
  a few seconds, so the sky is mostly empty and a streak is an event; a
  continuous rain of them is a screensaver.
  - **The trajectory is one vector, and that was the bug.** The first version
    took an angle for the sprite's rotation and then moved it by a different
    pair of numbers — always rightward, and downward by the *absolute* sine —
    so a meteor pointed one way and travelled another. The angle is now
    chosen once over a 90° fan of downward directions, the sprite is turned
    to it, and the position walks along it.
  - **The end of the flight is the horizon**, so the flight length is derived
    from the angle (a shallow one crosses further than a steep one) and the
    landing point is chosen *on screen* first, with the start worked
    backwards from it. A streak that ends where nobody can see it is not an
    event.
- **The sun the glitter road belongs to.** The road was there with nothing at
  the top of it, which is a reflection of something not in the picture. It
  sits on the horizon at the road's own x — the road is drawn from .52 to .60
  across, so the sun is centred at .56 and the two cannot drift apart.
- **The foam is the only living part of the sea**, because the band is baked.
  It runs up the beach on a root curve rather than a straight one, which is
  what water climbing sand does, and it is timed off the same clock as the
  crash.
- **Boats sit on the waterline, and it is derived rather than nudged.** The
  band is `h*.30` tall centred at `-h*.19` and the sea starts 96 rows up a
  160-row texture, so the horizon is `-h*.34 + .6*h*.30`. Anywhere else and
  the boat is the wrong size for the water it is on.
- **The tumbleweed's spin is tied to its travel.** A ragged ball sliding
  sideways is litter; one turning at the rate it moves is a tumbleweed. It is
  the only sprite in the game that rotates on its own axis.
- **The dust devil is one soft cone with the swirl painted into it.** A
  hundred grains at that distance is a smudge that costs a hundred draw calls
  to be.

### Scenery

One textured quad on the camera, per section: a treeline, or the ridge and the
things moving along it. Silhouettes rather than lit scenery, because the game
is an orthographic abstraction and a rendered forest behind it is a different
picture with a puzzle sitting on top.

- **The glow is drawn before the ridge and has to be strong.** A near-black
  spire on a near-black sky is nothing; the bright band is what the silhouette
  is a silhouette *against*.
- **Broad and low, never needles.** The first cut ran spires to 132px of a
  160px canvas and grew a picket fence up through the puzzle. A horizon sits
  *under* the thing being played.
- **It is raised off the bottom edge**, because the control bar lives there.
- **Faded right out in the plane**: there is no distance in a silhouette.
- **Every section has a horizon now**: a treeline, hell's ridge, canyon
  mesas, broken columns, and a few floating slabs for the shelf. Flat tops,
  spikes, canopies and pillars are four silhouettes nobody can confuse, which
  is the point — a section should be identifiable from its skyline alone.
- **`repeat.set(2,1)` for a band that is pure texture, `1` for one with a
  LANDMARK in it.** Hell has a volcano, and a volcano that tiles is two
  volcanoes.
- **Lava comes OUT of the volcano rather than being drawn on it.** A single
  stroke down the flank reads as a crack in the rock. What says "flowing" is
  a stream that starts narrow at the mouth and **widens as it falls**, with a
  hotter core inside a cooler edge, ending in something pooled and bright at
  the foot — plus spatter thrown clear of the mouth.
- **The volcano's crater is a radial gradient filled through a circular
  path.** A linear gradient in a `fillRect` draws a visible box — the ramp
  runs one way and the other three edges stop dead — which on a dark ridge
  reads as a lit rectangle sitting on the mountain. Anything glowing has to
  fade out on every side it has, and the same mistake made the plume's own
  quad visible until its falloff was pulled inside its edges.
- **The plume ramps on `skyWarm`**, the same value that warms the sky, so the
  eruption and the flare are one event rather than two things that happen
  near each other.
- **NOTHING IN THE BAKED TEXTURE CAN MOVE**, and that is the price of the
  horizon being one quad and one draw call. The volcano was reported as not
  moving because everything in it — the cone, the flows, the crater — is
  painted into the scenery texture. Motion has to be drawn *on top*: sparks
  thrown out of the mouth (`makeSparks`), and a plume that **breathes at
  idle** as well as swelling on the flare. A glow that only moves once every
  seventeen seconds is a still picture for sixteen of them, which is exactly
  what "it is not moving" meant.
- **`r[2]` bit twice.** After the spires, the mesas and the columns were
  written with `r[3]` on three-entry rows and came out `NaN` tall, invisible
  and silent, exactly as documented above. There is now a check for it:
  sample each horizon's base row and assert it has opaque dark pixels.
- **Stars are fixed, not drifting** — that is the whole difference between a
  star and a mote — seeded so a section's sky is the same sky every time, and
  kept to the upper half of the frame, because a star behind a block is a
  star nobody sees.
- **Trees are rounded canopies in three hazed ranks, kept to the lower half
  of the band, scattered rather than spaced.** The step between them runs
  from well under a canopy width to well over it, so they clump and leave
  open ground; an even step reads as a fence. A band of grass tufts along the
  bottom joins them to the picture — without it the trunks ended in mid-air
  and the wood looked pasted on. The first cut was one row of stacked conifer skirts and read
  as a sawblade; the second ran canopies to the top of the canvas and became
  a wall the puzzle sat on. What sells distance is the pale haze *between*
  the ranks, and it is a gradient — a flat wash put a hard horizontal line
  across the forest that read as a seam in the drawing.
- **`[depth, colour, height]` is three entries and the height is `r[2]`.** It
  was written as `r[3]` to match the treeline's four-entry rows, which made
  every spire `NaN` tall — and **canvas draws nothing for a NaN path and
  throws nothing either**, so the band rendered as a bare gradient and looked
  like a colour choice rather than a bug. If a procedural drawing comes out
  empty, sample the canvas before re-picking the colours.
- **The demons are scenery and never enter the world.** Nothing on that band
  is a hunter, and a shape a player could mistake for one is a lie the fight
  has to pay for.

### The plane is the world, flattened

**`INK_SETTLE` (0.18) is the whole control.** It is how far a block settles
toward ink when the world folds: 1 is the old behaviour — everything becomes
a black silhouette on paper — and 0 keeps the world exactly as it looked
standing up. It went from 1 to 0.18 because the plane was reported, twice, as
looking like a different game: a grass block folded into a black rectangle
and nothing but the geometry said the two pictures were the same place.

**What tells you that you are flat is not the palette.** It is the world
visibly collapsing, the grid coming in, and the button saying `GO 3D`. The
picture does not have to change colour to say it, and when it did, it said
something untrue instead.

Consequences worth knowing:

- **The paper is DERIVED from the sky, not authored** — `theme.sky[0]` lerped
  `PAPER_LIFT` (0.20) toward white. Hand-picked papers were tried twice and
  were wrong twice in the same direction: the first set was near-white, the
  second was a "lighter relative" that still came out as a bright day over a
  night meadow. A section only says what its sky is; the plane cannot drift
  away from it. `theme.paper` still overrides if one is ever needed.
- **`PAPER_LIFT` is the whole cue, and it is small on purpose.** At 0 the
  fold changes no colour at all. Every time it has been raised the plane has
  stopped looking like the same place, and what actually tells you that you
  are flat is the world collapsing and the button reading `GO 3D`.
- **The chrome follows the ground, not the verb.** `body.flat` swaps the HUD
  to dark-on-light, which was right when the plane was paper and is wrong on
  a night meadow. `syncHud` now asks `paperIsLight()` — Rec. 709 luma over
  `colPaper`, thresholded at .55 so a mid-tone counts as dark — so a dark
  section keeps the chrome it already had, and a wardrobe world with a pale
  paper still behaves exactly as it always did.
- **`applyPalette()` puts the section back.** Sections own the world now, and
  the wardrobe writes `colVoid`/`colBlock`/`colPaper`/`colInk` on every skin
  change — which happens *after* `loadLevel` set the theme — so it ends by
  re-applying `curTheme`. `applyTheme` only rebuilds the motes, stars and
  scenery when the theme actually changed, so that call is cheap.
- **The horizon stays, receded** (`1-flatT*.62`) rather than fading out. Now
  that a folded block keeps its colour, a horizon that vanished was the last
  thing still insisting the plane is somewhere else.
- **`inkLift()` is gone.** Driving the texture through `emissive` was a
  workaround for colour having gone black; with the colour still there the
  map multiplies normally and the grain simply shows.
- **Stars stay in the plane**, dimmed. The plane is the same sky in different
  light now, so a sky that emptied on the fold was the last thing still
  saying otherwise.
- **The grid is the editor's.** It used to draw in the plane as the cue that
  you were flat, back when flat also meant a different palette. A ruled
  overlay across a meadow was the one thing left that looked like a diagram
  rather than a place; the collapse, the sky lifting and the button reading
  `GO 3D` all say it without one.

### Water moves

The texture is shared by every water block in the world, so **scrolling its
offset animates all of them for the cost of two numbers a frame**. Only V is
scrolled — the atlas is `[ side | top ]`, so scrolling U would bleed the
surface into the sides. On top of that the whole mesh carries a few
hundredths of a cell of swell, **phased off the block's own x and z** so a
pool ripples instead of pumping in unison, and suppressed as the world folds
because a wave in a silhouette is noise.

### Water in the plane — a trace, then a drain

Water casts nothing into the silhouette; that is the rule and it has not
moved. But a player who folded while standing **on** water was left hanging
over nothing, which reads as a bug rather than as a mechanic.

So the fold leaves the water behind as a **shallow trace** under their feet —
sunk low in the cell, no edge on it, dimmer than it was standing up — and
their **first step in the plane drains it**: it sinks out of the square, the
spill plays, and it is gone. `drainWater()` is called from `press()` before
the move resolves, so the splash starts on the frame the player leaves.

That is the honest version of the rule rather than a softening of it: the
water was there, it is leaving, and once you have moved it is not coming
back. The trace is deliberately shallow and unlit so it never looks like
ground you could return to. `doFlatten` resets it, and so does standing back
up, so a re-fold shows the trace again.

- **The trace hangs from the TOP of the cell, not the bottom.** Scaling a
  mesh shrinks it about its own centre, so thinning it left the water on the
  floor of the square while the player stood on the square's ceiling — which
  reads as standing on air above a puddle. Raising by half the height lost
  keeps the *surface* where it was.
- **Only a move that exists drains it.** The plane has no up or down, so
  draining on any press let a stray swipe empty the water without the player
  having gone anywhere.
- **ONE BLOCK — the one you folded on — and it does not follow you.** The
  trace answers exactly one question, *why am I not falling through this
  square*, so it is needed on the single block that was under the player at
  the moment of the fold. A trace that filled the next block as you arrived
  made the plane look like it still had water in it, which is the opposite of
  what the rule says. `markWaterTrace()` captures it in the volume, before
  the fold resolves, because "the block I was standing on" is a fact about
  the world before it collapsed.

### Fire in the plane

**A flame is a lick, not a cone.** Four cones on a block was reported as
looking bad and it did: a cone is a solid object with a lit side and a dark
one, which is the one thing a flame is not. It is a flat tapered strip with
the colour in its vertices — white-hot at the base, gone at the tip — turned
to face the camera every frame, so there is no solidity to shade.

**Four flames, and in the plane they stand OFF the block with a gap.** In the
volume they cluster on the crust; flattened they line up evenly across the
cell, above it, smaller, spread along **screen-right** — the axis the fold
leaves intact, so the row reads as a row from whichever side you folded. The
gap is the load-bearing part: it says *this is not part of that block*, which
is the whole problem a silhouette creates. Both layouts live on each flame
and `fireFlames` crossfades them on `flatT`.

**They rise clear of the block when the world folds, and stop testing
depth.** Flattened, every block at every depth lands in one silhouette square,
so a fire block behind a stone one is drawn inside it and there is nothing to
see — in the square a player most needs to know is lethal. So in the plane
they climb and draw over whatever shares the column (`fireFlames`). In the
volume they sit on the block and behave normally, because there depth is
information rather than something in the way.

### The spill

`SFX.spill()` is `noiseFall` — the same two parts as `noiseRise` with the
bandpass ramp inverted. A riser climbs because something is arriving; a spill
falls because something is leaving. It plays on a fold **only on a level that
has water**, layered over `fold()` rather than replacing it, because the fold
is still the move the player made.

## The brief — tried on a trial and a boss, and taken out again

For a while a trial and a boss each opened with a full-bleed card explaining
themselves, twice per kind and then never again. The machinery worked and the
reasoning still holds: `cardPut()` answers `screenUp()`, and `screenUp()` is
what both clocks ask before they run, so the fight was genuinely stopped
while the card was being read.

**It stopped being needed, and that is the interesting part.** The falling
blocks, the folding telegraph and the replay each ended up saying on the
board what a paragraph of the card had been saying in words — and once all
three landed, the card was explaining a picture the player was already
looking at. A card like that is read once and dismissed unread from then on,
which is worse than not having one.

What is left is one sentence per kind, in the level's own `hint`:

| | |
|---|---|
| a trial | *Three lives, three places to visit.* |
| a boss | *A game of catch: whoever shifts the other into their own square first wins.* |

Each adds one short clause for what is particular to that arena — the
spikes, the glass, the crate, the high ground — and nothing else. **"Shifts"
is deliberate**: it is the word `cue()` already speaks for the fold ("2D
shift"), so the hint names the verb the way the game does everywhere else.

Restoring the card is a `cardPut(h, p, "brief")` from `loadLevel` plus a
counter in settings, exactly as it was. `cardOwner` is the seam it needs — a
card raised by anything other than a tutorial step must not advance a step
nobody completed — and it is deliberately still there.

---

## The map

**The level picker is a path, one section at a time.** A run of levels, a
trial partway in, a boss closing it — tabs across the top, a winding trail
below, drawn from `SECTIONS` and `LEVELS` exactly as the old list was. No
level data changed to make it.

- **A section's colour runs the whole way through it** — tab, header, bar,
  the lit trail and the solved nodes — so a finished section is its own chain
  rather than another stretch of the same green. The rim, ink and lip are
  `color-mix`ed from that one hue, which is what keeps a pale section (glass
  blue) and a dark one (spikes red) both legible without hand-picking three
  values each. **No section may be violet or amber**: those two belong to the
  boss and the trial in every section, and `V · EXTRA` had to move off violet
  for exactly that reason.
- **Boss and trial are different shapes, taken from the game's own world.**
  They used to be `#ff8a3c` against `#e0a03c` — the same hue two steps apart,
  which at 60px on a dark ground is not a distinction. A **boss is a hexagon**,
  which is what a cube looks like seen corner-on: the silhouette of the game's
  own piece, ringed by three arcs for its three phases, in violet. A **trial is a
  diamond inside a clock** — the square on its point, an open ring around it
  with three pips on it, in the amber that already means a core on a clock.
  An ordinary level is a bare disc. Turn the colour off and all three still
  read. The violet follows through to `.bcores` in the HUD.
- **The trial's sweep used to be a bar drawn through the diamond, and it read
  as a strikethrough.** It overshot the shape on both sides, which is not what
  a plane passing through something looks like — it is what a cancelled thing
  looks like. The ring says the same fact better (a trial is the level on a
  clock) and says a second one nothing on the map ever said: the three pips
  are the three cores. It is deliberately close to the boss's ring, both being
  landmarks on a clock, and is told apart by three things at once — the shape
  inside, the colour, and **motion**: the boss's arcs are still and count
  phases, the trial's ring turns until you have beaten it. The trial node is
  also 68px against a level's 58 and a boss's 78, because the ring reaches
  past the shape and at 58 the pips landed on the trail.
- **The section fills with its own colour to the height of the stars you
  have taken**, and that is the progress bar the map actually wants — the
  trail runs first-level-at-the-foot to boss-at-the-top, so a level rising
  *is* progress climbing, and the waterline lands at roughly the point on the
  path you have reached. Measured against the trail rather than the viewport,
  because the panel scrolls: a fill pinned to the screen would put the
  waterline somewhere different every time you dragged it. It is emitted only
  when there is something to draw. The 220px tail under it covers `.mbody`'s
  bottom padding, which is outside the trail and was left as a dark strip
  beneath the water. And it is raised from 0 across **two** animation frames,
  not one: a height that is already correct when the element first paints has
  nothing to transition from, and the first frame is the one the browser is
  still assembling.
- **The waterline is a wave, not a rule.** It was a `border-top`, and a
  straight bright line across the map read as a *divider* — something the
  layout was doing — rather than as the surface of anything. It is one period
  of a sine masked onto a 14px crest, tiling seamlessly because it starts and
  ends at the same height and the same slope, and it is a **mask** rather than
  a drawn shape so the crest can take the section's colour: a data URI cannot
  read a custom property.
- **At every star the crest becomes the flood.** The trail begins below the
  section card, so a fill that stopped at the trail's top left the head of a
  finished section dark — the same pseudo-element drops its mask and runs
  300px upward instead, and `.mcard` is `position:relative;z-index:1` so the
  water goes *behind* it rather than washing over its text.
- **A section paints itself when every level in it is on three stars.** The
  trail redraws as *one* continuous stroke and the colour climbs it from the
  first level to the boss, each node throwing a ring as the paint arrives.
  One stroke is forced: the paint is a `stroke-dashoffset` sweeping along a path, and the
  usual per-gap subpaths would sweep every gap at once. It is traversed from
  the end of `pts`, because the trail draws top-down while the campaign runs
  bottom-up and the colour has to climb the way the player did. Nothing is
  remembered to make it replay — `mapDraw` rebuilds the trail's innerHTML
  every time, so the animations restart by construction.
- **One animation per node, and it was measured rather than guessed.** The
  nodes used to scale *and* throw a ring, and running both put 46% of frames
  over 32ms against 26% for the same section un-mastered (Chromium at 6×
  CPU throttle, medians identical, the difference all in the tail). Either
  alone sits at that baseline; the ring alone on its own compositor layer
  comes in under it. The first guesses were wrong and the profile said so:
  `drop-shadow` filters on the animated stroke and on the nodes were removed
  first and changed nothing measurable, and parking the ambient cubes for the
  duration changed nothing either. **Both are still worth keeping** — a
  filter is repainted on every scroll of a finished section, not just during
  the celebration — but neither was the answer. Halos are `box-shadow` now,
  which composites.
- **Mastery cannot be bought, and that is what makes it worth drawing.**
  `sp.got` is summed through `starsForRecord()`, which reads `progress` and
  nothing else, and a skip is deliberately not in `progress`. `PROLOGUE` can
  never be mastered because `sectionSpans()` skips tutorials, so its `max` is
  0 — a section that awards no stars has none to collect.
- **The menu's `PREVIEW` switch forces the finished look on and draws the
  nodes solved**, because a preview that leaves every node dashed and locked
  is not a preview of the finished look. It is a drawing and nothing else:
  `mapSheet()` asks `mapState()` again on a tap, so a locked level still
  refuses to open. The win card's mastery banner deliberately does **not** go
  through `sectionMastered()` — it is derived from `starsGained` — so a
  preview can never fake the one moment that is actually news.
- **The landmarks are SVG, not `clip-path`.** A clipped box loses its border
  and its shadow, and the rim and the lip are what make a node look pressable;
  `mapShape()` emits the polygon, its lip and its ring as one `<svg>`.
- **The map's node classes are `mboss`/`mtrial`, not `boss`/`trial`.** The
  HUD's lives bar is `.boss`, which sets `pointer-events:none` — a map node
  carrying that class inherited it and was silently unclickable. Check any new
  class name against the ones already in `css/style.css`; this is the CSS
  version of the `history` / `window.history` collision in the layout notes.
- **Progression is a rolling window, not a chain.** You may always reach
  `MAP_WINDOW` (2) levels past the furthest you have got to. In a match-3 you
  eventually beat a level by luck; in a deterministic puzzle stuck is stuck
  forever, so one hard level must never be able to end somebody's game. The
  window still closes behind you, so a skip is still worth something.
- **Measured from the furthest level *touched*, not the first gap.** Nothing
  was locked before this existed, so old saves have arbitrary holes; measuring
  from the first gap would re-lock levels those players had already walked
  past. `V · EXTRA` keeps its own older gate on top — every boss down.
- **Skips live in `skips`, deliberately not in `progress`.** `progress[name]`
  means "you beat this" and the whole star economy reads it that way, so a
  skip in there would be a purchase leaking into the currency. Kept apart, a
  skipped level is worth zero stars *by construction* rather than by
  remembering to subtract it. Verified: skipping does not move `starsEarned()`.
- **ANY LOCKED LEVEL CAN BE OPENED, ONE AT A TIME** (`mapSkippable`), plus a
  whole section at its first level (`mapSectionSkippable`). It used to be
  landmarks only — the boss closing the section you were already in — on the
  reasoning that a skip should carry you past a wall rather than past the
  levels. The wall is not where that assumed: somebody stuck three levels
  from the end of a section could not buy past *that* level, only past the
  boss behind it, which is harder. What keeps the old reasoning intact is
  that **a skip still opens exactly one door** — `mapReach()` counts solved
  levels and ignores skips, so nothing behind the one you bought comes with
  it, and getting past two costs two ads. `V · EXTRA` still cannot be bought
  open: that shelf is what beating every boss is *for*, and it is a reward
  rather than a rung on the progression.
- **`mapReach()` counts solved levels only, never skips.** Counting a skip
  would drag the rolling window forward with it and quietly hand over
  everything in between — the exact levels the skip exists to leave for later.
- **THE GAME OFFERS HELP EVERY THIRD LOSS ON A CLOCK LEVEL, and it
  escalates.** `fails` counts full losses per level — lives run out, not a
  life spent — persisted beside `skips`, moved by `LEVEL_RENAMES` like
  everything else, and cleared the moment the level is beaten, so it tracks
  the *current* run of failures rather than a lifetime total. Every
  `STRUGGLE_OFFER` (3) losses, `struggleOffer()` puts up **the next thing a
  person would actually try**:
  - **the clock can still be slowed** → offer that, and name the exact
    setting (`Menu › Real time › Pace`). It costs no stars.
  - **already at the slowest** → offer the skip.

  So a player who is already on SLOW sees the skip on their *first* offer,
  which is right: there is nothing else left to try. **Going straight to
  "skip this" was the wrong first move** — it hands over the only two levels
  with a real-time component the moment they get hard, and tells somebody who
  is nearly there to give up.
- **EVERY offer carries DON'T SHOW ME AGAIN, and it silences all of them**
  (`settings.noSlowOffer`, cleared by the settings reset). It is global
  rather than per level: somebody who does not want the game suggesting
  things does not want it on the next boss either. It used to be on the slow
  card only and only from the second one, and `noSlowOffer` was read as the
  argument to `paceSlower()` — so pressing it silenced the slow offer and
  then **fell straight through to the skip offer underneath**, which had no
  opt-out of its own. Reported from a playtest, in those words: the button
  did not work and the game kept asking. The flag is asked at the top of
  `struggleOffer()` now, before it has decided which suggestion to make.
- **The offer goes up after the reset, not instead of it.** The board is back
  and KEEP TRYING is right there, so it is a door rather than a wall. The
  skip reaches `grantSkip()` and nothing else, so it inherits the rule — ads
  buy progress, never score.
- **`grantSkip(name)` is the single call site a rewarded video needs.** It is
  not gated on an ad here, because there is no provider yet and a button that
  silently did nothing would be worse than one that plainly works. Wiring the
  SDK means calling it from the completion callback and changing nothing else.
- **The tutorials get a `PROLOGUE` section** so the map has somewhere to put
  them. Its `at:0` shifts no other marker — these are array indices and every
  later section keeps the index it had.
- **The trail climbs.** The first level of a section sits at the bottom and
  its boss at the top, laid out from the last index down rather than mirrored
  afterwards — everything hung off a node (its stars, its label) is positioned
  relative to that node and would otherwise need un-mirroring one by one. A
  segment is lit by the *lower* of its two indices, because the trail draws
  top-down while the campaign runs bottom-up. `mapFocus()` opens on where you
  are, or at the foot of a section you have not started.
- **The menu, the wardrobe and the map share their furniture** (`.panel.tall`,
  `.phead`, `.pcard`, `.pgo`, pill `.tab`s). The map got its language first
  and the menu read as a debug screen beside it — eleven identical outlined
  rectangles with no hierarchy and whatever slider the browser drew. The
  corner star total hides behind *any* open panel now, since three of them
  carry a total of their own.
- **The way out lives in the header, not the footer.** The row at the foot of
  the panel sits below a trail several screens long, so after scrolling into a
  section there was nothing in sight that looked like an exit and the map read
  as somewhere the game had left you.
- **The ambient cubes never touch an edge.** They are inset by a whole cube
  and the wrap is hidden by a fade, because anything that drifts *through* a
  boundary is necessarily half-drawn while it crosses, and a sliced cube reads
  as a rendering fault. The half-extent is `1.732*s`, not the `0.866*s` the
  face size suggests — `P()` spans `(px - pz*k)` over `[-2,2]`.
- **EVERY SECTION HAS WEATHER BEHIND ITS TRAIL** (`mapWeather()`), on the
  same 2D canvas the ambient cubes already use — no second context, and it
  stops with the panel like everything else there. The map is where a section
  is chosen, so it is the one screen where a section should be recognisable
  before a word of it is read: branches climbing both edges with leaves
  falling through them, meteors, an underwater column with fish and bubbles,
  or a sun over dunes with grain blowing across.
  - **The kind is keyed off the section's own `theme.scene`**, not a second
    table, so the map and the world cannot drift apart: a section themed
    `ocean` gets fish here by construction.
  - **It is drawn behind the cubes and kept out of the middle column.**
    Ambience you have to read around is not ambience.
  - **The branches are a seeded walk that runs PARALLEL.** They used to reach
    inward as they climbed — up to 58px a segment over nine segments — so the
    two of them met in the middle and crossed the trail. The walk is vertical
    now and the lateral movement is a wobble around a line near each edge:
    they lean, they are not straight, and they never converge. Seeded, so a
    section's tree is the same tree every time it opens — the same reason the
    sky's stars are seeded.
  - **The map's meteors use the world's 90° fan too**, and their trail is
    drawn back along the direction of travel rather than diagonally.
  - **The fish are told apart by shape, not colour.** A clownfish is a fat
    teardrop with two pale bars, a dolphin is a long curve with a dorsal, a
    turtle is a wide oval with four paddles, an octopus is a dome with legs
    under it. At fifteen pixels colour is a second signal and never the
    first.
- **`syncCorners()` owns the map's chrome.** The running star total lives
  outside `.corner` at z-index 30 so it can sit over the win overlay, which
  also puts it over a near-full-height map and its own total. The one function
  that already knows which panel is open turns it off.

## The home screen

**Where the game starts from, once there is anything to come back to.** A
title, your character turning on its plinth, `CONTINUE`, `LEVELS`, three
things you do not own with what they cost, and a way into the wardrobe.

- **A first run never sees it.** There is nothing to continue and nothing
  owned, so the intro card — which says in one sentence what the game is —
  stays the first screen and `BEGIN` goes straight into the tutorial.
  `nothingBehind()` asks `progress`, `skips` and the session, deliberately
  not `starsEarned()`: somebody who walked into a level and quit has a
  session and no stars, and is plainly not seeing the game for the first
  time. The home screen is a **launch** screen; finishing the tutorial still
  goes to `01`, because `NEXT LEVEL` is the next level, always.
- **It is a screen, not a panel, and it sits at z-index 11 — *under* the
  panels.** That is the whole arrangement: the map and the wardrobe open over
  it exactly as they open over a level, and closing one puts you back here
  rather than dropping you into a level you never chose.
- **`CONTINUE` wears the colour of the section it opens** (`--sec` on
  `.hcont`, written by `homeSync()` from `SECTIONS[].col`). The first thing
  on the screen and the place it leads should read as one thing rather than
  as a green button and, one tap later, a red section. The lip and the ground
  are `color-mix`ed from that one value, the way the map's nodes are, so a
  pale section and a dark one are both legible without three hand-picked
  values each. It falls back to the goal green, which is what it always was.
- **`CONTINUE` has two answers and the specific one wins.** A saved session
  puts you back mid-level on the move you stopped on (`resumeSession()`);
  without one it is `mapHere()`, the first level you have not dealt with,
  which is where the map's own marker sits. It says `START` only when there
  is genuinely nothing behind you — the word has to match what the button is
  about to do.
- **The plinth is built off the boot path, and that was measured.** A second
  WebGL context is not free, and `homeShow()` runs the moment the saves land,
  while the sting is still playing. On the **artifact** build at 4× CPU
  throttle, boot-to-sting was 715ms without the home screen and 786ms with
  it; deferring the stand until the sting is over closed the gap (643 vs 704,
  nine interleaved runs each, distributions overlapping). Nothing is lost by
  waiting — the buttons are the point and they are ready immediately, and
  while the stand is missing its canvas is invisible anyway, because
  `previewShow` paints its scene in the same void the page is painted in.
  `homeCaseSoon()` polls rather than hooking `splashEnd`, because `homeShow`
  is also reached from the menu long after the sting, and one path is easier
  to keep right than two.
- **Measuring this needs the artifact build, not `index.html`.** From source,
  the Google Fonts `<link>` is render-blocking and dominates everything —
  12.6s in a sandbox with no network. `build-single.js` strips the preconnects
  and the font link, so the published game never pays it, and any boot timing
  taken against the source file is measuring the font CDN.
- **`nothingBehind()` is the one first-run answer**, in `16-panels.js` beside
  the other progress helpers. Boot asks it to choose between the intro card
  and the home screen; the home screen asks it to choose between `START` and
  `CONTINUE`. It is deliberately not "no stars earned" — a level beaten with
  enough hints scores zero, and that player was being offered START with a
  level already behind them.
- **The plinth is the wardrobe's display case, not a copy of it.** `homeCase()`
  hands its canvas to `previewStart()` and calls `previewShow()` with what you
  have equipped, so the character, the slab and the world behind it are built
  by the code that already builds them. It keeps the case's own scale: the
  framing there is tuned to fit the slab and its two neighbours, and scaling
  the group up pushes the plinth off the canvas. Size comes from a bigger
  canvas instead.
- **The case is a singleton, so `hidePanel()` has to put it back.**
  `showPanel()` calls `previewStop()`, which is right — the stand is behind an
  opaque panel — but nothing restored it, so closing the map over the home
  screen left an empty plinth.
- **And it must be a *fresh canvas* every time.** `previewStop()` ends its
  context with `WEBGL_lose_context.loseContext()` on purpose, and a canvas
  whose context was lost that way is spent: `getContext` returns null forever
  after and three.js dies reading `precision` off it. The wardrobe never meets
  this because `showPanel` rewrites its markup, and its canvas, on every
  opening; this screen keeps its markup, so `homeCase()` replaces the element
  itself.
- **The canvas has no visible edge**, because `previewShow` paints its scene
  with the equipped world's void colour and `applyPalette` sets the CSS
  `--void` from the same world. The character simply stands there.
- **The body class is `athome`, not `home`.** `.home` is the overlay's own
  class and a bare `.home` selector matches `<body class="home">` too — the
  body inherited `position:fixed; display:none` and the entire document
  measured 0×0, with `getComputedStyle` still reporting `flex` on the overlay
  because a computed display survives an ancestor being hidden. Same
  collision as `.mboss`/`.boss` on the map.
- **`screenUp()` is the shared "a full-bleed screen is in front of the game"
  test**, and it exists because an overlay swallows taps by being there while
  a keyboard does not care what is on top. Without it the arrow keys walked
  the player around a level nobody could see, behind the title screen — which
  was already true behind the intro card. The two clocks ask it too, so a
  boss cannot run behind a home screen opened from the menu. The win card is
  deliberately **not** in it: a solved level is inert through `levelOver()`,
  which re-shows the card rather than swallowing the input.
- **The shop is on the screen and every tile is live.** Two scrolling rows,
  SHAPE and COLOUR, the whole catalogue in cost order. It started as three
  locked items with prices and *no behaviour* — a drawing, with the wardrobe
  button as the way in — and that was wrong the first time anybody used it:
  **a thing shaped like a tile invites a press, and a press that answers
  nothing is worse than showing no tiles at all.**
- **Which thing a tap does falls out of whether you own it.** Owned goes
  straight onto the character — equipping costs nothing and is undone by
  tapping another, so there is no confirmation to make. Locked opens the
  wardrobe *on that item*, with its price and its BUY already under the case;
  `wardSel[t]` is the wardrobe's own selection, so setting it before opening
  lands the player exactly where the tile was advertising. Nothing on this
  screen can spend a star, which is what keeps "selecting, buying and
  equipping are three separate acts" true.
- **Worlds are not in the strip.** Two rows is a strip; four is the wardrobe
  with worse ergonomics, and the shape and the colour are what a player means
  when they say they want to look different.
- **Locked is a dashed edge, not a faded swatch.** Dimming looked right on
  the shapes and was plainly wrong on the colours: at .42 over this ground,
  White came out grey and Red came out maroon, so the row was misdescribing
  the one thing it is selling.
- **`--player` is not a constant** — `applySkin()` rewrites it from the
  equipped colour — so the equipped tile's ring is drawn *detached*, with a
  1px void gap, or it is the swatch's own colour drawn on the swatch and
  invisible on the single tile it exists to mark. Its glow is `color-mix`ed
  from the same variable for the same reason: it was a literal rose `rgba()`,
  which is what `--player` happened to be the day it was written.
- **The rows are tapped on `pointerup` with a travel test**, not through
  `tap()`, which fires on `pointerdown` and calls `preventDefault` — that eats
  the drag that scrolls them. They also hand back `touch-action`, which is
  `none` on the body to keep iOS off the two-finger turn; the home screen is
  the one place no game gesture applies.
- **`hidePanel()` syncs the home screen as well as restarting its stand.**
  You may have just bought and equipped something in the wardrobe, and the
  strip, the plinth and the star count all have to know.

---

---

## The story — the Census

**The plane is not empty.** Everything this world has ever flattened is still
in the silhouette, and folding is not passing *through* 2D — it is standing in
it, briefly, with them. The hunters are its residents: they cannot leave and
you keep going back and forth, which is what they are counting. The line you
share with one is the only thing that exists in both places at once, which is
why it kills either of you.

**It exists to justify a rule the game already had.** The boss's kill rule is
the fifth design and mechanically settled; what it lacked was a reason. Every
sentence below is chosen to explain something already on screen — glass is
cover *because* it casts nothing and so leaves no record, crates matter
*because* editing what they see is the one thing they cannot do — rather than
to decorate it. **A story beat that does not explain a mechanic does not go
in.**

**Eleven sentences, and never one that blocks play.** The game's voice is
`Poisoned Column` and `Absent Floor` — spare, technical, and it does not
narrate. So there are no cutscenes and no journal; the fiction lives in four
places and each holds one line:

| Where | What | Lives in |
|---|---|---|
| intro card | the premise, one line under a rule | `index.html`, `.introstory` |
| section card on the map | one line per section | `SECTIONS[].story` → `mapDraw` |
| boss win card | one line per fight | `LEVELS[].won` → `win()` |
| boss names | the four stages of being counted | `LEVELS[].name` |

- **`story` is a second field beside `sub`, not an extension of it.** `sub`
  says what the section teaches and is what a player needs to choose one; the
  story is why they want to. Kept apart, the fiction can be cut without taking
  the description with it — which is the point of a slice this small.
- **The bosses are named for the census, not the arena.** `The Sighting`,
  `The Record`, `The Search`, `The Census` — you are seen, written down,
  looked for, and finally counted. The old names said which arena it was
  (`Sharp Ground`, `Through Glass`), which the section header already says.
  They cost four `LEVEL_RENAMES` entries and renaming them again costs four
  more; that is the cheapest thing here to change your mind about.
- **The premise is bolted onto the intro card, not woven into it.** The two
  lines above the rule are the only explanation of the verb a new player ever
  gets and they are untouched. A third line under a divider is what lets the
  story be removed in one edit.
- **`won` is appended to the win card, never substituted.** "never hit · 31
  moves" is what the player came for; the story is the footnote. It is
  emitted as innerHTML on a path where the level name had only ever been set
  as `textContent`, so it is `esc()`d — and the section-mastery banner below
  it now reads `innerHTML` when there is already an element in there, or
  clearing a section on a boss run would flatten the story line back into the
  score.
- **Violet is the story's colour**, on the intro card and the win card both,
  because violet already means the hunters everywhere else in the game. The
  section line on the map is deliberately *not* coloured: there it is an
  aside under an instruction, and the section's own hue is already carrying
  the section.

**What is not done, and was never in this slice:** the plane's palette still
reads as a second skin rather than a second place, nothing in the world says
you are being counted while you are counted, and the wardrobe has no part in
it. Those are the UI half, and they are worth doing only if the premise makes
the fights feel different when played.

## The sting

**The logo is a fold.** `nadaz` starts as a cloud of cubes strewn through
depth, illegible for exactly the reason the game exists: an orthographic view
maps depth onto the screen, so blocks far apart in z pile on top of things
they have nothing to do with. Collapse that axis and all of them land in the
plane at once, and the cloud is a word. The sentence on the intro card behind
it — *things far apart in depth land side by side* — is demonstrated before it
is read.

**It is raised before three.js parses, and that is what makes it a loading
screen rather than a screen that appears once loading is done.** An inline
script in `index.html` loads `20-splash.js` and calls `splashShow()` above the
three.js tag; everything else follows behind it. It used to be raised from
`21-boot.js`, which is the *last* script — so the card whose whole job is to
cover a cold start only went up once the most expensive file in the page had
finished evaluating. Measured on the artifact build at 4× CPU throttle,
boot-to-sting went **628ms → 356ms**. The sting needs no three.js: the
wordmark is one div per voxel and some CSS.

- **Two consequences of arming that early, both handled.** `splashShow()` is
  guarded on `splashState`, because `21-boot.js` used to call it and a second
  call would arm an already-armed card. And a tap can now in principle land
  before `11-sound.js` exists, so `splashGo()` falls through to a silent
  `splashPlay(null)` — the same trade `audioReady` already makes when the
  clock never starts. `applyBrightness()` in `splashEnd` is guarded likewise.
- **Three.js still has to load before `09` and `10`.** Both build
  `THREE.Color` instances at top level, which is the one place the "everything
  before `21-boot.js` only declares" rule does not hold. That is why only the
  splash moves above it, not the whole list.

**It waits for a tap, and that is not friction — it is the only way it has
sound.** Every browser refuses an AudioContext until a gesture, so a card that
plays itself on load plays itself silent. Waiting makes the fold *be* the
gesture, and it moves the audio unlock off `BEGIN` onto a full-bleed surface
where a touch anywhere counts, which is the more robust place for it inside a
WebView. A second tap skips: it runs on every load, so the reflex that starts
it has to be able to end it.

- **Nothing in the card may carry `opacity` or `filter`.** Either one sets
  `transform-style: flat` on the element it is on, per spec, which collapses a
  cube's four faces into a stack of overlapping squares — measured, the side
  faces came out zero pixels wide. Depth is shaded by mixing the face colours
  toward the void instead, which is what `applyDepth()` does in the renderer
  anyway, so the card and the game now push things back the same way.
- **The stage has no `perspective`, deliberately.** A `preserve-3d` subtree
  without one *is* an orthographic projection — the same projection the game
  uses — so a cube on the card is shaded and lands exactly like a block.
- **`--cols` is set on the card, not on the stage.** The rule under the
  wordmark is the stage's *sibling* and sizes itself from it; a custom
  property inherits down, not across, so set on the stage it silently never
  drew.
- **The depths are seeded off the cell, not `Math.random()`.** A logo that
  reshuffles itself every load is not a logo.
- **`SPLASH_FOLD` (980ms) is one number in two files.** The CSS transitions
  and `SFX.sting()` are both written against the moment the last cube lands;
  moving it means moving both.
- **The sting was measured through the real chain**, as the mix notes in
  `js/11-sound.js` demand: peak 1.0004 with 2 saturated samples in 141,000,
  against the documented worst-case pile-up's 1.0082 in 88,000. It is the
  loudest thing in the game and it sits under what the limiter was already
  built to survive. Retune a voice and re-measure — a limiter plus a soft
  clipper will happily hide a set piece that distorts on every play.
- **It listens on `pointerup` and `click`, never `pointerdown`.** This is the
  bug that made the sting arrive late: `pointerdown` is not an
  activation-triggering event for touch — only `pointerup`, `touchend`,
  `click` and `keydown` are — so on a phone the tap that started the card
  granted no user activation, the audio context could not start on it, and
  the whole arrangement queued against a stopped clock and landed in a heap
  on whatever was pressed next. Nothing calls `preventDefault` on the pointer
  event either, because suppressing it suppresses the click, which is the
  half that does the unlocking.
- **`audioReady()` is the general form of that, and the fold waits for it.**
  `resume()` is a promise; until it settles `currentTime` is frozen at 0, and
  a set piece scheduled at absolute times against a frozen clock queues
  rather than fails. So the tap asks for the clock, and the picture and the
  sound start in the same tick — a few milliseconds normally, `AUDIO_WAIT`
  (350ms) at the very worst. If the clock never starts the card plays silent
  rather than late: silent beats a jumble arriving after the fact. A blip
  does not need any of this, because it is one 50ms event at `currentTime`.
- **The keydown listener is on the capture phase and stops propagation.** The
  four verbs are all guarded on the intro card still being up, so nothing
  would fire anyway — but `m` toggles mute, and muting the sting with the key
  that starts it is a poor first impression.
- **Under `prefers-reduced-motion` the word is simply there**, dim, and
  resolves to full colour on the tap. The prompt changes to "tap to begin",
  because "tap to fold" would be describing something that will not happen.
- **The glyphs are five strings of seven characters each**, in
  `SPLASH_GLYPHS`. There is no font; editing a letter is editing those.

## The tutorial

**Two levels: walking, and the fold.** Turning is no longer taught here at all — it is revealed inside Section I by `05 — No Way From Here`, a level that is provably impossible without it. The third
— `00 — First Landing`, the landing rule — **is no longer here**: it now sits
after `TRIAL I`, because a rule about where the fold puts you cannot be
corrected in somebody who has not yet formed a guess about it. See Levels
above for the shape of that. It keeps `tutorial: true` and everything below
still applies to it. They carry
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

**The tutorial points where the solver points, and `tutGuide()` is the one
answer.** Each step used to name its own control and be satisfied by a
counter, and a counter is not a position: `First Fold` step 3 finished on
"three moves in the plane", so a player who folded, stepped, stood up, folded
again and walked to the far end had made two plane moves and was still being
told to walk right, with nowhere left to walk. A script cannot survive a
player who goes their own way, and this game has undo, death and a free
camera. So the cued control is now whatever `solve()` says the next move is
from where the player actually stands — right by construction from any state
they can reach.

- **The lesson still speaks while it agrees with the solver.** When they
  disagree the player is off-script and a short line about the next move
  replaces the lesson: wordlessly correct beats eloquently wrong.
- **The third case is the one that was missing.** Steps count actions and the
  level counts arriving, so every step can be satisfied while the level is
  not finished — and the tutorial used to fall silent there, leaving a
  first-time player unguided one move from the end. `tutGuide()` returns the
  solver's move in that case too.
- **The coach, the green, the dim and `tutPoke` all read `tutGuide()`.** They
  used to work theirs out separately, and gave different answers.
- **The solver's answer is cached on the state *and the level*.**
  `currentState()` says where the player is standing and nothing about what
  they are standing on, and all three tutorials start at `[0,1,0]` facing
  view 0 with no crates and no keys — so their opening states stringify
  identically. Keyed on the state alone, opening `First Turn` straight after
  another tutorial handed back that one's first move, and the coach said
  "press right" on the level whose entire subject is turning. It compares the
  level by identity, not by name: the editor and the composer both make
  levels that can share a name.
- **`solve()` obeys `lockFlat`.** It did not, so its answer for
  `00 — First Steps` was a four-move fold route the player is physically
  prevented from taking — harmless while nothing consulted it, wrong the
  moment the tutorial started asking it what to do next.
- **The last tutorial's win card names the bulb**, because the tutorial has
  been holding the player's hand the whole way and the last thing it should
  say is where the hand goes.

**A step can assume a state, not only aim at a goal, and the coach has to
notice.** `want:"flat"` / `want:"3d"` on a step swaps both the line and the
cued control for the way back when the player is not in that state. "Depth is
gone — walk across" means nothing unless you are flat, and a player who
folded, took one step and stood up again is still on that step, being told to
do something they cannot do, in the level whose whole job is not confusing
them. `tutStepView()` is the single answer to "what is being asked right
now", and the coach, the green, the lock and `tutPoke` all read through it,
so they cannot drift apart.

**The guided lock is derived from that predicate, not parallel to it.** When it
is up, the world dims and the step's own `cue` is the only control the game
accepts — a first-time player should not have to work out which of seven
buttons a sentence means. It is recomputed from the current step, so it
inherits the property above and cannot disagree with the line on screen. A step
opts out with `lock:false`.

- **THERE IS NO DIM IN GESTURE MODE, and the gate goes with it.** The dim and
  the gate are one mechanism — the dim is what *explains* the gate — and
  neither is needed once the lesson is a hand in the middle of the screen: it
  is unmissable where a green button on a strip at the bottom was not.
  Blocking without the dim would be worse than either, because a swipe that
  silently does nothing is the exact thing the dim exists to explain. Both
  are refused at the top of `tutBlocks()` and `tutEngage()`. The button
  lesson keeps both, unchanged.
- **It arms on hesitation, not on arrival, and that is the difference between
  a hint and a mood.** The first version engaged the instant a step began —
  and since every step names a control, the guide was on for the whole
  tutorial. Against a game that is already dark, a permanent dark overlay does
  not read as "here is the button", it reads as "the game is dark". Appearing
  is most of the signal, so it has to have been absent.
- **`hold:true` on a step gates the other verbs from the first frame, and it
  does not bring the dim with it.** One level asks — see `00 — First
  Landing` — because it is an experiment rather than a puzzle and both halves
  have to happen in order. `tutBlocks()` answers it out of the current step,
  so it re-derives like everything else here; the dim still waits for
  hesitation, and a *blocked press* brings it up at once, which turns a
  button that did nothing into a button that says why.
- **The wait counts only time the player could have used.** `tutTick()` polls
  and accrues `TUT_HELP_MS` worth of *playable* idle — `tutPlayable()` is the
  same question `bossFrame` asks, so the intro card, an open menu and a death
  animation do not accrue. A plain one-shot timer kept its own cadence and ran
  out behind the intro, putting the guide up within a few hundred milliseconds
  of BEGIN.
- **Pressing the control it is asking for dismisses it, always — including
  while it is up.** `tutPoke(id)` takes the control the player actually used
  and only answers to the cued one. The first version refused to re-arm once
  engaged, to stop it flickering on a multi-press step, and that was exactly
  backwards: `First Fold` step 3 wants three presses of the same arrow, so a
  player obeying the instruction perfectly watched the screen stay dark
  through all three. Complying has to be what turns it off, or the guide is
  not answering the player at all.
- **What stops the flicker is a longer second wait**, not a refusal to
  re-arm. `TUT_AGAIN_MS` applies once the player has used the right control
  on this step — they have shown they know it — so a steady press rhythm never
  strobes and a player who stalls again still gets it back. An input that is
  *not* the cued control neither buys time nor spends it: the wait carries on,
  so pressing other things cannot hold the help off forever.
- **`TUT_HELP_MS` (1000) and `TUT_AGAIN_MS` (2600) are feel numbers** and
  nothing here can judge them. Playtest them.
- **The green on the button and the dim are two different statements**, and
  tying them together was a bug. The green says "this step wants this
  control" and is true for as long as the step is; the dim says "you seem
  stuck, and now it is the *only* control I accept" and is true only after
  hesitation. They shared a class once, so dismissing the dim by pressing the
  right button also took the green away — and `First Fold` step 3 wants three
  presses of one arrow, so after the first the player was mid-step with
  nothing lit. Doing as you are told must never leave you with less
  information than you had.
- **`tutEngage()` reads the current step, never a cached id.** Deriving it
  is what lets it re-heal; caching it meant anything that cleared the cue
  mid-step also stopped the dim ever returning for that step.
- **The dim is the quieter half.** It cannot carry the message alone, so it is
  light and the *lit* button does the work — goal colour, a ring that breathes,
  a step up in size. Three cues on one control beats one cue spread thin.
- **The gate lives on the four verbs** — `press`, `rotateView`, `doFlatten`,
  `doUnflatten`. Buttons, keys and gestures all funnel through those, so one
  check each covers every way in; scattering it across the bindings would miss
  the swipe.
- **The corner chrome is never dimmed or blocked.** Menu and restart stay live
  throughout. A tutorial you cannot leave is a trap, not a lesson.
- **`NEXT LEVEL` is the next level, always — including out of the tutorial,
  where it is `01`.** Two cleverer versions were built and both were wrong the
  same way: returning you to the level you interrupted, and failing that to
  your first unsolved one, each made the button mean something other than what
  it says, chosen by state the player cannot see. A player who wants to be
  somewhere else has the map, which is explicit about where it is sending
  them.
- **The highlight is `.tutlive`, not `.cue`.** A cue is a 3.2-second pulse and
  the lock lasts as long as the step, so keying the highlight off the pulse
  dims the whole bar the moment it expires — including the button being asked
  for.

**The tutorial's prose says what the button says, mechanically.** `tut` text is
data in `02-levels.js`, which loads before `11-sound.js`, so it cannot call
`VB()` when it is written. It writes `{to2}` / `{to3}` / `{n2}` / `{n3}` and
`tutWords()` substitutes them as the line is shown. This exists because the
lesson used to say "collapse the world", then "Collapse", then "flatten", then
"stand back up", while the button in front of the player read `GO 2D` — four
names for one verb, none of them the one on screen, in the three levels whose
whole job is naming things.

**`00 — First Landing` IS RETIRED — kept here because its machinery is
live and one paste restores it.** It was rule 5 made compulsory, and it is the
owner's design.** `First Fold` *mentions* the landing rule while teaching the fold —
the near block there is also the goal, so a player who understood none of it
still won. This level is the same rule with nothing else in it: **two blocks
in one silhouette column, five apart in depth, and a 180° turn between them.**
From the opening view you are standing on the near one, so folding would only
pop you back onto yourself; turn around and the same two blocks swap places,
and the identical fold carries you across. Same geometry, same verb, opposite
answer.

**It is now run as an experiment rather than offered as one**, on the owner's
call after playing the first version: say the rule in words, point at the
block it names, and make the player perform both halves in order.

**BOTH CARDS ARE UP FRONT NOW, AND THE LEVEL RUNS ON CUES ALONE.** The second
used to arrive mid-level, after the half turn, which was right while this was
a tutorial in the opening minutes. It is wrong now that the level arrives off
the back of `TRIAL I` as a reveal: the whole shape is *here is a rule, now go
and see it*, and a card in the middle explains a thing the player is halfway
through doing. Seven steps — two cards, then fold, stand up, half turn, fold,
stand up — with the five moves gated so the two folds genuinely happen in
order.

**"THE LOWEST", NOT "NEAREST THE CAMERA", AND THAT IS THE OWNER'S FRAMING.**
Nearest the camera is the true statement and it is useless to a player: they
have never been told there is a camera. What they can *see* is that the block
they land on is the **lowest** of the ones stacked in their column — and it
is the same block every time, because screen-vertical here is height plus
depth and every landing candidate is at the same height, so the further one
always draws higher. Said as *the lowest*, the rule is checkable by looking;
said as *nearest the camera*, it has to be taken on trust. The one thing the
wording must not do is read as **height** — "it drags you down to the lowest
point" would teach a rule the game does not have.

**It is slower and softer than the opening tutorials** (`tutWait` 4200,
`tutSoft`). This is no longer played by somebody who has never seen the game;
it is played by somebody who has just beaten a trial and been handed a rule.
The guided lock waits four seconds rather than one, and dims to a sixth of
its usual weight when it does arrive — the player is meant to be looking at
the two blocks and working it out, and a dark overlay dropping after a second
says "you are stuck" to somebody who is simply thinking. The greyed buttons
still carry the gate; only the board stops going dark with them.

**Two cards in a row have to repaint.** `tutCardSync` only wrote the card
when it was raising the element from nothing, which was fine while every card
had an ordinary step between it and the next one — the card came down in
between and went back up with new text. Back to back, the second never
brought the element down, so the player acknowledged the first one twice. It
compares the heading now.

- **It is forced, and that is checkable.** `solve()` says the level is exactly
  `rot+ rot+ FLAT POP`, and it is impossible with the fold locked out and
  impossible with rotation locked out. There is no walking route — the gap is
  five wide — so a player cannot finish it without the rule having done the
  work.
- **THE WASTED FOLD IS TAUGHT NOW, and that reverses an earlier finding.**
  It used to be impossible: `tutGuide()` replaces any step whose `cue`
  disagrees with the solver's next move, and the solver never folds from the
  opening view, so a step asking for that fold was overridden on every frame.
  `free:true` is the escape hatch and it now carries that one step. The
  reason it was rejected before — "a fold is not free" — is true and is the
  cost: the level is no longer walked in the solver's own move count. **That
  costs exactly nothing here, because a tutorial has no par and no stars**,
  and it would not be safe on a scored level. A three-block version that tried
  to make the wasted fold *optimal* instead was tried and BFS collapses it to
  the same four moves; the geometry cannot carry this, only the script can.
- **A step may be forced from the first frame (`hold:true`), and this is the
  only level that asks.** The guided lock normally arms on hesitation, which
  is right for a hint and wrong for an experiment: an experiment only proves
  anything if both halves happen, in order, and a player who wanders off does
  not get a wrong answer, they get no answer — on the rule that has cost more
  playtesters more lives than anything else in the game. **The gate and the
  dim stay two things**: `hold` refuses the other three verbs at once, while
  the dark overlay still waits, because a permanent dim reads as "the game is
  dark". A blocked press brings the dim up immediately instead, which is the
  one moment a player is owed an explanation for a button doing nothing.
- **The explanation card is words, and it is words on purpose.** Everything
  else in the tutorial cues a control and lets pressing it be the
  explanation. This rule cannot be taught that way: the two blocks it decides
  between are at *the same screen position* the instant you fold — that is
  what folding means — so there is nothing to watch and no press that reveals
  it. `card:{h,p}` on a step puts up a full-bleed card the player has to
  acknowledge; `tutC.card` counts acknowledgements, so a step is still a
  predicate over a counter and a restart simply re-reads them. It answers
  `screenUp()`, which is what stops the keyboard, both clocks and the
  hesitation timer running behind it, and its prose goes through `tutWords()`
  so it names the verb the way the button does.
- **The rings are up BEHIND the card, not after it**, because a card is where
  the phrase *the block at the front* is first used and the marker is what
  that phrase points at. `show` is carried separately from `card` in
  `tutGuide()` for exactly that.
- **The marker is derived, never authored** — `R.landings()` and `R.pick()`,
  the same pair `doUnflatten()` itself calls — so it cannot point anywhere
  the fold would not put you, and it moves to the other block on the half
  turn *on its own*. A level listing its two blocks by hand would be a second
  copy of rule 5 waiting to disagree with the first.
- **A ring is not enough on the block you are standing on**, and that is the
  first half of this level. Under the player a wireframe cube is swallowed by
  the block's own lit rim and by the player sitting on it, so the one square
  the lesson was pointing at was the one square the marker could not be seen
  on. The block itself is lit as well (`tutMarkSet` in the block loop), and
  **both candidates come out of the depth fade** — the loser is five cells
  back and would otherwise be nearly gone, in a lesson that needs the player
  to see two blocks in order to understand that one was chosen. Peril still
  outranks it: a warning that you are about to be crushed beats a lesson.
- **THE HIGHLIGHT IS BRIGHTNESS, NOT HUE, AND THE TWO BLOCKS HAVE FIXED
  COLOURS.** `L.tint` paints the near platform blue and the far one bone, for
  the length of that level only, and the light that says *this one is at the
  front* is a slow brightening on top of whichever hue is already there. It
  used to repaint the winner green and that was wrong twice: the goal is
  already a green wireframe on the far block, so the second half of the level
  went green everywhere; and repainting means the blocks swap colour at the
  same instant they swap screen position, so the player cannot tell whether
  the blocks moved or the marker did — which is the only question the level
  asks. With a fixed hue they can watch blue and bone trade places, which is
  the lesson happening in front of them.
- **`tint` is decoration and deliberately not a block kind.** Kinds carry
  rules and a fixed vocabulary — fire orange, water cyan, crate violet,
  anchor amber — and blue and bone are what that vocabulary leaves free.
  Nothing outside the tutorial uses it, it multiplies exactly where
  `colBlock` did (so it inherits the section tint, the depth fade and the
  lerp to ink for nothing), and it is rebuilt in `syncMeshes` because that is
  the one function every path that changes `L` goes through.
- **IDENTITY IS COLOUR AND NOT SHAPE, AND THAT WAS MEASURED TWICE.** Making
  the far platform *taller* put two of its blocks within 0.14 cells of where
  ground would be for the first press of the level — `legible.js` flags it
  from the start square, which is the exact lie this level exists to correct,
  so height cannot carry identity here. Making it *wider* was worse and
  quieter: the extra square casts into the plane one column off the player's,
  and `solve()` then finds "fold, step left, pop, step right" — **the level
  became solvable without rotating at all**. Width becomes a bridge in the
  plane and height becomes a lie on screen; the two platforms are one cell
  wide, two cells tall, and differ in colour only.
- **A card may wait a beat before it arrives (`card.wait`).** The second one
  opens the instant the half turn commits, and the turn takes about 450ms to
  settle, so it was landing on a world still swinging round — over the very
  change it is about. The coach goes quiet, the world finishes turning, the
  player gets a moment with the new view, and then it speaks. The wait is
  wall time rather than the guided lock's playable-idle: this is a beat in a
  sequence the game is running, not a measurement of whether the player has
  stalled.
- **THE EYE IS NO LONGER FORCED.** It used to be step 3 and it asked the
  player to preview a landing they had not yet been told existed. It is still
  live, still lights in the plane, and the last line of the level names it;
  it is simply not a hoop.
- **THERE IS NO RULER, AND THAT IS THE OWNER'S CALL.** Screen-vertical here
  is height and depth added together, so the far block draws about three
  cells *above* the near one and a first-time player can read it as higher
  rather than as further back. Two rows running the length of the gap were
  built to give the eye something to count. Stone could only go at `y=2`,
  above everything, where it read as floating; glass could sit on the ground
  because it casts nothing; and the blocks were briefly two cells tall to
  plant them — which is raising the blocks rather than lowering what is
  beside them, and not what was asked. The answer taken is to try the lesson
  with **neither**, and see whether the colours and the cards carry it alone.
  If they do not, the ruler is a paste-back of eight glass blocks at `y=0`,
  `x=±2`, `z=-1..-4` and nothing else — that exact placement is verified
  inert, and `docs/HISTORY.md` has the three that were not.
- **`First Turn`'s last line was retuned, not left alone.** It used to say
  "turning is how you choose which one catches you", which is this level's
  sentence. Its own subject is what *shares* a column at all. Two levels
  teaching the same thing is a bug and the curve will not catch it.

**`00 — First Fold` has two blocks in the goal column, and that is the lesson.**
Rule 5 used to be *stated* there and never *shown*: the column held one block,
so "you return on the one nearest the camera" described an event with no
alternative. You cannot teach a tie-break with nothing to break. The near block
is now the goal, so the demonstration is a success rather than a punishment.
Note the direction while you are in there: **+z points toward the camera**
(`AX[0].d`, and the camera sits at +z at `viewAngle` 0), so a block at high z
is in *front*. The old line called it "far behind everything", which is
backwards, and a lesson that contradicts the screen is worse than none.

### Which controls it teaches — `settings.tutor`

**The default tutorial has no buttons.** `GESTURES` takes the bar off and
teaches the three things a finger can do on the world — swipe to move,
double-tap to change dimension, two-finger swipe to turn — with a **ghost
hand** demonstrating whichever one the current step wants. `BUTTONS` is the
old lesson, bar forced on, unchanged. The menu row is under Controls; it
changes nothing outside the tutorial, because every control works in both.

**THE TUTORIAL ENDS BY TAKING THE BUTTONS OFF AND OFFERING THEM BACK.**
Winning the last tutorial level sets `ui` to `none` and puts up one card —
`controlsOffer()` in `js/12-play.js`, `settings.ctlAsked` in the
`loadSettings()` whitelist so it is asked once ever. The lesson taught the
gestures and then handed the buttons straight back, which is teaching one
control set and covering a fifth of the screen with a different one. What it
must not do is take them away *silently*: a player who wants the bar has no
way of knowing it is a setting. So the tutorial does it and shows the way
back, which is `struggleOffer()`'s shape — the thing has already happened,
the board is behind the card, and the card is a door rather than a wall.

- **Armed in `win()`, fired from `loadLevel()`.** A panel is z-index 12 and
  the win card is 20, so a card raised at the moment of winning opens
  *behind* the one being read. `ctlOfferPending` carries it into whatever the
  player opens next, which is also what makes it survive LEVELS as well as
  NEXT LEVEL.
- **It names the keyboard too.** On a fine pointer the lesson just given was
  the *button* lesson (`defaultTutor()`), so a desktop player has to be told
  what is left when the bar goes — and there the honest answer is the arrow
  keys, which have always worked.

**AND ONE LEVEL LATER, THE BULB.** `hintOffer()` explains the hint, once
(`settings.hintAsked`, whitelisted beside `ctlAsked`). The tutorial stops
talking at exactly the point the player meets the game, and the single most
useful control in it is a bulb in the corner nobody has been told about —
which is a retention hole rather than a missing nicety, since hints are the
reason somebody stuck does not close the game.

- **It is the level *after* the controls card, not the same one.** Two
  full-bleed cards in a row on the first real level is a wall between the
  tutorial and the game. `settings.ctlAsked` sequences them: it is false
  while the controls card is still pending, so `hintOfferDue()` cannot fire
  until that one has been answered.
- **The press it asks for is free.** A hint costs a star band, and a card
  that tells the player to spend one to find out what a button does is the
  small dishonesty a player remembers. It arms `freeHint` and `showHint()`
  skips the accounting exactly once. The flag expires by being used rather
  than at the end of the level — it is one hint, ever, and taking it two
  levels later is not cheating.
- **SHOW ME pulses the bulb rather than taking the hint.** The thing they
  have to remember is where the button is, and pressing it themselves is
  what fixes that. It goes through `cue()`, so a layout with no bulb still
  gets the hand or the words.

The old rule was that a tutorial forces the bar back over the layout setting,
since hiding the controls during the lesson about the controls is a joke at
the player's expense. That is still true and it is *why* this inverts: the
lesson is not about the buttons. A button marked with an arrow needs no
lesson. The controls that genuinely cannot be discovered are the gestures,
and they are also the ones that cost no screen.

- **The default is by pointer, not by preference.** `defaultTutor()` returns
  `gesture` on a coarse pointer and `buttons` otherwise, the same signal the
  volume default uses. On a mouse the gesture lesson would be eloquently
  wrong — "swipe right" to somebody holding a mouse — so a desktop keeps the
  buttons until the keyboard half of this is built. Changing the row sets an
  explicit choice that outranks the default from then on.
- **The demo is a second *rendering* of the cue id, not a second source of
  truth.** `tutGuide().cue` is already the one token for "what control is
  being asked for", and `CUE_GEST` is keyed by exactly those ids, so the two
  lessons cannot disagree by construction. `tutGhost()` is asserted from
  `tutSync` right beside `tutCueTo()`, out of the same value. The same table
  is the hint system's second fallback — it sits beside `CUE_WORDS`, and a
  cue that cannot land on a button either shows the control or names it.
- **IT IS A HAND NOW, NOT A DOT, AND THAT WAS THE WHOLE COMPLAINT.** For
  several builds each contact was a glowing green disc and nothing else, and
  it was reported exactly as people not understanding that the double tap was
  a *finger*. A dot is a contact point — the abstraction you can read once
  you already know what the picture is of; a hand is the thing being drawn.
  Two silhouettes in `index.html`, `#ghOne` (an index finger out of a closed
  fist, pointing up) and `#ghTwo` (two fingers pointing sideways), each
  stamped **twice from one `<symbol>`** — a fat round stroke in near-black
  behind, the bone fill on top — which is how a shape assembled from four
  overlapping rectangles gets an outline with no seams where they meet.
  Bone-with-a-dark-rim reads on the void and on the plane's paper alike,
  which nothing single-coloured does. **The green stays on the contact dot
  and the track**, so the hand is the drawing and the green is still the
  instruction.
- **The fingertip lands on the contact dot, and the arithmetic is why the two
  sizes differ.** `.gfinger` is 26px square, so its centre — the contact — is
  at (13,13); each hand is drawn at exactly half scale and offset so its tip
  falls there. The pair's two tips are 52 viewBox units apart, which is the
  26px between the two dots, so the second dot lands on the second finger by
  construction and stays on it through the whole slide.
- **THE TWO FINGERS POINT UP AND SIT SIDE BY SIDE, and drawing a hand is what
  allowed that.** They used to point sideways, because the two contacts were
  stacked vertically — which was right while each contact was a bare dot, on
  the grounds that two dots abreast sliding along their own direction of
  travel read as one dot with a trail. A drawn hand answers that on its own:
  nobody looks at a fist with two fingers out and sees one finger. So the
  contacts went side by side, 22px apart, the hand got to be the right way
  up, and the second track went with it — side by side, both fingers travel
  along the same line. Three numbers move together: the two `.gfinger`
  margins and the symbol's two tips.
- **The hand lifts with the taps**, on the same 1.9s clock as the dot and the
  rings: a hand that stayed planted while the dot blinked is the "one messy
  throb" the double-tap drawing was already fixed for once. Its tilt is a
  custom property because an animated `transform` replaces a static one, so
  the lift keyframes have to carry the rotation or the hand snaps upright
  every time it taps. It is in `ghostRestart()`'s list for the same reason
  everything else is.
- **The hint system gets all of this for free**, because there is one hand
  with two owners — see below. A hint borrows the same element, so it now
  shows a hand rather than a dot wherever it showed anything.
- **The hand sits in the middle of the screen, over the world.** That is
  where the gesture actually happens — a swipe or a double tap lands on the
  world, not on a strip at the bottom — and it is where the player is already
  looking. It rode the bottom edge first, which put the demonstration in the
  one place the lesson had just finished emptying. The coach goes to the foot
  of the screen under it.
- **Every demonstration has a track, and it is the place the gesture
  happens**: a line for a swipe, with a gradient running from nothing at the
  start to the goal colour at the finish; a soft disc for a tap. The disc is
  filled rather than outlined because the dot and the ripple are already
  concentric circles of about that size, and a third outline was most of what
  made the tap read as messy.
- **The double tap's lift is the whole drawing.** The first version kept the
  dot on screen and dipped it twice, which is what a single slow pulse looks
  like — the count was carried entirely by two overlapping rings. A finger not
  touching the glass is not on the glass, so the dot goes to *nothing* for
  120ms between the taps, the disc holds the position while it is away, and
  the two ripples no longer overlap. The gap is far longer than a real double
  tap; this is a demonstration and legibility beats fidelity.
- **The contacts and the ripples are two halves of one clock.** Both
  animations run 1.9s and the second ring's `.38s` delay is exactly the 20%
  at which the dot lands again — move one and you must move the other,
  including in the reduced-motion block. 1.9s is also the swipe's loop, so
  all three demonstrations beat together.
- **The two fingers sit side by side and point up**, which is how a hand
  actually lands on glass. Stacked was the older drawing and the reason is
  in the hand note above. The gesture itself reads the horizontal midpoint,
  so either grip works and the demo is honest either way.
- **`ghostRestart()` exists because a class change does not restart a CSS
  animation.** An animation restarts when its `animation-name` changes or
  when the element goes from `display:none` to displayed — so the parts of
  the hand were starting their loops at different moments and staying that
  way. `.gfinger.b` is hidden until `g-two`, so it began the instant that
  class arrived while `.gfinger.a` had been looping since the previous step
  under the same `gswipe` name: measured at nearly **three seconds apart**,
  one finger arriving as the other left, in the drawing whose whole job is to
  say "two fingers, together". A swipe that only changed direction jumped for
  the same reason. It is called only when the demonstration actually changes,
  because a step wanting three presses of one control must not restart on
  each of them.
- **The hand is the green button; the dim is still the dim.** Those are two
  statements and tying them together was a bug once (see above), so the
  arrangement is carried over rather than reinvented: the hand is on at .62
  for as long as the step is, and the guided lock — armed on hesitation, not
  on arrival — dims the world and takes the hand to full.
- **No pulse in gesture mode.** `cue()` falls back to *speaking* the move in a
  toast when the button it names is off screen, which in a gesture tutorial is
  always, so every step would open by announcing itself in words on top of a
  coach line and a hand already saying it.
- **The turn's direction is easy to get backwards.** The world follows your
  fingers, so a slide *left* carries the near edge left, which is the way
  `viewAngle` grows, so it commits `rotateView(+1)` — `bRotR`. The map says
  `bRotR:{k:"two",d:"left"}` and it is not a typo.
- **The prose says what the control says, and now there are two sets of
  controls it could mean.** This is `{to2}` generalised: `{do:right}` is an
  imperative and `{it:right}` is a name, both resolved against the mode by
  `tutWords()` at the moment the line is shown, from `TUT_SAY`. A lesson
  reading "press the right arrow" over a swiping finger is the same bug with
  a different subject — and `TUT_MOVE_SAY`, the off-script lines, goes through
  the same tokens, because that is the sentence a player sees precisely when
  they have stopped following along.
- **`body.tutgest` is set in `syncHud` beside `body.tut`**, and its CSS rule
  names both classes so it out-specifies `body.tut.ui-none #playBar.on` — the
  rule that forces the bar over a HIDDEN layout. A bare `body.tutgest` loses
  to that by one class, and the failure is invisible in the default layout.

---

## Controls

Three layouts, in the menu: `ON-SCREEN` (d-pad), `COMPACT` (no d-pad),
`HIDDEN` (nothing). Gestures work in **every** mode and are additive, never
exclusive — every gesture also has a key and, unless hidden, a button:

- swipe — move
- **double-tap the world — change dimension**, in every mode. A single tap did
  this when the bar was hidden and no longer does anything: the two cannot
  coexist, because a single tap that fires at once makes a double tap into
  fold-then-unfold, and telling them apart means delaying the fold ~300ms in
  the one layout where tapping is the only control you have.
- **two-finger swipe left or right — turn, either way.** Plant two fingers,
  slide them sideways, and the world follows: slide right and the near edge
  comes right with them. It takes hold after 14px (`TURN_GRAB`, subtracted
  rather than crossed, so it starts from still) at `TURN_DEG` .42° per pixel,
  and the turn is only *taken* if you let go past 30°; short of that it springs
  back having cost nothing, which is the whole point — turning is a move, and
  a beat of a live clock on a boss or a trial.
- **It reads the horizontal midpoint and nothing else.** A two-finger twist
  does nothing now, and neither does a vertical slide. This is the third
  arrangement: twist-only was what shipped before, and the version that read
  the midpoint *added to* the twist was worse than either alone — `viewAngle`
  grows clockwise on screen, so a clockwise twist is +angle while a rightward
  slide is −angle, and summing them makes the commonest grip of all (one
  finger planted, one sweeping) cancel against itself. **No constant fixes
  that**; if the turn ever feels mushy again, check the signs before touching
  `TURN_DEG`. `docs/HISTORY.md` has the worked example.
- two-finger tap — turn right, unchanged: it is a drag that never travelled
- **THE FOLD IS A TIMED TWEEN, NOT A LERP** (`FOLD_MS_IN` 520, `FOLD_MS_OUT`
  620, `FOLD_MS_CLOCK` 380, in `js/05-state.js`). It used to be
  `flatT += (want-flatT)*rate`, which is an exponential ease-*out*: most of
  the travel happens in the first few frames and the rest is half a second of
  creeping the last two percent. So the verb the whole game is built on was
  over before the eye had followed it. A linear phase through an ease-in-out
  cubic puts the motion where it can be watched — it leans in, travels, and
  settles. **Peek is deliberately kept out of the tween** and multiplied on
  afterwards: it is a live analogue value the player is holding, not a move
  being played, so it stays a lerp, and that separation is what lets the fold
  have a real duration without peek inheriting one. **An external write to
  `flatT` still wins**, detected by comparing against what the loop last
  wrote, so `resetLevel()`, `respawn()` and `loadLevel()` still snap — a
  death that animated a slow unfold on its way back to the start would be the
  reset arriving in slow motion. `dtMs` is clamped, for the same reason the
  fight clocks clamp theirs. The crush delay in `doFlatten` moved 420 → 620
  to stay behind the picture.
- **AND THE VERB IS REFUSED WHILE THE WORLD IS MOVING** (`folding()`). A
  second press landing inside the fold used to do nothing visible — the state
  turned round and the tween reversed — so a fast double press read as a
  button that had stopped working. It is a stamp taken when the move
  **commits**, not a read of the tween's `foldP`: `foldP` is reset by the
  render loop, which has not run yet between two presses in the same tick,
  so reading it let the second press straight through. Same reasoning as
  `deathPending`, for the same reason. It releases at 85% of the duration,
  because the last few percent of an ease-out is invisible and waiting for it
  would feel like lag.
- **Changing dimension jolts the camera and buzzes the phone** (`foldJolt()`
  in `js/12-play.js`, `haptic()` in `js/11-sound.js`). **It is two motions,
  and they say different things.** `shakeT` is impact — the same decaying
  jitter a hit uses (.9 folding, .6 standing up). `foldSlamT` is *weight*:
  one eased swing of the camera along screen-up, **down** into the plane and
  **up** out of it, so the picture moves the way the world just did. Its
  phase runs forward from the moment of the fold while its envelope decays,
  which is what makes it start from rest — driving the phase off the decaying
  value directly puts the camera at its extreme on the first frame, and that
  is a jump cut rather than a slam. Both are scaled by `viewSize`, so a large
  arena and a small one kick by the same fraction of the screen. The buzz is
  two pulses in the shape of the sound: a slam that settles going in, a knock
  that opens out coming back. **Skipped under `prefers-reduced-motion`,
  unlike the death and hit shakes** — this one fires on an ordinary move
  several times a level, which is the repetition that setting exists to stop.
  The buzz is deliberately **not** tied to mute: mute is about the room you
  are in, and vibrate is the operating system's switch to own. It is guarded
  three ways because all three happen — no `navigator.vibrate` on desktop or
  iOS Safari, a throw in some WebViews, and a silent no-op without a prior
  gesture. Failing silently is correct: it is garnish on a move already made.
- arrows / WASD, space, Q / E, Z undo, R restart, H hint, M mute, Shift peek
- Esc — close the open panel, or open the menu from a clear screen. It closes
  before it opens, because a key that always opened the menu would be the one
  key you could not use to back out of the wardrobe. Ignored behind the intro
  and the win card, which have their own buttons.

---

## The landing indicator — rule 5, shown instead of stated

**"You return on the block nearest the camera, unless an anchor is among the
candidates" is the single thing that cost the first real playtester the
most.** It is stated once in `First Fold` and never shown again.

**It cannot be drawn while you are flat — so the plane is where PEEK now
works.** Every candidate is at the same screen position in the plane, which
is what folding *means*, so the rule operates on information the player
cannot see and no wording fixes that. Three things answer it together:

1. **Peek in the plane is a preview un-fold.** The eye button already means
   "see depth without spending a move" and was switched off when flat. Held
   there it raises the world back toward the volume — most of the way, never
   all of it — and drops it on release. It works by lowering the *target*
   `flatT` eases toward, which is why it costs nothing else: every part of
   the drawing already reads `flatT`, so the whole world previews together.
   `flatT` is a render value and nothing outside `10-render.js` reads it;
   `flat` and `flatPos` are the state and do not move.
2. **The player is drawn on the block they WOULD land on** while peeking, not
   the one they folded from. `peekLanding()` makes the same two calls
   `doUnflatten` makes, so the preview and the move cannot disagree.
3. **Standing up is slower than folding** (`FOLD_MS_OUT` against
   `FOLD_MS_IN`), so the
   return reads as a journey to the front of the stack rather than a cut.
   Not on a clock: there half a second is a real cost.

**And the rings.** Standing up rings the block you landed on, and dimmer, the
ones you did not; peeking draws the same rings live, placed with the same
interpolation the block loop uses so they sit on their blocks through the
whole rise.

**PEEK IS THE FOURTH VERB, and it is treated as one now.** The first real
playtester reached for it in the plane *before it did anything* — the
affordance was already legible and the game silently ignored a correct
instinct. So:

- **The eye lights when looking would tell you something** — flat, with more
  than one block in your column, which is the only situation where the
  landing rule decides something invisible. Judged every frame in `lookCue()`
  rather than in `syncHud`, for the same reason the boss's fold cue is: the
  answer changes when the player moves in the plane, not when a button is
  pressed. Quieter and slower than `peril` and `strike`, because those two
  are about to cost you a life and this one is an offer.
- **Tap latches it, holding still works.** Hold-only meant keeping a thumb on
  a corner button while reading the middle of the screen. The latch drops
  itself after `PEEK_LATCH_MS` and on the next thing the player does, which
  is what made hold-only defensible in the first place.
- **`00 — First Landing` NAMES IT AND DOES NOT FORCE IT**, in the level's
  last line. It was a compulsory step there for one build and the owner
  played it and cut it: the step asked the player to preview a landing the
  level had not yet told them existed, so the eye read as another hoop rather
  than as the answer to a question they were already asking. It had already
  been moved once, out of `00 — First Fold`, where it was a press before
  `GO 3D` while the fold itself was still new and read as part of standing
  up. Named rather than demanded, it is offered at the point the player has
  just been shown what it would be *for* — and the button lights on its own
  in the plane, which is the affordance the first playtester reached for
  before it did anything.

**A TUTORIAL STEP THAT ASKS FOR A FREE ACTION NEEDS `free:true`.** `tutGuide`
replaces a step's line with the next *move* whenever the solver disagrees
with it, which is right for the three verbs the solver knows. Peek is not a
move — it costs nothing, changes nothing, and the solver has no opinion — so
without the flag the step is overridden on every frame and can never be
shown. This bit once, exactly that way. **The same hatch now carries a step
that asks for a move the solver would not make** — the deliberately wasted
fold in `00 — First Landing`. That is a wider use than the flag was built
for and it is only safe where nothing is scored; see that level's notes.

**"The front", not "nearest the camera".** The old phrase names a direction
the player cannot see; the new one is a word they already own. Player-facing
text says *the front*; the code and this file may still say nearest, because
there the camera is a real thing.

- **Only when there was a choice.** `land.length > 1`, or nothing was decided
  and a marker would be noise. That is why it is silent on most levels and
  turns up exactly on the ones that turn on the rule.
- **The winner wears the colour of whatever decided it** — amber when an
  anchor overrode the rule, the goal's green when it was simply nearest — and
  the losers a dim version of the same, so the choice reads as one picture.
- **The rings draw forever; the sentence is budgeted.** `LAND_HINT_TIMES` (3)
  in `settings.landHints`. The rings are free and answer faster than words; a
  line of text on every fold would be nagging.
- **It goes in `flashCue`'s note slot, not `flash()`.** A toast lands at the
  top of the screen across the level's own hint text — the collision that
  slot was built to fix — and the note slot also sits near the rings rather
  than at the opposite end of the screen from them.
- **`landFrame` clears on `flat`, not on `flatT`.** flatT is still near 1 for
  the first frames after standing up, because the world is only starting to
  rise, so testing it threw the hint away on the frame it was created.

**`loadSettings()` is a whitelist and a key that is not read there does not
exist.** `settings.landHints`, `slowOffers` and `noSlowOffer` are all written
by `saveSettings()` and were silently forgotten on every reload until they
were added to it — which mattered most for `noSlowOffer`, since that one is
the player saying *stop*. **A key whose feature is removed comes out of the
whitelist with it**, or the trap runs the other way and the list slowly fills
with settings nothing reads. `trialBriefs` and `bossBriefs` went that way
when the brief cards did.

## How big the world is drawn

**The frustum fits the arena to the SCREEN, not to the largest of its three
spans.** The old fit was `max(spanX, spanZ, spanY)*.72 + 3.4` measured against
the frustum's *half width*, so on a portrait phone a tall narrow level was
framed as though it were as wide as it is tall and every block came out
small. The first real playtester could not read the board, and **a puzzle you
cannot see is not a difficulty problem.**

`fitViewSize()` computes what the arena actually needs on each axis and takes
the larger:

- **screen-right** is x or z depending on the view, so the worst case over the
  four views is the larger of the two spans;
- **screen-up** is height *plus* depth, because the camera leans by `tilt`
  (.62) and a cell of depth therefore costs .62 of a cell vertically — the
  same coincidence `legible.js` is about.

Blocks came out **1.6× to 1.8× bigger** across the campaign. Two things to
know before touching it:

- **Portrait and landscape convert the two requirements into `vs`
  differently** — half-width is `vs` and half-height `vs/a` in portrait, the
  other way round in landscape. Getting it backwards is silent: it only shows
  as bad framing on one orientation.
- **The control bar does not change the size on a phone.** Width is the
  binding constraint in portrait and the bar costs height, so `padH` only
  matters in landscape or on a very wide arena. Do not assume hiding the bar
  buys size — it was measured and it does not.

## Things worth knowing before you change them

- **Verify claims with the solver rather than asserting them.** `node
  tools/verify.js` checks every level: BFS on ordinary levels and trials,
  `trialSafety()` on trials, `bossArena()` + `bosssim` on bosses. `node
  tools/curve.js` dumps the difficulty curve. `node tools/legible.js` finds
  squares that lie.
- **A level can tell the player something untrue, and `legible.js` is what
  finds it.** Screen-vertical is height and depth added together, so a block
  can draw exactly where ground would have to be for a step that is actually
  a fall — and the player learns otherwise by dying. It asks that precisely:
  standing here, stepping there falls, but does some distant block draw within
  half a cell of where ground would have been? **30 levels are flagged at the
  strictest reading and 9 of those lie from the start square**, where it is
  the first press of the level. It fails nothing — a near-miss is sometimes
  the puzzle — but a level flagged from its start square is almost always a
  mistake, and the fix is usually one coordinate. Both levels reported in
  playtesting so far turned up in it.
- **The camera tilt is not the fix for that, and it was measured rather than
  assumed.** The tempting theory is that `0.62` makes one unit of height and
  two of depth nearly equal, so nudge it. Nudging does nothing: the
  coincidence moves to a different pair and the count stays at ~30. There is a
  cliff, but only once the camera is steep enough that a cell of depth
  outruns a cell of height — around `0.95`, where the count falls to 11. That
  is a real lever and a large change to how the game looks. The numbers are in
  `tools/legible.js`.
- **`resolveStep()` is shared by the game and the solver**, so they can never
  disagree. Keep it that way. Its optional `occHere` argument checks headroom in
  *both* columns; without it you can slide diagonally past a ceiling.
- **Folding into a wall is telegraphed, not blocked.** `foldPeril()` in
  `js/12-play.js` answers "would flattening from here kill me, and which blocks
  are to blame" — the guilty ones are tinted and outlined red in the world and
  the `GO 2D` button pulses. It came from playtesting `12 — Far Side`, where
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
- **THE DEPTH FADE IS A STEP, NOT A RAMP, AND THAT WAS MEASURED.** It used to
  be `diff * .12`, so the *first* cell of depth — the one that decides whether
  a step is a walk or a fall — cost almost nothing and was invisible. Count
  the blocks that actually mislead somebody (`legible.js`'s ghosts, at the
  strictest reading) by how far they are from the player's own square and the
  answer is unambiguous: **50% are one cell away, 37% are two, and 13% are
  everything else.** The confusing block is nearly always the near one, and it
  was the one being shaded least. So `DEPTH_STEP` (.34) is charged outright
  for the first cell and `DEPTH_SLOPE` (.09) only grades what is behind it —
  your own slice is lit and everything else has visibly receded, which is a
  categorical statement rather than a gradient the eye has to measure.
- **It is an improvement, not the fix, and the difference matters.** The
  ambiguity is geometric: screen-vertical is height and depth added together,
  so two different places genuinely draw in one place and no amount of tone
  separates them for somebody who reads a dark block as a dark *material*.
  The structural lever is `CAM_TILT`, now a named constant read by both the
  camera and `fitViewSize()` — at .95 `legible.js` falls from 30 flagged
  levels to 11. It is a large change to how the game looks, so it is the
  owner's decision and is deliberately left at .62.
- **Hints are free and unlimited** so nobody gets stuck, but each one lowers the
  star cap: 0 hints → 3★, 1–2 → 2★, 3–4 → 1★, 5+ → 0★. This replaced a
  metered/timer design deliberately — an energy timer teaches people to close
  the app, which is the opposite of what a free game needs. `win()` writes an
  *effective* move count so hints cannot be laundered into currency.
- **A cue has three deliveries, and `cue()` picks the most it can say.**
  Pulse the button; if the layout dropped it, **show** the gesture with the
  ghost hand; and only if the control has no gesture either, **name** the move
  in words. Showing beats naming and goes first — a swiping finger is the
  instruction where "go right" is a description of one. It is decided per
  *control*, not per layout, which is what makes `COMPACT` come out right:
  the d-pad is gone so a walk hint draws a hand, while the fold and turn
  buttons are still there and pulse as they always did.
- **The layouts are why any of this exists.** `COMPACT` drops the d-pad,
  `HIDDEN` drops the whole bar, and `cue("bUndo")` has always pointed at a
  control this game does not have — so the one hint you get when you are
  wedged past recovery showed nothing at all, and a `HIDDEN` player paid a
  star for a pulse on an invisible button. Undo and peek are still the words
  case and always will be: no finger gesture performs them. Visibility is
  tested with `getClientRects()`, not `offsetParent` — the bar is
  `position:fixed` and reports no offset parent while plainly on screen.
- **`cue()` returns the spoken form only when it fell all the way through to
  words**, because there is one toast element and the last write wins: a
  caller about to flash its own message carries the words along rather than
  clobber them. A pulse and a hand both return null, and `ghostBorrowed()`
  is how `showHint()` tells those two apart afterwards.
- **The hand has two owners and neither may take down the other's.** The
  tutorial *holds* it for as long as a step lasts (`held`); a hint *borrows*
  it for `GHOST_MS` (`once`). They collide in one direction that matters:
  `tutSync` runs on every `syncHud` and ends at `tutUnlock()` on an ordinary
  level, so a hint's hand would be cleared by the very next redraw — which
  `showHint` causes itself, two lines after asking for it. So clearing states
  which owner is doing it and a mismatch is refused, and the owner lives in
  the element's own class rather than in a variable beside it, where it
  cannot end up disagreeing with what is on screen.
- **A borrowed hand is louder than a held one**, .92 against .62, because
  they are different statements: the tutorial's is ambient and has a coach
  line saying the same thing, a hint's was asked for, costs a star, and has
  a few seconds alone.
- **`clearCue()` takes the borrowed hand down with the pulse.** Every verb
  calls it, which is what makes a cue something you spend by acting on it —
  and a demonstration still looping after the player has done the thing is a
  hint that will not stop talking. The tutorial's hand is untouched: there
  the step ends it, not the move.
- **A spoken cue does not look like a toast, because it is not one.** A toast
  is an aside in the player colour at the top of the screen; a spoken cue is
  an *instruction*. So `flashCue()` gives it the goal colour — green already
  means "do this" on the button pulse — puts it down by the controls where
  the thumb and the eye are, and gives the move its own line with the hint
  accounting small underneath. It also lingers longer than a toast: reading
  three words costs more than glancing at a button that is already flashing.
  It shared the toast's styling once and wrapped into "go right — hint 4," /
  "max 1 star" straight across the level's own hint text.
- **When the hand shows the move, the accounting keeps that slot and loses
  the shout** (`flashCue(null, note)` → `.noteonly`). It cannot go back to
  the top of the screen: that is where it lands across the level's own hint
  text, which is the collision the slot was made to fix. There is no
  instruction in it any more, only a footnote to one being drawn a few
  centimetres above.
- **The words are the ones on the buttons, not the ones in the code.** The
  d-pad's glyphs are arrows, so `bUp` says "go up" even though it moves you
  away from the camera. `bFlat` is the exception that has to be computed:
  "2D shift" going in and "3D shift" coming out, because which way you are
  about to go is the whole content of the instruction.
- **Stars.** 3★ = the solver's own move count, 2★ ≤ 150%, 1★ ≤ 200%
  (`STAR_2X` / `STAR_1X` in `js/07-difficulty.js`, read by `win()`'s
  hint-laundering arithmetic as well, so the bands live in one place). Par is
  optimal, so 3★ genuinely means optimal — that half has never moved. The
  bands widened from 120/140 because a near miss was costing a whole star: on
  a ten-move level 140% is fourteen moves, so two wrong turns was zero, and
  0★ should mean *not by anything like the short road* rather than *you took
  the scenic route once*. Levels on a clock ignore all of this
  and score on lives.
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
- **THE AMBIENT LAYER IS CURRENTLY MUTED** — `AMB_MUTED` in `js/11-sound.js`
  is `true`. Playtested and disliked: the birds, the sea, the wind and the
  desert together were more presence than the game wanted, and a bed you have
  to put up with is worse than no bed. **Everything below is kept rather than
  deleted**, because what is wrong with it is a judgement about the mix and
  the voices rather than about the machinery — the beds, the phrases, the
  wave's three phases and the meteor's boom are all still written and all
  still measured. Setting the flag to `false` is the whole of turning them
  back on. It is asked at `ambTo()` and `ambSync()` rather than inside
  `ambStart`, so a muted section builds **nothing**: no noise buffer, no
  oscillators, no 250ms timer. Every part of a section you can *see* is
  untouched — the birds still fly, the meteors still land and flash, the foam
  still runs up the beach.
  - **An ambient voice belongs to its bed or it does not play.** `ambVoice()`
    and `ambCicada()` used to fall back to the master bus when `AMB.gain` was
    missing, which would have let a bird sing straight through the mute.
    Measured at zero now, with the loudest events called by hand.
- **EVERY SECTION HAS AMBIENCE, and it is synthesised like everything else.**
  `ambTo(kind)` is called from `applyTheme`, so the sound of a section arrives
  with its sky and cannot be left behind by a level change; there are no audio
  files in this project and there are not going to be any. Birds are
  oscillators with a bend in them, the sea is noise with a slow envelope, the
  wind is a narrow bandpass being swept by two LFOs at unrelated rates, and
  the volcano's rumble is brown noise under a low-pass.
  - **THREE BIRDS, NOT ONE, AND THEY ARE SPECIES.** One voice — a triangle
    with a bend in it — was reported as not sounding like a bird, correctly:
    a single pure tone with a glide on it is a *whistle*. The wood now has a
    **myna** (a mimic, so a scattered phrase of whistled notes at speed), a
    **toucan** (a dry low croak) and **cicadas** (a broadband buzz
    amplitude-modulated at about seventy a second, swelling over four
    seconds and out again). Each plays a phrase off `AMB_MOTIF`, which is
    what "random but with a pattern" means. Every voice goes through the
    game's reverb, because a call outdoors arrives with air around it.
  - **A CROAK IS A RATTLE, NOT A SWEEP, and the sweep was a bungee rope.**
    The croak was first built as a sawtooth glided in pitch through a
    high-Q bandpass that was swept at the same time — which is precisely how
    you synthesise a boing, and it was reported as a trampoline. A falling
    resonance over a falling tone is the one shape that reads as rubber.
    Now the pitch holds, the filter holds and is broad (Q 1.4 against 9), and
    the character is an LFO chopping the gain at fifty a second. There is
    nothing left in it that can glide. The myna lost its buzzy element for
    the same reason and is all whistle now — what makes it a myna is the
    scatter of the phrase, not the timbre of one note.
  - **YOU CAN SEE WHICH BIRD IS SINGING.** A call with nothing on screen
    making it is a sound effect; the same call with a bird visibly making it
    is a place. `ambBirdPhrase` hands the moment to `birdSing()`, which picks
    whichever bird is nearest the middle of the frame — a ripple half off the
    edge points at nothing — and marks it for the length of the phrase: two
    arcs opening from its beak side, and the bird itself flapping harder and
    riding up on each note. The flap is what makes the cue belong to that
    bird rather than float beside it. Phrases come every 2–6 seconds now
    rather than every 4–11. **It is off with the sound** under `AMB_MUTED`,
    and that is the right coupling: the cue exists to say *this bird is
    making that noise*, and drawing sound coming out of a silent bird is
    worse than not drawing it.
  - **Samples were asked for and synthesis is the answer.** There is no
    audio file anywhere in this project and there is a reason: the published
    build is one HTML file, its sandbox blocks fetching media, and a
    recording somebody else made carries a licence with it. A synthesised
    bird costs twenty lines and can be retuned by the ear that is
    complaining rather than re-sourced.
  - **A WAVE IS THREE EVENTS and the middle one is the point.** One gain ramp
    through a sweeping filter is a *whoosh* — reported as not sounding like a
    wave. It is now an approach (closed right down, two seconds of water
    moving), a **crash** (25ms of broadband attack with a thump under it) and
    a wash (a long hiss with the filter closing). **The renderer owns the
    clock**, not the ambience: `seaT` counts down, the sound is started
    `WAVE_RISE` ahead of the break, and the foam sweeps up the beach on the
    frame the crash lands. One event, seen and heard.
  - **The volcano's boom became a meteor's.** Nothing on that mountain
    visibly erupts, so a boom every seventeen seconds was describing an event
    the picture never showed. A meteor *does* visibly land, so `ambBoom()`
    fires on the impact — and delays itself by the distance, because light
    arrives before sound and that is the one cue that says the ridge is far
    away.
  - **One graph per section and one slow timer for all of it.** Continuous
    parts are audio-rate and cost nothing per frame; the events that need
    deciding come off a single 250ms tick, which is what keeps teardown to
    one `clearInterval` and stops a stray bird arriving four sections later.
  - **The noise buffer is crossfaded into itself at the seam**, or a
    four-second loop clicks four times a minute.
  - **`AMB_LEVEL` is the fader in front of all of it.** "All of them were a
    bit higher than I expected" is a note about the layer rather than about
    any one section, and every gain in `ambStart` is a *relative* mix, so it
    is one number rather than eleven edits.
  - **THE DESERT WIND WAS AN ALARM, AND THE Q IS WHY.** A bandpass at Q 7
    swept 500Hz either side of 760 is a siren: narrow enough to be a pitch,
    and moving enough to be a pitch that *changes*. It is the same idea an
    octave lower, four times broader and wandering slowly now, with the low
    body carrying most of it and the whistle a colour on top. The gust swells
    to 1.28× rather than 1.7× — rising in pitch *and* in volume together was
    the other half of the siren.
  - **A GAIN NODE IS BORN AT 1, AND THAT WAS THE DISTORTION.** Every envelope
    here schedules its first value a moment in the *future*, so between
    `createGain()` and that first `setValueAtTime` a looping noise source was
    running through it at full scale. For the wave's wash that window was the
    whole two-second approach: measured at the master bus, the sea peaked at
    **4.8 before the limiter** (about +14 dB) and the actual crash, at 0.26,
    was inaudible underneath it — reported exactly as "the sound right before
    the wave breaks is too loud", where too loud meant the limiter rather
    than the level. The meteor impact had the same bug in a 50ms window and
    measured 6.1. **Anything fed by a source that is already running must be
    silenced at creation**; an oscillator voice never had it, because an
    oscillator starts when its envelope does.
  - **The noise buffer is normalised**, and that is what makes every gain in
    the file mean what it says. A brown-noise integrator does not land in
    [-1,1] — it wanders — so it was being scaled by a constant picked by eye.
    Do not put the constant back.
  - **The levels, measured pre-limiter, against a footstep at 0.63**: bird
    bed .14, myna .34, toucan .40, meteor impact .45, sea bed + wave .32,
    wind bed .24. Nothing in the ambience is louder than a footstep, and the
    documented worst-case pile-up (win chord + strike + step) with the whole
    bed and an impact under it now peaks at **0.98 with zero saturated
    samples**, where it used to clip. If you raise a gain, re-measure that
    stack — a limiter makes clipping quiet rather than obvious.
  - **`audio()` refuses everything while muted**, so ambience simply does not
    start; `ambSync()` is what puts it back on an unmute, and it is called
    from both the `m` key and the volume row.
- **Sound goes through a mastering chain** (`js/11-sound.js`): blips →
  `masterGain` (a fixed `MIX` drive) → limiter → `POST` → soft clipper →
  **`outGain`, the volume setting** → destination.
- **The volume goes last, after the limiter, and that ordering is the whole
  point.** For two builds it multiplied the *drive* instead, and a fader in
  front of a limiter is a fader the limiter undoes: measured, dropping the
  slider from 1.0 to 0.35 made the output 0.9 dB quieter, because all it did
  was stop the limiter working so hard. Wired after, the same move is a true
  −9.1 dB. If the slider ever stops doing anything again, check what it is
  connected to before touching `MIX`. The per-blip gains are a deliberate mix — a footstep sits
  well under the win chord — so loudness is corrected at the master rather
  than by editing eleven numbers. The limiter defends the ceiling against the
  rarest moment (win chord + shot + strike + step inside 40ms), which alone
  would keep every ordinary sound about 4 dB quieter than it needs to be; the
  soft clipper rounds off the last transient peaks so that moment does not
  set the level for everything else. **If you change `MIX` or `POST`,
  re-measure that stacked case** — a limiter makes clipping quiet rather than
  obvious and a soft clipper hides it further, so the pair will happily let
  you ship something distorting on every footstep. Every write to
  `masterGain.gain.value` must go through `masterLevel()` or the boost is lost
  the first time the volume slider moves.
- **The default volume differs by device**: 1.0 where the pointer is coarse
  (a finger, so a phone or tablet — small speaker), 0.35 elsewhere (a desktop,
  usually with its own amplification, where the phone setting is painful).
  Only the default differs; the chain and the ceiling are identical, and the
  slider still goes to the top.
- **A stored volume only wins once you have moved the slider** (`volTouched`).
  Without that flag the per-device default was a no-op on every machine that
  had ever played: the save already carried a volume, written by a default
  from an era when the whole mix was six times quieter, and it silently
  outranked the number picked for the hardware. Moving the slider sets the
  flag and your choice sticks from then on.
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
  the case, and only a confirmed purchase equips. A consequence worth keeping:
  a palette does not touch the world until it is equipped — the case previews
  it instead.
- **Panels are phone-width and centred on every screen** (`.panel`, capped at
  560px). They were written against a phone and stretched edge to edge on
  anything wider: the wardrobe's display case is a square sized as a
  percentage of the panel, so on a 1600px monitor it became a 600px block
  with two absurd columns of tiles, and the level picker became 10px
  monospace ruled across a metre of glass. At phone size the cap changes
  nothing — `100% - 32px` is exactly what `left:16px/right:16px` gave.
- **`body>canvas` in the CSS is load-bearing.** The game's renderer is the only
  canvas that is a direct child of `body`; any future in-panel canvas depends
  on that staying scoped.
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

**Measured success rate: 59%** on reversal-free random sequences, 14% if you
allow sequences that double back — *a sequence that reverses direction can
never be forced*, because returning where you came from means a shorter route
always exists. The composer warns about this. Highest-leverage dials in
`synthesize()`: the depth-choice heuristic (currently `lastDepth ± 2..6`) and
the step-up probabilities (0.25 in 3D, 0.3 in 2D). Two hypotheses that were
tested and failed, plus where this sits in the PCG literature, are in
`docs/HISTORY.md`.

---

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
- **Boss and sweep pacing are both guesswork.** Trials: `period` 2500 → 2000,
  `fire` 340 → 300. Bosses ramp *within* a fight and *across* the campaign —
  `BOSS I` runs 1100/1300 down to 870/1020 and `BOSS IV` 720/850 down to
  570/660, so the opening fight is about 40% slower than it was and the last
  one is where it always sat. **That ramp is what the `Pace` setting is meant
  to stop being for**: a first boss slow enough to think in, rather than a
  menu row asking a new player to diagnose their own difficulty. The whole
  ramp is still invented. The checks bracket each fight; they say
  nothing about whether the numbers are *fun*, or whether a human can read a
  line, decide the axis, rotate and fold inside one beat.
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
- **Real time is the one thing the game is not**, and `Pace` in the menu is the
  concession. `NORMAL` / `EASED` / `SLOW` = 1 / .75 / .5, and it is **one
  multiplication on `dt`** at the top of `bossFrame` and `trialFrame` rather
  than a set of slowed dials. That matters most now that a fight is phased:
  `step` and `aim` belong to the *phase*, and `creep`, `rage`, `period`,
  `fire` and the beat of grace are all measured against the same clock, so
  scaling the clock keeps every ratio between them. Slowing `step` alone would
  change how many steps a hunter gets per telegraph — the fight's whole shape,
  and the one thing phases exist to control. It is free and does not touch
  stars, on the grounds that a hint hands you the answer and a slower clock
  only gives you longer to say it. To reverse that judgement, cap a clock
  level in `starsForRecord()` the way `capForHints()` caps an ordinary one.
  What is still guesswork is whether .75 and .5 are the right two rungs.
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
- **The gesture tutorial has no keyboard half yet**, which is why
  `defaultTutor()` sends a fine pointer to the button lesson. The intended
  end state is one lesson that teaches whatever the device actually has —
  gestures on glass, keys on a desktop — and the game shipping with no
  buttons by default in both. `TUT_SAY` already has the shape for it: a third
  table of phrases and a third demonstration (a key cap rather than a hand),
  keyed by the same cue ids.
- **The ghost hand has never been played, only screenshotted.** The open
  questions are all feel: is a hand looping for the whole step help or noise,
  is .62 against 1.0 enough of a step up when the guided lock arms, and does
  the two-finger demo read as *two fingers* rather than as a wide swipe.

---

## Agreed next steps

0. **Playtest the gesture tutorial**, and if it lands, build the keyboard
   half: a `keys` table in `TUT_SAY`, a key-cap demonstration beside the
   hand, and `defaultTutor()` returning it on a fine pointer. **The bar being
   off by default is done**, by the tutorial's own ending question — see
   `controlsOffer()` — rather than by changing the default layout, so a
   player who wants the buttons is offered them at the one moment they know
   what they would be choosing between.
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
3a. **Move `IV · CRATES` in front of `III · GLASS`** — the owner's call, taken
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
   rewarded-video callback should call `grantShards(n)`, `grantAdView(id)` or
   `grantSkip(name)` — three hooks, one per thing an ad can buy. Rewarded-only
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

## Working notes

- The owner is learning, not shipping. Explanations of *why* are wanted, not
  just working code.
- Levels can be pasted in and out as JSON from the editor's ⋯ menu.

### How to work on this, agreed with the owner

- **Propose before building, whenever the ask is open-ended.** A few options,
  two paragraphs each, no code. The owner picks one — or two, if more than one
  is interesting. Designing three fights at full fidelity and discarding two
  is the expensive way to arrive at the same answer, and it happened once.
- **Feel beats simulation on anything real-time.** For bosses and trials the
  owner playtests and says what is wrong immediately, which is faster and
  truer than tuning against `bosssim` — and the fight may be scrapped anyway.
  Run the checks when the *rules* change or when something must be proved
  possible; do not run them to tune a number.
- **Ordinary levels are the opposite: always machine-verify.** `node
  tools/verify.js` before handing over any new or edited non-boss level. A
  level that cannot be solved, or that falls in four moves, is not something
  playtesting should have to discover.
- **The owner playtests from the published artifact, so publishing is part of
  handing work over.** The loop is: work on a branch, commit, push,
  `node tools/build-single.js --vendor --artifact`, publish that file to the
  **existing** artifact URL. Four rules make it reversible, and all four exist
  because one of them was broken once and cost the whole map redesign off the
  live link (`docs/HISTORY.md`):
  - **Commit before you build.** The build stamps its own commit into the
    file, and warns when the tree is dirty — a build from uncommitted work
    cannot be re-derived, so there is no way back to it.
  - **Check the size against what is already live** before replacing it. A
    build that is *smaller* than the one it replaces is a question. −70KB
    meant a whole unmerged branch was about to be thrown off the link.
  - **Publish to the URL, never to a new one.** A second artifact is not a
    new version, it is a second link the owner now has to keep straight.
  - **Rolling back is `git checkout <commit> && build && publish`.** The
    build is deterministic — same commit, byte-identical file — which is what
    makes "put it back" checkable rather than hopeful.
- **Publishing updates the artifact; it does not update what other people
  see.** Each publish becomes a version, and the share is pinned to one of
  them — the owner sees the newest, everybody holding the link sees whatever
  the share points at. This was found the hard way: the owner's mother opened
  the link and got a build several days old. The permanent fix is the
  **Always share latest version** toggle in the artifact's Share menu, and
  once that is on nothing here has to happen again. Until it is confirmed on,
  **remind the owner to bump the shared version every few publishes** — not
  after every one, which is noise, but whenever a run of changes has landed
  that somebody else would want to see. Agreed with the owner, in those words.
- **The running build is visible in the menu**, at the foot of the panel, as
  `build <sha> (<branch>)`. That is the whole diagnostic for "are we looking
  at the same version": ask whoever is playing to read it out. It says
  `unbuilt · running from source` when `index.html` is opened directly, and a
  build stamped `+UNCOMMITTED CHANGES` is one that cannot be re-derived from
  a commit.
- **One job per session where possible.** Unrelated work in one pass re-reads
  the same files several times over.
- **Edit files with the editing tools, not by patching them from a shell.**
  Out-of-band writes make the whole file reappear in context each time.
- **Put post-mortems in `docs/HISTORY.md`, not here.** This file is loaded
  every session; it should hold what is true now. The reasoning behind a
  decision belongs in the history unless you need it to avoid breaking
  something today.
