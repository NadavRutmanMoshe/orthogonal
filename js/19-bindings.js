"use strict";
/* I'm Just A Cube — 19-bindings.js
   Every button and key binding.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

bind("bLeft",function(){press("left");});
bind("bRight",function(){press("right");});
bind("bUp",function(){press("up");});
bind("bDown",function(){press("down");});
bind("bRotL",function(){rotateView(-1);});
bind("bRotR",function(){rotateView(1);});
bind("bFlat",function(){flat?doUnflatten():doFlatten();});
bind("bMenu",toggleMenu);
bind("bWard",toggleWardrobe);
bind("bHint",showHint);
bind("bRestart",function(){
  if(fromEditor){enterEditor();return;}
  hidePanel();resetLevel();SFX.undo();
});
bind("bBegin",function(){
  $("intro").classList.add("gone");
  audio();applyBrightness();     // first gesture unlocks sound
  /* AND THEN THE HOUSE. The opening cutscene sits between BEGIN and the
     first tutorial, which is the one place it can go: the card above it is
     the only explanation of the verb a new player gets, so the scene plays
     to somebody who has just read what a fold is - and it plays after they
     have agreed to start, rather than in front of a player who has not yet
     said they want to. */
  if(typeof storyIntroDue==="function"&&storyIntroDue()){
    storyPlay("open");
    return;
  }
});
/* The cutscenes' two buttons. SKIP is live for the whole of a scene; the end
   card's is the only way off it. */
bind("storySkip",function(){if(typeof storySkip==="function")storySkip();});
bind("bStoryEnd",function(){if(typeof storyEndOk==="function")storyEndOk();});
/* The explanation card's one way out. Nothing else on the card is live, and
   nothing behind it is: it answers screenUp(), so the four verbs, both
   clocks and the game keys are all held off while it is being read. */
bind("bTutOk",tutCardOk);
bind("hContinue",homeGo);
bind("hLevels",function(){audio();sectionPicker();});
bind("hWard",function(){audio();wardrobePanel("shape");});
bind("hMine",function(){audio();myLevelsPanel();});
/* Shut, and it says so rather than doing nothing. A toast is what this game
   says a one-line aside with, and it is the only chrome that survives
   `body.athome` - the HUD, the bar and the star total are all taken down
   there, and the toast is not. */
bind("hMulti",function(){audio();flash("multiplayer \u00b7 coming soon");});
/* THE FILM'S OWN WAY OUT. Through tap() like every other control, which is
   what gives it preventDefault and stopPropagation - the press that skips
   must not also reach the board underneath, where a double tap is the fold.
   The catcher only accepts presses while `body.replaying` is set (see .rskip
   in css/65-replay.css), so this can never fire outside a film. */
bind("repSkip",function(){replaySkip();});
bind("hMenu",function(){audio();menuPanel();});
bind("bSkipTo",function(){
  $("intro").classList.add("gone");
  audio();sectionPicker();
});
/* PEEK: HOLD IT, OR TAP TO LATCH IT.

   It was hold-only, which on a phone means keeping a thumb on a corner
   button while reading the middle of the screen - your hand covers part of
   the board, and it is not what an older player reaches for. A quick TAP now
   latches it on; holding still works exactly as it did, and a second tap
   turns it off.

   The latch drops itself after PEEK_LATCH_MS and on the next thing the
   player does, so it can never be left switched on by accident - which is
   what made hold-only defensible in the first place. */
var PEEK_LATCH_MS=4200, peekLatch=false, peekLatchTimer=null, peekDownAt=0;
function peekSet(on){
  peekTarget=on?1:0;
  var el=document.getElementById("bLook");
  if(el)el.classList.toggle("held",!!on);
}
function peekUnlatch(){
  if(!peekLatch)return;
  peekLatch=false;clearTimeout(peekLatchTimer);peekLatchTimer=null;peekSet(false);
}
(function(){
  var el=$("bLook");
  el.addEventListener("pointerdown",function(e){
    e.preventDefault();
    if(peekLatch){peekUnlatch();peekDownAt=0;return;}   // a tap while latched turns it off
    peekDownAt=Date.now();peekSet(true);
  });
  function up(){
    if(!peekDownAt)return;
    var quick=Date.now()-peekDownAt<260;
    peekDownAt=0;
    if(quick){
      peekLatch=true;peekSet(true);
      clearTimeout(peekLatchTimer);
      peekLatchTimer=setTimeout(peekUnlatch,PEEK_LATCH_MS);
    } else peekSet(false);
  }
  el.addEventListener("pointerup",up);
  el.addEventListener("pointerleave",function(){if(peekDownAt)up();});
  el.addEventListener("pointercancel",function(){peekDownAt=0;peekUnlatch();peekSet(false);});
  el.addEventListener("click",function(e){e.preventDefault();});
})();
bind("bRetry",function(){
  $("won").classList.remove("on");
  resetLevel();
});
bind("bLevels",function(){
  $("won").classList.remove("on");
  sectionPicker();
});
bind("bNext",function(){
  if(fromEditor){enterEditor();return;}
  /* THE LAST FIGHT DOES NOT HAVE A NEXT LEVEL, IT HAS AN ENDING. Beating
     BOSS IV for the first time re-labels this button FIND THEM in win() and
     re-routes it here; both halves read storyEndDue(), so they cannot
     disagree about which the player is looking at. Afterwards it is an
     ordinary NEXT LEVEL again. */
  if(typeof storyEndDue==="function"&&storyEndDue()){storyPlay("end");return;}
  if(playSource==="library"){
    var s=sortedLibrary();
    libIndex++;
    if(libIndex>=s.length){enterEditor();flash("library complete");return;}
    playLibraryLevel(s[libIndex]);
    return;
  }
  var n=lvIndex>=LEVELS.length-1?0:lvIndex+1;
  /* NEXT LEVEL is the next level, with no exceptions - including out of the
     tutorial, where it is 01.

     Two cleverer versions were tried and both were wrong for the same reason.
     Returning you to the level you interrupted, and failing that to your
     first unsolved one, each meant the button did something other than what
     it says, and which one you got depended on invisible state. A player who
     wants to be somewhere else has the map, which is explicit about where it
     is sending them; a button labelled NEXT LEVEL has one honest meaning. */
  /* ONE EXCEPTION, AND IT IS NOT A CLEVER ONE: the next level can be behind
     a lock. Everywhere else in the campaign it cannot - you have just solved
     the level in front of it, so the rolling window is already two past
     here - but V · EXTRA is gated on the bosses rather than on the window,
     and BOSS IV is the level immediately before it. Beat that fight with a
     boss still standing and this button walked straight through the shelf's
     lock into a section the map was still refusing to open: the level you
     were handed was playable, and the one after it was not, which is exactly
     what "progression stopped there" looked like from the outside.

     So it opens the map on that section instead, where the lock now says
     which fight is holding it. The button's meaning is intact - it is still
     going to the next level, and saying why it cannot. */
  if(typeof mapLocked==="function"&&mapLocked(n)){
    $("won").classList.remove("on");
    levelPicker(mapSecOf(n));
    var say=typeof bossesLeftSay==="function"?bossesLeftSay():"";
    flash(say?SECTIONS[mapSecOf(n)].name+" needs "+say:"not open yet");
    return;
  }
  playSource="builtin";
  enterPlay(LEVELS[n],n,false);
});

bind("cL",function(){pushMove("←");});
bind("cR",function(){pushMove("→");});
bind("cU",function(){pushMove("↑");});
bind("cD",function(){pushMove("↓");});
bind("cRotL",function(){pushMove("rot-");});
bind("cRotR",function(){pushMove("rot+");});
bind("cFlat",function(){pushMove("FLAT");});
bind("cPop",function(){pushMove("POP");});
/* THE EDITOR'S TOP ROW IS THE LEVEL'S OWN ROW, and it is one button wide:
   the way back to the list of your levels. It used to be a way back into
   the campaign (which the home screen already is, and which threw away
   whatever was on the board) beside a LIBRARY button that was the only way
   to save at all - and that save refused anything the solver could not
   finish. Keeping the level is not a button at all any more: every edit
   writes it (autosave(), js/14-editor.js). */
bind("eLevels",function(){saveNow();myLevelsPanel();});

bind("cDel",popMove);
bind("cBuild",buildComposed);
bind("cExit",function(){enterEditor();});

bind("tAdd",function(){setTool("add");syncHud();});
bind("tGlass",function(){setTool("glass");syncHud();});
bind("tAnchor",function(){setTool("anchor");syncHud();});
bind("tCrate",function(){setTool("crate");syncHud();});
bind("tKey",function(){setTool("key");syncHud();});
bind("tSpike",function(){setTool("spike");syncHud();});
bind("tErase",function(){setTool("erase");syncHud();});
bind("tStart",function(){setTool("start");syncHud();});
bind("tGoal",function(){setTool("goal");syncHud();});
bind("eRotL",function(){rotateView(-1);});
bind("eRotR",function(){rotateView(1);});
bind("eUndo",function(){undo();});
bind("eVerify",runVerify);
bind("eFile",ioPanel);
bind("eTest",function(){
  var bad=validate();
  if(bad){showPanel("<h3>CAN'T TEST</h3><span class='bad'>"+bad+"</span>");return;}
  saveNow();
  playSource="test";
  enterPlay(custom,undefined,true);
});
/* THE TAB CLOSING, OR THE PHONE GOING IN A POCKET. pagehide fires on both,
   including the bfcache path Safari takes where unload does not; the write
   underneath is a synchronous localStorage set (js/00-storage.js), so it
   lands. Without it the last tap before backgrounding sits in a timer that
   never gets its turn. */
window.addEventListener("pagehide",function(){
  if(typeof saveNow==="function")saveNow();
});

window.addEventListener("keyup",function(e){
  if(e.key.toLowerCase()==="shift"){peekLatch=false;peekSet(false);}
});
/* The keys that drive the game, as a set, so one test can hold them all off
   while a full-bleed screen is up. Everything not in here stays live behind
   the intro card and the home screen - mute, and Escape, which is a way out
   rather than a move. */
var GAME_KEYS={arrowleft:1,arrowright:1,arrowup:1,arrowdown:1,a:1,d:1,w:1,s:1,
               " ":1,q:1,e:1,r:1,u:1,z:1,h:1,shift:1};
window.addEventListener("keydown",function(e){
  var k=e.key.toLowerCase();
  /* An overlay swallows taps by being there; a keyboard does not care what
     is on top. Without this the arrow keys walked the player around a level
     nobody could see, behind the title screen. */
  /* The tutorial's card is dismissed before that test, not after: space is a
     game key, so the guard below would swallow it - and space is the key a
     hand already resting on the keyboard is on. It cannot fold the world from
     here in any case, because the card is itself part of screenUp(). */
  if((k==="enter"||k===" ")&&tutCardUp()){tutCardOk();e.preventDefault();return;}
  /* A CUTSCENE IS NOT A LEVEL, and three of the game keys act on the board
     rather than through the four verbs - so storyHolds() never sees them.
     Restart would put the son back in the house mid-scene, hint would ask
     the solver about a lawn, undo has nothing to undo. Escape is the way
     out, which here means SKIP: it is the key the reflex reaches for, and a
     settings panel over a cutscene is not what it is reaching for. */
  if(typeof storyOn==="function"&&storyOn()){
    if(k==="escape"){storySkip();e.preventDefault();return;}
    if(k==="r"||k==="u"||k==="z"||k==="h"){e.preventDefault();return;}
  }
  if(GAME_KEYS[k]&&screenUp())return;
  if(k==="arrowleft"||k==="a"){press("left");e.preventDefault();}
  else if(k==="arrowright"||k==="d"){press("right");e.preventDefault();}
  else if(k==="arrowup"||k==="w"){press("up");e.preventDefault();}
  else if(k==="arrowdown"||k==="s"){press("down");e.preventDefault();}
  else if(k===" "&&app==="play"){flat?doUnflatten():doFlatten();e.preventDefault();}
  else if(k==="q"){rotateView(-1);}
  else if(k==="e"){rotateView(1);}
  else if(k==="r"&&app==="play"){resetLevel();}
  else if((k==="u"||(k==="z"&&app==="play"))&&app==="play"){undoMove();SFX.undo();}
  else if(k==="h"&&app==="play"){showHint();}
  else if(k==="m"){muted=!muted;flash(muted?"sound off":"sound on");
    if(typeof ambSync==="function")ambSync();}
  else if(k==="shift"){peekSet(true);}
  else if(k==="z"&&app==="edit"){undo();}
  /* Escape is the key everyone already presses. It closes whatever panel is
     open first and only opens the menu from a clear screen, because a key
     that opened the menu unconditionally would be the one thing you cannot
     use to get *out* of the wardrobe - and backing out is what the reflex is
     for. It does nothing behind the intro or the win card: those have their
     own buttons, and dismissing them from the keyboard would skip a level. */
  else if(k==="escape"&&app==="play"){
    if(panelOpen())hidePanel();
    // Live on the home screen too: settings are one of the things it is for.
    else if(!$("intro").classList.contains("gone")){}
    else if(!$("won").classList.contains("on"))menuPanel();
    e.preventDefault();
  }
});
