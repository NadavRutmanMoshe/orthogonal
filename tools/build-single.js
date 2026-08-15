"use strict";
/* Inline everything back into one self-contained HTML file.
 *
 *   node tools/build-single.js            -> dist/orthogonal.html
 *   node tools/build-single.js --vendor --artifact
 *                                        -> dist/orthogonal.artifact.html
 *
 * Useful for two things: uploading a single file to itch.io, and publishing
 * the whole game as a Claude artifact. three.js stays on the CDN to keep the
 * output small; pass --vendor to inline that too and get a file that works
 * with no network at all.
 *
 * --artifact emits page *content* rather than a document, because the artifact
 * host supplies its own <head>/<body> and the two would otherwise nest. It
 * implies you also want --vendor: an artifact runs under a CSP that blocks
 * every external host, so a CDN three.js there is not a slow load, it is no
 * game at all.
 */
const fs=require("fs"), path=require("path");
const ROOT=path.join(__dirname,"..");
const artifact=process.argv.includes("--artifact");
const inlineVendor=process.argv.includes("--vendor");

/* Which commit is this?
 *
 * The published build is the thing the owner plays, and rolling one back
 * means rebuilding the commit it came from. That only works if you can tell
 * which commit that was, and for a while you could not: a published artifact
 * was an anonymous 900KB file, and the only record of what was in it was
 * whoever happened to remember. One artifact was overwritten with a build
 * from the wrong branch precisely because nothing in either file said what
 * it was. See docs/HISTORY.md.
 *
 * Deliberately the commit and nothing else — no timestamp, no build number.
 * Rebuilding a given commit has to produce byte-identical output, because
 * that determinism is what turns "restore the old version" from a promise
 * into a diff you can check. A clock in the header would destroy it for no
 * gain. A dirty tree is reported as such rather than silently attributed to
 * the last commit, which would be a lie about a file nobody can re-derive.
 */
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
const BUILD=stamp();
if(artifact&&!inlineVendor)
  console.warn("!  --artifact without --vendor: the CSP will block three.js");
let html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

html=html.replace(/<link rel="stylesheet" href="css\/style.css">/,
  "<style>\n"+fs.readFileSync(path.join(ROOT,"css","style.css"),"utf8")+"\n</style>");

html=html.replace(/<script src="vendor\/three\.min\.js"><\/script>/,
  inlineVendor
    ? "<script>"+fs.readFileSync(path.join(ROOT,"vendor","three.min.js"),"utf8")+"<\/script>"
    : '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>');

html=html.replace(/<script src="js\/([^"]+)"><\/script>/g,(m,f)=>
  "<script>\n"+fs.readFileSync(path.join(ROOT,"js",f),"utf8")+"\n<\/script>");

if(artifact){
  // Unwrap the document. The viewport meta deliberately survives: it carries
  // maximum-scale/user-scalable, which is what keeps the browser's own
  // two-finger zoom off the two-finger turn gesture. The font links do not -
  // the CSP blocks them, and the stylesheet already falls back to system
  // faces, so all they would buy is console noise.
  html=html.replace(/<!DOCTYPE html>\s*/i,"")
           .replace(/<html[^>]*>\s*/i,"")
           .replace(/<\/html>\s*/i,"")
           .replace(/<\/?head>\s*/gi,"")
           .replace(/<body[^>]*>\s*/i,"")
           .replace(/<\/body>\s*/i,"")
           .replace(/<link rel="preconnect"[^>]*>\s*/gi,"")
           .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/gi,"");
}
/* Readable in the file, and readable from the running page. Both, because
   they answer different questions: the comment tells you what a downloaded
   build is without opening a browser, and `BUILD` lets a check against the
   live artifact ask the page itself rather than trusting a filename. */
html="<!-- orthogonal build "+BUILD+" -->\n"+
     "<script>var BUILD="+JSON.stringify(BUILD)+";<\/script>\n"+html;

fs.mkdirSync(path.join(ROOT,"dist"),{recursive:true});
const out=path.join(ROOT,"dist",artifact?"orthogonal.artifact.html":"orthogonal.html");
fs.writeFileSync(out,html);
console.log("wrote "+out+"  ("+(fs.statSync(out).size/1024).toFixed(0)+" KB)");
console.log("build "+BUILD);
if(BUILD.indexOf("UNCOMMITTED")>=0)
  console.warn("!  uncommitted changes: this build cannot be re-derived from a commit.\n"+
               "   Commit before publishing, or the way back is gone.");
