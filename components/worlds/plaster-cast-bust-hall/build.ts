import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

const WALLS = { red: '#9c4a3c', sage: '#93a58c', plaster: '#e3dccb', slate: '#6f8093' } as const;
const WORDS = { ars: 'ARS LONGA VITA BREVIS', casts: 'GALLERY OF CASTS', silence: 'SILENCE', names: 'NOMINA NUDA TENEMUS', none: '' } as const;

export default defineWorld({
  questions: {
    state: choice('What state is the gallery in?', {
      morning: 'A bright scholarly morning: open to visitors, a bench before the best piece, brass labels polished.',
      copying: 'Drawing day: students\' easels and stools set up facing the casts, sketches half finished.',
      closed: 'A closed wing: the wall casts under dust sheets, a sign on a stand, a ladder left against the wall, the light failing.',
      packing: 'Being cleared: open crates and straw, a hand truck, niches already emptied.',
    }),
    walls: choice('What colour are the walls?', {
      red: 'Deep Pompeian red, the classic cast-court colour.',
      sage: 'Faded sage green.',
      plaster: 'Bare cream plaster, white on white.',
      slate: 'Cool slate blue.',
    }),
    floor: choice('What is the floor?', {
      slabs: 'Big pale limestone slabs with fine joints.',
      checker: 'Black and white marble checker.',
      parquet: 'Herringbone oak parquet, honey-coloured.',
      terrazzo: 'Speckled terrazzo with a dark border line.',
    }),
    casts: choice('What stands in the wall niches?', {
      busts: 'Portrait busts, one to a niche, all facing into the room.',
      fragments: 'Fragments: a torso, a column capital, an urn, a great foot.',
      empty: 'Nothing: empty niches with only the name plates left beneath them.',
    }),
    doorway: choice('What shows through the arch at the far end?', {
      enfilade: 'Another gallery, and another beyond it, each arch smaller and paler.',
      dark: 'An unlit room, just darkness.',
      sheeted: 'A sheet hung across the opening.',
      doors: 'Closed panelled doors with a brass bar across.',
    }),
    words: choice('What is lettered over the doorway?', {
      ars: 'ARS LONGA VITA BREVIS', casts: 'GALLERY OF CASTS', silence: 'SILENCE', names: 'NOMINA NUDA TENEMUS: we hold only bare names.', none: 'Nothing.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const closed = a.state === 'closed';
    const slots: [number, number][] = [[0.2, 0.9], [-3.5, -1.7], [3.7, -1.4], [-3.0, 3.3], [3.8, 3.2], [3.6, -3.9]];
    const lifts = [0.95, 0.6, 0.6, 0, 0, 1.0];
    const { art: s, world } = diorama(context, {
      background: closed ? '#cfccc4' : '#e6e3d8', floor: '#d8d2c2', width: 14, depth: 11, maxHeight: 2.6, radius: 0.85, pitch: 29, yaw: 27, slots,
    });
    const root = s.root;
    // Light: a closed wing is dimmer and cooler; a morning is bright.
    root.traverse((node) => {
      const light = node as THREE.Light;
      if (!light.isLight) return;
      if ((light as THREE.HemisphereLight).isHemisphereLight) light.intensity *= closed ? 0.82 : 1.05;
      else if (light.castShadow) light.intensity *= closed ? 0.6 : mix(1.0, 1.2, mood.cheer);
    });

    const wallTone = new THREE.Color(WALLS[a.walls]);
    if (closed) wallTone.lerp(new THREE.Color('#8a8a88'), 0.25);
    const wall = s.material(wallTone, { roughness: 0.92 });
    const stone = s.material('#ddd5c2', { roughness: 0.8 }), plaster = s.material('#f1ece0', { roughness: 0.85 }), shade = s.material('#cfc7b4', { roughness: 0.85 });
    const dark = s.material('#3a342e', { roughness: 0.9 }), brass = s.material('#c9a240', { metalness: 0.85, roughness: 0.3 });
    const wood = s.material('#8b6844', { roughness: 0.7 }), sheet = s.material(closed ? '#dedbd2' : '#efece4', { roughness: 0.95 });

    // Floor pattern, painted onto the stage floor.
    if (world.ground) {
      const canvas = document.createElement('canvas'); canvas.width = 1120; canvas.height = 880;
      const ctx = canvas.getContext('2d')!;
      const u = 80;
      ctx.fillStyle = a.floor === 'parquet' ? '#b98c52' : '#c9c1ad'; ctx.fillRect(0, 0, 1120, 880);
      if (a.floor === 'slabs') {
        for (let y = 0; y < 11; y++) for (let x = -1; x < 8; x++) {
          const off = y % 2 ? u : 0, v = 178 + Math.floor(random() * 22);
          ctx.fillStyle = `rgb(${v + 14},${v + 8},${v - 8})`; ctx.fillRect(x * u * 2 + off + 2, y * u + 2, u * 2 - 4, u - 4);
        }
      } else if (a.floor === 'checker') {
        for (let y = 0; y < 11; y++) for (let x = 0; x < 14; x++) { ctx.fillStyle = (x + y) % 2 ? '#4a4a4c' : '#d6d0c0'; ctx.fillRect(x * u, y * u, u, u); }
      } else if (a.floor === 'parquet') {
        for (let y = -2; y < 24; y++) for (let x = -2; x < 30; x++) {
          const v = 150 + Math.floor(random() * 50);
          ctx.fillStyle = `rgb(${v + 40},${v},${v - 60})`;
          ctx.save(); ctx.translate(x * 40 + (y % 2) * 20, y * 40); ctx.rotate((x + y) % 2 ? Math.PI / 4 : -Math.PI / 4); ctx.fillRect(-27, -9, 54, 18); ctx.restore();
        }
      } else {
        for (let i = 0; i < 9000; i++) { const v = 90 + Math.floor(random() * 110); ctx.fillStyle = `rgba(${v},${v - 10},${v - 30},0.7)`; ctx.fillRect(random() * 1120, random() * 880, 3 + random() * 5, 3 + random() * 5); }
        ctx.strokeStyle = '#4f4a44'; ctx.lineWidth = 14; ctx.strokeRect(70, 70, 980, 740);
      }
      // The skylight: a pale pool crossed by the shadows of its glazing bars.
      const glow = closed ? 0.22 : mix(0.5, 0.8, mood.cheer);
      ctx.save(); ctx.translate(575, 505); ctx.rotate(-0.16); ctx.transform(1, 0, mix(-0.5, 0.5, mood.daylight), 1, 0, 0);
      ctx.fillStyle = `rgba(255,${closed ? 252 : 244},${closed ? 250 : 214},${glow})`; ctx.fillRect(-230, -190, 460, 380);
      ctx.fillStyle = `rgba(60,55,50,${glow * 0.45})`;
      for (let i = 1; i < 4; i++) ctx.fillRect(-230 + i * 115 - 5, -190, 10, 380);
      ctx.fillRect(-230, -5, 460, 10);
      ctx.restore();
      if (mood.wear > 0.3) for (let i = 0; i < mood.wear * 500; i++) { ctx.fillStyle = `rgba(90,80,65,${random() * 0.12})`; ctx.beginPath(); ctx.ellipse(random() * 1120, random() * 880, 6 + random() * 28, 4 + random() * 14, random() * 3, 0, 7); ctx.fill(); }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
      const ground = world.ground as THREE.Mesh;
      (ground.material as THREE.MeshStandardMaterial).dispose();
      ground.material = new THREE.MeshStandardMaterial({ map, roughness: a.floor === 'checker' ? 0.35 : 0.75 });
    }

    // Walls with dado, cornice and skirting.
    const H = 4.7;
    s.box([14, H, 0.25], [0, H / 2, -5.45], wall); s.box([0.25, H, 10.9], [-6.95, H / 2, 0], wall);
    s.box([14, 0.22, 0.34], [0, 0.11, -5.38], stone); s.box([0.34, 0.22, 10.9], [-6.88, 0.11, 0], stone);
    s.box([14, 0.1, 0.32], [0, 1.0, -5.38], stone); s.box([0.32, 0.1, 10.9], [-6.88, 1.0, 0], stone);
    s.box([14.2, 0.3, 0.5], [0, H - 0.05, -5.3], stone); s.box([0.5, 0.3, 11.1], [-6.8, H - 0.05, 0], stone);
    s.box([14.1, 0.12, 0.4], [0, H - 0.3, -5.35], shade); s.box([0.4, 0.12, 11], [-6.85, H - 0.3, 0], shade);

    /** A plaster cast for the background: bust, torso, capital, urn or foot, or the lump of one under a sheet. */
    const cast = (kind: number, x: number, y: number, z: number, turn: number, k: number, covered: boolean) => {
      const group = new THREE.Group();
      const put = (mesh: THREE.Mesh, px: number, py: number, pz: number) => { group.add(mesh); mesh.position.set(px, py, pz); return mesh; };
      const tone = [plaster, shade][Math.floor(random() * 1.3)];
      if (covered) {
        const points = [[0, 1.05], [0.16, 1.02], [0.24, 0.88], [0.22, 0.72], [0.36, 0.6], [0.5, 0.42], [0.52, 0.1], [0.56, -0.25 - random() * 0.3]].map(([r, h]) => new THREE.Vector2(r, h));
        const drape = new THREE.Mesh(new THREE.LatheGeometry(points, 14), sheet); drape.scale.set(1, 1, 0.72);
        put(drape, 0, 0, 0);
      } else if (kind === 0) {
        put(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.2, 0], [0.12, 0.08], [0.14, 0.16], [0.44, 0.3], [0.5, 0.5], [0.3, 0.62], [0.13, 0.68], [0.12, 0.8], [0, 0.8]].map(([r, h]) => new THREE.Vector2(r, h)), 16), tone), 0, 0, 0).scale.z = 0.62;
        put(new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), tone), 0, 0.92, 0.02).scale.set(0.85, 1.12, 0.98);
        put(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.06), tone), 0, 0.9, 0.2);
        put(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.05), shade), 0, 0.98, 0.165);
      } else if (kind === 1) {
        put(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.26, 0], [0.3, 0.2], [0.24, 0.45], [0.33, 0.75], [0.36, 0.95], [0.2, 1.05], [0, 1.05]].map(([r, h]) => new THREE.Vector2(r, h)), 16), tone), 0, 0, 0).scale.z = 0.6;
        for (const sgn of [-1, 1]) put(new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), tone), sgn * 0.36, 0.93, 0);
      } else if (kind === 2) {
        put(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 18), tone), 0, 0.25, 0);
        for (let i = 0; i < 12; i++) put(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), shade), Math.sin(i * 0.524) * 0.3, 0.25, Math.cos(i * 0.524) * 0.3);
        put(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.3, 18), tone), 0, 0.65, 0);
        put(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 1.0), tone), 0, 0.86, 0);
      } else if (kind === 3) {
        put(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.1, 0.1], [0.3, 0.4], [0.34, 0.65], [0.18, 0.85], [0.22, 1.0], [0.2, 1.02], [0, 1.02]].map(([r, h]) => new THREE.Vector2(r, h)), 18), tone), 0, 0, 0);
        for (const sgn of [-1, 1]) put(new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 6, 12), tone), sgn * 0.31, 0.72, 0);
      } else {
        put(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), tone), 0, 0.2, 0.1).scale.set(0.24, 0.2, 0.52);
        put(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.5, 12), tone), 0, 0.45, -0.22);
        for (let i = 0; i < 5; i++) put(new THREE.Mesh(new THREE.SphereGeometry(0.06 - i * 0.006, 8, 6), tone), -0.16 + i * 0.08, 0.1, 0.56 - Math.abs(i - 1) * 0.03);
        put(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 1.2), tone), 0, 0, 0.05);
      }
      group.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      group.position.set(x, y, z); group.rotation.y = turn; group.scale.setScalar(k);
      root.add(group);
    };

    // Niches down the left wall, receding from the viewer.
    const emptied = a.state === 'packing';
    [-3.6, -0.9, 1.8, 4.3].forEach((z, i) => {
      s.box([0.1, 2.25, 1.3], [-6.8, 2.2, z], dark);
      const arch = s.cylinder(0.65, 0.65, 0.1, [-6.8, 3.32, z], dark, 24); arch.rotation.z = Math.PI / 2;
      const ring = s.ring(0.7, 0.07, [-6.76, 3.32, z], stone, Math.PI); ring.rotation.y = Math.PI / 2;
      for (const dz of [-0.72, 0.72]) s.box([0.14, 2.3, 0.12], [-6.76, 2.2, z + dz], stone);
      s.box([0.5, 0.12, 1.7], [-6.62, 1.06, z], stone);
      s.label(['CAESAR', 'IGNOTVS', 'No. ' + (20 + i * 7), 'SENECA'][i], 0.9, 0.2, [-6.8, 0.72, z], '#3a342e', '#c9a240').rotation.y = Math.PI / 2;
      const gone = a.casts === 'empty' || (emptied && random() < 0.6);
      if (!gone) cast(a.casts === 'busts' ? 0 : 1 + ((i + Math.floor(random() * 4)) % 4), -6.55, 1.12, z, Math.PI / 2 + (random() - 0.5) * 0.3, a.casts === 'busts' ? 1.55 : 1.35, closed && random() < 0.75);
    });

    // The arched doorway at the far end.
    const dx = -1.2, dw = 2.5, dh = 2.7;
    const through = { enfilade: '#c9c4b6', dark: '#2c2b2e', sheeted: '#2c2b2e', doors: '#5a4330' }[a.doorway];
    const opening = s.material(through, { roughness: 0.95 });
    s.box([dw, dh, 0.1], [dx, dh / 2, -5.3], opening);
    const top = s.cylinder(dw / 2, dw / 2, 0.1, [dx, dh, -5.3], opening, 32); top.rotation.x = Math.PI / 2;
    s.ring(dw / 2 + 0.1, 0.11, [dx, dh, -5.24], stone, Math.PI);
    for (const sgn of [-1, 1]) { s.box([0.26, dh, 0.2], [dx + sgn * (dw / 2 + 0.12), dh / 2, -5.26], stone); s.box([0.36, 0.14, 0.26], [dx + sgn * (dw / 2 + 0.12), dh, -5.24], stone); }
    if (a.doorway === 'enfilade') {
      const tones = ['#b9b3a4', '#dcd7ca', '#f0ece2'];
      tones.forEach((hex, i) => {
        const k = 0.7 - i * 0.2, m = s.material(hex, { roughness: 0.95 });
        s.box([dw * k, dh * k, 0.02], [dx + 0.12 * (i + 1), dh * k / 2, -5.24 + i * 0.012], m);
        const cap = s.cylinder(dw * k / 2, dw * k / 2, 0.02, [dx + 0.12 * (i + 1), dh * k, -5.24 + i * 0.012], m, 24); cap.rotation.x = Math.PI / 2;
      });
    } else if (a.doorway === 'sheeted') {
      for (let i = 0; i < 9; i++) s.box([dw / 9 + 0.01, dh + 0.9 - Math.abs(i - 4) * 0.02, 0.06 + (i % 2) * 0.05], [dx - dw / 2 + (i + 0.5) * dw / 9, (dh + 0.9) / 2, -5.2], i % 2 ? sheet : s.material('#d3cfc4', { roughness: 0.95 }));
    } else if (a.doorway === 'doors') {
      for (const sgn of [-1, 1]) { s.box([dw / 2 - 0.04, dh + 0.9, 0.06], [dx + sgn * dw / 4, (dh + 0.9) / 2, -5.22], s.material('#6b4f36', { roughness: 0.6 })); for (const y of [0.9, 2.1]) s.box([dw / 2 - 0.4, 0.85, 0.03], [dx + sgn * dw / 4, y, -5.18], s.material('#59412c', { roughness: 0.6 })); }
      s.box([dw - 0.1, 0.08, 0.08], [dx, 1.5, -5.14], brass);
    }
    if (WORDS[a.words]) s.label(WORDS[a.words], 4.4, 0.34, [dx, 4.12, -5.3], closed ? '#6f6a60' : '#8a6a2a', '#e9e3d3');

    // Tall plinths with casts either side of the door.
    const tall = (x: number, kind: number) => {
      s.box([1.0, 1.5, 0.9], [x, 0.75, -4.75], stone); s.box([1.12, 0.1, 1.0], [x, 0.05, -4.75], shade); s.box([1.12, 0.1, 1.0], [x, 1.5, -4.75], shade);
      if (!(emptied && random() < 0.5)) cast(kind, x, 1.55, -4.75, (random() - 0.5) * 0.4, 1.5, closed && random() < 0.7);
    };
    tall(-4.6, 1); tall(1.6, a.casts === 'busts' ? 0 : 2); if (mood.density > 0.4) tall(5.9, 3);

    // Pedestals for the cast.
    slots.forEach(([x, z], i) => {
      const h = lifts[i];
      if (!h) return;
      const w = i === 0 ? 1.85 : 1.7;
      s.box([w, h - 0.16, w], [x, h / 2, z], stone);
      s.box([w + 0.14, 0.08, w + 0.14], [x, 0.04, z], shade); s.box([w + 0.1, 0.08, w + 0.1], [x, h - 0.04, z], i === 0 ? plaster : shade);
      if (i === 0) s.label('I', 0.5, 0.2, [x, h * 0.5, z + w / 2 + 0.006], '#3a342e', '#c9a240');
    });

    // What the room is being used for.
    const crate = (x: number, z: number, w: number, h: number, turn: number, open: boolean) => {
      const box = s.box([w, h, w * 0.8], [x, h / 2, z], wood); box.rotation.y = turn;
      for (const y of [0.12, h - 0.12]) s.box([w + 0.04, 0.08, w * 0.8 + 0.04], [x, y, z], s.material('#6f5438', { roughness: 0.8 })).rotation.y = turn;
      if (open) { const straw = s.box([w - 0.1, 0.1, w * 0.8 - 0.1], [x, h, z], s.material('#d8b964', { roughness: 0.95 })); straw.rotation.y = turn; const lid = s.box([w, 0.05, w * 0.8], [x + w * 0.62, h * 0.48, z + 0.1], wood); lid.rotation.set(0, turn, 1.15); }
    };
    if (a.state === 'morning') {
      s.box([2.6, 0.1, 0.55], [0.4, 0.47, 4.55], wood);
      for (const x of [-0.7, 1.5]) s.box([0.1, 0.44, 0.5], [x, 0.22, 4.55], wood);
      for (const [x, z] of [[-1.6, 2.6], [2.0, 2.6]] as const) { s.cylinder(0.16, 0.18, 0.04, [x, 0.02, z], brass, 16); s.cylinder(0.025, 0.025, 0.95, [x, 0.5, z], brass, 10); s.ball([0.05, 0.05, 0.05], [x, 1.0, z], brass, 10); }
      s.tube([[-1.6, 0.92, 2.6], [-0.7, 0.72, 2.66], [0.2, 0.66, 2.68], [1.1, 0.72, 2.66], [2.0, 0.92, 2.6]], 0.028, s.material('#8f1f2a', { roughness: 0.95 }));
    } else if (a.state === 'copying') {
      const n = 2 + Math.round(mood.density * 2);
      for (let i = 0; i < n; i++) {
        const x = -2.2 + i * 1.75 + (random() - 0.5) * 0.4, z = 4.0 + (random() - 0.5) * 0.7 + (i % 2) * 0.3;
        for (const sgn of [-1, 1]) s.rod([x + sgn * 0.3, 0, z + 0.1], [x + sgn * 0.05, 1.7, z - 0.12], 0.025, wood);
        s.rod([x, 0, z - 0.55], [x, 1.65, z - 0.14], 0.025, wood);
        s.box([0.66, 0.04, 0.06], [x, 0.78, z + 0.03], wood);
        const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 160;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#efe9d8'; ctx.fillRect(0, 0, 128, 160); ctx.strokeStyle = 'rgba(40,36,32,0.75)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(64, 62, 26 + random() * 6, 36, 0, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(30, 150); ctx.quadraticCurveTo(40, 108, 56, 98); ctx.moveTo(98, 150); ctx.quadraticCurveTo(90, 108, 72, 98); ctx.moveTo(52, 56); ctx.lineTo(76, 56); ctx.moveTo(64, 56); ctx.lineTo(62, 74); ctx.moveTo(54, 84); ctx.lineTo(74, 84); ctx.stroke();
        const sketch = new THREE.CanvasTexture(canvas); sketch.colorSpace = THREE.SRGBColorSpace;
        const board = s.box([0.6, 0.76, 0.03], [x, 1.2, z - 0.03], new THREE.MeshStandardMaterial({ map: sketch, roughness: 0.9 })); board.rotation.x = -0.14;
        s.cylinder(0.17, 0.17, 0.05, [x + 0.15, 0.48, z + 0.75], wood, 14);
        for (let l = 0; l < 3; l++) s.rod([x + 0.15 + Math.sin(l * 2.1) * 0.15, 0, z + 0.75 + Math.cos(l * 2.1) * 0.15], [x + 0.15 + Math.sin(l * 2.1) * 0.08, 0.46, z + 0.75 + Math.cos(l * 2.1) * 0.08], 0.018, wood);
      }
    } else if (closed) {
      s.cylinder(0.2, 0.22, 0.04, [-0.9, 0.02, 4.4], dark, 16); s.cylinder(0.02, 0.02, 1.25, [-0.9, 0.64, 4.4], dark, 8);
      s.label('GALLERY CLOSED', 0.9, 0.42, [-0.9, 1.35, 4.4], '#efe9d8', '#7a2a2a');
      for (const dxl of [0, 0.5]) s.rod([5.3 + dxl, 0, -4.3], [5.3 + dxl, 3.3, -5.2], 0.03, wood);
      for (let i = 0; i < 9; i++) s.rod([5.3, 0.3 + i * 0.35, -4.38 - i * 0.095], [5.8, 0.3 + i * 0.35, -4.38 - i * 0.095], 0.02, wood);
      crate(5.6, 0.6, 1.0, 0.8, 0.2, false);
      if (mood.density > 0.4) crate(5.9, 2.0, 0.7, 0.6, -0.3, false);
      const heap = s.ball([0.7, 0.14, 0.5], [-5.4, 0.1, 4.5], sheet, 12); heap.rotation.y = 0.5;
    } else {
      crate(5.5, 0.9, 1.1, 0.9, 0.15, true); crate(-5.5, 4.6, 0.9, 0.7, -0.25, true);
      if (mood.density > 0.35) crate(5.9, -1.4 + 2.6, 0.7, 0.55, 0.5, false);
      const red = s.material('#b3262b', { metalness: 0.4, roughness: 0.5 });
      for (const x of [1.4, 1.84]) { s.rod([x, 0.1, 4.8], [x, 1.35, 4.5], 0.022, red); const wheel = s.cylinder(0.13, 0.13, 0.06, [x + (x < 1.6 ? -0.08 : 0.08), 0.13, 4.78], dark, 16); wheel.rotation.z = Math.PI / 2; }
      s.rod([1.4, 1.35, 4.5], [1.84, 1.35, 4.5], 0.022, red); s.box([0.5, 0.02, 0.32], [1.62, 0.02, 4.98], red);
      const strawBits = Array.from({ length: 70 }, () => ({ at: [(random() - 0.5) * 12, 0.02, (random() - 0.5) * 9] as [number, number, number], size: 0.6 + random() }));
      s.scatter(new THREE.BoxGeometry(0.16, 0.012, 0.014), s.material('#d8b964', { roughness: 0.95 }), strawBits);
    }

    // Lift the cast onto its pedestals once the stage has placed and framed it.
    const place = world.place.bind(world);
    world.place = (items) => {
      place(items);
      items.forEach((item, index) => { item.holder.position.y += lifts[index % lifts.length]; item.holder.updateMatrixWorld(true); });
    };
    return world;
  },
});
