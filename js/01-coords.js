"use strict";
/* Orthogonal — 01-coords.js
   Camera axes and the two tiny helpers everything else is built on.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   COORDINATES
   Four camera views, 90 degrees apart around the Y axis.
   For each: r = the screen-right direction in world space,
             d = the depth direction, pointing toward the camera.
   Flattening projects every block onto (u, y) where u = pos . r,
   and the depth we throw away is pos . d.
   ============================================================ */
var AX=[
  {r:[1,0,0],  d:[0,0,1],  label:"VIEW Z+"},
  {r:[0,0,-1], d:[1,0,0],  label:"VIEW X+"},
  {r:[-1,0,0], d:[0,0,-1], label:"VIEW Z-"},
  {r:[0,0,1],  d:[-1,0,0], label:"VIEW X-"}
];
function K(x,y,z){return x+","+y+","+z;}

function box(x0,x1,y0,y1,z0,z1,out){
  for(var x=x0;x<=x1;x++)for(var y=y0;y<=y1;y++)for(var z=z0;z<=z1;z++)out.push([x,y,z]);
  return out;
}
