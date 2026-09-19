#!/usr/bin/env node
/* Play's feature graphic, 1024x500, drawn rather than painted.

     node tools/feature.js            writes app/icon/feature-*.png
     node tools/feature.js --variant B   just one of them

   MANDATORY, AND THE ONE ASSET A SCREENSHOT CANNOT BE: Play puts this at the
   top of the store listing and crops it hard in places, so it has to carry
   the NAME and survive being cut about. It is the only artwork in this
   project that needs a logotype, and the reason it waited for last.

   IT IS THE ICON'S OWN SCENE, WIDE. Same boss arena, same seam, same three
   fixed colours (tools/icon.js), because the icon and this sit next to each
   other on the listing and two different pictures would read as two games.
   The scene is drawn square at 1024 and cropped to the middle band: the
   arena sits across the middle of the square, so the crop keeps it and loses
   only sky.

   THE NAME IS SET ON THE PAGE SIDE, IN INK. The left of the picture is the
   world folded flat - a lit page - and the game's own flat theme sets type on
   that paper in --ink #1a1c2b. So the title is not a caption over a
   screenshot, it is the thing this game does to a world, with the name
   printed on the result. The right half stays dark and keeps the hunter,
   which is the half a thumbnail crop tends to keep.

   THE TYPEFACE IS THE GAME'S, and it is already in the repo as base64 woff2
   (css/05-fonts.css, which is why the game makes no outbound request). This
   reads that file rather than asking Google for the same font, so the store
   page and the game are set in the same metal. */
const fs=require("fs"), path=require("path");
const ROOT=path.join(__dirname,"..");
const OUT=path.join(ROOT,"app","icon");
const {scene,VARIANTS,palette,SHIP,loadPlaywright}=require("./icon.js");

const W=1024, H=500;

/* The two faces the game uses, lifted out of the stylesheet whole. Nothing is
   downloaded; @font-face blocks carry their own base64. */
function fontCss(){
  const css=fs.readFileSync(path.join(ROOT,"css","05-fonts.css"),"utf8");
  return css.match(/@font-face\{[^}]*\}/g).join("\n");
}

/* WHAT IT SAYS. The name, and the intro card's own first line under it -
   the one sentence the game uses to explain itself to somebody who has never
   played, which is exactly this graphic's job too. Nothing is invented here;
   a store page that promises something in words the game never says is how a
   listing and a game come apart. */
const TITLE="I'm Just A Cube";
const LINE="A cube, a world, and one verb.";

/* Three arrangements, because this is the one asset with no right answer in
   the code: the type can sit on the page, over the dark, or across both. */
/* THE ART IS PULLED BACK AND PUSHED ASIDE, because the icon's framing is a
   close-up: it centres the cast in a SQUARE, and a square's worth of arena
   in a 1024x500 strip fills the strip. At the icon's own zoom the title
   landed across the cube in one layout and across the hunter in the other.
   `zoom` shrinks the cast (the sky, the page and the seam stay full bleed,
   so the fold still runs edge to edge) and `dx` slides it away from the
   type. The type then sits on empty page, which is what the whole
   composition is for. */
const LAYOUTS={
  /* A: the name printed on the folded page, left, in ink. The default. */
  A:{align:"left", ink:true, scrim:0, zoom:.42, dx:288},
  /* B: the name on the dark side, in cream, with the page carrying the
     picture. The inverse, for a listing that sits on a light background. */
  B:{align:"right", ink:false, scrim:0, zoom:.42, dx:-236},
  /* C: centred across the seam in cream over a scrim - the safest under
     Play's own cropping, and the least interesting to look at. */
  C:{align:"center", ink:false, scrim:.38, zoom:.66, dx:0}
};

function html(L,V){
  const C=palette();
  const ink="#1a1c2b", cream="#f2ece0";
  const col=L.ink?ink:cream;
  /* The square scene, pulled up so its middle band fills the strip, and slid
     sideways so the cast clears the type. It is drawn WIDER than the strip
     and offset by half the excess, so sliding it never uncovers an edge. */
  const over=Math.abs(L.dx)*2;
  const art=`<div style="position:absolute;inset:0;overflow:hidden">
      <div style="position:absolute;left:${L.dx-over/2}px;top:${-(W+over-H)/2}px;
                  width:${W+over}px;height:${W+over}px">
        ${scene({...V,zoom:L.zoom},W+over,"feat")}
      </div>
    </div>`;
  const scrim=L.scrim
    ? `<div style="position:absolute;inset:0;background:rgba(10,6,10,${L.scrim})"></div>`
    : "";
  /* Type sits in from the edge by 7% - Play crops this graphic and anything
     closer to the edge is the first thing to go. */
  const pad=Math.round(W*.07);
  const box=L.align==="center"
    ? `left:0;right:0;text-align:center;align-items:center`
    : L.align==="right"
      ? `right:${pad}px;text-align:right;align-items:flex-end`
      : `left:${pad}px;text-align:left;align-items:flex-start`;
  const shadow=L.ink
    ? "0 1px 0 rgba(255,255,255,.35)"
    : "0 2px 18px rgba(0,0,0,.55)";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${fontCss()}
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:${W}px;height:${H}px;overflow:hidden;background:${C.skyBot}}
  </style></head><body>
    <div style="position:relative;width:${W}px;height:${H}px">
      ${art}${scrim}
      <div style="position:absolute;top:0;bottom:0;${box};display:flex;
                  flex-direction:column;justify-content:center;gap:14px">
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;
                    font-size:68px;letter-spacing:-.035em;line-height:1;
                    color:${col};text-shadow:${shadow}">${TITLE}</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-weight:500;
                    font-size:21px;letter-spacing:.02em;
                    color:${col};opacity:.82">${LINE}</div>
      </div>
    </div>
  </body></html>`;
}

async function main(){
  const args=process.argv.slice(2);
  const arg=n=>{ const i=args.indexOf(n); return i>=0?args[i+1]:null; };
  const only=arg("--variant");
  const V=VARIANTS[SHIP];
  const {chromium}=loadPlaywright();
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
  fs.mkdirSync(OUT,{recursive:true});
  for(const name of Object.keys(LAYOUTS)){
    if(only&&only!==name)continue;
    await page.setContent(html(LAYOUTS[name],V));
    await page.waitForTimeout(150);          // the woff2 faces decode
    const file=path.join(OUT,`feature-${name}.png`);
    await page.screenshot({path:file,clip:{x:0,y:0,width:W,height:H}});
    console.log(path.relative(ROOT,file));
  }
  await browser.close();
}
main().catch(e=>{ console.error(e); process.exit(1); });
