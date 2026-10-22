# Contributing to Conjure

Conjure turns a typed sentence into a small Three.js scene by letting a decision model choose from
an inventory of **worlds** (settings), **things** (objects), **looks** (print treatments) and
**directions** (art direction). The more varied and characterful the inventory, the more ideas it
can answer, from a galaxy to the snack aisle of a gas station. Growing it is the main way to help,
and Three.js objects and scenes are the most wanted.

Every component is one folder that nothing else lists or imports, so your pull request adds files
and touches nothing shared. [COMPONENTS.md](COMPONENTS.md) is the contract; this page is the loop
and the bar.

## The loop

```bash
git clone https://github.com/captnocap/conjure && cd conjure
npm install
npx playwright install chromium        # once, for the conformance check (software rendering is fine)
npm run dev                            # http://localhost:3400, leave it running
npm run new thing roller-grill         # or: world truck-stop-diner, look pencil-rubbing, direction midnight-radio
#   write manifest.ts (the summary) and build.ts (the questions and the build)
npm run check things/roller-grill      # rules, typecheck, six builds in a headless browser
#   open .data/check/things--roller-grill.png and look at it; fix; check again
npm test                               # the independence rules, no browser needed
```

No API key is needed for any of this. The check runs offline, and the studio runs with `?offline`
so you can cast your component into scenes for free: **Explore library → Study this component**
builds it with random answers in a fitting world. To see it chosen by a real model, add
`NANO_GPT_API_KEY` to `.env` (a NanoGPT key); an idea costs a fraction of a cent.

Pick a name that is specific (`gas-station-roller-grill`, not `grill`): ids are folder paths and
cannot collide, but the model casts from the summary, so a specific name helps you write one.

## What good looks like

**Summary.** The model decides whether to cast your component from the manifest summary alone,
against the idea. Say what it is, then what it evokes: moods, times, places, kinds of people or
stories. "A roller grill of hot dogs turning under a heat lamp. Truck stops, night shifts, hunger
without choice, food that has been waiting longer than you have." 70 to 420 characters. A summary
that only names the object gets cast only when the idea names it.

**Scales.** Name every scale a thing is plausible at (`cosmic planetary landscape street room
tabletop macro`). A thing is only cast into worlds that share a scale with it, so one narrow scale
means it is rarely seen. A world's first scale is the one it builds at.

**Questions are the inventory.** Five to ten per component, each changing something you can see.
Prefer choices with four to eight options, each described by how it looks or feels, because the
model judges the description. Include at least one question about state or story (what happened
here, what was left behind, what is it doing right now), not only shape and colour. Phrase dependent
questions as conditions ("If it has a sign, what does it say?"). Never ask about wear, warmth,
energy, density, daylight or cheer: read `context.mood` and let it drive dirt, damage, colour
temperature, motion, clutter and glow.

**Geometry.** A recognisable silhouette and a few telling details, not a box with a label. Lathes,
tubes, extrusions, bevels, instancing, canvas-painted textures and labels; `Sculpture` from the kit
is a convenience, not a limit, and you may use `three` directly. Keep it light: aim under 300 meshes
and 150k triangles, and use `InstancedMesh` or merged geometry for repetition. True size in metres,
standing on `y = 0`, centred, facing `+z`. No external images, fonts or model files: paint a canvas.

**Variation.** `context.random()` for placement jitter, counts and small asymmetries, so two rolls of
the same answers still differ. Never `Math.random()` or the clock: a roll must be repeatable.

**Motion.** An `update(dt, time)` that turns a fan, flickers a tube or bobs a float is welcome when
it is cheap. Scale it by `mood.energy`.

**Worlds.** A world is a place, not an empty floor: build its architecture, terrain, fixtures and
background dressing as part of the world, and leave clear standing slots for the cast, with the hero
slot in the best light. `diorama(context, options)` gives you ground, lights, an orthographic camera
and a `place` that fits the frame and honours the decided framing. Looks are calibrated for a light
backdrop with darker subjects; night scenes work best as a mid-tone dusk with glowing accents.

**People.** `figure()` from the kit builds a stylised, poseable person. Never hand-build a humanoid
from boxes, and never try to render a likeness of a real person: faces stay blank or dot-eyed.

**Looks.** One `Capture` in, pixels out, deterministic for a seed, a few seconds on the CPU, honouring
the abort signal. Every surface goes through the same renderer, with marks sized to the thing they
describe. A look should be a distinct medium, not a filter preset. Check it over real worlds, not
only the plinth: `npm run check looks/<name> -- --rolls 9`.

**Directions.** Two paragraphs and a list of finishes, read by the model with every question. Lean
hard: a direction that could describe any picture changes nothing. The model picks it only when the
idea suits and rerolls tour the alternatives, so a strong direction costs nothing when it is wrong.
`npm test` checks it; then conjure a few ideas with it pinned
(`?force={"direction::house":"directions/<name>"}`) and look.

## The bar

Passing `npm run check` is the floor. The bar is the contact sheet: would a person recognise this at
a glance, at 720 pixels, and does it change in a way that matters between rolls? Roll 0 is a neutral
mood, roll 1 every score and mood at 0, roll 2 everything at 1, rolls 3 to 5 random, and the rolls
walk every option of every choice in turn, so the sheet shows your extremes. Two or three rounds of
improving and re-checking per component is normal.

## Pull requests

- One pull request can hold any number of components. Keep kit or engine changes out of it (see
  below).
- Say what you added and attach the contact sheet from `.data/check/` (or a print from the studio)
  for each component. Reviewers look at pictures first.
- `npm test` and `npm run typecheck` must pass; CI runs them. `npm run check <id>` must pass for each
  component you added or changed; CI cannot run a browser for every component, so say that you ran
  it.
- Components may import `@conjure/kit`, files in their own folder, `three`, `three/addons/*` and `p5`.
  Nothing from `engine/` and nothing from another component; `npm test` enforces this. If two
  components need the same general helper, propose it for `kit/` in a separate change.
- Line endings LF, two-space indentation, single quotes, as in the files around you.

## Changing the kit or the engine

`kit/` is the contract every component compiles against and `engine/` runs them, so a change there
affects nearly two thousand components. Open an issue first, keep it backward compatible, make it
its own pull request, and run `npm run check -- --reuse-page --rolls 1` across the whole catalogue
before and after. A new finishing pass (like the otherworld or the dead-space growth) belongs here;
once it exists, any direction can bring it.

## Reporting a bad picture

If an idea came back wrong, open an issue with the sentence, the saved gallery record (`.data/gallery/
<day>/<id>.json`, which holds every decision) and what you expected. `node dev/gaps.mjs` lists the
ideas in your own gallery whose cast belonged weakly, with the things that nearly made them work:
those are briefs for the next component.
