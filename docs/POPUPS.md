# Every word the game says to you

An inventory, written to be marked up. Every pop-up, card, toast, cue and
note the player can be shown, with its exact current text, where it lives,
and what makes it appear. Nothing here is a design argument — the reasoning
for each kind is in `docs/design/*` and `docs/UI.md`; this is the script.

**How to use it:** write the new wording next to the old one and hand the
file back. Anything with a `<b>` in it is markup that survives; anything
with `{do:…}` is a token that becomes "Press ▶" or "Swipe right" depending
on the control layout the player is on (`TUT_SAY`, `js/15-tutorial.js`).

There are **six kinds of pop-up**, and they are six different designs:

| Kind | Where it appears | CSS | Shot |
|---|---|---|---|
| **Toast** | one line, low centre, ~2s, no buttons | `50-layout-cues.css` `.toast` | `toast` |
| **Spoken cue** | the same slot, big teal move + a grey note | `.toast.cuesay` | `toast` |
| **Offer card** | a sheet over a dimmed board: kicker · title · lead · buttons · note | `85-map.css` (`.panel.offer`, `.ma .go .ad .qt .mn`) | `starsoffer` |
| **Full-bleed card** | takes the whole screen, one OK | `70-cards.css` `.tutcard` | `tutcard` |
| **Win card** | full-bleed, title · stars · sub · buttons | `70-cards.css` `.won` | `win:12` |
| **Phase note** | a line struck across a boss between phases | `90-tutorial.css` `.phasenote` | `phase` |

---

## 1 · Toasts

One line, no buttons, gone in about two seconds. `flash()` in `js/18-ui.js`.

### In play — the ones a player meets often

| Text | When | Where |
|---|---|---|
| `blocked` | you walk into something solid | `12-play.js:1187`, `:1212` |
| `it is in the way` | you walk into a hunter — refused like a wall, no life and no move | `12-play.js` (`hunterHere`, `hunterInColumn`) |
| `nothing solid behind that` | GO 3D with no block to land on | `12-play.js:1432` |
| `nothing to undo` | undo on move zero | `05-state.js:254` |
| `amber has it` | you try to shove a crate an anchor is pinning | `12-play.js:1176` |
| `still sealed — N to collect` | you reach the goal with keys left | `12-play.js:1549` |
| `shielded · no life lost` | a hit lands inside the shield window | `12-play.js:70` |
| `one more` / `N more` | a trial core reached, more to go | `12-play.js:1556` |

### Fights — a kill

| Text | When | Where |
|---|---|---|
| `folded into itself · N cores left` / `1 core left` | a boss core folded away | `12-play.js:857` |
| `folded onto it · N left` | one hunter killed by the fold | `12-play.js:895` |
| `N in one square · N left` | two or more killed by one fold | `12-play.js:894` |
| `crushed under the crate · N left` | a hunter killed by a shove | `12-play.js:981` |

### Fights — a hit

All three end in ` · N lives left` (or `1 life left`).

| Text | When | Where |
|---|---|---|
| `it closed on you · …` | a hunter reached you on its own turn | `12-play.js:728` |
| `it came down the line · …` | a hunter fired along your line | `12-play.js:752` |
| `it reached you · …` | a hunter caught you moving | `12-play.js:780` |
| ~~`you walked into it · …`~~ | **retired** — stepping into a hunter is refused now, not fatal | see `it is in the way` above |
| `caught by the sweep · …` | a trial's plane caught you in the volume | `12-play.js:1058` |
| `flat in the slice · …` | it caught you folded | `12-play.js:1058` |
| `N lives left` / `1 life left` | any other hit on a clock | `12-play.js:76` |

### Hints, stars, skips

| Text | When | Where |
|---|---|---|
| `N hints · tap the bulb` / `1 hint · tap the bulb` | after an ad refill | `12-play.js:1529` |
| `no more suggestions` | the bulb with an empty pool | `12-play.js:1809` |
| `skipped · no stars for a skip` | a boss or trial skipped | `12-play.js:1944` |
| `section opened · no stars for a skip` | a locked section opened with an ad | `16-panels.js:1504`, `:1623` |
| `opened · no stars for a skip` | a single locked level opened | `16-panels.js:1930` |
| `not enough stars` | a wardrobe item you cannot afford | `16-panels.js:218` |
| `library complete` | you finish the last saved level | `19-bindings.js:94` |

### Settings, saving, storage

| Text | When | Where |
|---|---|---|
| `settings reset` | RESET SETTINGS | `16-panels.js:460` |
| `storage unavailable — use export` | localStorage denied | `06-persistence.js:398` |
| `couldn't save` | a write failed | `06-persistence.js:400` |

### Tutorial refusals (only inside a lesson)

| Text | When | Where |
|---|---|---|
| `follow the line and the hand` | a control the lesson has not asked for | `15-tutorial.js:824` |
| `follow the line above the bar` | same, in the gesture layout | `15-tutorial.js:826` |
| `too tangled to search from here` | the solver gives up | `15-tutorial.js:830` |
| `no way to finish from here — undo or reset` | you have made the level unsolvable | `15-tutorial.js:835` |
| `you're standing on it` | the hint points at where you already are | `15-tutorial.js:838` |

### Editor, library, composer (never seen in the campaign)

| Text | Where |
|---|---|
| `nothing to undo` | `14-editor.js:18` |
| `tap a block face to place a key` | `14-editor.js:79` |
| `tap a block` | `14-editor.js:81` |
| `solve it before saving` | `14-editor.js:193` |
| `saved — N in library` | `14-editor.js:204` |
| `loaded <level name>` | `16-panels.js:2028` |
| `library is empty` | `16-panels.js:2059` |
| `library: N levels` | `16-panels.js:2092` |
| `that isn't a valid project file` | `16-panels.js:2093` |
| `loaded` | `16-panels.js:2118` |
| `that isn't valid level data` | `16-panels.js:2119` |
| `flatten then pop with no move between rarely holds` | `17-composer.js:307` |
| `doubling back can't be forced — a shorter route always exists` | `17-composer.js:313` |
| `nothing to remove` | `17-composer.js:317` |
| `give it at least a few moves` | `17-composer.js:332` |

---

## 2 · Spoken cues

Same slot as a toast, different design: a big teal **move** with a small grey
**note** under it. `flashCue(move,note)` in `js/18-ui.js`.

**The move words** (`CUE_WORDS`, `js/15-tutorial.js:35`) — used when the
control has no button and no gesture to show:

`go left` · `go right` · `go up` · `go down` ·
`rotate counter-clockwise` · `rotate clockwise` · `undo` · `peek` ·
and the fold, which is named per direction: **`2D shift`** going in,
**`3D shift`** coming out (`cueWord()`).

**The notes:**

| Text | When | Where |
|---|---|---|
| `free · this one is on us` | the free hint | `15-tutorial.js:854` |
| `N hints left` / `1 hint left` | an ordinary hint | `15-tutorial.js:856` |
| `last one · another in N min` | the last hint in the pool | `15-tutorial.js:855` |
| `you come back on the block at the front` | first time GO 3D lands you on the near block | `12-play.js:1456` |
| `the anchor held you — an anchor beats the front block` | the same moment, with an anchor in the column | `12-play.js:1455` |

The hint accounting has **three homes** depending on the control layout: with
the bar up it is an ordinary toast, with the hand up it is the note under the
hand, and with nothing on screen it is the note under the spoken move.

---

## 3 · Offer cards

A sheet over a dimmed board, in five parts: a **kicker** in the card's own
colour, a **title** in the display face, one **lead** line at reading weight,
the **buttons**, and an optional **note** under a hairline.
`offerShell(kick,title,lead,acts,note,tone)`, `js/12-play.js`. Three of them
exist — the card that introduced the bulb was cut.

### THREE STARS — shown once, on the first level that scores
*Shot: `starsoffer`. `starsOffer()`. Tone: gold.*

- **Kicker:** `SCORING`
- **Title:** `Three stars`
- **Lead:** `Three stars means you found the **shortest route** — not that you
  finished.`
- **Buttons:** `TRY FOR THREE`
- **Note:** `Half again as many moves is two stars, twice as many is one.
  **This one is three moves.**`

### OUT OF HINTS — the bulb with an empty pool
*Shot: `refill`. `hintRefillOffer()`. Tone: gold.*

- **Kicker:** `THE BULB`
- **Title:** `Out of hints`
- **Lead:** `Next refill of 1 hint in **N min**.` (or `hr`, or `now`)
- **Buttons:** `REFILL · WATCH AN AD (+N)` · `WAIT IT OUT`
- **Note:** none

### THE SKIP — after repeated losses on a boss or trial
*Shot: `struggle`. `struggleOffer()`. Tone: the boss's violet, or the trial's
amber.*

- **Kicker:** `BOSS · STUCK` (or `TRIAL · STUCK`)
- **Title:** the level's own name, e.g. `BOSS I — Catch Me If You Can!`
- **Lead:** `This one has beaten you N times. You can come back to it whenever
  you like.`
- **Buttons:** `SKIP THIS BOSS · WATCH 1 AD` (or `TRIAL`) · `KEEP TRYING` ·
  `DON'T SHOW ME AGAIN`
- **Note:** `A skip awards **no stars**. Ads buy progress, never score.`

---

## 4 · Full-bleed cards

Take the whole screen and stop the game. One button.

### THE INTRO — the first thing a new player sees
*Shot: `intro`. Static markup, `index.html:353`.*

- **Title:** `Orthogonal`
- **Body:** `A cube, a world, and one verb.` / `Drop the world to 2D and
  things far apart in depth land side by side.`
- **Story line:** `Everything this world has ever flattened is still in
  there.`
- **Buttons:** `BEGIN` · `PICK A LEVEL`

### THE EXPLANATION CARD — raised by a tutorial step
*Shot: `tutcard`. `cardPut(h,p,owner)`, `15-tutorial.js:669`. Markup
`index.html:375`. Button: `OK`.*

No campaign level raises one at the moment — the tutorial teaches by cueing
buttons instead, and the trial/boss briefs were cut (`15-tutorial.js:717`).
The card is live and one call away if any of the new text below wants one.

### THE STING — before anything else
*Shot: `splash`. `index.html:289`, `20-splash.js:186`.*

- `tap to fold`, which becomes `tap to begin` once the word has assembled.

---

## 5 · The coach line

Not a pop-up: a line under the level name during a lesson, with the step
number in front of it. Three levels have one, and the text lives with the
level in `js/02-levels.js`.

**`00 — First Steps`** (`02-levels.js:37`)
1. `You are the pink cube. The green square is where you are going.<br>{do:right} twice.`
2. `The other two move you away from the camera and back toward it.<br>{do:up} once.`
3. `And {do:down} to come back.`
4. `There is no jump. A block one high is a **step** — walk straight into it.`

**`00 — First Fold`** (`02-levels.js:67`)
1. `Walk to the edge.`
2. `Too far to walk, and there is no jump.<br>{do:2d}: everything flattens along your line of sight, and depth stops existing.`
3. `Depth is gone, so that strip far behind you is simply next to you now. Walk across.`
4. `{do:3d} to stand up.<br>Three blocks share that column, and you come back on the one at **the front** — nearest you. The green square is one step behind it.`

**`07 — The Rotation`** (`02-levels.js:243`)
1. `Something is over there. {do:2d} and see how far it gets you.`
2. `Nothing to cross to. The bridge you need does not exist along this axis.<br>{do:3d} to stand back up.`
3. `So look down a different one. {do:turnr} — the world turns, and what lines up turns with it.`

Once the scripted steps run out the coach says whatever the solver's next
move is, in one of eight fixed phrasings (`TUT_MOVE_SAY`,
`15-tutorial.js:470`): `{do:2d}.` · `{do:3d} to stand back up.` ·
`{do:turnr}.` · `{do:turnl}.` · `{do:right}.` · `{do:left}.` · `{do:up}.` ·
`{do:down}.`

---

## 6 · The win card

*Shot: `win:12`. Built by `win()`, `js/12-play.js:1577`. Markup
`index.html:381`.*

The **title** is one word and depends on how you finished:

| Title | When |
|---|---|
| `Solved` | an ordinary level |
| `Perfect` | three stars |
| `Campaign complete` | the last level in the game |
| `Got it` | a tutorial level (no stars) |
| `Down` | a boss beaten |
| `Through` | a trial finished |
| `Untouched` | a boss or trial with no hit taken |
| `Your level works` | an editor test |
| `Solved` | a library level |

The **subtitle** is the score line, and it is assembled:

- ordinary: `N moves` · `N moves (optimal)` · `N moves, best possible is P`,
  then ` · N hints taken` if any were spent
- clock: `never hit · N moves` or `N hits taken · N moves`
- tutorial: `N moves · not scored`, and on the last one
  ` · from here on, tap the bulb for a hint`
- library: `<level name>  (N of M)`

Three lines can be appended under it, in this order:

| Line | Text | When |
|---|---|---|
| the story | the level's own `won:` string | levels that carry one |
| mastery | `<section name> · every star` | the star that finishes a section |
| the reward | `<shape name> unlocked · in the wardrobe` | the shape that section pays out |
| the lock | `<section name> needs <what is left>` | the next level is behind the boss gate |

**Buttons:** `TRY AGAIN` (hidden at three stars) · and one of `NEXT LEVEL` /
`PLAY AGAIN` / `WHAT'S LEFT` / `DONE` / `BACK TO EDITOR`, with `LEVELS`
underneath.

---

## 7 · Phase notes

*Shot: `phase`. `phaseNote(text)`, `12-play.js:592`; the text is the phase's
own `say:` in `js/02-levels.js`.*

**BOSS I** `one of them, and nothing in the way` · `the ground comes up` ·
`same ground — two of them`

**BOSS II** `bare ground, for now` · `cover for it, and the floor bites` ·
`same ground — two of them`

**BOSS III** `clear glass, clear floor` ·
`stone you cannot fold through, glass you can` · `same ground — two of them`

**BOSS IV** `the widest floor in the game` ·
`everything at once — and two crates to shove` · `same ground — two of them`

Fallback when a phase has no `say:`: `phase N of M`.

---

## 8 · Reference sheets (not pop-ups, but text a player reads)

**The map's help sheet** (`mapHelp()`, `16-panels.js:1934`, shot `maphelp`) —
title `What the map means`, then one line per node kind: `Solved.` `Its stars
sit underneath. Three means optimal.` · `Where you are.` · `Open.` `You can
always reach a couple ahead.` · `Locked.` `Clear what is in front of it, or
open it with an ad.` · `Skipped.` `Its stars are still there to take.` ·
`Trial — three cores, on a clock.` · `Boss — three phases. It closes the
section.` Footer: `Ads buy progress, never score. A skip awards no stars,
opens that level alone, and leaves it playable.`

**The piece legend** (`legendPanel()`, `16-panels.js:1965`, shot `legend`) —
**no button opens it any more** (it came off the settings panel), but the text
is still there: `Stone — solid, and still there in 2D.` · `Water — stand on
it. It leaves nothing in 2D.` · `Fire — it burns you. In 2D it burns the
whole line.` · `Crate — walk into it and it slides. It reshapes 2D.` ·
`Amber — catches you on the way back to 3D. It pins a crate.` · `You — the
plate shows what you stand on.` · `Goal — reach it in 3D. Standing on it in
2D is not enough.` · `The eye — hold it to see how far away things are. Costs
no move.`

**Every level's own hint**, the grey line under the level name, is in
`LEVELS[].hint` in `js/02-levels.js` — 91 of them, not listed here. Ask if
you want them pulled out as a table too.
