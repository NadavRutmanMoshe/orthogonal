"use strict";
/* A CLOCK THAT ONLY MOVES WHEN IT IS TOLD TO - the thing that makes
 * tools/video.js film without dropping a frame.
 *
 * WHY. Every earlier way this project filmed itself was a camera pointed at
 * a page running in real time: Playwright's recorder, the tab capture, and
 * ffmpeg grabbing the desktop. All three can only film what the page manages
 * to draw, and on the owner's laptop (a GeForce MX230, or SwiftShader, which
 * is software GL) a 1920x1080 WebGL page does not manage sixty frames a
 * second. So the film juddered, and no setting on the recorder could fix it,
 * because the frames it was missing had never been drawn.
 *
 * So time is taken away from the page. This is installed as an init script,
 * before any of the game runs, and replaces every clock the game can read:
 * performance.now(), Date, setTimeout and setInterval, requestAnimationFrame,
 * requestIdleCallback, the CSS animations and transitions, and the
 * AudioContext. Nothing moves until the driver calls __cap.step(), which
 * moves all of them forward by exactly one frame. The driver photographs the
 * frame, then steps again. A frame that takes half a second to draw still
 * lands exactly 1/60s after the one before it in the film - slow to MAKE,
 * perfect to watch.
 *
 * THE SOUND IS RENDERED, NOT RECORDED. A real AudioContext plays in real
 * time, which is the one thing this clock refuses to do. So the game is
 * handed an OfflineAudioContext wearing an AudioContext's face (it always
 * says "running", and resume/suspend are no-ops), and each step renders
 * exactly the audio that falls inside that frame - suspend() at the frame's
 * time, resume(), wait. The game schedules its blips against currentTime as
 * it always does, and currentTime IS the film's clock, so the sound cannot
 * drift off the picture: there was only ever one clock.
 *
 * WHAT IT DOES NOT COVER. Anything the page reads that is not listed above -
 * event.timeStamp, document.timeline, a <video> element - still runs on real
 * time. The game uses none of them for anything a viewer would see.
 */
function clockScript(opt){
  return `(${install.toString()})(${JSON.stringify(opt||{})});`;
}

function install(opt){
  var FPS=opt.fps||60, DT=1000/FPS;
  var SR=48000, AUDIO_S=opt.audioSeconds||200;
  var realPerfNow=performance.now.bind(performance);
  var RealDate=Date, realSetTimeout=setTimeout;
  var epoch0=RealDate.now(), vt=realPerfNow(), vt0=vt;
  var cap=window.__cap={fps:FPS, dt:DT, errors:0};
  cap.now=function(){ return vt; };

  function report(e){
    cap.errors++;
    // Thrown on a REAL task, so Playwright's pageerror sees it as it would
    // any other uncaught error in the game.
    realSetTimeout(function(){ throw e; },0);
  }
  /* A real macrotask, cheap: lets every promise a callback started settle
     before the next callback runs, the way the browser's own queue would. */
  var mc=new MessageChannel(), waiting=[];
  mc.port1.onmessage=function(){ var r=waiting.shift(); if(r)r(); };
  function yieldTask(){ return new Promise(function(r){ waiting.push(r); mc.port2.postMessage(0); }); }

  /* ---- the clocks you read ---- */
  performance.now=function(){ return vt; };
  function epochNow(){ return epoch0+(vt-vt0); }
  class FakeDate extends RealDate{
    constructor(...a){ if(a.length)super(...a); else super(epochNow()); }
    static now(){ return epochNow(); }
  }
  window.Date=FakeDate;

  /* ---- timers ---- */
  var timers=[], seq=0, nextId=1;
  function addTimer(fn,ms,args,every){
    if(typeof fn==="string"){ var src=fn; fn=function(){ (0,eval)(src); }; }
    var id=nextId++;
    // At least a millisecond: a 0ms timer that re-arms itself would
    // otherwise run forever inside a single step.
    var d=Math.max(1,+ms||0);
    timers.push({id:id,at:vt+d,seq:seq++,fn:fn,args:args,every:every?d:0});
    return id;
  }
  function clearTimer(id){
    for(var i=0;i<timers.length;i++) if(timers[i].id===id){ timers.splice(i,1); return; }
  }
  window.setTimeout=function(fn,ms,...a){ return addTimer(fn,ms,a,false); };
  window.setInterval=function(fn,ms,...a){ return addTimer(fn,ms,a,true); };
  window.clearTimeout=window.clearInterval=clearTimer;
  window.requestIdleCallback=function(cb){
    return addTimer(function(){ cb({didTimeout:false,timeRemaining:function(){return 10;}}); },1,[],false);
  };
  window.cancelIdleCallback=clearTimer;
  function dueTimer(limit){
    var best=null, bi=-1;
    for(var i=0;i<timers.length;i++){
      var t=timers[i];
      if(t.at>limit)continue;
      if(!best||t.at<best.at||(t.at===best.at&&t.seq<best.seq)){ best=t; bi=i; }
    }
    if(!best)return null;
    if(best.every){ best.at+=best.every; best.seq=seq++; }
    else timers.splice(bi,1);
    return best;
  }

  /* ---- frames ---- */
  var rafs=[], rafId=1;
  window.requestAnimationFrame=function(cb){ var id=rafId++; rafs.push({id:id,cb:cb}); return id; };
  window.cancelAnimationFrame=function(id){
    for(var i=0;i<rafs.length;i++) if(rafs[i].id===id){ rafs.splice(i,1); return; }
  };

  /* ---- CSS animations and transitions ----
     Both are Web Animations underneath, so document.getAnimations() hands
     over every one of them. Each is paused the frame it is found and moved
     by hand from then on; one that reaches its end is finish()ed rather than
     parked there, so animationend and transitionend still fire. Reading the
     list also flushes style, so an animation started by a class added in
     this step is caught in this step, before the photograph. */
  var known=new WeakSet();
  function syncAnims(){
    var list;
    try{ list=document.getAnimations(); }catch(e){ return; }
    for(var i=0;i<list.length;i++){
      var a=list[i];
      try{
        if(!known.has(a)){ known.add(a); a.pause(); a.currentTime=a.currentTime||0; continue; }
        if(a.playState==="finished"||a.playState==="idle")continue;
        var ct=(a.currentTime||0)+DT*(a.playbackRate||1);
        var end=a.effect?a.effect.getComputedTiming().endTime:Infinity;
        if(end!==Infinity&&ct>=end)a.finish(); else a.currentTime=ct;
      }catch(e){}
    }
  }

  /* ---- sound ---- */
  var au=null;
  function FakeAudioContext(){
    var c=new OfflineAudioContext({numberOfChannels:2,length:SR*AUDIO_S,sampleRate:SR});
    au={ctx:c, origin:vt, started:false, lastFrame:0, done:null, buf:null,
        suspend:c.suspend.bind(c), resume:c.resume.bind(c)};
    Object.defineProperty(c,"state",{get:function(){ return "running"; }});
    c.resume=c.suspend=c.close=function(){ return Promise.resolve(); };
    return c;
  }
  window.AudioContext=window.webkitAudioContext=FakeAudioContext;
  async function advanceAudio(){
    if(!au)return;
    // Whole render quanta only; a suspend at the same quantum twice throws.
    var f=Math.floor((vt-au.origin)/1000*SR/128)*128;
    if(f<=au.lastFrame||f>=SR*AUDIO_S)return;
    var p;
    try{ p=au.suspend((f+0.5)/SR); }catch(e){ return; }
    au.lastFrame=f;
    if(!au.started){
      au.started=true;
      au.done=au.ctx.startRendering().then(function(b){ au.buf=b; });
    }else au.resume();
    await p;
  }

  /* ONE FRAME. Timers due inside it fire at their own times, then the sound
     is rendered up to the frame, then the frame is drawn - rAF callbacks get
     the frame's time, exactly as a real browser hands them. */
  cap.step=async function(){
    var target=vt+DT;
    for(;;){
      var t=dueTimer(target);
      if(!t)break;
      if(t.at>vt)vt=t.at;
      try{ t.fn.apply(window,t.args); }catch(e){ report(e); }
      await yieldTask();
    }
    vt=target;
    await advanceAudio();
    var q=rafs; rafs=[];
    for(var i=0;i<q.length;i++){ try{ q[i].cb(vt); }catch(e){ report(e); } }
    await yieldTask();
    syncAnims();
  };

  /* THE SOUNDTRACK, cut to the film. `from` and `to` are the clock's own
     times, taken by the driver at the first and last photographed frame, so
     the cut is exact to the sample. Returns a 16-bit stereo WAV's length and
     keeps the bytes for cap.wavChunk() to hand out a piece at a time - fourteen
     megabytes is too much to pass back through one evaluate. */
  cap.soundtrack=async function(from,to){
    var n=Math.max(1,Math.round((to-from)/1000*SR));
    var L=new Float32Array(n), R=new Float32Array(n);
    if(au){
      if(!au.started){ au.started=true; au.done=au.ctx.startRendering().then(function(b){ au.buf=b; }); }
      else au.resume();
      await au.done;
      var src0=au.buf.getChannelData(0), src1=au.buf.getChannelData(1);
      var off=Math.round((from-au.origin)/1000*SR);
      for(var i=0;i<n;i++){
        var k=i+off;
        if(k>=0&&k<src0.length){ L[i]=src0[k]; R[i]=src1[k]; }
      }
    }
    var bytes=44+n*4, buf=new ArrayBuffer(bytes), v=new DataView(buf);
    function s(o,str){ for(var j=0;j<str.length;j++)v.setUint8(o+j,str.charCodeAt(j)); }
    s(0,"RIFF"); v.setUint32(4,bytes-8,true); s(8,"WAVE");
    s(12,"fmt "); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,2,true);
    v.setUint32(24,SR,true); v.setUint32(28,SR*4,true); v.setUint16(32,4,true); v.setUint16(34,16,true);
    s(36,"data"); v.setUint32(40,n*4,true);
    for(var m=0,o=44;m<n;m++,o+=4){
      v.setInt16(o,Math.max(-1,Math.min(1,L[m]))*32767,true);
      v.setInt16(o+2,Math.max(-1,Math.min(1,R[m]))*32767,true);
    }
    cap.wav=new Uint8Array(buf);
    return {bytes:bytes, heard:!!au, clipped:au?(to-au.origin>AUDIO_S*1000):false};
  };
  cap.wavChunk=function(at,len){
    var part=cap.wav.subarray(at,at+len), s="";
    for(var i=0;i<part.length;i+=0x8000)
      s+=String.fromCharCode.apply(null,part.subarray(i,i+0x8000));
    return btoa(s);
  };
}

module.exports={clockScript};
