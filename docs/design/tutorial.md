# The tutorial — the coach, the guided lock, the ghost hand

> Moved out of `CLAUDE.md`, verbatim. `CLAUDE.md` keeps the one-line
> invariants; this file keeps the reasoning behind them. Read it before
> *redesigning* the thing it describes, not before editing it.
> `docs/HISTORY.md` has what was tried and dropped.

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
  them. **The one exception is a next level that is behind a lock**, and
  there is exactly one of those in the campaign: `BOSS IV` is the level
  immediately before `V · EXTRA`, and that shelf is gated on the bosses
  rather than on the rolling window. The button used to walk straight through
  that gate — you were handed the first level of a section the map was still
  refusing to open, and the one after it stayed shut, which is precisely what
  "progression stopped there" looked like from the outside. It opens the map
  on that section instead, where the lock now names the fight holding it. The
  label changes with it (`WHAT'S LEFT`), because a button reading NEXT LEVEL
  that goes to the map is the dishonesty this rule exists to forbid.
- **A TEACHING LEVEL'S WIN CARD ASKS WHETHER YOU UNDERSTOOD, NOT HOW YOU
  SCORED.** Everywhere else the two buttons are a score argument: `TRY AGAIN`
  against `NEXT LEVEL`, and the retry is hidden once you have three stars
  because there is nothing left to beat. A tutorial has no par and no stars,
  so that pair had nothing to say — it read `NEXT LEVEL` and hid the retry
  outright, which meant a player who had been walked through the level by the
  ghost hand and had understood none of it had no way back through it except
  the map. So on `L.tutorial` the pair becomes **`UNDERSTOOD`** and **`STILL
  LEARNING`**, the retry is *shown* rather than hidden, and the title above
  them says `That was the lesson` rather than `Got it` — which was the button
  saying the same word twice. Replaying a lesson is the one place in the game
  where playing again is not about a better number. `#bRetry`'s label is a
  span (`bRetryT`) for the same reason `#bNext`'s is: the glyph beside it is
  not part of the sentence. `.wonrow` wraps for it — that pair is about 45px
  wider than the owner's 327px phone and no other pair on the card is.

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

### Which controls it teaches — the layout, and nothing else

**The lesson follows `settings.ui`.** HIDDEN means the gestures are all this
player has, so the tutorial takes the bar off and teaches the three things a
finger can do on the world — swipe to move, double-tap to change dimension,
two-finger swipe to turn — with a **ghost hand** demonstrating whichever one
the current step wants. FULL or COMPACT means there are buttons, so it is the
button lesson. `tutGestures()` is the whole derivation.

**THERE USED TO BE A SECOND SETTING FOR IT, AND IT WAS THE WRONG QUESTION.**
A `Tutorial: GESTURES / BUTTONS` row asks a first-time player to choose
between two lessons for a game they have not seen, and the answer was already
sitting one row above it. It went, along with `defaultTutor()`; **HIDDEN is
now the default layout**, so the default lesson is the gestures because that
is what the default controls are.

- **The consequence on a desktop is real and is accepted.** A fine pointer
  now gets the gesture lesson, and a swiping hand is an odd thing to show
  somebody holding a mouse — which is exactly what `defaultTutor()` used to
  exist to avoid. The keyboard half of the lesson is still unbuilt; when it
  is, this is where it gets chosen.
- **`mastery` went the same way**, and for the same reason a removed key
  always does: its row is gone, so `loadSettings()` no longer reads it and
  `masteryPreview()` returns false. A save carrying `mastery:"on"` would
  otherwise pin the preview look on with nothing left to switch it off.

**THE CARD THAT OFFERED THE BUTTONS BACK IS GONE.** The tutorial used to end
by setting `ui` to `none` itself and putting up `controlsOffer()` — on the
reasoning that the game must not take the buttons away silently. It does not
take them away at all now: HIDDEN is simply the default and the menu row is
where it lives. A card explaining a setting that never changed under the
player is a wall between the tutorial and the game, and it was the first of
two in a row. `settings.ctlAsked` went with it, out of the whitelist too.

**AND ON THE FIRST REAL LEVEL, THE BULB.** `hintOffer()` explains the hint,
once (`settings.hintAsked`, in the `loadSettings()` whitelist). The tutorial stops
talking at exactly the point the player meets the game, and the single most
useful control in it is a bulb in the corner nobody has been told about —
which is a retention hole rather than a missing nicety, since hints are the
reason somebody stuck does not close the game.

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
and they are also the ones that cost no screen — which is why they are the
default now, and why the lesson simply reads the layout.

- **The lesson is derived, never chosen.** `tutGestures()` is
  `settings.ui==="none"` and that is the whole of it, so the lesson and the
  controls can never disagree — which is what the removed `Tutorial` row
  could do, and did.
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
- **THE TWO CONTACTS ARE STACKED, 32px APART, AND THE HAND TURNS A QUARTER
  TURN TO MATCH.** Both arrangements have now been drawn and played. Side by
  side is the grip a hand really uses, and it is the worse picture: two
  contacts abreast, sliding along their own line of travel, read as one
  contact with a trail — which is exactly what a single-finger swipe already
  looks like. Stacked, the pair sits *across* its direction of movement, so
  the two-ness is the one thing the motion cannot blur. That was the original
  call, made when each contact was a bare dot; it survives the hand being
  drawn, and the hand simply rotates to sit on it.
- **The rotation is exactly ±90°, about the first fingertip, and it faces the
  way the hand travels.** The pair is drawn pointing up with its tips 32px
  apart horizontally, so a quarter turn about the first tip puts the second
  one on the second dot by construction — and turning it toward the
  direction of travel means the hand always leads with its fingers and
  trails its fist, rather than being dragged backwards across the screen.
  Turning it the other way flips which tip is on top, so the left-hand
  version also drops 32px to put its first tip on the *lower* dot. **No tilt
  on this one**: at that radius, ten degrees of character costs several
  pixels of registration, and a fingertip that does not sit on its own
  contact is the one thing this drawing cannot afford. **The gap was 22px
  and the contacts overlapped**, so the pair read as one thick finger. Four
  numbers move together: the symbol's two tips, the two `.gfinger` margins,
  the pair's rendered width, and the translate on the left-hand version.
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
- **AND IT SAYS WHAT IT IS, IN TWO WORDS, ABOVE THE HAND.** A drawing of a
  gesture can be read wrong: the double tap is a finger that lifts and comes
  back, lifting is drawn as movement away from the glass, and it was reported
  as looking like a swipe up. `GEST_SAY` in `js/15-tutorial.js` names each
  one — *swipe right*, *double touch*, *rotate left* — and the label goes
  where the eye already is, beside the hand, not in the coach line at the
  foot of the screen. **Named by what the player gets, not by what the
  fingers do**: `bRotR` is "rotate right" even though it is demonstrated as a
  leftward two-finger slide. It is drawn *above* the contact point, because
  the hand hangs down from its fingertip and anything under that point lands
  in the middle of the fist.
- **The coach line at the foot of the screen is gone**, and the tutorial's
  words are the level's own hint at the top, moved down clear of the corner
  buttons. One place to read rather than three. The element and every path
  that writes it are untouched, so restoring the line is one CSS
  declaration.
- **The hand sits below the middle of the screen, over the world.** That is
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
- **The gesture itself reads the horizontal midpoint**, so whichever way the
  demonstration draws the pair, the control it is teaching behaves the same
  and the demo is honest either way.
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

