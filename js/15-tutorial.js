"use strict";
/* Orthogonal — 15-tutorial.js
   Button cues, the tutorial coach, and the hint button.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

function clearCue(){
  var els=document.querySelectorAll(".cue");
  for(var i=0;i<els.length;i++)els[i].classList.remove("cue");
}
function cue(id){
  clearCue();
  var el=$(id);if(!el)return;
  el.classList.add("cue");
  clearTimeout(cueTimer);
  cueTimer=setTimeout(clearCue,3200);
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
  if(i<0||dying){el.classList.remove("on");tutShown=-1;return;}
  var step=L.tut[i];
  el.innerHTML="<i>"+(i+1)+" / "+L.tut.length+"</i>"+step.say;
  el.classList.add("on");
  // Only re-pulse when the step actually changes, or the cue timer would be
  // reset on every render and the button would strobe forever.
  if(i!==tutShown){tutShown=i;if(step.cue)cue(step.cue);}
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
    clearCue();
    flash("no way to finish from here \u2014 undo or reset");
    cue("bUndo");
    return;
  }
  if(!res.path.length){flash("you're standing on it");return;}
  var m=res.path[0].replace("\u2739","");
  var map={"FLAT":"bFlat","POP":"bFlat","rot+":"bRotR","rot-":"bRotL",
           "\u2192":"bRight","\u2190":"bLeft","\u2191":"bUp","\u2193":"bDown"};
  cue(map[m]||"bFlat");
  hintsUsed++;
  SFX.hint();
  syncHud();
  var cap=hintCap();
  flash(cap===0?"hints used \u2014 no stars this level"
                :"hint "+hintsUsed+" \u2014 max "+cap+" star"+(cap===1?"":"s"));
}
