import '@ateliers/tree/src/faces/sketches';
import { prepareFoliage } from './render-foliage';
import { FaceEngine, stillWorld } from '@ateliers/tree/src/faces/engine';
import { setWorld } from '@ateliers/tree/src/materials/library';
import { buildTree } from '@ateliers/tree/src/tree/build';
import { normaliseSpec } from '@ateliers/tree/src/tree/spec';
import { SPECIES_LIST } from '@ateliers/tree/src/tree/species';
import { choice, choiceFrom, defineThing, mix, noul, score } from '@conjure/kit';

// Where in the year, 0 = midwinter. The tree's leaves, blossom and fruit follow from it.
const SEASONS = {
  winter: 'Midwinter: bare branches, or dark evergreen.',
  'early-spring': 'Early spring: buds breaking, the first blossom.',
  'late-spring': 'Late spring: fresh pale leaves, blossom falling.',
  summer: 'High summer: a full heavy green crown.',
  'early-autumn': 'Early autumn: fruit, the first leaves turning.',
  'late-autumn': 'Late autumn: blazing colour, leaves coming down.',
} as const;
const SEASON_AT: Record<keyof typeof SEASONS, number> = {
  winter: 0.02,
  'early-spring': 0.3,
  'late-spring': 0.4,
  summer: 0.52,
  'early-autumn': 0.72,
  'late-autumn': 0.81,
};

const world = stillWorld();
const faces = new FaceEngine(world);

const within = (window: [number, number] | null, season: number) => {
  if (!window) return 0;
  const length = (((window[1] - window[0]) % 1) + 1) % 1;
  const into = (((season - window[0]) % 1) + 1) % 1;
  return into > length ? 0 : Math.min(1, into / (length * 0.35)) * Math.min(1, (length - into) / (length * 0.2));
};

export default defineThing({
  questions: {
    species: choiceFrom(
      'Which tree is it?',
      SPECIES_LIST,
      (species) => species.id,
      (species) => `${species.common} (${species.latin}), ${species.habit} habit, ${species.evergreen ? 'evergreen' : 'deciduous'}, to ${species.maxHeight} m, from ${species.origin}.`,
    ),
    age: score('How old is the tree?', ['A sapling', 'Young', 'In its prime', 'Old', 'Ancient and failing']),
    season: choice('What time of year is it for the tree?', SEASONS),
    gnarl: score('How does it grow?', ['Straight and orderly', 'Gently irregular', 'Crooked', 'Twisted and gnarled']),
    swing: noul('Does a rope swing hang from a bough?'),
    lights: noul('Are fairy lights strung through the branches?'),
    carving: noul('Are initials carved into the bark?'),
    hollow: noul('Is the trunk hollow?'),
    lightning: noul('Has lightning scarred it?'),
    birdhouse: noul('Is a birdhouse fixed to the trunk?'),
    ribbon: noul('Is a ribbon tied around the trunk?'),
  },

  async build(answers, { mood, seed, random }) {
    await faces.ready;
    const species = SPECIES_LIST.find((candidate) => candidate.id === answers.species)!;
    const season = SEASON_AT[answers.season];
    world.season = season;
    world.wind = mix(0.05, 0.9, mood.energy);
    setWorld({ season, wind: world.wind, time: 0 });
    const spec = normaliseSpec({
      species: species.id,
      seed,
      age: Math.max(4, Math.round(species.maxAge * mix(0.03, 0.95, answers.age ** 1.6))),
      form: { height: 1, girth: 1, lean: (random() - 0.5) * answers.gnarl * 0.5, gnarl: answers.gnarl, crown: 1, roots: 1, twist: answers.gnarl * 0.6 },
      features: {
        lichen: mood.wear * 0.8,
        moss: mood.wear * 0.7,
        fungi: mood.wear ** 2 * 0.8,
        deadwood: mix(0, 0.6, mood.wear * answers.age),
        swing: answers.swing,
        lights: answers.lights,
        hollow: answers.hollow,
        lightning: answers.lightning,
        birdhouse: answers.birdhouse,
        ribbon: answers.ribbon,
        carving: { on: answers.carving, text: 'A + B', height: 1.4, side: 40, year: 1998 },
      } as never,
    });
    const built = buildTree(spec, faces);
    // The tree brings its own patch of ground; the world supplies the ground here.
    built.ground.visible = built.meadow.visible = false;
    if (built.blossom) {
      const open = within(species.phenology.flower, season);
      (built.blossom.material.userData.uniforms as { uOpen: { value: number } }).uOpen.value = open;
      built.blossom.mesh.visible = open > 0.01;
    }
    if (built.fruit) {
      const ripe = within(species.phenology.fruit, season);
      built.fruit.uniforms.uGrow.value = 0.3 + 0.7 * ripe;
      built.fruit.mesh.visible = ripe > 0.01;
    }
    prepareFoliage(built, species, season);
    built.root.traverse((node) => (node.castShadow = true));
    return {
      object: built.root,
      footprint: Math.max(1, built.skel.baseRadius * 5),
      update(dt, time) {
        setWorld({ time });
        world.time = time;
        faces.update(dt, world);
        for (const animate of built.features.animated) animate(dt, time, 0.8, world.wind);
      },
      dispose() {
        built.dispose();
        built.root.removeFromParent();
      },
    };
  },
});
