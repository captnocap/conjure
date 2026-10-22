import '@ateliers/chair/src/chair/parts';
import { ARCHETYPES } from '@ateliers/chair/src/chair/archetypes';
import { buildChair, disposeChair } from '@ateliers/chair/src/chair/build';
import type { ChairSpec } from '@ateliers/chair/src/chair/spec';
import { choice, choiceFrom, defineThing, mix } from '@conjure/kit';

const EXTRAS = {
  none: 'Nothing added.',
  cat: 'A cat asleep on the seat.',
  blanket: 'A blanket thrown over the back.',
  mug: 'A mug left on the seat.',
  'book-rack': 'A rack of books under the seat.',
  ottoman: 'A matching footstool in front.',
  tassels: 'Tassels hanging from the corners.',
  nailheads: 'Rows of brass nailheads along the edges.',
  'lion-heads': 'Carved lion heads on the arms.',
  crown: 'A crown resting on the seat.',
  plaque: 'A small brass memorial plaque.',
  'lot-tag': 'An auction lot tag tied to it.',
  hook: 'A coat hook on the back.',
} as const;

const SIZES = {
  child: 'Child-sized, small and low.',
  standard: 'An ordinary adult chair.',
  grand: 'Oversized and imposing.',
} as const;
const SIZE_SCALE: Record<keyof typeof SIZES, number> = { child: 0.6, standard: 1, grand: 1.35 };

export default defineThing({
  questions: {
    design: choiceFrom(
      'Which chair is it?',
      ARCHETYPES,
      (spec) => spec.id,
      ({ provenance }) =>
        [provenance.name, provenance.designer && `by ${provenance.designer}`, provenance.year, provenance.blurb]
          .filter(Boolean)
          .join(', '),
    ),
    extra: choice('What has been left on or added to the chair?', EXTRAS),
    size: choice('How big is the chair?', SIZES),
  },

  build(answers, { mood, seed }) {
    const spec: ChairSpec = structuredClone(ARCHETYPES.find((candidate) => candidate.id === answers.design)!);
    spec.seed = seed;
    spec.dims.scale = SIZE_SCALE[answers.size];
    if (answers.extra !== 'none') spec.extras = [...spec.extras, { type: answers.extra, params: {} }];
    spec.wear = {
      age: mood.wear,
      scuffs: mix(0.05, 0.95, mood.wear),
      fade: mood.wear * 0.7,
      polish: mix(0.1, 0.7, mood.wear),
      dust: mood.wear ** 1.5,
      sag: mood.wear * 0.8,
    };
    const built = buildChair(spec);
    built.root.traverse((node) => (node.castShadow = node.receiveShadow = true));
    return { object: built.root, dispose: () => disposeChair(built) };
  },
});
