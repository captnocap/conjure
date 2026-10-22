import type * as THREE from 'three';

/**
 * The contract every component is written against.
 *
 * A component is one folder under components/<kind>s/<name>/ holding two files:
 *   manifest.ts  light, data only: what it is and when it belongs. Read for every idea.
 *   build.ts     heavy, loaded only when chosen: its questions and how to build it.
 * Its id is its folder path ("things/chair"), so two components can never collide.
 */

/** How big the world is. A thing only appears in worlds that share one of its scales. */
export const SCALES = [
  'cosmic', // galaxies, nebulae, star fields: light-years
  'planetary', // a planet, a moon, an orbit: thousands of kilometres
  'landscape', // a valley, a coastline, a skyline: kilometres
  'street', // a corner, a yard, a forecourt: tens of metres
  'room', // an interior, an aisle, a workshop: metres
  'tabletop', // a still life, a shelf, a display plinth: centimetres to a metre
  'macro', // an insect, a circuit, a drop of water: millimetres
] as const;
export type Scale = (typeof SCALES)[number];

export const KINDS = ['world', 'thing', 'look', 'direction'] as const;
export type Kind = (typeof KINDS)[number];

/** Optional outside material a component needs. A catalogue without it leaves the component out. */
export const REQUIREMENTS = ['ateliers'] as const;
export type Requirement = (typeof REQUIREMENTS)[number];

/** The engine's finishing passes, run on every print after the look. A direction names the ones it brings. */
export const FINISHES = ['otherworld', 'vacui'] as const;
export type Finish = (typeof FINISHES)[number];

/** Art media compete before individual looks, so a large print catalogue cannot crowd out painting. */
export const LOOK_MEDIA = ['realism', 'painting', 'game', 'print', 'optical', 'craft', 'mixed'] as const;
export type LookMedium = (typeof LOOK_MEDIA)[number];

export interface Manifest {
  kind: Kind;
  /** A short name a person would use. */
  title: string;
  /** One plain sentence. The decision model reads this to judge whether the component fits an idea. */
  summary: string;
  /** The scales it makes sense at. Looks and directions apply at every scale and leave this empty. */
  scales: readonly Scale[];
  /** Optional for older looks; unclassified looks join the mixed-media family. */
  medium?: LookMedium;
  /**
   * Outside material the component cannot build without, such as the Three.js ateliers repository.
   * When it is not installed the component is left out of the catalogue instead of failing.
   */
  requires?: readonly Requirement[];
}

/** One named alternative among several. Keys are the answers; values describe them to the model. */
export interface ChoiceQuestion<K extends string = string> {
  type: 'choice';
  ask: string;
  options: Readonly<Record<K, string>>;
}
/** A position on an ordered rubric. Answered as 0 (first level) to 1 (last level). */
export interface ScoreQuestion {
  type: 'score';
  ask: string;
  levels: readonly [string, string, ...string[]];
}
/** A yes/no judgement. */
export interface NoulQuestion {
  type: 'noul';
  ask: string;
}
export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion;
export type QuestionSet = Readonly<Record<string, Question>>;

/** What a builder receives: one settled value per question it asked. */
export type Answers<Q extends QuestionSet> = {
  readonly [K in keyof Q]: Q[K] extends ChoiceQuestion<infer O>
    ? O
    : Q[K] extends ScoreQuestion
      ? number
      : boolean;
};

/** Scene-wide direction decided once per idea. Builders read it so separate components agree. */
export interface Mood {
  /** 0 factory new … 1 ruined */
  wear: number;
  /** 0 icy blue … 1 furnace orange */
  warmth: number;
  /** 0 frozen still … 1 frantic */
  energy: number;
  /** 0 a single lone object … 1 overflowing */
  density: number;
  /** 0 dawn … 0.5 noon … 1 dusk: where the key light sits */
  daylight: number;
  /** 0 grim … 1 joyful */
  cheer: number;
}

/**
 * How the picture is framed, decided once per idea. Worlds that build on the diorama helper
 * honour it; a world with its own camera may read it or keep its natural view.
 */
export interface Framing {
  /** 0 low, near the ground … 0.5 the setting's natural view … 1 almost straight down */
  elevation: number;
  /** 0 tight on the hero … 0.5 the whole scene … 1 far away, small in a large space */
  distance: number;
  /** -1 turned well to the left … 0 the setting's natural angle … 1 turned well to the right */
  turn: number;
  /** 0 level … 1 tilted off level */
  tilt: number;
  /** Where the hero sits in the frame. */
  anchor: 'centre' | 'left' | 'right';
}

/** The framing a world shows when nothing has been decided: its own natural view. */
export const NATURAL_FRAMING: Readonly<Framing> = { elevation: 0.5, distance: 0.5, turn: 0, tilt: 0, anchor: 'centre' };

export interface BuildContext {
  /** The idea as the person typed it. */
  readonly idea: string;
  readonly mood: Mood;
  readonly scale: Scale;
  /** Absent for older callers and conformance checks; the same as NATURAL_FRAMING then. */
  readonly framing?: Framing;
  /** Stable for one idea and one roll. Derive all randomness from it. */
  readonly seed: number;
  /** A seeded generator in [0, 1). Never use Math.random in a component. */
  random(): number;
}

/** A built object. It must not touch the scene, the renderer or any other component. */
export interface Thing {
  /**
   * Stands on y = 0, centred on the origin in x and z, facing +z, in metres.
   * Geometry below y = 0 (roots, footings) is allowed: the world's ground buries it.
   */
  object: THREE.Object3D;
  /**
   * The radius it occupies on the ground, metres. Set it only when the visible bounds mislead:
   * a tree stands on its trunk, not on the spread of its crown and roots.
   */
  footprint?: number;
  /** Called every frame while the scene is live. */
  update?(dt: number, time: number): void;
  dispose(): void;
}

/** How a supporting thing stands in relation to the hero, decided once per scene. */
export const RELATIONS = ['on', 'beside', 'behind', 'facing', 'apart'] as const;
export type Relation = (typeof RELATIONS)[number];

/** A built thing as a world sees it when deciding where it goes. */
export interface Placeable {
  /** Move, turn and scale this. It already holds the thing, standing on y = 0 at the origin. */
  holder: THREE.Group;
  /** Footprint radius and height before any scaling, metres. */
  radius: number;
  height: number;
  /** The first item is the hero; the rest support it. */
  hero: boolean;
  /** Where it stands in relation to the hero. Absent for the hero, older callers and checks: treat as 'apart'. */
  relation?: Relation;
}

/** A setting: ground, light, camera and where things stand. It owns the look of the scene. */
export interface World {
  object: THREE.Object3D;
  camera: THREE.Camera;
  background: THREE.Color;
  /** The most things it can hold. */
  capacity: number;
  /** The surface things stand on, for captures that tell ground from object. */
  ground: THREE.Object3D | null;
  /** The main directional light, for treatments that need its direction. */
  keyLight: THREE.DirectionalLight | null;
  /** Position, turn and scale every item, then frame the camera and shadows around them. */
  place(items: readonly Placeable[]): void;
  update?(dt: number, time: number): void;
  dispose(): void;
  /**
   * Set when `place` honoured `context.framing` itself (the diorama helper does). Otherwise the
   * engine applies the safe part of the framing to the camera afterwards: closeness, anchor and tilt.
   */
  framed?: boolean;
}

/** One rendered frame, described in every way a look might need. Rows run top to bottom. */
export interface Capture {
  size: number;
  /** Display-referred RGBA8, opaque. */
  color: Uint8ClampedArray;
  /** View-space normals packed as rgb = n × 0.5 + 0.5. */
  normal: Uint8ClampedArray;
  /** Linear depth between near and far, packed across RGBA. */
  depth: Uint8Array;
  /** Red channel: 0 backdrop, 1 ground, 2+ one id per placed thing. */
  identity: Uint8Array;
  /** The scene lit as plain 18% grey: light and shadow without material colour. */
  diffuse: Uint8Array;
  near: number;
  far: number;
  /** World metres covered by one pixel at the focus distance. */
  pixelWorldSize: number;
  /** Key light direction in image space: x right, y down, z toward the viewer. */
  light: [number, number, number];
  /** Mean display colour per identity id, 0–255. */
  baseColors: (readonly [number, number, number] | null)[];
  /**
   * How strongly the decision model felt each identity id belonged, 0–1: 1 for the ground and
   * the set, the model's belonging for each placed thing. Absent in older captures and checks,
   * which treat everything as certain. A look may draw doubt as pencil and certainty as ink.
   */
  confidence?: number[];
}

/**
 * A direction is the art direction a whole picture follows: words the decision model reads with every
 * question, and which of the engine's finishing passes the print receives. One is chosen per idea
 * from the catalogue, like a world or a look, and rerolls tour the plausible ones.
 */
export interface Direction {
  /**
   * The full direction, read by scene routing (mood, framing, setting), the choice of medium and
   * look, the look's own questions and the vector composition. At most 480 characters.
   */
  brief: string;
  /** A one-line form read with each cast thing's own questions. At most 200 characters. */
  note: string;
  /** The engine's finishing passes this direction brings to every print. */
  finishes: readonly Finish[];
}

export interface LookResult {
  /** Display-referred RGBA8, opaque, rows top to bottom, capture.size square. */
  pixels: Uint8ClampedArray;
  /** What was applied, in words, for the decision sheet. */
  notes: string[];
}

interface Asks<Q extends QuestionSet> {
  /** The component's own inventory of choices. Asked only once the component has been cast. */
  questions: Q;
}
export interface ThingBuilder<Q extends QuestionSet = QuestionSet> extends Asks<Q> {
  build(answers: Answers<Q>, context: BuildContext): Thing | Promise<Thing>;
}
export interface WorldBuilder<Q extends QuestionSet = QuestionSet> extends Asks<Q> {
  build(answers: Answers<Q>, context: BuildContext): World | Promise<World>;
}
export interface LookBuilder<Q extends QuestionSet = QuestionSet> extends Asks<Q> {
  apply(
    capture: Capture,
    answers: Answers<Q>,
    context: BuildContext,
    signal: AbortSignal,
  ): Promise<LookResult>;
}
/** A direction asks nothing of its own: it is read, not built. */
export type DirectionBuilder = Direction;

export const defineManifest = (manifest: Manifest): Manifest => manifest;
export const defineThing = <const Q extends QuestionSet>(builder: ThingBuilder<Q>) => builder;
export const defineWorld = <const Q extends QuestionSet>(builder: WorldBuilder<Q>) => builder;
export const defineLook = <const Q extends QuestionSet>(builder: LookBuilder<Q>) => builder;
export const defineDirection = (direction: Direction): DirectionBuilder => direction;
