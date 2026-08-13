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
    "<h3 id='wHead'></h3>"+
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
  $("wHead").textContent="WARDROBE \u00b7 "+shards()+" \u2605 TO SPEND";
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
  showPanel("<h3>MENU</h3>"+
    "<div class='prow'><button id='mRestart'>RESTART LEVEL</button>"+
    "<button id='mLevels'>LEVELS</button></div>"+
    "<div class='srow'><label>Volume</label>"+
      "<input type='range' id='mVol' min='0' max='100' value='"+vol+"'>"+
      "<span id='mVolV'>"+vol+"%</span></div>"+
    "<div class='srow'><label>Brightness</label>"+
      "<input type='range' id='mBri' min='60' max='140' value='"+bri+"'>"+
      "<span id='mBriV'>"+bri+"%</span></div>"+
    "<div class='crow'><label>Controls</label><span class='seg'>"+
      seg("mUi","full","ON-SCREEN",settings.ui)+
      seg("mUi","compact","COMPACT",settings.ui)+
      seg("mUi","none","HIDDEN",settings.ui)+"</span></div>"+
    "<div class='note'>COMPACT drops the d-pad; HIDDEN clears the screen. "+
      "Either way: <code>swipe</code> or arrows/WASD to move, "+
      "<code>space</code> to change dimension, <code>Q</code>/<code>E</code> to turn. "+
      "With the bar hidden, <code>tap</code> the world to change dimension and "+
      "<code>two-finger tap</code> to turn.</div>"+
    "<div class='prow'><button id='mLegend'>WHAT THE PIECES DO</button>"+
    "<button id='mTut'>REPLAY TUTORIAL</button></div>"+
    "<div class='prow'><button id='mReset'>RESET SETTINGS</button></div>"+
    "<div class='prow'><button id='mEditor'>LEVEL EDITOR</button>"+
    "<button id='mClose'>CLOSE</button></div>","menu");
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
  bind("mRestart",function(){hidePanel();resetLevel();});
  ["full","compact","none"].forEach(function(m){
    bind("mUi_"+m,function(){
      settings.ui=m;applyUI();saveSettings();syncHud();onResize();menuPanel();
    });
  });
  bind("mTut",function(){
    hidePanel();playSource="builtin";enterPlay(LEVELS[0],0,false);
  });
  bind("mReset",function(){
    settings.volume=defaultVolume();settings.volTouched=false;
    settings.brightness=1;settings.ui="full";
    muted=false;
    applyVolume();
    applyBrightness();applyUI();saveSettings();syncHud();
    flash("settings reset");menuPanel();
  });
  bind("mLevels",levelPicker);
  bind("mLegend",legendPanel);
  bind("mEditor",function(){hidePanel();enterEditor();});
  bind("mClose",hidePanel);
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
// The furthest index you may open.
function mapReach(){
  var last=-1;
  for(var i=0;i<LEVELS.length;i++) if(mapTouched(i)) last=i;
  return last+1+MAP_WINDOW;
}
// Where the pink node goes: the first level you have not dealt with.
function mapHere(){
  for(var i=0;i<LEVELS.length;i++) if(!mapTouched(i)) return i;
  return LEVELS.length-1;
}
function mapLocked(i){
  if(mapTouched(i))return false;
  var s=SECTIONS[mapSecOf(i)];
  if(s&&s.locked&&!sectionsUnlocked())return true;
  return i>mapReach();
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
function mapNumeral(l){
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
    t+="<button class='mtab"+(n===mapSection?" sel":"")+(lk?" lk":"")+
       "' data-tab='"+n+"' style=\"--tabc:"+(SECTIONS[n].col||"#c3cde4")+
       ";--pct:"+(lk?0:pct)+"%\"><i></i>"+(lk?"🔒 ":"")+
       esc(SECTIONS[n].name.split(" ")[0])+"</button>";
  }
  $("mTabs").innerHTML=t;
  $("mTabs").querySelectorAll("[data-tab]").forEach(function(el){
    tap(el,function(){
      mapSection=+el.getAttribute("data-tab");
      mapTabs(sectionSpans());mapDraw(sectionSpans());
      $("mBody").scrollTop=0;
    });
  });
  var sel=$("mTabs").querySelector(".mtab.sel");
  if(sel&&sel.scrollIntoView)sel.scrollIntoView({inline:"center",block:"nearest"});
}

function mapDraw(spans){
  var n=mapSection, sp=spans[n], sec=SECTIONS[n];
  var lk=sp.locked||sec.at>mapReach();
  document.documentElement.style.setProperty("--sec",sec.col||"#c3cde4");

  var pct=sp.max?Math.round(sp.got/sp.max*100):0;
  var cleared=0,tot=0;
  for(var j=sp.from;j<=sp.to;j++){tot++;if(mapTouched(j))cleared++;}
  $("mCard").innerHTML="<b>"+esc(sec.name)+"</b><i>"+esc(sec.sub)+"</i>"+
    "<u class='mbar'><u style='width:"+(lk?0:pct)+"%'></u></u>"+
    "<div class='mf'><span>"+cleared+"/"+tot+" cleared</span>"+
    "<span>"+sp.got+"/"+sp.max+" ★</span></div>";

  var trail=$("mtrail"), STEP=94, AMP=.30;
  var pts=[], html="", y=36;
  for(var i=sp.from;i<=sp.to;i++){
    var l=LEVELS[i], k=mapKind(l), st=mapState(i), off=Math.sin((i-sp.from)*.95)*AMP;
    var half=(k==="boss"?38:k==="tut"?21:29);
    pts.push({y:y,off:off,on:mapTouched(i)});
    html+="<button class='mnode "+st+(k==="trial"?" trial":"")+(k==="boss"?" boss":"")+
      (k==="tut"?" tut":"")+"' data-node='"+i+"' data-off='"+off.toFixed(4)+
      "' style='top:"+y+"px;margin-left:"+(-half)+"px;margin-top:"+(-half)+"px'>"+
      (st==="locked"?"●":(st==="solved"&&k==="tut"?"✓":esc(mapNumeral(l))))+
      "</button>";
    if(st==="solved"&&k!=="tut"){
      var got=starsForRecord(l,progress[l.name]), sh="";
      for(var s2=0;s2<3;s2++)sh+="<u class='"+(s2<got?"":"off")+"'>★</u>";
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
  trail.innerHTML="<svg></svg>"+html;
  mapLayout(pts,y-STEP+80);
  trail.querySelectorAll("[data-node]").forEach(function(el){
    tap(el,function(){mapSheet(+el.getAttribute("data-node"));});
  });
}

/* The trail. Drawn solid behind you and dotted ahead, so how far you have got
   is legible without reading a single node. */
function mapLayout(pts,H){
  var trail=$("mtrail"), w=trail.clientWidth||480, cx=w/2, on="",off="";
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
    if(a.on)on+=seg; else off+=seg;
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
  if(st==="locked"){
    var ads=mapAds(k);
    acts="<button class='ad' id='mAd'>SKIP AHEAD · WATCH "+ads+" AD"+
         (ads>1?"S":"")+"</button><button class='qt' id='mNo'>NOT NOW</button>";
    note="Skipping opens the door, not the level. It awards <b>no stars</b> and "+
         "the level stays here to beat properly whenever you want. Ads buy "+
         "progress, never score.";
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
    row("trial","I","<b>Trial</b> — the bar is the plane about to sweep through. Three cores, on a clock.")+
    row("boss","I","<b>Boss</b> — the ring is its four phases. Closes the section.")+
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
