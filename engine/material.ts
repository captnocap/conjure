import * as THREE from 'three';
import type { ChoiceQuestion, MaterialName, MaterialSwatch, QuestionSet } from '@conjure/kit';
import { BACKDROP_MATERIALS, MATERIALS, MATERIAL_NAMES, choice, madeOf } from '@conjure/kit';
import { bodyOf, cloneSurfaces, surfacesOf } from './paint';
import { ATELIER_MATERIALS, isAtelierMaterial, type AtelierMaterialName } from '../kit/atelier-materials';
import { refinishAtelier } from './atelier-materials';

/**
 * What the idea says things are made of, inside anything. Every cast thing hears one material
 * question with its own details, every setting two (its stuff and its backdrop), and the engine
 * dresses what was built, so "a chrome skull", "a velvet armchair" or "a glitter void" works for
 * components that never asked about their surfaces. The capture then carries each surface's
 * material to the print.
 */
const AS_MADE = 'as-made';
type BodyMaterialName = MaterialName | AtelierMaterialName;
type Answer = BodyMaterialName | typeof AS_MADE;

const ask = (question: string, keep: string, names: readonly MaterialName[] = MATERIAL_NAMES): ChoiceQuestion<Answer> =>
  choice(question, {
    [AS_MADE]: keep,
    ...Object.fromEntries(names.map((name) => [name, MATERIALS[name].says])),
    ...(names === MATERIAL_NAMES ? Object.fromEntries(Object.entries(ATELIER_MATERIALS).map(([name, swatch]) => [name, swatch.says])) : {}),
  } as Record<Answer, string>);

/** The thing is named in its own question, so a material the idea gives one thing does not spill onto its neighbours. */
export const thingMaterialQuestions = (title: string) => {
  const name = title.toLowerCase();
  return {
    materialBody: ask(
      `Does the idea itself say what the ${name} is made of, or give it a finish unlike its usual make (a chrome skull, a velvet armchair, a glitter pumpkin, a glass horse, a wet dog)? A material the idea gives to something else does not count. If so, what are its main surfaces made of?`,
      `Keep the ${name} in the materials it is built from: the idea names no material or finish for it, or names them only for other things.`,
    ),
  } satisfies QuestionSet;
};

export const WORLD_MATERIAL_QUESTIONS = {
  materialBody: ask(
    'Does the idea say what the place itself is made of, or give its ground and walls a finish (a wet street after rain, a marble hall, a rubber floor, a chalk cliff, a velvet-lined box)? Things in the scene, and the weather, light and mood on their own, do not count: a chrome car or a gloomy day leaves the place as made. If so, what are its surfaces made of?',
    'Keep the setting as made: the idea names no material or finish for the place itself.',
  ),
  materialSky: ask(
    'Does the idea call for the sky or backdrop behind everything to be a material: a void of glitter and stars, a black velvet drape, a sheet of matte paper, a foil backdrop, a glowing screen? If so, which?',
    'Keep the setting’s own sky or backdrop.',
    BACKDROP_MATERIALS,
  ),
} satisfies QuestionSet;

/** Material answers are drawn cooler than details: a stray few percent on "glitter" should not sequin a teapot. */
export const MATERIAL_COOLING = 0.35;

export interface Material {
  body?: BodyMaterialName;
  sky?: MaterialName;
}

export const materialQuestionsFor = (entry: { kind: string; title: string }): QuestionSet =>
  entry.kind === 'world' ? WORLD_MATERIAL_QUESTIONS : entry.kind === 'thing' ? thingMaterialQuestions(entry.title) : {};

export function materialOf(answers: Record<string, string | number | boolean>): Material | undefined {
  const named = (value: unknown) => (typeof value === 'string' && Object.hasOwn(MATERIALS, value) ? (value as MaterialName) : undefined);
  const material: Material = { body: isAtelierMaterial(answers.materialBody) ? answers.materialBody : named(answers.materialBody), sky: named(answers.materialSky) };
  for (const key of Object.keys(material) as (keyof Material)[]) if (!material[key]) delete material[key];
  return Object.keys(material).length ? material : undefined;
}

/** Fine relief the live render catches the light with: sparkle for glitter, pebble grain for leather. Shared and never disposed. */
const reliefs = new Map<string, THREE.DataTexture>();
function reliefMap(kind: 'sparkle' | 'pebble'): THREE.DataTexture {
  let texture = reliefs.get(kind);
  if (texture) return texture;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  let state = kind === 'sparkle' ? 0x9e3779b9 : 0x7f4a7c15;
  const random = () => { state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) ^ (state >>> 12)) >>> 0; return state / 4294967296; };
  for (let at = 0; at < size * size; at++) {
    // Sparkle: facets tilted every which way. Pebble: gentle bumps, a few steeper creases.
    const tilt = kind === 'sparkle' ? 0.9 : 0.35 + (random() < 0.06 ? 0.4 : 0);
    const angle = random() * Math.PI * 2, lean = random() * tilt;
    const x = Math.sin(lean) * Math.cos(angle), y = Math.sin(lean) * Math.sin(angle), z = Math.cos(lean);
    data[at * 4] = Math.round((x * 0.5 + 0.5) * 255);
    data[at * 4 + 1] = Math.round((y * 0.5 + 0.5) * 255);
    data[at * 4 + 2] = Math.round((z * 0.5 + 0.5) * 255);
    data[at * 4 + 3] = 255;
  }
  texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'sparkle' ? 24 : 10, kind === 'sparkle' ? 24 : 10);
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  reliefs.set(kind, texture);
  return texture;
}

/**
 * Dress an object's surfaces in a material, in place: `body` goes on the main surfaces (the same
 * body the paint pass colours, or everything for a setting), tagging them for the capture and
 * setting their shine, transparency and glow to suit. Materials are cloned first, because builders
 * and ateliers may share them between builds. Returns what to free when the object goes.
 */
export function refinish(root: THREE.Object3D, material: Pick<Material, 'body'>, whole = false): () => void {
  if (!material.body) return () => undefined;
  if (isAtelierMaterial(material.body)) return refinishAtelier(root, material.body, whole);
  const surfaces = surfacesOf(root, { glass: true });
  const chosen = whole ? surfaces : bodyOf(surfaces).body;
  if (!chosen.length) return () => undefined;
  const swatch: MaterialSwatch = MATERIALS[material.body];
  const { materials, free } = cloneSurfaces(chosen);
  for (const copy of materials) {
    madeOf(copy, material.body);
    // A body that was glass and is now chrome, velvet or chalk is solid again.
    if (swatch.opacity === undefined && copy.transparent && copy.opacity < 0.6) copy.opacity = 1, copy.transparent = false;
    const standard = copy as THREE.MeshStandardMaterial;
    if (!standard.isMeshStandardMaterial) continue;
    if (swatch.relief) {
      standard.normalMap = reliefMap(swatch.relief);
      standard.normalScale.set(swatch.relief === 'sparkle' ? 1.4 : 0.6, swatch.relief === 'sparkle' ? 1.4 : 0.6);
    }
    // Mirrors and lacquers want something to reflect; velvet and chalk want none of it.
    standard.envMapIntensity = swatch.metalness > 0.5 || swatch.roughness < 0.15 ? 1.6 : swatch.roughness > 0.9 ? 0.2 : 0.8;
    const physical = copy as THREE.MeshPhysicalMaterial;
    if (physical.isMeshPhysicalMaterial) {
      physical.sheen = material.body === 'velvet' ? 1 : 0;
      physical.clearcoat = material.body === 'gloss' || material.body === 'wet' ? 1 : 0;
    }
    if (material.body === 'velvet' || material.body === 'rubber' || material.body === 'wet') standard.color.multiplyScalar(material.body === 'wet' ? 0.75 : 0.6);
    standard.needsUpdate = true;
  }
  return free;
}

/** The material in words, for the activity feed. */
export const materialWords = (material: Material): string =>
  [material.body ? `of ${material.body}` : '', material.sky ? `under a ${material.sky} backdrop` : ''].filter(Boolean).join(', ');
