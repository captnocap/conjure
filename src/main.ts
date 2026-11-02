import { CATALOGUE, entryOf } from '../engine/catalogue';
import { Conjuring, type Plan } from '../engine/director';
import type { Ruling } from '../engine/settle';
import { type BuildReport, FRAME_SIZE, Stage } from '../engine/stage';
import { installLibrary, type Study } from './library';
import { installGalleryLink, saveToGallery, saveWindowToGallery } from './gallery';
import { renderTree, setTreeWaiting } from './tree';
import { installLayers } from './layers';
import { composeSeries, printPlate, showSeries, type PlateImage } from './plates';
import { SECOND_READINGS } from '../engine/presentation';
import { loopMoves, recordLoop, showLoop } from './loop';
import { installTraces } from './traces';
import { composePortrait } from './portrait';
import { MAX_IDEA_CHARACTERS } from '../engine/decision-limits';
import { announce } from '../engine/activity';
import { installActivity } from './activity';
import { installPrompt } from './prompt';
import { wear } from './skin';
import { installWordmark, type LetterPrint } from './wordmark';
import { installInterlude } from './interlude';
import { fileOf, installDock, type GalleryEntry } from './dock';
import { eyebrowOf, renderEntryRows, renderTitle } from './facts';
import { developWindow, filmOf, installWindowPrint, measureWindow, type WindowView } from './window';
import { replayOf, type Replay, type SavedRecord } from './replay';
import type { Capture } from '@conjure/kit';

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
/** Plays in the frame between one picture and the next, instead of the bare scene being built. */
const interlude = installInterlude(frame, () => syncStage());
/** The last finished picture, sheets and all, for the next interlude to break up. */
let lastPicture: HTMLCanvasElement | null = null;
const layers = installLayers(() => showPrint(true));
const activity = installActivity($('#activity'));
installPrompt($<HTMLFormElement>('#ask'), ideaInput);
/** On the blank page, the print of a hovered letter, worn as the page's backdrop. */
const backdrop = Object.assign(document.createElement('div'), { id: 'backdrop' });
backdrop.setAttribute('aria-hidden', 'true');
// Two layers, so one letter's print crossfades into the next.
const backdropLayers = [document.createElement('i'), document.createElement('i')];
backdrop.append(...backdropLayers);
document.body.prepend(backdrop);
let backdropUrl = '';
const blank = () => document.body.dataset.state === 'idle' && !document.body.classList.contains('history') && !current;
function wearBackdrop(print: LetterPrint | null) {
  if (print && blank()) {
    if (print.url !== backdropUrl) {
      backdropUrl = print.url;
      const [shown, hidden] = backdropLayers[0].classList.contains('shown') ? backdropLayers : [backdropLayers[1], backdropLayers[0]];
      hidden.style.backgroundImage = `url("${print.url}")`;
      hidden.classList.add('shown');
      shown.classList.remove('shown');
    }
    document.body.classList.add('backdropped');
    wear(print.image, print.look);
  } else if (document.body.classList.contains('backdropped')) {
    document.body.classList.remove('backdropped');
    if (blank()) wear(null);
  }
}
const wordmark = installWordmark($('#wordmark'), { hover: wearBackdrop });
const dock = installDock($('#dock'), showHistory);
const facts = $('#facts');
const historyFacts = $('#history-facts');
const historyPrint = $<HTMLImageElement>('#history-print');
/** The idea on the page now, so the column can return to it after a look through the gallery. */
let current: { idea: string; eyebrow: string; look: string | null; picture: CanvasImageSource } | null = null;
const windowPrint = installWindowPrint(frame);
/** The current idea's window print, once developed. */
let currentWindow: { url: string; view: WindowView; canvas: HTMLCanvasElement } | null = null;

/** The page is blank but for the prompt until an idea is typed; then it thinks, builds, and is ready or has failed. */
type State = 'idle' | 'thinking' | 'building' | 'ready' | 'failed';
function setState(state: State) {
  document.body.dataset.state = state;
}
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
  syncStage();
}

/** The live stage draws only while it can be seen: not under a print, a gallery picture or the window print. */
function syncStage() {
  const body = document.body.classList;
  stage.visible = !frame.classList.contains('printed') && !body.contains('history') && !body.contains('window-view') && !interlude.active;
}

/** The window print filling the whole window, the studio set aside; Escape or the button brings it back. */
function windowView(on: boolean) {
  document.body.classList.toggle('window-view', on && windowPrint.shown);
  $('#window-exit').hidden = !document.body.classList.contains('window-view');
  $('#show-window').setAttribute('aria-pressed', String(document.body.classList.contains('window-view')));
  windowPrint.place();
  syncStage();
}

function clearWindow() {
  windowView(false);
  windowPrint.clear();
  if (currentWindow) URL.revokeObjectURL(currentWindow.url);
  currentWindow = null;
  $('#show-window').hidden = $('#save-window').hidden = true;
}

/** Develop the widened capture after the picture is ready, then lay it behind the page and keep it with the entry. */
async function widen(plan: Plan, capture: Capture, view: WindowView, control: AbortController, saved: Promise<{ day: string; id: string } | null>) {
  const started = performance.now();
  Object.assign((window as unknown as { __conjure: object }).__conjure ?? {}, { window: view });
  announce({ type: 'step', stage: 'window', title: 'Window', detail: `widening the scene to fill this ${Math.round(view.width)} × ${Math.round(view.height)} window` });
  try {
    // Let the finished page paint before the long develop.
    await new Promise((resolve) => setTimeout(resolve, 80));
    const canvas = await developWindow(stage, plan, capture, view, control.signal);
    if (control.signal.aborted) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob || control.signal.aborted) return;
    currentWindow = { url: URL.createObjectURL(blob), view, canvas };
    if (!document.body.classList.contains('history')) windowPrint.show(currentWindow.url, view);
    $('#show-window').hidden = $('#save-window').hidden = false;
    announce({ type: 'step', stage: 'window', title: 'Window', detail: `${canvas.width} × ${canvas.height}, the frame its crop · ${seconds(performance.now() - started)}`, done: true });
    const where = await saved;
    if (where && !control.signal.aborted) await saveWindowToGallery(where, canvas, view);
  } catch (error) {
    if (control.signal.aborted) return;
    console.warn('The window print failed:', error);
    announce({ type: 'step', stage: 'window', title: 'Window', detail: 'the scene could not be widened this time', done: true });
  }
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
  // The picture on show breaks up and keeps moving while the next one is decided, built and printed.
  if (lastPicture && document.body.classList.contains('scened')) interlude.start(lastPicture, `${conjuring.idea}\u0000${roll}\u0000${JSON.stringify(force)}`);
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
  leaveHistory();
  clearWindow();
  wearBackdrop(null);
  announce({ type: 'begin', idea: conjuring.idea });
  setState('thinking');
  try {
    say(offline || studying ? 'Choosing a free study…' : 'Asking the model…');
    const started = performance.now();
    lastTemperature = temperature;
    setTreeWaiting(true);
    const plan = await conjuring.plan({ temperature, roll, force });
    if (control.signal.aborted) return;
    const decided = performance.now();
    say(`Decided in ${seconds(decided - started)}. Building ${plan.cast.length + 1} components…`);
    setState('building');
    current = { idea: plan.idea, eyebrow: eyebrowOf(plan.look?.entry.id, plan.scale, plan.presentation.kind), look: plan.look?.entry.id ?? null, picture: $<HTMLCanvasElement>('#stage') };
    renderTitle(facts, current.idea, current.eyebrow);
    if (!document.body.classList.contains('scened')) {
      document.body.classList.add('scened');
      // The first picture of the visit: the page opens out around it.
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
    announce({ type: 'step', stage: 'build', title: 'Build', detail: `${plan.world.entry.title} and ${plan.cast.length} thing${plan.cast.length === 1 ? '' : 's'}` });
    const reports = await stage.mount(plan);
    if (control.signal.aborted) return;
    const built = performance.now();
    announce({ type: 'step', stage: 'build', title: 'Build', detail: `${reports.filter((report) => !report.error).length} of ${reports.length} built in ${built - decided < 1000 ? `${Math.round(built - decided)} ms` : seconds(built - decided)}`, done: true });
    renderSheet(plan, reports, []);
    showTree(plan, reports, []);
    // Painted faces draw over the first few frames; let them land before the frame is captured.
    await new Promise((resolve) => setTimeout(resolve, 500));
    say(`Built in ${seconds(built - decided)}. Printing…`);
    announce({ type: 'step', stage: 'print', title: 'Print', detail: plan.look ? `developing as ${plan.look.entry.title}` : 'the scene as it stands' });
    const printStarted = performance.now();
    // Capture identity for vector placement before a print's async treatment lets the scene move.
    const layerCapture = stage.capture();
    const result = await stage.develop(control.signal, layerCapture);
    if (control.signal.aborted) return;
    // The scene is still held at the printed moment. Once the page has finished opening out around the
    // frame, take that moment again through a film as wide as the window, for the window print made after.
    await Promise.race([Promise.all(document.getAnimations().filter((animation) => animation instanceof CSSTransition).map((animation) => animation.finished.catch(() => undefined))), new Promise((resolve) => setTimeout(resolve, 1500))]);
    if (control.signal.aborted) return;
    const view = measureWindow(frame);
    const wideCapture = view ? stage.captureWide(filmOf(view)) : null;
    announce({ type: 'step', stage: 'print', title: 'Print', detail: result ? `${plan.look?.entry.title ?? 'printed'}${result.notes.length ? `: ${result.notes.join(', ')}` : ''} · ${seconds(performance.now() - printStarted)}` : 'the scene as it stands', done: true });
    if (result) {
      printCanvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(result.pixels), FRAME_SIZE, FRAME_SIZE), 0, 0);
      printCanvas.dataset.ready = 'true';
      // The page takes the print's colours and its look's effects.
      current.picture = printCanvas;
      wear(printCanvas, current.look);
      layers.setPrint(printCanvas, layerCapture, plan.seed, pictureName(), plan.design?.layers ?? []);
      showPrint($('#show-print').getAttribute('aria-pressed') === 'true');
      renderSheet(plan, reports, result.notes);
      showTree(plan, reports, result.notes);
    }
    if (!result) wear($<HTMLCanvasElement>('#stage'), null);
    const timing = `Decided in ${seconds(decided - started)}, built in ${seconds(built - decided)}${result ? `, printed in ${seconds(performance.now() - printStarted)}` : ''}.`;
    say(timing);
    (window as unknown as { __conjure: unknown }).__conjure = { plan, reports, notes: result?.notes ?? [] };
    let galleryPrint = result ? await layers.picture(printCanvas, control.signal) : null;
    if (control.signal.aborted) return;
    // The new print comes together where the old one broke up; a plain scene is simply shown.
    if (galleryPrint) void interlude.finish(galleryPrint);
    else interlude.cancel();
    // The other plates of a series: the same settled decisions, each with its plate's mood or framing.
    const { plates, index: primary, kind } = plan.presentation;
    // A portrait: the hero alone, reframed tight and redrawn by the look, then joined with the scene.
    if (galleryPrint && kind === 'portrait' && plan.cast.length) {
      say(`${timing} Painting a portrait of ${plan.cast[0].entry.title}\u2026`);
      announce({ type: 'step', stage: 'portrait', title: 'Portrait', detail: `of ${plan.cast[0].entry.title}` });
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
        current.picture = composite;
        wear(composite, current.look);
        const images: PlateImage[] = [{ title: `portrait, scene ${blend}`, canvas: composite }, { title: 'the scene', canvas: scenePrint }];
        if (blend === 'beside') images[0].title = 'portrait';
        series = composeSeries(images, plan.idea);
        showSeries(images, 'portrait');
        $<HTMLButtonElement>('#save-series').hidden = false;
        say(`${timing} A portrait of ${plan.cast[0].entry.title}, the scene ${blend === 'beside' ? 'beside it' : blend}.`);
        announce({ type: 'step', stage: 'portrait', title: 'Portrait', detail: `${plan.cast[0].entry.title}, the scene ${blend === 'beside' ? 'beside it' : blend}`, done: true });
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
          announce({ type: 'step', stage: 'plates', title: 'Series', detail: `plate ${at + 1} of ${plates.length}, ${kind === 'critics' ? `a second critic, ${shortName(critic!)}` : kind === 'opposite' ? 'the exact opposite' : 'passed on like a game of telephone'}` });
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
          announce({ type: 'step', stage: 'plates', title: 'Series', detail: `plate ${at + 1} of ${plates.length}, ${plates[at].title}` });
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
      announce({ type: 'step', stage: 'plates', title: 'Series', detail: `${plates.length} plates as ${kind}`, done: true });
    }
    // A moving print: the live scene captured frame by frame while its things move.
    let loopData: string | null = null;
    if (galleryPrint && kind === 'loop') {
      if (!loopMoves(stage, plan)) say(`${timing} Nothing in the picture moves, so the loop stays a still plate.`);
      else {
        loopBlob = await recordLoop(stage, plan, control.signal, (index) => {
          say(`${timing} Recording the loop, frame ${index + 1}…`);
          announce({ type: 'step', stage: 'loop', title: 'Loop', detail: `frame ${index + 1}` });
        });
        if (control.signal.aborted) return;
        loopData = await showLoop(loopBlob);
        say(loopBlob ? `${timing} A moving print of ${Math.round(loopBlob.size / 1024)} kB.` : `${timing} This browser cannot record a loop.`);
        announce({ type: 'step', stage: 'loop', title: 'Loop', detail: loopBlob ? `a moving print of ${Math.round(loopBlob.size / 1024)} kB` : 'this browser cannot record one', done: true });
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
    const featured = galleryPrint?.toDataURL('image/jpeg', 0.85);
    const saved = saveToGallery({
      plan, reports, notes: result?.notes ?? [], temperature, roll,
      source: studying ? 'study' : offline ? 'offline' : 'model',
      model: studying || offline ? null : (conjuring.options.model ?? plan.usage.model ?? null),
      force,
      scene: $<HTMLCanvasElement>('#stage'), print: galleryPrint, series, readings, loop: loopData,
    });
    void saved.then(() => {
      void dock.refresh();
      if (featured) wordmark.feature(featured);
    });
    lastPicture = galleryPrint;
    activity.finish();
    // The feed scrolled the column as rows arrived; the finished picture opens on its title.
    $('.side').scrollTo({ top: 0, behavior: 'smooth' });
    // In one column the feed ran down the page; bring the picture back into view.
    if (matchMedia('(max-width: 860px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' });
    setState('ready');
    document.title = 'conjure-ready';
    $('#scene-caption').textContent = `${plan.world.entry.title} · ${plan.scale} · ${reports.filter((report) => !report.error && report.id.startsWith('things/')).length} things`;
    $<HTMLButtonElement>('#save-picture').disabled = false;
    if (wideCapture && view) void widen(plan, wideCapture, view, control, saved);
  } catch (error) {
    if (control.signal.aborted) return;
    console.error(error);
    interlude.cancel();
    say(error instanceof Error ? error.message : String(error), true);
    activity.fail();
    setState('failed');
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

/** A picture from the gallery takes the picture's place, with its own decisions in the column. */
function showHistory(entry: GalleryEntry) {
  document.body.classList.add('history');
  historyPrint.hidden = false;
  historyPrint.alt = entry.idea;
  historyPrint.onload = () => wear(historyPrint, entry.look?.id ?? null);
  historyPrint.src = fileOf(entry, 'print');
  frame.querySelector('#history-loop')?.remove();
  if (entry.hasLoop) {
    const video = Object.assign(document.createElement('video'), { id: 'history-loop', src: fileOf(entry, 'loop'), autoplay: true, loop: true, muted: true, playsInline: true });
    // A loop saved before frames were stamped one by one may not play; the print stays under it.
    video.addEventListener('error', () => video.remove());
    frame.append(video);
  }
  renderTitle(facts, entry.idea, eyebrowOf(entry.look?.id, entry.scale, entry.presentation?.kind));
  renderEntryRows(historyFacts, entry);
  windowView(false);
  if (entry.hasWindow && entry.window) windowPrint.show(fileOf(entry, 'window'), entry.window);
  else windowPrint.clear();
  syncStage();
  const actions = element('div', undefined, 'history-actions');
  const again = element('button', 'Conjure it again');
  again.type = 'button';
  again.addEventListener('click', () => {
    ideaInput.value = entry.idea;
    presetForce = entry.force && Object.keys(entry.force).length ? entry.force : null;
    void begin(entry.idea);
  });
  actions.append(again);
  // The same scene again, every answer pinned, with a window print the size of this window.
  const wider = element('button', entry.hasWindow ? 'Widen to this window again' : 'Widen to this window');
  wider.type = 'button';
  wider.title = 'Build this picture again with every answer pinned, widened to fill this browser window';
  wider.addEventListener('click', () => void widenEntry(entry));
  actions.append(wider);
  if (entry.hasWindow) {
    const fill = element('button', 'Fill the window');
    fill.type = 'button';
    fill.addEventListener('click', () => windowView(true));
    actions.append(fill);
  }
  if (current) {
    const back = element('button', 'Back to yours');
    back.type = 'button';
    back.addEventListener('click', leaveHistory);
    actions.append(back);
  }
  if (entry.hasSeries) {
    const series = element('a', 'The whole series');
    (series as HTMLAnchorElement).href = fileOf(entry, 'series');
    (series as HTMLAnchorElement).target = '_blank';
    actions.append(series);
  }
  historyFacts.append(actions);
  historyFacts.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function leaveHistory() {
  if (!document.body.classList.contains('history')) return;
  document.body.classList.remove('history');
  historyPrint.hidden = true;
  historyPrint.onload = null;
  historyPrint.removeAttribute('src');
  frame.querySelector('#history-loop')?.remove();
  historyFacts.hidden = true;
  dock.release();
  windowView(false);
  if (currentWindow) windowPrint.show(currentWindow.url, currentWindow.view);
  else windowPrint.clear();
  if (current) {
    renderTitle(facts, current.idea, current.eyebrow);
    wear(current.picture, current.look);
  } else wear(null);
  syncStage();
}
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
  if (document.body.classList.contains('window-view')) windowView(false);
  else leaveHistory();
});

async function widenEntry(entry: GalleryEntry) {
  try {
    const record = (await (await fetch(`/api/gallery/entry/${entry.day}/${encodeURIComponent(entry.id)}`)).json()) as SavedRecord;
    const replay = replayOf(record);
    ideaInput.value = replay.idea;
    void begin(replay.idea, replay.temperature, undefined, replay);
  } catch (error) {
    say(`That picture could not be built again: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

async function begin(idea: string, temperature = 0, study?: Study, replay?: Replay) {
  if (busy) return;
  // Traced pictures join the catalogue at runtime; an idea's casting snapshot must include them.
  if (!offline && !study) await traceLibrary.ready().catch(() => undefined);
  if (busy) return;
  force = replay ? { ...replay.force } : presetForce ?? {};
  presetForce = null;
  document.title = 'Conjure';
  roll = replay ? replay.roll : Number(query.get('roll') ?? 0);
  studying = !!study;
  conjuring = new Conjuring(idea, {
    offline: offline || studying, plain: offline || studying, model: modelSelect.value || undefined,
    ...(studying ? { look: 'looks/graphic-press' } : {}), ...study,
    ...(lookSelect.value && !replay ? { look: lookSelect.value } : {}),
    // A replay builds exactly the saved world and cast.
    ...(replay ? { world: replay.world, cast: replay.cast } : {}),
  });
  if (studying) showPrint(false);
  void conjure(temperature);
}

installGalleryLink();
// On the blank page the name is a toy: each click gives the next letter a new slice. Otherwise it is a way back to the prompt.
$('#wordmark').addEventListener('click', (event) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  if (blank()) {
    wordmark.step();
    return;
  }
  leaveHistory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  ideaInput.focus({ preventScroll: true });
  ideaInput.select();
});
const traceLibrary = installTraces();
installLibrary({
  useIdea(idea) { ideaInput.value = idea; ideaInput.focus(); },
  study(idea, study) { ideaInput.value = idea; void begin(idea, 1, study); },
});

// On the blank page the model and look menus wait behind one word.
$('#settings').addEventListener('click', () => {
  const open = document.body.classList.toggle('settings');
  $('#settings').setAttribute('aria-expanded', String(open));
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
$('#show-window').addEventListener('click', () => windowView(!document.body.classList.contains('window-view')));
$('#window-exit').addEventListener('click', () => windowView(false));
$('#save-window').addEventListener('click', () => {
  if (!currentWindow) return;
  const link = document.createElement('a');
  link.download = `${pictureName()}-window-${currentWindow.canvas.width}x${currentWindow.canvas.height}.png`;
  link.href = currentWindow.canvas.toDataURL('image/png');
  link.click();
});
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
    // ?model=<provider>:<model> picks one of the offered models, for laps and probes across models.
    const asked = query.get('model');
    if (asked && models.includes(asked)) modelSelect.value = asked;
    if (!configured) {
      say('No decision provider is configured. Add an API key (TYPESAFE_API_KEY, OPENROUTER_API_KEY, NANO_GPT_API_KEY or CONJURE_API_KEY) to the .env file and restart the server.', true);
      setState('failed');
    }
  } else {
    say('The decision server is not running. Start it with npm run dev.', true);
    setState('failed');
  }
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
    setState('failed');
    document.title = 'conjure-failed';
  } else void begin(preset, Number(query.get('t') ?? 0), forcedWorld ? { world: forcedWorld.id, cast } : undefined);
}
