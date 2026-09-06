# Trials — an ordinary level on a clock, three times over

> Moved out of `CLAUDE.md`, verbatim. `CLAUDE.md` keeps the one-line
> invariants; this file keeps the reasoning behind them. Read it before
> *redesigning* the thing it describes, not before editing it.
> `docs/HISTORY.md` has what was tried and dropped.

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
- **Fire and the sweep axis are coupled, and the coupling is what
  `trialSafety()` catches.** `TRIAL II` keeps one `x` slice among two `z`
  ones so both fold axes spend part of the cycle lethal — every crossing
  there is a fold, so that is the whole tension. The trap is authoring the
  fire *against* a slice: a fire pair placed on both ends of the landing lane
  leaves the square between them with no step out of the beat that owns it,
  and `trialSafety()` rejects it. Measured twice while rebuilding this level.
  Fire that poisons **one** end of a lane forbids a crossing without cornering
  anybody; fire on both ends corners the middle.

- **`TRIAL II` IS THREE ISLANDS AND NOTHING JOINS THEM BUT A FOLD.** It used
  to be two islands and a pair of bridge blocks out at `z=9`, which closed the
  gap in the *x* silhouette — so all three legs walked across in the opening
  view and the turn buttons were never touched. Measured: every leg solvable
  with rotation locked out, on the level that sits in the middle of a section
  and is supposed to be its hardest question. Now each pair of islands is
  offset in **one** axis only, so it already shares a silhouette column along
  the other: `A`(x0..3,z0..2) and `B`(x6..9,z0..2) share their z's, `B` and
  `C`(x6..9,z6..8) share their x's, and `A` and `C` share neither, so the
  middle island cannot be skipped. Rule 5 then decides which way each fold
  carries you, so the four crossings are the four views — out on 1, home on 3,
  on on 0, back on 2 — and the solver says every leg is impossible with
  rotation locked out. Legs 13+10+9 with the fire, 11+9+5 without it.

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


## The telegraph was raised

Reported: "make the red indicator more visible so the player understands the
spikes will come down there." It was too quiet, and the reason it was too
quiet is worth keeping: the tiles' opacity is the *countdown*, so it was built
to ramp from almost nothing to full across a beat, and the first half of that
ramp is where "there is a slice at all" has to be legible.

Red at .34 over a lit grass block is a discolouration; the eye files it as a
property of the block. So the ramp keeps its shape and loses its floor — the
tiles now open at .58 and climb to .92, the falling rank opens at .52, and the
slab's outline in the volume comes up from .22 to .40. What is given up is
some of the difference between the start of a beat and its middle, and that
difference was never what the player reads: the rank *falling* already says
how long is left.

The tiles' borders stopped ramping altogether and **breathe** instead
(`trialWarnPulse()`). The fill carries the countdown, so the outline is free
to carry the other half of the sentence — that this is a live warning rather
than a texture on the floor — and a pulse is what peripheral vision catches,
which is where a player on a clock is looking when they are looking anywhere
else. It is deliberately not `perilPulse`: that one is the fold's crush
warning and is stamped inside the block loop, which does not run before
`drawTrial()`.
