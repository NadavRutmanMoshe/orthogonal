"use strict";
/* Orthogonal — 14-editor.js
   Tap-to-place level editor and its verify/minimize tools.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   EDITOR
   ============================================================ */
var ray=new THREE.Raycaster(),ndc=new THREE.Vector2();

/* THERE IS NO SAVE BUTTON. THE BOARD IS THE SAVE.

   It was a green pill in the top-right corner with an amber dot on it while
   there were edits the library had not been told about, and that is a
   reminder to do something a computer can do by itself - the one control on
   the screen that decides whether an hour of building still exists tomorrow,
   left to somebody who is thinking about a puzzle. Every edit now writes.

   snapshot() is the one funnel every board change goes through - it is what
   pushes the undo entry - so it is the one place that has to ask for a save,
   and undo() counts too: putting a block back is still a change to keep.

   `editDirty` is what is left of the dot: not a badge any more, just "there
   is a write owed", read by flushSave() and cleared by the write. */
var editDirty=false;
function snapshot(){
  editDirty=true;
  undoStack.push({b:custom.blocks.map(function(v){return v.slice();}),
                  s:custom.start.slice(),g:custom.goal.slice()});
  if(undoStack.length>60)undoStack.shift();
  autosave();
}
function undo(){
  if(!undoStack.length){flash("nothing to undo");return;}
  editDirty=true;
  var s=undoStack.pop();
  custom.blocks=s.b;custom.start=s.s;custom.goal=s.g;
  R=makeRules(custom);syncMeshes();
  autosave();
}

/* TWO TIMERS, BECAUSE THE TWO HALVES OF A SAVE COST DIFFERENT THINGS.

   Writing the board is a JSON string into storage: cheap, so it happens
   almost at once (SAVE_MS), just late enough to coalesce the taps of somebody
   dragging out a wall into one write.

   The numbers are not cheap. statsFor() runs the solver twice - with rotation
   and without - and the cap is 400k states, so it is not something to do
   between two taps of a block. It runs when the hand stops (SCORE_MS), and
   until it does the entry carries a null score, which is what a draft looks
   like everywhere that reads one. So a level is never unsaved; it is at worst
   briefly unscored.

   Both timers read the state as it settles rather than as it was scheduled,
   which is what makes the funnel safe: loadIntoEditor() swaps the board out
   from under a pending write, and saveCancel() there is what stops the
   outgoing board being written into the incoming level's entry. */
var SAVE_MS=140, SCORE_MS=1100;
var saveHold=null, scoreHold=null, saidSaved=false;
function autosave(){
  if(saveHold)clearTimeout(saveHold);
  if(scoreHold)clearTimeout(scoreHold);
  saveHold=setTimeout(flushSave,SAVE_MS);
  scoreHold=setTimeout(rescore,SCORE_MS);
}
function saveCancel(){
  if(saveHold)clearTimeout(saveHold);
  if(scoreHold)clearTimeout(scoreHold);
  saveHold=scoreHold=null;editDirty=false;
}
function flushSave(){
  saveHold=null;
  if(!editDirty)return;
  saveCurrent({stats:false});
}
/* WRITE THE OWED EDIT NOW. 140ms is nothing to a player and everything to a
   screen about to be drawn from the library, or a tab about to close: MY
   LEVELS would list a level one block behind, and a phone put in a pocket
   would keep the last tap in a timer that never fires. Called on the way out
   of the editor and on pagehide. Cheap and idempotent - editDirty is false
   when there is nothing owed. */
function saveNow(){
  if(saveHold){clearTimeout(saveHold);saveHold=null;}
  flushSave();
}
/* The solver, once the hand has stopped. It writes through the same one
   writer, so a re-score is an ordinary save that happens to know the
   numbers - there is still nothing else that touches the library entry. */
function rescore(){
  scoreHold=null;
  if(custom.blocks.length)saveCurrent();
}
function kindOf(t){
  return t==="glass"?1:t==="anchor"?2:t==="crate"?3:t==="spike"?4:0;
}
/* WHICH CELL A TAPPED MESH IS. A static block carries `base` (addMesh), a
   crate carries `cell` (buildDynamic); the position is the last resort and
   is right for anything standing on its own cell. */
function hitCell(o){
  var u=o.userData||{};
  if(u.base)return u.base;
  if(u.cell)return u.cell;
  return [Math.round(o.position.x),Math.round(o.position.y),
          Math.round(o.position.z)];
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

  /* A CRATE IS A BLOCK YOU CAN TAP. It is drawn by buildDynamic() rather
     than by syncMeshes() - it is the one piece with state, so in play it
     moves and the static `meshes` table cannot hold it - and this list was
     `meshes` alone. So the ray went straight through every crate on the
     board: you could not erase one, you could not stand the start on one,
     and you could not put a block on top of one. Placed and then permanent.

     crateMeshes is that list, in gCrates order, and buildDynamic() writes
     each one's cell into userData.cell (the same way it does for a key), so
     hitCell() has an answer for both kinds without the editor having to know
     which table the mesh came out of. */
  var list=[];for(var k in meshes)list.push(meshes[k]);
  if(typeof crateMeshes!=="undefined")list=list.concat(crateMeshes);
  var hits=ray.intersectObjects(list,false);

  if(hits.length){
    var h=hits[0],b=hitCell(h.object);
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

/* IS THIS WELL-FORMED ENOUGH TO BE WORTH THE SOLVER? `rules` defaults to R,
   which in the editor is custom's own - but a save can now be asked for from
   outside the editor (rescore() lands after a composed build, or after TEST
   has started playing the board), and there R belongs to whatever is being
   played. makeRules() is a pass over the block list, so a caller that cannot
   be sure hands one in rather than trusting the ambient one. */
function validate(rules){
  var rr=rules||R;
  if(!custom.blocks.length)return "Place some blocks first.";
  /* A CRATE IS SOMETHING TO STAND ON. makeRules() leaves crates out of its
     block set on purpose - they are the one piece with state, so every world
     query takes the live crate list as its fourth argument - and this asked
     without one, so a start or a goal placed on a crate was reported as
     standing on nothing and the level was a draft that could not be scored.
     The crates as the level stores them are the right list here: an unplayed
     board is one where nothing has been shoved yet. */
  var cr=crateSet(crateKeys(custom));
  if(!rr.solid(custom.start[0],custom.start[1]-1,custom.start[2],cr))
    return "The start isn't standing on anything.";
  if(rr.solid(custom.start[0],custom.start[1],custom.start[2],cr))
    return "The start is inside a block.";
  if(!rr.solid(custom.goal[0],custom.goal[1]-1,custom.goal[2],cr))
    return "The goal isn't standing on anything.";
  if(rr.solid(custom.goal[0],custom.goal[1],custom.goal[2],cr))
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
    // No SAVE here any more: the board has been in the library since you
    // laid it. VERIFY is advice, and this is what it advises.
    html+="<div class='prow'>"+
      "<button id='pMin'>MINIMIZE</button>"+
      "<button id='pClose'>CLOSE</button></div>";
    showPanel(html);
    bind("pMin",runMinimize);
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

/* THE ONE WRITER INTO THE LIBRARY, and it keeps what is on the board,
   solvable or not.

   The only way to save used to be VERIFY then SAVE, and VERIFY refuses
   anything the solver cannot finish - so a half-built level could not be
   kept at all, and closing the game threw the evening away. Then it was a
   corner button, which kept the drafts but still asked to be pressed. A
   level is created named (see newLevelPanel()) and every edit writes into
   that entry, which is why nothing here asks for a name: the name is what
   the row on MY LEVELS already is.

   `opt.stats` false is the cheap write - the board, none of the numbers -
   which is what an edit gets; rescore() comes back with the solver a moment
   later. Nothing here says so out loud: a toast on every tap is not
   reassurance, it is weather. */
function saveCurrent(opt){
  opt=opt||{};
  if(!custom.blocks.length)return;      // an empty board is not a level yet
  var st=(opt.stats===false)?{ok:false}
        :(validate(makeRules(custom))?{ok:false}:statsFor(custom));
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
  editDirty=false;
  libSave().then(function(){
    /* SAID ONCE PER VISIT TO THE EDITOR. Somebody who has used the game
       before is looking for the button they remember; being told, at the
       moment the first block lands, that they will not need it is the whole
       of what has to be explained. Saying it again on the second block would
       be nagging about good news. */
    if(!saidSaved){saidSaved=true;flash("saved \u2014 this level keeps itself");}
  });
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
