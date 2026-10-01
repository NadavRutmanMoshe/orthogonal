"use strict";
/* The music, rendered to a file you can listen to, and measured.
 *
 *   node tools/music.js               -> shots/music/music.wav (2 minutes) and mix.wav
 *   node tools/music.js --secs 300    -> five minutes of it
 *   node tools/music.js --level 0.8   -> as if MUSIC_LEVEL were 0.8 (try a mix without
 *                                        editing the file)
 *   node tools/music.js --stems       -> and the pad, the bass and the bells measured alone
 *
 * WHY THIS EXISTS. Music is the one thing in this game a screenshot cannot
 * check and a playtest is slow to: a level is heard over minutes, and "is it
 * too loud under a footstep" is a number before it is an opinion. So this
 * runs the real page headless, swaps the audio context for an
 * OfflineAudioContext (the game's whole chain is rebuilt on it - limiter,
 * clipper, volume), and renders as fast as the machine can:
 *
 *   music.wav   the music alone, from the first chord
 *   mix.wav     the same with a minute of somebody playing over it - steps,
 *               turns, a fold and back, a win - so the balance is the one a
 *               player hears
 *
 * and prints the levels next to a footstep's, through the same chain at the
 * same volume (1.0, a phone's default). Nothing in the game knows it is being
 * recorded: the music is the same functions musTick() calls, asked to
 * schedule the whole length at once instead of 2.5 seconds at a time.
 *
 * The game sounds in the mix are called at their moments by suspending the
 * offline render (OfflineAudioContext.suspend), which is how tools/clock.js
 * films the promo. Anything that times itself with setTimeout cannot be
 * driven that way, so unfold's three notes and the win's four are called
 * one blip at a time here, at the spacing SFX gives them.
 */
const fs=require("fs"), path=require("path");
const {loadPlaywright}=require("./playwright.js");
const ROOT=path.join(__dirname,"..");

const args=process.argv.slice(2);
function opt(name,def){const i=args.indexOf(name);return i>=0?args[i+1]:def;}
const SECS=+opt("--secs",120), LEVEL=opt("--level",null), SR=44100;
const OUT=path.join(ROOT,"shots","music");

/* A minute of somebody playing, as [seconds, what]. Bursts of steps with
   gaps to think in, which is what a puzzle sounds like. */
function playScript(){
  const ev=[]; let t=8;
  for(let b=0;b<9;b++){
    const n=2+(b*7)%5;
    for(let i=0;i<n;i++){ev.push([t,"step"]);t+=.32+(i%2)*.1;}
    t+=1.4;
    if(b%3===1){ev.push([t,"turn"]);t+=.9;}
    if(b%3===2){ev.push([t,"fold"]);t+=1.6;ev.push([t,"unfold"]);t+=1.2;}
    t+=2.5+(b*3)%4;
  }
  ev.push([t,"win"]);
  return ev;
}

function unpack(r){
  const b=Buffer.from(r.pcm,"base64"), n=b.length/4, ch=[new Float32Array(n),new Float32Array(n)];
  for(let i=0;i<n;i++){ch[0][i]=b.readInt16LE(i*4)/32767;ch[1][i]=b.readInt16LE(i*4+2)/32767;}
  r.ch=ch;r.raw=b;return r;
}
function wav(raw,sr){
  const h=Buffer.alloc(44);
  h.write("RIFF",0);h.writeUInt32LE(36+raw.length,4);h.write("WAVE",8);
  h.write("fmt ",12);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(2,22);
  h.writeUInt32LE(sr,24);h.writeUInt32LE(sr*4,28);h.writeUInt16LE(4,32);h.writeUInt16LE(16,34);
  h.write("data",36);h.writeUInt32LE(raw.length,40);
  return Buffer.concat([h,raw]);
}
function db(x){return x>0?(20*Math.log10(x)).toFixed(1)+" dBFS":"-inf";}
/* WHAT A PHONE SPEAKER PLAYS. A phone's speaker has next to nothing below
   about 400Hz, so a level that counts the bass is a level for headphones -
   and the first mix of this music was 97% bass by energy, which read as a
   sensible -26 dBFS here and would have been close to silent on the phone.
   So every level is also given through a 400Hz high-pass (two Butterworth
   biquads, 24 dB an octave), on the mono sum a phone's one speaker gets. */
function highpass(x,f){
  const w=2*Math.PI*f/SR, cs=Math.cos(w), al=Math.sin(w)/(2*Math.SQRT1_2),
        a0=1+al, b0=(1+cs)/2/a0, b1=-(1+cs)/a0, b2=b0, a1=-2*cs/a0, a2=(1-al)/a0;
  let y=x;
  for(let pass=0;pass<2;pass++){
    const o=new Float32Array(y.length);let x1=0,x2=0,y1=0,y2=0;
    for(let i=0;i<y.length;i++){
      const v=b0*y[i]+b1*x1+b2*x2-a1*y1-a2*y2;
      x2=x1;x1=y[i];y2=y1;y1=v;o[i]=v;
    }
    y=o;
  }
  return y;
}
function level(x,from,to){
  let pk=0,ss=0,win=Math.floor(SR*.4),loud=0,acc=0,q=[];
  for(let i=from;i<to;i++){
    const a=Math.abs(x[i]);if(a>pk)pk=a;
    const s=x[i]*x[i];ss+=s;acc+=s;q.push(s);
    if(q.length>win)acc-=q.shift();
    if(q.length===win&&acc/win>loud)loud=acc/win;
  }
  return {peak:pk,rms:Math.sqrt(ss/(to-from)),loud:Math.sqrt(loud)};
}
function stats(ch,from,to){
  from=from||0;to=to||ch[0].length;
  let clip=0;
  const mono=new Float32Array(ch[0].length);
  for(let i=0;i<mono.length;i++){
    mono[i]=(ch[0][i]+ch[1][i])/2;
    if(i>=from&&i<to&&Math.max(Math.abs(ch[0][i]),Math.abs(ch[1][i]))>.99)clip++;
  }
  return {all:level(mono,from,to),phone:level(highpass(mono,400),from,to),clip:clip};
}
function report(name,s){
  const row=(k,v)=>"peak "+db(v.peak).padEnd(12)+"rms "+db(v.rms).padEnd(12)+"loudest 0.4s "+db(v.loud);
  console.log("  "+name.padEnd(10)+row("all",s.all)+"   "+(s.clip?s.clip+" samples over .99":"no clipping"));
  console.log("  "+"".padEnd(10)+row("phone",s.phone)+"   (above 400Hz: a phone speaker)");
}

(async()=>{
  const pw=loadPlaywright();
  const browser=await pw.chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader",
    "--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"]});
  const page=await browser.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  await page.route(/^https?:/,r=>r.abort());
  await page.goto("file://"+path.join(ROOT,"index.html"));
  await page.waitForFunction(()=>typeof musFill==="function"&&typeof SFX!=="undefined");
  await page.waitForTimeout(600);

  /* One render in the page. Every piece of the chain is a global that audio()
     builds once, so they are dropped and rebuilt on the offline context. */
  async function render(secs,withMusic,script,only){
    return page.evaluate(async({secs,withMusic,script,sr,level,only})=>{
      if(MUS.timer){clearInterval(MUS.timer);MUS.timer=0;}
      if(level!==null)MUSIC_LEVEL=+level;
      const off=new OfflineAudioContext(2,Math.ceil(secs*sr),sr);
      /* audio() resumes any context it finds suspended - right for a page,
         wrong here, where a suspended render is a held breath: resuming it
         from inside a blip lets the render run on before the blip has been
         scheduled, and the sound lands late or not at all. So the render is
         resumed by this tool and nobody else. */
      const go=off.resume.bind(off);
      off.resume=function(){return Promise.resolve();};
      actx=off;masterGain=null;limiter=null;postGain=null;shaper=null;outGain=null;
      reverbNode=null;sfxNoise=null;
      MUS.ctx=null;MUS.bus=null;MUS.t0=0;MUS.live=[];
      muted=false;settings.volume=1;settings.music=MUSIC_DEFAULT;
      audio();
      const log=[];
      if(withMusic){
        musStart(off);
        const pad=musPad, bell=musBell, bass=musBass;
        musPad=function(c,at,dur,ch){log.push(["chord",+at.toFixed(2),dur,
          Object.keys(MUS.piece.chords).find(k=>MUS.piece.chords[k]===ch)]);
          if(!only||only==="pad")pad(c,at,dur,ch);};
        musBell=function(c,at,m){log.push(["bell",+at.toFixed(2),m]);
          if(!only||only==="bell")bell.apply(null,arguments);};
        musBass=function(){if(!only||only==="bass")bass.apply(null,arguments);};
        musFill(off,secs-6);
        musPad=pad;musBell=bell;musBass=bass;
      }
      const at={};
      function on(t,f){t=Math.round(t*sr/128)*128/sr;(at[t]=at[t]||[]).push(f);}
      (script||[]).forEach(([t,what])=>{
        if(what==="unfold"){
          on(t,()=>blip(196,.5,"sine",.05,392));
          on(t+.07,()=>blip(392,.34,"sine",.04,588));
          on(t+.15,()=>blip(588,.3,"triangle",.028));
        }else if(what==="win"){
          [523,659,784,1047].forEach((f,i)=>on(t+i*.095,()=>blip(f,.4,"sine",.05)));
        }else on(t,()=>SFX[what]());
      });
      Object.keys(at).forEach(k=>{
        off.suspend(+k).then(()=>{at[k].forEach(f=>f());go();});
      });
      const t0=performance.now();
      const buf=await off.startRendering();
      const ms=performance.now()-t0;
      /* Handed back as 16-bit PCM in base64, not as arrays of numbers: two
         minutes of stereo is ten million floats, which is far too much JSON. */
      const L0=buf.getChannelData(0), R0=buf.getChannelData(1), n=L0.length,
            pcm=new Int16Array(n*2);
      for(let i=0;i<n;i++){
        pcm[i*2]=Math.max(-32768,Math.min(32767,Math.round(L0[i]*32767)));
        pcm[i*2+1]=Math.max(-32768,Math.min(32767,Math.round(R0[i]*32767)));
      }
      const u8=new Uint8Array(pcm.buffer);let bin="";
      for(let i=0;i<u8.length;i+=32768)bin+=String.fromCharCode.apply(null,u8.subarray(i,i+32768));
      return {ms:ms,log:log,pcm:btoa(bin)};
    },{secs,withMusic,script,sr:SR,level:LEVEL,only:only||null});
  }

  fs.mkdirSync(OUT,{recursive:true});
  const step=unpack(await render(1,false,[[.1,"step"]]));
  const music=unpack(await render(SECS,true,null));
  const script=playScript();
  const mixLen=Math.ceil(script[script.length-1][0]+8);   // its own length, whatever --secs says
  const mix=unpack(await render(mixLen,true,script));
  fs.writeFileSync(path.join(OUT,"music.wav"),wav(music.raw,SR));
  fs.writeFileSync(path.join(OUT,"mix.wav"),wav(mix.raw,SR));

  const chords=music.log.filter(e=>e[0]==="chord"), bells=music.log.filter(e=>e[0]==="bell");
  console.log("music.wav  "+SECS+"s, rendered in "+(music.ms/1000).toFixed(1)+"s ("+
    (SECS*1000/music.ms).toFixed(0)+"x real time, with the game drawing beside it)");
  console.log("  chords   "+chords.map(c=>c[3]).join(" "));
  console.log("  bells    "+bells.length+" notes, one every "+(SECS/Math.max(1,bells.length)).toFixed(1)+"s");
  console.log("levels, at volume 1.0 (a phone's default):");
  report("footstep",stats(step.ch));
  report("music",stats(music.ch,SR*8));     // past the fade-in
  report("mix",stats(mix.ch));
  if(args.indexOf("--stems")>=0){
    console.log("each instrument alone, 40s:");
    for(const k of ["pad","bass","bell"])report(k,stats(unpack(await render(40,true,null,k)).ch,SR*8));
  }
  console.log("wrote "+path.relative(ROOT,path.join(OUT,"music.wav"))+" and mix.wav ("+mixLen+"s)");
  if(errors.length)console.log("page errors:\n  "+errors.join("\n  "));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
