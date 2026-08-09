"use strict";
/* Orthogonal — 04-solver.js
   Breadth-first search over game states. Shared with the game.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   SOLVER — breadth-first search over game states.

   A state is where you are, which way you're facing, whether
   you're folded, where every crate sits and which keys you've
   picked up. BFS explores every state one move deep, then two,
   then three, so the first time it reaches the goal that path
   is provably the shortest one that exists. Drain the queue
   without arriving and the level is provably impossible.

   Crates multiply the state space, so levels using them need
   to stay small.
   ============================================================ */
/* The solver knows nothing about bosses, and that is deliberate.

   A boss is a pack of real-time hunters. None of what they do is a function
   of your move sequence: the clock runs while you think and they move in
   response to where you are, so a breadth-first search over moves has
   nothing true to say about it. An earlier draft did model a turn-based boss
   and could prove a run existed that was never hit; that is gone, and
   pretending otherwise would return paths whose safety it has no standing to
   claim.

   A trial is the opposite case and gets the full treatment - it is an
   ordinary level with a clock bolted on, so the geometry is still a search
   problem and verify.js runs it.

   What still holds for a boss level is geometry: bossArena() checks the
   arena is a stage a fight can happen on, and tools/bosssim.js plays each
   fight twice to check it is neither unwinnable nor winnable by standing
   still. Everything else is playtesting. */
function solve(level,allowRotate,cap,from){
  var R=makeRules(level);
  cap=cap||400000;
  var nKeys=R.keys.length;
  var allKeys=(1<<nKeys)-1;

  // Keys are collected in the *plane*, at the square the key projects to. So
  // which axis you fold along decides which keys you can even reach — that ties
  // them to the one verb the game has, instead of being a separate errand.
  var keyCells=R.keys.map(function(k){var p=k.split(",");return [+p[0],+p[1],+p[2]];});
  function collect2(v,u,y,kb){
    for(var i=0;i<nKeys;i++){
      var c=keyCells[i];
      if(c[1]===y && (c[0]*AX[v].r[0]+c[2]*AX[v].r[2])===u) kb|=(1<<i);
    }
    return kb;
  }
  function pack(mode,x,y,z,v,cr,kb){
    return mode+"|"+x+"|"+y+"|"+z+"|"+v+"|"+cr.join(";")+"|"+kb;
  }

  var c0=crateKeys(level);
  var s0;
  if(from){
    s0=pack(from.mode||"3",from.x,from.y,from.z,from.view||0,
            from.crates||c0, from.keys||0);
    if(from.mode==="2")
      s0="2|"+from.u+"|"+from.y+"|0|"+(from.view||0)+"|"+
         (from.crates||c0).join(";")+"|"+(from.keys||0);
  } else {
    s0=pack("3",level.start[0],level.start[1],level.start[2],0,c0,0);
  }

  var q=[{s:s0,p:[]}],head=0,seen=new Set([s0]),n=0;

  while(head<q.length){
    if(++n>cap) return {status:"toobig"};
    var cur=q[head++], f=cur.s.split("|"), next=[];
    var v=+f[4];
    var crList=f[5]?f[5].split(";"):[];
    var cr=crateSet(crList);
    var kb=+f[6];

    if(f[0]==="3"){
      var x=+f[1],y=+f[2],z=+f[3];
      if(x===level.goal[0]&&y===level.goal[1]&&z===level.goal[2]&&kb===allKeys)
        return {status:"solved",path:cur.p};
      var dirs=[[AX[v].r[0],AX[v].r[2],"\u2192"],[-AX[v].r[0],-AX[v].r[2],"\u2190"],
                [AX[v].d[0],AX[v].d[2],"\u2193"],[-AX[v].d[0],-AX[v].d[2],"\u2191"]];
      for(var i=0;i<dirs.length;i++){
        var dx=dirs[i][0],dz=dirs[i][1];
        var nx=x+dx,nz=z+dz;
        var nCr=crList, pushed=false;

        // shove a crate if one is in the way at body height
        // If a crate can be shoved, it is. If it's wedged, you climb it
        // instead, exactly as if it were stone.
        if(cr.has(K(nx,y,nz))){
          var res=R.push(nx,y,nz,dx,dz,cr);
          if(res){
            var tmp=crList.filter(function(a){return a!==K(nx,y,nz);});
            tmp.push(K(res.x,res.y,res.z));
            nCr=tmp.slice().sort();
            pushed=true;
          }
        }
        var crAfter=pushed?crateSet(nCr):cr;
        var ny=resolveStep(
          (function(a,b,cc){return function(h){return R.solid(a,h,b,cc);};})(nx,nz,crAfter),
          y,
          (function(a,b,cc){return function(h){return R.solid(a,h,b,cc);};})(x,z,crAfter));
        if(ny===null||ny===FELL)continue;
        if(R.deadly3(nx,ny,nz))continue;                 // standing on spikes kills
        next.push([pack("3",nx,ny,nz,v,nCr,kb),
                   pushed?(dirs[i][2]+"\u2739"):dirs[i][2]]);
      }
      if(allowRotate&&level.rotate!==false){
        next.push([pack("3",x,y,z,(v+1)%4,crList,kb),"rot+"]);
        next.push([pack("3",x,y,z,(v+3)%4,crList,kb),"rot-"]);
      }
      var fu=R.uOf(v,x,z);
      if(!R.siloSolid(v,fu,y,cr)&&!R.deadly2(v,fu,y))
        next.push(["2|"+fu+"|"+y+"|0|"+v+"|"+crList.join(";")+"|"+collect2(v,fu,y,kb),"FLAT"]);
    } else {
      var u=+f[1],hy=+f[2];
      for(var du=-1;du<=1;du+=2){
        var nu=u+du;
        var nh=resolveStep(
          (function(a,b,cc){return function(h){return R.siloSolid(a,b,h,cc);};})(v,nu,cr),
          hy,
          (function(a,b,cc){return function(h){return R.siloSolid(a,b,h,cc);};})(v,u,cr));
        if(nh===null||nh===FELL)continue;
        if(R.deadly2(v,nu,nh))continue;                  // a spike anywhere in depth
        next.push(["2|"+nu+"|"+nh+"|0|"+v+"|"+crList.join(";")+"|"+collect2(v,nu,nh,kb), du>0?"\u2192":"\u2190"]);
      }
      var land=R.landings(v,u,hy,cr);
      if(land.length){
        var b=R.pick(land);
        if(!R.deadly3(b.x,hy,b.z))
          next.push([pack("3",b.x,hy,b.z,v,crList,kb),"POP"]);
      }
    }

    for(var j=0;j<next.length;j++){
      if(!seen.has(next[j][0])){
        seen.add(next[j][0]);
        q.push({s:next[j][0],p:cur.p.concat(next[j][1])});
      }
    }
  }
  return {status:"impossible"};
}
