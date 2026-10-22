import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';
import { displace, instances, mat, mesh, noise, paint, range, rod, type Spot, type V3 } from './lib';

// Standing places: x, z, tallest and widest a thing may be there. The hero stands in the middle of the light.
const SLOTS: readonly (readonly [number, number, number, number])[] = [
  [0, 0.6, 3.8, 2.3], [-4.6, -2.4, 4.4, 2.0], [4.7, -2.8, 4.4, 2.0], [-3.2, 3.6, 1.7, 1.25], [3.4, 3.5, 1.7, 1.25], [0.6, -6.6, 5.6, 2.6],
];
const BEAM = { white: '#eaf5ff', amber: '#ffdca6', red: '#ff7868', teal: '#9af2e2' } as const;
/** Big things shrink more than small ones, so a whale and an isopod can share the light. */
const displaySize = (metres: number) => 1.55 * metres ** 0.42;

export default defineWorld({
  questions: {
    source: choice('Where does the light come from?', {
      above: 'From a vehicle hovering out of sight overhead: one hard cone straight down through the snow.',
      lander: 'From a lamp on a tripod lander standing at the edge of the scene, slanting across the silt.',
      behind: 'From behind us, the floodlights of the submersible we are watching from, grazing low.',
    }),
    beam: choice('What colour is the light?', {
      white: 'Cold blue-white LED.',
      amber: 'Old yellow halogen.',
      red: 'Dim red, the kind used so the animals do not notice.',
      teal: 'Green-teal, tinted by the water.',
    }),
    field: choice('How do the chimneys stand in the distance?', {
      wall: 'A ragged wall of spires right across the background.',
      lonely: 'Two or three lone towers far apart.',
      colossus: 'One colossal chimney dwarfing a few small ones.',
      ruins: 'A ruined field: broken stumps and fallen columns.',
    }),
    vents: choice('What are the vents doing?', {
      black: 'Black smokers, pouring dark plumes upward.',
      white: 'White smokers, breathing pale milky cloud.',
      glowing: 'Barely smoking, throats glowing orange.',
      dead: 'Cold and extinct. Nothing rises.',
    }),
    floor: choice('What is the seabed like?', {
      ooze: 'Smooth grey ooze, untouched.',
      ripples: 'Silt combed into long ripples by a slow current.',
      pillows: 'Black pillow basalt breaking through the silt.',
      nodules: 'Strewn with potato-sized black manganese nodules.',
      mats: 'Patched with white and orange bacterial mats.',
    }),
    beyond: choice('What moves in the dark beyond the light?', {
      nothing: 'Nothing at all.',
      sparks: 'Pinpricks of blue bioluminescence, blinking.',
      jellies: 'A few glowing jellyfish drifting past.',
      eyes: 'Pairs of eyes catching the light, watching.',
      shape: 'The faint outline of something very large, passing.',
    }),
    traces: choice('What have people left here before?', {
      untouched: 'Nothing. This is the first time anyone has seen it.',
      tracks: 'Two parallel skid tracks pressed into the silt.',
      markers: 'Numbered survey markers on little floats.',
      litter: 'Litter that sank from the surface world: a tin can, a plastic bag.',
    }),
    vantage: choice('Where are we looking from?', {
      rov: 'Camera height on a vehicle, looking slightly down.',
      low: 'Down on the silt, everything looming.',
      high: 'Descending from above, looking steeply down into the pool of light.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const n = noise(random);
    const background = new THREE.Color().setHSL(mix(0.615, 0.59, mood.warmth), 0.42, mix(0.21, 0.31, mood.cheer), THREE.SRGBColorSpace);
    const beam = new THREE.Color(BEAM[a.beam]).lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffd9a0' : '#cfe8ff'), Math.abs(mood.warmth - 0.5) * 0.5);
    const hero = new THREE.Vector3(SLOTS[0][0], 0, SLOTS[0][1]);
    const pool = 5.2;
    /** Blend a colour toward the water with distance from the light. */
    const haze = (c: THREE.Color, distance: number) => c.lerp(background, clamp01((distance - 6) / 17) * 0.9);

    // Light: a dim blue ambience so nothing is black, and one lamp.
    root.add(new THREE.HemisphereLight('#5d82c0', '#1a222e', 0.6));
    const source = a.source === 'above' ? new THREE.Vector3(mix(-3.5, 3.5, mood.daylight), 17, 3.5) : a.source === 'lander' ? new THREE.Vector3(-7.4, 4.3, -0.6) : new THREE.Vector3(3.5, 4.2, 15);
    const key = new THREE.DirectionalLight(beam, 0.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.03; key.shadow.bias = -0.0003; key.shadow.radius = 4;
    root.add(key, key.target);
    const spot = new THREE.SpotLight(beam, 7.5, 0, Math.atan2(pool, source.distanceTo(hero)), 0.45, 0);
    spot.position.copy(source); spot.target.position.copy(hero);
    root.add(spot, spot.target);
    const fill = new THREE.DirectionalLight('#4f76b8', 0.3);
    fill.position.set(8, 6, 9);
    root.add(fill);

    // Seabed: one mesh, gently drifted, its far reaches dissolving into the water.
    const plane = new THREE.PlaneGeometry(130, 130, 110, 110);
    plane.rotateX(-Math.PI / 2);
    const gp = plane.attributes.position;
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i), z = gp.getZ(i), d = Math.hypot(x, z);
      let y = n(x * 0.12, 0, z * 0.12) * 0.1 * clamp01((d - 5) / 6) + n(x * 0.5, 2, z * 0.5) * 0.015;
      if (a.floor === 'ripples') y += Math.sin(x * 1.9 + z * 0.55 + n(x * 0.2, 0, z * 0.2) * 2.2) * 0.035;
      gp.setY(i, y - 0.02);
    }
    plane.computeVertexNormals();
    const silt = new THREE.Color('#6a737d'), siltDark = new THREE.Color('#47505b');
    paint(plane, (p, c) => {
      c.copy(silt).lerp(siltDark, clamp01(n(p.x * 0.3, 0, p.z * 0.3) * 0.6 + 0.4));
      if (a.floor === 'ripples') c.multiplyScalar(0.9 + 0.1 * Math.sin(p.x * 1.9 + p.z * 0.55 + 1.2));
      haze(c, Math.hypot(p.x - hero.x, p.z - hero.z));
    });
    const ground = new THREE.Mesh(plane, mat('#ffffff', { vertexColors: true, roughness: 1 }));
    ground.receiveShadow = true;
    root.add(ground);
    // A veil that finishes the fade, so there is no horizon line.
    const veil = new THREE.RingGeometry(13, 70, 48, 6);
    veil.rotateX(-Math.PI / 2);
    const vp = veil.attributes.position, alpha = new Float32Array(vp.count * 4);
    for (let i = 0; i < vp.count; i++) { const d = Math.hypot(vp.getX(i), vp.getZ(i)); alpha.set([background.r, background.g, background.b, clamp01((d - 13) / 16)], i * 4); }
    veil.setAttribute('color', new THREE.BufferAttribute(alpha, 4));
    const veilMesh = new THREE.Mesh(veil, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }));
    veilMesh.position.y = 0.12;
    root.add(veilMesh);

    const clear = (x: number, z: number, margin = 0.4) => SLOTS.every(([sx, sz, , r]) => Math.hypot(x - sx, z - sz) > r + margin);
    const somewhere = (near = 2, far = 13): V3 | null => { for (let i = 0; i < 12; i++) { const ang = random() * 6.283, d = range(random, near, far), x = Math.cos(ang) * d, z = Math.sin(ang) * d * 0.8 - 1; if (clear(x, z)) return [x, 0, z]; } return null; };

    // The chimneys beyond.
    const rockDark = new THREE.Color('#23262d'), rockMid = new THREE.Color('#4a4640'), ochre = new THREE.Color('#9a7a3a');
    const rockMat = mat('#ffffff', { vertexColors: true, roughness: 0.95 });
    type Vent = { top: THREE.Vector3; r: number; distance: number };
    const vents: Vent[] = [];
    const spire = (x: number, z: number, h: number, r: number, broken: boolean) => {
      const distance = Math.hypot(x - hero.x, z - hero.z), cut = broken ? range(random, 0.3, 0.6) : 1;
      const bulge = Array.from({ length: 5 }, () => [range(random, 0.05, 0.8), range(random, 0.04, 0.09), range(random, 0.08, 0.25)] as const);
      const radiusAt = (t: number) => { let v = r * (0.2 + 0.8 * Math.pow(1 - t * cut, 1.1)) * (1 + 0.1 * Math.sin(t * cut * 21 + x)); for (const [at, w, amt] of bulge) v += r * amt * Math.exp(-Math.pow((t * cut - at) / w, 2)); return v; };
      const profile: THREE.Vector2[] = [new THREE.Vector2(radiusAt(0) * 1.5, -0.4)];
      for (let i = 0; i <= 30; i++) profile.push(new THREE.Vector2(radiusAt(i / 30), (i / 30) * h * cut));
      profile.push(new THREE.Vector2(radiusAt(1) * 0.5, h * cut - radiusAt(1) * 0.6));
      const g = displace(new THREE.LatheGeometry(profile, 22), (p) => (n(p.x + x, p.y * 0.5, p.z + z, 2.2 / r) * 0.12 + n(p.x, p.y, p.z + x, 6 / r) * 0.07) * r);
      paint(g, (p, c) => { c.copy(rockMid).lerp(rockDark, clamp01(p.y / h * 1.4 - 0.2)).lerp(ochre, clamp01((n(p.x + x, p.y * 0.3, p.z, 3 / r) - 0.25) * 2) * 0.6); haze(c, distance); });
      const m = mesh(root, g, rockMat, [x, 0, z], 1, [range(random, -0.07, 0.07), random() * 6.283, range(random, -0.07, 0.07)]);
      m.castShadow = false;
      m.updateMatrixWorld(true);
      if (!broken) vents.push({ top: m.localToWorld(new THREE.Vector3(0, h, 0)), r: radiusAt(1) * 0.7, distance });
      return m;
    };
    const many = mix(0.75, 1.35, mood.density);
    const fallen = (x: number, z: number, length: number, r: number) => {
      const distance = Math.hypot(x - hero.x, z - hero.z);
      const g = displace(new THREE.CylinderGeometry(r * 0.45, r, length, 14, 8), (p) => n(p.x + x, p.y, p.z, 3 / r) * r * 0.16);
      paint(g, (p, c) => { c.copy(rockMid).lerp(rockDark, n(p.x, p.y + z, p.z, 2 / r) * 0.5 + 0.5); haze(c, distance); });
      mesh(root, g, rockMat, [x, r * 0.6, z], 1, [Math.PI / 2 - 0.06, 0, random() * 3]).castShadow = false;
    };
    if (a.field === 'wall') {
      const count = Math.round(9 * many);
      for (let i = 0; i < count; i++) { const t = i / (count - 1) - 0.5; spire(t * 30 + range(random, -1, 1), -12 - Math.abs(t) * 5 + range(random, -2.5, 2.5), range(random, 5, 12) * (1 - Math.abs(t) * 0.4), range(random, 0.7, 1.4), mood.wear > 0.7 && random() < 0.3); }
    } else if (a.field === 'lonely') {
      spire(-8.5, -12, range(random, 9, 12), 1.3, false); spire(7.5, -16, range(random, 8, 13), 1.4, false);
      if (many > 1) spire(-1, -22, 14, 1.6, false);
    } else if (a.field === 'colossus') {
      spire(5.5, -15, 21, 3.1, false); spire(8.6, -13.5, 9, 1.2, false);
      for (let i = 0; i < Math.round(3 * many); i++) spire(range(random, -13, -3), range(random, -17, -11), range(random, 3, 6.5), range(random, 0.6, 0.9), false);
    } else {
      const count = Math.round(8 * many);
      for (let i = 0; i < count; i++) { const t = i / (count - 1) - 0.5, x = t * 28 + range(random, -1, 1), z = -11 - Math.abs(t) * 4 + range(random, -3, 2), h = range(random, 5, 10), r = range(random, 0.8, 1.4), whole = random() < 0.25; spire(x, z, h, r, !whole); if (!whole) fallen(x + range(random, -2.5, 2.5), z + range(random, 1, 3), h * range(random, 0.3, 0.5), r * 0.8); }
    }
    // Rubble at the feet of the field.
    const rubble: Spot[] = [];
    for (let i = 0; i < Math.round(60 * many); i++) { const x = range(random, -17, 17), z = range(random, -19, -8.5), s = range(random, 0.15, 0.6); if (!clear(x, z, 0.6)) continue; rubble.push({ at: [x, s * 0.3, z], scale: [s, s * range(random, 0.5, 0.9), s * range(random, 0.7, 1.1)], rot: [random() * 3, random() * 3, random() * 3], color: haze(rockMid.clone().lerp(rockDark, random()), Math.hypot(x, z)) }); }
    instances(root, new THREE.DodecahedronGeometry(1, 0), mat('#ffffff', { roughness: 1, flatShading: true }), rubble).castShadow = false;

    // Plumes and glowing throats.
    const smoking = a.vents === 'black' || a.vents === 'white', glowing = a.vents === 'glowing' || (a.vents === 'black' && mood.warmth > 0.6);
    const puffSpec: { vent: Vent; phase: number; side: number; turn: number; size: number }[] = [];
    let puffs: THREE.InstancedMesh | null = null;
    const vigour = mix(0.35, 1, mood.energy);
    if (smoking || a.vents === 'glowing') {
      const per = a.vents === 'glowing' ? 4 : Math.round(mix(9, 16, mood.energy));
      for (const vent of vents) for (let i = 0; i < per; i++) puffSpec.push({ vent, phase: (i + random() * 0.6) / per, side: random() * 6.283, turn: random() * 6, size: range(random, 0.8, 1.25) });
      const smokeColour = a.vents === 'white' ? new THREE.Color('#c9d4dc') : new THREE.Color('#15171c');
      puffs = instances(root, displace(new THREE.IcosahedronGeometry(1, 2), (p) => n(p.x, p.y, p.z, 1.4) * 0.18), mat('#ffffff', { roughness: 1 }), puffSpec.map((s) => ({ at: [0, 0, 0] as const, color: haze(smokeColour.clone(), s.vent.distance * 0.8) })));
      puffs.castShadow = false;
    }
    if (glowing && vents.length) {
      const hot = mat('#ffb060', { emissive: '#ff6a1c', emissiveIntensity: mix(1.6, 3.2, mood.cheer * 0.5 + mood.warmth * 0.5) });
      instances(root, new THREE.SphereGeometry(1, 10, 8), hot, vents.map((v) => ({ at: [v.top.x, v.top.y - v.r * 0.2, v.top.z] as const, scale: [v.r * 1.15, v.r * 0.7, v.r * 1.15] as const }))).castShadow = false;
      const halo = new THREE.MeshBasicMaterial({ color: '#ff7a2a', transparent: true, opacity: 0.14, depthWrite: false });
      for (const v of vents) { const h = new THREE.Mesh(new THREE.SphereGeometry(v.r * 3.4, 12, 8), halo); h.position.copy(v.top); root.add(h); }
    }
    const m4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
    const drift = new THREE.Vector3(range(random, 0.4, 1) * (random() < 0.5 ? -1 : 1), 0, range(random, -0.3, 0.3));
    const posePlume = (time: number) => {
      if (!puffs) return;
      puffSpec.forEach((s, i) => {
        const t = (s.phase + time) % 1, rise = (a.vents === 'glowing' ? 3 : 9) * vigour + 2;
        const swell = (s.vent.r * 1.1 + t * (a.vents === 'glowing' ? 0.5 : 1.7) * vigour) * s.size * Math.min(1, (1 - t) * 2.4 + 0.3);
        pos.copy(s.vent.top).addScaledVector(drift, t * t * 4 * vigour).add(sc.set(Math.cos(s.side + t * 3) * t * 0.9, t * rise + s.vent.r * 0.4, Math.sin(s.side + t * 3) * t * 0.9));
        puffs!.setMatrixAt(i, m4.compose(pos, quat.setFromEuler(euler.set(s.turn + t * 2, s.turn * 2, t * 3)), sc.setScalar(Math.max(swell, 1e-3))));
      });
      puffs.instanceMatrix.needsUpdate = true;
    };
    posePlume(0);

    // Seabed dressing.
    if (a.floor === 'pillows') {
      const lumps: Spot[] = [];
      for (let c = 0; c < Math.round(7 * many); c++) { const home = somewhere(4.5, 14); if (!home) continue; for (let i = 0; i < 5 + random() * 5; i++) { const s = range(random, 0.35, 0.9), x = home[0] + range(random, -1.4, 1.4), z = home[2] + range(random, -1.2, 1.2); if (!clear(x, z, 0.5)) continue; lumps.push({ at: [x, s * 0.25, z], scale: [s, s * 0.62, s * range(random, 0.8, 1.3)], rot: [0, random() * 3, range(random, -0.2, 0.2)], color: haze(new THREE.Color('#2a2c33').lerp(new THREE.Color('#494b50'), random()), Math.hypot(x, z)) }); } }
      instances(root, displace(new THREE.SphereGeometry(1, 14, 10), (p) => n(p.x, p.y, p.z, 2) * 0.12), mat('#ffffff', { roughness: 0.55 }), lumps);
    } else if (a.floor === 'nodules') {
      const nodules: Spot[] = [];
      for (let i = 0; i < Math.round(240 * many); i++) { const ang = random() * 6.283, d = Math.sqrt(random()) * 15, x = Math.cos(ang) * d, z = Math.sin(ang) * d - 1, s = range(random, 0.05, 0.12); nodules.push({ at: [x, s * 0.25, z], scale: [s, s * 0.7, s * range(random, 0.8, 1.2)], rot: [random() * 3, random() * 3, 0], color: haze(new THREE.Color('#1f1d1c').lerp(new THREE.Color('#4a3f36'), random() * 0.6), d) }); }
      instances(root, new THREE.IcosahedronGeometry(1, 1), mat('#ffffff', { roughness: 0.8 }), nodules);
    } else if (a.floor === 'mats') {
      const patches: Spot[] = [];
      for (let i = 0; i < Math.round(46 * many); i++) { const p = somewhere(2.5, 13); if (!p) continue; const s = range(random, 0.3, 1.1); patches.push({ at: [p[0], 0.0, p[2]], scale: [s, 0.02, s * range(random, 0.5, 1)], rot: [0, random() * 3, 0], color: haze(new THREE.Color(random() < 0.3 ? '#e09a3a' : '#f1f0e6'), Math.hypot(p[0], p[2])) }); }
      instances(root, new THREE.SphereGeometry(1, 12, 6), mat('#ffffff', { roughness: 1 }), patches).castShadow = false;
    }
    // A few stones and worm casts on any floor, so the silt has scale.
    const casts: Spot[] = [];
    for (let i = 0; i < Math.round(26 * many); i++) { const p = somewhere(2, 11); if (!p) continue; const s = range(random, 0.05, 0.2); casts.push({ at: [p[0], s * 0.2, p[2]], scale: [s * 1.6, s * 0.5, s * 1.3], rot: [0, random() * 3, 0], color: haze(siltDark.clone().multiplyScalar(range(random, 0.8, 1.05)), Math.hypot(p[0], p[2])) }); }
    instances(root, new THREE.SphereGeometry(1, 8, 6), mat('#ffffff', { roughness: 1 }), casts);

    // What people left.
    if (a.traces === 'tracks') {
      const rut = mat(siltDark.clone().multiplyScalar(0.72), { roughness: 1 });
      const yaw = range(random, -0.5, -0.15);
      for (const off of [-0.55, 0.55]) { const g = mesh(root, new THREE.BoxGeometry(0.2, 0.012, 26), rut, [3.2 + off * Math.cos(yaw), 0.012, 2 - off * Math.sin(yaw)], 1, [0, yaw + Math.PI / 2 + 0.9, 0]); g.castShadow = false; }
    } else if (a.traces === 'markers') {
      for (let i = 0; i < 3; i++) {
        const p = somewhere(3, 8); if (!p) continue;
        const g = new THREE.Group(); g.position.set(p[0], 0, p[2]); g.rotation.set(range(random, -0.1, 0.1), range(random, -0.6, 0.6), range(random, -0.1, 0.1)); root.add(g);
        rod(g, [0, 0, 0], [0, 0.85, 0], 0.015, mat('#c9c9c4', { metalness: 0.5, roughness: 0.4 }));
        mesh(g, new THREE.SphereGeometry(0.11, 12, 10), mat('#f2b417', { emissive: '#7a5200', emissiveIntensity: 0.6, roughness: 0.4 }), [0, 0.9, 0]);
        const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
        const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#f4f1e4'; ctx.fillRect(0, 0, 128, 64); ctx.fillStyle = '#1c2a33'; ctx.font = 'bold 44px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${String.fromCharCode(65 + Math.floor(random() * 6))}${1 + Math.floor(random() * 9)}`, 64, 34);
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
        mesh(g, new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, side: THREE.DoubleSide }), [0, 0.55, 0.02]);
      }
    } else if (a.traces === 'litter') {
      const p = somewhere(2.6, 5.5) ?? [4, 0, 4.6];
      mesh(root, new THREE.CylinderGeometry(0.07, 0.07, 0.2, 14), mat('#b9bec2', { metalness: 0.8, roughness: 0.35 }), [p[0], 0.06, p[2]], 1, [Math.PI / 2 - 0.2, 0, random() * 3]);
      const q = somewhere(2.6, 6) ?? [-4, 0, 4.4];
      const bag = displace(new THREE.SphereGeometry(1, 14, 10), (v) => n(v.x * 2, v.y * 2, v.z * 2, 2) * 0.3);
      mesh(root, bag, mat('#eef2f4', { roughness: 0.3, transparent: true, opacity: 0.7 }), [q[0], 0.14, q[2]], [0.3, 0.16, 0.24], [0, random() * 3, 0]);
    }

    // The lamp itself, when it is in the scene.
    if (a.source === 'lander') {
      const g = new THREE.Group(), frame = mat('#c9a21a', { roughness: 0.5 }), steel = mat('#9aa2a6', { metalness: 0.6, roughness: 0.4 });
      const head = new THREE.Vector3(0, source.y, 0);
      for (let i = 0; i < 3; i++) { const ang = i * 2.094 + 0.4; rod(g, [Math.cos(ang) * 1.3, 0, Math.sin(ang) * 1.3], [Math.cos(ang) * 0.3, 2.6, Math.sin(ang) * 0.3], 0.05, frame); mesh(g, new THREE.CylinderGeometry(0.24, 0.24, 0.05, 12), steel, [Math.cos(ang) * 1.3, 0.03, Math.sin(ang) * 1.3]); }
      mesh(g, new THREE.CylinderGeometry(0.36, 0.36, 0.1, 14), frame, [0, 2.6, 0]);
      mesh(g, new THREE.SphereGeometry(0.34, 16, 12), mat('#e8731c', { roughness: 0.5 }), [0, 3.1, 0]);
      mesh(g, new THREE.CylinderGeometry(0.18, 0.18, 1.1, 12), steel, [0.4, 1.6, 0], 1, [0, 0, 0.1]);
      rod(g, [0, 3.4, 0], [0, head.y, 0], 0.035, steel);
      const lampDir = hero.clone().sub(source).normalize();
      const lamp = mesh(g, new THREE.CylinderGeometry(0.2, 0.3, 0.42, 14), mat('#22262a', { roughness: 0.5 }), [0, head.y, 0]);
      lamp.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), lampDir);
      mesh(g, new THREE.SphereGeometry(0.2, 12, 10), mat('#ffffff', { emissive: beam, emissiveIntensity: 3 }), [lampDir.x * 0.2, head.y + lampDir.y * 0.2, lampDir.z * 0.2]);
      g.position.set(source.x, 0, source.z); root.add(g);
    }
    // The visible shaft of light through the water.
    if (a.source !== 'behind') {
      const length = source.distanceTo(hero);
      const shaft = new THREE.Mesh(new THREE.ConeGeometry(pool * 0.92, length, 40, 1, true), new THREE.MeshBasicMaterial({ color: beam, transparent: true, opacity: a.source === 'above' ? 0.085 : 0.07, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      shaft.position.copy(source).lerp(hero, 0.5);
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), hero.clone().sub(source).normalize());
      root.add(shaft);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(pool * 0.5, length, 32, 1, true), shaft.material);
      inner.position.copy(shaft.position); inner.quaternion.copy(shaft.quaternion); root.add(inner);
    }

    // Marine snow: bright in the beam, dim blue outside it.
    const axis = hero.clone().sub(source).normalize(), reach = source.distanceTo(hero);
    const inBeam = (p: THREE.Vector3) => { const v = p.clone().sub(source), along = v.dot(axis); if (along < 0) return false; return v.addScaledVector(axis, -along).length() < pool * (along / reach); };
    const flakes: { p: THREE.Vector3; s: number; fall: number; sway: number }[] = [];
    const flakeCount = Math.round(mix(220, 560, mood.density));
    for (let i = 0; i < flakeCount; i++) flakes.push({ p: new THREE.Vector3(range(random, -15, 15), range(random, 0.1, 13), range(random, -14, 9)), s: range(random, 0.018, 0.05), fall: range(random, 0.5, 1.3), sway: random() * 6.283 });
    const lit = new THREE.Color('#ffffff').lerp(beam, 0.3), dim = background.clone().lerp(new THREE.Color('#b9d0f0'), 0.5);
    const snow = instances(root, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), flakes.map((f) => ({ at: f.p.toArray() as unknown as V3, scale: f.s, color: inBeam(f.p) ? lit : dim })));
    snow.castShadow = snow.receiveShadow = false;
    const speed = mix(0.05, 0.4, mood.energy), tint = new THREE.Color();
    const poseSnow = (time: number) => {
      flakes.forEach((f, i) => {
        const y = 13 - ((13 - f.p.y + time * f.fall * speed) % 12.9);
        pos.set(f.p.x + Math.sin(time * 0.3 + f.sway) * 0.15, y, f.p.z + Math.cos(time * 0.23 + f.sway) * 0.15);
        const bright = inBeam(pos);
        snow.setMatrixAt(i, m4.compose(pos, quat.identity(), sc.setScalar(f.s * (bright ? 1.5 : 1))));
        snow.setColorAt(i, tint.copy(bright ? lit : dim));
      });
      snow.instanceMatrix.needsUpdate = true;
      if (snow.instanceColor) snow.instanceColor.needsUpdate = true;
    };
    poseSnow(0);

    // Beyond the light.
    const drifters: { object: THREE.Object3D; base: THREE.Vector3; phase: number }[] = [];
    let blink: THREE.MeshStandardMaterial | null = null;
    if (a.beyond === 'sparks') {
      blink = mat('#bff0ff', { emissive: '#4fc8ff', emissiveIntensity: 3 });
      const dots: Spot[] = []; for (let i = 0; i < Math.round(38 * many); i++) dots.push({ at: [range(random, -16, 16), range(random, 0.6, 11), range(random, -20, -5)], scale: range(random, 0.05, 0.12) });
      instances(root, new THREE.SphereGeometry(1, 8, 6), blink, dots).castShadow = false;
    } else if (a.beyond === 'jellies') {
      const bell = new THREE.MeshStandardMaterial({ color: '#9fe8ff', emissive: '#49b8e8', emissiveIntensity: 1.6, transparent: true, opacity: 0.8, side: THREE.DoubleSide, roughness: 0.3 });
      for (let i = 0; i < 3 + Math.round(mood.density * 3); i++) {
        const g = new THREE.Group(), s = range(random, 0.35, 0.8);
        mesh(g, new THREE.SphereGeometry(s, 16, 10, 0, 6.2832, 0, Math.PI * 0.55), bell).castShadow = false;
        for (let k = 0; k < 7; k++) { const ang = k / 7 * 6.283; rod(g, [Math.cos(ang) * s * 0.6, -s * 0.1, Math.sin(ang) * s * 0.6], [Math.cos(ang) * s * 0.5 + range(random, -0.2, 0.2), -s * range(random, 1.8, 3), Math.sin(ang) * s * 0.5], s * 0.035, bell, s * 0.01, 4).castShadow = false; }
        g.position.set(range(random, -12, 12), range(random, 3, 9.5), range(random, -13, -5)); g.rotation.z = range(random, -0.4, 0.4); root.add(g);
        drifters.push({ object: g, base: g.position.clone(), phase: random() * 6 });
      }
    } else if (a.beyond === 'eyes') {
      blink = mat('#e9ffd0', { emissive: '#c8ff9a', emissiveIntensity: 2.6 });
      const dots: Spot[] = [];
      for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) { const x = range(random, -13, 13), y = range(random, 0.3, 3.2), z = range(random, -12, -7), gap = range(random, 0.12, 0.3), s = range(random, 0.05, 0.09); dots.push({ at: [x - gap, y, z], scale: s }, { at: [x + gap, y, z], scale: s }); }
      instances(root, new THREE.SphereGeometry(1, 8, 6), blink, dots).castShadow = false;
    } else if (a.beyond === 'shape') {
      const shadow = new THREE.MeshBasicMaterial({ color: background.clone().multiplyScalar(0.7), toneMapped: false });
      const g = new THREE.Group();
      const hull = new THREE.SphereGeometry(1, 24, 14); const hp = hull.attributes.position;
      for (let i = 0; i < hp.count; i++) { const x = hp.getX(i); hp.setY(i, hp.getY(i) * (x > 0 ? 1 - x * x * 0.25 : 1 - x * x * 0.75)); hp.setZ(i, hp.getZ(i) * (x > 0 ? 1 : 1 - x * x * 0.7)); }
      g.add(new THREE.Mesh(hull, shadow)); g.children[0].scale.set(9, 2.1, 1.6);
      const fluke = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.4, 3), shadow); fluke.position.set(-9.6, 0.2, 0); fluke.rotation.z = -Math.PI / 2; fluke.scale.z = 0.25; g.add(fluke);
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.4, 3), shadow); fin.position.set(3, -1.9, 0.6); fin.rotation.z = 2.5; fin.scale.z = 0.3; g.add(fin);
      g.position.set(range(random, -5, 4), range(random, 9.5, 12), -24); g.rotation.z = range(random, -0.12, 0.12);
      if (random() < 0.5) g.scale.x = -1;
      root.add(g);
      drifters.push({ object: g, base: g.position.clone(), phase: 0 });
    }

    // Camera.
    const camera = new THREE.PerspectiveCamera(a.vantage === 'low' ? 38 : 32, 1, 0.5, 160);
    const yaw = THREE.MathUtils.degToRad(range(random, -16, 16) + (a.source === 'lander' ? 8 : 0));
    const pitch = THREE.MathUtils.degToRad({ rov: 12, low: 4.5, high: 25 }[a.vantage]);
    const toCamera = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));

    const place = (items: readonly Placeable[]) => {
      const boxes: THREE.Box3[] = [];
      items.forEach((item, index) => {
        const [x, z, tall, wide] = SLOTS[index % SLOTS.length];
        const natural = Math.max(item.height, item.radius * 2, 0.05);
        const scale = Math.min((displaySize(natural) / natural) * (item.hero ? 1.2 : 1), tall / Math.max(item.height, 0.05), wide / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, 0, z);
        item.holder.rotation.y = yaw + (index === 0 ? range(random, 0.25, 0.6) * (random() < 0.5 ? -1 : 1) : Math.atan2(-x, 6) + range(random, -0.35, 0.35));
        item.holder.updateMatrixWorld(true);
        const box = visibleBounds(item.holder);
        box.min.y = Math.max(box.min.y, 0);
        if (!box.isEmpty()) boxes.push(box);
      });
      // Always keep the pool of light in frame, even when the cast is small.
      boxes.push(new THREE.Box3(new THREE.Vector3(hero.x - 2.6, 0, hero.z - 1.6), new THREE.Vector3(hero.x + 2.6, 2.6, hero.z + 1.6)));
      const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
      const centre = bounds.getCenter(new THREE.Vector3());
      centre.y += bounds.getSize(new THREE.Vector3()).y * 0.18;
      // Back off until every box sits inside the frame, with room above for the dark.
      let distance = 10;
      const corner = new THREE.Vector3();
      for (let pass = 0; pass < 8; pass++) {
        camera.position.copy(centre).addScaledVector(toCamera, distance);
        camera.position.y = Math.max(camera.position.y, 0.45);
        camera.lookAt(centre);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        let extent = 0;
        for (const box of boxes) for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { corner.set(x, y, z).project(camera); extent = Math.max(extent, Math.abs(corner.x), Math.abs(corner.y) * 1.12); }
        const next = distance * mix(1, extent / 0.74, 0.9);
        if (Math.abs(next - distance) < 0.05) break;
        distance = THREE.MathUtils.clamp(next, 5, 60);
      }
      const span = Math.max(bounds.getSize(new THREE.Vector3()).length(), 10);
      key.target.position.copy(centre).setY(0);
      key.position.copy(key.target.position).addScaledVector(source.clone().sub(hero).normalize(), span * 1.6);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span * 0.65; shadow.right = shadow.top = span * 0.65;
      shadow.near = 0.1; shadow.far = span * 4;
      shadow.updateProjectionMatrix();
    };

    const energy = mix(0.3, 1.4, mood.energy);
    return {
      object: root, camera, background, capacity: SLOTS.length, ground, keyLight: key, place,
      update(_dt, time) {
        poseSnow(time);
        posePlume(time * 0.035 * energy);
        for (const d of drifters) { d.object.position.x = d.base.x + Math.sin(time * 0.05 * energy + d.phase) * (a.beyond === 'shape' ? 6 : 1.2); d.object.position.y = d.base.y + Math.sin(time * 0.3 * energy + d.phase) * 0.3; }
        if (blink) blink.emissiveIntensity = 2.8 * (0.55 + 0.45 * Math.sin(time * (a.beyond === 'eyes' ? 0.9 : 2.3)) ** 2);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
