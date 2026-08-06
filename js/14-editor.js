"use strict";
/* Orthogonal — 14-editor.js
   Tap-to-place level editor and its verify/minimize tools.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   EDITOR
   ============================================================ */
var ray=new THREE.Raycaster(),ndc=new THREE.Vector2();

function snapshot(){
  undoStack.push({b:custom.blocks.map(function(v){return v.slice();}),
                  s:custom.start.slice(),g:custom.goal.slice()});
  if(undoStack.length>60)undoStack.shift();
}
function undo(){
  if(!undoStack.length){flash("nothing to undo");return;}
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

function setTool(t){
  tool=t;
  var ids={add:"tAdd",glass:"tGlass",anchor:"tAnchor",crate:"tCrate",key:"tKey",
           spike:"tSpike",erase:"tErase",start:"tStart",goal:"tGoal"};
  for(var k in ids)$(ids[k]).classList.toggle("sel",k===t);
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

function saveDialog(){
  showPanel("<h3>SAVE TO LIBRARY</h3>"+
    "<input id='nm' placeholder='level name' />"+
    "<div class='prow'><button id='pDo'>SAVE</button>"+
    "<button id='pClose3'>CANCEL</button></div>");
  $("nm").value=custom.name==="Untitled"?"":custom.name;
  bind("pDo",function(){
    var st=statsFor(custom);
    if(!st.ok){flash("solve it before saving");return;}
    var nm=($("nm").value||"").trim()||("Level "+(library.length+1));
    custom.name=nm;
    library.push({
      id:"l"+Date.now(),name:nm,
      blocks:custom.blocks.map(function(v){return v.slice();}),
      keys:(custom.keys||[]).map(function(v){return v.slice();}),
      start:custom.start.slice(),goal:custom.goal.slice(),
      rotate:custom.rotate!==false,
      score:st.score,moves:st.moves,needsRot:st.needsRot,flattens:st.flattens
    });
    libSave().then(function(){hidePanel();flash("saved \u2014 "+library.length+" in library");});
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
