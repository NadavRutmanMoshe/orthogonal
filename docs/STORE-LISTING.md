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

**Screenshots** `store/play/*.png`, out of `node tools/store.js`. Eight at
1080x1920, numbered in upload order, because Play shows them in that order
and most people see the first two:

| # | Shot | What it is for |
|---|---|---|
| 01 | `level:36` | A world with depth in it. The setup. |
| 02 | `flat:36` | **The same board, folded.** The verb, and the only picture that explains this game without words. |
| 03 | `level:21` | II · FIRE, which is the best-looking hour of the game. |
| 04 | `boss` | BOSS I. The clearest of the four at thumbnail size - the pack is a dark body with a bright rim, and it needs a light arena behind it. |
| 05 | `trial` (IV) | The curtain of falling blocks, three seconds in. |
| 06 | `map:3` | The water map. Progression, and the prettiest screen in the game. |
| 07 | `story1:2` | The house and the family outside it. The only shot about what the game is *about*. |
| 08 | `wardrobe` | What the stars are for. |
| 09 | `guide` | Held back - Play takes eight. The charmer of the set; swap him in for 08 if the wardrobe reads as a shop. |

**01 and 02 are a pair and must stay one.** Same board, same camera, water
column and six cells of depth in the first and nine squares in a row in the
second. Change one and change the other, or the hook stops working.

**Level 36 is picked by measurement.** It is the only non-boss, non-trial
level carrying three kinds of block, six cells of depth and enough blocks to
fill a portrait frame. The query that found it is in the session log, and
re-running it is the way to re-pick if the level ever changes.

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
2. **The promo video.** Play takes a YouTube URL, not a file. Not started.

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
