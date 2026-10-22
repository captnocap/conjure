import { createSvgLayer, generateSvg, layerTitle, rasterizeSvg, SVG_MOTIFS, type SvgLayer, type SvgMotif } from './svg';
import type { Capture } from '../kit/contract';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const LIMIT = 8;

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
}

function download(contents: Blob, name: string) {
  const url = URL.createObjectURL(contents);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  // Leave time for the browser to consume the link before freeing it.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Insert the captured print under editable vectors. Only our own SVG and PNG data enter here. */
function withPrint(svg: string, png: string) {
  return svg.replace(/(<svg\b[^>]*>)/, `$1<image id="conjure-print" x="0" y="0" width="720" height="720" href="${png}"/>`);
}

/** A local, deterministic design desk. It never consults the decision model. */
export function installLayers(onPrint: () => void) {
  const panel = $('#layer-lab');
  const list = $('#layer-list');
  const settings = $('#layer-settings');
  const message = $('#layer-status');
  const overlay = $<HTMLImageElement>('#svg-overlay');
  const motif = $<HTMLSelectElement>('#layer-motif');
  let layers: SvgLayer[] = [];
  let selected = '';
  let capture: Capture | undefined;
  let basePng = '';
  let seed = 0;
  let sequence = 0;
  let enabled = true;
  let busy = true;
  let revision = 0;
  let previewUrl = '';
  let filename = 'conjure';
  let manualEdits = false;

  for (const item of SVG_MOTIFS) motif.append(new Option(item.title, item.id));
  const picked = () => layers.find((layer) => layer.id === selected);
  const visible = () => enabled ? layers : [];
  const svg = () => generateSvg(720, visible(), capture);
  const artwork = () => withPrint(svg(), basePng);

  function buttons() {
    for (const control of panel.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button, input, select'))
      control.disabled = busy || !basePng;
    $<HTMLButtonElement>('#layer-add').disabled ||= layers.length >= LIMIT;
    $<HTMLButtonElement>('#layers-clear').disabled ||= !layers.length;
    $<HTMLButtonElement>('#layers-toggle').disabled ||= !layers.length;
    $<HTMLButtonElement>('#save-svg').disabled ||= !layers.some((layer) => layer.visible) || !enabled;
    for (const row of list.querySelectorAll<HTMLElement>('[data-layer-id]')) {
      const index = layers.findIndex((layer) => layer.id === row.dataset.layerId);
      row.querySelector<HTMLButtonElement>('[data-layer-action="down"]')!.disabled ||= index === 0;
      row.querySelector<HTMLButtonElement>('[data-layer-action="up"]')!.disabled ||= index === layers.length - 1;
    }
  }

  async function preview() {
    const version = ++revision;
    buttons();
    const active = !busy && !!basePng && enabled && layers.some((layer) => layer.visible && layer.opacity > 0);
    if (!active) $('.frame').classList.remove('layered');
    $('#layers-toggle').setAttribute('aria-pressed', String(enabled));
    $('#layer-count').textContent = `${layers.length} / ${LIMIT}`;
    if (!basePng || busy) return;
    const count = enabled ? layers.filter((layer) => layer.visible).length : 0;
    message.textContent = !enabled && layers.length ? 'Sheets hidden · your composition is still here.'
      : count ? `${count} vector ${count === 1 ? 'sheet' : 'sheets'} · ${manualEdits ? 'manually adjusted; next generation follows its decisions' : 'chosen with the scene; edits are free'}`
      : manualEdits ? 'Stack cleared · the next generation follows its design decisions.'
      : 'Choose a starting point or add your own vector sheet.';
    if (!active) return;
    try {
      const url = URL.createObjectURL(new Blob([artwork()], { type: 'image/svg+xml' }));
      const image = new Image();
      image.src = url;
      try { await image.decode(); } catch (error) { URL.revokeObjectURL(url); throw error; }
      if (version !== revision) { URL.revokeObjectURL(url); return; }
      overlay.src = url;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = url;
      overlay.dataset.revision = String(version);
      $('.frame').classList.add('layered');
    } catch (error) {
      if (version !== revision) return;
      $('.frame').classList.remove('layered');
      message.textContent = `The vector preview could not render: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  function button(text: string, action: string, title: string) {
    const result = node('button', text);
    result.type = 'button';
    result.dataset.layerAction = action;
    result.setAttribute('aria-label', title);
    result.title = title;
    return result;
  }

  function drawList() {
    list.replaceChildren();
    // The highest sheet is shown first, as in a physical stack.
    for (const layer of [...layers].reverse()) {
      const row = node('div', undefined, 'layer-row');
      row.dataset.layerId = layer.id;
      row.classList.toggle('selected', selected === layer.id);
      row.classList.toggle('muted', !layer.visible);
      const swatch = node('span', undefined, 'layer-swatch');
      swatch.style.background = layer.color;
      const name = button(layerTitle(layer), 'select', `Edit ${layerTitle(layer)}`);
      name.className = 'layer-name';
      name.prepend(swatch);
      name.setAttribute('aria-pressed', String(selected === layer.id));
      const toggle = button(layer.visible ? '●' : '○', 'toggle', `${layer.visible ? 'Hide' : 'Show'} ${layerTitle(layer)}`);
      toggle.setAttribute('aria-pressed', String(layer.visible));
      row.append(toggle, name, button('↑', 'up', 'Move sheet forward'), button('↓', 'down', 'Move sheet backward'), button('×', 'remove', `Remove ${layerTitle(layer)}`));
      list.append(row);
    }
    buttons();
  }

  function drawSettings() {
    settings.replaceChildren();
    const layer = picked();
    settings.hidden = !layer;
    if (!layer) return;
    const heading = node('p', `${layerTitle(layer)} · shape the sheet`, 'layer-settings-title');
    settings.append(heading);
    const field = (title: string, key: keyof SvgLayer, control: HTMLInputElement | HTMLSelectElement) => {
      const label = node('label', title);
      control.dataset.layerField = key;
      control.setAttribute('aria-label', title);
      control.value = String(layer[key]);
      label.append(control);
      if (control instanceof HTMLInputElement && control.type === 'range') {
        const output = node('output', control.value);
        control.addEventListener('input', () => { output.value = control.value; });
        label.append(output);
      }
      settings.append(label);
    };
    const range = (title: string, key: keyof SvgLayer, min: number, max: number, step: number) => {
      const control = node('input'); control.type = 'range';
      control.min = String(min); control.max = String(max); control.step = String(step);
      field(title, key, control);
    };
    range('Opacity', 'opacity', 0, 1, 0.001);
    range('Density', 'density', 0, 1, 0.001);
    range('Scale', 'scale', 0.35, 2.4, 0.001);
    range('Rotation', 'rotation', -180, 180, 5);
    for (const [title, key] of [['Ink', 'color'], ['Accent', 'accent']] as const) {
      const control = node('input'); control.type = 'color'; field(title, key, control);
    }
    const placement = node('select');
    for (const [value, label] of [['all', 'Whole sheet'], ['subject', 'On the scene objects'], ['background', 'Around the scene objects']]) placement.append(new Option(label, value));
    field('Placement', 'placement', placement);
    const blend = node('select');
    for (const value of ['normal', 'multiply', 'screen']) blend.append(new Option(value[0].toUpperCase() + value.slice(1), value));
    field('Blend', 'blend', blend);
    const seedInput = node('input'); seedInput.type = 'number'; seedInput.min = '0'; seedInput.max = '4294967295'; seedInput.step = '1';
    field('Seed', 'seed', seedInput);
    const reroll = node('button', 'New variation'); reroll.id = 'layer-reroll'; reroll.type = 'button';
    reroll.addEventListener('click', () => { manualEdits = true; layer.seed = (layer.seed + 1) >>> 0; seedInput.value = String(layer.seed); void preview(); });
    settings.append(reroll);
    buttons();
  }

  function redraw() { drawList(); drawSettings(); void preview(); }

  function fresh(id: SvgMotif, overrides: Partial<SvgLayer> = {}) {
    sequence++;
    return { ...createSvgLayer(id, (seed + Math.imul(sequence, 2654435761)) >>> 0), ...overrides, id: `sheet-${sequence}` };
  }

  $('#layer-add').addEventListener('click', () => {
    if (busy || layers.length >= LIMIT) return;
    manualEdits = true;
    const layer = fresh(motif.value as SvgMotif);
    layers.push(layer); selected = layer.id; enabled = true;
    onPrint(); redraw();
  });
  list.addEventListener('click', (event) => {
    if (busy) return;
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-layer-action]');
    const id = target?.closest<HTMLElement>('[data-layer-id]')?.dataset.layerId;
    const index = layers.findIndex((layer) => layer.id === id);
    if (!target || index < 0) return;
    const layer = layers[index];
    if (target.dataset.layerAction !== 'select') manualEdits = true;
    switch (target.dataset.layerAction) {
      case 'select': selected = layer.id; break;
      case 'toggle': layer.visible = !layer.visible; break;
      case 'remove': layers.splice(index, 1); if (selected === id) selected = layers.at(-1)?.id ?? ''; break;
      case 'up': if (index < layers.length - 1) [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]]; break;
      case 'down': if (index > 0) [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]]; break;
    }
    redraw();
  });
  settings.addEventListener('input', (event) => {
    const control = event.target as HTMLInputElement;
    const key = control.dataset.layerField;
    const layer = picked();
    if (!key || !layer || busy) return;
    manualEdits = true;
    if (['opacity', 'density', 'scale', 'rotation', 'seed'].includes(key)) {
      if (!control.value || !Number.isFinite(Number(control.value))) return;
      const value = Math.max(Number(control.min), Math.min(Number(control.max), Number(control.value)));
      Object.assign(layer, { [key]: key === 'seed' ? Math.round(value) >>> 0 : value });
    } else Object.assign(layer, { [key]: control.value });
    const swatch = list.querySelector<HTMLElement>(`[data-layer-id="${layer.id}"] .layer-swatch`);
    if (swatch) swatch.style.background = layer.color;
    onPrint(); void preview();
  });
  $('#layers-toggle').addEventListener('click', () => { enabled = !enabled; onPrint(); void preview(); });
  $('#layers-clear').addEventListener('click', () => { manualEdits = true; layers = []; selected = ''; redraw(); });

  const recipes: Record<string, () => SvgLayer[]> = {
    moon: () => [
      fresh('orbital', { color: '#e9ad72', accent: '#f7e5bc', opacity: 0.7, density: 0.35, placement: 'background' }),
      fresh('constellation', { color: '#fff2cf', accent: '#df7757', opacity: 0.8, density: 0.4 }),
      fresh('blueprint', { color: '#f8e5c0', opacity: 0.3, density: 0.2 }),
    ],
    herbarium: () => [
      fresh('botanical', { color: '#244f3b', accent: '#a18449', opacity: 0.65, placement: 'background', density: 0.45 }),
      fresh('stipple', { color: '#776846', opacity: 0.3, density: 0.35, blend: 'multiply' }),
      fresh('blueprint', { color: '#315846', opacity: 0.3, density: 0.15 }),
    ],
    signal: () => [
      fresh('collage', { color: '#e45f4c', accent: '#eab72f', opacity: 0.7, density: 0.4, placement: 'background' }),
      fresh('ribbons', { color: '#4268d4', accent: '#c463c3', opacity: 0.55, density: 0.3, rotation: -25 }),
    ],
    terrain: () => [
      fresh('topography', { color: '#355d64', accent: '#c56c44', opacity: 0.5, density: 0.5, blend: 'multiply' }),
      fresh('orbital', { color: '#cf6d43', accent: '#c4a164', opacity: 0.6, density: 0.15, placement: 'background' }),
    ],
  };
  for (const control of panel.querySelectorAll<HTMLButtonElement>('[data-layer-recipe]')) control.addEventListener('click', () => {
    if (busy) return;
    manualEdits = true;
    layers = recipes[control.dataset.layerRecipe!](); selected = layers.at(-1)!.id; enabled = true;
    onPrint(); redraw();
  });
  $('#save-svg').addEventListener('click', () => download(new Blob([svg()], { type: 'image/svg+xml' }), `${filename}-layers.svg`));
  $('#save-artwork-svg').addEventListener('click', () => download(new Blob([artwork()], { type: 'image/svg+xml' }), `${filename}-artwork.svg`));

  redraw();
  return {
    setPrint(canvas: HTMLCanvasElement, frame: Capture, sceneSeed: number, name: string, generated: readonly SvgLayer[] = []) {
      capture = frame; basePng = canvas.toDataURL('image/png'); seed = sceneSeed; filename = name;
      layers = generated.slice(0, LIMIT).map((layer) => ({ ...layer }));
      manualEdits = false;
      selected = layers.at(-1)?.id ?? ''; enabled = true; busy = false;
      onPrint(); redraw();
    },
    clearPrint() {
      capture = undefined; basePng = ''; revision++; busy = true;
      $('.frame').classList.remove('layered');
      overlay.removeAttribute('src');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = '';
      message.textContent = 'Conjure a scene to open the layer desk.';
      buttons();
    },
    async picture(base: HTMLCanvasElement, signal: AbortSignal): Promise<HTMLCanvasElement> {
      if (!basePng || !enabled || !layers.some((layer) => layer.visible && layer.opacity > 0)) return base;
      const pixels = await rasterizeSvg(artwork(), 720, signal);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 720;
      canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels), 720, 720), 0, 0);
      return canvas;
    },
  };
}
