/** Offline, real-scene Atelier port checks. Driven one render at a time by atelier-check.mjs. */
import * as THREE from 'three';
import { defineThing, disposeTree, type Capture } from '@conjure/kit';
import { ATELIER_MATERIALS, type AtelierMaterialName } from '../kit/atelier-materials';
import { materialOf, thingMaterialQuestions } from '../engine/material';
import type { Plan } from '../engine/director';
import { applyMix, styles, type AtelierMix } from '../components/looks/atelier/atelier';
import { Conjuring } from '../engine/director';
import { entryOf, loadBuilder, setRuntimeThings } from '../engine/catalogue';
import { Stage } from '../engine/stage';

const fixtures = {
  tabletop: { world: 'worlds/worktable', cast: ['things/teapot', 'things/crystal-geode'], idea: 'a teapot and a mineral on a worktable' },
  room: { world: 'worlds/tiled-room', cast: ['things/market-shelf', 'things/desk-lamp'], idea: 'a stocked shelf and a lamp in a tiled room' },
  perspective: { world: 'worlds/summer-school-corridor', cast: ['things/school-desk'], idea: 'an empty school corridor with one desk' },
  topology: { world: 'worlds/plinth', cast: ['things/found-atelier-topology'], idea: 'a closed multi-material box beside an open cylindrical sheet and a paper plane' },
  street: { world: 'worlds/street-corner', cast: ['things/gas-pump', 'things/fire-hydrant'], idea: 'a fuel pump and a fire hydrant on a street corner' },
} as const;
// An offline runtime component exercises actual Stage placement/ownership without
// adding diagnostic objects to the user's permanent catalogue.
setRuntimeThings([{ entry: {
  id: 'things/found-atelier-topology', kind: 'thing', title: 'Atelier topology fixture',
  summary: 'A six-material closed box, a genuinely open cylinder and an open sheet for geometry-port validation.', scales: ['tabletop'],
}, load: async () => defineThing({ questions: {}, build() {
  const object = new THREE.Group();
  const materials = ['#b75d4c', '#567f94', '#d0b666', '#6f925b', '#a8749c', '#8c887b'].map((color) => new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.45 }));
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), materials);
  box.position.set(-0.8, 0.55, 0); box.castShadow = box.receiveShadow = true; object.add(box);
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.35, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: '#a8784e', side: THREE.DoubleSide, roughness: 0.2, transmission: 1, thickness: 0.02 }));
  cylinder.position.set(0.8, 0.675, 0); cylinder.castShadow = cylinder.receiveShadow = true; object.add(cylinder);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.25), new THREE.MeshStandardMaterial({ color: '#b6ceb1', side: THREE.DoubleSide }));
  sheet.position.set(0, 0.85, -0.7); sheet.rotation.y = 0.25; sheet.castShadow = sheet.receiveShadow = true; object.add(sheet);
  return { object, dispose: () => disposeTree(object) };
} }) }]);
type Fixture = keyof typeof fixtures;
type RenderResult = { scene: string; id: string; started: string; finished: string; milliseconds: number; problems: string[]; error?: ReturnType<typeof errorDetails>; hash?: string; variance?: number; changed?: number; colors?: number };
const options = { seed: 2401, intensity: 0.6, ink: { spatter: 0.7, bloom: 0.8, scrape: 0.65, nervous: 0.75, bristles: 0.6, accent: 0.9, warp: 0.2 } };
const status = document.querySelector<HTMLElement>('#status')!;
const sheet = document.querySelector<HTMLElement>('#sheet')!;
const stage = new Stage(document.querySelector<HTMLCanvasElement>('#stage')!);
const restingChildren = stage.scene.children.length;
let capture: Capture | null = null;
let scene = '';
let original = '';
let busy = false;
const errors: string[] = [];
const images = new Map<string, string>();
window.addEventListener('error', (event) => errors.push(event.message));
window.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason)));
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  errors.push(args.map((arg) => arg instanceof Error ? arg.message : String(arg)).join(' ').slice(0, 500));
  originalConsoleError(...args);
};

/** Preserve worker diagnostics across Playwright's structured-clone boundary. */
function errorDetails(error: unknown) {
  const detail = (error && typeof error === 'object' ? error : {}) as {
    name?: string; message?: string; stack?: string; renderStage?: string; treatment?: string;
    workerLocation?: { file?: string; line?: number | null; column?: number | null };
  };
  return { name: detail.name ?? 'Error', message: detail.message ?? String(error), stack: detail.stack,
    renderStage: detail.renderStage, treatment: detail.treatment,
    workerLocation: detail.workerLocation ? { file: detail.workerLocation.file, line: detail.workerLocation.line, column: detail.workerLocation.column } : undefined };
}

function hash(bytes: ArrayLike<number>): string {
  let value = 2166136261;
  for (let i = 0; i < bytes.length; i++) value = Math.imul(value ^ bytes[i], 16777619);
  return (value >>> 0).toString(16).padStart(8, '0');
}
function fingerprint(frame: Capture) {
  const geometry = frame.atelier?.geometry;
  const pixels = [frame.color, frame.normal, frame.depth, frame.identity, frame.diffuse, frame.material ?? [], frame.atelier?.albedo ?? [], frame.atelier?.transmission ?? []].map(hash);
  pixels.push(hash([...JSON.stringify([geometry?.view, geometry?.projection, frame.atelier?.materialProfiles])].map((letter) => letter.charCodeAt(0))));
  for (const mesh of geometry?.meshes ?? []) {
    pixels.push(hash(new Uint8Array(mesh.position.buffer, mesh.position.byteOffset, mesh.position.byteLength)));
    if (mesh.index) pixels.push(hash(new Uint8Array(mesh.index.buffer, mesh.index.byteOffset, mesh.index.byteLength)));
    pixels.push(hash([...JSON.stringify([mesh.id, mesh.bodyId, mesh.matrix, mesh.side, mesh.drawRange, mesh.material])].map((letter) => letter.charCodeAt(0))));
  }
  return pixels.join(':');
}
function statistics(pixels: Uint8ClampedArray, reference: Uint8ClampedArray) {
  let sum = 0, square = 0, opaque = 0, changed = 0;
  const colors = new Set<number>();
  for (let i = 0; i < pixels.length; i += 4) {
    const luma = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
    sum += luma; square += luma * luma;
    if (pixels[i + 3] === 255) opaque++;
    if (Math.abs(pixels[i] - reference[i]) + Math.abs(pixels[i + 1] - reference[i + 1]) + Math.abs(pixels[i + 2] - reference[i + 2]) > 3) changed++;
    if (i % 28 === 0) colors.add(pixels[i] * 65536 + pixels[i + 1] * 256 + pixels[i + 2]);
  }
  const count = pixels.length / 4;
  return { hash: hash(pixels), variance: square / count - (sum / count) ** 2, changed: changed / count, colors: colors.size, opaque: opaque / count };
}
function mix(id: string): AtelierMix { return { mode: 'layers', layers: [{ id, enabled: true, weight: 100, blend: 'normal' }] }; }
function draw(id: string, signal = AbortSignal.timeout(90_000)) {
  if (!capture) throw Error('Start a fixture before drawing.');
  return applyMix(capture, mix(id), { ...options, signal });
}
function figure(id: string, pixels?: Uint8ClampedArray, problems: string[] = [], milliseconds = 0) {
  const figure = document.createElement('figure');
  figure.dataset.style = id;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 720;
  if (pixels) canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels), 720, 720), 0, 0);
  const caption = document.createElement('figcaption');
  caption.textContent = `${id} · ${milliseconds} ms${problems.length ? ` · ${problems.join('; ')}` : ''}`;
  if (problems.length) caption.className = 'failed';
  figure.append(canvas, caption);
  sheet.append(figure);
}
const twoFrames = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

function topologyEvidence(frame: Capture) {
  const bodies = new Map<string, NonNullable<Capture['atelier']>['geometry']['meshes']>();
  for (const mesh of frame.atelier?.geometry.meshes ?? []) if (mesh.id >= 3) {
    const list = bodies.get(mesh.bodyId) ?? []; list.push(mesh); bodies.set(mesh.bodyId, list);
  }
  return [...bodies].map(([bodyId, meshes]) => {
    const edges = new Map<string, number>();
    for (const mesh of meshes) {
      const positions = mesh.position, indices = mesh.index ?? Uint32Array.from({ length: positions.length / 3 }, (_, i) => i);
      const vertex = (at: number) => [0, 1, 2].map((axis) => Math.round(positions[at * 3 + axis] * 1e6)).join(',');
      for (let i = 0; i + 2 < indices.length; i += 3) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
        const key = [vertex(indices[i + a]), vertex(indices[i + b])].sort().join('|');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    return { bodyId, owner: meshes[0].id, groups: meshes.length, triangles: meshes.reduce((sum, mesh) => sum + (mesh.index?.length ?? mesh.position.length / 3) / 3, 0), boundaryEdges: [...edges.values()].filter((count) => count === 1).length, nonManifoldEdges: [...edges.values()].filter((count) => count > 2).length };
  });
}
function captureMaterialEvidence(frame: Capture) {
  const albedo = frame.atelier?.albedo, transmission = frame.atelier?.transmission;
  const problems: string[] = [];
  if (!albedo || albedo.length !== frame.color.length) problems.push('Missing per-pixel albedo capture.');
  if (!transmission || transmission.length !== frame.color.length) problems.push('Missing per-pixel transmission capture.');
  const pigments = new Set<string>(), transmitted = new Set<number>(), profiles = new Set<number>();
  const boxProfiles = new Map<number, Set<number>>();
  let materialPixels = 0;
  const sourcePigments = ['#b75d4c', '#567f94', '#d0b666', '#6f925b', '#a8749c', '#8c887b'].map((color) => new THREE.Color(color).toArray().map((v) => Math.round(v * 255)));
  const matched = new Set<number>();
  for (let i = 0; i < frame.size ** 2; i++) if (frame.identity[i * 4] === 3) {
    materialPixels++;
    if (albedo) {
      const rgb = [albedo[i * 4], albedo[i * 4 + 1], albedo[i * 4 + 2]];
      pigments.add(rgb.join(','));
      const index = sourcePigments.findIndex((color) => color.every((value, channel) => Math.abs(value - rgb[channel]) <= 2));
      if (index >= 0) {
        matched.add(index);
        if (transmission) {
          const tokens = boxProfiles.get(index) ?? new Set<number>();
          tokens.add(transmission[i * 4 + 1] * 256 + transmission[i * 4 + 2]); boxProfiles.set(index, tokens);
        }
      }
    }
    if (transmission) { transmitted.add(transmission[i * 4]); profiles.add(transmission[i * 4 + 1] * 256 + transmission[i * 4 + 2]); }
  }
  return { problems, materialPixels, pigments: pigments.size, matchedBoxPigments: [...matched].sort(), transmissionValues: [...transmitted].sort((a, b) => a - b), profiles: [...profiles].sort((a, b) => a - b), boxProfiles: [...boxProfiles].map(([pigment, tokens]) => ({ pigment, tokens: [...tokens].sort((a, b) => a - b) })) };
}
async function start(name: Fixture) {
  if (busy) throw Error('A render is already running.');
  if (!(name in fixtures)) throw Error(`Unknown fixture ${name}.`);
  errors.length = 0;
  stage.unmount();
  if (stage.scene.children.length !== restingChildren) throw Error('Previous scene did not dispose completely.');
  const fixture = fixtures[name];
  const plan = await new Conjuring(fixture.idea, { offline: true, plain: true, world: fixture.world, cast: [...fixture.cast], look: 'looks/atelier' }).plan({
    temperature: 1, roll: 0,
    force: { ...Object.fromEntries(['wear', 'warmth', 'energy', 'density', 'daylight', 'cheer'].map((key) => [`direction::${key}`, 0.5])), 'looks/atelier::base': 'riso', 'looks/atelier::overlay': 'none', 'looks/atelier::finish': 'none' },
  });
  const reports = await stage.mount(plan);
  const failed = reports.filter((report) => report.error);
  if (failed.length) throw Error(failed.map((report) => `${report.id}: ${report.error}`).join('; '));
  await twoFrames();
  capture = stage.capture();
  scene = name;
  original = fingerprint(capture);
  images.clear();
  sheet.replaceChildren();
  document.querySelector('#title')!.textContent = `Atelier · ${name} · ${fixture.world}`;
  figure('scene-reference', capture.color);
  const extended = capture as Capture & { atelier?: { geometry?: { source?: string; meshes?: Array<{ id?: number; position?: ArrayLike<number>; index?: ArrayLike<number> | null }> }; edges?: unknown[] } };
  const geometry = extended.atelier?.geometry;
  const identities = [...new Set(Array.from({ length: capture.size ** 2 }, (_, i) => capture!.identity[i * 4]))].sort((a, b) => a - b);
  const problems: string[] = errors.map((error) => `console: ${error}`);
  if (!geometry?.meshes?.length || geometry.source !== 'conjure') problems.push('Missing variable-scene geometry snapshot.');
  if (identities.filter((id) => id >= 3).length < fixture.cast.length) problems.push('A requested cast member is absent from the capture.');
  const topology = name === 'topology' ? topologyEvidence(capture) : null;
  if (name === 'perspective' && capture.atelier?.geometry.camera !== 'perspective') problems.push('Perspective fixture did not capture a perspective camera.');
  const materialEvidence = name === 'topology' ? captureMaterialEvidence(capture) : null;
  if (topology) {
    const box = topology.find((body) => body.groups === 6);
    if (!box || box.boundaryEdges || box.nonManifoldEdges || box.triangles !== 12) problems.push('The six material groups did not reconstruct one closed box body.');
    if (topology.filter((body) => body.boundaryEdges > 0 && body.nonManifoldEdges === 0).length < 2) problems.push('The cylinder and plane did not retain their genuine open boundaries.');
    if (topology.some((body) => body.owner !== 3)) problems.push('Material/body groups lost their shared cast identity.');
    problems.push(...materialEvidence!.problems);
    if (materialEvidence!.matchedBoxPigments.length < 2) problems.push('Per-pixel albedo collapsed the closed box material groups into one pigment.');
    if (!materialEvidence!.transmissionValues.includes(0) || !materialEvidence!.transmissionValues.includes(255)) problems.push('Per-pixel transmission did not preserve opaque box and transmitting open sheet under one identity.');
    const pigmentProfiles = materialEvidence!.boxProfiles.flatMap((entry) => entry.tokens);
    if (pigmentProfiles.some((token) => !token) || new Set(pigmentProfiles).size < materialEvidence!.matchedBoxPigments.length) problems.push('Same-PBR box pigments lost their distinct nonzero material profile tokens.');
  }
  status.textContent = `Ready: ${name}`;
  return { name, fixture, reports, identities, topology, materialEvidence, camera: capture.atelier?.geometry.camera, geometry: geometry ? { source: geometry.source, meshes: geometry.meshes?.length, triangles: geometry.meshes?.reduce((sum, mesh) => sum + (mesh.index?.length ?? mesh.position?.length! / 3) / 3, 0) } : null, problems };
}
async function render(id: string): Promise<RenderResult> {
  if (!capture) throw Error('No active capture.');
  if (busy) throw Error('A render is already running.');
  if (!styles.some((style) => style.id === id)) throw Error(`Unknown style ${id}.`);
  busy = true;
  errors.length = 0;
  status.textContent = `Drawing ${scene}: ${id}…`;
  const started = performance.now(), startedAt = new Date().toISOString(), problems: string[] = [];
  let pixels: Uint8ClampedArray | undefined;
  let stats: ReturnType<typeof statistics> | undefined;
  let failure: ReturnType<typeof errorDetails> | undefined;
  try {
    pixels = await draw(id);
    if (pixels.length !== capture.size ** 2 * 4) throw Error(`Expected RGBA ${capture.size}², got ${pixels.length} bytes.`);
    stats = statistics(pixels, capture.color);
    if (stats.opaque !== 1) problems.push('Output is not fully opaque.');
    if (stats.variance < 1 || stats.colors < 2) problems.push('Output is blank or nearly uniform.');
    if (stats.changed < 0.001) problems.push('Treatment did not change the captured image.');
    const duplicate = [...images].find(([, previous]) => previous === stats!.hash);
    if (duplicate) problems.push(`Identical pixels to ${duplicate[0]}.`);
    images.set(id, stats.hash);
    if (fingerprint(capture) !== original) problems.push('Treatment mutated its source capture.');
  } catch (error) {
    failure = errorDetails(error);
    problems.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  } finally { busy = false; }
  problems.push(...errors.map((error) => `console: ${error}`));
  const milliseconds = Math.round(performance.now() - started);
  figure(id, pixels, problems, milliseconds);
  status.textContent = `${scene}: ${id} ${problems.length ? 'failed' : 'passed'} in ${milliseconds} ms`;
  return { scene, id, started: startedAt, finished: new Date().toISOString(), milliseconds, problems, ...(failure ? { error: failure } : {}), ...(stats ?? {}) };
}
async function lifecycle() {
  if (!capture) throw Error('No active capture.');
  const results: Array<{ check: string; passed: boolean; detail: string; milliseconds: number }> = [];
  const check = async (name: string, fn: () => Promise<string>) => {
    const started = performance.now();
    try { results.push({ check: name, passed: true, detail: await fn(), milliseconds: Math.round(performance.now() - started) }); }
    catch (error) { results.push({ check: name, passed: false, detail: error instanceof Error ? error.message : String(error), milliseconds: Math.round(performance.now() - started) }); }
  };
  await check('pre-aborted signal', async () => {
    const controller = new AbortController(); controller.abort();
    try { await draw('riso', controller.signal); } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError' || error instanceof Error && /abort/i.test(error.name + error.message)) return 'Rejected before drawing.';
      throw error;
    }
    throw Error('An already aborted render completed.');
  });
  await check('in-flight worker cancellation', async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10);
    try {
      try { await draw('directional-color', controller.signal); } catch (error) {
        if (controller.signal.aborted && error instanceof Error && /abort/i.test(error.name + error.message)) return 'Canceled a directional-color solve; next render follows.';
        throw error;
      }
      throw Error('Directional color completed despite cancellation.');
    } finally { clearTimeout(timer); }
  });
  await check('style switch and deterministic replay', async () => {
    const first = await draw('riso');
    const other = await draw('woodcut');
    const repeat = await draw('riso');
    if (first.length !== repeat.length || first.some((value, index) => value !== repeat[index])) throw Error('Returning to the same style and seed changed its pixels.');
    if (hash(first) === hash(other)) throw Error('Switching style did not change the image.');
    return `${hash(first)} → ${hash(other)} → ${hash(repeat)}`;
  });
  await check('real look selector and Stage.develop', async () => {
    const builder = await loadBuilder(entryOf('looks/atelier') as ReturnType<typeof entryOf> & { kind: 'look' });
    const base = builder.questions.base, overlay = builder.questions.overlay;
    if (base.type !== 'choice' || overlay.type !== 'choice') throw Error('Atelier selectors are not choice questions.');
    const missing = styles.filter((style) => !(style.id in base.options) || !(style.id in overlay.options));
    if (missing.length) throw Error(`Selectors omit: ${missing.map((style) => style.id).join(', ')}`);
    const result = await stage.develop(AbortSignal.timeout(90_000), capture!);
    if (!result || result.pixels.length !== capture!.color.length) throw Error('Stage.develop failed to return the Atelier print.');
    return `${styles.length} studies present in base and overlay; Stage returned ${result.pixels.length} bytes.`;
  });
  await check('capture preservation', async () => {
    if (fingerprint(capture!) !== original) throw Error('Lifecycle mutated the shared capture.');
    return hash([...original].map((letter) => letter.charCodeAt(0)));
  });
  return results;
}
async function finishComposition(id: 'finite-lenses' | 'ink-completed-mix' | 'fluted-glass') {
  if (!capture) throw Error('No active capture.');
  const started = performance.now(), problems: string[] = [];
  errors.length = 0;
  status.textContent = `Geometry mix through ${id}…`;
  const composition: AtelierMix = { mode: 'layers', layers: [
    { id: 'section-ribs', enabled: true, weight: 100, blend: 'normal' },
    { id: 'surface-hatching', enabled: true, weight: 35, blend: 'multiply' },
  ], finish: { id, weight: 60 } };
  let pixels: Uint8ClampedArray | undefined;
  let beforeFinish = '', afterFinish = '';
  try {
    const mixed = await applyMix(capture, { mode: 'layers', layers: composition.layers }, { ...options, signal: AbortSignal.timeout(90_000) });
    pixels = await applyMix(capture, composition, { ...options, signal: AbortSignal.timeout(90_000) });
    const replay = await applyMix(capture, composition, { ...options, signal: AbortSignal.timeout(90_000) });
    beforeFinish = hash(mixed); afterFinish = hash(pixels);
    if (pixels.length !== capture.color.length || statistics(pixels, mixed).opaque !== 1) problems.push('Finished mix has invalid dimensions or opacity.');
    if (pixels.some((value, index) => value !== replay[index])) problems.push('Finished geometry mix did not replay exactly.');
    if (beforeFinish === afterFinish) problems.push('The composition finish did not affect the mixture.');
    if (fingerprint(capture) !== original) problems.push('Finished mix mutated source capture or geometry.');
  } catch (error) { problems.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error)); }
  problems.push(...errors.map((error) => `console: ${error}`));
  const milliseconds = Math.round(performance.now() - started);
  figure(`mix + ${id}`, pixels, problems, milliseconds);
  return { id, milliseconds, problems, layers: composition.layers, beforeFinish, afterFinish };
}
/** Exercise mixed slots through the actual Stage camera and all GPU capture passes. */
async function captureSlots() {
  if (!capture?.atelier) throw Error('Start a scene before checking material slots.');
  const started = performance.now(), problems: string[] = [];
  errors.length = 0;
  const source = capture, size = source.size;
  const clipToWorld = new THREE.Matrix4().fromArray(source.atelier!.geometry.view).invert()
    .multiply(new THREE.Matrix4().fromArray(source.atelier!.geometry.projection).invert());
  const texture = (green: boolean) => {
    const data = new Uint8Array(16);
    for (let i = 0; i < 4; i++) data.set(green ? [255, i % 2 ? 0 : 102, 255, 255] : [255, 255, 255, i % 2 ? 0 : 77], i * 4);
    const result = new THREE.DataTexture(data, 2, 2, THREE.RGBAFormat);
    result.magFilter = result.minFilter = THREE.NearestFilter; result.needsUpdate = true;
    return result;
  };
  const map = texture(false), alphaMap = texture(true);
  alphaMap.channel = 1; alphaMap.repeat.x = -1; alphaMap.offset.x = 1;
  const materials = [
    new THREE.MeshBasicMaterial({ color: '#ffdd00', depthWrite: false }),
    new THREE.MeshStandardMaterial({ color: '#62b87d', side: THREE.FrontSide, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: '#6294d2', side: THREE.BackSide, map, alphaTest: 0.23 }),
    new THREE.MeshStandardMaterial({ color: '#cf78a3', side: THREE.DoubleSide, alphaMap, alphaTest: 0.23 }),
    new THREE.MeshStandardMaterial({ color: '#cf9454', side: THREE.FrontSide, vertexColors: true, alphaTest: 0.23 }),
    new THREE.MeshStandardMaterial({ color: '#78cbd2', side: THREE.FrontSide }),
    new THREE.MeshPhysicalMaterial({ color: '#9b7bd4', side: THREE.DoubleSide, transmission: 0.65, thickness: 0.01 }),
  ];
  const names = ['excluded-first-glow', 'later-opaque-front', 'backside-map-alpha-0.30', 'double-sided-uv1-green-alpha', 'vertex-alpha', 'culled-frontside', 'double-sided-transmission'];
  const rectangles = names.map((_, slot) => ({ left: -0.9 + (slot % 4) * 0.46, bottom: 0.2 - Math.floor(slot / 4) * 0.85, width: 0.35, height: 0.55 }));
  const positions: number[] = [], uv: number[] = [], colors: number[] = [];
  const geometry = new THREE.BufferGeometry();
  rectangles.forEach((rect, slot) => {
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const order = [2, 3, 5, 6].includes(slot) ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
    for (const index of order) {
      const [u, v] = corners[index];
      // Tilt in camera space so normal pixels differ from the facing-viewer clear color.
      const point = new THREE.Vector3(rect.left + rect.width * u, rect.bottom + rect.height * v, -0.2 + u * 0.25).applyMatrix4(clipToWorld);
      positions.push(...point.toArray()); uv.push(u, v); colors.push(1, 1, 1, slot === 4 ? u * 0.4 : 1);
    }
    geometry.addGroup(slot * 6, 6, slot);
  });
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('uv1', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, materials); mesh.userData.captureId = 200;
  const light = new THREE.AmbientLight(0xffffff, 0.7);
  const hidden: THREE.Object3D[] = [];
  stage.scene.traverseVisible((object) => {
    if ((object as THREE.Mesh).isMesh || (object as THREE.Line).isLine || (object as THREE.Points).isPoints || (object as THREE.Sprite).isSprite) hidden.push(object);
  });
  let evidence: unknown;
  try {
    for (const object of hidden) object.visible = false;
    stage.scene.add(mesh, light);
    const frame = stage.capture();
    const albedo = frame.atelier?.albedo, transmission = frame.atelier?.transmission;
    if (!albedo || !transmission) throw Error('Mixed-slot capture has no albedo or transmission field.');
    const normalClear = Array.from(frame.normal.slice(0, 3));
    const foreground = {
      identity: (i: number) => frame.identity[i * 4] === 200,
      depth: (i: number) => [0, 1, 2].some((channel) => frame.depth[i * 4 + channel] > 0),
      normal: (i: number) => [0, 1, 2].some((channel) => Math.abs(frame.normal[i * 4 + channel] - normalClear[channel]) > 1),
      diffuse: (i: number) => [0, 1, 2].some((channel) => frame.diffuse[i * 4 + channel] > 0),
      material: (i: number) => (frame.material?.[i * 4 + 1] ?? 0) > 0,
      albedo: (i: number) => albedo[i * 4 + 3] > 0,
      transmission: (i: number) => transmission[i * 4 + 3] > 0,
    };
    const masks = Object.fromEntries(Object.entries(foreground).map(([name, present]) => {
      let pixels = 0, mismatch = 0;
      for (let i = 0; i < size ** 2; i++) { const value = present(i); pixels += +value; mismatch += +(value !== foreground.identity(i)); }
      if (mismatch) problems.push(`${name} disagrees with the identity silhouette at ${mismatch} pixels.`);
      return [name, { pixels, mismatch }];
    }));
    const probes = rectangles.map((rect, slot) => {
      const samples = [0.25, 0.75].map((u) => {
        const x = Math.floor((rect.left + rect.width * u + 1) * size / 2), y = Math.floor((1 - rect.bottom - rect.height / 2) * size / 2), index = y * size + x;
        const expected = slot === 0 || slot === 5 ? false : slot === 2 ? u < 0.5 : slot === 3 || slot === 4 ? u > 0.5 : true;
        const present = foreground.identity(index);
        if (present !== expected) problems.push(`${names[slot]} at u=${u}: expected ${expected ? 'surface' : 'hole'}, got ${present ? 'surface' : 'hole'}.`);
        const coefficient = transmission[index * 4];
        if (expected && Math.abs(coefficient - (slot === 6 ? 166 : 0)) > 1) problems.push(`${names[slot]} has incorrect transmission coefficient ${coefficient}.`);
        return { u, x, y, expected, present, identity: frame.identity[index * 4], transmission: coefficient, albedo: Array.from(albedo.slice(index * 4, index * 4 + 4)) };
      });
      return { slot, name: names[slot], samples };
    });
    const snapshots = frame.atelier!.geometry.meshes.filter((entry) => entry.id === 200);
    if (snapshots.length !== 6) problems.push(`Expected six admitted geometry groups after excluding the first glow, got ${snapshots.length}.`);
    const maskImage = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < size ** 2; i++) maskImage.set(foreground.identity(i) ? [32, 32, 32, 255] : [245, 242, 232, 255], i * 4);
    figure('mixed-slots: visible scene', frame.color);
    figure('mixed-slots: captured silhouette', maskImage, problems);
    figure('mixed-slots: albedo', new Uint8ClampedArray(albedo));
    evidence = { owner: 200, slots: names, admittedGroups: snapshots.length, masks, probes, sourceMaterialsRestored: mesh.material === materials };
    if (mesh.material !== materials) problems.push('Capture did not restore the original material array.');
  } catch (error) { problems.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error)); }
  finally {
    mesh.removeFromParent(); light.removeFromParent();
    for (const object of hidden) object.visible = true;
    geometry.dispose(); for (const material of materials) material.dispose(); map.dispose(); alphaMap.dispose();
  }
  if (hash(stage.capture().color) !== hash(source.color)) problems.push('Mixed-slot diagnostic changed the original scene render after restoration.');
  if (fingerprint(source) !== original) problems.push('Mixed-slot diagnostic mutated the original snapshot.');
  problems.push(...errors.map((error) => `console: ${error}`));
  return { milliseconds: Math.round(performance.now() - started), problems, evidence };
}
async function geometrySensitivity(ids: string[]) {
  if (!capture?.atelier?.geometry) throw Error('No geometry to test.');
  const frame = capture;
  const snapshot = frame.atelier!.geometry;
  const shift = frame.pixelWorldSize * frame.size * 0.23;
  const moved = { ...frame, atelier: { ...frame.atelier!, geometry: { ...snapshot,
    meshes: snapshot.meshes.map((mesh) => ({ ...mesh, matrix: mesh.matrix.map((value, index) => index === 12 && mesh.id > 1 ? value + shift : value) })),
  } } };
  const results: Array<{ id: string; passed: boolean; original?: string; changed?: string; changedFraction?: number; detail?: string; milliseconds: number }> = [];
  for (const id of ids) {
    const started = performance.now();
    status.textContent = `Geometry sensitivity: ${id}…`;
    try {
      const first = await applyMix(frame, mix(id), { ...options, signal: AbortSignal.timeout(90_000) });
      const second = await applyMix(moved, mix(id), { ...options, signal: AbortSignal.timeout(90_000) });
      const stats = statistics(second, first);
      results.push({ id, passed: stats.changed > 0, original: hash(first), changed: stats.hash, changedFraction: stats.changed,
        ...(stats.changed === 0 ? { detail: 'Moving source geometry while keeping RGB/depth/identity fixed did not affect the result.' } : {}),
        milliseconds: Math.round(performance.now() - started) });
    } catch (error) { results.push({ id, passed: false, detail: error instanceof Error ? error.message : String(error), milliseconds: Math.round(performance.now() - started) }); }
  }
  if (fingerprint(frame) !== original) throw Error('Geometry sensitivity check mutated the original capture.');
  return results;
}
let materialPlan: Plan | null = null;
let materialReference: Uint8ClampedArray | null = null;
const materialImages = new Map<string, string>();
async function startMaterials() {
  stage.unmount();
  if (stage.scene.children.length !== restingChildren) throw Error('Previous fixture leaked scene objects.');
  materialPlan = await new Conjuring('the same teapot in each Atelier source material', {
    offline: true, plain: true, world: 'worlds/plinth', cast: ['things/teapot'], look: 'looks/graphic-press',
  }).plan({ temperature: 1, roll: 0,
    force: Object.fromEntries(['wear', 'warmth', 'energy', 'density', 'daylight', 'cheer'].map((key) => [`direction::${key}`, 0.5])),
  });
  const reports = await stage.mount(materialPlan);
  if (reports.some((report) => report.error)) throw Error('Could not build the material fixture.');
  await twoFrames();
  materialReference = stage.capture().color;
  stage.unmount();
  materialImages.clear(); errors.length = 0; sheet.replaceChildren();
  document.querySelector('#title')!.textContent = 'Atelier source materials · the same teapot';
  figure('as-made', materialReference);
  return { materials: Object.keys(ATELIER_MATERIALS), baseline: hash(materialReference), memory: { ...stage.renderer.info.memory } };
}
async function renderMaterial(request: AtelierMaterialName | { id: AtelierMaterialName; repeat?: boolean }) {
  const id = typeof request === 'string' ? request : request.id;
  const repeated = typeof request !== 'string' && request.repeat;
  if (!materialPlan || !materialReference) throw Error('Start the material fixture first.');
  if (!(id in ATELIER_MATERIALS)) throw Error(`Unknown source material ${id}.`);
  errors.length = 0;
  const problems: string[] = [], started = performance.now();
  const question = thingMaterialQuestions('Teapot').materialBody;
  if (!(id in question.options)) problems.push('Material is absent from the real body selector.');
  materialPlan.cast[0].material = materialOf({ materialBody: id });
  if (materialPlan.cast[0].material?.body !== id) problems.push('Pinned material did not survive materialOf.');
  const sourceMaterials = new Set<THREE.Material>(), sourceGeometries = new Set<THREE.BufferGeometry>();
  let disposedMaterials = 0, disposedGeometries = 0;
  let pixels: Uint8ClampedArray | undefined;
  let stats: ReturnType<typeof statistics> | undefined;
  let materialEvidence: { taggedPixels: number; owners: number[]; shaderMeshes: number; albedo?: { means: number[]; minima: number[]; maxima: number[]; colors: number }; transmission?: { mean: number; min: number; max: number; values: number[] } } | undefined;
  status.textContent = `Compiling and capturing ${id}…`;
  try {
    const reports = await stage.mount(materialPlan);
    problems.push(...reports.filter((report) => report.error).map((report) => `${report.id}: ${report.error}`));
    await twoFrames();
    stage.scene.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const material of [mesh.material].flat()) if (material.userData.material === id) {
        sourceMaterials.add(material); sourceGeometries.add(mesh.geometry);
      }
    });
    if (!sourceMaterials.size) problems.push('No source shader material was installed on the teapot.');
    for (const material of sourceMaterials) material.addEventListener('dispose', () => disposedMaterials++);
    for (const geometry of sourceGeometries) geometry.addEventListener('dispose', () => disposedGeometries++);
    const first = stage.capture();
    const before = fingerprint(first);
    const repeat = stage.capture();
    if (hash(first.color) !== hash(repeat.color)) problems.push('Auxiliary capture passes changed the material render.');
    if (fingerprint(first) !== before) problems.push('A second capture mutated its preceding snapshot.');
    const taggedPixels = first.material ? Array.from({ length: first.size ** 2 }, (_, index) => index).filter((index) => first.material![index * 4 + 2] === 255) : [];
    if (!taggedPixels.length) problems.push('Source material marker255 was lost in the capture.');
    if (taggedPixels.some((index) => first.identity[index * 4] !== 3)) problems.push('Source material capture markers escaped the teapot identity.');
    const shaderEvidence = first.atelier?.geometry.meshes.filter((mesh) => mesh.id === 3 && (mesh.material as { atelierMaterial?: string }).atelierMaterial === id.slice(8)) ?? [];
    materialEvidence = { taggedPixels: taggedPixels.length, owners: [...new Set(taggedPixels.map((index) => first.identity[index * 4]))], shaderMeshes: shaderEvidence.length };
    if (!shaderEvidence.length) problems.push('Source material ID was lost in geometry metadata.');
    if (!first.atelier?.albedo || first.atelier.albedo.length !== first.color.length) problems.push('Source albedo pass is missing.');
    if (!first.atelier?.transmission || first.atelier.transmission.length !== first.color.length) problems.push('Source transmission pass is missing.');
    if (taggedPixels.length && first.atelier?.transmission) {
      const expected = id === 'atelier-frosted-glass' ? 255 : 0;
      const mean = taggedPixels.reduce((sum, index) => sum + first.atelier!.transmission![index * 4], 0) / taggedPixels.length;
      const values = [...new Set(taggedPixels.map((index) => first.atelier!.transmission![index * 4]))].sort((a, b) => a - b);
      materialEvidence.transmission = { mean, min: values[0], max: values.at(-1)!, values };
      if (Math.abs(mean - expected) > 2) problems.push(`Source transmission capture is ${mean.toFixed(1)}, expected ${expected}.`);
    }
    if (taggedPixels.length && first.atelier?.albedo) {
      const channelMeans = [0, 1, 2].map((channel) => taggedPixels.reduce((sum, index) => sum + first.atelier!.albedo![index * 4 + channel], 0) / taggedPixels.length);
      const minima = [255, 255, 255], maxima = [0, 0, 0], colors = new Set<number>();
      for (const index of taggedPixels) {
        const rgb = [0, 1, 2].map((channel) => first.atelier!.albedo![index * 4 + channel]);
        for (let channel = 0; channel < 3; channel++) { minima[channel] = Math.min(minima[channel], rgb[channel]); maxima[channel] = Math.max(maxima[channel], rgb[channel]); }
        colors.add(rgb[0] * 65536 + rgb[1] * 256 + rgb[2]);
      }
      materialEvidence.albedo = { means: channelMeans, minima, maxima, colors: colors.size };
      if (channelMeans.every((value) => value < 1)) problems.push('Source pigment capture is black/empty.');
      if (id === 'atelier-copper' && !(channelMeans[0] > channelMeans[2] + 10)) problems.push('Copper pigment capture lost its warm conductor color.');
      if (id === 'atelier-wood' && colors.size < 2) problems.push('Wood pigment capture lost its procedural grain variation.');
    }
    pixels = first.color;
    stats = statistics(pixels, materialReference);
    if (stats.variance < 1 || stats.colors < 3 || stats.opaque !== 1) problems.push('Material output is blank or invalid.');
    if (stats.changed < 0.001) problems.push('Source material did not change the original teapot.');
    const duplicate = [...materialImages].find(([, previous]) => previous === stats!.hash);
    if (duplicate && duplicate[0] !== id) problems.push(`Identical material pixels to ${duplicate[0]}.`);
    if (repeated && materialImages.get(id) !== stats.hash) problems.push('Repeated material render changed its pixels.');
    materialImages.set(id, stats.hash);
  } catch (error) { problems.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error)); }
  finally {
    stage.unmount();
    if (stage.scene.children.length !== restingChildren) problems.push('Material fixture left scene objects after unmount.');
    if (disposedMaterials < sourceMaterials.size) problems.push(`Disposed ${disposedMaterials}/${sourceMaterials.size} installed source materials.`);
    if (disposedGeometries < sourceGeometries.size) problems.push(`Disposed ${disposedGeometries}/${sourceGeometries.size} installed material geometries.`);
  }
  problems.push(...errors.map((error) => `console: ${error}`));
  const milliseconds = Math.round(performance.now() - started);
  figure(id, pixels, problems, milliseconds);
  return { id, repeated: !!repeated, milliseconds, problems, ...(stats ?? {}), materialEvidence, materials: sourceMaterials.size, geometries: sourceGeometries.size, disposedMaterials, disposedGeometries, memory: { ...stage.renderer.info.memory } };
}
function finish() {
  stage.unmount();
  const problems = stage.scene.children.length === restingChildren ? [] : ['Scene objects remain after unmount.'];
  capture = null;
  status.textContent = 'Finished.';
  return { problems };
}

(window as any).__atelierCheck = { fixtures: Object.keys(fixtures), styles: styles.map(({ id, name }) => ({ id, name })), start, render, lifecycle, finishComposition, captureSlots, geometrySensitivity, finish, materials: Object.keys(ATELIER_MATERIALS), startMaterials, renderMaterial, errorDetails };
document.title = 'atelier-check-ready';
