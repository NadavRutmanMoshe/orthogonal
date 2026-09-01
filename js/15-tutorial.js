"use strict";
/* Orthogonal — 15-tutorial.js
   Control cues, the tutorial coach, the gesture lesson's ghost hand,
   and the hint button.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* Called by every verb, which is what makes a cue something you spend by
   acting on it. That has to take the borrowed hand down as well as the pulse
   - it is the same cue in a different medium, and a demonstration still
   looping after the player has done the thing is a hint that will not stop
   talking. The tutorial's own hand is held rather than borrowed, so it is
   untouched: there the step, not the move, is what ends it. */
function clearCue(){
  var els=document.querySelectorAll(".cue");
  for(var i=0;i<els.length;i++)els[i].classList.remove("cue");
  clearCueGhost();
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
/* Three ways to deliver a cue, in order of how much they say.

   Pulse the button when there is one. When the layout dropped it, *show* the
   gesture instead - the ghost hand from the tutorial, in the middle of the
   screen, which is the same drawing the lesson uses and the same place the
   gesture happens. Only when the control has no gesture either (undo, peek)
   does it fall back to naming the move in words.

   Showing beats naming and that is why it goes first: a swiping finger is
   the instruction, where "go right" is a description of one. The words were
   the whole answer for a HIDDEN layout before the hand existed, and they are
   still the answer for the two controls a finger cannot perform.

   Returns the spoken form when it fell all the way through to words, and
   null otherwise. Callers about to flash a message of their own use that to
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
  if(cueGhost(id))return null;
  var say=cueWord(id);
  if(say)flashCue(say);
  return say;
}
/* ============================================================
   THE GHOST HAND — showing a control instead of pressing one

   A cue is a pulse on a button, and there are two ways there is no button to
   pulse: the layout dropped it (COMPACT has no d-pad, HIDDEN has no bar), or
   the gesture tutorial took the whole bar off on purpose. Both want the same
   answer, so both get it - a hand demonstrating the gesture, in the middle
   of the screen where the gesture actually happens.

   THIS TABLE IS THE SECOND OF TWO FALLBACKS and sits beside CUE_WORDS
   deliberately. When a cue cannot land on a button, the game either *shows*
   the control (here) or *names* it (there), and it prefers showing: a swiping
   finger is the instruction, where "go right" is a description of it. Words
   are what is left for the controls no finger can perform - undo and peek
   have no gesture, so they still fall through to CUE_WORDS.

   The reason this is not a second source of truth is that the cue id already
   is one. tutGuide() returns an id, and the coach, the green, the lock,
   tutPoke and showHint all read it; this table is keyed by exactly those ids,
   so the pulse, the words and the hand cannot disagree by construction.

   THE DIRECTIONS FOR THE TURN ARE NOT ARBITRARY and are easy to get backwards.
   The world follows your fingers, so a slide *left* carries the near edge left
   - which is the direction viewAngle grows - so it commits rotateView(+1),
   which is bRotR. See the sign note in 13-gestures.js. */
var CUE_GEST={
  bRight:{k:"swipe",d:"right"}, bLeft:{k:"swipe",d:"left"},
  bUp:{k:"swipe",d:"up"},       bDown:{k:"swipe",d:"down"},
  bFlat:{k:"dbl"},
  bRotR:{k:"two",d:"left"},     bRotL:{k:"two",d:"right"}
};
/* Gesture mode is a setting and a device default. It governs the *lesson*
   only - which controls the three teaching levels teach - and not whether
   the hand can appear at all: a hint on a HIDDEN layout uses it whatever
   this says, because there the alternative is a pulse on nothing. */
function tutGestures(){
  return settings.tutor==="gesture";
}
function tutGestureLesson(){
  return app==="play" && !!L && !!L.tut && tutGestures();
}
/* How far the finger travels, in pixels, per direction. Horizontal gets more
   room than vertical because the demo box is wider than it is tall - and the
   track is sized to match in the CSS, by the same gx / gy class. */
var GHOST_SPAN={right:[56,0],left:[-56,0],up:[0,-42],down:[0,42]};
/* Restart every loop in the hand from the top.

   Called only when the demonstration actually changes, and it has to be
   called then. A CSS animation does not restart because a class changed -
   it restarts when its `animation-name` changes or when the element goes
   from display:none to displayed - so the parts of the hand were starting
   their loops at different moments and staying that way:

   - The pair fell out of step. `.gfinger.b` is display:none until g-two, so
     it starts its loop the instant that class arrives, while `.gfinger.a`
     has been looping since whatever step came before under the same
     `gswipe` name. Measured at nearly three seconds apart - one finger
     arriving as the other left, in the drawing whose entire job is to say
     "two fingers, together".
   - A swipe that changed direction jumped. Only --hx/--ty changed, so the
     dot teleported to a new point on a loop it was already halfway through.

   The two-step is what makes it work: assigning `animation:none` and reading
   a layout property flushes it, so clearing it a moment later is a genuine
   second start rather than a no-op the style system folds away. One flush
   for all of them, so they restart on the same frame. */
function ghostRestart(el){
  // The hand is in this list because it has a loop of its own on the double
  // tap, and a hand lifting off a beat the dot is not on is the drift this
  // function exists to stop.
  var parts=el.querySelectorAll(".gfinger,.gdot,.gtap,.ghand"),i;
  for(i=0;i<parts.length;i++)parts[i].style.animation="none";
  void el.offsetWidth;
  for(i=0;i<parts.length;i++)parts[i].style.animation="";
}
/* ONE HAND, TWO OWNERS, and neither may take down the other's.

   The tutorial *holds* it up for as long as a step lasts. A hint *borrows*
   it for a few seconds, on a layout where the button it would have pulsed is
   not on screen. Those overlap in one direction that matters: `tutSync` runs
   on every `syncHud`, and on an ordinary level it ends at `tutUnlock()`, so
   a hint's hand would be cleared by the very next redraw - which `showHint`
   causes itself, two lines after asking for it.

   So clearing states which owner is doing it, and a mismatch is refused. The
   owner lives in the element's own class rather than in a variable beside
   it, so it cannot end up disagreeing with what is on screen; `held` is the
   tutorial's, `once` is a hint's, and both are gone the moment the hand is.

   Writes a class string and four offsets, and nothing else. It compares the
   class against the one already there because tutSync re-asserts on every
   evaluation, and a step that wants three presses of one control must not
   have its demonstration restarted on each of them. Returns whether a hand
   is now up, which is what lets `cue()` decide between showing the move and
   naming it. */
var GHOST_MS=3800;              // two whole loops: a hint ends on a beat
var ghostTimer=null;
function ghostTo(id,held){
  var el=$("ghost"); if(!el)return false;
  var g=id?CUE_GEST[id]:null;
  var mine=el.className.indexOf(held?"held":"once")>=0;
  if(!g){
    if(el.className==="ghost")return false;      // nothing up to take down
    if(!mine)return false;                       // not ours to take down
    clearTimeout(ghostTimer);ghostTimer=null;
    el.className="ghost";
    return false;
  }
  var cls="ghost on "+(held?"held":"once")+" g-"+g.k;
  if(g.k==="swipe"||g.k==="two"){
    var sp=GHOST_SPAN[g.d];
    cls+=(sp[0]?" gx":" gy")+" d-"+g.d;
    el.style.setProperty("--hx",(-sp[0]/2)+"px");
    el.style.setProperty("--hy",(-sp[1]/2)+"px");
    el.style.setProperty("--tx",( sp[0]/2)+"px");
    el.style.setProperty("--ty",( sp[1]/2)+"px");
  }
  if(el.className!==cls){el.className=cls;ghostRestart(el);}
  return true;
}
// The tutorial's. The gesture-lesson test lives here rather than inside
// ghostTo, because a hint is not a lesson and must not be gated on one.
function tutGhost(id){ ghostTo(tutGestureLesson()?id:null,true); }
/* A hint's. Times itself out, and the timeout clears only its own - if the
   player has walked into a tutorial in the meantime, the refusal above is
   what stops it taking the lesson's hand away. */
function cueGhost(id){
  if(!ghostTo(id,false))return false;
  clearTimeout(ghostTimer);
  ghostTimer=setTimeout(function(){ghostTo(null,false);},GHOST_MS);
  return true;
}
function clearCueGhost(){ ghostTo(null,false); }
// Is a *borrowed* hand up right now - a hint's, not the tutorial's? Read off
// the element for the same reason ownership lives there: one answer, and it
// cannot disagree with what is on screen.
function ghostBorrowed(){
  var el=$("ghost");
  return !!el&&el.className.indexOf("once")>=0;
}

/* THE PROSE SAYS WHAT THE CONTROL SAYS, and now there are two sets of
   controls it could mean.

   This is the same rule that already applied to the fold's name: the lesson
   used to say "collapse the world" while the button in front of the player
   read GO 2D, and {to2} exists so that can never happen again. A gesture
   tutorial that says "press the right arrow" while showing a swiping finger
   is exactly that bug with a different subject, so the arrow steps get the
   same treatment - {do:right} is an imperative and {it:right} is a name, and
   both are resolved against the mode at the moment the line is shown.

   Level data cannot call these itself: 02-levels.js loads long before this
   file, so the tokens have to survive as text until tutWords() runs. */
var TUT_SAY={
  buttons:{
    "do:right":"Press <b>&#9654;</b>", "it:right":"<b>&#9654;</b>",
    "do:left" :"Press <b>&#9664;</b>", "it:left" :"<b>&#9664;</b>",
    "do:up"   :"Press <b>&#9650;</b>", "it:up"   :"<b>&#9650;</b>",
    "do:down" :"Press <b>&#9660;</b>", "it:down" :"<b>&#9660;</b>",
    "do:2d"   :"Press <b>{to2}</b>",   "do:3d"   :"Press <b>{to3}</b>",
    "do:turnr":"Press <b>&#8631;</b>", "do:turnl":"Press <b>&#8630;</b>"
  },
  gesture:{
    "do:right":"<b>Swipe right</b>",   "it:right":"<b>swiping right</b>",
    "do:left" :"<b>Swipe left</b>",    "it:left" :"<b>swiping left</b>",
    "do:up"   :"<b>Swipe up</b>",      "it:up"   :"<b>swiping up</b>",
    "do:down" :"<b>Swipe down</b>",    "it:down" :"<b>swiping down</b>",
    "do:2d"   :"<b>Double-tap</b> the world",
    "do:3d"   :"<b>Double-tap</b> again",
    "do:turnr":"<b>Swipe two fingers left</b>",
    "do:turnl":"<b>Swipe two fingers right</b>"
  }
};

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
  // Controls first, verb names second: a control phrase can itself contain
  // {to2}, which the second pass then resolves. One pass in the other order
  // would leave those braces on screen.
  var tbl=TUT_SAY[tutGestures()?"gesture":"buttons"];
  s=s.replace(/\{((?:do|it):[a-z0-9]+)\}/g,function(m,k){
    return tbl[k]!==undefined?tbl[k]:m;
  });
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

/* Which controls the tutorial is refusing right now.

   Normally this is the guided lock and nothing else: it arms on hesitation,
   so a player who is following along is never gated at all.

   A STEP MAY ASK TO BE FORCED FROM THE FIRST FRAME (`hold:true`), and one
   level needs it. `00 - First Landing` is an experiment - fold here, then
   fold again from the other side, and watch the same verb answer
   differently - and an experiment only proves anything if both halves
   actually happen in that order. A player who wanders off does not get a
   wrong answer, they get no answer, on the rule that has cost more
   playtesters more lives than anything else in the game.

   The gate and the dim are deliberately still two things. `hold` refuses the
   other three verbs immediately; the dark overlay still waits for hesitation,
   because a permanent dim does not read as "here is the button", it reads as
   "the game is dark" - which is the finding the guided lock was rebuilt
   around and is not worth losing. What a blocked press does instead is bring
   the dim up at once: a press that does nothing is the one moment a player is
   owed an explanation, and that is exactly what the dim says. */
function tutBlocks(id){
  if(app!=="play")return false;
  /* NOT IN GESTURE MODE. The dim and the gate are one mechanism - the dim is
     what explains the gate - and neither is needed once the lesson is a hand
     in the middle of the screen: it is unmissable where a green button on a
     strip at the bottom was not. Blocking without the dim would be worse
     than either, because a swipe that silently does nothing is the exact
     thing the dim exists to explain. So both go together, and the button
     lesson keeps both. */
  if(tutGestureLesson())return false;
  if(tutLock!==null)return tutLock!==id;
  var g=tutGuide();
  if(!g||!g.hold||!g.cue||id===g.cue)return false;
  tutEngage();                 // say why, rather than swallowing the press
  return true;
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
  return app==="play" && !dying && !panelOpen() && !screenUp() &&
         !$("won").classList.contains("on");
}
/* The wait is a poll that only counts time the player could have used.

   A plain one-shot timer keeps its own cadence, so the first one ran out
   behind the intro card and the guide was up within a few hundred
   milliseconds of BEGIN - the same bug it exists to fix, one screen earlier.
   Counting ticks instead means a wait spent reading the intro, or the menu,
   or watching a death animation is not hesitation and does not accrue. */
var TUT_TICK=120;
/* A LEVEL MAY ASK FOR A LONGER FUSE. `L.tutWait` overrides the first wait,
   because how long "stuck" takes depends on what the step is asking for: a
   player who has been told which arrow to press is stuck after a second, and
   a player who has just been handed a rule and two blocks to check it against
   is still thinking after four. Only the FIRST wait is overridden - once they
   have used the right control on a step, TUT_AGAIN_MS is already the long
   one. */
function tutArm(ms){
  clearTimeout(tutHelpTimer);
  tutHelpTimer=null;
  tutIdle=0;
  tutWait=ms||(L&&L.tutWait)||TUT_HELP_MS;
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
/* The off-script lines go through the same tokens as the lesson's own prose,
   for the same reason: this is the sentence a player sees precisely when they
   have stopped following along, so it is the last one that can afford to name
   a control that is not on their screen. */
var TUT_MOVE_SAY={
  "FLAT":"{do:2d}.",
  "POP":"{do:3d} to stand back up.",
  "rot+":"{do:turnr}.",
  "rot-":"{do:turnl}.",
  "\u2192":"{do:right}.",
  "\u2190":"{do:left}.",
  "\u2191":"{do:up}.",
  "\u2193":"{do:down}."};
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
    var extra={card:step.card||null,show:step.show||null,hold:!!step.hold};
    /* A STEP THAT ASKS FOR A FREE ACTION IS NEVER OFF-SCRIPT. The override
       below exists because a player who wanders away from the lesson should
       be told the next MOVE rather than the next line - and it works because
       every step so far has asked for a move the solver also wants. Peek is
       not a move: it costs nothing, changes nothing, and the solver has no
       opinion about it, so it would be overridden on every single frame and
       the step could never be shown at all. `free:true` says the step stands
       on its own. */
    if(step.free||!btn||btn===step.cue)
      return {idx:i,say:"<i>"+(i+1)+" / "+L.tut.length+"</i>"+step.say,
              cue:step.cue,lock:step.lock,
              card:extra.card,show:extra.show,hold:extra.hold};
    /* Off-script: the solver speaks, so the card and the forced gate go with
       the line they belonged to. A card explains the move the step was about
       to ask for, and holding the player to a control the solver has just
       overruled would gate them out of their own recovery. */
    return {idx:i,say:"<i>"+(i+1)+" / "+L.tut.length+"</i>"+
            (TUT_MOVE_SAY[mv]||step.say),cue:btn,lock:step.lock,
            card:null,show:extra.show,hold:false};
  }
  if(!btn)return null;                       // finished, or nothing to suggest
  return {idx:-1,say:TUT_MOVE_SAY[mv],cue:btn,lock:undefined,
          card:null,show:null,hold:false};
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
  /* The card first, and the coach reads its answer. They are two ways of
     saying one thing and only one of them may be on screen: while a card is
     up it IS the coach, full-bleed and holding the player still, and a second
     copy of the lesson behind it at the foot of the screen is noise. */
  var carded=tutCardSync(g);
  tutMark=!!(g&&g.show==="landing");
  if(!g){el.classList.remove("on");tutShown=-2;tutUnlock();return;}
  if(carded){el.classList.remove("on");tutShown=g.idx;tutUnlock();return;}
  el.innerHTML=tutWords(g.say);
  el.classList.add("on");
  // Re-asserted every time rather than only on a change: tutCueTo is a no-op
  // when it already matches, and asserting it here is what keeps the green on
  // the button a function of the step rather than a thing someone has to
  // remember to restore.
  tutCueTo(g.cue||null);
  /* The ghost hand is the gesture lesson's green button, so it is asserted
     from the same place and out of the same value. tutGhost is a no-op in
     button mode and idempotent when the demonstration has not changed. */
  tutGhost(g.cue||null);
  // Only re-pulse when the step actually changes, or the cue timer would be
  // reset on every render and the button would strobe forever. A new step
  // also drops the guide and starts its wait again from nothing.
  if(g.idx!==tutShown){
    tutShown=g.idx;
    /* No pulse in gesture mode. cue() falls back to speaking the move in a
       toast when the button it names is not on screen - which in a gesture
       tutorial it never is - so every step would open by announcing itself in
       words directly over a coach line and a hand that are both already
       saying it. The hand *is* the cue there. */
    if(g.cue&&!tutGestureLesson())cue(g.cue);
    tutRelease();
    tutArm();
  }
}
/* ============================================================
   THE EXPLANATION CARD
   ============================================================
   Everything else in the tutorial cues a control and lets the player find out
   what it did, which is the right way round for a verb: pressing it is the
   explanation. One rule cannot be taught that way. "You come back on the
   block at the front" is a statement about two blocks that are at the SAME
   screen position the instant you fold - that is what folding means - so
   there is nothing to look at while it happens and no press that reveals it.

   So it is said. Once, in words, before the move that demonstrates it, on a
   card the player has to acknowledge; and then again from the other side,
   where the identical sentence has the opposite answer. Being a full-bleed
   screen is the point rather than a cost: it stops the clock (see
   screenUp(), which tutPlayable() and both real-time frames already ask), it
   holds the player still, and it cannot be walked past by accident.

   A CARD MAY WAIT A BEAT BEFORE IT ARRIVES (`card.wait`), and the second one
   in `00 - First Landing` does. That step opens the instant a half turn
   completes, and the turn itself takes about 450ms to settle - so the card
   was landing on a world that was still moving, over a change the player had
   not had a moment to look at. The card is the sentence ABOUT that change,
   and a sentence about something you have not seen yet is one you have to
   hold in your head. So the coach goes quiet, the world finishes turning, the
   player gets a beat with the new view, and then it speaks.

   The wait is wall time and not playable-idle like the guided lock's: this is
   a beat in a sequence the game is running, not a measurement of whether the
   player has stalled. It re-enters through syncHud rather than drawing
   itself, so there is still exactly one place that decides what is on screen.

   Returns whether a card owns the screen, because the coach needs to know -
   and it owns it during the wait too, so the beat is genuinely quiet rather
   than a step's own line flashing up for a second first. */
var tutCardTimer=null, tutCardArm=0;
/* WHO PUT THE CARD UP, kept in one place because two things now can.

   A tutorial step raises one and is satisfied by it being acknowledged; a
   trial or a boss raises one on the way in and simply wants it read. They are
   the same object on screen and the same answer to screenUp(), so they share
   everything except what OK means - and that has to be decided by whoever
   raised it rather than guessed from the level, or a card put up over a
   tutorial by something else would advance a step nobody completed. */
var cardOwner=null;
var cardShown=null;
function cardPut(h,p,owner){
  var el=$("tutcard"); if(!el)return;
  cardShown=h;
  $("tutcardH").textContent=h||"";
  // tutWords, so a card names the verb the way the button in front of the
  // player names it - the same reason the coach's own prose goes through it.
  $("tutcardP").innerHTML=tutWords(p||"");
  cardOwner=owner;
  el.classList.add("on");document.body.classList.add("carded");
}
function cardClear(){
  var el=$("tutcard"); if(!el)return;
  cardOwner=null;cardShown=null;
  if(!el.classList.contains("on"))return;
  el.classList.remove("on");document.body.classList.remove("carded");
}
function tutCardSync(g){
  var el=$("tutcard"); if(!el)return false;
  var card=(g&&!dying)?g.card:null;
  if(!card){
    tutCardArm=0;
    if(tutCardTimer){clearTimeout(tutCardTimer);tutCardTimer=null;}
    // A brief is not ours to take down - it is on a level with no steps at
    // all, so this runs with g null and would clear it on the next redraw.
    if(cardOwner==="tut")cardClear();
    return false;
  }
  /* TWO CARDS IN A ROW REPAINT, and the first version did not. The card was
     only written when it was being raised from nothing, which was fine while
     every card had a normal step between it and the next one - the card came
     down in between and went back up with new text. `00 — First Landing`
     now opens with two of them back to back, so the second never brought the
     element down and the player acknowledged card one twice. */
  if(!el.classList.contains("on")||cardShown!==card.h){
    if(card.wait&&!el.classList.contains("on")){
      if(!tutCardArm)tutCardArm=Date.now();
      var left=card.wait-(Date.now()-tutCardArm);
      if(left>0){
        if(!tutCardTimer)tutCardTimer=setTimeout(function(){
          tutCardTimer=null;syncHud();
        },left+20);
        return true;                 // ours, but silent: watch the world
      }
    }
    cardPut(card.h,card.p,"tut");
  }
  return true;
}
/* THE BRIEF IS GONE, and it is one function if it is ever wanted back.

   A trial and a boss each opened with a card explaining themselves, twice per
   kind and then never again. It worked and it is not needed: the falling
   blocks, the folding telegraph and the replay say all of it on the board,
   and each level's own hint now carries the one sentence that is left -
   "three lives, three places to visit", "a game of catch: whoever shifts the
   other into their own square first wins". A card that explains what the
   picture already says is a card the player reads once and then dismisses
   unread, which is worse than none.

   Restoring it is a `cardPut(h,p,"brief")` from loadLevel and a counter in
   settings, exactly as it was; `cardOwner` below is the seam it needs and is
   deliberately still here.

   The tutorial's own cards are untouched - that rule cannot be shown, which
   is the whole reason they exist. */
/* The card is a screen, so it has to answer screenUp() - which is what keeps
   the keyboard, the boss clock and the trial clock from running behind it. */
function tutCardUp(){
  var el=$("tutcard");
  return !!el&&el.classList.contains("on");
}
/* OK. The step is a predicate over a counter like every other one, so this
   does not advance anything - it records that the card was read and lets
   tutStep() work out the rest. */
function tutCardOk(){
  if(!tutCardUp())return;
  SFX.hint();                 // the same small "noted" tone a hint lands on
  if(cardOwner==="brief"){
    /* A brief is read and gone. Nothing was completed, so nothing advances -
       and it is taken down here rather than by the next redraw, because on a
       trial or a boss there is no coach running to take it down at all. */
    cardClear();syncHud();return;
  }
  if(!tutC)return;
  tutC.card=(tutC.card||0)+1;
  syncHud();
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
  if(tutGestureLesson())return;      // see tutBlocks: the hand is the guide
  var g=tutGuide(); if(!g)return;
  if(g.lock===false||!g.cue)return;
  tutCueTo(g.cue);
  tutLock=g.cue;
  document.body.classList.add("tutlock");
  /* And a lighter dim where the level asks for one. The overlay's job is
     "this is the only control I accept"; on a level whose subject is a rule
     rather than a button, the same darkness reads as the game switching off
     while the player is still looking at the thing they were told to look
     at. */
  document.body.classList.toggle("tutsoft",!!(L&&L.tutSoft));
}
function tutRelease(){
  clearTimeout(tutHelpTimer);tutHelpTimer=null;
  if(tutLock===null)return;
  tutLock=null;
  document.body.classList.remove("tutlock");
  document.body.classList.remove("tutsoft");
}
// Everything off: the tutorial is over, or there is no step asking for a control.
function tutUnlock(){ tutRelease(); tutCueTo(null); tutGhost(null); }

function showHint(){
  if(app!=="play"||dying||levelOver())return;
  if(L&&L.tut){
    var ti=tutStep();
    if(ti>=0){
      if(tutGestureLesson()){flash("follow the line and the hand");return;}
      if(L.tut[ti].cue)cue(L.tut[ti].cue);
      flash("follow the line above the bar");return;
    }
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
  /* The one the game asked for is on the game. See hintOffer(): the card
     that explains the bulb tells the player to press it, and charging a star
     for doing as you are told is the trap that whole card exists to avoid. */
  var free=freeHint;
  if(free)freeHint=false; else hintsUsed++;
  SFX.hint();
  syncHud();
  var cap=hintCap();
  var note=free?"free \u00b7 this one is on us"
          :cap===0?"hints used \u00b7 no stars this level"
                  :"hint "+hintsUsed+" \u00b7 max "+cap+" star"+(cap===1?"":"s");
  /* With the bar hidden there is no button to pulse, so the move itself is
     the message and the accounting is a footnote to it. Both used to be one
     run-on line in the toast, which wrapped into "go right - hint 4," /
     "max 1 star" across the level's own hint text. */
  /* Three deliveries, three homes for the footnote. Spoken: the words and
     the accounting together, in the cue slot. Shown: the hand has the move,
     so the accounting goes into that same slot alone rather than to the top
     of the screen, where it would land across the level's own hint text -
     the exact collision the slot exists to avoid. Pulsed: the bar is on
     screen and the toast's ordinary place is fine. */
  if(say)flashCue(say,note);
  else if(ghostBorrowed())flashCue(null,note);
  else flash(note);
}
