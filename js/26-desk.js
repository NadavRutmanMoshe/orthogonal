"use strict";
/* I'm Just A Cube - 26-desk.js
   THE COMPUTER: a keyboard, a mouse, a gamepad and a screen three times the
   size of a phone's. Loaded BEFORE boot, like 24 and 25, so boot can ask it
   things and nothing needs a typeof guard at the call sites that run later.

   Two questions, kept apart on purpose, because they have different answers
   on the same machine:

   - deskMode() is about the DEVICE. A mouse and a keyboard get the key
     strip, the key-cap tutorial, the page zoom and no on-screen bar. A
     laptop playing the published artifact is a desktop too, and should be.
   - steamBuild() is about WHAT WAS PAID FOR. Only the Steam build grants
     EVERYTHING and skips straight past the first-run question. A desktop
     browser playing the free artifact has bought nothing.

   Both have a URL override (`?desk=1`, `?desk=0`, `?steam`) so either can be
   looked at on any machine, and a global the Electron preload can set
   (`window.STEAM`). */

var DESK_FORCE=(function(){
  var m=/[?&]desk=([01])/.exec(location.search||"");
  return m?m[1]==="1":null;
})();
function deskMode(){
  if(DESK_FORCE!==null)return DESK_FORCE;
  if(steamBuild())return true;
  /* hover AND a fine pointer: a phone has neither, a tablet has neither, a
     touchscreen laptop answers for its primary pointer, which is the pad. */
  return !!(window.matchMedia&&
    window.matchMedia("(hover:hover) and (pointer:fine)").matches);
}
function steamBuild(){
  return window.STEAM===true||/[?&]steam\b/.test(location.search||"");
}

/* ============================================================
   THE PAGE ZOOM - "bigger" on a big screen.

   Every size in css/ is a pixel tuned on a phone, and at 1920x1080 that is a
   340px column of 12px type in the middle of a television. Hand-tuning a
   second value for every declaration is what 97-textsize.css does for one
   setting, and it took a file; doing it for every screen size would take
   one per size.

   So it zooms the whole page the way Ctrl+plus does - CSS `zoom` on the root
   - and gives the game's canvas the inverse, so the world is still drawn
   one CSS pixel to one screen pixel and fitViewSize() still frames it
   against the real window. The chrome grows, the board does not move.

   Anything that projects a 3D point to a screen pixel and writes it into
   the zoomed page has to divide by uiZoom() on the way: the neighbour's
   bubble, the star flight, the eye. Those three are the whole list today.

   THE NUMBER IS THE WINDOW'S HEIGHT OVER 720, which is what the phone
   layout looks like turned sideways: 1080p gets 1.5, 1440p 2, the Steam
   Deck's 800 about 1.1. Never under 1 on its own - a small window is not a
   reason to shrink type that was already tuned small - and the Interface
   row in Settings leans on it either way. */
var UI_SCALE={small:.85,auto:1,large:1.2};
var uiZ=1;
function uiZoom(){return uiZ;}
function deskZoomWant(){
  if(!deskMode())return 1;
  var h=window.innerHeight||720, w=window.innerWidth||1280;
  // the width term stops a tall narrow window zooming the chrome off its sides
  var z=Math.max(1,Math.min(2.4,h/720,w/960));
  z*=UI_SCALE[settings.uiScale]||1;
  return Math.round(z*100)/100;
}
function applyZoom(){
  var z=deskZoomWant();
  uiZ=z;
  document.documentElement.style.zoom=z===1?"":String(z);
  var c=(typeof renderer!=="undefined"&&renderer)?renderer.domElement:null;
  if(c)c.style.zoom=z===1?"":String(1/z);
}

/* ============================================================
   FULL SCREEN

   The Fullscreen API, which is the same call in a browser and in Electron.
   It needs a user gesture, and a key press or a click is one, so both the
   settings row and F11 / Alt+Enter work. In a browser F11 is usually the
   browser's own and never reaches the page; in Electron it reaches us. */
function fullOn(){return !!(document.fullscreenElement||document.webkitFullscreenElement);}
/* WHETHER THE PAGE MAY ASK AT ALL. A page inside a frame - the published
   artifact is one - can only go full screen if the frame allows it, and
   claude.ai's does not. There the browser refuses every request in silence,
   so the row says where the real switch is instead of offering two dead
   buttons. Electron has no frame, and there it is always true. */
function fullAllowed(){
  return !!(document.fullscreenEnabled||document.webkitFullscreenEnabled);
}
function fullToggle(){
  try{
    if(fullOn()){(document.exitFullscreen||document.webkitExitFullscreen).call(document);}
    else{
      var el=document.documentElement;
      var p=(el.requestFullscreen||el.webkitRequestFullscreen).call(el);
      if(p&&p.catch)p.catch(function(){});
    }
  }catch(e){}
}
document.addEventListener("fullscreenchange",function(){
  /* ESC IS THE GAME'S, NOT THE BROWSER'S. In full screen a browser takes
     Escape to leave it, and Escape is also this game's settings key - so
     one press did both. The Keyboard Lock API hands Escape to the page while
     full screen (Chrome and Electron; holding it still leaves, and the
     browser says so), and it is released on the way out. */
  var kb=navigator.keyboard;
  try{
    if(fullOn()&&kb&&kb.lock)kb.lock(["Escape"]).catch(function(){});
    else if(kb&&kb.unlock)kb.unlock();
  }catch(e){}
  if(typeof panelKind!=="undefined"&&panelKind==="menu"&&panelOpen())menuPanel();
  winSync();
});

/* ============================================================
   THE WINDOW'S OWN BUTTONS - full screen and quit, top right of the home
   screen, where every PC game keeps them. Quit only exists where there is a
   window to close (the Steam build is Electron); a browser tab cannot be
   closed by the page it shows, so there it is not drawn rather than drawn
   dead. Full screen is drawn wherever the page may ask for it, and where it
   may not (the artifact's frame) it says where the browser's own switch is. */
function deskApp(){
  return window.STEAM===true||/Electron/i.test(navigator.userAgent||"");
}
var WIN_FULL="<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5' "+
  "fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/></svg>";
var WIN_SHRINK="<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' "+
  "fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/></svg>";
var WIN_QUIT="<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3v8M6.3 6.8a8 8 0 1 0 11.4 0' "+
  "fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round'/></svg>";
function winFull(){
  if(fullAllowed())fullToggle();
  else flash("full screen: F11, or ⤢ at the top right of the page");
}
function winBuild(){
  var home=$("home");
  if(!home||$("hWin"))return;
  var w=document.createElement("div");
  w.className="hwin";w.id="hWin";
  w.innerHTML="<button class='rnd' id='hWinFull' data-winfull></button>"+
    (deskApp()?"<button class='rnd hquit' id='hWinQuit' data-tip='Quit'>"+WIN_QUIT+"</button>":"");
  home.appendChild(w);
  tap($("hWinFull"),winFull);
  if($("hWinQuit"))tap($("hWinQuit"),function(){window.close();});
  /* AND IN PLAY: first in the top-right corner, before restart and the eye,
     so the switch is on screen everywhere the owner looked for it. */
  var tr=document.querySelector(".corner.tr");
  if(tr&&!$("bWinFull")){
    var f=document.createElement("button");
    f.className="rnd";f.id="bWinFull";f.setAttribute("data-winfull","");
    f.setAttribute("aria-label","Full screen");
    tr.insertBefore(f,tr.firstChild);
    tap(f,winFull);
  }
  winSync();
}
/* AND IN EVERY FULL-HEIGHT PANEL'S HEADER, beside its close button. Called by
   showPanel() after it writes a panel, since each panel writes its own
   header and none of them knows about this. */
function winPanel(){
  if(!deskMode())return;
  var head=$("panel").querySelector(".phead");
  if(!head||head.querySelector("[data-winfull]"))return;
  var xs=head.querySelectorAll(".mx"), x=xs.length?xs[xs.length-1]:null;
  var f=document.createElement("button");
  f.className="mq mx pwin";f.setAttribute("data-winfull","");
  f.setAttribute("aria-label","Full screen");
  if(x)head.insertBefore(f,x);else head.appendChild(f);
  tap(f,winFull);
  winSync();
}
function winSync(){
  [].forEach.call(document.querySelectorAll("[data-winfull]"),function(b){
    b.innerHTML=fullOn()?WIN_SHRINK:WIN_FULL;
    b.setAttribute("data-tip",fullOn()?"Exit full screen · F11":"Full screen · F11");
  });
}

/* ============================================================
   RENDER QUALITY - Settings > Screen > Quality.

   The world is drawn at the screen's own resolution times this, and the
   browser scales the result down: a cheap supersample, which is what a big
   monitor at 1x shows most (the stair-steps on every block edge). NORMAL is
   the screen's resolution, as a phone draws; HIGH is half again; ULTRA
   twice. Capped at 3 device pixels to a CSS pixel so a 4K screen at ULTRA
   does not ask for an 8K frame. Phones never read it. */
var QUALITY={normal:1,high:1.5,ultra:2};
function applyQuality(){
  if(typeof renderer==="undefined"||!renderer)return;
  var dpr=window.devicePixelRatio||1;
  var pr=deskMode()?Math.min(3,dpr*(QUALITY[settings.quality]||1))
                   :Math.min(dpr,2);
  if(renderer.getPixelRatio()!==pr){
    renderer.setPixelRatio(pr);
    renderer.setSize(window.innerWidth,window.innerHeight);
  }
}

/* ============================================================
   KEYS - which key does what, and the player may change it.

   An ACTION is the thing; a key is only where it lives today. Everything
   that names a control - the strip along the bottom, the tutorial's
   sentences, the key cap the hints put up - asks keyOf(action), so a player
   who moves GO 2D to F is taught F from then on.

   `settings.keys` holds OVERRIDES ONLY. A default that changes in a later
   build reaches every save that never touched it, and "reset" is deleting
   the object. The arrows are not in the table: they always walk, as a
   second set nobody has to set up - unless the player binds one of them to
   something else, in which case the binding wins, which is how somebody who
   wants the arrows to turn gets that. */
var KEY_ACTS=[
  {id:"up",      say:"Walk up",      def:"w"},
  {id:"left",    say:"Walk left",    def:"a"},
  {id:"down",    say:"Walk down",    def:"s"},
  {id:"right",   say:"Walk right",   def:"d"},
  {id:"fold",    say:"GO 2D / 3D",   def:" "},
  {id:"turnl",   say:"Rotate left",  def:"q"},
  {id:"turnr",   say:"Rotate right", def:"e"},
  {id:"peek",    say:"Peek (hold)",  def:"shift"},
  {id:"restart", say:"Restart",      def:"r"},
  {id:"hint",    say:"Hint",         def:"h"},
  {id:"mute",    say:"Sound on/off", def:"m"}
];
var KEY_ARROWS={arrowup:"up",arrowdown:"down",arrowleft:"left",arrowright:"right"};
/* Keys nobody may take: Escape is the way out of everything, Enter and Tab
   answer menus, and the F-keys belong to the browser. */
var KEY_RESERVED={escape:1,enter:1,tab:1,f1:1,f5:1,f11:1,f12:1,
                  meta:1,os:1,contextmenu:1,capslock:1};
// Actions that act on the board, and so are held off behind a full-bleed screen.
var KEY_GAME={up:1,left:1,down:1,right:1,fold:1,turnl:1,turnr:1,peek:1,
              restart:1,hint:1};
function keyDef(act){
  for(var i=0;i<KEY_ACTS.length;i++)if(KEY_ACTS[i].id===act)return KEY_ACTS[i].def;
  return "";
}
function keyOf(act){
  var o=settings.keys;
  return (o&&typeof o[act]==="string"&&o[act])||keyDef(act);
}
function keyAction(k){
  for(var i=0;i<KEY_ACTS.length;i++)if(keyOf(KEY_ACTS[i].id)===k)return KEY_ACTS[i].id;
  return KEY_ARROWS[k]||null;
}
// What a key is called on a key cap.
function keyLabel(k){
  if(k===" ")return "SPACE";
  var n={arrowup:"↑",arrowdown:"↓",arrowleft:"←",arrowright:"→",
         shift:"SHIFT",control:"CTRL",alt:"ALT",backspace:"BKSP",
         delete:"DEL",insert:"INS",home:"HOME",end:"END",
         pageup:"PGUP",pagedown:"PGDN"}[k];
  return n||k.toUpperCase();
}
/* Bind `act` to `k`. A key already doing something else SWAPS rather than
   doubling up: the other action takes this one's old key, so no action is
   ever left with no key and no key ever does two things. */
function keyBind(act,k){
  var o=settings.keys||{}, old=keyOf(act), i;
  // Asked of the table, not of keyAction(): an arrow nobody bound is free.
  for(i=0;i<KEY_ACTS.length;i++){
    var a=KEY_ACTS[i].id;
    if(a!==act&&keyOf(a)===k)o[a]=old;
  }
  o[act]=k;
  // Anything now equal to its default is not an override any more.
  for(var a in o)if(o[a]===keyDef(a))delete o[a];
  settings.keys=o;
  saveSettings();
  kStripBuild();
}
function keysReset(){settings.keys={};saveSettings();kStripBuild();}

/* ============================================================
   WHICH HAND IS ON THE CONTROLS, keyboard or pad. The strip and the
   tutorial's key cap draw whichever was used last, so a player who picks up
   a pad sees A and LB rather than SPACE and Q. */
var lastInput="keys";
function inputIs(kind){
  if(lastInput===kind)return;
  lastInput=kind;
  kStripBuild();
}
/* The pad's glyphs, per action. Xbox names, because that is what Steam
   shows on every controller unless told otherwise. */
var PAD_SAY={up:"↑",left:"←",down:"↓",right:"→",
             fold:"A",turnl:"LB",turnr:"RB",peek:"LT",
             restart:"Y",hint:"X",mute:""};
// The cap for an action on the controls in hand right now.
function capOf(act){
  return lastInput==="pad"?PAD_SAY[act]:keyLabel(keyOf(act));
}
// What an action does, in the words beside the tutorial's key cap.
function actSay(act){
  if(act==="fold")return (flat?VB().to3:VB().to2).toLowerCase();
  for(var i=0;i<KEY_ACTS.length;i++)
    if(KEY_ACTS[i].id===act)return KEY_ACTS[i].say.toLowerCase();
  return "";
}
function kbd(act){
  var c=capOf(act);
  return "<kbd data-act='"+act+"' class='kc"+(c.length>2?" wide":"")+
    (lastInput==="pad"?" pad":"")+"'>"+esc(c)+"</kbd>";
}

/* ============================================================
   THE KEY STRIP - the keys, along the bottom, while you play.

   The owner's ask, in the owner's words: like Overwatch, because the keys
   are forgotten. So it is the same shape: a row of caps along the bottom
   edge, each with what it does under it, small enough to read past. It is
   a reminder, not a control - it takes no clicks - and it only says what
   the current level can use: no TURN on a level where the camera is
   locked.

   TWO GROUPS, on the owner's call: the dimension and the turn. Walking is
   WASD and nobody forgets it; restart, hint and peek have their own round
   buttons on screen, and seven groups along the bottom read as a manual.

   Built from keyOf()/capOf() every time, so a rebind or picking up a pad
   redraws it; syncHud() calls kStripSync() for everything that changes
   what it should say or whether it is up at all. */
var KSTRIP_GROUPS=[
  {acts:["turnl","turnr"],            say:"ROTATE", rot:true},
  {acts:["fold"],                     say:"{fold}"}
];
var kStripKey="";
function kStripBuild(){kStripKey="";kStripSync();deskTips();}
/* What each corner button is and its key, shown on hover (css/96-desk.css
   reads `data-tip`). From the bindings, so a rebound key is the key shown. */
function deskTips(){
  var on=deskMode();
  var tips={bMenu:"Settings · ESC", bWard:"Wardrobe",
            bHint:"Hint · "+keyLabel(keyOf("hint")),
            bRestart:"Restart · "+keyLabel(keyOf("restart")),
            bLook:"Look around · hold "+keyLabel(keyOf("peek"))};
  for(var id in tips){
    var el=$(id);
    if(!el)continue;
    if(on)el.setAttribute("data-tip",tips[id]);else el.removeAttribute("data-tip");
  }
}
function kStripWanted(){
  if(!deskMode()||settings.keyStrip==="off")return false;
  if(app!=="play"||homeUp()||screenUp()||panelOpen())return false;
  if($("won")&&$("won").classList.contains("on"))return false;
  if(typeof storyOn==="function"&&storyOn())return false;
  return true;
}
function kStripSync(){
  var el=$("kStrip");
  if(!el){
    el=document.createElement("div");
    el.className="kstrip";el.id="kStrip";el.setAttribute("aria-hidden","true");
    document.body.appendChild(el);
  }
  var on=kStripWanted();
  document.body.classList.toggle("kson",on);
  if(!on)return;
  var rot=!document.body.classList.contains("norot");
  var fl=typeof flat!=="undefined"&&flat;
  var foldSay=fl?VB().to3:VB().to2;
  var key=[lastInput,JSON.stringify(settings.keys||{}),rot,fl,foldSay].join("|");
  if(key===kStripKey)return;
  kStripKey=key;
  var h="";
  KSTRIP_GROUPS.forEach(function(g){
    if(g.rot&&!rot)return;
    if(g.flat&&!fl)return;
    var caps;
    if(g.move&&lastInput==="pad")caps="<kbd class='kc pad wide'>✚</kbd>";
    else if(g.move&&keyOf("up")==="w"&&keyOf("left")==="a"&&
            keyOf("down")==="s"&&keyOf("right")==="d")
      /* The four as a cross, the way they sit under the hand - but only
         while they are still WASD. Rebound, a cross of four arbitrary
         letters is a puzzle, so they go back to a row. */
      caps="<span class='kx'><i></i>"+kbd("up")+"<i></i>"+
           kbd("left")+kbd("down")+kbd("right")+"</span>";
    else caps=g.acts.map(kbd).join("");
    h+="<div class='kg' data-acts='"+g.acts.join(" ")+"'><div class='kcaps'>"+caps+
       "</div><b>"+(g.say==="{fold}"?esc(foldSay):g.say)+"</b></div>";
  });
  el.innerHTML=h;
  // A rebuild must not drop the key the tutorial is pointing at.
  if(kAskId)kStripAsk(kAskId);
}
/* The tutorial and the hints point at a control; on a desktop the thing to
   point at is its key in the strip. Called from ghostTo() with the control
   being asked for, or null to clear. */
var KS_OF_BTN={bUp:"up",bDown:"down",bLeft:"left",bRight:"right",bFlat:"fold",
               bRotL:"turnl",bRotR:"turnr"};
var kAskId=null;
function kStripAsk(btnId){
  kAskId=btnId||null;
  var el=$("kStrip");if(!el)return;
  var act=btnId?KS_OF_BTN[btnId]:null;
  // The group's word lights with it, and of the caps only the one asked for.
  [].forEach.call(el.querySelectorAll(".kg"),function(g){
    g.classList.toggle("ask",!!act&&(" "+g.getAttribute("data-acts")+" ").indexOf(" "+act+" ")>=0);
  });
  [].forEach.call(el.querySelectorAll("kbd[data-act]"),function(k){
    k.classList.toggle("ask",k.getAttribute("data-act")===act);
  });
}

/* ============================================================
   THE TUTORIAL'S WORDS ON A KEYBOARD - the third table TUT_SAY was
   always meant to grow (docs/ROADMAP.md). Computed rather than written out,
   because the key is whatever the player bound, and a lesson that says
   "press D" to somebody who moved it to L is the old swiping-hand bug with
   a keyboard in it. */
var KEY_WORD_ACT={right:"right",left:"left",up:"up",down:"down","2d":"fold",
                  "3d":"fold",turnr:"turnr",turnl:"turnl"};
function keyWords(tok,w){
  var act=KEY_WORD_ACT[w];
  if(!act)return null;
  var k=kbd(act);
  if(tok.indexOf("it:")===0)return k;
  if(w==="3d")return "Press "+k+" again";
  return "Press "+k;
}
// "tap the bulb" is a phone's sentence.
function hintWord(){
  return deskMode()?"press "+capOf("hint")+" for a hint":"tap the bulb for a hint";
}

/* ============================================================
   REBINDING - Settings > Keys.

   One row per action: what it does, and its key as a button. Press the
   button, press a key. Escape cancels. The panel wears the tall panels'
   page shape - title, the star total, close; footer up-one-level and CLOSE -
   because it is one of them now. */
var keyCapture=null;
function keysPanel(){
  keyCapture=null;
  var rows=KEY_ACTS.map(function(a){
    var k=keyOf(a.id);
    return "<div class='krow'><label>"+a.say+"</label>"+
      "<button id='kb_"+a.id+"' class='kbtn"+(k!==a.def?" moved":"")+"'>"+
      "<kbd class='kc"+(keyLabel(k).length>2?" wide":"")+"'>"+esc(keyLabel(k))+
      "</kbd></button></div>";
  }).join("");
  var pad=[["Move","D-pad / left stick"],["GO 2D / 3D","A"],
           ["Hint","X"],["Restart","Y"],["Rotate","LB / RB"],["Peek (hold)","LT / RT"],
           ["Settings","MENU"]].map(function(p){
    return "<div class='krow'><label>"+p[0]+"</label><span class='kpad'>"+p[1]+"</span></div>";
  }).join("");
  showPanel(
    "<div class='phead'><div class='pt'><b>Keys</b></div>"+
      "<div class='mtot'>"+starsEarned()+" ★</div>"+
      "<button class='mq mx' id='kClose' aria-label='Close'>✕</button></div>"+
    "<div class='pbody'>"+
      "<div class='pcard'><h4>"+panelIcon("play")+"Keyboard</h4>"+
        "<div class='psub knote'>Click a key, then press the new one. "+
        "The arrows always walk too.</div>"+rows+
        "<div class='crow bare'><label>Key strip</label><span class='seg'>"+
          seg("kStrip","on","SHOW",settings.keyStrip||"on")+
          seg("kStrip","off","OFF",settings.keyStrip||"on")+"</span></div>"+
        "<div class='psub'><button id='kReset'>"+panelIcon("reset")+
          "RESET KEYS</button></div></div>"+
      "<div class='pcard'><h4>"+panelIcon("play")+"Gamepad</h4>"+pad+"</div>"+
    "</div>"+
    "<div class='pfoot'><button id='kBack'>‹ SETTINGS</button>"+
      "<button id='kFClose'>CLOSE</button></div>","keys");
  KEY_ACTS.forEach(function(a){
    bind("kb_"+a.id,function(){
      keyCapture=a.id;
      var b=$("kb_"+a.id);
      if(b){b.classList.add("wait");b.innerHTML="<kbd class='kc wide'>PRESS A KEY</kbd>";}
    });
  });
  ["on","off"].forEach(function(m){
    bind("kStrip_"+m,function(){settings.keyStrip=m;saveSettings();kStripBuild();keysPanel();});
  });
  bind("kReset",function(){keysReset();flash("keys reset");keysPanel();});
  bind("kBack",menuPanel);
  bind("kClose",hidePanel);
  bind("kFClose",hidePanel);
}
/* Called first thing by the keydown handler. Returns true when it ate the
   press, which it does for every key while a capture is armed - including
   the one that cancels it. */
function keyCaptureTake(e){
  if(!keyCapture)return false;
  var k=(e.key||"").toLowerCase(), act=keyCapture;
  e.preventDefault();e.stopPropagation();
  keyCapture=null;
  if(k==="escape"){keysPanel();return true;}
  if(KEY_RESERVED[k]||!k||k==="unidentified"||k==="dead"){
    flash(keyLabel(k)+" is taken");keysPanel();return true;
  }
  keyBind(act,k);
  keysPanel();
  return true;
}

/* ============================================================
   MENUS WITHOUT A MOUSE - one focus ring, moved by the arrows, WASD, the
   D-pad or the stick, and pressed by Enter, Space or A.

   Every screen in this game is a stack of buttons, so the navigator does
   not know any screen by name: it asks which layer is on top, collects the
   buttons in it that can be seen, and walks to the nearest one in the
   direction pressed. A press is delivered as the pointer events tap()
   listens for - pointerdown and pointerup at the button's middle - because
   tap() binds pointerdown and a synthetic click alone would miss it (the
   same reason backOut() calls the editor's exit directly). */
function navRoot(){
  var el;
  if(typeof tutCardUp==="function"&&tutCardUp())return $("tutcard");
  if(panelOpen())return $("panel");
  if((el=$("storyend"))&&el.classList.contains("on"))return el;
  if((el=$("won"))&&el.classList.contains("on"))return el;
  if((el=$("intro"))&&!el.classList.contains("gone"))return el;
  if(homeUp())return $("home");
  return null;
}
function navVisible(el){
  if(el.disabled||el.offsetParent===null)return false;
  var r=el.getBoundingClientRect();
  if(r.width<2||r.height<2)return false;
  var s=getComputedStyle(el);
  return s.visibility!=="hidden"&&s.pointerEvents!=="none"&&+s.opacity!==0;
}
function navItems(root){
  return [].filter.call(root.querySelectorAll("button,input[type=range]"),navVisible);
}
var navCurId=null, navCurEl=null;
function navCur(root){
  var el=navCurEl;
  if(el&&(!document.contains(el)||!root.contains(el)))el=navCurId?$(navCurId):null;
  if(el&&root.contains(el)&&navVisible(el))return el;
  return null;
}
function navSet(el){
  var old=document.querySelector(".padfocus");
  if(old)old.classList.remove("padfocus");
  navCurEl=el;navCurId=el?el.id||null:null;
  if(!el)return;
  el.classList.add("padfocus");
  try{el.scrollIntoView({block:"nearest",inline:"nearest"});}catch(e){}
}
function navClear(){navSet(null);}
// Nearest in the direction, with sideways distance counted double.
function navMove(dx,dy){
  var root=navRoot();if(!root)return false;
  var items=navItems(root);if(!items.length)return true;
  var cur=navCur(root);
  if(!cur){navSet(items[0]);return true;}
  // A slider takes left and right for itself.
  if(cur.type==="range"&&dx){
    cur.value=+cur.value+dx*5;
    cur.dispatchEvent(new Event("input",{bubbles:true}));
    cur.dispatchEvent(new Event("change",{bubbles:true}));
    return true;
  }
  var a=cur.getBoundingClientRect(), ax=a.left+a.width/2, ay=a.top+a.height/2;
  var best=null,bs=1e9;
  items.forEach(function(el){
    if(el===cur)return;
    var r=el.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
    var along=(x-ax)*dx+(y-ay)*dy, side=Math.abs((x-ax)*dy)+Math.abs((y-ay)*dx);
    if(along<=1)return;
    var s=along+side*2;
    if(s<bs){bs=s;best=el;}
  });
  if(best)navSet(best);
  return true;
}
function navPress(el){
  var r=el.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
  var o={bubbles:true,cancelable:true,pointerId:77,isPrimary:true,
         pointerType:"mouse",button:0,clientX:x,clientY:y};
  el.dispatchEvent(new PointerEvent("pointerdown",o));
  el.dispatchEvent(new PointerEvent("pointerup",o));
}
// Enter, Space or A. Nothing focused yet: a lone button is pressed, else focus the first.
function navOk(){
  var root=navRoot();if(!root)return false;
  var cur=navCur(root);
  if(cur){if(cur.type!=="range")navPress(cur);return true;}
  var items=navItems(root);
  if(items.length===1)navPress(items[0]);
  else if(items.length)navSet(items[0]);
  return true;
}
// The mouse moving means the ring is somebody else's business now.
window.addEventListener("pointermove",function(e){
  if(e.pointerId!==77&&navCurEl)navClear();
},true);

/* ============================================================
   THE GAMEPAD

   Polled, because that is the only way the Gamepad API offers: one
   requestAnimationFrame loop that runs only while a pad is connected. Every
   button goes through exactly what a key does - the same four verbs,
   press / rotateView / doFlatten / doUnflatten, via runAct() in
   js/19-bindings.js - so the gates the tutorial and the fights put on a verb
   hold for a pad without a line here knowing about them.

   Movement REPEATS while held (PAD_REPEAT_AT, then every PAD_REPEAT_MS),
   the way a held arrow key does, and the stick is read as four directions
   with a dead zone: this is a grid game and a diagonal means nothing.

   A pad press is not a user activation, so it cannot start audio on its
   own - the Electron wrapper must set `autoplayPolicy` to not require a
   gesture, or a pad-only player hears nothing until they touch a key. */
var PAD_DEAD=.5, PAD_REPEAT_AT=320, PAD_REPEAT_MS=150;
var padRaf=0, padPrev={}, padDirAt=0, padDirLast=0, padDir=null, padPeek=false;
function padFirst(){
  var ps=navigator.getGamepads?navigator.getGamepads():[];
  for(var i=0;i<ps.length;i++)if(ps[i]&&ps[i].connected)return ps[i];
  return null;
}
function padStart(){if(!padRaf)padRaf=requestAnimationFrame(padTick);}
window.addEventListener("gamepadconnected",function(){padStart();});
function padDirOf(p){
  var b=p.buttons, x=p.axes[0]||0, y=p.axes[1]||0;
  function on(i){return !!(b[i]&&b[i].pressed);}
  if(on(12)||y<-PAD_DEAD&&Math.abs(y)>=Math.abs(x))return "up";
  if(on(13)||y> PAD_DEAD&&Math.abs(y)>=Math.abs(x))return "down";
  if(on(14)||x<-PAD_DEAD)return "left";
  if(on(15)||x> PAD_DEAD)return "right";
  return null;
}
function padTick(){
  padRaf=0;
  var p=padFirst();
  if(!p)return;
  padRaf=requestAnimationFrame(padTick);
  var now=performance.now(), b=p.buttons, down={}, i;
  for(i=0;i<b.length;i++)down[i]=!!(b[i]&&b[i].pressed);
  function hit(n){return down[n]&&!padPrev[n];}
  var d=padDirOf(p), fire=false;
  if(d!==padDir){padDir=d;padDirAt=now;padDirLast=now;fire=!!d;}
  else if(d&&now-padDirAt>PAD_REPEAT_AT&&now-padDirLast>PAD_REPEAT_MS){
    padDirLast=now;fire=true;
  }
  var any=fire;
  for(i=0;i<10;i++)if(hit(i))any=true;
  if(any)inputIs("pad");
  padAct(d,fire,hit,down);
  padPrev=down;
}
function padAct(d,fire,hit,down){
  var DV={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  // The sting waits for a press, and A is one.
  if(typeof splashState!=="undefined"&&(splashState==="armed"||splashState==="running")){
    if(hit(0)||hit(9))splashPoke();
    return;
  }
  // A replay: any button skips it, as any key does.
  if(document.body.classList.contains("replaying")){
    for(var i=0;i<10;i++)if(hit(i)){replaySkip();break;}
    return;
  }
  if(typeof storyOn==="function"&&storyOn()&&!$("storyend").classList.contains("on")){
    if(hit(1)||hit(9))storySkip();
    else if(hit(0)&&typeof storyAsking==="function"&&storyAsking())runAct("fold");
    return;
  }
  if(navRoot()){
    if(fire)navMove(DV[d][0],DV[d][1]);
    if(hit(0))navOk();
    if(hit(1)||hit(9))backOut();
    return;
  }
  if(fire)runAct(d);
  if(hit(0))runAct("fold");
  if(hit(2))runAct("hint");
  if(hit(3))runAct("restart");
  if(hit(4))runAct("turnl");
  if(hit(5))runAct("turnr");
  if(hit(9))backOut();
  // Peek is held, on either trigger.
  var pk=!!(down[6]||down[7]);
  if(pk!==padPeek){padPeek=pk;runAct(pk?"peek":"unpeek");}
}

/* ============================================================
   THE FIRST RUN ON A COMPUTER - no age card.

   The card asks one question in order to set four things, and on a phone
   two of its answers matter: the child flags that go to Google, and how
   much help somebody wants. A computer has no ads, and the owner's reading
   of who buys a puzzle game on Steam is that they want it hard. So the
   HARD answer is written without asking - medium board, FAST fights, no
   on-screen bar - and the game goes straight to the opening scene. Every
   one of the three is still a row in Settings.

   Called from boot once the saves are in. The sting may still be up, so
   the scene waits for it (splashAfter(), called by splashEnd()). */
var deskIntroDue=false;
function deskFirstRun(){
  if(!deskMode()||!nothingBehind())return false;
  if(!settings.ageBand)applyAgeBand("dhard");
  $("intro").classList.add("gone");
  if(typeof splashState!=="undefined"&&splashState!=="done"){deskIntroDue=true;}
  else introBegin();
  return true;
}
function splashAfter(){
  if(!deskIntroDue)return;
  deskIntroDue=false;
  introBegin();
}

/* Everything a desktop needs set once at boot: the class the CSS keys off,
   the layout pinned to HIDDEN (the only one that works here - the bar is a
   thumb's control), and the zoom. */
function deskBoot(){
  var on=deskMode();
  document.body.classList.toggle("desk",on);
  if(on&&settings.ui!=="none"){settings.ui="none";applyUI();}
  applyZoom();
  applyQuality();
  if(on)winBuild();
  if(padFirst())padStart();
  kStripBuild();
  // The replay's skip line says what skips it here (a key, not a tap).
  var sk=document.querySelector("#repSkip i");
  if(sk)sk.textContent=on?"PRESS ANY KEY TO SKIP":"TAP TO SKIP";
}
