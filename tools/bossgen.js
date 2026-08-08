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
const ARENAS=[
{ name:"BOSS I — The Sentinel",
  hint:"Shove a crate into it. You cannot shove in the plane — fold to run, unfold to fight.",
  hp:3, step:1050, stun:1600, period:3200, fire:300,
  beats:[{axis:"x",at:4}],
  build(){
    const b=[];
    floor(0,8,0,6,0,S,b);
    [[3,2],[5,4]].forEach(p=>b.push([p[0],1,p[1],S]));      // cover, and high ground
    b.push([2,1,1,C],[6,1,1,C],[2,1,5,C],[6,1,5,C],[4,1,3,C]);
    return {blocks:b,start:[0,1,0],at:[8,1,6]};
  }},
{ name:"BOSS II — Sharp Ground",
  hint:"It will not walk onto spikes. Use them — herd it, then swing.",
  hp:3, step:950, stun:1500, period:2800, fire:300,
  beats:[{axis:"z",at:3},{axis:"x",at:6}],
  build(){
    const b=[];
    floor(0,9,0,6,0,S,b);
    [[4,1],[4,5],[7,3]].forEach(p=>b.push([p[0],1,p[1],SP]));
    [[2,3],[6,1]].forEach(p=>b.push([p[0],1,p[1],S]));
    b.push([1,1,1,C],[7,1,1,C],[1,1,5,C],[7,1,5,C],[5,1,3,C]);
    return {blocks:b,start:[0,1,0],at:[9,1,6]};
  }},
{ name:"BOSS III — Through Glass",
  hint:"Glass is floor here and a hole in the plane. Fold from the wrong square and you drop.",
  hp:4, step:900, stun:1400, period:2600, fire:320,
  beats:[{axis:"x",at:3},{axis:"z",at:5}],
  build(){
    const b=[];
    floor(0,9,0,6,0,S,b);
    [[4,2],[4,3],[4,4],[7,1],[7,5]].forEach(p=>{
      const i=b.findIndex(q=>q[0]===p[0]&&q[2]===p[1]&&q[1]===0);
      if(i>=0)b[i][3]=G;
    });
    [[2,2],[6,4],[8,2]].forEach(p=>b.push([p[0],1,p[1],S]));
    b.push([1,1,1,C],[8,1,1,C],[1,1,5,C],[8,1,5,C],[5,1,3,C],[3,1,5,C]);
    return {blocks:b,start:[0,1,0],at:[9,1,6]};
  }},
{ name:"BOSS IV — The Orthogon",
  hint:"Five hits. Faster, three slices, and the floor lies to you.",
  hp:5, step:800, stun:1200, period:2300, fire:340,
  // the height slab is at 2, not 1: at 1 it catches everyone standing on the
  // floor at once, which bossSafety correctly refuses as uncorner-able.
  // At 2 it clears the high ground, and stepping off a pillar is the dodge.
  beats:[{axis:"x",at:4},{axis:"z",at:2},{axis:"y",at:2}],
  build(){
    const b=[];
    floor(0,10,0,7,0,S,b);
    [[5,2],[5,6],[8,4],[2,4]].forEach(p=>b.push([p[0],1,p[1],SP]));
    // plenty of high ground, because one of the sweeps is a height slab
    [[2,1],[7,1],[3,6],[9,6],[6,3],[0,4]].forEach(p=>b.push([p[0],1,p[1],S]));
    [[6,5],[3,3],[9,2]].forEach(p=>{
      const i=b.findIndex(q=>q[0]===p[0]&&q[2]===p[1]&&q[1]===0);
      if(i>=0)b[i][3]=G;
    });
    b.push([1,1,2,C],[9,1,1,C],[1,1,6,C],[8,1,6,C],[4,1,4,C],[7,1,7,C],[4,1,0,C]);
    return {blocks:b,start:[0,1,0],at:[10,1,7]};
  }}
];

function check(lv,cfg){
  const R=makeRules(lv), cr=crateSet(crateKeys(lv)), fail=[];
  // walkable set from the start, ignoring the boss
  const stand=new Set(), q=[lv.start.slice()];
  stand.add(K(...lv.start));
  while(q.length){
    const p=q.shift();
    for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=p[0]+d[0], nz=p[2]+d[1];
      const ny=resolveStep(h=>R.solid(nx,h,nz,cr),p[1],h=>R.solid(p[0],h,p[2],cr));
      if(ny===null||ny===ctx.FELL)continue;
      if(R.deadly3(nx,ny,nz))continue;
      const k=K(nx,ny,nz);
      if(stand.has(k))continue;
      stand.add(k);q.push([nx,ny,nz]);
    }
  }
  const crates=lv.blocks.filter(b=>b[3]===C);
  if(crates.length<cfg.hp)fail.push("only "+crates.length+" crates for "+cfg.hp+" hits");
  let lanes=0;
  crates.forEach(c=>{
    let ok=false;
    for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){
      // stand on the far side and shove: the square behind must be walkable
      const bx=c[0]-d[0], bz=c[2]-d[1];
      if(!stand.has(K(bx,c[1],bz)))continue;
      if(R.push(c[0],c[1],c[2],d[0],d[1],cr))ok=true;
    }
    if(ok)lanes++;
  });
  if(lanes<cfg.hp)fail.push("only "+lanes+" swingable crates");
  if(!stand.has(K(cfg.at[0],cfg.at[1],cfg.at[2])))
    fail.push("boss ground unreachable at ["+cfg.at+"]");
  const safe=bossSafety(lv);
  if(!safe.ok)fail.push(safe.trapped.length+" cells cornered by a sweep");
  const depths=new Set(lv.blocks.map(b=>b[2]));
  if(depths.size<4)fail.push("too flat to make folding worth anything");
  return {fail,stand:stand.size,crates:crates.length,lanes};
}

const out=[];
ARENAS.forEach(cfg=>{
  const g=cfg.build();
  const lv={name:cfg.name,hint:cfg.hint,blocks:g.blocks,start:g.start,
    boss:{hp:cfg.hp,at:g.at,step:cfg.step,stun:cfg.stun,
          period:cfg.period,fire:cfg.fire,beats:cfg.beats}};
  const r=check(lv,{hp:cfg.hp,at:g.at});
  console.log(cfg.name.padEnd(26)+
    " hp "+cfg.hp+"  step "+cfg.step+"ms  "+r.stand+" squares  "+
    r.crates+" crates ("+r.lanes+" swingable)  "+
    (r.fail.length?"FAIL: "+r.fail.join("; "):"ok"));
  out.push(lv);
});
fs.writeFileSync(path.join(__dirname,"bosses.json"),JSON.stringify(out,null,1));
console.log("\nwrote "+out.length+" -> tools/bosses.json");
