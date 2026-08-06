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
function shards(){return Math.max(0,starsEarned()-wardrobe.spent);}

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
function buildPlayerMesh(){
  var col=findBy(SKIN_COLORS,wardrobe.color).hex;
  var mat=new THREE.MeshBasicMaterial({color:col});
  var g;
  if(wardrobe.shape==="pup"){
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
    g=new THREE.Mesh(playerGeometry(wardrobe.shape),mat);
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
var colGlass=new THREE.Color(0x7fc4d8);
var colAnchor=new THREE.Color(0xd9a441);
var colCrate=new THREE.Color(0x9b7fd4);
var colCrateHeld=new THREE.Color(0xb08a5c);
var colKey=new THREE.Color(0xf2d16b);
var colSpike=new THREE.Color(0x8a3040);
var spikeGeo=null;
var boxGeo,edgeGeo;
