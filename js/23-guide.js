"use strict";
/* I'm Just A Cube - 23-guide.js
   The two people who stand in your levels: the neighbour, who helps, and
   the father, who does not.

   Loaded after 21-boot.js like 22-story.js, and for the same reason: this
   file only declares, and every call into it is `typeof`-guarded.

   ============================================================
   WHO HE IS

   The white father from the house next door - the one who walked over to the
   boy after the police took his parents, in the opening cutscene. He stands
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
/* WHERE HE STANDS, in three numbers - see guideSpot() for the geometry.

   OUT is how far past the back edge of the board he is, along the axis a
   swipe UP walks the player: away from the camera. LIFT is the daylight
   between the highest thing on the board and the underside of his pedestal,
   both measured on SCREEN rather than in world height, which is what lets
   him sit at about the height of the board and still be clear above it.

   The pedestal is a plate on a column, the shape the wardrobe's stage uses,
   and DROP is how far under him its middle sits. */
var GUIDE_OUT=2;
var GUIDE_LIFT=.55;
var GUIDE_PED_DROP=.80;
var GUIDE_PED_H=.18;

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
  "02 - Behind the Wall":
    "Can't see yourself? Hold the eye - it leans the camera, and it costs no move.",
  "03 - Beware of Walls":
    "Anything sharing your column comes flat with you - and lands on top of you.",
  "04 - A Real Challenge":
    "Stuck? The bulb gives you the next move. Three of them, one back every half hour.",
  "05 - The Shortcut":
    "You can use the rules of this world to make it faster.",
  "06 - The Only Way":
    "The world folds onto one particular block. Which one, you find out from inside.",
  "07 - The Illusion":
    "Flat, the eye shows which block you would stand back up on. Look before you go.",
  "08 - The Block":
    "This world can take things from you, but it can also give.",
  "09 - Limited":
    "Hold the eye in {n3} too. Leaning round the board is free - it is not a move.",
  "11 - No Bridge":
    "The rules of this world and your turning, together, make things you would not expect.",
  "12 - No Bridge 2":
    "The same two again - the rules, and your turning. This board wants more of it.",
  "13 - Simple Walk":
    "You can build your own levels. MY LEVELS, on the home screen.",
  "14 - Not a Simple Walk":
    "Sometimes a simple walk is the hard one.",
  "15 - The Silence Before the Storm":
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
     second place it bites is inside I · NATURE: `10 - The Rotation` is the
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
/* WHERE HE IS: IN THE AIR, OFF THE BACK OF THE BOARD.

   He used to stand on a plinth two squares past the `+x`/`+z` CORNER of the
   board, at its lowest level. That placement solved a real bug and its
   reasoning is kept in docs/design/chrome.md, because the trap it avoids is
   still a trap: an offset along ONE horizontal axis is sideways in two of the
   four views and straight at the camera in the other two. What it cost is why
   it went - `recomputeBounds()` frames him, so two squares of width and two
   of depth came out of the board's share of the screen, on exactly the small
   early boards he stands on.

   So he is in the air now, and OFF THE BACK: `GUIDE_OUT` cells past the far
   edge along the axis a swipe UP walks the player, which is `-d` of the view
   a level opens in (every level opens in view 0 - see the resets in
   12-play.js). Away from the camera is up and back on screen, so that is the
   one direction that reads as "out of the way" rather than "beside the
   puzzle": he is behind the level, over its shoulder, and the player walks
   towards him rather than past him.

   HOW HIGH IS ARITHMETIC, not taste. Screen-up in this projection is height
   PLUS depth away from the camera (the camera leans by `CAM_TILT`, which is
   why `arenaSH` adds `CAM_TILT*arenaSW`), so a block gains `CAM_TILT` of
   screen height for every cell it stands further back than he does - and
   loses it for every cell it stands nearer. Standing behind the board, that
   term is NEGATIVE for every block on it, which is why he can sit at about
   the height of the board itself and still be clear over the top of it. The
   requirement is per block, over the views the level can actually be turned
   to, and it is measured to the UNDERSIDE of his pedestal rather than to him.

   ONLY THE VIEWS THE LEVEL CAN BE TURNED TO. A `rotate:false` level is locked
   to the view it opens in, so asking what he would look like from the side is
   asking about a camera position the player cannot reach - and paying for it
   in altitude. Every level he stands on before `10 - The Rotation` is locked;
   the four after it are not, and those take the worst case over all four.

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
  /* The swipe-up direction in world space: press("up") walks `-d`, and `d`
     points at the camera (js/01-coords.js, js/12-play.js). One of the two
     components is zero, so `out` is half the board along whichever axis that
     is, plus the gap. */
  var d=AX[0].d, ax=-d[0], az=-d[2];
  /* AND ONLY ON A LEVEL THAT CANNOT TURN. "Out along the swipe-up axis" names
     a direction that only exists while the view is locked: turn the camera
     ninety degrees and the same world offset is sideways, which is the trap
     the corner placement was invented for. The four rotating levels he stands
     on keep him over the middle, where no turn can swing him anywhere. */
  var locked=(L.rotate===false);
  /* ON A COMPUTER HE STANDS BESIDE THE BOARD, not behind it. Behind is
     right for a phone held upright, where height is spare and width is not;
     a monitor is the other way round, and behind-and-above cost the board a
     third of the screen's height to hold a man nobody is playing. So on a
     locked level he stands GUIDE_OUT past the board's right edge (screen-
     right is +x in view 0, the only view a locked level has), at the back
     depth, at the board's middle height - and the same height folded, since
     beside the board he is over nothing in either. Not the back row: depth
     draws high, and a man at the back of a deep board stood over it again. */
  if(typeof deskMode==="function"&&deskMode()){
    var topY=-1e9, botY=1e9;
    for(i=0;i<L.blocks.length;i++){
      if(L.blocks[i][1]>topY)topY=L.blocks[i][1];
      if(L.blocks[i][1]<botY)botY=L.blocks[i][1];
    }
    var sy=(topY+botY)/2+GUIDE_PED_DROP+.57;
    if(locked)return [hix+GUIDE_OUT+.5, sy, (loz+hiz)/2, sy];
    /* A board that turns: he stands at its middle and guideFrame() moves
       him out along whatever screen-right is in the current view
       (guideSide()), so he is beside it from every side and walks round
       with the turn. A fixed world offset would swing to the front. */
    return [(lox+hix)/2, sy, (loz+hiz)/2, sy];
  }
  var out=locked?(Math.abs(ax)*((hix-lox)/2)+
                  Math.abs(az)*((hiz-loz)/2)+GUIDE_OUT):0;
  var gx=(lox+hix)/2+ax*out, gz=(loz+hiz)/2+az*out;
  var tilt=(typeof CAM_TILT==="number")?CAM_TILT:.62;
  var views=locked?[AX[0]]:AX;
  var top=-1e9,vi,v,away,need;
  for(vi=0;vi<views.length;vi++){
    v=views[vi];
    for(i=0;i<L.blocks.length;i++){
      b=L.blocks[i];
      // how much further from the camera the block stands than he does
      away=-((b[0]-gx)*v.d[0]+(b[2]-gz)*v.d[2]);
      need=b[1]+tilt*away;
      if(need>top)top=need;
    }
  }
  /* CENTRES ARE NOT EDGES, and the first version of this compared centres and
     sat him in the top row of the board. A cube is drawn as a hexagon: its
     highest point is the FAR corner of its top face, half a cell up and half
     a cell back, so it reaches `.5 + tilt*.5` over the centre the loop above
     measured. His own lowest point is the NEAR bottom corner of the pedestal,
     which hangs below him by the drop, its own half-height, and the tilt of
     its half-width again. Both are constants of the projection, not taste;
     GUIDE_LIFT is the only number here anybody should be tuning. */
  /* A WHOLE CELL, not half. Half a cell is the top of the BLOCK, and the
     things the player is looking at are the ones standing on it - their own
     cube, the goal's wireframe - which reach about a cell over the top row.
     Clearing the blocks alone put his pedestal a few pixels over the player's
     head on a narrow board. The `tilt*.5` is the far corner of the top face,
     which is the highest point a cube actually draws at. */
  var blockTop=1+tilt*.5;
  var pedUnder=GUIDE_PED_DROP+.57+tilt*.53;   // to the column's near bottom corner
  /* AND A SECOND HEIGHT, FOR THE PLANE. Everything above is the arithmetic of
     a LEANING camera, and the lean is what he is standing on: behind the board
     he is high on screen because depth draws high. Fold the world and the lean
     goes to zero - `tilt` is `(1-flatT)*CAM_TILT` in the render loop - so
     depth stops paying, the whole board collapses to its own heights, and he
     lands in the middle of the silhouette the player is trying to read. It was
     exactly that in the first build of this: a white cube over the flattened
     board.

     So he has a flat height as well, and guideFrame() carries him from one to
     the other with the fold itself, on the same `ft` that carries his depth.
     He rises as the world goes down, which is a fair description of what the
     fold does to everything else's screen position anyway. It needs no tilt
     terms: in the plane nothing is behind anything. */
  var hiy=-1e9;
  for(i=0;i<L.blocks.length;i++)if(L.blocks[i][1]>hiy)hiy=L.blocks[i][1];
  /* A whole cell rather than half for the block's top: in the plane the
     things standing ON the top row - the goal's wireframe, the player - are
     what he would land on, and they reach about a cell over it. */
  var flatY=hiy+1+(GUIDE_PED_DROP+.57)+GUIDE_LIFT;
  return [gx, top+blockTop+pedUnder+GUIDE_LIFT, gz, flatY];
}
/* WHAT THE CAMERA IS TOLD ABOUT HIM, which is not quite where he is.

   `recomputeBounds()` frames a box of WORLD points and then asks for the
   larger of the x and z spans, because screen-right is x or z depending on
   the view. That is the right question for a board that can be turned and the
   wrong one for a man standing behind a board that cannot: his offset is pure
   DEPTH, and depth on a locked level is never width - it is height, at
   `CAM_TILT` a cell (the same lean `arenaSH` already charges for).

   Handing over his raw position therefore bought the board's width for
   nothing: measured, pushing him two cells out the back cost the early levels
   a whole step of zoom, which is exactly what taking him off the corner had
   just won back. So on a locked level the camera is told where he APPEARS -
   the same x, the board's own depth, and his depth offset converted into the
   height it draws at. He is framed as the thing the player sees: a man up and
   behind the board. On a level that can turn he has no offset to convert, so
   this is his own position and the question does not arise. */
function guidePoint(){
  var g=guideSpot();
  if(!g)return g;
  // The same "hold both heights" rule where there is no offset to convert.
  if(!L||L.rotate!==false||!L.blocks||!L.blocks.length)
    return [g[0],Math.max(g[1],g[3]),g[2]];
  // Beside the board (a computer): where he stands is where he appears.
  if(typeof deskMode==="function"&&deskMode())return [g[0],g[1],g[2]];
  var loz=1e9,hiz=-1e9,i,b;
  for(i=0;i<L.blocks.length;i++){
    b=L.blocks[i];
    if(b[2]<loz)loz=b[2];
    if(b[2]>hiz)hiz=b[2];
  }
  var lox=1e9,hix=-1e9;
  for(i=0;i<L.blocks.length;i++){
    b=L.blocks[i];
    if(b[0]<lox)lox=b[0];
    if(b[0]>hix)hix=b[0];
  }
  var mx=(lox+hix)/2, mz=(loz+hiz)/2;
  var d=AX[0].d, tilt=(typeof CAM_TILT==="number")?CAM_TILT:.62;
  // how much further from the camera he stands than the middle of the board
  var back=(mx-g[0])*d[0]+(mz-g[2])*d[2];
  // ...and never below where the fold will put him: the camera is not
  // re-framed when the world goes flat, so the box has to hold both heights.
  return [mx, Math.max(g[1]+tilt*back,g[3]), mz];
}
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
    /* AND HIS PEDESTAL, which is the wardrobe's stage: a PLATE ON A COLUMN,
       not a block. For one build he floated on nothing, on the reasoning that
       a cube plainly standing on air cannot be mistaken for a square of the
       puzzle - true, and it left a man hanging in the sky for no reason the
       picture gives. A pedestal answers that without costing the first thing:
       nobody has ever tried to fold onto a display stand.

       The shape is deliberately NOT a cube. A plate wider than he is, on a
       column narrower than he is, is furniture at a glance from any of the
       four views - a half-height cube under him, which is what the old plinth
       beside the board was, reads as a block he is standing on. The rim on
       the plate is the same hairline the wardrobe's slab carries, and the
       whole thing is one group so it folds and turns as a piece. */
    var ped=new THREE.Group();
    var plate=new THREE.Mesh(new THREE.BoxGeometry(1.06,GUIDE_PED_H,1.06),
      new THREE.MeshLambertMaterial({color:0x8f9ab2}));
    ped.add(plate);
    /* The column is narrow and most of it hangs BELOW the plate, or the two
       read as one grey slab from this camera: the plate hides whatever sits
       directly under its own footprint, so the drop is what makes the
       silhouette a stand rather than a brick. */
    var col=new THREE.Mesh(new THREE.BoxGeometry(.44,.5,.44),
      new THREE.MeshLambertMaterial({color:0x5a6580}));
    col.position.y=-.32;ped.add(col);
    var rim=new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.06,GUIDE_PED_H,1.06)),
      new THREE.LineBasicMaterial({color:0xcdd6e8,transparent:true,opacity:.5}));
    ped.add(rim);
    scene.add(ped);
    GD={mesh:m,mat:mat,ped:ped,x:0,y:0,z:0,fy:0,px:0,py:0,pz:0,said:0,
        bob:Math.random()*6.283};
  }
  GD.x=p[0];GD.y=p[1];GD.z=p[2];GD.fy=p[3];
  /* Snapped, not chased: a new board is a cut, and easing him across the
     screen from wherever he stood on the last one is a camera move nobody
     asked for. */
  GD.px=GD.x;GD.py=GD.y;GD.pz=GD.z;
  GD.mesh.visible=true;
  GD.mesh.position.set(GD.x,GD.y,GD.z);
  if(GD.ped){GD.ped.visible=true;GD.ped.position.set(GD.x,GD.y-GUIDE_PED_DROP,GD.z);}
  guideHide();
  /* AND HE WAITS TO BE PRESSED AGAIN.

     For one build he said his line by himself on every board, because the
     level's name and hint had been taken off the levels he stands on and his
     was the only description there was. Both are back on the owner's call, so
     the reason is gone: an unprompted bubble over a board that is already
     captioned is a second description arriving on top of the first, and it
     covers the puzzle to do it.

     AND IF THIS LEVEL HAS BEATEN YOU TEN TIMES, he still speaks first. The
     game has already put the skip in front of you on every one of those
     losses (struggleOffer is the out-of-lives card); this is not another
     offer, it is somebody saying out loud that taking it is allowed.
     Pressing the bubble is what opens the card. */
  var n=(typeof fails!=="undefined"&&levelKey&&fails[levelKey])||0;
  if(n>=GUIDE_STUCK_AT)setTimeout(function(){
    if(GD&&app==="play")guideSay(GUIDE_STUCK,true);
  },900);
}
function guideDrop(){
  if(!GD)return;
  if(typeof scene!=="undefined"&&scene){
    if(GD.mesh)scene.remove(GD.mesh);
    if(GD.ped)scene.remove(GD.ped);
  }
  if(GD.mesh&&GD.mesh.geometry&&GD.mesh.geometry.dispose)GD.mesh.geometry.dispose();
  if(GD.ped)GD.ped.traverse(function(o){
    if(o.geometry&&o.geometry.dispose)o.geometry.dispose();
    if(o.material&&o.material.dispose)o.material.dispose();
  });
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
/* AND IT PROJECTS THROUGH A STEADY CAMERA, not the one on screen.

   That is the second half of the wobble fix and it is the half the fold
   needed. The camera is deliberately thrown about - `shakeT` rattles it on a
   death, and a fold lands with a SLAM about a cell deep (`foldSlamT`, the
   render loop) - and both are right on the world and wrong on type: the
   bubble is projected every frame, so the slam went straight into four lines
   of mono and the text shook on every 2D/3D change. Reported exactly that way.

   `camSteady` (js/10-render.js) is where the camera would be with neither in
   it. `gdCam` is a copy of the real camera put there and aimed at the same
   point, so the bubble sits where it would if the world were not being
   rattled - and the cube under it still rattles, because the cube is part of
   the world and the sentence is not. r128: matrixWorldInverse is maintained by
   the renderer for its own camera, so this one has to invert its own. */
var gdCam=null;
function guideCamSync(){
  if(typeof camSteady==="undefined"||typeof center==="undefined")return camera;
  if(!gdCam){
    if(!camera||!camera.clone)return camera;
    gdCam=camera.clone();
  }
  gdCam.projectionMatrix.copy(camera.projectionMatrix);
  gdCam.position.copy(camSteady);
  gdCam.up.copy(camera.up);
  gdCam.lookAt(center);
  gdCam.updateMatrixWorld();
  gdCam.matrixWorldInverse.copy(gdCam.matrixWorld).invert();
  return gdCam;
}
function guideAnchor(dy,w,h,cam){
  gdTmp.set(GD.px,GD.py+dy,GD.pz);gdTmp.project(cam);
  return {x:(gdTmp.x*.5+.5)*w, y:(-gdTmp.y*.5+.5)*h};
}
/* How far out along screen-right he stands on a turning board on a
   computer (guideSpot()), or 0: past the board's widest half-span in any
   view, plus the usual gap. Locked boards and phones place him in the world
   and answer 0 here. */
function guideSide(){
  if(!L||L.rotate===false||typeof deskMode!=="function"||!deskMode())return 0;
  if(!L.blocks||!L.blocks.length)return 0;
  var lox=1e9,hix=-1e9,loz=1e9,hiz=-1e9,i,b;
  for(i=0;i<L.blocks.length;i++){
    b=L.blocks[i];
    lox=Math.min(lox,b[0]);hix=Math.max(hix,b[0]);
    loz=Math.min(loz,b[2]);hiz=Math.max(hiz,b[2]);
  }
  return Math.max(hix-lox,hiz-loz)/2+GUIDE_OUT+.5;
}
function guideFrame(dtMs,rx,rz,tdvx,tdvz,ft){
  if(!GD)return;
  if(!gdTmp&&typeof THREE!=="undefined")gdTmp=new THREE.Vector3();
  var side=guideSide(), bx=GD.x+rx*side, bz=GD.z+rz*side;
  var u=bx*rx+bz*rz;
  var fx=u*rx+1.0*tdvx, fz=u*rz+1.0*tdvz;
  GD.bob+=dtMs*.0013;
  /* THE SMOOTHED POSITION IS KEPT SEPARATELY FROM THE DRAWN ONE, and the bob
     is added at the last moment, to the mesh only. Everything that has to be
     STILL - the bubble, and so the tail under it - reads GD.px/py/pz; see
     guideAnchor() above. It is the same .3 chase the mesh position was doing,
     moved one step earlier so that only one thing breathes. */
  GD.px+=((bx+(fx-bx)*ft)-GD.px)*.3;
  // and up, by the same `ft`, to the height the plane needs - see guideSpot()
  GD.py+=((GD.y+(GD.fy-GD.y)*ft)-GD.py)*.3;
  GD.pz+=((bz+(fz-bz)*ft)-GD.pz)*.3;
  GD.mesh.position.set(GD.px, GD.py+Math.sin(GD.bob)*.035, GD.pz);
  GD.mesh.rotation.y=Math.atan2(tdvx,tdvz);
  /* The pedestal rides the still position, one step lower and WITHOUT the
     bob: he breathes, the thing he is standing on does not. */
  if(GD.ped){
    GD.ped.position.set(GD.px,GD.py-GUIDE_PED_DROP,GD.pz);
    GD.ped.rotation.y=GD.mesh.rotation.y;
  }
  if(typeof outlineFor==="function"&&scene)outlineFor(GD.mesh,scene.background);
  /* THE BUBBLE FOLLOWS HIM. Projected every frame rather than placed once,
     because the camera turns and the world folds underneath him and a line
     of dialogue anchored to a stale screen position is a line pointing at
     the wrong cube. */
  var el=$("guideBub");
  if(el&&el.classList.contains("on")){
    if(GD.said&&!GD.stuck&&Date.now()-GD.said>GUIDE_SAY_MS)guideHide();
    else{
      /* In the PAGE's pixels, which on a computer are zoomed (uiZoom(),
         js/26-desk.js): the bubble lives in the page, the camera does not. */
      var z=typeof uiZoom==="function"?uiZoom():1;
      var w=window.innerWidth/z,h=window.innerHeight/z;
      /* ABOVE HIM, OR BELOW HIM IF THERE IS NO ROOM ABOVE.

         He is over the top of the board now, which is near the top of the
         screen, and a box that is always anchored by its bottom edge goes off
         it. So both anchors are projected - a point over his head and one
         under his feet - and the bubble takes the one that fits, with `.down`
         flipping the tail to the top edge (css/99-guide.css).

         Projected rather than measured in pixels because the world-to-screen
         scale is whatever the board size and the level's own fit make it:
         .95 of a cell is not a fixed number of pixels on any two levels. */
      var cam=guideCamSync();
      var above=guideAnchor(.95,w,h,cam), below=guideAnchor(-.95,w,h,cam);
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
