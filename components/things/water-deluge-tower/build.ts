import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { Batch } from './batch';

type P = [number, number, number];

export default defineThing({
  questions: {
    state: choice('What is the tower doing?', {
      full: 'Full and waiting, valves shut, a little condensation on the tank.',
      dumping: 'Dumping: a torrent roaring out of every pipe, spray clouds and a spreading flood.',
      empty: 'Empty for years, rust streaks down the tank and an open hatch.',
      leaking: 'Leaking from a patched seam, a thin stream and a wide puddle beneath.',
      frozen: 'Frozen on a cold morning, icicles hanging from the pipes and catwalk.',
    }),
    tank: choice('What shape is the tank?', {
      drum: 'A broad drum with a shallow cone roof and a funnel base.',
      sphere: 'A full sphere, like a golf ball on a tee.',
      spheroid: 'A flattened ellipsoid, wide and low.',
      twin: 'Two slimmer upright cylinders side by side.',
    }),
    pipes: choice('How many outlet pipes run toward the pad?', {
      one: 'One enormous main.',
      two: 'A pair of fat pipes.',
      four: 'A fan of four spreading out.',
    }),
    outlets: choice('How do the pipes end?', {
      rainbirds: 'Upturned mushroom nozzles as tall as a person, called rainbirds.',
      mouths: 'Open pipe mouths raised on stands and angled at the pad.',
      bar: 'A long horizontal spray bar with a row of jets.',
    }),
    paint: choice('How is it painted?', {
      white: 'Plain white, lattice and all.',
      checker: 'Red and white aviation checker on the tank.',
      blue: 'Pale blue tank on a galvanised grey lattice.',
      redleg: 'White tank on a red lattice, matching the launch tower.',
    }),
    stencil: choice('What is stencilled on the tank?', {
      water: 'WATER', sound: 'SOUND SUPPRESSION', number: 'A pad number such as 39B', gallons: '300,000 GAL', condemned: 'CONDEMNED', none: 'Nothing.',
    }),
    height: score('How tall is the tower?', ['Barely above the pad', 'Tall', 'Very tall, for the head of pressure']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const b = new Batch();
    const wear = a.state === 'empty' ? Math.max(mood.wear, 0.6) : mood.wear;
    const rust = new THREE.Color('#84441f');
    const paint = (hex: string, chance = 1) => {
      const c = new THREE.Color(hex);
      if (random() < wear * 0.8 * chance) c.lerp(rust, mix(0.2, 0.9, random()) * wear);
      else c.offsetHSL(0, 0, (random() - 0.5) * 0.04);
      return c;
    };
    const tankHex = a.paint === 'blue' ? '#bcd6e4' : '#f2f2ee';
    const legHex = { white: '#e9e9e3', checker: '#e9e9e3', blue: '#a2a9ab', redleg: '#c9311f' }[a.paint];
    const H = Math.round(mix(34, 78, a.height));
    const R = a.tank === 'spheroid' ? 13 : a.tank === 'sphere' ? 10.5 : a.tank === 'twin' ? 5.4 : 9.5;
    const TH = a.tank === 'twin' ? 20 : a.tank === 'drum' ? 12 : a.tank === 'sphere' ? R * 2 : 11;
    const baseW = 20, topW = a.tank === 'twin' ? 13 : 12;

    // Lattice with a caged ladder and concrete feet.
    b.lattice(baseW, 1, H, Math.max(4, Math.round(H / 9)), 0.5, () => paint(legHex), () => random() < Math.max(0, wear - 0.5) * 0.4, topW);
    for (const x of [-1, 1]) for (const z of [-1, 1]) b.box([3, 1.2, 3], [x * baseW / 2, 0.6, z * baseW / 2], '#aeaba0');
    b.box([topW + 3, 0.6, topW + 3], [0, H + 0.3, 0], paint(legHex));
    b.rod([-baseW / 2 - 0.4, 1, 0], [-topW / 2 - 0.4, H, 0], 0.55, paint('#8f9596', 0.6), 0.55, 6);

    // Tank.
    const tankY = H + 0.6;
    const tankMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(tankHex).lerp(rust, wear * 0.12), roughness: 0.55, metalness: 0.05 });
    const centres: P[] = a.tank === 'twin' ? [[-R - 0.5, 0, 0], [R + 0.5, 0, 0]] : [[0, 0, 0]];
    let crown = tankY + TH;
    for (const [cx] of centres) {
      if (a.tank === 'drum' || a.tank === 'twin') {
        s.cylinder(R, R, TH, [cx, tankY + 3 + TH / 2, 0], tankMat, 32);
        s.cylinder(1.6, R, 3, [cx, tankY + 1.5, 0], tankMat, 32).rotation.x = Math.PI;
        s.cylinder(0.6, R, a.tank === 'twin' ? 3.4 : 2.6, [cx, tankY + 3 + TH + (a.tank === 'twin' ? 1.7 : 1.3), 0], tankMat, 32);
        crown = tankY + 3 + TH + 3;
      } else {
        const squash = a.tank === 'spheroid' ? 0.52 : 1;
        s.ball([R, R * squash, R], [cx, tankY + 2 + R * squash, 0], tankMat, 32);
        b.cyl(R * 0.55, 2, 3.2, [cx, tankY + 1.6, 0], paint(tankHex), 16);
        crown = tankY + 2 + R * squash * 2;
      }
    }
    const midY = a.tank === 'drum' || a.tank === 'twin' ? tankY + 3 + TH / 2 : tankY + 2 + R * (a.tank === 'spheroid' ? 0.52 : 1);
    const surface = (y: number) => (a.tank === 'drum' || a.tank === 'twin' ? R : Math.sqrt(Math.max(0.01, 1 - ((y - midY) / (R * (a.tank === 'spheroid' ? 0.52 : 1))) ** 2)) * R);
    // Checker panels, rust streaks, patches.
    const round = a.tank === 'sphere' || a.tank === 'spheroid';
    const squashY = a.tank === 'spheroid' ? 0.52 : 1;
    const patch = (cx: number, phi: number, phiLength: number, theta: number, thetaLength: number, material: THREE.Material) => {
      const skin = s.mesh(new THREE.SphereGeometry(R + 0.07, 12, 6, phi, phiLength, theta, thetaLength), material, [cx, midY, 0]);
      skin.scale.y = squashY;
      skin.castShadow = false;
      return skin;
    };
    const red = s.material('#cf2f22', { roughness: 0.6 });
    if (a.paint === 'checker') for (const [cx] of centres) for (let row = 0; row < 2; row++) for (let k = 0; k < 12; k++) if ((k + row) % 2 === 0) {
      if (round) { patch(cx, (k / 12) * Math.PI * 2, Math.PI / 6, Math.PI / 2 - 0.42 + row * 0.42, 0.42, red); continue; }
      const y = midY + (row - 0.5) * TH * 0.3, r = R + 0.06, t = (k / 12) * Math.PI * 2;
      b.box([r * 0.53, TH * 0.3, 0.2], [cx + Math.sin(t) * r, y, Math.cos(t) * r], paint('#cf2f22'), [0, t, 0]);
    }
    const streaks = Math.round(wear * 22) + (a.state === 'empty' ? 10 : 0);
    const stain = s.material(rust.clone().lerp(new THREE.Color('#3c2416'), 0.25), { roughness: 0.9 });
    for (const [cx] of centres) for (let i = 0; i < streaks; i++) {
      const t = random() * Math.PI * 2;
      if (round) { patch(cx, t, 0.05 + random() * 0.09, 0.5 + random() * 0.9, 0.25 + random() * 0.7, stain); continue; }
      const long = mix(2, TH * 0.55, random()), y = midY + mix(-0.1, 0.35, random()) * TH - long / 2;
      b.box([0.35 + random() * 0.6, long, 0.14], [cx + Math.sin(t) * (R + 0.05), y, Math.cos(t) * (R + 0.05)], rust.clone().lerp(new THREE.Color('#3c2416'), random() * 0.5), [0, t, 0]);
    }
    // Catwalk ring with rail, roof hatch and beacon.
    const ringR = (a.tank === 'twin' ? R * 2 + 0.5 : R * (a.tank === 'drum' ? 1 : 0.62)) + 1.4;
    const ringY = a.tank === 'drum' || a.tank === 'twin' ? tankY + 3 : tankY + 1.2;
    for (let k = 0; k < 28; k++) {
      const t0 = (k / 28) * Math.PI * 2, t1 = ((k + 1) / 28) * Math.PI * 2;
      const p0: P = [Math.sin(t0) * ringR, ringY, Math.cos(t0) * ringR], p1: P = [Math.sin(t1) * ringR, ringY, Math.cos(t1) * ringR];
      b.rod(p0, p1, 0.3, paint('#4a4f52', 0.5), 0.3, 4);
      b.rod([p0[0], ringY + 1.4, p0[2]], [p1[0], ringY + 1.4, p1[2]], 0.1, '#e5bd27', 0.1, 4);
      b.rod(p0, [p0[0], ringY + 1.4, p0[2]], 0.08, '#e5bd27', 0.08, 4);
      if (a.state === 'frozen' && random() < 0.8) b.rod([p0[0], ringY - 0.2, p0[2]], [p0[0], ringY - 1 - random() * 3.5, p0[2]], 0.2, '#e4f3fa', 0.02, 5);
    }
    b.cyl(1.1, 1.1, 0.5, [centres[0][0] + 2, crown - 0.9, 0], '#55595a', 10);
    if (a.state === 'empty') b.cyl(1.1, 1.1, 0.15, [centres[0][0] + 2.9, crown - 0.1, 0], '#55595a', 10, [0, 0, 1.1]);
    const beacon = s.ball([0.7, 0.7, 0.7], [centres[0][0], crown + 0.5, 0], s.material('#ff3524', { emissive: '#ff2a18', emissiveIntensity: a.state === 'empty' ? 0 : 1.4 }), 8);

    // Outlet pipes: a riser, a valve house, then a fan of mains toward +z.
    const pipeMat = s.material(new THREE.Color('#f0f0ea').lerp(rust, wear * 0.3), { roughness: 0.5, metalness: 0.1 });
    const n = { one: 1, two: 2, four: 4 }[a.pipes];
    const PR = { one: 2.3, two: 1.7, four: 1.25 }[a.pipes];
    const reach = 40;
    for (const [cx] of centres) s.tube([[cx, tankY + 1, 0], [cx, tankY - 6, 0], [cx * 0.3, H * 0.45, 0], [0, 12, 0]], PR * 1.05, pipeMat);
    b.box([8, 7, 7], [0, 9.5, 0], paint('#d8d8d0', 0.6));
    b.box([8.6, 0.6, 7.6], [0, 13.2, 0], paint('#7f8482', 0.6));
    const tips: { at: THREE.Vector3; dir: THREE.Vector3 }[] = [];
    for (let i = 0; i < n; i++) {
      const spread = n === 1 ? 0 : (i / (n - 1) - 0.5) * (n === 2 ? 12 : 26);
      const raised = a.outlets === 'mouths';
      const endY = raised ? 9 : 2.4;
      const path: P[] = [[spread * 0.2, 9, 3], [spread * 0.5, 4.5, 11], [spread * 0.9, 2.4, 19], [spread, 2.4, reach - (raised ? 8 : 2)]];
      if (raised) path.push([spread, 5, reach - 4], [spread, endY, reach]);
      s.tube(path, PR, pipeMat);
      for (const z of [13, 22]) {
        b.cyl(PR + 0.45, PR + 0.45, 0.6, [spread * (z === 13 ? 0.6 : 0.95), z === 13 ? 3.9 : 2.4, z], paint('#8f9596', 0.7), 12, [Math.PI / 2, 0, 0]);
        b.box([PR * 2 + 1.6, 1.2, 1.4], [spread * (z === 13 ? 0.6 : 0.95), 0.6, z + 1.2], '#aeaba0');
      }
      const wheel = s.ring(1, 0.16, [spread * 0.55, 6.6 + PR, 12], s.material('#c9311f'));
      wheel.rotation.x = Math.PI / 2;
      b.rod([spread * 0.55, 4.2, 12], [spread * 0.55, 6.6 + PR, 12], 0.14, '#55595a', 0.14, 5);
      if (a.outlets === 'rainbirds') {
        b.cyl(PR * 0.8, PR, 4.6, [spread, 4.2, reach - 1.2], paint('#f0f0ea', 0.5), 12);
        b.cyl(PR * 1.7, PR * 0.8, 1.3, [spread, 7.1, reach - 1.2], paint('#c9311f', 0.5), 14);
        b.cyl(PR * 1.5, PR * 1.7, 0.4, [spread, 7.9, reach - 1.2], '#55595a', 14);
        tips.push({ at: new THREE.Vector3(spread, 8, reach - 1.2), dir: new THREE.Vector3(spread * 0.02, 0.9, 0.7) });
      } else if (a.outlets === 'mouths') {
        b.box([PR * 2 + 1, 5, 1], [spread, 2.5, reach - 5], '#8f9596');
        b.cyl(PR + 0.4, PR + 0.4, 0.7, [spread, endY, reach], paint('#c9311f', 0.5), 12, [Math.PI / 2.6, 0, 0]);
        tips.push({ at: new THREE.Vector3(spread, endY, reach + 0.4), dir: new THREE.Vector3(spread * 0.01, 0.55, 1) });
      } else tips.push({ at: new THREE.Vector3(spread, 2.4, reach - 2), dir: new THREE.Vector3(0, 0, 0) });
      if (a.state === 'frozen') for (let k = 0; k < 9; k++) { const z = 6 + random() * (reach - 8); const t = z / reach; b.rod([spread * t, mix(8, 2, Math.min(1, t * 1.6)), z], [spread * t, mix(8, 2, Math.min(1, t * 1.6)) - 1 - random() * 2.5, z], 0.25, '#e4f3fa', 0.02, 5); }
    }
    let jets: THREE.Vector3[] = [];
    if (a.outlets === 'bar') {
      const span = (n === 1 ? 14 : n === 2 ? 22 : 34);
      b.rod([-span / 2, 5.5, reach], [span / 2, 5.5, reach], PR * 0.75, paint('#f0f0ea', 0.5), PR * 0.75, 10);
      for (const tip of tips) b.rod([tip.at.x, 2.4, reach - 2], [tip.at.x, 5.5, reach], PR * 0.8, paint('#f0f0ea', 0.5), PR * 0.8, 8);
      for (const x of [-span / 2 + 1, span / 2 - 1]) b.box([1, 5.5, 1], [x, 2.75, reach], '#8f9596');
      for (let j = 0; j < Math.round(span / 2.4); j++) { const x = -span / 2 + 1.2 + j * 2.4; b.cyl(0.3, 0.5, 1.1, [x, 6, reach + 0.6], '#c9311f', 6, [0.9, 0, 0]); jets.push(new THREE.Vector3(x, 6.4, reach + 1)); }
    }

    // Water.
    const flows: THREE.Mesh[] = [];
    if (a.state === 'dumping') {
      const water = new THREE.MeshStandardMaterial({ color: '#d9eef8', transparent: true, opacity: 0.78, depthWrite: false, roughness: 0.2, emissive: '#bfe3f5', emissiveIntensity: 0.25 });
      const spray = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.42, depthWrite: false, roughness: 1 });
      const arcs = a.outlets === 'bar' ? jets.map((at) => ({ at, dir: new THREE.Vector3(0, 0.7, 1), r: 0.55, far: 16 })) : tips.map((tip) => ({ at: tip.at, dir: tip.dir, r: PR * 0.9, far: a.outlets === 'rainbirds' ? 15 : 24 }));
      for (const arc of arcs) {
        const d = arc.dir.clone().normalize();
        const points: P[] = [];
        for (let k = 0; k <= 6; k++) { const t = k / 6; points.push([arc.at.x + d.x * arc.far * t, Math.max(0.3, arc.at.y + d.y * arc.far * t * 1.1 - (arc.at.y + d.y * arc.far * 1.1) * t * t), arc.at.z + d.z * arc.far * t]); }
        const stream = s.tube(points, arc.r, water);
        stream.castShadow = false;
        flows.push(stream);
        const end = points[6];
        for (let p = 0; p < (a.outlets === 'bar' ? 1 : 3); p++) { const puff = s.ball([arc.r * 3 + p * 1.5, arc.r * 2 + p, arc.r * 3 + p * 1.5], [end[0] + (random() - 0.5) * 3, 1.5 + p * 1.6, end[2] + (random() - 0.5) * 3], spray, 10); puff.castShadow = false; flows.push(puff); }
      }
      const pool = s.cylinder(1, 1, 0.12, [0, 0.07, reach + 16], s.material('#9cc6da', { roughness: 0.1, metalness: 0.2 }), 28);
      pool.scale.set(n === 1 && a.outlets !== 'bar' ? 13 : 24, 1, 15);
    } else if (a.state === 'leaking') {
      const water = new THREE.MeshStandardMaterial({ color: '#d9eef8', transparent: true, opacity: 0.75, depthWrite: false, roughness: 0.2 });
      const lx = centres[0][0] + surface(midY) * 0.7, lz = surface(midY) * 0.72;
      b.box([2.6, 2.2, 0.25], [lx, midY - 2, lz], '#8f9596', [0, 0.78, 0]);
      const drip = s.tube([[lx, midY - 3, lz + 0.2], [lx + 0.4, H * 0.6, lz + 1], [lx + 1, 0.3, lz + 2.5]], 0.35, water);
      drip.castShadow = false;
      flows.push(drip);
      s.cylinder(1, 1, 0.1, [lx + 1, 0.06, lz + 2.5], s.material('#8fb5c6', { roughness: 0.1, metalness: 0.2 }), 22).scale.set(9, 1, 7);
    } else if (a.state === 'empty') {
      for (let w = 0; w < 26; w++) { const x = (random() - 0.5) * 30, z = (random() - 0.5) * 26 + 6; b.rod([x, 0, z], [x + (random() - 0.5), 1 + random() * 2, z], 0.14, ['#8b9a52', '#a39b5a', '#6f8a45'][w % 3], 0.02, 4); }
    }
    s.root.add(b.mesh({ metalness: 0.1 }));

    // Stencil band wrapped round the front of the tank.
    const text = { water: 'WATER', sound: 'SOUND SUPPRESSION', number: `${1 + Math.floor(random() * 41)}${'AB'[Math.floor(random() * 2)]}`, gallons: '300,000 GAL', condemned: 'CONDEMNED', none: '' }[a.stencil];
    if (text) for (const [cx] of centres) {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#' + tankMat.color.getHexString();
      ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = a.stencil === 'condemned' ? '#b3261a' : '#1f2a33';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.min(96, (512 / text.length) * 1.5)}px monospace`;
      ctx.fillText(text, 256, 66, 490);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const arc = a.tank === 'twin' ? 2 : 1.7, lettering = new THREE.MeshStandardMaterial({ map, roughness: 0.6 });
      const band = round
        ? patch(cx, Math.PI / 2 - arc / 2 - 0.5, arc, Math.PI / 2 - arc / 8 - 0.1, arc / 4, lettering)
        : s.mesh(new THREE.CylinderGeometry(R + 0.09, R + 0.09, (R * arc) / 4, 24, 1, true, -arc / 2 + 0.5, arc), lettering, [cx, midY, 0]);
      band.castShadow = false;
      if (round) band.scale.setScalar(1.004), (band.scale.y = squashY * 1.004);
      if (a.stencil === 'condemned') band.rotation.z = 0.06;
    }

    const energy = mix(0.4, 1.8, mood.energy);
    return s.finish({
      footprint: baseW / 2 + 6,
      update: (_dt, time) => {
        (beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = a.state === 'empty' ? 0 : Math.sin(time * 2 * energy) > 0 ? 1.8 : 0.3;
        flows.forEach((flow, index) => { flow.scale.y = flow.userData.sy ?? (flow.userData.sy = flow.scale.y); flow.scale.y = flow.userData.sy * (1 + Math.sin(time * 6 * energy + index) * 0.05); });
      },
    });
  },
});
