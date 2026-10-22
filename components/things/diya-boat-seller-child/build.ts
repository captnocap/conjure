import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];
const RAD = Math.PI / 180;

/** Reach the figure's arm joints through its hands, so the arms can be re-posed after it is built. */
function rig(person: Figure) {
  const arm = (side: 'left' | 'right') => {
    const wrist = person.hands[side].parent!, elbow = wrist.parent!, shoulder = elbow.parent!;
    elbow.rotation.order = 'YXZ';
    return { shoulder, elbow, wrist };
  };
  return { left: arm('left'), right: arm('right') };
}

/** Woven cane painted on a canvas. */
function weave(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#b48a4e'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 16) {
    g.fillStyle = (x / 16 + y / 16) % 2 ? `hsl(${32 + random() * 8}, 45%, ${44 + random() * 10}%)` : `hsl(${36 + random() * 8}, 40%, ${58 + random() * 10}%)`;
    g.fillRect(x, y, 16, 16);
    g.fillStyle = 'rgba(60,30,10,0.35)';
    if ((x / 16 + y / 16) % 2) g.fillRect(x, y + 7, 16, 2); else g.fillRect(x + 7, y, 2, 16);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 1.5);
  return map;
}

export default defineThing({
  questions: {
    lit: noul('Are the candles already lit?'),
    left: score('How many boats are left in the basket?', ['One last boat', 'A few, well spaced', 'A full basket', 'Heaped over the rim']),
    wears: choice('What does the child wear?', {
      school: 'A white school shirt and navy shorts, the uniform still on.',
      dress: 'A bright patterned dress, pink and yellow.',
      sweater: 'An oversized grey sweater down to the knees, sleeves rolled.',
      kurta: 'A small orange kurta and white pyjamas.',
    }),
    tin: noul('Does a tin of coins hang from the basket on a string?'),
    doing: choice('What is the child doing?', {
      offering: 'Holding a single boat out toward you with one hand, the basket on the other arm.',
      carrying: 'Carrying the basket in both arms, looking ahead for a buyer.',
      counting: 'Counting coins in one palm, the basket set on the step.',
      calling: 'Calling out, one arm raised, the basket on a hip.',
    }),
    basket: choice('What holds the boats?', {
      cane: 'A round woven cane basket.',
      steel: 'A dented steel tray.',
      tub: 'A blue plastic tub.',
      cardboard: 'A cardboard box lid lined with newspaper.',
    }),
    extra: choice('What else is for sale?', {
      incense: 'A bundle of incense sticks tucked in the basket.',
      garland: 'A marigold garland over one arm.',
      postcards: 'A fan of postcards in the free hand.',
      nothing: 'Only the boats.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 1.1;
    const skin = ['#8a5a3c', '#6b4a33', '#a06c48', '#5a3a28'][Math.floor(random() * 4)];
    const outfit = {
      school: { top: '#efece2', bottom: '#2b3550', sleeves: 'short' as const, hair: 'short' as const },
      dress: { top: '#e23c7a', bottom: '#e23c7a', sleeves: 'short' as const, hair: 'long' as const },
      sweater: { top: '#7d7f82', bottom: '#7d7f82', sleeves: 'long' as const, hair: 'short' as const },
      kurta: { top: '#e8781a', bottom: '#efece2', sleeves: 'long' as const, hair: 'short' as const },
    }[a.wears];
    const person = figure(s, {
      height: H, build: a.wears === 'sweater' ? 'heavy' : 'slight', style: 'doll', skin, hair: outfit.hair,
      pose: 'standing', gaze: a.doing === 'counting' ? 'up' : 'ahead', // the kit's 'up' lowers the head
      top: outfit.top, bottom: outfit.bottom, shoes: a.wears === 'school' ? '#2a2a2c' : skin, sleeves: outfit.sleeves,
    });
    s.root.add(person.root);
    const joints = rig(person);
    const arm = (side: 'left' | 'right', forward: number, out: number, bend: number, inward: number) => {
      const sign = side === 'left' ? 1 : -1;
      joints[side].shoulder.rotation.set(-forward * RAD, 0, sign * out * RAD);
      joints[side].elbow.rotation.set(-bend * RAD, -sign * inward * RAD, 0);
    };
    // The basket arm, and the free arm by occupation.
    const basketOnArm = a.doing !== 'counting';
    if (a.doing === 'carrying') { arm('left', 40, 6, 80, 30); arm('right', 40, 6, 80, 30); }
    if (a.doing === 'offering') { arm('left', 30, 8, 85, 25); arm('right', 72, 10, 10, 0); }
    if (a.doing === 'calling') { arm('left', 30, 10, 85, 25); arm('right', 150, 30, 20, 0); }
    if (a.doing === 'counting') { arm('left', 38, 4, 90, 40); arm('right', 50, 6, 70, 20); }
    person.root.updateMatrixWorld(true);
    const left = person.hands.left.getWorldPosition(new THREE.Vector3());
    const right = person.hands.right.getWorldPosition(new THREE.Vector3());
    const hips = person.pelvis.getWorldPosition(new THREE.Vector3());

    // Pattern on the dress: a few painted dots as tiny spheres.
    if (a.wears === 'dress') s.scatter(new THREE.SphereGeometry(1, 5, 4), s.material('#f5d84a'), Array.from({ length: 14 }, () => { const t = random() * 6.3, h = hips.y - 0.1 + random() * 0.32; return { at: [hips.x + Math.cos(t) * H * 0.052, h, hips.z + Math.sin(t) * H * 0.045] as P, size: 0.008 }; }));

    // The basket: in the arms, or set down on a small step.
    const basketR = 0.19;
    const basketAt = basketOnArm
      ? new THREE.Vector3((a.doing === 'carrying' ? (left.x + right.x) / 2 : left.x - 0.02), (a.doing === 'carrying' ? (left.y + right.y) / 2 : left.y) - 0.02, (a.doing === 'carrying' ? (left.z + right.z) / 2 : left.z) + 0.06)
      : new THREE.Vector3(hips.x + 0.36, 0.1, hips.z + 0.2);
    if (!basketOnArm) s.box([0.5, 0.1, 0.42], [basketAt.x, 0.05, basketAt.z], s.material(new THREE.Color('#b3a58d').lerp(new THREE.Color('#5a5a52'), mood.wear * 0.4), { roughness: 0.9 }));
    const rim = basketAt.y + 0.09;
    if (a.basket === 'cane') {
      const cane = new THREE.MeshStandardMaterial({ map: weave(random), roughness: 0.9, side: THREE.DoubleSide });
      s.mesh(new THREE.CylinderGeometry(basketR, basketR * 0.75, 0.1, 20, 1, true), cane, [basketAt.x, basketAt.y + 0.05, basketAt.z]);
      s.cylinder(basketR * 0.75, basketR * 0.75, 0.012, [basketAt.x, basketAt.y + 0.006, basketAt.z], s.material('#8a5f33'), 20);
      const lip = s.mesh(new THREE.TorusGeometry(basketR, 0.012, 6, 24), s.material('#7a4f28'), [basketAt.x, rim, basketAt.z]);
      lip.rotation.x = Math.PI / 2;
    }
    if (a.basket === 'steel') {
      s.mesh(new THREE.CylinderGeometry(basketR, basketR * 0.9, 0.06, 24, 1, true), s.material('#b9bcbe', { metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }), [basketAt.x, basketAt.y + 0.03, basketAt.z]);
      s.cylinder(basketR * 0.9, basketR * 0.9, 0.01, [basketAt.x, basketAt.y + 0.005, basketAt.z], s.material('#a8abad', { metalness: 0.8, roughness: 0.4 }), 24);
    }
    if (a.basket === 'tub') {
      s.mesh(new THREE.CylinderGeometry(basketR, basketR * 0.82, 0.1, 20, 1, true), s.material('#2f6fc4', { roughness: 0.4, side: THREE.DoubleSide }), [basketAt.x, basketAt.y + 0.05, basketAt.z]);
      s.cylinder(basketR * 0.82, basketR * 0.82, 0.01, [basketAt.x, basketAt.y + 0.005, basketAt.z], s.material('#2a62ad', { roughness: 0.4 }), 20);
    }
    if (a.basket === 'cardboard') {
      s.box([basketR * 2, 0.012, basketR * 1.7], [basketAt.x, basketAt.y + 0.006, basketAt.z], s.material('#b48a5a', { roughness: 0.95 }));
      for (const [dx, dz, w, d] of [[-basketR, 0, 0.012, basketR * 1.7], [basketR, 0, 0.012, basketR * 1.7], [0, -basketR * 0.85, basketR * 2, 0.012], [0, basketR * 0.85, basketR * 2, 0.012]] as const)
        s.box([w, 0.07, d], [basketAt.x + dx, basketAt.y + 0.035, basketAt.z + dz], s.material('#b48a5a', { roughness: 0.95 }));
      s.box([basketR * 1.8, 0.004, basketR * 1.5], [basketAt.x, basketAt.y + 0.014, basketAt.z], s.material('#e9e4d6', { roughness: 0.95 }));
    }

    // The boats: leaf cups with petals and a candle each.
    const leaf = s.material('#6f8a3a', { roughness: 0.8, side: THREE.DoubleSide });
    const wax = s.material('#f4ecd8', { roughness: 0.6 });
    const petalMaterial = s.material('#f0831a', { emissive: '#8a3a00', emissiveIntensity: 0.2, roughness: 0.85 });
    const flameMaterial = new THREE.MeshStandardMaterial({ color: '#ffe9a0', emissive: '#ff8a10', emissiveIntensity: mix(2, 3.5, mood.energy), transparent: true, opacity: 0.95, depthWrite: false });
    const flames: THREE.Mesh[] = [];
    const boat = (x: number, y: number, z: number, lit: boolean, turn = 0) => {
      const cup = s.cylinder(0.05, 0.036, 0.024, [x, y + 0.012, z], leaf, 8);
      cup.scale.z = 0.72;
      cup.rotation.y = turn;
      s.scatter(new THREE.SphereGeometry(1, 5, 4), petalMaterial, Array.from({ length: 5 }, (_u, i) => ({ at: [x + Math.cos(i * 1.26 + turn) * 0.024, y + 0.028, z + Math.sin(i * 1.26 + turn) * 0.018] as P, size: 0.009, color: i % 2 ? '#f0831a' : '#f2b21c' })));
      s.cylinder(0.007, 0.007, 0.018, [x, y + 0.033, z], wax, 8);
      if (lit) {
        const flame = s.mesh(new THREE.ConeGeometry(0.009, 0.03, 6), flameMaterial, [x, y + 0.056, z]);
        flame.castShadow = false;
        flames.push(flame);
      }
    };
    const count = a.left < 0.2 ? 1 : a.left < 0.5 ? 3 : a.left < 0.8 ? 6 : 9;
    const spots: [number, number][] = count === 1 ? [[0, 0]] : count === 3 ? [[-0.07, 0.02], [0.07, 0.02], [0, -0.07]] : [[0, 0], [0.095, 0], [-0.095, 0], [0.045, 0.085], [-0.045, 0.085], [0.045, -0.085], [-0.045, -0.085], [0.1, 0.09], [-0.1, -0.09]];
    const floor = a.basket === 'steel' ? basketAt.y + 0.012 : basketAt.y + 0.014;
    for (let i = 0; i < count; i++) {
      const [dx, dz] = spots[i];
      const lift = a.left > 0.8 && i >= 6 ? 0.03 : 0;
      boat(basketAt.x + dx * (a.basket === 'cardboard' ? 1.15 : 1), floor + lift, basketAt.z + dz, a.lit, random() * 6.3);
    }
    // The one held out.
    if (a.doing === 'offering') boat(right.x, right.y - 0.02, right.z + 0.05, a.lit, 0.3);
    // The tin of coins on its string.
    if (a.tin) {
      const tinAt: P = [basketAt.x + basketR * 0.9, basketAt.y - 0.09, basketAt.z + 0.04];
      s.rod([basketAt.x + basketR * 0.95, rim, basketAt.z + 0.02], [tinAt[0], tinAt[1] + 0.03, tinAt[2]], 0.003, s.material('#d8d2c0'));
      s.cylinder(0.036, 0.036, 0.065, tinAt, s.material('#9aa3a8', { metalness: 0.6, roughness: 0.4 }), 12);
      s.label('5', 0.04, 0.04, [tinAt[0], tinAt[1], tinAt[2] + 0.037], '#b8322a', '#d9d4c8');
    }
    // Coins in the palm when counting.
    if (a.doing === 'counting') s.scatter(new THREE.CylinderGeometry(1, 1, 0.25, 10), s.material('#c9a44a', { metalness: 0.7, roughness: 0.3 }), Array.from({ length: 4 }, () => ({ at: [right.x + (random() - 0.5) * 0.03, right.y + 0.005, right.z + 0.03 + (random() - 0.5) * 0.03] as P, size: 0.011 })));
    // Extras.
    if (a.extra === 'incense') {
      for (let i = 0; i < 7; i++) s.rod([basketAt.x - basketR * 0.7 + i * 0.008, basketAt.y + 0.02, basketAt.z + basketR * 0.3], [basketAt.x - basketR * 0.7 + i * 0.012 - 0.07, basketAt.y + 0.14, basketAt.z + basketR * 0.3 + 0.08], 0.0025, s.material('#5a3020'));
    }
    if (a.extra === 'garland') {
      const g = s.mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 24), petalMaterial, [right.x + 0.02, right.y + 0.12, right.z]);
      g.rotation.y = Math.PI / 2 + 0.3;
      g.scale.y = 1.6;
    }
    if (a.extra === 'postcards' && a.doing !== 'offering' && a.doing !== 'counting') {
      for (let i = 0; i < 4; i++) {
        const card = s.box([0.1, 0.07, 0.002], [right.x + 0.02 + i * 0.012, right.y - 0.01, right.z + 0.03], s.material(['#3f8fcf', '#e07a14', '#5a9a4a', '#efe8da'][i], { roughness: 0.6 }));
        card.rotation.set(-0.5, 0, 0.2 * i - 0.3);
      }
    }

    const energy = mood.energy;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        for (const [i, flame] of flames.entries()) flame.scale.y = 1 + Math.sin(time * (9 + energy * 6) + i * 1.7) * 0.2 * (0.3 + energy);
      },
    });
  },
});
