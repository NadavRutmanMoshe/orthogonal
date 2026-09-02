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
  var t=$("toast");
  t.classList.remove("cuesay");t.classList.remove("noteonly");
  t.textContent=m;t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.classList.remove("on");},1100);
}
/* A spoken cue, for when the control it names is not on screen.

   It shares the toast element - there is only one, and two would fight over
   the same moment - but it is not the same kind of message and does not look
   like one. A toast is an aside in the player colour at the top of the
   screen; this is an instruction, so it takes the goal colour the cue pulse
   already uses (green means "do this" throughout the game), it sits down by
   the controls where the player's attention and thumb already are rather
   than under the level title where it collided with the hint text, and the
   move gets a line of its own with the accounting quiet underneath. It also
   lingers longer: reading three words costs more than glancing at a button
   that is already flashing.  */
/* The cue slot: green, down by the controls, and it lingers longer than a
   toast because reading three words costs more than glancing at a button
   that is already flashing.

   `move` may be null, and that case is the ghost hand's. When the hand is
   showing the move there is nothing left to say about it - but the hint
   accounting still has to go somewhere, and the top of the screen is not it:
   the toast's ordinary position lands straight across the level's own hint
   text, which is the bug this slot was made to fix in the first place. So a
   note with no move is the accounting alone, in the slot that is already
   clear of everything. */
function flashCue(move,note){
  var t=$("toast");
  t.innerHTML=(move?"<b>"+move+"</b>":"")+(note?"<i>"+note+"</i>":"");
  t.classList.add("cuesay");t.classList.toggle("noteonly",!move);
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.classList.remove("on");},1700);
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
/* The map is nearly full height, and the running star total lives outside
   .corner at z-index 30 so it can sit *over* the win overlay. That puts it
   over the map too, on top of the map's own total - so the one place that
   already knows which panel is open turns it off. */
function syncMapChrome(){
  $("panel").classList.toggle("map",panelKind==="map");
  // Full-height panels: the map, and the menu now that it is grouped into
  // cards and would otherwise scroll inside a 44vh window.
  $("panel").classList.toggle("tall",panelKind==="map"||panelKind==="menu"||
                                     panelKind==="wardrobe");
  /* The running star total sits at z-index 30 so it can float over the win
     overlay, which also floats it over any open panel - and the menu, the
     wardrobe and the map all now carry a total of their own in their header.
     A panel covers the world anyway, so the corner count has nothing to do
     while one is up. */
  document.body.classList.toggle("mapopen",!!panelKind);
  // The ambient loop lives and dies with the panel, so it can never be left
  // running behind a level - least of all behind one on a clock.
  if(typeof mapBgStart==="function"){
    if(panelKind==="map")mapBgStart(); else mapBgStop();
  }
}
function hidePanel(){
  previewStop();
  $("panel").classList.remove("on");
  panelKind=null;
  syncCorners();
  /* The home screen's stand is the same singleton the wardrobe's display case
     is, so showPanel() tore it down on the way in - which is right, it was
     behind an opaque panel. Put it back on the way out, or closing the map
     over the home screen leaves an empty plinth. The sync goes with it: you
     may have just bought and equipped something in the wardrobe, and the
     strip and the plinth both have to know. */
  if(homeUp()){homeSync();homeCase();}
}
function panelOpen(){return $("panel").classList.contains("on");}
/* Is a full-bleed screen standing in front of the game?

   The intro card and the home screen both cover the world, and both swallow
   taps simply by being there - but a keyboard does not care what is on top,
   and neither does a clock. So the keys that drive the game ask this, and so
   do bossFrame and trialFrame, which would otherwise run a fight behind a
   title screen the player opened from the menu.

   The win card is deliberately not in here. A solved level is already inert
   through levelOver(), which re-shows the card rather than swallowing the
   input - the card is the only thing that explains why nothing is
   responding, and that behaviour is worth keeping exactly as it is. */
/* The tutorial's explanation card is in here for exactly the reasons above:
   it covers the world, so it swallows taps by being there, and the keyboard
   and the two clocks would carry on regardless. It is also what makes
   tutPlayable() false while a card is being read, so time spent reading one
   is not counted as hesitation. */
function screenUp(){
  return homeUp()||!$("intro").classList.contains("gone")||
         (typeof tutCardUp==="function"&&tutCardUp());
}
function syncCorners(){
  var m=$("bMenu"), w=$("bWard");
  if(m)m.classList.toggle("on",panelKind==="menu");
  if(w)w.classList.toggle("on",panelKind==="wardrobe");
  syncMapChrome();
}
function toggleMenu(){
  if(panelKind==="menu"){hidePanel();return;}
  menuPanel();
}
function toggleWardrobe(){
  if(panelKind==="wardrobe"){hidePanel();return;}
  wardrobePanel("shape");
}

/* Rec. 709 luma, the same weighting everything else uses to decide whether
   a background is light. .55 rather than .5 so a mid-tone is treated as dark:
   getting this wrong costs legibility in one direction and nothing in the
   other. */
function paperIsLight(){
  if(typeof colPaper==="undefined"||!colPaper)return true;
  return (colPaper.r*.2126+colPaper.g*.7152+colPaper.b*.0722)>.55;
}
function syncHud(){
  /* THE CHROME FOLLOWS THE GROUND, NOT THE STATE. body.flat swaps the HUD to
     dark-on-light, which was right when the plane was a sheet of paper and
     is wrong now that it is the section's own ground lifted a little - dark
     text on a night meadow is unreadable. So it is asked of the colour
     rather than of the verb: light paper gets the light theme, and a dark
     one keeps the chrome it already had. A wardrobe world with a pale paper
     still behaves exactly as it always did. */
  document.body.classList.toggle("flat",flat&&paperIsLight());
  document.body.classList.toggle("tut",!!(app==="play"&&L&&L.tut));
  /* A gesture tutorial takes the bar off, which is the exact opposite of what
     `tut` does - `tut` forces it back on over the layout preference, because
     the old lesson was about the buttons. Both classes are toggled from here
     so there is one place that decides, and the CSS rule for this one is
     written after those three so it wins. */
  document.body.classList.toggle("tutgest",tutGestureLesson());
  /* The home screen is a screen, not a panel, so it does not go through
     showPanel - but the chrome has to answer to it exactly as it answers to
     one. One owner for the body class, here, beside the others.

     `athome` rather than `home`, because `.home` is the overlay's own class
     and a bare `.home` selector would match the body carrying it too - which
     it did, handing the whole document `display:none`. See the note in
     css/style.css. */
  document.body.classList.toggle("athome",homeUp());
  var inPlay=app==="play"&&!homeUp();
  ["bHint","bLook","bMenu","bWard","bRestart"].forEach(function(id){
    var el=$(id); if(el)el.style.display=inPlay?"flex":"none";
  });
  /* NOT DURING A FIGHT. On a boss or a trial the score is the row of lives at
     the top of the screen - the move label already refuses to show stars here
     for exactly that reason - and the total cannot change until the level is
     over, so it is a third scoreboard saying nothing. It is also the thing
     that was covering the cores row on a small phone: the pill grows
     leftwards as the number gets longer, and at three digits it reached the
     middle of the screen. It comes back the moment the level is won, because
     that is when it is news and when the win card's stars have to fly to it. */
  $("starTotal").classList.toggle("on",inPlay&&(!(B||TR)||levelDone));
  syncHintN();
  syncStarTotal();
  syncBossBar();

  if(app==="edit"){
    $("lvName").textContent="EDITOR";
    $("lvHint").textContent=
      tool==="glass"  ? "Glass is solid to stand on but vanishes when the world flattens." :
      tool==="anchor" ? "An anchor claims you when you unfold, overriding the nearest-camera rule." :
      tool==="crate"  ? "Crates can be shoved in the volume, which changes what the plane looks like. A crate resting on an anchor is stuck for good." :
      tool==="key"    ? "Keys are collected in the plane, on the square they fold into." :
      tool==="spike"  ? "Fire casts like stone but burns you underfoot \u2014 so it poisons the whole silhouette column." :
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
  // A fold that would kill one of them turns the button green. It can never
  // be true at the same moment peril is - foldKills() refuses a column with
  // a pillar in it - but peril still wins the colour if they ever disagree.
  // On a clock these classes are re-judged every frame in the render loop;
  // see the note there.
  $("bFlat").classList.toggle("strike",!!strike&&!pf);
  $("bFlat").title=pf?(pf.kind==="crush"
    ?"something already fills that square in the plane"
    :"fire folds into the square under you")
    :(strike?"one of them is in your column: fold now":"");
  $("bUp").disabled=flat;$("bDown").disabled=flat;
  var noRot=flat||(app==="play"&&L&&L.rotate===false);
  $("bRotL").disabled=noRot;$("bRotR").disabled=noRot;
  /* AND A LEVEL THAT HAS NO TURN DOES NOT SHOW ONE. Disabled was the old
     behaviour and it is right for the *flat* case - there the buttons come
     back the moment you stand up, so greying them says "not now". A level
     with `rotate:false` is a different sentence: the turn does not exist yet.
     The opening eight levels are all locked, so the buttons arriving on
     `05 — No Way From Here` is the reveal that level is built around, and a
     pair of dead controls sitting in the bar for eight levels would spend it
     in advance. Deliberately not keyed off `noRot`, which includes flat. */
  document.body.classList.toggle("norot",
    app==="play"&&!!L&&L.rotate===false);
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
  // A trial spends the same lives and shows the same dots, and its cores are
  // the targets it still has to reach.
  var on=!!((B||TR)&&app==="play");
  bar.classList.toggle("on",on);
  if(!on)return;
  // Whose row is which. The lives are yours in the player colour; the row
  // underneath belongs to whatever is opposing you, and takes that thing's
  // own colour rather than a third one the player has to learn.
  bar.classList.toggle("tr",!!TR&&!B);
  var lv="",co="";
  // A heart rather than a dot, because a dot is a countable token and a
  // heart is a life - and this row is the one thing on a clock the player
  // checks between every move.
  for(var i=0;i<BOSS_LIVES;i++)
    lv+="<i class='"+(i<lives?"":"gone")+"'>"+
        (i<lives?"\u2665":"\u2661")+"</i>";
  if(B)for(var j=0;j<B.hp;j++)co+="<i class='"+(j<bossHp?"":"gone")+"'></i>";
  // A trial's cores count down as you reach them, so the row empties from
  // the left as you go - the same shape as a boss losing hit points.
  else if(TR&&TR.cores)
    for(var k=0;k<TR.cores.length;k++)
      co+="<i class='"+(k<TR.cores.length-trialCore?"":"gone")+"'></i>";
  $("bossLives").innerHTML=lv;
  $("bossCores").innerHTML=co;
}
/* The pool, on the bulb. Asked from syncHud rather than kept in sync by a
   timer: hintsLeft() re-checks the half hour every time it is read, so the
   count is right whenever anything redraws - which is every move - and there
   is no interval running behind a fight for the sake of a badge. */
function syncHintN(){
  var b=$("bHint"), n=$("hintN");
  if(!b||!n||typeof hintsLeft!=="function")return;
  var left=hintsLeft();
  n.textContent=left;
  b.classList.add("has");
  b.classList.toggle("out",left<=0);
  b.title=left>0?left+" hint"+(left===1?"":"s")+" left"
                :"out of hints \u2014 next in "+hintWaitSay();
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
