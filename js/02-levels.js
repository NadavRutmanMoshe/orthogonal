"use strict";
/* Orthogonal — 02-levels.js
   The campaign: four sections and a locked shelf, each section a run of
   levels around a trial and closed by a boss, plus the tutorial scripts.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

var LEVELS=[
{name:"00 — First Steps",
   hint:"Walking, and nothing else.",
   /* THE OWNER'S OWN LEVEL, and the first of eleven that replaced a
      generated opening. A five-by-three slab with a step across the middle
      of it: room to walk in both directions, one block to climb, and a drop
      on the far side of it down to the goal. Verified: four moves, and there
      is no fold route through this geometry at all, so the walking lesson
      cannot be short-circuited even before lockFlat refuses the verb. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[1,0,1],
     [2,0,-1],[2,0,0],[2,0,1],[3,0,-1],[3,0,0],[3,0,1],
     [4,0,1],[4,0,0],[4,0,-1],[3,1,0],[3,1,-1],[3,1,1]],
   start:[0,1,0],goal:[4,1,0],rotate:false,tutorial:true,lockFlat:true,
   /* Every step here names a control, so every step locks to it: the world
      dims and the named control is the only one that answers. See the guided
      lock in 15-tutorial.js - a step can opt out with lock:false, and none of
      these wants to.

      The prose names that control in tokens rather than in glyphs, because
      there are two sets of controls it could mean: the tutorial teaches the
      buttons or the gestures depending on the layout, and {do:right} is
      "Press <b>&#9654;</b>" or "<b>Swipe right</b>" accordingly. See TUT_SAY.
      A lesson that says "press the right arrow" over a swiping finger is the
      same bug {to2} exists to prevent, with a different subject. */
   /* ONE STEP IN DEPTH, NOT TWO, and that is a fact about this floor rather
      than a preference. The slab is three deep, so from the middle row a
      second press away from the camera walks off the edge - and the guided
      lock accepts only the control being asked for, so a step that asked for
      two would be a step that asks a first-time player to fall. */
   tut:[
     {say:"You are the pink cube. The green square is where you are going.<br>{do:right} twice.",
      cue:"bRight",done:function(c){return c.d.right>=2;}},
     {say:"The other two move you away from the camera and back toward it.<br>{do:up} once.",
      cue:"bUp",done:function(c){return c.d.up>=1;}},
     {say:"And {do:down} to come back.",
      cue:"bDown",done:function(c){return c.d.down>=1;}},
     {say:"There is no jump. A block one high is a <b>step</b> — walk straight into it.",
      cue:"bRight",done:function(c){return c.climb>=1;}}
   ]},
{name:"00 — First Fold",
   hint:"The gap is not crossable. The gap is not the point.",
   /* THE OWNER'S LEVEL, and it teaches the landing rule for free.

      The near slab ends at x=2 and the far bank stands at x=4, five wide and
      three deep, with a strip at x=3 lying well behind both of them. That
      strip is the whole level: it is nowhere near the gap in the world, and
      in the plane it is the bridge across it.

      What makes it worth more than the level it replaced: the far bank holds
      three blocks in one silhouette column, so standing back up puts you on
      the one at the FRONT - and the goal is the middle of the three. The
      player is not told the landing rule here, they watch it happen and take
      one more step. That is `00 — First Landing`'s lesson arriving as a
      consequence rather than as a card, which is why dropping that level
      costs less than it looks like it should. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[1,0,1],
     [2,0,-1],[2,0,0],[2,0,1],[4,0,1],[4,0,0],[4,0,-1],
     [3,0,-3],[3,0,-4],[3,0,-5]],
   start:[0,1,0],goal:[4,1,0],rotate:false,tutorial:true,
   tut:[
     {say:"Walk to the edge.",
      cue:"bRight",done:function(c){return c.d.right>=2;}},
     {say:"Too far to walk, and there is no jump.<br>{do:2d}: everything flattens along your line of sight, and depth stops existing.",
      cue:"bFlat",done:function(c){return c.flat>=1;}},
     {say:"Depth is gone, so that strip far behind you is simply next to you now. Walk across.",
      cue:"bRight",done:function(c){return c.m2>=2;}},
     {say:"{do:3d} to stand up.<br>Three blocks share that column, and you come back on the one at <b>the front</b> — nearest you. The green square is one step behind it.",
      cue:"bFlat",done:function(c){return c.unflat>=1;}}
   ]},
{name:"01 — On Your Own",
   hint:"The tutorial is over. Same fold, a little further.",
   /* THE FIRST LEVEL WITH NO COACH, and it is deliberately the tutorial's own
      shape one step longer: walk out, fold, cross, stand up, step up. Nothing
      new is asked - `solve()` says eight moves, no rotation, and NOT ONE of
      its nine standable squares is a place where folding kills you, which is
      what makes it the rest the opening did not have.

      It earns its place by being the level the peril pair is measured
      against: `02` adds two blocks at head height and nothing else, so a
      player who has just crossed this floor safely meets the same floor with
      a reason to look up. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[1,0,1],
     [2,0,-1],[2,0,0],[2,0,1],[3,0,-3],[3,0,-4],[3,0,-5],
     [4,0,-1],[4,0,0],[4,0,1],[5,0,-1],[5,0,0],[5,0,1],
     [4,1,-1],[4,1,0],[4,1,1]],
   start:[0,1,0],goal:[5,1,0],rotate:false},
{name:"02 — Beware of Walls",
   hint:"Walls can kill you if you go 2D into them.",
   /* THE FIRST LEVEL WHERE FOLDING CAN KILL YOU, and the first the red
      warning was ever built for. Two blocks at head height - [0,1,-1] and
      [2,1,-1] - put four of this floor's nine standable squares inside a
      silhouette column that is already occupied, INCLUDING THE START SQUARE.
      So the instinct the fold tutorial just taught is the one thing that
      kills you here, and foldPeril() says so before it does: the guilty
      block reddens and the GO 2D button pulses.

      Measured: 4 of 9 reachable squares are lethal to fold from, and the
      route is unchanged from the level before it - which is the point. Same
      puzzle, new thing to look at. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[1,0,1],
     [2,0,-1],[2,0,0],[2,0,1],[4,0,1],[4,0,0],[4,0,-1],
     [3,0,-3],[3,0,-4],[3,0,-5],[2,1,-1],[0,1,-1]],
   start:[0,1,0],goal:[4,1,0],rotate:false},
{name:"03 — A Real Challenge",
   hint:"If you get stuck you can take a hint.",
   /* The same lesson hardened, which is what a section does after teaching
      one gently. Six of eight squares are lethal now and the stack at x=2
      is two high, so the only safe square is one you have to STEP DOWN onto:
      the optimal opens `right, down, fold`, and a player who walks the
      straight line and folds dies. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[2,0,0],[2,0,1],
     [4,0,1],[4,0,0],[4,0,-1],[3,0,-3],[3,0,-4],[3,0,-5],
     [1,0,1],[2,0,-1],[2,1,-1],[2,2,-1],[0,1,-1],[1,1,1]],
   start:[0,1,0],goal:[4,1,0],rotate:false},
{name:"04 — The Illusion",
   hint:"Use the eye to see where you are going to land out of the 2D world.",
   /* THE PLANE IS NOT A TELEPORT, and this is where that is said. Every
      level so far has folded, crossed the whole gap and stood up on the far
      side; here the far bank runs the full depth of the board and the goal
      is on the near end of it, so the optimal comes back out of the plane
      one square early and walks the rest: `right right FLAT right POP right
      up`. The fold is a move you spend, not a ride you take. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[2,0,0],[2,0,1],
     [3,0,-3],[3,0,-4],[3,0,-5],[1,0,1],[2,0,-1],
     [4,0,-5],[4,0,-4],[4,0,-3],[4,0,1],[4,0,0],[4,0,-1]],
   start:[0,1,0],goal:[4,1,-4],rotate:false},
{name:"05 — The Block",
   hint:"Sometimes you need to think outside the block.",
   /* THE FIRST LEVEL THAT GOES BACKWARDS. Everything before it crosses left
      to right, so the hand learns one direction; here the goal sits on a
      shelf at y=2 that is reached by folding and then walking the OTHER way
      - `right right right FLAT left POP left up`. Two lessons in one shape:
      the plane has no preferred direction, and height is another axis the
      fold can hand you. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[2,0,0],[2,0,1],
     [1,0,1],[2,0,-1],[3,0,1],[3,0,0],[3,0,-1],
     [3,1,-1],[3,1,0],[3,1,1],[2,2,-3],[2,2,-4],[2,2,-5],
     [1,2,-5],[1,2,-4],[1,2,-3],[1,2,0],[1,2,1],[1,2,2]],
   start:[0,1,0],goal:[1,3,-4],rotate:false},
/* A trial sits in the middle of a section, not at the end of one: four or
   five levels that wait for you, and then one that does not. It carries no
   number for the same reason a boss doesn't - the campaign's numbering is
   the run of ordinary levels, and a landmark that renumbered everything
   after it would cost every saved star to insert (see LEVEL_RENAMES).

   Which is also why it could be moved here for free when the section grew.
   It used to sit after four levels; the four new gentle ones would have
   pushed it to ninth, so it came back to fifth, and no save noticed. */
{name:"06 — Limited",
   hint:"Combining things you learned.",
   /* THE PERIL LESSON AT ITS LIMIT, and it is the owner's level. Measured:
      8 of the 9 squares you can walk to are inside an occupied silhouette
      column, so `GO 2D` kills you on all but one of them - and the survivor
      is not on the floor. The tall stack at x=1 fills that column at every
      height the floor offers, so the only way out is to CLIMB the step at
      [0,1,-1] first and fold from on top of it.

      `02 — Step Down First` said the safe square can be below you; this one
      says it can be above. Same verb, opposite direction, and between them
      the player stops reading the floor as flat. Solvable in six with the
      turn locked out, which is what it ships with. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[1,0,1],
     [2,0,-1],[2,0,0],[2,0,1],[2,0,-6],[2,1,-6],[1,0,-6],[1,1,-6],
     [1,2,-6],[1,2,-3],[0,1,-1]],
   start:[0,1,0],goal:[1,3,-6],rotate:false},
{name:"TRIAL I — The Metronome",
   hint:"Three lives, three places to visit.",
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
   /* ROTATION LOCKED, because it sits before the level that reveals one.
      Checked leg by leg with the solver rather than assumed: 11, 9 and 8
      moves to the three cores with the turn taken away, so the clock is the
      only thing making it hard. */
   start:[0,1,0],goal:[7,1,4],rotate:false},
{name:"07 — The Rotation",
   hint:"A new mechanic \u2014 rotation. You came a long way, and the options are now endless (not really endless, but you have more options).",
   /* THE ROTATION REVEAL, and it is a proof rather than an instruction.
      `solve()` says this level is IMPOSSIBLE with rotation locked - checked
      both ways - so the player can fold and stand up as often as they like
      and get no closer. The far strip runs along x, not z, so the silhouette
      that would bridge it only exists from the other side.

      This is the first level in the game where the turn buttons are not
      greyed out, which is what makes their arrival mean something: they have
      been visible and dead for seven levels. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[2,0,0],[2,0,1],
     [1,0,1],[2,0,-1],[4,0,-2],[5,0,-2],[6,0,-2],
     [8,0,-3],[9,0,-3],[10,0,-3]],
   start:[0,1,0],goal:[9,1,-3],rotate:true,tutorial:true,tutFree:true,
   /* IT IS TAUGHT, AND THE LESSON IS A PROOF THE PLAYER PERFORMS.

      A card saying "this one needs the other axis" is a claim. Folding,
      standing up and finding the world exactly where you left it is a
      demonstration - so the first two steps ask for the fold and the pop
      that DO NOT WORK, and only then does the turn arrive. The player has
      spent eight levels learning that folding crosses gaps; this is the
      level where that stops being true, and being wrong on purpose once is
      what makes the turn land as an answer rather than as a new button.

      `free:true` on both, and it is the same hatch `00 — First Landing`
      used: tutGuide() replaces any step whose cue disagrees with the
      solver's next move, and the solver would never spend a fold here - it
      opens `up, rot+`. Without the flag these two steps are overridden on
      every frame and can never be shown.

      AND THAT IS WHY IT IS `tutorial:true`. The wasted fold and pop are two
      moves the solver does not count, so a player who does as they are told
      would be handed a worse star rating for it. A teaching level should not
      also mark you - the same reason the other two are unscored. */
   tut:[
     {say:"Something is over there. {do:2d} and see how far it gets you.",
      cue:"bFlat",free:true,done:function(c){return c.flat>=1;}},
     {say:"Nothing to cross to. The bridge you need does not exist along this axis.<br>{do:3d} to stand back up.",
      cue:"bFlat",free:true,done:function(c){return c.unflat>=1;}},
     /* THE REVEAL IS FREE TOO, and it has to be. Standing up out of the
        wasted fold puts the player on the block at the FRONT of their
        column, which is one square off the line the solver's own route
        starts from - so from here it wants a step before the turn, and
        without the flag it would overwrite the one sentence this level
        exists to say with "press up".

        And the lesson stops here rather than walking them home. Three steps
        is the whole argument - it does not work, it still does not work,
        turn - and tutGuide() hands the rest to the solver, which is what it
        does on any level once the steps run out. */
     {say:"So look down a different one. {do:turnr} — the world turns, and what lines up turns with it.",
      cue:"bRotR",free:true,done:function(c){return c.rot>=1;}}
   ]},
{name:"08 — No Bridge",
   hint:"Understand how the rotation we learned, combined with the eye, can help you solve this.",
   /* Rotation as a VERB rather than as a rescue. Three moves - turn, fold,
      stand up - and impossible without the turn, so the whole level is one
      sentence: the axis you collapse is a choice, and choosing it is the
      move. Paired with the level after it, which is its mirror. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[2,0,0],[2,0,1],
     [1,0,1],[2,0,-1],[4,0,-1],[4,0,0],[4,0,1]],
   start:[0,1,0],goal:[4,1,0],rotate:true},
{name:"09 — No Bridge 2",
   hint:"Understand how the rotation we learned, combined with the eye, can help you solve this.",
   /* The mirror of the level before it: the bank is at x=-2 rather than x=4,
      so the answer is `rot-` where the last one was `rot+`. Both are three
      moves and both are impossible without turning. Two levels that are the
      same sentence would be a bug; two that are the same sentence in opposite
      directions are a conjugation, and that is what makes the turn stop
      being a thing you found once. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[2,0,0],[2,0,1],
     [1,0,1],[2,0,-1],[-2,0,1],[-2,0,0],[-2,0,-1]],
   start:[0,1,0],goal:[-2,1,0],rotate:true},
{name:"10 — Simple Walk",
   hint:"No catch here, just a simple walk.",
   /* THE FIRST HALF OF A PAIR ABOUT SCORING, and it is deliberately trivial.
      Nothing here is a puzzle: the floor is open, the goal is three steps
      away, and walking is exactly optimal - `solve()` says three, and no
      fold shortens it. That is the control. What it establishes is that the
      player CAN hit par, so that when the next level looks identical and
      walking is suddenly one move too many, the difference is theirs to
      find rather than something the game did to them. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[1,0,1],
     [2,0,-1],[2,0,0],[2,0,1],[3,0,1],[3,0,0],[3,0,-1]],
   start:[0,1,0],goal:[3,1,0],rotate:true,stars:true},
{name:"11 — Not a Simple Walk",
   hint:"Try to solve this level with 3 stars.",
   /* AND THE TWIST: one column wider, so walking is four and par is three.
      `rot+ FLAT POP` crosses the whole board, because in the plane the near
      slab and the far edge are the same square - which means THE FOLD IS A
      SHORTCUT ON OPEN GROUND, not only a way over a gap. Eight levels have
      taught it as a bridge; this is where it becomes a saving.

      Walking scores 4 against a par of 3, which is two stars. That is the
      point of the pair and the reason the card goes up here: the level is
      beatable without noticing anything, and the star is the only thing that
      says you missed it. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[1,0,1],
     [2,0,-1],[2,0,0],[2,0,1],[3,0,1],[3,0,0],[3,0,-1],
     [4,0,1],[4,0,0],[4,0,-1]],
   start:[0,1,0],goal:[4,1,0],rotate:true,stars:true},
{name:"12 — The Silence Before the Storm",
   hint:"Combine what you learned to solve this. I believe in you.",
   /* THE SAME PUZZLE IN THE OWNER'S IDIOM. This level's route was already
      the one the section wants to end on - fold, cross, stand up, TURN, fold
      again - but it was drawn on single-block stepping stones, which is the
      generated style the rest of the opening replaced.

      Every platform is three deep now, the way the owner's are, and the
      solution is unchanged: `solve()` says the same nine moves in the same
      order, checked against the original. The two far blocks stay thin on
      purpose - they are the windows, and a window three deep is a doorway. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[1,0,1],[2,0,-1],[2,0,0],[2,0,1],
     [2,1,-5],[2,1,-4],[2,1,-3],[3,2,-6],[3,2,-5],[3,2,-4],
     [4,3,-6],[4,3,-5],[1,3,-5]],
   start:[0,1,0],goal:[1,4,-5],rotate:true},
{name:"BOSS I — Catch Me If You Can!",
   won:"Something in the plane has seen you. It will not be the only one.",
   hint:"A game of catch: whoever shifts the other into their own square first wins.",
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
       {at:[[8,1,5]],step:1100,aim:1300,
        say:"one of them, and nothing in the way"},
       {at:[[8,1,5]],step:980,aim:1150,say:"the ground comes up",
        add:[[2,1,1],[6,1,5],[6,1,1],[2,1,5],[4,1,3]]},
       {at:[[8,1,5],[7,1,3]],step:870,aim:1020,say:"same ground — two of them"}]},
   blocks:box(0,8,0,0,0,6,[]),
   start:[1,1,1]},
/* ROTATION IS NOT TAKEN BACK ONCE IT HAS BEEN GIVEN. This level used to
   carry rotate:false, six levels after 07 taught the turn - so the buttons
   vanished at the top of a new section and came back on the level after,
   which is indistinguishable from a bug and was reported as one. The lock
   bought nothing here either: measured, the level is 5 moves with rotation
   and 5 without. The pre-reveal run (the tutorials through TRIAL I) is
   contiguous and keeps its lock; nothing after 07 has one. */
{name:"13 — Fire Wall",
   hint:"Fire is solid. You will not walk through it.",
   /* FIRE AS A WALL, WHICH IS THE HALF OF IT A PLAYER MEETS FIRST. The whole
      middle column burns, so there are only three squares on this board you
      can walk to at all - and the stone pillar standing behind the fire is
      the way over: fold, and it is simply next to you. The fire never enters
      the route, which is the point of opening with it. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[2,0,1],[2,0,0],[2,0,-1],
     [1,0,-1,4],[1,0,0,4],[1,0,1,4],[1,0,-2],[1,1,-2]],
   start:[0,1,0],goal:[2,1,0],rotate:true},
{name:"14 — Not This Way",
   hint:"This way burns. Turn around and look again.",
   /* AND THE OTHER HALF: fire that is nowhere near you until you fold. Two
      blocks of it, one behind and one far down the axis, and between them
      they poison every silhouette this view offers - `solve()` says the level
      is IMPOSSIBLE without rotating, checked both ways. The answer to "the
      fire is in my column" is a different column. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[1,0,1],
     [2,0,1],[2,0,0],[2,0,-1],[-1,0,0,4],[3,0,-3,4],
     [4,0,-1],[4,0,0],[4,0,1]],
   start:[0,1,0],goal:[4,1,0],rotate:true},
{name:"15 — The Floor Is Lava",
   hint:"Almost nowhere here is safe to go 2D from.",
   /* THE OWNER'S TITLE AND THE OWNER'S LEVEL, and the measurement earns it:
      of the nine squares you can stand on, two crush you when you fold and
      six burn you, which leaves one. It is the fire section's answer to
      `06 — Limited` - the same "find the one square" pressure, made of the
      piece this section teaches rather than of walls. Impossible without
      rotating. */
   blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[1,0,1],
     [2,0,1],[2,0,0],[2,0,-1],[4,0,-1],[4,0,0],[4,0,1],
     [-1,0,-1,4],[-1,0,0,4],[-1,0,1,4],
     [0,0,-2,4],[1,0,-2,4],[2,0,-2,4],[1,1,0],[4,1,0]],
   start:[0,1,0],goal:[4,1,-1],rotate:true},
{name:"16 — Check Behind",
   hint:"Use the eye before you pick a side.",
   blocks:[[0,0,0],[3,3,-2,4],[-2,0,0],[-2,0,1],[-4,1,2],[-2,1,2],[-5,0,1,4]],
   start:[0,1,0],goal:[-4,2,2],rotate:true},
{name:"TRIAL II — Sharp Rhythm",
   hint:"Three lives, three places to visit. Turn before every crossing.",
   /* FASTER THAN THE TRIAL BEFORE IT AND FASTER THAN THE TWO AFTER, which
      inverts the campaign's ramp on purpose. Every crossing here is a fold
      taken from a particular side, so the player spends most of a leg
      standing still - turning and folding - rather than walking. Standing
      still is downtime, and downtime under a slow beat is a level waiting
      for you. The beat is what has to close that gap.

      PLAYED AT 1850 AND WOUND BACK TO 2050. Faster than the 2200 it was, and
      no longer the fastest thing in the campaign - these are players four
      levels into their second section, and a beat that punishes a turn you
      are still learning to plan is not tension, it is a wall. TRIAL I is
      2500, III and IV are 2100 and 2000; this now sits just inside them
      rather than well past. */
   trial:{period:2050,fire:310,
          /* Two depth slices and one across, so both fold axes are on the
             clock: while a z beat is live, folding in views 0 and 2 kills you
             wherever you stand, and the x beat says the same about 1 and 3.
             That matters more here than it did before, because every crossing
             in this arena IS a fold - see the geometry below. Each `at` sits
             on a row somebody actually stands in; a slice that threatens
             nobody is decoration. */
          beats:[{axis:"z",at:1},{axis:"x",at:8},{axis:"z",at:7}],
          cores:[[6,1,6],[0,1,2],[9,1,0]]},
   /* THREE ISLANDS, AND NOTHING JOINS ANY TWO OF THEM EXCEPT A FOLD DOWN THE
      RIGHT AXIS. That is the whole redesign: this level used to hand you two
      bridge blocks out at z=9, which closed the gap in the *x* silhouette, so
      all three legs walked across in the opening view and the turn buttons
      were never touched - measured with the solver, every leg solvable with
      rotation locked out.

      Now each pair of islands is offset in one axis only, which means they
      already share a silhouette column along the other one:

        A (x0..3, z0..2)  and  B (x6..9, z0..2)  share their z's
        B                 and  C (x6..9, z6..8)  share their x's

      So A to B is a fold along x - and rule 5 decides which of the two you
      come back on, so it is view 1 going out (the camera at +x lands you on
      the greatest x) and view 3 coming back. B to C is the same sentence one
      axis round: view 0 out, view 2 home. A and C share neither, so there is
      no fold that joins them and the middle island is not optional. All four
      views, each of them the only answer to the crossing it belongs to, and
      the solver says every leg is impossible with rotation locked out.

      THE FIRE IS ON THE LANDING LANE, which is what makes it a fire level
      rather than a level with fire on it. B's far edge burns at z=1, so the
      crossing from A cannot be taken on the middle lane - the one square the
      sweep at z=1 threatens on both islands at once - and the corner at
      (6,0,0) takes the short way round the wall. Verified load-bearing: the
      legs run 13+10+9 with it and 11+9+5 without. */
   blocks:(function(){var b=[];box(0,3,0,0,0,2,b);box(6,9,0,0,0,2,b);
     box(6,9,0,0,6,8,b);
     var burns={"6,0,0":1,"8,0,1":1,"9,0,1":1};
     for(var i=0;i<b.length;i++)
       if(burns[b[i].join(",")])b[i]=[b[i][0],b[i][1],b[i][2],4];
     return b;})(),
   start:[0,1,0],goal:[6,1,6],rotate:true},
{name:"17 — Two Threats",
   hint:"Two fires, four views, one that works.",
   blocks:[[0,0,0],[0,0,-3],[2,0,-3],[-1,3,6,4],[1,0,-5,4]],
   start:[0,1,0],goal:[2,1,-3],rotate:true},
{name:"18 — Narrow Safety",
   hint:"Only one square is safe. Find it before you go 2D.",
   blocks:[[0,0,0],[3,0,0],[4,0,1],[5,0,1],[6,0,1,4]],
   start:[0,1,0],goal:[5,1,1],rotate:true},
{name:"19 — Thread It",
   hint:"Two folds, and both of them bite.",
   blocks:[[0,0,0],[-2,0,-5],[-1,0,-5],[0,0,-5,4],[-1,1,1]],
   start:[0,1,0],goal:[-1,1,-5],rotate:true},
{name:"BOSS II — The Record",
   won:"You are on the list now. It is a short list.",
   hint:"A game of catch: whoever shifts the other into their own square first wins. Fire hides them, and it burns you.",
   /* Cover and spikes together in phase two, so the section's piece is part
      of "the arena finishes rising" rather than something smuggled in later.
      Phases three and four then change only the opponent - see BOSS I. */
   boss:{creepEvery:7500,
     phases:[
       {at:[[8,1,5]],step:900,aim:1060,say:"bare ground, for now"},
       {at:[[8,1,5]],step:810,aim:950,say:"cover for it, and the floor bites",
        add:[[3,1,1],[6,1,4],[5,1,2,4],[2,1,4],[7,1,2,4]]},
       {at:[[8,1,5],[7,1,6]],step:720,aim:850,say:"same ground — two of them"}]},
   blocks:box(0,9,0,0,0,6,[]),
   start:[1,1,1]},
{name:"20 — Clear Ground",
   hint:"Water holds you up, but leaves nothing in 2D.",
   blocks:[[0,0,0],[0,1,-1,1],[-1,2,-5],[-1,2,-3],[0,2,-3,1],[0,2,-4,1],[1,2,-4,1],[1,2,-5,1]],
   start:[0,1,0],goal:[1,3,-5],rotate:true},
{name:"21 — Nothing Underfoot",
   /* Second block moved from z=2 to z=7, for the reason Six Across was moved:
      one across and two back draws within a twentieth of a cell of one across
      and one *down*, so the first press of the level read as a step you could
      take and was a fall out of the world. Reported from play, and
      tools/legible.js had it flagged from the start square. Checked at
      z=2,3,5,6,7,9 - same route, same move count, same score. */
   hint:"A long walk in 2D, with a piece missing.",
   blocks:[[0,0,0],[-1,0,7],[-2,1,6],[-3,1,5],[-4,1,4],[-5,2,-4],[-6,3,-4],[-6,3,-2],[-6,3,-3,1],[-6,4,-4,1]],
   start:[0,1,0],goal:[-6,5,-4],rotate:true},
{name:"22 — Twice Transparent",
   hint:"What got you here will not be there in 2D.",
   blocks:[[0,0,0],[-1,0,2],[-1,0,3],[-1,1,2,1],[0,2,8],[0,2,11,1],[0,3,12,1]],
   start:[0,1,0],goal:[0,4,12],rotate:true},
{name:"23 — Look Through It",
   hint:"Turn first. Every side hides a different hole.",
   blocks:[[0,0,0],[-2,0,1],[-3,0,1],[-2,1,1,1],[-8,2,0],[-11,2,0,1]],
   start:[0,1,0],goal:[-11,3,0],rotate:true},
{name:"TRIAL III — The Depth Slice",
   hint:"Three lives, three places to visit. In 2D you cannot dodge.",
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
{name:"24 — Mostly Missing",
   hint:"Most of this never reaches 2D.",
   blocks:[[0,0,0],[0,0,-1,1],[3,0,-2],[-5,0,-3],[-3,0,-3],[-4,1,-3,1],[-8,2,-2],[-10,2,-1],[-9,2,-1,1]],
   start:[0,1,0],goal:[-9,3,-1],rotate:true},
{name:"25 — Down and Around",
   hint:"Go down before you turn. The amber waits either way.",
   blocks:[[0,0,0],[-3,1,-1],[-4,1,-1],[-3,1,0,1],[-2,1,0,1],[-1,1,-6],[0,1,-5],[0,1,-4]],
   start:[0,1,0],goal:[0,2,-4],rotate:true},
{name:"26 — Both Sides",
   hint:"A long walk on each side of the turn.",
   blocks:[[0,0,0],[-1,0,0,1],[-2,0,3],[-2,0,6],[-2,0,7],[-1,1,7,1],[3,2,8],[5,2,9],[2,3,10],[2,3,11],[-1,3,11]],
   start:[0,1,0],goal:[-1,4,11],rotate:true},
{name:"27 — Two Dangers",
   hint:"Water under your feet, fire in your way.",
   blocks:[[0,0,0],[3,1,0,1],[3,1,1],[3,1,-1],[4,1,-1,4],[5,3,-4,1]],
   start:[0,1,0],goal:[3,2,-1],rotate:true},
{name:"BOSS III — The Search",
   won:"They can only count what casts a shadow. This world is larger than their record of it.",
   hint:"A game of catch: whoever shifts the other into their own square first wins. Water hides nothing — fold right through it.",
   /* Stone and glass rise together in phase two, so the lesson of the arena -
      the pillars you can see through are the ones you can still attack from -
      is learned against one hunter and then tested against two on exactly
      the same board. */
   boss:{creepEvery:7000,
     phases:[
       {at:[[8,1,5]],step:800,aim:950,say:"clear glass, clear floor"},
       {at:[[8,1,5]],step:720,aim:860,say:"stone you cannot fold through, glass you can",
        add:[[3,1,2],[7,1,4],[6,1,1],[5,1,1,1],[2,1,5,1],[8,1,3,1]]},
       {at:[[8,1,5],[7,1,6]],step:640,aim:760,say:"same ground — two of them"}]},
   blocks:box(0,9,0,0,0,6,[]),
   start:[1,1,1]},
{name:"28 — Shove",
   hint:"Walk into the violet block and it moves.",
   blocks:[[-1,0,3],[-2,0,-1],[-1,0,-1],[0,0,-1],[0,0,0],[-1,1,-1,3]],
   start:[0,1,0],goal:[-1,1,3],rotate:true},
{name:"29 — Make a Bridge",
   hint:"Put it where you will need it, then go 2D.",
   blocks:[[-2,0,5],[-1,1,-2],[-1,1,-1],[-1,1,0],[0,0,0],[-1,2,-1,3]],
   start:[0,1,0],goal:[-2,1,5],rotate:true},
{name:"30 — Shove and Turn",
   hint:"The crate only helps from one of the four views.",
   blocks:[[-2,0,0],[-1,0,0],[0,0,0],[1,2,1],[-1,1,0,3],[1,2,-2,3]],
   start:[0,1,0],goal:[1,3,1],rotate:true},
{name:"31 — Shove It Clear",
   hint:"Move the block, or it will crush you in 2D.",
   blocks:[[0,0,0],[-3,0,1,4],[-2,0,1],[-1,1,-3],[-1,1,-2],[-1,1,-1],[-1,1,0],[4,0,6,4],[-1,2,-2,3]],
   start:[0,1,0],goal:[-2,1,1],rotate:true},
{name:"32 — There and Back",
   hint:"Go 2D, land, move it, go again.",
   blocks:[[4,2,1],[1,0,4],[2,0,4],[3,0,4],[0,0,0],[2,1,4,3]],
   start:[0,1,0],goal:[4,3,1],rotate:true},
{name:"TRIAL IV — Every Slice",
   hint:"Three lives, three places to visit. They come from every side.",
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
   hint:"The crate builds, the water takes away.",
   blocks:[[0,0,0],[1,2,-3,1],[3,2,-3],[4,0,-5],[4,0,-4],[4,0,-3],[1,1,1],[2,1,1,1],[4,1,-4,3]],
   start:[0,1,0],goal:[4,1,-4],rotate:true},
{name:"34 — Reshape",
   hint:"One shove between two folds changes everything.",
   blocks:[[5,1,-3],[-1,1,-4],[-1,1,-3],[-1,1,-2],[-1,1,-1],[0,0,0],[-1,2,-3,3]],
   start:[0,1,0],goal:[5,2,-3],rotate:true},
{name:"35 — All Three",
   hint:"All three pieces. Use the eye before you commit.",
   blocks:[[0,0,0],[4,1,2,1],[4,1,3],[4,1,5,1],[2,0,0],[2,0,1],[2,0,2,4],[2,1,1,3]],
   start:[0,1,0],goal:[4,2,3],rotate:true},
{name:"36 — Turn, Shove, Fold",
   hint:"Face the right way first, then shove.",
   blocks:[[0,0,0],[-3,0,-3,4],[-3,0,-2],[-3,0,-1],[-3,0,0,1],[5,1,-4],[-3,2,-4,1],[-3,1,-2,3]],
   start:[0,1,0],goal:[5,2,-4],rotate:true},
{name:"37 — Twice Pushed",
   hint:"It takes two shoves to get it home.",
   blocks:[[1,1,1],[1,1,2],[1,1,3],[1,1,4],[2,2,5],[0,0,0],[1,2,2,3],[1,3,2,3]],
   start:[0,1,0],goal:[2,3,5],rotate:true},
{name:"BOSS IV — The Census",
   won:"The count is closed, and you are not in it.",
   hint:"A game of catch: whoever shifts the other into their own square first wins. Shove a crate to change what they see.",
   /* The finale, so phase two brings the whole game at once - stone, spike,
      glass and the crates. The crates in particular can only ever arrive in
      one phase: rebuilding the crate list is what puts them on the board, and
      doing it a second time would snap any crate you had already shoved back
      to where it started. */
   boss:{creepEvery:6500,
     phases:[
       {at:[[9,1,6]],step:720,aim:850,say:"the widest floor in the game"},
       {at:[[9,1,6]],step:650,aim:760,say:"everything at once — and two crates to shove",
        add:[[3,1,2],[7,1,2],[5,1,5],[3,1,5,4],[8,1,3,1],[7,1,5,3],[5,1,2,3]]},
       {at:[[9,1,6],[8,1,7]],step:570,aim:660,say:"same ground — two of them"}]},
   blocks:box(0,10,0,0,0,7,[]),
   start:[1,1,1]},
/* THE OPENING RUN, AND WHY IT IS ALL NAIVE. 01, 02a, 02b, 02 and 04 run
   14, 12, 19, 21, 28 out of a tutorial that ends at 11 - every step inside
   the +10 the curve allows.

   What they have in common matters more than the scores. **Every column any
   of them ever pops in holds exactly one block**, so R.landings() is never
   asked to choose and GO 3D always puts the player back somewhere obvious.
   That is deliberate: the landing rule is revealed AFTER TRIAL I, and a
   revelation needs five levels of quietly assuming there is nothing to
   reveal. It is checked rather than assumed - walk each optimal path and
   count the candidates at every POP, and the first level where the number is
   ever 2 is `05 — Two Windows`, which is the first level after the reveal.

   `03 — The Near One` used to sit in this run and does not any more: it puts
   a decoy in the goal's column, so it PUNISHES the naive model at a point
   where the game has not yet corrected it. It now sits immediately after the
   reveal, where being caught by the decoy is the lesson landing rather than a
   trap. Its optimal path still pops on a single candidate; the decoy is what
   a wrong route finds.

   None of these uses a special block: fundamentals is stone only. */
{name:"78 — The Same Column",
   hint:"Both blocks share a column. Only one is the goal.",
   /* THE TEST, AND IT IS THE OWNER'S LEVEL, pasted out of the editor. It is
      the smallest possible check that the reveal landed: walk to the end of
      the platform, fold, and stand back up, and the naive route puts you on
      the block you were already standing on - because that one is at the
      front. The goal is the other block in the same column, two further back,
      and the only way onto it is to turn round first so that the far one
      becomes the near one.

      It is placed immediately after `00 — First Landing` for that reason.
      Before the reveal it would be a trap; after it, it is the one question
      the reveal was answering, asked once, with nothing else in the way. */
   blocks:[[0,0,0],[1,0,0],[2,0,0],[3,0,0],[3,0,-2]],
   start:[0,1,0],goal:[3,1,-2],rotate:true},
{name:"79 — Around the Fire",
   hint:"Fire kills underfoot. In 3D you just walk around.",
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
{name:"80 — Cast a Shadow",
   hint:"It was nowhere near you. Then you folded.",
   blocks:[[0,0,0],[0,2,1],[1,1,0],[1,1,1,4]],
   start:[0,1,0],goal:[0,3,1],rotate:true},
{name:"81 — One Bad Line",
   hint:"One fire ruins the whole line. Go 2D elsewhere.",
   blocks:[[0,0,0],[-4,1,1],[-3,0,1],[-2,0,1],[-1,0,1,4]],
   start:[0,1,0],goal:[-2,1,1],rotate:true},
{name:"65 — Scattered Steps",
   /* Six blocks at six unrelated depths. Flat, they are a staircase — which
      is the tutorial's lesson again, but with the answer no longer written
      on screen and with height in it, so the plane has to be *read* rather
      than walked. One fold, no turn: nothing here is a decision yet. */
   hint:"Six blocks, six depths, nothing to walk on.",
   blocks:[[0,0,0],[1,1,-8],[2,1,-3],[3,2,-9],[4,2,-6],[5,3,-4]],
   start:[0,1,0],goal:[5,4,-4],rotate:true},
{name:"66 — The Bridge Behind",
   hint:"The way across is behind you, not beside you.",
   /* THE NAIVE MODEL, ON PURPOSE. Every column in this level holds exactly
      one block, so R.landings() never has a choice to make and GO 3D always
      puts the player back somewhere obvious. That is the whole job: the
      landing rule is what `00 — First Landing` reveals AFTER the trial, and
      it only reads as a revelation if the player has spent four levels
      quietly assuming there was nothing to reveal. Checked, not assumed -
      tools/land.js walks the optimal path and reports how many candidates
      each POP had, and every one of these is 1. */
   blocks:[[0,0,0],[1,0,-3],[2,0,-3],[3,0,-3],[4,0,-6]],
   start:[0,1,0],goal:[4,1,-6],rotate:true},
{name:"67 — Turn, Then Cross",
   hint:"The bridge is there. Just not from this side.",
   /* The same lesson as 02a with a turn in front of it: the fold you are
      facing goes nowhere, and the one a quarter turn away crosses the whole
      level. Every column is one block deep here too, so the landing is still
      never a decision - that comes after the trial. */
   blocks:[[0,0,0],[6,0,-1],[6,0,-2],[6,0,-3],[3,0,-4]],
   start:[0,1,0],goal:[3,1,-4],rotate:true},
{name:"68 — Turn to see",
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
{name:"69 — Halfway Across",
   /* The first level where one fold is not enough, which is the idea every
      hard level in the game is built on. The plane is walled at the fourth
      column — two blocks stacked, so there is no step up — and the way past
      is to stand up, climb two in the volume, and flatten again from the new
      height, where the silhouette is a different shape.

      The wall is at a *different depth* from the climb, on purpose. Put the
      same blocks on the route and they block the volume too; put them near
      the camera and they only close the plane, which is exactly the
      distinction the level is teaching. */
   hint:"2D runs out. Stand up, climb, and go flat again.",
   blocks:[[0,0,0],[1,0,-9],[2,0,-6],[3,1,-1],[3,2,-1],
           [3,1,-6],[4,2,-6],[5,2,-9],[6,2,-4]],
   start:[0,1,0],goal:[6,3,-4],rotate:true},
{name:"70 — The Near One",
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
   hint:"Two blocks share that column. You land on the front one.",
   blocks:[[0,0,0],[1,0,-3],[2,0,-12],[3,0,-3],[4,0,-12],[5,0,-8],[6,0,-8],[6,0,-2]],
   start:[0,1,0],goal:[6,1,-8],rotate:true},
{name:"71 — The Long Way Round",
   /* The goal block sits three clear cells from the ledge you reach it from,
      not one. At one cell the two blocks read as a stride you could take -
      you cannot, a gap is a gap and you fall - so the level's last move
      looked like a walk that inexplicably failed rather than like a fold you
      had to find. Verified against the solver: the route, the move count and
      the score are all identical at every spacing, so this is legibility
      bought for nothing. */
   hint:"The first landing is not the end. It is the view.",
   blocks:[[0,0,0],[0,1,1],[-3,2,0],[-3,2,-1],[-2,2,-1],[-2,3,-2],[-1,4,-2],[3,4,-2]],
   start:[0,1,0],goal:[3,5,-2],rotate:true},
{name:"72 — About Face",
   hint:"One of the four views works. It is not a near one.",
   blocks:[[0,0,0],[0,1,1],[-1,2,-3],[-1,2,-6],[-3,2,-6]],
   start:[0,1,0],goal:[-3,3,-6],rotate:true},
{name:"73 — The Last Step",
   hint:"You arrive in 2D, but you finish in 3D.",
   blocks:[[0,0,0],[-4,0,1],[-2,0,1],[-2,1,2],[-7,2,1],[4,2,0],[5,2,0]],
   start:[0,1,0],goal:[4,3,0],rotate:true},
{name:"74 — Six Across",
   /* The second block used to sit at z=2, one across and two back from the
      start - and two back is very nearly one *down* on screen (see
      tools/legible.js for the arithmetic). So it drew where a block you could
      step down onto would draw, and the first press of the game was a fall
      out of the world. At z=6 it joins the far group and reads as far.
      Checked at z=2,4,5,6,7,8: same route, same move count, same score, so
      the level is untouched and only the lie is gone. */
   hint:"A long walk on almost nothing.",
   blocks:[[0,0,0],[1,0,6],[2,1,6],[3,1,5],[4,1,4],[5,2,-4],[6,3,-4],[6,3,-2],[3,3,-2]],
   start:[0,1,0],goal:[3,4,-2],rotate:true},
{name:"75 — Fold After Climbing",
   hint:"Height first. The way only opens from up there.",
   blocks:[[0,0,0],[0,0,-1],[0,1,-2],[-2,2,-1],[1,2,-1],[1,3,0],[0,4,-6],[0,4,-5]],
   start:[0,1,0],goal:[0,5,-5],rotate:true},
{name:"76 — Far Side",
   hint:"The second fold is the long one. Commit to it.",
   blocks:[[0,0,0],[-1,1,0],[-1,2,-1],[-6,2,-2],[-8,2,-2],[-7,2,-5],[-8,3,1],[-9,4,2],[-10,4,-5],[-10,4,-4]],
   start:[0,1,0],goal:[-10,5,-4],rotate:true},
{name:"77 — Three Folds",
   hint:"Three folds. Each one throws something away.",
   blocks:[[0,0,0],[-1,1,3],[-1,1,4],[-2,2,4],[-2,3,3],[-2,4,2],[2,4,3],[0,4,3],[0,4,0]],
   start:[0,1,0],goal:[0,5,0],rotate:true},
{name:"38 — Up and Over",
   hint:"Three folds and two shoves. The crate travels.",
   blocks:[[3,0,1],[0,0,3],[1,0,3],[2,0,3],[3,0,3],[1,2,-5],[3,2,-5],[0,0,0],[2,1,3,3]],
   start:[0,1,0],goal:[1,3,-5],rotate:true},
{name:"39 — Down and Through",
   hint:"Go down, shove, then fold from both sides.",
   blocks:[[0,0,0],[-3,3,1],[-3,3,2,1],[-3,3,4],[1,1,0],[1,1,1],[1,1,2,1],[0,3,3,4],[1,2,1,3]],
   start:[0,1,0],goal:[-3,4,4],rotate:true},
{name:"40 — Reach Across",
   hint:"The crate goes one way and you go the other.",
   blocks:[[0,0,0],[1,2,6],[2,2,6],[3,1,1],[3,1,2],[3,1,3],[0,2,1,1],[0,2,2,4],[3,2,2,3]],
   start:[0,1,0],goal:[1,3,6],rotate:true},
{name:"41 — Three Folds, Three Threats",
   hint:"Three folds, and something waiting in each.",
   blocks:[[0,0,0],[1,2,1],[0,3,-3],[1,3,-3,1],[4,3,-2],[4,3,-1],[4,3,0,4],[4,3,1],[0,1,1,1],[4,4,-1,3]],
   start:[0,1,0],goal:[4,4,1],rotate:true},
{name:"42 — All You Know",
   hint:"Every piece, one level. Take your time.",
   blocks:[[0,0,0],[-5,2,-2],[-4,2,-2,1],[-3,2,-2],[2,3,2],[5,1,-1,4],[-2,3,0],[-1,3,0],[-5,1,1],[-5,1,2],[-5,1,3],[-5,2,2,3]],
   start:[0,1,0],goal:[-1,4,0],rotate:true},
{name:"43 — The Middle One",
   hint:"Turning reaches the ends. Only amber reaches the middle.",
   blocks:[[0,0,0],[0,0,6,2],[0,0,9],[3,0,5]],
   start:[0,1,0],goal:[3,1,5],rotate:true},
{name:"44 — Claimed",
   hint:"Amber catches you on the way past.",
   blocks:[[0,0,0],[0,0,3],[0,0,6,2],[0,0,8],[0,0,11],[4,0,9],[9,0,9,2],[12,0,9],[9,0,7]],
   start:[0,1,0],goal:[9,1,7],rotate:true},
{name:"45 — Walk First",
   hint:"Where you fold from decides where you land.",
   blocks:[[0,0,0],[1,0,0],[1,0,5,2],[1,0,8],[1,0,13],[6,0,6],[5,0,6],[4,0,6]],
   start:[0,1,0],goal:[6,1,6],rotate:true},
{name:"46 — Two Middles",
   hint:"Two columns, and the answer is inside both.",
   blocks:[[0,0,0],[0,0,6,2],[0,0,11],[0,0,17],[2,0,7,2],[7,0,7],[2,0,8]],
   start:[0,1,0],goal:[2,1,8],rotate:true},
{name:"47 — Past the Landing",
   hint:"You arrive, and there is still somewhere to go.",
   blocks:[[0,0,0],[0,0,4,2],[0,0,10],[2,0,5,2],[5,0,5],[2,0,4]],
   start:[0,1,0],goal:[2,1,4],rotate:true},
{name:"48 — Deeper In",
   hint:"A longer walk in 2D before the amber.",
   blocks:[[0,0,0],[1,0,0],[1,0,4],[1,0,9,2],[1,0,12],[1,0,17],[4,0,8,2],[9,0,8],[4,0,7]],
   start:[0,1,0],goal:[4,1,7],rotate:true},
{name:"49 — Both Inside",
   hint:"Both columns, both middles, one route.",
   blocks:[[0,0,0],[1,0,0],[2,0,0],[2,0,2,2],[2,0,6],[2,0,12],[7,0,3,2],[11,0,3],[7,0,4]],
   start:[0,1,0],goal:[7,1,4],rotate:true},
{name:"50 — Held Fast",
   hint:"Shove it onto the amber and it never moves again.",
   blocks:[[0,0,0],[1,0,-4],[2,0,-4],[3,0,-4,2],[4,0,-4],[2,2,-2],[2,1,-4,3]],
   start:[0,1,0],goal:[2,3,-2],rotate:true},
{name:"51 — One Chance",
   hint:"You only get to place it once.",
   blocks:[[0,0,0],[2,3,6,2],[2,3,7],[1,1,-6],[2,1,-6],[3,1,-6,2],[2,2,-6,3]],
   start:[0,1,0],goal:[2,4,7],rotate:true},
{name:"52 — Set in Amber",
   hint:"Water under you, a crate pinned in front of you.",
   blocks:[[0,0,0],[1,3,4],[1,2,2],[-5,1,1],[-5,1,2],[-5,1,3,2],[-5,1,4],[-5,2,2,3]],
   start:[0,1,0],goal:[1,4,4],rotate:true},
{name:"53 — Pin It Down",
   hint:"Fold, land, pin it, and fold again from the same spot.",
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
   hint:"Three folds, and the crate must be fixed first.",
   blocks:[[0,0,0],[-3,2,-5,2],[-2,2,-5],[-1,2,-5],[4,0,-6],[4,0,-5],[4,0,-4,2],[-1,0,-6],[4,1,-5,3]],
   start:[0,1,0],goal:[-1,3,-5],rotate:true},
{name:"57 — Turn Twice More",
   hint:"Every view matters, and only one suits the crate.",
   blocks:[[0,0,0],[-5,2,2],[0,2,-2],[2,2,-2],[-1,0,1],[-1,0,2],[-1,0,3,2],[-1,0,4,2],[-1,1,2,3]],
   start:[0,1,0],goal:[2,3,-2],rotate:true},
{name:"58 — The Last Placement",
   hint:"Everything amber can do, all at once.",
   blocks:[[0,0,0],[-5,0,-2],[-4,0,-2],[-3,0,-2,2],[0,0,4],[1,0,4],[2,0,4],[3,0,4,2],[4,2,-3],[1,1,4,3]],
   start:[0,1,0],goal:[-5,1,-2],rotate:true},
{name:"59 — Long Water",
   hint:"Water to stand on, amber to land on, one turn.",
   blocks:[[0,0,0],[-1,0,-4],[-2,0,-4],[-3,0,4],[-3,0,-2],[-3,0,-1,1],[-4,1,-1,1],[-8,2,-2],[-9,2,-2]],
   start:[0,1,0],goal:[-9,3,-2],rotate:true},
{name:"60 — No Floor",
   hint:"What carried you across was never really there.",
   blocks:[[0,0,0],[-1,0,0],[-2,1,5],[-2,1,-3],[-2,1,-4,1],[-1,2,-4,1],[-3,2,-5],[2,2,-6],[-7,2,-6],[-3,3,-5]],
   start:[0,1,0],goal:[-7,3,-6],rotate:true},
{name:"61 — Twice Up",
   hint:"Climb, fold, climb, and fold back the other way.",
   blocks:[[0,0,0],[1,0,0,1],[2,0,3],[2,0,6],[2,0,7],[3,1,7,1],[4,2,11],[5,2,13],[6,3,10],[7,3,10],[7,3,7]],
   start:[0,1,0],goal:[7,4,7],rotate:true},
{name:"62 — The Far Shore",
   hint:"The longest crossing in the game, with a hole in it.",
   blocks:[[0,0,0],[-1,0,0],[-2,1,5],[-2,1,-3],[-1,1,-3,1],[-1,2,-2,1],[-3,2,-1],[2,2,0],[-7,2,0],[-3,3,-1]],
   start:[0,1,0],goal:[-7,3,0],rotate:true},
{name:"63 — Three Folds Deep",
   hint:"Three folds, and something see-through in each.",
   blocks:[[0,0,0],[1,0,2],[1,0,-5],[5,1,-4],[2,1,-4,1],[3,2,-4,1],[-2,3,-5],[8,3,-6],[-2,3,-7],[5,4,-8],[0,4,-9],[-2,4,-9,1]],
   start:[0,1,0],goal:[-2,5,-9],rotate:true},
{name:"64 — Everything at Once",
   hint:"Three folds, three anchors, water throughout. Good luck.",
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
  {at:0, name:"PROLOGUE", sub:"the basics, one at a time", col:"#7183a6",
   story:"Nothing has noticed you yet.",
   theme:{sky:[0x141a2e,0x0a0e1a], block:0x5a6d94, ink:0x14172a,
          air:{col:0x8fa4cc, n:14, rise:.06, drift:.05, size:.10}}},
  {at:2, name:"I · FUNDAMENTALS", sub:"go 2D, cross the gap, come back", col:"#35c2a5",
   story:"Every fold is a visit. The plane keeps count.",
   /* NATURE, and the element the section wears. Olive rather than a true
      green, which is the same don't-camouflage rule one level up: the goal
      is a saturated teal-green wireframe and it appears in EVERY section,
      so no section may sit on its hue.

      LEAVES rather than spores. The field falls now instead of rising, it
      tumbles as it goes, and it crosses on the same wind the treeline leans
      to - one number moving three things is what makes air read as air
      rather than as three separate animations. */
   theme:{sky:[0x1d3a58,0x0e1c2e], block:0xbdbdbd, surface:"grass",
          scene:"trees", ink:0x16241a, amb:"birds",
          stars:{n:46, col:0xdfe9ff, seed:19},
          air:{col:0xcfe08e, n:18, rise:-.10, drift:.16, size:.085,
               kind:"leaf"}}},
  {at:16, name:"II · FIRE", sub:"fire is solid, and it burns you", col:"#e0455f",
   story:"Some of what is down there did not survive being flattened.",
   /* HELL, and it is DARK hell rather than bright. This section teaches
      fire, and a glowing orange world swallows a fire block whole - that was
      rendered and it is the exact failure the desaturation rule exists to
      catch. So the ground is near-black basalt with molten veins in it, the
      sky is a deep ember glow low down, and the brightest thing standing
      anywhere on it is still the piece the section is about. */
   theme:{sky:[0x1a0a10,0x3a0f0a], block:0xc8c8c8, surface:"basalt",
          scene:"hell", flare:17000, ink:0x24100e, amb:"fire",
          air:{col:0xff9a4a, n:24, rise:.20, drift:.07, size:.07}}},
  {at:25, name:"III · WATER", sub:"stand on water — it leaves nothing in 2D", col:"#7fb2ff",
   story:"Water casts nothing, so the plane holds no record of it.",
   /* THE SEA, AT SUNSET, and the sunset is not decoration. This section
      teaches water, and a blue world swallows a cyan water block whole -
      which is the exact failure the desaturation rule exists to catch. So
      the water is in the HORIZON, where it can be an ocean with boats and a
      shore on it, and the sky over it stays warm, where it makes cyan sing.
      Both readings satisfied by putting each one where it belongs.

      Spray rather than embers: the field is fine, pale and slow now, lifted
      off the sea rather than thrown up out of a fire. */
   theme:{sky:[0x2a1e3c,0x6b3a2c], block:0x8a6152, scene:"ocean",
          ink:0x101e28, amb:"sea",
          air:{col:0xdff0f6, n:20, rise:.14, drift:.12, size:.06}}},
  /* SAND, and it moved off violet for two reasons at once. Violet is what a
     CRATE is drawn in, so the section that teaches crates was theming itself
     in the colour of the piece it exists to show - the camouflage rule,
     broken in the one place it matters most. And violet is the boss's, in
     every section, which made this the closest any section came to a
     reserved colour. Sand fixes both: a crate's violet is now the most
     saturated thing on a warm neutral ground.

     Kept pale and low in chroma so it does not collide with the trial's
     amber either - that one is a saturated #e0a03c, and this is a washed
     tan two steps away from it. The node shapes are what tell those apart
     anyway; the colour only has to not confuse them. */
  {at:35, name:"IV · CRATES", sub:"shove a block and the 2D world changes", col:"#d9bd83",
   story:"You can edit what they see. That is the one thing they cannot do.",
   /* THE DESERT AT NOON. Grains blowing sideways rather than rising, which
      is both what sand does and what this section is about - pushing things
      along a row. The sky is the one in the game that is bright rather than
      deep, because heat is the whole read. */
   theme:{sky:[0x3d3a52,0x7a5c33], block:0x9a8a68, scene:"desert",
          ink:0x2a2114, amb:"wind",
          air:{col:0xf0dcae, n:26, rise:.02, drift:.34, size:.055}}},
  {at:47, name:"V · EXTRA", sub:"the long ones, for when you want more", col:"#3fc4d4", locked:true,
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

  /* The shelf and the middle sections retitled in the owner's voice; see
     the note above. Composed, not rewritten: any key that already pointed
     at one of these has been re-pointed above, and these carry the name
     that was live until today. */
  "24 — Invisible Architecture":"24 — Mostly Missing",
  "26 — Long Division":"26 — Both Sides",
  "35 — Confluence":"35 — All Three",
  "79 — Sharp":"79 — Around the Fire",
  "81 — Poisoned Column":"81 — One Bad Line",
  "42 — The Whole Language":"42 — All You Know",
  "59 — Long Glass":"59 — Long Water",
  "60 — Absent Floor":"60 — No Floor",
  /* A new opening level pushed Section I along by one, and three of the
     owner's fire levels took the front of Section II. Every name here has
     been live on the published link. Applied as ONE pass rather than in
     sequence: 01 -> 02 followed by 02 -> 03 composes into 01 -> 03, which
     is the chain the invariant below exists to forbid. */
  "01 — Beware of Walls":"02 — Beware of Walls",
  "02 — A Real Challenge":"03 — A Real Challenge",
  "03 — The Illusion":"04 — The Illusion",
  "04 — The Block":"05 — The Block",
  "05 — Limited":"06 — Limited",
  "06 — The Rotation":"07 — The Rotation",
  "07 — No Bridge":"08 — No Bridge",
  "08 — No Bridge 2":"09 — No Bridge 2",
  "09 — Simple Walk":"10 — Simple Walk",
  "10 — Not a Simple Walk":"11 — Not a Simple Walk",
  "11 — The Silence Before the Storm":"12 — The Silence Before the Storm",
  "13 — Sharp":"79 — Around the Fire",
  "14 — Cast a Shadow":"80 — Cast a Shadow",
  "15 — Poisoned Column":"81 — One Bad Line",
  /* Section I was retitled in the owner's own words - shorter, plainer,
     and speaking to the player rather than about the mechanic. Every one
     of these has been live on the published link, so they migrate. */
  "01 — Not Every Square":"02 — Beware of Walls",
  "02 — Step Down First":"03 — A Real Challenge",
  "03 — Come Back Early":"04 — The Illusion",
  "04 — The Way Back":"05 — The Block",
  "05 — One Safe Square":"06 — Limited",
  "06 — No Way From Here":"07 — The Rotation",
  "07 — Turn One Way":"08 — No Bridge",
  "08 — Turn the Other":"09 — No Bridge 2",
  "09 — Four Across":"10 — Simple Walk",
  "10 — Five Across":"11 — Not a Simple Walk",
  "11 — Two Windows":"12 — The Silence Before the Storm",
  "BOSS I — The Sighting":"BOSS I — Catch Me If You Can!",
  /* A rest level went in before the trial and a scoring pair before the
     boss, so the run after each of them shifted by one. These four have
     been live on the published link, so they migrate rather than simply
     change: composed as always, values re-pointed in the same pass. */
  "05 — No Way From Here":"07 — The Rotation",
  "06 — Turn One Way":"08 — No Bridge",
  "07 — Turn the Other":"09 — No Bridge 2",
  "08 — The Same Column":"78 — The Same Column",
  "09 — Two Windows":"12 — The Silence Before the Storm",
  "11 — Far Side":"76 — Far Side",
  "12 — Three Folds":"77 — Three Folds",
  /* THE OPENING WAS RE-CUT AROUND THE OWNER'S OWN LEVELS, and the run
     that used to be 01..10 moved to the shelf to make room for them. The
     numbers had to move with it - two levels called `01` in one game is a
     map with two nodes reading 01 - so these thirteen are renumbered into
     the 65..77 the shelf had free. Composed, not regenerated: every value
     above that pointed at one of these old names has been re-pointed at
     its new one in the same pass, and no key was touched. */
  "01 — Scattered Steps":"65 — Scattered Steps",
  "02a — The Bridge Behind":"66 — The Bridge Behind",
  "02b — Turn, Then Cross":"67 — Turn, Then Cross",
  "02 — Turn to see":"68 — Turn to see",
  "04 — Halfway Across":"69 — Halfway Across",
  "02c — The Same Column":"78 — The Same Column",
  "03 — The Near One":"70 — The Near One",
  "05 — Two Windows":"12 — The Silence Before the Storm",
  "06 — The Long Way Round":"71 — The Long Way Round",
  "07 — About Face":"72 — About Face",
  "08 — The Last Step":"73 — The Last Step",
  "09 — Six Across":"74 — Six Across",
  "10 — Fold After Climbing":"75 — Fold After Climbing",
 /* THE CENSUS RENAMED ALL FOUR BOSSES. Composed, not rewritten: the three
    keys that used to land on "BOSS I — The Hunt" are re-pointed at its new
    name in the same edit that makes "The Hunt" itself a key, which is what
    keeps the no-value-is-also-a-key invariant true. Bosses II-IV had never
    been renamed, so they arrive as one new entry each. */
 "BOSS I — The Sentinel": "BOSS I — Catch Me If You Can!",
 "BOSS I — The Pack": "BOSS I — Catch Me If You Can!",
 "BOSS I — The Twin": "BOSS I — Catch Me If You Can!",
 "BOSS I — The Hunt": "BOSS I — Catch Me If You Can!",
 "BOSS II — Sharp Ground": "BOSS II — The Record",
 "BOSS III — Through Glass": "BOSS III — The Search",
 "BOSS IV — The Orthogon": "BOSS IV — The Census",
 "02 — Turn to see": "68 — Turn to see",
 "03 — Two Windows": "12 — The Silence Before the Storm",
 "04 — The Long Way Round": "71 — The Long Way Round",
 "05 — About Face": "72 — About Face",
 "06 — The Last Step": "73 — The Last Step",
 "07 — Six Across": "74 — Six Across",
 "08 — Fold After Climbing": "75 — Fold After Climbing",
 "09 — Far Side": "76 — Far Side",
 "10 — Three Folds": "77 — Three Folds",
 "18 — Sharp": "79 — Around the Fire",
 "19 — Cast a Shadow": "80 — Cast a Shadow",
 "20 — Poisoned Column": "81 — One Bad Line",
 "22 — Check Behind": "16 — Check Behind",
 "23 — Two Threats": "17 — Two Threats",
 "24 — Narrow Safety": "18 — Narrow Safety",
 "41 — Thread It": "19 — Thread It",
 "11 — Clear Ground": "20 — Clear Ground",
 "12 — Nothing Underfoot": "21 — Nothing Underfoot",
 "13 — Twice Transparent": "22 — Twice Transparent",
 "14 — Look Through It": "23 — Look Through It",
 "15 — Invisible Architecture": "24 — Mostly Missing",
 "16 — Down and Around": "25 — Down and Around",
 "17 — Long Division": "26 — Both Sides",
 "21 — Two Dangers": "27 — Two Dangers",
 "39 — Confluence": "35 — All Three",
 "40 — Turn, Shove, Fold": "36 — Turn, Shove, Fold",
 "42 — Twice Pushed": "37 — Twice Pushed",
 "45 — Up and Over": "38 — Up and Over",
 "43 — Down and Through": "39 — Down and Through",
 "44 — Reach Across": "40 — Reach Across",
 "57 — Three Folds, Three Threats": "41 — Three Folds, Three Threats",
 "60 — The Whole Language": "42 — All You Know",
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
 "55 — Long Glass": "59 — Long Water",
 "53 — Absent Floor": "60 — No Floor",
 "54 — Twice Up": "61 — Twice Up",
 "56 — The Far Shore": "62 — The Far Shore",
 "61 — Three Folds Deep": "63 — Three Folds Deep",
 "62 — Everything at Once": "64 — Everything at Once",
 "11 — Sharp": "79 — Around the Fire",
 "12 — Cast a Shadow": "80 — Cast a Shadow",
 "13 — Poisoned Column": "81 — One Bad Line",
 "14 — Check Behind": "16 — Check Behind",
 "15 — Two Threats": "17 — Two Threats",
 "16 — Narrow Safety": "18 — Narrow Safety",
 "17 — Thread It": "19 — Thread It",
 "18 — Clear Ground": "20 — Clear Ground",
 "19 — Nothing Underfoot": "21 — Nothing Underfoot",
 "20 — Twice Transparent": "22 — Twice Transparent",
 "21 — Look Through It": "23 — Look Through It",
 "22 — Invisible Architecture": "24 — Mostly Missing",
 "23 — Down and Around": "25 — Down and Around",
 "24 — Long Division": "26 — Both Sides",
 "25 — Two Dangers": "27 — Two Dangers",
 "26 — Shove": "28 — Shove",
 "27 — Make a Bridge": "29 — Make a Bridge",
 "28 — Shove and Turn": "30 — Shove and Turn",
 "29 — Shove It Clear": "31 — Shove It Clear",
 "30 — There and Back": "32 — There and Back",
 "31 — Push Through Nothing": "33 — Push Through Nothing",
 "32 — Reshape": "34 — Reshape",
 "33 — Confluence": "35 — All Three",
 "34 — Turn, Shove, Fold": "36 — Turn, Shove, Fold",
 "35 — Twice Pushed": "37 — Twice Pushed",
 "36 — Up and Over": "38 — Up and Over",
 "37 — Down and Through": "39 — Down and Through",
 "38 — Reach Across": "40 — Reach Across",
 "39 — Three Folds, Three Threats": "41 — Three Folds, Three Threats",
 "40 — The Whole Language": "42 — All You Know",
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
 "57 — Long Glass": "59 — Long Water",
 "58 — Absent Floor": "60 — No Floor",
 "59 — Twice Up": "61 — Twice Up",
 "60 — The Far Shore": "62 — The Far Shore",
 "04 — Two Windows": "12 — The Silence Before the Storm",
 "05 — The Long Way Round": "71 — The Long Way Round",
 "06 — About Face": "72 — About Face",
 "09 — The Last Step": "73 — The Last Step",
 "10 — Far Side": "76 — Far Side",
 "11 — Three Folds": "77 — Three Folds",
 "12 — Clear Ground": "20 — Clear Ground",
 "13 — Nothing Underfoot": "21 — Nothing Underfoot",
 "14 — Twice Transparent": "22 — Twice Transparent",
 "15 — Look Through It": "23 — Look Through It",
 "16 — Invisible Architecture": "24 — Mostly Missing",
 "58 — Down and Around": "25 — Down and Around",
 "59 — Long Division": "26 — Both Sides",
 "17 — Sharp": "79 — Around the Fire",
 "18 — Cast a Shadow": "80 — Cast a Shadow",
 "19 — Poisoned Column": "81 — One Bad Line",
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
 "41 — Confluence": "35 — All Three",
 "42 — Turn, Shove, Fold": "36 — Turn, Shove, Fold",
 "23 — Thread It": "19 — Thread It",
 "29 — Twice Pushed": "37 — Twice Pushed",
 "30 — Up and Over": "38 — Up and Over",
 "60 — Twice Up": "61 — Twice Up",
 "61 — The Far Shore": "62 — The Far Shore",
 "45 — Three Folds, Three Threats": "41 — Three Folds, Three Threats",
 "46 — The Whole Language": "42 — All You Know",
 "62 — Three Folds Deep": "63 — Three Folds Deep",
 "63 — Everything at Once": "64 — Everything at Once",
 "01 — Turn to see": "68 — Turn to see",
 "02 — Two Windows": "12 — The Silence Before the Storm",
 "03 — The Long Way Round": "71 — The Long Way Round",
 "04 — About Face": "72 — About Face",
 "05 — The Last Step": "73 — The Last Step",
 "06 — Six Across": "74 — Six Across",
 "07 — Fold After Climbing": "75 — Fold After Climbing",
 "08 — Far Side": "76 — Far Side",
 "09 — Three Folds": "77 — Three Folds",
 "10 — Sharp": "79 — Around the Fire",
 "11 — Cast a Shadow": "80 — Cast a Shadow",
 "12 — Poisoned Column": "81 — One Bad Line",
 "13 — Check Behind": "16 — Check Behind",
 "14 — Two Threats": "17 — Two Threats",
 "15 — Narrow Safety": "18 — Narrow Safety",
 "16 — Thread It": "19 — Thread It",
 "17 — Clear Ground": "20 — Clear Ground",
 "18 — Nothing Underfoot": "21 — Nothing Underfoot",
 "19 — Twice Transparent": "22 — Twice Transparent",
 "20 — Look Through It": "23 — Look Through It",
 "21 — Invisible Architecture": "24 — Mostly Missing",
 "22 — Down and Around": "25 — Down and Around",
 "23 — Long Division": "26 — Both Sides",
 "24 — Two Dangers": "27 — Two Dangers",
 "25 — Shove": "28 — Shove",
 "26 — Make a Bridge": "29 — Make a Bridge",
 "27 — Shove and Turn": "30 — Shove and Turn",
 "28 — Shove It Clear": "31 — Shove It Clear",
 "29 — There and Back": "32 — There and Back",
 "30 — Push Through Nothing": "33 — Push Through Nothing",
 "31 — Reshape": "34 — Reshape",
 "32 — Confluence": "35 — All Three",
 "33 — Turn, Shove, Fold": "36 — Turn, Shove, Fold",
 "34 — Twice Pushed": "37 — Twice Pushed",
 "35 — Up and Over": "38 — Up and Over",
 "36 — Down and Through": "39 — Down and Through",
 "37 — Reach Across": "40 — Reach Across",
 "38 — Three Folds, Three Threats": "41 — Three Folds, Three Threats",
 "39 — The Whole Language": "42 — All You Know",
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
 "56 — Long Glass": "59 — Long Water",
 "57 — Absent Floor": "60 — No Floor",
 "58 — Twice Up": "61 — Twice Up",
 "59 — The Far Shore": "62 — The Far Shore",
 "60 — Three Folds Deep": "63 — Three Folds Deep",
 "61 — Everything at Once": "64 — Everything at Once",
 "04 — Turn to see": "68 — Turn to see",
 "05 — Halfway Across": "69 — Halfway Across",
 "06 — Two Windows": "12 — The Silence Before the Storm",
 "07 — The Long Way Round": "71 — The Long Way Round",
 "08 — About Face": "72 — About Face",
 "10 — Six Across": "74 — Six Across",
 "11 — Fold After Climbing": "75 — Fold After Climbing",
 "12 — Far Side": "76 — Far Side",
 "13 — Three Folds": "77 — Three Folds",
 "14 — Sharp": "79 — Around the Fire",
 "15 — Cast a Shadow": "80 — Cast a Shadow",
 "16 — Poisoned Column": "81 — One Bad Line",
 "17 — Check Behind": "16 — Check Behind",
 "18 — Two Threats": "17 — Two Threats",
 "19 — Narrow Safety": "18 — Narrow Safety",
 "20 — Thread It": "19 — Thread It",
 "21 — Clear Ground": "20 — Clear Ground",
 "22 — Nothing Underfoot": "21 — Nothing Underfoot",
 "23 — Twice Transparent": "22 — Twice Transparent",
 "24 — Look Through It": "23 — Look Through It",
 "25 — Invisible Architecture": "24 — Mostly Missing",
 "26 — Down and Around": "25 — Down and Around",
 "27 — Long Division": "26 — Both Sides",
 "28 — Two Dangers": "27 — Two Dangers",
 "29 — Shove": "28 — Shove",
 "30 — Make a Bridge": "29 — Make a Bridge",
 "31 — Shove and Turn": "30 — Shove and Turn",
 "32 — Shove It Clear": "31 — Shove It Clear",
 "33 — There and Back": "32 — There and Back",
 "34 — Push Through Nothing": "33 — Push Through Nothing",
 "35 — Reshape": "34 — Reshape",
 "36 — Confluence": "35 — All Three",
 "37 — Turn, Shove, Fold": "36 — Turn, Shove, Fold",
 "38 — Twice Pushed": "37 — Twice Pushed",
 "39 — Up and Over": "38 — Up and Over",
 "40 — Down and Through": "39 — Down and Through",
 "41 — Reach Across": "40 — Reach Across",
 "42 — Three Folds, Three Threats": "41 — Three Folds, Three Threats",
 "43 — The Whole Language": "42 — All You Know",
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
 "60 — Long Glass": "59 — Long Water",
 "61 — Absent Floor": "60 — No Floor",
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
 "03 — Turn to see": "68 — Turn to see",
 "02 — The Near One": "70 — The Near One"
};
