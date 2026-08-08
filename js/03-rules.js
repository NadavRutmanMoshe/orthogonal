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

   A boss is an opponent, not an objective. It hunts you across the arena in
   real time, and you hurt it by shoving a crate into it - the game's own
   verb, aimed. Standing somewhere is not an attack; the first version of
   this asked you to walk onto a marker three times, which is a puzzle
   objective wearing a boss costume.

   The fight has a rhythm, and the rhythm is the fold:

     - In the VOLUME you can shove, so the volume is the only place you can
       hurt it. It is also where it can reach you.
     - In the PLANE you cannot shove, so you cannot win there - but the whole
       silhouette is one corridor, so you cross the arena in a couple of moves
       and it cannot lay a hand on you off your own column.

   So folding is retreat and unfolding is commitment, which is the same
   decision the puzzles ask, made against something that is moving.

   On top of that it sweeps: a lethal plane charges in plain sight and lands
   on the last `fire` ms of each beat. A sweep down the axis you are *looking
   along* cannot be dodged in the plane at all - flattened you are the
   projection of every depth at once - so retreat has a cost and the axis you
   picked decides what it is.

   The turn-based first draft could be proved fair by search: solve() pruned
   hit states, so "solvable" and "fair" were one question. Real time gave that
   up on purpose. bossSafety() below is the weaker thing that replaced it.
   ============================================================ */
function makeBoss(level){
  if(!level.boss)return null;
  var b=level.boss;
  var beats=b.beats||[], period=b.period||2600, fire=b.fire||300;
  return {
    hp:b.hp||3, at:b.at, period:period, fire:fire, beats:beats,
    step:b.step||950,          // ms between its moves
    stun:b.stun||1400,         // ms it reels for after taking a crate
    cycle:period*Math.max(1,beats.length),
    beatAt:function(ms){return beats.length?beats[Math.floor(ms/period)%beats.length]:null;},
    phase:function(ms){return (ms%period)/period;},
    live:function(ms){return beats.length&&(ms%period)>=period-fire;},
    hits:function(sw,v,mode,a,y,c){
      if(!sw)return false;
      if(sw.axis==="y")return y===sw.at;
      if(mode==="3")return (sw.axis==="x"?a:c)===sw.at;
      var comp=sw.axis==="x"?AX[v].r[0]:AX[v].r[2];
      if(comp===0)return true;          // the view axis: no depth to hide at
      return a===sw.at*comp;
    }
  };
}
// Is this square one the fold would crush it on, in the view being looked
// along right now? Shared by the boss's own pathing and by the affordance
// that lights the button, so what it flees is exactly what you are shown.
function bossCrushAt(R,c,v,cr){
  var u=c.x*AX[v].r[0]+c.z*AX[v].r[2];
  return !!(R.siloSolid(v,u,c.y,cr)||R.deadly2(v,u,c.y));
}
/* Where does it go next?

   One cell toward you, preferring the axis it is further away on - but it
   will not walk onto a square the fold could crush it on if it has any other
   way to close. That single rule is what turns the fight from a wait into a
   hunt. Without it the boss strolls onto a kill line unprompted, and the
   whole fight collapses into: stand still, wait for green, fold, repeat.

   When every closing step is dangerous it takes one anyway. It has to: a
   boss that always refuses is a boss that can never be killed, and the point
   of the avoidance is to make you *force* the moment, not to deny it. So the
   fight is herding - cut off its safe approaches, using geometry and the
   camera, until the only way it can come at you is across a line.

   Rotating re-labels every line at once, which makes the camera a weapon
   rather than a convenience: turn, and the square it just fled to is the one
   that kills it. */
function bossNext(R,from,to,cr,v){
  var dirs=[[1,0],[-1,0],[0,1],[0,-1]], safe=[], risky=[];
  for(var i=0;i<4;i++){
    var nx=from.x+dirs[i][0], nz=from.z+dirs[i][1];
    var ny=resolveStep(
      (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(nx,nz), from.y,
      (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(from.x,from.z));
    if(ny===null||ny===FELL)continue;
    if(R.deadly3(nx,ny,nz))continue;        // it will not walk onto spikes either
    var cand={x:nx,y:ny,z:nz};
    cand.d=Math.abs(nx-to.x)+Math.abs(ny-to.y)+Math.abs(nz-to.z);
    ((v!==undefined&&bossCrushAt(R,cand,v,cr))?risky:safe).push(cand);
  }
  function nearest(list){
    var best=null;
    for(var j=0;j<list.length;j++) if(!best||list[j].d<best.d) best=list[j];
    return best;
  }
  /* Every neighbour is considered, not just the two that close the distance.
     That is what lets it walk *around* a line instead of through one, and it
     is the difference between a boss you have to corner and a boss that
     corners itself. With only closing steps on the table it would take a
     lethal one whenever both happened to be lethal, which is how the
     do-nothing strategy kept working even on arenas with few lines. */
  /* It would rather wait than die.

     A crush line is not a square, it is a wall clean across the arena, so if
     one lies between you it CANNOT approach without crossing - and every
     crossing is a free hit to anyone standing still. Letting it hold instead
     is what finally kills the do-nothing strategy: park yourself behind a
     line and it simply stops coming, and you have won nothing.

     It never crosses. An earlier version let it charge through after stalling
     for a few seconds, as a valve against stalemate, and that single
     concession handed the whole exploit straight back: wait four beats, take
     a free hit, repeat. Nothing it does on its own will ever kill it.

     Which means a hit has to be *made*. Two ways, both of which require you
     to act: rotate, and the square it is standing on becomes a line - every
     line in the arena is re-labelled at once by a quarter turn - or move, and
     change which squares it is willing to approach through.

     Standing behind a line is therefore safe, and worth nothing: it waits,
     you gain nothing, and the sweeps come for you regardless. That is the
     answer to a standoff, not a charge. */
  var here=Math.abs(from.x-to.x)+Math.abs(from.y-to.y)+Math.abs(from.z-to.z);
  var s=nearest(safe);
  if(s&&s.d<here)return s;                  // safe progress: take it
  if(s&&s.d<=here)return s;                 // safe sidestep, looking for a way in
  return null;                              // hold position rather than walk into it
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
  /* How many squares can it actually be killed on? A kill needs the boss
     standing where some rotation's silhouette column is already occupied.
     Counting them is the arena's real content: an arena with a handful is a
     fight you win by luck, and one with none cannot be won at all. */
  var kills=0, it=stand.values(), n;
  while(!(n=it.next()).done){
    var c=parseK(n.value), any=false;
    for(var v=0;v<4&&!any;v++){
      var u=c[0]*AX[v].r[0]+c[2]*AX[v].r[2];
      if(R.siloSolid(v,u,c[1],cr)||R.deadly2(v,u,c[1]))any=true;
    }
    if(any)kills++;
  }
  if(kills<B.hp*3)
    fail.push("only "+kills+" squares it can be crushed on, for "+B.hp+" hits");
  var crates=[];
  for(var c2=0;c2<level.blocks.length;c2++)
    if(isCrate(level.blocks[c2]))crates.push(level.blocks[c2]);
  var depths={},nd=0;
  for(var q2=0;q2<level.blocks.length;q2++)
    if(!depths[level.blocks[q2][2]]){depths[level.blocks[q2][2]]=1;nd++;}
  if(nd<4)fail.push("too flat for folding to buy anything");
  return {ok:!fail.length,fail:fail,squares:stand.size,
          kills:kills,crates:crates.length};
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
  var B=makeBoss(level); if(!B||!B.beats.length)return {ok:true};
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
