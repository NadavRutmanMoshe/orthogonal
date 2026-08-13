"use strict";
/* Play each boss fight twice, badly and well, and insist on both answers.
 *
 *   node tools/bosssim.js          (also run by tools/verify.js)
 *
 * This exists because a playtester broke two fight designs in about a minute
 * each, and no static check could see either one. The arena was connected,
 * nothing cornered anyone, the boss was killable - all true, all irrelevant,
 * because none of it was about *play*. So the check plays.
 *
 * Two policies, and a fight must fail one and survive the other:
 *
 *   IDLE     never moves. It folds whenever a fold would crush a hunter and
 *            not itself, so it is not merely passive - it takes every free
 *            kill offered. This must LOSE. If standing still and cashing
 *            gifts wins, the pack is scenery.
 *   DUELLIST keeps its distance, stands on columns that are safe for itself,
 *            and folds the moment the geometry turns against one of them.
 *            This must WIN, or the fight is unwinnable - it is easy to make
 *            a boss unexploitable by making it immortal, and that mistake
 *            has already been made once here.
 *
 * Neither is a good player. They are a floor and a ceiling. In particular the
 * duellist does not *herd* - it never picks a square in order to make a
 * hunter cross a kill line, which is the actual skill of this fight - so the
 * fights it wins are winnable by someone doing considerably less than the
 * design asks for.
 */
const fs=require("fs"), vm=require("vm"), path=require("path");
const ROOT=path.join(__dirname,"..","js");
const ctx=vm.createContext({console,Set,Map,Math,JSON});
["01-coords.js","02-levels.js","03-rules.js"].forEach(f=>
  vm.runInContext(fs.readFileSync(path.join(ROOT,f),"utf8"),ctx,{filename:f}));
const {LEVELS,makeRules,makeBoss,bossNext,bossLine,crushedBy,foldKills,
       resolveStep,FELL,crateSet,crateKeys,AX,K,bossBlocksAt}=ctx;

const TICK=50;      // ms per simulated frame
const ACT=200;      // ms between the player's inputs - a fast but human rate

// The arena as it stands once phase `i` has begun: what the level was
// authored with, plus everything that has risen since.
const blockView=(lv,i)=>({start:lv.start,blocks:bossBlocksAt(lv,i)});

/* A fight is a sequence of phases, so the simulation has to be one too.
 * Clearing the board advances it, which raises that phase's blocks - so the
 * rules, the standable floor and the crate set are all rebuilt rather than
 * captured once. Playing only the opening phase would measure a fiction, and
 * measuring a fiction is exactly the mistake this file exists to catch. */
function sim(lv,policy,ms){
  const B=makeBoss(lv);
  let phase=0;
  let board=blockView(lv,0), R=makeRules(board), cr=crateSet(crateKeys(board));
  const ph=()=>B.phases[phase];
  const spawn=()=>ph().at.map((a,i)=>({x:a[0],y:a[1],z:a[2],lock:0,shy:0,
                                       ms:i*ph().step/ph().at.length,
                                       step:ph().step}));
  let hs=spawn();
  let p={x:lv.start[0],y:lv.start[1],z:lv.start[2]};
  let v=0, lives=3, grace=0, creep=0, actMs=0, flat=null;
  let folds=0, moves=0, kills=0, t=0;
  /* Scratch for the policy, one per fight. The duellist keeps its patience
     counter here; it is cleared whenever the player is moved by something
     other than its own choice, because after that the distance it was
     measuring against is about a board it is no longer standing on. */
  const mem={};
  const clearMem=()=>{for(const k in mem)delete mem[k];};
  /* Advance, or report the win. Raising blocks can bury the player, and the
   * game lifts them out rather than crushing them, so the simulation does the
   * same - otherwise a phase change reads as a death nobody could have read. */
  const advance=()=>{
    phase++;
    if(phase>=B.phases.length)return true;
    board=blockView(lv,phase);R=makeRules(board);cr=crateSet(crateKeys(board));
    let guard=0;
    // Almost always flat, because folding is how a phase gets cleared. In the
    // plane the height you will come back down at is the real quantity, so
    // that is what rises - exactly liftPlayer() in the game.
    if(flat){while(R.siloSolid(v,flat.u,flat.y,cr)&&guard++<8)flat.y++;p.y=flat.y;}
    else while(R.solid(p.x,p.y,p.z,cr)&&guard++<8)p.y++;
    hs=spawn();grace=Math.max(grace,B.grace);creep=0;clearMem();
    return false;
  };
  const done=(o)=>Object.assign({secs:+(t/1000).toFixed(1),
                                 reached:Math.min(phase+1,B.phases.length)},o);
  const uOf=(vv,x,z)=>x*AX[vv].r[0]+z*AX[vv].r[2];

  // The same question the game asks, asked the same way: would folding from
  // where the player stands land on something standing here?
  const doomedIn=(vv,x,y,z)=>foldKills(R,vv,p,{x,y,z},cr);
  const doomed=(x,y,z)=>doomedIn(v,x,y,z);
  const stepTo=(from,dx,dz)=>{
    const nx=from.x+dx, nz=from.z+dz;
    const ny=resolveStep(h=>R.solid(nx,h,nz,cr),from.y,
                         h=>R.solid(from.x,h,from.z,cr));
    if(ny===null||ny===FELL||R.deadly3(nx,ny,nz))return null;
    return {x:nx,y:ny,z:nz};
  };
  /* Touching, and the reason folding is not free. Flattened you are a whole
     silhouette column rather than a square, so a hunter anywhere along it
     reaches you - which is the cost the game charges for the attack and the
     thing an instantaneous fold in an earlier version of this simulator hid
     completely. With it modelled, standing still and folding on every gift
     stopped winning, because the gifts are collected from inside the plane. */
  const touched=()=>flat
    ? hs.some(h=>h.y===flat.y&&uOf(v,h.x,h.z)===flat.u)
    : hs.some(h=>h.x===p.x&&h.y===p.y&&h.z===p.z);
  // While you are flat they can only see the column, so they walk at the
  // nearest square of it - exactly huntGoal() in the game.
  const goalFor=(h)=>{
    if(!flat)return p;
    let best=null,bd=1e9;
    for(const b of board.blocks){
      if(uOf(v,b[0],b[2])!==flat.u)continue;
      const d=Math.abs(b[0]-h.x)+Math.abs(b[2]-h.z);
      if(d<bd){bd=d;best={x:b[0],y:b[1]+1,z:b[2]};}
    }
    return best||p;
  };

  while(t<ms){
    t+=TICK;
    if(grace>0)grace=Math.max(0,grace-TICK);
    creep+=TICK;
    if(creep>=B.creepEvery){creep=0;
      hs.forEach(h=>{h.step=Math.max(B.floorStep,h.step*B.creep);});}

    // A line on the player: the same relation the fold uses, which is the
    // point - it is one line and whoever acts on it first wins it.
    const lineOn=(h)=>flat
      ? ((uOf(v,h.x,h.z)===flat.u&&h.y===flat.y)?{dx:0,dz:0}:null)
      : bossLine(R,h,p,cr);
    let hit=null;
    for(let i=0;i<hs.length;i++){
      const h=hs[i];
      if(h.lock>0){
        if(!lineOn(h)){h.lock=0;continue;}       // the line broke: it walks
        h.lock-=TICK;
        if(h.lock<=0){h.lock=0;h.x=p.x;h.y=p.y;h.z=p.z;hit="charged";break;}
        continue;
      }
      h.ms+=TICK;
      if(h.ms<h.step)continue;
      h.ms=0;
      const goal=goalFor(h);
      // Three grades, exactly as the game asks it: 0 no line, 1 a line, 2 a
      // line the player cannot fold on from where they stand.
      const nx=bossNext(R,h,goal,cr,(c)=>{
        const has=flat?(uOf(v,c.x,c.z)===flat.u&&c.y===flat.y)
                      :!!bossLine(R,c,goal,cr);
        if(!has)return 0;
        if(flat)return 1;
        return doomed(c.x,c.y,c.z)?1:2;
      });
      if(nx&&!hs.some((o,j)=>j!==i&&o.x===nx.x&&o.y===nx.y&&o.z===nx.z)){
        h.x=nx.x;h.y=nx.y;h.z=nx.z;
      }
      if(grace<=0&&touched()){hit="reached";break;}
      if(lineOn(h)){
        // Declines a line the player could answer, but only while declining
        // is cheap - the same patience valve the game uses, and without it
        // this policy would be measuring an opponent that never attacks.
        if(ph().cunning&&!flat&&h.shy<ph().hold&&doomed(h.x,h.y,h.z))h.shy++;
        else {h.shy=0;h.lock=ph().aim;}
      }
    }
    if(hit&&grace<=0){
      lives--;grace=B.grace;hs=spawn();flat=null;clearMem();
      if(lives<=0)return done({win:false,lives,kills,folds,moves,why:hit});
    }
    if(!hs.length&&advance())return done({win:true,lives,kills,folds,moves});

    actMs+=TICK;
    if(actMs<ACT)continue;
    actMs=0;
    const act=policy({R,B,cr,hs,p,v,flat,doomed,doomedIn,stepTo,uOf,crushedBy,lineOn,mem});
    if(!act)continue;
    // Flat: the only thing to decide is when to stand back up, and standing
    // there is what costs you.
    if(flat){
      if(!act.pop)continue;
      const land=R.landings(v,flat.u,flat.y,cr);
      if(land.length){
        const b=R.pick(land);
        p={x:b.x,y:flat.y,z:b.z};
      }
      flat=null;moves++;
      if(grace<=0&&touched()){
        lives--;grace=B.grace;hs=spawn();clearMem();
        if(lives<=0)return done({win:false,lives,kills,folds,moves,why:"popped onto one"});
      }
      continue;
    }
    if(act.fold){
      folds++;
      // Everything in a filled column goes, exactly as bossFoldCrush() does
      // it: the whole set is decided before any of them is removed, or the
      // first to die would save the second.
      const dead=hs.map(h=>doomed(h.x,h.y,h.z));
      // Taken before anything resolves, because clearing a phase raises that
      // phase's pillars and asking afterwards asks a world that has grown one.
      const mine=crushedBy(R,v,p.x,p.y,p.z,cr);
      hs=hs.filter((h,i)=>!dead[i]);
      kills+=dead.filter(Boolean).length;
      if(dead.some(Boolean))
        hs.forEach(h=>{h.step=Math.max(B.floorStep,h.step*B.rage);});
      if(mine){
        // Crushed is a death, so it spends a life and puts the player back at
        // the start, standing, facing the way the level opens - spendLife().
        lives--;grace=B.grace;hs=spawn();clearMem();
        if(lives<=0)return done({win:false,lives,kills,folds,moves,why:"folded into one"});
        p={x:lv.start[0],y:lv.start[1],z:lv.start[2]};
        flat=null;v=0;
        continue;                       // crushed, so never in the plane
      }
      flat={u:uOf(v,p.x,p.z),y:p.y};moves++;
      if(!hs.length){
        if(advance())return done({win:true,lives,kills,folds,moves});
        /* Clearing a phase puts the player back where the fight started - the
           start square, the volume, and the starting rotation - so the walk
           back is part of the fight and has to be part of the measurement. A
           simulation that lets the policy keep its ground is measuring the
           spawn-camp this rule removes. Killing one of a phase's two hunters
           moves nobody. */
        p={x:lv.start[0],y:lv.start[1],z:lv.start[2]};
        flat=null;v=0;
      }
      continue;
    }
    if(act.turn!==undefined){v=(v+act.turn+4)%4;moves++;continue;}
    if(act.mv){
      const n=stepTo(p,act.mv[0],act.mv[1]);
      if(n){p=n;moves++;}
      if(grace<=0&&touched()){
        lives--;grace=B.grace;hs=spawn();clearMem();
        if(lives<=0)return done({win:false,lives,kills,folds,moves,why:"walked into one"});
      }
    }
  }
  return done({win:false,lives,kills,folds,moves,why:"time"});
}

// Never moves. Takes every kill it is handed, and only those - and stands
// straight back up, because a policy that stays flat is not idle, it is bad.
function idle({R,cr,hs,p,v,flat,doomed,crushedBy}){
  if(flat)return {pop:true};
  if(crushedBy(R,v,p.x,p.y,p.z,cr))return null;
  return hs.some(h=>doomed(h.x,h.y,h.z))?{fold:true}:null;
}

/* Keeps away, and uses the one tool the fight is built on: a hunter dodges
   the columns that are lethal *in the view it can see*, so turning the world
   ninety degrees relabels every one of them at once and leaves it standing
   in a shadow it had no way to plan around. It then has exactly one step to
   walk out, which is the window this policy folds into.

   That is the whole ceiling: turn, look, fold. It never herds anything - it
   does not choose where to stand in order to put a hunter anywhere - so a
   fight it can win is winnable by doing much less than the design asks. */
function duellist({R,B,cr,hs,p,v,flat,doomed,stepTo,uOf,doomedIn,crushedBy,mem}){
  if(flat)return {pop:true};
  if(hs.some(h=>doomed(h.x,h.y,h.z)))return {fold:true};
  // Not lined up from here. Would a quarter turn line one of them up? This
  // is the cheapest aim there is: nothing moves but the axis.
  for(const turn of [1,-1,2]){
    const nv=(v+turn+4)%4;
    if(crushedBy(R,nv,p.x,p.y,p.z,cr))continue;
    if(hs.some(h=>doomedIn(nv,h.x,h.y,h.z)))return {turn};
  }
  /* Otherwise go and get the alignment: step toward the line of the nearest
     hunter, and prefer a square that is not in a pillar's column, because
     that is a square you cannot attack from. Crude - it walks at them rather
     than around them, and it never uses distance for safety. */
  let tgt=null,td=1e9;
  for(const h of hs){
    const d=Math.abs(h.x-p.x)+Math.abs(h.z-p.z);
    if(d<td){td=d;tgt=h;}
  }
  if(!tgt)return null;
  /* Patience, and it is the same valve the hunters needed for the same
     reason. Refusing to stand in a pillar's shadow is worth more than one
     step of distance, so when the only square that closes is a shadowed one
     the policy declines it, steps back, closes again, and paces between two
     squares forever while it is charged - the hunters' two-square loop,
     rediscovered in the player. Measured against its *best* distance rather
     than its last, so a policy that oscillates cannot keep resetting the
     count; after two steps that fail to improve on it, shadows stop being
     worth anything and it walks in. Crossing one was always safe - it is
     folding from one that kills - so this costs nothing but the reluctance. */
  if(mem){
    if(mem.best===undefined||td<mem.best){mem.best=td;mem.wait=0;}
    else mem.wait=(mem.wait||0)+1;
  }
  const shy=(mem&&(mem.wait||0)>=2)?0:6;
  let best=null;
  for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){
    const n=stepTo(p,d[0],d[1]);
    if(!n)continue;
    if(hs.some(h=>h.x===n.x&&h.y===n.y&&h.z===n.z))continue;   // not into one
    /* Height is worth more than distance because it is worth everything:
       foldKills() wants the same y, so a square at the wrong height is one
       you cannot attack from at all. Without this the policy climbs the first
       pillar between it and a hunter and then oscillates on and off it
       forever, one storey above anything it could kill - the hunters' own
       two-square loop, rediscovered in the player. It read as an unwinnable
       arena and was nothing of the kind. */
    const lined=(n.y===tgt.y&&uOf(v,n.x,n.z)===uOf(v,tgt.x,tgt.z))?1:0;
    const score=lined*10-(crushedBy(R,v,n.x,n.y,n.z,cr)?shy:0)
      -Math.abs(n.y-tgt.y)*8
      -(Math.abs(n.x-tgt.x)+Math.abs(n.z-tgt.z));
    if(!best||score>best.score)best={d,score};
  }
  return best?{mv:best.d}:null;
}

function run(){
  let bad=0;
  /* The twin is deliberately not simulated. This file models one fight - the
     pack, its lines and its charges - and the twin is a different animal
     with a different kill rule, so running it through here does not measure
     the twin, it measures a fiction. Writing a second simulator to bracket a
     fight that is still being felt out would be building the expensive kind
     of confidence about something that may not survive the week. bossArena()
     still checks its stage in verify.js; the rest is playtesting, on
     purpose. */
  const bosses=LEVELS.filter(l=>l.boss&&!l.boss.twin);
  const skipped=LEVELS.filter(l=>l.boss&&l.boss.twin);
  skipped.forEach(lv=>console.log("  (not simulated: "+lv.name+
    " - different fight, played by hand)"));
  console.log("A. idle - never move, take every free kill (must LOSE):");
  bosses.forEach(lv=>{
    const r=sim(lv,idle,90000);
    const ok=!r.win;
    if(!ok)bad++;
    console.log("  "+lv.name.padEnd(24)+(ok?"lost":"FAILED - it won")+
      "  ("+r.kills+" free kills, reached phase "+r.reached+"/"+
      makeBoss(lv).phases.length+", "+(3-r.lives)+" hits in "+r.secs+"s)");
  });
  console.log("\nB. duelling it properly (must WIN):");
  bosses.forEach(lv=>{
    const r=sim(lv,duellist,150000);
    if(!r.win)bad++;
    console.log("  "+lv.name.padEnd(24)+(r.win
      ? "cleared in "+r.secs+"s with "+r.lives+"/3 lives, "+r.folds+" folds, "+r.moves+" moves"
      : "FAILED - "+r.why+", stuck in phase "+r.reached+"/"+
        makeBoss(lv).phases.length+" after "+r.secs+"s"));
  });
  return bad;
}
module.exports={run,sim,idle,duellist};
if(require.main===module)process.exit(run()?1:0);
