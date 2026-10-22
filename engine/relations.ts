import type { ChoiceQuestion, Relation } from '../kit/contract';
import { choice } from '../kit/questions';
import { MAX_BRIEF_CHARACTERS } from './decision-limits';

/**
 * A scene is a story when its things relate: the cat is on the chair, the suitcase beside the
 * bench, the lamp post behind it all. Each supporting thing is asked one typed question about
 * the hero, and worlds built on the diorama helper place it accordingly.
 */
export const RELATION_OPTIONS: Record<Relation, string> = {
  on: 'On top of it: resting, perched or stacked on it.',
  beside: 'Right beside it, touching or nearly touching.',
  behind: 'Behind it, further from the viewer, as a backdrop to it.',
  facing: 'In front of it and turned to face it.',
  apart: 'Apart from it, somewhere else in the scene.',
};

export const relationQuestion = (title: string, hero: string): ChoiceQuestion<Relation> =>
  choice(`Where does ${title} stand in relation to ${hero}, the hero of the scene?`, RELATION_OPTIONS);

export const relationBrief = (base: string, world: string, hero: string) =>
  `${base} The setting is ${world}. The hero of the scene is ${hero}. Place each supporting thing in relation to it so the scene tells one story.`.slice(0, MAX_BRIEF_CHARACTERS);
