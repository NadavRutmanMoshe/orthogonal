"use strict";
/* Orthogonal — 10-render.js
   three.js scene, meshes, depth shading, the animation loop.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   THREE
   ============================================================ */
var scene,camera,renderer,meshes={},playerMesh,goalMesh,gridLines,groundPlane,footMesh;
var huntMeshes=[],lineMeshes=[];
var twinCross=null,twinTether=null;
var trialSlab,trialEdge;
var colPeril=new THREE.Color(0x8f3b52);
var perilSet=null,perilCleanup=[],perilPulse=0;
var crateMeshes=[],keyMeshes=[],goalGhost=null,trialMarks=[];
var amb,dir1,dir2;
var center=new THREE.Vector3(),centerT=new THREE.Vector3();
var viewSize=10,viewSizeT=10;

/* ============================================================
   THE FOLLOW CAMERA — an experiment, and easy to take out

   The camera has always been centred on the *arena*: it frames the whole
   level and never moves while you play. That is clean, and it costs the one
   thing this projection is worst at. Screen-vertical here is height and depth
   added together, so a block one square further back and a block one square
   higher draw in the same place, and no amount of shading fixes it - shading
   ranks things, it does not tell you which row they are in.

   A camera locked to the player gives that back through *motion*. Step in
   depth and the whole world slides vertically; step sideways and it slides
   sideways. The two axes stop being the same gesture on screen, and you are
   told which one you just moved along by watching it happen.

   Two knobs, deliberately separate so either can be undone alone:
     FOLLOW      how much of the way to the player the camera sits (1 = all).
     FOLLOW_ZOOM a ceiling on how far out it pulls. Small arenas already fit
                 inside it and are unchanged; only big ones come closer, and
                 they are the ones where a fixed frame made everything tiny.
   Set FOLLOW to 0 and this is the old camera exactly.
   ============================================================ */
var FOLLOW=1, FOLLOW_ZOOM=9;
var followT=new THREE.Vector3();
var colVoid=new THREE.Color(0x0f1424),colPaper=new THREE.Color(0xe6e1d3);
var colBlock=new THREE.Color(0x5a6d94),colInk=new THREE.Color(0x1a1c2b);
var colGhost=new THREE.Color(0x2e3549);
var markGeo=null;

function initGL(){
  scene=new THREE.Scene();
  scene.background=colVoid.clone();
  renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(window.innerWidth,window.innerHeight);
  document.body.insertBefore(renderer.domElement,document.body.firstChild);
  camera=new THREE.OrthographicCamera(-10,10,10,-10,-300,300);
  amb=new THREE.AmbientLight(0xffffff,.45);scene.add(amb);
  dir1=new THREE.DirectionalLight(0xfff0e0,.85);dir1.position.set(6,10,8);scene.add(dir1);
  dir2=new THREE.DirectionalLight(0x88aaff,.35);dir2.position.set(-7,4,-6);scene.add(dir2);

  /* Blocks and crates are the only things that use these two, so the
     redesign is a swap here rather than a new name threaded through every
     call site. The edges are cut from the CASE (.9), not from a full cell,
     or a hairline would float in the seam the inset creates. */
  boxGeo=makeBlockGeo();
  edgeGeo=new THREE.EdgesGeometry(new THREE.BoxGeometry(.9,.9,.9));
  spikeGeo=new THREE.ConeGeometry(.13,.36,4);
  // Taller and thinner than the old spike tip, and five-sided so it reads as
  // a flame rather than as a pyramid at the sizes this game draws.
  flameGeo=new THREE.ConeGeometry(.115,.40,5);
  // Every piece also carries a shape on its top face, so the mechanics stay
  // legible without relying on colour. Roughly one man in twelve has some
  // colour vision deficiency, and violet-versus-red is exactly the pair that
  // fails - without this the game is unplayable for them.
  markGeo={
    glass:new THREE.TorusGeometry(.17,.038,6,14),
    anchor:new THREE.OctahedronGeometry(.15),
    crate:new THREE.BoxGeometry(.34,.05,.09)
  };

  playerMesh=buildPlayerMesh();
  scene.add(playerMesh);
  footMesh=new THREE.Mesh(new THREE.PlaneGeometry(.94,.94),
    new THREE.MeshBasicMaterial({color:0xd6336c,transparent:true,
      opacity:.42,side:THREE.DoubleSide}));
  footMesh.rotation.x=-Math.PI/2;
  scene.add(footMesh);

  goalMesh=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.5),
    new THREE.MeshBasicMaterial({color:0x35c2a5,wireframe:true}));
  scene.add(goalMesh);
  // A crate or a block can sit exactly where the goal is and hide it entirely.
  // This second copy ignores the depth buffer, so the goal always shows through
  // whatever is in front of it, faintly.
  goalGhost=new THREE.Mesh(new THREE.BoxGeometry(.56,.56,.56),
    new THREE.MeshBasicMaterial({color:0x35c2a5,wireframe:true,
      transparent:true,opacity:.32,depthTest:false}));
  goalGhost.renderOrder=999;
  scene.add(goalGhost);

  /* A trial's sweep: one translucent slab over the slice that is about to
     become lethal. Drawn as a single box rather than a marker per cell
     because the attack *is* a slice - showing it whole is cheaper and truer
     to what the rule says. */
  trialSlab=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
    new THREE.MeshBasicMaterial({color:0xff4d5e,transparent:true,
      opacity:.12,depthWrite:false}));
  trialSlab.visible=false;trialSlab.renderOrder=900;
  scene.add(trialSlab);
  trialEdge=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),
    new THREE.LineBasicMaterial({color:0xff6b7a,transparent:true,opacity:.4}));
  trialEdge.visible=false;scene.add(trialEdge);

  groundPlane=new THREE.Mesh(new THREE.PlaneGeometry(200,200),
    new THREE.MeshBasicMaterial({visible:false}));
  groundPlane.rotation.x=-Math.PI/2;
  groundPlane.position.y=-0.5;
  scene.add(groundPlane);

  renderer.domElement.addEventListener("pointerdown",onCanvasTap);
  bindGestures(renderer.domElement);
  window.addEventListener("resize",onResize);
  onResize();animate();
}

/* ============================================================
   THE SKY AND THE AIR - what makes a section feel like somewhere
   ============================================================
   Both hang off the CAMERA, not off the scene, which is the trick that
   makes them cost nothing to think about: the camera turns in 90 degree
   steps and the player never sees these move with it, so they read as
   screen-space atmosphere rather than as objects in the world that the
   fold would have to account for. Neither writes depth, and both sit at
   the far plane, so nothing in the puzzle is ever occluded by weather.

   The sky is one quad with a two-stop vertical gradient baked into vertex
   colours - a flat clear colour is what made the world look like it was
   floating in a swatch. `scene.background` is dropped when it is up,
   because the quad is now what paints every pixel behind the world. */
var flameGeo=null;
var skyQuad=null, airField=null, airPhase=0, flareT=0, flareEvery=0, skyWarm=0;
var colSkyTop=new THREE.Color(0x141a2e), colSkyBot=new THREE.Color(0x0a0e1a);
var colAir=new THREE.Color(0x8fa4cc);

function makeSky(){
  var g=new THREE.PlaneGeometry(1,1);
  /* PlaneGeometry's four verts run top-left, top-right, bottom-left,
     bottom-right, so the two stops are written straight into the colour
     attribute - the material stays white and does no tinting of its own.
     Both stops are real colours rather than a white-to-black ramp times a
     material colour, because a single multiply cannot make two hues. */
  g.setAttribute("color",new THREE.Float32BufferAttribute(new Float32Array(12),3));
  var m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({
    vertexColors:true,depthWrite:false,depthTest:false,fog:false}));
  m.renderOrder=-1000;
  m.position.z=-250;
  return m;
}
var skyT=new THREE.Color(),skyB=new THREE.Color();
var colFlare=new THREE.Color(0xff7a3c);
/* THE SKY FOLDS TO PAPER TOO. It replaced scene.background, and that was
   being lerped void-to-paper every frame as the world flattens - the plane
   is a different place, not a different camera, and a gradient that stayed
   dark behind a white page would be the one thing on screen that had not
   noticed. Both stops go, and the flare is scaled out with them. */
function setSkyColors(warm){
  if(!skyQuad)return;
  skyT.copy(colSkyTop);skyB.copy(colSkyBot);
  if(warm>0){skyT.lerp(colFlare,warm*.20);skyB.lerp(colFlare,warm*.09);}
  skyT.lerp(colPaper,flatT);skyB.lerp(colPaper,flatT);
  var a=skyQuad.geometry.attributes.color, ar=a.array;
  ar[0]=skyT.r;ar[1]=skyT.g;ar[2]=skyT.b;
  ar[3]=skyT.r;ar[4]=skyT.g;ar[5]=skyT.b;
  ar[6]=skyB.r;ar[7]=skyB.g;ar[8]=skyB.b;
  ar[9]=skyB.r;ar[10]=skyB.g;ar[11]=skyB.b;
  a.needsUpdate=true;
}
/* One quad per mote, unlit and tiny. They are rebuilt when a section
   changes rather than pooled at a fixed maximum, because a section changes
   about once every ten levels and the largest field in the game is 22. */
function makeAir(spec){
  var grp=new THREE.Group();
  for(var i=0;i<spec.n;i++){
    /* Round, not square: a drifting square reads as debris, and at eight
       segments a circle costs the same. depthTest stays ON - three.js
       renders transparent objects after opaque ones whatever their
       renderOrder, so without it the weather draws over the puzzle. */
    var q=new THREE.Mesh(new THREE.CircleGeometry(spec.size*.5,8),
      new THREE.MeshBasicMaterial({color:colAir.clone(),transparent:true,
        opacity:.0,depthWrite:false,fog:false}));
    q.renderOrder=-900;
    q.userData={ x:Math.random(), y:Math.random(),
                 sp:.5+Math.random()*1.1, ph:Math.random()*Math.PI*2,
                 a:.10+Math.random()*.28 };
    grp.add(q);
  }
  grp.userData.spec=spec;
  return grp;
}
/* Sized to the frustum every frame, because the frustum follows the arena
   and the player - a sky sized once is the wrong size on the next level. */
function layoutAtmosphere(){
  if(!skyQuad)return;
  var w=(camera.right-camera.left)/camera.zoom, h=(camera.top-camera.bottom)/camera.zoom;
  skyQuad.scale.set(w*1.2,h*1.2,1);
  if(!airField)return;
  var kids=airField.children, sp=airField.userData.spec;
  for(var i=0;i<kids.length;i++){
    var q=kids[i],u=q.userData;
    u.y+=sp.rise*u.sp*.0016;
    u.x+=sp.drift*u.sp*.0016;
    if(u.y>1.1)u.y=-.1; if(u.y<-.1)u.y=1.1;
    if(u.x>1.1)u.x=-.1; if(u.x<-.1)u.x=1.1;
    q.position.set((u.x-.5)*w*1.05,(u.y-.5)*h*1.05,-240);
    /* Faded at both edges of the field. Anything that crosses a boundary is
       necessarily half-drawn while it crosses, which is the same reason the
       map's ambient cubes never touch an edge. */
    var edge=Math.min(1,Math.min(u.y,1-u.y)*6)*Math.min(1,Math.min(u.x,1-u.x)*6);
    var tw=.72+.28*Math.sin(airPhase*2.4+u.ph);
    q.material.opacity=u.a*edge*tw*(1-flatT*.75);
  }
}
/* A section's own weather. `flare` warms the whole void for a beat every
   `flare` milliseconds - the eruption, expressed as the sky doing something
   rather than as a mountain drawn behind an abstract puzzle. */
function applyTheme(th){
  if(!th)th={sky:[0x0f1424,0x080b14],block:0x5a6d94,
             air:{col:0x8fa4cc,n:12,rise:.06,drift:.04,size:.09}};
  colSkyTop.setHex(th.sky[0]);colSkyBot.setHex(th.sky[1]);
  colVoid.setHex(th.sky[1]);            // depth shading fades toward the far sky
  colBlock.setHex(th.block);
  colAir.setHex(th.air.col);
  /* Started a third of the way in rather than at zero: at zero the swell
     lands about a second after the level opens, which is precisely when the
     player is reading the board and reads as the game glitching rather than
     as weather. */
  flareEvery=th.flare||0;flareT=flareEvery*.34;
  document.documentElement.style.setProperty("--void",
    "#"+th.sky[1].toString(16).padStart(6,"0"));
  if(!scene)return;
  if(!skyQuad){skyQuad=makeSky();camera.add(skyQuad);scene.add(camera);}
  /* scene.background is kept even though the quad now paints every pixel
     behind the world: the animation loop lerps it void-to-paper and hands
     it to outlineFor() as "what the player is drawn against", which is
     still exactly what it is. Nulling it was tried and threw once a frame. */
  if(!scene.background)scene.background=colVoid.clone();
  if(airField){camera.remove(airField);airField.traverse(function(o){
    if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});}
  airField=makeAir(th.air);camera.add(airField);
  setSkyColors(0);
}
/* Which section a level belongs to, asked by index so it works for the
   editor and the library too - both hand back no section, and no section
   means the default sky. */
function themeForLevel(idx){
  if(typeof SECTIONS==="undefined"||idx==null||idx<0)return null;
  var found=null;
  for(var i=0;i<SECTIONS.length;i++)if(SECTIONS[i].at<=idx)found=SECTIONS[i];
  return found?found.theme:null;
}

/* ============================================================
   THE BLOCK, AND WHAT A SECTION DOES TO IT
   ============================================================
   A block used to be a bare cube in one flat colour, and the note from
   playtesting was that it did not feel like a game. It is now a dark case
   with a lit rim - the "SIGNAL" language, picked from three rendered
   candidates.

   TWO THINGS MAKE THIS FREE. It is ONE merged geometry shared by every
   block in the world, so a block is still exactly one mesh and one draw
   call. And the per-face brightness is baked into a vertex-colour
   attribute, which three.js multiplies by material.color - and
   material.color is rewritten every frame by the block loop (depth fade,
   peril red, the lerp to ink as you fold). So the whole redesign inherits
   all of that behaviour without the block loop changing by a line.

   The rim is a value, not a colour: it is the same hue as the body pushed
   past 1, so a section that tints the stone tints the rim with it. That is
   what lets a section own the look without a second palette to keep in
   sync. */
function mergeBoxes(parts){
  var pos=[],nor=[],uv=[],col=[],idx=[],base=0;
  for(var i=0;i<parts.length;i++){
    var p=parts[i];
    var g=new THREE.BoxGeometry(p.w,p.h,p.d);
    g.translate(p.x||0,p.y||0,p.z||0);
    var gp=g.attributes.position.array,gn=g.attributes.normal.array,
        gu=g.attributes.uv.array,gi=g.index.array,j;
    for(j=0;j<gp.length;j++){pos.push(gp[j]);nor.push(gn[j]);}
    for(j=0;j<gu.length;j++)uv.push(gu[j]);
    /* BoxGeometry lays out six faces of four verts in a fixed order -
       +X -X +Y -Y +Z -Z - which is what lets a brightness be assigned per
       face without touching a single position. */
    var v=[p.xp,p.xn,p.top,p.bot,p.zp,p.zn];
    for(var f=0;f<6;f++)for(var k=0;k<4;k++)col.push(v[f],v[f],v[f]);
    for(j=0;j<gi.length;j++)idx.push(gi[j]+base);
    base+=gp.length/3;
    g.dispose();
  }
  var out=new THREE.BufferGeometry();
  out.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
  out.setAttribute("normal",new THREE.Float32BufferAttribute(nor,3));
  out.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
  out.setAttribute("color",new THREE.Float32BufferAttribute(col,3));
  out.setIndex(idx);
  return out;
}
function faceVals(o){
  /* THE BODY CARRIES THE SECTION'S COLOUR, so it is lit rather than dark.
     The first cut of this language was deliberately murky - it looked clean
     in isolation and left a section's palette nowhere to live, which is the
     whole reason sections have palettes. The rim still separates one block
     from the next; it does not have to do it by being the only lit thing. */
  var d={top:1.34,bot:.50,xp:.98,xn:.70,zp:1.04,zn:.66};
  for(var k in o)d[k]=o[k];
  return d;
}
/* The case is inset so the void shows between blocks as a seam, and four
   thin bars ride the top edges at well over 1 - they are the lit rim, and
   being geometry rather than a line they survive the fold and the depth
   fade like everything else. */
function makeBlockGeo(){
  var parts=[faceVals({w:.9,h:.9,d:.9})];
  var r=.465,t=.075;
  parts.push(faceVals({w:1,h:t,d:t,y:.462,z:r, top:1.85,bot:1.5,xp:1.8,xn:1.65,zp:1.85,zn:1.6}));
  parts.push(faceVals({w:1,h:t,d:t,y:.462,z:-r,top:1.85,bot:1.5,xp:1.8,xn:1.65,zp:1.85,zn:1.6}));
  parts.push(faceVals({w:t,h:t,d:1,y:.462,x:r, top:1.85,bot:1.5,xp:1.8,xn:1.65,zp:1.85,zn:1.6}));
  parts.push(faceVals({w:t,h:t,d:1,y:.462,x:-r,top:1.85,bot:1.5,xp:1.8,xn:1.65,zp:1.85,zn:1.6}));
  return mergeBoxes(parts);
}

function addMesh(x,y,z,kind){
  var k=K(x,y,z);
  if(meshes[k])return;
  var glass=kind===1, anchor=kind===2, spike=kind===4;
  var mat=glass
    /* Water reads through a warm section, which is where it is taught, so it
       is carried a little more solid than the old glass - at .5 over dark
       stone it came out muddy teal rather than cyan. It still dissolves
       completely as the world folds; that is the mechanic, not the look. */
    ? new THREE.MeshLambertMaterial({color:colGlass.clone(),transparent:true,
        opacity:.62,vertexColors:true})
    : new THREE.MeshLambertMaterial({vertexColors:true,
        color:(anchor?colAnchor:spike?colSpike:colBlock).clone()});
  var m=new THREE.Mesh(boxGeo,mat);
  m.position.set(x,y,z);
  m.userData.base=[x,y,z];
  m.userData.glass=glass;
  m.userData.anchor=anchor;
  m.userData.kind=kind||0;
  var edge=new THREE.LineSegments(edgeGeo,
    new THREE.LineBasicMaterial({
      color:glass?0xbdeaf7:(anchor?0xffd98a:(spike?0xff8a72:0x0f1424)),
      transparent:true,opacity:glass?.95:(anchor||spike?.85:.35)}));
  m.userData.edge=edge;
  m.add(edge);
  if(kind===1||kind===2||kind===3){
    var mk=new THREE.Group();
    var mmat=new THREE.MeshBasicMaterial({
      color:kind===1?0xd6f2fb:kind===2?0xffe9b8:0xece2ff});
    if(kind===1){
      var ring=new THREE.Mesh(markGeo.glass,mmat);
      ring.rotation.x=-Math.PI/2;mk.add(ring);
    } else if(kind===2){
      mk.add(new THREE.Mesh(markGeo.anchor,mmat));
    } else {
      var b1=new THREE.Mesh(markGeo.crate,mmat);
      var b2=new THREE.Mesh(markGeo.crate,mmat);
      b2.rotation.y=Math.PI/2;mk.add(b1);mk.add(b2);
    }
    mk.position.y=.54;
    m.userData.mark=mk;m.add(mk);
  }
  if(spike){
    /* FIRE, not spikes. Same rule exactly - solid, casts like stone, kills
       you underfoot - but "you burn if you touch it" is a sentence a player
       already knows, where "a spike you cannot see until you fold" had to be
       taught. Nothing in 03-rules.js changed and no level was re-verified,
       because kind 4 still means kind 4; this is what it wears.

       Five flames of different heights rather than four matched cones: fire
       is the one piece that should never look machined. Each carries its own
       phase so the group flickers out of step with itself. */
    var tips=new THREE.Group();
    var FL=[[-.26,-.22,1.00],[.24,-.26,.72],[-.20,.26,.86],[.28,.22,.62],[.02,.02,1.22]];
    for(var fi=0;fi<FL.length;fi++){
      var c=new THREE.Mesh(flameGeo,new THREE.MeshBasicMaterial({
        color:fi===4?0xffd48a:0xff7a3c, transparent:true, opacity:.92}));
      c.position.set(FL[fi][0],.5+FL[fi][2]*.19,FL[fi][1]);
      c.scale.set(1,FL[fi][2],1);
      c.userData={h:FL[fi][2],ph:Math.random()*Math.PI*2};
      tips.add(c);
    }
    m.userData.tips=tips;
    m.add(tips);
  }
  scene.add(m);meshes[k]=m;
}
function removeMesh(x,y,z){
  var k=K(x,y,z),m=meshes[k];
  if(!m)return;
  scene.remove(m);m.material.dispose();delete meshes[k];
}
function clearDynamic(){
  crateMeshes.forEach(function(m){scene.remove(m);m.material.dispose();});
  keyMeshes.forEach(function(m){scene.remove(m);m.geometry.dispose();m.material.dispose();});
  trialMarks.forEach(function(m){scene.remove(m);m.geometry.dispose();m.material.dispose();});
  crateMeshes=[];keyMeshes=[];trialMarks=[];
}
/* ONE PLATE PER SQUARE THE SWEEP IS ABOUT TO TAKE.

   The slab alone cannot answer "where is it". A slice is a plane, and a plane
   seen face-on carries no position at all: now that the slices run down the
   depth axis, from the opening view the slab is a wall pointed straight at the
   camera, so the whole screen tints and nothing says which depth it is at. The
   owner's report was that you had to rotate to find out - which is a real cost
   in a level where turning is a move and the clock is running.

   Empty space has no landmarks. The floor does. So the readable form of the
   warning is not the plane, it is the set of squares you could be standing on
   that are inside it: a row of tiles lighting up at a particular depth, read
   against the blocks around them. It is also strictly more useful than the
   plane, because a square you cannot stand on was never going to kill you. */
function buildTrialMarks(){
  if(!TR)return;
  var seen={};
  for(var i=0;i<L.blocks.length;i++){
    var b=L.blocks[i];
    var cx=b[0], cy=b[1]+1, cz=b[2];
    var k=K(cx,cy,cz);
    if(seen[k])continue;
    // Only squares you could actually occupy: a cell with a block in it is
    // not somewhere the sweep can catch you.
    if(R.solid(cx,cy,cz,liveCrates()))continue;
    seen[k]=1;
    var m=new THREE.Mesh(new THREE.PlaneGeometry(.94,.94),
      new THREE.MeshBasicMaterial({color:0xff4d5e,transparent:true,
        opacity:0,depthWrite:false,side:THREE.DoubleSide}));
    m.rotation.x=-Math.PI/2;
    m.position.set(cx,cy-.5+.03,cz);
    m.renderOrder=901;
    m.visible=false;
    /* A filled square alone reads as a discolouration of the block under it,
       and the blocks are already several colours. The border is what makes it
       read as something placed on top - and it survives the fill going faint
       at the start of a beat, which is when being told matters most. */
    var ring=new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-.47,-.47,0),new THREE.Vector3(.47,-.47,0),
        new THREE.Vector3(.47,.47,0),new THREE.Vector3(-.47,.47,0)]),
      new THREE.LineBasicMaterial({color:0xff8a94,transparent:true,opacity:0}));
    ring.position.z=.002;
    m.add(ring);m.userData.ring=ring;
    m.userData.cell=[cx,cy,cz];
    scene.add(m);trialMarks.push(m);
  }
}
function buildDynamic(){
  clearDynamic();
  for(var i=0;i<gCrates.length;i++){
    var m=new THREE.Mesh(boxGeo,
      new THREE.MeshLambertMaterial({color:colCrate.clone(),vertexColors:true}));
    m.add(new THREE.LineSegments(edgeGeo,
      new THREE.LineBasicMaterial({color:0xe0d4ff,transparent:true,opacity:.8})));
    var cmk=new THREE.Group();
    var cmat=new THREE.MeshBasicMaterial({color:0xece2ff});
    var cb1=new THREE.Mesh(markGeo.crate,cmat);
    var cb2=new THREE.Mesh(markGeo.crate,cmat);
    cb2.rotation.y=Math.PI/2;
    cmk.add(cb1);cmk.add(cb2);cmk.position.y=.54;
    m.userData.mark=cmk;m.add(cmk);
    scene.add(m);crateMeshes.push(m);
    m.position.set(gCrates[i][0],gCrates[i][1],gCrates[i][2]);
  }
  var keys=(L.keys||[]);
  for(var j=0;j<keys.length;j++){
    var km=new THREE.Mesh(new THREE.OctahedronGeometry(.26),
      new THREE.MeshBasicMaterial({color:colKey}));
    km.userData.cell=keys[j];
    scene.add(km);keyMeshes.push(km);
  }
  buildTrialMarks();
}

function syncMeshes(){
  var want={};
  for(var i=0;i<L.blocks.length;i++){
    var b=L.blocks[i],k=K(b[0],b[1],b[2]);
    if(isCrate(b))continue;                  // crates are drawn separately
    want[k]=b;
    // a block that changed material has to be rebuilt, not just kept
    var kind=b[3]||0;
    if(meshes[k]&&meshes[k].userData.kind!==kind){
      scene.remove(meshes[k]);meshes[k].material.dispose();delete meshes[k];
    }
    addMesh(b[0],b[1],b[2],kind);
  }
  for(var k in meshes) if(!want[k]){
    var m=meshes[k];scene.remove(m);m.material.dispose();delete meshes[k];
  }
  buildDynamic();
  recomputeBounds();
}
var arenaLo=[0,0,0], arenaHi=[0,0,0];
function recomputeBounds(){
  if(!L.blocks.length){centerT.set(0,0,0);viewSizeT=7;
    arenaLo=[0,0,0];arenaHi=[0,0,0];return;}
  var a=[1e9,1e9,1e9],b=[-1e9,-1e9,-1e9];
  var pts=L.blocks.concat(L.keys||[]);
  for(var i=0;i<pts.length;i++)for(var j=0;j<3;j++){
    a[j]=Math.min(a[j],pts[i][j]);b[j]=Math.max(b[j],pts[i][j]);
  }
  centerT.set((a[0]+b[0])/2,(a[1]+b[1])/2+.5,(a[2]+b[2])/2);
  viewSizeT=Math.max(b[0]-a[0],b[2]-a[2],b[1]-a[1])*.72+3.4;
  arenaLo=a.slice();arenaHi=b.slice();
}
/* The pack.

   One mesh per hunter, built on demand and pooled, each folding with the
   world exactly like a block does - which is what makes the attack legible
   without a word of explanation: flatten, and you can see them slide into
   the columns that are about to kill them.

   Two states, and you act on them inside a second, so they are colour rather
   than shape. Red is a hunter that is simply hunting you. Green is a hunter
   standing in a column something else already fills, which means the fold
   you are one button from will crush it. The player's own peril highlight
   uses the same red the blocks do, so the board reads as one sentence: green
   is what you do to them, red is what the world does to you. */
function huntMesh(){
  var g=new THREE.Group();
  var shell=new THREE.Mesh(new THREE.OctahedronGeometry(.46),
    new THREE.MeshLambertMaterial({color:0x24141c}));
  var core=new THREE.Mesh(new THREE.OctahedronGeometry(.22),
    new THREE.MeshBasicMaterial({color:0xff4d5e}));
  var cage=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(.5)),
    new THREE.LineBasicMaterial({color:0xff6b7a,transparent:true,opacity:.85}));
  g.add(shell);g.add(core);g.add(cage);
  g.userData.core=core;g.userData.cage=cage;
  scene.add(g);
  return g;
}
/* The telegraph. A charge you cannot see coming is not a fight, so a planted
   hunter draws the line it is about to come down, brightening as the beat
   closes. It is drawn in the volume rather than folded with the world,
   because it is a fact about the world: the charge happens along that row
   whichever way you are looking, and the whole tension of the fight is that
   the axis you must *fold* along to answer it may not be the one you are
   facing. Showing it swing around with the camera would tell that lie. */
function lineMesh(){
  var g=new THREE.Mesh(new THREE.BoxGeometry(1,.06,.06),
    new THREE.MeshBasicMaterial({color:0xff4d5e,transparent:true,opacity:.5,
      depthWrite:false}));
  g.renderOrder=880;
  scene.add(g);
  return g;
}
function drawLines(){
  var want=0;
  if(B&&app==="play")for(var q=0;q<hunters.length;q++)if(hunters[q].lock>0)want++;
  while(lineMeshes.length<want)lineMeshes.push(lineMesh());
  var n=0;
  for(var i=0;i<hunters.length&&B&&app==="play";i++){
    var h=hunters[i];
    if(h.lock<=0||!h.line)continue;
    var m=lineMeshes[n++];
    var tx=flat?h.x:player.x, tz=flat?h.z:player.z;
    if(flat){ // a flat player is the whole column, so the line runs its length
      tx=h.x+(h.line.dx||0)*14;tz=h.z+(h.line.dz||0)*14;
    }
    var mx=(h.x+tx)/2, mz=(h.z+tz)/2;
    var lx=Math.abs(tx-h.x)+.25, lz=Math.abs(tz-h.z)+.25;
    m.scale.set(lx,1,lz);
    m.position.set(mx,h.y-.2,mz);
    // full bright as the beat closes: this is the last thing you see before
    // it is standing on you
    var t=1-Math.min(1,h.lock/bossAim());
    m.material.opacity=.28+t*t*.62;
    /* The line is always the charge colour, even when you could answer it.
       It used to turn green whenever the hunter was foldable, and green is
       this game's colour for the goal - for safe - so the one drawing that
       exists to say "you are about to be hit" said "you are fine" at exactly
       the moment the danger was highest, and was reported as not indicating
       anything. The line means one thing: the charge lands along here.

       The opportunity is not lost, because it was never this drawing's job.
       It is already said twice, in the two places you are looking: the hunter
       itself turns green and swells, and the GO 2D button turns green and
       pulses. Being answerable only adds urgency here - the line brightens in
       time with the peril pulse, so the contested one reads as live rather
       than as harmless. */
    m.material.color.setHex(0xff4d5e);
    m.material.opacity=Math.min(1,m.material.opacity+(h.doom?perilPulse*.32:0));
    m.visible=true;
  }
  for(var k=n;k<lineMeshes.length;k++)lineMeshes[k].visible=false;
}
/* The twin's centre, and the tether.

   The cross is the fight drawn on the floor: the halves are reflections
   through that point, so they share a silhouette column exactly when one of
   them stands on the arm the current view is about to collapse. That arm is
   drawn bright and the other faint, and both re-label themselves when you
   rotate — which is the moment the whole board changes meaning, and it
   should be visible as one.

   The tether says the two bodies are one animal, and goes green the instant
   folding would close it. Both are drawn in the volume: they are facts about
   the world rather than about the picture, and they vanish once you are flat
   because in the plane there is nothing left for them to describe. */
function drawTwin(rx,rz){
  if(!B||!B.twin||app!=="play"||!twinAt||flatT>.4){
    if(twinCross)twinCross.visible=false;
    if(twinTether)twinTether.visible=false;
    return;
  }
  if(!twinCross){
    twinCross=new THREE.Group();
    var bar=function(){
      var m=new THREE.Mesh(new THREE.BoxGeometry(1,.04,.04),
        new THREE.MeshBasicMaterial({color:0xffb14d,transparent:true,
          opacity:.3,depthWrite:false}));
      m.renderOrder=870;twinCross.add(m);return m;
    };
    twinCross.userData.xArm=bar();
    var za=bar();za.rotation.y=Math.PI/2;twinCross.userData.zArm=za;
    var eye=new THREE.Mesh(new THREE.OctahedronGeometry(.17),
      new THREE.MeshBasicMaterial({color:0xffb14d,wireframe:true}));
    twinCross.userData.eye=eye;twinCross.add(eye);
    scene.add(twinCross);
  }
  twinCross.visible=true;
  twinCross.position.set(twinAt.x,twinAt.y-.42,twinAt.z);
  twinCross.userData.xArm.scale.set(34,1,1);
  twinCross.userData.zArm.scale.set(34,1,1);
  // u = x at views 0 and 2, so there the halves meet on the arm that runs
  // along z, and vice versa. Bright is "this is the line that matters now".
  var xLive=Math.abs(rx)<.5;
  twinCross.userData.xArm.material.opacity=xLive?(.5+perilPulse*.35):.14;
  twinCross.userData.zArm.material.opacity=xLive?.14:(.5+perilPulse*.35);
  twinCross.userData.eye.rotation.y+=.02;
  twinCross.userData.eye.position.y=.42+Math.sin(Date.now()*.003)*.05;

  if(hunters.length<2){if(twinTether)twinTether.visible=false;return;}
  if(!twinTether){
    twinTether=new THREE.Mesh(new THREE.BoxGeometry(1,.03,.03),
      new THREE.MeshBasicMaterial({color:0xff6b7a,transparent:true,
        opacity:.35,depthWrite:false}));
    twinTether.renderOrder=870;scene.add(twinTether);
  }
  var a=hunters[0], b=hunters[1];
  var mx=(a.x+b.x)/2, mz=(a.z+b.z)/2;
  var dx=b.x-a.x, dz=b.z-a.z;
  var len=Math.sqrt(dx*dx+dz*dz)||.001;
  twinTether.position.set(mx,a.y-.1,mz);
  twinTether.rotation.y=-Math.atan2(dz,dx);
  twinTether.scale.set(len,1,1);
  var lit=a.doom;
  twinTether.material.color.setHex(lit?0x35c2a5:0xff6b7a);
  twinTether.material.opacity=lit?(.7+perilPulse*.3):.3;
  twinTether.visible=true;
}
function drawBoss(rx,rz,tdvx,tdvz){
  var want=(B&&app==="play")?hunters.length:0;
  while(huntMeshes.length<want)huntMeshes.push(huntMesh());
  for(var i=0;i<huntMeshes.length;i++){
    var m=huntMeshes[i];
    if(i>=want){m.visible=false;continue;}
    var h=hunters[i];
    m.visible=true;
    var hu=h.x*rx+h.z*rz, hd=h.x*tdvx+h.z*tdvz;
    var px=hu*rx+hd*.012*tdvx, pz=hu*rz+hd*.012*tdvz;
    tmp.set(h.x+(px-h.x)*flatT, h.y, h.z+(pz-h.z)*flatT);
    // Snapped rather than eased when it is a long way off: a hunter thrown
    // back to its spawn should arrive there, not glide across the arena.
    m.position.lerp(tmp, m.position.distanceTo(tmp)>2.5?1:.35);
    // Planted, so it stops turning: the stillness is the tell, before the
    // line has even brightened.
    m.rotation.y+=h.lock>0?.004:(h.doom?.09:.035);
    m.userData.core.material.color.setHex(h.doom?0x35c2a5:0xff4d5e);
    m.userData.cage.material.color.setHex(h.doom?0x35c2a5:0xff6b7a);
    m.userData.cage.material.opacity=h.doom?(.7+perilPulse*.3):(.5+bossFlash*.4);
    m.userData.core.scale.setScalar(h.doom?1.35:1);
    m.scale.setScalar((1+bossHitFlash*.3)*(h.doom?1.06:(h.lock>0?1.12:1)));
  }
  drawLines();
  drawTwin(rx,rz);
}
/* The charging slice.

   Only the beat that is charging gets drawn - showing all of them at once
   would be honest and unreadable. Placement follows exactly the rule the hit
   test uses, including the case that matters most: flattened, a sweep down
   the view axis covers the whole plane, because flattened you are at every
   depth at once. The entire board going red is the correct answer there, and
   it is the only warning you get that the fold you are in is the wrong one.

   The charge has to read as a countdown rather than a warning light, so
   opacity ramps with how far through the beat it is - "how long have I got"
   is then legible at a glance instead of needing a number. */
function drawTrial(rx,rz){
  if(!trialSlab)return;
  if(!TR||app!=="play"||!TR.beats.length){
    trialSlab.visible=trialEdge.visible=false;
    for(var q=0;q<trialMarks.length;q++)trialMarks[q].visible=false;
    return;
  }
  var sw=TR.beatAt(trialMs), span=20;
  var ph=TR.phase(trialMs), live=TR.live(trialMs);
  // Centred on the arena rather than the origin: a slab hung off world zero
  // trails halfway across the screen and reads as scenery.
  /* Sized to the arena, not to the sky. At span 20 the slab's own edges were
     off screen, so the one part of it that carries a position - the outline -
     was never visible, and a slice facing the camera was a full-bleed red
     wash. Bounded, it reads as a pane standing somewhere. */
  var ex=(arenaHi[0]-arenaLo[0])+3, ey=(arenaHi[1]-arenaLo[1])+4,
      ez=(arenaHi[2]-arenaLo[2])+3;
  var sx=ex,sy=ey,sz=ez, px=centerT.x,py=centerT.y,pz=centerT.z;
  if(sw.axis==="y"){ sy=1; py=sw.at; }
  else if(flatT>.5){
    var comp=sw.axis==="x"?AX[view].r[0]:AX[view].r[2];
    if(comp!==0){
      // The slice survives the fold as a single silhouette column, and in the
      // plane a column lies along the screen-right direction - so which world
      // axis it is thin along depends on which way you are facing.
      var u=sw.at*comp;
      px=u*rx; pz=u*rz;
      if(Math.abs(rx)>.5)sx=1; else sz=1;
    }
    // comp===0 is the view axis: the whole plane is the slice, so the slab
    // swallows the board on purpose - that is the warning, and it is the only
    // one you get that the fold you are in is the wrong one.
    else { sx=sy=sz=span; }
  }
  else if(sw.axis==="x"){ sx=1; px=sw.at; }
  else { sz=1; pz=sw.at; }
  /* Is the slice pointed straight at the camera?

     A plane carries a position only when you can see it edge-on: then it is a
     wall standing at a particular place on screen and you read it instantly.
     Face-on it is a sheet of colour over everything, and in an orthographic
     view it does not even move as its depth changes - which is exactly why
     the depth-axis slices could not be located without rotating.

     Same test the hit rule uses. AX[view].r is screen-right, so a slice whose
     axis has no screen-right component is one you are looking down. */
  var faceOn = sw.axis!=="y" &&
    (sw.axis==="x"?AX[view].r[0]:AX[view].r[2])===0;
  trialSlab.scale.set(sx,sy,sz);
  trialSlab.position.set(px,py,pz);
  trialEdge.scale.copy(trialSlab.scale);
  trialEdge.position.copy(trialSlab.position);
  /* The ramp starts high, not at nothing. It used to open each beat at .07,
     which against the void is invisible - so the slice appeared to arrive
     from nowhere a beat and a half later, and a player who had just been hit
     read the whole arena as having switched off. Being *told* early is the
     entire bargain a telegraph makes; the ramp is for how long you have
     left, not for whether there is a slice at all. */
  /* Face-on the fill is suppressed almost to nothing and the tiles carry the
     message; edge-on it is the best indicator there is and keeps its old
     weight. The outline stays in both cases - bounded to the arena now, so it
     is a frame you can see rather than something running off the screen -
     because "a slice is charging" still has to be legible even in the view
     where "which slice" is the tiles' job. */
  var edgeOnly = faceOn && flatT<=.5;
  var wash = edgeOnly ? .10 : 1;
  trialSlab.material.opacity=(live?(.62+trialFlash*.3):(.15+ph*ph*.3))*wash;
  trialEdge.material.opacity=(live?1:(.5+ph*.4))*(edgeOnly?.22:1);
  trialSlab.visible=trialEdge.visible=true;
  drawTrialMarks(sw,ph,live);
}
/* The tiles. Flat only in the volume: in the plane the world is a silhouette
   and a marker sitting on a world block would be pointing at a place that is
   not there any more - the slab is the right shape for that case and already
   says it. */
function drawTrialMarks(sw,ph,live){
  var hidden=flatT>.5;
  var here=null;
  for(var i=0;i<trialMarks.length;i++){
    var m=trialMarks[i], c=m.userData.cell;
    if(hidden){m.visible=false;continue;}
    m.visible=true;
    /* EVERY standable square is outlined, not only the lethal ones.

       Reported: falling off the starting island on TRIAL I, more than once.
       That is what an orthographic view costs - screen-vertical is height and
       depth added together, so a block one further away and a block one
       higher draw at the same place, and the edge of a platform is genuinely
       ambiguous until you rotate. On a turn-based level you can afford to
       find out; on a clock you cannot, and stepping into nothing is a life.

       So a trial draws its own floor: a faint outline on each square you
       could stand on. It costs nothing - these plates already existed for the
       sweep - and it turns "where does the ground end" from something you
       infer into something you look at. It is deliberately outline-only, so
       the red fill of the hot row still has the whole colour channel. */
    if(!TR.hits(sw,view,"3",c[0],c[1],c[2])){
      m.material.opacity=0;
      if(m.userData.ring){
        m.userData.ring.material.color.setHex(0x7d8db3);
        m.userData.ring.material.opacity=.2;
      }
      m.scale.setScalar(1);
      continue;
    }
    if(m.userData.ring)m.userData.ring.material.color.setHex(0xff8a94);
    var mine=(!flat&&player.x===c[0]&&player.y===c[1]&&player.z===c[2]);
    if(mine)here=m;
    /* The ramp is the countdown, same as the slab's - but these start
       brighter, because the tiles are what the player is reading and a
       telegraph that is invisible for the first half of its beat is not a
       telegraph. The square you are actually standing on is louder again:
       "there is a slice" and "you are in it" are different sentences. */
    m.material.opacity=(live?.92:.34+ph*ph*.5)*(mine?1:.8);
    m.scale.setScalar(mine?1.04+(live?.06:0):1);
    if(m.userData.ring)
      m.userData.ring.material.opacity=(live?1:.5+ph*.5)*(mine?1:.75);
  }
  // Drawn last so it sits over its neighbours rather than z-fighting them.
  if(here)here.renderOrder=903;
}
function buildGrid(){
  if(gridLines){scene.remove(gridLines);gridLines.geometry.dispose();gridLines.material.dispose();}
  var pts=[],r=AX[view].r,dv=AX[view].d,span=16;
  function P(u,y){return new THREE.Vector3(u*r[0]-9*dv[0],y,u*r[2]-9*dv[2]);}
  for(var u=-span;u<=span;u++){pts.push(P(u-.5,-7));pts.push(P(u-.5,12));}
  for(var y=-7;y<=12;y++){pts.push(P(-span,y-.5));pts.push(P(span,y-.5));}
  gridLines=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({color:0x1a1c2b,transparent:true,opacity:0}));
  scene.add(gridLines);
}
function updateFrustum(){
  var w=window.innerWidth,h=window.innerHeight,a=w/h;
  var vs=viewSize*(h<640?1.2:1)*(app==="edit"?1.12:1);
  if(a>=1){camera.left=-vs*a;camera.right=vs*a;camera.top=vs;camera.bottom=-vs;}
  else{camera.left=-vs;camera.right=vs;camera.top=vs/a;camera.bottom=-vs/a;}
  camera.updateProjectionMatrix();
}
function onResize(){
  renderer.setSize(window.innerWidth,window.innerHeight);
  updateFrustum();
  previewSize();   // the display case is sized in % and needs to be re-measured
}

// Depth is the hard thing to read in an orthographic view: a block six deep
// looks like it's beside you. Everything sharing your depth stays full colour;
// everything else desaturates toward the background with distance, so "in your
// row" and "behind your row" are visible at a glance.
var depthTint=new THREE.Color();
function applyDepth(mesh,base,pd,dvx,dvz,ft){
  if(ft>.5)return;                        // in the plane, depth is meaningless
  var d=base[0]*dvx+base[2]*dvz;
  var diff=Math.abs(d-pd);
  if(diff<.5){
    if(mesh.userData.edge)mesh.userData.edge.material.opacity=
      mesh.userData.glass?.95:(mesh.userData.kind?.85:.55);
    return;
  }
  var f=Math.min(.62,diff*.12)*(1-ft*2);
  depthTint.copy(colVoid);
  mesh.material.color.lerp(depthTint,f);
  if(mesh.userData.edge)
    mesh.userData.edge.material.opacity=Math.max(.08,
      (mesh.userData.glass?.95:.35)*(1-f*1.1));
}

/* THE FLAMES, AND WHY THEY CLIMB WHEN THE WORLD FOLDS.

   Flattened, every block at every depth lands in one silhouette square, so a
   fire block behind a stone one is drawn inside it and there is nothing to
   see - which is exactly the square a player most needs to know is lethal.
   So in the plane the flames rise clear of the cell and stop testing depth:
   they are drawn over whatever shares the column, which is the only place
   they can say what they have to say. In the volume they sit on the block
   and behave normally, because there depth is information rather than a
   thing in the way. */
function fireFlames(tips,ft){
  tips.visible=true;
  var over=ft>.5;
  tips.position.y=over?.34*(ft-.5)*2:0;
  var kids=tips.children;
  for(var i=0;i<kids.length;i++){
    var c=kids[i],u=c.userData;
    var fl=.80+.20*Math.sin(airPhase*7.5+u.ph)+.06*Math.sin(airPhase*17+u.ph*3);
    c.scale.set(.92+fl*.12,u.h*fl,.92+fl*.12);
    c.material.opacity=(.72+fl*.26)*(over?1:.92);
    c.material.depthTest=!over;
    c.renderOrder=over?940:0;
  }
}

var tmp=new THREE.Vector3();
var lastFrame=0;
function animate(now){
  requestAnimationFrame(animate);
  // Real frame time, because the boss clock is wall time and a fixed 16ms
  // guess would run fast on a 120Hz phone and slow on a loaded one.
  var dtMs=lastFrame?Math.max(0,(now||0)-lastFrame):16;
  lastFrame=now||0;
  if(!L)return;
  flatT+=(flatTarget-flatT)*.14;
  if(Math.abs(flatTarget-flatT)<.002)flatT=flatTarget;
  viewAngle+=(viewAngleTarget-viewAngle)*.16;
  /* THE WEATHER. Driven off real frame time like the fight clocks, so it
     runs at the same rate on a 120Hz phone and a loaded one - and folded,
     the air fades back rather than stopping, because the plane is a place
     too and a dead sky there would read as the game having switched off. */
  airPhase+=dtMs*.0009;
  if(flareEvery){
    flareT+=dtMs;
    if(flareT>flareEvery)flareT=0;
    /* A slow swell and a slower fall - most of the cycle is nothing at all,
       which is what makes the beat land when it arrives. */
    var fp=flareT/flareEvery;
    if(fp<.05)skyWarm=fp/.05; else if(fp<.22)skyWarm=1-(fp-.05)/.17; else skyWarm=0;
    skyWarm=Math.max(0,skyWarm)*(1-flatT*.8);
  } else skyWarm=0;
  setSkyColors(skyWarm);
  layoutAtmosphere();
  /* playerMesh rather than `player`, because the mesh is where the player is
     actually drawn - already eased, and already in plane coordinates when
     flat - so the camera cannot arrive somewhere the cube has not. */
  if(FOLLOW>0&&app==="play"&&playerMesh){
    followT.copy(playerMesh.position);
    // Clamped to the arena so the camera never drifts out into pure void
    // looking at nothing, which is what an unbounded follow does the moment
    // the player stands on an edge block.
    followT.x=Math.max(arenaLo[0],Math.min(arenaHi[0],followT.x));
    followT.y=Math.max(arenaLo[1],Math.min(arenaHi[1]+1,followT.y))+.5;
    followT.z=Math.max(arenaLo[2],Math.min(arenaHi[2],followT.z));
    if(FOLLOW<1)followT.lerp(centerT,1-FOLLOW);
    center.lerp(followT,.12);
  } else center.lerp(centerT,.12);
  var vsWant=(FOLLOW>0&&app==="play")?Math.min(viewSizeT,FOLLOW_ZOOM):viewSizeT;
  var pv=viewSize;viewSize+=(vsWant-viewSize)*.12;
  if(Math.abs(pv-viewSize)>.005)updateFrustum();

  if(flat)peekTarget=0;                  // peeking is meaningless in the plane
  peek+=(peekTarget-peek)*.12;
  // A live two-finger drag belongs to the finger; a released one springs back
  // to nothing. Turning is meaningless in the plane, same as peeking.
  if(flat)turnDrag=0;
  else if(!turnDragging){
    turnDrag*=.82;
    if(Math.abs(turnDrag)<.05)turnDrag=0;
  }
  // camera angle includes the peek and the drag; the fold axis never does
  var a=(viewAngle+turnDrag+peek*26)*Math.PI/180;
  var dvx=Math.sin(a),dvz=Math.cos(a);
  var ta=viewAngle*Math.PI/180;
  var tdvx=Math.sin(ta),tdvz=Math.cos(ta),rx=Math.cos(ta),rz=-Math.sin(ta);
  var tilt=(1-flatT)*.62;
  if(dying)shakeT=Math.min(1,shakeT+.12); else shakeT*=.86;
  var sh=shakeT*.35;
  camera.position.set(center.x+dvx*40+(Math.random()-.5)*sh,
                      center.y+(tilt+peek*.22)*34+(Math.random()-.5)*sh,
                      center.z+dvz*40+(Math.random()-.5)*sh);
  camera.up.set(0,1,0);camera.lookAt(center);

  // the depth the player currently occupies, in the current view
  var pdepth=flat ? lastSolidDepth
                  : (player.x*tdvx+player.z*tdvz);
  // One peril lookup per frame, keyed so the block loop can test it in O(1).
  var peril=(typeof foldPeril==="function")?foldPeril():null;
  perilSet=null;
  if(peril){
    perilSet={};
    for(var pi=0;pi<peril.cells.length;pi++){
      var pcell=peril.cells[pi], pkey=K(pcell[0],pcell[1],pcell[2]);
      perilSet[pkey]=1;
      if(perilCleanup.indexOf(pkey)<0)perilCleanup.push(pkey);
    }
  }
  perilPulse=.5+.5*Math.sin(Date.now()*.006);
  for(var k in meshes){
    var m=meshes[k],b=m.userData.base;
    if(m.userData.mark)m.userData.mark.visible=flatT<.45;
    var u=b[0]*rx+b[2]*rz,d=b[0]*tdvx+b[2]*tdvz,fd=d*.012;
    var px=u*rx+fd*tdvx,pz=u*rz+fd*tdvz;
    m.position.set(b[0]+(px-b[0])*flatT,b[1],b[2]+(pz-b[2])*flatT);
    var s=1-.96*flatT;
    m.scale.set(1-(1-s)*Math.abs(tdvx),1,1-(1-s)*Math.abs(tdvz));
    if(perilSet&&perilSet[k]){
      /* Marked as the thing that will crush you. Deliberately NOT passed
         through applyDepth: depth shading exists to push far blocks back, and
         the block that kills you on a fold is usually the far one - fading it
         is exactly the mistake this warning is here to correct. It stays
         vivid at any depth. */
      m.material.color.copy(colPeril).lerp(colInk,flatT);
      m.userData.edge.material.color.set(0xff4d5e);
      m.userData.edge.material.opacity=.55+perilPulse*.45;
      m.material.opacity=1;
    } else if(m.userData.glass){
      // glass has no place in the plane, so it dissolves as the world folds
      var o=Math.max(0,.62*(1-flatT*1.9));
      m.material.opacity=o;
      m.userData.edge.material.opacity=Math.max(0,.95*(1-flatT*1.9));
      m.material.color.copy(colGlass);
    } else if(m.userData.kind===4){
      // fire stays legible when flat - the lethal column is the whole point
      m.material.color.copy(colSpike).lerp(colInk,flatT*.4);
      if(m.userData.tips)fireFlames(m.userData.tips,flatT);
      applyDepth(m,b,pdepth,tdvx,tdvz,flatT);
    } else if(m.userData.anchor){
      // anchors stay legible once flat - they're the reason the fold matters
      m.material.color.copy(colAnchor).lerp(colInk,flatT*.55);
      m.userData.edge.material.opacity=.85;
      applyDepth(m,b,pdepth,tdvx,tdvz,flatT);
    } else {
      var base=ghosted.has(k)?colGhost:colBlock;
      m.material.color.copy(base).lerp(colInk,flatT);
      applyDepth(m,b,pdepth,tdvx,tdvz,flatT);
    }
  }

  // crates fold like stone, and lerp toward their cell so a shove reads as a slide
  for(var ci=0;ci<crateMeshes.length;ci++){
    var cm=crateMeshes[ci],cb=gCrates[ci];
    if(!cb)continue;
    var cu=cb[0]*rx+cb[2]*rz, cd=cb[0]*tdvx+cb[2]*tdvz, cfd=cd*.012;
    var cpx=cu*rx+cfd*tdvx, cpz=cu*rz+cfd*tdvz;
    tmp.set(cb[0]+(cpx-cb[0])*flatT, cb[1], cb[2]+(cpz-cb[2])*flatT);
    cm.position.lerp(tmp,.3);
    var cs=1-.96*flatT;
    cm.scale.set(1-(1-cs)*Math.abs(tdvx),1,1-(1-cs)*Math.abs(tdvz));
    if(cm.userData.mark)cm.userData.mark.visible=flatT<.45;
    var held=R&&R.heldFast&&R.heldFast(cb[0],cb[1],cb[2]);
    // A crate casts a silhouette exactly like stone, so it can be the thing
    // that crushes you on a fold. It lives outside `meshes`, so the peril
    // highlight in the block loop above never saw it.
    var cperil=perilSet&&perilSet[K(cb[0],cb[1],cb[2])];
    cm.material.color.copy(cperil?colPeril:(held?colCrateHeld:colCrate))
      .lerp(colInk,flatT*.75);
    if(cm.children[0])
      cm.children[0].material.color.set(
        cperil?0xff4d5e:(held?0xffd98a:0xe0d4ff));
    if(cperil){cm.material.opacity=1;continue;}   // vivid at any depth
    applyDepth(cm,cb,pdepth,tdvx,tdvz,flatT);
  }
  for(var ki=0;ki<keyMeshes.length;ki++){
    var km=keyMeshes[ki],kc=km.userData.cell;
    var taken=(gKeys&(1<<ki))!==0;
    km.visible=!taken&&flatT<.5;
    if(km.visible){
      km.position.set(kc[0],kc[1]+Math.sin(Date.now()*.003+ki)*.09,kc[2]);
      km.rotation.y+=.03;km.rotation.x+=.017;
    }
  }
  var srcX,srcY,srcZ;
  if(app==="edit"){srcX=L.start[0];srcY=L.start[1];srcZ=L.start[2];}
  else{srcX=player.x;srcY=player.y;srcZ=player.z;}
  var pu=flat?flatPos.u:(srcX*rx+srcZ*rz), py=flat?flatPos.y:srcY;
  var fx=pu*rx+1.2*tdvx,fz=pu*rz+1.2*tdvz;
  tmp.set(srcX+(fx-srcX)*flatT, srcY+(py-srcY)*flatT, srcZ+(fz-srcZ)*flatT);
  if(dying){
    dyingT+=1;
    if(dying==="fall"||dying==="spike"){
      playerMesh.position.x+=(tmp.x-playerMesh.position.x)*.2;
      playerMesh.position.z+=(tmp.z-playerMesh.position.z)*.2;
      playerMesh.position.y-=.12+dyingT*.014;
    } else {
      // Crushed: the closing world squeezes you out along the fold axis, you
      // clear the edge of the plane, and then there is nothing underneath.
      var eject=Math.min(1,dyingT/14);
      playerMesh.position.x+=tdvx*(.42*eject);
      playerMesh.position.z+=tdvz*(.42*eject);
      var flatSquash=Math.max(.25,1-dyingT*.06);
      playerMesh.scale.set(1+(1-flatSquash)*1.4,flatSquash,1+(1-flatSquash)*1.4);
      if(dyingT>14) playerMesh.position.y-=.1+(dyingT-14)*.016;
    }
  } else {
    var before=playerMesh.position.y;
    playerMesh.position.lerp(tmp,.26);
    // squash a little when arriving from above, so landings have weight
    var drop=before-playerMesh.position.y;
    if(drop>.14) squash=Math.min(.42,squash+drop*.35);
    squash*=.86;
    playerMesh.scale.set(1+squash*.55,1-squash,1+squash*.55);
  }
  playerMesh.rotation.y=a;
  // Blinking through the beat of grace after a trial hit. Invulnerability
  // you cannot see is invulnerability you will not use.
  playerMesh.visible=!(trialGrace>0&&Math.floor(Date.now()/85)%2===0);
  if(footMesh){
    footMesh.visible=!dying;
    footMesh.position.set(playerMesh.position.x,
      playerMesh.position.y-.32,playerMesh.position.z);
    footMesh.material.opacity=.42*(1-flatT*.7);
  }

  // A boss arena has no goal square - the target is the boss itself, which
  // draws itself in drawBoss() - so the marker is simply hidden there.
  goalMesh.visible=goalGhost.visible=!B;
  var g=((typeof liveGoal==="function"&&L.goal)?liveGoal():L.goal)||[0,0,0];
  var gu=g[0]*rx+g[2]*rz, gd=g[0]*tdvx+g[2]*tdvz;
  var gx=gu*rx+gd*.012*tdvx, gz=gu*rz+gd*.012*tdvz;
  goalMesh.position.set(g[0]+(gx-g[0])*flatT,g[1],g[2]+(gz-g[2])*flatT);
  goalMesh.rotation.y+=.012;goalMesh.rotation.x+=.008;
  if(goalGhost){
    goalGhost.position.copy(goalMesh.position);
    goalGhost.rotation.copy(goalMesh.rotation);
    goalGhost.scale.copy(goalMesh.scale);
    goalGhost.material.color.copy(goalMesh.material.color);
  }
  if(perilCleanup.length){
    for(var pc=0;pc<perilCleanup.length;pc++){
      var pm=meshes[perilCleanup[pc]];
      if(!pm||(perilSet&&perilSet[perilCleanup[pc]]))continue;
      var pk=pm.userData.kind;
      pm.userData.edge.material.color.set(
        pk===1?0xbdeaf7:pk===2?0xffd98a:pk===4?0xff8a72:0x0f1424);
      pm.userData.edge.material.opacity=pk===1?.95:(pk===2||pk===4?.85:.35);
    }
    perilCleanup=perilCleanup.filter(function(kk){return perilSet&&perilSet[kk];});
  }
  var sealed=app==="play"&&keyMeshes.length&&keysLeft()>0;
  // Amber, not green, on anything with a clock: the colour is the promise
  // that this one will not wait for you.
  var timed=B||TR;
  goalMesh.material.color.set(timed?0xff8a3c:(sealed?0x4a5a6a:0x35c2a5));
  goalMesh.scale.setScalar(sealed?.8:1+Math.sin(Date.now()*.004)*(timed?.14:.06));
  drawBoss(rx,rz,tdvx,tdvz);
  drawTrial(rx,rz);
  /* On a clock, what the GO 2D button means changes without you touching
     anything - a hunter walks into your column, a slice starts charging -
     so it has to be re-judged every frame rather than only when a move
     happens. syncHud still owns the class everywhere else; this runs only
     where there is a clock to keep up with, and it was a real bug before it
     existed: the green "fold now" cue was computed at your last keypress and
     was therefore always describing a board that had moved on. */
  if((TR||B)&&app==="play"&&$("bFlat")){
    var pk=!!peril||(TR?trialFoldPeril():false);
    var hit=(typeof bossCrushable==="function")&&bossCrushable();
    $("bFlat").classList.toggle("peril",pk);
    $("bFlat").classList.toggle("strike",!!hit&&!pk);
  }

  if(bossFlash>0)bossFlash=Math.max(0,bossFlash-.055);
  bossFrame(dtMs);trialFrame(dtMs);
  amb.intensity=.45+.55*flatT;
  dir1.intensity=.85*(1-flatT);
  dir2.intensity=.35*(1-flatT);
  scene.background.copy(colVoid).lerp(colPaper,flatT);
  // The ground swings from the void to paper as the world folds, so the
  // player's rim has to be re-picked against it rather than set once.
  outlineFor(playerMesh,scene.background);
  if(gridLines) gridLines.material.opacity=(app==="edit"?.09:0)+.16*flatT;

  renderer.render(scene,camera);
}
