#!/usr/bin/env node
/* The app icon, drawn from a description, at every size the stores ask for.

   node tools/icon.js              writes app/icon/*.png
   node tools/icon.js --svg        also writes app/icon/icon.svg, for editing by hand
   node tools/icon.js --variant B  a different composition (see VARIANTS below)
   node tools/icon.js --android    also writes the launcher mipmaps into the
                                   Android project (ic_launcher, _round, _foreground)

   Why it is drawn and not painted: there are no image files in this project
   (CLAUDE.md, Rendering), and an icon that is a script can be re-rendered at
   a new size, a new palette or a new skin in a second. The scene is a list of
   voxels in the game's own block format, projected twice with the game's own
   idea of a fold: on one side of a seam the world has depth and the blocks
   show their tops, on the other side it is pressed flat into paper and the
   blocks at different depths merge into one silhouette - which is the whole
   game, and the reason the two columns that stand apart on the left are one
   platform on the right. The Rose cube stands on the seam, half a cube and
   half a square, and a hunter twice his weight waits on the page beside him.

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
   Sky: world I's night (js/02-levels.js). Rose: SKIN_COLORS[0]. Grass and
   earth: the grass texture's own greens and browns, flattened to one value
   each. Hunter: huntMesh()'s plum shell, red core, red cage and red aura.
   Paper: what the sky becomes when the world is folded - lifted toward
   white and greyed, PAPER_LIFT in the renderer. */
const C={
  skyTop:"#1f4a70", skyBot:"#0d1b2e",
  paperTop:"#6d8aa8", paperBot:"#4c627e",
  rose:"#d6336c", roseTop:"#ee5a8c", roseSide:"#a8244f",
  grass:"#7fc63f", grassLid:"#a5e04a", grassSide:"#5f9e2c",
  earth:"#6f4a2a", earthSide:"#4e3218", earthFlat:"#7a5533",
  ink:"#14172a", white:"#ffffff",
  huntBody:"#46323e", huntTop:"#5a4250", huntSide:"#33242d", huntRed:"#ff4d5e", huntRim:"#ff6b7a",
  seam:"#5ff2d0"
};

/* ---- the scene ---------------------------------------------------------
   [x,y,z]: x right, y up, z depth AWAY from the camera. Two towers, one
   near and one two cells back, one square apart in x. In 3D the far one
   draws higher and to the right, so there is air between them; flat, they
   are one platform three wide. The player stands on the near tower and a
   hunter on the far one: apart in the volume, on the page they share a row,
   which is the whole of a fight in one picture. */
const BLOCKS=[
  [-1,0,0],
  [0,0,0],[0,1,0],
  [1,0,2],[1,1,2],
  [2,0,2],[2,1,2]
];
const PLAYER=[0,2,0];
const HUNTER=[2,2,2];
/* How many cells tall the hunter stands. 1 is the player's own size; over 1
   it looms. Under about .9 it stops being the thing you look at second. */
const HUNT_SCALE=1.3;

const VARIANTS={
  /* A: the seam runs through the player. Left of it, the world; right of it,
     the page. The hero is the half-folded cube. */
  A:{seam:0.58, tilt:9, showHunter:true, glow:true},
  /* B: the same, but the seam leans the other way and sits further right,
     so more of the world is 3D and the cube is mostly a cube. */
  B:{seam:0.58, tilt:-9, showHunter:true, glow:true},
  /* C: no world, one enormous cube half folded. The most legible at 48px,
     and the least about the puzzle. */
  C:{seam:0.55, tilt:0, showHunter:false, glow:true, solo:true}
};

function scene(V, W, id){
  id=id||("i"+W);
  /* Cell size and the oblique projection. The game's camera tilts down so a
     block shows a front face and a lid, and turns in 90° steps, so no side
     face is ever seen. The icon takes a little licence and shows a side, or
     a lone cube reads as a square with a hat. TILT is the lid's height and
     SKEW its lean, as fractions of a cell. */
  const solo=!!V.solo;
  /* V.zoom shrinks the scene and nothing else: the sky, the page and the
     seam still fill the square. The adaptive foreground is drawn this way,
     so whatever mask the launcher cuts lands on background, not on an edge. */
  const s=(solo? W*0.42 : W*0.175)*(V.zoom||1);
  const TILT=0.52, SKEW=0.50;
  const k=SKEW*s, t=TILT*s;
  const blocks=solo?[]:BLOCKS;
  const player=solo?[0,0,0]:PLAYER;

  /* Origin: centre what is actually drawn. Left of the seam the world is
     3D, and only the near blocks are there; right of it everything is flat.
     So the box is the 3D extent of the near blocks and the player plus the
     flat extent of everything. */
  const p3=b=>[ox+b[0]*s+b[2]*k, oy-b[1]*s-b[2]*t];   // front-top-left, 3D
  const p2=b=>[ox+b[0]*s, oy-b[1]*s];                  // flat: depth stops paying
  let ox=0, oy=0;
  const pts=[];
  for(const b of [...blocks.filter(b=>b[2]===0),player]){ const [x,y]=p3(b); pts.push([x,y-t],[x+s+k,y+s]); }
  for(const b of blocks){ const [x,y]=p2(b); pts.push([x,y],[x+s,y+s]); }
  if(V.showHunter){ const [x,y]=p2(HUNTER), hs=s*HUNT_SCALE, dx=(s-hs)/2; pts.push([x+dx,y+s-hs],[x+dx+hs,y+s]); }
  const minX=Math.min(...pts.map(p=>p[0])), maxX=Math.max(...pts.map(p=>p[0]));
  const minY=Math.min(...pts.map(p=>p[1])), maxY=Math.max(...pts.map(p=>p[1]));
  ox=(W-(maxX-minX))/2-minX; oy=(W-(maxY-minY))/2-minY + (solo?0:W*0.02);

  /* --- 3D faces, painter's order: far first, then left to right, bottom up. */
  const order=[...blocks].sort((a,b)=>(b[2]-a[2])||(a[0]-b[0])||(a[1]-b[1]));
  const poly=(pts,fill,extra="")=>`<polygon points="${pts.map(p=>p.map(v=>v.toFixed(1)).join(",")).join(" ")}" fill="${fill}" ${extra}/>`;
  const rect=(x,y,w,h,fill,extra="")=>`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" ${extra}/>`;
  const stroke=`stroke="${C.ink}" stroke-width="${(s*0.035).toFixed(1)}" stroke-linejoin="round"`;

  function cube3(b, front, lid, side, lidStrip){
    const [x,y]=p3(b);
    let o="";
    o+=poly([[x,y],[x+s,y],[x+s+k,y-t],[x+k,y-t]], lid, stroke);          // top
    o+=poly([[x+s,y],[x+s+k,y-t],[x+s+k,y+s-t],[x+s,y+s]], side, stroke); // right side
    o+=rect(x,y,s,s,front,stroke);                                          // front
    if(lidStrip){ // the grass lid wraps a little way down the front, as in the game
      o+=rect(x,y,s,s*0.16,lidStrip,`stroke="none"`);
      o+=poly([[x+s,y],[x+s+k,y-t],[x+s+k,y-t+s*0.16],[x+s,y+s*0.16]], C.grassSide, `stroke="none"`);
    }
    return o;
  }
  function cube2(b, fill){ const [x,y]=p2(b); return rect(x,y,s,s,fill,stroke); }

  let world3="", world2="";
  for(const b of order) world3+=cube3(b, C.earth, C.grass, C.earthSide, C.grassLid);
  /* Flat: blocks at different depths that share a square merge. Draw the
     nearest last so it wins, like rule 5. */
  const seen=new Set();
  for(const b of [...blocks].sort((a,b)=>b[2]-a[2])){
    const key=b[0]+","+b[1]; if(seen.has(key)) continue; seen.add(key);
    world2+=cube2(b, C.earthFlat);
    const [x,y]=p2(b); world2+=rect(x,y,s,s*0.16,C.grass,`stroke="none"`);
  }

  /* The player: 3D on the left, a square on the right. White outline, as
     outlineFor() gives a piece against the void. */
  const pw=`stroke="${C.white}" stroke-width="${(s*0.05).toFixed(1)}" stroke-linejoin="round"`;
  const [px,py]=p3(player);
  let player3=poly([[px,py],[px+s,py],[px+s+k,py-t],[px+k,py-t]], C.roseTop, pw)
             +poly([[px+s,py],[px+s+k,py-t],[px+s+k,py+s-t],[px+s,py+s]], C.roseSide, pw)
             +rect(px,py,s,s,C.rose,pw);
  const [qx,qy]=p2(player);
  let player2=rect(qx,qy,s,s,C.rose,pw);

  /* The hunter: huntMesh() in two dimensions, and BIGGER THAN THE CUBE.
     In the game its shell is .72 of a cell, because a fight is a crowd of
     them on a board and they must not read as walls. An icon is one frame
     with one threat in it, and a threat the same size as the hero is not a
     threat - so it stands HUNT_SCALE cells tall, bottom aligned to the
     block it stands on, looming over the row it shares with the player.
     No core: the octahedron inside it was a red gem at icon size and read
     as treasure, which is the opposite of what it is. What is left is the
     plum body, the red cage and the red aura, which is how the game asks
     you to find one anyway - by contrast, not by ornament. */
  let hunter3="", hunter2="";
  if(V.showHunter){
    const hs=s*HUNT_SCALE, dx=(s-hs)/2, dy=s-hs;   // centred, standing on the floor
    const rim=`stroke="${C.huntRim}" stroke-width="${(hs*0.055).toFixed(1)}" stroke-linejoin="round"`;
    const aura=(x,y,w,h)=>rect(x-hs*0.12,y-hs*0.12,w+hs*0.24,h+hs*0.24,C.huntRed,`opacity="0.42" filter="url(#${id}blur)"`);
    /* 3D: the same oblique cube, plum, sitting on its block. */
    const [gx,gy]=p3(HUNTER); const x=gx+dx, y=gy+dy;
    const hk=k*HUNT_SCALE, ht=t*HUNT_SCALE;
    hunter3=aura(x,y-ht,hs+hk,hs+ht)
      +poly([[x,y],[x+hs,y],[x+hs+hk,y-ht],[x+hk,y-ht]], C.huntTop, rim)
      +poly([[x+hs,y],[x+hs+hk,y-ht],[x+hs+hk,y+hs-ht],[x+hs,y+hs]], C.huntSide, rim)
      +rect(x,y,hs,hs,C.huntBody,rim);
    /* Flat: the same square, standing on the platform. */
    const [hx,hy]=p2(HUNTER); const fx=hx+dx, fy=hy+dy;
    hunter2=aura(fx,fy,hs,hs)+rect(fx,fy,hs,hs,C.huntBody,rim);
  }

  /* --- the seam: a line through the icon, leaning a little. Left of it is
     the world, right of it the page. */
  /* V.seam is a fraction of the PLAYER's width, so the seam always cuts the
     cube, whatever the cell size. */
  const sx=px+s*V.seam, lean=Math.tan(V.tilt*Math.PI/180)*W/2;
  const leftClip=`M -10 -10 L ${sx+lean} -10 L ${sx-lean} ${W+10} L -10 ${W+10} Z`;
  const rightClip=`M ${sx+lean} -10 L ${W+10} -10 L ${W+10} ${W+10} L ${sx-lean} ${W+10} Z`;

  const stars=(()=>{ let o="", r=7; for(let i=0;i<26;i++){ r=(r*16807)%2147483647; const x=(r%1000)/1000*W; r=(r*16807)%2147483647; const y=(r%1000)/1000*W*0.8; r=(r*16807)%2147483647; const q=1.2+(r%1000)/1000*2.4; o+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${q.toFixed(1)}" fill="#ffffff" opacity="${(0.35+q/8).toFixed(2)}"/>`; } return o; })();

  /* The far woods, a dark rim along the bottom of the world side, like the
     night forest under world I. On the page side it is the same shape,
     greyed - scenery folds too. */
  const hills=(fill)=>{ let d=`M 0 ${W*0.86}`; for(let i=0;i<=12;i++){ const x=i/12*W; const y=W*(0.80+0.05*Math.sin(i*1.7+0.4)+0.02*Math.cos(i*3.1)); d+=` Q ${(x-W/24).toFixed(0)} ${(y-W*0.06).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`; } d+=` L ${W} ${W} L 0 ${W} Z`; return `<path d="${d}" fill="${fill}"/>`; };

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
    ${solo?"":hills("#0f2a2a")}
    ${world3}${hunter3}${player3}
  </g>
  <g clip-path="url(#${id}R)">
    <rect width="${W}" height="${W}" fill="url(#${id}paper)"/>
    ${solo?"":hills("#566c86")}
    ${world2}${hunter2}${player2}
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

  /* A preview sheet: how it reads on a home screen, at three sizes, rounded
     the way the OS rounds it. This is the file to LOOK at. */
  const round=(w,r)=>`<div style="display:inline-block;width:${w}px;height:${w}px;border-radius:${r}px;overflow:hidden;margin:0 24px;vertical-align:middle;box-shadow:0 8px 24px rgba(0,0,0,.4)">${scene(V,w)}</div>`;
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
