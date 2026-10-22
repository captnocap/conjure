import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];
const RIBS = 11;
const SECTORS = 16;
const PITCH = 3.4;
const NAMES = { number: 'HULL 47', patience: 'PATIENCE', unnamed: 'NO NAME YET', sold: 'SOLD', condemned: 'CONDEMNED', none: '' } as const;
const PROFILES = {
  liner: [0.55, 0.8, 0.95, 1, 1, 0.97, 0.9, 0.78, 0.6, 0.38, 0.16],
  freighter: [0.82, 1, 1, 1, 1, 1, 1, 1, 0.96, 0.82, 0.5],
  whale: [0.28, 0.48, 0.68, 0.84, 0.95, 1, 1, 0.95, 0.84, 0.64, 0.34],
} as const;

export default defineThing({
  questions: {
    state: choice('What is happening to it?', {
      building: 'Under construction: work lights on, weld sparks, fresh panels going up from the keel.',
      abandoned: 'Abandoned mid-build: lights dead, a tarp lashed over one section, cables hanging where they were dropped.',
      scrapping: 'Being cut up for scrap: the bow ribs sawn down to stumps, cut ends glowing, sections stacked on the ground.',
    }),
    ship: choice('What kind of ship was it going to be?', {
      liner: 'A sleek round-bodied liner tapering to a fine nose.',
      freighter: 'A blunt slab-sided freighter, square in section, all capacity.',
      whale: 'A broad flat-bellied lifting body, fat amidships and narrow at both ends.',
    }),
    plating: score('How much of the skin is on?', ['Bare ribs, nothing plated', 'Keel plates only', 'Half skinned', 'Nearly closed, a few open bays']),
    paint: choice('What colour are the plates?', {
      red: 'Red-oxide primer.',
      green: 'Yellow-green zinc primer, like aircraft insides.',
      steel: 'Bare mill-finish steel, grey and blue-tinged.',
      white: 'Finished white with a few dark replacement panels.',
    }),
    yard: choice('What stands around it?', {
      scaffold: 'A scaffold of poles and plank decks along the far side.',
      crane: 'A single yard crane, its jib over the hull with a plate on the hook.',
      blocks: 'Nothing but the cradle blocks it rests on.',
      tethers: 'A web of guy cables staking it down in every direction.',
    }),
    sign: choice('What does the yard board in front of it say?', {
      number: 'HULL 47', patience: 'PATIENCE', unnamed: 'NO NAME YET', sold: 'SOLD', condemned: 'CONDEMNED', none: 'There is no board.',
    }),
    engines: noul('Are the engine bells already fitted at the stern?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const scrap = a.state === 'scrapping', live = a.state === 'building';
    const profile = PROFILES[a.ship];
    const [wide, tall, power] = { liner: [1, 1, 2], freighter: [1.0, 0.85, 5], whale: [1.4, 0.68, 2.6] }[a.ship];
    const R = 5.2;
    const centreY = R * tall + 1.7;
    const xOf = (i: number) => (i - (RIBS - 1) / 2) * PITCH;
    const curve = (v: number) => Math.sign(v) * Math.abs(v) ** (2 / power);
    /** A point on rib i at angle phi: 0 faces the viewer, a quarter turn is the top. */
    const at = (i: number, phi: number, out = 1): P => [xOf(i), centreY + profile[i] * R * tall * curve(Math.sin(phi)) * out, profile[i] * R * wide * curve(Math.cos(phi)) * out];
    const half = (RIBS - 1) / 2 * PITCH;

    const rust = mood.wear * (scrap ? 1 : 0.6);
    const frame = s.material(new THREE.Color('#737a82').lerp(new THREE.Color('#7a4a30'), rust * 0.7), { metalness: 0.45, roughness: 0.5 });
    const dark = s.material('#2c3035', { roughness: 0.6 });
    const yellow = s.material('#e3b21f', { roughness: 0.55 });
    const timber = s.material('#8a6a48', { roughness: 0.9 });
    const hot = new THREE.MeshStandardMaterial({ color: '#ffb35a', emissive: '#ff7a1a', emissiveIntensity: 2.6 });
    const spark = new THREE.MeshStandardMaterial({ color: '#dff3ff', emissive: '#9fd8ff', emissiveIntensity: 3 });

    // ---- ribs, stringers, keel -------------------------------------------------------
    const cutFrom = scrap ? 5 + Math.floor(random() * 2) : RIBS;
    const cutEnds: P[] = [];
    for (let i = 0; i < RIBS; i++) {
      const cut = i >= cutFrom;
      const from = cut ? Math.PI * mix(0.95, 1.2, random()) : 0, to = cut ? Math.PI * mix(1.8, 2.05, random()) : Math.PI * 2;
      const points = Array.from({ length: 25 }, (_x, k) => new THREE.Vector3(...at(i, mix(from, to, k / (cut ? 24 : 25)))));
      if (!cut) points.pop();
      const path = new THREE.CatmullRomCurve3(points, !cut);
      s.mesh(new THREE.TubeGeometry(path, 48, i % 5 === 0 ? 0.24 : 0.17, 6, !cut), frame);
      if (cut) cutEnds.push(at(i, from), at(i, to));
    }
    const stringers = 8;
    for (let j = 0; j < stringers; j++) {
      const phi = (j / stringers) * Math.PI * 2 + Math.PI / 8;
      const upper = Math.sin(phi) > -0.2;
      const last = scrap && upper ? cutFrom - 1 : RIBS - 1;
      if (last < 1) continue;
      const points = Array.from({ length: last + 1 }, (_x, i) => new THREE.Vector3(...at(i, phi, 0.98)));
      s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 30, 0.1, 5), frame);
      if (scrap && upper) cutEnds.push(at(last, phi, 0.98));
    }
    const keelPoints = Array.from({ length: RIBS }, (_x, i) => new THREE.Vector3(...at(i, Math.PI * 1.5, 1.02)));
    s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(keelPoints), 30, 0.34, 6), dark);

    // ---- plating ---------------------------------------------------------------------
    const paintColour = { red: '#a5482f', green: '#a9b04a', steel: '#8f9aa6', white: '#e8e6de' }[a.paint];
    const otherColour = { red: '#7f3c2b', green: '#8b9aa0', steel: '#a5482f', white: '#59616b' }[a.paint];
    const skins: number[][] = [[], [], []];
    const quad = (list: number[], i: number, j: number, out: number) => {
      const p0 = (j / SECTORS) * Math.PI * 2, p1 = ((j + 1) / SECTORS) * Math.PI * 2;
      const a0 = at(i, p0, out), a1 = at(i, p1, out), b0 = at(i + 1, p0, out), b1 = at(i + 1, p1, out);
      const gap = 0.07;
      a0[0] += gap; a1[0] += gap; b0[0] -= gap; b1[0] -= gap;
      list.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
    };
    const threshold = 1.08 - a.plating * 0.86;
    const frontier: P[] = [];
    for (let i = 0; i < RIBS - 1; i++)
      for (let j = 0; j < SECTORS; j++) {
        const phi = ((j + 0.5) / SECTORS) * Math.PI * 2;
        const low = (1 - Math.sin(phi)) / 2, aft = 1 - i / (RIBS - 2);
        const value = 0.62 * low + 0.38 * aft + (random() - 0.5) * 0.16;
        let on = value > threshold;
        if (on && a.state === 'abandoned' && random() < 0.13) on = false;
        if (on && scrap && (i >= cutFrom - 1 ? Math.sin(phi) > -0.5 || random() < 0.5 : random() < 0.3)) on = false;
        if (on) quad(random() < (a.paint === 'white' ? 0.07 : 0.14) + mood.wear * 0.1 ? skins[1] : skins[0], i, j, 1.03);
        else if (value > threshold - 0.07) frontier.push(at(i, phi, 1.04));
      }
    // A tarp lashed over the top of two bays.
    if (a.state === 'abandoned') {
      const bay = 2 + Math.floor(random() * 5);
      for (let i = bay; i < bay + 2; i++) for (let j = 1; j < 7; j++) quad(skins[2], i, j, 1.07);
    }
    const tarpColour = mood.warmth > 0.5 ? '#9a8a5a' : '#5d7a86';
    [paintColour, otherColour, tarpColour].forEach((colour, index) => {
      if (!skins[index].length) return;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(skins[index], 3));
      geometry.computeVertexNormals();
      const tint = new THREE.Color(colour).lerp(new THREE.Color('#6b5a48'), mood.wear * 0.3);
      s.mesh(geometry, new THREE.MeshStandardMaterial({ color: tint, roughness: index === 2 ? 0.95 : mix(0.45, 0.85, mood.wear), metalness: index === 2 ? 0 : 0.25, side: THREE.DoubleSide, flatShading: true }));
    });
    if (a.paint === 'white' && a.plating > 0.4) {
      // A livery stripe along the waist, where the plates reach it.
      for (let i = 0; i < RIBS - 1; i++) if (!scrap || i < cutFrom - 1) s.rod(at(i, -0.25, 1.045), at(i + 1, -0.25, 1.045), 0.16, s.material('#2f5f9a'));
    }

    // ---- stern -----------------------------------------------------------------------
    const sternR = profile[0] * R;
    s.mesh(new THREE.TorusGeometry(sternR * 0.5 * Math.min(wide, 1.2), 0.22, 6, 20).rotateY(Math.PI / 2), frame, [xOf(0) - 0.5, centreY, 0]);
    for (const phi of [0.6, 2.5, 3.8, 5.6]) s.rod(at(0, phi), [xOf(0) - 0.5, centreY + Math.sin(phi) * sternR * 0.5, Math.cos(phi) * sternR * 0.5], 0.1, frame);
    if (a.engines) {
      const bell = new THREE.LatheGeometry([[0.3, 0], [0.5, 0.5], [0.9, 1.3], [1.15, 2.1]].map(([x, y]) => new THREE.Vector2(x * sternR * 0.36, y * sternR * 0.36)), 20);
      const bellMaterial = new THREE.MeshStandardMaterial({ color: '#3d4148', metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide });
      const spots: [number, number][] = a.ship === 'whale' ? [[-0.5, 0], [0.5, 0]] : [[0, 0.42], [-0.42, -0.3], [0.42, -0.3]];
      spots.forEach(([z, y], index) => {
        if (scrap && index === 0) return;
        s.mesh(bell, bellMaterial, [xOf(0) - 0.6, centreY + y * sternR * tall, z * sternR]).rotation.z = Math.PI / 2;
      });
    }

    // ---- cradle ----------------------------------------------------------------------
    for (const i of [1, 5, 9]) {
      const keelY = at(i, Math.PI * 1.5)[1];
      const reach = profile[i] * R * wide * 0.8;
      s.box([0.7, 0.3, reach * 2 + 1.6], [xOf(i), 0.15, 0], dark);
      s.box([1.0, Math.max(keelY - 0.6, 0.3), 1.2], [xOf(i), Math.max(keelY - 0.6, 0.3) / 2 + 0.3, 0], timber);
      for (const side of [-1, 1]) {
        const bilge = at(i, side > 0 ? -0.75 : Math.PI + 0.75, 1.02);
        s.rod([xOf(i), 0.3, side * (reach + 0.6)], bilge, 0.16, yellow);
        s.box([0.9, 0.3, 0.9], bilge, timber).rotation.x = side * 0.7;
      }
    }
    for (const z of [-1, 1]) s.box([half * 2 + 3, 0.2, 0.3], [0, 0.1, z * (R * wide * 0.8 + 0.6)], dark);

    // ---- the yard around it ----------------------------------------------------------
    const backZ = -(R * wide + 1.4);
    const topY = centreY + R * tall;
    const lampMaterial = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: new THREE.Color().setHSL(mix(0.56, 0.11, mood.warmth), 0.8, 0.72), emissiveIntensity: live ? 2.6 : 0.05 });
    const lamps: P[] = [];
    if (a.yard === 'scaffold') {
      const pole = s.material('#9aa1a8', { metalness: 0.5, roughness: 0.4 });
      const levels = [topY * 0.36, topY * 0.7, topY * 1.04];
      const columns = Array.from({ length: 7 }, (_x, k) => -half + (k * half * 2) / 6);
      const missing = a.state === 'building' ? -1 : Math.floor(random() * 5) + 1;
      for (const [k, x] of columns.entries())
        for (const z of [backZ, backZ - 2]) {
          const height = (k >= missing && missing > 0 && scrap ? levels[0] : levels[2]) + 1.1;
          s.box([0.14, height, 0.14], [x, height / 2, z], pole);
        }
      levels.forEach((y, level) => {
        const from = scrap && missing > 0 && level > 0 ? columns[missing] : half;
        const length = from + half;
        if (length < 1) return;
        for (const z of [backZ, backZ - 2]) s.box([length, 0.12, 0.12], [-half + length / 2, y + 1.0, z], pole);
        const gapAt = a.state === 'building' ? -1 : Math.floor(random() * 6);
        for (let k = 0; k < 6; k++) {
          if (k === gapAt || columns[k + 1] > -half + length + 0.1) continue;
          const plank = s.box([half / 3 - 0.1, 0.12, 1.9], [(columns[k] + columns[k + 1]) / 2, y, backZ - 1], timber);
          if (a.state !== 'building' && random() < 0.25) plank.rotation.z = 0.25;
        }
      });
      for (let k = 0; k < 6; k += 2) s.rod([columns[k], 0.2, backZ - 2], [columns[k + 1], levels[1] + 1, backZ - 2], 0.05, pole);
      for (const x of [-half * 0.6, 0, half * 0.6]) lamps.push([x, levels[2] + 1.5, backZ + 0.3]);
    } else if (a.yard === 'crane') {
      const base: P = [half * 0.2, 0, backZ - 2.2];
      s.box([3, 0.6, 3], [base[0], 0.3, base[2]], dark);
      const mastTop = topY + 7;
      for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) s.box([0.2, mastTop, 0.2], [base[0] + dx, mastTop / 2, base[2] + dz], yellow);
      for (let y = 2; y < mastTop; y += 2.6) s.box([1.6, 0.14, 1.6], [base[0], y, base[2]], yellow);
      s.box([2.2, 1.8, 2.2], [base[0], mastTop + 0.6, base[2]], s.material('#e9e6dc'));
      const tip: P = [base[0] - 3, mastTop + 0.8, 2.5];
      s.rod([base[0], mastTop + 1.2, base[2] - 3.5], tip, 0.3, yellow);
      s.rod([base[0], mastTop + 4, base[2]], tip, 0.06, dark);
      s.rod([base[0], mastTop + 1.2, base[2]], [base[0], mastTop + 4, base[2]], 0.16, yellow);
      s.box([2, 1.4, 1.6], [base[0], mastTop + 0.8, base[2] - 3.4], dark);
      const hookY = topY + 2.6;
      s.rod(tip, [tip[0], hookY, tip[2]], 0.04, dark);
      if (a.state !== 'abandoned') {
        const plate = s.box([3.2, 0.14, 2.6], [tip[0], hookY - 0.3, tip[2]], s.material(paintColour, { metalness: 0.25, roughness: 0.6 }));
        plate.rotation.set(0.2, random(), 0.12);
      } else s.cylinder(0.25, 0.1, 0.6, [tip[0], hookY - 0.3, tip[2]], dark, 8);
      lamps.push([base[0], mastTop + 1.7, base[2] + 1.2], [tip[0], tip[1] - 0.4, tip[2]]);
    } else if (a.yard === 'tethers') {
      const cable = s.material('#3a3d42', { roughness: 0.7 });
      for (let k = 0; k < 10; k++) {
        const i = 1 + Math.floor(random() * (RIBS - 2));
        const side = k % 2 ? 1 : -1;
        const phi = side > 0 ? mix(0.2, 1.3, random()) : mix(1.85, 2.95, random());
        const anchor: P = [xOf(i) + (random() - 0.5) * 9, 0.2, side * (R * wide + mix(3, 7, random()))];
        s.rod(at(i, phi, 1.02), anchor, 0.045, cable);
        s.box([0.7, 0.4, 0.7], anchor, dark);
      }
      lamps.push([-half * 0.5, 2.6, backZ - 1], [half * 0.5, 2.6, backZ - 1]);
      for (const lamp of lamps) s.rod([lamp[0], 0, lamp[2]], lamp, 0.07, dark);
    } else {
      lamps.push([-half - 1.5, 3.2, backZ]);
      s.rod([-half - 1.5, 0, backZ], [-half - 1.5, 3.2, backZ], 0.08, dark);
    }
    for (const lamp of lamps) {
      const head = s.box([0.9, 0.5, 0.4], lamp, lampMaterial);
      head.rotation.x = 0.5;
      head.castShadow = false;
    }
    // Hanging power and air lines.
    const lines = a.state === 'building' ? 2 : 4 + Math.round(mood.wear * 2);
    for (let k = 0; k < lines; k++) {
      const i = Math.min(Math.floor(random() * (scrap ? cutFrom : RIBS)), RIBS - 1);
      const top = at(i, mix(0.5, 2.6, random()), 1.0);
      const ground: P = [top[0] + (random() - 0.5) * 5, 0.08, top[2] + (random() - 0.5) * 3 + (top[2] > 0 ? 3 : -3)];
      const droop = a.state === 'building' ? 0.5 : 0.15;
      s.tube([top, [top[0], mix(top[1], 0, droop + 0.3), top[2] * 1.02], [mix(top[0], ground[0], 0.5), 0.3, mix(top[2], ground[2], 0.6)], ground], 0.05, s.material(['#c0392b', '#e3b21f', '#24272b', '#2f6f8f'][k % 4]));
    }

    // ---- what the work looks like right now -------------------------------------------
    const flicker: THREE.Mesh[] = [];
    if (live && frontier.length) {
      for (let k = 0; k < 3; k++) {
        const p = frontier[Math.floor(random() * frontier.length)];
        const star = s.mesh(new THREE.OctahedronGeometry(0.34, 0), spark, p);
        star.castShadow = false;
        flicker.push(star);
        for (let n = 0; n < 5; n++) s.rod(p, [p[0] + (random() - 0.5) * 1.6, p[1] - random() * 1.6, p[2] + (random() - 0.5) * 1.6], 0.02, spark).castShadow = false;
      }
    }
    if (scrap) {
      for (const p of cutEnds) if (random() < 0.7) { const glow = s.ball([0.26, 0.26, 0.26], p, hot, 8); glow.castShadow = false; flicker.push(glow); }
      // Cut sections stacked off the bow quarter.
      const pileX = half * 0.55, pileZ = R * wide + 3.2;
      for (let k = 0; k < 7; k++) {
        const arc = s.mesh(new THREE.TorusGeometry(mix(2.2, 4.4, random()), 0.17, 6, 16, mix(1.2, 2.6, random())), frame, [pileX + (random() - 0.5) * 5, 0.2 + k * 0.2, pileZ + (random() - 0.5) * 2.4]);
        arc.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.3, 0, random() * 6);
      }
      for (let k = 0; k < 5; k++) {
        const plate = s.box([mix(1.6, 3, random()), 0.12, mix(1.4, 2.4, random())], [pileX - 6 + (random() - 0.5) * 3, 0.15 + k * 0.16, pileZ + (random() - 0.5) * 1.5], s.material(k % 2 ? paintColour : otherColour, { roughness: 0.8 }));
        plate.rotation.y = random() * 3;
      }
    }

    // ---- yard board --------------------------------------------------------------------
    const text = NAMES[a.sign];
    if (text) {
      const bx = -half * 0.55, bz = R * wide * 0.8 + 2.6;
      for (const x of [-1.9, 1.9]) s.box([0.18, 3.2, 0.18], [bx + x, 1.6, bz - 0.1], timber);
      s.box([4.6, 1.5, 0.14], [bx, 2.6, bz], dark);
      const condemned = a.sign === 'condemned' || a.sign === 'sold';
      const board = s.label(text, 4.3, 1.25, [bx, 2.6, bz + 0.08], condemned ? '#f3efe2' : '#1e2a36', condemned ? '#b3261e' : mood.wear > 0.6 ? '#cfc7ae' : '#f3efe2');
      board.castShadow = false;
      if (a.state === 'abandoned') { board.rotation.z = -0.07; }
    }

    const rate = mix(3, 14, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        flicker.forEach((mesh, index) => {
          const on = Math.sin(time * rate + index * 2.1) + Math.sin(time * rate * 0.37 + index) > (live ? 0.2 : -1.2);
          mesh.visible = on;
        });
      },
    });
  },
});
