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
/* Said the way the buttons read, not the way the code thinks.

   The d-pad's glyphs are arrows, so "go up" and "go down" are what a player
   sees even though those two move you away from and toward the camera. And
   the fold has one name per direction rather than one name for the verb -
   "2D shift" going in, "3D shift" coming out - because which way you are
   about to go is the whole content of the instruction. */
var CUE_WORDS={
  bLeft:"go left",  bRight:"go right",
  bUp:"go up",      bDown:"go down",
  bRotL:"rotate counter-clockwise", bRotR:"rotate clockwise",
  bUndo:"undo",     bLook:"peek"
};
function cueWord(id){
  if(id==="bFlat")return flat?"3D shift":"2D shift";
  return CUE_WORDS[id]||null;
}
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
  var say=cueWord(id);
  if(say)flashCue(say);
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

/* THE GUIDED LOCK — shown to a player who has stopped, not to every player.

   When it is up, the named control is the only one the game accepts: the
   world dims, every other play button goes faint and inert, and the one being
   asked for lights up. A first-time player should not have to work out which
   of seven buttons a sentence means.

   Two things it deliberately does not do. It never touches the corner chrome,
   so the menu and restart are always reachable - a tutorial you cannot leave
   is a trap, not a lesson. And it holds no state of its own: the locked
   control is read out of the current step every time the coach re-evaluates,
   so undo, death or a stray input just re-derive it. That is the same
   property the coach has always had and the reason it cannot desynchronise. */
/* IT ARMS ON HESITATION, NOT ON ARRIVAL, and that is the whole difference
   between a hint and a mood.

   The first version engaged the moment a step began. Since every step names a
   control, the guide was on for the entire tutorial - and this game is already
   dark, so a permanent dark overlay does not read as "here is the button", it
   reads as "the game is dark". A hint has to be an *event*: something that was
   not there a moment ago and now is. Appearing is most of the signal.

   So the guide waits, and the wait restarts every time the player presses the
   control being asked for. Somebody who is following along never sees it at
   all; somebody who has stopped gets it a beat later. See tutPoke() for why
   complying dismisses it and what stops that flickering.

   Both numbers are feel and nothing here can judge them. Playtest them. */
var TUT_HELP_MS=1000;    // before the first help on a step
var TUT_AGAIN_MS=2600;   // after the player has used the right control once

function tutBlocks(id){
  return app==="play" && tutLock !== null && tutLock !== id;
}
/* Called by the four verbs with the control the player actually used.

   **Pressing the button being asked for dismisses the guide**, every time,
   including while it is already up. The first version refused to re-arm once
   it had engaged — meant to stop it flickering on a step that takes several
   presses — and that was exactly backwards: 'First Fold' step 3 asks for three
   presses of the same arrow, so a player following the instruction perfectly
   watched the screen stay dark through all three. Complying has to be the
   thing that turns it off, or the guide is not answering the player at all.

   What stops the flicker instead is TUT_AGAIN_MS: once they have used the
   right control on this step they have shown they know it, so the second help
   waits considerably longer than the first. Pressing at a steady beat never
   strobes, and a player who stalls again still gets it back.

   An input that is *not* the cued control does nothing here, on purpose. It
   neither buys time nor spends it — the wait carries on from where it was, so
   pressing other things cannot hold the help off forever. It cannot happen
   while the guide is up in any case: those buttons are inert. */
function tutPoke(id){
  var g=tutGuide();
  var want=g?g.cue:null;
  if(!want||id!==want)return;
  tutRelease();                 // the dim goes; the green stays until the step does
  tutArm(TUT_AGAIN_MS);
}
/* Is the game actually in front of the player right now? The same question
   bossFrame and trialFrame ask before running their clocks, and for the same
   reason: time spent reading the intro card or the menu is not hesitation.
   Without this the very first wait ran out behind the intro, so the guide was
   already up the instant the player pressed BEGIN - which is the bug it was
   built to fix, one screen earlier. */
function tutPlayable(){
  return app==="play" && !dying && !panelOpen() &&
         $("intro").classList.contains("gone") &&
         !$("won").classList.contains("on");
}
/* The wait is a poll that only counts time the player could have used.

   A plain one-shot timer keeps its own cadence, so the first one ran out
   behind the intro card and the guide was up within a few hundred
   milliseconds of BEGIN - the same bug it exists to fix, one screen earlier.
   Counting ticks instead means a wait spent reading the intro, or the menu,
   or watching a death animation is not hesitation and does not accrue. */
var TUT_TICK=120;
function tutArm(ms){
  clearTimeout(tutHelpTimer);
  tutHelpTimer=null;
  tutIdle=0;
  tutWait=ms||TUT_HELP_MS;
  tutTick();
}
function tutTick(){
  tutHelpTimer=setTimeout(function(){
    tutHelpTimer=null;
    if(tutLock!==null)return;                    // already up; nothing to count
    if(app!=="play"||!L||!L.tut)return;
    if(tutPlayable())tutIdle+=TUT_TICK;
    if(tutIdle<tutWait){tutTick();return;}
    tutEngage();
  },TUT_TICK);
}

/* The coach shows the first unsatisfied step. Because it is a predicate over
   state rather than a pointer into a list, it cannot desynchronise: undo,
   death, or a player doing things in the wrong order all just re-evaluate. */
function tutState(){
  return {view:view,flat:flat,u:flatPos.u,p:{x:player.x,y:player.y,z:player.z}};
}
/* THE TUTORIAL POINTS WHERE THE SOLVER POINTS.

   Each step used to name its own control and be satisfied by a counter, and
   a counter is not a position: 'First Fold' step 3 finished on "three moves
   in the plane", so a player who folded, stepped, stood up, folded again and
   walked to the far end had made two plane moves and was still being told to
   walk right - with nowhere left to walk. The instruction was wrong and the
   green arrow was wrong with it.

   A script cannot survive a player who goes their own way, and this game has
   undo, death and a free camera. So the guidance is no longer scripted: the
   cued control is whatever solve() says the next move is from where the
   player actually stands, which is right by construction from any state the
   player can reach, including states no author thought of.

   The step's own line still carries the lesson while it agrees with the
   solver. When they disagree the player has gone off-script, and a short
   honest line about the next move replaces it - being wordlessly correct
   beats being eloquently wrong. */
var TUT_MOVE_BTN={"FLAT":"bFlat","POP":"bFlat","rot+":"bRotR","rot-":"bRotL",
  "\u2192":"bRight","\u2190":"bLeft","\u2191":"bUp","\u2193":"bDown"};
var TUT_MOVE_SAY={
  "FLAT":"Press <b>{to2}</b>.",
  "POP":"Press <b>{to3}</b> to stand back up.",
  "rot+":"Turn with <b>&#8631;</b>.",
  "rot-":"Turn with <b>&#8630;</b>.",
  "\u2192":"Press <b>&#9654;</b>.",
  "\u2190":"Press <b>&#9664;</b>.",
  "\u2191":"Press <b>&#9650;</b>.",
  "\u2193":"Press <b>&#9660;</b>."};
var tutSolveKey=null, tutSolveVal=null, tutSolveLvl=null;
/* Cached on the exact state, because tutSync, tutPoke and tutEngage all ask
   within one interaction and a tutorial board is small but not free.

   THE LEVEL IS PART OF THE KEY AND HAS TO BE. currentState() describes where
   the player is standing and nothing about what they are standing on - and
   all three tutorials start at [0,1,0] facing view 0 with no crates and no
   keys, so their opening states stringify identically. Cached on the state
   alone, opening `First Turn` straight after `First Steps` handed back the
   walking lesson's first move and the coach said "press right" on the level
   whose entire subject is turning. Reported from a playtest, and it took a
   particular route to see: the first move of a level, on a level entered
   from another level whose first move had already been asked for.

   Compared by identity rather than by name because a name is not unique
   either - the editor and the composer both produce levels that can share
   one. */
function tutSolverMove(){
  if(!L||!L.tut||app!=="play")return null;
  var st=currentState();
  var key=JSON.stringify(st);
  if(key===tutSolveKey&&L===tutSolveLvl)return tutSolveVal;
  tutSolveKey=key;tutSolveLvl=L;tutSolveVal=null;
  var res=solve(L,L.rotate!==false,60000,st);
  if(res.status==="solved"&&res.path.length)
    tutSolveVal=res.path[0].replace("\u2739","");
  return tutSolveVal;
}

/* What the coach should actually say right now, which is not always the
   step's own line.

   A step can assume a state as well as a goal: "Depth is gone - walk across"
   only makes sense while you are flat. A player who folds, takes one step and
   stands back up has not finished that step, so the coach still shows it -
   and it is now instructing them to do something they cannot do, in a level
   whose whole job is not confusing them. Reported from a playtest with the
   player standing in the volume being told to walk across the plane.

   A step declares `want:"flat"` or `want:"3d"`, and when the state does not
   match, the line and the cued control are both replaced by the way back.
   Everything downstream - the coach, the green, the lock, tutPoke - reads
   through here, so there is one answer to "what is being asked" rather than
   four that can disagree. */
/* ONE ANSWER TO "WHAT NOW", FOR EVERY STATE THE PLAYER CAN BE IN.

   The coach, the green button, the dim and tutPoke all read this, so they
   cannot give different answers - which they could when each worked out its
   own, and did.

   Three cases, and the third is the one that was missing. While a lesson step
   is outstanding and the solver agrees with it, the lesson speaks. While a
   step is outstanding and the solver does *not* agree, the player has gone
   off-script and the solver speaks, because being wordlessly correct beats
   being eloquently wrong. And when every step is satisfied but the level is
   not finished - which happens easily, since the steps count actions and the
   level counts arriving - the tutorial used to fall silent and leave a
   first-time player with no guidance at all, one move from the end. Now the
   solver carries them the rest of the way. */
function tutGuide(){
  if(app!=="play"||!L||!L.tut||!tutC)return null;
  var i=tutStep();
  var mv=levelOver&&levelOver()?null:tutSolverMove();
  var btn=mv?TUT_MOVE_BTN[mv]:null;
  if(i>=0){
    var step=L.tut[i];
    if(!btn||btn===step.cue)
      return {idx:i,say:"<i>"+(i+1)+" / "+L.tut.length+"</i>"+step.say,
              cue:step.cue,lock:step.lock};
    return {idx:i,say:"<i>"+(i+1)+" / "+L.tut.length+"</i>"+
            (TUT_MOVE_SAY[mv]||step.say),cue:btn,lock:step.lock};
  }
  if(!btn)return null;                       // finished, or nothing to suggest
  return {idx:-1,say:TUT_MOVE_SAY[mv],cue:btn,lock:undefined};
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
  var g=dying?null:tutGuide();
  if(!g){el.classList.remove("on");tutShown=-2;tutUnlock();return;}
  el.innerHTML=tutWords(g.say);
  el.classList.add("on");
  // Re-asserted every time rather than only on a change: tutCueTo is a no-op
  // when it already matches, and asserting it here is what keeps the green on
  // the button a function of the step rather than a thing someone has to
  // remember to restore.
  tutCueTo(g.cue||null);
  // Only re-pulse when the step actually changes, or the cue timer would be
  // reset on every render and the button would strobe forever. A new step
  // also drops the guide and starts its wait again from nothing.
  if(g.idx!==tutShown){
    tutShown=g.idx;
    if(g.cue)cue(g.cue);
    tutRelease();
    tutArm();
  }
}
/* .tutlive rather than .cue, because the cue is a 3.2-second pulse and the
   lock lasts as long as the step does. Keying the highlight off the pulse
   would leave every button dimmed once it expired, including the one the
   player is being told to press. */
/* TWO SEPARATE THINGS, and conflating them was a bug.

   The green on the button says "this is the control this step wants" and is
   true for as long as the step is. The dim says "you seem stuck, and now it
   is the *only* control I will accept" and is true only after hesitation.

   They used to be one class, so dismissing the dim by pressing the right
   button also took the green away - and `First Fold` step 3 wants three
   presses of one arrow, so after the first one the player was mid-step with
   nothing lit at all. Doing as you are told should never leave you with less
   information than you had. */
function tutCueTo(id){
  if(id===tutCued)return;
  var els=document.querySelectorAll(".tutlive");
  for(var i=0;i<els.length;i++)els[i].classList.remove("tutlive");
  tutCued=null;
  if(!id)return;
  var el=$(id); if(!el)return;
  tutCued=id;
  el.classList.add("tutlive");
}
/* Read out of the current step, not out of tutCued. Depending on the cached
   value meant anything that cleared the green mid-step also made the dim
   unable to come back for the rest of that step - state quietly disagreeing
   with the predicate, which is the exact failure the coach is built to be
   incapable of. Derived, it re-heals instead. */
function tutEngage(){
  if(tutLock!==null)return;
  var g=tutGuide(); if(!g)return;
  if(g.lock===false||!g.cue)return;
  tutCueTo(g.cue);
  tutLock=g.cue;
  document.body.classList.add("tutlock");
}
function tutRelease(){
  clearTimeout(tutHelpTimer);tutHelpTimer=null;
  if(tutLock===null)return;
  tutLock=null;
  document.body.classList.remove("tutlock");
}
// Everything off: the tutorial is over, or there is no step asking for a control.
function tutUnlock(){ tutRelease(); tutCueTo(null); }

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
  var note=cap===0?"hints used \u00b7 no stars this level"
                  :"hint "+hintsUsed+" \u00b7 max "+cap+" star"+(cap===1?"":"s");
  /* With the bar hidden there is no button to pulse, so the move itself is
     the message and the accounting is a footnote to it. Both used to be one
     run-on line in the toast, which wrapped into "go right - hint 4," /
     "max 1 star" across the level's own hint text. */
  if(say)flashCue(say,note); else flash(note);
}
