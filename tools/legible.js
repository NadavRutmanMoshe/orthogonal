"use strict";
/* Which empty squares LOOK like they have ground under them?
 *
 *   node tools/legible.js            every level
 *   node tools/legible.js 09         one level, or a name fragment
 *
 * The projection is orthographic and tilted, so screen-vertical carries
 * height and depth added together. Worked out exactly, one unit of height is
 * 0.885 screen units up and one unit of depth is 0.466 down - so a block two
 * squares further back draws within a twentieth of a cell of where a block
 * one square LOWER would draw. Those two are not the same thing at all: one
 * is out of reach, and the other is a step down you can take.
 *
 * That is the misread, stated precisely. Standing on S and stepping in
 * direction d you fall out of the world - but some block draws almost exactly
 * where ground would have to be for that step to have worked, so the level
 * told you it was safe. It costs a life to find out otherwise.
 *
 * Only blocks well away in the world count: something actually next to the
 * gap is a near-miss you can read, and the block you are standing on is never
 * a surprise. Nothing here fails a build - a near-miss is sometimes the
 * puzzle, and only a person can say which.
 *
 * Two knobs, both there because they were needed to answer real questions:
 *
 *   MAXDROP=n   how far a drop may be and still read as somewhere you could
 *               step. Default 1. At 0 - a block drawn exactly where a LEVEL
 *               step would land, the least deniable case - 30 levels are
 *               flagged and 9 of those lie from the start square, where the
 *               first press of the level is a death.
 *
 *   TILT=n      re-ask the whole question at a different camera angle. This
 *               exists because the obvious theory - that the tilt makes one
 *               unit of height and two of depth almost equal, so just change
 *               the tilt - had to be tested rather than believed. Measured
 *               against MAXDROP=0:
 *
 *                 tilt   height:depth   levels   from the start
 *                 0.40      1 : 2.94      36          11
 *                 0.62      1 : 1.90      30           9   <- shipping
 *                 0.75      1 : 1.57      29          10
 *                 0.85      1 : 1.38      30          11
 *                 0.95      1 : 1.24      11           5
 *                 1.10      1 : 1.07      10           5
 *
 *               So small changes do nothing - the coincidence just moves to a
 *               different pair - but there is a cliff once the camera is
 *               steep enough that a whole cell of depth outruns a cell of
 *               height. That is a real lever and a big change to how the game
 *               looks, so it is a decision rather than a fix.
 */
const fs=require("fs"), vm=require("vm"), path=require("path");
const JS=path.join(__dirname,"..","js");
const ctx=vm.createContext({console,Set,Map,Math,JSON});
["01-coords.js","02-levels.js","03-rules.js","04-solver.js"].forEach(f=>
  vm.runInContext(fs.readFileSync(path.join(JS,f),"utf8"),ctx,{filename:f}));
const {LEVELS,makeRules,resolveStep,crateSet,crateKeys,FELL}=ctx;

const TILT=(+process.env.TILT||0.62)*34, DIST=40;
function screenAxes(view){
  const a=view*Math.PI/2;
  const f=[Math.sin(a)*DIST,TILT,Math.cos(a)*DIST];
  const L=Math.hypot(f[0],f[1],f[2]), fwd=[f[0]/L,f[1]/L,f[2]/L];
  const r=[fwd[2],0,-fwd[0]], rl=Math.hypot(r[0],r[1],r[2]);
  const right=[r[0]/rl,r[1]/rl,r[2]/rl];
  const up=[fwd[1]*right[2]-fwd[2]*right[1],fwd[2]*right[0]-fwd[0]*right[2],
            fwd[0]*right[1]-fwd[1]*right[0]];
  return {right,up};
}
const AXES=[0,1,2,3].map(screenAxes);
function px(v,x,y,z){const A=AXES[v];
  return [x*A.right[0]+y*A.right[1]+z*A.right[2],
          x*A.up[0]+y*A.up[1]+z*A.up[2]];}

const NEAR=0.45;   // screen cells: closer than this and the eye cannot separate them
const FAR=2;       // world cells: nearer than this and it reads as the near-miss it is
const only=process.argv[2];
let flagged=0, worst=[];
LEVELS.forEach((lv,i)=>{
  if(only!==undefined && String(i)!==only && lv.name.indexOf(only)<0) return;
  if(lv.boss) return;
  const R=makeRules(lv), cr=crateSet(crateKeys(lv));
  const stand=[];
  lv.blocks.forEach(b=>{const c=[b[0],b[1]+1,b[2]];
    if(!R.solid(c[0],c[1],c[2],cr)&&!R.deadly3(c[0],c[1],c[2]))stand.push(c);});
  const hits=[];
  stand.forEach(S=>{
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>{
      const nx=S[0]+d[0], nz=S[2]+d[1];
      const ny=resolveStep(h=>R.solid(nx,h,nz,cr),S[1],h=>R.solid(S[0],h,S[2],cr));
      if(ny!==FELL) return;                 // it works, or it is a wall you can see
      let best=null;
      // ground at any of these heights would have saved the step: level, or a
      // drop of one, two, three. Those are the shapes the eye is looking for.
      var MAXDROP=+(process.env.MAXDROP||1);
      for(let h=S[1]-1;h>=S[1]-1-MAXDROP;h--){
        const want=px(0,nx,h,nz);
        lv.blocks.forEach(b=>{
          if(b[0]===nx&&b[2]===nz)return;                    // the honest column
          const wd=Math.max(Math.abs(b[0]-nx),Math.abs(b[2]-nz));
          if(wd<FAR)return;                                  // a readable near-miss
          const p=px(0,b[0],b[1],b[2]);
          const dd=Math.hypot(p[0]-want[0],p[1]-want[1]);
          if(dd<NEAR&&(!best||dd<best.d))best={d:dd,b:b,drop:S[1]-1-h};
        });
      }
      if(best)hits.push({from:S,dir:d,ghost:best.b,d:best.d,drop:best.drop,
        start:(S[0]===lv.start[0]&&S[1]===lv.start[1]&&S[2]===lv.start[2])});
    });
  });
  if(!hits.length)return;
  hits.sort((a,b)=>(b.start-a.start)||(a.d-b.d));
  flagged++;
  console.log("\n"+lv.name+"   ("+hits.length+")");
  hits.slice(0,3).forEach(h=>{
    console.log("   ["+h.from+"]"+(h.start?" START":"")+" step "+
      (h.dir[0]?(h.dir[0]>0?"+x":"-x"):(h.dir[1]>0?"+z":"-z"))+
      " is a fall, but ["+h.ghost+"] sits "+h.d.toFixed(2)+" cells from where a "+
      (h.drop?("drop of "+h.drop):"level step")+" would land");
  });
  if(hits.length>3)console.log("   ... and "+(hits.length-3)+" more");
  worst.push([lv.name,hits.filter(h=>h.start).length,hits.length]);
});
console.log("\n"+flagged+" level(s) flagged");
const st=worst.filter(w=>w[1]).map(w=>w[0]);
if(st.length)console.log("from the START square, where it costs a life first move:\n  "+st.join("\n  "));
