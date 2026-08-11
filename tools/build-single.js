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
fs.mkdirSync(path.join(ROOT,"dist"),{recursive:true});
const out=path.join(ROOT,"dist",artifact?"orthogonal.artifact.html":"orthogonal.html");
fs.writeFileSync(out,html);
console.log("wrote "+out+"  ("+(fs.statSync(out).size/1024).toFixed(0)+" KB)");
