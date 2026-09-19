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

const {loadPlaywright}=require("./playwright.js");
/* The fold tutorial in FIRE colours, shared with tools/video.js so the still
   and the moving picture are the same board. See tools/foldlevel.js. */
const {FOLD_LEVEL}=require("./foldlevel.js");

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
  age:      {what:"the setup card in its reopened form (no menu row opens it now)", js:"introOpen(true);"},
  wardrobe: {what:"the wardrobe on SHAPE", js:"wardrobePanel('shape');", wait:1200},
  "wardrobe:color":{what:"the wardrobe on COLOUR", js:"wardrobePanel('color');", wait:1200},
  legend:   {what:"the piece legend", js:"legendPanel();"},
  mylevels: {what:"MY LEVELS, the player's own levels", js:"myLevelsPanel();"},
  newlevel: {what:"naming a new level and choosing its ground", js:"newLevelPanel();"},
  library:  {what:"MORE, the level designer's workbench behind MY LEVELS", js:"libraryPanel();"},
  "level:N":{what:"playing level N (index into LEVELS; 2 is '01 - On Your Own', the safe one)", js:"lv(N);"},
  "flat:N": {what:"level N, folded to 2D", js:"lv(N);setTimeout(doFlatten,50);", wait:1500},
  "win:N":  {what:"level N's win card", js:"lv(N);setTimeout(function(){moveCount=statsCached(L).moves||0;win();},50);", wait:2200},
  boss:     {what:"BOSS I, a second in", js:"lv(18);", wait:1200},
  trial:    {what:"TRIAL I, a second in", js:"lv(10);", wait:1200},
  tutorial: {what:"00 - First Steps with the ghost hand", js:"lv(0);", wait:2500},
  editor:   {what:"the level editor", js:"enterEditor();"},
  /* `hintoffer` is gone: the card that explained the bulb was removed (see
     the note beside starsOffer() in js/12-play.js) and the target went on
     pointing at a function that no longer exists, which aborted --all. */
  starsoffer:{what:"the card that explains stars", js:"lv(14);settings.starAsked=false;setTimeout(starsOffer,50);"},
  refill:   {what:"the out-of-hints card", js:"lv(2);setTimeout(hintRefillOffer,50);"},
  struggle: {what:"the out-of-lives card, TRY AGAIN and the skip", js:"lv(18);settings.noSlowOffer=false;setTimeout(struggleOffer,600);", wait:1400},
  tutcard:  {what:"a full-bleed explanation card", js:"lv(2);cardPut('A heading','Two lines of body text, with {to2} named the way the button names it.','brief');"},
  toast:    {what:"a toast and a spoken cue", js:"lv(2);flash('a toast');flashCue('go right','hint · 2 left');", wait:400},
  guide:    {what:"the neighbour standing in a level, mid-sentence",
             js:"lv(6);setTimeout(function(){guideSay(guideTip());},400);", wait:1400},
  guidestuck:{what:"his line after ten losses on the same level",
             js:"lv(6);setTimeout(function(){guideSay(GUIDE_STUCK,true);},400);", wait:1400},
  glimpse:  {what:"the father, half a second in the back of a fire level",
             js:"lv(20);setTimeout(function(){ghostShow();},700);", wait:1000},
  phase:    {what:"the between-phases note on a boss", js:"lv(18);setTimeout(function(){phaseNote('the ground rises');},300);", wait:1200},
  /* THE FOLD TUTORIAL IN FIRE COLOURS, and the pair is the point: the same
     board, the same camera, the same two steps walked - one in the volume
     and one in the plane. Everything about the game that can be said without
     words is said by putting those two pictures next to each other, which is
     why tools/store.js opens with them and why changing one means changing
     the other. The board itself is tools/foldlevel.js, shared with the
     promo video so the still and the moving picture cannot disagree.

     The player walks to the brink first. Standing on the start square the
     gap is a fact about the level; standing at the edge of it, it is a
     problem the player is already in. */
  firefold: {what:"the fold tutorial re-skinned as FIRE, at the brink, in 3D",
             js:"lvCustom(FOLD_LEVEL);setTimeout(function(){press('right');},400);"
               +"setTimeout(function(){press('right');},1100);", wait:2400},
  fireflat: {what:"the same board, same camera, folded to 2D - the pair to firefold",
             js:"lvCustom(FOLD_LEVEL);setTimeout(function(){press('right');},400);"
               +"setTimeout(function(){press('right');},1100);setTimeout(doFlatten,1900);", wait:3600},
  /* THE TWO WORDS A FIGHT CAN END ON, both on BOSS I. They are the game's own
     stings (bossSting() in js/12-play.js), reached through the game's own
     paths: `smashed` calls bossHurt(), the same function a charge calls, and
     `crushed` really folds - bossFoldCrush() decides the kill, picks the
     word and counts the phase. Nothing is drawn here that the fight does not
     draw itself.

     The timing is why they are separate screens rather than an --eval. A
     sting lives STING_MS (940ms) and the kill cam's snow starts at KC_HOLD
     (1600ms), so the shot has to land in the gap between the word appearing
     and the television covering it. Those two constants are in
     js/05-state.js; if either moves, these waits move with it. */
  smashed:  {what:"BOSS I: SMASHED - a hunter reached you and took a life",
             js:"lv(18);setTimeout(bossSmash,1500);", wait:2050},
  crushed:  {what:"BOSS I: CRUSHED - you folded with one in your silhouette column",
             js:"lv(18);setTimeout(bossCrush,1500);", wait:2300},
  /* THE CUTSCENES, seekable by beat. storySeek() runs every beat up to the
     one asked for and snaps the walks to their last cell, which is near
     enough to the pose a beat holds - so `story1:13` is the frame just after
     the fold that takes the parents. The beat numbers are the array indices
     in STORY.open.beats / STORY.end.beats in js/22-story.js, so they move
     when a beat is added or cut; the ones quoted here are a guide. */
  "story1:N":{what:"the opening cutscene at beat N (0 the house, 13 the fold, 18 the last line)",
              js:"storyShot();storyPlay('open');storySeek(N);", wait:700},
  "story2:N":{what:"the ending cutscene at beat N; a replay, so it skips the arrival (1 is the press it asks for)",
              js:"storyShot();storyPlay('end',true);storySeek(N);", wait:700},
  "story3:N":{what:"the fire scene at beat N (his lines are 1..3)",
              js:"storyShot();storyPlay('fire',true);storySeek(N);", wait:700},
  /* And the one frame seeking cannot reach, because it is on the far side of
     a real fold: the player presses GO 2D and she is standing in the plane. */
  reunion:  {what:"the ending, after the player's own fold",
             js:"storyShot();storyPlay('end',true);storySeek(1);setTimeout(doFlatten,400);", wait:3200},
  storyend: {what:"the last card, after the last fold",
             js:"storyShot();storyPlay('end',true);storySeek(6);setTimeout(storyEndCard,200);", wait:1400},
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
    // No network in the sandbox, and since css/05-fonts.css the game asks for
    // none: both typefaces are inline woff2, so a shot is set in the faces
    // that ship rather than in whatever the machine had. Left aborting on
    // purpose - it is the cheapest guard there is against a request creeping
    // back in, and a screen that needs one will come out visibly wrong here.
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
      await page.evaluate(foldLvl=>{
        // The sting: skip straight to done, the same path a second tap takes.
        if(splashState!=="done"){splashState="running";splashEnd();}
        var clear=function(){
          if(typeof homeHide==="function"&&homeUp())homeHide();
          $("intro").classList.add("gone");
          hidePanel();
        };
        window.lv=function(i){ clear(); enterPlay(LEVELS[i],i,false); };
        // The same clearing a cutscene needs, minus the level: storyPlay()
        // loads its own board.
        window.storyShot=clear;
        /* A LEVEL THAT IS NOT IN LEVELS, played the way a player's own level
           plays. playSource MUST be "library" here: enterPlay() picks the
           world with applyTheme(playSource==="builtin" ? themeForLevel(lvIndex)
           : levelTheme(L)), so as a builtin the level's own `theme` is
           ignored and the index decides - and -1 gives PROLOGUE's slate,
           which is the palette FOLD_LEVEL was re-skinned to get away from.
           Set per context, and every screen gets a fresh one, so this cannot
           leak into the builtin shots. */
        window.FOLD_LEVEL=foldLvl;
        window.lvCustom=function(L){ clear(); playSource="library"; enterPlay(L,-1,false); };
        /* ---- the two ways a fight ends, posed ----------------------------
           Both call the game's own function and let it draw whatever it
           draws; neither writes a sting itself.

           SMASHED is bossHurt(), which is what a charge and a touch both
           call (js/12-play.js). The shield is cleared first because a fight
           opens with grace on it and bossHurt() returns early while
           shielded() - otherwise this quietly did nothing and the shot came
           out as an ordinary arena. */
        /* TWO THINGS HAVE TO BE HELD OFF FOR EITHER OF THESE TO PHOTOGRAPH.

           THE REPLAY, because it goes up on EVERY hit and every phase clear,
           not just the fatal one (replayStart at the foot of bossHurt), and
           it washes the board, letterboxes it and writes REPLAY across the
           bottom - so the first attempt at both of these came out as two
           pictures of the kill cam's chrome. It is turned away with the
           game's own guard rather than with a flag: replayStart() refuses a
           buffer shorter than two frames, so emptying repBuf is a decline,
           not a bypass.

           THE STING'S OWN ANIMATION, and stopping its timer is not enough -
           that was the second attempt and it came out blank too. The word is
           a CSS animation with `forwards` on it (.bsword in
           css/65-replay.css), so it lifts away at its own 100% whatever the
           class says; holding `.on` holds an element that has already
           animated itself to nothing.

           So it is PINNED rather than held: every animation in the sting is
           seeked to STING_FRAME and paused through the Web Animations API,
           which fixes the whole thing at one frame no matter how slowly a
           swiftshader frame arrives. 330ms is where the poster is - the
           bloom (.34s) has just finished, the speed lines (.58s) are still
           travelling, and the word (.92s) has landed and is glowing, which
           is the part of the effect anybody ever reads. */
        var STING_FRAME=330;
        var stingHold=function(){
          var el=$("bossSting"), n=0;
          var iv=setInterval(function(){
            if(el&&el.classList.contains("on")){
              clearTimeout(stingTimer);clearInterval(iv);
              var as=el.getAnimations?el.getAnimations({subtree:true}):[];
              for(var i=0;i<as.length;i++){
                try{ as[i].currentTime=STING_FRAME; as[i].pause(); }catch(e){}
              }
            } else if(++n>200)clearInterval(iv);
          },20);
        };
        window.bossSmash=function(){
          if(typeof B==="undefined"||!B||!hunters.length)return;
          repBuf.length=0;
          shieldMs=0;bossGraceMs=0;
          stingHold();
          bossHurt("it reached you",hunters[0]);
        };
        /* CRUSHED is a REAL FOLD. All this does is stand the hunter where a
           player would have manoeuvred it - foldKills() wants it at the same
           height and the same `u` (screen-right), which is the one cell the
           whole fight is about getting it into - and then presses GO 2D.
           bossFoldCrush() decides whether that kills, picks the word and
           counts the phase, exactly as it does in play.

           The cell is searched rather than assumed: `u` is x or z depending
           on the view (AX in js/01-coords.js), so hard-coding one axis works
           in two views out of four and fails silently in the others. Asking
           doomedCell() - the predicate bossFoldCrush() itself uses - is the
           same trick tools/video.js uses to land its kills. */
        window.bossCrush=function(){
          if(typeof B==="undefined"||!B||!hunters.length)return;
          repBuf.length=0;
          stingHold();
          /* AND THE PHASE CARD IS KEPT OFF THIS ONE. A phase clear normally
             waits for its replay before advancing (bossPendingAdvance), so in
             play the word gets the whole kill cam to itself and the card
             arrives well after it. With the replay declined above there is
             nothing for the advance to wait behind, so bossNext() runs on the
             same frame and "phase 2 of 3" lands exactly where the word is.
             Taken off for a few seconds rather than suppressed at the source:
             the fight still advances, it just is not photographed doing it. */
          var kill=setInterval(function(){ phaseNoteEnd(); },30);
          setTimeout(function(){ clearInterval(kill); },6000);
          var h=hunters[0], cr=(typeof liveCrates==="function")?liveCrates():[];
          h.y=player.y;h.line=null;h.lock=0;h.shy=0;
          var tries=[[player.x,player.z+3],[player.x,player.z-3],
                     [player.x+3,player.z],[player.x-3,player.z],
                     [player.x,player.z+2],[player.x+2,player.z]];
          for(var i=0;i<tries.length;i++){
            h.x=tries[i][0];h.z=tries[i][1];
            if(R.solid(h.x,h.y-1,h.z,cr)&&doomedCell(h.x,h.y,h.z,cr))break;
          }
          doFlatten();
        };
      },FOLD_LEVEL);
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
