#!/usr/bin/env node
/* The store screenshot set, as a list rather than as eight things to
 * remember.
 *
 *     node tools/store.js              writes store/play/*.png  (1080x1920)
 *     node tools/store.js --ios        the iPhone size         (1290x2796)
 *     node tools/store.js --tablet     Play's tablet slots     (1200x1920)
 *     node tools/store.js --only 02    just one shot, while tuning it
 *     node tools/store.js --all-spares including the ninth, which Play has
 *                                      no room for
 *
 * WHY THIS EXISTS. `tools/shot.js` can already take any screen at any size,
 * so the set was eight command lines with the right level indices, the right
 * --eval and the right --wait in them. That is fine once and useless the
 * second time: change the HUD and the set has to be re-taken, and nobody
 * remembers that the trial shot needs 3.4 seconds of settle or the falling
 * blocks are still in the air. The list below is the memory.
 *
 * THE ORDER IS THE PITCH, and it is why the files are numbered. Play shows
 * them in upload order and most people see the first two and stop:
 *
 *   01  a world with depth in it          the setup
 *   02  THE SAME LEVEL, FOLDED            the verb, and the only image that
 *                                         explains the game without words
 *   03..08                                that the game keeps going
 *
 * 01 and 02 are deliberately the same board from the same camera, because
 * the pair IS the mechanic: the water column and the depth are gone and the
 * nine squares are one row. Change one of them and change the other.
 *
 * Level 36 is picked by measurement, not taste - it is the only non-boss,
 * non-trial level with three kinds of block, six cells of depth and enough
 * blocks to fill a portrait frame.
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
  play:{w:360, h:640, dpr:3, out:"store/play"},      // 1080x1920
  /* iPhone 6.7": 1290x2796 is 430 at dpr 3. */
  ios: {w:430, h:932, dpr:3, out:"store/ios"},       // 1290x2796
  /* Play's tablet slots. Only needed if the listing claims tablet support;
     400 CSS px is a wide phone, which is what a 7" tablet is to this
     layout - the panels cap at 560px, so nothing stretches. */
  tablet:{w:400, h:640, dpr:3, out:"store/tablet"}   // 1200x1920
};

/* Each shot: the file's number and name, the shot.js screen, and whatever it
   takes to reach the moment. `wait` is settle time - a clock level needs
   enough of it that the thing the shot is about has actually happened. */
const SHOTS=[
  {n:"01-volume",   screen:"level:36"},
  {n:"02-folded",   screen:"flat:36"},
  {n:"03-fire",     screen:"level:21"},
  {n:"04-boss",     screen:"boss"},
  /* TRIAL IV, three seconds in: the curtain of falling blocks is the
     picture, and it is not in the air before then. */
  {n:"05-trial",    screen:"trial", eval:"lv(43)", wait:3400},
  {n:"06-map",      screen:"map:3"},
  /* The opening cutscene, beat 2: the house, and the family outside it. The
     only shot that says what the game is ABOUT rather than how it plays. */
  {n:"07-home",     screen:"story1:2"},
  {n:"08-wardrobe", screen:"wardrobe"},
  /* Held back because Play takes eight. The neighbour is the charmer of the
     set; swap him in for 08 if the wardrobe reads as a shop. */
  {n:"09-guide",    screen:"guide", spare:true}
];

function main(){
  const args=process.argv.slice(2);
  const only=(()=>{ const i=args.indexOf("--only"); return i>=0?args[i+1]:null; })();
  const size=SIZES[args.includes("--ios")?"ios":args.includes("--tablet")?"tablet":"play"];
  const all=args.includes("--all-spares");
  const out=path.join(ROOT,size.out);
  fs.mkdirSync(out,{recursive:true});

  for(const s of SHOTS){
    if(only ? !s.n.startsWith(only) : (s.spare&&!all)) continue;
    const a=[SHOT,s.screen,"--w",size.w,"--h",size.h,"--dpr",size.dpr,"--out",size.out];
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
  console.log(`\n${size.w*size.dpr}x${size.h*size.dpr} - Play takes at least 2 and at most 8 per slot.`);
}
main();
