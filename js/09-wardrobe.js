"use strict";
/* Orthogonal — 09-wardrobe.js
   Skins, palettes and the star economy.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   WARDROBE — what you look like, and what the world looks like.

   Palettes only ever change the world (background, stone, ink).
   The pieces keep their own colours and their shape markers, so
   no palette can make a mechanic unreadable.
   ============================================================ */
var SKIN_COLORS=[
  {id:"rose",   name:"Rose",      hex:0xd6336c, cost:0},
  {id:"amberc", name:"Amber",     hex:0xe89b3c, cost:5},
  {id:"lime",   name:"Lime",      hex:0x9ecb3a, cost:5},
  {id:"jade",   name:"Jade",      hex:0x35c2a5, cost:5},
  {id:"sky",    name:"Sky",       hex:0x4bb3e8, cost:5},
  {id:"violet", name:"Violet",    hex:0x9b7fd4, cost:5},
  {id:"coral",  name:"Coral",     hex:0xf2705d, cost:8},
  {id:"bubble", name:"Bubblegum", hex:0xf58fc2, cost:8},
  {id:"mint",   name:"Mint",      hex:0x7fe3b8, cost:8},
  {id:"gold",   name:"Gold",      hex:0xf2d16b, cost:10},
  {id:"ice",    name:"Ice",       hex:0xc8e6f5, cost:10},
  {id:"ember",  name:"Ember",     hex:0xff5a3c, cost:12}
];
var SKIN_SHAPES=[
  {id:"cube",    name:"Cube",     cost:0},
  {id:"sphere",  name:"Ball",     cost:10},
  {id:"pyramid", name:"Pyramid",  cost:10},
  {id:"diamond", name:"Diamond",  cost:12},
  {id:"barrel",  name:"Barrel",   cost:12},
  {id:"donut",   name:"Donut",    cost:15},
  {id:"star",    name:"Shard",    cost:15},
  {id:"pup",     name:"Pup",      cost:25}
];
var PALETTES=[
  {id:"indigo",   name:"Indigo",    cost:0,  void:0x0f1424, paper:0xe6e1d3, block:0x5a6d94, ink:0x1a1c2b},
  {id:"blueprint",name:"Blueprint", cost:18, void:0x0d2b45, paper:0xf2f6fb, block:0x4a7fb5, ink:0x12304a},
  {id:"newsprint",name:"Newsprint", cost:18, void:0x2a2622, paper:0xefe9dc, block:0x7d7466, ink:0x221f1b},
  {id:"moss",     name:"Moss",      cost:20, void:0x101c16, paper:0xe6ecdc, block:0x557a5e, ink:0x14201a},
  {id:"nocturne", name:"Nocturne",  cost:22, void:0x07070c, paper:0xd8d4e8, block:0x4a4763, ink:0x12111c},
  {id:"rust",     name:"Rust",      cost:25, void:0x241512, paper:0xf0e2d2, block:0x9a5f45, ink:0x1d100d}
];
var wardrobe={owned:["rose","cube","indigo"],color:"rose",shape:"cube",palette:"indigo",spent:0};

function findBy(list,id){for(var i=0;i<list.length;i++)if(list[i].id===id)return list[i];return list[0];}
function owns(id){return wardrobe.owned.indexOf(id)>=0;}
function starsEarned(){
  var t=0;
  for(var i=0;i<LEVELS.length;i++){
    if(LEVELS[i].tutorial)continue;      // teaching levels pay no shards
    var best=progress[LEVELS[i].name];
    if(best===undefined)continue;
    var st=statsCached(LEVELS[i]);
    t+=starsFor(best,st.ok?st.moves:0);
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
  return g;
}
function applyPalette(){
  var p=findBy(PALETTES,wardrobe.palette);
  colVoid.setHex(p.void);colPaper.setHex(p.paper);
  colBlock.setHex(p.block);colInk.setHex(p.ink);
  var css=document.documentElement.style;
  css.setProperty("--void","#"+p.void.toString(16).padStart(6,"0"));
  css.setProperty("--paper","#"+p.paper.toString(16).padStart(6,"0"));
  css.setProperty("--ink","#"+p.ink.toString(16).padStart(6,"0"));
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
function previewShow(shape,colorId,paletteId){
  if(!pv)return;
  var root=pv.root;
  while(root.children.length)root.remove(root.children[0]);
  var col=findBy(SKIN_COLORS,colorId).hex;
  var pal=findBy(PALETTES,paletteId);
  pv.scene.background=new THREE.Color(pal.void);

  var slabMat=new THREE.MeshLambertMaterial({color:pal.block});
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
    new THREE.LineBasicMaterial({color:pal.ink,transparent:true,opacity:.55}));
  edges.position.copy(slab.position);root.add(edges);

  var item=buildPlayerMesh(shape,col,new THREE.MeshLambertMaterial({color:col}));
  item.position.y=-.06;
  root.add(item);
}

var colGlass=new THREE.Color(0x7fc4d8);
var colAnchor=new THREE.Color(0xd9a441);
var colCrate=new THREE.Color(0x9b7fd4);
var colCrateHeld=new THREE.Color(0xb08a5c);
var colKey=new THREE.Color(0xf2d16b);
var colSpike=new THREE.Color(0x8a3040);
var spikeGeo=null;
var boxGeo,edgeGeo;
