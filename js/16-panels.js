"use strict";
/* Orthogonal — 16-panels.js
   Chapters and every slide-up panel: menu, levels, wardrobe, library.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ---- the wardrobe ----------------------------------------------------
   Items on the left, a display case on the right. Tapping an item only
   ever *selects* it - it goes on the stand and nothing is spent and
   nothing is equipped. Both of those are deliberate second acts, on
   buttons under the case, and buying is armed-then-confirmed on top of
   that. The old panel bought and equipped on a single tap of the grid,
   which meant a mis-tap while scrolling the list spent stars.

   The shell is built once per opening and then refreshed in place. It
   would be simpler to re-run showPanel on every tap, but that replaces
   the panel's innerHTML, and with it the case's canvas - so every tap
   would burn a WebGL context. See the note above previewStop().
   ---------------------------------------------------------------------- */
var wardTab="shape";
var wardSel={shape:null,color:null,world3:null,world2:null};
var buyArmed=null;   // the id whose BUY has been tapped once, awaiting a second

function wardList(t){
  return t==="shape" ?SKIN_SHAPES:
         t==="color" ?SKIN_COLORS:
         t==="world3"?WORLDS3D:WORLDS2D;
}
function wardEquipped(t){
  return t==="shape" ?wardrobe.shape:
         t==="color" ?wardrobe.color:
         t==="world3"?wardrobe.world3:wardrobe.world2;
}
function wardSelected(t){
  if(!wardSel[t])wardSel[t]=wardEquipped(t);
  return wardSel[t];
}
function wardrobePanel(tab){
  wardTab=tab||"shape";
  buyArmed=null;
  showPanel(
    "<div class='phead'><div class='pt'><b>Wardrobe</b>"+
      "<span id='wHead'></span></div>"+
      "<div class='mtot' id='wBal'></div>"+
      "<button class='mq mx' id='wX' aria-label='Back to the level'>✕</button></div>"+
    "<div class='tabs'>"+
      "<button class='tab' id='wS'>SHAPE</button>"+
      "<button class='tab' id='wC'>COLOUR</button>"+
      "<button class='tab' id='wV'>3D</button>"+
      "<button class='tab' id='wP'>2D</button>"+
    "</div>"+
    "<div class='wbody'>"+
      "<div class='wlist'><div class='grid' id='wGrid'></div></div>"+
      "<div class='wcase'>"+
        "<canvas id='wCase3d' class='wcanvas'></canvas>"+
        "<div class='wturn'>DRAG TO TURN</div>"+
        "<div id='wMeta'></div>"+
      "</div>"+
    "</div>"+
    "<div class='prow'><button id='wBack'>BACK</button></div>","wardrobe");
  bind("wS",function(){wardTabTo("shape");});
  bind("wC",function(){wardTabTo("color");});
  bind("wV",function(){wardTabTo("world3");});
  bind("wP",function(){wardTabTo("world2");});
  bind("wBack",hidePanel);
  bind("wX",hidePanel);
  wardRefresh();
  // The canvas has no measurable size until the panel has been laid out, so
  // the case starts a frame late. Re-check the panel on the way in: closing
  // the wardrobe inside that frame would otherwise start a context that the
  // already-finished previewStop() never gets the chance to release.
  requestAnimationFrame(function(){
    var cv=$("wCase3d");
    if(!cv||panelKind!=="wardrobe"||!panelOpen())return;
    previewStart(cv);
    wardPreview();
  });
}
function wardTabTo(t){
  wardTab=t;buyArmed=null;
  wardRefresh();wardPreview();
}
function wardPreview(){
  var sel=wardSelected(wardTab);
  previewShow(
    wardTab==="shape" ?sel:wardrobe.shape,
    wardTab==="color" ?sel:wardrobe.color,
    wardTab==="world3"?sel:wardrobe.world3,
    wardTab==="world2"?sel:wardrobe.world2,
    wardTab==="world2");
}
function wardRefresh(){
  var t=wardTab, list=wardList(t), cur=wardEquipped(t), sel=wardSelected(t);
  $("wHead").textContent=t==="shape"?"THE SHAPE YOU PLAY AS":
    t==="color"?"ITS COLOUR":t==="world3"?"THE VOLUME":"THE PLANE";
  $("wBal").innerHTML=shards()+" \u2605";
  $("wBal").title="to spend";
  $("wS").classList.toggle("on",t==="shape");
  $("wC").classList.toggle("on",t==="color");
  $("wV").classList.toggle("on",t==="world3");
  $("wP").classList.toggle("on",t==="world2");
  var html="";
  for(var i=0;i<list.length;i++){
    var it=list[i], have=owns(it.id), on=cur===it.id;
    // each swatch shows the two colours that item actually sets
    var swatch = t==="color"
      ? "background:#"+it.hex.toString(16).padStart(6,"0")
      : t==="world3"
        ? "background:linear-gradient(135deg,#"+it.void.toString(16).padStart(6,"0")+
          " 0 50%,#"+it.block.toString(16).padStart(6,"0")+" 50% 100%)"
      : t==="world2"
        ? "background:linear-gradient(135deg,#"+it.paper.toString(16).padStart(6,"0")+
          " 0 50%,#"+it.ink.toString(16).padStart(6,"0")+" 50% 100%)"
        : "background:var(--rule)";
    html+="<div class='item"+(on?" on":"")+(sel===it.id?" sel":"")+
      "' data-id='"+it.id+"'>"+
      "<i style='"+swatch+"'>"+(t==="shape"?shapeGlyph(it.id):"")+"</i>"+
      "<b>"+it.name+"</b>"+
      "<span>"+(on?"equipped":have?"owned":it.cost+" \u2605")+"</span></div>";
  }
  $("wGrid").innerHTML=html;
  $("wGrid").querySelectorAll(".item").forEach(function(el){
    tap(el,function(){
      var id=el.getAttribute("data-id");
      if(wardSel[wardTab]===id)return;
      wardSel[wardTab]=id;
      buyArmed=null;                 // a new selection disarms the old confirm
      SFX.turn();
      wardRefresh();wardPreview();
    });
  });
  wardMeta();
}
function wardMeta(){
  var t=wardTab, id=wardSelected(t), it=findBy(wardList(t),id);
  var have=owns(id), on=wardEquipped(t)===id, bal=shards();
  var s="<div class='wname'>"+it.name+"</div>"+
        "<div class='wcost'>"+(on?"equipped":have?"owned":it.cost+" \u2605")+"</div>"+
        "<div class='wact'>";
  if(on)              s+="<button disabled>EQUIPPED</button>";
  else if(have)       s+="<button id='wEquip' class='wgo'>EQUIP</button>";
  else if(bal<it.cost)s+="<button disabled>NEED "+(it.cost-bal)+" MORE \u2605</button>";
  else if(buyArmed===id)
                      s+="<button id='wBuy' class='wsure'>SURE? \u00b7 "+it.cost+" \u2605</button>";
  else                s+="<button id='wBuy' class='wgo'>BUY \u00b7 "+it.cost+" \u2605</button>";
  if(!have){
    var need=adsFor(it.cost), got=adsWatched(id);
    s+="<button id='wAd' disabled>WATCH "+need+" AD"+(need===1?"":"S")+
       (got?" ("+got+"/"+need+")":"")+"</button>";
  }
  s+="</div>";
  // The hook name belongs in the code and in CLAUDE.md, not in a player's
  // narrow sidebar; all this has to say is why the button does nothing.
  if(!have)s+="<div class='note'>Ads need an SDK, so the button is dead "+
    "until the game is wrapped for a store.</div>";
  $("wMeta").innerHTML=s;
  bind("wEquip",function(){wardEquip(t,id);SFX.key();wardRefresh();});
  bind("wBuy",function(){
    if(buyArmed!==id){buyArmed=id;SFX.turn();wardMeta();return;}
    buyArmed=null;
    if(shards()<it.cost){flash("not enough stars");SFX.bump();wardRefresh();return;}
    wardrobe.owned.push(id);wardrobe.spent+=it.cost;
    wardEquip(t,id);                 // you confirmed a purchase; wear it
    SFX.key();flash(it.name+" unlocked");
    wardRefresh();
  });
}
function wardEquip(t,id){
  if(t==="shape")wardrobe.shape=id;
  else if(t==="color")wardrobe.color=id;
  else if(t==="world3")wardrobe.world3=id;
  else wardrobe.world2=id;
  applyPalette();applySkin();saveWardrobe();
}
/* The hook a rewarded-video callback calls when one video finishes playing
   against a specific item, as opposed to grantShards(), which tops up the
   balance instead. An item needs adsFor(cost) of them, and progress is kept
   so watching two of the three does not have to happen in one sitting.
   Neither hook is wired to anything; there is no ad SDK in this build. */
function grantAdView(id){
  if(owns(id))return;
  var it=null, tabs=["shape","color","world3","world2"];
  for(var i=0;i<tabs.length&&!it;i++){
    var l=wardList(tabs[i]);
    for(var j=0;j<l.length;j++) if(l[j].id===id){it=l[j];break;}
  }
  if(!it)return;
  if(!wardrobe.ads)wardrobe.ads={};
  wardrobe.ads[id]=adsWatched(id)+1;
  if(wardrobe.ads[id]>=adsFor(it.cost)){
    wardrobe.owned.push(id);
    delete wardrobe.ads[id];
  }
  saveWardrobe();
  if(panelKind==="wardrobe")wardRefresh();
}
// Called by the rewarded-video callback once an ad completes. Kept separate so
// wiring an SDK later is a one-line change and never touches the star maths.
function grantShards(n){
  wardrobe.spent=Math.max(0,wardrobe.spent-n);
  saveWardrobe();
}
function shapeGlyph(id){
  return {cube:"\u25a0",sphere:"\u25cf",pyramid:"\u25b2",diamond:"\u25c6",
          barrel:"\u25ac",donut:"\u25ce",star:"\u2726",pup:"\u25d0"}[id]||"\u25a0";
}

function seg(pre,val,label,cur){
  return "<button id='"+pre+"_"+val+"'"+(cur===val?" class='on'":"")+">"+label+"</button>";
}
function menuPanel(){
  var vol=Math.round(settings.volume*100), bri=Math.round(settings.brightness*100);
  showPanel(
    "<div class='phead'><div class='pt'><b>Menu</b>"+
      "<span>"+esc((L&&L.name)||"")+"</span></div>"+
      "<div class='mtot'>"+starsEarned()+" ★</div>"+
      "<button class='mq mx' id='mClose' aria-label='Back to the level'>✕</button></div>"+
    "<div class='pbody'>"+
      "<div class='prow2'><button class='pgo' id='mHome'>HOME</button>"+
        "<button class='pgo' id='mLevels'>LEVELS</button></div>"+
      "<div class='pcard'><h4>Sound &amp; light</h4>"+
        "<div class='srow'><label>Volume</label>"+
          "<input type='range' id='mVol' min='0' max='100' value='"+vol+"'>"+
          "<span id='mVolV'>"+vol+"%</span></div>"+
        "<div class='srow'><label>Brightness</label>"+
          "<input type='range' id='mBri' min='60' max='140' value='"+bri+"'>"+
          "<span id='mBriV'>"+bri+"%</span></div></div>"+
      "<div class='pcard'><h4>Controls</h4>"+
        "<div class='crow'><label>Layout</label><span class='seg'>"+
          seg("mUi","full","ON-SCREEN",settings.ui)+
          seg("mUi","compact","COMPACT",settings.ui)+
          seg("mUi","none","HIDDEN",settings.ui)+"</span></div>"+
        "<div class='note'>COMPACT drops the d-pad; HIDDEN clears the screen. "+
          "Either way: <code>swipe</code> or arrows/WASD to move, "+
          "<code>double-tap</code> the world or <code>space</code> to change "+
          "dimension, <code>two-finger swipe</code> left or right or "+
          "<code>Q</code>/<code>E</code> to turn.</div>"+
        "<div class='crow'><label>Tutorial</label><span class='seg'>"+
          seg("mTutor","gesture","GESTURES",settings.tutor)+
          seg("mTutor","buttons","BUTTONS",settings.tutor)+"</span></div>"+
        "<div class='note'>Which controls the three teaching levels teach. "+
          "GESTURES takes the bar off and demonstrates the swipe, the "+
          "double-tap and the two-finger swipe with a ghost hand; BUTTONS is "+
          "the older lesson, with the bar forced on. It changes nothing "+
          "outside the tutorial \u2014 every control works in both.</div></div>"+
      "<div class='pcard'><h4>Real time</h4>"+
        "<div class='crow'><label>Pace</label><span class='seg'>"+
          PACES.map(function(p){
            return seg("mPace",p.pct,p.label,Math.round(paceScale()*100));
          }).join("")+"</span></div>"+
        "<div class='note'>A boss and a trial are the only things in the game "+
          "that do not wait for you. This slows both — every part of them "+
          "together, so a fight keeps its shape — and it costs you no stars."+
          "</div></div>"+
      "<div class='pcard'><h4>Mastery</h4>"+
        "<div class='crow'><label>Show as</label><span class='seg'>"+
          seg("mMast","auto","EARNED",settings.mastery)+
          seg("mMast","on","PREVIEW",settings.mastery)+"</span></div>"+
        "<div class='note'>A section on the map paints itself in its own "+
        "colour once every level in it is on three stars. EARNED is the real "+
        "thing; PREVIEW shows it on every section so you can look at it "+
        "without collecting it. Nothing else changes either way — no stars "+
        "move and nothing unlocks.</div></div>"+
      "<div class='pcard'><h4>More</h4><div class='psub'>"+
        "<button id='mLegend'>WHAT THE PIECES DO</button>"+
        "<button id='mTut'>REPLAY TUTORIAL</button>"+
        "<button id='mEditor'>LEVEL EDITOR</button>"+
        "<button id='mReset' class='pdanger'>RESET SETTINGS</button>"+
      "</div>"+
      /* WHICH BUILD AM I LOOKING AT? The stamp has been in the file since
         build-single.js started writing it, but only in a comment and a
         global - which answers the question for whoever has a terminal and
         nobody else. A published artifact is played by people who cannot
         open a console, and "are you on the new one?" is unanswerable
         without this. It is the short commit, so it matches the build log
         and `git checkout <it>` puts that exact version back. */
      "<div class='note pbuild'>build "+
        esc(typeof BUILD==="string"?BUILD:"unbuilt \u00b7 running from source")+
      "</div></div>"+
    "</div>","menu");
  var v=$("mVol"), b=$("mBri");
  v.addEventListener("input",function(){
    settings.volume=v.value/100;
    settings.volTouched=true;      // from here on, your choice outranks the default
    $("mVolV").textContent=v.value+"%";
    applyVolume();
    muted=settings.volume<=0;
    saveSettings();
  });
  v.addEventListener("change",function(){if(!muted)SFX.turn();});
  b.addEventListener("input",function(){
    settings.brightness=b.value/100;
    $("mBriV").textContent=b.value+"%";
    applyBrightness();saveSettings();
  });
  ["full","compact","none"].forEach(function(m){
    bind("mUi_"+m,function(){
      settings.ui=m;applyUI();saveSettings();syncHud();onResize();menuPanel();
    });
  });
  ["gesture","buttons"].forEach(function(m){
    bind("mTutor_"+m,function(){
      settings.tutor=m;saveSettings();syncHud();menuPanel();
      flash(m==="gesture"?"tutorial teaches gestures":"tutorial teaches buttons");
    });
  });
  ["auto","on"].forEach(function(m){
    bind("mMast_"+m,function(){
      settings.mastery=m;saveSettings();menuPanel();
      flash(m==="on"?"mastery preview on — open the map":"mastery: as earned");
    });
  });
  PACES.forEach(function(p){
    bind("mPace_"+p.pct,function(){
      settings.pace=p.v;saveSettings();menuPanel();
      // Takes effect on the next frame - there is no state to rebuild, which
      // is the other reason pace is a multiplier on dt and not a set of dials
      // baked into the fight when the level loads.
      flash(p.v===1?"pace: normal":"clocks at "+p.pct+"%");
    });
  });
  bind("mTut",function(){
    hidePanel();playSource="builtin";enterPlay(LEVELS[0],0,false);
  });
  bind("mReset",function(){
    settings.volume=defaultVolume();settings.volTouched=false;
    settings.brightness=1;settings.ui="full";settings.pace=1;
    settings.tutor=defaultTutor();
    muted=false;
    applyVolume();
    applyBrightness();applyUI();saveSettings();syncHud();
    flash("settings reset");menuPanel();
  });
  bind("mHome",function(){hidePanel();homeShow();});
  bind("mLevels",levelPicker);
  bind("mLegend",legendPanel);
  bind("mEditor",function(){hidePanel();enterEditor();});
  bind("mClose",hidePanel);
}

/* ============================================================
   THE HOME SCREEN

   Where the game starts from once there is anything to come back to. It is
   not a panel - it is a full-bleed screen at z-index 11, under the panels on
   purpose, so the map and the wardrobe open *over* it and closing one puts
   you back here rather than dropping you into a level you never chose.

   A first run never sees it. There is nothing to continue and nothing owned,
   so the intro card - which says in one sentence what the game is - is the
   better first screen, and BEGIN goes straight into the tutorial. Once there
   is progress or a saved session, this replaces it. See 21-boot.js.
   ============================================================ */
function homeUp(){var el=$("home");return !!el&&el.classList.contains("on");}

/* WHERE CONTINUE GOES, and it is two answers rather than one.

   A saved session is the truest: it puts you back mid-level, on the move you
   stopped on, which is what `resumeSession()` already restores for the intro
   card's old CONTINUE button. Without one - a fresh device, or a level
   finished cleanly - it is `mapHere()`, the first level you have not dealt
   with, which is exactly where the map's own marker sits. Those are the two
   senses of "where I was" and the session is the more specific, so it wins. */
function homeTarget(){
  var si=(typeof sessionIndex==="function")?sessionIndex():-1;
  if(si>=0&&LEVELS[si])return {i:si,resume:true};
  return {i:mapHere(),resume:false};
}
/* Three things you do not own, cheapest first, shapes before colours.

   Shapes lead because they are the headline purchase and the one that reads
   at a glance - a pyramid is visibly not a cube, where two colours at 20px
   are two dots. SKIN_SHAPES is already in ascending cost order, so "cheapest
   first" is just the order of the table. Colours top the row up when there
   are not three shapes left to want. */
function homeTeaser(){
  var out=[],i;
  for(i=0;i<SKIN_SHAPES.length&&out.length<3;i++)
    if(!owns(SKIN_SHAPES[i].id))
      out.push({g:shapeGlyph(SKIN_SHAPES[i].id),c:SKIN_SHAPES[i].cost,col:null});
  for(i=0;i<SKIN_COLORS.length&&out.length<3;i++)
    if(!owns(SKIN_COLORS[i].id))
      out.push({g:"\u25cf",c:SKIN_COLORS[i].cost,
                col:"#"+SKIN_COLORS[i].hex.toString(16).padStart(6,"0")});
  return out;
}
function homeSync(){
  if(!$("home"))return;
  var t=homeTarget(), lv=LEVELS[t.i];
  var b=$("hContinue");
  /* "START" only when there is genuinely nothing behind you. Anything else
     is a continuation, even the first level of a section you have not
     touched - the word has to match what the button is about to do. */
  var fresh=!t.resume&&t.i===0&&!mapTouched(0);
  b.querySelector("b").textContent=fresh?"START":"CONTINUE";
  b.querySelector("i").textContent=lv?lv.name.replace(/^\d+ \u2014 /,""):"";
  $("homeStars").textContent=starsEarned();
  var tz=homeTeaser(),h="";
  if(!tz.length)h="<span class='hnone'>everything unlocked</span>";
  else for(var i=0;i<tz.length;i++)
    h+="<em><span"+(tz[i].col?" style='color:"+tz[i].col+"'":"")+">"+
       tz[i].g+"</span><b>"+tz[i].c+"\u2605</b></em>";
  $("homeTeaser").innerHTML=h;
}
/* The stand, which is the wardrobe's display case pointed at what you have
   equipped. Rebuilt rather than kept, because previewStart is a singleton and
   anything that opens a panel takes it down - see hidePanel().

   AND ON A FRESH CANVAS EVERY TIME, which is not a tidiness choice. previewStop
   ends its context with WEBGL_lose_context.loseContext(), deliberately, so the
   browser reclaims it instead of waiting for a GC that might evict the game's
   own renderer first. A canvas whose context has been lost that way is spent:
   getContext returns null on it forever after, and three.js dies reading
   `precision` off the null. The wardrobe never meets this because showPanel
   rewrites the panel's markup on every opening and hands previewStart a brand
   new element each time; this screen keeps its markup between openings, so it
   has to make the new element itself. */
function homeCase(){
  var old=$("homeCase");
  if(!old||!homeUp())return;
  var cv=document.createElement("canvas");
  cv.id="homeCase";
  old.parentNode.replaceChild(cv,old);
  previewStart(cv);
  previewShow(wardrobe.shape,wardrobe.color,wardrobe.world3,wardrobe.world2,false);
  /* Left at the display case's own scale. The framing there is tuned to fit
     the slab and its two neighbours, and scaling the group up pushes the
     plinth off the bottom of the canvas - the character grows and its ground
     is cut away, which reads as a cropping accident. This screen gets its
     size from a bigger canvas instead. */
}
function homeShow(){
  if(!$("home"))return;
  hidePanel();
  $("won").classList.remove("on");
  $("intro").classList.add("gone");
  $("home").classList.add("on");
  syncHud();                       // syncHud owns body.home and the chrome
  homeSync();
  homeCase();
}
function homeHide(){
  if(!homeUp())return;
  previewStop();
  $("home").classList.remove("on");
  syncHud();
}
/* Leaving by the front door. The audio unlock rides here as well as on the
   intro card's BEGIN, because on a returning player's launch this is the
   first thing they touch and a WebView may have refused the sting's tap. */
function homeGo(){
  var t=homeTarget();
  homeHide();
  audio();applyBrightness();
  if(t.resume&&resumeSession())return;
  playSource="builtin";
  enterPlay(LEVELS[t.i],t.i,false);
}

/* Where each section starts and ends, and how much of it is done. The
   picker is the only place the campaign's shape is visible, so it has to
   show the shape: a run of levels, then the boss that closes it, and how
   many stars of the section's total you are carrying. */
/* A locked section opens when everything before it is finished. "Finished"
   is deliberately the bosses only, not every level: the Extra shelf is a
   reward for beating the game, and gating it on 100% would turn a bonus into
   a chore nobody collects. */
function sectionsUnlocked(){
  for(var i=0;i<LEVELS.length;i++)
    if(LEVELS[i].boss&&progress[LEVELS[i].name]===undefined)return false;
  return true;
}
function sectionSpans(){
  var out=[];
  for(var i=0;i<SECTIONS.length;i++){
    var from=SECTIONS[i].at;
    var to=(i+1<SECTIONS.length?SECTIONS[i+1].at:LEVELS.length)-1;
    var got=0,max=0,done=0,n=0;
    for(var j=from;j<=to;j++){
      if(LEVELS[j].tutorial)continue;
      n++;max+=3;
      got+=starsForRecord(LEVELS[j],progress[LEVELS[j].name]);
      if(progress[LEVELS[j].name]!==undefined)done++;
    }
    out.push({i:i,from:from,to:to,got:got,max:max,done:done,n:n,
              sec:SECTIONS[i],locked:!!SECTIONS[i].locked&&!sectionsUnlocked()});
  }
  return out;
}
/* MASTERED — every scoreable level in the section on three stars.

   Not "cleared": cleared is what the rolling window already tracks and what
   the bar under the section card already draws. This is the other thing, and
   it is the only claim in the game that cannot be bought, skipped or padded -
   `sp.got` is summed through starsForRecord(), which reads `progress` and
   nothing else, and a skip is deliberately not in `progress`. So a painted
   section means exactly one thing and cannot be made to lie.

   PROLOGUE can never be mastered and that is correct, not an oversight:
   sectionSpans() skips tutorials, so its `max` is 0 - a section that awards
   no stars has none to collect.

   The preview switch forces the look on so it can be *seen* without being
   earned. It touches the drawing only. */
function masteryPreview(){return settings.mastery==="on";}
function sectionMastered(sp){
  if(!sp||sp.max<=0||sp.locked)return false;
  return masteryPreview()||sp.got===sp.max;
}

/* ============================================================
   THE MAP — the picker as a path

   A section at a time: a run of levels, a trial partway in, a boss closing
   it. The list this replaced showed all seventy-two at once in one column of
   monospace, which is honest and unreadable - nothing in it said which rows
   mattered, and the two that matter most were told apart by two shades of
   the same amber.

   Progression is a rolling window rather than a chain. You may always reach
   `MAP_WINDOW` levels past the furthest you have got to, which is the whole
   of the difference between this and Candy Crush: in a match-3 you can beat
   a level by luck eventually, and in a deterministic puzzle stuck is stuck
   forever. One hard level must never be able to end somebody's game. The
   window closes behind you anyway, so a skip is still worth something.

   Measured from the furthest level *touched*, not from the first gap. Saves
   from before any of this existed have arbitrary holes in them - nothing was
   locked, so people played in whatever order they liked - and measuring from
   the first gap would re-lock levels those players had already walked past.
   ============================================================ */
var MAP_WINDOW=2;
var mapSection=null;          // which tab is open; null means "where you are"

/* ---- the map's ambient world -----------------------------------------
   Wireframe cubes drifting behind the trail, each one periodically
   collapsing into a flat square and standing back up: the game's own verb,
   running quietly where the menu would otherwise be a flat panel.

   Three things about it are deliberate. It is a *2D* canvas, so it costs
   nothing against the WebGL context cap the wardrobe's display case has to
   budget for. It is a child of the panel rather than of body, because
   `body>canvas` in the CSS is what scopes the game's own renderer and any
   canvas that escapes into body would be pinned over the whole viewport by
   that rule. And the loop stops dead when the panel closes - a menu
   animation that keeps running behind a boss fight is a menu animation
   stealing frames from the thing on a clock.

   The cubes are pushed out of the middle third. The trail and its labels own
   the centre column, and ambience you have to read around is not ambience.
   ---------------------------------------------------------------------- */
var mapBgRAF=0, mapBgCubes=null;
var mapBgHold=null;
function mapBgStop(){ if(mapBgRAF){cancelAnimationFrame(mapBgRAF);mapBgRAF=0;} }
function mapBgStart(){
  var c=$("mBg");
  if(!c||mapBgRAF||!c.getContext)return;
  var x=c.getContext("2d");
  if(!x)return;
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches;
  var W=0,H=0,DPR=1;
  function fit(){
    DPR=Math.min(2,window.devicePixelRatio||1);
    W=c.clientWidth||1;H=c.clientHeight||1;
    c.width=Math.max(1,Math.round(W*DPR));c.height=Math.max(1,Math.round(H*DPR));
    x.setTransform(DPR,0,0,DPR,0,0);
  }
  if(!mapBgCubes){
    mapBgCubes=[];
    for(var i=0;i<11;i++)mapBgCubes.push({
      x:.5+(Math.random()<.5?-1:1)*(.26+Math.random()*.27),
      y:Math.random(), d:.3+Math.random()*.7,
      s:10+Math.random()*17, t:Math.random()*Math.PI*2,
      sp:.12+Math.random()*.2, drift:.010+Math.random()*.022
    });
  }
  /* A cube, isometric, with its depth axis scaled by (1-f). At f=1 the depth
     is gone and the three faces land in one square - which is exactly what
     the fold does to the world. */
  function cube(cu,f,alpha){
    var s=cu.s, k=1-f;
    function P(px,py,pz){
      return [(px-pz*k)*0.866*s, (py+(px+pz*k)*0.5)*s*0.62];
    }
    var faces=[[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]],
               [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
               [[1,-1,-1],[1,-1,1],[1,1,1],[1,1,-1]]];
    var tint=[.085,.055,.032];
    for(var i=0;i<3;i++){
      x.beginPath();
      for(var v=0;v<4;v++){
        var p=P(faces[i][v][0],faces[i][v][1],faces[i][v][2]);
        if(v)x.lineTo(p[0],p[1]); else x.moveTo(p[0],p[1]);
      }
      x.closePath();
      x.fillStyle="rgba(150,180,230,"+(tint[i]*alpha).toFixed(3)+")";
      x.fill();
      x.strokeStyle="rgba(170,200,245,"+(.16*alpha).toFixed(3)+")";
      x.lineWidth=1;x.stroke();
    }
  }
  fit();
  var last=0;
  function frame(now){
    if(panelKind!=="map"){mapBgRAF=0;return;}   // the panel closed under us
    var dt=Math.min(60,now-last)||16; last=now;
    if(c.clientWidth!==W||c.clientHeight!==H)fit();
    x.clearRect(0,0,W,H);
    for(var i=0;i<mapBgCubes.length;i++){
      var cu=mapBgCubes[i];
      /* Kept a whole cube clear of every edge. Positioning by a fraction of
         the canvas and drawing from the centre meant anything near a side was
         bisected by the panel's clip, and a sliced-off cube reads as a
         rendering fault rather than as depth.

         `m` is the real drawn half-extent, which is bigger than it looks:
         P() spans (px - pz*k) over [-2,2], so the cube reaches 1.732*s across
         and 1.24*s down - not the 0.866*s the face size suggests.

         Staying inside is not enough on its own, though: anything that drifts
         *through* an edge is necessarily half-drawn while it crosses. So the
         travel band is inset by a whole cube at both ends and the wrap is
         hidden instead - a cube fades out over the last stretch of the band,
         jumps back to the start while invisible, and fades in. No cube is
         ever clipped, and none of them pops. */
      var m=cu.s*1.8;
      if(!reduce){
        cu.t+=cu.sp*dt/1000;
        cu.y-=cu.drift*dt/1000;
        if(cu.y<0)cu.y=1;
      }
      var px=m+cu.x*Math.max(0,W-2*m);
      var py=m+cu.y*Math.max(0,H-2*m);
      var fade=Math.max(0,Math.min(1,Math.min(cu.y,1-cu.y)/.12));
      if(fade<=0)continue;
      // Most of the beat standing up and a short flat moment, like play.
      var raw=(Math.sin(cu.t)+1)/2;
      x.save();
      x.translate(px,py);
      cube(cu,Math.pow(raw,3.2),cu.d*.85*fade);
      x.restore();
    }
    mapBgRAF=requestAnimationFrame(frame);
  }
  mapBgRAF=requestAnimationFrame(frame);
}

function mapSolved(i){return progress[LEVELS[i].name]!==undefined;}
function mapSkipped(i){return !!skips[LEVELS[i].name];}
function mapTouched(i){return mapSolved(i)||mapSkipped(i);}
/* The furthest index the window itself opens, measured from what you have
   actually *beaten*. Skips are excluded on purpose: a skip is a door opened
   onto one landmark, not progress, and counting it here would drag the whole
   window forward and hand over the levels in between - which are the levels
   the skip exists to let you come back to. */
function mapReach(){
  var last=-1;
  for(var i=0;i<LEVELS.length;i++) if(mapSolved(i)) last=i;
  return last+1+MAP_WINDOW;
}
// Where the pink node goes: the first level you have not dealt with.
function mapHere(){
  for(var i=0;i<LEVELS.length;i++) if(!mapTouched(i)) return i;
  return LEVELS.length-1;
}
function mapLocked(i){
  if(mapTouched(i))return false;      // beaten, or a door already opened
  var s=SECTIONS[mapSecOf(i)];
  if(s&&s.locked&&!sectionsUnlocked())return true;
  return i>mapReach();
}
/* What an ad may open, and nothing else. A skip lands on a *landmark* - the
   boss that closes a section you are already inside, or the opening level of
   the next section - so it buys you past a wall rather than past the levels
   themselves. Skipping straight to a boss used to drag the rolling window
   with it and quietly hand over everything in between, which is the opposite
   of the point: those levels are still there to play. */
function mapSkippable(i){
  return mapLocked(i)&&mapKind(LEVELS[i])==="boss"&&
         mapSecOf(i)===mapSecOf(mapHere());
}
// A whole section can be opened at its first level, but never V · EXTRA:
// that shelf is what beating every boss is *for*, and selling it would make
// the reward a purchase.
function mapSectionSkippable(n){
  var s=SECTIONS[n];
  if(!s||s.locked)return false;
  return s.at>mapReach()&&!mapTouched(s.at);
}
function mapState(i){
  if(mapSolved(i))return "solved";
  if(mapSkipped(i))return "skipped";
  if(mapLocked(i))return "locked";
  return i===mapHere()?"here":"open";
}
function mapSecOf(i){
  for(var n=SECTIONS.length-1;n>=0;n--) if(i>=SECTIONS[n].at) return n;
  return 0;
}
function mapKind(l){return l.boss?"boss":l.trial?"trial":l.tutorial?"tut":"lv";}
// One ad a level, two a trial, three a boss - a landmark should cost more to
// walk past than a puzzle does.
function mapAds(k){return k==="boss"?3:k==="trial"?2:1;}
// The circle already carries the number, so the label beside it drops it.
function mapCaption(l){
  return l.name.replace(/^\d+\s+—\s+/,"").replace(/^(?:TRIAL|BOSS)\s+[IVX]+\s+—\s+/,"");
}
/* The two landmarks get shapes out of the game's own vocabulary rather than
   ornament bolted onto a circle.

   A BOSS is a hexagon, which is what a cube looks like seen corner-on - the
   silhouette of the game's own piece, and the only shape on the map that is
   also a thing in the world. Around it, four arcs: its four phases.

   A TRIAL is a diamond, the square standing on its point, with the sweeping
   plane drawn straight through it. That is the trial in one picture: a flat
   thing and the slice about to cross it.

   Drawn as SVG rather than clip-path because a clipped box loses its border
   and its shadow, and the rim and the lip are what make a node look like
   something you can press. */
var MAP_HEX="50,2 92.6,26 92.6,74 50,98 7.4,74 7.4,26";
var MAP_DIA="50,3 97,50 50,97 3,50";
function mapShape(k){
  if(k==="boss")
    return "<svg class='msvg' viewBox='0 0 100 100' aria-hidden='true'>"+
      "<polygon class='mlip' points='"+MAP_HEX+"'/>"+
      "<polygon class='mface' points='"+MAP_HEX+"'/>"+
      "<circle class='mring' cx='50' cy='50' r='58'/></svg>";
  if(k==="trial")
    /* The square on its point, inside a clock.

       It used to carry the sweeping plane as a bar drawn straight through it,
       and the bar overshot the shape on both sides - which does not read as a
       plane passing through, it reads as a strikethrough. A node with a line
       scored across it looks cancelled.

       So the sweep became the thing it actually is on a trial: a beat. An
       open ring with three pips on it, which is a clock face and is also the
       three cores, said for the first time - nothing on the map has ever
       mentioned that a trial is three crossings. The ring's gap sits at the
       top with a pip in it, the way a clock's twelve is its start.

       It is close to the boss's ring on purpose - both are landmarks and both
       are on a clock - and told apart by three things at once: the shape
       inside (diamond against hexagon), the colour (amber against violet) and
       motion. The boss's arcs are still and count its phases; this one turns,
       slowly, until you have beaten it. */
    return "<svg class='msvg' viewBox='0 0 100 100' aria-hidden='true'>"+
      "<polygon class='mlip' points='"+MAP_DIA+"'/>"+
      "<polygon class='mface' points='"+MAP_DIA+"'/>"+
      "<circle class='mring' cx='50' cy='50' r='60'/>"+
      "<circle class='mpip' cx='50' cy='-10' r='7'/>"+
      "<circle class='mpip' cx='102' cy='80' r='7'/>"+
      "<circle class='mpip' cx='-2' cy='80' r='7'/></svg>";
  return "";
}
/* The number in the node.

   THE TUTORIALS ARE NUMBERED BY POSITION, NOT BY NAME, and that is the whole
   reason this takes an ordinal. All three are called `00 — ...` on purpose:
   they sit outside the campaign's numbering, so they do not consume 01, 02
   and 03 and cannot renumber anything after them. The cost was that every
   node in PROLOGUE read "00", and once solved they all read the same tick -
   so the one section a first-time player is actually in was the one section
   whose order you could not see, while every other section spells it out.
   The name stays untouched, because a name is a save key; only the label
   counts. Single digits rather than `01`, so a glance never confuses a
   prologue node with a Fundamentals one. */
function mapNumeral(l,ord){
  if(l.tutorial)return String(ord);
  var m=l.name.match(/^(\d+)/); if(m)return m[1];
  var r=l.name.match(/^(?:TRIAL|BOSS)\s+([IVX]+)/); if(r)return r[1];
  return "·";
}

function levelPicker(){
  /* Opening the map while it is already open replaces the panel's innerHTML,
     and with it the canvas. Without this the old loop would still be running
     against the detached one - drawing nothing anybody can see, and refusing
     to start again because it thinks it is already going. */
  mapBgStop();
  if(mapSection===null)mapSection=mapSecOf(mapHere());
  var spans=sectionSpans();
  var here=mapHere(), total=0, done=0;
  for(var q=0;q<LEVELS.length;q++){
    if(LEVELS[q].tutorial)continue;
    total+=3;done+=starsForRecord(LEVELS[q],progress[LEVELS[q].name]);
  }

  var h="<canvas class='mbg' id='mBg' aria-hidden='true'></canvas>"+
        "<div class='mhead'><div class='mt'><b>Orthogonal</b>"+
        "<span id='mSub'></span></div>"+
        "<div class='mtot'>"+done+" ★</div>"+
        "<button class='mq' id='mHelp' aria-label='What the map means'>?</button>"+
        /* The way back to the game, in the header where it is always on
           screen. The row at the foot of the panel is below a trail that can
           be several screens long, so after scrolling down a section there
           was nothing in sight that looked like an exit and the map read as
           somewhere the game had left you. */
        "<button class='mq mx' id='mExit' aria-label='Back to the level'>✕</button></div>"+
        "<div class='mtabs' id='mTabs'></div>"+
        "<div class='mbody' id='mBody'><div class='mcard' id='mCard'></div>"+
        "<div id='mtrail'><svg></svg></div></div>"+
        "<div class='prow' style='padding:0 13px 11px;margin:0'>"+
        "<button id='pkBack'>BACK</button><button id='pkClose'>CLOSE</button></div>"+
        "<div class='msheet' id='mSheet'></div>";
  showPanel(h,"map");   // syncCorners() adds .map and hides the corner total
  bind("pkBack",menuPanel);
  bind("pkClose",hidePanel);
  bind("mExit",hidePanel);
  bind("mHelp",mapHelp);

  var cleared=0;
  for(var c=0;c<LEVELS.length;c++) if(mapTouched(c)) cleared++;
  $("mSub").textContent=cleared+" OF "+LEVELS.length+" CLEARED";

  mapTabs(spans);
  mapDraw(spans);
}

function mapTabs(spans){
  var t="";
  for(var n=0;n<SECTIONS.length;n++){
    var sp=spans[n], pct=sp.max?Math.round(sp.got/sp.max*100):0;
    var lk=sp.locked||SECTIONS[n].at>mapReach();
    var mst=sectionMastered(sp);
    t+="<button class='mtab"+(n===mapSection?" sel":"")+(lk?" lk":"")+
       (mst?" mst":"")+
       "' data-tab='"+n+"' style=\"--tabc:"+(SECTIONS[n].col||"#c3cde4")+
       ";--pct:"+(lk?0:pct)+"%\"><i></i>"+(lk?"🔒 ":mst?"★ ":"")+
       esc(SECTIONS[n].name.split(" ")[0])+"</button>";
  }
  $("mTabs").innerHTML=t;
  $("mTabs").querySelectorAll("[data-tab]").forEach(function(el){
    tap(el,function(){
      mapSection=+el.getAttribute("data-tab");
      mapTabs(sectionSpans());mapDraw(sectionSpans());
    });
  });
  var sel=$("mTabs").querySelector(".mtab.sel");
  if(sel&&sel.scrollIntoView)sel.scrollIntoView({inline:"center",block:"nearest"});
}

function mapDraw(spans){
  var n=mapSection, sp=spans[n], sec=SECTIONS[n];
  var lk=sp.locked||sec.at>mapReach();
  document.documentElement.style.setProperty("--sec",sec.col||"#c3cde4");
  /* Nothing to remember and nothing to reset: mapDraw rebuilds the trail's
     innerHTML every time it runs, so the CSS animations below start over by
     construction. That is why the celebration replays whenever you come back
     to a finished section rather than firing once and being gone. */
  var mast=sectionMastered(sp);

  var pct=sp.max?Math.round(sp.got/sp.max*100):0;
  var cleared=0,tot=0;
  for(var j=sp.from;j<=sp.to;j++){tot++;if(mapTouched(j))cleared++;}
  $("mCard").className="mcard"+(mast?" mst":"");
  $("mCard").innerHTML="<b>"+esc(sec.name)+
    (mast?"<em class='mmast'>ALL STARS</em>":"")+"</b><i>"+esc(sec.sub)+"</i>"+
    "<u class='mbar'><u style='width:"+(lk?0:pct)+"%'></u></u>"+
    "<div class='mf'><span>"+cleared+"/"+tot+" cleared</span>"+
    "<span>"+sp.got+"/"+sp.max+" ★</span></div>"+
    (mapSectionSkippable(n)
      ? "<button class='skipsec' id='mSecAd'>START THIS SECTION · WATCH 3 ADS</button>"
      : "");
  var sa=$("mSecAd");
  /* Opens the section's *first* level and nothing else, so the section is
     played from its beginning rather than handed over. */
  if(sa)tap(sa,function(){
    grantSkip(LEVELS[sec.at].name);
    mapTabs(sectionSpans());mapDraw(sectionSpans());
    flash("section opened · no stars for a skip");
  });

  /* Laid out from the last level down, so the first sits at the *bottom* and
     the boss at the top: progress climbs. Drawn in that order rather than
     mirrored afterwards, because everything hung off a node - its stars, its
     label - is positioned relative to the node and would have had to be
     un-mirrored one by one. */
  var trail=$("mtrail"), STEP=94, AMP=.30;
  var pts=[], html="", y=36;
  for(var i=sp.to;i>=sp.from;i--){
    var l=LEVELS[i], k=mapKind(l), off=Math.sin((i-sp.from)*.95)*AMP;
    /* In PREVIEW the nodes are drawn solved with their three stars, because a
       preview of the finished look that leaves every node dashed and locked
       is not a preview of the finished look. It is a drawing and nothing
       else: mapSheet() asks mapState() again when a node is tapped, so a
       level that is really locked still refuses to open. */
    var st=(mast&&masteryPreview())?"solved":mapState(i);
    /* A trial sits between a level and a boss in size as well as in weight,
       and it has to: its ring reaches past the shape, and at 58px the pips
       were landing on the trail. */
    var half=(k==="boss"?38:k==="trial"?34:k==="tut"?21:29);
    pts.push({y:y,off:off,i:i});
    /* The paint climbs the chain at a steady rate, so a node lights when the
       stroke reaches it: its delay is its position along the section, not its
       position in this loop, which runs the other way. */
    var lit=mast?(MAP_PAINT_LEAD+MAP_PAINT_MS*(sp.to-sp.from?(i-sp.from)/(sp.to-sp.from):0)):0;
    html+="<button class='mnode "+st+(k==="trial"?" mtrial":"")+(k==="boss"?" mboss":"")+
      (k==="tut"?" tut":"")+(mast?" mst":"")+"' data-node='"+i+"' data-off='"+off.toFixed(4)+
      "' style='top:"+y+"px;margin-left:"+(-half)+"px;margin-top:"+(-half)+"px"+
      (mast?";animation-delay:"+Math.round(lit)+"ms":"")+"'>"+
      mapShape(k)+"<span>"+
      (st==="locked"?"●":esc(mapNumeral(l,i-sp.from+1)))+
      "</span></button>";
    /* A solved node says so underneath, where every other section already
       puts its stars. A tutorial earns none, so it gets a tick in the same
       place - the tick used to sit *in* the node instead, which meant a
       finished prologue was three identical ticks with no order left in it. */
    if(st==="solved"){
      var sh="";
      if(k==="tut")sh="<u>✓</u>";
      else{
        var got=masteryPreview()&&mast?3:starsForRecord(l,progress[l.name]);
        for(var s2=0;s2<3;s2++)sh+="<u class='"+(s2<got?"":"off")+"'>★</u>";
      }
      html+="<div class='mstars' data-off='"+off.toFixed(4)+"' style='top:"+
            (y+half+7)+"px;transform:translateX(-50%)'>"+sh+"</div>";
    }
    var cap=(st==="locked"&&k==="lv")?"":esc(mapCaption(l));
    if(st==="skipped")cap=esc(mapCaption(l))+" <em>· skipped</em>";
    var right=off<0;
    html+="<div class='mcap"+(k==="boss"||k==="trial"?" big":"")+"' data-off='"+
      off.toFixed(4)+"' style='top:"+(y-8)+"px;transform:translateX("+
      (right?(half+13):(-half-13))+"px)"+(right?"":" translateX(-100%)")+"'>"+cap+"</div>";
    y+=STEP;
  }
  trail.style.height=(y-STEP+80)+"px";
  trail.className=mast?"mst":"";
  /* THE SECTION FILLS UP FROM THE BOTTOM WITH ITS OWN COLOUR, to the height
     of the stars taken. The trail runs first-level-at-the-foot to
     boss-at-the-top, so a level rising is progress climbing, and the
     waterline lands at roughly the point on the path you have reached -
     half the stars is half way up, and the last star floods it.

     Measured against the trail rather than the viewport on purpose: the
     panel scrolls, so a fill pinned to the screen would put the waterline
     somewhere different every time you dragged. Anchored here it marks a
     place on the path and stays there.

     Emitted only when there is something to draw, because the waterline is a
     border and a zero-height box still draws its border - an empty section
     would wear a bright line along its foot. */
  var fillPct=sp.max?(sp.got/sp.max*100):0;
  if(lk)fillPct=0;
  /* PREVIEW claims the section is finished, so the water has to agree with
     it. Left at the real figure, the preview showed a glowing mastered chain
     standing in a half-empty tank. */
  if(mast&&masteryPreview())fillPct=100;
  trail.innerHTML=(fillPct>0?"<div class='mfill'></div>":"")+"<svg></svg>"+html;
  mapLayout(pts,y-STEP+80,mast);
  mapFill(fillPct);
  if(mast){
    if(SFX.mastery)SFX.mastery();
    /* The ambient cubes are a canvas redrawing every frame behind all of
       this, and they are the one cost here that is buying nothing during a
       celebration - nobody is looking at the wallpaper while the section
       fills. Parked for the length of it and handed back afterwards, which
       is a frame budget the paint, fourteen node pops and the rising water
       are all sharing. */
    mapBgStop();
    clearTimeout(mapBgHold);
    mapBgHold=setTimeout(function(){
      if(panelKind==="map"&&panelOpen())mapBgStart();
    },MAP_PAINT_LEAD+MAP_PAINT_MS+700);
  }
  trail.querySelectorAll("[data-node]").forEach(function(el){
    tap(el,function(){mapSheet(+el.getAttribute("data-node"));});
  });
  mapFocus();
}
/* Land on where you are. The trail climbs, so the top of the scroll is the
   boss and the bottom is the first level - opening at scrollTop 0 would show
   every section by its ending. A section you have not started scrolls to its
   foot instead, which is where it begins. */
function mapFocus(){
  var body=$("mBody"); if(!body)return;
  var here=$("mtrail").querySelector(".mnode.here");
  if(here&&here.scrollIntoView){here.scrollIntoView({block:"center"});return;}
  body.scrollTop=body.scrollHeight;
}

/* The trail. Drawn solid behind you and dotted ahead, so how far you have got
   is legible without reading a single node. */
/* The fill is raised after the layout rather than written into the markup,
   because a height that is already correct when the element first paints has
   nothing to transition from. Two frames, not one: the first is the frame
   the browser is still assembling, so a height set in it can be collapsed
   into the initial style and the transition skipped. */
function mapFill(pct){
  var el=$("mtrail").querySelector(".mfill");
  if(!el)return;
  if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    el.style.height=pct+"%";return;
  }
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      if(el.parentNode)el.style.height=pct+"%";
    });
  });
}

/* How long the paint takes to climb a whole section, and how long it waits
   before starting. One pair of numbers in two places - the stroke animation
   in the CSS is written against them and the per-node delays above are
   computed from them. */
var MAP_PAINT_MS=1050, MAP_PAINT_LEAD=140;
function mapLayout(pts,H,mast){
  var trail=$("mtrail"), w=trail.clientWidth||480, cx=w/2, on="",off="";
  function px(pt){return cx+pt.off*(w*.5-44);}
  /* A MASTERED SECTION IS ONE STROKE, NOT A RUN OF SEGMENTS, and it has to
     be: the paint is a dashoffset sweeping along a single path, and a path
     built per-gap would sweep every gap at once. Traversed from the *end* of
     `pts` because the trail is drawn top-down while the campaign runs
     bottom-up - the colour has to climb the way the player did. */
  if(mast&&pts.length>1){
    var d="M "+px(pts[pts.length-1]).toFixed(1)+" "+pts[pts.length-1].y;
    for(var m=pts.length-2;m>=0;m--)
      d+=" L "+px(pts[m]).toFixed(1)+" "+pts[m].y;
    var svg0=trail.querySelector("svg");
    svg0.setAttribute("viewBox","0 0 "+w+" "+H);
    svg0.setAttribute("width",w);svg0.setAttribute("height",H);
    svg0.innerHTML="<path class='mpaint' d='"+d+"' fill='none' stroke='"+
      (SECTIONS[mapSection].col||"#35c2a5")+"' stroke-width='5' "+
      "stroke-linecap='round' stroke-linejoin='round'/>";
    var pel=svg0.querySelector(".mpaint"), len=pel.getTotalLength();
    /* Set as inline style so the keyframe's implicit `from` is this value;
       the animation only has to name where it ends. */
    pel.style.strokeDasharray=len;
    pel.style.strokeDashoffset=len;
    trail.querySelectorAll("[data-off]").forEach(function(el){
      el.style.left=px({off:parseFloat(el.getAttribute("data-off"))})+"px";
    });
    return;
  }
  /* One subpath per gap, rather than two long polylines. Building them as
     polylines meant the first vertex decided whether the string opened with a
     moveto, so a section whose opening node you had not reached yet produced
     a path starting with "L" - which is not a path, and SVG simply drops it.
     Per-segment cannot have that failure, and it also stops a lit run jumping
     across a level you skipped in the middle of one. */
  for(var n=1;n<pts.length;n++){
    var a=pts[n-1], b=pts[n];
    var ax=cx+a.off*(w*.5-44), bx=cx+b.off*(w*.5-44);
    var seg="M "+ax.toFixed(1)+" "+a.y+" L "+bx.toFixed(1)+" "+b.y;
    /* A segment is lit when the *earlier* of its two levels has been dealt
       with, so the lit run always trails behind you. Decided by index rather
       than by draw order, because the trail is drawn top-down while the
       campaign runs bottom-up and the two disagree about which end is first. */
    if(mapTouched(Math.min(a.i,b.i)))on+=seg; else off+=seg;
  }
  var svg=trail.querySelector("svg");
  svg.setAttribute("viewBox","0 0 "+w+" "+H);
  svg.setAttribute("width",w);svg.setAttribute("height",H);
  svg.innerHTML=(off?"<path d='"+off+"' fill='none' stroke='rgba(195,205,228,.16)' "+
      "stroke-width='3' stroke-linecap='round' stroke-dasharray='2 9'/>":"")+
    // The lit trail is the section's colour too, so how far you have got and
    // where you are reading both come from one hue.
    (on?"<path d='"+on+"' fill='none' stroke='"+
      (SECTIONS[mapSection].col||"#35c2a5")+"' stroke-opacity='.42' "+
      "stroke-width='3.5' stroke-linecap='round'/>":"");
  trail.querySelectorAll("[data-off]").forEach(function(el){
    el.style.left=(cx+parseFloat(el.getAttribute("data-off"))*(w*.5-44))+"px";
  });
}

function mapSheetClose(){$("mSheet").classList.remove("on");}

function mapSheet(i){
  var l=LEVELS[i], k=mapKind(l), st=mapState(i);
  var kind=k==="boss"?"BOSS · FOUR PHASES":
           k==="trial"?"TRIAL · THREE CORES, ON A CLOCK":
           k==="tut"?"TUTORIAL · UNSCORED":"LEVEL";
  var meta=st==="solved"
      ? (k==="tut"?"<span class='g'>done</span>":
         "<span class='g'>"+starGlyphs(starsForRecord(l,progress[l.name]))+"</span> best so far")
    : st==="skipped"?"<span class='a'>skipped</span> · no stars yet, still playable"
    : st==="here"?"you are here"
    : st==="open"?"open — not played yet"
    : "locked — clear what is in front of it, or skip ahead";

  var acts,note;
  if(st==="locked"&&mapSkippable(i)){
    var ads=mapAds(k);
    acts="<button class='ad' id='mAd'>OPEN THE BOSS · WATCH "+ads+" AD"+
         (ads>1?"S":"")+"</button><button class='qt' id='mNo'>NOT NOW</button>";
    note="This opens the boss and <b>nothing else</b> — the levels before it "+
         "stay where they are, still to play. It awards <b>no stars</b>. Ads "+
         "buy progress, never score.";
  }else if(st==="locked"){
    acts="<button class='qt' id='mNo'>CLOSE</button>";
    note=(k==="boss")
      ? "Get into this section first — the boss opens once you are working "+
        "through the levels that lead to it."
      : "Clear the levels in front of it. Only the <b>boss</b> that closes a "+
        "section, or the start of the next section, can be opened with an ad — "+
        "so a skip carries you past a wall, never past the puzzles.";
  }else{
    acts="<button class='go' id='mPlay'>"+(st==="solved"?"PLAY AGAIN":"PLAY")+
         "</button><button class='qt' id='mNo'>CLOSE</button>";
    note=st==="skipped"?"You have not beaten this one yet. Its stars are still on the table."
      :k==="boss"?"No goal here. Four phases, and clearing the board begins the next."
      :k==="trial"?"Three cores, a sweeping plane, three lives. Scored on lives."
      :(st==="solved"&&starsForRecord(l,progress[l.name])<3)
        ?"Three stars is the solver's own move count, so <b>3★ means optimal</b>.":"";
  }
  $("mSheet").innerHTML="<div class='mk"+(k==="boss"?" b":k==="trial"?" t":"")+"'>"+
    kind+"</div><h4>"+esc(l.name)+"</h4><div class='mm'>"+meta+"</div>"+
    "<div class='ma'>"+acts+"</div>"+(note?"<div class='mn'>"+note+"</div>":"");
  $("mSheet").classList.add("on");
  bind("mNo",mapSheetClose);
  var play=$("mPlay");
  if(play)tap(play,function(){
    mapSheetClose();hidePanel();playSource="builtin";enterPlay(LEVELS[i],i,false);
  });
  var ad=$("mAd");
  /* No ad provider is wired yet, so this does the unlock directly. When one
     is, its completion callback is the only thing that should call
     grantSkip() - everything else here stays exactly as it is. */
  if(ad)tap(ad,function(){
    grantSkip(l.name);
    mapSection=mapSecOf(i);
    mapTabs(sectionSpans());mapDraw(sectionSpans());
    mapSheet(i);
    flash("opened · no stars for a skip");
  });
}

function mapHelp(){
  var row=function(cls,glyph,body){
    return "<div class='mk2 "+cls+"'>"+glyph+"</div><div class='md'>"+body+"</div>";
  };
  $("mSheet").innerHTML="<div class='mk'>THE MAP</div><h4>What the map means</h4>"+
    "<div class='mlegend'>"+
    row("solved","7","<b>Solved.</b> Stars sit underneath — three is the solver's own move count, so 3★ is optimal.")+
    row("here","8","<b>Where you are.</b> The one that breathes.")+
    row("open","9","<b>Open.</b> You can always reach a couple of levels ahead, so one hard puzzle never stops you.")+
    row("locked","●","<b>Locked.</b> Clear what is in front of it — or skip ahead with an ad.")+
    row("skipped","●","<b>Skipped.</b> The door opened, the level did not. Its stars are still there to take.")+
    row("mtrial",mapShape("trial")+"<span>I</span>",
        "<b>Trial</b> \u2014 a square on its point, with the plane about to sweep through it. Three cores, on a clock.")+
    row("mboss",mapShape("boss")+"<span>I</span>",
        "<b>Boss</b> \u2014 a cube seen corner-on. The four arcs are its four phases. Closes the section.")+
    "</div><div class='mn'>Ads buy <b>progress, never score</b>. A skip awards no "+
    "stars and the level stays on the map, playable, whenever you want it.</div>"+
    "<div class='ma'><button class='qt' id='mNo'>CLOSE</button></div>";
  $("mSheet").classList.add("on");
  bind("mNo",mapSheetClose);
}

function legendPanel(){
  showPanel("<h3>THE PIECES</h3>"+
    "<div class='leg'><i style='background:#5a6d94'></i><span><b>Stone</b> \u2014 "+
      "solid, and it casts into the plane when you fold.</span></div>"+
    "<div class='leg'><i style='background:#7fc4d8;opacity:.65'></i><span><b>Glass</b> \u00b7 ring \u2014 "+
      "solid to stand on, but casts nothing. Ground in the volume, a hole in the plane.</span></div>"+
    "<div class='leg'><i style='background:#d9a441'></i><span><b>Anchor</b> \u00b7 gem \u2014 "+
      "claims you when you unfold, instead of the block nearest the camera. "+
      "Turning reaches either <i>end</i> of a column of candidates; only an "+
      "anchor reaches one in the <i>middle</i>. It also holds a <b>crate</b> "+
      "fast: once a crate rests on amber it can never be shoved again, so "+
      "where you park one is a decision you cannot take back.</span></div>"+
    "<div class='leg'><i style='background:#9b7fd4'></i><span><b>Crate</b> \u00b7 cross \u2014 "+
      "walk into it and it slides. It casts like stone, so moving it in the volume "+
      "changes the shape of the plane. The only thing here you can change.</span></div>"+
    "<div class='leg'><i style='background:#8a3040'></i><span><b>Spikes</b> \u00b7 four points \u2014 "+
      "solid, and they cast like stone, but standing on one kills you. A spike "+
      "buried deep in the world poisons the whole column it folds into: ground "+
      "that is safe in the volume can be lethal in the plane.</span></div>"+
    "<div class='leg'><i style='background:#f2d16b'></i><span><b>Key</b> \u2014 "+
      "collected in the <i>plane</i>, on the square it folds into. Which axis "+
      "you fold along decides which keys you can reach.</span></div>"+
    "<div class='leg'><i style='background:#d6336c'></i><span><b>You</b> \u2014 "+
      "the plate underneath shows what you're standing on.</span></div>"+
    "<div class='leg'><i style='background:#35c2a5'></i><span><b>Goal</b> \u2014 "+
      "you must arrive in the volume, not the plane.</span></div>"+
    "<div class='leg'><i style='background:transparent;border:1px solid var(--rule)'></i>"+
      "<span><b>The eye button</b> \u2014 hold it (or Shift) to lean the camera "+
      "and read depth. It costs no move. Blocks sharing your depth stay bright; "+
      "everything further back fades.</span></div>"+
    "<div class='prow'><button id='lgBack'>BACK</button></div>");
  bind("lgBack",menuPanel);
}

function libraryPanel(){
  var sorted=library.slice().sort(function(a,b){return a.score-b.score;});
  var html="<h3>LIBRARY \u2014 "+library.length+" LEVEL"+(library.length===1?"":"S")+"</h3>";
  if(!library.length){
    html+="Nothing saved yet. Build a level, hit VERIFY, then SAVE.<br><br>";
  } else {
    html+="Sorted easiest first, by the solver's own numbers.<br>";
    for(var i=0;i<sorted.length;i++){
      var lv=sorted[i];
      html+="<div class='lrow'><span class='lname'>"+esc(lv.name)+"</span>"+
        "<span class='mono'>"+tierOf(lv.score)+" &middot; "+lv.moves+" moves"+
        (lv.needsRot?" &middot; rot":"")+"</span>"+
        "<span class='lbtns'>"+
          "<button class='mini' data-play='"+lv.id+"'>PLAY</button>"+
          "<button class='mini' data-edit='"+lv.id+"'>EDIT</button>"+
          "<button class='mini' data-del='"+lv.id+"'>\u00d7</button>"+
        "</span></div>";
    }
    html+="<div class='prow'><button id='pCampaign'>PLAY ALL IN ORDER</button></div>";
  }
  html+="<div class='prow'><button id='pCompose'>COMPOSE FROM A SOLUTION</button></div>";
  html+="<div class='prow'><button id='pProj'>PROJECT FILE (ALL LEVELS)</button></div>";
  html+="<div class='prow'><button id='pIO'>THIS LEVEL</button>"+
        "<button id='pNew'>NEW LEVEL</button>"+
        "<button id='pClose4'>CLOSE</button></div>";
  showPanel(html);

  var p=$("panel");
  p.querySelectorAll("[data-play]").forEach(function(el){
    tap(el,function(){startLibrary(el.getAttribute("data-play"));});
  });
  p.querySelectorAll("[data-edit]").forEach(function(el){
    tap(el,function(){
      var lv=findLevel(el.getAttribute("data-edit"));
      if(!lv)return;
      snapshot();
      custom.name=lv.name;custom.blocks=lv.blocks.map(function(v){return v.slice();});
      custom.start=lv.start.slice();custom.goal=lv.goal.slice();
      custom.rotate=lv.rotate;
      ghosted.clear();R=makeRules(custom);syncMeshes();hidePanel();
      flash("loaded "+lv.name);
    });
  });
  p.querySelectorAll("[data-del]").forEach(function(el){
    tap(el,function(){
      var id=el.getAttribute("data-del");
      library=library.filter(function(x){return x.id!==id;});
      libSave().then(libraryPanel);
    });
  });
  bind("pCampaign",function(){startLibrary(null);});
  bind("pCompose",enterCompose);
  bind("pProj",projectPanel);
  bind("pIO",ioPanel);
  bind("pNew",function(){
    snapshot();custom.blocks=[];custom.start=[0,1,0];custom.goal=[3,1,0];
    custom.name="Untitled";ghosted.clear();
    R=makeRules(custom);syncMeshes();hidePanel();
  });
  bind("pClose4",hidePanel);
}

function findLevel(id){
  for(var i=0;i<library.length;i++) if(library[i].id===id) return library[i];
  return null;
}
function sortedLibrary(){
  return library.slice().sort(function(a,b){return a.score-b.score;});
}
function startLibrary(id){
  var s=sortedLibrary();
  if(!s.length){flash("library is empty");return;}
  libIndex=0;
  if(id){ for(var i=0;i<s.length;i++) if(s[i].id===id) libIndex=i; }
  playSource="library";
  var lv=s[libIndex];
  enterPlay({name:lv.name,hint:tierOf(lv.score)+" \u00b7 "+lv.moves+" moves",
    blocks:lv.blocks,keys:lv.keys||[],start:lv.start,goal:lv.goal,rotate:lv.rotate},undefined,false);
}

function projectPanel(){
  showPanel("<h3>PROJECT FILE</h3>"+
    "Your whole library as one block of text. Copy it somewhere safe — "+
    "this is what carries the project between sessions or devices."+
    "<textarea id='pj'></textarea>"+
    "<div class='prow'><button id='pjAdd'>IMPORT (ADD)</button>"+
    "<button id='pjRep'>IMPORT (REPLACE)</button>"+
    "<button id='pjBack'>BACK</button></div>");
  $("pj").value=JSON.stringify({format:"orthogonal-project-1",levels:library});
  function take(replace){
    try{
      var o=JSON.parse($("pj").value);
      var incoming=o.levels||o;
      if(!incoming.length)throw 0;
      for(var i=0;i<incoming.length;i++)
        if(!incoming[i].blocks||!incoming[i].start||!incoming[i].goal)throw 0;
      // recompute stats so imported levels sort correctly alongside yours
      for(var j=0;j<incoming.length;j++){
        var st=statsFor(incoming[j]);
        if(st.ok){incoming[j].score=st.score;incoming[j].moves=st.moves;
          incoming[j].needsRot=st.needsRot;incoming[j].flattens=st.flattens;}
        if(!incoming[j].id)incoming[j].id="l"+Date.now()+"_"+j;
      }
      library=replace?incoming:library.concat(incoming);
      libSave().then(function(){libraryPanel();flash("library: "+library.length+" levels");});
    }catch(e){flash("that isn't a valid project file");}
  }
  bind("pjAdd",function(){take(false);});
  bind("pjRep",function(){take(true);});
  bind("pjBack",libraryPanel);
}

function ioPanel(){
  var data=JSON.stringify({name:custom.name,hint:custom.hint,blocks:custom.blocks,
    keys:custom.keys||[],start:custom.start,goal:custom.goal,rotate:custom.rotate});
  showPanel("<h3>IMPORT / EXPORT</h3>"+
    "Text for the level you're editing. Paste one in and press LOAD."+
    "<textarea id='io'></textarea>"+
    "<div class='prow'><button id='pLoad'>LOAD</button>"+
    "<button id='pBack'>BACK</button></div>");
  $("io").value=data;
  bind("pLoad",function(){
    try{
      var o=JSON.parse($("io").value);
      if(!o.blocks||!o.start||!o.goal)throw 0;
      snapshot();
      custom.blocks=o.blocks;custom.start=o.start;custom.goal=o.goal;
      custom.keys=o.keys||[];
      custom.name=o.name||"Untitled";custom.hint=o.hint||"";
      custom.rotate=o.rotate!==false;
      ghosted.clear();R=makeRules(custom);initDynamic();syncMeshes();hidePanel();flash("loaded");
    }catch(err){flash("that isn't valid level data");}
  });
  bind("pBack",libraryPanel);
}

function esc(s){
  return String(s).replace(/[&<>"]/g,function(c){
    return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c];
  });
}

function enterEditor(){
  app="edit";fromEditor=false;
  L=custom;R=makeRules(custom);
  initDynamic();
  flat=false;flatTarget=0;flatT=0;
  $("won").classList.remove("on");
  $("playBarWrap").classList.remove("on");
  $("playBar").classList.remove("on");
  $("composeBarWrap").classList.remove("on");$("composeBar").classList.remove("on");
  $("editBarWrap").classList.add("on");
  $("editBar").classList.add("on");
  syncMeshes();buildGrid();syncHud();onResize();
}
function enterPlay(level,idx,fromEd){
  app="play";fromEditor=!!fromEd;
  hidePanel();ghosted.clear();
  $("editBarWrap").classList.remove("on");
  $("editBar").classList.remove("on");
  $("composeBarWrap").classList.remove("on");$("composeBar").classList.remove("on");
  $("playBarWrap").classList.add("on");
  $("playBar").classList.add("on");
  loadLevel(level,idx);onResize();
}
