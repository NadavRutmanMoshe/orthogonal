"use strict";
/* Copy the game into the Capacitor project's web root.
 *
 *   node tools/build-app.js          -> app/www/ AND the Android assets
 *   node tools/build-app.js --desktop -> desktop/www/, for the Steam build
 *
 * --desktop is the same copy into the Electron shell (desktop/, see its
 * README). One copier for both wrappers, so the two can never disagree about
 * what "the game" is - which files, which order, which stamp.
 *
 * A COPY, NOT A BUNDLE, and that is the whole design. The game is classic
 * scripts loaded in the order index.html lists, with no build step; a WebView
 * is perfectly happy with that, and keeping the real files means a stack
 * trace from a tester names a line in a file you can open. dist/ is a
 * different job - build-single.js inlines everything into ONE file because
 * itch.io and the artifact host each want exactly one.
 *
 * IT COPIES TWICE, and the second one is the bug this file used to have.
 * `app/www` is Capacitor's web root and `npx cap copy` is what normally
 * carries it into `app/android/app/src/main/assets/public`, which is what
 * the APK actually reads - but there is no node_modules here and so no
 * `cap` to run. Writing only www meant gradle had nothing new to build,
 * reported success, and installed an APK of whatever the assets happened to
 * hold last time. That is the worst shape a build bug can have: it looks
 * like it worked. The copy is all `cap copy` does for web assets anyway.
 *
 * The one thing it does beyond copying is stamp the commit, the same way
 * build-single.js does, so an installed APK can say in its menu which commit
 * it is. Without that, "the tester is on an old build" is a guess.
 */
const fs=require("fs"), path=require("path");
const ROOT=path.join(__dirname,"..");
const DESKTOP=process.argv.includes("--desktop");
const WWW=DESKTOP?path.join(ROOT,"desktop","www"):path.join(ROOT,"app","www");

function stamp(){
  const git=a=>require("child_process")
    .execFileSync("git",a,{cwd:ROOT,encoding:"utf8"}).trim();
  try{
    const dirty=git(["status","--porcelain"])!=="";
    return git(["rev-parse","--short","HEAD"])+
           " ("+git(["rev-parse","--abbrev-ref","HEAD"])+")"+
           (dirty?" +UNCOMMITTED CHANGES":"");
  }catch(e){ return "unknown (not a git checkout)"; }
}

/* Emptied rather than merged: a file deleted from css/ or js/ has to leave
   the WebView too, and a stale script in a folder the page no longer lists
   is the kind of thing that only shows up as a bug nobody can reproduce. */
function empty(dir){
  if(!fs.existsSync(dir))return;
  for(const n of fs.readdirSync(dir))
    fs.rmSync(path.join(dir,n),{recursive:true,force:true});
}
function copyDir(from,to){
  fs.mkdirSync(to,{recursive:true});
  let n=0;
  for(const e of fs.readdirSync(from,{withFileTypes:true})){
    const a=path.join(from,e.name), b=path.join(to,e.name);
    if(e.isDirectory())n+=copyDir(a,b);
    else{ fs.copyFileSync(a,b); n++; }
  }
  return n;
}

fs.mkdirSync(WWW,{recursive:true});
empty(WWW);

let files=0;
for(const d of ["css","js","vendor"])
  files+=copyDir(path.join(ROOT,d),path.join(WWW,d));

/* The stamp goes in as a <script> before everything else, exactly as
   build-single.js writes it, so menuPanel() reads the same global either way
   and neither build has a special case. */
let html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
const BUILD=stamp();
html=html.replace(/<head>/,
  "<head>\n<!-- I'm Just A Cube, app build "+BUILD+" -->\n"+
  "<script>var BUILD="+JSON.stringify(BUILD)+";<\/script>");
fs.writeFileSync(path.join(WWW,"index.html"),html);
files++;

const bytes=(function size(d){
  let t=0;
  for(const e of fs.readdirSync(d,{withFileTypes:true})){
    const p=path.join(d,e.name);
    t+=e.isDirectory()?size(p):fs.statSync(p).size;
  }
  return t;
})(WWW);

/* Into the APK's own asset tree, which is the copy that ships. Removed
   first rather than written over: a file deleted from the game has to
   disappear from the app too, and a merge would leave it installed. */
const ASSETS=path.join(ROOT,"app","android","app","src","main","assets","public");
let synced=0;
if(!DESKTOP&&fs.existsSync(path.dirname(ASSETS))){
  fs.rmSync(ASSETS,{recursive:true,force:true});
  synced=copyDir(WWW,ASSETS);
}

console.log(path.relative(ROOT,WWW).split(path.sep).join("/")+": "+files+" files, "+(bytes/1024).toFixed(0)+"KB");
if(synced)console.log("android assets: "+synced+" files");
else if(!DESKTOP)console.warn("!  no android project at app/android - www only");
console.log("build "+BUILD);
if(BUILD.indexOf("UNCOMMITTED")>=0)
  console.warn("!  built from a dirty tree - "+(DESKTOP?"this Steam build":"this APK")+" cannot be re-derived");
/* TEST ADS PAY NOTHING. Right while testing, and a release that ships with
   them earns zero without a single error anywhere, so every build says so. */
if(/var TEST_CARD=true/.test(fs.readFileSync(path.join(ROOT,"js","16-panels.js"),"utf8")))
  console.warn("!  TEST_CARD is true in js/16-panels.js - the Testing card is on the settings sheet");
// The Steam build has no ads, so the ad switch is not its question.
if(!DESKTOP&&/var AD_TEST=true/.test(fs.readFileSync(path.join(ROOT,"js","24-ads.js"),"utf8")))
  console.warn("!  AD_TEST is true in js/24-ads.js - Google's test ads, no revenue");
