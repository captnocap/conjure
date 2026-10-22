import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

interface Tyre { p: THREE.Vector3; q: THREE.Quaternion; r: number; w: number; lug: boolean; flat: boolean }

export default defineThing({
  questions: {
    size: score('How big is the mound?', ['A few tyres dumped off a pickup', 'A car-sized pile', 'A heap taller than a person', 'A black mountain']),
    mix: choice('What tyres are in it?', {
      cars: 'All car tyres, small and alike.',
      trucks: 'Fat truck and bus tyres.',
      tractor: 'Car tyres with a few huge lugged tractor tyres among them.',
      mixed: 'Everything: car, van, truck, a tractor tyre or two, all sizes jumbled.',
    }),
    order: choice('How are they arranged?', {
      tumbled: 'Tumbled where they were tipped, a slumping cone.',
      stacked: 'Stacked in neat columns like coins, somebody’s careful work.',
      laced: 'Laced in overlapping herringbone rows, the way a yard stores them.',
      strewn: 'Strewn wide and thin across the ground, some rolled off on their own.',
    }),
    fate: choice('What is happening to the mound?', {
      rain: 'Nothing: it just sits there holding old rainwater.',
      burning: 'It is on fire: orange glow deep in the rubber and a column of black smoke.',
      flooded: 'Standing water has risen around it and the lowest tyres are half drowned.',
      nesting: 'Birds have made it a nesting ground: twig nests and eggs in the tyres.',
      overgrown: 'Brambles, grass and a sapling are growing up through it.',
    }),
    oddity: choice('Is there one odd thing among the tyres?', {
      none: 'No, only tyres.',
      planter: 'One tyre painted white and planted with red flowers.',
      sign: 'A hand-painted NO DUMPING sign on a stake.',
      cone: 'A traffic cone jammed on top like a flag.',
      whitewall: 'A pristine set of whitewall tyres from some long-gone classic car.',
    }),
    rims: noul('Do some tyres still have their steel wheels in them?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = { tumbled: 1, stacked: 0.9, laced: 0.95, strewn: 1.25 }[a.order] * mix(1.1, 4.2, a.size);
    const want = Math.max(5, Math.round(mix(7, 150, a.size ** 1.4) * mix(0.75, 1.2, mood.density) * (a.mix === 'trucks' ? 0.55 : 1) * (a.order === 'strewn' ? 0.4 : 1)));
    const kind = (): { r: number; w: number; lug: boolean } => {
      const u = random();
      if (a.mix === 'cars') return { r: mix(0.29, 0.34, random()), w: 0.62, lug: false };
      if (a.mix === 'trucks') return { r: mix(0.48, 0.56, random()), w: 0.56, lug: false };
      if (a.mix === 'tractor') return u < 0.1 ? { r: mix(0.7, 0.9, random()), w: 0.5, lug: true } : { r: mix(0.29, 0.34, random()), w: 0.62, lug: false };
      return u < 0.06 ? { r: mix(0.7, 0.85, random()), w: 0.5, lug: true } : u < 0.3 ? { r: mix(0.48, 0.56, random()), w: 0.56, lug: false } : u < 0.45 ? { r: 0.37, w: 0.6, lug: false } : { r: mix(0.28, 0.34, random()), w: 0.62, lug: false };
    };
    const tyres: Tyre[] = [];
    const euler = new THREE.Euler();
    const turned = (x: number, y: number, z: number, order: THREE.EulerOrder = 'YXZ') => new THREE.Quaternion().setFromEuler(euler.set(x, y, z, order));

    if (a.order === 'tumbled' || a.order === 'strewn') {
      // Drop tyres one at a time onto a height field so the heap piles up without floating.
      const cell = 0.14, span = R + 2.2, n = Math.ceil(span * 2 / cell);
      const field = new Float32Array(n * n);
      const over = (x: number, z: number, r: number, fn: (i: number) => void) => {
        const x0 = Math.max(0, Math.floor((x - r + span) / cell)), x1 = Math.min(n - 1, Math.ceil((x + r + span) / cell));
        const z0 = Math.max(0, Math.floor((z - r + span) / cell)), z1 = Math.min(n - 1, Math.ceil((z + r + span) / cell));
        for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) if (Math.hypot(i * cell - span - x, j * cell - span - z) <= r) fn(i * n + j);
      };
      for (let i = 0; i < want; i++) {
        const k = kind(), spread = a.order === 'strewn' ? 1 : 0.72, hw = k.r * k.w * 0.5;
        // Each tyre tries a few spots and settles in the lowest, so the heap slumps instead of towering.
        let x = 0, z = 0, base = Infinity;
        for (let attempt = 0; attempt < (a.order === 'strewn' ? 5 : 2); attempt++) {
          const t = random() * 6.28, d = R * spread * random() ** 0.62;
          const cx = Math.cos(t) * d, cz = Math.sin(t) * d * 0.9;
          let found = 0;
          over(cx, cz, k.r * 0.75, (c) => { found = Math.max(found, field[c]); });
          if (found + d * 0.12 < base) { base = found + d * 0.12; x = cx; z = cz; }
        }
        base = 0;
        over(x, z, k.r * 0.75, (c) => { base = Math.max(base, field[c]); });
        const standing = random() < (a.order === 'strewn' ? 0.12 : 0.08) && base < 0.3;
        const tilt = standing ? mix(1.2, 1.5, random()) : random() ** 1.6 * mix(0.25, 0.75, mood.energy * 0.5 + 0.5);
        const y = base + hw * Math.cos(tilt) + k.r * Math.sin(tilt) * (standing ? 1 : 0.55);
        tyres.push({ p: new THREE.Vector3(x, y, z), q: turned(tilt, random() * 6.28, 0), ...k, flat: tilt < 0.22 });
        if (!standing) over(x, z, k.r * 0.95, (c) => { field[c] = Math.max(field[c], base + hw * 1.55); });
      }
      for (const tyre of tyres) if (tyre.flat) { let top = 0; over(tyre.p.x, tyre.p.z, tyre.r * 0.4, (c) => { top = Math.max(top, field[c]); }); tyre.flat = top <= tyre.p.y + tyre.r * tyre.w * 0.5; }
    } else if (a.order === 'stacked') {
      const k0 = kind(), pitch = k0.r * 2.08;
      const columns: [number, number][] = [];
      for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) {
        const x = (i + (j % 2 ? 0.5 : 0)) * pitch, z = j * pitch * 0.87;
        if (Math.hypot(x, z) < Math.max(Math.min(R * 0.75, Math.sqrt(want / 5) * pitch * 0.56), pitch * 0.8)) columns.push([x, z]);
      }
      const per = Math.max(2, Math.min(10, Math.round(want / Math.max(columns.length, 1))));
      columns.forEach(([x, z], index) => {
        const k = a.mix === 'cars' || a.mix === 'trucks' ? k0 : { ...kind(), lug: false };
        const r = Math.min(k.r, k0.r), hw = r * k.w * 0.5;
        const fallen = index > 0 && random() < mood.wear * 0.25;
        const height = Math.max(1, Math.round(per * mix(0.6, 1.25, random())));
        for (let h = 0; h < height; h++) {
          if (fallen && h > 1) tyres.push({ p: new THREE.Vector3(x + (h - 1) * r * 0.9, hw + 0.1 + r * 0.25, z + (random() - 0.5) * 0.3), q: turned(0, random() * 6.28, 0.5 + random() * 0.3, 'YZX'), r, w: k.w, lug: false, flat: false });
          else tyres.push({ p: new THREE.Vector3(x + (random() - 0.5) * 0.05, hw + h * hw * 1.96, z + (random() - 0.5) * 0.05), q: turned(0, random() * 6.28, 0), r, w: k.w, lug: false, flat: h === height - 1 || (fallen && h === 1) });
        }
      });
    } else {
      const k0 = kind(), r = Math.min(k0.r, 0.56), hw = r * k0.w * 0.5, lean = 1.12;
      const dx = 2 * hw / Math.sin(lean) * 1.04, rows = Math.max(1, Math.round(R * 1.3 / (r * 2.05))), per = Math.max(3, Math.round(R * 1.6 / dx));
      const tiers = a.size > 0.55 ? 2 : 1;
      for (let tier = 0; tier < tiers; tier++) for (let row = 0; row < rows; row++) {
        const dir = (row + tier) % 2 ? 1 : -1;
        for (let i = 0; i < per - tier * 2; i++) {
          if (random() < mood.wear * 0.08) continue;
          tyres.push({ p: new THREE.Vector3((i - (per - tier * 2 - 1) / 2) * dx, r * Math.sin(lean) + hw * Math.cos(lean) + tier * r * 1.35, (row - (rows - 1) / 2) * r * 2.06), q: turned(0, 0, dir * lean + (random() - 0.5) * 0.06, 'YZX'), r, w: k0.w, lug: false, flat: false });
        }
      }
      for (let i = 0; i < 3; i++) tyres.push({ p: new THREE.Vector3((random() - 0.5) * R, hw, (rows / 2 + 0.7 + random() * 0.5) * r * 2.06), q: turned(0, random() * 6, 0), r, w: k0.w, lug: false, flat: true });
    }

    // Two tyre shapes, drawn as instances.
    const section = (inner: number, w: number, block: number) => [[inner, -w * 0.38], [inner + 0.1, -w * 0.5], [0.9, -w * 0.5], [1, -w * 0.4 * block], [1, w * 0.4 * block], [0.9, w * 0.5], [inner + 0.1, w * 0.5], [inner, w * 0.38]].map(([x, y]) => new THREE.Vector2(x, y));
    const burning = a.fate === 'burning';
    const rubber = new THREE.MeshStandardMaterial({ roughness: mix(0.75, 0.95, mood.wear), side: THREE.DoubleSide });
    const matrix = new THREE.Matrix4(), scale = new THREE.Vector3(), tint = new THREE.Color();
    for (const lug of [false, true]) {
      const set = tyres.filter((tyre) => tyre.lug === lug);
      if (!set.length) continue;
      const geometry = new THREE.LatheGeometry(lug ? section(0.52, 1, 1.25) : section(0.6, 1, 1), lug ? 14 : 20);
      const mesh = new THREE.InstancedMesh(geometry, rubber, set.length);
      set.forEach((tyre, i) => {
        mesh.setMatrixAt(i, matrix.compose(tyre.p, tyre.q, scale.set(tyre.r, tyre.r * tyre.w, tyre.r)));
        const grey = mix(0.012, 0.05, random()) + mood.wear * 0.02;
        tint.setRGB(grey, grey, grey * 1.05);
        if (a.oddity === 'whitewall' && i < 4 && !lug) tint.set('#e9e6dc');
        if (burning && random() < 0.3) tint.set('#0b0a0a');
        mesh.setColorAt(i, tint);
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    if (a.rims) {
      const set = tyres.filter((_tyre, i) => i % 4 === 1);
      const rim = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 16), new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.5 }), set.length);
      set.forEach((tyre, i) => {
        rim.setMatrixAt(i, matrix.compose(tyre.p, tyre.q, scale.set(tyre.r, tyre.r * tyre.w, tyre.r)));
        rim.setColorAt(i, tint.set(random() < 0.5 ? '#a9adae' : '#8a5a3c').lerp(new THREE.Color('#7a4a2e'), mood.wear * 0.6));
      });
      rim.castShadow = true;
      s.root.add(rim);
    }

    // Ground, water, weeds.
    const reach = tyres.reduce((far, tyre) => Math.max(far, Math.hypot(tyre.p.x, tyre.p.z) + tyre.r), 1) + 0.5;
    const peak = tyres.reduce((high, tyre) => Math.max(high, tyre.p.y + tyre.r * 0.4), 0.3);
    s.cylinder(reach, reach + 0.12, 0.06, [0, 0.0, 0], s.material(burning ? '#3a342e' : '#6f6250', { roughness: 1 }), 30);
    const water = new THREE.MeshStandardMaterial({ color: new THREE.Color('#5f7a80').lerp(new THREE.Color('#6b6a45'), mood.wear * 0.6), roughness: 0.08, metalness: 0.35 });
    const tops = tyres.filter((tyre) => tyre.flat && !(a.rims && tyres.indexOf(tyre) % 4 === 1));
    if (a.fate === 'flooded') s.cylinder(reach - 0.05, reach - 0.05, 0.02, [0, mix(0.12, 0.26, mood.density), 0], water, 30);
    if (!burning) for (const tyre of tops.slice(0, a.fate === 'nesting' ? 3 : 14)) s.cylinder(tyre.r * 0.66, tyre.r * 0.66, 0.01, [tyre.p.x, tyre.p.y + tyre.r * tyre.w * 0.2, tyre.p.z], water, 14);
    if (a.fate === 'rain' || a.fate === 'overgrown') for (let i = 0; i < 3; i++) {
      const t = random() * 6.28;
      s.cylinder(0.3 + random() * 0.5, 0.3, 0.008, [Math.cos(t) * reach * 0.8, 0.034, Math.sin(t) * reach * 0.8], water, 12).scale.z = 0.6;
    }
    const wild = a.fate === 'overgrown' ? 1 : a.fate === 'burning' ? 0 : 0.15;
    const green = () => new THREE.Color().setHSL(mix(0.2, 0.3, random()), 0.6, mix(0.1, 0.2, random())).lerp(new THREE.Color('#9a8a4a'), mood.warmth * 0.3 * (1 - mood.cheer));
    if (wild > 0) {
      s.scatter(new THREE.ConeGeometry(0.035, 0.32, 4).translate(0, 0.16, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), Array.from({ length: Math.round(wild * mix(30, 60, mood.density) * reach) + 14 }, () => {
        const t = random() * 6.28, d = reach * mix(wild > 0.5 ? 0.15 : 0.6, 1, Math.sqrt(random()));
        const host = wild > 0.5 && random() < 0.35 && tops.length ? tops[Math.floor(random() * tops.length)] : null;
        return { at: host ? [host.p.x + (random() - 0.5) * host.r * 0.6, host.p.y, host.p.z + (random() - 0.5) * host.r * 0.6] as const : [Math.cos(t) * d, 0.03, Math.sin(t) * d] as const, size: 0.5 + random() * 0.9, color: green() };
      }));
      for (let i = 0; i < (wild > 0.5 ? 5 : 2); i++) {
        const host = tops.length && i < 3 ? tops[Math.floor(random() * tops.length)] : null;
        const t = random() * 6.28, bx = host ? host.p.x : Math.cos(t) * reach * 0.7, bz = host ? host.p.z : Math.sin(t) * reach * 0.7, by = host ? host.p.y - 0.1 : 0;
        const h = (wild > 0.5 && i === 0 ? 1.9 : 0.5) + random() * 0.6;
        s.tube([[bx, by, bz], [bx + 0.05, by + h * 0.5, bz + 0.04], [bx - 0.04, by + h, bz]], 0.012 + h * 0.008, s.material('#5c5236'));
        const leaves = Array.from({ length: Math.round(h * 14) }, (_u, n) => ({ at: [bx + Math.cos(n * 2.4) * 0.14 * (0.4 + h * 0.4), by + h * mix(0.3, 1.05, random()), bz + Math.sin(n * 2.4) * 0.14 * (0.4 + h * 0.4)] as const, size: 0.05 + random() * 0.06 + h * 0.02, color: green() }));
        s.scatter(new THREE.IcosahedronGeometry(1, 0).scale(1, 0.35, 0.7), new THREE.MeshStandardMaterial({ roughness: 0.9 }), leaves);
      }
    }
    if (a.fate === 'nesting') {
      const twig = s.material('#7d6644', { roughness: 1 }), shell = s.material('#d9e2cf', { roughness: 0.6 }), feather = s.material('#eeece4'), wingGrey = s.material('#9aa4aa');
      tops.slice(-Math.min(tops.length, 2 + Math.round(a.size * 5))).forEach((tyre, i) => {
        const y = tyre.p.y + tyre.r * tyre.w * 0.3, r = Math.min(0.24, tyre.r * 0.6);
        s.ring(r * 0.8, r * 0.3, [tyre.p.x, y, tyre.p.z], twig).rotation.x = Math.PI / 2;
        for (let k = 0; k < 7; k++) { const t = random() * 6.28; s.rod([tyre.p.x + Math.cos(t) * r * 0.5, y + 0.02, tyre.p.z + Math.sin(t) * r * 0.5], [tyre.p.x + Math.cos(t + 0.9) * r * 1.5, y + 0.05 + random() * 0.05, tyre.p.z + Math.sin(t + 0.9) * r * 1.5], 0.008, twig); }
        if (i % 2 === 0) {
          const yaw = random() * 6.28, fx = Math.cos(yaw), fz = Math.sin(yaw);
          s.ball([0.11, 0.09, 0.11], [tyre.p.x, y + 0.08, tyre.p.z], feather, 10);
          s.ball([0.12, 0.05, 0.1], [tyre.p.x - fx * 0.04, y + 0.11, tyre.p.z - fz * 0.04], wingGrey, 8).rotation.y = -yaw;
          s.ball([0.055, 0.055, 0.055], [tyre.p.x + fx * 0.1, y + 0.17, tyre.p.z + fz * 0.1], feather, 8);
          s.rod([tyre.p.x + fx * 0.14, y + 0.165, tyre.p.z + fz * 0.14], [tyre.p.x + fx * 0.22, y + 0.15, tyre.p.z + fz * 0.22], 0.014, s.material('#e3ae2c'), 0.003);
        } else for (let k = 0; k < 3; k++) s.ball([0.035, 0.045, 0.035], [tyre.p.x + Math.cos(k * 2.1) * 0.045, y + 0.05, tyre.p.z + Math.sin(k * 2.1) * 0.045], shell, 8);
      });
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.3, 6), new THREE.MeshStandardMaterial({ color: '#efeee6', roughness: 0.9 }), tyres.slice(0, 30).map((tyre) => ({ at: [tyre.p.x + (random() - 0.5) * tyre.r, tyre.p.y + tyre.r * tyre.w * 0.5, tyre.p.z + (random() - 0.5) * tyre.r] as const, size: 0.02 + random() * 0.03 })));
    }

    // Fire.
    const flames: THREE.Mesh[] = [], puffs: { mesh: THREE.Mesh; phase: number; material: THREE.MeshStandardMaterial }[] = [];
    if (burning) {
      const ember = new THREE.MeshStandardMaterial({ color: '#ff7a1a', emissive: '#ff5a0a', emissiveIntensity: 2.2, roughness: 1 });
      const profile = [[0, 0], [0.5, 0.12], [0.62, 0.4], [0.4, 0.95], [0.12, 1.6], [0, 2]].map(([x, y]) => new THREE.Vector2(x, y));
      const count = Math.max(3, Math.round(mix(3, 12, a.size) * mix(0.6, 1.3, mood.energy)));
      for (let i = 0; i < count; i++) {
        const host = tyres[Math.floor(random() * tyres.length)], size = mix(0.25, 0.6, random()) * mix(0.8, 1.6, a.size);
        s.ball([host.r * 0.55, host.r * 0.25, host.r * 0.55], [host.p.x, host.p.y, host.p.z], ember, 8).castShadow = false;
        for (const [hex, k] of [['#ff8a1c', 1], ['#ffe07a', 0.5]] as const) {
          const flame = s.mesh(new THREE.LatheGeometry(profile, 9), new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 2, transparent: true, opacity: k === 1 ? 0.8 : 0.95, depthWrite: false, roughness: 1 }), [host.p.x, host.p.y + host.r * 0.1, host.p.z]);
          flame.castShadow = false;
          flame.scale.set(size * k, size * k, size * k);
          flame.userData.size = size * k;
          flame.userData.phase = random() * 6.28;
          flames.push(flame);
        }
      }
      const plume = Math.round(mix(6, 14, a.size));
      for (let i = 0; i < plume; i++) {
        const material = new THREE.MeshStandardMaterial({ color: '#151414', transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 });
        const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), material);
        s.root.add(mesh);
        puffs.push({ mesh, phase: i / plume + random() * 0.05, material });
      }
    }
    const lean = (random() - 0.5) * 2, tall = peak + mix(3, 8, a.size);
    const smoke = (time: number) => {
      for (const puff of puffs) {
        const t = (time * mix(0.05, 0.16, mood.energy) + puff.phase) % 1;
        puff.mesh.position.set(lean * t * t * tall * 0.4 + Math.sin(puff.phase * 40) * 0.3 * t, peak * 0.7 + t * tall, -t * t * tall * 0.25);
        puff.mesh.scale.setScalar(mix(0.35, 1.5, t) * mix(0.8, 1.7, a.size));
        puff.material.opacity = Math.min(1, t * 8) * (1 - t) * 0.75;
      }
    };
    smoke(0.4);

    // The odd one out.
    const hostTop = tops.length ? tops.reduce((best, tyre) => (tyre.p.y > best.p.y ? tyre : best)) : tyres[0];
    if (a.oddity === 'planter') {
      const x = reach * 0.72, z = reach * 0.45;
      s.mesh(new THREE.LatheGeometry(section(0.6, 0.62, 1), 24), s.material('#f1eee2', { side: THREE.DoubleSide }), [x, 0.14, z]).scale.setScalar(0.36);
      s.cylinder(0.22, 0.22, 0.16, [x, 0.12, z], s.material('#4a3a2a'), 12);
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.7 }), Array.from({ length: 22 }, (_u, i) => ({ at: [x + (random() - 0.5) * 0.36, 0.24 + random() * 0.16, z + (random() - 0.5) * 0.36] as const, size: 0.035 + random() * 0.03, color: i % 3 ? '#d5303a' : '#4f8f3c' })));
    }
    if (a.oddity === 'sign') {
      const x = -reach * 0.75, z = reach * 0.5;
      s.rod([x, 0, z], [x + 0.06, 1.25, z], 0.03, s.material('#8a7355'));
      const board = s.label('NO DUMPING', 1.0, 0.36, [x + 0.05, 1.15, z + 0.04], '#b3261e', '#ece6d2');
      board.rotation.set(0, 0.35, -0.08);
    }
    if (a.oddity === 'cone') {
      const at = hostTop.p, y = at.y + hostTop.r * hostTop.w * 0.3;
      s.cylinder(0.035, 0.17, 0.62, [at.x, y + 0.31, at.z], s.material('#f0621e', { roughness: 0.5 }), 14);
      s.cylinder(0.085, 0.11, 0.12, [at.x, y + 0.36, at.z], s.material('#f3f1e8'), 14);
      s.box([0.42, 0.03, 0.42], [at.x, y + 0.015, at.z], s.material('#f0621e'));
    }

    const rate = mix(4, 11, mood.energy);
    return s.finish({
      footprint: reach,
      update: (_dt, time) => {
        for (const flame of flames) {
          const size = flame.userData.size as number, n = Math.sin(time * rate + (flame.userData.phase as number)) * 0.5 + Math.sin(time * rate * 2.3 + (flame.userData.phase as number) * 2) * 0.5;
          flame.scale.set(size * (1 - n * 0.12), size * (1 + n * 0.25), size * (1 - n * 0.12));
        }
        if (puffs.length) smoke(time);
      },
    });
  },
});
