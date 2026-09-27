#!/usr/bin/env node
/* The store's promo video, played by a script.
 *
 *     node tools/video.js                writes store/video/promo.mp4
 *     node tools/video.js --scene fold   just one scene, while tuning it
 *     node tools/video.js --portrait     1080x1920 instead of 1920x1080
 *     node tools/video.js --frames       also a still after every step
 *     node tools/video.js --soft         SwiftShader instead of the GPU
 *
 * `--frames` is how this gets tuned, and it is not a debugging leftover: a
 * video cannot be read back by whoever is editing this file, so without it
 * the only way to know whether the fold landed, the theme applied or the
 * hunter actually died is to open the video and watch. The frames are the
 * same beats as stills, numbered in order, and they are what every timing
 * in SCENES was set against.
 *
 * IT IS FILMED ONE FRAME AT A TIME, NOT IN REAL TIME. tools/clock.js takes
 * every clock away from the page, so the game only moves when this script
 * steps it by exactly 1/60s; each frame is photographed and piped to x264,
 * and the sound is rendered on the same clock. So the film is a flawless 60
 * however slowly the machine draws - the old real-time capture could only
 * film the frames the laptop managed, and that was the lag. The cost is
 * the wait: the 18s fold scene takes three and a half minutes on the
 * owner's GPU, six on SwiftShader. Needs ffmpeg.
 *
 * PLAY TAKES A YOUTUBE URL, NOT A FILE, and YouTube takes this mp4 as it is.
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
const {clockScript}=require("./clock.js");
const {spawn}=require("child_process");

/* THE VIEWPORT IS THE FILM, at dpr 1. (It once had to be, because
   Playwright's recorder ignored deviceScaleFactor; a screenshot does not,
   but the reason below still holds.) The game draws to canvas
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
    {do:`vidSting()`,                     wait:700},    // the wordmark
    {do:`splashPoke()`,                   wait:2300},   // tapped: the animation
    {until:`typeof homeUp==="function"&&homeUp()`, wait:1100},   // home
    {hold:100}
  ],
  /* 2. THE VERB, START TO FINISH. Two right, fold, two right, stand up, one
        up - and THE LAST MOVE IS THE POINT, which the previous cut was
        missing. Standing up from the plane lands you on the block nearest
        the CAMERA (rule 5), which on this board is [4,1,1], not the goal at
        [4,1,0]. So the unfold does not win it; one step through depth does.
        The old scene stopped at the unfold and its comment claimed it was
        "on the goal", which was never true - it simply never checked, since
        nothing waited for a win card. This one waits for it.

        IT FAILS FIRST, on the owner's call. The obvious move - keep walking
        right - goes straight off the edge of the gap and falls, which is
        rule 3 and the level's own hint ("The gap is not crossable") said by
        the board instead of the text. The level resets, and the fold is the
        answer to a problem the viewer has just watched. The win card is on
        screen only long enough to read "Solved": it was four seconds, and
        the owner called that too long. */
  fold:[
    {do:`playVid(FOLD_LEVEL)`,            wait:1300},   // read the hint
    {do:`press("right")`,                 wait:450},
    {do:`press("right")`,                 wait:450},
    {do:`press("right")`,                 wait:300},    // off the edge
    {until:`!dying&&player.x===0&&!flat`, wait:600},    // fell, reset
    {do:`press("right")`,                 wait:450},
    {do:`press("right")`,                 wait:800},    // at the brink again
    {do:`doFlatten()`,                    wait:1600},   // THE FOLD
    {do:`press("right")`,                 wait:550},
    {do:`press("right")`,                 wait:900},    // across
    {do:`doUnflatten()`,                  wait:1500},   // stood up, one short
    {do:`press("up")`,                    wait:700},    // onto the goal
    {until:`typeof levelDone!=="undefined"&&levelDone`, wait:1300},  // Solved
    {hold:100}
  ],
  /* 3. THE FIGHT, FROM PHASE TWO. The owner films the back half: phase two
        killed, then phase three, which is the one that wins the level. An
        opening phase is the tutorial of a fight and he skips it.

        THE KILL PLAYS OUT. It was skipped once (vidNoRep(), which presses
        #repSkip the moment a replay starts), and the owner's verdict on that
        film was that the death is the part worth seeing. vidNoRep() is
        still here for a cut that wants it.

        bossPhase is ZERO-INDEXED, so phase two is 1 and phase three is 2,
        and killing phase 2 wins rather than reaching a bossPhase of 3 -
        which is why the last wait is on levelOver() and not on vidPhase(). */
  boss:[
    /* THESE TWO WAITS ARE PINNED - DO NOT TRIM THEM. They look like dead
       air, and they were cut to 900 and 300 when the owner asked for the
       pace to come up - and the fight came out different: the hunters walk
       during them, so they decide where the pack stands when the chase
       starts, and the take became a plain double crush with no turns. The
       take the owner picked ("super boss like") is the one these produce:
       3060 here plus the 100ms of black before the fade-up is the 3160 it
       was filmed with, then 2600. The clock makes the fight repeat exactly,
       so the same waits always give the same fight - and any change to
       them, or to the chase, or to BOSS I, needs the log checked again. */
    {do:`lvVid("BOSS I - Catch Me If You Can!");vidBossPhase(1)`,  wait:3060},  // phase two, up
    {do:`vidFight(30000)`,                wait:2600},   // phase two down
    {do:`vidFight(30000)`,                wait:300},    // phase three down
    {until:`typeof levelOver==="function"&&levelOver()`, wait:1500},  // stars
    {hold:100}
  ],
  /* 4. THE CLOCK, AND FINISHING UNDER IT. The owner films from the second
        core: reach it, reach the third, win. That is a change of kind from
        the old scene, which deliberately never finished - it only ever moved
        to get out of the way, because "a blind step goes off the edge, which
        is rule 3". vidRun() is what makes finishing safe: it BFSes the board
        for the route to the live core and only overrides it to dodge, so it
        is never taking a blind step, and the sweep still owns the timing. */
  trial:[
    {do:`lvVid("TRIAL I - The Metronome");vidTrialCore(1)`, wait:1400},   // second core live
    {do:`vidRun(30000)`,                  wait:300},
    {until:`typeof levelOver==="function"&&levelOver()`, wait:1800},  // stars, the film's last frame
    {hold:100}
  ]
};
const ORDER=["open","fold","boss","trial"];

/* Everything the script calls inside the page. Installed once, after the
   sting is skipped. */
function pageHelpers(foldLevel){
  return `(() => {
    window.FOLD_LEVEL=${JSON.stringify(foldLevel)};
    /* enterPlay() from outside the menus, the way tools/shot.js does it. */
    /* BY NAME, NOT BY INDEX. This took 18 and 10 until 02 - Behind the Wall
       went in and moved every later level up one: 18 became SPARRING, which
       has no phase two to enter, and the boss scene died on it. A name is
       what progress, the renames and the neighbour's lines are keyed by for
       the same reason. */
    window.lvVid=function(name){
      var i=LEVELS.findIndex(function(l){ return l.name===name; });
      if(i<0)throw new Error("no level called "+name);
      vidClear(); playSource="builtin"; enterPlay(LEVELS[i],i,false);
    };
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
    /* THE FIGHT, PLAYED WITH THE TURN. foldKills() wants the hunter in your
       silhouette COLUMN - same height, and differing from you only along the
       view's DEPTH. bossLine() gives a hunter a charge down any shared ROW,
       x or z. Those are the same relation seen along two axes, and that is
       the whole fight: a hunter lined up with you along the depth dies to
       the fold, and one lined up across it is a quarter turn away from the
       same thing.

       The first version of this never turned. It slid sideways, closing u
       in the one view it had, and waited for the hunter to wander into the
       column - which works, and which the owner watched and called out:
       rotating is the fun part of the game, and the film did not show it.

       So now it plays the way the fight is meant to be played. It WALKS to
       a square in the hunter's row - through depth, round the pillars, by a
       breadth-first search of the floor - and prefers the row it would have
       to TURN to use. Standing there hands the hunter a line and hands us
       the kill in the same instant; the ray goes down on the floor, the
       camera turns, the world folds. That race we win: bossAim() is well
       over a second, and a step, a turn and a fold are about half that.

       It resolves when the fold is away, so the caller can simply wait on
       it rather than guess how long a chase takes. */
    /* EVERY HIT ON US, COUNTED. A promo that shows the player losing a heart
       is a promo to re-shoot, and the first turning chase did exactly that
       while still printing "won". The driver prints this after each scene.
       bossHurt is a global function declaration, so wrapping it on window
       wraps every call the game makes to it. */
    window.vidHurt=0;
    if(typeof bossHurt==="function"){
      var realHurt=bossHurt;
      window.bossHurt=function(){ window.vidHurt++; return realHurt.apply(this,arguments); };
    }
    /* What the chase decided and why, with --log. The film shows the result;
       this says whether a turn happened, which on a symmetric arena a still
       frame cannot. */
    window.vidSay=function(what){
      if(!window.vidLogOn)return;
      var hs=hunters.map(function(h){return h.x+","+h.z+(h.lock>0?"*":"");}).join(" ");
      console.log("vid: "+(performance.now()/1000).toFixed(2)+"s view "+view
        +" me "+player.x+","+player.z+" pack "+hs+"  "+what);
    };
    var vidTurnDir=1;
    /* THE BEAT BEFORE THE KILL. The owner watched turn-and-fold land inside
       a third of a second and said it read as an insta-kill - the viewer
       never saw WHY it worked. So after the move that sets a kill up (a turn
       or the step into the lane) the chase holds VID_BEAT before folding,
       and the red line on the floor grows for all of it.

       This cannot lose the race, and the reason is exact: bossFoldCrush()
       runs INSIDE doFlatten(), at commit, not when the fold is drawn - so a
       fold pressed while the hunter still has any aim left kills it. The
       hold is cut short when an aimed hunter's lock gets down to VID_SAFE
       (game ms; FAST runs the lock 1.2x, so that is ~270ms of film). */
    var VID_BEAT=750, VID_SAFE=320, vidLastAct=0, vidKillAt=0;
    /* THE CHASE'S OWN PACE: a step every VID_STEP, and VID_TURN between a
       turn and the step it sets up. They were 200 and 480, which is a
       machine's pace - the owner watched the chase between the two
       phase-three kills and called it "lots of inputs in small duration".
       These are a quick human's. */
    var VID_STEP=420, VID_TURN=800;
    function vidMinLock(){
      var m=Infinity;
      for(var i=0;i<hunters.length;i++) if(hunters[i].lock>0)m=Math.min(m,hunters[i].lock);
      return m;
    }
    window.vidHunt=function(ms){
      return new Promise(function(resolve){
        var t0=Date.now();
        function crates(){ return (typeof liveCrates==="function")?liveCrates():[]; }
        /* Which way to turn so that folding kills h: 0 for "fold now", +1 or
           -1 for a quarter turn, null for no kill from here. A half turn
           looks down the same axis as no turn, so these three cover all four
           views. */
        function killTurn(p,h,cr){
          if(foldKills(R,view,p,h,cr))return 0;
          var a=vidTurnDir, b=-vidTurnDir;
          if(foldKills(R,(view+a+4)%4,p,h,cr))return a;
          if(foldKills(R,(view+b+4)%4,p,h,cr))return b;
          return null;
        }
        function hunterAt(x,z){
          for(var i=0;i<hunters.length;i++)
            if(hunters[i].x===x&&hunters[i].z===z&&hunters[i].y===player.y)return true;
          return false;
        }
        function near(x,z){
          for(var i=0;i<hunters.length;i++){
            var h=hunters[i];
            if(h.y===player.y&&Math.abs(h.x-x)+Math.abs(h.z-z)<=1)return true;
          }
          return false;
        }
        // Level ground only: floor under it, nothing in it, nobody on it.
        function walkable(x,z,cr){
          return R.solid(x,player.y-1,z,cr)&&!R.solid(x,player.y,z,cr)&&!hunterAt(x,z);
        }
        /* A charge from anybody but the one we are hunting. Its own line is
           the race we mean to win; anyone else's is just a way to die. */
        function threat(x,z,target,cr){
          var n=0, p={x:x,y:player.y,z:z};
          for(var i=0;i<hunters.length;i++){
            var h=hunters[i];
            if(h!==target&&bossLine(R,h,p,cr))n++;
          }
          return n;
        }
        function tick(){
          if(Date.now()-t0>ms){resolve("timeout");return;}
          if(typeof B==="undefined"||!B||!hunters||!hunters.length){resolve("clear");return;}
          if(bossPendingAdvance||bossPendingDeath){resolve("pending");return;}
          if(flat||bossHolding()||(typeof folding==="function"&&folding())){
            setTimeout(tick,90);return;}
          var cr=crates(), i;
          // The kill, if it is there - turning first if that is what it takes.
          for(i=0;i<hunters.length;i++){
            var k=killTurn(player,hunters[i],cr);
            if(k===0){
              /* The beat runs from whichever came last: our own move, or the
                 moment the kill first appeared (a hunter walking straight
                 into our column is a set-up too, and deserves the same). */
              if(!vidKillAt)vidKillAt=Date.now();
              if(Date.now()-Math.max(vidLastAct,vidKillAt)<VID_BEAT&&vidMinLock()>VID_SAFE){
                setTimeout(tick,30); return; }
              vidKillAt=0;
              vidSay("fold"); doFlatten(); resolve("fold"); return;
            }
          }
          vidKillAt=0;
          for(i=0;i<hunters.length;i++){
            var k2=killTurn(player,hunters[i],cr);
            if(k2!==null){
              vidSay("turn "+k2+" (lined up)"); rotateView(k2); vidTurnDir=-vidTurnDir;
              vidLastAct=Date.now();
              /* It walked into OUR lane, so it is already aiming: turn and
                 fold nearly together. The camera still visibly swings - the
                 fold starts while it is finishing - and the race stays ours. */
              setTimeout(tick,160); return;
            }
          }
          /* Otherwise walk. Breadth-first over the floor from where we stand;
             every square that would offer a kill on some hunter is a goal,
             scored by distance, by whether it needs the turn (it should - that
             is what the owner wants to see), and heavily by any OTHER
             hunter's line on it. Squares next to a hunter are out: its step
             onto you kills. */
          var start=player.x+","+player.z, prev={}, dist={}, q=[[player.x,player.z]];
          prev[start]=null; dist[start]=0;
          var best=null, bs=1e9;
          while(q.length){
            var c=q.shift(), key=c[0]+","+c[1], d=dist[key];
            if(d>0&&!near(c[0],c[1])){
              var p={x:c[0],y:player.y,z:c[1]};
              for(var j=0;j<hunters.length;j++){
                var h=hunters[j], kt=killTurn(p,h,cr);
                if(kt===null)continue;
                var sc=d+(kt===0?8:0)+100*threat(c[0],c[1],h,cr);
                if(sc<bs){bs=sc;best=key;}
              }
            }
            var steps=[[1,0],[-1,0],[0,1],[0,-1]];
            for(var s=0;s<4;s++){
              var nx=c[0]+steps[s][0], nz=c[1]+steps[s][1], nk=nx+","+nz;
              // Passing next to a hunter is allowed - it moves - stopping is not.
              if(nk in dist||!walkable(nx,nz,cr))continue;
              dist[nk]=d+1; prev[nk]=key; q.push([nx,nz]);
            }
          }
          /* NO KILL ON OFFER, SO SET ONE UP rather than stand still - the
             first log of this chase was a player frozen for a second at a
             time saying "no square to go to". BOSS I's pillars stand in rows
             1, 3 and 5 and columns 2, 4 and 6, and a fold from a lane with a
             pillar in it crushes you, so most lanes are cover and only the
             clean ones are kill lanes. So: go and stand where BOTH of your
             lanes are clean, two or three squares off the nearest hunter,
             out of everybody's line, and let it walk into one of them. */
          if(!best){
            var lure=null, ls=1e9;
            for(var lk in dist){
              var ld=dist[lk]; if(ld>5)continue;
              var lxy=lk.split(","), lx=+lxy[0], lz=+lxy[1];
              if(near(lx,lz)||threat(lx,lz,null,cr))continue;
              var nd=1e9;
              for(var m=0;m<hunters.length;m++)
                nd=Math.min(nd,Math.abs(hunters[m].x-lx)+Math.abs(hunters[m].z-lz));
              var dirty=(crushedBy(R,view,lx,player.y,lz,cr)?1:0)+
                        (crushedBy(R,(view+1)%4,lx,player.y,lz,cr)?1:0);
              var lsc=Math.abs(nd-3)*2+dirty*3+ld*0.5;
              if(lsc<ls){ls=lsc;lure=lk;}
            }
            if(!lure||lure===start){setTimeout(tick,120);return;}
            best=lure;
          }
          // Back up the path to its first step, and say it in this view's words.
          var at=best;
          while(prev[at]&&prev[at]!==start)at=prev[at];
          var xy=at.split(","), dx=+xy[0]-player.x, dz=+xy[1]-player.z;
          function dirName(){
            var r=AX[view].r, dp=AX[view].d;
            if(dx===r[0]&&dz===r[2])return "right";
            if(dx===-r[0]&&dz===-r[2])return "left";
            if(dx===-dp[0]&&dz===-dp[2])return "up";
            if(dx===dp[0]&&dz===dp[2])return "down";
            return null;
          }
          /* THE TURN COMES BEFORE THE STEP, NEVER AFTER. The hunter plants
             the frame you step into its row, and on FAST its aim is under a
             second; step-then-turn-then-fold ran past it often enough that
             the first take of this chase lost a heart on film. So when the
             next step IS the killing square and that square wants a turn,
             the turn is taken here, out of every line, and the step and the
             fold follow back to back. It is also how a good player does it. */
          if(at===best){
            var gp={x:+xy[0],y:player.y,z:+xy[1]}, gk=null;
            for(var g=0;g<hunters.length&&gk===null;g++)gk=killTurn(gp,hunters[g],cr);
            if(gk){
              vidSay("turn "+gk+" before stepping in"); rotateView(gk); vidTurnDir=-vidTurnDir;
              // Long enough to SEE the turn land before the step; the beat
              // before the fold starts again from the step.
              setTimeout(function(){
                var n2=dirName();
                if(n2){ press(n2); vidLastAct=Date.now(); }
                setTimeout(tick,60);
              },VID_TURN);
              return;
            }
          }
          var name=dirName();
          if(!name){setTimeout(tick,120);return;}
          vidSay(name+" toward "+best);
          press(name);
          if(at===best)vidLastAct=Date.now();
          setTimeout(tick,at===best?60:VID_STEP);
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
          /* STAND UP THE MOMENT THE GAME LETS YOU. Flat you are a whole
             column and every hunter that walks into it has a line on you,
             so the gap between a kill and the unfold is the most dangerous
             time in the fight. This polled at 300ms and then waited 900
             after the unfold, and a second hunter walked into the column in
             that gap and took a heart on film. */
          if(busy||bossHolding()){setTimeout(again,50);return;}
          if(flat){ vidSay("stand up"); doUnflatten(); setTimeout(again,450); return; }
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
       reads as a glitch; a short dip to black reads as an edit. It was
       .42s each way with a hold on the black, and the owner asked for the
       pace up: .25s each way now, and barely any black between. It is a
       plain overlay over everything, including the full-bleed cards. */
    var f=document.createElement("div");
    f.style.cssText="position:fixed;inset:0;background:#000;z-index:9999;"
      +"opacity:0;pointer-events:none;transition:opacity .25s linear";
    document.body.appendChild(f);
    window.vidFade=function(on){ f.style.opacity=on?"1":"0"; };
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
  const SPEED=arg("--speed")||"fast";
  if(["slow","regular","fast"].indexOf(SPEED)<0){
    console.error("--speed is slow, regular or fast"); process.exit(1); }
  const FPS=+(arg("--fps")||60);
  const S=SIZES[args.includes("--portrait")?"port":
                args.includes("--720")?"hd":"land"];
  const out=path.join(ROOT,S.out);
  fs.rmSync(out,{recursive:true,force:true});
  fs.mkdirSync(out,{recursive:true});
  const FF=findFfmpeg();

  const pw=loadPlaywright();
  /* HEADLESS, AND IT NO LONGER MATTERS HOW FAST THE PAGE IS. The frame rate
     of the film is set by the clock in tools/clock.js, not by the machine,
     so SwiftShader's slowness costs minutes of waiting and not a single
     dropped frame - and software GL draws the same picture everywhere, which
     would make one take comparable with the next. So the real GPU is the
     default, because it only changes how long the wait is - measured on the
     owner's MX230, 6.6 frames of work a second against SwiftShader's 3.1 -
     and --soft is there for a take that has to match another machine's. */
  const gl=args.includes("--soft")
    ? ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]
    : ["--ignore-gpu-blocklist","--enable-gpu-rasterization"];
  const browser=await pw.chromium.launch({args:gl.concat([
    "--autoplay-policy=no-user-gesture-required"]), headless:true});
  /* THE VIEWPORT IS THE FILM. Nothing but the page is in the frame - no
     window, no taskbar, no cursor - because the picture is a screenshot of
     the page, not of the screen. dpr is 1: the game lays out in CSS pixels,
     so 1920 wide is simply the desktop layout at full size. */
  const ctx=await browser.newContext({
    viewport:{width:S.vw,height:S.vh}, deviceScaleFactor:S.dpr,
    reducedMotion:"no-preference"});
  const page=await ctx.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  const LOG=args.includes("--log");
  if(LOG) page.on("console",m=>{ const t=m.text(); if(t.startsWith("vid: "))console.log("\r  "+t.slice(5)); });
  /* Same guard tools/shot.js keeps: the game asks for nothing over the
     network and a request creeping back in should break loudly here. */
  await page.route(/^https?:/,r=>r.abort());
  // The clock goes in FIRST, before any of the game can read the real one.
  await page.addInitScript(clockScript({fps:FPS}));
  await page.addInitScript((opt)=>{ try{
    /* THE OWNER'S OWN SETTINGS, because they are part of the take: hidden
       buttons, medium board, FAST fights, landing mark on. `ui` is "none"
       rather than "hidden" - the three values loadSettings() accepts are
       full / compact / none (js/06-persistence.js). seenStory1/2/3 keep the
       opening cutscene from playing over scene one.

       TEXT IS LARGE, and that one is the film's rather than the owner's. The
       game's type is set in fixed pixels, so at 1920 CSS px the HUD is the
       same 12px it is on a 360px phone - unreadable in a listing thumbnail.

       VOLUME IS UP because the soundtrack is rendered from the game's own
       audio; a muted save is a silent promo. volTouched is what makes a
       stored volume win at all (loadSettings, js/06-persistence.js). */
    localStorage.setItem("orthogonal:settings",JSON.stringify(
      {hintAsked:true,starAsked:true,volume:0.8,volTouched:true,
       ui:"none",size:"medium",speed:opt.speed,foldmark:"on",text:"large",
       seenStory1:true,seenStory2:true,seenStory3:true}));
    /* A SAVE WITH THE CAMPAIGN PART-FINISHED: the HUD has a star total on
       it, and nothingBehind() sends the sting to the HOME SCREEN rather than
       the age question. Progress is keyed by level NAME and an ordinary
       level's value is a move count, so these are nine cleared boards. */
    var p={"00 - First Steps":4,"00 - First Fold":7,"01 - On Your Own":9,
           "03 - Beware of Walls":11,"04 - A Real Challenge":13,
           "05 - The Shortcut":10,"06 - The Only Way":12,
           "07 - The Illusion":14,"08 - The Block":12};
    localStorage.setItem("orthogonal:progress",JSON.stringify(p));
  }catch(e){} },{speed:SPEED});

  const cdp=await ctx.newCDPSession(page);
  const DT=1000/FPS;

  /* ---- the camera --------------------------------------------------------
     tick() is one frame: step the page's clock, and if the film is rolling,
     photograph it and hand the JPEG to ffmpeg. JPEG at 95 rather than PNG
     because it is the one lossy step before x264's own and costs a tenth of
     the time to encode at 1080p; nobody can see q95 under a CRF 17 encode. */
  let ff=null, rolling=false, shot=null, nFrames=0, filmFrom=0, filmTo=0;
  const tStart=Date.now();
  async function tick(){
    await page.evaluate(()=>__cap.step());
    if(!rolling)return;
    const r=await cdp.send("Page.captureScreenshot",
      {format:"jpeg",quality:95,optimizeForSpeed:true});
    shot=Buffer.from(r.data,"base64");
    if(!ff.stdin.write(shot)) await new Promise(res=>ff.stdin.once("drain",res));
    nFrames++;
    if(nFrames%FPS===0){
      const film=nFrames/FPS, real=(Date.now()-tStart)/1000;
      process.stdout.write("\r       "+film.toFixed(0)+"s filmed  ·  "
        +(nFrames/Math.max(1,real-rollAt)).toFixed(1)+" frames/s of work   ");
    }
  }
  let rollAt=0;
  const pump=async ms=>{ for(let i=Math.round(ms/DT);i>0;i--) await tick(); };
  /* A WAIT ON THE GAME, in film time. The predicate is asked between frames,
     so it is true on the first frame it can be - and "timed out" means 25
     seconds of FILM passed, however long those took to draw. */
  async function until(expr,ms){
    for(let i=Math.round(ms/DT);i>0;i--){
      if(await page.evaluate(expr))return true;
      await tick();
    }
    return false;
  }
  /* A STEP THAT RETURNS A PROMISE cannot simply be awaited any more:
     vidFight() resolves when a hunter dies, a hunter dies on the page's
     clock, and the page's clock only moves when this side ticks it. Awaiting
     it would be both sides waiting for the other. So the step is started,
     its answer parked on window, and the frames run until it arrives. */
  async function run(src){
    await page.evaluate(s=>{
      window.__said=undefined; window.__done=false;
      Promise.resolve((0,eval)(s)).then(
        v=>{window.__said=v; window.__done=true;},
        e=>{window.__said="error: "+e; window.__done=true;});
    },src);
    // Nearly every step is synchronous and is done after one microtask.
    if(!(await page.evaluate(()=>window.__done)))
      await until("window.__done",60000);
    return page.evaluate(()=>window.__said);
  }

  await page.goto("file://"+path.join(ROOT,"index.html"));
  if(!(await until("typeof splashState!=='undefined'&&typeof renderer!=='undefined'",15000))){
    console.error("the game never booted"); await browser.close(); process.exit(1); }
  await pump(400);
  /* THE STING IS ONLY SKIPPED WHEN IT IS NOT IN THE CUT. It is scene one,
     so the full film wants it left ARMED, waiting to be tapped; a single
     `--scene boss` while tuning gets it ended here. */
  const scenes=only?[only]:ORDER;
  for(const n of scenes) if(!SCENES[n]){
    console.error("scenes: "+ORDER.join(", ")); await browser.close(); process.exit(1); }
  if(scenes[0]!=="open")
    await page.evaluate(()=>{ if(splashState!=="done"){splashState="running";splashEnd();} });
  await pump(400);
  await page.evaluate(pageHelpers(FOLD_LEVEL));
  if(LOG) await page.evaluate(()=>{ window.vidLogOn=true; });
  await page.evaluate(()=>vidFade(true));
  /* SETTLE BEHIND THE BLACK. warmScenery() and warmStats() build the
     sprite set and every par right after boot; on the clock that is free,
     but it still has to have HAPPENED before the first frame is filmed. */
  await pump(1500);

  const frames=args.includes("--frames");
  const fdir=path.join(ROOT,"store","frames");
  if(frames){ fs.rmSync(fdir,{recursive:true,force:true}); fs.mkdirSync(fdir,{recursive:true}); }
  let fn=0;
  const grab=tag=>{ if(frames&&shot)
    fs.writeFileSync(path.join(fdir,String(++fn).padStart(2,"0")+"-"+tag+".jpg"),shot); };

  /* ROLLING. The picture goes straight into x264 at a fixed 60 - there is
     no variable frame rate anywhere, because there was never a real-time
     recorder. The sound joins it afterwards. */
  const vtmp=path.join(out,"_picture.mp4"), atmp=path.join(out,"_sound.wav");
  ff=spawn(FF,["-y","-f","image2pipe","-framerate",String(FPS),"-c:v","mjpeg",
    "-i","-","-c:v","libx264","-preset","slow","-crf","17",
    "-pix_fmt","yuv420p","-movflags","+faststart",vtmp],
    {stdio:["pipe","ignore","ignore"]});
  const ffDone=new Promise(r=>ff.on("close",r));
  rolling=true; rollAt=(Date.now()-tStart)/1000;
  filmFrom=await page.evaluate(()=>__cap.now());

  const t0=nFrames;
  for(const name of scenes){
    const steps=SCENES[name];
    const fs0=nFrames;
    console.log("\rscene "+name+" ".repeat(40));
    // The scene is set up behind the black, then faded up.
    if(steps[0].do) await run(steps[0].do);
    await pump(100);
    await page.evaluate(()=>vidFade(false));
    await pump(steps[0].wait||900);
    grab(name+"-open");
    for(const st of steps.slice(1)){
      if(st.until){
        if(!(await until(st.until,25000)))
          console.error("\r  !! timed out waiting for "+st.until);
      }else if(st.do){
        /* WHAT THE STEP ANSWERED. vidHunt() and vidRun() both resolve with a
           word saying how they ended - "fold" is a kill, "pending" is a
           death waiting on a film, "timeout" is neither. */
        const said=await run(st.do);
        if(said!==undefined&&said!==null)
          console.log("\r       "+String(st.do).slice(0,22)+" -> "+said+" ".repeat(20));
      }
      await pump(st.wait||st.hold||600);
      grab(name+"-"+(st.do||st.until||"hold").replace(/[^a-z0-9]+/gi,"").slice(0,16));
    }
    await page.evaluate(()=>vidFade(true));
    await pump(270);        // the .25s fade, and not a frame of black after it
    const hurt=await page.evaluate(()=>{ const n=window.vidHurt||0; window.vidHurt=0; return n; });
    console.log("\r      "+((nFrames-fs0)/FPS).toFixed(1)+"s"
      +(hurt?"   !! the player was hit "+hurt+"x on film - re-shoot":"")+" ".repeat(40));
  }
  filmTo=await page.evaluate(()=>__cap.now());
  rolling=false;
  ff.stdin.end();
  await ffDone;
  console.log("film   "+((nFrames-t0)/FPS).toFixed(1)+"s  ·  "+nFrames+" frames in "
    +((Date.now()-tStart)/1000).toFixed(0)+"s of work");

  /* THE SOUNDTRACK, cut to exactly the frames that were filmed and handed
     over a megabyte at a time. */
  const snd=await page.evaluate(([a,b])=>__cap.soundtrack(a,b),[filmFrom,filmTo]);
  if(!snd.heard) console.error("!! the game never made a sound - the film is silent");
  if(snd.clipped) console.error("!! the film outran the sound buffer - raise audioSeconds in tools/clock.js");
  const parts=[];
  for(let at=0;at<snd.bytes;at+=1<<20)
    parts.push(Buffer.from(await page.evaluate(([a,l])=>__cap.wavChunk(a,l),[at,1<<20]),"base64"));
  fs.writeFileSync(atmp,Buffer.concat(parts));
  await ctx.close();
  await browser.close();

  const to=path.join(out,"promo.mp4");
  const mux=spawn(FF,["-y","-i",vtmp,"-i",atmp,"-map","0:v:0","-map","1:a:0",
    "-c:v","copy","-c:a","aac","-b:a","192k","-shortest",
    "-movflags","+faststart",to],{stdio:["ignore","ignore","ignore"]});
  const code=await new Promise(r=>mux.on("close",r));
  if(code!==0){ console.error("mux failed ("+code+")"); process.exit(1); }
  fs.rmSync(vtmp,{force:true}); fs.rmSync(atmp,{force:true});

  const kb=Math.round(fs.statSync(to).size/1024);
  console.log(path.relative(ROOT,to)+"  "+kb+" KB  "+S.vw*S.dpr+"x"+S.vh*S.dpr+" at "+FPS+"fps");
  const bad=errors.filter(e=>!/ERR_FAILED|ERR_CONNECTION|net::/.test(e));
  if(bad.length) console.error("page errors: "+bad.join(" | "));
}
main().catch(e=>{ console.error(e); process.exit(1); });
