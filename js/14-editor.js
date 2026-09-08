"use strict";
/* Orthogonal — 14-editor.js
   Tap-to-place level editor and its verify/minimize tools.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   EDITOR
   ============================================================ */
var ray=new THREE.Raycaster(),ndc=new THREE.Vector2();

/* ARE THERE EDITS THE LIBRARY HAS NOT BEEN TOLD ABOUT?

   snapshot() is the one funnel every board change goes through - it is what
   pushes the undo entry - so it is also the one place that can answer this
   without a flag at every call site. undo() counts too: putting a block back
   is still a board that no longer matches what was saved.

   Read by syncSave() (js/18-ui.js), which is what puts the dot on SAVE. */
var editDirty=false;
function snapshot(){
  editDirty=true;
  undoStack.push({b:custom.blocks.map(function(v){return v.slice();}),
                  s:custom.start.slice(),g:custom.goal.slice()});
  if(undoStack.length>60)undoStack.shift();
}
function undo(){
  if(!undoStack.length){flash("nothing to undo");return;}
  editDirty=true;
  var s=undoStack.pop();
  custom.blocks=s.b;custom.start=s.s;custom.goal=s.g;
  R=makeRules(custom);syncMeshes();
}
function kindOf(t){
  return t==="glass"?1:t==="anchor"?2:t==="crate"?3:t==="spike"?4:0;
}
function hasBlock(x,y,z){
  for(var i=0;i<custom.blocks.length;i++){
    var b=custom.blocks[i];
    if(b[0]===x&&b[1]===y&&b[2]===z)return i;
  }
  return -1;
}

function onCanvasTap(e){
  if(app!=="edit")return;
  e.preventDefault();
  hidePanel();
  var rect=renderer.domElement.getBoundingClientRect();
  ndc.x=((e.clientX-rect.left)/rect.width)*2-1;
  ndc.y=-((e.clientY-rect.top)/rect.height)*2+1;
  ray.setFromCamera(ndc,camera);

  var list=[];for(var k in meshes)list.push(meshes[k]);
  var hits=ray.intersectObjects(list,false);

  if(hits.length){
    var h=hits[0],b=h.object.userData.base;
    if(tool==="erase"){
      snapshot();
      var ky=-1,kl=custom.keys||[];
      for(var q=0;q<kl.length;q++)
        if(kl[q][0]===b[0]&&kl[q][1]===b[1]+1&&kl[q][2]===b[2])ky=q;
      if(ky>=0){custom.keys.splice(ky,1);}
      else{
        var i=hasBlock(b[0],b[1],b[2]);
        if(i>=0)custom.blocks.splice(i,1);
      }
    } else if(tool==="start"||tool==="goal"){
      snapshot();
      var p=[b[0],b[1]+1,b[2]];
      if(tool==="start")custom.start=p;else custom.goal=p;
    } else {
      var n=h.face.normal;
      var nx=b[0]+Math.round(n.x),ny=b[1]+Math.round(n.y),nz=b[2]+Math.round(n.z);
      if(tool==="key"){
        snapshot();
        custom.keys=custom.keys||[];
        if(!custom.keys.some(function(q){return q[0]===nx&&q[1]===ny&&q[2]===nz;}))
          custom.keys.push([nx,ny,nz]);
      } else if(hasBlock(nx,ny,nz)<0){
        snapshot();
        var kk=kindOf(tool);
        custom.blocks.push(kk?[nx,ny,nz,kk]:[nx,ny,nz]);
      }
    }
  } else {
    var gh=ray.intersectObject(groundPlane,false);
    if(!gh.length)return;
    if(tool==="key"){flash("tap a block face to place a key");return;}
    if(tool!=="add"&&tool!=="glass"&&tool!=="anchor"&&tool!=="crate"&&tool!=="spike"){
      flash("tap a block");return;}
    var gx=Math.round(gh[0].point.x),gz=Math.round(gh[0].point.z);
    if(hasBlock(gx,0,gz)<0){
      snapshot();
      var gk=kindOf(tool);
      custom.blocks.push(gk?[gx,0,gz,gk]:[gx,0,gz]);
    }
  }
  R=makeRules(custom);
  initDynamic();
  syncMeshes();syncHud();
}

var TOOL_IDS={add:"tAdd",glass:"tGlass",anchor:"tAnchor",crate:"tCrate",
              key:"tKey",spike:"tSpike",erase:"tErase",start:"tStart",
              goal:"tGoal"};
/* THE CHIP IS THE PIECE, AND IT IS THE PIECE AS THE WORLD DRAWS IT.

   The tool row used to be nine words in nine identical grey caps, which asks
   the player to remember that AMBER is the yellow one and CRATE is the violet
   one - a mapping the board already shows them. So each chip draws the thing
   it places.

   THE FIRST CUT DREW SIX COLOURED CUBES and that was the mistake: it took the
   legend's flat swatch colours (legendPanel(), js/16-panels.js), which are a
   key to a rule, and made pictures out of them. Nothing on the board looks
   like that. So these are read off the renderer instead - the colours are the
   same constants addMesh() and buildDynamic() use (js/10-render.js, and
   colGlass/colAnchor/colCrate/colSpike in js/09-wardrobe.js), and so are the
   forms:

     STONE  a case with a rim frame around its top, in colBlock.
     WATER  a full cell in colGlass, see-through, with the surface plate a
            little below the top and a bright cyan edge.
     AMBER  stone in colAnchor, and the one piece that still carries a symbol:
            a pale octahedron floating over it.
     CRATE  obsidian. A near-black body with violet fire in the cracks and a
            bright violet edge - "no mark: obsidian says crate on its own".
     FIRE   the lava crust, dark with orange veins, and the flames standing
            off the top of it, which is what says fire in silhouette.
     START  YOUR PIECE, small. It reads `wardrobe.shape`, so it is a cube for
            a cube and the Rook for a Rook, and it is in `--player`, so it is
            also your colour. Redrawn on every syncTools() for that reason -
            the shape can change between two visits to the editor.
     GOAL   the teal wireframe box goalMesh is, diagonals and all: it is drawn
            as a wireframe of a *triangulated* cube, which is why the real one
            looks scribbly rather than like a clean box.
     ERASE  an empty wire cube, the honest drawing of taking a block away.

   `--c` per chip is the piece's identifying colour and drives the rim, the
   lip and the lit state as well as the cube's three faces; the pieces whose
   body is not that colour (crate, fire) say so with a class. */
var ISO_TOP="M12 3.4 20.6 8.3 12 13.2 3.4 8.3Z";
var ISO_L  ="M3.4 8.3 12 13.2v7.4L3.4 15.7Z";
var ISO_R  ="M20.6 8.3 12 13.2v7.4l8.6-4.9Z";
function isoCube(cls,extra){
  return "<svg class='cu"+(cls?" "+cls:"")+"' viewBox='0 0 24 24' "+
    "aria-hidden='true'>"+
    "<path class='ft' d='"+ISO_TOP+"'/>"+
    "<path class='fl' d='"+ISO_L+"'/>"+
    "<path class='fr' d='"+ISO_R+"'/>"+(extra||"")+"</svg>";
}
var TOOL_ART={
  add:   {c:"#5a6d94"},
  glass: {c:"#62b8f0"},
  anchor:{c:"#d9a441"},
  crate: {c:"#c4b6e8"},
  key:   {c:"#f2d16b"},
  spike: {c:"#ff7a3c"},
  erase: {c:"#8c9dc4"},
  start: {c:"var(--player)"},
  goal:  {c:"var(--goal)"}
};
function toolArt(k){
  switch(k){
    /* The rim frame around the top of a stone block - the one thing that
       tells stone from every other full cell before a colour is read. */
    case "add":
      return isoCube("stone","<path class='rim' d='M12 5.9 17.6 9.1 12 12.3"+
        " 6.4 9.1Z'/>");
    /* The surface plate, a little below the top, which is how a liquid
       reads; and the bright edge the water block carries. */
    case "glass":
      return isoCube("water",
        "<path class='plate' d='M12 6.4 18.4 10 12 13.6 5.6 10Z'/>"+
        "<path class='wire' d='"+ISO_TOP+"'/>");
    case "anchor":
      return isoCube("amber",
        "<path class='mark' d='M12 .4 14.6 3.1 12 5.8 9.4 3.1Z'/>");
    /* Violet fire in the cracks, and the edge that lights with it. */
    case "crate":
      return isoCube("obsid",
        "<path class='vein' d='M5.4 11.3 8.7 16.5M8.6 12.6 10.5 18.7M18.7"+
        " 11.1 15.1 17.3M9.2 7.9 13 9.7'/>"+
        "<path class='wire' d='"+ISO_TOP+"'/><path class='wire' d='"+ISO_L+
        "'/><path class='wire' d='"+ISO_R+"'/>");
    /* Four flames standing OFF the top of the block, with a gap - the
       arrangement the world uses because it is the one that survives a
       silhouette. */
    case "spike":
      return isoCube("lava",
        "<path class='vein' d='M6.6 10.3 10.8 12.6M13.4 14.4 19.4 11.1'/>"+
        "<g class='flame'>"+
          "<path d='M8.1 6.3c0-1.5 1.5-2.1 1.1-3.6 1.5.9 2 2.2 2 3.2 0 1.1-.7"+
            " 1.9-1.6 1.9s-1.5-.7-1.5-1.5Z'/>"+
          "<path d='M12.4 4.6c0-1.7 1.6-2.4 1.2-4.1 1.7 1 2.2 2.5 2.2 3.7 0"+
            " 1.2-.8 2.1-1.8 2.1s-1.6-.8-1.6-1.7Z'/>"+
        "</g>");
    /* An octahedron, which is the geometry a key actually is - four of its
       eight faces are ever in view. */
    case "key":
      return "<svg class='cu' viewBox='0 0 24 24' aria-hidden='true'>"+
        "<path class='ft' d='M12 2.6 3.6 12 12 15.4Z'/>"+
        "<path class='fr' d='M12 2.6 20.4 12 12 15.4Z'/>"+
        "<path class='fl' d='M12 21.4 3.6 12 12 15.4Z'/>"+
        "<path class='fb' d='M12 21.4 20.4 12 12 15.4Z'/></svg>";
    /* THE PIECE YOU ARE WEARING. shapeGlyph() is the wardrobe's own drawing
       of a shape, so the chip and the tile in the shop cannot disagree about
       what a Rook looks like; the plain cube is drawn as the block it is,
       because a filled square is not what is standing on the board. */
    case "start":
      var sh=(typeof wardrobe!=="undefined"&&wardrobe.shape)||"cube";
      if(sh==="cube"||typeof shapeGlyph!=="function")return isoCube("me");
      return "<span class='cu me pglyph'>"+shapeGlyph(sh)+"</span>";
    /* A wireframe of a triangulated box: nine edges and the two face
       diagonals that are actually visible on one. */
    case "goal":
      return "<svg class='cu goalw' viewBox='0 0 24 24' aria-hidden='true'>"+
        "<path d='M12 3.4 20.6 8.3 12 13.2 3.4 8.3ZM3.4 8.3 12 13.2v7.4"+
        "L3.4 15.7ZM20.6 8.3 12 13.2v7.4l8.6-4.9Z'/>"+
        "<path d='M3.4 8.3 12 13.2M12 3.4 12 13.2M3.4 8.3 12 20.6"+
        "M20.6 8.3 12 20.6'/></svg>";
    default:
      return "<svg class='cu wire' viewBox='0 0 24 24' aria-hidden='true'>"+
        "<path d='"+ISO_TOP+"'/><path d='"+ISO_L+"'/><path d='"+ISO_R+"'/>"+
        "</svg>";
  }
}
/* Drawn once and then left alone, because the chips are static markup in
   index.html that syncTools() only ever shows and hides - except START,
   which is whatever piece you are wearing and so is rebuilt every time. */
/* WHICH PIECE EACH CHIP IS A PORTRAIT OF. The block kinds are the level
   format's own numbers ([x,y,z,k] in js/02-levels.js); the two that are not
   blocks are named. ERASE has no entry because there is no such piece in the
   world - it keeps the wire cube, which is a diagram and is meant to be. */
var TOOL_PIECE={add:0,glass:1,anchor:2,crate:3,spike:4,start:"start",goal:"goal"};
/* THE CHIP IS A PHOTOGRAPH OF THE PIECE, and the SVG above is what it falls
   back to.

   pieceShot() (js/10-render.js) builds the real mesh and renders one frame of
   it into an offscreen target - so SOLID is the section's actual surface,
   CRATE has the violet in its cracks, FIRE has its flames and START is the
   shape and colour you are wearing. The drawings stay for the two cases the
   camera cannot serve: ERASE, which is not a piece, and a renderer that is
   not up yet (the editor can be reached before the first frame on a slow
   start, and a chip with nothing in it is worse than a diagram of one). */
function chipArt(k){
  if(TOOL_PIECE.hasOwnProperty(k)&&typeof pieceShot==="function"){
    var url=pieceShot(TOOL_PIECE[k]);
    if(url)return "<img class='cu shot' src='"+url+"' alt='' aria-hidden='true'>";
  }
  return toolArt(k);
}
/* Drawn once and then left alone - the chips are static markup in index.html
   that syncTools() only ever shows and hides - except START, which is a
   portrait of whatever piece you are wearing and so is taken again on every
   visit. The rest are re-taken when the ground changes, because pieceShot()
   keys its cache on the section's surface and a miss simply shoots again. */
function drawToolChips(){
  for(var k in TOOL_IDS){
    var el=$(TOOL_IDS[k]);
    if(!el)continue;
    var a=TOOL_ART[k]||{}, label=el.getAttribute("data-label");
    if(!label){label=el.textContent.trim();el.setAttribute("data-label",label);}
    var art=chipArt(k);
    if(el.getAttribute("data-art")===art)continue;
    el.setAttribute("data-art",art);
    if(a.c)el.style.setProperty("--c",a.c);
    el.innerHTML=art+"<i>"+label+"</i>";
  }
}
function setTool(t){
  tool=t;
  for(var k in TOOL_IDS)$(TOOL_IDS[k]).classList.toggle("sel",k===t);
}
/* HOW FAR THE CAMPAIGN HAS ACTUALLY TAKEN YOU, as a level index. mapReach()
   is the map's own answer to that - the furthest node the rolling window
   opens - so the editor and the map cannot disagree about what you have
   been shown. Clamped, because mapReach() deliberately reaches one window
   past the last level. */
function seenIndex(){
  var n=(typeof mapReach==="function")?mapReach():LEVELS.length;
  return Math.max(0,Math.min(n,LEVELS.length-1));
}
/* WHICH PIECES YOU MAY BUILD WITH: the ones the campaign has put in front of
   you, and nothing else.

   The editor used to open with all five, which is a piece list as a spoiler
   - fire, water and the crate are each a section's one lesson, and being
   handed them in the editor before meeting them is being told the answer to
   a level you have not reached. The four that are not pieces (erase, start,
   goal, and stone, which every level is made of) are always there.

   Read off the levels themselves rather than from a table of which section
   teaches what, so inserting a level that uses a piece earlier moves the
   unlock with it and there is no second list to keep in step. */
function seenTools(){
  var out={add:true,erase:true,start:true,goal:true},reach=seenIndex();
  for(var i=0;i<=reach;i++){
    var b=LEVELS[i].blocks||[];
    for(var j=0;j<b.length;j++){
      var k=b[j][3]||0;
      if(k===1)out.glass=true;else if(k===2)out.anchor=true;
      else if(k===3)out.crate=true;else if(k===4)out.spike=true;
    }
    if((LEVELS[i].keys||[]).length)out.key=true;
  }
  return out;
}
// A chip for a piece you have not met is not drawn at all, rather than drawn
// disabled: a greyed-out row of five is the same spoiler with a lock on it.
function syncTools(){
  var seen=seenTools();
  drawToolChips();
  for(var k in TOOL_IDS){
    var el=$(TOOL_IDS[k]);
    if(el)el.style.display=seen[k]?"":"none";
  }
  if(!seen[tool])setTool("add");
}

function validate(){
  if(!custom.blocks.length)return "Place some blocks first.";
  if(!R.solid(custom.start[0],custom.start[1]-1,custom.start[2]))
    return "The start isn't standing on anything.";
  if(R.solid(custom.start[0],custom.start[1],custom.start[2]))
    return "The start is inside a block.";
  if(!R.solid(custom.goal[0],custom.goal[1]-1,custom.goal[2]))
    return "The goal isn't standing on anything.";
  if(R.solid(custom.goal[0],custom.goal[1],custom.goal[2]))
    return "The goal is inside a block.";
  if(custom.start.join()===custom.goal.join())
    return "The start and the goal are the same square.";
  return null;
}

function runVerify(){
  ghosted.clear();
  var bad=validate();
  if(bad){showPanel("<h3>VERIFY</h3><span class='bad'>"+bad+"</span>");return;}
  showPanel("<h3>VERIFY</h3>Searching\u2026");
  setTimeout(function(){
    var full=solve(custom,true);
    var html="<h3>VERIFY</h3>";
    if(full.status==="toobig"){
      html+="<span class='warn'>Too large to search exhaustively.</span><br>"+
            "Tighten the layout \u2014 fewer reachable squares.";
      showPanel(html);return;
    }
    if(full.status==="impossible"){
      html+="<span class='bad'>No solution exists.</span><br>"+
            "The solver explored every reachable state and never arrived.";
      showPanel(html);return;
    }
    var st=statsFor(custom);
    html+="<span class='ok'>Solvable in "+st.moves+" moves.</span><br>"+
          "<span class='mono'>"+st.path+"</span><br><br>"+
          "Needs rotation: "+(st.needsRot?"<b>yes</b>":"no")+
          " &middot; flattens: "+st.flattens+"<br>"+
          "Difficulty: <b>"+tierOf(st.score)+"</b> (score "+st.score+")<br>";
    if(st.moves<=3)
      html+="<span class='warn'>Solvable in "+st.moves+
            " moves \u2014 the depth-collapse is skipping your puzzle.</span>";
    html+="<div class='prow'>"+
      "<button id='pMin'>MINIMIZE</button>"+
      "<button id='pSave'>SAVE</button>"+
      "<button id='pClose'>CLOSE</button></div>";
    showPanel(html);
    bind("pMin",runMinimize);
    bind("pSave",saveDialog);
    bind("pClose",hidePanel);
  },30);
}

function runMinimize(){
  var bad=validate();
  if(bad){showPanel("<h3>MINIMIZE</h3><span class='bad'>"+bad+"</span>");return;}
  showPanel("<h3>MINIMIZE</h3>Stripping blocks\u2026");
  setTimeout(function(){
    var core=minimize(custom);
    ghosted.clear();
    var inert=0;
    for(var i=0;i<custom.blocks.length;i++){
      var b=custom.blocks[i],k=K(b[0],b[1],b[2]);
      if(!core.has(k)){ghosted.add(k);inert++;}
    }
    var html="<h3>MINIMIZE</h3>";
    if(inert===0){
      html+="<span class='ok'>Every block is load-bearing.</span><br>"+
            "Nothing here is decoration.";
    } else {
      html+="<span class='warn'>"+core.size+" of "+custom.blocks.length+
            " blocks carry the puzzle.</span><br>"+
            "The other "+inert+" are dimmed in the view. Remove one and the level "+
            "still solves. Keep them as scenery or red herrings if that's the "+
            "intent \u2014 just know they aren't doing puzzle work.";
    }
    html+="<div class='prow'><button id='pUnghost'>CLEAR</button>"+
          "<button id='pClose2'>CLOSE</button></div>";
    showPanel(html);
    bind("pUnghost",function(){ghosted.clear();hidePanel();});
    bind("pClose2",hidePanel);
  },30);
}

/* SAVE KEEPS WHAT IS ON THE BOARD, solvable or not.

   The only way to save used to be VERIFY then SAVE, and VERIFY refuses
   anything the solver cannot finish - so a half-built level could not be
   kept at all, and closing the game threw the evening away. A level is now
   created named (see newLevelPanel()) and this writes into that entry, which
   is why it does not ask for a name: the name is what the row on MY LEVELS
   already is.

   The numbers are still taken when they can be. statsFor() runs the solver,
   so it is asked only once the level is at least well-formed - validate()
   first, and a null score is what a draft looks like everywhere that reads
   one. */
function saveCurrent(){
  if(!custom.blocks.length){flash("place some blocks first");return;}
  var st=validate()?{ok:false}:statsFor(custom);
  var e=findLevel(editingId);
  if(!e){
    e={id:"l"+Date.now(),name:custom.name||"Untitled"};
    library.push(e);editingId=e.id;
  }
  e.name=custom.name||e.name;
  e.blocks=custom.blocks.map(function(v){return v.slice();});
  e.keys=(custom.keys||[]).map(function(v){return v.slice();});
  e.start=custom.start.slice();e.goal=custom.goal.slice();
  e.rotate=custom.rotate!==false;
  e.theme=(custom.theme==null?null:custom.theme);
  e.score=st.ok?st.score:null;e.moves=st.ok?st.moves:null;
  e.needsRot=!!st.needsRot;e.flattens=st.flattens||0;
  libSave().then(function(){
    editDirty=false;
    if(typeof syncSave==="function")syncSave();
    flash(st.ok?"saved \u2014 solves in "+st.moves+" moves":"saved \u2014 draft");
  });
}

/* VERIFY's own SAVE. It asks for a name only when the level does not have
   one yet - work started from the composer or pasted in over the editor -
   and then hands over to saveCurrent(), so there is one writer into the
   library and not two with different rules about what may be saved. */
function saveDialog(){
  if(editingId&&findLevel(editingId)){saveCurrent();hidePanel();return;}
  showPanel("<h3>SAVE TO MY LEVELS</h3>"+
    "<input id='nm' placeholder='level name' />"+
    "<div class='prow'><button id='pDo'>SAVE</button>"+
    "<button id='pClose3'>CANCEL</button></div>");
  $("nm").value=custom.name==="Untitled"?"":custom.name;
  bind("pDo",function(){
    var nm=($("nm").value||"").trim();
    if(!nm){flash("give it a name first");return;}
    custom.name=nm;editingId=null;
    saveCurrent();hidePanel();
  });
  bind("pClose3",hidePanel);
}

// A hint solved from the start is useless once you've moved. This solves from
// wherever you actually are, then just lights up the button to press. No
// reading, no spoiler beyond the single next move.
function currentState(){
  var cr=gCrates.map(function(c){return K(c[0],c[1],c[2]);}).sort();
  if(flat)
    return {mode:"2",u:flatPos.u,y:flatPos.y,view:view,crates:cr,keys:gKeys};
  return {mode:"3",x:player.x,y:player.y,z:player.z,view:view,crates:cr,keys:gKeys};
}
var cueTimer=null, hintsUsed=0;
