"use strict";
/* Orthogonal — 21-boot.js
   Startup order. This file runs last on purpose.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* The card goes up before anything is built, and the whole of the rest of
   this file runs behind it. It is opaque, it is waiting for a tap, and the
   game gets its first frames rendered and its progress loaded while the
   player is still reading a wordmark - which is the one honest use for a
   splash screen beyond the one it is here for. */
splashShow();

initGL();
applyUI();
playSource="builtin";
enterPlay(LEVELS[0],0,false);
progLoad();
skipLoad();
loadSettings();
loadWardrobe();
loadSession().then(function(){
  var si=sessionIndex();
  if(si>=0){
    var rb=$("bResume");
    rb.style.display="flex";
    rb.textContent="CONTINUE \u00b7 "+LEVELS[si].name.replace(/^\d+ \u2014 /,"");
  }
});
libLoad().then(function(){
  if(library.length) flash(library.length+" saved level"+(library.length===1?"":"s")+" in your library");
});
