"use strict";
/* Orthogonal — 19-bindings.js
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
});
bind("hContinue",homeGo);
bind("hLevels",function(){audio();levelPicker();});
bind("hWard",function(){audio();wardrobePanel("shape");});
bind("hMenu",function(){audio();menuPanel();});
bind("bSkipTo",function(){
  $("intro").classList.add("gone");
  audio();levelPicker();
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
  levelPicker();
});
bind("bNext",function(){
  if(fromEditor){enterEditor();return;}
  if(playSource==="library"){
    var s=sortedLibrary();
    libIndex++;
    if(libIndex>=s.length){enterEditor();flash("library complete");return;}
    var lv=s[libIndex];
    enterPlay({name:lv.name,hint:tierOf(lv.score)+" \u00b7 "+lv.moves+" moves",
      blocks:lv.blocks,keys:lv.keys||[],start:lv.start,goal:lv.goal,rotate:lv.rotate},undefined,false);
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
bind("eLevels",function(){
  playSource="builtin";
  enterPlay(LEVELS[lvIndex],lvIndex,false);
});
bind("eLib",libraryPanel);

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
bind("eFile",libraryPanel);
bind("eTest",function(){
  var bad=validate();
  if(bad){showPanel("<h3>CAN'T TEST</h3><span class='bad'>"+bad+"</span>");return;}
  playSource="test";
  enterPlay(custom,undefined,true);
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
  else if(k==="m"){muted=!muted;flash(muted?"sound off":"sound on");}
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
