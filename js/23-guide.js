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

   So he has a plinth of his own, two clear squares off the right-hand end of
   the board, at its lowest level. The plinth is NOT a block - it is a mesh
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
    "{do:2d} drops the world flat. Things far apart in depth land side by side.",
  "02 - Beware of Walls":
    "Anything sharing your column comes flat with you - and lands on top of you.",
  "03 - A Real Challenge":
    "Stuck on one? The bulb gives you the next move. You get three, and one comes back every half hour.",
  "04 - The Shortcut":
    "You can use the rules of this world to make it faster.",
  "05 - The Only Way":
    "The world folds down onto one particular block. Which one, you find out from inside the fold.",
  "06 - The Illusion":
    "Flat, the eye shows which block you would stand back up on. Look before you go.",
  "07 - The Block":
    "This world can take things from you, but it can also give.",
  "08 - Limited":
    "Hold the eye in {n3} as well - leaning round the board shows you the puzzle better, and it is not a move.",
  "10 - No Bridge":
    "The rules of this world and your turning, put together, make things you would not think were there.",
  "11 - No Bridge 2":
    "The same two again, the rules and your turning. This one just wants more of it.",
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
/* HIS SQUARE, AND HIS PLINTH'S, DERIVED FROM THE BOARD.

   Two clear squares past the right-hand end of the level, at the level's own
   floor, halfway along its depth. Pure: it reads L and nothing else, so
   recomputeBounds() can ask for it before any mesh exists and guideSync()
   can ask for it again afterwards, and neither has to run first.

   `guidePoint()` answers with the PLINTH's cell rather than his, because
   that is the lowest thing the camera has to keep on screen. */
function guidePlinth(){
  if(!guideHere(typeof lvIndex==="number"?lvIndex:-1))return null;
  if(!L||!L.blocks||!L.blocks.length)return null;
  var mx=-1e9,my=1e9,z0=1e9,z1=-1e9,i,b;
  for(i=0;i<L.blocks.length;i++){
    b=L.blocks[i];
    if(b[0]>mx)mx=b[0];
    if(b[1]<my)my=b[1];
    if(b[2]<z0)z0=b[2];
    if(b[2]>z1)z1=b[2];
  }
  return [mx+2,my,Math.round((z0+z1)/2)];
}
function guidePoint(){return guidePlinth();}
/* Built, moved or taken away - called once per level load, from loadLevel. */
function guideSync(){
  var p=guidePlinth();
  if(!p){guideDrop();return;}
  if(!GD){
    if(typeof THREE==="undefined"||typeof scene==="undefined"||!scene)return;
    var mat=new THREE.MeshBasicMaterial({color:GUIDE_COL});
    var m=buildPlayerMesh("cube",GUIDE_COL,mat);
    m.scale.setScalar(GUIDE_SIZE);
    scene.add(m);
    /* THE PLINTH IS A SLAB, NOT A BLOCK, and it is drawn half a block high
       for exactly that reason: a full cube out there would look like a piece
       of the level that had come loose, and somebody would try to fold onto
       it. Half height, its own colour, no grain - it is furniture. */
    var slab=new THREE.Mesh(new THREE.BoxGeometry(.92,.5,.92),
      new THREE.MeshLambertMaterial({color:0x77809a}));
    var edge=new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(.92,.5,.92)),
      new THREE.LineBasicMaterial({color:0xaab4cc,transparent:true,opacity:.5}));
    slab.add(edge);
    scene.add(slab);
    GD={mesh:m,mat:mat,slab:slab,x:0,y:0,z:0,said:0,bob:Math.random()*6.283};
  }
  GD.x=p[0];GD.y=p[1]+1;GD.z=p[2];
  GD.mesh.visible=true;
  GD.slab.visible=true;
  GD.mesh.position.set(GD.x,GD.y,GD.z);
  GD.slab.position.set(GD.x,GD.y-.75,GD.z);
  guideHide();
  /* AND IF THIS LEVEL HAS BEATEN YOU TEN TIMES, HE SPEAKS FIRST. The game
     has already offered a skip twice by then (struggleOffer fires on every
     third loss); this is not a third offer, it is somebody saying out loud
     that taking it is allowed. Pressing the bubble is what opens the card. */
  var n=(typeof fails!=="undefined"&&levelKey&&fails[levelKey])||0;
  if(n>=GUIDE_STUCK_AT)setTimeout(function(){
    if(GD&&app==="play")guideSay(GUIDE_STUCK,true);
  },900);
}
function guideDrop(){
  if(!GD)return;
  if(typeof scene!=="undefined"&&scene){
    if(GD.mesh)scene.remove(GD.mesh);
    if(GD.slab)scene.remove(GD.slab);
  }
  if(GD.mesh&&GD.mesh.geometry&&GD.mesh.geometry.dispose)GD.mesh.geometry.dispose();
  if(GD.slab&&GD.slab.geometry&&GD.slab.geometry.dispose)GD.slab.geometry.dispose();
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
function guideFrame(dtMs,rx,rz,tdvx,tdvz,ft){
  if(!GD)return;
  if(!gdTmp&&typeof THREE!=="undefined")gdTmp=new THREE.Vector3();
  var u=GD.x*rx+GD.z*rz;
  var fx=u*rx+1.0*tdvx, fz=u*rz+1.0*tdvz;
  GD.bob+=dtMs*.0013;
  gdTmp.set(GD.x+(fx-GD.x)*ft, GD.y+Math.sin(GD.bob)*.035, GD.z+(fz-GD.z)*ft);
  GD.mesh.position.lerp(gdTmp,.3);
  GD.mesh.rotation.y=Math.atan2(tdvx,tdvz);
  // The plinth folds with him, one step lower and without the bob.
  if(GD.slab){
    var su=GD.x*rx+GD.z*rz;
    var sx=su*rx+1.0*tdvx, sz=su*rz+1.0*tdvz;
    GD.slab.position.set(GD.x+(sx-GD.x)*ft, GD.y-.75, GD.z+(sz-GD.z)*ft);
    GD.slab.rotation.y=GD.mesh.rotation.y;
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
      gdTmp.copy(GD.mesh.position);gdTmp.y+=.75;
      gdTmp.project(camera);
      var w=window.innerWidth,h=window.innerHeight;
      /* KEPT ON SCREEN. He stands off the right-hand end of the board, so
         the bubble's natural anchor is close to the edge and half of it
         would hang past it. The box is `width:max-content` (see
         css/99-guide.css), so offsetWidth is a real number here and not a
         consequence of where it was put - which is what makes clamping
         against it work rather than feed back on itself. */
      var bw=el.offsetWidth||160, pad=10;
      var gx=(gdTmp.x*.5+.5)*w;
      gx=Math.max(bw/2+pad,Math.min(w-bw/2-pad,gx));
      el.style.left=Math.round(gx)+"px";
      el.style.top=Math.round((-gdTmp.y*.5+.5)*h)+"px";
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
