"use strict";
/* Orthogonal — 10-render.js
   three.js scene, meshes, depth shading, the animation loop.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   THREE
   ============================================================ */
var scene,camera,renderer,meshes={},playerMesh,goalMesh,gridLines,groundPlane,footMesh;
var sweepMesh,sweepEdge,bossMesh,shotMeshes=[];
var trialSlab,trialEdge;
var colPeril=new THREE.Color(0x8f3b52);
var perilSet=null,perilCleanup=[],perilPulse=0;
var crateMeshes=[],keyMeshes=[],goalGhost=null;
var amb,dir1,dir2;
var center=new THREE.Vector3(),centerT=new THREE.Vector3();
var viewSize=10,viewSizeT=10;
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

  boxGeo=new THREE.BoxGeometry(1,1,1);
  edgeGeo=new THREE.EdgesGeometry(boxGeo);
  spikeGeo=new THREE.ConeGeometry(.13,.36,4);
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

  /* The sweep: one translucent slab covering the slice that is about to
     become lethal. Drawn as a single box rather than one marker per cell
     because the attack *is* a slice - showing it whole is both cheaper and
     truer to what the rule actually says. It brightens as the beat lands. */
  sweepMesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
    new THREE.MeshBasicMaterial({color:0xff4d5e,transparent:true,
      opacity:.16,depthWrite:false}));
  sweepMesh.visible=false;sweepMesh.renderOrder=900;
  scene.add(sweepMesh);
  sweepEdge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),
    new THREE.LineBasicMaterial({color:0xff6b7a,transparent:true,opacity:.5}));
  sweepEdge.visible=false;scene.add(sweepEdge);

  /* A trial's sweep: one translucent slab over the slice that is about to
     become lethal. Drawn as a single box rather than a marker per cell
     because the attack *is* a slice - showing it whole is cheaper and truer
     to what the rule says. It has to be its own mesh: the pair above now
     draws the boss's firing line, and a level never has both. */
  trialSlab=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
    new THREE.MeshBasicMaterial({color:0xff4d5e,transparent:true,
      opacity:.12,depthWrite:false}));
  trialSlab.visible=false;trialSlab.renderOrder=900;
  scene.add(trialSlab);
  trialEdge=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),
    new THREE.LineBasicMaterial({color:0xff6b7a,transparent:true,opacity:.4}));
  trialEdge.visible=false;scene.add(trialEdge);

  /* The opponent. Angular and dark against the blocks so it never reads as
     terrain, with a bright core that dims as it loses hits - the health bar
     you actually look at is the thing itself. */
  bossMesh=new THREE.Group();
  var bShell=new THREE.Mesh(new THREE.OctahedronGeometry(.52),
    new THREE.MeshLambertMaterial({color:0x24141c}));
  var bCore=new THREE.Mesh(new THREE.OctahedronGeometry(.24),
    new THREE.MeshBasicMaterial({color:0xff4d5e}));
  var bCage=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(.56)),
    new THREE.LineBasicMaterial({color:0xff6b7a,transparent:true,opacity:.85}));
  bossMesh.add(bShell);bossMesh.add(bCore);bossMesh.add(bCage);
  bossMesh.userData.core=bCore;bossMesh.userData.cage=bCage;
  bossMesh.visible=false;
  scene.add(bossMesh);

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

function addMesh(x,y,z,kind){
  var k=K(x,y,z);
  if(meshes[k])return;
  var glass=kind===1, anchor=kind===2, spike=kind===4;
  var mat=glass
    ? new THREE.MeshLambertMaterial({color:colGlass.clone(),transparent:true,opacity:.5})
    : new THREE.MeshLambertMaterial({
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
    var tips=new THREE.Group();
    [[-.24,-.24],[.24,-.24],[-.24,.24],[.24,.24]].forEach(function(o){
      var c=new THREE.Mesh(spikeGeo,
        new THREE.MeshBasicMaterial({color:0xff8a72}));
      c.position.set(o[0],.62,o[1]);
      tips.add(c);
    });
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
  crateMeshes=[];keyMeshes=[];
}
function buildDynamic(){
  clearDynamic();
  for(var i=0;i<gCrates.length;i++){
    var m=new THREE.Mesh(boxGeo,
      new THREE.MeshLambertMaterial({color:colCrate.clone()}));
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
function recomputeBounds(){
  if(!L.blocks.length){centerT.set(0,0,0);viewSizeT=7;return;}
  var a=[1e9,1e9,1e9],b=[-1e9,-1e9,-1e9];
  var pts=L.blocks.concat(L.keys||[]);
  for(var i=0;i<pts.length;i++)for(var j=0;j<3;j++){
    a[j]=Math.min(a[j],pts[i][j]);b[j]=Math.max(b[j],pts[i][j]);
  }
  centerT.set((a[0]+b[0])/2,(a[1]+b[1])/2+.5,(a[2]+b[2])/2);
  viewSizeT=Math.max(b[0]-a[0],b[2]-a[2],b[1]-a[1])*.72+3.4;
}
/* The boss folds like the world does: flattened it slides onto its silhouette
   column, which is what makes "share its column to strike" legible rather
   than a rule you have to be told. */
function drawBoss(rx,rz,tdvx,tdvz){
  if(!bossMesh)return;
  if(!B||!bossAt||app!=="play"){bossMesh.visible=false;return;}
  bossMesh.visible=true;
  var bu=bossAt.x*rx+bossAt.z*rz, bd=bossAt.x*tdvx+bossAt.z*tdvz;
  var bx=bu*rx+bd*.012*tdvx, bz=bu*rz+bd*.012*tdvz;
  tmp.set(bossAt.x+(bx-bossAt.x)*flatT, bossAt.y, bossAt.z+(bz-bossAt.z)*flatT);
  bossMesh.position.lerp(tmp,.35);
  var reeling=bossStunMs>0;
  bossMesh.rotation.y+=reeling?.005:(bossPhase==="aim"&&bossAim?.05:.02);
  /* Three states, all readable at a glance because you act on them inside a
     second: reeling (dim), open (green - it just spent its shot and can be
     hit), winding up (red, brightening as the lock completes). Lined up AND
     open is brighter still, because that is the instant the fold is a strike
     rather than a way to die. */
  var open=(typeof bossOpen==="function")&&bossOpen();
  var lined=open&&(typeof bossAligned==="function")&&bossAligned()&&!flat;
  bossMesh.userData.core.material.color.setHex(
    reeling?0x6a3540:(open?0x35c2a5:0xff4d5e));
  bossMesh.userData.cage.material.color.setHex(open?0x35c2a5:0xff6b7a);
  bossMesh.userData.cage.material.opacity=reeling?.3:
    (lined?(.85+perilPulse*.15):open?.6:(.45+bossFlash*.5));
  bossMesh.userData.core.scale.setScalar(lined?1.4:1);
  bossMesh.scale.setScalar((1+bossHitFlash*.35)*(reeling?.86:1));
}
/* The telegraph and the shots.

   The aim line is drawn from the boss along the axis it has locked, brightening
   as the wind-up completes, so "where is it about to shoot" is answerable at a
   glance and the dodge is always sideways. Projectiles are their own small
   meshes, pooled rather than rebuilt, and they fold with the world like
   everything else - flattened, a shot at another depth is suddenly in your
   column, which is the risk folding buys you. */
function drawSweep(rx,rz,tdvx,tdvz){
  if(!sweepMesh)return;
  if(!B||!bossAt||app!=="play"||bossPhase!=="aim"||bossStunMs>0||!bossAim){
    sweepMesh.visible=sweepEdge.visible=false;
  } else {
    var reach=18;
    var mx=bossAt.x+bossAim.dx*reach/2, mz=bossAt.z+bossAim.dz*reach/2;
    sweepMesh.scale.set(bossAim.dx?reach:.5, .5, bossAim.dz?reach:.5);
    sweepMesh.position.set(mx,bossAt.y,mz);
    sweepEdge.scale.copy(sweepMesh.scale);
    sweepEdge.position.copy(sweepMesh.position);
    var t=Math.min(1,bossPhaseMs/Math.max(1,B.aim));
    sweepMesh.material.opacity=.10+t*t*.36;
    sweepEdge.material.opacity=.25+t*.6;
    sweepMesh.visible=sweepEdge.visible=true;
  }
  drawShots(rx,rz,tdvx,tdvz);
}
function drawShots(rx,rz,tdvx,tdvz){
  var want=(B&&app==="play")?shots.length:0;
  while(shotMeshes.length<want){
    var m=new THREE.Mesh(new THREE.OctahedronGeometry(.2),
      new THREE.MeshBasicMaterial({color:0xff4d5e}));
    m.add(new THREE.Mesh(new THREE.OctahedronGeometry(.32),
      new THREE.MeshBasicMaterial({color:0xff8a96,transparent:true,opacity:.35})));
    scene.add(m);shotMeshes.push(m);
  }
  for(var i=0;i<shotMeshes.length;i++){
    var sm=shotMeshes[i];
    if(i>=want){sm.visible=false;continue;}
    var sh=shots[i];
    var su=sh.x*rx+sh.z*rz, sd=sh.x*tdvx+sh.z*tdvz;
    var px=su*rx+sd*.012*tdvx, pz=su*rz+sd*.012*tdvz;
    sm.position.set(sh.x+(px-sh.x)*flatT, sh.y, sh.z+(pz-sh.z)*flatT);
    sm.rotation.y+=.25;sm.rotation.x+=.18;
    sm.visible=true;
  }
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
    trialSlab.visible=trialEdge.visible=false;return;
  }
  var sw=TR.beatAt(trialMs), span=20;
  var ph=TR.phase(trialMs), live=TR.live(trialMs);
  // Centred on the arena rather than the origin: a slab hung off world zero
  // trails halfway across the screen and reads as scenery.
  var sx=span,sy=span,sz=span, px=centerT.x,py=centerT.y,pz=centerT.z;
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
    // stays at full span in every direction and swallows the board.
  }
  else if(sw.axis==="x"){ sx=1; px=sw.at; }
  else { sz=1; pz=sw.at; }
  trialSlab.scale.set(sx,sy,sz);
  trialSlab.position.set(px,py,pz);
  trialEdge.scale.copy(trialSlab.scale);
  trialEdge.position.copy(trialSlab.position);
  trialSlab.material.opacity=live?(.40+trialFlash*.34):(.07+ph*ph*.21);
  trialEdge.material.opacity=live?(.75+trialFlash*.25):(.20+ph*.35);
  trialSlab.visible=trialEdge.visible=true;
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
  center.lerp(centerT,.12);
  var pv=viewSize;viewSize+=(viewSizeT-viewSize)*.12;
  if(Math.abs(pv-viewSize)>.005)updateFrustum();

  if(flat)peekTarget=0;                  // peeking is meaningless in the plane
  peek+=(peekTarget-peek)*.12;
  // camera angle includes the peek; the fold axis never does
  var a=(viewAngle+peek*26)*Math.PI/180;
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
      var o=Math.max(0,.5*(1-flatT*1.9));
      m.material.opacity=o;
      m.userData.edge.material.opacity=Math.max(0,.95*(1-flatT*1.9));
      m.material.color.copy(colGlass);
    } else if(m.userData.kind===4){
      // spikes stay legible when flat - the lethal column is the whole point
      m.material.color.copy(colSpike).lerp(colInk,flatT*.4);
      if(m.userData.tips)m.userData.tips.visible=flatT<.6;
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
  if(footMesh){
    footMesh.visible=!dying;
    footMesh.position.set(playerMesh.position.x,
      playerMesh.position.y-.32,playerMesh.position.z);
    footMesh.material.opacity=.42*(1-flatT*.7);
  }

  // A boss arena has no goal square - the target is the boss itself, which
  // draws itself in drawBoss() - so the marker is simply hidden there.
  goalMesh.visible=goalGhost.visible=!B;
  var g=L.goal||[0,0,0];
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
  drawSweep(rx,rz,tdvx,tdvz);
  drawBoss(rx,rz,tdvx,tdvz);
  drawTrial(rx,rz);
  // Whether folding is fatal in a trial is a question about the clock, not
  // about geometry, so the button has to be re-judged every frame rather than
  // only when a move happens. syncHud still owns the class on every other
  // level; this only ever runs where TR is set.
  if(TR&&app==="play"&&$("bFlat"))
    $("bFlat").classList.toggle("peril",!!peril||trialFoldPeril());

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
