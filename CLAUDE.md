# Orthogonal

Read this before changing anything. It is the short memory of how the game
works **now**: the rules, the invariants, and where everything lives. It is
deliberately small, because it is loaded into every session.

**The reasoning lives one level down**, and is read on demand, not by
default:

| Read this | when you are touching |
|---|---|
| `docs/UI.md` | **anything a player looks at** — screens, panels, cards, buttons, the map, the HUD. The screen-to-file map, the tokens, the class collisions, and the screenshot loop. Start here for UI work. |
| `docs/design/chrome.md` | why the buttons, the map, the home screen, the sting and the story are shaped the way they are |
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
| `index.html` | all static markup: corners, HUD, boss bar, coach, ghost hand, bars, splash, home, `#panel`, `#toast`, the three full-bleed cards (`#intro`, `#tutcard`, `#won`) |
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
| `js/14-editor.js` | tap-to-place editor, verify, minimize |
| `js/15-tutorial.js` | cues, the coach, the ghost hand, hints, `cardPut()` |
| `js/16-panels.js` | home screen, menu, wardrobe panel, the section chooser, the map, legend, library, `enterPlay()` |
| `js/17-composer.js` | solution-first level generation |
| `js/18-ui.js` | `$`, toasts, `showPanel()`/`hidePanel()`, `syncHud()`, star flight |
| `js/19-bindings.js` | every button and key binding |
| `js/20-splash.js` | the studio sting; the tap that unlocks audio |
| `js/21-boot.js` | startup order; runs last |
| `tools/verify.js` | every level machine-checked: BFS, `trialSafety()`, `bossArena()`, `bosssim`, the `SECTIONS`/`LEVEL_RENAMES` invariants |
| `tools/shot.js` | **headless screenshots of any screen** (`node tools/shot.js --list`). The eyes for UI work. |
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
- **`SECTIONS[].at` are array indices.** Inserting a level shifts every
  later marker; `verify.js` asserts they still line up.
- **`LEVEL_RENAMES` is composed, never rewritten.** Renaming a level means
  re-pointing every existing key's value at the new name and adding one new
  entry. No key dropped, no value that is also a key. `verify.js` asserts
  both. Bosses and trials carry a numeral and no number so a landmark can
  never renumber a section.
- Rotation is locked (`rotate:false`) from the tutorials through `TRIAL I`
  and unlocked at `07 — The Rotation`, then never taken back. On a locked
  level the turn buttons are **not drawn** (`body.norot`).
- `tutorial:true` means no par, no stars, and the solver is not asked.
- Progress is keyed by level **name**. `progress[name]` holds a move count
  on an ordinary level and lives kept on a clock level, so reads go through
  `starsForRecord()` and writes through `betterRecord()`.
- **`LEVELS` opens `sectionPicker()`, not the map.** One section per visit;
  the map has no tab strip and the way to another section is out and back in.
  PROLOGUE has no tile and no map (`secPickable()`) — it is the tutorial, and
  `REPLAY TUTORIAL` in the menu is the way back to it.
- **Skips live in `skips`, never in `progress`.** Ads buy progress, never
  score. `V · EXTRA` opens when every boss is down (`bossesLeft()`), and
  cannot be bought open.
- Always `node tools/verify.js` after touching a non-boss level.

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
- `syncHud()` owns every body class and button class, with two exceptions
  that are re-judged per frame in the render loop: the `GO 2D` button on a
  clock (`.strike`/`.peril`) and the eye (`lookCue()`).
- Anything animated inside markup that `syncHud()` rewrites restarts on
  every redraw. The live star row is its own element for that reason.
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
- **The four full-height panels wear one page shape**: header is title ·
  `?` · star total · `✕`; footer (`.pfoot`) is up-one-level · `CLOSE`. Adding
  a control to one of them means adding it to all four or to none.
- The running star total is hidden by any open panel and while a clock runs.
- `nothingBehind()` decides intro-card versus home screen and START versus
  CONTINUE; `NEXT LEVEL` is always the next level, except into a locked shelf
  where it becomes `WHAT'S LEFT` and opens the map.

**Settings and saves** (`systems.md`)
- `loadSettings()` is a **whitelist**. A key not read there does not exist
  after reload; a key whose feature is removed comes out of the list.
- `noSlowOffer` keeps its name though nothing slow is left; it is persisted.
- A stored volume only wins once `volTouched`. Volume is applied *after* the
  limiter (`outGain`); changing `MIX` or `POST` means re-measuring the
  stacked worst case.
- `migrateWorlds()` and the `v_`/`p_` id prefixes keep old wardrobe saves
  valid. Do not remove while any old save might exist.
- **Four shapes carry `reward:true` and cannot be bought**: one per numbered
  section, granted by `grantShape()` for every star in it. Paid at the moment
  the last star lands (`win()`) and swept once on boot for older saves;
  neither path may use `sectionMastered()`, which the preview switch fakes.
- **`UNLIMITED_SHARDS` in `js/09-wardrobe.js` is `true` for playtesting.**
  Set it back to `false` before shipping. `AMB_MUTED` in `js/11-sound.js`
  is `true`: the ambient beds are built but muted, on the owner's call.

**Rendering** (`look.md`, `controls.md`)
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
- Levels can be pasted in and out as JSON from the editor's ⋯ menu.

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
