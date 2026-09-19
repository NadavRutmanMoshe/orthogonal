#!/usr/bin/env node
/* The store's promo video, played by a script.
 *
 *     node tools/video.js                writes store/video/promo.webm
 *     node tools/video.js --scene fold   just one scene, while tuning it
 *     node tools/video.js --portrait     1080x1920 instead of 1920x1080
 *     node tools/video.js --frames       also a PNG after every step
 *
 * `--frames` is how this gets tuned, and it is not a debugging leftover: a
 * .webm cannot be read back by whoever is editing this file, so without it
 * the only way to know whether the fold landed, the theme applied or the
 * hunter actually died is to open the video and watch. The frames are the
 * same beats as stills, numbered in order, and they are what every timing
 * in SCENES was set against.
 *
 * PLAY TAKES A YOUTUBE URL, NOT A FILE. So this writes a .webm, which
 * YouTube accepts as an upload with no conversion, and the link off that
 * upload is what goes in the Console. Nothing here needs ffmpeg.
 *
 * WHY IT IS RECORDED AND NOT FILMED. The Android app is a WebView of this
 * same page, so the headless browser draws the same pixels a phone does -
 * but with no status bar, no notification sliding in over the board, no
 * thumb, and exact framing. And because the moves are a script rather than
 * a take, the fold lands on cue every time and the whole thing re-records
 * in one command after the game changes. A phone recording is a take you
 * have to get right again.
 *
 * LANDSCAPE, because Play recommends it for this slot and YouTube is built
 * for it - and because it happens to suit the game: a boss arena is ten
 * cells wide and one tall, and `fitViewSize()` gives it far more room in a
 * 16:9 frame than in a 9:16 one.
 *
 * NOTHING IS FAKED. Every kill below is a real fold that a real player
 * could make, and the script waits for the game's OWN predicate -
 * `doomedCell()`, the function `bossFoldCrush()` itself uses - rather than
 * folding at a rehearsed time and hoping. That is also why it is robust:
 * retune a hunter's `step` and the video still kills it.
 */
const path=require("path"), fs=require("fs");
const ROOT=path.join(__dirname,"..");
const {loadPlaywright}=require("./playwright.js");

const SIZES={
  land:{vw:960, vh:540,  dpr:2, out:"store/video"},   // 1920x1080
  port:{vw:540, vh:960,  dpr:2, out:"store/video"}    // 1080x1920
};

/* ---- the opening level -------------------------------------------------
   THE FOLD TUTORIAL, RE-SKINNED AS FIRE, on the owner's call, and both
   halves of that are the point.

   Its LAYOUT because it is the clearest statement of the verb in the whole
   game: two platforms, a gap between them that cannot be walked, and a spur
   off in depth that is only reachable once depth stops existing. Every
   later level is that idea with something on top.

   Its WORLD because PROLOGUE, where it actually lives, is the greyest
   palette in the game - the same finding that took the icon off slate
   (tools/icon.js). `theme` is a SECTIONS index and `levelTheme()` reads
   SECTIONS[theme].theme, so 2 is II FIRE and that is the whole re-skin.

   NOT `tutorial:true`, which the real one is: that would bring the coach,
   the ghost hand and the guided lock, and a promo video wants the board. */
const FOLD_LEVEL={
  name:"00 - First Fold",
  hint:"The gap is not crossable. The gap is not the point.",
  start:[0,1,0], goal:[4,1,0], rotate:false, theme:2,
  blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[1,0,1],
          [2,0,-1],[2,0,0],[2,0,1],[4,0,1],[4,0,0],[4,0,-1],
          [3,0,3],[3,0,4],[3,0,5]]
};

/* ---- the script --------------------------------------------------------
   A scene is a list of steps. Each is {do, wait} or {until, wait}: `do` is
   evaluated in the page, `until` is polled there until it is true, and
   `wait` is how long to hold afterwards - which is the editing, because a
   hold is what lets a viewer see what just happened. */
const SCENES={
  /* 1. THE VERB, START TO FINISH, in about eighteen seconds. Walk to the
        edge, fold, cross the gap that is no longer there, stand back up on
        the far side. If somebody watches only this they have the game. */
  fold:[
    {do:`playVid(FOLD_LEVEL)`,            wait:2600},   // read the hint
    {do:`press("right")`,            wait:850},
    {do:`press("right")`,            wait:1500},   // at the brink
    {do:`doFlatten()`,                    wait:2400},   // THE FOLD
    {do:`press("right")`,            wait:800},
    {do:`press("right")`,            wait:1400},   // across
    {do:`doUnflatten()`,                  wait:2600},   // stood up, on the goal
    {hold:1400}
  ],
  /* 2. THE FIGHT. Two phases, both killed the same way and both waited for
        rather than timed: stand still, let one walk into the silhouette
        column, fold. The kill cam plays itself and the phase card follows,
        so most of this scene is the game showing off without help. */
  boss:[
    {do:`lvVid(18)`,                      wait:2800},   // the arena, the hint
    {do:`vidHunt(22000)`,                 wait:300},    // chase, then PHASE 1 DOWN
    {until:`vidPhase()>=1`,               wait:2600},   // kill cam, phase card
    {do:`if(flat)doUnflatten()`,          wait:1100},
    {do:`vidHunt(22000)`,                 wait:300},    // PHASE 2 DOWN
    {until:`vidPhase()>=2`,               wait:2800},
    {hold:600}
  ],
  /* 3. THAT THE GAME HAS A CLOCK IN IT. TRIAL I, long enough for the plane
        to sweep at least twice - the telegraph, then the strike - which is
        the only way the picture reads as a threat rather than a stripe. */
  trial:[
    {do:`lvVid(10)`,                      wait:2600},
    /* NO FOLD IN THIS SCENE, and that is the rule rather than the taste:
       a sweep down the view axis is unsurvivable in the plane by design
       (sweepSafety() only checks the volume, and says so), so a scripted
       fold here is a scripted death. The verb has already been shown twice
       by now anyway - what this scene is for is the clock. */
    {do:`vidDodge(11000)`,                wait:900},
    {hold:900}
  ]
};
const ORDER=["fold","boss","trial"];

/* Everything the script calls inside the page. Installed once, after the
   sting is skipped. */
function pageHelpers(foldLevel){
  return `(() => {
    window.FOLD_LEVEL=${JSON.stringify(foldLevel)};
    /* enterPlay() from outside the menus, the way tools/shot.js does it. */
    window.lvVid=function(i){ vidClear(); playSource="builtin"; enterPlay(LEVELS[i],i,false); };
    /* playSource MUST NOT be "builtin" here, and this lives inside a
       template literal so it carries no backticks. enterPlay() picks the
       world with applyTheme(playSource==="builtin" ? themeForLevel(lvIndex)
       : levelTheme(L)) in js/12-play.js - so as a builtin, the level's own
       theme is ignored and the INDEX decides. Index -1 gave PROLOGUE's
       slate, which is the exact palette this level was re-skinned to get
       away from. "library" is what a custom level plays as, and a custom
       level is what this is. */
    window.playVid=function(L){ vidClear(); playSource="library"; enterPlay(L,-1,false); };
    window.vidClear=function(){
      if(typeof homeHide==="function"&&homeUp())homeHide();
      var el=document.getElementById("intro"); if(el)el.classList.add("gone");
      if(typeof hidePanel==="function")hidePanel();
    };
    /* THE GAME'S OWN KILL TEST, not an approximation of it. bossFoldCrush()
       asks doomedCell() of every hunter and kills the ones that answer yes,
       so asking the same question is the difference between a video that
       lands the kill and one that folds into an empty column. */
    window.vidCanCrush=function(){
      if(typeof B==="undefined"||!B||typeof hunters==="undefined")return false;
      if(!hunters.length||flat)return false;
      if(typeof folding==="function"&&folding())return false;
      if(typeof bossPendingAdvance!=="undefined"&&bossPendingAdvance)return false;
      var cr=(typeof liveCrates==="function")?liveCrates():[];
      for(var i=0;i<hunters.length;i++){
        var h=hunters[i];
        if(doomedCell(h.x,h.y,h.z,cr))return true;
      }
      return false;
    };
    window.vidPhase=function(){
      return (typeof bossPhase==="undefined")?0:bossPhase;
    };
    /* THE FIGHT, PLAYED. Standing still and waiting to be lined up does not
       work and the reason is in the rules: foldKills() wants the hunter in
       your silhouette COLUMN (same u, same y), while bossLine() gives it a
       charge down any shared ROW - same z, or same x. Wait passively and it
       reaches a row line long before it wanders into your column, and it
       kills you. Three times, which is out of lives.

       So this plays the fight the way a person does. Every tick: kill if
       the kill is there; otherwise, if it already has a row line, step
       through depth to break it; otherwise close the gap in u. Aligning u
       hands it a column line at the same instant it hands us the crush, and
       that race we win - it needs bossAim() milliseconds to fire and we
       fold on the next 90ms tick.

       It resolves when the fold is away, so the caller can simply wait on
       it rather than guess how long a chase takes. */
    var vidDepth="up";
    window.vidHunt=function(ms){
      return new Promise(function(resolve){
        var t0=Date.now();
        function step(dir,then){
          var x0=player.x, z0=player.z;
          press(dir);
          setTimeout(function(){
            if(player.x===x0&&player.z===z0)then(false); else then(true);
          },240);
        }
        function tick(){
          if(Date.now()-t0>ms){resolve("timeout");return;}
          if(typeof B==="undefined"||!B||!hunters||!hunters.length){resolve("clear");return;}
          if(bossPendingAdvance||bossPendingDeath){resolve("pending");return;}
          if(flat||(typeof folding==="function"&&folding())){setTimeout(tick,90);return;}
          var cr=(typeof liveCrates==="function")?liveCrates():[];
          for(var i=0;i<hunters.length;i++){
            var h=hunters[i];
            if(doomedCell(h.x,h.y,h.z,cr)){ doFlatten(); resolve("fold"); return; }
          }
          var best=null,bd=1e9;
          for(var j=0;j<hunters.length;j++){
            var g=hunters[j], d=Math.abs(g.x-player.x)+Math.abs(g.z-player.z);
            if(d<bd){bd=d;best=g;}
          }
          if(!best){setTimeout(tick,90);return;}
          // It has a line down our row: get out of that row through depth.
          if(best.y===player.y&&best.z===player.z&&best.x!==player.x){
            step(vidDepth,function(moved){
              if(!moved)vidDepth=(vidDepth==="up")?"down":"up";
              tick();
            });
            return;
          }
          var du=R.uOf(view,best.x,best.z)-R.uOf(view,player.x,player.z);
          if(du!==0){
            step(du>0?"right":"left",function(moved){
              // Walled in along u: go round through depth and try again.
              if(!moved)step(vidDepth,function(m2){
                if(!m2)vidDepth=(vidDepth==="up")?"down":"up";
                tick();
              }); else tick();
            });
            return;
          }
          setTimeout(tick,90);
        }
        tick();
      });
    };
    /* THE TRIAL, SURVIVED. The sweep charges one slice at a time and the
       arena guarantees only this much (sweepSafety in js/03-rules.js): for
       every square and every beat, either you are safe or one step away is.
       So a script that just walks right gets hit, which is what the first
       cut of this scene did - two lives gone in ten seconds, and a promo
       that makes the player look bad at their own game.

       This asks the sweep the same two questions the renderer asks -
       TR.beatAt(trialMs) for the slice that is charging, TR.hits() for
       whether a square is in it - and steps out when the answer is yes.
       Press-and-recheck rather than working out where each direction leads:
       the fire window is 320ms of a 2300ms beat, so there is over a second
       to move, and one wasted step costs nothing a viewer can see.

       When it is safe it walks toward the goal, so the scene is somebody
       making progress under a clock rather than somebody hiding. */
    var vidTurn=0;
    window.vidDodge=function(ms){
      return new Promise(function(resolve){
        var t0=Date.now();
        /* Where each control actually leads. press("right") walks +r and
           "up" walks -d, where r and d are the view's own axes (AX in
           js/01-coords.js), so the four directions have to be derived from
           the view rather than assumed to be x and z. */
        function dirs(){
          var r=AX[view].r, d=AX[view].d;
          return [{n:"right",dx:r[0],dz:r[2]},{n:"left",dx:-r[0],dz:-r[2]},
                  {n:"up",dx:-d[0],dz:-d[2]},{n:"down",dx:d[0],dz:d[2]}];
        }
        /* SOMETHING TO STAND ON. The first cut of this dodge also walked
           right whenever it was safe, to look like progress, and that is
           what kept ending the scene on the out-of-lives card: the arena is
           small and a blind step goes off the edge, which is rule 3. A
           promo does not need the level finished - it needs the sweep to
           look dangerous and the player to look competent - so this only
           ever moves to get out of the way, and only onto ground. */
        function standable(nx,nz,cr){
          return R.solid(nx,player.y-1,nz,cr)||R.solid(nx,player.y,nz,cr);
        }
        function tick(){
          if(Date.now()-t0>ms){resolve("done");return;}
          if(typeof TR==="undefined"||!TR||levelOver()){resolve("over");return;}
          if(flat||dying||(typeof folding==="function"&&folding())){
            setTimeout(tick,100);return;}
          var cr=(typeof liveCrates==="function")?liveCrates():[];
          var sw=TR.beatAt(trialMs);
          if(!TR.hits(sw,view,"3",player.x,player.y,player.z)){
            setTimeout(tick,120);return;               // safe where we are
          }
          var opts=dirs().filter(function(o){
            var nx=player.x+o.dx, nz=player.z+o.dz;
            return standable(nx,nz,cr)&&
                   !TR.hits(sw,view,"3",nx,player.y,nz);
          });
          if(opts.length){
            // Rotate the choice so a wall on one side cannot pin us.
            press(opts[(vidTurn++)%opts.length].n);
            setTimeout(tick,220);return;
          }
          setTimeout(tick,120);
        }
        tick();
      });
    };
    /* The cut between scenes. A hard jump from a won puzzle to a boss arena
       reads as a glitch; 420ms of black reads as an edit. It is a plain
       overlay over everything, including the full-bleed cards. */
    var f=document.createElement("div");
    f.style.cssText="position:fixed;inset:0;background:#000;z-index:9999;"
      +"opacity:0;pointer-events:none;transition:opacity .42s linear";
    document.body.appendChild(f);
    window.vidFade=function(on){ f.style.opacity=on?"1":"0"; };
  })()`;
}

async function main(){
  const args=process.argv.slice(2);
  const arg=n=>{ const i=args.indexOf(n); return i>=0?args[i+1]:null; };
  const only=arg("--scene");
  const S=SIZES[args.includes("--portrait")?"port":"land"];
  const out=path.join(ROOT,S.out);
  fs.rmSync(out,{recursive:true,force:true});
  fs.mkdirSync(out,{recursive:true});

  const pw=loadPlaywright();
  const browser=await pw.chromium.launch({args:[
    "--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader",
    "--autoplay-policy=no-user-gesture-required"]});
  const ctx=await browser.newContext({
    viewport:{width:S.vw,height:S.vh}, deviceScaleFactor:S.dpr,
    reducedMotion:"no-preference",
    recordVideo:{dir:out,size:{width:S.vw*S.dpr,height:S.vh*S.dpr}}});
  const page=await ctx.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  /* Same guard tools/shot.js keeps: the game asks for nothing over the
     network and a request creeping back in should break loudly here. */
  await page.route(/^https?:/,r=>r.abort());
  /* A save with the campaign part-finished, so the HUD has a star total on
     it and the hint bulb is full - an empty save films like a demo. */
  await page.addInitScript(()=>{ try{
    localStorage.setItem("orthogonal:settings",JSON.stringify(
      {hintAsked:true,starAsked:true,volume:0,volTouched:true}));
    var p={}; localStorage.setItem("orthogonal:progress",JSON.stringify(p));
  }catch(e){}
    /* THE FILM OPENS BLACK, and it has to be done here rather than with the
       fade overlay, because the recording starts when the CONTEXT is made -
       which is before the page has loaded. Without this the first seconds
       of the promo are the studio sting and the home screen flashing past
       while the script skips them, which is the one part of this game no
       viewer was meant to see twice. An init script runs before the page's
       own scripts, so the black is up before anything draws. */
    try{
      var st=document.createElement("style");
      st.id="vidblack";
      st.textContent="html{background:#000!important}body{opacity:0!important}";
      document.documentElement.appendChild(st);
    }catch(e){}
  });

  await page.goto("file://"+path.join(ROOT,"index.html"));
  await page.waitForFunction(()=>typeof splashState!=="undefined"&&typeof renderer!=="undefined");
  await page.waitForTimeout(400);
  await page.evaluate(()=>{ if(splashState!=="done"){splashState="running";splashEnd();} });
  await page.waitForTimeout(400);
  await page.evaluate(pageHelpers(FOLD_LEVEL));
  // The fade overlay is up and black, so the opening style can come off
  // without anything showing through.
  await page.evaluate(()=>{ vidFade(true);
    var st=document.getElementById("vidblack"); if(st)st.remove(); });
  await page.waitForTimeout(300);

  const frames=args.includes("--frames");
  const fdir=path.join(ROOT,"store","frames");
  if(frames){ fs.rmSync(fdir,{recursive:true,force:true}); fs.mkdirSync(fdir,{recursive:true}); }
  let fn=0;
  const grab=async(tag)=>{ if(!frames)return;
    await page.screenshot({path:path.join(fdir,String(++fn).padStart(2,"0")+"-"+tag+".png")}); };

  /* HOW LONG THE FILM IS, measured rather than added up from the waits.
     The recording runs for the whole life of the context, so every second
     spent chasing a hunter is a second of video - and the chase is the one
     part whose length the script does not choose. Printing it per scene is
     what keeps the cut honest: a promo that drifts past a minute is a promo
     nobody watches to the end. */
  const t0=Date.now();
  const scenes=only?[only]:ORDER;
  for(const name of scenes){
    const steps=SCENES[name];
    if(!steps){ console.error("scenes: "+ORDER.join(", ")); process.exit(1); }
    const ts=Date.now();
    console.log("scene "+name);
    // The scene is set up behind the black, then faded up.
    if(steps[0].do) await page.evaluate(steps[0].do);
    await page.waitForTimeout(260);
    await page.evaluate(()=>vidFade(false));
    await page.waitForTimeout(steps[0].wait||900);
    await grab(name+"-open");
    for(const st of steps.slice(1)){
      if(st.until){
        try{ await page.waitForFunction(st.until,null,{timeout:25000,polling:60}); }
        catch(e){ console.error("  !! timed out waiting for "+st.until); }
      }else if(st.do){
        await page.evaluate(st.do);
      }
      await page.waitForTimeout(st.wait||st.hold||600);
      await grab(name+"-"+(st.do||st.until||"hold").replace(/[^a-z0-9]+/gi,"").slice(0,16));
    }
    await page.evaluate(()=>vidFade(true));
    await page.waitForTimeout(520);
    console.log("      "+((Date.now()-ts)/1000).toFixed(1)+"s");
  }
  console.log("film   "+((Date.now()-t0)/1000).toFixed(1)+"s of scenes");

  await page.waitForTimeout(300);
  await ctx.close();
  await browser.close();

  const made=fs.readdirSync(out).filter(f=>f.endsWith(".webm"));
  if(!made.length){ console.error("no video written"); process.exit(1); }
  const to=path.join(out,"promo.webm");
  fs.renameSync(path.join(out,made[0]),to);
  const kb=Math.round(fs.statSync(to).size/1024);
  console.log(path.relative(ROOT,to)+"  "+kb+" KB  "+(S.vw*S.dpr)+"x"+(S.vh*S.dpr));
  const bad=errors.filter(e=>!/ERR_FAILED|ERR_CONNECTION|net::/.test(e));
  if(bad.length) console.error("page errors: "+bad.join(" | "));
}
main().catch(e=>{ console.error(e); process.exit(1); });
