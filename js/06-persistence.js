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
        if(typeof o.volume==="number")settings.volume=o.volume;
        if(typeof o.brightness==="number")settings.brightness=o.brightness;
        if(o.ui&&["full","compact","none"].indexOf(o.ui)>=0)settings.ui=o.ui;
        // o.verbs may exist in settings saved before the wording was settled.
        // Ignoring it is the migration: everyone lands on GO 2D / GO 3D.
      }catch(e){}
    }
    muted=settings.volume<=0;
    applyBrightness();applyUI();syncHud();
  }).catch(function(){});
}
// Resume where you stopped, mid-level, not just at the last level you finished.
var pendingSession=null;
function saveSession(){
  if(!window.storage||app!=="play"||playSource!=="builtin"||dying)return;
  if(L&&L.tutorial)return;
  var body={i:lvIndex,n:LEVELS[lvIndex]?LEVELS[lvIndex].name:"",mv:moveCount,
    p:[player.x,player.y,player.z],flat:flat,fu:flatPos.u,fy:flatPos.y,
    view:view,cr:gCrates.map(function(c){return c.slice();}),
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
