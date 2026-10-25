/**
 * What the studio is doing right now, announced as it happens: a batch of questions going out,
 * a decision settling, a component built, the print developing. The page draws it as a live
 * feed while an idea is conjured. Nothing here depends on the DOM, so every engine module can
 * announce and the tests, which never listen, are unaffected.
 */
export type Activity =
  /** A batch of questions is on its way to the model. */
  | { type: 'asking'; about: string; questions: number; batch: number; batches: number }
  /** The model answered one batch. */
  | { type: 'answered'; about: string; questions: number; milliseconds: number }
  /** A decision settled: what it was about, and the answer in words. */
  | { type: 'decided'; stage: string; title: string; detail: string; items?: readonly string[] }
  /** A component was built for the stage, or failed to. */
  | { type: 'built'; id: string; title: string; milliseconds: number; error: string | null }
  /** A step of the page's own: printing, a portrait, a plate of a series, the loop. */
  | { type: 'step'; stage: string; title: string; detail: string; done?: boolean }
  /** A new idea starts; listeners forget the last one. */
  | { type: 'begin'; idea: string };

type Listener = (activity: Activity) => void;
const listeners = new Set<Listener>();

export function announce(activity: Activity) {
  for (const listener of listeners) {
    try {
      listener(activity);
    } catch (error) {
      console.error('an activity listener failed', error);
    }
  }
}

/** Listen to everything the studio announces. Returns a function that stops listening. */
export function onActivity(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
