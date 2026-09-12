"use strict";
/* I'm Just A Cube - 16-panels.js
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
var wardSel={shape:null,color:null,deal:null,world3:null,world2:null};
var buyArmed=null;   // the id whose BUY has been tapped once, awaiting a second

/* THE DEALS SHELF IS A VIEW OF THE SHAPE CATALOGUE, not a fourth catalogue.
   Everything on it is a shape, so it equips as a shape, previews as a shape
   and is stored in `wardrobe.shape` like any other - the tab only decides
   which slice of SKIN_SHAPES the grid is showing. That is what keeps a bought
   item from needing a second code path anywhere else in the game. */
function isDeal(it){return !!(it&&it.deal);}
/* WHAT IT COSTS, WITH THE OLD PRICE STILL VISIBLE when a pass already owned
   has taken most of it off. A discount nobody can see is a discount nobody
   was given: the struck-through number is the whole of what says "you have
   already paid for part of this". */
function dealPriceSay(it){
  var p="$"+esc(dealPrice(it));
  return dealDiscounted(it)
    ? "<i class='wwas'>$"+esc(it.usd)+"</i>"+p
    : p;
}
function wardList(t){
  /* THE PASSES FIRST, THEN THE SHAPES SOLD FOR MONEY. Two lists rather than
     one because a pass is not a shape - it does not equip and it does not
     stand in the case - but they belong on the same shelf, which is the one
     shelf in the game that is not paid for in stars. */
  if(t==="deal") return PASSES.concat(SKIN_SHAPES.filter(isDeal));
  if(t==="shape")return SKIN_SHAPES.filter(function(it){return !isDeal(it);});
  return t==="color" ?SKIN_COLORS:
         t==="world3"?WORLDS3D:WORLDS2D;
}
function wardEquipped(t){
  return (t==="shape"||t==="deal")?wardrobe.shape:
         t==="color" ?wardrobe.color:
         t==="world3"?wardrobe.world3:wardrobe.world2;
}
function wardSelected(t){
  if(!wardSel[t])wardSel[t]=wardEquipped(t);
  /* AND IT HAS TO BE ON THIS SHELF. The deals tab is a slice of the shape
     catalogue, so its equipped id is whatever shape you are wearing - which
     is almost never one of the deals. Left alone, the panel opened showing
     the first deal's name over the equipped cube's state and called it
     "equipped". Falls back to the first thing on the shelf instead. */
  var list=wardList(t), i;
  for(i=0;i<list.length;i++) if(list[i].id===wardSel[t]) return wardSel[t];
  wardSel[t]=list.length?list[0].id:wardSel[t];
  return wardSel[t];
}
function wardrobePanel(tab){
  /* TWO TABS, NOT FOUR. The worlds came off the wardrobe when the sections
     took ownership of how the world looks: a section picks the sky, the
     stone and the paper now, so a world tab was selling a look the campaign
     immediately overwrote. The catalogues, the equipped ids and
     migrateWorlds() are all left alone - the equipped world is still what
     applyPalette() writes underneath a section, and a save that bought one
     keeps it. Only the two tabs are gone.

     Guarded rather than trusted: callers hand a tab name in, and a stale
     "world3" would land the grid on a catalogue with no tab to leave it by. */
  wardTab=(tab==="color"||tab==="deal")?tab:"shape";
  buyArmed=null;
  showPanel(
    "<div class='phead'><div class='pt'><b>Wardrobe</b>"+
      "<span id='wHead'></span></div>"+
      "<div class='mtot' id='wBal'></div>"+
      "<button class='mq mx' id='wX' aria-label='Back to the level'>✕</button></div>"+
    "<div class='tabs'>"+
      "<button class='tab' id='wS'>SHAPE</button>"+
      "<button class='tab' id='wC'>COLOUR</button>"+
      /* The tag says what the shelf is before the word is read, which is the
         same reason the ad buttons carry a screen: a price is the one thing
         on this panel that is not paid for in stars. */
      "<button class='tab tdeal' id='wD'>"+tagIcon()+"DEALS</button>"+
    "</div>"+
    /* THE SHELF ON TOP, THE THING ITSELF UNDERNEATH.

       It was two columns - a scrolling list of tiles down the left and a
       narrow case pinned to 40% of the width on the right - and at phone
       width that gave the case about 130px to stand a piece in. The piece is
       what is being sold; it was the smallest thing on the shelf.

       Stacked, the case gets the panel's whole width and roughly half again
       the height, the grid goes to three columns because it is no longer
       sharing the row, and the primary action lands at the bottom of the
       screen where a thumb already is. That is the shape almost every mobile
       shop uses, and the reason is the one above: browse at the top, look at
       the bottom, buy under your thumb. */
    "<div class='wbody'>"+
      /* THE STAGE IS FIRST, AND IT NEVER MOVES. That is the whole reason this
         order exists: with the piece at the bottom, selecting something you do
         not own grew the block under it - a BUY cap, an ad row, the note about
         there being no store - and the stage slid up the screen every time.
         Reported exactly that way. Fixed height, pinned to the top, and the
         LIST is what absorbs the change: it is `flex:1 1 auto` and scrolls
         inside itself, so the text below can be one line or six and the thing
         you are looking at does not twitch.

         Three siblings rather than a stage that owns its own caption, because
         the caption has to be able to sit on the other side of the grid. */
      "<div class='wcase'>"+
        /* The canvas is wrapped so the stage can carry a floor and a caption:
           a canvas is a replaced element and will not take ::before/::after. */
        "<div class='wglass'><canvas id='wCase3d' class='wcanvas'></canvas>"+
          "<i class='wfloor'></i>"+
          "<span class='wturn'>DRAG TO TURN</span></div>"+
      "</div>"+
      "<div class='wlist'><div class='grid' id='wGrid'></div></div>"+
      "<div id='wMeta'></div>"+
    "</div>"+
    "<div class='pfoot'><button id='wHome'>"+homeIcon()+"HOME</button>"+
      "<button id='wBack'>CLOSE</button></div>","wardrobe");
  bind("wS",function(){wardTabTo("shape");});
  bind("wC",function(){wardTabTo("color");});
  bind("wD",function(){wardTabTo("deal");});
  bind("wBack",hidePanel);
  bind("wHome",function(){hidePanel();homeShow();});
  bind("wX",hidePanel);
  wardRefresh();
  // The canvas has no measurable size until the panel has been laid out, so
  // the case starts a frame late. Re-check the panel on the way in: closing
  // the wardrobe inside that frame would otherwise start a context that the
  // already-finished previewStop() never gets the chance to release.
  requestAnimationFrame(function(){
    var cv=$("wCase3d");
    if(!cv||panelKind!=="wardrobe"||!panelOpen())return;
    /* ALREADY RUNNING ON THIS CANVAS: leave it alone. Open the wardrobe
       twice inside one frame - a double tap on the corner button will do it -
       and both openings queue this callback against the same new canvas. The
       second previewStart() calls previewStop(), which ends the context with
       loseContext() on that very canvas, and a canvas whose context was lost
       that way returns null from getContext() forever after; three.js then
       dies reading `precision` off the null. Same trap homeCase() sidesteps
       by replacing its element - this one just declines to rebuild. */
    if(typeof pv!=="undefined"&&pv&&pv.canvas===cv){wardPreview();return;}
    previewStart(cv);
    wardPreview();
  });
}
function wardTabTo(t){
  wardTab=(t==="color"||t==="deal")?t:"shape";buyArmed=null;
  wardRefresh();wardPreview();
}
function wardPreview(){
  var sel=wardSelected(wardTab);
  // A deal that IS a shape stands in the case as one; a pass is not a shape,
  // so the case keeps showing the piece you are wearing rather than trying to
  // build a mesh out of an id that names no geometry.
  var shapeSel=(wardTab==="shape"||wardTab==="deal")?sel:wardrobe.shape;
  if(isPass(findBy(wardList(wardTab),sel)))shapeSel=wardrobe.shape;
  previewShow(shapeSel,
    wardTab==="color"?sel:wardrobe.color,
    wardrobe.world3,wardrobe.world2,false);
}
function wardRefresh(){
  var t=wardTab, list=wardList(t), cur=wardEquipped(t), sel=wardSelected(t);
  $("wHead").textContent=t==="deal"?"NOT FOR STARS":
                         t==="shape"?"THE SHAPE YOU PLAY AS":"ITS COLOUR";
  $("wBal").innerHTML=shards()+" \u2605";
  $("wBal").title="to spend";
  $("wS").classList.toggle("on",t==="shape");
  $("wC").classList.toggle("on",t==="color");
  $("wD").classList.toggle("on",t==="deal");
  var html="";
  for(var i=0;i<list.length;i++){
    var it=list[i], have=owns(it.id), on=cur===it.id;
    /* THE TILE SAYS WHAT KIND OF THING IT IS BEFORE THE PRICE IS READ.
       The chip used to be one flat `var(--rule)` square for every shape and
       a bare hex for every colour, so a shelf of thirteen shapes was
       thirteen identical grey squares and the only thing that told an owned
       item from a locked one was the word under it. The classes here are
       what let the CSS light the chip: `have` in the player's own colour,
       `rew` and `gold` in the star's, `locked` left grey and dimmed. The
       colour swatch hands its hex over as `--sw` rather than as a
       background, so the same variable can drive the gloss, the rim and the
       glow that hue casts on the tile. */
    var kind = (have?" have":" locked")+
      (it.reward?" rew":"")+((isDeal(it)||isPass(it))?" gold":"")+
      (t==="color"?" sw":"");
    var swatch = t==="color"
      ? " style='--sw:#"+it.hex.toString(16).padStart(6,"0")+"'"
      : "";
    html+="<div class='item"+(on?" on":"")+(sel===it.id?" sel":"")+kind+
      "' data-id='"+it.id+"'>"+
      "<i"+swatch+">"+(t==="color"?"":shapeGlyph(it.id))+"</i>"+
      "<b>"+it.name+"</b>"+
      "<span"+(!have?(it.reward?" class='wlock'":isDeal(it)?" class='wusd'":""):"")+">"+
        (on?"equipped":have?(isPass(it)?"active":"owned")
          :it.reward?rewardShort(it)
          :isDeal(it)?dealPriceSay(it)
          :it.cost+" <u class='st'>\u2605</u>")+
      "</span></div>";
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
  /* THE NAME AND WHAT IT COSTS ARE ONE LINE, the way a price tag is one
     line. Stacked they read as two unrelated facts; on a baseline together
     the price is plainly the price OF the name beside it, and the row has
     the panel's full width to do it in now that the case is not a 40%
     column. */
  var s="<div class='wtop'><span class='wname'>"+it.name+"</span>"+
        "<span class='wcost"+(!have&&isDeal(it)?" wusd":"")+"'>"+
          (on?"equipped":have?(isPass(it)?"in force":"owned")
          :it.reward?esc(rewardSay(it))
          :isDeal(it)?dealPriceSay(it)
          :it.cost+" <u class='st'>\u2605</u>")+"</span></div>"+
        /* WHAT A PASS ACTUALLY DOES, listed. A shape is its own description -
           it is standing in the case - and a pass is not: nothing on this
           panel would otherwise say that "No Limits" is about hints, skips
           and the star price, which is the only reason to want it. */
        (isPass(it)
          ? "<ul class='wgives'><li>"+it.gives.map(esc).join("</li><li>")+
            "</li></ul>"+
            (it.needs&&hasPass(it.needs)
              ? "<div class='wcredit'>"+esc(findBy(PASSES,it.needs).name)+
                " already paid for - this is the rest.</div>":"")
          : "")+
        "<div class='wact'>";
  /* A PASS HAS NOTHING TO EQUIP. It is not worn, it is in force - so once it
     is bought the only honest button is the one that says so. */
  if(isPass(it)&&have) s+="<button disabled class='wgo'>ACTIVE</button>";
  else if(on)         s+="<button disabled>EQUIPPED</button>";
  else if(have)       s+="<button id='wEquip' class='wgo'>EQUIP</button>";
  /* A REWARD IS NOT FOR SALE. No BUY, no ad row, and the button says the one
     thing that opens it. Ads buy progress, never score - and this is the one
     item in the catalogue that IS score. */
  /* A FEAT SAYS THE MOVE, not the shelf. Same dead gold button, because it
     is the same kind of thing - something a star cannot be spent on - but
     "EVERY ★ IN undefined" is what the section wording gives a shape with no
     section, and this one is paid for by one fold. */
  else if(it.reward&&it.feat)
                      s+="<button disabled class='wearn wfeat'>"+
                         esc((it.short||it.say).toUpperCase())+"</button>";
  else if(it.reward)  s+="<button disabled class='wearn'>EVERY "+
                         "<u class='st'>\u2605</u> IN "+
                         esc(secNumeral(it.sec))+"</button>";
  /* NO STARS, NO ADS, NO SECOND TAP TO CONFIRM - there is nothing to confirm
     until there is a store to charge. Dead for the same reason the ad
     buttons are dead and said the same way, in the note below. */
  else if(isDeal(it)) s+="<button disabled class='wbuyusd'>"+tagIcon()+
                         "BUY \u00b7 $"+esc(dealPrice(it))+"</button>";
  else if(bal<it.cost)s+="<button disabled>NEED "+(it.cost-bal)+" MORE <u class='st'>\u2605</u></button>";
  else if(buyArmed===id)
                      s+="<button id='wBuy' class='wsure'>SURE? \u00b7 "+it.cost+" <u class='st'>\u2605</u></button>";
  else                s+="<button id='wBuy' class='wgo'>BUY \u00b7 "+it.cost+" <u class='st'>\u2605</u></button>";
  if(!have&&!it.reward&&!isDeal(it)){
    var need=adsFor(it.cost), got=adsWatched(id);
    s+="<button id='wAd' class='ad' disabled>"+adIcon()+"WATCH "+need+" AD"+(need===1?"":"S")+
       (got?" ("+got+"/"+need+")":"")+"</button>";
  }
  s+="</div>";
  // The hook name belongs in the code and in CLAUDE.md, not in a player's
  // narrow sidebar; all this has to say is why the button does nothing.
  if(!have&&isDeal(it))
    s+="<div class='note'>No store yet - nothing can be charged until "+
       "the game is wrapped for one. The button is dead on purpose.</div>";
  else if(!have&&!it.reward)s+="<div class='note'>No ad provider yet - the button is "+
    "dead until the game is wrapped for a store.</div>";
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
/* Geometric characters for the geometric shapes, and a drawing for the one
   that is not. The pup was ◐ - a half-filled circle, which is a shape from a
   different alphabet and says nothing about a dog. Anything a font provides
   at 16px for "dog" is an emoji, which renders differently on every device
   and at a size it does not control, so this is a path like every other icon
   in the game (see "icons are solid SVG" in docs/UI.md). */
/* What a reward asks for, in the shortest form that is still true: the
   section's numeral and the condition. Falls back to the whole name where a
   section has no numeral, which none of the four awarding ones do. */
function rewardSay(it){
  // A feat is not a shelf: it names the move that pays it, not a section.
  if(it.feat)return it.say||"a feat";
  var sec=SECTIONS[it.sec];
  if(!sec)return "every star";
  return "every \u2605 in "+sec.name;
}
// A section's numeral, or its whole name where it has none.
function secNumeral(n){
  var sec=SECTIONS[n];
  if(!sec)return "";
  var np=sec.name.split(" \u00b7 ");
  return np.length>1?np[0]:sec.name;
}
// The same thing in a 74px column: the numeral only. "every ★ in III" wrapped
// to two lines there and made one tile taller than the row it is in.
function rewardShort(it){
  if(it.feat)return esc(it.short||it.say||"a feat");
  var sec=SECTIONS[it.sec];
  if(!sec)return "all \u2605";
  return secNumeral(it.sec)+" \u00b7 all <u class='st'>\u2605</u>";
}
/* A price tag, for the one shelf that is not paid for in stars. Drawn like
   every other icon in the game rather than typed as a glyph. */
/* A house, on the one button in the footer that goes there. The four
   full-height panels all carry it, so "up one level" is a picture as well as
   a word - and the map's SECTIONS button gets the same four squares the home
   screen's LEVELS button wears, because it opens the same screen. */
function homeIcon(){
  return "<svg class='pfi' viewBox='0 0 24 24' aria-hidden='true'>"+
    "<path d='M11.35 2.6 2.9 9.75c-.5.42-.24 1.24.42 1.24H5v9.3c0 .61.5 1.11 "+
    "1.11 1.11h3.6v-5.3h4.58v5.3h3.6c.61 0 1.11-.5 1.11-1.11v-9.3h1.68c.66 0 "+
    ".92-.82.42-1.24L12.65 2.6a1 1 0 0 0-1.3 0Z'/></svg>";
}
function gridIcon(){
  return "<svg class='pfi' viewBox='0 0 24 24' aria-hidden='true'>"+
    "<rect x='3.2' y='3.2' width='7.4' height='7.4' rx='1.7'/>"+
    "<rect x='13.4' y='3.2' width='7.4' height='7.4' rx='1.7'/>"+
    "<rect x='3.2' y='13.4' width='7.4' height='7.4' rx='1.7'/>"+
    "<rect x='13.4' y='13.4' width='7.4' height='7.4' rx='1.7'/></svg>";
}
function tagIcon(){
  return "<svg class='tagicon' viewBox='0 0 24 24' fill-rule='evenodd' "+
    "aria-hidden='true'><path d='M2.6 11.5 11.4 2.7c.4-.4.9-.6 1.4-.6h6.5c1.1 "+
    "0 2 .9 2 2v6.5c0 .5-.2 1-.6 1.4l-8.8 8.8c-.8.8-2 .8-2.8 0l-6.5-6.5c-.8-."+
    "8-.8-2 0-2.8Zm14.3-5.4a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Z'/></svg>";
}
/* THE ROW'S OWN GLYPHS. A level's line has five things on it and a name that
   has to stay readable, so the three verbs a picture says better than a word
   are drawn: the pencil that renames (sitting against the name, because that
   is what it edits), the triangle that plays, and the share node. EDIT keeps
   its word - it is the one that opens the whole editor, and there is no
   glyph for that which is not a guess. */
function penIcon(){
  return "<svg class='mli' viewBox='0 0 24 24' aria-hidden='true'>"+
    "<path d='M3.4 17.3 14.9 5.8l3.3 3.3L6.7 20.6l-4 .7Zm13.1-13 1.7-1.7a1.4 "+
    "1.4 0 0 1 2 0l1.3 1.3a1.4 1.4 0 0 1 0 2l-1.7 1.7Z'/></svg>";
}
function playIcon(){
  return "<svg class='mli' viewBox='0 0 24 24' aria-hidden='true'>"+
    "<path d='M7.4 4.6 19 11.3a.8.8 0 0 1 0 1.4L7.4 19.4a.8.8 0 0 1-1.2-.7V5.3"+
    "a.8.8 0 0 1 1.2-.7Z'/></svg>";
}
// The three-node share, not a box with an arrow out of it: the box-and-arrow
// is one stroke away from the upload glyph on LOAD A LEVEL, and those two are
// the opposite directions of the same idea.
function shareIcon(){
  return "<svg class='mli' viewBox='0 0 24 24' aria-hidden='true'>"+
    "<path d='M8.1 13.6a2.9 2.9 0 1 1 0-3.2l6-3.3a2.9 2.9 0 1 1 .7 1.5l-6 "+
    "3.3a2.9 2.9 0 0 1 0 .2l6 3.3a2.9 2.9 0 1 1-.7 1.5Z'/></svg>";
}
// Coming in from outside: an arrow up out of a tray. LOAD A LEVEL is the one
// door in this screen that takes something from somewhere else.
function upIcon(){
  return "<svg class='pfi' viewBox='0 0 24 24' aria-hidden='true'>"+
    "<path d='M11.15 3.5a1.2 1.2 0 0 1 1.7 0l4.3 4.3a1 1 0 0 1-1.4 1.4L13 6.5"+
    "v8.1a1 1 0 0 1-2 0V6.5L8.25 9.2a1 1 0 0 1-1.4-1.4Z'/>"+
    "<path d='M4 15.4a1 1 0 0 1 1 1v2.4c0 .3.2.5.5.5h13c.3 0 .5-.2.5-.5v-2.4a1"+
    " 1 0 1 1 2 0v2.4c0 1.4-1.1 2.5-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.8v-2.4a1 1 "+
    "0 0 1 1-1Z'/></svg>";
}
function shapeSvg(d){
  return "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='"+d+"'/></svg>";
}
var SHAPE_SVG={
  /* Two squares with a gap between them and two pips in each: the pips are
     holes rather than a second path, wound the other way round so the one
     fill leaves them open. A domino at 21px is the gap and the pips; an
     outline with a line down the middle is a window frame. */
  domino:"M5.5 2.5H18.5V11.4H5.5ZM7.6 6.9H10.2V4.3H7.6ZM13.8 9.6H16.4V7H13.8Z"+
         "M5.5 12.6H18.5V21.5H5.5ZM7.6 17H10.2V14.4H7.6ZM13.8 19.7H16.4V17.1H13.8Z",
  rook:"M5 3h3.2v2h1.8V3h4v2h1.8V3H19v4.2H5Zm1.6 4.9h10.8l-.8 1.9H7.4Zm.8 "+
       "2.5h9.2l1.1 6.2H6.3Zm-2.8 6.9h14.8v1.5H4.6Zm-.7 2.1h16.2v2.1H3.9Z",
  pup:"M4.6 9.1c0-1 .5-1.6 1.3-1.6.6 0 1 .3 1.4.9l.5.8h4.3c1.4 0 2.6.5 3.5 "+
      "1.5l1.6 1.7h2.3c.7 0 1.3.6 1.3 1.3 0 .6-.4 1.1-1 1.2l-1.4.3-.6 1.4v2.6"+
      "h-1.9v-2.2l-1.5.5-.3 1.7h-1.9l.3-2h-3.2l.3 2H7.7l-.4-2.4a4.9 4.9 0 0 1-"+
      "2.3-4.1Zm1.9.7v1.7c0 .8.3 1.5.8 2v-3.7Z",
  /* SAT DOWN AND FACING RIGHT: two ear peaks cut straight out of the top of
     the head, a body that widens to the floor, and the tail stood up beside
     it. Straight lines only, like the rook and the domino - a curve at 21px
     is a smudge, and the ears are the whole identification. */
  cat:"M6.4 2.4 9.4 6.4H14.6L17.6 2.4 18.4 8.8 16.4 11.8H7.6L5.6 8.8Z"+
      "M9.2 12.4H14.8L17 21.4H6.2Z"+
      "M17.4 21.4V19.2H19.6V14.2H21.6V21.4Z",
  /* Eyes are HOLES, wound the other way round so the one fill leaves them
     open - the same trick the domino's pips use. Two lit squares in a dark
     head is what says robot before the antenna is even read. */
  robot:"M10.3 .4H13.7V1.9H10.3ZM11.4 1.9H12.6V3.6H11.4Z"+
        "M7.2 3.6H16.8V9.4H7.2ZM9.1 7.7H11.1V5.5H9.1ZM12.9 7.7H14.9V5.5H12.9Z"+
        "M8 10.6H16V16.6H8ZM5.2 10.8H7.2V16H5.2ZM16.8 10.8H18.8V16H16.8Z"+
        "M8.8 17.8H11V22H8.8ZM13 17.8H15.2V22H13Z"
};
// The reward characters wear their section's own emblem, read from the same
// table the chooser's tiles read.
var REWARD_GLYPH={sapling:"trees",flame:"hell",minnow:"ocean",cactus:"desert"};
/* THE TWO PASSES' OWN GLYPHS. Neither is a shape, so neither has a piece to
   draw: an open padlock for the one that takes the limits off, a crown for
   the one that carries the lot. */
var PASS_SVG={
  pass_nolimits:"M4.8 10.2h10.4c.9 0 1.6.7 1.6 1.6v7.4c0 .9-.7 1.6-1.6 1.6H4.8"+
    "c-.9 0-1.6-.7-1.6-1.6v-7.4c0-.9.7-1.6 1.6-1.6Zm4 4.4h2.4v3.2H8.8ZM12.8 "+
    "10.2V7.1a4 4 0 0 1 8 0v1.8h-2.3V7.1a1.7 1.7 0 0 0-3.4 0v3.1Z",
  pass_all:"M2.4 7.4 7.6 11.6 12 4.2l4.4 7.4 5.2-4.2-1.8 10.1H4.2ZM4.3 "+
    "18.9h15.4v2.2H4.3Z"
};
function shapeGlyph(id){
  if(PASS_SVG[id])return shapeSvg(PASS_SVG[id]);
  if(REWARD_GLYPH[id])return shapeSvg(ELEM_PATH[REWARD_GLYPH[id]]);
  if(SHAPE_SVG[id])return shapeSvg(SHAPE_SVG[id]);
  return {cube:"\u25a0",sphere:"\u25cf",pyramid:"\u25b2",diamond:"\u25c6",
          barrel:"\u25ac",donut:"\u25ce",star:"\u2726"}[id]||"\u25a0";
}

function seg(pre,val,label,cur){
  return "<button id='"+pre+"_"+val+"'"+(cur===val?" class='on'":"")+">"+label+"</button>";
}
function menuPanel(){
  var vol=Math.round(settings.volume*100), bri=Math.round(settings.brightness*100);
  /* THE WAY BACK TO THE SHELF YOU ARE STANDING ON.

     This reverses "NO NAVIGATION ROW AT ALL" below, on the owner's call, and
     it is worth saying why the reversal is not the old row coming back. The
     row that was cut was a second LEVELS - the chooser, the same four tiles
     the home screen already offers. This is not that: it is the section you
     are *in*, named, in its own colour, going straight to its trail. Opened
     from inside a level the settings sheet was a dead end unless you were
     willing to go out through HOME and back in through LEVELS and a tile;
     one button is that whole trip.

     Only from inside a campaign level: at home LEVELS is a tap away, and a
     library level or an editor test has no shelf to go back to. PROLOGUE has
     no tile either (secPickable), so the tutorial gets nothing here. */
  var secN=-1;
  if(playSource==="builtin"&&!homeUp()&&typeof lvIndex==="number"&&lvIndex>=0&&
     typeof mapSecOf==="function"){
    var sn0=mapSecOf(lvIndex);
    if(typeof secPickable==="function"&&secPickable(sn0)&&SECTIONS[sn0])secN=sn0;
  }
  var secBtn=secN<0?"":
    "<button class='psec' id='mSec' style='--sec:"+
      (SECTIONS[secN].col||"#35c2a5")+"'>"+secEmblem(SECTIONS[secN])+
      "<span><i>back to</i><b>"+esc(SECTIONS[secN].name)+"</b></span>"+
      "<u class='psecgo' aria-hidden='true'>\u203a</u></button>";
  showPanel(
    /* NO SUBTITLE. The header used to print the level you were standing on
       under the word Settings. It answered a question nobody asks with the
       panel open - the level's name is on the HUD behind it, and the way
       back to its shelf is the .psec row below, which names the section
       rather than the level. The other tall panels put a real subtitle
       here; this one had a label. */
    "<div class='phead'><div class='pt'><b>Settings</b></div>"+
      "<div class='mtot'>"+starsEarned()+" ★</div>"+
      "<button class='mq mx' id='mClose' aria-label='Back to the level'>✕</button></div>"+
    "<div class='pbody'>"+secBtn+
      /* NO NAVIGATION ROW AT ALL. HOME went to the footer with every other
         panel's way up, and LEVELS went with it on the owner's call: this is
         the settings panel, and LEVELS is on the home screen, on the HUD's
         way out of a level, and on the win card. A fourth copy at the top of
         a settings sheet is a fourth thing to scroll past. */
      "<div class='pcard'><h4>Sound &amp; light</h4>"+
        "<div class='srow'><label>Volume</label>"+
          "<input type='range' id='mVol' min='0' max='100' value='"+vol+"'>"+
          "<span id='mVolV'>"+vol+"%</span></div>"+
        "<div class='srow'><label>Brightness</label>"+
          "<input type='range' id='mBri' min='60' max='140' value='"+bri+"'>"+
          "<span id='mBriV'>"+bri+"%</span></div></div>"+
      /* ONE ROW, THREE OPTIONS, AND NO PARAGRAPH UNDER IT. The card is
         called Controls and the three buttons are the whole of it - a
         setting whose options are three words does not need a sentence
         explaining them, and the note under this one was four lines of
         gesture reference nobody had asked for. The Tutorial row went with
         it: the lesson now teaches whatever this is set to. */
      "<div class='pcard'><h4>Controls</h4>"+
        "<div class='crow bare'><span class='seg'>"+
          seg("mUi","full","FULL",settings.ui)+
          seg("mUi","compact","COMPACT",settings.ui)+
          seg("mUi","none","HIDDEN",settings.ui)+"</span></div></div>"+
      /* THE KILL CAM, AS A ROW, because it is a genuine question about how
         much ceremony a death deserves and the only way to answer it is to
         play both. FULL is the television: the signal drops to snow, a
         camcorder is pushed through the screen, and the film plays behind its
         lens. PLAIN keeps the sting and the film and cuts that out of the
         middle. It is on this card rather than under More because it is a
         preference about what the game does, not a tool. */
      "<div class='pcard'><h4>Kill cam</h4>"+
        "<div class='crow bare'><span class='seg'>"+
          seg("mKcam","full","FULL",settings.killcam)+
          seg("mKcam","plain","PLAIN",settings.killcam)+"</span></div></div>"+
      /* WHAT THE PIECES DO IS OFF THE PANEL, on the owner's call. The pieces
         are taught where they are first met - the tutorial cards and the
         level briefs - and a reference list under More was a fourth row that
         pushed this card past the fold on a phone. Losing it is what makes
         the settings sheet fit on one screen with nothing to scroll to.
         `legendPanel()` is untouched and still one bind away. */
      "<div class='pcard'><h4>More</h4><div class='psub'>"+
        "<button id='mTut'>REPLAY TUTORIAL</button>"+
        /* AND THE WAY BACK TO THE STORY, beside the way back to the lesson,
           because they are the same kind of thing: something that plays once
           and is then gone, filed where a player would go looking for it.

           BOTH SCENES ARE ALWAYS OFFERED, on the owner's call. The ending
           used to appear only once it had been reached, on the reasoning
           that a button naming it is a spoiler - and that is true, but the
           owner wants to be able to watch it, and a door that is there only
           after you no longer need it is not a door. It is under More, next
           to RESET SETTINGS, which is about as far from an accident as a
           button gets. */
        "<button id='mStory'>WATCH THE OPENING</button>"+
        "<button id='mStoryFire'>WATCH THE FIRE</button>"+
        "<button id='mStoryEnd'>WATCH THE ENDING</button>"+
        /* LEVEL EDITOR MOVED TO THE HOME SCREEN as MY LEVELS. It is not a
           setting - it is a place you go, like LEVELS and the wardrobe are -
           and filing it under More next to RESET SETTINGS is what made it
           feel like a developer switch rather than a thing to play with. */
        "<button id='mReset' class='pdanger'>RESET SETTINGS</button>"+
      "</div>"+
      /* THE BUILD STAMP IS OFF THE PANEL, on the owner's call, and this is a
         reversal worth writing down. It was put here because a published
         artifact is played by people who cannot open a console, and "are you
         on the new one?" was otherwise unanswerable. It read as a developer
         line at the foot of a settings sheet, which it is.

         Nothing is lost that the owner needs: `BUILD` is still a global and
         still in a comment at the top of the built file, the artifact's own
         version picker carries the commit as each version's label, and the
         build log prints it. Putting the line back is this one string. */
      "</div>"+
    "</div>"+
    "<div class='pfoot'><button id='mHome'>"+homeIcon()+"HOME</button>"+
      "<button id='mFClose'>CLOSE</button></div>","menu");
  var v=$("mVol"), b=$("mBri");
  v.addEventListener("input",function(){
    settings.volume=v.value/100;
    settings.volTouched=true;      // from here on, your choice outranks the default
    $("mVolV").textContent=v.value+"%";
    applyVolume();
    muted=settings.volume<=0;
    if(typeof ambSync==="function")ambSync();
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
  ["full","plain"].forEach(function(m){
    bind("mKcam_"+m,function(){
      settings.killcam=m;saveSettings();menuPanel();
    });
  });
  bind("mTut",function(){
    hidePanel();playSource="builtin";enterPlay(LEVELS[0],0,false);
  });
  /* `true` is the replay flag: watching a scene from here does not count as
     having reached it, so somebody who looks at the ending early still gets
     FIND THEM on BOSS IV's card - and it hands back to whatever screen this
     panel was opened over rather than to the scene's own destination. */
  bind("mStory",function(){
    hidePanel();
    if(typeof storyPlay==="function")storyPlay("open",true);
  });
  bind("mStoryFire",function(){
    hidePanel();
    if(typeof storyPlay==="function")storyPlay("fire",true);
  });
  bind("mStoryEnd",function(){
    hidePanel();
    if(typeof storyPlay==="function")storyPlay("end",true);
  });
  bind("mReset",function(){
    settings.volume=defaultVolume();settings.volTouched=false;
    settings.brightness=1;settings.ui=UI_DEFAULT;settings.killcam="full";

    // including "stop suggesting things": a reset is a reset
    settings.noSlowOffer=false;settings.landHints=0;
    settings.starAsked=false;
    muted=false;
    applyVolume();
    /* onResize() as well, exactly as the FULL/COMPACT/HIDDEN segment does:
       putting the buttons back changes how much screen the arena has, and
       fitViewSize() only re-runs from here. */
    applyBrightness();applyUI();saveSettings();syncHud();onResize();
    flash("settings reset");menuPanel();
  });
  bind("mHome",function(){hidePanel();homeShow();});
  /* Straight onto the trail, not out through the chooser: the point of the
     button is that it knows which shelf you are on. */
  if(secN>=0)bind("mSec",function(){levelPicker(secN);});
  bind("mClose",hidePanel);
  bind("mFClose",hidePanel);
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
/* Nothing beaten, nothing part-done, nothing skipped: a genuine first run.

   Deliberately not "no stars earned". A level beaten with enough hints scores
   zero, and that player is plainly not new - they were being offered START
   with a level already behind them. And deliberately not "the target is level
   0" either: mapHere() answers with the first level not dealt with, which can
   point backwards at a tutorial somebody skipped past from the intro card.

   Boot asks this to choose between the intro card and the home screen, and
   the home screen asks it to choose between START and CONTINUE. One answer,
   so the two cannot disagree. */
function nothingBehind(){
  var k;
  for(k in progress) if(progress.hasOwnProperty(k)) return false;
  for(k in skips)    if(skips.hasOwnProperty(k))    return false;
  return sessionIndex()<0;
}

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
/* THE BROWSE STRIP IS GONE, and with it homeTile / homeStrip / homePick /
   homeBindStrip. Two scrolling rows of shapes and colours sat under the
   plinth, live, so a tap equipped an owned item or opened the wardrobe on a
   locked one. They were removed on the owner's call: they are the wardrobe's
   own job done worse, in 34px tiles, on the one screen that should read as a
   title screen. The wardrobe button below the plinth is the way in now, and
   it wears the hanger so it looks like the door it is. The reasoning for the
   strip, and why it was live rather than a drawing, is in docs/HISTORY.md. */
function homeSync(){
  if(!$("home"))return;
  var t=homeTarget(), lv=LEVELS[t.i];
  var b=$("hContinue");
  var stars=starsEarned();
  // "START" only when there is genuinely nothing behind you - see above.
  var fresh=nothingBehind();
  b.querySelector("b").textContent=fresh?"START":"CONTINUE";
  b.querySelector("i").textContent=lv?lv.name.replace(/^\d+ \u2014 /,""):"";
  /* The button takes the colour of the section it opens - see .hcont. The
     section's UI colour rather than its sky: `col` is the value picked to
     read as a tab on a dark panel, which is the same job a button has. */
  var sec=SECTIONS[mapSecOf(t.i)];
  b.style.setProperty("--sec",(sec&&sec.col)||"var(--goal)");
  /* AND THE SECTION'S OWN EMBLEM, the same drawing its tile carries on the
     chooser. `--tabc` is what secEmblem()'s fill reads, so it is set to the
     same value `--sec` just took: one colour, one picture, on the button and
     on the tile it leads to. */
  var ic=$("hContIcon");
  if(ic){
    ic.innerHTML=sec?secEmblem(sec):"";
    ic.style.setProperty("--tabc",(sec&&sec.col)||"var(--goal)");
  }
  $("homeStars").textContent=stars;
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
  homeStand();
}
/* Just the drawing, on whatever context is already there. Equipping from the
   strip goes through here rather than homeCase(), because building a WebGL
   renderer per tap on a row you are meant to browse is the wrong price for
   changing a colour. */
function homeStand(){
  if(!pv)return;
  previewShow(wardrobe.shape,wardrobe.color,wardrobe.world3,wardrobe.world2,false);
}
/* THE STAND IS BUILT OFF THE BOOT PATH, NOT ON IT.

   A second WebGL context is not free, and this one used to be created inside
   homeShow() - which runs the moment the saves land, while the sting is still
   playing. Measured on the artifact build at 4x CPU throttle, boot-to-sting
   went 715ms without the home screen and 786ms with it, and this was most of
   the difference. It also lands during the one animation in the game written
   against a music cue.

   Nothing is lost by waiting. The buttons are the point of this screen and
   they are ready immediately; the plinth is decoration, and while it is
   missing the canvas is invisible anyway - previewShow paints its scene in
   the same void the page is painted in. So: schedule it, and while the sting
   is up, keep putting it off. The poll re-checks rather than hooking
   splashEnd because homeShow is also reached from the menu long after the
   sting is over, and one path is easier to keep right than two. */
var homeCaseTimer=null;
function homeCaseSoon(){
  clearTimeout(homeCaseTimer);
  if(!homeUp())return;
  var splashing=document.body.classList.contains("splashing");
  homeCaseTimer=setTimeout(function(){
    homeCaseTimer=null;
    if(!homeUp())return;
    if(document.body.classList.contains("splashing")){homeCaseSoon();return;}
    homeCase();
  },splashing?200:0);
}
function homeShow(){
  if(!$("home"))return;
  hidePanel();
  $("won").classList.remove("on");
  $("intro").classList.add("gone");
  $("home").classList.add("on");
  syncHud();                       // syncHud owns body.home and the chrome
  homeSync();
  homeCaseSoon();
}
function homeHide(){
  if(!homeUp())return;
  clearTimeout(homeCaseTimer);homeCaseTimer=null;
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
/* WHICH BOSSES ARE STILL STANDING, in campaign order.

   The gate itself has not moved: the shelf opens when every boss is *beaten*,
   and a skip is deliberately not in `progress`, so buying your way past a
   fight does not buy the reward for winning it. What was wrong is that the
   gate could not be read. The game offers a skip itself after three losses -
   struggleOffer() - so a player can take one, go on to finish the campaign,
   and arrive at a shelf that says only "every boss is down" while their save
   quietly disagrees, with nothing anywhere naming the fight that is still
   standing. That is how it was reported: section IV finished, EXTRA still
   shut, and no way to find out why.

   So the list is the primitive and the gate is derived from it. Everything
   that draws the lock reads the same list, which means the map can name the
   fight and put the player in front of it. */
/* A TEACHING FIGHT IS NOT ONE OF THEM. SPARRING carries `boss` because it is
   one - a phase, a pack of one, the same kill - but V - EXTRA is what beating
   the four LANDMARKS is for, and a lesson standing between the player and the
   shelf would be a gate nobody agreed to. `tutorial` is already the flag for
   "this level does not mark you"; this is the same sentence about unlocking. */
function bossesLeft(){
  var out=[];
  for(var i=0;i<LEVELS.length;i++)
    if(LEVELS[i].boss&&!LEVELS[i].tutorial&&
       progress[LEVELS[i].name]===undefined)out.push(i);
  return out;
}
// "BOSS II" - the numeral is what a player looks for on the map, and the
// subtitle after the dash is the Census's, not a label.
function bossShort(l){return l.name.split(" \u2014 ")[0];}
function bossesLeftSay(){
  var n=bossesLeft().map(function(i){return bossShort(LEVELS[i]);});
  if(!n.length)return "";
  if(n.length===1)return n[0];
  return n.slice(0,-1).join(", ")+" and "+n[n.length-1];
}
function sectionsUnlocked(){return bossesLeft().length===0;}
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
/* MASTERED - every scoreable level in the section on three stars.

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
/* The preview switch is gone from the menu, so nothing can turn this on any
   more. Kept as a function rather than deleted at every call site: it is the
   seam the switch would come back through, and the three drawing paths that
   ask it read better with a name than with `false`. */
function masteryPreview(){return false;}
function sectionMastered(sp){
  if(!sp||sp.max<=0||sp.locked)return false;
  return masteryPreview()||sp.got===sp.max;
}

/* ============================================================
   THE MAP - the picker as a path

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
var mapSection=null;          // the section the map is on; null means "where you are"

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
/* ============================================================
   THE SECTION'S OWN WEATHER, BEHIND ITS TRAIL

   The map is where a section is chosen, so it is the one screen where a
   section should be recognisable before a word of it is read. Each one gets
   the element it is themed on, drawn on the same 2D canvas the ambient cubes
   already use - no second context, no WebGL, and it stops dead with the
   panel like everything else here.

   Two rules hold it together. It is drawn BEHIND the cubes and the trail and
   kept out of the middle column, because ambience you have to read around is
   not ambience. And every piece of it is procedural: there is not an image
   file in this project and there is not going to be one, so a fish is a few
   arcs and a leaf is two curves.
   ============================================================ */
var mapWx=null, mapWxKind=null, mapWxT=0;
/* Which element the open section wears. Keyed off the section's own scenery
   rather than a second table, so the map and the world cannot drift apart:
   a section themed `trees` gets leaves here, one themed `ocean` gets fish. */
function mapWeatherKind(){
  var sec=SECTIONS[mapSection===null?mapSecOf(mapHere()):mapSection];
  var sc=sec&&sec.theme&&sec.theme.scene;
  return sc==="trees"?"leaf":sc==="hell"?"meteor":
         sc==="ocean"?"sea":sc==="desert"?"sand":null;
}
function mapWxMake(kind,W,H){
  var a=[],i,R=Math.random;
  /* Two greens and a turning-gold, weighted so most of what falls is still
     green: a canopy that is entirely autumn is a different season. */
  if(kind==="leaf")for(i=0;i<16;i++)a.push({
    x:R(), y:R(), sp:.16+R()*.26, sw:.4+R()*1.1, ph:R()*6.3,
    s:5+R()*6, col:R()<.62?"#6f9c4a":(R()<.5?"#87ab4e":"#b8913c")});
  /* The same 90-degree downward fan the world's meteors use, and for the
     same reason: the streak has to point where it is going. In canvas
     coordinates y grows downward, so an angle between 45 and 135 degrees is
     every direction that falls. */
  if(kind==="meteor")for(i=0;i<7;i++)a.push({
    x:R(), y:R(), sp:.55+R()*.8, len:26+R()*40, w:1.6+R()*1.8,
    ang:Math.PI*.25+R()*Math.PI*.5});
  if(kind==="sea"){
    var fish=["clown","clown","dolphin","turtle","octopus","clown"];
    for(i=0;i<6;i++)a.push({
      x:R(), y:.10+R()*.8, sp:.05+R()*.09, ph:R()*6.3,
      s:13+R()*13, dir:R()<.5?-1:1, kind:fish[i]});
    for(i=0;i<18;i++)a.push({
      bub:1, x:R(), y:R(), sp:.16+R()*.3, s:1.6+R()*3.4, ph:R()*6.3});
  }
  if(kind==="sand")for(i=0;i<34;i++)a.push({
    x:R(), y:R(), sp:.5+R()*1.1, ph:R()*6.3, s:1+R()*2.2, a:.10+R()*.3});
  return a;
}
/* A LEAF: two curves meeting at a point, with a midrib. Rotated as it falls,
   which is the whole difference between a leaf and a speck. */
function mapLeaf(x,s,r,col){
  x.save();x.rotate(r);
  x.fillStyle=col;
  x.beginPath();
  x.moveTo(0,-s);
  x.quadraticCurveTo(s*.85,-s*.1,0,s);
  x.quadraticCurveTo(-s*.85,-s*.1,0,-s);
  x.fill();
  x.strokeStyle="rgba(20,34,18,.45)";x.lineWidth=.8;
  x.beginPath();x.moveTo(0,-s);x.lineTo(0,s);x.stroke();
  x.restore();
}
/* THE BRANCHES, AND THEY RUN PARALLEL. Each one climbs its own edge from the
   foot of the panel to the top, which is the shape the trail itself has - a
   section is played from the bottom up, so the wood grows the same way.

   They used to reach *inward* as they climbed, a step of up to 58px a
   segment over nine segments, so the two of them met in the middle and
   crossed over the trail. Now the walk is vertical and the lateral movement
   is a wobble around a line near the edge: they lean and they are not
   straight, but they never converge. Seeded, so a section's tree is the same
   tree every time it opens. */
function mapBranch(x,W,H,side,seed){
  var q=rnd(seed), edge=side>0?W-24:24, px=edge+side*22, py=H+10;
  x.strokeStyle="rgba(38,58,34,.55)";x.lineCap="round";
  for(var i=0;i<9;i++){
    // toward the edge line, plus a wobble - never past a third of the width
    var nx=edge+(q()-.5)*46, ny=py-(H*.13+q()*H*.05);
    x.lineWidth=Math.max(1.4,7-i*.62);
    x.beginPath();x.moveTo(px,py);
    x.quadraticCurveTo(px+(nx-px)*.4,py-(H*.08),nx,ny);
    x.stroke();
    // a twig off most joints, and a cluster of leaves on the end of it
    if(q()<.8){
      var tx=nx-side*(14+q()*34), ty=ny-(6+q()*26);
      x.lineWidth=1.5;
      x.beginPath();x.moveTo(nx,ny);x.lineTo(tx,ty);x.stroke();
      for(var l=0;l<3;l++){
        x.save();x.translate(tx+(q()-.5)*16,ty+(q()-.5)*16);
        mapLeaf(x,4+q()*4,q()*6.3,"rgba(96,140,68,.42)");
        x.restore();
      }
    }
    for(var l2=0;l2<2;l2++){
      x.save();x.translate(nx+(q()-.5)*22,ny+(q()-.5)*18);
      mapLeaf(x,4+q()*5,q()*6.3,"rgba(74,116,54,.38)");
      x.restore();
    }
    px=nx;py=ny;
    if(py<-20)break;
  }
}
/* THE FISH. Four silhouettes that are told apart by shape alone at fifteen
   pixels: a clownfish is a fat teardrop with two pale bars, a dolphin is a
   long curve with a dorsal, a turtle is a wide oval with four paddles, an
   octopus is a dome with legs under it. Colour is a second signal, never
   the first. */
function mapFish(x,f,t){
  var s=f.s;
  x.save();x.scale(f.dir,1);
  if(f.kind==="clown"){
    x.fillStyle="rgba(232,132,44,.55)";
    x.beginPath();x.ellipse(0,0,s*.62,s*.4,0,0,Math.PI*2);x.fill();
    x.beginPath();                                        // tail
    x.moveTo(s*.5,0);x.lineTo(s*.95,-s*.34);x.lineTo(s*.95,s*.34);
    x.closePath();x.fill();
    x.fillStyle="rgba(245,238,228,.5)";
    x.fillRect(-s*.30,-s*.34,s*.11,s*.68);
    x.fillRect(s*.02,-s*.36,s*.10,s*.72);
  } else if(f.kind==="dolphin"){
    x.fillStyle="rgba(150,172,196,.5)";
    x.beginPath();
    x.moveTo(-s*.95,s*.02);
    x.quadraticCurveTo(-s*.2,-s*.5,s*.62,-s*.16);
    x.quadraticCurveTo(s*.95,-s*.05,s*.62,s*.2);
    x.quadraticCurveTo(-s*.2,s*.42,-s*.95,s*.02);
    x.fill();
    x.beginPath();                                        // dorsal
    x.moveTo(0,-s*.34);x.lineTo(s*.16,-s*.66);x.lineTo(s*.3,-s*.28);
    x.closePath();x.fill();
    x.beginPath();                                        // fluke
    x.moveTo(-s*.85,0);x.lineTo(-s*1.15,-s*.3);
    x.lineTo(-s*1.0,s*.02);x.lineTo(-s*1.15,s*.3);x.closePath();x.fill();
  } else if(f.kind==="turtle"){
    x.fillStyle="rgba(96,138,92,.5)";
    [[-s*.62,s*.28],[s*.5,s*.3],[-s*.5,-s*.3],[s*.42,-s*.32]].forEach(function(p){
      x.beginPath();x.ellipse(p[0],p[1],s*.26,s*.14,p[0]*p[1]>0?.6:-.6,0,6.3);
      x.fill();
    });
    x.beginPath();x.ellipse(s*.72,0,s*.17,s*.14,0,0,6.3);x.fill();  // head
    x.fillStyle="rgba(72,110,70,.62)";
    x.beginPath();x.ellipse(0,0,s*.66,s*.44,0,0,Math.PI*2);x.fill();
    x.strokeStyle="rgba(38,64,40,.5)";x.lineWidth=1;
    x.beginPath();x.ellipse(0,0,s*.36,s*.24,0,0,Math.PI*2);x.stroke();
  } else {
    x.fillStyle="rgba(168,110,190,.5)";
    x.beginPath();x.arc(0,-s*.1,s*.46,Math.PI,0);x.fill();
    x.fillRect(-s*.46,-s*.1,s*.92,s*.16);
    for(var i=0;i<5;i++){                                  // legs, curling
      var lx=-s*.4+i*s*.2;
      x.beginPath();x.moveTo(lx,s*.06);
      x.quadraticCurveTo(lx+Math.sin(t*2+i)*s*.22,s*.5,
                         lx+Math.sin(t*2+i)*s*.36,s*.78);
      x.strokeStyle="rgba(168,110,190,.5)";x.lineWidth=s*.13;
      x.lineCap="round";x.stroke();
    }
  }
  x.restore();
}
/* Where a meteor re-enters. Biased across the top and a little off both
   sides, so a steep one and a shallow one both cross the panel. */
function R2(){return -.15+Math.random()*1.3;}
function mapWeather(x,W,H,dt){
  var kind=mapWeatherKind();
  if(kind!==mapWxKind){mapWxKind=kind;mapWx=kind?mapWxMake(kind,W,H):null;}
  if(!kind||!mapWx)return;
  mapWxT+=dt/1000;
  var t=mapWxT, i, p;
  if(kind==="leaf"){
    /* The wood is drawn once per frame rather than cached to a bitmap: it is
       about forty strokes and this canvas is already clearing every frame.
       Seeded, so it is the same tree each time the section opens. */
    mapBranch(x,W,H,1,7);
    mapBranch(x,W,H,-1,23);
    for(i=0;i<mapWx.length;i++){
      p=mapWx[i];
      p.y+=p.sp*dt/9000;
      p.x+=Math.sin(t*.7+p.ph)*.0009*p.sw;
      if(p.y>1.08){p.y=-.08;p.x=Math.random();}
      x.save();
      x.translate(p.x*W,p.y*H);
      x.globalAlpha=.55;
      mapLeaf(x,p.s,t*1.6*p.sw+p.ph,p.col);
      x.restore();
    }
    x.globalAlpha=1;
  } else if(kind==="meteor"){
    for(i=0;i<mapWx.length;i++){
      p=mapWx[i];
      var dx3=Math.cos(p.ang), dy3=Math.sin(p.ang);
      p.x+=dx3*p.sp*dt/3400;
      p.y+=dy3*p.sp*dt/2600;
      if(p.y>1.15||p.x<-.2||p.x>1.2){
        p.y=-.15;p.x=R2();
        p.ang=Math.PI*.25+Math.random()*Math.PI*.5;
      }
      var mx=p.x*W, my=p.y*H;
      // the trail runs back along the direction of travel, not diagonally
      var tx3=mx-dx3*p.len, ty3=my-dy3*p.len;
      var g=x.createLinearGradient(tx3,ty3,mx,my);
      g.addColorStop(0,"rgba(255,120,30,0)");
      g.addColorStop(.7,"rgba(255,158,60,.34)");
      g.addColorStop(1,"rgba(255,222,150,.8)");
      x.strokeStyle=g;x.lineWidth=p.w;x.lineCap="round";
      x.beginPath();x.moveTo(tx3,ty3);x.lineTo(mx,my);x.stroke();
      var hd=x.createRadialGradient(mx,my,0,mx,my,p.w*2.6);
      hd.addColorStop(0,"rgba(255,248,226,.9)");
      hd.addColorStop(1,"rgba(255,150,50,0)");
      x.fillStyle=hd;
      x.beginPath();x.arc(mx,my,p.w*2.6,0,Math.PI*2);x.fill();
    }
  } else if(kind==="sea"){
    /* UNDERWATER, so the light comes from above: three slow shafts leaning
       one way, which is the cheapest thing that says "below the surface"
       before a single fish has swum past. */
    for(i=0;i<3;i++){
      var sx=W*(.18+i*.32)+Math.sin(t*.25+i)*W*.05;
      var sg=x.createLinearGradient(sx,0,sx-W*.10,H);
      sg.addColorStop(0,"rgba(150,220,240,.09)");
      sg.addColorStop(1,"rgba(120,200,230,0)");
      x.fillStyle=sg;
      x.beginPath();x.moveTo(sx-W*.05,0);x.lineTo(sx+W*.05,0);
      x.lineTo(sx-W*.06,H);x.lineTo(sx-W*.16,H);x.closePath();x.fill();
    }
    for(i=0;i<mapWx.length;i++){
      p=mapWx[i];
      if(p.bub){
        p.y-=p.sp*dt/6000;
        if(p.y<-.05){p.y=1.05;p.x=Math.random();}
        var bx=p.x*W+Math.sin(t*1.6+p.ph)*4;
        x.strokeStyle="rgba(198,236,248,.34)";x.lineWidth=1;
        x.beginPath();x.arc(bx,p.y*H,p.s,0,Math.PI*2);x.stroke();
        continue;
      }
      p.x+=p.dir*p.sp*dt/9000;
      if(p.x>1.15){p.x=-.15;p.y=.1+Math.random()*.8;}
      if(p.x<-.15){p.x=1.15;p.y=.1+Math.random()*.8;}
      x.save();
      x.translate(p.x*W,p.y*H+Math.sin(t*1.1+p.ph)*H*.012);
      mapFish(x,p,t);
      x.restore();
    }
  } else if(kind==="sand"){
    /* THE SUN, high and hard, and the same radial-through-a-path the desert
       horizon uses - a linear gradient in a rect draws a lit box. */
    /* Below the header and the tabs, which own the top of the panel - a sun
       drawn at the very top is a sun nobody sees. */
    var cx=W*.80, cy=H*.20, r=Math.min(W,H)*.16;
    var sg2=x.createRadialGradient(cx,cy,1,cx,cy,r);
    sg2.addColorStop(0,"rgba(255,244,206,.5)");
    sg2.addColorStop(.3,"rgba(255,222,150,.20)");
    sg2.addColorStop(1,"rgba(255,200,120,0)");
    x.fillStyle=sg2;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();
    x.fillStyle="rgba(255,248,222,.55)";
    x.beginPath();x.arc(cx,cy,r*.17,0,Math.PI*2);x.fill();
    // Dunes along the foot, so the grains have somewhere to blow across.
    x.fillStyle="rgba(120,98,60,.16)";
    x.beginPath();x.moveTo(0,H);
    for(var dx2=0;dx2<=W;dx2+=W/6)
      x.quadraticCurveTo(dx2+W/12,H-26-Math.sin(dx2*.01)*14,dx2+W/6,H-16);
    x.lineTo(W,H);x.closePath();x.fill();
    for(i=0;i<mapWx.length;i++){
      p=mapWx[i];
      p.x+=p.sp*dt/5200;
      p.y+=Math.sin(t*2+p.ph)*.0007;
      if(p.x>1.05){p.x=-.05;p.y=Math.random();}
      x.fillStyle="rgba(238,216,170,"+p.a.toFixed(2)+")";
      x.fillRect(p.x*W,p.y*H,p.s*2.4,p.s*.9);
    }
  }
}
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
    mapWeather(x,W,H,reduce?0:dt);
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
/* Where the pink node goes: the first level you have not dealt with - and
   never one you cannot open.

   The exception is the shelf, and it is the other half of the same bug. Deal
   with everything up to BOSS IV while one boss is still standing and the
   first untouched level is the first level of V · EXTRA, which is locked -
   so the map's marker, mapFocus() and the home screen's CONTINUE all pointed
   into a section the game refuses to open. CONTINUE went straight through
   that lock, which is how somebody ends up playing a shelf the map still
   says is shut.

   Where they actually are is the fight that is holding it. */
function mapHere(){
  for(var i=0;i<LEVELS.length;i++) if(!mapTouched(i)){
    if(mapLocked(i)){
      var lf=bossesLeft();
      if(lf.length)return lf[0];
    }
    return i;
  }
  return LEVELS.length-1;
}
function mapLocked(i){
  if(mapTouched(i))return false;      // beaten, or a door already opened
  var s=SECTIONS[mapSecOf(i)];
  if(s&&s.locked&&!sectionsUnlocked())return true;
  return i>mapReach();
}
/* ANY LOCKED LEVEL CAN BE OPENED, ONE AT A TIME.

   It used to be landmarks only - the boss closing the section you were
   already in, or the opening level of the next one - on the reasoning that a
   skip should carry you past a wall rather than past the puzzles. The wall
   turned out not to be where that assumed. A player stuck on an ordinary
   level three from the end of a section could not buy their way past *that*
   one; the only thing on sale was the boss behind it, which is harder.

   What keeps the old reasoning intact is that a skip still opens exactly one
   door. `mapReach()` counts solved levels and ignores skips, so opening a
   level hands over nothing behind it: to get past two you buy two. And a
   skip is not in `progress`, so it is worth zero stars by construction -
   ADS BUY PROGRESS, NEVER SCORE is unchanged and cannot be got round by
   buying the whole campaign.

   The one thing still not for sale is the *shelf*: V - EXTRA opens when
   every boss is down, and that is a reward rather than a gate in the
   progression. mapLocked() answers that separately. */
function mapSkippable(i){
  if(!mapLocked(i))return false;
  var s=SECTIONS[mapSecOf(i)];
  if(s&&s.locked&&!sectionsUnlocked())return false;
  return true;
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
  return l.name.replace(/^\d+\s+-\s+/,"").replace(/^(?:TRIAL|BOSS)\s+[IVX]+\s+-\s+/,"");
}
/* The two landmarks get shapes out of the game's own vocabulary rather than
   ornament bolted onto a circle.

   A BOSS is a hexagon, which is what a cube looks like seen corner-on - the
   silhouette of the game's own piece, and the only shape on the map that is
   also a thing in the world. Around it, three arcs: its three phases.

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
   reason this takes an ordinal. All three are called `00 - ...` on purpose:
   they sit outside the campaign's numbering, so they do not consume 01, 02
   and 03 and cannot renumber anything after them. The cost was that every
   node in PROLOGUE read "00", and once solved they all read the same tick -
   so the one section a first-time player is actually in was the one section
   whose order you could not see, while every other section spells it out.
   The name stays untouched, because a name is a save key; only the label
   counts. Single digits rather than `01`, so a glance never confuses a
   prologue node with a Nature one. */
function mapNumeral(l,ord){
  /* The ordinal is for the prologue's three unnumbered levels, so a LANDMARK
     is not given one even when it teaches: SPARRING is a hexagon sitting next
     to BOSS I's hexagon, and numbering it by position would print a campaign
     number on the one node in the section that deliberately has none. It
     falls through to the dot at the foot of this function. */
  if(l.tutorial&&!l.boss&&!l.trial)return String(ord);
  var m=l.name.match(/^(\d+)/); if(m)return m[1];
  var r=l.name.match(/^(?:TRIAL|BOSS)\s+([IVX]+)/); if(r)return r[1];
  return "·";
}

/* ============================================================
   THE SECTION CHOOSER

   LEVELS used to open the map straight onto whichever section you were in,
   with a scrolling tab strip along the top to move between them. Two things
   were wrong with that, and they are the same thing seen from either end.

   From the player's end: the strip is a control you have to notice, and what
   it controls - "which shelf of the campaign am I looking at" - is the one
   choice big enough to deserve a screen of its own. Four sections is a
   picture, not a list.

   From the code's end: every tab press rebuilt the whole map in place -
   trail, canvas, ambient loop and all - against a panel that was already
   open, which is where the section that came up half-drawn came from. Now
   there is no way to change section without leaving the map, so the map is
   built once per visit and torn down once, and the way back is the way in.

   The grid is 2x2 for the four numbered sections, which is the shape the
   owner asked for. PROLOGUE and V - EXTRA are the two that are not part of
   that four - one is before the campaign and one is after it - so they run
   full width above and below it rather than being crammed into the square.
   ============================================================ */
/* One emblem per section, keyed off the section's own scenery so the tile
   and the world cannot drift apart - the same trick mapWeatherKind() plays.
   All of them are drawn in the section's colour by `fill:currentColor`. */
/* ONE PATH PER ELEMENT, read from two places: the chooser's section tiles
   and the wardrobe's glyph for the character that section awards. They have
   to be the same drawing or the reward stops looking like it came from
   there, and two copies of a path is two copies to keep in step. */
var ELEM_PATH={
  trees:"M12 2.4c3 3.1 5.2 6 5.2 8.6a5.2 5.2 0 0 1-4.2 5.1V21h-2v-4.9"+
        "A5.2 5.2 0 0 1 6.8 11c0-2.6 2.2-5.5 5.2-8.6Z",
  hell:"M12 1.8c.6 3.2 2.1 4.4 3.5 5.9 1.6 1.7 2.7 3.4 2.7 5.7a6.2 "+
       "6.2 0 1 1-12.4 0c0-1.5.5-2.7 1.4-3.8.2 1.2.9 2 1.9 2.2.5-"+
       "3.4 1.3-6.9 2.9-10Z",
  ocean:"M2.4 9.6c2 0 2-1.8 4.8-1.8s2.8 1.8 4.8 1.8 2-1.8 4.8-1.8 "+
        "2.8 1.8 4.8 1.8v2.6c-2 0-2-1.8-4.8-1.8s-2.8 1.8-4.8 1.8-2-"+
        "1.8-4.8-1.8-2.8 1.8-4.8 1.8Zm0 6.2c2 0 2-1.8 4.8-1.8s2.8 "+
        "1.8 4.8 1.8 2-1.8 4.8-1.8 2.8 1.8 4.8 1.8v2.6c-2 0-2-1.8-"+
        "4.8-1.8s-2.8 1.8-4.8 1.8-2-1.8-4.8-1.8-2.8 1.8-4.8 1.8Z",
  desert:"M3.2 7.4 12 2.6l8.8 4.8v9.2L12 21.4l-8.8-4.8Zm2.2 1.9v6.6"+
         "L12 19.5l6.6-3.6V9.3L12 5.7ZM9.4 10.6h5.2v2.8H9.4Z"
};
function secEmblem(sec){
  var sc=sec&&sec.theme&&sec.theme.scene;
  /* PROLOGUE and V - EXTRA have no scenery of their own. The first gets the
     game's own piece, a cube seen corner-on, because that is all it teaches;
     the shelf gets a star, because beating every boss is what it is for. */
  var p=ELEM_PATH[sc]||(sec&&sec.locked
      ? "M12 2.2 14.9 8.6 21.8 9.4 16.7 14.1 18.1 21 12 17.5 5.9 21 7.3 14.1"+
        " 2.2 9.4 9.1 8.6Z"
      : "M12 2.2 21 7.4v9.2L12 21.8 3 16.6V7.4Zm0 2.5L5.4 8.5v7L12 19.3l6.6-"+
        "3.8v-7Z");
  return "<svg class='secem' viewBox='0 0 24 24' aria-hidden='true'>"+
         "<path d='"+p+"'/></svg>";
}
/* THE CHAINS AND THE PADLOCK, drawn rather than typed.

   A 🔒 glyph at this size is a smudge, and the game already paid for that
   lesson on the corner buttons ("icons are solid SVG"). Two crossed chains
   over the tile say shut in a way a badge in a corner does not, and they are
   two strokes each: a fat dark one for the links and a thin one in the tile's
   own ground punched through the middle, which is what makes a dashed line
   read as a row of rings rather than a row of dashes. */
function secChains(){
  return "<svg class='secchain' viewBox='0 0 200 120' preserveAspectRatio='none'"+
    " aria-hidden='true'>"+
    "<path class='ck' d='M-8 16 L208 104'/><path class='ki' d='M-8 16 L208 104'/>"+
    "<path class='ck' d='M-8 104 L208 16'/><path class='ki' d='M-8 104 L208 16'/>"+
    "</svg>";
}
function secLock(){
  return "<svg class='seclock' viewBox='0 0 24 24' aria-hidden='true'>"+
    "<path d='M12 1.8a4.8 4.8 0 0 0-4.8 4.8v2.6h2.6V6.6a2.2 2.2 0 1 1 4.4 0v2.6"+
      "h2.6V6.6A4.8 4.8 0 0 0 12 1.8Z'/>"+
    "<path d='M5.4 9.9h13.2c.9 0 1.6.7 1.6 1.6v9.1c0 .9-.7 1.6-1.6 1.6H5.4c-.9 "+
      "0-1.6-.7-1.6-1.6v-9.1c0-.9.7-1.6 1.6-1.6Zm6.6 3.4a1.9 1.9 0 0 0-1 3.5v2.1"+
      "h2v-2.1a1.9 1.9 0 0 0-1-3.5Z'/></svg>";
}

/* PROLOGUE IS NOT A DESTINATION. Its two levels are the tutorial - no par,
   no stars, `tutorial:true` - and the way back into them is REPLAY TUTORIAL
   in the settings panel, which is where a lesson belongs. A tile for them on
   the screen you pick a section from was offering the tutorial as a fifth
   place to go, next to four sections that are the game.

   Hidden from the chooser rather than removed from SECTIONS: `SECTIONS[].at`
   are array indices that verify.js asserts against LEVELS, mapSecOf() has to
   answer for level 0 and 1 like any other, and the tutorials still live at
   the front of the campaign. Only the tile is gone, and levelPicker() will
   not open on section 0 either. */
function secPickable(n){return n>0;}
/* The campaign's star total, counted over the sections that are actually on
   the chooser. One function, so the chooser's header and the map's cannot
   print two different numbers for the same thing. */
function campaignStars(){
  var t=0;
  for(var i=0;i<LEVELS.length;i++){
    if(!secPickable(mapSecOf(i))||LEVELS[i].tutorial)continue;
    t+=starsForRecord(LEVELS[i],progress[LEVELS[i].name]);
  }
  return t;
}
function sectionPicker(){
  // The chooser and the map share the ambient canvas, and only one of them is
  // ever on screen - stop the old loop before its canvas is replaced.
  mapBgStop();
  var spans=sectionSpans();
  var done=campaignStars(), cleared=0, total=0, i;
  for(i=0;i<LEVELS.length;i++){
    // The counts add up with the tiles on screen, so the tutorials are out of
    // both halves of the fraction rather than only out of the numerator.
    if(!secPickable(mapSecOf(i))||LEVELS[i].tutorial)continue;
    total++;
    if(mapTouched(i))cleared++;
  }
  var h="<canvas class='mbg' id='mBg' aria-hidden='true'></canvas>"+
    "<div class='mhead'><div class='mt'><b>I'm Just A Cube</b>"+
    /* THE SCREEN IS NAMED IN ITS SUBTITLE, not in its title. The title is
       one of the four player-visible strings that carry the game's name
       (docs/design/chrome.md) and must not be spent on a label; the subtitle
       was a bare fraction, which says how much is done without ever saying
       what of. "Worlds" is what these five are called everywhere else now -
       the map's footer button, the ad that opens one, the toast that says
       one has opened.

       WITHOUT "CLEARED", which the line used to end on: the header is one
       line that ellipsises, and on a 327px phone the added word pushed it to
       "WORLDS · 24 / 105 C…". Every tile under it spells out "N/N CLEARED"
       in full, so the fraction here is already read as progress. */
    "<span>WORLDS · "+cleared+" / "+total+"</span></div>"+
    /* NO ? HERE. It opened mapHelp(), which explains the shapes of the map's
       nodes - a disc, a hexagon, a diamond - and there is not one of those on
       this screen. Reported as a button that does nothing, which from the
       player's side is exactly what it was. It stays on the map, where the
       thing it explains is. */
    "<div class='mtot'>"+done+" ★</div>"+
    "<button class='mq mx' id='skClose' aria-label='Back to the level'>✕</button>"+
    "</div><div class='mbody secbody'><div class='secgrid' id='secGrid'></div></div>"+
    "<div class='pfoot'><button id='skMenu'>"+homeIcon()+"HOME</button>"+
    "<button id='skDone'>CLOSE</button></div>";
  showPanel(h,"secs");
  bind("skClose",hidePanel);
  bind("skDone",hidePanel);
  bind("skMenu",function(){hidePanel();homeShow();});
  secGridDraw();
}

function secGridDraw(){
  var spans=sectionSpans(), g=$("secGrid");
  if(!g)return;
  var here=mapSecOf(mapHere()), t="", n;
  for(n=0;n<SECTIONS.length;n++){
    if(!secPickable(n))continue;
    var sec=SECTIONS[n], sp=spans[n];
    // Locked for either reason: the shelf that waits on every boss, or a
    // section the campaign has simply not reached yet.
    // THE STATIC FLAG, NOT THE LIVE STATE. `sp.locked` is "shut right now",
    // which goes false the moment every boss is down - so on a finished save
    // the shelf stopped being the full-width row and fell back into the grid
    // as a fifth square. `SECTIONS[n].locked` is "this is the shelf", which
    // is what the layout is actually asking.
    var shelf=!!sec.locked, shut=!!sp.locked;
    var lk=shut||sec.at>mapReach();
    var buy=mapSectionSkippable(n);
    var pct=sp.max?Math.round(sp.got/sp.max*100):0;
    var cl=0,tot=0;
    for(var j=sp.from;j<=sp.to;j++){tot++;if(mapTouched(j))cl++;}
    var mst=sectionMastered(sp);
    var np=sec.name.split(" \u00b7 ");
    var num=np.length>1?np[0]:"", ttl=np.length>1?np.slice(1).join(" \u00b7 "):sec.name;
    // The four numbered sections are the square; the shelf that comes after
    // them runs the full width underneath it.
    var wide=shelf;
    t+="<button class='sectile"+(lk?" lk":"")+(mst?" mst":"")+
       (n===here&&!lk?" here":"")+(wide?" wide":"")+
       "' data-sec='"+n+"' style=\"--tabc:"+(sec.col||"#c3cde4")+"\">"+
       /* The numeral rides with the emblem and the word gets the tile's full
          width to itself. Kept on one line beside it, the longest name at the
          time - FUNDAMENTALS, since renamed to NATURE - was wider than a
          column on a 327px phone and broke mid-word. */
       "<span class='sectop'>"+secEmblem(sec)+
       (num?"<span class='secnum'>"+esc(num)+"</span>":"")+"</span>"+
       "<span class='secname'>"+esc(ttl)+"</span>"+
       "<span class='secsub'>"+esc(sec.sub)+"</span>"+
       // No bar where there is nothing to fill it: PROLOGUE is all tutorials,
       // so its max is 0 and an empty track read as a section never started.
       (sp.max?"<span class='secpb'><span style='width:"+(lk?0:pct)+
               "%'></span></span>":"")+
       "<span class='secf'><span>"+cl+"/"+tot+" cleared</span>"+
       (sp.max?"<span class='secst'>"+sp.got+"/"+sp.max+" ★</span>":"")+
       "</span>"+
       (mst?"<span class='secmast'>ALL STARS</span>":"")+
       (lk?secChains()+"<span class='seccap'>"+secLock()+
           "<span class='seccapt'>"+
           (shut?"BEAT EVERY BOSS":buy?"LOCKED":"KEEP PLAYING")+"</span>"+
           (buy?"<span class='secad'>"+(noLimits()?"OPEN":
                 adIcon()+"OPEN \u00b7 3 ADS")+"</span>":"")+
           "</span>":"")+
       "</button>";
  }
  g.innerHTML=t;
  g.querySelectorAll("[data-sec]").forEach(function(el){
    tap(el,function(){
      var s=+el.getAttribute("data-sec"), sp=sectionSpans()[s];
      /* THE SHELF IS THE ONE THING NOT FOR SALE, and pressing it has to say
         so rather than doing nothing: a tile that swallows a press reads as
         broken. Everything else opens its map - including a section still
         locked, where the ad card at the top of the map is the thing that
         opens it. Pressing the chip on the tile is the shortcut. */
      if(SECTIONS[s].locked&&sp.locked){
        flash(bossesLeft().length
          ? "still standing: "+bossesLeftSay()
          : "opening …");
        if(bossesLeft().length)return;
      }
      levelPicker(s);
    });
  });
  /* The ad chip is inside the tile, so it has to take the press before the
     tile does. tap() listens on pointerdown and stops propagation, and an
     event reaches the child before the parent it bubbles to - so the chip
     wins simply by being the inner element. */
  g.querySelectorAll(".sectile.lk .secad").forEach(function(el){
    var s=+el.parentNode.parentNode.getAttribute("data-sec");
    tap(el,function(){
      grantSkip(LEVELS[SECTIONS[s].at].name);
      secGridDraw();
      flash("world opened · no stars for a skip");
    });
  });
}

/* The map, on ONE section, chosen before you got here.

   `n` is that section. There is no way to change it from inside any more -
   the tab strip is gone, and the way to another section is out through
   sectionPicker() and back in. That is the whole fix for the section that
   came up half-drawn: the map is now built once per visit against a section
   that cannot change under it. */
function levelPicker(n){
  /* Opening the map while it is already open replaces the panel's innerHTML,
     and with it the canvas. Without this the old loop would still be running
     against the detached one - drawing nothing anybody can see, and refusing
     to start again because it thinks it is already going. */
  mapBgStop();
  if(typeof n==="number")mapSection=n;
  if(mapSection===null)mapSection=mapSecOf(mapHere());
  /* Never the tutorial's shelf. mapHere() is level 0 or 1 for somebody who
     has not finished the lesson, and the chooser has no tile to come back
     to - so LEVELS from inside the tutorial opens on the first real section
     instead of on a two-node trail with no stars on it. */
  if(!secPickable(mapSection))mapSection=1;
  var spans=sectionSpans();
  var here=mapHere();

  var h="<canvas class='mbg' id='mBg' aria-hidden='true'></canvas>"+
        "<div class='mhead'>"+
        /* The section's name WITHOUT its numeral. The card directly below
           carries "I \u00b7 NATURE" in full; up here, beside a star
           pill and two round buttons, the numeral is what pushes the word off
           the end of a 327px phone.

           THE BACK CHEVRON THAT USED TO SIT LEFT OF IT IS GONE, and that is
           the consistency pass rather than a loss: the way up now lives in
           the footer's LEFT button on every panel - SECTIONS here, HOME on
           the other three - and it is also the 30px that let the campaign
           total come back onto this header beside the ? and the \u2715. */
        "<div class='mt'><b>"+esc(SECTIONS[mapSection].name
          .split(" \u00b7 ").slice(-1)[0])+"</b>"+
        "<span id='mSub'></span></div>"+
        "<button class='mq' id='mHelp' aria-label='What the map means'>?</button>"+
        "<div class='mtot'>"+campaignStars()+" \u2605</div>"+
        /* The way back to the game, in the header where it is always on
           screen. The row at the foot of the panel is below a trail that can
           be several screens long, so after scrolling down a section there
           was nothing in sight that looked like an exit and the map read as
           somewhere the game had left you. */
        "<button class='mq mx' id='mExit' aria-label='Back to the level'>✕</button></div>"+
        "<div class='mbody' id='mBody'><div class='mcard' id='mCard'></div>"+
        "<div id='mtrail'><svg></svg></div></div>"+
        "<div class='pfoot'>"+
        "<button id='pkBack'>"+gridIcon()+"WORLDS</button><button id='pkClose'>CLOSE</button></div>"+
        "<div class='msheet' id='mSheet'></div>";
  showPanel(h,"map");   // syncCorners() adds .map and hides the corner total
  bind("pkBack",sectionPicker);
  bind("pkClose",hidePanel);
  bind("mExit",hidePanel);
  bind("mHelp",mapHelp);

  var sp0=spans[mapSection], cleared=0, tot0=0;
  for(var c=sp0.from;c<=sp0.to;c++){tot0++;if(mapTouched(c))cleared++;}
  $("mSub").textContent=cleared+" / "+tot0+" CLEARED";

  mapDraw(spans);
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
    /* The Census, one sentence per section. Under `sub` rather than instead
       of it: `sub` is the description a player needs to choose a section and
       the story is the reason they want to. Emitted only when a section
       carries one, so a section with no line simply has no line. */
    (sec.story?"<s class='mstory'>"+esc(sec.story)+"</s>":"")+
    "<u class='mbar'><u style='width:"+(lk?0:pct)+"%'></u></u>"+
    "<div class='mf'><span>"+cleared+"/"+tot+" cleared</span>"+
    "<span>"+sp.got+"/"+sp.max+" ★</span></div>"+
    /* NO LIMITS: the same door, without the toll. */
    (mapSectionSkippable(n)
      ? "<button class='skipsec' id='mSecAd'>"+(noLimits()?"START THIS WORLD":
          adIcon()+"START THIS WORLD · WATCH 3 ADS")+"</button>"
      : "")+
    /* THE LOCK HAS TO SAY WHAT IS HOLDING IT. This is the shelf, and the one
       thing a player cannot work out from anywhere else in the game is which
       fight their save still counts as unbeaten - a skipped boss reads as
       dealt with everywhere except here. Named on the card rather than only
       in the sheet, because the card is what is on screen the moment the tab
       is opened. */
    (sp.locked&&bossesLeft().length
      ? "<div class='mlock'>Still standing: <b>"+esc(bossesLeftSay())+
        "</b><button class='mlockgo' id='mBossGo'>GO THERE</button></div>"
      : "");
  var bg=$("mBossGo");
  if(bg)tap(bg,function(){
    var b=bossesLeft()[0];
    mapSection=mapSecOf(b);
    mapDraw(sectionSpans());
    mapSheet(b);
  });
  var sa=$("mSecAd");
  /* Opens the section's *first* level and nothing else, so the section is
     played from its beginning rather than handed over. */
  if(sa)tap(sa,function(){
    grantSkip(LEVELS[sec.at].name);
    mapDraw(sectionSpans());
    flash("world opened · no stars for a skip");
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
      /* Asked of the LEVEL, not of the node's shape. SPARRING is drawn as the
         fight it is - a hexagon, next to BOSS I's - and scored as the lesson
         it is, which is not at all; a row of stars under it would be three
         the player can never have. */
      if(l.tutorial)sh="<u>✓</u>";
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
    html+="<div class='mcap"+(right?" r":" l")+
      (k==="boss"||k==="trial"?" big":"")+"' data-half='"+half+"' data-off='"+
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
/* WHERE THE MAP OPENS. On the level you are up to, if it is in this section.

   If it is not - you are looking back at a section you have already been
   through - it used to jam the scroll to the very bottom, which is the FOOT
   of the trail, which is level one. The trail climbs, so that put the whole
   point of the section (the boss at the top) off screen above you, and it
   got reported as not being able to see the top of the levels. Opening on
   the furthest thing you have dealt with here is the same answer the `here`
   node gives, applied to a section you have finished: the trail is drawn
   top-down, so the first solved node in the DOM is the highest one. */
function mapFocus(){
  var body=$("mBody"); if(!body)return;
  var tr=$("mtrail");
  var el=tr.querySelector(".mnode.here")||
         tr.querySelector(".mnode.solved,.mnode.skipped");
  /* SCROLL #mBody AND NOTHING ELSE. This was scrollIntoView({block:"center"}),
     which walks *every* scrollable ancestor on the way up - and the panel is
     one of them, so centring a node halfway down the trail also slid the
     map's own header off the top of the screen. Visible in every map
     screenshot the project has: the title row cut in half at the top edge.
     It never mattered enough to chase while the way out was a footer button;
     it matters now that the way back to the section chooser is up there. */
  if(el&&el.getBoundingClientRect){
    var er=el.getBoundingClientRect(), br=body.getBoundingClientRect();
    body.scrollTop+=(er.top-br.top)-(body.clientHeight-er.height)/2;
    return;
  }
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
    var left=cx+parseFloat(el.getAttribute("data-off"))*(w*.5-44);
    el.style.left=left+"px";
    /* A caption is capped by the space its own node leaves it, measured
       rather than guessed at a percentage: a node far out to one side has
       less room on that side, and a flat 52% still ran off the edge for the
       longest name in Section I. `half` is the node's own half-width, which
       is what the transform beside it already shifts by. */
    var half=parseFloat(el.getAttribute("data-half"));
    if(!isNaN(half)){
      var room=el.classList.contains("r")
        ? w-(left+half+13)-8
        : (left-half-13)-8;
      el.style.maxWidth=Math.max(64,room)+"px";
    }
  });
}

function mapSheetClose(){$("mSheet").classList.remove("on");}

function mapSheet(i){
  var l=LEVELS[i], k=mapKind(l), st=mapState(i);
  var kind=k==="boss"?"BOSS · THREE PHASES":
           k==="trial"?"TRIAL · THREE CORES, ON A CLOCK":
           k==="tut"?"TUTORIAL · UNSCORED":"LEVEL";
  var meta=st==="solved"
      ? (k==="tut"?"<span class='g'>done</span>":
         "<span class='g'>"+starGlyphs(starsForRecord(l,progress[l.name]))+"</span> best so far")
    : st==="skipped"?"<span class='a'>skipped</span> · no stars yet, still playable"
    : st==="here"?"you are here"
    : st==="open"?"open - not played yet"
    /* Two different locks, and they were saying the same sentence. Ahead of
       the window you can clear what is in front of it or buy the door; on
       the shelf neither is true, and telling somebody to skip ahead onto the
       one thing an ad cannot open is how a lock becomes a dead end. */
    : mapSkippable(i)?"locked - clear what is in front of it, or skip ahead"
    : "locked - this world is still sealed";

  var acts,note;
  if(st==="locked"&&mapSkippable(i)){
    var ads=mapAds(k);
    var what=k==="boss"?"THE BOSS":k==="trial"?"THE TRIAL":"THIS LEVEL";
    acts=(noLimits()
         ? "<button class='go' id='mAd'>OPEN "+what+"</button>"
         : "<button class='ad' id='mAd'>"+adIcon()+"OPEN "+what+" · WATCH "+ads+
           " AD"+(ads>1?"S":"")+"</button>")+
         "<button class='qt' id='mNo'>NOT NOW</button>";
    note="Opens <b>this one</b> and nothing else, and awards <b>no stars</b>.";
  }else if(st==="locked"){
    /* The shelf, and the only lock in the game an ad cannot open. Which
       makes it the one lock that has to name its own condition: a boss you
       SKIPPED is not a boss you beat, and nothing else in the game ever says
       so. Skipping is offered by the game itself after three losses, so this
       is a state a player reaches by taking the help they were handed. */
    var lf=bossesLeft();
    acts=(lf.length&&!mapLocked(lf[0])
        ? "<button class='go' id='mBossTo'>GO TO "+esc(bossShort(LEVELS[lf[0]]))+"</button>"
        : "")+"<button class='qt' id='mNo'>CLOSE</button>";
    note="This world opens when every boss is <b>beaten</b> - the one "+
         "thing an ad cannot buy."+
         (lf.length?" Still standing: <b>"+esc(bossesLeftSay())+"</b>. A boss "+
          "you skipped still counts as standing.":"");
  }else{
    acts="<button class='go' id='mPlay'>"+(st==="solved"?"PLAY AGAIN":"PLAY")+
         "</button><button class='qt' id='mNo'>CLOSE</button>";
    note=st==="skipped"?"Not beaten yet. Its stars are still on the table."
      :k==="boss"?"No goal here. Three phases; clear the board to begin the next."
      :k==="trial"?"Three cores on a clock. Scored on lives."
      :(st==="solved"&&starsForRecord(l,progress[l.name])<3)
        ?"<b>Three stars means optimal.</b>":"";
  }
  $("mSheet").innerHTML="<div class='mk"+(k==="boss"?" b":k==="trial"?" t":"")+"'>"+
    kind+"</div><h4>"+esc(l.name)+"</h4><div class='mm'>"+meta+"</div>"+
    "<div class='ma'>"+acts+"</div>"+(note?"<div class='mn'>"+note+"</div>":"");
  $("mSheet").classList.add("on");
  bind("mNo",mapSheetClose);
  var bto=$("mBossTo");
  if(bto)tap(bto,function(){
    var b=bossesLeft()[0];
    mapSection=mapSecOf(b);
    mapDraw(sectionSpans());
    mapSheet(b);
  });
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
    mapDraw(sectionSpans());
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
    row("solved","7","<b>Solved.</b> Its stars sit underneath. Three means optimal.")+
    row("here","8","<b>Where you are.</b>")+
    row("open","9","<b>Open.</b> You can always reach a couple ahead.")+
    row("locked","●","<b>Locked.</b> Clear what is in front of it, or open it with an ad.")+
    row("skipped","●","<b>Skipped.</b> Its stars are still there to take.")+
    row("mtrial",mapShape("trial")+"<span>I</span>",
        "<b>Trial</b> \u2014 three cores, on a clock.")+
    row("mboss",mapShape("boss")+"<span>I</span>",
        "<b>Boss</b> - three phases. It closes the world.")+
    "</div><div class='mn'>Ads buy <b>progress, never score</b>. A skip awards "+
    "no stars, opens that level alone, and leaves it playable.</div>"+
    "<div class='ma'><button class='qt' id='mNo'>CLOSE</button></div>";
  $("mSheet").classList.add("on");
  bind("mNo",mapSheetClose);
}

/* THE PIECES, IN ONE LINE EACH.

   This used to run to a paragraph a piece - "casts into the plane", "ground
   in the volume, a hole in the plane", "poisons the whole column it folds
   into" - which is the code's own vocabulary handed to somebody who has
   never read it. A player has three words for this game: 2D, 3D, and the
   name of the thing in front of them. So each piece gets one sentence in
   those words, and the two that were still called by their old names are
   called what they are drawn as: water and fire. */
function legendPanel(){
  showPanel("<h3>THE PIECES</h3>"+
    "<div class='leg'><i style='background:#5a6d94'></i><span><b>Stone</b> \u2014 "+
      "solid, and still there in 2D.</span></div>"+
    "<div class='leg'><i style='background:#7fc4d8;opacity:.65'></i><span><b>Water</b> \u2014 "+
      "stand on it. It leaves nothing in 2D.</span></div>"+
    "<div class='leg'><i style='background:#8a3040'></i><span><b>Fire</b> \u2014 "+
      "it burns you. In 2D it burns the whole line.</span></div>"+
    "<div class='leg'><i style='background:#9b7fd4'></i><span><b>Crate</b> \u2014 "+
      "walk into it and it slides. It reshapes 2D.</span></div>"+
    "<div class='leg'><i style='background:#d9a441'></i><span><b>Amber</b> \u2014 "+
      "catches you on the way back to 3D. It pins a crate.</span></div>"+
    "<div class='leg'><i style='background:#d6336c'></i><span><b>You</b> \u2014 "+
      "one square, and whatever shape you are wearing.</span></div>"+
    "<div class='leg'><i style='background:#35c2a5'></i><span><b>Goal</b> \u2014 "+
      "reach it in 3D. Standing on it in 2D is not enough.</span></div>"+
    "<div class='leg'><i style='background:transparent;border:1px solid var(--rule)'></i>"+
      "<span><b>The eye</b> \u2014 hold it to see how far away things are. "+
      "Costs no move.</span></div>"+
    "<div class='prow'><button id='lgBack'>BACK</button></div>");
  bind("lgBack",menuPanel);
}

/* ============================================================
   MY LEVELS
   ============================================================
   The player's own levels, as a place rather than as a tool.

   What was here before was LIBRARY: a list sorted by the solver's
   difficulty score, reachable only from inside the editor, and a level could
   not enter it at all until it was solvable - VERIFY, then SAVE. That is a
   level designer's workflow, and it costs a beginner their work: build half
   a level, put the game down, and there was nothing to come back to.

   So: MY LEVELS is opened from the home screen, it lists what you have made
   in the order you made it, and every row carries the four things you can do
   to a level you own - open it, rename it, share it, delete it. ADD LEVEL is
   the top button because starting one is the thing this screen is for.

   Three rules hold the whole screen up:

   - A LEVEL EXISTS BEFORE IT WORKS. The entry is created when you name it,
     and every edit writes whatever is on the board - unsolvable, half-built,
     one block (autosave(), js/14-editor.js; there is no SAVE button any
     more). Solvability is what VERIFY is for, and it stays advice.
   - YOU BUILD WITH WHAT YOU HAVE BEEN SHOWN. The piece chips and the ground
     choices are filtered by how far the campaign has actually taken you
     (seenTools(), seenSections()), so the editor teaches in the same order
     the game does rather than opening with five pieces nobody has met.
   - SHARE IS TEXT. There is no server here and there is not going to be one,
     so a shared level is a short code you copy - `OL2<64 characters>~Name`,
     one line, the same length for every level - and LOAD A LEVEL is that
     code pasted back in. It was the project file's JSON for one level,
     which is the same thing in five to ten times the characters; JSON and
     the older `OL1` codes are both still read on the way in. See the share
     code above shareCode(). */

/* The sections whose ground a custom level may be built on: the ones the
   campaign has actually walked you through. Same seenIndex() the piece chips
   use, so the ground and the blocks can never disagree about what you have
   been shown. */
function seenSections(){
  var out=[],reach=seenIndex();
  for(var i=0;i<SECTIONS.length;i++){
    if(SECTIONS[i].at>reach)continue;
    if(SECTIONS[i].locked&&!sectionsUnlocked())continue;
    out.push(i);
  }
  if(!out.length)out.push(0);
  return out;
}
// "IV · DESERT" is the section; "DESERT" is the ground. The short half is
// derived rather than authored so renaming a section renames its ground too.
function groundName(n){
  var nm=SECTIONS[n].name;
  var dot=nm.indexOf("·");
  return (dot<0?nm:nm.slice(dot+1)).trim();
}
/* The theme a custom level is built on. Stored as a section index, so a
   custom level inherits every part of a section's look - sky, ground,
   scenery, weather, the paper it folds onto - rather than a surface name
   that would leave the sky behind. Null is the default night, which is what
   the editor has always drawn on. */
function levelTheme(lv){
  if(!lv||lv.theme==null||typeof SECTIONS==="undefined")return null;
  var s=SECTIONS[lv.theme];
  return s?s.theme:null;
}
// What a row says about a level under its name. A level that has never
// solved says so plainly: it is a draft, not a broken thing.
function levelNote(lv){
  var g=(lv.theme!=null&&SECTIONS[lv.theme])?groundName(lv.theme):"NIGHT";
  if(lv.score==null)return g.toLowerCase()+" · draft";
  return g.toLowerCase()+" · "+tierOf(lv.score)+" · "+lv.moves+" moves";
}
/* THE WORLD A LEVEL STANDS IN, as a colour and a picture.

   MY LEVELS was a grey list: four identical rows of white text and grey
   buttons, on a screen the player reached from a home screen where every
   other door is coloured. Nothing on it said which of your levels was which
   before the name was read, and nothing said anything at all about the
   worlds the game had just spent four sections teaching.

   A custom level already carries its ground as a SECTIONS index, so it
   already has both: `col`, the colour that section wears on the chooser, the
   map and CONTINUE, and secEmblem(), the glyph its tile carries. This is the
   one lookup both the row and the NEW LEVEL chips read, so a ground looks
   the same wherever it is offered or shown. A level with no ground is the
   editor's default night, which is PROLOGUE's own slate. */
function groundOf(n){
  var s=(n!=null&&typeof SECTIONS!=="undefined")?SECTIONS[n]:null;
  return {sec:s,col:(s&&s.col)||"#7183a6",
          name:s?groundName(n):"night",
          em:secEmblem(s)};
}

/* THE PAGE SHAPE, borrowed rather than re-invented. MY LEVELS is a place you
   go, like the map and the wardrobe, so it is a full-height panel wearing the
   same furniture they wear: a header that says where you are with the way out
   in it, a body that scrolls, and a footer whose LEFT button goes up one
   level and whose RIGHT one closes. Every screen under MY LEVELS goes through
   here, so naming a level and sharing one cannot drift into two shapes.

   It was an ordinary panel first - a 44vh sheet floating over the home
   screen with its buttons in `.prow` pairs - and that is what a decision
   looks like in this game, not what a place looks like. */
function mlScreen(title,sub,body,foot){
  showPanel(
    "<div class='phead'><div class='pt'><b>"+title+"</b>"+
      (sub?"<span>"+sub+"</span>":"")+"</div>"+
      "<div class='mtot'>"+starsEarned()+" ★</div>"+
      "<button class='mq mx' id='mlX' aria-label='Back to the level'>✕</button>"+
    "</div>"+
    "<div class='pbody'>"+body+"</div>"+
    "<div class='pfoot'>"+foot+"</div>","mylevels");
  bind("mlX",hidePanel);
}
/* THE LEVEL THE SCREEN IS ABOUT, at the top of it. RENAME, SHARE and DELETE
   each act on exactly one level, and each used to open on a header, a
   sentence and a button - three screens that looked the same and named the
   level only in a subtitle in caps. This is the row from MY LEVELS with its
   verbs taken off: the same emblem, the same colour, the same two lines, so
   the screen you land on is visibly the row you pressed. */
function mlHero(lv){
  var g=groundOf(lv.theme);
  var meta=g.name.toLowerCase()+(lv.score==null?" · draft":
    " · "+lv.moves+" moves");
  return "<div class='mlhero' style='--sec:"+g.col+"'>"+
    "<span class='mlem'>"+g.em+"</span>"+
    "<span class='mlmain'><b>"+esc(lv.name)+"</b>"+
      "<span class='mlmeta'>"+esc(meta)+"</span></span></div>";
}
// The footer every screen under MY LEVELS wears: up one level, then out.
function mlFoot(backId,backLabel){
  return "<button id='"+backId+"'>"+backLabel+"</button>"+
         "<button id='mlClose'>CLOSE</button>";
}

function myLevelsPanel(){
  var body="<button class='mlbtn pgo' id='mlAdd'>+ &nbsp;ADD LEVEL</button>"+
           "<button class='mlbtn' id='mlLoad'>"+upIcon()+"LOAD A LEVEL</button>";
  if(!library.length){
    /* NOTHING YET IS A PICTURE, not a paragraph of grey. An empty list is
       the first thing most players see here, so it carries the same block
       the editor's SOLID chip carries - the thing they are about to place -
       over the sentence that says what the two buttons do. */
    body+="<div class='mlnone'>"+
      "<svg class='mlnonecu' viewBox='0 0 24 24' aria-hidden='true'>"+
        "<path class='ft' d='M12 3.4 20.6 8.3 12 13.2 3.4 8.3Z'/>"+
        "<path class='fl' d='M3.4 8.3 12 13.2v7.4L3.4 15.7Z'/>"+
        "<path class='fr' d='M20.6 8.3 12 13.2v7.4l8.6-4.9Z'/></svg>"+
      "<b>No levels yet</b>"+
      "<span>ADD LEVEL asks for a name and opens the editor on it. "+
      "It keeps itself as you build - finished or not.</span></div>";
  } else {
    /* ONE LEVEL, ONE LINE, and the line is as wide as the buttons above it.
       The name takes whatever the row's five verbs leave and ellipsises;
       everything else a level could say about itself - its ground, its tier,
       its move count - is on MORE, because this screen is a list of your
       levels rather than a report on them. The one exception is a draft,
       which is said here: it is the difference between a level that plays
       and one that does not. */
    body+="<div class='mllist'>";
    for(var i=0;i<library.length;i++){
      var lv=library[i], g=groundOf(lv.theme);
      /* GROUND AND LENGTH, and not the tier. Three facts do not fit beside
         four buttons at a size anyone would read, and of the three the
         solver's difficulty word is the one that is already on MORE - the
         ground is what the emblem beside it is saying, and the move count is
         the only number the player set themselves. */
      var meta=g.name.toLowerCase()+(lv.score==null?"":" · "+lv.moves+" moves");
      /* WHAT THE LEVEL IS, THEN WHAT YOU CAN DO TO IT. The four verbs used
         to share a line with the name, and on the owner's 327px phone the
         name lost - "The Long Way Round" ellipsised to make room for four
         buttons that are identical on every row. They get their own line
         across the whole card instead, which is also the first time they
         have been a comfortable size to hit. */
      body+="<div class='mlrow' style='--sec:"+g.col+"'>"+
        "<span class='mlhead'>"+
          "<span class='mlem'>"+g.em+"</span>"+
          "<span class='mlmain'>"+
            "<span class='mltop'><span class='lname'>"+esc(lv.name)+"</span>"+
              (lv.score==null?"<i class='mldraft'>DRAFT</i>":"")+
              "<button class='mini mlic' data-name='"+lv.id+"' "+
                "aria-label='Rename'>"+penIcon()+"</button></span>"+
            "<span class='mlmeta'>"+esc(meta)+"</span>"+
          "</span>"+
        "</span>"+
        "<span class='lbtns'>"+
          "<button class='mini mlic mlplay' data-play='"+lv.id+"' "+
            "aria-label='Play'>"+playIcon()+"</button>"+
          "<button class='mini' data-edit='"+lv.id+"'>EDIT</button>"+
          "<button class='mini mlic' data-share='"+lv.id+"' "+
            "aria-label='Share'>"+shareIcon()+"</button>"+
          "<button class='mini mlx' data-del='"+lv.id+"' "+
            "aria-label='Delete'>×</button>"+
        "</span></div>";
    }
    body+="</div>";
  }
  /* NO MORE TOOLS BUTTON, on the owner's call. This screen has two actions
     and a list, and a third door at the foot of it - to a panel of a level
     designer's tools - is a door most players have no use for. libraryPanel()
     is intact and one `bind` away, the same way legendPanel() is; the
     composer and the project file are behind it. */
  mlScreen("My Levels",library.length+" LEVEL"+(library.length===1?"":"S"),body,
    "<button id='mlHome'>"+homeIcon()+"HOME</button>"+
    "<button id='mlClose'>CLOSE</button>");

  var p=$("panel");
  p.querySelectorAll("[data-play]").forEach(function(el){
    tap(el,function(){startLibrary(el.getAttribute("data-play"));});
  });
  p.querySelectorAll("[data-edit]").forEach(function(el){
    tap(el,function(){editLevel(el.getAttribute("data-edit"));});
  });
  p.querySelectorAll("[data-name]").forEach(function(el){
    tap(el,function(){renamePanel(el.getAttribute("data-name"));});
  });
  p.querySelectorAll("[data-share]").forEach(function(el){
    tap(el,function(){sharePanel(el.getAttribute("data-share"));});
  });
  p.querySelectorAll("[data-del]").forEach(function(el){
    tap(el,function(){deletePanel(el.getAttribute("data-del"));});
  });
  bind("mlAdd",newLevelPanel);
  bind("mlLoad",loadLevelPanel);
  bind("mlHome",function(){hidePanel();homeShow();});
  bind("mlClose",hidePanel);
}

/* NAMING IS THE FIRST STEP, not the last one. The name is what the row on
   MY LEVELS is, so a level cannot be made without one - and the ground is
   asked for in the same breath because it is the one decision that is
   awkward to change once there are blocks standing on it. */
function newLevelPanel(){
  var secs=seenSections(),pick=secs[0],keep="";
  function draw(){
    /* A GROUND CHIP IS THE WORLD IT PICKS: its section's colour and its
       section's emblem, the same pair the chooser tile and the row on MY
       LEVELS wear. It used to be the word alone in the editor's grey chip,
       which asked the player to remember that FIRE is the red one - on a
       screen whose whole question is "which world?". */
    var chips="";
    for(var i=0;i<secs.length;i++){
      var g=groundOf(secs[i]);
      chips+="<button class='chip gchip"+(secs[i]===pick?" sel":"")+
             "' style='--c:"+g.col+"' data-g='"+secs[i]+"'>"+g.em+
             "<i>"+esc(groundName(secs[i]))+"</i></button>";
    }
    mlScreen("New Level","NAME AND GROUND",
      "<input id='nlName' placeholder='level name' />"+
      "<div class='note'>GROUND - the world your level stands in.</div>"+
      "<div class='grow'>"+chips+"</div>"+
      "<button class='mlbtn pgo' id='nlGo'>CREATE</button>",
      mlFoot("nlBack","← MY LEVELS"));
    $("nlName").value=keep;
    $("panel").querySelectorAll("[data-g]").forEach(function(el){
      tap(el,function(){keep=$("nlName").value;pick=+el.getAttribute("data-g");draw();});
    });
    bind("mlClose",hidePanel);
    bind("nlBack",myLevelsPanel);
    bind("nlGo",function(){
      var nm=($("nlName").value||"").trim();
      if(!nm){flash("give it a name first");return;}
      var e={id:"l"+Date.now(),name:nm,blocks:[],keys:[],
             start:[0,1,0],goal:[3,1,0],rotate:true,theme:pick,
             score:null,moves:null,needsRot:false,flattens:0};
      library.push(e);
      libSave().then(function(){loadIntoEditor(e);flash("new level - "+nm);});
    });
  }
  draw();
}

function loadIntoEditor(lv){
  snapshot();
  custom.name=lv.name;
  custom.blocks=lv.blocks.map(function(v){return v.slice();});
  custom.keys=(lv.keys||[]).map(function(v){return v.slice();});
  custom.start=lv.start.slice();custom.goal=lv.goal.slice();
  custom.rotate=lv.rotate!==false;
  custom.theme=(lv.theme==null?null:lv.theme);
  editingId=lv.id;
  /* Freshly loaded is freshly saved: the board and the library entry agree.
     saveCancel() rather than a flag, because the snapshot() at the top of
     this function has already scheduled a write of the board that was here
     a moment ago - and that board belongs to the level we are leaving, not
     to this one. */
  saveCancel();
  ghosted.clear();
  enterEditor();
}
function editLevel(id){
  var lv=findLevel(id);
  if(!lv)return;
  loadIntoEditor(lv);
  flash("editing "+lv.name);
}

function renamePanel(id){
  var lv=findLevel(id);
  if(!lv)return;
  mlScreen("Rename",esc(lv.name).toUpperCase(),
    mlHero(lv)+
    "<input id='rnName' placeholder='level name' />"+
    "<button class='mlbtn pgo' id='rnGo'>RENAME</button>",
    mlFoot("rnBack","← MY LEVELS"));
  $("rnName").value=lv.name;
  bind("mlClose",hidePanel);
  bind("rnBack",myLevelsPanel);
  bind("rnGo",function(){
    var nm=($("rnName").value||"").trim();
    if(!nm){flash("give it a name first");return;}
    lv.name=nm;
    // The editor is showing this level's name in the HUD if it is the one
    // open, so the two are kept in step rather than left to disagree.
    if(editingId===id)custom.name=nm;
    libSave().then(function(){myLevelsPanel();flash("renamed");});
  });
}

/* DELETING IS THE ONE THING HERE THAT CANNOT BE UNDONE - there is no undo
   stack for the library and no copy of it anywhere else - so it is the one
   thing that asks. */
function deletePanel(id){
  var lv=findLevel(id);
  if(!lv)return;
  mlScreen("Delete",esc(lv.name).toUpperCase(),
    mlHero(lv)+
    "<div class='note'>This cannot be undone, and there is no copy of it "+
    "anywhere else.</div>"+
    "<button class='mlbtn pdanger' id='dlGo'>DELETE IT</button>",
    mlFoot("dlBack","← KEEP IT"));
  bind("mlClose",hidePanel);
  bind("dlBack",myLevelsPanel);
  bind("dlGo",function(){
    library=library.filter(function(x){return x.id!==id;});
    if(editingId===id)editingId=null;
    libSave().then(function(){myLevelsPanel();flash("deleted");});
  });
}

/* SHARING IS TEXT, and it is now ONE LINE of it - see the share code below.
   It used to be the project file's JSON for a single level, which is the
   same thing said in about five times the characters; the code is what a
   person can actually paste into a message. Selected on open, because the
   whole point is to copy it and a textarea you have to drag-select on a
   phone is not a share button. */
function sharePanel(id){
  var lv=findLevel(id);
  if(!lv)return;
  mlScreen("Share",esc(lv.name).toUpperCase(),
    mlHero(lv)+
    "<div class='note'>Copy this and send it. Whoever gets it pastes it into "+
    "LOAD A LEVEL.</div>"+
    "<textarea id='shTxt' class='shcode'></textarea>"+
    "<button class='mlbtn pgo' id='shCopy'>COPY</button>",
    mlFoot("shBack","← MY LEVELS"));
  $("shTxt").value=shareCode(lv);
  $("shTxt").focus();$("shTxt").select();
  bind("mlClose",hidePanel);
  bind("shBack",myLevelsPanel);
  bind("shCopy",function(){
    var t=$("shTxt");t.focus();t.select();
    /* Three ways, because all three fail somewhere real: the async clipboard
       needs a secure context and a permission, execCommand is deprecated but
       is what an old WebView has, and if both refuse the text is already
       selected on screen and the player can copy it by hand. */
    var done=false;
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(t.value);done=true;
      }
    }catch(e){}
    if(!done){try{done=document.execCommand("copy");}catch(e){}}
    flash(done?"copied":"select it and copy");
  });
}
function shareData(lv){
  return {format:"orthogonal-level-1",name:lv.name,blocks:lv.blocks,
          keys:lv.keys||[],start:lv.start,goal:lv.goal,
          rotate:lv.rotate!==false,theme:lv.theme==null?null:lv.theme};
}

/* ============================================================
   THE SHARE CODE - one level, one code, always the same length

   WHAT A LEVEL COSTS AS JSON is about fourteen characters per block, and
   almost all of it is punctuation: `[3,0,-4],` is nine characters carrying
   three small numbers. A thirty-block level came out around 600 characters
   of brackets and commas, which is four screens on a phone, wraps in every
   chat app, and looks like something has gone wrong rather than like a
   thing you send a friend.

   IT IS NOT A SECRET AND IT IS NOT TRYING TO BE, and it is NOT A HASH -
   it cannot be. A hash is one way: you can check a thing against one, you
   can never get the thing back out. The whole level has to be inside this
   string, because there is no server anywhere in this game to look an id up
   in and there is not going to be one. So what a code can be is FIXED
   WIDTH: every level padded out to the same length, whatever is in it.
   That is what SHARE_WIDTH is, and everything below exists to make the
   width small enough to be worth fixing.

   HOW IT PACKS. Every number is zigzagged (so -1 costs what 1 costs) and
   written little-endian in five-bit groups, one character each, with the
   sixth bit set while more groups follow - so anything in -16..15 is ONE
   character, which is every coordinate a hand-built level has ever had.
   The alphabet is 64 URL-safe characters, so a code survives a link, a QR,
   an SMS and a chat app that thinks it knows what a quote mark is.

   AND THE BLOCKS ARE PACKED TWO WAYS, THE SHORTER ONE WINNING. As a LIST
   they cost four characters each, which is cheap when a level is a handful
   of blocks scattered wide. As a BITMAP - the bounding box, then one bit
   per cell in it - they cost one sixth of a character per cell no matter
   how many are filled, which is far cheaper the moment a level is dense.
   Neither wins everywhere: the campaign's worst level is 154 characters as
   a list and 125 as a bitmap, but the sparse ones invert that (12 blocks
   spread over a 660-cell box: 57 as a list, 125 as a bitmap). So both are
   built and the shorter is sent, with one flag bit saying which - and the
   worst level in the whole campaign lands at 57 characters instead of 154,
   which is what makes a fixed 64 affordable. Kinds ride separately, three
   bits per filled cell, and only when a level has anything but stone in it.

   WHY 64. Measured over every campaign level: median 29 characters, worst
   57. 64 is the next power of two above the worst case and leaves seven
   characters of slack, so every level a person is likely to build is one
   code of exactly 64 characters. A level too big for that does not fail -
   the code rounds up to the next multiple (128, and so on), which is the
   honest thing for a format to do rather than refusing to carry a level
   somebody made. Padding is the alphabet's zero, and the reader stops when
   it has read what the header said, so the padding is never looked at.

   THE NAME RIDES AT THE END, after a `~`, in plain text. The payload is
   pure alphabet so a `~` can never appear inside it and the split is
   unambiguous, and a name is the one part a human should be able to read
   before pasting a stranger's code into their game. That is also the one
   part that is not fixed width, deliberately: the CODE is a fixed length,
   the label on it is as long as the person's own words.

   VERSIONED BY ITS PREFIX. `OL2` is this shape; `OL1` was the variable
   length first one and is still read, because a format that invalidates
   what people have already sent each other is not a better format. JSON is
   read on the way in for the same reason, and because a project file is
   JSON by definition.
   ============================================================ */
var SHARE_ALPHA="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
var SHARE_TAG="OL2";        // this shape: fixed width, two block packings
var SHARE_TAG1="OL1";       // the first shape: variable length, list only
var SHARE_WIDTH=64;         // every code is this many characters, or a multiple

/* The writer. Numbers first, bits last, and that order is a rule rather
   than a habit: a bit is six-to-a-character and a number is a whole one, so
   a number written after a partial character would have to flush it and
   waste up to five bits. Every layout below writes its header as numbers
   and then runs the bitmap to the end. */
function shareW(){
  var w={s:"",acc:0,n:0};
  w.num=function(v){
    var u=Math.round(v),g;
    u=u<0?(-u*2-1):(u*2);
    do{g=u&31;u=Math.floor(u/32);w.s+=SHARE_ALPHA.charAt(g+(u>0?32:0));}while(u>0);
  };
  w.bit=function(b){
    w.acc=w.acc*2+(b?1:0);
    if(++w.n===6){w.s+=SHARE_ALPHA.charAt(w.acc);w.acc=0;w.n=0;}
  };
  w.bits=function(v,n){for(var i=n-1;i>=0;i--)w.bit((v>>i)&1);};
  w.end=function(){while(w.n)w.bit(0);return w.s;};   // pad the last character
  return w;
}
/* The reader, and it THROWS rather than returning a sentinel: every caller
   is inside one try, and a code that has run out of characters is not a
   level in any of the dozen places that would otherwise have to check. */
function shareR(s){
  var r={s:s,i:0,acc:0,n:0};
  r.chr=function(){
    if(r.i>=r.s.length)throw 0;
    var v=SHARE_ALPHA.indexOf(r.s.charAt(r.i++));
    if(v<0)throw 0;                       // not our alphabet: not our code
    return v;
  };
  r.num=function(){
    var u=0,sh=1,v;
    for(;;){v=r.chr();u+=(v&31)*sh;sh*=32;if(!(v&32))break;}
    return u&1?-((u+1)/2):u/2;
  };
  r.bit=function(){
    if(!r.n){r.acc=r.chr();r.n=6;}
    return (r.acc>>(--r.n))&1;
  };
  r.bits=function(n){var v=0;while(n--)v=v*2+r.bit();return v;};
  return r;
}
/* One level, packed one of the two ways. Returns null when this packing
   cannot carry this level at all, so the caller simply takes the other. */
function shareBody(d,bmp){
  var blocks=d.blocks||[],n=blocks.length,i,b,special=false;
  for(i=0;i<n;i++){
    b=blocks[i];
    if(b[3])special=true;
    // Three bits per cell is what the bitmap has room for. Nothing in the
    // game is above 4, but a pasted-in level is not the game.
    if(bmp&&((b[3]||0)<0||(b[3]||0)>7))return null;
  }
  var box=null;
  if(bmp){
    if(!n)return null;
    var x0=blocks[0][0],x1=x0,y0=blocks[0][1],y1=y0,z0=blocks[0][2],z1=z0;
    for(i=1;i<n;i++){
      b=blocks[i];
      if(b[0]<x0)x0=b[0]; if(b[0]>x1)x1=b[0];
      if(b[1]<y0)y0=b[1]; if(b[1]>y1)y1=b[1];
      if(b[2]<z0)z0=b[2]; if(b[2]>z1)z1=b[2];
    }
    box={x:x0,y:y0,z:z0,w:x1-x0+1,h:y1-y0+1,d:z1-z0+1};
    if(box.w*box.h*box.d>200000)return null;      // a box nobody should send
  }
  var w=shareW();
  w.num((d.rotate?1:0)|(d.theme==null?0:2)|(bmp?4:0)|(special?8:0));
  if(d.theme!=null)w.num(d.theme);
  w.num(d.start[0]);w.num(d.start[1]);w.num(d.start[2]);
  w.num(d.goal[0]);w.num(d.goal[1]);w.num(d.goal[2]);
  /* Keys come before the blocks here, where in OL1 they came after. They
     are numbers and the bitmap is bits, and bits have to be last. */
  var keys=d.keys||[];
  w.num(keys.length);
  for(i=0;i<keys.length;i++){w.num(keys[i][0]);w.num(keys[i][1]);w.num(keys[i][2]);}
  if(!bmp){
    w.num(n);
    for(i=0;i<n;i++){b=blocks[i];w.num(b[0]);w.num(b[1]);w.num(b[2]);w.num(b[3]||0);}
    return w.end();
  }
  w.num(box.x);w.num(box.y);w.num(box.z);
  w.num(box.w);w.num(box.h);w.num(box.d);
  var at={},kinds=[],x,y,z,k;
  for(i=0;i<n;i++){b=blocks[i];at[K(b[0],b[1],b[2])]=b[3]||0;}
  for(x=0;x<box.w;x++)for(y=0;y<box.h;y++)for(z=0;z<box.d;z++){
    k=at[K(box.x+x,box.y+y,box.z+z)];
    w.bit(k===undefined?0:1);
    if(k!==undefined)kinds.push(k);
  }
  if(special)for(i=0;i<kinds.length;i++)w.bits(kinds[i],3);
  return w.end();
}
function shareCode(lv){
  var d=shareData(lv);
  var list=shareBody(d,false),bmp=shareBody(d,true),body=list;
  if(bmp&&(!list||bmp.length<list.length))body=bmp;
  if(!body)body="";
  // Out to the fixed width, or to the next multiple of it for a level too
  // big to fit one, and the last character of it checks the rest.
  var want=Math.max(SHARE_WIDTH,Math.ceil((body.length+1)/SHARE_WIDTH)*SHARE_WIDTH);
  body=sharePad(body,want-1);
  body+=shareSum(body);
  // The name is trimmed of newlines only: it sits at the end of a line a
  // chat app may wrap, and a name with a newline in it would cut the code
  // in half on the way back.
  return SHARE_TAG+body+"~"+String(d.name||"Untitled").replace(/[\r\n]+/g," ");
}
/* THE PADDING IS NOISE, NOT ZEROS, and that is a legibility decision rather
   than a technical one. The reader stops when the header says it has
   everything, so the tail could be anything - and a nine-block level padded
   with the alphabet's zero came out as `OL2A0202268000046C_003320` followed
   by forty `0`s, which looks like a bug in front of a player who has no
   reason to know what padding is. Seeded from the body itself, so it is
   deterministic: the same level always makes the same code, which is what
   makes a code comparable at all. Nothing reads it. */
function sharePad(s,n){
  var h=0,i;
  for(i=0;i<s.length;i++)h=(h*31+SHARE_ALPHA.indexOf(s.charAt(i)))%2147483647;
  var out=s;
  while(out.length<n){
    h=(h*1103515245+12345)%2147483647;
    out+=SHARE_ALPHA.charAt((h>>9)&63);
  }
  return out;
}
/* THE LAST CHARACTER OF AN OL2 BODY CHECKS THE REST OF IT, and the fixed
   width checks itself: a body whose length is not a multiple of SHARE_WIDTH
   has lost or gained characters. Together they are what a variable-length
   code could not have. A short code used to decode happily into a SMALLER
   level - drop the tail of a 64-character code and the header inside it is
   still a complete, wrong level - and silently handing somebody a level
   that is not the one they were sent is worse than refusing the paste.
   It is position-weighted, so a transposition moves it as well as a
   substitution does. Measured over 145,152 single-character changes across
   40 levels' codes: 99.05% refused. Not a guarantee - it is one character -
   but it is the difference between "that isn't a level" and a level with a
   hole in it, for one of the seven characters the width had spare. */
function shareSum(s){
  var t=0;
  for(var i=0;i<s.length;i++)t=(t+SHARE_ALPHA.indexOf(s.charAt(i))*(i%7+1))%64;
  return SHARE_ALPHA.charAt(t);
}
/* OL2. Reads exactly what the header says is there and stops, so the
   padding after it is never looked at. */
function shareRead2(body){
  var r=shareR(body),i,o={format:"orthogonal-level-1",blocks:[],keys:[]};
  var f=r.num();
  o.rotate=(f&1)!==0;
  o.theme=(f&2)?r.num():null;
  o.start=[r.num(),r.num(),r.num()];
  o.goal=[r.num(),r.num(),r.num()];
  var nk=r.num();
  if(!(nk>=0&&nk<4096))return null;
  for(i=0;i<nk;i++)o.keys.push([r.num(),r.num(),r.num()]);
  if(f&4){
    var bx=r.num(),by=r.num(),bz=r.num(),w=r.num(),h=r.num(),d=r.num();
    if(!(w>0&&h>0&&d>0)||w*h*d>200000)return null;
    var x,y,z;
    for(x=0;x<w;x++)for(y=0;y<h;y++)for(z=0;z<d;z++)
      if(r.bit())o.blocks.push([bx+x,by+y,bz+z]);
    if(f&8)for(i=0;i<o.blocks.length;i++){
      var k=r.bits(3);
      if(k)o.blocks[i].push(k);
    }
  } else {
    var nb=r.num();
    if(!(nb>0&&nb<20000))return null;
    for(i=0;i<nb;i++){
      var b=[r.num(),r.num(),r.num()],bk=r.num();
      if(bk)b.push(bk);
      o.blocks.push(b);
    }
  }
  return o.blocks.length?o:null;
}
/* OL1, the first shape - variable length, list only, keys after the blocks.
   Kept because codes in this shape have been sent. */
function shareRead1(body){
  var r=shareR(body),i,o={format:"orthogonal-level-1",blocks:[],keys:[]};
  var f=r.num();
  o.rotate=(f&1)!==0;
  o.theme=(f&2)?r.num():null;
  o.start=[r.num(),r.num(),r.num()];
  o.goal=[r.num(),r.num(),r.num()];
  var nb=r.num();
  if(!(nb>0&&nb<20000))return null;
  for(i=0;i<nb;i++){
    var b=[r.num(),r.num(),r.num()],k=r.num();
    if(k)b.push(k);
    o.blocks.push(b);
  }
  var nk=r.num();
  if(!(nk>=0&&nk<4096))return null;
  for(i=0;i<nk;i++)o.keys.push([r.num(),r.num(),r.num()]);
  return o.blocks.length?o:null;
}
/* Returns a level object, or null if this is not a share code at all - the
   caller then tries JSON, which is what every project file is. Throws
   nothing: a mangled code is simply not a level. */
function shareParse(txt){
  var s=String(txt||"").trim();
  var tag=s.slice(0,3)===SHARE_TAG?SHARE_TAG:(s.slice(0,3)===SHARE_TAG1?SHARE_TAG1:null);
  if(!tag)return null;
  var cut=s.indexOf("~"), name=cut<0?"":s.slice(cut+1).trim();
  var body=(cut<0?s.slice(3):s.slice(3,cut))
    /* Whitespace anywhere is forgiven, because a code that has been through
       an email client has been through a line-wrapper. It cannot be
       ambiguous: no whitespace character is in the alphabet. */
    .replace(/\s+/g,"");
  if(tag===SHARE_TAG&&
     (!body.length||body.length%SHARE_WIDTH||
      shareSum(body.slice(0,-1))!==body.charAt(body.length-1)))return null;
  try{
    var o=(tag===SHARE_TAG?shareRead2:shareRead1)(body);
    if(!o)return null;
    o.name=name||"Untitled";
    return o;
  }catch(e){return null;}
}
/* One paste, however many codes are in it. Both of the shapes a paste
   actually arrives in have to work and they pull in opposite directions:
   ONE code that a mail client has wrapped across three lines (whitespace
   inside a code is forgiven, so that one is already handled), and SEVERAL
   codes pasted one per line. Splitting on the tag serves the second and
   would ruin the first if it ever guessed wrong - so the split only stands
   if EVERY piece of it is a level. A level called "OL2 something" cannot
   quietly cost the player the rest of their paste. */
function shareParseAll(txt){
  var s=String(txt||"").trim();
  if(s.slice(0,3)!==SHARE_TAG&&s.slice(0,3)!==SHARE_TAG1)return null;
  var parts=s.split(new RegExp("\\s+(?="+SHARE_TAG+"|"+SHARE_TAG1+")")),out=[],i;
  if(parts.length>1){
    for(i=0;i<parts.length;i++){
      var one=shareParse(parts[i]);
      if(!one){out=null;break;}
      out.push(one);
    }
    if(out&&out.length)return out;
  }
  var whole=shareParse(s);
  return whole?[whole]:null;
}
/* The other end of SHARE. It takes a share code, one shared level as JSON, a
   bare level object, or a whole project file, because those are the four
   things somebody will actually paste in here - and it never replaces what
   you have: this button adds. Replacing is still on the project file's own
   panel, where it says so in the button.

   THE CODE IS TRIED FIRST AND JSON IS NEVER DROPPED. Every level shared
   before the code existed is JSON and is still out there in somebody's chat
   history; the project file is JSON by definition. A new format that
   invalidates what people already sent each other is not a better format. */
function loadLevelPanel(){
  mlScreen("Load A Level","PASTE ONE SOMEBODY SHARED",
    "<div class='note'>It is added to your levels; nothing you have is "+
    "touched.</div>"+
    "<textarea id='ldTxt' placeholder='paste here'></textarea>"+
    "<button class='mlbtn pgo' id='ldGo'>ADD IT</button>",
    mlFoot("ldBack","← MY LEVELS"));
  bind("mlClose",hidePanel);
  bind("ldBack",myLevelsPanel);
  bind("ldGo",function(){
    var list=shareParseAll($("ldTxt").value);
    if(!list)try{
      var o=JSON.parse($("ldTxt").value);
      list=o.levels||(o.length?o:[o]);
      for(var i=0;i<list.length;i++)
        if(!list[i].blocks||!list[i].start||!list[i].goal)throw 0;
    }catch(e){flash("that isn't a level");return;}
    for(var j=0;j<list.length;j++)library.push(adoptLevel(list[j],j));
    libSave().then(function(){
      myLevelsPanel();
      flash("added "+list.length+" level"+(list.length===1?"":"s"));
    });
  });
}
/* A level from outside is re-scored here rather than trusted: the numbers on
   it were written by somebody else's solver run and they decide where it
   sorts and what its row says. A fresh id for the same reason - two people
   who both started from the same shared level must not collide. */
function adoptLevel(o,n){
  var e={id:"l"+Date.now()+"_"+n,name:(o.name||"Untitled").slice(0,40),
         blocks:o.blocks,keys:o.keys||[],start:o.start,goal:o.goal,
         rotate:o.rotate!==false,
         theme:(typeof o.theme==="number"&&SECTIONS[o.theme])?o.theme:null,
         score:null,moves:null,needsRot:false,flattens:0};
  var st=statsFor(e);
  if(st.ok){e.score=st.score;e.moves=st.moves;e.needsRot=st.needsRot;
            e.flattens=st.flattens;}
  return e;
}

/* THE WORKBENCH BEHIND MY LEVELS. Everything here is a level designer's
   tool rather than a player's door: the same levels sorted by what the
   solver thinks of them, the whole library as one file, and the composer.
   MY LEVELS is the screen; this is MORE. */
function libraryPanel(){
  var sorted=sortedLibrary();
  var html="<h3>MORE \u2014 "+library.length+" LEVEL"+(library.length===1?"":"S")+"</h3>";
  if(!library.length){
    html+="Nothing saved yet. ADD LEVEL on MY LEVELS starts one.<br><br>";
  } else {
    html+="Sorted easiest first, by the solver's own numbers. A level that "+
          "has never solved sorts last and reads as a draft.<br>";
    for(var i=0;i<sorted.length;i++){
      var lv=sorted[i];
      html+="<div class='lrow'><span class='lname'>"+esc(lv.name)+"</span>"+
        "<span class='mono'>"+(lv.score==null?"draft":
          tierOf(lv.score)+" &middot; "+lv.moves+" moves"+
          (lv.needsRot?" &middot; rot":""))+"</span>"+
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
        "<button id='pBackMine'>MY LEVELS</button>"+
        "<button id='pClose4'>CLOSE</button></div>";
  showPanel(html);

  var p=$("panel");
  p.querySelectorAll("[data-play]").forEach(function(el){
    tap(el,function(){startLibrary(el.getAttribute("data-play"));});
  });
  p.querySelectorAll("[data-edit]").forEach(function(el){
    tap(el,function(){editLevel(el.getAttribute("data-edit"));});
  });
  p.querySelectorAll("[data-del]").forEach(function(el){
    tap(el,function(){deletePanel(el.getAttribute("data-del"));});
  });
  bind("pCampaign",function(){startLibrary(null);});
  bind("pCompose",enterCompose);
  bind("pProj",projectPanel);
  bind("pIO",ioPanel);
  bind("pBackMine",myLevelsPanel);
  bind("pClose4",hidePanel);
}

function findLevel(id){
  for(var i=0;i<library.length;i++) if(library[i].id===id) return library[i];
  return null;
}
function sortedLibrary(){
  // A draft has no score at all. `undefined - n` is NaN and NaN compares
  // false both ways, which leaves the sort's order undefined rather than
  // wrong-looking - so a draft is given a score past the end instead.
  var far=1e9;
  return library.slice().sort(function(a,b){
    return (a.score==null?far:a.score)-(b.score==null?far:b.score);
  });
}
function startLibrary(id){
  var s=sortedLibrary();
  if(!s.length){flash("library is empty");return;}
  libIndex=0;
  if(id){ for(var i=0;i<s.length;i++) if(s[i].id===id) libIndex=i; }
  playSource="library";
  playLibraryLevel(s[libIndex]);
}
/* One place that turns a saved level into something enterPlay() can take, so
   the row's PLAY, PLAY ALL IN ORDER and NEXT LEVEL cannot hand over three
   different levels. `theme` rides along: a level built on sand is played on
   sand (see levelTheme() and loadLevel()). */
function playLibraryLevel(lv){
  enterPlay({name:lv.name,
    hint:lv.score==null?"your level":tierOf(lv.score)+" \u00b7 "+lv.moves+" moves",
    blocks:lv.blocks,keys:lv.keys||[],start:lv.start,goal:lv.goal,
    rotate:lv.rotate!==false,theme:lv.theme==null?null:lv.theme},undefined,false);
}

function projectPanel(){
  showPanel("<h3>PROJECT FILE</h3>"+
    "Your whole library as one block of text. Copy it somewhere safe - "+
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
      custom.theme=(typeof o.theme==="number"&&SECTIONS[o.theme])?o.theme:null;
      /* Pasted-in text is a DIFFERENT level, so it is not still the saved one
         the editor had open: keeping the id would make the next write quietly
         overwrite a level you never touched. It becomes a new entry, under
         the name that came in with it - and it becomes one at once, because
         the autosave() below is what a paste is now instead of a SAVE. */
      editingId=null;
      if(typeof applyTheme==="function")applyTheme(levelTheme(custom));
      ghosted.clear();R=makeRules(custom);initDynamic();syncMeshes();hidePanel();
      autosave();flash("loaded");
    }catch(err){flash("that isn't valid level data");}
  });
  bind("pBack",myLevelsPanel);
}

function esc(s){
  return String(s).replace(/[&<>"]/g,function(c){
    return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c];
  });
}

function enterEditor(){
  /* THE SCREENS COME DOWN HERE, not at the call sites - the same rule
     enterPlay() states below, and for the same reason. The home screen is a
     full-bleed overlay at z-index 11, so an editor opened under it is an
     editor nobody can see; and hidePanel() actively restores that overlay's
     plinth, so the order matters: the screen goes first, then the panel.
     MY LEVELS on the home screen is what made this reachable. */
  if(typeof homeUp==="function"&&homeUp())homeHide();
  if(typeof panelOpen==="function"&&panelOpen())hidePanel();
  app="edit";fromEditor=false;
  // One visit, one telling that the level keeps itself (saveCurrent()).
  saidSaved=false;
  L=custom;R=makeRules(custom);
  /* THE GROUND THE LEVEL WAS BUILT ON, put back every time the editor opens.
     A custom level carries a section index rather than a surface name, so it
     gets that section's whole world - sky, ground, scenery, weather - and
     the editor shows what the level will actually be played on rather than
     the default night. */
  if(typeof applyTheme==="function")applyTheme(levelTheme(custom));
  // Which piece chips are on the bar is a question about campaign progress,
  // so it is asked here, once, every time the editor opens.
  if(typeof syncTools==="function")syncTools();
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
  /* THE HOME SCREEN COMES DOWN HERE, not at the call sites. It is a
     full-bleed overlay at z-index 11, so a level loaded while it is up plays
     invisibly behind it - and hidePanel() actively puts its plinth *back*
     when it closes a panel over it, so the map's PLAY button loaded the
     level and then restored the screen hiding it. Reported as "PLAY AGAIN
     takes me to the menu"; the level had in fact started.

     homeHide() used to have exactly one caller, CONTINUE - so every other
     way into a level (the map, a resumed session, testing from the editor)
     had this bug. enterPlay is the funnel all of them go through, which is
     the same reasoning as the tutorial's gate living on the four verbs
     rather than on the bindings. It is guarded on homeUp(), so calling it
     when the screen is already down costs nothing. */
  homeHide();
  hidePanel();ghosted.clear();
  $("editBarWrap").classList.remove("on");
  $("editBar").classList.remove("on");
  $("composeBarWrap").classList.remove("on");$("composeBar").classList.remove("on");
  $("playBarWrap").classList.add("on");
  $("playBar").classList.add("on");
  loadLevel(level,idx);onResize();
}
