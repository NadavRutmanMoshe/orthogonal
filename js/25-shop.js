"use strict";
/* I'm Just A Cube - 25-shop.js
   The DEALS shelf, charged for real: Google Play Billing on Android and
   StoreKit 2 on iOS, both through @capgo/native-purchases. Loaded before
   21-boot.js, like 24-ads.js, so boot starts it.

   WHAT A PURCHASE IS, HERE. Every product is a one-time, non-consumable
   unlock: you buy it once and own it forever, on every phone signed in to
   the same store account. The product ids in the two store dashboards ARE
   the game's own ids - `rook`, `pup`, `cat`, `robot`, `pass_nolimits`,
   `pass_all` - plus `pass_all_upgrade`, the discounted EVERYTHING
   (docs/SHIPPING.md, "three products showing two"). No mapping table: an id
   typed into Play Console is the id in SKIN_SHAPES or PASSES.

   THE STORE IS THE TRUTH AND `wardrobe.owned` IS A COPY OF IT. Paid items
   used to live in localStorage alone, and inside a WebView the OS may clear
   that - a player who paid and lost it to a storage sweep is a refund and a
   one-star review. So on every launch the store is asked what this account
   owns and anything missing is written back. RESTORE PURCHASES asks the
   same question on demand, for a new phone.

   IT ONLY EVER ADDS. A store that fails to answer - no network, Play not
   signed in - answers with an EMPTY LIST on Android, which is identical to
   "owns nothing". Removing items on that answer would strip a paying player
   on a train. The price of that caution is that a refunded item stays
   unlocked; for a one-time cosmetic that is the right way round.

   NO SERVER CHECKS THE RECEIPT. iOS verifies every transaction on the phone
   (StoreKit 2 signs them); Android has no such check without a server, so a
   rooted phone can fake a purchase. That was the trade taken for going
   direct rather than through a service, and for $2.99 unlocks it is the
   usual one. */

var SHOP_UPGRADE="pass_all_upgrade";

/* The plugin, or null in a browser - and null is what greys out every BUY
   button on the DEALS shelf and hides RESTORE PURCHASES. capPlugin() is the
   one copy of this lookup and the paragraph explaining it is at the back
   button in js/19-bindings.js. */
var shopPlug;
function shopPlugin(){
  if(shopPlug!==undefined)return shopPlug;
  shopPlug=capPlugin("NativePurchases");
  return shopPlug;
}
function shopOS(){return window.Capacitor&&window.Capacitor.getPlatform();}

/* prices: what each store says a product costs, in the player's own
   currency ("₪11.90", "4,99 €"). Filled at boot; until it is, and in a
   browser, the shelf prints the dollar price written in PASSES/SKIN_SHAPES.
   busy:   a purchase or a restore is on screen. */
var SHOP={prices:{}, busy:false, busyT:0};

/* A PURCHASE THAT NEVER ANSWERS MUST NOT WEDGE THE SHELF, and this one can.

   `purchaseProduct` resolves ONLY from the plugin's PurchasesUpdatedListener,
   and Play calls that listener only if the billing flow actually launched.
   The plugin launches it like this (NativePurchasesPlugin.java):

       BillingResult r = billingClient.launchBillingFlow(getActivity(), params);
       Log.d(TAG, "Billing flow launch result: " + r.getResponseCode() + …);

   The result is LOGGED AND DROPPED. A flow that refuses to launch -
   ITEM_UNAVAILABLE, DEVELOPER_ERROR, BILLING_UNAVAILABLE, which is what an
   account that may not buy this build gets - never reaches the listener, so
   the call is never resolved and never rejected. The promise hangs for the
   life of the app.

   Nothing in JS can see that, so the only defence is a clock. Same shape as
   adBusy() in js/24-ads.js, and for the same reason: busy is what stops two
   taps racing, so anything that can set it and never clear it takes the
   whole shelf down with it - every BUY frozen at ONE MOMENT, RESTORE
   disabled, until the app is killed.

   ON THE WAY OUT IT ASKS THE STORE RATHER THAN GUESSING. A hang is not proof
   that nothing was charged: the sheet may have taken the money and the
   answer may be what got lost. So the timeout re-syncs and reports what the
   store actually says, and only says nothing was charged when the store
   agrees. Long, because a real payment sheet is slow - a card to type in, a
   parent to approve. */
var SHOP_STUCK_MS=180000;
function shopBusy(on){
  SHOP.busy=on;
  clearTimeout(SHOP.busyT);
  if(on)SHOP.busyT=setTimeout(shopUnwedge,SHOP_STUCK_MS);
  shopRedraw();
}
function shopUnwedge(){
  if(!SHOP.busy)return;
  SHOP.busy=false;shopRedraw();
  shopSync().then(function(got){
    if(got.length){SFX.key();flash(shopNames(got)+" unlocked");}
    else flash("the store didn't answer · nothing was charged");
    shopRedraw();
  });
}

function shopDeals(){return PASSES.concat(SKIN_SHAPES.filter(isDeal));}
function shopKnown(pid){
  if(pid===SHOP_UPGRADE)return true;
  var d=shopDeals();
  for(var i=0;i<d.length;i++)if(d[i].id===pid)return true;
  return false;
}
/* WHICH PRODUCT THIS BUTTON SELLS. Only EVERYTHING has two: the full price,
   or the upgrade once NO LIMITS is owned. dealPrice() already made the same
   choice for the number; this makes it for the id. */
function shopProductFor(it){
  return (it.id==="pass_all"&&it.needs&&hasPass(it.needs))?SHOP_UPGRADE:it.id;
}
/* WHAT A BOUGHT PRODUCT UNLOCKS. The upgrade unlocks EVERYTHING itself, so
   `hasPass("pass_all")` and `owns()` need to know nothing about it - the
   upgrade id never reaches wardrobe.owned at all. */
function shopUnlocks(pid){return pid===SHOP_UPGRADE?"pass_all":pid;}

/* The price to print, and the struck-through one beside it when the upgrade
   is on offer. Store prices where the store has said, dollars otherwise. */
function shopPrice(it){
  return SHOP.prices[shopProductFor(it)]||("$"+dealPrice(it));
}
function shopWas(it){
  if(shopProductFor(it)===it.id)return null;
  return SHOP.prices[it.id]||("$"+it.usd);
}

function shopRedraw(){
  if(panelKind==="wardrobe"&&panelOpen())wardRefresh();
}

/* ============================================================
   ON LAUNCH: prices, then what this account already owns
   ============================================================ */
function shopBoot(){
  var P=shopPlugin();
  if(!P)return;
  /* A purchase that finishes AWAY from the button: a parent approving Ask
     to Buy hours later, a pending card payment clearing. iOS reports those
     here; Android reports them at the next launch's shopSync. */
  P.addListener("transactionUpdated",function(t){
    var got=shopTake([t]);
    if(got.length)flash(shopNames(got)+" unlocked");
  });
  var ids=shopDeals().map(function(d){return d.id;}).concat([SHOP_UPGRADE]);
  P.getProducts({productIdentifiers:ids,productType:"inapp"})
    .then(function(r){
      (r&&r.products||[]).forEach(function(p){
        if(p&&p.identifier&&p.priceString)SHOP.prices[p.identifier]=p.priceString;
      });
      shopRedraw();
    })
    .catch(function(){});
  shopSync();
}
/* Ask the store what is owned and write in anything that is missing.
   Resolves with the ids that were newly unlocked. */
function shopSync(){
  var P=shopPlugin();
  if(!P)return Promise.resolve([]);
  return P.getPurchases({productType:"inapp"})
    .then(function(r){return shopTake(r&&r.purchases||[]);})
    .catch(function(){return [];});
}
/* IS THIS TRANSACTION SOMETHING OWNED RIGHT NOW. Android: purchaseState "1"
   is PURCHASED and "2" is PENDING - a card payment that has not cleared, which
   must not unlock anything yet. iOS: a refunded transaction carries a
   revocationDate. */
function shopLive(t){
  if(!t||!shopKnown(t.productIdentifier))return false;
  if(t.purchaseState!=null&&String(t.purchaseState)!=="1")return false;
  if(t.revocationDate)return false;
  return true;
}
function shopTake(list){
  var got=[], acks=[];
  list.forEach(function(t){
    if(!shopLive(t))return;
    var id=shopUnlocks(t.productIdentifier);
    if(wardrobe.owned.indexOf(id)<0){wardrobe.owned.push(id);got.push(id);}
    if(t.isAcknowledged===false&&t.purchaseToken)acks.push(t.purchaseToken);
  });
  if(got.length){saveWardrobe();shopRedraw();}
  shopAck(acks);
  return got;
}
/* ANDROID REFUNDS A PURCHASE NOBODY ACKNOWLEDGED WITHIN THREE DAYS. The
   plugin acknowledges on the purchase itself, but a purchase that was
   pending then (or that the app was killed during) arrives here
   unacknowledged. One at a time, because the plugin tears its billing
   connection down and rebuilds it for each. */
function shopAck(tokens){
  var P=shopPlugin();
  tokens.reduce(function(p,tok){
    return p.then(function(){
      return P.acknowledgePurchase({purchaseToken:tok}).catch(function(){});
    });
  },Promise.resolve());
}
/* HAS ANYTHING ON THE MONEY SHELF EVER BEEN BOUGHT, as far as this install
   knows. It reads `wardrobe.owned` directly rather than `owns()`, and that is
   the point: owns() answers yes for every paid shape once EVERYTHING is held,
   by rule, so it would call a pass-holder an owner of four things nobody
   bought individually. What this question is really asking is "did money
   change hands on this account", and the ids actually written into the
   wardrobe are the record of that. */
function shopOwnsAny(){
  var d=shopDeals();
  for(var i=0;i<d.length;i++)
    if(wardrobe.owned.indexOf(d[i].id)>=0)return true;
  return false;
}
function shopNames(ids){
  var d=shopDeals();
  return ids.map(function(id){return findBy(d,id).name;}).join(" · ");
}

/* ============================================================
   BUY
   ============================================================ */
function shopBuy(it){
  var P=shopPlugin();
  if(!P)return;
  if(SHOP.busy){flash("the store is still working on the last one");return;}
  var pid=shopProductFor(it);
  shopBusy(true);
  P.purchaseProduct({productIdentifier:pid,productType:"inapp",quantity:1})
    .then(function(t){
      shopBusy(false);
      shopTake([t]);
      if(owns(it.id)||hasPass(it.id)){
        // You paid for a shape; wear it, the way a star purchase does.
        if(!isPass(it))wardEquip("deal",it.id);
        SFX.key();flash(it.name+" unlocked");
      }
      shopRedraw();
    },function(e){
      shopBusy(false);
      var m=String(e&&e.message||e);
      /* A pending payment is not a failure: it unlocks when it clears. */
      if(/pending/i.test(m)){
        flash("payment pending · it unlocks when it clears");
        shopRedraw();return;
      }
      /* ALREADY OWNED IS THE OTHER REASON A PURCHASE FAILS - the store
         refuses to sell it twice, and on Android that arrives as the same
         error as a cancel. So ask the store before saying anything: if it
         turns out to be owned, the player gets their item, not an error. */
      shopSync().then(function(got){
        if(got.length){SFX.key();flash(shopNames(got)+" restored");}
        else if(!/cancel/i.test(m))flash("no purchase made");
        shopRedraw();
      });
    });
}

/* ============================================================
   RESTORE PURCHASES

   APPLE REJECTS AN APP THAT SELLS UNLOCKS WITHOUT THIS BUTTON. On iOS it
   first asks the App Store to sync (which may ask the player to sign in),
   then reads what is owned. On Android the read alone is the whole restore:
   Play already knows the account, and the plugin's own restore call races
   the read for the same billing connection.
   ============================================================ */
function shopRestore(){
  var P=shopPlugin();
  if(!P)return;
  if(SHOP.busy){flash("the store is still working on the last one");return;}
  /* Where the press came from, taken NOW rather than when the store answers:
     the card below takes over the one shared #panel, so GOT IT has to be
     able to put the player back on the sheet they were reading, scrolled to
     the row they pressed. */
  var from=panelKind, pb=$("panel").querySelector(".pbody"),
      top=pb?pb.scrollTop:0;
  shopBusy(true);
  flash("checking your purchases …");
  var first=shopOS()==="ios"
    ? P.restorePurchases().catch(function(){})
    : Promise.resolve();
  first.then(shopSync).then(function(got){
    shopBusy(false);
    /* THREE ANSWERS, NOT TWO, because "nothing to restore" was being read as
       "the button is broken" - and fairly, since it is what a dead button
       would say. shopSync() returns only what was MISSING and has now been
       added, so the ordinary case for somebody who has just bought something
       is an empty list, and the honest thing to say is not "nothing" but
       "they are already here". The third case is the one where nothing was
       ever bought on this account, which is a different fact and the only
       one where a player should go looking for a different store account.

       Something coming back is its own explanation, so it stays a toast.
       The two cases where nothing visibly happens get a card instead (see
       shopRestoreCard) - unless the player has already left the sheet they
       pressed it on, when a card would appear out of nowhere and the toast
       is the polite way to answer a question they have moved on from. */
    if(got.length){SFX.key();flash("restored · "+shopNames(got));shopRedraw();return;}
    var owned=shopOwnsAny();
    if(panelKind===from&&panelOpen())shopRestoreCard(owned,from,top);
    else flash(owned?"nothing new · your purchases are already here"
                    :"no purchases found on this store account");
  });
}
/* WHAT RESTORE PURCHASES IS, SAID ONCE, AT THE MOMENT IT LOOKS BROKEN.

   Reported by the owner the first time he pressed it: it said "nothing to
   restore", which he read - fairly - as a dead button, and he had no idea
   what the button was FOR. Both are the same gap. Nobody reads an
   explanation before pressing a button, but everybody wants one when the
   button seems to have done nothing, so that is exactly when this appears.

   The TITLE is what happened, the LEAD is what it means for you, and the
   note under the rule is what the button is for - in that order, because
   that is the order the questions come in. The store is named, because
   "your account" means nothing until it is "your Google Play account".
   It deliberately gives no step-by-step for switching accounts: that path
   is different on every Android skin and every iOS version, and a wrong
   instruction is worse than none. */
function shopRestoreCard(owned,from,top){
  var store=shopOS()==="ios"?"App Store":"Google Play";
  offerShell("Restore purchases",
    owned?"Already here":"Nothing to restore",
    owned?"Everything you've bought is on this phone already."
         :"We didn't find any purchases on the "+store+" account signed in "+
          "on this phone. Bought them on a different account? Sign in to "+
          "that one and try again.",
    "<button class='qt' id='rsOk'>GOT IT</button>",
    "Purchases belong to your "+store+" account, not to this phone. If you "+
    "reinstall the game or move to a new phone, they come back on their own "+
    "when it starts - this button just asks "+store+" again.");
  bind("rsOk",function(){
    if(from==="menu"){
      menuPanel();
      var b=$("panel").querySelector(".pbody");
      if(b)b.scrollTop=top;
    }
    else if(from==="wardrobe")wardrobePanel("deal");
    else hidePanel();
  });
}
