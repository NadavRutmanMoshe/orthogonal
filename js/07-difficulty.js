"use strict";
/* I'm Just A Cube - 07-difficulty.js
   Par, stars and difficulty tiers, derived from solver output.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   DIFFICULTY - derived from what the solver actually found,
   not from a guess. Longer optimal paths, forced rotations and
   extra flattens all mean more for the player to hold in mind.
   ============================================================ */
var statsCache={};
function statsCached(level){
  var k=level.name+"|"+level.blocks.length+"|"+level.goal.join(",");
  if(statsCache[k])return statsCache[k];
  var r=statsFor(level);
  statsCache[k]=r;
  return r;
}
/* WARM THE PARS WHILE NOBODY IS LOOKING.

   statsCached() is cheap the second time and expensive the first: statsFor()
   runs the SOLVER TWICE per level, once with rotation and once without. The
   bill arrives all at once, because starsForRecord() only asks for it when a
   level HAS a record - so a fresh save pays almost nothing and a COMPLETED
   save pays for every level in the game the first time anything wants the
   star total. Measured on a completed save: starsEarned() cold was 63ms and
   388 solver runs over 97 scored levels, and 0.3ms once warm. That is the
   whole of the "the map takes a moment to come up when a world is fully
   cleared" report, and it is why an empty world opened three times faster
   than a finished one.

   So the pars are computed up front, in the browser's idle time, a few at a
   time, and the answer is already in statsCache by the time a panel asks.
   It is the same shape as warmScenery() in js/10-render.js and it is done
   for the same reason: the work is not avoidable, but the FRAME it lands on
   is a choice.

   Clock levels are skipped because starsForRecord() returns before reaching
   statsCached() for them - a boss has no goal, and statsCached() would throw
   on one. */
function warmStats(){
  if(typeof LEVELS==="undefined")return;
  var list=[],i;
  for(i=0;i<LEVELS.length;i++){
    var l=LEVELS[i];
    if(l.tutorial)continue;
    if(typeof onTheClock==="function"&&onTheClock(l))continue;
    list.push(l);
  }
  var n=0;
  function now(){
    return (typeof performance!=="undefined"?performance.now():Date.now());
  }
  function slice(dl){
    /* ALWAYS DO AT LEAST ONE, and that is not a detail - it is the whole
       difference between this working and this spinning forever. An idle
       callback that fires because its TIMEOUT expired reports
       timeRemaining() === 0, so a loop that checks the budget before doing
       any work breaks out immediately, re-schedules, and breaks out again.
       Written that way first, it left the cache empty after three seconds
       while looking perfectly reasonable. A do/while guarantees progress,
       and one level is 2.2ms at worst, so a slice can never hold a frame.

       After the first, keep going while there is budget: the browser's own
       where it gave us one, a 6ms slice where it did not. */
    var end=now()+5;
    do{
      try{statsCached(list[n]);}catch(e){}
      n++;
    }while(n<list.length&&(dl&&!dl.didTimeout&&dl.timeRemaining
             ? dl.timeRemaining()>1 : now()<end));
    if(n<list.length)next();
  }
  /* A PLAIN TIMER, NOT requestIdleCallback, and that is the second thing
     this function got wrong. A game paints every frame, so the browser is
     never idle: the callback only ever fired on its TIMEOUT, which is once,
     and then the chain stopped - twelve pars cached after three seconds and
     the rest never computed.

     The precise lesson is about CHAINS, not about the API. warmScenery()
     (js/10-render.js) uses requestIdleCallback quite happily because it is
     ONE shot that does everything: a single callback still fires on its
     timeout, so it always runs. It is work that has to reschedule itself
     that starves here, because every link after the first is waiting for an
     idle that never comes.

     So: a 5ms slice every 40ms, which always fires, works the same in a
     WebView with no idle API at all, and finishes 97 levels in well under a
     second without ever holding a frame. */
  function next(){ setTimeout(function(){slice(null);},40); }
  next();
}
function statsFor(level){
  var full=solve(level,true);
  if(full.status!=="solved")return {ok:false,status:full.status};
  var noRot=solve(level,false);
  var flattens=0,rots=0;
  for(var i=0;i<full.path.length;i++){
    if(full.path[i]==="FLAT")flattens++;
    if(full.path[i].indexOf("rot")===0)rots++;
  }
  var needsRot=noRot.status!=="solved";
  // Weights calibrated against the three built-in levels: a single-flatten
  // walk should read gentle, and each extra flatten is the big jump because
  // the player has to hold two projections in mind at once.
  var score=full.path.length*2+(needsRot?4:0)+Math.max(0,flattens-1)*8+rots;
  return {ok:true,moves:full.path.length,path:full.path.join(" "),
          flattens:flattens,rots:rots,needsRot:needsRot,score:score,
          blocks:level.blocks.length};
}
/* capForHints() is gone. A hint used to cost you a star band - nought kept
   three, one or two dropped you to two, five or more meant none - and that
   was the wrong currency: it charged for being stuck at the exact moment the
   game wants somebody to carry on playing. Hints are paid for out of their
   own pool now (see the hint bank in 06-persistence.js), which charges time
   instead, and the only thing that decides a level's stars is the route the
   player walked. */
/* THE BANDS ARE WIDE ON PURPOSE. 3 stars is still the solver's own move
   count, so it means optimal and nothing else - that is the part that must
   not move. What changed is what a *near* miss costs: at 120% and 140% a
   single wrong turn on a short level took a whole star, and on a ten-move
   puzzle 140% is fourteen moves, so two mistakes was zero. Half again for
   two stars and double for one gives an ordinary player room to solve the
   thing their own way and still be paid for it, and leaves 0 stars meaning
   what it should - you got there, but not by anything like the short road. */
var STAR_2X=1.5, STAR_1X=2.0;
function starsFor(moves,par){
  if(!par||moves<=0)return 0;
  if(moves<=par)return 3;
  if(moves<=Math.floor(par*STAR_2X))return 2;
  if(moves<=Math.floor(par*STAR_1X))return 1;
  return 0;
}
/* What `progress[name]` holds, and which direction is better.

   An ordinary level records a move count and lower wins. Anything with a
   clock - a boss, or a trial - records lives left and *higher* wins: three
   lives intact is three stars, which is what makes those levels a test of
   reading the pattern rather than of counting moves. Two numbers in one slot
   with opposite senses is exactly the kind of thing that rots, so nothing
   compares them by hand: every read goes through starsForRecord and every
   write through betterRecord. */
function onTheClock(level){return !!(level.boss||level.trial);}
function starsForRecord(level,rec){
  if(rec===undefined)return 0;
  if(onTheClock(level))return Math.max(0,Math.min(3,rec));
  var st=statsCached(level);
  return starsFor(rec,st.ok?st.moves:0);
}
function betterRecord(level,rec,prev){
  if(prev===undefined)return true;
  return onTheClock(level) ? rec>prev : rec<prev;
}
function starGlyphs(n){
  return "\u2605\u2605\u2605".slice(0,n)+"\u2606\u2606\u2606".slice(0,3-n);
}
// The same three stars, but each in its own element. The win screen needs
// that: a star flies to the counter from where its glyph actually sits, and
// you cannot measure the third character of a text node.
function starGlyphsEls(n){
  var s="";
  for(var i=0;i<3;i++)
    s+="<i class='sg"+(i<n?"":" off")+"' data-i='"+i+"'>"+
       (i<n?"\u2605":"\u2606")+"</i>";
  return s;
}
function tierOf(score){
  if(score<=18)return "gentle";
  if(score<=24)return "moderate";
  if(score<=32)return "hard";
  return "brutal";
}
