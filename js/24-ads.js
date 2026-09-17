"use strict";
/* I'm Just A Cube - 24-ads.js
   Rewarded video, and nothing else: no banners, no interstitials
   (docs/SHIPPING.md). Loaded BEFORE 21-boot.js, like 20-splash.js, so boot
   can start it the way it starts everything else and no call into it needs a
   typeof guard.

   HOW AN AD GETS FROM GOOGLE TO A HINT. The game is a web page inside a
   WebView and cannot reach Google's ad code, which is Java on Android and
   Swift on iOS. The @capacitor-community/admob plugin puts that code in the
   app and answers a handful of calls from here - initialize, prepare a
   video, show it - and it reports back through events. This file turns that
   into ONE question the rest of the game asks: `adWatch(done)`, where done
   is called with true only when a video was watched to the end. Every ad
   button in the game is `adWatch(function(ok){ if(ok) grantSomething(); })`.

   IN A BROWSER THERE IS NO PLUGIN, and adWatch pays out on the spot, which
   is exactly what every ad button did before this file existed. So the
   artifact and itch.io play as they always have, and only the phone app
   plays a video. */

/* ============================================================
   THE AD UNITS

   AD_TEST IS TRUE UNTIL THE ADMOB ACCOUNT EXISTS, and the ids below are
   Google's own public test units: they always fill, they always pay out, and
   nobody is paid for them. Tapping your OWN live ads is how AdMob accounts
   get banned, which is why the switch to real ids is a deliberate edit and
   not something that happens on its own. Going live is three lines here and
   one in AndroidManifest.xml (the app id); tools/build-app.js warns on every
   build while this is still true, so it cannot ship by accident unnoticed.
   ============================================================ */
var AD_TEST=true;
var AD_UNITS={
  android:{test:"ca-app-pub-3940256099942544/5224354917", live:""},
  ios:    {test:"ca-app-pub-3940256099942544/1712485313", live:""}
};
/* How long a tap waits for a video that was not already loaded before it
   gives up and says so. Long enough for a slow connection, short enough that
   nobody thinks the button is broken. */
var AD_WAIT_MS=9000;

/* WHO IS A CHILD, FOR ADS AND NOTHING ELSE. Anybody who did not pick an
   explicitly adult band: UNDER 18, the three I'D RATHER NOT SAY answers, and
   a save with no band at all. The default fails towards the child side on
   purpose - see "Mixed audience" in docs/SHIPPING.md. A child gets
   non-personalised ads, no advertising id sent, and no consent form. */
function adChild(){
  var b=settings.ageBand;
  return b!=="a18"&&b!=="a26"&&b!=="a40"&&b!=="a60";
}

/* The plugin, or null in a browser. registerPlugin rather than
   Capacitor.Plugins.AdMob, for the reason written at the back button in
   js/19-bindings.js: with no bundler the plugin's own module never runs, so
   Plugins.AdMob is always empty. */
var adPlug;
function adPlugin(){
  if(adPlug!==undefined)return adPlug;
  var C=window.Capacitor;
  adPlug=(C&&C.isNativePlatform&&C.isNativePlatform()&&
          C.isPluginAvailable&&C.isPluginAvailable("AdMob")&&
          typeof C.registerPlugin==="function")
    ? C.registerPlugin("AdMob") : null;
  return adPlug;
}
function adUnit(){
  var u=AD_UNITS[window.Capacitor.getPlatform()]||AD_UNITS.android;
  return AD_TEST?u.test:u.live;
}

/* started: the promise of initialize, once it has been asked for.
   ready:   a video is loaded and can be shown right now.
   busy:    a tap is being served; a second tap is ignored until it is done.
   done:    the callback of the video on screen, until it closes. */
var AD={started:null, heard:false, consent:null, ready:false, loading:null,
        busy:false, done:null, earned:false, closed:false, failed:false,
        graceT:0, retry:0, retryT:0};

/* ============================================================
   STARTING

   NOT BEFORE THE AGE QUESTION IS ANSWERED. The child flags are handed to
   Google once, at initialize, so starting before the intro card would start
   everybody as a child - harmless, but it would never be corrected for the
   adults. Boot starts it for a save (adBoot), and applyAgeBand() starts it
   the moment a first-run player picks a band. The manifest's
   DELAY_APP_MEASUREMENT_INIT is what stops the SDK sending anything on its
   own before then.

   CONSENT FIRST. In the EU, the UK and Switzerland, Google will not serve a
   personalised ad without a consent form from a certified provider, and the
   plugin carries Google's own (UMP). requestConsentInfo only ASKS whether a
   form is needed - it shows nothing. The form itself waits for the first
   tap on an ad button, so it never lands on top of the opening cutscene.
   Until the form is set up in the AdMob dashboard this simply answers "not
   required", which is fine for testing.
   ============================================================ */
function adBoot(){
  if(!adPlugin())return;
  // A first run is still on the age card; applyAgeBand() will start it.
  if(!settings.ageBand&&nothingBehind())return;
  // Off the launch path: the SDK's own start-up is not free on a phone.
  setTimeout(adStart,3000);
}
function adStart(){
  var A=adPlugin();
  if(!A)return Promise.resolve(false);
  if(AD.started)return AD.started;
  var child=adChild();
  if(!AD.heard){
    AD.heard=true;
    A.addListener("onRewardedVideoAdReward",adEarned);
    A.addListener("onRewardedVideoAdDismissed",adClosed);
    A.addListener("onRewardedVideoAdFailedToShow",adFailed);
  }
  AD.started=A.requestConsentInfo({tagForUnderAgeOfConsent:child})
    .catch(function(){return null;})
    .then(function(info){
      AD.consent=info;
      return A.initialize({
        tagForChildDirectedTreatment:child,
        tagForUnderAgeOfConsent:child,
        /* G for everybody, not only for children: a parent's phone set to
           an adult band is still handed to a child, and this is a game both
           of them play. One word to change if it ever needs to be. */
        maxAdContentRating:"General",
        initializeForTesting:AD_TEST
      });
    })
    .then(function(){
      if(!adConsentPending())adLoad();
      return true;
    })
    .catch(function(){
      AD.started=null;           // a later tap tries again from the start
      return false;
    });
  return AD.started;
}
function adConsentPending(){
  var c=AD.consent;
  return !!(c&&c.status==="REQUIRED"&&c.isConsentFormAvailable);
}
function adConsentAsk(){
  if(!adConsentPending())return Promise.resolve();
  return adPlugin().showConsentForm()
    .then(function(info){AD.consent=info;},function(){AD.consent=null;});
}
/* GDPR also wants a way to change your mind later. Google says whether this
   player needs one; the settings sheet shows AD PRIVACY only when it does. */
function adPrivacyNeeded(){
  return !!(adPlugin()&&AD.consent&&
            AD.consent.privacyOptionsRequirementStatus==="REQUIRED");
}
function adPrivacyShow(){
  if(!adPrivacyNeeded())return;
  adPlugin().showPrivacyOptionsForm().catch(function(){});
}

/* ============================================================
   LOADING

   A video is loaded BEFORE anybody asks for one, and another is loaded the
   moment one closes, so a tap normally shows a video at once instead of
   after a few seconds of nothing. A failed load (no network, or simply no
   ad to give) tries again later, backing off from 15s to 5 min.
   ============================================================ */
function adLoad(){
  var A=adPlugin();
  if(!A||AD.ready)return Promise.resolve(AD.ready);
  if(AD.loading)return AD.loading;
  clearTimeout(AD.retryT);
  AD.loading=A.prepareRewardVideoAd({adId:adUnit(), isTesting:AD_TEST,
                                     npa:adChild()})
    .then(function(){AD.ready=true;AD.retry=0;return true;},
          function(){
            AD.ready=false;
            AD.retryT=setTimeout(adLoad,Math.min(300000,15000*Math.pow(2,AD.retry++)));
            return false;
          })
    .then(function(ok){AD.loading=null;return ok;});
  return AD.loading;
}
function adWithin(p,ms){
  return new Promise(function(res){
    var t=setTimeout(function(){res(false);},ms);
    p.then(function(ok){clearTimeout(t);res(ok);},
           function(){clearTimeout(t);res(false);});
  });
}

/* ============================================================
   SHOWING

   THE PLUGIN ONLY ANSWERS A VIDEO THAT PAID. showRewardVideoAd() resolves
   when the reward is earned and never settles at all when the player closes
   the video early - so waiting on it alone leaves the button stuck for
   good. The two events are the truth instead: REWARD says it was earned,
   DISMISSED says it closed, and the payout happens on the close, when the
   game is back on screen to show it.

   THE TWO CAN ARRIVE IN EITHER ORDER. Android sends the reward first; iOS
   has been seen to send it just after the close. So a close with no reward
   yet waits a moment before deciding nothing was earned.

   THE GAME'S SOUND STOPS WHILE A VIDEO PLAYS, or the ad and the game talk
   over each other.
   ============================================================ */
function adWatch(done){
  if(!adPlugin()){done(true);return;}
  if(AD.busy)return;
  AD.busy=true;
  adStart()
    .then(adConsentAsk)
    .then(function(){
      if(AD.ready)return true;
      flash("loading a video …");
      return adWithin(adLoad(),AD_WAIT_MS);
    })
    .then(function(ok){
      if(!ok){
        AD.busy=false;
        flash("no video to show right now · try again in a minute");
        done(false);
        return;
      }
      AD.done=done;AD.earned=false;AD.closed=false;AD.failed=false;
      AD.ready=false;
      adQuiet(true);
      adPlugin().showRewardVideoAd().then(adEarned,adFailed);
    });
}
function adFailed(){
  AD.failed=true;
  adClosed();
}
function adEarned(){
  AD.earned=true;
  if(AD.closed)adSettle();
}
function adClosed(){
  if(!AD.done||AD.closed)return;
  AD.closed=true;
  if(AD.earned)adSettle();
  else AD.graceT=setTimeout(adSettle,700);
}
function adSettle(){
  clearTimeout(AD.graceT);
  var done=AD.done;
  if(!done)return;
  AD.done=null;AD.busy=false;AD.closed=false;
  adQuiet(false);
  adLoad();                       // the next one, before anybody asks
  if(AD.earned)done(true);
  else{
    flash(AD.failed?"the video didn't play · try again"
                   :"closed early · nothing earned");
    done(false);
  }
}
function adQuiet(on){
  if(!actx)return;
  try{ if(on)actx.suspend(); else actx.resume(); }catch(e){}
}

/* ============================================================
   THE UNLOCKS THAT COST MORE THAN ONE VIDEO

   A world is three videos and a boss on the map is three, and nobody should
   have to watch three in one sitting to get any of it. So each video is
   counted against what it is buying, the count is kept, and the button says
   how many are left. The wardrobe already did this for its items
   (`wardrobe.ads`, grantAdView); this is the same idea for everything that
   opens a level. Keys are "world:" or "level:" plus the level's name - a
   name, never an index, for the reason LEVEL_RENAMES exists.
   ============================================================ */
var ADTALLY_KEY="orthogonal:adtally";
var adTally={};
function adTallyLoad(){
  if(!window.storage)return Promise.resolve();
  return window.storage.get(ADTALLY_KEY).then(function(r){
    if(r&&r.value){try{adTally=JSON.parse(r.value)||{};}catch(e){adTally={};}}
  }).catch(function(){adTally={};});
}
function adTallySave(){
  if(!window.storage)return Promise.resolve();
  return window.storage.set(ADTALLY_KEY,JSON.stringify(adTally)).catch(function(){});
}
function adsLeft(key,need){return Math.max(1,need-(adTally[key]||0));}
function adsBegun(key){return (adTally[key]||0)>0;}
/* "3 ADS", then "2 MORE ADS", then "1 MORE AD". */
function adsSay(key,need){
  var n=adsLeft(key,need);
  return n+(n<need?" MORE":"")+" AD"+(n===1?"":"S");
}
/* THE LABEL MAY NOT GROW ONCE COUNTING STARTS. "WATCH 3 ADS" becomes "2 MORE
   ADS", not "WATCH 2 MORE ADS": on a 327px phone the five extra letters
   wrapped both the map's buttons onto two lines. MORE already says what
   WATCH did. */
function adsWatchSay(key,need){
  return (adsBegun(key)?"":"WATCH ")+adsSay(key,need);
}
/* One video towards `key`. `open` runs when the last one is watched;
   `redraw` runs after every one, so the button's count is never stale. */
function adToward(key,need,open,redraw){
  adWatch(function(ok){
    if(!ok)return;
    var n=(adTally[key]||0)+1;
    if(n>=need){delete adTally[key];adTallySave();open();return;}
    adTally[key]=n;adTallySave();
    if(redraw)redraw();
    var left=need-n;
    flash(n+" of "+need+" watched · "+left+" more to open");
  });
}
