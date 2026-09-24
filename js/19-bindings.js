"use strict";
/* I'm Just A Cube - 19-bindings.js
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
/* THE INTRO CARD'S ONE WAY IN, and it is the bands rather than BEGIN.
   Picking one writes the three settings it stands for (applyAgeBand() in
   js/11-sound.js) and then does exactly what BEGIN did, in that order: the
   settings have to be in before the card comes down, because putting the
   control bar up changes how much room the arena is fitted into and the
   opening cutscene is the next thing drawn. */
function introBegin(){
  $("intro").classList.add("gone");
  audio();applyBrightness();     // first gesture unlocks sound
  /* AND THEN THE HOUSE. The opening cutscene sits between the setup card and
     the first tutorial, which is the one place it can go: the card above it
     is the only explanation of the verb a new player gets, so the scene plays
     to somebody who has just read what a fold is - and it plays after they
     have agreed to start, rather than in front of a player who has not yet
     said they want to. */
  if(typeof storyIntroDue==="function"&&storyIntroDue()){
    storyPlay("open");
    return;
  }
}
/* THE SAME CARD IS THE SETTING, on the owner's call. Menu > More > SET UP BY
   AGE used to open a sheet of its own that listed the bands with what each
   one sets written underneath; it now opens THIS card, the one a first run
   sees, because the owner wants to look at the first-run screen without
   throwing a save away to get to it - and because two drawings of one
   question is one drawing too many.

   `setup` is the difference and it is the whole of it: the card is being
   looked at rather than answered, so CANCEL exists and picking a band applies
   and closes rather than starting the game. `diff` is reset on every open, or
   a card closed on the second question would reopen on it. */
var introSetup=false;
function introOpen(setup){
  var el=$("intro");
  if(!el)return;
  introSetup=!!setup;
  el.classList.toggle("setup",!!setup);
  el.classList.remove("diff");
  $("introQ").textContent="How old are you?";
  el.classList.remove("gone");
  if(typeof syncHud==="function")syncHud();
}
function introDone(){
  var el=$("intro");
  if(!el)return;
  if(!introSetup){introBegin();return;}
  el.classList.add("gone");
  el.classList.remove("setup","diff");
  introSetup=false;
  if(typeof syncHud==="function")syncHud();
}
AGE_BANDS.concat(DIFF_BANDS).forEach(function(b){
  bind("bAge_"+b.id,function(){applyAgeBand(b.id);introDone();});
});
/* Not a way out - the other question, in the same place. */
bind("bAgeNo",function(){
  $("intro").classList.add("diff");
  $("introQ").textContent="How hard do you want it?";
});
bind("bAgeCancel",function(){
  introSetup=true;   // whatever brought the card up, CANCEL closes it quietly
  introDone();
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
/* PICK A LEVEL IS OFF THE INTRO CARD, on the owner's call. It was a second
   door on a screen that now asks one question, and a first run has no levels
   to pick from anyway - the map is a tap away the moment the tutorial ends,
   and the home screen (which is what a returning player sees instead of this
   card) is made of doors. */
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
  if(playSource==="library"){
    var s=sortedLibrary();
    libIndex++;
    if(libIndex>=s.length){enterEditor();flash("library complete");return;}
    playLibraryLevel(s[libIndex]);
    return;
  }
  playNextLevel();
});
/* Pulled out of bNext so the out-of-lives SKIP (struggleOffer()) goes where
   NEXT LEVEL goes, by the same path, locked shelf included. */
function playNextLevel(){
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
}

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
  if((e.key||"").toLowerCase()===keyOf("peek"))runAct("unpeek");
});
/* ONE ACTION, WHATEVER ASKED FOR IT. The keyboard and the gamepad both land
   here (js/26-desk.js maps a key or a button to an action), so a rebound key
   and a pad button reach the same four verbs by the same road, and every gate
   on a verb - the tutorial's lock, a fight's hold, a cutscene - holds for
   both without either knowing it is there. */
function runAct(act){
  if(act==="left"||act==="right"||act==="up"||act==="down")press(act);
  else if(act==="fold"){if(app==="play"){flat?doUnflatten():doFlatten();}}
  else if(act==="turnl")rotateView(-1);
  else if(act==="turnr")rotateView(1);
  else if(act==="restart"){if(app==="play")resetLevel();}
  else if(act==="undo"){
    if(app==="play"){undoMove();SFX.undo();}
    else if(app==="edit")undo();
  }
  else if(act==="hint"){if(app==="play")showHint();}
  else if(act==="mute"){muted=!muted;flash(muted?"sound off":"sound on");
    if(typeof ambSync==="function")ambSync();}
  else if(act==="peek")peekSet(true);
  else if(act==="unpeek"){peekLatch=false;peekSet(false);}
}
/* Arrows, WASD, Enter and Space move and press the focus ring on any screen
   that is a stack of buttons (navRoot(), js/26-desk.js). */
var NAV_DIR={arrowup:[0,-1],arrowdown:[0,1],arrowleft:[-1,0],arrowright:[1,0],
             w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};
window.addEventListener("keydown",function(e){
  var k=(e.key||"").toLowerCase();
  // A rebind waiting for its key takes the press before anything else sees it.
  if(keyCaptureTake(e))return;
  // Typing a level's name is typing, not walking.
  var t=e.target, tag=t&&t.tagName;
  if((tag==="INPUT"&&t.type!=="range"||tag==="TEXTAREA"||tag==="SELECT")&&k!=="escape")return;
  if(k==="f11"||(k==="enter"&&e.altKey)){fullToggle();e.preventDefault();return;}
  inputIs("keys");
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
  var act=keyAction(k)||(k==="u"?"undo":null);
  if(typeof storyOn==="function"&&storyOn()){
    if(k==="escape"){storySkip();e.preventDefault();return;}
    if(act==="restart"||act==="undo"||act==="hint"){e.preventDefault();return;}
  }
  // A screen of buttons: the keys move the ring over them instead.
  if(k!=="escape"&&navRoot()){
    if(NAV_DIR[k]){navMove(NAV_DIR[k][0],NAV_DIR[k][1]);e.preventDefault();return;}
    if(k==="enter"||k===" "){navOk();e.preventDefault();return;}
  }
  if(act&&KEY_GAME[act]&&screenUp())return;
  if(act){
    if(act==="peek"&&e.repeat)return;
    runAct(act);
    if(act!=="mute")e.preventDefault();
  }
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

/* ===========================================================================
   THE PHONE'S OWN BACK BUTTON.

   Android has a system back - a gesture from the edge, or a third button on
   older phones - and an app that ignores it is broken in a way no amount of
   on-screen chrome makes up for. Ignored, it does the WebView's default,
   which with no history to pop is "leave the game", mid-level, with no
   warning. That is the single worst thing this button can do and it is what
   it does until something says otherwise.

   backOut() is that something, and it is deliberately not a Capacitor
   function: it is ordinary code that answers "what does backing out mean on
   the screen that is up", so it can be read, called and tested in a browser
   with no wrapper anywhere near it. Only the listener at the bottom is
   native, and it is typeof-guarded into nothing when Capacitor is absent.

   IT IS ESCAPE'S ORDER, because Escape is already this game's back and the
   thinking is written above it: close what is open before opening anything,
   never dismiss a card that is asking for a choice. The two differences are
   both forced by the platform. A phone has no keyboard, so the editor needs
   a rung of its own rather than being left out. And the home screen is the
   root of the app: there IS no further out, so that is where leaving is
   allowed, on the second press.

   RETURNS true IF IT HANDLED THE PRESS. The caller only gets a say when the
   answer is false, which happens on exactly one screen. */
function backOut(){
  /* A cutscene: skip, the same thing Escape does. A settings panel is not
     what the reflex is reaching for mid-scene. */
  if(typeof storyOn==="function"&&storyOn()){
    if(typeof storySkip==="function")storySkip();
    return true;
  }
  /* Whatever is open closes first, or back becomes the one press that cannot
     get you out of the wardrobe. */
  if(panelOpen()){hidePanel();return true;}
  /* A full-bleed card has its own buttons and is asking a question - the
     age bands, the win card's NEXT LEVEL, a tutorial card's OK. Backing out
     of one would skip a level or a lesson, so the press is SWALLOWED rather
     than passed on: doing nothing is correct here, and leaving the game
     would be the alternative. */
  if(!$("intro").classList.contains("gone"))return true;
  if($("won").classList.contains("on"))return true;
  if($("storyend").classList.contains("on"))return true;
  if(typeof tutCardUp==="function"&&tutCardUp())return true;
  /* The editor's own way out, which is a button on its bar rather than a
     panel: the same two calls #eLevels makes. Nothing is lost by leaving -
     every edit has already been written (autosave(), js/14-editor.js) - so
     this needs no confirmation. Called directly and not through the button,
     because tap() binds pointerdown and a synthetic click would miss it. */
  if(app==="edit"){
    if(typeof saveNow==="function")saveNow();
    myLevelsPanel();
    return true;
  }
  /* In a level: the menu, which is where every door out of one is. */
  if(!homeUp()){menuPanel();return true;}
  /* The home screen. Nothing left to back out of, so the caller decides. */
  return false;
}

/* Press back twice to leave, and the second press has two seconds to arrive.
   The convention every Android user already has, and the alternative is a
   dialog nobody reads or an app that quits on a stray edge swipe. Uses the
   game's own toast so it is said where everything else is said. */
var backArmed=false, backArmT=0;
function backExitAsk(){
  if(backArmed){return true;}           // caller may now exit
  backArmed=true;
  flash("press back again to leave");
  clearTimeout(backArmT);
  backArmT=setTimeout(function(){backArmed=false;},2000);
  return false;
}

/* ============================================================
   THE ONE WAY TO REACH A NATIVE PLUGIN

   This is the only native code in the file, and `capPlugin()` is the only
   copy of this lookup in the project: js/24-ads.js and js/25-shop.js both
   call it, and they are loaded after this file for that reason. It costs
   nothing when there is no Capacitor - in a browser it is one property read
   and an early return.

   `Capacitor.Plugins.AdMob` IS THE CALL, and `Capacitor.registerPlugin` is
   NOT - which is the exact opposite of what this paragraph claimed until a
   real phone proved otherwise, and worth every line of the correction,
   because the wrong one fails by doing NOTHING AT ALL.

   WHAT THE WEBVIEW ACTUALLY GETS, injected by the native side before the
   page loads (JSExport.java / JSInjector.java in @capacitor/android, and
   the equivalent on iOS), in this order:

     1. `window.Capacitor = { DEBUG, isLoggingEnabled, Plugins: {} }`
     2. native-bridge.js: getPlatform, isNativePlatform, addListener,
        toNative, nativePromise, isPluginAvailable. NO registerPlugin.
     3. A PROXY PER REGISTERED PLUGIN, generated in Java from each plugin's
        @PluginMethod list and written straight into `Capacitor.Plugins` -
        every method as a promise, with addListener beside them, plus
        `Capacitor.PluginHeaders`.

   So on a device `Plugins` is FULL, and `registerPlugin` does not exist
   there at all: it lives in @capacitor/core's ES module, which these
   classic scripts never load. The old belief was backwards, and the cost
   was three features dead on the phone and nothing said - the back button
   quitting mid-level, every ad paying out silently with no video, and
   every BUY on the DEALS shelf greyed out. The fake bridge in
   tools/storetest.js offered registerPlugin and no Plugins at all, so the
   tests proved the one shape that cannot happen (docs/HISTORY.md).

   registerPlugin is kept as the SECOND choice, for the day this is bundled
   and @capacitor/core has filled Plugins itself. `isPluginAvailable` is
   deliberately not asked: on the real bridge it is
   `hasOwnProperty(Capacitor.Plugins, name)`, which is the question this
   already answers by looking.
   ============================================================ */
function capPlugin(name){
  var C=window.Capacitor;
  if(!C||!C.isNativePlatform||!C.isNativePlatform())return null;
  return (C.Plugins&&C.Plugins[name])||
         (typeof C.registerPlugin==="function"&&C.registerPlugin(name))||null;
}
(function(){
  var App=capPlugin("App");
  if(!App||typeof App.addListener!=="function")return;
  App.addListener("backButton",function(){
    if(backOut())return;
    if(backExitAsk()&&typeof App.exitApp==="function")App.exitApp();
  });
})();
