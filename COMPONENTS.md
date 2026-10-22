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
  normals, linear depth, an identity map with one id per placed thing, and the scene lit plain) and
  returns opaque RGBA pixels. Read `kit/contract.ts` for the exact packing.
- Every surface goes through the same renderer: things, set and ground all take the treatment, each
  with marks sized to its own extent (the identity pass gives it). A background that reads as the
  style with flat-shaded objects pasted on is the common failure.
- Deterministic for `context.seed`, a few seconds on the CPU, and `signal.throwIfAborted()` inside
  long loops. Declare `medium` in the manifest so the model chooses the family before the look.
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
