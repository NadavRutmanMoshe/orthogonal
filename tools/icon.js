#!/usr/bin/env node
/* The app icon, drawn from a description, at every size the stores ask for.

   node tools/icon.js              writes app/icon/*.png
   node tools/icon.js --svg        also writes app/icon/icon.svg, for editing by hand
   node tools/icon.js --variant B  a different composition (see VARIANTS below)
   node tools/icon.js --android    also writes the launcher mipmaps into the
                                   Android project (ic_launcher, _round, _foreground)

   Why it is drawn and not painted: there are no image files in this project
   (CLAUDE.md, Rendering), and an icon that is a script can be re-rendered at
   a new size, a new palette or a new skin in a second.

   WHAT THE PICTURE IS. A boss arena, which in this game is one block tall
   and several blocks DEEP - BOSS I is box(0,9,0,0,0,6,[]), ten wide, one
   high, seven deep. A seam runs down the icon. On one side the arena has its
   depth and the rows recede; on the other the same arena is folded and those
   rows have merged into a single strip. One object, both states.

   The cube and the hunter stand on opposite sides of that seam, so the
   picture says what the game says: fold the world and whatever was far away
   in depth is suddenly on your row.

   Rendering goes through the same headless Chromium tools/shot.js uses. */
const fs=require("fs"), path=require("path");
const ROOT=path.join(__dirname,"..");
const OUT=path.join(ROOT,"app","icon");

function loadPlaywright(){
  const tries=["playwright",
    "/opt/node22/lib/node_modules/playwright",
    path.join(process.env.npm_config_prefix||"/usr/local","lib","node_modules","playwright")];
  for(const t of tries){ try{ return require(t); }catch(e){} }
  console.error("playwright not found. `npm i -g playwright`.");
  process.exit(2);
}

/* ---- the palette -------------------------------------------------------
   THREE COLOURS ARE THE GAME and never change: rose #d6336c is the cube
   (SKIN_COLORS[0], what every player starts as), teal #5ff2d0 is the fold
   (the goal's jade and the landing mark's lean, the only colour that means
   "this is the verb"), and red #ff4d5e is the pack (huntMesh()'s cage and
   aura). Everything else is the WORLD, and the world is a choice.

   A WORLD IS A CHOICE BECAUSE THE GAME HAS FIVE OF THEM. The icon was slate
   and navy for a build and read as boring, which it was: that is PROLOGUE's
   palette, the greyest in the game, and it sells the least interesting hour
   of it. The right answer is not "no surface" (which is where the slate came
   from, and the reasoning behind it still holds - an icon wearing world I's
   grass sells world I) but a world picked for the PICTURE. So each world's
   own `theme.sky` is in the table below, and `--world <name>` switches it.

   The sky is a two-stop gradient, as it is in the game, and the paper is
   that sky lifted toward white - which is why a warm world gives a warm
   page and the grey went away by itself. `theme.sky` is [top, bottom]. */
const WORLDS={
  /* Each world is its `theme.sky` as a two-stop gradient for the volume, and
     a SECOND two-stop gradient for the page.

     THE PAGE IS NOT THE SKY MIXED WITH WHITE. That was the first attempt and
     it is where the grey kept coming from: mixing any hue toward white kills
     its saturation, so every world produced the same washed putty. The page
     is hand-picked instead - the sky's own hues, light but still SATURATED,
     which is what a lit page actually looks like and what keeps a warm world
     warm on both sides of the seam. */
  /* PROLOGUE's own night. The honest baseline, and the greyest thing here. */
  night:{skyTop:"#1d3a58", skyBot:"#0e1c2e",
         face:"#35507d", lid:"#4b6ba0", side:"#2a4067",
         paperTop:"#a9c0da", paperBot:"#7f9ab8",
         flat:"#4c6a95", flatLid:"#5f7fab"},
  /* II · FIRE. theme.sky is [0x1a0a10, 0x3a0f0a]; the bottom is pushed
     warmer because in the game the ember glow low down is SCENERY - the lava
     and the plume - and an icon has no room for scenery. */
  fire:{skyTop:"#240a10", skyBot:"#6b1a08",
        face:"#57403a", lid:"#7a594a", side:"#402e2a",
        paperTop:"#c9a2a6", paperBot:"#f5a874",
        flat:"#9a6450", flatLid:"#b87c60"},
  /* III · WATER, and its sky is the best in the game: plum overhead, rust at
     the horizon. `levels.md` says that warm sky is what "makes cyan sing",
     which is a promise about the teal seam. Folded, plum and rust lift into
     lilac and peach, so the page is a sunset too. */
  water:{skyTop:"#2a1e3c", skyBot:"#7a3a26",
         face:"#8a5544", lid:"#ad6d55", side:"#663c2e",
         paperTop:"#b9a2cf", paperBot:"#efb08f",
         flat:"#a05c4e", flatLid:"#bd7460"},
  /* IV · DESERT, the one sky in the game that is bright rather than dark. */
  desert:{skyTop:"#3d3a52", skyBot:"#97703c",
          face:"#b09a6e", lid:"#d4bb8a", side:"#85734f",
          paperTop:"#b7aecb", paperBot:"#f4d295",
          flat:"#a88f5f", flatLid:"#c4a870"}
};
const PIECES={
  rose:"#d6336c", roseLid:"#ef5b8e", roseSide:"#a6234e",
  huntBody:"#46323e", huntLid:"#5a4250", huntSide:"#33242d",
  huntRed:"#ff4d5e", huntRim:"#ff6b7a", huntEdge:"#ff8a94",
  ink:"#0e1626", white:"#ffffff", seam:"#5ff2d0"
};
/* The world the icon is set in. One word, and every colour follows. */
var WORLD="water";
function palette(name){
  const w=WORLDS[name]||WORLDS.water;
  return Object.assign({},PIECES,w);
}

/* ---- the scene ---------------------------------------------------------
   [x,y,z]: x right, y up, z depth AWAY from the camera. The arena is an
   ISLAND with sky all round it, which is how a boss arena actually looks
   (shots/boss.png): a slab hanging in the void, not a floor running off the
   edges. Run it off the edges and the volume side becomes a solid field of
   lids - the same trap `chrome.md` records for the cutscene's lawn. */
const ARENA={x0:-1, x1:3, z0:0, z1:2};
/* A variant may want a different slab, and `flip` is why. The depth rows
   recede up and to the RIGHT, so the side of the seam the volume is on
   decides which end of the arena needs the spare columns: flipped, the
   volume is on the right and the extra room is wanted there; unflipped it is
   wanted on the left, where the only countable wedge is. */
const ARENA_WIDE={x0:-2, x1:3, z0:0, z1:2};
const PLAYER=[0,1,0];
/* ONE hunter. Two was a pack and read as clutter at icon size; the picture
   only has to say that something is over there, and one thing says it.

   TWO CELLS OUT, AND THAT IS FORCED. Every piece is drawn in BOTH
   projections and the clip decides which you see, so a piece the seam
   crosses shows half solid and half flat - deliberate in B, a mess anywhere
   else, because a cube is 1.5 cells wide on screen and its flat square is 1,
   so the straddle does not line up. With the hunter one cell out there is no
   seam position that misses both pieces: the cube's solid form reaches 1.5
   and the hunter's flat form starts at 1.0. At two cells out the gap is 1.5
   to 2.0, and 1.75 sits in it. */
const HUNTERS=[[2,1,1]];
/* How many cells tall a hunter stands. 1 is the player's own size. It was
   1.3 for a build and looked wrong for a reason worth keeping: a piece that
   overhangs its square stops reading as a piece ON the grid, and the grid is
   what this game is. Size is not how the hunter gets its weight - which side
   of the seam it stands on is (see `flip`). */
const HUNT_SCALE=1;

const VARIANTS={
  /* A: FLIPPED. The page is on the left and the volume on the right, so the
     cube is the flat square and the HUNTER is the solid cube. A cube has a
     lid and a side and a flat square has neither, so whichever piece stands
     in the volume is the bigger thing on the screen - and it should not be
     the one being hunted. This is the one that ships. */
  A:{seam:1.75, tilt:-9, flip:true, hunters:true, glow:true},
  /* B: the seam through the cube, volume on the left, so he is half a cube
     and half a square. The loudest of them, and the only one where the fold
     happens to a PIECE rather than to the board. */
  B:{seam:0.58, tilt:-9, hunters:true, glow:true, arena:ARENA_WIDE},
  /* C: no world, one enormous cube half folded. The most legible at 48px,
     and the least about the puzzle. */
  C:{seam:0.55, tilt:0, hunters:false, glow:true, solo:true},
  /* D: A's arrangement unflipped, with the hunter mid-charge - the telegraph
     pane pointed at the cube, plus speed lines. A lot of picture for an icon,
     kept because the drawing of it is the expensive part. */
  D:{seam:1.62, tilt:-9, hunters:true, charge:true, glow:true, arena:ARENA_WIDE}
};

function scene(V, W, id){
  id=id||("i"+W);
  const C=palette(V.world||WORLD);
  /* Cell size and the oblique projection. The game's camera tilts down so a
     block shows a front face and a lid, and turns in 90 degree steps, so no
     side face is ever seen. The icon takes a little licence and shows a
     side, or a lone cube reads as a square with a hat. TILT is how far a
     cell of depth lifts, SKEW how far it leans right. */
  const solo=!!V.solo;
  /* V.zoom shrinks the scene and nothing else: the sky, the page and the
     seam still fill the square. The adaptive foreground is drawn this way,
     so whatever mask the launcher cuts lands on background, not on an edge. */
  const s=(solo? W*0.42 : W*0.135)*(V.zoom||1);
  const TILT=0.52, SKEW=0.50;
  const k=SKEW*s, t=TILT*s;

  const AR=V.arena||ARENA;
  const blocks=[];
  if(!solo) for(let z=AR.z0;z<=AR.z1;z++)
    for(let x=AR.x0;x<=AR.x1;x++) blocks.push([x,0,z]);
  const player=solo?[0,0,0]:PLAYER;
  const hunters=(V.hunters&&!solo)?HUNTERS:[];

  const p3=b=>[ox+b[0]*s+b[2]*k, oy-b[1]*s-b[2]*t];   // front-top-left, 3D
  const p2=b=>[ox+b[0]*s, oy-b[1]*s];                  // flat: depth stops paying
  let ox=0, oy=0;

  /* Which projection each piece is SEEN in, which is decided by the side of
     the seam it stands on and therefore by `flip`. The framing and the seam
     both have to ask, or they measure a drawing nobody sees. */
  const pPro=V.flip?p2:p3, hPro=V.flip?p3:p2;

  /* FRAMING: the CAST is centred, not the scene. The arena is wider than the
     icon and would drag the picture wherever its own middle happened to
     fall; what a person looks at is the cube and the thing across from it,
     so those are what sit in the middle of the square. */
  const pts=[];
  const box=(pos,pro)=>{ const [x,y]=pro(pos);
    return pro===p3 ? [[x,y-t],[x+s+k,y+s]] : [[x,y],[x+s,y+s]]; };
  pts.push(...box(player,pPro));
  if(hunters.length) pts.push(...box(hunters[0],hPro));
  const minX=Math.min(...pts.map(p=>p[0])), maxX=Math.max(...pts.map(p=>p[0]));
  const minY=Math.min(...pts.map(p=>p[1])), maxY=Math.max(...pts.map(p=>p[1]));
  ox=(W-(maxX-minX))/2-minX;
  /* A shade above centre: the arena's depth rises up and to the right behind
     the cast, so the weight of the picture is above them and empty page
     below. Nudging the cast up puts the floor nearer the middle. */
  oy=(W-(maxY-minY))/2-minY - (solo?0:W*0.03);

  const poly=(pts,fill,extra="")=>`<polygon points="${pts.map(p=>p.map(v=>v.toFixed(1)).join(",")).join(" ")}" fill="${fill}" ${extra}/>`;
  const rect=(x,y,w,h,fill,extra="")=>`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" ${extra}/>`;
  const stroke=`stroke="${C.ink}" stroke-width="${(s*0.035).toFixed(1)}" stroke-linejoin="round"`;

  /* One cube, drawn oblique, at any size and in any three tones. Everything
     solid in this picture goes through it, so a block, the player and a
     hunter can never drift out of register with each other. */
  function cube3at(x,y,size,face,lid,side,extra){
    const kk=SKEW*size, tt=TILT*size;
    return poly([[x,y],[x+size,y],[x+size+kk,y-tt],[x+kk,y-tt]], lid, extra)
      +poly([[x+size,y],[x+size+kk,y-tt],[x+size+kk,y+size-tt],[x+size,y+size]], side, extra)
      +rect(x,y,size,size,face,extra);
  }

  /* --- the arena, twice.
     3D: painter's order, far rows first, so the near row overlaps them and
     the slab reads as deep. */
  let world3="";
  for(const b of [...blocks].sort((a,b)=>(b[2]-a[2])||(a[0]-b[0]))){
    const [x,y]=p3(b); world3+=cube3at(x,y,s,C.face,C.lid,C.side,stroke);
  }
  /* Flat: every block that shares a square merges, so an arena three deep
     becomes one row. That collapse IS the game, and drawing it on one
     continuous object either side of the seam is the whole reason the arena
     is shaped like this. The thin light band is the lid the slab lost. */
  let world2="";
  const seen=new Set();
  for(const b of [...blocks].sort((a,b)=>b[2]-a[2])){
    const key=b[0]+","+b[1]; if(seen.has(key)) continue; seen.add(key);
    const [x,y]=p2(b);
    world2+=rect(x,y,s,s,C.flat,stroke)+rect(x,y,s,s*0.14,C.flatLid,`stroke="none"`);
  }

  /* The player. White outline, as outlineFor() gives a piece against the
     void, and it is what keeps him readable on either background. */
  const pw=`stroke="${C.white}" stroke-width="${(s*0.05).toFixed(1)}" stroke-linejoin="round"`;
  const [px,py]=p3(player);
  const player3=cube3at(px,py,s,C.rose,C.roseLid,C.roseSide,pw);
  const [qx,qy]=p2(player);
  const player2=rect(qx,qy,s,s,C.rose,pw);

  /* The hunter: huntMesh() in two dimensions. Plum body, red cage, red aura
     - found by contrast, as in the game. No core: the octahedron inside one
     was a red gem at icon size and read as treasure, which is the opposite
     of what it is. */
  const hs=s*HUNT_SCALE, dx=(s-hs)/2, dy=s-hs;
  const rim=`stroke="${C.huntRim}" stroke-width="${(hs*0.055).toFixed(1)}" stroke-linejoin="round"`;
  const aura=(x,y,w,h)=>rect(x-hs*0.12,y-hs*0.12,w+hs*0.24,h+hs*0.24,C.huntRed,`opacity="0.42" filter="url(#${id}blur)"`);
  let hunters2="", hunters3="";
  hunters.forEach((h,i)=>{
    const [hx,hy]=p2(h), fx=hx+dx, fy=hy+dy;
    if(i===0&&V.charge){
      /* THE CHARGE (variant D): the pane a hunter drops down the row in the
         beat before it fires - lineMesh()/drawLines(), js/10-render.js -
         caught mid-fall and sharpened to a point at the cube. */
      const rh=s*0.54, ry=hy+s-rh*1.15, rx=qx+s*0.94, tip=s*0.44, x1=hx+s*0.5;
      hunters2+=`<linearGradient id="${id}ray" x1="0" y1="0" x2="1" y2="0">`
        +`<stop offset="0" stop-color="${C.huntRed}" stop-opacity="0.92"/>`
        +`<stop offset="1" stop-color="${C.huntRed}" stop-opacity="0.82"/></linearGradient>`
        +poly([[rx,ry+rh/2],[rx+tip,ry],[x1,ry],[x1,ry+rh],[rx+tip,ry+rh]],
              `url(#${id}ray)`, `stroke="${C.huntEdge}" stroke-width="${(s*0.03).toFixed(1)}" stroke-opacity="0.85" stroke-linejoin="round"`);
      for(let j=0;j<3;j++){
        const w=s*(0.28-j*0.08), yy=hy+s*(0.24+j*0.26);
        hunters2+=rect(hx+s*1.01+j*s*0.05, yy, w, s*0.10, C.huntRed,
          `opacity="${(0.8-j*0.22).toFixed(2)}" rx="${(s*0.045).toFixed(1)}"`);
      }
    }
    hunters2+=aura(fx,fy,hs,hs)+rect(fx,fy,hs,hs,C.huntBody,rim);
    const [gx,gy]=p3(h), vx=gx+dx, vy=gy+dy;
    hunters3+=aura(vx,vy-TILT*hs,hs+SKEW*hs,hs+TILT*hs)
      +cube3at(vx,vy,hs,C.huntBody,C.huntLid,C.huntSide,rim);
  });

  /* --- the seam. V.seam is in CELLS from the player's own left edge, as he
     is SEEN, so it keeps its place against the cast at any cell size. */
  const sx=pPro(player)[0]+s*V.seam, lean=Math.tan(V.tilt*Math.PI/180)*W/2;
  const leftClip=`M -10 -10 L ${sx+lean} -10 L ${sx-lean} ${W+10} L -10 ${W+10} Z`;
  const rightClip=`M ${sx+lean} -10 L ${W+10} -10 L ${W+10} ${W+10} L ${sx-lean} ${W+10} Z`;

  const stars=(()=>{ let o="", r=7; for(let i=0;i<16;i++){ r=(r*16807)%2147483647; const x=(r%1000)/1000*W; r=(r*16807)%2147483647; const y=(r%1000)/1000*W; r=(r*16807)%2147483647; const q=1.1+(r%1000)/1000*1.9; o+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${q.toFixed(1)}" fill="#ffffff" opacity="${(0.3+q/10).toFixed(2)}"/>`; } return o; })();

  /* The two halves as content, so `flip` is one swap rather than a second
     copy of the drawing. */
  const volume=`<rect width="${W}" height="${W}" fill="url(#${id}sky)"/>${stars}${world3}${hunters3}${player3}`;
  const page=`<rect width="${W}" height="${W}" fill="url(#${id}pap)"/>${world2}${hunters2}${player2}`;
  const left=V.flip?page:volume, right=V.flip?volume:page;

  const glow=V.glow?`
    <line x1="${(sx+lean).toFixed(1)}" y1="-10" x2="${(sx-lean).toFixed(1)}" y2="${W+10}" stroke="${C.seam}" stroke-width="${(W*0.05).toFixed(0)}" opacity="0.28" filter="url(#${id}blur)"/>
    <line x1="${(sx+lean).toFixed(1)}" y1="-10" x2="${(sx-lean).toFixed(1)}" y2="${W+10}" stroke="${C.seam}" stroke-width="${(W*0.012).toFixed(0)}" opacity="0.95"/>
    <line x1="${(sx+lean).toFixed(1)}" y1="-10" x2="${(sx-lean).toFixed(1)}" y2="${W+10}" stroke="#ffffff" stroke-width="${(W*0.004).toFixed(0)}" opacity="0.9"/>`:"";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">
  <defs>
    <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.skyTop}"/><stop offset="1" stop-color="${C.skyBot}"/></linearGradient>
    <linearGradient id="${id}pap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.paperTop}"/><stop offset="1" stop-color="${C.paperBot}"/></linearGradient>
    <clipPath id="${id}L"><path d="${leftClip}"/></clipPath>
    <clipPath id="${id}R"><path d="${rightClip}"/></clipPath>
    <filter id="${id}blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(W*0.02).toFixed(0)}"/></filter>
  </defs>
  <g clip-path="url(#${id}L)">${left}</g>
  <g clip-path="url(#${id}R)">${right}</g>
  ${glow}
</svg>`;
}

async function main(){
  const args=process.argv.slice(2);
  const arg=n=>{ const i=args.indexOf(n); return i>=0?args[i+1]:null; };
  const vname=arg("--variant")||"A";
  if(arg("--world")) WORLD=arg("--world");
  const V=VARIANTS[vname]; if(!V){ console.error("variants: "+Object.keys(VARIANTS).join(", ")); process.exit(1); }
  /* A world other than the shipping one writes its own files, so three can
     be looked at side by side without one overwriting the next. */
  const wsuf=(arg("--world")&&arg("--world")!=="water")?"-"+arg("--world"):"";
  const suffix=(vname==="A"?"":"-"+vname)+wsuf;
  fs.mkdirSync(OUT,{recursive:true});
  const svg=scene(V,1024);
  if(args.includes("--svg")) fs.writeFileSync(path.join(OUT,`icon${suffix}.svg`),svg);

  const {chromium}=loadPlaywright();
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1024,height:1024}, deviceScaleFactor:1});
  const html=(body,w)=>`<!doctype html><html><body style="margin:0;background:transparent;width:${w}px;height:${w}px;overflow:hidden">${body}</body></html>`;
  async function shot(file,body,w,transparent){
    await page.setViewportSize({width:w,height:w});
    await page.setContent(html(body,w));
    await page.screenshot({path:file, omitBackground:!!transparent, clip:{x:0,y:0,width:w,height:w}});
    console.log(path.relative(ROOT,file));
  }
  /* The store icon: full bleed, square corners. iOS and Play both round it
     themselves. */
  await shot(path.join(OUT,`icon-1024${suffix}.png`), svg, 1024);
  await shot(path.join(OUT,`icon-512${suffix}.png`), scene(V,512), 512);

  /* A preview sheet: how it reads on a home screen, at four sizes, rounded
     the way the OS rounds it. This is the file to LOOK at. */
  const round=(w,r)=>`<div style="display:inline-block;width:${w}px;height:${w}px;border-radius:${r}px;overflow:hidden;margin:0 24px;vertical-align:middle;box-shadow:0 8px 24px rgba(0,0,0,.4)">${scene(V,w,"p"+w)}</div>`;
  const sheet=`<div style="background:#e9ecf1;width:1024px;height:520px;display:flex;align-items:center;justify-content:center;font:14px sans-serif;color:#555">
    ${round(256,58)}${round(128,29)}${round(64,14)}${round(48,11)}</div>`;
  await page.setViewportSize({width:1024,height:520});
  await page.setContent(`<!doctype html><html><body style="margin:0">${sheet}</body></html>`);
  await page.screenshot({path:path.join(OUT,`preview${suffix}.png`), clip:{x:0,y:0,width:1024,height:520}});
  console.log(path.relative(ROOT,path.join(OUT,`preview${suffix}.png`)));

  if(args.includes("--android")){
    /* Launcher mipmaps. The legacy icon is the full square at 48dp; the
       adaptive foreground is 108dp with the icon in the middle 72dp (the OS
       masks the rest), so the scene is drawn at 2/3 inside a full-bleed
       picture. The background layer (values/ic_launcher_background.xml) is
       the sky colour, for launchers that show it. */
    const res=path.join(ROOT,"app","android","app","src","main","res");
    const dpis={mdpi:1,hdpi:1.5,xhdpi:2,xxhdpi:3,xxxhdpi:4};
    for(const [d,m] of Object.entries(dpis)){
      const dir=path.join(res,"mipmap-"+d); if(!fs.existsSync(dir)) continue;
      const w=Math.round(48*m), fw=Math.round(108*m);
      await shot(path.join(dir,"ic_launcher.png"), scene(V,w), w);
      await shot(path.join(dir,"ic_launcher_round.png"), scene(V,w), w);
      await shot(path.join(dir,"ic_launcher_foreground.png"), scene({...V,zoom:72/108},fw), fw);
    }
  }
  await browser.close();
}
main().catch(e=>{ console.error(e); process.exit(1); });
