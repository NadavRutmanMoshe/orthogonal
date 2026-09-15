# The native shell

The Capacitor project that wraps `I'm Just A Cube` as an Android app, and
later as an iOS one. The game is the repository root; this folder is only the
box it ships in.

`docs/SHIPPING.md` is the plan this belongs to. What is here is the decisions
that live in code rather than in prose.

## The loop

```
node tools/build-app.js      # copy the game into app/www
cd app && npx cap sync       # copy app/www into the native project
npx cap open android         # hand it to Android Studio
```

`npm run android` in this folder is those three in one. During development,
`npx cap run android --live-reload --external` serves the game from your
machine instead, so an edit reloads on the phone without a rebuild.

## Why the web root is a copy, not a bundle

The game has no build step: classic scripts loaded in the order `index.html`
lists them. A WebView is perfectly happy with that, and keeping the real files
means a stack trace from a tester names a line in a file you can open.
`dist/` is the other job - `build-single.js` inlines everything into ONE file
because itch.io and the artifact host each want exactly one.

`build-app.js` empties `www/` rather than merging into it, because a file
deleted from `css/` or `js/` has to leave the WebView too. It stamps the
commit the same way `build-single.js` does, so an installed APK says in its
menu which commit it is; without that, "the tester is on an old build" is a
guess rather than a fact.

## The three settings in capacitor.config.json that are not defaults

**`adjustMarginsForEdgeToEdge: "disable"`, and this one is a trap with a
timer on it.** Set to `"auto"`, Capacitor adds margins to the WebView on
Android 15 to keep it clear of the system bars. That sounds like what we
want and is the opposite of it: the page then never reaches the glass, every
`env(safe-area-inset-*)` reports `0`, and the game is letterboxed by
Capacitor's margins instead of drawing its own background to the edge with
the chrome held off by `--sat`/`--sar`/`--sab`/`--sal` (see `css/00-base.css`).
It is `"disable"` by default in Capacitor 7 and **the default changes to
`"auto"` in Capacitor 8**, so it is written out explicitly here. If the safe
areas ever go flat after an upgrade, this is the line.

**`zoomEnabled: false`.** iOS Safari ignores `user-scalable=no`, which is why
the two-finger turn was an open question on the web for so long. A WebView
can simply switch pinch-zoom off, so it does: the game's own two-finger
gesture is a camera turn and nothing should be zooming underneath it.

**`backgroundColor: "#0f1424"`.** `--void` from `css/00-base.css`. It is what
fills the window before the WebView has painted anything, so the wrong value
here is a white flash on every launch.

`webContentsDebuggingEnabled` is deliberately NOT set. Left alone, Capacitor
enables WebView debugging for debug builds and not for release ones, which is
exactly the split you want: `chrome://inspect` works on your test build and
does not on the one in the store.

## Still open

- ~~Orientation is not locked.~~ **Settled: it is portrait, locked.** The owner
  turned a real phone sideways and every screen was wrong - the level, the home
  screen and the panels are all laid out down a tall screen. It is
  `android:screenOrientation="portrait"` on the activity in
  `AndroidManifest.xml`. `configChanges` still lists `orientation`, which is
  correct and not a leftover: it is what stops the activity being destroyed and
  rebuilt by any rotation the system still hands it.
- **The INTERNET permission stays**, because v1 ships with ads. The game
  itself requests nothing over the network (see `css/05-fonts.css`), so
  anything on the wire is the ad SDK.
- **`versionCode` is 1.** It must increase on every upload to every track,
  including builds you throw away.
- **Nothing is signed.** Release signing and the upload keystore are set up
  once, in Android Studio, and the keystore has to be backed up somewhere
  that survives the laptop.
