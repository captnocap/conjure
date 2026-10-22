import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];
type Bit = { p: V3; s: V3; r?: V3; c?: THREE.ColorRepresentation };

function bits(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: readonly Bit[]) {
  if (!list.length) { geometry.dispose(); material.dispose(); return null; }
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
  const v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  list.forEach((b, i) => {
    e.set(...(b.r ?? [0, 0, 0]), 'YXZ');
    m.compose(v.set(...b.p), q.setFromEuler(e), sc.set(...b.s));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.set(b.c ?? '#ffffff'));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export default defineThing({
  questions: {
    season: choice('What season is the sun set to?', {
      spring: 'Spring: a soft, slightly green-white light, gentle, angled a little to one side.',
      summer: 'High summer: every panel at full fierce white-gold, pointed straight down.',
      autumn: 'Autumn harvest: deep amber, the bar tilted low and long.',
      winter: 'Winter rest: dim blue-white, every other panel asleep.',
      night: 'Night cycle: the panels dark except for a thin moon-blue pilot line.',
    }),
    fault: choice('Has any panel failed?', {
      none: 'No, every panel is sound.',
      dark: 'One panel has gone dark.',
      flicker: 'One panel flickers and stutters.',
      half: 'Half the bar is dead; the garden beneath is in shade.',
      hanging: 'A panel has dropped and hangs by its wires, sparking.',
    }),
    mount: choice('How is it held up?', {
      gantry: 'Hung on cables from a crossbeam between two uprights.',
      rib: 'Slung beneath one curved structural rib that arches from deck to deck.',
      mast: 'Cantilevered from a single lattice mast on a ballasted foot.',
      stands: 'Lowered onto two tripod service stands at head height.',
    }),
    louvres: score('How are the louvres set?', ['Shut almost flat, light leaking through slits', 'Half open', 'Wide open']),
    length: score('How long is the segment?', ['One short panel pair', 'A three-panel bar', 'A long run of six panels']),
    left: choice('What is with it?', {
      nothing: 'Nothing.',
      ladder: 'A maintenance ladder leaned against it and an open toolbox.',
      suns: 'Paper suns and ribbons hung from it by children.',
      vines: 'Bean vines that have climbed the supports toward the light.',
      moths: 'A loose cloud of pale moths drawn to the glow.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => mix(lo, hi, random());

    const segs = Math.round(mix(2, 6, a.length));
    const segL = 0.82, L = segs * segL + 0.12;
    const H = a.mount === 'stands' ? 1.85 : mix(2.6, 3.1, a.length);
    const steel = s.material('#8e999c', { metalness: 0.7, roughness: 0.4 });
    const dark = s.material('#2a3033', { roughness: 0.7 });
    const paintMat = s.material('#e6e2d3', { roughness: 0.5 });
    const hazard = s.material('#e0a820');

    // The light itself: daylight sets the hue and strength, the season bends both.
    const d = mood.daylight;
    const glow = new THREE.Color('#ffb48f').lerp(new THREE.Color('#fff4d2'), Math.sin(d * Math.PI));
    if (d > 0.5) glow.lerp(new THREE.Color('#ff8a3a'), (d - 0.5) * 2 * 0.8);
    glow.lerp(new THREE.Color().setHSL(mix(0.58, 0.07, mood.warmth), 0.9, 0.7), 0.25);
    const bias = { spring: '#e9ffd0', summer: '#fff6c8', autumn: '#ff9a2e', winter: '#cfe4ff', night: '#5f86ff' }[a.season];
    glow.lerp(new THREE.Color(bias), a.season === 'night' ? 0.95 : 0.5);
    const power = { spring: 0.75, summer: 1.15, autumn: 0.85, winter: 0.45, night: 0.12 }[a.season] * mix(0.55, 1, Math.sin(d * Math.PI)) * mix(0.85, 1.1, mood.cheer);
    const tilt = -{ spring: 0.4, summer: 0.12, autumn: 0.8, winter: 0.55, night: 0.2 }[a.season] * rr(0.85, 1.1);

    const bar = new THREE.Group();
    bar.position.set(0, H, 0);
    s.root.add(bar);
    const B = <T extends THREE.Object3D>(o: T) => { bar.add(o); return o; };

    B(s.box([L, 0.16, 0.54], [0, 0.06, 0], paintMat));
    for (const x of [-1, 1]) {
      B(s.box([0.1, 0.3, 0.62], [x * (L / 2 + 0.04), 0.05, 0], dark));
      B(s.box([0.03, 0.08, 0.63], [x * (L / 2 + 0.04), 0.05, 0], hazard));
    }
    // Heat fins and the coolant spine.
    const fins: Bit[] = [];
    for (let i = 0, n = Math.floor((L - 0.1) / 0.055); i < n; i++) {
      if (random() < mood.wear * 0.18) continue;
      fins.push({ p: [-L / 2 + 0.08 + i * 0.055, 0.14 + 0.06, 0], s: [0.012, 0.12 * rr(0.85, 1), 0.44], r: [0, 0, random() < mood.wear * 0.3 ? rr(-0.3, 0.3) : 0], c: '#c3cbcc' });
    }
    bits(bar, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.7, roughness: 0.4 }), fins);
    B(s.rod([-L / 2 + 0.05, 0.3, 0], [L / 2 - 0.05, 0.3, 0], 0.035, s.material('#b5643a', { metalness: 0.6, roughness: 0.4 })));
    for (const x of [-1, 1]) B(s.rod([x * (L / 2 - 0.05), 0.3, 0], [x * (L / 2 - 0.05), 0.12, 0], 0.035, s.material('#b5643a', { metalness: 0.6, roughness: 0.4 })));

    // Emitter panels.
    type Panel = { mat: THREE.MeshStandardMaterial; rim?: THREE.MeshStandardMaterial; level: number; flicker: boolean };
    const panels: Panel[] = [];
    const bad = Math.floor(random() * segs);
    let sparkMesh: THREE.Mesh | null = null;
    for (let i = 0; i < segs; i++) {
      const x = (i - (segs - 1) / 2) * segL;
      let level = power * rr(0.92, 1.05);
      if (a.season === 'winter' && i % 2) level *= 0.15;
      if (a.fault === 'dark' && i === bad) level = 0;
      if (a.fault === 'half' && (bad % 2 ? i >= segs / 2 : i < segs / 2)) level = 0;
      if (a.fault === 'hanging' && i === bad) level = 0;
      if (mood.wear > 0.8 && random() < 0.2) level *= 0.4;
      const mat = new THREE.MeshStandardMaterial({ color: level > 0.02 ? glow : '#3d4347', emissive: glow, emissiveIntensity: level * 2.4, roughness: 0.4 });
      panels.push({ mat, level, flicker: a.fault === 'flicker' && i === bad });
      const plate = B(s.box([segL - 0.05, 0.03, 0.46], [x, -0.055, 0], mat));
      if (a.season === 'night') B(s.box([segL - 0.1, 0.012, 0.03], [x, -0.075, 0], new THREE.MeshStandardMaterial({ color: '#9fb8ff', emissive: '#7f9fff', emissiveIntensity: 2.2 })));
      if (a.fault === 'hanging' && i === bad) {
        plate.position.set(x + 0.1, -0.42, 0.12);
        plate.rotation.set(0.5, 0, 1.05);
        B(s.box([segL - 0.05, 0.02, 0.46], [x, -0.05, 0], dark));
        for (const dz of [-0.12, 0.1]) B(s.tube([[x - 0.2, -0.05, dz], [x - 0.3, -0.3, dz + 0.05], [x - 0.12, -0.42, dz + 0.1], [x - 0.1, -0.2, dz + 0.12]], 0.008, s.material(dz < 0 ? '#c0392b' : '#e0a820')));
        sparkMesh = B(s.mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshStandardMaterial({ color: '#fff7c2', emissive: '#ffe25a', emissiveIntensity: 3 }), [x - 0.1, -0.2, 0.0]));
      }
    }
    const lit = panels.reduce((sum, p) => sum + p.level, 0) / segs;
    const rich = glow.clone();
    { const hsl = { h: 0, s: 0, l: 0 }; rich.getHSL(hsl); rich.setHSL(hsl.h, Math.min(1, hsl.s * 1.3 + 0.25), Math.min(hsl.l, 0.62)); }
    const spill = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9d5c6').lerp(rich, Math.min(1, lit)), emissive: rich, emissiveIntensity: lit * 0.6, roughness: 0.5, side: THREE.DoubleSide });
    panels.forEach((p, i) => {
      const x = (i - (segs - 1) / 2) * segL;
      const rim = new THREE.MeshStandardMaterial({ color: p.level > 0.02 ? rich : '#3d4347', emissive: rich, emissiveIntensity: p.level * 0.9, roughness: 0.4 });
      for (const z of [-0.285, 0.285]) B(s.box([segL - 0.04, 0.05, 0.02], [x, -0.03, z], rim));
      p.rim = rim;
    });
    // Louvres: long slats that swing open, crossed by fixed dividers, and two barn-door flaps.
    const openAngle = mix(0.12, 1.45, a.louvres);
    const slats: Bit[] = [];
    for (let k = 0; k < 6; k++) slats.push({ p: [0, -0.13, -0.2 + k * 0.08], s: [L - 0.04, 0.006, 0.075], r: [openAngle, 0, 0], c: '#d9d5c6' });
    for (let i = 0; i <= segs * 4; i++) slats.push({ p: [-L / 2 + 0.06 + i * ((L - 0.12) / (segs * 4)), -0.13, 0], s: [0.008, 0.07, 0.5], c: '#b9b5a6' });
    bits(bar, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, emissive: rich, emissiveIntensity: lit * 0.5 }), slats);
    for (const z of [-1, 1]) {
      const flap = B(s.box([L, 0.012, 0.3], [0, -0.1 - Math.sin(mix(0.25, 1.0, a.louvres)) * 0.14, z * (0.29 + Math.cos(mix(0.25, 1.0, a.louvres)) * 0.14)], spill));
      flap.rotation.x = z * mix(0.25, 1.0, a.louvres);
    }
    // Gimbal rings at each end.
    for (const x of [-1, 1]) {
      const ring = B(s.ring(0.44, 0.022, [x * (L / 2 + 0.1), 0.05, 0], steel));
      ring.rotation.y = Math.PI / 2;
      B(s.cylinder(0.05, 0.05, 0.08, [x * (L / 2 + 0.1), 0.05, 0], steel, 12)).rotation.z = Math.PI / 2;
    }

    // The fall of light: a faint tapering beam and a pool on the deck.
    const c = document.createElement('canvas'); c.width = 4; c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 4, 64);
    const fade = new THREE.CanvasTexture(c);
    const beamMat = new THREE.MeshBasicMaterial({ color: rich, map: fade, alphaMap: fade, transparent: true, opacity: Math.min(0.6, lit * 0.6) * mix(0.55, 1, a.louvres), depthWrite: false, side: THREE.DoubleSide });
    const beamH = H * 0.7;
    const beamGeo = new THREE.CylinderGeometry(0.34, 0.34 + mix(0.1, 0.9, a.louvres), beamH, 4, 1, true);
    beamGeo.rotateY(Math.PI / 4);
    beamGeo.scale(L / 0.48 * 0.72, 1, 1);
    B(s.mesh(beamGeo, beamMat, [0, -0.15 - beamH / 2, 0])).castShadow = false;
    const pool = s.mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: rich, transparent: true, opacity: Math.min(0.6, lit * 0.6), depthWrite: false }), [0, 0.012, Math.tan(-tilt) * H * 0.6]);
    pool.rotation.x = -Math.PI / 2; pool.scale.set(L / 2 + 0.3, 0.55 + a.louvres * 0.6, 1); pool.castShadow = false;
    bar.rotation.x = tilt;

    // Supports.
    const ex = L / 2 + 0.1;
    const posts: V3[] = [];
    if (a.mount === 'gantry') {
      const top = H + 0.95, px = ex + 0.4;
      for (const x of [-1, 1]) {
        s.box([0.14, top, 0.14], [x * px, top / 2, 0], steel);
        s.box([0.5, 0.06, 0.7], [x * px, 0.03, 0], dark);
        s.rod([x * px, 0.06, 0.32], [x * px, 1.0, 0.07], 0.025, steel); s.rod([x * px, 0.06, -0.32], [x * px, 1.0, -0.07], 0.025, steel);
        s.rod([x * ex, top - 0.1, 0], [x * ex, H + 0.49, 0], 0.012, dark);
        posts.push([x * px, top, 0]);
      }
      s.box([px * 2 + 0.3, 0.12, 0.12], [0, top - 0.06, 0], steel);
      s.box([px * 2 + 0.3, 0.05, 0.05], [0, top - 0.42, 0], steel);
      for (let i = 0, n = Math.round(px * 2 / 0.45); i < n; i++) { const x0 = -px + i * (px * 2 / n), x1 = x0 + px * 2 / n; s.rod([x0, top - 0.42, 0], [x1, top - 0.08, 0], 0.014, steel); }
    } else if (a.mount === 'rib') {
      const span = ex + 0.9, top = H + 1.0;
      const pts: V3[] = [];
      for (let k = 0; k <= 16; k++) { const t = Math.PI * k / 16; pts.push([-Math.cos(t) * span, Math.pow(Math.sin(t), 0.6) * top, -0.0]); }
      for (const z of [-0.14, 0.14]) s.tube(pts.map(([x, y]): V3 => [x, y, z]), 0.055, paintMat);
      for (let k = 1; k < 16; k++) s.rod([pts[k][0], pts[k][1], -0.14], [pts[k][0], pts[k][1], 0.14], 0.02, steel);
      for (const x of [-1, 1]) {
        s.box([0.4, 0.1, 0.6], [x * span, 0.05, 0], dark);
        const ang = Math.acos(ex / span);
        s.rod([x * ex, Math.pow(Math.sin(ang), 0.6) * top, 0], [x * ex, H + 0.49, 0], 0.014, dark);
        posts.push([x * span * 0.97, top * 0.45, 0]);
      }
    } else if (a.mount === 'mast') {
      const top = H + 1.0, mz = -1.05;
      for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) s.rod([dx * 1.6, 0.1, mz + dz * 1.6], [dx, top, mz + dz], 0.022, steel);
      for (let k = 0, n = 9; k < n; k++) { const y0 = 0.2 + k * (top - 0.3) / n, y1 = y0 + (top - 0.3) / n; s.rod([-0.14, y0, mz + 0.14], [0.14, y1, mz + 0.14], 0.012, steel); s.rod([0.14, y0, mz - 0.14], [0.14, y1, mz + 0.14], 0.012, steel); }
      s.box([1.1, 0.12, 1.0], [0, 0.06, mz - 0.1], dark);
      for (const x of [-0.3, 0.3]) s.box([0.36, 0.22, 0.5], [x, 0.23, mz - 0.3], s.material('#8a8f8c'));
      s.box([0.12, 0.12, 1.5], [0, top - 0.06, mz + 0.65], steel);
      s.rod([0, top - 0.5, mz], [0, top - 0.1, mz + 1.2], 0.02, steel);
      s.box([ex * 2, 0.07, 0.07], [0, H + 0.62, 0], steel);
      s.rod([0, top - 0.1, 0], [0, H + 0.62, 0], 0.03, steel);
      for (const x of [-1, 1]) { s.rod([x * ex, H + 0.62, 0], [x * ex, H + 0.49, 0], 0.014, dark); s.rod([0, top - 0.1, 0], [x * ex * 0.9, H + 0.65, 0], 0.01, dark); }
      posts.push([0, top, mz]);
    } else {
      for (const x of [-1, 1]) {
        const px = x * (ex + 0.12);
        for (let k = 0; k < 3; k++) s.rod([px + Math.sin(k * 2.094 + x) * 0.55, 0, Math.cos(k * 2.094 + x) * 0.55], [px, H - 0.5, 0], 0.025, steel);
        s.cylinder(0.035, 0.035, 0.75, [px, H - 0.3, 0], dark, 10);
        s.box([0.1, 0.12, 0.14], [px - x * 0.02, H + 0.05, 0], steel);
        s.cylinder(0.06, 0.06, 0.05, [px, H - 0.6, 0], hazard, 10);
        posts.push([px, H - 0.5, 0]);
      }
      const cable: V3[] = [[-ex - 0.1, H - 0.6, 0.05], [-ex - 0.5, 0.05, 0.5], [-ex + 0.2, 0.02, 0.9], [-ex + 0.7, 0.02, 0.6]];
      s.tube(cable, 0.014, dark);
    }

    // Company.
    const moths: THREE.Object3D[] = [];
    if (a.left === 'ladder') {
      const lx = L * 0.22, wood = s.material('#c9a45c');
      const topY = H - 0.1, lean = 0.75;
      for (const dx of [-0.2, 0.2]) s.rod([lx + dx, 0, lean + 0.3], [lx + dx, topY, 0.32], 0.022, wood);
      for (let k = 1; k < Math.floor(topY / 0.3); k++) { const t = k * 0.3 / topY; s.rod([lx - 0.2, topY * t, mix(lean + 0.3, 0.32, t)], [lx + 0.2, topY * t, mix(lean + 0.3, 0.32, t)], 0.014, wood); }
      s.box([0.4, 0.16, 0.2], [lx + 0.65, 0.08, 0.9], s.material('#c0392b'));
      s.box([0.4, 0.02, 0.2], [lx + 0.65, 0.2, 0.78], s.material('#a02f24')).rotation.x = -1.1;
    } else if (a.left === 'suns') {
      const paper = ['#f6c930', '#f28a1e', '#f4f1e4', '#e2574a', '#7fc4d8'];
      for (let i = 0, n = 5 + Math.floor(mood.density * 6); i < n; i++) {
        const x = rr(-L / 2, L / 2), z = (random() < 0.5 ? -1 : 1) * 0.36, len = rr(0.35, 1.0);
        s.rod([x, H - 0.1, z], [x, H - 0.1 - len, z], 0.004, dark);
        if (i % 3) {
          const sun = s.cylinder(0.11, 0.11, 0.01, [x, H - 0.1 - len - 0.1, z], s.material(paper[i % 2]), 10);
          sun.rotation.set(Math.PI / 2, 0, rr(0, 1)); sun.rotation.order = 'YXZ'; sun.rotation.y = rr(-0.8, 0.8);
        } else s.box([0.05, rr(0.3, 0.6), 0.004], [x, H - 0.3 - len, z], s.material(paper[2 + (i % 3)])).rotation.y = rr(0, 3);
      }
    } else if (a.left === 'vines') {
      const leaves: Bit[] = [];
      const green = ['#4f9a40', '#6ab04a', '#3d8238', '#8fc45a'];
      for (const post of posts) {
        const n = Math.round(mix(40, 90, mood.density));
        for (let k = 0; k < n; k++) {
          const t = Math.pow(random(), 0.8), ang = rr(0, 6.283), r = rr(0.07, 0.16);
          const yy = t * post[1];
          const xx = a.mount === 'rib' ? Math.sign(post[0]) * (ex + 0.9) * Math.cos(Math.asin(Math.min(1, Math.pow(yy / (H + 1.0), 1 / 0.6)))) : post[0];
          leaves.push({ p: [xx + Math.sin(ang) * r, yy, post[2] + Math.cos(ang) * r], s: [0.05, 0.012, 0.07], r: [rr(-0.9, 0.3), ang, rr(-0.5, 0.5)], c: green[Math.floor(random() * 4)] });
          if (random() < 0.07) leaves.push({ p: [xx + Math.sin(ang) * r, yy - 0.06, post[2] + Math.cos(ang) * r], s: [0.014, 0.08, 0.014], c: '#7fbf4a' });
        }
      }
      bits(s.root, new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), leaves);
    } else if (a.left === 'moths') {
      const wing = new THREE.MeshStandardMaterial({ color: '#f1ead2', roughness: 0.9, side: THREE.DoubleSide, emissive: '#fff3c2', emissiveIntensity: 0.3 });
      for (let i = 0, n = Math.round(mix(8, 22, mood.density)); i < n; i++) {
        const moth = new THREE.Group();
        for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.075, 3), wing); w.position.x = sx * 0.05; w.rotation.y = sx * 0.6; w.castShadow = true; moth.add(w); }
        moth.position.set(rr(-L / 2, L / 2), H - rr(0.3, 1.2), rr(-0.7, 0.7));
        moth.userData = { home: moth.position.clone(), phase: rr(0, 6.283), rate: rr(0.6, 1.8) };
        s.root.add(moth);
        moths.push(moth);
      }
    }

    const speed = mix(0.3, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        bar.rotation.z = Math.sin(time * 0.5 * speed) * 0.012 * (a.mount === 'stands' ? 0 : 1);
        for (const p of panels) if (p.flicker) { p.mat.emissiveIntensity = (Math.sin(time * 31 * speed) + Math.sin(time * 13.7) > 0.4 ? 1 : 0.08) * p.level * 2.4; if (p.rim) p.rim.emissiveIntensity = p.mat.emissiveIntensity * 0.4; }
        if (sparkMesh) { sparkMesh.visible = Math.sin(time * 17 * speed) + Math.sin(time * 7.3) > 0.9; sparkMesh.rotation.y = time * 9; }
        for (const moth of moths) {
          const { home, phase, rate } = moth.userData as { home: THREE.Vector3; phase: number; rate: number };
          moth.position.set(home.x + Math.sin(time * rate * speed + phase) * 0.25, home.y + Math.sin(time * rate * 1.7 * speed + phase * 2) * 0.12, home.z + Math.cos(time * rate * speed * 0.8 + phase) * 0.25);
          moth.rotation.y = time * rate + phase;
        }
      },
    });
  },
});
