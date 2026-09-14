# Shipping the Android app

The plan for turning this repository into an app on Google Play. Nothing here
is built yet; this is the order of work and the reasoning, so a session can
pick up any one step without re-deriving the rest.

Read `CLAUDE.md` first for what the game is. The three facts that matter to
this document: there is **no build step** (classic scripts in cascade order),
there are **no image or audio files** (surfaces are drawn on canvas, sound is
synthesised), and **saves are `orthogonal:*` keys in localStorage** behind
`window.storage`.

---

## 0. What kind of Android app

Three ways to put a web game on Play, and only one of them is right here.

**Capacitor (chosen).** A native Android shell around a WebView, with the
game's files bundled inside the APK. It runs fully offline, it can reach
Play Billing and AdMob through plugins, and it is the same wrapper that will
later produce the iOS build. `js/00-storage.js` was written for this case in
the first place - its header names the Capacitor WebView as one of the three
places the identical code has to run.

**A TWA / Bubblewrap PWA (rejected).** A Trusted Web Activity is a Chrome tab
with no browser chrome, pointed at a hosted URL. It needs the game on a live
domain, it needs the network on first run, and it cannot reach Play Billing
without extra work. The game is a 1MB offline artifact; hosting it to then
wrap the hosting is a step backwards.

**A hand-written WebView Activity (rejected).** This is what Capacitor is,
minus the maintained plugin layer for billing, ads, status bar and back
button. Writing it by hand buys nothing and owns everything.

---

## 1. The Play Console facts that set the timeline

Check each of these in the Console rather than trusting this list; Google
moves them. They are listed first because two of them are irreversible and
one of them is weeks long.

- **Closed testing before production.** A personal developer account opened
  recently must run a closed test with a minimum number of real testers
  (12 at the time of writing) opted in for 14 continuous days before the
  production track unlocks. This is the long pole in the whole project. Start
  recruiting the testers while the app is still being built, not after.
  Organisation accounts are exempt; check which kind of account was opened.
- **The package name is permanent.** `applicationId` cannot be changed after
  the first upload, ever, on that listing. Pick it deliberately, something
  like `com.<yourname>.imjustacube`. It is not player-visible, and it is the
  one string in this whole project that can never be renamed - the same rule
  the `orthogonal:*` save keys live under.
- **The upload keystore is permanent too.** Enrol in Play App Signing (the
  default) so Google holds the release key, then back up the *upload* key
  somewhere that survives the laptop. Losing it without Play App Signing means
  losing the ability to update the app at all.
- **Target API level.** New apps must target a recent API level, and the bar
  rises every August. Capacitor's template targets a current one; the Console
  will refuse the upload and name the number if it is short.
- **versionCode is an integer that must always increase.** Every upload to
  every track, including a test build you throw away. Bump it, never reuse it.

---

## 2. Work in this repository, before any wrapper exists

Each of these is a real defect on a phone that does not show in a desktop
browser. They are worth doing in this order, and they are all small.

1. ~~**Bundle the fonts.**~~ **Done.** `css/05-fonts.css` carries both
   families as base64 woff2, latin only, and the page now makes no outbound
   request at all. `tools/fonts.js` rebuilds it, one request per weight -
   a combined request returns the variable file and every weight then renders
   at the lightest, silently, which is worth knowing before anyone "tidies"
   that script.
2. ~~**Safe-area insets.**~~ **Done.** Four tokens in `css/00-base.css` and
   `viewport-fit=cover` in the viewport meta. The trap: an override that
   re-states an edge value needs its own inset, and six rules do.
3. ~~**The hardware back button.**~~ **Done, but unproven.** `backOut()` in
   `js/19-bindings.js` is Escape's order plus a rung for the editor and a
   two-press exit from the home screen. The logic is tested; the Capacitor
   listener that calls it cannot be until there is a wrapper.
4. **Flip the two playtest switches.** `UNLIMITED_SHARDS` in
   `js/09-wardrobe.js` is `true` and hands over 9999 stars; it must be `false`
   in any build that reaches a tester, or the entire star economy is invisible
   to the test. `AMB_MUTED` in `js/11-sound.js` is `true` by the owner's call
   and is a decision, not a bug - confirm it is still the decision.
5. **Verify the gestures on real glass.** The two-finger turn and
   `touch-action:none` are unproven on a device (`ROADMAP.md`), and the audio
   unlock has never run inside a WebView. These are the three things a first
   install exists to find out, and they cannot be answered from here.
6. **Decide the orientation.** `fitViewSize()` handles portrait and landscape
   differently and the bar does not buy size in portrait. Either lock the
   manifest to portrait, or test both properly. Locking is the cheaper answer
   for a first release.

---

## 3. The wrapper project

Keep it out of the game's own tree so the no-build-step rule survives:

```
app/                     # the Capacitor project, committed
  android/               # generated by `npx cap add android`, committed
  www/                   # the game, copied in by the build step, gitignored
  capacitor.config.json
  package.json
```

The build step is a copy, not a bundle. The game is already a set of static
files that load in the order `index.html` lists, so `www/` is `index.html`,
`css/`, `js/` and `vendor/` copied verbatim, then `npx cap sync android`.
Write it as `tools/build-app.js` beside `tools/build-single.js` and have it
stamp the same commit string, so an installed APK can say which commit it is
in the menu exactly the way the artifact build does.

Do not reuse `dist/orthogonal.html` for this. Inlining everything into one
file is what the artifact host and itch.io need; a WebView is happier with
the real files, and a stack trace from a tester is worth having.

Capacitor serves from a fixed local origin, so localStorage is stable across
updates and the `orthogonal:*` saves survive an app update. Android may still
evict WebView storage under pressure, and the fix if that ever bites is one
file: `js/00-storage.js` is the only thing that touches localStorage, so
swapping its backing for Capacitor's Preferences plugin is a change to that
shim and to nothing else.

---

## 4. Money: what is wired and what is not

Nothing is wired. Both of these are optional for a first release and the
recommendation is to **ship v1 with neither** - see step 6 for why that is
worth real time.

**THE OWNER'S CALL: v1 SHIPS WITH BOTH.** The argument in step 6 for a clean
first release was heard and overruled - the shelf and the rewarded videos are
part of the game being finished, and testers should see the real thing rather
than a version of it. What follows from that, and is not optional: the Data
safety form declares the advertising id and the app keeps its INTERNET
permission, so both need wiring BEFORE the closed test rather than after, and
the privacy policy is a real one rather than four sentences.

**In-app purchases.** The DEALS tab is a live shelf with real prices in
`SKIN_SHAPES` and `PASSES` (`js/09-wardrobe.js`): four shapes at $2.99, the
NO LIMITS pass at $4.99, EVERYTHING at $9.99 with an upgrade price. Today the
BUY buttons are deliberately dead and the panel says "No store yet". Play
requires that digital goods go through Play Billing, so this means the
`@capacitor-community/in-app-purchases` plugin (or similar), a product id per
item registered in the Console, and a restore-purchases path. The grant side
is already there and small: `owns()`, `hasPass()` and `wardrobe.owned`.

**Rewarded ads.** `docs/ROADMAP.md` names the four hooks a rewarded video
callback should call, and they all exist: `grantShards(n)`, `grantAdView(id)`,
`grantSkip(name)`, `grantHints(n)`. Rewarded only, by design, no
interstitials. This is AdMob plus a Capacitor plugin. Note that the game's
oldest rule holds through both: money buys progress, never score, and nothing
bought can appear in `starsEarned()`.

---

## 5. Store assets

`tools/shot.js` is the whole screenshot problem solved already - it takes any
screen headless and by name. `node tools/shot.js --list` prints them. Good
candidates: `home`, `level:N`, `flat:N`, `boss`, `map`, `story1:13` (the fold
in the opening), `wardrobe`. Play wants several phone screenshots at a
supported aspect ratio; shoot them at the phone size the tool already has and
check the Console's current minimum count.

Still to be made by hand:

- **The app icon**, 512x512 PNG for the listing, plus an adaptive icon
  (foreground and background layers) for the launcher. The cube is the obvious
  subject, and it can be rendered out of the game's own renderer rather than
  drawn.
- **The feature graphic**, 1024x500. Required for a game listing.
- **Short description** (80 chars) and **full description** (4000). The game's
  own intro card text is the right starting voice.

---

## 6. The Console forms, and why v1 should have no ads

The forms are where an offline game with no accounts wins outright.

- **Data safety.** With the fonts bundled (step 2.1) and no ads, no analytics
  and no crash reporter, the app makes **no network requests at all** and
  collects nothing. That is the simplest possible declaration, and the
  manifest can then drop the `INTERNET` permission Capacitor adds by default,
  which is a strong, checkable statement of the same thing. Adding AdMob
  reverses all of it: advertising id, device identifiers, a data-sharing
  disclosure and a policy surface that can get an app suspended. That is the
  argument for shipping v1 clean and adding money in v2, once the app is
  live and the tester round is behind you.
- **Privacy policy.** Required regardless, with a public URL. For the clean
  build it is four sentences saying the game stores progress on the device and
  sends nothing anywhere. A GitHub Pages page is enough.
- **Content rating.** The IARC questionnaire. The game has cartoon peril and
  a story about a father taken by police; answer it honestly and expect a low
  rating rather than the lowest.
- **Target audience, and the age question.** The intro card asks the player
  how old they are and writes three settings from the answer
  (`AGE_BANDS`, `applyAgeBand()`). It is a local preference, stored nowhere
  but the device, and it should be declared as exactly that. Be careful in
  the target-audience section: selecting a children's age band puts the app
  under the Families policy, which carries ad and data rules of its own. If
  the intended audience includes under-13s, that decision needs making
  deliberately, before the listing is filled in.
- The usual remainder: app category (Game / Puzzle), contact details, the US
  tax and export forms.

---

## 7. Release flow

1. `internal testing` track - the fastest loop, up to 100 testers, available
   within minutes of upload. This is where steps 2.5 and 2.6 actually get
   answered.
2. `closed testing` - the 14-day, 12-tester gate from step 1. Run it on a
   build you would be happy to ship.
3. `production` - staged rollout, starting well under 100%.

Every upload is an **AAB** (`./gradlew bundleRelease`), not an APK. The game
is around 1MB of source plus 600KB of three.js, so size is a non-issue and
nothing needs splitting.

---

## 8. Suggested order of sessions

One job per session, as ever:

1. ~~Fonts, insets, back button.~~ **Done**, repo only, no wrapper.
   (Steps 2.1, 2.2, 2.3.)
2. The Capacitor project, `tools/build-app.js`, and a debug APK that opens.
   (Step 3.) Needs Android Studio on the owner's machine.
3. Orientation, playtest switches off, then an internal-track build on a real
   phone. This is where 2.5 gets answered. (Steps 2.4, 2.6, 7.1.)
4. Play Billing and AdMob, since v1 ships with both. (Step 4.)
5. Icon, screenshots, descriptions, and the Console forms. (Steps 5, 6.)
6. Closed testing opens. Everything after this is waiting and fixing.

iOS is the same wrapper with `npx cap add ios`, and the extra work there is
the notch, the home indicator and Apple's own review. Steam is a different
wrapper again - a desktop shell rather than Capacitor - and is not covered
here.
