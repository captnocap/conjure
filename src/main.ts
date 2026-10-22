import { CATALOGUE, entryOf } from '../engine/catalogue';
import { Conjuring, type Plan } from '../engine/director';
import type { Ruling } from '../engine/settle';
import { type BuildReport, FRAME_SIZE, Stage } from '../engine/stage';
import { installLibrary, type Study } from './library';
import { installGalleryLink, saveToGallery } from './gallery';
import { renderTree, setTreeWaiting } from './tree';
import { installLayers } from './layers';
import { composeSeries, printPlate, showSeries, type PlateImage } from './plates';
import { SECOND_READINGS } from '../engine/presentation';
import { loopMoves, recordLoop, showLoop } from './loop';
import { installTraces } from './traces';
import { composePortrait } from './portrait';
import { MAX_IDEA_CHARACTERS } from '../engine/decision-limits';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const frame = $('.frame');
const status = $('#status');
const sheet = $('#sheet');
const ledger = $('#ledger');
const ideaInput = $<HTMLInputElement>('#idea');
const modelSelect = $<HTMLSelectElement>('#model');
const lookSelect = $<HTMLSelectElement>('#look-select');
for (const entry of CATALOGUE.filter((entry) => entry.kind === 'look')) lookSelect.append(new Option(entry.title, entry.id));
const againButton = $<HTMLButtonElement>('#again');
const firstButton = $<HTMLButtonElement>('#first');
const printCanvas = $<HTMLCanvasElement>('#print');
printCanvas.width = printCanvas.height = FRAME_SIZE;

const query = new URLSearchParams(location.search);
const offline = query.has('offline');
/** Models are named "<provider>:<model>"; the label drops the vendor path and names the provider only when several are configured. */
const providerTitles = new Map<string, string>();
function labelOf(model: string): string {
  const colon = model.indexOf(':');
  const provider = colon > 0 && providerTitles.has(model.slice(0, colon)) ? model.slice(0, colon) : '';
  const name = provider ? model.slice(colon + 1) : model;
  const short = name.split('/').pop() ?? name;
  return provider && providerTitles.size > 1 ? `${short} · ${providerTitles.get(provider)}` : short;
}
const stage = new Stage($<HTMLCanvasElement>('#stage'));
const layers = installLayers(() => showPrint(true));
let conjuring: Conjuring | null = null;
let roll = 0;
/** Answers pinned by branching in the decision tree, kept for the current idea. */
let force: Record<string, string | number | boolean> = {};
let lastTemperature = 0;
/** ?force={…} pins answers for the idea in the address, so a gallery entry can be branched from. */
let presetForce: typeof force | null = (() => {
  try {
    const parsed: unknown = JSON.parse(new URLSearchParams(location.search).get('force') ?? 'null');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as typeof force) : null;
  } catch {
    return null;
  }
})();
let running: AbortController | null = null;
let busy = false;
let studying = false;
/** Every plate of the current series on one mat, when the presentation asked for more than one. */
let series: HTMLCanvasElement | null = null;
/** The moving print, when the presentation asked for one and something on stage moves. */
let loopBlob: Blob | null = null;

const seconds = (milliseconds: number) => `${(milliseconds / 1000).toFixed(1)} s`;
const percent = (p: number) => `${Math.round(p * 100)}%`;

function say(message: string, failed = false) {
  status.textContent = message;
  status.classList.toggle('failed', failed);
}

function showPrint(on: boolean) {
  frame.classList.toggle('printed', on && printCanvas.dataset.ready === 'true');
  $('#show-print').setAttribute('aria-pressed', String(on));
  $('#show-scene').setAttribute('aria-pressed', String(!on));
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

/** The decision sheet: every question the model answered, grouped by the component that asked it. */
function renderSheet(plan: Plan, reports: BuildReport[], lookNotes: string[]) {
  sheet.replaceChildren();
  const owners = ['direction', plan.world.entry.id, ...plan.cast.map((member) => member.entry.id), ...(plan.look ? [plan.look.entry.id] : []), ...(plan.design ? ['design'] : [])];
  for (const owner of owners) {
    const rulings = plan.rulings.filter((ruling) => ruling.owner === owner && !ruling.name.startsWith('cast:'));
    const section = element('section');
    const heading = element('h2', owner === 'direction' ? `Direction${plan.direction ? `: ${plan.direction.entry.title}` : ''}` : owner === 'design' ? 'Vector composition' : entryOf(owner).title);
    const report = reports.find((candidate) => candidate.id === owner);
    const member = plan.cast.find((candidate) => candidate.entry.id === owner);
    heading.append(
      element(
        'small',
        [member && `belongs ${percent(member.belongs)}`, report && `built in ${report.milliseconds} ms`].filter(Boolean).join(' · '),
      ),
    );
    section.append(heading);
    if (report?.error) section.append(element('p', `Could not be built: ${report.error}`, 'why failed'));
    if (owner === plan.look?.entry.id && lookNotes.length) section.append(element('p', lookNotes.join(', '), 'why'));
    if (owner === 'design' && plan.design?.notes.length) section.append(element('p', plan.design.notes.join(', '), 'why'));
    const list = element('dl');
    for (const ruling of rulings) list.append(...rulingRow(ruling));
    section.append(list);
    sheet.append(section);
  }
  // Only the near-misses are worth listing: with scale-first casting the rest were never in play.
  const passed = plan.nearly ?? [];
  if (passed.length) {
    const section = element('section');
    section.append(element('h2', 'Nearly cast'), element('p', passed.map((near) => `${near.title} ${percent(near.belongs)}`).join(', '), 'why'));
    sheet.append(section);
  }
}

function rulingRow(ruling: Ruling): HTMLElement[] {
  const answer = element('dd');
  const words = element('span');
  words.append(element('b', ruling.picked.replace(/^(worlds|looks|things)\//, '').replace(/-/g, ' ')));
  if (ruling.alternatives.length)
    words.append(element('i', `  over ${ruling.alternatives.map((option) => `${option.label.replace(/-/g, ' ')} ${percent(option.p)}`).join(', ')}`));
  const meter = element('div', undefined, 'meter');
  const fill = element('span');
  fill.style.width = percent(ruling.confidence);
  meter.title = percent(ruling.confidence);
  meter.append(fill);
  answer.append(words, meter);
  if (ruling.note) answer.append(element('p', ruling.note, 'why'));
  return [element('dt', ruling.ask), answer];
}

async function conjure(temperature: number) {
  if (!conjuring || busy) return;
  busy = true;
  running?.abort();
  const control = (running = new AbortController());
  againButton.disabled = firstButton.disabled = true;
  $<HTMLButtonElement>('#ask button').disabled = true;
  $<HTMLButtonElement>('#browse').disabled = true;
  $<HTMLButtonElement>('#save-picture').disabled = true;
  lookSelect.disabled = true;
  layers.clearPrint();
  printCanvas.dataset.ready = 'false';
  frame.classList.remove('printed');
  series = null;
  showSeries(null, '');
  $<HTMLButtonElement>('#save-series').hidden = true;
  loopBlob = null;
  void showLoop(null);
  try {
    say(offline || studying ? 'Choosing a free study…' : 'Asking the model…');
    const started = performance.now();
    lastTemperature = temperature;
    setTreeWaiting(true);
    const plan = await conjuring.plan({ temperature, roll, force });
    if (control.signal.aborted) return;
    const decided = performance.now();
    say(`Decided in ${seconds(decided - started)}. Building ${plan.cast.length + 1} components…`);
    const reports = await stage.mount(plan);
    if (control.signal.aborted) return;
    const built = performance.now();
    renderSheet(plan, reports, []);
    showTree(plan, reports, []);
    // Painted faces draw over the first few frames; let them land before the frame is captured.
    await new Promise((resolve) => setTimeout(resolve, 500));
    say(`Built in ${seconds(built - decided)}. Printing…`);
    const printStarted = performance.now();
    // Capture identity for vector placement before a print's async treatment lets the scene move.
    const layerCapture = stage.capture();
    const result = await stage.develop(control.signal, layerCapture);
    if (control.signal.aborted) return;
    if (result) {
      printCanvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(result.pixels), FRAME_SIZE, FRAME_SIZE), 0, 0);
      printCanvas.dataset.ready = 'true';
      layers.setPrint(printCanvas, layerCapture, plan.seed, pictureName(), plan.design?.layers ?? []);
      showPrint($('#show-print').getAttribute('aria-pressed') === 'true');
      renderSheet(plan, reports, result.notes);
      showTree(plan, reports, result.notes);
    }
    const timing = `Decided in ${seconds(decided - started)}, built in ${seconds(built - decided)}${result ? `, printed in ${seconds(performance.now() - printStarted)}` : ''}.`;
    say(timing);
    (window as unknown as { __conjure: unknown }).__conjure = { plan, reports, notes: result?.notes ?? [] };
    let galleryPrint = result ? await layers.picture(printCanvas, control.signal) : null;
    if (control.signal.aborted) return;
    // The other plates of a series: the same settled decisions, each with its plate's mood or framing.
    const { plates, index: primary, kind } = plan.presentation;
    // A portrait: the hero alone, reframed tight and redrawn by the look, then joined with the scene.
    if (galleryPrint && kind === 'portrait' && plan.cast.length) {
      say(`${timing} Painting a portrait of ${plan.cast[0].entry.title}\u2026`);
      const scenePrint = galleryPrint;
      const shot = await stage.portrait(plan, control.signal);
      if (control.signal.aborted) return;
      if (shot?.result) {
        const portrait = document.createElement('canvas');
        portrait.width = portrait.height = FRAME_SIZE;
        portrait.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(shot.result.pixels), FRAME_SIZE, FRAME_SIZE), 0, 0);
        const blend = plan.presentation.blend ?? 'behind';
        const composite = composePortrait(portrait, shot.capture, scenePrint, blend, shot.result.accent);
        // The live stage shows the whole scene again; the print shows the portrait.
        await stage.mount(plan);
        if (control.signal.aborted) return;
        printCanvas.getContext('2d')!.drawImage(composite, 0, 0);
        layers.setPrint(printCanvas, shot.capture, plan.seed, pictureName(), []);
        showPrint(true);
        galleryPrint = composite;
        const images: PlateImage[] = [{ title: `portrait, scene ${blend}`, canvas: composite }, { title: 'the scene', canvas: scenePrint }];
        if (blend === 'beside') images[0].title = 'portrait';
        series = composeSeries(images, plan.idea);
        showSeries(images, 'portrait');
        $<HTMLButtonElement>('#save-series').hidden = false;
        say(`${timing} A portrait of ${plan.cast[0].entry.title}, the scene ${blend === 'beside' ? 'beside it' : blend}.`);
      }
    }
    const shortName = labelOf;
    const mine = conjuring.options.model ?? modelSelect.value;
    // A second critic is another configured model reading the same sentence from scratch.
    const critic = kind === 'critics' && !offline && !studying
      ? [...modelSelect.options].map((option) => option.value).find((value) => value && value !== mine) ?? null
      : null;
    const rereading = SECOND_READINGS.includes(kind) && !offline && !studying && (kind !== 'critics' || !!critic);
    const readings: string[] = [plan.idea];
    const extraReadings: Plan['usage'][] = [];
    if (galleryPrint && plates.length > 1 && kind !== 'portrait' && (!SECOND_READINGS.includes(kind) || rereading)) {
      const images: PlateImage[] = plates.map((plate) => ({ title: plate.title, canvas: galleryPrint }));
      if (kind === 'styles' && plan.look) images[primary].title = plan.look.entry.title;
      if (rereading) {
        // Later plates are whole new readings: another model, the opposite stance, or a game of telephone.
        let previous = plan;
        const used = { worlds: [plan.world.entry.id], things: plan.cast.map((member) => member.entry.id), looks: plan.look ? [plan.look.entry.id] : [] };
        if (critic) images[0].title = shortName(mine);
        for (let at = 1; at < plates.length; at++) {
          let reader: Conjuring;
          let title = plates[at].title;
          if (kind === 'critics') {
            say(`${timing} Asking a second critic, ${shortName(critic!)}…`);
            reader = new Conjuring(plan.idea, { ...conjuring.options, model: critic! });
            title = shortName(critic!);
          } else if (kind === 'opposite') {
            say(`${timing} Asking for the exact opposite…`);
            reader = new Conjuring(plan.idea, { ...conjuring.options, stance: 'opposite' });
          } else {
            const heard = describe(previous);
            readings.push(heard);
            say(`${timing} Passing it on: “${heard}”`);
            reader = new Conjuring(heard, { ...conjuring.options, exclude: { worlds: [...used.worlds], things: [...used.things], looks: [...used.looks] } });
          }
          const readPlan = await reader.plan({ temperature, roll, force: { ...force, 'direction::presentation': 'plate' } });
          if (control.signal.aborted) return;
          images[at] = { title, canvas: await printPlate(stage, readPlan, control.signal) };
          if (control.signal.aborted) return;
          extraReadings.push({ ...reader.usage });
          previous = readPlan;
          used.worlds.push(readPlan.world.entry.id);
          used.things.push(...readPlan.cast.map((member) => member.entry.id));
          if (readPlan.look) used.looks.push(readPlan.look.entry.id);
        }
      } else {
        for (let at = 0; at < plates.length; at++) {
          if (at === primary) continue;
          say(`${timing} Printing plate ${at + 1} of ${plates.length}, ${plates[at].title}…`);
          const platePlan = await conjuring.plan({ temperature, roll, force, plate: at });
          if (control.signal.aborted) return;
          const plateTitle = kind === 'styles' ? platePlan.look?.entry.title ?? plates[at].title : plates[at].title;
          images[at] = { title: plateTitle, canvas: await printPlate(stage, platePlan, control.signal) };
          if (control.signal.aborted) return;
        }
      }
      // The live scene shows the primary plate again.
      await stage.mount(plan);
      if (control.signal.aborted) return;
      series = composeSeries(images, plan.idea);
      showSeries(images, kind);
      $<HTMLButtonElement>('#save-series').hidden = false;
      say(`${timing} ${plates.length} plates printed as ${kind}.`);
    }
    // A moving print: the live scene captured frame by frame while its things move.
    let loopData: string | null = null;
    if (galleryPrint && kind === 'loop') {
      if (!loopMoves(stage, plan)) say(`${timing} Nothing in the picture moves, so the loop stays a still plate.`);
      else {
        loopBlob = await recordLoop(stage, plan, control.signal, (index) => say(`${timing} Recording the loop, frame ${index + 1}…`));
        if (control.signal.aborted) return;
        loopData = await showLoop(loopBlob);
        say(loopBlob ? `${timing} A moving print of ${Math.round(loopBlob.size / 1024)} kB.` : `${timing} This browser cannot record a loop.`);
      }
    }
    const { usage } = conjuring;
    const extraUsage = extraReadings.length
      ? extraReadings.reduce((sum, item) => ({ ...sum, requests: sum.requests + item.requests, inputTokens: sum.inputTokens + item.inputTokens, costUsd: sum.costUsd + item.costUsd, milliseconds: sum.milliseconds + item.milliseconds }))
      : null;
    ledger.textContent = offline || studying
      ? `${studying ? 'Catalogue study' : 'Offline'}: free random variations. No model was asked.`
      : `${usage.model} · ${usage.requests} requests · ${usage.inputTokens.toLocaleString()} tokens · $${usage.costUsd.toFixed(5)} for this idea${
        extraUsage ? ` · ${kind === 'critics' ? `second critic ${extraUsage.model}` : `${kind} readings`}: ${extraUsage.requests} requests, $${extraUsage.costUsd.toFixed(5)}` : ''}`;
    void saveToGallery({
      plan, reports, notes: result?.notes ?? [], temperature, roll,
      source: studying ? 'study' : offline ? 'offline' : 'model',
      model: studying || offline ? null : (conjuring.options.model ?? plan.usage.model ?? null),
      force,
      scene: $<HTMLCanvasElement>('#stage'), print: galleryPrint, series, readings, loop: loopData,
    });
    document.title = 'conjure-ready';
    $('#scene-caption').textContent = `${plan.world.entry.title} · ${plan.scale} · ${reports.filter((report) => !report.error && report.id.startsWith('things/')).length} things`;
    $<HTMLButtonElement>('#save-picture').disabled = false;
  } catch (error) {
    if (control.signal.aborted) return;
    console.error(error);
    say(error instanceof Error ? error.message : String(error), true);
    document.title = 'conjure-failed';
  } finally {
    setTreeWaiting(false);
    if (running === control) {
      // Every still has been taken from the held scene; let the live preview move.
      stage.play();
      busy = false;
      againButton.disabled = firstButton.disabled = false;
      $<HTMLButtonElement>('#ask button').disabled = false;
      $<HTMLButtonElement>('#browse').disabled = false;
      lookSelect.disabled = false;
    }
  }
}

/** One line that passes a settled scene on, as in a game of telephone: the mood, the place, the things, the print. */
function describe(plan: Plan): string {
  const moods = plan.rulings.filter((ruling) => ruling.owner === 'direction' && ['cheer', 'wear', 'energy'].includes(ruling.name)).map((ruling) => ruling.picked.toLowerCase());
  const line = `${moods.join(', ')}. ${plan.world.entry.title} with ${plan.cast.map((member) => member.entry.title.toLowerCase()).join(', ') || 'nothing in it'}${plan.look ? `, printed as ${plan.look.entry.title.toLowerCase()}` : ''}.`;
  return line.length > MAX_IDEA_CHARACTERS ? `${line.slice(0, MAX_IDEA_CHARACTERS - 1)}…` : line;
}

/** Draw the decision tree; clicking another answer pins it and rebuilds this same roll. */
function showTree(plan: Plan, reports: BuildReport[], notes: string[]) {
  renderTree(plan, reports, notes, force, {
    pin(key, value) {
      if (busy) return;
      if (value === undefined) delete force[key];
      else {
        force[key] = value;
        if (key === 'direction::medium') delete force['direction::look'];
        if (key === 'direction::look') delete force['direction::medium'];
      }
      void conjure(lastTemperature);
    },
    reset() {
      if (busy) return;
      force = {};
      void conjure(lastTemperature);
    },
  });
}

async function begin(idea: string, temperature = 0, study?: Study) {
  if (busy) return;
  // Traced pictures join the catalogue at runtime; an idea's casting snapshot must include them.
  if (!offline && !study) await traceLibrary.ready().catch(() => undefined);
  if (busy) return;
  force = presetForce ?? {};
  presetForce = null;
  document.title = 'Conjure';
  roll = Number(query.get('roll') ?? 0);
  studying = !!study;
  conjuring = new Conjuring(idea, {
    offline: offline || studying, plain: offline || studying, model: modelSelect.value || undefined,
    ...(studying ? { look: 'looks/graphic-press' } : {}), ...study,
    ...(lookSelect.value ? { look: lookSelect.value } : {}),
  });
  if (studying) showPrint(false);
  void conjure(temperature);
}

installGalleryLink();
const traceLibrary = installTraces();
installLibrary({
  useIdea(idea) { ideaInput.value = idea; ideaInput.focus(); },
  study(idea, study) { ideaInput.value = idea; void begin(idea, 1, study); },
});

$<HTMLFormElement>('#ask').addEventListener('submit', (event) => {
  event.preventDefault();
  const idea = ideaInput.value.trim();
  if (idea) void begin(idea);
});
againButton.addEventListener('click', () => {
  roll++;
  void conjure(1);
});
firstButton.addEventListener('click', () => void conjure(0));
$('#show-print').addEventListener('click', () => showPrint(true));
$('#show-scene').addEventListener('click', () => showPrint(false));
function pictureName() {
  return (conjuring?.idea ?? 'conjure').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'conjure';
}

$('#save-loop').addEventListener('click', () => {
  if (!loopBlob) return;
  const link = document.createElement('a');
  link.download = `${pictureName()}-loop-roll-${roll}.webm`;
  link.href = URL.createObjectURL(loopBlob);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 30_000);
});

$('#save-series').addEventListener('click', () => {
  if (!series) return;
  const link = document.createElement('a');
  link.download = `${pictureName()}-series-roll-${roll}.png`;
  link.href = series.toDataURL('image/png');
  link.click();
});

$('#save-picture').addEventListener('click', async () => {
  const printed = frame.classList.contains('printed');
  const button = $<HTMLButtonElement>('#save-picture');
  const name = `${pictureName()}-${printed ? 'print' : 'scene'}-roll-${roll}.png`;
  button.disabled = true;
  try {
    const canvas = printed ? await layers.picture(printCanvas, AbortSignal.timeout(15_000)) : $<HTMLCanvasElement>('#stage');
    const link = document.createElement('a');
    link.download = name;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    say(`Could not save the picture: ${error instanceof Error ? error.message : String(error)}`, true);
  } finally { if (!busy) button.disabled = false; }
});

if (!offline) {
  const response = await fetch('/api/status').catch(() => null);
  if (response?.ok) {
    const { configured, models, defaultModel, providers } = (await response.json()) as { configured: boolean; models: string[]; defaultModel: string | null; providers?: { id: string; title: string }[] };
    for (const provider of providers ?? []) providerTitles.set(provider.id, provider.title);
    for (const model of models) modelSelect.append(new Option(labelOf(model), model, model === defaultModel, model === defaultModel));
    if (!configured) say('No decision provider is configured. Add an API key (TYPESAFE_API_KEY, OPENROUTER_API_KEY, NANO_GPT_API_KEY or CONJURE_API_KEY) to the .env file and restart the server.', true);
  } else say('The decision server is not running. Start it with npm run dev.', true);
}

// ?idea=…&t=1&roll=2 conjures on load, for screenshots and tests.
const preset = query.get('idea');
const presetLook = query.get('look');
if (presetLook && CATALOGUE.some((entry) => entry.kind === 'look' && entry.id === presetLook)) lookSelect.value = presetLook;
if (preset) {
  ideaInput.value = preset;
  const world = query.get('world');
  const forcedWorld = world && CATALOGUE.find((entry) => entry.id === world && entry.kind === 'world');
  const cast = (query.get('cast') ?? '').split(',').filter((id) => CATALOGUE.some((entry) =>
    entry.id === id && entry.kind === 'thing' && (!forcedWorld || entry.scales.some((scale) => forcedWorld.scales.includes(scale))),
  ));
  if (query.has('world') && !forcedWorld) {
    say('That world is not in the catalogue. Choose a world from Explore library.', true);
    document.title = 'conjure-failed';
  } else void begin(preset, Number(query.get('t') ?? 0), forcedWorld ? { world: forcedWorld.id, cast } : undefined);
}
