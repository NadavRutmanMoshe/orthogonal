# The store listing, written

The words and pictures that go in the Play Console form. `docs/STORE-ANSWERS.md`
is the other half - the questionnaires, the Data safety form and the content
rating - and the two have to agree with each other and with the game.

**Nothing here promises anything the game does not do.** That is not only
honesty: a listing and a game come apart the moment one of them says
something the other cannot back up, and the reviews are where it shows.
Every number below was counted out of `js/02-levels.js`, not remembered.

Written 19 Sep 2026.

---

## App name

    I'm Just A Cube

15 characters of Play's 30. Not `Orthogonal`, which is the old name and
survives only in the `orthogonal:*` save keys and `dist/orthogonal.html`.

## Category and tags

**Games > Puzzle.** Tags: puzzle, logic, brain teaser, single player,
offline, indie, 3D, minimalist.

## Short description (80 max)

**This one, on the owner's call.** It is his line, and it is the voice the
game is written in:

    Traveling between dimensions in order to find my parents.

57 characters. First person, like the title, and it is the story rather than
the mechanic - which is the right way round for the line that sits under the
icon in a search result.

**The alternative was offered and turned down**, and it is recorded because
the argument for it will come back the first time anybody looks at search
ranking: `A puzzle about folding the world flat to find my parents.`, also
57 characters. Play indexes this field heavily and the shipping line does
not contain the word "puzzle" anywhere. That is a known cost, accepted - the
full description and the **Games > Puzzle** category both carry the genre,
and the line under the icon is the one place the game gets to sound like
itself.

## Full description (4000 max)

**Information first, on the owner's call.** It opened with the story - "They
took my parents. I couldn't stop them." - and that came off: somebody
reading this field is deciding whether to install a *puzzle game*, and the
first thing they need is what kind of puzzle it is. The story is still in
here, at the bottom, where it is a reason to keep playing rather than the
pitch.

Play renders a small set of HTML tags in this field, but plain text with
blank lines between paragraphs is what survives being re-flowed on every
screen width, so that is what this is. The bullets are `•`, typed, not a
list tag.

**The four world lines are the game's own `SECTIONS[].sub` strings**, near
enough verbatim. That is deliberate: a world's one-line description on the
chooser and its line on the store page should not be two different
promises.

```
I'm Just A Cube is a puzzle game about going from 3D to 2D and back.

You are a cube on a grid. You can walk, and you can climb one block. That
is not enough to get anywhere, so you have one other move: drop the whole
world to 2D.

Fold it flat and everything collapses along the direction you are looking.
Blocks that were far apart in depth land on the same square, and the gap
between them stops existing. Walk across it. Stand the world back up, and
you are somewhere you could not have walked to.

The camera turns in ninety degree steps. Choosing which way to look before
you fold is the puzzle.


FOUR WORLDS, AND EACH ONE TEACHES YOU SOMETHING NEW

• NATURE - go 2D, cross the gap, come back.
• FIRE - fire is solid, and it burns you.
• WATER - stand on water, and it leaves nothing behind in 2D.
• DESERT - shove a crate and the 2D world changes.

Every world also has a level on a real clock, where a lethal plane sweeps
the board one slice at a time and you have three lives to get where you
are going. Those are the reaction ones, and there is one in each world.

Every world ends with a fight. The pack moves on its own clock, learns
which row you are standing in and fires down it, and the only way to put
one down is to fold while it is sharing your silhouette.

Clear all four and a fifth world opens with sixty more levels in it.


ALSO IN THERE

• 109 levels in total.
• A level editor with the game's own solver in it. Build a level, press
  VERIFY, and it tells you whether it can be finished and in how few
  moves. Share it as a single line of text.
• Shapes and colours to unlock with stars.
• A story, in three scenes, told in the same blocks you play in. Nothing
  is a video. Everything folds.


HOW IT PLAYS

Swipe to walk. Double tap to fold. Two fingers to turn the camera. Or turn
on a d-pad and buttons instead - it is one row in the settings, and so are
the board size, the text size and how fast the timed levels run.

The game asks your age once, sets those three for you, and does not ask
again.

Every level has a par and three stars for beating it. Three hints sit in
the bank, and they come back on their own.


OFFLINE, AND QUIET

The game makes no network request of its own. No account, no sign-in, no
analytics, no chat. No banners and nothing between levels. Your progress
lives on your device.

Two things can go online, and only when you press them: a rewarded video
you chose to watch, and a purchase you chose to make. A player who presses
neither is never online.
```

### Where each claim comes from

| Claim | Checked against |
|---|---|
| 109 levels | `LEVELS.length` in `js/02-levels.js` |
| **four** worlds, and a fifth that opens | `SECTIONS` holds six, but `secPickable(n)` is `n>0`, so PROLOGUE has no tile and is not a world to the player. That leaves NATURE, FIRE, WATER, DESERT and EXTRA, and EXTRA carries `locked:true` until `bossesLeft()` is empty. **Say four, not six** - six is the array and four is what a player is offered |
| sixty more levels in the fifth | indices 49..108, i.e. `LEVELS.length - SECTIONS[5].at` |
| one timed level in **each** world | `trial` at 10, 23, 32, 43 - one inside each of the four `SECTIONS` spans |
| **every world ends with** a fight | `boss` (not `tutorial:true`) at 18, 27, 37, 48, each the last index of its span. SPARRING at 17 is the teaching one and does not count |
| the four world lines | `SECTIONS[].sub`, near enough verbatim, so the chooser and the store page make one promise |
| fire poisons its column, water casts nothing, crates shove | `js/03-rules.js`, and rules 1-7 in `CLAUDE.md` |
| the solver is in the editor | `VERIFY` in `js/14-editor.js`, `solve()` in `js/04-solver.js` |
| a level shares as one line | `OL2` + 64 characters + `~Name`, `shareCode()` |
| the age question, set once | `AGE_BANDS` / `applyAgeBand()`, `js/11-sound.js` |
| three hints, they come back | `HINT_FREE=3`, `HINT_REGEN_MS=30*60*1000`, `js/06-persistence.js` |
| no request of its own | no image, audio or font is fetched; `css/05-fonts.css` is base64 |
| rewarded video only, no banners | `js/24-ads.js`, and the Ads table in `docs/STORE-ANSWERS.md` |

**"Three hints ... come back on their own" is the sentence to watch.** It is
true because the bank regenerates to `HINT_FREE` on a 30-minute clock. If
that clock ever goes, or the free floor changes, this line changes with it -
it is the only claim here that is about a number that could quietly drift.

---

## The pictures

**Icon** `app/icon/icon-512.png`, out of `node tools/icon.js`. 512x512, and
`icon-1024.png` beside it for iOS.

**Feature graphic** `app/icon/feature-A.png`, out of `node tools/feature.js`.
1024x500. Layout A ships: the name printed on the folded page in ink, the
hunter kept on the dark half, which is the half a thumbnail crop keeps.

**Screenshots** `shots/play/*.png`, out of `node tools/store.js`. Ten at
1080x1920, numbered in upload order, because Play shows them in that order
and most people see the first two:

| # | Shot | What it is for |
|---|---|---|
| 01 | `firefold` | The fold tutorial in FIRE colours, walked to the brink. A gap that cannot be crossed. The setup. |
| 02 | `fireflat` | **The same board, same camera, folded.** The verb, and the only picture that explains this game without words. |
| 03 | `home` | The name, the cube on its plinth, and the three things the game does. |
| 04 | `boss` | BOSS I. The clearest of the four at thumbnail size - the pack is a dark body with a bright rim, and it needs a light arena behind it. |
| 05 | `smashed` | The red sting. A fight you can lose. |
| 06 | `crushed` | The teal sting. A fight you can win, and *how* - by folding. |
| 07 | `trial` (I) | The clock: three hearts, three cores, one lit slice about to become lethal. |
| 08 | `story1:13` +1400ms | The fold that takes his parents, caught with the burst still in the air. |
| 09 | `story1:16` | "My parents!" The only shot about what the game is *about*. |
| 10 | `wardrobe` | What the stars are for. |

**Play takes eight and this is ten**, on the owner's call: all ten are
generated and numbered, and the eight to upload are picked in the Console.
Nothing is marked `spare` in `tools/store.js`.

**01 and 02 are a pair and must stay one.** Same board, same camera, the
same two steps walked - a gap and a spur out in depth in the first, one
unbroken row in the second. Change one and change the other, or the hook
stops working. The board is `tools/foldlevel.js`, which `tools/video.js`
opens on too, so the listing and the promo are the same level.

**Why that board rather than a campaign level.** The set used to open on
`level:36` and `flat:36`, picked by measurement as the only non-boss,
non-trial level with three kinds of block, six cells of depth and enough
blocks to fill a portrait frame. It was a good picture of a *puzzle* and a
poor picture of the *verb*: too much on the board for a stranger to see what
changed between the two shots. The fold tutorial is the game's own clearest
statement of the mechanic - two platforms, an uncrossable gap, one spur off
in depth - and in FIRE rather than PROLOGUE's slate, which is the greyest
palette in the game and not what a listing's first picture should be.

**Three fight shots, not one**, because a fight is the half of this game a
puzzle screenshot cannot suggest at all, and because 05 and 06 are the two
words it can end on. `map:3` and `level:21` came off to make room.

---

## The two fields the Console asks for by name

    Privacy policy   https://nadavrutmanmoshe.github.io/orthogonal/privacy.html
    Email            nadaz.games@gmail.com

Both were already in the repo and this doc listed them as outstanding,
which was wrong: the URL is in `docs/SHIPPING.md` and the address is at the
foot of `docs/privacy.html` itself. They are written out here because the
Console asks for them as two separate fields on two separate screens, and
the address shown on the listing has to be the same one the policy gives.

## Still outstanding

1. **`AD_TEST` is still `true`**, and that is fine for now - the AdMob
   account is not live, so there are no real unit ids to switch to. Going
   live is the real ids, the app id in the manifest and the switch,
   together (`docs/SHIPPING.md`), and it is a release, not a listing edit.
2. **The promo video** is cut and waiting on a YouTube upload, which is the
   one step only the owner can take - Play takes a URL, not a file.
   `shots/play/promo.mp4`, 45.5s, 720x1600 portrait, 7.6MB. It is four takes
   off the owner's own phone, joined in the order they are numbered: the
   studio sting, a fire puzzle folded and solved, BOSS I, TRIAL I ending on
   a three-star win card. `node tools/promo-join.js` re-joins them from
   `vid_1..4.mp4` in that folder.

   It is a RECORDING, not `tools/video.js`'s scripted cut, and the two are
   not the same asset: the scripted one is landscape, silent of any phone,
   and re-records after a game change; this one has the owner's thumb, his
   status bar and his timing in it. Both are kept. If the status bar turns
   out to matter to a reviewer, the scripted cut is the one to upload.

## Settled, so it does not get re-opened

**THE SCREENSHOTS SHIP BARE**, on the owner's call. A caption pass was
offered - a headline band over each shot in the game's own typefaces, which
is what most listings that convert do, and which would have made 01 and 02
say "the world has depth" and "fold it and the depth is gone" in words
rather than only in pictures. Turned down: the shots show the game and
nothing else, and type over the board is type over the board. `tools/
caption.js` does not exist and should not be written without being asked
for again.


---

## Tablets

**Play asks for tablet screenshots in two slots**, 7" and 10", and nags in
the Console when they are empty. Filling them is not the same thing as
supporting tablets: the app installs on one either way, and what decides
whether it is any good there is the layout, not the assets.

So the layout was looked at rather than assumed, and it holds:

- **Panels cap at 560px and centre**, which is the rule in `CLAUDE.md`, and
  it is doing its job - on an 800px-wide tablet the wardrobe is a 556px
  sheet in the middle of the screen, not a stretched one.
- **The board scales.** `fitViewSize()` fits the arena per axis and the 7"
  shot is the best-framed of any size this game has been shot at.
- **Nothing clips, nothing overlaps, nothing is cut off** at either size.

One thing is loose rather than broken: at 10" there is more empty sky over
the board and a vertical gap in the wardrobe between the last row of tiles
and the footer, because the content does not fill a 1280px-tall panel.
Nobody would call it a bug and no store reviewer will either, but it is why
the 7" set is the better-looking of the two.

**`node tools/store.js --tablet` writes the 7" set and `--tab10` the 10".**
The CSS width is the point and not the pixel count: 1200x1920 can be
reached as 400 CSS px at dpr 3, which is a wide PHONE to this layout, and
the shots would have come out looking like the phone set while hiding every
tablet bug there was to find. 600 and 800 CSS px at dpr 2 are the real
things.


---

# Steam

The same game, sold differently, and the listing says so: **no ads, no
in-app purchases, everything included**, keys and a controller instead of
swipes, achievements and Steam Cloud. The Play text is the base; every
sentence that was about a phone, an ad or a purchase is rewritten or gone,
and the numbers were counted again (27 Sep) rather than copied - which is
how the Play text's 109 turned out to be stale (see the note at the end).

Steamworks > Store Page > Description. Written 27 Sep 2026.

## Short description (300 max)

Under the header capsule, and the only text most people read. **It opens
on the owner's own line from Play**, then says what the game is, because on
Steam this field also has to say "puzzle" - there is no category field
doing that job here, only tags.

    Traveling between dimensions in order to find my parents. A puzzle game about folding the world flat: blocks far apart in depth land side by side in 2D, the gap stops existing, and standing the world back up puts you somewhere you could never have walked.

## About This Game

Steam formats this field with its own tags, not HTML: `[h2]` headings,
`[list]`/`[*]` bullets, `[b]`. Paste it as it is.

```
[h2]A puzzle game about going from 3D to 2D and back[/h2]

You are a cube on a grid. You can walk, and you can climb one block. That is not enough to get anywhere, so you have one other move: drop the whole world to 2D.

Fold it flat and everything collapses along the direction you are looking. Blocks that were far apart in depth land on the same square, and the gap between them stops existing. Walk across it. Stand the world back up, and you are somewhere you could not have walked to.

The camera turns in ninety-degree steps. Choosing which way to look before you fold is the puzzle.

[h2]Four worlds, and each one teaches you something new[/h2]
[list]
[*][b]NATURE[/b] - go 2D, cross the gap, come back.
[*][b]FIRE[/b] - fire is solid, and it burns you.
[*][b]WATER[/b] - stand on water, and it leaves nothing behind in 2D.
[*][b]DESERT[/b] - shove a crate and the 2D world changes.
[/list]
Every world has one level on a real clock, where a lethal plane sweeps the board one slice at a time and you have three lives to get where you are going.

Every world ends with a fight. The pack moves on its own clock, notices which row you are standing in and charges down it, and the only way to put one down is to fold while it is sharing your silhouette.

Beat all four and a fifth world opens, with sixty more levels in it.

[h2]Also in there[/h2]
[list]
[*]110 levels.
[*]A level editor with the game's own solver in it. Build a level, press VERIFY, and it tells you whether it can be finished and in how few moves. Share it with anyone as a single line of text.
[*]A story in three scenes, told in the same blocks you play in. Nothing is a video. Everything folds.
[*]A par and three stars on every level. Five shapes for your cube can only be earned: four for three-starring a world, and one for a trick in the fights.
[*]15 Steam achievements, and your progress follows you through Steam Cloud.
[/list]

[h2]Everything is included[/h2]
No ads, no in-app purchases, nothing to grind. The whole wardrobe is open, hints never run out, and a fight or a timed level that keeps beating you can be skipped - though a skip never counts as a clear, and never earns an achievement.

[h2]How it plays[/h2]
WASD or the arrow keys to walk, Space to fold, Q and E to turn the camera, and hold Shift in 2D to peek at where standing up would put you. Every key can be rebound, and the game teaches you with whichever keys you chose.

Or pick up a controller: the stick or D-pad to walk, A to fold, the bumpers to turn, a trigger to peek.

Board size, text size, interface size and how fast the fights run are each one row in the settings.
```

## Tags

Steamworks > Store Page > Tags lets the developer apply up to 20, and the
order matters: the first few carry the most weight in what Steam
recommends the game next to. **Only Steam's own tags can be chosen** - the
picker refuses anything else - so check each one exists there as you add it.

In order:

1. Puzzle
2. Logic
3. Indie
4. Singleplayer
5. 3D
6. 2D
7. Minimalist
8. Abstract
9. Level Editor
10. Stylized
11. Colorful
12. Difficult
13. Cute
14. Atmospheric
15. Family Friendly

**Search the picker for "dimension" and "perspective"** as well: they are
what this game is actually about, and if Steam has a tag for either it goes
in at number 3. Players add their own tags once the game is out, and those
reshuffle the list anyway.

**Not tagged, deliberately:** Casual (the fights and the clock are not
casual - it stays a genre, below, because that is where Steam files puzzle
games), Story Rich (three scenes is a story, not a story-rich game), Puzzle
Platformer (there is no jumping - a step up is the whole of it), Relaxing
(the fights are not).

## The other store fields

| Field | Answer |
|---|---|
| Genre | **Indie** and **Casual**. Steam has no Puzzle genre; Casual is where puzzle games are filed, and the tags carry the rest |
| Developer / Publisher | Nadaz Games (free text, needs no company - `SHIPPING.md`) |
| Single-player | yes |
| Steam Achievements | yes (15, `desktop/README.md`) |
| Steam Cloud | yes |
| Includes level editor | yes |
| Controller support | **Partial**, not Full. Every level, fight, menu and the wardrobe work on a pad, but the level editor places blocks with the mouse, and Full means everything. Making the editor pad-driven is what would earn Full |
| Steam Deck | say nothing until a Deck has run it (`desktop/README.md`, "What has not been tested yet"). Valve tests and labels it themselves |
| Languages | English, interface and subtitles. No full audio column: there is no speech |
| Price | $6.99 (settled 24 Sep, pending the DLC question in `SHIPPING.md`) |

**System requirements** (minimum; Windows only):

| | |
|---|---|
| OS | Windows 10 64-bit |
| Processor | any dual-core from the last ten years |
| Memory | 4 GB RAM |
| Graphics | any GPU with DirectX 11 / WebGL support |
| Storage | 500 MB |

Electron 39 supports Windows 10 and up, and the packaged build is 290MB
unpacked (`desktop/README.md`); 500 leaves room for its caches. The game is
a WebGL scene of a few hundred cubes, so the GPU line is a floor, not a
target - it runs in software rendering in `tools/shot.js`.

## Where each Steam-only claim comes from

| Claim | Checked against |
|---|---|
| 110 levels, 60 in the fifth world | `LEVELS.length` is 110; `LEVELS.length - SECTIONS[5].at` is 60 |
| one timed level per world, a fight at the end of each | `trial` at 11, 24, 33, 44; `boss` (not `tutorial`) at 19, 28, 38, 49, each the last index of its world |
| no ads, no purchases | `steamBuild()` makes `hasPass()` true for both passes (`js/09-wardrobe.js`), so every ad button renders as a plain one and the DEALS shelf has nothing to sell |
| the whole wardrobe open | NO LIMITS sends `shards()` to 9999 and EVERYTHING owns every paid shape. **The five `reward:true` shapes are not in it** - hence "five can only be earned" |
| hints never run out | `hintsUnlimited()` is `noLimits()` (`js/06-persistence.js`) |
| a skip never clears or earns | skips live in `skips`, never `progress`, and `achMet()` in `js/27-achievements.js` reads only `progress`, the star sums and reward shapes |
| 15 achievements, Steam Cloud | `ACH_IDS.steam` in `js/27-achievements.js`; `desktop/main.js`, "THE SAVE" |
| the keys, and rebinding | `KEY_ACTS` in `js/26-desk.js` (W A S D, Space, Q, E, Shift), arrows always walk; Settings > Keys; the tutorial asks `keyOf()` |
| the pad | `padAct()`: stick or D-pad, A fold, LB/RB turn, either trigger peeks |
| the settings rows | Level size, Text size, Interface, Fights speed (`menuPanel()`) |

---

## A stale number in the Play listing

**The Play full description says "109 levels in total", and the game has
110** since `02 - Behind the Wall` went in (commit `1d2c97a`). The Play
section's claims table also still gives the old indices (the fifth world
at 49..108, trials at 10, 23, 32, 43, bosses at 18, 27, 37, 48); every one
of them moved up by one. The live Play listing needs the one word changed
in the Console. This is exactly the drift the claims table exists to catch,
and the reason the Steam numbers were counted again instead of copied.
