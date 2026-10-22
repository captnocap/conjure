import '@ateliers/hover/src/faces/sketches';
import { ARCHETYPES, archetype } from '@ateliers/hover/src/car/archetypes';
import { Car } from '@ateliers/hover/src/car/build';
import { normaliseSpec } from '@ateliers/hover/src/car/spec';
import { FaceEngine, stillWorld } from '@ateliers/hover/src/faces/engine';
import { choice, choiceFrom, defineThing, disposeTree, mix, noul } from '@conjure/kit';

const SAME = 'as-built';
const keep = { [SAME]: 'Keep what the car came with.' } as const;

const world = stillWorld();
const faces = new FaceEngine(world);

export default defineThing({
  questions: {
    car: choiceFrom('Which club car is it?', ARCHETYPES, (entry) => entry.id, (entry) => `${entry.name}: ${entry.blurb}`),
    paint: choice('What is the paint job?', {
      ...keep,
      solid: 'One deep solid colour.',
      'two-tone': 'Two-tone, split along the beltline.',
      flames: 'Hot-rod flames licking back from the nose.',
      scallops: 'Long pointed scallops.',
      lace: 'Lace-patterned panels.',
      patterns: 'Panels of intricate geometric patterns.',
      fade: 'A fade from one candy colour to another.',
      mural: 'A painted mural down the flanks.',
      racing: 'Racing stripes and a number.',
      woodie: 'Wood panelling on the sides.',
      checker: 'Checkerboard.',
      primer: 'Bare grey primer, unfinished.',
    }),
    mural: choice('If it carries a mural, of what?', {
      none: 'No mural.',
      sunset: 'A sunset.',
      desert: 'A desert highway.',
      ocean: 'Ocean waves.',
      city: 'A city skyline at night.',
      cosmos: 'Stars and nebulae.',
      palms: 'Palm trees.',
    }),
    fins: choice('What tail fins does it have?', {
      ...keep,
      none: 'No fins.',
      shark: 'Sharp shark fins.',
      batwing: 'Wide gull batwings.',
      twin: 'Twin upright fins.',
      rocket: 'Rocket fins.',
      dorsal: 'One central dorsal fin.',
    }),
    canopy: choice('What covers the cabin?', {
      ...keep,
      bubble: 'A clear bubble canopy.',
      split: 'A split windscreen.',
      hardtop: 'A hardtop roof.',
      roadster: 'Open roadster, no roof.',
      chop: 'A chopped, slammed roofline.',
    }),
    cargo: choice('What is on the roof?', {
      none: 'Nothing.',
      surfboard: 'A surfboard.',
      luggage: 'Strapped-down luggage.',
      sign: 'A lit roof sign.',
    }),
    driver: noul('Is someone at the wheel?'),
    lightsOn: noul('Are its lights on?'),
  },

  async build(answers, { mood, seed }) {
    await Promise.all([faces.ready, document.fonts.ready]);
    const spec = normaliseSpec(archetype(answers.car));
    if (answers.paint !== SAME) spec.paint.style = answers.paint;
    if (spec.paint.style === 'mural') spec.paint.mural = answers.mural === 'none' ? 'sunset' : answers.mural;
    if (answers.fins !== SAME) spec.fins.kind = answers.fins;
    if (answers.canopy !== SAME) spec.canopy.kind = answers.canopy;
    spec.trim.roofRack = answers.cargo;
    spec.paint.patina = mood.wear;
    spec.paint.seed = seed;
    (spec.interior as { driver?: boolean }).driver = answers.driver;
    const car = new Car(normaliseSpec(spec), faces, undefined, 'hero');
    car.tel.lights = answers.lightsOn;
    car.tel.engineOn = mood.energy > 0.25;
    car.tel.lift = 1;
    car.tel.rpm = mix(0.1, 0.9, mood.energy);
    car.root.traverse((node) => {
      // Heat shimmer needs the atelier's own distortion pass; without it the meshes are opaque slabs.
      if (node.layers.isEnabled(2)) node.visible = false;
      node.castShadow = true;
    });
    return {
      object: car.root,
      update(dt, time) {
        car.tel.time = time;
        car.update(dt, time);
        world.time = time;
        faces.update(dt, world);
      },
      dispose() {
        const root = car.root;
        car.dispose();
        disposeTree(root);
      },
    };
  },
});
