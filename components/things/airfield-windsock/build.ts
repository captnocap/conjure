import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

const STRIPES = {
  'orange-white': 'Aviation orange and white bands, the textbook windsock.',
  'red-white': 'Signal red and white bands, like a barber pole in the sky.',
  orange: 'Plain unbroken orange, a flying club on a grass strip.',
  'yellow-black': 'Yellow and black hazard bands, industrial and blunt.',
  'blue-white': 'Pale blue and white, a seaside aerodrome or a heliport.',
  pink: 'Sun-bleached to salmon pink and grey, colours it no longer remembers.',
} as const;
const BANDS: Record<keyof typeof STRIPES, [string, string]> = {
  'orange-white': ['#f26a1b', '#f4f1e8'],
  'red-white': ['#d3212c', '#f4f1e8'],
  orange: ['#f47a1f', '#ee6c14'],
  'yellow-black': ['#f2c40f', '#23262a'],
  'blue-white': ['#3f8fd0', '#f1f4f6'],
  pink: ['#e3a595', '#cfcac2'],
};

export default defineThing({
  questions: {
    stripes: choice('What colours is the sock?', STRIPES),
    wind: score('How much wind is in the sock?', [
      'Dead calm: it hangs straight down the pole like a wet sleeve',
      'A light air lifts the first band',
      'Half full, nodding',
      'Stiff breeze, nearly level',
      'Gale: rigid as a pointing arm',
    ]),
    fabric: choice('What state is the fabric in?', {
      fresh: 'Brand new, crisp and bright, fitted this week.',
      weathered: 'A few seasons old: frayed at the tail, a little faded.',
      torn: 'Split along a seam, the last bands flapping loose.',
      ribbons: 'Shredded to streaming ribbons by a storm nobody repaired.',
      gone: 'Gone entirely: only the bare hoop turns on the pole.',
    }),
    lamp: choice('How is the pole lit?', {
      flood: 'A gooseneck floodlight above the hoop, switched on, washing the sock in light.',
      dark: 'The same floodlight, switched off or dead.',
      obstruction: 'A steady red obstruction lamp on the very top of the pole.',
      none: 'No lamp at all, a daylight-only field.',
    }),
    pole: choice('What kind of pole carries it?', {
      hinged: 'A plain galvanised tube on a hinged tilt-down base.',
      banded: 'A red and white banded pole, painted like a surveyor\'s staff.',
      lattice: 'A slim steel lattice mast with cross bracing.',
      timber: 'A tarred timber post with iron straps, from a much older field.',
    }),
    ground: choice('What is painted or laid around its foot?', {
      circle: 'A broad white painted circle on tarmac.',
      segmented: 'A ring of separate white concrete slabs set in mown grass.',
      yellow: 'A yellow circle on a dark asphalt disc.',
      wild: 'Nothing maintained: a patch of rough grass and weeds.',
    }),
    heading: choice('Which way is the wind carrying the sock?', {
      right: 'Streaming off to the right.',
      left: 'Streaming off to the left.',
      toward: 'Blowing out towards the viewer.',
      away: 'Blowing away into the distance.',
    }),
    company: choice('What keeps the windsock company?', {
      nothing: 'Nothing. It stands alone.',
      bird: 'A crow perched on the top of the pole.',
      bicycle: 'A bicycle leaned against the pole by someone who walked on.',
      cones: 'A couple of traffic cones and a fallen sign, a job left half done.',
      ladder: 'A ladder propped against the pole and a spare sock folded on the ground.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(5.6, 6.6, random());
    const steel = s.material('#aab0b2', { metalness: 0.55, roughness: 0.45 });
    const dark = s.material('#2c3033', { roughness: 0.7 });
    const white = s.material('#f1efe6');
    const red = s.material('#cf2a2a');

    // ---- Ground marking.
    const R = 2.6;
    if (a.ground === 'circle' || a.ground === 'yellow') {
      const disc = s.cylinder(R + 0.5, R + 0.5, 0.04, [0, 0.02, 0], s.material(a.ground === 'yellow' ? '#3a3c40' : '#6f716f', { roughness: 0.95 }), 48);
      disc.castShadow = false;
      const ring = s.mesh(new THREE.RingGeometry(R - 0.32, R, 64), s.material(a.ground === 'yellow' ? '#f0c419' : '#f2f0e8', { roughness: 0.9 }), [0, 0.045, 0]);
      ring.rotation.x = -Math.PI / 2; ring.castShadow = false;
      // Paint worn away in patches.
      const gaps = Math.round(mood.wear * 9);
      for (let i = 0; i < gaps; i++) {
        const t = random() * Math.PI * 2;
        const patch = s.box([0.25 + random() * 0.4, 0.004, 0.42], [Math.cos(t) * (R - 0.16), 0.048, Math.sin(t) * (R - 0.16)], disc.material as THREE.Material);
        patch.rotation.y = -t + Math.PI / 2; patch.castShadow = false;
      }
    } else {
      const turf = s.cylinder(R + 0.5, R + 0.6, 0.05, [0, 0.025, 0], s.material(a.ground === 'wild' ? '#8c9160' : '#7fa05c', { roughness: 1 }), 40);
      turf.castShadow = false;
      if (a.ground === 'segmented') {
        const n = 12;
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2;
          const slab = s.box([0.95, 0.08, 0.36], [Math.cos(t) * (R - 0.2), 0.05 + random() * 0.02, Math.sin(t) * (R - 0.2)], white);
          slab.rotation.y = -t + Math.PI / 2 + (random() - 0.5) * mood.wear * 0.3;
        }
      }
      const tufts = [] as { at: [number, number, number]; size: number; color: string }[];
      const count = a.ground === 'wild' ? 46 : 12;
      for (let i = 0; i < count; i++) {
        const t = random() * Math.PI * 2, r = 0.3 + random() * (R + 0.1);
        tufts.push({ at: [Math.cos(t) * r, 0.05, Math.sin(t) * r], size: 0.12 + random() * (a.ground === 'wild' ? 0.3 : 0.12), color: random() > 0.5 ? '#6f7d45' : '#a3a25c' });
      }
      s.scatter(new THREE.ConeGeometry(0.5, 1.6, 5), new THREE.MeshStandardMaterial({ roughness: 1 }), tufts);
    }

    // ---- Hinged base and pole.
    s.box([0.7, 0.1, 0.7], [0, 0.07, 0], s.material('#9c9a92', { roughness: 0.95 }));
    for (const z of [-0.12, 0.12]) s.box([0.16, 1.0, 0.03], [0, 0.6, z], steel);
    const bolt = s.cylinder(0.035, 0.035, 0.34, [0, 0.95, 0], dark, 10); bolt.rotation.x = Math.PI / 2;
    const pin = s.cylinder(0.025, 0.025, 0.34, [0, 0.35, 0], dark, 10); pin.rotation.x = Math.PI / 2;
    if (a.pole === 'lattice') {
      const w = 0.2;
      for (const [x, z] of [[-w, -w], [w, -w], [w, w], [-w, w]] as const) s.rod([x, 0.12, z], [x * 0.45, H, z * 0.45], 0.022, steel);
      const bays = 9;
      for (let i = 0; i < bays; i++) {
        const y0 = 0.3 + (i / bays) * (H - 0.4), y1 = 0.3 + ((i + 1) / bays) * (H - 0.4);
        const k0 = mix(1, 0.45, y0 / H) * w, k1 = mix(1, 0.45, y1 / H) * w;
        const flip = i % 2 ? 1 : -1;
        s.rod([-k0 * flip, y0, k0], [k1 * flip, y1, k1], 0.012, steel);
        s.rod([k0, y0, -k0 * flip], [k1, y1, k1 * flip], 0.012, steel);
        s.rod([k0 * flip, y0, -k0], [-k1 * flip, y1, -k1], 0.012, steel);
        s.rod([-k0, y0, k0 * flip], [-k1, y1, -k1 * flip], 0.012, steel);
      }
    } else if (a.pole === 'timber') {
      const tar = s.material('#4a3a2c', { roughness: 0.95 });
      s.cylinder(0.075, 0.11, H - 0.1, [0, 0.1 + (H - 0.1) / 2, 0], tar, 10).rotation.z = (random() - 0.5) * 0.02;
      for (const y of [0.5, 1.0, H * 0.6]) s.cylinder(0.115, 0.115, 0.05, [0, y, 0], dark, 10);
      s.rod([0.5, 0.05, 0.3], [0.05, 1.7, 0.03], 0.04, tar);
    } else {
      const bands = a.pole === 'banded' ? 8 : 1;
      for (let i = 0; i < bands; i++) {
        const y0 = 0.3 + (i / bands) * (H - 0.3), y1 = 0.3 + ((i + 1) / bands) * (H - 0.3);
        const r = (y: number) => mix(0.075, 0.045, y / H);
        s.cylinder(r(y1), r(y0), y1 - y0, [0, (y0 + y1) / 2, 0], a.pole === 'banded' ? (i % 2 ? white : red) : steel, 14);
      }
    }
    s.cylinder(0.06, 0.07, 0.14, [0, H, 0], dark, 12);

    // ---- The swivel, hoop and sock. The head group turns with the wind.
    const head = new THREE.Group();
    head.position.set(0, H + 0.12, 0);
    const baseYaw = { right: 0, left: Math.PI, toward: -Math.PI / 2 + 0.35, away: Math.PI / 2 - 0.35 }[a.heading] + (random() - 0.5) * 0.4;
    head.rotation.y = baseYaw;
    s.root.add(head);
    const part = (mesh: THREE.Mesh, at: [number, number, number]) => { mesh.position.set(...at); mesh.castShadow = true; head.add(mesh); return mesh; };
    const mouth = 0.42, tail = 0.2, L = 3.1, off = 0.55;
    const hoop = part(new THREE.Mesh(new THREE.TorusGeometry(mouth, 0.018, 6, 28), steel), [off, -0.5, 0]);
    hoop.rotation.y = Math.PI / 2;
    const spoke = (to: [number, number, number]) => {
      const from = new THREE.Vector3(0, 0, 0), end = new THREE.Vector3(...to), dir = end.clone().sub(from);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, dir.length(), 6), steel);
      rod.position.copy(from.add(end).multiplyScalar(0.5));
      rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      rod.castShadow = true; head.add(rod);
    };
    for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI * 2 + 0.78; spoke([off, -0.5 + Math.cos(t) * mouth, Math.sin(t) * mouth]); }
    part(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8), steel), [0, -0.3, 0]);

    const [c0, c1] = BANDS[a.stripes].map((hex) => new THREE.Color(hex));
    const fade = (a.fabric === 'fresh' ? 0 : a.fabric === 'weathered' ? 0.25 : 0.4) + mood.wear * 0.3;
    for (const c of [c0, c1]) c.lerp(new THREE.Color('#b9b3a8'), clamp01(fade) * 0.6);
    const STR = 5, SUB = 5, RAD = 14;
    const rings = STR * (SUB + 1);
    const positions = new Float32Array(rings * (RAD + 1) * 3);
    const colours = new Float32Array(rings * (RAD + 1) * 3);
    const index: number[] = [];
    const ragged = Array.from({ length: RAD }, () => random());
    const cut = a.fabric === 'torn' ? 0.55 : a.fabric === 'ribbons' ? 0.25 : a.fabric === 'weathered' ? 0.93 : 2;
    for (let st = 0; st < STR; st++) {
      const colour = st % 2 ? c1 : c0;
      for (let k = 0; k <= SUB; k++) {
        const ring = st * (SUB + 1) + k;
        for (let j = 0; j <= RAD; j++) colour.toArray(colours, (ring * (RAD + 1) + j) * 3);
        if (k === SUB) continue;
        const t = (st + (k + 0.5) / SUB) / STR;
        for (let j = 0; j < RAD; j++) {
          // Past the cut line, whole gores of cloth are missing.
          if (t > cut + ragged[j] * 0.25 && (a.fabric === 'ribbons' ? j % 3 !== 0 : a.fabric === 'torn' ? ragged[j] > 0.45 : ragged[j] > 0.6)) continue;
          const p = ring * (RAD + 1) + j;
          index.push(p, p + RAD + 1, p + 1, p + 1, p + RAD + 1, p + RAD + 2);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geometry.setIndex(index);
    const cloth = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }));
    cloth.castShadow = true; cloth.frustumCulled = false;
    if (a.fabric !== 'gone') head.add(cloth);

    const wind = clamp01(a.wind + (random() - 0.5) * 0.08);
    const phase = random() * 10;
    const shape = (time: number) => {
      const gust = Math.sin(time * 0.7 + phase) * 0.5 + Math.sin(time * 1.9 + phase * 2) * 0.25;
      const w = clamp01(wind + gust * 0.12 * mood.energy * (0.3 + wind));
      let x = off, y = -0.5, z = 0;
      const step = L / (rings - STR);
      let ring = 0;
      for (let st = 0; st < STR; st++) for (let k = 0; k <= SUB; k++, ring++) {
        const t = (st + k / SUB) / STR;
        // The hoop holds the first band open and level; the rest droops as the wind dies.
        const droop = (1 - w) * (Math.PI / 2) * Math.min(1, t * mix(6, 1.2, w) + (1 - w) * 0.3) * (t > 0 ? 1 : 0);
        const flap = Math.sin(time * mix(2, 9, mood.energy) - t * 7 + phase) * t * mix(0.02, 0.22, mood.energy) * (0.25 + w);
        const pitch = -droop + flap;
        const yaw = Math.sin(time * mix(1.5, 6, mood.energy) - t * 5 + phase * 3) * t * 0.18 * (0.2 + w) * mix(0.3, 1, mood.energy);
        const dir = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw));
        if (k > 0) { x += dir.x * step; y += dir.y * step; z += dir.z * step; }
        const up = new THREE.Vector3(-Math.sin(pitch), Math.cos(pitch), 0), side = new THREE.Vector3().crossVectors(dir, up).normalize();
        // A limp sock collapses flat; a full one is a clean cone.
        const radius = mix(mouth, tail, t), flat = mix(mix(0.3, 1, w), 1, 1 - Math.min(1, t * 4));
        for (let j = 0; j <= RAD; j++) {
          const th = (j / RAD) * Math.PI * 2;
          const o = (ring * (RAD + 1) + j) * 3;
          const cu = Math.cos(th) * radius * (0.6 + 0.4 * flat), cs = Math.sin(th) * radius * flat;
          positions[o] = x + up.x * cu + side.x * cs;
          positions[o + 1] = y + up.y * cu + side.y * cs;
          positions[o + 2] = z + up.z * cu + side.z * cs;
        }
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    };
    shape(0);

    // ---- Lamp.
    let glow: THREE.MeshStandardMaterial | null = null;
    if (a.lamp === 'flood' || a.lamp === 'dark') {
      const on = a.lamp === 'flood';
      s.tube([[0, H + 0.1, 0], [0, H + 0.9, 0], [0.25, H + 1.25, 0], [0.75, H + 1.2, 0]].map(([x, y, z]) => {
        const v = new THREE.Vector3(x, y - H - 0.12, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), baseYaw);
        return [v.x, v.y + H + 0.12, v.z] as const;
      }), 0.025, steel);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.2, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#3b4245', side: THREE.DoubleSide, roughness: 0.6 }));
      part(shade, [0.82, 1.02, 0]);
      glow = new THREE.MeshStandardMaterial({ color: on ? '#fff3c8' : '#8d8f8a', emissive: on ? '#ffdf8a' : '#000000', emissiveIntensity: on ? 2.2 : 0 });
      part(new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), glow), [0.82, 0.95, 0]);
      if (on) {
        const beam = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.7, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide }));
        beam.position.set(0.82, 0.12, 0); head.add(beam);
      }
    } else if (a.lamp === 'obstruction') {
      glow = new THREE.MeshStandardMaterial({ color: '#ff3b2e', emissive: '#ff2a1a', emissiveIntensity: 2 });
      s.cylinder(0.05, 0.06, 0.08, [0, H + 0.16, 0], dark, 10);
      s.ball([0.075, 0.1, 0.075], [0, H + 0.28, 0], glow, 12);
    }

    // ---- Company.
    if (a.company === 'bird') {
      const crow = s.material('#1b1c20', { roughness: 0.6 });
      const top = a.lamp === 'obstruction' ? H + 0.42 : H + 0.17;
      s.ball([0.07, 0.085, 0.14], [0, top + 0.1, 0.01], crow, 10).rotation.x = -0.5;
      s.ball([0.05, 0.05, 0.055], [0, top + 0.2, 0.1], crow, 8);
      s.rod([0, top + 0.2, 0.14], [0, top + 0.18, 0.22], 0.016, crow, 0.002);
      s.rod([0, top + 0.08, -0.08], [0, top + 0.0, -0.26], 0.03, crow, 0.012);
    } else if (a.company === 'bicycle') {
      const frame = s.material(mood.cheer > 0.5 ? '#2f8f6a' : '#5a5f66', { metalness: 0.4 });
      const g = new THREE.Group();
      for (const x of [-0.52, 0.52]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.022, 6, 28), dark); wheel.position.set(x, 0.35, 0); wheel.castShadow = true; g.add(wheel);
      }
      const bar = (p: [number, number, number], q: [number, number, number], r = 0.016) => {
        const A = new THREE.Vector3(...p), B = new THREE.Vector3(...q), d = B.clone().sub(A);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), frame);
        m.position.copy(A.add(B).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; g.add(m);
      };
      bar([-0.52, 0.35, 0], [-0.15, 0.82, 0]); bar([-0.15, 0.82, 0], [0.38, 0.86, 0]); bar([0.38, 0.86, 0], [0.52, 0.35, 0]);
      bar([-0.15, 0.82, 0], [0.02, 0.33, 0]); bar([0.02, 0.33, 0], [-0.52, 0.35, 0]); bar([0.02, 0.33, 0], [0.38, 0.86, 0]);
      bar([-0.15, 0.82, 0], [-0.19, 0.95, 0]); bar([0.38, 0.86, 0], [0.34, 1.02, 0]); bar([0.34, 1.02, -0.22], [0.34, 1.02, 0.22]);
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.1), dark); saddle.position.set(-0.2, 0.97, 0); g.add(saddle);
      g.rotation.x = -0.2; g.rotation.y = 0.5 + random() * 0.5; g.position.set(0.25, 0.04, 0.35);
      s.root.add(g);
    } else if (a.company === 'cones') {
      const orange = s.material('#f0641e');
      for (let i = 0; i < 3; i++) {
        const t = random() * 6.28, r = 1 + random() * 1.1, x = Math.cos(t) * r, z = Math.abs(Math.sin(t) * r) + 0.3;
        if (i === 2) { const c = s.cylinder(0.03, 0.14, 0.5, [x, 0.17, z], orange, 12); c.rotation.z = Math.PI / 2 - 0.25; c.rotation.y = random() * 3; }
        else { s.cylinder(0.03, 0.14, 0.5, [x, 0.3, z], orange, 12); s.box([0.36, 0.03, 0.36], [x, 0.06, z], orange); s.cylinder(0.075, 0.095, 0.1, [x, 0.33, z], white, 12); }
      }
      const sign = s.label('WIP', 0.7, 0.45, [-1.2, 0.07, 1.3], '#22252a', '#f1c21b'); sign.rotation.x = -Math.PI / 2 + 0.05; sign.rotation.z = random() * 2;
    } else if (a.company === 'ladder') {
      const alu = s.material('#c9ced0', { metalness: 0.6, roughness: 0.4 });
      const lean = 0.22, len = H * 0.8;
      for (const z of [-0.2, 0.2]) s.rod([-len * Math.sin(lean) - 0.1, 0.05, z], [-0.08, len * Math.cos(lean), z], 0.025, alu);
      for (let i = 1; i < 14; i++) { const t = i / 14; s.rod([mix(-len * Math.sin(lean) - 0.1, -0.08, t), mix(0.05, len * Math.cos(lean), t), -0.2], [mix(-len * Math.sin(lean) - 0.1, -0.08, t), mix(0.05, len * Math.cos(lean), t), 0.2], 0.014, alu); }
      const [f0, f1] = BANDS[a.stripes];
      s.box([0.7, 0.08, 0.5], [1.0, 0.09, 1.0], s.material(f0)).rotation.y = 0.4;
      s.box([0.62, 0.07, 0.44], [1.03, 0.16, 1.02], s.material(f1)).rotation.y = 0.55;
    }

    const spin = mix(0.02, 0.25, mood.energy) * (0.3 + wind);
    return s.finish({
      footprint: R + 0.5,
      update: (_dt, time) => {
        head.rotation.y = baseYaw + Math.sin(time * 0.5 + phase) * spin + Math.sin(time * 1.3 + phase) * spin * 0.4;
        shape(time);
        if (glow && a.lamp === 'flood' && mood.wear > 0.6) glow.emissiveIntensity = Math.sin(time * 23 + phase) > 0.85 - mood.wear * 0.3 ? 0.3 : 2.2;
      },
    });
  },
});
