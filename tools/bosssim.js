"use strict";
/* Play each boss fight twice, badly and well, and insist on both answers.
 *
 *   node tools/bosssim.js          (also run by tools/verify.js)
 *
 * This exists because a playtester found the fight in about a minute and no
 * check I had could see it: stand still, wait for the boss to wander onto a
 * crush line, fold, repeat. Every static property still passed - the arena
 * was connected, the sweeps never cornered anyone, the boss was killable -
 * because none of them was about *play*. So the check has to play.
 *
 * Two policies, and a boss has to fail one and survive the other:
 *
 *   IDLE     never move, never turn, fold whenever the boss is crushable.
 *            This must NOT win. If it does, the fight is a waiting game.
 *   HERDER   dodge the incoming plane, keep the boss at arm's length, and
 *            take the hit by turning the camera so the square it is standing
 *            on becomes a line. This must win, or the fight is unwinnable -
 *            it is easy to make a boss unexploitable by making it immortal.
 *
 * Neither policy is a good player. They are a floor and a ceiling.
 */
const fs=require("fs"), vm=require("vm"), path=require("path");
const ROOT=path.join(__dirname,"..","js");
const ctx=vm.createContext({console,Set,Map,Math,JSON});
["01-coords.js","02-levels.js","03-rules.js"].forEach(f=>
  vm.runInContext(fs.readFileSync(path.join(ROOT,f),"utf8"),ctx,{filename:f}));
const {LEVELS,makeRules,makeBoss,bossNext,bossCrushAt,crateSet,crateKeys,AX,K}=ctx;


function sim(lv,policy,steps){
  const R=makeRules(lv), B=makeBoss(lv), cr=crateSet(crateKeys(lv));
  let boss={x:B.at[0],y:B.at[1],z:B.at[2]};
  let p={x:lv.start[0],y:lv.start[1],z:lv.start[2]};
  let v=0, hp=B.hp, stun=0, folds=0, moves=0, hits=0;
  for(let t=0;t<steps&&hp>0;t++){
    if(stun>0){stun--;}
    else { const n=bossNext(R,boss,p,cr,v); if(n)boss=n; }
    // a beat lands each tick: the travelling plane reaches every square
    const sw=B.beats[t%B.beats.length];
    if(B.hits(sw,v,"3",p.x,p.y,p.z)){hits++; if(hits>=3)return {killed:false,hp,folds,moves,hits,died:true};}
    // player policy runs after the boss's step, as a human reacting would
    const nextBeat=B.beats[(t+1)%B.beats.length];
    const act=policy({R,B,cr,boss,p,v,hp,stun,nextBeat});
    if(act&&act.move){p=act.move;moves++;}
    if(act&&act.view!==undefined)v=act.view;
    if(act&&act.fold){
      folds++;
      if(stun<=0&&bossCrushAt(R,boss,v,cr)){hp--;stun=6;}
    }
  }
  return {killed:hp<=0,hp,folds,moves,hits};
}
// the exploit: never move, never rotate, fold whenever it is green
const lazy=({R,boss,v,cr,stun})=>
  ({fold: stun<=0 && bossCrushAt(R,boss,v,cr)});

/* An actively-playing opponent: look one boss-step ahead over every place I
   could stand and every way I could face, and pick whatever most likely
   forces it onto a line. This is the check that the fight is still winnable
   at all - it is easy to make a boss unexploitable by making it unkillable. */
function herder({R,B,cr,boss,p,v,stun,nextBeat}){
  // already open in the current view: fold
  if(stun<=0&&bossCrushAt(R,boss,v,cr))return {fold:true};
  /* The kill the design actually intends: it is standing somewhere that is
     safe under this camera but is a line under another. Turn, and fold before
     it steps off. Rotating re-labels every line in the arena at once, which
     is what makes the camera the weapon rather than a convenience. */
  if(stun<=0)
    for(let nv=0;nv<4;nv++)
      if(nv!==v&&bossCrushAt(R,boss,nv,cr)&&
         !B.hits(nextBeat,nv,"3",p.x,p.y,p.z))
        return {view:nv,fold:true};
  // otherwise reposition: dodge the incoming plane, keep off its head
  const opts=[], spots=[[0,0],[1,0],[-1,0],[0,1],[0,-1]];
  for(const d of spots){
    const np={x:p.x+d[0],y:p.y,z:p.z+d[1]};
    if(!R.solid(np.x,np.y-1,np.z,cr)||R.solid(np.x,np.y,np.z,cr))continue;
    if(R.deadly3(np.x,np.y,np.z))continue;
    for(let nv=0;nv<4;nv++){
      const dist=Math.abs(boss.x-np.x)+Math.abs(boss.z-np.z);
      const doomed=B.hits(nextBeat,nv,"3",np.x,np.y,np.z);
      // being close enough that it must approach is how you box it in
      opts.push({np,nv,score:(doomed?-500:0)-Math.abs(dist-3)+(dist<=1?-50:0)});
    }
  }
  opts.sort((a,b)=>b.score-a.score);
  const best=opts[0];
  return best?{move:best.np,view:best.nv}:{};
}

function run(){
let bad=0;
console.log("A. standing still, folding on green (the exploit must FAIL):");
LEVELS.filter(l=>l.boss).forEach(lv=>{
  const r=sim(lv,lazy,600);
  if(r.killed)bad++;
  console.log("  "+lv.name.padEnd(26)+
    (r.died?"idle player killed by the sweeps after "+r.hits+" hits  -- exploit fails"
     :r.killed?"KILLED WITH 0 MOVES  <-- EXPLOITABLE"
             :"held out, hp "+r.hp+"/"+makeBoss(lv).hp+", player took "+r.hits+" sweep hits"));
});
console.log("\nB. actively herding it (must still be WINNABLE):");
LEVELS.filter(l=>l.boss).forEach(lv=>{
  const r=sim(lv,herder,600);
  if(!r.killed)bad++;
  console.log("  "+lv.name.padEnd(26)+
    (r.killed?"killed in "+r.moves+" moves, "+r.folds+" folds, "+r.hits+" sweep hits taken"
     :r.died?"HERDER DIED TO SWEEPS  <-- unwinnable"
             :"UNWINNABLE - hp "+r.hp+" left"));
});

// how much of each arena is a kill line, per view
console.log("\ncrush coverage (share of standable squares that are lines):");
LEVELS.filter(l=>l.boss).forEach(lv=>{
  const R=makeRules(lv), cr=crateSet(crateKeys(lv));
  const cells=[];
  lv.blocks.forEach(b=>{
    const c={x:b[0],y:b[1]+1,z:b[2]};
    if(!R.solid(c.x,c.y,c.z,cr))cells.push(c);
  });
  const per=[0,1,2,3].map(v=>
    Math.round(100*cells.filter(c=>bossCrushAt(R,c,v,cr)).length/cells.length));
  console.log("  "+lv.name.padEnd(26)+per.map(x=>String(x).padStart(3)+"%").join(" "));
});
return bad;
}
if(require.main===module){
  const bad=run();
  console.log("\n"+(bad?"FAIL":"PASS")+"  boss simulation, "+bad+" problem(s)");
  process.exit(bad?1:0);
}
module.exports={run};
