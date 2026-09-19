#!/usr/bin/env node
/* The owner's four phone takes, joined into the one file Play's promo slot
 * wants.
 *
 *     node tools/promo-join.js              shots/play/vid_*.mp4 -> promo.mp4
 *     node tools/promo-join.js --dir DIR    somewhere else
 *     node tools/promo-join.js --out F      a different name
 *
 * THE ORDER IS THE FILE NAMES, and that is the whole interface: the takes
 * are `vid_1.mp4` upward and they play in that order, so re-cutting the
 * promo is re-recording one take and running this. As shipped that order is
 * the studio sting, a fire puzzle folded and solved, BOSS I, TRIAL I.
 *
 * WHY THIS IS NOT tools/video.js. That one SCRIPTS the game in a headless
 * browser and re-records itself after the game changes, in landscape, with
 * no phone around it. This is four real takes off the owner's own phone,
 * with his thumb and his timing in them, and nothing here can regenerate
 * them - it can only join them again. Both assets are kept and the listing
 * doc says which to upload (docs/STORE-LISTING.md).
 *
 * WHY IT RE-ENCODES rather than copying the streams. The takes are variable
 * frame rate at 49, 57, 59 and 58fps, which is what a phone screen recorder
 * produces. The concat demuxer would copy them happily and hand the joins
 * four different timebases, which is how audio ends up drifting away from
 * the picture halfway through. One x264 pass at CRF 18 pins the whole thing
 * to constant 60fps; the loss off an already-compressed capture at that
 * quality is not visible, and 45 seconds of it is under 8MB.
 *
 * FFMPEG IS NOT VENDORED and this is the only tool that wants it - the game
 * itself has no media files at all and tools/video.js writes webm precisely
 * to avoid needing one. `winget install Gyan.FFmpeg` on Windows.
 */
const {execFileSync,execSync}=require("child_process");
const path=require("path"), fs=require("fs"), os=require("os");
const ROOT=path.join(__dirname,"..");

/* ffmpeg from PATH if it is there, and from winget's package directory if it
   is not - a fresh `winget install` adds the shim to PATH but not to the
   shell that is already running, which is the state this is usually first
   run in. Same shape of problem as loadPlaywright()'s global lookup. */
function findFfmpeg(){
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
  console.error("ffmpeg not found. Install it with:  winget install Gyan.FFmpeg");
  process.exit(2);
}
function hunt(dir,name,depth){
  if(depth<0)return null;
  let ents;
  try{ ents=fs.readdirSync(dir,{withFileTypes:true}); }catch(e){ return null; }
  for(const e of ents) if(e.isFile()&&e.name.toLowerCase()===name) return path.join(dir,e.name);
  for(const e of ents){
    if(!e.isDirectory())continue;
    const hit=hunt(path.join(dir,e.name),name,depth-1);
    if(hit)return hit;
  }
  return null;
}

function main(){
  const args=process.argv.slice(2);
  const pick=(f,d)=>{ const i=args.indexOf(f); return i>=0?args[i+1]:d; };
  const dir=path.resolve(ROOT,pick("--dir","shots/play"));
  const out=path.resolve(dir,pick("--out","promo.mp4"));

  /* Numeric, not lexical: vid_10 has to follow vid_9 rather than vid_1. */
  const takes=fs.readdirSync(dir)
    .filter(f=>/^vid_\d+\.mp4$/i.test(f))
    .sort((a,b)=>(+a.match(/\d+/)[0])-(+b.match(/\d+/)[0]));
  if(takes.length<2){
    console.error(`need at least two vid_N.mp4 in ${path.relative(ROOT,dir)} - found ${takes.length}`);
    process.exit(2);
  }

  /* The concat demuxer resolves a relative path against the LIST's directory,
     not the working one, so the list holds absolute paths and lives in the
     temp dir where it cannot be mistaken for an asset. */
  const list=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"promo-")),"list.txt");
  fs.writeFileSync(list,takes.map(f=>`file '${path.join(dir,f).replace(/\\/g,"/")}'`).join("\n"));

  const ff=findFfmpeg();
  console.log(takes.map((f,i)=>`  ${i+1}. ${f}`).join("\n"));
  execFileSync(ff,["-nostats","-v","warning","-y","-f","concat","-safe","0","-i",list,
    "-c:v","libx264","-crf","18","-preset","medium","-pix_fmt","yuv420p","-r","60",
    "-c:a","aac","-b:a","192k","-ar","44100","-ac","2",
    "-movflags","+faststart",out],{stdio:["ignore","inherit","inherit"]});

  const mb=(fs.statSync(out).size/1048576).toFixed(1);
  console.log(`\n${path.relative(ROOT,out)}  ${mb}MB`);
  console.log("Play takes a YouTube URL, not a file - this is what gets uploaded there.");
}
main();
