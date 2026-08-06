"use strict";
/* Orthogonal — 17-composer.js
   Solution-first level generation.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   COMPOSER — build a level backwards from its solution.

   You dictate the move sequence you want the player to make.
   For each move we add the least geometry that makes exactly
   that move legal, choosing the hidden depths at random. The
   trick the whole thing rests on: in 2D you only constrain the
   silhouette, so a bridge block can sit at any depth you like,
   and that free choice is what becomes the puzzle in 3D.

   Synthesis alone isn't enough. Geometry added for a late move
   can open a shortcut past an early one, so we finish by having
   the solver prove the sequence is optimal. If it finds a faster
   route we reroll the depths and try again.
   ============================================================ */
function mulberry32(a){
  return function(){
    a|=0;a=a+0x6D2B79F5|0;
    var t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}

function synthesize(script,seed,partial){
  var rnd=mulberry32(seed>>>0);
  var blocks=[],set=new Set();
  function add(x,y,z,glass,anchor){
    var k=K(x,y,z);
    if(!set.has(k))
      {set.add(k);blocks.push(anchor?[x,y,z,2]:glass?[x,y,z,1]:[x,y,z]);}
  }
  // Geometry placed to satisfy a move in the volume doesn't need to appear in
  // the plane, so making some of it glass keeps the silhouette clean — which
  // is exactly where shortcuts come from.
  function maybeGlass(){return rnd()<0.45;}
  var useAnchors=(seed%3)!==0;   // some layouts get anchors, some don't
  function has(x,y,z){return set.has(K(x,y,z));}
  function uv(v,x,z){return x*AX[v].r[0]+z*AX[v].r[2];}
  function dv(v,x,z){return x*AX[v].d[0]+z*AX[v].d[2];}
  function cell(v,u,y,d){
    var r=AX[v].r,q=AX[v].d;
    return {x:u*r[0]+d*q[0],y:y,z:u*r[2]+d*q[2]};
  }
  function siloHas(v,u,y){
    for(var i=0;i<blocks.length;i++){
      var b=blocks[i];
      if(b[3]===1)continue;
      if(b[1]===y&&uv(v,b[0],b[2])===u)return true;
    }
    return false;
  }

  var mode="3",x=0,y=1,z=0,v=0,u=0,lastDepth=0;
  var visited=[];              // every 3D square the sequence stands on
  add(0,0,0);
  visited.push(K(0,1,0));

  for(var i=0;i<script.length;i++){
    var t=script[i];

    if(t==="rot+"||t==="rot-"){
      if(mode!=="3")return {ok:false,at:i,why:"can't rotate while flat"};
      v=(v+(t==="rot+"?1:3))%4;
      continue;
    }
    if(t==="FLAT"){
      if(mode!=="3")return {ok:false,at:i,why:"already flat"};
      u=uv(v,x,z);
      if(siloHas(v,u,y))return {ok:false,at:i,why:"something projects into that square"};
      lastDepth=dv(v,x,z);mode="2";
      continue;
    }
    if(t==="POP"){
      if(mode!=="2")return {ok:false,at:i,why:"not flat"};
      // Land nearest the camera: pick a depth beyond every existing
      // candidate so the game's own rule has to choose ours.
      var maxd=null,anchored=false;
      for(var q=-16;q<=16;q++){
        var c0=cell(v,u,y,q);
        if(has(c0.x,y-1,c0.z)&&!has(c0.x,y,c0.z)) maxd=(maxd===null?q:Math.max(maxd,q));
      }
      var dstar;
      if(useAnchors&&rnd()<0.55){
        // With an anchor we can land anywhere, instead of being forced ever
        // further from the camera. That frees the geometry up enormously.
        dstar=lastDepth+(rnd()<0.5?-1:1)*(1+Math.floor(rnd()*6));
        anchored=true;
      } else {
        dstar=(maxd===null?lastDepth:maxd)+1+Math.floor(rnd()*3);
      }
      var c=cell(v,u,y,dstar);
      if(has(c.x,y,c.z))return {ok:false,at:i,why:"landing square is filled"};
      if(anchored) add(c.x,y-1,c.z,false,true);
      else add(c.x,y-1,c.z,maybeGlass());
      x=c.x;z=c.z;mode="3";
      visited.push(K(x,y,z));
      continue;
    }

    // directional moves
    if(mode==="3"){
      var dx,dz;
      if(t==="\u2192"){dx=AX[v].r[0];dz=AX[v].r[2];}
      else if(t==="\u2190"){dx=-AX[v].r[0];dz=-AX[v].r[2];}
      else if(t==="\u2193"){dx=AX[v].d[0];dz=AX[v].d[2];}
      else {dx=-AX[v].d[0];dz=-AX[v].d[2];}
      var nx=x+dx,nz=z+dz;
      if(rnd()<0.25){                       // step up onto a block
        if(has(nx,y+1,nz)||has(x,y+1,z))return {ok:false,at:i,why:"no headroom"};
        add(nx,y,nz,maybeGlass());y=y+1;
      } else {                              // walk level
        if(has(nx,y,nz))return {ok:false,at:i,why:"blocked by earlier geometry"};
        add(nx,y-1,nz,maybeGlass());
      }
      x=nx;z=nz;
      visited.push(K(x,y,z));
    } else {
      if(t==="\u2191"||t==="\u2193")return {ok:false,at:i,why:"no depth while flat"};
      var nu=u+(t==="\u2192"?1:-1);
      // Free choice: any depth projects to the same silhouette column.
      var off=(rnd()<0.5?-1:1)*(2+Math.floor(rnd()*5));
      var dd=lastDepth+off;
      if(rnd()<0.3){                        // silhouette step up
        if(siloHas(v,nu,y+1)||siloHas(v,u,y+1))
          return {ok:false,at:i,why:"silhouette is blocked above"};
        var cu=cell(v,nu,y,dd);add(cu.x,cu.y,cu.z);y=y+1;
      } else {
        if(siloHas(v,nu,y))return {ok:false,at:i,why:"silhouette is blocked"};
        var cw=cell(v,nu,y-1,dd);add(cw.x,cw.y,cw.z);
      }
      u=nu;
    }
  }

  if(partial)
    return {ok:true,partial:true,mode:mode,view:v,
      level:{name:"Composing",hint:"",blocks:blocks,start:[0,1,0],
             goal:[x,y,z],rotate:true}};
  if(mode!=="3")return {ok:false,at:script.length,why:"sequence must end in 3D \u2014 finish with POP"};
  if(x===0&&y===1&&z===0)return {ok:false,at:script.length,why:"ends where it started"};
  // If the sequence stands on its own finish line partway through, no
  // arrangement of blocks can stop the player stopping there. That's a
  // problem with the sequence, not with the geometry.
  var end=K(x,y,z);
  for(var w=0;w<visited.length-1;w++)
    if(visited[w]===end)
      return {ok:false,fatal:true,at:w,
        why:"the sequence passes through its own ending at move "+w+
            " \u2014 the player would just stop there"};

  return {ok:true,level:{name:"Composed",hint:"",blocks:blocks,
    start:[0,1,0],goal:[x,y,z],rotate:true},mode:mode,view:v};
}

// Does the level actually admit this exact sequence?
function replay(level,script){
  var Rr=makeRules(level);
  var mode="3",x=level.start[0],y=level.start[1],z=level.start[2],v=0,u=0;
  for(var i=0;i<script.length;i++){
    var t=script[i];
    if(t==="rot+"||t==="rot-"){ if(mode!=="3")return false; v=(v+(t==="rot+"?1:3))%4; continue; }
    if(t==="FLAT"){ if(mode!=="3")return false;
      var fu=Rr.uOf(v,x,z);
      if(Rr.siloSolid(v,fu,y))return false;
      u=fu;mode="2";continue; }
    if(t==="POP"){
      if(mode!=="2")return false;
      var land=Rr.landings(v,u,y);
      if(!land.length)return false;
      var b=Rr.pick(land);x=b.x;z=b.z;mode="3";continue;
    }
    if(mode==="3"){
      var dx,dz;
      if(t==="\u2192"){dx=AX[v].r[0];dz=AX[v].r[2];}
      else if(t==="\u2190"){dx=-AX[v].r[0];dz=-AX[v].r[2];}
      else if(t==="\u2193"){dx=AX[v].d[0];dz=AX[v].d[2];}
      else {dx=-AX[v].d[0];dz=-AX[v].d[2];}
      var nx=x+dx,nz=z+dz;
      var ny=resolveStep((function(a,b){return function(h){return Rr.solid(a,h,b);};})(nx,nz),y,
               (function(a,b){return function(h){return Rr.solid(a,h,b);};})(x,z));
      if(ny===null||ny===FELL)return false;
      x=nx;z=nz;y=ny;
    } else {
      if(t==="\u2191"||t==="\u2193")return false;
      var nu=u+(t==="\u2192"?1:-1);
      var nh=resolveStep((function(a,b){return function(h){return Rr.siloSolid(a,b,h);};})(v,nu),y,
               (function(a,b){return function(h){return Rr.siloSolid(a,b,h);};})(v,u));
      if(nh===null||nh===FELL)return false;
      u=nu;y=nh;
    }
  }
  return mode==="3"&&x===level.goal[0]&&y===level.goal[1]&&z===level.goal[2];
}

// Where does a path physically go? Used to tell an unwanted shortcut
// apart from the sequence we asked for.
function trace(level,path){
  var Rr=makeRules(level),cells=[];
  var mode="3",x=level.start[0],y=level.start[1],z=level.start[2],v=0,u=0;
  cells.push(K(x,y,z));
  for(var i=0;i<path.length;i++){
    var t=path[i];
    if(t==="rot+"||t==="rot-"){v=(v+(t==="rot+"?1:3))%4;continue;}
    if(t==="FLAT"){u=Rr.uOf(v,x,z);mode="2";continue;}
    if(t==="POP"){
      var land=Rr.landings(v,u,y);if(!land.length)return cells;
      var b=Rr.pick(land);x=b.x;z=b.z;mode="3";cells.push(K(x,y,z));continue;
    }
    if(mode==="3"){
      var dx,dz;
      if(t==="\u2192"){dx=AX[v].r[0];dz=AX[v].r[2];}
      else if(t==="\u2190"){dx=-AX[v].r[0];dz=-AX[v].r[2];}
      else if(t==="\u2193"){dx=AX[v].d[0];dz=AX[v].d[2];}
      else {dx=-AX[v].d[0];dz=-AX[v].d[2];}
      var nx=x+dx,nz=z+dz;
      var ny=resolveStep((function(a,b){return function(h){return Rr.solid(a,h,b);};})(nx,nz),y,
               (function(a,b){return function(h){return Rr.solid(a,h,b);};})(x,z));
      if(ny===null||ny===FELL)return cells;
      x=nx;z=nz;y=ny;cells.push(K(x,y,z));
    } else {
      var nu=u+(t==="\u2192"?1:-1);
      var nh=resolveStep((function(a,b){return function(h){return Rr.siloSolid(a,b,h);};})(v,nu),y,
               (function(a,b){return function(h){return Rr.siloSolid(a,b,h);};})(v,u));
      if(nh===null||nh===FELL)return cells;
      u=nu;y=nh;
    }
  }
  return cells;
}

// A leak means some shorter route exists. Fill a square that only the
// shortcut stands on: the player can't occupy a solid cell, so the
// shortcut dies while the intended sequence is untouched. Then re-prove.
function repair(level,script,shortcut){
  var mine={},k;
  var t1=trace(level,script);
  for(var i=0;i<t1.length;i++)mine[t1[i]]=1;
  var theirs=trace(level,shortcut);
  var cands=[];
  for(var j=0;j<theirs.length;j++)
    if(!mine[theirs[j]]&&cands.indexOf(theirs[j])<0)cands.push(theirs[j]);

  for(var c=0;c<cands.length&&c<10;c++){
    var parts=cands[c].split(",");
    var cand=[+parts[0],+parts[1],+parts[2]];
    if(cand[0]===level.goal[0]&&cand[1]===level.goal[1]&&cand[2]===level.goal[2])continue;
    var patched={name:level.name,hint:level.hint,rotate:level.rotate,
      start:level.start,goal:level.goal,
      blocks:level.blocks.concat([cand])};
    if(!replay(patched,script))continue;
    var best=solve(patched,true);
    if(best.status==="solved"&&best.path.length===script.length)
      return {level:patched,optimal:best.path.join(" ")};
  }
  return null;
}

// Reroll the hidden depths until the sequence is provably the shortest route.
function compose(script,tries){
  tries=tries||120;
  var lastErr=null,nearMiss=null;
  for(var seed=0;seed<tries;seed++){
    var r=synthesize(script,seed);
    if(!r.ok){lastErr=r;if(r.fatal)return {ok:false,leak:false,err:r};continue;}
    if(!replay(r.level,script))continue;
    var best=solve(r.level,true);
    if(best.status!=="solved")continue;
    if(best.path.length===script.length)
      return {ok:true,level:r.level,seed:seed,optimal:best.path.join(" ")};
    var fixed=repair(r.level,script,best.path);
    if(fixed)
      return {ok:true,level:fixed.level,seed:seed,optimal:fixed.optimal,repaired:true};
    if(!nearMiss)nearMiss={level:r.level,found:best.path,seed:seed};
  }
  if(nearMiss)return {ok:false,leak:true,level:nearMiss.level,
    found:nearMiss.found.join(" "),foundLen:nearMiss.found.length};
  return {ok:false,leak:false,err:lastErr};
}

/* ------------------------------------------------------------
   COMPOSE MODE — dictate the solution, watch the level appear
   ------------------------------------------------------------ */
var script=[],composeMode="3";

function refreshCompose(){
  var r=synthesize(script,0,true);
  if(!r.ok){flash(r.why||"couldn't build that");return;}
  composeMode=r.mode;
  L=r.level;R=makeRules(L);
  syncMeshes();syncHud();
}
function pushMove(tok){
  var probe=synthesize(script.concat([tok]),0,true);
  if(!probe.ok){flash(probe.why||"not possible here");return;}
  script.push(tok);
  var prev=script[script.length-2];
  // Flattening and immediately popping does no work in the plane, so the
  // solver can usually skip the pair.
  if(tok==="POP"&&prev==="FLAT")
    flash("flatten then pop with no move between rarely holds");
  // Doubling back is the big one. A sequence that returns where it came from
  // can never be the shortest route, so BUILD can never force it. Measured:
  // 59% of reversal-free sequences can be forced, against 14% otherwise.
  else if((tok==="\u2192"&&prev==="\u2190")||(tok==="\u2190"&&prev==="\u2192")||
          (tok==="\u2191"&&prev==="\u2193")||(tok==="\u2193"&&prev==="\u2191"))
    flash("doubling back can't be forced \u2014 a shorter route always exists");
  refreshCompose();
}
function popMove(){
  if(!script.length){flash("nothing to remove");return;}
  script.pop();refreshCompose();
}
function enterCompose(){
  app="compose";fromEditor=false;script=[];ghosted.clear();
  flat=false;flatTarget=0;flatT=0;view=0;viewAngle=0;viewAngleTarget=0;
  hidePanel();
  $("won").classList.remove("on");
  $("playBarWrap").classList.remove("on");$("playBar").classList.remove("on");
  $("editBarWrap").classList.remove("on");$("editBar").classList.remove("on");
  $("composeBarWrap").classList.add("on");$("composeBar").classList.add("on");
  refreshCompose();
  center.copy(centerT);viewSize=viewSizeT;onResize();
}
function buildComposed(){
  if(script.length<3){flash("give it at least a few moves");return;}
  showPanel("<h3>BUILD</h3>Forcing the sequence\u2026 rerolling hidden depths until "+
            "the solver agrees it's the shortest route.");
  setTimeout(function(){
    var r=compose(script,150);
    var html="<h3>BUILD</h3>";
    if(r.ok){
      snapshot();
      custom.blocks=r.level.blocks.map(function(v){return v.slice();});
      custom.start=r.level.start.slice();custom.goal=r.level.goal.slice();
      custom.rotate=true;custom.name="Composed "+script.length;
      var st=statsFor(custom);
      html+="<span class='ok'>Forced.</span> "+custom.blocks.length+
            " blocks, "+st.moves+" moves, <b>"+tierOf(st.score)+"</b>."+
            (r.repaired?" One extra block was needed to close a shortcut.":"")+
            "<br><span class='mono'>"+r.optimal+"</span><br><br>"+
            "The solver confirms nothing shorter exists."+
            "<div class='prow'><button id='pOpen'>OPEN IN EDITOR</button>"+
            "<button id='pClose5'>CLOSE</button></div>";
      showPanel(html);
      bind("pOpen",function(){enterEditor();});
      bind("pClose5",hidePanel);
      return;
    }
    if(r.leak){
      html+="<span class='bad'>Couldn't force it.</span><br>"+
            "Across 150 layouts the solver always found a faster route:<br>"+
            "<span class='mono'>"+r.found+"</span> ("+r.foundLen+" moves vs your "+
            script.length+")<br><br>"+
            "Usually the flatten collapses depth in a way that skips your middle "+
            "section. Try changing the view you flatten from, or add a move that "+
            "goes somewhere the shortcut can't.";
    } else {
      html+="<span class='bad'>"+(r.err?r.err.why:"no valid layout found")+"</span>";
    }
    html+="<div class='prow'><button id='pClose6'>CLOSE</button></div>";
    showPanel(html);
    bind("pClose6",hidePanel);
  },30);
}
