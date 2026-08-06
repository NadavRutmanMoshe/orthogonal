"use strict";
/* Inline everything back into one self-contained HTML file.
 *
 *   node tools/build-single.js            -> dist/orthogonal.html
 *
 * Useful for two things: uploading a single file to itch.io, and pasting the
 * whole game back into a Claude chat as one artifact. three.js stays on the
 * CDN to keep the output small; pass --vendor to inline that too and get a
 * file that works with no network at all.
 */
const fs=require("fs"), path=require("path");
const ROOT=path.join(__dirname,"..");
const inlineVendor=process.argv.includes("--vendor");
let html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");

html=html.replace(/<link rel="stylesheet" href="css\/style.css">/,
  "<style>\n"+fs.readFileSync(path.join(ROOT,"css","style.css"),"utf8")+"\n</style>");

html=html.replace(/<script src="vendor\/three\.min\.js"><\/script>/,
  inlineVendor
    ? "<script>"+fs.readFileSync(path.join(ROOT,"vendor","three.min.js"),"utf8")+"<\/script>"
    : '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>');

html=html.replace(/<script src="js\/([^"]+)"><\/script>/g,(m,f)=>
  "<script>\n"+fs.readFileSync(path.join(ROOT,"js",f),"utf8")+"\n<\/script>");

fs.mkdirSync(path.join(ROOT,"dist"),{recursive:true});
const out=path.join(ROOT,"dist","orthogonal.html");
fs.writeFileSync(out,html);
console.log("wrote "+out+"  ("+(fs.statSync(out).size/1024).toFixed(0)+" KB)");
