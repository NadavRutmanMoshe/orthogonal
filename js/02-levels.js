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
      dims and the named control is the only one that answers. See the guided
      lock in 15-tutorial.js - a step can opt out with lock:false, and none of
      these wants to.

      The prose names that control in tokens rather than in glyphs, because
      there are two sets of controls it could mean: the tutorial teaches the
      buttons or the gestures depending on settings.tutor, and {do:right} is
      "Press <b>&#9654;</b>" or "<b>Swipe right</b>" accordingly. See TUT_SAY.
      A lesson that says "press the right arrow" over a swiping finger is the
      same bug {to2} exists to prevent, with a different subject. */
   tut:[
     {say:"You are the pink cube. The green square is where you are going.<br>{do:right} twice.",
      cue:"bRight",done:function(c){return c.d.right>=2;}},
     {say:"The other two move you away from the camera and back toward it: {it:up} and {it:down}.<br>{do:up} twice.",
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
     {say:"Too far to walk, and there is no jump.<br>{do:2d}: everything flattens along your line of sight, and depth stops existing.",
      cue:"bFlat",done:function(c){return c.flat>=1;}},
     {say:"Depth is gone, so the block that was floating out in front is simply next to you. Walk across.",
      cue:"bRight",done:function(c){return c.m2>=3;}},
     /* PEEK IS NOT TAUGHT HERE ANY MORE - it moved to `00 — First Landing`.
        This level is where the fold itself is learned, and the eye arriving
        one press before GO 3D put three new controls in one lesson: it read
        as part of standing up rather than as a thing of its own, and a
        player who pressed it was then facing a second unfamiliar button.
        It belongs in the level whose whole question is the one it answers. */
     {say:"{do:3d} to stand up.<br>Two blocks share this column, and you come back on the one at <b>the front</b> — nearest you, the green one.",
      cue:"bFlat",done:function(c){return c.unflat>=1;}}
   ]},
{name:"00 — First Turn",
   hint:"Two blocks, nowhere near each other. Or so it looks.",
   blocks:[[0,0,0],[5,0,0]],
   start:[0,1,0],goal:[5,1,0],rotate:true,tutorial:true,
   tut:[
     {say:"Nothing lines up from this side. {do:turnr} to turn a quarter turn.",
      cue:"bRotR",done:function(c,st){return st.view===1;}},
     {say:"From here the two blocks are in the <b>same column</b>.<br>{do:2d}.",
      cue:"bFlat",done:function(c){return c.flat>=1;}},
     {say:"{do:3d}. The block that was out of reach is the one that catches you — turning decided what shared a column at all.",
      cue:"bFlat",done:function(c){return c.unflat>=1;}}
   ]},
{name:"00 — First Landing",
   hint:"Two blocks in one column. Which of them catches you is decided by where the camera is.",
   /* RULE 5, FORCED, AND EXPLAINED BEFORE IT IS ASKED FOR.

      "You come back on the block nearest the camera" was stated once in
      First Fold and never made to matter - there the near block was also the
      goal, so a player who understood none of it still won. It is the single
      thing that cost the first real playtester the most.

      Two blocks in one silhouette column, five apart in depth, with no way to
      walk between them. From the opening view the player is standing on the
      NEAR one, so folding here pops them straight back onto themselves. Turn
      180 degrees and the same two blocks swap places: the far one is at the
      front now, and the identical fold carries them across. Same geometry,
      same verb, opposite answer.

      THE WASTED FOLD IS NOW TAUGHT, and that reverses an earlier finding.
      It used to be impossible: tutGuide() replaces any step whose cue
      disagrees with the solver's next move, and the solver never folds from
      the opening view, so a step asking for it was overridden on every frame.
      `free:true` is the escape hatch and it now carries this step. The cost
      is that the level is no longer walked in the solver's own move count -
      which costs nothing at all here, because a tutorial has no par and no
      stars. It would not be safe on a scored level.

      The two `card` steps are the other half. Everything else in the tutorial
      cues a control and lets the player discover what it did; this rule
      cannot be discovered, because both candidates are at the same screen
      position the moment you fold. So it is said in words, once, before the
      move that demonstrates it - and then said again from the other side,
      where the same sentence has the opposite answer.

      THE EYE IS NO LONGER FORCED. It used to be step 3, and it asked the
      player to preview a landing they had not yet been told existed. Peek is
      still live and still lights in the plane; it is simply not a hoop.

      THE COLONNADE IS A RULER AND NOTHING ELSE. Screen-vertical in this
      projection is height and depth added together, so the far block draws
      about three cells ABOVE the near one and a first-time player reads it as
      higher rather than as further back - the exact lie tools/legible.js
      hunts for, in the level whose whole subject is depth. Two rows of stone
      running the length of the gap give the eye something to count, and the
      depth fade grades them so "further" has a visible direction.

      It is at y=2, x=+/-2, and every part of that is load-bearing:
        - x=+/-2 keeps it two squares clear, so stepping toward it is a fall
          into nothing exactly as it was before, and its silhouette column is
          never the player's in views 0 and 2;
        - y=2 keeps it out of R.landings(), which wants a block at y=0 under a
          clear y=1, so it can never become a landing candidate in views 1 and
          3 where its silhouette column IS the player's; and it casts at y=2,
          one above the player's own row, so it can never crush a fold either.
      At y=0 or y=1 each of those fails in turn: at y=0 it hands a wandering
      player a landing on an unreachable rail, at y=1 it crushes any fold
      taken from view 1. Verified inert - solve() still says the level is
      exactly `rot+ rot+ FLAT POP` and still says it is impossible without
      the fold. */
   blocks:[[0,0,0],[0,0,-5]].concat(
     box(-2,-2,2,2,-5,0,[]), box(2,2,2,2,-5,0,[])),
   start:[0,1,0],goal:[0,1,-5],rotate:true,tutorial:true,
   tut:[
     {card:{h:"Which block catches you",
            p:"<b>{to2}</b> flattens the world. <b>{to3}</b> has to <b>choose</b> where to put you back — and it always picks the block at <b>the front</b>: the one nearest you along the way you are looking.<br><br>So folding from here and folding from the far side are <b>not the same move</b>. You are about to do both."},
      /* The rings are up BEHIND the card, not after it. The card names
         "the block at the front" and the marker is what that phrase points
         at; a sentence about a ring, read on a screen with no ring on it,
         is a sentence the player has to hold in their head until it turns
         out to be true. `show` is carried separately from `card` in
         tutGuide() precisely so a step can do both. */
      free:true,show:"landing",say:"",
      done:function(c){return (c.card||0)>=1;}},
     /* free:true, because the solver would rather turn first and this fold is
        the whole demonstration. hold:true, because "force him to press GO 2D"
        is what the level is for - see tutBlocks(). */
     {say:"The ring marks the block at <b>the front</b> — and it is the one already under you. Fold from here and it is the one that catches you.<br>{do:2d}.",
      show:"landing",cue:"bFlat",free:true,hold:true,
      done:function(c){return c.flat>=1;}},
     {say:"{do:3d}.",
      show:"landing",cue:"bFlat",hold:true,
      done:function(c){return c.unflat>=1;}},
     {say:"Nothing moved: the front block was the one you were standing on.<br>Now the other side. {do:turnr} twice.",
      cue:"bRotR",hold:true,
      done:function(c,st){return st.view===2;}},
     {card:{h:"Same blocks, other side",
            p:"You have not moved and the world has not changed. But you are looking from the opposite direction now, so <b>the far block is at the front</b> — and the ring has moved onto it.<br><br>The fold that went nowhere a moment ago is about to carry you the whole way across."},
      free:true,show:"landing",say:"",
      done:function(c){return (c.card||0)>=2;}},
     {say:"The ring is on the far block now.<br>{do:2d}.",
      show:"landing",cue:"bFlat",hold:true,
      done:function(c){return c.flat>=2;}},
     {say:"{do:3d} — and across. Same two blocks, same verb, opposite answer: turning is what decides which one is at the front.<br>The <b>eye</b> button previews it whenever you are flat.",
      show:"landing",cue:"bFlat",hold:true,
      done:function(c){return c.unflat>=2;}}
   ]},
/* The three levels below (01, 02 and 04) exist because the curve had a
   hole exactly where a new player stands. The tutorial ends at a difficulty
   score of 14 (First Landing, the last of them) and the first thing waiting
   was 21, then 31 — a player was in
   `brutal` by their fourth level, in the one section that is supposed to be
   teaching. Every other section opens with two or three gentle levels; this
   one opened with a cliff. Scores now run 14, 16, 21, 28, 31.

   Each teaches one clause of the rules rather than combining several, and
   none of them uses a special block: fundamentals is stone only.

   The measured scores now run 14, 21, 16, 28, 31: 02 and 03 were swapped
   after playtesting, against what curve.js says, because the rule level
   played harder than the rotation level. The reasoning is on both entries. */
{name:"01 — Scattered Steps",
   /* Six blocks at six unrelated depths. Flat, they are a staircase — which
      is the tutorial's lesson again, but with the answer no longer written
      on screen and with height in it, so the plane has to be *read* rather
      than walked. One fold, no turn: nothing here is a decision yet. */
   hint:"Six blocks, six depths, nothing to walk on. Depth is the only thing in the way.",
   blocks:[[0,0,0],[1,1,-8],[2,1,-3],[3,2,-9],[4,2,-6],[5,3,-4]],
   start:[0,1,0],goal:[5,4,-4],rotate:true},
{name:"02 — Turn to see",
   /* Kept over "03 — The Other Axis", which was cut for teaching the same
      lesson: both were "the bridge only exists along the other axis". This one
      is the older of the two and the better picture - a wall standing off to
      one side turns out to be the bridge, which is one object read two ways
      rather than three loose blocks that happen to line up.

      IT SITS BEFORE `The Near One` DESPITE SCORING HIGHER (21 against 16),
      and that is the one place in the campaign where the order deliberately
      contradicts tools/curve.js. Playtested, this one is the easier of the
      two: it asks for a rotation, which the tutorial has just taught, and
      once you are looking down the right axis the answer is on screen. The
      Near One asks you to *distrust* where the fold puts you, which is a
      rule rather than a view, and the tier model cannot see that - it counts
      moves, folds and turns, and a rotation is worth more to it than a
      subtlety is. See the note on the next level. */
   hint:"Nothing to walk on from here. There is, from the side.",
   blocks:(function(){var b=[];b.push([0,0,0]);b.push([3,0,5]);box(7,7,0,0,1,4,b);return b;})(),
   start:[0,1,0],goal:[3,1,5],rotate:true},
{name:"03 — The Near One",
   /* Rule 5, on its own. The goal's column holds two blocks and you come
      back on the one nearest the camera, which is not the goal — so you have
      to stand up one square early and finish on foot.

      The decoy block is the whole level and it is worth saying why it is not
      wasted geometry: taken out, the solver walks to the goal's own column
      and pops there, same move count, lesson gone. Its cost is a wrong
      landing you can walk back from, not a death.

      It scores 16 and follows a 21, which curve.js reads as a dip. It is
      not one: the level moved here because it played harder than the one in
      front of it, and felt difficulty is the thing the score is a proxy for
      rather than the other way round. A landing that is *wrong* while
      looking right is the first time the game asks the player to doubt what
      they can see, and there is no column in statsFor() for that. */
   hint:"Two blocks share that column. You come back on the one at the front.",
   blocks:[[0,0,0],[1,0,-3],[2,0,-12],[3,0,-3],[4,0,-12],[5,0,-8],[6,0,-8],[6,0,-2]],
   start:[0,1,0],goal:[6,1,-8],rotate:true},
{name:"04 — Halfway Across",
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
{name:"05 — Two Windows",
   hint:"Cross in the plane, land, turn, and do it again from the other side.",
   blocks:[[0,0,0],[1,0,0],[2,1,-4],[3,2,-5],[4,3,-6],[4,3,-5],[1,3,-5]],
   start:[0,1,0],goal:[1,4,-5],rotate:true},
{name:"06 — The Long Way Round",
   /* The goal block sits three clear cells from the ledge you reach it from,
      not one. At one cell the two blocks read as a stride you could take -
      you cannot, a gap is a gap and you fall - so the level's last move
      looked like a walk that inexplicably failed rather than like a fold you
      had to find. Verified against the solver: the route, the move count and
      the score are all identical at every spacing, so this is legibility
      bought for nothing. */
   hint:"The first landing isn't the destination. It's the vantage point.",
   blocks:[[0,0,0],[0,1,1],[-3,2,0],[-3,2,-1],[-2,2,-1],[-2,3,-2],[-1,4,-2],[3,4,-2]],
   start:[0,1,0],goal:[3,5,-2],rotate:true},
{name:"07 — About Face",
   hint:"One of the four views is the one you need. It is not a near one.",
   blocks:[[0,0,0],[0,1,1],[-1,2,-3],[-1,2,-6],[-3,2,-6]],
   start:[0,1,0],goal:[-3,3,-6],rotate:true},
{name:"08 — The Last Step",
   hint:"You arrive in the plane, but you finish in the volume.",
   blocks:[[0,0,0],[-4,0,1],[-2,0,1],[-2,1,2],[-7,2,1],[4,2,0],[5,2,0]],
   start:[0,1,0],goal:[4,3,0],rotate:true},
{name:"09 — Six Across",
   /* The second block used to sit at z=2, one across and two back from the
      start - and two back is very nearly one *down* on screen (see
      tools/legible.js for the arithmetic). So it drew where a block you could
      step down onto would draw, and the first press of the game was a fall
      out of the world. At z=6 it joins the far group and reads as far.
      Checked at z=2,4,5,6,7,8: same route, same move count, same score, so
      the level is untouched and only the lie is gone. */
   hint:"A long walk on a silhouette that barely exists.",
   blocks:[[0,0,0],[1,0,6],[2,1,6],[3,1,5],[4,1,4],[5,2,-4],[6,3,-4],[6,3,-2],[3,3,-2]],
   start:[0,1,0],goal:[3,4,-2],rotate:true},
{name:"10 — Fold After Climbing",
   hint:"Height first. The projection you want only opens up from above.",
   blocks:[[0,0,0],[0,0,-1],[0,1,-2],[-2,2,-1],[1,2,-1],[1,3,0],[0,4,-6],[0,4,-5]],
   start:[0,1,0],goal:[0,5,-5],rotate:true},
{name:"11 — Far Side",
   hint:"The second flatten is the long one. Commit to it.",
   blocks:[[0,0,0],[-1,1,0],[-1,2,-1],[-6,2,-2],[-8,2,-2],[-7,2,-5],[-8,3,1],[-9,4,2],[-10,4,-5],[-10,4,-4]],
   start:[0,1,0],goal:[-10,5,-4],rotate:true},
{name:"12 — Three Folds",
   hint:"Three collapses. Each one throws away a different dimension.",
   blocks:[[0,0,0],[-1,1,3],[-1,1,4],[-2,2,4],[-2,3,3],[-2,4,2],[2,4,3],[0,4,3],[0,4,0]],
   start:[0,1,0],goal:[0,5,0],rotate:true},
{name:"BOSS I — The Sighting",
   won:"Something in the plane has seen you. It will not be the only one.",
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

      ALL of the geometry arrives in phase two, and that is load-bearing: it
      makes each phase legible. Phase two is the one where the *arena*
      changes and phase three is the one where the *opposition* does, so a
      player who dies knows which kind of thing beat them. A pillar rising in
      phase three read as more of phase two and buried the change it was
      supposed to announce.

      There were four phases once. The third was a single 'cunning' hunter -
      one that refuses lines you could answer - sitting between the arena
      rising and the pair arriving. It went because three beats is the arc
      this fight actually has: nothing, then the ground, then more of them.
      A fourth made the middle sag, and "one smarter" against "two ordinary"
      was a comparison the design was interested in rather than the player.
      The machinery is untouched in bossPhases() and bossNext(), so putting
      it back is one line of level data. */
   boss:{floorStep:300,creepEvery:7500,
     phases:[
       {at:[[8,1,5]],step:780,aim:900,
        say:"one of them, and nothing in the way"},
       {at:[[8,1,5]],step:700,aim:820,say:"the ground comes up",
        add:[[2,1,1],[6,1,5],[6,1,1],[2,1,5],[4,1,3]]},
       {at:[[8,1,5],[7,1,3]],step:620,aim:700,say:"same ground — two of them"}]},
   blocks:box(0,8,0,0,0,6,[]),
   start:[1,1,1]},
{name:"13 — Sharp",
   hint:"Fire kills you underfoot. In the volume you simply walk around it.",
   /* [0,0,1] IS THERE SO THE PLAYER CAN BURN. The fire sat in a row the
      player could not reach on foot, so the only way to meet it was to fold
      into its column - which is the section's second lesson, not its first.
      One block puts the start pad next to the fire row: step forward, step
      left, and the piece introduces itself the way a hazard should.

      It changes nothing else. The solution is the same six moves it always
      was (FLAT ← ← ← ← POP), so the fold shortcut is intact and the block
      is a door rather than a path. */
   blocks:[[0,0,0],[0,0,1],[-4,0,1],[-3,0,1],[-2,0,1],[-1,0,1,4],[-1,1,-1]],
   start:[0,1,0],goal:[-4,1,1],rotate:true},
{name:"14 — Cast a Shadow",
   hint:"It was nowhere near you. Then you folded.",
   blocks:[[0,0,0],[0,2,1],[1,1,0],[1,1,1,4]],
   start:[0,1,0],goal:[0,3,1],rotate:true},
{name:"15 — Poisoned Column",
   hint:"One spike ruins the whole line it lands in. Fold from elsewhere.",
   blocks:[[0,0,0],[-4,1,1],[-3,0,1],[-2,0,1],[-1,0,1,4]],
   start:[0,1,0],goal:[-2,1,1],rotate:true},
{name:"16 — Check Behind",
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
{name:"17 — Two Threats",
   hint:"Two spikes, four views, one that works.",
   blocks:[[0,0,0],[0,0,-3],[2,0,-3],[-1,3,6,4],[1,0,-5,4]],
   start:[0,1,0],goal:[2,1,-3],rotate:true},
{name:"18 — Narrow Safety",
   hint:"The safe column is a single square wide. Find it before you fold.",
   blocks:[[0,0,0],[3,0,0],[4,0,1],[5,0,1],[6,0,1,4]],
   start:[0,1,0],goal:[5,1,1],rotate:true},
{name:"19 — Thread It",
   hint:"Two folds, and both of them have teeth.",
   blocks:[[0,0,0],[-2,0,-5],[-1,0,-5],[0,0,-5,4],[-1,1,1]],
   start:[0,1,0],goal:[-1,1,-5],rotate:true},
{name:"BOSS II — The Record",
   won:"You are on the list now. It is a short list.",
   hint:"The ground bites here. A spike casts like stone, so its column kills them exactly as well as a pillar's does — and it kills you underfoot, which a pillar never does.",
   /* Cover and spikes together in phase two, so the section's piece is part
      of "the arena finishes rising" rather than something smuggled in later.
      Phases three and four then change only the opponent - see BOSS I. */
   boss:{creepEvery:7500,
     phases:[
       {at:[[8,1,5]],step:740,aim:880,say:"bare ground, for now"},
       {at:[[8,1,5]],step:670,aim:790,say:"cover for it, and the floor bites",
        add:[[3,1,1],[6,1,4],[5,1,2,4],[2,1,4],[7,1,2,4]]},
       {at:[[8,1,5],[7,1,6]],step:590,aim:660,say:"same ground — two of them"}]},
   blocks:box(0,9,0,0,0,6,[]),
   start:[1,1,1]},
{name:"20 — Clear Ground",
   hint:"Glass holds you up in the volume. It puts nothing in the plane.",
   blocks:[[0,0,0],[0,1,-1,1],[-1,2,-5],[-1,2,-3],[0,2,-3,1],[0,2,-4,1],[1,2,-4,1],[1,2,-5,1]],
   start:[0,1,0],goal:[1,3,-5],rotate:true},
{name:"21 — Nothing Underfoot",
   /* Second block moved from z=2 to z=7, for the reason Six Across was moved:
      one across and two back draws within a twentieth of a cell of one across
      and one *down*, so the first press of the level read as a step you could
      take and was a fall out of the world. Reported from play, and
      tools/legible.js had it flagged from the start square. Checked at
      z=2,3,5,6,7,9 - same route, same move count, same score. */
   hint:"A long walk on a silhouette with a piece missing.",
   blocks:[[0,0,0],[-1,0,7],[-2,1,6],[-3,1,5],[-4,1,4],[-5,2,-4],[-6,3,-4],[-6,3,-2],[-6,3,-3,1],[-6,4,-4,1]],
   start:[0,1,0],goal:[-6,5,-4],rotate:true},
{name:"22 — Twice Transparent",
   hint:"What you stood on to get here won't be there when you fold.",
   blocks:[[0,0,0],[-1,0,2],[-1,0,3],[-1,1,2,1],[0,2,8],[0,2,11,1],[0,3,12,1]],
   start:[0,1,0],goal:[0,4,12],rotate:true},
{name:"23 — Look Through It",
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
{name:"24 — Invisible Architecture",
   hint:"Most of this structure never reaches the page.",
   blocks:[[0,0,0],[0,0,-1,1],[3,0,-2],[-5,0,-3],[-3,0,-3],[-4,1,-3,1],[-8,2,-2],[-10,2,-1],[-9,2,-1,1]],
   start:[0,1,0],goal:[-9,3,-1],rotate:true},
{name:"25 — Down and Around",
   hint:"Descend before you turn. The anchor is waiting either way.",
   blocks:[[0,0,0],[-3,1,-1],[-4,1,-1],[-3,1,0,1],[-2,1,0,1],[-1,1,-6],[0,1,-5],[0,1,-4]],
   start:[0,1,0],goal:[0,2,-4],rotate:true},
{name:"26 — Long Division",
   hint:"A long walk on each side of the turn.",
   blocks:[[0,0,0],[-1,0,0,1],[-2,0,3],[-2,0,6],[-2,0,7],[-1,1,7,1],[3,2,8],[5,2,9],[2,3,10],[2,3,11],[-1,3,11]],
   start:[0,1,0],goal:[-1,4,11],rotate:true},
{name:"27 — Two Dangers",
   hint:"Glass under your feet and something sharp down the axis.",
   blocks:[[0,0,0],[3,1,0,1],[3,1,1],[3,1,-1],[4,1,-1,4],[5,3,-4,1]],
   start:[0,1,0],goal:[3,2,-1],rotate:true},
{name:"BOSS III — The Search",
   won:"They can only count what casts a shadow. This world is larger than their record of it.",
   hint:"Glass casts nothing. The pillars you can see through are the ones that will not kill them — check which shadow you are herding them into.",
   /* Stone and glass rise together in phase two, so the lesson of the arena -
      the pillars you can see through are the ones you can still attack from -
      is learned against one hunter and then tested against two on exactly
      the same board. */
   boss:{creepEvery:7000,
     phases:[
       {at:[[8,1,5]],step:720,aim:860,say:"clear glass, clear floor"},
       {at:[[8,1,5]],step:650,aim:770,say:"stone you cannot fold through, glass you can",
        add:[[3,1,2],[7,1,4],[6,1,1],[5,1,1,1],[2,1,5,1],[8,1,3,1]]},
       {at:[[8,1,5],[7,1,6]],step:570,aim:650,say:"same ground — two of them"}]},
   blocks:box(0,9,0,0,0,6,[]),
   start:[1,1,1]},
{name:"28 — Shove",
   hint:"Violet blocks move when you walk into them. The plane notices.",
   blocks:[[-1,0,3],[-2,0,-1],[-1,0,-1],[0,0,-1],[0,0,0],[-1,1,-1,3]],
   start:[0,1,0],goal:[-1,1,3],rotate:true},
{name:"29 — Make a Bridge",
   hint:"Put it where the fold will need it, then fold.",
   blocks:[[-2,0,5],[-1,1,-2],[-1,1,-1],[-1,1,0],[0,0,0],[-1,2,-1,3]],
   start:[0,1,0],goal:[-2,1,5],rotate:true},
{name:"30 — Shove and Turn",
   hint:"The crate is only useful from one of the four views.",
   blocks:[[-2,0,0],[-1,0,0],[0,0,0],[1,2,1],[-1,1,0,3],[1,2,-2,3]],
   start:[0,1,0],goal:[1,3,1],rotate:true},
{name:"31 — Shove It Clear",
   hint:"Move the block, or the column it lands in will kill you.",
   blocks:[[0,0,0],[-3,0,1,4],[-2,0,1],[-1,1,-3],[-1,1,-2],[-1,1,-1],[-1,1,0],[4,0,6,4],[-1,2,-2,3]],
   start:[0,1,0],goal:[-2,1,1],rotate:true},
{name:"32 — There and Back",
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
{name:"33 — Push Through Nothing",
   hint:"The crate makes the plane; the glass unmakes the volume.",
   blocks:[[0,0,0],[1,2,-3,1],[3,2,-3],[4,0,-5],[4,0,-4],[4,0,-3],[1,1,1],[2,1,1,1],[4,1,-4,3]],
   start:[0,1,0],goal:[4,1,-4],rotate:true},
{name:"34 — Reshape",
   hint:"One shove between two folds changes the whole silhouette.",
   blocks:[[5,1,-3],[-1,1,-4],[-1,1,-3],[-1,1,-2],[-1,1,-1],[0,0,0],[-1,2,-3,3]],
   start:[0,1,0],goal:[5,2,-3],rotate:true},
{name:"35 — Confluence",
   hint:"All three now. Read the depth before you commit.",
   blocks:[[0,0,0],[4,1,2,1],[4,1,3],[4,1,5,1],[2,0,0],[2,0,1],[2,0,2,4],[2,1,1,3]],
   start:[0,1,0],goal:[4,2,3],rotate:true},
{name:"36 — Turn, Shove, Fold",
   hint:"Face the right way first. The safe column is not the obvious one.",
   blocks:[[0,0,0],[-3,0,-3,4],[-3,0,-2],[-3,0,-1],[-3,0,0,1],[5,1,-4],[-3,2,-4,1],[-3,1,-2,3]],
   start:[0,1,0],goal:[5,2,-4],rotate:true},
{name:"37 — Twice Pushed",
   hint:"It takes two shoves to get it where it belongs.",
   blocks:[[1,1,1],[1,1,2],[1,1,3],[1,1,4],[2,2,5],[0,0,0],[1,2,2,3],[1,3,2,3]],
   start:[0,1,0],goal:[2,3,5],rotate:true},
{name:"BOSS IV — The Census",
   won:"The count is closed, and you are not in it.",
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
       {at:[[9,1,6],[8,1,7]],step:550,aim:620,say:"same ground — two of them"}]},
   blocks:box(0,10,0,0,0,7,[]),
   start:[1,1,1]},
{name:"38 — Up and Over",
   hint:"Three folds and two shoves. The crate has to travel.",
   blocks:[[3,0,1],[0,0,3],[1,0,3],[2,0,3],[3,0,3],[1,2,-5],[3,2,-5],[0,0,0],[2,1,3,3]],
   start:[0,1,0],goal:[1,3,-5],rotate:true},
{name:"39 — Down and Through",
   hint:"Descend, shove, and fold twice from opposite sides.",
   blocks:[[0,0,0],[-3,3,1],[-3,3,2,1],[-3,3,4],[1,1,0],[1,1,1],[1,1,2,1],[0,3,3,4],[1,2,1,3]],
   start:[0,1,0],goal:[-3,4,4],rotate:true},
{name:"40 — Reach Across",
   hint:"The crate goes one way and you go the other.",
   blocks:[[0,0,0],[1,2,6],[2,2,6],[3,1,1],[3,1,2],[3,1,3],[0,2,1,1],[0,2,2,4],[3,2,2,3]],
   start:[0,1,0],goal:[1,3,6],rotate:true},
{name:"41 — Three Folds, Three Threats",
   hint:"Three collapses, and something waiting in each.",
   blocks:[[0,0,0],[1,2,1],[0,3,-3],[1,3,-3,1],[4,3,-2],[4,3,-1],[4,3,0,4],[4,3,1],[0,1,1,1],[4,4,-1,3]],
   start:[0,1,0],goal:[4,4,1],rotate:true},
{name:"42 — The Whole Language",
   hint:"Everything the game knows how to say, in one level.",
   blocks:[[0,0,0],[-5,2,-2],[-4,2,-2,1],[-3,2,-2],[2,3,2],[5,1,-1,4],[-2,3,0],[-1,3,0],[-5,1,1],[-5,1,2],[-5,1,3],[-5,2,2,3]],
   start:[0,1,0],goal:[-1,4,0],rotate:true},
{name:"43 — The Middle One",
   hint:"Three places to land in that column. Turning reaches the ends, never the middle.",
   blocks:[[0,0,0],[0,0,6,2],[0,0,9],[3,0,5]],
   start:[0,1,0],goal:[3,1,5],rotate:true},
{name:"44 — Claimed",
   hint:"Amber catches you on the way past.",
   blocks:[[0,0,0],[0,0,3],[0,0,6,2],[0,0,8],[0,0,11],[4,0,9],[9,0,9,2],[12,0,9],[9,0,7]],
   start:[0,1,0],goal:[9,1,7],rotate:true},
{name:"45 — Walk First",
   hint:"Where you fold from decides which column you are choosing between.",
   blocks:[[0,0,0],[1,0,0],[1,0,5,2],[1,0,8],[1,0,13],[6,0,6],[5,0,6],[4,0,6]],
   start:[0,1,0],goal:[6,1,6],rotate:true},
{name:"46 — Two Middles",
   hint:"Two columns, and in each one the answer is inside.",
   blocks:[[0,0,0],[0,0,6,2],[0,0,11],[0,0,17],[2,0,7,2],[7,0,7],[2,0,8]],
   start:[0,1,0],goal:[2,1,8],rotate:true},
{name:"47 — Past the Landing",
   hint:"You arrive, and there is still somewhere to go.",
   blocks:[[0,0,0],[0,0,4,2],[0,0,10],[2,0,5,2],[5,0,5],[2,0,4]],
   start:[0,1,0],goal:[2,1,4],rotate:true},
{name:"48 — Deeper In",
   hint:"A longer walk in the plane before the second claim.",
   blocks:[[0,0,0],[1,0,0],[1,0,4],[1,0,9,2],[1,0,12],[1,0,17],[4,0,8,2],[9,0,8],[4,0,7]],
   start:[0,1,0],goal:[4,1,7],rotate:true},
{name:"49 — Both Inside",
   hint:"Both columns, both middles, one route.",
   blocks:[[0,0,0],[1,0,0],[2,0,0],[2,0,2,2],[2,0,6],[2,0,12],[7,0,3,2],[11,0,3],[7,0,4]],
   start:[0,1,0],goal:[7,1,4],rotate:true},
{name:"50 — Held Fast",
   hint:"Shove it onto the amber. It will never move again, which is the point.",
   blocks:[[0,0,0],[1,0,-4],[2,0,-4],[3,0,-4,2],[4,0,-4],[2,2,-2],[2,1,-4,3]],
   start:[0,1,0],goal:[2,3,-2],rotate:true},
{name:"51 — One Chance",
   hint:"You only get to place it once.",
   blocks:[[0,0,0],[2,3,6,2],[2,3,7],[1,1,-6],[2,1,-6],[3,1,-6,2],[2,2,-6,3]],
   start:[0,1,0],goal:[2,4,7],rotate:true},
{name:"52 — Set in Amber",
   hint:"Glass under you, a crate pinned in front of you.",
   blocks:[[0,0,0],[1,3,4],[1,2,2],[-5,1,1],[-5,1,2],[-5,1,3,2],[-5,1,4],[-5,2,2,3]],
   start:[0,1,0],goal:[1,4,4],rotate:true},
{name:"53 — Pin It Down",
   hint:"Fold, land, pin, and fold again from the same spot.",
   blocks:[[0,0,0],[-4,0,3],[-4,0,4],[-1,0,1,2],[-1,0,2],[-1,0,3],[-1,0,4,2],[-1,1,3,3]],
   start:[0,1,0],goal:[-4,1,4],rotate:true},
{name:"54 — Two Shoves, One Home",
   hint:"Twice pushed, and only the second landing counts.",
   blocks:[[0,0,0],[-2,1,-4],[-2,1,-3,2],[-2,1,-2],[-2,1,-1,2],[-5,0,-2],[0,3,-2],[0,3,-1],[-2,2,-2,3]],
   start:[0,1,0],goal:[0,4,-1],rotate:true},
{name:"55 — Down to the Amber",
   hint:"Push it down before you go around.",
   blocks:[[0,0,0],[2,3,1],[2,3,2],[2,3,3,2],[-2,1,2],[-2,1,3],[-2,1,4,2],[-2,1,5],[-1,1,2],[-2,2,3,3]],
   start:[0,1,0],goal:[2,4,1],rotate:true},
{name:"56 — Three Ways Round",
   hint:"Three folds, and the crate must be fixed before the last.",
   blocks:[[0,0,0],[-3,2,-5,2],[-2,2,-5],[-1,2,-5],[4,0,-6],[4,0,-5],[4,0,-4,2],[-1,0,-6],[4,1,-5,3]],
   start:[0,1,0],goal:[-1,3,-5],rotate:true},
{name:"57 — Turn Twice More",
   hint:"Every view matters, and the crate is only right in one of them.",
   blocks:[[0,0,0],[-5,2,2],[0,2,-2],[2,2,-2],[-1,0,1],[-1,0,2],[-1,0,3,2],[-1,0,4,2],[-1,1,2,3]],
   start:[0,1,0],goal:[2,3,-2],rotate:true},
{name:"58 — The Last Placement",
   hint:"Everything the amber can do, all at once.",
   blocks:[[0,0,0],[-5,0,-2],[-4,0,-2],[-3,0,-2,2],[0,0,4],[1,0,4],[2,0,4],[3,0,4,2],[4,2,-3],[1,1,4,3]],
   start:[0,1,0],goal:[-5,1,-2],rotate:true},
{name:"59 — Long Glass",
   hint:"Glass to stand on, amber to land on, and one turn between.",
   blocks:[[0,0,0],[-1,0,-4],[-2,0,-4],[-3,0,4],[-3,0,-2],[-3,0,-1,1],[-4,1,-1,1],[-8,2,-2],[-9,2,-2]],
   start:[0,1,0],goal:[-9,3,-2],rotate:true},
{name:"60 — Absent Floor",
   hint:"What carried you across the plane was never in the volume.",
   blocks:[[0,0,0],[-1,0,0],[-2,1,5],[-2,1,-3],[-2,1,-4,1],[-1,2,-4,1],[-3,2,-5],[2,2,-6],[-7,2,-6],[-3,3,-5]],
   start:[0,1,0],goal:[-7,3,-6],rotate:true},
{name:"61 — Twice Up",
   hint:"Climb, fold, climb again, and fold back the other way.",
   blocks:[[0,0,0],[1,0,0,1],[2,0,3],[2,0,6],[2,0,7],[3,1,7,1],[4,2,11],[5,2,13],[6,3,10],[7,3,10],[7,3,7]],
   start:[0,1,0],goal:[7,4,7],rotate:true},
{name:"62 — The Far Shore",
   hint:"The longest crossing in the game, and a hole in the middle of it.",
   blocks:[[0,0,0],[-1,0,0],[-2,1,5],[-2,1,-3],[-1,1,-3,1],[-1,2,-2,1],[-3,2,-1],[2,2,0],[-7,2,0],[-3,3,-1]],
   start:[0,1,0],goal:[-7,3,0],rotate:true},
{name:"63 — Three Folds Deep",
   hint:"Three collapses, and something transparent in each one.",
   blocks:[[0,0,0],[1,0,2],[1,0,-5],[5,1,-4],[2,1,-4,1],[3,2,-4,1],[-2,3,-5],[8,3,-6],[-2,3,-7],[5,4,-8],[0,4,-9],[-2,4,-9,1]],
   start:[0,1,0],goal:[-2,5,-9],rotate:true},
{name:"64 — Everything at Once",
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
/* The `story` line is the Census, one sentence per section - see the note
   above SECTIONS' colours and CLAUDE.md. It is deliberately a second field
   rather than an extension of `sub`: `sub` says what the section teaches and
   is the thing a player needs, the story is the thing a player enjoys, and
   keeping them apart means the map can drop the fiction without losing the
   description. Never longer than one line at panel width. */
/* THEME - what a section does to the world.

   `col` above is a UI colour: it has to read as a tab and a trail on a dark
   panel. `theme` is a *place*, and the two are deliberately not the same
   value. A theme is three things: a two-stop gradient for the void, the
   stone colour, and an ambient field drifting behind the world.

   THE STONE IS DESATURATED ON PURPOSE, and that is the whole rule that
   makes this safe. The pieces carry fixed identities now - fire is orange,
   water is cyan, a crate is violet, an anchor is amber - and they are the
   things a puzzle is made of. Rendering a section in a saturated hue was
   tried and hid the piece it was teaching: a red world swallowed a fire
   block whole, a blue one swallowed water. Muted world, saturated pieces,
   and both read. If you raise the saturation of a `block` here, go and look
   at that section's fire and water blocks before you keep it.

   `air` is the ambient field - the drifting motes behind everything. `n` is
   how many, and it is small on purpose: this runs behind a puzzle, not
   instead of one. */
var SECTIONS=[
  {at:0, name:"PROLOGUE", sub:"walking, folding, turning, landing — one verb each", col:"#7183a6",
   story:"Nothing has noticed you yet.",
   theme:{sky:[0x141a2e,0x0a0e1a], block:0x5a6d94, ink:0x14172a,
          air:{col:0x8fa4cc, n:14, rise:.06, drift:.05, size:.10}}},
  {at:4, name:"I · FUNDAMENTALS", sub:"one verb: collapse the world and cross the gap", col:"#35c2a5",
   story:"Every fold is a visit. The plane keeps count.",
   /* MOSS. Spores drifting upward - the gentlest field in the game, for the
      section a new player is deciding in. */
   /* Olive rather than a true green, and that is the same don't-camouflage
      rule one level up: the goal is a saturated teal-green wireframe and it
      appears in EVERY section, so no section may sit on its hue. */
   theme:{sky:[0x1d3a58,0x0e1c2e], block:0xbdbdbd, surface:"grass",
          scene:"trees", ink:0x16241a,
          stars:{n:46, col:0xdfe9ff, seed:19},
          air:{col:0xd8e8b0, n:14, rise:.05, drift:.09, size:.075}}},
  {at:18, name:"II · SPIKES", sub:"a hazard you cannot see until you fold", col:"#e0455f",
   story:"Some of what is down there did not survive being flattened.",
   /* HELL, and it is DARK hell rather than bright. This section teaches
      fire, and a glowing orange world swallows a fire block whole - that was
      rendered and it is the exact failure the desaturation rule exists to
      catch. So the ground is near-black basalt with molten veins in it, the
      sky is a deep ember glow low down, and the brightest thing standing
      anywhere on it is still the piece the section is about. */
   theme:{sky:[0x1a0a10,0x3a0f0a], block:0xc8c8c8, surface:"basalt",
          scene:"hell", flare:17000, ink:0x24100e,
          air:{col:0xff9a4a, n:24, rise:.20, drift:.07, size:.07}}},
  {at:27, name:"III · GLASS", sub:"solid in the volume, absent from the plane", col:"#7fb2ff",
   story:"Water casts nothing, so the plane holds no record of it.",
   /* EMBER, for the same inverted reason: this section teaches water, so a
      warm world is what makes cyan sing. Embers rise, and the void warms
      every twenty seconds or so - the eruption, without drawing a
      volcano at it. */
   theme:{sky:[0x241a38,0x63382a], block:0x8a6152, scene:"dunes",
          ink:0x1e1109,
          air:{col:0xffa45c, n:22, rise:.22, drift:.10, size:.075}}},
  /* Purple, because a crate is drawn pale violet in the world - the section
     wears the colour of the piece it teaches. It is deliberately pinker and
     lighter than the boss's #a274ff so the two are not the same purple; the
     boss also carries its four-arc ring, which is what actually tells them
     apart. This is the closest any section gets to a reserved colour, and
     the pair should be pulled further apart when the boss is revisited. */
  {at:37, name:"IV · CRATES", sub:"change the plane by moving the volume", col:"#c07ae0",
   story:"You can edit what they see. That is the one thing they cannot do.",
   /* DUST. Drifting sideways rather than rising or falling, because this is
      the section about pushing things along a row. */
   theme:{sky:[0x1e2734,0x4f4630], block:0x8d7f5e, scene:"ruins",
          ink:0x1c1710,
          air:{col:0xe0cd9a, n:18, rise:.02, drift:.20, size:.085}}},
  {at:49, name:"V · EXTRA", sub:"unlocked by the Census — the long ones", col:"#3fc4d4", locked:true,
   story:"The parts of the world that were never counted.",
   /* NOCTURNE. Almost nothing moves out here, which is the point - it is
      the shelf past the last warden, where the counting stopped. */
   theme:{sky:[0x0b0c16,0x05050b], block:0x4c4a66, scene:"shards",
          ink:0x11101a,
          stars:{n:30, col:0xc9c4ee, seed:61},
          air:{col:0x8a86b8, n:10, rise:.03, drift:.02, size:.07}}}
];

/* Levels have been renumbered more than once. Progress is keyed by name,
   so without this every solved level would read unsolved. Entries compose
   across reshuffles - the oldest name still resolves to the current one -
   so never rewrite this table, only extend it. Applied by migrateNames()
   in 06-persistence.js. */
var LEVEL_RENAMES={
 /* THE CENSUS RENAMED ALL FOUR BOSSES. Composed, not rewritten: the three
    keys that used to land on "BOSS I — The Hunt" are re-pointed at its new
    name in the same edit that makes "The Hunt" itself a key, which is what
    keeps the no-value-is-also-a-key invariant true. Bosses II-IV had never
    been renamed, so they arrive as one new entry each. */
 "BOSS I — The Sentinel": "BOSS I — The Sighting",
 "BOSS I — The Pack": "BOSS I — The Sighting",
 "BOSS I — The Twin": "BOSS I — The Sighting",
 "BOSS I — The Hunt": "BOSS I — The Sighting",
 "BOSS II — Sharp Ground": "BOSS II — The Record",
 "BOSS III — Through Glass": "BOSS III — The Search",
 "BOSS IV — The Orthogon": "BOSS IV — The Census",
 "02 — Turn to see": "02 — Turn to see",
 "03 — Two Windows": "05 — Two Windows",
 "04 — The Long Way Round": "06 — The Long Way Round",
 "05 — About Face": "07 — About Face",
 "06 — The Last Step": "08 — The Last Step",
 "07 — Six Across": "09 — Six Across",
 "08 — Fold After Climbing": "10 — Fold After Climbing",
 "09 — Far Side": "11 — Far Side",
 "10 — Three Folds": "12 — Three Folds",
 "18 — Sharp": "13 — Sharp",
 "19 — Cast a Shadow": "14 — Cast a Shadow",
 "20 — Poisoned Column": "15 — Poisoned Column",
 "22 — Check Behind": "16 — Check Behind",
 "23 — Two Threats": "17 — Two Threats",
 "24 — Narrow Safety": "18 — Narrow Safety",
 "41 — Thread It": "19 — Thread It",
 "11 — Clear Ground": "20 — Clear Ground",
 "12 — Nothing Underfoot": "21 — Nothing Underfoot",
 "13 — Twice Transparent": "22 — Twice Transparent",
 "14 — Look Through It": "23 — Look Through It",
 "15 — Invisible Architecture": "24 — Invisible Architecture",
 "16 — Down and Around": "25 — Down and Around",
 "17 — Long Division": "26 — Long Division",
 "21 — Two Dangers": "27 — Two Dangers",
 "39 — Confluence": "35 — Confluence",
 "40 — Turn, Shove, Fold": "36 — Turn, Shove, Fold",
 "42 — Twice Pushed": "37 — Twice Pushed",
 "45 — Up and Over": "38 — Up and Over",
 "43 — Down and Through": "39 — Down and Through",
 "44 — Reach Across": "40 — Reach Across",
 "57 — Three Folds, Three Threats": "41 — Three Folds, Three Threats",
 "60 — The Whole Language": "42 — The Whole Language",
 "32 — The Middle One": "43 — The Middle One",
 "33 — Claimed": "44 — Claimed",
 "34 — Walk First": "45 — Walk First",
 "35 — Two Middles": "46 — Two Middles",
 "36 — Past the Landing": "47 — Past the Landing",
 "37 — Deeper In": "48 — Deeper In",
 "38 — Both Inside": "49 — Both Inside",
 "46 — Held Fast": "50 — Held Fast",
 "47 — One Chance": "51 — One Chance",
 "48 — Set in Amber": "52 — Set in Amber",
 "49 — Pin It Down": "53 — Pin It Down",
 "50 — Two Shoves, One Home": "54 — Two Shoves, One Home",
 "51 — Down to the Amber": "55 — Down to the Amber",
 "52 — Three Ways Round": "56 — Three Ways Round",
 "58 — Turn Twice More": "57 — Turn Twice More",
 "59 — The Last Placement": "58 — The Last Placement",
 "55 — Long Glass": "59 — Long Glass",
 "53 — Absent Floor": "60 — Absent Floor",
 "54 — Twice Up": "61 — Twice Up",
 "56 — The Far Shore": "62 — The Far Shore",
 "61 — Three Folds Deep": "63 — Three Folds Deep",
 "62 — Everything at Once": "64 — Everything at Once",
 "11 — Sharp": "13 — Sharp",
 "12 — Cast a Shadow": "14 — Cast a Shadow",
 "13 — Poisoned Column": "15 — Poisoned Column",
 "14 — Check Behind": "16 — Check Behind",
 "15 — Two Threats": "17 — Two Threats",
 "16 — Narrow Safety": "18 — Narrow Safety",
 "17 — Thread It": "19 — Thread It",
 "18 — Clear Ground": "20 — Clear Ground",
 "19 — Nothing Underfoot": "21 — Nothing Underfoot",
 "20 — Twice Transparent": "22 — Twice Transparent",
 "21 — Look Through It": "23 — Look Through It",
 "22 — Invisible Architecture": "24 — Invisible Architecture",
 "23 — Down and Around": "25 — Down and Around",
 "24 — Long Division": "26 — Long Division",
 "25 — Two Dangers": "27 — Two Dangers",
 "26 — Shove": "28 — Shove",
 "27 — Make a Bridge": "29 — Make a Bridge",
 "28 — Shove and Turn": "30 — Shove and Turn",
 "29 — Shove It Clear": "31 — Shove It Clear",
 "30 — There and Back": "32 — There and Back",
 "31 — Push Through Nothing": "33 — Push Through Nothing",
 "32 — Reshape": "34 — Reshape",
 "33 — Confluence": "35 — Confluence",
 "34 — Turn, Shove, Fold": "36 — Turn, Shove, Fold",
 "35 — Twice Pushed": "37 — Twice Pushed",
 "36 — Up and Over": "38 — Up and Over",
 "37 — Down and Through": "39 — Down and Through",
 "38 — Reach Across": "40 — Reach Across",
 "39 — Three Folds, Three Threats": "41 — Three Folds, Three Threats",
 "40 — The Whole Language": "42 — The Whole Language",
 "41 — The Middle One": "43 — The Middle One",
 "42 — Claimed": "44 — Claimed",
 "43 — Walk First": "45 — Walk First",
 "44 — Two Middles": "46 — Two Middles",
 "45 — Past the Landing": "47 — Past the Landing",
 "46 — Deeper In": "48 — Deeper In",
 "47 — Both Inside": "49 — Both Inside",
 "48 — Held Fast": "50 — Held Fast",
 "49 — One Chance": "51 — One Chance",
 "50 — Set in Amber": "52 — Set in Amber",
 "51 — Pin It Down": "53 — Pin It Down",
 "52 — Two Shoves, One Home": "54 — Two Shoves, One Home",
 "53 — Down to the Amber": "55 — Down to the Amber",
 "54 — Three Ways Round": "56 — Three Ways Round",
 "55 — Turn Twice More": "57 — Turn Twice More",
 "56 — The Last Placement": "58 — The Last Placement",
 "57 — Long Glass": "59 — Long Glass",
 "58 — Absent Floor": "60 — Absent Floor",
 "59 — Twice Up": "61 — Twice Up",
 "60 — The Far Shore": "62 — The Far Shore",
 "04 — Two Windows": "05 — Two Windows",
 "05 — The Long Way Round": "06 — The Long Way Round",
 "06 — About Face": "07 — About Face",
 "09 — The Last Step": "08 — The Last Step",
 "10 — Far Side": "11 — Far Side",
 "11 — Three Folds": "12 — Three Folds",
 "12 — Clear Ground": "20 — Clear Ground",
 "13 — Nothing Underfoot": "21 — Nothing Underfoot",
 "14 — Twice Transparent": "22 — Twice Transparent",
 "15 — Look Through It": "23 — Look Through It",
 "16 — Invisible Architecture": "24 — Invisible Architecture",
 "58 — Down and Around": "25 — Down and Around",
 "59 — Long Division": "26 — Long Division",
 "17 — Sharp": "13 — Sharp",
 "18 — Cast a Shadow": "14 — Cast a Shadow",
 "19 — Poisoned Column": "15 — Poisoned Column",
 "38 — Two Dangers": "27 — Two Dangers",
 "20 — Check Behind": "16 — Check Behind",
 "21 — Two Threats": "17 — Two Threats",
 "22 — Narrow Safety": "18 — Narrow Safety",
 "24 — Shove": "28 — Shove",
 "25 — Make a Bridge": "29 — Make a Bridge",
 "26 — Shove and Turn": "30 — Shove and Turn",
 "40 — Shove It Clear": "31 — Shove It Clear",
 "27 — There and Back": "32 — There and Back",
 "39 — Push Through Nothing": "33 — Push Through Nothing",
 "28 — Reshape": "34 — Reshape",
 "31 — The Middle One": "43 — The Middle One",
 "32 — Claimed": "44 — Claimed",
 "33 — Walk First": "45 — Walk First",
 "34 — Two Middles": "46 — Two Middles",
 "35 — Past the Landing": "47 — Past the Landing",
 "36 — Deeper In": "48 — Deeper In",
 "37 — Both Inside": "49 — Both Inside",
 "41 — Confluence": "35 — Confluence",
 "42 — Turn, Shove, Fold": "36 — Turn, Shove, Fold",
 "23 — Thread It": "19 — Thread It",
 "29 — Twice Pushed": "37 — Twice Pushed",
 "30 — Up and Over": "38 — Up and Over",
 "60 — Twice Up": "61 — Twice Up",
 "61 — The Far Shore": "62 — The Far Shore",
 "45 — Three Folds, Three Threats": "41 — Three Folds, Three Threats",
 "46 — The Whole Language": "42 — The Whole Language",
 "62 — Three Folds Deep": "63 — Three Folds Deep",
 "63 — Everything at Once": "64 — Everything at Once",
 "01 — Turn to see": "02 — Turn to see",
 "02 — Two Windows": "05 — Two Windows",
 "03 — The Long Way Round": "06 — The Long Way Round",
 "04 — About Face": "07 — About Face",
 "05 — The Last Step": "08 — The Last Step",
 "06 — Six Across": "09 — Six Across",
 "07 — Fold After Climbing": "10 — Fold After Climbing",
 "08 — Far Side": "11 — Far Side",
 "09 — Three Folds": "12 — Three Folds",
 "10 — Sharp": "13 — Sharp",
 "11 — Cast a Shadow": "14 — Cast a Shadow",
 "12 — Poisoned Column": "15 — Poisoned Column",
 "13 — Check Behind": "16 — Check Behind",
 "14 — Two Threats": "17 — Two Threats",
 "15 — Narrow Safety": "18 — Narrow Safety",
 "16 — Thread It": "19 — Thread It",
 "17 — Clear Ground": "20 — Clear Ground",
 "18 — Nothing Underfoot": "21 — Nothing Underfoot",
 "19 — Twice Transparent": "22 — Twice Transparent",
 "20 — Look Through It": "23 — Look Through It",
 "21 — Invisible Architecture": "24 — Invisible Architecture",
 "22 — Down and Around": "25 — Down and Around",
 "23 — Long Division": "26 — Long Division",
 "24 — Two Dangers": "27 — Two Dangers",
 "25 — Shove": "28 — Shove",
 "26 — Make a Bridge": "29 — Make a Bridge",
 "27 — Shove and Turn": "30 — Shove and Turn",
 "28 — Shove It Clear": "31 — Shove It Clear",
 "29 — There and Back": "32 — There and Back",
 "30 — Push Through Nothing": "33 — Push Through Nothing",
 "31 — Reshape": "34 — Reshape",
 "32 — Confluence": "35 — Confluence",
 "33 — Turn, Shove, Fold": "36 — Turn, Shove, Fold",
 "34 — Twice Pushed": "37 — Twice Pushed",
 "35 — Up and Over": "38 — Up and Over",
 "36 — Down and Through": "39 — Down and Through",
 "37 — Reach Across": "40 — Reach Across",
 "38 — Three Folds, Three Threats": "41 — Three Folds, Three Threats",
 "39 — The Whole Language": "42 — The Whole Language",
 "40 — The Middle One": "43 — The Middle One",
 "41 — Claimed": "44 — Claimed",
 "42 — Walk First": "45 — Walk First",
 "43 — Two Middles": "46 — Two Middles",
 "44 — Past the Landing": "47 — Past the Landing",
 "45 — Deeper In": "48 — Deeper In",
 "46 — Both Inside": "49 — Both Inside",
 "47 — Held Fast": "50 — Held Fast",
 "48 — One Chance": "51 — One Chance",
 "49 — Set in Amber": "52 — Set in Amber",
 "50 — Pin It Down": "53 — Pin It Down",
 "51 — Two Shoves, One Home": "54 — Two Shoves, One Home",
 "52 — Down to the Amber": "55 — Down to the Amber",
 "53 — Three Ways Round": "56 — Three Ways Round",
 "54 — Turn Twice More": "57 — Turn Twice More",
 "55 — The Last Placement": "58 — The Last Placement",
 "56 — Long Glass": "59 — Long Glass",
 "57 — Absent Floor": "60 — Absent Floor",
 "58 — Twice Up": "61 — Twice Up",
 "59 — The Far Shore": "62 — The Far Shore",
 "60 — Three Folds Deep": "63 — Three Folds Deep",
 "61 — Everything at Once": "64 — Everything at Once",
 "04 — Turn to see": "02 — Turn to see",
 "05 — Halfway Across": "04 — Halfway Across",
 "06 — Two Windows": "05 — Two Windows",
 "07 — The Long Way Round": "06 — The Long Way Round",
 "08 — About Face": "07 — About Face",
 "10 — Six Across": "09 — Six Across",
 "11 — Fold After Climbing": "10 — Fold After Climbing",
 "12 — Far Side": "11 — Far Side",
 "13 — Three Folds": "12 — Three Folds",
 "14 — Sharp": "13 — Sharp",
 "15 — Cast a Shadow": "14 — Cast a Shadow",
 "16 — Poisoned Column": "15 — Poisoned Column",
 "17 — Check Behind": "16 — Check Behind",
 "18 — Two Threats": "17 — Two Threats",
 "19 — Narrow Safety": "18 — Narrow Safety",
 "20 — Thread It": "19 — Thread It",
 "21 — Clear Ground": "20 — Clear Ground",
 "22 — Nothing Underfoot": "21 — Nothing Underfoot",
 "23 — Twice Transparent": "22 — Twice Transparent",
 "24 — Look Through It": "23 — Look Through It",
 "25 — Invisible Architecture": "24 — Invisible Architecture",
 "26 — Down and Around": "25 — Down and Around",
 "27 — Long Division": "26 — Long Division",
 "28 — Two Dangers": "27 — Two Dangers",
 "29 — Shove": "28 — Shove",
 "30 — Make a Bridge": "29 — Make a Bridge",
 "31 — Shove and Turn": "30 — Shove and Turn",
 "32 — Shove It Clear": "31 — Shove It Clear",
 "33 — There and Back": "32 — There and Back",
 "34 — Push Through Nothing": "33 — Push Through Nothing",
 "35 — Reshape": "34 — Reshape",
 "36 — Confluence": "35 — Confluence",
 "37 — Turn, Shove, Fold": "36 — Turn, Shove, Fold",
 "38 — Twice Pushed": "37 — Twice Pushed",
 "39 — Up and Over": "38 — Up and Over",
 "40 — Down and Through": "39 — Down and Through",
 "41 — Reach Across": "40 — Reach Across",
 "42 — Three Folds, Three Threats": "41 — Three Folds, Three Threats",
 "43 — The Whole Language": "42 — The Whole Language",
 "44 — The Middle One": "43 — The Middle One",
 "45 — Claimed": "44 — Claimed",
 "46 — Walk First": "45 — Walk First",
 "47 — Two Middles": "46 — Two Middles",
 "48 — Past the Landing": "47 — Past the Landing",
 "49 — Deeper In": "48 — Deeper In",
 "50 — Both Inside": "49 — Both Inside",
 "51 — Held Fast": "50 — Held Fast",
 "52 — One Chance": "51 — One Chance",
 "53 — Set in Amber": "52 — Set in Amber",
 "54 — Pin It Down": "53 — Pin It Down",
 "55 — Two Shoves, One Home": "54 — Two Shoves, One Home",
 "56 — Down to the Amber": "55 — Down to the Amber",
 "57 — Three Ways Round": "56 — Three Ways Round",
 "60 — Long Glass": "59 — Long Glass",
 "61 — Absent Floor": "60 — Absent Floor",
 "62 — Twice Up": "61 — Twice Up",
 "63 — The Far Shore": "62 — The Far Shore",
 "64 — Three Folds Deep": "63 — Three Folds Deep",
 "65 — Everything at Once": "64 — Everything at Once",
 /* 02 and 03 traded places after playtesting. Composed, not rewritten: the
    three older keys that used to land on "03 — Turn to see" were re-pointed
    at its new name in the same edit, which is what leaves one of them
    ("02 — Turn to see", from an era when it was 02 the first time) mapping
    to itself. That is correct and expected - numbers come back round, and a
    save under that name already holds the right level. */
 "03 — Turn to see": "02 — Turn to see",
 "02 — The Near One": "03 — The Near One"
};
