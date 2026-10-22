import { buildStaircase } from '@ateliers/staircase/src/geometry/build';
import { studies } from '@ateliers/staircase/src/model/catalog';
import { parseSpec } from '@ateliers/staircase/src/model/spec';
import { choice, choiceFrom, defineThing, noul } from '@conjure/kit';

const SAME = 'as-designed';
const MATERIALS = {
  [SAME]: 'Keep the material the design came with.',
  oak: 'Pale honest oak.',
  walnut: 'Dark rich walnut.',
  charred: 'Burnt black timber.',
  concrete: 'Raw grey concrete.',
  travertine: 'Warm pitted travertine.',
  marble: 'White veined marble.',
  terrazzo: 'Speckled terrazzo.',
  steel: 'Dark industrial steel.',
  corten: 'Rust-red weathering steel.',
  brass: 'Polished brass.',
  glass: 'Clear glass.',
} as const;

export default defineThing({
  questions: {
    design: choiceFrom(
      'Which staircase is it?',
      studies,
      (study) => study.id,
      (study) => `${study.name}, ${study.family}: ${study.subtitle}. ${study.description}`,
    ),
    treads: choice('What are the treads made of?', MATERIALS),
    glow: noul('Does a strip of light glow under each tread?'),
    carpet: noul('Is there a carpet runner down the middle?'),
  },

  build(answers, { mood }) {
    const study = studies.find((candidate) => candidate.id === answers.design)!;
    const spec = parseSpec({
      ...structuredClone(study.spec),
      age: mood.wear,
      led: answers.glow,
      runner: answers.carpet,
      ...(answers.treads === SAME ? {} : { treadMaterial: answers.treads }),
    });
    const built = buildStaircase(spec);
    built.group.traverse((node) => (node.castShadow = node.receiveShadow = true));
    return {
      object: built.group,
      dispose() {
        built.dispose();
        built.group.removeFromParent();
      },
    };
  },
});
