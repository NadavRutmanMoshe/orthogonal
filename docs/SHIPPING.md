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
- **Steam is $4.99 and carries the NO LIMITS pass**, so there are no ads in
  the Steam build at all. See **The Steam grant** below for the one thing this
  leaves dangling.
- **The shop is wired for v1.0.** StoreKit 2 and Play Billing, real products,
  not a shelf with disabled buttons on it.

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

### 1. The age card becomes the neutral age screen, by splitting one band

Google Play requires a **neutral age screen** on a mixed-audience app: it must
ask age in a way that does not encourage misrepresentation, must not be
trivially bypassable into adult treatment, and its answer must persist.

The intro card is most of the way there already, and by accident of a decision
taken for other reasons. **Nothing on the card says what a band sets** - that
was the owner's call about not explaining three settings to somebody who has
not played yet, and it is also exactly what makes the screen neutral: a player
who wants the big board cannot know which band to lie into. The answer
persists too, in the band id that `ageBandOf()` reads back.

**What is missing is one band.** `AGE_BANDS` opens `UNDER 18`, and the line
that matters to every ad network and every privacy regime is **13**, not 18.
So:

- Split `u18` into **UNDER 13** and **13 - 17**. Both keep the same three
  settings, so nothing about how the game plays changes and the card stays one
  question.
- **I'D RATHER NOT SAY means under 13**, for ad purposes only. Unknown age is
  treated as a child everywhere in this area, and the difficulty bands it
  swaps in carry no age at all, so there is nothing else it could honestly
  mean.
- One predicate, `adChild()`, over the stored band. It is read by the ad
  initialisation and by nothing else.

This is the whole compliance change to the game itself, and it is small
because the card was already right.

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
for the $5.49 upgrade**. Neither store has a native "cheaper if you already
own that one" for non-consumables, so `dealPrice()`'s answer has to map to a
different product id rather than a different price on the same one. The
pricing logic is already correct and already single-sourced; it needs one
more id beside the number.

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

## The Steam grant, and the thing it leaves dangling

$4.99 buying NO LIMITS is coherent and it is what the pass costs today. Two
consequences worth being deliberate about rather than discovering:

- **`noLimits()` sends `shards()` to 9999**, so the star economy is not a
  balance on Steam. Stars are still earned and the reward shapes are still
  earned by play, but the star shop stops being a thing you choose within. The
  catalogue costing 253 against 189 earnable was a choice mechanic; on Steam
  it will not be one. That is a fair trade for a paid game and it should be a
  decision rather than a surprise.
- **NO LIMITS does not include the four paid shapes.** `owns()` grants those
  from `pass_all`, not from `pass_nolimits`. So a Steam build granted only NO
  LIMITS shows four locked characters with a BUY button behind no shop - the
  dead shelf, on the one platform that has no way to fix it.

  **Recommendation: grant `pass_all` and keep the $4.99 price.** What a store
  charges and what the build grants are separate decisions, the generous one
  removes the dead shelf entirely, and `owns()` needs no new case. The
  alternative is selling the shapes as Steam DLC, which is a second storefront
  product for four cosmetics and is not worth the paperwork.

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

## Before mobile: the device gauntlet

From `ROADMAP.md`, and all of it needs a real phone rather than a simulator.

- **Safe-area insets.** The control bar sits at `bottom: 18px` and will land
  under the iPhone home indicator. `env(safe-area-inset-bottom)` is used in
  exactly one place today (`css/98-story.css`, the skip button).
- **The audio unlock inside a WebView.** It hangs off the sting's full-bleed
  tap surface with `BEGIN` as a second chance behind it, which is the best
  shape this can have, and it has never run on a device.
- **The two-finger turn on real glass.** iOS ignores `user-scalable=no`;
  `touch-action:none` on the body is what should hold it. This is the one
  gesture that asks iOS to keep its hands off, and it is unproven.
- **Android's back button** needs binding to the panel stack, or it exits the
  game from the middle of a level.
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

**What the tool cannot make** is the artwork carrying a logotype: Play's
1024x500 feature graphic, which is mandatory, and Steam's capsule set
(460x215, 231x87, 616x353, 374x448, 600x900 and the 3840x1240 library hero).
That is six pieces of design work and it is the one item on this list that
should start early, because it is the only one that cannot be finished in an
afternoon by a script.

---

## The fortnight

Ordered so that the three clocks start on day one and the deferrable work is
deferred to the platform that cannot use it early anyway.

**Week 1 - start the clocks, then wrap**

| Day | |
|---|---|
| Mon 14 | **All three accounts, before anything else.** Play ($25), Apple ($99), Steam Direct ($100, starts the 30-day wait). Draft and host the privacy policy. |
| Mon 14 | Capacitor wrap around `build-single.js`'s output. One HTML file and three.js is genuinely a day's work. |
| Tue 15 | **Signed Android build into closed testing, ads and shop absent.** This is the move that saves a week: the 14-day clock starts now and the build keeps updating under it. Recruit the 12 testers the same day. |
| Tue 15 - Thu 17 | The device gauntlet: safe areas, audio unlock, the two-finger turn, the back button. Needs a phone in hand. |
| Thu 17 | The age band split and `adChild()`. Half a day. |
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
