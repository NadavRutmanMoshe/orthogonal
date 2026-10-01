"use strict";
/* I'm Just A Cube - 27-music.js
   The music. Synthesised, like every other sound in the game.
   Loaded as a classic script BEFORE boot, like 24-26: it only declares, and
   boot is what starts it (musBoot()), so nothing here needs a typeof guard
   except the calls it makes into 22-story.js, which loads after. */

/* ============================================================
   MUSIC - something to think to

   A puzzle you have to think about wants music that is THERE and is not
   ABOUT anything. So this has no melody, no beat and no hook - nothing the
   ear can follow, which is the thing that pulls attention off the board. It
   is three instruments:

   - A PAD. A chord at a time, every twelve to sixteen seconds, swelling in
     over three and a half and fading over five, so the changes overlap and
     there is never a moment where one chord stops and the next begins. Two
     sawtooths a note, a few cents apart (the beat between them is what makes
     it breathe), under a low-pass that opens and closes once per chord.
   - A BASS under it, the chord's root, soft. On a phone speaker it is barely
     there; on headphones it is what makes the pad sit on something.
   - BELLS, sparse, on top. This is the part with an idea in it, and the idea
     is Eno's, from Music for Airports: every bell has ONE note and its own
     loop length - 19.3 seconds, 23.7, 28.9 - and the lengths share no
     common beat, so the same few notes keep meeting in combinations that do
     not come round again for hours. It never repeats and it never wanders,
     because it is always the same seven notes.

   WHY THE CHORDS WANDER INSTEAD OF LOOPING. A four-chord loop is a song, and
   by the third time round you know it, which is attention again. So each
   chord picks the next from a short list of good neighbours (`to`, weighted)
   - a Markov chain over a dozen chords that all sound right after each other.

   WHY C MAJOR. Everything the game already says is in it: the footsteps are
   D E F G A, the win chord is C E G C, the sting lands on C. So the music
   only uses the white keys, and a footstep can never be a wrong note against
   it. The bells are the C pentatonic (C D E G A), which has no semitones in
   it at all; the two rubs left - a C over a chord with a B in it, an E over
   a chord with an F - are dodged one note at a time (musBellNote()).

   WHEN IT PLAYS: everywhere you are thinking - the home screen, the map, a
   puzzle, the editor. It steps aside for a FIGHT (a boss or a trial, until
   the level is won) and for a CUTSCENE, and it waits out the sting. A fight
   is real time and its sounds are telegraphs you need to hear; a scene has
   its own timing, and a calm bed under the abduction would be the wrong
   music. musicWanted() is the whole rule, and it is asked four times a
   second rather than wired into every way in and out of a fight - there are
   too many of those to keep in step, and a quarter-second is nothing against
   a five-second fade.

   WHERE IT GOES IN THE CHAIN, and this is load-bearing. Every other sound
   goes through masterGain (a x16 drive) into a limiter set at -18 dB with a
   ratio of 20, which is there to make short blips loud. A sustained pad fed
   into that would be squashed, and worse, every footstep would duck it - the
   limiter would pump the music in time with your feet. So the music joins
   AFTER the limiter, at the soft clipper (`shaper` in 11-sound.js): the
   volume slider (outGain) still turns it down, and the clipper still rounds
   off the rare moment a win chord lands on a swell. MUSIC_LEVEL is set
   against that point in the chain - see tools/music.js, which measures it.
   ============================================================ */

/* THE ONE FADER, in front of all of it: the bus level at Music 50%, which is
   the default. The slider scales it - 100% is twice this, 0% is off. Every
   gain in the piece below is a relative mix, the way AMB_LEVEL is. */
var MUSIC_LEVEL=.55;
var MUS_AHEAD=2.5;       // seconds scheduled ahead of the audio clock
var MUS_TICK=250;        // ms between looks at the clock
var MUS_IN=3, MUS_OUT=2.5;

function mtof(m){return 440*Math.pow(2,(m-69)/12);}

/* THE PIECE. All data, so a second one is a second object rather than a
   second engine - which is what a piece per world would be.

   Chords are MIDI notes. `bass` is the root; `pad` is the voicing, kept
   between C3 and G4 where a phone speaker can still hear the saw's upper
   harmonics. `to` is where it may go next and how likely each is. I is
   Cadd9 rather than Cmaj9 on purpose: with a B in the tonic chord every C
   bell would have to dodge it, and the tonic would never get its own note. */
var MUSIC_PIECES={
  still:{
    first:"I",
    bar:4, bars:[3,3,4],                   // a chord lasts 12 or 16 seconds
    chords:{
      I:   {bass:36, pad:[52,55,60,62], to:{vi:3, IV:3, ii:1, iii:1}},     // Cadd9
      vi:  {bass:45, pad:[48,55,59,64], to:{IV:3, ii:2, iii:1, I:1}},      // Am9
      IV:  {bass:41, pad:[52,57,60,67], to:{I:3, ii:1, V:2, IVl:1, vi:1}}, // Fmaj9
      IVl: {bass:41, pad:[57,59,64,67], to:{I:3, vi:1}},                  // Fmaj7#11
      ii:  {bass:38, pad:[53,57,60,64], to:{V:2, IV:2, vi:1}},             // Dm9
      V:   {bass:43, pad:[50,57,59,64], to:{I:2, vi:2, IV:1}},             // G6/9, never G7
      iii: {bass:40, pad:[50,55,59,64], to:{IV:2, vi:2}}                   // Em7
    },
    /* The bells: [note, loop in seconds]. The loops are chosen to share no
       beat - which is the whole trick - and the notes avoid D4-A4, the
       footsteps' own register, so a bell is never mistaken for something
       you did. */
    bells:[[72,19.3],[79,23.7],[76,28.9],[60,31.1],[74,37.3],[81,41.9],[67,46.7]],
    scale:[55,57,60,62,64,67,69,72,74,76,79,81,84],   // C pentatonic, for dodges
    breath:150,          // seconds: the bells thin out and fill in on this cycle
    echo:.22,            // chance a bell is answered by a quieter neighbour
    padLvl:.16, padAtt:3.5, padRel:5, padDetune:6, padLo:600, padHi:1500, padSend:.55,
    bassLvl:.04, bassSend:.10,
    bellLvl:.19, bellAtt:.022, bellLen:5, bellRatio:1, bellIdx:1.3, bellBright:1.1,
    bellDry:.55, bellSend:1,
    verbT:2.8, verbOut:.9
  }
};

/* Everything the running music is. `line` is the chords already scheduled,
   newest last, so a bell knows what it will be sounding over; `live` is
   every source with its end time, so stopping can cut what is queued. */
var MUS={ctx:null, piece:null, bus:null, padIn:null, bellIn:null, bassIn:null,
         verb:null, on:false, timer:0, chord:null, nextChord:0, line:[],
         bells:[], live:[], t0:0};

function musPiece(){return MUSIC_PIECES.still;}
/* The slider is settings.music, 0..1, default MUSIC_DEFAULT (beside the other
   defaults in 11-sound.js). At the default the bus sits at MUSIC_LEVEL. */
function musLevel(){
  var v=typeof settings.music==="number"?settings.music:MUSIC_DEFAULT;
  return MUSIC_LEVEL*v/MUSIC_DEFAULT;
}

/* THE ROOM THE MUSIC IS IN. The game's own reverb() is 0.9s, which is a
   room for a footstep; a pad wants a hall. Noise under an exponential decay,
   run through a one-pole low-pass that closes as it goes, because in a real
   room the top end dies first and a tail that stays bright is a hiss.

   ONE CHANNEL, AND THAT IS THE PHONE'S BUDGET. A convolver is the one
   expensive node in this file - it is running all the time the music is -
   and a stereo one is two convolutions. Measured offline on the laptop: the
   whole piece cost 8.1% of a core with a 3.4s stereo hall and 4.1% with no
   room at all, so the hall was half of everything. Mono and 2.8s is a
   quarter of that; the width it gave up is already in the dry sound, where
   every pad note is split across the speakers. musGraph() folds the input
   to one channel so it really is one convolution, not the same one twice. */
function musVerbBuf(c,T){
  var sr=c.sampleRate, len=Math.floor(sr*T), pre=Math.floor(sr*.025),
      b=c.createBuffer(1,len,sr), d=b.getChannelData(0), y=0;
  for(var i=pre;i<len;i++){
    var t=(i-pre)/sr, x=(Math.random()*2-1)*Math.exp(-6.9*t/T);
    y+=(.6-.48*i/len)*(x-y);
    d[i]=y;
  }
  return b;
}
/* Built once per audio context, and then only ever faded. Three instrument
   inputs, each with its own dry and wet, so a bell can be mostly room and the
   bass hardly any. */
function musGraph(c){
  if(MUS.ctx===c&&MUS.bus)return true;
  var dest=(typeof shaper!=="undefined"&&shaper)||null;
  if(!dest)return false;
  var P=musPiece();
  MUS.ctx=c;MUS.piece=P;
  var bus=c.createGain();bus.gain.value=0;bus.connect(dest);
  var verb=c.createConvolver();
  verb.channelCount=1;verb.channelCountMode="explicit";   // see musVerbBuf
  verb.buffer=musVerbBuf(c,P.verbT);
  var vo=c.createGain();vo.gain.value=P.verbOut;verb.connect(vo);vo.connect(bus);
  function lane(dry,wet,pre){
    var g=c.createGain();
    var head=pre||g;
    if(pre)pre.connect(g);
    var d=c.createGain();d.gain.value=dry;g.connect(d);d.connect(bus);
    var w=c.createGain();w.gain.value=wet;g.connect(w);w.connect(verb);
    return head;
  }
  MUS.padIn=lane(1,P.padSend);
  // The bells are FM, and FM's top sidebands are the one bright thing here.
  var tame=c.createBiquadFilter();tame.type="lowpass";tame.frequency.value=2800;tame.Q.value=.5;
  MUS.bellIn=lane(P.bellDry,P.bellSend,tame);
  MUS.bassIn=lane(1,P.bassSend);
  MUS.bus=bus;MUS.verb=verb;
  return true;
}
function musPan(c,dest,p){
  if(!c.createStereoPanner)return dest;
  var n=c.createStereoPanner();n.pan.value=Math.max(-1,Math.min(1,p));
  n.connect(dest);return n;
}
function musLive(src,end){MUS.live.push({s:src,end:end});}

function musPad(c,at,dur,ch){
  var P=MUS.piece, end=at+dur+P.padRel, lvl=P.padLvl/ch.pad.length;
  var env=c.createGain();
  env.gain.setValueAtTime(0,at);
  env.gain.linearRampToValueAtTime(lvl,at+P.padAtt);
  env.gain.setValueAtTime(lvl,at+dur);
  env.gain.linearRampToValueAtTime(0,end);
  env.connect(MUS.padIn);
  /* The filter opens to the middle of the chord and closes again, once.
     That one slow movement is most of why it sounds alive rather than held. */
  var lp=c.createBiquadFilter();lp.type="lowpass";lp.Q.value=.4;
  lp.frequency.setValueAtTime(P.padLo,at);
  lp.frequency.linearRampToValueAtTime(P.padHi,at+dur*.55);
  lp.frequency.linearRampToValueAtTime(P.padLo,end);
  lp.connect(env);
  /* THE TWO SAWS OF A NOTE GO TO OPPOSITE SPEAKERS. Each side then holds the
     chord at a slightly different tuning, and the beat between them happens
     between your ears instead of inside one channel - wider than panning the
     notes, and two panners a chord instead of one a note. In mono (a phone's
     one speaker) the sum is exactly the same. */
  var side={"-1":musPan(c,lp,-.5),"1":musPan(c,lp,.5)};
  ch.pad.forEach(function(m){
    [-1,1].forEach(function(s){
      var o=c.createOscillator();o.type="sawtooth";
      o.frequency.value=mtof(m);
      o.detune.value=s*P.padDetune+(Math.random()-.5)*3;
      o.connect(side[s]);o.start(at);o.stop(end+.05);musLive(o,end);
    });
  });
}
function musBass(c,at,dur,m){
  var P=MUS.piece, end=at+dur+P.padRel;
  var o=c.createOscillator();o.type="triangle";o.frequency.value=mtof(m);
  var lp=c.createBiquadFilter();lp.type="lowpass";lp.frequency.value=240;lp.Q.value=.3;
  var env=c.createGain();
  env.gain.setValueAtTime(0,at);
  env.gain.linearRampToValueAtTime(P.bassLvl,at+P.padAtt+.5);
  env.gain.setValueAtTime(P.bassLvl,at+dur);
  env.gain.linearRampToValueAtTime(0,end);
  o.connect(lp);lp.connect(env);env.connect(MUS.bassIn);
  o.start(at);o.stop(end+.05);musLive(o,end);
}
/* A BELL IS TWO SINES, ONE BENDING THE OTHER (FM, at a 1:1 ratio, which is
   the electric piano rather than the church bell). The bend is strong on the
   strike and dies away over a second, so each note starts bright and
   mellows - the thing a real struck note does and a plain sine cannot. The
   attack is 22ms, not a blip's 8: a soft mallet, so it arrives rather than
   ticks, and so it is never mistaken for a sound the game made at you. */
function musBell(c,at,m,vel,pan){
  var P=MUS.piece, f=mtof(m), end=at+P.bellLen;
  var car=c.createOscillator(), mod=c.createOscillator(),
      mg=c.createGain(), env=c.createGain();
  car.frequency.value=f;mod.frequency.value=f*P.bellRatio;
  mg.gain.setValueAtTime(f*P.bellIdx,at);
  mg.gain.exponentialRampToValueAtTime(f*P.bellIdx*.04,at+P.bellBright);
  mod.connect(mg);mg.connect(car.frequency);
  var pk=vel*P.bellLvl;
  env.gain.setValueAtTime(0,at);
  env.gain.linearRampToValueAtTime(pk,at+P.bellAtt);
  env.gain.exponentialRampToValueAtTime(pk*.0005,end);
  car.connect(env);env.connect(musPan(c,MUS.bellIn,pan));
  car.start(at);mod.start(at);car.stop(end+.02);mod.stop(end+.02);
  musLive(car,end);musLive(mod,end);
}

/* The chord sounding at time t: the newest one that has started by then. */
function musChordAt(t){
  for(var i=MUS.line.length-1;i>=0;i--)if(MUS.line[i].at<=t)return MUS.line[i].ch;
  return MUS.line.length?MUS.line[0].ch:null;
}
/* A MINOR NINTH IS THE ONE INTERVAL THIS PIECE CANNOT HAVE. Every white-key
   bell over every white-key chord is fine except a note a semitone above a
   note in the chord (C over B, E over F), which in a pad this soft reads as
   out of tune rather than as tension. So the bell steps to the nearest note
   of its scale that does not rub - one step, then two - and keeps its loop. */
function musRubs(m,ch){
  if(!ch)return false;
  var all=ch.pad.concat([ch.bass]);
  for(var i=0;i<all.length;i++)if(Math.abs(m-all[i])%12===1)return true;
  return false;
}
function musBellNote(m,ch){
  if(!musRubs(m,ch))return m;
  var sc=MUS.piece.scale, i=sc.indexOf(m), tries=[1,-1,2,-2];
  for(var k=0;k<tries.length;k++){
    var n=sc[i+tries[k]];
    if(n!==undefined&&!musRubs(n,ch))return n;
  }
  return null;                       // nothing fits: a rest, which is also music
}
/* The bells thin out and fill back in over a couple of minutes. A texture
   at one constant density is a texture you stop hearing and then notice
   again; this one has somewhere quieter to go. */
function musDensity(t){
  var s=Math.sin(2*Math.PI*(t-MUS.t0)/MUS.piece.breath);
  return Math.max(.2,Math.min(1,.62+.42*s));
}
function musNextChord(id){
  var to=MUS.piece.chords[id].to, sum=0, k;
  for(k in to)sum+=to[k];
  var r=Math.random()*sum;
  for(k in to){r-=to[k];if(r<=0)return k;}
  return MUS.piece.first;
}

/* Schedule everything that starts before `until`. Chords first, so every
   bell in the same window knows what it is sounding over. */
function musFill(c,until){
  var P=MUS.piece;
  while(MUS.nextChord<until){
    var id=MUS.chord?musNextChord(MUS.chord):P.first;
    MUS.chord=id;
    var ch=P.chords[id], at=MUS.nextChord,
        dur=P.bar*P.bars[Math.floor(Math.random()*P.bars.length)];
    musPad(c,at,dur,ch);musBass(c,at,dur,ch.bass);
    MUS.line.push({at:at,ch:ch});
    if(MUS.line.length>6)MUS.line.shift();
    MUS.nextChord=at+dur;
  }
  MUS.bells.forEach(function(b){
    while(b.next<until){
      var t=b.next+(Math.random()-.5)*.4;      // a hand, not a sequencer
      b.next+=b.loop;
      if(Math.random()>musDensity(t))continue;
      var ch=musChordAt(t), m=musBellNote(b.m,ch);
      if(m===null)continue;
      var vel=.55+Math.random()*.45, pan=(Math.random()-.5)*.9;
      musBell(c,t,m,vel,pan);
      /* Sometimes answered: a quieter neighbour a moment later, the nearest
         thing to a phrase this is allowed. */
      if(Math.random()<P.echo){
        var sc=P.scale, i=sc.indexOf(m), e=sc[i+(Math.random()<.5?1:-1)];
        if(e!==undefined){
          e=musBellNote(e,musChordAt(t+.8));
          if(e!==null)musBell(c,t+.6+Math.random()*.5,e,vel*.55,-pan);
        }
      }
    }
  });
}
function musPrune(now){
  for(var i=MUS.live.length-1;i>=0;i--)if(MUS.live[i].end<now)MUS.live.splice(i,1);
}
function musFade(c,to,secs){
  var g=MUS.bus.gain, t=c.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value,t);
  g.linearRampToValueAtTime(to,t+secs);
}
function musStart(c){
  if(!musGraph(c))return false;
  var now=c.currentTime, P=MUS.piece;
  MUS.on=true;
  musFade(c,musLevel(),MUS_IN);
  /* Always opens on the home chord, a beat from now. Coming back from a fight
     to the tonic is the music saying you are back where you think. */
  MUS.chord=null;MUS.line=[];MUS.nextChord=now+.05;
  if(!MUS.t0)MUS.t0=now;
  /* The bells come in one at a time over the first half-minute rather than
     all on the first beat - and the first is a few seconds in, after the pad
     has arrived, so the music begins as a chord and not as a ding. */
  MUS.bells=P.bells.map(function(b,i){
    return {m:b[0], loop:b[1], next:now+4+i*3.3+Math.random()*2};
  });
  return true;
}
function musStop(c,quick){
  MUS.on=false;
  if(!MUS.bus)return;
  var secs=quick?.15:MUS_OUT, cut=c.currentTime+secs+.1;
  musFade(c,0,secs);
  /* Cut everything queued at the bottom of the fade, or a sixteen-second
     pad keeps running into a silent bus for the length of the fight. A source
     told to stop before it starts never plays at all, which is what the
     notes scheduled into the look-ahead want. */
  MUS.live.forEach(function(l){
    if(l.end>cut){try{l.s.stop(cut);}catch(e){}}
  });
  MUS.live=[];MUS.line=[];
}

/* THE WHOLE RULE FOR WHEN IT PLAYS. See the header. */
function musFight(){
  if(typeof homeUp==="function"&&homeUp())return false;
  return app==="play"&&!!L&&onTheClock(L)&&!levelDone;
}
function musicWanted(){
  if(muted||!(musLevel()>0))return false;
  if(document.hidden)return false;
  if(document.body.classList.contains("splashing"))return false;
  if(typeof storyOn==="function"&&storyOn())return false;
  if(musFight())return false;
  return true;
}
function musTick(){
  var c=actx;
  /* Never creates the context: that is the sting's tap, and a context made
     here before any gesture would only sit suspended. No clock, no music. */
  if(!c||c.state!=="running")return;
  var want=musicWanted();
  if(want&&!MUS.on){if(!musStart(c))return;}
  else if(!want&&MUS.on)musStop(c,muted);
  if(MUS.on)musFill(c,c.currentTime+MUS_AHEAD);
  musPrune(c.currentTime);
}
// The Music slider moved: follow it at once rather than over a fade.
function musApplyLevel(){
  if(!MUS.on||!MUS.bus||!MUS.ctx)return;
  var g=MUS.bus.gain, t=MUS.ctx.currentTime;
  g.cancelScheduledValues(t);g.setTargetAtTime(musLevel(),t,.05);
}

/* THE APP GOING INTO THE BACKGROUND, AND IT WAS NEVER A QUESTION UNTIL NOW.
   A blip is over in a tenth of a second, so nothing ever had to stop when the
   player left; a pad does not end. An Android WebView keeps Web Audio running
   behind a paused app, so without this the music would follow the player out
   to their home screen. The whole context is suspended - which freezes the
   audio clock, so the scheduler simply finds no time has passed - and resumed
   on the way back. Both the page's own visibility and Capacitor's pause are
   listened to, because a WebView is not obliged to report the first.

   The resume waits for an ad: adQuiet() in 24-ads.js suspends the context for
   the length of a video and owns resuming it. */
function musAway(away){
  if(!actx)return;
  if(away){try{actx.suspend();}catch(e){}return;}
  if(typeof AD!=="undefined"&&AD.busy)return;
  try{actx.resume();}catch(e){}
}
function musBoot(){
  if(MUS.timer)return;
  MUS.timer=setInterval(musTick,MUS_TICK);
  document.addEventListener("visibilitychange",function(){musAway(document.hidden);});
  var App=typeof capPlugin==="function"?capPlugin("App"):null;
  if(App&&typeof App.addListener==="function"){
    App.addListener("pause",function(){musAway(true);});
    App.addListener("resume",function(){musAway(false);});
  }
}
