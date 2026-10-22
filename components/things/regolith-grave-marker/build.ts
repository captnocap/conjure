import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PLATES = { blank: '', first: 'THE FIRST', name: 'M. OKAFOR', sol: 'SOL 214', home: 'FAR FROM HOME', unknown: 'UNKNOWN', thanks: 'SHE GOT US HERE' } as const;

export default defineThing({
  questions: {
    marker: choice('What stands at the head of the grave?', {
      cross: 'A cross welded from two lengths of pipe.',
      post: 'A plain square post cut from a rover strut, with an angled plate.',
      helmet: 'An empty helmet set on a stake, visor facing the sunrise.',
      slab: 'A hatch door stood on end as a headstone.',
      tank: 'A spent oxygen bottle standing upright.',
      cairn: 'A stacked cairn of flat stones with a strip of cloth tied to it.',
    }),
    plate: choice('What does the name plate say?', {
      blank: 'Nothing: it was left blank, or the wind has scoured it.',
      first: 'THE FIRST',
      name: 'M. OKAFOR',
      sol: 'SOL 214',
      home: 'FAR FROM HOME',
      unknown: 'UNKNOWN',
      thanks: 'SHE GOT US HERE',
    }),
    left: choice('What have visitors left?', {
      nothing: 'Nothing. Nobody comes.',
      pebbles: 'A careful ring of pale pebbles laid round the mound.',
      flowers: 'A tin of bright plastic flowers.',
      boots: 'A pair of boots and gloves set neatly at the foot.',
      lamp: 'A small lantern, kept lit.',
      toy: 'A child-sized toy rover parked on the stones.',
      plant: 'One living seedling under a sealed glass jar.',
    }),
    age: score('How old is the grave?', ['Fresh: dark turned soil heaped high', 'Settled, a season old', 'Sunk low and half levelled by the wind']),
    company: choice('Is it alone?', {
      alone: 'One grave, alone on the plain.',
      pair: 'Two graves side by side.',
      row: 'A short row of graves, the first of a cemetery.',
    }),
    path: noul('Is there a path of bootprints worn up to it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dust = new THREE.Color('#b96a3f').lerp(new THREE.Color('#d6a064'), mood.warmth * 0.5);
    const fresh = 1 - a.age;
    const earth = s.material(dust.clone().lerp(new THREE.Color('#5a2f20'), fresh * 0.6), { roughness: 1 });
    const metal = s.material(new THREE.Color('#a4a8aa').lerp(dust, mood.wear * 0.4), { metalness: 0.6, roughness: 0.45 });
    const white = s.material(new THREE.Color('#ece7da').lerp(dust, mood.wear * 0.4), { roughness: 0.6 });
    const dark = s.material('#2d2a29', { roughness: 0.8 });
    const dummy = new THREE.Object3D();
    const plateInk = '#2b2a28', platePaper = `#${new THREE.Color('#d9d4c4').lerp(dust, mood.wear * 0.3).getHexString()}`;
    const plate = (text: string, width: number, _at: [number, number, number], tilt = 0) => {
      const holder = new THREE.Group();
      const board = text ? s.label(text, width, width * 0.3, [0, 0, 0.012], plateInk, platePaper) : s.box([width, width * 0.3, 0.01], [0, 0, 0.012], white);
      const back = s.box([width + 0.04, width * 0.3 + 0.04, 0.02], [0, 0, 0], metal);
      holder.add(board, back);
      holder.rotation.x = tilt;
      return holder;
    };

    const grave = (gx: number, main: boolean) => {
      const length = main ? 2.1 : 1.9 + random() * 0.3, width = 0.95, height = mix(0.17, 0.38, fresh) * (main ? 1 : 0.85 + random() * 0.2);
      s.ball([width / 2, height, length / 2], [gx, 0, 0], earth, 18);
      // Red stones heaped over the mound.
      const stones = Math.round(mix(70, 150, mood.density) * mix(0.7, 1, fresh));
      const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), stones);
      for (let i = 0; i < stones; i++) {
        const u = random() * Math.PI * 2, v = Math.acos(random() * 0.98);
        const spread = 1.04 + (v > 1.3 ? random() * 0.25 * a.age : 0);
        dummy.position.set(gx + Math.sin(v) * Math.cos(u) * width / 2 * spread, Math.cos(v) * height * 1.02, Math.sin(v) * Math.sin(u) * length / 2 * spread);
        dummy.rotation.set(random() * 6, random() * 6, random() * 6);
        const size = 0.05 + random() * 0.075;
        dummy.scale.set(size * 1.3, size * 0.8, size);
        dummy.updateMatrix();
        rocks.setMatrixAt(i, dummy.matrix);
        rocks.setColorAt(i, new THREE.Color(['#8c3f2a', '#a04e31', '#6f3324', '#b3603a', '#7d4a3a'][Math.floor(random() * 5)]).lerp(dust, a.age * 0.35 + mood.wear * 0.2));
      }
      rocks.castShadow = rocks.receiveShadow = true;
      s.root.add(rocks);

      // The marker at the head.
      const hz = -length / 2 - 0.12;
      const group = new THREE.Group();
      group.position.set(gx, 0, hz);
      group.rotation.set((random() - 0.5) * mood.wear * 0.35, (random() - 0.5) * 0.2, (random() - 0.5) * mood.wear * 0.5);
      s.root.add(group);
      const place = <T extends THREE.Object3D>(node: T, at: [number, number, number]) => { group.add(node); node.position.set(...at); return node; };
      const text = main ? PLATES[a.plate] : random() < 0.5 ? '' : ['SOL 301', 'J. REYES', 'UNKNOWN', 'A. LINDQVIST'][Math.floor(random() * 4)];
      if (a.marker === 'cross') {
        place(s.cylinder(0.035, 0.035, 1.45, [0, 0, 0], metal, 10), [0, 0.72, 0]);
        const arm = place(s.cylinder(0.035, 0.035, 0.8, [0, 0, 0], metal, 10), [0, 1.05, 0]);
        arm.rotation.z = Math.PI / 2;
        place(s.cylinder(0.05, 0.05, 0.09, [0, 0, 0], dark, 8), [0, 1.05, 0]);
        place(plate(text, 0.5, [0, 0, 0]), [0, 0.74, 0.05]);
      } else if (a.marker === 'post') {
        place(s.box([0.11, 1.1, 0.11], [0, 0, 0], metal), [0, 0.55, 0]);
        for (let i = 0; i < 4; i++) place(s.cylinder(0.022, 0.022, 0.13, [0, 0, 0], dark, 8), [0, 0.25 + i * 0.2, 0]).rotation.x = Math.PI / 2;
        place(plate(text, 0.56, [0, 0, 0], -0.5), [0, 1.14, 0.06]);
      } else if (a.marker === 'helmet') {
        place(s.cylinder(0.025, 0.03, 1.0, [0, 0, 0], metal, 8), [0, 0.5, 0]);
        place(s.ball([0.19, 0.2, 0.2], [0, 0, 0], white, 18), [0, 1.12, 0]);
        place(s.ball([0.15, 0.13, 0.12], [0, 0, 0], s.material('#c98a2b', { metalness: 0.85, roughness: 0.2 }), 14), [0, 1.13, 0.1]);
        place(s.cylinder(0.14, 0.15, 0.06, [0, 0, 0], metal, 14), [0, 0.95, 0]);
        place(plate(text, 0.46, [0, 0, 0]), [0, 0.62, 0.045]);
      } else if (a.marker === 'slab') {
        const door = new THREE.Shape();
        door.moveTo(-0.34, 0); door.lineTo(-0.34, 0.75); door.absarc(0, 0.75, 0.34, Math.PI, 0, true); door.lineTo(0.34, 0);
        place(s.mesh(new THREE.ExtrudeGeometry(door, { depth: 0.06, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012 }), white), [0, 0, -0.03]);
        place(s.ring(0.12, 0.018, [0, 0, 0], metal), [0, 0.8, 0.05]);
        for (const x of [-0.27, 0.27]) for (const y of [0.15, 0.6]) place(s.cylinder(0.02, 0.02, 0.03, [0, 0, 0], dark, 8), [x, y, 0.04]).rotation.x = Math.PI / 2;
        place(plate(text, 0.5, [0, 0, 0]), [0, 0.42, 0.055]);
      } else if (a.marker === 'tank') {
        const paint = s.material(new THREE.Color('#3d7fae').lerp(dust, mood.wear * 0.4), { metalness: 0.4, roughness: 0.5 });
        place(s.cylinder(0.14, 0.14, 0.85, [0, 0, 0], paint, 16), [0, 0.42, 0]);
        place(s.ball([0.14, 0.12, 0.14], [0, 0, 0], paint, 14), [0, 0.85, 0]);
        place(s.cylinder(0.03, 0.04, 0.12, [0, 0, 0], metal, 8), [0, 1.0, 0]);
        place(s.box([0.14, 0.03, 0.03], [0, 0, 0], metal), [0, 1.06, 0]);
        place(s.cylinder(0.145, 0.145, 0.04, [0, 0, 0], dark, 16), [0, 0.5, 0]);
        place(plate(text, 0.44, [0, 0, 0]), [0, 0.5, 0.16]);
      } else {
        let y = 0;
        for (let i = 0; i < 7; i++) {
          const size = mix(0.3, 0.1, i / 6), thick = 0.09 + random() * 0.05;
          const stone = place(s.mesh(new THREE.DodecahedronGeometry(1, 0), s.material(['#8c3f2a', '#6f3324', '#a04e31'][i % 3], { roughness: 1, flatShading: true })), [(random() - 0.5) * 0.06, y + thick * 0.5, (random() - 0.5) * 0.06]);
          stone.scale.set(size, thick * 0.6, size * 0.85);
          stone.rotation.y = random() * 6;
          y += thick;
        }
        place(s.rod([0, 0, 0], [0, 0.5, 0], 0.012, metal), [0, y + 0.2, 0]);
        const rag = place(s.mesh(new THREE.PlaneGeometry(0.34, 0.09, 4, 1), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#e0452b' : '#d8d2c0', side: THREE.DoubleSide, roughness: 0.9 })), [0.17, y + 0.4, 0]);
        rag.rotation.z = -0.25;
        flags.push(rag);
        place(plate(text, 0.44, [0, 0, 0], -1.0), [0, 0.12, 0.36]);
      }
      return { length, width, height };
    };

    const flags: THREE.Mesh[] = [];
    const xs = a.company === 'alone' ? [0] : a.company === 'pair' ? [0, 1.5] : [0, 1.5, 3, -1.5];
    let main = { length: 2.1, width: 0.95, height: 0.4 };
    xs.forEach((x, i) => { const made = grave(x, i === 0); if (i === 0) main = made; });

    // What the living left.
    const foot = main.length / 2;
    let flame: THREE.MeshStandardMaterial | null = null;
    if (a.left === 'pebbles') {
      const count = 34;
      const ring = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#efe9dc', roughness: 0.8 }), count);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        dummy.position.set(Math.cos(angle) * (main.width / 2 + 0.22), 0.03, Math.sin(angle) * (foot + 0.22));
        dummy.rotation.set(0, random() * 6, 0);
        dummy.scale.set(0.055 + random() * 0.02, 0.04, 0.05 + random() * 0.02);
        dummy.updateMatrix();
        ring.setMatrixAt(i, dummy.matrix);
      }
      ring.castShadow = true;
      s.root.add(ring);
    } else if (a.left === 'flowers') {
      const fx = 0.42, fz = -foot + 0.25;
      s.cylinder(0.085, 0.075, 0.2, [fx, 0.1, fz], metal, 12);
      const petals = ['#e23b4e', '#f4c21f', '#ee6fb0', '#f08a24', '#ffffff'];
      for (let i = 0; i < 7; i++) {
        const tip: [number, number, number] = [fx + (random() - 0.5) * 0.3, 0.38 + random() * 0.18, fz + (random() - 0.5) * 0.3];
        s.rod([fx, 0.18, fz], tip, 0.008, s.material('#3f8a3a'));
        s.ball([0.06, 0.035, 0.06], tip, s.material(petals[i % 5], { emissive: petals[i % 5], emissiveIntensity: mood.cheer * 0.25 }), 8);
      }
    } else if (a.left === 'boots') {
      for (const dx of [-0.13, 0.13]) {
        s.box([0.13, 0.3, 0.14], [dx, 0.17, foot + 0.3], white);
        s.box([0.14, 0.09, 0.3], [dx, 0.045, foot + 0.37], dark);
      }
      for (const dx of [-0.1, 0.12]) s.ball([0.08, 0.035, 0.12], [dx + 0.42, 0.04, foot + 0.3], white, 10).rotation.y = dx * 6;
    } else if (a.left === 'lamp') {
      const lx = -0.45, lz = -foot + 0.35;
      flame = s.material('#ffd98a', { emissive: '#ffb347', emissiveIntensity: 2.2 });
      s.cylinder(0.09, 0.1, 0.05, [lx, 0.025, lz], dark, 12);
      s.cylinder(0.07, 0.07, 0.2, [lx, 0.15, lz], flame, 12);
      for (let i = 0; i < 4; i++) s.rod([lx + Math.cos(i * 1.57) * 0.08, 0.04, lz + Math.sin(i * 1.57) * 0.08], [lx + Math.cos(i * 1.57) * 0.08, 0.26, lz + Math.sin(i * 1.57) * 0.08], 0.008, dark);
      s.cylinder(0.03, 0.1, 0.07, [lx, 0.29, lz], dark, 12);
      s.ring(0.05, 0.008, [lx, 0.36, lz], dark);
    } else if (a.left === 'toy') {
      const ty = main.height * 0.92 + 0.07;
      const body = s.material('#e9b93a', { roughness: 0.5 });
      s.box([0.22, 0.07, 0.32], [0, ty + 0.03, 0.2], body);
      s.box([0.26, 0.012, 0.3], [0, ty + 0.075, 0.2], s.material('#27407a', { metalness: 0.4 }));
      for (const dx of [-0.13, 0.13]) for (const dz of [-0.12, 0, 0.12]) s.cylinder(0.04, 0.04, 0.04, [dx, ty - 0.01, 0.2 + dz], dark, 10).rotation.z = Math.PI / 2;
      s.rod([0.06, ty + 0.07, 0.3], [0.06, ty + 0.24, 0.3], 0.01, metal);
      s.box([0.1, 0.045, 0.05], [0.06, ty + 0.25, 0.3], white);
    } else if (a.left === 'plant') {
      const px = 0.4, pz = foot + 0.05;
      s.cylinder(0.12, 0.12, 0.03, [px, 0.015, pz], metal, 14);
      s.cylinder(0.08, 0.08, 0.05, [px, 0.05, pz], s.material('#4a3226'), 12);
      const green = s.material('#4fb03f', { emissive: '#2f8a2a', emissiveIntensity: 0.35 });
      s.rod([px, 0.07, pz], [px, 0.2, pz], 0.008, green);
      for (const side of [-1, 1]) s.ball([0.05, 0.012, 0.03], [px + side * 0.045, 0.2 + (side > 0 ? 0.01 : 0), pz], green, 8).rotation.z = side * 0.4;
      const jar = new THREE.MeshPhysicalMaterial({ color: '#dff3ee', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false });
      s.cylinder(0.105, 0.105, 0.24, [px, 0.15, pz], jar, 14).castShadow = false;
      s.ball([0.105, 0.07, 0.105], [px, 0.27, pz], jar, 12).castShadow = false;
    }

    if (a.path) {
      const scuffed = s.material(dust.clone().multiplyScalar(0.55), { roughness: 1 });
      const count = 9;
      const prints = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.01, 10), scuffed, count);
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        dummy.position.set(-0.35 + Math.sin(t * 3) * 0.15 + (i % 2 ? 0.13 : -0.13), 0.006, foot + 0.5 + t * 1.5);
        dummy.rotation.set(0, Math.cos(t * 3) * 0.2, 0);
        dummy.scale.set(0.075, 1, 0.15);
        dummy.updateMatrix();
        prints.setMatrixAt(i, dummy.matrix);
      }
      prints.receiveShadow = true;
      s.root.add(prints);
    }
    // Wind-drift on the lee side of an old grave.
    if (a.age > 0.55) for (const x of xs) s.ball([0.32, 0.06 + a.age * 0.08, 0.75], [x - 0.42, 0, 0.1], s.material(dust, { roughness: 1 }), 12);

    const flutter = mix(0.4, 3, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (flame) flame.emissiveIntensity = 2 + Math.sin(time * 9 * flutter) * 0.3 + Math.sin(time * 23) * 0.2;
        for (const flag of flags) flag.rotation.y = Math.sin(time * 2.5 * flutter) * 0.5;
      },
    });
  },
});
