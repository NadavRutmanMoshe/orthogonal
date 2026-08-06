"use strict";
/* Orthogonal — 08-minimizer.js
   Which blocks in a level are load-bearing.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   MINIMIZER — delete each block, re-solve, and see whether the
   level notices. Blocks the level doesn't miss aren't carrying
   any of the puzzle. Greedy, so it finds one small core, not
   necessarily the only one.
   ============================================================ */
function minimize(level){
  function supported(bs){
    var s=level.start,g=level.goal,a=false,b=false;
    for(var i=0;i<bs.length;i++){
      if(bs[i][0]===s[0]&&bs[i][1]===s[1]-1&&bs[i][2]===s[2])a=true;
      if(bs[i][0]===g[0]&&bs[i][1]===g[1]-1&&bs[i][2]===g[2])b=true;
    }
    return a&&b;
  }
  var cur=level.blocks.map(function(v){return v.slice();}),changed=true;
  while(changed){
    changed=false;
    for(var i=0;i<cur.length;i++){
      var t=cur.filter(function(_,j){return j!==i;});
      if(!supported(t))continue;
      var probe={blocks:t,start:level.start,goal:level.goal,rotate:level.rotate};
      if(solve(probe,true).status==="solved"){cur=t;changed=true;break;}
    }
  }
  var core=new Set();
  for(var k=0;k<cur.length;k++)core.add(K(cur[k][0],cur[k][1],cur[k][2]));
  return core;
}
