#!/usr/bin/env node
/* Steam's store and library art, drawn - every size Steamworks asks for.

     node tools/steamart.js            writes shots/steam/art/*.png (+ .ico)
     node tools/steamart.js --only header   just one, while tuning it

   ONE PICTURE, EIGHT SHAPES. It is Play's feature graphic (tools/feature.js,
   whose bannerHtml() draws every one of these) which is the app icon's scene
   drawn wide (tools/icon.js): the cube folded flat on the page side, the
   hunter deep on the volume side, the seam between. So the icon, the Play
   banner and every Steam capsule are the same drawing and read as one game.

   WHAT STEAM ALLOWS ON THEM, which is why they carry the name and nothing
   else: the capsules must show the game's name (the logo) and may not carry
   review quotes, awards, prices or "sale" - and the library HERO may carry
   no text at all, because the client lays the separate LOGO over it. Both
   are here: `hero` draws no type, and `logo` is the name alone on
   transparency.

   THE SIZES are Valve's current ones (the 2024 capsule update doubled the
   old 460x215 / 231x87 / 616x353 and added the vertical capsule).

   Written to shots/steam/art/, beside the Steam screenshot set that
   `node tools/store.js --steam` writes to shots/steam/screens/. Gitignored
   like everything under shots/: it regenerates from the commit. */
const fs=require("fs"), path=require("path");
const ROOT=path.join(__dirname,"..");
const OUT=path.join(ROOT,"shots","steam","art");
const {bannerHtml,fontCss,TITLE}=require("./feature.js");
const {VARIANTS,SHIP,loadPlaywright}=require("./icon.js");

/* Each: the size, and a layout for bannerHtml() (see its comment for the
   fields). The wide ones are Play's layout A - the name printed in ink on
   the folded page, the cast slid right onto the seam - scaled: `size`
   (type px), `dx` (the cast's slide, px) and `zoom` were tuned by eye per
   shape, because a 2.7:1 strip and a 1.75:1 panel do not want the same
   amount of cast. */
const ART={
  /* The one on the store page, in search and on the front page. The most
     seen picture Steam has of the game. */
  header:  {w:920,  h:430,  L:{align:"left", ink:true, zoom:.42, dx:262, size:62}},
  /* Big, on the front page's featured shelves. Taller, so more sky. */
  main:    {w:1232, h:706,  L:{align:"left", ink:true, zoom:.40, dx:348, size:84}},
  /* Tiny, in lists and "more like this" rows. Valve's rule for this one is
     that the name should nearly fill it; at 462x174 there is no room for the
     name AND the cast beside it, so the cast goes behind, under a scrim, the
     way Play's layout C does. */
  small:   {w:462,  h:174,  L:{align:"center", ink:false, scrim:.58, zoom:.62, dx:0, size:56}},
  /* Tall: the front page's seasonal shelves (vertical) and the player's own
     library grid (library). The seam runs down the middle and the type has
     to cross it, so it sits at the top over a dark veil, in two lines. */
  vertical:{w:748,  h:896,  L:{align:"center", ink:false, zoom:.66, dx:0, dy:70,
                              size:104, lines:["I'm Just","A Cube"], valign:"top", veil:.46}},
  library: {w:600,  h:900,  L:{align:"center", ink:false, zoom:.58, dx:0, dy:80,
                              size:92, lines:["I'm Just","A Cube"], valign:"top", veil:.44}},
  /* The library page's banner, behind the logo. NO TYPE, by Valve's rule.
     The client crops it hard at the sides on narrow windows and lays the
     logo over the lower left, so the cast sits in the middle third. */
  hero:    {w:3840, h:1240, L:{align:"center", title:false, zoom:.36, dx:0}}
};

/* The logo: the name alone, cream with a dark edge so it reads on the
   hero's light page AND its dark volume - Steamworks lets the owner move
   it, so it cannot count on either side. Cropped tight to the type, then
   scaled until it is 1280 wide or 720 tall, whichever comes first, which
   is what Valve asks for. */
function logoHtml(size){
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${fontCss()}
    *{margin:0;padding:0}
    html,body{background:transparent}
    #t{display:inline-block;padding:${Math.round(size*.12)}px ${Math.round(size*.14)}px;
       font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:${size}px;
       letter-spacing:-.035em;line-height:1;white-space:nowrap;color:#f2ece0;
       text-shadow:0 ${Math.round(size*.03)}px ${Math.round(size*.08)}px rgba(10,6,10,.9),
                   0 0 ${Math.round(size*.02)}px rgba(10,6,10,.9)}
  </style></head><body><div id="t">${TITLE}</div></body></html>`;
}

/* An .ico is a directory of images, and every one of them may be a PNG, so
   this is a header and some PNG files glued together - no image library.
   Steamworks' "Client Icon" wants one, for the desktop shortcut. */
function icoFrom(pngs){
  const head=Buffer.alloc(6), dir=Buffer.alloc(16*pngs.length);
  head.writeUInt16LE(0,0);head.writeUInt16LE(1,2);head.writeUInt16LE(pngs.length,4);
  let off=6+dir.length;
  pngs.forEach(([sz,buf],i)=>{
    const d=i*16;
    dir.writeUInt8(sz>=256?0:sz,d);dir.writeUInt8(sz>=256?0:sz,d+1);
    dir.writeUInt8(0,d+2);dir.writeUInt8(0,d+3);
    dir.writeUInt16LE(1,d+4);dir.writeUInt16LE(32,d+6);
    dir.writeUInt32LE(buf.length,d+8);dir.writeUInt32LE(off,d+12);
    off+=buf.length;
  });
  return Buffer.concat([head,dir,...pngs.map(p=>p[1])]);
}

async function main(){
  const args=process.argv.slice(2);
  const only=(()=>{ const i=args.indexOf("--only"); return i>=0?args[i+1]:null; })();
  const want=n=>!only||only===n;
  const V=VARIANTS[SHIP];
  const {chromium}=loadPlaywright();
  const browser=await chromium.launch();
  const page=await browser.newPage({deviceScaleFactor:1});
  fs.mkdirSync(OUT,{recursive:true});
  const done=[];

  for(const [name,a] of Object.entries(ART)){
    if(!want(name))continue;
    await page.setViewportSize({width:a.w,height:a.h});
    await page.setContent(bannerHtml(a.L,V,a.w,a.h));
    await page.waitForTimeout(200);            // the woff2 faces decode
    const file=path.join(OUT,`${name}-${a.w}x${a.h}.png`);
    await page.screenshot({path:file,clip:{x:0,y:0,width:a.w,height:a.h}});
    done.push(file);
  }

  if(want("logo")){
    /* Set big, measured, then scaled into 1280x720 by the browser itself -
       a transparent screenshot of an element keeps its alpha. */
    await page.setViewportSize({width:2400,height:600});
    await page.setContent(logoHtml(200));
    await page.waitForTimeout(200);
    const b=await page.$eval("#t",e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height};});
    const k=Math.min(1280/b.w,720/b.h);
    await page.setViewportSize({width:Math.ceil(b.w*k)+4,height:Math.ceil(b.h*k)+4});
    await page.setContent(logoHtml(Math.floor(200*k)));
    await page.waitForTimeout(200);
    const file=path.join(OUT,"logo.png");
    await (await page.$("#t")).screenshot({path:file,omitBackground:true});
    done.push(file);
  }

  if(want("icon")){
    /* The community icon (184x184, shown beside the name in Steam's
       community pages) and the client icon (.ico, the desktop shortcut) are
       the APP ICON, the same picture the phones show. Scaled by the browser
       from the 1024 master tools/icon.js writes. */
    const src=path.join(ROOT,"app","icon","icon-1024.png");
    const b64=fs.readFileSync(src).toString("base64");
    async function scaled(sz){
      await page.setViewportSize({width:sz,height:sz});
      await page.setContent(`<html><body style="margin:0;background:transparent">
        <img src="data:image/png;base64,${b64}" width="${sz}" height="${sz}" style="display:block"></body></html>`);
      await page.waitForTimeout(50);
      return page.screenshot({clip:{x:0,y:0,width:sz,height:sz},omitBackground:true});
    }
    const comm=path.join(OUT,"community-icon-184x184.png");
    fs.writeFileSync(comm,await scaled(184));
    const ico=path.join(OUT,"client-icon.ico");
    const set=[];
    for(const sz of [16,24,32,48,64,256])set.push([sz,await scaled(sz)]);
    fs.writeFileSync(ico,icoFrom(set));
    done.push(comm,ico);
  }

  await browser.close();
  for(const f of done)console.log(path.relative(ROOT,f));
}
main().catch(e=>{ console.error(e); process.exit(1); });
