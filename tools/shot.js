"use strict";
/* Screenshot any screen of the game, headless, in one command.
 *
 *   node tools/shot.js home map menu            -> shots/home.png, shots/map.png ...
 *   node tools/shot.js level:12 flat:12 win:12   -> a level, the same level folded, its win card
 *   node tools/shot.js --all                     -> every screen in SCREENS, one PNG each
 *   node tools/shot.js --list                    -> the names and what each one shows
 *
 * Options (any order, apply to every screen in the run):
 *   --out DIR         where the PNGs go (default shots/)
 *   --phone           390x844 @2  (default)
 *   --small           327x711 @2.75 - the owner's phone, the narrow case
 *   --desktop         1280x800 @1
 *   --w N --h N --dpr N   any viewport
 *   --ui full|compact|none   control layout (default: the game's default)
 *   --save fresh|mid|all     how much of the campaign the fake save has beaten
 *                            (default mid: sections I and II done)
 *   --wait MS         settle time before the shot (default 900)
 *   --eval "JS"       run this in the page after the screen is set up and
 *                     before the shot - the escape hatch for any state the
 *                     names below do not reach (e.g. --eval "press('R');press('R')")
 *   --tag NAME        suffix for the file names (shots/map.NAME.png), for a
 *                     before/after pair
 *
 * WHY THIS EXISTS. A UI change made blind is a UI change made twice: once
 * to write it and once to fix what it looked like. This is the eyes. It
 * runs the real index.html from disk (three.js is vendored, so there is no
 * network) under headless Chromium with software WebGL, seeds a save so the
 * map and the home screen have something to show, skips the sting, and
 * jumps straight to the screen you name by calling the game's own
 * functions - the same ones the buttons call. Nothing in the game knows it
 * is being photographed.
 *
 * Playwright is resolved from the global install if there is no local one
 * (that is how the remote sandbox has it). If neither exists the message
 * says what to install.
 */
const fs=require("fs"), path=require("path");
const ROOT=path.join(__dirname,"..");

function loadPlaywright(){
  const tries=["playwright",
    "/opt/node22/lib/node_modules/playwright",
    path.join(process.env.npm_config_prefix||"/usr/local","lib","node_modules","playwright")];
  for(const t of tries){ try{ return require(t); }catch(e){} }
  console.error("playwright not found. `npm i -g playwright` (Chromium is already installed in the remote sandbox; elsewhere also `npx playwright install chromium`).");
  process.exit(2);
}

/* Every screen is a name, a one-line description, and the JS that puts the
   game on it. The JS runs inside the page with every global in scope, after
   the sting has been skipped and the saves have loaded. `lv(i)` is provided:
   it loads LEVELS[i] and drops the intro card. Some screens wait longer
   because they animate in (a fold, a win card's stars). */
const SCREENS={
  splash:   {what:"the sting, cubes still scattered (taken before the skip)", js:"", splash:true},
  intro:    {what:"the intro card, a first run", js:"homeHide&&$('home').classList.remove('on');$('intro').classList.remove('gone');", save:"fresh"},
  home:     {what:"the home screen: plinth, CONTINUE, the shop strip", js:"homeShow();", wait:1400},
  sections: {what:"the section chooser LEVELS opens on", js:"sectionPicker();", wait:1200},
  map:      {what:"the map on the section you are in", js:"levelPicker();", wait:1200},
  "map:N":  {what:"the map open on section N (0 prologue … 5 extra)", js:"levelPicker(N);", wait:1200},
  "sheet:N":{what:"the map with level N's sheet up", js:"levelPicker();mapSheet(N);", wait:1200},
  maphelp:  {what:"the map's help sheet", js:"levelPicker();mapHelp();", wait:1200},
  menu:     {what:"the menu panel", js:"menuPanel();"},
  wardrobe: {what:"the wardrobe on SHAPE", js:"wardrobePanel('shape');", wait:1200},
  "wardrobe:color":{what:"the wardrobe on COLOUR", js:"wardrobePanel('color');", wait:1200},
  legend:   {what:"the piece legend", js:"legendPanel();"},
  mylevels: {what:"MY LEVELS, the player's own levels", js:"myLevelsPanel();"},
  newlevel: {what:"naming a new level and choosing its ground", js:"newLevelPanel();"},
  library:  {what:"MORE, the level designer's workbench behind MY LEVELS", js:"libraryPanel();"},
  "level:N":{what:"playing level N (index into LEVELS; 2 is '01 — On Your Own', the safe one)", js:"lv(N);"},
  "flat:N": {what:"level N, folded to 2D", js:"lv(N);setTimeout(doFlatten,50);", wait:1500},
  "win:N":  {what:"level N's win card", js:"lv(N);setTimeout(function(){moveCount=statsCached(L).moves||0;win();},50);", wait:2200},
  boss:     {what:"BOSS I, a second in", js:"lv(18);", wait:1200},
  trial:    {what:"TRIAL I, a second in", js:"lv(10);", wait:1200},
  tutorial: {what:"00 — First Steps with the ghost hand", js:"lv(0);", wait:2500},
  editor:   {what:"the level editor", js:"enterEditor();"},
  hintoffer:{what:"the card that explains the bulb", js:"lv(2);settings.hintAsked=false;setTimeout(hintOffer,50);"},
  starsoffer:{what:"the card that explains stars", js:"lv(14);settings.starAsked=false;setTimeout(starsOffer,50);"},
  refill:   {what:"the out-of-hints card", js:"lv(2);setTimeout(hintRefillOffer,50);"},
  struggle: {what:"the skip offer after repeated losses", js:"lv(18);settings.noSlowOffer=false;setTimeout(struggleOffer,600);", wait:1400},
  tutcard:  {what:"a full-bleed explanation card", js:"lv(2);cardPut('A heading','Two lines of body text, with {to2} named the way the button names it.','brief');"},
  toast:    {what:"a toast and a spoken cue", js:"lv(2);flash('a toast');flashCue('go right','hint · 2 left');", wait:400},
  phase:    {what:"the between-phases note on a boss", js:"lv(18);setTimeout(function(){phaseNote('the ground rises');},300);", wait:1200},
  /* THE CUTSCENES, seekable by beat. storySeek() runs every beat up to the
     one asked for and snaps the walks to their last cell, which is near
     enough to the pose a beat holds - so `story1:14` is the frame just after
     the fold that takes the parents. The beat numbers are the array indices
     in STORY.open.beats / STORY.end.beats in js/22-story.js. */
  "story1:N":{what:"the opening cutscene at beat N (0 the house, 14 the fold, 19 the last line)",
              js:"storyShot();storyPlay('open');storySeek(N);", wait:700},
  "story2:N":{what:"the ending cutscene at beat N (2 is the press it asks for)",
              js:"storyShot();storyPlay('end');storySeek(N);", wait:700},
  /* And the one frame seeking cannot reach, because it is on the far side of
     a real fold: the player presses GO 2D and she is standing in the plane. */
  reunion:  {what:"the ending, after the player's own fold",
             js:"storyShot();storyPlay('end');storySeek(2);setTimeout(doFlatten,400);", wait:3200},
  storyend: {what:"the last card, after the last fold",
             js:"storyShot();storyPlay('end');storySeek(6);setTimeout(storyEndCard,200);", wait:1400},
};

function parseArgs(argv){
  const o={screens:[],out:"shots",w:390,h:844,dpr:2,wait:900,save:"mid",ui:null,evalJs:null,tag:null,all:false,list:false};
  for(let i=0;i<argv.length;i++){
    const a=argv[i], next=()=>argv[++i];
    if(a==="--all")o.all=true;
    else if(a==="--list")o.list=true;
    else if(a==="--out")o.out=next();
    else if(a==="--phone"){o.w=390;o.h=844;o.dpr=2;}
    else if(a==="--small"){o.w=327;o.h=711;o.dpr=2.75;}
    else if(a==="--desktop"){o.w=1280;o.h=800;o.dpr=1;}
    else if(a==="--w")o.w=+next();
    else if(a==="--h")o.h=+next();
    else if(a==="--dpr")o.dpr=+next();
    else if(a==="--wait"){o.wait=+next();o.waitSet=true;}
    else if(a==="--save")o.save=next();
    else if(a==="--ui")o.ui=next();
    else if(a==="--eval")o.evalJs=next();
    else if(a==="--tag")o.tag=next();
    else if(a.startsWith("--")){console.error("unknown option "+a);process.exit(2);}
    else o.screens.push(a);
  }
  return o;
}

/* Resolve "flat:12" against the "flat:N" template. */
function resolve(name){
  if(SCREENS[name])return {key:name,def:SCREENS[name],n:null};
  // Digits are allowed inside the name as well as after the colon, or
  // `story1:14` reads as an unknown screen rather than as beat 14 of it.
  const m=/^([a-z][a-z0-9]*):(\d+)$/.exec(name);
  if(m&&SCREENS[m[1]+":N"])return {key:m[1]+":N",def:SCREENS[m[1]+":N"],n:+m[2]};
  return null;
}

/* The fake save. Progress is keyed by level name; an ordinary level stores a
   move count (1 is under any par, so three stars) and a clock level stores
   lives kept. */
function fakeSave(kind,LEVELS,SECTIONS){
  const progress={};
  if(kind!=="fresh"){
    const upto=kind==="all"?LEVELS.length:SECTIONS[3].at;   // mid: through BOSS II
    for(let i=0;i<upto;i++){
      const l=LEVELS[i];
      progress[l.name]=(l.boss||l.trial)?(i%3===0?2:3):(i%4===0?4:1);
    }
  }
  return progress;
}

function levelsFromSource(){
  const vm=require("vm");
  const ctx=vm.createContext({console,Set,Map,Math,JSON});
  for(const f of ["01-coords.js","02-levels.js"])
    vm.runInContext(fs.readFileSync(path.join(ROOT,"js",f),"utf8"),ctx,{filename:f});
  return {LEVELS:ctx.LEVELS,SECTIONS:ctx.SECTIONS};
}

async function main(){
  const o=parseArgs(process.argv.slice(2));
  if(o.list){
    for(const k in SCREENS)console.log(k.padEnd(16)+SCREENS[k].what);
    return;
  }
  if(o.all)o.screens=Object.keys(SCREENS).filter(k=>!k.includes(":N")).concat(["level:2","flat:2","win:2","map:1"]);
  if(!o.screens.length){console.error("nothing to shoot. try --list or --all");process.exit(2);}
  const jobs=[];
  for(const s of o.screens){
    const r=resolve(s);
    if(!r){console.error("unknown screen "+s+" (see --list)");process.exit(2);}
    jobs.push(Object.assign({name:s},r));
  }

  const {LEVELS,SECTIONS}=levelsFromSource();
  const pw=loadPlaywright();
  const browser=await pw.chromium.launch({args:[
    "--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader",
    "--autoplay-policy=no-user-gesture-required"]});
  fs.mkdirSync(path.join(ROOT,o.out),{recursive:true});
  const url="file://"+path.join(ROOT,"index.html");

  for(const job of jobs){
    const saveKind=job.def.save||o.save;
    const seed={
      "orthogonal:progress":JSON.stringify(fakeSave(saveKind,LEVELS,SECTIONS)),
      "orthogonal:settings":JSON.stringify(Object.assign(
        {hintAsked:true,starAsked:true,noSlowOffer:true,volume:0,volTouched:true},
        o.ui?{ui:o.ui}:{})),
    };
    const ctx=await browser.newContext({viewport:{width:o.w,height:o.h},deviceScaleFactor:o.dpr,
      reducedMotion:"no-preference"});
    const page=await ctx.newPage();
    const errors=[];
    page.on("pageerror",e=>errors.push(String(e)));
    page.on("console",m=>{ if(m.type()==="error")errors.push(m.text()); });
    // No network in the sandbox and none needed: fonts fall back to system faces.
    await page.route(/^https?:/,r=>r.abort());
    await page.addInitScript(seed=>{
      for(const k in seed){ try{ localStorage.setItem(k,seed[k]); }catch(e){} }
    },seed);
    await page.goto(url);
    await page.waitForFunction(()=>typeof splashState!=="undefined"&&typeof renderer!=="undefined");
    await page.waitForTimeout(500);   // the saves land, the first screen is chosen

    if(job.def.splash){
      await page.waitForTimeout(300);
    }else{
      await page.evaluate(()=>{
        // The sting: skip straight to done, the same path a second tap takes.
        if(splashState!=="done"){splashState="running";splashEnd();}
        window.lv=function(i){
          if(typeof homeHide==="function"&&homeUp())homeHide();
          $("intro").classList.add("gone");
          hidePanel();
          enterPlay(LEVELS[i],i,false);
        };
        // The same clearing a cutscene needs, minus the level: storyPlay()
        // loads its own board.
        window.storyShot=function(){
          if(typeof homeHide==="function"&&homeUp())homeHide();
          $("intro").classList.add("gone");
          hidePanel();
        };
      });
      await page.waitForTimeout(500);   // SPLASH_OUT
      const js=job.def.js.replace(/\bN\b/g,String(job.n));
      if(js)await page.evaluate(js);
      if(o.evalJs)await page.evaluate(o.evalJs);
    }
    /* An explicit --wait wins over the screen's own default. It used to
       lose to it, so `--wait 27000` on a screen declaring `wait:700` took the
       shot at 700ms and looked exactly like a cutscene that had frozen -
       which cost an hour of hunting a bug that was not there. */
    await page.waitForTimeout(o.waitSet?o.wait:(job.def.wait||o.wait));
    const file=path.join(ROOT,o.out,job.name.replace(/:/g,"-")+(o.tag?"."+o.tag:"")+".png");
    await page.screenshot({path:file});
    const bad=errors.filter(e=>!/ERR_FAILED|ERR_CONNECTION|net::/.test(e));
    console.log(path.relative(ROOT,file)+(bad.length?"   !! "+bad.join(" | "):""));
    await ctx.close();
  }
  await browser.close();
}
main().catch(e=>{console.error(e);process.exit(1);});
