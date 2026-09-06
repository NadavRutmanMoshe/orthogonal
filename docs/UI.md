# The UI — where every screen lives

Read this first for any change a player can see. It is a map, not an
argument: what the screen is made of, which file draws it, which function
fills it, and the three or four decisions on it that must not be undone
without reading `docs/design/chrome.md`.

**The loop:** find the screen below → open its one CSS file (and its
builder, if the markup changes) → edit → `node tools/shot.js <screen>` →
Read `shots/<screen>.png` → repeat. Then the same shot with `--small`.

## The stylesheet, one file per screen

Linked from `index.html` in this order; **the order is the cascade**, so a
rule moved between files can change which wins. Grep `css/` for a selector
rather than guessing the file.

| File | Holds |
|---|---|
| `00-base.css` | `:root` tokens, `body`, the `body.flat` token swap, `.hud` text (`.title`, `.hint`, `.axis`) |
| `10-buttons.css` | the button skin (`button`, `:active`, `:disabled`), `.bar`, `.dpad`, `.rot`, `.corner`, `button.rnd` and its five hues, the hint badge `.hn`, icon classes `.ln .lite .dim .ar .tn` |
| `20-hud.css` | the live star row `.stars`, `.moves`, `.flatbtn` and its `.peril` / `.strike` states, the eye's `.look` pulse, `.tiny` |
| `30-editor.css` | `#editBar`, `#composeBar`, `.chip`, `.verify` |
| `40-panels.css` | `.panel` shell (the 44vh sheet), `.srow` sliders, `.lrow` level rows, `.tabs`, the wardrobe (`.wbody .wcase .wcanvas .wact .item .grid`), `.secbar`, `.chap`, `.leg`, `button.mini` |
| `50-layout-cues.css` | control layouts `body.ui-compact / ui-none / norot / tut`, `.coach`, `.crow` + `.seg`, `cuePulse` / `button.cue`, `.toast` and `.toast.cuesay` |
| `60-splash.css` | the sting (`.splash .sstage .scube .srule .sprompt`) |
| `65-replay.css` | `.replayui`, `.rbar`, `.rlabel`, `body.replaying` |
| `70-cards.css` | the full-bleed cards: `.won` (win card, intro card), `.bigstars`, `.wonmast .wonlock .wonstory`, `.tutcard`, `#bRetry` |
| `75-bossbar.css` | `.boss` lives/cores bar, `.startotal`, `.flystar`, `.sg` |
| `80-panel-tall.css` | full-height panel furniture shared by menu, wardrobe and map: `.panel.tall .phead .pbody .pcard .prow2 .pgo .psub .pdanger .pbuild`, the range slider skin |
| `85-map.css` | `--vio --amb` tokens, `.panel.map .mhead .mtabs .mtab .mcard .mbar #mtrail .mfill .mnode` (+ `.mboss .mtrial .solved .here .locked .skipped .mst`), `.mstars .mcap .msheet .mlegend`, the offer-card buttons `.ma .go .ad .qt .mn`, `.adicon`, the global reduced-motion rule |
| `90-tutorial.css` | the guided lock (`body.tutlock`, `.tutlive`, `.tutsoft`), `.phasenote`, the ghost hand (`.ghost .gfinger .ghand .gtrack .gsay`) |
| `95-home.css` | `.home` overlay, `.hcont` (CONTINUE, `--sec`), `.hrow` shop strip, `.htile`, `body.athome` |

## Tokens

Set in `css/00-base.css` on `:root`, swapped by `body.flat`:

| Token | Means | Notes |
|---|---|---|
| `--void` / `--paper` | 3D ground / 2D ground | rewritten per skin by `applyPalette()` |
| `--ink` | 2D silhouette colour | |
| `--player` | the player's colour | **not a constant**: `applySkin()` rewrites it. Derive from it with `color-mix`, never hard-code the rose |
| `--goal` | the goal's teal-green | means "do this": the goal, the cued button, spoken cues. Never a score |
| `--star` / `--star-glow` | gold | every star in the game reads it |
| `--fg` / `--fg-dim` / `--rule` / `--panel` | text, dim text, hairlines, panel ground | flipped by `body.flat` |
| `--vio` / `--amb` (+ `-lip`) | boss violet, trial amber | in `85-map.css`; no section may use either |
| `--c` / `--lip` | a button's hue and its shadow | set per button family; the fill, rim, glyph and lip all follow |
| `--sec` | the current section's colour | on `.mcard`, `.mnode`, `.hcont`; written by JS from `SECTIONS[].col` |
| `--tabc` | a map tab's colour | |

Fonts: `'Space Grotesk'` for titles, `'IBM Plex Mono'` for everything else,
both with system fallbacks (the published build strips the Google Fonts
link, so the fallback is what the artifact shows).

## Body classes

All set in `syncHud()` (`js/18-ui.js`) unless noted. They are how the CSS
knows what state the game is in.

`flat` (2D, chrome dark-on-light only if `paperIsLight()`), `ui-full` /
`ui-compact` / `ui-none` (layout, from `applyUI()`), `norot` (level has no
turn), `tut` / `tutgest` / `tutsoft` (a tutorial; gesture lesson; light dim),
`tutlock` (guided lock armed, `15-tutorial.js`), `athome` (home screen up),
`mapopen` (any panel up; hides the star total), `carded` (a full-bleed card
up), `splashing`, `replaying`, `bosshold`.

## Screens, one row each

Static markup is in `index.html`; dynamic markup is a JS function that
builds a string and hands it to `showPanel(html, kind)`. Bindings for
static buttons are in `js/19-bindings.js`; a dynamic panel binds its own
buttons at the end of its builder.

| Screen | Markup | Filled / built by | CSS | Shot |
|---|---|---|---|---|
| Corner buttons (menu, wardrobe, bulb, restart, eye) | `index.html` `.corner.tl` / `.corner.tr` | `syncHud`, `syncHintN` | `10-buttons` | any level |
| HUD text: level name, hint, move count, live stars | `.hud`: `#lvName #lvHint #moveLabel #starRow` | `syncHud`, `syncStars` | `00-base`, `20-hud` | `level:2` |
| Lives / cores bar on a clock | `#bossBar` | `syncBossBar` | `75-bossbar` | `boss`, `trial` |
| Running star total | `#starTotal` | `syncStarTotal`, `starPop`, `flyStars` | `75-bossbar` | `win:2` |
| Control bar: d-pad, turn, GO 2D | `#playBarWrap` | `syncHud` (classes), `applyUI` (layout) | `10-buttons`, `20-hud`, `50-layout-cues` | `level:2 --ui full` |
| Editor / composer bars | `#editBarWrap`, `#composeBarWrap` | `14-editor.js`, `17-composer.js` | `30-editor` | `editor` |
| Coach line (hidden by default) | `#coach` | `tutSync` | `50-layout-cues` | `tutorial` |
| Ghost hand + label | `#ghost`, `#ghostSay` | `tutGhost`, `ghostRestart`, `cue()` | `90-tutorial` | `tutorial` |
| Guided-lock dim | `body.tutlock` | `tutEngage`, `tutUnlock` | `90-tutorial` | `tutorial --wait 4000` |
| Phase note on a boss | `#phaseNote` | `phaseNote()` (`12-play.js`) | `90-tutorial` | `phase` |
| Replay chrome | `#replayUI` | `replayStart` / `replayEnd` | `65-replay` | (use `--eval`) |
| Toast / spoken cue | `#toast` | `flash()`, `flashCue()` | `50-layout-cues` | `toast` |
| The sting | `#splash` | `20-splash.js` | `60-splash` | `splash` |
| Intro card | `#intro` (static) | `nothingBehind()` decides it shows | `70-cards` | `intro` |
| Tutorial / explanation card | `#tutcard` | `cardPut(h,p,owner)` | `70-cards` | `tutcard` |
| Win card | `#won` | `win()` (`12-play.js`): title, `.bigstars`, `#wonSub`, mastery/lock/story lines, buttons | `70-cards` | `win:2` |
| Home screen | `#home` (static shell) | `homeShow`, `homeSync`, `homeStrip`/`homeTile`, `homeCase` | `95-home` | `home` |
| Menu | `#panel` | `menuPanel()` (`16-panels.js`); rows via `seg()` | `80-panel-tall`, `40-panels` (`.srow`), `50-layout-cues` (`.crow .seg`) | `menu` |
| Wardrobe | `#panel.ward` | `wardrobePanel(tab)`, `wardRefresh`, `wardMeta` | `40-panels`, `80-panel-tall` | `wardrobe`, `wardrobe:color` |
| Map | `#panel.map` | `levelPicker()` → `mapTabs`, `mapDraw`, `mapLayout`, `mapShape`, `mapFill`, `mapWeather` | `85-map` | `map`, `map:1` |
| Level sheet on the map | `#mSheet` inside the map | `mapSheet(i)` | `85-map` (`.msheet`) | `sheet:5` |
| Map help sheet | same | `mapHelp()` | `85-map` | `maphelp` |
| Legend | `#panel` | `legendPanel()` | `40-panels` (`.leg`) | `legend` |
| Library / project / import-export | `#panel` | `libraryPanel`, `projectPanel`, `ioPanel` | `40-panels` | `library` |
| Offer cards (bulb, stars, refill, skip) | `#panel` | `offerShell(title,lead,acts,note)` via `hintOffer`, `starsOffer`, `hintRefillOffer`, `struggleOffer` | `85-map` (`.ma .go .ad .qt .mn`) | `hintoffer`, `starsoffer`, `refill`, `struggle` |
| Ad buttons everywhere | | `adIcon()` (`18-ui.js`), one helper, five callers | `.adicon` in `85-map` | |

`showPanel()` / `hidePanel()` (`18-ui.js`) are the only way a panel opens
or closes; they tear down and restore the wardrobe's WebGL case, so never
toggle `#panel.on` by hand. `syncMapChrome()` adds `.map` and `.tall`.

## Decisions on each screen that are load-bearing

One line each; the paragraph is in `docs/design/chrome.md` (or the doc
named). Undoing one of these needs the paragraph.

- **Buttons** are lit caps: fill + `0 3px 0 var(--lip)` + press. A disabled
  button keeps a visible background. Any `box-shadow` keyframe must carry
  the lip or the cap flattens while it pulses (`cuePulse`, `tutlive`).
- **`.flatbtn.peril`** (fold will kill you) is dark hazard stripes and a
  blinking triangle, never a glow; **`.strike`** (fold will kill *it*) is
  the lit, breathing one. Opposites by construction.
- **Icons are solid SVG** with `.lite` / `.dim` / `.ln`; text glyphs at that
  size were reported as missing buttons.
- **The lives bar sits under the level text, split to the two sides**: your
  hearts left (over your own piece), the opposition's row right. `top` is
  measured off `.hud` in `syncBossBar()` because the hint's height moves. It
  used to be one centred stack in the gap between the corners, which read as
  one meter with two halves.
- **The star total hides** behind any panel and while a clock runs.
- **The live star row is its own element**, rebuilt only when the count
  changes; anything animated inside `syncHud()`-rewritten markup restarts
  on every redraw.
- **Panels are phone-width, centred, max 560px.** Full-height ones use
  `.panel.tall` furniture; the way out is in the header, not the footer.
- **Map nodes**: disc = level, hexagon = boss (violet), diamond in a ring
  = trial (amber), all SVG (`mapShape`), told apart with colour removed. The
  section fill is measured against the trail, raised over two frames, and
  its crest is a mask. Node classes are `.mboss`/`.mtrial`, never
  `.boss`/`.trial`.
- **Home screen**: z-index 11, *under* panels; `CONTINUE` wears the
  section's colour; the shop rows use `pointerup` with a travel test, not
  `tap()`; the plinth canvas is replaced, not reused (`homeCase`).
- **Win card**: `won` story line is `esc()`d innerHTML; only newly gained
  stars fly; `NEXT LEVEL` becomes `WHAT'S LEFT` when the next level is
  behind the boss gate.
- **Cards** (`.won` family) are full-bleed and answer `screenUp()`; the win
  card is deliberately not in `screenUp()`.
- **Type starts at 12px**; a bigger size is only half of readable, the
  other half is fewer words.
- **The chrome follows the ground** (`paperIsLight()`), not the verb.
- **Nothing in `.splash` may carry `opacity` or `filter`** (flattens the
  3D cubes). The sting listens on `pointerup`/`click`.

## Z-order

canvas 0 · `.hud` 10 · `.bar` 10 · `.boss` 11 · `.coach` 11 · `.home` 11 ·
`.corner` 12 · `.panel` 12 · `.replayui` 14 · `.toast` 15 · `.phasenote` 16 ·
`.won` cards 20 · `.startotal` 30 · `.flystar` 40 · `.splash` 60.

## Screenshots

```
node tools/shot.js --list                 # every named screen
node tools/shot.js map menu home          # three PNGs in shots/
node tools/shot.js level:12 flat:12 win:12
node tools/shot.js map --small            # 327×711 @2.75, the owner's phone
node tools/shot.js menu --desktop
node tools/shot.js map --tag before       # then edit, then --tag after
node tools/shot.js level:2 --ui full      # with the d-pad
node tools/shot.js level:5 --eval "press('R');press('R');doFlatten()"
node tools/shot.js --all                  # ~25 screens, about a minute
```

`shots/` is git-ignored. Read the PNG with the Read tool; it is a picture
of the real page, rendered by the real code, so what it shows is what the
owner will see. A page error is printed after the file name with `!!`.

## Class-name collisions already paid for

`.boss` (HUD) vs `.mboss` (map) · `.home` (overlay) vs `body.athome` · `.st`
(gold price) vs `.ln` (stroked icon path) · `history` vs `window.history`.
Grep before naming.
