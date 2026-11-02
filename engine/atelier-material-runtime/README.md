# Atelier materials in Conjure

The 34 source modules in this directory come from the Atelier Rendering Studies
v83 material dependency tree. `upstream.json` records hashes of the unmodified
`public/atelier` originals. They bind to Conjure's installed Three.js instead of
loading a second, vendored r180 constructor set. The frozen source modules under
`public/atelier` remain unchanged.

`conjure-adapter.js` supplies the variable-scene integration: the source's actual
curvature, sharp-edge and 16-ray ambient visibility bake; its procedural studio
reflection texture; its material shaders, spectral tables, relief and pigment
fields; and original primitive woven charts. Materials and geometry are installed
atomically, with original buffers and material slots restored on disposal.

Frosted glass uses the installed Three transmission chunk with Atelier's
orthographic view-direction correction. Its adapter validates the targeted shader
statement and preserves all native transmission/compositing terms. It does not
pretend that r185 is r180 or change global shader chunks.

The 22 portable material names are prefixed `atelier-` so the original twelve
Conjure material IDs and capture bytes remain stable. They are applied before the
render and carry the reserved capture byte 255; the generic materialize pass must
leave them alone. Each physical material also exposes its actual source pigment
companion as `userData.atelierAlbedoMaterial` (owned by the same library), and the
source definition's transmission as `userData.atelierTransmission`. The pigment
shader outputs linear base colour without baked reflections or transmission.
A style can still deliberately flatten/replace the material when
it redraws the scene, just as in Atelier.

## Deliberate variable-scene adaptations

- Curvature/AO are baked over the selected component surfaces and their local
  contacts; scene-level direct shadows come from Conjure's lights. This is a static
  bake in the component's current pose, not animated or refractive ambient transport.
  Instanced surfaces share the source shape's bake; cross-instance AO is not baked.
- Woven linen keeps source charts on supported native primitives. Other authored
  UV atlases use a metric area-scaled yarn chart. UV-less arbitrary meshes use
  triangle tangent charts, with visible chart seams at triangle boundaries. These
  charts feed the original interlaced-yarn relief and radiance mechanism.
- Circular-grained metal uses the original UV validity and tangent charts. An
  arbitrary mesh without UVs gets a triangle tangent atlas. The Garden-specific
  fixed 8.2-world-unit small-plant fallback is not applied to unrelated scenes.
- Fully frosted meshes stop casting an opaque shadow, matching the source policy.
  Mixed-material meshes retain their opaque-slot caster; per-slot transparent shadow
  masking is not modeled.
- Shader coordinates remain attached to mesh-local space. Like other procedural
  Conjure materials, stretching or scaling the object changes the mark scale.

## Four source-scoped materials remain unavailable

| Source ID | Exact remaining dependency |
| --- | --- |
| `perforated-shell` | Garden Vase/Sphere shell charts; aperture-aware depth, normal, identity and shadow passes; retained visibility masks for shell openings. |
| `shingle-relief` | Original Vase outer-profile chart, retained interior region, source relief domain and visibility quadrature. |
| `enamel-reserve` | Original Vase outer-profile chart, reserve domain and shared radiance quadrature. |
| `ribbed-clay` | Original Vase outer-profile chart, joined-course domain and retained interior region. |

These four factories remain in the dependency tree but are not offered by the
Conjure selector. A same-named replacement texture is not treated as a port.
