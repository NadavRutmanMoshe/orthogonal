"use strict";
/* Orthogonal — 03-rules.js
   Movement, block kinds, and the solid/silhouette/landing lookups.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   RULES  (shared by the game and the solver)
   ============================================================ */

// Given a column and a current height, where does the mover end up?
// occ(y) reports whether that column is solid at height y.
// Returns the new height, or null if the move is impossible.
var FELL=-9999;   // fell out of the world - not the same as being blocked
function resolveStep(occ,y,occHere){
  if(!occ(y) && occ(y-1)) return y;              // walk level
  // Stepping up needs clearance above where you're standing as well as
  // where you're going — otherwise you slide diagonally past a ceiling.
  if(occ(y) && !occ(y+1) && !(occHere&&occHere(y+1))) return y+1;
  if(!occ(y) && !occ(y-1)){                      // nothing underfoot: fall
    var n=y;
    while(n>-12 && !occ(n-1)) n--;
    return n<=-11?FELL:n;
  }
  return null;                                   // wall
}

// Block kinds. 0 stone, 1 glass, 2 anchor, 3 crate.
//   stone  - solid, and it casts into the plane
//   glass  - solid, casts nothing: ground in the volume, a hole in the plane
//   anchor - amber holds whatever arrives on it. It claims you when you unfold,
//            overriding the nearest-camera rule, and it holds a crate fast:
//            once a crate rests on an anchor it can never be shoved again, so
//            parking one is a decision you cannot take back.
//   crate  - solid and casts, but you can shove it, so the plane's shape is
//            something you can change. This is the only piece that gives the
//            game state: the world is different after you touch it.
function isGlass(b){return b[3]===1;}
function isAnchor(b){return b[3]===2;}
function isCrate(b){return b[3]===3;}
// Spikes are solid and they cast like stone — but standing on one kills you.
// Which means a spike buried deep in the world poisons the whole silhouette
// column it lands in. Ground that looks safe in the volume can be lethal once
// you fold, and you have to check what's behind before you commit.
function isSpike(b){return b[3]===4;}

// Crates live outside the static geometry because they move. Everything that
// asks about the world takes the current crate positions as an argument, so a
// level with no crates behaves exactly as it did before they existed.
function crateKeys(level){
  var out=[];
  for(var i=0;i<level.blocks.length;i++)
    if(isCrate(level.blocks[i])){
      var b=level.blocks[i];out.push(K(b[0],b[1],b[2]));
    }
  return out.sort();
}
function crateSet(list){var s=new Set();for(var i=0;i<list.length;i++)s.add(list[i]);return s;}
function parseK(k){var p=k.split(",");return [+p[0],+p[1],+p[2]];}

/* ============================================================
   BOSSES

   An opponent with a gun, and a rhythm you fight inside:

     AIM    it locks onto your row or column and the line lights up
     SHOT   a projectile crosses the arena, one cell at a time. Blocks stop
            it, so the pillars are cover and where you stand is the fight
     OPEN   having just fired, it is exposed for a beat - and this is the
            only moment it can be hurt

   You hurt it by FOLDING while you share its silhouette column, during OPEN.
   Outside that window the same fold kills *you*, because in the plane it is
   solid and you would be folding into it. So the strike and the suicide are
   the same input, separated only by timing - which is what a boss fight is.

   THIS IS THE FOURTH DESIGN and the first three are worth keeping, because
   each failed for a reason that looks obvious only afterwards:

     1. Turn-based, walk to a marker. Provably fair - solve() could prune hit
        states - but it did not feel like a fight.
     2. Real-time, walk to a marker. Better pressure, still an objective
        wearing a boss costume.
     3. Crush it on a static line. A real attack, but the vulnerability was a
        property of the *floor*, so the fight became manipulating the floor:
        stand still, wait, fold. Making it avoid the lines only taught it to
        freeze, which reads as broken, and produced a new two-button loop.

   The lesson each time: a vulnerability that does not come out of the boss's
   own behaviour is a condition to farm, not a fight to win. OPEN is a
   consequence of it shooting, so the only way to get one is to make it shoot,
   which means being somewhere worth shooting at.
   ============================================================ */
function makeBoss(level){
  if(!level.boss)return null;
  var b=level.boss;
  return {
    hp:b.hp||3,
    at:b.at,
    step:b.step||1000,        // ms between its walking steps
    aim:b.aim||900,           // ms of telegraph before it fires
    open:b.open||1300,        // ms it is exposed afterwards
    shotStep:b.shotStep||110, // ms per cell of projectile travel
    stun:b.stun||900          // ms it reels after taking a hit
  };
}
/* Which way does it shoot? Only ever straight down a row or a column, and
   only once it actually shares one with you - so it has to manoeuvre into
   line before it can fire at all, and stepping off that line is the dodge.

   An earlier version fired along whichever axis you were further away on,
   which meant it shot down its own row and past you almost every time. The
   gun was decorative and a motionless player was never in danger, which is
   exactly the hole the idle policy walked through. */
function bossAimDir(R,from,to,cr){
  var d=null;
  if(from.z===to.z&&from.x!==to.x)d={dx:Math.sign(to.x-from.x),dz:0};
  else if(from.x===to.x&&from.z!==to.z)d={dx:0,dz:Math.sign(to.z-from.z)};
  if(!d)return null;                 // not lined up: hold fire and keep moving
  /* And it will not fire into cover. Shooting a pillar wastes the shot, and
     worse, it hands over the exposed beat for free - the window is supposed
     to be payment for surviving a bullet, not for owning a wall. Blocked, it
     keeps walking until it has an angle, so hiding makes it come to you. */
  for(var x=from.x+d.dx,z=from.z+d.dz;;x+=d.dx,z+=d.dz){
    if(x===to.x&&z===to.z)return d;
    if(R.solid(x,from.y,z,cr))return null;
    if(Math.abs(x-from.x)>40||Math.abs(z-from.z)>40)return null;
  }
}
/* One cell of projectile travel. Blocks stop it, which is what makes cover
   real: a pillar is not decoration, it is the thing you put between you. */
function shotNext(R,s,cr){
  var nx=s.x+s.dx, nz=s.z+s.dz;
  if(R.solid(nx,s.y,nz,cr))return null;     // absorbed by geometry
  return {x:nx,y:s.y,z:nz,dx:s.dx,dz:s.dz};
}
/* It manoeuvres for a shot, not just toward you.

   Closing the distance is worth something, but getting onto your row or
   column is worth more, because that is the only state it can fire from.
   Purely closing made it shuffle diagonally and take six seconds to find an
   angle, which reads as a wander rather than a hunt. Scoring alignment above
   distance makes it stride into line and plant, which is legible as intent. */
function bossNext(R,from,to,cr){
  var dirs=[[1,0],[-1,0],[0,1],[0,-1]], best=null;
  var here=Math.abs(from.x-to.x)+Math.abs(from.z-to.z);
  for(var i=0;i<4;i++){
    var nx=from.x+dirs[i][0], nz=from.z+dirs[i][1];
    var ny=resolveStep(
      (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(nx,nz), from.y,
      (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(from.x,from.z));
    if(ny===null||ny===FELL)continue;
    if(R.deadly3(nx,ny,nz))continue;
    var d=Math.abs(nx-to.x)+Math.abs(nz-to.z);
    var lined=bossAimDir(R,{x:nx,y:ny,z:nz},to,cr)?1:0;
    var score=lined*40-d-(d>here?6:0);
    if(!best||score>best.score)best={x:nx,y:ny,z:nz,score:score};
  }
  return (best&&best.score>-40*0-here-7)?best:null;
}
// The boss's own sweeps are gone: the projectile is its ranged attack now.
// Kept as a no-op so any boss data still carrying `beats` loads without
// special-casing. Sweeps themselves live on, in the trials below.
function bossSafety(level){return {ok:true};}

/* ============================================================
   TRIALS — a clock, and somewhere to be

   A trial is the boss stripped back to the one thing the boss was always
   best at. There is no opponent: the arena attacks. A lethal plane sweeps
   one slice of the world, charging in plain sight for most of a beat and
   going live for the last `fire` milliseconds, and the level is an ordinary
   level otherwise - reach the goal, in the volume, as rule 6 has always said.
   The goal is drawn amber rather than green to say that out loud: this one
   is on a clock.

   This is the second boss design, brought back where it belongs. As a boss
   it failed for a reason worth keeping in view: an objective wearing a boss
   costume is not a fight. But that is only an argument about what a *boss*
   is. As a change of pace in the middle of a section - after four or five
   turn-based puzzles, one that will not wait for you - it is exactly what it
   should have been all along, and it costs nothing that the fight needed.

   The reason a plane is the right attack, and the reason a trial is about
   the fold rather than about reflexes: a sweep down the axis you are
   *looking along* cannot be dodged in the plane at all. Flattened you are
   the projection of every depth at once, so you stand in every slice of that
   axis simultaneously. The same sweep is one step to dodge in the volume,
   and rotating the camera re-labels which sweeps are survivable. So the
   question is the one the whole game asks - which axis, and is this the
   moment - only now it is asked with a metronome running.
   ============================================================ */
function makeTrial(level){
  if(!level.trial)return null;
  var t=level.trial;
  var beats=t.beats, period=t.period||2300, fire=t.fire||320;
  return {
    beats:beats, period:period, fire:fire,
    cycle:period*beats.length,
    // which slice is charging right now, how far through its beat it is, and
    // whether it is lethal this instant
    beatAt:function(ms){return beats[Math.floor(ms/period)%beats.length];},
    beatNo:function(ms){return Math.floor(ms/period);},
    phase:function(ms){return (ms%period)/period;},
    live:function(ms){return (ms%period)>=period-fire;},
    /* Does sweep `sw` catch someone at this position?
       In the volume, a,c are x,z. In the plane, a is u and c is ignored -
       there is no depth left to be at. */
    hits:function(sw,v,mode,a,y,c){
      if(!sw)return false;
      if(sw.axis==="y")return y===sw.at;
      if(mode==="3")return (sw.axis==="x"?a:c)===sw.at;
      var comp=sw.axis==="x"?AX[v].r[0]:AX[v].r[2];
      if(comp===0)return true;          // the view axis: nowhere is safe
      return a===sw.at*comp;            // u = x*r0 + z*r2, so on-axis u = at*comp
    }
  };
}
/* The fairness property, and the reason `solve()` is still allowed to have an
   opinion about a trial.

   BFS proves the geometry is solvable; it cannot say anything about a clock
   that advances while you think. What stands in for a proof is this: for
   every square you can stand on and every beat the arena has, either that
   square is safe or a square one step away is. The arena never corners you -
   there is always somewhere to be. It is weaker than "a clean run exists",
   because it says nothing about dodging and making progress at the same
   time, but it rules out the failure that actually matters, which is dying
   with no move that would have saved you.

   It also checks the square you respawn on against the beat you respawn
   into, because the clock restarts at zero after a hit and being dropped
   back into a slice that is already charging is not a mistake you made.

   Deliberately a check on the volume only. The plane is where a sweep down
   the view axis is unsurvivable, and that is the mechanic, not a bug: it is
   the reason folding is a decision here rather than a free verb. */
function trialSafety(level){
  var T=makeTrial(level); if(!T)return {ok:true};
  var R=makeRules(level), cr=crateSet(crateKeys(level));
  var stand=[], seen={};
  for(var i=0;i<level.blocks.length;i++){
    var bl=level.blocks[i], x=bl[0], y=bl[1]+1, z=bl[2];
    if(R.solid(x,y,z,cr))continue;
    if(R.deadly3(x,y,z))continue;                    // a spike: not standable
    var k=K(x,y,z); if(seen[k])continue; seen[k]=1;
    stand.push([x,y,z]);
  }
  var bad=[];
  for(var bi=0;bi<T.beats.length;bi++){
    var sw=T.beats[bi];
    for(var si=0;si<stand.length;si++){
      var c=stand[si];
      if(!T.hits(sw,0,"3",c[0],c[1],c[2]))continue;  // already safe here
      var out=false, nb=[[1,0],[-1,0],[0,1],[0,-1]];
      for(var ni=0;ni<nb.length&&!out;ni++){
        var nx=c[0]+nb[ni][0], nz=c[2]+nb[ni][1];
        var ny=resolveStep(
          (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(nx,nz), c[1],
          (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(c[0],c[2]));
        if(ny===null||ny===FELL)continue;
        if(R.deadly3(nx,ny,nz))continue;
        if(!T.hits(sw,0,"3",nx,ny,nz))out=true;
      }
      if(!out)bad.push({cell:c,beat:sw});
    }
  }
  var s=level.start, born=T.hits(T.beats[0],0,"3",s[0],s[1],s[2]);
  return {ok:!bad.length&&!born,trapped:bad,born:born};
}

/* Is this arena a stage a fight can happen on?

   Shared by tools/verify.js and tools/bossgen.js rather than written twice.
   The bar the generated arenas failed on, and the reason this exists: a boss
   walks, so an arena split by a chasm is a boss that can never reach you. */
function bossArena(level){
  var B=makeBoss(level); if(!B)return {ok:true};
  var R=makeRules(level), cr=crateSet(crateKeys(level)), fail=[];
  var stand=new Set(), q=[level.start.slice()];
  stand.add(K(level.start[0],level.start[1],level.start[2]));
  while(q.length){
    var p=q.shift(), d=[[1,0],[-1,0],[0,1],[0,-1]];
    for(var i=0;i<4;i++){
      var nx=p[0]+d[i][0], nz=p[2]+d[i][1];
      var ny=resolveStep(
        (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(nx,nz), p[1],
        (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(p[0],p[2]));
      if(ny===null||ny===FELL)continue;
      if(R.deadly3(nx,ny,nz))continue;
      var k=K(nx,ny,nz);
      if(stand.has(k))continue;
      stand.add(k);q.push([nx,ny,nz]);
    }
  }
  if(!stand.has(K(B.at[0],B.at[1],B.at[2])))
    fail.push("boss cannot reach you: its ground is not connected to yours");
  /* Cover: blocks standing proud of the floor, which is what stops a shot.
     Too little and the arena is a shooting gallery; too much and the boss
     cannot path to you and the fight stalls. */
  var cover=0, crates=[];
  for(var c2=0;c2<level.blocks.length;c2++){
    var bb=level.blocks[c2];
    if(isCrate(bb)){crates.push(bb);continue;}
    if(bb[1]>0)cover++;
  }
  if(cover<2)fail.push("no cover: nothing to break the firing line with");
  if(cover>stand.size*.2)fail.push(cover+" pieces of cover is a maze, not an arena");
  var depths={},nd=0;
  for(var q2=0;q2<level.blocks.length;q2++)
    if(!depths[level.blocks[q2][2]]){depths[level.blocks[q2][2]]=1;nd++;}
  if(nd<4)fail.push("too flat for folding to buy anything");
  return {ok:!fail.length,fail:fail,squares:stand.size,
          cover:cover,crates:crates.length};
}

function makeRules(level){
  var S=new Set(),A=new Set(),SP=new Set();
  for(var i=0;i<level.blocks.length;i++){
    var b=level.blocks[i];
    if(isCrate(b))continue;                    // crates are dynamic
    S.add(K(b[0],b[1],b[2]));
    if(isAnchor(b))A.add(K(b[0],b[1],b[2]));
    if(isSpike(b))SP.add(K(b[0],b[1],b[2]));
  }
  var spikeSilo=[0,1,2,3].map(function(v){
    var t=new Set();
    for(var i=0;i<level.blocks.length;i++){
      var b=level.blocks[i];
      if(!isSpike(b))continue;
      t.add((b[0]*AX[v].r[0]+b[2]*AX[v].r[2])+","+b[1]);
    }
    return t;
  });
  var silos=[0,1,2,3].map(function(v){
    var s=new Set();
    for(var i=0;i<level.blocks.length;i++){
      var b=level.blocks[i];
      if(isGlass(b)||isCrate(b))continue;
      s.add((b[0]*AX[v].r[0]+b[2]*AX[v].r[2])+","+b[1]);
    }
    return s;
  });
  var keys=(level.keys||[]).map(function(k){return K(k[0],k[1],k[2]);});

  function solid(x,y,z,cr){
    var k=K(x,y,z);
    return S.has(k)||(cr&&cr.has(k));
  }
  function siloSolid(v,u,y,cr){
    if(silos[v].has(u+","+y))return true;
    if(cr) {
      var it=cr.values(),n;
      while(!(n=it.next()).done){
        var c=parseK(n.value);
        if(c[1]===y && (c[0]*AX[v].r[0]+c[2]*AX[v].r[2])===u) return true;
      }
    }
    return false;
  }
  return {
    keys:keys,
    solid:solid,
    siloSolid:siloSolid,
    // lethal underfoot, in the volume and in the plane
    deadly3:function(x,y,z){return SP.has(K(x,y-1,z));},
    deadly2:function(v,u,y){return spikeSilo[v].has(u+","+(y-1));},
    uOf:function(v,x,z){return x*AX[v].r[0]+z*AX[v].r[2];},
    dOf:function(v,x,z){return x*AX[v].d[0]+z*AX[v].d[2];},
    cellAt:function(v,u,y,t){
      var r=AX[v].r,d=AX[v].d;
      return {x:u*r[0]+t*d[0],y:y,z:u*r[2]+t*d[2]};
    },
    // Where could we be standing when we come back to the volume?
    landings:function(v,u,y,cr){
      var out=[],r=AX[v].r,d=AX[v].d;
      for(var t=-16;t<=16;t++){
        var x=u*r[0]+t*d[0], z=u*r[2]+t*d[2];
        if(solid(x,y-1,z,cr) && !solid(x,y,z,cr))
          out.push({t:t,x:x,z:z,anchor:A.has(K(x,y-1,z))});
      }
      return out;
    },
    pick:function(list){
      var anch=null;
      for(var j=0;j<list.length;j++)
        if(list[j].anchor && (!anch||list[j].t>anch.t)) anch=list[j];
      if(anch)return anch;
      var best=list[0];
      for(var i=1;i<list.length;i++) if(list[i].t>best.t) best=list[i];
      return best;
    },
    heldFast:function(cx,cy,cz){return A.has(K(cx,cy-1,cz));},
    // Shove a crate one square. It falls if nothing holds it, a shove that
    // would lose it out of the world isn't allowed, and a crate resting on an
    // anchor cannot be shoved at all.
    push:function(cx,cy,cz,dx,dz,cr){
      if(A.has(K(cx,cy-1,cz)))return null;      // held fast by amber
      var nx=cx+dx,nz=cz+dz;
      if(solid(nx,cy,nz,cr))return null;
      var ny=cy;
      while(ny>-12 && !solid(nx,ny-1,nz,cr)) ny--;
      if(ny<=-11)return null;
      return {x:nx,y:ny,z:nz};
    }
  };
}
