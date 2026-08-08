"use strict";
/* Dump the difficulty curve: every level's solver-derived score, in order.
 *
 *   node tools/curve.js
 *
 * CLAUDE.md's first agreed next step asks for exactly this before any level
 * is moved: the chapter order is how the levels were built, not necessarily
 * how they should be played, and statsFor() is the only machine-readable
 * opinion available about which is which.
 */
const fs=require("fs"), vm=require("vm"), path=require("path");
const JS=path.join(__dirname,"..","js");
const ctx=vm.createContext({console,Set,Map,Math,JSON});
["01-coords.js","02-levels.js","03-rules.js","04-solver.js","07-difficulty.js"]
  .forEach(f=>vm.runInContext(fs.readFileSync(path.join(JS,f),"utf8"),ctx,{filename:f}));
const {LEVELS,statsFor,tierOf}=ctx;

const KINDS={0:"",1:"glass",2:"anchor",3:"crate",4:"spike"};
let prev=null;
LEVELS.forEach((lv,i)=>{
  const s=statsFor(lv);
  const kinds=new Set();
  lv.blocks.forEach(b=>{ if(b[3])kinds.add(KINDS[b[3]]); });
  if(lv.keys&&lv.keys.length)kinds.add("keys");
  const d=(prev!==null&&s.ok)?(s.score-prev):0;
  const arrow=!s.ok?"    ":(d>0?"+"+d:String(d)).padStart(4);
  console.log(
    String(i).padStart(2)+"  "+lv.name.padEnd(28)+
    (s.ok?String(s.score).padStart(3):" --")+"  "+arrow+"  "+
    (s.ok?tierOf(s.score).padEnd(9):"UNSOLVED ")+
    (s.ok?(s.moves+"mv "+s.flattens+"f "+s.rots+"r"+(s.needsRot?" ROT":"")).padEnd(20):"".padEnd(20))+
    [...kinds].join(",")+(lv.tutorial?"  [tutorial]":""));
  if(s.ok)prev=s.score;
});
