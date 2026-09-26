"use strict";
/* I'm Just A Cube - 27-steam.js
   STEAM ACHIEVEMENTS, as a reading of the save. Loaded before boot like 24,
   25 and 26, so nothing that calls into it needs a typeof guard.

   THE LIST IS DERIVED, NEVER EVENT-DRIVEN. Nothing here listens for "a boss
   died" or "the last star landed"; steamAchSync() reads `progress` and
   `wardrobe.owned` and reports every achievement the save has earned. It is
   called from the two writers those live in (progSave(), grantShape()) and
   once at boot. Three things fall out of that for free:
   - A save that earned something before this file existed is paid on its
     first launch, the way sweepSectionRewards() pays old saves their shapes.
   - A save restored by Steam Cloud onto a new machine is paid too.
   - There is no second place that decides what "beat BOSS II" means. It is
     `progress[name]!==undefined`, which is what the map already draws.
   Reporting one Steam already has is harmless: the Electron side asks
   isActivated() first, and this side only sends each id once per session.

   THE BRIDGE IS `window.steamBridge`, put there by desktop/preload.js. In a
   browser, the artifact and the phone apps there is no bridge, and this
   whole file does nothing.

   THE API NAMES ARE A CONTRACT WITH STEAMWORKS. Each `id` must exist, spelled
   exactly so, under the app's Stats & Achievements page, or Steam refuses
   it without a word. The names and descriptions here are the copy to paste
   there (desktop/README.md has the table); Steam shows its own copy, not
   this one, so changing a string here changes nothing a player sees.

   13 of them, the list docs/SHIPPING.md promised: the four worlds finished,
   the four bosses beaten, the four worlds on every star (which is the same
   moment as the reward shape, and is read from the shape), and the Domino.
   PROLOGUE is a tutorial and V - EXTRA is a bonus shelf; neither has one. */
var STEAM_ACH=[
  {id:"WORLD_1", name:"Nature Walk",      desc:"Finish every level in I · NATURE.",      world:1},
  {id:"WORLD_2", name:"Through the Fire", desc:"Finish every level in II · FIRE.",       world:2},
  {id:"WORLD_3", name:"Deep Water",       desc:"Finish every level in III · WATER.",     world:3},
  {id:"WORLD_4", name:"Desert Crossing",  desc:"Finish every level in IV · DESERT.",     world:4},
  {id:"BOSS_1",  name:"Can't Catch Me",   desc:"Beat BOSS I.",                           boss:1},
  {id:"BOSS_2",  name:"Off the Record",   desc:"Beat BOSS II.",                          boss:2},
  {id:"BOSS_3",  name:"Search Called Off",desc:"Beat BOSS III.",                         boss:3},
  {id:"BOSS_4",  name:"Out of Their Jurisdiction", desc:"Beat BOSS IV.",                 boss:4},
  {id:"STARS_1", name:"Green Thumb",      desc:"Every star in I · NATURE. Earns the Sapling.",  shape:"sapling"},
  {id:"STARS_2", name:"Eruption",         desc:"Every star in II · FIRE. Earns the Volcano.",   shape:"flame"},
  {id:"STARS_3", name:"Big Fish",         desc:"Every star in III · WATER. Earns the Minnow.",  shape:"minnow"},
  {id:"STARS_4", name:"Prickly",          desc:"Every star in IV · DESERT. Earns the Cactus.",  shape:"cactus"},
  {id:"DOMINO",  name:"Domino",           desc:"Crush two of the pack with a single fold.",     shape:"domino"}
];

/* Every scoreable level in section `n` has a record. Tutorials are skipped
   (SPARRING sits in world I and scores nothing), and a skip is not a record -
   skips live in `skips`, never in `progress` - so this cannot be bought. */
function steamWorldDone(n){
  var s=SECTIONS[n];if(!s)return false;
  var to=(n+1<SECTIONS.length?SECTIONS[n+1].at:LEVELS.length);
  var any=false;
  for(var i=s.at;i<to;i++){
    if(LEVELS[i].tutorial)continue;
    any=true;
    if(progress[LEVELS[i].name]===undefined)return false;
  }
  return any;
}
/* The Nth landmark fight, counted in level order and skipping SPARRING, so
   an inserted level can never re-point BOSS_2 at a different fight. */
function steamBossDone(k){
  var seen=0;
  for(var i=0;i<LEVELS.length;i++){
    if(!LEVELS[i].boss||LEVELS[i].tutorial)continue;
    if(++seen===k)return progress[LEVELS[i].name]!==undefined;
  }
  return false;
}
/* Read from wardrobe.owned directly and NOT through owns(): the Steam build
   owns every paid shape by rule, and a rule must never be able to report a
   reward that only play can earn. */
function steamAchEarned(a){
  if(a.world)return steamWorldDone(a.world);
  if(a.boss)return steamBossDone(a.boss);
  if(a.shape)return wardrobe.owned.indexOf(a.shape)>=0;
  return false;
}
var steamAchSent={};
function steamAchSync(){
  var br=window.steamBridge;
  if(!br||!br.achieve)return;
  var fresh=[];
  for(var i=0;i<STEAM_ACH.length;i++){
    var a=STEAM_ACH[i];
    if(steamAchSent[a.id]||!steamAchEarned(a))continue;
    steamAchSent[a.id]=true;
    fresh.push(a.id);
  }
  if(fresh.length){try{br.achieve(fresh);}catch(e){}}
}
