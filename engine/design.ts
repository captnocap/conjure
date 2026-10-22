import type { Answers, Mood, QuestionSet } from '../kit/contract';
import { choice, noul, score } from '../kit/questions';
import { hashText, seeded } from '../kit/random';
import { createSvgLayer, SVG_MOTIFS, type SvgLayer, type SvgMotif, type TraceStyle, type TracedImage } from '../kit/svg';
import { NO_TRACES, TRACE_SPOTS, traceSheetQuestions, type TraceLibrary, type TraceSummary } from './found-entry';
import { consult, type ConsultOptions, stanceBrief, type Usage, type Verdict } from './oracle';
import { settle, type Exploring, type Forced, type Ruling } from './settle';
import type { Direction } from '../kit/contract';
import { NO_DIRECTION } from './art-direction';
import { MAX_BRIEF_CHARACTERS } from './decision-limits';

const MOTIFS = Object.fromEntries(SVG_MOTIFS.map(({ id, title, description }) => [id, `${title}: ${description}`])) as Record<SvgMotif, string>;
const PALETTES = {
  mineral: { color: '#355d64', accent: '#c56c44', description: 'Petrol blue and weathered copper: mineral, tidal and quietly tactile.' },
  botanical: { color: '#244f3b', accent: '#a18449', description: 'Deep fern green and antique brass: organic, patient and earthy.' },
  solar: { color: '#cf6d43', accent: '#eab72f', description: 'Burnt orange and golden yellow: warm, expansive and sunlit.' },
  nocturne: { color: '#e5d8fb', accent: '#79d5c8', description: 'Pale lilac and luminous mint: gentle light on a darker nocturnal print.' },
  editorial: { color: '#34383d', accent: '#c2a48a', description: 'Charcoal and warm stone: understated ink, measured and editorial.' },
  carnival: { color: '#4268d4', accent: '#e45f7a', description: 'Cobalt blue and coral pink: playful colour, graphic energy and surprise.' },
  acid: { color: '#62f5db', accent: '#b5ed91', description: 'Electric turquoise and pale acid green: broken luminous ink against near-black, abrasive photocopies and nocturnal stencil prints.' },
  phosphor: { color: '#b6efff', accent: '#d1a1ed', description: 'Cold cyan-white and fading lilac: interrupted CRT phosphor, spectral traces and bright nodes in deep shadows.' },
  ember: { color: '#ffc28a', accent: '#e57966', description: 'Hot apricot and burnt coral: sparse incandescent fault lines against plum shadows, scorched film and volcanic surfaces.' },
} as const;
type Palette = keyof typeof PALETTES;

/** Every new scene receives a model-directed vector composition, just like its world and look. */
export const DESIGN_QUESTIONS = {
  motif: choice('Which generative SVG motif should lead the design layered over this scene?', MOTIFS),
  companion: choice('Which secondary SVG motif, if any, should accompany the leading motif?', {
    none: 'One clear visual idea: let the primary motif stand alone.', ...MOTIFS,
  }),
  palette: choice('Which two inks should the SVG layers use to complement the print and express the idea?',
    Object.fromEntries(Object.entries(PALETTES).map(([id, palette]) => [id, palette.description])) as Record<Palette, string>),
  placement: choice('Where should the primary and companion SVG marks meet the captured scene?', {
    all: 'Across the whole composition, openly intersecting the objects and the space around them.',
    subject: 'Only within the captured objects and architectural surfaces, like an inlay or patterned skin.',
    background: 'Only around the captured objects, leaving the subjects clear inside a designed field.',
  }),
  opacity: score('How prominent should SVG accents be while preserving the chosen medium?', [
    'A barely visible trace', 'Restrained and light', 'Clearly present', 'Confident', 'A bold graphic presence',
  ]),
  density: score('How densely should the SVG composition arrange its marks?', [
    'A few spacious marks', 'Sparse', 'Balanced', 'Intricate', 'A rich field of detail',
  ]),
  scale: score('How large should the SVG motif feel against the scene?', [
    'Small and contained', 'Intimate', 'Frame-sized', 'Expansive', 'Oversized and cropped by the frame',
  ]),
  angle: choice('What orientation gives the vector composition the right energy?', {
    level: 'Level and composed, with no rotation.',
    rising: 'A gentle upward diagonal, lifted twenty degrees counter-clockwise.',
    falling: 'A gentle downward diagonal, leaning twenty degrees clockwise.',
    quarter: 'A decisive quarter turn, exchanging horizontal and vertical rhythms.',
  }),
  blend: choice('How should the SVG inks combine with the print beneath them?', {
    normal: 'Place translucent coloured ink over the print, keeping the selected ink colours clear.',
    multiply: 'Darken and mix the inks with the print, like overprinting or a transparent coloured stain.',
    screen: 'Lighten the print with luminous marks, best for visible light on dark surfaces.',
  }),
  annotation: noul('Would a quiet extra sheet of drafting lines and specimen annotations serve this idea?'),
} satisfies QuestionSet;

export type DesignAnswers = Answers<typeof DESIGN_QUESTIONS>;
export interface DesignPlan {
  layers: SvgLayer[];
  answers: DesignAnswers;
  notes: string[];
  /** A traced picture chosen to join the composition, without its paths. */
  trace?: { id: string; name: string; style: TraceStyle; x: number; y: number; size: number };
}

const DESIGN_BRIEF =
  'Art-direct editable SVG sheets over the print with these typed choices. Every illustration receives at least one vector layer, even without an SVG request. Respect the medium: photography may need faint accents, watercolor pigment traces and paper whites, early 3D games restrained world details. Marks may make the picture stranger but must not bury the subject. Choose one lead motif and only useful companions.';

/** The design brief with the direction's full form when it fits the cap, its one-line note when it does not. */
export function designBrief(look: string | undefined, mood: Mood, stance: (brief: string) => string = (brief) => brief, direction: Direction = NO_DIRECTION): string {
  const rounded = Object.fromEntries(Object.entries(mood).map(([name, value]) => [name, Math.round(value * 100) / 100]));
  const tail = `Selected look: ${(look ?? 'scene capture').slice(0, 120)}. Mood (0\u20131): ${JSON.stringify(rounded)}.`;
  for (const words of [direction.brief, direction.note, '']) {
    const brief = stance([DESIGN_BRIEF, words, tail].filter(Boolean).join(' '));
    if (brief.length <= MAX_BRIEF_CHARACTERS) return brief;
  }
  return stance(`${DESIGN_BRIEF} ${tail}`).slice(0, MAX_BRIEF_CHARACTERS);
}

const ANGLES: Record<DesignAnswers['angle'], number> = { level: 0, rising: -20, falling: 20, quarter: 90 };
const title = (motif: SvgMotif) => SVG_MOTIFS.find((item) => item.id === motif)!.title;
const unit = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
const round = (value: number) => Number(value.toFixed(3));

/** Translate settled typed decisions into reproducible, editable sheets. No keyword interpretation. */
export function settleDesign(
  verdicts: Record<string, Verdict>,
  temperature: number,
  seed: number,
  rulings: Ruling[],
  forced: Forced = {},
  traces: readonly TraceSummary[] = [],
  exploring?: Exploring,
): DesignPlan {
  // Trace questions come after the motif questions, so an empty library leaves every draw as it was.
  const questions: QuestionSet = { ...DESIGN_QUESTIONS, ...traceSheetQuestions(traces) };
  // A separate random stream means adding or pinning design decisions never changes the cast.
  const validPins = Object.fromEntries(Object.entries(forced).filter(([name, value]) => {
    if (!Object.hasOwn(questions, name)) return false;
    const question = questions[name];
    return question.type !== 'choice' || typeof value === 'string' && Object.hasOwn(question.options, value);
  }));
  // Rerolls tour the motifs, inks, placement and blend rather than resampling the same favourites.
  const settled = settle('design', questions, verdicts, temperature, seeded(seed ^ hashText('design')), rulings, validPins, exploring);
  const answers = settled as DesignAnswers;
  const palette = PALETTES[answers.palette];
  const shared = {
    color: palette.color, accent: palette.accent,
    opacity: round(0.04 + unit(answers.opacity) * 0.76),
    density: round(0.12 + unit(answers.density) * 0.76),
    scale: round(0.65 + unit(answers.scale) * 0.9),
    rotation: ANGLES[answers.angle], blend: answers.blend, placement: answers.placement,
  };
  const sheet = (motif: SvgMotif, role: 'primary' | 'companion' | 'annotation', overrides: Partial<SvgLayer> = {}): SvgLayer => ({
    ...createSvgLayer(motif, (seed + hashText(`design:${role}`)) >>> 0),
    ...shared, ...overrides, id: `design-${role}`,
  });
  const layers = [sheet(answers.motif, 'primary')];
  if (answers.companion !== 'none') layers.push(sheet(answers.companion, 'companion', {
    color: palette.accent, accent: palette.color, opacity: round(shared.opacity * 0.65),
  }));
  if (answers.annotation) layers.push(sheet('blueprint', 'annotation', {
    opacity: round(shared.opacity * 0.42), density: round(shared.density * 0.5),
    scale: 1, rotation: 0, placement: 'all',
  }));
  const placement = { all: 'across the sheet', subject: 'on the captured objects', background: 'around the captured objects' }[answers.placement];
  const chosen = typeof settled.traceSheet === 'string' ? traces.find((trace) => trace.id === settled.traceSheet) : undefined;
  const spot = TRACE_SPOTS[(settled.traceSpot as keyof typeof TRACE_SPOTS) ?? 'centre'] ?? TRACE_SPOTS.centre;
  const trace = chosen ? {
    id: chosen.id, name: chosen.name,
    style: (['poster', 'ink', 'lines', 'ghost'].includes(settled.traceStyle as string) ? settled.traceStyle : 'poster') as TraceStyle,
    x: spot[0], y: spot[1],
    size: round(settled.traceSpot === 'corner' ? 0.25 : 0.3 + unit(Number(settled.traceSize)) * 0.75),
  } : undefined;
  return {
    layers, answers, ...(trace ? { trace } : {}),
    notes: [
      ...(trace ? [`Your traced picture \u201c${trace.name}\u201d as a ${trace.style} sheet`] : []),
      `${title(answers.motif)}${answers.companion === 'none' ? '' : ` with ${title(answers.companion)}`} in ${answers.palette} inks`,
      `${layers.length} vector ${layers.length === 1 ? 'sheet' : 'sheets'}, ${placement}, ${answers.blend} blending`,
      ...(answers.annotation ? ['An extra field-note sheet adds drafting marks and specimen annotations'] : []),
    ],
  };
}

interface DesignRoll {
  seed: number;
  temperature: number;
  rulings: Ruling[];
  forced?: Forced;
  mood: Mood;
  look?: string;
  /** Which reroll this is. When set, choices tour their plausible answers instead of resampling. */
  roll?: number;
}

/** A traced picture as a vector sheet in the composition's inks, blend and placement. */
export function traceLayer(plan: DesignPlan, image: TracedImage, seed: number): SvgLayer | null {
  if (!plan.trace) return null;
  const primary = plan.layers[0];
  const ghost = plan.trace.style === 'ghost';
  return {
    ...createSvgLayer('topography', (seed + hashText('design:trace')) >>> 0),
    id: 'design-trace', motif: 'trace',
    trace: { image, style: plan.trace.style, x: plan.trace.x, y: plan.trace.y, size: plan.trace.size },
    color: primary?.color ?? '#1d1d1f', accent: primary?.accent ?? '#8a8378',
    opacity: round(ghost ? Math.max(0.18, (primary?.opacity ?? 0.4) * 0.6) : Math.max(0.55, primary?.opacity ?? 0.6)),
    blend: ghost ? 'multiply' : primary?.blend ?? 'normal',
    placement: primary?.placement ?? 'all',
    scale: 1, rotation: 0,
  };
}

/** Consult once per look within this idea; rerolls and pins reuse its accounted probabilities. */
export class DesignDecisions {
  #verdicts = new Map<string, Promise<Record<string, Verdict>>>();

  /** One instance per direction: its verdicts were asked under that direction's words. */
  constructor(
    readonly idea: string,
    readonly usage: Usage,
    readonly options: ConsultOptions = {},
    readonly library: TraceLibrary = NO_TRACES,
    readonly direction: Direction = NO_DIRECTION,
  ) {}

  async plan({ seed, temperature, rulings, forced, mood, look, roll }: DesignRoll): Promise<DesignPlan> {
    const traces = this.library.list();
    // A new medium, or a changed trace library, gets fresh art direction; revisiting restores the same decisions.
    const key = `${look ?? ''}|${traces.map((trace) => trace.id).join(',')}`;
    let verdicts = this.#verdicts.get(key);
    if (!verdicts) {
      verdicts = consult(
        this.idea,
        designBrief(look, mood, (brief) => stanceBrief(brief, this.options), this.direction),
        { ...DESIGN_QUESTIONS, ...traceSheetQuestions(traces) }, this.usage, this.options,
      );
      this.#verdicts.set(key, verdicts);
    }
    const exploring = roll === undefined ? undefined : { roll, seed: hashText(`${this.idea}\u0000design\u0000${look ?? ''}`) };
    const plan = settleDesign(await verdicts, temperature, seed, rulings, forced, traces, exploring);
    if (plan.trace) {
      const image = await this.library.get(plan.trace.id).catch(() => null);
      const layer = image ? traceLayer(plan, image, seed) : null;
      if (layer) plan.layers.push(layer);
      else { plan.notes = plan.notes.filter((note) => !note.startsWith('Your traced picture')); delete plan.trace; }
    }
    return plan;
  }
}
