import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix, paint, paintHex } from '@conjure/kit';

type P3 = [number, number, number];

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

/** Deck plan: long parallel sides and fine double ends, in x (length) and y (beam). */
const plan = (halfLen: number, halfBeam: number, endLen: number) => {
  const pts: THREE.Vector2[] = [];
  const n = 16;
  const side = (x: number) => {
    const t = Math.max(0, (Math.abs(x) - (halfLen - endLen)) / endLen);
    return halfBeam * Math.pow(Math.max(0, 1 - Math.pow(t, 1.7)), 0.6);
  };
  for (let i = 0; i <= n * 2; i++) { const x = -halfLen + (i / (n * 2)) * halfLen * 2; pts.push(new THREE.Vector2(x, -side(x))); }
  for (let i = n * 2; i >= 0; i--) { const x = -halfLen + (i / (n * 2)) * halfLen * 2; pts.push(new THREE.Vector2(x, side(x))); }
  return { pts, side };
};
const slab = (halfLen: number, halfBeam: number, endLen: number, height: number) => {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(plan(halfLen, halfBeam, endLen).pts), { depth: height, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  return g;
};
/** Walls only: an open band around the plan, for window strips that take a repeating texture. */
const band = (halfLen: number, halfBeam: number, endLen: number, height: number) => {
  const { pts } = plan(halfLen, halfBeam, endLen);
  const positions: number[] = [], uvs: number[] = [];
  let run = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const len = a.distanceTo(b);
    // Plan y becomes world -z after the slab's rotation; keep the same here.
    const A0 = [a.x, 0, -a.y], A1 = [a.x, height, -a.y], B0 = [b.x, 0, -b.y], B1 = [b.x, height, -b.y];
    positions.push(...A0, ...B0, ...A1, ...A1, ...B0, ...B1);
    uvs.push(run, 0, run + len, 0, run, 1, run, 1, run + len, 0, run + len, 1);
    run += len;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
};

const NAMES = { freshwater: 'FRESHWATER', queenscliff: 'QUEENSCLIFF', narrabeen: 'NARRABEEN', collaroy: 'COLLAROY' } as const;

export default defineThing({
  questions: {
    hull: paint('What colour is the hull?', ['forest', 'green', 'white', 'blue', 'navy', 'teal']),
    upper: paint('What colour are the upper decks?', ['cream', 'white', 'yellow', 'sky']),
    name: choice('Which ferry is it, by the name on its bow boards?', {
      freshwater: 'FRESHWATER, the first of the class, 1982.',
      queenscliff: 'QUEENSCLIFF, named for the north end of Manly beach.',
      narrabeen: 'NARRABEEN, after the lagoon and the surf.',
      collaroy: 'COLLAROY, the last one built, a little different.',
    }),
    doing: choice('What is the ferry doing?', {
      crossing: 'Crossing the Heads in a big swell, pitching, a white bow wave and spray flying.',
      cruising: 'Gliding across a calm harbour with a clean wake behind.',
      docked: 'Docked at a timber wharf, ropes on the piles, the gangway down.',
      laid: 'Laid up out of service, rust weeping down the hull, listing slightly, nobody aboard.',
    }),
    aboard: choice('Who is aboard?', {
      crowded: 'A crowded summer sailing: commuters and surfers with boards packing the open decks.',
      few: 'Nearly empty: a few people dotted along the rails.',
      lone: 'A single passenger standing at the stern rail, looking back at the city.',
    }),
    weather: choice('What is the weather doing on it?', {
      sun: 'Bright sunshine on the cream paint and glittering water.',
      spray: 'Blowing spray drenching the forward deck.',
      rain: 'Rain: wet decks, streaming windows and falling rain.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const glowAmt = Math.min(1, Math.max(0, (lowSun - 0.25) / 0.75));
    const laid = a.doing === 'laid';
    const rust = laid ? Math.max(0.6, mood.wear) : mood.wear * 0.6;
    const HL = 35, HB = 6.3;
    const hullHex = paintHex(a.hull), upperHex = paintHex(a.upper);
    const boat = new THREE.Group();

    // Hull: a dark boot top, the painted topsides with rust streaks, a rubbing strake.
    const hullMap = canvasTexture(256, 64, (c) => {
      c.fillStyle = hullHex; c.fillRect(0, 0, 256, 64);
      const streaks = Math.round(rust * 30);
      for (let k = 0; k < streaks; k++) {
        const x = random() * 256, w = 1 + random() * 3, h = 10 + random() * 44;
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(140,62,24,0.85)'); g.addColorStop(1, 'rgba(140,62,24,0)');
        c.fillStyle = g; c.fillRect(x, 0, w, h);
      }
    });
    hullMap.repeat.set(1 / 24, 1);
    const hull = s.material('#ffffff', { map: hullMap, roughness: 0.45, side: THREE.DoubleSide });
    const boot = s.material(new THREE.Color(hullHex).multiplyScalar(0.3), { roughness: 0.6 });
    const upper = s.material(upperHex, { roughness: 0.5, side: THREE.DoubleSide });
    const gold = s.material('#d4a537', { metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide });
    const deckWood = s.material('#a08262', { roughness: 0.8 });
    const dark = s.material('#24282b', { roughness: 0.5 });
    const add = (mesh: THREE.Object3D) => { s.root.remove(mesh); boat.add(mesh); return mesh; };

    add(s.mesh(slab(HL - 1, HB - 0.6, 12, 1.3), boot, [0, 0, 0]));
    const hullBand = band(HL, HB, 13, 3.1);
    add(s.mesh(hullBand, hull, [0, 1.2, 0]));
    add(s.mesh(slab(HL, HB, 13, 0.2), deckWood, [0, 4.1, 0]));
    add(s.mesh(band(HL + 0.12, HB + 0.12, 13.1, 0.35), gold, [0, 4.0, 0]));

    // Saloon windows: a repeating band, lit warm in low light.
    const windowMap = canvasTexture(128, 64, (c) => {
      c.fillStyle = upperHex; c.fillRect(0, 0, 128, 64);
      c.fillStyle = '#3c4a52';
      for (const x of [8, 72]) { c.beginPath(); c.roundRect(x, 14, 48, 32, 5); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.28)';
      for (const x of [12, 76]) c.fillRect(x, 17, 14, 10);
    });
    windowMap.repeat.set(1 / 3.2, 1);
    const litMap = canvasTexture(128, 64, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, 128, 64);
      for (const x of [8, 72]) { c.fillStyle = random() < 0.85 ? '#ffd9a0' : '#3a2e20'; c.beginPath(); c.roundRect(x, 14, 48, 32, 5); c.fill(); }
    });
    litMap.repeat.set(1 / 3.2, 1);
    const saloon = s.material('#ffffff', { map: windowMap, emissive: '#ffd9a0', emissiveMap: litMap, emissiveIntensity: laid ? 0 : mix(0, 1.4, glowAmt), roughness: 0.45, side: THREE.DoubleSide });
    // Main deck saloon, nearly full length; the upper saloon shorter, leaving open deck at each end.
    add(s.mesh(band(HL - 2.4, HB - 0.35, 11, 2.6), saloon, [0, 4.5, 0]));
    add(s.mesh(slab(HL - 1.8, HB, 11.5, 0.3), upper, [0, 7.1, 0]));
    add(s.mesh(band(HL - 1.72, HB + 0.06, 11.5, 0.16), gold, [0, 7.15, 0]));
    add(s.mesh(slab(HL - 2, HB - 0.2, 11.3, 0.05), deckWood, [0, 7.4, 0]));
    add(s.mesh(band(HL - 12, HB - 0.4, 5, 2.5), saloon, [0, 7.5, 0]));
    add(s.mesh(slab(HL - 11.6, HB - 0.1, 5.2, 0.35), upper, [0, 10, 0]));
    // Rails around the upper deck: a low solid bulwark and a gold capping.
    const bulwark = band(HL - 1.9, HB - 0.05, 11.5, 1.0);
    add(s.mesh(bulwark, upper, [0, 7.5, 0])).traverse((o) => { ((o as THREE.Mesh).material as THREE.Material).side = THREE.DoubleSide; });
    add(s.mesh(band(HL - 1.9, HB - 0.02, 11.5, 0.1), gold, [0, 8.5, 0]));
    // Benches on the open ends of the upper deck.
    const benches: THREE.BufferGeometry[] = [];
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) for (const z of [-2.2, 0, 2.2]) {
      const x = sx * (HL - 13.6 + k * 1.6);
      if (Math.abs(z) > plan(HL - 1.9, HB - 0.5, 11.5).side(x) - 1) continue;
      benches.push(new THREE.BoxGeometry(0.5, 0.45, 1.6).translate(x, 7.75, z));
    }
    if (benches.length) add(s.mesh(mergeGeometries(benches), deckWood));

    // Wheelhouses at both ends, on the roof, with their name boards.
    const nameMap = canvasTexture(512, 64, (c) => {
      c.fillStyle = upperHex; c.fillRect(0, 0, 512, 64);
      c.fillStyle = '#1d2a22'; c.font = 'bold 44px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(NAMES[a.name], 256, 34);
      c.fillStyle = '#d4a537'; c.fillRect(0, 0, 512, 5); c.fillRect(0, 59, 512, 5);
    }, false);
    const nameMat = new THREE.MeshStandardMaterial({ map: nameMap, roughness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({ color: '#33424a', transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.4, emissive: '#ffd9a0', emissiveIntensity: laid ? 0 : mix(0, 0.6, glowAmt) });
    for (const sx of [-1, 1]) {
      const x = sx * (HL - 16.5);
      add(s.box([4, 2.3, 7.4], [x, 11.5, 0], upper));
      add(s.box([0.2, 1.1, 7.0], [x + sx * 2.05, 11.8, 0], glass));
      for (const z of [-1, 1]) add(s.box([3.4, 1.0, 0.1], [x, 11.8, z * 3.72], glass));
      add(s.box([4.6, 0.3, 8.2], [x, 12.8, 0], upper));
      add(s.box([4.7, 0.12, 8.3], [x, 12.6, 0], gold));
      const board = add(s.mesh(new THREE.PlaneGeometry(6.2, 0.75), nameMat, [x + sx * 2.12, 10.4, 0]));
      board.rotation.y = sx * Math.PI / 2;
      // Name boards on the hull sides near each end.
      for (const z of [-1, 1]) {
        const xb = sx * (HL - 15);
        const side = add(s.mesh(new THREE.PlaneGeometry(8, 0.95), nameMat, [xb, 3.3, z * (HB + 0.03)]));
        side.rotation.y = z > 0 ? 0 : Math.PI;
      }
    }
    // The squat central funnel, a mast and the radar.
    const funnelMat = s.material(laid ? '#8a7a62' : upperHex, { roughness: 0.5 });
    add(s.lathe([[2.2, 0], [2.3, 2.4], [2.0, 3.2], [0, 3.2]], funnelMat, [0, 10.3, 0])).scale.set(1, 1, 0.7);
    add(s.lathe([[2.32, 0], [2.32, 0.6], [0, 0.6]], s.material(hullHex), [0, 12.4, 0])).scale.set(1, 1, 0.7);
    add(s.cylinder(1.2, 1.2, 0.4, [0, 13.5, 0], dark, 16)).scale.set(1, 1, 0.7);
    for (const sx of [-1, 1]) add(s.rod([sx * (HL - 16.5), 12.9, 0], [sx * (HL - 16.5), 15.4, 0], 0.08, dark));
    // Fenders along the hull.
    const fenders: THREE.BufferGeometry[] = [];
    for (let x = -HL + 12; x <= HL - 12; x += 4) for (const z of [-1, 1]) fenders.push(new THREE.BoxGeometry(0.4, 1.4, 0.3).translate(x, 3.2, z * (HB + 0.15)));
    add(s.mesh(mergeGeometries(fenders), dark));

    // ----- people -----
    const figures: { update(dt: number, time: number): void }[] = [];
    if (!laid) {
      const count = a.aboard === 'crowded' ? 150 : a.aboard === 'few' ? 14 : 0;
      if (count) {
        const pts: { at: P3; size: number; color: string }[] = [];
        const clothes = ['#f4f2ec', '#1b2a55', '#c8102e', '#7ec3ef', '#34363a', '#f0a215', '#2f9e44', '#f4a3c0'];
        const deck = plan(HL - 2.2, HB - 0.8, 11.5).side;
        for (let k = 0; k < count; k++) {
          const sx = random() < 0.5 ? -1 : 1;
          const x = sx * (HL - 12.5 + random() * 9);
          const w = deck(x);
          const z = (random() * 2 - 1) * Math.max(0.5, w);
          pts.push({ at: [x, 8.35, z], size: 1, color: clothes[Math.floor(random() * clothes.length)] });
        }
        // A few on the main deck ends too.
        for (let k = 0; k < count / 5; k++) { const sx = random() < 0.5 ? -1 : 1; const x = sx * (HL - 5 + random() * 2); pts.push({ at: [x, 5.2, (random() - 0.5) * 4], size: 1, color: clothes[k % clothes.length] }); }
        const mesh = s.scatter(new THREE.CapsuleGeometry(0.28, 1.1, 2, 6), s.material('#ffffff'), pts);
        add(mesh);
        if (a.aboard === 'crowded') {
          const boards = s.scatter(new THREE.BoxGeometry(0.5, 1.9, 0.08), s.material('#ffffff'), Array.from({ length: 10 }, (_u, k) => ({ at: [(k % 2 ? 1 : -1) * (HL - 11 - k), 8.6, (random() - 0.5) * 6] as P3, size: 1, color: ['#f4d40c', '#2ec4c4', '#f4f2ec', '#ee7a12'][k % 4] })));
          add(boards);
        }
      }
      if (a.aboard === 'lone' || a.aboard === 'few') {
        const p = figure(s, { height: 1.75, pose: 'leaning', style: 'doll', hair: 'long', top: '#c8102e', bottom: '#1b2a55', skin: '#d9b08c', gaze: 'ahead' });
        s.root.remove(p.root);
        boat.add(p.root);
        const lead = a.doing === 'docked' ? 1 : 1;
        p.root.position.set(-lead * (HL - 5), 7.5, 0);
        p.root.rotation.y = -Math.PI / 2;
        figures.push(p);
      }
    }

    // ----- what it is doing -----
    const soft = (opacity: number) => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    const foam = canvasTexture(128, 64, (c) => {
      c.fillStyle = 'rgba(255,255,255,0)'; c.fillRect(0, 0, 128, 64);
      for (let k = 0; k < 90; k++) { c.fillStyle = `rgba(255,255,255,${0.3 + random() * 0.6})`; c.beginPath(); c.ellipse(random() * 128, random() * 64, 3 + random() * 8, 1.5 + random() * 3, 0, 0, Math.PI * 2); c.fill(); }
    });
    const moving = a.doing === 'crossing' || a.doing === 'cruising';
    const spray: THREE.Object3D[] = [];
    if (moving) {
      const big = a.doing === 'crossing';
      const lead = 1;
      const wave = new THREE.MeshBasicMaterial({ map: foam, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
      // Bow wave curling off both sides of the leading end.
      for (const z of [-1, 1]) {
        const g = new THREE.PlaneGeometry(14, big ? 2.6 : 1.4, 8, 1);
        const pos = g.attributes.position as THREE.BufferAttribute;
        for (let v = 0; v < pos.count; v++) { const x = pos.getX(v); pos.setZ(v, z * (1 - (x + 7) / 14) * -2.5); }
        const mesh = new THREE.Mesh(g, wave);
        mesh.position.set(lead * (HL - 7), big ? 1.5 : 0.9, z * (HB - 1.6));
        mesh.rotation.y = z * 0.32 * lead;
        boat.add(mesh);
      }
      // The wake: a long trailing sheet of foam.
      const wake = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), new THREE.MeshBasicMaterial({ map: foam, transparent: true, opacity: 0.6, depthWrite: false }));
      (wake.material as THREE.MeshBasicMaterial).map!.repeat.set(4, 1);
      wake.rotation.x = -Math.PI / 2;
      wake.position.set(-lead * (HL + 26), 0.15, 0);
      s.root.add(wake);
      if (big || a.weather === 'spray') {
        for (let k = 0; k < 14; k++) {
          const puff = new THREE.Mesh(new THREE.PlaneGeometry(4 + random() * 4, 3 + random() * 3), soft(0.5));
          puff.position.set(lead * (HL - 4 - random() * 10), 3 + random() * 6, (random() - 0.5) * 16);
          puff.rotation.y = random() * Math.PI;
          boat.add(puff);
          spray.push(puff);
        }
      }
    }
    if (a.doing === 'docked') {
      const timber = s.material('#7a6248', { roughness: 0.9 });
      const piles: THREE.BufferGeometry[] = [];
      for (let x = -30; x <= 30; x += 5) for (const z of [HB + 1, HB + 9]) piles.push(new THREE.CylinderGeometry(0.4, 0.45, 7, 8).translate(x, 3.5, z));
      s.mesh(mergeGeometries(piles), timber);
      s.box([64, 0.6, 9], [0, 5, HB + 5], s.material('#8a7a64', { roughness: 0.9 }));
      s.box([6, 0.3, 2.4], [6, 5.5, HB + 0.6], s.material('#c9ccd1', { metalness: 0.5 }));
      for (const x of [-20, 20]) s.rod([x, 4.4, HB], [x * 1.1, 5.3, HB + 1.6], 0.12, s.material('#d9cba4'));
    }
    if (a.weather === 'rain') {
      const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 1.6, 0.04), soft(0.4), 500);
      const m = new THREE.Matrix4();
      for (let k = 0; k < 500; k++) { m.makeTranslation((random() - 0.5) * 80, 2 + random() * 16, (random() - 0.5) * 22); rain.setMatrixAt(k, m); }
      s.root.add(rain);
      spray.push(rain);
    }

    s.root.add(boat);
    // Settle the hull into the water a little, list it when laid up, pitch it in the swell.
    const pitch = a.doing === 'crossing' ? 0.05 : 0;
    boat.rotation.z = pitch;
    boat.rotation.x = laid ? 0.05 : 0;
    const all = new THREE.Group();
    for (const child of [...s.root.children]) all.add(child);
    s.root.add(all);
    all.rotation.y = 0.52;

    const energy = 0.2 + mood.energy;
    return s.finish({
      update: (dt, time) => {
        for (const f of figures) f.update(dt, time);
        if (a.doing === 'crossing') { boat.rotation.z = pitch * Math.sin(time * 0.9 * energy); boat.rotation.x = 0.02 * Math.sin(time * 0.7 * energy + 1); }
        else if (!laid) boat.position.y = Math.sin(time * 0.8) * 0.06;
        for (const [i, p] of spray.entries()) if (!(p instanceof THREE.InstancedMesh)) p.position.y = 3 + ((time * 2 * energy + i) % 6);
      },
    });
  },
});
