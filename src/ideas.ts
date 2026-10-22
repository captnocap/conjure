import { hashText, seeded, type Scale } from '@conjure/kit';

/** Authored starting points and scale-specific details, also usable as a prompt corpus. */
export interface IdeaDomain {
  scale: Scale;
  title: string;
  premises: readonly string[];
  details: readonly string[];
}

export const IDEA_DOMAINS: readonly IdeaDomain[] = [
  {
    scale: 'cosmic', title: 'Galaxies & deep time',
    premises: [
      'Two spiral galaxies meet like strangers at the end of time',
      'A violet nebula is the last warm place in an empty universe',
      'A black hole keeps a bright ring of everything it cannot forget',
      'A constellation is an unfinished letter addressed to nobody',
      'An ancient elliptical galaxy slowly loses its last blue star',
      'A comet travels between lonely star cities',
      'A stellar nursery opens inside a rose-coloured cloud',
      'An orbital ring watches a galaxy rise beyond its rim',
      'A scattered Dyson array collects light from a dying sun',
      'A star cluster resembles a crowded midnight railway platform',
      'A barred galaxy turns through a halo of abandoned satellites',
      'A luminous bridge joins two distant islands of stars',
      'An alien monolith floats beside an impossible cosmic doorway',
      'The first stars switch on in a universe still under construction',
      'A broken constellation drifts toward a sleeping black hole',
      'A frozen comet carries a miniature galaxy in its tail',
      'Two nebulae touch like coloured ink spreading through water',
      'A procession of tiny planets passes through a vast star field',
      'A galaxy is seen edge-on as a single luminous seam',
      'A portal opens onto a universe with a different colour of light',
    ],
    details: [
      'Give the star field a clear bright nucleus and generous empty space',
      'Arrange the luminous matter into a slow spiral with a few loose fragments',
      'Use a ribbon of dust to divide the composition into near and far',
      'Let two contrasting star populations define the visible structure',
      'Place a small companion object off to one side as a measure of scale',
      'Keep the core compact while the outer material forms an asymmetrical halo',
      'Make the silhouette legible even where individual stars become tiny',
      'Let one luminous arc lead the eye from the foreground into deep space',
    ],
  },
  {
    scale: 'planetary', title: 'Orbits & alien shores',
    premises: [
      'A ringed planet hangs above a lonely orbital observatory',
      'A lunar rover waits beside a lander that will never launch again',
      'A space station grows a garden beneath a copper moon',
      'A satellite surveys an ocean planet without a single coastline',
      'A rocket waits on a silent moon before the first human sunrise',
      'Two moons share a precarious orbit around a cracked planet',
      'An asteroid settlement circles the remains of a broken world',
      'A small lunar outpost watches a comet cross the horizon',
      'A gas giant shows alternating storms the colour of old marble',
      'A frozen planet is surrounded by a necklace of research satellites',
      'An orbital ring has one section still being built',
      'An alien monolith stands on a moon beneath a crowded sky',
      'A salvage station gathers spacecraft around a hollow asteroid',
      'A moon with a single crater reflects a distant blue planet',
      'An abandoned radio telescope points toward a world it once called home',
      'A portal ring joins two incompatible planetary horizons',
      'A miniature solar system is arranged like a cabinet of precious stones',
      'The last satellite of a ruined civilisation keeps passing overhead',
      'A solar collection array unfolds beside a brilliantly lit planet',
      'A tiny space station casts a long shadow across a monumental moon',
    ],
    details: [
      'Use a clear crescent or terminator to describe the central sphere',
      'Keep the orbital paths distinct and the smaller bodies separated',
      'Use a warm planet and cool manufactured structures',
      'Let the surface markings suggest a specific geological history',
      'Place the technological objects at different heights around the central body',
      'Give one small machine a readable silhouette against the horizon',
      'Balance a smooth celestial body with a finely articulated mechanical structure',
      'Use the ring plane to set the main diagonal of the composition',
    ],
  },
  {
    scale: 'landscape', title: 'Wild places & monuments',
    premises: [
      'A lighthouse watches an empty tidal coast after the storm',
      'A ruined temple is slowly becoming part of a forest',
      'A glacier advances toward an abandoned radio observatory',
      'A waterfall pours from a floating island into nothing',
      'A suspension bridge spans a valley filled with cloud',
      'A desert pyramid stands beside the last patch of green',
      'A pagoda hides between mossy trees above a still pond',
      'A volcanic island shelters a quiet coast at first light',
      'An enormous stone doorway opens in a field of dunes',
      'A mountain observatory watches the sky through broken instruments',
      'A city of castle towers survives on a windswept mesa',
      'A wind farm follows the edge of a pale mountain range',
      'An airship rests above a cliffside ruined town',
      'An arctic shelf holds blue ice arches and a solitary beacon',
      'A flooded temple remembers the height of the old river',
      'Clouds collect around islands that have forgotten the ground',
      'A water tower marks a settlement swallowed by the desert',
      'A coastal forest shelters the remnants of a shipping port',
      'A giant book has become a bridge across a green valley',
      'A submarine surfaces beside a distant lighthouse',
    ],
    details: [
      'Use three layers of terrain with one strong landmark',
      'Leave a clear path through the setting toward the main subject',
      'Contrast weathered architecture with living vegetation',
      'Let an opening in the terrain frame the hero object',
      'Give the horizon a distinctive broken silhouette',
      'Use a small secondary landmark to suggest distance',
      'Make the ground tell a story through terraces, channels or scattered remnants',
      'Keep the foreground sparse enough to read the distant structure',
    ],
  },
  {
    scale: 'street', title: 'Roadsides & cities',
    premises: [
      'The last gas station before a thousand miles of desert',
      'A motel courtyard waits for a guest who is years late',
      'A bus shelter holds the last bus home after a funeral',
      'A night market is closing beneath a tired row of lamps',
      'A bicycle leans beside a telephone booth after the rain',
      'A park bench faces a clock tower that has stopped',
      'A roadside coffee stand opens before the rest of the city',
      'A lonely newsstand sells yesterday to tomorrow',
      'An empty petrol forecourt becomes a tiny lunar colony',
      'A rooftop garden grows around an old neon sign',
      'A shipping container becomes a home at the edge of the harbour',
      'A small observatory occupies an ordinary city rooftop',
      'A picnic table waits under an enormous tree at dusk',
      'A vending machine lights an otherwise empty street corner',
      'A shopping cart carries the remains of a travelling circus',
      'A payphone rings beside a bus stop in a deserted town',
      'A postbox is the only thing untouched by a passing storm',
      'A quiet market lane is interrupted by an impossible stone portal',
      'A road crew has left one cone beneath a giant water tower',
      'An arcade cabinet waits outside a closed all-night diner',
    ],
    details: [
      'Include one readable sign that anchors the place',
      'Leave a small gap between the street furniture and the central subject',
      'Use a kerb, paving pattern or painted line to define the ground',
      'Let worn metal and hand-painted lettering carry the history of the place',
      'Make the street lamps and storefront shapes form a rhythm',
      'Put a small personal object near the main subject as a trace of someone leaving',
      'Keep the camera low enough that the objects feel encountered on foot',
      'Let one ordinary machine become the emotional centre of the scene',
    ],
  },
  {
    scale: 'room', title: 'Interiors & everyday rituals',
    premises: [
      'The snack aisle of a gas station at three in the morning',
      'An all-night diner has one booth still set for two',
      'A laundromat waits for the last wash cycle to finish',
      'An apartment kitchen holds the first coffee after moving in',
      'An archive hall keeps records of places that no longer exist',
      'A greenhouse is slowly becoming a jungle indoors',
      'A workshop bench is ready for a repair nobody knows how to begin',
      'A corner shop has a drinks fridge full of strange bottles',
      'An arcade glows in the room behind a roadside market',
      'A lonely server rack hums beside a chair and a potted tree',
      'A cash register waits on an empty checkout counter',
      'A suitcase stands in a kitchen that has just been cleaned for the last time',
      'A flooded archive preserves a single book on a high shelf',
      'A clockwork robot serves coffee in an abandoned diner',
      'A miniature temple occupies the corner of an ordinary tiled room',
      'A neon-lit laundry room is the only warm place on a winter night',
      'A refrigerator door becomes a portal to an impossible garden',
      'A record player and a worn chair share a room at closing time',
      'A tiny observatory has been built inside a greenhouse',
      'A market shelf sells jars of stars beside tins of beans',
    ],
    details: [
      'Build the space around one everyday ritual',
      'Keep the central aisle or working area open',
      'Use repeated tiles or shelves to make the interior immediately recognisable',
      'Place the hero object where someone would naturally reach for it',
      'Let a few small objects explain what just happened in the room',
      'Contrast clean surfaces with one strongly weathered object',
      'Show enough of the enclosing architecture to feel inside a place',
      'Keep the furniture arranged in a way that suggests an absent occupant',
    ],
  },
  {
    scale: 'tabletop', title: 'Small treasures & still lifes',
    premises: [
      'A tiny bonsai grows beside a record player and a forgotten cup',
      'A seashell and a crystal geode are arranged like a private museum',
      'A beetle explores the edge of a gigantic open book',
      'A portable radio telescope studies a tiny moon on a workbench',
      'A miniature lighthouse has been built inside a tide pool',
      'A coffee machine is the altar of a very small civilisation',
      'A coral colony grows through an abandoned mechanical part',
      'A tiny bicycle leans against a flower pot',
      'A crystal doorway stands among collected shells and stones',
      'A suitcase contains everything needed to make a small garden',
      'A table holds the last possessions of a vanished street musician',
      'A mossy log becomes a home for tiny glowing insects',
      'A mushroom cluster shelters an impossible staircase',
      'A tabletop archive contains one book larger than its shelves',
      'A potted cactus waits beside a bright miniature petrol pump',
      'A small robot examines a delicate butterfly',
      'A model rocket and an old cash register share a dusty workshop shelf',
      'A lotus pond fits inside a shallow dish',
      'A tiny airship hangs above an arrangement of crystals',
      'An ordinary seashell becomes the centre of a mysterious ritual',
    ],
    details: [
      'Make the textures inviting at close range',
      'Arrange the objects like a collection with one unusual pairing',
      'Keep the supports lower than the main subject',
      'Use a small number of materials with clear differences in finish',
      'Let one delicate detail reward looking closely',
      'Use a shallow base that reads as a desk, tray or specimen stand',
      'Place the smaller objects along an arc around the hero',
      'Leave enough space between the objects to see their individual silhouettes',
    ],
  },
  {
    scale: 'macro', title: 'Insects & invisible kingdoms',
    premises: [
      'A dragonfly rests in a garden of dew drops',
      'A beetle meets a crystal doorway on a moss-covered stone',
      'A butterfly moves through a forest of fern fronds',
      'A jellyfish resembles a tiny weather system inside a specimen slide',
      'A firefly colony gathers around a luminous mushroom',
      'A seashell is a monumental spiral in a world of small insects',
      'A single fern frond shelters a rain-soaked beetle',
      'A coral branch becomes a strange microscopic city',
      'A garden of translucent crystals grows around a seed',
      'A dew drop holds the reflection of a miniature lotus pond',
      'A dragonfly patrols a jungle made from one leaf',
      'A cloud of fireflies marks the entrance to a mossy hollow',
      'A butterfly lands beside an ancient shell in a private specimen collection',
      'A mushroom grove looks enormous from the height of a beetle',
      'A tiny kelp forest waves around a floating jellyfish',
      'An ice crystal becomes an arch over a microscopic path',
      'A rain cloud hangs over a single moss-covered log',
      'A fern and a geode make a luminous mineral garden',
      'A cactus spine forest surrounds a curious beetle',
      'A dragonfly and a butterfly share the last dry leaf after the rain',
    ],
    details: [
      'Let a small curved surface become a monumental piece of terrain',
      'Use delicate repeated structures such as veins, feelers or branching stems',
      'Keep the subject distinct from the surrounding tiny growth',
      'Make the close-up silhouette readable before adding fine detail',
      'Use a translucent-looking accent against opaque organic forms',
      'Create an intimate habitat with a clear foreground and one protected hollow',
      'Emphasise the contrast between polished mineral and soft living surfaces',
      'Give one tiny creature the scale and presence of a traveller in a landscape',
    ],
  },
];

export const ATMOSPHERES = [
  'The mood is patient and quietly hopeful',
  'The mood is lonely but tender',
  'The mood is festive, curious and slightly ridiculous',
  'The mood is uneasy, as if something has just changed',
  'The mood is nostalgic and warmly familiar',
  'The mood is ceremonial, solemn and still',
  'The mood is wild, energetic and full of possibility',
  'The mood is calm and matter-of-fact, with no need for drama',
] as const;

export const DIRECTIONS = [
  'Treat the scene as a discovered place with a history',
  'Treat the scene as the opening frame of a quiet film',
  'Treat the scene as an illustrated field guide entry',
  'Treat the scene as a memory reconstructed from a few objects',
  'Treat the scene as a small handmade theatre set',
  'Treat the scene as an unusual postcard sent from far away',
  'Treat the scene as a carefully arranged museum display',
  'Treat the scene as a moment just before someone arrives',
] as const;

export interface SceneIdea { id: string; scale: Scale; title: string; prompt: string }

export const SCENE_IDEAS: readonly SceneIdea[] = IDEA_DOMAINS.flatMap((domain) =>
  domain.premises.map((title, index) => ({ id: `${domain.scale}-${index + 1}`, scale: domain.scale, title, prompt: `${title}.` })),
);

/** Each combination uses detail appropriate to its scale: 71,680 authored combinations. */
export const IDEA_COMBINATIONS = IDEA_DOMAINS.reduce(
  (sum, domain) => sum + domain.premises.length * domain.details.length * ATMOSPHERES.length * DIRECTIONS.length, 0,
);

export function inventIdea(seed: string, scale?: Scale): SceneIdea {
  const random = seeded(hashText(seed));
  const pick = <T>(values: readonly T[]) => values[Math.floor(random() * values.length)];
  const domain = scale ? IDEA_DOMAINS.find((candidate) => candidate.scale === scale)! : pick(IDEA_DOMAINS);
  const title = pick(domain.premises);
  return {
    id: `invented-${hashText(seed)}`, scale: domain.scale, title,
    prompt: `${title}. ${pick(domain.details)}. ${pick(ATMOSPHERES)}. ${pick(DIRECTIONS)}.`,
  };
}

/** Lazily export every combination without making the studio load a huge prompt array. */
export function* allIdeas(): Generator<SceneIdea> {
  for (const domain of IDEA_DOMAINS)
    for (const [p, title] of domain.premises.entries())
      for (const [d, detail] of domain.details.entries())
        for (const [a, atmosphere] of ATMOSPHERES.entries())
          for (const [f, direction] of DIRECTIONS.entries())
            yield {
              id: `${domain.scale}-${p + 1}-${d + 1}-${a + 1}-${f + 1}`, scale: domain.scale, title,
              prompt: `${title}. ${detail}. ${atmosphere}. ${direction}.`,
            };
}
