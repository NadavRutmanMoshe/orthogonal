"use strict";
/* I'm Just A Cube - 27-achievements.js
   The store's achievements: Google Play Games on Android, Game Center on
   iOS, and a slot for Steam. Loaded before 21-boot.js, like 24-ads.js and
   25-shop.js, so boot starts it and nothing needs a typeof guard.

   NOTHING HERE DECIDES WHAT IS EARNED. Every achievement is a question the
   save can already answer - a world on every star is `sectionSpans()`, the
   same sum the map paints and win() pays the world's shape out on, and the
   double kill is owning the Domino, which only that fold can grant. So there
   is no new save key, no counter to drift, and a player who earned something
   before this file existed is told the store about it on the next launch:
   `achSweep()` asks every question and reports every yes.

   Reporting a yes twice is harmless on all three stores - an achievement
   that is already unlocked stays unlocked and says nothing - which is what
   makes "ask everything, report everything" safe to run on every launch and
   after every star.

   IN A BROWSER THERE IS NO STORE and every call here returns at once. The
   artifact and itch.io play exactly as before. */

/* ============================================================
   WHAT CAN BE EARNED

   `secs` are SECTIONS indices, like a reward shape's `sec`: 1 NATURE,
   2 FIRE, 3 WATER, 4 DESERT, 5 EXTRA. PROLOGUE awards no stars and cannot
   be mastered. `shape` is a wardrobe id whose only way in is the feat.
   ============================================================ */
var ACHIEVEMENTS=[
  {id:"world1",     secs:[1]},
  {id:"world2",     secs:[2]},
  {id:"world3",     secs:[3]},
  {id:"world4",     secs:[4]},
  {id:"worlds",     secs:[1,2,3,4]},
  {id:"everything", secs:[1,2,3,4,5]},
  {id:"double",     shape:"domino"}
];

/* THE STORES' OWN NAMES FOR THEM. An empty string is "not set up in that
   console yet", and an achievement with no id is simply never sent, so this
   ships safely half-filled.

   ANDROID: Play Console generates these (Play Games Services > Achievements,
   they look like CgkI...). Paste each one in. The Play Games app id goes in
   app/android/app/src/main/res/values/strings.xml, not here.
   iOS: you choose these when you create each achievement in App Store
   Connect > Game Center. Type exactly what is below.
   STEAM: the API names typed into Steamworks > Achievements. */
var ACH_IDS={
  android:{world1:"", world2:"", world3:"", world4:"",
           worlds:"", everything:"", double:""},
  ios:    {world1:"imjustacube.world1", world2:"imjustacube.world2",
           world3:"imjustacube.world3", world4:"imjustacube.world4",
           worlds:"imjustacube.worlds", everything:"imjustacube.everything",
           double:"imjustacube.double"},
  steam:  {world1:"ACH_WORLD1", world2:"ACH_WORLD2", world3:"ACH_WORLD3",
           world4:"ACH_WORLD4", worlds:"ACH_WORLDS",
           everything:"ACH_EVERYTHING", double:"ACH_DOUBLE"}
};

/* EVERY NATIVE CALL HAS A CLOCK. A plugin promise that never settles is the
   known failure of this kind of file (js/24-ads.js, docs/HISTORY.md), and
   `.catch()` cannot see one. Sign-in is long because Game Center may put a
   sign-in sheet up and a person is typing into it. */
var ACH_SIGNIN_MS=120000;
var ACH_CALL_MS=15000;

/* started: the sign-in, once per launch.
   signedIn: the store will take a report.
   sent: per achievement - true once the store said yes, "going" while a
   report is out. Only for this launch; the store is the record. */
var ACH={started:null, signedIn:false, sent:{}};

/* ============================================================
   WHICH STORE
   ============================================================ */
/* STEAM IS A PAGE THE WRAPPER TALKS TO, NOT A CAPACITOR PLUGIN. There is no
   Steam build yet (docs/SHIPPING.md, "The Steam grant"). When there is, its
   Electron preload exposes `window.cubeSteam.activate(apiName)` over
   steamworks.js, and this file needs nothing else. */
function achSteam(){
  var S=window.cubeSteam;
  return S&&typeof S.activate==="function"?S:null;
}
var achPlug;
function achPlugin(){
  if(achPlug!==undefined)return achPlug;
  achPlug=capPlugin("Achievements");
  return achPlug;
}
/* "android", "ios", "steam", or null for a browser. */
function achStore(){
  if(achSteam())return "steam";
  if(!achPlugin())return null;
  var os=window.Capacitor.getPlatform();
  return os==="android"||os==="ios"?os:null;
}
function achSoon(p,ms,fallback){
  return new Promise(function(res){
    var t=setTimeout(function(){res(fallback);},ms);
    Promise.resolve(p).then(function(v){clearTimeout(t);res(v);},
                            function(){clearTimeout(t);res(fallback);});
  });
}

/* ============================================================
   THE QUESTIONS
   ============================================================ */
/* Every scoreable level in section n on three stars. The same test
   sweepSectionRewards() uses and for the same reason: not
   sectionMastered(), which a preview switch could make lie. A locked
   section (EXTRA before the last boss) is not mastered. */
function achWorldDone(spans,n){
  var sp=spans[n];
  return !!(sp&&sp.max>0&&!sp.locked&&sp.got===sp.max);
}
function achMet(a,spans){
  if(a.shape)return wardrobe.owned.indexOf(a.shape)>=0;
  for(var i=0;i<a.secs.length;i++)
    if(!achWorldDone(spans,a.secs[i]))return false;
  return true;
}

/* ============================================================
   STARTING - after the age card, off the launch path
   ============================================================ */
/* NOT ON A FIRST RUN'S AGE CARD. Game Center may put its own sign-in sheet
   up, and that must not land on top of the one question a new player is
   asked. applyAgeBand() starts it once they have answered, the same way it
   starts the ads. */
function achBoot(){
  if(!achStore())return;
  if(!settings.ageBand&&nothingBehind())return;
  setTimeout(achStart,2500);
}
function achStart(){
  var store=achStore();
  if(!store)return Promise.resolve(false);
  if(ACH.started)return ACH.started;
  var ask=store==="steam"
    ? Promise.resolve({signedIn:true})
    : achSoon(achPlugin().signIn(),ACH_SIGNIN_MS,{signedIn:false});
  ACH.started=ask.then(function(r){
    ACH.signedIn=!!(r&&r.signedIn);
    if(ACH.signedIn)achSweep();
    return ACH.signedIn;
  });
  return ACH.started;
}

/* ============================================================
   REPORTING
   ============================================================ */
/* Ask every question and report every yes. Called after sign-in, after any
   star lands (win()) and after the double kill (bossFoldCrush()). Cheap: one
   sectionSpans(), and a report only for what is met and not yet sent. */
function achSweep(){
  if(!ACH.signedIn||typeof sectionSpans!=="function")return;
  var spans=sectionSpans();
  for(var i=0;i<ACHIEVEMENTS.length;i++)
    if(achMet(ACHIEVEMENTS[i],spans))achieve(ACHIEVEMENTS[i].id);
}
/* Tell the store one achievement is unlocked. Before sign-in it does
   nothing, and loses nothing: the sweep after sign-in asks again. A report
   that fails is forgotten, so the next sweep tries it again. */
function achieve(key){
  if(!ACH.signedIn||ACH.sent[key])return;
  var store=achStore(), name=store&&ACH_IDS[store][key];
  if(!name)return;
  ACH.sent[key]="going";
  var p=store==="steam"
    ? new Promise(function(res){res(achSteam().activate(name));}).then(function(){return {ok:true};})
    : achPlugin().unlock({id:name});
  achSoon(p,ACH_CALL_MS,{ok:false}).then(function(r){
    if(r&&r.ok)ACH.sent[key]=true;
    else delete ACH.sent[key];
  });
}
