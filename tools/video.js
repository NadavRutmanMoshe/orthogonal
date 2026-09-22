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
const {findFfmpeg}=require("./ffmpeg.js");
const {spawn}=require("child_process");

/* THE VIEWPORT IS THE RECORDING, AND dpr MUST BE 1. This was
   {vw:960, vh:540, dpr:2} with the recorder asked for vw*dpr - and the
   result was the game in the TOP-LEFT QUARTER of a 1080p frame with the rest
   empty, which is what "the promo looks weird" was.

   Playwright's `recordVideo.size` does NOT respect `deviceScaleFactor`. It
   captures the page at its CSS size and places that picture into a canvas of
   the size asked for, scaling DOWN to fit if it has to and never UP. So a
   960x540 CSS page handed a 1920x1080 recorder is a 960x540 picture in the
   corner of a 1920x1080 file. The dpr was buying nothing but the mismatch,
   and driving a 1080p recorder over a dpr-2 WebGL page for no picture is
   also where the judder came from.

   So the viewport IS the output size and dpr is 1. The game draws to canvas
   and lays out in CSS pixels, so 1920 wide is simply the desktop layout at
   full size - the same case tools/shot.js --desktop already covers. */
const SIZES={
  land:{vw:1920, vh:1080, dpr:1, out:"store/video"},   // 1920x1080
  hd:  {vw:1280, vh:720,  dpr:1, out:"store/video"},   // 720p, --720
  port:{vw:1080, vh:1920, dpr:1, out:"store/video"}    // 1080x1920
};

/* ---- the opening level -------------------------------------------------
   THE FOLD TUTORIAL, RE-SKINNED AS FIRE, on the owner's call. It lives in
   tools/foldlevel.js, which says why that board and why that world, because
   tools/shot.js points a camera at the same level for the store set and a
   second copy of a board is a board that drifts. */
const {FOLD_LEVEL}=require("./foldlevel.js");

/* ---- the script --------------------------------------------------------
   A scene is a list of steps. Each is {do, wait} or {until, wait}: `do` is
   evaluated in the page, `until` is polled there until it is true, and
   `wait` is how long to hold afterwards - which is the editing, because a
   hold is what lets a viewer see what just happened. */
/* THE CUT IS THE OWNER'S FOUR PHONE TAKES, SCRIPTED. He filmed four on the
   device, joined them with tools/promo-join.js, and the result could not go
   in the listing: a phone screen recording is vertical, which YouTube files
   as a Short and Play pillarboxes to a quarter of the frame - and the takes
   carry a status bar, a clock and a notification icon that are now in the
   store forever. So the four takes are re-authored here, where they play at
   1920x1080 with no phone furniture and re-record in one command every time
   the game changes.

   HIS SETTINGS ARE PART OF THE TAKE and are written into the save below:
   hidden buttons, medium board, FAST fights, landing mark on. The last only
   shows in scene two, which is the only scene that folds and stands up. */
const SCENES={
  /* 1. OPENING THE GAME. The sting, tapped, and the home screen it becomes.
        THIS SCENE IS WHY THE STING IS NO LONGER SKIPPED: every earlier cut
        of this film started at a level because the opening was "the one part
        of this game no viewer was meant to see twice", and that note was
        about a promo that opened cold on a puzzle. The owner films the boot
        because the wordmark is the studio and the home screen is the game's
        best-looking frame.

        splashState runs off -> armed -> running -> done. It arrives ARMED
        and waits, so the reveal below shows the wordmark sitting still; the
        poke is what a real tap calls, and it starts the fold animation. */
  open:[
    /* SHORT. This ran ten and a half seconds and the owner called it long,
       which it was: an opening is a door, not a scene, and nothing here is
       the game. The one hold that cannot be cut is the tap - the sting's own
       animation is SPLASH_FOLD 980 + SPLASH_HOLD 520 + SPLASH_OUT 420, so
       anything under about 2300 cuts the wordmark off mid-fold. The other
       three are as short as they read. */
    {do:`vidSting()`,                     wait:1200},   // the wordmark
    {do:`splashPoke()`,                   wait:2300},   // tapped: the animation
    {until:`typeof homeUp==="function"&&homeUp()`, wait:1600},   // home
    {hold:300}
  ],
  /* 2. THE VERB, START TO FINISH. Two right, fold, two right, stand up, one
        up - and THE LAST MOVE IS THE POINT, which the previous cut was
        missing. Standing up from the plane lands you on the block nearest
        the CAMERA (rule 5), which on this board is [4,1,1], not the goal at
        [4,1,0]. So the unfold does not win it; one step through depth does.
        The old scene stopped at the unfold and its comment claimed it was
        "on the goal", which was never true - it simply never checked, since
        nothing waited for a win card. This one waits for it. */
  fold:[
    {do:`playVid(FOLD_LEVEL)`,            wait:2600},   // read the hint
    {do:`press("right")`,                 wait:850},
    {do:`press("right")`,                 wait:1500},   // at the brink
    {do:`doFlatten()`,                    wait:2400},   // THE FOLD
    {do:`press("right")`,                 wait:800},
    {do:`press("right")`,                 wait:1400},   // across
    {do:`doUnflatten()`,                  wait:2300},   // stood up, one short
    {do:`press("up")`,                    wait:1100},   // onto the goal
    {until:`typeof levelDone!=="undefined"&&levelDone`, wait:3200},  // stars
    {hold:900}
  ],
  /* 3. THE FIGHT, FROM PHASE TWO. The owner films the back half: phase two
        killed, then phase three, which is the one that wins the level. An
        opening phase is the tutorial of a fight and he skips it.

        THE REPLAY IS SKIPPED, on his call, and by the button a player
        presses - vidNoRep() calls replaySkip(), the same function bound to
        #repSkip in js/19-bindings.js. It is a real skip, not a suppressed
        film: bossPendingAdvance still waits for replayEnd() and still gets
        its phase card, just without the second and a half of snow.

        bossPhase is ZERO-INDEXED, so phase two is 1 and phase three is 2,
        and killing phase 2 wins rather than reaching a bossPhase of 3 -
        which is why the last wait is on levelOver() and not on vidPhase(). */
  boss:[
    {do:`vidNoRep();lvVid(18);vidBossPhase(1)`,  wait:2900},  // phase two, up
    {do:`vidFight(30000)`,                wait:2600},   // phase two down
    {do:`vidFight(30000)`,                wait:700},    // phase three down
    {until:`typeof levelOver==="function"&&levelOver()`, wait:3200},  // stars
    {hold:900}
  ],
  /* 4. THE CLOCK, AND FINISHING UNDER IT. The owner films from the second
        core: reach it, reach the third, win. That is a change of kind from
        the old scene, which deliberately never finished - it only ever moved
        to get out of the way, because "a blind step goes off the edge, which
        is rule 3". vidRun() is what makes finishing safe: it BFSes the board
        for the route to the live core and only overrides it to dodge, so it
        is never taking a blind step, and the sweep still owns the timing. */
  trial:[
    {do:`lvVid(10);vidTrialCore(1)`,      wait:2600},   // second core live
    {do:`vidRun(30000)`,                  wait:600},
    {until:`typeof levelOver==="function"&&levelOver()`, wait:3200},  // stars
    {hold:900}
  ]
};
const ORDER=["open","fold","boss","trial"];

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
    /* The sting needs nothing done to it - it is already up and ARMED when
       the film fades in. This exists so the opening scene has a first step
       for the driver to run behind the black, like every other scene. */
    window.vidSting=function(){};
    /* STARTING A FIGHT PART-WAY IN. Every phase up to the one wanted is
       entered in order rather than jumped to, because bossEnterPhase() is
       what applies a phase's add blocks - skip phase one and the arena is
       missing whatever phase one built. Each call overwrites hunters, so
       only the last phase's pack is left standing, which is the point.
       Only the last announces; the ones on the way past are scenery. */
    window.vidBossPhase=function(n){
      if(typeof B==="undefined"||!B)return;
      for(var i=0;i<=n;i++){ bossPhase=i; bossEnterPhase(i===n); }
    };
    /* THE REPLAY, SKIPPED THE WAY A PLAYER SKIPS IT. replaySkip() is the
       function bound to #repSkip in js/19-bindings.js, and the catcher only
       accepts presses while body.replaying is set - so this watches for that
       class rather than guessing when a film starts. */
    window.vidNoRep=function(){
      if(window.vidRepTimer)return;
      window.vidRepTimer=setInterval(function(){
        if(document.body.classList.contains("replaying")&&
           typeof replaySkip==="function")replaySkip();
      },200);
    };
    /* Starting a trial part-way through its cores. trialCore is the index of
       the one that is live, and it is exactly what loadSession() restores a
       part-finished run with (js/06-persistence.js), bounded the same way. */
    window.vidTrialCore=function(n){
      if(typeof TR==="undefined"||!TR||!TR.cores)return;
      trialCore=Math.max(0,Math.min(TR.cores.length-1,n|0));
      buildGrid();syncHud();
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
          /* THE REST OF THE PACK IS THE DIFFERENCE BETWEEN A PHASE ONE AND A
             PHASE THREE, and the first version of this chase did not look at
             it. It tracked the nearest hunter and stepped out of THAT one's
             row - which is correct on an arena with one hunter on it, and is
             how you walk into the second one's row on an arena with three.
             The owner films phases two and three, so the pack is what the
             board is.

             So every square we could be standing on next is scored against
             every hunter EXCEPT the one we are hunting: a shared row with
             any of them is a charge waiting to happen (bossLine() fires down
             a shared x or z, js/03-rules.js), and those are worth a hundred
             of anything else. The target's own row is deliberately NOT a
             threat - closing u is exactly the race the comment above is
             about, and it is the race we win.

             Staying put is in the list on purpose. It is scored the same way
             and sometimes wins, which is how the chase waits out a bad beat
             instead of shuffling into something worse. */
          var tu=R.uOf(view,best.x,best.z);
          function threat(x,z){
            var n=0;
            for(var k=0;k<hunters.length;k++){
              var h2=hunters[k];
              if(h2===best)continue;
              if(h2.y===player.y&&(h2.x===x||h2.z===z))n++;
            }
            return n;
          }
          var r=AX[view].r, dp=AX[view].d;
          var ds=[{n:"right",dx:r[0],dz:r[2]},{n:"left",dx:-r[0],dz:-r[2]},
                  {n:"up",dx:-dp[0],dz:-dp[2]},{n:"down",dx:dp[0],dz:dp[2]}];
          var opts=[{n:null,x:player.x,z:player.z}];
          for(var m=0;m<ds.length;m++){
            var o=ds[m], nx=player.x+o.dx, nz=player.z+o.dz;
            if(!(R.solid(nx,player.y-1,nz,cr)||R.solid(nx,player.y,nz,cr)))continue;
            opts.push({n:o.n,x:nx,z:nz});
          }
          var pick=null, ps=1e9;
          for(var q=0;q<opts.length;q++){
            var c=opts[q];
            var sc=threat(c.x,c.z)*100+Math.abs(R.uOf(view,c.x,c.z)-tu);
            if(sc<ps){ps=sc;pick=c;}
          }
          if(pick&&pick.n){
            step(pick.n,function(moved){
              // Walled in: rock through depth so a corner cannot pin us.
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
    /* A PHASE IS NOT A HUNTER. vidHunt() resolves the moment its fold is
       away, and on a phase with one hunter on it that is the phase cleared -
       which is why the original two-scene cut could call it once per phase
       and wait for the phase number to move. Phases two and three carry more
       than one, so a single fold leaves the board still occupied and the
       wait for an advance that is not coming is exactly the 25s timeout this
       scene was hitting: both kills landed, and neither finished anything.

       So this is the hunt repeated until the PHASE moves, the level is won,
       or the run is out of lives. The unfold between kills is part of it -
       you kill from inside the plane, so every hunt after the first starts
       flat - and so is the pause after one: bossPendingAdvance holds the
       advance behind the replay, and starting the next chase during it
       would be chasing a board that is about to be rebuilt. */
    window.vidFight=function(ms){
      return new Promise(function(resolve){
        var t0=Date.now(), ph=(typeof bossPhase==="undefined")?0:bossPhase;
        function again(){
          if(Date.now()-t0>ms){resolve("timeout");return;}
          if(typeof levelOver==="function"&&levelOver()){resolve("won");return;}
          if(typeof B==="undefined"||!B){resolve("gone");return;}
          if(typeof bossPendingDeath!=="undefined"&&bossPendingDeath){
            resolve("died");return;}
          if(bossPhase!==ph){resolve("phase");return;}
          var busy=(typeof folding==="function"&&folding())||
                   (typeof bossPendingAdvance!=="undefined"&&bossPendingAdvance);
          if(busy){setTimeout(again,300);return;}
          if(flat){ doUnflatten(); setTimeout(again,900); return; }
          vidHunt(Math.max(2500,ms-(Date.now()-t0))).then(function(){
            setTimeout(again,800);
          });
        }
        again();
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
    /* THE TRIAL, FINISHED rather than merely survived - AND THE ROUTE IS THE
       SOLVER'S. The first version of this walked a breadth-first search of
       its own over standable squares, and it could not have worked: TRIAL I
       is two platforms that do not touch - box(0,2,0,0,0,2) and
       box(5,7,0,0,4,6) share no edge - and rotation is locked on it, so the
       only way across is a FOLD. An on-foot search reaches the near island's
       core and then times out looking for a step to the far one, which is
       exactly what it did.

       So the route comes from solve(), which knows about the fold because it
       is the same search every par in the game is measured with. Its path is
       a list of tokens - the four arrows, FLAT and POP - and playing those
       is what makes this an honest run rather than a rehearsed one. A leg is
       asked for by pointing level.goal at the core currently live, because
       that is the square solve() aims at.

       THE PLAN IS DROPPED THE MOMENT WE DODGE. A plan held across a dodge is
       a plan for a square we are no longer on, and re-solving is cheap here
       - the board is eighteen squares. That is the whole trick to scripting
       under a clock: never own a stale plan.

       WHILE FLAT THERE IS NO DODGING, and that is the level's design rather
       than a limit of this code. The sweep runs down z and views 0 and 2
       look down z, so hits() answers true everywhere in the plane - the
       comment on vidDodge() above called a scripted fold here a scripted
       death. What makes it survivable is WHEN: the slice is lethal for the
       last 340ms of every 2500, TR.phase() says how far through the beat we
       are, and folding just after a strike buys the whole crossing before
       the next one. */
    window.vidRun=function(ms){
      return new Promise(function(resolve){
        var t0=Date.now(), turn=0, plan=[], planAt=-1;
        function dirs(){
          var r=AX[view].r, d=AX[view].d;
          return [{n:"right",dx:r[0],dz:r[2]},{n:"left",dx:-r[0],dz:-r[2]},
                  {n:"up",dx:-d[0],dz:-d[2]},{n:"down",dx:d[0],dz:d[2]}];
        }
        function standable(nx,nz,cr){
          return R.solid(nx,player.y-1,nz,cr)||R.solid(nx,player.y,nz,cr);
        }
        function core(){
          if(!TR||!TR.cores)return null;
          return TR.cores[Math.min(trialCore,TR.cores.length-1)]||null;
        }
        /* The level's own goal is put back straight away: enterPlay(), the
           renderer and the picker all read it, and a trial's goal is
           cores[0] by construction (makeTrial, js/03-rules.js). */
        function routeTo(g){
          var keep=L.goal, out=null;
          try{
            L.goal=[g[0],g[1],g[2]];
            var r=solve(L,false,200000,
              {mode:"3",x:player.x,y:player.y,z:player.z,view:view});
            if(r&&r.status==="solved")out=r.path.slice();
          }catch(e){}
          L.goal=keep;
          return out;
        }
        function named(tok){
          var a=tok.charAt(0);
          if(a==="→")return "right";
          if(a==="←")return "left";
          if(a==="↓")return "down";
          if(a==="↑")return "up";
          return null;
        }
        function fire(tok){
          if(tok==="FLAT"){doFlatten();return 640;}
          if(tok==="POP"){doUnflatten();return 640;}
          var n=named(tok);
          if(n){press(n);return 260;}
          return 120;
        }
        function tick(){
          if(Date.now()-t0>ms){resolve("timeout");return;}
          if(typeof TR==="undefined"||!TR){resolve("gone");return;}
          if(levelOver()){resolve("won");return;}
          if(dying||(typeof folding==="function"&&folding())){
            setTimeout(tick,100);return;}
          // In the plane: play the plan out. It ends on the POP.
          if(flat){
            if(plan.length){ setTimeout(tick,fire(plan.shift())); }
            else { doUnflatten(); setTimeout(tick,720); }
            return;
          }
          var cr=(typeof liveCrates==="function")?liveCrates():[];
          var sw=TR.beatAt(trialMs);
          var safe=dirs().filter(function(o){
            var nx=player.x+o.dx, nz=player.z+o.dz;
            return standable(nx,nz,cr)&&!TR.hits(sw,view,"3",nx,player.y,nz);
          });
          // Caught by the charging slice: getting out is the only job.
          if(TR.hits(sw,view,"3",player.x,player.y,player.z)){
            plan=[];
            if(safe.length){
              press(safe[(turn++)%safe.length].n);
              setTimeout(tick,220);return;
            }
            setTimeout(tick,120);return;
          }
          var g=core();
          if(!g){setTimeout(tick,160);return;}
          if(!plan.length||planAt!==trialCore){
            plan=routeTo(g)||[];
            planAt=trialCore;
            if(!plan.length){setTimeout(tick,400);return;}
          }
          var tok=plan[0];
          if(tok==="FLAT"){
            if(TR.phase(trialMs)>0.30){setTimeout(tick,120);return;}
            plan.shift(); setTimeout(tick,fire("FLAT")); return;
          }
          // A standing step, but never INTO the slice that is charging.
          var n=named(tok);
          if(n&&!safe.some(function(o){return o.n===n;})){
            setTimeout(tick,140);return;
          }
          plan.shift();
          setTimeout(tick,fire(tok));
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
    /* THE RECORDER. One stream carrying both tracks, so there is no sync
       step and nothing to drift. It is started before the first scene and
       while the black is still up, so the film opens on black exactly as it
       did when Playwright was doing the recording.

       start(1000) asks for a chunk a second rather than one blob at the end:
       a seventy-second 1080p take is large enough that collecting it in one
       piece is a memory spike for no reason. */
    window.vidRecStart=function(audioOnly){
      return navigator.mediaDevices.getDisplayMedia({
        video:{frameRate:60}, audio:true, preferCurrentTab:true
      }).then(function(s){
        window.vidStream=s; window.vidChunks=[];
        /* THE VIDEO TRACK IS KEPT BUT NOT RECORDED. Tab audio only flows
           while the tab capture is live, so stopping the video track to
           save the readback would take the sound with it. It simply is not
           handed to the recorder: a MediaStream of the audio tracks alone
           costs nothing to encode, which is the whole point - VP8 in
           software at 1080p is what held the picture to two frames a
           second, and ffmpeg is taking the picture now. */
        var st=audioOnly?new MediaStream(s.getAudioTracks()):s;
        var mr=new MediaRecorder(st,audioOnly
          ?{mimeType:"audio/webm;codecs=opus", audioBitsPerSecond:128000}
          :{mimeType:"video/webm;codecs=vp8,opus",
            videoBitsPerSecond:9000000, audioBitsPerSecond:128000});
        mr.ondataavailable=function(e){
          if(e.data&&e.data.size)window.vidChunks.push(e.data); };
        window.vidRec=mr; mr.start(1000);
        return s.getAudioTracks().length;
      });
    };
    /* THE TRACKS ARE STOPPED AFTER onstop, NOT BEFORE. Killing the stream
       first cuts the recorder off mid-flush and the last chunk never
       arrives, which costs the end of the film - the one part that is a win
       card. The blob leaves as a download for the same reason it is chunked:
       it is too big to hand back through an evaluate. */
    window.vidRecStop=function(){
      return new Promise(function(res){
        var mr=window.vidRec;
        if(!mr){res(0);return;}
        mr.onstop=function(){
          var b=new Blob(window.vidChunks,{type:mr.mimeType||"video/webm"});
          if(window.vidStream)
            window.vidStream.getTracks().forEach(function(t){t.stop();});
          var a=document.createElement("a");
          a.href=URL.createObjectURL(b); a.download="promo.webm";
          document.body.appendChild(a); a.click();
          res(b.size);
        };
        mr.stop();
      });
    };
  })()`;
}

async function main(){
  const args=process.argv.slice(2);
  const arg=n=>{ const i=args.indexOf(n); return i>=0?args[i+1]:null; };
  const only=arg("--scene");
  /* HOW FAST THE CLOCKS RUN IN THE FILM. The owner films at FAST and that is
     the default, but it is a flag because a scripted player is not him: he
     manoeuvres, and vidHunt() takes the shortest line. If the fight is being
     lost rather than won, this is the dial to check before rewriting the
     chase - see the note on SPEED_SCALE in js/11-sound.js. */
  /* HEADED AND ffmpeg ARE THE DEFAULT, because they are the only combination
     that produces a watchable film. Measured on this machine, per capture
     path, same scenes:

       Playwright recordVideo      25fps hard, NO audio track at all
       tab capture, headless       ~2fps at 1080p, ~12fps at 720p, audio ok
       tab capture, headed kiosk   ~2fps - so it was never the compositor
       ffmpeg gdigrab, headed      the display's own rate

     The first three all fail on the same thing: the picture has to be read
     back out of a software-rendered WebGL surface and then encoded to VP8 in
     software, per frame, inside the browser. gdigrab takes the pixels the
     desktop has already composited and x264 ultrafast encodes an order of
     magnitude faster than Chrome's VP8 does, so neither cost is paid.

     --headless still works and is left in for a quick check of a scene's
     TIMING, where the frame rate does not matter; it warns, because a film
     made that way is not one to upload. */
  const HEADED=!args.includes("--headless");
  const SPEED=arg("--speed")||"fast";
  if(["slow","regular","fast"].indexOf(SPEED)<0){
    console.error("--speed is slow, regular or fast"); process.exit(1); }
  const S=SIZES[args.includes("--portrait")?"port":
                args.includes("--720")?"hd":"land"];
  const out=path.join(ROOT,S.out);
  fs.rmSync(out,{recursive:true,force:true});
  fs.mkdirSync(out,{recursive:true});

  const pw=loadPlaywright();
  /* SWIFTSHADER IS THE DEFAULT ON PURPOSE - software GL draws the same
     picture on any machine, which is what makes a re-record comparable to
     the one before it. --gpu asks for the real one instead, and is a
     measuring tool rather than a shipping mode: it says whether the page is
     being held back by the rasteriser. It usually is not the thing worth
     fixing, because Playwright's recorder writes 25fps whatever the page
     manages - see the note on the frame rate below. */
  const gl=args.includes("--gpu")
    ? ["--ignore-gpu-blocklist","--enable-gpu-rasterization"]
    : ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"];
  /* THE PAGE RECORDS ITSELF, and these four flags are what let it. Chromium
     can capture its own tab through getDisplayMedia({preferCurrentTab}),
     picture AND sound, and MediaRecorder writes the pair into one webm - so
     the audio cannot drift from the video, because they were never two
     files. Headless supports it; measured 1920x1080 at 60 with a video and
     an audio track before this was written.

     THIS REPLACES PLAYWRIGHT'S OWN RECORDER, which could not do the job:
     recordVideo writes a hard 25fps (r_frame_rate=25/1 on every file it
     made) and captures NO AUDIO AT ALL - not a silent track, no stream.
     Those are properties of that recorder, not of the game, which is why no
     amount of tuning the scenes fixed either one.

     --use-fake-ui-for-media-stream answers the permission prompt and
     --auto-accept-this-tab-capture answers the picker, neither of which a
     headless run has anybody to click. */
  const browser=await pw.chromium.launch({args:gl.concat([
    "--autoplay-policy=no-user-gesture-required",
    "--use-fake-ui-for-media-stream",
    "--auto-accept-this-tab-capture",
    "--enable-usermedia-screen-capturing",
    /* A HEADLESS TAB IS CAPTURED ON COMPOSITOR COMMITS, not at the rate the
       page draws, and with nothing to present to there is nothing asking it
       to commit. Without these a seventy-second film came back with a few
       hundred frames - the page was measured at 48fps and the capture got
       about three. These take the vsync and the cap off the compositor so a
       commit follows each frame. */
    "--disable-frame-rate-limit",
    "--disable-gpu-vsync",
    "--run-all-compositor-stages-before-draw"])
    /* HEADED IS THE ONLY WAY TO A REAL FRAME RATE, and the flags above are
       why: headless has no display to present to, so the compositor commits
       a few times a second and the capture gets what it commits - measured
       74 frames for a 31-second scene, about three a second, against a page
       drawing at 48. Nothing turns that on from the outside.

       A presented window commits at the display's refresh rate, so the same
       capture gets 60. KIOSK is what makes it usable: the screen here is
       exactly 1920x1080, so a window with a tab strip and a toolbar on it
       has nowhere to put a 1080p viewport. Fullscreen hands the page the
       whole panel, and viewport:null below lets the window decide the size
       rather than fighting it.

       NONE OF THE BROWSER IS IN THE FILM even so. getDisplayMedia with
       preferCurrentTab captures the TAB, not the window - no toolbar, no
       tab strip, and nothing that happens to be on the desktop. */
    /* --kiosk DOES NOT WORK HERE and the film that proved it was a
       recording of the whole desktop: the browser's own toolbar, a Chrome
       translate popup, the editor behind it and the taskbar, with the game
       in a window in the corner. Playwright launches the browser and THEN
       opens its own window through newContext(), and that window inherits
       none of the launch flags about window state. F11 after the page is up
       is what actually makes it fullscreen - see goFull() below, which also
       refuses to record if it did not take.

       Translate is off because that popup appeared over the game in the
       same take, and a promo cannot have Chrome's UI in it. */
    .concat(HEADED?["--disable-features=Translate,TranslateUI",
                    "--disable-infobars","--no-first-run"]:[]),
    headless:!HEADED});
  const ctx=await browser.newContext({
    /* Fullscreen: the window is the viewport, and overriding it here would
       leave the page rendering one size and the panel showing another. */
    viewport:HEADED?null:{width:S.vw,height:S.vh},
    deviceScaleFactor:HEADED?undefined:S.dpr,
    reducedMotion:"no-preference",
    /* The blob the page records comes back as a DOWNLOAD, which is how a
       file of this size crosses out of the page without being base64'd
       through the debugging protocol. */
    acceptDownloads:true});
  const page=await ctx.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  /* Same guard tools/shot.js keeps: the game asks for nothing over the
     network and a request creeping back in should break loudly here. */
  await page.route(/^https?:/,r=>r.abort());
  /* A save with the campaign part-finished, so the HUD has a star total on
     it and the hint bulb is full - an empty save films like a demo. */
  await page.addInitScript((opt)=>{ try{
    /* THE OWNER'S OWN SETTINGS, because they are part of the take: hidden
       buttons, medium board, FAST fights, landing mark on. `ui` is "none"
       rather than "hidden" - the three values loadSettings() accepts are
       full / compact / none (js/06-persistence.js) - and the mark only ever
       shows in the fold scene, which is the only one that stands back up.
       seenStory1/2/3 keep the opening cutscene from playing over scene one;
       they are in loadSettings()'s whitelist for exactly this reason.

       TEXT IS LARGE, and that one is the film's rather than the owner's. The
       game is phone-first and its type is set in fixed pixels, so at 1920
       CSS px the HUD is the same 12px it is on a 360px phone - which is a
       third of the apparent size and genuinely unreadable in a listing
       thumbnail. Menu > Text size is the game's own answer to that, one body
       class (css/97-textsize.css), and it deliberately leaves the d-pad, the
       turn buttons and GO 2D alone - which costs nothing here, because the
       owner films with the buttons hidden anyway. */
    /* VOLUME IS UP NOW, and it has to be: the film records the tab's audio,
       so a muted save is a silent promo. It was 0 back when Playwright was
       recording and captured no sound whatever the game did, which made
       muting it free. volTouched is what makes a stored volume win at all
       (loadSettings, js/06-persistence.js). */
    localStorage.setItem("orthogonal:settings",JSON.stringify(
      {hintAsked:true,starAsked:true,volume:0.8,volTouched:true,
       ui:"none",size:"medium",speed:opt.speed,foldmark:"on",text:"large",
       seenStory1:true,seenStory2:true,seenStory3:true}));
    /* A SAVE WITH THE CAMPAIGN PART-FINISHED, which this comment has always
       promised and the code did not deliver - it wrote `{}` and the film
       opened on an empty save. Two things needed it. The HUD's star total is
       one, as the old comment said. The other is scene one: nothingBehind()
       decides intro card versus HOME SCREEN, and on an empty save the sting
       hands over to the age question, not to the home screen the owner
       films. Progress is keyed by level NAME and an ordinary level's value
       is a move count, so these are nine cleared boards. */
    var p={"00 - First Steps":4,"00 - First Fold":7,"01 - On Your Own":9,
           "02 - Beware of Walls":11,"03 - A Real Challenge":13,
           "04 - The Shortcut":10,"05 - The Only Way":12,
           "06 - The Illusion":14,"07 - The Block":12};
    localStorage.setItem("orthogonal:progress",JSON.stringify(p));
  }catch(e){}
    /* THE FILM OPENS BLACK, and it has to be done here rather than with the
       fade overlay, because the recording starts when the CONTEXT is made -
       which is before the page has loaded. Without it the first seconds are
       whatever the page does while the script is still setting up.

       IT USED TO BE HERE TO HIDE THE STING, and that is no longer the
       reason - the sting is scene one now, on the owner's call. What it
       still hides is the setup: the helpers going in, the save being read
       and the first scene being staged all happen before any fade, and none
       of that is anything a viewer should see. An init script runs before
       the page's own scripts, so the black is up before anything draws. */
    try{
      var st=document.createElement("style");
      st.id="vidblack";
      st.textContent="html{background:#000!important}body{opacity:0!important}";
      document.documentElement.appendChild(st);
    }catch(e){}
  },{speed:SPEED});

  await page.goto("file://"+path.join(ROOT,"index.html"));
  await page.waitForFunction(()=>typeof splashState!=="undefined"&&typeof renderer!=="undefined");
  await page.waitForTimeout(400);
  /* THE STING IS ONLY SKIPPED WHEN IT IS NOT IN THE CUT. It is scene one
     now, so the film that runs the whole ORDER wants it left alone and
     ARMED, waiting to be tapped. Anything that does not open on it - a
     single `--scene boss` while tuning, say - still gets it ended here,
     because otherwise the wordmark is sitting over the first frame. */
  const scenes=only?[only]:ORDER;
  if(scenes[0]!=="open")
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
  /* WHAT FRAME RATE THE PAGE IS ACTUALLY DRAWING AT, measured once before
     the film starts. The browser is on SwiftShader (software GL, for a
     deterministic picture on any machine), and software-rasterising a 3D
     scene at 1920x1080 is four times the work it was at 960x540. If this
     prints something in the teens the video will judder no matter how the
     scenes are timed, and the answer is a smaller frame - not a shorter cut.
     It is also the first thing to check when a fight is lost: vidHunt()
     reacts on a 90ms tick, and a starved page cannot honour that.

     IT SETTLES FIRST, and that is not politeness. Measured the instant the
     helpers went in it read anywhere between 8 and 34 on the same machine,
     because warmScenery() is building and uploading the whole sprite set on
     an idle callback at exactly that moment (js/10-render.js). A number that
     swings four-fold is worse than no number - it invites tuning against the
     boot, which is the one part of the run no scene is filmed during. */
  await page.waitForTimeout(1500);
  const fps=await page.evaluate(()=>new Promise(res=>{
    let n=0; const t=performance.now();
    (function f(){ n++; if(performance.now()-t<2000)requestAnimationFrame(f);
      else res(Math.round(n/((performance.now()-t)/1000))); })();
  }));
  console.log("draw   "+fps+" fps at "+S.vw+"x"+S.vh+"  ·  fights "+SPEED);

  /* Rolling before the first scene is staged, and while the black is up.
     The audio recorder goes first and ffmpeg second, and BOTH START TIMES
     ARE KEPT: they are two recorders, so the only way the sound sits on the
     right frame is to measure the gap between them and hand it to the mux as
     an offset. Guessing zero put the fold's slam about a third of a second
     early. */
  /* FULLSCREEN, AND CHECKED. gdigrab takes the whole desktop, so the page
     had better BE the whole desktop - and the first cut of this recorded
     the editor, the taskbar and a translate popup because nothing asked.
     F11 is the only thing that reliably fullscreens a Playwright-opened
     window; the check is what turns a ruined 90-second take into an error
     before the take. */
  /* THE WINDOW IS PUT WHERE IT CAN BE FILMED, but nothing downstream trusts
     that it stayed there - see the measurement before ffmpeg starts. */
  let cdp=null, windowId=null;
  if(HEADED){
    cdp=await ctx.newCDPSession(page);
    ({windowId}=await cdp.send("Browser.getWindowForTarget"));
    await cdp.send("Browser.setWindowBounds",
      {windowId,bounds:{windowState:"fullscreen"}});
    await page.waitForTimeout(1200);
  }
  const FF=HEADED?findFfmpeg():null;
  const vtmp=path.join(out,"_picture.mkv");
  const atmp=path.join(out,"_sound.webm");
  const atrk=await page.evaluate(a=>vidRecStart(a),HEADED);
  if(!atrk) console.error("!! no audio track - the film will be silent");
  const aAt=Date.now();
  let ff=null, vAt=0;
  if(HEADED){
    /* THE FRAME IS MEASURED HERE, AFTER THE CAPTURE HAS BEEN ACCEPTED, AND
       THAT ORDER IS THE WHOLE FIX. Going fullscreen earlier and trusting it
       produced a film of the desktop - the browser's toolbar, the editor,
       the Play Console and the taskbar - because accepting the tab-capture
       prompt DROPS THE WINDOW OUT OF FULLSCREEN, after the check had already
       passed. The check was not wrong; it was early.

       So fullscreen is re-asserted once the capture is live, and then the
       page is asked where it actually is. gdigrab films THAT RECTANGLE
       rather than the desktop, which means the worst a restored window can
       now cost is a smaller picture - never somebody's screen in the promo.
       screenX/screenY are the CONTENT corner in Chrome, so no browser chrome
       is inside it either way.

       Even sizes: yuv420p halves both dimensions, and an odd one is a
       hard encoder error rather than a rounded picture. */
    await cdp.send("Browser.setWindowBounds",
      {windowId,bounds:{windowState:"fullscreen"}});
    await page.waitForTimeout(1200);
    const r=await page.evaluate(()=>({x:screenX,y:screenY,
      w:innerWidth,h:innerHeight,sw:screen.width,sh:screen.height}));
    const cw=r.w-(r.w%2), ch=r.h-(r.h%2);
    if(cw<640||ch<360){
      console.error("!! the page is only "+cw+"x"+ch+" - nothing worth "
        +"filming. Is another window stealing fullscreen?");
      await browser.close(); process.exit(1);
    }
    if(cw!==r.sw||ch!==r.sh)
      console.log("note   filming "+cw+"x"+ch+" at "+r.x+","+r.y
        +" (the page), not the full "+r.sw+"x"+r.sh+" screen");
    S.vw=cw; S.vh=ch;
    /* -draw_mouse 0, because gdigrab paints the cursor into the picture and
       the pointer is not part of the game. The script drives with keys and
       the mouse never moves, so it sat in one corner of every frame. */
    ff=spawn(FF,["-y","-f","gdigrab","-framerate","60","-draw_mouse","0",
      "-offset_x",String(r.x),"-offset_y",String(r.y),
      "-video_size",cw+"x"+ch,"-i","desktop",
      "-c:v","libx264","-preset","ultrafast","-crf","16",
      "-pix_fmt","yuv420p",vtmp],{stdio:["pipe","ignore","ignore"]});
    vAt=Date.now();
    await page.waitForTimeout(700);        // let it actually open the device
  }

  const t0=Date.now();
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
        /* WHAT THE STEP ANSWERED. vidHunt() and vidRun() both resolve with a
           word saying how they ended - "fold" is a kill, "pending" is a
           death waiting on a film, "timeout" is neither - and the driver
           used to drop it on the floor. That is most of why a lost fight
           was hard to read: the scene simply took longer and nothing said
           why. Anything that answers gets printed. */
        const said=await page.evaluate(st.do);
        if(said!==undefined&&said!==null)
          console.log("       "+String(st.do).slice(0,22)+" -> "+said);
      }
      await page.waitForTimeout(st.wait||st.hold||600);
      await grab(name+"-"+(st.do||st.until||"hold").replace(/[^a-z0-9]+/gi,"").slice(0,16));
    }
    await page.evaluate(()=>vidFade(true));
    await page.waitForTimeout(520);
    console.log("      "+((Date.now()-ts)/1000).toFixed(1)+"s");
  }
  console.log("film   "+((Date.now()-t0)/1000).toFixed(1)+"s of scenes");

  /* The page is asked to stop and hand the blob over as a download. The
     wait for the event is armed BEFORE the stop, or a fast flush fires it
     while nothing is listening. */
  const to=path.join(out,HEADED?"promo.mp4":"promo.webm");
  const dl=page.waitForEvent("download",{timeout:60000});
  await page.evaluate(()=>vidRecStop());
  const got=await dl;
  await got.saveAs(HEADED?atmp:to);
  if(ff){
    /* "q" on stdin is ffmpeg's own clean stop - it finalises the container.
       Killing it leaves an mkv with no index, which is why the picture goes
       to mkv rather than mp4 in the first place: mkv survives a bad ending,
       mp4 does not. */
    try{ ff.stdin.write("q"); }catch(e){}
    await new Promise(r=>{ ff.on("close",r); setTimeout(r,8000); });
  }
  await page.waitForTimeout(200);
  await ctx.close();
  await browser.close();

  if(HEADED){
    if(!fs.existsSync(vtmp)){ console.error("no picture recorded"); process.exit(1); }
    /* THE OFFSET IS MEASURED, NOT ASSUMED. -itsoffset shifts the SOUND by
       however much later ffmpeg started than the page's recorder did, so
       the two line up wherever the machine happened to put them. */
    /* NEGATIVE, AND THE SIGN IS THE WHOLE POINT. The sound recorder starts
       first - it has to, because accepting its capture prompt is what drops
       the window out of fullscreen, so the frame can only be measured
       afterwards - and ffmpeg starts a couple of seconds later. A sample
       taken at wall-clock T therefore sits at (T - aAt) in the sound and
       (T - vAt) in the picture, so lining them up wants
       S = aAt - vAt, which is NEGATIVE.

       It was written positive and went unnoticed because the gap was 19ms
       either way. Measuring the frame after the prompt pushed the gap to
       4.6 SECONDS, where the wrong sign does not misalign the film by a
       little - it misaligns it by nine seconds, twice the real error. */
    const skew=(-(vAt-aAt)/1000).toFixed(3);
    const mux=spawn(FF,["-y","-i",vtmp,"-itsoffset",skew,"-i",atmp,
      "-map","0:v:0","-map","1:a:0","-c:v","libx264","-preset","medium",
      "-crf","18","-pix_fmt","yuv420p","-r","60",
      "-c:a","aac","-b:a","160k","-shortest",to],
      {stdio:["ignore","ignore","ignore"]});
    const code=await new Promise(r=>mux.on("close",r));
    if(code!==0){ console.error("mux failed ("+code+")"); process.exit(1); }
    fs.rmSync(vtmp,{force:true}); fs.rmSync(atmp,{force:true});
    console.log("sound offset "+skew+"s");
  }

  if(!fs.existsSync(to)){ console.error("no video written"); process.exit(1); }
  const kb=Math.round(fs.statSync(to).size/1024);
  console.log(path.relative(ROOT,to)+"  "+kb+" KB  "+S.vw+"x"+S.vh
    +(HEADED?"":"   !! --headless: frame rate is not usable for upload"));
  const bad=errors.filter(e=>!/ERR_FAILED|ERR_CONNECTION|net::/.test(e));
  if(bad.length) console.error("page errors: "+bad.join(" | "));
}
main().catch(e=>{ console.error(e); process.exit(1); });
