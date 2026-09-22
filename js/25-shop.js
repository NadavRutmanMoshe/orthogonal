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
var SHOP={prices:{}, busy:false};

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
function shopNames(ids){
  var d=shopDeals();
  return ids.map(function(id){return findBy(d,id).name;}).join(" · ");
}

/* ============================================================
   BUY
   ============================================================ */
function shopBuy(it){
  var P=shopPlugin();
  if(!P||SHOP.busy)return;
  var pid=shopProductFor(it);
  SHOP.busy=true;shopRedraw();
  P.purchaseProduct({productIdentifier:pid,productType:"inapp",quantity:1})
    .then(function(t){
      SHOP.busy=false;
      shopTake([t]);
      if(owns(it.id)||hasPass(it.id)){
        // You paid for a shape; wear it, the way a star purchase does.
        if(!isPass(it))wardEquip("deal",it.id);
        SFX.key();flash(it.name+" unlocked");
      }
      shopRedraw();
    },function(e){
      SHOP.busy=false;
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
  if(!P||SHOP.busy)return;
  SHOP.busy=true;shopRedraw();
  flash("checking your purchases …");
  var first=shopOS()==="ios"
    ? P.restorePurchases().catch(function(){})
    : Promise.resolve();
  first.then(shopSync).then(function(got){
    SHOP.busy=false;
    if(got.length){SFX.key();flash("restored · "+shopNames(got));}
    else flash("nothing to restore · all up to date");
    shopRedraw();
  });
}
