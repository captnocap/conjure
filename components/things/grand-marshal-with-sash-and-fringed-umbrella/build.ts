import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { at, cloth, paint, pick, pickSkin, reach, rig } from './rig';

const UMBRELLAS = {
  'purple-gold': 'Purple and gold panels, Mardi Gras colours, sequins catching the sun.',
  'black-white': 'Black and white panels, the funeral umbrella.',
  'red-white': 'Red and white panels with a red fringe.',
  rainbow: 'Every panel a different bright colour.',
  lace: 'All white, lace and ribbon, for a wedding or a christening.',
  'green-gold': 'Green, gold and purple with a tall gold finial.',
} as const;
const PANELS: Record<keyof typeof UMBRELLAS, string[]> = {
  'purple-gold': ['#5a2a8a', '#e2b43a'], 'black-white': ['#1a1a1e', '#f1ede4'], 'red-white': ['#c42a2a', '#f3efe6'],
  rainbow: ['#d93a3a', '#f0a030', '#e8d83a', '#3aa85a', '#2a6ad8', '#8a3aa8'], lace: ['#f6f2ea', '#efe8dc'], 'green-gold': ['#1f7a3a', '#e2b43a', '#5a2a8a'],
};
const SASHES = {
  gold: 'Gold satin, shining.',
  purple: 'Royal purple satin with gold edging.',
  white: 'White satin with black lettering.',
  red: 'Scarlet satin.',
  black: 'Black mourning satin with silver edging.',
} as const;
const SASH_COLOUR: Record<keyof typeof SASHES, [string, string]> = { gold: ['#e0b43a', '#3a2a10'], purple: ['#5a2a8a', '#e2b43a'], white: ['#f3efe6', '#1a1a1e'], red: ['#c42a2a', '#f3efe6'], black: ['#1a1a1e', '#c9c9d0'] };

export default defineThing({
  questions: {
    umbrella: choice('What colours is the umbrella?', UMBRELLAS),
    fringe: choice('What hangs round the brim of the umbrella?', {
      beads: 'A fringe of dangling beads.',
      feathers: 'Tufts of ostrich feather round the brim.',
      both: 'Feather tufts above a bead fringe, fully loaded.',
      tassels: 'Short cloth tassels and ribbon streamers.',
    }),
    sash: choice('What colour is the sash?', SASHES),
    lettering: choice('What does the sash say?', {
      marshal: 'GRAND MARSHAL in capitals.',
      club: 'The name of a social aid and pleasure club.',
      memory: 'IN LOVING MEMORY.',
      king: 'KING OF THE PARADE.',
      none: 'No lettering, plain satin.',
    }),
    step: choice('How is he moving?', {
      dirge: 'Walking slow, the dirge step: a measured pace, the umbrella held steady.',
      strut: 'High-stepping, knee up, leaning back, cut loose after the body is released.',
      pause: 'Stopped, feet planted, umbrella up, waiting on the band.',
    }),
    suit: choice('What is he wearing?', {
      black: 'A black suit and white shirt.',
      white: 'An all-white suit with a dark shirt.',
      cream: 'A cream suit with a black shirt.',
      purple: 'A purple suit with a gold shirt.',
    }),
    cigar: noul('Is there a cigar in the corner of his mouth?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.84, 1.96, random());
    const headR = H * 0.064, torsoL = H * 0.28, shoulderW = H * 0.115, hipW = H * 0.075, limb = H * 0.036;
    const suit = { black: ['#1d1c22', '#f3efe6'], white: ['#f1ede4', '#2a2430'], cream: ['#e8dcc0', '#1a1a1e'], purple: ['#4a2a7a', '#e2b43a'] }[a.suit];
    const person = figure(s, {
      height: H, build: pick(random, ['slight', 'average']), style: 'doll', skin: pickSkin(random), hair: 'hat', hairColor: '#17161a',
      top: suit[0], bottom: suit[0], shoes: '#141416', sleeves: 'long', pose: 'standing', gaze: 'up',
    });
    s.root.add(person.root);
    const r = rig(person);

    // The step: a dirge pace, a high strut or planted feet; the body leans back with the lift.
    const strut = a.step === 'strut';
    if (strut) {
      r.leg('right', { forward: 82, out: 6, knee: 100, foot: 15 });
      r.leg('left', { forward: -8, out: 4, knee: 2 });
      r.lean(-11, 2);
      r.bow(-8, 0, -8);
    } else if (a.step === 'dirge') {
      r.leg('right', { forward: 26, out: 4, knee: 28, foot: 'flat' });
      r.leg('left', { forward: -12, out: 4, knee: 4 });
      r.lean(-3);
      r.bow(-3);
    } else {
      r.leg('right', { forward: 0, out: 10, knee: 0 });
      r.leg('left', { forward: 0, out: 10, knee: 0 });
      r.lean(-4);
      r.bow(-4);
    }
    r.look(-28, 6, 0);
    // Left hand out to the side with the handkerchief; the right goes up for the umbrella.
    r.arm('left', { forward: 12, out: 78, bend: 18, across: 0 });
    person.settle();
    const headAt = at(s, person.head);
    reach(person, 'right', new THREE.Vector3(headAt.x - 0.18 * H, headAt.y + 0.28 * H, headAt.z + 0.1 * H), { forward: 120, out: 20, bend: 70, across: 10 });
    person.settle();

    // Bowler: a dome on the kit's hat crown.
    const felt = s.material('#17161a', { roughness: 0.8 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.0, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), felt);
    dome.position.y = headR * 1.55;
    dome.scale.y = 0.75;
    dome.castShadow = true;
    person.head.add(dome);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.07, headR * 1.07, headR * 0.22, 20, 1, true), new THREE.MeshStandardMaterial({ color: SASH_COLOUR[a.sash][0], roughness: 0.6, side: THREE.DoubleSide }));
    band.position.y = headR * 0.92;
    person.head.add(band);

    // Shirt front and tie, then the sash from right shoulder to left hip, front and back.
    const chestZ = limb * 1.35;
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.09 * H / 1.8, torsoL * 0.5, 0.01), s.material(suit[1], { roughness: 0.7 }));
    shirt.position.set(0, torsoL * 0.72, chestZ + 0.002);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.03 * H / 1.8, torsoL * 0.42, 0.012), s.material(pick(random, ['#8a1f2a', '#1a1a1e', '#e2b43a', '#2a3a7a']), { roughness: 0.5 }));
    tie.position.set(0, torsoL * 0.68, chestZ + 0.01);
    person.joints.spine.add(shirt, tie);
    const [sashHex, inkHex] = SASH_COLOUR[a.sash];
    const words = { marshal: 'GRAND MARSHAL', club: pick(random, ['ZULU S.A. & P.C.', 'TREME SIDEWALK STEPPERS', 'MONEY WASTERS', 'BLACK MEN OF LABOR', 'LADY BUCKJUMPERS']), memory: 'IN LOVING MEMORY', king: 'KING OF THE PARADE', none: '' }[a.lettering];
    const sashMap = paint(1024, 160, (c) => {
      c.fillStyle = sashHex;
      c.fillRect(0, 0, 1024, 160);
      c.fillStyle = inkHex;
      c.fillRect(0, 0, 1024, 10);
      c.fillRect(0, 150, 1024, 10);
      const sheen = c.createLinearGradient(0, 0, 0, 160);
      sheen.addColorStop(0, 'rgba(255,255,255,0)'); sheen.addColorStop(0.45, 'rgba(255,255,255,0.35)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = sheen;
      c.fillRect(0, 0, 1024, 160);
      if (words) {
        c.fillStyle = inkHex;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `bold ${Math.min(118, 1900 / words.length)}px sans-serif`;
        c.fillText(words, 512, 82, 990);
      }
    });
    const sashMaterial = new THREE.MeshStandardMaterial({ map: sashMap, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide });
    const from = new THREE.Vector2(-shoulderW * 0.72, torsoL * 0.92), to = new THREE.Vector2(hipW * 0.95, -0.02);
    const run = to.clone().sub(from);
    for (const face of [1, -1]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(run.length() * 1.04, 0.135 * H / 1.8), sashMaterial);
      strip.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, face * (chestZ + 0.014));
      strip.rotation.z = Math.atan2(run.y, run.x) * face;
      if (face < 0) strip.rotation.y = Math.PI;
      strip.castShadow = true;
      person.joints.spine.add(strip);
    }
    // A rosette where the sash meets the hip.
    const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * H / 1.8, 0.045 * H / 1.8, 0.015, 14), s.material(inkHex === '#3a2a10' ? '#5a2a8a' : sashHex, { roughness: 0.5 }));
    rosette.rotation.x = Math.PI / 2;
    rosette.position.set(to.x, to.y + 0.03, chestZ + 0.03);
    person.joints.spine.add(rosette);

    if (a.cigar) {
      const cigar = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.008, 0.11, 8), s.material('#5a3a22', { roughness: 0.8 }));
      cigar.position.set(headR * 0.35, -headR * 0.3, headR * 1.3);
      cigar.rotation.set(Math.PI / 2 - 0.35, 0, -0.3);
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), new THREE.MeshStandardMaterial({ color: '#ff7a30', emissive: '#ff5a10', emissiveIntensity: 1.6 }));
      ember.position.set(headR * 0.35 + 0.018, -headR * 0.3 + 0.045, headR * 1.3 + 0.045);
      person.head.add(cigar, ember);
    }

    // The umbrella: a shaft through the raised hand, a painted dome, fringe and feathers.
    const hand = at(s, person.hands.right);
    const brass = s.material('#c9a44a', { metalness: 0.75, roughness: 0.3 });
    const shaft = new THREE.Group();
    shaft.position.set(hand.x, hand.y, hand.z);
    s.root.add(shaft);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.95, 10), s.material('#2a2320', { roughness: 0.5 }));
    pole.position.y = 0.95 / 2 - 0.18;
    pole.castShadow = true;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), brass);
    knob.position.y = -0.18;
    shaft.add(pole, knob);
    const canopy = new THREE.Group();
    canopy.position.y = 0.72;
    shaft.add(canopy);
    const panels = PANELS[a.umbrella];
    const panelMap = paint(1024, 128, (c) => {
      const n = 8;
      for (let i = 0; i < n; i++) {
        c.fillStyle = panels[i % panels.length];
        c.fillRect((i * 1024) / n, 0, 1024 / n + 1, 128);
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect((i * 1024) / n, 0, 3, 128);
      }
      if (a.umbrella === 'lace') {
        c.strokeStyle = 'rgba(255,255,255,0.9)';
        c.lineWidth = 2;
        for (let i = 0; i < 300; i++) { c.beginPath(); c.arc(random() * 1024, random() * 128, 4 + random() * 8, 0, 6.3); c.stroke(); }
      } else {
        // Sequins: bright specks, brighter in a cheerful scene.
        for (let i = 0; i < Math.round(mix(60, 320, mood.cheer)); i++) {
          c.fillStyle = `rgba(255,${230 + Math.floor(random() * 25)},${150 + Math.floor(random() * 100)},${0.5 + random() * 0.5})`;
          c.beginPath(); c.arc(random() * 1024, random() * 128, 2 + random() * 2.5, 0, 6.3); c.fill();
        }
      }
    });
    const R = 0.44;
    const profile = [[0, 0.21], [R * 0.3, 0.19], [R * 0.6, 0.14], [R * 0.85, 0.07], [R, 0]].map(([x, y]) => new THREE.Vector2(x, y));
    const dome2 = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), new THREE.MeshStandardMaterial({ map: panelMap, roughness: 0.55, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: panelMap, emissiveIntensity: mix(0.02, 0.14, mood.cheer) }));
    dome2.castShadow = true;
    canopy.add(dome2);
    // Ribs under the canopy and a tall finial.
    const ribMaterial = s.material('#8a8a90', { metalness: 0.6, roughness: 0.4 });
    for (let i = 0; i < 8; i++) {
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, R * 1.04, 5), ribMaterial);
      const angle = (i / 8) * Math.PI * 2;
      rib.position.set(Math.cos(angle) * R * 0.5, 0.1, Math.sin(angle) * R * 0.5);
      rib.rotation.set(0, -angle, Math.PI / 2 - 0.42);
      canopy.add(rib);
    }
    const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.012, a.umbrella === 'green-gold' ? 0.22 : 0.12, 8), brass);
    finial.position.y = 0.21 + (a.umbrella === 'green-gold' ? 0.11 : 0.06);
    const finialBall = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), brass);
    finialBall.position.y = finial.position.y + (a.umbrella === 'green-gold' ? 0.12 : 0.07);
    canopy.add(finial, finialBall);
    // The valance, beads, feathers or tassels round the brim.
    const trimHex = a.umbrella === 'lace' ? '#f6f2ea' : panels[1 % panels.length];
    const valance = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.96, 0.06, 32, 1, true), new THREE.MeshStandardMaterial({ color: trimHex, roughness: 0.7, side: THREE.DoubleSide }));
    valance.position.y = -0.03;
    canopy.add(valance);
    const beads = a.fringe === 'beads' || a.fringe === 'both';
    const feathers = a.fringe === 'feathers' || a.fringe === 'both';
    if (beads) {
      const points: { at: [number, number, number]; size: number; color: string }[] = [];
      const hues = a.umbrella === 'lace' ? ['#f6f2ea', '#e8dcc0'] : ['#e2b43a', '#f3efe6', panels[0], '#c9d8f0'];
      for (let i = 0; i < 48; i++) {
        const angle = (i / 48) * Math.PI * 2;
        const strands = 3 + Math.floor(random() * 2);
        for (let k = 0; k < strands; k++) points.push({ at: [Math.cos(angle) * R, -0.07 - k * 0.028, Math.sin(angle) * R], size: 0.011, color: hues[(i + k) % hues.length] });
      }
      canopy.add(s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#ffffff', { roughness: 0.3, metalness: 0.3 }), points));
    }
    if (feathers) {
      // Soft plumes: flattened ellipsoids leaning out from the rim, two to a tuft.
      const plumeHex = a.umbrella === 'lace' ? '#f6f2ea' : a.umbrella === 'black-white' ? '#f1ede4' : pick(random, ['#f6f2ea', '#e2b43a', '#f0c8d8']);
      const plumes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), s.material(plumeHex, { roughness: 1 }), 32);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 32; i++) {
        const angle = (Math.floor(i / 2) / 16) * Math.PI * 2 + (i % 2) * 0.12;
        e.set(0, -angle, -0.9 - random() * 0.4 - (i % 2) * 0.3);
        q.setFromEuler(e);
        m.compose(new THREE.Vector3(Math.cos(angle) * R * 1.02, 0.05 + (i % 2) * 0.03, Math.sin(angle) * R * 1.02), q, new THREE.Vector3(0.1, 0.035, 0.02).multiplyScalar(0.9 + random() * 0.3));
        plumes.setMatrixAt(i, m);
      }
      plumes.instanceMatrix.needsUpdate = true;
      plumes.castShadow = true;
      canopy.add(plumes);
    }
    if (a.fringe === 'tassels') {
      const points: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        points.push({ at: [Math.cos(angle) * R, -0.1, Math.sin(angle) * R], size: 1, color: i % 2 ? '#e2b43a' : panels[0] });
      }
      canopy.add(s.scatter(new THREE.ConeGeometry(0.014, 0.09, 6), s.material('#ffffff', { roughness: 0.9 }), points));
      for (let i = 0; i < 3; i++) {
        const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.5), new THREE.MeshStandardMaterial({ color: i % 2 ? '#e2b43a' : '#f3efe6', side: THREE.DoubleSide, roughness: 0.8 }));
        const angle = i * 2.1 + 0.4;
        ribbon.position.set(Math.cos(angle) * R, -0.3, Math.sin(angle) * R);
        ribbon.rotation.set(0.2, angle, 0.15);
        canopy.add(ribbon);
      }
    }

    // The white handkerchief hanging from the left hand.
    const left = at(s, person.hands.left);
    const hanky = s.mesh(cloth(0.3, 0.08, random), new THREE.MeshStandardMaterial({ color: '#f6f3ec', roughness: 0.9, side: THREE.DoubleSide }), [left.x + 0.04, left.y - 0.13, left.z + 0.02]);
    hanky.rotation.set(0.15, 0.6, 0.1);

    // The umbrella twirls and the body bobs with the music.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const restNeck = person.joints.neck.rotation.z;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        canopy.rotation.y += dt * mix(0.2, 2.6, energy) * (strut ? 1.2 : 0.6);
        shaft.rotation.z = Math.sin(time * mix(1, 3, energy) + phase) * mix(0.01, 0.08, energy);
        person.joints.neck.rotation.z = restNeck + Math.sin(time * mix(1, 3, energy) + phase) * 0.03 * energy;
      },
    });
  },
});
