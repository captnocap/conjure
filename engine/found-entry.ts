import type { Entry } from './catalogue';
import type { QuestionSet } from '../kit/contract';
import { choice, score } from '../kit/questions';
import type { TracedImage } from '../kit/svg';

/** One trace as the library lists it: enough to describe it to the decision model. */
export interface TraceSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: string;
  colours: string[];
  darkBackground: boolean;
  bytes: number;
}

/** A rough colour name, so the model can tell a red picture from a blue one. */
export function colourWord(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), light = (max + min) / 2, chroma = max - min;
  if (chroma < 0.08) return light < 0.2 ? 'black' : light > 0.85 ? 'white' : light < 0.5 ? 'dark grey' : 'grey';
  const hue = (max === r ? ((g - b) / chroma + 6) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4) * 60;
  const name = hue < 15 || hue >= 345 ? 'red' : hue < 40 ? (light < 0.45 ? 'brown' : 'orange') : hue < 65 ? 'yellow' : hue < 160 ? 'green' : hue < 200 ? 'teal' : hue < 255 ? 'blue' : hue < 290 ? 'violet' : 'pink';
  return light < 0.3 ? `dark ${name}` : light > 0.78 ? `pale ${name}` : name;
}

export const foundId = (trace: { id: string }) => `things/found-${trace.id}`;

/** The catalogue entry for a traced picture: its name is what a sentence calls it by. */
export function foundEntry(trace: TraceSummary): Entry {
  const colours = [...new Set(trace.colours.map(colourWord))].slice(0, 3).join(', ') || 'mixed colours';
  return {
    id: foundId(trace),
    kind: 'thing',
    title: trace.name,
    summary: `${trace.name}: a picture of yours from the trace library, in ${colours}. It can stand in the scene as a cardboard standee, a decal on the ground, a relief panel, a thick cut-out or a sign.`.slice(0, 600),
    scales: ['street', 'room', 'tabletop'],
  };
}

/** Where traces come from: the server's library in the studio, nothing in checks and studies. */
export interface TraceLibrary {
  list(): readonly TraceSummary[];
  get(id: string): Promise<TracedImage | null>;
}
export const NO_TRACES: TraceLibrary = { list: () => [], get: async () => null };

export const TRACE_SPOTS = {
  centre: [0.5, 0.5], left: [0.3, 0.55], right: [0.7, 0.55], top: [0.5, 0.3], bottom: [0.5, 0.72], corner: [0.8, 0.8],
} as const;

/**
 * Asked with the vector composition when the library holds traces: whether one of them joins the
 * composition as a sheet over the print, and how. An empty library asks nothing.
 */
export function traceSheetQuestions(traces: readonly TraceSummary[]): QuestionSet {
  if (!traces.length) return {};
  const describe = (trace: TraceSummary) => `${trace.name}: a traced picture in ${[...new Set(trace.colours.map(colourWord))].slice(0, 3).join(', ') || 'mixed colours'}.`;
  return {
    traceSheet: choice('Which of your traced pictures, if any, should join the vector composition as a sheet over the print? Choose one only if it serves the idea.', {
      none: 'None: keep the composition to drawn motifs.',
      ...Object.fromEntries(traces.slice(0, 200).map((trace) => [trace.id, describe(trace)])),
    }),
    traceStyle: choice('If a traced picture joins the composition, how is it drawn?', {
      poster: 'As flat colour shapes in its own colours, its background dropped.',
      ink: 'As a tonal print in the composition\u2019s two inks, its background dropped.',
      lines: 'As a one-colour stencil of its strongest marks.',
      ghost: 'As a faint whole picture, background and all, like a stain or a double exposure.',
    }),
    traceSize: score('If a traced picture joins, how large is it?', ['A small stamp', 'A modest inset', 'A large shape', 'Filling the frame']),
    traceSpot: choice('If a traced picture joins, where does it sit?', {
      centre: 'In the middle.', left: 'Toward the left.', right: 'Toward the right.', top: 'Toward the top.', bottom: 'Toward the bottom.', corner: 'Tucked into a corner, like a stamp.',
    }),
  };
}
