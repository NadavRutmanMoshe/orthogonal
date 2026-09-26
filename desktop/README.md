# The Steam build

An Electron shell around the game, the way `app/` is a Capacitor shell around
it. **The game is not in here.** `node ../tools/build-app.js --desktop` copies
the repository root into `www/`, the same copy the phone apps get, with the
commit stamped in.

What the shell adds, and nothing else:

| | where |
|---|---|
| `window.STEAM`, so `steamBuild()` grants everything | `preload.js` |
| The save as a **file per Steam account**, for Steam Cloud | `main.js`, "THE SAVE" |
| Achievements reported to Steam | `main.js` (the reporting), `js/27-steam.js` (which ones, read off the save) |
| The overlay, `restartAppIfNecessary`, the Deck's on-screen keyboard | `main.js`, `preload.js` |
| No menu bar, full screen remembered, sound without a click (for a pad) | `main.js`, "THE WINDOW" |

The computer version itself (keys, pad, zoom, layouts) is `js/26-desk.js` and
`css/96-desk.css`, and it is the same in a browser: `?steam` in the URL shows
the Steam build's grant anywhere, and `?deck` the Deck's zoom.

## Running it

```
cd desktop
npm install          # once
npm start            # copies the game into www/ and opens it
```

Without Steam running it still plays - no achievements, and the save goes to
`%APPDATA%\ImJustACube\local\` instead of a Steam account's folder. F12 opens
the inspector (only in `npm start`, never in a packaged build).

## Testing it

```
node tools/steamtest.js              # from the repository root
node tools/steamtest.js --packaged   # the exe from `npm run dist:test`
```

17 checks, two launches, in a throwaway data folder: the grant, no age card,
full screen, the save in the file (not localStorage) and back on the next
launch, achievements derived from the save and reported once, and
`steamworks.js` loading from inside the package. It needs no Steam. **What it
cannot test is Steam answering** - that needs the real App ID and Steam
running (see the end of this file).

## Building it

```
npm run dist         # the real one: refuses the test App ID, a dirty tree, TEST_CARD
npm run dist:test    # the same exe, without the refusals, to try by hand
```

Out comes `dist/win-unpacked/` - about 290MB, 110MB or so once Steam has
compressed it - and `steampipe/app_build.vdf`, the upload script.

**Two things about this PC:**

- **Electron is pinned at 39**, the last line whose installer runs on Node 20
  (this machine has 20.13). Electron 40+ and electron-builder 26 need Node
  22.12. Node 20 is out of support; installing Node 22 LTS and bumping both is
  the right move before the next big update, not before launch.
- **electron-builder's first run on Windows fails** with `Cannot create
  symbolic link: A required privilege is not held by the client`. Its code
  signing tools come as an archive with two macOS symlinks in it, and Windows
  will not make a symlink without Developer Mode. The fix, done once on this
  PC already: unpack that archive into
  `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\`
  leaving out its `darwin` folder. On a new PC, turning on Windows Developer
  Mode does the same thing.

## Steamworks: the one-time setup

Everything here is a form on partner.steamgames.com, for the app. **Each
section has its own Publish step** - Steamworks keeps edits as drafts until
you publish them from the Publish tab.

### 1. The App ID

Put the App ID (and the depot ID - usually the App ID plus one, see
Installation > Depots) in `steam.json`. That is the only place it goes.
`npm run dist` refuses to build while it still says 480, which is Valve's
public test app (Spacewar) and what makes a development run work at all.

### 2. Installation

- **Depots**: one depot, Windows, English (or all languages).
- **General > Launch Options**: executable `ImJustACube.exe`, operating
  system Windows. No arguments.

### 3. Achievements (Stats & Achievements > Achievements)

Thirteen. The **API name must match exactly**, or Steam refuses the unlock in
silence (a development run prints `achievement refused` when it does). The
names and descriptions are only a suggestion: Steam shows what is typed here,
not what is in `js/27-steam.js`. Each needs **two icons**, the unlocked one and
the locked one - that artwork does not exist yet.

| API name | Name | Description |
|---|---|---|
| `WORLD_1` | Nature Walk | Finish every level in I · NATURE. |
| `WORLD_2` | Through the Fire | Finish every level in II · FIRE. |
| `WORLD_3` | Deep Water | Finish every level in III · WATER. |
| `WORLD_4` | Desert Crossing | Finish every level in IV · DESERT. |
| `BOSS_1` | Can't Catch Me | Beat BOSS I. |
| `BOSS_2` | Off the Record | Beat BOSS II. |
| `BOSS_3` | Search Called Off | Beat BOSS III. |
| `BOSS_4` | Out of Their Jurisdiction | Beat BOSS IV. |
| `STARS_1` | Green Thumb | Every star in I · NATURE. Earns the Sapling. |
| `STARS_2` | Eruption | Every star in II · FIRE. Earns the Volcano. |
| `STARS_3` | Big Fish | Every star in III · WATER. Earns the Minnow. |
| `STARS_4` | Prickly | Every star in IV · DESERT. Earns the Cactus. |
| `DOMINO` | Domino | Crush two of the pack with a single fold. |

A skip never earns one: skips are kept apart from `progress`, and every
achievement is read from `progress` or from a reward shape.

### 4. Steam Cloud (Steam Cloud > Settings)

- **Byte quota per user**: 1000000. **Number of files**: 10. (A full save is a
  few kilobytes.)
- **Auto-Cloud**, one root path:

  | Root | Subdirectory | Pattern | OS | Recursive |
  |---|---|---|---|---|
  | `WinAppDataRoaming` | `ImJustACube/{64BitSteamID}` | `*.json` | Windows | no |

That folder is where `main.js` writes `save.json`, one folder per Steam
account. **The folder name is now part of every player's save** - renaming it
strands their cloud copy, the same as renaming an `orthogonal:*` key. The
`.bak` beside it (the save as it was when the game last started) is
deliberately not `*.json`, so Cloud leaves it alone. On a Deck the same rule
applies inside Proton's prefix; nothing extra is needed.

### 5. Steam Input (Steam Input > Settings)

Set the default controller configuration to the **gamepad** template. The
game reads the pad through the browser's Gamepad API, which sees any
controller Steam presents as an Xbox pad, the Deck's own controls included.

## Uploading a build

With the Steamworks SDK's `steamcmd` (in `tools\ContentBuilder\builder\`):

```
steamcmd +login <steam account> +run_app_build "C:\...\desktop\steampipe\app_build.vdf" +quit
```

The build lands under Steamworks > Builds, **not live**: making it the
default branch is a click there, after it has been played from Steam.

## What has not been tested yet

This PC has no Steam on it, so four things have only been reasoned about:

- **Achievements popping.** The page side and the bridge are tested; the
  `steamworks.js` calls are not. First launch through Steam: beat any level,
  press Shift+Tab, look under Achievements.
- **Steam Cloud round trip.** Play on one PC, then check the save appears on
  another (or after deleting `%APPDATA%\ImJustACube`).
- **The overlay** (Shift+Tab). It needs two Chromium switches that
  `electronEnableSteamOverlay()` sets; if it does not appear, that is where
  to look.
- **The Deck**, through Proton. `main.js` turns off Chromium's sandbox when
  it sees Proton, because Chrome under Wine has always needed that - but it is
  a reasoned guess until a Deck runs it. A black window on a Deck: that line
  first.
