// Skin sheet: put a GLSL fragment on the cast things of one offline scene, capture it through the
// real rig, and print that one capture through several looks, so a shader skin can be judged the
// way it will actually appear: colour-reading looks keep a skin, line and print looks redraw from
// identity, depth and normals and drop it. Writes one PNG per frame and sheet.png to .data/skin-sheet/.
//
//   node dev/skin-sheet.mjs
//   node dev/skin-sheet.mjs --skin=components/things/punched-tin-lantern/skin.frag --looks=old-master-light,linocut-press
//   node dev/skin-sheet.mjs --idea='a tide pool at dusk' --world=worlds/tide-pool --cast=things/hermit-crab,things/sea-glass
//
// The fragment gets varyings vPos (object space; multiply by uScale for roughly 0..1.4 across the
// thing), vN (view-space normal) and vUv, and uniforms uScale, uIdx (one value per thing) and uTime.
// Without --skin a leaf-venation demo is used. Needs the dev server (npm run dev) and a Playwright
// Chromium. No model requests are made.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => { const [key, ...rest] = arg.replace(/^--/, '').split('='); return [key, rest.join('=') || 'true']; }));
const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const out = args.out ?? '.data/skin-sheet';
const idea = args.idea ?? 'A colourful all-night market at the end of the highway';
const world = args.world ?? 'worlds/gas-station-market';
const cast = args.cast ?? 'things/drinks-fridge,things/market-shelf,things/cash-register';
const looks = (args.looks ?? 'graphic-press,halftone-comic,linocut-press,old-master-light,cross-stitch,chalk-pastel,cel-animation,blueprint').split(',');
const roll = args.roll ?? '2';

const VERTEX = `varying vec3 vPos; varying vec3 vN; varying vec2 vUv;
void main() { vPos = position; vN = normalize(normalMatrix * normal); vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const DEMO = `precision highp float;
varying vec3 vPos; varying vec3 vN; varying vec2 vUv;
uniform float uScale; uniform float uIdx; uniform float uTime;
const float PI = 3.14159265;
float h21(vec2 p) { vec2 q = fract(p * vec2(123.34, 456.21)); q += dot(q, q + 45.32); return fract(q.x * q.y); }
vec2 h22(vec2 p) { float a = h21(p); return vec2(a, h21(p + a + 17.13)); }
mat2 refl(float t) { float c = cos(2.0 * t); float s = sin(2.0 * t); return mat2(vec2(c, s), vec2(s, -c)); }
const float TH[8] = float[8](0.0, 50.0, 88.0, 110.0, 180.0, 240.0, 274.0, 322.0);
mat2 foldM(int k) { mat2 F = mat2(1.0, 0.0, 0.0, 1.0); for (int i = 1; i <= k; i++) F = F * refl(radians(TH[i])); return F; }
float storms(vec2 p) {
  float cs = 0.075; vec2 ps = vec2(p.x, p.y * 0.25); vec2 c = floor(ps / cs); float m = 0.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) { vec2 cc = c + vec2(float(i), float(j));
    for (int s = 0; s < 2; s++) { vec2 r = h22(cc + float(s) * 31.7); vec2 ctr = (cc + r) * cs;
      float z = 1.0 / max(h21(cc * 1.7 + float(s) * 5.3 + 0.37), 0.02); float sg = cs * (0.14 + 0.28 * h21(cc + float(s) * 9.1));
      vec2 e = ps - ctr; m = max(m, z * exp(-dot(e, e) / (2.0 * sg * sg))); } }
  return m; }
vec3 tissue(vec2 q) {
  vec2 vd = normalize(vec2(0.94, 0.34)); float t = dot(q, vec2(-vd.y, vd.x));
  float sp = 0.0105 + 0.0012 * sin(t * 9.0); float f = fract(t / sp);
  float vein = smoothstep(0.16, 0.0, abs(f - 0.5) * 2.0 - 0.84);
  float major = smoothstep(0.012, 0.0, abs(fract(t / (sp * 7.0)) - 0.5) * sp * 7.0);
  float mid = smoothstep(0.035, 0.012, abs(t + 0.36));
  float bruise = smoothstep(0.6, 0.95, storms(q * 3.0 + uIdx) / 6.0);
  return vec3(0.6 + 0.4 * h21(floor(q * 40.0)), max(vein, max(major, mid)), bruise); }
void main() {
  vec2 q = vPos.xz * uScale + vPos.y * uScale * vec2(0.3, 0.7);
  int k = int(mod(floor((atan(q.y, q.x) + PI) / (2.0 * PI) * 8.0), 8.0));
  vec3 t = tissue(foldM(k) * q);
  vec3 leaf = mix(vec3(0.20, 0.42, 0.12), vec3(0.55, 0.72, 0.20), t.x);
  leaf = mix(leaf, vec3(0.86, 0.90, 0.45), t.y * 0.8);
  leaf = mix(leaf, vec3(0.33, 0.18, 0.12), t.z);
  float lambert = 0.35 + 0.65 * max(dot(normalize(vN), normalize(vec3(0.4, 0.8, 0.6))), 0.0);
  gl_FragColor = vec4(leaf * lambert, 1.0); }`;
const fragment = args.skin ? readFileSync(args.skin, 'utf8') : DEMO;

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => console.error('page error:', String(error).slice(0, 300)));
  let modelRequests = 0;
  await page.route('**/api/decide', (route) => { modelRequests++; return route.abort(); });
  await page.route('**/api/gallery', (route) => route.request().method() === 'POST' ? route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'sheet', day: '2026-01-01' }) }) : route.fallback());
  await page.route('**/api/gallery/entry/*/*/window', (route) => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url}' }));
  await page.goto(`${base}/?${new URLSearchParams({ offline: '', idea, world, cast, t: '1', roll })}`);
  await page.waitForFunction(() => document.title === 'conjure-ready', null, { timeout: 120_000 });
  const result = await page.evaluate(async ({ VERTEX, fragment, looks }) => {
    const { Stage } = await import('/engine/stage.ts');
    const { seeded } = await import('/kit/index.ts');
    // The same Three instance the engine uses, found through the served module's rewritten import.
    const source = await (await fetch('/engine/stage.ts')).text();
    const THREE = await import(source.match(/from\s+["']([^"']*deps\/three[^"']*)["']/)[1]);
    const stage = new Stage(document.createElement('canvas'));
    const frames = [];
    const toPng = (pixels, size) => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = size; canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels), size, size), 0, 0); return canvas; };
    const defaults = (questions) => Object.fromEntries(Object.entries(questions ?? {}).map(([key, q]) => [key, q.type === 'choice' ? Object.keys(q.options)[0] : q.type === 'score' ? 0.5 : false]));
    try {
      const plan = window.__conjure.plan;
      await stage.mount(plan);
      stage.renderer.setAnimationLoop(null);
      const context = () => ({ idea: plan.idea, mood: plan.mood, scale: plan.scale, seed: 113, random: seeded(113), palette: plan.palette });
      const plain = stage.capture();
      frames.push({ id: 'as-built', label: 'as built', canvas: stage.renderer.domElement.toDataURL('image/png') });
      const holders = [];
      stage.scene.traverse((node) => { if (typeof node.userData.captureId === 'number') holders.push(node); });
      let meshes = 0;
      for (const holder of holders) {
        const size = new THREE.Box3().setFromObject(holder).getSize(new THREE.Vector3());
        const uniforms = { uScale: { value: 1.4 / Math.max(size.x, size.y, size.z, 1e-3) }, uIdx: { value: holder.userData.captureId * 7.3 }, uTime: { value: 0 } };
        holder.traverse((node) => {
          if (!node.isMesh) return;
          const skin = (original) => new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: fragment, side: original.side ?? THREE.FrontSide, uniforms });
          node.material = Array.isArray(node.material) ? node.material.map(skin) : skin(node.material);
          meshes++;
        });
      }
      const capture = stage.capture();
      frames.push({ id: 'skin-as-seen', label: 'skin, as seen', canvas: stage.renderer.domElement.toDataURL('image/png') });
      const first = await import(`/components/looks/${looks[0]}/build.ts`);
      const reference = await first.default.apply(plain, defaults(first.default.questions), context(), AbortSignal.timeout(60_000));
      frames.push({ id: `as-built-${looks[0]}`, label: `as built, ${looks[0]}`, canvas: toPng(reference.pixels, plain.size).toDataURL('image/png') });
      const timings = {};
      for (const id of looks) {
        const started = performance.now();
        try {
          const { default: builder } = await import(`/components/looks/${id}/build.ts`);
          const printed = await builder.apply(capture, defaults(builder.questions), context(), AbortSignal.timeout(60_000));
          frames.push({ id, label: `skin, ${id}`, canvas: toPng(printed.pixels, capture.size).toDataURL('image/png') });
        } catch (error) { frames.push({ id, label: `skin, ${id}`, error: String(error).slice(0, 200) }); }
        timings[id] = Math.round(performance.now() - started);
      }
      // One sheet of everything, labelled, four to a row.
      const T = 480, pad = 12, cap = 28, cols = 4, rows = Math.ceil(frames.length / cols);
      const sheet = document.createElement('canvas'); sheet.width = cols * (T + pad) + pad; sheet.height = rows * (T + cap + pad) + pad;
      const g = sheet.getContext('2d'); g.fillStyle = '#eeece6'; g.fillRect(0, 0, sheet.width, sheet.height);
      g.fillStyle = '#282828'; g.font = '18px sans-serif';
      await Promise.all(frames.map((frame, index) => new Promise((resolve) => {
        const x = pad + (index % cols) * (T + pad), y = pad + Math.floor(index / cols) * (T + cap + pad);
        g.fillText(frame.error ? `${frame.label}: failed` : frame.label, x + 4, y + T + 20);
        if (frame.error) return resolve();
        const image = new Image(); image.onload = () => { g.drawImage(image, x, y, T, T); resolve(); }; image.src = frame.canvas;
      })));
      return { frames, sheet: sheet.toDataURL('image/png'), holders: holders.length, meshes, timings };
    } finally { stage.unmount(); stage.renderer.setAnimationLoop(null); stage.renderer.dispose(); }
  }, { VERTEX, fragment, looks });
  for (const frame of result.frames) {
    if (frame.error) { console.error(`${frame.id}: ${frame.error}`); continue; }
    writeFileSync(`${out}/${frame.id}.png`, Buffer.from(frame.canvas.split(',')[1], 'base64'));
  }
  writeFileSync(`${out}/sheet.png`, Buffer.from(result.sheet.split(',')[1], 'base64'));
  console.log(`Skinned ${result.meshes} meshes across ${result.holders} things; looks took ${Object.entries(result.timings).map(([id, ms]) => `${id} ${ms} ms`).join(', ')}. ${modelRequests} model requests. Sheet: ${out}/sheet.png`);
} finally { await browser.close(); }
