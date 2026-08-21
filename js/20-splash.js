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
function splashPoke(){
  if(splashState==="armed")splashGo();
  else if(splashState==="running")splashEnd();
}

function splashShow(){
  var el=$("splash");
  if(!el)return;
  splashBuild();
  el.classList.add("on");
  document.body.classList.add("splashing");
  /* Under reduced motion nothing travels - the CSS drops the scatter and the
     rotation - so the word is already assembled and "tap to fold" would be
     describing something the player is never going to see. */
  if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    $("splashPrompt").textContent="tap to begin";
  splashState="armed";
  el.addEventListener("pointerdown",function(e){e.preventDefault();splashPoke();});
  window.addEventListener("keydown",splashKey,true);
}

function splashGo(){
  if(splashState!=="armed")return;
  splashState="running";
  var el=$("splash");
  /* The gesture that unlocks the audio context is this one, and the sound is
     scheduled in the same call - a tap that starts a silent animation and
     unlocks sound for later is the failure mode this whole card exists to
     avoid. */
  audio();
  if(SFX.sting)SFX.sting();
  el.classList.add("fold");
  $("splashPrompt").textContent="";
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
    applyBrightness();
  },SPLASH_OUT);
}
