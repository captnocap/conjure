import { setRuntimeThings } from './catalogue';
import { foundEntry, type TraceLibrary, type TraceSummary } from './found-entry';

export { colourWord, foundEntry, foundId, NO_TRACES, type TraceLibrary, type TraceSummary } from './found-entry';
import { foundThing } from './found';
import type { TracedImage } from '../kit/svg';

const records = new Map<string, Promise<TracedImage>>();

async function fetchTrace(id: string): Promise<TracedImage> {
  const response = await fetch(`/api/traces/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(`The trace ${id} could not be loaded.`);
  return response.json() as Promise<TracedImage>;
}

let current: TraceSummary[] = [];
const cached = (id: string) => {
  let pending = records.get(id);
  if (!pending) { pending = fetchTrace(id); records.set(id, pending); pending.catch(() => records.delete(id)); }
  return pending;
};

/** The registered library, for the vector composition's trace questions. */
export const traceLibrary: TraceLibrary = { list: () => current, get: (id) => cached(id).catch(() => null) };

/** Fetch the library and register every trace as a thing that casting can choose. Failure leaves none. */
export async function loadTraceLibrary(): Promise<TraceSummary[]> {
  let list: TraceSummary[] = [];
  try {
    const response = await fetch('/api/traces');
    if (response.ok) list = (await response.json()) as TraceSummary[];
  } catch {
    list = [];
  }
  current = list;
  setRuntimeThings(list.map((trace) => ({
    entry: foundEntry(trace),
    load: () => cached(trace.id).then((image) => foundThing(image) as never),
  })));
  return list;
}

/** Forget a cached trace after it changes on the server. */
export const forgetTrace = (id: string) => records.delete(id);
