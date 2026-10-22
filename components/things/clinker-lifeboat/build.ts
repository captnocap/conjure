import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { afloat, painted, waterPatch } from './sea';

const PAINT = {
  white: 'White hull, buff inside, varnished gunwale: a liner’s boat.',
  grey: 'Flat wartime grey inside and out.',
  varnish: 'Bare varnished timber, honey-brown, every plank showing.',
  black: 'Tarred black with one white sheer strake, old and heavy.',
  blue: 'Faded working blue, the paint of a tramp steamer.',
} as const;
const SCHEME: Record<keyof typeof PAINT, { out: string; inside: string; trim: string; ink: string }> = {
  white: { out: '#ece8dc', inside: '#c9b281', trim: '#7a5230', ink: '#1b1c1e' },
  grey: { out: '#899294', inside: '#9aa1a1', trim: '#5a6163', ink: '#f0efe8' },
  varnish: { out: '#a56b34', inside: '#b78046', trim: '#6b4222', ink: '#1b1c1e' },
  black: { out: '#2c2d30', inside: '#b7b09a', trim: '#7a5230', ink: '#f0efe8' },
  blue: { out: '#466b8f', inside: '#b9b29c', trim: '#6b4a2c', ink: '#f0efe8' },
};
const NAMES = {
  meridian: 'S.S. MERIDIAN in neat black capitals.',
  arcturus: 'M.V. ARCTURUS and a home port.',
  cordelia: 'R.M.S. CORDELIA, a grand name for a small boat.',
  halcyon: 'S.S. HALCYON, half worn away.',
  number: 'Only a boat number: No. 4.',
  erased: 'Nothing: the name has been painted out with a rough grey patch.',
} as const;
const NAME_TEXT: Record<keyof typeof NAMES, string> = { meridian: 'S.S. MERIDIAN', arcturus: 'M.V. ARCTURUS', cordelia: 'R.M.S. CORDELIA', halcyon: 'S.S. HALCYON', number: 'No. 4', erased: '' };

export default defineThing({
  questions: {
    traces: choice('What have its occupants left in it?', {
      nothing: 'Nothing at all. It is swept bare.',
      blanket: 'A grey wool blanket heaped in the stern, still holding the shape of someone.',
      rations: 'A water cask, a biscuit tin and a tin cup set out on a thwart.',
      tally: 'Chalked tally marks along the inside planking, row after row of days.',
      shrouded: 'A long still shape under a tarpaulin on the bottom boards.',
      lantern: 'A hurricane lantern left burning on the stern thwart.',
      belongings: 'A single shoe, a hat and an open suitcase.',
    }),
    oars: choice('Where are the oars?', {
      shipped: 'All shipped neatly, lying fore and aft along the thwarts.',
      rowing: 'Out in the crutches on both sides, blades trailing in the water.',
      one: 'Only one is left, lying across the gunwale.',
      steering: 'One lashed over the stern as a steering oar; the rest stowed.',
      lost: 'All gone: the crutches stand empty.',
    }),
    name: choice('What is stencilled on the bow?', NAMES),
    rig: choice('What has been jury-rigged, if anything?', {
      none: 'Nothing. It only drifts.',
      blanket: 'An oar lashed upright as a mast with a blanket spread on it for a sail.',
      lugsail: 'The boat’s own short mast and tan lugsail, properly set.',
      flag: 'A shirt tied to a boathook at the bow as a distress flag.',
      awning: 'A canvas awning stretched over the fore part for shade.',
    }),
    water: score('How much water has it shipped?', ['Dry', 'Bilge water sloshing over the boards', 'Swamped to the thwarts']),
    paint: choice('How is it painted?', PAINT),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const b = new Sculpture(context);
    s.root.add(b.root);
    const { mood, random } = context;
    const scheme = SCHEME[a.paint];
    const L = 7.2, B = 2.3, half = L / 2;
    const breadth = (u: number) => (B / 2) * Math.max(0, 1 - Math.abs(u) ** 2.6) ** 0.75;
    const sheer = (u: number) => 0.62 + 0.34 * u * u;
    const keel = (u: number) => -0.3 + 0.28 * Math.abs(u) ** 4;
    const point = (u: number, v: number, side: number, inset = 0) => {
      const k = keel(u), w = Math.max(0, breadth(u) - inset);
      return new THREE.Vector3(u * half, k + (sheer(u) - k) * (1 - Math.cos(v * Math.PI / 2)) ** 0.85, side * w * Math.sin(v * Math.PI / 2) ** 0.9);
    };
    const vAt = (u: number, y: number) => {
      let lo = 0, hi = 1;
      for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (point(u, mid, 1).y < y) lo = mid; else hi = mid; }
      return lo;
    };
    const widthAt = (u: number, y: number) => (y <= keel(u) ? 0 : point(u, vAt(u, y), 1).z);

    // Clinker planking: each strake stands proud of the one below it.
    const N = 28, M = 8, lap = 0.048;
    const positions: number[] = [], colours: number[] = [], index: number[] = [];
    const base = new THREE.Color(scheme.out), bare = new THREE.Color('#9a7b56'), tint = new THREE.Color();
    for (const side of [-1, 1])
      for (let k = 0; k < M; k++) {
        tint.copy(a.paint === 'black' && k === M - 1 ? new THREE.Color('#e9e5d8') : base);
        if (random() < mood.wear * 0.45) tint.lerp(bare, mix(0.3, 0.8, random()));
        tint.offsetHSL(0, 0, (random() - 0.5) * 0.05);
        const start = positions.length / 3;
        for (let i = 0; i <= N; i++) {
          const u = (i / N) * 2 - 1;
          const low = point(u, k / M, side), high = point(u, (k + 1) / M, side);
          const out = new THREE.Vector3(0, -(high.z - low.z) * side, (high.y - low.y) * side).normalize().multiplyScalar(lap * (1 - Math.abs(u) ** 8) * (k === 0 ? 0 : 1));
          const edge = low.clone().add(out);
          positions.push(low.x, low.y, low.z, edge.x, edge.y, edge.z, high.x, high.y, high.z);
          for (let c = 0; c < 3; c++) colours.push(tint.r, tint.g, tint.b);
          if (i < N) {
            const p = start + i * 3, q = p + 3;
            const quads = [[p, q, p + 1, q + 1], [p + 1, q + 1, p + 2, q + 2]];
            for (const [a0, b0, c0, d0] of quads) side > 0 ? index.push(a0, b0, c0, c0, b0, d0) : index.push(a0, c0, b0, c0, d0, b0);
          }
        }
      }
    const planking = new THREE.BufferGeometry();
    planking.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    planking.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    planking.setIndex(index);
    planking.computeVertexNormals();
    b.mesh(planking, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 + mood.wear * 0.25 }));
    b.mesh(planking, new THREE.MeshStandardMaterial({ color: new THREE.Color(scheme.inside).lerp(new THREE.Color('#7d7868'), mood.wear * 0.3), roughness: 0.85, side: THREE.BackSide }));

    const wood = b.material(scheme.trim, { roughness: 0.6 });
    const plank = b.material(scheme.inside, { roughness: 0.85 });
    const rope = b.material('#d9cba4', { roughness: 1 });
    const iron = b.material('#4a4d4f', { metalness: 0.5, roughness: 0.6 });
    // Gunwales, stem, sternpost and keel.
    for (const side of [-1, 1]) b.tube(Array.from({ length: 15 }, (_u, i) => point((i / 14) * 2 - 1, 1, side).toArray()), 0.05, wood);
    for (const end of [-1, 1]) b.rod([end * (half - 0.02), keel(1) - 0.05, 0], [end * (half + 0.06), sheer(1) + 0.16, 0], 0.055, wood, 0.045);
    b.box([L * 0.9, 0.1, 0.07], [0, -0.33, 0], wood);

    // Bottom boards shaped to the hull, and the bilge water above them.
    const strip = (y: number, inset: number, from: number, to: number) => {
      const verts: number[] = [], idx: number[] = [];
      const steps = 22;
      for (let i = 0; i <= steps; i++) {
        const u = mix(from, to, i / steps), w = Math.max(0, widthAt(u, y) - inset);
        verts.push(u * half, y, w, u * half, y, -w);
        if (i < steps) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geometry.setIndex(idx);
      geometry.computeVertexNormals();
      return geometry;
    };
    const floorY = 0.06;
    b.mesh(strip(floorY, 0.0, -0.97, 0.97), new THREE.MeshStandardMaterial({ color: new THREE.Color(scheme.inside).multiplyScalar(0.8), roughness: 0.9, side: THREE.DoubleSide }));
    for (const z of [-0.45, -0.15, 0.15, 0.45]) b.box([L * 0.72, 0.012, 0.012], [0, floorY + 0.006, z], wood).castShadow = false;
    const seatY = 0.36;
    const bilge = a.water > 0.12 ? mix(floorY + 0.015, seatY - 0.03, ((a.water - 0.12) / 0.88) ** 1.6) : 0;
    if (bilge) b.mesh(strip(bilge, 0.01, -0.985, 0.985), new THREE.MeshStandardMaterial({ color: '#3f6f74', roughness: 0.15, metalness: 0.2, side: THREE.DoubleSide })).castShadow = false;

    // Ribs, thwarts and crutches.
    for (let i = 1; i < 14; i++) {
      const u = (i / 14) * 2 - 1;
      for (const side of [-1, 1]) b.tube(Array.from({ length: 6 }, (_u, k) => point(u, 0.2 + k * 0.16, side, 0.03).toArray()), 0.018, plank).castShadow = false;
    }
    const thwarts = [-0.62, -0.32, 0, 0.32, 0.62];
    for (const u of thwarts) b.box([0.26, 0.045, widthAt(u, seatY) * 2 - 0.02], [u * half, seatY, 0], wood);
    for (const end of [-1, 1]) b.mesh(strip(seatY, 0.01, end > 0 ? 0.8 : -0.99, end > 0 ? 0.99 : -0.8), new THREE.MeshStandardMaterial({ color: wood.color, roughness: 0.7, side: THREE.DoubleSide }));
    const crutches: [number, number][] = [];
    for (const u of [-0.47, -0.16, 0.16, 0.47]) for (const side of [-1, 1]) {
      crutches.push([u, side]);
      const at = point(u, 1, side);
      b.rod([at.x, at.y, at.z], [at.x, at.y + 0.08, at.z], 0.014, iron);
      const fork = b.ring(0.045, 0.012, [at.x, at.y + 0.125, at.z], iron, Math.PI);
      fork.rotation.set(0, Math.PI / 2, Math.PI);
    }
    // Becketed grab lines looped below the gunwale.
    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
      const u0 = -0.72 + i * 0.24, u1 = u0 + 0.24;
      const p0 = point(u0, 0.9, side), p1 = point(u1, 0.9, side), mid = point((u0 + u1) / 2, 0.72, side);
      b.tube([[p0.x, p0.y, p0.z + side * 0.03], [mid.x, mid.y, mid.z + side * 0.07], [p1.x, p1.y, p1.z + side * 0.03]], 0.015, rope).castShadow = false;
    }
    // Rudder and tiller at the stern (−x).
    b.box([0.42, 0.85, 0.04], [-half - 0.24, 0.12, 0], wood);
    b.rod([-half - 0.08, sheer(1) + 0.05, 0], [-half + 0.9, sheer(0.75) + 0.2, 0.05], 0.025, wood);

    // The stencilled name on both bows.
    const text = NAME_TEXT[a.name];
    const stencil = painted(512, 80, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      if (a.name === 'erased') { ctx.fillStyle = '#8b8f8c'; ctx.fillRect(20, 8, w - 40, h - 16); ctx.fillStyle = '#7c807d'; for (let i = 0; i < 9; i++) ctx.fillRect(20 + random() * (w - 120), 8 + random() * (h - 30), 90, 12); return; }
      ctx.fillStyle = scheme.ink; ctx.font = 'bold 60px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2 + 3, w - 30);
      if (a.name === 'halcyon' || mood.wear > 0.6) { ctx.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 22; i++) { ctx.beginPath(); ctx.arc(random() * w, random() * h, mix(5, 20, random()), 0, 7); ctx.fill(); } }
    });
    for (const side of [-1, 1]) {
      const u = 0.56, v = 0.88;
      const at = point(u, v, side), along = point(u + 0.02, v, side).sub(point(u - 0.02, v, side)), up = point(u, v + 0.03, side).sub(point(u, v - 0.03, side));
      const normal = along.clone().cross(up).normalize().multiplyScalar(-side);
      const plate = b.mesh(new THREE.PlaneGeometry(a.name === 'number' ? 0.9 : 1.9, a.name === 'number' ? 0.26 : 0.28), new THREE.MeshStandardMaterial({ map: stencil, alphaTest: 0.4, roughness: 0.8 }), at.clone().addScaledVector(normal, 0.045).toArray());
      plate.lookAt(plate.position.clone().add(normal));
      plate.castShadow = false;
    }

    // Oars.
    const oar = (from: THREE.Vector3, toward: THREE.Vector3, length = 4.0) => {
      const direction = toward.clone().sub(from).normalize(), end = from.clone().addScaledVector(direction, length);
      b.rod(from.toArray(), end.toArray(), 0.028, wood, 0.022);
      const blade = b.box([0.9, 0.022, 0.15], end.clone().addScaledVector(direction, -0.42).toArray(), wood);
      blade.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction);
      return end;
    };
    const stowed = (count: number) => { for (let i = 0; i < count; i++) oar(new THREE.Vector3(-2.0 + random() * 0.3, seatY + 0.06 + (i > 1 ? 0.05 : 0), (i % 2 ? 1 : -1) * (0.3 + (i > 1 ? 0.12 : 0))), new THREE.Vector3(2.2, seatY + 0.07, (i % 2 ? 1 : -1) * (0.3 + random() * 0.15))); };
    if (a.oars === 'shipped') stowed(4);
    else if (a.oars === 'rowing') for (const [u, side] of crutches) {
      const pivot = point(u, 1, side);
      pivot.y += 0.13;
      const sweep = (random() - 0.5) * 0.7;
      const out = new THREE.Vector3(Math.sin(sweep) * 2.6 - 0.2, -0.75, side * Math.cos(sweep) * 2.6).add(pivot);
      const inboard = pivot.clone().addScaledVector(out.clone().sub(pivot).normalize(), -1.1);
      oar(inboard, out, 3.9);
    } else if (a.oars === 'one') oar(new THREE.Vector3(-0.5, sheer(0.1) + 0.1, -1.6), new THREE.Vector3(0.6, sheer(0.1) + 0.06, 1.4), 3.9);
    else if (a.oars === 'steering') { stowed(2); oar(new THREE.Vector3(-half + 1.3, sheer(0.8) + 0.5, 0.25), new THREE.Vector3(-half - 1.6, -0.5, 0.5), 4.2); }

    // What was left behind.
    const lampGlow: THREE.MeshStandardMaterial[] = [];
    if (a.traces === 'blanket' || a.traces === 'shrouded') {
      const shroud = a.traces === 'shrouded';
      const heap = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const p = heap.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const lump = shroud ? 0.55 + 0.45 * Math.exp(-((x - 0.72) ** 2) * 14) + 0.25 * Math.exp(-((x + 0.8) ** 2) * 20) : 0.7 + 0.3 * Math.sin(x * 5 + 1) * Math.sin(z * 6);
        p.setXYZ(i, x, y * lump, z);
      }
      heap.computeVertexNormals();
      const cloth = shroud ? b.material('#6f7466', { roughness: 0.95 }) : new THREE.MeshStandardMaterial({ map: painted(64, 64, (ctx) => { ctx.fillStyle = '#8c8c86'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#b5443a'; ctx.fillRect(0, 44, 64, 5); ctx.fillRect(0, 53, 64, 3); }), roughness: 1 });
      const mound = b.mesh(heap, cloth, shroud ? [0.3, floorY, 0] : [-2.3, seatY - 0.12, 0]);
      mound.scale.set(shroud ? 1.0 : 0.55, shroud ? 0.38 : 0.5, shroud ? 0.33 : 0.5);
      if (shroud) for (const x of [-0.4, 0.3, 0.95]) b.ring(0.3, 0.012, [x, floorY + 0.02, 0], rope, Math.PI).rotation.y = Math.PI / 2;
    } else if (a.traces === 'rations') {
      const x = thwarts[1] * half;
      const cask = b.mesh(new THREE.LatheGeometry([[0, 0], [0.13, 0], [0.17, 0.16], [0.13, 0.32], [0, 0.32]].map(([r, y]) => new THREE.Vector2(r, y)), 14), b.material('#8a6034'), [x - 0.5, floorY, 0.2]);
      for (const y of [0.06, 0.26]) b.ring(0.15, 0.012, [x - 0.5, floorY + y, 0.2], iron).rotation.x = Math.PI / 2;
      cask.castShadow = true;
      b.box([0.3, 0.16, 0.22], [x, seatY + 0.1, 0.35], b.material('#b03a2c', { metalness: 0.3 })).rotation.y = 0.3;
      b.cylinder(0.05, 0.04, 0.09, [x, seatY + 0.07, -0.25], b.material('#c9cdd0', { metalness: 0.7, roughness: 0.3 }), 12);
      b.ring(0.03, 0.006, [x + 0.06, seatY + 0.07, -0.25], iron);
    } else if (a.traces === 'tally') {
      const chalk = painted(512, 128, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#f4f2ea'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        const total = 20 + Math.floor(random() * 30);
        for (let i = 0; i < total; i++) {
          const group = Math.floor(i / 5), x0 = 14 + (group % 9) * 55, y0 = 8 + Math.floor(group / 9) * 60;
          ctx.beginPath();
          if (i % 5 === 4) { ctx.moveTo(x0 - 6, y0 + 40); ctx.lineTo(x0 + 42, y0 + 8); } else { ctx.moveTo(x0 + (i % 5) * 10, y0 + 2); ctx.lineTo(x0 + (i % 5) * 10 + 2, y0 + 44); }
          ctx.stroke();
        }
      });
      const at = point(0.05, 0.86, -1);
      const board = b.mesh(new THREE.PlaneGeometry(1.9, 0.36), new THREE.MeshStandardMaterial({ map: chalk, alphaTest: 0.4, roughness: 1 }), [at.x, at.y - 0.02, at.z + 0.07]);
      board.rotation.x = -0.12;
      board.castShadow = false;
      b.cylinder(0.012, 0.012, 0.07, [0.3, seatY + 0.035, -0.4], b.material('#f4f2ea'), 8).rotation.z = 1.4;
    } else if (a.traces === 'lantern') {
      const x = thwarts[0] * half;
      const flame = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: 3 });
      lampGlow.push(flame);
      b.cylinder(0.09, 0.1, 0.07, [x, seatY + 0.06, 0.1], iron, 12);
      b.cylinder(0.065, 0.075, 0.16, [x, seatY + 0.17, 0.1], flame, 12);
      b.cylinder(0.04, 0.09, 0.06, [x, seatY + 0.28, 0.1], iron, 12);
      b.ring(0.1, 0.008, [x, seatY + 0.26, 0.1], iron, Math.PI);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffb44a', transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.position.set(x, seatY + 0.17, 0.1);
      b.root.add(halo);
    } else if (a.traces === 'belongings') {
      const leather = b.material('#6e4a2c');
      const x = thwarts[3] * half;
      b.box([0.5, 0.14, 0.34], [x - 0.5, floorY + 0.07, 0.1], leather).rotation.y = 0.3;
      const lid = b.box([0.5, 0.03, 0.34], [x - 0.5, floorY + 0.28, -0.05], leather);
      lid.rotation.set(-1.0, 0.3, 0);
      b.box([0.42, 0.04, 0.28], [x - 0.5, floorY + 0.15, 0.1], b.material('#e6e0cf')).rotation.y = 0.3;
      b.ball([0.13, 0.045, 0.055], [x + 0.2, seatY + 0.06, 0.3], b.material('#2a2422'), 10).rotation.y = 0.7;
      b.cylinder(0.11, 0.12, 0.1, [x - 1.3, seatY + 0.075, -0.2], b.material('#3b3d42'), 16);
      b.cylinder(0.2, 0.2, 0.015, [x - 1.3, seatY + 0.03, -0.2], b.material('#3b3d42'), 20);
    }

    // Jury rigs.
    const canvas = (hex: string) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#8b8474'), mood.wear * 0.3), roughness: 0.95, side: THREE.DoubleSide });
    const sail = (w: number, h: number, belly: number, material: THREE.Material, at: [number, number, number], skew = 0, turn = Math.PI / 2 - 0.5) => {
      const geometry = new THREE.PlaneGeometry(w, h, 8, 6);
      const p = geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) / w, y = p.getY(i) / h;
        p.setXYZ(i, p.getX(i) + skew * (y + 0.5) * w, p.getY(i) + skew * x * h * (y + 0.5), belly * Math.cos(x * Math.PI) * Math.cos(y * Math.PI * 0.9));
      }
      geometry.computeVertexNormals();
      const mesh = b.mesh(geometry, material, at);
      mesh.rotation.y = turn;
      return mesh;
    };
    const wind = mix(0.08, 0.4, mood.energy);
    if (a.rig === 'blanket') {
      const mx = 1.3;
      b.rod([mx, floorY, 0], [mx, 3.4, 0], 0.03, wood, 0.024);
      b.box([0.022, 0.8, 0.15], [mx, 3.5, 0], wood);
      b.rod([mx - 0.45, 2.75, -0.8], [mx + 0.45, 2.75, 0.8], 0.022, wood);
      sail(1.7, 1.5, wind, new THREE.MeshStandardMaterial({ map: painted(64, 64, (ctx) => { ctx.fillStyle = '#8f8f88'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#b5443a'; ctx.fillRect(0, 8, 64, 5); ctx.fillRect(0, 52, 64, 5); }), roughness: 1, side: THREE.DoubleSide }), [mx + 0.05, 2.0, 0]);
      for (const z of [-1, 1]) b.rod([mx, 2.9, 0], [mx - 1.4, sheer(0.2), z * widthAt(0.1, 0.6)], 0.008, rope);
      for (const z of [-0.8, 0.8]) b.rod([mx + z * 0.52, 1.28, z], [mx - 1.0, sheer(0.1), z * 1.05], 0.007, rope);
    } else if (a.rig === 'lugsail') {
      const mx = 1.5;
      b.rod([mx, floorY, 0], [mx, 4.3, 0], 0.05, wood, 0.035);
      b.rod([mx - 1.35, 3.5, -0.42], [mx + 1.25, 4.45, 0.5], 0.03, wood);
      sail(2.5, 2.6, wind * 1.3, canvas('#b5763c'), [mx - 0.05, 2.55, 0.06], 0.16, 0.34);
      b.rod([mx, 4.2, 0], [half, sheer(1) + 0.1, 0], 0.008, rope);
      for (const z of [-1, 1]) b.rod([mx, 4.2, 0], [mx - 0.9, sheer(0.3), z * widthAt(0.15, 0.6)], 0.008, rope);
      b.rod([mx - 1.2, 1.3, -0.4], [-1.9, sheer(0.5), 0.5], 0.008, rope);
    } else if (a.rig === 'flag') {
      b.rod([half - 0.9, floorY, 0.1], [half - 0.3, 2.9, 0], 0.022, wood);
      const shirt = sail(0.75, 0.55, wind * 0.4, canvas(mood.cheer > 0.5 ? '#f4f2ea' : '#d9d2bd'), [half - 0.02, 2.55, 0.28]);
      shirt.rotation.y = Math.PI / 2 - 0.9;
    } else if (a.rig === 'awning') {
      const ridge = 1.35;
      b.rod([0.5, ridge, 0], [half - 0.15, ridge - 0.1, 0], 0.025, wood);
      b.rod([0.5, floorY, 0], [0.5, ridge, 0], 0.025, wood);
      const cover = new THREE.PlaneGeometry(1, 1, 10, 2);
      const p = cover.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const t = p.getX(i) + 0.5, across = p.getY(i) * 2;
        const u = mix(0.14, 0.93, t), edge = point(u, 1, Math.sign(across) || 1);
        p.setXYZ(i, u * half, mix(ridge - t * 0.1, edge.y + 0.04, Math.abs(across)) - Math.sin(Math.abs(across) * Math.PI) * 0.06, across * (edge.z + 0.03 * Math.sign(across)));
      }
      cover.computeVertexNormals();
      b.mesh(cover, canvas('#cfc4a2'));
    }

    // Trim and sea.
    const heavy = a.water;
    const heel = (random() - 0.5) * 0.1 + (a.rig === 'lugsail' ? 0.1 : 0);
    b.root.rotation.x = heel;
    b.root.rotation.y = 0.35 + (random() - 0.5) * 0.3;
    b.root.position.y = -heavy * 0.22;
    waterPatch(s, half * 1.14, a.oars === 'rowing' ? 3.1 : 1.7, { rings: 3, foam: 10 });
    if (mood.wear > 0.45) {
      const weed = new THREE.ConeGeometry(0.035, 0.22, 5);
      b.scatter(weed, b.material('#4c6b33', { roughness: 1 }), Array.from({ length: Math.round(mood.wear * 70) }, () => {
        const u = mix(-0.95, 0.95, random()), side = random() < 0.5 ? -1 : 1, at = point(u, vAt(u, 0.02 + heavy * 0.22), side);
        return { at: [at.x, -(at.y + 0.02), -(at.z + side * 0.03)] as const, size: mix(0.6, 1.4, random()) };
      })).rotation.x = Math.PI;
    }

    const pace = mix(0.45, 1.5, mood.energy), sway = mix(0.01, 0.09, mood.energy);
    return afloat(s, {
      footprint: half * 1.1,
      update: (_dt, time) => {
        b.root.rotation.x = heel + Math.sin(time * pace) * sway;
        b.root.rotation.z = Math.cos(time * pace * 0.7) * sway * 0.5;
        for (const glow of lampGlow) glow.emissiveIntensity = 3 * (0.85 + Math.sin(time * 11) * 0.08 + Math.sin(time * 4.3) * 0.07);
      },
    });
  },
});
