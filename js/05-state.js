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
// Tutorial bookkeeping. Counters only - the coach reads them, nothing else
// does, and they reset with the level so a death restarts the lesson too.
var tutC=null, tutShown=-1;
function tutReset(){
  tutC={m3:0,m2:0,flat:0,unflat:0,rot:0,climb:0,
        d:{left:0,right:0,up:0,down:0}};
  tutShown=-1;
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
