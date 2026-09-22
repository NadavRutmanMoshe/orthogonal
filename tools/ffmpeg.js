"use strict";
/* WHERE FFMPEG IS - one copy, for every tool that needs it.
 *
 * It was written inside tools/promo-join.js, which was the only thing here
 * that needed ffmpeg at all. tools/video.js wants it now - it records the
 * picture with ffmpeg and the sound inside the page, and has to mux the two -
 * so by this project's own rule it moves to a file of its own. That rule is
 * tools/playwright.js's: the moment a second tool wants a helper, a second
 * copy of it is a copy that drifts.
 *
 * WHY IT IS NOT JUST "ffmpeg". A fresh `winget install Gyan.FFmpeg` puts the
 * shim on PATH for shells started AFTERWARDS, and the shell running this is
 * almost always one that was already open when the install happened. So PATH
 * is tried first and winget's own package directory second. Same shape of
 * problem as loadPlaywright()'s global lookup, and the same answer.
 */
const {execSync}=require("child_process");
const fs=require("fs"), os=require("os"), path=require("path");

function hunt(dir,name,depth){
  if(depth<0)return null;
  let ents;
  try{ ents=fs.readdirSync(dir,{withFileTypes:true}); }catch(e){ return null; }
  for(const e of ents)
    if(e.isFile()&&e.name.toLowerCase()===name) return path.join(dir,e.name);
  for(const e of ents){
    if(!e.isDirectory())continue;
    const hit=hunt(path.join(dir,e.name),name,depth-1);
    if(hit)return hit;
  }
  return null;
}

/* Returns a runnable ffmpeg, or exits saying how to get one. Pass
   {soft:true} to get null instead of an exit, for a caller that has
   something useful to do without it. */
function findFfmpeg(opt){
  try{
    execSync("ffmpeg -version",{stdio:"ignore"});
    return "ffmpeg";
  }catch(e){}
  const roots=[
    path.join(os.homedir(),"AppData","Local","Microsoft","WinGet","Packages"),
    path.join(os.homedir(),"AppData","Local","Microsoft","WinGet","Links")
  ];
  for(const r of roots){
    if(!fs.existsSync(r))continue;
    const hit=hunt(r,"ffmpeg.exe",4);
    if(hit)return hit;
  }
  if(opt&&opt.soft)return null;
  console.error("ffmpeg not found. Install it with:  winget install Gyan.FFmpeg");
  process.exit(2);
}

module.exports={findFfmpeg};
