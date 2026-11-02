import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};
const flat = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

const R = 0.3, TOP = 2.6;

export default defineThing({
  questions: {
    steam: choice('How much steam is pouring out?', {
      wisp: 'A lazy wisp curling up and drifting off.',
      plume: 'A roaring white plume billowing high over the street.',
      none: 'None: the stack just stands there, cold and quiet.',
    }),
    surround: choice('What is around it?', {
      bare: 'Nothing: the stack alone on its asphalt patch.',
      cones: 'Traffic cones and an orange-and-white striped sawhorse barricade.',
      litter: 'A crumpled hot dog wrapper on the asphalt and a pigeon pecking at it.',
      wreath: 'A Christmas wreath with a red bow that someone hung on it.',
    }),
    season: choice('What time of year is it?', {
      summer: 'High summer: sun-bleached asphalt and heat shimmering off the street.',
      winter: 'Deep winter: grey slush at the kerb, the steam freezing into a low fog.',
      rain: 'A rainy night: a dark puddle around the manhole reflecting everything.',
      autumn: 'Autumn: a few dry leaves blown against the collar.',
    }),
    stickers: noul('Have people slapped stickers and a graffiti tag on it?'),
    barricade: choice('If there is a barricade, what state is it in?', {
      standing: 'Standing neatly where the crew left it.',
      knocked: 'Knocked over and crumpled, clipped by a passing car.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.3) / 0.7)) * (a.season === 'rain' ? 1 : 0.8) + (a.season === 'rain' ? 0.2 : 0);
    const grime = mood.wear;
    const updatesList: ((time: number) => void)[] = [];

    // ---- Asphalt patch and the cast-iron manhole rim.
    const asphalt = s.material(a.season === 'summer' ? '#6e6c68' : '#47494c', { roughness: 0.95 });
    const patchShape = new THREE.Shape();
    for (let i = 0; i < 12; i++) {
      const an = (i / 12) * Math.PI * 2, r = (i % 2 ? 1.35 : 1.5) * (0.92 + random() * 0.16);
      const x = Math.cos(an) * r * 1.2, y = Math.sin(an) * r;
      if (i === 0) patchShape.moveTo(x, y); else patchShape.lineTo(x, y);
    }
    patchShape.closePath();
    s.mesh(new THREE.ExtrudeGeometry(patchShape, { depth: 0.06, bevelEnabled: false }).rotateX(-Math.PI / 2), asphalt).castShadow = false;
    const iron = s.material('#2c2b2a', { metalness: 0.6, roughness: 0.55 });
    const coverMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#3a3836'; c.fillRect(0, 0, 256, 256);
      c.strokeStyle = '#5b5855'; c.lineWidth = 6;
      for (let r = 30; r < 128; r += 28) { c.beginPath(); c.arc(128, 128, r, 0, Math.PI * 2); c.stroke(); }
      for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6; c.beginPath(); c.moveTo(128 + Math.cos(an) * 30, 128 + Math.sin(an) * 30); c.lineTo(128 + Math.cos(an) * 124, 128 + Math.sin(an) * 124); c.stroke(); }
      c.fillStyle = '#5b5855'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.fillText('CON ED', 128, 136);
    });
    s.mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.03, 32).translate(0, 0.075, 0), iron);
    const cover = s.mesh(new THREE.CircleGeometry(0.42, 32).rotateX(-Math.PI / 2).translate(0.55, 0.092, 0.25), s.material('#ffffff', { map: coverMap, metalness: 0.5, roughness: 0.6 }));
    cover.castShadow = false;
    // The stack stands over the manhole; its spare lid lies beside it.
    s.mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.035, 32).translate(0.55, 0.075, 0.25), iron);

    // ---- The stack: flared rubber collar, orange tube, white reflective bands, open rim.
    const orange = s.material(new THREE.Color('#ec6a10').lerp(new THREE.Color('#8a5a3a'), grime * 0.35), { roughness: 0.5 });
    const white = s.material('#f4f2ec', { roughness: 0.35, emissive: '#ffffff', emissiveIntensity: night * 0.35 });
    const rubber = s.material('#1c1c1e', { roughness: 0.9 });
    s.lathe([[0.2, 0.07], [0.58, 0.07], [0.56, 0.12], [0.42, 0.22], [0.33, 0.36], [0.31, 0.46], [0.2, 0.46]], rubber);
    s.mesh(new THREE.CylinderGeometry(R, R, TOP - 0.4, 28, 1, true).translate(0, 0.4 + (TOP - 0.4) / 2, 0), orange);
    s.mesh(new THREE.CylinderGeometry(R - 0.025, R - 0.025, TOP - 0.4, 28, 1, true).translate(0, 0.4 + (TOP - 0.4) / 2, 0), s.material('#2a2422', { side: THREE.BackSide })).castShadow = false;
    s.mesh(new THREE.TorusGeometry(R - 0.012, 0.018, 6, 28).rotateX(Math.PI / 2).translate(0, TOP, 0), orange);
    s.mesh(mergeGeometries([0.95, 1.65, 2.25].map((y) => new THREE.CylinderGeometry(R + 0.004, R + 0.004, 0.16, 28, 1, true).translate(0, y, 0))), white);
    // CON EDISON stencil on the front.
    const stencil = canvasTexture(512, 128, (c) => {
      c.clearRect(0, 0, 512, 128);
      c.fillStyle = '#141414'; c.font = 'bold 76px "Liberation Sans", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('CON EDISON', 256, 64, 500);
      c.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 9; i++) c.fillRect(30 + i * 52 + random() * 10, 0, 4, 128); // stencil bridges
    });
    const stencilMesh = s.mesh(new THREE.CylinderGeometry(R + 0.006, R + 0.006, 0.17, 28, 1, true, -0.95, 1.9).translate(0, 1.3, 0), new THREE.MeshStandardMaterial({ map: stencil, transparent: true, alphaTest: 0.4, roughness: 0.7 }));
    stencilMesh.castShadow = false;
    // Soot round the rim.
    if (grime > 0.25) s.mesh(new THREE.CylinderGeometry(R + 0.003, R + 0.003, 0.25 * grime + 0.05, 28, 1, true).translate(0, TOP - 0.12, 0), s.material('#3a3330', { transparent: true, opacity: 0.55 + grime * 0.3 })).castShadow = false;

    if (a.stickers) {
      const tag = canvasTexture(256, 512, (c) => {
        c.clearRect(0, 0, 256, 512);
        const cols = ['#f4d40c', '#1f5fd1', '#ffffff', '#2f9e44', '#d6198a', '#111214'];
        for (let i = 0; i < 9; i++) {
          c.fillStyle = cols[Math.floor(random() * cols.length)];
          const w = 40 + random() * 50, h = 30 + random() * 40;
          c.save(); c.translate(30 + random() * 190, 40 + random() * 430); c.rotate((random() - 0.5) * 0.8); c.fillRect(-w / 2, -h / 2, w, h);
          c.fillStyle = '#111'; c.fillRect(-w / 2 + 6, -4, w - 12, 8); c.restore();
        }
        c.strokeStyle = random() < 0.5 ? '#2a2ad0' : '#151515'; c.lineWidth = 9; c.lineCap = 'round';
        c.beginPath(); c.moveTo(30, 300);
        for (let i = 0; i < 7; i++) c.quadraticCurveTo(50 + i * 28, 240 + random() * 120, 70 + i * 28, 290 + (random() - 0.5) * 60);
        c.stroke();
      });
      s.mesh(new THREE.CylinderGeometry(R + 0.008, R + 0.008, 1.6, 28, 1, true, 0.35, 1.9).translate(0, 1.35, 0), new THREE.MeshStandardMaterial({ map: tag, transparent: true, alphaTest: 0.4, roughness: 0.6 })).castShadow = false;
    }

    // ---- What surrounds it.
    if (a.surround === 'cones') {
      const coneOrange = s.material('#f2650f', { roughness: 0.55 });
      const band = s.material('#f4f2ec', { emissive: '#ffffff', emissiveIntensity: night * 0.4 });
      const spots: [number, number][] = [[-1.05, 0.55], [1.0, -0.6], [-0.5, -1.0]];
      const count = 2 + (random() < 0.5 + mood.density * 0.4 ? 1 : 0);
      for (const [x, z] of spots.slice(0, count)) {
        const tilt = mood.wear > 0.7 && random() < 0.4;
        const cone = new THREE.Group();
        const m1 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 20).translate(0, 0.39, 0), coneOrange);
        const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.105, 0.1, 20).translate(0, 0.44, 0), band);
        const m3 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.4).translate(0, 0.02, 0), s.material('#222'));
        for (const m of [m1, m2, m3]) { m.castShadow = true; cone.add(m); }
        cone.position.set(x, 0.06, z);
        if (tilt) { cone.rotation.z = Math.PI / 2 * 0.95; cone.position.y = 0.2; }
        s.root.add(cone);
      }
      // Sawhorse barricade.
      const stripes = canvasTexture(512, 64, (c) => {
        c.fillStyle = '#f4f2ec'; c.fillRect(0, 0, 512, 64); c.fillStyle = '#ee6a12';
        for (let x = -64; x < 512; x += 64) { c.beginPath(); c.moveTo(x, 64); c.lineTo(x + 32, 0); c.lineTo(x + 64, 0); c.lineTo(x + 32, 64); c.fill(); }
      });
      const horse = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.04), s.material('#ffffff', { map: stripes, emissive: '#ffffff', emissiveMap: stripes, emissiveIntensity: night * 0.3 }));
      board.position.y = 0.95; horse.add(board);
      const legMat = s.material('#c9c4b4');
      for (const x of [-0.6, 0.6]) for (const z of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), legMat); leg.position.set(x, 0.48, z * 0.18); leg.rotation.x = z * 0.35; horse.add(leg); }
      horse.traverse((n) => { (n as THREE.Mesh).castShadow = true; });
      horse.position.set(0.2, 0.06, 1.05);
      horse.rotation.y = 0.15;
      if (a.barricade === 'knocked') { horse.rotation.set(Math.PI / 2 * 0.97, 0.5, 0.08); horse.position.set(0.3, 0.16, 1.0); board.scale.x = 0.9; board.rotation.z = 0.12; }
      s.root.add(horse);
    } else if (a.surround === 'litter') {
      const foil = s.material('#c9ccd1', { metalness: 0.6, roughness: 0.4 });
      const wrap = s.mesh(new THREE.IcosahedronGeometry(0.09, 0).scale(1.4, 0.6, 1), foil, [0.7, 0.12, 0.75]);
      wrap.rotation.set(random(), random(), random());
      s.mesh(new THREE.BoxGeometry(0.12, 0.012, 0.18), s.material('#e6dcc0'), [0.95, 0.075, 0.6]).rotation.y = 0.6;
      const pigeon = new THREE.Group();
      const grey = s.material('#7c7f86'), neck = s.material('#5f7a6e', { metalness: 0.3 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8).scale(1.5, 1, 1), grey); body.position.y = 0.13;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), neck); head.position.set(0.15, 0.13, 0);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 6).rotateZ(-Math.PI / 2), s.material('#c9a58e')); beak.position.set(0.2, 0.12, 0);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.08), s.material('#4a4c52')); tail.position.set(-0.17, 0.15, 0); tail.rotation.z = 0.3;
      for (const leg of [-0.03, 0.03]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 5), s.material('#c26a6a')); l.position.set(0, 0.04, leg); pigeon.add(l); }
      pigeon.add(body, head, beak, tail);
      pigeon.traverse((n) => { (n as THREE.Mesh).castShadow = true; });
      pigeon.position.set(0.48, 0.06, 0.85); pigeon.rotation.y = -0.9;
      s.root.add(pigeon);
      const peck = (time: number) => { head.position.y = 0.13 - Math.max(0, Math.sin(time * (2 + mood.energy * 6))) * 0.07; beak.position.y = head.position.y - 0.01; };
      updatesList.push(peck);
    } else if (a.surround === 'wreath') {
      const pine = s.material('#1f4a2b', { roughness: 0.9 });
      const wreath = s.mesh(new THREE.TorusGeometry(0.36, 0.08, 10, 28).rotateX(Math.PI / 2), pine, [0, 2.0, 0]);
      wreath.scale.y = 1.6;
      const berries: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 14; i++) { const an = random() * Math.PI * 2; berries.push({ at: [Math.cos(an) * 0.37, 2.0 + (random() - 0.5) * 0.1, Math.sin(an) * 0.37], size: 0.025 }); }
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#c8102e'), berries);
      const bow = s.material('#c8102e', { roughness: 0.5 });
      s.mesh(new THREE.SphereGeometry(0.07, 8, 6).scale(1.6, 1, 0.6), bow, [0, 2.08, 0.4]);
      s.rod([0, 2.04, 0.42], [-0.1, 1.75, 0.44], 0.02, bow);
      s.rod([0, 2.04, 0.42], [0.1, 1.78, 0.44], 0.02, bow);
    }

    // ---- Season.
    if (a.season === 'winter') {
      const slush = s.material('#cfd3d6', { roughness: 0.8 });
      for (let i = 0; i < 5; i++) s.ball([0.4 + random() * 0.4, 0.08 + random() * 0.06, 0.3 + random() * 0.3], [-1.2 + random() * 0.5, 0.06, -1 + random() * 2], slush, 10);
    } else if (a.season === 'rain') {
      const puddle = s.mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2).scale(1.1, 1, 0.7).translate(-0.3, 0.064, 0.55), s.material('#22262c', { roughness: 0.04, metalness: 0.6 }));
      puddle.castShadow = false;
    } else if (a.season === 'autumn') {
      const leaves: { at: [number, number, number]; size: number; color: string }[] = [];
      const cols = ['#b8643a', '#d4a537', '#8a3a1e', '#a4471e'];
      for (let i = 0; i < 16; i++) { const an = random() * Math.PI * 2, r = 0.6 + random() * 0.6; leaves.push({ at: [Math.cos(an) * r, 0.075, Math.sin(an) * r], size: 0.05 + random() * 0.03, color: cols[i % 4] }); }
      s.scatter(new THREE.CircleGeometry(1, 5).rotateX(-Math.PI / 2), s.material('#ffffff', { side: THREE.DoubleSide }), leaves);
    }

    // ---- Steam: soft puffs rising and leaning downwind, see-through so they are not measured.
    const amount = a.steam === 'none' ? 0 : a.steam === 'wisp' ? 1 : 2.4;
    const cold = a.season === 'winter' ? 1.4 : a.season === 'summer' ? 0.6 : 1;
    const puffs = Math.round((a.steam === 'none' ? 0 : a.steam === 'wisp' ? 14 : 36) * Math.min(1.3, cold));
    const steamMat = new THREE.MeshStandardMaterial({ color: '#f6f7f8', transparent: true, opacity: Math.min(0.55, (0.22 + amount * 0.08) * cold), depthWrite: false, roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.15 });
    const steam = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), steamMat, Math.max(1, puffs));
    steam.count = puffs;
    steam.castShadow = false;
    s.root.add(steam);
    const seeds = Array.from({ length: puffs }, () => ({ phase: random(), wob: random() * 6, side: (random() - 0.5) * 2 }));
    const lean = 0.5 + random() * 0.4, height = a.steam === 'plume' ? 4.2 : 2.2;
    const speed = mix(0.06, 0.32, mood.energy) * (a.steam === 'plume' ? 1.5 : 1);
    const matrix = new THREE.Matrix4();
    const placeSteam = (time: number) => {
      seeds.forEach((p, i) => {
        const t = (p.phase + time * speed) % 1;
        const y = TOP + t * height, rise = t * height;
        const size = (a.steam === 'plume' ? 0.28 : 0.16) + t * (a.steam === 'plume' ? 1.0 : 0.55);
        const x = lean * rise ** 1.25 * 0.45 + Math.sin(time * 1.3 + p.wob) * 0.08 * t + p.side * t * 0.25;
        const z = Math.cos(time + p.wob) * 0.1 * t;
        const shrink = t > 0.85 ? (1 - t) / 0.15 : 1;
        matrix.makeScale(size * shrink, size * 0.85 * shrink, size * shrink).setPosition(x, y, z);
        steam.setMatrixAt(i, matrix);
      });
      steam.instanceMatrix.needsUpdate = true;
    };
    placeSteam(0);
    // Ground fog from freezing steam, or a heat shimmer.
    if (a.season === 'winter' && amount > 0) {
      const fog: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 10; i++) fog.push({ at: [(random() - 0.3) * 3, 0.15, (random() - 0.5) * 2.4], size: 0.35 + random() * 0.4 });
      const f = s.scatter(new THREE.SphereGeometry(1, 10, 6).scale(1.6, 0.4, 1), new THREE.MeshStandardMaterial({ color: '#eef0f2', transparent: true, opacity: 0.45, depthWrite: false }), fog);
      f.castShadow = false;
    }
    let shimmer: THREE.Mesh | null = null;
    if (a.season === 'summer') {
      shimmer = s.mesh(new THREE.PlaneGeometry(3, 1.2, 12, 4).translate(0, 0.7, 0.9), new THREE.MeshBasicMaterial({ color: '#fff2d8', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
      shimmer.castShadow = shimmer.receiveShadow = false;
    }
    const shimmerPos = shimmer ? (shimmer.geometry.attributes.position as THREE.BufferAttribute) : null;
    const shimmerBase = shimmerPos ? Float32Array.from(shimmerPos.array as Float32Array) : null;

    s.root.traverse((n) => { const m = n as THREE.Mesh; if (m.isMesh && m !== steam && !(m.material as THREE.Material).transparent) m.castShadow = true; });
    return s.finish({
      footprint: 0.7,
      update: (_dt, time) => {
        if (puffs) placeSteam(time);
        for (const fn of updatesList) fn(time);
        if (shimmerPos && shimmerBase) { for (let i = 0; i < shimmerPos.count; i++) shimmerPos.setZ(i, shimmerBase[i * 3 + 2] + Math.sin(shimmerBase[i * 3] * 6 + time * 5) * 0.03); shimmerPos.needsUpdate = true; }
      },
    });
  },
});

