"use strict";
/* Orthogonal — 20-boot.js
   Startup order. This file runs last on purpose.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

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
