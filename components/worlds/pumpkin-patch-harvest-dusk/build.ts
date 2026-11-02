import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, Sculpture, type World, choice, defineWorld, disposeTree, mix, noul } from '@conjure/kit';
import { hayBale } from './props';
import { leafGeometry, pumpkin } from './pumpkin';

type V3 = [number, number, number];

/** x, z, tallest, widest, smallest height. Hero first, in the best light at the front of the patch. */
const SLOTS: readonly (readonly [number, number, number, number, number])[] = [
  [0.4, 3.6, 3.2, 2.4, 1.6], [-4.6, 1.6, 2.8, 2.2, 1.3], [4.8, 1.2, 2.8, 2.2, 1.3], [-2.2, -2.4, 2.6, 2.0, 1.2], [2.8, -3.2, 2.6, 2.4, 1.2], [-7.4, 4.6, 2.4, 1.8, 1.0],
];

const SKIES = {
  sunset: 'A low swollen orange sun sitting on the horizon, salmon and gold sky, long shadows.',
  moonrise: 'A huge pale harvest moon rising over the barn into a violet dusk.',
  afterglow: 'Blue hour just after sunset: periwinkle overhead, a burning orange band on the horizon, the first stars.',
  overcast: 'A low grey overcast with a slit of red light under it at the horizon, cold and brooding.',
} as const;
const TONES: Record<keyof typeof SKIES, [string, string, string, string]> = {
  sunset: ['#7a6f9e', '#c98a8a', '#f2a65a', '#ffd88a'],
  moonrise: ['#4e4f86', '#7d6f9e', '#c690a0', '#f0b98a'],
  afterglow: ['#4f5d98', '#7f88bf', '#e0a08a', '#ffb860'],
  overcast: ['#6d6b78', '#8a8790', '#a89490', '#e0705a'],
};

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A corn stalk with a few arching leaves and a tassel, base at the origin; plain geometry with no colour. */
function cornStalk(height: number, random: () => number) {
  const parts: THREE.BufferGeometry[] = [];
  const stalk = new THREE.CylinderGeometry(0.012, 0.022, height, 5, 1).translate(0, height / 2, 0);
  parts.push(stalk);
  for (let i = 0; i < 3; i++) {
    const y = height * (0.28 + i * 0.2);
    const ang = random() * Math.PI * 2 + i * 2.2;
    const out = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
    const side = new THREE.Vector3(-out.z, 0, out.x);
    const len = height * (0.3 + random() * 0.12);
    const positions: number[] = [], index: number[] = [];
    for (let k = 0; k <= 5; k++) {
      const f = k / 5;
      const p = out.clone().multiplyScalar(len * f * 0.8).add(new THREE.Vector3(0, y + len * (0.35 * f - 0.55 * f * f), 0));
      const w = 0.04 * Math.sin(Math.PI * (0.15 + f * 0.85));
      positions.push(p.x - side.x * w, p.y, p.z - side.z * w, p.x + side.x * w, p.y, p.z + side.z * w);
      if (k > 0) { const a = (k - 1) * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const leaf = new THREE.BufferGeometry();
    leaf.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    leaf.setIndex(index);
    leaf.computeVertexNormals();
    parts.push(leaf);
  }
  const tassel = new THREE.ConeGeometry(0.05, 0.3, 4).translate(0, height + 0.12, 0);
  parts.push(tassel);
  const clean = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const name of Object.keys(n.attributes)) if (name !== 'position' && name !== 'normal') n.deleteAttribute(name);
    return n;
  });
  const merged = mergeGeometries(clean)!;
  parts.forEach((g) => g.dispose());
  clean.forEach((g) => g.dispose());
  return merged;
}

export default defineWorld({
  questions: {
    sky: choice('What is the sky doing over the field?', SKIES),
    beyond: choice('What stands behind the corn?', {
      barn: 'A big red gambrel barn and a grey silo silhouetted behind the corn maze.',
      farmhouse: 'A white clapboard farmhouse with warm lit windows and a porch light.',
      woods: 'A ragged black line of bare woods along a ridge, nothing else for miles.',
      windmill: 'An old steel farm windmill and a water tower against the sky.',
    }),
    patch: choice('What state is the pumpkin patch in?', {
      lush: 'Lush: rows heavy with orange pumpkins under big green leaves.',
      picked: 'Picked over: a few stragglers left among browning vines and cut stems.',
      frosted: 'After the first frost: white rime on the furrows, leaves blackened, pumpkins bare.',
    }),
    edge: choice('What lines the edge of the field?', {
      fence: 'A weathered split-rail fence with corn shocks tied to its posts.',
      bales: 'A low wall of hay bales with pumpkins set along the top.',
      both: 'Both: the split-rail fence and a run of hay bales in front of it.',
    }),
    sign: choice('What does the hand-painted sign at the field edge say?', {
      pick: 'PICK YOUR OWN',
      maze: 'CORN MAZE with an arrow',
      price: 'PUMPKINS $5',
      none: 'There is no sign.',
    }),
    crows: noul('Are crows wheeling in the sky over the corn?'),
    path: noul('Is there a straw-strewn path cut through the patch toward the maze?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const s = new Sculpture(context);
    const root = s.root;
    const tones = TONES[a.sky].map((c) => new THREE.Color(c).lerp(new THREE.Color(mood.warmth > 0.5 ? '#ff9a50' : '#6a7ab0'), Math.abs(mood.warmth - 0.5) * 0.25));
    const frost = a.patch === 'frosted';

    // ----- sky backdrop -----
    const sky = canvasTexture(1024, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, `#${tones[0].getHexString()}`);
      g.addColorStop(0.45, `#${tones[1].getHexString()}`);
      g.addColorStop(0.78, `#${tones[2].getHexString()}`);
      g.addColorStop(1, `#${tones[3].getHexString()}`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      if (a.sky === 'afterglow' || a.sky === 'moonrise') for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,250,235,${0.3 + random() * 0.6})`; ctx.fillRect(random() * w, random() * h * 0.45, 2, 2); }
      if (a.sky === 'overcast') for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(${80 + random() * 30},${78 + random() * 30},${92 + random() * 30},0.5)`;
        ctx.beginPath(); ctx.ellipse(random() * w, h * (0.1 + random() * 0.65), w * (0.05 + random() * 0.12), h * (0.02 + random() * 0.05), 0, 0, 7); ctx.fill();
      } else for (let i = 0; i < 14; i++) {
        ctx.fillStyle = a.sky === 'sunset' ? `rgba(255,${150 + random() * 60},${110 + random() * 40},0.4)` : `rgba(${200 + random() * 40},${140 + random() * 40},${170 + random() * 30},0.32)`;
        ctx.beginPath(); ctx.ellipse(random() * w, h * (0.5 + random() * 0.3), w * (0.04 + random() * 0.1), h * (0.006 + random() * 0.012), 0, 0, 7); ctx.fill();
      }
    });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(420, 130), new THREE.MeshBasicMaterial({ map: sky, fog: false }));
    backdrop.position.set(0, 40, -150);
    root.add(backdrop);
    const background = tones[1].clone();
    // Sun or moon on the horizon.
    if (a.sky === 'sunset' || a.sky === 'moonrise') {
      const moon = a.sky === 'moonrise';
      const disc = canvasTexture(256, 256, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.5);
        g.addColorStop(0, moon ? '#fff4d8' : '#ffd070'); g.addColorStop(0.7, moon ? 'rgba(255,240,210,0.4)' : 'rgba(255,170,80,0.5)'); g.addColorStop(1, 'rgba(255,200,150,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = moon ? '#f6e8c4' : '#ffb84a';
        ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.33, 0, 7); ctx.fill();
        if (moon) for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(190,170,140,0.45)'; ctx.beginPath(); ctx.arc(w * (0.35 + random() * 0.3), h * (0.35 + random() * 0.3), w * (0.02 + random() * 0.05), 0, 7); ctx.fill(); }
      });
      const size = moon ? 46 : 34;
      const orb = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: disc, transparent: true, depthWrite: false, fog: false }));
      orb.position.set(moon ? -22 : 18, moon ? 26 : 15, -140);
      root.add(orb);
    }
    // Far hills, two ranks.
    for (let rank = 0; rank < 2; rank++) {
      const colour = tones[0].clone().lerp(new THREE.Color('#2a2438'), rank ? 0.35 : 0.15).lerp(tones[2], rank ? 0.05 : 0.2);
      const mat = new THREE.MeshStandardMaterial({ color: colour, roughness: 1 });
      for (let i = 0; i < 6; i++) {
        const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat);
        hill.scale.set(30 + random() * 30, 5 + random() * 6 - rank * 2, 10);
        hill.position.set(-110 + i * 45 + random() * 20, -1, -110 + rank * 30);
        root.add(hill);
      }
    }

    // ----- ground -----
    const fieldTone = frost ? '#a9a49a' : '#8a7a4a';
    const grass = s.material(new THREE.Color(fieldTone).lerp(tones[1], 0.15), { roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 140).rotateX(-Math.PI / 2), grass);
    ground.position.set(0, 0, -50);
    ground.receiveShadow = true;
    root.add(ground);
    // The patch: furrowed dirt, rows running across the view.
    const furrows = canvasTexture(64, 512, (ctx, w, h) => {
      ctx.fillStyle = frost ? '#9e958a' : '#5e4630'; ctx.fillRect(0, 0, w, h);
      for (let r = 0; r < 16; r++) {
        const y = r * h / 16;
        const g = ctx.createLinearGradient(0, y, 0, y + h / 16);
        g.addColorStop(0, frost ? 'rgba(240,240,245,0.55)' : 'rgba(120,92,62,0.9)'); g.addColorStop(0.5, 'rgba(60,40,26,0.2)'); g.addColorStop(1, 'rgba(40,26,16,0.7)');
        ctx.fillStyle = g; ctx.fillRect(0, y, w, h / 16);
      }
      for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${frost ? 250 : 40},${frost ? 250 : 30},${frost ? 255 : 20},${random() * 0.25})`; ctx.fillRect(random() * w, random() * h, 1.5, 1.5); }
    });
    furrows.wrapS = furrows.wrapT = THREE.RepeatWrapping;
    furrows.repeat.set(10, 1);
    const patchW = 30, patchFront = 9, patchBack = -6.5;
    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(patchW, patchFront - patchBack).rotateX(-Math.PI / 2), s.material('#ffffff', { map: furrows, roughness: 1 }));
    dirt.position.set(0, 0.01, (patchFront + patchBack) / 2);
    dirt.receiveShadow = true;
    root.add(dirt);
    if (a.path) {
      const straw = canvasTexture(128, 512, (ctx, w, h) => {
        ctx.fillStyle = '#a88a4a'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) { ctx.strokeStyle = `rgba(${170 + random() * 50},${130 + random() * 50},${60 + random() * 40},0.8)`; ctx.lineWidth = 1.5; const x = random() * w, y = random() * h, an = random() * 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(an) * 14, y + Math.sin(an) * 14); ctx.stroke(); }
      });
      const path = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 17).rotateX(-Math.PI / 2), s.material('#ffffff', { map: straw, roughness: 1 }));
      path.position.set(2.2, 0.02, 0.5);
      path.rotation.y = 0.12;
      path.receiveShadow = true;
      root.add(path);
    }

    // ----- pumpkins and vines in rows, kept clear of the slots -----
    const clear = (x: number, z: number, r: number) => SLOTS.every(([sx, sz, , w]) => Math.hypot(x - sx, z - sz) > w * 0.6 + r) && !(a.path && Math.abs(x - 2.2 - (z - 0.5) * 0.12) < 1.1 + r);
    const tempS = new Sculpture(context);
    const pumpkinGeo = pumpkin(tempS, { radius: 0.2, height: 0.3, ribs: 10, groove: 0.8, color: '#ffffff', slump: 0.15, detail: [4, 10] }, random).mesh.geometry;
    const leafGeo = leafGeometry(0.2, random, frost ? 0.9 : a.patch === 'picked' ? 0.5 : 0.15);
    const rows: number[] = [];
    for (let z = patchFront - 0.8; z > patchBack + 0.4; z -= 1.25) rows.push(z);
    const pumpkinsAt: { at: V3; scale: number; color: THREE.Color }[] = [];
    const leavesAt: { at: V3; turn: number; tilt: number; scale: number; color: THREE.Color }[] = [];
    const vineMat = s.material(frost ? '#3a3828' : a.patch === 'picked' ? '#6a6a34' : '#4f7a2e', { roughness: 0.85 });
    const leafColour = new THREE.Color(frost ? '#2c2a22' : a.patch === 'picked' ? '#8a8a3a' : '#2f6a2a');
    const density = a.patch === 'lush' ? 0.75 : a.patch === 'picked' ? 0.25 : 0.55;
    rows.forEach((z, r) => {
      const pts: V3[] = [];
      for (let x = -patchW / 2 + 0.5; x <= patchW / 2 - 0.5; x += 1.5) {
        const vz = z + Math.sin(x * 0.7 + r) * 0.25;
        pts.push([x, 0.05, vz]);
        if (random() < density && clear(x, vz, 0.4)) {
          const k = 0.8 + random() * 0.7 + (random() < 0.08 ? 0.8 : 0);
          const hue = frost ? random() < 0.3 ? '#e8e2d0' : '#c0601a' : random() < 0.1 ? '#efe8d8' : random() < 0.15 ? '#e8a020' : '#e2701a';
          const color = new THREE.Color(hue).offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.08).lerp(new THREE.Color('#7a5a3a'), mood.wear * 0.25);
          pumpkinsAt.push({ at: [x + (random() - 0.5) * 0.5, 0.02, vz + (random() - 0.5) * 0.35], scale: k, color });
        }
        const leaves = a.patch === 'lush' ? 3 : frost ? 1 : 2;
        for (let l = 0; l < leaves; l++) {
          const lx = x + (random() - 0.5) * 1.2, lz = vz + (random() - 0.5) * 0.7;
          if (!clear(lx, lz, 0.1)) continue;
          leavesAt.push({ at: [lx, frost ? 0.05 : 0.12 + random() * 0.25, lz], turn: random() * Math.PI * 2, tilt: frost ? -0.3 : (random() - 0.4) * 0.5, scale: 0.9 + random() * 0.8, color: leafColour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1) });
        }
      }
      // Vines run along the row but stop short of the slots.
      let run: V3[] = [];
      for (const p of pts) {
        if (clear(p[0], p[2], 0)) run.push(p);
        else { if (run.length > 1) s.tube(run, 0.022, vineMat); run = []; }
      }
      if (run.length > 1) s.tube(run, 0.022, vineMat);
    });
    const pumpkinMat = s.material('#ffffff', { vertexColors: true, roughness: 0.5 });
    const pumpkinMesh = new THREE.InstancedMesh(pumpkinGeo, pumpkinMat, pumpkinsAt.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    pumpkinsAt.forEach((p, i) => {
      e.set((random() - 0.5) * 0.15, random() * 6, (random() - 0.5) * 0.15);
      m.compose(new THREE.Vector3(...p.at), q.setFromEuler(e), new THREE.Vector3(p.scale, p.scale * (0.85 + random() * 0.3), p.scale));
      pumpkinMesh.setMatrixAt(i, m);
      pumpkinMesh.setColorAt(i, p.color);
    });
    pumpkinMesh.castShadow = pumpkinMesh.receiveShadow = true;
    root.add(pumpkinMesh);
    // Stems on each pumpkin, one instanced batch.
    const stemMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.026, 0.1, 6).translate(0, 0.05, 0), s.material('#6e6236', { roughness: 0.9 }), pumpkinsAt.length);
    pumpkinsAt.forEach((p, i) => {
      e.set((random() - 0.5) * 0.6, 0, (random() - 0.5) * 0.6);
      m.compose(new THREE.Vector3(p.at[0], p.at[1] + 0.22 * p.scale, p.at[2]), q.setFromEuler(e), new THREE.Vector3(p.scale, p.scale, p.scale));
      stemMesh.setMatrixAt(i, m);
    });
    stemMesh.castShadow = true;
    root.add(stemMesh);
    const leafMesh = new THREE.InstancedMesh(leafGeo, s.material('#ffffff', { side: THREE.DoubleSide, roughness: 0.75 }), leavesAt.length);
    leavesAt.forEach((l, i) => {
      e.set(l.tilt, l.turn, 0, 'YXZ');
      m.compose(new THREE.Vector3(...l.at), q.setFromEuler(e), new THREE.Vector3(l.scale, l.scale, l.scale));
      leafMesh.setMatrixAt(i, m);
      leafMesh.setColorAt(i, l.color);
    });
    leafMesh.castShadow = leafMesh.receiveShadow = true;
    root.add(leafMesh);

    // ----- the corn wall, with a maze entrance -----
    const cornZ0 = -8.5, cornZ1 = -13.5;
    const stalkGeo = cornStalk(2.5, random);
    const cornTones = frost ? ['#b8aa88', '#a89a78', '#c8bc9c'] : ['#c9ae6a', '#b89a58', '#d6bf80', '#a8925a'];
    const stalks: { at: V3; s: number; turn: number; color: THREE.Color }[] = [];
    const mazeX = a.path ? 3.3 : 4.5;
    for (let z = cornZ0; z > cornZ1; z -= 0.75) {
      for (let x = -30; x < 30; x += 0.5) {
        const jx = x + (random() - 0.5) * 0.3, jz = z + (random() - 0.5) * 0.3;
        if (Math.abs(jx - mazeX) < 0.9 && z > cornZ0 - 3) continue;
        stalks.push({ at: [jx, 0, jz], s: 0.85 + random() * 0.35, turn: random() * 6, color: new THREE.Color(cornTones[Math.floor(random() * cornTones.length)]).lerp(tones[2], 0.12) });
      }
    }
    const cornMesh = new THREE.InstancedMesh(stalkGeo, s.material('#ffffff', { side: THREE.DoubleSide, roughness: 0.9 }), stalks.length);
    stalks.forEach((st, i) => {
      e.set((random() - 0.5) * 0.12, st.turn, (random() - 0.5) * 0.12);
      m.compose(new THREE.Vector3(...st.at), q.setFromEuler(e), new THREE.Vector3(st.s, st.s * (0.9 + random() * 0.2), st.s));
      cornMesh.setMatrixAt(i, m);
      cornMesh.setColorAt(i, st.color);
    });
    cornMesh.castShadow = cornMesh.receiveShadow = true;
    root.add(cornMesh);
    // Maze entrance arch.
    const postWood = s.material('#5a4632', { roughness: 0.95 });
    s.box([0.14, 3.0, 0.14], [mazeX - 0.95, 1.5, cornZ0 + 0.3], postWood);
    s.box([0.14, 3.0, 0.14], [mazeX + 0.95, 1.5, cornZ0 + 0.3], postWood);
    s.label('CORN MAZE', 2.3, 0.5, [mazeX, 2.85, cornZ0 + 0.4], '#f2e6c8', '#7a2a1a');

    // ----- beyond the corn -----
    const silhouette = (c: string, k = 0.35) => s.material(new THREE.Color(c).lerp(tones[0], k), { roughness: 0.9 });
    const glowWin = s.material('#ffd27a', { emissive: '#ffb347', emissiveIntensity: mix(0.6, 2.2, mood.cheer) });
    if (a.beyond === 'barn') {
      const red = silhouette('#8a2a1e', 0.3);
      const bx = -9, bz = -27;
      const shape = new THREE.Shape();
      shape.moveTo(-6, 0); shape.lineTo(6, 0); shape.lineTo(6, 6); shape.lineTo(4.4, 9.2); shape.lineTo(0, 11); shape.lineTo(-4.4, 9.2); shape.lineTo(-6, 6); shape.closePath();
      const barn = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 14, bevelEnabled: false }), red, [bx, 0, bz - 7]);
      void barn;
      const roof = silhouette('#3a3438', 0.3);
      const rs = new THREE.Shape();
      rs.moveTo(-6.3, 5.9); rs.lineTo(-4.5, 9.4); rs.lineTo(0, 11.3); rs.lineTo(4.5, 9.4); rs.lineTo(6.3, 5.9); rs.lineTo(6.1, 5.7); rs.lineTo(4.3, 9.1); rs.lineTo(0, 10.9); rs.lineTo(-4.3, 9.1); rs.lineTo(-6.1, 5.7); rs.closePath();
      s.mesh(new THREE.ExtrudeGeometry(rs, { depth: 14.4, bevelEnabled: false }), roof, [bx, 0, bz - 7.2]);
      s.box([3.6, 4.6, 0.1], [bx, 2.3, bz + 7.02], silhouette('#5a1a14', 0.3));
      s.box([1.4, 1.0, 0.1], [bx, 8, bz + 7.05], glowWin);
      for (const d of [-1, 1]) s.rod([bx - 1.8, d > 0 ? 0.1 : 4.5, bz + 7.1], [bx + 1.8, d > 0 ? 4.5 : 0.1, bz + 7.1], 0.08, silhouette('#e8e0d0', 0.4));
      const silo = silhouette('#9a9a96', 0.35);
      s.cylinder(2.4, 2.4, 15, [bx + 9.5, 7.5, bz - 2], silo, 20);
      s.ball([2.4, 1.8, 2.4], [bx + 9.5, 15, bz - 2], silhouette('#7a7a80', 0.35), 16);
    } else if (a.beyond === 'farmhouse') {
      const white = silhouette('#e8e4d8', 0.25);
      const hx = 8, hz = -26;
      s.box([10, 5.5, 7], [hx, 2.75, hz], white);
      const roof = new THREE.Shape();
      roof.moveTo(-5.6, 0); roof.lineTo(5.6, 0); roof.lineTo(0, 3.6); roof.closePath();
      s.mesh(new THREE.ExtrudeGeometry(roof, { depth: 7.6, bevelEnabled: false }), silhouette('#3a3438', 0.25), [hx, 5.5, hz - 3.8]);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) s.box([1.0, 1.4, 0.1], [hx - 3.6 + i * 2.4, 1.6 + j * 2.4, hz + 3.52], random() < 0.75 ? glowWin : silhouette('#3a3448', 0.2));
      s.box([10, 0.2, 2], [hx, 2.6, hz + 4.4], white);
      for (let i = 0; i < 5; i++) s.box([0.2, 2.6, 0.2], [hx - 4.8 + i * 2.4, 1.3, hz + 5.3], white);
      s.cylinder(0.4, 0.5, 2, [hx + 2.5, 7.8, hz], silhouette('#7a3a2a', 0.25), 10);
      // A big bare tree by the house.
      const bark = silhouette('#2a2420', 0.4);
      s.rod([hx - 9, 0, hz + 2], [hx - 9.5, 7, hz + 2], 0.45, bark, 0.25);
      for (let b = 0; b < 7; b++) { const an = random() * 6; s.rod([hx - 9.4, 4 + random() * 3, hz + 2], [hx - 9.4 + Math.cos(an) * 4, 8 + random() * 4, hz + 2 + Math.sin(an) * 2], 0.15, bark, 0.04); }
    } else if (a.beyond === 'woods') {
      const dark = silhouette('#2a2430', 0.3);
      for (let i = 0; i < 40; i++) {
        const x = -50 + random() * 100, z = -26 - random() * 14, h = 6 + random() * 9;
        s.rod([x, 0, z], [x + (random() - 0.5), h, z], 0.25, dark, 0.06);
        for (let b = 0; b < 2; b++) { const y = h * (0.45 + random() * 0.4), an = random() * 6; s.rod([x, y, z], [x + Math.cos(an) * h * 0.25, y + h * 0.2, z + Math.sin(an) * 0.6], 0.08, dark, 0.02); }
      }
      const ridge = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), dark);
      ridge.scale.set(70, 6, 12);
      ridge.position.set(0, -1, -36);
      root.add(ridge);
    } else {
      const steel = silhouette('#6a6870', 0.3);
      const wx = -6, wz = -24;
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s.rod([wx + dx * 1.6, 0, wz + dz * 1.6], [wx + dx * 0.2, 12, wz + dz * 0.2], 0.08, steel);
      for (let k = 1; k < 5; k++) { const y = k * 2.6, r = 1.6 * (1 - y / 13); s.box([r * 2, 0.06, 0.06], [wx, y, wz + r], steel); s.box([0.06, 0.06, r * 2], [wx + r, y, wz], steel); }
      const wheel = new THREE.Group();
      for (let b = 0; b < 18; b++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.9, 0.04), steel); blade.position.y = 1.2; const arm = new THREE.Group(); arm.rotation.z = (b / 18) * Math.PI * 2; arm.add(blade); wheel.add(arm); }
      wheel.position.set(wx, 12.5, wz + 0.6);
      root.add(wheel);
      s.box([0.2, 0.9, 2.6], [wx, 12.5, wz - 1.4], steel);
      const tower = silhouette('#8a8a90', 0.3);
      const tx = 12, tz = -34;
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s.rod([tx + dx * 3, 0, tz + dz * 3], [tx + dx * 2, 16, tz + dz * 2], 0.2, tower);
      s.cylinder(4, 4, 5, [tx, 18.5, tz], tower, 20);
      s.cylinder(0.3, 4.3, 2.2, [tx, 22.1, tz], silhouette('#5a5a60', 0.3), 20);
      s.label('HARVEST', 5, 1.2, [tx, 18.7, tz + 4.05], '#2a2a30', '#b8b8c0');
    }
    // A few trees scattered along the far field edge.
    const treeDark = silhouette('#3a3428', 0.45);
    for (let i = 0; i < 9; i++) {
      const x = -40 + random() * 80, z = -40 - random() * 20;
      if (Math.abs(x) < 6) continue;
      s.ball([3 + random() * 3, 3.5 + random() * 3, 3], [x, 5 + random() * 2, z], s.material(new THREE.Color(['#8a4a1e', '#a86a1e', '#6a5a2a'][Math.floor(random() * 3)]).lerp(tones[0], 0.45)), 10);
      s.rod([x, 0, z], [x, 4, z], 0.35, treeDark);
    }

    // ----- field edge: fence and/or bales on the left -----
    const rail = s.material(frost ? '#a8a49c' : '#8a8478', { roughness: 0.95 });
    if (a.edge === 'fence' || a.edge === 'both') {
      for (let i = 0; i <= 9; i++) {
        const x = -15 + i * 1.6, z = -7.2 + i * 0.05;
        s.box([0.14, 1.3, 0.14], [x, 0.62, z], rail).rotation.y = (random() - 0.5) * 0.2;
        if (i < 9) for (const y of [0.45, 0.85, 1.18]) s.box([1.75, 0.1, 0.09], [x + 0.8, y, z + 0.02], rail).rotation.z = (random() - 0.5) * 0.05;
        if (i % 3 === 1) {
          // A small corn shock tied to the post.
          const shock = s.cylinder(0.03, 0.35, 1.8, [x, 0.9, z + 0.3], s.material(cornTones[i % cornTones.length], { roughness: 1 }), 9);
          void shock;
          s.cylinder(0.25, 0.04, 0.6, [x, 1.95, z + 0.3], s.material(cornTones[(i + 1) % cornTones.length], { roughness: 1 }), 9);
          s.ring(0.09, 0.025, [x, 1.45, z + 0.3], s.material('#7a3f1c')).rotation.x = Math.PI / 2;
        }
      }
    }
    if (a.edge === 'bales' || a.edge === 'both') {
      for (let i = 0; i < 7; i++) {
        const x = -14.5 + i * 1.0, z = a.edge === 'both' ? -6.1 : -7;
        hayBale(s, [x, 0, z], random, { dull: mood.wear * 0.5 + (frost ? 0.3 : 0), turn: (random() - 0.5) * 0.08 });
        if (random() < 0.5) {
          const p = pumpkin(s, { radius: 0.17, height: 0.24, ribs: 10, groove: 0.8, color: new THREE.Color('#e2701a').offsetHSL(0, 0, (random() - 0.5) * 0.1) }, random);
          p.mesh.position.set(x + (random() - 0.5) * 0.3, 0.36, z);
        }
      }
    }
    // Hand-painted sign on two posts at the right of the patch.
    if (a.sign !== 'none') {
      const text = { pick: 'PICK YOUR OWN', maze: 'CORN MAZE  →', price: 'PUMPKINS $5' }[a.sign];
      const board = canvasTexture(512, 192, (ctx, w, h) => {
        ctx.fillStyle = '#efe4c6'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 12; ctx.strokeRect(6, 6, w - 12, h - 12);
        ctx.fillStyle = '#c0391b'; ctx.font = 'bold 74px cursive, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-0.025); ctx.fillText(text, 0, 0, w * 0.9); ctx.restore();
      });
      const sx = 8.8, sz = 5.2;
      s.box([0.1, 1.6, 0.1], [sx - 0.95, 0.8, sz], postWood);
      s.box([0.1, 1.6, 0.1], [sx + 0.95, 0.8, sz], postWood);
      const signMesh = s.mesh(new THREE.PlaneGeometry(2.2, 0.82), new THREE.MeshStandardMaterial({ map: board, roughness: 0.85 }), [sx, 1.25, sz + 0.06]);
      signMesh.rotation.set(0, -0.35, (random() - 0.5) * 0.06);
    }

    // ----- crows wheeling in the sky -----
    const crows: THREE.Group[] = [];
    if (a.crows) {
      const black = s.material('#18181c', { roughness: 0.5, side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) {
        const bird = new THREE.Group();
        for (const side of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.12), new THREE.Vector3(side * 0.6, 0.12, -0.05), new THREE.Vector3(0, 0, -0.2)]), black);
          wing.geometry.computeVertexNormals();
          bird.add(wing);
        }
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), black);
        body.scale.set(1, 0.8, 2.4);
        bird.add(body);
        bird.position.set(-8 + random() * 16, 7 + random() * 5, -12 - random() * 6);
        bird.rotation.y = random() * 6;
        bird.userData = { cx: bird.position.x, cz: bird.position.z, r: 1.5 + random() * 3, phase: random() * 6, y: bird.position.y };
        root.add(bird);
        crows.push(bird);
      }
    }

    // ----- light -----
    const hemi = new THREE.HemisphereLight(tones[1].clone().lerp(new THREE.Color('#ffffff'), 0.5), new THREE.Color('#5a5040'), 1.05);
    const key = new THREE.DirectionalLight(tones[3].clone().lerp(new THREE.Color('#ffffff'), 0.3), a.sky === 'overcast' ? 1.3 : 2.0);
    const noon = 1 - Math.abs(mood.daylight - 0.5) * 2;
    key.position.set(mix(-26, 26, mood.daylight), mix(9, 18, noon), 14);
    key.target.position.set(0, 0, -2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    const rim = new THREE.DirectionalLight(tones[2], 0.7);
    rim.position.set(a.sky === 'moonrise' ? -20 : 20, 6, -40);
    root.add(hemi, key, key.target, rim);

    // ----- camera: standing at the patch's front edge, looking across to the corn -----
    const camera = new THREE.PerspectiveCamera(46, 1, 0.3, 500);
    camera.position.set((random() - 0.5) * 1.2, 3.4, 15.5);
    const aim = new THREE.Vector3(0, 2.2, -8);
    camera.lookAt(aim);

    const tempo = mix(0.3, 1.6, mood.energy);
    const world: World = {
      object: root, camera, background, capacity: SLOTS.length, ground, keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, i) => {
          const [x, z, maxHeight, maxRadius, minHeight] = SLOTS[i % SLOTS.length];
          const height = Math.max(item.height, 0.05), radius = Math.max(item.radius, 0.05);
          let scale = Math.min(1, maxHeight / height, maxRadius / radius);
          if (height * scale < minHeight) scale = Math.min(maxRadius / radius, minHeight / height);
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, 0.02, z);
          item.holder.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z) * 0.85 + (context.random() - 0.5) * 0.4;
          item.holder.updateMatrixWorld(true);
        });
        camera.lookAt(aim);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const shadow = key.shadow.camera;
        shadow.left = -22; shadow.right = 22; shadow.bottom = -22; shadow.top = 22;
        shadow.near = 1; shadow.far = 90;
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) {
        const t = time * tempo;
        for (const bird of crows) {
          const u = bird.userData as { cx: number; cz: number; r: number; phase: number; y: number };
          const an = t * 0.5 + u.phase;
          bird.position.set(u.cx + Math.cos(an) * u.r, u.y + Math.sin(an * 2) * 0.3, u.cz + Math.sin(an) * u.r * 0.5);
          bird.rotation.y = -an;
          const flap = Math.sin(t * 7 + u.phase) * 0.5;
          bird.children[0].rotation.z = flap; bird.children[1].rotation.z = -flap;
        }
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(tempS.root); disposeTree(root); },
    };
    return world;
  },
});
