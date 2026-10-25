> This is the development log of Conjure's first ten days (2026-10-12 to 2026-10-21), when several
> agent sessions built the catalogue and the engine side by side on one machine. It is kept as a
> record of what was built and why. For how to contribute now, read [CONTRIBUTING.md](CONTRIBUTING.md).

# Concurrent catalogue expansion — 2026-10-12

## Balanced art styles (Codex, complete 2026-10-12)

Added looks: **cartridge-64**, **watercolor-studio**, **photographic**, together with balanced
family selection, SVG treatment guidance, decision-tree integration and regression checks.
The prior SVG and request-size fixes are preserved.

Published all three looks and tagged the existing looks into seven media. `engine/styles.ts`
asks typed style intent and medium questions, then chooses within that family. Open-ended
rerolls visit every available medium once per deterministic weighted cycle; explicit styles
keep the most relevant family and look, and pins take precedence. The tree and saved gallery
explain exploration without changing the displayed model probabilities. Changing a family
pin releases an old look pin, and choosing a look releases the old family pin.

Removed the earlier global preference for dark cyan/ember printing. SVG direction now asks
once per selected look and reuses that consultation on revisit; automatic layers can be as
subtle as 0.04 opacity. Every new plan still receives its SVG composition automatically.
Scene routing completes before style consultation so a style failure cannot leave a paid
catalogue request chain running after the generation has failed.

Validation: 5,012 unit tests, typecheck, production build, 15 layer browser checks,
7 style browser checks and the full request-chain browser check passed. The latter covered
990 components with 25 mocked requests, 19 sequential routing batches, a longest brief of
933/1,200 characters and maximum planned body of 19,987/20,000. Each new look passed six
default-timing rolls and visual review; 43 cartridge, 48 watercolor and 78 photographic
boundary variants also passed replay, cancellation and capture-preservation checks.
The later 1,006-component inventory export includes the new style stage (6,925 questions and
24,197 choice options). Both the 968-component baseline and the final 990-component snapshot
passed the one-roll catalogue smoke with a 30-second timing allowance under concurrent
software rendering. Final snapshot coverage was checked for missing or duplicate IDs. Evidence:
`.data/styles-*.log`, `.data/layers/{style-browser,request-chain-browser}.json`, and
`.data/styles/comparison.png`. Validation made no paid model calls or real gallery writes.

## Looks and vector layers (Codex, complete 2026-10-12)

Reference-driven follow-up added **looks/xerox-noir** and interference, fracture
and halftone SVG motifs plus acid, phosphor and ember ink pairs. These extend automatic
typed choices using Josiah's favorite cyan stencil, damaged CRT and plum/ember prints.
The reported brief-size error is fixed in `engine/{art-direction,design,oracle}.ts`.
Briefs stay within the existing 1,200-character cap. Shared limits, the extracted live API
schema and request-chain regression tests cover size/count boundaries. Consultations now
chain bounded batches, reassemble wide choices, stop on failure/cancellation and account
completed responses once. Long asks and descriptions use binary choices without truncation.

This pass added new looks **chromatic-darkroom** and **ink-atlas**, `kit/svg.ts`,
`src/svg.ts` (compatibility export), `engine/design.ts`, `tests/{svg,design}.test.ts`,
`src/layers.ts`, `src/layers.css`, and `dev/layers-check.mjs`.
Automatic typed design decisions are integrated into `engine/director.ts`, the decision
tree and gallery, `src/main.ts`, `index.html`, the inventory export and the README. Every
new plan chooses and applies one to three SVG sheets without special prompt wording or a
manual application step. Eleven seeded motifs support captured placement, two inks,
blending, editable SVG groups and composed PNG exports. Manual layer edits are local;
each new generation rebuilds its composition from the typed decisions.

`Stage.develop` accepts an optional capture to share one exact frame with the vector
masks. Existing calls keep their original behavior. Conformance's optional `--reuse-page`
mode reuses the loaded module graph with the same fixtures and disposal checks; ordinary
six-roll validation remains the default. `dev/snap.mjs` saves the composed Print view.

Validation: 4,390 unit tests, production build, 17 expansion browser checks and 15 vector
browser checks passed. Each new look passed six rolls, with 24 boundary variants for the
initial pair and 47 for Xerox noir; replay and cancellation passed. Preview, gallery and
exported PNG pixels match. The 791-component snapshot passed a one-roll smoke recorded
in `.data/looks-catalogue.log`. Four reference-scene previews are in `.data/layers/`.
The final online browser contract smoke covered the later 897-component catalogue:
922 questions in 21 mocked requests, including 17 sequential routing batches. The longest
brief was 768/1,200 characters and the largest planned request 19,989/20,000. Automatic
SVG application, gallery metadata and per-request accounting passed (`npm run check:requests`).
Validation used offline studies or mocked model responses and made no paid model calls.
Preserve the existing gallery and decision-tree hooks.

Josiah is running Codex and Claude contributors at the same time. New components are
automatically discovered; nobody needs to edit a shared registration list. Please read
`COMPONENTS.md`, check whether a folder already exists immediately before publishing,
and preserve another contributor's work.

## Paths added by the Codex swarm

- **Living things:** coral-colony, jellyfish, seaweed, seashell, tide-pool,
  mushroom-cluster, fern, bonsai, lotus-pond, butterfly, dragonfly, beetle,
  fireflies, crystal-geode, mossy-log, cactus, ice-arch, glacier, cloud-bank,
  rain-cloud.
- **Living worlds:** kelp-forest, arctic-shelf, mushroom-grove, dew-garden,
  cloud-garden.
- **Everyday things:** diner-booth, coffee-machine, cash-register, shopping-cart,
  checkout-counter, newsstand, newspaper-box, postbox, bicycle, payphone,
  traffic-cone, fire-hydrant, park-bench, dumpster, motel-sign, picnic-table,
  suitcase, record-player, refrigerator, kitchen-stove.
- **Everyday worlds:** diner-interior, laundromat, motel-courtyard, night-market,
  apartment-kitchen.
- **Architecture and speculative things:** observatory, radio-telescope,
  lunar-rover, rocket, portal-ring, alien-monolith, orbital-ring, dyson-array,
  clock-tower, suspension-bridge, pagoda, castle-tower, pyramid, temple-gate,
  giant-book, impossible-stair, hologram-pedestal, server-rack, submarine, airship.
- **Architecture and speculative worlds:** lunar-outpost, observatory-ridge,
  flooded-temple, archive-hall, neon-rooftop.
- **Look:** graphic-press.
- **Existing component under performance review:** things/tree (preserve its species
  catalogue and model questions; the Codex architecture agent is investigating slow capture).
- **Shared files:** Codex's coordinator is updating `src/`, `index.html`,
  `engine/director.ts`, `dev/check.ts`, `dev/check.mjs`, and the project README.
  The coordinator also maintains `dev/export.mjs`, `dev/expansion-check.mjs` and npm scripts.

Second wave also owns these new names:

- **Transport things:** sailboat, freight-train, tram, cable-car, bus, cargo-crane,
  radio-mast, watermill, ferris-wheel, solar-array, satellite-dish, teleport-booth.
- **Transport worlds:** harbour-dock, rail-platform, fairground.
- **Domestic things:** desk-lamp, bookshelf, sofa, bed, grandfather-clock, piano,
  gramophone, teapot, bread-basket, fruit-crate, flower-bucket, aquarium.
- **Domestic worlds:** bookshop, music-room, flower-shop.
- **Living things:** koi-fish, octopus, sea-turtle, snail, frog, songbird, rabbit,
  succulent-garden, terrarium, ant-colony, dna-helix, pollen-grain.
- **Living worlds:** lily-marsh, terrarium-dome, molecular-lab.

The expansion and shared-file work below are complete. The paths are available for future
contributions; preserve their existing content when editing them. This record helps avoid
accidentally recreating a component under the same name.

## Keep the live studio healthy

- Publish complete folders: prepare `manifest.ts` and `build.ts` under `.data/staging/`,
  then move the folder into `components/` after confirming the name is still free.
- Run `npm test`, `npm run typecheck`, and `npm run check <your ids>`, and inspect the
  contact sheets. Use the project's `.data/toolchain/node/bin` on PATH.
- The existing user service is `conjure.service`, http://rack.local:3400. Keep it running;
  it picks up new components. Avoid starting a duplicate server.
- Conformance checks and catalogue studies are offline. Leave `.env` and the existing
  usage ledger untouched.

## Status

Completed on 2026-10-12: 96 new things, 24 new worlds and Graphic press, plus the scene
library, export corpus, catalogue-study controls and tree capture adapter. The 187-component
snapshot passed all 1,122 browser rolls with an explicit 30-second allowance under concurrent
software rendering. Root's interface checks cover all seven scales, full authored casts,
search, mobile layout, repeatable studies, PNG export and rejection of invalid study URLs.
Later Claude additions continue to appear live; the inventory export reflects all complete
component folders at the time it runs.

Boundary audits additionally checked 640 builds across the living and everyday contribution groups,
including extreme choices/scores, deterministic output, finite geometry, oversized placement
and disposal. No model requests were needed for these checks or exports.

## Claude swarm (added 2026-10-12)

Claude's contributors do not write in this tree. They build in the sideways copy
`~/code/jev/conjure-forge` under `wip/<owner>/`, and a gate (`conjure-forge/forge`) copies a
component here only after rules, typecheck and six headless builds pass, as one complete folder.
The gate treats every name listed above as Codex's, refuses any name that already exists here,
and never edits `src/`, `engine/`, `dev/`, `index.html` or the README. Its check server is a
separate offline instance on 127.0.0.1:3401 with no API key; `conjure.service` and the usage
ledger are untouched. Names it has published are in `conjure-forge/.data/forge/published.jsonl`.
How it works: `conjure-forge/FORGE.md`. To reserve more names against it, list them above.

**Direction upgrades (Claude, 2026-10-12, at Josiah's request):** the sentence decides everything.
Shared files touched: `engine/director.ts` (rewritten around four new pure modules), `engine/stage.ts`
(framing into the build context), `kit/contract.ts` (`Framing`, `NATURAL_FRAMING`, optional
`BuildContext.framing`), `kit/diorama.ts` (honours framing; the sun follows the hour),
`src/main.ts`, `src/tree.ts`, `src/gallery.ts`, `index.html`, `src/style.css`, `server/gallery.ts`
(optional `series` picture), `dev/check.ts` (`plain: true`), `dev/requests-check.mjs` (new routing
contract). New: `engine/{casting,framing,presentation,scene-brief}.ts`, `src/plates.ts`,
`dev/presentation-check.mjs`, `tests/{casting,framing,presentation,scene-brief}.test.ts`.
What changed in the engine, all backward compatible for components:
- Casting is scale-first: only things at the chosen world's scales are asked, once per idea;
  the closest 36 are re-judged with the setting in its brief. The routing batch no longer
  carries every thing, and a reroll into a new setting asks one short batch.
- Component details are asked with the setting, co-cast and look named in the brief
  (`engine/scene-brief.ts`), cached per world (the world itself per hero).
- Five framing and two presentation questions are typed direction decisions; `Plan` gained
  `framing` and `presentation`, `RollOptions` gained `plate`, `Conjuring` gained `plain`.
- A series prints its other plates with `src/plates.ts` from the same settled plan; the gallery
  record carries `framing`, `presentation` and `hasSeries`.
Validation: 7,190 unit tests, typecheck, `check:requests`, `check:styles`, `check:expansion`,
conformance on four components and `dev/presentation-check.mjs` for hours, strip and approach,
all with mocked or offline models. Please keep `plain: true` in offline checks and studies.

**Figures and confidence (Claude, 2026-10-12, at Josiah's request):** `kit/figure.ts` builds a
stylised, poseable person (15 poses, 4 styles, hair, gaze, clothing colours, hand and head
attachment points, a breathing `update`) from a `Sculpture`; exported from `@conjure/kit`, tested
in `tests/figure.test.ts`. Pilot things `things/waiting-figure` and `things/figure-on-a-crate`
use it. `Capture.confidence` (optional) carries the model's belonging per identity id so a look can
draw doubtful things as pencil. **The forge's `kit/` and `engine/` are behind the studio** (no
figure helper, framing, casting or presentation there) and must be re-copied between waves, never
during one; the forge's `dev/check.ts` then wants `plain: true` like the studio's.
`node dev/gaps.mjs` lists gallery ideas whose cast belonged weakly, as briefs for the next wave.
As of 2026-10-12 18:20 PDT the forge is level with the studio (`node dev/forge-sync.mjs` copies kit/
and engine/ and patches its check page; it refuses to run during a wave). `things/street-musician-figure`
went through the gate with the new kit. The `h1` people pilot (3 builders) published 24 components
(Varanasi ghat at dawn, Irish wake parlour, Copacabana). Its builders found inverted joint signs in
`kit/figure.ts` (gaze, lean, arms-out, forearm swing), a side-on hood and a floating kneel; all fixed
on 2026-10-12 19:10 PDT, and `figure()` now returns `joints` and `settle()` for custom poses (see
COMPONENTS.md). The published pilot things still pass conformance. `diorama()` gained a `scale`
clamp option. The `h2` wave (people ×6, gaps ×6, looks collage-studio and plotter-pen) published 97 components
under owner names `h2-people-<n>`, `h2-gaps-<n>`, `h2-look-<n>` by 20:15 PDT. Its builders' notes led
to further kit fixes the same evening: `settle()` measures in the figure's own space (works after the
root is placed), `measure()` refreshes `hipHeight`/`height`, the forearm-across sign now swings
inward, the sway keeps a builder's body roll, and `diorama()` gained `viewBox` for tall interiors.
The `h3` wave (people ×6, gaps ×6, cosmic/planetary/macro ×6, looks linocut-press and cel-animation;
owners `h3-people-<n>`, `h3-gaps-<n>`, `h3-scales-<n>`, `h3-look-<n>`) lost 19 builders to a usage
limit on 2026-10-12 around 23:00 PDT and was resumed at 00:35 PDT on 2026-10-13, then again on Opus
at 14:55 PDT after a second limit; it finished at 16:00 PDT with 146 components. The forge was then
synced (`node dev/forge-sync.mjs`), its contact sheet grid fixed to two 560 px columns, and the `h4`
look wave launched at 16:05 PDT.

**Style direction from huashu-art-motion (Claude, 2026-10-13, at Josiah's request):** its 35 style
recipe cards (MIT) were read for direction only; the skill was not installed. Added: presentation
`styles` (one settled scene in three media, `StyleDecisions.plan({ shift })` walks the model's
medium ranking), a `boil` presentation question with `Stage.develop(signal, capture, boil)` reseeding
the look per loop frame, the anti blue-purple rule in `engine/art-direction.ts`, and medium tags on
`looks/blueprint` (print), `looks/chalk-pastel` (painting) and `looks/thermal-scan` (optical). The
`h4` look wave (`.data/waves/huashu-looks.json`, 14 looks, owners `h4-look-<n>`) runs after `h3`;
its builders read cards copied to `conjure-forge/.data/style-cards/`, to be removed after the wave.
Relations (`engine/relations.ts`): each supporting thing answers one typed question about the hero
(`on`, `beside`, `behind`, `facing`, `apart`), kept on `CastMember.relation` and `Placeable.relation`
(optional, so hand-written worlds are unaffected); `kit/diorama.ts` places related things round the
hero. The casting draw now runs at 0.45 of the roll temperature (`CASTING_COOLING`), after the gallery
showed 14% things beating 82% ones on rerolls. New look `looks/pencil-and-ink` reads
`Capture.confidence`. Presentations `critics`, `opposite` and `telephone` print further whole readings (another model, the
inverted brief via `ConsultOptions.stance`, or a chain of fresh readings with `Conjuring` `exclude`).
New look `looks/neural-dream` trains a small seeded network on the frame in the browser (under 4 s).
`World.framed` (optional) marks a world that honoured framing itself (the diorama sets it); for any other
world `engine/stage.ts` applies closeness, anchor and tilt to the camera after `place`.
Presentation `loop` records a moving print (`src/loop.ts`, MediaRecorder on a canvas; `Stage.animated()`
says whether anything moves); the gallery stores it as `<id>.loop.webm` with `hasLoop`.

**Trace library, distance-field things and portraits (Claude, 2026-10-13, at Josiah's request):**
dependency `imagetracerjs` (Unlicense) added to `package.json` (previous files at
`.data/package*.json.before-traces`). New: `src/trace-image.ts` (tracer), `src/traces.ts` (panel),
`src/portrait.ts`, `server/traces.ts` (mounted in `server/index.ts`), `kit/sdf.ts`, `engine/found.ts`,
`engine/found-entry.ts`, `engine/traces.ts`, `dev/trace-check.mjs`, `tests/{sdf,traces}.test.ts`.
Shared files changed: `engine/catalogue.ts` (`setRuntimeThings`: runtime things with ids
`things/found-*` join `entriesOf`, `entryOf` and `loadBuilder`), `engine/capture.ts` (alpha-tested
cut-outs keep their outline in the normal pass too; `things/tree` timing unchanged, 33.6 s vs 38.5 s
before), `engine/stage.ts` (`portrait()`, a fallback framing for worlds without `framed`),
`engine/presentation.ts` (`portrait` kind and `blend` question), `kit/svg.ts` (trace layers,
`layerTitle`), `src/main.ts` (`begin` is async and waits for the library), `src/tree.ts`,
`index.html`, `src/style.css`, `engine/design.ts` (trace sheet questions appended after the motif
questions when the library is non-empty; `DesignDecisions` takes a `TraceLibrary`, `traceLayer()`),
`engine/director.ts` (passes the library unless offline or plain), `src/gallery.ts` (records keep a
trace's name without its paths). The studio server was restarted on 2026-10-13 at 15:35 PDT so the
trace routes and the gallery's series and loop storage are live (the service runs without watch).

**Accents (Claude, 2026-10-13, at Josiah's request):** a second look laid over the hero or its most
striking detail. New: `engine/accent.ts` (`ACCENT_QUESTIONS`, `accentMask`, `composeAccent`,
`morph`), `tests/accent.test.ts`, `dev/replay-check.mjs` (replays a gallery entry with all its
answers pinned plus extra pins). Shared files changed: `engine/director.ts` (accent questions routed
with the framing and presentation questions unless `plain`; `Plan.accent`; the accent look is the
styles ranking shifted by one, or pinned with `direction::accentLook`), `engine/stage.ts`
(`develop()` composes the accent and returns its mask as `accent`), `src/portrait.ts`
(`composePortrait` takes that mask and keeps the detail clear), `src/main.ts`, `src/tree.ts` (an
Accent branch), `src/gallery.ts` (record field `accent`), `dev/requests-check.mjs` (routing count).
Looks are unchanged: an accent only runs a second look's `apply` on the same capture.
A replay pins the entry's recorded accent, or none for entries saved before accents existed.

**`h4` looks, kit helpers and real-scene look checks (Claude, 2026-10-13):** the `h4` wave published
14 looks by 16:50 PDT (flow-field-painting, broken-colour, old-master-light, tessera-mosaic,
illuminated-gold, shadow-theatre, ancient-wall, anime-light, xieyi-ink, avant-garde-poster,
fractured-planes, flat-editorial, early-cgi, neon-vaporwave; owners `h4-look-<n>`, 4.1M tokens, 47
minutes). The huashu style cards were removed from the forge afterwards. Printed on a real gallery
scene, several lose the room, because the forge's look check only showed a gas pump on the plinth;
its `dev/check.ts` now prints rolls 3 and up over three real worlds and times the look alone (the
original is at `.data/forge-check.ts.before-real-scenes`). Kit additions, all additive:
`Figure.reach()` and `Figure.lookAt()` (`kit/figure.ts`), `Sculpture.drape()` / `drapeGeometry()`
and `Sculpture.surface()` / `surfaceGeometry()` (`kit/geometry.ts`), tested in
`tests/{figure,drape}.test.ts` and documented in COMPONENTS.md; seven figure-using things passed
conformance afterwards. Originals at `.data/{figure,geometry}.ts.before-*`. The forge was synced
(kit, engine, COMPONENTS.md) at 16:59 PDT. `looks/chalk-pastel` is being reworked in place for
real scenes (original at `.data/chalk-pastel-build.ts.before-halo`).
The four `h4` looks that lost the room (tessera-mosaic, xieyi-ink, shadow-theatre, broken-colour) were
reworked by their owners through the gate against the real-scene rolls and released by 17:40 PDT;
before and after prints are in `.data/new-looks/` (`before-*.jpg`, `after-*.jpg`). The forge check's
worlds also rotate against the option walk so every three-way choice meets every real world in 12
rolls, and a world's check casts its builder's own checked things. `looks/thermal-scan` (Codex's)
also reads as one blob on a full room; it was left alone.

**Reproducible stills and chalk pastel (Claude, 2026-10-13):** replays of one entry differed run to
run because `engine/stage.ts` fed updates wall-clock time, so the capture caught a different moment and
pixel-dependent looks drifted (chalk pastel's eraser swipes moved). The stage now runs a 12-step
pre-roll to `STILL_TIME` (0.5 s of scene time) on every mount and holds there with `dt = 0` until
`Stage.play()`, which `src/main.ts` calls when a generation finishes and `src/loop.ts` before recording.
Two replays of the same entry are now byte-identical. Original at `.data/stage.ts.before-still`.
`looks/chalk-pastel` was reworked for real scenes (structure-first strokes sized to detail, values keyed
to the paper, coverage model, stick choice); its start and final copies are in `.data/chalk/`, and the
final is mirrored into the forge (`components/` and `wip/w1-look-9/`).

**Gallery (Claude, 2026-10-12, at Josiah's request):** every finished generation is saved by the
server under `.data/gallery/` and browsable at `/gallery`. New files `server/gallery.ts` and
`src/gallery.ts`; two small hooks in shared files: `server/index.ts` mounts the router before
`express.json`, and `src/main.ts` calls `installGalleryLink()` and `saveToGallery(...)` just
before `document.title = 'conjure-ready'`. Please keep those calls when reworking `src/main.ts`.

**Kit (Claude, 2026-10-12):** `kit/diorama.ts` slots may now be `[x, z, height, size]` as well as
`[x, z]` (stand a thing on a counter or shelf, or make a supporting spot smaller). Existing
two-number slots behave exactly as before.

**Decision tree (Claude, 2026-10-12, at Josiah's request):** every generation shows a clickable
decision tree (`src/tree.ts`), and clicking another answer pins it and rebuilds the same roll.
Engine support, all optional and backward compatible: `Ruling` gained `kind`, `options` and
`forced` (`engine/settle.ts`, plus a `forced` argument to `settle`); `plan()` accepts `force`
(keys `"<owner>::<question>"`, e.g. `direction::world`, `direction::cast:things/chair`) and `Plan`
gained `nearly` and `wanted` (`engine/director.ts`). `src/main.ts` holds the pinned answers,
calls `showTree` after each `renderSheet`, and reads `?force={…}` from the address. The gallery
saves the tree and links each alternative back into the studio. The old list is still there
behind the tree's "List view" button. Copies of the three files as they were before this
change: `.data/{settle,director,main}.ts.before-tree`.

**Why the studio hung from the desktop (Claude, 2026-10-12):** the UniFi gateway's intrusion
prevention inspects desktop-to-rack traffic and blocks any plain-HTTP GET whose path starts with
`/@fs` and contains "raw" (Emerging Threats 2061339, a Vite CVE rule). `/@fs/…/faces/draw.ts`
matched, so casting tree, robot, hover-car, street-sign or staircase killed the connection.
Fix: `./ateliers` is a link to the ateliers repository and `vite.config.ts` aliases
`@ateliers` to it with `preserveSymlinks: true`, so those files are served as `/ateliers/…`.
Keep both. Do not import anything in a way that produces `/@fs/` URLs. The previous config is
`.data/vite.config.ts.before-fs`.

**Spending cap removed (Claude, 2026-10-13, at Josiah's request):** `server/budget.ts` and `server/index.ts`
no longer cap spending by default (the old $2 default and $13 ceiling are gone). `.data/usage.json` still
records every request; a cap applies only if `CONJURE_BUDGET_USD` is set to a dollar amount. The line was
removed from `.env`, `tests/budget.test.ts` covers both modes, and `conjure.service` was restarted and
reniced. Originals at `.data/budget.ts.before-uncapped` and `.data/server-index.ts.before-uncapped`.

**Fifth-World house style and reroll variety (Claude, 2026-10-16, at Josiah's request):** "oil skull
portrait" printed `old-master-light` on all ten rolls and "bizarre oils" `flow-field-painting` on all
five, because an explicit style settled medium and look at temperature 0; looks and SVG layers also
resampled the same favourites (chiaroscuro on 10/10, a blueprint sheet on most prints). Josiah wants
every generation to lean heavily into a Fifth-World feeling (r/FifthWorldPics: from another dimension,
surreal or bizarre, or a novel emotion) without rerolls repeating the finish. Changes:
- `engine/settle.ts`: `explore()` and an optional `Exploring` argument to `settle()`; an exploring
  settle tours a choice's plausible answers (favourite first, under 3% sit out once three remain) and
  draws scores and yes/no warmer, making the same number of random draws as before. `settleOne` gained
  an optional `lean`; yes/no softens above temperature 1 (no caller used that before).
- `engine/styles.ts`: explicit requests keep their medium and tour its treatments; open ideas visit
  another treatment on each return to a medium. Temperature 0, pinned looks and shifted plates are unchanged.
- `engine/director.ts`: look details and the design tour on rerolls (worlds and things still sample);
  the otherworld questions ride in the routing request but settle on their own stream; `Plan.otherworld`.
- `engine/art-direction.ts`: `VISUAL_DIRECTION` is now the Fifth-World direction; `FIFTH_WORLD` is its
  short form, appended to the casting/relations/details brief.
- `engine/design.ts`: shorter brief, rounded moods, `designBrief()` falls back to the short direction
  under the cap (the old design brief reached 1,224/1,200 characters under the opposite stance).
- New `engine/otherworld.ts` (eight effects, applied in `Stage.develop` after the accent),
  `tests/otherworld.test.ts`, `dev/otherworld-sheet.mjs`. `src/tree.ts` has an Otherworld branch,
  `src/gallery.ts` records `otherworld`, `dev/replay-check.mjs` pins it (or `none` for older entries).
- `src/style.css`: the phone grid is `minmax(0, 1fr)`; the column was 391 px in a 390 px viewport,
  which `check:layers` caught. `dev/styles-check.mjs` gained the missing `/api/traces` mock.
Validation: 9,563+ unit tests, typecheck, `check:requests` (longest brief 997/1,200), `check:styles`,
`check:layers`, presentation checks for hours, portrait and loop, and otherworld sheets over three saved
generations (plotter pen, collage truck stop, old-master skull) in `.data/otherworld/`. All mocked; no
paid calls. Originals of every changed shared file are in `.data/fifth-world-before/`.

**Dead-space fill, weighted tours and moving loops (Claude, 2026-10-17, at Josiah's request):**
- New `engine/vacui.ts`: a horror-vacui micro-macro pass on the print's dead space (Voronoi rows along
  iso-distance lines from `kit/sdf.ts`'s `distanceTransform`, jump-flooded labels, warped-noise graphite
  landforms, comb-like tubules where light meets dark; colours from the print, its dark marks kept on top).
  Three typed questions (`vacui`, `vacuiGrain`, `vacuiReach`) ride in the routing request on their own stream;
  `Plan.vacui`; applied in `Stage.develop` before the otherworld pass. About 350 ms a frame in Node.
- Loops were stills: the recorded WebMs changed 0 to 27 pixels a frame (one had three identical frames),
  because only breathing figures moved and the finish was the same every frame. New `engine/motion.ts`
  (typed `loopCamera`: drift, push, float, still; `cameraAt(move, phase)`), `Stage.capture(offset)` turns the
  camera about the hero for one capture and restores it, `Stage.develop(..., phase)` animates the dead-space
  and otherworld passes on closed paths, and `src/loop.ts` uses both (`loopMoves` replaces the
  `stage.animated()` gate in `src/main.ts`). `dev/presentation-check.mjs loop` now requires over 2% of the
  picture to change per frame; it measured 20.9%.
- Tours (`explore` in `engine/settle.ts`, and `exploreMedium`) open on a weighted draw instead of always the
  favourite: three different ideas had all opened on xerox-noir with a specimen plate and halftone sheets.
  No answer repeats across a cycle boundary.
- `src/tree.ts` (Dead space branch; the loop camera under Presentation), `src/gallery.ts` (`vacui`, `camera`),
  `dev/replay-check.mjs` (pins `vacui: none` for older entries), `dev/otherworld-sheet.mjs --vacui`,
  `dev/requests-check.mjs` (routing +4 questions), `tests/vacui.test.ts`.
Validation: 9,569 unit tests, typecheck, `check:requests`, `check:styles`, `check:layers`, presentation checks
for hours, portrait and loop; dead-space sheets in `.data/vacui/`. All mocked; no paid calls. Originals in
`.data/fifth-world-before/` (`loop.ts`, `presentation-check.mjs`, `otherworld.ts.v1`, `settle.ts.after-tours-v1`).

**Micro-macro forms, glyph doodles, drips and blacklight (Claude, 2026-10-17, at Josiah's request):** after a
blacklight drawing of a skull built from small doodled machinery, `engine/vacui.ts` gained a `glyphs` fill
(each cell draws one doodle chosen by its hash), `vacuiForm` (land, skull, eye: an analytic form blended into
the landform field and anchored on the hero, outlined where the shading crosses into the dark, with no doodles
in its deepest voids), `vacuiInk` (print, graphite, blacklight) and a `vacuiDrip` yes/no (drips hang only from
dark runs at least 8 px tall). A frame that is all dead space now grows its rows from the frame's edges instead
of silently doing nothing. Plans saved before these fields default to landforms, the print's colours and no
drips; `dev/replay-check.mjs` pins those defaults. Routing carries three more questions (`dev/requests-check.mjs`).
`dev/otherworld-sheet.mjs --forms` prints each form in each ink; sheets in `.data/vacui/{forms,void}-sheet.jpg`.
Validation: 9,691 unit tests, typecheck, `check:requests`, `check:styles`, `check:layers`, presentation checks
(the loop changes 37% of the picture per frame). Original at `.data/fifth-world-before/vacui.ts.v1`.


**A blank page, a live feed, and laps across a spread of ideas (Claude, 2026-10-25, at Josiah's request):**
- The page now opens blank but for one centred line with a cursor blinking in it (`src/prompt.ts` draws the
  caret itself, so it blinks the same with or without focus and quickens while the studio thinks); after 2.6 s
  a hint and a faint line of links (library, invent, settings, gallery) fade in. On Enter the line moves to the
  top and the studio's work is drawn in beneath it as it happens: `engine/activity.ts` is a small event bus,
  `consult()` announces each batch (every call site names what it is about), the director announces each
  settled decision in words (direction, mood, framing, presentation, setting, look, cast thing by thing,
  relations, each component's first answers, vector sheets), `Stage.mount` each build, and `src/main.ts` the
  print, portrait, plates and loop. `src/activity.ts` renders the rows (pulsing marker while asked, staggered
  cast chips, a progress hairline, a seconds/questions/requests footer). `body[data-state]` is idle → thinking →
  building → ready | failed; `body.scened` once a picture exists. The desk (rolls, model, next look, tree, labs)
  sits under the picture; the layer lab and trace library fold closed by default. Every element id the dev
  checks use is unchanged; `dev/layers-check.mjs` opens the lab and the settings itself.
- `dev/laps.mjs` conjures a file of ideas headlessly with the real model and tallies what recurred. 48 varied
  ideas at first choices (`.data/laps/spread-t0`, $0.31): four looks took 42 of 48 (watercolor studio 13, xerox
  noir 12, photographic 9, old-master light 8) out of 62; night noir ⇒ xerox noir 12/12 and picture book ⇒
  watercolor studio 5/5; as-written 63%, night noir 25%, bold poster never; plate 81% and approach 19%, the
  other eight presentations never; accent never; settings (38 distinct) and cast (117 distinct) were diverse.
- Found and fixed: the "does the person explicitly request a medium?" question read yes for every idea under
  night noir, picture book and bold poster, because their briefs say "prefer … media"; the gallery shows the same
  reading at 100% under the old Fifth World house brief on 2026-10-17 and about 1% before it. A yes settles the
  medium and look at temperature 0, so rerolls never toured media. The question in `engine/styles.ts` now
  judges the sentence alone and names the direction notes as the studio's own; a direct probe of 16 ideas put
  plain ideas from 96% to about 10% yes with real requests ("a woodcut of a fox") still 97%+. A reroll lap of 16
  of the affected ideas afterwards (`.data/laps/reroll-t1`, $0.10) visited 7 media and 11 looks.
Validation: 9,740 unit tests, typecheck, `check:requests`, `check:styles`, `check:directions`, `check:layers`,
`check:expansion`, `presentation-check approach`; three real walkthroughs (`.data/tour/tour.mjs`) and one
offline. The laps and the probe asked the real model; nothing else did.
