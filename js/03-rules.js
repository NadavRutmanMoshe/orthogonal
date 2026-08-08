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

   A boss runs on the wall clock. The attack is a lethal plane that sweeps one
   slice: it charges in plain sight for most of the beat, then goes live for
   the last `fire` milliseconds, and if you are standing in it when it lands
   you lose a life. Dodging is a real-time act - you have the charge window to
   get off the slice, and nothing waits for you to decide.

   This is the second design. The first was turn-based, where every step
   advanced the boss exactly one tick, and it had one large advantage: solve()
   could prove a run existed that was never hit, so "solvable" and "fair" were
   the same question. That is gone now and it is a real cost, recorded here so
   nobody re-discovers it the hard way. What replaces it is a weaker but still
   machine-checkable property - see `bossSafety()` below - plus playtesting.

   What survives from the first design, and the reason the boss is worth
   having at all, is the fold. A sweep down the axis you are *looking along*
   cannot be dodged in the plane: flattened, you are the projection of every
   depth at once, so you stand in every slice of that axis simultaneously.
   The same sweep is one step to dodge in the volume. Rotating the camera
   re-labels which sweeps are survivable. So the fight asks the question the
   whole game asks: which axis are you collapsing, and is this the moment?
   ============================================================ */
function makeBoss(level){
  if(!level.boss)return null;
  var b=level.boss;
  var beats=b.beats, period=b.period||2200, fire=b.fire||280, hp=b.cores.length;
  return {
    hp:hp, cores:b.cores, period:period, fire:fire, beats:beats,
    cycle:period*beats.length,
    // cores are consumed in order, so the fight moves you around the arena
    coreAt:function(hpLeft){return b.cores[hp-hpLeft];},
    beatAt:function(ms){return beats[Math.floor(ms/period)%beats.length];},
    phase:function(ms){return (ms%period)/period;},          // 0..1 through it
    live:function(ms){return (ms%period)>=period-fire;},     // lethal right now
    /* Does sweep `sw` catch someone at this position?
       In the volume, a,c are x,z. In the plane, a is u and c is ignored -
       there is no depth to be at. */
    hits:function(sw,v,mode,a,y,c){
      if(!sw)return false;
      if(sw.axis==="y")return y===sw.at;
      if(mode==="3")return (sw.axis==="x"?a:c)===sw.at;
      var comp=sw.axis==="x"?AX[v].r[0]:AX[v].r[2];
      if(comp===0)return true;          // the view axis: no depth to hide at
      return a===sw.at*comp;            // u = x*r0 + z*r2, so on-axis u = at*comp
    }
  };
}

/* The fairness property that replaced the solver's proof.

   For every square you can stand on, and every beat the boss has, either that
   square is safe from the beat or a square one step away is. In other words
   the arena never corners you: there is always somewhere to be. It is weaker
   than "a clean run exists" - it says nothing about whether you can dodge and
   make progress at the same time - but it is checkable, and it rules out the
   failure that actually matters, which is dying with no move that would have
   saved you. Run by tools/verify.js over every boss level. */
function bossSafety(level){
  var B=makeBoss(level); if(!B)return {ok:true};
  var R=makeRules(level), cr=crateSet(crateKeys(level));
  var stand=[], seen={};
  for(var i=0;i<level.blocks.length;i++){
    var bl=level.blocks[i], x=bl[0], y=bl[1]+1, z=bl[2];
    if(R.solid(x,y,z,cr))continue;
    var k=K(x,y,z); if(seen[k])continue; seen[k]=1;
    stand.push([x,y,z]);
  }
  var bad=[];
  for(var bi=0;bi<B.beats.length;bi++){
    var sw=B.beats[bi];
    for(var si=0;si<stand.length;si++){
      var c=stand[si];
      if(!B.hits(sw,0,"3",c[0],c[1],c[2]))continue;    // already safe here
      var out=false;
      var nb=[[1,0],[-1,0],[0,1],[0,-1]];
      for(var ni=0;ni<nb.length&&!out;ni++){
        var nx=c[0]+nb[ni][0], nz=c[2]+nb[ni][1];
        var ny=resolveStep(function(h){return R.solid(nx,h,nz,cr);},c[1],
                           function(h){return R.solid(c[0],h,c[2],cr);});
        if(ny===null||ny===FELL)continue;
        if(R.deadly3(nx,ny,nz))continue;
        if(!B.hits(sw,0,"3",nx,ny,nz))out=true;
      }
      if(!out)bad.push({cell:c,beat:sw});
    }
  }
  return {ok:!bad.length,trapped:bad};
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
