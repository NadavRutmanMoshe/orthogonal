# The UI - where every screen lives

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
| `40-panels.css` | `.panel` shell (the 44vh sheet), `.srow` sliders, `.lrow` level rows, `.tabs`, the wardrobe (`.wbody .wcase .wglass .wfloor .wcanvas .wact .item .grid`), `.secbar`, `.chap`, `.leg`, `button.mini` |
| `50-layout-cues.css` | control layouts `body.ui-compact / ui-none / norot / tut`, `.coach`, `.crow` + `.seg`, `cuePulse` / `button.cue`, `.toast` and `.toast.cuesay` |
| `60-splash.css` | the sting (`.splash .sstage .scube .srule .sprompt`) |
| `65-replay.css` | the kill cam end to end: the strike sting (`.bsting .bsflash .bsray .bsring .bsword`), the skip catcher (`.rskip`), the wind-up (`.killcam` + `.snow .cam .vf .live`, `.kcsnow .kcroll .kcvhs`, the camcorder `.kcrig .kccam .kcbody .kchandle .kcmic .kcvf .kcbarrel .kclens .kcglass .kctally`, the viewfinder `.kcframe .kcb .kcrec .kctc`), then `.replayui`, `.rbar`, `.rlabel`, `body.replaying` |
| `70-cards.css` | the full-bleed cards: `.won` (win card, intro card), `.bigstars`, `.wonmast .wonlock .wonstory`, `.tutcard`, `#bRetry` |
| `75-bossbar.css` | `.boss` lives/cores bar, `.startotal`, `.flystar`, `.sg` |
| `80-panel-tall.css` | full-height panel furniture shared by menu, wardrobe, chooser and map: `.panel.tall .phead .pbody .pcard .prow2 .pgo .psub .pdanger .pfoot`, the range slider skin |
| `85-map.css` | `--vio --amb` tokens, the section chooser (`.secgrid .sectile .secem .secnum .secname .secsub .secpb .secf .seccap .secchain .seclock .secad`), `.panel.map .mhead .mcard .mbar #mtrail .mfill .mnode` (+ `.mboss .mtrial .solved .here .locked .skipped .mst`), `.mstars .mcap .msheet .mlegend`, the offer-card buttons `.ma .go .ad .qt .mn`, `.adicon`, the global reduced-motion rule |
| `90-tutorial.css` | the guided lock (`body.tutlock`, `.tutlive`, `.tutsoft`), `.phasenote`, the ghost hand (`.ghost .gfinger .ghand .gtrack .gsay`) |
| `95-home.css` | `.home` overlay, `.hcont` (CONTINUE, `--sec`), `.hshop`, `.hward` / `.hward.hmine` (WARDROBE, MY LEVELS), `.tiny` (SETTINGS) and `.tiny.hmulti` + `.hlock` (the locked MULTIPLAYER under it), `body.athome` |
| `98-story.css` | the three cutscenes: `.story` overlay, `.sfade`, `.scap` (+ `--say`), `.sskip`, `body.instory` / `body.storyask`, `.storyend` |
| `99-guide.css` | the neighbour's speech bubble: `.gbub` (+ `.on`, `.stuck`), and `.wonguide`, his line on a win card |

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
up), `splashing`, `replaying` (also arms the `.rskip` catcher), `bosshold`,
`instory` (a cutscene is running - takes the HUD, bar, coach and star total
off, the same list `athome` takes), `storyask` (the one beat that hands a
verb back; brings the bar up carrying only `GO 2D`, and only on a button
layout).

## Screens, one row each

Static markup is in `index.html`; dynamic markup is a JS function that
builds a string and hands it to `showPanel(html, kind)`. Bindings for
static buttons are in `js/19-bindings.js`; a dynamic panel binds its own
buttons at the end of its builder.

| Screen | Markup | Filled / built by | CSS | Shot |
|---|---|---|---|---|
| Corner buttons (menu, wardrobe, bulb, restart, eye) | `index.html` `.corner.tl` / `.corner.tr` | `syncHud`, `syncHintN` | `10-buttons` | any level |
| HUD text: level name, hint, move count, live stars | `.hud`: `#lvName #lvHint #moveLabel #starRow` | `syncHud`, `syncStars` | `00-base`, `20-hud` | `level:2` |
| The primer: a level's rules, as a live checklist | `.primer`: `#lvPrimer` | `syncPrimer` writes it, `primerMarks` marks it every frame (`18-ui.js`), from `L.primer` | `00-base` | `level:15` |
| Lives / cores bar on a clock | `#bossBar` | `syncBossBar` | `75-bossbar` | `boss`, `trial` |
| Running star total | `#starTotal` | `syncStarTotal`, `starPop`, `flyStars` | `75-bossbar` | `win:2` |
| Control bar: d-pad, turn, GO 2D | `#playBarWrap` | `syncHud` (classes), `applyUI` (layout) | `10-buttons`, `20-hud`, `50-layout-cues` | `level:2 --ui full` |
| Editor / composer bars | `#editBarWrap`, `#composeBarWrap` | `14-editor.js`, `17-composer.js` | `30-editor` | `editor` |
| Coach line (hidden by default) | `#coach` | `tutSync` | `50-layout-cues` | `tutorial` |
| Ghost hand + label | `#ghost`, `#ghostSay` | `tutGhost`, `ghostRestart`, `cue()` | `90-tutorial` | `tutorial` |
| Guided-lock dim | `body.tutlock` | `tutEngage`, `tutUnlock` | `90-tutorial` | `tutorial --wait 4000` |
| Phase note on a boss | `#phaseNote` | `phaseNote()` (`12-play.js`) | `90-tutorial` | `phase` |
| What killed you, over the kill cam | `#deathSay` | `deathSayShow()` / `deathSayTick()` (`12-play.js`), from `L.primer.why` | `90-tutorial` | `level:15 --eval "press('up')"` |
| The strike sting: a core down, or a life gone | `#bossSting` (static) | `bossSting()` / `bossStingHide()` (`12-play.js`) | `65-replay` | (use `--eval`) |
| The kill cam's wind-up: snow, camcorder, viewfinder | `#killCam` (static) | `killCamStart()` / `killCamEnd()` / `killCamHide()` (`12-play.js`), timecode by `kcStamp()` | `65-replay` | (use `--eval`) |
| Replay chrome | `#replayUI` | `replayStart` / `replayEnd` | `65-replay` | (use `--eval`) |
| Toast / spoken cue | `#toast` | `flash()`, `flashCue()` | `50-layout-cues` | `toast` |
| The sting | `#splash` | `20-splash.js` | `60-splash` | `splash` |
| Intro card | `#intro` (static) | `nothingBehind()` decides it shows | `70-cards` | `intro` |
| Tutorial / explanation card | `#tutcard` | `cardPut(h,p,owner)` | `70-cards` | `tutcard` |
| Win card | `#won` | `win()` (`12-play.js`): title, `.bigstars`, `#wonSub`, mastery/lock/story lines, buttons | `70-cards` | `win:2` |
| Cutscene caption / skip / fade | `#story` (static) | `stSay()`, `stFadeTo()`, `storySkip()` (`22-story.js`); the scene itself is a level in the game's own renderer, placed by `storyFrame()` | `98-story` | `story1:0`, `story1:14`, `story3:3`, `story2:1`, `reunion` |
| The father, glimpsed behind a fire level | (no markup - a mesh) | `ghostShow()` / `ghostFrame()` (`23-guide.js`) | - | `glimpse` |
| The neighbour's speech bubble | `#guideBub` (static) | `guideSay()` / `guideHide()` (`23-guide.js`); moved every frame by `guideFrame()` to sit over the cube it belongs to. The CUBE is the button, not the bubble | `99-guide` | `guide`, `guidestuck` |
| The last card, after the last fold | `#storyend` (static) | `storyEndCard()` / `storyEndOk()` (`22-story.js`); answers `screenUp()` | `98-story`, `70-cards` (`.won`) | `storyend` |
| Home screen | `#home` (static shell) | `homeShow`, `homeSync`, `homeCase` | `95-home` | `home` |
| Menu | `#panel` | `menuPanel()` (`16-panels.js`); rows via `seg()` | `80-panel-tall`, `40-panels` (`.srow`), `50-layout-cues` (`.crow .seg`) | `menu` |
| Wardrobe | `#panel.ward` | `wardrobePanel(tab)` (`shape` / `color` / `deal`), `wardRefresh`, `wardMeta` | `40-panels`, `80-panel-tall` | `wardrobe`, `wardrobe:color` |
| DEALS shelf | same | `wardList("deal")` = `PASSES` + `deal:true` shapes; prices via `dealPrice()` / `dealPriceSay()`, the `.wgives` list and `.wwas` struck price in `wardMeta` | `40-panels` | `--eval "wardrobePanel('deal')"` |
| Section chooser | `#panel.map.secs` | `sectionPicker()` → `secGridDraw`, `secEmblem`, `secChains`, `secLock` | `85-map` | `sections` |
| Map | `#panel.map` | `levelPicker(n)` → `mapDraw`, `mapLayout`, `mapShape`, `mapFill`, `mapWeather`, `mapFocus` | `85-map` | `map`, `map:1` |
| Level sheet on the map | `#mSheet` inside the map | `mapSheet(i)` | `85-map` (`.msheet`) | `sheet:5` |
| Map help sheet | same | `mapHelp()` | `85-map` | `maphelp` |
| Legend | `#panel` | `legendPanel()` - **no button opens it any more**; `WHAT THE PIECES DO` came off the menu so the settings sheet fits one screen. The builder is intact and one `bind` away | `40-panels` (`.leg`) | `legend` |
| MY LEVELS | `#panel` | `myLevelsPanel()`, and its four small screens `newLevelPanel`, `renamePanel`, `sharePanel`, `deletePanel`, `loadLevelPanel` | `40-panels` (`.mlrow`, `.grow`) | `mylevels`, `newlevel` |
| MORE / project / import-export | `#panel` | `libraryPanel` (the designer's workbench behind MY LEVELS), `projectPanel`, `ioPanel` | `40-panels` | `library` |
| Offer cards (stars, refill, skip) | `#panel.offer` | `offerShell(kick,title,lead,acts,note,tone)` via `starsOffer`, `hintRefillOffer`, `struggleOffer` | `85-map` (`.panel.offer .okick .olead`, `.ma .go .ad .qt .mn`) | `starsoffer`, `refill`, `struggle` |
| Ad buttons everywhere | | `adIcon()` (`18-ui.js`), one helper, five callers | `.adicon` in `85-map` | |

`showPanel()` / `hidePanel()` (`18-ui.js`) are the only way a panel opens
or closes; they tear down and restore the wardrobe's WebGL case, so never
toggle `#panel.on` by hand. `syncMapChrome()` adds `.map` and `.tall`.

## Decisions on each screen that are load-bearing

One line each; the paragraph is in `docs/design/chrome.md` (or the doc
named). Undoing one of these needs the paragraph.

- **The player's rim (`outlineFor`) is picked off the piece, not the ground:
  white lines on everything, black lines on anything too pale to take them.**
  One threshold, no background. The old background-only rule gave a white skin
  a white rim on the void, so it had no visible edges at all - in play, in the
  wardrobe's case, and on the white family in the opening. `chrome.md`.
- **Buttons** are lit caps: fill + `0 3px 0 var(--lip)` + press. A disabled
  button keeps a visible background. Any `box-shadow` keyframe must carry
  the lip or the cap flattens while it pulses (`cuePulse`, `tutlive`).
- **`.flatbtn.peril`** (fold will kill you) is dark hazard stripes and a
  blinking triangle, never a glow; **`.strike`** (fold will kill *it*) is
  the lit, breathing one. Opposites by construction.
- **The ghost hand sits under the arena, not on it.** `.ghost` is at 72% of
  the screen for a hint (as low as it goes without landing on the control
  bar) and 82% during a gesture lesson (`body.tutgest`, which hides the bar),
  86% in landscape. It used to be at 60% - on top of the blocks, with its
  swipe track across them - and players read it as "touch the piece".
- **Icons are solid SVG** with `.lite` / `.dim` / `.ln`; text glyphs at that
  size were reported as missing buttons.
- **The primer is `L.primer`, at the top, and only SPARRING has one.** A
  **checklist** of a level's rules under its hint, for the one lesson that
  cannot be taught by pressing anything (`docs/design/bosses.md`). Each line
  is a predicate over `killState()`, so the boxes tick and untick as the
  player moves - a static list is a card on the wall, which is what it was for
  one playtest. **Two passes, and they must stay separate:** `syncPrimer()`
  writes markup and runs from `syncHud`; `primerMarks()` only toggles classes
  and runs **every frame** from the render loop, because a hunter plants its
  line on its own clock. It goes through `tutWords()` like the coach's prose,
  so `{do:2d}` says what the player's own control layout says, and it is
  filled **before** `syncBossBar()`, which measures `.hud` to place the lives
  row. **It is not the retired "brief"** - that was a full-bleed card
  explaining a fight, dropped for saying what the board already said, and the
  word is still spoken for in `cardOwner`.
- **A hit gets one loud beat, and it is the only one in the game.** `.bsting`
  is a full-bleed sting - a bloom, speed lines, two rings and one word - fired
  by `bossSting()` on a core going down (`CRUSHED` / `PHASE CLEAR` /
  `BOSS DOWN`) and on a life going (`FLATTENED`). One token, `--k`, drives all
  of it: the goal's teal on a kill, which is what a doomed hunter already
  turns, and the pack's red on a death, which is what a hunter already is - so
  it is read as colour before it is read as a word. It is DOM rather than
  scene geometry because it has to cover the screen in the most expensive
  instant the game has. **Its timer is a `setTimeout`, not a frame counter**:
  the sting IS the CSS animation and has to expire when the animation does, in
  real seconds; counted off the render loop's `dt` it expired in two frames on
  a slow device and never appeared at all.
- **The kill cam winds up before it plays**, in four beats set as four
  classes on `#killCam` by `killCamStart()`: `.snow` (the picture drops to
  television snow), `.cam` (a camcorder is raised, held against the glass and
  pushed through it), `.vf` (its viewfinder fades up over the last of the
  push), `.live` (the film starts). **Everything on the camcorder is opaque
  except the lens glass**, and the push-in scales about the *lens's* centre
  rather than the camera's - so the body, the barrel and the handle sweep off
  the edges and the last thing over the picture is a hole. The body and the
  glass dissolve at 54-74% of the fly: at the end they are thirteen times
  their drawn size, and a specular that size is a white blob over the film,
  not glass. Nothing that darkens the middle may live on `.kclens`, because an
  `inset` shadow paints over a transparent background and scales with it.
  **`.live` states the end position rather than trusting the animations to
  have arrived at it** - they only land if frames are drawn, and a device that
  hitches through the push-in would otherwise leave the snow over the film.
  The snow is a **canvas** (`#kcNoise`, 96x160 random pixels a frame, blown up
  with `image-rendering:pixelated`), never a CSS gradient: television snow is
  noise and a repeating gradient is a texture. **REC and the timecode live in
  the top bar**, not under it - under it they land on the level's name and
  hint, the same collision the REPLAY label was moved out of.
- **The first beat is long, and it has been raised twice from playing it**:
  `KC_HOLD_DEATH` 1750ms, `KC_HOLD_KILL` 1550ms. The sting's own animation is
  940ms, so anything under a second cuts the word off mid-read and the snow
  arrives on top of the news. What it buys is *one thing at a time*: the word
  lands, it is read, the board it happened on is seen, then the picture drops.
- **`Menu > Kill cam` is FULL or PLAIN** (`settings.killcam`, whitelisted in
  `loadSettings`, reset by RESET SETTINGS). PLAIN keeps the sting and the film
  and cuts the television out of the middle - `kcFull()` gates both
  `killCamStart()`'s beats and the `kcLead()` the film waits on, so PLAIN is
  genuinely shorter and not just hidden. It is a real open question about how
  much ceremony a death deserves, not a debug switch; both halves ship.
- **The whole screen is a skip while a film is up.** `#repSkip` (`.rskip`,
  z-index 17) is a full-bleed catcher that is `pointer-events:auto` only under
  `body.replaying`; it is the deliberate exception to `.replayui` and
  `.killcam` both being `pointer-events:none`. Bound through `tap()`, so the
  press that skips cannot also reach the board - where a double tap is the
  fold. `replaySkip()` goes **through `replayEnd()`**, never round it: that is
  the one place that restores the board, the camera and the player's mesh and
  then runs whatever was waiting behind the film (the phase advance, or the
  last death).
- **A kill is scored and a death is silent under the snow** - owner's call,
  and it survives a re-read of the code as an accident. `SFX.cheer()` on the
  beat of the hit, `SFX.rec()` when the viewfinder lands, `SFX.relive()` on
  the film's closing fold (the game's own strike, `REP_FOLD_MS` later, at half
  gain), latched one-shot by `rep.fx` because that branch runs every frame of
  the fold. A death's *wind-up* plays `SFX.die()` and nothing else: the groan
  that used to sit under the snow was a bandpassed noise bed swept down to
  155Hz, and on a phone speaker under television snow it was indistinguishable
  from the snow having a soundtrack. Applause carries the crowd now, not the
  bed - it is the one crowd sound nothing else here could be mistaken for.
- **The film has a soundtrack, and it is recorded by listening.** `repSfx*`
  (`12-play.js`) wraps the named entries of `SFX` **once** and pushes
  `{t,n}` onto a tape whenever the fight is live; `replayFrame()` walks
  `rep.si` forward and re-fires them through the saved originals. Wrapping
  beats scattering a `repSfxMark()` call beside every sound: it cannot
  disagree with the game, because it observes what the game actually played,
  and a sound added later is on the tape for free. The clock is the frame
  ring's own (`repT+repAcc`), so event times compare directly with
  `repBuf[i].t` and the film's `REP_RATE` slow-motion spreads the sounds out
  with the pictures. **`strike` is deliberately off the tape** - it fires on
  the last instant of the recorded window and the stylised closing fold takes
  another half second, so recorded it would land before its own picture;
  `SFX.relive()` plays it on the fold instead, and for the same reason no
  longer plays the fold itself (the player's real one is on the tape).
- **Things that die come apart** (`ash*` in `10-render.js`, called from
  `12-play.js` on every kill and death, and again on the film's closing fold).
  The stagger is the whole effect: each speck's release delay comes from how
  high up the body it started, so the piece crumbles top-down and a speck that
  has not been released yet is still sitting where it started. Released
  together it is a firework, which is something that happens *to* a thing.
  Two traps, both paid for: **`THREE.Points` does not render in this vendored
  three.js** (r128, trimmed - an enormous plain Points on top of a hunter drew
  nothing), so it is cubes in one `BufferGeometry`; and the cloud must start
  at **`huntMeshes[i].position`, not the logical cell**, because the mesh eases
  toward the square and a hunter mid-step is a third of a square behind it.
- **The film is held, not delayed.** `rep` is set the instant the hit lands -
  that is what freezes the fight and saves the pose - and only the playback
  waits, on `rep.leadUntil`. It is a **wall-clock deadline**, because the four
  beats are `setTimeout`s driving CSS animations; counted by summing the
  render loop's `dt` it lost 1250ms of a 1810ms lead to the one long frame
  after a level loads, and the film started while the camera was still in the
  air.
- **What killed you is said in the middle of the screen, not in the list.**
  `.deathsay` is one short line at `top:38%` - the phase note's position and
  family, one layer above the replay chrome, because it is a caption ON the
  kill cam. It appears the instant the life is lost, holds for as long as the
  film runs (`deathSayTick` counts only while `rep` is null), and goes on the
  next committed move (`pushHistory()`). A four-line list at the top of the
  screen is not what anybody reads in the second after dying.
- **A death is explained against `primerLast`, not the live board.** It reads
  the state from a frame *before* the hit, because the charge stands the
  hunter on your square before `bossHurt()` runs - explained live, every death
  would congratulate you on being perfectly lined up. For the same reason
  `primerMarks()` **freezes while the replay runs**: the film writes the
  recorded pose into live state, so an unfrozen list would tick "face its
  direction" under a line saying you did not turn.
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
  `.panel.tall` furniture.
- **The five full-height panels share one page shape** (menu, wardrobe,
  chooser, map, MY LEVELS - the last through `mlScreen()`, which is the only
  way its own screens are built). **Header:** title + subtitle left; then, always in this
  order and always right-aligned, `?` (only where help exists), the star
  total (`.mtot`), `✕`. **Footer** (`.pfoot` in `80-panel-tall.css`): two
  equal buttons - left goes UP one level (`HOME`, or `SECTIONS` on the map),
  right is `CLOSE`. Nothing else goes in either row. `campaignStars()` is the
  one source for the number the chooser and the map both print.
- **LEVELS opens the chooser, not the map.** `sectionPicker()` is a 2x2 of
  the four numbered sections with the V · EXTRA shelf full-width under it.
  PROLOGUE is not on it (`secPickable()`): it is the tutorial, and the way
  back into it is REPLAY TUTORIAL in the menu. `levelPicker()` clamps off
  section 0 for the same reason. There is no tab strip on the map any more: one section per visit,
  and the way to another is out through the chooser (`‹` in the map header,
  `SECTIONS` in its footer). That is what stopped a section rebuilding
  in place under an already-open map. A locked tile drains, takes chains and
  a padlock, and carries the ad chip when `mapSectionSkippable()`.
- **`mapFocus()` scrolls `#mBody` and nothing else.** `scrollIntoView` walks
  every scrollable ancestor, the panel included, which slid the map's own
  header off the top of the screen.
- **The campaign star total is on the chooser; the map header carries the
  section's name** (numeral stripped) **and its cleared count.**
- **Map nodes**: disc = level, hexagon = boss (violet), diamond in a ring
  = trial (amber), all SVG (`mapShape`), told apart with colour removed. The
  section fill is measured against the trail, raised over two frames, and
  its crest is a mask. Node classes are `.mboss`/`.mtrial`, never
  `.boss`/`.trial`.
- **Home screen**: z-index 11, *under* panels; `CONTINUE` wears the
  section's colour; the plinth canvas is replaced, not reused (`homeCase`).
  `WARDROBE` and `MY LEVELS` are the HUD's round-button skin unrolled into a
  pill - one `--c` drives fill, rim, glyph and lip. The two browse rows that
  used to sit here are gone (`docs/HISTORY.md`).
- **`MULTIPLAYER` is on the screen, shut, and the smallest thing there** -
  a `.tiny` *under* SETTINGS, not a pill in `.hshop`. It is present because a
  door you can see and cannot open is a promise and an empty space is nothing;
  it is small and low because a promise must not outrank the four doors that
  work. At full pill size the screen stopped reading as four doors and started
  reading as a menu (owner's call). Shut is said with the chooser's own
  language - drained, dashed rim, a padlock (`.sectile.lk`, `85-map.css`) -
  never a second one; at 30px the padlock is the whole sentence and the `SOON`
  cap went with the size. **It and SETTINGS are one pair, so they are one
  width** (178px): two hug-width pills of different lengths stacked on one
  axis read as a mistake rather than as a pair, because the longer word is an
  accident of the alphabet. With a fixed box there is a column again, so both
  icons are pinned at the same offset and the labels stay centred - the same
  arrangement the four full-width doors above use. It keeps a lit background: a control that goes to
  *nothing* reads as a rendering failure rather than as a locked door.
  Pressing it says when, through `flash()` - the only chrome that survives
  `body.athome`.
- **`enterEditor()` takes the home screen and any panel down itself**, in
  that order, the same way `enterPlay()` does. `MY LEVELS` is what made that
  reachable; `hidePanel()` restores the plinth, so the overlay must go first.
- **The settings panel opened from inside a campaign level carries one
  navigation row** (`.psec`, `80-panel-tall.css`): the section you are on, in
  its colour and wearing its chooser emblem, going straight to
  `levelPicker()`. Not shown at home, on a tutorial, or from the library or
  the editor. It is the only exception to "no navigation row at all" and it
  is not a second LEVELS - it is the shelf you are standing on.
- **The settings header has no subtitle.** It used to print the current
  level's name under `Settings`; the level's name is on the HUD behind the
  panel, and the `.psec` row already names where you are. The other three
  tall panels still carry a subtitle.
- **`LEVEL EDITOR` is not in the menu.** It is `MY LEVELS` on the home
  screen - a place you go, not a setting.
- **`MY LEVELS` is a place, not a sheet.** It is a `.panel.tall` screen
  (`panelKind` `mylevels`, which also carries `.mylv` for its own rules), and
  the home button opens `myLevelsPanel()`. Its body is two full-width caps -
  `ADD LEVEL` (primary, `.pgo`) then `LOAD A LEVEL`, same size - and the list
  under them is exactly as wide: **one level per card** (`.mlrow`). A card
  wears **its ground's colour** in `--sec` (`SECTIONS[].col`, via
  `groundOf()`) on its rim, its lit left edge, its emblem and its meta line,
  and is **three lines**: the name with the **pencil that renames it against
  it** (`flex:0 1 auto` on `.lname` so it does not stretch and drag the
  pencil right) and a `DRAFT` tag; then `ground · N moves`; then the four
  verbs across the full width - ▶ play (the goal's teal), `EDIT` (the one
  word, because there is no honest glyph for "open the editor"), the share
  node and × (the only red, because it is the only thing here that cannot be
  undone). Those four shared the name's line until the name lost on a 327px
  phone. `RENAME`, `SHARE` and `DELETE` each open on `mlHero()` - the same
  card with its verbs taken off - so the screen is visibly the row pressed. `penIcon()`, `playIcon()`, `shareIcon()` and `upIcon()` are next to
  `homeIcon()` in `16-panels.js`; `LOAD A LEVEL` wears the upload arrow in
  `.pfi` size. The editor is what `EDIT` and `ADD LEVEL` open, through the
  one door `loadIntoEditor()`, which is what sets `editingId`.
  **`libraryPanel()` has no button any more** (the owner cut `MORE TOOLS`);
  it, `projectPanel()` and the composer are intact and one `bind` away, the
  same way `legendPanel()` is.
- **A level exists before it works, and there is no SAVE button.** `ADD
  LEVEL` asks for a name and a ground and writes the entry immediately; from
  then on **every edit writes it**. `snapshot()` - the funnel every board
  change already went through, because it is what pushes the undo entry -
  calls `autosave()`, which runs two timers: the board goes to storage after
  `SAVE_MS` (140ms, enough to coalesce a dragged-out wall into one write) and
  the solver runs `SCORE_MS` (1.1s) after the hand stops, because `statsFor()`
  is two BFS runs and is not something to do between two taps. Until it lands
  the entry carries a null score, which is what a **draft** looks like
  everywhere a score is printed - so a level is never unsaved, only briefly
  unscored. `saveCurrent()` is still the one writer; `opt.stats:false` is the
  cheap write and `opt.quiet` keeps the toast off (it is said **once per visit
  to the editor**: "saved - this level keeps itself"). `loadIntoEditor()`
  calls `saveCancel()`, which is what stops the outgoing board being written
  into the incoming level's entry. A pasted (`ioPanel()`) or composed
  (`buildComposed()`) level clears `editingId` and so autosaves as a **new**
  entry rather than overwriting whatever was open. `VERIFY` is still advice
  and has no SAVE of its own any more.
  The green pill that used to be in the **top-right corner** - `#eLib`,
  `syncSave()`, `.esave`, the amber `editDirty` dot - is gone, markup, CSS
  and owner. It had been moved there from the editor bar because it was being
  forgotten, which was the right diagnosis of the wrong problem.
- **A piece chip is a photograph of the piece.** `pieceShot()`
  (`js/10-render.js`) builds the real mesh - `makeBlockMesh()`,
  `makeCrateMesh()`, `buildPlayerMesh()`, the goal's wireframe box - lights it
  with the scene's own three lamps, points the game's camera angle
  (`0, CAM_TILT*34, 40`, orthographic) at it and renders **one frame into a
  `WebGLRenderTarget` using the game's own renderer**, then hands back a data
  URL. No second WebGL context, and target / clear colour / clear alpha are
  all restored. So SOLID is the section's actual surface (grass in I, basalt
  in II), CRATE has the violet in its cracks, FIRE has its flames, and START
  is the shape *and* colour you are wearing. Cached on piece + surface + skin
  (`shotKey()`); `drawToolChips()` re-reads on every `syncTools()` and a miss
  simply shoots again. Two things fall back to the hand-drawn SVG in
  `toolArt()`: **ERASE**, which is not a piece and is meant to look like a
  diagram, and a renderer that is not up yet. Hand-drawn chips were tried
  twice - off the legend's swatches, then off the renderer's constants - and
  both were wrong pictures of something on screen beside them.
- **A tap has to be able to hit a crate.** `onCanvasTap()` raycasts against
  `meshes` - the static block table `syncMeshes()` keeps - and a crate is not
  in it: it is the one piece with state, so it moves in play and is drawn by
  `buildDynamic()` into `crateMeshes` instead. The ray therefore went straight
  through every crate on the board, and a crate could be placed and then never
  erased, built on, or stood on. The tap list is `meshes` **plus**
  `crateMeshes`, and `hitCell()` reads the cell off `userData.base` (a block,
  set by `addMesh()`) or `userData.cell` (a crate, set by `buildDynamic()`
  the way a key mesh already carried its own). `userData.cell` goes stale as
  soon as a crate is shoved, which is safe because nothing but the editor
  reads it and the editor rebuilds these on every edit. Same family:
  `validate()` hands the crate set to `R.solid()`, since `makeRules()` leaves
  crates out of its block set on purpose - without it a start or goal placed
  on a crate was "standing on nothing" and the level could never score.
- **The editor only offers pieces the campaign has shown you**
  (`seenTools()` / `syncTools()` in `14-editor.js`, off `mapReach()`); a
  chip you have not met is not drawn, rather than drawn disabled. The
  ground chips on `NEW LEVEL` are the same rule (`seenSections()`), and the
  chosen ground is a `SECTIONS` index on the level (`theme`), applied by
  `levelTheme()` in the editor and in play. A ground chip on `NEW LEVEL`
  wears its section's colour and emblem, the same pair the chooser tile and
  the MY LEVELS card wear; `.grow` is a 3-column grid so a fourth ground does
  not stretch to the panel's full width.
- **Sharing is text, one line, and always the same length.** `sharePanel()`
  prints `shareCode()` - `OL2` + **exactly 64 characters** + `~Name` - in a
  `.shcode` box sized for a code rather than for a page. It is not a hash and
  cannot be: a hash is one-way and there is no server to look an id up in, so
  the whole level is inside the string; what is fixed is the *width*. Two
  packings are built per level and the shorter is sent (a flag bit says
  which): blocks as a **list**, four characters each, or as a **bitmap** of
  their bounding box, one bit per cell. Neither wins everywhere - the
  campaign's densest level is 154 characters as a list and 125 as a bitmap,
  a sparse 12-block level is 57 as a list and 125 as a bitmap - and
  best-of-two puts the worst level in the game at 57, which is what makes 64
  affordable. Median is 29, so most codes are more than half padding. The
  last character checks the other 63 and the length checks itself, so a
  truncated or mistyped code is refused rather than decoded into a smaller,
  wrong level (99% of single-character typos). A level too big for 64 rounds
  up to 128 rather than failing. `LOAD A LEVEL` takes a code, several codes
  one per line, an older variable-length `OL1` code, `orthogonal-level-1`
  JSON, a bare level, or a whole project file, and always *adds* - replacing
  is on the project file's own panel, where the button says so. **Nothing
  that could read before stops reading**: an OL1 code and a JSON level are
  both still in somebody's chat history.
- **Win card**: `.wonmast` is the section-finished pill and `.wonwear` under
  it names the shape that finished section just paid out (`grantShape()`);
  `won` story line is `esc()`d innerHTML; only newly gained stars fly; `NEXT LEVEL` becomes `WHAT'S LEFT` when the next level is
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
`.killcam` 18 · `.bsting` 19 · `.won` cards 20 · `.startotal` 30 · `.flystar` 40 ·
`.splash` 60.

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
(gold price) vs `.ln` (stroked icon path) · `history` vs `window.history` ·
`.secbar` (wardrobe, `40-panels`) vs `.secpb` (chooser tile's bar) ·
`kcStamp()` vs `#kcTime` (an element id is already a window property).
Grep before naming.
