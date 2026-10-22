import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { pickSkin, rig, worldOf } from './rig';

export default defineThing({
  questions: {
    load: choice('What is he carrying?', {
      kegs: 'Two steel kegs on a shoulder harness, iced mate tea and lemonade, cups clipped to the strap.',
      popsicles: 'A white styrofoam box of popsicles on a strap, hoisted onto one shoulder.',
      cheese: 'A tin tray of grilled cheese skewers over a little charcoal box, carried in front.',
      hats: 'A tall rack of straw hats and caps held up on a pole like a tree.',
    }),
    action: choice('What is he doing right now?', {
      walking: 'Walking the sand, calling out, eyes ahead for the next customer.',
      pouring: 'Stopped, bent to the tap, pouring a cup for a customer.',
      resting: 'Stopped with the load set down in the sand, wiping his face with the towel.',
    }),
    kegs: choice('If he has kegs, what state are they in?', {
      shiny: 'Polished steel that flashes in the sun.',
      dented: 'Dull, dented, scratched from years on the sand.',
      painted: 'Painted in two colours, one yellow for lemonade and one green for mate.',
    }),
    shirt: choice('What colour is his vest?', {
      white: 'A plain white vest.',
      yellow: 'Canary yellow.',
      red: 'Bright red.',
      blue: 'Sky blue.',
      black: 'Black.',
    }),
    hat: choice('What is on his head?', {
      cap: 'A cap, peak forward.',
      bucket: 'A wide bucket hat.',
      towel: 'A towel draped over his head against the sun.',
      bare: 'Nothing, close-cropped hair.',
    }),
    shift: score('How far into the shift is he?', ['Just set off: full, heavy and upright', 'Mid-afternoon, half sold', 'Nearly done: light kegs, soaked towel, shoulders down']),
    customer: noul('Is a customer standing waiting with coins held out?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const skin = pickSkin(random);
    const H = mix(1.66, 1.82, random());
    const top = { white: '#f3efe6', yellow: '#f2c21c', red: '#d8262c', blue: '#6fb4e0', black: '#242426' }[a.shirt];
    const shorts = ['#2c3a55', '#3b3b3f', '#6e5a3a', '#1f4f3a'][Math.floor(random() * 4)];
    const walking = a.action === 'walking';
    const person = figure(s, {
      height: H, build: a.shift > 0.6 ? 'slight' : 'average', style: 'doll', skin,
      hair: a.hat === 'cap' ? 'cap' : a.hat === 'bucket' ? 'hat' : a.hat === 'towel' ? 'hood' : 'short',
      hairColor: a.hat === 'cap' ? ['#1f2a44', '#d8262c', '#f3efe6'][Math.floor(random() * 3)] : a.hat === 'bucket' ? '#e9e1c8' : '#2a1d16',
      top, bottom: shorts, shoes: random() < 0.5 ? skin : '#2a2a2c', sleeves: 'short',
      pose: walking ? 'walking' : 'standing', gaze: a.action === 'pouring' ? 'down' : 'ahead', mirror: random() < 0.5,
    });
    s.root.add(person.root);
    const joints = rig(person);
    const tired = a.shift;
    const headR = H * 0.064;

    // Arms hold the straps at the chest while walking; one drops to the tap when pouring.
    const kegs = a.load === 'kegs';
    if (a.action === 'walking') {
      if (kegs) { joints.arm('left', { forward: 55, out: 6, bend: 95, across: 20 }); joints.arm('right', { forward: 55, out: 6, bend: 95, across: 20 }); }
      joints.lean(4 + tired * 8);
      joints.look(tired * 10, 0);
    } else if (a.action === 'pouring') {
      joints.arm('right', { forward: 10, out: 22, bend: 40, across: 10 });
      joints.arm('left', { forward: 40, out: 4, bend: 100, across: 20 });
      joints.bow(10);
      joints.lean(6);
    } else {
      joints.arm('right', { forward: 95, out: 14, bend: 130, across: 40 });
      joints.arm('left', { forward: -5, out: 24, bend: 50, across: 70 });
      joints.lean(2);
      joints.look(-5, 0);
    }
    joints.settle();

    const steelColour = a.kegs === 'dented' ? '#8f9496' : '#cfd4d6';
    const steel = s.material(steelColour, { metalness: a.kegs === 'dented' ? 0.45 : 0.9, roughness: a.kegs === 'dented' ? 0.55 : 0.18 });
    const dark = s.material('#2a2c30', { roughness: 0.6 });
    const strap = s.material('#5a4a3a', { roughness: 0.9 });
    const towel = s.material(['#f0e6c8', '#8fc3d8', '#f3b7a4', '#d9d2bf'][Math.floor(random() * 4)], { roughness: 1 });
    const cup = new THREE.MeshStandardMaterial({ color: '#f6f8f9', transparent: true, opacity: 0.75, roughness: 0.3 });
    const mateColour = '#c98a2b', lemonColour = '#f2e27a';

    const shoulderL = worldOf(person.hands.left.parent!.parent!.parent!);
    const shoulderR = worldOf(person.hands.right.parent!.parent!.parent!);
    const hip = worldOf(person.pelvis);
    const drop = a.action === 'resting';
    const loadY = drop ? 0 : hip.y - H * 0.05 + tired * 0.03;

    const kegAt = (x: number, tint: string | null) => {
      const r = H * 0.085, h = H * 0.27;
      const body = kegs && a.kegs === 'painted' && tint ? s.material(tint, { roughness: 0.4 }) : steel;
      const at: [number, number, number] = [x, drop ? h / 2 : loadY - h * 0.1, hip.z + H * 0.02];
      const keg = s.cylinder(r, r, h, at, body, 22);
      keg.rotation.z = drop ? 0 : (x > 0 ? -1 : 1) * 0.04;
      for (const dy of [-h * 0.44, h * 0.44, 0.02]) s.cylinder(r + 0.012, r + 0.012, h * 0.06, [at[0], at[1] + dy, at[2]], dark, 22);
      // Tap at the bottom front, handle on top.
      s.rod([at[0], at[1] - h * 0.3, at[2] + r], [at[0], at[1] - h * 0.3, at[2] + r + H * 0.05], H * 0.009, dark);
      s.rod([at[0], at[1] - h * 0.3, at[2] + r + H * 0.05], [at[0], at[1] - h * 0.38, at[2] + r + H * 0.05], H * 0.006, dark);
      s.box([H * 0.03, H * 0.01, H * 0.015], [at[0], at[1] - h * 0.27, at[2] + r + H * 0.04], s.material(tint ?? '#c9232b'));
      s.cylinder(H * 0.012, H * 0.012, h * 0.1, [at[0], at[1] + h * 0.55, at[2]], dark, 10);
      if (a.kegs === 'dented') for (let i = 0; i < 4; i++) s.ball([r * 0.3, r * 0.2, r * 0.08], [at[0] + Math.sin(i * 1.9) * r * 0.9, at[1] + (random() - 0.5) * h * 0.6, at[2] + Math.cos(i * 1.9) * r * 0.9], s.material('#5f6467', { roughness: 0.8 }), 8);
      return at;
    };

    if (kegs) {
      const left = kegAt(hip.x + H * 0.2, '#2e8b57'), right = kegAt(hip.x - H * 0.2, '#f2c21c');
      if (!drop) {
        // Straps over each shoulder down to the keg rims, a crossbar between them.
        for (const [sh, keg] of [[shoulderL, left], [shoulderR, right]] as const) {
          s.tube([[sh.x, sh.y + H * 0.03, sh.z + H * 0.01], [keg[0] * 0.9 + sh.x * 0.1, (sh.y + keg[1]) / 2, sh.z + H * 0.09], [keg[0], keg[1] + H * 0.12, keg[2] + H * 0.04]], H * 0.011, strap);
          s.tube([[sh.x, sh.y + H * 0.03, sh.z - H * 0.01], [keg[0] * 0.9 + sh.x * 0.1, (sh.y + keg[1]) / 2, sh.z - H * 0.08], [keg[0], keg[1] + H * 0.12, keg[2] - H * 0.04]], H * 0.011, strap);
        }
        s.rod([left[0] - H * 0.07, left[1] + H * 0.12, left[2]], [right[0] + H * 0.07, right[1] + H * 0.12, right[2]], H * 0.01, dark);
      } else {
        for (const keg of [left, right]) s.ring(H * 0.05, H * 0.009, [keg[0], keg[1] + H * 0.14, keg[2]], strap).rotation.x = Math.PI / 2 + 0.3;
      }
      // The stack of cups, clipped to the front of the harness.
      const cups = Math.round(mix(12, 4, tired));
      const cx = drop ? left[0] + H * 0.12 : hip.x + H * 0.02, cz = drop ? left[2] + H * 0.08 : hip.z + H * 0.1;
      const cy = drop ? 0 : loadY + H * 0.02;
      for (let i = 0; i < cups; i++) s.cylinder(H * 0.022, H * 0.016, H * 0.05, [cx, cy + i * H * 0.012 + H * 0.025, cz], cup, 12).castShadow = false;
      if (a.action === 'pouring') {
        // A cup under the tap and a thin stream into it.
        const pourHand = worldOf(person.hands.right);
        const full = s.cylinder(H * 0.022, H * 0.016, H * 0.05, [pourHand.x, pourHand.y - H * 0.01, pourHand.z + H * 0.02], cup, 12);
        full.castShadow = false;
        s.cylinder(H * 0.019, H * 0.014, H * 0.035, [pourHand.x, pourHand.y - H * 0.015, pourHand.z + H * 0.02], s.material(mateColour, { roughness: 0.3 }), 12);
        s.rod([right[0], right[1] - H * 0.27 * 0.38, right[2] + H * 0.085 + H * 0.05], [pourHand.x, pourHand.y + H * 0.01, pourHand.z + H * 0.02], H * 0.004, s.material(mateColour, { roughness: 0.2, emissive: mateColour, emissiveIntensity: 0.15 }));
      }
    } else if (a.load === 'popsicles') {
      const foam = s.material('#f4f4f0', { roughness: 0.95 });
      const lidColour = s.material('#2f74c0', { roughness: 0.6 });
      const w = H * 0.3, h = H * 0.2, d = H * 0.2;
      const at: [number, number, number] = drop ? [hip.x + H * 0.28, h / 2, hip.z + H * 0.12] : [hip.x - H * 0.16, shoulderR.y + h / 2 + H * 0.02, hip.z - H * 0.02];
      if (!drop) joints.arm('right', { forward: 125, out: 20, bend: 70, across: 30 });
      joints.settle();
      s.box([w, h, d], at, foam);
      s.box([w + 0.01, h * 0.15, d + 0.01], [at[0], at[1] + h * 0.45, at[2]], lidColour);
      s.label('PICOLÉ', w * 0.9, h * 0.5, [at[0], at[1] - h * 0.1, at[2] + d / 2 + 0.002], '#1f3d7a', '#f4f4f0');
      if (!drop) s.tube([[at[0] + w / 2, at[1] + h * 0.3, at[2]], [hip.x, shoulderL.y + H * 0.04, hip.z + H * 0.06], [at[0] - w / 2, at[1] + h * 0.3, at[2]]], H * 0.01, strap);
    } else if (a.load === 'cheese') {
      const tin = s.material('#9ea5a8', { metalness: 0.6, roughness: 0.4 });
      const w = H * 0.34, d = H * 0.2;
      const hands = [worldOf(person.hands.left), worldOf(person.hands.right)];
      const at: [number, number, number] = drop ? [hip.x + H * 0.3, H * 0.06, hip.z + H * 0.1] : [(hands[0].x + hands[1].x) / 2, (hands[0].y + hands[1].y) / 2 - H * 0.02, (hands[0].z + hands[1].z) / 2 + H * 0.04];
      if (!drop) { joints.arm('left', { forward: 40, out: 4, bend: 95, across: 10 }); joints.arm('right', { forward: 40, out: 4, bend: 95, across: 10 }); joints.settle(); }
      s.box([w, H * 0.06, d], [at[0], at[1], at[2]], tin);
      s.box([w * 0.6, H * 0.05, d * 0.6], [at[0], at[1] + H * 0.05, at[2]], s.material('#3a2f2a', { roughness: 1 }));
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#f0ded0', { roughness: 0.7 }), Array.from({ length: 12 }, (_u, i) => ({ at: [at[0] - w * 0.25 + (i % 4) * w * 0.17, at[1] + H * 0.085, at[2] - d * 0.2 + Math.floor(i / 4) * d * 0.2] as const, size: H * 0.014 })));
      s.scatter(new THREE.CylinderGeometry(1, 1, 1, 6), s.material('#c9b48a'), Array.from({ length: 6 }, (_u, i) => ({ at: [at[0] - w * 0.3 + i * w * 0.12, at[1] + H * 0.09, at[2] + d * 0.42] as const, size: H * 0.004 })));
      for (let i = 0; i < 6; i++) s.rod([at[0] - w * 0.3 + i * w * 0.12, at[1] + H * 0.06, at[2] + d * 0.42], [at[0] - w * 0.3 + i * w * 0.12, at[1] + H * 0.2, at[2] + d * 0.42], H * 0.003, s.material('#c9b48a'));
      if (!drop) s.tube([[at[0] + w / 2, at[1] + H * 0.03, at[2]], [hip.x, shoulderL.y + H * 0.05, hip.z - H * 0.04], [at[0] - w / 2, at[1] + H * 0.03, at[2]]], H * 0.01, strap);
    } else {
      // A hat rack: a pole with cross pegs, straw hats and caps hung all the way up.
      const hand = worldOf(person.hands.right);
      if (!drop) { joints.arm('right', { forward: 30, out: 10, bend: 60 }); joints.settle(); }
      const px = drop ? hip.x + H * 0.32 : hand.x, pz = drop ? hip.z + H * 0.1 : hand.z + H * 0.02;
      const poleTop = H * 1.3;
      s.rod([px, 0, pz], [px, poleTop, pz], H * 0.012, s.material('#8a6a44'));
      s.cylinder(H * 0.12, H * 0.14, H * 0.02, [px, 0.01, pz], s.material('#8a6a44'), 12);
      const straw = s.material('#d9bf7a', { roughness: 0.95 });
      const capPaint = [s.material('#d8262c'), s.material('#1f2a44'), s.material('#f3efe6'), s.material('#2e8b57')];
      for (let i = 0; i < 7; i++) {
        const y = H * 0.35 + i * H * 0.13;
        if (i % 2 === 0) {
          s.cylinder(H * 0.13, H * 0.13, H * 0.008, [px, y, pz], straw, 20);
          s.cylinder(H * 0.06, H * 0.07, H * 0.05, [px, y + H * 0.03, pz], straw, 16);
        } else {
          const angle = i * 1.3;
          const cx = px + Math.sin(angle) * H * 0.07, cz = pz + Math.cos(angle) * H * 0.07;
          s.ball([H * 0.055, H * 0.045, H * 0.055], [cx, y, cz], capPaint[i % 4], 12);
          const peak = s.box([H * 0.07, H * 0.008, H * 0.05], [cx + Math.sin(angle) * H * 0.06, y - H * 0.01, cz + Math.cos(angle) * H * 0.06], capPaint[i % 4]);
          peak.rotation.y = angle;
        }
      }
    }

    // Towel round the neck (or over the head), heavier with sweat as the shift wears on.
    const neckAt = worldOf(person.head).add(new THREE.Vector3(0, -headR * 1.2, 0));
    if (a.hat !== 'towel') {
      s.box([H * 0.17, H * 0.03, H * 0.1], [neckAt.x, neckAt.y - H * 0.01, neckAt.z - H * 0.02], towel);
      for (const sx of [-1, 1]) s.box([H * 0.055, H * 0.17 + tired * H * 0.05, H * 0.012], [neckAt.x + sx * H * 0.06, neckAt.y - H * 0.1, neckAt.z + H * 0.07], towel).rotation.y = sx * 0.12;
    } else {
      // Recolour the hood as a towel, leaving the skull and the eye dots alone.
      for (const child of person.head.children) {
        const mesh = child as THREE.Mesh;
        const radius = (mesh.geometry as THREE.SphereGeometry | undefined)?.parameters?.radius ?? 0;
        if (mesh.isMesh && mesh !== person.head.children[0] && radius > headR * 0.5) (mesh.material as THREE.MeshStandardMaterial).color.set(towel.color);
      }
      const fall = new THREE.Mesh(new THREE.BoxGeometry(headR * 2.2, headR * 2.4, headR * 0.3), towel);
      fall.position.set(0, -headR * 0.9, -headR * 0.95);
      fall.castShadow = true;
      person.head.add(fall);
    }

    // A customer waiting with coins held out.
    let customer: ReturnType<typeof figure> | null = null;
    if (a.customer) {
      const H2 = mix(1.5, 1.8, random());
      customer = figure(s, {
        height: H2, style: 'doll', skin: pickSkin(random), hair: (['short', 'long', 'bun', 'cap'] as const)[Math.floor(random() * 4)],
        top: ['#f0a8b8', '#2b6fb8', '#f3efe6', '#f2c21c'][Math.floor(random() * 4)], bottom: ['#1d1d1f', '#d8262c', '#f3efe6'][Math.floor(random() * 3)],
        shoes: skin, sleeves: 'short', pose: 'pointing', gaze: 'ahead',
      });
      customer.root.position.set(H * 0.72, 0, H * 0.25);
      customer.root.rotation.y = -Math.PI / 2 - 0.3;
      s.root.add(customer.root);
      const palm = customer.hands.left;
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(H2 * 0.012, H2 * 0.012, H2 * 0.003, 10), s.material('#d9b24a', { metalness: 0.7, roughness: 0.3 }));
      coin.position.set(0, -H2 * 0.01, H2 * 0.015);
      palm.add(coin);
      const coin2 = coin.clone();
      coin2.position.set(H2 * 0.012, -H2 * 0.012, H2 * 0.005);
      palm.add(coin2);
    }

    const energy = mood.energy;
    return s.finish({
      update: (dt, time) => {
        person.update(dt, time);
        customer?.update(dt, time);
        if (walking) joints.body.rotation.z = Math.sin(time * mix(1, 3, energy)) * 0.015 * energy;
      },
    });
  },
});
