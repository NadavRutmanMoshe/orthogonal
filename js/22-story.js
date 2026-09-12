"use strict";
/* I'm Just A Cube - 22-story.js
   The two cutscenes: the house at the beginning, the plane at the end.

   Loaded as a classic script like everything else, but listed AFTER
   21-boot.js in index.html, which is safe and deliberate: this file only
   DECLARES. Every call site into it - the render loop, the four verbs,
   syncHud, the intro card's BEGIN, the win card's next button - is guarded
   with `typeof storyX==="function"`, which is the idiom the primer, the
   replay and the trial marks already use. Boot therefore runs its first
   frame before this file exists and nothing notices.

   ============================================================
   WHY THERE ARE CUTSCENES AT ALL

   docs/design/chrome.md used to say, in as many words, "there are no
   cutscenes and no journal". That was not a rule about cutscenes being bad;
   it was a rule about the story slice being small enough to delete in one
   edit, back when the fiction was eleven sentences with no subject. It is
   reversed here on the owner's call, and the reversal is written up in
   chrome.md beside the sentence it replaces.

   What makes it safe is that the story did not change - it acquired a
   subject. The census was always coming to count you; now the reader has met
   two of the people it already counted. The intro card's line -
   "Everything this world has ever flattened is still in there" - is
   untouched, and is said again as the last caption of the first scene, where
   it now means something specific.

   ============================================================
   WHY IT IS PLAYED IN THE GAME'S OWN RENDERER

   Three options were on the table (a second three.js scene like the wardrobe
   case, CSS-3D like the sting, or this). This one wins on one argument: the
   ending is "they were in the 2D dimension", and in this renderer that is
   not a thing to depict, it is a thing to DO. The player presses GO 2D and
   his mother is standing in the silhouette. Every other approach fakes the
   one moment the whole game has been building the vocabulary for.

   The same argument runs backwards through the first scene. The census does
   not take the parents away in a puff of light - it FOLDS THE WORLD, and
   they are standing in a column with two of its officers, which is rule 4
   and the boss kill rule and the only way anything in this game dies at
   somebody else's hand. The son survives because he had stepped outside, so
   his column was empty. The story beat and the mechanic are the same event,
   which is the standing rule for fiction here: a beat that does not explain
   a mechanic does not go in.

   ============================================================
   HOW IT WORKS

   A cutscene is a LEVEL. `storyPlay()` builds an ordinary level object -
   blocks, a start, a theme index - marks it `tutorial:true` (no par, no
   stars, and crucially the solver is never asked about a two-hundred-block
   lawn with no goal) and hands it to enterPlay() like any other. So the sky,
   the grass, the birds, the depth shading, the outline, the fold tween and
   the camera are all the game's, for free, and none of them know a cutscene
   exists.

   On top of that board sit ACTORS: cubes built by buildPlayerMesh(), the
   same call the wardrobe's display case uses, so the family is made of the
   same piece the player is. They are positioned every frame by storyFrame(),
   which is handed the camera basis by the render loop and projects them with
   exactly the maths the player is projected with - so when the world folds,
   they fold with it. That is the whole trick, and it is four lines.

   THE SON IS THE PLAYER, not an actor. He is `playerMesh`, driven by writing
   player.x/z and letting the render loop's own lerp carry him - which means
   he walks the way the game walks, and he wears whatever skin is equipped.
   The cube in the house is unmistakably the cube you have been playing.

   THE VERBS ARE HELD, NOT THE BUTTONS. storyHolds() sits at the top of
   press/rotateView/doFlatten/doUnflatten beside bossHolding(), which is the
   same reasoning as the tutorial's gate: a gate on the four verbs cannot be
   walked around by a key, a gesture or a button, because all three funnel
   through them. It takes the name of the one verb the current beat is
   waiting for, so the ending can hand GO 2D back and nothing else.
   ============================================================ */

/* ============================================================
   WHAT HAS BEEN SEEN

   Two booleans, and they go through settings because settings is the thing
   with a save. loadSettings() is a WHITELIST - a key written and not read
   there does not exist after a reload - so both of these are read back in
   06-persistence.js, next to the counters, or the opening would play on
   every launch of the game forever.
   ============================================================ */
var STORY_KEYS={open:"seenStory1", end:"seenStory2", fire:"seenStory3"};
function storySeen(id){return !!(typeof settings!=="undefined"&&settings[STORY_KEYS[id]]);}
function storyMark(id){
  if(typeof settings==="undefined")return;
  settings[STORY_KEYS[id]]=true;
  if(typeof saveSettings==="function")saveSettings();
}
/* The opening is due to a player who has not seen it. It is reached from the
   intro card's BEGIN, which itself is only shown on a genuine first run
   (nothingBehind()), so in practice this is belt and braces - and it is what
   makes REPLAY STORY able to force it. */
function storyIntroDue(){return !storySeen("open");}
/* WHICH SCENE, IF ANY, THIS LEVEL OWES YOU ON THE WAY OUT. Two levels carry
   one: BOSS II is `interlude:"fire"` and BOSS IV is `ending:true`. They are
   fields on the levels in 02-levels.js rather than name matches here, because
   levels get renamed - that is what LEVEL_RENAMES exists for - and a cutscene
   that silently stops firing because a boss was retitled is the worst kind of
   bug to find.

   win() asks this INSTEAD of showing its card. The scene is the reward for
   the fight, and a card in front of it is a door in front of a door. */
function storyAfterLevel(){
  if(typeof playSource==="undefined"||playSource!=="builtin"||!L)return null;
  if(L.ending&&!storySeen("end"))return "end";
  if(L.interlude&&STORY_KEYS[L.interlude]&&!storySeen(L.interlude))return L.interlude;
  return null;
}
// Kept for the older call sites, and it is the same question.
function storyEndDue(){return storyAfterLevel()==="end";}

/* ============================================================
   THE CAST

   Colours are SKIN_COLORS ids, not raw hex, so the family is dressed out of
   the same catalogue the player shops in - the mother is wearing Pink, which
   is a thing you can go and buy. `size` is a scale on the .62 cube: the
   parents are bigger than their son, which is the one piece of
   characterisation a cube can carry without a face.

   The officers are the exception and are built from raw values. They are
   near-black with the hunters' own red rim - the same #ff6b7a the cage
   around a hunter is drawn in - because they are the same thing seen from
   the other side of the fold. Nothing says so; the colour says it.
   ============================================================ */
var ST_COP_BODY=0x241820, ST_COP_RIM=0xff6b7a;
/* THE FAMILY'S COLOURS, AND THE ONE PIECE OF CHARACTERISATION IN THIS GAME
   THAT IS NEVER SAID OUT LOUD.

   The son is ROSE - not a colour invented for him, but the exact colour
   every player starts the game in, read out of SKIN_COLORS so it cannot
   drift from the default. That is worth more than a bespoke hue: the cube in
   the house is the cube you are handed, so the child leaving home and the
   piece you are about to play are the same object.

   The mother is a DEEPER rose, so the son reads as her colour lightened.
   This is the way round it ended up on the owner's call, and it is the
   better one: the first version kept her at the catalogue's Pink and made
   the son a pale mix, which put the player's own cube at a colour the game
   never gives out. Now she is the one who moves.

   The neighbours are White. Nothing states what the three colours in that
   first house add up to and nothing ever will; it is there for whoever puts
   the two houses side by side and looks. */
var ST_MUM=0x9e2148;
function stSonHex(){return stHex("rose");}

var ST_STEP_MS=250;      // one cell of walking, close to the game's own pace
var ST_DEPTH=1.0;        // how far in front of the paper an actor is drawn
                         // when flat; the player uses 1.2, so it stays in front

function stHex(id){
  if(typeof SKIN_COLORS==="undefined")return 0xd6336c;
  for(var i=0;i<SKIN_COLORS.length;i++)if(SKIN_COLORS[i].id===id)return SKIN_COLORS[i].hex;
  return 0xd6336c;
}

/* ============================================================
   THE TWO SCENES

   Each is a board, a cast and a list of beats. A beat is `{ms, at, say}`:
   `at` runs the instant the beat starts, `say` is the caption it puts up
   (null clears it), and `ms` is how long the beat holds before the next one.
   Walks are fired inside `at` and are simply given enough `ms` to finish -
   deliberately, rather than a beat that waits for motion to end, because a
   fixed timeline is the thing you can seek to for a screenshot and tune by
   reading rather than by playing.

   Captions render through tutWords(), so {do:2d} says "Press GO 2D" or
   "Double-tap the world" depending on what the player's own controls are.
   ============================================================ */

/* THE HOUSE.

   BUILT SPARSELY, LIKE A LEVEL, AND THAT IS THE ONE THING THIS BOARD GOT
   WRONG FIRST TIME. The first version laid a solid 14x11 lawn, which in an
   orthographic view tilted 28 degrees above the horizon is not a lawn - it
   is a WALL of grass, because every row of depth is drawn a little higher up
   the screen than the one in front of it and eleven of them stack into a
   green cliff with the houses buried in it. The game's own levels never show
   this because they are one or two blocks deep. So the ground here is only
   where somebody stands: two floors, a strip across the front, and a path.
   Everything else is void, and the scene reads as a place.

   The layout, in the default view (+x is screen-right, +z is toward you):

       z 0..3   the two houses, along the back
       z 4..5   the strip in front of them, where the children meet
       z 6..9   the path up to our door, coming toward the camera

   A HOUSE IS A ROOF, and the second version is where that was learned. The
   first was a three-walled box with a beam over the opening, and it was
   reported as not looking like a house - correctly. Everything in this world
   is grass-topped stone, walls and ground alike, so a rectangle of it is
   terrain until something about its SHAPE says otherwise, and the one shape
   nothing natural has is a pitched roof. So the walls came down to two
   blocks, a doorway was cut into the face, and the top is a three-step
   pyramid: five wide, three wide, one. The silhouette does the work.

   The near side stays open, and the roof deliberately stops one row short of
   it. A voxel house with four walls is a box with a lid and nobody can be
   inside it and be looked at; a cutaway is the convention. The row the roof
   does not cover is why the family is visible at all - screen height here is
   `0.885y - 0.465z`, so the roof's near edge sits about 1.05 above the floor
   it covers, and anyone standing under it is behind it.

   THE IMPORTANT GEOMETRY IS TWO COLUMNS, x=2 AND x=4. The parents stand
   either side of their door. The census comes up the path in single file
   on the door's line, x=3, and SPLITS at the door: one officer steps in
   front of each parent, so when the fold comes it is father and officer in
   x=2, mother and officer in x=4 - two silhouette squares with two cubes in
   each, taken in one fold. (It was one column of four at x=3; the owner
   asked for one to take each parent at the same moment, and for the walk up
   to stay on the one line.) The son is at x=6 by then, and there is nothing
   else anywhere in this world at x=6 above the ground. That is why he
   lives, and it is on screen before it is in words. */
/* THE ONE THING THAT MADE IT A HOUSE AND NOT A HILL: `L.tint`.

   Shape alone was not enough, and three versions proved it. Everything in
   this world is the same grass-topped stone, walls and ground alike, so a
   pitched roof over a wall with windows in it is still a green mound made of
   the material the lawn is made of - photographed three times, reported
   twice.

   `L.tint` is already in the engine for `00 - First Landing`: a list of
   `[x,y,z,hex]` painting named cells a fixed colour for as long as the level
   is loaded. It multiplies exactly where the section's block colour did, so
   it inherits the depth fade and the settle toward ink for free, and it is
   deliberately NOT a block kind - it changes no rule and carries no meaning.
   Which is exactly right here: plaster walls and a tiled roof are decoration,
   and this is the one place in the game entitled to some.

   The hues are chosen against the meadow they stand on, and against the two
   colours that are never free: nothing here may drift toward the boss's
   violet or the trial's amber. Warm cream and burnt terracotta are as far
   from both as a building can get. */
/* THE WALL IS PLASTER AND THE ROOF IS TILE, AND THE TWO MUST NOT BE THE
   SAME FAMILY. For four versions the tint multiplied the meadow's grass
   texture, so the wall had to be a saturated tan just to beat the green band
   on every face - and a tan wall under a terracotta roof is one brown mass
   with a green lid on every course, which is a terraced hill. A painted cell
   now wears plain stone (paintedCell() in js/10-render.js), so the tint is
   the colour you see: a pale cream wall, a deep red roof, and the edge
   between them is what says building. Neither drifts toward the boss's
   violet or the trial's amber. */
var ST_WALL=0xe9d6ae, ST_ROOF=0xa33d33;
// The chimney is a brick between the wall and the roof; the path is pale
// flagstone. Both are tints over plain stone.
var ST_BRICK=0x6e4034, ST_PATH=0xd6c9ab;
function stHouseBoard(){
  var b=[],tint=[],x,z;
  function floor(x0,x1,z0,z1){
    for(var i=x0;i<=x1;i++)for(var j=z0;j<=z1;j++)b.push([i,0,j]);
  }
  // Everything a house is built of is painted; the ground it stands on is not.
  function put(x,y,z,hex){b.push([x,y,z]);tint.push([x,y,z,hex]);}
  /* A SOLID HOUSE, FACING THE CAMERA, WITH THE FAMILY OUTSIDE IT.

     The sixth version, and the first one that reads as a house in the
     VOLUME rather than only in the plane. The five before it were all
     cutaways: the wall with the door stood at the BACK of the floor (z=0),
     the side nearest the camera was left open so the family could be seen
     inside, and the roof was a one-row gable over the back wall only.
     Photographed from the game's camera that is a U of wall with a
     decorated back - and it was reported exactly so: "only when I go 2D can
     I tell it is a house", because the fold is the one view that collapses
     the U onto its facade.

     So the house is turned round and filled. The facade is at z=3, the row
     NEAREST the camera, and everything behind it is wall to the back. Nobody
     is inside and nobody needs to be: the family stands on the strip in
     front of the door, which is where you stand to say goodbye anyway.

     THE ROOF IS THE GABLE END, AND THE BODY HIDES BEHIND IT. Screen height
     is `0.885y - 0.465z`, so a row one square further from the camera draws
     about half a course HIGHER. A roof run at full height over every row of
     depth was therefore a staircase climbing away from the camera - four
     stepped tiers of tile on each eave, a ziggurat, reported as "the roof
     still seems off in 3D". A roof cannot recede without stepping in this
     projection, so the answer is a roof that does not recede: the facade
     row carries the gable at full height, and the rows behind it are built
     LOWER, by enough that every block of the body sits behind the gable's
     front faces and tops. How much lower is arithmetic. A block at (y,z)
     reaches up the screen to 0.885y - 0.465z + 0.675 (its top face's far
     edge); the gable block at height Y on the facade row reaches
     0.885Y - 0.72. Hiding needs Y - y >= (1.395 - 0.465z) / 0.885, which is
     0.53 for the row one square back and 1.05 and 1.58 for the two behind
     it: ONE course lower at z=2, TWO courses lower at z=1 and z=0. The first
     cut made every row one course lower, and the back rows climbed out
     over the ridge again. What the camera sees now is one clean gable end
     with lit tops, and the fold still projects the whole body inside the
     facade's silhouette, so the plane draws the same house as before.

     FOUR FACADE BLOCKS ARE OUT, on the owner's call, to see how it looks:
     the bottom two courses one in from each end, which are the blocks
     directly behind the parents in the first frame. (The corner blocks
     came out first, on a misreading, and went back.) The body's own blocks
     stand one row back in those columns, a step darker and half a course
     higher, so they read as set back rather than missing, and in the plane
     they project into the gap and the facade is whole.

     THE DOOR AND THE WINDOWS ARE OPEN, ALL THE WAY THROUGH. The first solid
     house painted the windows a night-glass blue and cut the door one block
     deep, so it showed the wall behind it - and it was reported as off, and
     the cutaway with real holes as better. The holes are what a house has
     that a hill does not, and a painted square is a decal on a box. So the
     door (two tall, in the middle) and the two windows (top course, either
     side) are cut through every row of depth. In the volume they are
     openings into a dark interior; in the plane, where the fold projects
     the whole depth onto the facade, nothing stands behind them along the
     view axis, so they stay holes and the folded house is the one the
     cutaway drew. `x0+2` is the middle of the five: the door, the ridge,
     and the column the census folds.

     The chimney is two bricks at the eave end of the body, one row behind
     the gable, starting a course above the eave so it stands clear of the
     roofline in both views: from the front it rises out of the eave, and
     in the plane it is two bricks beside the roof's upper course with sky
     between it and the ridge. Nothing visibly holds it up, and nothing
     needs to: a support course under it would sit flush with the roof in
     the plane and read as a brown tile. Beside the ridge would put it in a
     window column, and the plane would fill the window with brick. */
  function house(x0,x1){
    var i,y,j,mid=x0+2;
    // The door column, two tall, and the two windows in the top course.
    function hole(i,y){return (i===mid&&y<=2)||(y===3&&(i===x0+1||i===x0+3));}
    /* The body: three rows behind the facade, each built `down` courses
       lower than it (see above), walls to 3-down under a roof of 5, 3, 1,
       with the door and window columns left open all the way through. */
    for(j=0;j<=2;j++){
      var down=(j===2)?1:2, top=3-down;
      for(i=x0;i<=x1;i++)for(y=1;y<=top;y++)if(!hole(i,y))put(i,y,j,ST_WALL);
      for(i=x0;i<=x1;i++)if(!hole(i,top+1))put(i,top+1,j,ST_ROOF);
      for(i=x0+1;i<x1;i++)if(!hole(i,top+2))put(i,top+2,j,ST_ROOF);
      put(mid,top+3,j,ST_ROOF);
    }
    // The facade, a course taller, carrying the gable.
    for(i=x0;i<=x1;i++)for(y=1;y<=3;y++){
      if(hole(i,y))continue;
      if((i===x0+1||i===x1-1)&&y<=2)continue;  // the four behind the parents
      put(i,y,3,ST_WALL);
    }
    for(i=x0;i<=x1;i++)put(i,4,3,ST_ROOF);
    for(i=x0+1;i<x1;i++)put(i,5,3,ST_ROOF);
    put(mid,6,3,ST_ROOF);
    put(x1,5,2,ST_BRICK);put(x1,6,2,ST_BRICK);
  }
  floor(1,5,0,3);      // our house
  floor(8,12,0,3);     // theirs
  floor(0,13,4,5);     // the strip across the front of both
  /* THE PATH IS THREE WIDE AND PAVED, centred on the door. Paved because
     on grass it was a strip of grass indistinguishable from the strip it
     joins, and a painted cell wears plain stone, so a pale warm tint is
     flagstones. Three wide on the owner's call, one square either side of
     the door's line, which is the line the census climbs it on. */
  for(z=6;z<=9;z++)for(x=2;x<=4;x++)put(x,0,z,ST_PATH);
  house(1,5);
  house(8,12);
  /* ============================================================
     THE SCENERY THAT CAME OUT. Two houses on a strip is a diagram of a
     street, and two things were added to make it a place; both are gone,
     and the record is here so they are not added back by accident.

     DUNES behind the houses: two rows of ochre-tinted stone with a ridge
     on the back row, standing in for distance. They earned their place
     while the whole street was fitted to the screen; once a painted cell
     wore plain stone they were flat brown blocks, and once the scene was
     shot house by house they stood either side of the house like a pair of
     brown wings. The treeline the section draws behind every level is the
     distance now.

     A POND in front of the strip, beside the path: real water (kind 1), at
     ground level first and then sunk a course inside a ring of painted grey
     stone. It went on the owner's call, rim and all. What is in front of
     the houses now is the strip, the path, and nothing else - ground only
     where somebody stands, which was the rule from the start.
     ============================================================ */
  return {blocks:b, tint:tint};
}
/* THE PLANE.

   Deliberately almost nothing: a small night platform, because this scene is
   one press and two people, and every block that is not the floor is a block
   the eye has to rule out. Kept shallow for the same reason the lawn was
   thinned - depth stacks up the screen, and this scene wants a stage, not a
   cliff. V · EXTRA's nocturne is the ground: "the shelf past the last
   warden, where the counting stopped", which is exactly when this happens. */
function stPlaneBoard(){
  var b=[],x,z;
  for(x=0;x<=8;x++)for(z=0;z<=3;z++)b.push([x,0,z]);
  return {blocks:b, tint:[]};
}
/* THE FIRE. A basalt shelf with a wall of fire along the back of it and a
   gap in the middle of that wall, which is where he is standing.

   The fire is real fire - kind 4, the piece the section teaches - not a
   decoration that looks like it. It flickers because every fire block in the
   game flickers, it is lethal because every fire block is, and nobody steps
   on it because nobody in a cutscene steps anywhere they are not told to.
   Using the real piece is the same discipline as using the real fold: the
   scene is made of the game. */
function stFireBoard(){
  var b=[],x,z;
  for(x=0;x<=8;x++)for(z=0;z<=3;z++)b.push([x,0,z]);
  // The back wall of it, with him in the gap at x=4.
  for(x=0;x<=8;x++)if(x!==4)b.push([x,1,0,4]);
  return {blocks:b, tint:[]};
}

/* ============================================================
   THE ARRIVAL - how a scene that follows a fight gets there.

   The two scenes that come off a boss do not cut to their board, they TRAVEL
   to it: you stand a moment on the arena you have just won, that arena folds
   flat under you, the screen goes dark, the board is swapped behind the dark,
   and somewhere else fades up. The move between the two places is the game's
   own verb, which is the same argument the abduction and the reunion are
   built on.

   These five beats are shared by both scenes as `pre`, and they are only in
   the timeline when there is something to leave: a replay out of the settings
   panel has no arena it just won, so storyPlay() drops them and calls
   stArrive() outright.
   ============================================================ */
var ST_ARRIVE=[
  {ms:1500, say:"The count is closed."},
  {ms:1250, at:function(){stFold();}},
  {ms:750,  at:function(){stFadeTo(1,700);stSay(null);}},
  {ms:300,  at:function(){stArrive();}},
  {ms:900,  at:function(){stFadeTo(0,850);}}
];

/* THE SHOTS OF THE OPENING, as boxes for stFrame() (see THE CAMERA below).
   Board cells: our house is x 1..5 and z 0..3, theirs x 8..12, the strip
   z 4..5, the path x=3 z 6..9. The y top is the eaves, not the chimney, so
   the family sits near the middle of the screen rather than under it.

   HOME    our house alone, for the goodbyes
   STREET  both houses and the strip, for the hello and the neighbours' walk
   PATH    our house and the path, for the census climbing it
   DOOR    our house, the door column and the son's square at x=6 - the two
           columns the fold is about, and nothing else */
var ST_SHOT={
  home:  [[0,0,0],[6,4,5]],
  street:[[0,0,0],[13,4,5]],
  path:  [[0,0,0],[8,4,9]],
  door:  [[0,0,0],[8,4,7]],
  /* THE FIRE: the shelf is nine wide and he is one cube in a gap in the
     wall, so his lines are said close, on the two of them, and the shelf is
     only seen whole as the scene arrives and after he has gone. */
  fire:  [[1,0,0],[7,2,3]],
  /* THE ENDING: an empty platform and one cube on it, close, so that when
     the fold puts her beside him there is nothing else in the picture. */
  end:   [[1,0,0],[7,2,3]]
};

var STORY={
  open:{
    to:"prologue",
    /* The child in the house is not the player's skin. `son` repaints
       playerMesh for the length of this scene only; storyStop() puts the
       equipped one back with applySkin(). See ST_MUM above. */
    son:"rose",
    frame:ST_SHOT.home,
    level:{name:"I'm Just A Cube", hint:"", theme:1, tutorial:true, rotate:false,
           start:[3,1,4], goal:[3,1,4], blocks:null},
    /* BIGGER THAN THEY WERE. The parents were 1.18 against the son's 1.0 and
       were reported as barely seen - a black cube in a dark doorway at
       fourteen squares of arena width is a smudge. 1.4 is a third again as
       big as their son, which is also the honest reading of "the parents are
       bigger", and it is what makes the black one legible at all. */
    /* OUTSIDE, on the strip in front of their own door, the son between
       them: the house is solid now (stHouseBoard) and there is no inside to
       be seen in. The neighbours stand in front of theirs the same way. */
    cast:[
      {id:"dad",  col:"black", size:1.4,  at:[2,1,4]},
      {id:"mum",  body:ST_MUM, size:1.4,  at:[4,1,4]},
      {id:"nDad", col:"white", size:1.4,  at:[9,1,5]},
      {id:"nMum", col:"white", size:1.4,  at:[11,1,5]},
      {id:"nKid", col:"white", size:1.0,  at:[10,1,4]},
      {id:"copA", body:ST_COP_BODY, rim:ST_COP_RIM, size:1.34, at:[3,1,9], hidden:true},
      {id:"copB", body:ST_COP_BODY, rim:ST_COP_RIM, size:1.34, at:[3,1,9], hidden:true}
    ],
    beats:[
      /* THE THREE OF THEM, NAMED AND COUNTED, BEFORE ANYTHING HAPPENS.

         This beat and the two under it are here because the parents were
         reported as never really seen: they had no moment of their own -
         the son left in the second beat and they were furniture until the
         officers arrived. So the scene now opens on the household, says how
         many live in it, and spends four seconds on him saying goodbye to
         each of them in turn. The line is what makes the viewer count the
         cubes, which is the whole trick: three is a number the ending can
         take two away from. */
      /* THE LINES ARE HELD AT THE ENDING'S PACE. A caption shows until the
         next beat that says something (or says null), so a line's reading
         time is the sum of the beats it sits over. The opening's were timed
         by somebody who already knew what they said; the ending's, half
         again as long, were reported as right, so these now match them. */
      {ms:2600, say:"Three of them lived here."},
      {ms:1150, at:function(){stHop("son");stHop("dad",300);}},
      {ms:1250, at:function(){stHop("son");stHop("mum",300);}, say:null},
      // A step away from the door, out to the front of the strip.
      {ms:1060, at:function(){stWalk("son",[[3,5]]);}},
      // And along the front, toward the neighbours. The camera pulls back
      // to the whole street as he goes, so they are in the picture before
      // he reaches them.
      {ms:1060, at:function(){stFrame(ST_SHOT.street);
                              stWalk("son",[[4,5],[5,5],[6,5]]);}},
      {ms:480,  at:function(){stHop("son");}},
      // All three say it back. Staggered, because three cubes hopping in
      // unison is a machine and three cubes hopping raggedly is a family.
      {ms:1100, at:function(){stHop("nKid");stHop("nDad",130);stHop("nMum",250);}},
      /* THEY COME UP THE PATH IN SINGLE FILE, which is the whole reason the
         path is one square wide - it is also the column they will fold. The
         second one is let out a step later rather than started a square
         further back, because a square further back is a square of path that
         exists only to hold him. */
      /* SINGLE FILE UP THE PATH, on the door's line. The second one is let
         out a step later rather than started a square further back, because
         a square further back is a square of path that exists only to hold
         him. (They came up abreast for one version; the owner preferred the
         one line, with the split saved for the door.) */
      {ms:2400, say:"The census came up the path.",
       at:function(){
         stFrame(ST_SHOT.path);
         stShow("copA");stWalk("copA",[[3,8],[3,7],[3,6]]);
         stAfter(300,function(){
           stShow("copB");stWalk("copB",[[3,8],[3,7]]);
         });
       }},
      // Up to the door, still in file: one on the strip, one on the path.
      {ms:700, at:function(){stWalk("copA",[[3,5]]);stWalk("copB",[[3,6]]);}},
      // Two taps on a door, which in a world made of cubes is a cube
      // knocking itself against one. The camera closes on the door for
      // the rest of it: this shot holds both parents' columns and the
      // son's square, which is everything the fold is about.
      {ms:1000, at:function(){stFrame(ST_SHOT.door);stKnock("copA");}, say:null},
      // The parents answer, from where they stand either side of the door.
      {ms:2000, at:function(){stHop("dad");stHop("mum",220);},
       say:"They had questions about the house."},
      /* THE SPLIT, AND ONE TAKES EACH. The first officer steps across to
         stand in front of the father, the second comes up and across to
         stand in front of the mother. That puts father and officer in
         column x=2 and mother and officer in x=4 - two silhouette squares
         with two cubes in each - and the fold takes both pairs at the same
         moment. */
      {ms:1150, at:function(){stWalk("copA",[[2,5]]);stWalk("copB",[[4,6],[4,5]]);}},
      {ms:900,  at:function(){stHop("copA");stHop("copB",120);}, say:null},
      // THE FOLD IS THE ABDUCTION. No new verb, no effect nobody has seen:
      // the world does the one thing this game does, and four cubes standing
      // in one column do not come back from it.
      {ms:1050, at:function(){stFold();}},
      {ms:820,  at:function(){stTake(["mum","dad","copA","copB"]);}},
      {ms:900,  at:function(){stUnfold();}},
      /* HIS LINE, NOT THE NARRATOR'S. This was "He had stepped out of the
         column" - true, mechanical, and reported as not selling it, which is
         the right reading: the sentence explains the rule at the exact
         moment the player does not want a rule explained. The boy speaks
         first, in his own colour, and the mechanical line follows a beat
         later when there is room for it. Both are still said; the order is
         what changed. */
      {ms:2000, say:"My parents!", who:"son",
       at:function(){stSob("son",4200);stHop("son");}},
      {ms:2600, say:"He was not standing on either line."},
      // The neighbours close the distance. Nobody says anything, because
      // there is nothing to say and the walk is the sentence.
      {ms:1500, at:function(){
        stFrame(ST_SHOT.street);
        stWalk("nDad",[[8,5]]);
        stWalk("nMum",[[10,5],[9,5]]);
        stWalk("nKid",[[9,4],[8,4],[7,4],[7,5]]);
      }},
      {ms:3800, say:"Everything this world has ever flattened is still in there."}
    ]
  },

  /* ============================================================
     THE FIRE - after BOSS II, which is the fight II · FIRE ends on.

     `from:"here"` is what makes this and the ending arrive rather than cut.
     The scene begins on the arena you have just won, folds it flat, fades,
     swaps the board behind the black and fades back up somewhere else - so
     the move between the two places is the game's own verb again, and the
     player watches the arena they were standing on collapse.

     He is a SHARD, in his own black, and that is the line delivered before
     it is spoken. Shapes are the wardrobe: the player has spent the whole
     game looking at a catalogue of them and choosing one. A father who left
     as a cube and is standing there as a shard has said "the plane changed
     me" before he opens his mouth.
     ============================================================ */
  fire:{
    to:"next", from:"here",
    /* The player stands one square off his line. Directly in front of him
       was the first placement and it is a better picture and a worse shot:
       the son is drawn over his father and neither reads. */
    level:{name:"I'm Just A Cube", hint:"", theme:2, tutorial:true, rotate:false,
           start:[3,1,2], goal:[3,1,2], blocks:null},
    cast:[
      {id:"dad", col:"black", shape:"star", size:1.4, at:[4,1,0]}
    ],
    pre:ST_ARRIVE,
    /* SHOT WIDE, THEN CLOSE, THEN WIDE. No `frame` on the scene, so it
       arrives on the whole shelf and the wall of fire is the first thing
       read; the camera moves in on the two of them for his first line and
       stays there until he is gone, and the last line is said over the
       empty shelf again. */
    beats:[
      // Held at the ending's pace, like the opening's (see there).
      {ms:2600, say:"Something was standing in the fire."},
      {ms:3200, say:"You came further than I did.", who:"dad",
       at:function(){stFrame(ST_SHOT.fire);}},
      {ms:3800, say:"The plane keeps a little of everything it flattens.", who:"dad"},
      {ms:3600, say:"I did not come back the same shape.", who:"dad"},
      {ms:1700, at:function(){stTake(["dad"],true);}, say:null},
      {ms:3800, say:"Everything this world has ever flattened is still in there.",
       at:function(){stFrame(null);}}
    ]
  },

  end:{
    to:"sections", from:"here",
    level:{name:"I'm Just A Cube", hint:"", theme:5, tutorial:true, rotate:false,
           start:[4,1,2], goal:[4,1,2], blocks:null},
    /* SHE IS `plane:true`, WHICH IS THE WHOLE SCENE. A plane actor is drawn
       only as the world folds - opacity rides flatT - so in the volume the
       platform is empty and there is nobody to find. She is at x=5, one
       square right of the player's x=4, so the fold lands her beside him: in
       the plane the only coordinate left is u, and u is x. */
    cast:[
      {id:"mum", body:ST_MUM, size:1.4, at:[5,1,0], plane:true}
    ],
    pre:ST_ARRIVE,
    // Close from the moment it arrives: one cube on an empty platform, and
    // room for exactly one more beside him.
    frame:ST_SHOT.end,
    /* LONGER THAN IT WAS, ALL THE WAY THROUGH. Every line here was timed by
       somebody who already knew what it said; played cold they went past
       before they were finished. Roughly half again on each, and the last
       one - the one about the fire - gets four seconds, because it is the
       sentence the whole ending is for and it is also the one the player has
       to carry out of the game.

       AND IT MOVES. The hop is the opening's own gesture, the one he said
       hello to the neighbours with and goodbye to his parents with, and it
       is the only body language a cube has. Using it here is what makes the
       reunion a reunion rather than two rectangles and some captions. */
    beats:[
      {ms:2600, say:"Everything this world has ever flattened is still in there."},
      /* AND HERE THE GAME HANDS THE VERB BACK. One press, the one it has
         spent the whole campaign teaching, and it is the player who finds
         her rather than a camera that shows him finding her. */
      {ms:0, await:"fold", say:"{do:2d}"},
      {ms:1400, at:function(){stSay(null);}},
      // She sees him, and then he sees her: her hop first, his a beat after.
      {ms:2600, say:"You found me.", who:"mum",
       at:function(){stHop("mum");stHop("son",420);}},
      /* WHAT SHE SAYS NEXT DEPENDS ON WHAT YOU ARE WEARING. `say` may be a
         function, evaluated when the beat starts - see stEnter(). */
      {ms:3600, say:stSkinLine, who:"mum",
       at:function(){stHop("mum",300);}},
      {ms:3800, say:"I have been in the silhouette since they came to the door.", who:"mum"},
      {ms:4200, say:"Your father is not here. He went into the fire world.", who:"mum"},
      {ms:2000, at:function(){storyEndCard();}}
    ]
  }
};

/* ============================================================
   THE RUNNING CUTSCENE
   ============================================================ */
var ST=null;
var stTmp=null;                 // one scratch vector, made on first use
var stWas=null;                 // what to put back when the scene ends

function storyOn(){return !!ST;}
/* Which verb, if any, the current beat is waiting for. syncHud() reads this
   to decide body.storyask - the body classes are syncHud's to own, without
   exception, so nothing in this file writes one directly. */
function storyAsking(){return ST?ST.await:null;}
/* The gate the four verbs ask. It takes the verb's own name so a beat can
   open exactly one door: during the ending's `await:"fold"` this is false
   for doFlatten and true for everything else, so the player can fold and
   cannot walk off the platform while doing it. */
function storyHolds(verb){return !!ST&&ST.await!==verb;}

/* `replay` is the settings panel's two buttons rather than the campaign.

   IT CHANGES TWO THINGS, AND BOTH MATTER. A replay does not mark the scene
   as seen - so somebody who watches the ending early out of curiosity still
   gets FIND THEM on BOSS IV's win card and still gets the scene at the
   moment it is worth something; watching it is not the same as having
   reached it. And a replay goes back where it came from rather than to the
   scene's own destination: the opening ends in the first tutorial, which is
   right the first time and is somebody being thrown out of their level the
   second. */
function storyPlay(id,replay){
  var def=STORY[id];
  if(!def)return;
  storyStop();
  /* WHAT WE ARE STANDING ON IS PUT BACK AFTERWARDS. A cutscene loads a level
     over whatever was there, and the two that follow a boss are entered from
     the fight itself - so playSource and lvIndex have to be restored or the
     next thing to ask "which level am I on" gets the cutscene. */
  stWas={src:(typeof playSource!=="undefined"?playSource:"builtin"),
         idx:(typeof lvIndex==="number"?lvIndex:0),
         home:(typeof homeUp==="function"&&homeUp())};
  /* TRAVEL, OR CUT. A scene with `from:"here"` begins on the board that is
     already loaded and folds its way out of it; the board it is really
     about is swapped in four beats later by stArrive(). A replay has no
     arena it just won, so it skips the journey and starts on arrival. */
  var travels=def.from==="here"&&!replay;
  ST={id:id, def:def, list:(travels?def.pre:[]).concat(def.beats),
      i:-1, t:0, actors:[], await:null, over:false, replay:!!replay,
      arrived:false, frame:null};
  var el=$("story");if(el)el.classList.add("on");
  stSay(null);
  stFadeTo(0,420);
  if(!travels)stArrive();
  if(typeof syncHud==="function")syncHud();   // owns body.instory
  stEnter(0);
}
/* The board this scene is actually about, loaded. Called immediately for a
   scene that cuts, and from inside the journey - behind the black - for one
   that travels. */
function stArrive(){
  if(!ST||ST.arrived)return;
  var def=ST.def, id=ST.id;
  ST.arrived=true;
  var lv={};
  for(var k in def.level)lv[k]=def.level[k];
  var built=id==="open"?stHouseBoard():id==="fire"?stFireBoard():stPlaneBoard();
  lv.blocks=built.blocks;
  lv.tint=built.tint;
  /* The scene's first shot goes in HERE, not in storyPlay(): a scene that
     travels spends its first beats on the arena it is leaving, and a frame
     set early would fit that arena to the wrong box on a resize. Set just
     before the board loads, syncMeshes() fits it on the first frame drawn. */
  ST.frame=def.frame||null;
  playSource="story";
  enterPlay(lv,undefined,false);
  /* The one mark loadLevel leaves: trailHere() puts a footprint on the start
     square. A cutscene has not been walked, so it is swept. */
  if(typeof trailClear==="function")trailClear();
  /* THE CHILD IS NOT THE PLAYER'S SKIN. Only the opening asks for this, and
     only for as long as it runs: storyStop() calls applySkin(), which is the
     function whose whole job is putting the equipped piece back. */
  if(def.son!==undefined)stSonSkin(stHex(def.son));
  stBuildCast(def.cast);
  if(typeof syncHud==="function")syncHud();
}
/* Repaint playerMesh for the length of one scene. Same three lines
   applySkin() uses, with the colour and the shape given rather than read. */
function stSonSkin(hex){
  if(typeof playerMesh==="undefined"||!playerMesh||
     typeof buildPlayerMesh!=="function"||typeof THREE==="undefined")return;
  var pos=playerMesh.position.clone();
  scene.remove(playerMesh);
  playerMesh=buildPlayerMesh("cube",hex,
    new THREE.MeshBasicMaterial({color:hex}));
  playerMesh.position.copy(pos);
  scene.add(playerMesh);
}
/* ============================================================
   WHAT SHE SAYS WHEN SHE SEES YOU

   The one line in the game that reads the wardrobe. A player arrives at the
   ending wearing something they chose over four sections, and the scene is
   about a mother looking at a child she last saw as a small pink cube - so
   she remarks on what is in front of her.

   Three answers, in priority order, and the priority is the point. A REWARD
   shape cannot be bought: it is one per numbered section, granted for taking
   every star in it, so wearing one is the only thing in this catalogue that
   is evidence of what you did rather than of what you liked. Anything else
   off the default is a choice, which is a different sentence. And arriving
   in the cube you started in is the third, which is not a lesser ending -
   it is the one where the only thing that changed is you.
   ============================================================ */
function stSkinLine(){
  var shape=(typeof wardrobe!=="undefined"&&wardrobe.shape)||"cube";
  var col=(typeof wardrobe!=="undefined"&&wardrobe.color)||"rose";
  var it=(typeof findBy==="function"&&typeof SKIN_SHAPES!=="undefined")
    ? findBy(SKIN_SHAPES,shape) : null;
  if(it&&it.reward)return "You came back stronger than you left.";
  if(shape!=="cube"||col!=="rose")
    return "You have changed. I would know you anywhere.";
  return "Look how you have grown.";
}

/* Everything the scene put on the screen, taken back off it. Called on the
   way out by every path - the last beat, SKIP, and a second storyPlay() -
   which is the same discipline the replay uses: restore unconditionally,
   because the interesting bugs are all on the paths nobody tested. */
function storyStop(){
  if(!ST)return;
  for(var i=0;i<ST.actors.length;i++){
    var a=ST.actors[i];
    if(a.mesh&&typeof scene!=="undefined"&&scene)scene.remove(a.mesh);
    if(a.mesh&&a.mesh.geometry&&a.mesh.geometry.dispose)a.mesh.geometry.dispose();
  }
  var repaint=ST.def&&ST.def.son!==undefined;
  ST=null;
  /* AND THE EQUIPPED PIECE GOES BACK ON. Only the opening repaints
     playerMesh (see stSonSkin), and applySkin() is the function whose whole
     job is putting back what the wardrobe says - so the restore is one call
     and it cannot drift from what a wardrobe change would have done. */
  if(repaint&&typeof applySkin==="function")applySkin();
  /* THE OVERLAY IS DELIBERATELY LEFT UP. It is carrying the black the scene
     just faded to, and taking it down here would cut from black straight to
     the next level with no fade back in - the curtain would be pulled at the
     same instant the stage was lit. stCurtain() is what takes it down, after
     the level behind it has loaded. */
  var el=$("story");if(el)el.classList.remove("done");
  var ec=$("storyend");if(ec)ec.classList.remove("on");
  /* syncHud takes body.instory and body.storyask back off, and it is asked
     unconditionally: this is the one function every way out goes through -
     the last beat, SKIP, and a second storyPlay() - so it is the one place
     the chrome can be guaranteed to come back. */
  if(typeof syncHud==="function")syncHud();
}

/* SKIP. It is 24 seconds and it plays before the tutorial, so it has to be
   escapable by the same reflex that starts anything else here - the sting's
   rule. Skipping still counts as having seen it: a player who skipped the
   opening does not want it again tomorrow, and REPLAY STORY is in the menu
   for the one who does. */
function storySkip(){
  if(!ST)return;
  storyLeave(ST.id,stDest(),220);
}
/* Where this scene should hand back to. A replay owes the player the screen
   they pressed the button on; a first run owes them the scene's own next
   thing. */
function stDest(){
  if(!ST)return "prologue";
  return ST.replay?"back":ST.def.to;
}
/* THE ONE WAY OUT, and every path uses it: SKIP, the last beat of the
   opening, and the end card's button. Fade the scene down, swap the world
   behind the black, then bring it back up - which is why storyStop() leaves
   the overlay standing and stCurtain() is what finally takes it away. */
function storyLeave(id,to,ms){
  var replay=!!(ST&&ST.replay);
  if(!replay)storyMark(id);
  stFadeTo(1,ms);
  setTimeout(function(){
    storyStop();
    storyGo(to);
    stCurtain();
  },ms+30);
}
function stCurtain(){
  stFadeTo(0,460);
  setTimeout(function(){
    // Not if a second scene has started in the meantime - REPLAY STORY from
    // the menu can do exactly that.
    if(ST)return;
    var el=$("story");if(el)el.classList.remove("on");
  },500);
}

/* Where a finished cutscene puts you. The opening opens onto the first
   tutorial, which is what BEGIN always did; the ending opens onto the
   section chooser, one tap from the shelf it has just unlocked; and a replay
   out of the settings panel goes back to whatever it interrupted. */
function storyGo(to){
  var idx=stWas?stWas.idx:0;
  playSource="builtin";
  if(to==="prologue"){
    if(typeof enterPlay==="function")enterPlay(LEVELS[0],0,false);
  }else if(to==="next"){
    /* THE SCENE STOOD IN FOR A WIN CARD, so it owes the player what that
       card's button would have done: the next level. The lock check is
       bNext's, for the same reason bNext has one - the next level can be
       behind a shelf that is not open yet, and walking through it silently
       is worse than saying so. */
    var nx=idx>=LEVELS.length-1?0:idx+1;
    if(typeof mapLocked==="function"&&mapLocked(nx)){
      if(typeof enterPlay==="function")enterPlay(LEVELS[idx],idx,false);
      if(typeof levelPicker==="function")levelPicker(mapSecOf(nx));
    }else if(typeof enterPlay==="function")enterPlay(LEVELS[nx],nx,false);
  }else if(to==="back"){
    if(typeof enterPlay==="function")enterPlay(LEVELS[idx],idx,false);
    // A player who opened settings from the home screen is put back on it.
    if(stWas&&stWas.home&&typeof homeShow==="function")homeShow();
  }else{
    if(typeof enterPlay==="function")enterPlay(LEVELS[idx],idx,false);
    if(typeof sectionPicker==="function")sectionPicker();
  }
  stWas=null;
  if(typeof syncHud==="function")syncHud();
}

/* ============================================================
   THE ACTORS
   ============================================================ */
function stBuildCast(list){
  if(typeof THREE==="undefined"||typeof scene==="undefined"||!scene)return;
  for(var i=0;i<list.length;i++){
    var d=list[i];
    var hex=(d.body!==undefined)?d.body:stHex(d.col);
    /* Our own material, transparent from the start, because a plane actor
       fades in with the fold and a taken one fades out. buildPlayerMesh
       would otherwise hand back a shared opaque MeshBasicMaterial. */
    var mat=new THREE.MeshBasicMaterial({color:hex,transparent:true,opacity:1});
    /* A shape, if the part calls for one. Only the father in the fire does:
       he left as a cube and is standing there as a Shard, which is the line
       he is about to say, said first. */
    var m=buildPlayerMesh(d.shape||"cube",hex,mat);
    m.scale.setScalar(d.size||1);
    m.position.set(d.at[0],d.at[1],d.at[2]);
    m.visible=!d.hidden;
    scene.add(m);
    ST.actors.push({id:d.id, mesh:m, mat:mat, size:d.size||1, rim:d.rim,
      x:d.at[0], y:d.at[1], z:d.at[2], plane:!!d.plane, hidden:!!d.hidden,
      path:null, pi:0, pt:0, hop:0, hopIn:0, sob:0, op:1, going:0});
  }
}
function stFind(id){
  if(!ST)return null;
  for(var i=0;i<ST.actors.length;i++)if(ST.actors[i].id===id)return ST.actors[i];
  return null;
}
/* The son is not an actor, he is the player - so every verb below takes
   "son" and writes the game's own state instead. That is what keeps him
   wearing the equipped skin and moving with the game's own easing. */
function stWalk(id,cells,ms){
  if(id==="son"){
    if(!ST)return;
    ST.sonPath=cells.slice();ST.sonPi=0;ST.sonPt=0;ST.sonMs=ms||ST_STEP_MS;
    return;
  }
  var a=stFind(id);if(!a)return;
  a.path=cells.slice();a.pi=0;a.pt=0;a.ms=ms||ST_STEP_MS;
}
function stShow(id){var a=stFind(id);if(a){a.hidden=false;a.mesh.visible=true;}}
/* A beat that wants two things a few hundred milliseconds apart, without
   spending a beat on the gap. Tied to the scene that scheduled it: a SKIP
   between the two halves must not fire the second one into the level the
   player has landed in. Same discipline as the replay restoring state on
   every path out. */
function stAfter(ms,fn){
  var mine=ST;
  /* A SEEK RUNS IT NOW. storySeek() (the screenshot tool's way in) plays
     every beat up to the one asked for in one synchronous pass, so a timer
     set inside a beat would fire AFTER the seek had settled every walk -
     and re-walk its actor from wherever the timer's beat left him. The
     second officer was photographed back on the path after the fold for
     exactly that reason. While a seek is running the delay is dropped and
     the callback runs in line, so the seek's settle sees it too. */
  if(ST&&ST.seeking){fn();return;}
  setTimeout(function(){if(ST&&ST===mine)fn();},ms);
}
/* A hop is how a cube waves. `hopIn` is a delay, so three of them can be
   staggered off one beat rather than three. */
function stHop(id,delay){
  if(id==="son"){if(ST)ST.sonHop=1,ST.sonHopIn=delay||0;return;}
  var a=stFind(id);if(!a)return;
  a.hop=1;a.hopIn=delay||0;
}
/* Knocking: two short hops into the door, and the game's own bump - the
   sound a move that is refused makes, which is the right one for a cube
   hitting a wall on purpose. */
function stKnock(id){
  var a=stFind(id);if(!a)return;
  a.hop=1;a.hopIn=0;
  if(typeof SFX!=="undefined"&&SFX.bump)SFX.bump();
  setTimeout(function(){
    if(!ST)return;
    var b=stFind(id);if(b){b.hop=1;b.hopIn=0;}
    if(SFX.bump)SFX.bump();
  },260);
}
function stSob(id,ms){
  if(id==="son"){if(ST)ST.sonSob=ms||2000;return;}
  var a=stFind(id);if(a)a.sob=ms||2000;
}
/* TAKEN. The ash cloud is the game's own death animation, and it bursts at
   the mesh's CURRENT position rather than at the actor's cell - because the
   world is folded when this fires and the cell is not where the cube is
   being drawn. Same reason the replay's camera reads playerMesh. */
/* `quiet` is somebody LEAVING rather than being taken: no ash, no death
   sound, just a fade. The father in the fire steps back into the plane; he
   is not killed in front of you, and a kill cloud would say he was. */
function stTake(ids,quiet){
  for(var i=0;i<ids.length;i++){
    var a=stFind(ids[i]);
    if(!a)continue;
    if(!quiet&&typeof ashBurst==="function")
      ashBurst(a.mesh.position.x,a.mesh.position.y,a.mesh.position.z,
               a.mat.color.getHex());
    a.going=1;
  }
  // "crush", because that is literally what happens to them: four cubes in
  // one silhouette column is rule 4, and the sound has to be the sound the
  // game makes when the world closes on you rather than the one it makes
  // when you fall off it.
  if(!quiet&&typeof SFX!=="undefined"&&SFX.die)SFX.die("crush");
  if(quiet&&typeof SFX!=="undefined"&&SFX.fold)SFX.fold();
}

/* ============================================================
   THE WORLD'S OWN VERBS, DRIVEN WITHOUT THE PLAYER

   stFold/stUnfold write flatTarget, which is exactly what doFlatten and
   doUnflatten write - so the fold is the real tween, with the real slam and
   the real sound. What they deliberately do NOT touch is `flat`, the game
   STATE: nobody has folded, so nothing is crushed, nothing lands, and the
   son cannot be shifted by a fold he did not make. The picture folds; the
   rules stay where they were.

   The one exception is the ending, where the player really does press the
   button and the real verb really does run. That is the point of it.
   ============================================================ */
function stFold(){
  flatTarget=1;
  if(typeof SFX!=="undefined"&&SFX.fold)SFX.fold();
  if(typeof foldJolt==="function")foldJolt(true);
}
function stUnfold(){
  flatTarget=0;
  if(typeof SFX!=="undefined"&&SFX.unfold)SFX.unfold();
  if(typeof foldJolt==="function")foldJolt(false);
}

/* ============================================================
   THE CAMERA

   A scene is shot, not surveyed. recomputeBounds() fits the whole arena to
   the screen, which is right for a puzzle and wrong here: the street is
   fourteen squares wide and fitted to a phone the family is a quarter of the
   screen high, three small cubes in a picture that is mostly sky. So a beat
   may name a BOX - two corners in board cells - and recomputeBounds() fits
   that instead (it asks storyFrameBox(), guarded, because this file loads
   after the renderer). The renderer's own lerp toward the new centre and
   size carries the change over about half a second, so a reframe is a
   camera move, not a cut; the beat before a wide moment sets the wide frame
   so it has settled by the time the moment comes.

   The box is a FIT TARGET, not a clip: blocks and actors outside it still
   draw, they are just off centre and may run off the edge. A scene's `frame`
   is its first shot, in place before the first frame is drawn; stFrame() in
   a beat changes it; storyStop() nulling ST drops it and the next level's
   syncMeshes() fits its own board again.
   ============================================================ */
function storyFrameBox(){return (ST&&ST.frame)||null;}
function stFrame(box){
  if(!ST)return;
  ST.frame=box||null;
  if(typeof recomputeBounds==="function"&&typeof L!=="undefined"&&L&&L.blocks)
    recomputeBounds();
}

/* ============================================================
   THE CAPTION

   One line at a time, low on the screen, in the story's violet - which is
   the colour the intro card and the win card already say the fiction in,
   because violet means the hunters everywhere else in the game. `who` hands
   it an actor's own colour instead, so the mother speaks in the colour she
   is wearing.
   ============================================================ */
function stSay(text,who){
  var el=$("storyCap");
  if(!el)return;
  if(!text){el.classList.remove("on");return;}
  var s=(typeof tutWords==="function")?tutWords(text):text;
  el.innerHTML=s;
  var col=null;
  /* THE SON IS NOT AN ACTOR - he is playerMesh - so `who:"son"` has nothing
     to look up. He is the one speaker whose colour is a constant, and it is
     the same Rose the scene repaints him in. */
  if(who==="son")col="#"+stSonHex().toString(16).padStart(6,"0");
  else if(who){
    var a=stFind(who);
    if(a){
      /* A SPEAKER TOO DARK TO SET TYPE IN IS LIFTED, NOT SWAPPED. The line
         is drawn in the speaker's own colour, which is the point of `who` -
         and the father is Black, which as body text on a night ground is a
         line nobody can read. This used to fall back to the narrator's
         violet, which put his lines in the narrator's voice; the owner's
         rule is narrator violet, every cube its own colour. So a colour
         under a third of the way up the range is mixed most of the way
         toward white instead: Black speaks in a pale grey, which is still
         his and is not the narrator's. */
      var c=a.mat.color.clone();
      var lum=c.r*.299+c.g*.587+c.b*.114;
      if(lum<.34)c.lerp(new THREE.Color(0xffffff),.72);
      col="#"+c.getHex().toString(16).padStart(6,"0");
    }
  }
  el.style.setProperty("--say",col||"#a274ff");
  /* Restarted rather than left running: the element carries an entrance
     animation and re-writing its text alone would slide the second line in
     without it. Same trap the live star row is in - anything animated inside
     markup that gets rewritten has to be re-triggered by hand. */
  el.classList.remove("on");
  void el.offsetWidth;
  el.classList.add("on");
}
function stFadeTo(v,ms){
  var el=$("storyFade");
  if(!el)return;
  el.style.transition="opacity "+(ms||400)+"ms ease";
  el.style.opacity=v;
}
/* The last card. It borrows .won's full-bleed dim, like the tutorial's
   explanation card does, because it is the same kind of object - a screen
   that has taken the game away. It answers screenUp() for the same reason. */
function storyEndCard(){
  var el=$("storyend");
  if(!el)return;
  /* The caption goes first. The card carries its own line, and leaving her
     last one up behind it put two sentences about the same thing on one
     screen - which is what the shot showed. SKIP goes with it: the card is
     the end, so there is nothing left to skip past, and its own button is
     the only way on. */
  stSay(null);
  var ov=$("story");if(ov)ov.classList.add("done");
  el.classList.add("on");
  if(typeof SFX!=="undefined"&&SFX.mastery)SFX.mastery();
}
function storyEndOk(){
  var el=$("storyend");if(el)el.classList.remove("on");
  storyLeave("end",stDest(),260);
}

/* ============================================================
   THE TIMELINE
   ============================================================ */
function stEnter(i){
  if(!ST)return;
  ST.i=i;ST.t=0;
  var b=ST.list[i];
  if(!b){storyFinish();return;}
  if(b.at)b.at();
  /* `say` may be a function, evaluated now rather than when the table was
     written - which is what lets the ending read the wardrobe (stSkinLine). */
  if(b.say!==undefined)stSay(typeof b.say==="function"?b.say():b.say,b.who);
  if(b.await)stAsk(b.await);
}
/* Handing one verb back. On a button layout the bar comes up carrying only
   the fold button (body.storyask, css/98-story.css); on a gesture layout it
   stays down and the caption - written {do:2d} and rendered through
   tutWords() - says "Double-tap the world" instead. The layout decides and
   the sentence follows it, so the screen never asks for two things at once. */
function stAsk(verb){
  ST.await=verb;
  if(typeof syncHud==="function")syncHud();   // owns body.storyask
}
/* Called by the verb that was being waited for, from 12-play.js. */
function storyDid(verb){
  if(!ST||ST.await!==verb)return;
  ST.await=null;
  if(typeof syncHud==="function")syncHud();
  stEnter(ST.i+1);
}
function storyFinish(){
  if(!ST)return;
  var id=ST.id, to=stDest();
  ST.over=true;
  if(!ST.replay)storyMark(id);
  /* The ending does not leave on its own - it stops on the last card, and
     that card's button is the way out. The opening fades straight into the
     first tutorial. */
  if(id==="end")return;
  storyLeave(id,to,520);
}

/* Jump to a beat without waiting, for tools/shot.js. Everything before the
   target is run for its side effects and every walk is snapped to its last
   cell, which is near enough to the pose the beat holds. */
function storySeek(n){
  if(!ST)return;
  ST.seeking=true;                 // stAfter() runs its callbacks in line
  for(var i=0;i<=n&&i<ST.list.length;i++){
    var b=ST.list[i];
    if(b.at)b.at();
    if(b.say!==undefined)stSay(typeof b.say==="function"?b.say():b.say,b.who);
    /* Only the beat actually being seeked TO may arm its wait. An
       intermediate one would stop the timeline on a press nothing is going
       to make, and the seek would never arrive. */
    if(b.await&&i===n)stAsk(b.await);
    stSettle();
  }
  ST.seeking=false;
  ST.i=Math.min(n,ST.list.length-1);ST.t=0;
}
function stSettle(){
  if(!ST)return;
  var i,a;
  for(i=0;i<ST.actors.length;i++){
    a=ST.actors[i];
    if(a.path&&a.path.length){
      var c=a.path[a.path.length-1];
      a.x=c[0];a.z=c[1];a.path=null;
      a.mesh.position.set(a.x,a.y,a.z);
    }
  }
  if(ST.sonPath&&ST.sonPath.length){
    var s=ST.sonPath[ST.sonPath.length-1];
    player.x=s[0];player.z=s[1];ST.sonPath=null;
    if(playerMesh)playerMesh.position.set(player.x,player.y,player.z);
  }
}

/* ============================================================
   THE FRAME

   Called from animate() in 10-render.js with the camera basis it has already
   worked out, and with flatT PASSED IN rather than read: 10-render.js says
   flatT is a render value that nothing outside that file reads, and one
   cutscene is not a reason to make that untrue.
   ============================================================ */
function storyFrame(dtMs,rx,rz,tdvx,tdvz,ft){
  if(!ST)return;
  if(!stTmp&&typeof THREE!=="undefined")stTmp=new THREE.Vector3();
  var dt=Math.min(dtMs,60);          // a backgrounded tab hands back one huge frame
  var i,a;

  /* The son walks by having his cell written; the render loop's own lerp
     does the moving, so he arrives with the same weight every step in the
     game has. */
  if(ST.sonPath){
    ST.sonPt+=dt;
    if(ST.sonPt>=ST.sonMs){
      ST.sonPt=0;
      var c=ST.sonPath[ST.sonPi++];
      player.x=c[0];player.z=c[1];
      if(typeof SFX!=="undefined"&&SFX.step)SFX.step();
      if(ST.sonPi>=ST.sonPath.length)ST.sonPath=null;
    }
  }
  if(ST.sonHopIn>0)ST.sonHopIn-=dt;
  if(ST.sonSob>0)ST.sonSob-=dt;

  for(i=0;i<ST.actors.length;i++){
    a=ST.actors[i];
    if(a.path){
      a.pt+=dt;
      if(a.pt>=a.ms){
        a.pt=0;
        var cc=a.path[a.pi++];
        a.x=cc[0];a.z=cc[1];
        if(typeof SFX!=="undefined"&&SFX.step)SFX.step();
        if(a.pi>=a.path.length)a.path=null;
      }
    }
    if(a.hopIn>0){a.hopIn-=dt;}
    else if(a.hop>0){a.hop=Math.max(0,a.hop-dt/380);}
    if(a.sob>0)a.sob-=dt;
    if(a.going>0){a.going=Math.max(0,a.going-dt/420);if(a.going===0)a.mesh.visible=false;}

    if(!a.mesh||!a.mesh.visible)continue;

    /* THE PROJECTION, and it is the player's, line for line. u is the
       screen-right coordinate that survives a fold; the depth is thrown
       away and replaced with a fixed step toward the camera, so an actor in
       the plane stands in front of the paper rather than inside it. */
    var u=a.x*rx+a.z*rz;
    var fx=u*rx+ST_DEPTH*tdvx, fz=u*rz+ST_DEPTH*tdvz;
    stTmp.set(a.x+(fx-a.x)*ft, a.y, a.z+(fz-a.z)*ft);
    // A hop, and a sob: one is a bounce, the other is the same bounce far
    // smaller and never leaving the ground.
    if(a.hop>0&&a.hopIn<=0)stTmp.y+=Math.sin((1-a.hop)*Math.PI)*.30;
    if(a.sob>0)stTmp.y+=Math.abs(Math.sin(Date.now()*.009))*.05;
    a.mesh.position.lerp(stTmp,.26);
    a.mesh.rotation.y=Math.atan2(tdvx,tdvz);
    /* A plane actor exists only in the silhouette, so the fold is what
       brings her in. Squared, so she is not a ghost hanging over the first
       half of the tween - she arrives as the world lands. */
    var want=a.plane?ft*ft:1;
    if(a.going>0)want*=a.going;
    a.op+=(want-a.op)*.2;
    a.mat.opacity=a.op;
    a.mesh.scale.setScalar(a.size*(a.sob>0?1+Math.sin(Date.now()*.009)*.04:1));
    if(a.mesh.userData.outlines){
      /* The officers keep their red rim; everybody else takes the adaptive
         one the player takes, so a white neighbour is still visible against
         paper and a black father against the void. */
      /* AND THE RIM IS LOUDER THAN THE PLAYER'S. The player wears .5 because
         they are the thing you are looking at anyway; an actor is one of
         eight cubes on a wide board, and the black one is drawn against a
         night meadow. The adaptive rim is the only thing separating him from
         it, so here it is nearly solid. */
      if(a.rim!==undefined){
        a.mesh.userData.outlines.forEach(function(e){
          e.material.color.setHex(a.rim);e.material.opacity=.92*a.op;});
      }else if(typeof outlineFor==="function"&&scene){
        outlineFor(a.mesh,scene.background);
        a.mesh.userData.outlines.forEach(function(e){e.material.opacity=.85*a.op;});
      }
    }
  }

  // The son's own hop and sob, on the mesh the render loop has just placed.
  if(playerMesh){
    if(ST.sonHop>0&&ST.sonHopIn<=0){
      ST.sonHop=Math.max(0,ST.sonHop-dt/380);
      playerMesh.position.y+=Math.sin((1-ST.sonHop)*Math.PI)*.30;
    }
    if(ST.sonSob>0){
      playerMesh.position.y+=Math.abs(Math.sin(Date.now()*.009))*.05;
      playerMesh.scale.setScalar(1+Math.sin(Date.now()*.009)*.05);
    }
  }

  // And the clock. Held while a beat is waiting on the player.
  if(ST.await||ST.over)return;
  var b=ST.list[ST.i];
  if(!b)return;
  ST.t+=dt;
  if(ST.t>=b.ms)stEnter(ST.i+1);
}
