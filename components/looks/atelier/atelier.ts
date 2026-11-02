import type { Capture } from '@conjure/kit';

/**
 * Atelier ships as plain browser modules with its own workers and a vendored p5 1.x.
 * Its study runtime and Conjure geometry adapters are served from /atelier,
 * loaded at runtime rather than bundled. The original Garden paths stay separate.
 */
const BASE = '/atelier/';

export interface AtelierStyle {
  id: string;
  name: string;
  family: string;
  medium: string;
  description: string;
}
export interface AtelierLayer {
  id: string;
  enabled: boolean;
  weight: number;
  blend: 'normal' | 'multiply' | 'screen' | 'color';
}
export interface AtelierMix {
  mode: 'layers';
  layers: AtelierLayer[];
  finish?: { id: 'finite-lenses' | 'ink-completed-mix' | 'fluted-glass'; weight: number };
}
export type AtelierInk = Record<'spatter' | 'bloom' | 'scrape' | 'nervous' | 'bristles' | 'accent' | 'warp', number>;

interface MixRenderer {
  prepare(request: { raw: unknown; mix: AtelierMix; seed: number; intensity: number; ink: AtelierInk; signal?: AbortSignal }): Promise<Map<string, unknown>>;
}
interface Runtime {
  styles: AtelierStyle[];
  renderer: MixRenderer;
  composite(reference: Uint8ClampedArray, images: Map<string, unknown>, mix: AtelierMix, options: object): Promise<Uint8ClampedArray>;
  finish(pixels: Uint8ClampedArray, finish: NonNullable<AtelierMix['finish']>, signal: AbortSignal): Promise<Uint8ClampedArray>;
}

const load = (path: string) => import(/* @vite-ignore */ `${BASE}${path}`);

export const styles: AtelierStyle[] = (await load('styles.js')).styles;

/** Atelier draws with p5 1.x; the ateliers' painted faces use p5 2.x. Each keeps its own constructor. */
async function loadPainter(): Promise<{ createGraphics: unknown }> {
  const scope = window as unknown as { p5?: unknown };
  const previous = scope.p5;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${BASE}vendor/p5.min.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('The Atelier drawing library could not be loaded.'));
    document.head.append(script);
  });
  const P5 = scope.p5 as new (sketch: (p: any) => void, host: HTMLElement) => unknown;
  if (previous) scope.p5 = previous;
  else delete scope.p5;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;';
  document.body.append(host);
  return new Promise((resolve) => {
    new P5((p) => {
      p.setup = () => {
        p.pixelDensity(1);
        p.createCanvas(2, 2);
        p.noLoop();
        resolve(p);
      };
    }, host);
  });
}

let runtime: Promise<Runtime> | null = null;
const loadRuntime = () =>
  (runtime ??= (async () => {
    const [mixer, finisher, painter] = await Promise.all([load('mixer.js'), load('image-finisher.js'), loadPainter()]);
    return {
      styles,
      renderer: mixer.createMixRenderer(painter),
      composite: mixer.compositeMixAsync,
      async finish(pixels, finish, signal) {
        const worker = finisher.createImageFinisher();
        try {
          return (await worker.finish(pixels, finish, { signal })).pixels;
        } finally {
          await worker.dispose();
        }
      },
    } satisfies Runtime;
  })());

const frames = new WeakMap<Capture, object>();

/** Preserve the actual captured geometry, ownership, materials and lights through the worker boundary. */
function toAtelierFrame(capture: Capture) {
  const saved = frames.get(capture);
  if (saved) return saved;
  const ids = capture.baseColors.length;
  const evidence = capture.atelier;
  const raw = {
    size: capture.size,
    color: capture.color,
    normal: capture.normal,
    depth: capture.depth,
    identity: capture.identity,
    diffuse: capture.diffuse,
    material: capture.material,
    albedo: evidence?.albedo ?? null,
    transmission: evidence?.transmission,
    materialProfiles: evidence?.materialProfiles,
    pixelWorldSize: evidence ? evidence.geometry.worldScale * 8.2 / capture.size : capture.pixelWorldSize,
    near: capture.near,
    far: capture.far,
    baseColors: capture.baseColors,
    metalnesses: evidence?.metalnesses ?? Array(ids).fill(0),
    transmissions: evidence?.transmissions ?? Array(ids).fill(0),
    materialSettings: { preset: 'original', assignments: {} },
    materialBakeMetadata: null,
    edges: evidence?.edges ?? [],
    edgeOwners: evidence?.edgeOwners ?? [],
    reliefLight: capture.light,
    spectralLights: evidence?.spectralLights ?? [{ direction: capture.light, color: [1, 0.96, 0.87], intensity: 4.2 }],
    spectralHemisphere: evidence?.spectralHemisphere ?? { sky: [1, 1, 1], ground: [0.44, 0.5, 0.46], intensity: 1.5, up: [0, -1, 0] },
    ...(evidence ? {
      geometrySnapshot: () => evidence.geometry,
      worldFromClip: evidence.worldFromClip,
      cameraProjection: evidence.geometry.projection,
      sectionRibLighting: evidence.sectionRibLighting,
      cutawayShadowCamera: evidence.cutawayShadowCamera,
    } : {}),
  };
  frames.set(capture, raw);
  return raw;
}

export async function applyMix(
  capture: Capture,
  mix: AtelierMix,
  options: { seed: number; intensity: number; ink: AtelierInk; signal: AbortSignal },
): Promise<Uint8ClampedArray> {
  const atelier = await loadRuntime();
  const raw = toAtelierFrame(capture);
  const images = await atelier.renderer.prepare({ raw, mix, ...options });
  let pixels = await atelier.composite(capture.color, images, mix, {
    size: capture.size,
    seed: options.seed,
    identity: capture.identity,
    signal: options.signal,
  });
  if (mix.finish && mix.finish.weight > 0) pixels = await atelier.finish(pixels, mix.finish, options.signal);
  return pixels;
}
