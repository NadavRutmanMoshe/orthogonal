# The look - the block, the sky, the surfaces, the plane

> Moved out of `CLAUDE.md`, verbatim. `CLAUDE.md` keeps the one-line
> invariants; this file keeps the reasoning behind them. Read it before
> *redesigning* the thing it describes, not before editing it.
> `docs/HISTORY.md` has what was tried and dropped.

## The look - the block, the sky and the air

**The complaint was that it had good mechanics and did not feel like a game**,
and the first answer - a finer texture on a flat cube - was correctly rejected
as a finish rather than a redesign. What landed changes the *shape* and the
*value structure* of a block, and gives every section its own weather.

### The block

A block is a dark case with a **lit rim** - one of three languages rendered
side by side and picked from the screenshots. Two things make it free:

- **It is one merged geometry shared by every block in the world**
  (`makeBlockGeo`, built by `mergeBoxes`), so a block is still exactly one
  mesh and one draw call. The rim is four thin bars riding the top edges,
  geometry rather than lines, so it survives the fold and the depth fade like
  everything else.
- **Per-face brightness is baked into a vertex-colour attribute**, which
  three.js multiplies by `material.color` - and `material.color` is rewritten
  every frame by the block loop (depth fade, peril red, the lerp to ink). So
  the whole redesign inherited that behaviour without the block loop changing
  by a line. This is the same trick a texture would have used, and it is the
  reason to reach for `map` or `color` attributes rather than for the one
  channel the game already owns.
- **The rim is a value, not a colour** - the body's hue pushed past 1 - so a
  section that tints the stone tints the rim with it, and there is no second
  palette to keep in sync.
- **`boxGeo` and `edgeGeo` were swapped in place** rather than joined by a new
  name, because blocks and crates are the only things that used them.
  `edgeGeo` is cut from the **case** (.9), not from a full cell, or a hairline
  floats in the seam the inset creates.

### The sky and the air

Both hang off the **camera**, not the scene. The camera turns in 90° steps and
the player never sees these move with it, so they read as screen-space
atmosphere rather than as objects in the world the fold would have to account
for.

- **The sky is one quad with two real gradient stops** written into its colour
  attribute - not a white-to-black ramp times a material colour, because one
  multiply cannot make two hues.
- **It folds to paper with everything else.** It replaced `scene.background`,
  which was being lerped void-to-paper every frame; a gradient that stayed
  dark behind a white page would be the one thing on screen that had not
  noticed. `scene.background` is **kept alive anyway** - the loop still hands
  it to `outlineFor()` as "what the player is drawn against". Nulling it was
  tried and threw once a frame.
- **The air is a handful of round motes**, rebuilt per section. Round because a
  drifting square reads as debris; and **`depthTest` stays on**, because
  three.js renders transparent objects after opaque ones whatever their
  `renderOrder`, so without it the weather draws over the puzzle.
- **A section may `flare`** - the void warms for a beat every `flare` ms. That
  is the eruption, expressed as the sky doing something rather than as a
  mountain drawn behind an abstract puzzle. It starts a third of the way into
  its cycle: from zero it landed about a second after the level opened, while
  the player was still reading the board, and read as a glitch.

### What a section does - and the one rule that keeps it safe

`SECTIONS[].theme` is a sky gradient, a stone colour and an ambient field.
`col` beside it is a **UI** colour that has to read as a tab on a dark panel;
they are deliberately not the same value. `applyTheme()` runs once per level
from `loadLevel`, not per frame.

**THE STONE IS DESATURATED ON PURPOSE.** The pieces carry fixed identities -
fire is orange, water is cyan, a crate is violet, an anchor is amber - and
they are what a puzzle is made of. A saturated world was rendered and it hid
the piece it was teaching: a red world swallowed a fire block whole, a blue
one swallowed water. **Muted world, saturated pieces, and both read.** If you
raise a `block` value, go and look at that section's fire and water before you
keep it.

**THE SECTIONS ARE ELEMENTS: nature, fire, water, sand.** That is the owner's
call and it reverses a permutation this file used to argue for - the old rule
put the fire section in *frost* and the water section in *ember*, on the
grounds that theming a section in the colour of the piece it teaches
camouflages exactly what it exists to show. The camouflage risk is real and
has been paid for rather than ignored: **the element lives in the horizon,
the weather and the sound, and the sky over it still leans the other way.**
So section III is an ocean at *sunset* - unmistakably water, with a warm sky
that keeps a cyan water block singing - and section II keeps its near-black
basalt under a fiery sky rather than glowing orange. The desaturation rule
below is untouched, and it is still the check: **if you raise a section's
`block` value, go and look at that section's fire and water.**

**`IV · DESERT` (was `IV · CRATES`) moved off violet onto sand**, which fixes the one place the
old permutation was broken anyway: a crate is drawn violet, so the section
teaching crates was wearing the colour of its own piece. Sand is kept pale
and low in chroma so it does not collide with the trial's saturated amber
either; the node shapes are what actually tell those apart.

The same rule one level up put `I · NATURE` on olive rather than a true
green: the goal is a saturated teal-green wireframe and it appears in *every*
section.

**Each section carries an `amb` and its own moving layer.** `theme.amb` names
the ambience (`birds`, `fire`, `sea`, `wind`) and `theme.scene` names both
the baked horizon and the sprites that go over it - `trees` brings birds,
`hell` brings meteors, `ocean` brings sailing boats, `desert` brings a
tumbleweed and a dust devil. One field decides both, so the sound and the
picture cannot drift apart.

### Surfaces, and why water lost its ring

**Water and fire are their own shape now** - a full cell with a surface plate
a little below the top (`makeLiquidGeo`), where stone is the inset case with
the lit rim. They are told apart in silhouette before a colour is read, which
is what retired water's marker.

**Only the anchor still carries a symbol.** Water became a shape and lost its
ring; a crate became obsidian and lost its bars. The anchor is the last piece
that is still ordinary stone in a different colour - amber - so it is the
last one that needs a mark. **The rule is that a marker is what stands in for
a form a piece does not yet have**, and it comes off the moment the piece
gets one; it was never decoration.

**A crate is obsidian**: a near-black glassy body with sharp facets and
violet fire in the cracks. It is the first piece whose texture also drives
`emissiveMap`, which is what makes the veins *light* the block rather than
being painted on it - a multiply alone leaves a vein exactly as dark as the
body it runs through. It keeps its two-bar marker, because obsidian and
basalt are both near-black and until a crate has a form of its own the marker
is the thing that says which is which.

**Surfaces are drawn, never loaded**, one canvas per look, laid out as
`[ side | top ]` in one image. `mergeBoxes` remaps the UVs so faces +Y/-Y
sample the right half and the four sides the left. **This is the only way to
get two hues onto one block**: a grass block is green over brown, and no
multiply of one `material.color` makes two colours. The map is a *relative*
statement, so `material.color` still carries the section tint, the depth
fade, the peril red and the lerp to ink - the block loop never changed.

- `magFilter` is `NearestFilter`: the chunky read is the point, and a
  smoothed 128px texture is just mush at play size.
- **THE GRAIN IS DELIBERATELY NOT A PIXEL GRID, and that is a commercial
  decision rather than a taste one.** The first cut drew square cells on a
  16px lattice, which is a very particular published game's look. Nothing was
  ever copied - there are no image files in this project and every pixel is
  drawn by `10-render.js` - but a style is recognisable without an asset
  changing hands, and this game is meant to be sold. So the grain is rounded
  and irregular (`blobs`, lumpy six-point discs on a jittered lattice), the
  greens are brighter and warmer than the obvious ones, the sides are clay
  rather than dirt, and water and lava are drawn as **flowing bands and veins**
  rather than as hot and cold cells. Basalt is the one angular surface,
  because it should read as broken rather than as grown. **If you retouch
  these, keep them off the lattice.**
- **A section's stone colour goes near-white when it has a surface**
  (`0xbdbdbd` for grass), because the texture is carrying the hue and a
  saturated tint would double it into ink.

**A block outlives its level, and that bit.** `syncMeshes` keys meshes by cell
and `addMesh` returns early when one is already there, so a block standing in
the same place in the next level is *reused* - and keeps the surface it was
built with. Crossing from grass into basalt left every shared cell wearing the
old ground. `applyTheme` now drops all block meshes when the surface changes
and lets `syncMeshes` rebuild them.

### The things that move in front of the horizon

**The band is baked, so everything alive is a second layer.** `spriteTex()`
builds one canvas texture per kind and `spriteGroup()` hangs a few planes
off the camera sharing it; `layoutAtmosphere()` places them in **frustum
fractions**, so they hold their place on screen while the camera follows the
player, exactly as the sky and the band do. All of them fade with the fold -
there is no distance in a silhouette, so there is nowhere for a bird to be.

- **Birds are a V, and the flap is the V opening and closing** - a scale on
  one axis, not a second drawing. At fifteen pixels a V is the whole of what
  a bird is.
- **The wind is one number moving three things.** `windAt()` is two sines at
  unrelated rates, and it leans the treeline band, carries the birds and
  blows the leaves. The treeline cannot move - it is baked - so what sells
  wind is everything *else* agreeing about it. A horizon that leans while
  nothing else does reads as the camera wobbling.
- **Leaves fall and tumble** (`air.kind:"leaf"`). The tumble is a squash on
  one axis rather than a spin, because these are little discs and a disc
  turning on its own axis is still a disc.
- **A meteor waits, and then it LANDS.** `wait` holds each one off screen for
  a few seconds, so the sky is mostly empty and a streak is an event; a
  continuous rain of them is a screensaver.
  - **The trajectory is one vector, and that was the bug.** The first version
    took an angle for the sprite's rotation and then moved it by a different
    pair of numbers - always rightward, and downward by the *absolute* sine -
    so a meteor pointed one way and travelled another. The angle is now
    chosen once over a 90° fan of downward directions, the sprite is turned
    to it, and the position walks along it.
  - **The end of the flight is the horizon**, so the flight length is derived
    from the angle (a shallow one crosses further than a steep one) and the
    landing point is chosen *on screen* first, with the start worked
    backwards from it. A streak that ends where nobody can see it is not an
    event.
- **The sun the glitter road belongs to.** The road was there with nothing at
  the top of it, which is a reflection of something not in the picture. It
  sits on the horizon at the road's own x - the road is drawn from .52 to .60
  across, so the sun is centred at .56 and the two cannot drift apart.
- **The foam is the only living part of the sea**, because the band is baked.
  It runs up the beach on a root curve rather than a straight one, which is
  what water climbing sand does, and it is timed off the same clock as the
  crash.
- **Boats sit on the waterline, and it is derived rather than nudged.** The
  band is `h*.30` tall centred at `-h*.19` and the sea starts 96 rows up a
  160-row texture, so the horizon is `-h*.34 + .6*h*.30`. Anywhere else and
  the boat is the wrong size for the water it is on.
- **The tumbleweed's spin is tied to its travel.** A ragged ball sliding
  sideways is litter; one turning at the rate it moves is a tumbleweed. It is
  the only sprite in the game that rotates on its own axis.
- **The dust devil is one soft cone with the swirl painted into it.** A
  hundred grains at that distance is a smudge that costs a hundred draw calls
  to be.

### Scenery

One textured quad on the camera, per section: a treeline, or the ridge and the
things moving along it. Silhouettes rather than lit scenery, because the game
is an orthographic abstraction and a rendered forest behind it is a different
picture with a puzzle sitting on top.

- **The glow is drawn before the ridge and has to be strong.** A near-black
  spire on a near-black sky is nothing; the bright band is what the silhouette
  is a silhouette *against*.
- **Broad and low, never needles.** The first cut ran spires to 132px of a
  160px canvas and grew a picket fence up through the puzzle. A horizon sits
  *under* the thing being played.
- **It is raised off the bottom edge**, because the control bar lives there.
- **Faded right out in the plane**: there is no distance in a silhouette.
- **Every section has a horizon now**: a treeline, hell's ridge, canyon
  mesas, broken columns, and a few floating slabs for the shelf. Flat tops,
  spikes, canopies and pillars are four silhouettes nobody can confuse, which
  is the point - a section should be identifiable from its skyline alone.
- **`repeat.set(2,1)` for a band that is pure texture, `1` for one with a
  LANDMARK in it.** Hell has a volcano, and a volcano that tiles is two
  volcanoes.
- **Lava comes OUT of the volcano rather than being drawn on it.** A single
  stroke down the flank reads as a crack in the rock. What says "flowing" is
  a stream that starts narrow at the mouth and **widens as it falls**, with a
  hotter core inside a cooler edge, ending in something pooled and bright at
  the foot - plus spatter thrown clear of the mouth.
- **The volcano's crater is a radial gradient filled through a circular
  path.** A linear gradient in a `fillRect` draws a visible box - the ramp
  runs one way and the other three edges stop dead - which on a dark ridge
  reads as a lit rectangle sitting on the mountain. Anything glowing has to
  fade out on every side it has, and the same mistake made the plume's own
  quad visible until its falloff was pulled inside its edges.
- **The plume ramps on `skyWarm`**, the same value that warms the sky, so the
  eruption and the flare are one event rather than two things that happen
  near each other.
- **NOTHING IN THE BAKED TEXTURE CAN MOVE**, and that is the price of the
  horizon being one quad and one draw call. The volcano was reported as not
  moving because everything in it - the cone, the flows, the crater - is
  painted into the scenery texture. Motion has to be drawn *on top*: sparks
  thrown out of the mouth (`makeSparks`), and a plume that **breathes at
  idle** as well as swelling on the flare. A glow that only moves once every
  seventeen seconds is a still picture for sixteen of them, which is exactly
  what "it is not moving" meant.
- **`r[2]` bit twice.** After the spires, the mesas and the columns were
  written with `r[3]` on three-entry rows and came out `NaN` tall, invisible
  and silent, exactly as documented above. There is now a check for it:
  sample each horizon's base row and assert it has opaque dark pixels.
- **Stars are fixed, not drifting** - that is the whole difference between a
  star and a mote - seeded so a section's sky is the same sky every time, and
  kept to the upper half of the frame, because a star behind a block is a
  star nobody sees.
- **Trees are rounded canopies in three hazed ranks, kept to the lower half
  of the band, scattered rather than spaced.** The step between them runs
  from well under a canopy width to well over it, so they clump and leave
  open ground; an even step reads as a fence. A band of grass tufts along the
  bottom joins them to the picture - without it the trunks ended in mid-air
  and the wood looked pasted on. The first cut was one row of stacked conifer skirts and read
  as a sawblade; the second ran canopies to the top of the canvas and became
  a wall the puzzle sat on. What sells distance is the pale haze *between*
  the ranks, and it is a gradient - a flat wash put a hard horizontal line
  across the forest that read as a seam in the drawing.
- **`[depth, colour, height]` is three entries and the height is `r[2]`.** It
  was written as `r[3]` to match the treeline's four-entry rows, which made
  every spire `NaN` tall - and **canvas draws nothing for a NaN path and
  throws nothing either**, so the band rendered as a bare gradient and looked
  like a colour choice rather than a bug. If a procedural drawing comes out
  empty, sample the canvas before re-picking the colours.
- **The demons are scenery and never enter the world.** Nothing on that band
  is a hunter, and a shape a player could mistake for one is a lie the fight
  has to pay for.

### The plane is the world, flattened

**`INK_SETTLE` (0.18) is the whole control.** It is how far a block settles
toward ink when the world folds: 1 is the old behaviour - everything becomes
a black silhouette on paper - and 0 keeps the world exactly as it looked
standing up. It went from 1 to 0.18 because the plane was reported, twice, as
looking like a different game: a grass block folded into a black rectangle
and nothing but the geometry said the two pictures were the same place.

**What tells you that you are flat is not the palette.** It is the world
visibly collapsing, the grid coming in, and the button saying `GO 3D`. The
picture does not have to change colour to say it, and when it did, it said
something untrue instead.

Consequences worth knowing:

- **The paper is DERIVED from the sky, not authored** - `theme.sky[0]` lerped
  `PAPER_LIFT` (0.20) toward white. Hand-picked papers were tried twice and
  were wrong twice in the same direction: the first set was near-white, the
  second was a "lighter relative" that still came out as a bright day over a
  night meadow. A section only says what its sky is; the plane cannot drift
  away from it. `theme.paper` still overrides if one is ever needed.
- **`PAPER_LIFT` is the whole cue, and it is small on purpose.** At 0 the
  fold changes no colour at all. Every time it has been raised the plane has
  stopped looking like the same place, and what actually tells you that you
  are flat is the world collapsing and the button reading `GO 3D`.
- **The chrome follows the ground, not the verb.** `body.flat` swaps the HUD
  to dark-on-light, which was right when the plane was paper and is wrong on
  a night meadow. `syncHud` now asks `paperIsLight()` - Rec. 709 luma over
  `colPaper`, thresholded at .55 so a mid-tone counts as dark - so a dark
  section keeps the chrome it already had, and a wardrobe world with a pale
  paper still behaves exactly as it always did.
- **`applyPalette()` puts the section back.** Sections own the world now, and
  the wardrobe writes `colVoid`/`colBlock`/`colPaper`/`colInk` on every skin
  change - which happens *after* `loadLevel` set the theme - so it ends by
  re-applying `curTheme`. `applyTheme` only rebuilds the motes, stars and
  scenery when the theme actually changed, so that call is cheap.
- **The horizon stays, receded** (`1-flatT*.62`) rather than fading out. Now
  that a folded block keeps its colour, a horizon that vanished was the last
  thing still insisting the plane is somewhere else.
- **`inkLift()` is gone.** Driving the texture through `emissive` was a
  workaround for colour having gone black; with the colour still there the
  map multiplies normally and the grain simply shows.
- **Stars stay in the plane**, dimmed. The plane is the same sky in different
  light now, so a sky that emptied on the fold was the last thing still
  saying otherwise.
- **The grid is the editor's.** It used to draw in the plane as the cue that
  you were flat, back when flat also meant a different palette. A ruled
  overlay across a meadow was the one thing left that looked like a diagram
  rather than a place; the collapse, the sky lifting and the button reading
  `GO 3D` all say it without one.

### Water moves

The texture is shared by every water block in the world, so **scrolling its
offset animates all of them for the cost of two numbers a frame**. Only V is
scrolled - the atlas is `[ side | top ]`, so scrolling U would bleed the
surface into the sides. On top of that the whole mesh carries a few
hundredths of a cell of swell, **phased off the block's own x and z** so a
pool ripples instead of pumping in unison, and suppressed as the world folds
because a wave in a silhouette is noise.

### Water in the plane - a trace, then a drain

Water casts nothing into the silhouette; that is the rule and it has not
moved. But a player who folded while standing **on** water was left hanging
over nothing, which reads as a bug rather than as a mechanic.

So the fold leaves the water behind as a **shallow trace** under their feet -
sunk low in the cell, no edge on it, dimmer than it was standing up - and
their **first step in the plane drains it**: it sinks out of the square, the
spill plays, and it is gone. `drainWater()` is called from `press()` before
the move resolves, so the splash starts on the frame the player leaves.

That is the honest version of the rule rather than a softening of it: the
water was there, it is leaving, and once you have moved it is not coming
back. The trace is deliberately shallow and unlit so it never looks like
ground you could return to. `doFlatten` resets it, and so does standing back
up, so a re-fold shows the trace again.

- **The trace hangs from the TOP of the cell, not the bottom.** Scaling a
  mesh shrinks it about its own centre, so thinning it left the water on the
  floor of the square while the player stood on the square's ceiling - which
  reads as standing on air above a puddle. Raising by half the height lost
  keeps the *surface* where it was.
- **Only a move that exists drains it.** The plane has no up or down, so
  draining on any press let a stray swipe empty the water without the player
  having gone anywhere.
- **ONE BLOCK - the one you folded on - and it does not follow you.** The
  trace answers exactly one question, *why am I not falling through this
  square*, so it is needed on the single block that was under the player at
  the moment of the fold. A trace that filled the next block as you arrived
  made the plane look like it still had water in it, which is the opposite of
  what the rule says. `markWaterTrace()` captures it in the volume, before
  the fold resolves, because "the block I was standing on" is a fact about
  the world before it collapsed.

### Fire in the plane

**A flame is a lick, not a cone.** Four cones on a block was reported as
looking bad and it did: a cone is a solid object with a lit side and a dark
one, which is the one thing a flame is not. It is a flat tapered strip with
the colour in its vertices - white-hot at the base, gone at the tip - turned
to face the camera every frame, so there is no solidity to shade.

**Four flames, and in the plane they stand OFF the block with a gap.** In the
volume they cluster on the crust; flattened they line up evenly across the
cell, above it, smaller, spread along **screen-right** - the axis the fold
leaves intact, so the row reads as a row from whichever side you folded. The
gap is the load-bearing part: it says *this is not part of that block*, which
is the whole problem a silhouette creates. Both layouts live on each flame
and `fireFlames` crossfades them on `flatT`.

**They rise clear of the block when the world folds, and stop testing
depth.** Flattened, every block at every depth lands in one silhouette square,
so a fire block behind a stone one is drawn inside it and there is nothing to
see - in the square a player most needs to know is lethal. So in the plane
they climb and draw over whatever shares the column (`fireFlames`). In the
volume they sit on the block and behave normally, because there depth is
information rather than something in the way.

### The spill

`SFX.spill()` is `noiseFall` - the same two parts as `noiseRise` with the
bandpass ramp inverted. A riser climbs because something is arriving; a spill
falls because something is leaving. It plays on a fold **only on a level that
has water**, layered over `fold()` rather than replacing it, because the fold
is still the move the player made.


## The trail

Every square the player has stood on wears a soft blot of `--player` on its
top face. It exists because an orthographic camera will not say what depth is:
two blocks a long way apart can sit a pixel from one another on screen, and
after four folds and two turns "have I already been over there?" is a question
the screen has no answer to. The trail is the answer, and it is free to read.

**It is the player's colour and nothing else's.** Every other mark on a floor
in this game means *do this* - the goal's wireframe, the landing rings, the
tutorial's green. A history has to be distinguishable from an instruction at a
glance, so it wears the one hue that already means *you*: the same token the
shadow under your feet and the shield bubble read.

**It is a disc, not a tile.** A hard square on a block's top face reads as
another kind of block, which is the one confusion a game about telling blocks
apart cannot afford.

**And it carries its own contrast.** The first cut was one soft blob at .30
and it failed on the case that matters: a green skin standing on grass. A
single translucent colour can only be seen against a ground it differs from,
and the player picks the colour - so the ground it has to work against is
every surface in the game, in every hue the wardrobe sells. So the mark is
drawn the way the player's own piece is: a lit body with a **dark rim**. Both
come out of one texture and one material - `material.color` is the hue and the
texture multiplies it, so a texel of RGB 1 paints the hue at full strength and
a texel of RGB .10 paints a near-black ring *of that same hue*, whatever it is.
On a bright surface the ring is what you see; on a dark one the body is. The
bands are written per pixel rather than as a gradient because they have to be
crisp: a feathered rim is a soft edge, and a soft edge is exactly what was
invisible. The hue is lifted a quarter of the way to white first, so Black
and Brown still read as marks rather than smudges. `TRAIL_A` is .62.

**Three rules decide which squares get one**, and the middle one is the
interesting one (`trailHere`, `trailColumn`, `trailFlatStep` in
`js/12-play.js`):

- In the volume: the block under your feet.
- **On the fold: the run from your own block forward to the one nearest the
  camera**, and *forward* is the whole rule. The floor you stand on in the
  plane was made by several blocks at once, but only the ones between you and
  the front are places the fold actually took you through - a block behind you
  in depth shares the silhouette and was never crossed, and painting it says
  you have been somewhere you have not. The run says which *line through the
  world* you flattened, and it is still legible after the unfold, when those
  blocks are far apart again. No maximum has to be computed: nothing sits in
  front of the front block, so "every solid at or ahead of my depth" stops
  there on its own.
- Moving while flat: one block, the one `R.pick(R.landings(...))` returns -
  the same call `doUnflatten()` makes, so the mark and the landing can never
  disagree. Marking the column on every flat step would paint the whole world
  in four moves, which is not a trail.

**It goes when the world folds**, on the same `flatT<.45` test the anchor's
mark uses: in the plane the top faces are edge-on and every decal on them is a
hairline of noise laid across the silhouette, which is the thing being read.

Mechanically the decals are children of the block meshes, so they fold, scale
and travel with the block for nothing, and they die with the block when
`syncMeshes()` drops it - which is why `trailSync()` re-attaches after every
rebuild and `trailSet` (cells, not meshes) is the truth. One shared material
for all of them, so `applySkin()` recolours the whole trail with one write.
It is cleared and re-seeded at the player's feet on load, restart and respawn:
a route already abandoned is not orientation. **Undo does not take a mark
back** - the trail is where you have been, not where you are.
