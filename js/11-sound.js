"use strict";
/* Orthogonal — 11-sound.js
   Web Audio blips. No assets.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   SOUND — a few oscillator blips, no assets. The audio context
   can only start after a gesture, so it's created lazily.
   ============================================================ */
var actx=null, masterGain=null, limiter=null, postGain=null, shaper=null;
var outGain=null;
/* The same digital level is not the same loudness on every device. A phone's
   speaker is small and quiet and wants everything the chain can give it; a
   desktop is usually running powered speakers or headphones with their own
   amplification, and the setting that is right on the phone is painful there.

   So the *default* differs by device and nothing else does - the chain, the
   limiter and the ceiling are identical, and the slider in the menu still
   goes to the top. A coarse pointer is the signal: it means a finger, which
   means a phone or a tablet, and it is a far better proxy for "small speaker"
   than sniffing the user agent for device names that change every year.

   A stored volume only outranks this once you have actually moved the
   slider - `volTouched`. Without that flag the first version of this change
   did nothing on any device that had ever played: every save already carried
   a volume, written by a default from an era when the whole mix was six times
   quieter, and it silently won. A number nobody chose should not outrank a
   number picked for the hardware. */
function defaultVolume(){
  var coarse=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches;
  return coarse?1:.35;
}
var settings={volume:defaultVolume(),brightness:1,ui:"full",volTouched:false,
              pace:1};

/* PACE — how fast the two real-time things run.

   Bosses and trials are the one part of the game that does not wait for you,
   and "real time is the one thing this game is not" has been a known hole
   for as long as they have existed. This is the accessibility answer: 1 is
   the designed speed, .75 and .5 are the same fight played slower.

   It is deliberately *one number applied to dt*, not a set of eased dials.
   Every interval in a fight is derived from the clock - the step, the aim
   window, the creep, the rage multiplier, the trial's period and its fire
   window, the beat of grace after a hit - so scaling the clock scales all of
   them together and every ratio between them survives untouched. Slowing
   `step` by hand would not: it would change how many steps a hunter gets per
   telegraph, which is the fight's whole shape.

   It is free, and it does not touch stars. Hints are metered because a hint
   hands you the answer to the puzzle; a slower clock hands you nothing you
   did not already have to work out, it just gives you longer to say it. If
   that judgement ever needs reversing, the place to do it is
   starsForRecord() in 07-difficulty.js - cap a clock level's stars the way
   capForHints() caps an ordinary one. */
/* Carried as a percentage as well as a multiplier, and the percentage is
   what the button ids are built from. `mPace_0.5` is a legal element id and
   getElementById finds it happily, but it is not a legal CSS selector, so
   the first querySelector anyone reaches for would throw on it. */
var PACES=[{v:1,pct:100,label:"NORMAL"},
           {v:.75,pct:75,label:"EASED"},
           {v:.5,pct:50,label:"SLOW"}];
function paceScale(){
  var p=settings.pace;
  return (typeof p==="number"&&p>0&&p<=1)?p:1;
}

/* The individual blip gains below are a balanced mix - a footstep is meant to
   sit well under the win chord - so loudness is corrected once here at the
   master rather than by editing eleven numbers and losing that balance.

   MIX used to be the only lever, and it was stuck low for a real reason:
   with oscillators wired straight to the destination, the ceiling is set by
   the loudest possible moment (win(), four notes overlapping, plus reverb
   wet) and everything quieter has to live far under that or the peak clips.
   The result was a game that peaked around -19 dBFS while everything else on
   a phone is mastered near -6, so it read as barely audible.

   The fix is the one every game uses: a limiter on the master bus. With
   peaks caught at LIMIT_DB, MIX can be pushed until the quiet sounds are
   actually loud and the loud ones simply stop growing, and POST makes up the
   gain the limiter took. Peak output stays under 1.0 by construction rather
   than by leaving headroom nobody hears.

   A limiter alone then ran out of road, because the ceiling it has to defend
   is set by the rarest moment rather than the common one: four win-chord
   notes plus a shot plus a strike plus a footstep, all inside 40ms. Holding
   *that* under 1.0 with makeup gain alone keeps every ordinary sound about
   4 dB quieter than it needs to be. So the chain ends the way a mastering
   chain does, with a gentle soft clipper - a tanh curve that rounds the last
   few transient peaks instead of letting them square off. It is doing real
   work only in that contrived pile-up.

   Measured by rendering this exact chain through an OfflineAudioContext:

     footstep peak   0.09  ->  0.95     (RMS x12 over the original)
     worst-case pile 0.13  ->  1.00, with 8 saturated samples out of 44,000
     footstep alone            0 saturated samples

   If you change MIX or POST, re-measure that stacked case. A limiter makes
   clipping quiet rather than obvious, and a soft clipper hides it further -
   the two of them together will happily let you ship something that is
   distorting on every footstep without ever sounding broken in a quiet
   room. */
var MIX=16, POST=1.55, LIMIT_DB=-18, SOFT=1.2;
/* THE VOLUME GOES LAST, AFTER THE LIMITER. This was wrong for two builds and
   it is the reason turning it down did almost nothing: the slider was feeding
   the *drive* into a limiter with a -18 dB threshold and a ratio of 20, so
   cutting the input by two thirds cut the output by about two decibels - the
   limiter simply stopped working as hard and handed the level straight back.
   A compressor before the fader is a compressor that undoes the fader.

   Now MIX is a fixed drive into the chain, and settings.volume is a plain
   attenuation on the far end, where a third means a third. */
function masterLevel(){return MIX;}
function applyVolume(){
  if(outGain)outGain.gain.value=settings.volume;
}

// The verb's wording is settled: GO 2D / GO 3D. It stays in one table rather
// than as string literals sprinkled through the file, so it is still a data
// edit if that ever changes - but it is no longer a player-facing setting, and
// the menu row that let you audition FOLD and FLATTEN is gone.
var VERBS={
  dim:{to2:"GO 2D", to3:"GO 3D", n2:"2D", n3:"3D", tag:"2D / 3D"}
};
function VB(){return VERBS.dim;}

// Three control layouts. "full" is the d-pad you already had; "compact" drops
// the pad but keeps the verb; "none" clears the screen entirely and leans on
// keys and gestures. Gestures work in every mode - they are additive, never
// the only way in, so nothing becomes undiscoverable.
function applyUI(){
  var b=document.body.classList;
  b.remove("ui-full");b.remove("ui-compact");b.remove("ui-none");
  b.add("ui-"+(settings.ui||"full"));
}
function audio(){
  if(muted)return null;
  if(!actx){
    try{actx=new (window.AudioContext||window.webkitAudioContext)();}
    catch(e){return null;}
  }
  if(actx.state==="suspended")actx.resume();
  if(!masterGain){
    masterGain=actx.createGain();
    masterGain.gain.value=masterLevel();
    /* Everything lands here: blips, reverb wet, all of it. Fast attack so a
       hard transient never gets through, slow-ish release so the limiter
       does not pump audibly between footsteps. */
    limiter=actx.createDynamicsCompressor();
    limiter.threshold.value=LIMIT_DB;
    limiter.knee.value=6;
    limiter.ratio.value=20;
    limiter.attack.value=.002;
    limiter.release.value=.15;
    postGain=actx.createGain();
    postGain.gain.value=POST;
    /* The last few dB. tanh flattens toward the rails instead of hitting
       them, so a transient that would have squared off rounds over instead.
       4x oversampling because shaping at 44.1k folds the harmonics it
       creates back down into the audible band as aliasing. */
    shaper=actx.createWaveShaper();
    var n=1024, curve=new Float32Array(n), k=SOFT, den=Math.tanh(k);
    for(var i=0;i<n;i++){
      var x=i*2/(n-1)-1;
      curve[i]=Math.tanh(k*x)/den;
    }
    shaper.curve=curve;
    shaper.oversample="4x";
    outGain=actx.createGain();
    outGain.gain.value=settings.volume;
    masterGain.connect(limiter);
    limiter.connect(postGain);
    postGain.connect(shaper);
    shaper.connect(outGain);
    outGain.connect(actx.destination);
  }
  return actx;
}
function out(c){return masterGain||c.destination;}
function applyBrightness(){
  document.body.style.filter=settings.brightness===1?"":
    "brightness("+settings.brightness.toFixed(2)+")";
}
var reverbNode=null;
function reverb(c){
  if(reverbNode)return reverbNode;
  // a short synthetic impulse gives everything a room to sit in
  var len=Math.floor(c.sampleRate*0.9), buf=c.createBuffer(2,len,c.sampleRate);
  for(var ch=0;ch<2;ch++){
    var d=buf.getChannelData(ch);
    for(var i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);
  }
  var cv=c.createConvolver();cv.buffer=buf;
  var wet=c.createGain();wet.gain.value=.22;
  cv.connect(wet);wet.connect(out(c));
  reverbNode=cv;return cv;
}
function blip(freq,dur,type,vol,slideTo){
  var c=audio();if(!c)return;
  var o=c.createOscillator(),g=c.createGain();
  o.type=type||"sine";
  o.frequency.setValueAtTime(freq,c.currentTime);
  if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,c.currentTime+dur);
  g.gain.setValueAtTime(0,c.currentTime);
  g.gain.linearRampToValueAtTime(vol||.06,c.currentTime+.008);
  g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+dur);
  o.connect(g);g.connect(out(c));g.connect(reverb(c));
  o.start();o.stop(c.currentTime+dur+.02);
}
var SFX={
  step:(function(){var n=0;return function(){
    // a soft two-layer footstep: a pitched tap over a low body thump
    var scale=[294,330,349,392,440];
    var f=scale[n++%scale.length];
    blip(f,.055,"triangle",.028);
    blip(f/3,.09,"sine",.03,f/4);
  };})(),
  bump:function(){blip(90,.12,"square",.05);},
  fold:function(){
    blip(560,.42,"sine",.05,150);
    blip(280,.42,"sine",.022,75);
  },
  unfold:function(){
    // the world opening back up: a rising fifth that resolves rather than
    // just sliding, so coming out of the plane feels like an arrival
    blip(196,.5,"sine",.05,392);
    setTimeout(function(){blip(392,.34,"sine",.04,588);},70);
    setTimeout(function(){blip(588,.3,"triangle",.028);},150);
  },
  turn:function(){blip(420,.07,"triangle",.03);},
  die:function(){blip(220,.5,"sawtooth",.05,55);},
  undo:function(){blip(260,.07,"sine",.03);},
  hint:function(){blip(700,.12,"sine",.035,1050);},
  shove:function(){blip(140,.16,"square",.045,105);},
  key:function(){blip(880,.16,"sine",.05,1320);},
  win:function(){
    [523,659,784,1047].forEach(function(f,i){
      setTimeout(function(){blip(f,.4,"sine",.05);},i*95);
    });
  },
  // The gun: a short hard crack, low enough not to be confused with a hit.
  shot:function(){blip(210,.13,"square",.05,90);blip(620,.09,"sawtooth",.02);},
  // A slice landing: a downward sweep, wide and soft rather than sharp,
  // because it fires whether or not it caught you and a hard sound every
  // couple of seconds would be exhausting.
  sweep:function(){blip(330,.2,"sine",.028,110);blip(120,.24,"triangle",.02);},
  // The turn of a beat. Deliberately tiny - it is a count, not an event, and
  // you should stop noticing it and start moving on it.
  tick:function(){blip(1180,.035,"sine",.014);},
  // A core going down: a hard hit with a bright ring over it, so a strike
  // never gets confused with taking one.
  strike:function(){
    blip(150,.22,"square",.055,70);
    blip(900,.3,"sine",.04,1400);
  },
  // One per star landing on the counter, climbing as they arrive, so three
  // stars resolve upward instead of repeating the same note three times.
  star:function(i){
    var f=[784,988,1245][Math.min(i,2)];
    blip(f,.2,"sine",.055,f*1.5);
    blip(f/2,.26,"triangle",.022);
  }
};
