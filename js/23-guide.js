"use strict";
/* I'm Just A Cube - 23-guide.js
   The two people who stand in your levels: the neighbour, who helps, and
   the father, who does not.

   Loaded after 21-boot.js like 22-story.js, and for the same reason: this
   file only declares, and every call into it is `typeof`-guarded.

   ============================================================
   WHO HE IS

   The white father from the house next door - the one who walked over to the
   boy after the census took his parents, in the opening cutscene. He stands
   beside every ordinary board of I · NATURE - not the tutorials, not the
   trial, not the fights - and pressing him gets you a piece of advice about
   the level you are looking at.

   That is the whole of it, and it costs the fiction nothing to have: the
   neighbours took the boy in, so of course they are around at the start and
   gone by the time he is in the fire. He fades out of the campaign exactly
   where the campaign stops being about home.

   ============================================================
   HE IS DECORATION, AND THAT IS NOT A COMPROMISE - IT IS THE RULE

   Nothing in `resolveStep()`, `makeRules()` or `solve()` knows he exists. He
   is a mesh in the scene and a rectangle to hit-test, and that is all. He
   cannot be stood on, walked into, folded into or crushed, and no level's
   solution changes by one move because he is on it.

   This is forced rather than chosen. CLAUDE.md: "Death is solver-equivalent
   to a blocked move. resolveStep() is shared by the game and the solver, so
   they can never disagree; keep it that way." A friendly obstacle standing
   on a board would be a piece, a piece is a rule, and a rule the solver has
   not been told about is a level whose par is a lie. Everything below is
   built so that question never has to be asked.

   ============================================================
   WHERE HE STANDS: OFF THE BOARD, ON HIS OWN SQUARE

   He used to stand on one of the level's own blocks - the one furthest from
   the start and the goal. It was safe (nothing knew he was there) and it
   still read wrong: a white cube sitting on a square of the puzzle is a
   square the player has to look at and rule out, and on the tighter boards
   he was inside the working area whatever the scoring said.

   So he has a plinth of his own, two clear squares off the corner of the
   board, at its lowest level - a CORNER rather than an edge, so that a
   camera turn cannot swing him in front of the puzzle; guidePlinth() is
   where that is worked through. The plinth is NOT a block - it is a mesh
   this file draws, like he is - so the level is untouched and there is
   visibly nothing between him and the puzzle. `guidePoint()` is how the
   camera finds out he is there: recomputeBounds() adds that one point to the
   extents it frames, which is the only line in the renderer that knows he
   exists.

   ============================================================
   HOW HE IS PRESSED

   A single tap that does not become a double. Tapping the world is already
   spoken for - a double tap is the fold, in every layout - so a press on him
   is held for `DBL_MS` and cancelled if a second tap arrives. That is why
   `guideArm()` and `guideCancel()` exist and why 13-gestures.js calls both:
   the fold must never cost you a speech bubble, and a bubble must never cost
   you a fold.
   ============================================================ */

var GUIDE_COL=0xf4f6fa;          // White, out of the catalogue: he is a neighbour
/* A little bigger than the player and a lot smaller than the parents were in
   the cutscene. At their 1.4 he dominated a small board and read as a piece
   rather than as somebody standing on it; grown-up but not important is the
   size he wants. */
var GUIDE_SIZE=1.15;
var GUIDE_SAY_MS=6500;           // how long a line stays up on its own
/* The daylight between the top of the board and his feet, in cells, on top
   of the lean the projection already charges for depth - see guideSpot().
   Enough to read as "he is above this", small enough that the camera does
   not have to pull back to hold him. */
var GUIDE_LIFT=1.3;

/* ============================================================
   WHAT HE KNOWS: ONE LINE PER LEVEL, KEYED BY NAME

   He used to carry a list of twelve general tips and hand out `lvIndex %
   12` of them. It worked and it was wallpaper: whatever he said, he was
   saying it *near* the puzzle rather than *about* it, and the one player who
   pressed him twice on two different boards got two facts in the wrong order.

   So each board he stands on now has its own line, and the line is about
   that board. The tip is the level's own lesson said by somebody rather than
   printed at the top of the screen - which is the only thing a neighbour can
   offer that the hint line cannot.

   KEYED BY NAME, NOT BY INDEX, and that is the same reason progress is:
   `SECTIONS[].at` are array indices and inserting a level shifts every one
   of them, so an index-keyed table would quietly start telling level 5 about
   level 4 and nothing would ever say so. A name that stops existing falls
   through to GUIDE_FALLBACK instead, which is a lost line rather than a
   wrong one - and `tools/verify.js` fails on any key that is not a level,
   so a rename is loud.

   `{do:2d}`, `{n3}` and friends go through tutWords(), so every line names
   the player's OWN controls - the same rule the coach and the primer follow,
   and the reason none of these say "press the button" in words.

   Nothing here may mention a piece the player has not met. I · NATURE is
   stone only: water, fire, crates and amber are all spoilers here, and worse,
   advice about a thing there is no way to try.
   ============================================================ */
var GUIDE_LINES={
  "01 - On Your Own":
    "{do:2d} to go flat. Things far apart in depth land side by side.",
  "02 - Beware of Walls":
    "Anything sharing your column comes flat with you - and lands on top of you.",
  "03 - A Real Challenge":
    "Stuck? The bulb gives you the next move. Three of them, one back every half hour.",
  "04 - The Shortcut":
    "You can use the rules of this world to make it faster.",
  "05 - The Only Way":
    "The world folds onto one particular block. Which one, you find out from inside.",
  "06 - The Illusion":
    "Flat, the eye shows which block you would stand back up on. Look before you go.",
  "07 - The Block":
    "This world can take things from you, but it can also give.",
  "08 - Limited":
    "Hold the eye in {n3} too. Leaning round the board is free - it is not a move.",
  "10 - No Bridge":
    "The rules of this world and your turning, together, make things you would not expect.",
  "11 - No Bridge 2":
    "The same two again - the rules, and your turning. This board wants more of it.",
  "12 - Simple Walk":
    "You can build your own levels. MY LEVELS, on the home screen.",
  "13 - Not a Simple Walk":
    "Sometimes a simple walk is the hard one.",
  "14 - The Silence Before the Storm":
    "I believe in you, son. You have got this - go and find your parents."
};
/* WHAT HE SAYS ON A BOARD NOBODY HAS WRITTEN HIM A LINE FOR. Today that is
   no board at all: every level he stands on is in the table above. It exists
   for the level somebody inserts into I · NATURE next, so that pressing him
   there is a piece of advice rather than a shrug.

   All four are true everywhere in the campaign and none of them names a
   piece, because a fallback cannot know which section it landed in. */
var GUIDE_FALLBACK=[
  "Stars are for solving in few moves, not for solving at all. Nobody gets them first time.",
  "Restarting costs you nothing. Only the move count is ever scored.",
  "If a fold would crush you, the button says so before you press it. Look at it, not at the board.",
  "Spend your stars in the wardrobe. Some of the shapes in there cannot be bought at all."
];
/* Said on the win card, not in a bubble - by the time a level is solved the
   card is what the player is looking at, and a speech bubble behind it is a
   line delivered to nobody.

   The last one is the only time he mentions her, and it is last in the list
   so it lands on a level somebody has gone back and improved rather than on
   the third board of the game. */
var GUIDE_CHEERS=[
  "Nicely done.",
  "That one had a trick in it, and you found it.",
  "You are quicker at this than you were.",
  "Your mother would have liked watching that."
];
/* And the one line he says without being asked. Ten losses is a long way
   past the point where the game already offered a way round (struggleOffer,
   every third loss) - so this is not the offer, it is the neighbour saying
   the offer is not an insult. */
var GUIDE_STUCK="Nobody would think less of you for stepping past this one.";
var GUIDE_STUCK_AT=10;

/* ============================================================
   THE RUNNING GUIDE
   ============================================================ */
var GD=null;                     // {mesh, x, y, z, said, armed}
var gdTmp=null;

function guideOn(){return !!GD;}
/* Which levels he is on. The two tutorials and I · NATURE, minus the three
   levels with a clock or a pack on them: a bystander standing in a boss
   arena is a piece the player has to work out is not a threat, at the exact
   moment the game is teaching them what a threat looks like. */
function guideHere(idx){
  if(typeof idx!=="number"||idx<0)return false;
  if(typeof playSource==="undefined"||playSource!=="builtin")return false;
  if(typeof storyOn==="function"&&storyOn())return false;
  if(typeof app==="undefined"||app!=="play")return false;
  if(!L||L.boss||L.trial)return false;
  /* NOT ON A TEACHING LEVEL, and this is the one placement rule that came
     from playing it. He turned up in PROLOGUE offering "double-tap to drop
     the world flat" to somebody who had not been taught the fold yet -
     advice about a verb the game is three screens away from introducing,
     delivered over the top of the lesson that introduces it. A teaching
     level has a coach, a ghost hand and a guided lock; it does not need a
     fourth voice. He starts where the teaching stops.

     `tutorial:true` is the test rather than "is it PROLOGUE", because the
     second place it bites is inside I · NATURE: `09 - The Rotation` is the
     level that hands rotation over, and it is where the owner found him in
     the way. His plinth is placed off the +x end of the board and nowhere
     else (guidePlinth()), which is out of the way in exactly one of the four
     views - so from `09` on, the lesson's own new verb swings him in front
     of the puzzle. Every level before it is rotate:false and cannot.
     He stays on 10-14 because their lines are worth the turn; the level
     whose whole job is teaching the turn is not the place to find out. */
  if(L.tutorial)return false;
  if(typeof SECTIONS==="undefined"||typeof mapSecOf!=="function")
    return idx>=2&&idx<=18;
  return mapSecOf(idx)===1;
}
/* WHERE HE IS: IN THE AIR, OVER THE MIDDLE OF THE BOARD.

   He used to stand on a plinth two squares past the `+x`/`+z` CORNER of the
   board, at its lowest level. That placement solved a real bug and its
   reasoning is kept in docs/design/chrome.md, because the trap it avoids is
   still a trap: an offset along ONE horizontal axis is sideways in two of the
   four views and straight at the camera in the other two, which puts him on
   top of the puzzle. A corner offset is sideways in all four.

   What it cost is why it is gone. `recomputeBounds()` frames him, so two
   squares of width and two of depth came out of the board's share of the
   screen - on the small early boards, which are the ones he stands on, that
   is most of a third of the width. Reported by the owner exactly that way:
   the white cube is what is making the first levels small.

   So he floats instead. Over the CENTRE in x and z, which costs no
   horizontal room at all - he is inside the board's own silhouette - and
   high enough that he is above everything drawn on it.

   HOW HIGH IS ARITHMETIC, not taste. Screen-up in this projection is height
   PLUS depth away from the camera (the camera leans by `CAM_TILT`, which is
   why `arenaSH` adds `CAM_TILT*arenaSW`), so the block that draws highest is
   not the tallest one - it is the tallest one at the BACK. Depth away from
   the centre is `±(x-cx)` or `±(z-cz)` depending on which of the four views
   is up, so the most any given block can gain over its own height is
   `CAM_TILT * max(|dx|,|dz|)` - and the height he has to clear is the
   largest of THAT over the blocks, plus `GUIDE_LIFT` of daylight.

   Asked per block rather than as "the tallest block plus half the board's
   span", which is the same sum with the worst height and the worst depth
   taken off different blocks. On a board that is wide and low with one tower
   in the middle - which is most of I · NATURE - the loose version parks him
   two or three cells further up than anything on screen needs, and the
   camera frames that empty room as though it were part of the level.

   The cost that replaces the old one is vertical, and it is cheaper twice
   over: `recomputeBounds()` frames his height instead of his width, and in
   PORTRAIT the vertical requirement is multiplied by the aspect (see
   fitViewSize()) while the horizontal one is not. Losing two cells of width
   and gaining three of height is a bigger board on a phone.

   Pure: it reads L and nothing else, so recomputeBounds() can ask for it
   before any mesh exists and guideSync() can ask for it again afterwards,
   and neither has to run first. */
function guideSpot(){
  if(!guideHere(typeof lvIndex==="number"?lvIndex:-1))return null;
  if(!L||!L.blocks||!L.blocks.length)return null;
  var lox=1e9,loz=1e9,hix=-1e9,hiz=-1e9,i,b;
  for(i=0;i<L.blocks.length;i++){
    b=L.blocks[i];
    if(b[0]<lox)lox=b[0];
    if(b[0]>hix)hix=b[0];
    if(b[2]<loz)loz=b[2];
    if(b[2]>hiz)hiz=b[2];
  }
  var cx=(lox+hix)/2, cz=(loz+hiz)/2;
  var tilt=(typeof CAM_TILT==="number")?CAM_TILT:.62, top=-1e9, t;
  for(i=0;i<L.blocks.length;i++){
    b=L.blocks[i];
    t=b[1]+tilt*Math.max(Math.abs(b[0]-cx),Math.abs(b[2]-cz));
    if(t>top)top=t;
  }
  return [cx, top+GUIDE_LIFT, cz];
}
function guidePoint(){return guideSpot();}
/* Built, moved or taken away - called once per level load, from loadLevel. */
function guideSync(){
  var p=guideSpot();
  if(!p){guideDrop();return;}
  if(!GD){
    if(typeof THREE==="undefined"||typeof scene==="undefined"||!scene)return;
    var mat=new THREE.MeshBasicMaterial({color:GUIDE_COL});
    var m=buildPlayerMesh("cube",GUIDE_COL,mat);
    m.scale.setScalar(GUIDE_SIZE);
    scene.add(m);
    /* THE PLINTH IS GONE WITH THE GROUND UNDER IT. He stood on a half-height
       slab of his own - furniture, drawn so that a white cube parked beside
       the board could not be mistaken for a piece of it. In the air there is
       nothing to mistake him for: a cube over the board, bobbing, plainly not
       standing on anything, is not a square anybody is going to try to fold
       onto. A floating slab under him would be the confusing object now. */
    GD={mesh:m,mat:mat,x:0,y:0,z:0,px:0,py:0,pz:0,said:0,bob:Math.random()*6.283};
  }
  GD.x=p[0];GD.y=p[1];GD.z=p[2];
  /* Snapped, not chased: a new board is a cut, and easing him across the
     screen from wherever he stood on the last one is a camera move nobody
     asked for. */
  GD.px=GD.x;GD.py=GD.y;GD.pz=GD.z;
  GD.mesh.visible=true;
  GD.mesh.position.set(GD.x,GD.y,GD.z);
  guideHide();
  /* AND HE WAITS TO BE PRESSED AGAIN.

     For one build he said his line by himself on every board, because the
     level's name and hint had been taken off the levels he stands on and his
     was the only description there was. Both are back on the owner's call, so
     the reason is gone: an unprompted bubble over a board that is already
     captioned is a second description arriving on top of the first, and it
     covers the puzzle to do it.

     AND IF THIS LEVEL HAS BEATEN YOU TEN TIMES, he still speaks first. The
     game has already offered a skip twice by then (struggleOffer fires on
     every third loss); this is not a third offer, it is somebody saying out
     loud that taking it is allowed. Pressing the bubble is what opens the
     card. */
  var n=(typeof fails!=="undefined"&&levelKey&&fails[levelKey])||0;
  if(n>=GUIDE_STUCK_AT)setTimeout(function(){
    if(GD&&app==="play")guideSay(GUIDE_STUCK,true);
  },900);
}
function guideDrop(){
  if(!GD)return;
  if(typeof scene!=="undefined"&&scene&&GD.mesh)scene.remove(GD.mesh);
  if(GD.mesh&&GD.mesh.geometry&&GD.mesh.geometry.dispose)GD.mesh.geometry.dispose();
  GD=null;
  guideHide();
}

/* ============================================================
   WHAT HE SAYS
   ============================================================ */
/* The level's own line if it has one, and a general one if it does not.
   `typeof ...==="string"` rather than a truth test on the lookup: a level
   called "constructor" would otherwise hand back a function and put
   "function Object() { [native code] }" in a speech bubble. */
function guideTip(){
  var n=(typeof L!=="undefined"&&L&&L.name)||"";
  if(typeof GUIDE_LINES[n]==="string")return GUIDE_LINES[n];
  var i=(typeof lvIndex==="number"?lvIndex:0), k=GUIDE_FALLBACK.length;
  return GUIDE_FALLBACK[((i%k)+k)%k];
}
/* His line on a win card. Not every level: a neighbour who congratulates you
   on all nineteen boards is wallpaper, and the point of him is that he turns
   up. Every third, keyed off the level rather than a counter, so it is the
   same levels every time and never two in a row. */
function guideWinLine(){
  if(!guideHere(typeof lvIndex==="number"?lvIndex:-1))return null;
  var i=(typeof lvIndex==="number"?lvIndex:0);
  if(i%3!==2)return null;
  return GUIDE_CHEERS[Math.floor(i/3)%GUIDE_CHEERS.length];
}
function guideSay(text,stuck){
  var el=$("guideBub");
  if(!el||!GD)return;
  GD.said=Date.now();
  GD.stuck=!!stuck;
  el.innerHTML=(typeof tutWords==="function")?tutWords(text):text;
  el.classList.toggle("stuck",!!stuck);
  el.classList.remove("on");
  void el.offsetWidth;
  el.classList.add("on");
  if(typeof SFX!=="undefined"&&SFX.hint)SFX.hint();
}
function guideHide(){
  var el=$("guideBub");
  if(el)el.classList.remove("on");
  if(GD){GD.said=0;GD.stuck=false;}
}
/* Pressed. A bubble that is already up is either dismissed, or - if it is
   the one about being stuck - taken up on, which opens the card the game
   would have shown anyway. */
function guideTalk(){
  if(!GD)return;
  if(GD.said){
    var wasStuck=GD.stuck;
    guideHide();
    if(wasStuck&&typeof struggleOffer==="function")struggleOffer();
    return;
  }
  guideSay(guideTip());
}

/* ============================================================
   THE PRESS

   A single tap that does not turn into a double. 13-gestures.js calls
   guideArm() when a first tap lands on him and guideCancel() the moment a
   second one arrives, so the fold always wins the race - which is the right
   way round: the fold is the game and this is a conversation.
   ============================================================ */
var gdTimer=null;
function guideHit(cx,cy){
  if(!GD||!GD.mesh.visible)return false;
  if(typeof renderer==="undefined"||!renderer||typeof ray==="undefined")return false;
  var rect=renderer.domElement.getBoundingClientRect();
  ndc.x=((cx-rect.left)/rect.width)*2-1;
  ndc.y=-((cy-rect.top)/rect.height)*2+1;
  ray.setFromCamera(ndc,camera);
  return ray.intersectObject(GD.mesh,true).length>0;
}
function guideArm(cx,cy){
  guideCancel();
  if(!guideHit(cx,cy))return false;
  gdTimer=setTimeout(function(){gdTimer=null;guideTalk();},
    (typeof DBL_MS==="number"?DBL_MS:280)+40);
  return true;
}
function guideCancel(){
  if(gdTimer){clearTimeout(gdTimer);gdTimer=null;}
}

/* ============================================================
   THE FRAME

   Called from animate() with the camera basis, exactly like storyFrame(),
   and it does the same projection: he folds with the world because he is
   drawn with the maths the player is drawn with. The bubble is placed by
   projecting his position to the screen, so it follows him round a turn.
   ============================================================ */
/* One end of the bubble's leash: a point `dy` cells above or below him,
   projected to the screen.

   IT READS THE STILL POSITION, NOT THE MESH'S. This is the whole of the
   wobble fix, and the bug is worth writing down because it is the kind that
   only shows up on type. He BREATHES - a sine of .035 of a cell on the
   drawn mesh - and the bubble used to be projected from that mesh, so the
   text inherited the breath. On a cube two hundredths of a cell is life; on
   four lines of 11.5px mono it is a one-or-two pixel judder at 60fps, dead
   centre of the screen, on the one element the player is trying to READ.
   Rounding to whole pixels made it worse rather than better: a value drifting
   across a pixel boundary snaps back and forth instead of easing.

   So the bob is applied to the mesh and to nothing else. `GD.px/py/pz` is the
   same smoothed position without it - the fold still carries the bubble,
   because the smoothing chases the same folded target the mesh does. */
function guideAnchor(dy,w,h){
  gdTmp.set(GD.px,GD.py+dy,GD.pz);gdTmp.project(camera);
  return {x:(gdTmp.x*.5+.5)*w, y:(-gdTmp.y*.5+.5)*h};
}
function guideFrame(dtMs,rx,rz,tdvx,tdvz,ft){
  if(!GD)return;
  if(!gdTmp&&typeof THREE!=="undefined")gdTmp=new THREE.Vector3();
  var u=GD.x*rx+GD.z*rz;
  var fx=u*rx+1.0*tdvx, fz=u*rz+1.0*tdvz;
  GD.bob+=dtMs*.0013;
  /* THE SMOOTHED POSITION IS KEPT SEPARATELY FROM THE DRAWN ONE, and the bob
     is added at the last moment, to the mesh only. Everything that has to be
     STILL - the bubble, and so the tail under it - reads GD.px/py/pz; see
     guideAnchor() above. It is the same .3 chase the mesh position was doing,
     moved one step earlier so that only one thing breathes. */
  GD.px+=((GD.x+(fx-GD.x)*ft)-GD.px)*.3;
  GD.py+=(GD.y-GD.py)*.3;
  GD.pz+=((GD.z+(fz-GD.z)*ft)-GD.pz)*.3;
  GD.mesh.position.set(GD.px, GD.py+Math.sin(GD.bob)*.035, GD.pz);
  GD.mesh.rotation.y=Math.atan2(tdvx,tdvz);
  if(typeof outlineFor==="function"&&scene)outlineFor(GD.mesh,scene.background);
  /* THE BUBBLE FOLLOWS HIM. Projected every frame rather than placed once,
     because the camera turns and the world folds underneath him and a line
     of dialogue anchored to a stale screen position is a line pointing at
     the wrong cube. */
  var el=$("guideBub");
  if(el&&el.classList.contains("on")){
    if(GD.said&&!GD.stuck&&Date.now()-GD.said>GUIDE_SAY_MS)guideHide();
    else{
      var w=window.innerWidth,h=window.innerHeight;
      /* ABOVE HIM, OR BELOW HIM IF THERE IS NO ROOM ABOVE.

         He is over the top of the board now, which is near the top of the
         screen, and a box that is always anchored by its bottom edge goes off
         it. So both anchors are projected - a point over his head and one
         under his feet - and the bubble takes the one that fits, with `.down`
         flipping the tail to the top edge (css/99-guide.css).

         Projected rather than measured in pixels because the world-to-screen
         scale is whatever the board size and the level's own fit make it:
         .95 of a cell is not a fixed number of pixels on any two levels. */
      var above=guideAnchor(.95,w,h), below=guideAnchor(-.95,w,h);
      var bh=el.offsetHeight||44, down=(above.y-bh)<10;
      var at=down?below:above;
      el.classList.toggle("down",down);
      /* KEPT ON SCREEN, AND STILL OVER HIS HEAD. Two separate jobs, and for
         a while one number did both, badly.

         He stands off the SIDE of the board, so the bubble's natural anchor
         is near the edge of the screen and a centred box hangs past it. The
         old fix slid the whole box back inwards - which kept it on screen
         and moved it off him: on a phone the box ended up a third of the
         screen to his left with its tail pointing at open sky, sitting over
         the puzzle instead of over the man talking. Reported as exactly
         that, with a photograph.

         So the box and the tail are placed separately. The box is put where
         it fits; the TAIL is then put wherever he actually is inside it, as
         `--tail` (css/99-guide.css reads it). The bubble is above him in
         every case, and near an edge it simply grows inwards from him rather
         than sliding away. The tail keeps `TAIL_IN` of padding at each end
         so it never hangs off a rounded corner.

         `left` is the box's LEFT here, not its centre: the CSS translate no
         longer carries an -50%, because the centring is what had to go.

         The box is `width:max-content` (see css/99-guide.css), so offsetWidth
         is a real number here and not a consequence of where it was put -
         which is what makes measuring against it work rather than feed back
         on itself. */
      var bw=el.offsetWidth||160, pad=10, TAIL_IN=16;
      var cx=at.x;
      var bx=Math.max(pad,Math.min(w-pad-bw,cx-bw/2));
      el.style.left=Math.round(bx)+"px";
      el.style.top=Math.round(at.y)+"px";
      el.style.setProperty("--tail",
        Math.round(Math.max(TAIL_IN,Math.min(bw-TAIL_IN,cx-bx)))+"px");
    }
  }
}


/* ============================================================
   THE GLIMPSE - the father, in the back of II · FIRE

   Every twenty seconds on a fire level the game tosses a coin, and on heads
   something dark stands behind the board for six tenths of a second and is
   gone. One time in ten it is the Shard he came back as; the other nine it
   is the cube he left as.

   THE ODDS ARE THE POINT AND THEY ARE THE OWNER'S. Nine times out of ten you
   see a shape you already know, which reads as your father and is therefore
   not evidence of anything; the tenth is the shape the fire scene will later
   show you, before you have any way to know what it means. A player who
   never notices loses nothing. A player who does gets to be right about it
   two sections later, which is the only kind of foreshadowing worth putting
   in a game nobody is obliged to look at.

   He is BEHIND and ABOVE the board, against the sky, and he does not fold:
   a glimpse of somebody who is not in this world should not obey its verb.
   He is not solid, not tappable, and nothing in the rules knows about him -
   the same contract the neighbour has, for the same reason.
   ============================================================ */
var GHOST_EVERY=20000;     // one coin toss every twenty seconds
var GHOST_CHANCE=.5;       // and it comes up heads half the time
var GHOST_SHARD=.10;       // one appearance in ten is the shape he is now
var GHOST_MS=600;          // how long he is there. Long enough to doubt.
var GH=null, ghClock=0;

function ghostHere(){
  if(typeof playSource==="undefined"||playSource!=="builtin")return false;
  if(typeof storyOn==="function"&&storyOn())return false;
  if(typeof app==="undefined"||app!=="play")return false;
  if(!L||typeof lvIndex!=="number")return false;
  if(typeof mapSecOf!=="function")return false;
  return mapSecOf(lvIndex)===2;
}
/* Rebuilt on the shape rather than pooled per shape: he appears about once a
   minute, and one THREE build a minute is not worth a second mesh kept alive
   for the nine times in ten it is not wanted. */
function ghostShow(){
  if(typeof THREE==="undefined"||typeof scene==="undefined"||!scene)return;
  var shard=Math.random()<GHOST_SHARD;
  if(GH&&GH.shard!==shard){scene.remove(GH.mesh);GH=null;}
  if(!GH){
    var mat=new THREE.MeshBasicMaterial({color:0x2b2f3a,transparent:true,
      opacity:0});
    var m=buildPlayerMesh(shard?"star":"cube",0x2b2f3a,mat);
    m.scale.setScalar(1.3);
    scene.add(m);
    GH={mesh:m,mat:mat,shard:shard,t:0};
  }
  GH.t=GHOST_MS;
  /* Behind the board and a little over it, so he is against the sky rather
     than lost in the basalt - and off to a side rather than centred, because
     a figure dead behind the puzzle reads as part of it.

     EVERY ONE OF THESE OFFSETS IS INSIDE THE FRAME, and the first version's
     were not. `fitViewSize()` frames the ARENA and nothing else: the camera
     half-width is about `arenaSW/2 + 1`, so putting him a whole board-width
     plus two off to the side put him past the edge of the screen every time.
     Photographed, the glimpse was perfect and invisible. He is offset by a
     FRACTION of the half-width now, and lifted and pushed back by a couple
     of cells rather than by six. */
  var lo=(typeof arenaLo!=="undefined")?arenaLo:[0,0,0];
  var hi=(typeof arenaHi!=="undefined")?arenaHi:[0,0,0];
  var side=Math.random()<.5?-1:1;
  var halfW=Math.max(2,(hi[0]-lo[0])/2);
  GH.mesh.position.set(
    (lo[0]+hi[0])/2 + side*halfW*(.35+Math.random()*.5),
    hi[1]+.2+Math.random()*.8,
    lo[2]-3-Math.random()*2);
  GH.mesh.visible=true;
}
function ghostFrame(dtMs){
  if(!ghostHere()){
    if(GH){GH.t=0;GH.mesh.visible=false;}
    ghClock=0;return;
  }
  ghClock+=dtMs;
  if(ghClock>=GHOST_EVERY){
    ghClock-=GHOST_EVERY;
    if(Math.random()<GHOST_CHANCE)ghostShow();
  }
  if(!GH||GH.t<=0)return;
  GH.t-=dtMs;
  if(GH.t<=0){GH.mesh.visible=false;GH.mat.opacity=0;return;}
  /* In fast, out slow, and never all the way solid. He is a thing you are
     not certain you saw. */
  var p=1-GH.t/GHOST_MS;
  GH.mat.opacity=.62*Math.min(1,p/.18)*Math.min(1,(1-p)/.45);
  if(GH.mesh.userData.outlines)
    GH.mesh.userData.outlines.forEach(function(e){
      e.material.opacity=GH.mat.opacity*.8;});
  GH.mesh.rotation.y+=dtMs*.0004;
}
