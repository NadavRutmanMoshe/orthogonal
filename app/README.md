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

## Android 16 (API 36), because Play refuses anything lower

**Since 31 Aug 2026 Google Play only accepts a NEW app that targets API 36.**
Capacitor 7 ships targeting 35, so `variables.gradle` says 36 for
`compileSdkVersion` and `targetSdkVersion`, and the build tools were moved up
to what Capacitor 8 uses for the same reason: Android Gradle Plugin 8.13.0
(`build.gradle`) and Gradle 8.14.3 (`gradle-wrapper.properties`). Capacitor
itself stays on 7, because Capacitor 8's CLI needs Node 22 and this machine
has 20 - that migration is its own job, done once, later.

Targeting 36 changes two things worth checking on a phone: edge-to-edge can
no longer be switched off (the safe-area tokens already expect it), and the
back gesture goes through Android's predictive-back system, which
`@capacitor/app`'s listener uses - press back once in a level to be sure.

## The two money plugins

`@capacitor-community/admob` 7.2.0 and `@capgo/native-purchases` 7.19.3,
pinned exactly (`--save-exact`). Both have 8.x releases, and both 8.x lines
need Capacitor 8; do not let `npm update` pull them. The why of each, and
what the game does with them, is **As built: ads and the shop** in
`docs/SHIPPING.md`.

**`AndroidManifest.xml` carries two AdMob entries**, and the first is not
optional:

- `com.google.android.gms.ads.APPLICATION_ID` - without it the ad SDK crashes
  the app **on launch**, before a single ad is asked for. It is Google's
  public TEST app id today (`~3347511713`). An app id has a `~`; an ad unit id
  has a `/`. Swapping one for the other is the classic crash.
- `DELAY_APP_MEASUREMENT_INIT` - the SDK sends nothing until the game calls
  `initialize()`, which it does only once the age band is known.

Play Billing needs no manifest entry: the plugin's library merges the
`BILLING` permission in by itself.

**Going live with ads is now ONE edit**: `AD_TEST=false` in `js/24-ads.js`.
Both app ids (here and in Info.plist) and both rewarded unit ids (`AD_UNITS`)
are the real ones already - a real app id with test units is the intended
pairing while testing. `tools/build-app.js` prints a warning on every build
until that switch is flipped, which is deliberate: it stays `true` through
the closed test, because a tester tapping a live ad is an invalid impression
against your own account.

**iOS, when `npx cap add ios` runs on the CI Mac.** Info.plist needs:

- `GADApplicationIdentifier` = **`ca-app-pub-6542623981022877~4214992380`**,
  the game's real iOS app id from AdMob. Missing, it crashes on launch,
  exactly as on Android.
- `GADDelayAppMeasurementInit` = `YES`, for the same reason as Android.
- `SKAdNetworkItems` - Google's list of ad network ids, copied from the
  AdMob iOS quick-start page. Without it iOS ads still show but pay less.
- **No** `NSUserTrackingUsageDescription`: the game never asks for tracking
  permission (ATT), so it must not declare a reason for asking.

In-app purchases also need the **In-App Purchase capability** ticked on the
app target, which Codemagic's automatic signing can set.

## Testing it on the phone

- **Ads** work today with no account: Google's test ads always fill and are
  labelled "Test Ad".
- **Purchases** need the products to exist in Play Console, which needs a
  build containing the billing library uploaded to a track first. Then add
  your own Google account under **License testing**, install **from the
  Play testing link** (the surest way for Play to recognise the app), and
  purchases are free and cancel themselves. A product id that is not set up
  simply does not come back from the store: its BUY button keeps the dollar
  price, and pressing it says "no purchase made".
- `node tools/storetest.js` drives every path of both files against a fake
  bridge in a desktop browser - the fastest check after touching either.

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
