import type { QuestionSet, Scale } from '../kit/contract';
import { noul } from '../kit/questions';
import { MAX_BRIEF_CHARACTERS } from './decision-limits';
import { consult, type ConsultOptions, type Usage } from './oracle';

export interface CastCandidate {
  id: string;
  title: string;
  summary: string;
  scales: readonly Scale[];
}
export type CastSetting = CastCandidate;

/** How many of the closest things are judged again with the setting in view. */
export const SHORTLIST = 36;
/** Things below this idea-only belonging are never shortlisted or cast. */
export const BELONGS_FLOOR = 0.2;
/** Things outside the shortlist keep their idea-only belonging, scaled below the re-judged ones. */
const UNJUDGED = 0.6;

export const castName = (id: string) => `cast:${id}`;

const questionsFor = (things: readonly CastCandidate[]): QuestionSet =>
  Object.fromEntries(things.map((thing) => [castName(thing.id), noul(`Would this belong in the scene? ${thing.title}: ${thing.summary}`)]));

/**
 * Casting in two stages. First every thing that exists at the setting's scales is asked
 * whether it belongs to the idea, once per idea. Then the closest few are asked again with
 * the setting in view, so a tide pool is not cast into a courtroom because the idea was wet.
 * A reroll that keeps its setting asks nothing; one that moves to a new setting asks one
 * more short batch, plus any scales it has not visited.
 */
export class CastingDecisions {
  #byIdea: Record<string, number> = {};
  #asked = new Set<string>();
  #chains = new Map<string, Promise<void>>();
  #bySetting = new Map<string, Promise<Record<string, number>>>();

  constructor(
    readonly idea: string,
    readonly brief: string,
    readonly things: readonly CastCandidate[],
    readonly usage: Usage,
    readonly options: ConsultOptions = {},
  ) {}

  eligible(setting: CastSetting): CastCandidate[] {
    return this.things.filter((thing) => thing.scales.some((scale) => setting.scales.includes(scale)));
  }

  /** Idea-only belonging for every thing at the setting's scales, consulted once per thing. */
  #general(setting: CastSetting): Promise<void> {
    const key = [...setting.scales].sort().join('+');
    let chain = this.#chains.get(key);
    if (!chain) {
      const missing = this.eligible(setting).filter((thing) => !this.#asked.has(thing.id));
      for (const thing of missing) this.#asked.add(thing.id);
      chain = missing.length
        ? consult(this.idea, this.brief, questionsFor(missing), this.usage, { ...this.options, about: 'casting' }).then(
            (verdicts) => {
              for (const thing of missing) {
                const verdict = verdicts[castName(thing.id)];
                this.#byIdea[thing.id] = verdict?.type === 'noul' ? verdict.p : 0.5;
              }
            },
            (error: unknown) => {
              // Leave the things askable again, so a retried idea is not stuck with guesses.
              for (const thing of missing) this.#asked.delete(thing.id);
              this.#chains.delete(key);
              throw error;
            },
          )
        : Promise.resolve();
      this.#chains.set(key, chain);
    }
    return chain;
  }

  #settingBrief(setting: CastSetting) {
    const summary = setting.summary.length > 400 ? `${setting.summary.slice(0, 399)}…` : setting.summary;
    return `${this.brief} The setting is ${setting.title}: ${summary} Judge whether each thing belongs in that setting for this idea.`.slice(0, MAX_BRIEF_CHARACTERS);
  }

  /** Belonging per eligible thing for this setting: re-judged for the shortlist, idea-only for the rest. */
  async belongs(setting: CastSetting): Promise<Map<string, number>> {
    await this.#general(setting);
    const eligible = this.eligible(setting);
    const ideaOnly = (thing: CastCandidate) => this.#byIdea[thing.id] ?? 0.5;
    let pending = this.#bySetting.get(setting.id);
    if (!pending) {
      const shortlist = [...eligible]
        .filter((thing) => ideaOnly(thing) >= BELONGS_FLOOR)
        .sort((a, b) => ideaOnly(b) - ideaOnly(a))
        .slice(0, SHORTLIST);
      pending = shortlist.length
        ? consult(this.idea, this.#settingBrief(setting), questionsFor(shortlist), this.usage, { ...this.options, about: 'shortlist' }).then(
            (verdicts) => Object.fromEntries(shortlist.flatMap((thing) => {
              const verdict = verdicts[castName(thing.id)];
              return verdict?.type === 'noul' ? [[thing.id, verdict.p] as const] : [];
            })),
            (error: unknown) => {
              this.#bySetting.delete(setting.id);
              throw error;
            },
          )
        : Promise.resolve({});
      this.#bySetting.set(setting.id, pending);
    }
    const judged = await pending;
    const scale = Object.keys(judged).length ? UNJUDGED : 1;
    return new Map(eligible.map((thing) => [thing.id, thing.id in judged ? judged[thing.id] : ideaOnly(thing) * scale]));
  }
}
