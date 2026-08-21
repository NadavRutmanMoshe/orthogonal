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
bind("bResume",function(){
  $("intro").classList.add("gone");
  audio();applyBrightness();
  if(!resumeSession())flash("couldn't restore that");
});
bind("bSkipTo",function(){
  $("intro").classList.add("gone");
  audio();levelPicker();
});
(function(){
  var el=$("bLook");
  function on(e){e.preventDefault();peekTarget=1;el.classList.add("held");}
  function off(){peekTarget=0;el.classList.remove("held");}
  el.addEventListener("pointerdown",on);
  el.addEventListener("pointerup",off);
  el.addEventListener("pointerleave",off);
  el.addEventListener("pointercancel",off);
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
  /* Coming out of a tutorial you were replaying: go back to the level you
     interrupted, not to the start of the campaign. Only on the way *out* -
     moving between tutorial levels is just the next one.

     tutReturn can legitimately be null here even for a player who is well
     into the game: they may have closed the app on a tutorial level and been
     restored straight into one, so there is no "level I came from" recorded
     anywhere. Handing them 01 in that case is the same unhelpful answer by a
     different route, so the fallback is the front of their own progress
     rather than the front of the campaign. A genuinely new player has solved
     nothing, so tutFallback() gives them 01 and the first-run path is
     unchanged. */
  if(L&&L.tutorial&&LEVELS[n]&&!LEVELS[n].tutorial){
    n=(tutReturn!==null)?tutReturn:tutFallback(n);
    tutReturn=null;
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
  if(e.key.toLowerCase()==="shift")peekTarget=0;
});
window.addEventListener("keydown",function(e){
  var k=e.key.toLowerCase();
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
  else if(k==="shift"){peekTarget=1;}
  else if(k==="z"&&app==="edit"){undo();}
  /* Escape is the key everyone already presses. It closes whatever panel is
     open first and only opens the menu from a clear screen, because a key
     that opened the menu unconditionally would be the one thing you cannot
     use to get *out* of the wardrobe - and backing out is what the reflex is
     for. It does nothing behind the intro or the win card: those have their
     own buttons, and dismissing them from the keyboard would skip a level. */
  else if(k==="escape"&&app==="play"){
    if(panelOpen())hidePanel();
    else if($("intro").classList.contains("gone")&&
            !$("won").classList.contains("on"))menuPanel();
    e.preventDefault();
  }
});
