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
   tut:[
     {say:"You are the pink cube. The green square is where you're going.<br>Press <b>&#9654;</b> twice to walk to the corner.",
      cue:"bRight",done:function(c){return c.d.right>=2;}},
     {say:"<b>&#9650;</b> and <b>&#9660;</b> move away from and toward the camera.<br>Press <b>&#9650;</b> to follow the path back.",
      cue:"bUp",done:function(c){return c.d.up>=2;}},
     {say:"There is no jump. A block one high is a <b>step</b> — walk straight into it.",
      cue:"bUp",done:function(c){return c.climb>=1;}}
   ]},
{name:"00 — First Fold",
   hint:"The gap is not crossable. The gap is not the point.",
   blocks:(function(){var b=[];box(0,1,0,0,0,0,b);box(3,4,0,0,0,0,b);
     b.push([2,0,4]);return b;})(),
   start:[0,1,0],goal:[4,1,0],rotate:false,tutorial:true,
   tut:[
     {say:"Walk right to the edge.",
      cue:"bRight",done:function(c){return c.d.right>=1;}},
     {say:"Too far to walk, and there is no jump. Instead, <b>collapse the world</b> along your line of sight.",
      cue:"bFlat",done:function(c){return c.flat>=1;}},
     {say:"Depth is gone. That lonely block was far behind everything — now it is simply next to you. Walk across.",
      cue:"bRight",done:function(c){return c.m2>=3;}},
     {say:"Stand back up. You return on the block <b>nearest the camera</b> in that column.",
      cue:"bFlat",done:function(c){return c.unflat>=1;}}
   ]},
{name:"00 — First Turn",
   hint:"Two blocks, nowhere near each other. Or so it looks.",
   blocks:[[0,0,0],[5,0,0]],
   start:[0,1,0],goal:[5,1,0],rotate:true,tutorial:true,
   tut:[
     {say:"Nothing lines up from this side. Turn the camera 90&deg; with <b>&#8631;</b>.",
      cue:"bRotR",done:function(c,st){return st.view===1;}},
     {say:"From here the two blocks sit in the <b>same column</b>. Collapse.",
      cue:"bFlat",done:function(c){return c.flat>=1;}},
     {say:"Stand back up. Nearest-the-camera is now the far block — which is the whole trick.",
      cue:"bFlat",done:function(c){return c.unflat>=1;}}
   ]},
{name:"01 — Turn to see",
   hint:"One projection is blocked. Rotate before you flatten.",
   blocks:(function(){var b=[];b.push([0,0,0]);b.push([3,0,5]);box(7,7,0,0,1,4,b);return b;})(),
   start:[0,1,0],goal:[3,1,5],rotate:true},
{name:"02 — Two Windows",
   hint:"Cross in the plane, land, turn, and do it again from the other side.",
   blocks:[[0,0,0],[1,0,0],[2,1,-4],[3,2,-5],[4,3,-6],[4,3,-5],[1,3,-5]],
   start:[0,1,0],goal:[1,4,-5],rotate:true},
{name:"03 — The Long Way Round",
   hint:"The first landing isn't the destination. It's the vantage point.",
   blocks:[[0,0,0],[0,1,1],[-3,2,0],[-3,2,-1],[-2,2,-1],[-2,3,-2],[-1,4,-2],[1,4,-2]],
   start:[0,1,0],goal:[1,5,-2],rotate:true},
{name:"04 — About Face",
   hint:"One of the four views is the one you need. It is not a near one.",
   blocks:[[0,0,0],[0,1,1],[-1,2,-3],[-1,2,-6],[-3,2,-6]],
   start:[0,1,0],goal:[-3,3,-6],rotate:true},
/* A trial sits in the middle of a section, not at the end of one: four or
   five levels that wait for you, and then one that does not. It carries no
   number for the same reason a boss doesn't - the campaign's numbering is
   the run of ordinary levels, and a landmark that renumbered everything
   after it would cost every saved star to insert (see LEVEL_RENAMES). */
{name:"TRIAL I — The Metronome",
   hint:"The red slice lands on the beat. Cross in the gaps between.",
   trial:{period:2500,fire:340,
          beats:[{axis:"x",at:6},{axis:"x",at:2},{axis:"x",at:4}],
          cores:[[7,1,4],[0,1,2],[6,1,6]]},
   /* The far side is offset in depth as well as across, and that is
      structural rather than decorative: two platforms sharing a row of z can
      be joined by one turn and one fold, and the solver finds that in four
      moves flat. A trial that ends before its second beat is not a trial. */
   blocks:(function(){var b=[];box(0,2,0,0,0,2,b);box(5,7,0,0,4,6,b);
     b.push([3,0,9]);b.push([4,0,9]);return b;})(),
   start:[0,1,0],goal:[7,1,4],rotate:true},
{name:"05 — The Last Step",
   hint:"You arrive in the plane, but you finish in the volume.",
   blocks:[[0,0,0],[-4,0,1],[-2,0,1],[-2,1,2],[-7,2,1],[4,2,0],[5,2,0]],
   start:[0,1,0],goal:[4,3,0],rotate:true},
{name:"06 — Six Across",
   hint:"A long walk on a silhouette that barely exists.",
   blocks:[[0,0,0],[1,0,2],[2,1,6],[3,1,5],[4,1,4],[5,2,-4],[6,3,-4],[6,3,-2],[3,3,-2]],
   start:[0,1,0],goal:[3,4,-2],rotate:true},
{name:"07 — Fold After Climbing",
   hint:"Height first. The projection you want only opens up from above.",
   blocks:[[0,0,0],[0,0,-1],[0,1,-2],[-2,2,-1],[1,2,-1],[1,3,0],[0,4,-6],[0,4,-5]],
   start:[0,1,0],goal:[0,5,-5],rotate:true},
{name:"08 — Far Side",
   hint:"The second flatten is the long one. Commit to it.",
   blocks:[[0,0,0],[-1,1,0],[-1,2,-1],[-6,2,-2],[-8,2,-2],[-7,2,-5],[-8,3,1],[-9,4,2],[-10,4,-5],[-10,4,-4]],
   start:[0,1,0],goal:[-10,5,-4],rotate:true},
{name:"09 — Three Folds",
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
{name:"10 — Sharp",
   hint:"Red blocks kill you underfoot. In the volume you simply walk around them.",
   blocks:[[0,0,0],[-4,0,1],[-3,0,1],[-2,0,1],[-1,0,1,4],[-1,1,-1]],
   start:[0,1,0],goal:[-4,1,1],rotate:true},
{name:"11 — Cast a Shadow",
   hint:"It was nowhere near you. Then you folded.",
   blocks:[[0,0,0],[0,2,1],[1,1,0],[1,1,1,4]],
   start:[0,1,0],goal:[0,3,1],rotate:true},
{name:"12 — Poisoned Column",
   hint:"One spike ruins the whole line it lands in. Fold from elsewhere.",
   blocks:[[0,0,0],[-4,1,1],[-3,0,1],[-2,0,1],[-1,0,1,4]],
   start:[0,1,0],goal:[-2,1,1],rotate:true},
{name:"13 — Check Behind",
   hint:"Look along the axis before you commit to it.",
   blocks:[[0,0,0],[3,3,-2,4],[-2,0,0],[-2,0,1],[-4,1,2],[-2,1,2],[-5,0,1,4]],
   start:[0,1,0],goal:[-4,2,2],rotate:true},
{name:"TRIAL II — Sharp Rhythm",
   hint:"Spikes take the squares you would have dodged into. Walk to the edge before you fold — the near columns are poisoned.",
   trial:{period:2200,fire:320,
          beats:[{axis:"x",at:3},{axis:"x",at:1},{axis:"x",at:5}],
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
{name:"14 — Two Threats",
   hint:"Two spikes, four views, one that works.",
   blocks:[[0,0,0],[0,0,-3],[2,0,-3],[-1,3,6,4],[1,0,-5,4]],
   start:[0,1,0],goal:[2,1,-3],rotate:true},
{name:"15 — Narrow Safety",
   hint:"The safe column is a single square wide. Find it before you fold.",
   blocks:[[0,0,0],[3,0,0],[4,0,1],[5,0,1],[6,0,1,4]],
   start:[0,1,0],goal:[5,1,1],rotate:true},
{name:"16 — Thread It",
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
{name:"17 — Clear Ground",
   hint:"Glass holds you up in the volume. It puts nothing in the plane.",
   blocks:[[0,0,0],[0,1,-1,1],[-1,2,-5],[-1,2,-3],[0,2,-3,1],[0,2,-4,1],[1,2,-4,1],[1,2,-5,1]],
   start:[0,1,0],goal:[1,3,-5],rotate:true},
{name:"18 — Nothing Underfoot",
   hint:"A long walk on a silhouette with a piece missing.",
   blocks:[[0,0,0],[-1,0,2],[-2,1,6],[-3,1,5],[-4,1,4],[-5,2,-4],[-6,3,-4],[-6,3,-2],[-6,3,-3,1],[-6,4,-4,1]],
   start:[0,1,0],goal:[-6,5,-4],rotate:true},
{name:"19 — Twice Transparent",
   hint:"What you stood on to get here won't be there when you fold.",
   blocks:[[0,0,0],[-1,0,2],[-1,0,3],[-1,1,2,1],[0,2,8],[0,2,11,1],[0,3,12,1]],
   start:[0,1,0],goal:[0,4,12],rotate:true},
{name:"20 — Look Through It",
   hint:"Turn first. The glass hides a different hole from every side.",
   blocks:[[0,0,0],[-2,0,1],[-3,0,1],[-2,1,1,1],[-8,2,0],[-11,2,0,1]],
   start:[0,1,0],goal:[-11,3,0],rotate:true},
{name:"TRIAL III — The Depth Slice",
   hint:"A slice down the axis you are looking along cannot be dodged flat — there, you are at every depth. Fold between those beats, or turn until it is one you can step out of.",
   trial:{period:2100,fire:300,
          beats:[{axis:"x",at:1},{axis:"z",at:1},{axis:"x",at:6}],
          cores:[[7,1,4],[4,1,9],[5,1,6]]},
   /* The glass is the fold platform, and it is load-bearing twice over: it
      carries you in the volume, and because it casts nothing, folding from
      the stone behind it drops you into a column with no floor. You have to
      walk out onto the thing that is not there. */
   blocks:(function(){var b=[];box(0,2,0,0,0,2,b);
     b.push([3,0,0,1]);b.push([3,0,1,1]);b.push([3,0,2,1]);
     b.push([4,0,9]);box(5,7,0,0,4,6,b);return b;})(),
   start:[0,1,0],goal:[7,1,4],rotate:true},
{name:"21 — Invisible Architecture",
   hint:"Most of this structure never reaches the page.",
   blocks:[[0,0,0],[0,0,-1,1],[3,0,-2],[-5,0,-3],[-3,0,-3],[-4,1,-3,1],[-8,2,-2],[-10,2,-1],[-9,2,-1,1]],
   start:[0,1,0],goal:[-9,3,-1],rotate:true},
{name:"22 — Down and Around",
   hint:"Descend before you turn. The anchor is waiting either way.",
   blocks:[[0,0,0],[-3,1,-1],[-4,1,-1],[-3,1,0,1],[-2,1,0,1],[-1,1,-6],[0,1,-5],[0,1,-4]],
   start:[0,1,0],goal:[0,2,-4],rotate:true},
{name:"23 — Long Division",
   hint:"A long walk on each side of the turn.",
   blocks:[[0,0,0],[-1,0,0,1],[-2,0,3],[-2,0,6],[-2,0,7],[-1,1,7,1],[3,2,8],[5,2,9],[2,3,10],[2,3,11],[-1,3,11]],
   start:[0,1,0],goal:[-1,4,11],rotate:true},
{name:"24 — Two Dangers",
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
{name:"25 — Shove",
   hint:"Violet blocks move when you walk into them. The plane notices.",
   blocks:[[-1,0,3],[-2,0,-1],[-1,0,-1],[0,0,-1],[0,0,0],[-1,1,-1,3]],
   start:[0,1,0],goal:[-1,1,3],rotate:true},
{name:"26 — Make a Bridge",
   hint:"Put it where the fold will need it, then fold.",
   blocks:[[-2,0,5],[-1,1,-2],[-1,1,-1],[-1,1,0],[0,0,0],[-1,2,-1,3]],
   start:[0,1,0],goal:[-2,1,5],rotate:true},
{name:"27 — Shove and Turn",
   hint:"The crate is only useful from one of the four views.",
   blocks:[[-2,0,0],[-1,0,0],[0,0,0],[1,2,1],[-1,1,0,3],[1,2,-2,3]],
   start:[0,1,0],goal:[1,3,1],rotate:true},
{name:"28 — Shove It Clear",
   hint:"Move the block, or the column it lands in will kill you.",
   blocks:[[0,0,0],[-3,0,1,4],[-2,0,1],[-1,1,-3],[-1,1,-2],[-1,1,-1],[-1,1,0],[4,0,6,4],[-1,2,-2,3]],
   start:[0,1,0],goal:[-2,1,1],rotate:true},
{name:"29 — There and Back",
   hint:"Fold, land, move it, fold again.",
   blocks:[[4,2,1],[1,0,4],[2,0,4],[3,0,4],[0,0,0],[2,1,4,3]],
   start:[0,1,0],goal:[4,3,1],rotate:true},
{name:"TRIAL IV — Every Slice",
   hint:"Three axes now, and the high ground is one of them. The crossing happens up here — so does the slice that owns this height.",
   trial:{period:2000,fire:320,
          beats:[{axis:"y",at:2},{axis:"x",at:2},{axis:"x",at:6},
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
{name:"30 — Push Through Nothing",
   hint:"The crate makes the plane; the glass unmakes the volume.",
   blocks:[[0,0,0],[1,2,-3,1],[3,2,-3],[4,0,-5],[4,0,-4],[4,0,-3],[1,1,1],[2,1,1,1],[4,1,-4,3]],
   start:[0,1,0],goal:[4,1,-4],rotate:true},
{name:"31 — Reshape",
   hint:"One shove between two folds changes the whole silhouette.",
   blocks:[[5,1,-3],[-1,1,-4],[-1,1,-3],[-1,1,-2],[-1,1,-1],[0,0,0],[-1,2,-3,3]],
   start:[0,1,0],goal:[5,2,-3],rotate:true},
{name:"32 — Confluence",
   hint:"All three now. Read the depth before you commit.",
   blocks:[[0,0,0],[4,1,2,1],[4,1,3],[4,1,5,1],[2,0,0],[2,0,1],[2,0,2,4],[2,1,1,3]],
   start:[0,1,0],goal:[4,2,3],rotate:true},
{name:"33 — Turn, Shove, Fold",
   hint:"Face the right way first. The safe column is not the obvious one.",
   blocks:[[0,0,0],[-3,0,-3,4],[-3,0,-2],[-3,0,-1],[-3,0,0,1],[5,1,-4],[-3,2,-4,1],[-3,1,-2,3]],
   start:[0,1,0],goal:[5,2,-4],rotate:true},
{name:"34 — Twice Pushed",
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
{name:"35 — Up and Over",
   hint:"Three folds and two shoves. The crate has to travel.",
   blocks:[[3,0,1],[0,0,3],[1,0,3],[2,0,3],[3,0,3],[1,2,-5],[3,2,-5],[0,0,0],[2,1,3,3]],
   start:[0,1,0],goal:[1,3,-5],rotate:true},
{name:"36 — Down and Through",
   hint:"Descend, shove, and fold twice from opposite sides.",
   blocks:[[0,0,0],[-3,3,1],[-3,3,2,1],[-3,3,4],[1,1,0],[1,1,1],[1,1,2,1],[0,3,3,4],[1,2,1,3]],
   start:[0,1,0],goal:[-3,4,4],rotate:true},
{name:"37 — Reach Across",
   hint:"The crate goes one way and you go the other.",
   blocks:[[0,0,0],[1,2,6],[2,2,6],[3,1,1],[3,1,2],[3,1,3],[0,2,1,1],[0,2,2,4],[3,2,2,3]],
   start:[0,1,0],goal:[1,3,6],rotate:true},
{name:"38 — Three Folds, Three Threats",
   hint:"Three collapses, and something waiting in each.",
   blocks:[[0,0,0],[1,2,1],[0,3,-3],[1,3,-3,1],[4,3,-2],[4,3,-1],[4,3,0,4],[4,3,1],[0,1,1,1],[4,4,-1,3]],
   start:[0,1,0],goal:[4,4,1],rotate:true},
{name:"39 — The Whole Language",
   hint:"Everything the game knows how to say, in one level.",
   blocks:[[0,0,0],[-5,2,-2],[-4,2,-2,1],[-3,2,-2],[2,3,2],[5,1,-1,4],[-2,3,0],[-1,3,0],[-5,1,1],[-5,1,2],[-5,1,3],[-5,2,2,3]],
   start:[0,1,0],goal:[-1,4,0],rotate:true},
{name:"40 — The Middle One",
   hint:"Three places to land in that column. Turning reaches the ends, never the middle.",
   blocks:[[0,0,0],[0,0,6,2],[0,0,9],[3,0,5]],
   start:[0,1,0],goal:[3,1,5],rotate:true},
{name:"41 — Claimed",
   hint:"Amber catches you on the way past.",
   blocks:[[0,0,0],[0,0,3],[0,0,6,2],[0,0,8],[0,0,11],[4,0,9],[9,0,9,2],[12,0,9],[9,0,7]],
   start:[0,1,0],goal:[9,1,7],rotate:true},
{name:"42 — Walk First",
   hint:"Where you fold from decides which column you are choosing between.",
   blocks:[[0,0,0],[1,0,0],[1,0,5,2],[1,0,8],[1,0,13],[6,0,6],[5,0,6],[4,0,6]],
   start:[0,1,0],goal:[6,1,6],rotate:true},
{name:"43 — Two Middles",
   hint:"Two columns, and in each one the answer is inside.",
   blocks:[[0,0,0],[0,0,6,2],[0,0,11],[0,0,17],[2,0,7,2],[7,0,7],[2,0,8]],
   start:[0,1,0],goal:[2,1,8],rotate:true},
{name:"44 — Past the Landing",
   hint:"You arrive, and there is still somewhere to go.",
   blocks:[[0,0,0],[0,0,4,2],[0,0,10],[2,0,5,2],[5,0,5],[2,0,4]],
   start:[0,1,0],goal:[2,1,4],rotate:true},
{name:"45 — Deeper In",
   hint:"A longer walk in the plane before the second claim.",
   blocks:[[0,0,0],[1,0,0],[1,0,4],[1,0,9,2],[1,0,12],[1,0,17],[4,0,8,2],[9,0,8],[4,0,7]],
   start:[0,1,0],goal:[4,1,7],rotate:true},
{name:"46 — Both Inside",
   hint:"Both columns, both middles, one route.",
   blocks:[[0,0,0],[1,0,0],[2,0,0],[2,0,2,2],[2,0,6],[2,0,12],[7,0,3,2],[11,0,3],[7,0,4]],
   start:[0,1,0],goal:[7,1,4],rotate:true},
{name:"47 — Held Fast",
   hint:"Shove it onto the amber. It will never move again, which is the point.",
   blocks:[[0,0,0],[1,0,-4],[2,0,-4],[3,0,-4,2],[4,0,-4],[2,2,-2],[2,1,-4,3]],
   start:[0,1,0],goal:[2,3,-2],rotate:true},
{name:"48 — One Chance",
   hint:"You only get to place it once.",
   blocks:[[0,0,0],[2,3,6,2],[2,3,7],[1,1,-6],[2,1,-6],[3,1,-6,2],[2,2,-6,3]],
   start:[0,1,0],goal:[2,4,7],rotate:true},
{name:"49 — Set in Amber",
   hint:"Glass under you, a crate pinned in front of you.",
   blocks:[[0,0,0],[1,3,4],[1,2,2],[-5,1,1],[-5,1,2],[-5,1,3,2],[-5,1,4],[-5,2,2,3]],
   start:[0,1,0],goal:[1,4,4],rotate:true},
{name:"50 — Pin It Down",
   hint:"Fold, land, pin, and fold again from the same spot.",
   blocks:[[0,0,0],[-4,0,3],[-4,0,4],[-1,0,1,2],[-1,0,2],[-1,0,3],[-1,0,4,2],[-1,1,3,3]],
   start:[0,1,0],goal:[-4,1,4],rotate:true},
{name:"51 — Two Shoves, One Home",
   hint:"Twice pushed, and only the second landing counts.",
   blocks:[[0,0,0],[-2,1,-4],[-2,1,-3,2],[-2,1,-2],[-2,1,-1,2],[-5,0,-2],[0,3,-2],[0,3,-1],[-2,2,-2,3]],
   start:[0,1,0],goal:[0,4,-1],rotate:true},
{name:"52 — Down to the Amber",
   hint:"Push it down before you go around.",
   blocks:[[0,0,0],[2,3,1],[2,3,2],[2,3,3,2],[-2,1,2],[-2,1,3],[-2,1,4,2],[-2,1,5],[-1,1,2],[-2,2,3,3]],
   start:[0,1,0],goal:[2,4,1],rotate:true},
{name:"53 — Three Ways Round",
   hint:"Three folds, and the crate must be fixed before the last.",
   blocks:[[0,0,0],[-3,2,-5,2],[-2,2,-5],[-1,2,-5],[4,0,-6],[4,0,-5],[4,0,-4,2],[-1,0,-6],[4,1,-5,3]],
   start:[0,1,0],goal:[-1,3,-5],rotate:true},
{name:"54 — Turn Twice More",
   hint:"Every view matters, and the crate is only right in one of them.",
   blocks:[[0,0,0],[-5,2,2],[0,2,-2],[2,2,-2],[-1,0,1],[-1,0,2],[-1,0,3,2],[-1,0,4,2],[-1,1,2,3]],
   start:[0,1,0],goal:[2,3,-2],rotate:true},
{name:"55 — The Last Placement",
   hint:"Everything the amber can do, all at once.",
   blocks:[[0,0,0],[-5,0,-2],[-4,0,-2],[-3,0,-2,2],[0,0,4],[1,0,4],[2,0,4],[3,0,4,2],[4,2,-3],[1,1,4,3]],
   start:[0,1,0],goal:[-5,1,-2],rotate:true},
{name:"56 — Long Glass",
   hint:"Glass to stand on, amber to land on, and one turn between.",
   blocks:[[0,0,0],[-1,0,-4],[-2,0,-4],[-3,0,4],[-3,0,-2],[-3,0,-1,1],[-4,1,-1,1],[-8,2,-2],[-9,2,-2]],
   start:[0,1,0],goal:[-9,3,-2],rotate:true},
{name:"57 — Absent Floor",
   hint:"What carried you across the plane was never in the volume.",
   blocks:[[0,0,0],[-1,0,0],[-2,1,5],[-2,1,-3],[-2,1,-4,1],[-1,2,-4,1],[-3,2,-5],[2,2,-6],[-7,2,-6],[-3,3,-5]],
   start:[0,1,0],goal:[-7,3,-6],rotate:true},
{name:"58 — Twice Up",
   hint:"Climb, fold, climb again, and fold back the other way.",
   blocks:[[0,0,0],[1,0,0,1],[2,0,3],[2,0,6],[2,0,7],[3,1,7,1],[4,2,11],[5,2,13],[6,3,10],[7,3,10],[7,3,7]],
   start:[0,1,0],goal:[7,4,7],rotate:true},
{name:"59 — The Far Shore",
   hint:"The longest crossing in the game, and a hole in the middle of it.",
   blocks:[[0,0,0],[-1,0,0],[-2,1,5],[-2,1,-3],[-1,1,-3,1],[-1,2,-2,1],[-3,2,-1],[2,2,0],[-7,2,0],[-3,3,-1]],
   start:[0,1,0],goal:[-7,3,0],rotate:true},
{name:"60 — Three Folds Deep",
   hint:"Three collapses, and something transparent in each one.",
   blocks:[[0,0,0],[1,0,2],[1,0,-5],[5,1,-4],[2,1,-4,1],[3,2,-4,1],[-2,3,-5],[8,3,-6],[-2,3,-7],[5,4,-8],[0,4,-9],[-2,4,-9,1]],
   start:[0,1,0],goal:[-2,5,-9],rotate:true},
{name:"61 — Everything at Once",
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
  {at:14, name:"II · SPIKES", sub:"a hazard you cannot see until you fold", col:"#e0455f"},
  {at:23, name:"III · GLASS", sub:"solid in the volume, absent from the plane", col:"#7fb2ff"},
  {at:33, name:"IV · CRATES", sub:"change the plane by moving the volume", col:"#c9744f"},
  {at:45, name:"V · EXTRA", sub:"unlocked by the Orthogon — the long ones", col:"#3fc4d4", locked:true}
];

/* Levels have been renumbered more than once. Progress is keyed by name,
   so without this every solved level would read unsolved. Entries compose
   across reshuffles - the oldest name still resolves to the current one -
   so never rewrite this table, only extend it. Applied by migrateNames()
   in 06-persistence.js. */
var LEVEL_RENAMES={
 /* BOSS I has been four fights now. migrateNames() looks each old name up
    exactly once and does not chase chains, so when the current name changes
    every row that pointed at the old one has to be re-pointed at the new one
    as well as a row being added for the old one itself. Composing the table,
    not rewriting it: no row is ever deleted, because a save may still be
    carrying any of these keys. */
 "BOSS I — The Sentinel": "BOSS I — The Hunt",
 "BOSS I — The Pack": "BOSS I — The Hunt",
 "BOSS I — The Twin": "BOSS I — The Hunt",
 "02 — Turn to see": "01 — Turn to see",
 "03 — Two Windows": "02 — Two Windows",
 "04 — The Long Way Round": "03 — The Long Way Round",
 "05 — About Face": "04 — About Face",
 "06 — The Last Step": "05 — The Last Step",
 "07 — Six Across": "06 — Six Across",
 "08 — Fold After Climbing": "07 — Fold After Climbing",
 "09 — Far Side": "08 — Far Side",
 "10 — Three Folds": "09 — Three Folds",
 "18 — Sharp": "10 — Sharp",
 "19 — Cast a Shadow": "11 — Cast a Shadow",
 "20 — Poisoned Column": "12 — Poisoned Column",
 "22 — Check Behind": "13 — Check Behind",
 "23 — Two Threats": "14 — Two Threats",
 "24 — Narrow Safety": "15 — Narrow Safety",
 "41 — Thread It": "16 — Thread It",
 "11 — Clear Ground": "17 — Clear Ground",
 "12 — Nothing Underfoot": "18 — Nothing Underfoot",
 "13 — Twice Transparent": "19 — Twice Transparent",
 "14 — Look Through It": "20 — Look Through It",
 "15 — Invisible Architecture": "21 — Invisible Architecture",
 "16 — Down and Around": "22 — Down and Around",
 "17 — Long Division": "23 — Long Division",
 "21 — Two Dangers": "24 — Two Dangers",
 "39 — Confluence": "32 — Confluence",
 "40 — Turn, Shove, Fold": "33 — Turn, Shove, Fold",
 "42 — Twice Pushed": "34 — Twice Pushed",
 "45 — Up and Over": "35 — Up and Over",
 "43 — Down and Through": "36 — Down and Through",
 "44 — Reach Across": "37 — Reach Across",
 "57 — Three Folds, Three Threats": "38 — Three Folds, Three Threats",
 "60 — The Whole Language": "39 — The Whole Language",
 "32 — The Middle One": "40 — The Middle One",
 "33 — Claimed": "41 — Claimed",
 "34 — Walk First": "42 — Walk First",
 "35 — Two Middles": "43 — Two Middles",
 "36 — Past the Landing": "44 — Past the Landing",
 "37 — Deeper In": "45 — Deeper In",
 "38 — Both Inside": "46 — Both Inside",
 "46 — Held Fast": "47 — Held Fast",
 "47 — One Chance": "48 — One Chance",
 "48 — Set in Amber": "49 — Set in Amber",
 "49 — Pin It Down": "50 — Pin It Down",
 "50 — Two Shoves, One Home": "51 — Two Shoves, One Home",
 "51 — Down to the Amber": "52 — Down to the Amber",
 "52 — Three Ways Round": "53 — Three Ways Round",
 "58 — Turn Twice More": "54 — Turn Twice More",
 "59 — The Last Placement": "55 — The Last Placement",
 "55 — Long Glass": "56 — Long Glass",
 "53 — Absent Floor": "57 — Absent Floor",
 "54 — Twice Up": "58 — Twice Up",
 "56 — The Far Shore": "59 — The Far Shore",
 "61 — Three Folds Deep": "60 — Three Folds Deep",
 "62 — Everything at Once": "61 — Everything at Once",
 "11 — Sharp": "10 — Sharp",
 "12 — Cast a Shadow": "11 — Cast a Shadow",
 "13 — Poisoned Column": "12 — Poisoned Column",
 "14 — Check Behind": "13 — Check Behind",
 "15 — Two Threats": "14 — Two Threats",
 "16 — Narrow Safety": "15 — Narrow Safety",
 "17 — Thread It": "16 — Thread It",
 "18 — Clear Ground": "17 — Clear Ground",
 "19 — Nothing Underfoot": "18 — Nothing Underfoot",
 "20 — Twice Transparent": "19 — Twice Transparent",
 "21 — Look Through It": "20 — Look Through It",
 "22 — Invisible Architecture": "21 — Invisible Architecture",
 "23 — Down and Around": "22 — Down and Around",
 "24 — Long Division": "23 — Long Division",
 "25 — Two Dangers": "24 — Two Dangers",
 "26 — Shove": "25 — Shove",
 "27 — Make a Bridge": "26 — Make a Bridge",
 "28 — Shove and Turn": "27 — Shove and Turn",
 "29 — Shove It Clear": "28 — Shove It Clear",
 "30 — There and Back": "29 — There and Back",
 "31 — Push Through Nothing": "30 — Push Through Nothing",
 "32 — Reshape": "31 — Reshape",
 "33 — Confluence": "32 — Confluence",
 "34 — Turn, Shove, Fold": "33 — Turn, Shove, Fold",
 "35 — Twice Pushed": "34 — Twice Pushed",
 "36 — Up and Over": "35 — Up and Over",
 "37 — Down and Through": "36 — Down and Through",
 "38 — Reach Across": "37 — Reach Across",
 "39 — Three Folds, Three Threats": "38 — Three Folds, Three Threats",
 "40 — The Whole Language": "39 — The Whole Language",
 "41 — The Middle One": "40 — The Middle One",
 "42 — Claimed": "41 — Claimed",
 "43 — Walk First": "42 — Walk First",
 "44 — Two Middles": "43 — Two Middles",
 "45 — Past the Landing": "44 — Past the Landing",
 "46 — Deeper In": "45 — Deeper In",
 "47 — Both Inside": "46 — Both Inside",
 "48 — Held Fast": "47 — Held Fast",
 "49 — One Chance": "48 — One Chance",
 "50 — Set in Amber": "49 — Set in Amber",
 "51 — Pin It Down": "50 — Pin It Down",
 "52 — Two Shoves, One Home": "51 — Two Shoves, One Home",
 "53 — Down to the Amber": "52 — Down to the Amber",
 "54 — Three Ways Round": "53 — Three Ways Round",
 "55 — Turn Twice More": "54 — Turn Twice More",
 "56 — The Last Placement": "55 — The Last Placement",
 "57 — Long Glass": "56 — Long Glass",
 "58 — Absent Floor": "57 — Absent Floor",
 "59 — Twice Up": "58 — Twice Up",
 "60 — The Far Shore": "59 — The Far Shore",
 "04 — Two Windows": "02 — Two Windows",
 "05 — The Long Way Round": "03 — The Long Way Round",
 "06 — About Face": "04 — About Face",
 "09 — The Last Step": "05 — The Last Step",
 "10 — Far Side": "08 — Far Side",
 "11 — Three Folds": "09 — Three Folds",
 "12 — Clear Ground": "17 — Clear Ground",
 "13 — Nothing Underfoot": "18 — Nothing Underfoot",
 "14 — Twice Transparent": "19 — Twice Transparent",
 "15 — Look Through It": "20 — Look Through It",
 "16 — Invisible Architecture": "21 — Invisible Architecture",
 "58 — Down and Around": "22 — Down and Around",
 "59 — Long Division": "23 — Long Division",
 "17 — Sharp": "10 — Sharp",
 "18 — Cast a Shadow": "11 — Cast a Shadow",
 "19 — Poisoned Column": "12 — Poisoned Column",
 "38 — Two Dangers": "24 — Two Dangers",
 "20 — Check Behind": "13 — Check Behind",
 "21 — Two Threats": "14 — Two Threats",
 "22 — Narrow Safety": "15 — Narrow Safety",
 "24 — Shove": "25 — Shove",
 "25 — Make a Bridge": "26 — Make a Bridge",
 "26 — Shove and Turn": "27 — Shove and Turn",
 "40 — Shove It Clear": "28 — Shove It Clear",
 "27 — There and Back": "29 — There and Back",
 "39 — Push Through Nothing": "30 — Push Through Nothing",
 "28 — Reshape": "31 — Reshape",
 "31 — The Middle One": "40 — The Middle One",
 "32 — Claimed": "41 — Claimed",
 "33 — Walk First": "42 — Walk First",
 "34 — Two Middles": "43 — Two Middles",
 "35 — Past the Landing": "44 — Past the Landing",
 "36 — Deeper In": "45 — Deeper In",
 "37 — Both Inside": "46 — Both Inside",
 "41 — Confluence": "32 — Confluence",
 "42 — Turn, Shove, Fold": "33 — Turn, Shove, Fold",
 "23 — Thread It": "16 — Thread It",
 "29 — Twice Pushed": "34 — Twice Pushed",
 "30 — Up and Over": "35 — Up and Over",
 "60 — Twice Up": "58 — Twice Up",
 "61 — The Far Shore": "59 — The Far Shore",
 "45 — Three Folds, Three Threats": "38 — Three Folds, Three Threats",
 "46 — The Whole Language": "39 — The Whole Language",
 "62 — Three Folds Deep": "60 — Three Folds Deep",
 "63 — Everything at Once": "61 — Everything at Once"
};
