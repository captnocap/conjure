import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { irisTexture, makeEye, scleraTexture } from './eye';

const RANGES = {
  blues: 'All blues, graded across the rows from palest ice to deep navy.',
  browns: 'All browns, graded from amber through chestnut to nearly black.',
  greens: 'Greens and hazels, moss to olive to gold.',
  greys: 'Cool greys and slate, a drawer of overcast skies.',
  mixed: 'Every colour mixed together, a crowd of strangers.',
} as const;
const RAMP: Record<Exclude<keyof typeof RANGES, 'mixed'>, [string, string, string]> = {
  blues: ['#b9dcf2', '#4f93cf', '#173f86'],
  browns: ['#d9973c', '#7a4318', '#24120a'],
  greens: ['#c2b04a', '#6c9440', '#2f5a34'],
  greys: ['#c9d2d6', '#84939c', '#3d4a54'],
};
const VELVET = { midnight: '#1c2550', oxblood: '#5c1424', bottle: '#173d2c', black: '#17161a', mustard: '#8f6f1c' } as const;

export default defineThing({
  questions: {
    amount: choice('How many eyes are there?', {
      dozen: 'A sparse dozen, generously spaced.',
      grid: 'A full neat grid, every dimple filled.',
      heaped: 'Heaped loose in a pile, rolled against each other like marbles.',
    }),
    range: choice('What range of iris colours?', RANGES),
    odd: choice('Is there one odd eye among them?', {
      none: 'No, every one is an ordinary human eye.',
      red: 'One blood-red albino eye that does not belong.',
      animal: 'One yellow slit-pupilled animal eye, a cat or goat among the people.',
      clouded: 'One clouded blind eye, made to match a real blind one.',
    }),
    gaze: choice('Where are they looking?', {
      up: 'All straight up at you.',
      scattered: 'Every which way, no two alike.',
      oneway: 'All off the same way, as if something just came in.',
    }),
    tray: choice('What are they kept in?', {
      drawer: 'A shallow wooden drawer lined with velvet, with a brass pull.',
      box: 'A cardboard box with crumpled tissue, its lid leaning behind.',
      jar: 'A glass apothecary jar with a lid, eyes pressed against the glass.',
    }),
    velvet: choice('If there is velvet, what colour is it?', {
      midnight: 'Midnight blue.',
      oxblood: 'Oxblood red.',
      bottle: 'Bottle green.',
      black: 'Jet black.',
      mustard: 'Faded mustard gold.',
    }),
    missing: choice('What is missing?', {
      nothing: 'Nothing, the set is complete.',
      one: 'One empty dimple in the row where an eye was taken.',
      half: 'Half of them sold, gaps everywhere.',
      few: 'Nearly all gone: only three or four left behind.',
    }),
    label: choice('What does the handwritten label say, if anything?', {
      none: 'No label.',
      blau: 'BLAU No. 3',
      links: 'LINKS / LEFT',
      muster: 'MUSTER',
      sold: 'RESERVED',
    }),
    following: noul('Do the eyes slowly turn to follow you?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = 0.0125;
    const pitch = 0.035;
    const dense = mood.density > 0.66 ? 1 : 0;
    const [cols, rows] = a.amount === 'dozen' ? [4, 3] : a.amount === 'grid' ? [6 + dense, 4] : [6, 4];
    const loose = a.amount === 'heaped' || a.tray === 'jar';
    const W = a.tray === 'jar' ? 0.11 : cols * pitch + (a.amount === 'dozen' ? 0.05 : 0.03);
    const D = a.tray === 'jar' ? 0.11 : rows * pitch + (a.amount === 'dozen' ? 0.045 : 0.03);
    const velvetColour = new THREE.Color(VELVET[a.velvet]).lerp(new THREE.Color('#8a857c'), mood.wear * 0.3);

    // Decide which places hold an eye.
    const total = a.amount === 'heaped' ? 30 + dense * 8 : cols * rows;
    const keep = Array.from({ length: total }, () => true);
    const gone = a.missing === 'one' ? 1 : a.missing === 'half' ? Math.round(total * 0.5) : a.missing === 'few' ? total - 3 - Math.floor(random() * 2) : 0;
    for (let n = 0; n < gone; ) {
      const index = Math.floor(random() * total);
      if (keep[index]) { keep[index] = false; n++; }
    }

    // Containers.
    let floorY = 0;
    const spots: THREE.Vector3[] = [];
    if (a.tray === 'drawer') {
      const wood = s.material(mix(0.3, 0.7, mood.warmth) > 0.5 ? '#6e4424' : '#5a4a3a', { roughness: 0.55 });
      const brass = s.material('#b8903e', { metalness: 0.85, roughness: mix(0.25, 0.6, mood.wear) });
      const wall = 0.008, high = 0.03;
      s.box([W + wall * 2, 0.006, D + wall * 2], [0, 0.003, 0], wood);
      for (const side of [-1, 1]) s.box([wall, high, D + wall * 2], [side * (W / 2 + wall / 2), high / 2, 0], wood);
      s.box([W + wall * 2, high, wall], [0, high / 2, -(D / 2 + wall / 2)], wood);
      s.box([W + wall * 6, high + 0.012, wall * 1.3], [0, (high + 0.012) / 2, D / 2 + wall * 0.65], wood);
      const pull = s.ring(0.02, 0.004, [0, 0.022, D / 2 + wall * 1.3], brass, Math.PI);
      pull.rotation.set(Math.PI / 2, 0, 0);
      pull.scale.set(1, 1, 1);
      for (const side of [-1, 1]) s.ball([0.006, 0.006, 0.004], [side * 0.02, 0.022, D / 2 + wall * 1.4], brass, 10);
      floorY = 0.011;
      s.box([W, 0.005, D], [0, floorY - 0.0025, 0], new THREE.MeshStandardMaterial({ color: velvetColour, roughness: 1 }));
      if (a.label !== 'none') {
        const text = { blau: 'BLAU No.3', links: 'LINKS / LEFT', muster: 'MUSTER', sold: 'RESERVED' }[a.label];
        const x = W / 2 - 0.035;
        s.box([0.056, 0.02, 0.002], [x, 0.022, D / 2 + wall * 1.3 + 0.001], brass);
        s.label(text, 0.05, 0.015, [x, 0.022, D / 2 + wall * 1.3 + 0.0026], '#2a2622', '#efe6cc');
      }
    } else if (a.tray === 'box') {
      const card = s.material('#b3956a', { roughness: 0.9 });
      const high = 0.026, wall = 0.002;
      s.box([W + wall * 2, 0.002, D + wall * 2], [0, 0.001, 0], card);
      for (const side of [-1, 1]) {
        s.box([wall, high, D + wall * 2], [side * (W / 2 + wall / 2), high / 2, 0], card);
        s.box([W + wall * 2, high, wall], [0, high / 2, side * (D / 2 + wall / 2)], card);
      }
      const lid = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(W + 0.008, 0.003, D + 0.008), card);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(W + 0.008, 0.012, 0.003), card);
      lip.position.set(0, -0.006, (D + 0.008) / 2);
      const lip2 = lip.clone();
      lip2.position.z = -(D + 0.008) / 2;
      lid.add(top, lip, lip2);
      lid.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      lid.rotation.x = Math.PI / 2 - 0.42;
      lid.position.set((random() - 0.5) * 0.02, (D + 0.008) / 2 * Math.cos(0.42), -(D / 2 + 0.016 + (D / 2) * Math.sin(0.42)));
      s.root.add(lid);
      if (a.label !== 'none') {
        const text = { blau: 'BLAU No.3', links: 'LINKS / LEFT', muster: 'MUSTER', sold: 'RESERVED' }[a.label];
        const plate = s.label(text, 0.07, 0.022, [0, 0, 0], '#2a2622', '#efe6cc');
        plate.removeFromParent();
        plate.position.set(0, 0.0018, 0);
        plate.rotation.x = -Math.PI / 2;
        lid.add(plate);
      }
      // Crumpled tissue the eyes nestle in.
      floorY = 0.012;
      const tissue = new THREE.PlaneGeometry(W, D, 22, 16);
      tissue.rotateX(-Math.PI / 2);
      const points = tissue.attributes.position;
      for (let i = 0; i < points.count; i++) points.setY(i, floorY - 0.004 + random() * 0.006 + (Math.abs(points.getX(i)) > W / 2 - 0.01 || Math.abs(points.getZ(i)) > D / 2 - 0.01 ? 0.008 * random() : 0));
      tissue.computeVertexNormals();
      s.mesh(tissue, new THREE.MeshStandardMaterial({ color: new THREE.Color('#f4efe2').lerp(new THREE.Color('#b9ae95'), mood.wear * 0.5), roughness: 0.9, flatShading: true, side: THREE.DoubleSide }));
    } else {
      const R = 0.055, high = 0.14;
      const lidMetal = s.material('#8c8f8c', { metalness: 0.7, roughness: 0.4 });
      s.cylinder(R, R, 0.006, [0, 0.003, 0], s.material('#cfe0dc', { roughness: 0.1 }), 40);
      s.lathe([[R, 0.004], [R, high * 0.82], [R * 0.78, high * 0.94], [R * 0.78, high]], new THREE.MeshPhysicalMaterial({ color: '#dff0ec', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }));
      s.cylinder(R * 0.84, R * 0.84, 0.014, [0, high + 0.005, 0], lidMetal, 40);
      s.ball([0.012, 0.009, 0.012], [0, high + 0.02, 0], lidMetal, 14);
      s.ring(R * 0.785, 0.002, [0, high, 0], s.material('#cfe0dc', { roughness: 0.1 })).rotation.x = Math.PI / 2;
      floorY = 0.006;
      if (a.label !== 'none') {
        const text = { blau: 'BLAU No.3', links: 'LINKS / LEFT', muster: 'MUSTER', sold: 'RESERVED' }[a.label];
        s.label(text, 0.06, 0.022, [0, high * 0.42, R + 0.0015], '#2a2622', '#efe6cc');
      }
    }

    if (loose) {
      // Drop each eye where it settles lowest, so the heap rests on itself.
      const inside = (): [number, number] => {
        if (a.tray === 'jar') {
          const turn = random() * Math.PI * 2, far = Math.sqrt(random()) * (0.055 - r * 1.15);
          return [Math.cos(turn) * far, Math.sin(turn) * far];
        }
        const pile = a.amount === 'heaped' ? 0.62 : 1;
        return [(random() - 0.5) * (W - r * 2.2) * pile, (random() - 0.5) * (D - r * 2.2) * pile];
      };
      const settle = (x: number, z: number) => {
        let y = floorY + r;
        for (const other of spots) {
          const apart = Math.hypot(other.x - x, other.z - z);
          if (apart < r * 2) y = Math.max(y, other.y + Math.sqrt(4 * r * r - apart * apart));
        }
        return y;
      };
      for (let index = 0; index < total; index++) {
        if (!keep[index]) continue;
        let best: THREE.Vector3 | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const [x, z] = inside();
          const y = settle(x, z);
          if (!best || y < best.y) best = new THREE.Vector3(x, y, z);
        }
        spots.push(best!);
      }
    } else {
      const dimples: { at: [number, number, number]; size: number }[] = [];
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
          const x = (col - (cols - 1) / 2) * pitch * (a.amount === 'dozen' ? 1.25 : 1), z = (row - (rows - 1) / 2) * pitch * (a.amount === 'dozen' ? 1.25 : 1);
          dimples.push({ at: [x, floorY + 0.0004, z], size: 1 });
          if (keep[row * cols + col]) spots.push(new THREE.Vector3(x + (random() - 0.5) * 0.002, floorY + r * 0.72, z + (random() - 0.5) * 0.002));
          else spots.push(new THREE.Vector3(NaN, 0, 0));
        }
      const hollow = new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.0008, 20);
      s.scatter(hollow, new THREE.MeshStandardMaterial({ color: a.tray === 'box' ? '#cfc7b4' : velvetColour.clone().multiplyScalar(0.45), roughness: 1 }), dimples);
    }

    // Colours, sorted across the columns when the drawer is a graded range.
    const live = spots.map((spot, index) => ({ spot, index })).filter(({ spot }) => !Number.isNaN(spot.x));
    const palette = ['#4f93cf', '#7a4318', '#6c9440', '#84939c', '#a8802c', '#24120a', '#b9dcf2'];
    const tint = (index: number) => {
      if (a.range === 'mixed') return new THREE.Color(palette[Math.floor(random() * palette.length)]);
      const ramp = RAMP[a.range].map((hex) => new THREE.Color(hex));
      const along = loose ? random() : Math.min(1, Math.max(0, (index % cols) / Math.max(1, cols - 1) + (random() - 0.5) * 0.12));
      return along < 0.5 ? ramp[0].clone().lerp(ramp[1], along * 2) : ramp[1].clone().lerp(ramp[2], along * 2 - 1);
    };
    const oddAt = a.odd === 'none' || live.length === 0 ? -1 : Math.floor(random() * live.length);
    const aims = live.map(() => {
      const share = a.gaze === 'oneway' ? [0.75, 0.85] : [1.0, 0];
      if (a.gaze === 'scattered' || loose) return [0.2 + random() * 1.3, (random() - 0.5) * (loose ? 5 : 2.6)];
      return [share[0] + (random() - 0.5) * 0.3, share[1] + (random() - 0.5) * 0.3];
    });

    const whiteShape = new THREE.SphereGeometry(r, 24, 14);
    const irisShape = new THREE.SphereGeometry(r * 1.01, 28, 6, 0, Math.PI * 2, 0, 0.6);
    irisShape.rotateX(Math.PI / 2);
    const common = live.filter((_unused, index) => index !== oddAt);
    const dull = mix(0.06, 0.4, mood.wear);
    const whites = new THREE.InstancedMesh(whiteShape, new THREE.MeshStandardMaterial({ map: scleraTexture({ sclera: '#f4f1ea', veins: 0.12, random }), roughness: dull }), common.length);
    whites.geometry.rotateX(Math.PI / 2);
    const irises = new THREE.InstancedMesh(irisShape, new THREE.MeshStandardMaterial({ map: irisTexture({ iris: '#e9e9e9', pupil: 'normal', random }), roughness: dull + 0.05 }), common.length);
    const glints = new THREE.InstancedMesh(new THREE.SphereGeometry(r * 0.13, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1 }), common.length);
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), euler = new THREE.Euler(0, 0, 0, 'YXZ');
    const shine = new THREE.Vector3(-0.36, 0.62, 0.7).normalize().multiplyScalar(r * 0.98);
    const pose = (sway: number) => {
      let slot = 0;
      live.forEach(({ spot }, index) => {
        if (index === oddAt) return;
        euler.set(-aims[index][0], aims[index][1] + sway * (0.6 + (index % 3) * 0.2), 0);
        matrix.compose(spot, turn.setFromEuler(euler), one);
        whites.setMatrixAt(slot, matrix);
        irises.setMatrixAt(slot, matrix);
        slot++;
      });
      whites.instanceMatrix.needsUpdate = irises.instanceMatrix.needsUpdate = true;
    };
    pose(0);
    let slot = 0;
    live.forEach(({ spot, index }, order) => {
      if (order === oddAt) return;
      irises.setColorAt(slot, tint(index));
      matrix.makeTranslation(spot.x + shine.x, spot.y + shine.y, spot.z + shine.z);
      glints.setMatrixAt(slot, matrix);
      slot++;
    });
    if (irises.instanceColor) irises.instanceColor.needsUpdate = true;
    whites.castShadow = whites.receiveShadow = irises.castShadow = true;
    s.root.add(whites, irises, glints);

    if (oddAt >= 0) {
      const odd = makeEye({
        r,
        iris: { red: '#c4151c', animal: '#e3b21c', clouded: '#93a7b0' }[a.odd as 'red' | 'animal' | 'clouded'],
        pupil: a.odd === 'animal' ? 'slit' : 'normal',
        sclera: a.odd === 'red' ? '#f6dede' : a.odd === 'animal' ? '#e8dfa8' : '#eef0ee',
        veins: a.odd === 'red' ? 0.5 : 0.1,
        cloud: a.odd === 'clouded' ? 0.8 : 0,
        rough: dull,
        irisAngle: a.odd === 'animal' ? 0.85 : 0.6,
        random,
      });
      odd.group.position.copy(live[oddAt].spot);
      odd.ball.rotation.set(-aims[oddAt][0], aims[oddAt][1], 0, 'YXZ');
      s.root.add(odd.group);
    }

    const speed = a.following ? mix(0.2, 0.9, mood.energy) : 0;
    return s.finish({ update: (_dt, time) => { if (speed) pose(Math.sin(time * speed) * 0.45); } });
  },
});
