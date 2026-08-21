"use strict";
/* Orthogonal — 15-tutorial.js
   Button cues, the tutorial coach, and the hint button.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

function clearCue(){
  var els=document.querySelectorAll(".cue");
  for(var i=0;i<els.length;i++)els[i].classList.remove("cue");
}
/* What a cue would say out loud.

   A cue is a pulse on a button, and a pulse on a button that is not on
   screen is a hint delivered to nobody. That happens three ways: COMPACT
   drops the d-pad, HIDDEN drops the whole bar, and `cue("bUndo")` has always
   pointed at a button this game does not have — so the one hint you get when
   you have wedged yourself past recovery was the one that showed nothing.
   Every gesture and button also has a key, so there is always something true
   to say instead. */
var CUE_WORDS={
  bLeft:"go left",   bRight:"go right",
  bUp:"go back",     bDown:"go forward",
  bRotL:"turn left — Q", bRotR:"turn right — E",
  bFlat:"change dimension — space",
  bUndo:"undo — Z",      bLook:"peek — hold shift"
};
function cueVisible(el){
  // Rects rather than offsetParent: the bar is position:fixed, and a fixed
  // element reports no offsetParent even when it is plainly on screen.
  return !!(el&&el.getClientRects().length);
}
/* Returns the spoken form when it had to fall back, and null when the pulse
   landed. Callers that are about to flash a message of their own use that to
   carry the move along rather than clobber it — there is one toast, so the
   last write wins and a bare flash here would be wiped by the next line. */
function cue(id){
  clearCue();
  var el=$(id);
  if(cueVisible(el)){
    el.classList.add("cue");
    clearTimeout(cueTimer);
    cueTimer=setTimeout(clearCue,3200);
    return null;
  }
  var say=CUE_WORDS[id]||null;
  if(say)flash(say);
  return say;
}
/* The verb has one player-facing name and it lives in VERBS, reached through
   VB() - but the tutorial's prose is data in 02-levels.js, which loads before
   11-sound.js, so it cannot call VB() when it is written. It writes {to2} and
   friends instead and they are substituted here, at the moment the line is
   shown. The lesson therefore always says exactly what the button says.

   This is not decoration. The tutorial used to say "collapse the world", then
   "Collapse", then "flatten", then "stand back up", while the button in front
   of the player said GO 2D - four names for one verb, none of them the one on
   screen, in the three levels whose entire job is naming things. */
function tutWords(s){
  var v=VB();
  return s.replace(/\{to2\}/g,v.to2).replace(/\{to3\}/g,v.to3)
          .replace(/\{n2\}/g,v.n2).replace(/\{n3\}/g,v.n3);
}

/* THE GUIDED LOCK.

   While a step names a control, that control is the only one the game will
   accept: the world dims, every other play button goes faint, and a press
   anywhere else does nothing. A first-time player should not have to work out
   which of seven buttons the sentence means.

   Two things it deliberately does not do. It never touches the corner chrome,
   so the menu and restart are always reachable - a tutorial you cannot leave
   is a trap, not a lesson. And it holds no state of its own: the locked
   control is read out of the current step every time the coach re-evaluates,
   so undo, death or a stray input just re-derive it. That is the same
   property the coach has always had and the reason it cannot desynchronise. */
function tutBlocks(id){
  return app==="play" && tutLock !== null && tutLock !== id;
}

/* The coach shows the first unsatisfied step. Because it is a predicate over
   state rather than a pointer into a list, it cannot desynchronise: undo,
   death, or a player doing things in the wrong order all just re-evaluate. */
function tutState(){
  return {view:view,flat:flat,u:flatPos.u,p:{x:player.x,y:player.y,z:player.z}};
}
function tutStep(){
  if(app!=="play"||!L||!L.tut||!tutC)return -1;
  var st=tutState();
  for(var i=0;i<L.tut.length;i++)
    if(!L.tut[i].done(tutC,st))return i;
  return -1;
}
function tutSync(){
  var el=$("coach");if(!el)return;
  var i=tutStep();
  if(i<0||dying){el.classList.remove("on");tutShown=-1;tutUnlock();return;}
  var step=L.tut[i];
  el.innerHTML="<i>"+(i+1)+" / "+L.tut.length+"</i>"+tutWords(step.say);
  el.classList.add("on");
  tutLockTo(step.lock===false?null:(step.cue||null));
  // Only re-pulse when the step actually changes, or the cue timer would be
  // reset on every render and the button would strobe forever.
  if(i!==tutShown){tutShown=i;if(step.cue)cue(step.cue);}
}
/* .tutlive rather than .cue, because the cue is a 3.2-second pulse and the
   lock lasts as long as the step does. Keying the highlight off the pulse
   would leave every button dimmed once it expired, including the one the
   player is being told to press. */
function tutLockTo(id){
  if(id===tutLock)return;
  tutUnlock();
  if(!id)return;
  var el=$(id); if(!el)return;
  tutLock=id;
  el.classList.add("tutlive");
  document.body.classList.add("tutlock");
}
function tutUnlock(){
  if(tutLock===null)return;
  tutLock=null;
  var els=document.querySelectorAll(".tutlive");
  for(var i=0;i<els.length;i++)els[i].classList.remove("tutlive");
  document.body.classList.remove("tutlock");
}

function showHint(){
  if(app!=="play"||dying||levelOver())return;
  if(L&&L.tut){
    var ti=tutStep();
    if(ti>=0){if(L.tut[ti].cue)cue(L.tut[ti].cue);flash("follow the line above the bar");return;}
  }
  var res=solve(L,true,undefined,currentState());
  if(res.status==="toobig"){flash("too tangled to search from here");return;}
  if(res.status!=="solved"){
    // Cue first, flash second: there is one toast and the last write wins, so
    // the sentence that explains the situation has to be the one that lands.
    cue("bUndo");
    flash("no way to finish from here \u2014 undo or reset");
    return;
  }
  if(!res.path.length){flash("you're standing on it");return;}
  var m=res.path[0].replace("\u2739","");
  var map={"FLAT":"bFlat","POP":"bFlat","rot+":"bRotR","rot-":"bRotL",
           "\u2192":"bRight","\u2190":"bLeft","\u2191":"bUp","\u2193":"bDown"};
  var say=cue(map[m]||"bFlat");
  hintsUsed++;
  SFX.hint();
  syncHud();
  var cap=hintCap();
  // With the bar hidden there is no button to pulse, so the move itself goes
  // in the toast ahead of the accounting. Paying a star for a hint that
  // pointed at nothing was the actual bug.
  flash((say?say+" \u2014 ":"")+
        (cap===0?"hints used, no stars this level"
                :"hint "+hintsUsed+", max "+cap+" star"+(cap===1?"":"s")));
}
