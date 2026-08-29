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
/* WHICH CONTROLS THE TUTORIAL TEACHES, and it defaults by device for the same
   reason the volume does.

   The tutorial used to force the button bar back on screen whatever the
   layout preference said, on the grounds that hiding the controls during the
   lesson about the controls is a joke at the player's expense. That is still
   true - but it assumed the lesson is about the buttons, and a button marked
   with an arrow needs no lesson. The controls that genuinely cannot be
   discovered are the gestures, and they are also the ones that cost no screen.

   So "gesture" teaches the swipe, the double tap and the two-finger swipe,
   with the bar off and a ghost hand demonstrating each one; "buttons" is the
   old lesson, unchanged. A coarse pointer is the signal, exactly as it is for
   the volume: it means a finger, and a finger is the only thing any of these
   gestures can be performed with. On a mouse the gesture lesson would be
   eloquently wrong - "swipe right" to somebody holding a mouse - so a fine
   pointer keeps the buttons until the keyboard half of this is built. */
function defaultTutor(){
  var coarse=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches;
  return coarse?"gesture":"buttons";
}
/* `mastery` is a *preview* switch, not a gameplay one. "auto" is the real
   thing - a section wears its finished colours when every level in it is on
   three stars. "on" forces that look everywhere, so the celebration can be
   looked at without earning it four times over. It changes nothing but the
   drawing: no stars move, nothing unlocks. */
/* ctlAsked is whether the player has been asked, once, at the end of the
   tutorial, whether they want the on-screen buttons - see controlsOffer().
   It is a "has this happened" flag rather than a preference: the preference
   it produces is `ui`, and the answer must not be asked for twice. */
/* slowOffers counts how many times the game has suggested slowing a clock,
   and noSlowOffer is the player saying stop. Both are global rather than
   per level: somebody who does not want to be offered help does not want it
   again on the next boss either. */
var settings={volume:defaultVolume(),brightness:1,ui:"full",volTouched:false,
              pace:1,mastery:"auto",tutor:defaultTutor(),
              slowOffers:0,noSlowOffer:false,landHints:0,ctlAsked:false};
/* How many times the landing rule is spelled out in words. The rings keep
   drawing forever - they are free and they answer the question faster than a
   sentence does - but a line of text on every fold would be nagging. */
var LAND_HINT_TIMES=3;

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

/* WAIT FOR THE CLOCK TO ACTUALLY BE RUNNING BEFORE SCHEDULING ANYTHING LONG.
   audio() creates the context and calls resume(), and resume() is a promise:
   until it settles the context is suspended, which means currentTime is
   frozen at 0 and does not advance. Scheduling a two-second arrangement
   against a frozen clock does not fail - it queues, and then every note
   whose time has already passed fires at once the moment something else
   wakes the context up. That is exactly what the sting did: silent through
   the fold, then the whole thing in a heap on the next button press.

   A blip does not care, because it is one 50ms event at currentTime. A set
   piece does. So this hands back a context only once it is running, with
   three things in it that matter:

   - the one-sample silent buffer, played *inside* the gesture. On iOS and in
     a sandboxed iframe a context does not truly start until something has
     been pushed through it, and resume() alone can sit pending.
   - the fallback timer, so a browser that never resumes does not leave the
     caller waiting forever - it gets null and plays nothing, which is the
     right answer. Silent beats a jumble arriving late.
   - the state re-check inside go(), because resume() resolving is not itself
     a promise that the context is running. */
var AUDIO_WAIT=350;
function audioReady(cb){
  var c=audio();
  if(!c){cb(null);return;}
  if(c.state==="running"){cb(c);return;}
  var done=false;
  function go(){if(done)return;done=true;cb(c.state==="running"?c:null);}
  try{
    var b=c.createBuffer(1,1,c.sampleRate),src=c.createBufferSource();
    src.buffer=b;src.connect(c.destination);src.start(0);
  }catch(e){}
  var p=null;
  try{p=c.resume();}catch(e){}
  if(p&&p.then)p.then(go,go);
  setTimeout(go,AUDIO_WAIT);
}
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
/* THE STING'S OWN VOICES.  blip() fires at c.currentTime, which is right for
   a footstep and useless for a two-second arrangement: every note here has to
   land on a beat the animation is also hitting, so these take an absolute
   time and schedule against it. Same destination, same master chain - a set
   piece is not an excuse to bypass the limiter. */
function toneAt(c,f,at,dur,type,vol,slideTo){
  var o=c.createOscillator(),g=c.createGain();
  o.type=type||"sine";
  o.frequency.setValueAtTime(f,at);
  if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,at+dur);
  g.gain.setValueAtTime(0,at);
  g.gain.linearRampToValueAtTime(vol,at+.012);
  g.gain.exponentialRampToValueAtTime(.0001,at+dur);
  o.connect(g);g.connect(out(c));g.connect(reverb(c));
  o.start(at);o.stop(at+dur+.02);
}
/* The riser.  Oscillators cannot do this - what makes a riser read as
   *approaching* is broadband noise swept through a resonant filter, so the
   top edge of the sound climbs while the body stays wide.  One short buffer
   of white noise, one bandpass with a ramp on it. */
/* WATER SPILLING - the opposite shape to noiseRise, and built out of the
   same two parts. A riser climbs a bandpass because something is arriving;
   a spill FALLS, wide at the top and closing to a gurgle, because something
   is leaving. It plays when the world folds on a level that has water in
   it, which is the moment the plane loses it - the mechanic already said
   water casts nothing, and this is the game finally saying why.

   Deliberately quiet (.03 against the riser's .042): it is a texture under
   the fold, not an event competing with it. */
function noiseFall(c,at,dur,vol){
  var len=Math.floor(c.sampleRate*(dur+.2));
  var buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
  for(var i=0;i<len;i++)d[i]=Math.random()*2-1;
  var src=c.createBufferSource();src.buffer=buf;
  var bp=c.createBiquadFilter();bp.type="bandpass";bp.Q.value=1.1;
  bp.frequency.setValueAtTime(3800,at);
  bp.frequency.exponentialRampToValueAtTime(320,at+dur);
  var g=c.createGain();
  g.gain.setValueAtTime(.0001,at);
  g.gain.exponentialRampToValueAtTime(vol,at+dur*.18);
  g.gain.exponentialRampToValueAtTime(.0001,at+dur+.12);
  src.connect(bp);bp.connect(g);g.connect(out(c));
  src.start(at);src.stop(at+dur+.14);
}
function noiseRise(c,at,dur,vol){
  var len=Math.floor(c.sampleRate*(dur+.2));
  var buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
  for(var i=0;i<len;i++)d[i]=Math.random()*2-1;
  var src=c.createBufferSource();src.buffer=buf;
  var bp=c.createBiquadFilter();bp.type="bandpass";bp.Q.value=1.5;
  bp.frequency.setValueAtTime(220,at);
  bp.frequency.exponentialRampToValueAtTime(5400,at+dur);
  var g=c.createGain();
  g.gain.setValueAtTime(.0001,at);
  g.gain.exponentialRampToValueAtTime(vol,at+dur*.92);
  g.gain.exponentialRampToValueAtTime(.0001,at+dur+.16);
  src.connect(bp);bp.connect(g);g.connect(out(c));
  src.start(at);src.stop(at+dur+.18);
}
/* HAPTICS - the same event, felt.

   The fold is the game's one verb and on a phone it is a tap on glass with
   no travel in it; a few milliseconds of motor under the finger is what a
   button press has that a touch does not. Deliberately tiny, and deliberately
   NOT tied to the mute setting: mute is about the room you are in, and a
   phone in a pocket in a meeting is on silent *and* on vibrate or neither -
   that is the operating system's switch to own, not ours.

   Guarded three ways because every one of them happens in the wild:
   `navigator.vibrate` does not exist on desktop or on iOS Safari at all, it
   throws in some embedded WebViews, and it is a no-op without a prior user
   gesture. A silent failure is the correct outcome in all three - this is
   garnish on a move that has already been made. */
function haptic(ms){
  try{ if(navigator&&navigator.vibrate)navigator.vibrate(ms); }catch(e){}
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
  /* The spill. Two droplets over the falling noise, pitched down rather
     than up, so it reads as draining away. Rides on top of fold() rather
     than replacing it - the fold is still the move being made. */
  spill:function(){
    var c=audio();if(!c)return;      // same accessor blip() uses
    noiseFall(c,c.currentTime,.34,.030);
    blip(880,.10,"sine",.016,392);
    setTimeout(function(){blip(660,.12,"sine",.013,247);},90);
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
  /* A whole section on three stars. It is the longest thing in the game
     that is not the sting, and it is deliberately the same chord family as
     win() an octave up and spread wider - the same news, four levels of
     magnitude louder. */
  mastery:function(){
    [0,110,220,330,470].forEach(function(d,i){
      setTimeout(function(){
        var f=[523.25,659.25,784,1046.5,1568][i];
        blip(f,i===4?.7:.34,"sine",i===4?.05:.038);
        blip(f/2,.4,"triangle",.016);
      },d);
    });
  },
  star:function(i){
    var f=[784,988,1245][Math.min(i,2)];
    blip(f,.2,"sine",.055,f*1.5);
    blip(f/2,.26,"triangle",.022);
  },
  /* THE STING.  Written against SPLASH_FOLD in js/20-splash.js: the cubes
     are in flight for its first 0.98s and land on the beat marked IMPACT.
     Move one and the other has to move.

     It is an arc rather than a fanfare, because what it is scoring is an
     arrival: something gathering out of nothing (a swept-noise riser under a
     rising glide), the last few cubes zipping in (five tiny ticks climbing a
     scale), then the plane (a low thump under an open-fifths chord, rolled
     over 60ms so it blooms instead of hitting flat), and a tail that settles
     rather than stops.  No fourths, no thirds in the top - stacked fifths
     are what make a short chord read as a mark rather than as a key.

     It is the loudest thing in the game, so it was measured through this
     exact chain in an OfflineAudioContext the way the mix notes above
     demand - a limiter plus a soft clipper will hide a set piece that is
     distorting on every play:

       sting                 peak 1.0004,  2 saturated samples in 141,000
       documented worst pile peak 1.0082, 25 saturated samples in  88,000

     ie. it sits under the pile-up the chain was already built to survive.
     Retune a voice here and re-run that measurement. */
  sting:function(){
    var c=audio();
    /* Never schedule this against a stopped clock - see audioReady(). Every
       note here is at an absolute time, so a suspended context turns the
       arrangement into a pile that lands on whatever gesture happens next. */
    if(!c||c.state!=="running")return;
    var t=c.currentTime+.03, F=.98;   // F: the moment the fold lands

    // the gather
    noiseRise(c,t,F,.042);
    toneAt(c,42,t,F+.1,"sine",.042,112);
    toneAt(c,165,t,F,"sine",.02,495);

    // the last cubes arriving, left to right
    [660,742,832,988,1109].forEach(function(f,i){
      toneAt(c,f,t+.66+i*.06,.05,"triangle",.015);
    });

    // IMPACT
    toneAt(c,112,t+F,.55,"sine",.055,46);
    toneAt(c,82,t+F,.12,"square",.024);
    [[261.63,.9,.034],[392,.85,.030],[523.25,.8,.028],
     [784,.7,.022],[1046.5,.6,.018]].forEach(function(n,i){
      toneAt(c,n[0],t+F+i*.015,n[1],"sine",n[2]);
    });
    toneAt(c,2093,t+F+.04,.5,"triangle",.012,3136);

    // the tail
    toneAt(c,1568,t+F+.22,.5,"sine",.012,2093);
    toneAt(c,130.81,t+F+.32,.9,"sine",.026);
  }
};
