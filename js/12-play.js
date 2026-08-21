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
/* Dying on a level with a clock spends a life, not the level.

   Falling out of the world, standing on a spike, folding into a wall - on an
   ordinary level each of those restarts the puzzle, which costs nothing but
   the moves you had made. On a trial it was costing the cores you had already
   reached and the rhythm you had already learned, which is the whole level:
   being sent back to zero for a mistimed step is a punishment out of all
   proportion, and it made the three cores feel like one long tightrope
   instead of three crossings. A life is what these levels are scored on and
   a life is what they should charge. Running out is still a real reset -
   `die("boss")` and `die("trial")` are that path, and they do not recurse. */
function die(kind){
  if(dying)return;
  dying=kind;dyingT=0;
  var spend=(B||TR)&&kind!=="boss"&&kind!=="trial";
  flash(kind==="fall"?"you fell":
        kind==="spike"?"something sharp was in that column":
        kind==="boss"||kind==="trial"?"out of lives":
        "the world closed on you");
  SFX.die();
  setTimeout(function(){
    dying=null;dyingT=0;
    playerMesh.scale.set(1,1,1);
    if(spend){spendLife();return;}
    resetLevel();
  },kind==="crush"?1050:820);
}
/* One life, and back to the start with everything else intact: the cores you
   have taken, the clock, the pack's damage. You are put back at the start
   rather than left where you were, because you got here by falling out of
   the world or being crushed - there is nowhere to leave you. */
function spendLife(){
  lives--;
  if(lives<=0){die(TR?"trial":"boss");return;}
  flash(lives+" "+(lives===1?"life":"lives")+" left");
  if(TR)trialGrace=TR.period;
  if(B)bossGraceMs=B.grace;
  moveHistory=[];
  initDynamic();buildDynamic();
  player={x:L.start[0],y:L.start[1],z:L.start[2]};
  flat=false;flatTarget=0;flatT=0;
  // And the rotation you started the level with. You got here by falling,
  // being crushed or standing on something sharp, so you are being put back
  // at the beginning - facing the way the level opens is part of that, and
  // resuming a restart mid-turn is disorienting in exactly the wrong moment.
  view=0;viewAngle=0;viewAngleTarget=0;
  buildGrid();syncHud();
  playerMesh.position.set(player.x,player.y,player.z);
}

/* ============================================================
   THE FIGHT

   Everything here runs off the animation loop, and is paused whenever the
   fight is not actually in front of you - panel open, win card up,
   mid-death, intro showing - because a clock that runs while you read the
   menu is not difficulty. dt is clamped because a backgrounded tab hands
   back one enormous frame on return, and without the clamp that single
   frame marches the whole pack across the arena at once.
   ============================================================ */
function bossReset(){
  bossHp=B?B.hp:0;bossFlash=0;bossHitFlash=0;bossCreepMs=0;bossGraceMs=0;
  hunters=[];twinCore=0;twinAt=null;bossPhase=0;
  if(B&&B.twin)twinSpawn(0);
  else if(B){bossRestoreArena();bossEnterPhase(false);}
  lives=B?BOSS_LIVES:0;
}
// Does this fight raise anything mid-way? A boss whose phases all have empty
// `add` never touches L.blocks at all, so it runs the code it always ran.
function bossRisers(){
  if(!B||!B.phases)return false;
  for(var i=0;i<B.phases.length;i++)if(B.phases[i].add.length)return true;
  return false;
}
/* Put the arena back the way it was authored.

   Phases raise blocks by pushing them into L.blocks and rebuilding the rules,
   which means the level object is genuinely edited while you fight - so the
   pristine list has to be kept somewhere and restored on every reset, or a
   second attempt would begin with the last attempt's pillars already up.
   `arenaBase` is captured exactly once, the first time this level is ever
   loaded, and never overwritten: at that moment L.blocks is guaranteed clean,
   because this is the only code that dirties it. Capturing it again on a
   later load is precisely the bug this ordering avoids. */
function bossRestoreArena(){
  if(!bossRisers())return;
  if(!L.arenaBase)L.arenaBase=L.blocks.slice();
  L.blocks=L.arenaBase.slice();
  R=makeRules(L);
  syncMeshes();
}
/* A pillar rising into an occupied square lifts whoever is standing there
   rather than burying them. Being crushed by scenery is not an attack you
   could have read, and the fold already covers dying to blocks you chose.

   The flat case is the common one, not the exception: you clear a phase by
   folding, so the pillars of the next phase almost always come up while you
   are in the plane. There the height you will come back down at is the real
   quantity - `flatPos.y` is what doUnflatten lands you on - so that is what
   has to rise, and the pillar you were lifted over becomes the block you
   stand on when you return to the volume. */
function liftPlayer(){
  var cr=liveCrates(), guard=0;
  if(flat){
    while(R.siloSolid(view,flatPos.u,flatPos.y,cr)&&guard++<8)flatPos.y++;
    player.y=flatPos.y;
    return;
  }
  while(R.solid(player.x,player.y,player.z,cr)&&guard++<8)player.y++;
}
/* Begin a phase: raise its blocks, then put its hunters down.

   The stagger on their clocks is the same trick the pack always used -
   identical ones make them move as one animal, which is both easier to dodge
   and much less alarming. */
function bossEnterPhase(announce){
  var ph=B.phases[bossPhase], i;
  if(ph.add.length){
    var crateRose=false;
    for(i=0;i<ph.add.length;i++){
      L.blocks.push(ph.add[i]);
      if(isCrate(ph.add[i]))crateRose=true;
    }
    R=makeRules(L);
    /* A crate is dynamic, so its arrival has to go through the crate list
       rather than the block list. Rebuilding it resets any crate already
       shoved, which is why no phase after the one that brings them may add
       more - bossArena has no opinion on that, so it is a note, not a check.
       syncMeshes() calls buildDynamic() itself, so the list is all that is
       wanted here. */
    if(crateRose)initDynamic();
    syncMeshes();buildGrid();
    liftPlayer();
  }
  hunters=[];
  for(i=0;i<ph.at.length;i++){
    var a=ph.at[i];
    hunters.push({x:a[0],y:a[1],z:a[2],ms:i*ph.step/Math.max(1,ph.at.length),
                  step:ph.step,doom:false,lock:0,line:null,shy:0});
  }
  bossCreepMs=0;
  if(announce){
    // A beat of grace, because a phase that begins by walking a fresh hunter
    // into you is a hit you were given no way to read.
    bossGraceMs=Math.max(bossGraceMs,B.grace);
    SFX.strike();shakeT=1;bossHitFlash=1;
    flash(ph.say||("phase "+(bossPhase+1)+" of "+B.phases.length));
  }
  syncHud();
}
/* How long a hunter plants before it charges, in the phase being played. The
   renderer needs it to ramp the telegraph, and it must come from the phase
   rather than the fight: pacing lives per phase now, so a single B.aim would
   be a number no phase actually uses. It used to read B.aim directly, and
   when that moved onto the phase the ramp quietly became NaN - which does not
   throw, it just stops drawing the line. The charge arrived with no warning
   at all and read, correctly, as being shot from across the arena. */
function bossAim(){
  if(!B)return 1;
  if(B.twin)return Math.max(1,B.aim||1);
  var ph=B.phases&&B.phases[bossPhase];
  return Math.max(1,(ph&&ph.aim)||1);
}
/* Back to your corner, at the end of a phase.

   Killing means folding and folding means being where it is, so the square
   next to a spawn is the best square in the arena: stand there and take each
   arrival as it appears, and the fight is a queue rather than a hunt. That is
   farming, which is the one thing five boss designs have been spent avoiding,
   and it was found in the first playtest.

   A *phase boundary*, though, not a kill. The camp being closed here is the
   one between phases - every phase puts its hunter down on the same cell, so
   holding that cell means the next one arrives beside you already. Inside a
   phase there is no queue to farm: the two hunters of phase four walk at you
   once and only return to their spawns if they hit you, so taking the ground
   you earned for killing the first of them would be charging you for playing
   well - which is exactly what a hit deliberately does not do.

   This is deliberately the opposite of what a *hit* does. A hit throws the
   pack back to its spawns and does not move you, because losing the position
   you spent twenty seconds building is a punishment for being hit and for
   having played well at the same time. Winning the exchange is the moment you
   can afford to give that position up, so that is where the cost goes: the
   kill is free, the ground is not, and you have to cross the arena again to
   get the next one.

   It puts the whole view back where the fight started: the start square, the
   volume, and the starting rotation. A phase boundary is the one moment the
   fight genuinely restarts, and arriving at a new phase still folded, facing
   an axis you chose for the last one, means reading a board that changed
   while you were not looking at it straight on.

   Deferred by a beat so the kill reads before the world moves - the same
   reason die("crush") waits for the fold to play out. */
function bossSendHome(){
  if(!B||!B.phases||levelDone||dying||app!=="play")return;
  var s=L.start;
  player={x:s[0],y:s[1],z:s[2]};
  flat=false;flatTarget=0;flatT=0;
  view=0;viewAngle=0;viewAngleTarget=0;
  moveHistory=[];
  buildGrid();syncHud();
  playerMesh.position.set(player.x,player.y,player.z);
}
/* The board is clear, so the fight moves on rather than ending. This is the
   whole structure in four lines: the health bar counts phases, and the last
   one running out is the win. */
function bossAdvance(){
  bossPhase++;
  bossHp=B.phases.length-bossPhase;
  if(bossPhase>=B.phases.length){hunters=[];buildGrid();win();return;}
  bossEnterPhase(true);
}
/* Put the two halves down mirrored about core `i`'s centre. Both clocks run
   together on purpose - the halves are one animal and should move as one, so
   the staggering that gives the pack its texture is exactly wrong here. */
function twinSpawn(i,keepStep){
  var p=B.pairs[i], st=keepStep||B.step;
  twinCore=i;twinAt={x:p.c[0],y:p.c[1],z:p.c[2]};
  hunters=[{x:p.a[0],y:p.a[1],z:p.a[2],ms:0,step:st,doom:false,lock:0,
            line:null,hold:B.hold},
           {x:p.b[0],y:p.b[1],z:p.b[2],ms:0,step:st,doom:false,lock:0,
            line:null,hold:B.hold}];
}
// Your reflection through the centre: the square the far half is hunting
// while the near one hunts you. This is the entire coupling - there is no
// code that copies one half's move onto the other, because both are simply
// walking at a target, and the targets are reflections.
function twinMirror(g){
  if(!twinAt)return g;
  return {x:2*twinAt.x-g.x, y:g.y, z:2*twinAt.z-g.z};
}
// Do the two halves share a square in the plane? The kill, and the one thing
// the whole fight is arranging.
function twinAligned(){
  if(!B||!B.twin||hunters.length<2)return false;
  var a=hunters[0], b=hunters[1];
  return a.y===b.y&&R.uOf(view,a.x,a.z)===R.uOf(view,b.x,b.z);
}
// The square a hunter is heading for. While you are flat it can only see
// your silhouette column, so it walks to the nearest square that shares it -
// which is why folding does not hide you, it just makes you wider.
function huntGoal(h){
  if(!flat)return player;
  var best=null, bd=1e9;
  for(var i=0;i<L.blocks.length;i++){
    var b=L.blocks[i];
    if(R.uOf(view,b[0],b[2])!==flatPos.u)continue;
    var d=Math.abs(b[0]-h.x)+Math.abs(b[2]-h.z);
    if(d<bd){bd=d;best={x:b[0],y:b[1]+1,z:b[2]};}
  }
  return best||player;
}
// Would folding right now kill something standing here?
function doomedCell(x,y,z,cr){
  return foldKills(R,view,player,{x:x,y:y,z:z},cr);
}
/* Is this hunter on a line it can charge down? While you are flat you are a
   whole silhouette column rather than a square, so every hunter sharing it
   has a line on you - which is why standing in the plane is the most
   dangerous thing in the fight, and why the fold has to be a moment rather
   than a place to hide. */
function huntLine(h,cr){
  if(flat)
    return (R.uOf(view,h.x,h.z)===flatPos.u&&h.y===flatPos.y)?{dx:0,dz:0}:null;
  return bossLine(R,h,player,cr);
}
function bossFrame(dt){
  if(!B||app!=="play")return;
  if(dying||levelDone||panelOpen()||!$("intro").classList.contains("gone")||
     $("won").classList.contains("on"))return;
  /* Clamp first, then scale. The clamp is about a backgrounded tab handing
     back one enormous frame; the scale is the player's pace setting, and
     applying it here means every derived interval below - the phase's step
     and aim, creep, rage, grace - slows together and keeps its ratio to the
     others. A phase is a set of dials; pace must not be another one. */
  dt=Math.min(dt,90)*paceScale();
  if(bossHitFlash>0)bossHitFlash=Math.max(0,bossHitFlash-dt/380);
  if(bossFlash>0)bossFlash=Math.max(0,bossFlash-dt/300);
  if(bossGraceMs>0)bossGraceMs=Math.max(0,bossGraceMs-dt);
  if(!hunters.length)return;

  /* The creep. Nothing about this fight stops you from running in circles,
     so the circles get smaller: every creepEvery the whole pack speeds up a
     little, and there is no upper bound on how long you may take, only on
     how pleasant it stays. */
  bossCreepMs+=dt;
  if(bossCreepMs>=B.creepEvery){
    bossCreepMs=0;
    for(var c=0;c<hunters.length;c++)
      hunters[c].step=Math.max(B.floorStep,hunters[c].step*B.creep);
  }

  var cr=liveCrates();
  /* The twin walks and nothing else - no line, no charge. It does not need
     one: the halves come from opposite sides by construction, so dodging the
     near one steps you toward the far one, and the pinch is the pressure. */
  if(B.twin){
    for(var t=0;t<hunters.length;t++){
      var th=hunters[t];
      th.ms+=dt;
      if(th.ms<th.step)continue;
      th.ms=0;
      var tg=t===0?huntGoal(th):twinMirror(huntGoal(th));
      /* It skirts the live arm of its own cross, because standing there is
         what kills it - and since the halves are reflections, "the pair is
         in one column" is exactly "this half shares a column with the
         centre", which is a cheap and exact test rather than a guess about
         where the other half will be after it moves.

         Same patience rule as the pack: it dodges only while dodging is
         free, and after two steps that fail to close it comes straight
         through. Without the avoidance the halves crossed the arm on their
         way to anybody, and three cores fell in under three seconds. */
      var tn=bossNext(R,th,tg,cr,function(c){
        return R.uOf(view,c.x,c.z)===R.uOf(view,twinAt.x,twinAt.z);
      },true);
      if(tn&&!hunterAt(tn.x,tn.y,tn.z,t)){th.x=tn.x;th.y=tn.y;th.z=tn.z;}
      if(hunterTouching(th)){bossHurt("it closed on you");return;}
    }
    var al=twinAligned();
    hunters[0].doom=hunters[1].doom=al&&!flat;
    return;
  }
  var ph=B.phases[bossPhase];
  for(var i=0;i<hunters.length;i++){
    var h=hunters[i];
    /* Planted. It does not walk while a lock is held, so the line you are
       shown is the line that fires - a telegraph that drifts is not a
       telegraph - and stepping off the line is what breaks it. That is the
       dodge, and folding is the other answer to the same question. */
    if(h.lock>0){
      h.line=huntLine(h,cr);
      if(!h.line){h.lock=0;continue;}          // you broke the line: it walks
      h.lock-=dt;
      if(h.lock<=0){
        h.lock=0;h.line=null;
        h.x=player.x;h.y=player.y;h.z=player.z;   // the charge, all at once
        SFX.shot();shakeT=1;
        bossHurt("it came down the line");
        return;
      }
      continue;
    }
    h.ms+=dt;
    if(h.ms<h.step)continue;
    h.ms=0;
    var goal=huntGoal(h);
    /* Three grades of square, not two - see bossNext. A cunning hunter rates
       a line you cannot answer above a line you can, which is the whole of
       phase three: "it is lined up" stops meaning "I can eat it", because the
       line it chose is the one your current view cannot fold on and the
       answer is a rotation you have to spend a beat on.

       Graded only while you are standing up. Flat, every hunter sharing your
       silhouette column already has a line and you cannot fold again anyway,
       so there is nothing for it to prefer. */
    var nx=bossNext(R,h,goal,cr,function(c){
      var has=flat?(R.uOf(view,c.x,c.z)===flatPos.u&&c.y===flatPos.y)
                  :!!bossLine(R,c,goal,cr);
      if(!has)return 0;
      if(flat)return 1;
      return doomedCell(c.x,c.y,c.z,cr)?1:2;
    });
    // Never onto another hunter's square: two of them in one cell reads as
    // one of them, and the pack should look like a pack.
    if(nx&&!hunterAt(nx.x,nx.y,nx.z,i)){h.x=nx.x;h.y=nx.y;h.z=nx.z;}
    if(hunterTouching(h)){bossHurt("it reached you");return;}
    // Lined up, so it plants. The beat that follows is the whole fight.
    h.line=huntLine(h,cr);
    if(h.line){
      /* A cunning one declines a line you could answer on the spot - but only
         while declining is cheap. After `hold` refusals it plants anyway,
         which is the same patience valve the twin uses and it is here for the
         same reason: an opponent that will not attack from anywhere you can
         punish stops attacking, and a fight where nobody can act is design
         3's freeze wearing a new costume. It never stops *walking*, so it
         closes on you the whole time it is being fussy. */
      if(ph.cunning&&!flat&&(h.shy||0)<ph.hold&&
         doomedCell(h.x,h.y,h.z,cr)){
        h.shy=(h.shy||0)+1;h.line=null;
      }else{
        h.shy=0;h.lock=ph.aim;bossFlash=1;
      }
    }
  }
  // Recomputed once a frame for the renderer and for the GO 2D button, so
  // "this one dies if you fold" is answered in exactly one place.
  for(var d2=0;d2<hunters.length;d2++)
    hunters[d2].doom=!flat&&
      doomedCell(hunters[d2].x,hunters[d2].y,hunters[d2].z,cr);
}
/* The half standing in your silhouette column, if there is one. In the twin
   fight they are solid in the plane like everything else, so this is a wall
   you are about to fold into - and it is usually the same wall you were
   trying to line them up on, which is the knife-edge of that fight. */
function twinOnPlayerColumn(){
  if(!B||!B.twin||flat)return null;
  var u=R.uOf(view,player.x,player.z);
  for(var i=0;i<hunters.length;i++)
    if(hunters[i].y===player.y&&R.uOf(view,hunters[i].x,hunters[i].z)===u)
      return hunters[i];
  return null;
}
function hunterAt(x,y,z,skip){
  for(var i=0;i<hunters.length;i++)
    if(i!==skip&&hunters[i].x===x&&hunters[i].y===y&&hunters[i].z===z)return true;
  return false;
}
// Called after any move you make. They are not solid - you can walk through
// the square one is standing in - because a body you cannot pass is a body
// that can trap you against a wall, and the fight is about position, not
// about being cornered. Walking into one simply costs the same as being
// walked into.
function bossContact(){
  if(!B||dying||levelDone)return false;
  for(var i=0;i<hunters.length;i++)
    if(hunterTouching(hunters[i])){bossHurt("you walked into it");return true;}
  return false;
}
function hunterTouching(h){
  if(bossGraceMs>0)return false;
  if(flat)return R.uOf(view,h.x,h.z)===flatPos.u&&h.y===flatPos.y;
  return h.x===player.x&&h.y===player.y&&h.z===player.z;
}
/* Folding, from the pack's point of view. Called from doFlatten() before
   flatPos is set, so `player` still holds the square you folded from - which
   is the square the attack is measured from.

   Everything sharing that square in the plane goes, which will usually be
   one of them and is occasionally three, because depth is gone and they were
   only ever apart in it. */
function bossFoldCrush(){
  if(!B||!hunters.length)return;
  if(B.twin){
    if(!twinAligned())return;
    bossHp--;bossHitFlash=1;
    SFX.strike();shakeT=1;
    if(bossHp<=0){hunters=[];buildGrid();win();return;}
    /* A core goes, and the centre moves. Leaving it where it was would mean
       the answer is in the same place three times running, and the second
       one would not be a fight, it would be a repetition. */
    var faster=Math.max(B.floorStep,hunters[0].step*B.rage);
    twinSpawn(twinCore+1,faster);
    flash("folded into itself · "+bossHp+(bossHp===1?" core left":" cores left"));
    buildGrid();syncHud();
    return;
  }
  var cr=liveCrates(), doomed=[];
  for(var i=0;i<hunters.length;i++)
    if(doomedCell(hunters[i].x,hunters[i].y,hunters[i].z,cr))doomed.push(i);
  if(!doomed.length)return;
  for(var d=doomed.length-1;d>=0;d--)hunters.splice(doomed[d],1);
  bossHitFlash=1;
  SFX.strike();shakeT=1;
  /* What the survivors get for surviving. A fold that kills nothing is now
     worse than free, and a fold that kills one of three leaves the other two
     angrier - so the fight accelerates toward its own end rather than
     thinning out into a mop-up. */
  for(var s=0;s<hunters.length;s++)
    hunters[s].step=Math.max(B.floorStep,hunters[s].step*B.rage);
  // The board is clear, so the fight moves on. Only the last phase running
  // out is the win.
  if(!hunters.length){bossAdvance();setTimeout(bossSendHome,420);return;}
  flash(doomed.length>1?(doomed.length+" in one square · "+hunters.length+" left"):
        ("folded onto it · "+hunters.length+" left"));
  syncHud();
}
// True when folding right now would kill at least one of them - what turns
// the GO 2D button green. foldKills() already refuses a column with a pillar
// in it, so this can never be true at the same moment peril is.
function bossCrushable(){
  if(!B||flat||app!=="play"||!hunters.length)return false;
  /* For the twin the fold is only a strike if it does not also take you, and
     there are two ways it can: a half sharing your column, or a pillar in it.
     Leaving the second one out made the button go green while the player was
     standing in a shadow, which is a cue to walk into a wall - and because
     dying resets the fight, it read as a boss that would not die. */
  if(B.twin)return twinAligned()&&!twinOnPlayerColumn()&&
    !crushedBy(R,view,player.x,player.y,player.z,liveCrates());
  var cr=liveCrates();
  for(var i=0;i<hunters.length;i++)
    if(doomedCell(hunters[i].x,hunters[i].y,hunters[i].z,cr))return true;
  return false;
}
function bossHurt(why){
  lives--;
  SFX.die();shakeT=1;
  bossGraceMs=B.grace;
  var bar=$("bossBar");
  if(bar){bar.classList.remove("hurt");void bar.offsetWidth;bar.classList.add("hurt");}
  if(lives<=0){die("boss");return;}
  flash(why+" · "+lives+" "+(lives===1?"life":"lives")+" left");
  /* They are thrown back to where they started and you are not moved at all.
     Sending the player home was what the gunfight did, and it made every hit
     cost the position you had spent twenty seconds building - which is a
     punishment for being hit *and* for having played well. The pack losing
     its ground is punishment enough, and it buys you the beat of grace to
     use it. */
  var spawns=B.twin?B.at:B.phases[bossPhase].at;
  for(var i=0;i<hunters.length;i++){
    var a=spawns[i%spawns.length];
    hunters[i].x=a[0];hunters[i].y=a[1];hunters[i].z=a[2];
    hunters[i].ms=0;hunters[i].lock=0;hunters[i].line=null;hunters[i].shy=0;
  }
  syncHud();
}
// A crate shoved onto a hunter is the other way to kill one, and it costs a
// move rather than a fold. It stays because it is the one attack that works
// while the geometry is against you.
function bossTakeCrate(idx){
  hunters.splice(idx,1);
  bossHitFlash=1;
  SFX.strike();shakeT=1;
  if(!hunters.length){bossAdvance();setTimeout(bossSendHome,420);return true;}
  flash("crushed under the crate · "+hunters.length+" left");
  syncHud();
  return true;
}

/* ============================================================
   THE TRIAL'S CLOCK

   Same shape as bossFrame and paused by the same conditions, for the same
   reason: a clock that runs while you read the menu is not difficulty. What
   is different is that there is nobody driving it. The arena has a rhythm,
   it charges in plain sight, and the only question it asks you is whether
   you are standing in the wrong slice when it lands - which includes being
   flat along the axis it sweeps, where every depth is your depth.
   ============================================================ */
function trialReset(){
  trialMs=0;trialBeat=-1;trialFlash=0;trialGrace=0;trialTicked=-1;trialCore=0;
  if(TR)lives=BOSS_LIVES;
}
function trialFrame(dt){
  if(!TR||app!=="play")return;
  if(dying||levelDone||panelOpen()||!$("intro").classList.contains("gone")||
     $("won").classList.contains("on"))return;
  // Clamped against a backgrounded tab's one enormous frame, then scaled by
  // the pace setting - see paceScale() in 11-sound.js for why it is one
  // multiplication here rather than a slower `period` and `fire`.
  dt=Math.min(dt,90)*paceScale();
  if(trialFlash>0)trialFlash=Math.max(0,trialFlash-dt/300);
  if(trialGrace>0)trialGrace=Math.max(0,trialGrace-dt);
  var was=TR.live(trialMs);
  trialMs+=dt;
  var live=TR.live(trialMs);
  var beat=TR.beatNo(trialMs);
  // A tick on the turn of every beat. The level is called a metronome and it
  // should sound like one: the charge is a thing you can hear coming, not
  // only a thing you have to keep looking at.
  if(beat!==trialTicked){trialTicked=beat;SFX.tick();}
  if(live&&!was){trialFlash=1;SFX.sweep();}
  if(!live)return;
  // One beat can only take one life, however long you stand in it: the sweep
  // lands once, it is not a floor that stays lethal.
  if(trialBeat===beat||trialGrace>0)return;
  var sw=TR.beatAt(trialMs);
  var hit=flat ? TR.hits(sw,view,"2",flatPos.u,flatPos.y,0)
               : TR.hits(sw,view,"3",player.x,player.y,player.z);
  if(hit){trialBeat=beat;trialHurt();}
}
/* Being caught costs a life and nothing else.

   It used to send you back to the start and restart the clock, which is what
   a boss does - and on a trial it was wrong twice over. The clock *is* the
   level, so resetting it threw away the rhythm you had just learned, and
   being put back on a safe square meant the next two slices landed nowhere
   near you: the arena appeared to switch off for four seconds every time it
   touched you. Now you keep your square, the metronome keeps its count, and
   what you get is a beat of grace to move. The plane is the one thing you
   are pulled out of, because it is where being caught means being caught
   everywhere. */
function trialHurt(){
  lives--;
  SFX.die();shakeT=1;
  trialGrace=TR.period;
  var bar=$("bossBar");
  if(bar){bar.classList.remove("hurt");void bar.offsetWidth;bar.classList.add("hurt");}
  if(lives<=0){die("trial");return;}
  flash((flat?"flat in the slice":"caught by the sweep")+" · "+
        lives+" "+(lives===1?"life":"lives")+" left");
  if(flat){
    var land=R.landings(view,flatPos.u,flatPos.y,liveCrates());
    var b=land.length?R.pick(land):null;
    // Nowhere to stand behind you, or a spike waiting there: better to leave
    // you flat with a beat of grace than to drop you onto a second death.
    if(b&&!R.deadly3(b.x,flatPos.y,b.z)){
      player.x=b.x;player.z=b.z;player.y=flatPos.y;
      flat=false;flatTarget=0;SFX.unfold();
    }
  }
  syncHud();
}
// Would folding right now put you inside the charging slice? True only for a
// sweep down the axis you are looking along, where the plane is every depth
// at once and there is nowhere in it to stand. Timing, not geometry, so it
// is answered per frame by the render loop rather than by foldPeril().
function trialFoldPeril(){
  if(!TR||flat||dying||app!=="play")return false;
  var sw=TR.beatAt(trialMs);
  return TR.hits(sw,view,"2",R.uOf(view,player.x,player.z),player.y,0);
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
    if(B)for(var hi=0;hi<hunters.length;hi++)
      if(moved.to.x===hunters[hi].x&&moved.to.y===hunters[hi].y&&
         moved.to.z===hunters[hi].z&&bossTakeCrate(hi))return;
  }
  if(ny===FELL){player.x=nx;player.z=nz;die("fall");return;}
  player.x=nx;player.z=nz;player.y=ny;
  if(R.deadly3(nx,ny,nz)){die("spike");return;}
  if(!moved)SFX.step();
  if(tutC){tutC.m3++;if(dir)tutC.d[dir]++;if(ny>oldY)tutC.climb++;}
  if(bossContact())return;
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
  if(bossContact())return;
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
  var half=twinOnPlayerColumn();
  if(!crush&&!spike&&!half)return null;
  // A half of the twin fills your square in the plane exactly as a block
  // would. Reported here so the same red outline and the same pulsing button
  // cover it, because it is the same death.
  if(half&&!crush)return {kind:"crush",cells:[[half.x,half.y,half.z]]};
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
/* A solved level is a picture, not a game. `levelDone` used to stop the boss
   and trial clocks and nothing else, because the win card was a full-bleed
   overlay and simply sat in front of every other control - the block was
   physical rather than logical. The LEVELS button dismisses that card without
   leaving the level, which opened the gap: you could fold, walk, undo and
   spend hints on a level already scored and written to progress.
   Re-showing the card rather than swallowing the input is the point. The card
   is the only thing on screen that explains why nothing is responding, and it
   carries the three ways out; silently eating the tap would read as a freeze.
   Not while a panel is open, though - the card outranks it at z-index 20 and
   would bury the picker the player just asked for. */
function levelOver(){
  if(app!=="play"||!levelDone)return false;
  if(!panelOpen()&&!$("won").classList.contains("on"))$("won").classList.add("on");
  return true;
}
function doFlatten(){
  if(tutBlocks("bFlat"))return;
  if(dying||levelOver()||!canShift())return;
  clearCue();
  var pu=R.uOf(view,player.x,player.z), crf=liveCrates();
  /* Captured before the fold resolves, because the twin replaces both halves
     when a core goes and the *new* pair lands wherever the next centre puts
     them. Asking afterwards had the fresh spawn crushing the player for a
     kill they had just earned - which reset the fight and made three cores
     look like an endless one. */
  var wall=!!twinOnPlayerColumn();
  /* Both verdicts are taken before the fold resolves, for the same reason the
     twin's is: clearing a phase raises that phase's pillars, and asking R
     afterwards would ask a world that has grown a pillar since you committed.
     The player would be crushed by the reward for the kill they just made -
     the twin bug exactly, in a new place. */
  var crush=R.siloSolid(view,pu,player.y,crf);
  var spiked=R.deadly2(view,pu,player.y);
  lastSolidDepth=R.dOf(view,player.x,player.z);
  pushHistory();moveCount++;
  flatPos={u:pu,y:player.y};
  flat=true;flatTarget=1;SFX.fold();collectHere();
  if(tutC)tutC.flat++;
  bossFoldCrush();
  syncHud();saveSession();
  // Something else already occupies that square in the plane. Let the fold
  // play out, then close on the player. A half of the twin counts: it is
  // solid there, and folding into one is folding into a wall.
  if(wall||crush) setTimeout(function(){die("crush");},420);
  else if(spiked) setTimeout(function(){die("spike");},420);
}
function doUnflatten(){
  if(tutBlocks("bFlat"))return;
  if(dying||levelOver()||!canShift())return;
  clearCue();
  var land=R.landings(view,flatPos.u,flatPos.y,liveCrates());
  if(!land.length){flash("nothing solid behind that");SFX.bump();return;}
  var b=R.pick(land);
  pushHistory();moveCount++;
  player.x=b.x;player.z=b.z;player.y=flatPos.y;
  flat=false;flatTarget=0;SFX.unfold();
  if(tutC)tutC.unflat++;
  if(R.deadly3(player.x,player.y,player.z)){die("spike");return;}
  if(bossContact())return;         // you came back down on top of one
  syncHud();saveSession();
  checkWin();
}
function press(dir){
  if(app!=="play"||levelOver())return;
  // A tutorial step that names a control accepts only that control.
  if(tutBlocks(dir==="left"?"bLeft":dir==="right"?"bRight":
               dir==="up"?"bUp":"bDown"))return;
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
/* The square you are actually heading for. On a trial with cores that is the
   one you have not reached yet; everywhere else it is the level's goal. The
   renderer draws this rather than L.goal - the old boss had exactly this bug,
   where the marker stayed on the first target and the fight became
   unfinishable because there was nothing left to aim at. */
function liveGoal(){
  if(TR&&TR.cores)return TR.cores[Math.min(trialCore,TR.cores.length-1)];
  return L.goal;
}
function checkWin(){
  // A boss has no goal square at all: the fight ends when the last hunter
  // goes, in bossFoldCrush() or bossTakeCrate(), never by arriving anywhere.
  if(B)return;
  var g=liveGoal();
  if(player.x!==g[0]||player.y!==g[1]||player.z!==g[2])return;
  if(keysLeft()){flash("still sealed \u2014 "+keysLeft()+" to collect");SFX.bump();return;}
  // One core down, and the next is somewhere else: the clock does not pause
  // for it, which is the whole point of there being three.
  if(TR&&TR.cores&&trialCore<TR.cores.length-1){
    trialCore++;
    SFX.key();shakeT=.4;
    var left=TR.cores.length-trialCore;
    flash(left===1?"one more":left+" more");
    buildGrid();syncHud();
    return;
  }
  win();
}
var starsBefore=0,starsAfter=0,starsGained=0;
function win(){
  levelDone=true;
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
    // A level with a clock is scored on lives, not moves - see betterRecord().
    var rec=(B||TR)?lives:effective;
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
  } else if(B||TR){
    // Scored on lives, so hints cost nothing here and moves are not the point.
    var stb=Math.max(0,Math.min(3,lives));
    $("wonTitle").innerHTML=(stb===3?"Untouched":TR?"Through":"Down")+
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
  /* The picker only lists the campaign, so offering it after a library level
     or an editor test would land you somewhere you did not come from. */
  if(fromEditor||playSource!=="builtin"){
    $("bRetry").style.display="none";$("bLevels").style.display="none";
  } else $("bLevels").style.display="flex";
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
  if(flat||dying||levelOver())return;
  if(tutBlocks(dir>0?"bRotR":"bRotL"))return;
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
  moveHistory=[];moveCount=0;hintsUsed=0;levelDone=false;tutReset();
  bossReset();trialReset();
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
  moveHistory=[];moveCount=0;hintsUsed=0;dying=null;levelDone=false;tutReset();
  B=makeBoss(L);bossReset();
  TR=makeTrial(L);trialReset();
  playerMesh.scale.set(1,1,1);
  initDynamic();
  levelKey=L.name;
  // Tutorials are deliberately unscored, so we don't even ask the solver:
  // its answer for a teaching level is often a clever route the lesson is
  // not about, and showing that as par would be punishing the student.
  // A trial is scored on lives, and its par would be a lie for a different
  // reason: the solver's route ignores the clock, and every step you spend
  // dodging is a step it never counted.
  var pst=(L.tutorial||L.boss||L.trial)?{ok:false}:statsCached(L);
  levelPar=pst.ok?pst.moves:null;
  syncMeshes();buildGrid();syncHud();
  center.copy(centerT);viewSize=viewSizeT;onResize();
  playerMesh.position.set(player.x,player.y,player.z);
}
