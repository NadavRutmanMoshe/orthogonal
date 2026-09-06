"use strict";
/* Orthogonal — 06-persistence.js
   Progress, settings, session, library and wardrobe storage.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   PERSISTENCE — one key holds the whole library, so saving
   costs a single write instead of one per level.
   ============================================================ */
var LIB_KEY="orthogonal:library";
var PROG_KEY="orthogonal:progress";
var SET_KEY="orthogonal:settings";
var SESS_KEY="orthogonal:session";
var WARD_KEY="orthogonal:wardrobe";
var SKIP_KEY="orthogonal:skips";
function saveWardrobe(){
  if(!window.storage)return;
  window.storage.set(WARD_KEY,JSON.stringify(wardrobe)).catch(function(){});
}
function loadWardrobe(){
  if(!window.storage)return Promise.resolve();
  return window.storage.get(WARD_KEY).then(function(r){
    if(r&&r.value){
      try{
        var o=JSON.parse(r.value);
        if(o.owned)wardrobe.owned=o.owned;
        if(o.color)wardrobe.color=o.color;
        if(o.shape)wardrobe.shape=o.shape;
        if(o.world3)wardrobe.world3=o.world3;
        if(o.world2)wardrobe.world2=o.world2;
        if(typeof o.spent==="number")wardrobe.spent=o.spent;
        if(o.ads)wardrobe.ads=o.ads;
        migrateWorlds(o);
      }catch(e){}
    }
    applyPalette();applySkin();
  }).catch(function(){});
}
/* A world used to be one item covering both dimensions; it is now two. A save
   written before the split carries `palette:"rust"` and an owned list holding
   bare `"rust"`, neither of which resolves any more.

   Both halves are granted for the one purchase that was made, rather than
   charging again for something already paid for or quietly taking half of it
   away. The prefixes are what make this decidable: an unprefixed id in the
   owned list can only have come from the old single-catalogue save. */
function migrateWorlds(o){
  if(!o.palette)return;
  if(!o.world3)wardrobe.world3="v_"+o.palette;
  if(!o.world2)wardrobe.world2="p_"+o.palette;
  var ids=[];
  for(var i=0;i<PALETTE_IDS.length;i++){
    var old=PALETTE_IDS[i];
    if(wardrobe.owned.indexOf(old)<0)continue;
    if(wardrobe.owned.indexOf("v_"+old)<0)ids.push("v_"+old);
    if(wardrobe.owned.indexOf("p_"+old)<0)ids.push("p_"+old);
  }
  wardrobe.owned=wardrobe.owned.concat(ids);
  if(ids.length)saveWardrobe();
}
var PALETTE_IDS=["indigo","blueprint","newsprint","moss","nocturne","rust"];
function saveSettings(){
  if(!window.storage)return;
  window.storage.set(SET_KEY,JSON.stringify(settings)).catch(function(){});
}
function loadSettings(){
  if(!window.storage)return Promise.resolve();
  return window.storage.get(SET_KEY).then(function(r){
    if(r&&r.value){
      try{
        var o=JSON.parse(r.value);
        /* Only a volume you chose survives. Anything else is a default from
           some earlier build of the mix, and letting it through is what made
           the per-device default a no-op on every machine that had played. */
        if(typeof o.volume==="number"&&o.volTouched){
          settings.volume=o.volume;settings.volTouched=true;
        }
        if(typeof o.brightness==="number")settings.brightness=o.brightness;
        if(o.ui&&["full","compact","none"].indexOf(o.ui)>=0)settings.ui=o.ui;
        /* `pace` is deliberately NOT read any more. The row that set it is
           gone, so a save carrying 0.5 would pin every clock in the game at
           half speed with nothing left to change it - which is the trap this
           whitelist exists to make visible. A key whose feature is removed
           comes out of the list with it. */
        /* `mastery` and `tutor` are deliberately NOT read any more: their
           rows are gone from the menu, so a save carrying mastery:"on" would
           pin the preview look on with nothing left to switch it off - the
           same trap `pace` is in. A key whose feature is removed comes out
           of the whitelist with it. */
        /* THE COUNTERS HAVE TO BE ON THIS LIST OR THEY DO NOT EXIST. This
           function is a whitelist, deliberately - see the volume note above -
           so a key that is written by saveSettings() and not read here is
           silently forgotten on every reload. `noSlowOffer` is the one that
           matters: it is the player saying stop, and it has to still be true
           tomorrow. Bounded rather than trusted, because a hand-edited save
           should not be able to switch help off with a nonsense value. */
        if(o.noSlowOffer===true)settings.noSlowOffer=true;
        if(o.hintAsked===true)settings.hintAsked=true;
        if(o.starAsked===true)settings.starAsked=true;
        if(typeof o.landHints==="number"&&o.landHints>=0)
          settings.landHints=Math.min(99,o.landHints|0);
        // o.verbs may exist in settings saved before the wording was settled.
        // Ignoring it is the migration: everyone lands on GO 2D / GO 3D.
      }catch(e){}
    }
    muted=settings.volume<=0;
    applyVolume();applyBrightness();applyUI();syncHud();
  }).catch(function(){});
}
// Resume where you stopped, mid-level, not just at the last level you finished.
var pendingSession=null;
function saveSession(){
  if(!window.storage||app!=="play"||playSource!=="builtin"||dying)return;
  if(L&&L.tutorial)return;
  /* A TRIAL'S RUN IS PART OF WHERE YOU STOPPED, and leaving it out was a
     silent reset. The cores you have already reached and the lives you have
     already spent are the whole state of a trial - the clock's own count is
     not, because a rhythm restarts cleanly and being dropped back mid-beat
     would be a hit you did not earn. Without these two, resuming a trial put
     the player back on their square with the amber row full again and the
     marker on a core they were standing on, so the cores appeared never to
     go down. Reported from a playtest, on a trial, by somebody who had
     closed the game between crossings.

     Written on every level and read back only on a trial: a boss resumes at
     phase 1 with a fresh pack, so it has to resume with fresh lives too. */
  var body={i:lvIndex,n:LEVELS[lvIndex]?LEVELS[lvIndex].name:"",mv:moveCount,
    p:[player.x,player.y,player.z],flat:flat,fu:flatPos.u,fy:flatPos.y,
    view:view,cr:gCrates.map(function(c){return c.slice();}),
    co:trialCore,lv:lives,
    hist:moveHistory.slice(-60)};
  window.storage.set(SESS_KEY,JSON.stringify(body)).catch(function(){});
}
function clearSession(){
  if(!window.storage)return;
  window.storage.delete(SESS_KEY).catch(function(){});
}
function loadSession(){
  if(!window.storage)return Promise.resolve();
  return window.storage.get(SESS_KEY).then(function(r){
    if(r&&r.value){try{pendingSession=JSON.parse(r.value);}catch(e){}}
  }).catch(function(){});
}
// Levels can be inserted ahead of you between builds, so the stored index is
// only a hint - the name is what actually identifies the level.
function sessionIndex(){
  var b=pendingSession;
  if(!b)return -1;
  if(b.n){for(var q=0;q<LEVELS.length;q++)if(LEVELS[q].name===b.n)return q;}
  return LEVELS[b.i]?b.i:-1;
}
function resumeSession(){
  var b=pendingSession, i=sessionIndex();
  if(!b||i<0)return false;
  playSource="builtin";
  enterPlay(LEVELS[i],i,false);
  player={x:b.p[0],y:b.p[1],z:b.p[2]};
  flat=!!b.flat;flatTarget=flat?1:0;flatT=flatTarget;
  flatPos={u:b.fu,y:b.fy};
  view=b.view||0;viewAngle=viewAngleTarget=view*90;
  if(b.cr&&b.cr.length===gCrates.length)gCrates=b.cr.map(function(c){return c.slice();});
  moveCount=b.mv||0;
  moveHistory=b.hist||[];
  /* Bounded rather than trusted, exactly as loadSettings() bounds its
     counters: a hand-edited save should not be able to put the player on a
     core that does not exist or hand them lives the level does not have.
     enterPlay() has just run trialReset(), so these overwrite a clean 0 and
     a full three, and buildGrid()/syncHud() below draw the restored run. */
  if(TR&&TR.cores){
    if(typeof b.co==="number"&&b.co>0)
      trialCore=Math.min(TR.cores.length-1,b.co|0);
    if(typeof b.lv==="number"&&b.lv>0)
      lives=Math.min(BOSS_LIVES,b.lv|0);
  }
  buildDynamic();buildGrid();syncHud();
  playerMesh.position.set(player.x,player.y,player.z);
  return true;
}
function progLoad(){
  if(!window.storage)return Promise.resolve();
  return window.storage.get(PROG_KEY).then(function(r){
    if(r&&r.value){try{progress=JSON.parse(r.value)||{};}catch(e){progress={};}}
    migrateNames();
  }).catch(function(){progress={};});
}
/* Levels were renumbered when the campaign was cut into sections, and
   progress is keyed by level name, so without this every solved level would
   silently read unsolved and every star already earned would vanish from the
   wardrobe. Keyed by name rather than index because index is exactly what
   the reshuffle changed. Runs once; the new names are already correct on a
   fresh save, so it finds nothing and does nothing. */
function migrateNames(){
  if(typeof LEVEL_RENAMES==="undefined")return;
  var moved=0;
  for(var old in LEVEL_RENAMES){
    if(!LEVEL_RENAMES.hasOwnProperty(old))continue;
    var now=LEVEL_RENAMES[old];
    if(progress[old]===undefined||old===now)continue;
    if(progress[now]===undefined)progress[now]=progress[old];
    delete progress[old];moved++;
  }
  if(moved)progSave();
}
function progSave(){
  if(!window.storage)return Promise.resolve();
  return window.storage.set(PROG_KEY,JSON.stringify(progress)).catch(function(){});
}
/* Skips live in their own store, deliberately not in `progress`.

   `progress[name]` means "you beat this", and everything downstream reads it
   that way: starsEarned() sums it, the wardrobe spends it, betterRecord()
   writes it. A skip is the opposite claim - the door opened, the level did
   not - so putting it in the same object would leak a purchase into the star
   economy, which is the one thing the economy must never allow. Kept apart,
   a skipped level is worth exactly zero stars by construction rather than by
   remembering to subtract it. Migrated by name for the same reason progress
   is: a rename must not silently re-lock what somebody has already opened. */
/* HOW MANY TIMES A CLOCK LEVEL HAS BEATEN YOU, kept per level and persisted.

   A boss or a trial is the only place in the game where losing costs the
   whole attempt, and it is where the first real playtester got stuck. After
   STRUGGLE_OFFER full losses the game offers a way past rather than waiting
   to be asked - the map already allows a skip on a landmark, and this is the
   same door opened at the moment it is actually wanted.

   FIVE, NOT THREE. It was three while the first card was cheap advice you
   could act on and carry on playing - slow the clock down. That row is gone,
   so the only card left is the one whose button says "give up on this one",
   and offering that on the third loss is too eager: three losses is a player
   still learning the beat, five is a player who is stuck.

   Counted only on a REAL loss - lives run out - not on a life spent, and
   cleared when the level is finally beaten, so the offer follows the current
   run of failures rather than a lifetime total. */
var FAIL_KEY="orthogonal:fails", fails={}, STRUGGLE_OFFER=5;
function failLoad(){
  if(!window.storage)return Promise.resolve();
  return window.storage.get(FAIL_KEY).then(function(r){
    if(r&&r.value){try{fails=JSON.parse(r.value)||{};}catch(e){fails={};}}
    /* Renames move the count with the level, exactly as they move progress
       and skips - a landmark that beat you three times under its old name
       has still beaten you three times. */
    if(typeof LEVEL_RENAMES!=="undefined")for(var old in LEVEL_RENAMES){
      var now=LEVEL_RENAMES[old];
      if(fails[old]===undefined||old===now)continue;
      if(fails[now]===undefined)fails[now]=fails[old];
      delete fails[old];
    }
  }).catch(function(){fails={};});
}
function failSave(){
  if(!window.storage)return Promise.resolve();
  return window.storage.set(FAIL_KEY,JSON.stringify(fails)).catch(function(){});
}
function noteFail(name){
  if(!name)return 0;
  fails[name]=(fails[name]||0)+1;failSave();
  return fails[name];
}
function clearFails(name){
  if(!name||fails[name]===undefined)return;
  delete fails[name];failSave();
}
/* ============================================================
   THE HINT BANK — three of them, one back every half hour

   Hints used to be unlimited and paid for in stars: nought cost three stars,
   one or two cost you down to two, and five or more meant none at all. That
   was a real cost and it was the wrong one. A hint is what somebody reaches
   for when they are stuck, which is the moment the game most wants them to
   carry on playing - and taking their score for it turned "I do not want to
   be stuck" into "I do not want to be marked down", so the bulb went unused
   by the person it exists for and the star economy quietly became a tax on
   being new. Stars are now what you get for solving the level, and nothing
   else touches them.

   What replaces it is a pool. Three hints, one back every half hour, and an
   ad refills. That charges *time* rather than score: it still says a hint is
   worth something, it cannot make a level unwinnable, and the thing it sells
   is the one thing a rewarded video can honestly sell. It is also the second
   hook an ad SDK reaches, beside grantSkip() - and it keeps the rule the map
   keeps, because a hint has never been worth a star and now cannot be.

   Two numbers rather than one: the pool refills to HINT_FREE on its own, and
   an ad can push it up to HINT_MAX. Without the second ceiling an ad taken at
   two hints in hand would hand back one, which is the sort of arithmetic that
   makes somebody feel cheated by a thing they chose to watch.

   `t` is the moment the current half hour started, and it advances by whole
   HINT_REGEN_MS at a time rather than being reset to now - so closing the
   game twenty-nine minutes in does not throw those minutes away. It is a
   wall-clock read, so a player who moves their device clock forward gets
   free hints; that is not worth defending against, and it is why the pool is
   the currency rather than anything that touches score. */
var HINT_KEY="orthogonal:hints";
var HINT_FREE=3, HINT_MAX=9, HINT_REGEN_MS=30*60*1000, HINT_AD=3;
var hintBank={n:HINT_FREE,t:0};
function hintLoad(){
  if(!window.storage)return Promise.resolve();
  return window.storage.get(HINT_KEY).then(function(r){
    if(r&&r.value){
      try{
        var o=JSON.parse(r.value)||{};
        if(typeof o.n==="number"&&o.n>=0)hintBank.n=Math.min(HINT_MAX,o.n|0);
        if(typeof o.t==="number"&&o.t>0)hintBank.t=o.t;
      }catch(e){}
    }
    hintRegen();
  }).catch(function(){});
}
function hintSave(){
  if(!window.storage)return Promise.resolve();
  return window.storage.set(HINT_KEY,JSON.stringify(hintBank)).catch(function(){});
}
/* Asked wherever the count is read or spent, so the pool is always current
   without a timer running: nothing here needs to happen ON the half hour,
   only to be true the next time anybody looks. */
function hintRegen(){
  var now=Date.now();
  if(hintBank.n>=HINT_FREE){hintBank.t=now;return;}   // full: the clock waits
  if(!hintBank.t){hintBank.t=now;hintSave();return;}
  var due=Math.floor((now-hintBank.t)/HINT_REGEN_MS);
  if(due<=0)return;
  var was=hintBank.n;
  hintBank.n=Math.min(HINT_FREE,hintBank.n+due);
  // Advance by what was actually paid out, not to now, or the minutes since
  // the last whole one are lost every time the game is opened.
  hintBank.t+=due*HINT_REGEN_MS;
  if(hintBank.n>=HINT_FREE)hintBank.t=now;
  if(hintBank.n!==was)hintSave();
}
function hintsLeft(){hintRegen();return hintBank.n;}
// Milliseconds until the next one arrives, or 0 when the pool is full.
function hintNextMs(){
  hintRegen();
  if(hintBank.n>=HINT_FREE)return 0;
  return Math.max(0,hintBank.t+HINT_REGEN_MS-Date.now());
}
function spendHint(){
  if(hintsLeft()<=0)return false;
  // The half hour starts when the pool first drops below full, not when it
  // empties - so the first hint you spend is already earning the next one.
  if(hintBank.n===HINT_FREE)hintBank.t=Date.now();
  hintBank.n--;hintSave();
  return true;
}
/* The second call site a rewarded video needs, beside grantSkip(). Not gated
   on an ad here for the same reason that one is not: there is no provider in
   this build, and a button that plainly works beats one that silently does
   nothing. */
function grantHints(n){
  hintRegen();
  hintBank.n=Math.min(HINT_MAX,hintBank.n+(n||HINT_AD));
  hintSave();
  return hintBank.n;
}
function skipLoad(){
  if(!window.storage)return Promise.resolve();
  return window.storage.get(SKIP_KEY).then(function(r){
    if(r&&r.value){try{skips=JSON.parse(r.value)||{};}catch(e){skips={};}}
    if(typeof LEVEL_RENAMES!=="undefined"){
      var moved=0;
      for(var old in LEVEL_RENAMES){
        if(!LEVEL_RENAMES.hasOwnProperty(old))continue;
        var now=LEVEL_RENAMES[old];
        if(skips[old]===undefined||old===now)continue;
        if(skips[now]===undefined)skips[now]=skips[old];
        delete skips[old];moved++;
      }
      if(moved)skipSave();
    }
  }).catch(function(){skips={};});
}
function skipSave(){
  if(!window.storage)return Promise.resolve();
  return window.storage.set(SKIP_KEY,JSON.stringify(skips)).catch(function(){});
}
/* The single call site a rewarded video has to reach. Nothing else in the
   game opens a level, so when the ad SDK is wired under Capacitor its
   completion callback calls exactly this and nothing else changes. It is
   deliberately not gated on an ad here: no provider exists yet, and a button
   that silently did nothing would be worse than one that plainly works. */
function grantSkip(name){
  if(!name)return false;
  skips[name]=1;skipSave();
  return true;
}
function libLoad(){
  if(!window.storage)return Promise.resolve();
  return window.storage.get(LIB_KEY).then(function(res){
    if(res&&res.value){
      try{library=JSON.parse(res.value)||[];}catch(e){library=[];}
    }
  }).catch(function(){library=[];});
}
function libSave(){
  if(!window.storage){flash("storage unavailable — use export");return Promise.resolve();}
  return window.storage.set(LIB_KEY,JSON.stringify(library)).catch(function(){
    flash("couldn't save");
  });
}
