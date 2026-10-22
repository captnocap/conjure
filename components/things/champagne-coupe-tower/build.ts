import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { drapeRound } from './helpers';

const TAU = Math.PI * 2;
const DRINK = {
  champagne: { liquid: '#f1d98c', bottle: '#1e3a27', foil: '#d6ae4f', clear: false },
  rose: { liquid: '#f3a59e', bottle: '#f0b3ab', foil: '#d99a86', clear: true },
  kids: { liquid: '#ff9d2e', bottle: '#ffa53d', foil: '#2f6fd6', clear: true },
  kir: { liquid: '#a8203f', bottle: '#16261c', foil: '#3a3a3f', clear: false },
  blue: { liquid: '#3fb6ea', bottle: '#58c4f0', foil: '#d9dde0', clear: true },
} as const;

export default defineThing({
  questions: {
    height: score('How tall is the tower?', ['Three tiers, a party trick', 'Four tiers', 'Five tiers', 'Six tiers, a reckless monument']),
    state: choice('What is happening to it right now?', {
      waiting: 'Stacked, polished and empty, unopened bottles on ice beside it.',
      pouring: 'A gloved hand tips a bottle over the top glass and the wine cascades down tier by tier.',
      full: 'Every glass brimming and untouched, the bottle back in its bucket.',
      raided: 'After the toast: gaps where glasses were taken, dregs in the ones that remain.',
      collapsed: 'One corner has gone: glasses on their sides, shards, a spreading puddle.',
    }),
    drink: choice('What is in the glasses?', {
      champagne: 'Pale gold champagne from a dark green bottle.',
      rose: 'Blush-pink rosé.',
      kids: 'Bright orange fizzy pop with striped paper straws, for the children.',
      kir: 'Deep blackcurrant-red kir royale.',
      blue: 'A lurid electric-blue cocktail.',
    }),
    stand: choice('What does the tray stand on?', {
      tray: 'Just the tray itself, set down on whatever surface is there.',
      table: 'A round cocktail table draped to the floor in white linen.',
      barrel: 'An upended oak wine barrel.',
      plinth: 'A glossy black plinth with a glowing rim.',
    }),
    garnish: choice('What dresses the tray?', {
      none: 'Nothing: bare polished metal.',
      berries: 'Strawberries heaped round the edge.',
      lights: 'A string of warm fairy lights coiled round the base.',
      flowers: 'A wreath of roses and leaves.',
      sparklers: 'Fizzing sparklers stuck in round the edge.',
    }),
    gilt: noul('Is the tray gold rather than silver?'),
    magnum: noul('Is the bottle an oversized magnum?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const spec = DRINK[a.drink];
    const L = 3 + Math.round(a.height * 3);
    const d = 0.108, H = 0.126, half = L * d / 2;
    const supportR = half * 1.41 + 0.075;
    const right = a.state === 'pouring' ? supportR : Math.max(supportR, half + 0.29);
    const cx = (right - supportR) / 2, Rx = (right + supportR) / 2, oval = Rx / supportR;
    const metal = s.material(a.gilt ? '#d8b45a' : '#d6dadb', { metalness: 0.9, roughness: 0.22 });

    // What it stands on.
    let Y = 0;
    if (a.stand === 'table') {
      Y = 0.76;
      const linen = s.material('#f3efe4', { side: THREE.DoubleSide, roughness: 0.85 });
      s.mesh(drapeRound(Rx + 0.07, Rx + 0.17, Y, 12, 0.06), linen, [cx, Y / 2, 0]);
      s.cylinder(Rx + 0.07, Rx + 0.07, 0.012, [cx, Y - 0.006, 0], linen, 64);
    } else if (a.stand === 'barrel') {
      Y = 0.92;
      const oak = s.material('#8a5a34', { roughness: 0.8 });
      const r = Math.min(Rx * 0.8, 0.36);
      s.lathe([[0, 0], [r * 0.8, 0], [r * 0.93, 0.2], [r, 0.44], [r * 0.93, 0.68], [r * 0.8, 0.88], [0, 0.88]], oak, [cx, 0, 0]);
      for (const [yy, k] of [[0.06, 0.83], [0.24, 0.95], [0.64, 0.95], [0.82, 0.83]] as const) s.cylinder(r * k + 0.004, r * k + 0.004, 0.035, [cx, yy, 0], s.material('#4b4a48', { metalness: 0.7, roughness: 0.4 }), 32);
      s.cylinder(Rx + 0.04, Rx + 0.04, 0.04, [cx, 0.9, 0], s.material('#a87648', { roughness: 0.7 }), 48);
    } else if (a.stand === 'plinth') {
      Y = 0.9;
      const w = (Rx + 0.03) * 1.7;
      s.box([w, Y - 0.03, w], [cx, (Y - 0.03) / 2, 0], s.material('#17181c', { roughness: 0.15, metalness: 0.3 }));
      const glow = new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.9, 0.7);
      s.box([w + 0.02, 0.03, w + 0.02], [cx, Y - 0.015, 0], s.material(glow, { emissive: glow, emissiveIntensity: mix(0.5, 1.6, mood.cheer) }));
    }
    const trayH = 0.022;
    s.lathe([[0, 0], [supportR - 0.03, 0], [supportR, 0.012], [supportR + 0.012, 0.03], [supportR + 0.004, 0.03], [supportR - 0.012, trayH], [0, trayH]], metal, [cx, Y, 0]).scale.x = oval;
    for (const side of [-1, 1]) {
      const grip = s.ring(0.05, 0.008, [cx + side * (Rx + 0.03), Y + 0.03, 0], metal, Math.PI);
      grip.rotation.set(-Math.PI / 2, 0, side * -Math.PI / 2);
    }
    const base = Y + trayH;

    // Plan the pyramid.
    interface Glass { b: number; i: number; j: number; x: number; z: number; gone: boolean; fill: number }
    const glasses: Glass[] = [];
    const at = new Map<string, Glass>();
    for (let b = 0; b < L; b++) {
      const m = L - b;
      for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
        const g: Glass = { b, i, j, x: (i - (m - 1) / 2) * d, z: (j - (m - 1) / 2) * d, gone: false, fill: 0 };
        glasses.push(g);
        at.set(`${b},${i},${j}`, g);
      }
    }
    let wet = 0;
    const sx = random() < 0.5 ? -1 : 1, sz = random() < 0.35 ? -1 : 1;
    if (a.state === 'full') for (const g of glasses) g.fill = 2;
    if (a.state === 'pouring') {
      wet = 1 + Math.floor(random() * (L - 1));
      for (const g of glasses) { const t = L - 1 - g.b; g.fill = t < wet ? 2 : t === wet ? 1 : 0; }
    }
    if (a.state === 'collapsed') {
      const c1 = d * (L - 2) * mix(0.1, 0.8, random());
      for (const g of glasses) {
        g.fill = 2;
        if (g.b >= 1 && (g.x * sx + g.z * sz) > c1 - (g.b - 1) * d + 0.001) g.gone = true;
      }
    }
    if (a.state === 'raided') {
      for (let b = L - 1; b >= 0; b--) for (const g of glasses) {
        if (g.b !== b) continue;
        let free = true;
        for (const di of [-1, 0]) for (const dj of [-1, 0]) { const up = at.get(`${b + 1},${g.i + di},${g.j + dj}`); if (up && !up.gone) free = false; }
        if (free && random() < (b === 0 ? 0.35 : 0.72)) g.gone = true;
        g.fill = random() < 0.45 ? 0 : random() < 0.75 ? 1 : 2;
      }
    }

    // Geometry shared by every glass.
    const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 16);
    const coupe = lathe([[0, 0.002], [0.034, 0], [0.034, 0.003], [0.007, 0.009], [0.0055, 0.07], [0.02, 0.078], [0.04, 0.092], [0.05, 0.11], [0.052, 0.13]]);
    const fullGeo = lathe([[0, 0.08], [0.019, 0.08], [0.038, 0.093], [0.048, 0.11], [0.0495, 0.124], [0, 0.124]]);
    const halfGeo = lathe([[0, 0.08], [0.019, 0.08], [0.038, 0.093], [0.043, 0.1], [0, 0.1]]);
    const glassMat = new THREE.MeshStandardMaterial({ color: '#dcecf2', transparent: true, opacity: 0.46, roughness: 0.06, metalness: 0.15, side: THREE.DoubleSide });
    const liquid = s.material(spec.liquid, { roughness: 0.15, emissive: spec.liquid, emissiveIntensity: mix(0.08, 0.35, mood.cheer) });
    const sheer = new THREE.MeshStandardMaterial({ color: spec.liquid, transparent: true, opacity: 0.6, depthWrite: false, roughness: 0.1, emissive: spec.liquid, emissiveIntensity: 0.25 });

    const upright: THREE.Matrix4[] = [], fulls: THREE.Matrix4[] = [], halves: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    const pose = (x: number, y: number, z: number, euler?: THREE.Euler) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), euler ? new THREE.Quaternion().setFromEuler(euler) : q, one);
    for (const g of glasses) {
      if (g.gone) continue;
      const m = pose(g.x, base + g.b * H, g.z);
      upright.push(m);
      if (g.fill === 2) fulls.push(m);
      if (g.fill === 1) halves.push(m);
    }
    const goneCount = glasses.filter((g) => g.gone).length;

    // Glasses that have left the stack.
    const ground = (rho: number) => (rho < supportR - 0.04 ? base : rho < supportR + 0.03 && (a.stand === 'table' || a.stand === 'plinth') ? Y : 0);
    const puddles: [number, number, number, number][] = [];
    if (a.state === 'collapsed') {
      const lying = Math.min(goneCount, 12);
      for (let k = 0; k < lying; k++) {
        const along = half * 0.4 + random() * (supportR + 0.25 - half * 0.4), across = (random() - 0.5) * 0.7;
        const x = (sx * along + sz * across * 0.7) * 0.75, z = (sz * along - sx * across * 0.7) * 0.75;
        const rho = Math.hypot(x, z);
        if (rho < half * 1.1) continue;
        const floor = ground(rho);
        upright.push(pose(x, floor + 0.05, z, new THREE.Euler(random() * 0.25, random() * TAU, Math.PI / 2 + (random() - 0.5) * 0.3, 'YXZ')));
        if (random() < 0.6) puddles.push([x, floor, z, 0.05 + random() * 0.07]);
      }
      // A couple caught tilting on the surviving tiers.
      for (let k = 0; k < 2; k++) upright.push(pose(sx * d * (0.6 + k * 0.7), base + H + 0.03, sz * d * (0.5 + k * 0.5), new THREE.Euler(0.9 * sz, random() * TAU, -0.9 * sx, 'YXZ')));
      puddles.push([sx * half * 0.9, base, sz * half * 0.9, 0.16]);
      const shardGeo = new THREE.TetrahedronGeometry(1);
      shardGeo.scale(1, 0.25, 0.7);
      const shards: { at: [number, number, number]; size: number }[] = [];
      for (let k = 0; k < 40 + goneCount * 3; k++) {
        const along = half * 0.5 + random() * (supportR + 0.4 - half * 0.5), across = (random() - 0.5) * 0.9;
        const x = (sx * along + sz * across) * 0.72, z = (sz * along - sx * across) * 0.72;
        shards.push({ at: [x, ground(Math.hypot(x, z)) + 0.004, z], size: 0.008 + random() * 0.016 });
      }
      s.scatter(shardGeo, new THREE.MeshStandardMaterial({ color: '#f4fbff', roughness: 0.05, metalness: 0.4 }), shards);
    }
    if (a.state === 'raided') {
      const left = Math.min(goneCount, 3 + Math.round(mood.density * 5));
      for (let k = 0; k < left; k++) {
        const th = random() * TAU, rho = supportR - 0.07;
        if (Math.abs(Math.sin(th) * rho) < half + 0.06 && Math.abs(Math.cos(th) * rho) < half + 0.06) continue;
        const m = pose(Math.sin(th) * rho, base, Math.cos(th) * rho);
        upright.push(m);
        if (random() < 0.5) halves.push(m);
      }
    }
    for (const [x, y, z, r] of puddles) s.cylinder(r, r * 1.05, 0.004, [x, y + 0.002, z], sheer, 20).scale.set(1, 1, 0.7 + random() * 0.5);

    const instance = (geometry: THREE.BufferGeometry, material: THREE.Material, mats: THREE.Matrix4[]) => {
      if (!mats.length) { geometry.dispose(); return null; }
      const mesh = new THREE.InstancedMesh(geometry, material, mats.length);
      mats.forEach((m, k) => mesh.setMatrixAt(k, m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    instance(fullGeo, liquid, fulls);
    instance(halfGeo, liquid, halves);
    const stack = instance(coupe, glassMat, upright);
    if (stack) stack.renderOrder = 2;

    // Paper straws for the children's version.
    if (a.drink === 'kids') {
      const straws: THREE.Matrix4[] = [];
      for (const m of [...fulls, ...halves]) {
        if (random() < 0.35) continue;
        const p = new THREE.Vector3().setFromMatrixPosition(m);
        straws.push(pose(p.x + 0.012, p.y + 0.15, p.z, new THREE.Euler(0, random() * TAU, 0.32, 'YXZ')));
      }
      const mesh = instance(new THREE.CylinderGeometry(0.0035, 0.0035, 0.14, 6), s.material('#ffffff'), straws);
      if (mesh) { straws.forEach((_m, k) => mesh.setColorAt(k, new THREE.Color(['#e63946', '#2a9d8f', '#f4c430', '#ffffff', '#ff6fb5'][k % 5]))); mesh.instanceColor!.needsUpdate = true; }
    }

    // The bottle.
    const size = a.magnum ? 1.45 : 1;
    const makeBottle = (open: boolean) => {
      const g = new THREE.Group();
      const glass = spec.clear
        ? new THREE.MeshStandardMaterial({ color: spec.bottle, transparent: true, opacity: 0.72, roughness: 0.1 })
        : s.material(spec.bottle, { roughness: 0.18, metalness: 0.2 });
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.006], [0.04, 0], [0.045, 0.012], [0.045, 0.17], [0.036, 0.215], [0.017, 0.265], [0.0155, 0.31], [0.018, 0.312], [0.018, 0.32]].map(([x, y]) => new THREE.Vector2(x, y)), 20), glass);
      const foil = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.02, open ? 0.05 : 0.075, 14), s.material(spec.foil, { metalness: 0.7, roughness: 0.3 }));
      foil.position.y = open ? 0.283 : 0.3;
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0462, 0.0462, 0.09, 20, 1, true, -1.1, 2.2), s.material(a.drink === 'kids' ? '#ffffff' : '#f1e7cc', { side: THREE.DoubleSide }));
      label.position.y = 0.1;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0466, 0.0466, 0.018, 20, 1, true, -1.1, 2.2), s.material(spec.foil, { side: THREE.DoubleSide, metalness: 0.5 }));
      band.position.y = 0.1;
      g.add(body, foil, label, band);
      g.traverse((m) => { m.castShadow = true; });
      g.scale.setScalar(size);
      return g;
    };
    const topY = base + (L - 1) * H + 0.13;
    let stream: THREE.Mesh | null = null;
    const drips: THREE.Mesh[] = [];
    if (a.state === 'pouring') {
      const arm = new THREE.Group();
      const bottle = makeBottle(true);
      const tilt = 2.0 + random() * 0.2, len = 0.32 * size;
      bottle.rotation.z = -tilt;
      bottle.position.set(-Math.sin(tilt) * len, -Math.cos(tilt) * len, 0);
      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.064, 14, 10), s.material('#fbfbf8'));
      glove.scale.set(1, 0.8, 1); glove.position.y = 0.01 / size;
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.05, 0.16, 14), s.material('#17171c'));
      sleeve.position.y = -0.14 / size;
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 14), s.material('#fbfbf8'));
      cuff.position.y = -0.045 / size;
      for (const part of [glove, sleeve, cuff]) { part.scale.multiplyScalar(1 / size); part.castShadow = true; bottle.add(part); }
      arm.add(bottle);
      arm.position.set(0, topY + 0.2, 0);
      arm.rotation.y = (random() - 0.5) * 1.6;
      s.root.add(arm);
      stream = s.cylinder(0.006, 0.01, 0.2 - 0.008, [0, topY + 0.1 - 0.006, 0], sheer, 8);
      stream.castShadow = false;
      // Overflow running from rim to rim.
      const falls: THREE.Matrix4[] = [];
      for (const g of glasses) {
        if (L - 1 - g.b >= wet || g.b === 0) continue;
        for (const ex of [-1, 1]) for (const ez of [-1, 1]) falls.push(pose(g.x + ex * 0.04, base + g.b * H + 0.062, g.z + ez * 0.04));
      }
      const fall = instance(new THREE.CylinderGeometry(0.004, 0.006, 0.13, 6), sheer, falls);
      if (fall) { fall.castShadow = false; drips.push(fall); }
      const foam = s.cylinder(0.049, 0.049, 0.008, [0, topY - 0.004, 0], s.material('#fff8e6', { roughness: 0.9 }), 16);
      foam.castShadow = false;
    } else {
      // An ice bucket beside the stack.
      const bx = half + 0.145, bz = 0.03;
      s.lathe([[0, 0], [0.085, 0], [0.09, 0.01], [0.115, 0.2], [0.122, 0.205], [0.11, 0.2], [0.082, 0.014], [0, 0.014]], metal, [bx, base, bz]);
      const ice: { at: [number, number, number]; size: number }[] = [];
      for (let k = 0; k < 16; k++) { const th = random() * TAU, rr = random() * 0.09; ice.push({ at: [bx + Math.sin(th) * rr, base + 0.17 + random() * 0.04, bz + Math.cos(th) * rr], size: 0.024 + random() * 0.01 }); }
      s.scatter(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#eaf6fb', roughness: 0.15, transparent: true, opacity: 0.8 }), ice);
      const bottle = makeBottle(a.state !== 'waiting');
      bottle.position.set(bx - 0.02, base + 0.03, bz);
      bottle.rotation.set(0.12, random() * TAU, 0.3);
      s.root.add(bottle);
      if (a.state === 'waiting' && mood.density > 0.35) {
        const spare = makeBottle(false);
        spare.position.set(-half * 0.95, base, half * 0.95 + 0.02);
        spare.rotation.y = random() * TAU;
        s.root.add(spare);
      }
      if (a.state === 'raided' || a.state === 'collapsed') {
        const cork = s.cylinder(0.012, 0.015, 0.035, [bx - 0.05, base + 0.012, bz + 0.15], s.material('#c9a36a'), 10);
        cork.rotation.z = Math.PI / 2;
      }
    }

    // Garnish round the tray edge.
    const ringR = supportR - 0.045;
    const ox = (th: number) => cx + Math.sin(th) * ringR * oval;
    const clear = (_th: number) => true;
    const sparks: THREE.MeshStandardMaterial[] = [];
    if (a.garnish === 'berries' || a.garnish === 'flowers') {
      const pts: { at: [number, number, number]; size: number; color: string }[] = [];
      const count = Math.round(ringR * TAU / 0.045 * mix(0.5, 1, mood.density));
      const rose = [['#e9a9b4', '#f6d9d6', '#c9707f'], ['#f3ead8', '#f1c9a4', '#e8a04a'], ['#b0445a', '#7c1f36', '#e7b1bd']][Math.floor(random() * 3)];
      for (let k = 0; k < count; k++) {
        const th = k / count * TAU + random() * 0.08;
        if (!clear(th)) continue;
        const berry = a.garnish === 'berries';
        pts.push({ at: [ox(th), base + (berry ? 0.016 : 0.02), Math.cos(th) * ringR], size: berry ? 0.016 + random() * 0.006 : 0.02 + random() * 0.012, color: berry ? (random() < 0.85 ? '#cf2233' : '#7d1220') : rose[Math.floor(random() * 3)] });
        if (k % 2 === 0) pts.push({ at: [ox(th + 0.05), base + 0.03, Math.cos(th + 0.05) * ringR], size: 0.011, color: '#5c8046' });
      }
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.6 }), pts);
    }
    if (a.garnish === 'lights') {
      const bulb = new THREE.Color().setHSL(mix(0.15, 0.08, mood.warmth), 1, 0.72);
      const mat = s.material(bulb, { emissive: bulb, emissiveIntensity: mix(0.9, 2.2, mood.cheer) });
      sparks.push(mat);
      const pts: { at: [number, number, number]; size: number }[] = [], wire: [number, number, number][] = [];
      const count = Math.round(ringR * TAU / 0.04);
      for (let k = 0; k < count; k++) {
        const th = k / count * TAU, rr = ringR + Math.sin(k * 1.9) * 0.012;
        wire.push([cx + Math.sin(th) * rr * oval, base + 0.008, Math.cos(th) * rr]);
        pts.push({ at: [cx + Math.sin(th) * rr * oval, base + 0.014, Math.cos(th) * rr], size: 0.008 });
      }
      s.tube(wire, 0.002, s.material('#3d4a3a'), true);
      s.scatter(new THREE.SphereGeometry(1, 6, 4), mat, pts).castShadow = false;
    }
    if (a.garnish === 'sparklers') {
      const hot = s.material('#fff3c4', { emissive: '#ffd27a', emissiveIntensity: 2.2 });
      sparks.push(hot);
      const count = 4 + Math.round(mood.density * 4);
      const pts: { at: [number, number, number]; size: number }[] = [];
      for (let k = 0; k < count; k++) {
        const th = (k + 0.5) / count * TAU;
        if (!clear(th)) continue;
        const x = ox(th), z = Math.cos(th) * ringR, tipY = base + 0.26 + random() * 0.08;
        s.rod([x, base, z], [x, tipY, z], 0.002, s.material('#77797c'));
        for (let j = 0; j < 14; j++) {
          const v = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize().multiplyScalar(0.01 + random() * 0.04);
          pts.push({ at: [x + v.x, tipY + v.y, z + v.z], size: j === 0 ? 0.012 : 0.004 });
        }
      }
      s.scatter(new THREE.SphereGeometry(1, 6, 4), hot, pts).castShadow = false;
    }

    return s.finish({
      update: (_dt, time) => {
        const e = mood.energy;
        if (stream) stream.scale.x = stream.scale.z = 1 + Math.sin(time * 9) * 0.25 * e;
        for (const fall of drips) fall.position.y = Math.sin(time * 14) * 0.004 * e;
        sparks.forEach((mat, k) => { mat.emissiveIntensity = (a.garnish === 'sparklers' ? 2.2 : mix(0.9, 2.2, mood.cheer)) * (1 + Math.sin(time * (a.garnish === 'sparklers' ? 31 : 2.3) + k) * 0.35 * e); });
      },
    });
  },
});
