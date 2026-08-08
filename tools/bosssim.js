"use strict";
/* Play each boss fight twice, badly and well, and insist on both answers.
 *
 *   node tools/bosssim.js          (also run by tools/verify.js)
 *
 * This exists because a playtester broke the previous two fight designs in
 * about a minute each, and no static check could see either one. The arena
 * was connected, nothing cornered anyone, the boss was killable - all true,
 * all irrelevant, because none of it was about *play*. So the check plays.
 *
 * Two policies, and a boss must fail one and survive the other:
 *
 *   IDLE     never move, never turn, fold whenever a fold would land a hit.
 *            This must LOSE. If a do-nothing loop wins, the fight is a
 *            waiting game with extra steps.
 *   DUELLIST breaks the firing line when the gun is aimed, then lines up and
 *            folds during the OPEN beat. This must WIN, or the fight is
 *            unwinnable - it is easy to make a boss unexploitable by making
 *            it immortal, and that mistake has already been made once here.
 *
 * Neither is a good player. They are a floor and a ceiling.
 */
const fs=require("fs"), vm=require("vm"), path=require("path");
const ROOT=path.join(__dirname,"..","js");
const ctx=vm.createContext({console,Set,Map,Math,JSON});
["01-coords.js","02-levels.js","03-rules.js"].forEach(f=>
  vm.runInContext(fs.readFileSync(path.join(ROOT,f),"utf8"),ctx,{filename:f}));
const {LEVELS,makeRules,makeBoss,bossNext,bossAimDir,shotNext,
       crateSet,crateKeys,AX,K}=ctx;

const TICK=100;   // ms per simulated frame

function sim(lv,policy,ms){
  const R=makeRules(lv), B=makeBoss(lv), cr=crateSet(crateKeys(lv));
  let boss={x:B.at[0],y:B.at[1],z:B.at[2]};
  let p={x:lv.start[0],y:lv.start[1],z:lv.start[2]};
  let v=0, hp=B.hp, lives=3, phase="aim", pms=0, aim=null;
  let shots=[], moveMs=0, shotMs=0, stun=0, folds=0, moves=0, hitsTaken=0;
  const uOf=(vv,x,z)=>x*AX[vv].r[0]+z*AX[vv].r[2];

  for(let t=0;t*TICK<ms&&hp>0&&lives>0;t++){
    // ---- projectiles
    shotMs+=TICK;
    if(shotMs>=B.shotStep){
      shotMs=0;
      const keep=[];
      for(const s of shots){
        const n=shotNext(R,s,cr);
        if(!n)continue;
        if(Math.abs(n.x)>40||Math.abs(n.z)>40)continue;
        if(n.x===p.x&&n.y===p.y&&n.z===p.z){lives--;hitsTaken++;shots=[];phase="aim";pms=0;aim=null;boss={x:B.at[0],y:B.at[1],z:B.at[2]};p={x:lv.start[0],y:lv.start[1],z:lv.start[2]};break;}
        keep.push(n);
      }
      if(lives<=0)break;
      shots=keep;
      // the window opens when the bullet is spent, never while it is flying
      if(phase==="fire"&&!shots.length){phase="open";pms=0;}
    }
    // ---- the boss
    if(stun>0){stun-=TICK;}
    else{
      if(phase==="aim"&&!aim){
        moveMs+=TICK;
        if(moveMs>=B.step){moveMs=0;const n=bossNext(R,boss,p,cr);if(n)boss=n;}
      }
      if(boss.x===p.x&&boss.z===p.z&&boss.y===p.y){
        lives--;hitsTaken++;boss={x:B.at[0],y:B.at[1],z:B.at[2]};
        p={x:lv.start[0],y:lv.start[1],z:lv.start[2]};shots=[];continue;
      }
      pms+=TICK;
      if(phase==="aim"){
        if(!aim){aim=bossAimDir(R,boss,p,cr); if(aim)pms=0;}
        if(aim&&pms>=B.aim){
          shots.push({x:boss.x,y:boss.y,z:boss.z,dx:aim.dx,dz:aim.dz});
          phase="fire";pms=0;aim=null;
        }
      } else if(phase==="open"&&pms>=B.open){phase="aim";pms=0;}
    }
    // ---- the player
    const open=phase==="open"&&stun<=0;
    const act=policy({R,B,cr,boss,p,v,open,aim,shots,uOf});
    if(act&&act.move){p=act.move;moves++;}
    if(act&&act.view!==undefined)v=act.view;
    if(act&&act.fold){
      folds++;
      if(open&&uOf(v,boss.x,boss.z)===uOf(v,p.x,p.z)&&boss.y===p.y){
        hp--;stun=B.stun;phase="aim";pms=0;aim=null;
      }
    }
  }
  return {killed:hp<=0,hp,lives,folds,moves,hitsTaken};
}

// never move, never turn, fold whenever it would land
const idle=({R,boss,p,v,open,uOf})=>
  ({fold: open && uOf(v,boss.x,boss.z)===uOf(v,p.x,p.z) && boss.y===p.y});

/* Break the line while it aims; line up and fold while it is open. Looks one
   frame ahead only - deliberately shallow, so that clearing this bar is a
   floor rather than proof the fight is interesting. */
function duellist({R,B,cr,boss,p,v,open,aim,shots,uOf}){
  const danger=(q)=>{
    for(const s of shots){
      if(s.dz===0&&q.z===s.z&&Math.sign(q.x-s.x)===s.dx)return true;
      if(s.dx===0&&q.x===s.x&&Math.sign(q.z-s.z)===s.dz)return true;
    }
    if(aim){
      if(aim.dz===0&&q.z===boss.z&&Math.sign(q.x-boss.x)===aim.dx)return true;
      if(aim.dx===0&&q.x===boss.x&&Math.sign(q.z-boss.z)===aim.dz)return true;
    }
    return false;
  };
  if(open)
    for(let nv=0;nv<4;nv++)
      if(uOf(nv,boss.x,boss.z)===uOf(nv,p.x,p.z)&&boss.y===p.y&&!danger(p))
        return {view:nv,fold:true};
  const opts=[], step=[[0,0],[1,0],[-1,0],[0,1],[0,-1]];
  for(const d of step){
    const np={x:p.x+d[0],y:p.y,z:p.z+d[1]};
    if(!R.solid(np.x,np.y-1,np.z,cr)||R.solid(np.x,np.y,np.z,cr))continue;
    if(R.deadly3(np.x,np.y,np.z))continue;
    const dist=Math.abs(boss.x-np.x)+Math.abs(boss.z-np.z);
    let score=(danger(np)?-100:0)-Math.abs(dist-3)+(dist<=1?-40:0);
    // being able to share a column when it opens is worth positioning for
    for(let nv=0;nv<4;nv++)
      if(uOf(nv,boss.x,boss.z)===uOf(nv,np.x,np.z)&&boss.y===np.y)score+=6;
    opts.push({np,score});
  }
  opts.sort((a,b)=>b.score-a.score);
  return opts[0]?{move:opts[0].np}:{};
}

function run(){
  let bad=0;
  console.log("A. idle - never move, fold on every opening (must LOSE):");
  LEVELS.filter(l=>l.boss).forEach(lv=>{
    const r=sim(lv,idle,90000);
    if(r.killed)bad++;
    console.log("  "+lv.name.padEnd(26)+
      (r.killed?"KILLED WITHOUT MOVING  <-- EXPLOITABLE"
        :"failed - "+(r.lives<=0?"shot dead":"hp "+r.hp+" left")+
         ", took "+r.hitsTaken+" hits"));
  });
  console.log("\nB. duelling it properly (must WIN):");
  LEVELS.filter(l=>l.boss).forEach(lv=>{
    const r=sim(lv,duellist,90000);
    if(!r.killed)bad++;
    console.log("  "+lv.name.padEnd(26)+
      (r.killed?"killed with "+r.lives+"/3 lives, "+r.moves+" moves, "+r.folds+" folds"
        :r.lives<=0?"DIED - unwinnable at this pacing"
          :"UNWINNABLE - hp "+r.hp+" left"));
  });
  return bad;
}
if(require.main===module){
  const bad=run();
  console.log("\n"+(bad?"FAIL":"PASS")+"  boss simulation, "+bad+" problem(s)");
  process.exit(bad?1:0);
}
module.exports={run};
