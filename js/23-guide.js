"use strict";
/* I'm Just A Cube — 23-guide.js
   The neighbour, standing in your levels, with something to say.

   Loaded after 21-boot.js like 22-story.js, and for the same reason: this
   file only declares, and every call into it is `typeof`-guarded.

   ============================================================
   WHO HE IS

   The white father from the house next door - the one who walked over to the
   boy after the census took his parents, in the opening cutscene. He is in
   the tutorial and through the whole of I · NATURE, standing somewhere on
   the board, and pressing him gets you a piece of advice about the game.

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
   WHERE HE STANDS

   Nowhere by hand. `guideSpot()` picks a square deterministically: any block
   with clear air above it, never the start's or the goal's, scored on how
   far it is from BOTH of them and tie-broken on the lowest and leftmost. So
   he ends up in a corner of the board out of the working area, the same
   square every time you come back to that level, and he never has to be
   placed by a person or checked by a test.

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
   WHAT HE KNOWS

   Ordered, and the order is the campaign's: the fold, then the two buttons
   that help, then what the score is for, then the pieces I · NATURE actually
   contains. A tip about water or crates would be a spoiler in section one,
   and worse, advice about a thing the player has no way to try.

   `{do:2d}` and friends go through tutWords(), so every line names the
   player's OWN controls - the same rule the coach and the primer follow, and
   the reason none of these say "press the button" in words.
   ============================================================ */
var GUIDE_TIPS=[
  "{do:2d} to drop the world flat. Things far apart in depth land side by side.",
  "Hold the eye to lean and see depth. It costs you nothing - it is not a move.",
  "Flat, the eye shows which block you would stand back up on. Look before you go.",
  "Stuck on one? The bulb gives you the next move. You get three, and one comes back every half hour.",
  "Stars are for solving in few moves, not for solving at all. Nobody gets them first time.",
  "Spend your stars in the wardrobe. Some of the shapes in there cannot be bought at all.",
  "Restarting costs you nothing. Only the move count is ever scored.",
  "Amber catches you when you come back to 3D, even when something else is nearer the camera.",
  "Two fingers turn the world. Which way you fold is most of the puzzle.",
  "If a fold would crush you, the button says so before you press it. Look at it, not at the board.",
  "Water holds you up and casts nothing, so in 2D there is nothing of it left.",
  "You can build your own levels. MY LEVELS, on the home screen."
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
  if(typeof playSource!=="undefined"&&playSource!=="builtin")return false;
  if(typeof storyOn==="function"&&storyOn())return false;
  if(app!=="play")return false;
  if(!L||L.boss||L.trial)return false;
  if(typeof SECTIONS==="undefined"||typeof mapSecOf!=="function")return idx<=18;
  var sec=mapSecOf(idx);
  return sec===0||sec===1;
}
/* THE SQUARE HE STANDS ON, decided rather than authored. Deterministic, so a
   level looks the same every time it is opened, and no two levels need a
   field adding to them. */
function guideSpot(){
  if(!L||!L.blocks)return null;
  var occ={},i,b;
  for(i=0;i<L.blocks.length;i++){
    b=L.blocks[i];occ[K(b[0],b[1],b[2])]=1;
  }
  var st=L.start||[0,0,0], gl=L.goal||st, best=null, bs=-1;
  function d(a,x,y,z){
    return Math.abs(a[0]-x)+Math.abs(a[1]-y)+Math.abs(a[2]-z);
  }
  for(i=0;i<L.blocks.length;i++){
    b=L.blocks[i];
    // Stone only, and only where there is air to stand in.
    if(b[3]&&b[3]!==0)continue;
    var x=b[0],y=b[1]+1,z=b[2];
    if(occ[K(x,y,z)])continue;
    if(x===st[0]&&y===st[1]&&z===st[2])continue;
    if(x===gl[0]&&y===gl[1]&&z===gl[2])continue;
    var s=Math.min(d(st,x,y,z),d(gl,x,y,z));
    /* Tie-broken low and to the left, so the answer cannot depend on the
       order blocks happen to be listed in. */
    if(s>bs||(s===bs&&best&&(y<best[1]||(y===best[1]&&x<best[0])))){
      bs=s;best=[x,y,z];
    }
  }
  /* THREE SQUARES CLEAR OF BOTH, or he does not appear at all. Two put him
     inside the working area of the tighter boards, where a white cube on a
     block the player is trying to read is worse than no neighbour. At three
     he is on fifteen of the sixteen levels he is eligible for, which is what
     "almost every level" means and is a better answer than a bystander in
     the way on the sixteenth. */
  return bs>=3?best:null;
}
/* Built, moved or taken away - called once per level load, from loadLevel. */
function guideSync(){
  var spot=guideHere(typeof lvIndex==="number"?lvIndex:-1)?guideSpot():null;
  if(!spot){guideDrop();return;}
  if(!GD){
    if(typeof THREE==="undefined"||typeof scene==="undefined"||!scene)return;
    /* Slightly see-through, which is the one concession his being scenery
       gets: he stands on a real block on a real board, and a solid cube
       would be able to hide the thing a player is trying to look at. */
    var mat=new THREE.MeshBasicMaterial({color:GUIDE_COL,transparent:true,
      opacity:.93});
    var m=buildPlayerMesh("cube",GUIDE_COL,mat);
    m.scale.setScalar(GUIDE_SIZE);
    scene.add(m);
    GD={mesh:m,mat:mat,x:0,y:0,z:0,said:0,bob:Math.random()*6.283};
  }
  GD.x=spot[0];GD.y=spot[1];GD.z=spot[2];
  GD.mesh.visible=true;
  GD.mesh.position.set(GD.x,GD.y,GD.z);
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
  if(GD.mesh&&typeof scene!=="undefined"&&scene)scene.remove(GD.mesh);
  if(GD.mesh&&GD.mesh.geometry&&GD.mesh.geometry.dispose)GD.mesh.geometry.dispose();
  GD=null;
  guideHide();
}

/* ============================================================
   WHAT HE SAYS
   ============================================================ */
function guideTip(){
  var i=(typeof lvIndex==="number"?lvIndex:0);
  return GUIDE_TIPS[((i%GUIDE_TIPS.length)+GUIDE_TIPS.length)%GUIDE_TIPS.length];
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
      el.style.left=Math.round((gdTmp.x*.5+.5)*w)+"px";
      el.style.top=Math.round((-gdTmp.y*.5+.5)*h)+"px";
    }
  }
}
