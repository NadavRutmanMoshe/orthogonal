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
  // It has landed, so `dying` is the guard from here - both clocks stop dead
  // while it plays out, which is what deathPending was standing in for.
  deathPending=false;
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
    /* A REAL LOSS on a clock, counted. Offered after the reset rather than
       instead of it, so the board is back and the player can simply carry on
       if they would rather - the offer is a door, not a wall. */
    if(kind==="boss"||kind==="trial"){
      var n=noteFail(levelKey);
      if(n%STRUGGLE_OFFER===0)setTimeout(struggleOffer,520);
    }
  },kind==="crush"?1050:820);
}
/* One life, and back to the start with everything else intact: the cores you
   have taken, the clock, the pack's damage. You are put back at the start
   rather than left where you were, because you got here by falling out of
   the world or being crushed - there is nowhere to leave you. */
/* Has this moment already cost a life, or is it about to? One question, asked
   everywhere a life could be taken, so the three ways to lose one can no
   longer each charge for the same mistake. */
function shielded(){
  return shieldMs>0||deathPending;
}
function spendLife(){
  /* THE SHIELD ABSORBS IT, and you are still put back.

     This is the half of the fix that matters. A hit sets the shield, and a
     hit is very often followed within the same moment by a fall - you were
     mid-step, or the square you were pulled back onto was the edge - which
     used to charge a second life for one mistake. The consequence still
     happens: you fell out of the world and there is nowhere to leave you, so
     you go back to the start. It is the *life* that is not spent. */
  if(shieldMs>0){
    flash("shielded \u00b7 no life lost");
    respawn();
    return;
  }
  lives--;
  if(lives<=0){die(TR?"trial":"boss");return;}
  flash(lives+" "+(lives===1?"life":"lives")+" left");
  if(TR)trialGrace=TR.period;
  if(B)bossGraceMs=B.grace;
  shieldMs=SHIELD_MS;
  respawn();
}
/* Back to the start with everything else intact - the cores you have taken,
   the clock, the pack's damage. Factored out of spendLife() because the
   shield needs the repositioning without the accounting. */
function respawn(){
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
  /* Written here rather than left to the next move, because a death is
     exactly the moment somebody puts the game down. saveSession() refuses to
     write while `dying` is set, and this runs after die() has cleared it, so
     what is stored is the board the player will come back to: back at the
     start, with the life already spent and the cores they had kept. */
  saveSession();
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
  bossPause=0;phaseNoteEnd();
  bossHp=B?B.hp:0;bossFlash=0;bossHitFlash=0;bossCreepMs=0;bossGraceMs=0;
  shieldMs=0;deathPending=false;slowMoMs=0;
  rep=null;bossPendingAdvance=false;bossPendingDeath=false;replayClear();
  document.body.classList.remove("replaying");
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
    // The card says what changed now; a toast saying it as well is two
    // messages competing for the same beat.
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
var BOSS_PAUSE=1900;   // how long the board is yours to read. A feel number.
function bossAdvance(){
  bossPhase++;
  bossHp=B.phases.length-bossPhase;
  if(bossPhase>=B.phases.length){
    hunters=[];
    /* Stand up before winning. You kill by folding, so a boss is almost
       always beaten from inside the plane - and the plane is a whole theme,
       not just a camera, so winning flat left the win card, the map and the
       menu on 2D's paper until the next level loaded. */
    bossSendHome();
    buildGrid();win();return;
  }
  /* The reset comes first and the geometry second, which is the order the
     player can actually follow: put them back somewhere they know, standing,
     facing the way the level opens, and only then change the board. */
  bossSendHome();
  bossEnterPhase(true);
  bossPause=BOSS_PAUSE;
  phaseNote(B.phases[bossPhase].say||("phase "+(bossPhase+1)+" of "+B.phases.length));
}
/* Held while the card is up: nothing walks, nothing lands, nothing you press
   does anything. Read by the four verbs and by bossFrame. */
/* Nothing answers while the board is being handed back to the player - a
   phase boundary, or a kill cam replaying the charge that just landed. */
function bossHolding(){return bossPause>0||!!rep;}
/* ============================================================
   THE REPLAY - recorder and control. See 05-state.js for the design.
   ============================================================ */
function replayClear(){repBuf=[];repT=0;repAcc=0;}
/* Sampled off the render loop's real frame time, and only while the fight is
   genuinely in front of the player - the same question bossFrame asks - so a
   paused board does not fill the ring with copies of one moment. */
function replaySnap(){
  repT+=repAcc;repAcc=0;
  var hs=[];
  for(var i=0;i<hunters.length;i++){
    var h=hunters[i];
    hs.push([h.x,h.y,h.z,h.lock||0,h.doom?1:0,
             h.line?(h.line.dx||0):0,h.line?(h.line.dz||0):0]);
  }
  repBuf.push({t:repT,x:player.x,y:player.y,z:player.z,
               f:flat?1:0,u:flat&&flatPos?flatPos.u:0,
               fy:flat&&flatPos?flatPos.y:0,v:view,h:hs});
  while(repBuf.length>1&&repT-repBuf[0].t>REP_KEEP)repBuf.shift();
}
function replayTick(dtReal){
  if(!B||app!=="play"||rep)return;
  if(dying||levelDone||bossPause>0||panelOpen()||screenUp())return;
  repAcc+=dtReal;
  if(repAcc<1000/REP_HZ)return;
  replaySnap();
}
/* THE LAST FRAME HAS TO BE THE KILL ITSELF, not whatever the ring happened
   to hold. Sampling at 20Hz means the newest frame can be up to 50ms stale,
   and 50ms is exactly the window in which a charge crosses the arena and
   lands - so the film ended a moment BEFORE the two of them met, which is
   the one moment it exists to show. Worse, the pack is thrown back to its
   spawns and the player is sent home before the replay is started, so by
   then the kill pose is gone entirely.

   So it is taken here, on the first line of bossHurt, before anything moves. */
function replayMark(){
  if(!B||app!=="play"||rep)return;
  replaySnap();
}
/* `who` is the hunter to follow on a death, and `line` the one that fired.
   On a kill both are absent and the camera stays on the player. */
/* `at` is the board AS IT WAS at the moment being filmed - position, flat,
   view, silhouette column, and where the other one was standing. On a death
   it has to be passed, because bossHurt resets all of it before the film
   starts; on a kill nothing has moved yet, so the live state is the moment
   and `at` is built from it. */
function replayStart(mode,who,line,at){
  if(!at)at={x:player.x,y:player.y,z:player.z,flat:flat,view:view,
             u:flatPos?flatPos.u:0,fy:flatPos?flatPos.y:0,h:who||null};
  if(!B||rep||repBuf.length<2)return false;
  var span=mode==="death"?REP_DEATH_MS:REP_KILL_MS;
  var t1=repBuf[repBuf.length-1].t, t0=Math.max(repBuf[0].t,t1-span);
  var i0=0;
  while(i0<repBuf.length-1&&repBuf[i0].t<t0)i0++;
  /* WHICH VIEW. The one where the killing line runs ACROSS the screen: that
     is where you can watch it travel, and it is the view a fold along it
     would have answered. If the player was already facing that way the swing
     is nothing, and that is worth showing too - it says the fold was there
     to be taken. On a kill the camera keeps the view the player won in. */
  /* THE ANGLE THAT KILLED YOU IS THE ONE LOOKING ALONG THE LINE, and that is
     a right angle away from where this started.

     The first version took the view whose screen-RIGHT is the charge
     direction, so the thing entered from the left and ran at you across the
     screen. It is a fine drawing of a charge and it is the wrong drawing of
     THIS charge, because it does not show why the charge is a kill. The kill
     is a shared silhouette column, and a silhouette column is what you get by
     collapsing the DEPTH axis - so the two of you only land in one square
     when the camera is looking down the line you share. Across it, the fold
     at the end squashes the row sideways and you stay two separate things on
     screen, which is precisely the question the replay exists to answer.

     So: the view whose depth axis is the charge direction REVERSED. AX[v].d
     points at the camera, so matching it to where the charge came FROM puts
     the hunter at the front and you behind it - which is the half of this
     that is the owner's call and the right one. The film is the other side's
     point of view: you are looking over the thing that killed you, down the
     line it took, at yourself at the far end of it. Then the fold closes that
     depth and the two of you land in one square, which is the kill.

     Turned to by the shortest way round, so the swing never goes the long way
     for a right angle. */
  /* A DEATH TAKEN WHILE FLAT STILL HAS A DIRECTION, and huntLine does not
     report one. Flattened, a hunter has a line on you the moment it shares
     your silhouette column, so huntLine answers {dx:0,dz:0} - true, and no
     use to a camera. But sharing a silhouette column means differing ONLY in
     depth, so the direction is the current view's own depth axis, signed from
     the hunter toward you. Without this the flat deaths got no swing at all
     and the film played from wherever the player happened to be facing, which
     is the one angle that cannot show what happened. `player.x/z` survive
     folding, so both positions are there to measure. */
  /* MOST DEATHS ARRIVE WITH NO LINE AT ALL, which is what kept this broken.
     Three of bossHurt's four callers pass none - "it closed on you", "it
     reached you", "you walked into it" - and only the charge passes one. A
     flat kill is always one of the three: waiting in the plane means the
     hunter walks into your silhouette column and hunterTouching() fires. The
     guard here used to require a line object with zeroes in it, which is what
     huntLine returns while flat but NOT what those callers send, so the
     derivation below never ran and the camera never turned. "Press GO 2D on
     BOSS I and wait" reproduced it every time. */
  if(mode==="death"&&who&&(!line||(!line.dx&&!line.dz))){
    /* MEASURED FROM THE SQUARE THE FILM DRAWS YOU AT, not from `player.x/z`.
       While flat those are the square you folded FROM, which is wherever you
       happened to start and can sit on either side of the hunter - so the
       direction came out backwards about half the time, and the film put the
       thing that killed you behind you. Reported from a screenshot.

       replayPose() stands a flat pose up on the square it would come back
       to, so that is the position the camera has to reason about. It is
       R.pick() on the player's own column, which returns the candidate
       nearest the camera IN THE RECORDED VIEW - and the block the hunter is
       standing on is one of those candidates, because a hunter only has a
       line on a flat player at the player's own height. So the drawn player
       is always at or in front of the hunter in that view, the sign is always
       the same, and the camera always ends up a half turn round. The
       arithmetic is kept rather than folded into a constant because it is the
       arithmetic that explains why. */
    var dv=AX[at.view].d, pxz={x:at.x,z:at.z};
    if(at.flat){
      var fl=R.landings(at.view,at.u,at.fy,liveCrates());
      if(fl.length){var fb=R.pick(fl);pxz={x:fb.x,z:fb.z};}
    }
    var hdep=who.x*dv[0]+who.z*dv[2];
    var pdep=pxz.x*dv[0]+pxz.z*dv[2];
    if(at.flat||hdep!==pdep){
      var sg=(pdep>=hdep)?1:-1;
      line={dx:dv[0]*sg,dz:dv[2]*sg};
    } else if(who.x!==at.x||who.z!==at.z){
      /* Standing, and it simply walked into you from somewhere off the depth
         axis - so the direction is the displacement it closed, along whichever
         axis it covered more of. */
      var ax=at.x-who.x, az=at.z-who.z;
      line=(Math.abs(ax)>=Math.abs(az))?{dx:(ax>0?1:-1),dz:0}
                                       :{dx:0,dz:(az>0?1:-1)};
    }
  }
  /* AND A KILL IS THE SAME RULE WITH THE OTHER SUBJECT. The film always puts
     whoever it is about NEAREST THE CAMERA: on a death that is the hunter, so
     you watch over its shoulder; on a kill it is you, so the thing you folded
     onto is behind you.

     WHAT ACTUALLY FIXED THE REPORTED BUG IS THE MARK, NOT THIS. A kill was
     replaying from the victim's side, and the cause was the last frame: it
     was taken up to 50ms before the fold, so it held the player STANDING at
     their real square rather than flat - and a standing player is at their
     own depth, which is behind the victim as often as not. replayMark() in
     bossFoldCrush now takes the frame after `flat` is set and before the
     splice, so the film ends with the player flat and the victim still on the
     board; replayPose() then stands them up on the square they would come
     back to, which is the FRONT-MOST block of their column.

     Which is why this branch is nearly always a no-op, and worth keeping
     anyway. The victim shares the player's column at the player's own height,
     so the block it is standing on is one of the player's landing candidates,
     and R.pick() takes the nearest - so the player is at or in front of it by
     construction. The exception is an anchor: pick() prefers amber over
     nearest, so on an arena with one in that column the player can land
     BEHIND the thing they just killed, and then the camera has to go round.
     Only two of the four views run along the shared column, `view` and its
     opposite, so it is a choice between them rather than a search. */
  /* Defaults to where the camera already is, not to where the kill was: with
     no line to reason from there is no swing, and `rep.view` has to match the
     angle the film is actually rendered at. */
  var swing=0, want=view;
  if(mode==="kill"&&who){
    var kd=AX[at.view].d;
    var pxz={x:at.x,z:at.z};
    if(at.flat){
      var kl=R.landings(at.view,at.u,at.fy,liveCrates());
      if(kl.length){var kb=R.pick(kl);pxz={x:kb.x,z:kb.z};}
    }
    var pdp=pxz.x*kd[0]+pxz.z*kd[2], vdp=who.x*kd[0]+who.z*kd[2];
    want=(pdp>=vdp)?at.view:(at.view+2)%4;
    swing=((want-at.view+4)%4===2?2:0)*90;
  }
  if(mode==="death"&&line&&(line.dx||line.dz)){
    for(var v=0;v<4;v++)
      if(AX[v].d[0]===-line.dx&&AX[v].d[2]===-line.dz){want=v;break;}
    /* Measured from where the camera IS, not from where it was at the kill -
       bossSendHome has already turned it back to the opening view, and
       viewAngleTarget went with it, so the swing has to be relative to that
       or the film starts a right angle out. */
    var d=(want-view+4)%4;
    if(d===3)d=-1;
    swing=d*90;
  }
  rep={mode:mode,i:i0,t0:repBuf[i0].t,t1:t1,ms:0,fold:0,foldMs:0,view:want,
       who:who||null,line:line||null,
       vat:viewAngleTarget,angle:viewAngleTarget+swing,
       saved:{x:player.x,y:player.y,z:player.z,flat:flat,
              fu:flatPos?flatPos.u:0,fy:flatPos?flatPos.y:0,view:view,
              h:hunters.map(function(h){
                return {x:h.x,y:h.y,z:h.z,lock:h.lock,line:h.line,doom:h.doom,
                        ms:h.ms,step:h.step,shy:h.shy};})}};
  document.body.classList.add("replaying");
  var lab=$("replayNote");
  if(lab)lab.textContent=mode==="death"?"the line it came down"
                                       :"the fold that cleared it";
  return true;
}
/* Write a recorded frame over the live state. Safe because the fight is
   frozen for the whole replay - and it is what makes every drawing path work
   on the playback for free. */
function replayPose(f){
  player.x=f.x;player.y=f.y;player.z=f.z;
  /* THE FILM ALWAYS PLAYS IN THE VOLUME, whatever was recorded.

     A death taken while flat used to replay flat: the world was already
     collapsed, so there was no depth to look down and no fold left to close -
     the one thing the film exists to show had happened before it started. So
     a flat pose is stood back up, and then the fold at the end closes onto
     the player exactly as it does for a standing death.

     STANDING ONE UP MEANS RE-DERIVING THE SQUARE, and this is the part the
     first version got wrong. `player.x/z` is the square you folded FROM and
     it does not move while you are flat - walking in the plane changes
     `flatPos.u` and nothing else. So a player who folded and then took three
     steps replayed standing back at the square they had left, never arriving
     anywhere near the thing that killed them, in the film whose whole subject
     is that the two of you ended up in one place.

     What the plane pose actually means in the volume is the square you would
     have come back to: R.landings()/R.pick() on the recorded column, the same
     pair GO 3D itself calls. That square is in the silhouette column the
     hunter shares - which is what the kill IS - so the two of them line up,
     and the fold at the end drops them into one square. A plane step then
     reads as a sideways step in the volume, which is what it was. */
  if(f.f){
    var land=R.landings(f.v,f.u,f.fy,liveCrates());
    if(land.length){
      var b=R.pick(land);
      player.x=b.x;player.z=b.z;player.y=f.fy;
    }
  }
  flat=false;flatTarget=0;
  /* THE VIEW IS THE CAMERA'S, NOT THE RECORDED ONE, and the silhouette is
     recomputed to match it. The renderer derives every position from
     `viewAngle`, so the picture was already right - but `flatPos.u` is a
     coordinate in whichever view it was measured in, and a death replay
     deliberately swings a right angle away from that. Left alone, a player
     who was flat during the filmed seconds would be drawn in the wrong
     column, in the film whose whole subject is which column you share.
     `player.x/z` are untouched by folding, so the square is always there to
     re-project from. */
  view=rep?rep.view:f.v;
  hunters.length=0;
  for(var i=0;i<f.h.length;i++){
    var a=f.h[i];
    hunters.push({x:a[0],y:a[1],z:a[2],lock:a[3],doom:!!a[4],
                  line:a[3]>0?{dx:a[5],dz:a[6]}:null,ms:0,step:600,shy:0});
  }
}
function replayEnd(){
  if(!rep)return;
  var sv=rep.saved;
  player.x=sv.x;player.y=sv.y;player.z=sv.z;
  flat=sv.flat;flatTarget=sv.flat?1:0;
  if(sv.flat)flatPos={u:sv.fu,y:sv.fy};
  view=sv.view;
  /* Restored UNCONDITIONALLY. The first version of this guarded the restore
     on the cam still running, and the caller had already stopped it one line
     earlier - so viewAngleTarget kept the 90 degrees the swing had added
     while `view` did not, and from then on the arrows moved the player at a
     right angle to the screen. Reported, exactly, as up/down/left/right
     getting stuck after a kill. */
  viewAngleTarget=sv.vat!==undefined?sv.vat:rep.vat;
  hunters.length=0;
  for(var i=0;i<sv.h.length;i++)hunters.push(sv.h[i]);
  rep=null;
  document.body.classList.remove("replaying");
  buildGrid();syncHud();
  /* Whatever was waiting for the film happens now. The last death is checked
     first: if the run is over there is no phase to advance into. */
  if(bossPendingDeath){bossPendingDeath=false;die("boss");return;}
  if(bossPendingAdvance){bossPendingAdvance=false;bossAdvance();}
}
/* Driven from the render loop on REAL time, because bossFrame is stopped for
   exactly the things the replay plays over. */
function replayFrame(dtReal){
  if(!rep)return;
  if(rep.ms<rep.t1-rep.t0){
    rep.ms=Math.min(rep.t1-rep.t0,rep.ms+dtReal*REP_RATE);
    var t=rep.t0+rep.ms;
    while(rep.i<repBuf.length-1&&repBuf[rep.i+1].t<=t)rep.i++;
    replayPose(repBuf[rep.i]);
    return;
  }
  replayPose(repBuf[repBuf.length-1]);
  /* And the last beat: the world folds onto the player. On a death that is
     the hunter's own verb being used on them; on a kill it is the fold they
     actually made, replayed. */
  rep.foldMs+=dtReal;
  var k=Math.min(1,rep.foldMs/REP_FOLD_MS);
  rep.fold=k*k*(3-2*k);
  if(rep.foldMs>REP_FOLD_MS+REP_HOLD_MS)replayEnd();
}
function phaseNote(text){
  var el=$("phaseNote");if(!el)return;
  el.innerHTML="<b>phase "+(bossPhase+1)+" of "+B.phases.length+"</b><i>"+
    esc(text)+"</i>";
  el.classList.add("on");
  document.body.classList.add("bosshold");
}
function phaseNoteEnd(){
  var el=$("phaseNote");if(el)el.classList.remove("on");
  document.body.classList.remove("bosshold");
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
  // screenUp() is the intro card *and* the home screen: a fight must not run
  // behind a title screen the player opened from the menu mid-boss.
  if(dying||levelDone||panelOpen()||screenUp()||
     $("won").classList.contains("on"))return;
  /* Clamp first, then scale. The clamp is about a backgrounded tab handing
     back one enormous frame; the scale is the player's pace setting, and
     applying it here means every derived interval below - the phase's step
     and aim, creep, rage, grace - slows together and keeps its ratio to the
     others. A phase is a set of dials; pace must not be another one. */
  dt=Math.min(dt,90)*paceScale();
  /* Counted down on REAL time and applied to the fight's, or the slowing
     would slow the thing that ends it. */
  if(slowMoMs>0){slowMoMs=Math.max(0,slowMoMs-dt);dt*=SLOWMO_RATE;}
  if(bossHitFlash>0)bossHitFlash=Math.max(0,bossHitFlash-dt/380);
  if(bossFlash>0)bossFlash=Math.max(0,bossFlash-dt/300);
  /* The held breath, before the grace beat rather than inside it: grace is
     for the moment the fight restarts, and burning it while the player is
     reading a card would hand it back spent. */
  if(bossPause>0){
    bossPause=Math.max(0,bossPause-dt);
    if(bossPause<=0)phaseNoteEnd();
    return;
  }
  /* And nothing moves while the kill cam is playing. The camera is swung and
     the world is folded, so the board on screen is not the board the player
     would be acting on - and every window here, the shield included, should
     be waiting for them rather than running through a piece of film. Its own
     clock is real time, in the render loop. */
  if(rep)return;
  if(bossGraceMs>0)bossGraceMs=Math.max(0,bossGraceMs-dt);
  if(shieldMs>0&&!deathPending)shieldMs=Math.max(0,shieldMs-dt);
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
      if(hunterTouching(th)){bossHurt("it closed on you",th);return;}
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
        // Captured before the lock is cleared: the kill cam is about the line
        // that just fired, and two lines below there is no line any more.
        var fired=h.line;
        h.lock=0;h.line=null;
        h.x=player.x;h.y=player.y;h.z=player.z;   // the charge, all at once
        SFX.shot();shakeT=1;
        bossHurt("it came down the line",h,fired);
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
    if(hunterTouching(h)){bossHurt("it reached you",h);return;}
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
    if(hunterTouching(hunters[i])){bossHurt("you walked into it",hunters[i]);return true;}
  return false;
}
function hunterTouching(h){
  if(bossGraceMs>0||shielded())return false;
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
    SFX.strike();shakeT=1;slowMo();
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
  /* The kill frame, and the thing that was killed - both taken before the
     splice, because a replay of a kill has nothing to show once the victim
     has been removed from the board. */
  replayMark();
  var victim=hunters[doomed[0]];
  for(var d=doomed.length-1;d>=0;d--)hunters.splice(doomed[d],1);
  bossHitFlash=1;
  SFX.strike();shakeT=1;slowMo();
  /* What the survivors get for surviving. A fold that kills nothing is now
     worse than free, and a fold that kills one of three leaves the other two
     angrier - so the fight accelerates toward its own end rather than
     thinning out into a mop-up. */
  for(var s=0;s<hunters.length;s++)
    hunters[s].step=Math.max(B.floorStep,hunters[s].step*B.rage);
  // The board is clear, so the fight moves on. Only the last phase running
  // out is the win.
  /* THE LAST KILL OF A PHASE GETS A REPLAY, and only that one. Killing one
     of a pair ends nothing and the fight is still running, so a film there
     would interrupt the thing it is about. The advance waits for the replay
     to finish - starting it now would leave replayEnd() restoring a board
     that had already moved on. */
  if(!hunters.length){
    /* Including the kill that WINS the fight, which the first version
       skipped: bossAdvance() goes straight to win() there, so the film was
       cut off by the card the moment it was earned. The advance - phase or
       win - waits behind the replay either way. */
    if(replayStart("kill",victim)){bossPendingAdvance=true;syncHud();return;}
    bossAdvance();return;
  }
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
function bossHurt(why,who,line){
  if(shielded())return;
  replayMark();               // the kill pose, before the board moves off it
  /* AND A COPY OF THE MOMENT, taken here for the same reason.

     Everything below this line moves the board off the kill: the pack is
     thrown back to its spawns, so `who` - a live hunter object - is standing
     somewhere else by the time the replay starts; and bossSendHome() resets
     `flat`, `flatPos` and `view` to the opening pose. The camera then worked
     out which way round to film from a board that no longer described the
     kill, which on a flat death is every input it has. Reported twice from
     screenshots, and fixed by copying rather than by reordering: the reset
     has to happen before the film so the player is put back somewhere known,
     and the film has to know where they were. */
  var at={x:player.x,y:player.y,z:player.z,flat:flat,view:view,
          u:flatPos?flatPos.u:0,fy:flatPos?flatPos.y:0,
          h:who?{x:who.x,y:who.y,z:who.z}:null};        // asserted here as well as at the call site
  lives--;
  SFX.die();shakeT=1;slowMo();
  bossGraceMs=B.grace;
  shieldMs=SHIELD_MS;
  var bar=$("bossBar");
  if(bar){bar.classList.remove("hurt");void bar.offsetWidth;bar.classList.add("hurt");}
  /* THE LAST DEATH GETS ITS FILM TOO, and the first version skipped it for
     the same reason the winning kill was skipped: this path goes straight to
     die(), and die() takes the board away 820ms later. It is the worst one to
     skip - the run has just ended and the player is about to fight the whole
     thing again, which is precisely when they want to know what happened.
     The reset waits behind the replay, like a phase clear does. */
  if(lives<=0){
    if(replayStart("death",at.h,line||null,at)){
      bossPendingDeath=true;syncHud();return;
    }
    die("boss");return;
  }
  flash(why+" · "+lives+" "+(lives===1?"life":"lives")+" left");
  /* AND YOU GO HOME TOO, which reverses an earlier call on the owner's say.
     The argument against it stands - a hit costs you the position you spent
     twenty seconds building, on top of the life - but a hit is also the
     moment the board changes most, and being put back somewhere known,
     standing, facing the way the level opens, is what makes the next phase
     of the fight readable rather than a scramble from wherever you were
     caught. It happens BEFORE the replay starts, so the pose the replay
     saves and restores is the one the player is meant to come back to. */
  var spawns=B.twin?B.at:B.phases[bossPhase].at;
  for(var i=0;i<hunters.length;i++){
    var a=spawns[i%spawns.length];
    hunters[i].x=a[0];hunters[i].y=a[1];hunters[i].z=a[2];
    hunters[i].ms=0;hunters[i].lock=0;hunters[i].line=null;hunters[i].shy=0;
  }
  bossSendHome();
  /* The replay goes up last: after the life is counted, after the out-of-lives
     check, and after everything has been put back where the player will
     resume from - so the pose it saves and restores is the one they are meant
     to come back to. */
  replayStart("death",at.h,line||null,at);
  syncHud();
}
// A crate shoved onto a hunter is the other way to kill one, and it costs a
// move rather than a fold. It stays because it is the one attack that works
// while the geometry is against you.
function bossTakeCrate(idx){
  hunters.splice(idx,1);
  bossHitFlash=1;
  SFX.strike();shakeT=1;
  if(!hunters.length){bossAdvance();return true;}
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
  shieldMs=0;deathPending=false;slowMoMs=0;
  rep=null;bossPendingAdvance=false;bossPendingDeath=false;replayClear();
  document.body.classList.remove("replaying");
  if(TR)lives=BOSS_LIVES;
}
function trialFrame(dt){
  if(!TR||app!=="play")return;
  // screenUp() is the intro card *and* the home screen: a fight must not run
  // behind a title screen the player opened from the menu mid-boss.
  if(dying||levelDone||panelOpen()||screenUp()||
     $("won").classList.contains("on"))return;
  // Clamped against a backgrounded tab's one enormous frame, then scaled by
  // the pace setting - see paceScale() in 11-sound.js for why it is one
  // multiplication here rather than a slower `period` and `fire`.
  dt=Math.min(dt,90)*paceScale();
  if(slowMoMs>0){slowMoMs=Math.max(0,slowMoMs-dt);dt*=SLOWMO_RATE;}
  if(trialFlash>0)trialFlash=Math.max(0,trialFlash-dt/300);
  if(trialGrace>0)trialGrace=Math.max(0,trialGrace-dt);
  // On the fight's own clock, like every other window here, so the pace
  // setting scales it and it does not run while the fight is paused - nor
  // while a death is already committed and only waiting to be drawn.
  if(shieldMs>0&&!deathPending)shieldMs=Math.max(0,shieldMs-dt);
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
  if(trialBeat===beat||trialGrace>0||shielded())return;
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
  if(shielded())return;        // asserted here as well as at the call site
  lives--;
  SFX.die();shakeT=1;slowMo();
  trialGrace=TR.period;
  shieldMs=SHIELD_MS;
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
  /* The sweep just moved you, and it can move you onto a core: being pulled
     out of the plane lands you on a real square in the volume, which is the
     one thing rule 6 asks for. Every other way of arriving there goes
     through checkWin() - this was the one that did not, and it would have
     left the player standing on the core they had just reached with the
     amber row unchanged. */
  checkWin();
  // The lives just changed, so the stored session has to say so - otherwise
  // reloading after a hit hands the life back.
  saveSession();
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
/* Kind 1 is water now, and it is the only kind whose absence from the plane
   is a *thing that happens* rather than a static fact - so the sound needs
   to know whether this level has any. Cheap and re-asked per fold rather
   than cached: a level's blocks never change, but the editor and the
   composer both hand loadLevel a fresh object, and a cache keyed on nothing
   would answer for the previous one. */
function levelHasWater(){
  var b=L&&L.blocks;
  if(!b)return false;
  for(var i=0;i<b.length;i++)if(b[i][3]===1)return true;
  return false;
}
/* THE WORLD MOVING, FELT AS WELL AS SEEN.

   Changing dimension is the one verb this game has, and on screen it is a
   smooth interpolation - honest about what is happening and completely
   weightless. A jolt of the camera on the frame it commits gives the move an
   impact, and the phone buzzing under the thumb gives it one on a device
   where a tap has no travel at all. The fold is the heavier of the two: a
   whole world slamming into a plane against a world standing back up.

   It is `shakeT`, the same decaying value a hit uses (*.86 a frame, so it is
   gone in about a fifth of a second), so there is nothing new in the render
   loop. Skipped under prefers-reduced-motion - unlike the death and hit
   shakes, this one fires on an ordinary move several times a level, which is
   exactly the repetition that setting exists to stop. */
var reduceMotion=(window.matchMedia&&
  window.matchMedia("(prefers-reduced-motion: reduce)"));
function foldJolt(into){
  if(!(reduceMotion&&reduceMotion.matches)){
    /* Two motions, not one, because they say different things. The jitter is
       impact - the same decaying `shakeT` a hit uses - and the slam is
       WEIGHT: one heavy oscillation of the camera along screen-up, down as
       the world goes flat and up as it stands back up, so the picture moves
       the way the world just did. Jitter alone at this amplitude reads as a
       rendering fault; the slam is what makes it read as a thing happening. */
    shakeT=Math.max(shakeT,into?.9:.6);
    foldSlamT=1;foldSlamDir=into?-1:1;
  }
  /* Two pulses rather than one, in the shape of the sound: the fold is a
     slam that settles, the return is a small knock that opens out. A single
     flat buzz is the phone acknowledging a button; this is the move having
     a body. */
  if(typeof haptic==="function")haptic(into?[34,42,16]:[14,40,30]);
}
function doFlatten(){
  if(typeof peekUnlatch==="function")peekUnlatch();
  if(bossHolding())return;
  if(tutBlocks("bFlat"))return;
  tutPoke("bFlat");
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
  /* Captured BEFORE the fold resolves, while the player is still standing on
     something in the volume - afterwards there is only a silhouette. */
  if(typeof markWaterTrace==="function")markWaterTrace();
  flat=true;flatTarget=1;SFX.fold();foldJolt(true);
  /* The water spilling out of the plane. Only on a level that has any, so
     it is a fact about this world rather than a flourish on every fold -
     and layered over fold() rather than replacing it, because the fold is
     still the move the player made. */
  if(SFX.spill&&levelHasWater())SFX.spill();
  collectHere();
  if(tutC)tutC.flat++;
  bossFoldCrush();
  syncHud();saveSession();
  // Something else already occupies that square in the plane. Let the fold
  // play out, then close on the player. A half of the twin counts: it is
  // solid there, and folding into one is folding into a wall.
  /* COMMITTED NOW, DRAWN IN 420ms. Declaring it is what stops a charge
     landing in that gap and taking a second life for a moment the player has
     already lost - see deathPending in 05-state.js. */
  /* 620ms rather than 420, because the fold itself now takes FOLD_MS_IN to
     play out and a death landing mid-fold is the crush arriving before the
     thing that causes it. deathPending freezes the shield from the moment the
     move is committed, so lengthening this costs the player nothing. */
  if(wall||crush){deathPending=true;slowMo();setTimeout(function(){die("crush");},620);}
  else if(spiked){deathPending=true;slowMo();setTimeout(function(){die("spike");},620);}
}
function doUnflatten(){
  if(typeof peekUnlatch==="function")peekUnlatch();
  if(bossHolding())return;
  if(tutBlocks("bFlat"))return;
  tutPoke("bFlat");
  if(dying||levelOver()||!canShift())return;
  clearCue();
  var land=R.landings(view,flatPos.u,flatPos.y,liveCrates());
  if(!land.length){flash("nothing solid behind that");SFX.bump();return;}
  var b=R.pick(land);
  pushHistory();moveCount++;
  player.x=b.x;player.z=b.z;player.y=flatPos.y;
  flat=false;flatTarget=0;SFX.unfold();foldJolt(false);
  /* RULE 5, SHOWN. Only when the column actually held a choice - see
     showLanding() - so it is silent on the levels where nothing was decided
     and speaks on the ones that turn on it. The sentence goes with it the
     first few times only: after that the rings say it faster than words. */
  if(typeof showLanding==="function"&&land.length>1){
    b.yStand=flatPos.y;
    showLanding(land,b,!!b.anchor);
    var seen=settings.landHints||0;
    if(seen<LAND_HINT_TIMES){
      settings.landHints=seen+1;saveSettings();
      /* flashCue's note slot, not flash(): a toast lands at the top of the
         screen across the level's own hint text, which is exactly the
         collision that slot was made to fix. Down by the controls it also
         sits where the rings are, rather than at the opposite end of the
         screen from the thing it is describing. */
      setTimeout(function(){
        flashCue(null,b.anchor
          ?"the anchor held you \u2014 an anchor beats the front block"
          :"you come back on the block at the front");
      },340);
    }
  }
  if(tutC)tutC.unflat++;
  if(R.deadly3(player.x,player.y,player.z)){die("spike");return;}
  if(bossContact())return;         // you came back down on top of one
  syncHud();saveSession();
  checkWin();
}
function press(dir){
  if(app!=="play"||levelOver())return;
  if(typeof peekUnlatch==="function")peekUnlatch();
  // A tutorial step that names a control accepts only that control - but only
  // once the guide is actually up. Until then everything works and every input
  // pushes the guide further away.
  if(bossHolding())return;
  var tutId=dir==="left"?"bLeft":dir==="right"?"bRight":
            dir==="up"?"bUp":"bDown";
  if(tutBlocks(tutId))return;
  tutPoke(tutId);
  /* THE FIRST STEP IN THE PLANE DRAINS THE WATER. Folded, the water is left
     as a trace under your feet - see waterDrain in 10-render.js - and moving
     is what takes it away. Set before the move rather than after, so the
     splash starts on the same frame the player leaves. */
  /* Only a move that exists drains it. The plane has no up or down - those
     two do nothing here - so draining on any press meant a stray swipe
     emptied the water without the player having gone anywhere. */
  if(flat){
    if(dir==="left"){drainWater();move2(-1);}
    else if(dir==="right"){drainWater();move2(1);}
    return;
  }
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
      // The bands live in starsFor(); read from there rather than repeated,
      // or a change to the thresholds silently launders hints into stars.
      if(capped===2)effective=Math.max(effective,levelPar+1);
      else if(capped===1)effective=Math.max(effective,Math.floor(levelPar*STAR_2X)+1);
      else effective=Math.max(effective,Math.floor(levelPar*STAR_1X)+1);
    }
    // Stars gained is the *improvement*, not the stars just scored: replaying
    // a 3-star level pays nothing, and going 2 -> 3 pays exactly the one new
    // star. starsEarned() already sums best-per-level, so this keeps the
    // flight and the total telling the same story.
    // A level with a clock is scored on lives, not moves - see betterRecord().
    if(typeof clearFails==="function")clearFails(levelKey);
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
    /* The tutorial has been holding the player's hand the whole way, so the
       last thing it should say is where the hand goes. Only on the way out -
       between tutorial levels the guidance simply continues, and saying it
       three times would make it furniture. */
    var lastTut=!(LEVELS[lvIndex+1]&&LEVELS[lvIndex+1].tutorial);
    /* Armed rather than shown: a panel is z-index 12 and the win card is 20,
       so a card put up now would open behind the one the player is reading.
       loadLevel() fires it on the way into whatever they pick next, which is
       also what makes it survive LEVELS as well as NEXT LEVEL. */
    if(lastTut&&playSource==="builtin"&&!settings.ctlAsked)ctlOfferPending=true;
    $("wonTitle").textContent="Got it";
    $("wonSub").textContent=L.name.replace(/^00 \u2014 /,"")+"  \u00b7  "+
      moveCount+" moves  \u00b7  not scored"+
      (lastTut?"  \u00b7  from here on, tap the bulb for a hint":"");
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
    /* THE ONE PLACE A FIGHT CAN SAY ANYTHING. A boss has no goal to stand on
       and no room for prose while it is running, so the Census's four
       sentences land here, after the score, on the card the player is
       already reading. Appended rather than substituted: "never hit · 31
       moves" is what they came for and the story is the footnote.

       It is emitted as innerHTML because the score above it is set as
       textContent, so the level name has never been escaped on this path -
       esc() it here or a level called <b> would be markup. */
    if(L.won)$("wonSub").innerHTML=esc($("wonSub").textContent)+
      "<em class='wonstory'>"+esc(L.won)+"</em>";
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
  /* DID THAT LAST STAR FINISH THE SECTION?
     Asked here rather than on the map, because this is the only moment it is
     news - the map paints a finished section every time you open it, which
     is the reward, but the sentence "you have just taken the last one"
     can only be said once.

     Derived from starsGained rather than by remembering a previous state:
     the section is complete now, and something was gained, so it was not
     complete a moment ago. Deliberately does *not* go through
     sectionMastered() - that answers yes to everything while the preview
     switch is on, and a preview must never be able to fake this. */
  if(starsGained>0&&playSource==="builtin"&&!L.tutorial&&
     typeof sectionSpans==="function"){
    var sn=mapSecOf(lvIndex), spn=sn>=0?sectionSpans()[sn]:null;
    if(spn&&spn.max>0&&spn.got===spn.max){
      var sub2=$("wonSub");
      /* The boss branch above may already have appended the Census line as
         markup, and re-escaping textContent would flatten it back into the
         score with no separator - so read innerHTML once there is an element
         in there. Everywhere else wonSub is still a bare text node set with
         textContent, which has never been escaped and still must be. */
      sub2.innerHTML=(sub2.children.length?sub2.innerHTML:esc(sub2.textContent))+
        "<em class='wonmast' style='--sec:"+(SECTIONS[sn].col||"#35c2a5")+"'>"+
        esc(SECTIONS[sn].name)+" \u00b7 every star</em>";
      setTimeout(function(){if(SFX.mastery)SFX.mastery();},520);
    }
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
  if(bossHolding())return;
  if(tutBlocks(dir>0?"bRotR":"bRotL"))return;
  tutPoke(dir>0?"bRotR":"bRotL");
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
/* HELP THAT ESCALATES, offered every third loss on a clock level.

   Straight to "skip this" was wrong: it hands over the only two levels in
   the game with a real-time component the moment they get hard, and a player
   who is nearly there is told to give up. The order is now the order a
   person would actually try - MAKE IT SLOWER FIRST, and only offer the way
   past once slowing has run out.

   So on every third loss: if the clock can still be slowed, offer that and
   point at the exact setting; if it is already at its slowest, offer the
   skip. A player who was already on SLOW therefore sees the skip on their
   first offer, which is right - there is nothing else left to try.

   Every offer can be declined for good: each card carries DON'T SHOW ME
   AGAIN, and it silences both kinds. That is a global preference rather than
   a per-level one: somebody who does not want the game suggesting things
   does not want it per level. */
function paceSlower(){
  for(var i=0;i<PACES.length;i++)
    if(PACES[i].v<paceScale())return PACES[i];      // PACES runs fast to slow
  return null;
}
/* The opt-out, on every card this function can put up.

   It was on the slow offer only, and only from the second one - the reasoning
   being that a suggestion you have not seen yet is not one you can be tired
   of. In practice the two cards are one thing to the player ("the game keeps
   interrupting me"), and the one they see most is the skip card, which had
   no way out at all. Every offer carries it now, and it silences all of
   them: `noSlowOffer` is read at the top of struggleOffer(). Global rather
   than per level, because somebody who does not want the game suggesting
   things does not want it on the next boss either. */
function bindNever(){
  bind("sgNever",function(){
    settings.noSlowOffer=true;saveSettings();hidePanel();
    flash("no more suggestions");
  });
}
/* THE CONTROLS QUESTION, ASKED ONCE, AT THE END OF THE TUTORIAL.

   The default tutorial teaches the gestures and takes the bar off while it
   does - and then handed the buttons straight back the moment it finished,
   which taught a control set and then covered a fifth of the screen with a
   different one. The bar off is the default the game wants; what it cannot
   do is take the buttons away silently, because a player who wants them has
   no way of knowing they are a setting.

   So the tutorial ends by *doing* it and offering the way back. That is the
   same shape as struggleOffer(): the thing has already happened, the board
   is behind the card, and the card is a door rather than a wall. Asked once
   ever - `settings.ctlAsked` - because a preference asked twice is nagging,
   and it is in the loadSettings() whitelist or it would be asked on every
   reload.

   It names the keyboard as well, deliberately. On a fine pointer the lesson
   just given was the button lesson (see defaultTutor()), so somebody on a
   desktop has to be told what is left when the bar goes - and the honest
   answer there is the arrow keys, which have always worked. */
var ctlOfferPending=false;
function controlsOffer(){
  ctlOfferPending=false;
  if(settings.ctlAsked)return;
  if(!L||levelOver()||panelOpen()||screenUp())return;
  settings.ctlAsked=true;
  // Done before the card goes up, not by the buttons on it: the card is
  // showing the player what has already changed, and KEEP SWIPING has to be
  // a dismissal rather than an action.
  settings.ui="none";
  saveSettings();applyUI();syncHud();
  offerShell("Controls",
    "The buttons are off. You have the whole screen, and the three moves are "+
    "the ones the tutorial just showed you \u2014 <b>swipe</b> to walk, "+
    "<b>double-tap</b> to go "+VB().n2+" / "+VB().n3+", <b>two-finger swipe</b> "+
    "to turn.",
    "<button class='qt' id='ctlNo'>KEEP SWIPING</button>"+
    "<button class='ad' id='ctlYes'>SHOW THE BUTTONS</button>",
    "The gestures work either way, and so do the arrow keys. You can change "+
    "this any time under <b>Menu \u203a Controls</b>.");
  bind("ctlNo",function(){hidePanel();});
  bind("ctlYes",function(){
    settings.ui="full";saveSettings();applyUI();syncHud();hidePanel();
    flash("buttons on");
  });
}
/* THE BULB, EXPLAINED ONE LEVEL AFTER THE BUTTONS.

   The tutorial's last card says where the hand goes and then the game stops
   talking - and the single most useful control in it is a bulb in the corner
   that nobody has been told about. Hints are the reason a player who is
   stuck does not close the game, so a hint nobody knows exists is a
   retention hole rather than a missing nicety.

   It is deliberately the level AFTER the controls card rather than the same
   one: two full-bleed cards in a row on the first real level is a wall
   between the tutorial and the game. `settings.ctlAsked` is what sequences
   them - it is false while the controls card is still pending, so this can
   only come up once that one has been answered.

   AND THE PRESS IT ASKS FOR IS FREE. A hint costs a star band, and this card
   tells the player to spend one in order to find out what the button does -
   so it arms `freeHint` and showHint() skips the accounting exactly once.
   Charging for a control you demanded they try is the kind of small
   dishonesty a player remembers. */
function hintOfferDue(){
  return !settings.hintAsked&&settings.ctlAsked&&!ctlOfferPending&&
         playSource==="builtin"&&!!L&&!L.tutorial&&!L.boss&&!L.trial;
}
function hintOffer(){
  if(!hintOfferDue())return;
  if(levelOver()||panelOpen()||screenUp())return;
  settings.hintAsked=true;saveSettings();
  freeHint=true;
  offerShell("The bulb",
    "Stuck on a level? The bulb in the corner shows you the <b>next move</b> "+
    "\u2014 it is always there, it is unlimited, and nothing in this game is "+
    "ever a dead end you cannot be shown the way out of.",
    "<button class='ad' id='hnTry'>SHOW ME</button>"+
    "<button class='qt' id='hnNo'>GOT IT</button>",
    "Hints do lower the stars you can score on a level \u2014 but not this one. "+
    "<b>The next hint you take is free</b>, because we asked you to try it.");
  bind("hnNo",function(){hidePanel();});
  bind("hnTry",function(){
    hidePanel();
    // The pulse rather than the hint itself: the point is to show them where
    // the button is and let *them* press it, which is the thing they have to
    // remember. cue() falls through to the hand or to words if the layout
    // ever drops the bulb, so this says it whatever is on screen.
    setTimeout(function(){cue("bHint");},260);
  });
}
function offerShell(title,lead,acts,note){
  showPanel("<h3>"+title+"</h3><div class='mn'>"+lead+"</div>"+
            "<div class='ma'>"+acts+"</div><div class='mn'>"+note+"</div>");
}
function struggleOffer(){
  if(!L||levelOver()||panelOpen()||screenUp())return;
  /* Only a clock level can reach this, and asserting it here rather than
     trusting the call site is what stops the header confidently calling an
     ordinary level a TRIAL if this is ever called from somewhere new. */
  if(!B&&!TR)return;
  if(typeof skips!=="undefined"&&skips[levelKey])return;
  /* THE PLAYER SAID STOP, AND STOP MEANS EVERY OFFER.

     `noSlowOffer` used to be read one line lower, as the argument to
     paceSlower() only - so pressing DON'T SHOW ME AGAIN silenced the *slow*
     offer and then fell straight through to the skip offer underneath it,
     and from then on every third loss put up a card asking to skip the
     level. Reported from a playtest as the button not working, which is
     exactly what it looked like: the card kept coming. It is one preference
     - "stop suggesting things" - so it is asked once, here, before the
     function has decided which suggestion it was going to make. */
  if(settings.noSlowOffer)return;
  var kind=B?"BOSS":"TRIAL";
  var beat=(fails[levelKey]||STRUGGLE_OFFER)+" times";
  var slower=paceSlower();

  if(slower){
    settings.slowOffers=(settings.slowOffers||0)+1;
    saveSettings();
    offerShell(esc(L.name),
      "This one has beaten you "+beat+". A "+kind.toLowerCase()+" is the only "+
      "kind of level that does not wait for you \u2014 you can slow its clock "+
      "down, and it costs you nothing.",
      "<button class='ad' id='sgSlow'>SLOW THE CLOCK \u00b7 "+slower.label+
        " ("+slower.pct+"%)</button>"+
      "<button class='qt' id='sgNo'>KEEP TRYING</button>"+
      "<button class='qt' id='sgNever'>DON'T SHOW ME AGAIN</button>",
      "It slows every part of the fight together, so it keeps its shape. "+
      "<b>No stars are lost.</b> You can change it any time under "+
      "<b>Menu \u203a Real time \u203a Pace</b>.");
    bind("sgNo",function(){hidePanel();});
    bindNever();
    bind("sgSlow",function(){
      settings.pace=slower.v;saveSettings();hidePanel();
      flash("clocks at "+slower.pct+"%");
    });
    return;
  }

  /* Nothing left to slow, so this is the way past. It reaches grantSkip()
     and nothing else, which is what keeps the rule the map keeps: ADS BUY
     PROGRESS, NEVER SCORE. A skip is not in `progress`, so it awards no
     stars by construction and the level stays on the map, still playable. */
  offerShell(esc(L.name),
    "This one has beaten you "+beat+", and the clock is already as slow as it "+
    "goes. You can go past it and come back whenever you like.",
    "<button class='ad' id='sgAd'>SKIP THIS "+kind+" \u00b7 WATCH 3 ADS</button>"+
    "<button class='qt' id='sgNo'>KEEP TRYING</button>"+
    "<button class='qt' id='sgNever'>DON'T SHOW ME AGAIN</button>",
    "A skip awards <b>no stars</b> and leaves the level on the map, still "+
    "playable. Ads buy progress, never score.");
  bind("sgNo",function(){hidePanel();});
  bindNever();
  /* Not gated on an ad here, for the same reason grantSkip() is not: there
     is no provider yet, and a button that silently did nothing would be
     worse than one that plainly works. When the SDK is wired, its completion
     callback calls grantSkip() and nothing else on this path changes. */
  bind("sgAd",function(){
    grantSkip(levelKey);
    clearFails(levelKey);
    hidePanel();
    flash("skipped \u00b7 no stars for a skip");
    levelPicker();
  });
}

function loadLevel(level,idx){
  // A cue is a 3.2s pulse, so without this one outlives the level it was
  // about and greets you on the next one.
  clearCue();
  L=level;R=makeRules(L);
  if(idx!==undefined)lvIndex=idx;
  /* THE SECTION OWNS THE WORLD. Asked here, once per level, rather than per
     frame: a section is a property of where you are in the campaign, and
     changing sky and weather every frame would be paying for a lookup that
     changes about once every ten levels. A level with no section - the
     editor, the library, a composed level - gets the default sky. */
  if(typeof applyTheme==="function")
    applyTheme(playSource==="builtin"?themeForLevel(lvIndex):null);
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
  // The board first, the card a beat later - the same order the struggle
  // offer uses, and for the same reason: it is a door standing in front of
  // something, so the something has to be there.
  if(ctlOfferPending)setTimeout(controlsOffer,520);
  else if(hintOfferDue())setTimeout(hintOffer,520);
}
