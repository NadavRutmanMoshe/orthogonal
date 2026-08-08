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
    $("mVolV").textContent=v.value+"%";
    if(masterGain)masterGain.gain.value=masterLevel();
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
    settings.volume=.7;settings.brightness=1;settings.ui="full";
    muted=false;
    if(masterGain)masterGain.gain.value=masterLevel();
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
function levelPicker(){
  var solved=0;
  for(var q=0;q<LEVELS.length;q++) if(progress[LEVELS[q].name]!==undefined) solved++;
  var html="<h3>SELECT LEVEL \u00b7 "+solved+"/"+LEVELS.length+" SOLVED</h3>";
  var spans=sectionSpans(), spanAt={};
  spans.forEach(function(sp){spanAt[sp.from]=sp;});
  for(var i=0;i<LEVELS.length;i++){
    var sp=spanAt[i];
    if(sp){
      var pct=sp.max?Math.round(sp.got/sp.max*100):0;
      html+="<div class='chap"+(sp.locked?" locked":"")+"'>"+sp.sec.name+
        (sp.locked?" \u00b7 LOCKED":"")+
        "<b class='secbar'><i style='width:"+(sp.locked?0:pct)+"%'></i></b>"+
        "<span>"+(sp.locked
          ? "beat every boss to open these"
          : sp.sec.sub+"  \u00b7  "+sp.done+"/"+sp.n+" solved, "+
            sp.got+"/"+sp.max+" \u2605")+"</span></div>";
      if(sp.locked){i=sp.to;continue;}      // draw the header, hide the rows
    }
    var tut=!!LEVELS[i].tutorial;
    var boss=!!LEVELS[i].boss;
    var st=(tut||boss)?{ok:false}:statsCached(LEVELS[i]);
    var mark=(playSource==="builtin"&&i===lvIndex)?" \u25c0":"";
    var done=progress[LEVELS[i].name];
    var badge=done===undefined?"":
      (tut?"<span class='ok'>\u2713</span>"
         :"<span class='ok'>"+starGlyphs(starsForRecord(LEVELS[i],done))+"</span>");
    var note=tut?"tutorial":
      boss?(LEVELS[i].boss.hp+" hits"):
      (st.ok?st.flattens+(st.flattens===1?" fold":" folds"):"?");
    html+="<div class='lrow"+(mark?" here":"")+(boss?" bossrow":"")+
      "'><span class='lname'>"+
      esc(LEVELS[i].name)+mark+"</span>"+
      "<span class='mono'>"+note+
      (badge?" &middot; ":"")+badge+"</span>"+
      "<span class='lbtns'><button class='mini' data-lv='"+i+"'>PLAY</button></span></div>";
  }
  html+="<div class='prow'><button id='pkBack'>BACK</button>"+
        "<button id='pkClose'>CLOSE</button></div>";
  showPanel(html);
  bind("pkBack",menuPanel);
  // jump to the level you're actually on instead of making you scroll
  setTimeout(function(){
    var here=$("panel").querySelector(".lrow.here");
    if(here&&here.scrollIntoView)
      here.scrollIntoView({block:"center"});
  },0);
  $("panel").querySelectorAll("[data-lv]").forEach(function(el){
    tap(el,function(){
      var i=+el.getAttribute("data-lv");
      hidePanel();playSource="builtin";enterPlay(LEVELS[i],i,false);
    });
  });
  bind("pkClose",hidePanel);
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
