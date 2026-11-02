# Atelier → Conjure source inventory (baseline, 2026-10-30)

This is the pre-change source audit. Runtime validation and final implementation status must be added by integration; “already ported” below means the original drawing implementation is vendored and selectable with no specifically identified missing input, not a visual certification.

## Provenance

- Authoritative local source export: `/home/siah/code/jev/art/atelier-source.zip`, SHA-256 `d08d3876f689c9e845456d2923fcf61c1aca89dd8f80ca39932331d7c1b1cabe`. Its changelog begins with Render recovery and geometry portability (after Interior lattice / Study 84).
- Every one of its **172 dist files is byte-identical** to `/home/siah/code/jev/conjure/public/atelier`; no missing or differing files. Source archive has 1,061 entries.
- Imported actual registries confirm **84 image studies and 26 3D material definitions**. The archive also contains three composition finishes: finite lenses, ink completed mix, fluted glass.
- Authoritative hosted v83 source fetched by the coordinating parent at commit `56f12f27a0a69ee44443fb3fcea2334073afb586` in `../atelier-authoritative`. Runtime modules are identical to the archive; differences are packaging/handoff files only (`source.zip`, `handoff-source.json`, `style-handoff-dialog.js`, `index.html`). Site version number and study count are distinct.
- `/home/siah/code/three` is a different collection of individual 3D ateliers; Conjure links it as `ateliers`. It is not the Rendering Studies catalogue.

## Baseline integration

Conjure has one Atelier look whose base/overlay selectors import the original runtime registry and then exclude twelve entries via `components/looks/atelier/unsuitable.ts`. No study source modules are actually missing from the vendored runtime. Missing functionality is capture integration, fixed-scene generalization, and exclusions. Existing selectors preserve IDs and seeds.

Counts: 48 already ported by static inspection, 24 partial, 12 excluded/missing.

The adapter currently zeroes per-owner metalness/transmission, empties edges and edge owners, omits worldFromClip and geometry snapshot, and supplies no surface samples, sections, voxels, hatches, or projected membrane masks. All studies also inherit the baseline identity convention: ID0 backdrop, ID1 floor, IDs2+ meshes. Every new adapter must preserve/remap this convention consistently instead of accidentally treating the first Conjure object as the floor.

## Complete image-study catalogue

| # | ID / name | Baseline status | Implementation | Evidence / required work |
|---|---|---|---|---|
| 1 | `riso` — Risograph | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 2 | `woodcut` — Woodcut | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 3 | `stipple` — Stipple | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 4 | `loom` — Woven field | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 5 | `optical` — Optical relief | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 6 | `cyanotype` — Cyanotype | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 7 | `contours` — Contour atlas | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 8 | `frottage` — Frottage | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 9 | `cutpaper` — Cut paper | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 10 | `reticulum` — Reticulum | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 11 | `luminous` — Luminous field | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 12 | `scanner` — Data engraving | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 13 | `depth` — Depth etching | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 14 | `embroidery` — Surface embroidery | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 15 | `wash` — Pigment wash | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 16 | `architectural` — Architectural plate | Partial | `styles.js` | Geometric creases absent: adapter supplies edges=[]/edgeOwners=[]. |
| 17 | `interference` — Moiré interference | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 18 | `photogram` — Photogram | Partial | `styles.js` | Transmissions are forcibly zero, losing material-transmission exposure. |
| 19 | `glass` — Leaded glass | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 20 | `transfer` — Solvent transfer | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 21 | `volume` — Luminous volume | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 22 | `surface-dots` — Surface pointillism | Missing (excluded) | `styles.js` | Excluded; area-distributed world-space surface samples absent. |
| 23 | `mezzotint` — Mezzotint | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 24 | `impasto` — Impasto relief | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 25 | `reaction` — Reactive cells | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 26 | `marbling` — Marbled float | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 27 | `sections` — Sectional volume | Missing (excluded) | `styles.js` | Excluded; mesh–plane intersections absent because capture has no geometry. |
| 28 | `crackle` — Crackle glaze | Partial | `styles.js` | Open-boundary projection absent, losing open-rim handling. |
| 29 | `oilspot` — Oil-spot glaze | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 30 | `sabattier` — Sabattier print | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 31 | `relief` — Schiacciato | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 32 | `interlace` — Optical interlace | Already ported | `styles.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 33 | `voxels` — Surface Blocks | Missing (excluded) | `styles.js` | Excluded; triangle/box surface cells absent because capture has no geometry. |
| 34 | `spectral` — Spectral coating | Partial | `styles.js` | worldFromClip absent: uses fixed 8.2-wide screen-space fallback rather than captured world coordinates. |
| 35 | `cel` — Clean cel | Partial | `clean-studies.js` | Shared cleanFields lacks geometric creases and actual per-owner metalness; adapter supplies no edges and zeroed material metadata. |
| 36 | `clear-line` — Ligne claire | Partial | `clean-studies.js` | Shared cleanFields lacks geometric creases and actual per-owner metalness; adapter supplies no edges and zeroed material metadata. |
| 37 | `brush-cel` — Bold ink | Partial | `clean-studies.js` | Shared cleanFields lacks geometric creases and actual per-owner metalness; adapter supplies no edges and zeroed material metadata. |
| 38 | `comic-dots` — Comic shadows | Partial | `clean-studies.js` | Shared cleanFields lacks geometric creases and actual per-owner metalness; adapter supplies no edges and zeroed material metadata. |
| 39 | `expressive-ink` — Expressive ink | Partial | `ink-effects.js` | Shared cleanFields lacks geometric creases and actual per-owner metalness; adapter supplies no edges and zeroed material metadata. |
| 40 | `ink-bloom` — Wash bloom | Partial | `ink-effects.js` | Shared cleanFields lacks geometric creases and actual per-owner metalness; adapter supplies no edges and zeroed material metadata. |
| 41 | `ink-scrape` — Scraped ink | Partial | `ink-effects.js` | Shared cleanFields lacks geometric creases and actual per-owner metalness; adapter supplies no edges and zeroed material metadata. |
| 42 | `ink-storm` — Edge storm | Partial | `ink-effects.js` | Shared cleanFields lacks geometric creases and actual per-owner metalness; adapter supplies no edges and zeroed material metadata. |
| 43 | `game-obra` — Obra Dinn / one bit | Partial | `game-painted-studies.js` | Geometric crease extraction absent (edges/edgeOwners). |
| 44 | `game-disco` — Disco / drybrush | Already ported | `game-painted-studies.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 45 | `game-okami` — Okami / brushwash | Already ported | `game-painted-studies.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 46 | `game-sable` — Sable / schematics | Partial | `game-graphic-studies.js` | Graphic plan uses cleanFields and actual world positions; geometric creases/metalness/worldFromClip missing. |
| 47 | `game-hylics` — Hylics / clay pixels | Partial | `game-painted-studies.js` | Uses worldPosition for clay ridges, but adapter omits captured worldFromClip. |
| 48 | `game-windwaker` — Wind Waker / inlays | Partial | `game-graphic-studies.js` | Graphic plan uses cleanFields and actual world positions; geometric creases/metalness/worldFromClip missing. |
| 49 | `game-persona` — Persona / cutouts | Partial | `game-graphic-studies.js` | Graphic plan uses cleanFields and actual world positions; geometric creases/metalness/worldFromClip missing. |
| 50 | `game-inside` — INSIDE / backlight | Partial | `game-spatial-studies.js` | Spatial plan derives camera basis/world positions from worldFromClip, currently absent; falls back to wrong fixed camera plane. |
| 51 | `game-mirrorsedge` — Mirror’s Edge / high key | Partial | `game-spatial-studies.js` | Spatial plan derives camera basis/world positions from worldFromClip, currently absent; falls back to wrong fixed camera plane. |
| 52 | `game-viewfinder` — Viewfinder / photo | Partial | `game-spatial-studies.js` | Spatial plan derives camera basis/world positions from worldFromClip, currently absent; falls back to wrong fixed camera plane. |
| 53 | `surface-hatching` — Curvature hatching | Partial | `surface-hatching.js` | Enabled but surfaceHatches() returns empty path arrays. Real curvature-following marks unavailable. |
| 54 | `resonant-sand` — Resonant sand | Partial | `resonant-sand.js` | Enabled but membraneMasks() returns []; no projected membrane domains. |
| 55 | `contour-pools` — Contour pools | Already ported | `contour-pools.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 56 | `hooked-pen` — Hooked pen | Already ported | `hooked-pen.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 57 | `naturalist-plate` — Naturalist plate | Partial | `naturalist-plate.js` | Enabled but surfacePoints() is empty; world position fallback and zero transmission additionally affect wash. |
| 58 | `electric-contour` — Electric contours | Already ported | `electric-contour.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 59 | `cut-print` — Cut-print nocturne | Already ported | `cut-print.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 60 | `knife-paint` — Layered knife paint | Already ported | `knife-paint.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 61 | `wax-resist` — Wax-resist dye | Already ported | `wax-resist.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 62 | `directed-tesserae` — Directed tesserae | Already ported | `directed-tesserae.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 63 | `continuous-thread` — Continuous thread | Missing (excluded) | `continuous-thread.js` | Excluded for stale geometry reason; implementation consumes image darkness only. Restore with bounded chord-solver/worker tests. |
| 64 | `quilled-paper` — Upright paper | Missing (excluded) | `quilled-paper.js` | Excluded for stale geometry reason; implementation constructs paper relief from image owner/normal/depth/material data, not source geometry. Restore with real render/worker tests. |
| 65 | `lifted-emulsion` — Lifted emulsion | Already ported | `lifted-emulsion.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 66 | `color-woodblock` — Color woodblock | Already ported | `color-woodblock.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 67 | `typed-contours` — Typed contours | Already ported | `structural-glyphs.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 68 | `faceted-planes` — Faceted planes | Already ported | `faceted-study.mjs` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 69 | `curved-paint` — Curved paint | Already ported | `curved-paint-study.mjs` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 70 | `translucent-tape` — Translucent tape | Already ported | `translucent-tape-study.mjs` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 71 | `thickness-exposure` — Thickness exposure | Missing (excluded) | `thickness-exposure-study.js` | Excluded; requires snapshot + per-mesh closed/open classification. Existing core fixes owner semantics to Garden IDs and budgets to 20 meshes/24k triangles. |
| 72 | `copy-feedback` — Repeated-copy feedback | Already ported | `copy-feedback-study.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 73 | `section-ribs` — Section ribs | Missing (excluded) | `section-rib-study.js` | Excluded; fixed source signature/baked ribs and 20-mesh geometry. Must derive slabs/ribbon cages from actual scene triangles, retaining original surfaces where appropriate. |
| 74 | `prismatic-exposure` — Prismatic exposure | Already ported | `prismatic-exposure.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 75 | `rank-streaks` — Pixel sorting | Already ported | `rank-streak-study.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 76 | `pixel-clusters` — Pixel clusters | Already ported | `pixel-cluster-study.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 77 | `finite-lenses` — Finite lenses | Already ported | `finite-lens-study.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 78 | `chromatic-shadows` — Chromatic shadows | Missing (excluded) | `styles.js` | Excluded; fixed 720 capture and 20-mesh admission. Needs actual triangles, source depths, worldFromClip and light directions for two visibility fields. |
| 79 | `single-cutaway` — Single cutaway | Missing (excluded) | `cutaway-study.js` | Excluded; source-admitted common-plane solids/open-sheet proxy. Needs actual closed/open topology, camera/light, new shadow visibility and pigment data. |
| 80 | `wholetoning` — Wholetoning | Missing (excluded) | `wholetoning-study.js` | Excluded; fixed search work budget fails on many small shapes. Adapt bounded region solver without replacing mechanism. |
| 81 | `tone-illustration` — Tone illustration | Partial | `tone-illustration-study.js` | Shared Clean-cel fields lack real creases and metallic marker metadata. |
| 82 | `triangle-stack` — Triangle stack | Already ported | `triangle-stack-study.js` | Original implementation present and selectable; image-capture inputs supplied. Render verification still required. |
| 83 | `directional-color` — Directional color | Missing (excluded) | `directional-color-study.js` | Excluded for latency (~7 s), not unavailable mathematics. Keep real three-pass abstraction; worker/cancel/performance validation needed. |
| 84 | `interior-lattice` — Interior lattice | Missing (excluded) | `volume-bar-study.js` | Excluded; fixed source signatures + 1,503 precomputed bars. Requires actual-scene interior bar generation and visibility, not reuse of Garden bake. |

## Shared dependencies and precise contracts

- Original p5 1.x is vendored under `public/atelier/vendor`; Conjure p5 2.x is separate. Keep constructors isolated and reuse the existing asynchronous runtime loader.
- `mixer.js`, `contact-worker.js`, `drawing-protocol.js`, study-specific preparation/plan modules, and `render-source.js` handle off-thread work, source-owned caches and cancellation. Feeding geometry only to the main-thread frame is insufficient: worker snapshot protocol must preserve it.
- `geometry-studies.js` supplies lazy samples, mesh–plane sections, triangle/box voxels, open boundaries, curvature hatches, membrane projection. `snapshotGeometryStudies` exports version1, size, view, projection, meshes(position/index/drawRange/matrix/side). Restoration assumes sequential owner IDs. Several routines skip the first mesh as floor.
- `worldFromClip` is inverse view × inverse projection. Without it, `spectral-film.js::worldFromPixel` falls back to a hardcoded 8.2-world-unit screen plane. This silently changes world-attached effects on differently scaled/rotated scenes.
- Section ribs and Interior lattice currently use fixed baked proxies keyed to exact Garden signatures; Single cutaway accepts fixed Garden source geometry. Their tiny-tolerance portability fallback solves transcendental drift only; it does not make arbitrary meshes supported. Do not remove hash gates while retaining Garden geometry.
- Thickness exposure is generalized in several mathematical parts, but fixes closed body IDs to [2,3,4,5,6,8,9,10,13,15,17,19,20], owner range1–20, mesh count20, and 24,000 vertices/triangles. It must derive closed/open classes from actual topology and handle bounded real scene budgets.
- Chromatic shadows uses two geometric visibility fields with four-state color and source-luminance modulation; it explicitly demands 720px/20 meshes and Garden material state. Correct port needs a scene-derived trace structure and real two-light inputs.
- Fixed-source image studies (e.g. Directional color 720, Pixel clusters720→120, Triangle stack144) carry intentional source-size/quality contracts. Respect source resampling and cache associations; do not arbitrarily downsample to make tests faster and claim equivalent output.
- Existing composition finishes already load the original worker implementations through `image-finisher.js`.

## Separate 3D-material catalogue

The user asked for styles. These are a distinct pre-capture material catalogue, inventoried so image-study coverage is not confused with all Atelier functionality. None of these original material factories is currently imported by Conjure's engine. Conjure's 12 shared `kit/material.ts` swatches are independent representations; same words such as chrome and velvet do not establish fidelity to Atelier's shader models.

| ID | Name | Baseline | Integration constraints |
|---|---|---|---|
| `brushed-steel` | Brushed steel | Source present; not integrated as Atelier material | Original material-library factory, shaders and material bake inputs needed; keep compatible Three.js/environment/capture behavior. |
| `chrome` | Chrome | Source present; not integrated as Atelier material | Original material-library factory, shaders and material bake inputs needed; keep compatible Three.js/environment/capture behavior. |
| `brass` | Brass | Source present; not integrated as Atelier material | Original material-library factory, shaders and material bake inputs needed; keep compatible Three.js/environment/capture behavior. |
| `copper` | Copper | Source present; not integrated as Atelier material | Original material-library factory, shaders and material bake inputs needed; keep compatible Three.js/environment/capture behavior. |
| `porcelain` | Porcelain | Source present; not integrated as Atelier material | Original material-library factory, shaders and material bake inputs needed; keep compatible Three.js/environment/capture behavior. |
| `marble` | Marble | Source present; not integrated as Atelier material | Original material-library factory, shaders and material bake inputs needed; keep compatible Three.js/environment/capture behavior. |
| `concrete` | Concrete | Source present; not integrated as Atelier material | Original material-library factory, shaders and material bake inputs needed; keep compatible Three.js/environment/capture behavior. |
| `stone` | Stone | Source present; not integrated as Atelier material | Original material-library factory, shaders and material bake inputs needed; keep compatible Three.js/environment/capture behavior. |
| `wood` | Solid wood | Source present; not integrated as Atelier material | Requires original geometric/material bake attributes and fiber shader. |
| `frosted-glass` | Frosted glass | Source present; not integrated as Atelier material | Requires original transmission shader, custom capture and caster policy, and compatible environment. |
| `skin` | Skin | Source present; not integrated as Atelier material | Requires soft-tissue material shader and bake attributes. |
| `adipose` | Fatty tissue | Source present; not integrated as Atelier material | Requires soft-tissue material shader and bake attributes. |
| `muscle` | Aligned muscle | Source present; not integrated as Atelier material | Requires aligned soft-tissue material shader and bake attributes. |
| `cortical-bone` | Cortical bone | Source present; not integrated as Atelier material | Requires original bone shader and bake attributes. |
| `cancellous-bone` | Cancellous bone | Source present; not integrated as Atelier material | Requires original bone shader and bake attributes. |
| `velvet` | Velvet | Source present; not integrated as Atelier material | Original material-library factory, shaders and material bake inputs needed; keep compatible Three.js/environment/capture behavior. |
| `woven-linen` | Woven linen | Source present; not integrated as Atelier material | Requires woven-linen geometry charts, quadrature tables and anisotropic shader integration. |
| `diffraction-foil` | Diffraction foil | Source present; not integrated as Atelier material | Requires original spectral model/resources and directional light shader integration. |
| `hammered-metal` | Hammered metal | Source present; not integrated as Atelier material | Requires impact-field resources and local material-frame mapping; source explicitly excludes shear. |
| `interference-coat` | Interference coat | Source present; not integrated as Atelier material | Requires fixed optical lookup tables/resources and coating shader integration. |
| `tiled-surface` | Tiled surface | Source present; not integrated as Atelier material | Original material-library factory, shaders and material bake inputs needed; keep compatible Three.js/environment/capture behavior. |
| `perlage-metal` | Circular-grained metal | Source present; not integrated as Atelier material | Requires circular-grain surface charts/geometry manager and consistent tangent frame. |
| `perforated-shell` | Perforated metal | Source present; not integrated as Atelier material | Source restricts to Garden vase/sphere; aperture visibility must agree across beauty, depth, identity, samples, hatches and shadows. |
| `shingle-relief` | Shingle relief | Source present; not integrated as Atelier material | Source restricts to Garden vase; per-surface charts and geometry manager required. |
| `enamel-reserve` | Enamel reserve | Source present; not integrated as Atelier material | Source restricts to Garden vase; closed blue cells in metal reserve, geometry charts/manager; explicitly requires Three180. |
| `ribbed-clay` | Ribbed clay | Source present; not integrated as Atelier material | Source restricts to Garden vase; joined-course relief and geometry manager; explicitly requires Three180. |

Atelier vendors Three.js180; Conjure uses185.1. Shader hooks and direct-light call sites need explicit compatibility verification. Revision guards should only change after validating the relevant shader contracts. Geometry-scoped materials must be honestly scoped or generalized onto real supported geometry, not exposed under generic PBR names.

## Evidence gathered

- Imported `styles.js` and `material-library.js` under Node to enumerate actual registries.
- Compared all archive `dist/*` files with current `public/atelier/*` using SHA-256; 172/172 identical.
- Read the current adapter, selectors/exclusions, frame construction, worker snapshot, geometry restore, fixed-scene study entry points, material support rules, and source changelog.
- No repository files, original Atelier sources, services, or model generations changed by this inventory task.
