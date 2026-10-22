// Conformance check for one component: build it several times with random answers and
// hold it to the contract. /dev/check.html?id=things/chair&rolls=6
import * as THREE from 'three';
import { type Scale, visibleBounds } from '@conjure/kit';
import { entriesOf, entryOf, loadBuilder } from '../engine/catalogue';
import { hashText, seeded } from '@conjure/kit';
import { Conjuring } from '../engine/director';
import { Stage } from '../engine/stage';

interface Trial {
  roll: number;
  answers: Record<string, unknown>;
  milliseconds: number;
  size: [number, number, number] | null;
  problems: string[];
}

const query = new URLSearchParams(location.search);
const initialId = query.get('id') ?? '';
const rolls = Number(query.get('rolls') ?? 6);
const maxMs = Number(query.get('maxMs') ?? 8000);
const status = document.querySelector<HTMLElement>('#status')!;
const sheet = document.querySelector<HTMLElement>('#sheet')!;
const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const stage = new Stage(canvas);
const restingChildren = stage.scene.children.length;
const trials: Trial[] = [];
const checkWindow = window as unknown as { __check?: Trial[]; __runCheck(id: string): Promise<void> };
let running = false;
const frames = (count: number) => new Promise<void>((resolve) => {
  const step = () => (--count <= 0 ? resolve() : requestAnimationFrame(step));
  requestAnimationFrame(step);
});

const errors: string[] = [];
const TEST_WORLDS: Record<Scale, string> = {
  cosmic: 'worlds/deep-space', planetary: 'worlds/orbital-theatre',
  landscape: 'worlds/desert-basin', street: 'worlds/street-corner',
  room: 'worlds/tiled-room', tabletop: 'worlds/worktable', macro: 'worlds/specimen-slide',
};
const consoleError = console.error.bind(console);
console.error = (...parts: unknown[]) => {
  errors.push(parts.map((part) => (part instanceof Error ? part.message : String(part))).join(' ').slice(0, 300));
  consoleError(...parts);
};
window.addEventListener('error', (event) => errors.push(event.message));
window.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason).slice(0, 300)));

// Finish module evaluation before building: p5 waits for window.load, which a
// top-level await would hold open forever for things with painted faces.
async function run(id: string) {
if (running) throw new Error('A component check is already running.');
running = true;
trials.length = 0;
errors.length = 0;
sheet.replaceChildren();
status.textContent = 'Starting…';
status.className = '';
document.title = 'check-running';
checkWindow.__check = undefined;
try {
  const entry = entryOf(id);
  document.querySelector('#title')!.textContent = `${entry.title} · ${id}`;
  if (entry.kind === 'direction') throw new Error(`${id} is a direction: it is read, not built. npm test checks it.`);
  for (let roll = 0; roll < rolls; roll++) {
    status.textContent = `Roll ${roll + 1} of ${rolls}…`;
    const problems: string[] = [];
    errors.length = 0;
    // Exercise placement at capacity with varied compatible geometry. Legacy painted
    // ateliers are checked separately; importing one here makes a world's own timing
    // depend on a different component's face-engine startup and shader complexity.
    const eligible = entriesOf('thing').filter((thing) =>
      thing.scales.some((scale) => entry.scales.includes(scale)) &&
      !['chair', 'tree', 'robot', 'hover-car', 'street-sign', 'staircase'].includes(thing.id.split('/')[1]),
    );
    const worldCast = Array.from({ length: Math.min(6, eligible.length) }, (_, index) => eligible[(roll * 5 + index) % eligible.length].id);
    const conjuring = new Conjuring(`check ${id}`, {
      offline: true,
      plain: true,
      ...(entry.kind === 'thing' ? { cast: [id], world: TEST_WORLDS[entry.scales[0]] } : {}),
      ...(entry.kind === 'world' ? { world: id, cast: worldCast } : {}),
      ...(entry.kind === 'look' ? { look: id, world: 'worlds/plinth', cast: ['things/market-shelf', 'things/gas-pump', 'things/vending-machine'] } : {}),
      ...(entry.kind !== 'look' ? { look: 'looks/graphic-press' } : {}),
    });
    // Offline, nothing steers the answers, so a rare option could go unseen for six rolls. Instead the
    // rolls walk every choice in turn, sweep the scores, and alternate the yes/no questions, while the
    // mood is neutral on roll 0, all low on roll 1, all high on roll 2 and drawn at random after that.
    const force: Record<string, string | number | boolean> = {};
    const questions = (await loadBuilder(entry)).questions;
    Object.entries(questions).forEach(([name, question], index) => {
      const key = `${id}::${name}`;
      if (question.type === 'choice') {
        const keys = Object.keys(question.options);
        force[key] = keys[(roll + index) % keys.length];
      } else if (question.type === 'score') force[key] = rolls > 1 ? ((roll + index) % rolls) / (rolls - 1) : 0.5;
      else force[key] = (roll + index) % 2 === 0;
    });
    const dice = seeded(hashText(`${id}:mood:${roll}`));
    for (const key of ['wear', 'warmth', 'energy', 'density', 'daylight', 'cheer']) force[`direction::${key}`] = roll === 0 ? 0.5 : roll === 1 ? 0 : roll === 2 ? 1 : +dice().toFixed(2);
    const plan = await conjuring.plan({ temperature: 1, roll, force });
    const member = entry.kind === 'thing' ? plan.cast[0] : entry.kind === 'world' ? plan.world : plan.look!;
    const environment = stage.scene.environment;
    const fog = stage.scene.fog;
    const started = performance.now();
    let size: Trial['size'] = null;
    let printed: Uint8ClampedArray | null = null;
    try {
      const reports = await stage.mount(plan);
      const report = reports.find((candidate) => candidate.id === id);
      if (report?.error) problems.push(`build threw: ${report.error}`);
      await frames(20);
      if (entry.kind === 'thing' && !report?.error) {
        let thing: THREE.Object3D | undefined;
        stage.scene.traverse((node) => {
          if (node.userData.captureId === 3) thing = node;
        });
        if (!thing) problems.push('nothing was placed on stage');
        else {
          const scale = thing.scale.x || 1;
          const position = thing.position.clone();
          const bounds = visibleBounds(thing);
          if (bounds.isEmpty()) problems.push('nothing visible was built');
          else {
            // Undo the world's placement to read the thing in its own metres.
            const extent = bounds.getSize(new THREE.Vector3()).divideScalar(scale);
            const centre = bounds.getCenter(new THREE.Vector3()).sub(position).divideScalar(scale);
            const base = (bounds.min.y - position.y) / scale;
            size = [extent.x, extent.y, extent.z].map((value) => +value.toFixed(2)) as [number, number, number];
            const largest = Math.max(extent.x, extent.y, extent.z);
            if (largest < 0.005 || largest > 2000) problems.push(`implausible size: ${largest.toFixed(3)} m`);
            // Roots and footings may run below ground, where the world buries them. Floating is the fault.
            if (base > Math.max(0.3, extent.y * 0.35)) problems.push(`floats: its lowest point is ${base.toFixed(2)} m above y = 0`);
            if (Math.hypot(centre.x, centre.z) > Math.max(0.5, Math.max(extent.x, extent.z) * 0.6)) problems.push('is not centred on the origin');
          }
        }
      }
      if (entry.kind === 'look') {
        const result = await stage.develop(AbortSignal.timeout(60_000));
        if (!result) problems.push('the look produced nothing');
        else if (result.pixels.length !== 720 * 720 * 4) problems.push(`returned ${result.pixels.length} bytes, expected ${720 * 720 * 4}`);
        else printed = result.pixels;
      } else stage.capture();
      if (stage.scene.environment !== environment || stage.scene.fog !== fog) problems.push('changed the scene environment or fog, which belong to the engine and the world');
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
    }
    const milliseconds = Math.round(performance.now() - started);
    if (milliseconds > maxMs) problems.push(`took ${milliseconds} ms (allowance ${maxMs} ms)`);
    for (const message of new Set(errors)) problems.push(`console error: ${message}`);

    const figure = document.createElement('figure');
    const image = new Image();
    const picture = printed ? document.createElement('canvas') : canvas;
    if (printed) {
      picture.width = picture.height = 720;
      picture.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(printed), 720, 720), 0, 0);
    }
    image.src = picture.toDataURL('image/jpeg', 0.85);
    const caption = document.createElement('figcaption');
    caption.className = problems.length ? 'failed' : '';
    caption.textContent = `roll ${roll} · ${milliseconds} ms · mood ${roll === 0 ? 'all 0.5' : roll === 1 ? 'all 0' : roll === 2 ? 'all 1' : JSON.stringify(plan.mood)} · ${JSON.stringify(member.answers)}${problems.length ? ` · ${problems.join('; ')}` : ''}`;
    figure.append(image, caption);
    sheet.append(figure);
    trials.push({ roll, answers: member.answers, milliseconds, size, problems });

    stage.unmount();
    if (stage.scene.children.length !== restingChildren) trials.at(-1)!.problems.push('left objects in the scene after disposal');
  }
  const failed = trials.filter((trial) => trial.problems.length).length;
  status.textContent = failed ? `${failed} of ${rolls} rolls have problems.` : `All ${rolls} rolls passed.`;
  status.className = failed ? 'failed' : '';
} catch (error) {
  status.textContent = error instanceof Error ? error.message : String(error);
  status.className = 'failed';
  trials.push({ roll: -1, answers: {}, milliseconds: 0, size: null, problems: [status.textContent] });
  // An unexpected failure may happen before the normal per-roll disposal. A reusable
  // page must not retain that mounted scene; the failure remains in this trial.
  try { stage.unmount(); } catch (cleanupError) {
    trials.at(-1)!.problems.push(`cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
  }
}
checkWindow.__check = trials;
running = false;
document.title = 'check-ready';
}
checkWindow.__runCheck = run;
void run(initialId);
