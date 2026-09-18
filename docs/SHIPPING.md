# Shipping - Android, iOS and Steam

> Written 13 Sep 2026, at the end of the two-week push that starts 14 Sep.
> The decisions in **Settled** were taken by the owner and are not open
> questions. The rest is the reasoning: what the stores force, what the code
> already has, and what is actually left to build.

---

## The three clocks, and why they come before any code

Nothing here is a technical constraint and all three are unmovable, so they
set the shape of the fortnight rather than sitting at the end of it.

- **Google Play: 12 testers, opted in, for 14 continuous days.** A personal
  developer account opened after Nov 2023 cannot apply for production access
  until it has run a closed test on that scale. The 14 days are continuous and
  the testers have to actually opt in - an address on a list counts for
  nothing until that person clicks the link, installs from Play and signs in
  with the same account.
  **The move that saves a week: the closed test does not need the finished
  game.** Any signed build satisfies the requirement, and you can keep
  shipping updates into the track while the clock runs. So the Android build
  goes up on day 2 with no ads and no shop in it, and the monetization is
  built on top of a clock that is already running. Start it on day 8 instead
  and production access lands in October.
  **It must be the CLOSED track, and this is the trap.** Internal testing
  does not count towards the 14 days however many people are on it, and worse:
  somebody opted into the internal test is **not eligible** for the closed one
  until they opt out of internal first. Put the build straight into closed
  testing and send the 12 people the closed opt-in link. Do not use internal
  testing at all this fortnight - it is the faster track and it buys nothing
  here.
- **Steam: 30 days between paying and releasing.** The $100 Steam Direct fee
  starts a mandatory wait. Paid Mon 14 Sep, the earliest possible release is
  **Tue 13 Oct**. Valve also wants a public "coming soon" page up for about
  two weeks before launch, which fits inside that wait rather than after it.
  **This is why the Steam code is the right thing to defer**: it cannot ship
  early however fast it is written, so only the payment and the store page are
  urgent.
- **Apple has no equivalent wait.** Enrollment is a day or two, review is
  usually under 24 hours. It is the only one of the three that can genuinely
  go live inside the fortnight.

**So the two weeks end with: iOS submitted or live, Android in closed testing
with its clock running towards ~28 Sep, and Steam paid for with a store page
up and the build underway for mid-October.** That is three launches only if
you count the ones that are out of your hands.

---

## Settled

- **Audience: children and adults both.** Not the Kids Category, which would
  ban third-party ads outright on iOS, but a mixed audience, which puts the
  Android build in Google Play's Families programme.
- **Anyone who does not say they are 18 or over is treated as a child.**
  `UNDER 18` and I'D RATHER NOT SAY both mean child, for ad purposes only.
  The owner's call, and it is the conservative one: see below for why it also
  means the intro card does not change at all.
- **Steam is $5.99 and grants everything.** No ads, no shop, the whole
  catalogue open. This supersedes the earlier $4.99 NO LIMITS reading, which
  left four paid characters locked behind a shop Steam does not have.
- **`buyTestPanel()` (`js/16-panels.js`) must stay reached by nothing.** It
  was the owner's ON/OFF per paid item under Menu > More and its row is off
  the sheet now; reachable in a shipped build, it is a free shop.
- **The shop is wired for v1.0.** StoreKit 2 and Play Billing, real products,
  not a shelf with disabled buttons on it.
- **The upgrade discount is three products showing two.** The owner's
  workaround for something no store does natively; written up under
  **The shop** below.

---

## What the code already has

Four things were built with this in mind and are worth naming, because they
are the difference between a fortnight and a month.

- **The four ad hooks exist.** `grantShards()`, `grantAdView()`, `grantSkip()`
  and `grantHints()` are real functions with real call sites. A rewarded
  video's completion callback calls one of them and **nothing else on the path
  changes** - the buttons, the toasts and the persistence are already written
  against them.
- **`noLimits()` already draws the ad-free game.** Six call sites - the hint
  refill, the level skip, the world unlock, the map's locked sheet, the
  out-of-lives card and the shelf - each carry a branch that renders a plain
  button where the ad button would be. The Steam build is not a new set of
  screens; it is a state this UI can already reach.
- **`owns()` answers passes by rule, not by copying.** `pass_all` covers every
  `deal:true` shape by asking the catalogue, so a shape added next year is
  included in a pass bought today. That is what makes the Steam grant one
  line.
- **`tools/shot.js` takes `--w --h --dpr`.** Every store screenshot at every
  required size is a loop over targets that already exist. The only artwork
  that cannot come out of it is the artwork that needs a logotype.

And two that are not ready:

- **The DEALS tab's BUY buttons are `disabled`.** A visibly dead shop is worse
  than no shop, which is why wiring it was the right call over hiding it.
- **There is no privacy policy.** Both stores require a URL, and the moment an
  ad SDK is in the binary it stops being a formality and becomes the thing the
  Data Safety form and the Privacy Nutrition Label are checked against.

---

## Mixed audience: what it actually costs

Choosing "children and adults" rather than "13+" is four pieces of work, and
the first one is the interesting one.

### 1. The age card is already the neutral age screen, and does not change

Google Play requires a **neutral age screen** on a mixed-audience app: it must
ask age in a way that does not encourage misrepresentation, must not be
trivially bypassable into adult treatment, and its answer must persist.

The intro card is most of the way there already, and by accident of a decision
taken for other reasons. **Nothing on the card says what a band sets** - that
was the owner's call about not explaining three settings to somebody who has
not played yet, and it is also exactly what makes the screen neutral: a player
who wants the big board cannot know which band to lie into. The answer
persists too, in the band id that `ageBandOf()` reads back.

**The obvious gap is that `AGE_BANDS` opens at `UNDER 18` while the line
every ad network and every privacy regime cares about is 13.** The first plan
here was to split that band into `UNDER 13` and `13 - 17`. The owner took the
simpler call instead: **treat the whole `UNDER 18` band as a child, and
I'D RATHER NOT SAY with it.**

That is better than the split, for three reasons.

- **The intro card does not change.** No new band, no re-tuned copy, no
  screenshot to re-take, and the first run is still the one question it was
  designed to be. The entire compliance change becomes a single predicate:

      function adChild(){ var b=settings.ageband;
        return b!=="a18" && b!=="a26" && b!=="a40" && b!=="a60"; }

  Read by the ad initialisation and by nothing else in the game. Anything
  that is not an explicitly adult band - `u18`, the three `DIFF_BANDS`, a
  save with no band at all - falls to the child side by construction, which
  is the right direction for a default to fail in.
- **It is stricter than the rule asks for.** A 13 to 17 year old is legally a
  teen, not a child, and could be served personalised ads. Serving them
  non-personalised ones is over-compliance, and over-compliance is never the
  thing that gets an app pulled.
- **Unknown age has to mean child anyway.** I'D RATHER NOT SAY swaps in the
  difficulty bands, which carry no age at all, so there is nothing else it
  could honestly resolve to.

**What it costs**: 13 to 17 year olds see non-personalised ads, which earn
perhaps a third to a half of what personalised ones do. On a rewarded-video-
only puzzle game that is a small number on a small number, and it buys the
card staying exactly as designed.

### 2. Ads: rewarded only, certified SDK, child-directed when in doubt

- **AdMob is a Families self-certified SDK**, so it can stay the choice; the
  version has to be a certified one.
- `TagForChildDirectedTreatment` and `TagForUnderAgeOfConsent` are set from
  `adChild()`. Children and unknown-age players get non-personalised ads and
  no advertising identifier transmitted.
- **Rewarded video only, no interstitials.** This was already the design rule
  in `ROADMAP.md` for revenue reasons - interstitials pay badly on a slow
  puzzle game and are the main cause of uninstalls - and it happens to be the
  safest shape under Families policy as well.
- No ATT prompt on iOS for anyone `adChild()` returns true for.

### 3. The declarations, which have to agree with each other

Play's Target Audience and Content declaration, Play's Data Safety form,
Apple's age rating questionnaire and Apple's Privacy Nutrition Labels are four
descriptions of the same app, and a mismatch between any two of them is a
rejection. They get filled in once, from the privacy policy, in one sitting.

**Do not opt into Apple's Kids Category.** It forbids third-party ads and
analytics entirely and puts every purchase behind a parental gate, and once
customers expect it the app has to keep meeting it even if the category is
later deselected.

---

## The shop, and the two things it forces

Seven products, not five: four shapes at $2.99 (`rook`, `pup`, `cat`,
`robot`), `pass_nolimits` at $4.99, `pass_all` at $9.99, and **a seventh SKU
for the $5.49 upgrade**.

**Three products, two of them ever visible at once.** Neither store has a
native "cheaper if you already own that one" for non-consumables, so the
discount is done by swapping which product the shelf offers - the owner's
workaround, and it is the right one:

| Owns | Shelf shows | Product id behind it |
|---|---|---|
| nothing | NO LIMITS $4.99 **and** EVERYTHING $9.99 | `pass_nolimits`, `pass_all` |
| `pass_nolimits` | EVERYTHING $5.49 only | `pass_all_upgrade` |
| `pass_all` or the upgrade | neither | - |

The third product is real and priced on both stores; it is simply never shown
to somebody who has not already bought the first. **Half of this is already
built**: `PASSES` carries `usdUp:"5.49"` and `needs:"pass_nolimits"`, and
`dealPrice()` already returns the right number from one place. What it needs
is for that answer to carry a product **id** as well as a price, and for
`hasPass("pass_all")` to also be satisfied by owning `pass_all_upgrade` -
otherwise somebody who took the discount does not own what they paid for.
That second half is the part worth writing a test for.

One consequence to accept: a store's own "you already bought this" receipt
list will show `pass_all_upgrade` rather than EVERYTHING, so the two products
want names a player would recognise on a receipt - "Everything (upgrade)"
rather than an internal id.

Two things the stores force that the code does not have yet:

- **A RESTORE PURCHASES button.** Apple requires one on any app selling
  non-consumables and rejects for its absence. It belongs on the DEALS tab.
- **`owns()` must stop trusting localStorage alone.** Today entitlements live
  in `wardrobe.owned` under the `orthogonal:*` keys. Inside a WebView the OS
  can clear that, and a player who paid $9.99 and lost it to a storage sweep
  is a refund and a one-star review. The store's entitlement set becomes the
  source of truth at boot, and `wardrobe.owned` becomes a cache of it. This
  is the one architectural change the shop forces; everything else is a seam
  that already exists.

---

## The Steam grant

**$5.99, and it grants `pass_all` at boot.** Settled. The first reading of
this was $4.99 carrying NO LIMITS, which was coherent right up until you
notice that `owns()` grants the four paid characters from `pass_all` and not
from `pass_nolimits` - so that build would have shown four locked characters
with a BUY button behind a shop Steam does not have. The dead shelf, on the
one platform with no way to fix it. Granting everything removes it, and
`owns()` needs no new case at all.

One consequence to accept rather than discover: **`noLimits()` sends
`shards()` to 9999**, so the star economy is not a balance on Steam. Stars are
still earned and the five reward shapes are still earned by play - money never
buys those, on any platform - but the star shop stops being something you
choose *within*. The catalogue costing 253 against 189 earnable is a choice
mechanic on mobile and will not be one here.

If that turns out to matter when the Steam build is played, the fix is one
predicate: give `shards()` its own question instead of asking `noLimits()`,
so a Steam player gets every shape unlocked and a real star balance. Worth
knowing it is that cheap; not worth doing before anyone has played it.

### The other Steam tweaks

- **Achievements are already authored.** The five `reward:true` shapes, the
  Domino feat (two of the pack in one silhouette column), the four world
  clears and the four bosses are a 13-achievement list that needs mapping, not
  designing.
- **Steam Cloud** over the `orthogonal:*` keys. Those key names are every
  player's save and are never renamed, which makes them a stable sync target.
- **Gamepad.** The game has four verbs and they all funnel through `press`,
  `rotateView`, `doFlatten` and `doUnflatten`, so a pad is a fifth input
  bound at the same place a gesture is. That is the gate the controls doc
  promised.
- **Steam Deck**: 1280x800, which is exactly what `shot.js --desktop` already
  shoots. Verification wants a gamepad and legible text at that size.
- **Wrapper: Electron plus `steamworks.js`.** Tauri would ship a 10MB
  download against Electron's ~150MB, which is genuinely nicer, but its
  Steamworks path is less trodden and it runs on three different system
  WebViews. For a first Steam release on a fortnight's notice, the boring
  option is the right one. Revisit for v1.1.

---

## No Mac, and why that turns out not to matter

The hardware is an Android phone, an iPhone, and a Windows/Linux PC. No Mac.
There is a Mac belonging to a brother in Italy.

**Building for iOS requires macOS - that part is real and has no workaround.**
Capacitor produces an Xcode project and Xcode does not run anywhere else.
But building is the half that can be rented, and **testing is the half that
cannot** - and that is the half already owned. So the answer is a cloud Mac
for the build and the iPhone in the pocket for everything else.

- **Build on CI, not on a borrowed desk.** `Codemagic` runs the build on a
  Mac mini in a data centre, handles the certificates and provisioning
  profiles from an App Store Connect API key, and uploads straight to
  TestFlight. It has a free tier and it supports Capacitor directly.
  `GitHub Actions` macOS runners are the alternative and the repo is already
  on GitHub: 2000 free minutes a month on a private repo, but **macOS burns
  them at 10x**, so that is about 200 real macOS minutes - call it 16 to 25
  iOS builds a month, free, with overage at about \$0.062/minute. Either is
  fine. Codemagic first, because automatic code signing is the genuinely
  painful part of this and it is the part Codemagic does for you.
- **Then TestFlight onto the iPhone that is already here.** Once CI can
  produce a signed build, the whole device gauntlet happens on the owner's own
  phone with no Mac anywhere in the loop.
- **The brother's Mac is an escape hatch, not the pipeline.** It works once.
  What it cannot be is the thing every future hotfix depends on - a
  resubmission then needs another person, in another country, in another
  timezone, awake. Keep it for the one thing CI genuinely cannot do (below),
  and do not build the release process on it. Flying out to compile a build
  is not a plan.
- **The one thing a Mac is still wanted for**: Safari Web Inspector, which is
  how a WKWebView is debugged, and it only runs on macOS. See the gauntlet
  below for why this is smaller than it sounds.

### Steam is a Windows build, and that is normal

Electron cross-builds fine for Windows from the Windows PC. A macOS Steam
build would need a Mac again and the macOS share of Steam is tiny; skip it.
**Steam Deck runs the Windows build through Proton**, so Deck support costs
nothing extra. Linux native is optional and can wait for a v1.1.

---

## Before mobile: the device gauntlet

**Most of this can be done tonight, on the published URL, before any wrapper
exists.** The game is one HTML file served over https, so mobile Safari on
the owner's own iPhone answers the safe-area question, the two-finger turn
question and the audio-unlock question immediately and for free. What is left
for the WKWebView afterwards is small, which is what shrinks the Safari Web
Inspector problem down to something that can wait for a visit, an on-screen
debug overlay written into the game, or a paid Windows-side inspector.

From `ROADMAP.md`, and all of it needs a real phone rather than a simulator.

- ~~**Safe-area insets.**~~ **Done.** Four tokens in `css/00-base.css`
  (`--sat`/`--sar`/`--sab`/`--sal`), each an `env()` with a `0px` fallback,
  plus `viewport-fit=cover` in the viewport meta - without which the browser
  keeps the page inside the safe box and every inset reports 0. Checked by
  reading all eighteen touched declarations back: at zero insets every one is
  the constant it replaced, at a notched phone's 47/34/12 every one has moved
  by exactly that. **The trap, because it was walked into:** an override that
  RE-STATES an edge value needs its own inset, and six rules do - the coach in
  three layouts, the spoken cue in two, the map and the wardrobe as tall
  panels, the caption in two.
- ~~**The fonts were a progressive enhancement.**~~ **Done, and it was not on
  this list.** Both typefaces came from `fonts.googleapis.com`, so on a first
  run with no network every screen fell back to system faces - harmless on the
  web, and not what ships. They are now inline base64 woff2 in
  `css/05-fonts.css`, latin only, 70KB of font in 95KB of CSS, and **the game
  makes no outbound request of any kind**. With an ad SDK in the binary that
  no longer buys the clean Data Safety form it would have, but it still means
  anything on the wire is the SDK and never the game, which is the version of
  that sentence a reviewer can check. Refreshed by `tools/fonts.js`, **one
  request per weight**: a combined request returns the family's VARIABLE file
  and every weight then renders at the lightest, silently. The script throws
  rather than let that happen twice.
- **The audio unlock inside a WebView.** It hangs off the sting's full-bleed
  tap surface with `BEGIN` as a second chance behind it, which is the best
  shape this can have, and it has never run on a device.
- ~~**The two-finger turn on real glass.**~~ **Answered: it works.** Tested
  on an iPhone in mobile Safari - the camera turned and nothing zoomed, and
  the game ran smoothly. That was the riskiest of the three, because it is the
  one gesture that asks iOS to keep its hands off. The app is the easier case
  again: `zoomEnabled:false` in `capacitor.config.json` switches pinch-zoom off
  outright, which Safari would not let us do.
- ~~**Android's back button**~~ **Done in logic, unproven in a wrapper.**
  `backOut()` in `js/19-bindings.js` is Escape's order - close what is open
  before opening anything, never dismiss a card that is asking a question -
  with two rungs the keyboard does not need: the editor, out to MY LEVELS via
  the same two calls `#eLevels` makes, and the home screen, the one place a
  press may leave the app, on a second press inside two seconds. It is
  ordinary code returning whether it handled the press, so it was walked
  through every rung in a real page; the Capacitor listener that calls it is
  eight lines and cannot be tested until there is a wrapper.
- **Orientation.** `fitViewSize()` converts portrait and landscape
  differently and both work; the question is whether to lock or let it rotate.

---

## Store assets

`tools/shot.js` does the screenshots at every required size. The shot list
that sells this game: a mid-campaign level, the same level folded (`flat:N`,
which is the hook and the only image that explains the verb), a boss, a
trial, the map, the wardrobe, a cutscene beat and the neighbour mid-sentence.

- **iOS**: 1290x2796 and 1320x2868, plus iPad at 2064x2752 if iPad is
  supported. Icon 1024x1024.
- **Play**: 1080x1920, at least two and ideally eight. Icon 512x512.
- **Steam**: 1920x1080, at least five.

**The icon is done**: `node tools/icon.js` draws it from the game's own
palette - the Rose cube standing on a glowing seam, 3D on the left and
pressed flat on the right, with the far tower merging into the platform the
way the fold merges depth and a hunter waiting on it, bigger than the cube
and one square from it on the same row - and writes `app/icon/icon-1024.png` (iOS),
`app/icon/icon-512.png` (Play) and `app/icon/preview.png` (how it reads at
256, 128, 64 and 48, rounded). `--android` writes the launcher mipmaps into
the Android project, the adaptive foreground drawn full-bleed with the scene
at 2/3 so any mask lands on sky. Two other compositions are in the script as
`--variant B` (the seam leaning the other way) and `--variant C` (one huge
cube, no world), regenerable in a second.

**What the tool cannot make** is the artwork carrying a logotype: Play's
1024x500 feature graphic, which is mandatory, and Steam's capsule set
(460x215, 231x87, 616x353, 374x448, 600x900 and the 3840x1240 library hero).
That is six pieces of design work and it is the one item on this list that
should start early, because it is the only one that cannot be finished in an
afternoon by a script.

---

## What Monday actually needs

Two of the three accounts ask for more than a card number, and finding that
out on the day is how a clock starts late.

**THE NAME IS SETTLED: `Nadaz Games` wherever it is free, the owner's own
legal name where it is not.** He does not mind his name being on it, so no
paperwork gets bought just to hide it. What that means per store:

- **Steam: free.** Developer and Publisher are per-app text fields in
  Steamworks. `Nadaz Games` costs nothing and needs no entity.
- **Apple: not free.** The App Store shows the enrolment's name, so a studio
  name means an **organization** enrolment, which needs a D-U-N-S number
  registered to a legal entity. So Apple ships under his own name unless he
  decides to register a business for its own reasons - and the D-U-N-S queue
  below stops being the first thing on Monday.
- **Play: check it on the day.** The developer display name is a field, but
  Google verifies developer identity and what a personal account may display
  has moved more than once. Worth five minutes in the Console rather than a
  guess here.
- **The bundle id is free everywhere and permanent, so it carries the name
  whatever the stores decide**: `com.nadazgames.imjustacube`, the same string
  as the Android `applicationId` and the iOS bundle id. Decide nothing else
  about it later; it cannot be changed after the first upload.
- **The game itself says the studio name nowhere.** The sting is the cube and
  `tap to fold`, and there is no logotype anywhere in `index.html`. If
  `NADAZ GAMES` should appear on the sting, that is a UI job and a cheap one -
  it is the one place in the game a studio name belongs.

- **Apple: individual or organization, and it is not a small choice.** An
  individual enrolment needs no D-U-N-S number and is the fast path, but the
  App Store then lists the developer under the owner's own legal name.
  An organization enrolment shows a company name and **requires a D-U-N-S
  number registered to the legal entity** - free, but Dun & Bradstreet take up
  to 5 business days to issue one, which is most of week one. **If the game
  should ship under a studio name rather than a person's name, request the
  D-U-N-S number first thing Monday**, before anything else on this list,
  because it is the only item here with a queue in front of it.
- **All three want banking and tax details before they will pay out.** A
  non-US developer files a W-8BEN with Apple and with Valve, and Play wants a
  payments profile. None of it blocks *submitting*, all of it blocks being
  paid, and all of it is faster to do while waiting for a review than to
  discover at launch.
- **The privacy policy has to exist before the listings do**, not after: both
  stores ask for the URL in the listing form, and Play's Data Safety
  declaration is checked against what it says.
- **Steam's $100 is per app and recoupable** - Valve credits it back once the
  game has earned $1,000. It is a deposit more than a fee.

---

## The fortnight

Ordered so that the three clocks start on day one and the deferrable work is
deferred to the platform that cannot use it early anyway.

**Week 1 - start the clocks, then wrap**

| Day | |
|---|---|
| Mon 14 | **All three accounts, before anything else.** Play ($25), Apple ($99), Steam Direct ($100, starts the 30-day wait). Draft and host the privacy policy. See **What Monday actually needs** below - two of the three ask for more than a card number. |
| Sun 13 | **Tonight, free**: open the published artifact on the iPhone and the Android phone and walk the gauntlet in the browser. Safe areas, the two-finger turn, the audio unlock. No wrapper, no account, no build - and it de-risks the least-known part of the fortnight before it starts. |
| Mon 14 | Capacitor wrap around `build-single.js`'s output. One HTML file and three.js is genuinely a day's work. |
| Mon 14 | Codemagic connected to the repo, building the iOS target on a cloud Mac. No Mac is needed for this or for anything after it. |
| Tue 15 | **Signed Android build into the CLOSED track, ads and shop absent.** The move that saves a week: the clock starts now and the build keeps updating under it. Recruit the 12 testers the same day, and send them the closed opt-in link - internal testing does not count and actively blocks a tester from the closed test. |
| Tue 15 - Thu 17 | The device gauntlet: safe areas, audio unlock, the two-finger turn, the back button. Needs a phone in hand. |
| Thu 17 | `adChild()`. One predicate; the intro card does not change. An hour. |
| Thu 17 - Fri 18 | AdMob behind the four hooks, rewarded only, child-directed from `adChild()`. |
| Fri 18 - Sun 20 | IAP: seven products, one `purchase()` seam, RESTORE PURCHASES, and `owns()` reading the store's entitlements rather than localStorage. |

**Week 2 - assets, submit, and Steam's paperwork**

| Day | |
|---|---|
| Mon 21 | Store assets out of `shot.js` at every size. Start the logotype artwork, which is the long pole. |
| Tue 22 | The four declarations in one sitting: Play target audience, Play Data Safety, Apple age rating, Apple privacy labels. |
| Wed 23 | **iOS submitted.** |
| Wed 23 - Thu 24 | Steam store page and the "coming soon" page, so its two weeks of visibility run inside the 30-day wait rather than after it. |
| Thu 24 - Sun 27 | Electron wrap, `pass_all` grant, the 13 achievements, Steam Cloud, gamepad. Nothing here has to be finished this week. |
| ~Sun 28 | Play's 14 days are up; apply for production access. |
| ~Tue 13 Oct | Earliest possible Steam release. |

**What slips first, by design**: everything in the last row. Steam cannot
release before 13 Oct, so its code has two clear weeks after this fortnight
and should take them rather than crowd the two submissions that are real.
