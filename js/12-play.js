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
  bossHp=B?B.hp:0;bossFlash=0;bossHitFlash=0;
  bossMoveMs=0;bossStunMs=0;
  bossPhase="aim";bossPhaseMs=0;bossAim=null;shots=[];shotMs=0;
  bossAt=B&&B.at?{x:B.at[0],y:B.at[1],z:B.at[2]}:null;
  lives=B?BOSS_LIVES:0;
}
/* The fight, driven off the animation loop.

   Paused whenever it is not in front of you - panel open, win card up,
   mid-death, intro showing - because a clock that runs while you read the
   menu is not difficulty. dt is clamped because a backgrounded tab hands back
   one enormous frame on return, and without the clamp that frame would march
   the boss and every projectile across the arena at once. */
function bossFrame(dt){
  if(!B||app!=="play")return;
  if(dying||panelOpen()||!$("intro").classList.contains("gone")||
     $("won").classList.contains("on"))return;
  dt=Math.min(dt,90);
  if(bossHitFlash>0)bossHitFlash=Math.max(0,bossHitFlash-dt/380);
  if(bossFlash>0)bossFlash=Math.max(0,bossFlash-dt/300);
  if(!bossAt)return;

  moveShots(dt);

  if(bossStunMs>0){bossStunMs-=dt;return;}   // reeling: it does not aim or walk

  var goal=flat?planeGoalFor():player;

  /* It plants to shoot. While a lock is held it does not walk, so the line
     you are shown is the line that fires - a telegraph that drifts is not a
     telegraph. Stopping is also the tell: it freezing is what tells you a
     shot is coming, before the line has even brightened. */
  if(bossPhase==="aim"&&!bossAim){
    bossMoveMs+=dt;
    if(bossMoveMs>=B.step){
      bossMoveMs=0;
      var nx=bossNext(R,bossAt,goal,liveCrates());
      if(nx)bossAt=nx;
      if(bossTouching()){bossHurt("it reached you");return;}
    }
  }

  bossPhaseMs+=dt;
  if(bossPhase==="aim"){
    // Lock only when actually lined up. Once locked it commits: break the
    // line all you like, the shot still goes where it was aimed.
    if(!bossAim){
      bossAim=bossAimDir(R,bossAt,goal,liveCrates());
      if(bossAim)bossPhaseMs=0;
      else return;                  // no line yet - keep walking, no countdown
    }
    if(bossPhaseMs>=B.aim){
      shots.push({x:bossAt.x,y:bossAt.y,z:bossAt.z,dx:bossAim.dx,dz:bossAim.dz});
      SFX.shot();bossFlash=1;
      // "fire", not "open" - see resolveShot(). The window comes after the
      // bullet, never during it.
      bossPhase="fire";bossPhaseMs=0;bossAim=null;
    }
  } else if(bossPhase==="open"&&bossPhaseMs>=B.open){
    bossPhase="aim";bossPhaseMs=0;
  }
}
function moveShots(dt){
  if(!shots.length)return;
  shotMs+=dt;
  if(shotMs<B.shotStep)return;
  shotMs=0;
  var cr=liveCrates(), keep=[];
  for(var i=0;i<shots.length;i++){
    var n=shotNext(R,shots[i],cr);
    if(!n)continue;                        // hit cover and died there
    if(Math.abs(n.x)>40||Math.abs(n.z)>40)continue;
    if(shotHits(n)){bossHurt("shot");return;}
    keep.push(n);
  }
  shots=keep;
  resolveShot();
}
/* The exposed beat starts when the bullet is spent, not when it leaves the
   barrel.

   That single ordering is what killed the last exploit. With the window
   opening at the muzzle, a motionless player could fold the instant it fired
   and land a hit while the shot was still crossing the floor - trading one
   life for one hit point, which against three lives and three hit points is
   exactly enough to win by doing nothing. Now the shot has to miss you
   before there is anything to punish. */
function resolveShot(){
  if(bossPhase==="fire"&&!shots.length){bossPhase="open";bossPhaseMs=0;}
}
function shotHits(s){
  if(flat)return R.uOf(view,s.x,s.z)===flatPos.u&&s.y===flatPos.y;
  return s.x===player.x&&s.y===player.y&&s.z===player.z;
}
// Where the boss aims while you are flat: it only knows your silhouette
// column, so it walks to the nearest square sharing it.
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
/* The strike window. It is OPEN only in the beat after it fires, and you can
   only reach it by folding while you share its silhouette column - so you
   have to survive the shot and then be lined up, and rotating decides what
   "lined up" means.

   Outside OPEN the identical input kills you: it is solid in the plane, so
   folding into its column is folding into a wall. The strike and the suicide
   are one button apart in timing, which is the whole fight. */
function bossOpen(){
  return !!(B&&bossAt&&bossPhase==="open"&&bossStunMs<=0&&!dying);
}
function bossAligned(){
  if(!B||!bossAt)return false;
  return R.uOf(view,bossAt.x,bossAt.z)===R.uOf(view,player.x,player.z)&&
         bossAt.y===player.y;
}
function bossCrushable(){
  return !flat&&app==="play"&&bossOpen()&&bossAligned();
}
function bossFoldStrike(){
  if(!B||!bossAt||!bossAligned())return false;
  if(bossOpen()){bossDamage("caught it open");return true;}
  /* Aligned but not open: in the plane it is solid, and you have just folded
     into it. Same input, same geometry, one beat early - which is what makes
     the OPEN window worth waiting for instead of a light to react to. */
  setTimeout(function(){if(!dying)bossHurt("you folded into it");},380);
  return true;
}
/* One hit, however it was landed. Knocked away and stunned, which is the
   window to reposition and the reason one lucky fold cannot chain. */
function bossDamage(why){
  bossHp--;
  bossStunMs=B.stun;bossHitFlash=1;
  bossPhase="aim";bossPhaseMs=0;bossAim=null;
  SFX.strike();shakeT=1;
  var away=bossNext(R,bossAt,
    {x:bossAt.x+(bossAt.x-player.x)*3,y:bossAt.y,z:bossAt.z+(bossAt.z-player.z)*3},
    liveCrates());
  if(away)bossAt=away;
  if(bossHp<=0){buildGrid();win();return;}
  flash(why+" \u00b7 "+bossHp+(bossHp===1?" hit left":" hits left"));
  buildGrid();syncHud();
}
function bossTakeCrate(){bossDamage("crate");return true;}
function bossHurt(why){
  lives--;
  SFX.die();shakeT=1;
  var bar=$("bossBar");
  if(bar){bar.classList.remove("hurt");void bar.offsetWidth;bar.classList.add("hurt");}
  if(lives<=0){die("boss");return;}
  flash(why+" \u00b7 "+lives+" "+(lives===1?"life":"lives")+" left");
  // Both back to your corners; its damage stands, and it starts a fresh
  // wind-up so you are never respawned into a shot already in the air.
  moveHistory=[];
  initDynamic();buildDynamic();
  player={x:L.start[0],y:L.start[1],z:L.start[2]};
  bossAt=B.at?{x:B.at[0],y:B.at[1],z:B.at[2]}:null;
  flat=false;flatTarget=0;flatT=0;
  shots=[];bossPhase="aim";bossPhaseMs=0;bossAim=null;bossStunMs=B.stun;
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
  var onBoss=!!(B&&bossAt&&!bossOpen()&&
    R.uOf(view,bossAt.x,bossAt.z)===u&&bossAt.y===player.y);
  if(!crush&&!spike&&!onBoss)return null;
  // the guilty are whatever shares your silhouette square: for a crush the
  // blocks at your height, for a spike the ones directly beneath it
  // The boss is solid in the plane too, and folding into it while it is not
  // open is the most expensive mistake in the fight - so it is reported here
  // like any other thing that fills your square.
  if(B&&bossAt&&!bossOpen()&&
     R.uOf(view,bossAt.x,bossAt.z)===u&&bossAt.y===player.y)
    return {kind:"boss",cells:[[bossAt.x,bossAt.y,bossAt.z]]};
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
  bossFoldStrike();
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
