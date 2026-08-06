"use strict";
/* Orthogonal — 13-gestures.js
   Swipe / tap / two-finger-tap on the world.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* Touch gestures on the world itself. These are additive, never exclusive:
   every gesture also has a key, and (unless you chose to hide it) a button.
   Swipe = move. With the bar hidden, tap = change dimension and two-finger
   tap = turn, because with no buttons those two verbs need a home. */
function bindGestures(el){
  var live={},maxN=0,t0=0,fired=false;
  function count(){var k=0;for(var q in live)k++;return k;}
  el.addEventListener("pointerdown",function(e){
    if(app!=="play")return;
    if(!count()){t0=Date.now();fired=false;}
    live[e.pointerId]={x:e.clientX,y:e.clientY,dx:0,dy:0};
    if(count()>maxN)maxN=count();
  });
  el.addEventListener("pointermove",function(e){
    var g=live[e.pointerId];if(!g)return;
    g.dx=e.clientX-g.x;g.dy=e.clientY-g.y;
  });
  function up(e){
    var g=live[e.pointerId];delete live[e.pointerId];
    if(!g||app!=="play"||fired||panelOpen()){if(!count())maxN=0;return;}
    var far=Math.max(Math.abs(g.dx),Math.abs(g.dy)), dt=Date.now()-t0;
    if(maxN>=2){
      if(far<16&&dt<600){rotateView(1);fired=true;}
    } else if(far>=28){
      if(Math.abs(g.dx)>Math.abs(g.dy)) press(g.dx>0?"right":"left");
      else press(g.dy<0?"up":"down");
      fired=true;
    } else if(far<10&&dt<350&&settings.ui==="none"){
      flat?doUnflatten():doFlatten();fired=true;
    }
    if(!count())maxN=0;
  }
  el.addEventListener("pointerup",up);
  el.addEventListener("pointercancel",up);
}
