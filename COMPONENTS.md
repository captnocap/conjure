# Adding a component

Conjure grows by components. Each one is a folder that nothing else lists or imports, so any
number of people or agents can add components at the same time without touching the same file.

```bash
npm run new thing lamp-post        # or: world gas-station-aisle, look pencil-rubbing, direction midnight-radio
npm run dev                        # leave running; new folders are picked up live
npm run check things/lamp-post     # build it six times with random answers (needs a Playwright Chromium: npx playwright install chromium)
npm test                           # the independence rules, no browser needed
```

A component is finished when `npm run check <id>` and `npm test` pass and you have looked at
its contact sheet in `.data/check/`. A direction is finished when `npm test` passes and a few
ideas conjured under it look the way its words say.

## The four kinds

| Kind | Folder | What it is | Returns |
| --- | --- | --- | --- |
| thing | `components/things/<name>/` | One placeable object: a chair, a tree, a shelf of crisps, a moon | `Thing` |
| world | `components/worlds/<name>/` | A setting: ground, light, camera, and where things stand | `World` |
| look | `components/looks/<name>/` | A treatment of the finished frame | pixels |
| direction | `components/directions/<name>/` | The art direction a whole picture follows: words the model reads with every question, and the finishing passes it brings | `Direction` |

The id is the folder path (`things/lamp-post`). It cannot collide with anyone else's.

## The two files

**`manifest.ts`** is read for every idea, so it holds data only and imports nothing but
`@conjure/kit`.

```ts
export default defineManifest({
  kind: 'thing',
  title: 'Lamp post',
  summary: 'A cast-iron street lamp with a glass lantern. Evening, waiting, a pool of light, old cities.',
  scales: ['street'],
});
```

The model decides whether your component belongs from `summary` alone. Say what it is and
what it evokes. A summary that only names the object gets cast only when the idea names it.

Look manifests should also declare `medium`: `realism`, `painting`, `game`, `print`,
`optical`, `craft` or `mixed`. The director chooses this family before choosing its look,
so adding several print processes does not crowd out painting or photography. Older looks
without the optional field remain compatible and join `mixed`.

**`build.ts`** is loaded only when the component is cast. It holds the component's questions
and builds it from the answers.

```ts
export default defineThing({
  questions: {
    lantern: choice('What kind of lantern?', {
      gas: 'A four-sided gas lantern with a chimney.',
      globe: 'A white glass globe.',
    }),
    lit: noul('Is the lamp lit?'),
    height: score('How tall is it?', ['Knee high', 'Head high', 'Towering']),
  },
  build(answers, context) {
    // answers.lantern is 'gas' | 'globe', answers.lit is boolean, answers.height is 0..1
    return { object, dispose };
  },
});
```

## A thing that is a model file

A thing does not have to be built from primitives. `loadModel(url, context, { height })` from
`@conjure/kit` loads a GLB that sits in the component's own folder, clones it for each build, stands
it on y = 0 centred on the origin and scales it to `height` metres; the engine's paint and material
passes then dress it like any procedural thing. Keep such files out of the public catalogue (the
`components/things/tripo-*` folders on rack are gitignored): the public inventory is procedural.

```ts
const TAKES = [new URL('./take-1.glb', import.meta.url).href, new URL('./take-2.glb', import.meta.url).href];
build: (answers, context) => loadModel(TAKES[Math.floor(context.random() * TAKES.length)], context, { height: 1.2 }),
```

## Questions are the inventory

Every question is put to the decision model together with the idea, and it answers with
probabilities. Ask about anything that should change with the mood.

- `choice(ask, { key: description })` picks one key. The model judges the **description**, so
  describe how each option looks or feels. Any number of options is fine.
- `score(ask, [levels…])` gives a number from 0 (first level) to 1 (last level).
- `noul(ask)` gives a boolean.
- `choiceFrom(ask, list, key, describe)` builds a choice from a catalogue.

Phrase conditional questions as conditions ("If it carries a mural, of what?"), because every
question is asked whether or not it ends up mattering.

Do not ask about what `context.mood` already settles: `wear`, `warmth`, `energy`, `density`,
`daylight` and `cheer` are decided once per idea so that separate components agree. Read them.

## Colour

The decision model can colour anything. Every cast thing is asked for a main colour and a trim
colour, and every world for a main colour, a trim colour, a light colour and a sky colour. Each
question's first answer is "as made", so a component keeps its own colours unless the idea names
some ("a red bicycle", "a pink city at night", "a grey overcast"). The engine repaints after
`build`: surfaces are grouped by colour, the largest group takes the main colour, the rest take the
trim colour, shading inside a group is kept, and gold, silver and copper also make the surface
metallic. You do not have to do anything for this to work, but it works best when:

- the main body and the trim are different materials (or different vertex colours), not one texture;
- glass is `transparent` with `opacity` under 0.6, which the repaint leaves alone;
- painted patterns and lettering are textures (`map`), which are tinted rather than replaced.

When a component has a colour that matters on its own terms (a neon sign's tube, a flag's field, a
bus company's livery), ask about it in the shared vocabulary: `paint(ask, names?)` from
`@conjure/kit` is a `choice` among the named colours in `PAINTS`, and `paintHex(answer)` gives its
hex (`paintIsMetal(answer)` says whether to raise metalness). Using the same names as the engine
means the model's sense of "teal" or "crimson" is the same everywhere.

```ts
questions: {
  neon: paint('What colour is the neon tube?', ['magenta', 'turquoise', 'red', 'lime', 'amber', 'white']),
},
build(answers, context) {
  const tube = s.material(paintHex(answers.neon), { emissive: paintHex(answers.neon), emissiveIntensity: 2 });
```

Do not name your own questions `paintBody`, `paintTrim`, `paintLight` or `paintSky`: the engine
asks those. Plain studies and conformance checks skip the engine's colour questions, so your
contact sheet shows the component as made.

### The palette (looks)

Paint colours the objects; the palette colours the print. Once per idea the model chooses
`context.palette`: an `ink` (the colour that carries the picture), a `ground` (the paper, stock or
field) and a `second` colour (echoes, separations, accents), all paint names, toured on rerolls. A
look that prints in inks of its own design must not pick their hues itself. Keep the designed set
(its lightness and contrast are the look) and re-key it:

```ts
const TONERS = { ember: { black: [25, 12, 28], hot: [236, 91, 47], flash: [255, 191, 92], drift: [137, 70, 125] }, … };
const ROLES = { black: 'ground', hot: 'ink', flash: 'ink', drift: 'second' } as const;
const { black, hot, flash, drift } = rekey(TONERS[answers.toner], context.palette, ROLES);
```

Each colour keeps its tonal place (black stock stays black, a flash stays pale), lands on its role's
hue with the group's internal hue offsets kept, and takes the palette's vividness; a grey palette
drains it. Leave out a colour that must not move (a colourless bone toner, paper white, the
graphite of a pencil). `rekeyOne(colour, palette, role)` does one colour. Without a palette (plain
studies, conformance checks, replays of older pictures) `rekey` returns the set unchanged.

If a question chooses among those sets, describe each option by its character (electric, smouldering,
pale, earthy), not its hues: the hues come from the palette, so naming them would mislead the model
and the decision sheet. Keep the option keys, which older pictures pin. Naturalistic looks
(photographic, old-master light) and looks whose colour comes from the capture ignore the palette.

Lessons from converting the catalogue:

- If the look matches the scene's colours to a designed set (stones, glass, pigments, floss), match
  against the set as designed and paint with the re-keyed one, so each piece keeps its place.
- A wide-hue set (a rainbow, a riso set, a pigment box) keeps its offsets and so stays a rainbow in a
  new place. Halve the offsets, or split the set between `ink` and `second`, for the palette to show.
- Single-colour options that differ only in hue all land on the same colour; give each its own
  lightness or vividness after re-keying so the choice still means something.
- Dark line on pale paper: a pale ink is lifted toward its own lightness, so keep the line below the
  paper by its designed margin.
- Machine and tradition palettes (a Game Boy's greens, CGA, a Byzantine gold ground, a red seal) stay;
  the free options beside them follow.
- `node dev/palette-sheet.mjs looks/<name> <question>` renders the look as made and under five
  palettes, one row per option, into `.data/palettes/`. Read it before you call a look done.

## Materials

Paint colours a thing; a material says how its surface meets the light. Every cast thing is asked
what the idea says it is made of (one question, "as made" first), and every setting what its stuff
and its backdrop are made of, in a shared vocabulary of twelve: chrome, brushed, gloss, satin, matte,
velvet, rubber, leather, glass, glitter, wet and glow (`MATERIALS` in `@conjure/kit`). "A chrome
skull", "a velvet armchair", "a glitter void of stars" and "a wet street after rain" work for
components that never thought about their surfaces: the engine dresses what was built, after the
paint. The body surfaces (the same body the paint colours, or everything for a setting) are tagged
and their metalness, roughness, transparency and glow set to suit; glitter and leather take a relief
the live render catches the light with. You do not have to do anything for this to work.

The capture carries every surface's material to the print. `capture.material` holds metalness,
roughness, the named material and glow per pixel; `surfaceAt(capture, index)` decodes it, and the
backdrop reports the setting's `capture.backdrop`. Surfaces nobody named still say what they are: a
thing built with `metalness: 1, roughness: 0.1` is chrome in the print, a `roughness: 0.1` lacquer
is glossy, an emissive tube is luminous. `impliedMaterial(surface)` gives the material a surface
shows and how strongly. Shine, sparkle and light are read from a build, never flatness, so an
ordinary thing in an ordinary print is left alone.

When a thing has a surface that matters on its own terms, declare it: `madeOf(material, name)` tags
a Three.js material for the capture and sets it to suit, and `material(ask, names?)` is a choice
among the shared names for a component's own questions, like `paint`.

```ts
build(answers, context) {
  const seat = madeOf(s.material('#5a1c2c'), 'velvet');
  const frame = madeOf(s.material('#c9ccd1'), 'chrome');
```

Do not name your own questions `materialBody` or `materialSky`: the engine asks those. Plain studies
and conformance checks skip them, so your contact sheet shows the component as built.

### Materials in a look

After the look and any accent, the engine's materialize pass (`engine/materialize.ts`) shows each
material through the print in the print's own lightest and darkest colours, so a watercolour stays
a watercolour and a toner print a toner print: mirror metal takes banded reflections, brushed metal
long streaks, lacquer a hard glint, satin a broad sheen, chalk loses its highlights and gains a
tooth, velvet darkens where it faces you and lights along its edges, rubber dulls, leather takes a
pebble grain and creases, glass rims with light, glitter twinkles (a sky of stars on a dark backdrop,
dark sequins on pale paper), wet things darken with tall streaked highlights, and a luminous thing
haloes. One typed routing decision, how much the surfaces show through the medium, scales it from
nothing to fully and tours on rerolls. Plain studies and replays of older pictures skip it.

A look that can do better in its own medium declares `materials: 'own'` and reads `surfaceAt`
itself; the engine then leaves its print alone. Stained glass is the model: metal becomes silvered
mirror glass that reflects the room instead of passing the light behind it, brushed metal and
leather take a hammered sheet, glitter a seedy one full of flashing bubbles, wet things water glass,
matte goes sandblasted, rubber and velvet near-opaque dark glass, glass clear crown glass, and a
luminous pane burns brighter and spills more halation. Keep the medium: a material is a different
glass, pigment, stroke or plate, never a highlight pasted over the print. `sparkleAt(x, y, normal,
half, cell, seed, step)` is the shared glitter, so every medium twinkles the same way round a loop.

`node dev/materialize-sheet.mjs [--looks looks/a,looks/b] [--world … --cast … --idea … --name …]`
prints one scene with the hero in every material, and under a glitter and a velvet backdrop,
through several looks into `.data/materials/`. Read it before you call a look's materials done.

## Rules for a thing

- Metres. Stands on `y = 0`, centred on the origin, facing `+z`. Geometry below `y = 0` (roots,
  footings) is fine; the world's ground buries it.
- Return an object that is not in any scene. Never touch the scene, renderer, camera,
  background, fog or environment.
- All randomness comes from `context.random()` or `context.seed`. `Math.random()` fails the
  tests, because a roll must be repeatable.
- `dispose()` frees everything you created. `disposeTree(object)` does it for plain meshes.
- Set `castShadow` on your meshes. Avoid adding lights; if you must, keep it to one.
- If the visible bounds overstate where it stands (a tree's crown), set `footprint`.
- `update(dt, time)` is optional and runs every frame.

## Rules for a world

- It owns the lights, the camera, the background colour and the ground.
- `place(items)` positions, turns and scales each item's `holder`, then frames the camera and
  fits the shadow camera. `items[0]` is the hero. Worlds decide how true sizes are: the plinth
  compresses them so a tree and a chair can share a stand; a street would keep them real.
- `capacity` is how many things it can hold. `scales[0]` is the scale the scene is built at.
- Looks are calibrated on a light backdrop with darker subjects. A dark world still works,
  but treatments that read tone from paper-white will print heavily.

## Rules for a look

- `apply(capture, answers, context, signal)` receives one 720 × 720 `Capture` (display colour, view-space
  normals, linear depth, an identity map with one id per placed thing, the scene lit plain, and what
  each surface is made of) and returns opaque RGBA pixels. Read `kit/contract.ts` for the exact packing.
- Every surface goes through the same renderer: things, set and ground all take the treatment, each
  with marks sized to its own extent (the identity pass gives it). A background that reads as the
  style with flat-shaded objects pasted on is the common failure.
- Deterministic for `context.seed`, a few seconds on the CPU, and `signal.throwIfAborted()` inside
  long loops.
- The same look also develops the window print (the scene widened to the person's browser window), a
  capture up to 2048 pixels square. Read `capture.size`, never assume 720: scale marks by
  `capture.size / 720` and keep the cost linear in the number of pixels. Declare `medium` in the manifest so the model chooses the family before the look.
- It should be a distinct medium, not a filter preset. Looks are calibrated on a light backdrop
  with darker subjects.

## Rules for a direction

A direction is read, not built. Its `build.ts` exports words and finishes:

```ts
export default defineDirection({
  brief: 'Direction: midnight radio. …',   // at most 480 characters
  note: 'Direction: midnight radio. …',    // one line, at most 200 characters
  finishes: [],                            // the engine's finishing passes it brings: 'otherworld', 'vacui'
});
```

- The manifest `summary` is what the model chooses the direction from, against the idea: say what the
  direction does to a picture and what kinds of ideas it is for. `scales` stays empty.
- `brief` opens with "Direction:" and reaches scene routing, the choice of medium and look, the
  look's own questions and the vector composition. `note` is the one-line form that goes with each
  cast thing's questions. Say how to lean, what to prefer, what to avoid, and that the subject stays
  readable. Name media the catalogue has.
- Lean hard. A direction that could describe any picture changes nothing; one that would make a
  florist's shop look like a crime scene is worth testing. The model picks it only when the idea
  suits, and rerolls tour the alternatives, so a strong direction costs nothing when it is wrong for
  an idea.
- `npm test` checks the shape and that every brief it joins fits the request cap; `npm run check`
  skips directions. Then conjure a few ideas with it pinned
  (`?force={"direction::house":"directions/<name>"}`) and look at what comes back.

## People

`figure(sculpture, options)` from `@conjure/kit` builds a stylised, poseable person: faceless
or dot-eyed, from capsules or blocks, standing on `y = 0` at the origin facing `+z`. It is the
way to put a person in a scene; do not hand-build humanoids from boxes.

```ts
const s = new Sculpture(context);
const person = figure(s, {
  height: 1.7, build: 'average', pose: 'sitting', style: 'doll', hair: 'cap', gaze: 'down',
  top: '#5b7a8a', bottom: '#3d4652', shoes: '#2a2a2c', skin: '#d9b08c', sleeves: 'short', mirror: true,
});
s.root.add(person.root);
person.hands.right.add(cup);            // props hang from the hands and the head
s.box([0.4, person.hipHeight - 0.05, 0.4], [0, (person.hipHeight - 0.05) / 2, 0], wood); // a seat
return s.finish({ update: (dt, time) => person.update(dt, time) });  // breathing and sway
```

Poses: `standing walking running sitting kneeling crouching lying reaching pointing waving
carrying arms-crossed hands-on-hips leaning slumped`. Styles: `mannequin` (jointed wood),
`blocky` (toy), `silhouette` (one dark material), `doll` (clothed, dot eyes). Hair: `none short
long bun cap hat hood`. Gaze: `ahead down up left right over-shoulder`. `height` scales every
proportion, so the same call makes a toddler, a giant or a tabletop figurine. A sitting
figure's hips are at `person.hipHeight`: put the seat there. Ask questions about what the person
is doing, holding, wearing and looking at; let the mood drive the rest through the Sculpture's
materials. One figure is about 20 meshes.

For a pose the presets do not cover, rotate `person.joints` yourself and call `person.settle()`
to drop the figure back onto the ground and recentre it (`hipHeight` and `height` update):

```ts
const { joints } = person;
joints.hips.left.rotation.x = -Math.PI / 2;      // limbs hang along -y: negative x swings forward
joints.knees.left.rotation.x = Math.PI / 2;      // positive x bends the shin back
joints.shoulders.right.rotation.z = -0.6;        // positive z swings a LEFT limb outward, a right one inward
joints.elbows.right.rotation.set(-1.2, 0.8, 0);  // elbows are YXZ: x bends, then y swings the bent forearm across
joints.spine.rotation.x = 0.4;                   // torso and head sit above their joints: positive x tips forward
joints.neck.rotation.set(0.3, -0.5, 0);          // positive x looks down, y turns the head
joints.body.rotation.x = 0.2;                    // leans the whole body forward
person.settle();
```

`settle()` measures in the figure's own space, so it works after `person.root` has been placed on a
step or in a pulpit. `person.measure()` refreshes `hipHeight` and `height` for a custom pose without
moving anything. The sway in `person.update` is added to whatever body roll you set. The elbow's
y turn only moves the hand once the elbow is well bent (it swings a forearm that already points
forward). Note for hand targets: a standing figure's hands hang at hip height just outside the
thighs; `carrying` brings them to the waist in front; `reaching` puts the left hand straight up.

To put a hand on something, let the figure work out the arm: `person.reach(side, target, { space })`
turns that shoulder and bends that elbow so the palm lands on `target`, with the elbow dropping
down and out like a relaxed arm (pass `elbow: { x, y, z }` in the figure's own space to point it
elsewhere). Give the target in your Sculpture's coordinates with `space: s.root`; without `space`
it is in `person.root`'s. It returns the gap left in metres, 0 when the hand arrives; an
unreachable target gets a straight arm pointing at it. `person.lookAt(target, space)` turns the
head toward a point within a comfortable range. Reaching does not move the body: pose, place and
`settle()` first, then reach and look last.

```ts
s.root.add(person.root);
person.root.position.set(0.3, 0, 0.6);
const cup = new THREE.Vector3(0.2, 0.78, 0.1);              // on the table, in the thing's space
if (person.reach('right', cup, { space: s.root }) > 0.05) { /* move the cup or the figure closer */ }
person.lookAt(cup, s.root);
```

A seated figure's hips sit behind its origin (the legs reach forward), so place it by its pelvis:
read `person.pelvis.getWorldPosition(...)` after adding it and shift `person.root` so the hips are
over the seat.

A world full of people should keep furniture and people near true size: pass `scale: [0.8, 1.35]`
to `diorama()` so its fit-to-slot scaling is clamped. A tall interior can pass
`viewBox: [[-5, 0, -4], [5, 6.4, 4]]` so the camera frames the lower part where the people are,
not a 13 m wall. The diorama's camera sits on the +z side, a little toward +x, looking back at the origin, so world
+x lands on the right of the picture and -x on the left, and a thing's front (+z) faces the camera.
A world with its own camera may differ: check one contact sheet before relying on a side.

## Cloth and smooth surfaces

`s.drape(options, material)` drops a cloth onto things and lets it settle: a tablecloth, a dust
sheet over a chair, a towel on a rail, a tarpaulin over a crate, a hammock. The cloth starts flat at
`at` (its height is the drop height) with `size: [width, depth]`, and falls onto the `over` shapes,
each a `{ box: [w, h, d], at }`, `{ ball: radius, at }` or `{ cylinder: [radius, height], at }`
centred on `at`, then onto the floor (`floor`, default 0; `null` for none). Describe the supports
with the same numbers you built the furniture with. Supports and cloth are in the Sculpture's own
space, boxes axis-aligned and cylinders upright, so build draped furniture unrotated. `hang: 'corners'` pins its four corners and
`hang: 'back-edge'` its back (-z) edge, for hanging cloth. `stiffness` runs from silk (0) to canvas
(1), `rumple` adds irregular folds from `context.random`, and `detail` sets the grid (32 cells on
the long side, about 2,000 triangles a face). Both faces are built, so any material works. It
settles in tens of milliseconds and the same answers give the same folds.

```ts
s.box([1, 0.72, 0.6], [0, 0.36, 0], wood);
s.drape({ size: [1.5, 1.1], at: [0, 0.95, 0], over: [{ box: [1, 0.72, 0.6], at: [0, 0.36, 0] }] }, linen);
```

`s.surface((u, v, target) => target.set(...), material, { segments, wrap, flip, at })` builds a
surface from a function of `u` and `v` (both 0 to 1), like three's `ParametricGeometry`, whose
normals stay sound where the surface pinches to a point. `ParametricGeometry` shades the pole of a
dome or the tip of a cone as a black dot; this does not. Pass `wrap: true` when `u = 0` and `u = 1`
meet, and `flip: true` if it shows from the inside.

## Scales

A thing appears only in worlds that share one of its scales.

`cosmic` · `planetary` · `landscape` · `street` · `room` · `tabletop` · `macro`

Name every scale a thing is plausible at. A chair is `room`, `street` and `tabletop`. A galaxy
is `cosmic` only.

## What a component may import

- `@conjure/kit`
- files inside its own folder
- `three`, `three/addons/*`, `p5`
- `@ateliers/*`, the Three.js ateliers repository, when wrapping one of its builders

Nothing from `engine/`, and nothing from another component. `npm test` enforces this. If two
components need the same helper and it is general, propose it for `kit/`; otherwise copy it.

## Wrapping an atelier builder

Six components wrap builders from the ateliers repository; `things/chair` is the simplest and
`things/tree` shows one with painted faces. What to expect:

- Import the builder module, never the atelier's `main.ts`, `app/`, `ui/` or `state/`.
- Registries fill by import side effect: import `…/parts` or `…/faces/sketches` first.
- Painted faces need that atelier's own `FaceEngine`. Create one at module scope, `await
  faces.ready` in `build`, and call `faces.update` from `update`.
- Wind, wear and season are module-wide in most ateliers: two of the same thing share them.
- Start from the atelier's archetypes and let questions override parts of the spec.

## Changing the kit or the engine

`kit/` is the contract every component compiles against and `engine/` runs them. A change
there affects everyone, so make it its own change, keep it backward compatible, and run
`npm run check` across all components before and after.
