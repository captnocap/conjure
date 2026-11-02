import { volumeBarStudy } from './volume-bar-study.js';
import { directionalColorStudy } from './directional-color-study.js';
import { triangleStackStudy } from './triangle-stack-study.js';
import { restoreGeometryStudies } from "./geometry-studies.js";
import { materialVisibilityKey, copyMaterialVisibility } from "./material-visibility.js";
import { translucentTapeStudy } from "./translucent-tape-study.mjs";
import { thicknessExposureStudy } from "./thickness-exposure-study.js";
import { copyFeedbackStudy } from "./copy-feedback-study.js";
import { sectionRibStudy } from "./section-rib-study.js";
import { prismaticExposureStudy } from "./prismatic-exposure.js";
import { rankStreakStudy } from "./rank-streak-study.js";
import { pixelClusterStudy } from "./pixel-cluster-study.js";
import { finiteLensStudy } from "./finite-lens-study.js";
import { chromaticShadowStudy } from "./chromatic-shadow-study.js";
import { cutawayStudy } from "./cutaway-study.js";
import { wholetoningStudy } from "./wholetoning-study.js";
import { toneIllustrationStudy } from "./tone-illustration-study.js";
import { curvedPaint } from "./curved-paint-study.mjs";
import { facetedPlanes } from "./faceted-study.mjs";
import { drawTypedContours } from "./structural-glyphs.js";
import { quilledPaperRegistry } from "./quilled-paper.js";
import { draw as drawLiftedEmulsion } from "./lifted-emulsion.js";
import { drawColorWoodblock } from "./color-woodblock.js";
import { drawContinuousThread } from "./continuous-thread.js";
import { directedTesseraeRegistry } from "./directed-tesserae.js";
import { waxResist } from "./wax-resist.js";
import { drawElectricContour } from "./electric-contour.js";
import { drawCutPrint } from "./cut-print.js";
import { drawKnifePaint } from "./knife-paint.js";
import { drawContourPools } from "./contour-pools.js";
import { drawHookedPen } from "./hooked-pen.js";
import { drawNaturalistPlate } from "./naturalist-plate.js";
import {
  drawObraDinn,
  drawDisco,
  drawOkami,
  drawHylics,
} from "./game-painted-studies.js";
import {
  drawSable,
  drawPersona,
  drawWindWaker,
} from "./game-graphic-studies.js";
import {
  drawInside,
  drawMirrorsEdge,
  drawViewfinder,
} from "./game-spatial-studies.js";
import { drawInkStudy, defaultInk } from "./ink-effects.js";
import { drawCleanStudy, celBands } from "./clean-studies.js";
import { drawSurfaceHatching } from "./surface-hatching.js";
import { drawResonantSand } from "./resonant-sand.js";
import { drivePeriod } from "./resonance.js";
import {
  filmLut,
  sampleFilm,
  baseThickness,
  thicknessOffset,
  worldFromPixel,
  linearToDisplay,
} from "./spectral-film.js";
/** Add a treatment by appending one registry entry. All draw functions consume the same frame. */
export const styles = [
  {
    id: "riso",
    family: "Print & transfer",
    control: "Screen density",
    name: "Risograph",
    title: "The printed image.",
    medium: "Two inks, one impression",
    swatch: "#dd745b",
    category: "INK SEPARATION",
    description:
      "Two spot-ink plates turn light into tiny fields of color. A slight registration shift lets the blue and vermilion impressions slip past one another.",
    mechanism:
      "Separate coverage masks · rotated dot screens · multiply overprint · seeded plate misregistration",
    reference: "https://www.riso.co.jp/english/company/risoart/works.html",
    draw: riso,
  },
  {
    id: "woodcut",
    family: "Print & transfer",
    control: "Cut density",
    name: "Woodcut",
    title: "Light, carved away.",
    medium: "Cut marks / charcoal ink",
    swatch: "#35413a",
    category: "SUBTRACTIVE MARKS",
    description:
      "The image is built from directional cuts and unprinted paper. Denser crossing marks hold the shadows while broken contours keep a carved edge.",
    mechanism:
      "Tone-gated hatch fields · crosshatching in deep shade · ink contours · seeded cut variation",
    reference: "https://www.metmuseum.org/art/collection/search/356497",
    draw: woodcut,
  },
  {
    id: "stipple",
    family: "Marks & pigment",
    control: "Point density",
    name: "Stipple",
    title: "A gathering of points.",
    medium: "Graphite / point density",
    swatch: "#9a8264",
    category: "DENSITY DRAWING",
    description:
      "No continuous shaded surface remains. Thousands of small, individually seeded dots accumulate into volume, contact shadows and soft material changes.",
    mechanism:
      "Jittered sample lattice · tone-dependent acceptance · stable random thresholds · edge enrichment",
    reference: "https://www.metmuseum.org/art/collection/search/372060",
    draw: stipple,
  },
  {
    id: "loom",
    family: "Thread & weave",
    control: "Weave density",
    name: "Woven field",
    title: "A scene in threads.",
    medium: "Warp, weft and borrowed light",
    swatch: "#b09850",
    category: "TEXTILE STRUCTURE",
    description:
      "The scene is translated into a grid of interlocking threads. Alternating over-and-under stitches make every surface feel woven rather than filled.",
    mechanism:
      "Discrete color sampling · alternating warp/weft order · filament highlights · shadow seams",
    reference: "https://www.moma.org/artists/96-anni-albers",
    draw: loom,
  },
  {
    id: "optical",
    family: "Light & waves",
    control: "Stripe frequency",
    name: "Optical relief",
    title: "Volume between lines.",
    medium: "Black ink / displaced stripes",
    swatch: "#191d1c",
    category: "PHASE DISTORTION",
    description:
      "One continuous field of parallel lines bends around the scene. Shading and surface orientation stretch the stripe rhythm into an optical relief.",
    mechanism:
      "Continuous stripe field · normal-driven phase displacement · illumination-dependent displacement",
    reference: "https://www.moma.org/audio/playlist/297/4821",
    draw: optical,
  },
  {
    id: "cyanotype",
    family: "Print & transfer",
    control: "Exposure",
    name: "Cyanotype",
    title: "An impression of light.",
    medium: "Prussian blue / exposure study",
    swatch: "#184977",
    category: "EXPOSURE PRINT",
    description:
      "Pale silhouettes float in a deep blue exposure, with softened edges and uneven paper coating. This tonal interpretation borrows from contact-print processes.",
    mechanism:
      "Inverted exposure response · bright silhouette interiors · seeded coating variation · contact fringes",
    reference: "https://www.metmuseum.org/art/collection/search/291517",
    draw: cyanotype,
  },
  {
    id: "contours",
    family: "Lines & geometry",
    control: "Contour count",
    name: "Contour atlas",
    title: "A landscape of tone.",
    medium: "Isolines / cartographic ink",
    swatch: "#cb653f",
    category: "ISOLINE EXTRACTION",
    description:
      "Bands of equal illumination become topographic contours. A familiar solid object opens into a map of ridges, pools and nested lines.",
    mechanism:
      "Quantized luminance · isoline threshold crossings · palette-indexed plateaus · contour ink",
    reference: "https://www.metmuseum.org/art/collection/search/856234",
    draw: contours,
  },
  {
    id: "frottage",
    family: "Print & transfer",
    control: "Graphite pressure",
    name: "Frottage",
    title: "A surface remembers.",
    medium: "Graphite / rubbed grain",
    swatch: "#6d7061",
    category: "PRESSURE TRANSFER",
    description:
      "Long ridges of simulated woodgrain catch graphite under the scene’s changing pressure. Paper gaps interrupt the rubbing and reveal the grain beneath the image.",
    mechanism:
      "Anisotropic seeded ridge field · illumination-driven pressure · thresholded graphite transfer",
    reference: "https://www.moma.org/collection/works/37053",
    draw: frottage,
  },
  {
    id: "cutpaper",
    family: "Cut & assembly",
    control: "Edge roughness",
    name: "Cut paper",
    title: "Scissors against space.",
    medium: "Cut silhouettes / layered paper",
    swatch: "#e48a42",
    category: "CONNECTED SHAPES",
    description:
      "Flat pieces of colored paper replace continuous shading. Connected tone regions become irregular cut silhouettes, with small shadows where one paper layer meets another.",
    mechanism:
      "Connected-region segmentation · traced polygon boundaries · seeded edge cuts · offset paper shadows",
    reference: "https://www.moma.org/calendar/galleries/5119",
    draw: cutpaper,
  },
  {
    id: "reticulum",
    family: "Lines & geometry",
    control: "Network density",
    name: "Reticulum",
    title: "An open architecture.",
    medium: "Wire / knotted line networks",
    swatch: "#69756f",
    category: "SPARSE GRAPH",
    description:
      "A light network replaces solid surfaces. Neighbouring sample points connect into irregular wire cells, and tiny knots hold the drawing together while negative space remains open.",
    mechanism:
      "Normal-sensitive sampling · jittered graph nodes · neighbourhood connections · joined wire knots",
    reference: "https://www.moma.org/collection/works/132790",
    draw: reticulum,
  },
  {
    id: "luminous",
    family: "Light & waves",
    control: "Trace density",
    name: "Luminous field",
    title: "Matter becomes light.",
    medium: "Luminous contours / dark field",
    swatch: "#7c9eea",
    category: "EMISSIVE RECONSTRUCTION",
    description:
      "Conventional surfaces dissolve into luminous contour traces. Several wide, translucent strokes accumulate around the same edges before a thin bright core brings them back into focus.",
    mechanism:
      "Image-space contour extraction · additive multi-width emission · surface-normal color · dark negative space",
    reference: "https://web.guggenheim.org/exhibitions/turrell/",
    draw: luminous,
  },
  {
    id: "scanner",
    family: "Lines & geometry",
    control: "Scan density",
    name: "Data engraving",
    title: "Coordinates of a garden.",
    medium: "Scan lines / sampled notation",
    swatch: "#62947d",
    category: "GLYPH ENCODING",
    description:
      "An instrument-like reading of the scene. Marks, crosshairs and compact digits encode the reference’s local tone while interrupted scan lines keep the underlying objects recognizable.",
    mechanism:
      "Discrete luminance glyphs · sampled normal orientation · interval scanlines · coordinate crosshairs",
    reference: "https://www.ryojiikeda.com/project/x_verse/",
    draw: scanner,
  },
  {
    id: "depth",
    family: "Lines & geometry",
    control: "Depth intervals",
    name: "Depth etching",
    title: "The measure of space.",
    medium: "Depth sections / etched lines",
    swatch: "#44616b",
    category: "DEPTH CONTOURS",
    description:
      "This drawing measures the scene itself. Contour intervals come from a true depth pass, so lines wrap around three-dimensional surfaces independently of their material color or illumination.",
    mechanism:
      "Packed GPU depth · camera-space intervals · object-identity silhouettes · etched section lines",
    reference: "https://www.metmuseum.org/art/collection/search/856234",
    draw: depthEtching,
  },
  {
    id: "embroidery",
    family: "Thread & weave",
    control: "Stitch density",
    name: "Surface embroidery",
    title: "Following the surface.",
    medium: "Curved paths / stitched thread",
    swatch: "#a76d4c",
    category: "NORMAL-FIELD FLOW",
    description:
      "Short paths trace the orientation of each surface, then break into stitched segments. Curves stay within their own object, making the drawing follow form rather than a regular grid.",
    mechanism:
      "Normal-guided streamline integration · mesh-boundary stopping · broken stitches · thread highlights",
    reference: "https://www.moma.org/artists/96-anni-albers",
    draw: embroidery,
  },
  {
    id: "wash",
    family: "Marks & pigment",
    control: "Water spread",
    name: "Pigment wash",
    title: "Where the water settles.",
    medium: "Diffused pigment / paper",
    swatch: "#708ea2",
    category: "DIFFUSION STUDY",
    description:
      "Pigment spreads through a small, seeded paper field before settling at boundaries. This deliberately simple diffusion model loosens edges and leaves uneven pools of color.",
    mechanism:
      "Multi-pass pigment diffusion · variable paper absorption · boundary pooling · unpainted paper gaps",
    reference:
      "https://www.metmuseum.org/perspectives/materials-and-techniques-drawing-watercolor",
    draw: pigmentWash,
  },
  {
    id: "architectural",
    family: "Lines & geometry",
    control: "Hidden structure",
    name: "Architectural plate",
    title: "The bones of a scene.",
    medium: "Projected edges / technical ink",
    swatch: "#5a6062",
    category: "GEOMETRY PROJECTION",
    description:
      "Real mesh creases are projected into a technical drawing. Visible edges remain solid; occluded structure appears as faint broken lines behind the object silhouettes.",
    mechanism:
      "Three.js crease extraction · camera projection · measured depth occlusion · dashed hidden structure",
    reference: "https://www.metmuseum.org/art/collection/search/337725",
    draw: architectural,
  },
  {
    id: "interference",
    family: "Light & waves",
    control: "Screen divergence",
    name: "Moiré interference",
    title: "A second rhythm appears.",
    medium: "Interfering waves / depth modulation",
    swatch: "#647568",
    category: "SCREEN INTERFERENCE",
    description:
      "Two nearly parallel wave fields produce a slower, larger rhythm where they combine. The scene's depth and normals shift one screen, turning solid surfaces into interference fringes.",
    mechanism:
      "Two coherent wave fields · angular beating · depth-driven phase · squared-amplitude interference",
    reference: "https://www.moma.org/audio/playlist/297/4821",
    draw: interference,
  },
  {
    id: "photogram",
    family: "Print & transfer",
    control: "Exposure response",
    name: "Photogram",
    title: "A shadow held in paper.",
    medium: "Negative exposure / material masks",
    swatch: "#515c64",
    category: "CONTACT-PRINT INTERPRETATION",
    description:
      "Opaque objects become pale silhouettes while the glass orb admits a darker exposure. Material transmission, rather than surface color, determines this camera-fixed interpretation of a contact print.",
    mechanism:
      "Mesh-identity masks · actual material transmission · connected soft edges · seeded film grain",
    reference: "https://www.moma.org/collection/works/54349",
    draw: photogram,
  },
  {
    id: "glass",
    family: "Cut & assembly",
    control: "Glass divisions",
    name: "Leaded glass",
    title: "A construction of light.",
    medium: "Lead cames / painted glass",
    swatch: "#aa943b",
    category: "CELL ASSEMBLY",
    description:
      "Irregular glass pieces are held by dark structural seams. Finer painted traces and translucent-looking washes sit inside the pieces, keeping their roles separate from the lead network.",
    mechanism:
      "Seeded Voronoi pieces · mesh-boundary lead cames · separate trace paint · material-color light fields",
    reference: "https://www.vam.ac.uk/articles/stained-glass-an-introduction",
    draw: leadedGlass,
  },
  {
    id: "transfer",
    family: "Print & transfer",
    control: "Transfer pressure",
    name: "Solvent transfer",
    title: "Only the rubbed parts remain.",
    medium: "Fragmented color / directional rubbing",
    swatch: "#a57d62",
    category: "PRESSURE-SELECTIVE TRANSFER",
    description:
      "Colored fragments of the reference appear only where directional rub marks apply pressure. Large gaps of bare paper and incomplete edges interrupt the image; its projection stays fixed for comparison.",
    mechanism:
      "Source-color transfer strokes · broad pressure masks · incomplete edge pickup · unprinted paper",
    reference:
      "https://www.rauschenbergfoundation.org/art/lightboxes/transfer-drawings",
    draw: solventTransfer,
  },
  {
    id: "volume",
    family: "Light & waves",
    control: "Light spread",
    name: "Luminous volume",
    title: "Space made of light.",
    medium: "Depth-lit masses / soft diffusion",
    swatch: "#a47fc4",
    category: "MULTISCALE LIGHT FIELDS",
    description:
      "Whole surfaces radiate softly instead of becoming bright outlines. Depth shifts the light from warm to cool, and broad diffusion lets adjacent forms illuminate their surrounding space.",
    mechanism:
      "Filled radiance masks · view-normal intensity · depth-weighted color · multiscale screen-space diffusion",
    reference: "https://web.guggenheim.org/exhibitions/turrell/",
    draw: luminousVolume,
  },
  {
    id: "surface-dots",
    family: "Marks & pigment",
    control: "Surface point density",
    name: "Surface pointillism",
    title: "Marks that belong to the form.",
    medium: "3D-anchored pigment / optical color",
    swatch: "#bf9160",
    category: "SURFACE-AREA SAMPLING",
    description:
      "These colored marks are attached to actual positions on the meshes. They move with the scene as you orbit the camera, while depth testing hides marks on the far side of each object.",
    mechanism:
      "World-area triangle sampling · stable 3D anchors · camera projection · depth-tested color marks",
    reference: "https://www.metmuseum.org/art/collection/search/437658",
    draw: surfacePointillism,
  },
  {
    id: "mezzotint",
    family: "Print & transfer",
    control: "Burnishing pressure",
    name: "Mezzotint",
    title: "Drawing light out of darkness.",
    medium: "Roughened plate / subtractive burnishing",
    swatch: "#373331",
    category: "INK-RETAINING PLATE MODEL",
    description:
      "The plate begins completely dark. Small overlapping burnisher strokes smooth its rough tooth where the scene is lit, so those areas retain less ink. Grain survives in midtones while polished highlights open toward paper.",
    mechanism:
      "Seeded burr-height field · normal-oriented local burnishing · monotone tooth removal · nonlinear ink retention",
    reference:
      "https://www.metmuseum.org/essays/the-printed-image-in-the-west-mezzotint",
    draw: mezzotint,
  },
  {
    id: "impasto",
    family: "Marks & pigment",
    control: "Paint load",
    name: "Impasto relief",
    title: "Paint catches the light.",
    medium: "Layered dabs / raised bristle channels",
    swatch: "#cb8a57",
    category: "ACCUMULATED PAINT RELIEF",
    description:
      "Broad overlapping strokes deposit pigment and build a separate layer of raised paint. The shared key light catches bristle ridges and uneven stroke edges; reducing paint load keeps the brush painting but flattens its relief.",
    mechanism:
      "Coarse-to-fine pigment dabs · accumulated height field · raised lips and bristle grooves · shared-key-light relief shading",
    reference: "https://www.nationalgallery.org.uk/paintings/glossary/impasto",
    draw: impasto,
  },
  {
    id: "reaction",
    family: "Reaction & growth",
    control: "Colony ink coverage",
    name: "Reactive cells",
    title: "A pattern grows from within.",
    medium: "Activator / inhibitor colonies",
    swatch: "#293d32",
    category: "NONLINEAR PATTERN GROWTH",
    description:
      "Two coupled concentration fields react and spread inside each object. A fixed number of simulation steps grows branching colonies and rounded gaps. Ink coverage reveals more or less of the same settled pattern; it never runs on wall-clock time.",
    mechanism:
      "Seeded Gray–Scott reaction · unequal diffusion · no-flux object boundaries · fixed-step growth · concentration-to-ink threshold",
    reference:
      "https://gallery.bridgesmathart.org/exhibitions/2010-bridges-conference/jonathanmccabe",
    draw: reactiveCells,
  },
  {
    id: "marbling",
    family: "Print & transfer",
    control: "Comb travel",
    name: "Marbled float",
    title: "A history held in liquid.",
    medium: "Floating drops / comb-drawn veins",
    swatch: "#b39455",
    category: "DROP DISPLACEMENT & ADVECTION",
    description:
      "Each new pigment drop pushes earlier paint outward. Reversible comb motions pull those nested boundaries into feathers and veins. The completed floating pattern is clipped to the unchanged objects, while their shared illumination still models the forms.",
    mechanism:
      "Sequential radial paint displacement · inverse history tracing · reversible tine maps · seeded pigment pools",
    reference:
      "https://www.vam.ac.uk/blog/museum-life/divers-oiled-colours-exploring-the-history-of-marbled-paper-in-the-national-art-library",
    draw: marbledFloat,
  },
  {
    id: "sections",
    family: "Lines & geometry",
    control: "Section count",
    formatStrength: (value) => `${Math.round(10 + value * 28)} planes`,
    name: "Sectional volume",
    title: "A volume made of intervals.",
    medium: "World-space cuts / open contours",
    swatch: "#52715d",
    category: "ACTUAL TRIANGLE–PLANE INTERSECTIONS",
    description:
      "Parallel horizontal planes cut the actual mesh triangles into profiles. Dark visible curves and pale rear curves reconstruct the unchanged objects as an open volume. These planes remain fixed in world space when the shared camera moves.",
    mechanism:
      "True mesh–plane intersections · stable world-space levels · captured-camera projection · depth-tested front and rear curves",
    reference:
      "https://www.corcoran.org/sites/default/files/MayaLinTeachersPacket.pdf#page=5",
    draw: sectionalVolume,
  },
  {
    id: "crackle",
    family: "Reaction & growth",
    control: "Secondary crazing",
    name: "Crackle glaze",
    title: "Fine fractures in a continuous skin.",
    medium: "Growing fissures / pale ceramic glaze",
    swatch: "#abc6b7",
    category: "COLLISION-LIMITED CRACK GROWTH",
    description:
      "Crack tips grow, branch and stop when they meet an older fissure or an object boundary. Dark primary cracks and finer brown branches sit inside a continuous pale glaze. Development reveals later fine branches while preserving the completed coarse network. Thin glaze reveals clay at visible open upper rims.",
    mechanism:
      "Seeded persistent tip growth · normal-variation branching · collision arrest · two-scale stained fissures · native component masks · projected open rims",
    reference: "https://www.metmuseum.org/art/collection/search/52683",
    draw: crackleGlaze,
  },
  {
    id: "oilspot",
    family: "Reaction & growth",
    control: "Earlier cooling",
    name: "Oil-spot glaze",
    title: "Minerals gather in the cooling glaze.",
    medium: "Bubble enrichment / frozen mineral islands",
    swatch: "#434d4a",
    category: "TRANSPORT AND CRYSTALLIZATION",
    description:
      "Bubbles compete for a finite iron supply, bring it to the surface, and leave moving deposits that freeze as the glaze cools. Earlier cooling changes the mineral islands and their trails on a glossy dark ground.",
    mechanism:
      "Shared iron budget · seeded bubble lifetimes · conservative masked transport · cooling precipitation · mineral/glaze reflection",
    reference: "https://www.metmuseum.org/art/collection/search/42466",
    draw: oilSpotGlaze,
  },
  {
    id: "sabattier",
    family: "Print & transfer",
    control: "Second exposure",
    name: "Sabattier print",
    title: "A second light changes the image.",
    medium: "Partial development / silver-toned reversal",
    swatch: "#8b9691",
    category: "EXPOSURE HISTORY",
    description:
      "A partially developed image retains a record of its first exposure. A second flash darkens unspent regions while nearby development alters the reaction, creating reversed tones and narrow luminous boundaries.",
    mechanism:
      "Latent exposure · retained silver density · second-flash shielding · diffused development field · local tonal reversal",
    reference: "https://www.metmuseum.org/art/collection/search/933658",
    draw: solarizedPrint,
  },
  {
    id: "relief",
    family: "Lines & geometry",
    control: "Slope compression",
    name: "Schiacciato",
    title: "Deep space, shallow stone.",
    medium: "Compressed gradients / carved ivory surface",
    swatch: "#c7bda2",
    category: "GLOBAL HEIGHT RECONSTRUCTION",
    description:
      "Camera-depth slopes are compressed, then reconciled into one shallow surface by a global Poisson solve. The shared light reveals the reconstructed carving, including the small steps left at occlusion boundaries.",
    mechanism:
      "Depth-gradient compression · small occlusion targets · global Poisson reconstruction · guided upsampling · shared-light relief shading",
    reference:
      "https://www.vam.ac.uk/articles/explore-donatellos-masterpiece-the-ascension",
    draw: schiacciato,
  },
  {
    id: "interlace",
    family: "Thread & weave",
    control: "Optical displacement",
    name: "Optical interlace",
    title: "The image bends through the cloth.",
    medium: "Continuous threads / alternating woven crossings",
    swatch: "#566e68",
    category: "DEFORMED WEAVE TOPOLOGY",
    description:
      "Two continuous thread families bend through a scene-derived displacement field. Their rising and falling surfaces alternate at every crossing, while thread coverage carries the image in dark and light fibers.",
    mechanism:
      "Bounded smooth deformation · iterative inverse mapping · continuous crossing parity · round thread shading · explicit over/under compositing",
    reference: "https://www.moma.org/artists/96-anni-albers",
    draw: opticalInterlace,
  },
  {
    id: "voxels",
    family: "Lines & geometry",
    control: "Cell density",
    name: "Surface Blocks",
    title: "The surface becomes a field of blocks.",
    medium: "World-grid shell / projected cube faces",
    swatch: "#bc9367",
    category: "CONSERVATIVE SURFACE VOXELS",
    description:
      "Cubes follow a fixed world grid around the original mesh triangles. Neighboring cells hide their shared faces; the remaining faces keep the original camera, material colors and light. This is a surface shell, with stepped silhouettes and coarser fine details.",
    mechanism:
      "Triangle–box overlap · stable world cells · nearest-surface material ownership · hidden neighbor faces · depth-ordered projected quads",
    reference: "https://www.eboy.com/products/berlin-poster",
    draw: surfaceBlocks,
  },
  {
    id: "spectral",
    family: "Light & waves",
    control: "Base film thickness",
    formatStrength: (value) => `${Math.round(baseThickness(value))} nm`,
    name: "Spectral coating",
    title: "A color held between surfaces.",
    medium: "Thin-film phase / spectral reflection",
    swatch: "#62aeac",
    category: "COHERENT FILM INTERFERENCE",
    description:
      "A transparent film coats the unchanged forms. Its thickness varies smoothly in world space; reflected wavelengths reinforce or cancel through the film's two interfaces. The thickness control moves those spectral bands instead of selecting a palette.",
    mechanism:
      "Signed s/p Fresnel amplitudes · coherent Airy interference · CIE/D65 spectral integration · fixed-world thickness · shared-light illustrative relighting. RGB/hemisphere approximation; no coat self-shadows or glass transmission.",
    reference:
      "https://olafureliasson.net/artwork/no-symmetry-in-the-ocean-2019/",
    draw: spectralCoating,
  },
  {
    id: "cel",
    family: "Cut & assembly",
    name: "Clean cel",
    title: "A few colors, clearly spoken.",
    control: "Shade bands",
    formatStrength: (value) => `${celBands(value)} tones`,
    medium: "Painted cels / crisp light bands",
    swatch: "#c8b989",
    category: "MATERIAL-AWARE CEL SHADING",
    description:
      "A small set of warm tones describes each material. A separate diffuse-light capture keeps cast shadows crisp, while the brass ring retains selected bright reflections. There is no paper grain.",
    mechanism:
      "Shared-light Lambert pass · discrete material palettes · independent metallic highlight mask · smooth mesh-identity contours and visible geometric creases",
    reference: "https://www.ghibli-museum.jp/en/exhibitions/013128/",
    draw: (p, f) => drawCleanStudy(p, f, "cel"),
  },
  {
    id: "clear-line",
    family: "Lines & geometry",
    name: "Ligne claire",
    title: "Every line has the same voice.",
    control: "Contour weight",
    medium: "Flat color / uniform clear line",
    swatch: "#d4aa7c",
    category: "FLAT FILL & MONOLINE",
    description:
      "Each object is filled with one material color, held by an even black line. Visible creases explain the architecture without hatching, drafting marks or tonal shading.",
    mechanism:
      "One flat fill per material · uniform antialiased contours · visible-only mesh creases · no shading bands, grain or dots",
    reference:
      "https://www.tintin.com/tintin/actus/actus/001090/DDPJoostFR.pdf#page=5",
    draw: (p, f) => drawCleanStudy(p, f, "clear-line"),
  },
  {
    id: "brush-cel",
    family: "Lines & geometry",
    name: "Bold ink",
    title: "Weight at the edge.",
    control: "Ink weight",
    medium: "Broad contour / fine inner line",
    swatch: "#283530",
    category: "DIRECTIONAL CONTOUR INK",
    description:
      "Bold contours give the forms a graphic silhouette. The line broadens with its direction, while thin inner creases and two restrained fill tones preserve the smaller details.",
    mechanism:
      "Two-tone material fills · smooth orientation-dependent contour width · thinner depth-tested creases · graphic metal highlights · no carved texture",
    reference: "https://www.waltdisney.org/blog/open-studio-try-home",
    draw: (p, f) => drawCleanStudy(p, f, "brush-cel"),
  },
  {
    id: "comic-dots",
    family: "Print & transfer",
    name: "Comic shadows",
    title: "Dots where the light falls away.",
    control: "Shadow dot size",
    medium: "Flat color / shadow-only screen",
    swatch: "#bf6e4a",
    category: "COMIC SHADOW SCREEN",
    description:
      "Clean colored shapes carry a regular dot screen only in their shadows. Lit areas and the background stay clear; black contours hold the drawing together.",
    mechanism:
      "Two-tone fills · fixed registered dot lattice clipped to diffuse shadows · independent highlight protection · clean contours and creases",
    reference: "https://lichtensteinfoundation.org/biography/",
    draw: (p, f) => drawCleanStudy(p, f, "comic-dots"),
  },
  {
    id: "expressive-ink",
    family: "Marks & pigment",
    name: "Expressive ink",
    title: "Let the ink escape.",
    control: "Ink pressure",
    medium: "Bloom / scrape / displaced line",
    swatch: "#d76a21",
    category: "LAYERED EXPRESSIVE INK",
    description:
      "A dark granular wash carries white scraped ridges, broken off-register contours and an unruly halo of droplets and bristles. Orange appears on three chosen elements. An optional depth-guided warp distorts the painting while the 3D scene stays fixed.",
    mechanism:
      "Seven adjustable effects · pooled cauliflower fronts · heavy-tail spatter · normal-guided white scrape · nervous contour drift · bristle flicks · selective orange · bounded screen warp",
    reference:
      "https://www.moma.org/collection/works/78386?package_id=AbEx&page=1&sov_referrer=package",
    referenceLabel: "View gestural paint context",
    draw: (p, f) => drawInkStudy(p, f, "expressive-ink"),
  },
  {
    id: "ink-bloom",
    family: "Marks & pigment",
    name: "Wash bloom",
    title: "Where the wash gathers.",
    control: "Ink pressure",
    medium: "Wet pooling / canvas granulation",
    swatch: "#484a39",
    category: "SCALLOPED WASH FRONTS",
    description:
      "A focused study of dark wet pooling, lighter bloom centers and scalloped drying rims. Canvas grain shows through the pigment; the outer wash edge is deliberately ragged.",
    mechanism:
      "Seeded wet patches · scalloped fronts · dark rim deposition · canvas tooth · no clipped spatter or line correction",
    reference:
      "https://www.moma.org/collection/works/78386?package_id=AbEx&page=1&sov_referrer=package",
    referenceLabel: "View gestural paint context",
    draw: (p, f) => drawInkStudy(p, f, "ink-bloom"),
  },
  {
    id: "ink-scrape",
    family: "Marks & pigment",
    name: "Scraped ink",
    title: "Drag light across the dark.",
    control: "Ink pressure",
    medium: "White knife marks / dark wash",
    swatch: "#c4c0a7",
    category: "NORMAL-GUIDED SCRAPE",
    description:
      "Broken white ribbons rake the ink along directions derived from the surface normals. Gaps and parallel tracks keep the scrape dry and uneven while the marks describe the original forms.",
    mechanism:
      "Surface-normal flow · clipped form-following paths · separated knife ribs · tapered dry paint · pooled ink foundation",
    reference:
      "https://www.moma.org/collection/works/78386?package_id=AbEx&page=1&sov_referrer=package",
    referenceLabel: "View gestural paint context",
    draw: (p, f) => drawInkStudy(p, f, "ink-scrape"),
  },
  {
    id: "ink-storm",
    family: "Marks & pigment",
    name: "Edge storm",
    title: "Beyond the outline.",
    control: "Ink pressure",
    medium: "Spatter / bristles / nervous line",
    swatch: "#333b34",
    category: "UNRESTRICTED EDGE MARKS",
    description:
      "Droplets radiate from the silhouettes into the whole canvas. Short hairs, a few streaks and broken drifting outlines refuse to sit neatly on the wash edge.",
    mechanism:
      "Bounded power-law droplet sizes · outward edge density · unrestricted placement · directional streaks · bristle taper · deliberate line misregistration",
    reference:
      "https://www.moma.org/collection/works/78386?package_id=AbEx&page=1&sov_referrer=package",
    referenceLabel: "View gestural paint context",
    draw: (p, f) => drawInkStudy(p, f, "ink-storm"),
  },
  {
    id: "game-obra",
    family: "Game-inspired worlds",
    name: "Obra Dinn / one bit",
    title: "One bit, a whole world.",
    control: "Dither threshold",
    medium: "Binary raster / reversed creases",
    swatch: "#30311a",
    category: "TWO-COLOR RASTER",
    description:
      "Inspired by Return of the Obra Dinn. A storm-deck screenshot inspires strict two-color pixels, broad solid darks and pale lines that reverse against lit areas.",
    mechanism:
      "Quantized logical raster · binary thresholds · ordered dither · polarity-aware silhouette and crease lines",
    reference:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/653530/ss_996fca2ef1e1f9cf16fd71f06c00919a61b1a2cc.1920x1080.jpg?t=1686697594",
    referencePage: "https://store.steampowered.com/app/653530/",
    referenceLabel: "View selected game screenshot",
    game: "Return of the Obra Dinn",
    draw: drawObraDinn,
  },
  {
    id: "game-disco",
    family: "Game-inspired worlds",
    name: "Disco / drybrush",
    title: "Weather in every stroke.",
    control: "Brush scale",
    medium: "Directional oil / lost edges",
    swatch: "#58616a",
    category: "DIRECTIONAL PAINT",
    description:
      "Inspired by Disco Elysium - The Final Cut. A cold pier screenshot inspires long drybrush strokes, chalky flecks and lost edges around quiet slate-colored forms.",
    mechanism:
      "Multiscale directional dabs · sampled material color · scumbled shadows · chalk highlights · selective lost edges",
    reference:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/632470/ss_b1205caa224a0dea0d141c2d6f7db4240cd5dbb7.1920x1080.jpg?t=1780913406",
    referencePage: "https://store.steampowered.com/app/632470/",
    referenceLabel: "View selected game screenshot",
    game: "Disco Elysium - The Final Cut",
    draw: drawDisco,
  },
  {
    id: "game-okami",
    family: "Game-inspired worlds",
    name: "Okami / brushwash",
    title: "Let the brush breathe.",
    control: "Brush pressure",
    medium: "Pressure ink / pooled wash",
    swatch: "#507e77",
    category: "BRUSH AND WASH",
    description:
      "Inspired by Okami HD. A coastal overlook inspires swelling brush contours, translucent color pools and fibrous paper visible through the wash.",
    mechanism:
      "Variable-pressure contours · translucent pooling · local edge wicking · paper granulation · stable colored marks",
    reference:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/587620/ss_71f6af1f989df2aa6bc4e07a9ae407609c264b2e.1920x1080.jpg?t=1733787035",
    referencePage: "https://store.steampowered.com/app/587620/",
    referenceLabel: "View selected game screenshot",
    game: "Okami HD",
    draw: drawOkami,
  },
  {
    id: "game-sable",
    family: "Game-inspired worlds",
    name: "Sable / schematics",
    title: "Quiet fields, intricate machines.",
    control: "Etch density",
    medium: "Fine panel engraving / signal glow",
    swatch: "#ba4b87",
    category: "SURFACE SCHEMATICS",
    description:
      "Inspired by Sable. An orbital-machine chamber inspires subdued fields, fine engineering seams and isolated pink emitters.",
    mechanism:
      "World-coordinate panel planes · compressed lighting · fine contours and creases · localized pink signal glow",
    reference:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/757310/ss_6132344e1a086e984169123445d637fef3b71a73.1920x1080.jpg?t=1780992723",
    referencePage: "https://store.steampowered.com/app/757310/",
    referenceLabel: "View selected game screenshot",
    game: "Sable",
    draw: drawSable,
  },
  {
    id: "game-hylics",
    family: "Game-inspired worlds",
    name: "Hylics / clay pixels",
    title: "Clay, reduced to pixels.",
    control: "Clay relief",
    medium: "Indexed relief / cavity dither",
    swatch: "#e9a148",
    category: "INDEXED CLAY",
    description:
      "Inspired by Hylics 2. A surreal clay-platform screenshot inspires molded normal relief, a compact warm/cool palette and black threshold texture in cavities.",
    mechanism:
      "Procedural clay ridges in shading · indexed palette · logical pixels · cavity-weighted threshold dither",
    reference:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1286710/ss_9b74c6a1b9af4ec02391e41eb52416c5e1fc0c63.1920x1080.jpg?t=1610844140",
    referencePage: "https://store.steampowered.com/app/1286710/",
    referenceLabel: "View selected game screenshot",
    game: "Hylics 2",
    draw: drawHylics,
  },
  {
    id: "game-windwaker",
    family: "Game-inspired worlds",
    name: "Wind Waker / inlays",
    title: "Light cut into the surface.",
    control: "Inlay size",
    medium: "Matte toon / luminous facets",
    swatch: "#dce05f",
    category: "EMISSIVE INLAYS",
    description:
      "Inspired by The Legend of Zelda: The Wind Waker HD. A dark boss-arena screenshot inspires unoutlined two-tone forms, cobalt shadows, cyan rim strips and angular yellow inlays.",
    mechanism:
      "Two-level matte shading · surface-attached diamond facets · selective rim strips · glow extracted only from inlays",
    reference:
      "https://www.nintendo.com/eu/media/images/06_screenshots/games_5/wiiu_7/wiiu_thelegendofzeldathewindwakerhd/WiiU_TheLegendofZelda_TheWindWakerHD_03.jpg",
    referencePage:
      "https://www.nintendo.com/en-gb/Games/Wii-U-games/The-Legend-of-Zelda-The-Wind-Waker-HD-765386.html",
    referenceLabel: "View selected game screenshot",
    game: "The Legend of Zelda: The Wind Waker HD",
    draw: drawWindWaker,
  },
  {
    id: "game-persona",
    family: "Game-inspired worlds",
    name: "Persona / cutouts",
    title: "Cut the image loose.",
    control: "Keyline pressure",
    medium: "Graphic cutouts / registration",
    swatch: "#d21b2e",
    category: "ANGULAR CUTOUTS",
    description:
      "Inspired by Persona 5 Royal. A cafeteria screenshot and its assertive interface inspire displaced white keylines, black cutout shadows and restrained red masses.",
    mechanism:
      "Object-bounded angular shadow wedges · offset black silhouettes · displaced white keylines · selected red print masses",
    reference:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1687950/ss_ddcc016b8e5c434ccbd1a89c0157ce73acf905ae.1920x1080.jpg?t=1783356822",
    referencePage: "https://store.steampowered.com/app/1687950/",
    referenceLabel: "View selected game screenshot",
    game: "Persona 5 Royal",
    draw: drawPersona,
  },
  {
    id: "game-inside",
    family: "Game-inspired worlds",
    name: "INSIDE / backlight",
    title: "A shape inside the haze.",
    control: "Atmospheric depth",
    medium: "Depth fog / backlit silhouettes",
    swatch: "#344955",
    category: "BACKLIT DEPTH",
    description:
      "Inspired by INSIDE. An industrial rooftop screenshot inspires near-black foreground masses, distant gray-blue haze and long directional shadows.",
    mechanism:
      "Actual-depth atmospheric mixing · silhouette backlight · surface-fragment floor shadows · restrained foreground contrast",
    reference:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/304430/ss_ebeba62a8d2141b4fd36760500529fb2d9a29190.1920x1080.jpg?t=1761819581",
    referencePage: "https://store.steampowered.com/app/304430/",
    referenceLabel: "View selected game screenshot",
    game: "INSIDE",
    draw: drawInside,
  },
  {
    id: "game-mirrorsedge",
    family: "Game-inspired worlds",
    name: "Mirror’s Edge / high key",
    title: "The bright edge of the city.",
    control: "Panel rhythm",
    medium: "High-key planes / façade seams",
    swatch: "#e9cd55",
    category: "HIGH-KEY ARCHITECTURE",
    description:
      "Inspired by Mirror’s Edge. A white city plaza screenshot inspires violet shadows, repeated façade ribs and small yellow accents from that particular view.",
    mechanism:
      "Surface-coordinate panel seams · high white shoulder · violet contact shade · selective yellow accents · localized glare",
    reference:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/17410/0000006707.1920x1080.jpg?t=1777394972",
    referencePage: "https://store.steampowered.com/app/17410/Mirrors_Edge/",
    referenceLabel: "View selected game screenshot",
    game: "Mirror’s Edge",
    draw: drawMirrorsEdge,
  },
  {
    id: "game-viewfinder",
    family: "Game-inspired worlds",
    name: "Viewfinder / photo",
    title: "A photograph through the world.",
    control: "Photo window",
    medium: "Color world / monochrome inset",
    swatch: "#53adc5",
    category: "SPATIAL MEDIA WINDOW",
    description:
      "Inspired by Viewfinder. A tropical scene interrupted by a monochrome bridge photograph inspires a crisp paper window through the same captured still life.",
    mechanism:
      "Tilted rectangular media stencil · monochrome photographic/etched interior · color exterior · narrow paper edge and shadow",
    reference:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1382070/ss_1392613d4ff0f7c3f989cc899cb40ce93b3ff8fb.1920x1080.jpg?t=1764842475",
    referencePage: "https://store.steampowered.com/app/1382070/",
    referenceLabel: "View selected game screenshot",
    game: "Viewfinder",
    draw: drawViewfinder,
  },
  {
    id: "surface-hatching",
    family: "Lines & geometry",
    name: "Curvature hatching",
    title: "Lines that belong to the form.",
    control: "Crosshatch pressure",
    medium: "Surface-traced ink / two tangent families",
    swatch: "#788975",
    category: "GEOMETRY-ALIGNED INK",
    description:
      "Hatch paths walk over the original triangles, following the surface’s principal curvature where it is defined. They wrap around the forms and stay in place as the camera turns; shadow admits the crossing family.",
    mechanism:
      "Geometry-fitted principal directions · transported tangent fallback on flat and spherical patches · triangle-edge integration · exact projected visibility · light-gated crosshatching",
    reference: "https://gfx.cs.princeton.edu/proj/hatching/",
    referenceLabel: "Curvature-aligned hatching research",
    draw: drawSurfaceHatching,
  },
  {
    id: "resonant-sand",
    family: "Reaction & growth",
    name: "Resonant sand",
    title: "Where motion grows quiet.",
    control: "Drive frequency",
    formatStrength: (value) => (50 / drivePeriod(value)).toFixed(2) + "×",
    medium: "Driven membranes / conserved grains",
    swatch: "#c8c5ae",
    category: "NODAL ACCUMULATION",
    description:
      "Each complete projected object becomes an independent vibrating membrane. A fixed budget of grains gathers where motion is weakest; changing the drive frequency rearranges the ridges.",
    mechanism:
      "Complete projected domains · checked complex harmonic response · conservative departure-rate equilibrium · fixed grain count · owner-clipped visibility. Camera changes reshape the 2D membrane; this is not 3D vibration or physical Hz.",
    reference:
      "https://sciencedemonstrations.fas.harvard.edu/presentations/chladni-plates",
    referenceLabel: "Nodal sand demonstration",
    referencePage: "https://doi.org/10.1103/PhysRevResearch.7.L032001",
    referencePageLabel: "Membrane and grain research",
    draw: drawResonantSand,
  },
  {
    id: "contour-pools",
    family: "Cut & assembly",
    name: "Contour pools",
    title: "Color finds its own course.",
    control: "Pool compression",
    medium: "Nested color islands / tapered black channels",
    swatch: "#df743a",
    category: "FLOWING COLOR REGIONS",
    description:
      "Broad blue, orange and cream islands flow through the scene. Black channels narrow and merge between quiet pools and compressed passages, with the forms bending their course.",
    mechanism:
      "Continuous depth/normal-bent scalar landscape · irregular level spacing · gradient-aware channels · filtered narrow bands · shared material-color influence",
    reference: "./reference-images/flowing-color.png",
    referenceLabel: "Supplied flowing-color reference",
    referencePage: "./art-references.html#contour-pools",
    referencePageLabel: "Construction notes",
    draw: drawContourPools,
  },
  {
    id: "hooked-pen",
    family: "Marks & pigment",
    name: "Hooked pen",
    title: "An image made of small turns.",
    control: "Ink packing",
    medium: "Coiling pen strokes / conserved paper gaps",
    swatch: "#353b35",
    category: "PACKED INK GESTURES",
    description:
      "Short hooks and coils grow around earlier strokes. Smaller marks fill the shadows while narrow paper gaps keep the dark masses open and alive.",
    mechanism:
      "Sequential collision-steered paths · coarse-to-fine infill · local tone budgets · variable stroke width · visible-surface clipping",
    reference: "./reference-images/hooked-ink.png",
    referenceLabel: "Supplied hooked-ink reference",
    referencePage: "./art-references.html#hooked-pen",
    referencePageLabel: "Construction notes",
    draw: drawHookedPen,
  },
  {
    id: "naturalist-plate",
    family: "Lines & geometry",
    name: "Naturalist plate",
    title: "The surface becomes a specimen.",
    control: "Vein detail",
    medium: "Hierarchical surface veins / transparent wash",
    swatch: "#75865d",
    category: "SURFACE SPECIMEN DRAWING",
    description:
      "Colored primary veins divide into fine branches and connecting loops. Restrained washes retain each material on a clean cream ground, turning familiar shapes into closely observed specimens.",
    mechanism:
      "Seeded mesh-sample graph · rooted branch hierarchy · fine reticulation · projected owner/depth clipping · continuous world-coordinate wash. Sampled surface approximation, not anatomical growth.",
    reference: "./reference-images/naturalist-detail.png",
    referenceLabel: "Supplied naturalist reference",
    referencePage: "./art-references.html#naturalist-plate",
    referencePageLabel: "Construction notes",
    draw: drawNaturalistPlate,
  },
  {
    id: "electric-contour",
    family: "Lines & geometry",
    name: "Electric contours",
    title: "Light painted along the edge.",
    control: "Ribbon pressure",
    medium: "Opaque light ribbons / directional paint",
    swatch: "#bbd75e",
    category: "PAINTED EDGE LIGHT",
    description:
      "Lime and ivory strips gather on light-facing edges; wider violet fringes mark the shadow side. Unequal broken ribbons and short painted highlights surround hard ink-dark masses.",
    mechanism:
      "Shared-light incidence · visible-surface edge transport · unequal paired ribbons · quiet ink gaps · clipped directional paint. Opaque marks, with no glow or fog.",
    reference: "./reference-images/electric-paint.png",
    referenceLabel: "Supplied electric-paint reference",
    referencePage: "./art-references.html#electric-contour",
    referencePageLabel: "Construction notes",
    draw: drawElectricContour,
  },
  {
    id: "cut-print",
    family: "Print & transfer",
    name: "Cut-print nocturne",
    title: "Fragments of a printed night.",
    control: "Print and trim",
    medium: "Separate photographic prints / cut-paper mounting",
    swatch: "#d9d7ca",
    category: "REGIONAL PRINT EXPOSURE",
    description:
      "Separate photographic fragments are exposed, selectively detailed and trimmed, then mounted on deep black paper. Quiet white masses sit beside coarse local grain and short paper lips.",
    mechanism:
      "Depth/material/facet regions · independent exposure curves · spatial dodging/detail · stable emulsion grain · subtractive knife masks · interior paper lips",
    reference: "./reference-images/cut-print.png",
    referenceLabel: "Supplied cut-print reference",
    referencePage: "./art-references.html#cut-print",
    referencePageLabel: "Construction notes",
    draw: drawCutPrint,
  },
  {
    id: "knife-paint",
    family: "Marks & pigment",
    name: "Layered knife paint",
    title: "The color beneath the cut.",
    control: "Knife pressure",
    medium: "Two pigment strata / subtractive blade passes",
    swatch: "#a29b7e",
    category: "LAYERED PAINT REMOVAL",
    description:
      "Flat blades lay down two pigment layers, then scrape through the upper coat. Broad exposed planes interrupt fractured ridges, while a bounded fraction of removed paint gathers along the blade’s edge.",
    mechanism:
      "Retained pigment/height strata · top-first removal · bounded pigment-carrying edge transfer · depth/material barriers · shared-light relief. Image-space paint approximation, with fixed geometry.",
    reference: "./reference-images/mineral-paint.png",
    referenceLabel: "Supplied mineral-paint reference",
    referencePage: "./art-references.html#knife-paint",
    referencePageLabel: "Construction notes",
    draw: drawKnifePaint,
  },
  {
    id: "wax-resist",
    family: "Marks & pigment",
    name: "Wax-resist dye",
    title: "Color held in reserve.",
    control: "Bath depth",
    medium: "Local dye / successive wax reserves",
    swatch: "#42697e",
    category: "STAGED RESIST DYEING",
    description:
      "Material-colored dye is protected with wax before deeper indigo baths. Pale channels and broad reserved islands retain earlier colors; a few breaks let later dye enter the waxed cloth.",
    mechanism:
      "Separate wax coverage and deposited dye · cumulative RGB absorption · successive color reserves · fracture openings before later baths · thin-feature preservation. Stylized cloth process, with fixed scene geometry.",
    reference: "https://www.slam.org/collection/objects/62955/",
    referenceLabel: "Oey Pek Sien batik / Saint Louis Art Museum",
    referencePage:
      "https://www.gutenberg.org/files/49823/49823-h/49823-h.htm#Page_72",
    referencePageLabel: "Painted dye and wax process / Baker, 1920",
    draw: waxResist,
  },
  directedTesseraeRegistry,
  {
    id: "continuous-thread",
    family: "Lines & geometry",
    name: "Continuous thread",
    title: "One thread, many crossings.",
    control: "Thread completion",
    medium: "Perimeter pins / one continuous route",
    swatch: "#37423b",
    category: "GLOBAL THREAD RECONSTRUCTION",
    description:
      "One thread travels between pins around the whole frame. Overlapping straight strands reconstruct the scene through density; strength reveals more of the same route.",
    mechanism:
      "Area-averaged shaded target · exact signed-error chord selection · continuous endpoint route · cached completion prefixes. Digital coverage approximation with visible pin fans and lost fine detail; stopping is local, not a claim of global optimality.",
    reference: "https://artof01.com/vrellis/works/knit.html",
    referenceLabel: "Petros Vrellis / a new way to knit",
    referencePage: "https://peterwonka.net/Publications/pdfs/2018.EG.Birsak.StringArt.pdf",
    referencePageLabel: "Computational string-image research",
    offThread: true,
    draw: drawContinuousThread,
  },
  quilledPaperRegistry,
  {
    id: "lifted-emulsion",
    family: "Print & transfer",
    name: "Lifted emulsion",
    title: "The photograph lets go.",
    control: "Film handling",
    medium: "Image-bearing film / translucent folds",
    swatch: "#64716c",
    category: "PHOTOGRAPHIC FILM TRANSPORT",
    description:
      "Connected shadow film gathers away from the print, opening pale windows. Source details travel with translucent sheets and darken where the folded film overlaps.",
    mechanism:
      "Source-connected triangle films · retained boundary attachments · distributed pulls · compression-gated fine folds · donor removal and additive transmission. Stylized flattened emulsion; extinction changes, finite-frame clamping and regular source-shaped sheets are explicit approximations.",
    reference: "https://elizabethopalenik.com/mordanage",
    referenceLabel: "Elizabeth Opalenik / Mordançage",
    offThread: true,
    draw: drawLiftedEmulsion,
  },
  {
    id: "color-woodblock",
    family: "Print & transfer",
    name: "Color woodblock",
    title: "A gradient, held in the block.",
    control: "Print pressure",
    medium: "Carved masks / bokashi ink bands",
    swatch: "#71877e",
    category: "GRADATION BLOCK PRINTING",
    description:
      "Separate color impressions carry broad, softly fading ink bands inside crisp carved shapes. Unprinted faces keep the paper light, while a fine keyblock defines the structure.",
    mechanism:
      "Six source-derived inks plus key · hard masks and reserves · plate-coordinate pigment ramps · shared paper contact · monotone pressure pickup · linear-reflectance overprint. Source illumination and fine material optics are flattened into a small ink palette.",
    reference: "https://woodblock.com/encyclopedia/entries/012_02/012_02.html",
    referenceLabel: "David Bull / gradation printing",
    referencePage: "https://store.adachi-hanga.com/en/pages/craftmanship",
    referencePageLabel: "Adachi Institute / separate block impressions",
    offThread: true,
    draw: drawColorWoodblock,
  },

  {
    id: "typed-contours",
    family: "Lines & geometry",
    name: "Typed contours",
    title: "The outline becomes a character.",
    control: "Typing pressure",
    medium: "Fixed glyphs / structural matching",
    swatch: "#6b6b55",
    category: "STRUCTURE-MATCHED GLYPH DRAWING",
    description:
      "Slashes, brackets and letters carry the contours on open paper. Higher typing pressure thickens the same chosen characters without filling the shaded forms.",
    mechanism:
      "Original 42-glyph atlas · owner-specific boundary and crease targets · symmetric spatial-distance matching · exact source-mask clipping · nested ink pressure. Pigment is flattened; curved forms use approximate character alignment and camera changes can change glyph choices.",
    reference: "https://ttwong12.github.io/papers/asciiart/asciiart.html",
    referenceLabel: "Xu, Zhang & Wong / Structure-based ASCII Art",
    referencePage: "https://mk.bcgsc.ca/asciiart/",
    referencePageLabel: "Martin Krzywinski / tone and structure",
    offThread: true,
    draw: drawTypedContours,
  },
  facetedPlanes,
  curvedPaint,
  translucentTapeStudy,
  thicknessExposureStudy,
  copyFeedbackStudy,
  sectionRibStudy,
  prismaticExposureStudy,
  rankStreakStudy,
  pixelClusterStudy,
  finiteLensStudy,
  chromaticShadowStudy,
  cutawayStudy,
  wholetoningStudy,
  toneIllustrationStudy,
  triangleStackStudy,
  directionalColorStudy,
  volumeBarStudy,
];
// Derived preparations belong to immutable shared captures, not a global growing cache.
const preparations = new WeakMap();
const surfaceVisibilityStudies = new WeakMap();
const albedoDisplay = Uint8ClampedArray.from({ length: 256 }, (_, byte) => {
  const linear = byte / 255;
  return (
    255 *
    (linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055)
  );
});
export function makeFrame(raw, seed, intensity, ink = defaultInk()) {
  const { size: w, color, normal, depth, identity } = raw;
  const geometry = raw.geometry || raw.geometrySnapshot?.();
  const visibilityKey = materialVisibilityKey(raw.materialVisibility),
    materialVisibility = copyMaterialVisibility(raw.materialVisibility);
  const effectiveSurface = () => {
    if (raw.surfaceVisibility && raw.surfaceSamples && raw.surfaceHatches &&
        raw.surfaceVisibility()?.atlas.visibility.key === visibilityKey) return raw;
    let entry = surfaceVisibilityStudies.get(raw);
    if (!entry || entry.key !== visibilityKey) {
      const snapshot = raw.geometry || raw.geometrySnapshot?.();
      if (!snapshot) throw new Error('Material surface visibility requires original geometry');
      entry = {key:visibilityKey, studies:restoreGeometryStudies(snapshot, materialVisibility)};
      surfaceVisibilityStudies.set(raw,entry);
    }
    return entry.studies;
  };
  const clamp = (value, min = 0, max = 1) =>
    Math.max(min, Math.min(max, value));
  const lum = new Float32Array(w * w);
  for (let i = 0; i < lum.length; i++)
    lum[i] =
      (color[i * 4] * 0.2126 +
        color[i * 4 + 1] * 0.7152 +
        color[i * 4 + 2] * 0.0722) /
      255;
  const index = (x, y) =>
    Math.min(w - 1, Math.max(0, Math.round(y))) * w +
    Math.min(w - 1, Math.max(0, Math.round(x)));
  const D = (x, y) => clamp((0.93 - lum[index(x, y)]) / 0.65);
  const ID = (x, y) =>
    identity ? identity[index(x, y) * 4] : D(x, y) > 0.025 ? 2 : 1;
  const baseColor = (x, y) =>
    raw.baseColors?.[ID(x, y)] ?? [
      color[index(x, y) * 4],
      color[index(x, y) * 4 + 1],
      color[index(x, y) * 4 + 2],
    ];
  const surfaceColor = (x, y) => {
    if (!raw.albedo || (geometry?.source !== 'conjure' && !raw.materialSettings?.assignments?.[ID(x, y)]))
      return baseColor(x, y);
    const i = index(x, y) * 4;
    if (geometry?.source === 'conjure' && ID(x, y) === 0) return baseColor(x, y);
    return [
      albedoDisplay[raw.albedo[i]],
      albedoDisplay[raw.albedo[i + 1]],
      albedoDisplay[raw.albedo[i + 2]],
    ];
  };
  const distance = (x, y) => {
    if (!depth) return 6 + D(x, y) * 15;
    const i = index(x, y) * 4;
    // Three r180 RGBADepthPacking, read directly from an unencoded render target.
    const normalized =
      depth[i] / 256 +
      depth[i + 1] / 65536 +
      depth[i + 2] / 16777216 +
      depth[i + 3] / (255 * 16777216);
    return (
      (raw.near ?? 0.1) + ((raw.far ?? 100) - (raw.near ?? 0.1)) * normalized
    );
  };
  const perspective = geometry?.source === 'conjure' && geometry.projection?.[11] !== 0;
  let depthMinimum = 6, depthSpan = 15;
  if (geometry?.source === 'conjure' && depth && identity) {
    let lo = Infinity, hi = -Infinity;
    for (let at = 0; at < w * w; at++) if (identity[at * 4]) {
      const value = distance(at % w, Math.floor(at / w));
      if (Number.isFinite(value)) { lo = Math.min(lo, value); hi = Math.max(hi, value); }
    }
    if (Number.isFinite(lo)) { depthMinimum = lo; depthSpan = Math.max(hi - lo, 1e-9); }
  }
  const normalizedDepth = (value) => clamp((value - depthMinimum) / depthSpan);
  const interpolateDepth = (a, b, t) => perspective ? 1 / ((1 - t) / a + t / b) : a + (b - a) * t;
  return {
    w,
    ...(materialVisibility ? { materialVisibility, surfaceVisibility: () => effectiveSurface().surfaceVisibility() } : {}),
    geometrySnapshot: () => raw.geometry || raw.geometrySnapshot?.() || null,
    sectionRibLighting: raw.sectionRibLighting || null,
    cutawayShadowCamera: raw.cutawayShadowCamera || null,
    cutawayBaseColors: raw.baseColors || null,
    worldFromClip: raw.worldFromClip || null,
    hasMaterialEvidence: (id) => {
      const pigment = raw.baseColors?.[id];
      return !!pigment && pigment.length === 3 && pigment.every(Number.isFinite) &&
        (!!raw.materialSettings?.assignments?.[id] ||
          (Number.isFinite(raw.metalnesses?.[id]) && Number.isFinite(raw.transmissions?.[id])));
    },
    edges: raw.edges || [],
    edgeOwners: raw.edgeOwners || [],
    voxelFaces: raw.voxelFaces || (() => raw.voxels || new Float64Array(0)),
    materialColor: (id) => raw.baseColors?.[id] || [172, 180, 161],
    materialKey: (x, y) => {
      const id = ID(x, y),
        assignment = raw.materialSettings?.assignments?.[id];
      if (geometry?.source === 'conjure' && raw.materialProfiles && raw.transmission) {
        const at = index(x, y) * 4;
        const profile = raw.transmission[at + 1] * 256 + raw.transmission[at + 2];
        if (profile) return `captured-profile:${profile}`;
      }
      return assignment
        ? `assigned:${assignment}`
        : raw.material
          ? `captured:${raw.material[index(x, y) * 4]}:${raw.material[index(x, y) * 4 + 1]}:${raw.material[index(x, y) * 4 + 2]}`
        : `original:${raw.metalnesses?.[id] || 0}:${raw.transmissions?.[id] || 0}`;
    },
    openBoundaries:
      raw.openBoundaries || (() => raw.boundaries || new Float64Array(0)),
    sectionLines:
      raw.sectionLines || (() => raw.sections || new Float32Array(0)),
    surfacePoints: () =>
      visibilityKey ? effectiveSurface().surfaceSamples() : raw.surfaceSamples
        ? raw.surfaceSamples()
        : raw.points || new Float32Array(0),
    surfaceHatches: () =>
      visibilityKey ? effectiveSurface().surfaceHatches(seed) : raw.surfaceHatches
        ? raw.surfaceHatches(seed)
        : raw.hatches || {
            points: new Float32Array(0),
            runs: new Uint32Array(0),
          },
    membraneMasks: () =>
      raw.membraneMasks ? raw.membraneMasks() : raw.membranes || [],
    color,
    normal,
    depth,
    identity,
    materialSettings: raw.materialSettings || null,
    diffuse: raw.diffuse || null,
    pixelWorldSize: raw.pixelWorldSize || 8.2 / w,
    metalness: (x, y) => raw.material ? raw.material[index(x, y) * 4] / 255 : raw.metalnesses?.[ID(x, y)] || 0,
    reliefLight: raw.reliefLight || [-0.45, -0.55, 0.704],
    worldPosition: (x, y) => worldFromPixel(raw, x, y, distance(x, y)),
    worldAtDepth: (x, y, depth) => worldFromPixel(raw, x, y, depth),
    spectralLights: raw.spectralLights || [
      {
        direction: raw.reliefLight || [-0.45, -0.55, 0.704],
        color: [1, 0.913, 0.738],
        intensity: 4.5,
      },
    ],
    spectralHemisphere: raw.spectralHemisphere || {
      sky: [1, 1, 1],
      ground: [0.162, 0.216, 0.178],
      intensity: 2.25,
      up: [0, -1, 0],
    },
    seed,
    intensity,
    ink,
    prepare: (name, compute) => {
      let cache = preparations.get(raw);
      if (!cache) {
        cache = new Map();
        preparations.set(raw, cache);
      }
      const key = name + ":" + seed + (visibilityKey ? ":" + visibilityKey : "");
      if (cache.has(key)) {
        const value = cache.get(key);
        cache.delete(key);
        cache.set(key, value);
        return value;
      }
      const value = compute();
      cache.set(key, value);
      while (cache.size > 2) cache.delete(cache.keys().next().value);
      return value;
    },
    clamp,
    index,
    D,
    L: (x, y) => lum[index(x, y)],
    N: (x, y, c) => normal[index(x, y) * 4 + c] / 255,
    C: (x, y) => {
      const i = index(x, y) * 4;
      return [color[i], color[i + 1], color[i + 2]];
    },
    ID,
    T: (x, y) => raw.transmission ? raw.transmission[index(x, y) * 4] / 255 : raw.transmissions?.[ID(x, y)] ?? 0,
    B: surfaceColor,
    baseColor,
    Z: (x, y) => normalizedDepth(distance(x, y)),
    normalizedDepth,
    interpolateDepth,
    distance,
    edge: (x, y) =>
      Math.abs(lum[index(x + 2, y)] - lum[index(x - 2, y)]) +
      Math.abs(lum[index(x, y + 2)] - lum[index(x, y - 2)]),
    rnd: (x, y, k = 0) => {
      let n =
        Math.imul((x | 0) + seed * 31, 374761393) ^
        Math.imul((y | 0) + k * 101, 668265263);
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
    },
  };
}
function paper(p, f, color = "#f4efdf") {
  p.background(color);
  p.noStroke();
  for (let i = 0; i < 3300; i++) {
    p.fill(66, 50, 34, 10);
    p.circle(f.rnd(i, 7) * f.w, f.rnd(i, 13) * f.w, 0.6 + f.rnd(i, 29));
  }
}
function riso(p, f) {
  paper(p, f);
  p.noStroke();
  p.blendMode(p.MULTIPLY);
  const step = 8 - f.intensity * 3,
    h = f.w / 2;
  for (let plate = 0; plate < 2; plate++) {
    p.fill(plate ? "#254f80" : "#e36043");
    const angle = ((plate ? 15 : -15) * Math.PI) / 180,
      cs = Math.cos(angle),
      sn = Math.sin(angle),
      ox = plate ? 1.5 + f.rnd(7, 9, plate) * 1.8 : 0,
      oy = plate ? -0.6 - f.rnd(19, 3, plate) * 1.6 : 0;
    for (let y = -h * 1.45; y < h * 1.45; y += step)
      for (let x = -h * 1.45; x < h * 1.45; x += step) {
        const sx = x * cs - y * sn + h,
          sy = x * sn + y * cs + h;
        if (sx < 0 || sy < 0 || sx > f.w || sy > f.w) continue;
        const c = f.C(sx, sy),
          d = f.D(sx, sy),
          warm = (c[0] - c[2]) / 200,
          amount = f.clamp(
            d * (plate ? 0.9 : 1.1) + (plate ? -warm : warm) * 0.48,
          );
        if (amount > 0.015 && f.rnd(sx, sy, plate) > 0.024)
          p.circle(sx + ox, sy + oy, Math.sqrt(amount) * step * 1.12);
      }
  }
  p.blendMode(p.BLEND);
}
function woodcut(p, f) {
  paper(p, f, "#f2eddc");
  p.stroke("#28312a");
  p.noFill();
  const step = 6.2 - f.intensity * 2.7;
  for (let y = 0; y < f.w; y += step)
    for (let x = 0; x < f.w; x += step) {
      const d = f.D(x, y),
        e = f.edge(x, y);
      if (d > 0.025) {
        const r = f.rnd(x, y);
        p.strokeWeight(0.5 + d * 0.75);
        const len = step * (0.35 + d * 1.4);
        if (r < d * 1.5 + 0.08)
          p.line(x - len * 0.6, y + len * 0.4, x + len * 0.6, y - len * 0.4);
        if (d > 0.44)
          p.line(x - len * 0.4, y - len * 0.6, x + len * 0.4, y + len * 0.6);
        if (e > 0.09) {
          p.strokeWeight(0.85);
          p.line(x - 1.6, y, x + 1.6, y + 1);
        }
      }
    }
}
function stipple(p, f) {
  paper(p, f, "#f4f0e4");
  p.noStroke();
  p.fill("#3a352d");
  const step = 3.6 - f.intensity * 1.5;
  for (let y = 0; y < f.w; y += step)
    for (let x = 0; x < f.w; x += step) {
      const px = x + (f.rnd(x, y) - 0.5) * step,
        py = y + (f.rnd(x, y, 1) - 0.5) * step,
        d = f.D(px, py);
      if (
        f.rnd(x, y, 2) <
        Math.min(1, Math.pow(d, 0.86) * 1.75 + f.edge(x, y) * 0.7)
      )
        p.circle(
          px,
          py,
          1.25 + f.rnd(x, y, 3) * 0.65 + f.intensity * 0.8 + d * 0.8,
        );
    }
}
function loom(p, f) {
  p.background("#d8d4bd");
  p.noStroke();
  const step = 11 - f.intensity * 5;
  for (let y = 0; y < f.w; y += step)
    for (let x = 0; x < f.w; x += step) {
      const c = f.C(x, y),
        d = f.D(x, y),
        i = Math.floor(x / step) + Math.floor(y / step);
      const mix = (v) => Math.round(Math.round(v / 35) * 35);
      p.fill(mix(c[0]) * 0.82, mix(c[1]) * 0.84, mix(c[2]) * 0.78);
      p.rect(x + 0.5, y + 0.5, step - 1, step - 1);
      const horiz = i % 2 === 0;
      p.fill(
        f.clamp(c[0] * 1.07, 0, 255),
        f.clamp(c[1] * 1.03, 0, 255),
        c[2] * 0.91,
      );
      if (horiz) p.rect(x - 0.5, y + step * 0.28, step + 1, step * 0.42, 1);
      else p.rect(x + step * 0.28, y - 0.5, step * 0.42, step + 1, 1);
      p.stroke(255, 247, 218, 65);
      p.strokeWeight(0.7);
      if (horiz) p.line(x + 1, y + step * 0.35, x + step - 1, y + step * 0.35);
      else p.line(x + step * 0.36, y + 1, x + step * 0.36, y + step - 1);
      p.noStroke();
    }
}
function optical(p, f) {
  p.background("#f6f6ed");
  p.noStroke();
  p.fill("#172b2a");
  const step = 7.5 - f.intensity * 3;
  for (let y = -40; y < f.w + 40; y += step) {
    const line = [];
    for (let x = 0; x <= f.w; x += 2) {
      const d = f.D(x, y),
        phase = (f.N(x, y, 0) - 0.5) * 9 + d * 18;
      line.push([x, y + phase, 0.45 + d * 1.4]);
    }
    p.beginShape();
    for (const [x, py, half] of line) p.vertex(x, py - half);
    for (let i = line.length - 1; i >= 0; i--) {
      const [x, py, half] = line[i];
      p.vertex(x, py + half);
    }
    p.endShape(p.CLOSE);
  }
}
function cyanotype(p, f) {
  p.loadPixels();
  for (let y = 0; y < f.w; y++)
    for (let x = 0; x < f.w; x++) {
      const i = (y * f.w + x) * 4,
        d = f.D(x, y),
        ed = f.edge(x, y),
        n = (f.rnd(x, y) - 0.5) * 0.035;
      const exposure = f.clamp(d * (1.25 + f.intensity * 0.8) + ed * 0.15 + n);
      const border = Math.min(x, y, f.w - 1 - x, f.w - 1 - y);
      const uneven = 12 + Math.sin(x * 0.07) * 3 + Math.sin(y * 0.06) * 3;
      const b = border < uneven ? 1 : f.clamp(Math.pow(exposure, 0.64) * 0.92);
      p.pixels[i] = 17 + (239 - 17) * b;
      p.pixels[i + 1] = 57 + (242 - 57) * b;
      p.pixels[i + 2] = 106 + (224 - 106) * b;
      p.pixels[i + 3] = 255;
    }
  p.updatePixels();
}
function contours(p, f) {
  p.loadPixels();
  const n = 9 + Math.round(f.intensity * 11),
    palette = [
      [238, 232, 208],
      [231, 218, 176],
      [184, 193, 161],
      [126, 162, 150],
      [73, 125, 125],
      [43, 84, 91],
      [191, 114, 74],
      [207, 150, 95],
    ];
  for (let y = 0; y < f.w; y++)
    for (let x = 0; x < f.w; x++) {
      const i = (y * f.w + x) * 4,
        d = f.D(x, y),
        band = Math.floor(d * n),
        a = Math.floor(f.D(x + 1, y) * n),
        b = Math.floor(f.D(x, y + 1) * n),
        edge = a !== band || b !== band;
      const c = edge
        ? [37, 67, 62]
        : palette[Math.min(palette.length - 1, Math.floor(band / 2))];
      p.pixels[i] = c[0];
      p.pixels[i + 1] = c[1];
      p.pixels[i + 2] = c[2];
      p.pixels[i + 3] = 255;
    }
  p.updatePixels();
}
function frottage(p, f) {
  p.loadPixels();
  for (let y = 0; y < f.w; y++)
    for (let x = 0; x < f.w; x++) {
      const i = (y * f.w + x) * 4,
        d = f.D(x, y),
        grain = Math.sin(
          y * 0.87 +
            Math.sin(x * 0.025) * 4 +
            Math.sin(x * 0.004 + y * 0.013) * 9,
        );
      const v = f.rnd(x, y),
        pressure = f.clamp(d * 1.25 + 0.02);
      const ink =
        grain + v * 0.7 > 1.4 - pressure * (2 + f.intensity)
          ? f.clamp(pressure * 0.9 + v * 0.24)
          : 0;
      const shades = [244 - ink * 195, 239 - ink * 190, 219 - ink * 179];
      p.pixels[i] = shades[0];
      p.pixels[i + 1] = shades[1];
      p.pixels[i + 2] = shades[2];
      p.pixels[i + 3] = 255;
    }
  p.updatePixels();
}

function cutpaper(p, f) {
  paper(p, f, "#eee9d8");
  const step = 5,
    n = Math.ceil(f.w / step),
    labels = new Int16Array(n * n);
  const colors = [
    [220, 213, 184],
    [182, 193, 162],
    [126, 155, 128],
    [211, 130, 78],
    [170, 78, 52],
    [224, 171, 108],
    [93, 116, 81],
    [60, 87, 65],
    [134, 166, 152],
  ];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const [c0, c1] = f.C(x * step, y * step),
        d = f.D(x * step, y * step);
      const family = c0 > c1 * 1.16 ? 1 : c1 > c0 * 1.015 ? 2 : 0,
        shade = d > 0.38 ? 2 : d > 0.16 ? 1 : 0;
      labels[y * n + x] = d < 0.024 ? -1 : family * 3 + shade;
    }
  const seen = new Uint8Array(n * n);
  p.noStroke();
  for (let start = 0; start < labels.length; start++) {
    if (seen[start] || labels[start] < 0) continue;
    const label = labels[start],
      queue = [start],
      members = new Set([start]);
    seen[start] = 1;
    for (let q = 0; q < queue.length; q++) {
      const cur = queue[q],
        x = cur % n,
        y = Math.floor(cur / n);
      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ]) {
        if (nx < 0 || nx >= n || ny < 0 || ny >= n) continue;
        const j = ny * n + nx;
        if (!seen[j] && labels[j] === label) {
          seen[j] = 1;
          members.add(j);
          queue.push(j);
        }
      }
    }
    if (queue.length < 3) continue;
    const edges = new Map();
    const edge = (x1, y1, x2, y2, dir) => {
      const key = x1 + "," + y1;
      if (!edges.has(key)) edges.set(key, []);
      edges.get(key).push({ x: x2, y: y2, dir });
    };
    for (const pos of queue) {
      const x = pos % n,
        y = Math.floor(pos / n);
      if (y === 0 || !members.has(pos - n)) edge(x, y, x + 1, y, 0);
      if (x === n - 1 || !members.has(pos + 1)) edge(x + 1, y, x + 1, y + 1, 1);
      if (y === n - 1 || !members.has(pos + n)) edge(x + 1, y + 1, x, y + 1, 2);
      if (x === 0 || !members.has(pos - 1)) edge(x, y + 1, x, y, 3);
    }
    const loops = [];
    while (edges.size) {
      let key = edges.keys().next().value,
        incoming = null;
      const poly = [];
      const first = key;
      do {
        const available = edges.get(key);
        if (!available?.length) break;
        const [x, y] = key.split(",").map(Number);
        poly.push([
          x * step + (f.rnd(x, y) - 0.5) * (1 + f.intensity * 3),
          y * step + (f.rnd(x, y, 1) - 0.5) * (1 + f.intensity * 3),
        ]);
        const priority = [1, 0, 3, 2];
        let chosen = 0;
        if (incoming !== null)
          for (let j = 1; j < available.length; j++)
            if (
              priority.indexOf((available[j].dir - incoming + 4) % 4) <
              priority.indexOf((available[chosen].dir - incoming + 4) % 4)
            )
              chosen = j;
        const next = available.splice(chosen, 1)[0];
        if (!available.length) edges.delete(key);
        incoming = next.dir;
        key = next.x + "," + next.y;
      } while (key !== first);
      if (poly.length >= 4) loops.push(poly);
    }
    // One compound Canvas2D path preserves all interior holes with even-odd fill.
    // This is p5's own P2D drawing context, not a separate raster engine.
    const ctx = p.drawingContext;
    const compound = (offsetX, offsetY) => {
      ctx.beginPath();
      for (const poly of loops) {
        ctx.moveTo(poly[0][0] + offsetX, poly[0][1] + offsetY);
        for (let i = 1; i < poly.length; i++)
          ctx.lineTo(poly[i][0] + offsetX, poly[i][1] + offsetY);
        ctx.closePath();
      }
      ctx.fill("evenodd");
    };
    p.fill(50, 48, 35, 35);
    compound(1.5, 2);
    p.fill(...colors[label]);
    compound(0, 0);
  }
}
function reticulum(p, f) {
  paper(p, f, "#f0f1e7");
  p.noFill();
  const step = 11 - f.intensity * 5,
    n = Math.ceil(f.w / step);
  const node = (x, y) => [
    x * step + (f.rnd(x, y) - 0.5) * step * 0.7,
    y * step + (f.rnd(x, y, 1) - 0.5) * step * 0.7,
  ];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const [a, b] = node(x, y),
        d = f.D(a, b),
        e = f.edge(a, b);
      if (f.rnd(x, y, 2) > d * (1.6 + f.N(a, b, 0) * 0.8) + e * 2 + 0.035)
        continue;
      p.stroke(38, 59, 50, 80 + d * 140);
      p.strokeWeight(0.55 + d * 0.8);
      for (const dx of [1, -1]) {
        const [c, dd] = node(x + dx, y + 1);
        if (f.D(c, dd) > 0.02 || d > 0.2) p.line(a, b, c, dd);
      }
      const [c, dd] = node(x + 1, y);
      p.line(a, b, c, dd);
      p.noStroke();
      p.fill("#30463d");
      p.circle(a, b, 0.7 + d * 1.9);
      p.noFill();
    }
}
function luminous(p, f) {
  p.background("#07141b");
  p.blendMode(p.ADD);
  const step = 3.5 - f.intensity * 1.5;
  p.noFill();
  for (let glow = 2; glow >= 0; glow--) {
    p.strokeWeight([1, 3, 9][glow]);
    for (let y = 2; y < f.w; y += step)
      for (let x = 2; x < f.w; x += step) {
        const e = f.edge(x, y),
          d = f.D(x, y);
        if (e > 0.026 || (d > 0.1 && f.rnd(x, y) < 0.03)) {
          const nx = f.N(x, y, 0),
            ny = f.N(x, y, 1);
          p.stroke(
            95 + nx * 100,
            100 + ny * 80,
            180 + nx * 65,
            [160, 43, 8][glow] * Math.min(1, e * 9 + 0.2),
          );
          p.line(x, y, x + step * 0.7, y + (ny - 0.5) * step);
        }
      }
  }
  p.blendMode(p.BLEND);
}
function scanner(p, f) {
  p.background("#10201f");
  p.noFill();
  const step = 10 - f.intensity * 3;
  for (let y = 0; y < f.w; y += step)
    for (let x = 0; x < f.w; x += step) {
      const d = f.D(x, y),
        e = f.edge(x, y);
      if (d < 0.025 && e < 0.035) continue;
      const v = Math.floor(d * 9),
        alpha = 90 + d * 160;
      p.stroke(161, 213, 171, alpha);
      p.strokeWeight(0.8);
      const h = step * 0.45,
        normalSlope = (f.N(x, y, 0) - 0.5) * step * 0.45;
      if (v < 2) p.line(x, y, x + step * 0.5, y + normalSlope);
      else if (v < 4) {
        p.line(x, y - h, x, y + h);
        p.line(x - h * 0.7, y, x + h * 0.7, y);
      } else if (v < 6) {
        p.rect(x - h * 0.5, y - h, h, h * 2);
        p.line(x - h * 0.5, y, x + h * 0.5, y);
      } else {
        p.line(x - h * 0.5, y - h, x + h * 0.5, y - h);
        p.line(x + h * 0.5, y - h, x - h * 0.5, y + h);
        p.line(x - h * 0.5, y + h, x + h * 0.5, y + h);
      }
      if (e > 0.05) {
        p.stroke(210, 245, 200, 150);
        p.line(x - 1, y + step * 0.5, x + step * 0.8, y + step * 0.5);
      }
    }
}

function depthEtching(p, f) {
  paper(p, f, "#eef0e2");
  p.loadPixels();
  const bands = 35 + Math.round(f.intensity * 75);
  for (let y = 0; y < f.w; y++)
    for (let x = 0; x < f.w; x++) {
      const id = f.ID(x, y);
      if (id <= 1) continue;
      const z = f.Z(x, y),
        q = Math.floor(z * bands),
        i = (y * f.w + x) * 4;
      const outline = id !== f.ID(x + 1, y) || id !== f.ID(x, y + 1);
      const contour =
        q !== Math.floor(f.Z(x + 1, y) * bands) ||
        q !== Math.floor(f.Z(x, y + 1) * bands);
      const c = outline
        ? [27, 53, 60]
        : contour
          ? [58, 94, 99]
          : [229 - z * 23, 233 - z * 14, 212 - z * 6];
      p.pixels[i] = c[0];
      p.pixels[i + 1] = c[1];
      p.pixels[i + 2] = c[2];
      p.pixels[i + 3] = 255;
    }
  p.updatePixels();
}
function embroidery(p, f) {
  paper(p, f, "#ede8d6");
  p.noFill();
  const spacing = 16 - f.intensity * 8;
  for (let y = 4; y < f.w; y += spacing)
    for (let x = 4; x < f.w; x += spacing) {
      let px = x + (f.rnd(x, y) - 0.5) * spacing * 0.6,
        py = y + (f.rnd(x, y, 1) - 0.5) * spacing * 0.6;
      const id = f.ID(px, py);
      if (id <= 1) continue;
      const c = f.C(px, py),
        length = 10 + Math.floor(f.rnd(x, y, 2) * 10);
      p.stroke(c[0] * 0.7, c[1] * 0.68, c[2] * 0.6);
      p.strokeWeight(0.9 + f.D(px, py) * 0.65);
      let prior = [1, 0];
      for (let j = 0; j < length; j++) {
        let vx = f.N(px, py, 1) - 0.5,
          vy = f.N(px, py, 0) - 0.5;
        const magnitude = Math.hypot(vx, vy);
        if (magnitude < 0.03) {
          vx = 1;
          vy = 0;
        } else {
          vx /= magnitude;
          vy /= magnitude;
        }
        if (vx * prior[0] + vy * prior[1] < 0) {
          vx = -vx;
          vy = -vy;
        }
        prior = [vx, vy];
        const nx = px + vx * 2.1,
          ny = py + vy * 2.1;
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= f.w ||
          ny >= f.w ||
          f.ID(nx, ny) !== id ||
          f.ID((px + nx) / 2, (py + ny) / 2) !== id
        )
          break;
        if (j % 5 < 3) p.line(px, py, nx, ny);
        px = nx;
        py = ny;
      }
      const hx = px + prior[0] * 2.4,
        hy = py + prior[1] * 2.4;
      if (
        hx >= 0 &&
        hy >= 0 &&
        hx < f.w &&
        hy < f.w &&
        f.ID(hx, hy) === id &&
        f.ID((px + hx) / 2, (py + hy) / 2) === id
      ) {
        p.stroke(255, 253, 230, 130);
        p.strokeWeight(0.45);
        p.line(px, py, hx, hy);
      }
    }
}
function pigmentWash(p, f) {
  const w = f.w,
    original = new Float32Array(w * w);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++)
      original[y * w + x] = f.D(x, y) * (f.ID(x, y) > 1 ? 1 : 0.35);
  let field = original.slice(),
    next = new Float32Array(w * w);
  const horizontal = new Float32Array(w * w),
    radius = 2 + Math.round(f.intensity * 5),
    diameter = 2 * radius + 1;
  // Sliding-window separable blur mixes every intermediate cell, not a sparse stencil.
  // Complexity stays linear in pixel count, independent of the selected radius.
  for (let pass = 0; pass < 4; pass++) {
    for (let y = 0; y < w; y++) {
      let sum = 0;
      for (let offset = -radius; offset <= radius; offset++)
        sum += field[y * w + Math.max(0, Math.min(w - 1, offset))];
      for (let x = 0; x < w; x++) {
        horizontal[y * w + x] = sum / diameter;
        sum -= field[y * w + Math.max(0, x - radius)];
        sum += field[y * w + Math.min(w - 1, x + radius + 1)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let offset = -radius; offset <= radius; offset++)
        sum += horizontal[Math.max(0, Math.min(w - 1, offset)) * w + x];
      for (let y = 0; y < w; y++) {
        const i = y * w + x,
          spread = 0.42 + f.rnd(x >> 3, y >> 3) * 0.14;
        next[i] = field[i] * (1 - spread) + (sum / diameter) * spread;
        sum -= horizontal[Math.max(0, y - radius) * w + x];
        sum += horizontal[Math.min(w - 1, y + radius + 1) * w + x];
      }
    }
    [field, next] = [next, field];
  }
  p.loadPixels();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const n = y * w + x,
        i = n * 4,
        pooled = Math.abs(original[n] - field[n]) * 1.35;
      let ink = f.clamp(
        field[n] * 0.85 + pooled + (f.rnd(x, y, 4) - 0.5) * 0.05,
      );
      if (f.rnd(x, y, 6) < 0.016) ink *= 0.15;
      const color = f.C(x, y),
        warm = f.clamp((color[0] - color[2]) / 100),
        pigment = [47 + warm * 112, 86 + warm * 13, 119 - warm * 53];
      for (let channel = 0; channel < 3; channel++)
        p.pixels[i + channel] =
          [245, 242, 225][channel] * (1 - ink) + pigment[channel] * ink;
      p.pixels[i + 3] = 255;
    }
  p.updatePixels();
}

function architectural(p, f) {
  paper(p, f, "#f0ede1");
  p.noFill();
  p.stroke(120, 140, 132, 22);
  p.strokeWeight(0.5);
  for (let position = 0; position < f.w; position += 44) {
    p.line(position, 0, position, f.w);
    p.line(0, position, f.w, position);
  }
  // Curved silhouettes supplement the true mesh creases.
  p.stroke("#354a4a");
  p.strokeWeight(0.6 + f.intensity * 0.4);
  for (let y = 1; y < f.w - 1; y++)
    for (let x = 1; x < f.w - 1; x++) {
      const id = f.ID(x, y),
        right = f.ID(x + 1, y),
        below = f.ID(x, y + 1);
      if (id !== right && (id > 1 || right > 1))
        p.line(x + 0.5, y - 0.5, x + 0.5, y + 0.5);
      if (id !== below && (id > 1 || below > 1))
        p.line(x - 0.5, y + 0.5, x + 0.5, y + 0.5);
    }
  for (const [a, b] of f.edges) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(length / 1.8));
    if (steps > f.w * 3) continue;
    for (let step = 0; step < steps; step++) {
      const t = (step + 0.5) / steps,
        x = a[0] + (b[0] - a[0]) * t,
        y = a[1] + (b[1] - a[1]) * t;
      if (x < 0 || y < 0 || x >= f.w || y >= f.w) continue;
      const z = f.interpolateDepth ? f.interpolateDepth(a[2], b[2], t) : a[2] + (b[2] - a[2]) * t,
        visible = z <= f.distance(x, y) + 0.04;
      if (!visible && (step % 7 >= 3 || f.rnd(a[0], a[1]) > f.intensity))
        continue;
      p.stroke(
        visible ? 40 : 75,
        visible ? 58 : 84,
        visible ? 57 : 79,
        visible ? 225 : 45 + f.intensity * 65,
      );
      p.strokeWeight(visible ? 0.95 : 0.55);
      const t0 = step / steps,
        t1 = (step + 1) / steps;
      p.line(
        a[0] + (b[0] - a[0]) * t0,
        a[1] + (b[1] - a[1]) * t0,
        a[0] + (b[0] - a[0]) * t1,
        a[1] + (b[1] - a[1]) * t1,
      );
    }
  }
}

function interference(p, f) {
  p.loadPixels();
  const angle = ((2.5 + f.intensity * 9) * Math.PI) / 180,
    cs = Math.cos(angle),
    sn = Math.sin(angle),
    period = 6.4,
    offset = f.rnd(5, 17) * period;
  for (let y = 0; y < f.w; y++)
    for (let x = 0; x < f.w; x++) {
      const foreground = f.ID(x, y) > 1,
        depth = foreground ? f.Z(x, y) : 0;
      const phase = depth * 24 + (foreground ? (f.N(x, y, 0) - 0.5) * 4 : 0);
      const first = ((x + offset) / period) * Math.PI,
        second = ((x * cs + y * sn + phase + offset) / period) * Math.PI;
      // Squared coherent amplitude exposes large beat envelopes even at card scale.
      const amplitude = Math.cos(first) + Math.cos(second),
        ink = amplitude * amplitude * 0.25,
        i = (y * f.w + x) * 4;
      p.pixels[i] = 239 - ink * 213;
      p.pixels[i + 1] = 241 - ink * 204;
      p.pixels[i + 2] = 224 - ink * 190;
      p.pixels[i + 3] = 255;
    }
  p.updatePixels();
}
function photogram(p, f) {
  const w = f.w,
    mask = new Float32Array(w * w),
    horizontal = new Float32Array(w * w),
    soft = new Float32Array(w * w);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++)
      mask[y * w + x] = f.ID(x, y) > 1 ? 1 - f.T(x, y) * 0.88 : 0;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++)
      horizontal[y * w + x] =
        (mask[y * w + Math.max(0, x - 1)] +
          2 * mask[y * w + x] +
          mask[y * w + Math.min(w - 1, x + 1)]) /
        4;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++)
      soft[y * w + x] =
        (horizontal[Math.max(0, y - 1) * w + x] +
          2 * horizontal[y * w + x] +
          horizontal[Math.min(w - 1, y + 1) * w + x]) /
        4;
  p.loadPixels();
  const gamma = 0.4 + f.intensity * 1.45;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4,
        v = f.clamp(
          Math.pow(soft[y * w + x], gamma) + (f.rnd(x, y) - 0.5) * 0.024,
        );
      p.pixels[i] = 17 + v * 224;
      p.pixels[i + 1] = 28 + v * 207;
      p.pixels[i + 2] = 34 + v * 181;
      p.pixels[i + 3] = 255;
    }
  p.updatePixels();
}

function leadedGlass(p, f) {
  const w = f.w,
    pitch = 50 - f.intensity * 27,
    cols = Math.ceil(w / pitch) + 2,
    rows = cols;
  const px = new Float32Array(cols * rows),
    py = new Float32Array(cols * rows),
    tints = new Float32Array(cols * rows),
    siteSin = new Float64Array(cols * rows),
    siteCos = new Float64Array(cols * rows);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      px[i] = (x - 1 + 0.18 + f.rnd(x, y, 7) * 0.64) * pitch;
      py[i] = (y - 1 + 0.18 + f.rnd(x, y, 9) * 0.64) * pitch;
      tints[i] = 0.83 + f.rnd(x, y, 11) * 0.34;
      siteSin[i] = Math.sin(i);
      siteCos[i] = Math.cos(i);
    }
  const ids = new Uint8Array(w * w),
    lum = new Float32Array(w * w),
    sinX = new Float64Array(w),
    cosX = new Float64Array(w),
    sinY = new Float64Array(w),
    cosY = new Float64Array(w);
  for (let i = 0; i < w; i++) {
    sinX[i] = Math.sin(i * 0.12);
    cosX[i] = Math.cos(i * 0.12);
    sinY[i] = Math.sin(i * 0.17);
    cosY[i] = Math.cos(i * 0.17);
  }
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      ids[i] = f.ID(x, y);
      lum[i] = f.L(x, y);
    }
  const palettes = [];
  // A smooth highlight shoulder retains color instead of hard clipping above 255.
  const shoulder = (v) =>
    v <= 220 ? Math.max(0, v) : 220 + (v - 220) / (1 + (v - 220) / 35);
  p.loadPixels();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const n = y * w + x,
        i = n * 4,
        gx = Math.floor(x / pitch) + 1,
        gy = Math.floor(y / pitch) + 1,
        id = ids[n];
      let first = Infinity,
        second = Infinity,
        nearest = 0;
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          const k = (gy + oy) * cols + gx + ox,
            dx = px[k] - x,
            dy = py[k] - y,
            d = dx * dx + dy * dy;
          if (d < first) {
            second = first;
            first = d;
            nearest = k;
          } else if (d < second) second = d;
        }
      const seamDistance = Math.sqrt(second) - Math.sqrt(first);
      const objectSeam =
        ids[n - (x > 0 ? 1 : 0)] !== id ||
        ids[n + (x < w - 1 ? 1 : 0)] !== id ||
        ids[n - (y > 0 ? w : 0)] !== id ||
        ids[n + (y < w - 1 ? w : 0)] !== id;
      if (objectSeam || seamDistance < 1.7) {
        p.pixels[i] = 21;
        p.pixels[i + 1] = 32;
        p.pixels[i + 2] = 29;
        p.pixels[i + 3] = 255;
        continue;
      }
      if (!palettes[id]) {
        const base = id <= 1 ? [121, 176, 193] : f.B(x, y),
          minimum = Math.min(...base);
        palettes[id] = base.map((value) =>
          f.clamp((value - minimum * 0.62) * 1.85, 0, 255),
        );
      }
      const base = palettes[id],
        wave =
          1 +
          (sinX[x] * siteCos[nearest] + cosX[x] * siteSin[nearest]) * 0.035 +
          (sinY[y] * siteCos[nearest] - cosY[y] * siteSin[nearest]) * 0.028;
      const edge =
        Math.abs(
          lum[y * w + Math.min(w - 1, x + 2)] - lum[y * w + Math.max(0, x - 2)],
        ) +
        Math.abs(
          lum[Math.min(w - 1, y + 2) * w + x] - lum[Math.max(0, y - 2) * w + x],
        );
      const paint = f.clamp((edge - 0.045) * 5),
        dark = f.clamp((0.93 - lum[n]) / 0.65),
        light =
          (1.12 - dark * 0.36) * tints[nearest] * wave * (1 - paint * 0.62);
      for (let channel = 0; channel < 3; channel++) {
        let value = base[channel] * light;
        if (seamDistance < 3.2) value = value * 0.77 + 29;
        p.pixels[i + channel] = shoulder(value);
      }
      p.pixels[i + 3] = 255;
    }
  p.updatePixels();
}
function solventTransfer(p, f) {
  paper(p, f, "#f2eddf");
  p.noFill();
  const angle = -0.43,
    dx = Math.cos(angle),
    dy = Math.sin(angle),
    phase = f.rnd(7, 13) * Math.PI * 2,
    phase2 = f.rnd(17, 23) * Math.PI * 2;
  for (let y = 4; y < f.w - 4; y += 5)
    for (let x = 4; x < f.w - 4; x += 5) {
      const broad =
        0.5 + 0.5 * Math.sin(x * 0.026 + phase) * Math.cos(y * 0.019 + phase2);
      const patch = f.rnd(Math.floor(x / 29), Math.floor(y / 29), 3);
      const pressure = f.clamp(
        f.intensity * 1.05 + (broad - 0.5) * 0.6 - patch * 0.32,
      );
      if (f.rnd(x, y, 5) > pressure) continue;
      const length = 5 + f.rnd(x, y, 7) * 17;
      p.strokeWeight(
        0.65 + f.rnd(x, y, 9) * 0.6 + Math.max(0, f.D(x, y) - 0.2) * 0.55,
      );
      for (let t = 0; t < length; t += 2) {
        const sx = x + dx * t,
          sy = y + dy * t,
          ex = sx + dx * 2,
          ey = sy + dy * 2;
        if (sx < 0 || sy < 0 || ex >= f.w || ey < 0 || ey >= f.w) continue;
        const mx = (sx + ex) / 2,
          my = (sy + ey) / 2,
          d = f.D(mx, my);
        if (
          d < 0.045 ||
          f.rnd(Math.round(sx), Math.round(sy), 11) < (1 - f.intensity) * 0.06
        )
          continue;
        const c = f.C(mx, my),
          ink = f.clamp((d - 0.07) / 0.5),
          gain = 0.86 - 0.4 * ink;
        p.stroke(
          c[0] * gain,
          c[1] * gain,
          c[2] * gain,
          Math.min(245, 40 + Math.pow(ink, 0.8) * 200 + f.intensity * 20),
        );
        p.line(sx, sy, ex, ey);
      }
    }
}

function blurLightField(input, w, radius, passes = 2) {
  let data = input.slice(),
    out = new Float32Array(input.length);
  const horizontal = new Float32Array(input.length),
    diameter = radius * 2 + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < w; y++) {
      let sum = 0;
      for (let j = -radius; j <= radius; j++)
        sum += data[y * w + Math.max(0, Math.min(w - 1, j))];
      for (let x = 0; x < w; x++) {
        horizontal[y * w + x] = sum / diameter;
        sum -= data[y * w + Math.max(0, x - radius)];
        sum += data[y * w + Math.min(w - 1, x + radius + 1)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let j = -radius; j <= radius; j++)
        sum += horizontal[Math.max(0, Math.min(w - 1, j)) * w + x];
      for (let y = 0; y < w; y++) {
        out[y * w + x] = sum / diameter;
        sum -= horizontal[Math.max(0, y - radius) * w + x];
        sum += horizontal[Math.min(w - 1, y + radius + 1) * w + x];
      }
    }
    [data, out] = [out, data];
  }
  return data;
}
function luminousVolume(p, f) {
  const grid = Math.max(1, Math.ceil(f.w / 4)),
    mask = new Float32Array(grid * grid),
    depthMass = new Float32Array(mask.length),
    radiance = new Float32Array(mask.length);
  const fullMask = new Uint8Array(f.w * f.w),
    fullDepth = new Float32Array(fullMask.length),
    fullRadiance = new Float32Array(fullMask.length);
  // Area-average every pixel in each downsample cell so narrow stems still emit.
  for (let y = 0; y < grid; y++)
    for (let x = 0; x < grid; x++) {
      const x0 = Math.floor((x * f.w) / grid),
        x1 = Math.floor(((x + 1) * f.w) / grid),
        y0 = Math.floor((y * f.w) / grid),
        y1 = Math.floor(((y + 1) * f.w) / grid),
        cell = y * grid + x;
      let coverage = 0,
        sumDepth = 0,
        sumRadiance = 0;
      for (let sy = y0; sy < y1; sy++)
        for (let sx = x0; sx < x1; sx++) {
          const i = sy * f.w + sx;
          if (f.ID(sx, sy) > 1) {
            fullMask[i] = 1;
            fullDepth[i] = f.Z(sx, sy);
            fullRadiance[i] = 0.45 + 0.55 * Math.max(0, f.N(sx, sy, 2) * 2 - 1);
            coverage++;
            sumDepth += fullDepth[i];
            sumRadiance += fullRadiance[i];
          }
        }
      const area = (x1 - x0) * (y1 - y0);
      mask[cell] = coverage / area;
      depthMass[cell] = sumDepth / area;
      radiance[cell] = sumRadiance / area;
    }
  const radius = 3 + Math.round(f.intensity * 13),
    near = blurLightField(radiance, grid, 2),
    middle = blurLightField(radiance, grid, radius),
    far = blurLightField(radiance, grid, radius * 2),
    depthBlur = blurLightField(depthMass, grid, radius * 2),
    maskBlur = blurLightField(mask, grid, radius * 2);
  function sample(field, x, y) {
    const px = Math.max(0, Math.min(grid - 1, ((x + 0.5) * grid) / f.w - 0.5)),
      py = Math.max(0, Math.min(grid - 1, ((y + 0.5) * grid) / f.w - 0.5)),
      x0 = Math.floor(px),
      y0 = Math.floor(py),
      x1 = Math.min(grid - 1, x0 + 1),
      y1 = Math.min(grid - 1, y0 + 1),
      tx = px - x0,
      ty = py - y0;
    return (
      (field[y0 * grid + x0] * (1 - tx) + field[y0 * grid + x1] * tx) *
        (1 - ty) +
      (field[y1 * grid + x0] * (1 - tx) + field[y1 * grid + x1] * tx) * ty
    );
  }
  p.loadPixels();
  for (let y = 0; y < f.w; y++)
    for (let x = 0; x < f.w; x++) {
      const point = y * f.w + x,
        inside = fullMask[point],
        softMask = sample(maskBlur, x, y),
        z = inside
          ? fullDepth[point]
          : softMask > 0.0001
            ? sample(depthBlur, x, y) / softMask
            : 0.5;
      const t = f.clamp((z - 0.35) / 0.4),
        first = t < 0.5 ? [1, 0.45, 0.28] : [0.68, 0.22, 1],
        last = t < 0.5 ? [0.68, 0.22, 1] : [0.22, 0.72, 1],
        mix = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      const core = fullRadiance[point];
      const energy =
        core * 1.65 +
        sample(near, x, y) * 0.45 +
        sample(middle, x, y) * 0.75 +
        sample(far, x, y) * 0.65;
      const i = (y * f.w + x) * 4,
        grain = (f.rnd(x, y) - 0.5) * 0.8;
      for (let channel = 0; channel < 3; channel++) {
        const hue = first[channel] * (1 - mix) + last[channel] * mix;
        p.pixels[i + channel] =
          [8, 13, 27][channel] +
          (235 - [8, 13, 27][channel]) * (1 - Math.exp(-hue * energy)) +
          grain;
      }
      p.pixels[i + 3] = 255;
    }
  p.updatePixels();
}

function surfacePointillism(p, f) {
  paper(p, f, "#f3eedf");
  p.noStroke();
  const points = f.surfacePoints(),
    density = 0.15 + f.intensity * 0.8,
    geometry = f.geometrySnapshot?.(),
    perspective = geometry?.source === 'conjure' && geometry.camera === 'perspective';
  for (let i = 0; i < points.length; i += 6) {
    const x = points[i],
      y = points[i + 1],
      z = points[i + 2],
      id = points[i + 3],
      index = points[i + 4],
      facing = points[i + 5],
      sx = Math.floor(x),
      sy = Math.floor(y);
    if (
      facing <= 0 ||
      z <= 0 ||
      (perspective && (z < geometry.near || z > geometry.far)) ||
      x < 0 ||
      y < 0 ||
      x >= f.w ||
      y >= f.w ||
      f.ID(sx, sy) !== id ||
      (f.materialVisibility
        ? !f.surfaceVisibility().point(x, y, z, id)
        : z > f.distance(sx, sy) + 0.02)
    )
      continue;
    if (f.rnd(index, id, 37) > density * (1 - f.T(sx, sy) * 0.55)) continue;
    const color = f.C(sx, sy),
      base = f.B(sx, sy),
      warm = f.rnd(index, id, 41) > 0.5,
      shift = warm ? [12, 2, -8] : [-8, 2, 13];
    p.fill(
      ...color.map((value, channel) =>
        f.clamp(value * 0.7 + base[channel] * 0.15 + shift[channel], 0, 255),
      ),
    );
    p.circle(x, y, 2 + f.intensity * 2.1 + f.rnd(index, id, 43) * 0.9);
  }
}

function burnishPlate(f) {
  const w = f.w,
    tooth = new Float32Array(w * w),
    ids = new Uint8Array(w * w);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      ids[i] = f.ID(x, y);
      // Every unworked burr is high enough to retain a full black impression.
      tooth[i] = 0.76 + f.rnd(x, y, 61) * 0.24;
    }
  const step = 3;
  for (let cy = 1; cy < w; cy += step)
    for (let cx = 1; cx < w; cx += step) {
      const x = cx + (f.rnd(cx, cy, 62) - 0.5) * 2,
        y = cy + (f.rnd(cx, cy, 63) - 0.5) * 2;
      const id = f.ID(x, y);
      if (id <= 1) continue;
      const angle = Math.atan2(f.N(x, y, 0) - 0.5, f.N(x, y, 1) - 0.5),
        c = Math.cos(angle),
        s = Math.sin(angle);
      const a = 5.5 + f.rnd(cx, cy, 64),
        b = 4.5;
      const light = f.clamp((f.L(x, y) - 0.06) / 0.78),
        pressure = f.intensity * Math.pow(light, 1.3) * 0.95;
      for (
        let py = Math.max(0, Math.floor(y - a));
        py <= Math.min(w - 1, Math.ceil(y + a));
        py++
      )
        for (
          let px = Math.max(0, Math.floor(x - a));
          px <= Math.min(w - 1, Math.ceil(x + a));
          px++
        ) {
          const i = py * w + px;
          if (ids[i] !== id) continue;
          const dx = px - x,
            dy = py - y,
            u = (dx * c + dy * s) / a,
            v = (-dx * s + dy * c) / b,
            q = u * u + v * v;
          if (q >= 1) continue;
          // Fixed tool paths; pressure can only lower the residual ink-holding tooth.
          tooth[i] *= Math.exp(-pressure * (1 - q) * (1 - q));
        }
    }
  return tooth;
}
function mezzotint(p, f) {
  const tooth = burnishPlate(f);
  p.loadPixels();
  for (let i = 0; i < tooth.length; i++) {
    const t = f.clamp((tooth[i] - 0.12) / 0.6),
      ink = t * t * (3 - 2 * t);
    for (let c = 0; c < 3; c++)
      p.pixels[i * 4 + c] =
        [240, 234, 220][c] * (1 - ink) + [20, 22, 23][c] * ink;
    p.pixels[i * 4 + 3] = 255;
  }
  p.updatePixels();
}

function paintRelief(f) {
  const w = f.w,
    height = new Float32Array(w * w),
    pigment = new Float32Array(w * w * 3),
    ids = new Uint8Array(w * w);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      ids[i] = f.ID(x, y);
      const c = ids[i] > 1 ? f.C(x, y) : [237, 231, 212];
      for (let k = 0; k < 3; k++) pigment[i * 3 + k] = c[k];
    }
  // The seed fixes paint positions and colors. Paint load only changes relief depth.
  for (let pass = 0; pass < 2; pass++) {
    const step = pass ? 11 : 18;
    for (let cy = step / 2; cy < w; cy += step)
      for (let cx = step / 2; cx < w; cx += step) {
        const x = cx + (f.rnd(cx, cy, 80 + pass) - 0.5) * step * 0.7,
          y = cy + (f.rnd(cx, cy, 82 + pass) - 0.5) * step * 0.7;
        const id = f.ID(x, y);
        if (id <= 1) continue;
        const angle =
          Math.atan2(f.N(x, y, 0) - 0.5, f.N(x, y, 1) - 0.5) +
          (f.rnd(cx, cy, 84 + pass) - 0.5) * 0.5;
        const c = Math.cos(angle),
          s = Math.sin(angle),
          a = (pass ? 12 : 22) * (0.75 + f.rnd(cx, cy, 86 + pass) * 0.65),
          b = pass ? 6.2 : 9;
        const sample = f.C(x, y),
          base = f.B(x, y),
          warm = f.rnd(cx, cy, 88 + pass) - 0.5;
        const ink = sample.map((v, k) =>
          f.clamp(v * 0.72 + base[k] * 0.25 + warm * [25, 5, -20][k], 0, 255),
        );
        const phase = f.rnd(cx, cy, 90 + pass) * Math.PI * 2,
          load = 0.65 + f.rnd(cx, cy, 92 + pass) * 0.65;
        for (
          let py = Math.max(0, Math.floor(y - a));
          py <= Math.min(w - 1, Math.ceil(y + a));
          py++
        )
          for (
            let px = Math.max(0, Math.floor(x - a));
            px <= Math.min(w - 1, Math.ceil(x + a));
            px++
          ) {
            const i = py * w + px;
            if (ids[i] !== id) continue;
            const dx = px - x,
              dy = py - y,
              u = (dx * c + dy * s) / a,
              v = (-dx * s + dy * c) / b,
              q = u * u + v * v;
            if (q >= 1) continue;
            const envelope = Math.pow(1 - q, 0.45),
              grooves = 0.7 + 0.3 * Math.cos(v * 9 + phase + u * 0.3),
              lip = Math.exp(-(((q - 0.76) / 0.13) ** 2)) * 0.32;
            const alpha = envelope * 0.85;
            for (let k = 0; k < 3; k++)
              pigment[i * 3 + k] =
                pigment[i * 3 + k] * (1 - alpha) + ink[k] * alpha;
            height[i] += load * (envelope * grooves + lip);
          }
      }
  }
  return { height, pigment, ids };
}
function impasto(p, f) {
  const { height, pigment, ids } = f.prepare("impasto", () => paintRelief(f)),
    w = f.w,
    scale = f.intensity * 1.5;
  let [lx, ly, lz] = f.reliefLight;
  const ll = Math.hypot(lx, ly, lz) || 1;
  lx /= ll;
  ly /= ll;
  lz /= ll;
  const halfLength = Math.hypot(lx, ly, lz + 1) || 1,
    hx = lx / halfLength,
    hy = ly / halfLength,
    hz = (lz + 1) / halfLength;
  p.loadPixels();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        at = i * 4;
      let gain = 1,
        shine = 0;
      if (ids[i] > 1 && scale > 0) {
        const left = x > 0 && ids[i - 1] === ids[i] ? height[i - 1] : height[i],
          right =
            x < w - 1 && ids[i + 1] === ids[i] ? height[i + 1] : height[i];
        const up = y > 0 && ids[i - w] === ids[i] ? height[i - w] : height[i],
          down = y < w - 1 && ids[i + w] === ids[i] ? height[i + w] : height[i];
        const nx = (left - right) * scale * 0.5,
          ny = (up - down) * scale * 0.5,
          nl = Math.hypot(nx, ny, 1);
        gain =
          1 +
          (Math.max(0, (nx * lx + ny * ly + lz) / nl) - Math.max(0, lz)) * 0.7;
        shine =
          Math.max(
            0,
            Math.pow(Math.max(0, (nx * hx + ny * hy + hz) / nl), 24) -
              Math.pow(Math.max(0, hz), 24),
          ) * 15;
      }
      for (let k = 0; k < 3; k++)
        p.pixels[at + k] = f.clamp(pigment[i * 3 + k] * gain + shine, 0, 255);
      p.pixels[at + 3] = 255;
    }
  p.updatePixels();
}

function reactionDomains(f) {
  const w = f.w,
    ids = new Uint8Array(w * w),
    labels = new Uint32Array(w * w),
    queue = new Int32Array(w * w);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) ids[y * w + x] = f.ID(x, y);
  let label = 0;
  for (let start = 0; start < ids.length; start++) {
    if (ids[start] <= 1 || labels[start]) continue;
    label++;
    let head = 0,
      tail = 1;
    queue[0] = start;
    labels[start] = label;
    while (head < tail) {
      const i = queue[head++],
        x = i % w,
        y = Math.floor(i / w),
        id = ids[i];
      for (const j of [
        x > 0 ? i - 1 : -1,
        x < w - 1 ? i + 1 : -1,
        y > 0 ? i - w : -1,
        y < w - 1 ? i + w : -1,
      ])
        if (j >= 0 && !labels[j] && ids[j] === id) {
          labels[j] = label;
          queue[tail++] = j;
        }
    }
  }
  return labels;
}
function clearColonyPath(labels, w, x0, y0, x1, y1, domain) {
  const steps = Math.max(1, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2);
  let px = x0,
    py = y0;
  for (let s = 1; s <= steps; s++) {
    const x = Math.round(x0 + ((x1 - x0) * s) / steps),
      y = Math.round(y0 + ((y1 - y0) * s) / steps);
    if (labels[y * w + x] !== domain) return false;
    if (
      x !== px &&
      y !== py &&
      (labels[py * w + x] !== domain || labels[y * w + px] !== domain)
    )
      return false;
    px = x;
    py = y;
  }
  return true;
}
function growCells(f, { reaction = 1, steps = 1400 } = {}) {
  const nativeDomains = reactionDomains(f),
    n = Math.min(144, f.w),
    len = n * n,
    scale = f.w / n,
    ids = new Uint8Array(len),
    domains = new Uint32Array(len),
    sourceX = new Int32Array(len),
    sourceY = new Int32Array(len),
    feed = new Float32Array(len),
    adj = new Int32Array(len * 8),
    active = [],
    centers = [],
    fallback = new Map(),
    seeded = new Set();
  let a = new Float32Array(len).fill(1),
    b = new Float32Array(len),
    aa = new Float32Array(len).fill(1),
    bb = new Float32Array(len);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      sourceX[i] = Math.round((x + 0.5) * scale - 0.5);
      sourceY[i] = Math.round((y + 0.5) * scale - 0.5);
      domains[i] = nativeDomains[sourceY[i] * f.w + sourceX[i]];
      ids[i] = f.ID((x + 0.5) * scale - 0.5, (y + 0.5) * scale - 0.5);
      feed[i] =
        0.049 + f.L((x + 0.5) * scale - 0.5, (y + 0.5) * scale - 0.5) * 0.006;
      if (ids[i] <= 1) continue;
      active.push(i);
      const chance = f.rnd(x, y, 110),
        old = fallback.get(domains[i]);
      if (!old || chance > old.chance) fallback.set(domains[i], { i, chance });
      if (chance < 0.035) {
        centers.push(i);
        seeded.add(domains[i]);
      }
    }
  for (const [id, entry] of fallback)
    if (!seeded.has(id)) centers.push(entry.i);
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  for (const i of active) {
    const x = i % n,
      y = Math.floor(i / n);
    dirs.forEach(([dx, dy], k) => {
      const xx = x + dx,
        yy = y + dy,
        j = yy * n + xx;
      if (xx < 0 || yy < 0 || xx >= n || yy >= n || domains[i] !== domains[j])
        adj[i * 8 + k] = i;
      else if (j < i)
        adj[i * 8 + k] = adj[j * 8 + [1, 0, 3, 2, 7, 6, 5, 4][k]] === i ? j : i;
      else
        adj[i * 8 + k] = clearColonyPath(
          nativeDomains,
          f.w,
          sourceX[i],
          sourceY[i],
          sourceX[j],
          sourceY[j],
          domains[i],
        )
          ? j
          : i;
    });
  }
  for (const i of centers) {
    a[i] = 0.5;
    b[i] = 0.5;
    for (let k = 0; k < 8; k++) {
      const j = adj[i * 8 + k];
      a[j] = 0.5;
      b[j] = 0.5;
    }
  }
  for (let step = 0; step < steps; step++) {
    for (const i of active) {
      const av = a[i],
        bv = b[i];
      let la = -av,
        lb = -bv;
      for (let k = 0; k < 8; k++) {
        const j = adj[i * 8 + k],
          weight = k < 4 ? 0.2 : 0.05;
        la += a[j] * weight;
        lb += b[j] * weight;
      }
      const r = reaction * av * bv * bv,
        F = feed[i];
      aa[i] = Math.max(0, Math.min(1, av + 0.35 * la - r + F * (1 - av)));
      bb[i] = Math.max(0, Math.min(1, bv + 0.175 * lb + r - (0.062 + F) * bv));
    }
    [a, aa] = [aa, a];
    [b, bb] = [bb, b];
  }
  return { n, ids, domains, nativeDomains, a, b, adj };
}
function sampleColony(field, x, y, id, w, secondary = null) {
  const { n, ids, domains, nativeDomains, b } = field,
    domain =
      nativeDomains[
        Math.max(0, Math.min(w - 1, Math.round(y))) * w +
          Math.max(0, Math.min(w - 1, Math.round(x)))
      ],
    gx = ((x + 0.5) * n) / w - 0.5,
    gy = ((y + 0.5) * n) / w - 0.5,
    x0 = Math.floor(gx),
    y0 = Math.floor(gy),
    tx = gx - x0,
    ty = gy - y0;
  let value = 0,
    second = 0,
    total = 0;
  for (let dy = 0; dy < 2; dy++)
    for (let dx = 0; dx < 2; dx++) {
      const xx = Math.max(0, Math.min(n - 1, x0 + dx)),
        yy = Math.max(0, Math.min(n - 1, y0 + dy)),
        i = yy * n + xx;
      if (ids[i] !== id || domains[i] !== domain) continue;
      if (
        field.pathSafe &&
        !glazePathClear(
          nativeDomains,
          w,
          x,
          y,
          ((xx + 0.5) * w) / n - 0.5,
          ((yy + 0.5) * w) / n - 0.5,
          domain,
        )
      )
        continue;
      const weight = (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty);
      total += weight;
      value += b[i] * weight;
      if (secondary) second += secondary.values[i] * weight;
    }
  if (secondary) secondary.value = total > 0 ? second / total : 0;
  return total > 0 ? value / total : 0;
}
function reactiveCells(p, f) {
  const field = f.prepare("reaction", () => growCells(f));
  p.loadPixels();
  for (let y = 0; y < f.w; y++)
    for (let x = 0; x < f.w; x++) {
      const i = (y * f.w + x) * 4,
        id = f.ID(x, y);
      let ink = 0;
      if (id > 1) {
        const border =
          f.ID(x + 1, y) !== id ||
          f.ID(x - 1, y) !== id ||
          f.ID(x, y + 1) !== id ||
          f.ID(x, y - 1) !== id;
        const concentration = sampleColony(field, x, y, id, f.w),
          threshold = 0.29 - f.intensity * 0.16 - f.D(x, y) * 0.035;
        ink = border ? 0.75 : f.clamp((concentration - threshold) * 28);
      }
      for (let k = 0; k < 3; k++)
        p.pixels[i + k] =
          [239, 236, 218][k] * (1 - ink) + [31, 48, 40][k] * ink;
      p.pixels[i + 3] = 255;
    }
  p.updatePixels();
}

function marblePlan(f) {
  const objects = new Map();
  for (let y = 0; y < f.w; y++)
    for (let x = 0; x < f.w; x++) {
      const id = f.ID(x, y);
      if (id <= 1) continue;
      const box = objects.get(id) || { minX: x, maxX: x, minY: y, maxY: y };
      box.minX = Math.min(box.minX, x);
      box.maxX = Math.max(box.maxX, x);
      box.minY = Math.min(box.minY, y);
      box.maxY = Math.max(box.maxY, y);
      objects.set(id, box);
    }
  for (const [id, box] of objects) {
    box.drops = [];
    for (let i = 0; i < 44; i++)
      box.drops.push({
        x:
          f.rnd(i % 5, id, 140) * 1.3 -
          0.15 +
          (f.rnd(i, id, 145) - 0.5) * 0.025,
        y:
          f.rnd(i % 5, id, 141) * 1.3 -
          0.15 +
          (f.rnd(i, id, 146) - 0.5) * 0.025,
        radius: 0.08 + f.rnd(i, id, 142) * 0.09,
        color: i % 4,
      });
    box.combs = [
      { axis: 0, at: 0.2, sign: 1 },
      { axis: 0, at: 0.45, sign: -1 },
      { axis: 0, at: 0.7, sign: 1 },
      { axis: 1, at: 0.5, sign: 1 },
    ];
  }
  return objects;
}
function moveMarbleComb(point, comb, travel) {
  const distance = Math.abs(point[comb.axis] - comb.at);
  point[1 - comb.axis] += travel * comb.sign * Math.exp(-distance / 0.08);
}
function marblePigment(x, y, drops) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i],
      dx = x - d.x,
      dy = y - d.y,
      q = dx * dx + dy * dy,
      r2 = d.radius * d.radius;
    if (q <= r2) return d.color;
    const ratio = Math.sqrt(1 - r2 / q);
    x = d.x + dx * ratio;
    y = d.y + dy * ratio;
  }
  return 0;
}
function marbledFloat(p, f) {
  const objects = f.prepare("marbling", () => marblePlan(f)),
    point = [0, 0];
  p.loadPixels();
  for (let y = 0; y < f.w; y++)
    for (let x = 0; x < f.w; x++) {
      const id = f.ID(x, y),
        at = (y * f.w + x) * 4;
      let color = [243, 235, 217],
        light = 1;
      if (id > 1) {
        const box = objects.get(id);
        point[0] = (x - box.minX) / Math.max(1, box.maxX - box.minX);
        point[1] = (y - box.minY) / Math.max(1, box.maxY - box.minY);
        for (let i = box.combs.length - 1; i >= 0; i--)
          moveMarbleComb(point, box.combs[i], -0.42 * f.intensity);
        const pigment = marblePigment(point[0], point[1], box.drops),
          base = f.B(x, y);
        color =
          pigment === 0
            ? base.map((c) => c * 0.65)
            : [
                [0, 0, 0],
                [239, 229, 207],
                [35, 47, 52],
                [203, 155, 80],
              ][pigment];
        light = 0.58 + f.L(x, y) * 0.46;
      }
      for (let c = 0; c < 3; c++)
        p.pixels[at + c] = f.clamp(color[c] * light, 0, 255);
      p.pixels[at + 3] = 255;
    }
  p.updatePixels();
}

function sectionalVolume(p, f) {
  paper(p, f, "#f2f0e5");
  p.noFill();
  const lines = f.sectionLines(Math.round(10 + f.intensity * 28));
  for (let hidden = 1; hidden >= 0; hidden--) {
    p.stroke(...(hidden ? [112, 133, 121, 65] : [25, 59, 43, 225]));
    for (let i = 0; i < lines.length; i += 9) {
      const x = lines[i],
        y = lines[i + 1],
        z = lines[i + 2],
        dx = lines[i + 3] - x,
        dy = lines[i + 4] - y,
        dz = lines[i + 5] - z,
        id = lines[i + 6],
        length = Math.hypot(dx, dy);
      const pieces = Math.max(1, Math.ceil(length / 3));
      p.strokeWeight((hidden ? 0.55 : 0.9) + f.rnd(i / 9, id, 151) * 0.2);
      for (let k = 0; k < pieces; k++) {
        const t = (k + 0.5) / pieces,
          mx = x + dx * t,
          my = y + dy * t,
          mz = f.interpolateDepth ? f.interpolateDepth(z, z + dz, t) : z + dz * t,
          sx = Math.floor(mx),
          sy = Math.floor(my);
        if (sx < 0 || sy < 0 || sx >= f.w || sy >= f.w || mz <= 0) continue;
        const visible =
          lines[i + 8] > 0 &&
          f.ID(sx, sy) === id &&
          mz <= f.distance(sx, sy) + 0.035;
        if (visible === Boolean(hidden)) continue;
        if (hidden && k % 3 === 2) continue;
        p.line(
          x + (dx * k) / pieces,
          y + (dy * k) / pieces,
          x + (dx * (k + 1)) / pieces,
          y + (dy * (k + 1)) / pieces,
        );
      }
    }
  }
}

// Traverse pixel cells crossed by the actual floating segment, including both
// neighbors at a corner, so a fissure cannot hop a native-mask gap.
function glazePathClear(labels, w, x, y, u, v, domain) {
  const epsilon = 1e-10;
  // Use one geometric tolerance policy before assigning pixel ownership.
  const snap = (q) => {
    const b = Math.round(q + 0.5) - 0.5;
    return Math.abs(q - b) < epsilon ? b : q;
  };
  x = snap(x);
  y = snap(y);
  u = snap(u);
  v = snap(v);
  const valid = (a, b) =>
    a >= 0 && b >= 0 && a < w && b < w && labels[b * w + a] === domain;
  const onBoundary = (q) => q + 0.5 === Math.round(q + 0.5);
  const endpointClear = (px, py) => {
    const a = Math.floor(px + 0.5),
      b = Math.floor(py + 0.5),
      edgeX = onBoundary(px),
      edgeY = onBoundary(py);
    return (
      valid(a, b) &&
      (!edgeX || valid(a - 1, b)) &&
      (!edgeY || valid(a, b - 1)) &&
      (!(edgeX && edgeY) || valid(a - 1, b - 1))
    );
  };
  if (!endpointClear(x, y) || !endpointClear(u, v)) return false;
  let cx = Math.floor(x + 0.5),
    cy = Math.floor(y + 0.5);
  const ex = Math.floor(u + 0.5),
    ey = Math.floor(v + 0.5),
    dx = u - x,
    dy = v - y,
    sx = Math.sign(dx),
    sy = Math.sign(dy),
    tx = dx ? 1 / Math.abs(dx) : Infinity,
    ty = dy ? 1 / Math.abs(dy) : Infinity,
    alongX = !dx && onBoundary(x),
    alongY = !dy && onBoundary(y);
  // A segment exactly on a cell boundary touches both adjacent strips.
  const cellClear = (a, b) =>
    valid(a, b) && (!alongX || valid(a - 1, b)) && (!alongY || valid(a, b - 1));
  let ax = dx ? (cx + (sx > 0 ? 0.5 : -0.5) - x) / dx : Infinity,
    ay = dy ? (cy + (sy > 0 ? 0.5 : -0.5) - y) / dy : Infinity;
  while (cx !== ex || cy !== ey) {
    if (Math.min(ax, ay) >= 1) return true;
    if (Math.abs(ax - ay) < epsilon) {
      if (!cellClear(cx + sx, cy) || !cellClear(cx, cy + sy)) return false;
      cx += sx;
      cy += sy;
      ax += tx;
      ay += ty;
    } else if (ax < ay) {
      cx += sx;
      ax += tx;
    } else {
      cy += sy;
      ay += ty;
    }
    if (!cellClear(cx, cy)) return false;
  }
  return true;
}

// Two growth waves share one immutable fracture history. Fine branches mature
// in birth order, so revealing a prefix never leaves them arrested on unseen ink.
function growGlazeCracks(f) {
  const w = f.w,
    domains = reactionDomains(f),
    cell = 12,
    n = Math.ceil(w / cell),
    bins = Array.from({ length: n * n }, () => []),
    segments = [],
    records = [],
    fallback = new Map(),
    seeds = [],
    seeded = new Set();
  let serial = 0,
    collisions = 0;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const domain = domains[y * w + x];
      if (!domain) continue;
      const score =
        (x > 0 && domains[y * w + x - 1] === domain) +
        (x + 1 < w && domains[y * w + x + 1] === domain) +
        (y > 0 && domains[(y - 1) * w + x] === domain) +
        (y + 1 < w && domains[(y + 1) * w + x] === domain);
      if (!fallback.has(domain) || fallback.get(domain).score < score)
        fallback.set(domain, { x, y, score });
    }
  const seed = (x, y, domain) => {
    const angle = f.rnd(x, y, 180) * Math.PI * 2;
    for (const a of [angle, angle + Math.PI])
      seeds.push({ x, y, angle: a, domain, id: serial++, age: 0, alive: true });
    seeded.add(domain);
  };
  for (let y = 14; y < w; y += 38)
    for (let x = 14; x < w; x += 38) {
      const px = Math.max(
          0,
          Math.min(w - 1, Math.round(x + (f.rnd(x, y, 186) - 0.5) * 17)),
        ),
        py = Math.max(
          0,
          Math.min(w - 1, Math.round(y + (f.rnd(x, y, 187) - 0.5) * 17)),
        ),
        domain = domains[py * w + px];
      if (domain && f.rnd(x, y, 181) < 0.85) seed(px, py, domain);
    }
  for (const [domain, p] of fallback)
    if (!seeded.has(domain)) seed(p.x, p.y, domain);
  const cells = (x, y, u, v) => {
    const list = [];
    for (
      let cy = Math.max(0, Math.floor(Math.min(y, v) / cell));
      cy <= Math.min(n - 1, Math.floor(Math.max(y, v) / cell));
      cy++
    )
      for (
        let cx = Math.max(0, Math.floor(Math.min(x, u) / cell));
        cx <= Math.min(n - 1, Math.floor(Math.max(x, u) / cell));
        cx++
      )
        list.push(cy * n + cx);
    return list;
  };
  const step = (tip, generation, birth) => {
    if (!tip.alive || records.length >= 18000) return false;
    tip.age++;
    tip.angle +=
      (f.rnd(tip.id, tip.age, 182) - 0.5) * (generation ? 0.22 : 0.12);
    const dx = Math.cos(tip.angle) * 3,
      dy = Math.sin(tip.angle) * 3,
      clear = (t) =>
        glazePathClear(
          domains,
          w,
          tip.x,
          tip.y,
          tip.x + dx * t,
          tip.y + dy * t,
          tip.domain,
        );
    let stop = 1;
    if (!clear(1)) {
      tip.alive = false;
      let low = 0,
        high = 1;
      for (let k = 0; k < 8; k++) {
        const mid = (low + high) / 2;
        if (clear(mid)) low = mid;
        else high = mid;
      }
      stop = low;
    }
    const examined = new Set();
    let collided = false;
    for (const bucket of cells(
      tip.x,
      tip.y,
      tip.x + dx * stop,
      tip.y + dy * stop,
    ))
      for (const index of bins[bucket]) {
        if (examined.has(index)) continue;
        examined.add(index);
        const old = records[index];
        if (old.domain !== tip.domain) continue;
        const ex = old.u - old.x,
          ey = old.v - old.y,
          den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-8) continue;
        const rx = old.x - tip.x,
          ry = old.y - tip.y,
          t = (rx * ey - ry * ex) / den,
          s = (rx * dy - ry * dx) / den;
        if (t > 1e-5 && t <= stop && s >= -1e-5 && s <= 1 + 1e-5) {
          stop = t;
          tip.alive = false;
          collided = true;
        }
      }
    if (collided) collisions++;
    if (stop < 0.015) {
      tip.alive = false;
      return false;
    }
    const u = tip.x + dx * stop,
      v = tip.y + dy * stop,
      index = records.length;
    records.push({ x: tip.x, y: tip.y, u, v, domain: tip.domain, id: tip.id });
    segments.push(tip.x, tip.y, u, v, generation, tip.domain, birth);
    for (const bucket of cells(tip.x, tip.y, u, v)) bins[bucket].push(index);
    tip.x = u;
    tip.y = v;
    return true;
  };
  for (let tick = 0; tick < 180; tick++) {
    let alive = 0;
    for (const tip of seeds)
      if (tip.alive) {
        alive++;
        step(tip, 0, 0);
      }
    if (!alive || records.length >= 18000) break;
  }
  const coarse = records.length,
    branches = [];
  for (let i = 2; i < coarse; i += 5) {
    const r = records[i],
      x = r.u,
      y = r.v;
    let curvature = 0;
    for (let c = 0; c < 3; c++)
      curvature +=
        Math.abs(f.N(x + 3, y, c) - f.N(x - 3, y, c)) +
        Math.abs(f.N(x, y + 3, c) - f.N(x, y - 3, c));
    if (f.rnd(i, r.id, 183) < 0.55 + Math.min(0.35, curvature * 0.6))
      branches.push({
        x,
        y,
        domain: r.domain,
        id: serial++,
        age: 0,
        alive: true,
        angle:
          Math.atan2(r.v - r.y, r.u - r.x) +
          (f.rnd(i, r.id, 184) < 0.5 ? -1 : 1) *
            (1.3 + f.rnd(i, r.id, 185) * 0.55),
      });
  }
  for (let b = 0; b < branches.length; b++)
    for (
      let tick = 0;
      tick < 150 && branches[b].alive && records.length < 18000;
      tick++
    )
      step(branches[b], 1, (b + 1) / branches.length);
  return {
    domains,
    segments: new Float64Array(segments),
    collisions,
    coarse,
    branches: branches.length,
  };
}
function crackleGlaze(p, f) {
  const plan = f.prepare("crackle", () => growGlazeCracks(f)),
    rim = f.prepare("ceramic-rims", () => ceramicRims(f)),
    w = f.w,
    dark = new Float32Array(w * w),
    brown = new Float32Array(w * w),
    stain = new Float32Array(w * w);
  for (let i = 0; i < plan.segments.length; i += 7) {
    const x = plan.segments[i],
      y = plan.segments[i + 1],
      u = plan.segments[i + 2],
      v = plan.segments[i + 3],
      fine = plan.segments[i + 4],
      domain = plan.segments[i + 5];
    if (fine && plan.segments[i + 6] > f.intensity) continue;
    const dx = u - x,
      dy = v - y,
      length = dx * dx + dy * dy;
    for (
      let py = Math.max(0, Math.floor(Math.min(y, v) - 3));
      py <= Math.min(w - 1, Math.ceil(Math.max(y, v) + 3));
      py++
    )
      for (
        let px = Math.max(0, Math.floor(Math.min(x, u) - 3));
        px <= Math.min(w - 1, Math.ceil(Math.max(x, u) + 3));
        px++
      ) {
        const at = py * w + px;
        if (plan.domains[at] !== domain) continue;
        const t = f.clamp(((px - x) * dx + (py - y) * dy) / length),
          d = (px - x - dx * t) ** 2 + (py - y - dy * t) ** 2;
        stain[at] = Math.max(stain[at], Math.exp(-d / 3.2) * 0.18);
        if (fine) brown[at] = Math.max(brown[at], Math.exp(-d / 0.26) * 0.82);
        else dark[at] = Math.max(dark[at], Math.exp(-d / 0.5) * 0.88);
      }
  }
  p.loadPixels();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const at = y * w + x,
        inside = plan.domains[at] > 0,
        luminance = f.L(x, y),
        light = 0.61 + luminance * 0.43,
        tea = Math.max(stain[at], brown[at]);
      for (let c = 0; c < 3; c++) {
        let value = inside ? [197, 216, 205][c] * light : [241, 235, 218][c];
        value = value * (1 - tea) + [115, 87, 52][c] * tea;
        value = value * (1 - dark[at]) + [52, 58, 48][c] * dark[at];
        value =
          value * (1 - rim[at]) +
          [112, 93, 86][c] * (0.75 + luminance * 0.3) * rim[at];
        p.pixels[at * 4 + c] = f.clamp(value, 0, 255);
      }
      p.pixels[at * 4 + 3] = 255;
    }
  p.updatePixels();
}

// The small material lattice conserves iron across emergence, transport and
// freezing. It is a stylized glaze history, not a kiln chemistry reconstruction.
function oilBubblePlan(f) {
  const w = f.w,
    n = Math.min(240, w),
    scale = w / n,
    nativeDomains = reactionDomains(f),
    domains = new Uint32Array(n * n),
    ids = new Uint8Array(n * n),
    active = [],
    remaining = new Float64Array(n * n),
    adj = new Int32Array(n * n * 4),
    flow = new Float32Array(n * n * 2),
    events = [];
  const coord = (i) => [
    ((i % n) + 0.5) * scale - 0.5,
    (Math.floor(i / n) + 0.5) * scale - 0.5,
  ];
  for (let i = 0; i < n * n; i++) {
    const [x, y] = coord(i),
      domain = nativeDomains[Math.round(y) * w + Math.round(x)];
    domains[i] = domain;
    ids[i] = f.ID(x, y);
    if (!domain) continue;
    active.push(i);
    remaining[i] = 1;
    let nx = f.N(x, y, 0) * 2 - 1,
      ny = f.N(x, y, 1) * 2 - 1,
      nz = f.N(x, y, 2) * 2 - 1,
      len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    flow[i * 2] = 0.13 * nx * ny;
    flow[i * 2 + 1] = 0.13 * (1 - ny * ny);
  }
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const i of active) {
    const [x, y] = coord(i),
      cx = i % n,
      cy = Math.floor(i / n);
    for (let k = 0; k < 4; k++) {
      const [dx, dy] = directions[k],
        xx = cx + dx,
        yy = cy + dy,
        j = yy * n + xx;
      adj[i * 4 + k] =
        xx >= 0 &&
        yy >= 0 &&
        xx < n &&
        yy < n &&
        domains[j] === domains[i] &&
        glazePathClear(
          nativeDomains,
          w,
          x,
          y,
          x + dx * scale,
          y + dy * scale,
          domains[i],
        )
          ? j
          : i;
    }
  }
  for (let y = 3; y < n; y += 9)
    for (let x = 3; x < n; x += 9) {
      const xx = Math.max(
          0,
          Math.min(n - 1, Math.round(x + (f.rnd(x, y, 200) - 0.5) * 6)),
        ),
        yy = Math.max(
          0,
          Math.min(n - 1, Math.round(y + (f.rnd(x, y, 201) - 0.5) * 6)),
        ),
        i = yy * n + xx;
      if (domains[i] && f.rnd(x, y, 202) < 0.92)
        events.push({
          x: xx,
          y: yy,
          domain: domains[i],
          born: Math.floor(f.rnd(x, y, 203) * 15),
          life: 6 + Math.floor(f.rnd(x, y, 204) * 12),
          reach: 2 + Math.floor(f.rnd(x, y, 205) * 5),
          uptake: 0.05 + f.rnd(x, y, 206) * 0.11,
          mass: 0,
          deposits: [],
        });
    }
  for (let tick = 0; tick < 34; tick++)
    for (const event of events) {
      const age = tick - event.born;
      if (age < 0 || age >= event.life) continue;
      for (let dy = -event.reach; dy <= event.reach; dy++)
        for (let dx = -event.reach; dx <= event.reach; dx++) {
          const x = event.x + dx,
            y = event.y + dy;
          if (
            x < 0 ||
            y < 0 ||
            x >= n ||
            y >= n ||
            dx * dx + dy * dy > event.reach ** 2
          )
            continue;
          const i = y * n + x;
          if (
            domains[i] !== event.domain ||
            !glazePathClear(
              nativeDomains,
              w,
              ...coord(event.y * n + event.x),
              ...coord(i),
              event.domain,
            )
          )
            continue;
          const take =
            remaining[i] *
            event.uptake *
            Math.exp(-(dx * dx + dy * dy) / (event.reach ** 2 * 0.75));
          remaining[i] -= take;
          event.mass += take;
        }
    }
  for (const event of events) {
    const radius = Math.max(0.8, Math.sqrt(event.mass / Math.PI) * 0.57),
      extent = Math.ceil(radius * 2.2),
      weights = [];
    let total = 0;
    for (let dy = -extent; dy <= extent; dy++)
      for (let dx = -extent; dx <= extent; dx++) {
        const x = event.x + dx,
          y = event.y + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const i = y * n + x;
        if (
          domains[i] !== event.domain ||
          !glazePathClear(
            nativeDomains,
            w,
            ...coord(event.y * n + event.x),
            ...coord(i),
            event.domain,
          )
        )
          continue;
        const weight = Math.exp(-(dx * dx + dy * dy) / (radius * radius));
        if (weight < 0.008) continue;
        weights.push(i, weight);
        total += weight;
      }
    for (let k = 0; k < weights.length; k += 2)
      event.deposits.push(weights[k], (event.mass * weights[k + 1]) / total);
    event.burst = event.born + event.life;
  }
  return {
    n,
    w,
    ids,
    domains,
    nativeDomains,
    active,
    adj,
    flow,
    events,
    remaining,
  };
}
function coolOilSpots(plan, strength, { transport = 1 } = {}) {
  const { n, active, adj, flow, events } = plan,
    crystals = new Float64Array(n * n),
    age = new Float64Array(n * n);
  let liquid = new Float64Array(n * n),
    next = new Float64Array(n * n);
  const onset = 50 - strength * 34;
  for (let tick = 0; tick < 72; tick++) {
    for (const event of events)
      if (event.burst === tick)
        for (let k = 0; k < event.deposits.length; k += 2)
          liquid[event.deposits[k]] += event.deposits[k + 1];
    const hot = Math.max(0, 1 - Math.max(0, tick - onset) / (71 - onset)),
      solubility = 0.025 + hot * 1.7;
    next.fill(0);
    for (const i of active) {
      const mass = liquid[i],
        vx = flow[i * 2] * hot * transport,
        vy = flow[i * 2 + 1] * hot * transport,
        fx = Math.abs(vx),
        fy = Math.abs(vy);
      next[i] += mass * (1 - fx - fy);
      next[adj[i * 4 + (vx < 0 ? 0 : 1)]] += mass * fx;
      next[adj[i * 4 + (vy < 0 ? 2 : 3)]] += mass * fy;
    }
    [liquid, next] = [next, liquid];
    for (const i of active) {
      const amount =
        Math.max(0, liquid[i] - solubility) * (0.12 + 0.6 * (1 - hot));
      liquid[i] -= amount;
      crystals[i] += amount;
      age[i] += (amount * tick) / 71;
    }
  }
  return { ...plan, b: crystals, liquid, age, pathSafe: true };
}
function oilSpotGlaze(p, f) {
  const plan = f.prepare("oil-bubbles", () => oilBubblePlan(f)),
    field = f.prepare("oil-cooling:" + f.intensity, () =>
      coolOilSpots(plan, f.intensity),
    ),
    ageSample = { values: field.age, value: 0 };
  let [lx, ly, lz] = f.reliefLight;
  const len = Math.hypot(lx, ly, lz) || 1;
  lx /= len;
  ly /= len;
  lz /= len;
  const hl = Math.hypot(lx, ly, lz + 1) || 1,
    hx = lx / hl,
    hy = ly / hl,
    hz = (lz + 1) / hl;
  p.loadPixels();
  for (let y = 0; y < f.w; y++)
    for (let x = 0; x < f.w; x++) {
      const i = (y * f.w + x) * 4,
        id = f.ID(x, y);
      if (id <= 1) {
        for (let c = 0; c < 3; c++) p.pixels[i + c] = [233, 229, 214][c];
        p.pixels[i + 3] = 255;
        continue;
      }
      const concentration = sampleColony(field, x, y, id, f.w, ageSample),
        t = f.clamp((concentration - 0.13) * 1.45),
        coverage = t * t * (3 - 2 * t),
        light = f.L(x, y),
        nx = f.N(x, y, 0) * 2 - 1,
        ny = 1 - f.N(x, y, 1) * 2,
        nz = f.N(x, y, 2) * 2 - 1,
        nl = Math.hypot(nx, ny, nz) || 1,
        half = Math.max(0, (nx * hx + ny * hy + nz * hz) / nl),
        gloss = Math.pow(half, 35) * 95,
        metal = 0.5 + light * 0.48 + Math.pow(half, 7) * 0.5,
        grain = 0.985 + 0.015 * Math.cos(x * 3.1 + y * 1.13),
        deposited = concentration > 1e-8 ? ageSample.value / concentration : 0,
        bronze = f.clamp((deposited - 0.53) * 1.3);
      for (let c = 0; c < 3; c++) {
        const base =
            [12, 19, 22][c] +
            light * light * 20 +
            Math.max(0, (nx * lx + ny * ly + nz * lz) / nl) * 30 +
            gloss,
          mineral =
            ([182, 192, 190][c] * (1 - bronze) + [190, 153, 106][c] * bronze) *
            metal *
            grain;
        p.pixels[i + c] = f.clamp(
          base * (1 - coverage) + mineral * coverage,
          0,
          255,
        );
      }
      p.pixels[i + 3] = 255;
    }
  p.updatePixels();
}

function partialSilver(f) {
  const first = new Float32Array(f.w * f.w);
  for (let y = 0; y < f.w; y++)
    for (let x = 0; x < f.w; x++) {
      const exposure = f.clamp(
        1 - f.L(x, y) + (f.rnd(x, y, 211) - 0.5) * 0.009,
      );
      first[y * f.w + x] = 1 - Math.exp(-exposure * 1.8);
    }
  return { first, inhibitor: blurLightField(first, f.w, 1, 3) };
}
// Shielding plus the redistributed first-development field is a deliberately
// stylized darkroom model. This is not a calibrated chemical kinetics equation.
function secondExposure(first, inhibitor, flash, coupling = 9) {
  const effective =
    flash * Math.exp(-4 * first - coupling * (inhibitor - first));
  return first + (1 - first) * (1 - Math.exp(-effective));
}
function solarizedPrint(p, f) {
  const { first, inhibitor } = f.prepare("sabattier", () => partialSilver(f)),
    flash = f.intensity * 2.4;
  // Fixed theoretical tonal calibration, independent of each frame's histogram.
  let white = 1;
  for (let i = 0; i <= 512; i++)
    white = Math.min(white, secondExposure(i / 512, i / 512, flash));
  p.loadPixels();
  for (let i = 0; i < first.length; i++) {
    const density = secondExposure(first[i], inhibitor[i], flash),
      reflectance = Math.pow(f.clamp((1 - density) / (1 - white)), 1.22);
    for (let c = 0; c < 3; c++)
      p.pixels[i * 4 + c] =
        [16, 23, 25][c] + ([241, 239, 229][c] - [16, 23, 25][c]) * reflectance;
    p.pixels[i * 4 + 3] = 255;
  }
  p.updatePixels();
}

function reliefGraph(f) {
  const w = f.w,
    n = Math.min(180, w),
    scale = w / n,
    nativeMask = new Uint32Array(w * w),
    nativeIds = new Uint8Array(w * w),
    ids = new Uint8Array(n * n),
    node = new Int32Array(n * n).fill(-1),
    depth = new Float64Array(n * n),
    active = [];
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      nativeIds[i] = f.ID(x, y);
      nativeMask[i] = nativeIds[i] > 1 ? 1 : 0;
    }
  const coord = (i) => [
    Math.round(((i % n) + 0.5) * scale - 0.5),
    Math.round((Math.floor(i / n) + 0.5) * scale - 0.5),
  ];
  for (let i = 0; i < n * n; i++) {
    const [x, y] = coord(i);
    ids[i] = f.ID(x, y);
    depth[i] = f.distance(x, y);
    if (ids[i] > 1) {
      node[i] = active.length;
      active.push(i);
    }
  }
  const neighbors = new Int32Array(active.length * 4).fill(-1),
    gradient = new Float64Array(active.length * 4),
    kind = new Uint8Array(active.length * 4),
    dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
  for (let a = 0; a < active.length; a++) {
    const i = active[a],
      x = i % n,
      y = Math.floor(i / n);
    for (let k = 0; k < 4; k++) {
      const [dx, dy] = dirs[k],
        xx = x + dx,
        yy = y + dy,
        j = yy * n + xx,
        at = a * 4 + k;
      if (
        xx < 0 ||
        yy < 0 ||
        xx >= n ||
        yy >= n ||
        node[j] < 0 ||
        !glazePathClear(nativeMask, w, ...coord(i), ...coord(j), 1)
      ) {
        kind[at] = 2;
        continue;
      }
      neighbors[at] = node[j];
      gradient[at] = depth[i] - depth[j];
      if (Math.abs(gradient[at]) > 0.18) {
        const [ax, ay] = coord(i),
          [bx, by] = coord(j),
          steps = Math.max(1, Math.max(Math.abs(bx - ax), Math.abs(by - ay)));
        let prior = depth[i],
          largest = 0;
        for (let step = 1; step <= steps; step++) {
          const next = f.distance(
            ax + ((bx - ax) * step) / steps,
            ay + ((by - ay) * step) / steps,
          );
          largest = Math.max(largest, Math.abs(next - prior));
          prior = next;
        }
        if (largest > (0.18 * 720) / w) kind[at] = 1;
      }
    }
  }
  return {
    w,
    n,
    scale,
    nativeMask,
    nativeIds,
    ids,
    node,
    active,
    neighbors,
    gradient,
    kind,
  };
}
function reconstructRelief(
  graph,
  compression,
  { limit = 240, tolerance = 1e-5 } = {},
) {
  const { active, neighbors, gradient, kind } = graph,
    count = active.length,
    x = new Float64Array(count),
    rhs = new Float64Array(count),
    r = new Float64Array(count),
    p = new Float64Array(count),
    ap = new Float64Array(count),
    alpha = 4 + compression * 160,
    jump = 0.018;
  for (let i = 0; i < count; i++)
    for (let k = 0; k < 4; k++) {
      const at = i * 4 + k,
        g = gradient[at];
      rhs[i] +=
        kind[at] === 2
          ? jump
          : kind[at] === 1
            ? -Math.sign(g) * jump
            : (-Math.sign(g) * Math.log1p(alpha * Math.abs(g))) / alpha;
    }
  const apply = (v, out) => {
    for (let i = 0; i < count; i++) {
      let sum = 4 * v[i];
      for (let k = 0; k < 4; k++) {
        const j = neighbors[i * 4 + k];
        if (j >= 0) sum -= v[j];
      }
      out[i] = sum;
    }
  };
  r.set(rhs);
  p.set(r);
  let rr = 0;
  for (const v of r) rr += v * v;
  const initial = rr;
  let iterations = 0;
  for (
    ;
    iterations < limit && rr > initial * tolerance * tolerance && rr > 1e-25;
    iterations++
  ) {
    apply(p, ap);
    let pap = 0;
    for (let i = 0; i < count; i++) pap += p[i] * ap[i];
    if (pap <= 0) break;
    const step = rr / pap;
    let next = 0;
    for (let i = 0; i < count; i++) {
      x[i] += step * p[i];
      r[i] -= step * ap[i];
      next += r[i] * r[i];
    }
    const beta = next / rr;
    for (let i = 0; i < count; i++) p[i] = r[i] + beta * p[i];
    rr = next;
  }
  const slopes = new Float64Array(count * 2);
  for (let i = 0; i < count; i++) {
    const read = (k) =>
      neighbors[i * 4 + k] >= 0 ? x[neighbors[i * 4 + k]] : 0;
    slopes[i * 2] = (read(0) - read(1)) / (2 * graph.scale);
    slopes[i * 2 + 1] = (read(2) - read(3)) / (2 * graph.scale);
  }
  return {
    ...graph,
    height: x,
    slopes,
    iterations,
    residual: initial ? Math.sqrt(rr / initial) : 0,
    converged: rr <= initial * tolerance * tolerance || rr <= 1e-25,
    rhs,
  };
}
function reliefHeight(field, x, y, out = null) {
  const { w, n, node, height, slopes, ids, nativeIds, nativeMask } = field;
  if (out) out.fill(0);
  if (x < 0 || y < 0 || x >= w || y >= w) return 0;
  const id = nativeIds[Math.round(y) * w + Math.round(x)];
  if (id <= 1) return 0;
  const gx = ((x + 0.5) * n) / w - 0.5,
    gy = ((y + 0.5) * n) / w - 0.5,
    x0 = Math.floor(gx),
    y0 = Math.floor(gy),
    tx = gx - x0,
    ty = gy - y0;
  let value = 0,
    total = 0,
    sx = 0,
    sy = 0;
  for (let dy = 0; dy < 2; dy++)
    for (let dx = 0; dx < 2; dx++) {
      const xx = Math.max(0, Math.min(n - 1, x0 + dx)),
        yy = Math.max(0, Math.min(n - 1, y0 + dy)),
        i = yy * n + xx;
      if (ids[i] !== id || node[i] < 0) continue;
      const cx = Math.round(((xx + 0.5) * w) / n - 0.5),
        cy = Math.round(((yy + 0.5) * w) / n - 0.5);
      if (!glazePathClear(nativeMask, w, x, y, cx, cy, 1)) continue;
      const weight = (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty),
        j = node[i];
      value += height[j] * weight;
      sx += slopes[j * 2] * weight;
      sy += slopes[j * 2 + 1] * weight;
      total += weight;
    }
  if (out && total) {
    out[0] = sx / total;
    out[1] = sy / total;
  }
  return total ? value / total : 0.018;
}
function schiacciato(p, f) {
  const graph = f.prepare("relief-graph", () => reliefGraph(f)),
    field = f.prepare("relief-height:" + f.intensity, () =>
      reconstructRelief(graph, f.intensity),
    ),
    w = f.w,
    slope = [0, 0],
    heights = new Float32Array(w * w),
    smoothX = new Float32Array(w * w),
    smoothY = new Float32Array(w * w);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      heights[i] = reliefHeight(field, x, y, slope);
      smoothX[i] = slope[0];
      smoothY[i] = slope[1];
    }
  let [lx, ly, lz] = f.reliefLight;
  const length = Math.hypot(lx, ly, lz) || 1;
  lx /= length;
  ly /= length;
  lz /= length;
  const half = Math.hypot(lx, ly, lz + 1) || 1,
    hx = lx / half,
    hy = ly / half,
    hz = (lz + 1) / half;
  p.loadPixels();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        left = y * w + Math.max(0, x - 1),
        right = y * w + Math.min(w - 1, x + 1),
        up = Math.max(0, y - 1) * w + x,
        down = Math.min(w - 1, y + 1) * w + x,
        id = graph.nativeIds[i],
        boundary = [left, right, up, down].some(
          (j) => graph.nativeIds[j] !== id,
        ),
        nx = boundary ? (heights[left] - heights[right]) * 38 : smoothX[i] * 76,
        ny = boundary ? (heights[up] - heights[down]) * 38 : smoothY[i] * 76,
        nl = Math.hypot(nx, ny, 1),
        diffuse = Math.max(0, (nx * lx + ny * ly + lz) / nl),
        shine = Math.pow(Math.max(0, (nx * hx + ny * hy + hz) / nl), 40) * 11,
        grain = (f.rnd(x, y, 230) - 0.5) * 1.8;
      for (let c = 0; c < 3; c++)
        p.pixels[i * 4 + c] = f.clamp(
          [230, 223, 204][c] * (0.58 + diffuse * 0.45) + shine + grain,
          0,
          255,
        );
      p.pixels[i * 4 + 3] = 255;
    }
  p.updatePixels();
}

function interlaceField(f) {
  const n = Math.min(145, f.w),
    scale = (f.w - 1) / Math.max(1, n - 1),
    x = new Float32Array(n * n),
    y = new Float32Array(n * n);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const px = i * scale,
        py = j * scale,
        at = j * n + i;
      if (f.ID(px, py) <= 1) continue;
      x[at] = (f.N(px, py, 0) * 2 - 1) * 18;
      y[at] = (1 - f.N(px, py, 1) * 2) * 18;
    }
  const dx = blurLightField(x, n, 2, 2),
    dy = blurLightField(y, n, 2, 2);
  let bound = 0;
  for (let j = 0; j < n - 1; j++)
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i,
        b = a + 1,
        c = a + n,
        d = c + 1;
      for (const field of [dx, dy])
        bound = Math.max(
          bound,
          (Math.max(
            Math.abs(field[b] - field[a]),
            Math.abs(field[d] - field[c]),
          ) +
            Math.max(
              Math.abs(field[c] - field[a]),
              Math.abs(field[d] - field[b]),
            )) /
            scale,
        );
    }
  const gain = bound > 0.55 ? 0.55 / bound : 1;
  for (let i = 0; i < dx.length; i++) {
    dx[i] *= gain;
    dy[i] *= gain;
  }
  return { n, w: f.w, scale, dx, dy, bound: bound * gain };
}
function sampleInterlace(field, u, v, strength, out, derivatives = false) {
  const { n, w, scale, dx, dy } = field;
  if (n === 1) {
    out[0] = dx[0] * strength;
    out[1] = dy[0] * strength;
    if (derivatives) for (let k = 2; k < 6; k++) out[k] = 0;
    return;
  }
  const gx = Math.max(0, Math.min(n - 1, u / scale)),
    gy = Math.max(0, Math.min(n - 1, v / scale)),
    x = Math.min(n - 2, Math.floor(gx)),
    y = Math.min(n - 2, Math.floor(gy)),
    tx = gx - x,
    ty = gy - y,
    a = y * n + x,
    b = a + 1,
    c = a + n,
    d = c + 1;
  for (let k = 0; k < 2; k++) {
    const f = k ? dy : dx;
    out[k] =
      ((f[a] * (1 - tx) + f[b] * tx) * (1 - ty) +
        (f[c] * (1 - tx) + f[d] * tx) * ty) *
      strength;
    if (derivatives) {
      out[2 + k * 2] =
        u >= 0 && u <= w - 1
          ? (((f[b] - f[a]) * (1 - ty) + (f[d] - f[c]) * ty) * strength) / scale
          : 0;
      out[3 + k * 2] =
        v >= 0 && v <= w - 1
          ? (((f[c] - f[a]) * (1 - tx) + (f[d] - f[b]) * tx) * strength) / scale
          : 0;
    }
  }
}
function inverseInterlace(field, x, y, strength, out, scratch) {
  let u = x,
    v = y,
    iterations = 0;
  for (; iterations < 20; iterations++) {
    sampleInterlace(field, u, v, strength, scratch);
    const nextU = x - scratch[0],
      nextV = y - scratch[1],
      change = Math.max(Math.abs(nextU - u), Math.abs(nextV - v));
    u = nextU;
    v = nextV;
    if (change < 0.0001) break;
  }
  out[0] = u;
  out[1] = v;
  return Math.min(iterations + 1, 20);
}
function opticalInterlace(p, f) {
  const field = f.prepare("interlace", () => interlaceField(f)),
    pitch = 12,
    phaseX = f.rnd(1, 1, 241) * pitch,
    phaseY = f.rnd(2, 1, 241) * pitch,
    uv = [0, 0],
    map = new Float64Array(6),
    warp = new Float64Array(5),
    weft = new Float64Array(5);
  let [lx, ly, lz] = f.reliefLight;
  const ll = Math.hypot(lx, ly, lz) || 1;
  lx /= ll;
  ly /= ll;
  lz /= ll;
  const hl = Math.hypot(lx, ly, lz + 1) || 1,
    hx = lx / hl,
    hy = ly / hl,
    hz = (lz + 1) / hl;
  const strand = (across, width, along, parity, isWarp, out) => {
    const alpha = f.clamp(width - Math.abs(across) + 0.5);
    out[4] = alpha;
    if (!alpha) return;
    const q = f.clamp(across / width, -0.9999, 0.9999),
      round = Math.sqrt(1 - q * q),
      axial = Math.PI * (along / pitch + parity),
      sign = isWarp ? 1 : -1,
      amplitude = pitch * 0.18;
    out[0] = 4 + sign * amplitude * Math.cos(axial) + width * 0.75 * round;
    const cross = (-0.75 * q) / round,
      long = ((-sign * amplitude * Math.PI) / pitch) * Math.sin(axial),
      du = isWarp ? cross : long,
      dv = isWarp ? long : cross,
      a = 1 + map[2],
      b = map[3],
      c = map[4],
      d = 1 + map[5],
      det = a * d - b * c,
      nx = -(du * d - dv * c) / det,
      ny = -(-du * b + dv * a) / det,
      nl = Math.hypot(nx, ny, 1),
      diffuse = Math.max(0, (nx * lx + ny * ly + lz) / nl),
      shine = Math.pow(Math.max(0, (nx * hx + ny * hy + hz) / nl), 18) * 17,
      base = isWarp ? [27, 44, 43] : [211, 203, 178];
    for (let k = 0; k < 3; k++)
      out[k + 1] = base[k] * (0.66 + diffuse * 0.47) + shine;
  };
  p.loadPixels();
  for (let y = 0; y < f.w; y++)
    for (let x = 0; x < f.w; x++) {
      inverseInterlace(field, x, y, f.intensity, uv, map);
      sampleInterlace(field, uv[0], uv[1], f.intensity, map, true);
      const u = uv[0] + phaseX,
        v = uv[1] + phaseY,
        i = Math.round(u / pitch),
        j = Math.round(v / pitch),
        dark = f.D(x, y),
        wu = (0.1 + dark * 0.26) * pitch,
        wv = 0.18 * pitch;
      strand(u - i * pitch, wu, v, i, true, warp);
      strand(v - j * pitch, wv, u, j, false, weft);
      const front = warp[4] && (!weft[4] || warp[0] >= weft[0]) ? warp : weft,
        back = front === warp ? weft : warp,
        grain = (f.rnd(x, y, 244) - 0.5) * 1.1,
        at = (y * f.w + x) * 4;
      for (let k = 0; k < 3; k++) {
        let value = [239, 235, 218][k] + grain;
        if (back[4]) value = value * (1 - back[4]) + back[k + 1] * back[4];
        if (front[4]) value = value * (1 - front[4]) + front[k + 1] * front[4];
        p.pixels[at + k] = f.clamp(value, 0, 255);
      }
      p.pixels[at + 3] = 255;
    }
  p.updatePixels();
}

// Only actual open upper rims can expose the ceramic body. A screen silhouette
// by itself is not a rim, and hidden rim segments do not paint through objects.
function ceramicRims(f) {
  const segments = f.openBoundaries(),
    mask = new Float32Array(f.w * f.w),
    w = f.w;
  for (let i = 0; i < segments.length; i += 9) {
    const [x, y, z, u, v, zz, id, upper, key] = segments.subarray(i, i + 9);
    if (upper < 0.9 || z <= 0 || zz <= 0) continue;
    const dx = u - x,
      dy = v - y,
      length = dx * dx + dy * dy;
    if (length < 1e-10) continue;
    const strength = 0.48 + 0.2 * f.rnd(key, id, 260);
    for (
      let py = Math.max(0, Math.floor(Math.min(y, v) - 2));
      py <= Math.min(w - 1, Math.ceil(Math.max(y, v) + 2));
      py++
    )
      for (
        let px = Math.max(0, Math.floor(Math.min(x, u) - 2));
        px <= Math.min(w - 1, Math.ceil(Math.max(x, u) + 2));
        px++
      ) {
        if (f.ID(px, py) !== id) continue;
        const t = f.clamp(((px - x) * dx + (py - y) * dy) / length),
          distance = (px - x - dx * t) ** 2 + (py - y - dy * t) ** 2,
          depth = f.interpolateDepth ? f.interpolateDepth(z, zz, t) : z + (zz - z) * t;
        if (depth > f.distance(px, py) + 0.035) continue;
        const at = py * w + px;
        mask[at] = Math.max(mask[at], Math.exp(-distance / 1.2) * strength);
      }
  }
  return mask;
}

function surfaceBlocks(p, f) {
  paper(p, f, "#eeecdf");
  const faces = f.voxelFaces(
    Math.round((0.18 - f.intensity * 0.1) * 1000) / 1000,
  );
  let [lx, ly, lz] = f.reliefLight;
  const length = Math.hypot(lx, ly, lz) || 1;
  lx /= length;
  ly /= length;
  lz /= length;
  p.strokeWeight(0.45);
  for (let i = 0; i < faces.length; i += 16) {
    const color = f.materialColor(faces[i + 11]),
      diffuse = Math.max(
        0,
        faces[i + 8] * lx + faces[i + 9] * ly + faces[i + 10] * lz,
      ),
      grain =
        0.98 + f.rnd(faces[i + 13], faces[i + 14], faces[i + 15] + 271) * 0.04,
      gain = (0.58 + diffuse * 0.48) * grain;
    p.fill(...color.map((v) => f.clamp(v * gain, 0, 255)));
    p.stroke(...color.map((v) => f.clamp(v * gain * 0.84, 0, 255)));
    p.beginShape();
    const polygon = faces.polygons?.[i / 16];
    if (polygon) {
      for (const vertex of polygon)
        p.vertex(vertex[0], vertex[1]);
    } else {
      for (let k = 0; k < 4; k++)
        p.vertex(faces[i + k * 2], faces[i + k * 2 + 1]);
    }
    p.endShape(p.CLOSE);
  }
}

function spectralCoating(p, f) {
  const w = f.w,
    lut = filmLut(),
    offsets = f.prepare("spectral-thickness", () => {
      const values = new Float32Array(w * w);
      for (let y = 0; y < w; y++)
        for (let x = 0; x < w; x++)
          if (f.ID(x, y) > 1)
            values[y * w + x] = thicknessOffset(f.worldPosition(x, y), f.seed);
      return values;
    }),
    lights = f.spectralLights.map((light) => {
      const len = Math.hypot(...light.direction) || 1,
        direction = light.direction.map((v) => v / len),
        half = [direction[0], direction[1], direction[2] + 1],
        hl = Math.hypot(...half) || 1;
      return { ...light, direction, half: half.map((v) => v / hl) };
    }),
    hemi = f.spectralHemisphere,
    environment = [0, 0, 0],
    direct = [0, 0, 0],
    alpha = 0.23,
    alpha2 = alpha ** 2;
  const linear = (value) => {
      const s = value / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    },
    g1 = (n) => (2 * n) / (n + Math.sqrt(alpha2 + (1 - alpha2) * n * n));
  p.loadPixels();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        at = i * 4;
      if (f.ID(x, y) <= 1) {
        for (let c = 0; c < 4; c++) p.pixels[at + c] = f.color[at + c];
        continue;
      }
      let nx = f.N(x, y, 0) * 2 - 1,
        ny = 1 - f.N(x, y, 1) * 2,
        nz = f.N(x, y, 2) * 2 - 1;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const nv = Math.max(0.0001, nz),
        thickness = f.clamp(
          baseThickness(f.intensity) + offsets[i],
          0,
          lut.maxThickness,
        ),
        rx = 2 * nx * nv,
        ry = 2 * ny * nv,
        rz = 2 * nz * nv - 1,
        sky = f.clamp(
          (rx * hemi.up[0] + ry * hemi.up[1] + rz * hemi.up[2]) * 0.5 + 0.5,
        ),
        diffuseSky = f.clamp(
          (nx * hemi.up[0] + ny * hemi.up[1] + nz * hemi.up[2]) * 0.5 + 0.5,
        ),
        base = f.B(x, y),
        radiance = [0, 0, 0];
      sampleFilm(lut, thickness, nv, environment);
      for (let c = 0; c < 3; c++)
        radiance[c] =
          environment[c] *
            (hemi.ground[c] * (1 - sky) + hemi.sky[c] * sky) *
            hemi.intensity *
            0.55 +
          0.045 *
            linear(base[c]) *
            (1 - f.clamp(environment[c])) *
            (hemi.ground[c] * (1 - diffuseSky) + hemi.sky[c] * diffuseSky) *
            hemi.intensity;
      for (const light of lights) {
        const nlight = Math.max(
          0,
          nx * light.direction[0] +
            ny * light.direction[1] +
            nz * light.direction[2],
        );
        if (!nlight) continue;
        const nh = Math.max(
            0,
            nx * light.half[0] + ny * light.half[1] + nz * light.half[2],
          ),
          den = nh * nh * (alpha2 - 1) + 1,
          distribution = alpha2 / (Math.PI * den * den),
          geometry = g1(nv) * g1(nlight),
          specular = (distribution * geometry) / (4 * nv);
        // Orthographic V=(0,0,1): every directional light has its own constant V·H.
        sampleFilm(lut, thickness, light.half[2], direct);
        for (let c = 0; c < 3; c++)
          radiance[c] +=
            light.color[c] *
            light.intensity *
            (direct[c] * specular +
              (0.045 * linear(base[c]) * (1 - f.clamp(direct[c])) * nlight) /
                Math.PI);
      }
      for (let c = 0; c < 3; c++)
        p.pixels[at + c] = linearToDisplay(radiance[c]);
      p.pixels[at + 3] = 255;
    }
  p.updatePixels();
}
