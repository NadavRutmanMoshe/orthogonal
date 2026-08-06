"use strict";
/* Verify every level with the solver, without a browser.
 *
 *   node tools/verify.js            check all levels
 *   node tools/verify.js 12         check one, and print its optimal path
 *
 * This loads the real game modules rather than a copy of them, so it can
 * never drift out of sync with what the game actually does. That property
 * is the whole point: the solver and the game share resolveStep and
 * makeRules, so if they ever disagree, this script is wrong too - which is
 * exactly the failure you want, because it is loud.
 */
const fs=require("fs"), vm=require("vm"), path=require("path");
const JS=path.join(__dirname,"..","js");
const ctx=vm.createContext({console,Set,Map,Math,JSON});
["01-coords.js","02-levels.js","03-rules.js","04-solver.js"].forEach(f=>{
  vm.runInContext(fs.readFileSync(path.join(JS,f),"utf8"),ctx,{filename:f});
});
const {LEVELS,solve,makeRules,resolveStep,AX}=ctx;

const only=process.argv[2];
let bad=0, checked=0;
LEVELS.forEach((lv,i)=>{
  if(only!==undefined && String(i)!==only && lv.name.indexOf(only)!==0) return;
  checked++;
  const r=solve(lv, lv.rotate!==false, 250000);
  if(r.status!=="solved"){
    bad++;
    console.log("  FAIL  ["+i+"] "+lv.name+"  ->  "+r.status);
  } else if(only!==undefined || process.env.VERBOSE){
    console.log("  ok    ["+i+"] "+lv.name+"  "+r.path.length+" moves:  "+r.path.join(" "));
  }
});
console.log((bad?"FAIL":"PASS")+"  "+checked+" level(s) checked, "+bad+" unsolvable");
process.exit(bad?1:0);
