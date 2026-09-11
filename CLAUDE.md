# I'm Just A Cube

Read this before changing anything. It is the short memory of how the game
works **now**: the rules, the invariants, and where everything lives. It is
deliberately small, because it is loaded into every session.

**The reasoning lives one level down**, and is read on demand, not by
default:

| Read this | when you are touching |
|---|---|
| `docs/UI.md` | **anything a player looks at** — screens, panels, cards, buttons, the map, the HUD. The screen-to-file map, the tokens, the class collisions, and the screenshot loop. Start here for UI work. |
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
| `css/*.css` | **one stylesheet per screen**, linked in numeric order; the cascade depends on that order. `docs/UI.md` maps each screen to its file. |
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
| `tools/verify.js` | every level machine-checked: BFS, `trialSafety()`, `bossArena()`, `bosssim`, the `SECTIONS`/`LEVEL_RENAMES` invariants |
| `tools/shot.js` | **headless screenshots of any screen** (`node tools/shot.js --list`). The eyes for UI work. A cutscene is seekable by beat (`story1:12`), and an explicit `--wait` now beats the screen's own default. |
| `tools/build-single.js` | inlines everything into one file for itch.io / the artifact |
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
  never renumber a section.
- Rotation is locked (`rotate:false`) from the tutorials through `TRIAL I`
  and unlocked at `09 — The Rotation`, then never taken back. On a locked
  level the turn buttons are **not drawn** (`body.norot`).
- `tutorial:true` means no par, no stars, and the solver is not asked.
- Progress is keyed by level **name**. `progress[name]` holds a move count
  on an ordinary level and lives kept on a clock level, so reads go through
  `starsForRecord()` and writes through `betterRecord()`.
- **A fight is taught before it is fought.** `SPARRING — One of Them` sits
  before `BOSS I`: a `tutorial:true` level carrying `boss` data - BOSS I's
  phase one on the smallest arena it fits on, with a hunter that cannot walk -
  and the kill's four rules at the top of the screen as a live checklist
  (`L.primer`) that ticks itself and says what you missed when it kills you.
  `teach:true` on the boss exempts the arena from `bossArena()`'s two quality
  gates - lethal columns and depth - and from nothing else. It is a hexagon on
  the map, earns a tick rather than stars, and `bossesLeft()` skips it, so it
  gates nothing.
- **`LEVELS` opens `sectionPicker()`, not the map.** One section per visit;
  the map has no tab strip and the way to another section is out and back in.
  PROLOGUE has no tile and no map (`secPickable()`) — it is the tutorial, and
  `REPLAY TUTORIAL` in the menu is the way back to it.
- **Skips live in `skips`, never in `progress`.** Ads buy progress, never
  score. `V · EXTRA` opens when every boss is down (`bossesLeft()`), and
  cannot be bought open.
- Always `node tools/verify.js` after touching a non-boss level.

**The player's own levels** (`docs/UI.md`)
- **MY LEVELS on the home screen is a full-height screen** —
  `myLevelsPanel()`, and every screen under it goes through `mlScreen()`. A
  row is one line: the name with the rename pencil against it, then ▶ · EDIT ·
  share · ×. `libraryPanel()` (sort, project file, composer) has no button any
  more and is one `bind` away, like `legendPanel()`.
- **A custom level is created named and saved as a draft.** `ADD LEVEL` asks
  for the name and the ground and writes the library entry at once;
  `editingId` says which entry the editor is on, and `saveCurrent()` keeps
  whatever is on the board, solvable or not. Only `VERIFY` still asks the
  solver on demand.
- **There is no SAVE button: every edit writes.** `snapshot()` — already the
  one funnel every board change goes through — calls `autosave()`, which
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
  `R.solid()` for the same reason — a start standing on a crate is standing on
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
- `saveSession()` refuses to write while `dying`; `respawn()` and
  `trialHurt()` write afterwards. The trial's cores and lives are in the
  session; a boss resumes fresh.
- **A boss phase may carry a `sweep`** — the trial's lethal plane, installed as
  `TR` by `bossEnterPhase()`. BOSS IV is the level. So **`TR` means "a sweep is
  running", not "this is a trial"**: `B` names a death (`die(B?"boss":"trial")`)
  and `B` decides which frame ticks the shared `shieldMs`/`slowMoMs`, or both
  frames spend them twice. `TR=makeTrial(L)` is assigned **before**
  `bossReset()` in `enterPlay()`, or it wipes the sweep the phase just armed;
  `bossReset()` reads `(B||TR)` for lives for the same reason. The sweep stops
  for the phase card, the kill cam and `bossGraceMs`. `bossSafety()` is no
  longer a no-op — it holds every sweeping phase to `trialSafety`'s property
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
- `tutStepView()` is the one answer to "what is being asked"; the coach, the
  green, the lock, the hand and `tutPoke` all read it.

**HUD and chrome** (`docs/UI.md`, `chrome.md`)
- `syncHud()` owns every body class and button class, with three exceptions
  that are re-judged per frame in the render loop: the `GO 2D` button on a
  clock (`.strike`/`.peril`), the eye (`lookCue()`) and the primer's
  checklist (`primerMarks()`).
- Anything animated inside markup that `syncHud()` rewrites restarts on
  every redraw. The live star row is its own element for that reason.
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
- The running star total is hidden by any open panel and while a clock runs.
- `nothingBehind()` decides intro-card versus home screen and START versus
  CONTINUE; `NEXT LEVEL` is always the next level, except into a locked shelf
  where it becomes `WHAT'S LEFT` and opens the map.

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
  same cube with the same red rim the census wears in the opening, squared to
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
  this camera angle. A house needs a roof, windows AND `L.tint` - shape alone
  reads as terrain, and the roof must sit at `z=0` or it overhangs its own
  face. Screen height is `0.885y - 0.465z` (`chrome.md`).
- **`WATCH THE OPENING` / `THE FIRE` / `THE ENDING` are always in the menu**, and a
  replay is not a first watch: `storyPlay(id,replay)` does not mark the scene
  seen and hands back where it came from, so looking at the ending early does
  not consume `FIND THEM` on BOSS IV.

**The neighbour** (`chrome.md`)
- **He is decoration, and that is forced.** Nothing in `resolveStep()`,
  `makeRules()` or `solve()` knows he exists; he cannot be stood on, walked
  into, folded into or crushed. A friendly obstacle would be a piece, a piece
  is a rule, and a rule the solver has not been told about is a level whose
  par is a lie.
- **He stands on his OWN square, off the board**: a plinth two clear squares
  past the right-hand end of the level, drawn as a mesh rather than added as
  a block (`guidePlinth()`). `recomputeBounds()` adds `guidePoint()` to the
  extents it frames - the one line in the renderer that knows he exists - or
  the camera would leave him past the edge of the screen.
- **Never on a `tutorial:true` level**, and that is the whole placement rule
  (plus no boss, no trial, section 1 only). In PROLOGUE he offered the fold to
  somebody the tutorial had not taught it to yet; on `09 — The Rotation` his
  plinth is off the `+x` end and the lesson's own new verb turns it in front
  of the board. He starts where the teaching stops, every time it stops.
- **He is pressed on a DEFERRED single tap** (`guideArm()` / `guideCancel()`,
  called from `13-gestures.js`). A double tap is the fold in every layout, so
  the fold always wins the race.
- **One tip per level, keyed by level NAME** (`GUIDE_LINES`, `js/23-guide.js`),
  about that level. Keyed by name because `SECTIONS[].at` are indices and an
  insertion would shift an index-keyed table onto the wrong boards silently;
  an unknown name falls through to `GUIDE_FALLBACK`, and `verify.js` fails on
  any key that is not a level he stands on.
- His tips render through `tutWords()`, his cheer goes on the **win card**
  (`guideWinLine()`, every third level), and ten losses opens his one
  unprompted line, which is a button into `struggleOffer()`.

**Settings and saves** (`systems.md`)
- `loadSettings()` is a **whitelist**. A key not read there does not exist
  after reload; a key whose feature is removed comes out of the list.
- `noSlowOffer` keeps its name though nothing slow is left; it is persisted.
- The buttons default is `UI_DEFAULT` (`js/11-sound.js`, `"none"`). The fresh
  `settings` object and `RESET SETTINGS` both read it, so a reset cannot drift
  away from a first run; any other default belongs next to it, not inlined.
- A stored volume only wins once `volTouched`. Volume is applied *after* the
  limiter (`outGain`); changing `MIX` or `POST` means re-measuring the
  stacked worst case.
- `migrateWorlds()` and the `v_`/`p_` id prefixes keep old wardrobe saves
  valid. Do not remove while any old save might exist.
- **The DEALS tab is `PASSES` then `deal:true` in `SKIN_SHAPES`**: the money
  shelf, priced in `usd`, no stars and no ads. The Rook is the only paid
  shape and is still a shape everywhere else in the code. The two **passes**
  are not shapes and do not equip: `NO LIMITS` ends the hint pool, the ad on
  a skip and the star balance (`noLimits()`, `hintsUnlimited()`, `shards()`);
  `EVERYTHING` is that plus every paid shape, granted by rule inside `owns()`
  so shapes added later are included. `dealPrice()` discounts the second when
  the first is owned. Rewards are never in a pass — money buys progress,
  never score.
- **Four shapes carry `reward:true` and cannot be bought**: one per numbered
  section, granted by `grantShape()` for every star in it. Paid at the moment
  the last star lands (`win()`) and swept once on boot for older saves;
  neither path may use `sectionMastered()`, which the preview switch fakes.
- **`UNLIMITED_SHARDS` in `js/09-wardrobe.js` is `true` for playtesting.**
  Set it back to `false` before shipping. `AMB_MUTED` in `js/11-sound.js`
  is `true`: the ambient beds are built but muted, on the owner's call.

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
- `RAY_W` .46 is the width of the charge telegraph across its own row. It was
  a .06 pane, invisible end-on - which is the view you are in when you are
  lined up, and the one the fold is taken from.
- `INK_SETTLE` .18 and `PAPER_LIFT` .20 are the whole 2D look; both have
  been raised and reverted. The paper is derived from the sky.
- `DEPTH_STEP` .34 charges the first cell of depth outright; `CAM_TILT` .62
  is a named constant read by the camera and `fitViewSize()`, left alone by
  the owner's decision. `FOLLOW=0`.
- `fitViewSize()` fits the arena to the screen per axis; portrait and
  landscape convert differently, and the bar does not buy size in portrait.
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

- The owner is learning, not shipping. Explanations of *why* are wanted, not
  just working code.
- Levels can be pasted in and out as JSON from the editor's ⋯ menu (`ioPanel`), and one at a time from MY LEVELS' SHARE.

### How to work on this, agreed with the owner

- **Propose before building, whenever the ask is open-ended.** A few options,
  two paragraphs each, no code. The owner picks one — or two, if more than one
  is interesting. Designing three fights at full fidelity and discarding two
  is the expensive way to arrive at the same answer, and it happened once.
  **A concrete list of UI fixes is not open-ended**: do them, one commit
  each, and show the screenshots.
- **Feel beats simulation on anything real-time.** For bosses and trials the
  owner playtests and says what is wrong immediately, which is faster and
  truer than tuning against `bosssim` — and the fight may be scrapped anyway.
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
    file, and warns when the tree is dirty — a build from uncommitted work
    cannot be re-derived, so there is no way back to it.
  - **Check the size against what is already live** before replacing it. A
    build that is *smaller* than the one it replaces is a question. −70KB
    meant a whole unmerged branch was about to be thrown off the link.
  - **Publish to the URL, never to a new one.** A second artifact is not a
    new version, it is a second link the owner now has to keep straight.
  - **Rolling back is `git checkout <commit> && build && publish`.** The
    build is deterministic — same commit, byte-identical file — which is what
    makes "put it back" checkable rather than hopeful.
- **Publishing updates the artifact; it does not update what other people
  see.** Each publish becomes a version, and the share is pinned to one of
  them. The permanent fix is the **Always share latest version** toggle in
  the artifact's Share menu. Until it is confirmed on, remind the owner to
  bump the shared version every few publishes.
- **The running build is visible in the menu**, at the foot of the panel, as
  `build <sha> (<branch>)`. It says `unbuilt · running from source` when
  `index.html` is opened directly, and `+UNCOMMITTED CHANGES` when it cannot
  be re-derived from a commit.
- **One job per session where possible.** Unrelated work in one pass re-reads
  the same files several times over. **A batch of small UI fixes is one
  job**: they share the files, the screenshots and the build.
- **Edit files with the editing tools, not by patching them from a shell.**
- **Put post-mortems in `docs/HISTORY.md`, and reasoning in
  `docs/design/*.md`, not here.** This file is loaded every session; it holds
  what is true now, in one line per fact.
