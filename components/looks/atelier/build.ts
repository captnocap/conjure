import { choice, choiceFrom, defineLook, mix as blend, score } from '@conjure/kit';
import { type AtelierLayer, type AtelierMix, applyMix, styles } from './atelier';
import { describeStudy } from './studies';

const describe = describeStudy;
const NONE = 'none';

const BLENDS = {
  multiply: 'Darkens: the second process prints over the first like ink on ink.',
  screen: 'Lightens: the second process glows through the first like light.',
  color: 'Tints: keeps the first drawing and borrows only the colour of the second.',
} as const;

const FINISHES = {
  none: 'No added effect: the print stands as drawn. Right for most pictures.',
  'finite-lenses': 'Seen through small lenses: local refraction and soft optical bloom.',
  'ink-completed-mix': 'Ink bleeds along the boundaries of the finished picture.',
  'fluted-glass': 'Seen through ribbed glass: vertical bands smear and repeat the image.',
} as const;

const AMOUNT = ['A trace', 'Light', 'Balanced', 'Strong', 'Dominant'] as const;

export default defineLook({
  questions: {
    base: choiceFrom('Which process draws the picture?', styles, (style) => style.id, describe),
    overlay: choice('Which second process is laid over it, if any?', {
      [NONE]: 'No second process: one clean treatment.',
      ...Object.fromEntries(styles.map((style) => [style.id, describe(style)])),
    }),
    overlayBlend: choice('How does the second process combine with the first?', BLENDS),
    overlayWeight: score('How strongly does the second process show?', AMOUNT),
    strength: score('How heavy-handed is the mark-making?', [
      'Sparse and delicate',
      'Light',
      'Moderate',
      'Dense',
      'Saturated and heavy',
    ]),
    render: score('How much of the plain 3D render remains visible under the print?', [
      'None: fully redrawn',
      'A faint ghost',
      'Half and half',
      'Mostly the render',
    ]),
    finish: choice('What happens to the finished print?', FINISHES),
    inkBleed: score('If ink is used, how much does it bloom and bleed?', AMOUNT),
    inkNerve: score('If ink is used, how nervous and spattered is the hand?', AMOUNT),
  },

  async apply(capture, answers, context, signal) {
    const layers: AtelierLayer[] = [
      { id: answers.base, enabled: true, weight: Math.round(blend(100, 45, answers.render)), blend: 'normal' },
    ];
    if (answers.overlay !== NONE && answers.overlay !== answers.base)
      layers.push({
        id: answers.overlay,
        enabled: true,
        weight: Math.round(blend(20, 80, answers.overlayWeight)),
        blend: answers.overlayBlend,
      });
    const mix: AtelierMix = {
      mode: 'layers',
      layers,
      ...(answers.finish === 'none' ? {} : { finish: { id: answers.finish, weight: 60 } }),
    };
    const pixels = await applyMix(capture, mix, {
      seed: (context.seed % 999_998) + 1,
      intensity: Math.round(blend(20, 90, answers.strength)) / 100,
      ink: {
        spatter: answers.inkNerve,
        bloom: answers.inkBleed,
        scrape: blend(0.3, 0.9, answers.inkNerve),
        nervous: answers.inkNerve,
        bristles: 0.6,
        accent: 0.9,
        warp: answers.inkBleed * 0.4,
      },
      signal,
    });
    const named = (id: string) => styles.find((style) => style.id === id)?.name ?? id;
    return {
      pixels,
      notes: [
        named(layers[0].id),
        ...(layers[1] ? [`${named(layers[1].id)} over it (${layers[1].blend}, ${layers[1].weight}%)`] : []),
        ...(mix.finish ? [`finished through ${mix.finish.id.replace(/-/g, ' ')}`] : []),
      ],
    };
  },
});
