# Bosses - a pack of hunters, and one line that belongs to both of you

> Moved out of `CLAUDE.md`, verbatim. `CLAUDE.md` keeps the one-line
> invariants; this file keeps the reasoning behind them. Read it before
> *redesigning* the thing it describes, not before editing it.
> `docs/HISTORY.md` has what was tried and dropped.

## Bosses

**A pack of hunters, and one line that belongs to both of you.**

Hunters walk the volume toward you on a real clock. Touching you costs a life.
There is no gun, no window to wait for, and nothing to farm.

| | |
|---|---|
| **THE LINE** | a hunter that gets onto your row or column **plants**, and the line lights up |
| **THE CHARGE** | at the end of that beat it comes down the line - the whole distance at once, because distance is what this game does not respect |
| **THE FOLD** | fold while it shares your silhouette column and it dies there instead |

**The same line is its attack and yours, and whoever acts first wins it.**
Being lined up is not an opening you wait for; it is a knife-edge you are
already standing on. And which axis you collapse decides *which* line you can
win: a hunter locked onto your row is only in your silhouette column when you
are facing along that row, so the answer to "it is charging me" is often a
rotation first - which costs you the beat you had. That is the fight: the
game's one question, asked while something is running at you.

**The pillars are their cover, not your weapon.** Rule 4 is unchanged and
still applies to you: fold from a column that already holds a block and it
kills you. So a hunter standing in a column with a pillar in it cannot be
folded on, and blocks stop a charge exactly as they stop you. One piece of
geometry, both jobs, opposite signs - which is why `BOSS III - The Search` is
the arena it is. Glass casts nothing, so the columns that *look* blocked are
precisely the ones you can attack from.

This is the fifth boss design. The four that failed, and the two versions of
this one the simulator rejected, are in `docs/HISTORY.md` - **read it before
changing the kill rule**, because the two most obvious alternatives have both
already been built and measured.

### Three phases, because a fight with no arc has only one dial

Every fight runs **three phases**, and clearing what is on the board begins the
next. Each phase changes the question rather than the speed:

| | |
|---|---|
| **1** | one hunter, a **bare floor**, the slowest clock in the fight |
| **2** | **the whole arena rises** - every pillar, spike, pane and crate the fight will ever have |
| **3** | **two** at once, on that same ground |

**There were four.** A third phase put a single `cunning` hunter - one that
refuses lines you could answer - between the arena rising and the pair
arriving. It went because three beats is the arc this fight actually has:
nothing, then the ground, then more of them. A fourth made the middle sag,
and "one smarter versus two ordinary" turned out to be a comparison the
design was interested in rather than the player. **The machinery is
untouched** - `cunning` and `hold` still work in `bossPhases()` and
`bossNext()` - so restoring it is one line of level data, exactly like the
twin.

**All the geometry arrives in phase 2, and nothing is added after.** Two
reasons, both found in playtest. It makes a phase legible: phase 2 is the one
where the *arena* changes and 3 and 4 are the ones where the *opponent* does,
so a player who dies knows which kind of thing beat them - a pillar rising in
a pillar rising in phase 3 read as more of phase 2 and buried the change it was meant to
announce. And it makes 3 and 4 a fair comparison: same board, so the only
variable is one smarter against two ordinary, which is the whole question
those phases exist to ask.

The reasoning is a diagnosis, not a taste. Every dial this fight used to
expose - `step`, `aim`, hunter count, `creep` - moves *execution* difficulty:
how fast you must act once you already know what to do. But the verb set is
three slow buttons and there is no dexterity ceiling to climb, so a faster
clock does not make the player better, it shortens the window for a decision
that takes as long as it takes. Phases move the other axis - how hard it is
to work out what to do at all - which is the axis a puzzle game is good at.
And they make failure legible: you know which phase beat you, and phase one
becomes muscle memory, so the retry is short.

**The comparison that used to live here is settled.** Phases 3 and 4 were two
answers to one question - is a single smarter opponent better than two
ordinary ones? - laid out consecutively so a player could feel both in one
sitting. Played, the answer was that the question belonged to the design
rather than to the player: two ordinary hunters on ground you already
understand is the ending, and the smarter one in front of it made the middle
of the fight sag. Three phases now, and the fourth is recoverable.

- **Every hunter prefers the line you cannot answer.** `bossNext`'s `lineTo`
  callback answers 0 / 1 / 2 - no line, a line, a line the player cannot fold
  on from where they stand - and grade 2 outscores grade 1 (48 over 40). Only
  the *ordering* matters: neighbours differ in distance by at most two, so the
  margin decides ties among adjacent squares and never sends a hunter across
  the arena hunting for one. That bound is the thing to preserve - widen it
  and preferring a line becomes circling, which is design 3 again.
- **This is what stops a stationary player winning.** A hunter that seeks
  *any* line walks into the one silhouette column a player standing still can
  fold on, so never moving beat every arena. Preferring the unanswerable line
  means the answer is a rotation, and a player who will not rotate loses.
- **`cunning` is kept but unused by any level.** A cunning hunter
  additionally declines to plant on a line you could answer - but only `hold`
  times (currently 2), the same patience valve the twin uses and for the same
  reason: an opponent that will not attack from anywhere you can punish stops
  attacking. It never stops *walking*, so it closes on you the whole time it
  is being fussy. Measured, phase 3 produces 18–21 declines against a passive
  player where phase 2 produces none.
- **The player's counter to `cunning` is rotating**, which relabels every line
  at once - so turning stops being a way to aim and becomes the answer. That
  is the fight's own question asked one level up.
- **Rising blocks genuinely edit `L.blocks`** and rebuild `R`, so the pristine
  list is kept in `L.arenaBase` and restored by `bossReset()`. It is captured
  **exactly once**, the first time the level is ever loaded, and never
  overwritten - capturing it again on a later load is the bug that ordering
  avoids, because by then the last attempt's pillars are already up.
- **A pillar rising into an occupied square lifts you onto it** rather than
  burying you (`liftPlayer`). The flat case is the *common* one, not the
  exception: you clear a phase by folding, so the next phase's pillars almost
  always come up while you are in the plane, and there it is `flatPos.y` that
  has to rise, because that is the height `doUnflatten` lands you on.
- **Crates may only arrive in one phase.** Putting them on the board means
  rebuilding the crate list, which snaps any crate you had already shoved back
  to where it started. `bossArena()` has no opinion on this - it is a note,
  not a check.
- **The crush verdict is taken before `bossFoldCrush()` runs.** Clearing a
  phase raises pillars, and asking `R` afterwards asks a world that has grown
  one since you committed - the player is crushed by the reward for the kill
  they just made. This is the twin's old bug in a new place; see below.

### The fight, taught first - SPARRING

**The fight was never explained, and it does not explain itself.** Every other
verb in this game teaches by being pressed: the coach names a control, you
press it, and what happened is the lesson. The kill cannot be taught that way,
because it is a *conjunction* - be on its line, AND be looking down that line,
AND fold, AND do all of it before it does the same to you - and there is no
single press that demonstrates a conjunction. Players reached BOSS I able to
see a thing walking toward them with no account of what they were supposed to
do about it, which is the report this level answers.

So it is said, over the smallest board a real fight fits on.
`SPARRING - One of Them` sits immediately before BOSS I: three by seven, bare,
the tutorials' scale rather than an arena's, with **one hunter that cannot
walk** at the far end and the four rules at the top of the screen as a
**checklist** (`L.primer` - deliberately not the retired *brief*, which was a
card). The player starts one row off its line, and that is the whole of the
level design - it makes the first three lines three separate presses:

| | |
|---|---|
| **1 · align** | one step onto its row |
| **2 · look** | one turn, so that row runs into the screen and you share a silhouette column |
| **3 · GO 2D** | and it is crushed |

**The button answers back.** `doom` is recomputed for every hunter at the foot
of `bossFrame()` whatever else is going on, so the moment the turn lands the
`GO 2D` button goes green - the player is told they have it right by the same
code that tells them in a real fight, before they commit.

**And so does the list, which is why it is a checklist and not a list.** Four
sentences of static text are a card on the wall: read once, then furniture.
Every line is a predicate over `killState()` instead - box one ticks when you
step onto its row, box two when you turn and the two of you share a silhouette
column, box three when you fold - so the player can *find* the rule by moving,
which is how everything else in this game is taught. The words only name what
they are already watching happen. The fourth line has no predicate at all,
because being fast is not a state you are in: it goes red for exactly as long
as the ray is live, and ticks when the fight is won.

**And when it kills you, it says which line you missed - in the middle of the
screen, over the kill cam.** One short sentence: *you didn't turn to face it*,
*you didn't GO 2D in time*, *you walked off the edge*. Not in the list, which
is the wrong place twice over in that second: the player is watching the
replay in the middle of the screen, and four lines is not what anybody reads
having just lost a life. It is `.deathsay`, at the phase note's position and
one layer above the replay chrome, held for as long as the film runs and a
beat after it, and taken down by the next committed move.

**It is read off `primerLast`, the state a frame *before* the hit**, and that
is not an optimisation - the charge stands the hunter on your square before
`bossHurt()` runs, so the live board says you were perfectly aligned at the
moment you died, every single time. `primerMarks()` freezes during the replay
for the same reason: the film writes the recorded pose into live state, so an
unfrozen checklist would tick *face its direction* underneath a line saying
you did not turn.

**THREE VERSIONS, AND THE THIRD IS THE ONE** (`docs/HISTORY.md` has the
whole search). It opened on a **dummy** that could not act at all, which
taught three rules and contradicted the fourth - "be faster than it is" cannot
be shown by something with no clock. Then it was **BOSS I's phase-one hunter
outright**, walking, and that turned the lesson into a fight: a hunter that
closes on you makes the *board* the subject - where to stand, when to run -
and the board is what BOSS I is for.

**So `still:true` is a hunter with its feet taken away, not its teeth.** It
plants a line the moment you share its row or its column, the ray comes down
that row exactly as it does in every fight, and it kills you if you are still
standing there when the beat closes. That is the whole of rule four, and it
can only be learned by losing to it once. `bossFrame()` skips the walk and the
touch check for it and nothing else; everything else sees an ordinary hunter,
the doom pass, the telegraph and the kill cam included.

**What that buys is a danger the player opts into.** The start square is one
row *off* its line, so nothing can happen at all until they choose to step
onto it: the four rules are read in complete safety, and the clock starts when
they say so. `aim` (2200 here) is the real dial - it is the window a first
timer has to turn and fold in - and `step` is now only the beat it re-reads
its line on. Both `bosssim` policies agree about the shape: a player who never
moves is never even shot at, and a duellist clears it in 1.4s.

**`teach:true` turns off two of `bossArena()`'s checks and only two.** A board
like this has no lethal columns (nothing stands on it) and three rows of depth
(nothing to fold through), so the two gates that ask *is this a fight worth
having* both fail it - correctly, and beside the point. Everything structural
is still asked, because those break a lesson exactly as hard as they break a
fight: a spawn inside a block, a spawn the pack cannot walk to you from, a
spawn beside the start square, a start square you cannot fold from. The
simulator is told about `still` for the same reason - playing a walking hunter
against a board authored with a standing one measures a fiction, which is what
`bosssim.js` exists to prevent.

**It is a boss on the map and a tutorial everywhere else.** `mapKind()` still
reads `boss`, so it draws as a violet hexagon next to BOSS I's - a fight, not
a puzzle - but it carries no numeral (`mapNumeral()` gives the ordinal to the
prologue's unnumbered levels, not to landmarks), it earns a tick rather than
stars, it is not scored, and `bossesLeft()` skips it so it cannot stand
between the player and `V · EXTRA`. Money and ads buy progress, never score,
and a lesson gates nothing.

### The twin - retired, and recoverable

`BOSS I` used to be one creature with two mirrored bodies. Playtesting called
it too hard and it was parked; when the campaign went to phases it was
replaced by `BOSS I - The Hunt` - since renamed again to `BOSS I - The
Sighting` - and `LEVEL_RENAMES` carries both.

**All of its code is still live and working** - `makeBoss`'s `twin` branch,
`twinSpawn`, `twinMirror`, `twinAligned`, `bossNext`'s `avoid` path, and the
twin arm of `bossArena` - so restoring it is one level-data paste, which is in
`docs/HISTORY.md` along with what was wrong with it. Two bugs there are worth
not re-introducing anywhere: the crush test must be taken **before** the fold
resolves (the phased fight hit exactly this, and it is why `doFlatten` now
captures both verdicts up front), and the green strike cue has to check for a
pillar in your column as well as a body, or it lights up while telling you to
walk into a wall.

### Details that are load-bearing

- **A HUNTER IS SOLID TO YOUR STEP, and your own move never kills you by
  contact.** Walking into one used to cost a life - the note read "walking
  into one simply costs the same as being walked into" - and played as an
  instant death with nothing in front of it, which is the one thing this
  fight promises not to do. It is refused now, the way a wall is: no life, no
  move spent, `it is in the way`. That is the *only* version of "it does not
  kill me" the fight survives - if you could stand on one you would share its
  silhouette column in every view at once, and every fight in the game would
  be "walk onto it, then fold" for two moves. The old note's objection stands
  and is accepted: a body you cannot pass is a body that can corner you. The
  answer to being cornered is the verb this game is about. Nothing here
  constrains *them* - a hunter still steps onto you and still charges down
  its line, and both still cost a life.
- **A charge needs the same height, not just the same row.** `bossLine()`
  used to check only x and z, so a hunter standing on a pillar had a line on
  a player on the floor below it and charged straight through the block it
  was standing on. Everything else already agreed height mattered -
  `foldKills()` checks it, `hunterTouching()` checks it, and `bosssim` had to
  be told about it before it would stop climbing pillars - so the line was
  the one place the rule was missing.
- **It plants to charge.** While a lock is held it does not walk, so the line
  you are shown is the line that fires - a telegraph that drifts is not a
  telegraph - and its stillness is the tell before the line even brightens.
  Stepping off the line breaks the lock; that is the dodge, and folding is
  the other answer to the same question.
- **The telegraph's ramp reads the *phase's* `aim`, through `bossAim()`.**
  Pacing lives per phase, so there is no `B.aim` to read. It used to read one
  directly, and when that moved the ramp silently became `NaN` - which does
  not throw, it just stops drawing the line, so the charge arrived with no
  warning and was reported, correctly, as being shot from across the arena.
  A telegraph that fails silently is worse than none, because the mechanic it
  is explaining still fires.
- **The charge line is always red, including when you can answer it.** It used
  to turn green whenever the hunter was foldable, and green is this game's
  colour for the goal - for *safe* - so the one drawing whose job is "you are
  about to be hit" said "you are fine" at the moment of maximum danger. It was
  reported, exactly, as not indicating anything. The line says one thing: the
  charge lands along here. The opportunity is said in the two places you are
  already looking - the hunter's own body turns green and swells, and the
  `GO 2D` button turns green and pulses - and being answerable only *adds*
  brightness to the line, so the contested one reads as live rather than as
  harmless. Three cues, one danger reading that never inverts.
- **IT FOLDS THE ROW ONTO YOU, and the telegraph says so.** The charge used
  to be a thin bar that brightened - a perfectly clear warning about a thing
  the player has no name for. It is a **pane standing along the line that
  collapses to nothing as the beat closes**: the fold, done to that row, by
  the other side. Nothing about the rules moved and nothing needed
  re-verifying; it is the same line, the same beat and the same hit, told in
  the one verb the player already owns. It works because the attack was
  already that shape - a hunter on your row *is* a hunter in your silhouette
  column the moment you face along that row, which is why folding answers it.
  **And the pane has a width** (`RAY_W`, `10-render.js`). It was .06 of a
  cell, which is a pane you can only see from the side - and the side is the
  wrong place, because the view that matters is the one looking straight
  *down* the line. That is what being aligned means, it is the view the fold
  is taken from, and edge-on a .06 pane was two pixels of red. So the one
  drawing that says "this row is about to be folded onto you" vanished
  exactly when the player had done the thing it exists to reward. At .46 it
  is a bar end-on and still a plane broadside, because it stays far longer
  than it is wide and still flattens onto the floor as the charge lands.
  The Census was already saying it too: they live in the plane. A hunter that
  can genuinely fold is a sixth design and a different question; see
  `docs/HISTORY.md`.
- **THE REPLAY: the last seconds, played back from the other side.** A charge
  is instant and it comes from across the arena, so the one event a player
  most needs to understand is over before they have looked at it. A still
  camera swung at the moment of the hit says some of it; playing the seconds
  *before* it says all of it - you watch the thing walk onto your row, plant,
  and then do to you the one move you could have made first. On a **death**
  it follows the hunter that hit you, from the view in which its line runs
  across the screen, and ends by folding the world onto you. On a **kill** it
  only runs on the fold that CLEARS a phase - killing one of a pair ends
  nothing, and a film there would interrupt a fight that is still going -
  **including the kill that wins the fight**, which the first version skipped
  because `bossAdvance()` goes straight to `win()` there and the card cut off
  the film the moment it was earned.
- **And the last death gets one, which was skipped for the same reason.**
  That path goes straight to `die("boss")`, and `die()` takes the board away
  820ms later. It is the worst one to skip: the run has just ended and the
  player is about to fight the whole thing again, which is exactly when they
  want to know what happened. `bossPendingDeath` holds the reset behind the
  film, the way `bossPendingAdvance` holds a phase clear - and it is checked
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
  separate things on screen - which is exactly the question the replay
  exists to answer. So it is the view whose depth axis is the charge
  direction **reversed**: `AX[v].d` points at the camera, so matching it to
  where the charge came *from* puts the hunter at the front and you behind
  it - you are looking over the thing that killed you, down the line it took,
  at yourself at the far end. Then the fold closes that depth and the two of
  you land in one square, which is the kill. The 180 is the owner's call and
  the right one: the film belongs to the other side, so the other side is
  what the camera is behind. Turned to by the shortest way round.
- **THE 180 IS PRESENTATION, NOT A RULE, and it is worth knowing which.** The
  fold collapses the depth axis, so a hunter sharing your silhouette column
  dies whether it is in front of you or behind you - the kill is symmetrical
  and always was, and nothing about which way the camera faces changes what
  happens. It is kept because it reads better: the film belongs to the other
  side, so the other side is what the camera sits behind. Do not derive a
  mechanic from it.
- **The replay's `view` is the camera's, and the silhouette is recomputed to
  match.** The renderer derives every position from `viewAngle`, so the
  picture was already right - but `flatPos.u` is a coordinate in whichever
  view it was measured in, and a death replay deliberately swings a right
  angle away from that. Left alone, a player who was flat during the filmed
  seconds is drawn in the wrong column, in the film whose whole subject is
  which column you share. `player.x/z` are untouched by folding, so the
  square is always there to re-project from.
- **A replay has to look like one.** It runs slower than life
  (`REP_RATE` .55), and it wears the three things film has used to say *this
  is footage* since before games existed: bars top and bottom, a wash over
  the world, and a label. Without them it was reported, fairly, as the game
  behaving oddly. The wash is a flat overlay and not a filter on the canvas -
  a filter on a full-screen WebGL canvas repaints every frame, on a phone, at
  the most expensive moment in the game. The HUD and the control bar dim with
  it, because they are inert and should look it.
- **No shield bubble in the film.** It is a recording of a moment when there
  was no shield, and a bubble round a recorded pose says the player was
  protected in a second they very much were not.
- **The film always plays in the volume, whatever was recorded.** A death
  taken while flat used to replay flat - the world was already collapsed, so
  there was no depth to look down and no fold left to close, and the one
  thing the film exists to show had happened before it started.
- **Standing a flat pose up means RE-DERIVING the square, not reading it.**
  `player.x/z` is the square you folded *from* and it does not move while you
  are flat: walking in the plane changes `flatPos.u` and nothing else. So a
  player who folded and took three steps replayed standing back where they
  had left, never arriving anywhere near the thing that killed them - in the
  film whose entire subject is that the two of you ended up in one place.
  What a plane pose means in the volume is the square you would have come
  back to, so it is `R.landings()`/`R.pick()` on the recorded column, the
  same pair `GO 3D` itself calls. That square is in the silhouette column the
  hunter shares, which is what the kill *is*, so they line up by
  construction - and a plane step then reads as a sideways step in the
  volume, which is what it was.
- **A kill puts YOU nearest the camera, and the fix for that was the mark
  rather than the angle.** A kill was replaying from the victim's side, and
  the cause was the last recorded frame: taken up to 50ms before the fold, it
  held the player *standing* at their real square rather than flat - and a
  standing player is at their own depth, which is behind the victim as often
  as not. `replayMark()` in `bossFoldCrush` now takes the frame after `flat`
  is set and before the splice, so the film ends with the player flat and the
  victim still on the board, and `replayPose()` stands them up on the
  front-most block of their column. The camera's own kill-side swing is then
  nearly always a no-op - the victim shares the column at the player's height,
  so the block under it is one of their landing candidates and `R.pick()`
  takes the nearest. It is kept for the one case that breaks that: `pick()`
  prefers amber over nearest, so an anchor in that column can land the player
  *behind* the thing they just killed.
- **The last frame has to be the kill itself.** Sampling at 20Hz means the
  newest frame can be 50ms stale, and 50ms is exactly the window in which a
  charge crosses the arena and lands - so the film ended a moment *before*
  the two of them met. Worse, the pack goes back to its spawns and the player
  is sent home before the replay starts, so by then the kill pose is gone
  entirely. `replayMark()` takes it on the first line of `bossHurt`, before
  anything moves.
- **MOST DEATHS ARRIVE WITH NO LINE AT ALL, and that is what kept the camera
  broken through three fixes.** Two of `bossHurt`'s three callers pass none
  - *it closed on you*, *it reached you* - and only the charge passes one.
  (There were four: *you walked into it* went when hunters became solid to
  your step.) **A flat kill is always one of the three**: waiting in
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
  silhouette column, which means differing **only in depth** - so the
  direction is the current view's own depth axis, signed from the hunter
  toward you. Without that the flat deaths got no swing and played from
  whatever angle the player happened to be facing, which is the one angle
  that cannot show what happened.
- **THE FILM IS TOLD THE MOMENT, BECAUSE THE BOARD HAS ALREADY LEFT IT.**
  Everything in `bossHurt` after the hit moves off the kill: the pack is
  thrown back to its spawns, so the hunter object the replay was handed is
  standing somewhere else by the time it starts; and `bossSendHome()` resets
  `flat`, `flatPos` and `view` to the opening pose. So the camera worked out
  which way round to film from a board that no longer described the kill -
  which on a flat death is *every* input it has, and it showed as the thing
  that killed you being behind you. Reported twice from screenshots. Fixed by
  copying rather than reordering: the reset has to happen before the film, so
  the player is put back somewhere known, and the film has to be handed the
  moment. `at` is that copy, taken beside `replayMark()`.
- **And the sign is measured from the square the film DRAWS you at, not
  from `player.x/z`.** While flat those are the square you folded *from*,
  which is wherever you happened to start and sits on either side of the
  hunter about half the time - so the direction came out backwards half the
  time and the film put the thing that killed you behind you. The position
  the camera has to reason about is the one `replayPose()` uses: `R.pick()`
  on the player's own column in the **recorded** view. Because the block the
  hunter stands on is always one of those candidates - a hunter only has a
  line on a flat player at the player's own height - the drawn player is
  always at or in front of it, so a flat death always ends up a half turn
  round. The arithmetic is kept rather than folded into a constant, because
  it is the arithmetic that explains why.
- **It records state, not inputs, and that is a decision rather than a
  shortcut.** The two families are re-simulation from recorded inputs plus a
  seed, and a ring of state snapshots. The first is tiny and needs exact
  determinism, which this fight does not have and cannot cheaply be given -
  the pack advances on wall-clock `dt`, so a frame arriving 3ms late moves
  everything and the replay would drift from what the player actually saw.
  The second costs memory, and here that argument is not close: the world is
  a handful of integer cells, so six seconds at **20Hz** is 120 frames of
  about a dozen numbers. 20Hz is not a tuned number - everything moves in
  whole cells on beats of 600ms and up, so a sample every 50ms catches every
  position the game was ever in and there is nothing to interpolate.
- **Playback writes the recorded pose into the live state**, and that is safe
  precisely because nothing is running: `bossHolding()` refuses all four
  verbs and `bossFrame` returns. Every drawing path - the fold, the telegraph
  pane, the depth fade, the peril tint - then works on the film exactly as it
  works on the fight, for no extra code. The live state is saved at the start
  and put back at the end.
- **A phase clear WAITS for its replay** (`bossPendingAdvance`). Advancing
  first would leave `replayEnd()` restoring a board that had already moved on
  - the same class of bug as the twin's respawn and the phase-2 crush.
- **The restore is unconditional, and the first version's was not.** It
  guarded on the cam still running while the caller had stopped it a line
  earlier, so `viewAngleTarget` kept the 90° the swing had added and `view`
  did not - and from then on the arrows moved the player at a right angle to
  the screen. Reported exactly as up/down/left/right getting stuck after a
  kill. **A camera that borrows a state value has to give it back on every
  path out.**
- **The camera follows its subject, and only here.** `FOLLOW` is off in play
  because the bigger world put hunter spawns outside the frustum; during a
  replay nothing is being played, so following is free - and it is what makes
  the film read as somebody's point of view rather than as the same board
  with different things on it. It leans rather than locks (35% back toward
  the arena centre) and zooms in a little, both clamped to the arena.
- **Slow motion on the two moments the fight is decided.** A kill and a hit
  are both instant, and both happen on a beat the player is already reacting
  to, so the thing they most need to see - which column it was, which line it
  came down - is over before they have looked at it. `slowMo()` runs the
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
  reverses an earlier call, on the owner's say. The old argument stands - it
  costs the position you spent twenty seconds building, on top of the life -
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
  no queue to farm - phase 4's two hunters walk at you once and only return to
  their spawns if they hit you - so killing the first of them moves nobody.
  Taking back ground you earned would charge you for playing well, which is
  precisely what a hit is careful not to do.
- **A phase boundary is a held breath, not a cut.** `bossPause`
  (`BOSS_PAUSE`, 1900ms) stops the fight between phases: nothing walks,
  nothing lands, and none of the four verbs answers. The order matters and is
  the order a player can follow - **reset first, geometry second**. They are
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
  kill by folding, so a boss is nearly always beaten from inside the plane -
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
  preference - see below.
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
  the reasoning is written up there - `bossGraceMs` only ever stopped hunters
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
  map - but the map is separating one landmark from another in a list, and
  the HUD is separating you from the thing in front of you, which is a
  different job. The map keeps violet.
- **THE BAR IS CENTRED IN THE GAP BETWEEN THE CORNERS, NOT ON THE VIEWPORT**,
  and that is a bug fix rather than a preference. `left:50%` plus a translate
  is only safe while the screen is wide enough that the middle happens to be
  free, and it is not on a small phone: measured at 327 CSS px - a 900px
  screen at DPR 2.75, which is what the owner plays on - the bar landed at
  139..189 while the star total, which grows *leftwards* as the number gets
  longer, reached back to 172 and covered the last core. So a trial with one
  core already taken drew a row that still read as three. Reported with a
  screenshot. `.boss` is the full-width lane now, padded by the two corner
  clusters, with `.bstack` centred inside it.
- **The star total is hidden while a clock is running.** It cannot change
  during a fight - the move label already refuses to show stars here for
  exactly that reason - so it was a third scoreboard saying nothing, and it
  was the thing covering the cores. `levelDone` brings it back, because that
  is the moment it is news and the moment the win card's stars have to fly to
  it, which is why `win()` calls `syncHud()` on its first line.
- **A spent core shrinks as well as dimming.** Three bars of one length with
  a dim one among them is a row of three at a glance; the lives row above has
  always said it twice, with colour *and* scale, and this row said it once.
- Scored on lives, three stars for three intact. `progress[name]` holds lives
  for a boss or a trial and a move count for everything else - opposite
  senses in one slot - so reads go through `starsForRecord()`, writes through
  `betterRecord()`, and both ask `onTheClock()`.
- **Undo does not touch a fight at all.** It cannot: there is no tick to step
  back to, and rewinding a kill while they kept walking would produce a state
  that never happened.

### Verification

`solve()` knows nothing about bosses and must not: none of this is a function
of a move sequence. Two checks stand in.

- **`bossArena()`** - the stage works: every hunter can reach you, none spawns
  inside a block or in another's column, and enough of the floor is under a
  pillar's shadow to make position matter without leaving nowhere to fight
  from. **Every phase is checked as its own board**, because pillars that rise
  later can seal a spawn off or hand the pack a free kill exactly as authored
  ones can. The one check not applied per phase is the *lower* bound on lethal
  columns: an opening phase with a bare floor has none by design, and that is
  what it is for, so only the finished arena is asked for somewhere to fight.
  **A `teach:true` arena is exempt from that bound and from the depth count**,
  and from nothing else - see SPARRING above.
- **`tools/bosssim.js`**, run by `verify.js` - it plays each fight twice, all
  the way through its phases, raising each phase's blocks as it reaches them.
  An IDLE policy that never moves and takes every free kill must **lose**; a
  DUELLIST that lines up, turns to re-aim and folds must **win**. Neither is
  a good player - the duellist never *herds*, which is the actual skill - so
  a fight it wins is winnable by doing considerably less than the design asks.
- **The simulator cannot see whether `cunning` is interesting**, only that it
  is survivable. The duellist ends a phase in about five moves, so the phase-3
  hunter rarely lives long enough to plant at all - measured: zero declines in
  a full run, and 18–21 when the same phase is played against a passive
  policy. That the mechanic *fires* is checked; whether it is fun is a
  playtest, per the working agreement.

**Both of these are optional when the owner is playtesting a fight** - see
Working notes. They are worth running when the *rules* change; they are not
worth running to tune a number the owner is about to feel out anyway.

---

---


## The last fight sweeps

`BOSS IV - The Census` is the only fight where the arena attacks as well as the
pack. Each of its phases carries a `sweep` - `{period,fire,beats}`, the trial's
own data shape - and the plane tightens as the phases rise: two slices at a
walk, then four, then five and faster.

**This is not the boss design that was dropped.** Designs 1 and 2 in
`docs/HISTORY.md` were the sweep *instead of* an opponent, and what killed them
was that an objective on a clock is not a fight. There is still a pack here.
The sweep is the floor being taken away from underneath it.

**Why it belongs on this fight and not as a harder version of any of them.**
Your only weapon is the fold, and a sweep down the axis you are *looking along*
cannot be dodged in the plane at all - flattened, you are every depth at once,
so you stand in every slice of that axis simultaneously. So the sweep taxes the
one verb the fight is about. Lining up a kill now means asking which axis,
whether this is the moment, and whether the plane you are about to step into is
the one that is charging. That is every question this game has, asked at once,
in the last fight. No pillar and no hunter can do that, because they are
obstacles in the volume and the fold is the thing that leaves the volume.

**What it does and does not touch.** The sweep is the arena's, not the pack's:
it does not kill hunters. It spends a life like any other hit, the shield
covers it (`shielded()` is still the single predicate), and it is stopped by
everything that stops the fight - the phase card, the kill cam, and the grace
beat after a phase change or a hit. That last one matters: `bossGraceMs` is the
beat you are *given*, and a slice landing inside it would spend it for you.

**How it is wired.** `bossPhases()` carries `sweep` through; `bossEnterPhase()`
builds it with `makeSweep()` and assigns it to `TR`, restarting the sweep clock
so the new pattern opens on its first beat. Everything downstream - the hit
test, the charge ramp the renderer draws, the red `GO 2D` cue - already read
`TR` and do not care which kind of level armed it. The consequences of that are
in `CLAUDE.md`, and the one that bites is that **`TR` now means "a sweep is
running", not "this is a trial"**: `B` is what names a death and what decides
which frame ticks the shared windows.

**What is proved and what is played.** `bossSafety()` was a no-op and is real
again: it holds every sweeping phase to the trial's own fairness property - for
every square you can stand on and every beat, either that square is safe or a
square one step away is, and the start square is never inside a phase's *first*
beat, because a phase change puts you back on it. `bosssim` knows about the
sweep too, for the reason it knows about `still:true`: without it the duelling
run would be claiming a fight is winnable while walking its line straight
through a live slice. Neither says whether the fight is *good* at this pace -
the periods and the slice positions are numbers to feel out, per the working
agreement, not numbers to tune against the simulator.


---

## The telegraph arrives earlier because it lasts longer

Reported from playtesting as two things - "the ray needs to pop up earlier"
and "give more time to react" - which are one beat. The line is drawn for the
whole of `aim` and there is no delay in front of it to cut: a hunter plants
and the pane is there on the same frame. So a longer `aim` IS an earlier
warning, and `AIM_EASE` (1.4, `js/03-rules.js`) is that, applied across every
phase at once.

**A multiplier rather than 22 edited numbers**, because the curve those
numbers draw is right. SPARRING plants for 2200ms and BOSS IV's last phase for
660; that spread is the campaign's whole difficulty ramp for this fight, and
hand-raising each one would have rewritten it by accident. The multiplier
keeps every ratio and moves the floor.

**Baked into the phase in `bossPhases()`, not applied where the lock is set.**
`tools/bosssim.js` re-implements the fight from `03-rules.js` and never loads
the game's state, so an ease applied in `12-play.js` would have left the
simulator proving a fight nobody plays - the same trap `still:true` was taught
to it to avoid. Downstream, `h.lock` is set from `bossAim()` rather than from
`ph.aim` directly, so the clock the hunter waits out and the clock the
renderer ramps the pane over are one number by construction.

**And the other half was opacity, not time.** The pane opened at .28 and
climbed on `t²`, so for the first third of the beat it was under the
threshold at which a red plane reads as red against a lit arena floor - the
warning was up and could not be seen, which is indistinguishable from a
warning that came late. It opens at .46 now with the rim at .68. The ramp
stays, because the ramp is the countdown; it simply no longer begins below
the point where the drawing does its job.
