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
   high, seven deep. A seam runs down the icon between the cube and the
   hunter. Left of it the arena has its depth: the rows recede up and to the
   right and you can count them. Right of it the same arena is folded, and
   all of those rows have merged into a single strip. One object, both
   states, the fold happening across the middle of the picture.

   That is also why the cast stands where it does. The cube is in the volume
   and the hunters are on the page, so the picture says what the game says:
   fold the world and whatever was far away in depth is suddenly on your row.

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

/* ---- the palette, lifted from the game --------------------------------
   Sky: world I's night (js/02-levels.js), which is the sky BOSS I is fought
   under. Rose: SKIN_COLORS[0]. Grass and earth: the grass texture's own
   greens and browns, flattened to one value each. Hunter: huntMesh()'s plum
   shell, red cage and red aura. Paper: what the sky becomes when the world
   is folded - lifted toward white and greyed, PAPER_LIFT in the renderer. */
const C={
  skyTop:"#1f4a70", skyBot:"#0d1b2e",
  paperTop:"#6d8aa8", paperBot:"#4c627e",
  rose:"#d6336c", roseTop:"#ee5a8c", roseSide:"#a8244f",
  grass:"#7fc63f", grassLid:"#a5e04a", grassSide:"#5f9e2c",
  earth:"#6f4a2a", earthSide:"#4e3218", earthFlat:"#7a5533",
  huntBody:"#46323e", huntTop:"#5a4250", huntSide:"#33242d",
  huntRed:"#ff4d5e", huntRim:"#ff6b7a", huntEdge:"#ff8a94",
  ink:"#14172a", white:"#ffffff", seam:"#5ff2d0",
  woods:"#0f2a2a", woodsFlat:"#566c86"
};

/* ---- the scene ---------------------------------------------------------
   [x,y,z]: x right, y up, z depth AWAY from the camera. The arena is an
   ISLAND with sky all round it, which is how a boss arena actually looks
   (shots/boss.png): a slab hanging over the woods, not a floor running off
   the edges. Running it off the edges was tried and filled the world side
   with a wall of green - the same trap `chrome.md` records for the
   cutscene's lawn, because at this camera angle a big field of lids is
   exactly that. */
/* x0 is out to -2 so the depth rows have somewhere to be SEEN. They recede
   up and to the right, so behind the cube they are hidden by him and beyond
   him they are cut off by the seam; the only place a person can count them
   is the wedge to his left, and that wedge has to be wide enough to count. */
const ARENA={x0:-2, x1:4, z0:0, z1:2};
const PLAYER=[0,1,0];
/* Two hunters, because a fight is a pack. The first is the one the seam is
   measured against; the second is further out and half off the edge, which
   is what says there are more of them than fit in the frame. */
const HUNTERS=[[2,1,2],[4,1,1]];
/* How many cells tall a hunter stands. 1 is the player's own size. It was
   1.3 for a build and looked wrong for a reason worth keeping: a piece that
   overhangs its square stops reading as a piece ON the grid, and the grid is
   what this game is. */
const HUNT_SCALE=1;

const VARIANTS={
  /* A: the seam falls BETWEEN the cube and the hunter, so neither is cut.
     The cube keeps all three of its dimensions and the hunter is flat paper,
     which is the cleanest way to say what the fold does to distance. This is
     the one that ships. */
  A:{seam:1.62, tilt:-9, hunters:true, glow:true},
  /* B: the seam through the cube instead, so he is half a cube and half a
     square. Louder, and it costs the arena's clean break. */
  B:{seam:0.58, tilt:-9, hunters:true, glow:true},
  /* C: no world, one enormous cube half folded. The most legible at 48px,
     and the least about the puzzle. */
  C:{seam:0.55, tilt:0, hunters:false, glow:true, solo:true},
  /* D: A with the near hunter mid-charge - the telegraph pane pointed at the
     cube, plus speed lines. A lot of picture for an icon, kept because the
     drawing of it is the expensive part. */
  D:{seam:1.62, tilt:-9, hunters:true, charge:true, glow:true}
};

function scene(V, W, id){
  id=id||("i"+W);
  /* Cell size and the oblique projection. The game's camera tilts down so a
     block shows a front face and a lid, and turns in 90 degree steps, so no
     side face is ever seen. The icon takes a little licence and shows a
     side, or a lone cube reads as a square with a hat. TILT is how far a
     cell of depth lifts, SKEW how far it leans right. */
  const solo=!!V.solo;
  /* V.zoom shrinks the scene and nothing else: the sky, the page and the
     seam still fill the square. The adaptive foreground is drawn this way,
     so whatever mask the launcher cuts lands on background, not on an edge. */
  const s=(solo? W*0.42 : W*0.125)*(V.zoom||1);
  const TILT=0.52, SKEW=0.50;
  const k=SKEW*s, t=TILT*s;

  const blocks=[];
  if(!solo) for(let z=ARENA.z0;z<=ARENA.z1;z++)
    for(let x=ARENA.x0;x<=ARENA.x1;x++) blocks.push([x,0,z]);
  const player=solo?[0,0,0]:PLAYER;
  const hunters=(V.hunters&&!solo)?HUNTERS:[];

  const p3=b=>[ox+b[0]*s+b[2]*k, oy-b[1]*s-b[2]*t];   // front-top-left, 3D
  const p2=b=>[ox+b[0]*s, oy-b[1]*s];                  // flat: depth stops paying
  let ox=0, oy=0;

  /* FRAMING: the CAST is centred, not the scene. The arena is deliberately
     wider than the icon and would drag the picture wherever its own middle
     happened to fall; what a person looks at is the cube and the thing
     coming for it, so those are what sit in the middle of the square. */
  const pts=[];
  { const [x,y]=p3(player); pts.push([x,y-t],[x+s+k,y+s]); }
  if(hunters.length){ const [x,y]=p2(hunters[0]); pts.push([x,y],[x+s,y+s]); }
  const minX=Math.min(...pts.map(p=>p[0])), maxX=Math.max(...pts.map(p=>p[0]));
  const minY=Math.min(...pts.map(p=>p[1])), maxY=Math.max(...pts.map(p=>p[1]));
  ox=(W-(maxX-minX))/2-minX;
  /* A shade above centre: the arena's depth rises up and to the right behind
     the cast, so the weight of the picture is above them and empty paper
     below. Nudging the cast up puts the floor nearer the middle. */
  oy=(W-(maxY-minY))/2-minY - (solo?0:W*0.03);

  const poly=(pts,fill,extra="")=>`<polygon points="${pts.map(p=>p.map(v=>v.toFixed(1)).join(",")).join(" ")}" fill="${fill}" ${extra}/>`;
  const rect=(x,y,w,h,fill,extra="")=>`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" ${extra}/>`;
  const stroke=`stroke="${C.ink}" stroke-width="${(s*0.035).toFixed(1)}" stroke-linejoin="round"`;

  function cube3(b, front, lid, side, lidStrip){
    const [x,y]=p3(b);
    let o="";
    o+=poly([[x,y],[x+s,y],[x+s+k,y-t],[x+k,y-t]], lid, stroke);          // top
    o+=poly([[x+s,y],[x+s+k,y-t],[x+s+k,y+s-t],[x+s,y+s]], side, stroke); // right side
    o+=rect(x,y,s,s,front,stroke);                                        // front
    if(lidStrip){ // the grass lid wraps a little way down the front, as in the game
      o+=rect(x,y,s,s*0.16,lidStrip,`stroke="none"`);
      o+=poly([[x+s,y],[x+s+k,y-t],[x+s+k,y-t+s*0.16],[x+s,y+s*0.16]], C.grassSide, `stroke="none"`);
    }
    return o;
  }

  /* --- the arena, twice.
     3D: painter's order, far rows first, so the near row overlaps them and
     the slab reads as deep. */
  let world3="";
  for(const b of [...blocks].sort((a,b)=>(b[2]-a[2])||(a[0]-b[0]))) world3+=cube3(b, C.earth, C.grass, C.earthSide, C.grassLid);
  /* Flat: every block that shares a square merges, so an arena four deep
     becomes one row. That collapse IS the game, and drawing it on one
     continuous object either side of the seam is the whole reason the arena
     is shaped like this. */
  let world2="";
  const seen=new Set();
  for(const b of [...blocks].sort((a,b)=>b[2]-a[2])){
    const key=b[0]+","+b[1]; if(seen.has(key)) continue; seen.add(key);
    const [x,y]=p2(b);
    world2+=rect(x,y,s,s,C.earthFlat,stroke)+rect(x,y,s,s*0.16,C.grass,`stroke="none"`);
  }

  /* The player: a whole cube, in the volume. White outline, as outlineFor()
     gives a piece against the void. */
  const pw=`stroke="${C.white}" stroke-width="${(s*0.05).toFixed(1)}" stroke-linejoin="round"`;
  const [px,py]=p3(player);
  const player3=poly([[px,py],[px+s,py],[px+s+k,py-t],[px+k,py-t]], C.roseTop, pw)
    +poly([[px+s,py],[px+s+k,py-t],[px+s+k,py+s-t],[px+s,py+s]], C.roseSide, pw)
    +rect(px,py,s,s,C.rose,pw);
  const [qx,qy]=p2(player);
  const player2=rect(qx,qy,s,s,C.rose,pw);

  /* The hunters: huntMesh() in two dimensions. Plum body, red cage, red aura
     - found by contrast, as in the game. No core: the octahedron inside one
     was a red gem at icon size and read as treasure, which is the opposite
     of what it is. */
  const hs=s*HUNT_SCALE, dx=(s-hs)/2, dy=s-hs;
  const rim=`stroke="${C.huntRim}" stroke-width="${(hs*0.055).toFixed(1)}" stroke-linejoin="round"`;
  const aura=(x,y,w,h)=>rect(x-hs*0.12,y-hs*0.12,w+hs*0.24,h+hs*0.24,C.huntRed,`opacity="0.42" filter="url(#${id}blur)"`);
  let hunters2="";
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
  });

  /* --- the seam. V.seam is in CELLS from the player's own left edge, so it
     keeps its place against the cast whatever the cell size is: 1.62 sits in
     the gap between the cube and the near hunter, .58 cuts the cube. */
  const sx=px+s*V.seam, lean=Math.tan(V.tilt*Math.PI/180)*W/2;
  const leftClip=`M -10 -10 L ${sx+lean} -10 L ${sx-lean} ${W+10} L -10 ${W+10} Z`;
  const rightClip=`M ${sx+lean} -10 L ${W+10} -10 L ${W+10} ${W+10} L ${sx-lean} ${W+10} Z`;

  const stars=(()=>{ let o="", r=7; for(let i=0;i<26;i++){ r=(r*16807)%2147483647; const x=(r%1000)/1000*W; r=(r*16807)%2147483647; const y=(r%1000)/1000*W*0.8; r=(r*16807)%2147483647; const q=1.2+(r%1000)/1000*2.4; o+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${q.toFixed(1)}" fill="#ffffff" opacity="${(0.35+q/8).toFixed(2)}"/>`; } return o; })();

  /* The far woods, well below the arena, as under a night-grass boss. On the
     page side it is the same shape greyed - scenery folds too. */
  const hills=(fill)=>{ let d=`M 0 ${W*0.93}`; for(let i=0;i<=12;i++){ const x=i/12*W; const y=W*(0.88+0.04*Math.sin(i*1.7+0.4)+0.02*Math.cos(i*3.1)); d+=` Q ${(x-W/24).toFixed(0)} ${(y-W*0.05).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`; } d+=` L ${W} ${W} L 0 ${W} Z`; return `<path d="${d}" fill="${fill}"/>`; };

  const glow=V.glow?`
    <line x1="${(sx+lean).toFixed(1)}" y1="-10" x2="${(sx-lean).toFixed(1)}" y2="${W+10}" stroke="${C.seam}" stroke-width="${(W*0.05).toFixed(0)}" opacity="0.28" filter="url(#${id}blur)"/>
    <line x1="${(sx+lean).toFixed(1)}" y1="-10" x2="${(sx-lean).toFixed(1)}" y2="${W+10}" stroke="${C.seam}" stroke-width="${(W*0.012).toFixed(0)}" opacity="0.95"/>
    <line x1="${(sx+lean).toFixed(1)}" y1="-10" x2="${(sx-lean).toFixed(1)}" y2="${W+10}" stroke="#ffffff" stroke-width="${(W*0.004).toFixed(0)}" opacity="0.9"/>`:"";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">
  <defs>
    <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.skyTop}"/><stop offset="1" stop-color="${C.skyBot}"/></linearGradient>
    <linearGradient id="${id}paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.paperTop}"/><stop offset="1" stop-color="${C.paperBot}"/></linearGradient>
    <clipPath id="${id}L"><path d="${leftClip}"/></clipPath>
    <clipPath id="${id}R"><path d="${rightClip}"/></clipPath>
    <filter id="${id}blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(W*0.02).toFixed(0)}"/></filter>
  </defs>
  <g clip-path="url(#${id}L)">
    <rect width="${W}" height="${W}" fill="url(#${id}sky)"/>
    ${stars}
    ${solo?"":hills(C.woods)}
    ${world3}${player3}
  </g>
  <g clip-path="url(#${id}R)">
    <rect width="${W}" height="${W}" fill="url(#${id}paper)"/>
    ${solo?"":hills(C.woodsFlat)}
    ${world2}${hunters2}${player2}
  </g>
  ${glow}
</svg>`;
}

async function main(){
  const args=process.argv.slice(2);
  const arg=n=>{ const i=args.indexOf(n); return i>=0?args[i+1]:null; };
  const vname=arg("--variant")||"A";
  const V=VARIANTS[vname]; if(!V){ console.error("variants: "+Object.keys(VARIANTS).join(", ")); process.exit(1); }
  const suffix=vname==="A"?"":"-"+vname;
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
       the sky's bottom colour, for launchers that show it. */
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
