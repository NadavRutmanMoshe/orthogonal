"use strict";
/* I'm Just A Cube - the Steam build's main process.

   THE GAME IS NOT HERE. It is the repository root, copied into www/ by
   `node ../tools/build-app.js --desktop` exactly as the phone apps get it;
   this file only owns what a browser tab cannot do:

   - Steam: steamworks.js started once, achievements reported, the overlay.
   - The save, as a FILE per Steam account, which is what Steam Cloud syncs.
   - The window: no menu bar, full screen remembered, sound without a click.

   The page knows it is the Steam build because preload.js sets window.STEAM,
   and js/26-desk.js's steamBuild() reads nothing else. */
const {app,BrowserWindow,ipcMain,Menu,shell,dialog}=require("electron");
const path=require("path"), fs=require("fs");

/* ============================================================
   THE APP ID. steam.json, not a constant here, so shipping it is one edit
   the README can name. 480 is Valve's public test app (Spacewar): it lets
   the whole Steam path run on any machine with Steam open, and it is refused
   by `npm run dist` so it cannot ship. */
const CFG=JSON.parse(fs.readFileSync(path.join(__dirname,"steam.json"),"utf8"));
const APP_ID=Number(CFG.appId)||480;
const TEST_APP=APP_ID===480;

/* Everything Chromium writes (caches, its own localStorage) goes in one
   folder with no apostrophe in it, and the save sits beside it. The path is
   part of the Steam Cloud setup (README, "Steam Cloud") - moving it strands
   every player's cloud save, like renaming an `orthogonal:*` key would. */
// IJAC_DATA moves it for tools/steamtest.js, so a test never touches a real save.
const ROOT_DIR=process.env.IJAC_DATA||path.join(app.getPath("appData"),"ImJustACube");
app.setPath("userData",path.join(ROOT_DIR,"electron"));

/* THE CHROMIUM SANDBOX UNDER PROTON. Chrome has always needed --no-sandbox
   under Wine, and a Steam Deck runs this Windows build through Proton,
   which is Wine. Proton sets STEAM_COMPAT_DATA_PATH and Windows never does,
   so this is off everywhere but there. NOT YET CONFIRMED ON A DECK - if the
   Deck test shows a black window, this line is the first suspect either way. */
const UNDER_PROTON=!!process.env.STEAM_COMPAT_DATA_PATH;
if(UNDER_PROTON)app.commandLine.appendSwitch("no-sandbox");

/* ============================================================
   STEAM

   Started before the window, because the overlay needs two Chromium
   switches (in-process GPU, no direct composition) and switches only count
   before `ready`.

   restartAppIfNecessary: launched by double-clicking the exe rather than
   from the library, Steam relaunches it properly and this copy leaves. It
   answers false when steam_appid.txt sits beside the exe, which is how a
   developer runs a packaged build by hand, and it is skipped for the test id.

   If Steam cannot be reached the game still runs - no achievements, the save
   in a `local` folder that Steam Cloud does not see. A DRM-free game is the
   common choice for a small puzzle game, and a Deck in offline mode still
   has Steam running, so this path is for development, not for players. */
let steam=null, steamWhy="", leaving=false;
try{
  const sw=require("steamworks.js");
  if(app.isPackaged&&!TEST_APP&&sw.restartAppIfNecessary(APP_ID)){
    leaving=true;app.exit(0);
  }else{
    steam=sw.init(APP_ID);
    sw.electronEnableSteamOverlay();
  }
}catch(e){
  steam=null;steamWhy=String(e&&e.message||e);
  console.warn("[steam] not available: "+steamWhy);
}
function steamId(){
  try{return steam?String(steam.localplayer.getSteamId().steamId64):"";}catch(e){return "";}
}
function onDeck(){
  if(process.env.SteamDeck==="1")return true;
  try{return !!(steam&&steam.utils.isSteamRunningOnSteamDeck());}catch(e){return false;}
}

/* ============================================================
   THE SAVE - one JSON file per Steam account.

   The game saves through window.storage (js/00-storage.js), a key/value API
   the artifact host invented and localStorage stands in for everywhere
   else. Here preload.js provides it instead, backed by THIS map, so every
   `orthogonal:*` key lives in:

       %APPDATA%/ImJustACube/<SteamID64>/save.json

   which is exactly what Steam's Auto-Cloud is told to sync (README). One
   folder per account because two people can share a PC and not a save.

   The page's copy and this one are the same map: preload.js holds a copy
   for reads and sends every write here SYNCHRONOUSLY, so nothing the page
   believes it has saved is only in flight when the window closes. The disk
   is written 250ms after the last change and again on the way out, through
   a temp file and a rename, so a crash mid-write leaves the old file whole. */
const SAVE_DIR=path.join(ROOT_DIR,steamId()||"local");
const SAVE_FILE=path.join(SAVE_DIR,"save.json");
let save={}, saveTimer=null, saveDirty=false;
function saveLoad(){
  for(const f of [SAVE_FILE,SAVE_FILE+".bak"]){
    try{
      const j=JSON.parse(fs.readFileSync(f,"utf8"));
      if(j&&typeof j.keys==="object"){
        save=j.keys;
        // A copy of what was loaded, taken once per launch: the one undo
        // there is if something goes wrong. Not *.json, so Cloud ignores it.
        if(f===SAVE_FILE)try{fs.copyFileSync(SAVE_FILE,SAVE_FILE+".bak");}catch(e){}
        return;
      }
    }catch(e){}
  }
  save={};
}
function saveFlush(){
  clearTimeout(saveTimer);saveTimer=null;
  if(!saveDirty)return;
  try{
    fs.mkdirSync(SAVE_DIR,{recursive:true});
    const tmp=SAVE_FILE+".tmp";
    fs.writeFileSync(tmp,JSON.stringify({v:1,game:"I'm Just A Cube",keys:save}));
    fs.renameSync(tmp,SAVE_FILE);
    saveDirty=false;
  }catch(e){console.error("[save] write failed: "+e.message);}
}
function saveSoon(){
  saveDirty=true;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(saveFlush,250);
}
saveLoad();

ipcMain.on("save:load",e=>{e.returnValue=save;});
ipcMain.on("save:set",(e,k,v)=>{save[String(k)]=String(v);saveSoon();e.returnValue=true;});
ipcMain.on("save:del",(e,k)=>{delete save[String(k)];saveSoon();e.returnValue=true;});

/* ============================================================
   ACHIEVEMENTS. The page decides WHICH (js/27-steam.js reads them off the
   save); this only reports them. isActivated() first, so a sweep at every
   launch costs nothing and pops nothing twice. One store() per batch. */
ipcMain.on("steam:achieve",(e,ids)=>{
  if(!Array.isArray(ids))return;
  // Without Steam it says what it WOULD unlock: the one way to see this
  // path work on a machine with no Steam on it (tools/steamtest.js reads it).
  if(!steam){console.log("[steam] offline, would unlock: "+ids.join(" "));return;}
  let any=false;
  for(const id of ids){
    try{
      if(!steam.achievement.isActivated(String(id))){
        if(steam.achievement.activate(String(id)))any=true;
        else console.warn("[steam] achievement refused: "+id+" (is it defined in Steamworks?)");
      }
    }catch(err){console.warn("[steam] achievement "+id+": "+err.message);}
  }
  if(any)try{steam.stats.store();}catch(err){}
});
ipcMain.on("steam:info",e=>{
  e.returnValue={steam:!!steam,why:steamWhy,deck:onDeck(),test:TEST_APP};
});
/* The Deck's on-screen keyboard, over the field being typed into. The only
   text fields are a level's name and the paste box in MY LEVELS; without
   this a Deck player has to know Steam+X. */
ipcMain.on("steam:keyboard",(e,r)=>{
  if(!steam||!r)return;
  try{steam.utils.showFloatingGamepadTextInput(r.multi?1:0,
    Math.round(r.x),Math.round(r.y),Math.round(r.w),Math.round(r.h)).catch(()=>{});}catch(err){}
});

/* ============================================================
   THE WINDOW

   Full screen is the DOCUMENT's full screen, not the window's. The game's
   own switch (js/26-desk.js) asks document.fullscreenElement, so a window
   opened with BrowserWindow's `fullscreen:true` would be full screen while
   the game's button said it was not. Instead the page is asked to go full
   screen itself, as if the player had pressed the button, and whatever the
   player last chose is remembered in prefs.json. A Deck is always full
   screen - there is no desktop behind it to go back to. */
const PREFS=path.join(ROOT_DIR,"prefs.json");
function prefs(){try{return JSON.parse(fs.readFileSync(PREFS,"utf8"));}catch(e){return {};}}
function prefsSet(k,v){
  const p=prefs();p[k]=v;
  try{fs.mkdirSync(ROOT_DIR,{recursive:true});fs.writeFileSync(PREFS,JSON.stringify(p));}catch(e){}
}

let win=null;
function open(){
  const deck=onDeck();
  win=new BrowserWindow({
    width:1280,height:800,minWidth:800,minHeight:500,
    backgroundColor:"#0a0e1a",show:false,
    title:"I'm Just A Cube",
    webPreferences:{
      preload:path.join(__dirname,"preload.js"),
      contextIsolation:true,nodeIntegration:false,sandbox:true,
      /* SOUND WITHOUT A CLICK. A pad press is not a user activation, so in a
         browser a pad-only player would hear nothing until they touched a
         key (js/26-desk.js, THE GAMEPAD). The sting still waits for a press
         to START - that is its design - but the press may now be a button. */
      autoplayPolicy:"no-user-gesture-required",
      spellcheck:false,
      devTools:!app.isPackaged
    }
  });
  if(!deck)win.maximize();
  win.once("ready-to-show",()=>win.show());
  const wc=win.webContents;
  wc.on("did-finish-load",()=>{
    const full=deck||prefs().full!==false;
    if(full)wc.executeJavaScript(
      "document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(function(){})",
      true);   // true = run as a user gesture, which the Fullscreen API requires
  });
  wc.on("enter-html-full-screen",()=>{if(!deck)prefsSet("full",true);});
  wc.on("leave-html-full-screen",()=>{if(!deck)prefsSet("full",false);});

  /* Nothing navigates away from the game. A link out (the privacy policy)
     goes to the player's own browser. */
  wc.setWindowOpenHandler(({url})=>{
    if(/^https?:/i.test(url))shell.openExternal(url);
    return {action:"deny"};
  });
  wc.on("will-navigate",(e,url)=>{
    if(url!==wc.getURL()){e.preventDefault();if(/^https?:/i.test(url))shell.openExternal(url);}
  });
  // F12 opens the inspector in a development run only.
  if(!app.isPackaged)wc.on("before-input-event",(e,i)=>{
    if(i.type==="keyDown"&&i.key==="F12")wc.toggleDevTools();
  });
  win.on("close",saveFlush);
  win.loadFile(path.join(__dirname,"www","index.html"));
}

/* One copy at a time: two windows would be two writers on one save file. */
if(leaving||!app.requestSingleInstanceLock()){
  app.exit(0);
}else{
  app.on("second-instance",()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
  // No File/Edit/View bar - and none of its shortcuts (Ctrl+R would reload
  // mid-level, Ctrl+W would quit without the game's say).
  Menu.setApplicationMenu(null);
  app.whenReady().then(()=>{
    if(!fs.existsSync(path.join(__dirname,"www","index.html"))){
      dialog.showErrorBox("I'm Just A Cube",
        "www/ is empty. Run `node tools/build-app.js --desktop` from the repository root first.");
      app.exit(1);return;
    }
    open();
  });
  app.on("window-all-closed",()=>{saveFlush();app.quit();});
  app.on("before-quit",saveFlush);
}
