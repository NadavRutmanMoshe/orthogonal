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
/* Stages, not puzzles. Every arena is one connected floor: the boss walks,
   so a chasm it cannot cross is a boss that cannot fight. Depth is still what
   makes folding worth doing - flattened, eight squares of arena become two
   moves - but it is a reposition, not the only route.

   Pillars matter for a different reason: a height sweep at y=1 catches every
   square on a flat floor at once, which is not an attack, it is a cutscene.
   Somewhere to climb is what makes it dodgeable, and bossSafety() fails the
   arena if there isn't. */
/* Stages, not puzzles. Every arena is one connected floor: the boss walks, so
   a chasm it cannot cross is a boss that cannot fight. Depth is what makes
   folding worth doing - flattened, eight squares become two moves - but it is
   a reposition, not the only route.

   The weapon is the fold, so the real content of an arena is its PILLARS.
   A pillar is a silhouette block, and the boss dies when it is standing at a
   depth whose column already holds one. Lead it across a pillar's line, fold,
   done. Rotating re-labels every line at once, which is what keeps it a
   question rather than a routine.

   Each section then changes what a blocked column means:
     I    pillars only - the plain rule
     II   spikes, which poison columns the boss will not walk into on foot
     III  glass, which is floor but casts nothing, so a line that looks lethal
          is not one - the arena lies to you
     IV   crates, so you can build a column where there wasn't one, plus the
          direct shove

   Pillars matter for a second reason: a height sweep at y=1 catches every
   square of a flat floor at once, which is not an attack, it is a cutscene.
   Somewhere to climb is the dodge, and bossSafety() fails the arena without it. */
const ARENAS=[
{ name:"BOSS I — The Sentinel",
  hint:"Lead it across a pillar's line, then fold. The fold crushes it the same way it would crush you.",
  hp:3, step:1100, stun:1700, period:3400, fire:300,
  beats:[{axis:"x",at:4}],
  build(){
    const b=[];
    floor(0,8,0,6,0,S,b);
    // pillars spread over both axes, so every rotation offers a line
    [[2,1],[6,1],[2,5],[6,5],[4,3]].forEach(p=>b.push([p[0],1,p[1],S]));
    return {blocks:b,start:[0,1,0],at:[8,1,6]};
  }},
{ name:"BOSS II — Sharp Ground",
  hint:"It will not step on spikes — but a spike still poisons the whole column it folds into.",
  hp:3, step:1000, stun:1600, period:3000, fire:300,
  beats:[{axis:"z",at:3},{axis:"x",at:6}],
  build(){
    const b=[];
    floor(0,9,0,6,0,S,b);
    [[4,1],[4,5],[7,3]].forEach(p=>b.push([p[0],1,p[1],SP]));
    [[2,2],[7,1],[2,5],[6,5]].forEach(p=>b.push([p[0],1,p[1],S]));
    return {blocks:b,start:[0,1,0],at:[9,1,6]};
  }},
{ name:"BOSS III — Through Glass",
  hint:"Glass is floor, and casts nothing. Half the lines here are not lines at all.",
  hp:4, step:950, stun:1500, period:2800, fire:320,
  beats:[{axis:"x",at:3},{axis:"z",at:5}],
  build(){
    const b=[];
    floor(0,9,0,6,0,S,b);
    // glass pillars: they look like cover and cast no silhouette at all
    [[3,2],[6,4],[8,2]].forEach(p=>b.push([p[0],1,p[1],G]));
    [[1,4],[5,1],[7,5],[3,6]].forEach(p=>b.push([p[0],1,p[1],S]));
    [[4,3],[4,4]].forEach(p=>{
      const i=b.findIndex(q=>q[0]===p[0]&&q[2]===p[1]&&q[1]===0);
      if(i>=0)b[i][3]=G;
    });
    return {blocks:b,start:[0,1,0],at:[9,1,6]};
  }},
{ name:"BOSS IV — The Orthogon",
  hint:"Five hits. Now you can build the line yourself — or just shove a crate into it.",
  hp:5, step:850, stun:1300, period:2500, fire:340,
  beats:[{axis:"x",at:4},{axis:"z",at:2},{axis:"y",at:2}],
  build(){
    const b=[];
    floor(0,10,0,7,0,S,b);
    [[5,2],[5,6],[8,4]].forEach(p=>b.push([p[0],1,p[1],SP]));
    [[2,1],[7,1],[3,6],[9,6],[0,4]].forEach(p=>b.push([p[0],1,p[1],S]));
    [[6,3]].forEach(p=>b.push([p[0],1,p[1],G]));
    b.push([1,1,2,C],[9,1,1,C],[1,1,6,C],[8,1,6,C],[4,1,4,C]);
    return {blocks:b,start:[0,1,0],at:[10,1,7]};
  }}
];

function check(lv){
  const a=ctx.bossArena(lv), safe=bossSafety(lv);
  const fail=(a.fail||[]).concat(
    safe.ok?[]:[safe.trapped.length+" cells cornered by a sweep"]);
  return {fail,squares:a.squares,kills:a.kills,crates:a.crates};
}

const out=[];
ARENAS.forEach(cfg=>{
  const g=cfg.build();
  const lv={name:cfg.name,hint:cfg.hint,blocks:g.blocks,start:g.start,
    boss:{hp:cfg.hp,at:g.at,step:cfg.step,stun:cfg.stun,
          period:cfg.period,fire:cfg.fire,beats:cfg.beats}};
  const r=check(lv);
  console.log(cfg.name.padEnd(26)+
    " hp "+cfg.hp+"  step "+cfg.step+"ms  "+r.squares+" squares  "+
    r.kills+" crush spots  "+r.crates+" crates  "+
    (r.fail.length?"FAIL: "+r.fail.join("; "):"ok"));
  out.push(lv);
});
fs.writeFileSync(path.join(__dirname,"bosses.json"),JSON.stringify(out,null,1));
console.log("\nwrote "+out.length+" -> tools/bosses.json");
