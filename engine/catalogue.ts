import type { DirectionBuilder, Kind, LookBuilder, Manifest, Requirement, ThingBuilder, WorldBuilder } from '@conjure/kit';
import { KINDS, LOOK_MEDIA, REQUIREMENTS, SCALES } from '@conjure/kit';

/**
 * Components are discovered by folder. Nothing lists them by hand, so adding one
 * never edits a file that another contributor is also editing.
 */
const manifestModules = import.meta.glob<Manifest>('../components/*/*/manifest.ts', {
  eager: true,
  import: 'default',
});
const builderModules = import.meta.glob<unknown>('../components/*/*/build.ts', {
  import: 'default',
});

export interface Entry extends Manifest {
  /** "<kind>s/<folder>", for example "things/chair". */
  id: string;
}

type BuilderOf<K extends Kind> = K extends 'thing'
  ? ThingBuilder
  : K extends 'world'
    ? WorldBuilder
    : K extends 'look'
      ? LookBuilder
      : DirectionBuilder;

/** Outside material that is installed. A component whose manifest requires more is left out. */
const INSTALLED: Record<Requirement, boolean> = { ateliers: import.meta.env.CONJURE_ATELIERS === 'true' };
const installed = (manifest: Manifest) => (manifest.requires ?? []).every((requirement) => INSTALLED[requirement]);

const idOf = (path: string) => path.replace('../components/', '').replace(/\/[^/]+$/, '');

function readCatalogue(): Entry[] {
  const entries: Entry[] = [];
  for (const [path, manifest] of Object.entries(manifestModules)) {
    const id = idOf(path);
    const folderKind = id.split('/')[0];
    if (!manifest || !KINDS.includes(manifest.kind))
      throw new Error(`${id}: manifest.ts must default-export defineManifest({...}).`);
    if (folderKind !== `${manifest.kind}s`)
      throw new Error(`${id}: a ${manifest.kind} belongs under components/${manifest.kind}s/.`);
    if (!manifest.title.trim() || !manifest.summary.trim())
      throw new Error(`${id}: title and summary are required.`);
    if (manifest.scales.some((scale) => !SCALES.includes(scale)))
      throw new Error(`${id}: unknown scale in ${manifest.scales.join(', ')}.`);
    if (manifest.kind !== 'look' && manifest.kind !== 'direction' && !manifest.scales.length)
      throw new Error(`${id}: a ${manifest.kind} must name at least one scale.`);
    if (manifest.medium !== undefined && (manifest.kind !== 'look' || !LOOK_MEDIA.includes(manifest.medium)))
      throw new Error(`${id}: medium must name an available art family on a look.`);
    if (manifest.requires?.some((requirement) => !REQUIREMENTS.includes(requirement)))
      throw new Error(`${id}: unknown requirement in ${manifest.requires.join(', ')}.`);
    if (!builderModules[`../components/${id}/build.ts`])
      throw new Error(`${id}: build.ts is missing.`);
    // A thing that wraps an atelier builder is only offered when the ateliers are linked in.
    if (!installed(manifest)) continue;
    entries.push({ id, ...manifest });
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

export const CATALOGUE: readonly Entry[] = readCatalogue();

/**
 * Things that exist only at runtime, such as pictures traced into the trace library. They join
 * casting like any component but are never written as component folders.
 */
export interface RuntimeThing { entry: Entry; load(): Promise<ThingBuilder> }
const runtime = new Map<string, RuntimeThing>();
export function setRuntimeThings(things: readonly RuntimeThing[]) {
  for (const id of runtime.keys()) loaded.delete(id);
  runtime.clear();
  for (const thing of things) if (thing.entry.kind === 'thing' && thing.entry.id.startsWith('things/found-')) runtime.set(thing.entry.id, thing);
}

export const entriesOf = (kind: Kind) => [...CATALOGUE, ...[...runtime.values()].map((thing) => thing.entry)].filter((entry) => entry.kind === kind);

export function entryOf(id: string): Entry {
  const entry = CATALOGUE.find((candidate) => candidate.id === id) ?? runtime.get(id)?.entry;
  if (!entry) throw new Error(`No component is registered as ${id}.`);
  return entry;
}

const loaded = new Map<string, Promise<unknown>>();

/** Load a component's heavy half. Cached, so a component's code is fetched once. */
export function loadBuilder<K extends Kind>(entry: Entry & { kind: K }): Promise<BuilderOf<K>> {
  let pending = loaded.get(entry.id);
  const found = runtime.get(entry.id);
  if (!pending && found) {
    pending = found.load();
    loaded.set(entry.id, pending);
  }
  if (!pending) {
    pending = builderModules[`../components/${entry.id}/build.ts`]().then((builder) => {
      const shaped = builder && typeof builder === 'object' && (entry.kind === 'direction' ? 'brief' in builder && 'finishes' in builder : 'questions' in builder);
      if (!shaped)
        throw new Error(`${entry.id}: build.ts must default-export define${entry.kind[0].toUpperCase()}${entry.kind.slice(1)}({...}).`);
      return builder;
    });
    loaded.set(entry.id, pending);
  }
  return pending as Promise<BuilderOf<K>>;
}
