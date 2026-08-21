# Orthogonal — design history

Every version of a mechanic that was tried and dropped, and what it cost to
find out. `CLAUDE.md` is the memory of how the game works *now*; this is the
memory of how it got there.

**Read this before redesigning something.** Most of what is here looked
correct on paper, and several of these ideas will look attractive again the
next time the same problem comes round. Nothing in this file is a rule you
have to follow — it is a record of what has already been paid for.

---

## The boss: five designs

The current fight — a pack of hunters, a charge down a shared line, killed by
folding while one shares your silhouette column — is the fifth. The four
before it, in order:

**1. Turn-based, walk to a marker.** Every action you took advanced the boss
exactly one tick, and a lethal plane swept one slice of the arena. This had a
large advantage nothing since has matched: `solve()` could prune hit states,
so "solvable" and "fair" were one question and a clean run could be *proved*
to exist. It did not feel like a fight. The clock that never runs while you
think turns a boss into a puzzle with a scary skin.

**2. Real-time, walk to a marker.** The same sweep, on the wall clock. Much
better pressure, and it cost the proof — a search over moves cannot say
anything about a clock that advances while you think. Still an objective
wearing a boss costume: there was nothing to fight, only somewhere to be.
*This design is not dead. It is the trial now, where being an objective on a
clock is exactly the right thing to be.*

**3. Crush it on a static line.** A real attack at last, but the
vulnerability was a property of the *floor* — stand in the right place, wait,
fold — so the fight became manipulating the floor rather than the opponent.
Making the boss avoid the lethal lines only taught it to freeze, which reads
as broken, and produced a new two-button loop instead of removing the old one.

**4. A gun, an AIM telegraph, and an OPEN beat after each shot.** Fair,
machine-checkable, and genuinely a duel. It read as a duel with a machine
that spent most of the fight walking into position: the opening was something
you waited for rather than something you made, and one opponent shuffling for
a firing angle cannot be fast. The owner's word for it was "weird", which is
the right word — correct, and inert.

**The lesson, paid for four times: a vulnerability that does not come out of
the boss's own behaviour is a condition to farm.** In the fifth design the
kill and the attack are the same event on the same square, so there is no
opening to wait for and none to decline — declining is what being hit is.

### What the simulator found, which nothing else would have

The fifth design itself took three passes. `tools/bosssim.js` rejected the
first two before a human ever saw them, and each failure looked fine on paper:

- **Crush them against the pillars** — fold, and anything standing in any
  filled silhouette column dies. A prettier rule, and it does not work: a
  pillar's shadow is a whole *line* across the arena, so every approach has
  to cross one, and a player who never moves simply collects them as they
  arrive. The idle policy won all four arenas standing in a corner. Making
  the kill require *your* column is what put the player back in the fight —
  the one thing you cannot harvest from a corner is alignment you did not go
  and get.
- **Hunters that dodge your fold.** Two ways to get this wrong, both
  measured. Weight avoidance heavily and they circle forever rather than
  cross a line: against a player standing where every approach was covered,
  both sides stopped dead — design 3's freeze in a new costume, found in one
  run at three lives, no kills, nobody within reach of anybody. Weight it as
  a tie-break instead and they stroll into a shadow on the way to a player
  who never moved. In the end they stopped dodging altogether, because once
  the charge existed the square they want and the square that can kill them
  are the same square.
- **Kills that were too cheap.** Anything adjacent to you shares a line with
  you, so every arrival was a free kill and a perfect player cleared every
  arena in under five seconds. The charge is what made a line cost something
  to stand on.
- **Spawns that shared a column.** Two hunters whose spawn cells shared an x
  or a z crush each other for free the first time anyone folds — and they
  respawn together after every hit, so it was a standing gift, renewed.
  Found by the idle policy winning a fight without taking a step.
  `bossArena()` now rejects it.

### Phases: the sixth change, and the first that was not a redesign

The fifth design survived. What changed in the end was not the fight but its
*shape*, and the argument is worth keeping because it applies to anything
real-time this game ever grows.

Every dial the fight exposed — `step`, `aim`, hunter count, `creep` — moves
execution difficulty: how fast you must act once you already know what to do.
Orthogonal's verb set is three slow buttons. There is no dexterity ceiling to
climb toward, so tightening the clock does not make a player better; it
shortens the window for a decision that takes as long as it takes. Every
"is this too hard or too easy" question ran into that wall, and the honest
answer — recorded in this file's own limitations for a long time — was that
nobody knew, because the only available knob was the wrong one.

The fights also had no arc. Three hunters, three kills, all the same kill;
`rage` and `creep` escalated the numbers but not the question. A fight with no
arc can only be tuned globally, which is exactly why it could not be tuned.

So: four phases, and clearing the board begins the next. One hunter on a bare
floor; pillars rising so rule 4 starts biting; a `cunning` hunter that will
not take a line you can answer; then two at once. The difficulty now lives in
what changes, which is a design decision that can be reasoned about, rather
than in `aim: 620`, which never could be.

Three things were found building it, none of which a static check would have
caught:

- **The crush verdict has to be taken before the fold resolves.** Clearing a
  phase raises that phase's pillars, so asking `R` afterwards asks a world
  that has grown one since the player committed — and the player is crushed
  by the reward for the kill they just made. This is *precisely* the twin's
  old respawn bug, in a new place, found only because it had already been
  written down. Which is the argument for this file.
- **A phase is nearly always cleared from inside the plane**, because folding
  is how you kill. So "a pillar rising into an occupied square" is the common
  case, not an edge case, and what has to rise with it is `flatPos.y` — the
  height `doUnflatten` will land you at — rather than `player.y`.
- **`bosssim`'s duellist climbs.** Given a pillar between it and a hunter it
  walks up onto it and then oscillates on and off forever, one storey above
  anything `foldKills` could reach, because its move scoring had no term for
  height. It read as two unwinnable arenas. The fix is a fact about the rules
  rather than a heuristic — a square at the wrong `y` cannot be attacked from
  at all — but the near-miss is the point: an arena was one edit away from
  being redesigned to satisfy a broken instrument.

**The first playtest of the phased fights found three things, and only one of
them was a matter of taste.**

- **"It shoots me."** The charge is telegraphed by a line drawn along the row,
  ramping in opacity as the beat closes — except the ramp divided by `B.aim`,
  and `aim` had just moved onto the phase. `Math.max(1, undefined)` is `NaN`,
  a `NaN` opacity does not throw, and the line simply stopped being drawn. So
  the charge really did arrive out of nowhere. Worth stating as a rule: a
  telegraph that fails silently is worse than no telegraph, because the thing
  it explains keeps happening and the player learns the fight is unfair.
- **And when the line *was* drawn, it lied.** It turned green whenever the
  hunter was foldable — meaning "this line is yours", which is a lovely idea
  and the wrong drawing to put it on. Green is the goal colour, so the
  telegraph announced *safe* at the exact instant the danger peaked, and the
  second report was that a green line did not seem to indicate anything. The
  general rule, paid for twice in one session: a telegraph may vary in
  intensity but must never vary in *meaning*. The opportunity was already
  being said by the hunter's body and the `GO 2D` button; the line only ever
  had one job.
- **A pillar rising in phase 3 buried phase 3.** The phase whose job was to
  announce "the opponent has changed" also changed the arena, so it read as
  more of phase 2. All geometry now arrives in phase 2. This also made phases
  3 and 4 a controlled comparison for the first time — same board, one smarter
  against two ordinary — which is the entire reason both exist.
- **The spawn was campable.** Stand beside it, fold as each arrival appears,
  and the fight is a queue. Clearing a phase now returns the player to the
  start square — a phase boundary and not a kill, because the queue being
  farmed was the one *between* phases, where each new hunter arrives on the
  same cell. Inside a phase there is nothing to farm, so killing one of phase
  4's two moves nobody; taking that ground back would charge the player for
  playing well, which is the thing a hit is careful not to do. Two things fell
  out of the rule immediately: it must move you and do
  *nothing else* — an early version also stood you up and gave grace, and
  since being flat is what a fold costs, that made folding free and the idle
  policy won all four arenas without being hit once — and a spawn near the
  start square stopped being decoration and became a scheduled free hit, since
  the start is now where the player keeps reappearing. Every second spawn in
  the game was 2–3 squares from it. `bossArena()` now requires 5.

### Standing up on a phase clear, and what it cost

The second playtest asked for something small: on a death or a phase clear,
come back to 3D and to the starting rotation, not just the starting square.
Arriving at a new phase still folded, facing an axis chosen for the last one,
means reading a board that changed while you were not looking at it straight
on. Obviously right, and it pulled a thread that ran through the whole fight.

**Being flat after a kill was the anti-camp mechanism, and nobody knew.** The
send-home rule had deliberately left the player in the plane, on the argument
that exposure is what a fold costs. Standing them up instead made `bosssim`'s
idle policy — which never takes a step — go from dying in phase 2 to winning
all four arenas without being hit once. The measurement was unambiguous and
the cause was not the exposure at all: staying flat meant the *unfold* chose
where you landed by the nearest-camera rule, so a stationary player never got
to keep one perfect square. Standing them up on the start square handed it
back to them permanently.

Two more failures surfaced underneath it, both invisible until the player was
returned to a *fixed* square facing a *fixed* view:

- **A spawn on the start square's row is a free charge, every phase.** All
  four second spawns shared a row with the start. Previously the player was
  somewhere unpredictable when a phase began, so it never showed.
- **The start square could be unfoldable in the view you arrive facing.** In
  `BOSS II` a pillar sat in the start's z-column, so a hunter approaching down
  that row could not be answered from the square the game keeps putting you
  on. `bossArena()` now checks the row/column rule and that the start is
  foldable in at least one view.

**The fix for the camp was to make every hunter prefer the line you cannot
answer**, not just the cunning one. A hunter that seeks *any* line walks into
the single silhouette column a stationary player can fold on, which is why
standing still won: half of its line-seeking was suicide. Preferring the
unanswerable line means the answer is a rotation, and a policy that never
rotates loses. `cunning` keeps its identity as the *refusal to plant* on a
line you could answer — measured at 18–21 declines in phase 3 against a
passive player, and none in phase 2.

This is a real erosion of the fifth design's cleanest sentence, "the square it
wants and the square that can kill it are the same square", and it is worth
knowing that it was paid knowingly. The failure that sentence was guarding
against was hunters *circling* rather than attacking, and the margin here is
deliberately too small to cause that: neighbours differ in distance by at most
two, so 48 against 40 only breaks ties between adjacent squares and can never
send a hunter across the arena looking for an angle.

The simulator can say the phased fights are survivable and it cannot say
whether `cunning` is interesting: the duellist ends a phase in about five
moves, so the phase-3 hunter rarely lives long enough to plant. Measured, a
full duellist run produces zero declines; the same phase against a passive
policy produces 18–21. That the mechanic fires is checked. Whether it is worth
having is a playtest, which is the agreement.

### The twin, retired — and how to bring it back

`BOSS I` was the twin: one creature with two bodies, each hunting your
reflection through a centre, killed by folding while the halves shared a
silhouette column. Playtesting called it too hard and it was parked. The
diagnosis, made when the phases went in, is that it was never too *fast* — it
asks you to compose three transformations in your head (reflect through a
centre, project along the current axis, remember the centre moved) under a
clock. Lowering `step` from 640 would not have touched that. If it comes back,
it should be one phase of something else, not a whole fight: the reflection is
a lovely flourish and a punishing steady state.

All of its code is still live and exercised — `makeBoss`'s `twin` branch,
`twinSpawn`, `twinMirror`, `twinAligned`, `bossNext`'s `avoid` path, and the
twin arm of `bossArena`. Only the level data went. It was:

```js
{name:"BOSS I — The Twin",
   hint:"One creature, two bodies, mirrored through the amber cross. Bait a half onto the bright arm, step off it yourself, and fold — they land in the same square.",
   boss:{twin:true,step:640,floorStep:340,creepEvery:7000,
         cores:[{c:[4,1,3],a:[7,1,1]},
                {c:[3,1,4],a:[6,1,6]},
                {c:[5,1,2],a:[8,1,4]}]},
   blocks:(function(){var b=[];box(0,8,0,0,0,6,b);
     b.push([2,1,1]);b.push([6,1,5]);b.push([6,1,1]);b.push([2,1,5]);
     return b;})(),
   start:[1,1,3]},
```

Its pillars were kept: they are what rises in phase 2 of `BOSS I — The Hunt`,
because a symmetric arrangement is the honest one to teach on — no corner is
quietly better than another. Restoring the twin means pasting the block back
and adding a `LEVEL_RENAMES` row; **do not delete the rows already there**,
and remember `migrateNames()` does not chase chains, so every row pointing at
the old current name has to be re-pointed too.

**`tools/bossgen.js` and `tools/bosses.json` are deleted.** The generator
searched for arenas for the walk-to-a-marker boss and emitted a boss format
the game no longer understands. The four arenas are authored by hand in
`js/02-levels.js` and checked by `bossArena()` and `bosssim`.

---

## The trial

Design 2 above, put where it belongs. The argument that killed it as a boss —
an objective wearing a boss costume is not a fight — says nothing against the
sweep itself, and as a change of pace four or five levels into a section it
is exactly right.

Two things were got wrong on the way in and corrected after one playtest:

- **A hit used to reset the clock and send you back to the start.** That is
  what a boss does, and on a trial it was wrong twice over: the clock *is*
  the level, so resetting it threw away the rhythm the player had just
  learned, and being returned to a safe square meant the next two slices
  landed nowhere near them. The arena appeared to switch itself off for four
  seconds every time it touched you, which is exactly how it was reported.
- **The charge ramp opened each beat at 7% opacity**, which against the void
  is invisible, so the slice seemed to arrive from nowhere halfway through
  its beat. A telegraph's whole bargain is being told *early*; the ramp is
  for how long you have left, not for whether there is a slice at all.

The first four trial arenas were also thrown out by `solve()` before anyone
played them: they fell in three or four moves flat, because the far platform
shared a row of z with the start and one turn plus one fold reached it.
Offsetting the far side in *both* axes is what makes the crossing real.

---

## Levels: the cuts and the renumbering

**The campaign went from 62 scored levels to 34, and nothing was deleted**
except one. Anchors and amber are shelved whole in the EXTRA section, so
turning them back on is a data move rather than a rebuild. The judgement was
that 40 good levels beat 60 that repeat themselves.

The exception is `01 — Fill the gap`, which is gone for good. Its solution
was `→ → FLAT → → → → POP` against the tutorial's `→ FLAT → → → POP` — the
same verbs in the same order, rotation locked in both, from the same square.
It was the tutorial with a wider gap. **When a level duplicates a tutorial
step, the tutorial wins**, because the tutorial is unscored and teaching a
thing twice costs a player their first impression of the campaign.

**The `LEVEL_RENAMES` incident.** Levels have been renumbered three times and
progress is keyed by name, so the table is what stops every solved level
reading unsolved. One reshuffle regenerated it from scratch, which silently
broke the oldest saves: names from the original numbering stopped resolving,
because the new map only knew the *previous* names. The fix was to recover
the lost map from git and compose the chains, so an original name still
lands on the current one in a single lookup. Verified by loading a save
written in the original numbering and watching every star survive. **Compose
that table, never rewrite it.**

**The fourth renumbering, and what made it cheap.** Section I gained four
levels at its head, which pushed every number in the game and needed 61 new
rename entries on top of the 152 already there. That was done by a script,
and the script is the interesting part: it composed the table rather than
regenerating it — every existing key kept its key and had its *value*
re-pointed — and then refused to write unless two invariants held. No key
dropped, and no value also a key pointing somewhere else. The second one
matters because `migrateNames()` makes a single pass in enumeration order: a
chain `A → B` alongside `B → C` half-applies depending on which it happens to
reach first, and the failure is silent and only visible to a player with an
old save.

It caught something on the first run. Three levels — `The Last Step`, `Turn
Twice More`, `The Last Placement` — came back round to a number they had worn
in an *earlier* numbering, so an old key ended up mapping to itself. That is
harmless (`migrateNames` skips `old===now`, and a save under that name is
already correct) but it is indistinguishable from a real chain if you only
check "is this value also a key". Worth knowing the next time, because it will
happen again: numbers are a small space and this campaign keeps reshuffling.

---

## The opening was a cliff, and the curve said so

For a long time the first thing after the tutorial scored 21 and the third
scored 33. A new player was in `brutal` by their fourth level, in the section
whose whole job is teaching — while sections II, III and IV each opened with
two or three gentle ones. Nobody designed that; it is what happens when levels
are cut and reshuffled and the front of the campaign is the part you stop
looking at because you have solved it a hundred times.

`node tools/curve.js` had been printing it all along. The lesson is not
"write easier levels", it is that **difficulty is measurable here and the
measurement was not being read.** The solver gives an exact optimal path for
every level; the tier is a formula over it. A step of more than about +10 in
the opening section is a fact you can print, not a thing to argue about.

The four levels that filled it — 14, 16, 19, 28, around the existing 21 — were
designed against the harness rather than by feel, and two of the four came out
wrong on the first try in a way that is worth recording:

- **`02 — The Near One`** teaches that you return on the block nearest the
  camera by putting a decoy in the goal's column. The first version was
  solvable in seven moves by folding, popping onto the decoy, turning 180°
  and popping again — because from the far side the far block *is* the near
  one. The decoy had become a stepping stone. It only stopped being one once
  the bridge blocks' depths were chosen so that no second axis lines anything
  up, which is a constraint the level's own view never shows you.
- **`05 — Halfway Across`** is meant to need two folds. The first version
  needed one: the plane was a single connected staircase, so the player could
  climb *within* the plane and walk the whole way. Forcing the second fold
  needed a wall in the plane — two blocks stacked, no step up — placed at a
  depth the volume route does not pass through. Same blocks on the route and
  they block both.

Both were found by BFS in seconds and neither would have been obvious by
playing. This is the standing agreement working as intended: ordinary levels
get machine-verified, always.

---

## Publishing overwrote the artifact with a build from the wrong branch

Worth recording because it cost nothing in git and could have cost everything.
The published artifact had been built from an unmerged branch — the map, the
phased bosses, the menu redesign — and a later session, working from `main`,
rebuilt the single-file bundle and republished it to the same URL. The design
work vanished from the link while sitting perfectly safe on its branch.

**The tell was there and was ignored.** The live artifact was 945KB; the
replacement build was 875KB. A 70KB gap between what you are replacing and
what you are replacing it with is a question, not a rounding error. The rule
that follows: **before republishing an artifact, check that the build you are
about to push accounts for the size of the one already there** — and if it
does not, find the branch that does.

Recovery was total and took one command, because `tools/build-single.js` is
deterministic: rebuilding from the branch the artifact originally came from
produced a file byte-identical to what had been live. That determinism is a
property worth protecting; it is what turned a scare into a diff.

---

## The anchor, and a cautionary note about evidence

I once claimed, from 6,004 random placements, that an anchor can never make a
level impossible without it. That claim was **false**, and a single
hand-built level disproved it. The shape that does it: a column with three or
more landing candidates where the one you need is strictly in the **middle**.
Turning 180° reaches either *end* of a column and never the middle, so only
an anchor gets you there. The generator built connected shelves and picked
goals on existing blocks, so it essentially never produced that topology —
the wrong space had been sampled thousands of times and mistaken for proof.

**Absence of evidence from a biased generator is not evidence of absence.**

The level that proves the point still reads as contrived: the anchor is
*necessary* there, but the level is built around demonstrating that rather
than around an idea. The real fix came from the same player who found the
hole: **let amber hold crates too.** Pinning a crate is irreversible, so
where you park it is a decision you cannot take back. A piece that only
redirects is weak; a piece that *removes an option* has teeth.

---

## The composer: where it sits in the literature, and what failed

The pipeline is the generate-and-test family from procedural content
generation. Known relatives: Taylor & Parberry's reverse Sokoban generation
(2011); MCTS-based Sokoban generators; and the rigorous version, Smith &
Mateas on Answer Set Programming for PCG (2011). The exact problem of
excluding unwanted solutions is Smith, Butler & Popović, *Quantifying over
play* (2013).

**Measured success rate: 59%** on reversal-free random sequences, 14% if
sequences that double back are allowed. That gap is the single most useful
thing learned about the composer: *a sequence that reverses direction can
never be forced*, because returning where you came from means a shorter route
always exists, and "forced" is defined as "the solver agrees this is
shortest". The composer warns about this now.

Two hypotheses that were tested and **failed**: letting the composer place
glass (5 → 6 successes of 90, noise) and letting it place anchors so landings
need not march away from the camera (13% → 12%, noise).

---

## The two-finger turn: three versions in one sitting

Asked for on mobile, and got wrong twice before it was got right — both times
by measuring the wrong thing about the hand.

**One: the midpoint alone.** Track the centre between the two fingers, map its
horizontal travel to degrees. This answers a two-finger parallel *slide* and
strictly nothing else. A pivot barely moves the midpoint, and a symmetric
twist — two fingers turning about a fixed centre, which is exactly what
"rotate with two fingers" means to anyone who has used a map — does not move
it at all. Reported as "it feels like it waits for a specific movement", which
was the literal truth.

**Two: the midpoint plus the twist, summed.** Worse, and worse in a way that
no constant could reach. `viewAngle` grows *clockwise* on screen — the render
loop's screen-right is `rx=cos(ta), rz=-sin(ta)`, so a point on the near edge
has screen-x `-r·sin(a)` and slides left as the angle rises. A clockwise
finger twist therefore wants **+angle**, while a rightward slide moves the
near edge right and wants **−angle**. Opposite signs. Summing them meant that
the commonest grip in the world — one finger planted, the other sweeping,
which produces a twist *and* a midpoint shift together — had its two channels
cancel. Worked example: left finger at the origin, right finger at (100,0),
swung 90° clockwise to (0,100). Twist +90, midpoint −50px. Summed with one
sign it gives −55 and turns the wrong way, weakly.

**Three: twist only.** The angle between the fingers, 1:1, with an 8° grab
subtracted rather than merely crossed so the world starts from still instead
of jumping when it takes hold. A two-finger slide now does nothing at all,
which is also what it does on a map. The midpoint is still measured, but only
to tell a turn from a two-finger tap.

The lesson is not about gestures. Two channels that both "obviously" mean
rotation had opposite signs in this camera, and adding them looked like extra
sensitivity while actually being subtraction. A single worked example on paper
would have caught it before any of it shipped.

## Smaller things, settled

- **The verb's name.** `GO 2D / GO 3D` was auditioned against `FOLD /
  UNFOLD` and `FLATTEN / UNFLATTEN` from a menu row and decided by feel. The
  row is gone; the wording is no longer a setting. Saves written before the
  decision may carry a `verbs` key, which `loadSettings` ignores — that is
  the migration.
- **The wardrobe used to buy and equip on one tap**, so a mis-tap while
  scrolling the grid spent stars. Selecting, buying and equipping are three
  separate acts now.
- **`body>canvas` used to be a bare `canvas` selector**, which caught the
  wardrobe's preview canvas and pinned it `position:fixed` over the whole
  viewport.
- **Two of Section I's new levels were the same level.** `The Other Axis`
  (19) and `Turn to see` (21) read as a clean two-step ramp and were both
  "the bridge only exists along the other axis" — one object seen twice.
  Nothing mechanical catches this: the difficulty curve is a function of the
  solved path, and two identical lessons at different lengths look exactly
  like progression. The test that does catch it is a sentence per level, said
  out loud. `The Other Axis` was the newer of the two and was cut.
- **Turning the slices onto depth made them unfindable, and the fix was to
  stop drawing the plane.** A slice had always been one translucent slab over
  the lethal plane, which worked while the slices ran on `x`: from the opening
  view that is edge-on, a wall at a readable screen position. On `z` the same
  slab points straight at the camera, and an orthographic face-on plane does
  not move as its depth changes — so it tinted the whole screen and said
  nothing about where it was. Reported exactly that way: you had to rotate to
  find out, on a clock, where turning is a move. The answer was that empty
  space has no landmarks but the floor does: mark the standable squares inside
  the slice and let the blocks around them supply the position. The slab is now
  suppressed precisely when it is face-on — the same `comp===0` test the hit
  rule already used — and keeps its old weight edge-on, where it was never the
  problem.
- **The trial's slices used to run across the road, not down it.** All four
  trials swept on `x`, which is the axis you can safely be flat under in the
  starting view — so the clock had no opinion about folding, and a trial was a
  test of when to *walk*. Turning them onto `z` makes the fold itself timed,
  because views 0 and 2 both look down z and a sweep along the axis you are
  looking down catches every depth at once. Worth recording that BFS is blind
  to this: every variant returned identical move counts, because the geometry
  never changed. `trialSafety()` is the only check with anything to say, and
  it rejected two of the seven candidates — a `y` plane at standing height
  corners twenty cells, and four `z` lanes spawn you inside a live beat.
- **The tutorial contradicted itself, and then contradicted the screen.** It
  named the verb four ways — "collapse the world", "Collapse", "flatten",
  "stand back up" — while the button said `GO 2D`, in the three levels whose
  whole job is naming things. The fix is a token (`{to2}`) substituted from
  `VERBS` when the line is shown, so the prose cannot drift from the button
  again. Worse was `First Fold` calling the floating block "far behind
  everything": +z points *toward* the camera, so it was the nearest thing on
  screen. And rule 5 was *stated* in a column containing one block, where it
  had no observable consequence — you cannot teach a tie-break with nothing to
  break. Two blocks in that column, the near one being the goal, and the rule
  is something you watch happen.
- **The tutorial's guided lock shipped as a mood before it was a hint.** The
  first version dimmed the world the moment a step began, and since every step
  names a control it was on from the first frame to the last. The owner's
  report was exact: "the tutorial is dark all the way through — the game is
  just dark at the start." That is the whole lesson. A hint is an *event*; if
  it is always present it is not pointing at anything, and layering dark on a
  dark game communicates nothing at all. It now waits out a beat of
  hesitation, any input pushes it back, and the lit button rather than the
  dimming carries the message. Two further corrections fell out of building
  the wait: it must not accrue while the intro card or a panel is up (the
  first one ran out behind the intro, so the guide was already on at BEGIN),
  and — the correction after that — it *must* re-arm when the player presses
  the button being asked for. Refusing to, as an anti-flicker measure, meant
  `First Fold` step 3 (three presses of one arrow) stayed dark through all
  three while the player did exactly as told. A guide that does not respond to
  compliance is not a guide. Flicker is held off by making the *second* wait
  on a step much longer than the first instead, which is the honest fix: the
  player has demonstrated they know the control, so they have earned more
  rope.
- **The tutorial's green light and its dim were one class, and should never
  have been.** Pressing the button the step asked for dismissed the dim, and
  took the green with it — so on a step wanting three presses of one arrow,
  a player obeying perfectly was left mid-step with nothing lit at all. The
  general shape is worth keeping: two statements with different lifetimes
  ("this is the control" / "you are stuck") cannot share one piece of state,
  however alike they look on screen the first time you build them.
- **A hint used to point at nothing, twice over.** `cue()` pulses a button,
  and `cue("bUndo")` named a button this game has never had — so the hint you
  get when you are wedged past recovery did nothing at all. With controls
  `HIDDEN` every cue had the same problem, and it still charged you a star.
  `cue()` now speaks the move when its target is not on screen, and returns
  the words so a caller about to write its own toast can carry them rather
  than overwrite them. Visibility is `getClientRects()`, not `offsetParent`:
  the control bar is `position:fixed` and a fixed element has no offset parent
  even while it is plainly visible.
- **Sound used to peak near -19 dBFS.** `MIX` alone could never fix it: with
  oscillators wired straight to the destination, the ceiling is set by the
  loudest possible moment and everything quieter has to live far beneath it.
  A limiter on the master bus is what made loudness a free parameter.
