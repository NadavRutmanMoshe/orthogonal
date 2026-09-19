# I'm Just A Cube

Read this before changing anything. It is the short memory of how the game
works **now**: the rules, the invariants, and where everything lives. It is
deliberately small, because it is loaded into every session.

**The reasoning lives one level down**, and is read on demand, not by
default:

| Read this | when you are touching |
|---|---|
| `docs/UI.md` | **anything a player looks at** - screens, panels, cards, buttons, the map, the HUD. The screen-to-file map, the tokens, the class collisions, and the screenshot loop. Start here for UI work. |
| `docs/design/chrome.md` | why the buttons, the map, the home screen, the sting, the story and the two cutscenes are shaped the way they are |
| `docs/design/levels.md` | the campaign, `SECTIONS`, `LEVEL_RENAMES`, what each level teaches |
| `docs/design/trials.md` | the sweep, the falling blocks, lives, the shield |
| `docs/design/bosses.md` | the hunters, phases, the replay, the telegraph |
| `docs/design/look.md` | the block, the sky, surfaces, scenery, the plane, water, fire |
| `docs/design/tutorial.md` | the coach, the guided lock, the ghost hand, `tutGuide()` |
| `docs/design/controls.md` | gestures, the fold tween, peek, the landing rings, `fitViewSize()` |
| `docs/design/systems.md` | legibility, hints, stars, the economy, the wardrobe, sound |
| `docs/design/composer.md` | solution-first level generation |
| `docs/ROADMAP.md` | known limitations, agreed next steps, what mobile still needs |
| `docs/SHIPPING.md` | **taking it to Android, iOS and Steam**: the store clocks that set the calendar, `adChild()` and the mixed audience, the seven IAP products and the three-that-show-two upgrade, the Steam grant, the asset sizes, and the device gauntlet |
| `docs/STORE-ANSWERS.md` | **the store forms, answered**: Play's target audience, ads, content rating and Data safety, and Apple's privacy labels. It and `docs/privacy.html` and the app's real behaviour have to agree - a reviewer checks all three |
| `docs/STORE-LISTING.md` | **the store listing, written**: the name, the short and full descriptions, which screenshot is which and why, and a table saying where every number in the copy was counted from. The other half of `STORE-ANSWERS.md`, and it ends with what only the owner can do |
| `docs/HISTORY.md` | every version of a mechanic that was tried and dropped. Read before *redesigning* something, not before editing it. |

Each of those is the previous `CLAUDE.md` text, moved verbatim. Nothing was
cut. **When you change a rule, update the one-liner here and the paragraph
there; when you learn something new, write the paragraph there and, only if
it will bite the next session, a line here.**

---

## What the game is

**The game is called `I'm Just A Cube`.** It was `Orthogonal`; the name is
four player-visible strings (`<title>`, `.htitle`, the intro card's `<h2>`,
the map header). The `orthogonal:*` localStorage keys and `dist/orthogonal.html`
are **not** the name and must never be renamed - they are every player's save
and the published artifact's URL.

A grid puzzle about projection. The player is a cube in a voxel world with
one special verb: **collapse the world to 2D** along the current camera axis
(`GO 2D`). Blocks far apart in depth merge into one silhouette, so gaps close.
**Returning to 3D** (`GO 3D`) puts you on the block nearest the camera that
produced that silhouette, which is how you cross distances. The camera turns
in 90° steps, and choosing *which* axis to collapse is the puzzle.

The verb's name is settled: `GO 2D / GO 3D`, in `VERBS` in `js/11-sound.js`,
reached through `VB()`. Code and comments say "fold"; that is deliberate.

## Rules, in full

1. You occupy one cell. Walk level, step up exactly one, or fall.
2. Stepping up needs clearance above **both** where you stand and where you
   are going (`resolveStep()`'s `occHere` argument).
3. Falling out of the world kills you and resets the level, except on a
   clock, where it spends a life and reached cores stay reached.
4. Collapsing projects everything along the view axis. If something already
   projects into your square the fold plays out, then crushes you.
5. Returning to 3D puts you on the supporting block nearest the camera,
   **unless an anchor is among the candidates**, then the anchor wins.
6. You must reach the goal in the volume. Its projection is not enough.
7. A boss has no goal: three phases of hunters, killed by folding while one
   shares your silhouette column. A trial has a goal plus a lethal plane
   sweeping one slice. Both run on a real clock, the only non-turn-based
   thing in the game.

Death is solver-equivalent to a blocked move. `resolveStep()` is shared by
the game and the solver, so they can never disagree; keep it that way.

## Layout

No build step. Classic scripts sharing one global scope, loaded in the order
listed in `index.html`. `21-boot.js` is the only file that *runs* anything.

| File | What it holds |
|---|---|
| `index.html` | all static markup: corners, HUD, boss bar, coach, ghost hand, bars, splash, home, `#panel`, `#toast`, the cutscene overlay (`#story`), and the four full-bleed cards (`#intro`, `#tutcard`, `#won`, `#storyend`) |
| `css/*.css` | **one stylesheet per screen**, linked in numeric order; the cascade depends on that order. `docs/UI.md` maps each screen to its file. **Two files are not screens**: `05-fonts.css` (the typefaces) and `97-textsize.css` (the LARGE half of Menu > Text size, every rule prefixed `body.tx-large`). |
| `js/00-storage.js` | `window.storage` over `localStorage`; in-memory fallback when storage is denied |
| `js/01-coords.js` | `AX[]`, the four camera views (`r` screen-right, `d` depth toward camera); `K()`, `box()` |
| `js/02-levels.js` | `LEVELS`, `SECTIONS`, `LEVEL_RENAMES` |
| `js/03-rules.js` | `resolveStep()`, block kinds, `makeRules()`, boss and trial rules and their checks |
| `js/04-solver.js` | `solve()`, BFS over game states; solves trials, knows nothing of bosses |
| `js/05-state.js` | mutable state, the pack, the trial clock, fold timings, `SHIELD_MS` |
| `js/06-persistence.js` | progress, settings, session, library, wardrobe, skips, fails, the hint bank |
| `js/07-difficulty.js` | `statsFor()`, tiers, stars, `statsCached()`, `starsForRecord()`, `onTheClock()` |
| `js/08-minimizer.js` | delete each block, re-solve, find what is load-bearing |
| `js/09-wardrobe.js` | skins, palettes, the star economy, the display case |
| `js/10-render.js` | the three.js scene, depth shading, sky, scenery, the animation loop |
| `js/11-sound.js` | synthesised audio, the master chain, `settings`, `VERBS`, `applyUI()` |
| `js/12-play.js` | the verbs (move, shove, fold, unfold, die, win), the fight, the trial clock, the replay, the offer cards |
| `js/13-gestures.js` | swipe, double-tap, two-finger turn |
| `js/14-editor.js` | tap-to-place editor, verify, minimize, `saveCurrent()`, `seenTools()` |
| `js/15-tutorial.js` | cues, the coach, the ghost hand, hints, `cardPut()` |
| `js/16-panels.js` | home screen, menu, wardrobe panel, the section chooser, the map, legend, MY LEVELS, `enterPlay()` |
| `js/17-composer.js` | solution-first level generation |
| `js/18-ui.js` | `$`, toasts, `showPanel()`/`hidePanel()`, `syncHud()`, star flight |
| `js/19-bindings.js` | every button and key binding |
| `js/20-splash.js` | the studio sting; the tap that unlocks audio |
| `js/21-boot.js` | startup order; runs last |
| `js/22-story.js` | the three cutscenes: `STORY`, `storyPlay()`, `storyFrame()`, `storyHolds()`. Loaded *after* boot; every call into it is `typeof`-guarded |
| `js/23-guide.js` | the neighbour who stands on the I · NATURE levels and gives a tip written for the one he is standing on. **Pure decoration** - no rule, no solver, never solid. Also loaded after boot and `typeof`-guarded |
| `js/24-ads.js` | rewarded video: `adChild()`, consent, preloading, `adWatch(done)`, and the per-unlock count `adToward()`. **Loaded BEFORE boot**, out of numeric order like 20, so boot starts it and nothing needs a typeof guard |
| `js/25-shop.js` | the DEALS shelf charged for real: `shopBuy()`, `shopRestore()`, the launch sync from the store, store prices. Loaded before boot, like 24 |
| `tools/storetest.js` | the ads and the shop driven through a FAKE Capacitor bridge, every path (a video closed early, a pending payment, the upgrade). Needs Playwright, like `shot.js` |
| `tools/verify.js` | every level machine-checked: BFS, `trialSafety()`, `bossArena()`, `bosssim`, the `SECTIONS`/`LEVEL_RENAMES` invariants |
| `tools/shot.js` | **headless screenshots of any screen** (`node tools/shot.js --list`). The eyes for UI work. A cutscene is seekable by beat (`story1:12`), and an explicit `--wait` now beats the screen's own default. |
| `app/` | **the Capacitor shell**: `capacitor.config.json`, the generated `android/` project, and `README.md` for why each non-default setting is set. `app/www/` is generated and gitignored. |
| `tools/build-single.js` | inlines everything into one file for itch.io / the artifact |
| `tools/build-app.js` | copies the game into `app/www/` for the wrapper; a copy, not a bundle |
| `tools/fonts.js` | rebuilds `css/05-fonts.css` from Google Fonts, one request per weight |
| `tools/icon.js` | **the app icon, drawn**: a boss arena with a seam down it - folded to one strip on the page side, countably deep on the volume side, the cube on one and a hunter on the other. **Three fixed colours** (rose the cube, teal the fold, red the pack) over a WORLD, switched with `--world night|fire|water|desert` and shipping as `fire`. The page gradient is hand-picked per world, never the sky mixed toward white - that washes every hue to the same putty, which is where the grey came from. Writes `app/icon/` (1024, 512, a preview sheet) and, with `--android`, the launcher mipmaps. The one place a PNG is checked in, and it is a store asset, not a game asset. **`SHIP` names the variant that ships** (`E`): it is the default AND the one writing the unsuffixed files, so `icon-512.png` is always the store's picture |
| `tools/feature.js` | **Play's 1024x500 feature graphic**, mandatory and the one asset a screenshot cannot be. The icon's scene drawn wide with **the name and nothing else** - the tagline under it came off with the game's own copy of it. Three layouts (`feature-A|B|C.png`); `zoom` and `dx` per layout are what keep the type off the cast, and **`band` is what keeps its colour**: the scene is a square cropped to a strip, so the gradients are told which slice survives and spend their whole ramp there. Without it the page was the middle third of the ramp - one flat salmon, and not the icon's picture |
| `tools/store.js` | **the store screenshot set**, eight shots numbered in upload order over `shot.js` (`--ios`, `--tablet` 7", `--tab10` 10", `--only NN`). **A tablet size is a CSS WIDTH, not a pixel count** - 1200x1920 as 400px at dpr 3 is a wide phone and would hide every tablet bug. The list is the memory: which level, which `--eval`, and how long the trial has to settle before the falling blocks are in the air. **01 and 02 are a pair** - the same board, unfolded and folded - and changing one means changing the other. Output is gitignored; `docs/STORE-LISTING.md` says what each shot is for |
| `tools/playwright.js` | `loadPlaywright()`, **one copy for all four drawing tools**. A global install lives under `<prefix>/lib/node_modules` on POSIX and straight under `<prefix>` on Windows, and `npm root -g` is the last resort that is right everywhere. The three inlined copies were POSIX-only |
| `tools/curve.js`, `tools/legible.js` | the difficulty curve; squares that draw where ground is not |

A top-level `var` must not be a `window` property name (`history` became
`moveHistory` for that reason).

## Levels, the short version

Block format `[x,y,z,k]`: 0 stone, 1 water (code says `glass`), 2 anchor,
3 crate, 4 fire (code says `spike`). The player reads **water** and
**fire** everywhere; the code keeps the old names on purpose.

- Water is solid but casts nothing. An anchor overrides rule 5 and pins a
  crate. A crate is the only piece with state; every world query takes the
  live crate list. Fire kills underfoot and poisons the whole silhouette
  column it folds into. Keys exist in code and the editor, unused.
- **Fire only costs moves when the way round it is a turn.** Walking one
  square further before folding is free - the plane and the volume both
  charge one move per square of `u` - so a spike that merely postpones the
  fold is invisible to `statsFor()` and to the minimizer, however lethal it
  looks. Poison something whose detour is a rotation or a walk through depth
  (`levels.md`).
- **`SECTIONS[].at` are array indices.** Inserting a level shifts every
  later marker; `verify.js` asserts they still line up.
- **`LEVEL_RENAMES` is composed, never rewritten.** Renaming a level means
  re-pointing every existing key's value at the new name and adding one new
  entry. No key dropped, no value that is also a key. `verify.js` asserts
  both. Bosses and trials carry a numeral and no number so a landmark can
  never renumber a section. **Its keys are the one place an em dash may
  stay** - every level was `NN — Name` until the titles were de-dashed, and
  those keys are the saves written under the old titles.
- Rotation is locked (`rotate:false`) from the tutorials through `TRIAL I`
  and unlocked at `09 - The Rotation`, then never taken back. On a locked
  level the turn buttons are **not drawn** (`body.norot`).
- `tutorial:true` means no par, no stars, and the solver is not asked.
- Progress is keyed by level **name**. `progress[name]` holds a move count
  on an ordinary level and lives kept on a clock level, so reads go through
  `starsForRecord()` and writes through `betterRecord()`.
- **A fight is taught before it is fought.** `SPARRING - One of Them` sits
  before `BOSS I`: a `tutorial:true` level carrying `boss` data - BOSS I's
  phase one on the smallest arena it fits on, with a hunter that cannot walk -
  and the kill's four rules at the top of the screen as a live checklist
  (`L.primer`) that ticks itself and says what you missed when it kills you.
  `teach:true` on the boss exempts the arena from `bossArena()`'s two quality
  gates - lethal columns and depth - and from nothing else. It is a hexagon on
  the map, earns a tick rather than stars, and `bossesLeft()` skips it, so it
  gates nothing.
- **A section is called a WORLD to the player.** `SECTIONS`, `secXxx()` and
  `mapSecOf()` keep their names in code, but no string a player reads says
  "section" any more: the map's footer button is `WORLDS`, the chooser's
  subtitle is `WORLDS · n / m`, the ad says `START THIS WORLD`, and the
  toast says `world opened`. The word "section" survives in one player-visible
  string on purpose - the composer's advice about a *section of your solution*,
  which is a different thing.
- **`LEVELS` opens `sectionPicker()`, not the map.** One section per visit;
  the map has no tab strip and the way to another section is out and back in.
  PROLOGUE has no tile and no map (`secPickable()`) - it is the tutorial, and
  `REPLAY TUTORIAL` in the menu is the way back to it.
- **Skips live in `skips`, never in `progress`.** Ads buy progress, never
  score. `V · EXTRA` opens when every boss is down (`bossesLeft()`), and
  cannot be bought open.
- Always `node tools/verify.js` after touching a non-boss level.

**The player's own levels** (`docs/UI.md`)
- **MY LEVELS on the home screen is a full-height screen** -
  `myLevelsPanel()`, and every screen under it goes through `mlScreen()`. A
  row is one line: the name with the rename pencil against it, then ▶ · EDIT ·
  share · ×. `libraryPanel()` (sort, project file, composer) has no button any
  more and is one `bind` away, like `legendPanel()`.
- **A custom level is created named and saved as a draft.** `ADD LEVEL` asks
  for the name and the ground and writes the library entry at once;
  `editingId` says which entry the editor is on, and `saveCurrent()` keeps
  whatever is on the board, solvable or not. Only `VERIFY` still asks the
  solver on demand.
- **There is no SAVE button: every edit writes.** `snapshot()` - already the
  one funnel every board change goes through - calls `autosave()`, which
  writes the board 140ms later and re-runs the solver 1.1s after the hand
  stops (a null score is a draft, so a level is never unsaved, only briefly
  unscored). `saveCurrent()` is still the one writer; `loadIntoEditor()` calls
  `saveCancel()` so the outgoing board is not written into the incoming
  level's entry, and a pasted or composed level clears `editingId` and so
  saves as a new entry.
- **The editor raycasts crates too.** They are drawn by `buildDynamic()`, not
  by `syncMeshes()`, so a tap list of `meshes` alone went straight through
  them: a placed crate could not be erased or built on. `onCanvasTap()` adds
  `crateMeshes` and reads the cell through `hitCell()` (`userData.base` for a
  block, `userData.cell` for a crate). `validate()` passes the crate set to
  `R.solid()` for the same reason - a start standing on a crate is standing on
  something.
- **You build with what the campaign has shown you.** `seenTools()` hides
  piece chips you have not met and `seenSections()` the grounds; both read
  `mapReach()`, so they cannot disagree with the map. A custom level's
  ground is a `SECTIONS` index in `theme`, applied by `levelTheme()`.
- **A shared level is one fixed-length code**: `OL2` + 64 characters +
  `~Name`, out of `sharePanel()` and back in through `LOAD A LEVEL`, which
  always adds and re-scores what it takes. The width is fixed, not the
  content - blocks are packed as a list or as a bitmap of their bounding
  box, whichever is shorter, then padded, and the last character checks the
  rest. It is not a hash and cannot be one: nothing here can look an id up.
  `LOAD A LEVEL` still reads `OL1` codes, `orthogonal-level-1` JSON, a bare
  level and a whole project file (`shareCode()`, `js/16-panels.js`).
- **`LOAD A LEVEL` is a paste box and nothing else.** It offered the
  campaign's own puzzles as something to copy, one button per world; a bulk
  import on a paste box is not a thing to press on the way to pasting a code
  somebody sent you, and it is gone with `sectionCopies()` and
  `addSectionLevels()` (`docs/HISTORY.md`).

## Invariants that bite

Each of these has a paragraph of reasoning in the doc named; the line here
is the rule.

**State and clocks** (`trials.md`, `bosses.md`)
- `levelDone` stops both clocks the moment the goal is reached; every
  turn-based verb asks `levelOver()` first and re-shows the win card.
- `screenUp()` is the one "a full-bleed screen is in front of the game" test;
  keys and both clocks ask it. The win card is deliberately not in it.
- Every death on a clock spends a life, not the level. A spent life buys
  `SHIELD_MS` of shield; `shielded()` is the single predicate; `deathPending`
  freezes the shield at the moment a fatal move is *committed*.
- **A strike that has already landed does not also claim the fold.**
  `TR.live()` is the last `fire` ms of a beat and the slice is lethal for all
  of it, while the block snaps to the floor on the first frame of it - so the
  falling stopped and the killing did not, and folding into a view-axis slice
  is lethal everywhere. `trialFoldSpend()` marks the beat spent from both
  folds, and `trialFoldPeril()` stops lighting `GO 2D` once the slice is
  down. Standing in it when it lands still costs a life; folding into one
  that has NOT landed yet still kills when it arrives.
- **A sweep may be a HEIGHT** (`axis:"y"`, TRIAL IV only), and
  `drawFallRank()` has a branch for it: the volume drops on the standable
  squares at that height (walked off `trialMarks`, so the blocks land on the
  marks) and the plane drops the whole row. Every other slice runs its full
  length, floor or no floor; a height's full length is the whole board, which
  is a curtain rather than a telegraph.
- `saveSession()` refuses to write while `dying`; `respawn()` and
  `trialHurt()` write afterwards. The trial's cores and lives are in the
  session; a boss resumes fresh.
- **A boss phase may carry a `sweep`** - the trial's lethal plane, installed as
  `TR` by `bossEnterPhase()`. BOSS IV is the level. So **`TR` means "a sweep is
  running", not "this is a trial"**: `B` names a death (`die(B?"boss":"trial")`)
  and `B` decides which frame ticks the shared `shieldMs`/`slowMoMs`, or both
  frames spend them twice. `TR=makeTrial(L)` is assigned **before**
  `bossReset()` in `enterPlay()`, or it wipes the sweep the phase just armed;
  `bossReset()` reads `(B||TR)` for lives for the same reason. The sweep stops
  for the phase card, the kill cam and `bossGraceMs`. `bossSafety()` is no
  longer a no-op - it holds every sweeping phase to `trialSafety`'s property
  (`bosses.md`).
- Boss arena blocks edit `L.blocks`; the pristine list is captured **once**
  in `L.arenaBase`. Crush verdicts are taken *before* `bossFoldCrush()`
  raises the next phase. A phase clear waits for its replay
  (`bossPendingAdvance`); the last death waits too (`bossPendingDeath`).
- The replay writes recorded state into the live state and restores it
  unconditionally on every path out. Any camera that borrows a state value
  must give it back.
- `folding()` refuses the verb while the fold tween runs; it is a stamp
  taken at commit, not a read of `foldP`.
- Undo does not touch a fight.
- **A hunter is solid to your step and your own move never kills you by
  contact**: walking into one is refused like a wall (`hunterHere()`,
  `hunterInColumn()`), no life and no move. Being able to stand on one would
  make every fight "walk onto it, fold". Their step and their charge still
  kill.
- A phase may carry `still:true`: that hunter cannot walk and can do
  everything else - it plants a line the moment you share its row and the
  charge still kills you. SPARRING is the level. `bosssim.js` knows about it
  too, or it would be simulating a fight nobody authored.

**Solver and tutorial** (`tutorial.md`, `levels.md`)
- Tutorial steps are predicates over counters and state; never a step index.
  `tutGuide()` cues whatever `solve()` says the next move is; a step that
  asks for a move the solver would not make needs `free:true`, and that is
  only safe where nothing is scored.
- `solve()` obeys `lockFlat`. Its answer is cached on state **and** level
  identity, because all tutorials start from the same state.
- **A COMPLETED SAVE USED TO PAY 388 SOLVER RUNS THE FIRST TIME ANYTHING
  ASKED FOR A STAR TOTAL.** `starsForRecord()` only reaches `statsCached()`
  when a level HAS a record, and `statsFor()` runs `solve()` TWICE - so a
  fresh save cost nothing and a finished one cost 63ms in one lump, on
  whichever frame first drew the home screen or a map. It is why a fully
  cleared world's map opened three times slower than an empty one.
  `warmStats()` (`js/07-difficulty.js`, called from boot) now computes every
  par in 5ms slices 40ms apart, finishing in about 600ms. Two traps it was
  written into first, both worth knowing: an idle callback that fires on its
  TIMEOUT reports `timeRemaining()===0`, so a loop that checks the budget
  before doing any work never does any - it must be a do/while. And a CHAIN
  of `requestIdleCallback`s starves in a game, because a page that paints
  every frame is never idle - only the first fired, on its timeout, and the
  rest never came. A ONE-SHOT idle callback is fine and `warmScenery()` uses
  one; it is rescheduling that does not survive here.
- `tutStepView()` is the one answer to "what is being asked"; the coach, the
  green, the lock, the hand and `tutPoke` all read it.

**HUD and chrome** (`docs/UI.md`, `chrome.md`)
- `syncHud()` owns every body class and button class, with three exceptions
  that are re-judged per frame in the render loop: the `GO 2D` button on a
  clock (`.strike`/`.peril`), the eye (`lookCue()`) and the primer's
  checklist (`primerMarks()`).
- Anything animated inside markup that `syncHud()` rewrites restarts on
  every redraw. The live star row is its own element for that reason, and
  **the heart row is updated in place** (`syncBossBar()`) for the same one:
  rewritten, every heart arrived already spent and the going-out could not
  be drawn. `.out` is added only on the frame a heart CHANGES to gone.
  Both fatal paths call `syncBossBar()` before `die()`, or the last heart is
  never painted at all - the level resets first.
- `L.primer` is the **checklist** of rules under a level's hint (one level has
  one), and it is **not** the retired `brief`, which was a card and whose name
  is still taken. Each step is a predicate over `killState()`, never a step
  index; `syncPrimer()` writes the markup and `primerMarks()` re-marks it
  every frame from the render loop (the third thing re-judged there) and
  freezes while the kill cam runs. Its `why` lines are said by `deathSayShow()`
  in the middle of the screen over that kill cam, not in the list, and they
  read `primerLast` - the state a frame *before* the hit, because the charge
  stands the hunter on you first. It renders
  through `tutWords()` so it names the player's own controls, and it is filled
  before `syncBossBar()` measures `.hud`.
- `.hud` chrome follows `paperIsLight()`, not the verb.
- **The two typefaces are IN the file** - `css/05-fonts.css`, base64 woff2,
  latin only - and the page now makes NO outbound request of any kind. Keep it
  that way: it is what lets the Android manifest drop the INTERNET permission.
  Refresh with `tools/fonts.js`, which asks **one weight per request** and
  throws if two come back sharing a URL: a combined request returns the
  family's VARIABLE file and every weight then renders at the lightest,
  silently.
- **Anything anchored to a screen edge reads a safe-area token** - `--sat`
  `--sar` `--sab` `--sal` in `00-base.css`, each an `env()` with a `0px`
  fallback, so every `calc()` using one is exactly the old constant off a
  phone. **So does every rule that RE-STATES that edge**, and six do (the
  coach in three layouts, the cue in two, the map and the wardrobe as tall
  panels, the caption in two) - missing one pins the thing at the old number
  and nothing says so. `viewport-fit=cover` in the viewport meta is what makes
  the insets non-zero at all.
- **Class names collide silently**: `.boss` (HUD bar, `pointer-events:none`)
  vs `.mboss` (map node); `.home` (overlay) vs `body.athome`; `.st` (star
  price) vs `.ln` (stroked icon path). Grep `css/` for a class before
  introducing it.
- The wardrobe's display case is a second WebGL context, torn down in
  `showPanel()`/`hidePanel()` with `loseContext()`; a canvas that lost its
  context is spent, so the home screen replaces its canvas element
  (`homeCase()`). `body>canvas` in the CSS is what keeps the game's own
  canvas distinct.
- Panels are phone-width and centred, capped at 560px. Type starts at 12px.
- **The five full-height panels wear one page shape**: header is title ·
  `?` · star total · `✕`; footer (`.pfoot`) is up-one-level · `CLOSE`. Adding
  a control to one of them means adding it to all five or to none. MY LEVELS
  is the fifth, and every screen under it goes through `mlScreen()`.
- **The settings sheet is five cards**: WORLDS and the shelf row, Sound &
  light, **How it plays** (Controls, Fights speed, Landing mark),
  **Accessibility** (Level size, Text size) and More. The split is by what a
  setting is ABOUT - the game, or the person - so the two size rows are not
  buried among five rows about the game. `.crow label` is 98px, which holds
  TWELVE monospace characters and no more: "Where you land" is fourteen and
  wrapped, which is why that row is called "Landing mark".
- **WORLDS is at the top of the settings sheet**, a `.psec` row above the
  back-to-this-shelf row, wearing the chooser's `#4ec8e0` and `gridIcon()`.
  It opens `sectionPicker()`, not the map. It reverses the note in
  `menuPanel()` that said a fourth copy of LEVELS is one too many: every
  other door out of that sheet goes down or sideways.
- The running star total is hidden by any open panel and while a clock runs.
- **The map's ambient cubes are NOT parked during the mastery celebration**,
  and that reverses the frame-budget note that used to sit in `mapDraw()`.
  Stopping them for `MAP_PAINT_LEAD+MAP_PAINT_MS+700` meant **1890ms of dead
  background on exactly the worlds a player has finished**, every time they
  opened that map - the reward for three-starring a world was two seconds of
  nothing behind the celebration. Reported as the animation loading before
  the background, which is what it was.
- `nothingBehind()` decides intro-card versus home screen and START versus
  CONTINUE; `NEXT LEVEL` is always the next level, except into a locked shelf
  where it becomes `WHAT'S LEFT` and opens the map.
- **CONTINUE's second line is `levelShort()`, not the level's name** -
  "Level 22", "Boss IV", "Trial III", "Tutorial". The name was the longest
  string on the home screen (33 characters) and so capped the type size of
  every button on it. Bosses and trials are matched separately because they
  carry a NUMERAL and no number; anything unrecognised keeps its own name, so
  a custom level is never mislabelled.
- **The home screen's type sizes are measured, and the icons are why.** Every
  icon there is `position:absolute`, so a label can run into one with no
  overflow to detect it - `.home .tiny` (SETTINGS, MULTIPLAYER) is capped at
  12px by the gamepad, not by its box, because the label is CENTRED and grows
  toward the icon from both sides. The doors are 16px and the title 34px.

**The story** (`chrome.md`)
- **There are three cutscenes**, and this reverses `chrome.md`'s old "there
  are no cutscenes" on the owner's call. The opening is between the intro
  card's BEGIN and the first tutorial; the other two REPLACE a win card,
  on the two fights that carry one (`interlude:"fire"` on BOSS II,
  `ending:true` on BOSS IV). `win()` asks `storyAfterLevel()` and plays the
  scene instead of showing its card, once - everything else it does, the
  record and the stars and the section payout, still happens.
- **A scene that follows a fight travels to its board** (`from:"here"`): it
  begins on the arena you just won, folds it flat, fades, swaps the board
  behind the black and fades up. `ST_ARRIVE` is those five beats and
  `stArrive()` is the swap; a menu replay skips them.
- **The pack wears the officers' look and does not spin.** `huntMesh()` is the
  same cube with the same red rim the police wear in the opening, squared to
  the camera. The spin was quietly making them FINDABLE, so three things
  replace it: the body is lifted off black, the rim is near-solid, and an
  AURA (a larger box of the hunter's colour, low opacity, `depthWrite:false`)
  haloes it. The only motion left is that halo breathing - a scale, not a turn.
- **The father is glimpsed in II · FIRE**: every 20s, a 50% coin, 600ms,
  one time in ten as the Shard he came back as (`ghostFrame()` in
  `js/23-guide.js`). Behind and just over the board and INSIDE the frame -
  `fitViewSize()` frames the arena only, so an offset of a whole board-width
  puts him off screen.
- **A cutscene is a level, played by nobody**: `storyPlay()` hands an ordinary
  `tutorial:true` level to `enterPlay()`, and `storyFrame()` (called from
  `animate`, handed the camera basis) places the cast with the player's own
  projection maths, so they fold with the world.
- **The abduction and the reunion are both the fold** - four cubes in one
  silhouette column is rule 4, and the ending gives `GO 2D` back to the player
  for one press. A beat that does not explain a mechanic does not go in.
- **The son is `playerMesh`**, and in the OPENING ONLY he is repainted
  `ST_SON` - halfway between his mother's Pink and the neighbours' White,
  said nowhere. `storyStop()` calls `applySkin()` to put the equipped piece
  back. At the ending he is whatever the player made him, and `stSkinLine()`
  is his mother remarking on it: a `reward:true` shape gets one line, any
  other departure from the default cube-and-Rose another, the default a third.
- **A beat's `say` may be a function**, evaluated when the beat starts. That
  is what lets the ending read the wardrobe.
- **The verbs are held at the verbs** (`storyHolds()` beside `bossHolding()`);
  restart, hint and undo are held in the key handler, and Escape skips.
- **`seenStory1` / `2` / `3` must stay in `loadSettings()`'s whitelist** or
  the opening plays on every launch. `RESET SETTINGS` deliberately leaves them.
- **Ground only where somebody stands.** A filled lawn is a wall of grass at
  this camera angle. Screen height is `0.885y - 0.465z` (`chrome.md`).
- **The house is SOLID and FACES the camera, and the family stands outside
  it.** Five cutaway versions (door wall at the back, near side open) read as
  a U of wall in the volume and as a house only once folded. The facade is
  now the row nearest the camera and carries the whole gable; the body
  behind it is built LOWER - one course at the row behind, two at the rows
  behind that - because a row one square back draws half a course higher
  and a roof run at full height was a staircase. The arithmetic is in
  `house()`. Four facade blocks are out on the owner's call, to see how it
  looks: the bottom two courses one in from each end, the ones behind the
  parents in the first frame, so the middle of the facade is a set-back
  porch. The door and both windows are cut
  THROUGH every row of depth -
  open in the volume, and still holes in the plane because nothing stands
  behind them along the view axis. Painted windows were tried and reported
  as off. The police come up the three-wide paved path in single file on
  the door's line and SPLITS at the door, so the fold takes TWO columns at
  once - father and officer in `x=2`, mother and officer in `x=4` - on the
  owner's call. The pond and the dunes are gone (the record is in
  `stHouseBoard()`); in front of the houses is the strip and the path.
- **A speaker's line is in the speaker's colour, the narrator's in violet.**
  A cube too dark to set type in (Black) is lifted toward white, never
  swapped for the narrator's violet (`stSay()`).
- **Caption time is the sum of the beats a line sits over**, and the
  opening's and the fire's are held at the ending's pace (2.6s to 3.8s a
  line), which the owner called right.
- **A painted cell wears plain stone** (`paintedCell()`, `js/10-render.js`):
  a cell in `L.tint` is built on `TEX.stone`, not the section's surface, so
  the tint is the colour you see and a wall has no grass lid. The house is
  cream plaster under a deep red roof, and that is what finally made it a
  house after four shapes had not. `syncMeshes()` rebuilds a cell whose
  painted-ness changed, like a changed kind.
- **`foldPeril()` is null while a scene runs.** The verbs are held, and in
  front of a solid house every square shares a column with the wall, so the
  doorway lit up in the son's colour as a crush warning.
- **A scene is shot, not surveyed.** A beat may call `stFrame(box)` with two
  board corners and `recomputeBounds()` fits THAT instead of the arena
  (`storyFrameBox()`, typeof-guarded like `guidePoint()`); `def.frame` is the
  first shot. The renderer's own lerp carries the move, so set the wide frame
  a beat before the wide moment. `ST_SHOT` holds every shot: the opening's
  four, the fire's close-up (wide on arrival, close for his lines, wide again
  once he is gone, via `stFrame(null)`) and the ending's, which is close from
  the first frame. `def.frame` is applied in `stArrive()`, not `storyPlay()`,
  so a travelling scene does not fit the arena it is leaving to its own box.
- **Nothing in the menu opens a scene any more.** The three `WATCH THE ...`
  buttons came off the settings sheet on the owner's call. `storyPlay(id,replay)`
  keeps its replay flag - a replay does not mark the scene seen and hands back
  where it came from, so a future door cannot consume `FIND THEM` on BOSS IV.

**The neighbour** (`chrome.md`)
- **He is decoration, and that is forced.** Nothing in `resolveStep()`,
  `makeRules()` or `solve()` knows he exists; he cannot be stood on, walked
  into, folded into or crushed. A friendly obstacle would be a piece, a piece
  is a rule, and a rule the solver has not been told about is a level whose
  par is a lie.
- **He FLOATS on a pedestal, out the back of the board** (`guideSpot()`): the
  plinth off the `+x`/`+z` corner is gone, and he is `GUIDE_OUT` cells past
  the far edge along the axis a swipe UP walks (`-d` of view 0, which every
  level opens in). **Only on a `rotate:false` level** - that direction only
  exists while the view is locked, so the four rotating levels keep him over
  the middle, where no turn can swing him anywhere.
  **How high is arithmetic**: screen-up is height PLUS depth away from the
  camera, so a block gains `CAM_TILT` a cell for standing further back than he
  does and LOSES it for standing nearer - which is why, behind the board, he
  can sit at about its own height and still be clear over it. Per block, over
  the views the level can actually be turned to, measured to the UNDERSIDE of
  the pedestal, and clearing a whole cell over the top row because the things
  that matter (the player, the goal's wireframe) STAND on it.
  **He has a second height for the PLANE** (`flatY`, the 4th element of
  `guideSpot()`), because `tilt` is `(1-flatT)*CAM_TILT`: fold the world and
  depth stops paying, so without it he lands in the middle of the silhouette.
  `guideFrame()` carries him between the two on the fold's own `ft`.
- **`guidePoint()` is where he APPEARS, not where he is**, and that is what
  makes the offset free. `recomputeBounds()` frames a world box and charges
  the larger of the x and z spans as WIDTH, because screen-right is either -
  true for a board that can be turned, wrong for a man behind one that cannot,
  where his offset is pure depth and depth is height. So on a locked level the
  camera is handed his x, the board's own depth, and his offset converted into
  the height it draws at (and never below `flatY`). Measured: the board is
  framed exactly as if he were not there. Hand over his raw position and the
  early levels lose a whole step of zoom - the corner's bill, again.
  **Never offset along ONE horizontal axis** on a level that can turn:
  screen-right is `±x` or `±z` by view, so one axis is sideways in two views
  and straight at the camera in the other two (`chrome.md`).
- **The level NAME and HINT stay on every level, his included, and he waits to
  be pressed.** Taking them off his boards and letting him say the line
  instead (`body.gquiet`) was built, played and reversed on the owner's call
  in one round - the hole it leaves is bigger than the chrome was, and an
  unprompted bubble covers the board to say what is already written
  (`chrome.md`). His one unprompted line is still the stuck one.
- **THE BUBBLE IS ANCHORED TO A STILL POINT AND PROJECTED THROUGH A STILL
  CAMERA.** Two separate sources of the same complaint, both fixed the same
  way - type must not ride the world's juice. (1) He breathes, a sine of .035
  of a cell: the bob is applied to the MESH only and the bubble reads
  `GD.px/py/pz`. (2) The camera is thrown about - `shakeT` on a death, and a
  fold lands with a SLAM about a cell deep - so `guideAnchor()` projects
  through `gdCam`, a copy of the camera placed at `camSteady` (`10-render.js`,
  the position with neither in it). Measured across a fold: worst
  frame-to-frame jump 116px -> 28px, average 5.5px -> 1.0px. The CUBE still
  shakes, because the cube is part of the world and the sentence is not.
  His bubble flips BELOW him (`.down`) when there is no room over his head.
- **Never on a `tutorial:true` level**, and that is the whole placement rule
  (plus no boss, no trial, section 1 only). In PROLOGUE he offered the fold to
  somebody the tutorial had not taught it to yet, and a teaching level already
  has a coach, a ghost hand and a guided lock. He starts where the teaching
  stops, every time it stops.
- **He is pressed on a DEFERRED single tap** (`guideArm()` / `guideCancel()`,
  called from `13-gestures.js`). A double tap is the fold in every layout, so
  the fold always wins the race.
- **One tip per level, keyed by level NAME** (`GUIDE_LINES`, `js/23-guide.js`),
  about that level. Keyed by name because `SECTIONS[].at` are indices and an
  insertion would shift an index-keyed table onto the wrong boards silently;
  an unknown name falls through to `GUIDE_FALLBACK`, and `verify.js` fails on
  any key that is not a level he stands on.
- **The bubble is placed as a box plus a tail, never centred on him.**
  `guideFrame()` writes the box's LEFT where it fits on screen and `--tail`
  (read by `css/99-guide.css`) wherever he is inside it. Centring it and then
  clamping it back on screen is what put the box over the puzzle with its tail
  pointing at nothing.
- His tips render through `tutWords()`, his cheer goes on the **win card**
  (`guideWinLine()`, every third level), and ten losses opens his one
  unprompted line, which is a button into `struggleOffer()` - the same
  out-of-lives card the fight itself puts up.

**Settings and saves** (`systems.md`)
- **A first run is asked ONE question: how old are you.** The intro card's
  five bands ARE its start button (there is no BEGIN, and no PICK A LEVEL),
  and each writes three settings at once - `size`, `speed`, `ui` - from
  `AGE_BANDS` in `js/11-sound.js` through `applyAgeBand()`, the one writer.
  Under 18 medium · fast · hidden, 18-25 medium · regular · hidden, 26-39
  medium · slow · compact, 40-59 and 60+ large · slow · full. Nobody is given
  SMALL.
- **NOTHING ON THE CARD SAYS WHAT A BAND SETS**, on the owner's call. One easy
  question, answered, and the game is set up; the rows in Settings are where
  the details live for whoever goes looking. A card that prints what each row
  does is the three settings again, in front of somebody who has not played.
- **I'D RATHER NOT SAY is not a way out - it asks the other question.**
  `DIFF_BANDS` beside `AGE_BANDS`: EASY large · slow · full, MEDIUM medium ·
  regular · compact, HARD medium · fast · hidden. It replaces the bands in
  place (`#intro.diff`), and `ageBandOf()` looks in both tables so a save can
  carry either.
- **It is a default, not a lock, and there is no longer a way back to the
  card.** `nothingBehind()` means a save never sees it again, and
  **Menu > More > SET UP BY AGE** - the one door that reopened it - came off
  on the owner's call. `introOpen(true)` and `#intro.setup` (CANCEL, and a
  pick applies and closes instead of starting the game) still work and are
  reached by nothing; `tools/shot.js age` is the only thing that opens them.
  What is left is the three rows on **Menu > How it plays** - one card,
  because the age card writes them together - and changing one by hand does
  NOT re-pick a band.
- **`settings.speed` is the old `pace`, under a new key on purpose.**
  `paceScale()` is still one multiplication onto `dt` in both real-time loops
  and nothing else. The numeric `pace` stays out of `loadSettings()`, or a
  save from when that row existed would pin every clock at half speed.
- `loadSettings()` is a **whitelist**. A key not read there does not exist
  after reload; a key whose feature is removed comes out of the list.
- **A clock level's loss screen is `struggleOffer()`**, and it is put up on
  every out-of-lives, not on a counter. It wears **the win card's button
  row** (`offerShell()`'s `actClass:"pair"`): TRY AGAIN in the goal's green
  with `#bRetry`'s own arrow - it only closes, `die()` has already reset the
  board - and where NEXT LEVEL stands on that card, SKIP over WATCH AN AD in
  the ad button's blue. **Under No Limits it is SKIP alone in the SAME blue**
  with no video mark (it was the grey outline). **What it costs answers to
  `noLimits()` and nothing else** - a fight already in `skips` got the free
  button for one build, and turning the pass off then looked like it had not
  come off. **A skipped fight still gets the card** (it used to return early,
  so losing there showed nothing). **SKIP starts the next level**
  (`playNextLevel()`, NEXT LEVEL's own path in `js/19-bindings.js`, lock and
  all), not the map. Under No Limits the wardrobe drops its WATCH N ADS row
  too. Losing a fight and finishing short of three stars
  are the same moment, so they are the same drawing. It is a kicker, the
  level's name and the two buttons and **nothing else**: the lead and the
  footnote both came off, so `offerShell()` skips an empty lead the way it
  already skipped an empty note.
  `settings.noSlowOffer` and `STRUGGLE_OFFER` are gone with the opt-out;
  nothing suppresses the card. `fails[]` is still kept, for the neighbour's
  line at ten.
- **`SFX.die(kind)` dispatches five deaths** and none of them is a setting:
  "kapoosh" for a hunter's hit, "plack" for a crush, "kshhh" for the sweep,
  "ssss" for fire, and the fall's own voice for everything unnamed. The
  hunter's was POOF / KAPOOSH / THUD in `settings.bossdie` for one round;
  the owner picked, and the switch came out with the question.
- **`settings.text` is `"medium"`/`"large"` - Menu > Text size**, applied by
  `applyText()` as one body class and nothing else. **MEDIUM WRITES NOTHING**:
  there is no multiplier on the default path, and `css/97-textsize.css` holds
  a second, hand-checked value for each declaration under a `body.tx-large`
  prefix - which also means the file is safe at any point in the cascade,
  since the prefix buys a class of specificity over the original. It scales
  the HUD text, the home screen, panels, rows and cards; **deliberately not**
  the d-pad, the turn buttons, GO 2D or the map's nodes - those are controls
  and drawings, and two of them are what `fitViewSize()` measures.
- **SMALL is gone from Level size**, so both accessibility rows offer MEDIUM
  and LARGE and read as one question. No band ever wrote it; `loadSettings()`
  simply stops reading `"small"`, so an old save lands on medium rather than
  pinning a value with no button left to change it.
- **A bundled typeface invalidates every width measured against a fallback.**
  `.crow label` was 92px "to hold Fights speed" and had been quietly wrapping
  since `05-fonts.css` landed: the real IBM Plex Mono is wider than the
  substitute it was measured in, and it needs 96px. It is 98px now. Re-check
  any hand-tuned width after a font change.
- **`settings.foldmark` is `"on"`/`"off"`** - Menu > How it plays > Landing
  mark (it was a card of its own called "Where you land"), the
  switch on the green block the fold marks. Whitelisted in `loadSettings()`
  and reset by RESET SETTINGS. Nothing applies it: the render loop asks
  `foldMarkOn()` every frame.
- **The kill cam has no switch: `kcFull()` is a constant true.** The owner
  played FULL and PLAIN and kept the television, so `settings.killcam` came
  out of the defaults, out of RESET SETTINGS and out of `loadSettings()`.
- The buttons default is `UI_DEFAULT` (`js/11-sound.js`, `"none"`). The fresh
  `settings` object and `RESET SETTINGS` both read it, so a reset cannot drift
  away from a first run; any other default belongs next to it, not inlined.
- A stored volume only wins once `volTouched`. Volume is applied *after* the
  limiter (`outGain`); changing `MIX` or `POST` means re-measuring the
  stacked worst case.
- `migrateWorlds()` and the `v_`/`p_` id prefixes keep old wardrobe saves
  valid. Do not remove while any old save might exist.
- **The DEALS tab is `PASSES` then `deal:true` in `SKIN_SHAPES`**: the money
  shelf, priced in `usd`, no stars and no ads. Four shapes are on it: the Rook
  and the three CHARACTERS (Pup, Cat, Robot), all at one price, so the only
  question the shelf asks is which one you like. The Pup was 30 stars and
  moved here on the owner's call - a save that already bought it keeps it,
  because `wardrobe.owned` is keyed by id. Each is still a shape everywhere
  else in the code. The two **passes**
  are not shapes and do not equip: `NO LIMITS` ends the hint pool, the ad on
  a skip and the star balance (`noLimits()`, `hintsUnlimited()`, `shards()`);
  `EVERYTHING` is that plus every paid shape, granted by rule inside `owns()`
  so shapes added later are included. `dealPrice()` discounts the second when
  the first is owned. Rewards are never in a pass - money buys progress,
  never score.
- **Five shapes carry `reward:true` and cannot be bought**: four by section
  (`sec`), granted by `grantShape()` for every star in it, paid at the moment
  the last star lands (`win()`) and swept once on boot for older saves;
  neither path may use `sectionMastered()`, which the preview switch fakes.
  The fifth is a **feat** (`feat`, no `sec`): the **Domino**, paid by two of
  the pack in one silhouette column (`n>=2` in `bossFoldCrush()`), granted the
  instant it happens. `featNews` carries only the NEWS, to whichever of the
  toast, the phase note or the win card gets there first; `featCard` is the
  same item kept for the win card, so a double kill toasted mid-fight still
  gets its line at the end of that fight. **Both unlocked lines on the win
  card are buttons** into `wardrobeAt(id)`, which opens the wardrobe on that
  shape, scrolls its tile into view and selects rather than equips - and adds
  `.panel.overcard` (z-index 21), because a panel normally sits UNDER a
  full-bleed card. `showPanel()` clears that class on the way into every
  panel. The twin's branch is
  deliberately not included - a twin core is always both halves. A feat's tile
  label (`short`) must be three words at most: `.item span.wlock` is `nowrap`
  and a long one widens the grid column and pushes the list under the case.
  Its **pips are ink, not body**: a cloned material at `PIP_DARK` (.26, far
  under `OUTLINE_PALE`) so they are black on every skin and white only on
  Black, and `userData.keepColor` so `playerChar()` - which writes the
  equipped hex into every mesh in the group - leaves them alone.
- **`UNLIMITED_SHARDS` in `js/09-wardrobe.js` is `false`, and ships that
  way.** It was the playtesting switch; the star economy is live again.
  `AMB_MUTED` in `js/11-sound.js` is `true`: the ambient beds are built but
  muted, on the owner's call.
- **`buyTestPanel()` (`js/16-panels.js`) is reached by nothing.** Its TEST
  PURCHASES row under Menu > More came off on the owner's call when testing
  was done, and the `TEST_PURCHASES` switch with it. It is an ON/OFF per
  DEALS item written straight into `wardrobe.owned`; OFF really removes the
  item. Putting it back is one button and one bind, and it must never ship
  reachable - it is a free shop.
- **`wardEquip()` treats the `deal` tab as a shape.** It did not, and EQUIP
  on a DEALS shape wrote it into `wardrobe.world2`. `wardRepair()`
  (`js/06-persistence.js`, run on load) puts any slot holding an id from the
  wrong catalogue back to its default.

**Ads and the shop** (`SHIPPING.md`, "As built: ads and the shop")
- **Every ad button is `adWatch(function(ok){ if(ok) grant...(); })`.** Never
  a `grant*()` straight from a button. In a browser `adWatch` pays at once, so
  the artifact plays exactly as it did before there were ads.
- **`adWatch` settles on the DISMISSED event, never on
  `showRewardVideoAd()`**, whose promise never settles when a video is closed
  early. A close with no reward waits 700ms: iOS can send the reward after.
- **Ads start only once the age band is known** - `adBoot()` for a save,
  `applyAgeBand()` for a first run - because the child flags go to Google once,
  at `initialize`. `adChild()` is true for everything but an adult band.
- **`AD_TEST` is `true` until the AdMob account exists**, with Google's test
  ids; `tools/build-app.js` warns on every build. Going live is the real ids
  in `AD_UNITS`, the app id in `AndroidManifest.xml` and Info.plist, and the
  switch - together.
- **Store product ids ARE the game's ids**, plus `pass_all_upgrade`, which
  `shopUnlocks()` turns into `pass_all`: the upgrade id never enters
  `wardrobe.owned`, so `owns()` and `hasPass()` know nothing about it.
- **The launch sync only ever ADDS.** Android answers a failed query with an
  empty list, the same as "owns nothing".
- **A multi-video unlock is counted** in `adTally` (`orthogonal:adtally`),
  keyed `world:` or `level:` plus the level NAME. A counting label may not be
  longer than the one it replaces (`adsWatchSay()`): the map's buttons already
  wrap on a 327px phone.
- **The plugins are pinned at 7.x** (`app/package.json`, exact): their 8.x
  lines need Capacitor 8.

**Rendering** (`look.md`, `controls.md`)
- **`outlineFor()` reads the PIECE, not the background: white lines on
  everything, black lines on anything too pale to take them** (one threshold,
  `OUTLINE_PALE`). The old background rule gave a white skin a white rim on
  the void and it had no visible facets at all.
- One merged block geometry, per-face brightness in a vertex-colour
  attribute, `material.color` rewritten every frame by the block loop. Reach
  for `map`/vertex colours, never for the one channel the loop owns.
- Surfaces are drawn on canvas, never loaded; there are no image or audio
  files in this project and there will not be. Keep the grain off a pixel
  lattice (commercial reason, `look.md`).
- Muted world, saturated pieces. If you raise a section's `block` value, look
  at that section's fire and water.
- `applyTheme()` runs once per level and drops block meshes when the surface
  changes; `syncMeshes` reuses meshes by cell otherwise.
- **Every scenery texture is built ONCE and kept** (`texOnce()` / `TEX_ONCE`,
  `js/10-render.js`): the five horizon bands, the eight sprite sheets, the
  demon and the plume. `warmScenery()` builds and uploads the set at boot, in
  an idle callback, so the first crossing into a world draws none of them.
  **NOTHING MAY DISPOSE ONE.** `applyTheme()` used to call `.dispose()` on the
  scenery map and on each group's `userData.tex` as it tore the old world
  down; against a shared texture that is a blank quad in the next world, so
  those three calls are gone. Meshes, geometries and materials are still
  disposed - they are per-world and cheap. `spriteTex()` takes a KEY as its
  first argument because its `draw` closure is new on every call and four
  sprites in that file are 64x64, so neither identity nor size can key it.
- `RAY_W` .46 is the width of the charge telegraph across its own row. It was
  a .06 pane, invisible end-on - which is the view you are in when you are
  lined up, and the one the fold is taken from. It opens at **.46 opacity**,
  not .28: below that the warning existed for the whole beat and was only
  legible for the last of it, which reads as arriving late.
- **A hunter's BEAT is its walk; its LOOK is every frame.** Standing up, it
  plants on the frame you step into its row rather than on its own next step -
  `beat||!flat` in `bossFrame()` - so the ray cannot be up to a whole `step`
  (570-1400ms) late. The plane keeps the beat: flat you are a whole column and
  every hunter sharing it has a line, so asking per frame there would plant the
  pack on the instant of the fold. `shy` still counts BEATS or a cunning
  hunter burns `hold` in a frame. `bosssim.js` makes the same split.
- **`AIM_EASE` (`js/03-rules.js`) is the whole fight's reaction time**, 1.4,
  baked into `ph.aim` by `bossPhases()` so `tools/bosssim.js` simulates the
  fight that ships. A phase's own `aim` is the SHAPE of a fight; this is the
  dial for when every fight is too fast. `h.lock` is set from `bossAim()`, not
  from `ph.aim`, so the line on the floor cannot disagree with its own clock.
- **The fold's motion is one beat; what teaches rule 5 is a MARK, and it is
  only drawn COMING BACK** (`foldHiBuild()`, `js/10-render.js`). The block you
  land on is lifted toward white, leans teal, takes a bright rim and
  **breathes** - colour alone is invisible on the nature world, green on
  green. It runs for `LAND_MS` on **its own clock, started by every unfold**
  (`foldMarkStart()` in `doUnflatten`), `landEnvelope` for its fade. A peek
  lights it too. It lit on the way INTO 2D as well, off
  `flatT`, and that half came out on the owner's call: a 520ms fold gives it
  a few hundred milliseconds, so it read as a flash, and it was answering a
  question the player had not asked yet.
  **It lights EVERY LANDING THE FOLD OFFERED, asked of the rules, never of
  the meshes.** From `foldOrigin` (the square and view `doFlatten()` started
  from; in the history, so undo carries it) it walks the plane with
  `resolveStep()` over `R.siloSolid()` exactly as `move2()` does, and every
  square it reaches is handed to `R.landings()`/`R.pick()`; a landing onto
  fire stays dark. Walking MESHES for ledges was the water bug - water is a
  block you see and a hole in the plane - and its `n>1` column filter is why
  world I, one block deep, never lit. No special case for the block under
  your feet: the square you stood up from is reached, so it lights by rule.
  **Never in a boss** (`foldMarkWanted()` asks `!B`), **on in a trial**.
  **The landing RINGS are gone from a landing** on the owner's call - the
  mark now says the same thing on every block. `showLanding()` is reached by
  nothing; the peek's live rings and the tutorial's rings (`tutLandMark()`)
  stay.
  Peril and the tutorial's landing marker both outrank it. `foldMarkOn()`
  (`settings.foldmark`, Menu > How it plays > Landing mark) turns it off.
  A two-beat fold that gathered the world
  into the front block was built, played and dropped for this
  (`controls.md`, `HISTORY.md`).
- `INK_SETTLE` .18 and `PAPER_LIFT` .20 are the whole 2D look; both have
  been raised and reverted. The paper is derived from the sky.
- `DEPTH_STEP` .34 charges the first cell of depth outright; `CAM_TILT` .62
  is a named constant read by the camera and `fitViewSize()`, left alone by
  the owner's decision. `FOLLOW=0`.
- `fitViewSize()` fits the arena to the screen per axis; portrait and
  landscape convert differently, and the bar does not buy size in portrait.
- **Menu > Board (`boardScale()`) is a wish, and `fitViewSize()` clamps it.**
  Scaling that fit crops - the biggest arena is 12 cells inside a 14-cell
  frustum - so the answer is held up by the whole arena plus `PAD_TIGHT`, and
  the vertical requirement passes through untouched (those margins are the
  level name and the control bar). LARGE can only win the margin on a board
  that already fills the screen. No rule, par or solver knows it exists, and
  it is **pinned at 1 while a cutscene runs** - a scene is shot, not surveyed,
  and `stFrame()`'s boxes are composed against the default framing.
- Nothing in a baked horizon texture moves; motion is drawn on top.
- `edgeGeo` is cut from the .9 case; `repeat.set(2,1)` only for a band with
  no landmark in it.

**Audio** (`systems.md`)
- Every voice goes through `masterGain → limiter → POST → clipper →
  outGain`. Every write to `masterGain.gain.value` goes through
  `masterLevel()`. A gain node is born at 1: silence anything fed by a
  running source at creation.
- Sound waits for a gesture; the sting listens on `pointerup`/`click`, never
  `pointerdown`.

**Controls** (`controls.md`)
- The four verbs are `press`, `rotateView`, `doFlatten`, `doUnflatten`;
  buttons, keys and gestures all funnel through them, so a gate goes there.
- Double-tap changes dimension in every layout; single tap does nothing.
  Two-finger turn reads the horizontal midpoint only; `bRotR` is a
  *leftward* slide, and that is not a typo.
- Peek is the fourth verb: in the plane it previews the unfold by lowering
  the `flatT` target; `peekLanding()` makes the same two calls
  `doUnflatten()` makes.
- **`backOut()` is the phone's back button** (`js/19-bindings.js`), and it is
  Escape's order with two rungs the keyboard does not need: the editor (out to
  MY LEVELS) and the home screen, the one screen where the press may leave the
  app, on a second press inside two seconds. A full-bleed card SWALLOWS it -
  backing out of the win card would skip a level. It returns whether it
  handled the press; the Capacitor listener is the only native code in the
  file and is one property read from nothing in a browser. **It reaches the
  plugin through `Capacitor.registerPlugin("App")`, never
  `Capacitor.Plugins.App`** - the injected bridge creates `Plugins` EMPTY and
  each plugin's own JS module fills it, and with no bundler that module never
  runs, so a guard on `Plugins.App` returns quietly and leaves back quitting
  the game mid-level. Tested against a faked bridge shaped like the real one.
- **`tap()` fires on pointerdown, except inside something that scrolls -
  there it fires on the lift.** `tapScroller()` (`js/18-ui.js`) looks for an
  ancestor with `overflow-y:auto|scroll`; inside one the press waits for
  pointerup and is cancelled by `TAP_SLOP` (10px) of travel, and the
  pointerdown is deliberately **not** `preventDefault`ed, because that call
  is what was cancelling the scroll. Outside one the d-pad is unchanged
  (`docs/UI.md`).

## Working on the UI

The ask that costs the most here is "change how X looks", so the loop is
built to be cheap:

1. **Read `docs/UI.md`**, not the design docs. It names the screen's
   markup (`index.html` or the JS function that builds it), its CSS file,
   and the tokens it uses.
2. **Edit the one CSS file** (and the one JS builder if the markup changes).
   Each file is 1–25KB; read only the one you need.
3. **Look at it**: `node tools/shot.js <screen>` writes `shots/<screen>.png`;
   Read the PNG. `--small` is the owner's narrow phone, `--desktop` the
   wide case, `--tag before` / `--tag after` keeps a pair. `--eval "js"`
   reaches any state the named screens do not.
4. **Check nothing else moved**: the same screen at `--small`, and the
   flat theme if the change is on the HUD (`flat:2`).
5. `node --check` on any JS you touched; `node tools/verify.js` only if a
   level or a rule changed.

Do not read `js/10-render.js` (173KB) for a chrome change; nothing in the
DOM chrome lives there. Do not read `docs/design/*` unless the change
reverses a decision recorded there; `docs/UI.md` says which decisions are
load-bearing per screen.

## Working notes

- **No em dash (`—`) anywhere.** It reads as machine-written, and the owner
  does not want it in the game, in a comment or in these docs. A plain `-`
  does the job. The **only** exception is a `LEVEL_RENAMES` *key*: those are
  the titles old saves were written under and changing one throws that save
  away. `grep -rn '—' js/ css/ docs/ index.html tools/ CLAUDE.md` should find
  nothing outside that table.
- The owner is learning, not shipping. Explanations of *why* are wanted, not
  just working code.
- A level leaves through MY LEVELS' SHARE, one at a time. **The editor's ⋯
  button is gone** on the owner's call - it sat beside TEST and opened a box
  of raw JSON - so `ioPanel()` is now reachable only from `libraryPanel()`,
  like `legendPanel()`.

### How to work on this, agreed with the owner

- **Propose before building, whenever the ask is open-ended.** A few options,
  two paragraphs each, no code. The owner picks one - or two, if more than one
  is interesting. Designing three fights at full fidelity and discarding two
  is the expensive way to arrive at the same answer, and it happened once.
  **A concrete list of UI fixes is not open-ended**: do them, one commit
  each, and show the screenshots.
- **Feel beats simulation on anything real-time.** For bosses and trials the
  owner playtests and says what is wrong immediately, which is faster and
  truer than tuning against `bosssim` - and the fight may be scrapped anyway.
  Run the checks when the *rules* change or when something must be proved
  possible; do not run them to tune a number.
- **Ordinary levels are the opposite: always machine-verify.** `node
  tools/verify.js` before handing over any new or edited non-boss level. A
  level that cannot be solved, or that falls in four moves, is not something
  playtesting should have to discover.
- **The owner playtests from the published artifact, so publishing is part of
  handing work over.** The loop is: work on a branch, commit, push,
  `node tools/build-single.js --vendor --artifact`, publish that file to the
  **existing** artifact URL. Four rules make it reversible, and all four exist
  because one of them was broken once and cost the whole map redesign off the
  live link (`docs/HISTORY.md`):
  - **Commit before you build.** The build stamps its own commit into the
    file, and warns when the tree is dirty - a build from uncommitted work
    cannot be re-derived, so there is no way back to it.
  - **Check the size against what is already live** before replacing it. A
    build that is *smaller* than the one it replaces is a question. −70KB
    meant a whole unmerged branch was about to be thrown off the link.
  - **Publish to the URL, never to a new one.** A second artifact is not a
    new version, it is a second link the owner now has to keep straight.
  - **Rolling back is `git checkout <commit> && build && publish`.** The
    build is deterministic - same commit, byte-identical file - which is what
    makes "put it back" checkable rather than hopeful.
- **Publishing updates the artifact; it does not update what other people
  see.** Each publish becomes a version, and the share is pinned to one of
  them. **Always share latest version is deliberately OFF** and is not a
  thing to nag about: the owner plays a build before he hands the link to
  anybody and bumps the shared version himself when it is ready. So a publish
  from here reaches HIM and nobody else, which is the intent - say the version
  went up, and leave the sharing to him.
- **`BUILD` is a global, and it is not on any screen.** The stamp came off the
  foot of the settings panel on the owner's call (the reasoning is at the
  string in `menuPanel()`); `build-single.js` and `build-app.js` both still
  write it into the page, and the artifact's version picker carries the commit
  as each version's label. On the phone the tell is the game itself: the owner
  knows which build he is on because he knows what changed in it.
- **One job per session where possible.** Unrelated work in one pass re-reads
  the same files several times over. **A batch of small UI fixes is one
  job**: they share the files, the screenshots and the build.
- **Edit files with the editing tools, not by patching them from a shell.**
- **Put post-mortems in `docs/HISTORY.md`, and reasoning in
  `docs/design/*.md`, not here.** This file is loaded every session; it holds
  what is true now, in one line per fact.
