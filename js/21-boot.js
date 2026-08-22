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

/* WHICH FIRST SCREEN, and it cannot be decided until the saves are in.

   A returning player gets the home screen; a genuine first run gets the
   intro card, because that card says in one sentence what the game is and
   BEGIN goes straight into the tutorial - a title screen offering CONTINUE
   and a shop to somebody who has never seen a cube is the wrong first
   impression, and there would be nothing to continue.

   All five loads are awaited together rather than fired and forgotten. Three
   of them are answers this decision needs: progress and the session decide
   *which* screen, and the wardrobe decides what is standing on the plinth
   when it opens. They used to run unchained because nothing was waiting on
   them. `Promise.all` never rejects here - every one of these catches its own
   failure and resolves - so a denied storage lands on the first-run path,
   which is the correct reading of "there is nothing saved". */
Promise.all([progLoad(),skipLoad(),loadSettings(),loadWardrobe(),loadSession()])
  .then(function(){
    // nothingBehind() is in 16-panels.js, beside the other progress helpers,
    // because the home screen asks it too - to choose between START and
    // CONTINUE. One answer, so the two screens cannot disagree.
    if(!nothingBehind())homeShow();
  });
libLoad().then(function(){
  if(library.length) flash(library.length+" saved level"+(library.length===1?"":"s")+" in your library");
});
