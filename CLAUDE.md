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
   **four phases**: one walks onto your row, plants, and charges down it, and
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
order listed in `index.html`. `20-boot.js` is the only file that *runs*
anything; everything before it only declares.

| File | What it holds |
|---|---|
| `js/00-storage.js` | `window.storage` over `localStorage`. The game was born inside a Claude artifact where the host supplied this API; the shim lets identical code run from `file://`, itch.io and a Capacitor WebView. Defines itself only if absent. Falls back to an in-memory map if storage is denied (private browsing). |
| `js/01-coords.js` | `AX[]` — the four camera views, each with `r` (screen-right) and `d` (depth, pointing at the camera). Nearly every coordinate calculation goes through these. Also `K()` and `box()`. |
| `js/02-levels.js` | 72 levels + `SECTIONS` + `LEVEL_RENAMES`. |
| `js/03-rules.js` | `resolveStep()`, block kinds, `makeRules()`, `makeBoss()`, `bossPhases()`, `bossBlocksAt()`, `bossNext()`, `bossLine()`, `foldKills()`, `bossArena()`, `makeTrial()`, `trialSafety()`. |
| `js/04-solver.js` | `solve()` — BFS over game states. Solves trials; knows nothing of bosses, on purpose. |
| `js/05-state.js` | Mutable state, the pack, the trial clock, tutorial counters. |
| `js/06-persistence.js` | Progress, settings, session, library, wardrobe. |
| `js/07-difficulty.js` | `statsFor()`, `tierOf()`, stars, `statsCached()`, `starsForRecord()`, `onTheClock()`. |
| `js/08-minimizer.js` | Delete each block, re-solve, find what is load-bearing. |
| `js/09-wardrobe.js` | Skins, palettes, the star economy, the display case. |
| `js/10-render.js` | three.js scene, depth shading, the animation loop. |
| `js/11-sound.js` | Web Audio oscillator blips and the master limiter. No assets. Also `settings`, `VERBS`, `applyUI()`. |
| `js/12-play.js` | The verbs: move, shove, collapse, restore, die, win. Also the fight and the trial clock. |
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
five levels in, each section is interrupted by a **trial**:

| | | |
|---|---|---|
| I · FUNDAMENTALS | 9 + trial + boss | turn, depth — the fold itself is the tutorial's job |
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

`LEVEL_RENAMES` maps every old level name to its **current** one and
`migrateNames()` applies it on load. **Compose that table, never rewrite it** —
regenerating it from scratch once silently broke the oldest saves. The story is
in `docs/HISTORY.md`.

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

### Details that are load-bearing

- **Every death costs a life, not the level.** Falling, spikes and folding
  into a wall all spend a life and put you back at the start with your cores,
  your clock and the pack's damage intact; only running out is a real reset.
  Restarting the level for a mistimed step took back the rhythm you had spent
  two crossings learning, which turned three crossings into one tightrope.
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
geometry, both jobs, opposite signs — which is why `Through Glass` is the
arena it is. Glass casts nothing, so the columns that *look* blocked are
precisely the ones you can attack from.

This is the fifth boss design. The four that failed, and the two versions of
this one the simulator rejected, are in `docs/HISTORY.md` — **read it before
changing the kill rule**, because the two most obvious alternatives have both
already been built and measured.

### Four phases, because a fight with no arc has only one dial

Every fight runs **four phases**, and clearing what is on the board begins the
next. Each phase changes the question rather than the speed:

| | |
|---|---|
| **1** | one hunter, a **bare floor**, the slowest clock in the fight |
| **2** | **the whole arena rises** — every pillar, spike, pane and crate the fight will ever have |
| **3** | one hunter, **`cunning`** — it will not take a line you can answer |
| **4** | **two** at once, ordinary rules |

**All the geometry arrives in phase 2, and nothing is added after.** Two
reasons, both found in playtest. It makes a phase legible: phase 2 is the one
where the *arena* changes and 3 and 4 are the ones where the *opponent* does,
so a player who dies knows which kind of thing beat them — a pillar rising in
phase 3 read as more of phase 2 and buried the change it was meant to
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

**Phases 3 and 4 are deliberately two answers to the same question**, so they
can be compared back to back in one sitting: is a single smarter opponent
better than two ordinary ones? That comparison is the point of the current
shape and neither is settled.

- **`cunning` grades lines rather than refusing them.** `bossNext`'s `lineTo`
  callback answers 0 / 1 / 2 — no line, a line, a line the player cannot fold
  on from where they stand — and a cunning hunter prefers grade 2. Only the
  *ordering* matters (56 over 40); the margin must stay small enough that it
  never crosses the arena hunting for one, or preferring a line becomes
  circling and we are back in design 3.
- **It declines to plant, but only `hold` times** (currently 2). This is the
  same patience valve the twin uses and it is here for the same reason: an
  opponent that will not attack from anywhere you can punish stops attacking.
  It never stops *walking*, so it closes on you the whole time it is fussy.
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
replaced by `BOSS I — The Hunt`, and `LEVEL_RENAMES` carries the rename.

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
- **A hit throws the pack back to its spawns and does not move you.** Sending
  the player home costs the position they spent twenty seconds building — a
  punishment for being hit *and* for having played well.
- **A kill throws *you* back to your corner** (`bossSendHome`), which is the
  deliberate opposite. Killing means folding and folding means being where it
  is, so the square beside a spawn is the best in the arena: stand there and
  take each arrival as it appears. That is farming, it was found in the first
  playtest, and winning the exchange is the moment you can afford to give
  ground up. It moves you and **does nothing else** — it does not stand you
  back up and does not grant grace, because being flat is what a fold costs.
  An earlier version did both and made folding free: `bosssim`'s idle policy
  went from losing every arena to winning all four unhit.
- **No hunter may spawn within 5 of the start square.** The player is returned
  there after every kill *and* every life lost, so it is where they keep
  reappearing rather than somewhere they pass through once. `bossArena()`
  checks it; every second spawn in the game was 2–3 squares away, harmless
  while you could hold ground and a standing gift the moment you could not.
- **No two hunters may spawn sharing a silhouette column.** They respawn
  together after every hit, so a pair that shares one there is a standing
  gift, renewed. `bossArena()` checks it, per phase.
- **A hit throws the pack back to the *current phase's* spawns**, and the
  arena keeps whatever has risen. Losing a life does not rewind the fight.
- **On a clock, the `GO 2D` button is re-judged every frame** in the render
  loop rather than in `syncHud`. It is the one place a button class is not
  owned by `syncHud`, and it has to be: hunters move while you do not, so a
  cue computed at your last keypress describes a board that has moved on.
- **`bossHp` counts phases remaining, not bodies.** The dots in the HUD are
  the arc of the fight; killing one of a phase's two hunters moves nothing.
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
- **double-tap the world — change dimension**, in every mode. A single tap did
  this when the bar was hidden and no longer does anything: the two cannot
  coexist, because a single tap that fires at once makes a double tap into
  fold-then-unfold, and telling them apart means delaying the fold ~300ms in
  the one layout where tapping is the only control you have.
- **two-finger twist — turn, either way.** The map gesture: plant two fingers,
  pivot them around each other, and the world follows 1:1. It takes hold after
  8° (`TURN_GRAB`, subtracted rather than crossed, so it starts from still),
  and the turn is only *taken* if you let go past 30°; short of that it springs
  back having cost nothing, which is the whole point — turning is a move, and
  a beat of a live clock on a boss or a trial.
- **It reads the twist and nothing else, and that is deliberate.** A
  two-finger slide does nothing, as on a map. Two earlier versions read the
  midpoint between the fingers — first alone, then added to the twist — and
  the summed one was the worse of the two: `viewAngle` grows clockwise on
  screen, so a clockwise twist is +angle while a rightward slide is −angle,
  and summing them makes the commonest grip of all (one finger planted, one
  sweeping) cancel against itself. **No constant fixes that**; if the turn
  ever feels mushy again, check the signs before touching the sensitivity.
  `docs/HISTORY.md` has the worked example.
- two-finger tap — turn right, unchanged: it is a drag that never travelled
- arrows / WASD, space, Q / E, Z undo, R restart, H hint, M mute, Shift peek
- Esc — close the open panel, or open the menu from a clear screen. It closes
  before it opens, because a key that always opened the menu would be the one
  key you could not use to back out of the wardrobe. Ignored behind the intro
  and the win card, which have their own buttons.

---

## Things worth knowing before you change them

- **Verify claims with the solver rather than asserting them.** `node
  tools/verify.js` checks every level: BFS on ordinary levels and trials,
  `trialSafety()` on trials, `bossArena()` + `bosssim` on bosses. `node
  tools/curve.js` dumps the difficulty curve.
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
  optimal, so 3★ genuinely means optimal. Levels on a clock ignore all of this
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
  `fire` 340 → 300. Bosses now ramp *within* a fight — `step` 780 → 620 and
  `aim` 900 → 700 across `BOSS I`'s four phases, faster again by `BOSS IV` —
  and the whole ramp is invented. The checks bracket each fight; they say
  nothing about whether the numbers are *fun*, or whether a human can read a
  line, decide the axis, rotate and fold inside one beat.
- **Nobody has played the phased fights.** Four bosses × four phases is a lot
  of authored pacing that has only ever been machine-checked. The specific
  open questions: does phase 1 read as a tutorial or as filler; is the
  arrival of the pillars legible or does it just feel like being interrupted;
  and does a `cunning` hunter read as *smart* or merely as evasive.
- **`bosssim`'s duellist is not a good player.** It never herds — it does not
  pick a square in order to put a hunter on a line — and it reacts every
  200ms with perfect knowledge. It clears the four arenas in 4 to 7 seconds,
  which says the fights are winnable, not that they are the right length.
  It also has to be told that height matters (a square at the wrong `y` cannot
  be attacked from at all), or it climbs the first pillar between it and a
  hunter and oscillates on and off it forever — which reads as an unwinnable
  arena and is nothing of the kind.
- **The lunge is instant and unblockable once the beat ends.** It is
  telegraphed for `aim` milliseconds and breaking the line cancels it, so it
  is fair — but there is no partial answer, no grazing hit, and a player who
  misreads the axis simply takes it.
- **Real time is the one thing the game is not.** Bosses and trials mean it no
  longer plays entirely at your own pace, and an accessibility option to slow
  both clocks is the obvious missing setting.
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
- **`cue("bUndo")` targets a button that does not exist.** When you have wedged
  yourself past recovery, `showHint()` pulses nothing. Related: with controls
  `HIDDEN`, every hint cue points at an invisible button. Both want the same
  fix — `cue()` should fall back to a `flash()` when its target is not on screen.
- **Two-finger tap only rotates right.** There is no left-rotate gesture.

---

## Agreed next steps

0. **Playtest the four phased bosses.** They are real-time, which is the one
   thing no tool here can judge, and the phase ramp has never been felt. The
   questions: can a human read which axis to fold along while a line is lit,
   is `aim` long enough to rotate first, does the trial's beat of grace read
   as mercy or as being let off — and above all, **phase 3 against phase 4**:
   one smarter opponent or two ordinary ones. They are laid out consecutively
   on purpose so the comparison can be made in a single fight. Whichever wins
   should probably become the shape of the last phase, and the loser can go.
1. **More gentle levels.** The real gap the curve exposes: after the tutorial
   there is nothing between 16 and 31. The composer can make them, but not
   crate or key levels, and its 59% hit rate means hand-checking a batch. This
   is the highest-value content work left.
2. **A crate trial**, per the limitation above.
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
- **One job per session where possible.** Unrelated work in one pass re-reads
  the same files several times over.
- **Edit files with the editing tools, not by patching them from a shell.**
  Out-of-band writes make the whole file reappear in context each time.
- **Put post-mortems in `docs/HISTORY.md`, not here.** This file is loaded
  every session; it should hold what is true now. The reasoning behind a
  decision belongs in the history unless you need it to avoid breaking
  something today.
