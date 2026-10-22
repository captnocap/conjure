import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { makeEye } from './eye';

const IRIS = {
  brown: 'Deep warm brown, the commonest eye in the world.',
  blue: 'Clear pale blue with a dark rim.',
  green: 'Mossy green flecked with gold.',
  hazel: 'Hazel: amber at the pupil shading to olive.',
  grey: 'Cool storm grey.',
  albino: 'Albino pink-violet, almost no pigment at all.',
  cataract: 'Clouded milk-blue, the pupil lost behind a cataract.',
} as const;
const IRIS_COLOUR: Record<keyof typeof IRIS, string> = {
  brown: '#6b3d1c', blue: '#4f8fc4', green: '#5d8a3c', hazel: '#9a7a30', grey: '#7d8a92', albino: '#d99aa8', cataract: '#8fa4ae',
};

export default defineThing({
  questions: {
    iris: choice('What colour is the iris?', IRIS),
    pupil: choice('What is the pupil doing?', {
      pinpoint: 'Shrunk to a pinpoint: bright light, opiates, fury.',
      normal: 'An ordinary round pupil.',
      blown: 'Blown wide open, nearly swallowing the iris: darkness, shock, death, love.',
      slit: 'A vertical slit, cat or serpent.',
      keyhole: 'A keyhole pupil with a notch running to the rim, a born oddity.',
    }),
    condition: choice('What condition is the eye in?', {
      fresh: 'Fresh, wet and white, as if just now looking at you.',
      bloodshot: 'Bloodshot: a red web of burst vessels, no sleep, smoke, rage.',
      jaundiced: 'Jaundiced yellow, a sick liver showing in the white.',
      dried: 'Dried out, dull and slightly sunken, a specimen left on a shelf.',
      rotting: 'Rotting undead: grey-green, mottled, clouded, with flies and seepage.',
    }),
    tail: choice('What trails from the back of it?', {
      clean: 'Nothing: a clean sphere, like a glass eye or a marble.',
      stub: 'A short cut stub of optic nerve.',
      long: 'A long optic nerve trailing behind it across the ground.',
      muscles: 'The optic nerve plus ragged red straps of the muscles that once turned it.',
    }),
    gaze: choice('Where is it looking?', {
      viewer: 'Straight at whoever is looking at it.',
      up: 'Up at the sky or the ceiling.',
      sideways: 'Off to one side, at something we cannot see.',
      rolled: 'Rolled right back, mostly white showing.',
    }),
    rest: choice('What is it resting on?', {
      bare: 'Nothing, just lying where it rolled.',
      dish: 'A small white porcelain dish, clinical.',
      ring: 'A little brass ring stand, displayed like a jewel or a golf ball on a tee.',
      cushion: 'A dark velvet cushion, presented as a treasure.',
      puddle: 'A small pool of its own fluid.',
    }),
    motion: choice('How does it move?', {
      still: 'Perfectly still.',
      track: 'It slowly tracks something moving across the room.',
      dart: 'It darts about in quick nervous jumps.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = 0.012;
    const state = {
      fresh: { sclera: '#f6f2ea', veins: 0.1, rough: 0.08, cloud: 0, blotch: 0, vein: '#b3221f' },
      bloodshot: { sclera: '#f4dcd4', veins: 0.95, rough: 0.1, cloud: 0, blotch: 0, vein: '#b01414' },
      jaundiced: { sclera: '#e9d27a', veins: 0.35, rough: 0.14, cloud: 0, blotch: 0, vein: '#a8481c' },
      dried: { sclera: '#cfc7b2', veins: 0.25, rough: 0.92, cloud: 0.35, blotch: 0.25, vein: '#6e3a2c' },
      rotting: { sclera: '#aab08e', veins: 0.6, rough: 0.55, cloud: 0.6, blotch: 1, vein: '#3c2a3a' },
    }[a.condition];
    const eye = makeEye({
      r,
      iris: IRIS_COLOUR[a.iris],
      pupil: a.pupil,
      sclera: state.sclera,
      veins: Math.min(1, state.veins + mood.wear * 0.25),
      veinColour: state.vein,
      rough: state.rough,
      cloud: Math.max(state.cloud, a.iris === 'cataract' ? 0.8 : 0),
      blotch: state.blotch,
      random,
    });
    const squash = a.condition === 'dried' ? 0.9 : a.condition === 'rotting' ? 0.86 : 1;
    eye.ball.scale.set(1, squash, 1);

    // What it rests on decides how high the centre sits.
    let lift = r * squash;
    if (a.rest === 'dish') {
      s.lathe([[0, 0], [r * 1.5, 0], [r * 2.4, r * 0.5], [r * 2.5, r * 0.56], [r * 2.3, r * 0.56], [r * 1.4, r * 0.16], [0, r * 0.14]], s.material('#f1f0ea', { roughness: 0.2, side: THREE.DoubleSide }));
      lift += r * 0.14;
    } else if (a.rest === 'ring') {
      const brass = s.material('#b58a3a', { metalness: 0.8, roughness: 0.3 });
      const high = r * 1.5;
      s.ring(r * 0.62, r * 0.08, [0, high, 0], brass).rotation.x = Math.PI / 2;
      s.cylinder(r * 0.09, r * 0.09, high - r * 0.2, [0, (high - r * 0.2) / 2 + r * 0.2, -r * 0.62], brass, 10);
      s.lathe([[0, 0], [r * 1.3, 0], [r * 1.3, r * 0.1], [r * 0.4, r * 0.24], [0, r * 0.24]], brass);
      s.rod([0, r * 0.2, 0], [0, r * 0.2, -r * 0.62], r * 0.09, brass);
      lift = high + r * Math.sqrt(1 - 0.62 * 0.62) * squash;
    } else if (a.rest === 'cushion') {
      const velvet = s.material(mood.warmth > 0.5 ? '#6a1830' : '#1f2c5c', { roughness: 0.95 });
      s.ball([r * 2.3, r * 0.6, r * 2.3], [0, r * 0.55, 0], velvet, 28);
      const gold = s.material('#c9a23f', { metalness: 0.6, roughness: 0.4 });
      for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) s.ball([r * 0.22, r * 0.22, r * 0.22], [x * r * 1.72, r * 0.5, z * r * 1.72], gold, 10);
      lift += r * 0.85;
    } else if (a.rest === 'puddle') {
      const fluid = s.material(a.condition === 'rotting' ? '#4d5a2e' : a.condition === 'bloodshot' ? '#a4302a' : '#c9d6d8', { roughness: 0.05, metalness: 0.2 });
      for (let i = 0; i < 5; i++) {
        const turn = random() * Math.PI * 2, far = i === 0 ? 0 : r * (0.7 + random() * 0.9), size = i === 0 ? r * 1.7 : r * (0.5 + random() * 0.6);
        s.cylinder(size, size, r * 0.04, [Math.cos(turn) * far, r * 0.02, Math.sin(turn) * far], fluid, 22);
      }
    }
    eye.group.position.y = lift;
    s.root.add(eye.group);

    // The camera looks down from above, so "at the viewer" means tilted up toward it.
    const aim = {
      viewer: [0.5, (random() - 0.5) * 0.2],
      up: [1.15, (random() - 0.5) * 0.4],
      sideways: [0.3, (random() < 0.5 ? -1 : 1) * (0.75 + random() * 0.2)],
      rolled: [1.75, (random() - 0.5) * 0.5],
    }[a.gaze];
    const gaze = new THREE.Euler(-aim[0], aim[1], 0, 'YXZ');
    eye.ball.rotation.copy(gaze);

    if (a.tail !== 'clean') {
      const nerve = s.material('#e2c8a6', { roughness: 0.5 });
      const back = new THREE.Vector3(0, 0, -1).applyEuler(gaze);
      if (back.y < -0.35) back.setY(-0.35).normalize();
      const from = back.clone().multiplyScalar(r * 0.9).setY(back.y * r * 0.9 + lift);
      const out = back.clone().multiplyScalar(r * (a.tail === 'stub' ? 1.5 : 1.7)).setY(Math.max(r * 0.2, back.y * r * 1.6 + lift));
      const thick = r * 0.17;
      const path: [number, number, number][] = [from.toArray() as [number, number, number], out.toArray() as [number, number, number]];
      if (a.tail !== 'stub') {
        const side = random() < 0.5 ? -1 : 1;
        const flat = new THREE.Vector3(back.x, 0, back.z).normalize();
        const across = new THREE.Vector3(-flat.z, 0, flat.x).multiplyScalar(side);
        const length = a.tail === 'long' ? 5.2 : 3.2;
        for (let i = 1; i <= 4; i++) {
          const along = r * (1.7 + (length * i) / 4);
          const sway = Math.sin(i * 1.5 + random()) * r * 0.75 + (i === 4 ? r * 1.1 : 0);
          path.push([flat.x * along + across.x * sway, thick + (i === 1 ? Math.max(0, lift - r) * 0.5 : 0), flat.z * along + across.z * sway]);
        }
      }
      s.tube(path, thick, nerve);
      const end = path[path.length - 1];
      s.ball([thick * 1.05, thick * 1.05, thick * 1.05], end, s.material('#8e3b33', { roughness: 0.4 }), 10);
      // A fine artery runs along the nerve.
      s.tube(path.map(([x, y, z], index) => [x + Math.sin(index * 2) * thick * 0.5, y + thick * 0.8, z] as [number, number, number]), thick * 0.22, s.material('#a3262a', { roughness: 0.4 }));
      if (a.tail === 'muscles') {
        const meat = s.material('#a8332f', { roughness: 0.45 });
        const frame = new THREE.Quaternion().setFromEuler(gaze);
        for (let i = 0; i < 4; i++) {
          const turn = (i / 4) * Math.PI * 2 + 0.4;
          const strap = [[0.99, 0.1], [0.92, -0.5], [0.62, -1.05], [0.36 + random() * 0.3, -1.6 - random() * 0.5]].map(([wide, deep]) => {
            const point = new THREE.Vector3(Math.cos(turn) * wide * r, Math.sin(turn) * wide * r * squash, deep * r).applyQuaternion(frame);
            return [point.x, Math.max(thick * 0.6, point.y + lift), point.z] as [number, number, number];
          });
          s.tube(strap, r * 0.14, meat).scale.set(1, 1, 1);
        }
      }
    }

    if (a.condition === 'rotting') {
      const flies = Array.from({ length: 4 + Math.floor(random() * 5) }, () => {
        const turn = random() * Math.PI * 2, up = random() * 1.2;
        return { at: [Math.cos(turn) * Math.cos(up) * r * 1.02, lift + Math.sin(up) * r * squash * 1.02, Math.sin(turn) * Math.cos(up) * r * 1.02] as [number, number, number], size: r * (0.07 + random() * 0.04) };
      });
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#15171a', { roughness: 0.4 }), flies);
    }

    const speed = a.motion === 'still' ? 0 : mix(0.25, 1.3, mood.energy);
    const phase = random() * 10;
    return s.finish({
      update: (_dt, time) => {
        if (!speed) return;
        const t = time * speed + phase;
        if (a.motion === 'track') eye.ball.rotation.set(gaze.x + Math.sin(t * 0.6) * 0.08, gaze.y + Math.sin(t * 0.37) * 0.38, 0, 'YXZ');
        else {
          const beat = Math.floor(t * 1.6);
          const jump = (n: number) => Math.sin(n * 127.1 + 3.7) * 43758.5453 % 1;
          eye.ball.rotation.set(gaze.x + jump(beat) * 0.16, gaze.y + jump(beat + 31) * 0.42, 0, 'YXZ');
        }
      },
    });
  },
});
