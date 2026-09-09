# Levels — the campaign, section by section

> Moved out of `CLAUDE.md`, verbatim. `CLAUDE.md` keeps the one-line
> invariants; this file keeps the reasoning behind them. Read it before
> *redesigning* the thing it describes, not before editing it.
> `docs/HISTORY.md` has what was tried and dropped.

## Levels

Block format is `[x,y,z,k]` where k is 0 stone, 1 water, 2 anchor, 3 crate,
4 fire. Levels may carry `keys: [[x,y,z]]`.

**AND THE PLAYER-FACING NAMING IS NOW CONSISTENT.** The rename below reached
the pieces and the stories but had never reached the section headers, the
legend or most of the hints, so the game called one thing glass and water in
two places a tap apart. Everything a player reads says **water** and
**fire** now — sections `II · FIRE` and `III · WATER`, the legend, every
hint. The code still says `glass` and `spike` throughout, for the reason
below.

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
| I · NATURE | 14 + trial + sparring + boss | the owner's own opening: the fold, then peril, then distance, then the turn |
| II · FIRE | 7 + trial + boss | fire before water — a hazard reads faster than an absence |
| III · WATER | 8 + trial + boss | ends on water + fire |
| IV · DESERT | 9 + trial + boss | ends on crate + fire + water, then the sweeping fight |
| V · EXTRA | 60, locked | opens when every boss is down; anchors and amber live here |

**Section III was re-cut around the owner's own levels.** The four that used to
open it are now three of the owner's, pasted out of the editor, saying the
section's one fact three times in the order a player meets it — water is a wall
you can fold *into* (`20 — Straight Through`), water is a step you can climb
(`21`), water is ground you can walk out onto (`22`) — with `Clear Ground`
moved down to `23` so the run into the trial ends on the section's first
two-fold level. The four after the trial are new and every one of them puts
**water and fire in the same board**, because they are exact opposites in the
plane: water is solid ground that casts nothing, so the plane shows you *less*
than the volume does, and fire casts like stone and then poisons the whole
silhouette column it lands in, so the plane shows you *more*.

The thing worth knowing before writing another one: **a spike only costs the
player moves when the way round it is a turn.** Walking one square further
before folding is free — the plane and the volume both charge one move per
square of `u` — so a spike that merely delays the fold is invisible to
`statsFor()` and to the minimiser, however lethal it looks. Every fire block in
`24..27` poisons something whose detour is a *rotation* or a walk through
depth, and that is why deleting one changes the answer. Three drafts that did
not do this were thrown away first; they solved in exactly the same number of
moves with the fire and without it.

The seven levels that came out are on the shelf as `82..88`, boards untouched.
None of them was removed for being wrong — three were the section's hardest —
and `LEVEL_RENAMES` carries every save.

**Section IV was re-cut the same way**, and it is worth reading the two
together because the shape is now deliberate: *the owner's own levels open a
section, and the run after the trial is where the section's piece meets the
ones already taught.* Three of the owner's levels take the front (`28`, `30`,
`31`), with `29 — Make a Bridge` kept and interleaved — it held both its place
and its number. The pair worth pointing at is `30` and `31`: **the same board, mirrored
in depth.** Same ground, same crate, same tower, the tower simply on the far
side of you — and 30 goes in three moves where 31 takes ten and two folds,
because the landing rule points the other way. A player who already knows the
board is being asked about the rule and nothing else, which is worth more than
two unrelated levels.

The four after the trial each pair the crate with one other thing: the lava
catches a shove that would otherwise be refused (`33` — `push()` will not lose
a crate out of the world, so the fire is the only floor at that depth); a crate
resting on water is the only thing in that column the plane can see (`34`); a
crate is a **wall** in 2D and the one wall you can move, so shoving it off its
ledge drops it out of the row it blocked (`35`); and `36` runs all of it.

**`32 — One Will Not Move` replaced `Shove It Clear` one playtest later**, and
the reason generalises: Shove It Clear's lesson is *get the crate out of the
column that would crush you*, which is `28 — Out of the Way`'s lesson, four
levels in front of it. It read as a repeat rather than as a test, and the slot
immediately before a trial is the one place a section can least afford that —
a section's last level before its clock should be a summary, not a fifth
variation. What went in is the one thing the run had not said: **two crates
that behave differently**, because `push()` refuses a shove that cannot land.
The first has a wall behind it, so it will not move and the only thing to do
with it is climb it; the second has somewhere to fall, so it moves — one storey
down, into the column the plane road needs a floor in. One crate is a step and
the other is a shove, and which is which is a fact about what is *behind* them.
The landing rule then takes the last two moves. Shove It Clear is on the shelf
as `97`.

The eight displaced levels are on the shelf as `89..96`. `91 — There and Back`
and `96 — Twice Pushed` in particular are two of the best crate levels in the
game; they are *pure* crate, and what the finale wanted was three pieces on one
board.

**And the section ends on two fights, not one.** `SPARRING — One of Them`
sits between `12` and `BOSS I`: a teaching level that happens to be a boss, on
a three-by-seven board — BOSS I's opening phase with the arena shrunk to the
tutorials' scale and a hunter that cannot walk. It is there because
players were arriving at BOSS I able to see a thing walking at them and unable
to say what the fight was *asking*; the four rules of the kill are a live
checklist at the top of the screen (`primer`, see `docs/UI.md`) over a board
where the first three of them are one press each, and it says which line you
missed when it kills you. It is `tutorial:true`, so it is not scored,
it takes no stars off the section's total, and it is not one of the bosses
`V · EXTRA` waits on. The design is in `docs/design/bosses.md`.

`SECTIONS[].at` holds array indices, so inserting a level means shifting every
marker after it — SPARRING going in cost four one-line edits, and `verify.js`
is what says whether they were made. A section with `locked:true` stays shut until
`sectionsUnlocked()` — which checks the **bosses only**, not every level,
because gating a bonus on 100% turns a reward into a chore.

**AND A BOSS YOU SKIPPED IS NOT A BOSS YOU BEAT.** That is deliberate — a
skip is not in `progress`, so ads cannot buy the reward for winning — but it
is a state the game *hands out itself*: `struggleOffer()` offers the skip
after three losses on a landmark, so a player can take the help they were
offered, go on to finish the campaign, and arrive at a shelf that says only
"every boss is down" while their save quietly disagrees. Reported exactly
that way. The gate has not moved; what changed is that it can now be read.
`bossesLeft()` is the primitive and `sectionsUnlocked()` is derived from it,
so the section card, the locked sheet, the win card on `BOSS IV` and
`mapHere()` all name the fight that is still standing — and the first three
of those put the player in front of it in one tap.

**Bosses and trials carry no number**, only a numeral: `BOSS I …`, `TRIAL II
…`. Progress is keyed by name, so a numbered landmark in the middle of a
section would renumber every level after it and cost a `LEVEL_RENAMES` entry
each. A landmark must not be able to break a save.

**SECTION I IS THE OWNER'S OWN, AND IT IS THE ANSWER TO "ARE THESE AI MADE?"**
The opening was re-cut around eleven hand-authored levels, and two more
went in at `04` and `05` later. It runs
`00 — First Steps, 00 — First Fold` (the tutorial), then `01 … 08,
TRIAL I, 09, 10, 11, 12, 13, 14` and the boss. Each one is a sentence, and no
two sentences are the same:

| | |
|---|---|
| `00 — First Steps` | walking, stepping up, stepping down. No fold route exists through the geometry at all, so the lesson cannot be short-circuited even before `lockFlat` refuses the verb. |
| `00 — First Fold` | fold, cross, stand up — **and the landing rule for free**: the far bank is three deep in one silhouette column, so you come back on the front block and the goal is one step behind it. |
| `01 — On Your Own` | the tutorial's own shape one step longer, and the only level in the opening where nothing can kill you. The rest the section did not have. |
| `02 — Beware of Walls` | some squares are lethal to fold from. 4 of 9, including the start square. |
| `03 — A Real Challenge` | the same, hardened: 6 of 8, and the only safe square is one you step *down* onto. |
| `04 — The Shortcut` | the fold as **distance**, not as a bridge. The first level whose gap runs into the screen rather than across it: the walkway is left in, so seven moves of walking and four moves of `FLAT POP right up` both work and the player is the one who notices. |
| `05 — The Only Way` | the same board with `z=3` and `z=4` taken out of the floor, so the walk that solved the level before it now walks you off the world. Learn it for free, then need it. |
| `06 — The Illusion` | the plane is a shortcut, not a delivery — pop partway and walk the rest. |
| `07 — The Block` | the plane has no preferred direction; the goal is behind you and above you. |
| `08 — Limited` | the peril lesson at its limit: 8 of 9 squares are lethal to fold from, and the survivor is one you have to *climb* to. |
| `09 — The Rotation` | **impossible without rotating**, proved by `solve()` both ways — and taught, so the player proves it too. |
| `10 / 11 — No Bridge / No Bridge 2` | the same three moves conjugated: `rot+` and `rot-`. |
| `12 — Simple Walk` | walking *is* par. The control half of the scoring pair. |
| `13 — Not a Simple Walk` | one column wider, so walking is one move over and the fold is the shortcut. The star is the only thing that says you missed it. |
| `14 — The Silence Before the Storm` | everything at once, into the boss. |

- **ROTATION DOES NOT EXIST UNTIL `09`, AND IT IS NEVER TAKEN BACK.** The
  locked run is contiguous and ends at the level that teaches the turn: the
  two tutorials, `01`…`08` and `TRIAL I` carry `rotate:false`, and nothing
  after `09 — The Rotation` does. **`15 — Fire Wall` used to**, six levels
  and a boss later, at the top of a new section — so the buttons vanished
  from a bar that had had them all through Section I and came back on the
  next level. That is indistinguishable from a bug and was reported as one:
  *"I got into a later level which is not disabled which was still
  disabled."* A verb that has been given is not taken away again.
- **The lock is a lesson, not a load-bearing constraint, and that is worth
  knowing before defending it.** It used to be true that four early levels
  collapsed to `rot+ FLAT POP` without it; the opening was re-cut around the
  owner's own levels since, and re-measured today **every one of the eleven
  locked levels has the same optimal route with rotation as without** —
  including `15`, which is 5 moves either way. So what the lock buys now is
  purely the reveal at `09`, and that is the only thing to weigh if it is
  ever questioned again.
- **AND THE TURN BUTTONS ARE NOT DRAWN ON A LOCKED LEVEL.** Disabled was the
  old behaviour and it is still right for the *flat* case, where they come
  back the moment you stand up. A level with no turn is a different sentence,
  and a run of dead controls in the bar would spend the reveal in advance.
  `body.norot`, set in `syncHud`. **A disabled button still has to look like
  a button** — see the note on `button:disabled` in `css/style.css`: dropping
  its background to transparent made the flat case read as the controls
  having been removed, which is the other half of the same report.
- **THE SCORING PAIR IS A SETUP AND A PUNCHLINE.** `10` is trivial on
  purpose — the floor is open and walking is exactly optimal — and it is the
  level `starsOffer()` explains three stars on. The player is told to aim for
  them, gets them free, and then meets `11`, which looks identical, is one
  column wider, and where walking scores 4 against a par of 3. Testers ignore
  the star system because nothing ever points at it; this is the pointing.
- **`07` IS THE THIRD TUTORIAL, AND ITS LESSON IS A PROOF THE PLAYER
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
- **AND THE WHOLE CAMPAIGN IS WRITTEN IN THAT VOICE NOW.** Section I was the
model and everything outside it has been rewritten to match: second person,
plain words, one sentence, and **the player's vocabulary rather than the
code's**. A player has three words for this game — 2D, 3D, and the name of
the thing in front of them — so a hint says *go 2D*, *turn*, *the eye*,
*fire*, *water*, *amber*, *crate*, and never *the volume*, *the plane*, *the
silhouette*, *the axis*, *the projection* or *a column*. Mean hint length
went from 63 characters to 49 and nothing outside Section I now runs past
70 except the four bosses, which share one fixed sentence. **Eight titles
were renamed with it** — `Invisible Architecture`, `Long Division`,
`Confluence`, `The Whole Language`, `Sharp`, `Poisoned Column`, `Long
Glass`, `Absent Floor` — each one costing a `LEVEL_RENAMES` entry, composed
the usual way. **Two sections were renamed too**: `II · SPIKES` and
`III · GLASS` became `II · FIRE` and `III · WATER`, because the pieces have
been drawn as fire and water for a long time and only the section headers
and the legend were still using the old names. Section names are not
persisted, so those two cost nothing.

**THE TITLES AND HINTS ARE THE OWNER'S, AND THEY ARE SHORT ON PURPOSE.**
  The first pass named levels after the mechanic and explained it in a
  sentence about the *game*; these speak to the player and stop
  (`Beware of walls`, `no catch here, just a simple walk`). Every one of them
  had already been live on the published link, so all twelve went through
  `LEVEL_RENAMES` rather than simply changing.
- **The peril pair was verified, not assumed.** `02` and `03` add blocks at
  head height that change no route at all — the optimal is the same as the
  level before — and turn four then six of the standable squares into places
  where `GO 2D` kills you. That is what makes them different levels rather
  than decoration, and it is the first time `foldPeril()`'s red block has a
  level built for it.
- **SECTION II OPENS ON THE OWNER'S FIRE LEVELS TOO.** `13 — Fire Wall` is
  fire as a *wall* — the middle column burns, only three squares are walkable
  at all, and the stone pillar behind it is the way over, so the fire never
  enters the route. `14 — Not This Way` is the other half: two blocks of it
  poison every silhouette this view offers, and the level is **impossible
  without rotating**. `15 — The Floor Is Lava` is the owner's title and the
  measurement earns it — of nine standable squares, two crush you and six
  burn you, which leaves one. The three they replaced went to the shelf as
  `79..81`.
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

**THE WHOLE CAMPAIGN WAS RENUMBERED ONCE, AND IT COST NINETY-THREE ENTRIES.**
Two of the owner's levels went in at `04` and `05`, which moved everything
after them up by two — and while every level in the run was being renamed
anyway, the shelf was put right. `V · EXTRA` had been carrying `78..81`, then
`65..77`, then `38..64`, then `82..97`, *in that order*, because levels had
been moved onto it four separate times and each move kept the numbers the
levels arrived with. A player reading the map saw the count go up, jump back,
and jump forward again. It now runs `39..98`, straight on from the campaign's
`38`, so the number on a node counts up by one from the first level to the
last — which is the only thing that number has ever claimed to do.

Done as one pass in the way the table demands: every value that named a
renamed level was re-pointed at its new name, and one new key was added per
rename. Nothing was dropped, nothing chains, and `verify.js` asserts both.
The cost is worth stating plainly, because it is the argument for numbering
being the *last* thing you decide: 93 entries of permanent save-migration
baggage to move two levels into the middle of a section. The alternative —
levels named without numbers — was never on the table, because the number is
what a player uses to say where they are stuck.

Every special piece is verified load-bearing; every anchor level is verified
**impossible** without its anchor; every crate is verified to be shoved in the
optimal solution.

---

