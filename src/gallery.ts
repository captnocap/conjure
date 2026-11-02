import type { Plan } from '../engine/director';
import type { BuildReport } from '../engine/stage';

/**
 * Sends each finished generation to the server, which keeps it under .data/gallery/.
 * Saving never interrupts the studio: a failure is logged and forgotten.
 */
export async function saveToGallery(options: {
  plan: Plan;
  reports: BuildReport[];
  notes: string[];
  temperature: number;
  roll: number;
  source: 'model' | 'offline' | 'study';
  /** The decision model that was asked, or null when none was. */
  model: string | null;
  /** Answers the person pinned by branching in the decision tree. */
  force: Record<string, string | number | boolean>;
  scene: HTMLCanvasElement;
  /** The finished print, including its generated vector composition. */
  print: HTMLCanvasElement | null;
  /** Every plate of a series on one mat, when the presentation has more than one. */
  series?: HTMLCanvasElement | null;
  /** The sentence each plate was read from; a game of telephone passes a new one each plate. */
  readings?: string[];
  /** A short looping WebM of the scene moving, as a data URL, when the presentation asked for one. */
  loop?: string | null;
}): Promise<{ day: string; id: string } | null> {
  const { plan, reports, notes, temperature, roll, source, model, force, scene, print, series, readings, loop } = options;
  try {
    const member = (cast: Plan['world']) => ({ id: cast.entry.id, belongs: cast.belongs, answers: cast.answers, ...(cast.relation ? { relation: cast.relation } : {}), ...(cast.material ? { material: cast.material } : {}) });
    const response = await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: plan.idea,
        scene: scene.toDataURL('image/jpeg', 0.9),
        print: print ? print.toDataURL('image/jpeg', 0.92) : null,
        ...(series ? { series: series.toDataURL('image/jpeg', 0.9) } : {}),
        ...(loop ? { loop } : {}),
        record: {
          roll,
          temperature,
          source,
          model,
          seed: plan.seed,
          scale: plan.scale,
          mood: plan.mood,
          framing: plan.framing,
          presentation: { kind: plan.presentation.kind, arc: plan.presentation.arc, plates: plan.presentation.plates.map((plate) => plate.title), index: plan.presentation.index, ...(plan.presentation.blend ? { blend: plan.presentation.blend } : {}), ...(readings && readings.length > 1 ? { readings } : {}) },
          world: member(plan.world),
          look: plan.look ? { ...member(plan.look), notes } : null,
          accent: plan.accent ? { ...member(plan.accent.look), region: plan.accent.region, edge: plan.accent.edge } : null,
          otherworld: plan.otherworld ?? null,
          vacui: plan.vacui ?? null,
          materialize: plan.materialize ?? null,
          camera: plan.camera ?? null,
          direction: plan.direction ? { id: plan.direction.entry.id, finishes: plan.direction.finishes } : null,
          // Keep the model's typed vector choices with the composited image so its
          // composition remains inspectable without embedding a second image asset.
          design: plan.design ? { ...plan.design, layers: plan.design.layers.map((layer) => layer.trace ? { ...layer, trace: { ...layer.trace, image: { ...layer.trace.image, shapes: [] } } } : layer) } : null,
          cast: plan.cast.map(member),
          failed: reports.filter((report) => report.error).map((report) => report.id),
          usage: source === 'model' ? plan.usage : null,
          force,
          wanted: plan.wanted ?? null,
          nearly: plan.nearly ?? [],
          // The decision tree: every question with its options. The per-thing casting questions are
          // left out (there is one for every thing in the catalogue); `nearly` keeps the close ones.
          rulings: plan.rulings.filter((ruling) => !ruling.name.startsWith('cast:')),
        },
      }),
    });
    if (!response.ok) {
      console.warn('The gallery did not save this generation:', response.status);
      return null;
    }
    const saved = (await response.json()) as { day: string; id: string; duplicate?: boolean };
    // The same picture is already kept; nothing more belongs with that entry.
    if (saved.duplicate) return null;
    return saved;
  } catch (error) {
    console.warn('The gallery did not save this generation:', error);
    return null;
  }
}

/** Attach a window print to an entry already saved. */
export async function saveWindowToGallery(where: { day: string; id: string }, print: HTMLCanvasElement, view: unknown): Promise<void> {
  try {
    const response = await fetch(`/api/gallery/entry/${where.day}/${encodeURIComponent(where.id)}/window`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: print.toDataURL('image/jpeg', 0.9), view }),
    });
    if (!response.ok) console.warn('The gallery did not keep the window print:', response.status);
  } catch (error) {
    console.warn('The gallery did not keep the window print:', error);
  }
}

/** A way into the gallery, added beside the library buttons without editing the page markup. */
export function installGalleryLink() {
  const host = document.querySelector('.library-actions') ?? document.querySelector('.controls');
  if (!host || document.querySelector('#gallery-link')) return;
  const link = document.createElement('a');
  link.id = 'gallery-link';
  link.href = '/gallery';
  link.textContent = 'Gallery';
  link.style.cssText = 'align-self:center;margin-left:4px;color:inherit;';
  host.append(link);
}
