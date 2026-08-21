"use strict";
/* Orthogonal — 02-levels.js
   The campaign: four sections and a locked shelf, each section a run of
   levels around a trial and closed by a boss, plus the tutorial scripts.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

var LEVELS=[
{name:"00 — First Steps",
   hint:"Walking, and nothing else.",
   blocks:(function(){var b=[];box(0,2,0,0,0,0,b);box(2,2,0,0,-2,-1,b);
     b.push([2,0,-3]);b.push([2,1,-3]);return b;})(),
   start:[0,1,0],goal:[2,2,-3],rotate:false,tutorial:true,lockFlat:true,
   /* Every step here names a control, so every step locks to it: the world
      dims and the named button is the only one that answers. See the guided
      lock in 15-tutorial.js - a step can opt out with lock:false, and none of
      these wants to. */
   tut:[
     {say:"You are the pink cube. The green square is where you are going.<br>Press <b>&#9654;</b> twice.",
      cue:"bRight",done:function(c){return c.d.right>=2;}},
     {say:"<b>&#9650;</b> and <b>&#9660;</b> move you away from the camera and back toward it.<br>Press <b>&#9650;</b> twice.",
      cue:"bUp",done:function(c){return c.d.up>=2;}},
     {say:"There is no jump. A block one high is a <b>step</b> — walk straight into it.",
      cue:"bUp",done:function(c){return c.climb>=1;}}
   ]},
{name:"00 — First Fold",
   hint:"The gap is not crossable. The gap is not the point.",
   /* The goal column holds TWO blocks, at z=0 and z=6, and that is the whole
      change: the landing rule is now something the player watches happen
      instead of something a sentence claims.

      Before this there was one block in that column, so "you return on the
      block nearest the camera" described an event with no alternative and
      therefore no visible content - you cannot teach a tie-break with nothing
      to break. Now the near block is the goal, so the demonstration is a
      success rather than a punishment, which is what a tutorial wants.

      The old line also had the geometry backwards. +z points *toward* the
      camera (AX[0].d, and the camera sits at +z at viewAngle 0), so the loose
      block at z=4 is in front of everything, not "far behind everything" as
      the text used to say. A lesson that describes the opposite of what is on
      screen is worse than no lesson. */
   blocks:(function(){var b=[];box(0,1,0,0,0,0,b);box(3,4,0,0,0,0,b);
     b.push([2,0,4]);b.push([4,0,6]);return b;})(),
   start:[0,1,0],goal:[4,1,6],rotate:false,tutorial:true,
   tut:[
     {say:"Walk to the edge.",
      cue:"bRight",done:function(c){return c.d.right>=1;}},
     {say:"Too far to walk, and there is no jump.<br>Press <b>{to2}</b>: the world flattens along your line of sight, and depth stops existing.",
      cue:"bFlat",done:function(c){return c.flat>=1;}},
     {say:"Depth is gone, so the block that was floating out in front is simply next to you. Walk across.",
      cue:"bRight",done:function(c){return c.m2>=3;}},
     {say:"Press <b>{to3}</b> to stand up.<br>Two blocks share this column, and you always come back on the one <b>nearest the camera</b> — the green one.",
      cue:"bFlat",done:function(c){return c.unflat>=1;}}
   ]},
{name:"00 — First Turn",
   hint:"Two blocks, nowhere near each other. Or so it looks.",
   blocks:[[0,0,0],[5,0,0]],
   start:[0,1,0],goal:[5,1,0],rotate:true,tutorial:true,
   tut:[
     {say:"Nothing lines up from this side. Press <b>&#8631;</b> to turn a quarter turn.",
      cue:"bRotR",done:function(c,st){return st.view===1;}},
     {say:"From here the two blocks are in the <b>same column</b>.<br>Press <b>{to2}</b>.",
      cue:"bFlat",done:function(c){return c.flat>=1;}},
     {say:"Press <b>{to3}</b>. Nearest the camera is now the block that was out of reach — so turning is how you choose which one catches you.",
      cue:"bFlat",done:function(c){return c.unflat>=1;}}
   ]},
/* The four levels below (01, 02, 03 and 05) exist because the curve had a
   hole exactly where a new player stands. The tutorial ends at a difficulty
   score of 12 and the first thing waiting was 21, then 31 — a player was in
   `brutal` by their fourth level, in the one section that is supposed to be
   teaching. Every other section opens with two or three gentle levels; this
   one opened with a cliff. Scores now run 14, 16, 19, 21, 28, 31.

   Each teaches one clause of the rules rather than combining several, and
   none of them uses a special block: fundamentals is stone only. */
{name:"01 — Scattered Steps",
   /* Six blocks at six unrelated depths. Flat, they are a staircase — which
      is the tutorial's lesson again, but with the answer no longer written
      on screen and with height in it, so the plane has to be *read* rather
      than walked. One fold, no turn: nothing here is a decision yet. */
   hint:"Six blocks, six depths, nothing to walk on. Depth is the only thing in the way.",
   blocks:[[0,0,0],[1,1,-8],[2,1,-3],[3,2,-9],[4,2,-6],[5,3,-4]],
   start:[0,1,0],goal:[5,4,-4],rotate:true},
{name:"02 — The Near One",
   /* Rule 5, on its own. The goal's column holds two blocks and you come
      back on the one nearest the camera, which is not the goal — so you have
      to stand up one square early and finish on foot.

      The decoy block is the whole level and it is worth saying why it is not
      wasted geometry: taken out, the solver walks to the goal's own column
      and pops there, same move count, lesson gone. Its cost is a wrong
      landing you can walk back from, not a death. */
   hint:"Two blocks share that column. You return on the one nearest the camera.",
   blocks:[[0,0,0],[1,0,-3],[2,0,-12],[3,0,-3],[4,0,-12],[5,0,-8],[6,0,-8],[6,0,-2]],
   start:[0,1,0],goal:[6,1,-8],rotate:true},
{name:"03 — The Other Axis",
   /* The first level that needs a turn, and it needs one for the simplest
      possible reason: looking this way there is a gap, looking along the
      other axis there is a floor. The three loose blocks are scattered in x
      so that they read as debris from the front and as a bridge from the
      side. Either turn works — the choice is the axis, not the direction. */
   hint:"From here the bridge is three separate blocks. From the side it is a bridge.",
   blocks:[[0,0,0],[8,0,-1],[9,0,-2],[8,0,-3],[3,0,-4]],
   start:[0,1,0],goal:[3,1,-4],rotate:true},
{name:"04 — Turn to see",
   hint:"One projection is blocked. Rotate before you flatten.",
   blocks:(function(){var b=[];b.push([0,0,0]);b.push([3,0,5]);box(7,7,0,0,1,4,b);return b;})(),
   start:[0,1,0],goal:[3,1,5],rotate:true},
{name:"05 — Halfway Across",
   /* The first level where one fold is not enough, which is the idea every
      hard level in the game is built on. The plane is walled at the fourth
      column — two blocks stacked, so there is no step up — and the way past
      is to stand up, climb two in the volume, and flatten again from the new
      height, where the silhouette is a different shape.

      The wall is at a *different depth* from the climb, on purpose. Put the
      same blocks on the route and they block the volume too; put them near
      the camera and they only close the plane, which is exactly the
      distinction the level is teaching. */
   hint:"The plane runs out. Stand up, climb, and flatten again from up there.",
   blocks:[[0,0,0],[1,0,-9],[2,0,-6],[3,1,-1],[3,2,-1],
           [3,1,-6],[4,2,-6],[5,2,-9],[6,2,-4]],
   start:[0,1,0],goal:[6,3,-4],rotate:true},
/* A trial sits in the middle of a section, not at the end of one: four or
   five levels that wait for you, and then one that does not. It carries no
   number for the same reason a boss doesn't - the campaign's numbering is
   the run of ordinary levels, and a landmark that renumbered everything
   after it would cost every saved star to insert (see LEVEL_RENAMES).

   Which is also why it could be moved here for free when the section grew.
   It used to sit after four levels; the four new gentle ones would have
   pushed it to ninth, so it came back to fifth, and no save noticed. */
{name:"TRIAL I — The Metronome",
   hint:"The red slice lands on the beat. Cross in the gaps between.",
   /* THE SLICES RUN DOWN THE DEPTH AXIS, and that is the difficulty of a
      trial rather than a detail of this one.

      A sweep along the axis you are *looking* along cannot be dodged in the
      plane at all: flattened, you are the projection of every depth at once,
      so you stand in every slice of that axis simultaneously. Views 0 and 2
      both look down z. So while a z-slice is live, being flat in the opening
      view is death wherever you stand - and the fold stops being free.

      These used to be x-slices, which are precisely the ones you can safely
      be flat under in the starting view, so the clock never had an opinion
      about the one verb the game has. Now the crossing has to be timed
      *between* beats, or taken from a view turned 90 degrees off the one the
      silhouette needs - which costs the move you were trying to save.

      The `at` values are the three rows the player actually stands in: z=0
      on the near island, z=4 and z=6 on the far one. A slice that threatens
      nobody is decoration. z=0 cannot be first - the player respawns there,
      and trialSafety() rejects a beat that is live where you are born. */
   trial:{period:2500,fire:340,
          beats:[{axis:"z",at:4},{axis:"z",at:0},{axis:"z",at:6}],
          cores:[[7,1,4],[0,1,2],[6,1,6]]},
   /* The far side is offset in depth as well as across, and that is
      structural rather than decorative: two platforms sharing a row of z can
      be joined by one turn and one fold, and the solver finds that in four
      moves flat. A trial that ends before its second beat is not a trial. */
   blocks:(function(){var b=[];box(0,2,0,0,0,2,b);box(5,7,0,0,4,6,b);
     b.push([3,0,9]);b.push([4,0,9]);return b;})(),
   start:[0,1,0],goal:[7,1,4],rotate:true},
{name:"06 — Two Windows",
   hint:"Cross in the plane, land, turn, and do it again from the other side.",
   blocks:[[0,0,0],[1,0,0],[2,1,-4],[3,2,-5],[4,3,-6],[4,3,-5],[1,3,-5]],
   start:[0,1,0],goal:[1,4,-5],rotate:true},
{name:"07 — The Long Way Round",
   hint:"The first landing isn't the destination. It's the vantage point.",
   blocks:[[0,0,0],[0,1,1],[-3,2,0],[-3,2,-1],[-2,2,-1],[-2,3,-2],[-1,4,-2],[1,4,-2]],
   start:[0,1,0],goal:[1,5,-2],rotate:true},
{name:"08 — About Face",
   hint:"One of the four views is the one you need. It is not a near one.",
   blocks:[[0,0,0],[0,1,1],[-1,2,-3],[-1,2,-6],[-3,2,-6]],
   start:[0,1,0],goal:[-3,3,-6],rotate:true},
{name:"09 — The Last Step",
   hint:"You arrive in the plane, but you finish in the volume.",
   blocks:[[0,0,0],[-4,0,1],[-2,0,1],[-2,1,2],[-7,2,1],[4,2,0],[5,2,0]],
   start:[0,1,0],goal:[4,3,0],rotate:true},
{name:"10 — Six Across",
   hint:"A long walk on a silhouette that barely exists.",
   blocks:[[0,0,0],[1,0,2],[2,1,6],[3,1,5],[4,1,4],[5,2,-4],[6,3,-4],[6,3,-2],[3,3,-2]],
   start:[0,1,0],goal:[3,4,-2],rotate:true},
{name:"11 — Fold After Climbing",
   hint:"Height first. The projection you want only opens up from above.",
   blocks:[[0,0,0],[0,0,-1],[0,1,-2],[-2,2,-1],[1,2,-1],[1,3,0],[0,4,-6],[0,4,-5]],
   start:[0,1,0],goal:[0,5,-5],rotate:true},
{name:"12 — Far Side",
   hint:"The second flatten is the long one. Commit to it.",
   blocks:[[0,0,0],[-1,1,0],[-1,2,-1],[-6,2,-2],[-8,2,-2],[-7,2,-5],[-8,3,1],[-9,4,2],[-10,4,-5],[-10,4,-4]],
   start:[0,1,0],goal:[-10,5,-4],rotate:true},
{name:"13 — Three Folds",
   hint:"Three collapses. Each one throws away a different dimension.",
   blocks:[[0,0,0],[-1,1,3],[-1,1,4],[-2,2,4],[-2,3,3],[-2,4,2],[2,4,3],[0,4,3],[0,4,0]],
   start:[0,1,0],goal:[0,5,0],rotate:true},
{name:"BOSS I — The Hunt",
   hint:"It walks onto your line and plants. Fold while it shares your silhouette column and it lands in your square instead. The arena does not stay this empty.",
   /* The first fight anyone meets, and the shape every later one repeats.
      Four phases, and each one changes the question rather than the speed:
      one slow hunter on a bare floor, so the line can be learned with nothing
      else going on; pillars, so rule 4 starts costing you squares to attack
      from; one that will not take a line you can answer, so rotating stops
      being optional; and finally two, which is the only phase that asks you
      to hold more than one line in your head.

      The pillars that rise in phase two are the twin's own, kept because they
      are placed symmetrically and a symmetric arena is the honest one to
      teach on - no corner is quietly better than another.

      ALL of the geometry arrives in phase two, and this is load-bearing
      twice. It makes each phase legible - phase two is the one where the
      arena changes and phases three and four are the ones where the opponent
      does, so a player who dies knows which kind of thing beat them. And it
      makes phase three and phase four a fair comparison: they are the same
      board, so the only difference between "one smarter" and "two ordinary"
      is the opponents themselves, which is the entire question those two
      phases exist to answer. A pillar rising in phase three read as more of
      phase two and buried the change it was supposed to announce. */
   boss:{floorStep:300,creepEvery:7500,
     phases:[
       {at:[[8,1,5]],step:780,aim:900,
        say:"one of them, and nothing in the way"},
       {at:[[8,1,5]],step:700,aim:820,say:"the ground comes up",
        add:[[2,1,1],[6,1,5],[6,1,1],[2,1,5],[4,1,3]]},
       {at:[[8,1,5]],step:640,aim:740,cunning:true,
        say:"same ground — it stops taking the lines you can answer"},
       {at:[[8,1,5],[7,1,3]],step:620,aim:700,say:"same ground — two of them"}]},
   blocks:box(0,8,0,0,0,6,[]),
   start:[1,1,1]},
{name:"14 — Sharp",
   hint:"Red blocks kill you underfoot. In the volume you simply walk around them.",
   blocks:[[0,0,0],[-4,0,1],[-3,0,1],[-2,0,1],[-1,0,1,4],[-1,1,-1]],
   start:[0,1,0],goal:[-4,1,1],rotate:true},
{name:"15 — Cast a Shadow",
   hint:"It was nowhere near you. Then you folded.",
   blocks:[[0,0,0],[0,2,1],[1,1,0],[1,1,1,4]],
   start:[0,1,0],goal:[0,3,1],rotate:true},
{name:"16 — Poisoned Column",
   hint:"One spike ruins the whole line it lands in. Fold from elsewhere.",
   blocks:[[0,0,0],[-4,1,1],[-3,0,1],[-2,0,1],[-1,0,1,4]],
   start:[0,1,0],goal:[-2,1,1],rotate:true},
{name:"17 — Check Behind",
   hint:"Look along the axis before you commit to it.",
   blocks:[[0,0,0],[3,3,-2,4],[-2,0,0],[-2,0,1],[-4,1,2],[-2,1,2],[-5,0,1,4]],
   start:[0,1,0],goal:[-4,2,2],rotate:true},
{name:"TRIAL II — Sharp Rhythm",
   hint:"Spikes take the squares you would have dodged into. Walk to the edge before you fold — the near columns are poisoned.",
   trial:{period:2200,fire:320,
          /* Two depth slices and one across, and the mix is forced rather
             than chosen: this level's spikes were placed to take the squares
             an *x*-sweep leaves you, which means they also take the z-escapes.
             All three depth slices over the near island corner somebody -
             checked - so the near half keeps an x-slice and the far half
             takes depth. One z beat is enough to make folding dangerous,
             because that danger is a property of the axis, not of where the
             slice sits. */
          beats:[{axis:"z",at:4},{axis:"x",at:1},{axis:"z",at:6}],
          cores:[[9,1,4],[0,1,2],[7,1,6]]},
   blocks:(function(){var b=[];box(0,4,0,0,0,2,b);box(7,9,0,0,4,6,b);
     b.push([5,0,9]);b.push([6,0,9]);
     /* Three floor squares bite, and they are the ones the sweeps would
        otherwise have left you. Replaced rather than removed, so the floor
        stays whole: a hole you fall through is a different lesson. */
     var sharp={"1,0,1":1,"3,0,0":1,"3,0,2":1};
     for(var i=0;i<b.length;i++)
       if(sharp[b[i].join(",")])b[i]=[b[i][0],b[i][1],b[i][2],4];
     return b;})(),
   start:[0,1,0],goal:[9,1,4],rotate:true},
{name:"18 — Two Threats",
   hint:"Two spikes, four views, one that works.",
   blocks:[[0,0,0],[0,0,-3],[2,0,-3],[-1,3,6,4],[1,0,-5,4]],
   start:[0,1,0],goal:[2,1,-3],rotate:true},
{name:"19 — Narrow Safety",
   hint:"The safe column is a single square wide. Find it before you fold.",
   blocks:[[0,0,0],[3,0,0],[4,0,1],[5,0,1],[6,0,1,4]],
   start:[0,1,0],goal:[5,1,1],rotate:true},
{name:"20 — Thread It",
   hint:"Two folds, and both of them have teeth.",
   blocks:[[0,0,0],[-2,0,-5],[-1,0,-5],[0,0,-5,4],[-1,1,1]],
   start:[0,1,0],goal:[-1,1,-5],rotate:true},
{name:"BOSS II — Sharp Ground",
   hint:"The ground bites here. A spike casts like stone, so its column kills them exactly as well as a pillar's does — and it kills you underfoot, which a pillar never does.",
   /* Cover and spikes together in phase two, so the section's piece is part
      of "the arena finishes rising" rather than something smuggled in later.
      Phases three and four then change only the opponent - see BOSS I. */
   boss:{creepEvery:7500,
     phases:[
       {at:[[8,1,5]],step:740,aim:880,say:"bare ground, for now"},
       {at:[[8,1,5]],step:670,aim:790,say:"cover for it, and the floor bites",
        add:[[3,1,1],[6,1,4],[5,1,2,4],[2,1,4],[7,1,2,4]]},
       {at:[[8,1,5]],step:610,aim:710,cunning:true,
        say:"same ground — it has stopped being obliging"},
       {at:[[8,1,5],[7,1,6]],step:590,aim:660,say:"same ground — two of them"}]},
   blocks:box(0,9,0,0,0,6,[]),
   start:[1,1,1]},
{name:"21 — Clear Ground",
   hint:"Glass holds you up in the volume. It puts nothing in the plane.",
   blocks:[[0,0,0],[0,1,-1,1],[-1,2,-5],[-1,2,-3],[0,2,-3,1],[0,2,-4,1],[1,2,-4,1],[1,2,-5,1]],
   start:[0,1,0],goal:[1,3,-5],rotate:true},
{name:"22 — Nothing Underfoot",
   hint:"A long walk on a silhouette with a piece missing.",
   blocks:[[0,0,0],[-1,0,2],[-2,1,6],[-3,1,5],[-4,1,4],[-5,2,-4],[-6,3,-4],[-6,3,-2],[-6,3,-3,1],[-6,4,-4,1]],
   start:[0,1,0],goal:[-6,5,-4],rotate:true},
{name:"23 — Twice Transparent",
   hint:"What you stood on to get here won't be there when you fold.",
   blocks:[[0,0,0],[-1,0,2],[-1,0,3],[-1,1,2,1],[0,2,8],[0,2,11,1],[0,3,12,1]],
   start:[0,1,0],goal:[0,4,12],rotate:true},
{name:"24 — Look Through It",
   hint:"Turn first. The glass hides a different hole from every side.",
   blocks:[[0,0,0],[-2,0,1],[-3,0,1],[-2,1,1,1],[-8,2,0],[-11,2,0,1]],
   start:[0,1,0],goal:[-11,3,0],rotate:true},
{name:"TRIAL III — The Depth Slice",
   hint:"A slice down the axis you are looking along cannot be dodged flat — there, you are at every depth. Fold between those beats, or turn until it is one you can step out of.",
   trial:{period:2100,fire:300,
          /* All three on depth, which is what the name promised. This is the
             most fold-heavy route in the game - every leg flattens - so it is
             where a depth slice bites hardest. */
          beats:[{axis:"z",at:1},{axis:"z",at:5},{axis:"z",at:4}],
          cores:[[7,1,4],[4,1,9],[5,1,6]]},
   /* The glass is the fold platform, and it is load-bearing twice over: it
      carries you in the volume, and because it casts nothing, folding from
      the stone behind it drops you into a column with no floor. You have to
      walk out onto the thing that is not there. */
   blocks:(function(){var b=[];box(0,2,0,0,0,2,b);
     b.push([3,0,0,1]);b.push([3,0,1,1]);b.push([3,0,2,1]);
     b.push([4,0,9]);box(5,7,0,0,4,6,b);return b;})(),
   start:[0,1,0],goal:[7,1,4],rotate:true},
{name:"25 — Invisible Architecture",
   hint:"Most of this structure never reaches the page.",
   blocks:[[0,0,0],[0,0,-1,1],[3,0,-2],[-5,0,-3],[-3,0,-3],[-4,1,-3,1],[-8,2,-2],[-10,2,-1],[-9,2,-1,1]],
   start:[0,1,0],goal:[-9,3,-1],rotate:true},
{name:"26 — Down and Around",
   hint:"Descend before you turn. The anchor is waiting either way.",
   blocks:[[0,0,0],[-3,1,-1],[-4,1,-1],[-3,1,0,1],[-2,1,0,1],[-1,1,-6],[0,1,-5],[0,1,-4]],
   start:[0,1,0],goal:[0,2,-4],rotate:true},
{name:"27 — Long Division",
   hint:"A long walk on each side of the turn.",
   blocks:[[0,0,0],[-1,0,0,1],[-2,0,3],[-2,0,6],[-2,0,7],[-1,1,7,1],[3,2,8],[5,2,9],[2,3,10],[2,3,11],[-1,3,11]],
   start:[0,1,0],goal:[-1,4,11],rotate:true},
{name:"28 — Two Dangers",
   hint:"Glass under your feet and something sharp down the axis.",
   blocks:[[0,0,0],[3,1,0,1],[3,1,1],[3,1,-1],[4,1,-1,4],[5,3,-4,1]],
   start:[0,1,0],goal:[3,2,-1],rotate:true},
{name:"BOSS III — Through Glass",
   hint:"Glass casts nothing. The pillars you can see through are the ones that will not kill them — check which shadow you are herding them into.",
   /* Stone and glass rise together in phase two, so the lesson of the arena -
      the pillars you can see through are the ones you can still attack from -
      is learned against an ordinary hunter, and then tested against a cunning
      one on exactly the same board. */
   boss:{creepEvery:7000,
     phases:[
       {at:[[8,1,5]],step:720,aim:860,say:"clear glass, clear floor"},
       {at:[[8,1,5]],step:650,aim:770,say:"stone you cannot fold through, glass you can",
        add:[[3,1,2],[7,1,4],[6,1,1],[5,1,1,1],[2,1,5,1],[8,1,3,1]]},
       {at:[[8,1,5]],step:600,aim:700,cunning:true,
        say:"same ground — it has started choosing"},
       {at:[[8,1,5],[7,1,6]],step:570,aim:650,say:"same ground — two of them"}]},
   blocks:box(0,9,0,0,0,6,[]),
   start:[1,1,1]},
{name:"29 — Shove",
   hint:"Violet blocks move when you walk into them. The plane notices.",
   blocks:[[-1,0,3],[-2,0,-1],[-1,0,-1],[0,0,-1],[0,0,0],[-1,1,-1,3]],
   start:[0,1,0],goal:[-1,1,3],rotate:true},
{name:"30 — Make a Bridge",
   hint:"Put it where the fold will need it, then fold.",
   blocks:[[-2,0,5],[-1,1,-2],[-1,1,-1],[-1,1,0],[0,0,0],[-1,2,-1,3]],
   start:[0,1,0],goal:[-2,1,5],rotate:true},
{name:"31 — Shove and Turn",
   hint:"The crate is only useful from one of the four views.",
   blocks:[[-2,0,0],[-1,0,0],[0,0,0],[1,2,1],[-1,1,0,3],[1,2,-2,3]],
   start:[0,1,0],goal:[1,3,1],rotate:true},
{name:"32 — Shove It Clear",
   hint:"Move the block, or the column it lands in will kill you.",
   blocks:[[0,0,0],[-3,0,1,4],[-2,0,1],[-1,1,-3],[-1,1,-2],[-1,1,-1],[-1,1,0],[4,0,6,4],[-1,2,-2,3]],
   start:[0,1,0],goal:[-2,1,1],rotate:true},
{name:"33 — There and Back",
   hint:"Fold, land, move it, fold again.",
   blocks:[[4,2,1],[1,0,4],[2,0,4],[3,0,4],[0,0,0],[2,1,4,3]],
   start:[0,1,0],goal:[4,3,1],rotate:true},
{name:"TRIAL IV — Every Slice",
   hint:"Three axes now, and the high ground is one of them. The crossing happens up here — so does the slice that owns this height.",
   trial:{period:2000,fire:320,
          /* Still every axis - that is this one's whole idea - but weighted
             onto depth now that depth is the axis which punishes the fold. */
          beats:[{axis:"y",at:2},{axis:"z",at:2},{axis:"x",at:6},
                 {axis:"z",at:1}],
          cores:[[7,1,4],[0,1,1],[7,1,6]]},
   blocks:(function(){var b=[];
     box(0,0,0,0,0,2,b);                       // the island you start on
     /* A catwalk one square wide, with a lane under each side. The width is
        load-bearing: the sweep that takes this height has to be dodgeable by
        stepping off it, and two squares of high ground would corner you in
        the middle of it - which is exactly what trialSafety() checks. */
     b.push([1,1,1]);b.push([2,1,1]);b.push([3,1,1]);
     box(1,3,0,0,0,0,b);box(1,3,0,0,2,2,b);
     // The bridge, deep behind, with a step down beside it for the same
     // reason the catwalk has lanes.
     b.push([4,1,8]);b.push([5,1,8]);b.push([4,0,9]);b.push([5,0,9]);
     b.push([6,1,5]);b.push([7,1,5]);          // the far catwalk
     box(6,7,0,0,4,4,b);box(6,7,0,0,6,6,b);
     return b;})(),
   start:[0,1,0],goal:[7,1,4],rotate:true},
{name:"34 — Push Through Nothing",
   hint:"The crate makes the plane; the glass unmakes the volume.",
   blocks:[[0,0,0],[1,2,-3,1],[3,2,-3],[4,0,-5],[4,0,-4],[4,0,-3],[1,1,1],[2,1,1,1],[4,1,-4,3]],
   start:[0,1,0],goal:[4,1,-4],rotate:true},
{name:"35 — Reshape",
   hint:"One shove between two folds changes the whole silhouette.",
   blocks:[[5,1,-3],[-1,1,-4],[-1,1,-3],[-1,1,-2],[-1,1,-1],[0,0,0],[-1,2,-3,3]],
   start:[0,1,0],goal:[5,2,-3],rotate:true},
{name:"36 — Confluence",
   hint:"All three now. Read the depth before you commit.",
   blocks:[[0,0,0],[4,1,2,1],[4,1,3],[4,1,5,1],[2,0,0],[2,0,1],[2,0,2,4],[2,1,1,3]],
   start:[0,1,0],goal:[4,2,3],rotate:true},
{name:"37 — Turn, Shove, Fold",
   hint:"Face the right way first. The safe column is not the obvious one.",
   blocks:[[0,0,0],[-3,0,-3,4],[-3,0,-2],[-3,0,-1],[-3,0,0,1],[5,1,-4],[-3,2,-4,1],[-3,1,-2,3]],
   start:[0,1,0],goal:[5,2,-4],rotate:true},
{name:"38 — Twice Pushed",
   hint:"It takes two shoves to get it where it belongs.",
   blocks:[[1,1,1],[1,1,2],[1,1,3],[1,1,4],[2,2,5],[0,0,0],[1,2,2,3],[1,3,2,3]],
   start:[0,1,0],goal:[2,3,5],rotate:true},
{name:"BOSS IV — The Orthogon",
   hint:"Everything the game knows, one piece at a time. The crates are the attack that still works when the geometry is against you — shove one into a column that had no shadow in it.",
   /* The finale, so phase two brings the whole game at once - stone, spike,
      glass and the crates. The crates in particular can only ever arrive in
      one phase: rebuilding the crate list is what puts them on the board, and
      doing it a second time would snap any crate you had already shoved back
      to where it started. */
   boss:{creepEvery:6500,
     phases:[
       {at:[[9,1,6]],step:700,aim:820,say:"the widest floor in the game"},
       {at:[[9,1,6]],step:630,aim:730,say:"everything at once — and two crates to shove",
        add:[[3,1,2],[7,1,2],[5,1,5],[3,1,5,4],[8,1,3,1],[7,1,5,3],[5,1,2,3]]},
       {at:[[9,1,6]],step:580,aim:670,cunning:true,
        say:"same ground — it has stopped being obliging"},
       {at:[[9,1,6],[8,1,7]],step:550,aim:620,say:"same ground — two of them"}]},
   blocks:box(0,10,0,0,0,7,[]),
   start:[1,1,1]},
{name:"39 — Up and Over",
   hint:"Three folds and two shoves. The crate has to travel.",
   blocks:[[3,0,1],[0,0,3],[1,0,3],[2,0,3],[3,0,3],[1,2,-5],[3,2,-5],[0,0,0],[2,1,3,3]],
   start:[0,1,0],goal:[1,3,-5],rotate:true},
{name:"40 — Down and Through",
   hint:"Descend, shove, and fold twice from opposite sides.",
   blocks:[[0,0,0],[-3,3,1],[-3,3,2,1],[-3,3,4],[1,1,0],[1,1,1],[1,1,2,1],[0,3,3,4],[1,2,1,3]],
   start:[0,1,0],goal:[-3,4,4],rotate:true},
{name:"41 — Reach Across",
   hint:"The crate goes one way and you go the other.",
   blocks:[[0,0,0],[1,2,6],[2,2,6],[3,1,1],[3,1,2],[3,1,3],[0,2,1,1],[0,2,2,4],[3,2,2,3]],
   start:[0,1,0],goal:[1,3,6],rotate:true},
{name:"42 — Three Folds, Three Threats",
   hint:"Three collapses, and something waiting in each.",
   blocks:[[0,0,0],[1,2,1],[0,3,-3],[1,3,-3,1],[4,3,-2],[4,3,-1],[4,3,0,4],[4,3,1],[0,1,1,1],[4,4,-1,3]],
   start:[0,1,0],goal:[4,4,1],rotate:true},
{name:"43 — The Whole Language",
   hint:"Everything the game knows how to say, in one level.",
   blocks:[[0,0,0],[-5,2,-2],[-4,2,-2,1],[-3,2,-2],[2,3,2],[5,1,-1,4],[-2,3,0],[-1,3,0],[-5,1,1],[-5,1,2],[-5,1,3],[-5,2,2,3]],
   start:[0,1,0],goal:[-1,4,0],rotate:true},
{name:"44 — The Middle One",
   hint:"Three places to land in that column. Turning reaches the ends, never the middle.",
   blocks:[[0,0,0],[0,0,6,2],[0,0,9],[3,0,5]],
   start:[0,1,0],goal:[3,1,5],rotate:true},
{name:"45 — Claimed",
   hint:"Amber catches you on the way past.",
   blocks:[[0,0,0],[0,0,3],[0,0,6,2],[0,0,8],[0,0,11],[4,0,9],[9,0,9,2],[12,0,9],[9,0,7]],
   start:[0,1,0],goal:[9,1,7],rotate:true},
{name:"46 — Walk First",
   hint:"Where you fold from decides which column you are choosing between.",
   blocks:[[0,0,0],[1,0,0],[1,0,5,2],[1,0,8],[1,0,13],[6,0,6],[5,0,6],[4,0,6]],
   start:[0,1,0],goal:[6,1,6],rotate:true},
{name:"47 — Two Middles",
   hint:"Two columns, and in each one the answer is inside.",
   blocks:[[0,0,0],[0,0,6,2],[0,0,11],[0,0,17],[2,0,7,2],[7,0,7],[2,0,8]],
   start:[0,1,0],goal:[2,1,8],rotate:true},
{name:"48 — Past the Landing",
   hint:"You arrive, and there is still somewhere to go.",
   blocks:[[0,0,0],[0,0,4,2],[0,0,10],[2,0,5,2],[5,0,5],[2,0,4]],
   start:[0,1,0],goal:[2,1,4],rotate:true},
{name:"49 — Deeper In",
   hint:"A longer walk in the plane before the second claim.",
   blocks:[[0,0,0],[1,0,0],[1,0,4],[1,0,9,2],[1,0,12],[1,0,17],[4,0,8,2],[9,0,8],[4,0,7]],
   start:[0,1,0],goal:[4,1,7],rotate:true},
{name:"50 — Both Inside",
   hint:"Both columns, both middles, one route.",
   blocks:[[0,0,0],[1,0,0],[2,0,0],[2,0,2,2],[2,0,6],[2,0,12],[7,0,3,2],[11,0,3],[7,0,4]],
   start:[0,1,0],goal:[7,1,4],rotate:true},
{name:"51 — Held Fast",
   hint:"Shove it onto the amber. It will never move again, which is the point.",
   blocks:[[0,0,0],[1,0,-4],[2,0,-4],[3,0,-4,2],[4,0,-4],[2,2,-2],[2,1,-4,3]],
   start:[0,1,0],goal:[2,3,-2],rotate:true},
{name:"52 — One Chance",
   hint:"You only get to place it once.",
   blocks:[[0,0,0],[2,3,6,2],[2,3,7],[1,1,-6],[2,1,-6],[3,1,-6,2],[2,2,-6,3]],
   start:[0,1,0],goal:[2,4,7],rotate:true},
{name:"53 — Set in Amber",
   hint:"Glass under you, a crate pinned in front of you.",
   blocks:[[0,0,0],[1,3,4],[1,2,2],[-5,1,1],[-5,1,2],[-5,1,3,2],[-5,1,4],[-5,2,2,3]],
   start:[0,1,0],goal:[1,4,4],rotate:true},
{name:"54 — Pin It Down",
   hint:"Fold, land, pin, and fold again from the same spot.",
   blocks:[[0,0,0],[-4,0,3],[-4,0,4],[-1,0,1,2],[-1,0,2],[-1,0,3],[-1,0,4,2],[-1,1,3,3]],
   start:[0,1,0],goal:[-4,1,4],rotate:true},
{name:"55 — Two Shoves, One Home",
   hint:"Twice pushed, and only the second landing counts.",
   blocks:[[0,0,0],[-2,1,-4],[-2,1,-3,2],[-2,1,-2],[-2,1,-1,2],[-5,0,-2],[0,3,-2],[0,3,-1],[-2,2,-2,3]],
   start:[0,1,0],goal:[0,4,-1],rotate:true},
{name:"56 — Down to the Amber",
   hint:"Push it down before you go around.",
   blocks:[[0,0,0],[2,3,1],[2,3,2],[2,3,3,2],[-2,1,2],[-2,1,3],[-2,1,4,2],[-2,1,5],[-1,1,2],[-2,2,3,3]],
   start:[0,1,0],goal:[2,4,1],rotate:true},
{name:"57 — Three Ways Round",
   hint:"Three folds, and the crate must be fixed before the last.",
   blocks:[[0,0,0],[-3,2,-5,2],[-2,2,-5],[-1,2,-5],[4,0,-6],[4,0,-5],[4,0,-4,2],[-1,0,-6],[4,1,-5,3]],
   start:[0,1,0],goal:[-1,3,-5],rotate:true},
{name:"58 — Turn Twice More",
   hint:"Every view matters, and the crate is only right in one of them.",
   blocks:[[0,0,0],[-5,2,2],[0,2,-2],[2,2,-2],[-1,0,1],[-1,0,2],[-1,0,3,2],[-1,0,4,2],[-1,1,2,3]],
   start:[0,1,0],goal:[2,3,-2],rotate:true},
{name:"59 — The Last Placement",
   hint:"Everything the amber can do, all at once.",
   blocks:[[0,0,0],[-5,0,-2],[-4,0,-2],[-3,0,-2,2],[0,0,4],[1,0,4],[2,0,4],[3,0,4,2],[4,2,-3],[1,1,4,3]],
   start:[0,1,0],goal:[-5,1,-2],rotate:true},
{name:"60 — Long Glass",
   hint:"Glass to stand on, amber to land on, and one turn between.",
   blocks:[[0,0,0],[-1,0,-4],[-2,0,-4],[-3,0,4],[-3,0,-2],[-3,0,-1,1],[-4,1,-1,1],[-8,2,-2],[-9,2,-2]],
   start:[0,1,0],goal:[-9,3,-2],rotate:true},
{name:"61 — Absent Floor",
   hint:"What carried you across the plane was never in the volume.",
   blocks:[[0,0,0],[-1,0,0],[-2,1,5],[-2,1,-3],[-2,1,-4,1],[-1,2,-4,1],[-3,2,-5],[2,2,-6],[-7,2,-6],[-3,3,-5]],
   start:[0,1,0],goal:[-7,3,-6],rotate:true},
{name:"62 — Twice Up",
   hint:"Climb, fold, climb again, and fold back the other way.",
   blocks:[[0,0,0],[1,0,0,1],[2,0,3],[2,0,6],[2,0,7],[3,1,7,1],[4,2,11],[5,2,13],[6,3,10],[7,3,10],[7,3,7]],
   start:[0,1,0],goal:[7,4,7],rotate:true},
{name:"63 — The Far Shore",
   hint:"The longest crossing in the game, and a hole in the middle of it.",
   blocks:[[0,0,0],[-1,0,0],[-2,1,5],[-2,1,-3],[-1,1,-3,1],[-1,2,-2,1],[-3,2,-1],[2,2,0],[-7,2,0],[-3,3,-1]],
   start:[0,1,0],goal:[-7,3,0],rotate:true},
{name:"64 — Three Folds Deep",
   hint:"Three collapses, and something transparent in each one.",
   blocks:[[0,0,0],[1,0,2],[1,0,-5],[5,1,-4],[2,1,-4,1],[3,2,-4,1],[-2,3,-5],[8,3,-6],[-2,3,-7],[5,4,-8],[0,4,-9],[-2,4,-9,1]],
   start:[0,1,0],goal:[-2,5,-9],rotate:true},
{name:"65 — Everything at Once",
   hint:"Three folds, three anchors, glass throughout. Good luck.",
   blocks:[[0,0,0],[0,1,-1],[-5,1,-2],[2,1,-2],[1,1,-2,1],[1,1,-3,1],[4,2,-4],[6,3,-5],[-3,3,-5],[-4,3,-10],[-4,3,-8]],
   start:[0,1,0],goal:[-4,4,-8],rotate:true}
];

/* Section markers hold array indices, so inserting a level means shifting
   every marker after it. `locked` sections stay closed until the campaign
   proper is finished - see sectionsUnlocked() in 16-panels.js. */
/* `col` is the section's identity on the map - the tab, the header, the
   progress bar. It is decoration only: the *nodes* keep the game's semantic
   colours (green solved, amber trial, violet boss) so no section can make a
   piece mean something different from the section before it.

   The tutorials get a section of their own so the map has somewhere to put
   them. `at:0` shifts nothing, because these are array indices and every
   other marker keeps the index it already had. */
/* `col` is the section's colour, and on the map it runs the whole way
   through: the tab, the header, the progress bar, the trail behind you and
   the solved nodes themselves. A section you have finished should be a
   different colour of chain from the one before it, so the campaign reads as
   places rather than as one long green line.

   The six are picked to stay clear of the two colours that are *not* free to
   vary: violet is the boss and amber is the trial, everywhere, in every
   section. So no section is violet or amber - `V · EXTRA` used to be violet
   and had to move, because a whole shelf the colour of a boss makes the one
   thing on it that is a boss unreadable. */
var SECTIONS=[
  {at:0, name:"PROLOGUE", sub:"walking, folding, turning — one verb each", col:"#7183a6"},
  {at:3, name:"I · FUNDAMENTALS", sub:"one verb: collapse the world and cross the gap", col:"#35c2a5"},
  {at:18, name:"II · SPIKES", sub:"a hazard you cannot see until you fold", col:"#e0455f"},
  {at:27, name:"III · GLASS", sub:"solid in the volume, absent from the plane", col:"#7fb2ff"},
  /* Purple, because a crate is drawn pale violet in the world - the section
     wears the colour of the piece it teaches. It is deliberately pinker and
     lighter than the boss's #a274ff so the two are not the same purple; the
     boss also carries its four-arc ring, which is what actually tells them
     apart. This is the closest any section gets to a reserved colour, and
     the pair should be pulled further apart when the boss is revisited. */
  {at:37, name:"IV · CRATES", sub:"change the plane by moving the volume", col:"#c07ae0"},
  {at:49, name:"V · EXTRA", sub:"unlocked by the Orthogon — the long ones", col:"#3fc4d4", locked:true}
];

/* Levels have been renumbered more than once. Progress is keyed by name,
   so without this every solved level would read unsolved. Entries compose
   across reshuffles - the oldest name still resolves to the current one -
   so never rewrite this table, only extend it. Applied by migrateNames()
   in 06-persistence.js. */
var LEVEL_RENAMES={
 "BOSS I — The Sentinel": "BOSS I — The Hunt",
 "BOSS I — The Pack": "BOSS I — The Hunt",
 "BOSS I — The Twin": "BOSS I — The Hunt",
 "02 — Turn to see": "04 — Turn to see",
 "03 — Two Windows": "06 — Two Windows",
 "04 — The Long Way Round": "07 — The Long Way Round",
 "05 — About Face": "08 — About Face",
 "06 — The Last Step": "09 — The Last Step",
 "07 — Six Across": "10 — Six Across",
 "08 — Fold After Climbing": "11 — Fold After Climbing",
 "09 — Far Side": "12 — Far Side",
 "10 — Three Folds": "13 — Three Folds",
 "18 — Sharp": "14 — Sharp",
 "19 — Cast a Shadow": "15 — Cast a Shadow",
 "20 — Poisoned Column": "16 — Poisoned Column",
 "22 — Check Behind": "17 — Check Behind",
 "23 — Two Threats": "18 — Two Threats",
 "24 — Narrow Safety": "19 — Narrow Safety",
 "41 — Thread It": "20 — Thread It",
 "11 — Clear Ground": "21 — Clear Ground",
 "12 — Nothing Underfoot": "22 — Nothing Underfoot",
 "13 — Twice Transparent": "23 — Twice Transparent",
 "14 — Look Through It": "24 — Look Through It",
 "15 — Invisible Architecture": "25 — Invisible Architecture",
 "16 — Down and Around": "26 — Down and Around",
 "17 — Long Division": "27 — Long Division",
 "21 — Two Dangers": "28 — Two Dangers",
 "39 — Confluence": "36 — Confluence",
 "40 — Turn, Shove, Fold": "37 — Turn, Shove, Fold",
 "42 — Twice Pushed": "38 — Twice Pushed",
 "45 — Up and Over": "39 — Up and Over",
 "43 — Down and Through": "40 — Down and Through",
 "44 — Reach Across": "41 — Reach Across",
 "57 — Three Folds, Three Threats": "42 — Three Folds, Three Threats",
 "60 — The Whole Language": "43 — The Whole Language",
 "32 — The Middle One": "44 — The Middle One",
 "33 — Claimed": "45 — Claimed",
 "34 — Walk First": "46 — Walk First",
 "35 — Two Middles": "47 — Two Middles",
 "36 — Past the Landing": "48 — Past the Landing",
 "37 — Deeper In": "49 — Deeper In",
 "38 — Both Inside": "50 — Both Inside",
 "46 — Held Fast": "51 — Held Fast",
 "47 — One Chance": "52 — One Chance",
 "48 — Set in Amber": "53 — Set in Amber",
 "49 — Pin It Down": "54 — Pin It Down",
 "50 — Two Shoves, One Home": "55 — Two Shoves, One Home",
 "51 — Down to the Amber": "56 — Down to the Amber",
 "52 — Three Ways Round": "57 — Three Ways Round",
 "58 — Turn Twice More": "58 — Turn Twice More",
 "59 — The Last Placement": "59 — The Last Placement",
 "55 — Long Glass": "60 — Long Glass",
 "53 — Absent Floor": "61 — Absent Floor",
 "54 — Twice Up": "62 — Twice Up",
 "56 — The Far Shore": "63 — The Far Shore",
 "61 — Three Folds Deep": "64 — Three Folds Deep",
 "62 — Everything at Once": "65 — Everything at Once",
 "11 — Sharp": "14 — Sharp",
 "12 — Cast a Shadow": "15 — Cast a Shadow",
 "13 — Poisoned Column": "16 — Poisoned Column",
 "14 — Check Behind": "17 — Check Behind",
 "15 — Two Threats": "18 — Two Threats",
 "16 — Narrow Safety": "19 — Narrow Safety",
 "17 — Thread It": "20 — Thread It",
 "18 — Clear Ground": "21 — Clear Ground",
 "19 — Nothing Underfoot": "22 — Nothing Underfoot",
 "20 — Twice Transparent": "23 — Twice Transparent",
 "21 — Look Through It": "24 — Look Through It",
 "22 — Invisible Architecture": "25 — Invisible Architecture",
 "23 — Down and Around": "26 — Down and Around",
 "24 — Long Division": "27 — Long Division",
 "25 — Two Dangers": "28 — Two Dangers",
 "26 — Shove": "29 — Shove",
 "27 — Make a Bridge": "30 — Make a Bridge",
 "28 — Shove and Turn": "31 — Shove and Turn",
 "29 — Shove It Clear": "32 — Shove It Clear",
 "30 — There and Back": "33 — There and Back",
 "31 — Push Through Nothing": "34 — Push Through Nothing",
 "32 — Reshape": "35 — Reshape",
 "33 — Confluence": "36 — Confluence",
 "34 — Turn, Shove, Fold": "37 — Turn, Shove, Fold",
 "35 — Twice Pushed": "38 — Twice Pushed",
 "36 — Up and Over": "39 — Up and Over",
 "37 — Down and Through": "40 — Down and Through",
 "38 — Reach Across": "41 — Reach Across",
 "39 — Three Folds, Three Threats": "42 — Three Folds, Three Threats",
 "40 — The Whole Language": "43 — The Whole Language",
 "41 — The Middle One": "44 — The Middle One",
 "42 — Claimed": "45 — Claimed",
 "43 — Walk First": "46 — Walk First",
 "44 — Two Middles": "47 — Two Middles",
 "45 — Past the Landing": "48 — Past the Landing",
 "46 — Deeper In": "49 — Deeper In",
 "47 — Both Inside": "50 — Both Inside",
 "48 — Held Fast": "51 — Held Fast",
 "49 — One Chance": "52 — One Chance",
 "50 — Set in Amber": "53 — Set in Amber",
 "51 — Pin It Down": "54 — Pin It Down",
 "52 — Two Shoves, One Home": "55 — Two Shoves, One Home",
 "53 — Down to the Amber": "56 — Down to the Amber",
 "54 — Three Ways Round": "57 — Three Ways Round",
 "55 — Turn Twice More": "58 — Turn Twice More",
 "56 — The Last Placement": "59 — The Last Placement",
 "57 — Long Glass": "60 — Long Glass",
 "58 — Absent Floor": "61 — Absent Floor",
 "59 — Twice Up": "62 — Twice Up",
 "60 — The Far Shore": "63 — The Far Shore",
 "04 — Two Windows": "06 — Two Windows",
 "05 — The Long Way Round": "07 — The Long Way Round",
 "06 — About Face": "08 — About Face",
 "09 — The Last Step": "09 — The Last Step",
 "10 — Far Side": "12 — Far Side",
 "11 — Three Folds": "13 — Three Folds",
 "12 — Clear Ground": "21 — Clear Ground",
 "13 — Nothing Underfoot": "22 — Nothing Underfoot",
 "14 — Twice Transparent": "23 — Twice Transparent",
 "15 — Look Through It": "24 — Look Through It",
 "16 — Invisible Architecture": "25 — Invisible Architecture",
 "58 — Down and Around": "26 — Down and Around",
 "59 — Long Division": "27 — Long Division",
 "17 — Sharp": "14 — Sharp",
 "18 — Cast a Shadow": "15 — Cast a Shadow",
 "19 — Poisoned Column": "16 — Poisoned Column",
 "38 — Two Dangers": "28 — Two Dangers",
 "20 — Check Behind": "17 — Check Behind",
 "21 — Two Threats": "18 — Two Threats",
 "22 — Narrow Safety": "19 — Narrow Safety",
 "24 — Shove": "29 — Shove",
 "25 — Make a Bridge": "30 — Make a Bridge",
 "26 — Shove and Turn": "31 — Shove and Turn",
 "40 — Shove It Clear": "32 — Shove It Clear",
 "27 — There and Back": "33 — There and Back",
 "39 — Push Through Nothing": "34 — Push Through Nothing",
 "28 — Reshape": "35 — Reshape",
 "31 — The Middle One": "44 — The Middle One",
 "32 — Claimed": "45 — Claimed",
 "33 — Walk First": "46 — Walk First",
 "34 — Two Middles": "47 — Two Middles",
 "35 — Past the Landing": "48 — Past the Landing",
 "36 — Deeper In": "49 — Deeper In",
 "37 — Both Inside": "50 — Both Inside",
 "41 — Confluence": "36 — Confluence",
 "42 — Turn, Shove, Fold": "37 — Turn, Shove, Fold",
 "23 — Thread It": "20 — Thread It",
 "29 — Twice Pushed": "38 — Twice Pushed",
 "30 — Up and Over": "39 — Up and Over",
 "60 — Twice Up": "62 — Twice Up",
 "61 — The Far Shore": "63 — The Far Shore",
 "45 — Three Folds, Three Threats": "42 — Three Folds, Three Threats",
 "46 — The Whole Language": "43 — The Whole Language",
 "62 — Three Folds Deep": "64 — Three Folds Deep",
 "63 — Everything at Once": "65 — Everything at Once",
 "01 — Turn to see": "04 — Turn to see",
 "02 — Two Windows": "06 — Two Windows",
 "03 — The Long Way Round": "07 — The Long Way Round",
 "04 — About Face": "08 — About Face",
 "05 — The Last Step": "09 — The Last Step",
 "06 — Six Across": "10 — Six Across",
 "07 — Fold After Climbing": "11 — Fold After Climbing",
 "08 — Far Side": "12 — Far Side",
 "09 — Three Folds": "13 — Three Folds",
 "10 — Sharp": "14 — Sharp",
 "11 — Cast a Shadow": "15 — Cast a Shadow",
 "12 — Poisoned Column": "16 — Poisoned Column",
 "13 — Check Behind": "17 — Check Behind",
 "14 — Two Threats": "18 — Two Threats",
 "15 — Narrow Safety": "19 — Narrow Safety",
 "16 — Thread It": "20 — Thread It",
 "17 — Clear Ground": "21 — Clear Ground",
 "18 — Nothing Underfoot": "22 — Nothing Underfoot",
 "19 — Twice Transparent": "23 — Twice Transparent",
 "20 — Look Through It": "24 — Look Through It",
 "21 — Invisible Architecture": "25 — Invisible Architecture",
 "22 — Down and Around": "26 — Down and Around",
 "23 — Long Division": "27 — Long Division",
 "24 — Two Dangers": "28 — Two Dangers",
 "25 — Shove": "29 — Shove",
 "26 — Make a Bridge": "30 — Make a Bridge",
 "27 — Shove and Turn": "31 — Shove and Turn",
 "28 — Shove It Clear": "32 — Shove It Clear",
 "29 — There and Back": "33 — There and Back",
 "30 — Push Through Nothing": "34 — Push Through Nothing",
 "31 — Reshape": "35 — Reshape",
 "32 — Confluence": "36 — Confluence",
 "33 — Turn, Shove, Fold": "37 — Turn, Shove, Fold",
 "34 — Twice Pushed": "38 — Twice Pushed",
 "35 — Up and Over": "39 — Up and Over",
 "36 — Down and Through": "40 — Down and Through",
 "37 — Reach Across": "41 — Reach Across",
 "38 — Three Folds, Three Threats": "42 — Three Folds, Three Threats",
 "39 — The Whole Language": "43 — The Whole Language",
 "40 — The Middle One": "44 — The Middle One",
 "41 — Claimed": "45 — Claimed",
 "42 — Walk First": "46 — Walk First",
 "43 — Two Middles": "47 — Two Middles",
 "44 — Past the Landing": "48 — Past the Landing",
 "45 — Deeper In": "49 — Deeper In",
 "46 — Both Inside": "50 — Both Inside",
 "47 — Held Fast": "51 — Held Fast",
 "48 — One Chance": "52 — One Chance",
 "49 — Set in Amber": "53 — Set in Amber",
 "50 — Pin It Down": "54 — Pin It Down",
 "51 — Two Shoves, One Home": "55 — Two Shoves, One Home",
 "52 — Down to the Amber": "56 — Down to the Amber",
 "53 — Three Ways Round": "57 — Three Ways Round",
 "54 — Turn Twice More": "58 — Turn Twice More",
 "55 — The Last Placement": "59 — The Last Placement",
 "56 — Long Glass": "60 — Long Glass",
 "57 — Absent Floor": "61 — Absent Floor",
 "58 — Twice Up": "62 — Twice Up",
 "59 — The Far Shore": "63 — The Far Shore",
 "60 — Three Folds Deep": "64 — Three Folds Deep",
 "61 — Everything at Once": "65 — Everything at Once"
};
