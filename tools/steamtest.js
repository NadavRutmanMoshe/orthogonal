"use strict";
/* The Steam build, driven for real: desktop/ launched as Electron by
 * Playwright, in a throwaway data folder (IJAC_DATA), and asked the questions a player's
 * first two launches would ask.
 *
 *   node tools/steamtest.js            (after `npm install` in desktop/)
 *   node tools/steamtest.js --packaged (the .exe from `npm run dist:test`)
 *
 * --packaged is the one that matters before an upload: it runs the exe
 * electron-builder made, so the asar, the unpacked steamworks.js and its
 * steam_api64.dll are all the shipped ones.
 *
 * It needs no Steam and expects none: steamworks.js fails to start, which
 * is the development path main.js is written to survive, and the
 * achievements it would have sent are read off main.js's own log. What it
 * cannot test is Steam ANSWERING - that takes the real App ID, Steam running
 * and the achievements defined in Steamworks (desktop/README.md).
 *
 * What it proves:
 *   - the page knows it is the Steam build (window.STEAM, steamBuild(),
 *     every paid shape owned, no age card),
 *   - the save goes to <data>/local/save.json and NOT to
 *     localStorage, and comes back on the next launch,
 *   - achievements are derived from the save: a world's records, a boss,
 *     a reward shape, each reported once,
 *   - the window asked for full screen and remembered it. */
const path=require("path"), fs=require("fs"), os=require("os");
const {loadPlaywright}=require("./playwright");
const {_electron:electron}=loadPlaywright();

const ROOT=path.join(__dirname,"..");
const DESK=path.join(ROOT,"desktop");
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),"ijac-steam-"));
const SAVE=path.join(TMP,"ImJustACube","local","save.json");
const PACKAGED=process.argv.includes("--packaged");
const EXE=path.join(DESK,"dist","win-unpacked","ImJustACube.exe");

let pass=0, fail=0;
function check(what,ok,extra){
  if(ok){pass++;console.log("  ok   "+what);}
  else{fail++;console.log("  FAIL "+what+(extra!==undefined?"  ("+extra+")":""));}
}

async function launch(){
  const app=await electron.launch({
    cwd:DESK,args:PACKAGED?[]:["."],
    executablePath:PACKAGED?EXE:require(path.join(DESK,"node_modules","electron")),
    env:Object.assign({},process.env,{IJAC_DATA:path.join(TMP,"ImJustACube")})
  });
  const log=[];
  app.process().stdout.on("data",d=>log.push(String(d)));
  app.process().stderr.on("data",d=>log.push(String(d)));
  const page=await app.firstWindow();
  await page.waitForFunction(()=>typeof progress!=="undefined"&&typeof steamAchSync==="function"&&
    document.getElementById("splash")!==null,null,{timeout:30000});
  await page.waitForTimeout(1500);   // the boot promise, the sweeps
  return {app,page,log};
}

(async()=>{
  if(PACKAGED&&!fs.existsSync(EXE)){
    console.error("no packaged build: cd desktop && npm run dist:test");process.exit(2);
  }
  if(!PACKAGED&&!fs.existsSync(path.join(DESK,"www","index.html"))){
    console.error("desktop/www is empty: node tools/build-app.js --desktop");process.exit(2);
  }
  console.log("first launch  (data in "+TMP+")");
  let {app,page,log}=await launch();

  const s=await page.evaluate(()=>({
    STEAM:window.STEAM, steam:steamBuild(), desk:deskMode(),
    bridge:!!(window.steamBridge&&window.steamBridge.achieve),
    rook:owns("rook"), pass:noLimits(),
    ageCard:document.getElementById("intro").classList.contains("gone")?"gone":"up",
    full:!!document.fullscreenElement
  }));
  check("window.STEAM is set",s.STEAM===true);
  check("steamBuild() and deskMode()",s.steam&&s.desk);
  check("the achievement bridge is there",s.bridge);
  check("every paid shape owned, and NO LIMITS",s.rook&&s.pass);
  check("no age card on a first run",s.ageCard==="gone");
  check("the page went full screen",s.full);
  /* steamworks.js must LOAD even with no Steam to talk to: a missing
     steam_api64.dll or a .node left inside the asar fails at require(),
     which is a different message from Steam not answering init(). */
  const why=await page.evaluate(()=>window.steamBridge.why);
  check("steamworks.js loaded (only Steam itself is missing)",
    !/cannot find module|specified module could not be found|\.node/i.test(why),why);
  if(why)console.log("       steamworks.js says: "+why);

  // A record in every scoreable level of I · NATURE, BOSS I among them.
  const earned=await page.evaluate(()=>{
    var n=SECTIONS[1], to=SECTIONS[2].at;
    for(var i=n.at;i<to;i++)if(!LEVELS[i].tutorial)progress[LEVELS[i].name]=99;
    progSave();
    grantShape("domino");
    return STEAM_ACH.filter(steamAchEarned).map(a=>a.id);
  });
  check("world I + boss I + the Domino are earned",
    earned.join(",")==="WORLD_1,BOSS_1,DOMINO",earned.join(","));
  await page.waitForTimeout(400);
  const sent=log.join("").match(/would unlock: ([^\n]*)/g)||[];
  const ids=sent.join(" ").replace(/would unlock: /g,"").trim().split(/\s+/).filter(Boolean).sort();
  check("main.js was told, each once",ids.join(",")==="BOSS_1,DOMINO,WORLD_1",ids.join(","));

  const ls=await page.evaluate(()=>{
    var n=0;for(var i=0;i<localStorage.length;i++)if(/^orthogonal:/.test(localStorage.key(i)))n++;return n;
  });
  check("nothing written to localStorage",ls===0,ls);

  await page.evaluate(()=>document.exitFullscreen&&document.exitFullscreen());
  await page.waitForTimeout(300);
  await app.close();

  let file=null;
  try{file=JSON.parse(fs.readFileSync(SAVE,"utf8"));}catch(e){}
  check("save.json written on the way out",!!file,SAVE);
  const prog=file&&file.keys&&Object.keys(file.keys).find(k=>/progress/.test(k));
  check("it holds the progress key",!!prog,file&&Object.keys(file.keys).join(","));
  let prefs={};try{prefs=JSON.parse(fs.readFileSync(path.join(TMP,"ImJustACube","prefs.json"),"utf8"));}catch(e){}
  check("leaving full screen is remembered",prefs.full===false,JSON.stringify(prefs));

  console.log("second launch");
  ({app,page,log}=await launch());
  const back=await page.evaluate(()=>({
    rec:progress[LEVELS[SECTIONS[2].at-1].name], dom:wardrobe.owned.indexOf("domino")>=0,
    full:!!document.fullscreenElement, home:document.body.classList.contains("athome")
  }));
  check("progress came back from the file",back.rec===99,back.rec);
  check("the Domino came back",back.dom);
  check("still windowed, as left",!back.full);
  const again=(log.join("").match(/would unlock: ([^\n]*)/)||[])[1]||"";
  check("the boot sweep re-reports the earned set (Steam dedupes)",
    again.split(/\s+/).sort().join(",")==="BOSS_1,DOMINO,WORLD_1",again);
  await app.close();

  fs.rmSync(TMP,{recursive:true,force:true});
  console.log("\n"+pass+" passed, "+fail+" failed");
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
