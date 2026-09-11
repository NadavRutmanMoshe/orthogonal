# Things worth knowing - legibility, hints, stars, the economy, the wardrobe, sound

> Moved out of `CLAUDE.md`, verbatim. `CLAUDE.md` keeps the one-line
> invariants; this file keeps the reasoning behind them. Read it before
> *redesigning* the thing it describes, not before editing it.
> `docs/HISTORY.md` has what was tried and dropped.

## Things worth knowing before you change them

- **Verify claims with the solver rather than asserting them.** `node
  tools/verify.js` checks every level: BFS on ordinary levels and trials,
  `trialSafety()` on trials, `bossArena()` + `bosssim` on bosses. `node
  tools/curve.js` dumps the difficulty curve. `node tools/legible.js` finds
  squares that lie.
- **A level can tell the player something untrue, and `legible.js` is what
  finds it.** Screen-vertical is height and depth added together, so a block
  can draw exactly where ground would have to be for a step that is actually
  a fall - and the player learns otherwise by dying. It asks that precisely:
  standing here, stepping there falls, but does some distant block draw within
  half a cell of where ground would have been? **30 levels are flagged at the
  strictest reading and 9 of those lie from the start square**, where it is
  the first press of the level. It fails nothing - a near-miss is sometimes
  the puzzle - but a level flagged from its start square is almost always a
  mistake, and the fix is usually one coordinate. Both levels reported in
  playtesting so far turned up in it.
- **The camera tilt is not the fix for that, and it was measured rather than
  assumed.** The tempting theory is that `0.62` makes one unit of height and
  two of depth nearly equal, so nudge it. Nudging does nothing: the
  coincidence moves to a different pair and the count stays at ~30. There is a
  cliff, but only once the camera is steep enough that a cell of depth
  outruns a cell of height - around `0.95`, where the count falls to 11. That
  is a real lever and a large change to how the game looks. The numbers are in
  `tools/legible.js`.
- **`resolveStep()` is shared by the game and the solver**, so they can never
  disagree. Keep it that way. Its optional `occHere` argument checks headroom in
  *both* columns; without it you can slide diagonally past a ceiling.
- **FIRE BURNS YOU, IT DOES NOT DROP YOU.** A `spike` death used to share
  the falling animation and say "something sharp was in that column" - both
  correct for the piece when it was a spike and wrong since it became fire.
  It says "you burned" now, and the cube sinks, shudders, shrinks and is
  taken by flames built from the same `flameGeo` the fire blocks use, so it
  is the same fire rather than a second drawing of one. `burnGrp` is built on
  the first burn and hidden the rest of the time. The code still says
  `spike` throughout, for the same reason it says `fold`.
- **AND IT ENDS BLACK.** The flames go out on a charred cube, not on the one
  that walked in - `playerChar()` drives the body's own colour to soot rather
  than swapping a material, so it chars a pup as completely as a cube (one
  material is shared by every part `buildPlayerMesh()` makes) and the rim
  `outlineFor()` re-picks every frame is what keeps the silhouette readable
  once the body has gone nearly to the void. The char is **late and fast** -
  nothing for the first third of the burn, then all of it - because a colour
  that starts sliding on the first frame reads as the light changing rather
  than as something being destroyed. It is put back by the same function on
  the first frame that is not a burn, so nothing else has to know it
  happened.
- **A WARNING MUST NOT LOOK LIKE AN INVITATION.** `foldPeril` used to mark
  `GO 2D` with a red rim and a breathing red fill, which was right while every
  button in the game was a hairline outline - and became wrong the moment they
  all turned into lit caps: a red one that breathes reads as *press me*.
  Reported in those words, and it is the worst misreading available, since the
  thing it warns about costs a life. The danger state is now the one thing on
  screen that is not a lit cap: dark, diagonal hazard stripes nothing else in
  the game uses, a red rim, and a warning triangle before the label. Nothing
  glows and nothing swells; only the triangle blinks, which says *look* without
  saying *press*. `.strike` - the one moment folding is an attack - keeps the
  lit, breathing treatment, and the two are now opposites by construction.
- **Folding into a wall is telegraphed, not blocked.** `foldPeril()` in
  `js/12-play.js` answers "would flattening from here kill me, and which blocks
  are to blame" - the guilty ones are tinted and outlined red in the world and
  the `GO 2D` button pulses. It came from playtesting `12 - Far Side`, where
  the block that crushes you sits one square to your *left* in world space and
  shares your silhouette column only because the view is rotated: nothing on
  screen said so. The move stays legal - dying to it is a real outcome and the
  puzzles still turn on picking the right axis - it just stops being a gotcha.
  Fires on 222 crush and 88 spike positions across 44 levels, so it is a
  general fix rather than a patch for one level. The block loop restores edge
  colours through `perilCleanup`; without that a block stays red after the
  danger passes.
- **A peril-marked block ignores depth shading, on purpose.** Depth shading
  exists to push far blocks back, and the block that crushes you on a fold is
  usually the far one - fading it is the exact mistake the warning is there to
  correct. Crates get the same treatment, and needed it separately: they live
  in `crateMeshes`, not `meshes`, so the block loop never saw them.
- **Depth reading.** Orthographic views make a block six deep look adjacent.
  Two fixes: blocks sharing the player's depth stay full colour while others
  desaturate with distance (`applyDepth`), and the eye button (or Shift) leans
  the camera off-axis so you can read depth **without spending a move**. Peeking
  touches only the camera - `ta`/`tdvx`/`tdvz` carry the true fold axis and every
  geometry transform uses those.
- **THE DEPTH FADE IS A STEP, NOT A RAMP, AND THAT WAS MEASURED.** It used to
  be `diff * .12`, so the *first* cell of depth - the one that decides whether
  a step is a walk or a fall - cost almost nothing and was invisible. Count
  the blocks that actually mislead somebody (`legible.js`'s ghosts, at the
  strictest reading) by how far they are from the player's own square and the
  answer is unambiguous: **50% are one cell away, 37% are two, and 13% are
  everything else.** The confusing block is nearly always the near one, and it
  was the one being shaded least. So `DEPTH_STEP` (.34) is charged outright
  for the first cell and `DEPTH_SLOPE` (.09) only grades what is behind it -
  your own slice is lit and everything else has visibly receded, which is a
  categorical statement rather than a gradient the eye has to measure.
- **It is an improvement, not the fix, and the difference matters.** The
  ambiguity is geometric: screen-vertical is height and depth added together,
  so two different places genuinely draw in one place and no amount of tone
  separates them for somebody who reads a dark block as a dark *material*.
  The structural lever is `CAM_TILT`, now a named constant read by both the
  camera and `fitViewSize()` - at .95 `legible.js` falls from 30 flagged
  levels to 11. It is a large change to how the game looks, so it is the
  owner's decision and is deliberately left at .62.
- **HINTS COST A POOL, NOT STARS.** Three of them, one back every half hour,
  and a rewarded video refills. The bank is in `js/06-persistence.js`
  (`hintBank`, `hintsLeft()`, `spendHint()`, `grantHints()`), the count rides
  the bulb as a badge, and pressing an empty bulb opens `hintRefillOffer()`
  rather than doing nothing - an empty button is a dead end and this whole
  arrangement exists to say there are none.
- **That card is two lines and two buttons, and it was four.** The first
  draft explained the pool, the half hour, the ad and the star rule at the
  one moment the player wants to be back in the level, which is exactly when
  nobody reads. What is left is what happened and when it is fixed - *Out of
  hints / Next refill of 1 hint in 18 min* - and the rest is discoverable
  from the badge. `offerShell()` draws no note box when the note is empty.
- **AND NOTHING INTRODUCES THE BULB ANY MORE** (owner's call, 2026-09). A
  card on the first level after the tutorial used to explain what the bulb
  was and hand over one free press (`hintOffer()`, `settings.hintAsked`,
  `freeHint`). It was cut with the settings card before it: the first level
  the player is finally alone on is the level that has to feel like the game
  starting, and it opened with a dismissal. The badge, the refill card and
  the last tutorial's win card (*from here on, tap the bulb for a hint*) say
  it three times between them at no cost. `hintAsked` came out of the
  `loadSettings()` whitelist with the card; **`freeHint` is deliberately
  still there**, armed by nothing - `showHint()` honours it and still says
  *free · this one is on us*, so a future card or reward that wants to give
  a hint away is one assignment.
- **AN OFFER CARD IS A DECISION, AND IS DRAWN AS ONE** (`.panel.offer`,
  `css/85-map.css`). Kicker in the card's own colour, title in the display
  face at 20px, lead at reading weight, buttons, then the note under a
  hairline - and a full-screen scrim, carried on the card's own box-shadow
  because `.panel`'s backdrop-filter makes it the containing block for any
  fixed child. Before this the title went through `.panel h3` (the 12px dim
  *list label*) and the lead and the note were both `.mn`, so the card had
  nothing for the eye to land on and the skip card printed a level's name in
  a label. The three tones are the colours those things already wear: gold
  for the bulb and the stars, `--vio` for a boss, `--amb` for a trial.
- **THE SKIP IS ONE AD, NOT THREE** (owner's call). Three was priced against
  the map's section unlock, which opens a whole shelf and is still three.
  The skip opens one level, is offered only after repeated losses, and lands
  at the moment somebody is deciding whether to keep playing at all - a
  price that reads as a wall there collects nothing and closes the game.
  Nothing in the code counts ads on this path (`grantSkip()` is called
  directly, awaiting an SDK), so this was the label.
- **The star cap it replaced was the wrong currency, and that reverses an
  older call.** A hint used to lower what you could score - 0 → 3★, 1–2 →
  2★, 3–4 → 1★, 5+ → 0★, with `win()` writing an *effective* move count so
  hints could not be laundered. It worked and it charged the wrong person:
  the bulb is what somebody reaches for when they are stuck, which is exactly
  the moment the game wants them to carry on, and marking them down for it
  turned "I don't want to be stuck" into "I don't want to be marked down".
  Nothing but the route now decides a level's stars. **This is not the return
  of the energy timer** - that idea was rejected for teaching people to close
  the app, and it is still rejected: the pool gates a *hint*, never a level,
  so nothing is ever unplayable and no clock ever has to be waited out to
  make progress.
- **Two ceilings, `HINT_FREE` (3) and `HINT_MAX` (9).** The pool refills to
  the first on its own and an ad can push it to the second, because an ad
  taken with two in hand that handed back one is the arithmetic that makes
  somebody feel cheated by a thing they chose to watch. `hintBank.t` advances
  by whole `HINT_REGEN_MS` rather than being reset to now, so closing the
  game twenty-nine minutes in does not throw those minutes away, and the half
  hour starts when the pool first drops below full rather than when it
  empties. It is a wall-clock read and a player who moves their device clock
  gets free hints; that is not worth defending against, and it is *why* the
  pool is the currency rather than anything touching score.
- **The money shelf sells three things and none of them is score.** The
  DEALS tab is `PASSES` (`js/09-wardrobe.js`) followed by the `deal:true`
  entries of `SKIN_SHAPES`. The Rook is a shape for a price. The two passes
  are not shapes and do not equip: **NO LIMITS** takes off the three ceilings
  the game otherwise makes you wait out or watch a video for - the hint pool
  (`hintsUnlimited()`), the ad on a skip (`noLimits()` at the three offer
  sites), and the star balance in the shop (`shards()` returns 9999) - and
  **EVERYTHING** is that plus every shape sold for money, granted by rule
  inside `owns()` rather than by writing ids into the owned list, so a shape
  added to the catalogue later is already in a pass bought today. The four
  `reward:true` shapes are *not* in it and never will be: they are score, and
  money buys progress, never score. **The second pass costs less once the
  first is owned** - `dealPrice()` swaps in `usdUp` and the panel prints the
  old price struck through - because charging somebody twice for the half
  they already bought is how a shelf loses the people who paid.
- **A cue has three deliveries, and `cue()` picks the most it can say.**
  Pulse the button; if the layout dropped it, **show** the gesture with the
  ghost hand; and only if the control has no gesture either, **name** the move
  in words. Showing beats naming and goes first - a swiping finger is the
  instruction where "go right" is a description of one. It is decided per
  *control*, not per layout, which is what makes `COMPACT` come out right:
  the d-pad is gone so a walk hint draws a hand, while the fold and turn
  buttons are still there and pulse as they always did.
- **The layouts are why any of this exists.** `COMPACT` drops the d-pad,
  `HIDDEN` drops the whole bar, and `cue("bUndo")` has always pointed at a
  control this game does not have - so the one hint you get when you are
  wedged past recovery showed nothing at all, and a `HIDDEN` player paid a
  star for a pulse on an invisible button. Undo and peek are still the words
  case and always will be: no finger gesture performs them. Visibility is
  tested with `getClientRects()`, not `offsetParent` - the bar is
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
  level, so a hint's hand would be cleared by the very next redraw - which
  `showHint` causes itself, two lines after asking for it. So clearing states
  which owner is doing it and a mismatch is refused, and the owner lives in
  the element's own class rather than in a variable beside it, where it
  cannot end up disagreeing with what is on screen.
- **A borrowed hand is louder than a held one**, .92 against .62, because
  they are different statements: the tutorial's is ambient and has a coach
  line saying the same thing, a hint's was asked for, costs a star, and has
  a few seconds alone.
- **`clearCue()` takes the borrowed hand down with the pulse.** Every verb
  calls it, which is what makes a cue something you spend by acting on it -
  and a demonstration still looping after the player has done the thing is a
  hint that will not stop talking. The tutorial's hand is untouched: there
  the step ends it, not the move.
- **A spoken cue does not look like a toast, because it is not one.** A toast
  is an aside in the player colour at the top of the screen; a spoken cue is
  an *instruction*. So `flashCue()` gives it the goal colour - green already
  means "do this" on the button pulse - puts it down by the controls where
  the thumb and the eye are, and gives the move its own line with the hint
  accounting small underneath. It also lingers longer than a toast: reading
  three words costs more than glancing at a button that is already flashing.
  It shared the toast's styling once and wrapped into "go right - hint 4," /
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
- **STARS ARE GOLD, AND THEY ARRIVE.** `--star` is the one token every star
  in the game reads - the win card, the corner total, the map's nodes, the
  shop's prices, the flight between them - and it is deliberately *not* the
  goal's green: green appears on the goal, on the button being asked for and
  on a spoken cue, where it means "do this", which is the one thing a score
  is not. On the win card the row is 42px, each star **falls** onto the card
  with its own sound (`SFX.drop`, a triad climbing so three of them is a
  chord), and an empty one falls too but grey and silent. The CSS delays and
  the sound timers are written against each other and have to move together.
- **The HUD is the move count and the stars you are still on.** It used to
  read `7 / 5` - your count against par - and par is the solver's answer, so
  printing it hands over how long the level is. The number is alone now, and
  large, with the live row under it: what you have left to lose is the same
  information from the player's side, and it is drawn rather than counted so
  it can be read mid-move.
- **A LOST STAR IS SEEN TO LEAVE.** Two glyphs per slot, one on top of the
  other: the hollow star is the socket and the gold one sits in it, so losing
  one is the gold star *falling out* of a socket that stays - it tumbles off
  the row, fades, and two soft descending notes go with it (`SFX.starLost`).
  The old row simply became two characters instead of three, which is a
  change you can only notice by having looked a moment earlier, and most
  people never did.
- **THE ROW IS ITS OWN ELEMENT, BUILT ONCE, AND ONLY TOUCHED WHEN THE COUNT
  CHANGES.** It was part of `moveLabel`'s innerHTML, which `syncHud` rewrites
  on *every* redraw - so each move re-created the falling star and restarted
  its animation from the top, and holding an arrow down left it flickering in
  place instead of falling off. Reported from a playtest as spamming left and
  right breaking it. `syncStars()` returns immediately when the count has not
  moved, so a redraw writes no DOM and there is nothing to restart;
  `void offsetWidth` is what deliberately restarts it in the one case that
  wants it, a second star lost while the first is still in the air. **Any
  animation that lives inside something `syncHud` rewrites has this bug** -
  that is the general form.
- **The star BANK is not shown inside a level.** How many you have collected
  across the whole game cannot change while you are playing one and is not
  what anybody is thinking about; the row under the move count is. It appears
  on `levelDone`, because that is when it is news and when the win card's
  stars need somewhere to fly to.
- **Stars.** 3★ = the solver's own move count, 2★ ≤ 150%, 1★ ≤ 200%
  (`STAR_2X` / `STAR_1X` in `js/07-difficulty.js`). Par is
  optimal, so 3★ genuinely means optimal - that half has never moved. The
  bands widened from 120/140 because a near miss was costing a whole star: on
  a ten-move level 140% is fourteen moves, so two wrong turns was zero, and
  0★ should mean *not by anything like the short road* rather than *you took
  the scenic route once*. Levels on a clock ignore all of this
  and score on lives.
- **Worlds only change the world** (background, stone, ink). Piece colours and
  their shape markers never change, so no world can make a mechanic unreadable.
- **THE WARDROBE HAS TWO TABS, NOT FOUR.** The worlds came off it when the
  sections took ownership of how the world looks: a section picks the sky,
  the stone and the paper now, so a world tab was selling a look the next
  level immediately overwrote. Only the tabs went - `WORLDS3D`/`WORLDS2D`,
  the equipped ids, `wardEquip()` and `migrateWorlds()` are all untouched,
  the equipped world is still what `applyPalette()` writes underneath a
  section, and a save that bought one keeps it. `wardrobePanel()` and
  `wardTabTo()` clamp their argument, because `homePick()` hands a tab name
  in and a stale `world3` would land the grid on a catalogue with no tab to
  leave it by.
- **A world is two purchases, not one.** `WORLDS3D` sets void + block, `WORLDS2D`
  sets paper + ink; you spend the whole game switching between the two pictures,
  and buying one used to silently buy a look for the other you had never seen.
  Ids are prefixed `v_` / `p_` because `wardrobe.owned` is one flat list and the
  halves would otherwise collide. **A save from before the split carries
  `palette:"rust"`** - `migrateWorlds()` grants both halves for the one purchase
  already made, and the prefixes are what make that decidable. Don't remove it
  while any old save might exist.
- **Pricing tracks desire, not effort**: shapes dearest (max 30), then colours
  (max 14), then worlds (max 12). Nothing exceeds 30, which is what keeps
  `adsFor()` whole - it charges one ad per 10 of price, so 30 is exactly three
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
  are different numbers - the wardrobe's balance falls when you buy something,
  and a total that dropped after a purchase would make the flight from the win
  screen read as a transaction rather than an achievement. The wardrobe labels
  its own "TO SPEND" to keep them apart. It lives outside `.corner` at z-index
  30 so it sits *over* the win overlay: the count has to be visible at the
  moment it goes up.
- **Only newly gained stars fly.** `win()` records `starsBefore`/`starsAfter`
  around the progress write, so replaying a 3★ level pays nothing and 2★→3★
  flies exactly one. Glyphs `[before, after)` are the ones that animate, which
  is why the win card emits `starGlyphsEls()` - you cannot measure the third
  character of a text node to fly it from where it sits.
- **The player carries an adaptive outline** (`addOutline`, recoloured by
  `outlineFor` every frame). Black and White exist because players ask for them,
  but the player is drawn against the void in 3D and paper in 2D - opposite ends
  of the range - so no single colour reads against both. The rim is re-picked
  from the current background instead of fudging the colours to mid-grey.
- **Five shapes are earned, not sold.** Sapling, Flame, Minnow and Cactus
  carry `reward:true` and a `sec` in `SKIN_SHAPES`, and each is granted for
  taking *every star* in the section it names - nature, fire, water, desert,
  each standing up as a character in that section's element. They are the
  only items in the catalogue with no BUY and no ad row, and that is the
  point: ads buy progress, never score, so the one thing a star cannot be
  spent on has to be the thing that only three-starring produces.

  They are shapes and never colours, on the owner's call: a reward that also
  changed your colour would overwrite something the player chose, and these
  are meant to be worn with whatever they already like. Every one takes the
  equipped colour like every other shape.

  Paid twice over, deliberately. `win()` grants at the moment the last star
  lands, because a reward you cannot buy is worth having only if you are told
  you have it - that is the `.wonwear` line under the mastery pill.
  `sweepSectionRewards()` runs once on boot for the saves that had already
  mastered a section before any of this existed; `grantShape()` returns null
  on a repeat, so the two paths cannot pay twice. Neither goes through
  `sectionMastered()`, which answers yes to everything while the mastery
  preview switch is on - a preview must never be able to pay out.

  **And the fifth is paid for by a move rather than by a shelf.** The Domino
  carries `reward:true` and a `feat` instead of a `sec`, and the condition is
  two of the pack in ONE silhouette column, crushed by one fold - `n>=2` in
  `bossFoldCrush()`. It is the rarest thing the fight can be made to do,
  because the only reason two hunters are ever in the same column is that the
  player chose the axis that put them there, which is the whole game's verb
  used offensively. A domino is what the feat looks like: one piece made of
  two squares, and the thing that falls two at a time.

  It is granted **the instant the fold lands**, not at the end of the fight.
  The fold is what earned it and the next charge may still take the player;
  `grantShape()` writes the wardrobe itself and answers null on a repeat, so
  it is news exactly once. What is deferred is only the *announcement*:
  `featNews` holds the item, and `featAnnounce()` spends it on the first of
  the three things that can follow a fold - the toast at the foot of
  `bossFoldCrush()`, the phase note in `bossAdvance()`, or a `.wonwear` line
  on the win card, in the star's gold rather than a section's colour.
  `featAnnounce()` answers true when it said something so a caller can use it
  INSTEAD of its own toast: two flashes in a row is one flash, and the rarer
  of the two is the one that would be lost.

  The twin's branch of `bossFoldCrush()` is deliberately left out. A twin core
  is ALWAYS both halves, so including it would pay the Domino out on the first
  fold of BOSS III and mean nothing.

  `rewardShapeFor()` and `sweepSectionRewards()` walk `sec`, so neither can
  ever reach it - only the fold can pay it.
- **`UNLIMITED_SHARDS` in `js/09-wardrobe.js` is currently `true`** so the whole
  wardrobe can be walked during playtesting - the catalogue costs more than
  perfect play earns, so it is otherwise unreachable. It short-circuits
  `shards()` only; `starsEarned()` and `wardrobe.spent` still do their real
  work, so buying exercises the true purchase path. **Set it back to `false`
  before shipping.**
- **A DEATH IS SOFT, AND THAT IS A REVERSAL.** `SFX.die()` was one sawtooth
  at 220Hz sliding to 55 over half a second, and it was reported as
  disturbing. The reading is right and it is the same diagnosis the crate's
  buzzer got: a sawtooth is the harshest voice in the file, and this one
  fired on the event the player is already unhappy about, several times over
  on a level they are stuck on. The sound was not sad, it was abrasive.
  It is three quiet voices now - a triangle sinking an octave (the fall, which
  was the whole of what the old one meant), a sine under it for weight, and a
  130ms noise breath so it still has a front edge on a phone speaker. Lower
  in total than the single voice it replaces. **The kill cam's wind-up is
  where this matters most**: `SFX.die()` is the only thing a death's wind-up
  plays (see the kill cam in `docs/UI.md`), so it is heard alone, under
  television snow, with nothing else to hide behind.
- **THE AMBIENT LAYER IS CURRENTLY MUTED** - `AMB_MUTED` in `js/11-sound.js`
  is `true`. Playtested and disliked: the birds, the sea, the wind and the
  desert together were more presence than the game wanted, and a bed you have
  to put up with is worse than no bed. **Everything below is kept rather than
  deleted**, because what is wrong with it is a judgement about the mix and
  the voices rather than about the machinery - the beds, the phrases, the
  wave's three phases and the meteor's boom are all still written and all
  still measured. Setting the flag to `false` is the whole of turning them
  back on. It is asked at `ambTo()` and `ambSync()` rather than inside
  `ambStart`, so a muted section builds **nothing**: no noise buffer, no
  oscillators, no 250ms timer. Every part of a section you can *see* is
  untouched - the birds still fly, the meteors still land and flash, the foam
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
  - **THREE BIRDS, NOT ONE, AND THEY ARE SPECIES.** One voice - a triangle
    with a bend in it - was reported as not sounding like a bird, correctly:
    a single pure tone with a glide on it is a *whistle*. The wood now has a
    **myna** (a mimic, so a scattered phrase of whistled notes at speed), a
    **toucan** (a dry low croak) and **cicadas** (a broadband buzz
    amplitude-modulated at about seventy a second, swelling over four
    seconds and out again). Each plays a phrase off `AMB_MOTIF`, which is
    what "random but with a pattern" means. Every voice goes through the
    game's reverb, because a call outdoors arrives with air around it.
  - **A CROAK IS A RATTLE, NOT A SWEEP, and the sweep was a bungee rope.**
    The croak was first built as a sawtooth glided in pitch through a
    high-Q bandpass that was swept at the same time - which is precisely how
    you synthesise a boing, and it was reported as a trampoline. A falling
    resonance over a falling tone is the one shape that reads as rubber.
    Now the pitch holds, the filter holds and is broad (Q 1.4 against 9), and
    the character is an LFO chopping the gain at fifty a second. There is
    nothing left in it that can glide. The myna lost its buzzy element for
    the same reason and is all whistle now - what makes it a myna is the
    scatter of the phrase, not the timbre of one note.
  - **YOU CAN SEE WHICH BIRD IS SINGING.** A call with nothing on screen
    making it is a sound effect; the same call with a bird visibly making it
    is a place. `ambBirdPhrase` hands the moment to `birdSing()`, which picks
    whichever bird is nearest the middle of the frame - a ripple half off the
    edge points at nothing - and marks it for the length of the phrase: two
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
    through a sweeping filter is a *whoosh* - reported as not sounding like a
    wave. It is now an approach (closed right down, two seconds of water
    moving), a **crash** (25ms of broadband attack with a thump under it) and
    a wash (a long hiss with the filter closing). **The renderer owns the
    clock**, not the ambience: `seaT` counts down, the sound is started
    `WAVE_RISE` ahead of the break, and the foam sweeps up the beach on the
    frame the crash lands. One event, seen and heard.
  - **The volcano's boom became a meteor's.** Nothing on that mountain
    visibly erupts, so a boom every seventeen seconds was describing an event
    the picture never showed. A meteor *does* visibly land, so `ambBoom()`
    fires on the impact - and delays itself by the distance, because light
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
    to 1.28× rather than 1.7× - rising in pitch *and* in volume together was
    the other half of the siren.
  - **A GAIN NODE IS BORN AT 1, AND THAT WAS THE DISTORTION.** Every envelope
    here schedules its first value a moment in the *future*, so between
    `createGain()` and that first `setValueAtTime` a looping noise source was
    running through it at full scale. For the wave's wash that window was the
    whole two-second approach: measured at the master bus, the sea peaked at
    **4.8 before the limiter** (about +14 dB) and the actual crash, at 0.26,
    was inaudible underneath it - reported exactly as "the sound right before
    the wave breaks is too loud", where too loud meant the limiter rather
    than the level. The meteor impact had the same bug in a 50ms window and
    measured 6.1. **Anything fed by a source that is already running must be
    silenced at creation**; an oscillator voice never had it, because an
    oscillator starts when its envelope does.
  - **The noise buffer is normalised**, and that is what makes every gain in
    the file mean what it says. A brown-noise integrator does not land in
    [-1,1] - it wanders - so it was being scaled by a constant picked by eye.
    Do not put the constant back.
  - **The levels, measured pre-limiter, against a footstep at 0.63**: bird
    bed .14, myna .34, toucan .40, meteor impact .45, sea bed + wave .32,
    wind bed .24. Nothing in the ambience is louder than a footstep, and the
    documented worst-case pile-up (win chord + strike + step) with the whole
    bed and an impact under it now peaks at **0.98 with zero saturated
    samples**, where it used to clip. If you raise a gain, re-measure that
    stack - a limiter makes clipping quiet rather than obvious.
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
  connected to before touching `MIX`. The per-blip gains are a deliberate mix - a footstep sits
  well under the win chord - so loudness is corrected at the master rather
  than by editing eleven numbers. The limiter defends the ceiling against the
  rarest moment (win chord + shot + strike + step inside 40ms), which alone
  would keep every ordinary sound about 4 dB quieter than it needs to be; the
  soft clipper rounds off the last transient peaks so that moment does not
  set the level for everything else. **If you change `MIX` or `POST`,
  re-measure that stacked case** - a limiter makes clipping quiet rather than
  obvious and a soft clipper hides it further, so the pair will happily let
  you ship something distorting on every footstep. Every write to
  `masterGain.gain.value` must go through `masterLevel()` or the boost is lost
  the first time the volume slider moves.
- **The default volume differs by device**: 1.0 where the pointer is coarse
  (a finger, so a phone or tablet - small speaker), 0.35 elsewhere (a desktop,
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
  panel opens and explicitly released - `loseContext()`, not just GC - when it
  closes. Browsers cap live contexts (commonly 16) and evict the oldest, which
  would be the game's own renderer, so the teardown lives in `showPanel` and
  `hidePanel` rather than at call sites, and no path may leave one running. For
  the same reason the panel shell is built once per opening and refreshed in
  place: re-running `showPanel` on every tap would burn a context per tap.
  Verified by cycling the panel 25 times and checking the game's context
  survives. It lights the item with Lambert + ambient, unlike the flat
  `MeshBasicMaterial` game, because a flat-shaded sphere is a circle and
  rotation - the whole point of the case - would be invisible.
- **Selecting, buying and equipping are three separate acts.** Tapping a tile
  only puts it on the stand. Buying is armed-then-confirmed on a button under
  the case, and only a confirmed purchase equips. A consequence worth keeping:
  a palette does not touch the world until it is equipped - the case previews
  it instead.
- **THE TYPE IS TWO POINTS BIGGER THAN IT WAS, EVERYWHERE.** Reported by
  several people at once: the menu, the popups and the map were all small.
  Every declaration under 12px went up by 2 (the build string is the one
  exception - it is deliberately tiny), the map's own name and description
  went further, and the copy was cut to match: **a bigger type size is only
  half of readable, the other half is fewer words.** The piece legend, the
  menu notes, the map's help sheet and all five offer cards were rewritten
  shorter in the same pass. If you add a panel, start at 12px.
- **Panels are phone-width and centred on every screen** (`.panel`, capped at
  560px). They were written against a phone and stretched edge to edge on
  anything wider: the wardrobe's display case is a square sized as a
  percentage of the panel, so on a 1600px monitor it became a 600px block
  with two absurd columns of tiles, and the level picker became 10px
  monospace ruled across a metre of glass. At phone size the cap changes
  nothing - `100% - 32px` is exactly what `left:16px/right:16px` gave.
- **`body>canvas` in the CSS is load-bearing.** The game's renderer is the only
  canvas that is a direct child of `body`; any future in-panel canvas depends
  on that staying scoped.
- **`statsCached()`** wraps `statsFor` - the level picker would otherwise run
  BFS on every level each time it opens.
- A parsing regex over the levels file must match `rotate:(true|false)` - level
  01 has rotation locked, and a regex expecting only `true` silently swallows it
  into its neighbour. That bug cost two rounds of miscounting.

---

