"use strict";
/* Orthogonal — 20-splash.js
   The studio sting, and the gesture that unlocks the sound.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. This file only declares; 21-boot.js
   is what runs it. */

/* ============================================================
   THE STING — the logo is a fold.

   A studio card that is just a logo appearing is a logo appearing. This one
   is the game's own pitch, played once: the wordmark starts as a cloud of
   cubes strewn through depth, illegible for exactly the reason the game is
   about - an orthographic view maps depth onto the screen, so things that
   are far apart in z land on top of things they have nothing to do with.
   Collapse that axis and every one of them lands in the plane at once, and
   the cloud is a word. "Things far apart in depth land side by side" is the
   sentence on the intro card behind it, demonstrated before it is read.

   IT WAITS FOR A TAP, AND THAT IS NOT FRICTION - IT IS THE ONLY WAY THE
   STING HAS SOUND. Every browser refuses an AudioContext until a gesture, so
   a card that plays itself on load plays itself silent. Waiting means the
   fold *is* the gesture, and it also moves the audio unlock off the intro
   card's BEGIN button onto a full-bleed surface where any touch anywhere
   counts - which is the more robust place for it inside a WebView, per the
   mobile notes in CLAUDE.md.

   Tapping again while it runs skips to the end. It is 1.9 seconds and it
   plays on every load, so it has to be escapable by the same reflex that
   started it.
   ============================================================ */

/* A 5x7 pixel face, drawn as lowercase so `d` gets an ascender and the
   wordmark has a shape rather than a slab. Rows run top to bottom; the
   x-height sits in rows 2..6. Editing a letter here is editing these
   strings - there is no font. */
var SPLASH_GLYPHS={
  n:[".....",".....","#.##.","##..#","#...#","#...#","#...#"],
  a:[".....",".....",".###.","....#",".####","#...#",".####"],
  d:["....#","....#",".####","#...#","#...#","#...#",".####"],
  z:[".....",".....","#####","...#.","..#..",".#...","#####"]
};
var SPLASH_WORD="nadaz";

/* The three beats, in milliseconds. FOLD is when the last cube lands and the
   sound hits - the CSS transitions and SFX.sting() are both written against
   it, so moving it means moving both. */
var SPLASH_FOLD=980, SPLASH_HOLD=520, SPLASH_OUT=420;
/* How far through depth the cubes are thrown. In screen pixels of translateZ:
   under the stage's rotation that scatters each one by up to five cells,
   which is what makes the cloud illegible rather than merely untidy. */
var SPLASH_DEPTH=72;

var splashState="off";   // off | armed | running | done

/* The wordmark runs pink to teal - the player's colour into the goal's, the
   only two accents the game has - and the hue takes the short way round
   through purple and blue rather than through mud. Lightness is nudged per
   face so a cube reads as a cube: top lit, side shaded, front flat, which is
   how the game shades its blocks.

   DEPTH IS SHADED BY COLOUR, NOT BY OPACITY, AND THAT IS FORCED. The obvious
   way to push a far cube back is `opacity` or a `saturate()` filter on it -
   and either one silently sets `transform-style: flat` on that element, per
   spec, which collapses its four faces into a stack of overlapping squares.
   The first version did exactly that and the "cubes" were flat tiles; the
   side faces measured zero pixels wide. Mixing toward the void instead is
   also what applyDepth() does in the renderer, so the card and the game are
   now doing the same thing for the same reason. */
var SPLASH_VOID=[15,20,36];
function splashTint(t,dl,far){
  var h=(340+(168-340)*t)/360, sa=(60-4*t)/100, l=(52-4*t+dl)/100;
  /* hsl -> rgb, so the result can be mixed with a flat colour numerically.
     A CSS hsl() string cannot be. */
  var q=l<.5?l*(1+sa):l+sa-l*sa, pp=2*l-q;
  function ch(x){
    if(x<0)x+=1; if(x>1)x-=1;
    if(x<1/6)return pp+(q-pp)*6*x;
    if(x<1/2)return q;
    if(x<2/3)return pp+(q-pp)*(2/3-x)*6;
    return pp;
  }
  var rgb=[ch(h+1/3),ch(h),ch(h-1/3)], o="";
  for(var i=0;i<3;i++){
    var v=rgb[i]*255;
    o+=(i?",":"")+Math.round(v+(SPLASH_VOID[i]-v)*far);
  }
  return "rgb("+o+")";
}

function splashBuild(){
  var stage=$("splashStage");
  if(!stage||stage.firstChild)return;
  /* Lay the letters out first so the grid's width is known before anything
     is positioned - the stage is sized in cells, and the cubes are placed
     inside it in cells, so both come from the same number. */
  var cells=[], col=0, r, c, g, i;
  for(i=0;i<SPLASH_WORD.length;i++){
    g=SPLASH_GLYPHS[SPLASH_WORD.charAt(i)];
    for(r=0;r<g.length;r++)
      for(c=0;c<g[r].length;c++)
        if(g[r].charAt(c)==="#")cells.push([col+c,r]);
    col+=g[0].length+1;
  }
  var cols=col-1, rows=7;
  /* On the card, not on the stage. The rule under the wordmark is the
     stage's *sibling* and sizes itself off --cols, and a custom property set
     on the stage does not reach it - it inherits down, not across. Set there
     once, the rule silently never drew. */
  var card=$("splash");
  card.style.setProperty("--cols",cols);
  card.style.setProperty("--rows",rows);

  var html="";
  for(i=0;i<cells.length;i++){
    var x=cells[i][0], y=cells[i][1];
    var t=cols>1?x/(cols-1):0;
    /* Depth is random, but seeded off the cell rather than Math.random() so
       the scatter is the same every load. A logo that reshuffles itself is
       not a logo. */
    var n=Math.sin(x*12.9898+y*78.233)*43758.5453;
    var z=((n-Math.floor(n))*2-1)*SPLASH_DEPTH;
    /* Depth shading, the same idea as applyDepth() in the renderer: what is
       far away is dimmer and greyer, so the cloud has front and back. It
       resolves to full colour as everything arrives in the plane. */
    var far=Math.abs(z)/SPLASH_DEPTH*.58;
    /* The word assembles left to right - a small ripple, not a stagger long
       enough to lose the sense of one movement. */
    var delay=Math.round(x*9);
    /* Two colours per face: where it starts, out in the depth, and where it
       arrives. The transition between them is the fold's own shading. */
    var vars="";
    [["f",0],["t",11],["l",-13],["r",-13]].forEach(function(fa){
      vars+="--"+fa[0]+":"+splashTint(t,fa[1],0)+";"+
            "--"+fa[0]+"d:"+splashTint(t,fa[1],far)+";";
    });
    html+="<div class='scube' style='left:calc("+x+"*var(--c));top:calc("+y+"*var(--c));"+
      "--tz:"+z.toFixed(1)+"px;--d:"+delay+"ms;"+vars+"'>"+
      "<i class='f'></i><i class='t'></i><i class='l'></i><i class='r'></i>"+
      "</div>";
  }
  stage.innerHTML=html;
}

/* Any key, anywhere, and it is taken in the capture phase so the game's own
   keydown handler never sees it. The verbs are all guarded on the intro card
   still being up, so nothing would fire anyway - but `m` toggles mute, and
   muting the sting with the key that starts it would be a poor first
   impression. */
function splashKey(e){
  if(splashState==="off"||splashState==="done")return;
  e.preventDefault();e.stopPropagation();
  splashPoke();
}
/* One poke per 320ms. Two reasons, and both are real: the card listens for
   `pointerdown` *and* `click` so it cannot miss whichever one a given browser
   treats as the activating gesture, and those arrive as a pair; and a
   double-tap should not start the sting and skip it in the same breath. */
var splashLast=0;
function splashPoke(){
  var now=Date.now();
  if(now-splashLast<320)return;
  splashLast=now;
  if(splashState==="armed")splashGo();
  /* Only skippable once it is actually playing. Between the tap and the
     first frame there is a short wait on the audio clock, and a poke landing
     in there would end the card before it ever folded. */
  else if(splashState==="running"&&$("splash").classList.contains("fold"))
    splashEnd();
}

/* Called from an inline script in index.html, before three.js is even
   downloaded - see the comment there. Guarded because it used to be called
   from 21-boot.js and a second call would build a second set of listeners
   onto a card that is already armed. */
function splashShow(){
  var el=$("splash");
  if(!el||splashState!=="off")return;
  splashBuild();
  el.classList.add("on");
  document.body.classList.add("splashing");
  /* Under reduced motion nothing travels - the CSS drops the scatter and the
     rotation - so the word is already assembled and "tap to fold" would be
     describing something the player is never going to see. */
  if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    $("splashPrompt").textContent="tap to begin";
  splashState="armed";
  /* POINTER *UP*, NOT DOWN, AND THIS IS THE BUG THAT MADE THE STING ARRIVE
     LATE. `pointerdown` is not an activation-triggering event for touch -
     only pointerup, touchend, click and keydown are - so on a phone the tap
     that started the card granted no user activation at all, the audio
     context could not start on it, and the whole arrangement queued against
     a stopped clock and landed in a heap on whatever the player pressed
     next. Waiting for the finger to lift costs nothing a player can feel and
     is the difference between sound and no sound.

     `click` as well, because it is the one every engine agrees counts, and
     splashPoke() drops whichever of the pair arrives second. Nothing here
     calls preventDefault: suppressing the pointer event also suppresses the
     click, which is the half that does the unlocking. */
  el.addEventListener("pointerup",splashPoke);
  el.addEventListener("click",splashPoke);
  window.addEventListener("keydown",splashKey,true);
}

/* THE FOLD DOES NOT START UNTIL THE AUDIO CLOCK IS RUNNING, and that is the
   whole reason this is two functions.

   The first version unlocked the context and scheduled the sting in the same
   call as the animation, on the reasonable assumption that a gesture handler
   is where a context starts. It is not, quite: resume() is a promise, and
   until it settles currentTime is frozen at 0. The arrangement queued
   against that frozen clock, the fold played in silence, and the entire
   sting arrived in a heap on the next button the player pressed.

   So the tap asks for the clock and waits for it - a few milliseconds
   normally, AUDIO_WAIT at the very worst - and the picture and the sound
   start in the same tick. If the clock never starts, the card plays silent
   rather than late. */
function splashGo(){
  if(splashState!=="armed")return;
  splashState="running";
  $("splashPrompt").textContent="";
  /* The card is now armed before the rest of the game has finished parsing,
     so a tap can in principle land before 11-sound.js exists. Silent beats
     broken - the fold plays either way, which is the same trade audioReady
     itself makes when the clock never starts. */
  if(typeof audioReady==="function")audioReady(splashPlay);
  else splashPlay(null);
}
function splashPlay(c){
  if(splashState!=="running")return;
  var el=$("splash");
  if(c&&SFX.sting)SFX.sting();
  el.classList.add("fold");
  /* The bloom is a separate class from the fold because it fires on arrival,
     not on departure: it is the flash of everything landing in one plane. */
  setTimeout(function(){
    if(splashState==="running")el.classList.add("hit");
  },SPLASH_FOLD);
  setTimeout(splashEnd,SPLASH_FOLD+SPLASH_HOLD);
}

function splashEnd(){
  if(splashState!=="running")return;
  splashState="done";
  var el=$("splash");
  el.classList.add("out");
  window.removeEventListener("keydown",splashKey,true);
  setTimeout(function(){
    el.classList.remove("on");
    document.body.classList.remove("splashing");
    /* Nothing else will ever want 69 cubes again, and they are 276 elements
       with live transitions on them. */
    $("splashStage").innerHTML="";
    if(typeof applyBrightness==="function")applyBrightness();
  },SPLASH_OUT);
}
