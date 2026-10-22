import { choice, defineLook, mix, score, seeded } from '@conjure/kit';
import { bauhaus } from './bauhaus';
import { Press, compose, pause, sameRGB } from './common';
import { constructivism } from './constructivism';
import { haring } from './haring';
import { kusama } from './kusama';
import { type Ctx, PAPER_STOCK, rolesFor } from './palette';
import { type Layout, analyse } from './scene';

const TRADITION_NAMES = {
  bauhaus: 'Bauhaus poster',
  constructivism: 'Constructivist poster',
  haring: 'Haring-line poster',
  kusama: 'Kusama dot poster',
} as const;

const PALETTE_NAMES = {
  canon: "the movement's own inks",
  faded: 'faded earth inks',
  hot: 'hot pop inks',
  spot: 'one colour and black',
  cool: 'cool modern inks',
  pastel: 'soft pastel inks',
} as const;

export default defineLook({
  questions: {
    tradition: choice('Which twentieth-century movement made this poster?', {
      bauhaus:
        'Bauhaus, 1923: pure geometry in red, yellow, blue and black on off-white. Things become circles, blocks and triangles, thin parts become jointed rods with disc joints like a Schlemmer costume, a heavy ground line and bars hold the page. Rational, modern, an art school, a workshop, a new world.',
      constructivism:
        'Russian Constructivism, 1924: a red wedge driven into a black circle, the subject cut out of a photograph and printed as a coarse 45-degree halftone with a white paper edge, a slanted red ground, block-letter slogans. Agitation, factories, revolution, propaganda, the machine age.',
      haring:
        'Keith Haring, 1982: thick equal-weight black outlines around flat bright shapes, a yellow wall and a green ground, radiating motion marks around anything with energy. Street art, subway chalk, dance clubs, activism, pop joy and urgent messages.',
      kusama:
        'Yayoi Kusama: hand-drawn dots in a hexagonal net cover the wall, the floor and every thing, each in its own two colours, red with white, yellow with black, dots sized to each thing. Obsession, infinity, pumpkins, mirrored rooms, the self dissolving into pattern.',
    }),
    palette: choice('Which inks are on the press?', {
      canon: "The movement's own inks at full strength: Bauhaus primaries, Constructivist red and black, Haring's yellow, green and pure brights, Kusama's red, white, yellow and black.",
      faded: 'Faded earth inks: brick, ochre, slate blue and soot, like a poster kept in a drawer for a hundred years. Historical, solemn, archival.',
      hot: 'Hot pop inks: vermilion, fluorescent pink, lemon and turquoise, loud, young and electric.',
      spot: 'Only one colour and black: a cheap, stark two-ink run. The colour follows the mood, red when warm, blue when cold.',
      cool: 'Cool modern inks: cobalt, teal and grey with one orange accent, calm, architectural, Scandinavian.',
      pastel: 'Soft pastels: salmon, butter yellow, powder blue and mint, gentle, sweet and nursery-like.',
    }),
    abstraction: score('How far is the subject abstracted?', [
      'Legible: objects keep their silhouettes, faces, details and shadows',
      'Flattened into a few planes of colour',
      'Reduced to bold simple shapes',
      'Pure geometry: the subject survives only as a composition of shapes',
    ]),
    mark: score('How big are the marks: the dots, the halftone screen, the shapes and the lettering?', [
      'Fine: small marks, many of them',
      'Modest',
      'Bold',
      'Huge: a few enormous marks',
    ]),
    weight: score('How heavy are the lines and bars?', ['Hairline', 'Light', 'Firm', 'Heavy', 'Massive']),
    lettering: choice('If lettering-like bars appear, how are they set?', {
      none: 'No lettering at all: the picture carries the poster alone.',
      headline: 'A shouted headline of heavy letters across the top or along a diagonal.',
      column: 'A tall column of letters running up one side, like the spine of a book.',
      notice: 'Small rows of text-like bars and a rule along the foot, like an exhibition notice or a concert bill.',
    }),
    paper: choice('What stock is it printed on?', {
      offwhite: 'Off-white poster stock, warm and matte.',
      newsprint: 'Cheap yellowing newsprint with a rough tooth, a street handbill.',
      white: 'Bright clean gallery stock where the inks sit crisp.',
      kraft: 'Brown kraft wrapping paper, workshop-made and rough.',
      black: 'Black matte stock: chalk or light ink glows on it, like a subway panel or a mirrored dark room.',
    }),
    occasion: choice('What is the poster for?', {
      exhibition: 'Announcing an exhibition: a calm, balanced sheet with a paper margin around the picture.',
      rally: 'A call to action: the whole sheet tipped onto a fighting diagonal, shapes aimed at the subject, printed to the edge.',
      party: 'A dance, a concert or a club night: shapes repeat and radiate, rings and rays, the subject bounces.',
      manifesto: 'A manifesto: rules, bars and blocks crowd a strict grid around the picture.',
      memorial: 'A memorial or a protest vigil: wide margins, heavy black, a single colour, the subject alone.',
    }),
  },

  async apply(capture, answers, context, signal) {
    const N = capture.size;
    const unit = N / 720;
    const random = seeded((context.seed ^ 0x2b7e1516) >>> 0);
    const mood = context.mood;
    const tradition = answers.tradition;
    const paper = PAPER_STOCK[answers.paper];
    const inks = rolesFor(answers.palette, tradition, mood, paper.dark);

    // Layout: an inset sheet with a margin, or a picture tipped onto a diagonal.
    const sign = random() < 0.5 ? -1 : 1;
    let scale = 1, theta = 0, slope = 0;
    let box = { x0: 0, y0: 0, x1: N, y1: N };
    let margin = false;
    if (answers.occasion === 'exhibition' || answers.occasion === 'memorial') {
      scale = answers.occasion === 'exhibition' ? 0.84 : 0.76;
      const side = Math.round(N * scale);
      const top = Math.round(N * (answers.occasion === 'exhibition' ? 0.05 : 0.06));
      const left = Math.round((N - side) / 2);
      box = { x0: left, y0: top, x1: left + side, y1: top + side };
      margin = true;
    } else if (answers.occasion === 'rally') {
      theta = sign * (0.09 + 0.1 * mood.energy);
    } else if (answers.occasion === 'party') {
      theta = sign * 0.035 * mood.energy;
    }
    if (tradition === 'constructivism') {
      if (!margin) theta += sign * (0.04 + 0.05 * mood.energy);
      slope = -sign * (0.06 + 0.07 * mood.energy);
    }
    if (!margin) scale = 1 + 0.45 * Math.abs(Math.sin(theta));
    const layout: Layout = { scale, theta, cx: (box.x0 + box.x1) / 2, cy: (box.y0 + box.y1) / 2, box, slope };

    const scene = analyse(capture, layout, signal);
    await pause();
    signal.throwIfAborted();

    const press = new Press(N);
    press.clip = scene.inArea;
    const ctx: Ctx = {
      N,
      unit,
      tradition,
      inks,
      key: paper.dark ? inks.light : inks.key,
      paper: paper.tone,
      dark: paper.dark,
      abstraction: answers.abstraction,
      mark: answers.mark,
      weight: answers.weight,
      lettering: answers.lettering,
      occasion: answers.occasion,
      mood,
      random,
      seed: context.seed,
      signal,
      margin,
    };

    let notes: string[];
    if (tradition === 'bauhaus') notes = bauhaus(scene, press, ctx);
    else if (tradition === 'constructivism') notes = constructivism(scene, press, ctx);
    else if (tradition === 'haring') notes = haring(scene, press, ctx);
    else notes = kusama(scene, press, ctx);
    await pause();
    signal.throwIfAborted();

    // Registration: the key plate is the reference; every other ink lands a little off it.
    const slip = mix(0.4, 3.6, mood.wear) * unit;
    const offsets = press.colours.map((colour) =>
      sameRGB(colour, ctx.key) ? ([0, 0] as const) : ([(random() * 2 - 1) * slip, (random() * 2 - 1) * slip] as const),
    );
    const chalk = new Set<number>();
    if (tradition === 'haring' && paper.dark) chalk.add(press.ink(ctx.key));
    const pixels = compose(press, {
      paper: paper.tone,
      dark: paper.dark,
      tooth: paper.tooth,
      wear: mood.wear,
      seed: (context.seed * 2654435761) >>> 0,
      offsets,
      chalk,
      folds: true,
      signal,
    });

    return {
      pixels,
      notes: [
        `${TRADITION_NAMES[tradition]} in ${PALETTE_NAMES[answers.palette]} on ${paper.name}`,
        ...notes,
        margin ? 'set inside a paper margin' : theta ? 'tipped onto a diagonal' : 'printed to the edge',
      ],
    };
  },
});
