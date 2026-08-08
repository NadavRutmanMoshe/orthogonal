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
  // Both of these replace or hide whatever was in the panel, which for the
  // wardrobe includes a live WebGL canvas. Stopping it here rather than at
  // each call site means no path can leave a context running against a
  // canvas that is no longer in the document.
  previewStop();
  $("panel").innerHTML=html;
  $("panel").classList.add("on");
  $("panel").classList.toggle("ward",kind==="wardrobe");
  panelKind=kind||null;
  syncCorners();
}
function hidePanel(){
  previewStop();
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
  $("starTotal").classList.toggle("on",inPlay);
  syncStarTotal();
  syncBossBar();

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
  // The button carries the warning as well as the world does, because the
  // block that will crush you can easily be off-screen or behind something.
  // Marked, never disabled: folding into a wall stays a legal way to die.
  var pf=(typeof foldPeril==="function")?foldPeril():null;
  var strike=(typeof bossCrushable==="function")&&bossCrushable();
  $("bFlat").classList.toggle("peril",!!pf);
  // A fold that would land a hit is worth saying out loud, and it can be true
  // at the same time as peril - the boss's column being blocked says nothing
  // about yours. Peril wins the colour, because dying costs more than a
  // missed hit; the label still tells you the hit is there.
  $("bFlat").classList.toggle("strike",!!strike&&!pf);
  $("bFlat").title=pf?(pf.kind==="crush"
    ?"something already fills that square in the plane"
    :pf.kind==="boss"
    ?"it is not open - folding into it now kills you"
    :"a spike folds into the square under you")
    :(strike?"it is open: fold now":"");
  $("bUp").disabled=flat;$("bDown").disabled=flat;
  var noRot=flat||(app==="play"&&L&&L.rotate===false);
  $("bRotL").disabled=noRot;$("bRotR").disabled=noRot;
  if(app==="play"&&L&&L.tutorial){
    // No par, no stars: this level is teaching, not marking.
    $("moveLabel").innerHTML="<b>"+moveCount+"</b> moves";
  } else if(app==="play"&&(B||TR)){
    // On a clock: the score is the row of lives at the top of the screen, so
    // showing three stars beside a move count here would be a second, wrong
    // answer to the same question.
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

/* ============================================================
   THE STAR TOTAL, AND STARS IN FLIGHT

   The counter shows stars *earned*, not stars left to spend. They are
   different numbers - the wardrobe's balance goes down when you buy
   something, and a total that fell after a purchase would make the flight
   from the win screen read as a transaction rather than an achievement.
   The wardrobe labels its own number "TO SPEND" to keep them apart.
   ============================================================ */
/* Lives above, cores below. Both are dots rather than numbers because they
   are glanced at mid-move, and a boss level's whole score is "how many of
   these did you keep" - three intact lives is three stars. */
function syncBossBar(){
  var bar=$("bossBar");
  if(!bar)return;
  // A trial spends the same lives and shows the same dots; it just has no
  // cores to break, so the lower row is simply empty there.
  var on=!!((B||TR)&&app==="play");
  bar.classList.toggle("on",on);
  if(!on)return;
  var lv="",co="";
  for(var i=0;i<BOSS_LIVES;i++)lv+="<i class='"+(i<lives?"":"gone")+"'></i>";
  if(B)for(var j=0;j<B.hp;j++)co+="<i class='"+(j<bossHp?"":"gone")+"'></i>";
  $("bossLives").innerHTML=lv;
  $("bossCores").innerHTML=co;
}
function syncStarTotal(){
  var n=$("starTotalN");
  if(n)n.textContent=starsEarned();
}
function starPop(){
  var t=$("starTotal");
  if(!t)return;
  t.classList.remove("pop");
  void t.offsetWidth;          // restart the transition rather than extend it
  t.classList.add("pop");
  setTimeout(function(){t.classList.remove("pop");},190);
}
/* Fly `gained` stars from the win screen to the counter, ticking it up by one
   as each lands. `base` is the total before the win, so the number is driven
   by arrivals rather than read from starsEarned() - the flight is the whole
   point, and a counter that jumped to its final value on the first frame
   would give the answer away before the first star got there. */
function flyStars(srcEls,base,gained){
  var tgt=$("starTotal");
  var reduce=window.matchMedia&&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(!tgt||!gained||reduce||!srcEls.length){syncStarTotal();return;}
  var tb=tgt.getBoundingClientRect();
  var tx=tb.left+tb.width/2, ty=tb.top+tb.height/2;
  srcEls.forEach(function(src,i){
    setTimeout(function(){
      var r=src.getBoundingClientRect();
      var sx=r.left+r.width/2, sy=r.top+r.height/2;
      src.classList.add("launch");
      setTimeout(function(){src.classList.remove("launch");},220);

      var el=document.createElement("div");
      el.className="flystar";
      el.style.left=sx+"px";el.style.top=sy+"px";
      el.style.transform="translate(-50%,-50%)";
      var g=document.createElement("i");
      g.textContent="★";
      el.appendChild(g);
      document.body.appendChild(el);
      void el.offsetWidth;      // give the transition a start value to leave

      el.style.transform="translate(-50%,-50%) translateX("+(tx-sx)+"px)";
      g.style.transform="translateY("+(ty-sy)+"px) scale(.62)";
      g.style.opacity=".85";

      setTimeout(function(){
        el.remove();
        var n=$("starTotalN");
        if(n)n.textContent=base+i+1;
        starPop();
        SFX.star(i);
      },620);
    },i*180);
  });
}

function tap(el,fn){
  if(!el)return;
  el.addEventListener("pointerdown",function(e){
    if(el.disabled)return;e.preventDefault();e.stopPropagation();fn();
  });
  el.addEventListener("click",function(e){e.preventDefault();});
}
function bind(id,fn){tap($(id),fn);}
