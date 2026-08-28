"use strict";
/* Orthogonal — 05-state.js
   Mutable game state and the undo stack.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   STATE
   ============================================================ */
var app="play";              // "play" | "edit"
var L=null,R=null,lvIndex=0,fromEditor=false;
var custom={name:"Untitled",hint:"Your level.",blocks:[],keys:[],
            start:[0,1,0],goal:[3,1,0],rotate:true};
var view=0,flat=false,flatT=0,flatTarget=0,viewAngle=0,viewAngleTarget=0;
var player={x:0,y:0,z:0},flatPos={u:0,y:0};
var tool="add", undoStack=[];
var dying=null, dyingT=0;
var squash=0, shakeT=0, lastY=null, lastSolidDepth=0;
// Looking around shouldn't cost a move. Peeking swings the camera off the
// orthogonal axis without touching the game state, so you can read depth and
// then carry on.
var peek=0, peekTarget=0;
// Two fingers turn the world, and it leans while you drag so you can see the
// turn before you buy it - turning costs a move, and a beat of a real clock on
// a boss or a trial. Degrees, signed, and camera-only for exactly the same
// reason peek is: it is handed over to viewAngle at the instant the turn is
// actually taken, and springs back to nothing if you let go short of it.
var turnDrag=0, turnDragging=false;
var moveHistory=[], moveCount=0, levelPar=null, levelKey=null;
var gCrates=[];          // live crate positions, in level order
var gKeys=0;             // bitmask of collected keys
var nKeysTotal=0;
var progress={};             // levelKey -> best move count
/* levelKey -> 1, for levels opened with a skip rather than beaten. Kept out
   of `progress` on purpose: that object is the star economy's input, and a
   skip must be worth nothing in it. See skipLoad() in 06-persistence.js. */
var skips={};
// Tutorial bookkeeping. Counters only - the coach reads them, nothing else
// does, and they reset with the level so a death restarts the lesson too.
/* The control the tutorial is currently insisting on, or null. Derived from
   the active step's own cue every time the coach re-evaluates, so it is a
   *view* of the step rather than a second copy of where the player is up to -
   which is what keeps the lock from being able to disagree with the coach. */
/* Milliseconds of held breath between one phase and the next. Nothing moves
   and no input is accepted while it runs. */
var bossPause=0;
var tutC=null, tutShown=-1, tutLock=null, tutHelpTimer=null,
    tutIdle=0, tutWait=0, tutCued=null;
/* Whether the current tutorial step wants the landing candidates ringed in
   the world. Set by tutSync and read by the render loop, rather than the
   renderer asking the tutorial every frame: every verb that can move the
   rings - walking, folding, and above all turning - already ends in
   syncHud(), so a value written there is never stale. */
var tutMark=false;
function tutReset(){
  /* `card` counts explanation cards the player has acknowledged. It is a
     counter and not a flag for the same reason every other one here is: a
     step is a predicate over these, so "the second card" is `card>=2` and a
     player who restarts, undoes or dies simply re-reads them in order. */
  tutC={m3:0,m2:0,flat:0,unflat:0,rot:0,climb:0,peek:0,card:0,
        d:{left:0,right:0,up:0,down:0}};
  tutShown=-1;tutMark=false;
}
var muted=false;
// Boss fights. B is null on every ordinary level and every check below is
// guarded on it, so a level without a boss runs the code it always ran.
var B=null, bossHp=0, lives=0, bossFlash=0;
/* The pack. Each hunter carries its own step clock, so they arrive out of
   phase and the fight has texture instead of a single drumbeat; `doom` is
   recomputed each frame for the renderer. bossHp is the number of phases
   still to come, kept as its own name because the HUD and progress[] both
   speak in cores. */
var hunters=[], bossHitFlash=0, bossCreepMs=0, bossGraceMs=0;
/* Which phase of the fight is live. A boss is a sequence of phases rather
   than one pack: clearing the hunters on the board advances it, and bossHp is
   phases *remaining*, so the dots in the HUD are the arc of the fight rather
   than a body count. That is the whole reason for the structure - a fight
   with no arc can only be tuned by making the whole thing faster, which is a
   dial that punishes reading rather than rewarding it. */
var bossPhase=0;
// The twin's current core: which centre the two halves are mirrored about,
// and the cell that centre sits on. Null on every other fight.
var twinCore=0, twinAt=null;
var BOSS_LIVES=3;
/* THE SHIELD - one beat in which nothing at all can take a second life.

   Every clock level had three separate ways to be charged a life and no one
   place that said "you have just been charged". `bossGraceMs` stopped
   hunters touching you again, `trialGrace` stopped the sweep landing twice,
   and neither of them had any opinion about die() - so being caught by the
   sweep and then falling out of the world in the same moment cost two lives
   for one mistake. Reported from a playtest, on a trial.

   So there is now one window, set wherever a life is spent and consulted
   wherever one would be, and it is drawn: a bubble round the player for as
   long as it lasts. Invulnerability you cannot see is invulnerability you
   will not use, which is the same reason the grace beat has always blinked.

   It does not tick while you are dying, because it shares the fight's clock
   and the fight is paused through a death animation - which is exactly the
   window the bug lived in. That is deliberate: the fall that follows a hit
   is the case this exists for, and 820ms of death animation must not be
   allowed to eat the second it is being covered by. */
var SHIELD_MS=1000;
var shieldMs=0;
/* A DEATH THAT IS COMMITTED BUT HAS NOT LANDED YET.

   Folding into a wall or onto a spike is deliberately not instant: doFlatten
   lets the fold play out and schedules the death 420ms later, because being
   crushed has to be seen to happen. The fight keeps running through those
   420ms - so a charge could land in the gap and take a life for a moment the
   player had already lost. Two hearts, one mistake, which is the same bug the
   shield was built for wearing a different hat: the shield covers the time
   AFTER a life is spent, and this covers the time after one is committed.

   It also stops the shield decaying, so the second the shield is worth is
   still there when the death finally resolves. */
var deathPending=false;
/* SLOW MOTION, on the two moments the fight is decided.

   Both a kill and a hit are instant and both happen on a beat the player is
   already reacting to, so the thing they most need to see - which column it
   was, which line it came down - is over before they have looked at it. The
   fight runs at a fraction of speed for a moment afterwards instead: the
   event has time to be read, and the beat that follows it is one the player
   can still answer.

   It scales `dt` at the top of bossFrame and trialFrame, one multiplication
   in the same place paceScale() lives, so every window in the fight - aim,
   step, creep, rage, the grace beats - slows together and keeps its ratio to
   the others. The counter itself runs on REAL time, or slowing the clock
   would slow the thing that ends the slowing. */
var SLOWMO_MS=620, SLOWMO_RATE=.3;
var slowMoMs=0;
function slowMo(){ slowMoMs=SLOWMO_MS; }
/* THE KILL CAM - the charge replayed from the side it came from.

   A hunter's charge is instant and it is the one event in the fight a player
   most needs to understand: which line it was, and why folding would have
   answered it. So when one lands, the fight stops, the camera swings to the
   view in which that line runs across the screen - the way the thing that
   charged you had it lined up - and the world folds onto the player. It is
   the hunter's own verb, done to you, in the one view where you can see it
   happen.

   It is entirely a RENDER effect and touches no state. `viewAngleTarget` is
   pushed and restored, and the fold rides `flatT`, which is a render value
   that nothing outside 10-render.js reads - the same seam peek already uses.
   `view`, `flat` and `flatPos` do not move, so the board the player gets
   back is exactly the board they left.

   Its clock is real time, like slow motion's and for the same reason. */
var KILLCAM_MS=1250;
var killCamMs=0, killCamAngle=0, killCamReturn=0, killCamFold=0;
/* Trials. T is null on every level that isn't one, and like B every check is
   guarded on it. It deliberately spends the same `lives` a boss does: a level
   is either on a clock or it isn't, never both, and one counter means the HUD,
   the win card and progress[] all keep working without learning a new word.
   `trialBeat` is the index of the beat that has already taken its due, so one
   sweep cannot charge you twice for standing still through it. */
var TR=null, trialMs=0, trialBeat=-1, trialFlash=0;
// Milliseconds of grace after a hit, and the beat the metronome last ticked
// on, so the tick fires once per beat rather than once per frame.
var trialGrace=0, trialTicked=-1;
// Which core you are heading for. Only meaningful when the trial has a list.
var trialCore=0;
/* The level is over and the win card is on its way. Both clocks stop here.
   Without it there is a real gap - win() takes 380ms to raise the card, and
   until it is up the boss's last shot is still in the air and the next slice
   still lands, so you could be knocked down by a level you had already
   finished. Nothing that happens after the goal should be able to change
   what happened before it. */
var levelDone=false;

function snapState(){
  return {x:player.x,y:player.y,z:player.z,flat:flat,
          fu:flatPos.u,fy:flatPos.y,view:view,ang:viewAngleTarget,
          cr:gCrates.map(function(c){return c.slice();}),keys:gKeys};
}
function pushHistory(){
  moveHistory.push(snapState());
  if(moveHistory.length>400)moveHistory.shift();
}
function undoMove(){
  if(dying||levelOver())return;
  if(!moveHistory.length){flash("nothing to undo");return;}
  var st=moveHistory.pop();
  player={x:st.x,y:st.y,z:st.z};
  flat=st.flat;flatPos={u:st.fu,y:st.fy};
  view=st.view;viewAngleTarget=st.ang;
  gCrates=st.cr.map(function(c){return c.slice();});gKeys=st.keys;
  /* Undo does not touch a fight at all - not the pack, not the lives, not
     the clock. It cannot: the hunters move on wall time and there is no tick
     to step back to, and rewinding a kill while they kept walking would put
     the world in a state that never happened. Undo is for rethinking a move,
     which is what every other level is made of. */
  flatTarget=flat?1:0;
  moveCount=Math.max(0,moveCount-1);
  buildGrid();syncHud();
}
var library=[];              // saved levels, persisted
var playSource="builtin";    // "builtin" | "library" | "test"
var libIndex=0;
var ghosted=new Set();       // blocks the minimizer found to be inert
