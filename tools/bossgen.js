"use strict";
/* Search for the campaign's boss arenas: one per section, escalating, each
 * built from the mechanics its section has taught.
 *
 *   node tools/bossgen.js         search and write tools/bosses.json
 *
 * Generate-and-test, the same family as the composer. Four bars, and the
 * last is the one that matters:
 *
 *   FAIR    a run exists that is never hit. solve() prunes any state a sweep
 *           lands on, so "solvable" and "3-star achievable" are one question.
 *   LONG    not over in a handful of moves.
 *   FOLDED  the clean run folds - a boss you can walk is not this game.
 *   FORCED  with the sweeps switched off the arena has a strictly shorter
 *           answer. Without this bar you get a normal level wearing a health
 *           bar, which is the failure mode this whole search exists to avoid.
 */
const fs=require("fs"), vm=require("vm"), path=require("path");
const JS=path.join(__dirname,"..","js");
const ctx=vm.createContext({console,Set,Map,Math,JSON});
["01-coords.js","03-rules.js","04-solver.js"].forEach(f=>
  vm.runInContext(fs.readFileSync(path.join(JS,f),"utf8"),ctx,{filename:f}));
const {solve,bossSafety}=ctx;

let seed=1;
const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
const pick=(a)=>a[Math.floor(rnd()*a.length)];
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));

const STONE=0,GLASS=1,ANCHOR=2,CRATE=3,SPIKE=4;

function arena(cfg){
  const W=ri(cfg.w[0],cfg.w[1]);
  const gap=ri(2,3), zB=2+gap;
  const blocks=[], occ=new Set();
  const put=(x,y,z,k)=>{const s=x+","+y+","+z;if(occ.has(s))return false;
    occ.add(s);blocks.push([x,y,z,k]);return true;};

  for(let x=0;x<=W;x++){
    for(const z of [0,1,zB,zB+1])put(x,0,z,STONE);
  }
  // glass in the floor: solid to stand on, a hole once you fold, so the
  // ground you dodge along is not the ground you dodge along flattened
  if(cfg.mech.includes("glass"))
    for(let i=0;i<ri(2,4);i++){
      const x=ri(0,W), z=pick([0,1,zB,zB+1]);
      const s=x+",0,"+z;
      if(occ.has(s)){const b=blocks.find(b=>b[0]===x&&b[1]===0&&b[2]===z);
        if(b&&!(x===0&&z===0))b[3]=GLASS;}
    }
  const pil=[];
  for(let i=0;i<ri(2,4);i++){
    const x=ri(0,W), z=pick([0,1,zB,zB+1]);
    if(put(x,1,z,STONE))pil.push([x,z]);
  }
  // spikes on top of a pillar poison the silhouette column they fold into
  if(cfg.mech.includes("spike"))
    for(let i=0;i<ri(1,3);i++){
      const x=ri(0,W), z=pick([0,1,zB,zB+1]);
      put(x,1,z,SPIKE);
    }
  if(cfg.mech.includes("crate"))
    for(let i=0;i<ri(1,2);i++)put(ri(0,W),1,pick([0,1,zB,zB+1]),CRATE);
  if(cfg.mech.includes("anchor"))
    for(let i=0;i<ri(1,2);i++){
      const x=ri(0,W), z=pick([0,1,zB,zB+1]);
      const b=blocks.find(b=>b[0]===x&&b[1]===0&&b[2]===z);
      if(b&&b[3]===STONE)b[3]=ANCHOR;
    }

  const standable=[];
  for(let x=0;x<=W;x++)for(const z of [0,1,zB,zB+1]){
    const top=blocks.filter(b=>b[0]===x&&b[2]===z).sort((a,b)=>b[1]-a[1])[0];
    if(!top)continue;
    if(top[3]===SPIKE||top[3]===CRATE)continue;
    standable.push([x,top[1]+1,z]);
  }
  const near=standable.filter(c=>c[2]<=1), far=standable.filter(c=>c[2]>=zB);
  if(near.length<3||far.length<2)return null;

  const start=pick(near);
  const pool=standable.filter(c=>c.join()!==start.join());
  const cores=[];
  for(let i=0;i<cfg.hp;i++){
    const side=(i%2===0)?far:near;
    const c=pick(side.filter(c=>!cores.some(d=>d.join()===c.join())&&
                                 c.join()!==start.join()));
    if(!c)return null;
    cores.push(c);
  }
  const beats=[];
  for(let i=0;i<cfg.beats;i++){
    const ax=pick(cfg.axes);
    beats.push(ax==="y"?{axis:"y",at:pick([1,2])}
              :ax==="x"?{axis:"x",at:ri(0,W)}
              :{axis:"z",at:pick([0,1,zB,zB+1])});
  }
  return {name:cfg.name,hint:cfg.hint,boss:{period:cfg.period,cores,beats},
          start,goal:cores[0],blocks};
}

/* Four arenas, one per section, each built from the mechanics its section
   has taught. Periods are milliseconds now, not move ticks, and they tighten
   as the campaign goes on. */
const SECTIONS=[
  {name:"BOSS I", w:[4,5],hp:3,beats:2,period:2600,fire:300,axes:["x","z"],
   mech:[], min:12},
  {name:"BOSS II", w:[4,6],hp:3,beats:3,period:2400,fire:300,axes:["x","z","y"],
   mech:["spike"], min:14},
  {name:"BOSS III", w:[4,6],hp:4,beats:3,period:2200,fire:300,axes:["x","z","y"],
   mech:["glass","spike"], min:16},
  {name:"BOSS IV", w:[5,6],hp:5,beats:4,period:1900,fire:320,axes:["x","z","y"],
   mech:["crate","glass","spike"], min:20}
];

const out=[];
SECTIONS.forEach((cfg,idx)=>{
  let best=null;
  for(let s=1;s<=60000;s++){
    seed=s*7919+idx*104729;
    const lv=arena(cfg); if(!lv)continue;
    lv.boss.fire=cfg.fire;
    // 1 COMPLETABLE - every core can actually be reached, in order
    const r=solve(lv,true,150000);
    if(r.status!=="solved")continue;
    if(r.path.length<cfg.min)continue;
    // 2 FOLDED - a boss you can walk is not this game
    if(!r.path.includes("FLAT"))continue;
    // 3 SAFE - the arena never corners you. This is the bar that replaced
    //   the turn-based solver's proof, and it is the one that matters:
    //   it rules out dying with no move that would have saved you.
    const safe=bossSafety(lv);
    if(!safe.ok)continue;
    // 4 THREATENING - a sweep nobody could ever be caught by is scenery
    const R=ctx.makeRules(lv), B=ctx.makeBoss(lv);
    let menaced=0;
    lv.blocks.forEach(b=>{
      B.beats.forEach(sw=>{ if(B.hits(sw,0,"3",b[0],b[1]+1,b[2]))menaced++; });
    });
    if(menaced<4)continue;
    const rots=r.path.filter(p=>p.indexOf("rot")===0).length;
    const score=r.path.length+rots*3+menaced;
    if(!best||score>best.score)best={score,lv,r,rots,menaced,seed:s};
    if(best.score>=cfg.min+26)break;
  }
  if(!best){console.log("!! no arena for "+cfg.name);return;}
  const {lv,r,rots,menaced}=best;
  console.log(cfg.name.padEnd(9)+String(r.path.length).padStart(3)+" moves  rot "+rots+
    "  cores "+lv.boss.cores.length+"  period "+lv.boss.period+"ms"+
    "  beats "+lv.boss.beats.map(b=>b.axis+b.at).join(",")+
    "  menaced "+menaced+"  safe yes");
  out.push(lv);
});
fs.writeFileSync(path.join(__dirname,"bosses.json"),JSON.stringify(out,null,1));
console.log("\nwrote "+out.length+" -> tools/bosses.json");
