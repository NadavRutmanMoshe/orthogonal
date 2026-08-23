"use strict";
/* Orthogonal — 09-wardrobe.js
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
  {id:"pup",     name:"Pup",      cost:30}
];
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

function findBy(list,id){for(var i=0;i<list.length;i++)if(list[i].id===id)return list[i];return list[0];}
function owns(id){return wardrobe.owned.indexOf(id)>=0;}
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
  if(shape==="pup"){
    // a few boxes is enough to read as a creature at this size
    g=new THREE.Group();
    var body=new THREE.Mesh(new THREE.BoxGeometry(.5,.32,.34),mat);
    var head=new THREE.Mesh(new THREE.BoxGeometry(.28,.28,.28),mat);
    head.position.set(.3,.16,0);
    var snout=new THREE.Mesh(new THREE.BoxGeometry(.14,.1,.14),mat);
    snout.position.set(.46,.09,0);
    var earL=new THREE.Mesh(new THREE.BoxGeometry(.07,.14,.06),mat);
    earL.position.set(.24,.34,.1);
    var earR=earL.clone();earR.position.z=-.1;
    var tail=new THREE.Mesh(new THREE.BoxGeometry(.18,.07,.07),mat);
    tail.position.set(-.3,.14,0);tail.rotation.z=.5;
    [body,head,snout,earL,earR,tail].forEach(function(m){g.add(m);});
    [[-.16,.14],[-.16,-.14],[.16,.14],[.16,-.14]].forEach(function(o){
      var leg=new THREE.Mesh(new THREE.BoxGeometry(.09,.2,.09),mat);
      leg.position.set(o[0],-.24,o[1]);g.add(leg);
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
  if(footMesh)footMesh.material.color.setHex(col);
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
  sc.add(new THREE.AmbientLight(0xffffff,.72));
  var key=new THREE.DirectionalLight(0xffffff,.46);
  key.position.set(2.4,3.2,2.6);sc.add(key);
  var fill=new THREE.DirectionalLight(0xffffff,.16);
  fill.position.set(-2.2,.6,-1.8);sc.add(fill);
  var root=new THREE.Group();sc.add(root);
  var reduce=window.matchMedia&&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  pv={renderer:r,scene:sc,camera:cam,root:root,canvas:cv,
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
function previewShow(shape,colorId,w3,w2,plane){
  if(!pv)return;
  var root=pv.root;
  while(root.children.length)root.remove(root.children[0]);
  var col=findBy(SKIN_COLORS,colorId).hex;
  var v=findBy(WORLDS3D,w3), p=findBy(WORLDS2D,w2);
  var bg=plane?p.paper:v.void, blockCol=plane?p.ink:v.block;
  pv.scene.background=new THREE.Color(bg);

  var slabMat=new THREE.MeshLambertMaterial({color:blockCol});
  var slab=new THREE.Mesh(new THREE.BoxGeometry(1,.5,1),slabMat);
  slab.position.y=-.62;root.add(slab);
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
