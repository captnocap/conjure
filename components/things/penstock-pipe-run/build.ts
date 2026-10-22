import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { concrete, extrudeX, lampGlow } from './util';

const PAINTS = {
  'oxide-red': 'Rust-red oxide primer.',
  aluminium: 'Bright aluminium paint.',
  green: 'Forestry green, meant to hide it on the hillside.',
  white: 'Alpine white, to keep the steel cool.',
  tar: 'Black coal-tar enamel.',
} as const;
const PAINT: Record<keyof typeof PAINTS, string> = { 'oxide-red': '#a04a33', aluminium: '#c5cbcc', green: '#55795a', white: '#e9e8e0', tar: '#303336' };
const MARKS = { none: '', number: 'Nº 2', pressure: 'DANGER  HIGH PRESSURE', cyrillic: 'СЛАВА ТРУДУ', lovers: 'J + M  1974' } as const;

const SLOPE = 12 / 19, TILT = Math.atan(SLOPE);
const ground = (z: number) => (z < -10 ? 12 : z > 9 ? 0 : 12 - SLOPE * (z + 10));
const LINE: [number, number][] = [[-13.2, 13.6], [-11, 13.6], [-9.3, 13.05], [-2, 8.55], [4, 4.76], [8, 2.25], [9.8, 1.65], [12.6, 1.6]];

function pipeSkin(random: () => number, wear: number, mark: string, ink: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#bdbdbd'; ctx.fillRect(0, 0, 1024, 256);
  for (let x = 0; x < 1024; x += 64) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x, 0, 3, 256);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (let y = 4; y < 256; y += 10) { ctx.fillRect(x - 6, y, 3, 3); ctx.fillRect(x + 7, y, 3, 3); }
    const row = ((x / 64) % 2) * 64 + 40;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, row, 64, 2); ctx.fillRect(x, row + 128, 64, 2);
  }
  const streaks = Math.round(wear * 70);
  for (let i = 0; i < streaks; i++) {
    const x = Math.floor(random() * 16) * 64 + random() * 14, y = random() * 256;
    ctx.fillStyle = `rgba(110,60,30,${0.25 + random() * 0.35})`; ctx.fillRect(x, y, 4 + random() * 14, 20 + random() * 70);
  }
  if (mark) {
    ctx.fillStyle = ink; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) ctx.fillText(mark, i % 2 ? 610 : 350, 32 + i * 64, 400);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    pipes: choice('How many pipes come down the hill?', {
      single: 'One fat pipe.',
      twin: 'Twin pipes side by side.',
      'one-gone': 'Room for two, but one has been cut away: empty saddles and a blanked-off stub.',
    }),
    paint: choice('What colour is the steel painted?', PAINTS),
    leaks: score('Is it leaking?', ['Bone dry and tight', 'Weeping rust stains at the joints', 'A few thin jets hissing from the seals', 'Fans of water spraying across the slope']),
    hatches: noul('Are the inspection hatches open, with a ladder up to one?'),
    hillside: choice('What ground does it cross?', {
      grass: 'Rough mountain pasture.',
      scree: 'Bare grey rock and scree.',
      snow: 'Deep snow, the pipe wearing a white ridge.',
      forest: 'A swathe cut through dark conifers.',
    }),
    house: choice('What stands over the valves at the top?', {
      concrete: 'A flat-roofed concrete cube with a strip window.',
      alpine: 'A timber hut with a steep roof, like a mountain refuge.',
      tin: 'A corrugated iron shed.',
      open: 'Nothing: bare handwheels in the weather.',
    }),
    marks: choice('What is painted on the pipe?', {
      none: 'Nothing.',
      number: 'A big stencilled pipe number.',
      pressure: 'A high-pressure danger warning.',
      cyrillic: 'A Soviet slogan in Cyrillic.',
      lovers: 'Initials and a year, daubed by somebody who climbed up.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lanes = a.pipes === 'single' ? [0] : [-1.75, 1.75];
    const live = a.pipes === 'one-gone' ? [lanes[0]] : lanes;
    const stairX = lanes[lanes.length - 1] + 3.1;
    const left = lanes[0] - 3.6, right = stairX + 2.4, width = right - left, mid = (left + right) / 2;

    const groundTone = { grass: mood.cheer > 0.5 ? '#86a25a' : '#7d8c5c', scree: '#9c978c', snow: '#eef2f5', forest: '#66774c' }[a.hillside];
    const earth = s.material(groundTone, { roughness: 1 });
    s.mesh(extrudeX([[-13.6, -0.6], [-13.6, 12], [-10, 12], [9, 0], [13.2, 0], [13.2, -0.6]], width), earth, [mid, 0, 0]);
    const crete = concrete(random, mood.wear, '#bcb8aa', 5);
    const plainCrete = s.material('#bdb9ab', { roughness: 0.95 });
    const rust = new THREE.Color('#7a4a2c');
    const paint = new THREE.Color(PAINT[a.paint]).lerp(rust, mood.wear * 0.4);
    const ink = a.marks === 'lovers' ? '#d93a6a' : a.paint === 'white' || a.paint === 'aluminium' ? '#1d1f21' : '#f3efe2';
    const skin = new THREE.MeshStandardMaterial({ color: paint.clone().multiplyScalar(1.95), map: pipeSkin(random, mood.wear, MARKS[a.marks], a.paint === 'white' || a.paint === 'aluminium' ? (a.marks === 'lovers' ? '#b3204f' : '#333333') : (a.marks === 'lovers' ? '#ffd0dd' : '#ffffff')), metalness: a.paint === 'aluminium' ? 0.5 : 0.15, roughness: 0.55 });
    void ink;
    const collar = s.material(paint.clone().multiplyScalar(0.8), { metalness: 0.2 });
    const dark = s.material('#2b2f32', { metalness: 0.4, roughness: 0.55 });
    const water = new THREE.MeshStandardMaterial({ color: '#f1f7f9', roughness: 0.4 });
    const wet = new THREE.MeshStandardMaterial({ color: a.hillside === 'snow' ? '#a9c0cc' : '#4d5a52', roughness: 0.6 });
    const along = new THREE.Vector3(0, -Math.sin(TILT), Math.cos(TILT));
    const lie = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), along);

    const jets: THREE.Mesh[] = [];
    for (const x of lanes) {
      const alive = live.includes(x);
      // Saddles and anchor blocks stay even where the pipe has gone.
      for (const z of [-6.4, -2.6, 1.2, 5]) {
        const saddle = s.box([2.7, 1.9, 1.2], [x, ground(z) + 0.55, z], crete);
        saddle.rotation.x = TILT;
      }
      s.box([3.3, 3.4, 2.6], [x, 1.5, 9.9], crete);
      s.box([3.3, 3.2, 2.2], [x, 12.3, -9.6], crete);
      if (!alive) {
        const stub = s.cylinder(1.1, 1.1, 1.2, [x, 13.05, -8.3], s.material(rust, { roughness: 0.9 }), 20);
        stub.quaternion.copy(lie);
        const cap = s.cylinder(1.3, 1.3, 0.12, [x, 12.68, -7.72], dark, 20);
        cap.quaternion.copy(lie);
        for (const z of [-6.4, -2.6, 1.2, 5]) { const strap = s.box([0.12, 0.5, 0.5], [x + (random() - 0.5), ground(z) + 1.6, z], dark); strap.rotation.set(TILT, 0, random() - 0.5); }
        continue;
      }
      const path = new THREE.CatmullRomCurve3(LINE.map(([z, y]) => new THREE.Vector3(x, y, z)), false, 'catmullrom', 0.2);
      s.mesh(new THREE.TubeGeometry(path, 80, 1.1, 20, false), skin);
      if (a.hillside === 'snow') {
        const ridge = new THREE.CatmullRomCurve3(LINE.slice(1, 7).map(([z, y]) => new THREE.Vector3(x, y + 0.72, z)), false, 'catmullrom', 0.2);
        s.mesh(new THREE.TubeGeometry(ridge, 40, 0.55, 8, false), earth);
      }
      // Stiffener rings.
      const rings: THREE.Vector3[] = [];
      for (let z = -8.2; z < 7.8; z += 1.75) rings.push(new THREE.Vector3(x, ground(z) + 1.6, z));
      const hoops = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.17, 1.17, 0.14, 24, 1, true), collar, rings.length);
      (hoops.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      const matrix = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
      rings.forEach((at, index) => hoops.setMatrixAt(index, matrix.compose(at, lie, one)));
      hoops.castShadow = hoops.receiveShadow = true;
      s.root.add(hoops);
      // Expansion joints, and whatever escapes from them.
      for (const z of [-4.5, 3.1]) {
        const y = ground(z) + 1.6;
        const sleeve = s.cylinder(1.3, 1.3, 1, [x, y, z], dark, 24); sleeve.quaternion.copy(lie);
        for (const d of [-0.55, 0.55]) { const flange = s.cylinder(1.45, 1.45, 0.12, [x, y - along.y * -d, z + along.z * d], collar, 24); flange.quaternion.copy(lie); flange.position.set(x, y + along.y * d, z + along.z * d); }
        if (a.leaks > 0.2) {
          const stain = s.box([1.6, 0.03, 3 + a.leaks * 6], [x + 0.3, ground(z + 2.2) + 0.03, z + 2.2 + a.leaks * 2], wet); stain.rotation.x = TILT;
        }
        const count = a.leaks > 0.45 ? Math.round(mix(1, 4, (a.leaks - 0.45) / 0.55) + random()) : 0;
        for (let i = 0; i < count; i++) {
          const side = random() > 0.5 ? 1 : -1, reach = (1.5 + random() * 3) * (0.6 + a.leaks), rise = 0.6 + random() * 1.6;
          const from: [number, number, number] = [x + side * 0.95, y + 0.9, z + 0.5];
          const landZ = z + 0.5 + reach * 0.5, landX = Math.min(right - 0.5, Math.max(left + 0.5, x + side * (0.95 + reach)));
          const jet = s.tube([from, [mix(from[0], landX, 0.4), y + 0.9 + rise, mix(from[2], landZ, 0.4)], [mix(from[0], landX, 0.8), y + rise * 0.6, mix(from[2], landZ, 0.8)], [landX, ground(landZ) + 0.1, landZ]], 0.05 + a.leaks * 0.06, water);
          jets.push(jet);
          s.ball([0.5, 0.2, 0.5], [landX, ground(landZ) + 0.1, landZ], water, 8);
        }
      }
      // Inspection hatches.
      for (const z of [-0.7, 6.6]) {
        const y = ground(z) + 1.6;
        const neck = s.cylinder(0.42, 0.42, 0.3, [x, y + 1.15 * Math.cos(TILT), z + 1.15 * Math.sin(TILT)], collar, 16);
        neck.rotation.x = TILT;
        const lid = s.cylinder(0.46, 0.46, 0.06, [x, y + 1.33 * Math.cos(TILT), z + 1.33 * Math.sin(TILT)], dark, 16);
        lid.rotation.x = TILT;
        if (a.hatches) {
          lid.material = new THREE.MeshStandardMaterial({ color: '#0d0f10', roughness: 1 });
          const open = s.cylinder(0.46, 0.46, 0.06, [x - 0.62, y + 1.6 * Math.cos(TILT), z + 1.6 * Math.sin(TILT)], collar, 16);
          open.rotation.set(TILT, 0, 1.25);
        }
      }
      if (a.hatches) {
        const z = 6.6, top = ground(z) + 2.75, lx = x + 1.9;
        const yellow = s.material('#d8b22a');
        for (const dz of [-0.25, 0.25]) s.rod([lx, ground(z + 0.2), z + 0.9 + dz], [x + 0.75, top, z + 0.55 + dz], 0.04, yellow);
        for (let i = 1; i < 8; i++) { const t = i / 8; s.rod([mix(lx, x + 0.75, t), mix(ground(z + 0.2), top, t), z + 0.65 + mix(0.25, 0, t)], [mix(lx, x + 0.75, t), mix(ground(z + 0.2), top, t), z + 1.15 - mix(0, 0.35, t)], 0.025, yellow); }
      }
    }

    // Manifold wall at the foot.
    const span = lanes[lanes.length - 1] - lanes[0] + 4.4;
    s.box([span, 3.3, 0.9], [(lanes[0] + lanes[lanes.length - 1]) / 2, 1.5, 12.7], crete);

    // Valve house at the head.
    const cx = (lanes[0] + lanes[lanes.length - 1]) / 2, glow = lampGlow(mood.daylight);
    const pane = s.material('#26323a', { roughness: 0.3, emissive: '#ffd07a', emissiveIntensity: glow * 0.5 });
    if (a.house === 'open') {
      for (const x of live) {
        s.box([2.9, 1, 2.2], [x, 12.5, -12.2], crete);
        s.rod([x, 14.5, -12.2], [x, 16.6, -12.2], 0.09, dark);
        s.box([0.8, 0.9, 0.8], [x, 15, -12.2], collar);
        const wheel = s.ring(0.7, 0.06, [x, 16.6, -12.2], s.material('#b3312a')); wheel.rotation.x = Math.PI / 2;
        for (const turn of [0, Math.PI / 2]) { const spoke = s.box([1.4, 0.05, 0.05], [x, 16.6, -12.2], dark); spoke.rotation.y = turn; }
      }
    } else {
      const w = span + 0.6, wallTone = { concrete: '#c4c0b2', alpine: '#7a5a3c', tin: '#8d9a98' }[a.house];
      const wall = a.house === 'concrete' ? crete : s.material(wallTone, { roughness: 0.85, metalness: a.house === 'tin' ? 0.3 : 0 });
      s.box([w, 4.4, 3.2], [cx, 14.2, -12], wall);
      if (a.house === 'concrete') {
        s.box([w + 0.7, 0.3, 3.9], [cx, 16.55, -12], plainCrete);
        s.box([w * 0.7, 0.8, 0.08], [cx, 15.4, -10.38], pane);
      } else {
        const roofTone = a.hillside === 'snow' ? '#eef2f5' : a.house === 'alpine' ? '#4a4038' : new THREE.Color('#9aa7a5').lerp(rust, mood.wear * 0.7);
        const rise = a.house === 'alpine' ? 2.6 : 1.1;
        s.mesh(extrudeX([[-14, 16.4], [-12, 16.4 + rise], [-10, 16.4], [-10, 16.55], [-12, 16.7 + rise], [-14, 16.55]], w + 0.6), s.material(roofTone, { metalness: a.house === 'tin' ? 0.35 : 0 }), [cx, 0, 0]);
        s.mesh(extrudeX([[-13.6, 16.4], [-12, 16.4 + rise * 0.8], [-10.4, 16.4]], w - 0.02), wall, [cx, 0, 0]);
        for (const x of [-1, 1]) s.box([0.9, 1, 0.08], [cx + x * w * 0.28, 15, -10.38], pane);
        if (a.house === 'alpine') for (const x of [-1, 1]) for (const side of [-1, 1]) s.box([0.3, 1.1, 0.06], [cx + x * w * 0.28 + side * 0.62, 15, -10.36], s.material(mood.cheer > 0.5 ? '#b33a2c' : '#3f5a48'));
      }
      s.box([0.9, 2, 0.08], [cx + w / 2 - 0.9, 13, -10.38], dark);
      s.ball([0.14, 0.14, 0.14], [cx + w / 2 - 0.9, 14.35, -10.25], s.material('#fff1c0', { emissive: '#ffd27a', emissiveIntensity: glow }), 8);
    }

    // Service stair.
    const treads = Array.from({ length: 34 }, (_unused, index) => { const z = -9.6 + index * 0.55; return { at: [stairX, ground(z) + 0.18, z] as const, size: 1 }; });
    s.scatter(new THREE.BoxGeometry(1.1, 0.07, 0.36), plainCrete, treads);
    for (const side of [-1, 1]) {
      s.rod([stairX + side * 0.6, 12.1, -10], [stairX + side * 0.6, 0.1, 9], 0.06, dark);
      if (side > 0) {
        s.rod([stairX + 0.6, 13.1, -10], [stairX + 0.6, 1.1, 9], 0.035, dark);
        for (let z = -10; z <= 9; z += 2.375) s.rod([stairX + 0.6, ground(z) + 0.1, z], [stairX + 0.6, ground(z) + 1.1, z], 0.03, dark);
      }
    }

    // The hillside itself.
    const inLane = (x: number) => lanes.some((lane) => Math.abs(x - lane) < 1.9) || Math.abs(x - stairX) < 0.9;
    const spot = () => { for (let i = 0; i < 20; i++) { const x = mix(left + 0.3, right - 0.3, random()), z = -9.5 + random() * 21.5; if (!inLane(x)) return [x, ground(z), z] as const; } return [left + 0.5, ground(0), 0] as const; };
    const amount = mix(0.4, 1.3, mood.density);
    if (a.hillside === 'grass') {
      s.scatter(new THREE.ConeGeometry(0.16, 0.5, 5), new THREE.MeshStandardMaterial({ roughness: 1 }), Array.from({ length: Math.round(70 * amount) }, () => { const [x, y, z] = spot(); return { at: [x, y + 0.2, z] as const, size: 0.6 + random(), color: random() > 0.25 ? (random() > 0.5 ? '#6f8f47' : '#93a85f') : '#e9d85a' }; }));
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#a4a097', { roughness: 1 }), Array.from({ length: 6 }, () => { const [x, y, z] = spot(); return { at: [x, y + 0.1, z] as const, size: 0.25 + random() * 0.4 }; }));
    } else if (a.hillside === 'scree') {
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), Array.from({ length: Math.round(60 * amount) }, () => { const [x, y, z] = spot(); return { at: [x, y + 0.05, z] as const, size: 0.15 + random() * random() * 0.9, color: random() > 0.5 ? '#8a857b' : '#aaa59a' }; }));
    } else if (a.hillside === 'snow') {
      s.scatter(new THREE.SphereGeometry(1, 8, 6).scale(1, 0.4, 1), earth, Array.from({ length: Math.round(14 * amount) }, () => { const [x, y, z] = spot(); return { at: [x, y, z] as const, size: 0.5 + random() * 0.9 }; }));
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#6f706c', { roughness: 1 }), Array.from({ length: 5 }, () => { const [x, y, z] = spot(); return { at: [x, y + 0.15, z] as const, size: 0.3 + random() * 0.4 }; }));
    } else {
      const trees = Array.from({ length: Math.round(16 * amount) }, () => { const edge = random() > 0.5; const x = edge ? left + 0.5 + random() * 1.3 : right - 0.4 - random() * 1.1, z = -9 + random() * 21; return { at: [x, ground(z), z] as const, size: 0.7 + random() * 0.7 }; });
      s.scatter(new THREE.ConeGeometry(1.1, 4.4, 7).translate(0, 2.9, 0), s.material('#35553c', { roughness: 1 }), trees);
      s.scatter(new THREE.CylinderGeometry(0.14, 0.18, 1.2, 6).translate(0, 0.5, 0), s.material('#5a4634'), trees);
      s.scatter(new THREE.CylinderGeometry(0.3, 0.35, 0.3, 8), s.material('#8a7355'), Array.from({ length: 7 }, () => { const [x, y, z] = spot(); return { at: [x, y + 0.1, z] as const, size: 0.6 + random() * 0.6 }; }));
    }

    const speed = mix(2, 14, mood.energy);
    return s.finish({
      update: (_dt, time) => { jets.forEach((jet, index) => { const pulse = 1 + 0.12 * Math.sin(time * speed + index * 1.9); jet.scale.set(1, pulse, 1); }); },
    });
  },
});
