"use strict";
/* Copy the game into the Capacitor project's web root.
 *
 *   node tools/build-app.js          -> app/www/
 *
 * A COPY, NOT A BUNDLE, and that is the whole design. The game is classic
 * scripts loaded in the order index.html lists, with no build step; a WebView
 * is perfectly happy with that, and keeping the real files means a stack
 * trace from a tester names a line in a file you can open. dist/ is a
 * different job - build-single.js inlines everything into ONE file because
 * itch.io and the artifact host each want exactly one.
 *
 * The one thing it does beyond copying is stamp the commit, the same way
 * build-single.js does, so an installed APK can say in its menu which commit
 * it is. Without that, "the tester is on an old build" is a guess.
 */
const fs=require("fs"), path=require("path");
const ROOT=path.join(__dirname,"..");
const WWW=path.join(ROOT,"app","www");

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

console.log("app/www: "+files+" files, "+(bytes/1024).toFixed(0)+"KB");
console.log("build "+BUILD);
if(BUILD.indexOf("UNCOMMITTED")>=0)
  console.warn("!  built from a dirty tree - this APK cannot be re-derived");
