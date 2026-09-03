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
// How high above its square a slice's block starts the beat.
var FALL_H=4.2;
var colPeril=new THREE.Color(0x8f3b52);
var perilSet=null,perilCleanup=[],perilPulse=0;
/* The tutorial's landing marker, as the block loop sees it: cell key -> 1 for
   the block that will catch you, 2 for one that lost the tie. Built by
   tutLandMark() out of the same R.landings()/R.pick() pair the fold itself
   uses, and read a few hundred lines below. It is a second channel on top of
   the rings because a RING IS NOT ENOUGH ON THE BLOCK YOU ARE STANDING ON -
   which is exactly the block the first half of `00 - First Landing` is about.
   Under the player, a wireframe cube is swallowed by the block's own lit rim
   and by the player sitting on it, so the one square the lesson is pointing
   at was the one square the marker could not be seen on. */
var tutMarkSet=null;
/* LEVEL-SCOPED DECORATION, and nothing a rule ever asks about.

   `L.tint` is a list of [x,y,z,hex]: cells that are painted a fixed colour
   for as long as that level is loaded. It exists for `00 - First Landing`,
   where the player has to be able to tell two blocks apart THROUGH a half
   turn - two identical grey cubes swap screen position when you turn, so a
   highlight that swaps with them cannot say whether the blocks moved or the
   marker did. A fixed colour can.

   Deliberately NOT a block kind. Kinds carry rules and a fixed vocabulary
   (fire orange, water cyan, crate violet, anchor amber); this is a hue on a
   piece of ordinary stone, it changes nothing about the world, and no level
   outside the tutorial uses it. It multiplies exactly where colBlock did, so
   it inherits the section tint's place in the chain, the depth fade and the
   lerp toward ink for free. */
var tintSet=null, tintCol={};
function buildTints(){
  tintSet=null;
  if(!L||!L.tint||!L.tint.length)return;
  tintSet={};
  for(var i=0;i<L.tint.length;i++){
    var t=L.tint[i], k=K(t[0],t[1],t[2]);
    tintSet[k]=t[3];
    if(!tintCol[t[3]])tintCol[t[3]]=new THREE.Color(t[3]);
  }
}
var crateMeshes=[],keyMeshes=[],goalGhost=null,trialMarks=[];
var amb,dir1,dir2;
var center=new THREE.Vector3(),centerT=new THREE.Vector3();
var repFade=0, repFollow=new THREE.Vector3();
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
/* FOLLOW IS OFF, and the bigger world is why.

   The follow camera existed to give depth back as motion: step in depth and
   the world slides vertically. It was always on trial rather than settled.
   The frustum now fits the arena to the SCREEN rather than to the larger of
   its three spans, which makes every block about 1.6x bigger - and at that
   size a camera that pans to the player pushes the far side of a boss arena
   off the edge. Measured: with the player parked in each arena corner, every
   boss and trial had spawns outside the frustum (worst 1.38 of the way out).

   Being able to see the puzzle beats a motion cue, particularly on the two
   kinds of level that already beat the first real playtester. Set FOLLOW
   back to 1 and the pan returns, at the cost of that framing. */
var FOLLOW=0, FOLLOW_ZOOM=9;
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
  waterGeo=makeLiquidGeo(1.55);   // a bright surface: water shows its light there
  fireGeo =makeLiquidGeo(1.30);   // a molten crust, hot but not white
  edgeGeo=new THREE.EdgesGeometry(new THREE.BoxGeometry(.9,.9,.9));
  liquidEdgeGeo=new THREE.EdgesGeometry(new THREE.BoxGeometry(1,.98,1));
  TEX={stone:stoneTex(),grass:grassTex(),basalt:basaltTex(),
       water:waterTex(),lava:lavaTex(),obsidian:obsidianTex()};
  /* WATER MOVES. The texture is shared by every water block in the world, so
     scrolling its offset animates all of them for the cost of two numbers a
     frame - and because the atlas is [ side | top ], scrolling only V keeps
     each half in its own column and the surface never bleeds into the sides.
     Two speeds crossed against each other, so the swell never visibly loops. */
  TEX.water.wrapS=TEX.water.wrapT=THREE.RepeatWrapping;
  spikeGeo=new THREE.ConeGeometry(.13,.36,4);
  // Taller and thinner than the old spike tip, and five-sided so it reads as
  // a flame rather than as a pyramid at the sizes this game draws.
  /* A LICK, NOT A CONE. Four cones on a block was the note that the fire
     looked bad, and it did: a cone is a solid object with a lit side and a
     dark one, which is the one thing a flame is not. This is a flat tapered
     strip with the colour written into its vertices - white-hot and opaque
     at the base, orange in the middle, gone at the tip - turned to face the
     camera every frame. No solidity to shade, so nothing to look wrong. */
  flameGeo=makeFlameGeo();
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
  buildShield();

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
var flameGeo=null,waterGeo=null,fireGeo=null,liquidEdgeGeo=null,TEX=null;
var skyQuad=null, airField=null, starField=null;
var airPhase=0, flareT=0, flareEvery=0, skyWarm=0, lastFlareP=1;
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
/* STARS. Fixed to the sky rather than drifting through it, which is the
   whole difference between a star and a mote: they twinkle in place and they
   do not wander. Seeded, so a section's sky is the same sky every time it is
   opened - a constellation that reshuffles is not a constellation. */
/* A four-point sparkle: two long thin quads crossed. Cheap, and it is the
   shape everybody draws when they mean "star" rather than "dot". */
var starGeo=null;
function makeStarGeo(){
  var a=new THREE.PlaneGeometry(.10,.016), b=new THREE.PlaneGeometry(.016,.10);
  return mergeRaw([a,b]);
}
function mergeRaw(gs){
  var pos=[],uv=[],idx=[],base=0;
  gs.forEach(function(g){
    var gp=g.attributes.position.array,gu=g.attributes.uv.array,gi=g.index.array,i;
    for(i=0;i<gp.length;i++)pos.push(gp[i]);
    for(i=0;i<gu.length;i++)uv.push(gu[i]);
    for(i=0;i<gi.length;i++)idx.push(gi[i]+base);
    base+=gp.length/3;g.dispose();
  });
  var o=new THREE.BufferGeometry();
  o.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
  o.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
  o.setIndex(idx);
  return o;
}
function makeStars(spec){
  if(!starGeo)starGeo=makeStarGeo();
  var grp=new THREE.Group(), q=rnd(spec.seed||77);
  for(var i=0;i<spec.n;i++){
    /* Three grades rather than two, and the brightest get a four-point
       sparkle instead of a bigger dot: past a certain size a disc reads as a
       bubble, and what says "star" is the cross, not the area. */
    var g=q(), grade=g<.08?2:(g<.3?1:0);
    var st=new THREE.Mesh(grade===2?starGeo:new THREE.CircleGeometry(
        grade===1?.026:.015,6),
      new THREE.MeshBasicMaterial({color:spec.col||0xffffff,transparent:true,
        opacity:0,depthWrite:false,fog:false}));
    st.renderOrder=-990;
    /* Kept out of the lower third: that is where the horizon and most of the
       puzzle live, and a star behind a block is a star nobody sees. */
    st.userData={x:q(), y:.55+q()*.44, ph:q()*Math.PI*2, grade:grade,
                 sp:.4+q()*1.4, a:(grade===2?1:grade===1?.7:.5)*(.55+q()*.45)};
    grp.add(st);
  }
  return grp;
}
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
/* ============================================================
   SCENERY - the far band, drawn once per section
   ============================================================
   A silhouette strip across the bottom of the sky: treeline, or the spires
   and the things moving between them. It is ONE textured quad on the camera,
   so it costs a draw call and never has to be reconciled with the fold, the
   rotation or the depth shading - it is behind the world, always, by
   construction.

   Silhouettes rather than lit scenery on purpose. The game is an
   orthographic abstraction and a rendered forest behind it would be a
   different picture with the puzzle sitting on top; a dark band reads as
   distance and stays out of the way of the one thing that has to be read. */
function sceneryTex(kind){
  var W=512,H=160,c=document.createElement("canvas");
  c.width=W;c.height=H;
  var x=c.getContext("2d");
  x.clearRect(0,0,W,H);
  var q=rnd(kind==="trees"?101:211);
  if(kind==="trees"){
    /* THREE RANKS WITH HAZE BETWEEN THEM, and rounded canopies rather than
       stacked triangles. The first cut was one row of conifer skirts and it
       read as a sawblade - a treeline is a mass with a bumpy top edge, and
       what sells the distance is the pale band BETWEEN the ranks, not the
       detail in any one of them. */
    /* Kept to the lower half of the band: the first cut ran canopies to the
       top of the canvas and the forest became a wall the puzzle sat on top
       of. A treeline is a strip along the bottom of the sky. */
    var ranks=[[.22,"#2b4a3a",30,34,1],
               [.5, "#1c3628",38,46,1],
               [1,  "#0d1f16",48,60,0]];
    ranks.forEach(function(r){
      x.fillStyle=r[1];
      var px=-30;
      while(px<W+30){
        /* SCATTERED, not spaced. The step below runs from well under a
           canopy width to well over it, so trees clump and then leave gaps
           of open ground - an even step is what made the first two cuts read
           as a fence or a hedge rather than as a wood. */
        var w=r[2]*(.55+q()*.95), h=r[3]*(.55+q()*.85), by=H-4-(1-r[0])*10;
        // trunk
        x.fillRect(px-Math.max(1.5,w*.05),by-h*.42,Math.max(3,w*.1),h*.42);
        // canopy: three overlapping lumps, biggest in the middle
        [[0,-h*.72,w*.52],[-w*.34,-h*.5,w*.4],[w*.34,-h*.52,w*.38]]
          .forEach(function(l){
            x.beginPath();
            x.ellipse(px+l[0],by+l[1],l[2],l[2]*(.72+q()*.4),0,0,Math.PI*2);
            x.fill();
          });
        px+=w*(.34+q()*1.5);
      }
      /* Haze as a GRADIENT, not a flat rectangle. A flat wash put a hard
         horizontal line across the forest, which reads as a seam in the
         drawing rather than as air between the ranks. */
      /* GROUND UNDER THEM. Without it the trunks ended in mid-air and the
         wood read as cut out and pasted on; a band of tufts is what joins
         the trees to the bottom of the picture. */
      if(r[0]===1){
        x.fillStyle="#12281a";x.fillRect(0,H-16,W,16);
        for(var gx=-4;gx<W+4;){
          var gw=7+q()*13, gh=5+q()*13;
          x.fillStyle=q()<.5?"#1b3a24":"#16311d";
          x.beginPath();
          x.moveTo(gx,H);x.quadraticCurveTo(gx+gw*.5,H-gh*1.5,gx+gw,H);
          x.closePath();x.fill();
          gx+=gw*(.4+q()*.7);
        }
      }
      if(r[4]){
        var hz=x.createLinearGradient(0,H-84,0,H);
        hz.addColorStop(0,"rgba(122,158,150,.02)");
        hz.addColorStop(1,"rgba(122,158,150,.19)");
        x.fillStyle=hz;x.fillRect(0,H-84,W,84);
      }
    });
  } else if(kind==="dunes"){
    /* III - a canyon at dusk. Layered mesas rather than peaks: flat tops and
       vertical sides, which is the one horizon shape that is neither a
       treeline nor a ridge of spikes, so the three sections cannot be
       confused at a glance. */
    var g2=x.createLinearGradient(0,H,0,H-110);
    g2.addColorStop(0,"rgba(255,170,96,.5)");g2.addColorStop(1,"rgba(210,110,60,0)");
    x.fillStyle=g2;x.fillRect(0,H-110,W,110);
    [[.4,"#5a3324",44],[.75,"#2e1a14",72]].forEach(function(r){
      x.fillStyle=r[1];
      var px=-40;
      while(px<W+40){
        var w=70+q()*130, h=r[2]*(.5+q()*.8);
        x.fillRect(px,H-h,w,h);                       // the mesa
        x.fillRect(px+w*.2,H-h-6-q()*10,w*.5,10);     // a cap on some of them
        px+=w*(.55+q()*.7);
      }
    });
  } else if(kind==="ocean"){
    /* III - THE SEA, AT THE END OF THE DAY. The section teaches water, so
       the horizon is water; the sky above it stays warm rather than blue for
       the reason the whole palette is built on - a blue world swallows a
       cyan water block, which is the one piece this section exists to show.
       Sunset over the sea keeps both: unmistakably ocean, and cyan still
       sings against it.

       Drawn as bands rather than as waves in perspective. Distance here is
       carried by the crests getting shorter, paler and closer together
       toward the horizon, which is what the eye actually reads. */
    var sea=x.createLinearGradient(0,H-96,0,H);
    sea.addColorStop(0,"#123448");sea.addColorStop(.45,"#0e2b3e");
    sea.addColorStop(1,"#0a2233");
    x.fillStyle=sea;x.fillRect(0,H-96,W,96);
    /* THE SUN THE ROAD BELONGS TO. The glitter path was there with nothing
       at the top of it, which is a reflection of something that is not in
       the picture - reported exactly that way. It sits ON the horizon, half
       in the water, at the road's own x: the road is drawn from 0.52 to 0.60
       across, so the sun is centred at 0.56 and the two cannot drift apart.
       Drawn before the road, so the glitter runs over it. */
    var oy=H-96, ox=W*.56;
    var halo=x.createRadialGradient(ox,oy,4,ox,oy,60);
    halo.addColorStop(0,"rgba(255,224,150,.70)");
    halo.addColorStop(.35,"rgba(255,180,96,.28)");
    halo.addColorStop(1,"rgba(255,150,70,0)");
    x.fillStyle=halo;
    x.beginPath();x.arc(ox,oy,60,0,Math.PI*2);x.fill();
    var disc=x.createRadialGradient(ox,oy,2,ox,oy,23);
    disc.addColorStop(0,"rgba(255,250,226,.98)");
    disc.addColorStop(.7,"rgba(255,228,158,.92)");
    disc.addColorStop(1,"rgba(255,196,110,.5)");
    x.fillStyle=disc;
    x.beginPath();x.arc(ox,oy,23,0,Math.PI*2);x.fill();
    // The glitter path: the sun's road on the water, brightest at the top.
    var road=x.createLinearGradient(0,H-96,0,H-18);
    road.addColorStop(0,"rgba(255,196,120,.55)");
    road.addColorStop(1,"rgba(255,150,80,0)");
    x.fillStyle=road;
    x.beginPath();x.moveTo(W*.60,H-96);x.lineTo(W*.72,H-18);
    x.lineTo(W*.30,H-18);x.lineTo(W*.52,H-96);x.closePath();x.fill();
    /* Crests. Short dashes, and the two things that carry depth are their
       LENGTH and their spacing - both grow toward the bottom of the band. */
    for(var wy=H-94;wy<H-20;wy+=2.4){
      var near=(wy-(H-94))/74;                     // 0 at the horizon, 1 near
      var len=2+near*22, gap=6+near*40;
      x.fillStyle="rgba(190,224,238,"+(.05+near*.20).toFixed(3)+")";
      for(var wx=-gap*q();wx<W;wx+=gap*(.5+q()*1.2))
        x.fillRect(wx,wy,len*(.4+q()*1.1),1+near*1.2);
    }
    /* THE BREAK. Two long crests near the shore with foam under them - the
       one place the sea stops being a texture and becomes an event. */
    [[H-34,.55],[H-25,.85]].forEach(function(b){
      x.fillStyle="rgba(226,244,250,"+b[1]*.5+")";
      x.beginPath();x.moveTo(-10,b[0]);
      for(var bx=-10;bx<W+10;bx+=16)
        x.lineTo(bx,b[0]-2.5-Math.abs(Math.sin(bx*.031))*4.5);
      x.lineTo(W+10,b[0]+4);x.lineTo(-10,b[0]+4);x.closePath();x.fill();
      for(var fx=-6;fx<W+6;fx+=3+q()*9){
        x.fillStyle="rgba(236,250,255,"+(b[1]*(.10+q()*.4)).toFixed(3)+")";
        x.beginPath();x.arc(fx,b[0]+1+q()*4,.8+q()*2.4,0,Math.PI*2);x.fill();
      }
    });
    // THE SHORE. Wet sand first, because that is what the water leaves.
    x.fillStyle="#3b3a3a";x.fillRect(0,H-20,W,20);
    x.fillStyle="#4a4338";x.fillRect(0,H-16,W,16);
    x.fillStyle="#5a5040";x.fillRect(0,H-9,W,9);
    for(var sg=0;sg<220;sg++){
      x.fillStyle="rgba(24,22,18,"+(.1+q()*.3).toFixed(2)+")";
      x.fillRect(q()*W,H-18+q()*18,1+q()*2,1);
    }
  } else if(kind==="desert"){
    /* IV - THE DESERT, AT NOON. The one horizon in the game lit from above
       rather than from behind: everywhere else the band is a silhouette
       against a glow, and here the glow is overhead and the dunes are pale.
       That is the whole reason it cannot be confused with the canyon it
       replaced, and it is why the sand section reads as heat rather than as
       another dusk. */
    var sky2=x.createLinearGradient(0,H-130,0,H-46);
    sky2.addColorStop(0,"rgba(255,214,150,0)");
    sky2.addColorStop(1,"rgba(255,206,140,.42)");
    x.fillStyle=sky2;x.fillRect(0,H-130,W,84);
    /* THE SUN, and it is a radial gradient filled through a circular path.
       A linear gradient in a fillRect draws a visible box - the ramp runs
       one way and the other three edges stop dead - which on a pale sky
       reads as a lit rectangle rather than as a sun. */
    var sunx=W*.74, suny=H-116, sr=44;
    var sg2=x.createRadialGradient(sunx,suny,2,sunx,suny,sr);
    sg2.addColorStop(0,"rgba(255,252,232,.95)");
    sg2.addColorStop(.22,"rgba(255,236,176,.72)");
    sg2.addColorStop(.55,"rgba(255,206,124,.24)");
    sg2.addColorStop(1,"rgba(255,190,110,0)");
    x.fillStyle=sg2;
    x.beginPath();x.arc(sunx,suny,sr,0,Math.PI*2);x.fill();
    x.fillStyle="rgba(255,250,226,.92)";
    x.beginPath();x.arc(sunx,suny,10,0,Math.PI*2);x.fill();
    /* DUNES AS CURVES, not as boxes. A dune has no vertical edge anywhere on
       it, which is the whole difference between this and the mesas. */
    [[.35,"#8a7048",26,H-52],[.62,"#6d573a",34,H-34],[1,"#4c3d2a",40,H-16]]
      .forEach(function(r){
        x.fillStyle=r[1];
        x.beginPath();x.moveTo(-20,H);x.lineTo(-20,r[3]);
        var dy=r[3];
        for(var dx=-20;dx<W+40;){
          var dw=60+q()*140, dh=r[2]*(.35+q()*1.0);
          x.quadraticCurveTo(dx+dw*.5,dy-dh,dx+dw,dy-dh*(.1+q()*.3));
          dy=dy-dh*(.1+q()*.3)+dh*(.1+q()*.35);
          dx+=dw;
        }
        x.lineTo(W+40,H);x.closePath();x.fill();
      });
    /* ONE CACTUS. One, because a saguaro is a landmark and a row of them is
       a hedge - and because the repeat is 1 for exactly this reason. */
    var cx2=W*.22, cy2=H-40;
    x.fillStyle="#20321f";
    var arm=function(ax,ay,h2,w2){
      x.beginPath();
      x.moveTo(ax-w2,ay);x.lineTo(ax-w2,ay-h2+w2);
      x.arc(ax,ay-h2+w2,w2,Math.PI,0);
      x.lineTo(ax+w2,ay);x.closePath();x.fill();
    };
    arm(cx2,cy2,54,7);
    x.save();x.translate(cx2-7,cy2-26);x.rotate(-Math.PI/2);
    x.fillRect(0,-4.5,13,9);x.restore();
    arm(cx2-19,cy2-13,26,4.5);
    x.save();x.translate(cx2+7,cy2-34);x.rotate(Math.PI/2);
    x.fillRect(0,-4,11,8);x.restore();
    arm(cx2+17,cy2-22,20,4);
  } else if(kind==="ruins"){
    /* IV - broken columns. The crates section is the one about moving things
       that were put somewhere, so its horizon is a place things were put. */
    var g3=x.createLinearGradient(0,H,0,H-96);
    g3.addColorStop(0,"rgba(220,196,140,.34)");g3.addColorStop(1,"rgba(180,150,96,0)");
    x.fillStyle=g3;x.fillRect(0,H-96,W,96);
    [[.4,"#4a412c",52],[.8,"#241f15",84]].forEach(function(r){
      x.fillStyle=r[1];
      var px=-30;
      while(px<W+30){
        var w=14+q()*22, h=r[2]*(.35+q()*1.0);
        x.fillRect(px,H-h,w,h);
        if(q()<.45)x.fillRect(px-4,H-h-7,w+8,7);      // a broken capital
        px+=w*(.7+q()*2.4);                            // widely, unevenly spaced
      }
    });
  } else if(kind==="shards"){
    /* V - the shelf past the last warden. Almost nothing: a few slabs
       hanging in the dark, because it is the part of the world that was
       never counted and should look like nowhere. */
    x.fillStyle="#161426";
    for(var i2=0;i2<16;i2++){
      var sx=q()*W, sy=H-10-q()*90, sw=18+q()*54, sh=5+q()*16;
      x.save();x.translate(sx,sy);x.rotate((q()-.5)*.5);
      x.fillRect(-sw/2,-sh/2,sw,sh);x.restore();
    }
  } else {
    // HELL: jagged basalt spires, and a molten line burning along their feet
    /* The glow goes down FIRST and has to be strong, because the spires are
       drawn over it and a near-black spire on a near-black sky is nothing at
       all. The bright band is what the silhouette is a silhouette against -
       that was the first cut's mistake, and it is the whole trick of a
       skyline. */
    var g=x.createLinearGradient(0,H,0,H-118);
    g.addColorStop(0,"rgba(255,132,44,.95)");
    g.addColorStop(.45,"rgba(226,74,30,.45)");
    g.addColorStop(1,"rgba(180,40,20,0)");
    x.fillStyle=g;x.fillRect(0,H-118,W,118);
    /* [depth, colour, height] - three entries, so the height is r[2]. It was
       written as r[3] to match the treeline's four-entry rows above, which
       made every spire NaN tall: canvas draws nothing at all for a NaN path
       and throws nothing either, so the band rendered as a bare gradient and
       looked like a colour choice rather than a bug. */
    /* Broad and low, not needles. The first cut ran to 132px on a 160px
       canvas and grew a picket fence up through the puzzle - a horizon has
       to sit UNDER the thing being played, so the tallest spire is about a
       third of the band and the bases overlap into a ridge. */
    [[.35,"#3b1c26",40],[.7,"#0d0508",58]].forEach(function(r){
      x.fillStyle=r[1];
      var px=-40;
      while(px<W+40){
        var w=54+q()*76, h=r[2]*(.55+q()*.75);
        x.beginPath();
        x.moveTo(px,H);x.lineTo(px+w*.5,H-h);x.lineTo(px+w,H);
        x.closePath();x.fill();
        px+=w*(.42+q()*.34);
      }
    });
    /* THE VOLCANO. One cone, off centre, taller than everything on the ridge
       and drawn last so it stands in front of it - the eruption already
       existed as a colour in the sky (theme.flare) and had nothing to erupt
       FROM, which is what made it read as the screen flickering rather than
       as a place doing something. The crater is a bright notch; the plume
       above it is a separate quad, because it has to breathe with the flare
       and a baked texture cannot. */
    var vx0=W*.68, vw=176, vh=106;
    x.fillStyle="#0a0406";
    x.beginPath();
    x.moveTo(vx0-vw/2,H);
    x.lineTo(vx0-vw*.12,H-vh);
    x.lineTo(vx0+vw*.12,H-vh);
    x.lineTo(vx0+vw/2,H);
    x.closePath();x.fill();
    /* The crater is a RADIAL glow filled through a circular path. A linear
       gradient in a fillRect draws a visible box - the ramp only runs one
       way and the other three edges end abruptly - which on a dark ridge
       reads as a lit rectangle sitting on the mountain. Anything glowing
       needs to fade out on every side it has. */
    var cgx=vx0, cgy=H-vh+4, cgr=vw*.30;
    var cg=x.createRadialGradient(cgx,cgy,1,cgx,cgy,cgr);
    cg.addColorStop(0,"rgba(255,224,150,.95)");
    cg.addColorStop(.35,"rgba(255,150,54,.55)");
    cg.addColorStop(1,"rgba(255,90,30,0)");
    x.fillStyle=cg;
    x.beginPath();x.arc(cgx,cgy,cgr,0,Math.PI*2);x.fill();
    // the mouth itself, so there is something solid at the centre of it
    x.fillStyle="rgba(255,236,186,.9)";
    x.beginPath();x.ellipse(cgx,cgy,vw*.11,5,0,0,Math.PI*2);x.fill();
    /* LAVA COMES OUT OF IT, rather than a line being drawn on it. A single
       stroke reads as a crack in the rock; what says "flowing" is a stream
       that STARTS NARROW AT THE MOUTH AND WIDENS AS IT FALLS, splits, and
       ends in something pooled and bright at the foot. So each flow is a
       tapered polygon down one flank, with a hotter core inside it. */
    function flow(x0,dir,n){
      var pts=[], px2=x0, py2=H-vh+6, wdt=3;
      for(var i2=0;i2<n;i2++){
        pts.push([px2,py2,wdt]);
        py2+=(vh-6)/n;
        px2+=dir*(vw*.5-vw*.12)/n*(.55+q()*.9);   // follows the cone's flank
        wdt+=1.0+q()*1.9;                          // gathers as it falls
      }
      pts.push([px2,H,wdt+3]);
      // outer, cooler edge
      x.fillStyle="rgba(212,74,22,.62)";
      x.beginPath();
      for(var a2=0;a2<pts.length;a2++)x.lineTo(pts[a2][0]-pts[a2][2],pts[a2][1]);
      for(var b2=pts.length-1;b2>=0;b2--)x.lineTo(pts[b2][0]+pts[b2][2],pts[b2][1]);
      x.closePath();x.fill();
      // hotter core, narrower, so the stream has depth rather than being flat
      x.fillStyle="rgba(255,190,84,.72)";
      x.beginPath();
      for(var a3=0;a3<pts.length;a3++)x.lineTo(pts[a3][0]-pts[a3][2]*.42,pts[a3][1]);
      for(var b3=pts.length-1;b3>=0;b3--)x.lineTo(pts[b3][0]+pts[b3][2]*.42,pts[b3][1]);
      x.closePath();x.fill();
      return px2;
    }
    var f1=flow(vx0+vw*.03, 1,7);
    var f2=flow(vx0-vw*.03,-1,7);
    flow(vx0+vw*.01,1,4);                 // a third, shorter, that peters out
    // pooled and burning at the foot of it, which is where a flow ends up
    [f1,f2].forEach(function(fx){
      var pg=x.createRadialGradient(fx,H,2,fx,H,46);
      pg.addColorStop(0,"rgba(255,214,130,.9)");
      pg.addColorStop(.4,"rgba(255,120,40,.45)");
      pg.addColorStop(1,"rgba(255,90,30,0)");
      x.fillStyle=pg;
      x.beginPath();x.arc(fx,H,46,Math.PI,Math.PI*2);x.fill();
    });
    // spatter thrown clear of the mouth
    for(var sp2=0;sp2<14;sp2++){
      x.fillStyle=q()<.5?"#ffca55":"#ff7a28";
      var sr=2+q()*3;
      x.beginPath();
      x.arc(vx0+(q()-.5)*vw*.55, H-vh-q()*36, sr,0,Math.PI*2);
      x.fill();
    }
  }
  var t=new THREE.CanvasTexture(c);
  /* Tiled twice for the bands that are pure texture, and ONCE for hell -
     it has a volcano in it, and a volcano that repeats is two volcanoes.
     Anything with a landmark in it has to map across the band exactly once. */
  /* `repeat 2` for a band that is pure texture, `1` for one with a LANDMARK
     in it: hell has a volcano, the desert has a sun and a cactus, and the
     ocean has the sun's road on the water. Two of any of those is two suns. */
  t.wrapS=THREE.RepeatWrapping;
  t.repeat.set((kind==="hell"||kind==="desert"||kind==="ocean")?1:2,1);
  return t;
}
/* THE THINGS MOVING IN IT. Small dark silhouettes with two lit eyes,
   drifting across the far band - the residents, seen at a distance. They are
   part of the scenery layer and never enter the world: nothing here is a
   hunter, and a shape a player could mistake for one would be a lie the
   fight has to pay for. */
function demonTex(){
  var S=64,c=document.createElement("canvas");c.width=S;c.height=S;
  var x=c.getContext("2d");
  x.clearRect(0,0,S,S);
  x.fillStyle="#0b0508";
  x.beginPath();                       // hunched body
  x.moveTo(32,10);x.lineTo(48,26);x.lineTo(44,52);x.lineTo(20,52);x.lineTo(16,26);
  x.closePath();x.fill();
  x.beginPath();x.moveTo(18,14);x.lineTo(24,4);x.lineTo(26,16);x.closePath();x.fill();
  x.beginPath();x.moveTo(46,14);x.lineTo(40,4);x.lineTo(38,16);x.closePath();x.fill();
  x.fillStyle="#ff8a3c";
  x.fillRect(24,26,5,4);x.fillRect(35,26,5,4);
  return new THREE.CanvasTexture(c);
}
/* The plume over the crater. A separate quad because it has to ramp with
   `skyWarm` - the same value that warms the sky - so the sky brightening and
   the mountain throwing something up are one event rather than two things
   that happen near each other. Additive, so it reads as light rather than as
   a grey shape pasted on a dark ridge. */
function makePlume(){
  var c=document.createElement("canvas");c.width=128;c.height=128;
  var x=c.getContext("2d");
  /* Centred, and the falloff reaches zero at 0.44 of the canvas - well
     inside its own edges. The first cut put the source on the bottom edge
     with a radius larger than the canvas, so the gradient was still bright
     where it ran out of pixels and the quad's own rectangle was visible on
     screen. An additive quad shows every edge you leave it. */
  var g=x.createRadialGradient(64,64,2,64,64,56);
  g.addColorStop(0,"rgba(255,214,140,.95)");
  g.addColorStop(.30,"rgba(255,130,50,.40)");
  g.addColorStop(.70,"rgba(255,90,32,.10)");
  g.addColorStop(1,"rgba(255,80,30,0)");
  x.fillStyle=g;x.fillRect(0,0,128,128);
  var m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,
      opacity:0,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
  m.renderOrder=-975;m.position.z=-244;
  return m;
}
/* EMBERS OFF THE CRATER, which is what actually makes the mountain move.
   The lava flows are baked into the scenery texture - one quad, one draw
   call, and that is why the horizon is free - so nothing in them can
   animate. Motion has to come from things drawn ON TOP of it: sparks
   thrown out of the mouth, and a glow that surges.

   They rise fast, drift, and die out well before the top of the band, so the
   eye reads them as coming FROM the crater rather than as more weather. */
function makeSparks(n){
  var g=new THREE.Group();
  for(var i=0;i<n;i++){
    var q=new THREE.Mesh(new THREE.CircleGeometry(.012,8),
      new THREE.MeshBasicMaterial({color:0xffb04a,transparent:true,opacity:0,
        depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
    q.renderOrder=-968;
    q.userData={t:Math.random(), sp:.55+Math.random()*.9,
                dx:(Math.random()-.5)*.9, sz:.6+Math.random()*1.1};
    g.add(q);
  }
  return g;
}
var sceneQuad=null, demonGrp=null, plumeQuad=null, sparkGrp=null;
/* One slot per section's moving layer. They are all torn down together in
   applyTheme, so a section that does not ask for one simply has none. */
var birdGrp=null, meteorGrp=null, boatGrp=null, tumbleGrp=null, devilGrp=null;
/* CHARRED. The burn ends with the cube black, because that is what the fire
   leaves behind - the flames go out and something burnt is still standing
   there for the rest of the beat. It is the body's own colour driven to soot
   rather than a second material: buildPlayerMesh() hands one material to
   every part it makes, so one write chars a pup as completely as a cube, and
   the adaptive rim outlineFor() re-picks every frame is what keeps the
   silhouette readable once the body has gone nearly to the void.

   The char is late and fast (nothing until a third of the way in, then all of
   it), so the cube is plainly itself while the flames are climbing and plainly
   ruined once they are out - a colour that starts sliding on the first frame
   just reads as the light changing.

   Restored by the same function on the first frame that is not a burn, so
   nothing else has to know it happened: die() puts the player back at the
   start with the level, and the mesh it puts back is the mesh that burned. */
var PLAYER_CHAR=0x120d0b, playerCharT=-1, charCol=new THREE.Color();
function playerChar(t){
  if(!playerMesh||t===playerCharT)return;
  playerCharT=t;
  var base=findBy(SKIN_COLORS,wardrobe.color).hex;
  playerMesh.traverse(function(c){
    if(!c.isMesh||!c.material||!c.material.color)return;
    c.material.color.setHex(base).lerp(charCol.setHex(PLAYER_CHAR),t);
  });
}
var burnGrp=null;                 // the flames that take you - see the death
var boomGrp=null, foamQuad=null;
/* The sea's clock. seaT counts down to the next break, seaFired says the
   sound for it has already been started, and foamP is the sweep. */
var seaT=4, seaFired=false, foamP=1;
/* WIND, and it is one number the whole section reads. The treeline cannot
   move - it is baked - so what sells wind is everything ELSE moving on the
   same slow rhythm: the band leaning, the leaves crossing, the canopy
   breathing. Two sines rather than one, so the gusts do not arrive on a
   metronome. */
function windAt(t){
  return Math.sin(t*.55)*.6+Math.sin(t*.23+1.7)*.4;
}
function makeScenery(kind){
  var m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
    new THREE.MeshBasicMaterial({map:sceneryTex(kind),transparent:true,
      opacity:.9,depthWrite:false,fog:false}));
  m.renderOrder=-980;m.position.z=-245;
  return m;
}
function makeDemons(n){
  var g=new THREE.Group(),tex=demonTex();
  for(var i=0;i<n;i++){
    var q=new THREE.Mesh(new THREE.PlaneGeometry(.5,.5),
      new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.0,
        depthWrite:false,fog:false}));
    q.renderOrder=-970;
    q.userData={x:Math.random(),sp:.35+Math.random()*.5,
                ph:Math.random()*Math.PI*2,sc:.7+Math.random()*.7};
    g.add(q);
  }
  return g;
}

/* ============================================================
   THE THINGS THAT MOVE IN FRONT OF THE HORIZON

   The scenery band is one baked texture on one quad, which is what makes a
   horizon free - and it is also why NOTHING IN IT CAN MOVE. Every section's
   life therefore comes from a second layer: a handful of small sprites on
   the camera, drawn over the band, each with one job.

   They share a shape. One canvas texture built once per kind, one group of
   planes sharing it, and a per-frame walk in layoutAtmosphere() that places
   them in FRUSTUM fractions rather than world units - so they hold their
   place on screen while the camera follows the player, exactly as the sky
   and the band do. All of them fade out with the fold: there is no distance
   in a silhouette, so there is nowhere for a bird to be.
   ============================================================ */
function spriteTex(w,h,draw){
  var c=document.createElement("canvas");
  c.width=w;c.height=h;
  draw(c.getContext("2d"),w,h);
  var t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.LinearFilter;
  return t;
}
function spriteGroup(n,tex,order,init){
  var g=new THREE.Group();
  for(var i=0;i<n;i++){
    var m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
      new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0,
        depthWrite:false,fog:false}));
    m.renderOrder=order;
    m.userData=init(i);
    g.add(m);
  }
  g.userData.tex=tex;
  return g;
}
/* I - BIRDS. A V, because at fifteen pixels across that is the whole of what
   a bird is; the flap is the V opening and closing, which is done by scaling
   the sprite rather than by a second drawing. They cross in a loose skein -
   each one keeps its own speed and its own height, so they string out and
   bunch up the way birds do rather than flying in formation. */
function makeBirds(n){
  var tex=spriteTex(64,40,function(x,w,h){
    x.strokeStyle="#0d1512";x.lineCap="round";
    [[1,3.4],[0,0]].forEach(function(p,i){
      x.lineWidth=i?3.0:5.2;
      x.strokeStyle=i?"#16241d":"rgba(10,16,13,.5)";
      x.beginPath();
      x.moveTo(6,h*.30+p[1]);
      x.quadraticCurveTo(w*.34,h*.72+p[1],w*.5,h*.40+p[1]);
      x.quadraticCurveTo(w*.66,h*.72+p[1],w-6,h*.30+p[1]);
      x.stroke();
    });
  });
  return spriteGroup(n,tex,-966,function(){
    return {x:Math.random()*1.4-.2, y:.52+Math.random()*.34,
            sp:.9+Math.random()*1.5, ph:Math.random()*Math.PI*2,
            fl:5+Math.random()*3.5, sc:.55+Math.random()*.75,
            dir:Math.random()<.5?-1:1};
  });
}
/* THE BIRD THAT IS SINGING, AND YOU CAN SEE WHICH ONE.

   A call with nothing on screen making it is a sound effect. `ambBirdPhrase`
   hands the moment over as it starts one, this picks whichever bird is most
   visible - nearest the middle of the frame, because a ripple half off the
   edge points at nothing - and marks it for the length of the phrase.

   What the mark is: two arcs opening away from the bird, in the goal green
   the game already uses for "look here", and the bird itself flapping harder
   and riding up on each note. The arcs are the cue; the flap is what makes
   the cue belong to that bird rather than float beside it. */
var singGrp=null, singBird=-1, singT=0, singLen=1;
function makeSing(){
  var tex=spriteTex(64,64,function(x,w,h){
    x.strokeStyle="rgba(150,240,205,.9)";x.lineCap="round";
    // two arcs, opening rightward, thinning as they go out
    [[16,4.4],[27,2.8]].forEach(function(a){
      x.lineWidth=a[1];
      x.beginPath();x.arc(12,32,a[0],-0.85,0.85);x.stroke();
    });
  });
  return spriteGroup(2,tex,-965,function(i){return {d:i*.34};});
}
function birdSing(len){
  if(!birdGrp||!birdGrp.children.length)return;
  var best=-1,bd=9;
  for(var i=0;i<birdGrp.children.length;i++){
    var u=birdGrp.children[i].userData, d=Math.abs(u.x-.5);
    // must be well inside the frame, or the ripple points off the edge
    if(u.x<.18||u.x>.82)continue;
    if(d<bd){bd=d;best=i;}
  }
  if(best<0)return;
  singBird=best;singT=0;singLen=len||.9;
}
/* II - METEORS ON FIRE. Falling across the top of the sky rather than at the
   player: this is weather over the volcano, not something aimed. Each is a
   head with a trail behind it, baked pointing right and turned in the world,
   so one texture serves every angle.

   They arrive in their own time - `wait` holds a meteor off screen for a few
   seconds after it lands, so the sky is mostly empty and a streak is an
   event. A continuous rain of them reads as a screensaver. */
function makeMeteors(n){
  var tex=spriteTex(128,24,function(x,w,h){
    var g=x.createLinearGradient(0,0,w,0);
    g.addColorStop(0,"rgba(255,120,30,0)");
    g.addColorStop(.55,"rgba(255,150,60,.30)");
    g.addColorStop(.88,"rgba(255,206,120,.85)");
    g.addColorStop(1,"rgba(255,246,214,0)");
    x.fillStyle=g;
    x.beginPath();
    x.moveTo(0,h*.5);x.lineTo(w*.92,h*.5-4.6);
    x.lineTo(w*.92,h*.5+4.6);x.closePath();x.fill();
    var hd=x.createRadialGradient(w*.90,h*.5,.5,w*.90,h*.5,11);
    hd.addColorStop(0,"rgba(255,252,238,.98)");
    hd.addColorStop(.35,"rgba(255,208,120,.8)");
    hd.addColorStop(1,"rgba(255,140,50,0)");
    x.fillStyle=hd;
    x.beginPath();x.arc(w*.90,h*.5,11,0,Math.PI*2);x.fill();
  });
  return spriteGroup(n,tex,-967,function(i){
    return {t:1, wait:i*2.2+Math.random()*2.5, sp:.55+Math.random()*.5,
            sc:.7+Math.random()*.8, ang:0, ex:0};
  });
}
/* THE FLASH WHERE ONE LANDS. A meteor that fades out in mid-air is a meteor
   that went somewhere else; one that hits the ground is an event with a
   place and a moment, which is what the boom is then the sound of. */
function makeBooms(n){
  var tex=spriteTex(64,64,function(x,w,h){
    var g=x.createRadialGradient(32,32,1,32,32,32);
    g.addColorStop(0,"rgba(255,252,238,.95)");
    g.addColorStop(.25,"rgba(255,206,124,.6)");
    g.addColorStop(.6,"rgba(255,140,50,.18)");
    g.addColorStop(1,"rgba(255,120,40,0)");
    x.fillStyle=g;x.beginPath();x.arc(32,32,32,0,Math.PI*2);x.fill();
  });
  return spriteGroup(n,tex,-966,function(){return {t:0,x:0,y:0};});
}
/* III - SAILING BOATS. Two of them, small, slow, and always ON the horizon
   line - the sea's own scale is the thing they are there to give, and a boat
   drawn anywhere but the waterline gives the wrong one. They bob on the same
   phase clock the crests use, so the sea and the things on it agree. */
function makeBoats(n){
  var tex=spriteTex(64,64,function(x,w,h){
    x.fillStyle="#101c26";
    // hull
    x.beginPath();
    x.moveTo(w*.16,h*.72);x.lineTo(w*.86,h*.72);
    x.lineTo(w*.74,h*.83);x.lineTo(w*.26,h*.83);x.closePath();x.fill();
    // mast and two sails, the near one taller
    x.fillRect(w*.49,h*.18,1.8,h*.54);
    x.beginPath();
    x.moveTo(w*.50,h*.17);x.lineTo(w*.50,h*.70);x.lineTo(w*.80,h*.70);
    x.closePath();x.fill();
    x.beginPath();
    x.moveTo(w*.47,h*.26);x.lineTo(w*.47,h*.70);x.lineTo(w*.25,h*.70);
    x.closePath();x.fill();
  });
  return spriteGroup(n,tex,-969,function(i){
    return {x:i*.5+Math.random()*.3, sp:.010+Math.random()*.012,
            ph:Math.random()*Math.PI*2, sc:.7+Math.random()*.5,
            dir:i%2?-1:1};
  });
}
/* IV - THE TUMBLEWEED AND THE DUST DEVIL, which are the two things a desert
   is allowed to do while nothing else happens. The weed ROLLS - it is the
   only sprite in the game that rotates on its own axis, and that rotation is
   the whole read: a ragged ball sliding sideways is litter, one turning at
   the rate it travels is a tumbleweed. */
function makeTumble(n){
  var tex=spriteTex(64,64,function(x,w,h){
    var q2=rnd(41);
    x.strokeStyle="#5c4a2c";x.lineCap="round";
    for(var i=0;i<26;i++){
      var a=q2()*Math.PI*2, r1=8+q2()*10, r2=16+q2()*13;
      x.lineWidth=.8+q2()*1.4;
      x.globalAlpha=.35+q2()*.5;
      x.beginPath();
      x.moveTo(32+Math.cos(a)*r1,32+Math.sin(a)*r1);
      x.quadraticCurveTo(32+Math.cos(a+.5)*r2,32+Math.sin(a+.5)*r2,
                         32+Math.cos(a+1.1)*r2*.9,32+Math.sin(a+1.1)*r2*.9);
      x.stroke();
    }
    x.globalAlpha=1;
  });
  return spriteGroup(n,tex,-966,function(i){
    return {x:-.2-i*.7, sp:.055+Math.random()*.05, r:Math.random()*6.3,
            sc:.6+Math.random()*.5, ph:Math.random()*6.3};
  });
}
/* THE FOAM. One soft band that runs up the beach on the break - the sea band
   itself is baked and cannot move, so the only part of it that is alive is
   the part drawn over it. Wide and very short, because at this distance a
   breaking wave is a line and not a shape. */
function makeFoam(){
  var tex=spriteTex(128,32,function(x,w,h){
    var g=x.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"rgba(236,250,255,0)");
    g.addColorStop(.45,"rgba(236,250,255,.85)");
    g.addColorStop(1,"rgba(210,238,248,0)");
    x.fillStyle=g;
    for(var i=0;i<w;i+=2){
      var hh=h*(.45+Math.abs(Math.sin(i*.13))*.45);
      x.fillRect(i,(h-hh)/2,2,hh);
    }
  });
  var m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
    new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0,
      depthWrite:false,fog:false}));
  m.renderOrder=-968;
  m.userData.tex=tex;
  return m;
}
/* And the devil: a column of lifted sand, wider at the top, leaning as it
   goes. Drawn as one soft cone with the swirl painted into it rather than as
   particles - a hundred grains at this distance is a smudge that costs a
   hundred draw calls to be. */
function makeDevil(){
  var tex=spriteTex(64,128,function(x,w,h){
    var g=x.createLinearGradient(0,h,0,0);
    g.addColorStop(0,"rgba(214,186,132,0)");
    g.addColorStop(.25,"rgba(222,196,142,.34)");
    g.addColorStop(.75,"rgba(230,206,158,.24)");
    g.addColorStop(1,"rgba(236,216,172,0)");
    x.fillStyle=g;
    x.beginPath();
    x.moveTo(w*.42,h);x.quadraticCurveTo(w*.16,h*.5,w*.10,0);
    x.lineTo(w*.90,0);x.quadraticCurveTo(w*.84,h*.5,w*.58,h);
    x.closePath();x.fill();
    x.strokeStyle="rgba(244,228,190,.20)";x.lineWidth=1.6;
    for(var i=0;i<7;i++){
      var yy=h-10-i*16, ww=6+i*3.4;
      x.beginPath();
      x.ellipse(w*.5+(i%2?2:-2),yy,ww,3.4,0,0,Math.PI*2);x.stroke();
    }
  });
  return spriteGroup(1,tex,-967,function(){
    return {x:-.15, sp:.028, ph:0};
  });
}

/* Sized to the frustum every frame, because the frustum follows the arena
   and the player - a sky sized once is the wrong size on the next level. */
function layoutAtmosphere(dtMs){
  if(!skyQuad)return;
  dtMs=Math.min(dtMs||16,60);       // clamped like every other clock here
  var w=(camera.right-camera.left)/camera.zoom, h=(camera.top-camera.bottom)/camera.zoom;
  skyQuad.scale.set(w*1.2,h*1.2,1);
  /* The band sits on the lower third and is scaled to the frustum like the
     sky, so it holds its place on screen while the camera follows the
     player. Faded right out in the plane: there is no distance in a
     silhouette, and a horizon behind a flat world is a horizon in a picture
     that has no depth to put it in. */
  if(sceneQuad){
    /* Raised off the bottom edge rather than sitting on it: the control bar
       lives down there, so a horizon at the very foot of the frustum is a
       horizon behind the d-pad. */
    sceneQuad.scale.set(w*1.25,h*.30,1);
    sceneQuad.position.y=-h*.19;
    /* Kept in the plane, receded rather than removed. Now that a folded
       block holds its own colour, a horizon that vanished was the last thing
       still insisting the plane is somewhere else. */
    sceneQuad.material.opacity=.9*(1-flatT*.62);
  }
  if(plumeQuad){
    /* Sat over the crater, which the texture puts at 0.68 of its width and
       the quad repeats twice - so 0.34 of the visible span, measured from
       the same numbers rather than eyeballed against a screenshot. */
    /* The crater sits at 0.68 across and 0.775 up its own canvas, the band
       is scaled w*1.25 by h*.30 and centred at -h*.19, and the plume hangs
       just above the crater. Derived from those numbers rather than nudged
       against a screenshot, so a change to the band moves it correctly. */
    var cx=(0.68-.5)*w*1.25, cy=-h*.19+(0.775-.5)*h*.30;
    /* BREATHES AT IDLE as well as swelling on the flare. A glow that only
       moves once every seventeen seconds is a still picture for sixteen of
       them, which is what "it is not moving" meant. */
    var breathe=.16+.07*Math.sin(airPhase*1.35)+.04*Math.sin(airPhase*3.1+1.4);
    var heat=Math.min(1,breathe+skyWarm*.9);
    plumeQuad.scale.set(h*.17*(1+heat*.35),h*.17*(1+heat*.5),1);
    plumeQuad.position.set(cx,cy+h*.035+h*heat*.03,-244);
    plumeQuad.material.opacity=heat*(1-flatT*.5);
    if(sparkGrp){
      var sk2=sparkGrp.children;
      for(var qi=0;qi<sk2.length;qi++){
        var sq=sk2[qi],su2=sq.userData;
        su2.t+=(.0045+skyWarm*.006)*su2.sp;
        if(su2.t>1)su2.t-=1;
        var rise=su2.t;
        sq.position.set(cx+su2.dx*h*.10*rise,
                        cy+h*.02+rise*h*.30, -243);
        sq.scale.setScalar(h*.26*su2.sz*(1-rise*.55));
        /* Brightest just after they leave the mouth and gone before the top,
           so they read as thrown rather than as drifting. */
        sq.material.opacity=Math.max(0,(1-rise)*(1-rise)*(rise<.10?rise/.10:1))
          *(.5+skyWarm*.5)*(1-flatT*.6);
      }
    }
  }
  /* THE SECTION'S OWN LIFE, placed in frustum fractions so it holds its
     spot on screen while the camera follows the player. `atm` is the fade
     every one of them shares: gone in the plane, because a silhouette has
     no distance to put a bird in. */
  var atm=1-flatT*.72;
  if(birdGrp){
    /* THE WIND MOVES THE WOOD. The treeline is baked, so the band itself
       leans - a couple of pixels of x on a slow double sine - and the birds
       are carried by the same number. A horizon that leans while nothing
       else does reads as the camera wobbling; the two together read as air
       moving through the picture. */
    var wnd=windAt(airPhase);
    if(sceneQuad){
      sceneQuad.position.x=wnd*w*.004;
      sceneQuad.scale.x=w*1.25*(1+wnd*.0016);
    }
    var bk=birdGrp.children;
    for(var bi=0;bi<bk.length;bi++){
      var bq=bk[bi],bu=bq.userData;
      bu.x+=bu.dir*bu.sp*.00016*(1+wnd*.35);
      if(bu.x>1.3)bu.x=-.3; else if(bu.x<-.3)bu.x=1.3;
      var sings=(bi===singBird&&singT<singLen);
      var flap=Math.sin(airPhase*bu.fl*(sings?1.9:1)+bu.ph);
      var bs=h*.030*bu.sc*(sings?1.22:1);
      // The flap is the V opening and closing, so it is scale, not a frame.
      bq.scale.set(bs*bu.dir,bs*(.42+Math.abs(flap)*.62),1);
      var by=(bu.y-.5)*h*1.02+Math.sin(airPhase*.7+bu.ph)*h*.012;
      // A singing bird lifts on each note, which is what ties the ripple to it
      if(sings)by+=Math.abs(Math.sin(airPhase*5.2))*h*.006;
      bq.position.set((bu.x-.5)*w*1.2,by,-243);
      bq.material.opacity=(sings?.85:.62)*atm;
      if(sings){bu.sx=(bu.x-.5)*w*1.2;bu.sy=by;}
    }
    if(singGrp){
      var sk3=singGrp.children;
      if(singBird>=0&&singT<singLen){
        singT+=dtMs/1000;
        var su3=birdGrp.children[singBird].userData;
        for(var si3=0;si3<sk3.length;si3++){
          var sq3=sk3[si3], off=sk3[si3].userData.d;
          // each arc repeats over the phrase, the second trailing the first
          var ph3=((singT/.62)-off)%1;
          if(ph3<0||singT<off*.62){sq3.material.opacity=0;continue;}
          sq3.scale.setScalar(h*.05*(.5+ph3*1.5));
          /* On the beak's side, whichever way it is flying - a call coming
             out of a bird's back is the sort of thing nobody names and
             everybody notices. */
          var sd3=su3.dir||1;
          sq3.scale.x*=sd3;
          sq3.position.set((su3.sx||0)+sd3*(h*.028+ph3*h*.026),
                           (su3.sy||0)+h*.012,-241);
          sq3.material.opacity=(1-ph3)*(1-ph3)*.85*atm;
        }
      } else for(var sz=0;sz<sk3.length;sz++)sk3[sz].material.opacity=0;
    }
  }
  if(meteorGrp){
    /* THE TRAJECTORY IS ONE VECTOR, and that was the bug. The old version
       took an angle for the sprite's rotation and then moved it by a
       different pair of numbers - always rightward, and downward by the
       absolute sine - so a meteor pointed one way and travelled another.
       Now the angle is chosen once over a 90-degree fan of *downward*
       directions, the sprite is turned to it, and the position walks along
       it. Pointing where you are going is the whole of what makes it read.

       AND IT LANDS. The end of the flight is the horizon, so the flight
       length is derived from the angle rather than fixed - a shallow one
       crosses further than a steep one, exactly as it should - and the
       landing point is chosen ON SCREEN first, with the start worked
       backwards from it, so a meteor is never a streak that ends somewhere
       nobody can see. */
    var horiz=-h*.20;
    var mk2=meteorGrp.children;
    for(var mi=0;mi<mk2.length;mi++){
      var mq=mk2[mi],mu=mq.userData;
      if(mu.wait>0){
        // Off screen between passes: a streak has to be an event, and a sky
        // with one always in it is a screensaver.
        mu.wait-=dtMs/1000;mq.material.opacity=0;continue;
      }
      if(!mu.ang){
        // a 90-degree fan, all of it downward: -135 through -45 degrees
        mu.ang=-Math.PI*.25-Math.random()*Math.PI*.5;
        mu.ex=(Math.random()-.5)*w*.75;      // where it will land, on screen
        mu.sy=h*.62;
        mu.dist=(mu.sy-horiz)/-Math.sin(mu.ang);
        mu.sx=mu.ex-Math.cos(mu.ang)*mu.dist;
      }
      mu.t-=dtMs/1000*mu.sp;
      if(mu.t<=0){
        // It has arrived. Light the ground, then let the sound catch up.
        if(boomGrp){
          var bq=boomGrp.children[mi%boomGrp.children.length];
          bq.userData.t=1;bq.userData.x=mu.ex;bq.userData.y=horiz;
        }
        if(typeof ambBoom==="function")
          ambBoom(.35+Math.abs(mu.ex)/w*.5);   // sound arrives after the light
        mu.t=1;mu.wait=3+Math.random()*8;mu.ang=0;
        mq.material.opacity=0;continue;
      }
      var mp=1-mu.t;                       // 0 at the top, 1 at the ground
      var mlen=h*.34*mu.sc;
      mq.scale.set(mlen,mlen*.19,1);
      mq.rotation.z=mu.ang;
      mq.position.set(mu.sx+Math.cos(mu.ang)*mu.dist*mp,
                      mu.sy+Math.sin(mu.ang)*mu.dist*mp,-242);
      // In quickly, and brightest as it comes down: it is getting closer.
      mq.material.opacity=Math.min(1,mp/.10)*(.55+mp*.45)*atm;
    }
  }
  if(boomGrp){
    var bk2=boomGrp.children;
    for(var bi2=0;bi2<bk2.length;bi2++){
      var bq2=bk2[bi2],bu2=bq2.userData;
      if(bu2.t<=0){bq2.material.opacity=0;continue;}
      bu2.t=Math.max(0,bu2.t-dtMs/520);
      var bp2=1-bu2.t;
      bq2.scale.setScalar(h*(.06+bp2*.20));
      bq2.position.set(bu2.x,bu2.y+h*.01,-241);
      bq2.material.opacity=bu2.t*bu2.t*.9*atm;
    }
  }
  if(foamQuad){
    /* THE BREAK, AND IT IS ONE EVENT WITH THE SOUND. The renderer owns the
       clock rather than the ambience, because only one of them can - and the
       ordering matters: a wave has to be *heard* approaching for a couple of
       seconds before anything on screen moves, so the sound is started
       WAVE_RISE ahead and the foam runs on the moment its crash lands.

       `seaT` counts down to the next break. `foamP` is the sweep itself,
       0 at the break and 1 when the wash has drained. */
    var rise=(typeof WAVE_RISE!=="undefined")?WAVE_RISE:2.1;
    seaT-=dtMs/1000;
    if(seaT<=rise&&!seaFired){
      seaFired=true;
      if(typeof ambWave==="function")ambWave();
    }
    if(seaT<=0){
      foamP=0;seaFired=false;
      seaT=rise+4.5+Math.random()*3.5;
    }
    if(foamP<1){
      foamP=Math.min(1,foamP+dtMs/1600);
      foamQuad.scale.set(w*1.25,h*.024*(1+foamP*.8),1);
      /* Up the beach and back. The front runs in fast and drains slowly, so
         the travel is a root curve rather than a straight one - which is
         what water climbing sand actually does. */
      foamQuad.position.set(0,-h*.274-h*.030*Math.pow(foamP,.55),-242);
      foamQuad.material.opacity=Math.min(1,
        Math.min(1,foamP/.10)*(1-foamP)*(1-foamP)*1.35)*atm;
    } else foamQuad.material.opacity=0;
  }
  if(boatGrp){
    var ok2=boatGrp.children;
    for(var oi=0;oi<ok2.length;oi++){
      var oq=ok2[oi],ou=oq.userData;
      ou.x+=ou.dir*ou.sp*dtMs/1000*.12;
      if(ou.x>1.25)ou.x=-.25; else if(ou.x<-.25)ou.x=1.25;
      var bsz=h*.052*ou.sc;
      oq.scale.set(bsz*ou.dir,bsz,1);
      /* ON THE WATERLINE. The sea band starts h*.30 tall centred at -h*.19,
         so its horizon is the top of that - anywhere else and the boat is
         the wrong size for the sea it is on. */
      /* ON THE WATERLINE, and it is derived rather than nudged. The band is
         h*.30 tall centred at -h*.19, so its foot is at -h*.34; the sea
         starts 96 rows up a 160-row texture, which is 0.6 of the way, so the
         horizon sits at -h*.34 + .6*h*.30. Anywhere else and the boat is the
         wrong size for the water it is on. */
      oq.position.set((ou.x-.5)*w*1.15,
        -h*.34+h*.30*.60-h*.008+Math.sin(airPhase*.9+ou.ph)*h*.004,-243);
      oq.material.opacity=.8*atm;
    }
  }
  if(tumbleGrp){
    var tk=tumbleGrp.children;
    for(var ti=0;ti<tk.length;ti++){
      var tq=tk[ti],tu=tk[ti].userData;
      tu.x+=tu.sp*dtMs/1000*.16;
      if(tu.x>1.25){tu.x=-.25;tu.sp=.055+Math.random()*.05;}
      var tsz=h*.036;
      // Rolling: the spin rate is tied to the travel, which is the read.
      tu.r+=tu.sp*dtMs/1000*3.4;
      tq.rotation.z=-tu.r;
      tq.scale.setScalar(tsz*tu.sc);
      // Bounces along the dune line rather than sliding on it.
      tq.position.set((tu.x-.5)*w*1.15,
        -h*.245+Math.abs(Math.sin(tu.r*1.6))*h*.014,-242);
      tq.material.opacity=.72*atm;
    }
  }
  if(devilGrp){
    var vq=devilGrp.children[0],vu=vq.userData;
    vu.x+=vu.sp*dtMs/1000*.10;
    if(vu.x>1.3)vu.x=-.3;
    vq.scale.set(h*.10,h*.30,1);
    vq.position.set((vu.x-.5)*w*1.15+Math.sin(airPhase*.6)*w*.01,
                    -h*.13,-242);
    // Fades in and out across its crossing, so it forms and collapses.
    vq.material.opacity=Math.sin(Math.min(1,Math.max(0,vu.x))*Math.PI)*.85*atm;
  }
  if(demonGrp){
    var dk=demonGrp.children;
    for(var di=0;di<dk.length;di++){
      var dq=dk[di],du=dq.userData;
      du.x+=du.sp*.00035;
      if(du.x>1.15)du.x=-.15;
      dq.scale.setScalar(du.sc*h*.055);
      dq.position.set((du.x-.5)*w*1.1,
        -h*.155+Math.sin(airPhase*1.6+du.ph)*h*.010,-243);
      dq.material.opacity=.85*(1-flatT*.62);
    }
  }
  if(starField){
    var sk=starField.children;
    for(var si=0;si<sk.length;si++){
      var st=sk[si],su=st.userData;
      st.position.set((su.x-.5)*w*1.05,(su.y-.5)*h*1.05,-246);
      st.scale.setScalar(h*.055*(su.grade===2?1.35:1));
      /* THEY STAY IN THE PLANE. The plane is the same sky in different light
         now, not a sheet of paper, so a sky that emptied on the fold was the
         last thing still saying otherwise. Dimmed rather than removed,
         because the ground is brighter there and a star has to lose the
         contrast a brighter ground takes from it anyway. */
      var tw=.55+.45*Math.sin(airPhase*su.sp*3.1+su.ph);
      st.material.opacity=su.a*tw*(1-flatT*.55);
    }
  }
  if(!airField)return;
  var kids=airField.children, sp=airField.userData.spec;
  /* A LEAF FALLS ON THE WIND, which is two things a mote does not do: it
     rides the same gust the treeline leans to, and it turns over as it goes.
     Everything else about the field is unchanged, so a section that does not
     ask for leaves behaves exactly as it always has. */
  var leaf=sp.kind==="leaf", gust=leaf?windAt(airPhase):0;
  for(var i=0;i<kids.length;i++){
    var q=kids[i],u=q.userData;
    u.y+=sp.rise*u.sp*.0016;
    u.x+=(sp.drift+gust*.22)*u.sp*.0016;
    if(u.y>1.1)u.y=-.1; if(u.y<-.1)u.y=1.1;
    if(u.x>1.1)u.x=-.1; if(u.x<-.1)u.x=1.1;
    q.position.set((u.x-.5)*w*1.05,(u.y-.5)*h*1.05,-240);
    if(leaf){
      /* Tumbling, and it is a SQUASH rather than a spin: these are little
         discs, and a disc turning on its own axis is a disc. Flattening it
         on one axis while it rolls is what a leaf edge-on looks like. */
      q.rotation.z=airPhase*(.5+u.sp)+u.ph;
      q.scale.set(1,.35+.65*Math.abs(Math.sin(airPhase*(1.1+u.sp)+u.ph)),1);
    }
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
/* Kept so the wardrobe can put it back. applyPalette() writes colVoid,
   colBlock, colPaper and colInk from the equipped world, and it runs on
   every skin change - which is *after* loadLevel has set the section's, so
   without this a trip to the wardrobe left the level wearing the default
   world until the next load. */
var curTheme=null;
function applyTheme(th){
  if(!th)th={sky:[0x0f1424,0x080b14],block:0x5a6d94,
             air:{col:0x8fa4cc,n:12,rise:.06,drift:.04,size:.09}};
  /* The fields are only rebuilt when the section actually changes. Colours
     are cheap and always re-applied; motes, stars and scenery are meshes,
     and rebuilding them because somebody equipped a hat would be silly. */
  var same=(th===curTheme);
  curTheme=th;
  colSkyTop.setHex(th.sky[0]);colSkyBot.setHex(th.sky[1]);
  colVoid.setHex(th.sky[1]);            // depth shading fades toward the far sky
  colBlock.setHex(th.block);
  colAir.setHex(th.air.col);
  /* THE PLANE IS THE SAME PLACE, SEEN FLAT. It used to be one paper and one
     ink for the whole game, so folding out of a hell level and folding out
     of a meadow landed you on identical stationery and the two halves read
     as two games. A section now owns both pictures: `paper` is what the
     plane is printed on and `ink` is what its silhouettes are printed in,
     and both default to the old pair when a section does not say. */
  /* THE PLANE'S GROUND IS THE SECTION'S OWN SKY, BARELY LIFTED - and it is
     DERIVED rather than authored, so it cannot drift away from the sky it is
     supposed to be. Hand-picked papers were tried twice and were wrong twice
     in the same direction: the first set was near-white, the second was a
     "lighter relative" that still came out as a bright blue day over a night
     meadow. A section only has to say what its sky is.

     PAPER_LIFT is the whole cue. At 0 the fold changes no colour at all; at
     1 it would be white. It is small on purpose - what tells you that you
     are flat is the world collapsing and the button reading GO 3D, and every
     time this number has been raised the plane has stopped looking like the
     same place. */
  if(th.paper!==undefined)colPaper.setHex(th.paper);
  else{
    colPaper.setHex(th.sky[0]);
    colPaper.lerp(WHITE,PAPER_LIFT);
  }
  colInk.setHex(th.ink||0x1a1c2b);
  document.documentElement.style.setProperty("--paper",
    "#"+colPaper.getHexString());
  document.documentElement.style.setProperty("--ink",
    "#"+(th.ink||0x1a1c2b).toString(16).padStart(6,"0"));
  /* A BLOCK OUTLIVES ITS LEVEL. syncMeshes keys meshes by cell and addMesh
     returns early when one is already there, so a block standing in the same
     place in the next level is REUSED - which is right, and which means it
     keeps the surface it was built with. Crossing from grass into basalt
     left the cells the two levels had in common wearing the old section's
     ground. So when the surface changes, the meshes go, and syncMeshes
     rebuilds them against the new one. */
  var nextTex=(TEX&&th.surface&&TEX[th.surface])||(TEX&&TEX.stone)||null;
  if(nextTex!==curStoneTex&&typeof meshes==="object"&&meshes){
    for(var mk in meshes){
      var mm=meshes[mk];
      scene.remove(mm);if(mm.material)mm.material.dispose();
      delete meshes[mk];
    }
  }
  curStoneTex=nextTex;
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
  if(same&&airField){
    setSkyColors(skyWarm);
    if(typeof ambTo==="function")ambTo(th.amb);   // a no-op when unchanged
    return;
  }
  if(airField){camera.remove(airField);airField.traverse(function(o){
    if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});}
  airField=makeAir(th.air);camera.add(airField);
  if(starField){camera.remove(starField);starField.traverse(function(o){
    if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
    starField=null;}
  if(th.stars){starField=makeStars(th.stars);camera.add(starField);}
  if(sceneQuad){camera.remove(sceneQuad);
    sceneQuad.geometry.dispose();sceneQuad.material.map.dispose();
    sceneQuad.material.dispose();sceneQuad=null;}
  if(demonGrp){camera.remove(demonGrp);
    demonGrp.traverse(function(o){if(o.geometry)o.geometry.dispose();
      if(o.material)o.material.dispose();});demonGrp=null;}
  if(plumeQuad){camera.remove(plumeQuad);plumeQuad.geometry.dispose();
    plumeQuad.material.map.dispose();plumeQuad.material.dispose();plumeQuad=null;}
  if(sparkGrp){camera.remove(sparkGrp);sparkGrp.traverse(function(o){
    if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
    sparkGrp=null;}
  [birdGrp,meteorGrp,boatGrp,tumbleGrp,devilGrp,boomGrp,foamQuad,singGrp]
    .forEach(function(g){
    if(!g)return;
    camera.remove(g);
    if(g.userData.tex)g.userData.tex.dispose();
    g.traverse(function(o){
      if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
  });
  birdGrp=meteorGrp=boatGrp=tumbleGrp=devilGrp=boomGrp=singGrp=null;
  foamQuad=null;singBird=-1;
  if(th.scene){
    sceneQuad=makeScenery(th.scene);camera.add(sceneQuad);
    if(th.scene==="hell"){
      demonGrp=makeDemons(4);camera.add(demonGrp);
      plumeQuad=makePlume();camera.add(plumeQuad);
      sparkGrp=makeSparks(16);camera.add(sparkGrp);
      meteorGrp=makeMeteors(3);camera.add(meteorGrp);
      boomGrp=makeBooms(3);camera.add(boomGrp);
    }
    if(th.scene==="trees"){
      birdGrp=makeBirds(7);camera.add(birdGrp);
      singGrp=makeSing();camera.add(singGrp);
      singBird=-1;singT=0;
    }
    if(th.scene==="ocean"){
      boatGrp=makeBoats(2);camera.add(boatGrp);
      foamQuad=makeFoam();camera.add(foamQuad);
      seaT=3.5;seaFired=false;foamP=1;
    }
    if(th.scene==="desert"){
      tumbleGrp=makeTumble(2);camera.add(tumbleGrp);
      devilGrp=makeDevil();camera.add(devilGrp);
    }
  }
  setSkyColors(0);
  /* THE SECTION'S SOUND ARRIVES WITH ITS SKY. Here rather than in loadLevel
     so there is one place that knows what section you are in - and above the
     `same` early return would be wrong for the opposite reason: a level that
     does not change the theme must not restart the bed. */
  if(typeof ambTo==="function")ambTo(th.amb);
}
/* Which section a level belongs to, asked by index so it works for the
   editor and the library too - both hand back no section, and no section
   means the default sky. */
/* Which surface this section's stone wears. Read at block-build time, which
   is after applyTheme() has run for the level - loadLevel sets the theme
   before it ever asks for a mesh, and that ordering is the whole reason this
   can be a global rather than an argument threaded through addMesh. */
var curStoneTex=null;
function stoneSurface(){return curStoneTex||TEX.stone;}

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
/* ============================================================
   SURFACES - one canvas per look, [ side | top ] in one image
   ============================================================
   These carry HUE, which is the thing per-face brightness could not do: a
   grass block is a green top over brown sides, and no multiply of one colour
   makes two. material.color still does everything it did - section tint,
   depth fade, peril red, the lerp to ink - and three.js multiplies the map
   by it, so a texture is a *relative* statement about a block and the block
   loop stays untouched.

   Everything is drawn, not loaded. There are no assets in this game and
   there is no build step to add them with.

   Seeded off the cell, never Math.random at draw time: a wall that
   reshuffles itself every level is not a material. */
function surf(draw){
  var S=128,c=document.createElement("canvas");
  c.width=S*2;c.height=S;
  var x=c.getContext("2d");
  x.fillStyle="#fff";x.fillRect(0,0,S*2,S);
  draw(x,S);
  var t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.NearestFilter;      // the blocky read this was asked for
  t.minFilter=THREE.LinearMipmapLinearFilter;
  return t;
}
function rnd(seed){var v=seed>>>0||1;return function(){
  v^=v<<13;v^=v>>>17;v^=v<<5;return ((v>>>0)%100000)/100000;};}
/* THE GRAIN IS DELIBERATELY NOT A PIXEL GRID.

   The first cut of these drew square cells on a 16x16 lattice, which is a
   very particular published game's look and close enough to it to be a risk
   worth not taking with something that is going to be sold. Nothing was ever
   copied - there are no image files in this project and every pixel here is
   drawn by this code - but a style can be recognisable without a single
   asset changing hands, and that is the thing to move away from.

   So the grain is ROUNDED and IRREGULAR: overlapping blobs on a jittered
   lattice rather than aligned squares, with a soft second pass over the top.
   It reads as hand-painted rather than as voxel art, it keeps the chunky
   legibility at 40px, and it is nobody else's. */
function blobs(x,ox,S,n,r,cols,seed,jit){
  var q=rnd(seed);
  for(var i=0;i<n;i++){
    x.fillStyle=cols[Math.floor(q()*cols.length)];
    var bx=ox+q()*S, by=q()*S, rr=r*(.6+q()*.9);
    x.beginPath();
    // a lumpy disc: six points at wobbling radii, which is what stops these
    // reading as a spray of perfect circles
    for(var a=0;a<6;a++){
      var an=a/6*Math.PI*2, rad=rr*(1+(q()-.5)*(jit||.5));
      var px=bx+Math.cos(an)*rad, py=by+Math.sin(an)*rad;
      a?x.lineTo(px,py):x.moveTo(px,py);
    }
    x.closePath();x.fill();
  }
}
function wash(x,ox,S,base){x.fillStyle=base;x.fillRect(ox,0,S,S);}

/* GRASS. Brighter and warmer than the obvious green - closer to a platformer
   than to a survival game - over a clay side rather than a brown dirt one.
   The blades over the top edge are ROUNDED TUFTS of varying depth, not an
   even fringe: an even fringe is the tell. */
function grassTex(){
  return surf(function(x,S){
    /* THE SIDE IS EARTH WITH STONES IN IT, and the grass sits on it as a
       LIP rather than as a fringe of teeth. The first cut drew a row of
       quadratic spikes hanging down and it read as a comb; what makes a cut
       bank of turf legible is a solid band of green with a soft, uneven
       underside and a darker line where the two materials meet. */
    wash(x,0,S,"#a9744a");
    blobs(x,0,S,44,12,["#9a6840","#b8825a","#8d5e39"],7,.55);
    blobs(x,0,S,22,5,["#7d5433","#c49a72"],23,.7);          // stones in the earth
    var q=rnd(31);
    var lip=Math.round(S*.26);
    x.fillStyle="#5aa83f";x.fillRect(0,0,S,lip*.62);
    for(var gx=0;gx<S;gx+=4){                                // uneven underside
      var d=lip*(.5+q()*.62);
      x.fillStyle=q()<.5?"#5aa83f":"#4d9435";
      x.fillRect(gx,0,5,d);
    }
    x.fillStyle="rgba(50,86,36,.55)";x.fillRect(0,lip*.5,S,3); // the meeting line
    x.fillStyle="#6cbb4a";x.fillRect(0,0,S,4);                 // lit top edge

    /* THE TOP IS CLUMPS, NOT NOISE. Three greens in overlapping patches with
       a few blades picked out - a lawn read from above is a mottle at this
       size, and an even speckle reads as static. */
    wash(x,S,S,"#5faa41");
    blobs(x,S,S,26,17,["#569f39","#69bb4c"],13,.55);
    blobs(x,S,S,18,10,["#7ccb5c","#4a8f33"],41,.65);
    for(var i=0;i<70;i++){
      x.fillStyle=q()<.5?"#83d264":"#478c31";
      x.fillRect(S+q()*S,q()*S,2,3+q()*4);
    }
  });
}
/* ASHSTONE, for the hell section. Angular shards rather than round blobs -
   the one surface that should read as broken rather than as grown - with
   veins that taper rather than step. */
function basaltTex(){
  return surf(function(x,S){
    wash(x,0,S,"#2f2a34");
    var q=rnd(5);
    for(var i=0;i<44;i++){          // shards, both halves
      var ox=q()<.5?0:S;
      x.fillStyle=["#39323f","#282430","#42394a","#2c2733"][Math.floor(q()*4)];
      var bx=ox+q()*S, by=q()*S, r=7+q()*13;
      x.beginPath();
      for(var a=0;a<5;a++){
        var an=a/5*Math.PI*2+q()*.5, rad=r*(.5+q());
        var px=bx+Math.cos(an)*rad, py=by+Math.sin(an)*rad;
        a?x.lineTo(px,py):x.moveTo(px,py);
      }
      x.closePath();x.fill();
    }
    wash(x,S,S,"#36303c");
    for(var j=0;j<30;j++){
      x.fillStyle=["#403845","#2e2934","#484052","#332e3a"][Math.floor(q()*4)];
      x.fillRect(S+q()*S,q()*S,6+q()*14,5+q()*11);
    }
    for(var v=0;v<9;v++){           // molten veins, tapering
      x.strokeStyle=v%2?"#8d3a1e":"#bf5526";
      x.lineWidth=1+q()*3.4;
      x.beginPath();
      var vx=(v<5?0:S)+q()*S, vy=q()*S;
      x.moveTo(vx,vy);
      for(var k=0;k<3;k++){vx+=(q()-.5)*34;vy+=(q()-.5)*34;x.lineTo(vx,vy);}
      x.stroke();
    }
  });
}
/* OBSIDIAN, for the crate. Volcanic glass: a near-black body with sharp
   conchoidal facets and violet fire running in the cracks. The crate is the
   one piece that edits what the plane records, so a block with something
   burning inside it is the right kind of strange - and it is the first piece
   whose texture is also driven through `emissive`, which is what makes the
   veins light the block rather than just being painted on it.

   It keeps its two-bar marker. Obsidian and basalt are both near-black, and
   until a crate has a FORM of its own the marker is the thing that says
   which is which - the same rule that let water drop its ring. */
function obsidianTex(){
  return surf(function(x,S){
    wash(x,0,S,"#241f33");
    var q=rnd(67);
    for(var i=0;i<30;i++){                 // facets, angular and glassy
      x.fillStyle=["#2c2540","#1b1728","#352c4c","#221d31"][Math.floor(q()*4)];
      var bx=q()*S, by=q()*S, r=9+q()*16;
      x.beginPath();
      for(var a=0;a<4;a++){
        var an=a/4*Math.PI*2+q()*.8, rad=r*(.45+q());
        var px=bx+Math.cos(an)*rad, py=by+Math.sin(an)*rad;
        a?x.lineTo(px,py):x.moveTo(px,py);
      }
      x.closePath();x.fill();
    }
    wash(x,S,S,"#2a2440");
    for(var j=0;j<24;j++){
      x.fillStyle=["#332b4c","#201b30","#3d3358"][Math.floor(q()*3)];
      x.fillRect(S+q()*S,q()*S,8+q()*18,7+q()*15);
    }
    // the fire in the cracks, on both halves
    for(var v=0;v<13;v++){
      var ox=v<7?0:S;
      x.strokeStyle=q()<.45?"#d9b0ff":"#9a5cf0";
      x.lineWidth=1+q()*2.6;x.lineCap="round";
      x.beginPath();
      var vx=ox+q()*S, vy=q()*S;
      x.moveTo(vx,vy);
      for(var k=0;k<3;k++){vx+=(q()-.5)*38;vy+=(q()-.5)*38;x.lineTo(vx,vy);}
      x.stroke();
    }
  });
}
function stoneTex(){
  return surf(function(x,S){
    wash(x,0,S,"#e6e6e6");
    blobs(x,0,S,40,12,["#dcdcdc","#efefef","#d2d2d2"],3,.5);
    wash(x,S,S,"#f1f1f1");
    blobs(x,S,S,36,13,["#e8e8e8","#fbfbfb","#dedede"],9,.5);
  });
}
/* WATER. Horizontal swell rather than a speckle - a liquid is banded, and
   banding is also the thing that most separates this from a cube of blue
   pixels. The surface half gets the glints. */
function waterTex(){
  return surf(function(x,S){
    wash(x,0,S,"#8fc8ef");
    var q=rnd(17);
    for(var y=0;y<S;y+=7){
      x.fillStyle=q()<.5?"#72b4e4":"#a6d6f5";
      x.beginPath();x.moveTo(0,y);
      for(var px=0;px<=S;px+=16)x.lineTo(px,y+Math.sin(px*.09+y)*2.4);
      x.lineTo(S,y+5);x.lineTo(0,y+5);x.closePath();x.fill();
    }
    wash(x,S,S,"#b7dffa");
    blobs(x,S,S,26,13,["#d9f0ff","#96caf0","#ffffff"],19,.6);
  });
}
/* LAVA. Flowing veins between crust plates, not a checker of hot cells. */
function lavaTex(){
  return surf(function(x,S){
    wash(x,0,S,"#43201a");
    blobs(x,0,S,34,13,["#3a1a15","#4e281e","#301410"],29,.6);
    wash(x,S,S,"#4c2118");
    blobs(x,S,S,30,14,["#411c14","#57291c","#35150f"],37,.6);
    var q=rnd(53);
    for(var v=0;v<16;v++){
      var ox=v<5?0:S;
      x.strokeStyle=q()<.4?"#ffc63f":(q()<.7?"#ff8322":"#e04a17");
      x.lineWidth=2+q()*5;
      x.lineCap="round";
      x.beginPath();
      var vx=ox+q()*S, vy=q()*S;
      x.moveTo(vx,vy);
      for(var k=0;k<3;k++){vx+=(q()-.5)*40;vy+=(q()-.5)*40;x.lineTo(vx,vy);}
      x.stroke();
    }
  });
}

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
    /* ATLAS UVs. Every texture in here is [ side | top ] side by side, and
       the same fixed face order lets the two halves be assigned without a
       second geometry: faces 2 and 3 (+Y, -Y) sample the right half, the
       four sides sample the left. This is what makes a grass block possible
       at all - a green top over brown sides is two different HUES, which no
       amount of per-face brightness can produce. */
    var uo=uv.length-gu.length;
    for(var f2=0;f2<6;f2++){
      var top=(f2===2||f2===3);
      for(var k2=0;k2<4;k2++){
        var ui=uo+(f2*4+k2)*2;
        uv[ui]=uv[ui]*0.5+(top?0.5:0);
      }
    }
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
/* WATER AND FIRE ARE THEIR OWN SHAPE NOW, and that is what retires their
   symbol. A full cell rather than an inset case, with a distinct surface
   plate a little below the top - which is exactly how a liquid reads: it
   fills its cell and its surface is a place you can see. Neither carries the
   lit rim; a rim is what stone has.

   THE MARKERS ARE NOT ALL GONE. Water's ring went because water no longer
   looks like anything else. An anchor and a crate still differ from stone by
   COLOUR ALONE - amber against violet, which is the exact pair that fails
   for the roughly one man in twelve with a colour vision deficiency - so
   they keep their shapes until they get forms of their own too. */
function makeLiquidGeo(surfaceLift){
  return mergeBoxes([
    faceVals({w:1,h:.88,d:1,y:-.06, top:.92,bot:.44,xp:.92,xn:.68,zp:.98,zn:.64}),
    faceVals({w:1,h:.05,d:1,y:.405, top:surfaceLift,bot:.5,
              xp:surfaceLift*.8,xn:surfaceLift*.66,zp:surfaceLift*.85,zn:surfaceLift*.62})
  ]);
}
function makeFlameGeo(){
  var g=new THREE.BufferGeometry();
  // a five-point strip: wide at the foot, pinched to nothing at the tip
  var W=.105;
  g.setAttribute("position",new THREE.Float32BufferAttribute([
    -W,0,0,  W,0,0,  -W*.72,.19,0,  W*.72,.19,0,
    -W*.34,.34,0, W*.34,.34,0,  0,.48,0],3));
  g.setAttribute("color",new THREE.Float32BufferAttribute([
    1,.96,.72, 1,.96,.72,  1,.72,.24, 1,.72,.24,
    1,.44,.12, 1,.44,.12,  .9,.24,.08],3));
  g.setIndex([0,1,2, 1,3,2, 2,3,4, 3,5,4, 4,5,6]);
  g.computeVertexNormals();
  return g;
}
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
        opacity:.78,vertexColors:true,map:TEX.water})
    : new THREE.MeshLambertMaterial({vertexColors:true,
        map:spike?TEX.lava:(anchor?TEX.stone:stoneSurface()),
        color:(anchor?colAnchor:spike?colSpike:colBlock).clone()});
  /* THE FORM IS THE LABEL. Stone keeps the case-and-rim; water and fire are
     full cells with a surface plate, so they are told apart in silhouette
     before a single colour is read. */
  var m=new THREE.Mesh(glass?waterGeo:(spike?fireGeo:boxGeo),mat);
  m.position.set(x,y,z);
  m.userData.base=[x,y,z];
  m.userData.glass=glass;
  m.userData.anchor=anchor;
  m.userData.kind=kind||0;
  var edge=new THREE.LineSegments((glass||spike)?liquidEdgeGeo:edgeGeo,
    new THREE.LineBasicMaterial({
      color:glass?0xbdeaf7:(anchor?0xffd98a:(spike?0xff8a72:0x0f1424)),
      transparent:true,opacity:glass?.95:(anchor||spike?.85:.35)}));
  m.userData.edge=edge;
  m.add(edge);
  /* ONLY THE ANCHOR STILL CARRIES A SYMBOL. Water became a shape and lost
     its ring; a crate became obsidian - near-black glass with violet fire in
     it, which no other piece looks remotely like - and lost its bars. The
     anchor is the last piece that is still ordinary stone in a different
     colour, so it is the last one that needs a mark on it. */
  if(kind===2){
    var mk=new THREE.Group();
    mk.add(new THREE.Mesh(markGeo.anchor,
      new THREE.MeshBasicMaterial({color:0xffe9b8})));
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
    /* FOUR, because four is what the plane needs. In the volume they cluster
       on the crust; flattened they line up in a row standing OFF the top of
       the block with a visible gap, which is the arrangement that survives a
       silhouette: a gap says "this is not part of that block", and a row of
       four says fire where two could be anything. Both layouts are carried
       per flame and `fireFlames` crossfades between them on flatT. */
    var tips=new THREE.Group();
    var FL=[[-.17,-.13,.74],[.16,-.11,.94],[-.14,.15,.88],[.18,.14,.68]];
    for(var fi=0;fi<FL.length;fi++){
      var c=new THREE.Mesh(flameGeo,new THREE.MeshBasicMaterial({
        vertexColors:true, transparent:true, opacity:.9,
        depthWrite:false, side:THREE.DoubleSide}));
      c.userData={h:FL[fi][2],ph:Math.random()*Math.PI*2,
                  vx:FL[fi][0],vz:FL[fi][1],
                  // evenly spaced across the cell when flat
                  fx:(fi-1.5)*.235};
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
    /* The shadow, and only the shadow. The block that falls into it is
       drawn by drawFallRank(), which runs the whole slice rather than the
       squares that happen to have floor under them - see there for why. */
    scene.add(m);trialMarks.push(m);
  }
}
function buildDynamic(){
  clearDynamic();
  for(var i=0;i<gCrates.length;i++){
    var m=new THREE.Mesh(boxGeo,
      new THREE.MeshLambertMaterial({color:colCrate.clone(),vertexColors:true,
        /* Obsidian, and deliberately NOT the section's surface: a crate is a
           thing you brought, not a piece of the ground you stand on. The
           same texture goes on emissiveMap so the violet in the cracks LIGHTS
           the block - the body is near-black, and a multiply alone would
           leave the veins as dark as everything else. */
        map:TEX?TEX.obsidian:null,
        emissiveMap:TEX?TEX.obsidian:null,
        emissive:new THREE.Color(0x2a1046)}));
    m.add(new THREE.LineSegments(edgeGeo,
      new THREE.LineBasicMaterial({color:0xe0d4ff,transparent:true,opacity:.8})));
    // no mark: obsidian says crate on its own - see addMesh
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
  /* Here rather than in loadLevel, because this is the one function every
     path that changes L goes through - the campaign, the editor, the library
     and the composer all end in it - and a tint table that belonged to the
     previous level would paint whichever of its cells the next one happens to
     share. It nulls itself when a level has no `tint`, so an ordinary level
     is exactly as it was. */
  buildTints();
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
  /* THE ARENA'S EXTENT ON SCREEN, not the largest of its three spans.

     The old fit took max(spanX, spanZ, spanY) against the frustum's HALF
     WIDTH, which on a portrait phone threw away most of the screen: a tall,
     narrow level was framed as though it were as wide as it is tall, and
     every block came out small. The first real playtester could not see the
     puzzle, and a puzzle you cannot read is not a difficulty problem.

     Screen-right is x or z depending on the view, so the worst case over the
     four views is the larger of the two. Screen-up is height PLUS depth,
     because the camera leans by `tilt` (.62) and a cell of depth therefore
     costs .62 of a cell vertically - the same coincidence legible.js is
     about. */
  arenaSW=Math.max(b[0]-a[0],b[2]-a[2])+1;      // +1: blocks are a cell wide
  arenaSH=(b[1]-a[1])+1+CAM_TILT*arenaSW;
  arenaLo=a.slice();arenaHi=b.slice();
  viewSizeT=fitViewSize();
}
/* Both axes have to fit, so take whichever demands more room. The vertical
   requirement is multiplied by the aspect because in portrait the frustum's
   half-height is vs/a, so a vertical need of H means vs >= H*a. */
var arenaSW=8, arenaSH=8;
function fitViewSize(){
  var w=window.innerWidth||430,h=window.innerHeight||760,a=w/h;
  /* Margins in cells. The top always carries the level name and its hint;
     the bottom carries the control bar only when there is one, and the
     default layout is now GESTURES with no bar at all - which is most of
     why there is room to do this. */
  var padW=1.0, padH=barIsUp()?3.0:1.7;
  /* updateFrustum sets half-width = vs and half-height = vs/a in PORTRAIT,
     and half-width = vs*a, half-height = vs in LANDSCAPE - so the two
     requirements convert into vs differently in each. Getting this backwards
     is silent: it only shows as a badly framed level on one orientation. */
  var needW,needH;
  if(a>=1){ needW=(arenaSW/2+padW)/a; needH=arenaSH/2+padH; }
  else    { needW=arenaSW/2+padW;     needH=(arenaSH/2+padH)*a; }
  return Math.max(3.2,needW,needH);
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
/* IT FOLDS THE ROW ONTO YOU, and the drawing says so now.

   The charge used to be a thin bar that simply brightened, which is a
   perfectly clear warning about a thing the player has no name for. But this
   game has exactly one verb, and the attack is already the same shape as it:
   a hunter on your row is a hunter in your silhouette column the moment you
   face along that row, which is why folding is the answer to it. So the
   telegraph is a PANE standing along the line that collapses to nothing as
   the beat closes - the fold, done to that row, by the other side.

   Nothing about the rules moved. It is the same line, the same beat and the
   same hit; it is told in the vocabulary the player already owns, so "it is
   folding onto me and I can fold first" is a sentence they can arrive at by
   looking. The fiction was already saying it: the hunters live in the plane.

   Still drawn in the volume and never folded with the world - the charge
   happens along that row whichever way you are looking, and the whole tension
   is that the axis you must fold along to answer it may not be the one you
   are facing. */
function lineMesh(){
  var g=new THREE.Mesh(new THREE.BoxGeometry(1,1,.06),
    new THREE.MeshBasicMaterial({color:0xff4d5e,transparent:true,opacity:.5,
      depthWrite:false,side:THREE.DoubleSide}));
  var e=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,.06)),
    new THREE.LineBasicMaterial({color:0xff8a94,transparent:true,opacity:.7}));
  g.add(e);g.userData.edge=e;
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
    /* The pane stands along the line and comes down onto it. Height falls
       with the beat, so what the player watches is the row being flattened -
       and it lands as a bar at floor level exactly when the charge fires.
       The box is 1x1x.06, so the thin axis has to be turned to lie along the
       line: scaled on x it is a pane facing down z, and a line running in z
       needs it turned a quarter turn. */
    var run=1-Math.min(1,h.lock/bossAim());
    var hgt=Math.max(.07,1.15*(1-run*run));
    if(Math.abs(tz-h.z)>Math.abs(tx-h.x)){
      m.rotation.y=Math.PI/2; m.scale.set(lz,hgt,1);
    } else {
      m.rotation.y=0;         m.scale.set(lx,hgt,1);
    }
    m.position.set(mx,h.y-.5+hgt/2,mz);
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
    // The rim is what carries the pane's shape while the fill is still faint,
    // and it is what is left when the pane has closed to a bar.
    if(m.userData.edge)m.userData.edge.material.opacity=.45+t*t*.55;
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
    for(var pf=0;pf<planeFalls.length;pf++)planeFalls[pf].visible=false;
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
  /* faceOn is no longer consulted: the fill is decided by whether you are
     flat, because in the volume the falling blocks answer both "where" and
     "how long" on the squares themselves, whichever way the slice is turned. */
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
  /* THE SLAB IS THE PLANE'S INDICATOR NOW, AND ONLY THE PLANE'S.

     In the volume the falling blocks carry the whole message - where the
     slice is, and how long is left - and they say it on the squares rather
     than in the air, which is where it can be acted on. A full red pane on
     top of them is a second drawing of one fact, so it drops to a frame with
     barely any fill.

     Flat is the opposite and unchanged: there the marks are hidden, because
     the world is a silhouette and a marker on a world block points at a place
     that no longer exists. The whole board going red is the correct answer
     there, and the only warning that the fold you are in is the wrong one. */
  var edgeOnly = flatT<=.5;
  // Flat, the row of falling blocks is the subject and the wash is the ground
  // it is read against, so the wash comes down enough to let them show.
  var wash = edgeOnly ? .07 : .30;
  trialSlab.material.opacity=(live?(.62+trialFlash*.3):(.15+ph*ph*.3))*wash;
  trialEdge.material.opacity=(live?1:(.5+ph*.4))*(edgeOnly?.22:1);
  trialSlab.visible=trialEdge.visible=true;
  drawTrialMarks(sw,ph,live);
  drawFallRank(sw,ph,live,rx,rz);
}
/* The tiles. Flat only in the volume: in the plane the world is a silhouette
   and a marker sitting on a world block would be pointing at a place that is
   not there any more - the slab is the right shape for that case and already
   says it. */
/* THE RANK OF BLOCKS THAT FALLS ON THE SLICE - one drawing, both pictures.

   The lethal thing is a whole slice: every square of it, at every depth and
   every height, at once. So the honest drawing is a rank of blocks running
   the length of it, and the two halves of the game have to show the SAME
   rank or they contradict each other. For one build the volume dropped a
   block only on the squares that happened to have floor under them, while
   the plane dropped a row straight across - and a player who folded watched
   blocks arrive in places nothing had been hanging over a moment earlier.

   So both are built here, from the same beat and the same curve, and they
   differ only in which axis the rank runs along:

     - IN THE VOLUME it runs the length of the slice, across the arena, at
       the height the player is standing at. That is the honest height: the
       slice is lethal at every one, and the player's own is the one that
       decides whether they live. For anybody standing in the slice the
       blocks land exactly on their square.
     - IN THE PLANE it runs along screen-right, across the whole board, at
       the height they are standing on there - because flattened they are at
       every depth at once and so standing on all of it together.

   A slice you could still dodge - one with a screen-right component, which
   survives the fold as a single column - drops one block in the plane, on
   that column, which is what says it is dodgeable.

   Height falls as ph*ph rather than linearly, because that is what falling
   looks like: barely moving while there is still time, quick at the end. It
   is the same curve the floor plate's own ramp uses, so the shadow darkening
   and the block arriving are one event. */
var planeFalls=[];
function planeFall(i){
  while(planeFalls.length<=i){
    var m=new THREE.Mesh(new THREE.BoxGeometry(.86,.86,.86),
      new THREE.MeshBasicMaterial({color:0xff4d5e,transparent:true,
        opacity:0,depthWrite:false}));
    var e=new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(.88,.88,.88)),
      new THREE.LineBasicMaterial({color:0xffb3ba,transparent:true,opacity:0}));
    m.add(e);m.userData.edge=e;
    addCrushTeeth(m);
    m.renderOrder=902;m.visible=false;
    scene.add(m);planeFalls.push(m);
  }
  return planeFalls[i];
}
function drawFallRank(sw,ph,live,rx,rz){
  var n=0, i;
  if(TR&&app==="play"&&sw.axis!=="y"&&!dying){
    var cells=[], y;
    if(flatT>.5&&flatPos){
      y=flatPos.y;
      var comp=sw.axis==="x"?AX[view].r[0]:AX[view].r[2];
      if(comp!==0)cells.push([sw.at*comp*rx,sw.at*comp*rz]);
      else{
        var uA=arenaLo[0]*AX[view].r[0]+arenaLo[2]*AX[view].r[2];
        var uB=arenaHi[0]*AX[view].r[0]+arenaHi[2]*AX[view].r[2];
        for(var u=Math.min(uA,uB)-1;u<=Math.max(uA,uB)+1;u++)
          cells.push([u*rx,u*rz]);
      }
    } else {
      y=player.y;
      // the slice runs along the axis it is NOT thin in
      if(sw.axis==="x")
        for(var z=arenaLo[2]-1;z<=arenaHi[2]+1;z++)cells.push([sw.at,z]);
      else
        for(var x=arenaLo[0]-1;x<=arenaHi[0]+1;x++)cells.push([x,sw.at]);
    }
    var drop=live?0:FALL_H*(1-ph*ph);
    for(i=0;i<cells.length;i++){
      var m=planeFall(n++);
      m.visible=true;
      m.position.set(cells[i][0],y-.5+.44+drop,cells[i][1]);
      m.scale.set(live?1.1:1,live?.5:1,live?1.1:1);
      m.material.opacity=live?.95:(.30+ph*.5);
      if(m.userData.edge)m.userData.edge.material.opacity=live?1:(.35+ph*.55);
    }
  }
  for(var k=n;k<planeFalls.length;k++)planeFalls[k].visible=false;
}
/* Four points under a falling block, so it reads as a thing that crushes
   rather than as a cube being delivered. Deliberately not the fire block's
   orange: that colour is a piece with rules of its own, and borrowing it
   here would say the trial's hazard is something you can learn to walk
   around. Red, and pointed. */
function addCrushTeeth(m){
  if(!spikeGeo)return;
  var mat=new THREE.MeshBasicMaterial({color:0xffb3ba,transparent:true,
    opacity:.85,depthWrite:false});
  [[-.24,-.24],[.24,-.24],[-.24,.24],[.24,.24]].forEach(function(o){
    var t=new THREE.Mesh(spikeGeo,mat);
    t.position.set(o[0],-.52,o[1]);
    t.rotation.x=Math.PI;
    m.add(t);
  });
}
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
/* HOW MUCH OF THE SCREEN THE WORLD FILLS. Below 1 the frustum tightens and
   every block gets bigger - which is the whole point: the first real
   playtester could not see the puzzle, and a puzzle you cannot read is not a
   difficulty problem.

   Two values, because the control bar is the only thing competing for the
   space. The default layout is now GESTURES with no bar at all, so that case
   should take the room the bar used to hold; with the bar up a little is
   given back so the world is not sitting behind the d-pad.

   It multiplies a frustum that was already computed to FIT THE ARENA, so
   these cannot go much below .8 without cropping the biggest boards - the
   88-block BOSS IV arena is the one to check against. */
function barIsUp(){
  var u=(typeof settings!=="undefined"&&settings.ui)||"full";
  // a tutorial forces the bar back on whatever the layout says
  return u!=="none"||document.body.classList.contains("tut");
}
function updateFrustum(){
  var w=window.innerWidth,h=window.innerHeight,a=w/h;
  if(L&&L.blocks&&L.blocks.length)viewSizeT=fitViewSize();
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
/* HOW HARD DEPTH IS PUSHED BACK. Raised once the blocks carried surfaces:
   the fade lerps material.color toward the void, and against a textured
   block that reads as much less separation than it did against a flat one -
   the texture's own colour survives the multiply and keeps the block
   looking present. */
/* DEPTH IS A STEP, NOT A RAMP.

   Screen-vertical in this projection is height and depth added together, so
   a block one further back and one higher land in the same place. The only
   thing separating them is this shading - and it used to be a smooth ramp
   from the player's own depth, which meant the FIRST cell of difference,
   the one that actually decides whether a step is a walk or a fall, cost
   almost nothing (.12) and was invisible. The blocks that lie are the ones
   a single cell away; the ones six away were never confusing.

   So the first cell costs DEPTH_STEP outright and DEPTH_SLOPE only grades
   what is behind it. Your own depth slice is lit and everything else has
   visibly receded, which is a categorical statement rather than a gradient
   the eye has to measure. */
var DEPTH_STEP=.34, DEPTH_SLOPE=.09, DEPTH_CAP=.68;

/* HOW FAR THE CAMERA LEANS - the one structural lever on depth ambiguity.

   At .62 a cell of height is 1.90 cells of depth on screen, so a block two
   further back draws within a twentieth of a cell of one a step LOWER, and
   the level has told the player something untrue. tools/legible.js measures
   it: 30 levels flagged at .62, and small nudges do nothing because the
   coincidence simply moves to a different pair. There is a cliff at about
   .95 (1 : 1.24), where the count falls to 11 - but that is a real change to
   how the game looks, so it is the owner's call, not a fix to apply quietly.

   It is a named constant so the question can be ASKED - fitViewSize() reads
   it too, and changing one without the other reframes every level. */
var CAM_TILT=.62;
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
  var f=Math.min(DEPTH_CAP,DEPTH_STEP+(diff-1)*DEPTH_SLOPE)*(1-ft*2);
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
function fireFlames(tips,ft,rx,rz){
  tips.visible=true;
  var over=ft>.5, t=Math.max(0,Math.min(1,(ft-.35)/.5));
  tips.position.y=0;
  var kids=tips.children;
  for(var i=0;i<kids.length;i++){
    var c=kids[i],u=c.userData;
    var fl=.80+.20*Math.sin(airPhase*7.5+u.ph)+.06*Math.sin(airPhase*17+u.ph*3);
    /* Flattened they spread along SCREEN-RIGHT, which is the axis the fold
       leaves intact - rx/rz come from the current view, so the row reads as a
       row from whichever side the world was folded. */
    var fx=u.fx*rx, fz=u.fx*rz;
    c.position.set(u.vx+(fx-u.vx)*t, .42+.14*t, u.vz+(fz-u.vz)*t);
    // smaller when flat, and four of them, so the row does not become a wall
    var sc=1-.34*t;
    c.scale.set((.86+fl*.18)*sc,u.h*fl*sc,1);
    // turned flat-on to the camera: a flame has no side to show
    if(camera)c.quaternion.copy(camera.quaternion);
    c.material.opacity=(.72+fl*.26)*(over?1:.92);
    c.material.depthTest=!over;
    c.renderOrder=over?940:0;
  }
}

/* How far a block settles toward ink when the world folds. 1 is the old
   behaviour - everything becomes a black silhouette on paper - and 0 keeps
   the world exactly as it looked standing up. Low, because the plane was
   reported as looking like a different game: what tells you that you are
   flat is the world visibly collapsing, the grid coming in and the button
   saying GO 3D, not the picture changing its palette. */
var INK_SETTLE=0.18;
/* How far the plane's ground lifts off the section's sky when the world
   folds. Small on purpose - see the note in CLAUDE.md; at 0 the fold changes
   no colour at all, and every time this has been raised the plane has
   stopped looking like the same place. */
var PAPER_LIFT=0.20;
var WHITE=new THREE.Color(0xffffff);
/* WATER IN THE PLANE - a trace, then a drain.

   Water casts nothing into the silhouette; that is the rule and it has not
   moved. But a player who folds while standing ON water was left hanging
   over nothing, which reads as a bug rather than as a mechanic. So the fold
   leaves the water behind as a shallow trace under their feet, and their
   first step in the plane DRAINS it - it sinks out of the square and is
   gone.

   That is the honest version of the rule rather than a softening of it: the
   water was there, it is leaving, and by the time you have moved it is not
   coming back. The trace is deliberately shallow and unlit so it never looks
   like ground you could return to. */
/* THE WATER YOU FOLDED ON, and only that one.

   The trace answers exactly one question - why am I not falling through this
   square - so it is needed on the single block that was under the player at
   the moment they folded. It does NOT follow them: a trace that fills the
   next block as you arrive makes the plane look like it still has water in
   it, which is the opposite of what the rule says. One block, left behind,
   draining.

   Captured in the volume rather than derived in the plane, because "the
   block I was standing on" is a fact about the world before it collapsed and
   is the same fact whichever way the fold went. */
var traceKey=null, traceDrain=0, traceDrainT=0;
function markWaterTrace(){
  traceKey=null;traceDrain=0;traceDrainT=0;
  if(!L||!L.blocks||!player)return;
  for(var i=0;i<L.blocks.length;i++){
    var b=L.blocks[i];
    if((b[3]||0)!==1)continue;
    if(b[0]===player.x&&b[1]===player.y-1&&b[2]===player.z){
      traceKey=K(b[0],b[1],b[2]);return;
    }
  }
}
function drainWater(){
  if(!flat||!traceKey||traceDrainT)return;
  traceDrainT=1;
  if(typeof SFX!=="undefined"&&SFX.spill)SFX.spill();
}

/* ============================================================
   THE LANDING INDICATOR - rule 5, shown instead of stated
   ============================================================
   "You return on the block nearest the camera, unless an anchor is among
   them" is stated once in the tutorial and never shown again, and it is the
   single thing that cost the first real playtester the most. It cannot be
   drawn while you are FLAT - every candidate is at the same screen position
   there, which is what folding means - so it is drawn at the moment it
   happens: standing up rings the block you landed on and, dimmer, the ones
   you did not.

   It only appears WHEN THERE WAS A CHOICE. On a column with one supporting
   block nothing was decided and a marker would be noise; the rule has
   nothing to teach there. That is also why it stays quiet on most levels and
   turns up exactly on the ones that turn on it. */
/* ============================================================
   THE SHIELD BUBBLE - one beat in which nothing can take a life
   ============================================================
   A clock level had three ways to charge you a life and no single place that
   said "you have just been charged", so being caught by the sweep and then
   falling out of the world in the same moment cost two of them. The window
   that fixes it is in 05-state.js; this is the half the player sees, and it
   has to be seen: the whole reason a life was not spent is invisible
   otherwise, and a player who cannot tell they are protected will not use it.

   Two shells, and each answers a different problem:

   * the FILL is the player's own colour, because whose shield this is, is the
     content of the drawing - `applySkin` recolours it exactly as it recolours
     the shadow under their feet;
   * the SHELL is a wireframe in `outlineCol`, the rim colour `outlineFor()`
     re-picks from the current background every frame. That is already this
     game's answer to "a colour that reads against both the void and the
     paper", and the alternative is a bubble that vanishes in the plane on a
     white skin.

   It SWELLS as it expires rather than only fading, so it reads as running out
   rather than as switching off - a bubble that simply dims looks like it
   might still be there. */
var shieldFill=null, shieldShell=null;
function buildShield(){
  /* A RING TURNED TO FACE THE CAMERA, NOT A WIREFRAME SPHERE. A wire sphere
     was the obvious drawing and it does not survive the size this is rendered
     at: the player is about thirty pixels across, and at that scale even a
     coarse 10x6 cage closes into a fuzzy ball that buries them - which is the
     opposite of what a shield around somebody should do. Both 14x10 and 10x6
     were rendered and neither read.

     A circle does. It is the same trick the flames use - a flat thing turned
     to the camera every frame, so there is no solidity to shade - and one
     clean outline around the player says "bubble" at any size while leaving
     them visible inside it. */
  shieldFill=new THREE.Mesh(new THREE.SphereGeometry(.52,16,10),
    new THREE.MeshBasicMaterial({color:0xd6336c,transparent:true,
      opacity:0,depthWrite:false}));
  shieldShell=new THREE.Mesh(new THREE.TorusGeometry(.56,.024,6,30),
    new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,
      opacity:0,depthWrite:false}));
  shieldFill.renderOrder=940;shieldShell.renderOrder=941;
  shieldFill.visible=shieldShell.visible=false;
  scene.add(shieldFill);scene.add(shieldShell);
}
function shieldFrame(){
  if(!shieldFill)return;
  /* Never during a replay: the film is of a moment when there was no shield,
     and drawing one round a recorded pose says the player was protected in a
     second they very much were not. */
  var on=app==="play"&&(B||TR)&&shieldMs>0&&!dying&&!rep;
  shieldFill.visible=shieldShell.visible=!!on;
  if(!on)return;
  var t=Math.min(1,shieldMs/SHIELD_MS);              // 1 at the hit, 0 at the end
  var puff=1+.07*Math.sin(Date.now()*.011);
  var sc=puff*(1.06-.12*t);
  shieldFill.position.copy(playerMesh.position);
  shieldShell.position.copy(playerMesh.position);
  shieldShell.quaternion.copy(camera.quaternion);   // always edge-on to nobody
  shieldFill.scale.setScalar(sc);shieldShell.scale.setScalar(sc);
  var fade=Math.min(1,t/.28);                        // out over the last quarter
  shieldFill.material.opacity=.10*fade;
  shieldShell.material.opacity=.60*fade;
  shieldShell.material.color.copy(outlineCol);
}

var LAND_MS=1600, landGeo=null, landRings=[], landHint=null;
var planePeek=0, PEEK_RISE=.82;
/* Where standing up would put you, asked while flat. The same two calls
   doUnflatten makes, so the preview and the move cannot disagree. */
function peekLanding(){
  if(!flat||!R||!flatPos)return null;
  var land=R.landings(view,flatPos.u,flatPos.y,liveCrates());
  if(!land.length)return null;
  var win=R.pick(land);
  return {land:land,win:win};
}
function landRing(i){
  if(!landGeo)landGeo=new THREE.EdgesGeometry(new THREE.BoxGeometry(1.06,1.06,1.06));
  while(landRings.length<=i){
    var m=new THREE.LineSegments(landGeo,new THREE.LineBasicMaterial({
      color:0xffffff,transparent:true,opacity:0,depthTest:false}));
    m.renderOrder=930;m.visible=false;
    scene.add(m);landRings.push(m);
  }
  return landRings[i];
}
/* `land` holds the squares you could have STOOD IN; the block that holds you
   up is the one below each, which is what gets ringed. */
function showLanding(land,win,isAnchor){
  if(!land||land.length<2)return;
  landHint={t:0,anchor:!!isAnchor,cells:land.map(function(c){
    return {x:c.x,y:win.yStand-1,z:c.z,win:(c.x===win.x&&c.z===win.z)};
  })};
}
/* The rings the preview draws. Live rather than timed: they belong to the
   peek and go with it, where the ones after a real landing fade on a clock. */
function landLive(){
  if(!flat||planePeek<.05)return false;
  var lp=peekLanding();
  if(!lp||lp.land.length<1)return false;
  landHint={t:0,live:true,anchor:!!lp.win.anchor,
    cells:lp.land.map(function(c){
      return {x:c.x,y:flatPos.y-1,z:c.z,win:(c.x===lp.win.x&&c.z===lp.win.z)};
    })};
  return true;
}
/* THE EYE LIGHTS WHEN LOOKING WOULD TELL YOU SOMETHING, AND THAT IS NARROWER
   THAN "more than one block in your column".

   More than one candidate was the first rule and it lit far too often: most
   columns in most levels hold two blocks, and the choice between them
   usually decides nothing the player cares about - so the button was on for
   most of the time anybody spent flat, which is exactly how a cue becomes
   wallpaper. Reported as being shown when it was not necessary.

   It now asks the question the player is actually about to get wrong: the
   goal is in the square you are standing on in the plane - so it looks like
   you have arrived - and the block you would come back on is not it. That is
   the one moment the landing rule costs you the level rather than a step,
   and it is the moment the eye answers.

   Judged every frame rather than in syncHud for the same reason the boss's
   fold cue is: the answer changes when the player moves in the plane, not
   when a button is pressed.

   It also counts the peek for the tutorial - an EFFECTIVE peek, one where
   the world actually rose, rather than a button press that went nowhere. */
var lookLit=false, peekCounted=false;
function lookCue(){
  var el=document.getElementById("bLook");
  if(!el)return;
  var want=false;
  if(app==="play"&&flat&&!dying&&!levelOver()&&R&&flatPos&&planePeek<.05){
    var land=R.landings(view,flatPos.u,flatPos.y,liveCrates());
    if(land.length>1&&typeof liveGoal==="function"){
      var g=liveGoal(), r=AX[view].r;
      // The goal folds into this square: on screen you are standing on it.
      if(g&&g[1]===flatPos.y&&g[0]*r[0]+g[2]*r[2]===flatPos.u){
        var win=R.pick(land);
        want=!(win.x===g[0]&&win.z===g[2]);   // ...and you would miss it
      }
    }
  }
  if(want!==lookLit){lookLit=want;el.classList.toggle("look",want);}
  if(flat&&planePeek>.5&&!peekCounted){
    peekCounted=true;
    if(tutC){
      tutC.peek=(tutC.peek||0)+1;
      if(typeof tutPoke==="function")tutPoke("bLook");
      /* AND SYNC, or the tutorial locks the player out. Peek is the only
         thing that satisfies a step without going through one of the four
         verbs, and those are what normally call syncHud - so the counter
         moved on, the step advanced, and the coach, the cue and the GUIDED
         LOCK all stayed on the old step. The lock was still only accepting
         the eye, so the next press of GO 3D did nothing at all and the
         tutorial was stuck on the step it had already finished. */
      if(typeof syncHud==="function")syncHud();
    }
  }
  if(planePeek<.05)peekCounted=false;
}

/* THE TUTORIAL'S OWN RINGS - the same drawing, held up instead of flashed.

   `00 - First Landing` has to point at a block and say "that one catches
   you", then turn the world around and point at the other one. The rings
   after a real landing already say exactly that, so this is not a second
   marker: it is the same one, kept on screen for as long as the step lasts
   and computed the same way.

   DERIVED, NEVER AUTHORED. The cells come from the same R.landings() /
   R.pick() pair that doUnflatten() itself calls, so the ring cannot point
   anywhere the fold would not put you - which matters most on the half turn,
   where the ring has to move to the other block on its own. A level that
   listed its two blocks by hand would be a second copy of rule 5 waiting to
   disagree with the first.

   Silent unless the column actually held a choice, exactly like the landing
   hint: one candidate decided nothing and a ring around it would be pointing
   at the only thing there is. */
var TUT_RING_BREATH=2600;
var tutRingT=0, tutRingBreath=0;
var colWhite=new THREE.Color(0xffffff);
function tutLandMark(dtMs){
  if(typeof tutMark==="undefined"||!tutMark)return false;
  if(app!=="play"||dying||!R)return false;
  var u,y;
  if(flat){ if(!flatPos)return false; u=flatPos.u; y=flatPos.y; }
  else { u=R.uOf(view,player.x,player.z); y=player.y; }
  var land=R.landings(view,u,y,liveCrates());
  if(land.length<2)return false;
  var win=R.pick(land);
  landHint={t:0,live:true,anchor:!!win.anchor,cells:land.map(function(c){
    return {x:c.x,y:y-1,z:c.z,win:(c.x===win.x&&c.z===win.z)};
  })};
  /* The blocks themselves as well as the rings. Both candidates come out of
     the depth fade - the loser in this level is five cells back and would
     otherwise be nearly gone, in a lesson that needs the player to see two
     blocks in order to understand that one of them was chosen - and the
     winner is tinted outright, which is the only marker that survives being
     stood on. Registered with perilCleanup so its edge colour is put back
     the frame the step ends. */
  tutMarkSet={};
  for(var mi=0;mi<landHint.cells.length;mi++){
    var mc=landHint.cells[mi], mk=K(mc.x,mc.y,mc.z);
    tutMarkSet[mk]=mc.win?1:2;
    if(perilCleanup.indexOf(mk)<0)perilCleanup.push(mk);
  }
  // A slow breath rather than a steady outline: it has to read as something
  // the game is saying now, not as an edge the block happens to have. Slow
  // enough not to compete with the pulse on the button it is asking for.
  tutRingT=(tutRingT+dtMs)%TUT_RING_BREATH;
  // 0..1, shared with the block loop so the ring and the block it is around
  // breathe as one thing rather than as two that happen to be near each other
  tutRingBreath=.5+.5*Math.sin(tutRingT/TUT_RING_BREATH*Math.PI*2);
  landRingsDraw(.84+.16*(tutRingBreath*2-1));
  return true;
}
function landFrame(dtMs){
  var i;
  tutMarkSet=null;                            // rebuilt below, once, per frame
  if(landHint&&landHint.live)landHint=null;   // rebuilt below while peeking
  if(tutLandMark(dtMs))return;
  if(!landLive()&&!landHint){
    for(i=0;i<landRings.length;i++)landRings[i].visible=false;return;
  }
  if(landHint.live){
    var lf=Math.min(1,(planePeek-.05)/.35);
    landRingsDraw(lf);return;
  }
  landHint.t+=dtMs;
  /* Cleared when the player FOLDS AGAIN, which is `flat` - not flatT. flatT
     is still near 1 on the first frames after standing up, because the world
     is only starting to rise, so testing it threw the hint away on the very
     frame it was created. */
  if(landHint.t>LAND_MS||flat){
    landHint=null;
    for(i=0;i<landRings.length;i++)landRings[i].visible=false;
    return;
  }
  var p=landHint.t/LAND_MS;
  // in over the first fifth - the world is still standing up before that -
  // and out over the last third, so it never just vanishes
  landRingsDraw(Math.min(1,p/.2)*Math.min(1,(1-p)/.34));
}
/* Placed with the same interpolation the block loop uses, so a ring sits on
   its block through the whole rise rather than only at the ends of it. */
function landRingsDraw(fade){
  var i, ta=viewAngle*Math.PI/180;
  var dvx=Math.sin(ta),dvz=Math.cos(ta),rx=Math.cos(ta),rz=-Math.sin(ta);
  for(i=0;i<landHint.cells.length;i++){
    var c=landHint.cells[i],m=landRing(i);
    m.visible=true;
    var cu=c.x*rx+c.z*rz, cd=c.x*dvx+c.z*dvz, cfd=cd*.012;
    var cpx=cu*rx+cfd*dvx, cpz=cu*rz+cfd*dvz;
    m.position.set(c.x+(cpx-c.x)*flatT,c.y,c.z+(cpz-c.z)*flatT);
    /* The winner in the colour of whatever decided it - amber when an anchor
       overrode the rule, the goal's green when it was simply the nearest -
       and the ones that lost in a dim version of the same, so the choice is
       one picture rather than two. */
    var win=c.win;
    m.material.color.setHex(landHint.anchor?(win?0xffd98a:0x6b5a38)
                                           :(win?0x35c2a5:0x2f5a55));
    m.material.opacity=(win?.95:.42)*fade;
  }
  for(;i<landRings.length;i++)landRings[i].visible=false;
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
  /* PEEK IN THE PLANE IS A PREVIEW UN-FOLD.

     Flattened, every candidate block is at the same screen position - that
     is what folding means - so the landing rule operates on information the
     player cannot see, and no amount of better wording fixes that. The eye
     button already means "see depth without spending a move", and it was
     switched OFF in the plane. Held there it now raises the world back
     toward the volume, most of the way but never all of it, and drops it
     again on release. Nothing is committed: `flat` and `flatPos` do not
     move, only the number the renderer draws from.

     It works by lowering the TARGET flatT eases toward, which is why it
     costs nothing else: every part of the drawing already reads flatT -
     positions, the sky, the depth fade, the fire's flames - so the whole
     world previews together rather than in pieces. flatT is a render value
     and nothing outside this file reads it; `flat` is the state. */
  var wantLean=flat?0:peekTarget, wantPlane=(flat&&!dying)?peekTarget:0;
  planePeek+=(wantPlane-planePeek)*.15;
  if(planePeek<.002)planePeek=0;
  /* THE FOLD IS A TIMED TWEEN, NOT A LERP, AND THAT IS THE WHOLE DIFFERENCE.

     It used to be `flatT += (want-flatT)*rate`, which is an exponential
     ease-*out*: it does most of its travel in the first few frames and then
     spends half a second creeping the last two percent. So the move was over
     before the eye had followed it and the long tail was invisible - the
     verb the entire game is built on read as a cut. A linear phase through
     an ease-in-out curve puts the motion where it can be watched: it leans
     in, travels, and settles.

     Peek is kept OUT of the tween and multiplied on afterwards. It is a live
     analogue value the player is holding, not a move being played, so it has
     to stay a lerp - and the separation is what lets the fold have a real
     duration without peek inheriting one.

     An external write to flatT still wins. resetLevel(), respawn() and
     loadLevel() all snap it to 0, and a death that animated a slow unfold on
     its way back to the start would be the reset arriving in slow motion. It
     is detected rather than declared - comparing against the value this loop
     last wrote - so nothing outside this file has to know the tween exists. */
  if(flatT!==foldLast){foldBase=flatT;foldFrom=flatT;foldP=1;foldWas=flatTarget;}
  if(flatTarget!==foldWas){foldWas=flatTarget;foldFrom=foldBase;foldP=0;}
  if(foldP<1){
    /* Standing up is slower than folding, so the return reads as a journey
       rather than a cut - it is the one moment that shows you travelling to
       the front of the stack. Not on a clock: there half a second is a real
       cost and the fight has to stay honest. */
    var fdur=(B||TR)?FOLD_MS_CLOCK
            :(flatTarget<foldFrom?FOLD_MS_OUT:FOLD_MS_IN);
    // Clamped for the same reason the fight clocks clamp theirs: a
    // backgrounded tab hands back one enormous frame, and the one move the
    // whole game is about must not be skipped by returning to it.
    foldP=Math.min(1,foldP+Math.min(dtMs,60)/fdur);
    var fe=foldP<.5 ? 4*foldP*foldP*foldP
                    : 1-Math.pow(-2*foldP+2,3)/2;      // ease in-out cubic
    foldBase=foldFrom+(flatTarget-foldFrom)*fe;
  } else foldBase=flatTarget;
  var ftWant=foldBase*(1-planePeek*PEEK_RISE);
  /* THE REPLAY. Ticked here rather than in bossFrame, because bossFrame is
     stopped for exactly the things the replay plays over - and it runs on
     real time, because it is a piece of film rather than a beat of the fight.

     The pose itself is written into the game state by replayFrame(); all this
     does is the two things that are purely picture: hold the camera at the
     angle the replay chose, and floor flatT with the closing fold. flatT is a
     render value that nothing outside this file reads, the same seam peek
     uses, so the fold at the end costs the board nothing. */
  if(typeof replayFrame==="function")replayFrame(dtMs);
  if(rep){
    viewAngleTarget=rep.angle;
    if(rep.fold>0)ftWant=Math.max(ftWant,rep.fold);
    repFade=1;
  } else if(repFade>0){
    // the fold unwinds after the film ends rather than snapping back
    repFade=Math.max(0,repFade-dtMs/420);
  }
  flatT=ftWant;
  foldLast=flatT;               // see the external-write test above
  viewAngle+=(viewAngleTarget-viewAngle)*.16;
  /* THE WEATHER. Driven off real frame time like the fight clocks, so it
     runs at the same rate on a 120Hz phone and a loaded one - and folded,
     the air fades back rather than stopping, because the plane is a place
     too and a dead sky there would read as the game having switched off. */
  airPhase+=dtMs*.0009;
  if(!flat&&flatT<.5){traceKey=null;traceDrainT=0;traceDrain=0;}
  traceDrain+=(traceDrainT-traceDrain)*Math.min(1,dtMs*.006);
  if(TEX&&TEX.water){
    TEX.water.offset.y=(airPhase*.055)%1;
    TEX.water.offset.x=(Math.sin(airPhase*.31)*.006);
  }
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
  layoutAtmosphere(dtMs);
  landFrame(dtMs);
  lookCue();
  /* playerMesh rather than `player`, because the mesh is where the player is
     actually drawn - already eased, and already in plane coordinates when
     flat - so the camera cannot arrive somewhere the cube has not. */
  /* THE REPLAY FOLLOWS ITS SUBJECT. The arena camera is deliberately still
     during play - FOLLOW is off, because the bigger world put hunter spawns
     outside the frustum - but during a replay nothing is being played, so
     following is free and it is what makes the film read as somebody's point
     of view rather than as the board with different things on it. Clamped to
     the arena for the same reason the follow camera was: an unbounded follow
     drifts into the void the moment its subject stands on an edge. */
  if(rep&&app==="play"){
    var sub=(rep.mode==="death"&&hunters.length)?hunters[0]:player;
    if(rep.mode==="death"&&rep.who&&hunters.length){
      // the one that hit you, matched by where it was standing at the end
      var best=hunters[0], bd=1e9;
      for(var ri=0;ri<hunters.length;ri++){
        var d=Math.abs(hunters[ri].x-rep.who.x)+Math.abs(hunters[ri].z-rep.who.z);
        if(d<bd){bd=d;best=hunters[ri];}
      }
      sub=best;
    }
    repFollow.set(
      Math.max(arenaLo[0],Math.min(arenaHi[0],sub.x)),
      Math.max(arenaLo[1],Math.min(arenaHi[1]+1,sub.y))+.5,
      Math.max(arenaLo[2],Math.min(arenaHi[2],sub.z)));
    repFollow.lerp(centerT,.5);       // half way: a lean, not a lock
    center.lerp(repFollow,.10);
  } else if(FOLLOW>0&&app==="play"&&playerMesh){
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
  // The replay leans in a little as well, which is the other half of it
  // reading as a camera rather than as the same wide board.
  var vsWant=(FOLLOW>0&&app==="play")?Math.min(viewSizeT,FOLLOW_ZOOM)
           : rep?viewSizeT*.86 : viewSizeT;
  var pv=viewSize;viewSize+=(vsWant-viewSize)*.12;
  if(Math.abs(pv-viewSize)>.005)updateFrustum();

  // the camera lean is for the volume; in the plane the same button drives
  // planePeek above instead, which is a preview rather than an angle
  peek+=(wantLean-peek)*.12;
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
  var tilt=(1-flatT)*CAM_TILT;
  if(dying)shakeT=Math.min(1,shakeT+.12); else shakeT*=.86;
  /* Both of these are camera offsets in WORLD units, so a level drawn at
     twice the scale would feel half the kick - `viewSize` is the frustum's
     half-extent, so dividing by it keeps the motion the same fraction of the
     screen on a small arena and a large one. */
  var vsc=viewSize/10;
  var sh=shakeT*.35*vsc;
  /* THE FOLD'S SLAM. One oscillation, eased out quadratically, so it lands
     hard and settles rather than ringing - a world hitting the plane, not a
     spring. It runs on its own counter because it is longer than the jitter
     (about 400ms against 200) and because its sign is information. */
  if(foldSlamT>0)foldSlamT=Math.max(0,foldSlamT-.028);
  /* The phase runs FORWARD from the moment of the fold (1-t) while the
     envelope decays with it (t squared), so the swing starts from rest,
     peaks about a fifth of the way in and rebounds once. Driving the phase
     off `t` directly instead puts the camera at its extreme on the first
     frame, which is a jump-cut rather than a slam. */
  var slam=Math.sin((1-foldSlamT)*Math.PI*1.6)*foldSlamT*foldSlamT*
           2.2*vsc*foldSlamDir;
  camera.position.set(center.x+dvx*40+(Math.random()-.5)*sh,
                      center.y+(tilt+peek*.22)*34+(Math.random()-.5)*sh+slam,
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
    } else if(tutMarkSet&&tutMarkSet[k]){
      /* The tutorial pointing at a block.

         THE HIGHLIGHT SITS ON TOP OF THE BLOCK'S IDENTITY RATHER THAN
         REPLACING IT. It used to repaint the winner green, which is the
         colour the rings use - and that is wrong here for two reasons. The
         goal is already a green wireframe sitting on the far block, so in the
         second half of the level everything at the front of the screen was
         green; and repainting the winner means the two blocks swap COLOUR on
         the half turn at the same moment they swap screen position, so a
         player cannot tell whether the blocks moved or the marker did - which
         is the one question the level exists to answer.

         So the body keeps its own hue and the highlight is BRIGHTNESS: the
         block at the front breathes, brightened and lifted, and wears a
         bright rim. A block that is visibly alive is unmistakable even with
         the player sitting on it, which is the case a ring alone cannot
         cover.

         Both candidates come out of the depth fade, winner and loser alike:
         the whole point is that they are far apart in depth, so fading the
         far one hides the thing being taught. Peril still outranks all of it -
         a warning that you are about to be crushed beats a lesson. */
      var twin=tutMarkSet[k]===1;
      var tbase=(tintSet&&tintSet[k]!==undefined)?tintCol[tintSet[k]]:colBlock;
      m.material.color.copy(tbase);
      if(twin)m.material.color.lerp(colWhite,.20+.16*tutRingBreath);
      m.material.color.lerp(colInk,flatT*INK_SETTLE);
      m.userData.edge.material.color.set(twin?0x35c2a5:0x2f5a55);
      m.userData.edge.material.opacity=twin?(.7+.3*tutRingBreath):.5;
      m.material.opacity=1;
    } else if(m.userData.glass){
      /* The surface rises and falls. One shared geometry means the plate
         cannot be moved per block, so the swell is carried on the whole
         mesh's Y - a few hundredths of a cell, phased off the block's own
         position so a pool of them ripples rather than pumping in unison.
         Suppressed as the world folds: a wave in a silhouette is noise. */
      m.position.y+=Math.sin(airPhase*2.6+b[0]*1.7+b[2]*2.3)*.022*(1-flatT);
      /* Solid in the volume; a shallow trace once flat, which drains away on
         the player's first step. The trace sits low in the cell and takes no
         edge, so it reads as what is LEFT of the water rather than as water
         you could stand on. */
      /* THE TRACE HANGS FROM THE TOP OF THE CELL, not the bottom. Scaling a
         mesh shrinks it about its own centre, so simply thinning it left the
         water lying on the floor of the square while the player stood on the
         square's ceiling - which looked like standing on air above a puddle.
         Raising by half the height lost keeps the SURFACE where it was, so
         the trace is what is left directly under their feet. Draining then
         sinks it out of the square from there. */
      var ft2=Math.max(0,Math.min(1,(flatT-.35)/.65));
      // the one block that was under the player when they folded, and only
      // that one; it drains on their first step and does not come back
      var tr=(k===traceKey)?(1-traceDrain):0;
      var ky=1-ft2*.74;
      m.scale.y=ky;
      // sinks out of the square as it empties, so leaving reads as draining
      m.position.y+=.5*(1-ky)-ft2*(1-tr)*1.15;
      m.material.opacity=.78*(1-ft2)+.40*ft2*tr;
      m.userData.edge.material.opacity=Math.max(0,.95*(1-ft2*1.6));
      m.material.color.copy(colGlass);
    } else if(m.userData.kind===4){
      // fire stays legible when flat - the lethal column is the whole point
      m.material.color.copy(colSpike).lerp(colInk,flatT*INK_SETTLE*.6);
      if(m.userData.tips)fireFlames(m.userData.tips,flatT,rx,rz);
      applyDepth(m,b,pdepth,tdvx,tdvz,flatT);
    } else if(m.userData.anchor){
      // anchors stay legible once flat - they're the reason the fold matters
      m.material.color.copy(colAnchor).lerp(colInk,flatT*INK_SETTLE*.8);
      m.userData.edge.material.opacity=.85;
      applyDepth(m,b,pdepth,tdvx,tdvz,flatT);
    } else {
      /* THE PLANE IS THE WORLD, FLATTENED - not a second picture of it.

         This used to run all the way to ink, so a grass block folded into a
         black rectangle and the two halves of the game looked like two
         games. It now settles only INK_SETTLE of the way, which keeps the
         hue and the surface: fold a meadow and you get a meadow lying down.

         That also retired inkLift(). Driving the texture through emissive
         was a workaround for colour having gone black, and with the colour
         still there the map multiplies normally and the grain simply
         shows. */
      var base=ghosted.has(k)?colGhost
             : (tintSet&&tintSet[k]!==undefined)?tintCol[tintSet[k]]
             : colBlock;
      m.material.color.copy(base).lerp(colInk,flatT*INK_SETTLE);
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
      .lerp(colInk,flatT*INK_SETTLE);
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
  /* While peeking in the plane the player is drawn rising onto the block
     they WOULD land on, not the one they folded from - which is the whole
     answer to "where do I come back". Outside the peek this is unchanged. */
  if(flat&&planePeek>.01){
    var lp=peekLanding();
    if(lp){srcX=lp.win.x;srcZ=lp.win.z;srcY=flatPos.y;}
  }
  var pu=flat?flatPos.u:(srcX*rx+srcZ*rz), py=flat?flatPos.y:srcY;
  var fx=pu*rx+1.2*tdvx,fz=pu*rz+1.2*tdvz;
  tmp.set(srcX+(fx-srcX)*flatT, srcY+(py-srcY)*flatT, srcZ+(fz-srcZ)*flatT);
  /* CAUGHT BY THE FIRE, and it does not fall - it burns where it stands.

     The piece was a spike once and the death was the same one falling out of
     the world uses, which is what a spike deserves and a fire does not: fire
     does not drop you, it takes you. So the cube sinks a little, flickers,
     shrinks, and a handful of flames come up around it - the same flameGeo
     the fire blocks use, so it is the same fire rather than a second drawing
     of one. `burnGrp` is built the first time anything burns and hidden the
     rest of the time. */
  if(burnGrp)burnGrp.visible=false;
  if(dying!=="spike")playerChar(0);
  if(dying){
    dyingT+=1;
    if(dying==="spike"){
      playerMesh.position.x+=(tmp.x-playerMesh.position.x)*.3;
      playerMesh.position.z+=(tmp.z-playerMesh.position.z)*.3;
      var burn=Math.min(1,dyingT/26);
      playerMesh.position.y+=(tmp.y-.16*burn-playerMesh.position.y)*.25;
      // it shudders as it goes, and what is left of it is thin and tall
      var bs=1-burn*.72;
      playerMesh.scale.set(bs*(1+Math.sin(dyingT*1.7)*.09),
                           bs*(1+burn*.55),
                           bs*(1+Math.cos(dyingT*1.5)*.09));
      if(!burnGrp){
        burnGrp=new THREE.Group();
        for(var bfi=0;bfi<6;bfi++){
          var bf=new THREE.Mesh(flameGeo,new THREE.MeshBasicMaterial({
            vertexColors:true,transparent:true,opacity:0,
            depthWrite:false,depthTest:false,side:THREE.DoubleSide}));
          bf.renderOrder=940;
          bf.userData={ph:Math.random()*6.283,
            ox:(Math.random()-.5)*.6, oz:(Math.random()-.5)*.6,
            h:.7+Math.random()*.9};
          burnGrp.add(bf);
        }
        scene.add(burnGrp);
      }
      burnGrp.visible=true;
      burnGrp.position.copy(playerMesh.position);
      var bk=burnGrp.children;
      for(var bi3=0;bi3<bk.length;bi3++){
        var bq3=bk[bi3],bu3=bq3.userData;
        var flick=.78+.22*Math.sin(airPhase*9+bu3.ph)+.08*Math.sin(airPhase*21+bu3.ph*3);
        bq3.position.set(bu3.ox*(1-burn*.3),-.30+burn*.34+bu3.h*.10,bu3.oz*(1-burn*.3));
        /* Kept close to the cube. Tall thin flames read as a column of fire
           standing somewhere near the player rather than as the player being
           on fire, which is the opposite of the point. */
        var gsz=(.42+burn*.5)*flick;
        bq3.scale.set(gsz*.9,bu3.h*gsz*.9,1);
        if(camera)bq3.quaternion.copy(camera.quaternion);
        // up quickly, and gone before the cube is
        bq3.material.opacity=Math.min(1,burn/.18)*(1-burn)*(1-burn)*2.2;
      }
      // and what the fire leaves: the flames go out on a black cube, not on
      // the one that walked in.
      playerChar(Math.min(1,Math.max(0,(burn-.32)/.46)));
    } else if(dying==="fall"){
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
  /* Blinking through the beat of grace after a trial hit. Invulnerability
     you cannot see is invulnerability you will not use.

     THE BUBBLE REPLACES THE BLINK WHILE IT IS UP, rather than running beside
     it. They are two different promises - the blink says "the sweep cannot
     land on you", the bubble says "nothing at all can take a life" - and the
     bubble's is the stronger and the shorter, so it speaks first. Drawing
     both meant a bubble around a player flickering in and out of existence,
     which reads as a rendering fault rather than as protection. When the
     bubble goes, the blink is still there for the rest of the beat. */
  playerMesh.visible=shieldMs>0||
    !(trialGrace>0&&Math.floor(Date.now()/85)%2===0);
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
      if(!pm||(perilSet&&perilSet[perilCleanup[pc]])||
         (tutMarkSet&&tutMarkSet[perilCleanup[pc]]))continue;
      var pk=pm.userData.kind;
      pm.userData.edge.material.color.set(
        pk===1?0xbdeaf7:pk===2?0xffd98a:pk===4?0xff8a72:0x0f1424);
      pm.userData.edge.material.opacity=pk===1?.95:(pk===2||pk===4?.85:.35);
    }
    perilCleanup=perilCleanup.filter(function(kk){
      return (perilSet&&perilSet[kk])||(tutMarkSet&&tutMarkSet[kk]);});
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
  if(typeof replayTick==="function")replayTick(dtMs);
  amb.intensity=.45+.55*flatT;
  dir1.intensity=.85*(1-flatT);
  dir2.intensity=.35*(1-flatT);
  scene.background.copy(colVoid).lerp(colPaper,flatT);
  // The ground swings from the void to paper as the world folds, so the
  // player's rim has to be re-picked against it rather than set once.
  outlineFor(playerMesh,scene.background);
  // After outlineFor, because the shell borrows the rim colour it just picked.
  shieldFrame();
  /* THE GRID IS THE EDITOR'S NOW. It used to draw in the plane as the cue
     that you were flat, back when flat also meant a different palette. The
     plane is the same world in different light now - the collapse itself,
     the sky lifting and the button reading GO 3D all say it - and a ruled
     overlay across a meadow was the one thing left that looked like a
     diagram rather than a place. Raise the second term to bring it back. */
  if(gridLines) gridLines.material.opacity=(app==="edit"?.09+.16*flatT:0);

  renderer.render(scene,camera);
}
