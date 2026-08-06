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
  if(dying)return;
  if(!moveHistory.length){flash("nothing to undo");return;}
  var st=moveHistory.pop();
  player={x:st.x,y:st.y,z:st.z};
  flat=st.flat;flatPos={u:st.fu,y:st.fy};
  view=st.view;viewAngleTarget=st.ang;
  gCrates=st.cr.map(function(c){return c.slice();});gKeys=st.keys;
  flatTarget=flat?1:0;
  moveCount=Math.max(0,moveCount-1);
  buildGrid();syncHud();
}
var library=[];              // saved levels, persisted
var playSource="builtin";    // "builtin" | "library" | "test"
var libIndex=0;
var ghosted=new Set();       // blocks the minimizer found to be inert
