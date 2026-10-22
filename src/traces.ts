import { TRACE_SIDE, traceId, traceImage } from './trace-image';
import { traceSvg, type TracedImage } from './svg';
import { forgetTrace, loadTraceLibrary, type TraceSummary } from '../engine/traces';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

/** Scale a picture so its longer side is at most TRACE_SIDE, and read its pixels. */
async function pixelsOf(file: Blob) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, TRACE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

const nameOf = (file: File) => (file.name || 'pasted picture').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 80) || 'pasted picture';
const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * The trace library panel: drop, paste or choose pictures; each is traced here in the browser and
 * stored as vector shapes. Renaming matters: a trace's name is what a sentence casts it by.
 * `ready` resolves once the library is registered with the catalogue; ideas wait for it.
 */
export function installTraces() {
  const panel = $('#trace-library');
  const status = $('#trace-status');
  const list = $('#trace-list');
  const input = $<HTMLInputElement>('#trace-file');
  const drop = $('#trace-drop');
  let ready = refresh();

  async function refresh(): Promise<TraceSummary[]> {
    const library = await loadTraceLibrary();
    draw(library);
    return library;
  }

  function draw(library: TraceSummary[]) {
    list.replaceChildren();
    for (const trace of library) {
      const card = document.createElement('div');
      card.className = 'trace-card';
      const image = new Image();
      image.alt = `${trace.name}, traced`;
      void fetch(`/api/traces/${encodeURIComponent(trace.id)}`).then((response) => response.json()).then((record: TracedImage) => {
        image.src = svgUrl(traceSvg(record, 'poster'));
      }).catch(() => undefined);
      const name = document.createElement('input');
      name.value = trace.name;
      name.setAttribute('aria-label', 'The trace’s name, which a sentence can call it by');
      name.addEventListener('change', async () => {
        const response = await fetch(`/api/traces/${encodeURIComponent(trace.id)}/name`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.value }),
        });
        status.textContent = response.ok ? `Renamed to “${name.value.trim()}”.` : 'The name could not be saved.';
        ready = refresh();
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', async () => {
        await fetch(`/api/traces/${encodeURIComponent(trace.id)}`, { method: 'DELETE' });
        forgetTrace(trace.id);
        status.textContent = `Set “${trace.name}” aside.`;
        ready = refresh();
      });
      card.append(image, name, remove);
      list.append(card);
    }
    const summary = panel.querySelector('summary span');
    if (summary) summary.textContent = library.length ? `${library.length} picture${library.length === 1 ? '' : 's'}, traced` : 'Your pictures, traced';
  }

  async function add(files: Iterable<File>) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const name = nameOf(file);
      status.textContent = `Tracing “${name}”…`;
      try {
        const started = performance.now();
        const pixels = await pixelsOf(file);
        const traced = traceImage(pixels, name, 'pending');
        const record = { ...traced, id: traceId(name, traced.shapes) };
        const response = await fetch('/api/traces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) });
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? `HTTP ${response.status}`);
        const kept = record.shapes.filter((shape) => !shape.background).length;
        const size = record.shapes.reduce((sum, shape) => sum + shape.d.length, 0);
        status.textContent = `Traced “${name}” in ${Math.round(performance.now() - started)} ms: ${kept} of ${record.shapes.length} colours kept, ${Math.round(size / 1024)} kB of paths.`;
      } catch (error) {
        status.textContent = `“${name}” could not be traced: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    ready = refresh();
  }

  input.addEventListener('change', () => { if (input.files) void add(input.files); input.value = ''; });
  drop.addEventListener('dragover', (event) => { event.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('over');
    if (event.dataTransfer?.files.length) void add(event.dataTransfer.files);
  });
  // Paste a picture anywhere except into a text field.
  document.addEventListener('paste', (event) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith('image/'));
    if (files.length) { panel.setAttribute('open', ''); void add(files); }
  });

  return { ready: () => ready };
}
