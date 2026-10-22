import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const LIVERY = {
  yellow: 'Construction yellow with black trim, the classic earthmover.',
  orange: 'Municipal safety orange, council issue.',
  green: 'Dark waste-contractor green with a cream cab.',
  white: 'Chalky white with a red stripe, a fleet machine that shows every stain.',
  primer: 'Oxide-red primer and bare patches, repainted by hand in the yard.',
  blue: 'Faded sky blue, an old machine bought second-hand from another country.',
} as const;
const PAINT: Record<keyof typeof LIVERY, [string, string]> = {
  yellow: ['#e2a91c', '#2a2a28'], orange: ['#e0621f', '#3a3c3f'], green: ['#2f6a45', '#e6dcc0'],
  white: ['#e4e2d8', '#b8312b'], primer: ['#8e3f2c', '#5f5a52'], blue: ['#5d94b8', '#27313a'],
};
const NAMES = { council: 'COUNTY WASTE', number: 'No. 7', bertha: 'BERTHA', clear: 'KEEP CLEAR', none: '' } as const;
const JUNK = ['#f1efe8', '#2c2d30', '#3f79b8', '#c9a26a', '#d44b3a', '#e8c53c', '#7fa85b', '#d58bb0', '#8a8f94'];

export default defineThing({
  questions: {
    state: choice('What is the compactor doing right now?', {
      pushing: 'Working: shoving a rolling heap of refuse ahead of its blade, wheels turning.',
      travelling: 'Rolling back for another pass with the blade lifted high and empty.',
      parked: 'Parked for the night, blade resting on the ground, cab door hanging open.',
      bogged: 'Bogged down and tilted, one side sunk into soft rubbish.',
    }),
    caught: choice('What is caught in the spiked wheels?', {
      nothing: 'Nothing: the steel cleats are clean and bright.',
      bags: 'Shredded plastic bags in white, blue and pink, flapping from the spikes.',
      wire: 'Loops of rusty wire and cable wound tight around the drums.',
      cloth: 'Long strips of cloth and old clothes wrapped round like bandages.',
      teddy: 'A single teddy bear impaled on a spike, going round and round.',
    }),
    livery: choice('What colours is it painted?', LIVERY),
    blade: choice('What is the front blade like?', {
      rack: 'A straight blade topped with a tall barred trash rack.',
      wings: 'A U-blade with angled side wings that cup the load.',
      bare: 'A low plain blade with no rack, the driver sees straight over it.',
    }),
    cab: choice('How is the cab protected?', {
      caged: 'A heavy steel cage of bars over every window.',
      glass: 'A clean enclosed glass cab with a thick roof slab.',
      open: 'An open roll frame with no glass at all, just a seat and levers.',
    }),
    marking: choice('What is lettered on the engine cover?', {
      council: 'COUNTY WASTE in stencil.', number: 'A fleet number.', bertha: 'A hand-painted name, BERTHA.',
      clear: 'KEEP CLEAR.', none: 'Nothing at all.',
    }),
    beacon: noul('Is there a flashing amber beacon on the roof?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [bodyHex, trimHex] = PAINT[a.livery];
    const grime = new THREE.Color('#5b4a36');
    const body = s.material(new THREE.Color(bodyHex).lerp(grime, mood.wear * 0.35), { roughness: 0.55 });
    const trim = s.material(trimHex, { roughness: 0.7 });
    const dark = s.material('#26282a', { roughness: 0.8 });
    const steel = s.material(new THREE.Color('#9a9c9b').lerp(new THREE.Color('#7a4a30'), mood.wear * 0.6), { metalness: 0.6, roughness: 0.45 });
    const chrome = s.material('#d6dadc', { metalness: 0.9, roughness: 0.2 });
    const glass = s.material('#33454d', { roughness: 0.15, metalness: 0.3 });
    const junkColour = () => new THREE.Color(JUNK[Math.floor(random() * JUNK.length)]).lerp(grime, mix(0.05, 0.5, mood.wear) * random()).lerp(new THREE.Color('#8a8a84'), (1 - mood.cheer) * 0.35);
    const working = a.state === 'pushing' || a.state === 'travelling';

    // Chassis, engine cover, counterweight and radiator.
    s.box([1.3, 0.75, 5.9], [0, 1.0, -0.3], dark);
    s.box([1.7, 1.25, 3.1], [0, 1.95, -2.0], body);
    s.box([1.5, 0.22, 2.8], [0, 2.66, -2.0], body);
    s.box([2.1, 0.7, 0.45], [0, 1.15, -3.65], trim);
    s.box([1.4, 1.0, 0.08], [0, 2.0, -3.56], dark);
    for (let i = 0; i < 7; i++) s.box([1.3, 0.04, 0.04], [0, 1.6 + i * 0.13, -3.61], steel);
    for (const x of [-1, 1]) for (let i = 0; i < 5; i++) s.box([0.03, 0.5, 0.06], [x * 0.86, 2.1, -2.9 + i * 0.22], dark);
    s.box([1.35, 0.95, 1.7], [0, 1.4, 1.5], body);
    s.cylinder(0.32, 0.32, 1.5, [0, 1.2, 0.35], steel, 14);
    // Steps and handrail on the left.
    for (let i = 0; i < 3; i++) s.box([0.5, 0.05, 0.3], [-1.0, 0.75 + i * 0.5, 0.05 - i * 0.12], steel);
    s.tube([[-1.15, 0.8, 0.3], [-1.2, 2.6, 0.25], [-0.95, 3.0, 0.2]], 0.025, chrome);

    // Exhaust stack, air pre-cleaner.
    s.cylinder(0.11, 0.13, 0.5, [0.5, 2.95, -2.6], dark, 12);
    s.cylinder(0.06, 0.06, 1.3, [0.5, 3.6, -2.6], chrome, 10);
    s.box([0.16, 0.02, 0.16], [0.5, 4.28, -2.55], dark).rotation.x = working ? -0.9 : 0;
    s.cylinder(0.05, 0.05, 0.5, [-0.5, 3.0, -2.6], dark, 10);
    s.cylinder(0.16, 0.12, 0.2, [-0.5, 3.3, -2.6], trim, 12);

    // Cab.
    const cy = 2.35, ch = 1.5;
    s.box([1.6, 0.25, 1.6], [0, cy, -0.2], body);
    for (const x of [-0.75, 0.75]) for (const z of [-0.95, 0.55]) s.box([0.1, ch, 0.1], [x, cy + ch / 2, z], a.cab === 'open' ? trim : body);
    s.box([1.9, 0.14, 1.95], [0, cy + ch + 0.05, -0.2], a.livery === 'green' ? trim : body);
    s.box([0.5, 0.5, 0.5], [0, cy + 0.35, -0.45], dark);
    s.box([0.5, 0.7, 0.12], [0, cy + 0.8, -0.72], dark);
    s.rod([0, cy + 0.1, 0.2], [0, cy + 0.75, 0.05], 0.025, dark);
    s.ring(0.17, 0.02, [0, cy + 0.78, 0.04], dark).rotation.x = -0.9;
    if (a.cab !== 'open') {
      s.box([1.42, ch - 0.25, 0.04], [0, cy + ch / 2 + 0.1, 0.55], glass);
      s.box([1.42, ch - 0.25, 0.04], [0, cy + ch / 2 + 0.1, -0.95], glass);
      s.box([0.04, ch - 0.25, 1.42], [0.75, cy + ch / 2 + 0.1, -0.2], glass);
      const door = s.box([0.04, ch - 0.25, 1.42], [0, 0, 0.71], glass);
      const hinge = new THREE.Group();
      hinge.position.set(-0.75, cy + ch / 2 + 0.1, -0.91);
      hinge.add(door);
      hinge.rotation.y = a.state === 'parked' ? -0.75 - random() * 0.4 : 0;
      s.root.add(hinge);
    }
    if (a.cab === 'caged') {
      for (let i = 0; i < 6; i++) {
        const t = -0.6 + i * 0.24;
        s.rod([t, cy + 0.2, 0.62], [t, cy + ch, 0.62], 0.022, steel);
        s.rod([0.83, cy + 0.2, -0.2 + t], [0.83, cy + ch, -0.2 + t], 0.022, steel);
        s.rod([t, cy + 0.2, -1.02], [t, cy + ch, -1.02], 0.022, steel);
      }
      for (const y of [0.55, 1.0]) {
        s.rod([-0.75, cy + y, 0.62], [0.75, cy + y, 0.62], 0.022, steel);
        s.rod([0.83, cy + y, -0.95], [0.83, cy + y, 0.55], 0.022, steel);
      }
    }
    for (const x of [-0.6, 0.6]) s.box([0.22, 0.14, 0.1], [x, cy + ch + 0.19, 0.7], s.material('#f4f0d0', { emissive: '#fff2b0', emissiveIntensity: working ? mix(0.2, 1.2, 1 - Math.abs(mood.daylight - 0.5) * 2 < 0.4 ? 1 : 0.3) : 0.05 }));
    let beacon: THREE.MeshStandardMaterial | null = null;
    if (a.beacon) {
      beacon = s.material('#ff9a1c', { emissive: '#ff8a00', emissiveIntensity: 1.2 });
      s.cylinder(0.09, 0.09, 0.05, [0.6, cy + ch + 0.15, -0.8], dark, 12);
      s.cylinder(0.07, 0.08, 0.16, [0.6, cy + ch + 0.25, -0.8], beacon, 12);
    }
    const text = NAMES[a.marking];
    if (text) for (const side of [-1, 1]) {
      const label = s.label(text, text.length > 6 ? 2.2 : 1.3, 0.5, [side * 0.86, 1.75, -1.9], a.marking === 'bertha' ? '#f4efe0' : trimHex === '#e6dcc0' ? '#e6dcc0' : '#1d1d1c', bodyHex);
      label.rotation.y = side * Math.PI / 2;
    }

    // Four spiked drums.
    const R = 0.95, W = 1.0;
    const wheels: THREE.Group[] = [];
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    const add = <T extends THREE.Object3D>(group: THREE.Object3D, object: T) => { group.add(object); return object; };
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      const wheel = new THREE.Group();
      wheel.position.set(x * 1.25, R, z * 1.6);
      add(wheel, s.cylinder(R, R, W, [0, 0, 0], steel, 28)).rotation.z = Math.PI / 2;
      add(wheel, s.cylinder(R * 0.55, R * 0.55, W + 0.06, [0, 0, 0], body, 16)).rotation.z = Math.PI / 2;
      add(wheel, s.cylinder(0.2, 0.2, W + 0.16, [0, 0, 0], dark, 10)).rotation.z = Math.PI / 2;
      const rows = 4, around = 12;
      const cleats = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.24, 4), steel, rows * around);
      for (let r = 0; r < rows; r++) for (let k = 0; k < around; k++) {
        const angle = (k + (r % 2) * 0.5) / around * Math.PI * 2;
        const out = new THREE.Vector3(0, Math.cos(angle), Math.sin(angle));
        q.setFromUnitVectors(up, out);
        matrix.compose(out.clone().multiplyScalar(R + 0.1).setX((r - (rows - 1) / 2) * 0.25), q, new THREE.Vector3(1, 1, 1));
        cleats.setMatrixAt(r * around + k, matrix);
      }
      cleats.castShadow = true;
      wheel.add(cleats);
      // Whatever the tip has given back.
      const amount = mix(0.4, 1, mood.density);
      if (a.caught === 'bags') for (let i = 0; i < Math.round(9 * amount); i++) {
        const angle = random() * Math.PI * 2, r = R + 0.14 + random() * 0.12;
        const bag = add(wheel, s.ball([0.1 + random() * 0.14, 0.03 + random() * 0.05, 0.16 + random() * 0.2], [(random() - 0.5) * W, Math.cos(angle) * r, Math.sin(angle) * r], s.material(['#f4f2ea', '#5aa0d8', '#e89ab8', '#f2d24a', '#f4f2ea'][Math.floor(random() * 5)], { roughness: 0.4 }), 7));
        bag.rotation.set(angle + random(), random() * 3, random());
      }
      if (a.caught === 'wire') for (let i = 0; i < Math.round(4 * amount) + 1; i++) {
        const loop = add(wheel, s.ring(R + 0.12 + random() * 0.08, 0.018, [(random() - 0.5) * W * 0.8, 0, 0], s.material(random() < 0.5 ? '#7a4526' : '#2b2b2b', { metalness: 0.5 })));
        loop.rotation.set(random() * 0.25, Math.PI / 2 + (random() - 0.5) * 0.3, 0);
      }
      if (a.caught === 'cloth') for (let i = 0; i < Math.round(3 * amount) + 1; i++) {
        const band = add(wheel, new THREE.Mesh(new THREE.TorusGeometry(R + 0.13, 0.03, 5, 40, Math.PI * (0.8 + random() * 1.1)), s.material(['#b23a3a', '#e9e2cf', '#3d5f8f', '#d9a441', '#6b8f5a'][Math.floor(random() * 5)], { roughness: 0.95 })));
        band.castShadow = true;
        band.scale.z = 5 + random() * 4;
        band.position.x = (random() - 0.5) * W * 0.7;
        band.rotation.set(0, Math.PI / 2, random() * 6.28);
      }
      if (a.caught === 'teddy' && x === 1 && z === 1) {
        const fur = s.material('#b98a52', { roughness: 1 });
        const bear = new THREE.Group();
        add(bear, s.ball([0.17, 0.2, 0.15], [0, 0.2, 0], fur, 10));
        add(bear, s.ball([0.14, 0.14, 0.14], [0, 0.48, 0], fur, 10));
        for (const e of [-1, 1]) {
          add(bear, s.ball([0.06, 0.06, 0.04], [e * 0.11, 0.6, 0], fur, 8));
          add(bear, s.ball([0.06, 0.13, 0.06], [e * 0.2, 0.26, 0.04], fur, 8)).rotation.z = e * 0.9;
          add(bear, s.ball([0.07, 0.13, 0.07], [e * 0.1, 0.02, 0.08], fur, 8));
        }
        add(bear, s.ball([0.05, 0.04, 0.05], [0, 0.45, 0.12], s.material('#e6d3ac'), 8));
        bear.scale.setScalar(2.3);
        bear.position.set(0.35, R + 0.12, 0);
        bear.rotation.set(0.4, Math.PI / 2, 0);
        const arm = new THREE.Group();
        arm.rotation.x = 0.35;
        arm.add(bear);
        wheel.add(arm);
      }
      wheel.rotation.x = a.caught === 'teddy' && x === 1 && z === 1 ? 0 : random() * 6.28;
      s.root.add(wheel);
      wheels.push(wheel);
      // Scraper bar that keeps the drum from clogging.
      s.box([W, 0.08, 0.1], [x * 1.25, R + 0.35, z * 1.6 - Math.sign(z) * (R + 0.22)], dark);
    }

    // Blade on lift arms.
    const lift = a.state === 'travelling' ? 1.0 : a.state === 'pushing' ? 0.12 : 0;
    const bw = 4.3, bh = a.blade === 'bare' ? 1.05 : 1.3, bz = 3.25;
    const profile = new THREE.Shape([[-0.12, 0], [0.34, 0], [0.12, 0.2], [0.02, bh * 0.5], [0.1, bh * 0.85], [0.3, bh], [-0.12, bh]].map(([px, py]) => new THREE.Vector2(px, py)));
    const bladeGeometry = new THREE.ExtrudeGeometry(profile, { depth: bw, bevelEnabled: false });
    bladeGeometry.rotateY(-Math.PI / 2).translate(bw / 2, 0, 0);
    s.mesh(bladeGeometry, body, [0, lift, bz]);
    s.box([bw + 0.04, 0.12, 0.08], [0, lift + 0.06, bz + 0.33], steel);
    for (const x of [-1, 1]) {
      s.box([0.08, bh, 0.5], [x * (bw / 2 + 0.04), lift + bh / 2, bz + 0.1], trim);
      s.rod([x * 0.78, 1.25, 1.9], [x * 0.78, lift + 0.55, bz - 0.12], 0.11, trim);
      s.rod([x * 0.5, 1.75, 1.7], [x * 0.5, lift + 0.95, bz - 0.12], 0.05, chrome);
      if (a.blade === 'wings') {
        const wing = s.box([0.1, bh, 0.9], [x * (bw / 2 + 0.2), lift + bh / 2, bz + 0.5], body);
        wing.rotation.y = x * 0.5;
      }
    }
    if (a.blade !== 'bare') {
      const top = lift + bh, rack = a.blade === 'rack' ? 0.85 : 0.45;
      for (let i = 0; i <= 14; i++) s.box([0.05, rack, 0.05], [-bw / 2 + 0.1 + i * (bw - 0.2) / 14, top + rack / 2, bz - 0.06], trim);
      s.box([bw, 0.07, 0.07], [0, top + rack, bz - 0.06], trim);
    }

    // The load, and the ground it works on.
    const heap = (count: number, place: (i: number) => [number, number, number], size: number) => {
      const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), count);
      const e = new THREE.Euler(), sc = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const p = place(i);
        e.set(random() * 3, random() * 3, random() * 3);
        sc.set(mix(0.4, 1.2, random()), mix(0.3, 0.8, random()), mix(0.4, 1.2, random())).multiplyScalar(size);
        matrix.compose(new THREE.Vector3(...p), q.setFromEuler(e), sc);
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, junkColour());
      }
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    };
    if (a.state === 'pushing') {
      const n = Math.round(mix(40, 110, mood.density));
      heap(n, () => {
        const u = random(), x = (random() - 0.5) * (bw + 0.6), z = bz + 0.35 + u * 1.7;
        return [x, random() * (1 - u) * mix(0.7, 1.25, mood.density) * (1 - Math.abs(x) / bw * 0.6), z];
      }, 0.6);
    }
    if (a.state === 'bogged') {
      heap(Math.round(mix(90, 170, mood.density)), () => {
        const z = (random() - 0.5) * 6.5, x = -1.3 + (random() - 0.5) * 2.6;
        return [x, random() * 0.9 * (1 - Math.abs(x + 1.3) / 1.6), z];
      }, 0.85);
    }

    // Diesel smoke, as much as the day's energy allows.
    const puffs: { mesh: THREE.Mesh; phase: number; material: THREE.MeshStandardMaterial }[] = [];
    const smokeCount = working ? Math.round(mix(2, 7, mood.energy)) : a.state === 'bogged' ? Math.round(mix(1, 5, mood.energy)) : 0;
    for (let i = 0; i < smokeCount; i++) {
      const material = new THREE.MeshStandardMaterial({ color: a.state === 'bogged' ? '#2e2c2a' : '#55524e', transparent: true, opacity: 0.3, depthWrite: false, roughness: 1 });
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), material);
      s.root.add(mesh);
      puffs.push({ mesh, phase: i / smokeCount + random() * 0.1, material });
    }
    const drift = (random() - 0.5) * 1.2;
    const smoke = (time: number) => {
      for (const p of puffs) {
        const t = (time * mix(0.15, 0.5, mood.energy) + p.phase) % 1;
        p.mesh.position.set(0.5 + t * t * drift, 4.3 + t * mix(1.4, 2.6, mood.energy), -2.6 - t * t * 1.4);
        p.mesh.scale.setScalar(0.6 + t * 2.4);
        p.material.opacity = (1 - t) * mix(0.25, 0.6, mood.energy);
      }
    };
    smoke(0.37);

    // Tilt the whole machine when it has sunk in.
    if (a.state === 'bogged') {
      const rig = new THREE.Group();
      for (const child of [...s.root.children]) if (!(child as THREE.InstancedMesh).isInstancedMesh || (child as THREE.Mesh).material === steel) rig.add(child);
      rig.rotation.set(0.05, 0, 0.16 + random() * 0.06);
      rig.position.set(-0.2, -0.3, 0);
      s.root.add(rig);
    }

    const spin = a.state === 'pushing' ? mix(0.25, 1.1, mood.energy) : a.state === 'travelling' ? -mix(0.5, 1.8, mood.energy) : 0;
    return s.finish({
      update: (dt, time) => {
        for (const wheel of wheels) wheel.rotation.x += dt * spin;
        smoke(time);
        if (beacon) beacon.emissiveIntensity = 0.4 + 1.6 * Math.max(0, Math.sin(time * 6));
      },
    });
  },
});
