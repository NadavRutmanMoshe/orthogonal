#!/usr/bin/env node
/* The seven achievement pictures, drawn, for Play Games and Game Center.

   node tools/achicons.js     writes shots/achievements/<id>-1024.png, -512.png
                              and sheet.png (all seven side by side, to LOOK at)

   Same way tools/icon.js draws the app icon: an SVG shot through headless
   Chromium, opaque (Apple is strict about alpha on app icons; not needed
   here, but an opaque picture is never the thing that fails an upload).

   CIRCLE-SAFE. Game Center shows an achievement masked to a circle and Play
   rounds it, so everything that matters sits inside the middle circle and
   only the background reaches the corners.

   The three colours are the icon's (tools/icon.js): rose the cube, gold the
   star, red the pack, teal the fold. Everything else is the world's: its sky
   and the colour SECTIONS gives it on the map. Output is under shots/, which
   is gitignored - these are uploaded once, and re-drawn from here. */
const fs=require("fs"), path=require("path");
const {loadPlaywright}=require("./playwright.js");
const ROOT=path.join(__dirname,"..");
const OUT=path.join(ROOT,"shots","achievements");

const C={rose:"#d6336c", roseLid:"#ef5b8e", roseSide:"#a6234e",
         gold:"#ffc83d", goldEdge:"#b8801a", teal:"#5ff2d0",
         huntBody:"#46323e", huntLid:"#5a4250", huntSide:"#33242d",
         huntRed:"#ff4d5e"};
/* A world: sky gradient, its map colour, and the ground block's three faces. */
const W={
  nature:{top:"#1d3a58", bot:"#0e1c2e", col:"#35c2a5", lid:"#6fae5a", face:"#4c7a3e", side:"#3a5e30", num:"I"},
  fire:  {top:"#240a10", bot:"#6b1a08", col:"#e0455f", lid:"#7a594a", face:"#57403a", side:"#402e2a", num:"II"},
  water: {top:"#2a1e3c", bot:"#7a3a26", col:"#7fb2ff", lid:"#8fc0ff", face:"#5a86c8", side:"#44679c", num:"III"},
  desert:{top:"#3d3a52", bot:"#97703c", col:"#d9bd83", lid:"#e3c992", face:"#b09a6e", side:"#85734f", num:"IV"},
  extra: {top:"#0b0c16", bot:"#1a1830", col:"#3fc4d4"}
};

const S=1024;
const f=n=>n.toFixed(1);
const pts=a=>a.map(p=>f(p[0])+","+f(p[1])).join(" ");

/* An isometric cube whose TOP FACE is centred on (cx,ty), edge s. */
function cube(cx,ty,s,lid,face,side,edge,ew){
  const a=s*.866, b=s*.5;
  const top=[[cx,ty-b],[cx+a,ty],[cx,ty+b],[cx-a,ty]];
  const L=[[cx-a,ty],[cx,ty+b],[cx,ty+b+s],[cx-a,ty+s]];
  const R=[[cx,ty+b],[cx+a,ty],[cx+a,ty+s],[cx,ty+b+s]];
  const st=edge?` stroke="${edge}" stroke-width="${ew||S*.004}" stroke-linejoin="round"`:"";
  return `<polygon points="${pts(L)}" fill="${face}"${st}/>`+
         `<polygon points="${pts(R)}" fill="${side}"${st}/>`+
         `<polygon points="${pts(top)}" fill="${lid}"${st}/>`;
}
/* A flat slab: a cube squashed to height h, top face w wide. */
function slab(cx,ty,s,h,lid,face,side,edge){
  const a=s*.866, b=s*.5;
  const top=[[cx,ty-b],[cx+a,ty],[cx,ty+b],[cx-a,ty]];
  const L=[[cx-a,ty],[cx,ty+b],[cx,ty+b+h],[cx-a,ty+h]];
  const R=[[cx,ty+b],[cx+a,ty],[cx+a,ty+h],[cx,ty+b+h]];
  const st=edge?` stroke="${edge}" stroke-width="${S*.003}" stroke-linejoin="round"`:"";
  return `<polygon points="${pts(L)}" fill="${face}"${st}/><polygon points="${pts(R)}" fill="${side}"${st}/><polygon points="${pts(top)}" fill="${lid}"${st}/>`;
}
function star(cx,cy,r,fill,edge){
  const p=[];
  for(let i=0;i<10;i++){
    const ang=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.45:r;
    p.push([cx+Math.cos(ang)*rr, cy+Math.sin(ang)*rr]);
  }
  return `<polygon points="${pts(p)}" fill="${fill||C.gold}" stroke="${edge||C.goldEdge}" stroke-width="${f(r*.08)}" stroke-linejoin="round"/>`;
}
/* n stars on an arc over the middle. */
function stars(n,cy,r){
  let o="", span=n>3?.9:.62;
  for(let i=0;i<n;i++){
    const t=n===1?0:(i/(n-1)-.5)*span*2;
    const x=S/2+Math.sin(t)*S*.27, y=cy-Math.cos(t)*S*.06+S*.06;
    o+=star(x,y,r*(1-Math.abs(t)*.18));
  }
  return o;
}
function sky(id,w){
  return `<defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${w.top}"/><stop offset="1" stop-color="${w.bot}"/></linearGradient>
    <radialGradient id="r${id}" cx=".5" cy=".55" r=".5">
      <stop offset="0" stop-color="${w.col}" stop-opacity=".38"/>
      <stop offset="1" stop-color="${w.col}" stop-opacity="0"/></radialGradient></defs>
    <rect width="${S}" height="${S}" fill="url(#g${id})"/>
    <rect width="${S}" height="${S}" fill="url(#r${id})"/>`;
}
function ring(col,width){
  return `<circle cx="${S/2}" cy="${S/2}" r="${S*.45}" fill="none" stroke="${col}" stroke-width="${width||S*.022}" opacity=".95"/>`;
}
const player=(cx,ty,s)=>cube(cx,ty,s,C.roseLid,C.rose,C.roseSide,"#ffffff",S*.005);
function numeral(t,col){
  return `<text x="${S/2}" y="${S*.86}" text-anchor="middle" font-family="Space Grotesk" font-weight="700"
    font-size="${S*.1}" fill="${col}" letter-spacing="${S*.01}">${t}</text>`;
}
const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${body}</svg>`;

/* ---- the seven --------------------------------------------------------- */
function world(key){
  const w=W[key];
  return svg(sky(key,w)+ring(w.col)+
    stars(3,S*.16,S*.07)+
    slab(S/2,S*.5,S*.34,S*.08,w.lid,w.face,w.side,"rgba(255,255,255,.35)")+
    player(S/2,S*.35,S*.17)+
    numeral(w.num,w.col));
}
/* All four: the ground is four tiles, one per world, in map colours. */
function worlds(){
  const w={top:"#1b2340",bot:"#0c1020",col:"#ffffff"};
  const t=S*.2, a=t*.866, b=t*.5, ty=S*.5;
  const tiles=[["nature",0,-1],["fire",1,0],["water",-1,0],["desert",0,1]];
  let g="";
  for(const [k,dx,dy] of tiles){
    const q=W[k];
    g+=slab(S/2+dx*a,ty+dy*b,t,S*.06,q.lid,q.face,q.side,"rgba(255,255,255,.35)");
  }
  return svg(sky("all",w)+
    `<circle cx="${S/2}" cy="${S/2}" r="${S*.45}" fill="none" stroke="url(#arc4)" stroke-width="${S*.022}"/>
     <defs><linearGradient id="arc4" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="${W.nature.col}"/><stop offset=".33" stop-color="${W.fire.col}"/>
       <stop offset=".66" stop-color="${W.water.col}"/><stop offset="1" stop-color="${W.desert.col}"/></linearGradient></defs>`+
    stars(4,S*.16,S*.064)+g+player(S/2,S*.39,S*.14)+numeral("I-IV","#ffffff"));
}
/* Everything: the five worlds as the ring, a gold plinth, five stars. */
function everything(){
  const w={top:"#20182e",bot:"#0a0a14",col:C.gold};
  const cols=[W.nature.col,W.fire.col,W.water.col,W.desert.col,W.extra.col];
  const r=S*.45, cx=S/2, cy=S/2; let arcs="";
  for(let i=0;i<5;i++){
    const a0=-Math.PI/2+i*2*Math.PI/5+.06, a1=-Math.PI/2+(i+1)*2*Math.PI/5-.06;
    arcs+=`<path d="M${f(cx+r*Math.cos(a0))},${f(cy+r*Math.sin(a0))} A${r},${r} 0 0 1 ${f(cx+r*Math.cos(a1))},${f(cy+r*Math.sin(a1))}"
      fill="none" stroke="${cols[i]}" stroke-width="${S*.03}" stroke-linecap="round"/>`;
  }
  return svg(sky("ev",w)+arcs+stars(5,S*.16,S*.058)+
    slab(S/2,S*.5,S*.34,S*.08,"#ffd766","#d9a52c","#a87a18","rgba(255,255,255,.5)")+
    player(S/2,S*.35,S*.17)+numeral("ALL",C.gold));
}
/* Two in one: two of the pack in ONE column, the fold's teal line through
   both - the moment that pays the Domino. */
function double(){
  const w={top:"#1a1020",bot:"#0a0610",col:C.huntRed};
  const hunter=(cx,ty,s)=>
    `<rect x="${f(cx-s*1.05)}" y="${f(ty-s*.75)}" width="${f(s*2.1)}" height="${f(s*2.1)}" rx="${f(s*.3)}"
       fill="${C.huntRed}" opacity=".22" filter="url(#blur)"/>`+
    cube(cx,ty,s,C.huntLid,C.huntBody,C.huntSide,C.huntRed,S*.008);
  return svg(sky("dbl",w)+`<defs><filter id="blur"><feGaussianBlur stdDeviation="${S*.025}"/></filter></defs>`+
    ring(C.huntRed)+
    `<defs><linearGradient id="col" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.teal}" stop-opacity="0"/>
      <stop offset=".5" stop-color="${C.teal}" stop-opacity=".2"/><stop offset="1" stop-color="${C.teal}" stop-opacity="0"/></linearGradient></defs>
     <rect x="${S/2-S*.14}" y="${S*.06}" width="${S*.28}" height="${S*.88}" fill="url(#col)"/>`+
    hunter(S/2,S*.2,S*.15)+hunter(S/2,S*.52,S*.15)+
    `<line x1="${S*.2}" y1="${S*.49}" x2="${S*.8}" y2="${S*.49}" stroke="${C.teal}" stroke-width="${S*.014}" stroke-linecap="round"/>`+
    `<text x="${S/2}" y="${S*.88}" text-anchor="middle" font-family="Space Grotesk" font-weight="700"
      font-size="${S*.1}" fill="${C.teal}">×2</text>`);
}

const SET=[["world1",()=>world("nature")],["world2",()=>world("fire")],
  ["world3",()=>world("water")],["world4",()=>world("desert")],
  ["worlds",worlds],["everything",everything],["double",double]];

async function main(){
  fs.mkdirSync(OUT,{recursive:true});
  const fonts=fs.readFileSync(path.join(ROOT,"css","05-fonts.css"),"utf8");
  const page0=b=>`<!doctype html><html><head><style>${fonts}body{margin:0}</style></head><body>${b}</body></html>`;
  const {chromium}=loadPlaywright();
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:S,height:S}});
  for(const [id,draw] of SET){
    const s=draw();
    await page.setViewportSize({width:S,height:S});
    await page.setContent(page0(s)); await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(OUT,id+"-1024.png"),clip:{x:0,y:0,width:S,height:S}});
    await page.setViewportSize({width:512,height:512});
    await page.setContent(page0(`<div style="width:${S}px;height:${S}px;transform:scale(.5);transform-origin:0 0">${s}</div>`));
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(OUT,id+"-512.png"),clip:{x:0,y:0,width:512,height:512}});
    console.log("shots/achievements/"+id);
  }
  /* The sheet: each one masked to a circle, the way Game Center shows it. */
  const cell=s=>`<div style="display:inline-block;width:256px;height:256px;margin:12px;border-radius:50%;overflow:hidden">
    <div style="width:${S}px;height:${S}px;transform:scale(.25);transform-origin:0 0">${s}</div></div>`;
  await page.setViewportSize({width:1160,height:580});
  await page.setContent(page0(`<div style="background:#e9ecf1;padding:10px">${SET.map(x=>cell(x[1]())).join("")}</div>`));
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(OUT,"sheet.png"),clip:{x:0,y:0,width:1160,height:580}});
  console.log("shots/achievements/sheet.png");
  await browser.close();
}
main().catch(e=>{console.error(e);process.exit(1);});
