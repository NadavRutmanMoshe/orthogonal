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
const {LEVELS,solve,makeRules,resolveStep,AX,bossSafety,bossArena,trialSafety,
       LEVEL_RENAMES}=ctx;

/* LEVEL_RENAMES holds every save that has ever existed, and migrateNames()
 * applies it in a single unordered pass. Two properties make that pass safe,
 * and neither is visible by reading the table - it is nearly three hundred
 * entries long and it is meant to be *composed*, never regenerated. So they
 * are asserted here instead:
 *
 *   - every value names a level that exists now. A value pointing at a name
 *     nothing is called any more is a save that migrates into thin air.
 *   - no value is also a key that points somewhere else. If it were, whether
 *     the chain resolved would depend on the order the pass happened to
 *     enumerate in, so the same save would migrate differently on different
 *     runs. A key that maps to *itself* is fine and does happen: numbers come
 *     back round, and a save under that name is already correct.
 *
 * Regenerating this table from scratch once broke the oldest saves. See
 * docs/HISTORY.md.
 */
function checkRenames(){
  const live=new Set(LEVELS.map(l=>l.name)), fails=[];
  const keys=Object.keys(LEVEL_RENAMES);
  keys.forEach(k=>{
    const v=LEVEL_RENAMES[k];
    if(!live.has(v))fails.push('"'+k+'" -> "'+v+'", which is not a level');
    if(k!==v&&LEVEL_RENAMES[v]!==undefined&&LEVEL_RENAMES[v]!==v)
      fails.push('"'+k+'" -> "'+v+'", which is itself a key -> "'+
                 LEVEL_RENAMES[v]+'" (order-dependent)');
  });
  if(fails.length){
    console.log("  RENAMES  "+fails.length+" broken:");
    fails.slice(0,12).forEach(f=>console.log("    "+f));
    if(fails.length>12)console.log("    ... and "+(fails.length-12)+" more");
  }
  return fails.length?1:0;
}

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
    return;
  }
  /* A trial is three targets in sequence, so "solvable" has to mean every
     leg of it - start to the first core, then core to core. Checking only
     the first would have passed a trial whose way back was a wall, which is
     exactly what the glass made of one of them. */
  if(lv.trial&&lv.trial.cores){
    let from=null, legFail=null, legs=[];
    lv.trial.cores.forEach((c,n)=>{
      if(legFail)return;
      const lr=solve({...lv,goal:c}, lv.rotate!==false, 250000, from);
      if(lr.status!=="solved")legFail="leg "+(n+1)+" -> "+lr.status;
      else legs.push(lr.path.length);
      from={mode:"3",x:c[0],y:c[1],z:c[2],view:0};
    });
    if(legFail){
      bad++;
      console.log("  LEG   ["+i+"] "+lv.name+"  ->  "+legFail);
      return;
    }
    if(only!==undefined||process.env.VERBOSE)
      console.log("  ok    ["+i+"] "+lv.name+"  legs "+legs.join("+")+
        " moves  ·  sweeps fair");
  }
  /* A trial is an ordinary level with a clock bolted on, so it gets the
     ordinary proof - BFS says the geometry admits a route - and then one
     more that BFS has no standing to give: that no beat can corner you.
     Both matter. The first says the puzzle is a puzzle; the second says the
     clock is an opponent rather than a coin toss. */
  if(lv.trial){
    const s=trialSafety(lv);
    if(!s.ok){
      bad++;
      console.log("  SWEEP ["+i+"] "+lv.name+"  ->  "+
        [].concat(s.trapped.length?[s.trapped.length+" cells cornered by a sweep"]:[],
                  s.born?["you respawn inside the first beat"]:[]).join("; "));
      return;
    }
  }
  if(only!==undefined || process.env.VERBOSE){
    console.log("  ok    ["+i+"] "+lv.name+"  "+r.path.length+" moves:  "+r.path.join(" ")+
      (lv.trial?"  ·  sweeps fair":""));
  }
});
// Static checks cannot see a degenerate strategy, so the fights get played.
if(only===undefined){
  bad+=checkRenames();
  console.log("");
  bad+=require("./bosssim.js").run();
}
console.log((bad?"FAIL":"PASS")+"  "+checked+" level(s) checked, "+bad+" bad");
process.exit(bad?1:0);
