"use strict";
/* Orthogonal — 12-play.js
   The verbs: move, shove, collapse, restore, die, win.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   PLAY
   ============================================================ */
// A move that kills you and a move that's impossible are the same move as far
// as the solver is concerned - neither leads anywhere. So letting the player
// die costs nothing in puzzle terms; it only changes what they're told.
function die(kind){
  if(dying)return;
  dying=kind;dyingT=0;
  flash(kind==="fall"?"you fell":
        kind==="spike"?"something sharp was in that column":
        kind==="boss"?"out of lives":
        "the world closed on you");
  SFX.die();
  setTimeout(function(){
    dying=null;dyingT=0;
    playerMesh.scale.set(1,1,1);
    resetLevel();
  },kind==="crush"?1050:820);
}

/* ============================================================
   THE BOSS'S HALF OF A MOVE

   Called once after every action that counted - step, fold, unfold, turn.
   Order matters and mirrors the solver exactly: the clock advances, the
   sweep that lands on that tick is checked against where you now are, and
   only then does arriving on the core count as a strike. Get that order
   wrong and you could trade a life for a hit the solver said was avoidable.
   ============================================================ */
function bossReset(){
  bossHp=B?B.hp:0;bossMs=0;bossFlash=0;bossStruckBeat=-1;
  bossMoveMs=0;bossStunMs=0;bossHitFlash=0;
  bossAt=B&&B.at?{x:B.at[0],y:B.at[1],z:B.at[2]}:null;
  lives=B?BOSS_LIVES:0;
}
/* The fight, driven off the animation loop rather than off your moves.

   Paused whenever it is not actually in front of you - panel open, win card
   up, mid-death, intro showing - because a clock that runs while you read the
   menu is not difficulty. dt is clamped for the same reason: a backgrounded
   tab hands back one enormous frame on return, and without the clamp that
   single frame would march the boss across the arena and kill you for having
   switched apps. */
function bossFrame(dt){
  if(!B||app!=="play")return;
  if(dying||panelOpen()||!$("intro").classList.contains("gone")||
     $("won").classList.contains("on"))return;
  dt=Math.min(dt,90);
  if(bossHitFlash>0)bossHitFlash=Math.max(0,bossHitFlash-dt/380);

  // --- the sweep, unchanged: charges in plain sight, lands on the last ms
  if(B.beats.length){
    var was=B.live(bossMs);
    bossMs+=dt;
    var now=B.live(bossMs), beat=Math.floor(bossMs/B.period);
    if(now&&!was)bossFlash=1;
    if(now&&bossStruckBeat!==beat){
      var sw=B.beatAt(bossMs);
      var swHit=flat ? B.hits(sw,view,"2",flatPos.u,flatPos.y,0)
                     : B.hits(sw,view,"3",player.x,player.y,player.z);
      if(swHit){bossStruckBeat=beat;bossHurt("the slice caught you");return;}
    }
  }

  // --- the hunt
  if(!bossAt)return;
  if(bossStunMs>0){bossStunMs-=dt;return;}   // reeling: it neither moves nor bites
  bossMoveMs+=dt;
  if(bossMoveMs>=B.step){
    bossMoveMs=0;
    // In the plane it chases your column, because that is all of you there is
    // to chase; in the volume it comes for the cell you are standing in.
    var goal=flat?planeGoalFor():player;
    var nx=bossNext(R,bossAt,goal,liveCrates());
    if(nx)bossAt=nx;
  }
  if(bossTouching())bossHurt("it reached you");
}
// Where the boss aims while you are flat. It only knows your silhouette
// column, so it walks to the nearest square that shares it - which is why
// folding buys distance without ever quite losing it.
function planeGoalFor(){
  var best=null, bd=1e9;
  for(var i=0;i<L.blocks.length;i++){
    var b=L.blocks[i], y=b[1]+1;
    if(R.uOf(view,b[0],b[2])!==flatPos.u)continue;
    var d=Math.abs(b[0]-bossAt.x)+Math.abs(b[2]-bossAt.z);
    if(d<bd){bd=d;best={x:b[0],y:y,z:b[2]};}
  }
  return best||player;
}
function bossTouching(){
  if(!bossAt)return false;
  if(flat)return R.uOf(view,bossAt.x,bossAt.z)===flatPos.u&&bossAt.y===flatPos.y;
  return bossAt.x===player.x&&bossAt.y===player.y&&bossAt.z===player.z;
}
/* Would folding right now crush the boss?

   This is the game's own rule turned on the enemy. Rule 4 says a fold kills
   you if something already projects into your square; the boss is subject to
   exactly the same thing. So the way to hurt it is to manoeuvre it - it is
   chasing you, so you lead it - until it stands at a depth whose silhouette
   column is already occupied, and then fold.

   This had to exist because damage used to be "shove a crate into it", and
   crates are not taught until section IV. A boss whose only weapon is a piece
   the player has never seen is not a difficulty problem, it is an unsolvable
   one. Crushing needs nothing but the fold, so it works from the first fight,
   and each section then changes what a blocked column means: spikes poison
   more of them, glass removes them silently, crates let you build one.

   Rotating re-labels every column, which is the same question the puzzles
   ask, now aimed at something that moves. */
function bossCrushable(){
  if(!B||!bossAt||flat||dying||bossStunMs>0||app!=="play")return false;
  var u=R.uOf(view,bossAt.x,bossAt.z), cr=liveCrates();
  return !!(R.siloSolid(view,u,bossAt.y,cr)||R.deadly2(view,u,bossAt.y));
}
function bossFoldCrush(){
  if(!B||!bossAt)return;
  if(bossStunMs>0)return;
  var u=R.uOf(view,bossAt.x,bossAt.z), cr=liveCrates();
  if(!(R.siloSolid(view,u,bossAt.y,cr)||R.deadly2(view,u,bossAt.y)))return;
  bossDamage("the fold closed on it");
}
/* One hit, however it was landed. Knocked away from you and stunned, which
   is both the window you get to reposition and the reason a single lucky
   fold cannot chain into a whole fight. */
function bossDamage(why){
  bossHp--;
  bossStunMs=B.stun;bossHitFlash=1;
  SFX.strike();shakeT=1;
  var away=bossNext(R,bossAt,
    {x:bossAt.x+(bossAt.x-player.x)*3,y:bossAt.y,z:bossAt.z+(bossAt.z-player.z)*3},
    liveCrates());
  if(away)bossAt=away;
  if(bossHp<=0){buildGrid();win();return;}
  flash(why+" \u00b7 "+bossHp+(bossHp===1?" hit left":" hits left"));
  buildGrid();syncHud();
}
/* A crate has been shoved into it - the section IV way, and the only one that
   works while it is stunned and therefore uncrushable. */
function bossTakeCrate(){
  bossDamage("crate");
  return true;
}
function bossHurt(why){
  lives--;
  SFX.die();shakeT=1;
  var bar=$("bossBar");
  if(bar){bar.classList.remove("hurt");void bar.offsetWidth;bar.classList.add("hurt");}
  if(lives<=0){die("boss");return;}
  flash(why+" \u00b7 "+lives+" "+(lives===1?"life":"lives")+" left");
  // Both of you go back to your corners. Its damage stands - a late mistake
  // should not cost you the whole fight - and the clock restarts on a fresh
  // charge so you are not respawned into a sweep already about to land.
  moveHistory=[];
  initDynamic();buildDynamic();
  player={x:L.start[0],y:L.start[1],z:L.start[2]};
  bossAt=B.at?{x:B.at[0],y:B.at[1],z:B.at[2]}:null;
  flat=false;flatTarget=0;flatT=0;
  bossMs=0;bossStruckBeat=-1;bossMoveMs=0;bossStunMs=B.stun;
  buildGrid();syncHud();
}

function liveCrates(){
  var s=new Set();
  for(var i=0;i<gCrates.length;i++)s.add(K(gCrates[i][0],gCrates[i][1],gCrates[i][2]));
  return s;
}
function crateIndexAt(x,y,z){
  for(var i=0;i<gCrates.length;i++)
    if(gCrates[i][0]===x&&gCrates[i][1]===y&&gCrates[i][2]===z)return i;
  return -1;
}
// Keys are picked up in the plane, standing on the square the key folds into.
function collectHere(){
  if(!flat)return;
  var got=false;
  for(var i=0;i<R.keys.length;i++){
    if(gKeys&(1<<i))continue;
    var p=R.keys[i].split(","),kx=+p[0],ky=+p[1],kz=+p[2];
    if(ky===flatPos.y && R.uOf(view,kx,kz)===flatPos.u){gKeys|=(1<<i);got=true;}
  }
  if(got){
    SFX.key();
    var left=keysLeft();
    flash(left?(left+" still out there"):"the way is open");
  }
}

function move3(dx,dz,dir){
  if(dying)return;
  clearCue();
  var oldY=player.y;
  var nx=player.x+dx,nz=player.z+dz;
  var cr=liveCrates();
  var ci=crateIndexAt(nx,player.y,nz), moved=null;
  if(ci>=0){
    if(R.heldFast(nx,player.y,nz)) flash("amber has it");
    var res=R.push(nx,player.y,nz,dx,dz,cr);
    if(res){
      moved={i:ci,to:res};
      cr.delete(K(nx,player.y,nz));
      cr.add(K(res.x,res.y,res.z));
    }
  }
  var here=player;
  var ny=resolveStep(function(h){return R.solid(nx,h,nz,cr);},player.y,
                     function(h){return R.solid(here.x,h,here.z,cr);});
  if(ny===null){flash("blocked");SFX.bump();return;}
  pushHistory();moveCount++;
  if(moved){
    gCrates[moved.i]=[moved.to.x,moved.to.y,moved.to.z];SFX.shove();
    // did that crate land on the boss?
    if(B&&bossAt&&moved.to.x===bossAt.x&&moved.to.y===bossAt.y&&
       moved.to.z===bossAt.z&&bossTakeCrate())return;
  }
  if(ny===FELL){player.x=nx;player.z=nz;die("fall");return;}
  player.x=nx;player.z=nz;player.y=ny;
  if(R.deadly3(nx,ny,nz)){die("spike");return;}
  if(!moved)SFX.step();
  if(tutC){tutC.m3++;if(dir)tutC.d[dir]++;if(ny>oldY)tutC.climb++;}
  syncHud();saveSession();checkWin();
}
function move2(du){
  if(dying)return;
  clearCue();
  var nu=flatPos.u+du;
  var hu=flatPos.u, cr2=liveCrates();
  var ny=resolveStep(function(h){return R.siloSolid(view,nu,h,cr2);},flatPos.y,
                     function(h){return R.siloSolid(view,hu,h,cr2);});
  if(ny===null){flash("blocked");SFX.bump();return;}
  pushHistory();moveCount++;
  if(ny===FELL){flatPos.u=nu;die("fall");return;}
  flatPos.u=nu;flatPos.y=ny;
  if(R.deadly2(view,nu,ny)){die("spike");return;}
  SFX.step();collectHere();
  if(tutC)tutC.m2++;
  syncHud();saveSession();
}
/* What would folding from right here do to you, and which blocks are to blame?

   The rule has always been that a fold crushes you if something already
   projects into your square. What the screen never said was *which* something.
   In an orthographic view a block many cells away in depth sits in your column
   the moment you flatten, but it reads as unrelated scenery until it kills
   you - and worse, in a rotated view a block one step to your left can share
   your silhouette square while looking nowhere near you.

   This is the same problem the eye button solves for landings, so it gets the
   same answer: show it, for free, before it costs a move. The fold is not
   blocked - dying to it stays a legal outcome and the puzzles still turn on
   picking the right axis. It just stops being a gotcha and becomes a choice.

   Returns null when the fold is safe, otherwise {kind, cells}. */
function foldPeril(){
  if(!L||app!=="play"||flat||dying||!R||!canShift())return null;
  var u=R.uOf(view,player.x,player.z), cr=liveCrates();
  var crush=R.siloSolid(view,u,player.y,cr);
  var spike=R.deadly2(view,u,player.y);
  if(!crush&&!spike)return null;
  // the guilty are whatever shares your silhouette square: for a crush the
  // blocks at your height, for a spike the ones directly beneath it
  var wantY=crush?player.y:player.y-1, cells=[];
  for(var i=0;i<L.blocks.length;i++){
    var b=L.blocks[i];
    if(b[1]!==wantY)continue;
    if(isGlass(b)||isCrate(b))continue;         // neither casts a silhouette
    if(crush&&isSpike(b)&&!R.solid(b[0],b[1],b[2],cr))continue;
    if(spike&&!isSpike(b))continue;
    if(R.uOf(view,b[0],b[2])!==u)continue;
    cells.push(b);
  }
  if(crush)
    for(var c=0;c<gCrates.length;c++){
      var g=gCrates[c];
      if(g[1]===wantY&&R.uOf(view,g[0],g[2])===u)cells.push(g);
    }
  return {kind:crush?"crush":"spike",cells:cells};
}
// A tutorial level may withhold a verb so the lesson stays about one thing.
function canShift(){return !(app==="play"&&L&&L.lockFlat);}
function doFlatten(){
  if(dying||!canShift())return;
  clearCue();
  var pu=R.uOf(view,player.x,player.z), crf=liveCrates();
  lastSolidDepth=R.dOf(view,player.x,player.z);
  pushHistory();moveCount++;
  flatPos={u:pu,y:player.y};
  flat=true;flatTarget=1;SFX.fold();collectHere();
  if(tutC)tutC.flat++;
  bossFoldCrush();
  syncHud();saveSession();
  // Something else already occupies that square in the plane. Let the fold
  // play out, then close on the player.
  if(R.siloSolid(view,pu,player.y,crf)) setTimeout(function(){die("crush");},420);
  else if(R.deadly2(view,pu,player.y)) setTimeout(function(){die("spike");},420);
}
function doUnflatten(){
  if(dying||!canShift())return;
  clearCue();
  var land=R.landings(view,flatPos.u,flatPos.y,liveCrates());
  if(!land.length){flash("nothing solid behind that");SFX.bump();return;}
  var b=R.pick(land);
  pushHistory();moveCount++;
  player.x=b.x;player.z=b.z;player.y=flatPos.y;
  flat=false;flatTarget=0;SFX.unfold();
  if(tutC)tutC.unflat++;
  if(R.deadly3(player.x,player.y,player.z)){die("spike");return;}
  syncHud();saveSession();
  checkWin();
}
function press(dir){
  if(app!=="play")return;
  if(flat){ if(dir==="left")move2(-1); else if(dir==="right")move2(1); return; }
  var r=AX[view].r,d=AX[view].d;
  if(dir==="left")move3(-r[0],-r[2],dir);
  else if(dir==="right")move3(r[0],r[2],dir);
  else if(dir==="up")move3(-d[0],-d[2],dir);
  else if(dir==="down")move3(d[0],d[2],dir);
}
function hintCap(){return capForHints(hintsUsed);}
function keysLeft(){
  var n=0;
  for(var i=0;i<R.keys.length;i++) if(!(gKeys&(1<<i))) n++;
  return n;
}
function checkWin(){
  // A boss has no goal square at all: the fight ends when its last hit point
  // goes, in bossTakeCrate(), never by arriving somewhere.
  if(B)return;
  if(player.x!==L.goal[0]||player.y!==L.goal[1]||player.z!==L.goal[2])return;
  if(keysLeft()){flash("still sealed \u2014 "+keysLeft()+" to collect");SFX.bump();return;}
  win();
}
var starsBefore=0,starsAfter=0,starsGained=0;
function win(){
  SFX.win();
  clearSession();
  starsBefore=starsAfter=starsGained=0;
  if(levelKey&&playSource==="builtin"){
    // store the move count that reflects the stars actually earned, so hints
    // can't be laundered into currency
    var effective=moveCount;
    var capped=hintCap();
    if(levelPar!==null&&capped<3){
      if(capped===2)effective=Math.max(effective,levelPar+1);
      else if(capped===1)effective=Math.max(effective,Math.floor(levelPar*1.2)+1);
      else effective=Math.max(effective,Math.floor(levelPar*1.4)+1);
    }
    // Stars gained is the *improvement*, not the stars just scored: replaying
    // a 3-star level pays nothing, and going 2 -> 3 pays exactly the one new
    // star. starsEarned() already sums best-per-level, so this keeps the
    // flight and the total telling the same story.
    var rec=B?lives:effective;
    var prev=progress[levelKey];
    starsBefore=starsForRecord(L,prev);
    if(betterRecord(L,rec,prev)){progress[levelKey]=rec;progSave();}
    starsAfter=starsForRecord(L,progress[levelKey]);
    starsGained=Math.max(0,starsAfter-starsBefore);
  }
  var last=lvIndex>=LEVELS.length-1;
  if(fromEditor){
    $("wonTitle").textContent="Your level works";
    $("wonSub").textContent=custom.name;
    $("bNext").textContent="BACK TO EDITOR";
  } else if(playSource==="library"){
    var n=sortedLibrary().length;
    $("wonTitle").textContent="Solved";
    $("wonSub").textContent=L.name+"  ("+(libIndex+1)+" of "+n+")";
    $("bNext").textContent=libIndex>=n-1?"DONE":"NEXT LEVEL";
  } else if(L.tutorial){
    $("wonTitle").textContent="Got it";
    $("wonSub").textContent=L.name.replace(/^00 \u2014 /,"")+"  \u00b7  "+
      moveCount+" moves  \u00b7  not scored";
    $("bNext").textContent="NEXT LEVEL";
    $("bRetry").style.display="none";
  } else if(B){
    // Scored on lives, so hints cost nothing here and moves are not the point.
    var stb=Math.max(0,Math.min(3,lives));
    $("wonTitle").innerHTML=(stb===3?"Untouched":"Down")+
      "<div class='bigstars'>"+starGlyphsEls(stb)+"</div>";
    $("wonSub").textContent=L.name+"  \u00b7  "+
      (stb===3?"never hit":(BOSS_LIVES-lives)+" hit"+(BOSS_LIVES-lives===1?"":"s")+
       " taken")+"  \u00b7  "+moveCount+" moves";
    $("bNext").textContent=last?"PLAY AGAIN":"NEXT LEVEL";
    $("bRetry").style.display=stb>=3?"none":"flex";
  } else {
    var stw=Math.min(levelPar!==null?starsFor(moveCount,levelPar):3,hintCap());
    $("wonTitle").innerHTML=(last?"Campaign complete":(stw===3?"Perfect":"Solved"))+
      "<div class='bigstars'>"+starGlyphsEls(stw)+"</div>";
    var sub=L.name+"  \u00b7  "+moveCount+" moves"+
      (levelPar!==null?(stw===3?" (optimal)":", best possible is "+levelPar):"");
    if(hintsUsed)sub+="  \u00b7  "+hintsUsed+" hint"+(hintsUsed===1?"":"s")+
      " (capped at "+hintCap()+")";
    $("wonSub").textContent=sub;
    $("bNext").textContent=last?"PLAY AGAIN":"NEXT LEVEL";
    $("bRetry").style.display=stw>=3?"none":"flex";
  }
  if(fromEditor||playSource!=="builtin")$("bRetry").style.display="none";
  setTimeout(function(){$("won").classList.add("on");},380);
  // The stars that are new are the rightmost ones: you had starsBefore, you
  // now have starsAfter, so glyphs [starsBefore, starsAfter) are the ones
  // that just arrived and the only ones that fly. Nothing gained, nothing
  // flies. Held until the win card is up and settled, so they leave from a
  // card the player has actually seen.
  if(starsGained>0){
    var base=starsEarned()-starsGained;
    setTimeout(function(){
      // dismissed already: there is nothing on screen to fly from, and
      // syncHud has since put the true total in the counter anyway
      if(!$("won").classList.contains("on")){syncStarTotal();return;}
      var all=$("won").querySelectorAll(".bigstars .sg");
      var fly=[];
      for(var i=starsBefore;i<starsAfter&&i<all.length;i++)fly.push(all[i]);
      flyStars(fly,base,starsGained);
    },900);
  }
}
function rotateView(dir){
  if(flat||dying)return;
  if(app==="play")clearCue();
  if(app==="play"&&L.rotate===false)return;
  if(app==="play"){pushHistory();moveCount++;SFX.turn();if(tutC)tutC.rot++;}
  view=(view+dir+4)%4;viewAngleTarget+=dir*90;
  buildGrid();syncHud();saveSession();
}
function initDynamic(){
  gCrates=[];gKeys=0;
  for(var i=0;i<L.blocks.length;i++)
    if(isCrate(L.blocks[i]))
      gCrates.push([L.blocks[i][0],L.blocks[i][1],L.blocks[i][2]]);
  nKeysTotal=(L.keys||[]).length;
}
function resetLevel(){
  moveHistory=[];moveCount=0;hintsUsed=0;tutReset();
  bossReset();
  initDynamic();buildDynamic();
  player={x:L.start[0],y:L.start[1],z:L.start[2]};
  flat=false;flatTarget=0;flatT=0;view=0;viewAngle=0;viewAngleTarget=0;
  buildGrid();syncHud();
  playerMesh.position.set(player.x,player.y,player.z);
}
function loadLevel(level,idx){
  L=level;R=makeRules(L);
  if(idx!==undefined)lvIndex=idx;
  $("lvName").textContent=L.name;
  $("lvHint").textContent=L.hint;
  $("won").classList.remove("on");
  player={x:L.start[0],y:L.start[1],z:L.start[2]};
  flat=false;flatTarget=0;flatT=0;view=0;viewAngle=0;viewAngleTarget=0;
  moveHistory=[];moveCount=0;hintsUsed=0;dying=null;tutReset();
  B=makeBoss(L);bossReset();
  playerMesh.scale.set(1,1,1);
  initDynamic();
  levelKey=L.name;
  // Tutorials are deliberately unscored, so we don't even ask the solver:
  // its answer for a teaching level is often a clever route the lesson is
  // not about, and showing that as par would be punishing the student.
  var pst=(L.tutorial||L.boss)?{ok:false}:statsCached(L);
  levelPar=pst.ok?pst.moves:null;
  syncMeshes();buildGrid();syncHud();
  center.copy(centerT);viewSize=viewSizeT;onResize();
  playerMesh.position.set(player.x,player.y,player.z);
}
