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
/* The fold's own motion, beside the shake rather than inside it: `shakeT` is
   a decaying magnitude with a random direction, and this one has a direction
   that matters - down into the plane, up out of it. See foldJolt(). */
var foldSlamT=0, foldSlamDir=-1;
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
/* ============================================================
   THE REPLAY - the last few seconds, played back from the other side
   ============================================================
   A charge is instant and it comes from across the arena, so the one event a
   player most needs to understand is over before they have looked at it: which
   line it was, where the thing came from, and why folding would have answered
   it. A still camera swung at the moment of the hit says some of that. Playing
   the seconds BEFORE it says all of it - you watch it walk onto your row, you
   watch it plant, and then you watch it do to you the one thing you could have
   done to it first.

   HOW IT RECORDS, and why this way. There are two families of replay system.
   One re-simulates from recorded inputs and a seed: tiny, and it needs the
   simulation to be exactly deterministic. This one is not and cannot cheaply
   be - the pack advances on wall-clock `dt`, so a frame that arrives 3ms late
   changes where everything is, and a replay would drift from what the player
   actually saw. The other records STATE at a fixed cadence and plays it back.
   It costs memory instead, and here that argument is not close: the whole
   world is a handful of integer cells, so six seconds at 20Hz is 120 frames
   of about a dozen numbers each - a few kilobytes, allocated once and reused
   as a ring. It is also exact by construction, which is the property that
   matters, because a replay that disagrees with what just happened is worse
   than none.

   20Hz is chosen and not tuned: everything in this fight moves in whole cells
   on beats of 600ms and up, so a sample every 50ms captures every position
   the game was ever actually in. There is nothing to interpolate.

   HOW IT PLAYS BACK. The fight is frozen (bossHolding refuses all four verbs
   and bossFrame returns), and each frame the recorded pose is written into
   `player`, `flat`, `flatPos`, `view` and `hunters`. That is deliberate and
   it is safe precisely because nothing else is running: every drawing path -
   the fold, the telegraph pane, the depth fade, the peril tint - then works
   on the replay exactly as it works on the live fight, for no extra code. The
   live state is saved at the start and put back at the end, so the board the
   player gets handed back is the board they left.

   Two modes:
     - DEATH: follows the hunter that hit you, from the view in which its line
       runs across the screen, and ends by folding the world onto you - its
       own verb, done to you, in the view where you can watch it happen.
     - KILL: only on the fold that CLEARS a phase, from your own side. Killing
       one of a pair is not the end of anything and a replay there would
       interrupt a fight that is still running. */
var REP_HZ=20;                 // one sample every 50ms
var REP_KEEP=6000;             // how much history the ring holds
var REP_DEATH_MS=1900, REP_KILL_MS=1500;   // how much of it each mode shows
var REP_RATE=.55;               // played back slower than it happened
var REP_FOLD_MS=520, REP_HOLD_MS=260;      // the fold at the end, and a beat on it
var repBuf=[], repT=0, repAcc=0;
var rep=null;
// A phase clear that is waiting for its replay to finish before it happens.
var bossPendingAdvance=false;
/* And the same for the last life. The run ending is the moment a player most
   wants the film - they are about to fight the whole thing again - so the
   reset waits behind it exactly as a phase clear does. */
var bossPendingDeath=false;
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
