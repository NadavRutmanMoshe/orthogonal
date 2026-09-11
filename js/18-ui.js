"use strict";
/* I'm Just A Cube - 18-ui.js
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
  /* The offer cards, and only them: they are the one panel that is a
     decision rather than a place, so they get their own shape, their own
     type scale and a scrim over the board. See `.panel.offer` in
     css/85-map.css and offerShell() in js/12-play.js. */
  $("panel").classList.toggle("offer",kind==="offer");
  panelKind=kind||null;
  syncCorners();
}
/* The map is nearly full height, and the running star total lives outside
   .corner at z-index 30 so it can sit *over* the win overlay. That puts it
   over the map too, on top of the map's own total - so the one place that
   already knows which panel is open turns it off. */
function syncMapChrome(){
  $("panel").classList.toggle("map",panelKind==="map"||panelKind==="secs");
  // The chooser wears the map's chrome (header, ambient canvas, footer row)
  // and adds one grid of its own, so it takes .map and is told apart by this.
  $("panel").classList.toggle("secs",panelKind==="secs");
  // MY LEVELS and every screen under it: the one class its own rules hang
  // off, so nothing here can reach the other tall panels' furniture.
  $("panel").classList.toggle("mylv",panelKind==="mylevels");
  /* Full-height panels: the map and its chooser, the menu now that it is
     grouped into cards and would otherwise scroll inside a 44vh window, and
     MY LEVELS, which is a place you go rather than a decision you are being
     asked to make - and whose list has no length a 44vh sheet could hold. */
  $("panel").classList.toggle("tall",panelKind==="map"||panelKind==="secs"||
                                     panelKind==="menu"||panelKind==="wardrobe"||
                                     panelKind==="mylevels");
  /* The running star total sits at z-index 30 so it can float over the win
     overlay, which also floats it over any open panel - and the menu, the
     wardrobe and the map all now carry a total of their own in their header.
     A panel covers the world anyway, so the corner count has nothing to do
     while one is up. */
  document.body.classList.toggle("mapopen",!!panelKind);
  // The ambient loop lives and dies with the panel, so it can never be left
  // running behind a level - least of all behind one on a clock.
  if(typeof mapBgStart==="function"){
    if(panelKind==="map"||panelKind==="secs")mapBgStart(); else mapBgStop();
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
/* The story's last card is in here for the same reasons the tutorial's is:
   it covers the world, and a keyboard does not care what is on top of it.
   A running cutscene is deliberately NOT in here - it holds the four verbs
   at the verbs (storyHolds), which is finer-grained than this test can be:
   the ending hands GO 2D back for one beat, and a screen that swallowed
   every game key would swallow the space bar that presses it. */
function screenUp(){
  return homeUp()||!$("intro").classList.contains("gone")||
         $("storyend").classList.contains("on")||
         (typeof tutCardUp==="function"&&tutCardUp());
}
function syncCorners(){
  var m=$("bMenu"), w=$("bWard");
  if(m)m.classList.toggle("on",panelKind==="menu");
  if(w)w.classList.toggle("on",panelKind==="wardrobe");
  syncMapChrome();
}
/* syncSave() is gone with the SAVE button it owned. The editor saves on
   every edit now (autosave(), js/14-editor.js), so there is no pill to show
   and no dot to keep in step with the board. */
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
/* THE LIVE STARS, AND THE ONE THAT FALLS OFF.

   Most people solve a level and never notice they scored two - the row used
   to be three small characters that quietly became two, which is a thing you
   can only see by having looked a moment earlier. So the star that is lost is
   *seen to leave*: the hollow one is always there underneath and the gold one
   on top of it drops off the row and fades. After the animation the slot is
   simply hollow, which is the picture the fall left behind.

   THE ROW IS BUILT ONCE AND THEN ONLY TOUCHED WHEN THE COUNT CHANGES, and
   that is the whole of the fix for the animation breaking under a spammed
   arrow key. It used to be part of moveLabel's innerHTML, which syncHud
   rewrites on EVERY redraw - so each move re-created the falling star from
   scratch and restarted its animation from the top, and holding a direction
   down left it flickering in place instead of falling off. Now a redraw with
   the same count is a no-op: no DOM is written, so there is nothing to
   restart. `void offsetWidth` is what deliberately restarts it in the one
   case that wants it - a second star lost while the first is still falling.

   It also has to go back up. Undo lowers the move count, so a star can be
   regained; the fallen glyph loses its class and returns to its socket.

   `starsLive` IS A CLAIM ABOUT THE DOM, NOT ABOUT THE LEVEL, so hiding the
   row cannot set it to 3: that is the whole of the "one star on a fresh
   level" bug. Hiding writes no glyphs, so a row left at one star by the
   previous level still says one star underneath - and the next level opens
   on three, sees 3===3, and takes the early return that exists to stop the
   animation restarting. The stale row then survives the whole level, because
   every count it is asked for afterwards is one it thinks it is already
   drawing. -1 is "I do not know what is on screen": it matches no count, so
   the first call after a hide always redraws, and `lost` is false against it
   so nothing falls or plays a sound on the way back in. */
var starsLive=-1;
function syncStars(st){
  var el=$("starRow"); if(!el)return;
  if(st===null){el.hidden=true;starsLive=-1;return;}
  el.hidden=false;
  if(!el.childElementCount){
    var h="";
    for(var i=0;i<3;i++)
      h+="<u class='sl'><i class='ho'>\u2606</i><i class='fi'>\u2605</i></u>";
    el.innerHTML=h;starsLive=3;
  }
  if(st===starsLive)return;                  // nothing has changed: leave it be
  var lost=st<starsLive;
  for(var j=0;j<3;j++){
    var fi=el.children[j].firstElementChild.nextElementSibling;
    fi.classList.remove("fall");
    if(j<st)fi.style.display="";
    else if(lost&&j<starsLive){              // these are the ones just lost
      fi.style.display="";
      void fi.offsetWidth;                   // restart, deliberately
      fi.classList.add("fall");
    } else fi.style.display="none";
  }
  if(lost&&SFX.starLost)SFX.starLost();
  starsLive=st;
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
     css/95-home.css. */
  document.body.classList.toggle("athome",homeUp());
  /* A CUTSCENE IS A SCREEN TOO, and the same rule applies: the chrome
     answers to it exactly as it answers to a panel, and this is the one
     place that decides. `instory` takes the HUD, the bar, the coach and the
     star total off (css/98-story.css, the same list body.athome takes);
     `storyask` is the one beat that hands a verb back and needs the bar for
     the length of one press. */
  var inStory=typeof storyOn==="function"&&storyOn();
  document.body.classList.toggle("instory",inStory);
  document.body.classList.toggle("storyask",
    inStory&&typeof storyAsking==="function"&&!!storyAsking());
  /* The corner buttons cannot be done in CSS: their display is set inline
     just below, and an inline style beats any stylesheet. So a cutscene is
     simply not "in play" as far as the chrome is concerned. */
  var inPlay=app==="play"&&!homeUp()&&!inStory;
  ["bHint","bLook","bMenu","bWard","bRestart"].forEach(function(id){
    var el=$(id); if(el)el.style.display=inPlay?"flex":"none";
  });
  /* THE BANK IS NOT SHOWN INSIDE A LEVEL. How many stars you have collected
     across the whole game cannot change while you are playing one, and it is
     not what you are thinking about - the row under the move count is. It
     was also the thing covering the cores row on a small phone: the pill
     grows leftwards as the number gets longer. It appears the moment the
     level is won, because that is when it is news and when the win card's
     stars have to have somewhere to fly to. */
  $("starTotal").classList.toggle("on",inPlay&&levelDone);
  syncHintN();
  syncStarTotal();
  /* Before the bar, not after it: syncBossBar() measures .hud's height to
     decide where the lives row sits, and the primer is inside .hud. */
  syncPrimer();
  syncBossBar();

  if(app==="edit"){
    /* THE LEVEL'S NAME, not the word EDITOR. MY LEVELS can have several
       levels in it and they are opened one at a time from a list, so the one
       thing the corner has to answer is which of them is on the board. */
    $("lvName").textContent=(custom.name&&custom.name!=="Untitled")?
      custom.name:"EDITOR";
    $("lvHint").textContent=
      tool==="glass"  ? "Water: stand on it, but it leaves nothing in 2D." :
      tool==="anchor" ? "Amber catches you when you come back to 3D." :
      tool==="crate"  ? "Walk into a crate and it slides. On amber it sticks for good." :
      tool==="key"    ? "Keys are collected in 2D, on the square they fold into." :
      tool==="spike"  ? "Fire is solid, and it burns the whole line it folds into." :
      "Tap the ground to start. Tap a block face to build off it.";
    $("lvHint").className="hint";
  }
  if(app==="compose"){
    var flatNow=composeMode==="2";
    $("lvName").textContent="COMPOSE - "+script.length+" MOVE"+(script.length===1?"":"S");
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
     The opening ten levels are all locked, so the buttons arriving on
     `09 - The Rotation` is the reveal that level is built around, and a
     pair of dead controls sitting in the bar for ten levels would spend it
     in advance. Deliberately not keyed off `noRot`, which includes flat. */
  document.body.classList.toggle("norot",
    app==="play"&&!!L&&L.rotate===false);
  if(app==="play"&&L&&L.tutorial){
    // No par, no stars: this level is teaching, not marking.
    $("moveLabel").innerHTML="<b>"+moveCount+"</b>";syncStars(null);
  } else if(app==="play"&&(B||TR)){
    // On a clock: the score is the row of lives at the top of the screen, so
    // a row of stars beside the move count would be a second, wrong answer
    // to the same question.
    $("moveLabel").innerHTML="<b>"+moveCount+"</b>";syncStars(null);
  } else if(app==="play"){
    /* THE NUMBER AND THE STARS YOU ARE STILL ON. Not "7 / 5": par is the
       solver's answer and printing it hands over how long the level is. What
       the row says instead is what you have left to lose, which is the same
       information from the player's side - and it is drawn rather than
       counted, so it can be glanced at mid-move. */
    $("moveLabel").innerHTML="<b>"+moveCount+"</b>";
    syncStars((levelPar===null||moveCount===0)?3
              :starsFor(moveCount,levelPar));
  } else {$("moveLabel").innerHTML="";syncStars(null);}
  tutSync();
}

/* ============================================================
   THE PRIMER - a level's rules, as a checklist that ticks itself

   Almost every level in this game teaches by being played: the coach cues a
   control and pressing it is the explanation. A fight cannot open that way,
   because the thing it has to say is a conjunction - be on its line, AND be
   looking down that line, AND fold, AND do all of it before it does - and
   there is no single press that demonstrates a conjunction. So SPARRING says
   it, in a list, above a board where each line is one move.

   A LIST WOULD BE A CARD ON THE WALL. The four rules were static text for one
   playtest and that is a thing you read once and stop seeing; what makes them
   a lesson is that each line answers back. Every step is a predicate over the
   kill state (killState(), 12-play.js), the boxes tick and untick as the
   player moves and turns, and the fourth goes red for exactly as long as the
   hunter's ray is live. The player can therefore *find* the rule by moving -
   which is how every other thing in this game is taught - and the words are
   only there to name what they are watching happen.

   And when it kills them, the level's `why` line says which step they missed -
   not here, but in the middle of the screen over the kill cam, which is where
   they are looking in that second. See deathSayShow() in 12-play.js.

   NOT the retired "brief". That was a full-bleed card that opened a trial or
   a boss, and it went because a card explaining what the board already shows
   is read once and dismissed unread (js/15-tutorial.js, where the word is
   still spoken for). This is the opposite trade: it says the one thing the
   board cannot show, it is never in the way, and it does not have to be
   dismissed.

   TWO PASSES, and they are separate on purpose. syncPrimer() writes markup
   and is called from syncHud, so it runs when the level or the control layout
   changes - anything animated inside markup that is rewritten every redraw
   restarts, which is the rule the live star row is its own element for.
   primerMarks() only toggles classes, and it runs every frame from the render
   loop, because what the checklist describes changes without the player
   touching anything: a hunter plants a line on its own clock. It is the third
   thing re-judged per frame, alongside the GO 2D button and the eye.
   ============================================================ */
var primerShown=null, primerRows=null, primerMarked="";
function primerSteps(){
  return (app==="play"&&L&&L.primer&&L.primer.steps)?L.primer.steps:null;
}
function syncPrimer(){
  var el=$("lvPrimer");if(!el)return;
  var st=primerSteps();
  el.hidden=!st;
  if(!st){primerRows=null;primerShown=null;return;}
  var key=L.name+"|"+((typeof tutGestures==="function"&&tutGestures())?"g":"b");
  if(key!==primerShown){
    primerShown=key;primerMarked="";
    var out="<i>"+tutWords(L.primer.lead||"")+"</i><ol>";
    for(var i=0;i<st.length;i++)out+="<li><span>"+tutWords(st[i].say)+"</span></li>";
    el.innerHTML=out+"</ol>";
    primerRows=el.querySelectorAll("li");
  }
  primerMarks();
}
/* The boxes. Called from here and from the render loop, so it has to be cheap
   and it has to be idempotent: the marks are joined into one short string and
   nothing is touched while that string is unchanged. */
function primerMarks(){
  var st=primerSteps();
  if(!st||!primerRows||primerRows.length!==st.length)return;
  /* FROZEN WHILE THE KILL CAM RUNS. The replay writes the recorded pose into
     the live state, so a list marked off it would tick "face its direction"
     during the film of the charge - the hunter is standing on you in that
     last frame - directly under a line that says you did not turn. What the
     player should see beside "you didn't turn to face it" is the list as it
     was when that was true, which is what holding still gives them. */
  if(rep)return;
  var k=killState(null);
  if(typeof primerLast!=="undefined")primerLast=k;
  var sig="",i,done,hot;
  for(i=0;i<st.length;i++){
    // A won level is a finished list. Without this the win card shows the two
    // lines that describe where you were STANDING unticked - the kill sends
    // you home and unfolds you - which reads as "you did it wrong and won".
    done=k.won||!!(st[i].done&&st[i].done(k));
    hot=!done&&!!(st[i].hot&&st[i].hot(k));
    sig+=done?"1":hot?"2":"0";
  }
  if(sig===primerMarked)return;
  primerMarked=sig;
  for(i=0;i<st.length;i++){
    primerRows[i].classList.toggle("on",sig.charAt(i)==="1");
    primerRows[i].classList.toggle("hot",sig.charAt(i)==="2");
  }
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
  /* THE ROW SITS UNDER THE LEVEL TEXT, and the level text is not a fixed
     height: the hint runs to one line or three, and a tutorial pushes .hud
     down to 104px. Measuring is cheaper than trying to reserve a lane in CSS
     for the tallest case, and this runs inside syncHud, which is already the
     thing that redraws whenever the text changes. */
  var hud=document.querySelector(".hud");
  if(hud)bar.style.top=(hud.offsetTop+hud.offsetHeight+12)+"px";
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
  // With NO LIMITS there is no count to print, and a badge reading 999 is a
  // number nobody is meant to read. The lemniscate is one glyph wide.
  var inf=(typeof hintsUnlimited==="function")&&hintsUnlimited();
  n.textContent=inf?"\u221e":left;
  b.classList.add("has");
  b.classList.toggle("out",left<=0);
  b.title=inf?"hints never run out":
          left>0?left+" hint"+(left===1?"":"s")+" left"
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

/* THE VIDEO MARK, for every button that costs an ad.

   A screen with a play sign in it is the one drawing everybody already reads
   as "this plays a video", so the button says what it is before the words
   are read - and the words are then free to say what you GET rather than
   spending themselves on the price. One helper rather than five copies of
   the same path, because there are five ad buttons in the game and they must
   not drift. `fill:currentColor` in the CSS is what makes it take the
   button's own hue. */
function adIcon(){
  return "<svg class='adicon' viewBox='0 0 24 24' aria-hidden='true'>"+
    "<path d='M3 6.2c0-1.2 1-2.2 2.2-2.2h13.6C20 4 21 5 21 6.2v9.6c0 "+
      "1.2-1 2.2-2.2 2.2H5.2C4 18 3 17 3 15.8V6.2Zm2.4.6v8.4c0 .4.3.6.6."+
      "6h12c.3 0 .6-.2.6-.6V6.8c0-.4-.3-.6-.6-.6H6c-.3 0-.6.2-.6.6Z'/>"+
    "<path d='M10.4 8.6v4.8c0 .5.5.8.9.5l3.6-2.4c.4-.2.4-.8 0-1l-3.6-2.4c-"+
      ".4-.3-.9 0-.9.5Z'/>"+
    "<path d='M8 20.4h8c.5 0 .9.4.9.9s-.4.9-.9.9H8c-.5 0-.9-.4-.9-.9s.4-.9."+
      "9-.9Z'/></svg>";
}
function tap(el,fn){
  if(!el)return;
  el.addEventListener("pointerdown",function(e){
    if(el.disabled)return;e.preventDefault();e.stopPropagation();fn();
  });
  el.addEventListener("click",function(e){e.preventDefault();});
}
function bind(id,fn){tap($(id),fn);}
