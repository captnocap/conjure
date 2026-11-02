import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, paint, paintHex, score } from '@conjure/kit';

type P = [number, number, number];

/** A soft radial puff, for dust haze. */
function puffMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/** The national flag as a light projection: red, white and black bands with a gold eagle. */
function flagMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 384;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#ce1126'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#ffffff'; g.fillRect(0, 128, 512, 128);
  g.fillStyle = '#111111'; g.fillRect(0, 256, 512, 128);
  g.fillStyle = '#c09300';
  g.beginPath(); g.moveTo(256, 140); g.lineTo(290, 170); g.lineTo(282, 240); g.lineTo(256, 248); g.lineTo(230, 240); g.lineTo(222, 170); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(222, 170); g.lineTo(196, 150); g.lineTo(206, 210); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(290, 170); g.lineTo(316, 150); g.lineTo(306, 210); g.closePath(); g.fill();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    lighting: choice('How is the tower lit right now?', {
      plain: 'Not lit: bare weathered concrete, only the deck windows showing.',
      floodlit: 'Floodlit: the whole lattice washed in one strong colour of light.',
      flag: 'The national flag projected round the shaft in red, white and black bands.',
      festival: 'Festival: the lattice in coloured light with a ring of bright bulbs under the deck.',
    }),
    wash: paint('If the lattice is floodlit, what colour is the light?', ['blue', 'turquoise', 'magenta', 'purple', 'green', 'amber', 'red', 'white', 'gold', 'pink']),
    antenna: noul('Is the antenna lit, red warning lamps climbing the mast?'),
    state: choice('What state is the tower in?', {
      proud: 'Freshly restored: clean pale concrete, every strip crisp.',
      tired: 'Tired: stained grey concrete, a few lattice strips broken away.',
      scaffold: 'Under restoration: scaffolding and green netting wrapped round part of the shaft.',
    }),
    haze: score('How much dust haze hangs round the top?', ['Clear air', 'A faint dust veil', 'A sandstorm swallowing the crown']),
    foot: choice('What is at the foot of the tower?', {
      garden: 'A round garden with royal palms and lawns.',
      plaza: 'A bare paved forecourt with a low entrance pavilion.',
      traffic: 'A crowded roundabout of parked cars and a boundary wall.',
    }),
    turning: noul('Is the revolving restaurant turning, its window band slowly moving?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const glow = Math.min(1, Math.max(0, lowSun * 1.25 - 0.25));
    const tired = a.state === 'tired' ? 1 : 0;
    const dirt = Math.min(1, mood.wear * 0.7 + tired * 0.4);

    const concrete = s.material(new THREE.Color('#d8cbb3').lerp(new THREE.Color('#8c8478'), dirt), { roughness: 0.9 });
    const coreGrey = s.material(new THREE.Color('#7d756a').lerp(new THREE.Color('#4f4a44'), dirt), { roughness: 0.95 });
    const lit = a.lighting === 'floodlit' || a.lighting === 'festival';
    const washHex = paintHex(a.wash);
    const strip = s.material(new THREE.Color('#eee4cf').lerp(new THREE.Color('#9d9384'), dirt).lerp(new THREE.Color(lit ? paintHex(a.wash) : '#eee4cf'), lit ? 0.45 : 0), {
      roughness: 0.85,
      emissive: lit ? washHex : '#000000',
      emissiveIntensity: lit ? mix(0.55, 1.2, glow) : 0,
    });
    const dark = s.material('#2b2a2c', { roughness: 0.7 });
    const windowGlow = s.material('#3a3b3c', { emissive: '#ffcf7a', emissiveIntensity: mix(0.05, 1.4, glow), roughness: 0.4 });

    // Radius of the lattice skin up the height: a straight shaft that flares into a lotus bud.
    const SHAFT = 6.4, BASE_TOP = 10, FLARE = 128, CROWN = 153;
    const radius = (y: number) => {
      if (y < FLARE) return SHAFT + (y < 20 ? (20 - y) * 0.06 : 0);
      const t = (y - FLARE) / (CROWN - FLARE);
      return SHAFT + Math.sin(t * Math.PI * 0.62) * 5.4;
    };

    // The concrete core: a tube seen through the lattice.
    s.cylinder(SHAFT - 0.5, SHAFT - 0.3, CROWN - BASE_TOP, [0, (CROWN + BASE_TOP) / 2, 0], coreGrey, 28);

    // The diamond lattice: two families of helices crossing, each strip a thin flat box tangent to the skin.
    const N = 22, CELL = 5.2;
    const rate = (Math.PI * 2 / N) / CELL;
    const segments: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
    const broken = new Set<number>();
    const step = CELL / 2;
    for (const dir of [1, -1])
      for (let k = 0; k < N; k++)
        for (let y = BASE_TOP + 2; y < CROWN - 0.01; y += step) {
          const y1 = Math.min(CROWN, y + step);
          const point = (yy: number) => { const t = (k / N) * Math.PI * 2 + dir * rate * (yy - BASE_TOP); const r = radius(yy); return new THREE.Vector3(Math.sin(t) * r, yy, Math.cos(t) * r); };
          segments.push({ a: point(y), b: point(y1) });
        }
    if (tired || mood.wear > 0.6) for (let i = 0; i < 18 + mood.wear * 30; i++) broken.add(Math.floor(random() * segments.length));
    const lattice = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), strip, segments.length);
    const m = new THREE.Matrix4(), up = new THREE.Vector3(), out = new THREE.Vector3(), side = new THREE.Vector3();
    let count = 0;
    for (const [index, { a: p0, b: p1 }] of segments.entries()) {
      if (broken.has(index)) continue;
      up.subVectors(p1, p0);
      const len = up.length();
      up.normalize();
      out.set(p0.x + p1.x, 0, p0.z + p1.z).normalize();
      side.crossVectors(up, out).normalize();
      out.crossVectors(side, up).normalize();
      m.makeBasis(side, up, out).scale(new THREE.Vector3(0.55, len + 0.5, 0.45));
      m.setPosition((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2);
      lattice.setMatrixAt(count++, m);
    }
    lattice.count = count;
    lattice.instanceMatrix.needsUpdate = true;
    lattice.castShadow = lattice.receiveShadow = true;
    s.root.add(lattice);
    // Horizontal bands binding the lattice at intervals and a heavier ring where the bud opens.
    for (let y = BASE_TOP + 2; y < FLARE; y += CELL * 6) s.ring(SHAFT + 0.05, 0.28, [0, y, 0], strip).rotation.x = Math.PI / 2;
    s.ring(radius(FLARE), 0.45, [0, FLARE, 0], strip).rotation.x = Math.PI / 2;

    // The crown: restaurant drum with its window band, the observation deck, a roof and the mast.
    const crown = new THREE.Group();
    s.root.add(crown);
    s.cylinder(8.6, 8.2, 3, [0, CROWN - 4.5, 0], concrete, 32);
    const restaurant = new THREE.Group();
    restaurant.position.y = CROWN - 1.5;
    s.root.add(restaurant);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(9.1, 9.1, 3.2, 40), windowGlow);
    drum.castShadow = true;
    restaurant.add(drum);
    for (let i = 0; i < 24; i++) {
      const t = (i / 24) * Math.PI * 2;
      const mull = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.3, 0.35), concrete);
      mull.position.set(Math.sin(t) * 9.15, 0, Math.cos(t) * 9.15);
      restaurant.add(mull);
    }
    s.cylinder(9.8, 9.6, 0.7, [0, CROWN + 0.45, 0], concrete, 40);
    s.cylinder(8.4, 8.4, 2.6, [0, CROWN + 2.1, 0], windowGlow, 36);
    s.cylinder(9.4, 9.4, 0.5, [0, CROWN + 3.6, 0], concrete, 40);
    for (let i = 0; i < 36; i++) { const t = (i / 36) * Math.PI * 2; s.box([0.12, 1.1, 0.12], [Math.sin(t) * 9.3, CROWN + 4.4, Math.cos(t) * 9.3], dark); }
    s.ring(9.3, 0.06, [0, CROWN + 4.9, 0], dark).rotation.x = Math.PI / 2;
    s.cylinder(5.2, 7.4, 2.4, [0, CROWN + 5.0, 0], concrete, 28);
    s.cylinder(2.2, 2.6, 4, [0, CROWN + 8, 0], concrete, 16);
    const mastTop = 187;
    s.rod([0, CROWN + 10, 0], [0, mastTop, 0], 0.7, s.material('#d8d6d0', { metalness: 0.4, roughness: 0.5 }), 0.25);
    for (let y = CROWN + 13; y < mastTop - 2; y += 5) s.ring(0.75 - (y - CROWN) * 0.012, 0.1, [0, y, 0], s.material('#c23a2a')).rotation.x = Math.PI / 2;
    const beacon = s.material('#a02a20', { emissive: '#ff2a1a', emissiveIntensity: a.antenna ? mix(0.8, 2.4, glow) : 0 });
    if (a.antenna) for (let y = CROWN + 12; y < mastTop; y += 6) s.ball([0.5, 0.5, 0.5], [0.6, y, 0], beacon, 8);
    s.ball([0.6, 0.6, 0.6], [0, mastTop, 0], beacon, 10);

    // The flag projection: a glowing band of light round the middle of the shaft.
    if (a.lighting === 'flag') {
      const map = flagMap();
      const band = s.mesh(new THREE.CylinderGeometry(SHAFT + 0.45, SHAFT + 0.45, 42, 40, 1, true, -Math.PI * 0.5, Math.PI), new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: mix(0.3, 0.95, glow), transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.9 }), [0, 82, 0]);
      band.castShadow = false;
    }
    // Festival bulbs: a ring of bright points under the deck.
    if (a.lighting === 'festival') {
      const bulbColours = ['#ffd35a', '#ff5aa8', '#5ad2ff', '#a8ff5a'];
      s.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffe6a0', emissiveIntensity: 1.6 }),
        Array.from({ length: 64 }, (_u, i) => { const t = (i / 64) * Math.PI * 2; return { at: [Math.sin(t) * 9.9, CROWN - 0.3 - (i % 2) * 0.8, Math.cos(t) * 9.9] as P, size: 0.38, color: bulbColours[i % 4] }; }));
    }

    // Scaffolding and netting wrapped round part of the shaft.
    if (a.state === 'scaffold') {
      const pipe = s.material('#8a8e92', { metalness: 0.5, roughness: 0.5 });
      const y0 = 30 + random() * 30, h = 30 + random() * 20;
      const tubes: { at: P; size: P }[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = -0.9 + (i / 8) * 1.8;
        const x = Math.sin(t) * (SHAFT + 1.6), z = Math.cos(t) * (SHAFT + 1.6);
        tubes.push({ at: [x, y0 + h / 2, z], size: [0.16, h, 0.16] });
      }
      for (let y = 0; y <= h; y += 2.5) for (let i = 0; i < 8; i++) {
        const t0 = -0.9 + (i / 8) * 1.8, t1 = t0 + 1.8 / 8, t = (t0 + t1) / 2;
        const len = 2 * (SHAFT + 1.6) * Math.sin((t1 - t0) / 2);
        tubes.push({ at: [Math.sin(t) * (SHAFT + 1.6), y0 + y, Math.cos(t) * (SHAFT + 1.6)], size: [len, 0.14, 0.14] });
      }
      const grid = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), pipe, tubes.length);
      tubes.forEach(({ at, size }, i) => {
        const angle = Math.atan2(at[0], at[2]);
        m.makeRotationY(angle).scale(new THREE.Vector3(...size)).setPosition(...at);
        grid.setMatrixAt(i, m);
      });
      grid.castShadow = true;
      s.root.add(grid);
      const net = s.mesh(new THREE.CylinderGeometry(SHAFT + 1.75, SHAFT + 1.75, h * 0.7, 24, 1, true, -0.9, 1.4), new THREE.MeshStandardMaterial({ color: '#3f7a52', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, roughness: 1 }), [0, y0 + h * 0.4, 0]);
      net.castShadow = false;
    }

    // The base: a two-tier round podium with the entrance facing the viewer.
    s.cylinder(15, 16, 5, [0, 2.5, 0], concrete, 36);
    s.cylinder(10, 11, 5, [0, 7.5, 0], concrete, 32);
    s.box([6, 7, 1.5], [0, 3.5, 15.6], concrete);
    s.box([4.2, 5, 0.3], [0, 2.5, 16.4], s.material('#1f2a30', { emissive: '#ffcf7a', emissiveIntensity: mix(0, 0.6, glow) }));
    for (let i = 0; i < 18; i++) { const t = (i / 18) * Math.PI * 2; s.box([1.2, 3, 0.2], [Math.sin(t) * 15.6, 3, Math.cos(t) * 15.6], dark).rotation.y = t; }

    if (a.foot === 'garden') {
      s.cylinder(30, 30, 0.3, [0, 0.15, 0], s.material('#6f8a4a', { roughness: 1 }), 40);
      const trunk = s.material('#9a8a74'), frond = s.material('#3f6a34', { roughness: 0.9 });
      for (let i = 0; i < 10; i++) {
        const t = (i / 10) * Math.PI * 2 + random() * 0.2, r = 22 + random() * 5, x = Math.sin(t) * r, z = Math.cos(t) * r, h = 14 + random() * 6;
        s.cylinder(0.35, 0.5, h, [x, h / 2, z], trunk, 8);
        for (let f = 0; f < 6; f++) { const ft = (f / 6) * Math.PI * 2; s.rod([x, h, z], [x + Math.sin(ft) * 4, h - 1.8, z + Math.cos(ft) * 4], 0.5, frond, 0.1); }
      }
    } else if (a.foot === 'plaza') {
      s.cylinder(28, 28, 0.25, [0, 0.12, 0], s.material('#cdbfa6', { roughness: 0.95 }), 40);
      s.box([14, 4, 6], [0, 2, 21], concrete);
      s.box([15, 0.6, 7], [0, 4.3, 21], s.material('#a39886'));
    } else {
      s.cylinder(28, 28, 0.25, [0, 0.12, 0], s.material('#6a6660', { roughness: 0.95 }), 40);
      const carColours = ['#e9e4d8', '#2a2a2a', '#c8b04a', '#7d1f22', '#5a6a7a', '#d6d2c8'];
      s.scatter(new THREE.BoxGeometry(1, 0.35, 0.45), s.material('#ffffff', { roughness: 0.5 }),
        Array.from({ length: 26 }, (_u, i) => { const t = (i / 26) * Math.PI * 2 + random() * 0.1, r = 20 + (i % 2) * 3.2; return { at: [Math.sin(t) * r, 0.9, Math.cos(t) * r] as P, size: 4.2, color: carColours[Math.floor(random() * carColours.length)] }; }));
      s.ring(27, 0.6, [0, 0.9, 0], s.material('#b7ab96')).rotation.x = Math.PI / 2;
    }

    // Dust haze round the crown: soft ochre veils, thicker with wear.
    const haze = Math.min(1, a.haze + mood.wear * 0.25);
    if (haze > 0.08) {
      const puff = puffMap();
      const dust = new THREE.MeshBasicMaterial({ map: puff, color: '#d7b98a', transparent: true, opacity: Math.min(0.55, 0.15 + haze * 0.45), depthWrite: false, side: THREE.DoubleSide });
      const veils = Math.round(6 + haze * 12);
      for (let i = 0; i < veils; i++) {
        const w = 18 + random() * 18 + haze * 20;
        const t = random() * Math.PI * 2;
        const mesh = s.mesh(new THREE.PlaneGeometry(w, w * 0.5), dust, [Math.sin(t) * 10, CROWN - 30 + random() * (35 + haze * 25), Math.cos(t) * 10]);
        mesh.castShadow = false;
      }
    }

    const speed = a.turning ? mix(0.01, 0.06, mood.energy) : 0;
    return s.finish({ footprint: 16, update: (dt) => { restaurant.rotation.y += dt * speed; } });
  },
});
