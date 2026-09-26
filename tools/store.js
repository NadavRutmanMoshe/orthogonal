#!/usr/bin/env node
/* The store screenshot set, as a list rather than as ten things to remember.
 *
 *     node tools/store.js              writes shots/play/*.png   (1080x1920)
 *     node tools/store.js --ios        the iPhone size          (1290x2796)
 *     node tools/store.js --ipad       the iPad 13" size        (2064x2752)
 *     node tools/store.js --tablet     Play 7" tablet slot      (1200x1920)
 *     node tools/store.js --tab10      Play 10" tablet slot     (1600x2560)
 *     node tools/store.js --steam      Steam, the computer version (1920x1080)
 *     node tools/store.js --only 02    just one shot, while tuning it
 *     node tools/store.js --all-spares including any held back
 *
 * WHY THIS EXISTS. `tools/shot.js` can already take any screen at any size,
 * so the set was ten command lines with the right level indices, the right
 * --eval and the right --wait in them. That is fine once and useless the
 * second time: change the HUD - or the blocks, or a sting's timing - and the
 * set has to be re-taken, and nobody remembers that the SMASHED shot has to
 * land in the 660ms between the word appearing and the kill cam covering it.
 * The list below is the memory.
 *
 * THE ORDER IS THE PITCH, and it is why the files are numbered. Play shows
 * them in upload order and most people see the first two and stop:
 *
 *   01  a board with a gap that cannot be walked   the setup
 *   02  THE SAME BOARD, FOLDED                     the verb, and the only
 *                                                  image that explains the
 *                                                  game without words
 *   03..10                                         that the game keeps going
 *
 * 01 and 02 are deliberately the same board from the same camera with the
 * same two steps walked, because the pair IS the mechanic: the gap is gone
 * and the spur that was out in depth is simply the next square along. Change
 * one of them and change the other.
 *
 * PLAY TAKES AT MOST EIGHT per slot and this list is ten, on the owner's
 * call: all ten are generated and numbered, and the eight to upload are
 * picked in the Console. Nothing here is marked `spare`.
 *
 * WHERE THEY LAND. `shots/`, beside everything else tools/shot.js writes,
 * rather than the `store/` they used to go to - one folder for stills, and
 * one fewer place to look. `store/` is still where the moving pictures and
 * the working frames go (tools/video.js).
 */
const {execFileSync}=require("child_process");
const path=require("path"), fs=require("fs");
const ROOT=path.join(__dirname,"..");
const SHOT=path.join(__dirname,"shot.js");

/* 1080x1920 is Play's phone size. It is taken as 360 CSS px at dpr 3 rather
   than 540 at dpr 2: both land on 1080, but 540 CSS px is a tablet as far as
   the layout is concerned and the shot would not look like a phone. 360 is
   near the owner's own 327. */
const SIZES={
  play:{w:360, h:640, dpr:3, out:"shots/play"},      // 1080x1920
  /* iPhone 6.7": 1290x2796 is 430 at dpr 3. */
  ios: {w:430, h:932, dpr:3, out:"shots/ios"},       // 1290x2796
  /* THE IPAD SLOT IS NOT OPTIONAL FOR THIS APP. App Store Connect asks for
     13-inch iPad shots from anything whose device family includes iPad, and
     ours does (TARGETED_DEVICE_FAMILY = "1,2", app/README.md) - so this is a
     required upload, not a nice-to-have like Play's tablet slots.

     1032x1376 at dpr 2 is 2064x2752, the 13" iPad Pro exactly, and it is a
     real iPad's CSS size rather than a number that multiplies to the right
     picture - the same rule as the two Play tablet slots below. 2048x2732
     (the older 12.9", 1024x1366) is also accepted; 1032 is the current one
     and Apple scales down, never up. */
  ipad: {w:1032, h:1376, dpr:2, out:"shots/ipad"},   // 2064x2752
  /* Play's two tablet slots. THE CSS WIDTH IS THE POINT, not the pixel
     count: 1200x1920 can be reached as 400 CSS px at dpr 3, and that is a
     wide PHONE as far as this layout is concerned - the shot would come out
     looking like the phone set and would hide every bug a real tablet has.
     A 7" tablet is about 600 CSS px across and a 10" about 800, so those are
     the viewports and dpr 2 carries them to Play's sizes. */
  tab7: {w:600, h:960,  dpr:2, out:"shots/tablet7"},  // 1200x1920
  tab10:{w:800, h:1280, dpr:2, out:"shots/tablet10"}, // 1600x2560
  /* STEAM IS THE COMPUTER VERSION, not a big phone: the key strip, the zoom
     (1.5 at 1080p), no on-screen bar, and the Steam grant - so the wardrobe
     shows every shape owned, which on Steam is true. 1920x1080 at dpr 1 is
     a real 1080p monitor, the size Valve recommends and most players have.
     `flags` go to shot.js as they are. */
  steam:{w:1920, h:1080, dpr:1, out:"shots/steam/screens", flags:["--steam"]}
};

/* Each shot: the file's number and name, the shot.js screen, and whatever it
   takes to reach the moment. `wait` is settle time - a clock level needs
   enough of it that the thing the shot is about has actually happened.

   Most of these are a bare screen name because the reaching has been pushed
   down into tools/shot.js, where it belongs: a screen that needs a hunter
   posed or a cutscene seeking to a beat is a screen, not an --eval. */
const SHOTS=[
  /* THE PAIR. The fold tutorial in FIRE colours - PROLOGUE, where that board
     actually lives, is the greyest palette in the game, and a store listing
     does not get a second chance at its first picture. tools/foldlevel.js
     holds the board and says why; tools/video.js opens on the same one, so
     the listing and the promo are the same level. */
  {n:"01-fold-3d",  screen:"firefold"},
  {n:"02-fold-2d",  screen:"fireflat"},
  /* WHAT THE GAME IS, once the verb has been shown: a home screen with a
     cube on a plinth, and the three things it does. */
  {n:"03-home",     screen:"home"},
  /* THE FIGHT, in three pictures rather than one, because a fight is the
     half of this game a puzzle screenshot cannot suggest at all: the arena,
     then each of the two words it can end on. */
  {n:"04-boss",     screen:"boss"},
  {n:"05-smashed",  screen:"smashed"},
  {n:"06-crushed",  screen:"crushed"},
  /* THE CLOCK. TRIAL I, a second in - the hearts, the goal count and the
     sweep's telegraph across one slice.

     TRIAL IV is the other candidate and was the set's trial for a while:
     `{screen:"trial", eval:"lv(43)", wait:3400}` gives the curtain of
     falling blocks, which is a louder picture. It went back to TRIAL I on
     the owner's call - the curtain reads as scenery until you know what it
     is, and the metronome's single lit slice reads as a threat immediately. */
  {n:"07-trial",    screen:"trial"},
  /* THE STORY, in the two beats that are the whole of it: the fold that
     takes his parents, and what he says about it. Beat numbers are array
     indices into STORY.open.beats (js/22-story.js) and MOVE when a beat is
     added or cut - if either of these comes out as the wrong moment, that is
     why, and `node tools/shot.js --list` explains the seek.

     08 IS SEEKED TO 13 AND THEN LET RUN, which is why it carries a wait
     rather than a beat number of its own. Beat 14 is the take and seeking
     straight to it arrives after the event: storySeek() runs a beat's `at()`
     in line, so the ash is emitted and decayed before the first frame is
     drawn and the picture is four cubes that are simply absent. Seeking to
     13 - the fold - and waiting 1400ms lets beat 14 arrive on the timeline
     the way it does in play, with the burst still in the air. That is the
     difference between a photograph of them vanishing and one of them
     having vanished. */
  {n:"08-taken",    screen:"story1:13", wait:1400},
  {n:"09-myparents",screen:"story1:16"},
  /* AND THAT THERE IS SOMETHING TO SPEND STARS ON. Last because it is the
     only shot that is about the economy rather than the game. */
  {n:"10-wardrobe", screen:"wardrobe"}
];

function main(){
  const args=process.argv.slice(2);
  const only=(()=>{ const i=args.indexOf("--only"); return i>=0?args[i+1]:null; })();
  const size=SIZES[args.includes("--ios")?"ios":args.includes("--ipad")?"ipad":
                   args.includes("--tab10")?"tab10":args.includes("--tablet")?"tab7":
                   args.includes("--steam")?"steam":"play"];
  /* The two stores count differently, and the footer is the only place that
     says how many of these to actually upload. Apple takes up to TEN per
     display size and needs at least one; Play takes eight and needs two. */
  const apple=size===SIZES.ios||size===SIZES.ipad;
  const all=args.includes("--all-spares");
  const out=path.join(ROOT,size.out);
  fs.mkdirSync(out,{recursive:true});

  for(const s of SHOTS){
    if(only ? !s.n.startsWith(only) : (s.spare&&!all)) continue;
    const a=[SHOT,s.screen,"--w",size.w,"--h",size.h,"--dpr",size.dpr,"--out",size.out];
    if(size.flags) a.push(...size.flags);
    if(s.eval) a.push("--eval",s.eval);
    if(s.wait) a.push("--wait",s.wait);
    execFileSync(process.execPath,a.map(String),{cwd:ROOT,stdio:["ignore","pipe","inherit"]});
    /* shot.js names the file after the screen; the set wants it numbered, so
       the upload order is the order on disk. */
    const from=path.join(out,s.screen.replace(/[:]/g,"-")+".png");
    const to=path.join(out,s.n+".png");
    fs.renameSync(from,to);
    console.log(path.relative(ROOT,to));
  }
  console.log(`\n${size.w*size.dpr}x${size.h*size.dpr} - ` + (apple
    ? `App Store Connect takes up to 10 per display size, and this set is ${SHOTS.length}. Upload all of them.`
    : size===SIZES.steam
    ? `Steam needs at least 5 and shows them in upload order; this set is ${SHOTS.length}. Upload all of them.`
    : `Play takes at least 2 and at most 8 per slot, and this set is ${SHOTS.length}.`));
}
main();
