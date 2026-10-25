import type { Direction, Finish, Framing, Kind, Mood, QuestionSet, Scale } from '@conjure/kit';
import { choice, hashText, score, seeded } from '@conjure/kit';
import { type Entry, entriesOf, entryOf, loadBuilder } from './catalogue';
import { type ConsultOptions, type Usage, type Verdict, consult, noUsage, stanceBrief } from './oracle';
import { type Forced, type Ruling, settle } from './settle';
import { DesignDecisions, type DesignPlan } from './design';
import { StyleDecisions } from './styles';
import { BRIEF_BASE, HOUSE, HOUSE_NOTE, HOUSE_BRIEF, NO_DIRECTION, directed, directionOf, houseQuestion } from './art-direction';
import { BELONGS_FLOOR, CastingDecisions, castName } from './casting';
import { FRAMING_QUESTIONS, adjustFraming, framingOf } from './framing';
import { PRESENTATIONS, PRESENTATION_QUESTIONS, type Presentation, adjustMood, presentationOf } from './presentation';
import { type SceneSoFar, sceneBrief } from './scene-brief';
import { relationBrief, relationQuestion } from './relations';
import { NO_TRACES, traceLibrary } from './traces';
import { ACCENT_QUESTIONS, type AccentEdge, type AccentRegion } from './accent';
import { OTHERWORLD_QUESTIONS, type Otherworld, otherworldOf } from './otherworld';
import { VACUI_QUESTIONS, type Vacui, vacuiOf } from './vacui';
import { MOTION_QUESTIONS, type CameraMove, cameraMoveOf } from './motion';
import { announce } from './activity';
import type { Relation } from '@conjure/kit';


/** Asked once per idea. Every builder reads the result, so separate components agree with each other. */
const MOOD_QUESTIONS = {
  wear: score('How worn and weathered is everything in this scene?', [
    'Factory new, untouched',
    'Lightly used',
    'Worn and lived-in',
    'Battered and neglected',
    'Ruined',
  ]),
  warmth: score('What is the colour temperature of the light?', [
    'Icy blue',
    'Cool',
    'Neutral daylight',
    'Warm',
    'Furnace orange',
  ]),
  energy: score('How much movement and tension is in the scene?', [
    'Frozen still',
    'A slow drift',
    'Gentle',
    'Lively',
    'Frantic',
  ]),
  density: score('How many things share the scene?', [
    'One lone object',
    'A pair',
    'A small group',
    'Crowded',
    'Overflowing',
  ]),
  daylight: score('Where does the light come from?', [
    'Low from one side, first light',
    'A slanting morning sun',
    'High overhead, noon',
    'A slanting late-afternoon sun',
    'Low from the other side, last light',
  ]),
  cheer: score('What is the emotional weather?', [
    'Grim, grieving or menacing',
    'Uneasy or melancholy',
    'Neutral, matter-of-fact',
    'Content, playful',
    'Joyful, exuberant',
  ]),
} satisfies QuestionSet;

export const MOOD_NAMES: readonly string[] = Object.keys(MOOD_QUESTIONS);

/** Casting samples at this fraction of the roll temperature, so rerolls stay among plausible things. */
export const CASTING_COOLING = 0.45;

export interface CastMember {
  entry: Entry;
  /** How strongly the model felt it belonged. */
  belongs: number;
  answers: Record<string, string | number | boolean>;
  /** Where a supporting thing stands in relation to the hero. The hero has none. */
  relation?: Relation;
}

/** Everything decided for one idea and one roll. Enough to build the scene without asking again. */
export interface Plan {
  idea: string;
  seed: number;
  scale: Scale;
  mood: Mood;
  world: CastMember;
  look: CastMember | null;
  cast: CastMember[];
  rulings: Ruling[];
  usage: Usage;
  /** Typed, model-directed SVG layers. Optional when reading older saved plans. */
  design?: DesignPlan;
  /** Things that suit this world and came closest to being cast, strongest first. */
  nearly?: { id: string; title: string; belongs: number }[];
  /** How many places the cast was given. */
  wanted?: number;
  /** How the camera sees the scene, decided with the mood. */
  framing: Framing;
  /** One plate or a short series, and which plate this plan builds. */
  presentation: Presentation & { index: number };
  /** A second look laid over the hero or its most striking detail. */
  accent?: { region: AccentRegion; edge: AccentEdge; look: CastMember };
  /** How the finished print shows it comes from another dimension. Absent in plain studies and older plans. */
  otherworld?: Otherworld;
  /** How the print's dead space fills with micro-macro detail. Absent in plain studies and older plans. */
  vacui?: Vacui;
  /** How the camera moves if the print is recorded as a loop. */
  camera?: CameraMove;
  /** The direction the whole picture followed. Absent in plain studies and plans made before directions existed. */
  direction?: { entry: Entry; finishes: readonly Finish[] };
}

/**
 * Answers pinned by a person branching from a decision. Keys are "<owner>::<question>", where
 * the owner is "direction", "design" or a component id: "design::motif", "direction::world", "direction::cast:things/chair"
 * (true casts it, false leaves it out), "things/chair::design".
 */
export type Force = Readonly<Record<string, string | number | boolean>>;
const forcedFor = (force: Force | undefined, owner: string): Forced =>
  Object.fromEntries(
    Object.entries(force ?? {})
      .filter(([key]) => key.startsWith(`${owner}::`))
      .map(([key, value]) => [key.slice(owner.length + 2), value]),
  );

/** Components a reading may not use: the telephone game rules out everything already heard. */
export interface Exclusions {
  worlds?: readonly string[];
  things?: readonly string[];
  looks?: readonly string[];
}

export interface RollOptions {
  /** 0 takes first choices; 1 samples details and explores media for ideas without a requested style. */
  temperature: number;
  /** Changes which plausible scene comes out. The same idea, roll and temperature repeat exactly. */
  roll: number;
  /** Pinned answers. Everything not pinned is decided exactly as it would be without them. */
  force?: Force;
  /** Which plate of the settled presentation to build. The primary plate when omitted. */
  plate?: number;
}

/**
 * One idea, consulted once. The model's probabilities are kept, so rolling again
 * reuses them and only asks about components and settings that have not been used before.
 */
export class Conjuring {
  readonly usage = noUsage();
  /** Asked once; the direction is chosen before anything else and every later brief is written under it. */
  #house: Promise<Record<string, Verdict>> | null = null;
  /** Routing, style and design verdicts are kept per direction: a reroll that tours to another direction asks again under its words. */
  #routing = new Map<string, Record<string, Verdict>>();
  #routed = new Map<string, Promise<void>>();
  #details = new Map<string, Promise<{ questions: QuestionSet; verdicts: Record<string, Verdict> }>>();
  #relations = new Map<string, Promise<Record<string, Verdict>>>();
  #designs = new Map<string, DesignDecisions>();
  #styles = new Map<string, StyleDecisions>();
  #casting: CastingDecisions;

  constructor(
    readonly idea: string,
    readonly options: ConsultOptions & {
      /** Skip casting and put exactly these things on stage. For galleries and tests. */
      cast?: string[];
      /** Skip the choice of setting and use this world. For galleries and tests. */
      world?: string;
      /** Use this look explicitly. For conformance checks and catalogue studies. */
      look?: string;
      /** Natural framing and a single plate: no camera or presentation questions. For checks and studies. */
      plain?: boolean;
      /** Never choose these components. */
      exclude?: Exclusions;
    } = {},
  ) {
    // Casting hears no direction: every thing is one yes/no per idea, so it is asked once, whatever direction a reroll tours to.
    this.#casting = new CastingDecisions(idea, stanceBrief(BRIEF_BASE, options), this.#entries('thing'), this.usage, options);
  }

  #stylesFor(key: string, direction: Direction): StyleDecisions {
    let styles = this.#styles.get(key);
    if (!styles) this.#styles.set(key, (styles = new StyleDecisions(this.idea, this.#entries('look'), this.usage, this.options, direction.brief)));
    return styles;
  }

  #designFor(key: string, direction: Direction): DesignDecisions {
    let design = this.#designs.get(key);
    if (!design) this.#designs.set(key, (design = new DesignDecisions(this.idea, this.usage, this.options, this.options.offline || this.options.plain ? NO_TRACES : traceLibrary, direction)));
    return design;
  }

  /**
   * The direction is the first decision: one typed choice among the catalogue's directions, under the
   * base brief alone. Rerolls tour the plausible ones; a pin holds. Plain studies follow none.
   */
  async #direct(temperature: number, roll: number, seed: number, rulings: Ruling[], pins: Forced): Promise<{ entry: Entry; direction: Direction } | null> {
    const directions = this.#entries('direction');
    if (this.options.plain || !directions.length) return null;
    const questions = houseQuestion(directions);
    this.#house ??= consult(this.idea, stanceBrief(`${BRIEF_BASE} ${HOUSE_BRIEF}`, this.options), questions, this.usage, { ...this.options, about: 'direction' });
    const verdicts = await this.#house;
    const local: Ruling[] = [];
    const answers = settle('direction', questions, verdicts, temperature, seeded(seed ^ hashText(HOUSE)), local, pins, { roll, seed: hashText(`${this.idea}\u0000${HOUSE}`) });
    const ruling = local.find((candidate) => candidate.name === HOUSE)!;
    if (ruling.note) ruling.note = HOUSE_NOTE;
    rulings.push(...local);
    const entry = entryOf(directionOf(answers, directions));
    announce({ type: 'decided', stage: 'direction', title: 'Direction', detail: entry.title });
    const direction = await loadBuilder(entry as Entry & { kind: 'direction' });
    return { entry, direction };
  }

  /** The catalogue minus anything this reading was told to leave alone. */
  #entries(kind: Kind): Entry[] {
    const exclude = this.options.exclude;
    const banned = new Set(kind === 'world' ? exclude?.worlds ?? [] : kind === 'thing' ? exclude?.things ?? [] : kind === 'look' ? exclude?.looks ?? [] : []);
    return banned.size ? entriesOf(kind).filter((entry) => !banned.has(entry.id)) : entriesOf(kind);
  }

  #routingQuestions(): QuestionSet {
    const worlds = this.#entries('world');
    return {
      ...MOOD_QUESTIONS,
      ...(this.options.plain ? {} : { ...FRAMING_QUESTIONS, ...PRESENTATION_QUESTIONS, ...ACCENT_QUESTIONS }),
      ...(!this.options.world ? { world: choice(
        'Which setting should hold this scene?',
        Object.fromEntries(worlds.map((entry) => [entry.id, entry.summary])),
      ) } : {}),
    };
  }

  /**
   * A component's questions are judged with the setting, the company and the print in view, and under
   * the direction: a look hears its full brief, a world or thing its one-line note.
   */
  #detailsFor(entry: Entry & { kind: 'world' | 'thing' | 'look' }, scene: SceneSoFar, direction: Direction, directionKey: string) {
    const key = `${directionKey}|${entry.kind === 'world' ? `${entry.id}@hero:${scene.cast[0]?.id ?? ''}` : `${entry.id}@${scene.world.id}`}`;
    let pending = this.#details.get(key);
    if (!pending) {
      pending = loadBuilder(entry).then(async (builder) => {
        const questions = builder.questions;
        const verdicts = Object.keys(questions).length
          ? await consult(
              this.idea,
              sceneBrief(stanceBrief(directed(BRIEF_BASE, entry.kind === 'look' ? direction.brief : direction.note), this.options), entry, scene),
              questions,
              this.usage,
              { ...this.options, about: `detail:${entry.id}` },
            )
          : {};
        return { questions, verdicts };
      });
      this.#details.set(key, pending);
    }
    return pending;
  }

  async plan({ temperature, roll, force, plate }: RollOptions): Promise<Plan> {
    const pins = forcedFor(force, 'direction');
    const seed = hashText(`${this.idea}\u0000${roll}`);
    const rulings: Ruling[] = [];
    // The direction first, on its own stream, so adding it changed none of the other draws of a roll.
    const directed_ = await this.#direct(temperature, roll, seed, rulings, pins);
    const direction = directed_?.direction ?? NO_DIRECTION;
    const directionKey = directed_?.entry.id ?? '';
    const routing = this.#routingQuestions();
    // The finishing passes the direction brings ride in the routing request but each settles on its own
    // stream, so a direction without them leaves the routing draws as they were.
    const brings = (finish: Finish) => !this.options.plain && direction.finishes.includes(finish);
    const finishes = this.options.plain ? {} : { ...(brings('otherworld') ? OTHERWORLD_QUESTIONS : {}), ...(brings('vacui') ? VACUI_QUESTIONS : {}), ...MOTION_QUESTIONS };
    let routed_ = this.#routed.get(directionKey);
    if (!routed_) {
      routed_ = consult(this.idea, stanceBrief(directed(BRIEF_BASE, direction.brief), this.options), { ...routing, ...finishes }, this.usage, { ...this.options, about: 'scene' }).then((verdicts) => {
        this.#routing.set(directionKey, verdicts);
      });
      this.#routed.set(directionKey, routed_);
    }
    const styleRulings: Ruling[] = [];
    // Finish this chain before asking about style, so a failed style consultation cannot
    // leave a catalogue-sized sequence of requests running behind a failed generation.
    await routed_;
    const verdicts = this.#routing.get(directionKey) ?? {};

    const random = seeded(seed);
    const routed = settle('direction', routing, verdicts, temperature, random, rulings, pins);
    const said = (name: string) => rulings.find((ruling) => ruling.owner === 'direction' && ruling.name === name)?.picked ?? '';
    const words = (name: string) => said(name).split(/[:,]/)[0].toLowerCase();
    announce({ type: 'decided', stage: 'scene', title: 'Mood', detail: ['cheer', 'wear', 'warmth', 'energy'].map(words).filter(Boolean).join(' · ') });
    if (!this.options.plain) {
      announce({ type: 'decided', stage: 'framing', title: 'Framing', detail: [words('distance'), words('elevation'), words('level')].filter(Boolean).join(' · ') });
      const kind = presentationOf(routed).kind;
      announce({ type: 'decided', stage: 'presentation', title: 'Presentation', detail: kind === 'plate' ? 'one plate' : `${kind}: ${PRESENTATIONS[kind].split(/[:.]/)[0].toLowerCase()}` });
    }
    const settingEntry = entryOf(this.options.world ?? (routed.world as string));
    announce({ type: 'decided', stage: 'world', title: 'Setting', detail: settingEntry.title });
    // Rerolls tour every finish's choices. A replay of an entry made before a finish existed pins it off.
    const finish = <T>(questions: QuestionSet, name: string, read: (answers: Record<string, string | number | boolean>) => T): T | undefined =>
      this.options.plain ? undefined
        : read(settle('direction', questions, verdicts, temperature, seeded(seed ^ hashText(name)), rulings, pins, { roll, seed: hashText(`${this.idea}\u0000${name}`) }));
    const otherworld = brings('otherworld') && pins.rift !== 'none' ? finish(OTHERWORLD_QUESTIONS, 'otherworld', otherworldOf) : undefined;
    const vacui = brings('vacui') && pins.vacui !== 'none' ? finish(VACUI_QUESTIONS, 'vacui', vacuiOf) : undefined;
    const camera = finish(MOTION_QUESTIONS, 'motion', cameraMoveOf);
    const styles = this.#stylesFor(directionKey, direction);

    const presentation = presentationOf(routed);
    const index = Math.min(Math.max(0, Math.floor(Number.isFinite(plate) ? (plate as number) : presentation.primary)), presentation.plates.length - 1);
    // A series in several media moves each later plate to the model's next most likely medium.
    const shift = presentation.kind === 'styles' ? index : 0;
    const lookId = await styles.plan({ temperature, roll, rulings: styleRulings, forced: pins, look: shift ? undefined : this.options.look, shift });
    rulings.push(...styleRulings);
    const current = presentation.plates[index];
    const series = presentation.plates.length > 1;
    const note = `Set by the ${presentation.kind} presentation for this plate: ${current.title}.`;
    let mood: Mood = {
      wear: routed.wear as number,
      warmth: routed.warmth as number,
      energy: routed.energy as number,
      density: routed.density as number,
      daylight: routed.daylight as number,
      cheer: routed.cheer as number,
    };
    if (series) mood = adjustMood(mood, current, rulings, note);
    let framing = framingOf(routed);
    if (series) framing = adjustFraming(framing, current.framing, rulings, note);

    const worldEntry = settingEntry;
    const scale = worldEntry.scales[0];
    const lookEntry = lookId ? entryOf(lookId) : null;

    // Cast by how strongly each thing belongs, among those that exist at this world's scale.
    const forced = this.options.cast;
    const belonging = forced ? new Map<string, number>() : await this.#casting.belongs(worldEntry);
    const eligible = this.#entries('thing')
      .filter((entry) => entry.scales.some((candidate) => worldEntry.scales.includes(candidate)))
      .map((entry) => ({ entry, belongs: belonging.get(entry.id) ?? 0.5 }));
    const wanted = Math.max(1, Math.round(1 + mood.density * 5));
    // Casting explores cooler than details do: a reroll should try the next plausible thing,
    // not a 14% thing over an 82% one, which full-temperature Gumbel noise did often.
    const castingTemperature = temperature * CASTING_COOLING;
    const ranked = eligible
      .map((candidate) => ({
        ...candidate,
        // Gumbel noise turns a ranking into a draw without replacement, weighted by belonging.
        draw:
          castingTemperature <= 0
            ? candidate.belongs
            : Math.log(Math.max(candidate.belongs, 1e-4)) / castingTemperature -
              Math.log(-Math.log(Math.max(random(), 1e-9))),
      }))
      .sort((a, b) => b.draw - a.draw);
    const chosen = forced
      ? forced.map((id) => ({ entry: entryOf(id), belongs: 1 }))
      : (() => {
          // A pinned thing is cast first whatever its odds; a thing pinned out is never cast.
          const pinned = (candidate: { entry: Entry }) => pins[castName(candidate.entry.id)];
          const kept = ranked.filter((candidate) => pinned(candidate) === true);
          const open = ranked.filter((candidate) => pinned(candidate) === undefined);
          return [...kept, ...open.filter((candidate, position) => (position === 0 && !kept.length) || candidate.belongs >= BELONGS_FLOOR).slice(0, Math.max(0, wanted - kept.length))];
        })();
    const nearly = forced
      ? []
      : ranked
          .filter((candidate) => !chosen.some((member) => member.entry.id === candidate.entry.id))
          .sort((a, b) => b.belongs - a.belongs)
          .slice(0, 10)
          .map((candidate) => ({ id: candidate.entry.id, title: candidate.entry.title, belongs: candidate.belongs }));

    announce({ type: 'decided', stage: 'casting', title: 'Cast', detail: forced ? `${chosen.length} chosen for the study` : `${chosen.length} of ${eligible.length} things at this scale`, items: chosen.map((member) => member.entry.title) });
    const scene: SceneSoFar = { world: worldEntry, cast: chosen.map((member) => member.entry), look: lookEntry };
    // One typed question per supporting thing: where it stands in relation to the hero.
    const hero = chosen[0]?.entry;
    const supporting = chosen.slice(1).map((member) => member.entry);
    const relationQuestions = hero && !this.options.plain
      ? Object.fromEntries(supporting.map((entry) => [entry.id, relationQuestion(entry.title, hero.title)]))
      : {};
    const relationKey = `${worldEntry.id}|${hero?.id ?? ''}|${supporting.map((entry) => entry.id).sort().join(',')}`;
    let relations = this.#relations.get(relationKey);
    if (!relations) {
      relations = Object.keys(relationQuestions).length
        ? consult(this.idea, relationBrief(stanceBrief(BRIEF_BASE, this.options), worldEntry.title, hero!.title), relationQuestions, this.usage, { ...this.options, about: 'relations' })
        : Promise.resolve({});
      this.#relations.set(relationKey, relations);
    }
    const detail = async (entry: Entry, belongs: number): Promise<CastMember> => {
      const [{ questions, verdicts }, related] = await Promise.all([this.#detailsFor(entry as Entry & { kind: 'world' | 'thing' | 'look' }, scene, direction, directionKey), relations!]);
      const pins = forcedFor(force, entry.id);
      const member: CastMember = {
        entry,
        belongs,
        // A look's own answers tour on rerolls, so rolling again never reprints the same treatment.
        answers: settle(entry.id, questions, verdicts, temperature, seeded(seed ^ hashText(entry.id)), rulings, pins,
          entry.kind === 'look' ? { roll, seed: hashText(`${this.idea}\u0000${entry.id}`) } : undefined),
      };
      if (entry.id in relationQuestions) {
        const question = relationQuestions[entry.id];
        member.relation = settle(entry.id, { relation: question }, { relation: related[entry.id] }, temperature, seeded(seed ^ hashText(`${entry.id}:relation`)), rulings, pins).relation as Relation;
      }
      // The feed hears the answers in words: the first few picks, then where the thing stands.
      const words = rulings
        .filter((ruling) => ruling.owner === entry.id && ruling.name !== 'relation')
        .map((ruling) => ruling.kind === 'noul' ? (ruling.picked === 'yes' ? ruling.name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase() : '') : ruling.picked.replace(/^(worlds|looks|things)\//, '').split(/[:,(]/)[0].replace(/[-_]+/g, ' ').trim().toLowerCase())
        .filter(Boolean);
      const asked = Object.keys(questions).length;
      announce({
        type: 'decided', stage: `detail:${entry.id}`, title: entry.title,
        detail: [
          words.length ? `${words.slice(0, 4).join(' · ')}${words.length > 4 ? ` · and ${words.length - 4} more` : ''}` : asked ? `${asked} question${asked === 1 ? '' : 's'} answered` : 'nothing to decide',
          member.relation && hero ? `${member.relation} ${hero.title.toLowerCase()}` : '',
        ].filter(Boolean).join(' · '),
      });
      return member;
    };
    // A second style over part of the picture: the model's next most likely medium, unless pinned.
    let accentEntry: Entry | null = null;
    const region = routed.accent;
    if ((region === 'hero' || region === 'detail') && lookEntry && chosen.length) {
      const looks = this.#entries('look').filter((entry) => entry.id !== lookEntry.id);
      const pinned = typeof pins.accentLook === 'string' ? looks.find((entry) => entry.id === pins.accentLook) : undefined;
      const accentId = pinned?.id ?? await styles.plan({ temperature, roll, rulings: [], forced: pins, shift: 1 });
      if (accentId && accentId !== lookEntry.id) {
        accentEntry = entryOf(accentId);
        rulings.push({
          owner: 'direction', name: 'accentLook', kind: 'choice',
          ask: 'Which second style is laid over part of the picture?',
          picked: accentEntry.id, confidence: pinned ? 0 : 1, alternatives: [],
          options: [{ label: accentEntry.id, p: 1 }, ...looks.filter((entry) => entry.id !== accentEntry!.id).map((entry) => ({ label: entry.id, p: 0 }))],
          ...(pinned ? { forced: true } : { note: 'The look of the model\u2019s next most likely medium, so the second style contrasts with the first.' }),
        });
      }
    }
    const designed = this.#designFor(directionKey, direction).plan({ seed, temperature, rulings, forced: forcedFor(force, 'design'), mood, look: lookEntry?.title, roll }).then((plan) => {
      announce({ type: 'decided', stage: 'composition', title: 'Vector sheets', detail: plan.notes.join(', ') || `${plan.layers.length} sheet${plan.layers.length === 1 ? '' : 's'}` });
      return plan;
    });
    const [world, look, accentLook, design, ...cast] = await Promise.all([
      detail(worldEntry, 1),
      lookEntry ? detail(lookEntry, 1) : Promise.resolve(null),
      accentEntry ? detail(accentEntry, 1) : Promise.resolve(null),
      designed,
      ...chosen.map((candidate) => detail(candidate.entry, candidate.belongs)),
    ]);
    if (Object.keys(relationQuestions).length) {
      const placed = (cast as CastMember[]).filter((member) => member.relation).map((member) => `${member.entry.title.toLowerCase()} ${member.relation} ${hero!.title.toLowerCase()}`);
      announce({ type: 'decided', stage: 'relations', title: 'Relations', detail: placed.join(', ') || 'none' });
    }

    return {
      idea: this.idea,
      seed,
      scale,
      mood,
      world: world!,
      look,
      cast: cast as CastMember[],
      rulings,
      usage: { ...this.usage },
      design,
      nearly,
      wanted,
      framing,
      presentation: { ...presentation, index },
      ...(otherworld ? { otherworld } : {}),
      ...(vacui ? { vacui } : {}),
      ...(camera ? { camera } : {}),
      ...(directed_ ? { direction: { entry: directed_.entry, finishes: direction.finishes } } : {}),
      ...(accentLook && (region === 'hero' || region === 'detail')
        ? { accent: { region, edge: (typeof routed.accentEdge === 'string' && routed.accentEdge in ACCENT_QUESTIONS.accentEdge.options ? routed.accentEdge : 'clean') as AccentEdge, look: accentLook } }
        : {}),
    };
  }
}
