import { LOOK_MEDIA, type LookMedium, type QuestionSet } from '../kit/contract';
import { choice, noul } from '../kit/questions';
import { hashText, seeded } from '../kit/random';
import { directed } from './art-direction';
import { consult, type ConsultOptions, stanceBrief, type Usage, type Verdict } from './oracle';
import { explore, settle, type Forced, type Ruling } from './settle';

export const STYLE_MEDIA: Record<LookMedium, string> = {
  realism: 'Photographic realism: natural full color, material detail, believable light and camera optics; documentary, product or cinematic photography.',
  painting: 'Painting: transparent watercolor, wet pigment, luminous paper, soft or dry brushwork; expressive, atmospheric or carefully observed subjects.',
  game: 'Game graphics: early polygon-console 3D, soft cartridge textures, colorful low-resolution worlds, sprites and deliberate digital color limits.',
  print: 'Printmaking and illustration: carved or drawn marks, ink on paper, graphic shapes and varied palettes; from delicate linework to bold posters.',
  optical: 'Photochemical and electronic optics: film development, solarization, analogue video and phosphor screens; experimental light and image signals.',
  craft: 'Tactile craft: cut paper, stitched thread, stained glass and assembled color; playful, intricate or monumental handmade surfaces.',
  mixed: 'Mixed media: layered studio experiments that combine painting, drawing and material effects in a coherent image.',
};

export interface StyleLook { id: string; title: string; summary: string; medium?: LookMedium }
export const mediumOf = (look: StyleLook): LookMedium => look.medium ?? 'mixed';

export function styleQuestions(looks: readonly StyleLook[]): QuestionSet {
  return {
    styleSpecified: noul('Does the person explicitly request an art medium or rendering style? Mood, subject matter, weather and genre alone are not a request for a medium.'),
    medium: choice('Which art medium best expresses the idea? Treat each family as equally available regardless of how many looks it contains. For an open-ended idea, give several media meaningful probability.',
      Object.fromEntries(LOOK_MEDIA.filter((medium) => looks.some((look) => mediumOf(look) === medium)).map((medium) => [medium, STYLE_MEDIA[medium]]))),
  };
}

/**
 * Weighted, repeatable exploration visits each medium once before starting a new cycle. The cycle
 * opens on a weighted draw rather than always the favourite, so different ideas do not all start
 * in the same medium.
 */
export function exploreMedium(media: readonly string[], verdict: Verdict | undefined, roll: number, seed: number): string {
  if (!media.length) throw new Error('Cannot explore an empty set of art media.');
  return explore(verdict?.type === 'choice' ? verdict.probabilities : {}, media, roll, seed);
}

/** Typed medium first, then a cached consultation containing only that medium's looks. */
export class StyleDecisions {
  #direction: Promise<Record<string, Verdict>> | undefined;
  #looks = new Map<LookMedium, Promise<Record<string, Verdict>>>();

  /** `direction` is the chosen direction's full brief; the medium and look are chosen under it. */
  constructor(readonly idea: string, readonly inventory: readonly StyleLook[], readonly usage: Usage, readonly options: ConsultOptions = {}, readonly direction = '') {}

  /**
   * `shift` moves to the medium that many places further down the model's own ranking of media,
   * wrapping round, for a series that shows one scene in several media. Pinned looks and media
   * are set aside for a shifted plate, since the point is a different medium.
   */
  async plan({ temperature, roll, rulings, forced = {}, look, shift = 0 }: { temperature: number; roll: number; rulings: Ruling[]; forced?: Forced; look?: string; shift?: number }): Promise<string | null> {
    if (shift > 0) {
      look = undefined;
      forced = Object.fromEntries(Object.entries(forced).filter(([name]) => name !== 'look' && name !== 'medium'));
    }
    if (look) {
      if (!this.inventory.some((entry) => entry.id === look)) throw new Error(`Unknown look: ${look}`);
      return look;
    }
    if (!this.inventory.length) return null;
    const questions = styleQuestions(this.inventory);
    this.#direction ??= consult(this.idea, stanceBrief(directed('Choose the art medium separately from the scene\'s objects and mood. Explicit requests outrank taste or variety.', this.direction), this.options), questions, this.usage, this.options);
    const verdicts = await this.#direction;
    const random = seeded(hashText(`${this.idea}\u0000style\u0000${roll}`));
    const local: Ruling[] = [];
    const pins = Object.fromEntries(Object.entries(forced).filter(([name, value]) =>
      name === 'styleSpecified' || name === 'medium' && typeof value === 'string' && Object.hasOwn((questions.medium as { options: object }).options, value)));
    // Intent is a constraint, not a random creative choice: rerolling must not erase an explicit request.
    const specific = Object.hasOwn(pins, 'styleSpecified') ? pins.styleSpecified === true || pins.styleSpecified === 'yes'
      : verdicts.styleSpecified?.type === 'noul' && verdicts.styleSpecified.p >= 0.5;
    const answers = settle('direction', questions, this.options.offline ? { ...verdicts, styleSpecified: { type: 'noul', p: 0 } } : verdicts, specific ? 0 : temperature, random, local, pins);
    const intent = local.find((ruling) => ruling.name === 'styleSpecified')!;
    intent.picked = specific ? 'yes' : 'no';
    intent.confidence = intent.options?.find((option) => option.label === intent.picked)?.p ?? 0;
    const pinnedLook = typeof forced.look === 'string' ? this.inventory.find((entry) => entry.id === forced.look) : undefined;
    let medium = pinnedLook ? mediumOf(pinnedLook) : answers.medium as LookMedium;
    const family = local.find((ruling) => ruling.name === 'medium')!;
    const media = Object.keys((questions.medium as { options: object }).options);
    let explored = false;
    if (pinnedLook) {
      family.note = 'The medium follows your pinned look.';
      family.forced = false;
    }
    else if (!specific && temperature > 0 && !Object.hasOwn(pins, 'medium')) {
      medium = exploreMedium(media, verdicts.medium, roll, hashText(this.idea)) as LookMedium;
      explored = true;
      family.note = 'Open style: rerolls explore each available medium once per cycle. Percentages show model relevance.';
    }
    if (shift > 0) {
      const available = Object.keys((questions.medium as { options: object }).options);
      const weight = (name: string) => verdicts.medium?.type === 'choice' ? verdicts.medium.probabilities[name] ?? 0 : 0;
      // Ties keep the catalogue order, so offline series still differ plate to plate.
      const ranked = [...available].sort((a, b) => weight(b) - weight(a) || available.indexOf(a) - available.indexOf(b));
      medium = ranked[(ranked.indexOf(medium) + shift) % ranked.length] as LookMedium;
      family.note = `Plate ${shift + 1} of a series in several media: the model's next most likely medium.`;
      family.forced = false;
    }
    family.picked = medium;
    family.confidence = family.options?.find((option) => option.label === medium)?.p ?? 0;
    family.alternatives = (family.options ?? []).filter((option) => option.label !== medium).slice(0, 3);
    rulings.push(...local);
    const choices = this.inventory.filter((entry) => mediumOf(entry) === medium);
    const lookQuestions = { look: choice(`Which ${medium} treatment should finish the picture? Honor any specifically requested style.`, Object.fromEntries(choices.map((entry) => [entry.id, entry.summary]))) };
    let pending = this.#looks.get(medium);
    if (!pending) {
      pending = choices.length === 1
        ? Promise.resolve({ look: { type: 'choice' as const, probabilities: { [choices[0].id]: 1 } } })
        : consult(this.idea, stanceBrief(directed(`Choose within the ${medium} medium. Explicit requests outrank taste or variety.`, this.direction), this.options), lookQuestions, this.usage, this.options);
      this.#looks.set(medium, pending);
    }
    const lookVerdicts = await pending;
    const lookRulings: Ruling[] = [];
    let picked = settle('direction', lookQuestions, lookVerdicts, specific ? 0 : temperature, random, lookRulings, pinnedLook ? { look: pinnedLook.id } : {}).look as string;
    // Rerolls never keep printing the same treatment: each visit to a medium, and every reroll of
    // a requested one, takes the next treatment on a tour that starts with the model's favourite.
    if (temperature > 0 && !pinnedLook && shift === 0 && choices.length > 1) {
      const known = lookVerdicts.look?.type === 'choice' ? lookVerdicts.look.probabilities : {};
      const weights = Object.fromEntries(choices.map((entry) => [entry.id, known[entry.id] ?? 0]));
      const visit = explored ? Math.floor(Math.max(0, roll) / media.length) : roll;
      picked = explore(weights, choices.map((entry) => entry.id), visit, hashText(`${this.idea}\u0000look\u0000${medium}`));
      const ruling = lookRulings.find((entry) => entry.name === 'look')!;
      ruling.picked = picked;
      ruling.confidence = weights[picked];
      ruling.alternatives = (ruling.options ?? []).filter((option) => option.label !== picked).slice(0, 3);
      ruling.note = specific
        ? 'You asked for this medium: rerolls visit each of its treatments, the model\u2019s favourite first. Percentages show model relevance.'
        : 'Each return to this medium visits another of its treatments, the model\u2019s favourite first. Percentages show model relevance.';
    }
    rulings.push(...lookRulings);
    return picked;
  }
}
