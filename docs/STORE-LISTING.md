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

Around 2,150 characters, so there is room to grow. Play renders a small set
of HTML tags in this field, but plain text with blank lines between
paragraphs is what survives being re-flowed on every screen width, so that
is what this is. The bullets are `•`, typed, not a list tag.

```
They took my parents. I couldn't stop them. I'm just a cube.

But I can do one thing nothing else in this world can do. I can drop it to 2D.

Fold the world flat and everything collapses along the way you are looking.
Two blocks a long way apart in depth land on the same square, and the gap
between them stops existing. Walk across it. Stand the world back up, and
you are somewhere you could never have reached.

That is the whole puzzle. One verb. The game is working out which way to
look before you use it.


WHAT IS IN IT

• 109 hand-built levels across six worlds. Each one teaches a single idea
  before it asks anything of you.
• Fire that kills everything in the column it folds into. Water you can
  stand on that leaves nothing behind in 2D. Crates you can shove to change
  what the flat world looks like.
• Four hunts. The pack moves on a real clock, learns your row and fires
  down it. The only way to kill one is to fold while it is sharing your
  silhouette.
• Four timed trials, with a lethal plane sweeping the board one slice at a
  time.
• A story in three scenes, told in the same blocks you play in. Nothing is
  a video. Everything folds.
• A level editor with the solver in it. Build a level, press VERIFY, and it
  tells you whether it can be finished and in how few moves. Share one as a
  single line of text.
• Shapes and colours to earn with stars, and a neighbour who stands beside
  the early levels and tells you what he can see.


HOW IT PLAYS

Swipe to walk. Double tap to fold. Two fingers to turn the camera. Or turn
on a d-pad and buttons instead - it is one row in the settings, and so are
the board size, the text size and how fast the fights run.

The game asks your age once, sets those three for you, and does not ask
again. Every one of them is a row in the menu afterwards.

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
| 109 levels, six worlds | `LEVELS.length`, `SECTIONS.length` in `js/02-levels.js` |
| four hunts, four trials | four `boss` levels that are not `tutorial:true`, four `trial` |
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

## Still outstanding

Things a script cannot do, roughly in the order they block submission.

1. **The privacy policy needs a public URL.** `docs/privacy.html` is written;
   it has to be reachable at an address the Play Console can be given, and
   the Data safety form is checked against it. Mandatory here rather than
   optional, because the Families programme.
2. **A contact email address** on the listing, shown publicly.
3. **Whether to claim tablet support.** `node tools/store.js --tablet` writes
   the 1200x1920 set if so. Claiming it means the layout is held to it.
4. **`AD_TEST` is still `true`.** Going live is the real ad unit ids, the app
   id in the manifest and the switch, together (`docs/SHIPPING.md`).

## Settled, so it does not get re-opened

**THE SCREENSHOTS SHIP BARE**, on the owner's call. A caption pass was
offered - a headline band over each shot in the game's own typefaces, which
is what most listings that convert do, and which would have made 01 and 02
say "the world has depth" and "fold it and the depth is gone" in words
rather than only in pictures. Turned down: the shots show the game and
nothing else, and type over the board is type over the board. `tools/
caption.js` does not exist and should not be written without being asked
for again.

