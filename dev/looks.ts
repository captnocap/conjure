// Contact sheet: every Atelier treatment, alone, on one offline scene.
// /dev/looks.html?idea=...&roll=2&only=riso,woodcut
import { applyMix, styles } from '../components/looks/atelier/atelier';
import { Conjuring } from '../engine/director';
import { Stage } from '../engine/stage';

const query = new URLSearchParams(location.search);
const status = document.querySelector<HTMLElement>('#status')!;
const sheet = document.querySelector<HTMLElement>('#sheet')!;
const stage = new Stage(document.querySelector<HTMLCanvasElement>('#stage')!);
const plan = await new Conjuring(query.get('idea') ?? 'contact sheet', { offline: true }).plan({
  temperature: 1,
  roll: Number(query.get('roll') ?? 0),
});
await stage.mount(plan);
await new Promise((resolve) => setTimeout(resolve, 600));
const capture = stage.capture();
const only = query.get('only')?.split(',');
const results: { id: string; milliseconds: number; error: string | null }[] = [];

for (const style of styles) {
  if (only && !only.includes(style.id)) continue;
  status.textContent = `Drawing ${style.name}…`;
  const started = performance.now();
  const figure = document.createElement('figure');
  const caption = document.createElement('figcaption');
  let error: string | null = null;
  try {
    const pixels = await applyMix(
      capture,
      { mode: 'layers', layers: [{ id: style.id, enabled: true, weight: 100, blend: 'normal' }] },
      {
        seed: 2401,
        intensity: 0.6,
        ink: { spatter: 0.7, bloom: 0.8, scrape: 0.65, nervous: 0.75, bristles: 0.6, accent: 0.9, warp: 0.2 },
        signal: AbortSignal.timeout(90_000),
      },
    );
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = capture.size;
    canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels), capture.size, capture.size), 0, 0);
    figure.append(canvas);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    caption.className = 'failed';
  }
  const milliseconds = Math.round(performance.now() - started);
  caption.textContent = `${style.id} · ${milliseconds} ms${error ? ` · ${error.slice(0, 140)}` : ''}`;
  figure.append(caption);
  sheet.append(figure);
  results.push({ id: style.id, milliseconds, error });
}
status.textContent = `${results.filter((result) => !result.error).length} of ${results.length} treatments drew.`;
(window as any).__looks = results;
document.title = 'looks-ready';
