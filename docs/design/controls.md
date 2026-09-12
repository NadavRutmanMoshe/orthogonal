# Controls, the landing indicator, and how big the world is drawn

> Moved out of `CLAUDE.md`, verbatim. `CLAUDE.md` keeps the one-line
> invariants; this file keeps the reasoning behind them. Read it before
> *redesigning* the thing it describes, not before editing it.
> `docs/HISTORY.md` has what was tried and dropped.

## Controls

Three layouts, in the menu: `ON-SCREEN` (d-pad), `COMPACT` (no d-pad),
`HIDDEN` (nothing). Gestures work in **every** mode and are additive, never
exclusive - every gesture also has a key and, unless hidden, a button:

- swipe - move
- **double-tap the world - change dimension**, in every mode. A single tap did
  this when the bar was hidden and no longer does anything: the two cannot
  coexist, because a single tap that fires at once makes a double tap into
  fold-then-unfold, and telling them apart means delaying the fold ~300ms in
  the one layout where tapping is the only control you have.
- **two-finger swipe left or right - turn, either way.** Plant two fingers,
  slide them sideways, and the world follows: slide right and the near edge
  comes right with them. It takes hold after 14px (`TURN_GRAB`, subtracted
  rather than crossed, so it starts from still) at `TURN_DEG` .42° per pixel,
  and the turn is only *taken* if you let go past 30°; short of that it springs
  back having cost nothing, which is the whole point - turning is a move, and
  a beat of a live clock on a boss or a trial.
- **It reads the horizontal midpoint and nothing else.** A two-finger twist
  does nothing now, and neither does a vertical slide. This is the third
  arrangement: twist-only was what shipped before, and the version that read
  the midpoint *added to* the twist was worse than either alone - `viewAngle`
  grows clockwise on screen, so a clockwise twist is +angle while a rightward
  slide is −angle, and summing them makes the commonest grip of all (one
  finger planted, one sweeping) cancel against itself. **No constant fixes
  that**; if the turn ever feels mushy again, check the signs before touching
  `TURN_DEG`. `docs/HISTORY.md` has the worked example.
- two-finger tap - turn right, unchanged: it is a drag that never travelled
- **THE FOLD MARKS THE BLOCK IT HANDS YOU BACK** (`foldHiBuild()`,
  `foldMarkOn()`, `colFoldHi`, all in `js/10-render.js`). Rule 5 - coming
  back to 3D puts you on the supporting block nearest the camera - is the one
  rule nobody could read off the screen. The motion says the world is collapsing; it does not say which of
  the blocks in a column you will be standing on afterwards. So that block is
  lifted toward the goal's green and takes a bright rim, and the motion is
  left alone. **Only coming BACK**, which is the owner's call after playing
  it: the mark lit going into 2D as well, off `flatT`, and a 520ms fold gives
  it a few hundred milliseconds - reported as "it disappeared super fast",
  which it did and could not help doing. Worse, going in it answers a
  question ("which one will it pick?") the player has not asked yet, because
  nothing has happened; a flash on the board with nothing behind it reads as
  something going wrong. Coming back the question is live, and the rings are
  already there to answer it. **A two-beat FOLD was built and played
  instead of this** - the whole world gathering into the front block of each
  column while the camera stayed up in the volume, then flattening - and
  dropped on the owner's call; the mark is what survived it, and it is the
  cheaper half (`docs/HISTORY.md`).
  **It can be turned off** (`foldMarkOn()`, `settings.foldmark`, Menu > Where
  you land). A teaching aid nobody can switch off is decoration everybody has
  to keep looking at, and a player who has learned rule 5 is entitled to want
  their board back. Off means off: `foldHiT` is 0, so the per-frame rebuild
  does not run either. The landing RINGS are deliberately not on the switch -
  they are the older statement, they sit beside the block rather than on it,
  and the sentence under them names them.
  Four things are load-bearing. **It is asked for with the game's own
  `R.landings()` / `R.pick()`** rather than re-derived, so the anchor's
  override of rule 5 is correct for free and the drawing cannot drift from
  the rule. **It is ONE PER LEDGE, not one per silhouette square** - the
  first build lit the front block of every square including squares buried
  under other squares, and a block with something over it is not somewhere
  you can stand once the world is flat (the owner's correction, after
  playing it); so each screen-right column is walked from the top down for
  squares that are filled with the square above them empty, and the rules are
  asked what standing there would put you on. **Only columns holding two or
  more blocks**, or a flat meadow turns entirely green on every fold and a
  highlight that marks everything marks nothing. **The block under your own
  feet is added to that set unconditionally**, though: those rules are about
  columns where something was CHOSEN, and they are right to be, but the one
  block the player is asking about is the one they are standing on. "I came
  back, show me where" must never come up empty.
  **It runs for `LAND_MS` on ITS OWN clock, started by every unfold.** It
  read `landFade()` outright for one build, on the reasoning that the mark
  and the rings say the same thing and should fade as one - but the rings
  have a TRIGGER as well as a clock, and it is deliberately narrow
  (`doUnflatten` only calls `showLanding` when the column held more than one
  candidate, because rings round a single block announce a choice nobody
  made). Reading their fade inherited that trigger, and on
  `03 - A Real Challenge`, where every square you climb to has exactly one
  candidate, coming back lit nothing at all. Same envelope
  (`landEnvelope`), so where the rings do appear the two still fade as one
  thing; different trigger, because "where did I land" is a question every
  landing raises and "which one did it pick" is not. The world stands up in
  620ms, so a mark tied to the fold TWEEN was gone about the time the player
  finished reading the question; the rings
  already hold for `LAND_MS` with a fade at each end and are saying the same
  thing about the same block. `landFade()` is the single source for that
  curve - two copies of it would drift, and "as long as the ring" is a
  promise two copies cannot keep - so `landFrame()` and the mark both read
  it, and the block and the ring around it fade as one thing.
  **And it BREATHES, which is the half of this that colour cannot do.** A
  tint is only ever as loud as the difference between it and the ground under
  it, and on the NATURE world the ground is green - so a mark in the goal's
  green was nearly invisible on exactly the levels where the teaching
  happens. Both reports of it being missed came from grass. So the lift goes
  toward WHITE first (which brightens any surface the game has) and leans
  teal after, and the whole thing swings on `FOLD_BREATH_MS` - twice across
  the mark's life, counted off its own clock rather than off the wall, so
  every mark looks the same from its own first frame. Brightness plus a
  breath is what the tutorial's landing marker already reached, in the same
  words: a block that is visibly alive is unmistakable. It is a lift
  plus a rim rather than a repaint, the same pair that marker uses,
  and both PERIL and that marker outrank it - the marker for a sharp reason,
  since it draws its own loser in a dim version of this same green.
- **THE FOLD IS A TIMED TWEEN, NOT A LERP** (`FOLD_MS_IN` 520, `FOLD_MS_OUT`
  620, `FOLD_MS_CLOCK` 380, in `js/05-state.js`). It used to be
  `flatT += (want-flatT)*rate`, which is an exponential ease-*out*: most of
  the travel happens in the first few frames and the rest is half a second of
  creeping the last two percent. So the verb the whole game is built on was
  over before the eye had followed it. A linear phase through an ease-in-out
  cubic puts the motion where it can be watched - it leans in, travels, and
  settles. **Peek is deliberately kept out of the tween** and multiplied on
  afterwards: it is a live analogue value the player is holding, not a move
  being played, so it stays a lerp, and that separation is what lets the fold
  have a real duration without peek inheriting one. **An external write to
  `flatT` still wins**, detected by comparing against what the loop last
  wrote, so `resetLevel()`, `respawn()` and `loadLevel()` still snap - a
  death that animated a slow unfold on its way back to the start would be the
  reset arriving in slow motion. `dtMs` is clamped, for the same reason the
  fight clocks clamp theirs. The crush delay in `doFlatten` moved 420 → 620
  to stay behind the picture.
- **AND THE VERB IS REFUSED WHILE THE WORLD IS MOVING** (`folding()`). A
  second press landing inside the fold used to do nothing visible - the state
  turned round and the tween reversed - so a fast double press read as a
  button that had stopped working. It is a stamp taken when the move
  **commits**, not a read of the tween's `foldP`: `foldP` is reset by the
  render loop, which has not run yet between two presses in the same tick,
  so reading it let the second press straight through. Same reasoning as
  `deathPending`, for the same reason. It releases at 85% of the duration,
  because the last few percent of an ease-out is invisible and waiting for it
  would feel like lag.
- **Changing dimension jolts the camera and buzzes the phone** (`foldJolt()`
  in `js/12-play.js`, `haptic()` in `js/11-sound.js`). **It is two motions,
  and they say different things.** `shakeT` is impact - the same decaying
  jitter a hit uses (.9 folding, .6 standing up). `foldSlamT` is *weight*:
  one eased swing of the camera along screen-up, **down** into the plane and
  **up** out of it, so the picture moves the way the world just did. Its
  phase runs forward from the moment of the fold while its envelope decays,
  which is what makes it start from rest - driving the phase off the decaying
  value directly puts the camera at its extreme on the first frame, and that
  is a jump cut rather than a slam. Both are scaled by `viewSize`, so a large
  arena and a small one kick by the same fraction of the screen. The buzz is
  two pulses in the shape of the sound: a slam that settles going in, a knock
  that opens out coming back. **Skipped under `prefers-reduced-motion`,
  unlike the death and hit shakes** - this one fires on an ordinary move
  several times a level, which is the repetition that setting exists to stop.
  The buzz is deliberately **not** tied to mute: mute is about the room you
  are in, and vibrate is the operating system's switch to own. It is guarded
  three ways because all three happen - no `navigator.vibrate` on desktop or
  iOS Safari, a throw in some WebViews, and a silent no-op without a prior
  gesture. Failing silently is correct: it is garnish on a move already made.
- arrows / WASD, space, Q / E, Z undo, R restart, H hint, M mute, Shift peek
- Esc - close the open panel, or open the menu from a clear screen. It closes
  before it opens, because a key that always opened the menu would be the one
  key you could not use to back out of the wardrobe. Ignored behind the intro
  and the win card, which have their own buttons.

---

## The landing indicator - rule 5, shown instead of stated

**"You return on the block nearest the camera, unless an anchor is among the
candidates" is the single thing that cost the first real playtester the
most.** It is stated once in `First Fold` and never shown again.

**It cannot be drawn while you are flat - so the plane is where PEEK now
works.** Every candidate is at the same screen position in the plane, which
is what folding *means*, so the rule operates on information the player
cannot see and no wording fixes that. Three things answer it together:

1. **Peek in the plane is a preview un-fold.** The eye button already means
   "see depth without spending a move" and was switched off when flat. Held
   there it raises the world back toward the volume - most of the way, never
   all of it - and drops it on release. It works by lowering the *target*
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
playtester reached for it in the plane *before it did anything* - the
affordance was already legible and the game silently ignored a correct
instinct. So:

- **The eye lights when looking would tell you something, and that is
  narrower than "more than one block in your column".** That was the first
  rule and it lit far too often - most columns in most levels hold two
  blocks and the choice between them usually decides nothing, so the button
  was on for most of the time anybody spent flat, which is how a cue becomes
  wallpaper. Reported as showing when it was not necessary. It now asks the
  question the player is about to get wrong: **the goal folds into the square
  you are standing on - so it looks like you have arrived - and the block you
  would come back on is not it.** That is the one moment the landing rule
  costs the level rather than a step. Judged every frame in `lookCue()`
  rather than in `syncHud`, for the same reason the boss's fold cue is: the
  answer changes when the player moves in the plane, not when a button is
  pressed. Quieter and slower than `peril` and `strike`, because those two
  are about to cost you a life and this one is an offer.
- **Tap latches it, holding still works.** Hold-only meant keeping a thumb on
  a corner button while reading the middle of the screen. The latch drops
  itself after `PEEK_LATCH_MS` and on the next thing the player does, which
  is what made hold-only defensible in the first place.
- **`00 - First Landing` NAMES IT AND DOES NOT FORCE IT**, in the level's
  last line. It was a compulsory step there for one build and the owner
  played it and cut it: the step asked the player to preview a landing the
  level had not yet told them existed, so the eye read as another hoop rather
  than as the answer to a question they were already asking. It had already
  been moved once, out of `00 - First Fold`, where it was a press before
  `GO 3D` while the fold itself was still new and read as part of standing
  up. Named rather than demanded, it is offered at the point the player has
  just been shown what it would be *for* - and the button lights on its own
  in the plane, which is the affordance the first playtester reached for
  before it did anything.

**A TUTORIAL STEP THAT ASKS FOR A FREE ACTION NEEDS `free:true`.** `tutGuide`
replaces a step's line with the next *move* whenever the solver disagrees
with it, which is right for the three verbs the solver knows. Peek is not a
move - it costs nothing, changes nothing, and the solver has no opinion - so
without the flag the step is overridden on every frame and can never be
shown. This bit once, exactly that way. **The same hatch now carries a step
that asks for a move the solver would not make** - the deliberately wasted
fold in `00 - First Landing`. That is a wider use than the flag was built
for and it is only safe where nothing is scored; see that level's notes.

**"The front", not "nearest the camera".** The old phrase names a direction
the player cannot see; the new one is a word they already own. Player-facing
text says *the front*; the code and this file may still say nearest, because
there the camera is a real thing.

- **Only when there was a choice.** `land.length > 1`, or nothing was decided
  and a marker would be noise. That is why it is silent on most levels and
  turns up exactly on the ones that turn on the rule.
- **The winner wears the colour of whatever decided it** - amber when an
  anchor overrode the rule, the goal's green when it was simply nearest - and
  the losers a dim version of the same, so the choice reads as one picture.
- **The rings draw forever; the sentence is budgeted.** `LAND_HINT_TIMES` (3)
  in `settings.landHints`. The rings are free and answer faster than words; a
  line of text on every fold would be nagging.
- **It goes in `flashCue`'s note slot, not `flash()`.** A toast lands at the
  top of the screen across the level's own hint text - the collision that
  slot was built to fix - and the note slot also sits near the rings rather
  than at the opposite end of the screen from them.
- **`landFrame` clears on `flat`, not on `flatT`.** flatT is still near 1 for
  the first frames after standing up, because the world is only starting to
  rise, so testing it threw the hint away on the frame it was created.

**`loadSettings()` is a whitelist and a key that is not read there does not
exist.** `settings.landHints`, `slowOffers` and `noSlowOffer` are all written
by `saveSettings()` and were silently forgotten on every reload until they
were added to it - which mattered most for `noSlowOffer`, since that one is
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
  (.62) and a cell of depth therefore costs .62 of a cell vertically - the
  same coincidence `legible.js` is about.

Blocks came out **1.6× to 1.8× bigger** across the campaign. Two things to
know before touching it:

- **Portrait and landscape convert the two requirements into `vs`
  differently** - half-width is `vs` and half-height `vs/a` in portrait, the
  other way round in landscape. Getting it backwards is silent: it only shows
  as bad framing on one orientation.
- **The control bar does not change the size on a phone.** Width is the
  binding constraint in portrait and the bar costs height, so `padH` only
  matters in landscape or on a very wide arena. Do not assume hiding the bar
  buys size - it was measured and it does not.

