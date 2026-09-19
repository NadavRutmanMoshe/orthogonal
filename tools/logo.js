#!/usr/bin/env node
/* The studio wordmark, as a picture.
 *
 *     node tools/logo.js              writes app/logo/*.png
 *     node tools/logo.js --word nadz  a different word, same cubes
 *
 * WHAT IT IS FOR: a profile picture. The same mark has to sit in a Google
 * account, a YouTube channel, an Instagram and a TikTok, and every one of
 * those crops a SQUARE to a CIRCLE and shows it small. So the output is
 * square, the word is centred with real margin round it, and there is a
 * wordmark-on-transparent version for anywhere that wants to put its own
 * background behind it.
 *
 * IT IS THE STING, PHOTOGRAPHED - NOT A REDRAWING OF IT. The logo already
 * exists: js/20-splash.js builds `nadaz` out of little 3D cubes from a 5x7
 * pixel font and folds them into the plane, and css/60-splash.css shades
 * their four faces. Drawing a second version here would be a second logo
 * that drifts from the first. This loads the real page, forces the sting to
 * its FOLDED state - the frame where the word has just landed and is at
 * full colour - and photographs the stage.
 *
 * WHY FOLDED AND NOT MID-FLIGHT. Scattered through depth the mark is
 * deliberately illegible; that is the joke the sting tells over two
 * seconds, and a still cannot tell it. A profile picture has to read at
 * 32px in a comment thread, so it gets the landing.
 *
 * The squares come out at 1024, which is over what any of those four asks
 * for (YouTube wants 800, the rest less) and downsizes cleanly.
 */
const path=require("path"), fs=require("fs");
const ROOT=path.join(__dirname,"..");
const OUT=path.join(ROOT,"app","logo");
const {loadPlaywright}=require("./playwright.js");

/* The card's own void, so the logo sits on the game's background rather
   than on a black anybody could have picked. It is SPLASH_VOID in
   js/20-splash.js and --void in css/00-base.css, which are the same colour
   on purpose. */
const VOID="#0f1424";
const SIZE=1024;
/* How much of the square the word fills across, and it is arithmetic
   rather than taste. Every one of these platforms crops the square to a
   CIRCLE, so the question is what the inscribed circle covers at the
   word's own height - and the word is short and sits on the centre line.
   At 100px either side of centre the circle is still sqrt(512^2-100^2) =
   502 wide, so .86 clears it with room, while .78 was leaving a margin
   against a crop that was never going to reach the word. Bigger matters:
   this is read at 32px in a comment thread. */
const FILL=.86;

async function main(){
  const args=process.argv.slice(2);
  const arg=n=>{ const i=args.indexOf(n); return i>=0?args[i+1]:null; };
  const word=arg("--word");
  const pw=loadPlaywright();
  const browser=await pw.chromium.launch({args:[
    "--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
  const ctx=await browser.newContext({viewport:{width:SIZE,height:SIZE},
    deviceScaleFactor:1, reducedMotion:"no-preference"});
  const page=await ctx.newPage();
  await page.route(/^https?:/,r=>r.abort());
  /* The word is read before splashBuild() runs, so an override has to be in
     place before the page's own inline splashShow() call. */
  if(word) await page.addInitScript(w=>{
    Object.defineProperty(window,"SPLASH_WORD",{value:w,writable:true});
  },word);
  await page.goto("file://"+path.join(ROOT,"index.html"));
  await page.waitForFunction(()=>typeof splashState!=="undefined");
  await page.waitForTimeout(400);

  /* Fold it, and strip the card down to the mark PLUS its rule.

     `fold` lands the cubes; `hit` is the class that draws the line under
     them - .srule is a 1px gradient that grows to the wordmark's own width
     (cols * c) once the fold arrives, and the sting's comment calls it "the
     plane the cubes land in, said once and quietly". It is half the logo:
     without it the mark is a word, with it the word is standing on
     something, which is the game.

     The prompt goes because "tap to fold" is an instruction to a player and
     this is a profile picture. The bloom goes because it is a .44s flash
     that ends at opacity 0 - keeping it only risks catching it mid-frame. */
  await page.evaluate(()=>{
    var el=document.getElementById("splash");
    el.classList.add("on","fold","hit");
    splashState="running";
    var p=document.getElementById("splashPrompt"); if(p)p.remove();
    document.querySelectorAll(".sbloom").forEach(n=>n.remove());
    /* THE RULE IS SCALED TO THE MARK, NOT LEFT AT 1px. On the card it is a
       hairline and it works, because it ARRIVES - it grows to width over
       520ms and motion is what makes a thin line register. A still has no
       motion to spend, so at this size the same 1px came out as a smudge
       you had to be told was there. Tied to --c (the cube size) so it holds
       at any output size, and taken to the card's own white - the bloom's
       rgba(232,242,255) - rather than --fg-dim, because "the white line" is
       what it reads as and what it was asked for. */
    var r=document.querySelector(".srule");
    if(r){
      r.style.height="calc(var(--c) * .13)";
      r.style.background=
        "linear-gradient(90deg,transparent,#e8f2ff 22%,#e8f2ff 78%,transparent)";
      r.style.marginTop="calc(var(--c) * 1.5)";
    }
  });
  // The cubes travel on a CSS transition; SPLASH_FOLD is 980ms.
  await page.waitForTimeout(1500);

  fs.mkdirSync(OUT,{recursive:true});
  /* The mark is the stage AND the rule under it, so the framing has to be
     the union of the two. Centring on the stage alone hangs the line off
     the bottom and puts the whole thing high in the square - which a
     circular crop then makes obvious. */
  async function markBox(){
    const b=await page.evaluate(()=>{
      var r=[".sstage",".srule"].map(function(sel){
        var n=document.querySelector(sel); if(!n)return null;
        var q=n.getBoundingClientRect();
        return {l:q.left,t:q.top,r:q.right,b:q.bottom};
      }).filter(Boolean);
      var l=Math.min.apply(null,r.map(q=>q.l)), t=Math.min.apply(null,r.map(q=>q.t));
      var rr=Math.max.apply(null,r.map(q=>q.r)), bb=Math.max.apply(null,r.map(q=>q.b));
      return {x:l,y:t,width:rr-l,height:bb-t};
    });
    return b;
  }
  const stage=await page.$(".sstage");
  const box=await markBox();
  /* Scale the page so the wordmark fills FILL of the square, then shoot the
     square centred on it. Zooming the whole document rather than the stage
     keeps the cubes' 3D transforms intact - scaling a preserve-3d subtree
     is what flattens it, which is the same trap the sting's own comments
     record about opacity. */
  const zoom=(SIZE*FILL)/box.width;
  await page.evaluate(z=>{ document.documentElement.style.zoom=z; },zoom);
  await page.waitForTimeout(250);
  const b2=await markBox();
  const clip={x:b2.x+b2.width/2-SIZE/2, y:b2.y+b2.height/2-SIZE/2,
              width:SIZE, height:SIZE};

  async function shoot(name,bg){
    await page.evaluate(c=>{
      document.documentElement.style.background=c||"transparent";
      document.body.style.background=c||"transparent";
      var el=document.getElementById("splash");
      el.style.background=c||"transparent";
    },bg);
    await page.waitForTimeout(120);
    const f=path.join(OUT,name);
    await page.screenshot({path:f,clip,omitBackground:!bg});
    console.log(path.relative(ROOT,f));
  }
  /* The spelling goes in the filename when it is not the studio's own, so
     `nadaz` and a channel's `nadz` can sit side by side and be compared
     rather than one overwriting the other. */
  const suf=word?("-"+word):"";
  await shoot("logo-1024"+suf+".png",VOID);
  await shoot("logo-1024"+suf+"-clear.png",null);
  await browser.close();
}
main().catch(e=>{ console.error(e); process.exit(1); });
