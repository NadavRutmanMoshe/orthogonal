# The chrome - buttons, the brief, the map, the home screen, the story, the sting

> Moved out of `CLAUDE.md`, verbatim. `CLAUDE.md` keeps the one-line
> invariants; this file keeps the reasoning behind them. Read it before
> *redesigning* the thing it describes, not before editing it.
> `docs/HISTORY.md` has what was tried and dropped.

## The buttons

**They are meant to look pressable, and for a long time they did not.**
Everything in the game was a 1px outline on nothing with a 2px radius -
honest, quiet, and reported as stale and uninviting. The reason it failed is
specific rather than a matter of taste: **a hairline rectangle is what this
game draws for a block edge**, so the chrome and the world were speaking the
same language and nothing on screen said which things answered a thumb.

One skin now, and it is the one `.hcont` on the home screen already used:

- a **fill** - a soft top-lit gradient over the panel colour, so a button is
  an object rather than a hole;
- a **lip** - `0 3px 0` of a darker shade of the button's own hue, which is
  the whole of what turns a flat rectangle into a key cap;
- a **press** - the cap moves down onto its lip.

`--c` is a button's hue and `--lip` its shadow, so a family sets one property
and the fill, the rim, the glyph and the lip all follow. **A disabled button
loses its cap**, which is the honest drawing of one that will not answer.

- **The five round buttons wear a hue each**, so a row of circles is told
  apart by colour before a glyph is read - which is what a thumb reaching for
  the corner actually uses. They take the colours those things already mean
  elsewhere: the bulb is the gold of a star, the eye the goal's teal, the
  wardrobe the violet of the map's landmarks, restart the blue every second
  chance in the panels wears. `button.rnd.on` swaps `--c` to the player's
  colour, so "you are inside this one" reads the same on all of them.
- **The two animated cues list the lip in their own keyframes.** A
  `box-shadow` animation replaces the base shadow outright, so `cuePulse` and
  `tutlive` would flatten the cap while they pulsed. Both carry
  `0 3px 0 var(--lip)` in every frame. Anything else that animates a shadow
  has to do the same.
- **A card's buttons are three weights and they look like three weights**: a
  filled primary, a filled blue ad button, and a quiet outline. One outlined
  rectangle per option made every option look identical, which is the
  opposite of what a card with a recommended action wants.
- **THE ICONS ARE DRAWN, NOT OUTLINED.** Every glyph in the corners and on
  the bar used to be a 1.7px hairline path, which at 19px on a dark ground is
  a *diagram* of a thing rather than the thing - reported, after the skin
  landed, as buttons that look better but icons that do not feel alive. They
  are solid shapes now with a second tone in them: a body in the button's own
  hue, `.lite` where the object catches light, `.dim` where it turns away,
  `.ln` for the stroked half (an arc, a hook), and a knocked-out hole for the
  eye's pupil. The d-pad's `&#9650;` and the turn buttons' `&#8630;` were text
  glyphs a font draws about eight pixels across in the middle of a 58px cap -
  **which is why the turn buttons were reported as missing** - and are solid
  SVG arrowheads and circular arrows now.
- **`.ln`, not `.st`, and that is the third time.** `.st` was already the gold
  star in a shop price, so an icon path carrying it came out stroked in
  `--star`. Check any new class name against what is already in
  `css/style.css` - see `.mboss`/`.boss` on the map and `.home`/`.athome` on
  the home screen.
- **Every ad button carries the video mark** (`adIcon()` in `js/18-ui.js`) -
  a play sign in a screen, which is the drawing everybody already reads as
  "this plays a video". One helper rather than five copies, because there are
  five ad buttons and they must not drift. It is `fill:currentColor`, so it
  takes the button's hue for nothing.

## The brief - tried on a trial and a boss, and taken out again

For a while a trial and a boss each opened with a full-bleed card explaining
themselves, twice per kind and then never again. The machinery worked and the
reasoning still holds: `cardPut()` answers `screenUp()`, and `screenUp()` is
what both clocks ask before they run, so the fight was genuinely stopped
while the card was being read.

**It stopped being needed, and that is the interesting part.** The falling
blocks, the folding telegraph and the replay each ended up saying on the
board what a paragraph of the card had been saying in words - and once all
three landed, the card was explaining a picture the player was already
looking at. A card like that is read once and dismissed unread from then on,
which is worse than not having one.

What is left is one sentence per kind, in the level's own `hint`:

| | |
|---|---|
| a trial | *Three lives, three places to visit.* |
| a boss | *A game of catch: whoever shifts the other into their own square first wins.* |

Each adds one short clause for what is particular to that arena - the
spikes, the glass, the crate, the high ground - and nothing else. **"Shifts"
is deliberate**: it is the word `cue()` already speaks for the fold ("2D
shift"), so the hint names the verb the way the game does everywhere else.

Restoring the card is a `cardPut(h, p, "brief")` from `loadLevel` plus a
counter in settings, exactly as it was. `cardOwner` is the seam it needs - a
card raised by anything other than a tutorial step must not advance a step
nobody completed - and it is deliberately still there.

---

## The map

**The level picker is a path, one section at a time.** A run of levels, a
trial partway in, a boss closing it - tabs across the top, a winding trail
below, drawn from `SECTIONS` and `LEVELS` exactly as the old list was. No
level data changed to make it.

- **A section's colour runs the whole way through it** - tab, header, bar,
  the lit trail and the solved nodes - so a finished section is its own chain
  rather than another stretch of the same green. The rim, ink and lip are
  `color-mix`ed from that one hue, which is what keeps a pale section (glass
  blue) and a dark one (spikes red) both legible without hand-picking three
  values each. **No section may be violet or amber**: those two belong to the
  boss and the trial in every section, and `V · EXTRA` had to move off violet
  for exactly that reason.
- **Boss and trial are different shapes, taken from the game's own world.**
  They used to be `#ff8a3c` against `#e0a03c` - the same hue two steps apart,
  which at 60px on a dark ground is not a distinction. A **boss is a hexagon**,
  which is what a cube looks like seen corner-on: the silhouette of the game's
  own piece, ringed by three arcs for its three phases, in violet. A **trial is a
  diamond inside a clock** - the square on its point, an open ring around it
  with three pips on it, in the amber that already means a core on a clock.
  An ordinary level is a bare disc. Turn the colour off and all three still
  read. The violet follows through to `.bcores` in the HUD.
- **The trial's sweep used to be a bar drawn through the diamond, and it read
  as a strikethrough.** It overshot the shape on both sides, which is not what
  a plane passing through something looks like - it is what a cancelled thing
  looks like. The ring says the same fact better (a trial is the level on a
  clock) and says a second one nothing on the map ever said: the three pips
  are the three cores. It is deliberately close to the boss's ring, both being
  landmarks on a clock, and is told apart by three things at once - the shape
  inside, the colour, and **motion**: the boss's arcs are still and count
  phases, the trial's ring turns until you have beaten it. The trial node is
  also 68px against a level's 58 and a boss's 78, because the ring reaches
  past the shape and at 58 the pips landed on the trail.
- **The section fills with its own colour to the height of the stars you
  have taken**, and that is the progress bar the map actually wants - the
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
  straight bright line across the map read as a *divider* - something the
  layout was doing - rather than as the surface of anything. It is one period
  of a sine masked onto a 14px crest, tiling seamlessly because it starts and
  ends at the same height and the same slope, and it is a **mask** rather than
  a drawn shape so the crest can take the section's colour: a data URI cannot
  read a custom property.
- **At every star the crest becomes the flood.** The trail begins below the
  section card, so a fill that stopped at the trail's top left the head of a
  finished section dark - the same pseudo-element drops its mask and runs
  300px upward instead, and `.mcard` is `position:relative;z-index:1` so the
  water goes *behind* it rather than washing over its text.
- **A section paints itself when every level in it is on three stars.** The
  trail redraws as *one* continuous stroke and the colour climbs it from the
  first level to the boss, each node throwing a ring as the paint arrives.
  One stroke is forced: the paint is a `stroke-dashoffset` sweeping along a path, and the
  usual per-gap subpaths would sweep every gap at once. It is traversed from
  the end of `pts`, because the trail draws top-down while the campaign runs
  bottom-up and the colour has to climb the way the player did. Nothing is
  remembered to make it replay - `mapDraw` rebuilds the trail's innerHTML
  every time, so the animations restart by construction.
- **One animation per node, and it was measured rather than guessed.** The
  nodes used to scale *and* throw a ring, and running both put 46% of frames
  over 32ms against 26% for the same section un-mastered (Chromium at 6×
  CPU throttle, medians identical, the difference all in the tail). Either
  alone sits at that baseline; the ring alone on its own compositor layer
  comes in under it. The first guesses were wrong and the profile said so:
  `drop-shadow` filters on the animated stroke and on the nodes were removed
  first and changed nothing measurable, and parking the ambient cubes for the
  duration changed nothing either. **Both are still worth keeping** - a
  filter is repainted on every scroll of a finished section, not just during
  the celebration - but neither was the answer. Halos are `box-shadow` now,
  which composites.
- **Mastery cannot be bought, and that is what makes it worth drawing.**
  `sp.got` is summed through `starsForRecord()`, which reads `progress` and
  nothing else, and a skip is deliberately not in `progress`. `PROLOGUE` can
  never be mastered because `sectionSpans()` skips tutorials, so its `max` is
  0 - a section that awards no stars has none to collect.
- **The `PREVIEW` switch that forced the finished look on is gone from the
  menu**, and `masteryPreview()` returns false. The machinery it drove is
  untouched, so restoring the row restores the preview. The win card's
  mastery banner deliberately never went through `sectionMastered()` - it is
  derived from `starsGained` - so a preview could never fake the one moment
  that is actually news.
- **The landmarks are SVG, not `clip-path`.** A clipped box loses its border
  and its shadow, and the rim and the lip are what make a node look pressable;
  `mapShape()` emits the polygon, its lip and its ring as one `<svg>`.
- **The map's node classes are `mboss`/`mtrial`, not `boss`/`trial`.** The
  HUD's lives bar is `.boss`, which sets `pointer-events:none` - a map node
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
  past. `V · EXTRA` keeps its own older gate on top - every boss down.
- **Skips live in `skips`, deliberately not in `progress`.** `progress[name]`
  means "you beat this" and the whole star economy reads it that way, so a
  skip in there would be a purchase leaking into the currency. Kept apart, a
  skipped level is worth zero stars *by construction* rather than by
  remembering to subtract it. Verified: skipping does not move `starsEarned()`.
- **ANY LOCKED LEVEL CAN BE OPENED, ONE AT A TIME** (`mapSkippable`), plus a
  whole section at its first level (`mapSectionSkippable`). It used to be
  landmarks only - the boss closing the section you were already in - on the
  reasoning that a skip should carry you past a wall rather than past the
  levels. The wall is not where that assumed: somebody stuck three levels
  from the end of a section could not buy past *that* level, only past the
  boss behind it, which is harder. What keeps the old reasoning intact is
  that **a skip still opens exactly one door** - `mapReach()` counts solved
  levels and ignores skips, so nothing behind the one you bought comes with
  it, and getting past two costs two ads. `V · EXTRA` still cannot be bought
  open: that shelf is what beating every boss is *for*, and it is a reward
  rather than a rung on the progression.
- **`mapReach()` counts solved levels only, never skips.** Counting a skip
  would drag the rolling window forward with it and quietly hand over
  everything in between - the exact levels the skip exists to leave for later.
- **THE GAME OFFERS THE SKIP EVERY THIRD LOSS ON A CLOCK LEVEL.** `fails`
  counts full losses per level - lives run out, not a life spent - persisted
  beside `skips`, moved by `LEVEL_RENAMES` like everything else, and cleared
  the moment the level is beaten, so it tracks the *current* run of failures
  rather than a lifetime total. Every `STRUGGLE_OFFER` (3) losses,
  `struggleOffer()` puts up the way past.
- **It used to escalate, and the first rung went with the Pace setting.**
  The old order was the order a person would actually try: slow the clock
  first, offer the skip only once slowing had run out. That reasoning was
  right and it belonged to a menu row that no longer exists - the fights are
  tuned per fight now - so one offer is left. **Three became five with it**:
  three is the right cadence for cheap advice you can act on and carry on
  playing, and too eager for a card whose only button is "give up on this
  one". Three losses is a player still learning the beat; five is a player
  who is stuck.
- **AND FIVE IS BACK TO THREE, on the owner's call.** The argument above is
  about the wrong risk. The card is not a wall: it offers the skip and KEEP
  TRYING side by side, so a player who is still learning the beat presses
  KEEP TRYING and has lost nothing by being asked. Waiting for the fifth
  loss is how somebody puts the game down on the fourth. The card's own
  sentence counts the losses it is standing on, so it says "beaten you 3
  times" without anything else changing.
- **EVERY offer carries DON'T SHOW ME AGAIN, and it silences all of them**
  (`settings.noSlowOffer`, cleared by the settings reset). It is global
  rather than per level: somebody who does not want the game suggesting
  things does not want it on the next boss either. It used to be on the slow
  card only and only from the second one, and `noSlowOffer` was read as the
  argument to `paceSlower()` - so pressing it silenced the slow offer and
  then **fell straight through to the skip offer underneath**, which had no
  opt-out of its own. Reported from a playtest, in those words: the button
  did not work and the game kept asking. The flag is asked at the top of
  `struggleOffer()` now, before it has decided anything. **It keeps its name
  though there is nothing slow left to refuse** - it is persisted, and
  renaming it would silently un-silence everyone who has already pressed it.
- **The offer goes up after the reset, not instead of it.** The board is back
  and KEEP TRYING is right there, so it is a door rather than a wall. The
  skip reaches `grantSkip()` and nothing else, so it inherits the rule - ads
  buy progress, never score.
- **`grantSkip(name)` is the single call site a rewarded video needs** for a
  level; `grantHints(n)` is the one for the hint pool. Neither is gated on an
  ad here, because there is no provider yet and a button that silently did
  nothing would be worse than one that plainly works. Wiring the
  SDK means calling it from the completion callback and changing nothing else.
- **The tutorials get a `PROLOGUE` section** so the map has somewhere to put
  them. Its `at:0` shifts no other marker - these are array indices and every
  later section keeps the index it had.
- **The map opens on the furthest thing you have dealt with in the open
  section**, not on the foot of the trail. `mapFocus()` used to jam the
  scroll to the bottom whenever the `here` node was in another section -
  and the trail climbs, so the bottom is level one and the boss was off
  screen above. Reported as not being able to see the top of the levels.
- **A caption wraps, and its width is the room its own node leaves it.**
  `nowrap` survived at 9.5px and did not at 13: the two longest names in
  Section I ran past the right edge and were clipped by `.mbody`. The cap is
  computed in the same loop that places the caption, from the node's own
  half-width, because a flat percentage still overflows for a node far out
  to one side.
- **The trail climbs.** The first level of a section sits at the bottom and
  its boss at the top, laid out from the last index down rather than mirrored
  afterwards - everything hung off a node (its stars, its label) is positioned
  relative to that node and would otherwise need un-mirroring one by one. A
  segment is lit by the *lower* of its two indices, because the trail draws
  top-down while the campaign runs bottom-up. `mapFocus()` opens on where you
  are, or at the foot of a section you have not started.
- **The menu, the wardrobe and the map share their furniture** (`.panel.tall`,
  `.phead`, `.pcard`, `.pgo`, pill `.tab`s). The map got its language first
  and the menu read as a debug screen beside it - eleven identical outlined
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
  face size suggests - `P()` spans `(px - pz*k)` over `[-2,2]`.
- **EVERY SECTION HAS WEATHER BEHIND ITS TRAIL** (`mapWeather()`), on the
  same 2D canvas the ambient cubes already use - no second context, and it
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
    inward as they climbed - up to 58px a segment over nine segments - so the
    two of them met in the middle and crossed the trail. The walk is vertical
    now and the lateral movement is a wobble around a line near each edge:
    they lean, they are not straight, and they never converge. Seeded, so a
    section's tree is the same tree every time it opens - the same reason the
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
  owned, so the intro card - which says in one sentence what the game is -
  stays the first screen and `BEGIN` goes straight into the tutorial.
  `nothingBehind()` asks `progress`, `skips` and the session, deliberately
  not `starsEarned()`: somebody who walked into a level and quit has a
  session and no stars, and is plainly not seeing the game for the first
  time. The home screen is a **launch** screen; finishing the tutorial still
  goes to `01`, because `NEXT LEVEL` is the next level, always.
- **It is a screen, not a panel, and it sits at z-index 11 - *under* the
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
  is genuinely nothing behind you - the word has to match what the button is
  about to do.
- **The plinth is built off the boot path, and that was measured.** A second
  WebGL context is not free, and `homeShow()` runs the moment the saves land,
  while the sting is still playing. On the **artifact** build at 4× CPU
  throttle, boot-to-sting was 715ms without the home screen and 786ms with
  it; deferring the stand until the sting is over closed the gap (643 vs 704,
  nine interleaved runs each, distributions overlapping). Nothing is lost by
  waiting - the buttons are the point and they are ready immediately, and
  while the stand is missing its canvas is invisible anyway, because
  `previewShow` paints its scene in the same void the page is painted in.
  `homeCaseSoon()` polls rather than hooking `splashEnd`, because `homeShow`
  is also reached from the menu long after the sting, and one path is easier
  to keep right than two.
- **Measuring this needs the artifact build, not `index.html`.** From source,
  the Google Fonts `<link>` is render-blocking and dominates everything -
  12.6s in a sandbox with no network. `build-single.js` strips the preconnects
  and the font link, so the published game never pays it, and any boot timing
  taken against the source file is measuring the font CDN.
- **`nothingBehind()` is the one first-run answer**, in `16-panels.js` beside
  the other progress helpers. Boot asks it to choose between the intro card
  and the home screen; the home screen asks it to choose between `START` and
  `CONTINUE`. It is deliberately not "no stars earned" - a level beaten with
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
  `showPanel()` calls `previewStop()`, which is right - the stand is behind an
  opaque panel - but nothing restored it, so closing the map over the home
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
  class and a bare `.home` selector matches `<body class="home">` too - the
  body inherited `position:fixed; display:none` and the entire document
  measured 0×0, with `getComputedStyle` still reporting `flex` on the overlay
  because a computed display survives an ancestor being hidden. Same
  collision as `.mboss`/`.boss` on the map.
- **`screenUp()` is the shared "a full-bleed screen is in front of the game"
  test**, and it exists because an overlay swallows taps by being there while
  a keyboard does not care what is on top. Without it the arrow keys walked
  the player around a level nobody could see, behind the title screen - which
  was already true behind the intro card. The two clocks ask it too, so a
  boss cannot run behind a home screen opened from the menu. The win card is
  deliberately **not** in it: a solved level is inert through `levelOver()`,
  which re-shows the card rather than swallowing the input.
- **The shop is on the screen and every tile is live.** Two scrolling rows,
  SHAPE and COLOUR, the whole catalogue in cost order. It started as three
  locked items with prices and *no behaviour* - a drawing, with the wardrobe
  button as the way in - and that was wrong the first time anybody used it:
  **a thing shaped like a tile invites a press, and a press that answers
  nothing is worse than showing no tiles at all.**
- **Which thing a tap does falls out of whether you own it.** Owned goes
  straight onto the character - equipping costs nothing and is undone by
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
- **`--player` is not a constant** - `applySkin()` rewrites it from the
  equipped colour - so the equipped tile's ring is drawn *detached*, with a
  1px void gap, or it is the swatch's own colour drawn on the swatch and
  invisible on the single tile it exists to mark. Its glow is `color-mix`ed
  from the same variable for the same reason: it was a literal rose `rgba()`,
  which is what `--player` happened to be the day it was written.
- **The rows are tapped on `pointerup` with a travel test**, not through
  `tap()`, which fires on `pointerdown` and calls `preventDefault` - that eats
  the drag that scrolls them. They also hand back `touch-action`, which is
  `none` on the body to keep iOS off the two-finger turn; the home screen is
  the one place no game gesture applies.
- **`hidePanel()` syncs the home screen as well as restarting its stand.**
  You may have just bought and equipped something in the wardrobe, and the
  strip, the plinth and the star count all have to know.

---

---

## The story - the Census

**The plane is not empty.** Everything this world has ever flattened is still
in the silhouette, and folding is not passing *through* 2D - it is standing in
it, briefly, with them. The hunters are its residents: they cannot leave and
you keep going back and forth, which is what they are counting. The line you
share with one is the only thing that exists in both places at once, which is
why it kills either of you.

**It exists to justify a rule the game already had.** The boss's kill rule is
the fifth design and mechanically settled; what it lacked was a reason. Every
sentence below is chosen to explain something already on screen - glass is
cover *because* it casts nothing and so leaves no record, crates matter
*because* editing what they see is the one thing they cannot do - rather than
to decorate it. **A story beat that does not explain a mechanic does not go
in.**

**Eleven sentences, and never one that blocks play.** The game's voice is
`Poisoned Column` and `Absent Floor` - spare, technical, and it does not
narrate. So the fiction lives in six places now and each holds one line or
one scene:

| Where | What | Lives in |
|---|---|---|
| intro card | the premise, one line under a rule | `index.html`, `.introstory` |
| section card on the map | one line per section | `SECTIONS[].story` → `mapDraw` |
| boss win card | one line per fight | `LEVELS[].won` → `win()` |
| boss names | the four stages of being counted | `LEVELS[].name` |
| the opening cutscene | the house, and who the census took | `STORY.open` in `js/22-story.js` |
| the fire, after BOSS II | the father, and what the plane did to him | `STORY.fire` |
| the closing cutscene | the plane, and who is still in it | `STORY.end` |

**THIS ROW USED TO SAY "there are no cutscenes and no journal", AND THAT IS
REVERSED, on the owner's call.** Worth being precise about what changed,
because the reasoning behind the old line is still good. It was never an
argument that cutscenes are bad; it was an argument that a story slice with
no subject should be small enough to delete in one edit. What the two scenes
add is the subject. The census was always coming to count you; now you have
watched it count two people, and every line already in the table above means
something it did not mean before - the intro card's "Everything this world
has ever flattened is still in there" is a fact about nobody until you have
seen who was flattened, and it is the last caption of the opening scene for
exactly that reason.

**And the game is called `I'm Just A Cube`, for the same reason.** It was
`Orthogonal`, which names the mechanic. This one names the character, which
is what the story is now about. Four player-visible strings carry it - the
`<title>`, the home screen's `.htitle`, the intro card's `<h2>`, the map's
header - and two things that look like the name are not it and must not be
renamed: the `orthogonal:*` localStorage keys, which are every existing
player's save, and `dist/orthogonal.html`, which is the file the published
artifact link points at.

- **`story` is a second field beside `sub`, not an extension of it.** `sub`
  says what the section teaches and is what a player needs to choose one; the
  story is why they want to. Kept apart, the fiction can be cut without taking
  the description with it - which is the point of a slice this small.
- **The bosses are named for the census, not the arena.** `The Sighting`,
  `The Record`, `The Search`, `The Census` - you are seen, written down,
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
  as `textContent`, so it is `esc()`d - and the section-mastery banner below
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

## The two cutscenes

**A cutscene is a level, played by nobody.** `storyPlay()` builds an ordinary
level object - blocks, a start, a `theme` index - marks it `tutorial:true`
and hands it to `enterPlay()`. The sky, the grass, the birds, the depth
shading, the outline, the fold tween and the camera are all the game's, and
none of them know a cutscene exists. On top of the board sit actors: cubes
from `buildPlayerMesh()`, the same call the wardrobe's display case uses, so
the family is made of the piece the player is. `storyFrame()` is handed the
camera basis by the render loop and projects them with exactly the maths the
player is projected with, which is why they fold when the world does.

**Three approaches were on the table and this one wins on one argument.** A
second three.js scene (the wardrobe-case pattern) buys a free camera; CSS-3D
(the sting's technique) buys cheapness. Neither can do the ending: "they were
in the 2D dimension" is not something this engine has to depict, it is
something it can *perform*. The player presses `GO 2D` and his mother is
standing in the silhouette beside him, because she is an actor whose opacity
rides `flatT` and whose `u` is one square from his. Any other renderer fakes
the one moment the whole game has been building the vocabulary for.

**The abduction is the fold, and that is the rule, not a flourish.** The
census does not take the parents away in a puff of light. The parents stand
either side of their door, the two officers come up the path side by side
(it is two wide for this) and one steps in front of each: father and officer
in `x=2`, mother and officer in `x=4` - and the world folds. Two things in one
silhouette column, twice over, is rule 4, and it is the boss kill rule, and it
is the only way anything in this game dies at somebody else's hand. (It was
four in one column at `x=3` in single file; the owner asked for them abreast
and for one to take each parent at the same moment.) The son lives because
he had stepped outside to say hello, so his column was empty; there is
nothing else in that world above the ground at `x=6`. It is on screen before
it is in words, which is the standing rule here: **a story beat that does not
explain a mechanic does not go in**, and these two are the mechanic.

**The parents get a beat of their own, and they are bigger.** They were 1.18
against the son's 1.0, and the scene left in its second beat - so they were
furniture until the officers arrived, and were reported as never really seen.
They are 1.4 now, their rim is nearly solid where the player's is half (an
actor is one of eight cubes on a wide board, and the black one is drawn
against a night meadow), and the scene opens on the household with a line
that says how many live in it before spending four seconds on him saying
goodbye to each of them. "Three of them lived here" is what makes the viewer
count the cubes, which is the trick: three is a number the ending can take
two away from.

**The son is the player, not an actor.** He is `playerMesh`, walked by
writing `player.x/z` and letting the render loop's own lerp carry him - so he
moves the way the game moves and wears whatever skin is equipped. The cube in
the house is the cube you have been playing.

**The verbs are held, not the buttons.** `storyHolds()` sits at the top of
`press` / `rotateView` / `doFlatten` / `doUnflatten` beside `bossHolding()`,
which is the tutorial's reasoning exactly: buttons, keys and gestures all
funnel through those four, so a gate written there cannot be walked around.
It takes the name of the verb the current beat is waiting for, which is how
the ending hands back `GO 2D` and nothing else. Three game keys act on the
board rather than through a verb - restart, hint, undo - and are held in the
key handler instead; Escape skips.

**The scene decides nothing about the controls; the caption follows them.**
The ask beat writes `{do:2d}` and renders through `tutWords()`, so a gesture
player is told to double-tap and a button player is told to press. The bar is
brought back for the button layouts only. Forcing it up on `ui-none` as well
was the first version, and it put two different instructions on one screen.

**Ground is only where somebody stands.** The first house scene laid a solid
14×11 lawn, which in an orthographic view tilted 28° above the horizon is not
a lawn but a *wall* of grass - every row of depth draws a little higher than
the one in front of it, and eleven of them stack into a cliff with the houses
buried in it. The game's own levels never show this because they are one or
two blocks deep. Two floors, a strip and a path, and it reads as a place.

**A house is a roof, windows, and a colour that is not the ground's.** Shape
alone was not enough and three versions proved it. A three-walled box with a
beam over the opening read as terrain; a pitched roof over it read as a fir
tree, because a cone in this section's green is a conifer; cutting a door and
two windows into the face helped and still left a green mound. What finished
it was `L.tint` - the per-cell colour list already in the engine for
`00 - First Landing` - painting walls a warm tan and the roof and chimney
terracotta. It multiplies the surface texture where the section's block
colour did, so it inherits the depth fade and the settle toward ink for free,
and it is deliberately not a block kind: it changes no rule and means
nothing. Plaster and tile are decoration, and this is the one place in the
game entitled to some. The tint has to be *saturated* - a pale cream over the
grass surface's bright green band comes out olive, and a multiply can only
darken.

**And the fifth version was a texture, not a shape.** The tan-and-terracotta
house was reported as still not looking good, and the screenshot said why:
every wall block wore the meadow's grass texture, so every course carried a
bright green lid, and five courses of green-lidded brown under a brown
pyramid is a terraced hill whatever the sides are painted. The tint could
darken the sides and could do nothing about the lids, because a multiply
cannot remove a band the texture draws. So a painted cell now wears plain
stone: `paintedCell()` in `js/10-render.js` builds any cell in the tint
table on `TEX.stone`, the near-white grain the prologue wears, and the tint
lands on that. Two things follow. The wall no longer has to beat the green,
so it can be the pale cream it wanted to be from the start; and the roof can
be a deep red that is a different *family* from the wall, so the edge between
them is what says building. The dunes behind the houses went in the same
pass - ochre over plain stone was flat brown blocks, and once the scene was
shot house by house they stood either side of the house like a pair of
wings. The section's own treeline is the distance now.

**And the sixth turned the house round.** With plaster walls and a red roof
the house was reported as still not a house in the volume, "only when I go
2D". The screenshot agreed and said why: every version so far had been a
CUTAWAY - the wall with the door at the back of the floor, the near side
open so the family could be seen inside, the roof a one-row gable over the
back wall - and from the game's camera that is a U of wall with a decorated
back. The fold reads because the fold is the one view that collapses the U
onto its facade. So the house is now solid and faces the camera: the facade
is the row nearest it, everything behind is wall, and nobody is inside - the
family stands on the strip in front of their own door, which is where you
stand to say goodbye anyway. The roof was first run at full height over
every row of depth, on the theory that a row one square further from the
camera drawing half a course higher is the slope of a roof seen from the
front. It is not; it is a staircase, four stepped tiers of tile on each eave,
and it was reported as off. A roof cannot recede without stepping in this
projection, so the facade row carries the whole gable and the body behind it
is built lower: one course at the row behind, two at the rows behind that,
the amounts a block needs to sit under the gable's top edge (the working is
in `house()`). The camera sees one clean gable end; the fold still projects
the body inside the facade's silhouette. Four facade blocks are out on the
owner's call, to see how it looks: the bottom two courses one in from each
end, the blocks directly behind the parents in the first frame, so the
middle three columns of the facade are a set-back porch with the door at
the back of it. (The corner blocks came out first, on a misreading of which
four, and went back.) The
door and the two windows are cut through every
row of depth: the first solid house painted the windows a night-glass blue
and cut the door one block deep, and that was reported as off against the
cutaway's real holes. The holes are what a house has that a hill does not,
and a painted square is a decal on a box. Cut through, they are openings into
a dark interior in the volume and, because nothing stands behind them along
the view axis, still holes in the plane, so the folded house is the one the
cutaway drew. The chimney is two bricks beside the ridge so it stands above
the roof rather than level with it. The census still folds column `x=3`, which is now the doorstep, the foot
of the strip and two squares of path rather than the doorway, the step and
the path. One thing bit: `foldPeril()`, the crush warning, tints the blocks
in the player's silhouette column his own colour, and in front of a solid
house every square shares a column with the wall, so the doorway lit pink.
It returns null while a scene runs; the verbs are held, so it was warning
about a fold nobody could make.

**A scene is shot, not surveyed.** `recomputeBounds()` fits the whole arena
to the screen, which is right for a puzzle and wrong for a scene: the street
is fourteen squares wide, and fitted to a phone the family was a quarter of
the screen high, three small cubes in a picture that was mostly sky. A beat
may now call `stFrame(box)` with two board corners and the renderer fits that
box instead (`storyFrameBox()`, guarded with `typeof` like `guidePoint()`,
because the story file loads after the renderer). The opening has four shots
in `ST_SHOT`: our house alone for the goodbyes, the whole street for the
hello and for the neighbours' walk at the end, the house and the path for the
census climbing it, and the door - our house, the door column and the son's
square at x=6, which is everything the fold is about - from the knock through
the fold. The renderer's own lerp toward `centerT` and `viewSizeT` carries
each change over about half a second, so a reframe is a camera move rather
than a cut, and the wide frame is set a beat before the wide moment so it has
settled when the moment comes. The box is a fit target, not a clip; blocks
outside it still draw, off centre. The fire is shot wide, close, wide: it
arrives on the whole shelf so the wall of fire is read first, moves in on
the two of them for his first line, and pulls back to the empty shelf
(`stFrame(null)`) for the last line once he is gone. The ending is close from
its first frame - one cube on an empty platform with room for exactly one
more - and a scene's first shot is applied in `stArrive()`, just before its
board loads, not in `storyPlay()`: a travelling scene spends its first beats
on the arena it is leaving, and a frame set early would fit that arena to
the wrong box on a resize.

**And the roof lives at z=0 only.** Run back over the interior it becomes an
overhang, and an overhang in this projection is drawn in front of the face it
belongs to: screen height is `0.885y − 0.465z`, so a roof block two rows
nearer the camera lands almost exactly on the wall course it is meant to sit
above. Photographed, the house had a roof and no windows, because the roof
was covering them.

**A scene replaces a win card; it does not follow one.** BOSS II and BOSS IV
each carry a scene (`interlude:"fire"` and `ending:true`), and `win()` asks
`storyAfterLevel()` *instead of* showing its card. Everything else `win()`
does still happens - the record, the stars, the section payout - and only the
card is skipped, and only the first time. Two reasons. A card in front of a
scene is a door in front of a door; and the scene begins on the arena you are
standing on, so a full-bleed overlay would have to be dismissed before the
camera could move.

**And it travels to its board rather than cutting to it.** `from:"here"` puts
five shared beats (`ST_ARRIVE`) in front of the scene: you hold a moment on
the arena you won, it folds flat under you, the screen goes dark, `stArrive()`
swaps the board behind the dark, and somewhere else fades up. The move between
the two places is the game's own verb, which is the argument the abduction and
the reunion are already built on. A replay out of the settings panel has no
arena it just won, so it drops the five beats and arrives outright.

**The father is a Shard, and that is his line delivered before he says it.**
Shapes are the wardrobe: the player has spent four sections looking at a
catalogue of them and picking one. A father who left as a cube and is standing
in the fire as a Shard has said "the plane changed me" before he opens his
mouth - and it sets up the ending, where his mother says the same thing about
the player. He is drawn among real fire blocks, kind 4, the piece that section
teaches, for the same reason the fold is the real fold.

**The son is his mother's colour, lightened toward the neighbours'.** `ST_SON`
is halfway between Pink and White. Nothing anywhere says what that means and
nothing ever will; it is there for whoever puts the two houses side by side
and looks at the three colours in the first one. It is also why the opening's
son is a repaint of `playerMesh` rather than the equipped skin: in the house
he is a child, before the player has chosen anything, and `storyStop()` calls
`applySkin()` to put back whatever they are actually wearing.

**And at the ending his mother remarks on what he came back as.**
`stSkinLine()` is the one line in the game that reads the wardrobe, and its
priority order is the content of it. A `reward:true` shape cannot be bought -
one per numbered section, granted for every star in it - so wearing one is the
only thing in the catalogue that is evidence of what you *did* rather than of
what you liked: *"You came back stronger than you left."* Anything else off
the default cube-and-Rose is a choice, which is a different sentence:
*"You have changed. I would know you anywhere."* And arriving in the cube you
started in is the third, which is not a lesser ending - it is the one where
the only thing that changed is you: *"Look how you have grown."*

**Seen once, and the flag is in the settings whitelist.** `seenStory1`, `2` and `3`
go through `settings`, which means they must be read back in
`loadSettings()` or they do not survive a reload - without those two lines the
opening plays on every launch, which is the worst version of a cutscene there
is. Skipping counts as seeing. `RESET SETTINGS` deliberately does not clear
them: it puts preferences back, and whether you have watched the opening is
not a preference. `REPLAY STORY` in the settings panel is the way back, and
`WATCH THE ENDING` sits beside it - always, on the owner's call. It is a
spoiler with a button on it, and that was the argument for hiding it until
the ending had been reached; a door that appears only once you no longer need
it is not a door, and it is under More next to `RESET SETTINGS`, about as far
from an accident as a button gets. **A replay is not a first watch**, and
`storyPlay(id, replay)` is what keeps that true: it does not mark the scene
seen, so somebody who looks at the ending early still gets `FIND THEM` on
BOSS IV's card and still gets the scene at the moment it is worth something;
and it hands back to the screen the panel was opened over rather than to the
scene's own destination, because the opening ending in the first tutorial is
right the first time and is somebody being thrown out of their level the
second.

## The neighbour

**He is the white father from the house next door** - the one who walks over
to the boy at the end of the opening - and he is standing on every ordinary
board of I · NATURE. Pressing him gets a piece of advice about the level he is
standing on. He is not on a trial or a boss: a bystander in an arena is a
piece the player has to work out is *not* a threat, at the exact moment the
game is teaching them what a threat looks like. And he is gone after section
one, which costs the fiction nothing - the neighbours took the boy in, so of
course they are around at the start and gone by the time he is in the fire.

**He is decoration, and that is forced rather than chosen.** Nothing in
`resolveStep()`, `makeRules()` or `solve()` knows he exists. `CLAUDE.md`:
*"Death is solver-equivalent to a blocked move. resolveStep() is shared by the
game and the solver, so they can never disagree; keep it that way."* A friendly
obstacle standing on a board would be a piece, a piece is a rule, and a rule
the solver has not been told about is a level whose par is a lie. So he cannot
be stood on, walked into, folded into or crushed, and `node tools/verify.js`
has nothing to say about him because there is nothing to say.

**He stands on his own square, off the board.** The first version put him on
one of the level's own blocks - the one furthest from the start and the goal.
It was safe, because nothing knew he was there, and it still read wrong: a
white cube sitting on a square of the puzzle is a square the player has to
look at and rule out, and on the tighter boards he was inside the working
area whatever the scoring said. He has a plinth now, two clear squares past
the level's `+x`/`+z` corner at its own floor level, and the plinth is a
mesh this code draws rather than a block added to `L.blocks` - so the level
is untouched and there is visibly nothing between him and the puzzle. The
slab is drawn half a block high on purpose: a full cube out there would look
like a piece of the level that had come loose and somebody would try to fold
onto it.

`recomputeBounds()` adds `guidePoint()` to the extents it frames. That is the
only line in the renderer that knows he exists, and without it the camera
frames the board and leaves him past the edge of the screen; the cost is that
the board is a little smaller on the levels he is on.

**A corner, not an edge, and that took a photograph to find.** The first
plinth was two squares past the `+x` end of the board, halfway along its
depth: clear of the puzzle in the view a level opens in, and standing *inside*
the puzzle in two of the other three. The cause is that the offset was along
`x`, and `x` is screen-right in only two of the four views - in the other two
it is DEPTH, so "two squares to the side" becomes "two squares towards the
camera", which is on top of the board.

`09 - The Rotation` was the first level it was reported on, and the reason was
read off it wrongly: the level that teaches the turn is not a special case,
it is simply the first level on which a turn is possible. Every
rotation-unlocked board he stood on had it, and the owner found it again on
`13 - Not a Simple Walk` - one press of the turn button and the neighbour is
in the middle of the level in front of the goal.

The fix is to offset him on **both** horizontal axes at once, past the
`+x`/`+z` corner. Screen-right is `AX[view].r`, which is `±x` or `±z`, so one
of his two offsets is the sideways one in every view: `+x` carries him right
in view 0 and left in view 2, `+z` carries him left in view 1 and right in
view 3. One static cell, no per-view placement to keep in step with the
camera, and nothing in the renderer to re-run on a turn. It costs two cells of
framed depth as well as two of width, which is only a cost at all on a board
deeper than it is wide.

He is also taken off `09 - The Rotation` outright, and that stands on its own
reasoning rather than on this bug: it is a teaching level, and a teaching
level already has three voices.

**And he is not on a teaching level.** He turned up in PROLOGUE offering
"double-tap to drop the world flat" to somebody the game had not taught the
fold to yet - advice about a verb three screens before it is introduced,
delivered over the top of the lesson that introduces it. A teaching level has
a coach, a ghost hand and a guided lock; it does not need a fourth voice. He
starts where the teaching stops.

The test is `L.tutorial`, not "is it PROLOGUE", because the second place this
bites is inside I · NATURE and it took playing the game to find. `09 - The
Rotation` is the level that hands rotation over, and `guidePlinth()` puts him
two squares off the `+x` end of the board and nowhere else - which is out of
the way in exactly one of the four views. Every level before `09` is
`rotate:false` and cannot turn him into the shot; `09` is the level whose
whole job is teaching the player to. So the lesson's own new verb swings a
white cube in front of the puzzle, on a board that already has a ghost hand
and a lock on it. He comes off it, and the camera stops having to frame his
plinth as well, so the board is visibly bigger there into the bargain.

He stays on `10`–`14`, which can turn him into the shot just as easily. That
is a judgement rather than an inconsistency: those levels have a line worth
the occasional awkward view, and none of them is the level where the player
is finding out what turning does.

**He is pressed on a deferred single tap.** Tapping the world is already spoken
for - a double tap is the fold, in every layout - so a first tap that lands on
him arms a bubble for `DBL_MS` and the second tap cancels it (`guideArm()` and
`guideCancel()`, called from `13-gestures.js`). The fold always wins the race,
which is the right way round: the fold is the game and he is a conversation.
A single tap did nothing anywhere else in this game, which is exactly why
there was room for this one.

**Three ways he speaks, and each is where the player is looking.** The tip is
a bubble over his head, projected from his world position every frame so it
follows him through a turn and a fold.

**The box and its tail are placed separately**, and for a while one number did
both, badly. He stands off the *side* of the board, so the bubble's anchor is
near the edge of the screen and a centred box hangs past it; the first fix slid
the whole box back inwards, which kept it on screen and moved it off him. On a
phone the box ended up a third of the screen to his left, with its tail
pointing at open sky and the box itself over the puzzle - reported as exactly
that, with a photograph. So `guideFrame()` writes the box's LEFT edge where it
fits and `--tail` wherever he actually is inside it. The bubble is above him in
every case, and near an edge it grows *inwards from him* rather than sliding
away. The column is capped at 30ch for the same reason: it now extends over
the board rather than off the screen, so a narrower box is the one that reads. The cheer is a line on the **win
card**, because by the time a level is solved the card is what is on screen
and a bubble behind it is a line delivered to nobody - every third level, so
he turns up rather than being wallpaper. And the one line he says unprompted
is after ten losses: the game has already offered a skip twice by then
(`struggleOffer()` fires on every third), so this is not a third offer, it is
somebody saying out loud that taking it is allowed. That bubble is a button -
pressing him again opens the card.

Every line renders through `tutWords()`, so he names the player's own
controls like the coach and the primer do.

**The tip is about the level he is standing on.** He used to carry a list of
twelve general facts about the game and hand out `lvIndex % 12` of them. It
worked, and it was wallpaper: whatever he said, he was saying it *near* the
puzzle rather than *about* it, and the player who pressed him on two boards
in a row got two unrelated facts in whatever order the modulo landed in.
`GUIDE_LINES` is one line per board now, and each one is that board's own
lesson said by a person instead of printed at the top of the screen - which
is the only thing a neighbour can offer that the hint line cannot. `12 -
Simple Walk` is where he mentions MY LEVELS, because that is the first board
with nothing else to say about it; `14 - The Silence Before the Storm` is the
last thing he says in the game, and it is not a tip.

**Keyed by level name, for the same reason progress is.** `SECTIONS[].at`
are array indices, so inserting a level shifts every one of them - an
index-keyed table would quietly start telling `05` about `04`, and nothing
in the game would ever say so. A name that stops existing falls through to
`GUIDE_FALLBACK` instead, which is a *missing* line rather than a *wrong*
one, and `tools/verify.js` fails the run on any key that is not a level he
stands on, so a rename is loud. The fallback pool is four lines that are true
anywhere in the campaign and name no piece: it is for the level somebody
inserts into I · NATURE next, and today nothing reaches it.

Nothing in the table may name a piece the player has not met. I · NATURE is
stone only, so water, fire, crates and amber are all spoilers there, and
worse, advice about a thing there is no way to try.

## The father, glimpsed

**Every twenty seconds on a fire level the game tosses a coin**, and on heads
something dark stands behind the board for six tenths of a second and is
gone. One time in ten it is the Shard he came back as; the other nine it is
the cube he left as.

**The odds are the point.** Nine times out of ten you see a shape you already
know, which reads as your father and is therefore not evidence of anything;
the tenth is the shape the fire scene will later show you, before you have
any way to know what it means. A player who never notices loses nothing. A
player who does gets to be right about it two sections later, which is the
only kind of foreshadowing worth putting in a game nobody is obliged to look
at.

He is behind and just over the board, against the sky, and he does not fold -
a glimpse of somebody who is not in this world should not obey its verb. Not
solid, not tappable, unknown to the rules: the neighbour's contract, for the
neighbour's reason. **Every offset is inside the frame**, and the first
version's were not: `fitViewSize()` frames the arena and nothing else, so an
offset of a whole board-width put him off the edge of the screen every time.
Photographed, the glimpse was perfect and invisible.

## The pack are the officers

`huntMesh()` was an octahedron: spiky, abstract, belonging to nobody. It is
the same near-black cube with the same red rim the census wears in the opening
cutscene, at the same values. Nothing says the hunters and the officers are
the same thing; the shape says it, from the first fight. **What the spin was quietly doing was making them findable.** Taking it away
left a near-black cube with a hairline rim on a dark board, and that came
straight back from a playtest. Three things replace it and none of them is
motion of the piece: the body is lifted off black to something with an actual
value, the rim goes from half opacity to near-solid, and an *aura* - a
slightly larger box of the hunter's own colour at low opacity with depth
writing off - puts a soft halo round it. The only movement left is the halo
breathing, which is a scale rather than a turn: it says *here* without saying
*spinning object*, and it reads at the edge of vision, which is where a
hunter usually is when you need to find it.

**And it does not turn.** The octahedron span, and the cube inherited the spin
for one build before it went. Nothing is lost: the state was never carried by
the spin alone - the cage is red or the goal's green, the telegraph draws the
line before a charge, the scale still swells. What the spin cost was the
thing these are now *for*. An officer standing in your level is a person, and
a person does not rotate on the spot. They are squared to the camera like the
player, so they are always seen face-on.

## The sting

**The logo is a fold.** `nadaz` starts as a cloud of cubes strewn through
depth, illegible for exactly the reason the game exists: an orthographic view
maps depth onto the screen, so blocks far apart in z pile on top of things
they have nothing to do with. Collapse that axis and all of them land in the
plane at once, and the cloud is a word. The sentence on the intro card behind
it - *things far apart in depth land side by side* - is demonstrated before it
is read.

**It is raised before three.js parses, and that is what makes it a loading
screen rather than a screen that appears once loading is done.** An inline
script in `index.html` loads `20-splash.js` and calls `splashShow()` above the
three.js tag; everything else follows behind it. It used to be raised from
`21-boot.js`, which is the *last* script - so the card whose whole job is to
cover a cold start only went up once the most expensive file in the page had
finished evaluating. Measured on the artifact build at 4× CPU throttle,
boot-to-sting went **628ms → 356ms**. The sting needs no three.js: the
wordmark is one div per voxel and some CSS.

- **Two consequences of arming that early, both handled.** `splashShow()` is
  guarded on `splashState`, because `21-boot.js` used to call it and a second
  call would arm an already-armed card. And a tap can now in principle land
  before `11-sound.js` exists, so `splashGo()` falls through to a silent
  `splashPlay(null)` - the same trade `audioReady` already makes when the
  clock never starts. `applyBrightness()` in `splashEnd` is guarded likewise.
- **Three.js still has to load before `09` and `10`.** Both build
  `THREE.Color` instances at top level, which is the one place the "everything
  before `21-boot.js` only declares" rule does not hold. That is why only the
  splash moves above it, not the whole list.

**It waits for a tap, and that is not friction - it is the only way it has
sound.** Every browser refuses an AudioContext until a gesture, so a card that
plays itself on load plays itself silent. Waiting makes the fold *be* the
gesture, and it moves the audio unlock off `BEGIN` onto a full-bleed surface
where a touch anywhere counts, which is the more robust place for it inside a
WebView. A second tap skips: it runs on every load, so the reflex that starts
it has to be able to end it.

- **Nothing in the card may carry `opacity` or `filter`.** Either one sets
  `transform-style: flat` on the element it is on, per spec, which collapses a
  cube's four faces into a stack of overlapping squares - measured, the side
  faces came out zero pixels wide. Depth is shaded by mixing the face colours
  toward the void instead, which is what `applyDepth()` does in the renderer
  anyway, so the card and the game now push things back the same way.
- **The stage has no `perspective`, deliberately.** A `preserve-3d` subtree
  without one *is* an orthographic projection - the same projection the game
  uses - so a cube on the card is shaded and lands exactly like a block.
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
  built to survive. Retune a voice and re-measure - a limiter plus a soft
  clipper will happily hide a set piece that distorts on every play.
- **It listens on `pointerup` and `click`, never `pointerdown`.** This is the
  bug that made the sting arrive late: `pointerdown` is not an
  activation-triggering event for touch - only `pointerup`, `touchend`,
  `click` and `keydown` are - so on a phone the tap that started the card
  granted no user activation, the audio context could not start on it, and
  the whole arrangement queued against a stopped clock and landed in a heap
  on whatever was pressed next. Nothing calls `preventDefault` on the pointer
  event either, because suppressing it suppresses the click, which is the
  half that does the unlocking.
- **`audioReady()` is the general form of that, and the fold waits for it.**
  `resume()` is a promise; until it settles `currentTime` is frozen at 0, and
  a set piece scheduled at absolute times against a frozen clock queues
  rather than fails. So the tap asks for the clock, and the picture and the
  sound start in the same tick - a few milliseconds normally, `AUDIO_WAIT`
  (350ms) at the very worst. If the clock never starts the card plays silent
  rather than late: silent beats a jumble arriving after the fact. A blip
  does not need any of this, because it is one 50ms event at `currentTime`.
- **The keydown listener is on the capture phase and stops propagation.** The
  four verbs are all guarded on the intro card still being up, so nothing
  would fire anyway - but `m` toggles mute, and muting the sting with the key
  that starts it is a poor first impression.
- **Under `prefers-reduced-motion` the word is simply there**, dim, and
  resolves to full colour on the tap. The prompt changes to "tap to begin",
  because "tap to fold" would be describing something that will not happen.
- **The glyphs are five strings of seven characters each**, in
  `SPLASH_GLYPHS`. There is no font; editing a letter is editing those.

