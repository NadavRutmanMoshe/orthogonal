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
- **Sound used to peak near -19 dBFS.** `MIX` alone could never fix it: with
  oscillators wired straight to the destination, the ceiling is set by the
  loudest possible moment and everything quieter has to live far beneath it.
  A limiter on the master bus is what made loudness a free parameter.
