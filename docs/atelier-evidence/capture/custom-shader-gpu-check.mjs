/** Standalone, offline GPU regression. Writes task evidence; does not edit the repository. */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(new URL('./conjure/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const directory = resolve(process.env.CUSTOM_PROFILE_OUT ?? 'evidence/custom-shader-profiles');
mkdirSync(directory, { recursive: true });
const report = { started: new Date().toISOString(), base, size: 384, completed: false, passed: false, problems: [], pageErrors: [], consoleErrors: [], blockedRequests: [], cases: [], fixtureProfiles: [], image: 'actual2color.png' };
const save = () => writeFileSync(`${directory}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  page.on('pageerror', error => { report.pageErrors.push(error.message); save(); });
  page.on('console', message => { if (message.type() === 'error') { report.consoleErrors.push(message.text()); save(); } });
  await page.route('**/api/**', async route => {
    const request = route.request();
    if (request.method() !== 'GET') { report.blockedRequests.push(`${request.method()} ${request.url()}`); await route.abort('blockedbyclient'); save(); }
    else await route.continue();
  });
  await page.route('**/@vite/client', route => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return{data:{},accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){}}}export function injectQuery(url){return url}' }));
  await page.goto(`${base}/dev/atelier-check.html`);
  await page.waitForFunction(() => document.title === 'atelier-check-ready');
  const result = await page.evaluate(async size => {
    // Vite may timestamp Stage's imported module after a source edit. Patch that
    // exact loaded identity, rather than creating a second CaptureRig class.
    const capturePath = performance.getEntriesByType('resource').map(entry => entry.name)
      .filter(url => /\/engine\/capture(?:\.ts)?$/.test(new URL(url).pathname)).at(-1);
    if (!capturePath) throw Error('The page did not record its actual CaptureRig module URL.');
    const sourceResponse = await fetch(capturePath);
    if (!sourceResponse.ok) throw Error(`Capture module returned ${sourceResponse.status}.`);
    const source = await sourceResponse.text();
    const threePath = source.match(/import\s+\*\s+as\s+THREE\s+from\s+["']([^"']+)["']/)?.[1];
    if (!threePath) throw Error('Could not resolve the exact Three module used by CaptureRig.');
    const [THREE, { CaptureRig }] = await Promise.all([import(threePath), import(capturePath)]);
    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(size, size, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
    const rig = new CaptureRig(renderer, size);
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 10);
    camera.position.set(0, 0, 4); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const pigments = [[0.8, 0.1, 0.15], [0.1, 0.65, 0.25]];
    const hash = values => { let result = 2166136261; for (const value of values) result = Math.imul(result ^ value, 16777619); return (result >>> 0).toString(16).padStart(8, '0'); };
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const srgb = value => Math.round(255 * (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055));
    function build(raw) {
      const scene = new THREE.Scene(); scene.background = new THREE.Color('#ede9df');
      const geometry = new THREE.PlaneGeometry(1.4, 2.4);
      const vertex = `${raw ? 'precision highp float;\nattribute vec3 position;\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\n' : ''}void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
      const fragment = 'precision highp float;\nuniform vec3 pigment;\nvec3 displayColor(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }\nvoid main(){ gl_FragColor = vec4(displayColor(pigment), 1.0); }';
      const companions = pigments.map(rgb => {
        const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), toneMapped: false });
        material.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <colorspace_fragment>', ''); };
        return material;
      });
      const materials = pigments.map((rgb, index) => {
        const material = new (raw ? THREE.RawShaderMaterial : THREE.ShaderMaterial)({ vertexShader: vertex, fragmentShader: fragment, uniforms: { pigment: { value: new THREE.Color(...rgb) } }, toneMapped: false });
        material.userData.atelierAlbedoMaterial = companions[index];
        return material;
      });
      const meshes = materials.map((material, index) => {
        const mesh = new THREE.Mesh(geometry, material); mesh.position.x = index ? 0.85 : -0.85; scene.add(mesh); return mesh;
      });
      scene.add(new THREE.AmbientLight(0xffffff, 1));
      return { scene, materials, companions, meshes, dispose() { geometry.dispose(); for (const material of [...materials, ...companions]) material.dispose(); } };
    }
    function inspect(frame, expected = pigments) {
      const probes = [-0.85, 0.85].map((x, side) => {
        const pixel = Math.floor(size / 2) * size + Math.floor((x + 2) / 4 * size), offset = pixel * 4;
        return { side: side ? 'right' : 'left', expectedLinear: expected[side], albedo: Array.from(frame.atelier.albedo.slice(offset, offset + 4)), color: Array.from(frame.color.slice(offset, offset + 4)), token: frame.atelier.transmission[offset + 1] * 256 + frame.atelier.transmission[offset + 2], owner: frame.identity[offset] };
      });
      return { tokens: probes.map(probe => probe.token), owners: probes.map(probe => probe.owner), probes, profiles: frame.atelier.materialProfiles, colorHash: hash(frame.color), albedoHash: hash(frame.atelier.albedo), transmissionHash: hash(frame.atelier.transmission) };
    }
    const capture = scene => rig.capture(scene, camera, () => 2, null);
    const cases = []; let image;
    try {
      for (const raw of [false, true]) {
        const firstScene = build(raw), rebuiltScene = build(raw);
        const kind = raw ? 'RawShaderMaterial' : 'ShaderMaterial', problems = [];
        try {
          const frame = capture(firstScene.scene), first = inspect(frame);
          if (!raw) {
            const output = document.createElement('canvas'); output.width = output.height = size;
            output.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(frame.color), size, size), 0, 0);
            image = output.toDataURL('image/png');
          }
          const sameProgram = firstScene.materials[0].vertexShader === firstScene.materials[1].vertexShader && firstScene.materials[0].fragmentShader === firstScene.materials[1].fragmentShader && firstScene.materials[0].customProgramCacheKey() === firstScene.materials[1].customProgramCacheKey();
          if (!sameProgram) problems.push('Fixture custom programs unexpectedly differ.');
          if (first.owners.some(owner => owner !== 2)) problems.push('The two pixels do not share owner2.');
          if (first.tokens.some(token => !token) || first.tokens[0] === first.tokens[1]) problems.push('Different custom uniform pigments collapsed to one profile token.');
          for (const probe of first.probes) {
            if (probe.expectedLinear.some((value, channel) => Math.abs(probe.albedo[channel] - Math.round(value * 255)) > 1)) problems.push(`${probe.side} linear albedo does not match its explicit companion.`);
            if (probe.expectedLinear.some((value, channel) => Math.abs(probe.color[channel] - srgb(value)) > 1)) problems.push(`${probe.side} display pixel does not match its shader uniform.`);
          }
          const second = inspect(capture(firstScene.scene));
          const repeat = { sameTokens: same(first.tokens, second.tokens), sameProfiles: same(first.profiles, second.profiles), samePixels: first.colorHash === second.colorHash && first.albedoHash === second.albedoHash && first.transmissionHash === second.transmissionHash };
          if (Object.values(repeat).some(value => !value)) problems.push('Reusing the same instances changed the captured identity or pixels.');
          const fresh = inspect(capture(rebuiltScene.scene));
          const rebuilt = { newInstances: firstScene.materials.every((material, i) => material.uuid !== rebuiltScene.materials[i].uuid), sameTokens: same(first.tokens, fresh.tokens), sameProfiles: same(first.profiles, fresh.profiles), samePixels: first.colorHash === fresh.colorHash && first.albedoHash === fresh.albedoHash && first.transmissionHash === fresh.transmissionHash };
          if (Object.values(rebuilt).some(value => !value)) problems.push('Rebuilding the same scene changed profile tokens, descriptors or pixels.');
          firstScene.meshes[1].material = firstScene.materials[0];
          const shared = inspect(capture(firstScene.scene), [pigments[0], pigments[0]]);
          const sharedInstance = { tokens: shared.tokens, singleProfile: shared.tokens[0] > 0 && shared.tokens[0] === shared.tokens[1] && shared.profiles.length === 2, reusedTokenMatches: shared.tokens[0] === first.tokens[0], samePigment: same(shared.probes[0].albedo, shared.probes[1].albedo) };
          if (!sharedInstance.singleProfile || !sharedInstance.reusedTokenMatches || !sharedInstance.samePigment) problems.push('One shared material instance did not preserve a single stable pigment/profile.');
          firstScene.meshes[1].material = firstScene.materials[1];
          const restored = inspect(capture(firstScene.scene));
          const restore = { sameTokens: same(first.tokens, restored.tokens), sameProfiles: same(first.profiles, restored.profiles), samePixels: first.colorHash === restored.colorHash && first.albedoHash === restored.albedoHash && first.transmissionHash === restored.transmissionHash };
          if (Object.values(restore).some(value => !value)) problems.push('Restoring the second material after instance sharing changed the capture.');
          cases.push({ kind, sameProgram, first, repeat, rebuilt, sharedInstance, restore, problems });
        } finally { firstScene.dispose(); rebuiltScene.dispose(); }
      }
    } finally { rig.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
    const originalCapture = CaptureRig.prototype.capture;
    let recorded = [];
    CaptureRig.prototype.capture = function (...args) {
      const frame = originalCapture.apply(this, args);
      recorded.push({ types: [...new Set((frame.atelier?.materialProfiles ?? []).filter(Boolean).map(profile => JSON.parse(profile).type))] });
      return frame;
    };
    window.__customProfileAudit = {
      async start(fixture) {
        recorded = [];
        const result = await window.__atelierCheck.start(fixture);
        const types = [...new Set(recorded.flatMap(frame => frame.types))].sort();
        const customTypes = types.filter(type => type === 'ShaderMaterial' || type === 'RawShaderMaterial');
        const problems = [...result.problems];
        if (!recorded.length) problems.push('CaptureRig instrumentation did not observe the actual fixture capture.');
        if (customTypes.length) problems.push(`Earlier fixture contains custom shader profiles: ${customTypes.join(', ')}.`);
        await window.__atelierCheck.finish();
        return { fixture, captures: recorded.length, types, customTypes, problems };
      },
      restore() { CaptureRig.prototype.capture = originalCapture; },
    };
    return { cases, image, threePath, capturePath };
  }, report.size);
  report.cases = result.cases; report.threeModule = result.threePath; report.captureModule = result.capturePath;
  if (!result.image?.startsWith('data:image/png;base64,')) throw Error('No rendered PNG returned.');
  writeFileSync(`${directory}/${report.image}`, Buffer.from(result.image.slice('data:image/png;base64,'.length), 'base64'));
  for (const entry of report.cases) { report.problems.push(...entry.problems.map(problem => `${entry.kind}: ${problem}`)); console.log(`${entry.problems.length ? 'FAIL' : 'pass'} ${entry.kind}: tokens ${entry.first.tokens.join(', ')}, rebuild/reuse checked`); }
  save();
  for (const fixture of ['tabletop', 'room', 'street', 'perspective', 'topology']) {
    const evidence = await page.evaluate(name => window.__customProfileAudit.start(name), fixture);
    report.fixtureProfiles.push(evidence); report.problems.push(...evidence.problems.map(problem => `${fixture}: ${problem}`));
    console.log(`${evidence.problems.length ? 'FAIL' : 'pass'} fixture ${fixture}: ${evidence.types.join(', ')}`); save();
  }
  await page.evaluate(() => window.__customProfileAudit.restore());
  report.completed = true;
} catch (error) { report.problems.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error)); console.error(error); }
finally {
  await browser.close();
  report.finished = new Date().toISOString();
  report.passed = report.completed && !report.problems.length && !report.pageErrors.length && !report.consoleErrors.length && !report.blockedRequests.length;
  save();
}
console.log(`${report.passed ? 'PASS' : 'FAIL'} — evidence ${directory}`);
process.exitCode = report.passed ? 0 : 1;
