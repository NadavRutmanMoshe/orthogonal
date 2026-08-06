"use strict";
/* Orthogonal — 18-ui.js
   Toasts, panel plumbing, and syncHud.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   UI
   ============================================================ */
var $=function(id){return document.getElementById(id);};
var toastTimer=null;
function flash(m){
  var t=$("toast");t.textContent=m;t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.classList.remove("on");},1100);
}
var panelKind=null;
function showPanel(html,kind){
  $("panel").innerHTML=html;
  $("panel").classList.add("on");
  panelKind=kind||null;
  syncCorners();
}
function hidePanel(){
  $("panel").classList.remove("on");
  panelKind=null;
  syncCorners();
}
function panelOpen(){return $("panel").classList.contains("on");}
function syncCorners(){
  var m=$("bMenu"), w=$("bWard");
  if(m)m.classList.toggle("on",panelKind==="menu");
  if(w)w.classList.toggle("on",panelKind==="wardrobe");
}
function toggleMenu(){
  if(panelKind==="menu"){hidePanel();return;}
  menuPanel();
}
function toggleWardrobe(){
  if(panelKind==="wardrobe"){hidePanel();return;}
  wardrobePanel("shape");
}

function syncHud(){
  document.body.classList.toggle("flat",flat);
  document.body.classList.toggle("tut",!!(app==="play"&&L&&L.tut));
  var inPlay=app==="play";
  ["bHint","bLook","bMenu","bWard","bRestart"].forEach(function(id){
    var el=$(id); if(el)el.style.display=inPlay?"flex":"none";
  });

  if(app==="edit"){
    $("lvName").textContent="EDITOR";
    $("lvHint").textContent=
      tool==="glass"  ? "Glass is solid to stand on but vanishes when the world flattens." :
      tool==="anchor" ? "An anchor claims you when you unfold, overriding the nearest-camera rule." :
      tool==="crate"  ? "Crates can be shoved in the volume, which changes what the plane looks like. A crate resting on an anchor is stuck for good." :
      tool==="key"    ? "Keys are collected in the plane, on the square they fold into." :
      tool==="spike"  ? "Spikes cast like stone but kill you underfoot \u2014 so they poison the whole silhouette column." :
      "Tap the ground to start. Tap a block face to build off it.";
    $("lvHint").className="hint";
  }
  if(app==="compose"){
    var flatNow=composeMode==="2";
    $("lvName").textContent="COMPOSE — "+script.length+" MOVE"+(script.length===1?"":"S");
    $("lvHint").className="script";
    $("lvHint").textContent=script.length?script.join(" "):
      "Tap the moves you want the player to make. The level builds itself underneath.";
    $("cU").disabled=flatNow;$("cD").disabled=flatNow;
    $("cRotL").disabled=flatNow;$("cRotR").disabled=flatNow;
    $("cFlat").disabled=flatNow;$("cPop").disabled=!flatNow;
  }
  $("bFlat").textContent=flat?VB().to3:VB().to2;
  $("bFlat").disabled=!canShift();
  $("bUp").disabled=flat;$("bDown").disabled=flat;
  var noRot=flat||(app==="play"&&L&&L.rotate===false);
  $("bRotL").disabled=noRot;$("bRotR").disabled=noRot;
  if(app==="play"&&L&&L.tutorial){
    // No par, no stars: this level is teaching, not marking.
    $("moveLabel").innerHTML="<b>"+moveCount+"</b> moves";
  } else if(app==="play"){
    var ml=levelPar!==null ? "<b>"+moveCount+"</b> / "+levelPar
                           : "<b>"+moveCount+"</b>";
    var st=(levelPar===null||moveCount===0)?3:starsFor(moveCount,levelPar);
    st=Math.min(st,hintCap());
    $("moveLabel").innerHTML=ml+"<div class='stars'>"+starGlyphs(st)+"</div>";
  } else $("moveLabel").innerHTML="";
  tutSync();
}

function tap(el,fn){
  if(!el)return;
  el.addEventListener("pointerdown",function(e){
    if(el.disabled)return;e.preventDefault();e.stopPropagation();fn();
  });
  el.addEventListener("click",function(e){e.preventDefault();});
}
function bind(id,fn){tap($(id),fn);}
