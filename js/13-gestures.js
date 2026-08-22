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

/* Two fingers turn the world, and the world leans under them while you drag
   them. That lean is free: it rides the same camera/fold-axis split that
   peeking does, so `viewAngle` is untouched and nothing is spent until you let
   go past the threshold. Let go short of it and it springs back having cost
   nothing. The reason to bother is that turning is not free - it is a move,
   and par is optimal, and on a boss or a trial it is a beat of a real clock -
   so being able to see the turn before buying it is worth the extra state.

   THE GESTURE IS A TWO-FINGER SLIDE LEFT OR RIGHT, and the world follows your
   fingers: slide right and the near edge comes right with them. It reads the
   midpoint between the fingers and nothing else - a two-finger twist now does
   nothing, and neither does a vertical slide.

   This is the third arrangement, and the reasoning behind the other two is
   worth keeping because the failure mode of the second is invisible:

   - The midpoint alone was tried first and dropped for being deaf to a pivot.
     That is still true and is now the point rather than the complaint: the
     gesture being asked for is a slide, so answering only a slide is correct.
   - The midpoint *added to* the twist was strictly worse than either alone.
     `viewAngle` grows clockwise on screen (`rx=cos, rz=-sin` in the render
     loop puts the near edge left as it rises), so a clockwise twist is +angle
     while a rightward slide is -angle. Summing them means the most ordinary
     grip of all - one finger planted while the other sweeps - produces a
     twist and a midpoint shift that cancel. That is not a sensitivity problem
     and no constant fixes it. If the turn ever feels mushy again, check the
     signs before touching TURN_DEG.

   The sign below is the whole of that lesson in one minus: a rightward slide
   is a *negative* lean, because moving the camera toward +x is what carries
   the world to the left. */
var TURN_GRAB=14,      // slide the pair this far (px) and the world takes hold
    TURN_DEG=.42,      // degrees of lean per pixel of slide past the grab
    TURN_SNAP=30,      // past this much lean on release, the turn is taken
    TURN_TAP=16,       // the midpoint never moved this far: a tap, not a turn
    DBL_MS=300,        // two taps closer together than this are one double tap
    DBL_PX=32;         // ...and landing closer together than this

function turnAllowed(){
  return app==="play"&&!flat&&!dying&&!panelOpen()&&!!L&&L.rotate!==false;
}
function bindGestures(el){
  var live={},maxN=0,t0=0,fired=false,cx0=0,cy0=0,slide=0,travel=0,travelY=0;
  var tapT=0,tapX=0,tapY=0;   // the previous tap, waiting to become a double
  function count(){var k=0;for(var q in live)k++;return k;}
  function centre(){
    var sx=0,n=0;
    for(var q in live){sx+=live[q].cx;n++;}
    return n?sx/n:0;
  }
  // Only the horizontal midpoint steers. The vertical one is measured purely
  // so a two-finger drag *up or down* can be told from a two-finger tap: it
  // moves neither the lean nor the horizontal midpoint, so without this it
  // satisfied the tap test exactly and turned the world. See up().
  function centreY(){
    var sy=0,n=0;
    for(var q in live){sy+=live[q].cy;n++;}
    return n?sy/n:0;
  }
  el.addEventListener("pointerdown",function(e){
    if(app!=="play")return;
    if(!count()){t0=Date.now();fired=false;}
    live[e.pointerId]={x:e.clientX,y:e.clientY,cx:e.clientX,cy:e.clientY,dx:0,dy:0};
    if(count()>maxN)maxN=count();
    // the drag is measured from however the pair sat when it became a pair
    if(count()===2){
      cx0=centre();cy0=centreY();slide=0;travel=0;travelY=0;
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
      // Signed against where the pair sat when it became a pair, so a slide
      // out and back lands on nothing - the lean is a position, not a total.
      slide=centre()-cx0;
      // The unsigned high-water mark is a different question and is still
      // asked separately below: it is what keeps a slide that returned to
      // its start from being mistaken for a two-finger tap.
      travel=Math.max(travel,Math.abs(slide));
      travelY=Math.max(travelY,Math.abs(centreY()-cy0));
      if(turnDragging){
        /* The grab is subtracted, not merely crossed: the world starts moving
           from still rather than jumping 14px worth of angle the instant it
           takes hold. Negated because the fingers lead and the camera follows
           - see the sign note above. Clamped to the full 90, so sliding that
           far makes the whole turn by hand and the commit below has nothing
           left to animate. */
        var past=slide>TURN_GRAB?slide-TURN_GRAB:
                 slide<-TURN_GRAB?slide+TURN_GRAB:0;
        turnDrag=Math.max(-90,Math.min(90,-past*TURN_DEG));
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
      } else if(travel<TURN_TAP&&travelY<TURN_TAP&&turnDrag===0&&dt<600){
        // The two-finger tap: a quick right turn, unchanged - it is a slide
        // that never travelled. It tests the lean as well as the midpoint,
        // because `turnDrag` is exactly zero until the grab is crossed, so a
        // nudge inside the grab still reads as the tap it was - and it tests
        // *both* axes, because a purely vertical two-finger drag moves
        // neither the lean nor the horizontal midpoint and would otherwise be
        // indistinguishable from a tap. It should do nothing at all, which is
        // also what it does on a map.
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
