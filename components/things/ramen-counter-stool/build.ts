import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PADS = {
  oxblood: 'Deep diner red vinyl, the classic counter stool.',
  teal: 'Faded teal vinyl, a little seaside, a little hospital.',
  mustard: 'Mustard yellow vinyl gone brown at the seams.',
  black: 'Plain black vinyl, anonymous and hard-wearing.',
  pink: 'Bubblegum pink vinyl, out of place and cheerful.',
  cream: 'Cream vinyl, stained by years of sleeves and soup.',
} as const;
const PAD_TINT: Record<keyof typeof PADS, string> = {
  oxblood: '#a3262c', teal: '#2f8f8c', mustard: '#c99a2b', black: '#2b2c30', pink: '#e8739f', cream: '#e6dcc2',
};

export default defineThing({
  questions: {
    pad: choice('What colour is the vinyl seat pad?', PADS),
    seat: choice('What shape is the seat?', {
      disc: 'A plain round padded disc with a chrome band.',
      backed: 'A round pad with a low curved chrome backrest.',
      saddle: 'A wide squashed mushroom cushion, overstuffed and sagging over its rim.',
      bare: 'The pad is gone: a bare plywood disc screwed to the plate.',
    }),
    column: choice('What is the pedestal like?', {
      chrome: 'A straight polished chrome post flaring to a trumpet base.',
      bellows: 'A post wrapped in a black rubber bellows, like an office chair.',
      painted: 'A thick steel pipe painted over many times in chipped enamel.',
      tripod: 'Three splayed chrome legs under the seat instead of a single post.',
    }),
    height: score('How tall is the stool?', ['Low, knee height', 'Ordinary counter height', 'High bar perch']),
    left: choice('What has been left behind on the stool?', {
      nothing: 'Nothing: the seat is empty.',
      coat: 'A raincoat slumped over the seat, sleeves hanging down.',
      'courier-bag': 'A courier satchel with a reflective stripe, strap dangling.',
      umbrella: 'A folded umbrella hooked on the seat edge, dripping.',
      helmet: 'A scooter helmet with a dark visor, sitting on the pad.',
      bowl: 'An empty noodle bowl with chopsticks across it, set on the seat.',
      newspaper: 'A folded newspaper, read once and abandoned.',
    }),
    moment: choice('What is the stool doing right now?', {
      still: 'Standing still, waiting for the next customer.',
      spinning: 'Still slowly turning: someone just got up and left.',
      crooked: 'Leaning on loose bolts, tilted and neglected.',
    }),
    patched: noul('Has the cracked pad been patched with tape?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const chrome = s.material('#d3d9de', { metalness: 0.7, roughness: 0.22 });
    const dark = s.material('#26282c', { roughness: 0.7 });
    const rubber = s.material('#18191b', { roughness: 0.9 });
    const vinyl = s.material(PAD_TINT[a.pad], { roughness: 0.38 });
    const foam = s.material('#e3c877', { roughness: 0.95 });
    const enamel = s.material(mood.warmth > 0.5 ? '#b5482c' : '#356b7d', { roughness: 0.55 });

    const H = mix(0.48, 0.86, a.height); // top of the seat plate
    const tilt = new THREE.Group();
    s.root.add(tilt);
    const add = <T extends THREE.Object3D>(group: THREE.Object3D, mesh: T) => { group.add(mesh); return mesh; };

    // Floor flange and bolts stay put even when the stool leans.
    if (a.column !== 'tripod') s.cylinder(0.17, 0.185, 0.018, [0, 0.009, 0], a.column === 'painted' ? enamel : chrome, 28);
    const loose = a.moment === 'crooked';
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2 + 0.6;
      const gone = loose && i === 1;
      if (!gone && a.column !== 'tripod') s.cylinder(0.014, 0.014, loose && i === 2 ? 0.05 : 0.024, [Math.cos(angle) * 0.145, 0.02, Math.sin(angle) * 0.145], dark, 6);
    }

    const post = a.column === 'painted' ? enamel : chrome;
    if (a.column === 'tripod') {
      for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3 + Math.PI / 6;
        add(tilt, s.rod([Math.cos(angle) * 0.2, 0.01, Math.sin(angle) * 0.2], [Math.cos(angle) * 0.07, H - 0.02, Math.sin(angle) * 0.07], 0.016, chrome));
        add(tilt, s.cylinder(0.024, 0.028, 0.02, [Math.cos(angle) * 0.2, 0.01, Math.sin(angle) * 0.2], rubber, 10));
      }
    } else {
      add(tilt, s.lathe([[0.15, 0.018], [0.11, 0.03], [0.06, 0.075], [0.04, 0.14], [0.034, 0.2], [0.034, H - 0.06], [0.06, H - 0.03], [0.1, H - 0.01]], post));
      if (a.column === 'bellows') for (let y = 0.24; y < H - 0.08; y += 0.034) add(tilt, s.cylinder(0.05, 0.062, 0.03, [0, y, 0], rubber, 18));
      if (a.column === 'painted') add(tilt, s.cylinder(0.05, 0.05, H * 0.5, [0, H * 0.45, 0], enamel, 16));
    }
    // Foot ring with spokes.
    const ringY = mix(0.2, 0.3, a.height);
    const ringR = a.column === 'tripod' ? 0.165 : 0.19;
    const ring = add(tilt, s.ring(ringR, 0.011, [0, ringY, 0], chrome));
    ring.rotation.x = Math.PI / 2;
    if (a.column !== 'tripod') for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3 + 0.3;
      add(tilt, s.rod([0, ringY + 0.05, 0], [Math.cos(angle) * ringR, ringY, Math.sin(angle) * ringR], 0.008, chrome));
    }
    // Scuffed dark band where shoes rest.
    const scuff = add(tilt, s.ring(ringR, 0.0125, [0, ringY, 0], dark, Math.PI * (0.25 + mood.wear * 0.6)));
    scuff.rotation.x = Math.PI / 2; scuff.rotation.z = -Math.PI * 0.7;

    // The turning seat.
    const seat = new THREE.Group();
    seat.position.y = H;
    tilt.add(seat);
    const R = a.seat === 'saddle' ? 0.21 : 0.18;
    add(seat, s.cylinder(R * 0.96, R * 0.8, 0.022, [0, 0.008, 0], dark, 28));
    let top = 0.03;
    if (a.seat === 'bare') {
      add(seat, s.cylinder(R, R, 0.022, [0, 0.03, 0], s.material('#b98f5c', { roughness: 0.85 }), 28));
      for (let i = 0; i < 4; i++) add(seat, s.cylinder(0.008, 0.008, 0.004, [Math.cos(i * 1.57 + 0.4) * 0.09, 0.043, Math.sin(i * 1.57 + 0.4) * 0.09], dark, 8));
      add(seat, s.box([0.09, 0.012, 0.06], [0.05, 0.047, -0.03], foam)).rotation.y = 0.5;
      top = 0.041;
    } else {
      const band = add(seat, s.cylinder(R + 0.004, R + 0.004, 0.03, [0, 0.033, 0], chrome, 32));
      band.receiveShadow = true;
      const puff = a.seat === 'saddle' ? 0.11 : 0.065;
      add(seat, s.lathe([[R * 0.99, 0.045], [R * (a.seat === 'saddle' ? 1.08 : 1.0), 0.045 + puff * 0.4], [R * 0.86, 0.045 + puff * 0.78], [R * 0.55, 0.045 + puff * 0.97], [0, 0.045 + puff]], vinyl));
      add(seat, s.cylinder(0.022, 0.022, 0.006, [0, 0.046 + puff, 0], vinyl, 14)); // centre button
      top = 0.045 + puff;
      // The crack: a jagged split with foam showing, always present, worse with wear.
      const cracks = 1 + Math.round(mood.wear * 2);
      for (let c = 0; c < cracks; c++) {
        const angle = random() * Math.PI * 2;
        let px = Math.cos(angle) * 0.03, pz = Math.sin(angle) * 0.03, heading = angle + (random() - 0.5);
        for (let k = 0; k < 4; k++) {
          const length = 0.03 + random() * 0.025;
          const nx = px + Math.cos(heading) * length, nz = pz + Math.sin(heading) * length;
          const r = Math.hypot((px + nx) / 2, (pz + nz) / 2);
          if (r > R * 0.8) break;
          const y = top - 0.002 - (r / R) ** 2 * puff * 0.35;
          const split = add(seat, s.box([length * 1.15, 0.009, 0.02 + mood.wear * 0.016], [(px + nx) / 2, y + 0.002, (pz + nz) / 2], k % 2 ? foam : rubber));
          split.rotation.y = -heading;
          px = nx; pz = nz; heading += (random() - 0.5) * 1.3;
        }
      }
      if (a.patched) {
        const tape = s.material('#9aa3a6', { roughness: 0.5, metalness: 0.3 });
        for (let k = 0; k < 2; k++) add(seat, s.box([0.14, 0.012, 0.04], [0.02, top - 0.003, 0.02], tape)).rotation.y = 0.5 + k * 1.3;
      }
    }
    if (a.seat === 'backed') {
      const back = add(seat, s.ring(R + 0.01, 0.011, [0, 0.2, 0], chrome, Math.PI * 0.7));
      back.rotation.x = Math.PI / 2; back.rotation.z = Math.PI * 0.15;
      for (const t of [0.2, 0.5, 0.8]) {
        const angle = -Math.PI * 0.15 - t * Math.PI * 0.7;
        add(seat, s.rod([Math.cos(angle) * (R - 0.01), 0.02, -Math.sin(angle) * (R - 0.01) * -1], [Math.cos(angle) * (R + 0.01), 0.2, Math.sin(angle) * (R + 0.01)], 0.007, chrome));
      }
      const rest = add(seat, s.cylinder(R + 0.016, R + 0.016, 0.07, [0, 0.2, 0], vinyl, 24));
      rest.geometry.dispose();
      rest.geometry = new THREE.CylinderGeometry(R + 0.018, R + 0.018, 0.075, 24, 1, true, Math.PI * 0.78, Math.PI * 0.44);
      (rest.material as THREE.Material).side = THREE.DoubleSide;
    }

    // What was left behind.
    const cool = mood.warmth < 0.5;
    if (a.left === 'coat') {
      const cloth = s.material(mood.cheer > 0.6 ? '#e2b93b' : cool ? '#4d5a66' : '#7a6a4f', { roughness: 0.8, side: THREE.DoubleSide });
      add(seat, s.ball([R * 1.05, 0.035, R * 0.95], [0, top + 0.012, 0], cloth, 18));
      for (const side of [-1, 1]) {
        const drop = 0.26 + random() * 0.12;
        const panel = add(seat, s.mesh(new THREE.CylinderGeometry(R + 0.02, R + 0.05 + random() * 0.03, drop, 14, 1, true, side > 0 ? -0.9 : Math.PI - 0.9, 1.8), cloth, [0, top - drop / 2 + 0.02, 0]));
        panel.rotation.z = (random() - 0.5) * 0.08;
        const sleeve = add(seat, s.rod([side * 0.02 + R * 0.75, top, side * R * 0.7], [R * 0.95 + random() * 0.05, top - 0.34 - random() * 0.12, side * (R * 0.8 + 0.03)], 0.034, cloth, 0.027));
        sleeve.castShadow = true;
      }
      add(seat, s.rod([-R * 0.5, top + 0.035, -0.02], [-R * 0.5, top + 0.035, 0.08], 0.03, cloth)); // rolled collar
    } else if (a.left === 'courier-bag') {
      const canvasCloth = s.material(mood.cheer > 0.5 ? '#e0612a' : '#2f3a2e', { roughness: 0.85 });
      const bag = new THREE.Group();
      bag.position.set(0, top + 0.085, 0); bag.rotation.y = 0.4 + random() * 0.6; bag.rotation.z = 0.06;
      seat.add(bag);
      add(bag, s.box([0.3, 0.17, 0.11], [0, 0, 0], canvasCloth));
      add(bag, s.box([0.31, 0.11, 0.012], [0, 0.035, 0.06], s.material('#1d1f22', { roughness: 0.7 })));
      add(bag, s.box([0.31, 0.022, 0.014], [0, 0.02, 0.066], s.material('#e9f0d0', { emissive: '#cfe58a', emissiveIntensity: 0.5 })));
      add(bag, s.box([0.03, 0.04, 0.016], [0, -0.02, 0.066], chrome));
      const strap = s.tube([[-0.15, 0.06, 0], [-0.24, -0.1, 0.03], [-0.2, -0.4, 0.06], [-0.05, -0.5 - random() * 0.1, 0.1], [0.12, -0.38, 0.09], [0.22, -0.1, 0.04], [0.15, 0.06, 0]], 0.011, rubber);
      add(bag, strap);
    } else if (a.left === 'umbrella') {
      const fabric = s.material(mood.cheer > 0.55 ? '#d9413a' : '#20242b', { roughness: 0.6 });
      const umbrella = new THREE.Group();
      umbrella.position.set(R + 0.03, top + 0.02, 0.02); umbrella.rotation.z = 0.12;
      seat.add(umbrella);
      const hook = add(umbrella, s.ring(0.03, 0.008, [-0.03, 0, 0], s.material('#7a4a25'), Math.PI));
      hook.rotation.z = 0;
      add(umbrella, s.rod([0, 0, 0], [0, -0.12, 0], 0.008, s.material('#7a4a25')));
      add(umbrella, s.cylinder(0.034, 0.012, 0.52, [0, -0.38, 0], fabric, 8));
      add(umbrella, s.rod([0, -0.64, 0], [0, -0.7, 0], 0.005, chrome));
      s.cylinder(0.07, 0.08, 0.003, [0.26, 0.002, 0.1], new THREE.MeshStandardMaterial({ color: '#6f8794', roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }), 16);
    } else if (a.left === 'helmet') {
      const shell = s.material(['#e9e6dc', '#d7352c', '#f0b62a', '#2d4f9c'][Math.floor(random() * 4)], { roughness: 0.3 });
      const helmet = new THREE.Group();
      helmet.position.set(0.02, top + 0.088, 0); helmet.rotation.y = random() * 1.4 - 0.7;
      seat.add(helmet);
      add(helmet, s.ball([0.105, 0.1, 0.12], [0, 0, 0], shell, 22));
      add(helmet, s.ball([0.088, 0.05, 0.06], [0, 0.012, 0.072], s.material('#15181c', { roughness: 0.12, metalness: 0.5 }), 18));
      add(helmet, s.box([0.03, 0.006, 0.17], [0, 0.1, -0.01], s.material('#1c1d20')));
      add(helmet, s.cylinder(0.09, 0.094, 0.03, [0, -0.075, 0], rubber, 20));
    } else if (a.left === 'bowl') {
      const china = s.material('#eee8da', { roughness: 0.35 });
      add(seat, s.lathe([[0.035, 0], [0.04, 0.008], [0.085, 0.05], [0.1, 0.075], [0.094, 0.075], [0.078, 0.048], [0.03, 0.012], [0, 0.012]], china, [0, top, 0]));
      add(seat, s.ring(0.097, 0.004, [0, top + 0.075, 0], s.material('#b3262d'))).rotation.x = Math.PI / 2;
      add(seat, s.cylinder(0.06, 0.04, 0.008, [0, top + 0.022, 0], s.material('#b98a48', { roughness: 0.3 }), 16));
      for (const k of [-1, 1]) add(seat, s.rod([-0.13, top + 0.08, k * 0.012 + 0.02], [0.13, top + 0.08, k * 0.012 - 0.03], 0.004, s.material('#3a2618')));
    } else if (a.left === 'newspaper') {
      const paper = s.label('≡≡ ▚▚▞ ≡≡≡', 0.22, 0.15, [0, 0, 0], '#33322f', '#d9d4c4');
      const fold = new THREE.Group();
      fold.position.set(0.01, top + 0.012, 0); fold.rotation.y = random() * 1.2;
      seat.add(fold);
      add(fold, s.box([0.23, 0.016, 0.16], [0, 0, 0], s.material('#d5d0c0', { roughness: 0.95 })));
      paper.rotation.x = -Math.PI / 2; paper.position.set(0, 0.009, 0);
      fold.add(paper);
    }

    if (loose) { tilt.rotation.z = (random() < 0.5 ? -1 : 1) * mix(0.07, 0.14, random()); tilt.rotation.x = (random() - 0.5) * 0.1; }
    seat.rotation.y = random() * Math.PI * 2;
    const spin = a.moment === 'spinning' ? mix(0.5, 2.2, mood.energy) : 0;
    return s.finish({
      footprint: 0.24,
      update: spin ? (dt, time) => { seat.rotation.y += dt * spin * (0.55 + 0.45 * Math.cos(time * 0.4)); } : undefined,
    });
  },
});
