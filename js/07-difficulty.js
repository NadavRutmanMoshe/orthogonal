"use strict";
/* Orthogonal — 07-difficulty.js
   Par, stars and difficulty tiers, derived from solver output.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   DIFFICULTY — derived from what the solver actually found,
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
// 3 stars is the solver's own answer; anything longer costs you.
// Hints are free and unlimited so nobody gets stuck, but each one costs you
// rating - and rating is the currency. A player who wants skins solves it
// properly; a player who is stuck still gets to move on.
function capForHints(n){
  if(n<=0)return 3;
  if(n<=2)return 2;
  if(n<=4)return 1;
  return 0;
}
function starsFor(moves,par){
  if(!par||moves<=0)return 0;
  if(moves<=par)return 3;
  if(moves<=Math.floor(par*1.2))return 2;
  if(moves<=Math.floor(par*1.4))return 1;
  return 0;
}
/* What `progress[name]` holds, and which direction is better.

   An ordinary level records a move count and lower wins. A boss records
   lives left and *higher* wins - three lives intact is three stars, which is
   what makes a boss a test of reading the pattern rather than of counting
   moves. Two numbers in one slot with opposite senses is exactly the kind of
   thing that rots, so nothing compares them by hand: every read goes through
   starsForRecord and every write through betterRecord. */
function starsForRecord(level,rec){
  if(rec===undefined)return 0;
  if(level.boss)return Math.max(0,Math.min(3,rec));
  var st=statsCached(level);
  return starsFor(rec,st.ok?st.moves:0);
}
function betterRecord(level,rec,prev){
  if(prev===undefined)return true;
  return level.boss ? rec>prev : rec<prev;
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
    s+="<i class='sg' data-i='"+i+"'>"+(i<n?"\u2605":"\u2606")+"</i>";
  return s;
}
function tierOf(score){
  if(score<=18)return "gentle";
  if(score<=24)return "moderate";
  if(score<=32)return "hard";
  return "brutal";
}
