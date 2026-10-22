import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

const STONE = {
  carrara: 'Blinding white statuary marble.',
  bardiglio: 'Cool blue-grey marble with darker veins.',
  rosa: 'Pale rose marble, warm as skin.',
  travertine: 'Cream and honey travertine in banded layers.',
  verde: 'Pale green serpentine, the colour of old bronze.',
} as const;
const STONE_TINT: Record<keyof typeof STONE, [string, string]> = {
  carrara: ['#f6f5f0', '#8f979e'], bardiglio: ['#c9d0d6', '#59636e'], rosa: ['#f0d2c6', '#b0786a'], travertine: ['#ead9b2', '#b08f58'], verde: ['#c4d6c6', '#5f7f6a'],
};
const POND = {
  turquoise: 'Opaque turquoise, the colour marble dust gives to water.',
  emerald: 'Deep clear emerald.',
  milk: 'Milk-white slurry, fresh from the saws.',
  rust: 'Rust-orange and stagnant.',
  dry: 'Dry: a cracked pan of pale mud.',
} as const;
const POND_TINT: Record<keyof typeof POND, string> = { turquoise: '#12aeb0', emerald: '#1f8f6c', milk: '#b4e2e4', rust: '#c0703c', dry: '#d9cfb8' };

export default defineWorld({
  questions: {
    stone: choice('What stone is the mountain made of?', STONE),
    activity: choice('What is happening in the quarry?', {
      working: 'A working day: an excavator on a bench, a truck crawling up the haul road, fresh blocks stacked for collection.',
      resting: 'Sunday: machines parked in a row under tarpaulins, nobody about.',
      abandoned: 'Abandoned for decades: shrubs on the benches, rust streaks down the faces, a gate across the road.',
      ancient: 'An ancient quarry: hand-cut steps, fig trees in the cracks, a column still half in the wall.',
    }),
    depth: score('How deep has the mountain been cut?', ['Three broad benches', 'Four benches', 'Five benches, a white amphitheatre']),
    pond: choice('What is the sump pond at the bottom like?', POND),
    skyline: choice('What stands above the top bench?', {
      peaks: 'Bare jagged peaks, white scars running down them.',
      pines: 'A dark ridge of pines.',
      derricks: 'A row of old derricks and a power line against the sky.',
      nothing: 'Nothing: the top bench is the horizon.',
    }),
    light: choice('What is the light like?', {
      glare: 'Hard white noon glare, almost no colour in the sky.',
      alpine: 'Clear alpine blue, crisp and cold.',
      dust: 'Cream dust haze hanging in the pit.',
      storm: 'A slate-grey storm sky that makes the stone glow.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const [stoneHex, veinHex] = STONE_TINT[a.stone];
    const sky = { glare: '#eef0ee', alpine: '#cfe1ec', dust: '#ece4d2', storm: '#a9b3ba' }[a.light];
    const N = 3 + Math.round(a.depth * 2);
    const h = 1.5;
    const old = a.activity === 'abandoned' || a.activity === 'ancient';
    const grime = Math.min(1, mood.wear * 0.7 + (old ? 0.4 : 0));
    const floorTint = new THREE.Color(stoneHex).lerp(new THREE.Color('#cfc8b8'), 0.25 + grime * 0.2);

    const { art: s, world } = diorama(context, {
      background: sky,
      floor: `#${floorTint.getHexString()}`,
      width: 15,
      depth: 9.5,
      maxHeight: 4.2,
      radius: 2.2,
      pitch: 30,
      yaw: 28,
      slots: [[0.4, 1.0, 0, 1.15], [-4.3, -1.7], [5.0, -2.3, 0, 0.9], [-1.6, -5.95, h, 0.6], [3.4, -5.95, h, 0.6], [-4.4, 3.1, 0, 0.75]],
    });

    // ---- Sawn-face texture ------------------------------------------------------------------
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 26; i++) {
      // Veins.
      let x = random() * 512, y = 0;
      ctx.strokeStyle = veinHex;
      ctx.globalAlpha = 0.1 + random() * 0.22;
      ctx.lineWidth = 1 + random() * 4;
      ctx.beginPath(); ctx.moveTo(x, y);
      while (y < 256) { x += (random() - 0.3) * 50; y += 12 + random() * 30; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      // Vertical saw kerfs between blocks, and the drill-hole line beside each.
      const x = (i + random() * 0.6) * 74;
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#6f7478'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
      ctx.globalAlpha = 0.2; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x + 8, 0); ctx.lineTo(x + 8, 256); ctx.stroke();
    }
    for (const y of [70, 150]) { ctx.globalAlpha = 0.28; ctx.strokeStyle = '#6f7478'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, y + random() * 20); ctx.lineTo(512, y + random() * 20); ctx.stroke(); }
    for (let i = 0; i < 6 + grime * 22; i++) {
      // Rust and rain streaks from the bench lip.
      const x = random() * 512, w = 6 + random() * 26;
      const gradient = ctx.createLinearGradient(0, 0, 0, 120 + random() * 136);
      gradient.addColorStop(0, random() < 0.55 ? '#b0703a' : '#5d6266');
      gradient.addColorStop(1, 'rgba(120,110,100,0)');
      ctx.globalAlpha = 0.2 + grime * 0.3; ctx.fillStyle = gradient; ctx.fillRect(x, 0, w, 256);
    }
    ctx.globalAlpha = 1;
    const faceTexture = new THREE.CanvasTexture(canvas);
    faceTexture.wrapS = faceTexture.wrapT = THREE.RepeatWrapping;
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    const stone = new THREE.MeshStandardMaterial({ color: stoneHex, map: faceTexture, roughness: 0.82 });
    const stonePlain = new THREE.MeshStandardMaterial({ color: stoneHex, roughness: 0.9, flatShading: true });
    const stoneShade = new THREE.MeshStandardMaterial({ color: new THREE.Color(stoneHex).multiplyScalar(0.9), roughness: 0.95, flatShading: true });
    const road = new THREE.MeshStandardMaterial({ color: new THREE.Color(stoneHex).lerp(new THREE.Color('#a89c84'), 0.6), roughness: 1 });

    const bench = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
      const w = x1 - x0, hh = y1 - y0, d = z1 - z0;
      const geometry = new THREE.BoxGeometry(w, hh, d);
      const uv = geometry.attributes.uv;
      const offset = random();
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d) / 6 + offset, uv.getY(i) * Math.max(1, hh / 1.5));
      return s.mesh(geometry, stone, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
    };

    // ---- Benches: an L-shaped amphitheatre, back wall and left wall ------------------------------
    const zf: number[] = [0, -4.75, -7.15];
    const xl: number[] = [0, -7.5];
    for (let k = 3; k <= N + 1; k++) zf[k] = zf[k - 1] - 1.3;
    for (let k = 2; k <= N + 1; k++) xl[k] = xl[k - 1] - 1.5;
    const zEnd = zf[N] - 1.7, xEnd = xl[N] - 1.5;
    const topY = N * h;
    for (let k = 1; k <= N; k++) {
      bench(xEnd, 7.5, (k - 1) * h, k * h, zEnd, zf[k]);
      bench(xEnd, xl[k], (k - 1) * h, k * h, zf[k], 4.75);
      // Half-height steps where a bench is part-way through being taken down.
      if (k < N) {
        const steps = 1 + Math.floor(random() * 2);
        for (let i = 0; i < steps; i++) {
          const w = 1.6 + random() * 2.6;
          const x0 = mix(-6.5, 7.3 - w, random());
          if (k === 1 && ((x0 < -0.4 && x0 + w > -2.8) || (x0 < 4.6 && x0 + w > 2.2))) continue; // keep the terrace slots clear
          bench(x0, x0 + w, k * h, k * h + h * mix(0.35, 0.6, random()), zf[k + 1], zf[k + 1] + (k === 1 ? 0.7 : 0.55));
        }
        if (random() < 0.7) {
          const d = 1.4 + random() * 2.2, z0 = mix(-3.6, 4.4 - d, random());
          bench(xl[k + 1], xl[k + 1] + 0.5, k * h, k * h + h * 0.5, z0, z0 + d);
        }
      }
    }
    // The raw mountain behind the top bench.
    const lumps: { at: P3; size: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const alongBack = i < 10;
      lumps.push({ at: alongBack ? [mix(xEnd + 0.5, 7.2, i / 9), topY - 0.1, zEnd + 0.5 + random() * 0.5] : [xEnd + 0.5 + random() * 0.4, topY - 0.1, mix(zEnd + 1, 4.2, (i - 10) / 5)], size: 0.5 + random() * 0.5 });
    }
    s.scatter(new THREE.DodecahedronGeometry(1, 0), stoneShade, lumps);

    // ---- Zigzag haul road up the left wall -------------------------------------------------------
    const ramps = Math.min(N, 3);
    const rampLen = 7.6, rampZ = -3.5, rampW = 1.2;
    const berm: { at: P3; size: number }[] = [];
    for (let k = 1; k <= ramps; k++) {
      const shape = new THREE.Shape();
      const up = k % 2 === 0; // even ramps rise toward the viewer
      shape.moveTo(0, 0); shape.lineTo(rampLen, 0);
      if (up) shape.lineTo(rampLen, h); else shape.lineTo(0, h);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: rampW, bevelEnabled: false });
      geometry.rotateY(-Math.PI / 2);
      s.mesh(geometry, road, [xl[k] + rampW, (k - 1) * h, rampZ]);
      for (let i = 0; i < 12; i++) {
        const t = (i + 0.5) / 12;
        berm.push({ at: [xl[k] + rampW - 0.08, (k - 1) * h + (up ? t : 1 - t) * h + 0.1, rampZ + t * rampLen], size: 0.12 + random() * 0.05 });
      }
      // Landing at the turn.
      const landingZ = up ? rampZ + rampLen : rampZ - 0.9;
      s.box([rampW + 0.3, 0.06, 0.9], [xl[k] + rampW / 2 - 0.15, k * h + 0.03, landingZ + 0.45], road);
    }
    s.scatter(new THREE.BoxGeometry(1.6, 1.4, 2.6), stonePlain, berm);
    // Tyre tracks across the floor to the foot of the road.
    for (const dx of [0, 0.5]) s.box([0.12, 0.012, 7.5], [-6.6 + dx, 0.008, 4.6 - 3.75], new THREE.MeshStandardMaterial({ color: new THREE.Color(stoneHex).multiplyScalar(0.72), roughness: 1 }));

    // ---- Sump pond ----------------------------------------------------------------------------
    const pondShape = new THREE.Shape();
    const outline: [number, number][] = [[3.0, -1.3], [5.4, -1.3], [5.4, -0.5], [7.4, -0.5], [7.4, -4.68], [4.2, -4.68], [4.2, -3.6], [3.0, -3.6]];
    outline.forEach(([x, y], i) => (i ? pondShape.lineTo(x, y) : pondShape.moveTo(x, y)));
    pondShape.closePath();
    const pondGeo = new THREE.ShapeGeometry(pondShape);
    pondGeo.rotateX(-Math.PI / 2);
    const dry = a.pond === 'dry';
    const water = new THREE.MeshStandardMaterial({ color: POND_TINT[a.pond], roughness: dry ? 1 : 0.12, metalness: dry ? 0 : 0.1, emissive: POND_TINT[a.pond], emissiveIntensity: dry ? 0 : 0.1 });
    const pond = s.mesh(pondGeo, water, [0, 0.03, 0]);
    pond.castShadow = false;
    // The sump is the lowest cut: sawn kerbs step down to it on the uphill sides.
    s.box([2.6, 0.24, 0.28], [4.2, 0.12, 1.16], stone);
    s.box([0.28, 0.24, 2.3], [2.86, 0.12, 2.45], stone);
    s.box([2.0, 0.24, 0.28], [6.4, 0.12, 0.36], stone);
    s.box([0.28, 0.24, 0.8], [5.4, 0.12, 0.76], stone);
    s.box([1.3, 0.16, 0.28], [3.6, 0.08, 3.74], stone);
    const shore = new THREE.MeshStandardMaterial({ color: new THREE.Color(POND_TINT[a.pond]).multiplyScalar(0.6), roughness: 1 });
    s.box([2.4, 0.02, 0.1], [4.2, 0.035, 1.36], shore).castShadow = false;
    s.box([0.1, 0.02, 2.3], [3.06, 0.035, 2.45], shore).castShadow = false;
    s.box([2.0, 0.02, 0.1], [6.4, 0.035, 0.56], shore).castShadow = false;
    if (dry) {
      for (let i = 0; i < 16; i++) {
        const crack = s.box([0.03, 0.012, 0.5 + random() * 1.0], [4.4 + random() * 2.8, 0.045, 1.6 + random() * 2.8], new THREE.MeshStandardMaterial({ color: '#8f8571', roughness: 1 }));
        crack.rotation.y = random() * Math.PI;
        crack.castShadow = false;
      }
    } else {
      // Pump raft, suction hose and a white tide line.
      const pumpMat = s.material(old ? '#8a5a3a' : '#2f6fb0');
      s.box([0.6, 0.1, 0.44], [6.2, 0.08, 2.8], s.material('#3a3d40'));
      s.box([0.32, 0.24, 0.26], [6.2, 0.24, 2.8], pumpMat);
      s.tube([[6.2, 0.2, 2.7], [6.4, 0.12, 1.6], [6.6, 0.34, 0.4], [6.8, 0.08, -0.4], [6.9, 0.06, -1.2]], 0.05, s.material('#26282a'));
    }

    // ---- Skyline -----------------------------------------------------------------------------
    if (a.skyline === 'peaks') {
      for (let i = 0; i < 5; i++) {
        const peakH = mix(2.2, 4.4, random());
        const r = mix(2.0, 3.2, random());
        const peak = s.mesh(new THREE.ConeGeometry(r, peakH, 5 + Math.floor(random() * 3)), stoneShade, [mix(xEnd + 2, 5.6, i / 4) + (random() - 0.5), topY + peakH / 2 - 0.05, zEnd + 1.1 - (i % 2) * 0.4]);
        peak.rotation.y = random() * 3;
        peak.scale.z = 0.5;
        // A white scree scar down each one.
        const scar = s.box([0.3 + random() * 0.3, peakH * 0.75, 0.05], [peak.position.x + (random() - 0.5) * 0.6, topY + peakH * 0.36, peak.position.z + r * 0.3], new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }));
        scar.rotation.x = -Math.atan2(r * 0.5, peakH) * 0.9;
        scar.castShadow = false;
      }
    } else if (a.skyline === 'pines') {
      const trees: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 46; i++) {
        const back = i < 30;
        trees.push({ at: back ? [mix(xEnd + 0.4, 7.2, random()), topY, zEnd + 0.3 + random() * 1.0] : [xEnd + 0.3 + random() * 0.9, topY, mix(zEnd + 1, 4.4, random())], size: 0.7 + random() * 0.8, color: ['#2f5a3a', '#3c6a44', '#284c34', '#466f3a'][Math.floor(random() * 4)] });
      }
      const pine = new THREE.ConeGeometry(0.36, 1.5, 6);
      pine.translate(0, 0.85, 0);
      s.scatter(pine, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), trees);
    } else if (a.skyline === 'derricks') {
      const iron = s.material(old ? '#7a5238' : '#4a5258', { roughness: 0.8 });
      for (let i = 0; i < 3; i++) {
        const x = mix(xEnd + 3, 5.5, i / 2) + (random() - 0.5), z = zEnd + 0.9, mh = mix(2.4, 3.2, random());
        s.rod([x, topY, z], [x, topY + mh, z], 0.06, iron);
        const reach = mix(1.4, 2.2, random()), lift = mix(0.9, 2.2, random());
        s.rod([x, topY + 0.2, z], [x + reach, topY + lift, z + 0.3], 0.045, iron);
        s.rod([x, topY + mh, z], [x + reach, topY + lift, z + 0.3], 0.015, iron);
        s.rod([x + reach, topY + lift, z + 0.3], [x + reach, topY + lift - 0.7, z + 0.3], 0.012, iron);
        for (const side of [-1, 1]) s.rod([x, topY + mh, z], [x + side * 1.3, topY, z - 0.4], 0.012, iron);
        s.box([0.3, 0.22, 0.24], [x + reach, topY + lift - 0.82, z + 0.3], stonePlain);
      }
      for (let i = 0; i < 4; i++) {
        const z = mix(zEnd + 2, 3.8, i / 3), x = xEnd + 0.7;
        s.rod([x, topY, z], [x, topY + 1.7, z], 0.035, iron);
        s.box([0.5, 0.04, 0.04], [x, topY + 1.6, z], iron);
        if (i) s.tube([[x, topY + 1.6, z], [x, topY + 1.35, z - (3.8 - zEnd - 2) / 6], [x, topY + 1.6, z - (3.8 - zEnd - 2) / 3]], 0.012, iron);
      }
    }

    // ---- Blocks, spoil and life ------------------------------------------------------------------
    const blocks: { at: P3; size: number; color: string }[] = [];
    const tints = [stoneHex, `#${new THREE.Color(stoneHex).multiplyScalar(0.94).getHexString()}`, `#${new THREE.Color(stoneHex).lerp(new THREE.Color(veinHex), 0.12).getHexString()}`];
    const stack = (x: number, y: number, z: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const tier = i < Math.ceil(n * 0.6) ? 0 : 1;
        const along = tier ? i - Math.ceil(n * 0.6) + 0.5 : i;
        blocks.push({ at: [x + along * 0.72 + (random() - 0.5) * 0.08, y + 0.21 + tier * 0.42, z + (random() - 0.5) * 0.1], size: 1, color: tints[Math.floor(random() * 3)] });
      }
    };
    const busy = a.activity === 'working' || a.activity === 'resting';
    const stacks = Math.round(mix(1, 5, mood.density)) + (busy ? 1 : 0);
    const spots: [number, number, number][] = [[-6.6, h, -6.0], [5.3, h, -6.2], [0.4, h, -6.5], [-7.0, 0, -4.2], [1.4, 0, -4.15], [-2.4, 2 * h, zf[3] - 0.6], [3.0, 2 * h, zf[3] - 0.6]];
    for (let i = 0; i < Math.min(stacks, spots.length); i++) stack(spots[i][0], spots[i][1], spots[i][2], 2 + Math.floor(random() * 3));
    if (blocks.length) s.scatter(new THREE.BoxGeometry(0.66, 0.42, 0.5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), blocks);
    // A ravaneto: waste stone tipped down the benches at the open end.
    const scree: { at: P3; size: number }[] = [];
    for (let i = 0; i < 150; i++) {
      const t = random();
      const y = t * topY;
      const z = mix(zf[1] + 0.9, zEnd + 0.6, t) + (random() - 0.5) * 0.5;
      scree.push({ at: [7.5 - random() * (1.6 - t * 0.9) + 0.3, y + random() * 0.25, z + random() * 0.6], size: 0.09 + random() * 0.17 });
    }
    s.scatter(new THREE.DodecahedronGeometry(1, 0), stonePlain, scree);

    const steelGrey = s.material('#4a4f54', { roughness: 0.7 });
    const excavator = (x: number, y: number, z: number, turn: number, tarp: boolean) => {
      const g = new THREE.Group();
      const yellow = s.material(tarp ? '#5f7a8a' : '#e8b61a');
      const add = (mesh: THREE.Mesh) => { g.add(mesh); return mesh; };
      add(s.box([0.9, 0.18, 0.62], [0, 0.09, 0], steelGrey));
      add(s.box([0.72, 0.34, 0.56], [-0.04, 0.36, 0], yellow));
      if (!tarp) {
        add(s.box([0.3, 0.3, 0.26], [0.16, 0.66, 0.13], s.material('#2c3a44', { roughness: 0.3 })));
        add(s.rod([0.2, 0.5, -0.14], [0.8, 1.15, -0.14], 0.06, yellow));
        add(s.rod([0.8, 1.15, -0.14], [1.3, 0.55, -0.14], 0.05, yellow));
        add(s.box([0.22, 0.24, 0.26], [1.32, 0.42, -0.14], steelGrey));
      } else add(s.box([0.95, 0.24, 0.7], [0, 0.62, 0], yellow)).rotation.z = 0.08;
      g.position.set(x, y, z);
      g.rotation.y = turn;
      s.root.add(g);
    };
    const truck = (x: number, y: number, z: number, turn: number, tilt: number, tarp: boolean) => {
      const g = new THREE.Group();
      const paint = s.material(tarp ? '#5f7a8a' : mood.cheer > 0.5 ? '#e8b61a' : '#e9e7de');
      const add = (mesh: THREE.Mesh) => { g.add(mesh); return mesh; };
      add(s.box([1.0, 0.16, 0.5], [0, 0.26, 0], steelGrey));
      add(s.box([0.28, 0.3, 0.46], [0.38, 0.5, 0], paint));
      add(s.box([0.66, 0.3, 0.56], [-0.16, 0.5, 0], paint));
      if (!tarp) add(s.box([0.5, 0.26, 0.4], [-0.16, 0.74, 0], stonePlain));
      for (const wx of [-0.3, 0.34]) for (const wz of [-0.27, 0.27]) add(s.cylinder(0.17, 0.17, 0.12, [wx, 0.17, wz], s.material('#222426'), 12)).rotation.x = Math.PI / 2;
      g.position.set(x, y, z);
      g.rotation.set(0, turn, 0);
      g.rotation.order = 'YXZ';
      g.rotation.z = tilt;
      s.root.add(g);
    };
    if (a.activity === 'working') {
      excavator(mix(-4, 1, random()), 2 * h, zf[3] + 0.62, 0.3 + random() * 0.5, false);
      const t = mix(0.25, 0.75, random());
      truck(xl[1] + rampW / 2, (1 - t) * h + 0.02, rampZ + t * rampLen, Math.PI / 2, -Math.atan2(h, rampLen), false);
      if (N > 3) excavator(xl[3] - 0.7, 3 * h, mix(-2, 3, random()), -1.2, false);
      // Dust behind the truck and over the working bench.
      const puff = new THREE.MeshStandardMaterial({ color: '#f1ede2', transparent: true, opacity: 0.3, roughness: 1, depthWrite: false });
      for (let i = 0; i < 3 + mood.energy * 7; i++) s.ball([0.4 + random() * 0.5, 0.3 + random() * 0.3, 0.4 + random() * 0.5], [xl[1] + 0.6 + (random() - 0.5) * 0.6, (1 - t) * h * 0.6 + 0.4 + random() * 0.5, rampZ + t * rampLen + 0.8 + random() * 2], puff, 8).castShadow = false;
      // Red cut lines painted on the next blocks to come out.
      for (let i = 0; i < 3; i++) s.box([0.04, h * 0.9, 0.02], [mix(-5, 6.5, random()), h * 0.5, zf[1] + 0.012], new THREE.MeshStandardMaterial({ color: '#d42a1e', roughness: 0.9 }));
    } else if (a.activity === 'resting') {
      excavator(-6.3, 0, -3.6, 0.2, true);
      truck(-4.9, 0, -3.9, 0.1, 0, true);
      truck(6.3, h, -5.6, -1.4, 0, false);
    }
    if (old) {
      const greens: { at: P3; size: number; color: string }[] = [];
      const n = Math.round(mix(40, 90, mood.density));
      for (let i = 0; i < n; i++) {
        const k = 1 + Math.floor(random() * N);
        const onBack = random() < 0.6;
        const at: P3 = onBack ? [mix(-7, 7.2, random()), k * h, (k < N ? zf[k + 1] : zEnd + 1.2) + 0.12 + random() * 0.2] : [(k < N ? xl[k + 1] : xEnd + 1.0) + 0.12 + random() * 0.2, k * h, mix(-4.4, 4.4, random())];
        if (k === 1 && onBack && ((Math.abs(at[0] + 1.6) < 1.3) || Math.abs(at[0] - 3.4) < 1.3)) continue;
        greens.push({ at, size: 0.16 + random() * 0.26, color: ['#5f7f3a', '#789044', '#4a6a30', '#9a9a48'][Math.floor(random() * 4)] });
      }
      for (let i = 0; i < 20; i++) greens.push({ at: [mix(-7.2, 7.2, random()), 0, -4.55 + random() * 0.2], size: 0.14 + random() * 0.2, color: '#789044' });
      const bush = new THREE.DodecahedronGeometry(1, 0);
      bush.translate(0, 0.6, 0);
      s.scatter(bush, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), greens);
    }
    if (a.activity === 'abandoned') {
      // A pole gate across the foot of the haul road and a faded sign.
      const rust = s.material('#8a4f32', { roughness: 0.9 });
      s.rod([-7.4, 0, 4.4], [-7.4, 0.7, 4.4], 0.05, rust);
      s.rod([-5.9, 0, 4.4], [-5.9, 0.7, 4.4], 0.05, rust);
      s.rod([-7.5, 0.6, 4.4], [-5.7, 0.68, 4.4], 0.04, rust);
      s.label('CAVA CHIUSA', 0.9, 0.3, [-6.65, 0.42, 4.44], '#8a2a22', '#e6dfc8');
    }
    if (a.activity === 'ancient') {
      // A column shaft still attached in the back wall, and fig trees.
      const shaft = s.cylinder(0.42, 0.46, 4.6, [mix(-5.4, -3.6, random()), h * 0.42, zf[1] + 0.2], stonePlain, 14);
      shaft.rotation.z = Math.PI / 2;
      s.box([4.9, 0.1, 0.5], [shaft.position.x, 0.05, zf[1] + 0.3], stoneShade);
      const bark = s.material('#8a8273'), leaf = new THREE.MeshStandardMaterial({ color: '#4f7d3a', roughness: 1, flatShading: true });
      for (const [x, y, z] of [[6.6, h, -5.2], [-7.0, 0, -4.2 + 8.3], [xl[2] + 0.6, h, 2.2]] as const) {
        s.tube([[x, y, z], [x + 0.15, y + 0.6, z + 0.1], [x - 0.1, y + 1.2, z + 0.2]], 0.07, bark);
        for (let i = 0; i < 5; i++) s.mesh(new THREE.DodecahedronGeometry(0.34 + random() * 0.22, 0), leaf, [x + (random() - 0.5) * 0.9, y + 1.1 + random() * 0.6, z + 0.15 + (random() - 0.5) * 0.7]);
      }
    }
    // Chips swept against the foot of the back wall.
    const chips: { at: P3; size: number }[] = [];
    for (let i = 0; i < 30 + mood.density * 50; i++) chips.push({ at: [mix(-7.3, 7.3, random()), 0.04, -4.7 + random() * 0.45], size: 0.05 + random() * 0.1 });
    s.scatter(new THREE.DodecahedronGeometry(1, 0), stonePlain, chips);

    const dispose = world.dispose.bind(world);
    world.dispose = () => { faceTexture.dispose(); dispose(); };
    if (!dry) world.update = (_dt, time) => { water.emissiveIntensity = 0.1 + Math.sin(time * mix(0.4, 1.6, mood.energy)) * 0.06; };
    return world;
  },
});
