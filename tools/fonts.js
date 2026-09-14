"use strict";
/* Rebuild css/05-fonts.css from Google Fonts.
 *
 *   node tools/fonts.js
 *
 * The faces are carried in the file rather than fetched at run time, because
 * a WebView opens with no network on a first run and a game that falls back
 * to system faces is not the game the screenshots were tuned against. The
 * long version of that argument is at the top of css/05-fonts.css.
 *
 * ONE REQUEST PER WEIGHT, and that is the whole reason this script exists
 * rather than a line in a README. Asking for `wght@400;500;600` in one URL
 * hands back the family's VARIABLE file, referenced by three @font-face
 * blocks that differ only in their font-weight descriptor - and where the
 * weight axis is not applied (some WebViews, and the headless Chromium the
 * screenshots are taken with) every one of them renders at the lightest
 * weight, silently. Asked for one at a time, the same endpoint returns a
 * static instance per weight, which cannot be misread anywhere.
 *
 * Latin subset only. Every string in this game is English and the other
 * subsets are four fifths of the bytes.
 */
const https=require("https"), fs=require("fs"), path=require("path");
const ROOT=path.join(__dirname,"..");

/* A desktop Chrome UA, because the endpoint serves woff2 only to browsers it
   believes support it; asked as node, it answers with truetype. */
const UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "+
         "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const WANT=[
  ["IBM+Plex+Mono","IBM Plex Mono",400],
  ["IBM+Plex+Mono","IBM Plex Mono",500],
  ["IBM+Plex+Mono","IBM Plex Mono",600],
  ["Space+Grotesk","Space Grotesk",500],
  ["Space+Grotesk","Space Grotesk",700]
];

function get(url){
  return new Promise(function(res,rej){
    https.get(url,{headers:{"User-Agent":UA}},function(r){
      if(r.statusCode>=300&&r.statusCode<400&&r.headers.location)
        return get(r.headers.location).then(res,rej);
      if(r.statusCode!==200)return rej(new Error(url+" -> "+r.statusCode));
      var c=[];
      r.on("data",function(d){c.push(d);});
      r.on("end",function(){res(Buffer.concat(c));});
    }).on("error",rej);
  });
}

(async function(){
  const head=fs.readFileSync(path.join(ROOT,"tools","fonts-head.txt"),"utf8");
  let css="", total=0;
  const seen=new Set();
  for(const [q,fam,w] of WANT){
    const sheet=(await get("https://fonts.googleapis.com/css2?family="+q+
                           ":wght@"+w+"&display=swap")).toString();
    /* Each @font-face is preceded by a comment naming its subset. Match the
       pair, or the blocks and their names drift apart and you ship Cyrillic. */
    const m=sheet.match(/\/\*\s*latin\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/);
    if(!m)throw new Error("no latin face for "+fam+" "+w);
    const url=m[1].match(/url\(([^)]+)\)/)[1];
    if(seen.has(url))
      throw new Error("two weights share one file ("+fam+" "+w+"): that is the "+
                      "variable font, and its axis is not honoured everywhere");
    seen.add(url);
    const buf=await get(url);
    total+=buf.length;
    console.log(fam,w,(buf.length/1024).toFixed(1)+"KB");
    css+="@font-face{font-family:'"+fam+"';font-style:normal;font-weight:"+w+
         ";font-display:swap;src:url(data:font/woff2;base64,"+
         buf.toString("base64")+") format('woff2')}\n";
  }
  const out=path.join(ROOT,"css","05-fonts.css");
  fs.writeFileSync(out,head+css);
  console.log("\n"+WANT.length+" faces, "+(total/1024).toFixed(1)+"KB of woff2 -> "+
              (fs.statSync(out).size/1024).toFixed(1)+"KB of CSS");
})().catch(function(e){ console.error(e.message); process.exit(1); });
