# The native shell

The Capacitor project that wraps `I'm Just A Cube` as an Android app and as
an iOS one. The game is the repository root; this folder is only the box it
ships in.

`docs/SHIPPING.md` is the plan this belongs to. What is here is the decisions
that live in code rather than in prose.

## The loop

```
node tools/build-app.js      # copy the game into app/www
cd app && npx cap sync       # copy app/www into BOTH native projects
npx cap open android         # hand it to Android Studio
```

`npm run android` in this folder is those three in one, and `npm run ios` is
the same three ending in Xcode - which only exists on a Mac. See **The iOS
project** below for what the loop is here instead. During development,
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

## The settings in capacitor.config.json that are not defaults

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

**The `ios` block is two lines, and both are written out on purpose.**
`backgroundColor` is the same `#0f1424` again: iOS falls back to the
top-level value when the platform block has none, so this is a duplicate the
way the `android` block's copy is, and it is here so that neither platform
can be changed by accident while editing the other. `contentInset: "never"`
is Capacitor 7's own default and is the iOS twin of
`adjustMarginsForEdgeToEdge` above: it is what stops the system insetting the
WebView, which would flatten every `env(safe-area-inset-*)` to `0` and let
the shell letterbox the game instead of the page holding its own chrome off
the notch.

`zoomEnabled` is NOT repeated there, and that is not an oversight: the iOS
side reads `ios.zoomEnabled` **or** the top-level one
(`CAPInstanceDescriptor.swift`), so the line at the root already switches
pinch-zoom off on both platforms.

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

## The iOS project, and the Mac that is not here

`app/ios` is a real Xcode project and it was generated **on this Windows
machine**, which is worth knowing because the internet will tell you it
cannot be. `npx cap add ios` only needs macOS for the last two steps of what
it does - `pod install` and an `xcodebuild clean` - and the CLI checks for
CocoaPods only when it is running on a Mac (`checkCocoaPods` in
`@capacitor/cli/dist/ios/common.js`). Everywhere else it writes the whole
project, prints `Skipping pod install because CocoaPods is not installed`,
and stops there. So the project, the plist, the icon and the launch screen
are all editable here; only **building** needs a Mac, and that is rented
per build (`codemagic.yaml` at the repository root).

The loop on this machine is therefore: edit, `cd app && npx cap sync ios` to
be sure nothing you wrote is clobbered, commit, push, and start a build in
Codemagic. `npm run ios` is the Mac loop and ends in `npx cap open ios`,
which needs Xcode; on Windows it will do the first two steps and fail on the
third, which is harmless.

**What is checked in is eleven files.** `ios/.gitignore` came with the
template and is right: `App/Pods`, `App/App/public` (the game, copied in by
`cap sync`), `App/App/capacitor.config.json` (written from the one in `app/`)
and `capacitor-cordova-ios-plugins` are all generated. **`Podfile.lock` is
not checked in either**, because it cannot be generated here - CocoaPods is
Ruby on macOS - so the pods resolve on CI, per build. That is a real
looseness and the thing that holds it down is `app/package.json`, where both
money plugins are pinned to an exact version.

### The five decisions in it

**iOS 15.0, and it is not a preference.** Capacitor's template says 14.0 and
`@capgo/native-purchases` declares 15.0 in its podspec, because StoreKit 2
starts there. CocoaPods does not negotiate: it refuses the install outright
with "The platform of the target `App` (iOS 14.0) is not compatible with
CapgoNativePurchases". Both the `Podfile` and `IPHONEOS_DEPLOYMENT_TARGET` in
`project.pbxproj` say 15.0, and they have to agree. AdMob is not the
constraint - `Google-Mobile-Ads-SDK` 12.12.0 asks only for iOS 12.

**Portrait, locked, on iPhone and iPad - and `UIRequiresFullScreen` is what
makes that legal.** The orientation call is the Android one for the same
reason: every screen is laid out down a tall screen. But an iPad app that
does not support all four orientations is only allowed if it also opts out of
Split View, which is that key. Without it the app is rejected with an iPad
Multitasking error. Upside-down is permitted on iPad, where it is just which
way up you are holding it, and not on iPhone, where it would put the home
indicator at the top.

**iPad IS supported** (`TARGETED_DEVICE_FAMILY = "1,2"`, Capacitor's default,
left alone) on the owner's call: the iOS device in the house is an iPad, so
it is both the test device and the first real screen the game will be seen
on. The cost is a second screenshot set for the store and a 4:3 screen that
every panel and the map have to be looked at on.

**The launch screen is the void and nothing else.** On iOS the launch
storyboard is not optional the way an Android splash drawable is - it is what
the system draws for the whole cold start - and the template ships a white
image. That is a white flash before the sting on every launch, which is the
exact thing `backgroundColor: "#0f1424"` was set to prevent. `LaunchScreen`
is now a plain view in that colour, `Splash.imageset` is deleted, and there
is no second piece of artwork to drift away from `js/20-splash.js`.

**The app icon is the store icon, byte for byte.** `node tools/icon.js --ios`
writes `AppIcon-512@2x.png` from the same `scene()` that writes
`app/icon/icon-1024.png`, so the two cannot disagree; the render is
deterministic, so running it twice changes nothing on disk. iOS wants one
1024 square and masks it itself, and it must have **no alpha channel** -
Apple rejects that at upload, after the whole build has transferred.

### Versions, and Apple's version of the burnt-number trap

`MARKETING_VERSION` is `1.0.2`, deliberately the same string as Android's
`versionName`, so "which build is this" has one answer across both stores.
`CURRENT_PROJECT_VERSION` is Apple's `versionCode`, and Apple burns it the
same way Play does: the same build number twice under one version string is
rejected, at the end of the upload. It is **not** bumped by hand - the
Codemagic workflow asks App Store Connect what it has already seen and adds
one, which is a thing Play's side cannot do and this side can.

### What the iOS side still needs, and all of it is on a dashboard

- An **Apple Developer Program** enrolment ($99/year) and an **App Store
  Connect app record** for `com.nadazgames.ImJustACube`. A build cannot be
  uploaded to an app that does not exist yet.
- An **App Store Connect API key** (App Manager role), pasted into Codemagic
  as `AppStoreConnect`. The header of `codemagic.yaml` is the checklist.
- The **seven in-app purchases as Non-Consumable**, same ids as Play, and the
  **Paid Apps agreement** signed - without it StoreKit returns no products at
  all, so every price in the shop stays at the dollar default.
- **The In-App Purchase capability** on the app target, which Codemagic's
  automatic signing can set.
- **Screenshots** at 1290x2796 and 1320x2868, plus iPad at 2064x2752 now that
  iPad is supported (`tools/store.js --ios`, `--tab10`).

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

**`Info.plist` is the iOS twin of `AndroidManifest.xml`, and it is written.**
The four AdMob decisions are in it:

- `GADApplicationIdentifier` = **`ca-app-pub-6542623981022877~4214992380`**,
  the game's real iOS app id from AdMob. Missing, it crashes on launch,
  exactly as on Android.
- `GADDelayAppMeasurementInit` = `YES`, for the same reason as Android.
- `SKAdNetworkItems` - **50 ids**, Google's published third-party list from
  `developers.google.com/admob/ios/3p-skadnetworks` (that page last changed
  2026-02-10). Without it iOS ads still show and pay less. Google trims and
  adds to that list; re-copying it is a chore for a release, not for a build.
- **No** `NSUserTrackingUsageDescription`, deliberately: the game never shows
  the ATT prompt, so it must not declare a reason for asking. An app that
  declares one and never asks is a question at review.

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

## Building and installing the APK, on this machine

    node tools/build-app.js
    cd app/android
    ./gradlew assembleDebug -Dorg.gradle.java.home="C:/Program Files/Android/Android Studio/jbr"
    adb install -r app/build/outputs/apk/debug/app-debug.apk

**`-Dorg.gradle.java.home` IS NOT OPTIONAL HERE, and the failure it avoids
is a confusing one.** Gradle picks its own JVM, not the one on PATH, and
its wrapper found an Adoptium **17** while Capacitor 7's `capacitor-android`
module compiles at source 21. The error is

    Execution failed for task ':capacitor-android:compileDebugJavaWithJavac'
    > invalid source release: 21

which reads like the JDK is too new and means the opposite. Android
Studio's bundled JBR is 21 and is the one to point at. `java -version` on
PATH tells you nothing about this - ask `./gradlew -version`, which prints
the Daemon JVM it will actually use.

**And `tools/build-app.js` now writes BOTH copies.** `app/www` is
Capacitor's web root; the APK reads
`app/android/app/src/main/assets/public`, and `npx cap copy` is normally
what carries one to the other. There is no `node_modules` here and so no
`cap`, so build-app does the copy itself. Before it did, gradle saw
nothing new, **reported BUILD SUCCESSFUL, and installed the previous
build's game** - which is the worst shape a build bug can have, because it
looks like it worked.
