import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';
import { canvasTexture, displace, instances, mat, mesh, noise, paint, range, smooth, type Spot } from './lib';

// Standing places: x, z, height above the ground, tallest and widest a thing may be there.
// The hero stands in the open in the best light; the fourth stands on a ledge of crust.
const SLOTS: readonly (readonly [number, number, number, number, number])[] = [
  [0.4, 0, 0, 6.2, 3.4],
  [-4.8, -4.2, 0, 5.4, 2.7],
  [5.2, -3.2, 0, 5.4, 2.7],
  [8.2, -9.5, 2.4, 3.4, 1.8],
  [-1.6, -11, 0, 8, 4],
];
/** Big things shrink more than small ones, so a lander and a cliff can share the neck. */
const displaySize = (metres: number) => 1.6 * metres ** 0.42;

const CRUSTS = {
  charcoal: { say: 'Charcoal black, the darkest surface in the solar system.', base: '#26231f', light: '#4a4540', dust: '#5a544c' },
  brown: { say: 'Dark chocolate brown, faintly reddish where the sun strikes.', base: '#29211b', light: '#4e3e31', dust: '#57493d' },
  ash: { say: 'Ashen grey, like a cold hearth.', base: '#3a3936', light: '#65625d', dust: '#7b776f' },
  frosted: { say: 'Dark crust with a dusting of fresh frost on every sunlit face.', base: '#2a2826', light: '#7d8689', dust: '#9aa3a6' },
} as const;

export default defineWorld({
  questions: {
    activity: choice('How active is the comet right now?', {
      dormant: 'Dormant: still, no jets, only a faint haze lying along the horizon.',
      breathing: 'Breathing: a few thin pale jets rising from pits along the cliffs.',
      outburst: 'Full outburst: broad bright fans erupting everywhere, debris hanging in the sky.',
      waking: 'Waking: jets switching on one by one as the low sun reaches each pit.',
    }),
    terrain: choice('What is the floor of the neck like?', {
      pebbles: 'A plain of dark pebbles with scattered pale ice boulders.',
      dunes: 'Smooth dust drifts rippled into dunes by escaping gas.',
      plates: 'Cracked crust broken into tilted polygonal plates.',
      blocks: 'A field of house-sized blocks fallen from the cliffs.',
    }),
    cliffs: choice('How do the cliffs of the two lobes stand?', {
      towering: 'Towering layered cliffs close on both sides.',
      open: 'Far off on either side, the neck wide and open to the sky.',
      overhang: 'One great overhanging cliff leaning over the plain, half of it in shadow.',
      terraced: 'Stepped terraces climbing away like a ruined amphitheatre.',
    }),
    sky: choice('What does the sky hold?', {
      coma: 'Only the bright grey-blue glow of the coma, like an overcast day.',
      sun: 'The fierce small sun low over the horizon, a hard white star.',
      tail: 'A faint blue ion tail streaking away overhead.',
      orbiter: 'A tiny cross of an orbiter glinting high above, watching.',
      stars: 'A few faint stars showing through the haze.',
    }),
    left: choice('What was left here?', {
      nothing: 'Nothing: no one has ever been here.',
      lander: 'A small tipped lander lost in a shadowed crevice at the foot of the cliff, a light still blinking.',
      bounces: 'Three shallow scuffs in a line across the dust, where something touched down and bounced away.',
      foil: 'A scrap of gold foil caught on a boulder, glinting.',
      mast: 'A lone thin mast with a blinking marker light.',
    }),
    crust: choice('What colour is the crust?', Object.fromEntries(Object.entries(CRUSTS).map(([k, v]) => [k, v.say])) as Record<keyof typeof CRUSTS, string>),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const n = noise(random), m = noise(random);
    const crust = CRUSTS[a.crust];
    const base = new THREE.Color(crust.base).lerp(new THREE.Color('#4a443d'), mood.wear * 0.25), light = new THREE.Color(crust.light), dust = new THREE.Color(crust.dust);

    // ---- The sun: low, hard, and off to one side ----
    const noon = 1 - Math.abs(mood.daylight - 0.5) * 2;
    const side = mood.daylight < 0.5 ? -1 : 1;
    const elevation = THREE.MathUtils.degToRad(mix(7, 30, noon) * (a.activity === 'waking' ? 0.6 : 1));
    const azimuth = THREE.MathUtils.degToRad(a.sky === 'sun' ? 34 : 72) * side;
    const sunDir = new THREE.Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), -Math.cos(azimuth) * Math.cos(elevation)).normalize();
    const sunColour = new THREE.Color().setHSL(mix(0.6, 0.09, mood.warmth), mix(0.12, 0.35, mood.warmth), 0.93);

    // ---- Sky: a dome washed grey-blue by the coma, brightest around the sun ----
    const zenith = new THREE.Color('#5d6b7d').lerp(new THREE.Color('#7d8a9a'), mood.cheer * 0.6);
    const horizon = new THREE.Color('#a6b1bc').lerp(new THREE.Color('#c3cad0'), mood.cheer * 0.5);
    if (a.sky === 'stars') { zenith.multiplyScalar(0.75); horizon.multiplyScalar(0.9); }
    if (a.activity === 'outburst') horizon.lerp(new THREE.Color('#d6d9d6'), 0.35);
    const background = horizon.clone().lerp(zenith, 0.35);
    const dome = new THREE.SphereGeometry(600, 48, 24);
    paint(dome, (p, c) => {
      const d = p.clone().normalize();
      c.copy(horizon).lerp(zenith, smooth(-0.05, 0.75, d.y));
      const glow = Math.max(0, d.dot(sunDir));
      c.lerp(new THREE.Color('#f2f1ea'), glow ** 18 * 0.9 + glow ** 4 * 0.18);
      if (d.y < -0.02) c.copy(horizon).multiplyScalar(0.8);
    });
    const sky = new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -10;
    root.add(sky);
    if (a.sky === 'sun') {
      const sun = new THREE.Mesh(new THREE.CircleGeometry(7, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.9, 2.6), fog: false }));
      sun.position.copy(sunDir).multiplyScalar(560);
      sun.lookAt(0, 0, 0);
      root.add(sun);
      const flare = canvasTexture(128, 128, (ctx) => {
        const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,252,240,0.95)'); g.addColorStop(0.2, 'rgba(255,248,230,0.35)'); g.addColorStop(1, 'rgba(255,248,230,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
      });
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial({ map: flare, transparent: true, depthWrite: false, fog: false }));
      halo.position.copy(sunDir).multiplyScalar(550);
      halo.lookAt(0, 0, 0);
      root.add(halo);
    }
    if (a.sky === 'stars') {
      const stars: Spot[] = Array.from({ length: 90 }, () => {
        const az = range(random, -1.4, 1.4), el = range(random, 0.2, 1.3);
        return { at: [Math.sin(az) * Math.cos(el) * 520, Math.sin(el) * 520, -Math.cos(az) * Math.cos(el) * 520], scale: range(random, 0.5, 1.4) };
      });
      const s = instances(root, new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: '#f4f6ff', fog: false }), stars);
      s.castShadow = s.receiveShadow = false;
    }
    if (a.sky === 'tail') {
      // A faint blue streak sweeping away from the sun across the sky.
      const tail = new THREE.PlaneGeometry(1, 1, 60, 1);
      const tp = tail.attributes.position;
      const away = new THREE.Vector3(-sunDir.x, 0, -sunDir.z).normalize();
      for (let i = 0; i < tp.count; i++) {
        const u = tp.getX(i) + 0.5, v = tp.getY(i);
        const dir = new THREE.Vector3().copy(sunDir).multiplyScalar(1 - u).add(away.clone().multiplyScalar(u)).setY(mix(0.35, 0.75, u) + Math.sin(u * 5) * 0.03).normalize();
        const width = mix(4, 46, u) * v;
        const p = dir.multiplyScalar(500).add(new THREE.Vector3(0, width, 0));
        tp.setXYZ(i, p.x, p.y, p.z);
      }
      const ribbon = new THREE.Mesh(tail, new THREE.MeshBasicMaterial({ color: '#b9d2ff', transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      root.add(ribbon);
    }
    let glint: THREE.Object3D | null = null;
    if (a.sky === 'orbiter') {
      const g = new THREE.Group();
      const dark = new THREE.MeshBasicMaterial({ color: '#2c3240', fog: false });
      g.add(new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 2.4), dark), new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2), dark));
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 2.7), fog: false }));
      spark.position.set(1.2, 0.6, 0.6);
      g.add(spark);
      g.position.set(-side * 70, 210, -380);
      g.rotation.set(0.2, 0.3, -0.25);
      root.add(g);
      glint = spark;
    }

    // ---- Ground: the neck, a saddle rising toward the lobes and falling away to a close horizon ----
    const wallX = { towering: 14, open: 30, overhang: 15, terraced: 18 }[a.cliffs];
    const heightAt = (x: number, z: number) => {
      const saddle = (Math.max(0, Math.abs(x) - 6) ** 2) * 0.0045 * (30 / wallX);
      const fall = -(Math.max(0, -z - 16) ** 2) * 0.012;
      let h = saddle + fall + n(x, 0, z, 0.06) * 0.35 + n(z, x, 0, 0.25) * 0.08;
      if (a.terrain === 'dunes') h += Math.sin(x * 0.55 + z * 0.25 + n(x, z, 0, 0.05) * 3) * 0.12 * smooth(2, 6, Math.hypot(x, z));
      if (a.terrain === 'plates') {
        const cx = Math.floor(x / 3.2 + n(x, z, 1, 0.1)), cz = Math.floor(z / 3.2 + n(z, x, 1, 0.1));
        h += Math.sin(cx * 12.9898 + cz * 78.233) * 0.18;
      }
      // Keep the standing places level.
      for (const [sx, sz] of SLOTS) h *= 1 - 0.65 * Math.exp(-((x - sx) ** 2 + (z - sz) ** 2) / 8);
      return h;
    };
    const plain = new THREE.PlaneGeometry(150, 110, 140, 110);
    plain.rotateX(-Math.PI / 2);
    plain.translate(0, 0, -30);
    const pp = plain.attributes.position;
    for (let i = 0; i < pp.count; i++) pp.setY(i, heightAt(pp.getX(i), pp.getZ(i)));
    plain.computeVertexNormals();
    const pits: { x: number; z: number; r: number }[] = [];
    const pitCount = { dormant: 2, breathing: 4, outburst: 5, waking: 5 }[a.activity];
    for (let i = 0; i < pitCount; i++) pits.push({ x: range(random, -0.9, 0.9) * wallX, z: range(random, -30, -18), r: range(random, 1.2, 2.6) });
    paint(plain, (p, c) => {
      c.copy(base).lerp(dust, Math.max(0, n(p.x, p.z, 0, 0.08)) * 0.45);
      if (a.terrain === 'dunes') c.lerp(dust, 0.35 + Math.max(0, Math.sin(p.x * 0.55 + p.z * 0.25)) * 0.15);
      if (a.terrain === 'plates') {
        const fx = (p.x / 3.2 + n(p.x, p.z, 1, 0.1)) % 1, fz = (p.z / 3.2 + n(p.z, p.x, 1, 0.1)) % 1;
        const edge = Math.min(Math.abs(fx), 1 - Math.abs(fx), Math.abs(fz), 1 - Math.abs(fz));
        if (edge < 0.05) c.lerp(new THREE.Color('#0b0a09'), 0.85);
      }
      if (a.crust === 'frosted') c.lerp(light, Math.max(0, n(p.x * 2, p.z * 2, 0, 0.3)) * 0.35);
      for (const pit of pits) {
        const d = Math.hypot(p.x - pit.x, p.z - pit.z) / pit.r;
        if (d < 1.6) c.lerp(new THREE.Color('#090807'), (1 - smooth(0.6, 1.0, d)) * 0.95).lerp(light, Math.exp(-((d - 1.15) ** 2) / 0.02) * 0.4);
      }
      if (a.left === 'bounces') for (let k = 0; k < 3; k++) {
        const bx = -10 + k * 6.5, bz = -7 - k * 3.2;
        const d = Math.hypot((p.x - bx) / 1.3, (p.z - bz) / 0.8);
        if (d < 1) c.lerp(new THREE.Color('#141210'), (1 - smooth(0.5, 1, d)) * 0.8).lerp(dust, Math.exp(-((d - 1) ** 2) / 0.01) * 0.6);
      }
    });
    const groundMat = mat('#ffffff', { vertexColors: true, roughness: 1, flatShading: a.terrain === 'plates' });
    const ground = mesh(root, plain, groundMat);

    // ---- Cliffs: walls of banded dirty ice on both sides, their tops swelling into the lobes ----
    const strataTexture = (W: number, H: number, seed: number) => {
      const bands: { top: number; colour: THREE.Color }[] = [];
      const tones = [new THREE.Color(crust.base), new THREE.Color('#41372e'), new THREE.Color('#524e4a'), new THREE.Color('#6c7072'), new THREE.Color(crust.base)];
      for (let y = 0; y < H * 2.2;) { const t = H * range(random, 0.025, 0.09); y += t; bands.push({ top: y, colour: tones[Math.floor(random() * tones.length)].clone().offsetHSL(0, 0, range(random, -0.03, 0.03)) }); }
      const tilt = range(random, -0.12, 0.12);
      const streaks = Array.from({ length: 6 }, () => [range(random, -W / 2, W / 2), range(random, 0.8, 2.4), range(random, 0.2, 0.5)] as const);
      const tex = canvasTexture(512, 256, (ctx, w, h) => {
        const image = ctx.createImageData(w, h);
        const c = new THREE.Color();
        for (let py = 0; py < h; py++) {
          const y = (1 - py / h) * H;
          for (let px = 0; px < w; px++) {
            const x = (px / w - 0.5) * W;
            const level = y + x * tilt + n(x + seed, y, seed, 0.15) * H * 0.02 + H * 0.5;
            let lo = 0, hi = bands.length - 1;
            while (lo < hi) { const mid = (lo + hi) >> 1; if (level < bands[mid].top) hi = mid; else lo = mid + 1; }
            c.copy(bands[lo].colour).offsetHSL(0, 0, m(x, y, seed, 0.4) * 0.03);
            for (const [sx, sw, k] of streaks) {
              if (Math.abs(x - sx) > sw * 2.5) continue;
              const along = Math.exp(-(((x - sx) / sw) ** 2)) * smooth(H, H * 0.1, y) * k;
              if (along > 0.02) c.lerp(new THREE.Color('#1e1b18'), along * 0.4);
            }
            if (a.crust === 'frosted' && lo % 3 === 0) c.lerp(new THREE.Color('#c9d1d4'), 0.4);
            const o = (py * w + px) * 4;
            image.data[o] = c.r * 255; image.data[o + 1] = c.g * 255; image.data[o + 2] = c.b * 255; image.data[o + 3] = 255;
          }
        }
        ctx.putImageData(image, 0, 0);
      }, false);
      tex.colorSpace = THREE.LinearSRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    };
    const capMat = mat('#ffffff', { vertexColors: true, roughness: 1, flatShading: true });
    /** A wall whose face looks along +z in its own frame, then turned to face the neck. */
    const cliff = (W: number, H: number, T: number, faceSide: number, x: number, z: number, lean: number, seed: number) => {
      const g = new THREE.BoxGeometry(W, H, T, 80, 60, 8);
      g.translate(0, H / 2, -T / 2);
      const p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const y0 = v.y, front = smooth(-T * 0.7, 0, v.z);
        const u = Math.abs(v.x) / (W / 2);
        let dz = n(v.x + seed, y0, v.z, 0.12) * H * 0.05 * front + m(v.x, y0 * 3, seed, 0.3) * H * 0.012 * front;
        dz += Math.sin(y0 * 0.9 + n(v.x, seed, 0, 0.1)) * H * 0.008 * front;
        dz -= (y0 / H) * H * 0.18 * front;
        if (a.cliffs === 'terraced') dz -= Math.floor(y0 / (H / 3.5)) * H * 0.16 * front;
        if (a.cliffs === 'overhang' && lean > 0) dz += smooth(H * 0.55, H * 0.95, y0) * H * lean * front * Math.exp(-((v.x / (W * 0.3)) ** 2));
        let y = y0 * (1 - 0.6 * smooth(0.55, 1, u));
        // The top swells into the dome of the lobe behind.
        y += smooth(H * 0.9, H, y0) * (smooth(0, -T, v.z) * H * 0.35 + n(v.x, v.z, seed, 0.05) * H * 0.06);
        v.z += dz;
        v.y = y;
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      paint(g, (q, c) => { c.copy(base).lerp(dust, Math.max(0, n(q.x, q.z, seed, 0.05)) * 0.5); if (a.crust === 'frosted') c.lerp(light, 0.25); });
      const face = new THREE.MeshStandardMaterial({ map: strataTexture(W, H, seed), roughness: 0.95 });
      const wall = mesh(root, g, [face, face, capMat, capMat, face, capMat] as unknown as THREE.Material, [x, 0, z], 1, [0, faceSide * Math.PI / 2, 0]);
      return wall;
    };
    const leftH = { towering: 30, open: 18, overhang: 34, terraced: 24 }[a.cliffs] * range(random, 0.9, 1.1);
    const rightH = leftH * range(random, 0.55, 0.75);
    // Left lobe: its face looks toward +x. Right lobe: toward -x, further and lower.
    cliff(120, leftH, 50, 1, -wallX - 2, -30, a.cliffs === 'overhang' ? 0.35 : 0, 0);
    cliff(110, rightH, 46, -1, wallX + 4, -36, 0, 7);
    // The head of the big lobe looming over the far horizon.
    const lobe = displace(new THREE.SphereGeometry(1, 48, 32), (p) => n(p.x * 3, p.y * 3, p.z * 3, 0.6) * 0.06);
    paint(lobe, (q, c) => c.copy(base).lerp(dust, Math.max(0, n(q.x * 5, q.y * 5, q.z * 5, 0.5)) * 0.4).lerp(light, smooth(0.3, 0.9, q.clone().normalize().dot(sunDir)) * 0.35));
    mesh(root, lobe, capMat, [-side * 30, -40, -150], [90, 75, 60], [0, 0.4, 0]);

    // ---- The ledge: a shelf of crust for one standing place ----
    const [lx, lz, lh] = SLOTS[3];
    const tall = lh + 1.5;
    const shelf = new THREE.CylinderGeometry(3.3, 5.4, tall, 16, 6);
    displace(shelf, (p) => (n(p.x, p.y, p.z, 0.5) * 0.6 + n(p.z, p.x, p.y * 3, 1.2) * 0.2) * (p.y < tall / 2 - 0.05 ? 1 : 0.1));
    paint(shelf, (q, c) => {
      const band = Math.sin(q.y * 3.2 + n(q.x, q.z, 0, 0.3) * 1.5);
      c.copy(base).lerp(new THREE.Color('#5a554f'), band > 0.5 ? 0.55 : 0).lerp(dust, q.y > tall / 2 - 0.1 ? 0.6 : 0);
    });
    mesh(root, shelf, capMat, [lx, heightAt(lx, lz) + tall / 2 - 1.5, lz], [1.15, 1, 0.9], [0, 0.3, 0]);

    // ---- Pebbles and boulders, kept off the standing places ----
    const clear = (x: number, z: number, r: number) => SLOTS.every(([sx, sz], i) => Math.hypot(x - sx, z - sz) > (i === 3 ? 4.6 : 2.4) + r);
    const pebbles: Spot[] = [];
    const pebbleCount = Math.round(mix(500, 1300, mood.density) * (a.terrain === 'dunes' ? 0.35 : 1));
    for (let i = 0; pebbles.length < pebbleCount && i < pebbleCount * 3; i++) {
      const x = range(random, -wallX, wallX), z = range(random, -34, 14), s = range(random, 0.04, 0.22) * (random() < 0.05 ? 3 : 1);
      if (!clear(x, z, s * 0.5 - 1.6)) continue;
      pebbles.push({ at: [x, heightAt(x, z) + s * 0.25, z], scale: [s, s * range(random, 0.5, 0.9), s * range(random, 0.7, 1.2)], rot: [random() * 3, random() * 3, random() * 3], color: random() < 0.12 ? '#9aa3a6' : random() < 0.5 ? '#3d3732' : '#57504a' });
    }
    instances(root, new THREE.DodecahedronGeometry(1, 0), mat('#ffffff', { flatShading: true, roughness: 0.9 }), pebbles);
    const boulders: Spot[] = [];
    const boulderCount = Math.round(mix(10, 26, mood.density) * (a.terrain === 'blocks' ? 2.2 : a.terrain === 'dunes' ? 0.5 : 1));
    for (let i = 0; boulders.length < boulderCount && i < boulderCount * 6; i++) {
      const x = range(random, -wallX + 1, wallX - 1), z = range(random, -32, 10);
      let s = range(random, 0.5, a.terrain === 'blocks' ? 3.2 : 1.8);
      if (z > -3) s = Math.min(s, 1.1);
      if (!clear(x, z, s) || (z > 2 && Math.abs(x) < 10)) continue;
      const pale = random() < 0.35;
      boulders.push({ at: [x, heightAt(x, z) + s * 0.35, z], scale: [s * range(random, 0.9, 1.4), s * range(random, 0.6, 0.9), s], rot: [random() * 0.5, random() * 3, random() * 0.5], color: pale ? '#b9c2c5' : random() < 0.5 ? '#3a342f' : '#4d463f' });
    }
    instances(root, displace(new THREE.IcosahedronGeometry(1, 1), (p) => n(p.x * 2, p.y * 2, p.z * 2, 1) * 0.18), mat('#ffffff', { flatShading: true, roughness: 0.85 }), boulders);

    // ---- Jets: pale fans rising from pits on the plain and the cliff tops ----
    const streak = canvasTexture(128, 256, (ctx, w, h) => {
      ctx.fillStyle = '#e9ecee';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        ctx.strokeStyle = random() < 0.3 ? '#8d9295' : '#ffffff';
        ctx.globalAlpha = range(random, 0.2, 0.7);
        ctx.lineWidth = range(random, 1, 4);
        const x = random() * w;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + range(random, -4, 4), h); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
    streak.wrapS = streak.wrapT = THREE.RepeatWrapping;
    const fade = canvasTexture(32, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.15, '#e0e0e0'); g.addColorStop(0.55, '#5a5a5a'); g.addColorStop(1, '#000000');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }, false);
    const flows: THREE.Texture[] = [];
    const jets: { mesh: THREE.Mesh; phase: number; base: number }[] = [];
    const jet = (x: number, y: number, z: number, H: number, lean: number, spread: number, strength: number, shells = 2) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      group.rotation.set(range(random, -0.1, 0.1), 0, lean);
      root.add(group);
      for (const [k, opacity] of ([[0.55, 0.85], [1, 0.45]] as const).slice(2 - shells)) {
        const map = streak.clone();
        map.needsUpdate = true;
        map.repeat.set(2, 1.5);
        map.offset.set(random(), random());
        flows.push(map);
        const rb = H * 0.035, rt = rb + H * spread * k;
        const g = new THREE.CylinderGeometry(rt, rb, H, 20, 3, true).translate(0, H / 2, 0);
        const material = new THREE.MeshStandardMaterial({ color: '#ffffff', map, alphaMap: fade, emissive: '#eef2f4', emissiveMap: map, emissiveIntensity: mix(0.5, 1.1, mood.cheer), transparent: true, opacity: opacity * strength, depthWrite: false, side: THREE.DoubleSide, roughness: 1 });
        const shell = new THREE.Mesh(g, material);
        shell.scale.z = 0.6;
        shell.renderOrder = 3;
        group.add(shell);
        jets.push({ mesh: shell, phase: random() * 6, base: 1 });
      }
    };
    if (a.activity !== 'dormant') {
      const big = a.activity === 'outburst';
      pits.forEach((pit, i) => {
        const lit = a.activity !== 'waking' || (pit.x * side > -wallX * 0.2);
        if (!lit) return;
        jet(pit.x, heightAt(pit.x, pit.z), pit.z, range(random, 18, 34) * (big ? 1.4 : 1), range(random, -0.3, 0.3), big ? range(random, 0.25, 0.45) : range(random, 0.08, 0.18), big ? 1 : 0.75);
        void i;
      });
      // From the cliff tops too.
      const extra = big ? 3 : 2;
      for (let i = 0; i < extra; i++) {
        const left = i % 2 === 0;
        const x = left ? -wallX - range(random, 4, 14) : wallX + range(random, 6, 16), z = range(random, -50, -22);
        jet(x, (left ? leftH : rightH) * 0.95, z, range(random, 22, 40) * (big ? 1.3 : 1), (left ? 1 : -1) * range(random, 0.1, 0.4), big ? 0.35 : 0.12, big ? 0.9 : 0.6, 1);
      }
    } else {
      // A faint haze lying along the horizon, fading upward.
      const hazeMap = canvasTexture(8, 128, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, h, 0, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.35, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      });
      const haze = new THREE.Mesh(new THREE.CylinderGeometry(160, 160, 30, 64, 1, true), new THREE.MeshBasicMaterial({ color: horizon.clone().lerp(new THREE.Color('#ffffff'), 0.4), map: hazeMap, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.BackSide, fog: false }));
      haze.position.set(0, -6, 0);
      root.add(haze);
    }
    // Outburst debris hanging in the sky.
    if (a.activity === 'outburst') {
      const bits: Spot[] = Array.from({ length: 60 }, () => ({ at: [range(random, -40, 40), range(random, 6, 40), range(random, -70, -20)], scale: range(random, 0.1, 0.6), rot: [random() * 3, random() * 3, random() * 3], color: random() < 0.4 ? '#c7cfd2' : '#3d3732' }));
      const debris = instances(root, new THREE.DodecahedronGeometry(1, 0), mat('#ffffff', { flatShading: true }), bits);
      debris.castShadow = false;
    }

    // ---- What was left here ----
    const blinkers: THREE.MeshStandardMaterial[] = [];
    if (a.left === 'lander') {
      // In the shadow at the foot of the left cliff, tipped into a crevice.
      const lander = new THREE.Group();
      const cells = new THREE.MeshStandardMaterial({ color: '#23346e', roughness: 0.35, metalness: 0.4 });
      const foil = mat('#b8913f', { metalness: 0.6, roughness: 0.4 });
      lander.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.85), foil));
      for (const [px, pz, ry] of [[0, 0.43, 0], [0, -0.43, Math.PI], [0.5, 0, Math.PI / 2], [-0.5, 0, -Math.PI / 2]] as const) {
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(px ? 0.8 : 0.95, 0.55), cells);
        panel.position.set(px * 1.01, 0, pz * 1.01);
        panel.rotation.y = ry;
        lander.add(panel);
      }
      for (let k = 0; k < 3; k++) {
        const ang = k * 2.09;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), mat('#c8cbce', { metalness: 0.6 }));
        leg.position.set(Math.cos(ang) * 0.4, -0.5, Math.sin(ang) * 0.4);
        leg.rotation.set(Math.sin(ang) * 0.6, 0, -Math.cos(ang) * 0.6);
        lander.add(leg);
      }
      const light = new THREE.MeshStandardMaterial({ color: '#9dffb0', emissive: '#3cff6a', emissiveIntensity: 2.4 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), light);
      bulb.position.set(0.2, 0.34, 0.3);
      lander.add(bulb);
      blinkers.push(light);
      lander.traverse((node) => { const mm = node as THREE.Mesh; if (mm.isMesh) mm.castShadow = mm.receiveShadow = true; });
      const x = -wallX + 1.6, z = -9;
      lander.position.set(x, heightAt(x, z) + 0.5, z);
      lander.rotation.set(0.2, 0.6, -0.9 * -1);
      lander.scale.setScalar(1.1);
      root.add(lander);
      // The crevice it fell into.
      mesh(root, new THREE.SphereGeometry(1, 16, 10), mat('#060505', { roughness: 1 }), [x - 0.3, heightAt(x, z) - 0.2, z], [1.3, 0.5, 2.4]);
    } else if (a.left === 'foil') {
      const scrap = new THREE.PlaneGeometry(0.9, 0.6, 6, 4);
      displace(scrap, (p) => n(p.x * 4, p.y * 4, 0, 1) * 0.12);
      const x = -3.4, z = 3.2;
      mesh(root, scrap, new THREE.MeshStandardMaterial({ color: '#e0b552', metalness: 0.9, roughness: 0.2, emissive: '#6b4a10', emissiveIntensity: 0.4, side: THREE.DoubleSide }), [x, heightAt(x, z) + 0.25, z], 1, [-1.1, 0.4, 0.3]);
      mesh(root, new THREE.IcosahedronGeometry(0.6, 1), mat('#4a433c', { flatShading: true }), [x - 0.5, heightAt(x, z) + 0.3, z - 0.3]);
    } else if (a.left === 'mast') {
      const x = 3.6, z = -8;
      mesh(root, new THREE.CylinderGeometry(0.03, 0.04, 3.2, 6), mat('#c9ccd0', { metalness: 0.6 }), [x, heightAt(x, z) + 1.6, z]);
      const light = new THREE.MeshStandardMaterial({ color: '#ffb0a0', emissive: '#ff3b2a', emissiveIntensity: 2.4 });
      mesh(root, new THREE.SphereGeometry(0.09, 8, 6), light, [x, heightAt(x, z) + 3.25, z]);
      mesh(root, new THREE.CylinderGeometry(0.35, 0.45, 0.12, 10), mat('#2b2d31'), [x, heightAt(x, z) + 0.06, z]);
      blinkers.push(light);
    }

    // ---- Light: a hard low key from the sun, a weak grey-blue fill from the coma ----
    root.add(new THREE.HemisphereLight(zenith.clone().lerp(new THREE.Color('#ffffff'), 0.3), '#2a2622', mix(0.55, 0.85, mood.cheer)));
    const key = new THREE.DirectionalLight(sunColour, mix(3.4, 4.2, noon));
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.04;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#b7c4d4', 0.35);
    fill.position.copy(sunDir).multiplyScalar(-40).setY(20);
    root.add(fill);

    // ---- Camera: low and slightly wide, so the cliffs tower and the horizon bends ----
    const camera = new THREE.PerspectiveCamera(64, 1, 0.3, 1600);
    const yaw = THREE.MathUtils.degToRad(range(random, -7, 7));
    const pitch = THREE.MathUtils.degToRad(range(random, 3.5, 6.5));
    const toCamera = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));

    const place = (items: readonly Placeable[]) => {
      const boxes: THREE.Box3[] = [];
      items.forEach((item, index) => {
        const [x, z, lift, tall, wide] = SLOTS[index % SLOTS.length];
        const natural = Math.max(item.height, item.radius * 2, 0.05);
        const scale = Math.min((displaySize(natural) / natural) * (item.hero ? 1.15 : 1), tall / Math.max(item.height, 0.05), wide / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, heightAt(x, z) + lift, z);
        item.holder.rotation.y = yaw + Math.atan2(-x, 18) * 0.6 + range(random, -0.35, 0.35);
        item.holder.updateMatrixWorld(true);
        const box = visibleBounds(item.holder);
        box.min.y = Math.max(box.min.y, item.holder.position.y);
        if (!box.isEmpty()) boxes.push(box);
      });
      // Keep the open neck in frame even when the cast is small.
      boxes.push(new THREE.Box3(new THREE.Vector3(-5, 0, -6), new THREE.Vector3(5, 3.5, 1.5)));
      const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
      const centre = bounds.getCenter(new THREE.Vector3());
      centre.y = Math.max(centre.y * 0.85, 1.4) + bounds.getSize(new THREE.Vector3()).y * 0.1;
      let distance = 16;
      const corner = new THREE.Vector3();
      for (let pass = 0; pass < 10; pass++) {
        camera.position.copy(centre).addScaledVector(toCamera, distance);
        camera.position.y = Math.max(camera.position.y, heightAt(camera.position.x, camera.position.z) + 1.2);
        camera.lookAt(centre);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        let extent = 0;
        for (const box of boxes) for (const bx of [box.min.x, box.max.x]) for (const by of [box.min.y, box.max.y]) for (const bz of [box.min.z, box.max.z]) {
          corner.set(bx, by, bz).project(camera);
          if (corner.z < 1) extent = Math.max(extent, Math.abs(corner.x), Math.abs(corner.y) * 1.1);
        }
        const next = distance * mix(1, extent / 0.84, 0.9);
        if (Math.abs(next - distance) < 0.05) break;
        distance = THREE.MathUtils.clamp(next, 8, 70);
      }
      const span = Math.max(bounds.getSize(new THREE.Vector3()).length(), 24);
      key.target.position.set(centre.x, 0, centre.z);
      key.position.copy(key.target.position).addScaledVector(sunDir, span * 2.2);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span * 1.1;
      shadow.right = shadow.top = span * 1.1;
      shadow.near = 0.5; shadow.far = span * 6;
      shadow.updateProjectionMatrix();
      sky.position.copy(camera.position);
    };

    const pace = mix(0.1, 1.2, mood.energy);
    return {
      object: root, camera, background, capacity: SLOTS.length, ground, keyLight: key, place,
      update(dt, time) {
        flows.forEach((map, i) => { map.offset.y -= dt * pace * (0.1 + (i % 2) * 0.05); });
        jets.forEach((j) => { const k = 1 + Math.sin(time * pace + j.phase) * 0.06; j.mesh.scale.x = k; });
        for (const b of blinkers) b.emissiveIntensity = Math.sin(time * 2.4) > 0.6 ? 2.6 : 0.1;
        if (glint) glint.scale.setScalar(0.8 + 0.5 * Math.sin(time * pace * 3) ** 2);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
