"use strict";
/* Orthogonal — 13-gestures.js
   Swipe / tap / two-finger drag on the world.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* Touch gestures on the world itself. These are additive, never exclusive:
   every gesture also has a key, and (unless you chose to hide it) a button.
   Swipe = move. Two fingers = turn. Double tap = change dimension. */

/* Double tap, and not single tap, and in every mode rather than only when the
   bar is hidden. A single tap used to do this with the controls hidden, and
   the two cannot coexist: a single tap that fires immediately turns a double
   tap into fold-then-unfold, a flicker ending where it started, and the only
   way to tell them apart is to make the single tap wait ~300ms for a second
   one. That is latency on the game's primary verb, in the one layout where
   tapping *is* the primary control. Double tap fires on the second tap with
   nothing to wait for, so it is the cheaper of the two everywhere. */

/* Two fingers turn the world, and the world leans under them while you turn
   them. That lean is free: it rides the same camera/fold-axis split that
   peeking does, so `viewAngle` is untouched and nothing is spent until you let
   go past the threshold. Let go short of it and it springs back having cost
   nothing. The reason to bother is that turning is not free - it is a move,
   and par is optimal, and on a boss or a trial it is a beat of a real clock -
   so being able to see the turn before buying it is worth the extra state.

   The gesture is the map one: plant two fingers and pivot them around each
   other like a dial, and the world follows 1:1. It is deliberately *only*
   that. Two earlier versions read the midpoint between the fingers as well -
   first alone, then added to the twist - and both were wrong, the second
   worse than the first:

   - Alone, the midpoint answers a two-finger parallel slide and nothing else.
     A pivot barely moves it and a symmetric twist does not move it at all, so
     the gesture sat dead while the hand was offering a rotation.
   - Added, the two channels pull opposite ways. `viewAngle` grows clockwise
     on screen (`rx=cos, rz=-sin` in the render loop puts the near edge left
     as it rises), so a clockwise twist is +angle - but a rightward slide
     moves the near edge right, which is -angle. Summing them means the most
     ordinary grip of all, one finger planted while the other sweeps, produces
     a twist and a midpoint shift that cancel. That is not a sensitivity
     problem and no constant fixes it.

   So: twist only, and the near edge follows your fingers. A two-finger slide
   now does nothing, which is also what it does on a map. */
var TURN_GRAB=8,       // twist this far and the world takes hold
    TURN_SNAP=30,      // past this much lean on release, the turn is taken
    TURN_TAP=16,       // the midpoint never moved this far: a tap, not a turn
    DBL_MS=300,        // two taps closer together than this are one double tap
    DBL_PX=32;         // ...and landing closer together than this

function turnAllowed(){
  return app==="play"&&!flat&&!dying&&!panelOpen()&&!!L&&L.rotate!==false;
}
function bindGestures(el){
  var live={},maxN=0,t0=0,fired=false,cx0=0,travel=0,twist=0,lastAng=0;
  var tapT=0,tapX=0,tapY=0;   // the previous tap, waiting to become a double
  function count(){var k=0;for(var q in live)k++;return k;}
  function centre(){
    var sx=0,n=0;
    for(var q in live){sx+=live[q].cx;n++;}
    return n?sx/n:0;
  }
  // Screen y points down, so this grows clockwise - the same direction a
  // rightward slide means, which is why the two terms simply add.
  function angleNow(){
    var a=[];for(var q in live)a.push(live[q]);
    if(a.length!==2)return lastAng;
    return Math.atan2(a[1].cy-a[0].cy,a[1].cx-a[0].cx)*180/Math.PI;
  }
  el.addEventListener("pointerdown",function(e){
    if(app!=="play")return;
    if(!count()){t0=Date.now();fired=false;}
    live[e.pointerId]={x:e.clientX,y:e.clientY,cx:e.clientX,cy:e.clientY,dx:0,dy:0};
    if(count()>maxN)maxN=count();
    // the drag is measured from however the pair sat when it became a pair
    if(count()===2){
      cx0=centre();travel=0;twist=0;lastAng=angleNow();
      turnDrag=0;turnDragging=turnAllowed();
    }
  });
  el.addEventListener("pointermove",function(e){
    var g=live[e.pointerId];if(!g)return;
    g.cx=e.clientX;g.cy=e.clientY;
    g.dx=e.clientX-g.x;g.dy=e.clientY-g.y;
    // exactly two: a third finger freezes the lean rather than yanking the
    // centroid sideways, and it springs back like any other abandoned drag
    if(count()===2){
      // accumulated per move and unwrapped, because atan2 jumps by a full
      // turn at the back and a raw difference would fire a turn on the jump
      var a=angleNow(),da=a-lastAng;
      if(da>180)da-=360; else if(da<-180)da+=360;
      twist+=da;lastAng=a;
      // the midpoint is no longer steering, but it still says whether this
      // was a turn at all, which is what keeps a slide from reading as a tap
      travel=Math.max(travel,Math.abs(centre()-cx0));
      if(turnDragging){
        /* The grab is subtracted, not merely crossed: the world starts moving
           from still rather than jumping 8 degrees the instant it takes hold.
           Clamped to the full 90, so twisting that far makes the whole turn by
           hand and the commit below has nothing left to animate. */
        var lean=twist>TURN_GRAB?twist-TURN_GRAB:
                 twist<-TURN_GRAB?twist+TURN_GRAB:0;
        turnDrag=Math.max(-90,Math.min(90,lean));
      }
    }
  });
  function up(e){
    var g=live[e.pointerId];delete live[e.pointerId];
    if(!g||app!=="play"||fired||panelOpen()){
      if(count()<2)turnDragging=false;
      if(!count())maxN=0;
      return;
    }
    var far=Math.max(Math.abs(g.dx),Math.abs(g.dy)), dt=Date.now()-t0;
    if(maxN>=2){
      if(turnDragging&&Math.abs(turnDrag)>=TURN_SNAP&&turnAllowed()){
        /* The camera is already standing at viewAngle+turnDrag. Hand the lean
           over to viewAngle before rotateView adds its 90, and the ease
           carries on from where the fingers left it; zero turnDrag first and
           the world would snap back through everything you just dragged.
           Safe because viewAngle is purely visual - snapState stores
           viewAngleTarget, so undo is unaffected. */
        var dir=turnDrag>0?1:-1;
        viewAngle+=turnDrag;turnDrag=0;
        rotateView(dir);
        fired=true;
      } else if(travel<TURN_TAP&&turnDrag===0&&dt<600){
        // The old two-finger tap: a quick right turn. It tests the lean as
        // well as the midpoint, because a twist inside the grab leaves the
        // midpoint exactly where it started - and `turnDrag` is still exactly
        // zero until the grab is crossed, so this stays an exact test.
        rotateView(1);fired=true;
      }
      // anything else: the lean springs back in the render loop, costing nothing
    } else if(far>=28){
      if(Math.abs(g.dx)>Math.abs(g.dy)) press(g.dx>0?"right":"left");
      else press(g.dy<0?"up":"down");
      fired=true;
    } else if(far<10&&dt<350){
      var now=Date.now();
      if(now-tapT<DBL_MS&&Math.abs(g.x-tapX)<DBL_PX&&Math.abs(g.y-tapY)<DBL_PX){
        // consumed, so a third tap opens a fresh pair rather than firing again
        tapT=0;
        flat?doUnflatten():doFlatten();fired=true;
      } else {
        tapT=now;tapX=g.x;tapY=g.y;
      }
    }
    if(count()<2)turnDragging=false;
    if(!count())maxN=0;
  }
  el.addEventListener("pointerup",up);
  el.addEventListener("pointercancel",up);
}
