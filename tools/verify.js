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
const {LEVELS,solve,makeRules,resolveStep,AX,bossSafety,bossArena}=ctx;

const only=process.argv[2];
let bad=0, checked=0;
LEVELS.forEach((lv,i)=>{
  if(only!==undefined && String(i)!==only && lv.name.indexOf(only)!==0) return;
  checked++;
  if(lv.boss){
    /* A boss has no goal square and no move sequence that finishes it - it is
       a real-time opponent, so there is nothing for BFS to search. What is
       checkable is the stage: that it can reach you, that there are enough
       crates you can actually swing, and that no sweep ever corners you. */
    const a=bossArena(lv), safe=bossSafety(lv);
    const why=(a.fail||[]).concat(safe.ok?[]:[safe.trapped.length+" cells cornered by a sweep"]);
    if(why.length){
      bad++;
      console.log("  ARENA ["+i+"] "+lv.name+"  ->  "+why.join("; "));
    } else if(only!==undefined || process.env.VERBOSE){
      console.log("  ok    ["+i+"] "+lv.name+"  arena "+a.squares+" squares, "+
        a.kills+" crush spots, "+a.crates+" crates, sweeps fair");
    }
    return;
  }
  const r=solve(lv, lv.rotate!==false, 250000);
  if(r.status!=="solved"){
    bad++;
    console.log("  FAIL  ["+i+"] "+lv.name+"  ->  "+r.status);
  } else if(only!==undefined || process.env.VERBOSE){
    console.log("  ok    ["+i+"] "+lv.name+"  "+r.path.length+" moves:  "+r.path.join(" "));
  }
});
// Static checks cannot see a degenerate strategy, so the fights get played.
if(only===undefined){
  console.log("");
  bad+=require("./bosssim.js").run();
}
console.log((bad?"FAIL":"PASS")+"  "+checked+" level(s) checked, "+bad+" bad");
process.exit(bad?1:0);
