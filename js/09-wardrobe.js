"use strict";
/* I'm Just A Cube — 09-wardrobe.js
   Skins, palettes and the star economy.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   WARDROBE — what you look like, and what the world looks like.

   Worlds only ever change the world (background, stone, ink).
   The pieces keep their own colours and their shape markers, so
   no world can make a mechanic unreadable.

   PRICING. Shapes cost most, then colours, then worlds. That is
   the order players are said to care about them in, and price
   should track desire rather than how much work a thing was.
   Nothing costs over 30, which is what keeps the ad tiers whole:
   adsFor() charges one ad per 10, so 30 is exactly three ads and
   no item is unreachable by watching.
   ============================================================ */
var SKIN_COLORS=[
  {id:"rose",   name:"Rose",      hex:0xd6336c, cost:0},
  // The plain ones people actually ask for, priced cheapest. "Black" and
  // "White" are a charcoal and an off-white rather than #000 and #fff: the
  // player is drawn against the void in 3D and against paper in 2D, and a
  // true black vanishes into the first while a true white vanishes into the
  // second. The adaptive outline in buildPlayerMesh does the rest.
  {id:"black",  name:"Black",     hex:0x2b2f3a, cost:6},
  {id:"white",  name:"White",     hex:0xf4f6fa, cost:6},
  {id:"red",    name:"Red",       hex:0xe03131, cost:6},
  {id:"blue",   name:"Blue",      hex:0x3b7dd8, cost:6},
  {id:"green",  name:"Green",     hex:0x37b24d, cost:6},
  {id:"yellow", name:"Yellow",    hex:0xf5c518, cost:6},
  {id:"brown",  name:"Brown",     hex:0x8b5e3c, cost:8},
  {id:"pink",   name:"Pink",      hex:0xff6fae, cost:8},
  {id:"grey",   name:"Grey",      hex:0x93a0b8, cost:6},
  {id:"amberc", name:"Amber",     hex:0xe89b3c, cost:8},
  {id:"lime",   name:"Lime",      hex:0x9ecb3a, cost:8},
  {id:"jade",   name:"Jade",      hex:0x35c2a5, cost:8},
  {id:"sky",    name:"Sky",       hex:0x4bb3e8, cost:8},
  {id:"violet", name:"Violet",    hex:0x9b7fd4, cost:8},
  {id:"coral",  name:"Coral",     hex:0xf2705d, cost:10},
  {id:"bubble", name:"Bubblegum", hex:0xf58fc2, cost:10},
  {id:"mint",   name:"Mint",      hex:0x7fe3b8, cost:10},
  {id:"gold",   name:"Gold",      hex:0xf2d16b, cost:12},
  {id:"ice",    name:"Ice",       hex:0xc8e6f5, cost:12},
  {id:"ember",  name:"Ember",     hex:0xff5a3c, cost:14}
];
var SKIN_SHAPES=[
  {id:"cube",    name:"Cube",     cost:0},
  {id:"sphere",  name:"Ball",     cost:16},
  {id:"pyramid", name:"Pyramid",  cost:16},
  {id:"diamond", name:"Diamond",  cost:18},
  {id:"barrel",  name:"Barrel",   cost:18},
  {id:"donut",   name:"Donut",    cost:22},
  {id:"star",    name:"Shard",    cost:24},
  /* A CHARACTER RATHER THAN A SOLID, like the Pup - and the one piece in
     chess that only ever moves along the axes, which is the whole game.

     IT IS THE FIRST THING IN THE GAME SOLD FOR MONEY. `deal:true` takes it
     out of the SHAPE grid and puts it on the DEALS tab; `usd` is the price
     and `cost:0` means there is no star price to fall back on. It cannot be
     watched open either - adsFor() is never consulted for a deal - which is
     the point of the tab: everything else in the catalogue is earned or
     watched, and this shelf is the one that is not. */
  {id:"rook",    name:"Rook",     cost:0, deal:true, usd:"2.99"},
  {id:"pup",     name:"Pup",      cost:30},
  /* THE FOUR THAT CANNOT BE BOUGHT.

     One per numbered section, granted for taking every star in it, and each
     is that section's own element standing up as a character: the nature
     section gives a sapling, fire a flame, water a fish, the desert a
     cactus. `sec` is the SECTIONS index that awards it and `cost` is 0
     because there is no price - `reward:true` is what stops the wardrobe
     offering a BUY or an ad for them.

     SHAPES ONLY, and that is the owner's call rather than an accident: a
     reward that also changed your colour would overwrite a thing the player
     chose, and these are meant to be worn with whatever they already like.
     Every one of them takes the equipped colour like every other shape. */
  {id:"sapling", name:"Sapling",  cost:0, reward:true, sec:1},
  {id:"flame",   name:"Flame",    cost:0, reward:true, sec:2},
  {id:"minnow",  name:"Minnow",   cost:0, reward:true, sec:3},
  {id:"cactus",  name:"Cactus",   cost:0, reward:true, sec:4}
];
/* Which shape a section awards, and whether it has been taken. Kept as
   lookups over SKIN_SHAPES rather than a second table, so adding a reward is
   one row above and nothing else. */
function rewardShapeFor(n){
  for(var i=0;i<SKIN_SHAPES.length;i++)
    if(SKIN_SHAPES[i].reward&&SKIN_SHAPES[i].sec===n)return SKIN_SHAPES[i];
  return null;
}
/* GRANT, ONCE. Returns the item if this call is what earned it and null if
   it was already owned, so the caller can decide whether it is news.

   Deliberately not routed through the star balance: `spent` is untouched, so
   a reward can never cost a player anything and can never be undone by
   spending. It is also not a skip - it is the one thing in the game that
   only three-starring can produce. */
function grantShape(id){
  if(!id||owns(id))return null;
  wardrobe.owned.push(id);
  saveWardrobe();
  return findBy(SKIN_SHAPES,id);
}
/* Every section that is finished on every star, granted. Run on boot as well
   as at the moment the last star lands, because a save from before these
   existed has mastered sections in it already and would otherwise have to
   re-finish them to be paid. */
function sweepSectionRewards(){
  if(typeof sectionSpans!=="function")return;
  var sp=sectionSpans();
  for(var n=0;n<sp.length;n++){
    var it=rewardShapeFor(n);
    // sectionMastered() is not used on purpose: it answers yes to everything
    // while the mastery preview switch is on, and a preview must never be
    // able to pay out.
    if(it&&sp[n].max>0&&!sp[n].locked&&sp[n].got===sp[n].max)grantShape(it.id);
  }
}
/* The world used to be one purchase covering both dimensions, which meant
   buying a look for the volume silently bought a look for the plane you had
   never seen. They are two different pictures - you spend the whole game
   switching between them - so they are now two catalogues, bought apart.
   Ids carry a v_/p_ prefix because wardrobe.owned is one flat list and the
   two halves of a world would otherwise collide on the same id. */
var WORLDS3D=[
  {id:"v_indigo",   name:"Indigo",    cost:0,  void:0x0f1424, block:0x5a6d94},
  {id:"v_blueprint",name:"Blueprint", cost:6,  void:0x0d2b45, block:0x4a7fb5},
  {id:"v_newsprint",name:"Charcoal",  cost:6,  void:0x2a2622, block:0x7d7466},
  {id:"v_moss",     name:"Moss",      cost:8,  void:0x101c16, block:0x557a5e},
  {id:"v_nocturne", name:"Nocturne",  cost:10, void:0x07070c, block:0x4a4763},
  {id:"v_rust",     name:"Rust",      cost:12, void:0x241512, block:0x9a5f45}
];
var WORLDS2D=[
  {id:"p_indigo",   name:"Bone",      cost:0,  paper:0xe6e1d3, ink:0x1a1c2b},
  {id:"p_blueprint",name:"Blueprint", cost:6,  paper:0xf2f6fb, ink:0x12304a},
  {id:"p_newsprint",name:"Newsprint", cost:6,  paper:0xefe9dc, ink:0x221f1b},
  {id:"p_moss",     name:"Sage",      cost:8,  paper:0xe6ecdc, ink:0x14201a},
  {id:"p_nocturne", name:"Lilac",     cost:10, paper:0xd8d4e8, ink:0x12111c},
  {id:"p_rust",     name:"Terracotta",cost:12, paper:0xf0e2d2, ink:0x1d100d}
];
var wardrobe={owned:["rose","cube","v_indigo","p_indigo"],
              color:"rose",shape:"cube",world3:"v_indigo",world2:"p_indigo",
              spent:0,ads:{}};

// One ad per 10 stars of price, so 10 or less is one ad, 11-20 is two and
// 21-30 is three. Price and effort stay in step without a second table to
// keep in sync when a cost changes.
function adsFor(cost){return cost<=0?0:Math.ceil(cost/10);}
function adsWatched(id){return (wardrobe.ads&&wardrobe.ads[id])||0;}

/* ============================================================
   THE TWO PASSES — the shelf's other half

   The DEALS tab had one thing on it: a shape, for a price. These two are not
   shapes, and that is the point of them - they are the game's two ceilings
   taken off.

   * NO LIMITS ends the waiting. Hints stop draining, the skip on a fight you
     have lost four times stops asking for a video, and the wardrobe's star
     balance stops being a balance. Every one of those is, today, a thing you
     either wait out or watch an ad for; this is the version of the game
     where you do neither.
   * EVERYTHING is NO LIMITS plus every shape that is sold for money rather
     than earned - the Rook now, and whatever else lands on this shelf later.
     It grants them by rule (`owns()` below) rather than by writing ids into
     the owned list, so a shape added to the catalogue next month is already
     included in a pass bought today.

   AND THE SECOND ONE COSTS LESS ONCE YOU HAVE THE FIRST. Somebody who bought
   NO LIMITS and then wants the shapes is being asked for the shapes, not for
   the pass a second time - so `dealPrice()` swaps in `usdUp`, which is what
   is left after nearly all of the first purchase comes off. Selling the same
   thing twice is how a shelf like this loses the people who already paid.

   The four rewards (`reward:true` in SKIN_SHAPES) are NOT in EVERYTHING and
   never will be: they are score, and the game's oldest rule about money is
   that it buys progress and never score.
   ============================================================ */
var PASSES=[
  {id:"pass_nolimits", name:"No Limits", deal:true, pass:true, usd:"4.99",
   gives:["Hints never run out","Skip any fight, no ad","Every star in the shop"]},
  {id:"pass_all", name:"Everything", deal:true, pass:true, usd:"9.99",
   /* What it costs once NO LIMITS is already owned: 9.99 less 4.50 of the
      4.99 already paid, so the upgrade is the shapes and almost nothing
      else. Written out rather than computed, because a price is a decision
      and not a sum. */
   usdUp:"5.49", needs:"pass_nolimits",
   gives:["Everything in No Limits","Every shape sold for money",
          "Any that are added later"]},
];
function isPass(it){return !!(it&&it.pass);}
/* Which passes are in force. `pass_all` contains `pass_nolimits`, so it is
   asked here once rather than at each of the five places that read it. */
function hasPass(id){
  return wardrobe.owned.indexOf(id)>=0 ||
         (id==="pass_nolimits"&&wardrobe.owned.indexOf("pass_all")>=0);
}
function noLimits(){return hasPass("pass_nolimits");}
/* The upgrade price, or the plain one. Also what the grid and the case print,
   so the two cannot disagree about what this costs right now. */
function dealPrice(it){
  if(it&&it.usdUp&&it.needs&&hasPass(it.needs))return it.usdUp;
  return it&&it.usd;
}
function dealDiscounted(it){return dealPrice(it)!==(it&&it.usd);}

function findBy(list,id){for(var i=0;i<list.length;i++)if(list[i].id===id)return list[i];return list[0];}
/* OWNED, OR COVERED BY A PASS. EVERYTHING carries every shape on the money
   shelf, so those are answered by the pass rather than copied into the owned
   list - which is what lets a shape added to SKIN_SHAPES later be included in
   a pass bought before it existed. */
function owns(id){
  if(wardrobe.owned.indexOf(id)>=0)return true;
  if(wardrobe.owned.indexOf("pass_all")>=0){
    var it=null;
    for(var i=0;i<SKIN_SHAPES.length;i++)
      if(SKIN_SHAPES[i].id===id){it=SKIN_SHAPES[i];break;}
    if(it&&it.deal)return true;
  }
  return false;
}
function starsEarned(){
  var t=0;
  for(var i=0;i<LEVELS.length;i++){
    if(LEVELS[i].tutorial)continue;      // teaching levels pay no shards
    t+=starsForRecord(LEVELS[i],progress[LEVELS[i].name]);
  }
  return t;
}
// TESTING SWITCH - set back to false before shipping.
// The catalogue totals 283 against 189 earnable by perfect play, so buying
// every item is normally impossible; this hands over enough to walk the whole
// wardrobe. Buying still runs the real code path - it pushes to owned and
// charges wardrobe.spent - so what gets tested is the actual purchase flow,
// not a bypass of it. Flip this to false and the true balance returns, since
// starsEarned() and wardrobe.spent are both untouched by it.
var UNLIMITED_SHARDS=true;
function shards(){
  if(UNLIMITED_SHARDS)return 9999;
  // NO LIMITS: the shop stops being a balance. Buying still runs the real
  // path - it pushes to owned and adds to `spent` - so nothing downstream
  // needs to know, and the true balance comes back if the pass ever goes.
  if(noLimits())return 9999;
  return Math.max(0,starsEarned()-wardrobe.spent);
}

function playerGeometry(id){
  switch(id){
    case "sphere":  return new THREE.SphereGeometry(.34,20,14);
    case "pyramid": return new THREE.ConeGeometry(.42,.68,4);
    case "diamond": return new THREE.OctahedronGeometry(.42);
    case "barrel":  return new THREE.CylinderGeometry(.31,.31,.62,18);
    case "donut":   return new THREE.TorusGeometry(.26,.12,10,20);
    case "star":    return new THREE.IcosahedronGeometry(.4,0);
    default:        return new THREE.BoxGeometry(.62,.62,.62);
  }
}
// Takes the shape, colour and material explicitly, defaulting to whatever is
// equipped. The wardrobe's display case needs to build an item the player does
// not own and has not equipped, which reading the globals directly could never
// do; the game still calls this with no arguments and gets what it always got.
function buildPlayerMesh(shape,col,mat){
  shape=shape||wardrobe.shape;
  if(col===undefined)col=findBy(SKIN_COLORS,wardrobe.color).hex;
  mat=mat||new THREE.MeshBasicMaterial({color:col});
  var g;
  /* The two assembled shapes. Everything else in the catalogue is one
     primitive from playerGeometry(); these are a handful of boxes, which is
     all a silhouette this size needs and is also what the world is made of. */
  function bx(w,h,d,x,y,z){
    var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z);g.add(m);return m;
  }
  if(shape==="sapling"){
    // Trunk and three staggered slabs. The stagger is what makes a canopy
    // out of boxes; one slab is a table.
    g=new THREE.Group();
    bx(.14,.32,.14,0,-.15,0);            // trunk, clear of the canopy
    bx(.44,.15,.44,0,.06,0);
    bx(.32,.13,.32,0,.17,0);
    bx(.19,.11,.19,0,.26,0);
  } else if(shape==="flame"){
    /* LOW-POLY, NOT VOXEL - and that is the whole fix.

       This was boxes twice: a stepped stack, then a leaning stepped stack
       with a second stack beside it. Both were reported as looking bad and
       both readings were the same one, because a stack of axis-aligned
       squares has a staircase for a silhouette, and a staircase is masonry.
       No arrangement of boxes gets out of that; a flame's whole identity is
       a smooth curve to a point.

       So it is the one shape in the catalogue that is not built from the
       game's own cubes. THREE.LatheGeometry spins a profile - a teardrop,
       fattest a third of the way up, tapering to a point - and SEVEN radial
       segments keep it faceted rather than smooth. That is a deliberate
       low-poly flame rather than a failed round one, and it sits with the
       rest of the game because everything here is already flat-shaded
       polygons with their edges drawn.

       `flatShading` is set on a CLONE of the material handed in. The
       original is shared with whatever else the caller is drawing, and one
       shape must not decide how the others are lit. */
    g=new THREE.Group();
    var fmat=(mat&&mat.clone)?mat.clone():mat;
    if(fmat){fmat.flatShading=true;fmat.needsUpdate=true;}
    /* AND THE TIP HOOKS. A teardrop spun on its axis is a droplet, or a
       fruit; what makes it fire is that the point curls off to one side. The
       lathe cannot say that, so the vertices above the waist are pushed
       sideways by the square of their height - nothing at the middle,
       everything at the tip - and the normals are recomputed so the facets
       still catch the light correctly afterwards. */
    function flame(s,x,y,z,tilt,hook){
      var prof=[[0,-.310],[.115,-.302],[.200,-.245],[.243,-.140],[.246,-.030],
                [.205,.070],[.148,.155],[.092,.225],[.042,.278],[0,.315]];
      var pts=prof.map(function(q){
        return new THREE.Vector2(q[0]*s,q[1]*s);
      });
      var geo=new THREE.LatheGeometry(pts,7);
      var pos=geo.attributes.position, top=.315*s;
      for(var i=0;i<pos.count;i++){
        var vy=pos.getY(i);
        if(vy<=0)continue;
        var t=vy/top;
        pos.setX(i,pos.getX(i)+hook*t*t*s);
      }
      pos.needsUpdate=true;
      geo.computeVertexNormals();
      var m=new THREE.Mesh(geo,fmat);
      m.position.set(x,y,z);
      m.rotation.z=tilt;
      g.add(m);
      return m;
    }
    flame(1,0,0,0,-.06,.17);             // the flame, leaning, tip curled
    flame(.52,-.185,-.135,.075,.30,.12); // a tongue at its foot, in front
    flame(.30,.175,-.19,-.055,-.34,-.10);// and a smaller one behind
  } else if(shape==="minnow"){
    // Flat in z on purpose: a fish read as a loaf until the body was thinner
    // than it is tall, and the fins are what carry the rest.
    g=new THREE.Group();
    bx(.42,.28,.20,.03,0,0);            // body
    bx(.14,.20,.16,.28,-.01,0);         // head
    bx(.05,.06,.07,.37,.03,0);          // snout
    bx(.10,.07,.14,-.20,0,0);           // wrist
    bx(.07,.28,.09,-.28,0,0);           // tail fin
    bx(.14,.11,.05,.02,.19,0);          // dorsal
    bx(.10,.08,.05,0,-.19,0);           // belly
    bx(.10,.07,.05,.13,-.03,.12);       // pectorals
    bx(.10,.07,.05,.13,-.03,-.12);
  } else if(shape==="cactus"){
    // A saguaro: one column and two arms at different heights, because two
    // arms at the same height is a candelabra.
    g=new THREE.Group();
    bx(.20,.60,.20,0,-.01,0);
    bx(.16,.10,.14,-.17,.02,0);
    bx(.10,.20,.13,-.22,.16,0);
    bx(.14,.09,.13,.16,-.09,0);
    bx(.10,.16,.12,.20,.03,0);
  } else if(shape==="rook"){
    /* THE CASTLE, bottom to top: a wide foot, a plinth, the shaft, the
       collar under the crown, and four merlons at the corners so the notches
       between them read as a battlement from any of the four camera views
       the game turns through. Fits the cube's own .62, foot to merlon, so it
       does not stand taller than the piece it replaces. */
    g=new THREE.Group();
    bx(.50,.09,.50,0,-.27,0);            // foot
    bx(.42,.05,.42,0,-.20,0);            // plinth
    bx(.32,.30,.32,0,-.02,0);            // shaft
    bx(.44,.07,.44,0,.17,0);             // collar
    [[.145,.145],[.145,-.145],[-.145,.145],[-.145,-.145]].forEach(function(o){
      bx(.15,.10,.15,o[0],.255,o[1]);    // merlons
    });
  } else if(shape==="pup"){
    /* THE ORIGINAL PUP, PUT BACK. It was rebuilt stockier - bigger head, a
       muzzle out front, ears hanging, a raised tail - on the reading that it
       looked like a fawn rather than a dog. The owner played both and called
       this one cuter, which is the only test that matters on a thing whose
       whole job is to be liked; the note about what it reads as goes in
       docs/HISTORY.md rather than into another rebuild.

       WHAT DID NEED FIXING WAS THE ICON, and that is a separate thing on a
       separate screen: the wardrobe tile's glyph was a half-filled circle,
       which is what the player actually picks the Pup by. See shapeGlyph()
       in js/16-panels.js - that stays. */
    g=new THREE.Group();
    bx(.5,.32,.34,0,0,0);                // body
    bx(.28,.28,.28,.3,.16,0);            // head
    bx(.14,.1,.14,.46,.09,0);            // snout
    bx(.07,.14,.06,.24,.34,.1);          // ears, upright
    bx(.07,.14,.06,.24,.34,-.1);
    bx(.18,.07,.07,-.3,.14,0).rotation.z=.5;   // tail
    [[-.16,.14],[-.16,-.14],[.16,.14],[.16,-.14]].forEach(function(o){
      bx(.09,.2,.09,o[0],-.24,o[1]);     // legs
    });
  } else {
    g=new THREE.Mesh(playerGeometry(shape),mat);
  }
  addOutline(g);
  return g;
}
/* A rim on the player, kept in contrast with whatever is behind it.

   Colours like Black and White exist because players ask for them, but the
   player is drawn against the void in 3D and against paper in 2D - two
   backgrounds at opposite ends of the range - so any single colour choice
   is invisible against one of them. Rather than refusing the colours or
   fudging them to mid-grey, the silhouette is drawn explicitly and its
   colour is re-picked from the background every frame in animate().
   Blocks already carry edge lines, so this reads as of a piece with them. */
function addOutline(obj){
  var outs=[];
  obj.traverse(function(c){
    if(!c.isMesh)return;
    var e=new THREE.LineSegments(
      new THREE.EdgesGeometry(c.geometry,28),
      new THREE.LineBasicMaterial({transparent:true,opacity:.5}));
    c.add(e);outs.push(e);
  });
  obj.userData.outlines=outs;
}
function applyPalette(){
  var v=findBy(WORLDS3D,wardrobe.world3), p=findBy(WORLDS2D,wardrobe.world2);
  colVoid.setHex(v.void);colBlock.setHex(v.block);
  colPaper.setHex(p.paper);colInk.setHex(p.ink);
  var css=document.documentElement.style;
  css.setProperty("--void","#"+v.void.toString(16).padStart(6,"0"));
  css.setProperty("--paper","#"+p.paper.toString(16).padStart(6,"0"));
  css.setProperty("--ink","#"+p.ink.toString(16).padStart(6,"0"));
  /* THE SECTION HAS THE LAST WORD. Sections own the world now, and this runs
     on every skin change - which is after loadLevel has set the section's
     theme - so without putting it back a trip to the wardrobe left the level
     wearing the default palette until it was next loaded. applyTheme() only
     re-applies colours when the theme has not changed, so this is cheap. */
  if(typeof applyTheme==="function"&&typeof curTheme!=="undefined"&&curTheme)
    applyTheme(curTheme);
}
function applySkin(){
  if(!playerMesh)return;
  var pos=playerMesh.position.clone();
  scene.remove(playerMesh);
  playerMesh=buildPlayerMesh();
  playerMesh.position.copy(pos);
  scene.add(playerMesh);
  var col=findBy(SKIN_COLORS,wardrobe.color).hex;
  // The shield bubble is the player's own colour: whose shield it is, is the
  // content of it.
  if(typeof shieldFill!=="undefined"&&shieldFill)
    shieldFill.material.color.setHex(col);
  // The step trail is whose steps they are, so it follows the piece. One
  // shared material, so this is one write however long the trail is.
  if(typeof trailTint==="function")trailTint(col);
  document.documentElement.style.setProperty("--player",
    "#"+col.toString(16).padStart(6,"0"));
}
/* ============================================================
   THE DISPLAY CASE
   A second, small WebGL context living inside the wardrobe panel, showing
   one item turning on a stand so you can look at it before you pay for it.

   Two things worth knowing before changing this:

   * It must be torn down when the panel closes. Browsers cap how many live
     WebGL contexts a page may hold (commonly 16) and silently kill the
     oldest past that - which would be the game's own renderer. Opening the
     wardrobe a dozen times in a session is entirely normal, so previewStop()
     explicitly loses the context rather than trusting the GC.
   * It lights the item, unlike the game, which is flat MeshBasicMaterial
     throughout. A flat-shaded sphere is a circle and a flat-shaded turning
     cube barely reads, so rotation would be invisible - the one thing the
     display case exists to show. Ambient is kept high and the directional
     low so the item still reads as the flat colour you are buying.
   ============================================================ */
var pv=null;
var PV_IDLE=0.0042;   // gentle unattended turn, so the case never looks frozen

function previewStop(){
  if(!pv)return;
  cancelAnimationFrame(pv.raf);
  try{
    var gl=pv.renderer.getContext();
    var ext=gl&&gl.getExtension("WEBGL_lose_context");
    if(ext)ext.loseContext();
  }catch(e){}
  pv.renderer.dispose();
  pv=null;
}
function previewStart(cv){
  previewStop();
  var r=new THREE.WebGLRenderer({antialias:true,canvas:cv,alpha:false});
  r.setPixelRatio(Math.min(window.devicePixelRatio,2));
  var sc=new THREE.Scene();
  var cam=new THREE.PerspectiveCamera(34,1,.1,50);
  cam.position.set(0,.72,3.05);
  cam.lookAt(0,-.05,0);
  /* Ambient and key are both eased off from .72/.46 to make room for the
     footlights below: with the old flat rig plus two coloured lamps the
     front of the piece washed out to near-white and the slab took the
     player's hue as paint rather than as light. */
  sc.add(new THREE.AmbientLight(0xffffff,.58));
  var key=new THREE.DirectionalLight(0xffffff,.40);
  key.position.set(2.4,3.2,2.6);sc.add(key);
  var fill=new THREE.DirectionalLight(0xffffff,.16);
  fill.position.set(-2.2,.6,-1.8);sc.add(fill);
  /* THE FOOTLIGHTS, on the scene rather than on the root so the item turns
     under them. Their colour is written per item by previewShow(); they are
     born white and dim here only so a case built before anything is shown
     still lights. Range 4.2 keeps them off the backdrop. */
  var lampA=new THREE.PointLight(0xffffff,.6,4.2);
  lampA.position.set(-1.15,-.42,1.35);sc.add(lampA);
  var lampB=new THREE.PointLight(0x6fa8ff,.36,4.2);
  lampB.position.set(1.15,-.42,1.35);sc.add(lampB);
  var root=new THREE.Group();sc.add(root);
  var reduce=window.matchMedia&&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  pv={renderer:r,scene:sc,camera:cam,root:root,canvas:cv,
      lampA:lampA,lampB:lampB,
      yaw:-0.62,pitch:0.13,vel:0,raf:0,idle:reduce?0:PV_IDLE,drag:false};
  previewSize();
  previewDrag(cv);
  (function loop(){
    if(!pv)return;
    pv.raf=requestAnimationFrame(loop);
    if(!pv.drag){
      pv.yaw+=pv.vel+pv.idle;
      pv.vel*=.93;
      if(Math.abs(pv.vel)<1e-4)pv.vel=0;
    }
    pv.root.rotation.y=pv.yaw;
    pv.root.rotation.x=pv.pitch;
    pv.renderer.render(pv.scene,pv.camera);
  })();
}
function previewSize(){
  if(!pv)return;
  var w=pv.canvas.clientWidth||160, h=pv.canvas.clientHeight||160;
  pv.renderer.setSize(w,h,false);
  pv.camera.aspect=w/h;
  pv.camera.updateProjectionMatrix();
}
// Drag to spin, with the throw carried into inertia on release. Pointer events
// cover mouse-drag and touch-swipe in one path, and the capture keeps a fast
// swipe that leaves the canvas from stranding the item mid-turn.
function previewDrag(cv){
  var lx=0,ly=0,id=null;
  cv.addEventListener("pointerdown",function(e){
    if(!pv)return;
    pv.drag=true;pv.vel=0;id=e.pointerId;
    lx=e.clientX;ly=e.clientY;
    try{cv.setPointerCapture(id);}catch(err){}
    e.preventDefault();e.stopPropagation();
  });
  cv.addEventListener("pointermove",function(e){
    if(!pv||!pv.drag||e.pointerId!==id)return;
    var dx=(e.clientX-lx)*.0115, dy=(e.clientY-ly)*.0115;
    lx=e.clientX;ly=e.clientY;
    pv.yaw+=dx;
    // clamped so you can tip the item to look at its top or underside but
    // never roll it past vertical into a confusing upside-down pose
    pv.pitch=Math.max(-.85,Math.min(.85,pv.pitch+dy));
    pv.vel=dx;
    e.preventDefault();e.stopPropagation();
  });
  function up(e){
    if(!pv||e.pointerId!==id)return;
    pv.drag=false;id=null;
    e.preventDefault();e.stopPropagation();
  }
  cv.addEventListener("pointerup",up);
  cv.addEventListener("pointercancel",up);
}
// Rebuild what is on the stand. Every tab shows the same scene - an item on a
// slab, against a world - with the tab's candidate substituted in, so choosing
// a colour shows it on your shape and choosing a world shows your actual cube
// standing in it. Nothing here touches the equipped state.
// `plane` picks which of the two worlds is being shown: the volume, lit and
// coloured by the 3D world, or the plane, which is what the same geometry
// looks like after a fold. Showing the 2D catalogue as a 3D scene would be
// previewing the wrong picture entirely - it is bought precisely for how the
// flattened world reads.
/* THE CASE'S OWN LIGHT.

   The stand was a flat fill, a slab, and an object - correct, and dead. It
   is the only place in the game where you look at the thing you own for its
   own sake, and it read as a thumbnail. Three procedural pieces fix that,
   and all three are drawn rather than loaded, like everything else here:

   - A BACKDROP that is darkest at the top and lifts toward the floor, so
     the piece stands in a space instead of on a colour.
   - A POOL OF LIGHT under it on the slab, in the piece's own colour, added
     rather than blended so it reads as light and not as paint.
   - TWO FOOTLIGHTS at the front corners, low, one in the piece's colour and
     one cool - the "lights at the bottom". They live on the SCENE and not on
     the spinning root, so the object turns under them: a highlight that
     travels round an edge as it rotates is the whole reason a display case
     looks like one.

   The canvases are 64px and cached by colour, because previewShow() runs on
   every tap in the catalogue. */
var pvTex={};
function pvGradTex(key,draw){
  if(pvTex[key])return pvTex[key];
  var c=document.createElement("canvas");c.width=c.height=64;
  draw(c.getContext("2d"),64);
  var t=new THREE.CanvasTexture(c);
  pvTex[key]=t;return t;
}
function hexCss(h){return "#"+h.toString(16).padStart(6,"0");}
// A colour pulled toward black or toward white, whichever the ground is not.
function pvShade(hex,k){
  var c=new THREE.Color(hex);
  c.r*=k;c.g*=k;c.b*=k;
  return "#"+c.getHexString();
}
function previewShow(shape,colorId,w3,w2,plane){
  if(!pv)return;
  var root=pv.root;
  while(root.children.length)root.remove(root.children[0]);
  var col=findBy(SKIN_COLORS,colorId).hex;
  var v=findBy(WORLDS3D,w3), p=findBy(WORLDS2D,w2);
  var bg=plane?p.paper:v.void, blockCol=plane?p.ink:v.block;
  /* A vertical wash rather than a flat fill. On a light ground (the plane)
     it goes the other way - darker at the floor - so the lift is always
     *toward* the middle of the range and never off the end of it. */
  var lift=plane?0.94:1.45;
  pv.scene.background=pvGradTex("bg"+bg+(plane?"p":"v"),function(x,n){
    var g=x.createLinearGradient(0,0,0,n);
    g.addColorStop(0,pvShade(bg,plane?1.02:0.72));
    g.addColorStop(.62,hexCss(bg));
    g.addColorStop(1,pvShade(bg,lift));
    x.fillStyle=g;x.fillRect(0,0,n,n);
  });

  var slabMat=new THREE.MeshLambertMaterial({color:blockCol});
  var slab=new THREE.Mesh(new THREE.BoxGeometry(1,.5,1),slabMat);
  slab.position.y=-.62;root.add(slab);
  // The pool, lying on the slab's top face (-.62 + .25) with a hair of
  // clearance so it never z-fights with it.
  var pool=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),
    new THREE.MeshBasicMaterial({
      map:pvGradTex("pool",function(x,n){
        var g=x.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);
        g.addColorStop(0,"rgba(255,255,255,.62)");
        g.addColorStop(.45,"rgba(255,255,255,.20)");
        g.addColorStop(1,"rgba(255,255,255,0)");
        x.fillStyle=g;x.fillRect(0,0,n,n);
      }),
      color:col,transparent:true,depthWrite:false,
      blending:THREE.AdditiveBlending}));
  pool.rotation.x=-Math.PI/2;pool.position.y=-.368;root.add(pool);
  // two neighbours at depth, so a world's block colour reads as a world and
  // not as a single lonely brick
  [[-1,-.35],[1,-.35]].forEach(function(o){
    var b=new THREE.Mesh(new THREE.BoxGeometry(1,.5,1),slabMat);
    b.position.set(o[0],-1.12,o[1]);root.add(b);
  });
  var edges=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1,.5,1)),
    new THREE.LineBasicMaterial({color:plane?p.paper:p.ink,
      transparent:true,opacity:.55}));
  edges.position.copy(slab.position);root.add(edges);

  /* The near lamp takes the piece's own colour, the far one stays cool -
     warm key, cool fill, which is the oldest lighting rig there is and the
     cheapest way to make a single-colour object read as solid. Both are
     eased off on a light ground, where a coloured lamp on near-white paper
     is a stain rather than a light. */
  if(pv.lampA){
    pv.lampA.color.setHex(col);
    pv.lampA.intensity=plane?.24:.62;
    pv.lampB.intensity=plane?.14:.38;
  }
  var item=buildPlayerMesh(shape,col,new THREE.MeshLambertMaterial({color:col}));
  item.position.y=-.06;
  outlineFor(item,new THREE.Color(bg));
  root.add(item);
}
// Pick the rim colour that separates a silhouette from its background: light
// on a dark ground, dark on a light one.
var outlineCol=new THREE.Color();
function outlineFor(obj,bg){
  if(!obj||!obj.userData.outlines)return;
  var lum=bg.r*.299+bg.g*.587+bg.b*.114;
  outlineCol.setRGB(lum>.5?.06:.94,lum>.5?.07:.95,lum>.5?.09:1);
  obj.userData.outlines.forEach(function(e){e.material.color.copy(outlineCol);});
}

/* WATER, not glass. The rule is untouched - solid in the volume, casting
   nothing into the plane - but "water" is a reason where "glass" was only
   a fact: it holds you up, and when the world folds it spills, which is why
   there is nothing of it left in the silhouette. Pushed toward a real cyan
   from the old pale grey-blue so it stays the loudest thing in a warm
   section, which is the section that teaches it. */
/* Near-white now, because the WATER SURFACE carries the blue. These
   colours multiply the block's texture, so a saturated one would double the
   hue and come out as ink. Anything with a surface of its own is tinted from
   here only enough to say which piece it is. */
var colGlass=new THREE.Color(0x62b8f0);   // bluer: it is water, not ice
var colAnchor=new THREE.Color(0xd9a441);
/* Near-white, because the OBSIDIAN texture carries the violet now - these
   colours multiply the map, and a saturated tint would double the hue into
   ink. Same reason water and fire were eased off. */
var colCrate=new THREE.Color(0xc4b6e8);
var colCrateHeld=new THREE.Color(0xe0c49a);   // held fast on an anchor: warmer
var colKey=new THREE.Color(0xf2d16b);
// Fire. Charred body under hot flames - see the fire block in 10-render.js.
var colSpike=new THREE.Color(0xd9c0b4);   // the lava crust carries the heat
var spikeGeo=null;
var boxGeo,edgeGeo;
