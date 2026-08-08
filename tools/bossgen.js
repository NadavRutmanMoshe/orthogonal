"use strict";
/* Build and check the four boss arenas.
 *
 *   node tools/bossgen.js          -> tools/bosses.json
 *
 * These are authored, not searched. A boss is a fight now, and the shape of
 * a fight is a stage: room to run, cover to break line, and crates you can
 * swing. Generate-and-test found arenas that were *completable*, which for a
 * walk-to-the-marker boss was the whole question; for a fight it is barely a
 * question at all, and nine generated arenas all came out as the same two
 * plateaus and a chasm.
 *
 * What is still machine-checked, because it is checkable:
 *   REACHABLE   every crate and the boss's ground can be walked to
 *   ARMED       at least `hp` crates exist, so the fight can be finished
 *                even if one gets wedged
 *   LANES       every crate has at least one square you can stand on to
 *                shove it along open ground - a crate you cannot swing is
 *                scenery
 *   SAFE        bossSafety(): no sweep ever corners you
 *   FOLDABLE    the arena has real depth, so retreating into the plane
 *                actually buys you distance
 */
const fs=require("fs"), vm=require("vm"), path=require("path");
const JS=path.join(__dirname,"..","js");
const ctx=vm.createContext({console,Set,Map,Math,JSON});
["01-coords.js","03-rules.js","04-solver.js"].forEach(f=>
  vm.runInContext(fs.readFileSync(path.join(JS,f),"utf8"),ctx,{filename:f}));
const {makeRules,makeBoss,bossSafety,crateSet,crateKeys,resolveStep,K,AX}=ctx;
const S=0,G=1,A=2,C=3,SP=4;

// floor(x0..x1, z0..z1) with holes punched for depth and cover
function floor(x0,x1,z0,z1,y,kind,out){
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)out.push([x,y,z,kind===undefined?S:kind]);
  return out;
}
/* Stages for a gunfight.

   The boss shoots along a row or column and blocks stop the projectile, so
   for the first time the arena's furniture has a job: pillars are COVER.
   An empty floor is a shooting gallery, and a cluttered one is a maze the
   boss cannot path through - the shape to aim for is scattered cover with
   clear lanes between it.

   Pillars are no longer the difficulty dial (there are no crush lines any
   more, so their old habit of making a whole row lethal is gone). What they
   control now is how much of the arena you can hide in.

   You still need to line up with it to strike, so the arena also has to be
   open enough that "share its column" is reachable inside the OPEN window. */
const ARENAS=[
{ name:"BOSS I — The Sentinel",
  hint:"It fires down your row. Break the line, then catch it open — fold while you share its column.",
  hp:3, step:950, aim:1000, open:1500, shotStep:130, stun:1000,
  build(){
    const b=[];
    floor(0,8,0,6,0,S,b);
    [[3,2],[5,4],[2,5]].forEach(p=>b.push([p[0],1,p[1],S]));
    return {blocks:b,start:[1,1,1],at:[6,1,4]};
  }},
{ name:"BOSS II — Sharp Ground",
  hint:"Cover is thinner here, and some of it bites.",
  hp:3, step:900, aim:900, open:1350, shotStep:120, stun:950,
  build(){
    const b=[];
    floor(0,9,0,6,0,S,b);
    [[4,2],[7,4]].forEach(p=>b.push([p[0],1,p[1],S]));
    [[2,4],[6,1]].forEach(p=>b.push([p[0],1,p[1],SP]));
    return {blocks:b,start:[1,1,1],at:[6,1,4]};
  }},
{ name:"BOSS III — Through Glass",
  hint:"Glass stops a shot but casts no shadow. Cover in the volume, nothing in the plane.",
  hp:4, step:850, aim:850, open:1250, shotStep:115, stun:900,
  build(){
    const b=[];
    floor(0,9,0,6,0,S,b);
    [[3,2],[6,4]].forEach(p=>b.push([p[0],1,p[1],S]));
    [[5,1],[2,5],[7,2]].forEach(p=>b.push([p[0],1,p[1],G]));
    return {blocks:b,start:[1,1,1],at:[7,1,5]};
  }},
{ name:"BOSS IV — The Orthogon",
  hint:"Five hits, a faster gun, and a crate is still a hit if you can land one.",
  hp:5, step:780, aim:750, open:1100, shotStep:100, stun:850,
  build(){
    const b=[];
    floor(0,10,0,7,0,S,b);
    [[3,2],[7,5],[5,3]].forEach(p=>b.push([p[0],1,p[1],S]));
    [[6,1],[2,6]].forEach(p=>b.push([p[0],1,p[1],SP]));
    [[8,3]].forEach(p=>b.push([p[0],1,p[1],G]));
    b.push([1,1,3,C],[9,1,2,C],[4,1,6,C]);
    return {blocks:b,start:[1,1,1],at:[8,1,6]};
  }}
];

function check(lv){
  const a=ctx.bossArena(lv);
  return {fail:a.fail||[],squares:a.squares,cover:a.cover};
}

const out=[];
ARENAS.forEach(cfg=>{
  const g=cfg.build();
  const lv={name:cfg.name,hint:cfg.hint,blocks:g.blocks,start:g.start,
    boss:{hp:cfg.hp,at:g.at,step:cfg.step,aim:cfg.aim,open:cfg.open,
          shotStep:cfg.shotStep,stun:cfg.stun}};
  const r=check(lv);
  console.log(cfg.name.padEnd(26)+
    " hp "+cfg.hp+"  step "+cfg.step+"  aim "+cfg.aim+"  open "+cfg.open+
    "  "+r.squares+" squares  "+r.cover+" cover  "+
    (r.fail.length?"FAIL: "+r.fail.join("; "):"ok"));
  out.push(lv);
});
fs.writeFileSync(path.join(__dirname,"bosses.json"),JSON.stringify(out,null,1));
console.log("\nwrote "+out.length+" -> tools/bosses.json");
