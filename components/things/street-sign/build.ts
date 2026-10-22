import '@ateliers/signs/src/signs/defs';
import '@ateliers/signs/src/faces/sketches';
import { ARCHETYPES } from '@ateliers/signs/src/assembly/archetypes';
import { buildAssembly } from '@ateliers/signs/src/assembly/build';
import { EXTRA_LIST, POST_LIST, makeSign, normaliseSpec, type AssemblySpec } from '@ateliers/signs/src/assembly/spec';
import { FaceEngine } from '@ateliers/signs/src/faces/engine';
import { listSigns } from '@ateliers/signs/src/signs/catalog';
import { waitForFonts } from '@ateliers/signs/src/signs/font';
import { choice, choiceFrom, defineThing, disposeTree, mix, score } from '@conjure/kit';

const LONE = 'lone-sign';
const NONE = 'none';
const faces = new FaceEngine();
const frame = { daylight: 0.8, night: false, rain: false, radarMph: 0, time: 0 };

export default defineThing({
  questions: {
    assembly: choice('What kind of sign post is it?', {
      [LONE]: 'One single sign on a plain post. The next questions choose the sign and the post.',
      ...Object.fromEntries(ARCHETYPES.map((entry) => [entry.id, `${entry.name} (${entry.family}, ${entry.era}): ${entry.blurb}`])),
    }),
    sign: choiceFrom(
      'If it is one single sign, which sign?',
      listSigns(),
      (sign) => sign.id,
      (sign) => `${sign.name} (${sign.family})`,
    ),
    post: choiceFrom('If it is one single sign, what holds it up?', POST_LIST, (post) => post.value, (post) => `${post.label}: ${post.hint}`),
    extra: choice('What has been left on the post?', {
      [NONE]: 'Nothing.',
      ...Object.fromEntries(EXTRA_LIST.map((extra) => [extra.value, `${extra.label}: ${extra.hint}`])),
    }),
    vandalism: score('How much graffiti and how many stickers cover it?', ['None', 'A sticker or two', 'Tagged', 'Covered']),
    lean: score('How straight does the post stand?', ['Plumb', 'A slight lean', 'Knocked crooked', 'Nearly down']),
  },

  async build(answers, { mood, seed }) {
    await Promise.all([faces.ready, waitForFonts(4000)]);
    const base: AssemblySpec =
      answers.assembly === LONE
        ? ({
            name: 'A sign',
            seed,
            site: 'void',
            post: { kind: answers.post, finish: mood.wear > 0.7 ? 'rust' : 'galvanized', height: 2.9, base: 'driven', lean: 0, leanDir: 0, strip: 'none', count: 1 },
            signs: [makeSign(answers.sign, { uid: 'only', wearSeed: seed % 1_000_000 })],
          } as unknown as AssemblySpec)
        : ARCHETYPES.find((entry) => entry.id === answers.assembly)!.make();
    const spec = normaliseSpec(base);
    spec.seed = seed;
    spec.post.lean = answers.lean * 22;
    spec.post.leanDir = (seed % 360) - 180;
    if (answers.extra !== NONE && !spec.extras.includes(answers.extra as never)) spec.extras.push(answers.extra as never);
    spec.wear = {
      ...spec.wear,
      age: mood.wear,
      fade: mood.wear * 0.8,
      dirt: mix(0.05, 0.8, mood.wear),
      rust: mood.wear ** 1.5,
      scratches: mood.wear * 0.7,
      peel: mood.wear ** 2 * 0.6,
      bullets: mood.wear > 0.75 ? 0.5 : 0,
      hardwareRust: mood.wear,
      graffiti: answers.vandalism,
      stickers: answers.vandalism,
    };
    const built = buildAssembly(spec, faces);
    built.root.traverse((node) => (node.castShadow = node.receiveShadow = true));
    return {
      object: built.root,
      update(dt, time) {
        frame.time = time;
        faces.update(dt, frame);
      },
      dispose() {
        built.ctx.dispose();
        disposeTree(built.root);
      },
    };
  },
});
