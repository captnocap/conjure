import * as THREE from 'three';
import type { ChoiceQuestion, QuestionSet } from '@conjure/kit';
import { PAINTS, PAINT_NAMES, type PaintName, choice } from '@conjure/kit';

/**
 * Colour the idea asks for, inside anything. Every cast thing and every world hears the same few
 * colour questions with its own details, and the engine repaints what was built, so "a red piano"
 * or "a pink city at night" works for components that never asked about colour themselves.
 * Surfaces are grouped by colour and ranked by how much of the object they cover: the main colour
 * repaints the largest group, the trim colour the rest. Shading within a group is kept.
 */
const AS_MADE = 'as-made';
type Answer = PaintName | typeof AS_MADE;

const LIGHTS: readonly PaintName[] = PAINT_NAMES.filter((name) => !('metal' in PAINTS[name]) && !['black', 'charcoal', 'brown', 'olive', 'forest', 'navy', 'crimson', 'rust'].includes(name));
const SKIES: readonly PaintName[] = PAINT_NAMES.filter((name) => !('metal' in PAINTS[name]));

const ask = (question: string, keep: string, names: readonly PaintName[] = PAINT_NAMES): ChoiceQuestion<Answer> =>
  choice(question, { [AS_MADE]: keep, ...Object.fromEntries(names.map((name) => [name, PAINTS[name].says])) } as Record<Answer, string>);

/** The thing is named in its own questions, so a colour the idea gives one thing does not spill onto its neighbours. */
export const thingPaintQuestions = (title: string) => {
  const name = title.toLowerCase();
  return {
    paintBody: ask(
      `Does the idea itself give the ${name} a colour, or call for it to be coloured unlike its usual make? A colour the idea gives to something else does not count. If so, which colour should its main surfaces be?`,
      `Keep the ${name} in the colours it is made in: the idea names no colour for it, or names colours only for other things.`,
    ),
    paintTrim: ask(
      `If the idea gives the ${name} itself a second colour, for its smaller parts and trim, which?`,
      `Keep the ${name}\u2019s smaller parts as made: no second colour is given to it.`,
    ),
  } satisfies QuestionSet;
};

export const WORLD_PAINT_QUESTIONS = {
  paintBody: ask(
    'Does the idea name a colour for the stuff the place is built from (a pink city, a whitewashed village, a red-brick street, a black marble hall)? Colours the idea gives to things in the scene, and weather, light, time of day and mood, do not count: a red car or a grey morning leaves the place as made. If so, which colour should its walls, buildings and ground be?',
    'Keep the setting as made: the idea names no colour for the place itself.',
  ),
  paintTrim: ask(
    'If the idea names a second colour for the place\u2019s own details and trim (painted shutters, gold domes, neon signs), which? Colours given to things in the scene, weather, light and mood do not count.',
    'Keep the setting\u2019s details as made.',
  ),
  paintLight: ask(
    'Is the light itself coloured by the idea (neon, a red sunset, a green aurora, a blue screen glow, a grey overcast)? If so, what colour?',
    'Ordinary light: leave its colour to the time of day and the warmth already chosen.',
    LIGHTS,
  ),
  paintSky: ask(
    'Does the idea call for the sky or backdrop behind everything to be a particular colour (a grey overcast, a violet dusk, a black void)? If so, which?',
    'Keep the setting\u2019s own sky or backdrop.',
    SKIES,
  ),
} satisfies QuestionSet;

/** Colour answers are drawn cooler than details: a stray few percent on "magenta" should not repaint a piano. */
export const PAINT_COOLING = 0.35;

export interface Paint {
  body?: PaintName;
  trim?: PaintName;
  light?: PaintName;
  sky?: PaintName;
}

export const paintQuestionsFor = (entry: { kind: string; title: string }): QuestionSet =>
  entry.kind === 'world' ? WORLD_PAINT_QUESTIONS : entry.kind === 'thing' ? thingPaintQuestions(entry.title) : {};

export function paintOf(answers: Record<string, string | number | boolean>): Paint | undefined {
  const named = (value: unknown) => (typeof value === 'string' && value in PAINTS ? (value as PaintName) : undefined);
  const paint: Paint = { body: named(answers.paintBody), trim: named(answers.paintTrim), light: named(answers.paintLight), sky: named(answers.paintSky) };
  // A second colour only means something beside a first: alone it is usually another thing's colour heard here.
  if (!paint.body) delete paint.trim;
  for (const key of Object.keys(paint) as (keyof Paint)[]) if (!paint[key]) delete paint[key];
  return Object.keys(paint).length ? paint : undefined;
}

type Coloured = THREE.Material & { color: THREE.Color; emissive?: THREE.Color; emissiveIntensity?: number; metalness?: number; roughness?: number; map?: THREE.Texture | null; vertexColors?: boolean; opacity: number; transparent: boolean };
const isColoured = (material: THREE.Material): material is Coloured => (material as Partial<Coloured>).color instanceof THREE.Color;

export interface Surface {
  /** The mesh slot holding it, so a clone can be put back in its place. */
  mesh: THREE.Mesh;
  slot: number | null;
  material: Coloured;
  /** Per-vertex or per-instance colours that carry the visible colour. */
  attribute: { owner: 'geometry' | 'instance'; colors: THREE.BufferAttribute } | null;
  mean: THREE.Color;
  weight: number;
}

const tmp = new THREE.Color();
const SRGB = THREE.SRGBColorSpace;
const hsl = { h: 0, s: 0, l: 0 };

function meanOf(colors: THREE.BufferAttribute, base: THREE.Color): THREE.Color {
  const sum = new THREE.Color(0, 0, 0);
  const step = Math.max(1, Math.floor(colors.count / 512));
  let n = 0;
  for (let index = 0; index < colors.count; index += step, n++) sum.r += colors.getX(index), sum.g += colors.getY(index), sum.b += colors.getZ(index);
  return n ? sum.multiplyScalar(1 / n).multiply(base) : base.clone();
}

const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
const ab = new THREE.Vector3(), ac = new THREE.Vector3();

/** True surface area of a mesh in its world size, sampled on big meshes, times its instances. */
function weightOf(mesh: THREE.Mesh): number {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!position) return 0;
  const index = geometry.getIndex();
  const triangles = Math.floor((index ? index.count : position.count) / 3);
  const step = Math.max(1, Math.floor(triangles / 4000));
  const scale = new THREE.Vector3();
  mesh.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
  scale.set(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z));
  let area = 0;
  for (let triangle = 0; triangle < triangles; triangle += step) {
    for (let corner = 0; corner < 3; corner++) {
      const at = triangle * 3 + corner;
      corners[corner].fromBufferAttribute(position, index ? index.getX(at) : at).multiply(scale);
    }
    area += ab.subVectors(corners[1], corners[0]).cross(ac.subVectors(corners[2], corners[0])).length() / 2;
  }
  area *= step;
  const count = mesh instanceof THREE.InstancedMesh ? mesh.count : 1;
  const groups = Array.isArray(mesh.material) ? Math.max(1, mesh.material.length) : 1;
  return (Number.isFinite(area) ? area : 0) * count / groups;
}

/**
 * Every coloured, solid surface of an object, with its mean colour and how much of the object it
 * covers. Glass and veils are left out unless asked for: paint never recolours a window pane, but a
 * material may well say what the pane is made of.
 */
export function surfacesOf(root: THREE.Object3D, options: { glass?: boolean } = {}): Surface[] {
  root.updateMatrixWorld(true);
  const surfaces: Surface[] = [];
  const whole = new THREE.Box3().setFromObject(root);
  const height = Math.max(whole.max.y - whole.min.y, 1e-6);
  const box = new THREE.Box3();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    // A plinth, podium or footing is not what the eye calls the thing's colour: it counts for little.
    const base = box.setFromObject(mesh).max.y < whole.min.y + height * 0.12;
    const weight = weightOf(mesh) * (base ? 0.2 : 1);
    materials.forEach((material, index) => {
      if (!material || !isColoured(material)) return;
      // Glass and veils keep their colour: repainting a window pane reads as a mistake.
      if (!options.glass && material.transparent && material.opacity < 0.6) return;
      const instance = mesh instanceof THREE.InstancedMesh && mesh.instanceColor ? mesh.instanceColor : null;
      const vertex = material.vertexColors ? (mesh.geometry.getAttribute('color') as THREE.BufferAttribute | undefined) ?? null : null;
      const attribute = instance ? { owner: 'instance' as const, colors: instance } : vertex && vertex.itemSize >= 3 ? { owner: 'geometry' as const, colors: vertex } : null;
      const mean = attribute ? meanOf(attribute.colors, material.color) : material.color.clone();
      surfaces.push({ mesh, slot: Array.isArray(mesh.material) ? index : null, material, attribute, mean, weight });
    });
  });
  return surfaces;
}

/** Group surfaces by colour; the groups covering the most come first. */
function groupsOf(surfaces: Surface[]): Surface[][] {
  const groups: { colour: THREE.Color; weight: number; members: Surface[] }[] = [];
  const near = (a: THREE.Color, b: THREE.Color) => {
    const x = a.clone().convertLinearToSRGB(), y = b.clone().convertLinearToSRGB();
    return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b) < 0.14;
  };
  for (const surface of [...surfaces].sort((a, b) => b.weight - a.weight)) {
    const group = groups.find((candidate) => near(candidate.colour, surface.mean));
    if (group) group.members.push(surface), group.weight += surface.weight;
    else groups.push({ colour: surface.mean.clone(), weight: surface.weight, members: [surface] });
  }
  return groups.sort((a, b) => b.weight - a.weight).map((group) => group.members);
}

/** A colour moved onto a swatch, keeping some of its own lightness so shading and wear survive. */
function moved(original: THREE.Color, swatchHsl: typeof hsl, meanLightness: number, metal: boolean): THREE.Color {
  original.getHSL(hsl, SRGB);
  const lightness = THREE.MathUtils.clamp(swatchHsl.l + (hsl.l - meanLightness) * 0.55, 0.02, 0.97);
  // Neutral swatches stay neutral; colours keep a little of the original's dullness.
  const saturation = swatchHsl.s < 0.08 ? swatchHsl.s : swatchHsl.s * (0.75 + 0.25 * Math.min(1, hsl.s * 2 + 0.3));
  return tmp.setHSL(swatchHsl.h, metal ? Math.min(saturation, 0.6) : saturation, lightness, SRGB).clone();
}

/**
 * Which surfaces the eye calls the thing itself: the largest colour group and any close behind it,
 * up to about half of the object. Paint goes on the painted parts: a coloured group outranks bare
 * metal, rubber or stone of a similar size, so a red bicycle frame takes the colour rather than its
 * chrome spokes. All-neutral objects go by area. The rest is trim.
 */
export function bodyOf(surfaces: Surface[]): { body: Surface[]; trim: Surface[] } {
  const groups = groupsOf(surfaces);
  if (!groups.length) return { body: [], trim: [] };
  const total = groups.reduce((sum, group) => sum + group.reduce((part, surface) => part + surface.weight, 0), 0) || 1;
  const weightIn = (group: Surface[]) => group.reduce((sum, surface) => sum + surface.weight, 0);
  const painted = (group: Surface[]) => weightIn(group) * (0.35 + Math.min(0.65, group[0].mean.getHSL(hsl, SRGB).s));
  groups.sort((a, b) => painted(b) - painted(a));
  const body: Surface[][] = [groups[0]];
  let covered = weightIn(groups[0]);
  for (const group of groups.slice(1)) {
    const weight = weightIn(group);
    if (covered / total >= 0.5 || weight / total < 0.12 || painted(group) < painted(groups[0]) * 0.5) break;
    body.push(group), covered += weight;
  }
  return { body: body.flat(), trim: groups.filter((group) => !body.includes(group)).flat() };
}

/**
 * Clone each surface's material once (shared materials get one clone for all their users here) and
 * put the clones in the meshes' slots, so a build can be dressed without touching materials that
 * builders and ateliers share between builds. `of` finds a surface's clone; `free` disposes them.
 */
export function cloneSurfaces(surfaces: Surface[]): { of(surface: Surface): Coloured; materials: Coloured[]; free(): void } {
  const clones = new Map<THREE.Material, Coloured>();
  const materials: Coloured[] = [];
  const of = (surface: Surface): Coloured => {
    let copy = clones.get(surface.material);
    if (!copy) clones.set(surface.material, (copy = surface.material.clone() as Coloured)), materials.push(copy);
    if (surface.slot === null) surface.mesh.material = copy;
    else (surface.mesh.material as THREE.Material[])[surface.slot] = copy;
    return copy;
  };
  for (const surface of surfaces) of(surface);
  return { of, materials, free: () => { for (const material of materials) material.dispose(); } };
}

/**
 * Repaint an object's surfaces in place: the body takes `body`, the rest `trim`. Materials, vertex
 * and instance colours are cloned first, because builders and ateliers may share them between
 * builds. Returns what to free when the object goes.
 */
export function repaint(root: THREE.Object3D, paint: Pick<Paint, 'body' | 'trim'>): () => void {
  if (!paint.body && !paint.trim) return () => undefined;
  const { body, trim } = bodyOf(surfacesOf(root));
  if (!body.length) return () => undefined;
  const geometries: THREE.BufferGeometry[] = [];
  const clones = cloneSurfaces([...body, ...trim]);
  const apply = (flat: Surface[], name: PaintName | undefined) => {
    if (!name || !(name in PAINTS)) return;
    const swatchInfo = PAINTS[name];
    const swatch = new THREE.Color(swatchInfo.hex);
    const swatchHsl = { h: 0, s: 0, l: 0 };
    swatch.getHSL(swatchHsl, SRGB);
    const metal = 'metal' in swatchInfo;
    const meanLightness = flat.reduce((sum, surface) => sum + surface.mean.getHSL(hsl, SRGB).l * surface.weight, 0) / (flat.reduce((sum, surface) => sum + surface.weight, 0) || 1);
    const done = new Set<THREE.BufferAttribute>();
    for (const surface of flat) {
      const material = clones.of(surface);
      if (surface.attribute) {
        // The visible colour is the attribute times the material colour: move the attribute, whiten the material.
        if (!done.has(surface.attribute.colors)) {
          done.add(surface.attribute.colors);
          const colors = surface.attribute.colors.clone();
          const base = surface.material.color;
          for (let index = 0; index < colors.count; index++) {
            const colour = moved(new THREE.Color(colors.getX(index), colors.getY(index), colors.getZ(index)).multiply(base), swatchHsl, meanLightness, metal);
            colors.setXYZ(index, colour.r, colour.g, colour.b);
          }
          colors.needsUpdate = true;
          if (surface.attribute.owner === 'instance') (surface.mesh as THREE.InstancedMesh).instanceColor = colors as THREE.InstancedBufferAttribute;
          else {
            const geometry = surface.mesh.geometry.clone();
            geometry.setAttribute('color', colors);
            geometries.push(geometry);
            surface.mesh.geometry = geometry;
          }
        }
        material.color.setRGB(1, 1, 1);
      } else if (material.map) {
        // A printed or painted texture is tinted rather than replaced, so its pattern still shows.
        // The texture multiplies the tint, so a pale texture shows the swatch itself; a dark swatch keeps a little light for the pattern.
        material.color.copy(swatch).lerp(new THREE.Color(1, 1, 1), swatchHsl.l < 0.2 ? 0.15 : 0);
      } else {
        material.color.copy(moved(surface.material.color, swatchHsl, meanLightness, metal));
      }
      // Glowing parts glow in the new hue.
      if (material.emissive && material.emissive.getHSL(hsl, SRGB).l > 0.02 && swatchHsl.s > 0.08) {
        const glow = hsl.l;
        material.emissive.setHSL(swatchHsl.h, Math.max(swatchHsl.s, 0.6), glow, SRGB);
      }
      if (metal && typeof material.metalness === 'number') material.metalness = Math.max(material.metalness, 0.85), material.roughness = Math.min(material.roughness ?? 0.4, 0.38);
      material.needsUpdate = true;
    }
  };
  apply(body, paint.body);
  apply(trim, paint.trim);
  return () => {
    clones.free();
    for (const geometry of geometries) geometry.dispose();
  };
}

/** Colour a world's lights toward the named light, and its backdrop toward the named sky. */
export function relight(world: { object: THREE.Object3D; background: THREE.Color }, paint: Pick<Paint, 'light' | 'sky'>): THREE.Color {
  if (paint.light && paint.light in PAINTS) {
    const swatch = new THREE.Color(PAINTS[paint.light].hex);
    // Light carries hue without darkening: the swatch at full brightness.
    const glow = swatch.clone().multiplyScalar(1 / Math.max(swatch.r, swatch.g, swatch.b, 1e-3));
    world.object.traverse((object) => {
      const light = object as THREE.Light & { groundColor?: THREE.Color };
      if (!light.isLight) return;
      light.color.lerp(glow, light instanceof THREE.AmbientLight || light instanceof THREE.HemisphereLight ? 0.55 : 0.75);
      light.groundColor?.lerp(glow, 0.35);
    });
  }
  if (!paint.sky || !(paint.sky in PAINTS)) return world.background;
  const sky = new THREE.Color(PAINTS[paint.sky].hex);
  // Keep a trace of the world's own backdrop so a gradient or a night sky is tinted, not flattened.
  return world.background.clone().lerp(sky, 0.85);
}
