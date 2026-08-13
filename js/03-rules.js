"use strict";
/* Orthogonal — 03-rules.js
   Movement, block kinds, and the solid/silhouette/landing lookups.
   Loaded as a classic script: everything here shares one global scope,
   in the order listed in index.html. */

/* ============================================================
   RULES  (shared by the game and the solver)
   ============================================================ */

// Given a column and a current height, where does the mover end up?
// occ(y) reports whether that column is solid at height y.
// Returns the new height, or null if the move is impossible.
var FELL=-9999;   // fell out of the world - not the same as being blocked
function resolveStep(occ,y,occHere){
  if(!occ(y) && occ(y-1)) return y;              // walk level
  // Stepping up needs clearance above where you're standing as well as
  // where you're going — otherwise you slide diagonally past a ceiling.
  if(occ(y) && !occ(y+1) && !(occHere&&occHere(y+1))) return y+1;
  if(!occ(y) && !occ(y-1)){                      // nothing underfoot: fall
    var n=y;
    while(n>-12 && !occ(n-1)) n--;
    return n<=-11?FELL:n;
  }
  return null;                                   // wall
}

// Block kinds. 0 stone, 1 glass, 2 anchor, 3 crate.
//   stone  - solid, and it casts into the plane
//   glass  - solid, casts nothing: ground in the volume, a hole in the plane
//   anchor - amber holds whatever arrives on it. It claims you when you unfold,
//            overriding the nearest-camera rule, and it holds a crate fast:
//            once a crate rests on an anchor it can never be shoved again, so
//            parking one is a decision you cannot take back.
//   crate  - solid and casts, but you can shove it, so the plane's shape is
//            something you can change. This is the only piece that gives the
//            game state: the world is different after you touch it.
function isGlass(b){return b[3]===1;}
function isAnchor(b){return b[3]===2;}
function isCrate(b){return b[3]===3;}
// Spikes are solid and they cast like stone — but standing on one kills you.
// Which means a spike buried deep in the world poisons the whole silhouette
// column it lands in. Ground that looks safe in the volume can be lethal once
// you fold, and you have to check what's behind before you commit.
function isSpike(b){return b[3]===4;}

// Crates live outside the static geometry because they move. Everything that
// asks about the world takes the current crate positions as an argument, so a
// level with no crates behaves exactly as it did before they existed.
function crateKeys(level){
  var out=[];
  for(var i=0;i<level.blocks.length;i++)
    if(isCrate(level.blocks[i])){
      var b=level.blocks[i];out.push(K(b[0],b[1],b[2]));
    }
  return out.sort();
}
function crateSet(list){var s=new Set();for(var i=0;i<list.length;i++)s.add(list[i]);return s;}
function parseK(k){var p=k.split(",");return [+p[0],+p[1],+p[2]];}

/* ============================================================
   BOSSES — the pack, and the fold as the weapon

   A boss is several hunters. They walk the volume toward you on a real
   clock, they are fast, and touching you costs a life. There is no gun, no
   window, and nothing to wait for.

   You kill one by folding the world while you share its silhouette column.
   Depth is thrown away, the two of you land in the same square of the plane,
   and it is the one that does not come back.

   The same line is its attack. A hunter that gets onto your row or column
   plants, the line lights up, and at the end of that beat it comes straight
   down it - the whole distance at once, because distance is the thing this
   game does not respect. So being lined up is not an opportunity you wait
   for, it is a knife-edge you are already standing on: fold and it dies,
   hesitate and it arrives. Whoever acts first wins the line.

   And which axis you collapse decides *which* line you can win. A hunter
   locked onto your row is only in your silhouette column when you are facing
   along that row - so the answer to "it is charging me" is often a rotation
   first, which costs you the beat you had. That is the fight: the game's one
   question, asked while something is running at you.

   The pillars are not your weapon - they are their cover. Rule 4 is
   unchanged and still applies to you: if a block already fills your square
   in the plane, folding kills you. So a hunter standing in a column that
   holds a pillar is a hunter you cannot fold on, and the fight is about
   catching them on clean lines. In the volume a pillar is something to hide
   behind; in the plane it is the same thing, which is a pleasing amount of
   sense for one piece of geometry to make.

   An earlier version of this design crushed them against the pillars
   instead - fold, and anything standing in any filled column dies. It is a
   prettier rule and it does not work: a pillar's shadow is a whole line
   across the arena, so every approach has to cross one, and a player who
   never moves collects them as they come. bosssim won all four arenas
   standing in a corner. Making the kill require *your* column is what puts
   the player back in the fight, because the one thing they cannot harvest
   from a corner is alignment they did not go and get.

   THIS IS THE FIFTH DESIGN. The first four are worth keeping, because each
   failed for a reason that looks obvious only afterwards:

     1. Turn-based, walk to a marker. Provably fair - solve() could prune hit
        states - but it did not feel like a fight.
     2. Real-time, walk to a marker. Better pressure, still an objective
        wearing a boss costume. (It is now the trial, where it belongs.)
     3. Crush it on a static line. A real attack, but the vulnerability was a
        property of the *floor*, so the fight became manipulating the floor:
        stand still, wait, fold. Making it avoid the lines only taught it to
        freeze, which reads as broken, and produced a new two-button loop.
     4. A gun, and an OPEN beat after each shot. Fair, machine-checkable, and
        it read as a duel with a machine that spent most of the fight walking
        into position. The opening was something you waited for rather than
        something you made, and one opponent shuffling for an angle is not a
        thing that can be fast.

   The lesson from 3, and the reason this is not a rerun of it: a
   vulnerability that does not come out of the boss's own behaviour is a
   condition to farm. Here it is the same event as its attack. There is no
   opening to wait for, because the opening is the moment of maximum danger,
   and you cannot decline it - declining is what being hit is.

   The intermediate design is recorded in bossNext(): before the lunge
   existed, hunters tried to *avoid* your column and the fight had a hole a
   simulator drove straight through. Killing something took one turn and one
   fold, arrivals were free kills because anything adjacent shares a line
   with you, and every arena fell in under five seconds. Making the line
   dangerous to stand on is what turned an execution into a duel.
   ============================================================ */
/* ------------------------------------------------------------
   THE TWIN — one creature, two bodies, and a point of symmetry

   A different fight sharing the same machinery. The two halves are one
   animal: each hunts the *reflection* of you through a centre, so whatever
   one of them does the other does backwards, and the gap between them is a
   number you change by walking. They are lethal on contact like any hunter
   and cannot be hurt by anything you do to them directly.

   You kill it by folding while the two halves share a silhouette column.
   Depth goes, they land in the same square of the plane, and a creature that
   was only ever pretending to be two collapses into itself. That is rule 4
   again, pointed at something new: the halves are solid in the plane, so the
   identical fold kills *you* if you are the one sharing a column with one of
   them — which is why the line you want them on is the line you must not be
   standing on.

   Because they mirror, they share a column exactly when one of them stands
   on the centre's row or column — whichever the current view collapses. So
   the cross drawn on the floor is the whole fight: bait a half onto the arm
   that your axis flattens, step off it yourself, fold. And each core moves
   the centre somewhere new, so the answer is never twice in the same place.
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   PHASES — the fight's own difficulty curve

   A boss is a sequence of phases, not one pack. Clearing what is on the board
   advances to the next, and each one changes the fight rather than repeating
   it: one slow hunter in a bare arena, then pillars rising out of the floor
   so rule 4 starts biting, then a hunter that hunts the lines you cannot
   answer, then two of them at once.

   The reason is a diagnosis rather than a taste. Every dial this fight used
   to expose - step, aim, hunter count, creep - moves *execution* difficulty:
   how fast you must act once you already know what to do. But the verb set
   is three slow buttons and there is no dexterity ceiling to climb, so a
   faster clock does not make the player better, it just shortens the window
   for a decision that takes as long as it takes. Phases move the other axis:
   how hard it is to work out what to do at all, which is the axis a puzzle
   game is actually good at. And they make failure legible - you know which
   phase beat you - which is most of what makes a fight feel fair.

   Each phase carries its own `at` (spawns), `step`, `aim`, an optional `add`
   of blocks that rise when it begins, and an optional `cunning` flag. A boss
   written the old way, with a bare `at`, becomes a single phase, so nothing
   downstream needs to know both shapes. */
function bossPhases(b){
  var raw=b.phases||[{at:b.at,step:b.step,aim:b.aim}];
  return raw.map(function(p){
    var at=(p.at&&p.at.length&&p.at[0].length)?p.at:[p.at];
    return {at:at,
            add:p.add||[],
            say:p.say||"",              // what the banner says when it begins
            step:p.step||b.step||620,   // ms between hunter steps
            aim:p.aim||b.aim||700,      // ms it plants on your line before it charges
            cunning:!!p.cunning,
            /* How many times a cunning hunter refuses a line you could fold
               on before it takes it anyway. The same patience valve the twin
               uses, and it is here for the same reason: an opponent that will
               not attack from anywhere you can punish is design 3's freeze in
               a new costume. It declines while declining is cheap. */
            hold:p.hold===undefined?2:p.hold};
  });
}
/* Every block standing in the arena once phase `i` has begun: what the level
   was authored with, plus everything that has risen since. For the checkers
   and the simulator, which get pristine level data; the game applies each
   phase's blocks as it reaches them. */
function bossBlocksAt(level,i){
  var out=level.blocks.slice();
  if(!level.boss||level.boss.twin)return out;
  var ps=bossPhases(level.boss);
  for(var p=0;p<=i&&p<ps.length;p++)
    for(var j=0;j<ps[p].add.length;j++)out.push(ps[p].add[j]);
  return out;
}
function makeBoss(level){
  if(!level.boss)return null;
  var b=level.boss;
  if(b.twin){
    // Each core is a centre and one half's spawn; the other half is that
    // spawn reflected, so the pair starts mirrored by construction.
    var pairs=b.cores.map(function(c){
      return {c:c.c,a:c.a,
              b:[2*c.c[0]-c.a[0], c.a[1], 2*c.c[2]-c.a[2]]};
    });
    return {
      twin:true, pairs:pairs, hp:pairs.length,
      at:[pairs[0].a,pairs[0].b],
      /* How many steps a half will spend refusing to cross its own kill line
         before it comes through anyway. This is the tuning dial for the whole
         fight: lower and the openings come often enough to feel cheap,
         higher and you spend the fight waiting for one. */
      hold:b.hold===undefined?2:b.hold,
      step:b.step||480, aim:0,
      rage:b.rage||.88, creep:b.creep||.95,
      creepEvery:b.creepEvery||6500, floorStep:b.floorStep||240,
      grace:b.grace||1100
    };
  }
  var ps=bossPhases(b);
  return {
    phases:ps,
    hp:ps.length,             // the phases are the health bar
    at:ps[0].at,              // the opening spawns, for anything that only wants those
    /* Two escalations, both there to stop the fight becoming a kite. `rage`
       is what the survivors of a fold get for surviving it, so a fold that
       kills nothing costs you; `creep` is the slow tightening that happens
       anyway, so waiting is never free. `floorStep` keeps it human. */
    rage:b.rage||.86,
    creep:b.creep||.96,       // applied every creepEvery ms
    creepEvery:b.creepEvery||7000,
    floorStep:b.floorStep||250,
    grace:b.grace||1100       // ms of grace after a hunter reaches you
  };
}
/* One hunter's step: onto your row or column, not merely toward you.

   Closing is worth something, but getting onto a line is worth much more,
   because a line is the only place it can attack from. Purely closing made
   it shuffle diagonally for six seconds looking for an angle, which reads as
   a wander rather than a hunt; scoring alignment above distance makes it
   stride into line and plant, which is legible as intent.

   It does not avoid anything. An earlier version of this fight had it dodge
   the squares where your fold could reach it, and that was a mistake twice
   over - it froze against a player standing where every approach was
   covered, and it could not attack at all from anywhere it was willing to
   stand. Now the square it wants and the square that can kill it are the
   same square, which is the entire design in one sentence.

   How hard it dodges is the whole character of the fight, and both obvious
   answers are wrong. bosssim found each of them in one run:

     - a shadow worth seven against a distance worth one, and a hunter will
       circle forever rather than cross a line. Against a player standing
       where every approach is shadowed, both sides simply stop. That is
       design 3's "making it avoid the lines only taught it to freeze",
       rediscovered in a new costume: three lives intact, no kills, nobody
       within reach of anybody.
     - a shadow as a mere tie-break, and it walks into one on its way to a
       player who never moved. The idle policy won every arena without
       taking a step, which is the farmable condition this design exists to
       avoid.

   What works is patience. It dodges properly - a shadow is worth more than
   ground - but it counts the steps it spends failing to get closer than it
   has already been, and after two of them it stops caring and comes straight
   at you. So circling is a phase it passes through rather than a state it
   can rest in, and a hunter you have sealed in arrives anyway, half a second
   late and angry.

   Measuring against its *best* distance rather than its last one is what
   makes that true. Counting steps that did not close lets a hunter oscillate
   forever between one square that closes and one that does not, resetting
   the counter every other step - which is exactly what it did, in a
   two-square loop five squares from a player who never moved.

   Patience resets when you move, because the target changed and the route it
   was refusing may no longer be the route. That has a consequence worth
   keeping: a player who keeps moving faces hunters that keep dodging, and a
   player who stands still gets rushed. The incentive points the right way.

   `doomed` is supplied by the caller because it depends on the live crates
   and on the other hunters, neither of which belongs in here. `from.wait`
   is the patience counter, carried on the hunter itself. */
function bossNext(R,from,to,cr,lineTo,avoid){
  var dirs=[[1,0],[-1,0],[0,1],[0,-1]], best=null;
  var here=Math.abs(from.x-to.x)+Math.abs(from.z-to.z);
  /* `avoid` inverts the whole thing, for the twin: there, a line is where it
     dies rather than where it attacks from, so it skirts one while skirting
     is free and comes through anyway once it has spent two steps failing to
     get closer than it has already been. Measuring patience against its
     *best* distance rather than its last is what stops it oscillating
     forever between one square that closes and one that does not. */
  var pat=0;
  if(avoid){
    var gk=to.x+","+to.y+","+to.z;
    if(from.goalKey!==gk){from.goalKey=gk;from.best=here;from.wait=0;}
    pat=(from.wait||0)>=(from.hold===undefined?2:from.hold)?0:9;
  }
  for(var i=0;i<4;i++){
    var nx=from.x+dirs[i][0], nz=from.z+dirs[i][1];
    var ny=resolveStep(
      (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(nx,nz), from.y,
      (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(from.x,from.z));
    if(ny===null||ny===FELL)continue;
    if(R.deadly3(nx,ny,nz))continue;
    var d=Math.abs(nx-to.x)+Math.abs(nz-to.z);
    /* `lineTo` answers in three grades, not two: 0 no line, 1 a line, 2 a
       line the player cannot fold on from where they are standing. A cunning
       hunter prefers grade 2 - the line whose answer is a rotation you have
       to spend a beat on - and an ordinary one returns a plain boolean, which
       is grade 1, so its scoring is bit for bit what it always was.

       Only the *ordering* of 56 over 40 matters. Neighbours differ in
       distance by at most two, so any margin above that makes a safe line win
       whenever one is adjacent; it is not a distance the hunter will cross an
       arena to collect, and it must not be, or preferring a line becomes
       hunting for one and we are back to circling. */
    var lg=lineTo?(lineTo({x:nx,y:ny,z:nz})||0):0;
    var lined=lg?1:0;
    var score=(avoid?-lined*pat:(lg===2?56:lined*40))-d-(d>here?(avoid?3:6):0);
    if(!best||score>best.score)best={x:nx,y:ny,z:nz,score:score,d:d};
  }
  if(avoid&&best){
    if(best.d<(from.best===undefined?here:from.best)){from.best=best.d;from.wait=0;}
    else from.wait=(from.wait||0)+1;
  }
  return best;
}
/* The line: same row or same column, nothing solid in between. Blocks stop a
   charge exactly as they stop you, so a pillar is cover in the volume - and
   because sharing a silhouette column is the same relation seen from the
   collapsing axis, the same pillar is the thing that kills you if you fold
   from that column. One piece of geometry, both jobs, opposite signs. */
function bossLine(R,from,to,cr){
  var dx=0,dz=0;
  if(from.z===to.z&&from.x!==to.x)dx=Math.sign(to.x-from.x);
  else if(from.x===to.x&&from.z!==to.z)dz=Math.sign(to.z-from.z);
  else return null;
  for(var x=from.x+dx,z=from.z+dz;;x+=dx,z+=dz){
    if(x===to.x&&z===to.z)return {dx:dx,dz:dz};
    if(R.solid(x,from.y,z,cr))return null;
    if(Math.abs(x-from.x)>40||Math.abs(z-from.z)>40)return null;
  }
}
/* Would folding along view `v` crush whatever is standing here? Asked about
   the player by foldPeril(), and about a hunter by the fight - one question,
   one answer, so the two can never drift apart. */
function crushedBy(R,v,x,y,z,cr){
  return R.siloSolid(v,R.uOf(v,x,z),y,cr);
}
/* And the attack: is this hunter in the square you would land in? Same
   height, same silhouette column, and nothing of the world's own in that
   column - because a column with a pillar in it kills you first, which is
   what makes a pillar cover rather than a weapon. */
function foldKills(R,v,p,h,cr){
  return h.y===p.y&&R.uOf(v,h.x,h.z)===R.uOf(v,p.x,p.z)&&
         !crushedBy(R,v,p.x,p.y,p.z,cr);
}
// The boss's own sweeps are gone: the projectile is its ranged attack now.
// Kept as a no-op so any boss data still carrying `beats` loads without
// special-casing. Sweeps themselves live on, in the trials below.
function bossSafety(level){return {ok:true};}

/* ============================================================
   TRIALS — a clock, and somewhere to be

   A trial is the boss stripped back to the one thing the boss was always
   best at. There is no opponent: the arena attacks. A lethal plane sweeps
   one slice of the world, charging in plain sight for most of a beat and
   going live for the last `fire` milliseconds, and the level is an ordinary
   level otherwise - reach the goal, in the volume, as rule 6 has always said.
   The goal is drawn amber rather than green to say that out loud: this one
   is on a clock.

   This is the second boss design, brought back where it belongs. As a boss
   it failed for a reason worth keeping in view: an objective wearing a boss
   costume is not a fight. But that is only an argument about what a *boss*
   is. As a change of pace in the middle of a section - after four or five
   turn-based puzzles, one that will not wait for you - it is exactly what it
   should have been all along, and it costs nothing that the fight needed.

   The reason a plane is the right attack, and the reason a trial is about
   the fold rather than about reflexes: a sweep down the axis you are
   *looking along* cannot be dodged in the plane at all. Flattened you are
   the projection of every depth at once, so you stand in every slice of that
   axis simultaneously. The same sweep is one step to dodge in the volume,
   and rotating the camera re-labels which sweeps are survivable. So the
   question is the one the whole game asks - which axis, and is this the
   moment - only now it is asked with a metronome running.
   ============================================================ */
function makeTrial(level){
  if(!level.trial)return null;
  var t=level.trial;
  var beats=t.beats, period=t.period||2300, fire=t.fire||320;
  return {
    /* Three targets in sequence, not one. A trial where the first arrival
       ends it is over before its second beat, and the clock never gets to be
       the level - you cross once, on the rhythm you happened to arrive on.
       Three crossings is what makes it a rhythm you have to learn: the first
       teaches the beat, the second is a return trip you now have to time,
       and the third is under a clock that has been running long enough to
       have sped you up. `level.goal` is cores[0] so the solver, the picker
       and the renderer all still have one square to talk about. */
    cores:t.cores||null,
    beats:beats, period:period, fire:fire,
    cycle:period*beats.length,
    // which slice is charging right now, how far through its beat it is, and
    // whether it is lethal this instant
    beatAt:function(ms){return beats[Math.floor(ms/period)%beats.length];},
    beatNo:function(ms){return Math.floor(ms/period);},
    phase:function(ms){return (ms%period)/period;},
    live:function(ms){return (ms%period)>=period-fire;},
    /* Does sweep `sw` catch someone at this position?
       In the volume, a,c are x,z. In the plane, a is u and c is ignored -
       there is no depth left to be at. */
    hits:function(sw,v,mode,a,y,c){
      if(!sw)return false;
      if(sw.axis==="y")return y===sw.at;
      if(mode==="3")return (sw.axis==="x"?a:c)===sw.at;
      var comp=sw.axis==="x"?AX[v].r[0]:AX[v].r[2];
      if(comp===0)return true;          // the view axis: nowhere is safe
      return a===sw.at*comp;            // u = x*r0 + z*r2, so on-axis u = at*comp
    }
  };
}
/* The fairness property, and the reason `solve()` is still allowed to have an
   opinion about a trial.

   BFS proves the geometry is solvable; it cannot say anything about a clock
   that advances while you think. What stands in for a proof is this: for
   every square you can stand on and every beat the arena has, either that
   square is safe or a square one step away is. The arena never corners you -
   there is always somewhere to be. It is weaker than "a clean run exists",
   because it says nothing about dodging and making progress at the same
   time, but it rules out the failure that actually matters, which is dying
   with no move that would have saved you.

   It also checks the square you respawn on against the beat you respawn
   into, because the clock restarts at zero after a hit and being dropped
   back into a slice that is already charging is not a mistake you made.

   Deliberately a check on the volume only. The plane is where a sweep down
   the view axis is unsurvivable, and that is the mechanic, not a bug: it is
   the reason folding is a decision here rather than a free verb. */
function trialSafety(level){
  var T=makeTrial(level); if(!T)return {ok:true};
  var R=makeRules(level), cr=crateSet(crateKeys(level));
  var stand=[], seen={};
  for(var i=0;i<level.blocks.length;i++){
    var bl=level.blocks[i], x=bl[0], y=bl[1]+1, z=bl[2];
    if(R.solid(x,y,z,cr))continue;
    if(R.deadly3(x,y,z))continue;                    // a spike: not standable
    var k=K(x,y,z); if(seen[k])continue; seen[k]=1;
    stand.push([x,y,z]);
  }
  var bad=[];
  for(var bi=0;bi<T.beats.length;bi++){
    var sw=T.beats[bi];
    for(var si=0;si<stand.length;si++){
      var c=stand[si];
      if(!T.hits(sw,0,"3",c[0],c[1],c[2]))continue;  // already safe here
      var out=false, nb=[[1,0],[-1,0],[0,1],[0,-1]];
      for(var ni=0;ni<nb.length&&!out;ni++){
        var nx=c[0]+nb[ni][0], nz=c[2]+nb[ni][1];
        var ny=resolveStep(
          (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(nx,nz), c[1],
          (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(c[0],c[2]));
        if(ny===null||ny===FELL)continue;
        if(R.deadly3(nx,ny,nz))continue;
        if(!T.hits(sw,0,"3",nx,ny,nz))out=true;
      }
      if(!out)bad.push({cell:c,beat:sw});
    }
  }
  var s=level.start, born=T.hits(T.beats[0],0,"3",s[0],s[1],s[2]);
  return {ok:!bad.length&&!born,trapped:bad,born:born};
}

/* Every cell you could ever stand on, walking out from the start. Shared by
   the arena checks, because "can it reach you" and "how much of the floor is
   lethal" are both questions about this set and nothing else. */
function arenaStand(lv,R,cr){
  var stand=new Set(), q=[lv.start.slice()];
  stand.add(K(lv.start[0],lv.start[1],lv.start[2]));
  while(q.length){
    var p=q.shift(), d=[[1,0],[-1,0],[0,1],[0,-1]];
    for(var i=0;i<4;i++){
      var nx=p[0]+d[i][0], nz=p[2]+d[i][1];
      var ny=resolveStep(
        (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(nx,nz), p[1],
        (function(a,b){return function(h){return R.solid(a,h,b,cr);};})(p[0],p[2]));
      if(ny===null||ny===FELL)continue;
      if(R.deadly3(nx,ny,nz))continue;
      var k=K(nx,ny,nz);
      if(stand.has(k))continue;
      stand.add(k);q.push([nx,ny,nz]);
    }
  }
  return stand;
}
/* Counted per view: how much of the floor you cannot attack from, because
   folding there kills you first. Glass is deliberately absent from the count
   - it casts nothing, so a glass pillar is one you can fold straight through,
   which is the whole joke of "Through Glass". */
function arenaFractions(lv,R,cr,stand){
  var worst=1, best=0, cells=[...stand].map(parseK);
  for(var v=0;v<4;v++){
    var n=0;
    for(var c=0;c<cells.length;c++)
      if(crushedBy(R,v,cells[c][0],cells[c][1],cells[c][2],cr))n++;
    var frac=n/cells.length;
    worst=Math.min(worst,frac);best=Math.max(best,frac);
  }
  return {worst:worst,best:best};
}
function arenaLethal(lv,R){
  var cr=crateSet(crateKeys(lv));
  var f=arenaFractions(lv,R,cr,arenaStand(lv,R,cr));
  return (f.worst*100).toFixed(0)+"-"+(f.best*100).toFixed(0)+"%";
}
/* One phase's board, judged on its own. `requireLethal` is off for every
   phase but the last: an opening phase with a bare floor has no lethal
   columns by design, and that is the point of it. */
function arenaFail(lv,spawns,requireLethal){
  var R=makeRules(lv), cr=crateSet(crateKeys(lv)), fail=[];
  var stand=arenaStand(lv,R,cr);
  for(var h=0;h<spawns.length;h++){
    var a=spawns[h];
    if(R.solid(a[0],a[1],a[2],cr))
      fail.push("hunter "+h+" is spawned inside a block");
    else if(!stand.has(K(a[0],a[1],a[2])))
      fail.push("hunter "+h+" cannot reach you: its ground is not yours");
    /* And none of them may spawn near the start square. Every kill returns
       the player there and so does every life lost, so the start is not a
       place they pass through once - it is the place they keep reappearing,
       and a spawn beside it is a hit nobody could have read, handed out on a
       schedule. This was found the moment the send-home rule went in: every
       second spawn in the game had been placed two or three squares from the
       corner, which was harmless while the player could hold ground and a
       standing gift the instant they could not. */
    else if(Math.abs(a[0]-lv.start[0])+Math.abs(a[2]-lv.start[2])<5)
      fail.push("hunter "+h+" spawns on top of the start square - "+
                "the player is returned there after every kill");
    /* And no two of them may spawn sharing a silhouette column, in any view.
       They are thrown back to their spawns every time one reaches you, so a
       pair that shares a column there is a pair that crushes itself for free
       the next time anybody folds - a standing gift, renewed on every hit.
       The simulator found this by winning a fight without moving. */
    for(var h2=h+1;h2<spawns.length;h2++){
      var a2=spawns[h2];
      if(a[1]!==a2[1])continue;
      if(a[0]===a2[0]||a[2]===a2[2])
        fail.push("hunters "+h+" and "+h2+" spawn in one column - a free kill");
    }
  }
  var f=arenaFractions(lv,R,cr,stand);
  if(requireLethal&&f.worst<.12)
    fail.push("view with almost nothing in it: "+(f.worst*100).toFixed(0)+
              "% - every line is free");
  if(f.best>.62)
    fail.push((f.best*100).toFixed(0)+
              "% of the floor cannot be folded from in one view - nowhere to fight");
  return fail;
}
/* Is this arena a stage a fight can happen on?

   Run by tools/verify.js on every arena. Three things have to be true, and
   each of them has rejected a real one:

     - every hunter can reach you. A pack walks, so an arena split by a chasm
       is a pack that can never arrive. (This is also what caught two arenas
       with a hunter spawned inside a pillar.)
     - there are lethal columns to fight over, in every view. Fold-crushing
       is the only attack, so an arena with nothing standing proud of the
       floor is an arena where the boss cannot be killed at all.
     - and not so many that the floor is mostly a killing field, because then
       neither side has to be manoeuvred anywhere.

   Every phase is a different board, so every phase is checked as one - the
   pillars that rise for phase two can seal a spawn off or hand the pack a
   free kill exactly as an authored pillar can. The one check that is *not*
   applied per phase is the lower bound on lethal columns: an opening phase
   with a bare floor has none by design, because that phase's job is to teach
   the line and every fold in it should work. What has to be true is that the
   fight ends somewhere with columns worth fighting over, so the floor is
   asked for that once the arena is fully up.
   ============================================================ */
function bossArena(level){
  var B=makeBoss(level); if(!B)return {ok:true};
  var fail=[];
  if(!B.twin){
    /* Each phase in turn, on its own board. `last` is the finished arena and
       the only one asked to have anywhere to fight from. */
    var last=B.phases.length-1;
    for(var pi=0;pi<B.phases.length;pi++){
      var lvP={start:level.start,blocks:bossBlocksAt(level,pi)};
      var f=arenaFail(lvP,B.phases[pi].at,pi===last);
      for(var fi=0;fi<f.length;fi++)fail.push("phase "+(pi+1)+": "+f[fi]);
      /* A block may not rise onto a cell something is standing on when the
         phase begins. The game lifts the player out rather than burying them,
         which is the right runtime answer, but a spawn buried by its own
         phase is an authoring mistake and not something to paper over. */
      var add=B.phases[pi].add, spawns=B.phases[pi].at;
      for(var ai=0;ai<add.length;ai++){
        for(var si=0;si<spawns.length;si++)
          if(add[ai][0]===spawns[si][0]&&add[ai][1]===spawns[si][1]&&
             add[ai][2]===spawns[si][2])
            fail.push("phase "+(pi+1)+": a rising block buries hunter "+si);
        /* And never on the start square. Every kill returns the player there,
           so it is landed on repeatedly and mid-fight rather than once - a
           block that rose into it would be lifted through on every single
           kill, which is a shove nobody asked for at the worst moment. */
        if(add[ai][0]===level.start[0]&&add[ai][1]===level.start[1]&&
           add[ai][2]===level.start[2])
          fail.push("phase "+(pi+1)+": a rising block lands on the start square");
      }
    }
    var lvL={start:level.start,blocks:bossBlocksAt(level,last)};
    var RL=makeRules(lvL);
    var depths={},nd=0;
    for(var q2=0;q2<lvL.blocks.length;q2++)
      if(!depths[lvL.blocks[q2][2]]){depths[lvL.blocks[q2][2]]=1;nd++;}
    if(nd<4)fail.push("too flat for folding to buy anything");
    var crates=0;
    for(var c2=0;c2<lvL.blocks.length;c2++)if(isCrate(lvL.blocks[c2]))crates++;
    return {ok:!fail.length,fail:fail,
            phases:B.phases.length,
            hunters:B.phases.map(function(p){return p.at.length;}).join("/"),
            lethal:arenaLethal(lvL,RL),crates:crates};
  }
  /* The twin's stage. Every cell anything spawns on, across every core -
     three pairs and three centres, none of which may be inside a block or on
     the wrong side of a chasm, and each pair of which must start out of line
     with itself or the first fold is free. The pairwise column rule is
     narrower than the pack's: half a and half b of the *same* core, never
     across cores, because two cores are never alive together. The centres are
     exempt - nothing stands on those. */
  var R=makeRules(level), cr=crateSet(crateKeys(level));
  var stand=arenaStand(level,R,cr);
  for(var ti=0;ti<B.pairs.length;ti++){
    var pr=B.pairs[ti], cells3=[pr.a,pr.b,pr.c];
    for(var h=0;h<3;h++){
      var a=cells3[h];
      if(R.solid(a[0],a[1],a[2],cr))
        fail.push("core "+ti+" spawn "+h+" is inside a block");
      else if(h<2&&!stand.has(K(a[0],a[1],a[2])))
        fail.push("core "+ti+" half "+h+" cannot reach you: its ground is not yours");
    }
    if(pr.a[1]===pr.b[1]&&(pr.a[0]===pr.b[0]||pr.a[2]===pr.b[2]))
      fail.push("core "+ti+" spawns its halves in one column - a free kill");
  }
  var tf=arenaFractions(level,R,cr,stand);
  if(tf.worst<.12)fail.push("view with almost nothing in it: "+
    (tf.worst*100).toFixed(0)+"% - every line is free");
  if(tf.best>.62)fail.push((tf.best*100).toFixed(0)+
    "% of the floor cannot be folded from in one view - nowhere to fight");
  var tcr=0,tdep={},tnd=0;
  for(var c2=0;c2<level.blocks.length;c2++){
    if(isCrate(level.blocks[c2]))tcr++;
    if(!tdep[level.blocks[c2][2]]){tdep[level.blocks[c2][2]]=1;tnd++;}
  }
  if(tnd<4)fail.push("too flat for folding to buy anything");
  return {ok:!fail.length,fail:fail,squares:stand.size,hunters:"twin",
          lethal:(tf.worst*100).toFixed(0)+"-"+(tf.best*100).toFixed(0)+"%",
          crates:tcr};
}

function makeRules(level){
  var S=new Set(),A=new Set(),SP=new Set();
  for(var i=0;i<level.blocks.length;i++){
    var b=level.blocks[i];
    if(isCrate(b))continue;                    // crates are dynamic
    S.add(K(b[0],b[1],b[2]));
    if(isAnchor(b))A.add(K(b[0],b[1],b[2]));
    if(isSpike(b))SP.add(K(b[0],b[1],b[2]));
  }
  var spikeSilo=[0,1,2,3].map(function(v){
    var t=new Set();
    for(var i=0;i<level.blocks.length;i++){
      var b=level.blocks[i];
      if(!isSpike(b))continue;
      t.add((b[0]*AX[v].r[0]+b[2]*AX[v].r[2])+","+b[1]);
    }
    return t;
  });
  var silos=[0,1,2,3].map(function(v){
    var s=new Set();
    for(var i=0;i<level.blocks.length;i++){
      var b=level.blocks[i];
      if(isGlass(b)||isCrate(b))continue;
      s.add((b[0]*AX[v].r[0]+b[2]*AX[v].r[2])+","+b[1]);
    }
    return s;
  });
  var keys=(level.keys||[]).map(function(k){return K(k[0],k[1],k[2]);});

  function solid(x,y,z,cr){
    var k=K(x,y,z);
    return S.has(k)||(cr&&cr.has(k));
  }
  function siloSolid(v,u,y,cr){
    if(silos[v].has(u+","+y))return true;
    if(cr) {
      var it=cr.values(),n;
      while(!(n=it.next()).done){
        var c=parseK(n.value);
        if(c[1]===y && (c[0]*AX[v].r[0]+c[2]*AX[v].r[2])===u) return true;
      }
    }
    return false;
  }
  return {
    keys:keys,
    solid:solid,
    siloSolid:siloSolid,
    // lethal underfoot, in the volume and in the plane
    deadly3:function(x,y,z){return SP.has(K(x,y-1,z));},
    deadly2:function(v,u,y){return spikeSilo[v].has(u+","+(y-1));},
    uOf:function(v,x,z){return x*AX[v].r[0]+z*AX[v].r[2];},
    dOf:function(v,x,z){return x*AX[v].d[0]+z*AX[v].d[2];},
    cellAt:function(v,u,y,t){
      var r=AX[v].r,d=AX[v].d;
      return {x:u*r[0]+t*d[0],y:y,z:u*r[2]+t*d[2]};
    },
    // Where could we be standing when we come back to the volume?
    landings:function(v,u,y,cr){
      var out=[],r=AX[v].r,d=AX[v].d;
      for(var t=-16;t<=16;t++){
        var x=u*r[0]+t*d[0], z=u*r[2]+t*d[2];
        if(solid(x,y-1,z,cr) && !solid(x,y,z,cr))
          out.push({t:t,x:x,z:z,anchor:A.has(K(x,y-1,z))});
      }
      return out;
    },
    pick:function(list){
      var anch=null;
      for(var j=0;j<list.length;j++)
        if(list[j].anchor && (!anch||list[j].t>anch.t)) anch=list[j];
      if(anch)return anch;
      var best=list[0];
      for(var i=1;i<list.length;i++) if(list[i].t>best.t) best=list[i];
      return best;
    },
    heldFast:function(cx,cy,cz){return A.has(K(cx,cy-1,cz));},
    // Shove a crate one square. It falls if nothing holds it, a shove that
    // would lose it out of the world isn't allowed, and a crate resting on an
    // anchor cannot be shoved at all.
    push:function(cx,cy,cz,dx,dz,cr){
      if(A.has(K(cx,cy-1,cz)))return null;      // held fast by amber
      var nx=cx+dx,nz=cz+dz;
      if(solid(nx,cy,nz,cr))return null;
      var ny=cy;
      while(ny>-12 && !solid(nx,ny-1,nz,cr)) ny--;
      if(ny<=-11)return null;
      return {x:nx,y:ny,z:nz};
    }
  };
}
