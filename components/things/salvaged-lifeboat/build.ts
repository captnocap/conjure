import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];
const NAMES = {
  promise: 'OCEAN PROMISE', stella: 'STELLA MARIS', harvest: 'GOLDEN HARVEST', trader: 'PACIFIC TRADER', star: 'NORTHERN STAR',
  renamed: 'The ship\'s name roughly painted out and a new owner\'s name, RAJU, brushed over it.',
  scraped: 'Scraped off: only pale ghosts of letters.',
} as const;

export default defineThing({
  questions: {
    type: choice('What kind of lifeboat is it?', {
      enclosed: 'A fully enclosed orange capsule with a hatch, small windows and a steering cupola.',
      freefall: 'A long pointed free-fall lifeboat, enclosed, built to dive off a stern ramp.',
      wooden: 'An old open wooden boat, clinker planked, white with a coloured top strake.',
      open: 'An open fibreglass boat with bench thwarts and grab lines.',
    }),
    use: choice('What is it used for now?', {
      tea: 'A tea stall: an awning off its side, a plank counter, kettle on a stove, a bench.',
      shelter: 'Someone lives in it: a tarpaulin lean-to, washing on a line, a cooking fire.',
      planter: 'A garden: filled or hung with soil, gourd vines and marigolds.',
      sale: 'For sale: up on oil drums with a painted board and a string of flags.',
      fishing: 'Gone back to sea as a fishing boat: nets, floats, an outboard, oars.',
      untouched: 'Nothing yet: lying heeled over where the tractor left it, tow rope still on.',
    }),
    name: choice('What ship name is on its side?', NAMES),
    paint: choice('What colour is it now?', {
      original: 'Its original paint: safety orange, or white if wooden.',
      blue: 'Repainted with household sky blue.',
      green: 'Repainted mosque green.',
      pink: 'Repainted a cheerful pink.',
      bleached: 'Sun-bleached almost to cream, chalky to the touch.',
    }),
    open: noul('Is its hatch open (or, on an open boat, its canvas cover pulled off)?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const closed = a.type === 'enclosed' || a.type === 'freefall';
    const L = { enclosed: 7.2, freefall: 8.6, wooden: 7.4, open: 6.8 }[a.type];
    const B = { enclosed: 2.7, freefall: 2.6, wooden: 2.3, open: 2.5 }[a.type];
    const depth = { enclosed: 1.15, freefall: 1.3, wooden: 0.95, open: 1.05 }[a.type];
    const canopyH = { enclosed: 1.35, freefall: 1.7, wooden: 0, open: 0 }[a.type];
    const base = a.paint === 'original' ? (a.type === 'wooden' ? '#ece7da' : '#e8621c') : { blue: '#5aa2d6', green: '#2f8a5a', pink: '#e58aa4', bleached: '#e6d2b8' }[a.paint];
    const trim = a.type === 'wooden' ? ['#2b5c9a', '#2e7a52', '#a8322a'][Math.floor(random() * 3)] : '#2a2c30';

    const plan = (u: number) => {
      if (a.type === 'enclosed' || a.type === 'open') return Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), a.type === 'open' ? 2.3 : 2.8)), 0.55);
      if (a.type === 'wooden') return u < 0.3 ? mix(0.72, 1, Math.sin((u / 0.3) * Math.PI / 2)) : Math.pow(Math.max(0, 1 - Math.pow((u - 0.3) / 0.7, 2.1)), 0.62);
      return u < 0.3 ? mix(0.82, 1, Math.sin((u / 0.3) * Math.PI / 2)) : Math.pow(Math.max(0, 1 - Math.pow((u - 0.3) / 0.7, 1.7)), 0.8);
    };
    const keelY = (u: number) => depth * 0.5 * Math.pow(Math.abs(2 * u - 1), 3) * (a.type === 'freefall' && u < 0.5 ? 0.3 : 1);
    const sheerY = (u: number) => depth + depth * 0.14 * Math.pow(Math.abs(2 * u - 1), 2);
    const roof = (u: number) => {
      if (a.type === 'enclosed') return canopyH * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 4)), 0.5);
      return canopyH * (u < 0.3 ? 1 : Math.pow(Math.max(0, 1 - Math.pow((u - 0.3) / 0.7, 2.4)), 0.7));
    };
    const point = (u: number, phi: number, shrink = 1): P3 => {
      const c = Math.cos(phi), sn = Math.sin(phi), hb = (B / 2) * plan(u) * shrink;
      const z = hb * Math.sign(c) * Math.pow(Math.abs(c), 0.62);
      const y = sn < 0 ? sheerY(u) - (sheerY(u) - keelY(u)) * shrink * Math.pow(-sn, a.type === 'wooden' ? 1.1 : 0.75) : sheerY(u) + roof(u) * shrink * Math.pow(sn, 0.8);
      return [(u - 0.5) * L, y, z];
    };
    const NU = 34, NV = closed ? 30 : 16;
    const phiOf = (v: number) => (closed ? -Math.PI / 2 + v * Math.PI * 2 : -Math.PI + v * Math.PI);
    const loft = (shrink: number) => {
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      for (let i = 0; i <= NU; i++)
        for (let j = 0; j <= NV; j++) {
          const u = i / NU, v = j / NV;
          positions.push(...point(u, phiOf(v), shrink));
          uvs.push(u, v);
        }
      const row = NV + 1;
      for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const p = i * row + j; index.push(p, p + row, p + 1, p + 1, p + row, p + row + 1); }
      // Transoms.
      for (const i of [0, NU]) {
        const centre = positions.length / 3;
        positions.push((i / NU - 0.5) * L, (keelY(i / NU) + sheerY(i / NU)) / 2 + roof(i / NU) * 0.4, 0);
        uvs.push(i / NU, closed ? 0.02 : 0.52);
        for (let j = 0; j < NV; j++) index.push(centre, i * row + j, i * row + j + 1);
        if (!closed) index.push(centre, i * row + NV, i * row);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      return geometry;
    };

    // Paint: one canvas, each side drawn in its own upright frame of 1024 × 256 (top of boat at y = 0).
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1024, 512);
    const hatchU = a.type === 'freefall' ? 0.1 : 0.44;
    for (const side of [1, -1]) {
      ctx.save();
      if (closed) { if (side > 0) ctx.setTransform(1, 0, 0, 1, 0, 256); else ctx.setTransform(-1, 0, 0, -1, 1024, 256); }
      else if (side < 0) ctx.setTransform(-1, 0, 0, -1, 1024, 512);
      const sheer = closed ? 128 : 0;
      const U = (u: number) => (side > 0 ? u : 1 - u) * 1024;
      // Bottom, boot line and sun.
      ctx.fillStyle = a.type === 'wooden' ? '#8a3a2c' : 'rgba(60,40,30,0.25)';
      ctx.fillRect(0, 225, 1024, 31);
      if (a.type === 'wooden') {
        ctx.fillStyle = trim; ctx.fillRect(0, 0, 1024, 30);
        ctx.strokeStyle = 'rgba(40,30,20,0.45)'; ctx.lineWidth = 2;
        for (let y = 30; y < 256; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); }
      } else {
        ctx.fillStyle = trim; ctx.fillRect(0, sheer - 5, 1024, 12);
        // Grab line scallops and retro-reflective tape.
        ctx.strokeStyle = '#f0ece0'; ctx.lineWidth = 3;
        for (let x = 60; x < 960; x += 90) { ctx.beginPath(); ctx.arc(x + 45, sheer + 14, 46, 0.25, Math.PI - 0.25); ctx.stroke(); }
        ctx.fillStyle = '#dfe3e6';
        if (closed) for (let x = 90; x < 980; x += 150) { ctx.fillRect(x, 6, 34, 10); ctx.fillRect(x + 40, sheer - 26, 10, 18); }
      }
      if (closed) {
        // Windows forward (or in the cupola aft for a free-fall boat) and the side hatch.
        ctx.fillStyle = '#18222b';
        if (a.type === 'enclosed') for (const u of [0.66, 0.73, 0.8]) ctx.fillRect(U(u) - 18, 60, 36, 22);
        else for (const u of [0.3, 0.4, 0.5, 0.6]) { ctx.beginPath(); ctx.arc(U(u), 62, 11, 0, 7); ctx.fill(); }
        const hx = U(hatchU + 0.055) - 0.055 * 1024, hw = 0.11 * 1024;
        ctx.fillStyle = a.open ? '#0f0d0c' : base;
        ctx.strokeStyle = '#2a2c30'; ctx.lineWidth = 4;
        ctx.fillRect(hx, 34, hw, 86); ctx.strokeRect(hx, 34, hw, 86);
      }
      // Name, port and capacity.
      const text = (label: string, u: number, y: number, size: number, colour: string, alpha = 1, font = 'bold') => {
        ctx.globalAlpha = alpha; ctx.fillStyle = colour; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${font} ${size}px sans-serif`;
        ctx.fillText(label, U(u), y, closed ? 290 : 420);
        ctx.globalAlpha = 1;
      };
      const ink = a.paint === 'blue' || a.paint === 'green' ? '#f2efe2' : '#1c1d20';
      const fade = mix(1, 0.5, mood.wear), nameY = closed ? 102 : 110, nameU = side > 0 ? 0.76 : 0.24;
      if (a.name === 'scraped') text('OCEAN PROMISE', nameU, nameY, 40, ink, 0.16);
      else if (a.name === 'renamed') {
        ctx.fillStyle = 'rgba(150,150,145,0.8)'; ctx.fillRect(U(nameU) - 150, nameY - 20, 300, 40);
        text('RAJU', nameU, nameY, closed ? 40 : 54, '#fdf8e8', 1, 'italic bold');
      } else { text(NAMES[a.name], nameU, nameY, closed ? 34 : 40, ink, fade); if (!closed) text('MONROVIA', nameU, nameY + 36, 20, ink, fade * 0.9); }
      text(a.type === 'wooden' ? 'No. 2' : `${a.type === 'freefall' ? 26 : 32} PERS`, side > 0 ? (a.type === 'freefall' ? 0.36 : 0.2) : (a.type === 'freefall' ? 0.64 : 0.8), nameY, 26, ink, fade);
      // Weather.
      for (let i = 0; i < 14 + mood.wear * 60; i++) {
        const x = random() * 1024, y = random() * 200, len = 20 + random() * 80;
        const g = ctx.createLinearGradient(0, y, 0, y + len);
        g.addColorStop(0, `rgba(${a.type === 'wooden' ? '120,90,60' : '110,60,30'},${0.25 + mood.wear * 0.3})`); g.addColorStop(1, 'rgba(110,60,30,0)');
        ctx.fillStyle = g; ctx.fillRect(x, y, 3 + random() * 8, len);
      }
      ctx.fillStyle = `rgba(245,240,225,${0.08 + mood.wear * 0.22})`;
      ctx.fillRect(0, 0, 1024, closed ? 110 : 60);
      ctx.restore();
    }
    const skin = new THREE.CanvasTexture(canvas);
    skin.colorSpace = THREE.SRGBColorSpace;
    skin.anisotropy = 4;

    const boat = new THREE.Group();
    const add = (mesh: THREE.Mesh) => { boat.add(mesh); return mesh; };
    const hull = add(s.mesh(loft(1), new THREE.MeshStandardMaterial({ map: skin, roughness: mix(0.45, 0.9, mood.wear), side: THREE.DoubleSide })));
    void hull;
    const dark = s.material('#2a2c30');
    const timber = s.material('#8a6540', { roughness: 0.95 });
    const insideColour = a.type === 'wooden' ? '#a07448' : '#cfcabb';
    const sideZ = (u: number, h: number) => point(u, closed ? 0.35 : -0.02)[2] * h;
    if (!closed) {
      add(s.mesh(loft(0.955), s.material(insideColour, { side: THREE.DoubleSide, roughness: 0.9 })));
      for (const side of [1, -1]) add(s.tube(Array.from({ length: 15 }, (_u, i) => { const u = 0.01 + (i / 14) * 0.98, p = point(u, side > 0 ? 0 : Math.PI); return [p[0], p[1] + 0.02, p[2]] as P3; }), 0.045, s.material(a.type === 'wooden' ? '#6b4a30' : trim)));
      for (const u of [0.2, 0.36, 0.52, 0.68, 0.82]) add(s.box([0.26, 0.04, B * plan(u) * 0.93], [(u - 0.5) * L, sheerY(u) - 0.3, 0], s.material(a.type === 'wooden' ? '#8a6540' : '#b9b4a4')));
      add(s.box([0.05, depth * 0.9, 0.3], [-L / 2 - 0.05, depth * 0.62, 0], s.material(a.type === 'wooden' ? '#6b4a30' : '#8f9296')));
      add(s.box([0.06, depth + 0.25, 0.06], [L / 2 - 0.06, depth * 0.72, 0], s.material('#6b4a30')));
      if (!a.open && a.use !== 'planter' && a.use !== 'fishing') {
        const positions: number[] = [], index: number[] = [];
        const from = 0.06, to = 0.8;
        for (let i = 0; i <= 14; i++) {
          const u = mix(from, to, i / 14), z = (B / 2) * plan(u) * 1.03, y = sheerY(u) + 0.03;
          positions.push((u - 0.5) * L, y, z, (u - 0.5) * L, y + 0.22 - (i % 2) * 0.08, 0, (u - 0.5) * L, y, -z);
          if (i < 14) { const p = i * 3; index.push(p, p + 3, p + 1, p + 1, p + 3, p + 4, p + 1, p + 4, p + 2, p + 2, p + 4, p + 5); }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(index);
        geometry.computeVertexNormals();
        add(s.mesh(geometry, s.material(a.type === 'wooden' ? '#b9a06a' : '#d9742e', { side: THREE.DoubleSide, roughness: 1 })));
      }
    } else {
      // Cupola, lifting hooks, rudder and propeller guard, and the hatch door.
      const cu = a.type === 'enclosed' ? 0.2 : 0.16, cy = sheerY(cu) + roof(cu);
      add(s.box([0.95, 0.5, 0.95], [(cu - 0.5) * L, cy + 0.12, 0], s.material(base)));
      add(s.box([0.97, 0.2, 0.8], [(cu - 0.5) * L, cy + 0.2, 0], s.material('#18222b', { roughness: 0.2 })));
      add(s.box([0.8, 0.2, 0.97], [(cu - 0.5) * L, cy + 0.2, 0], s.material('#18222b', { roughness: 0.2 })));
      if (a.type === 'enclosed') for (const u of [0.1, 0.9]) add(s.ring(0.13, 0.035, [(u - 0.5) * L, sheerY(u) + roof(u) + 0.12, 0], dark));
      else for (const z of [-0.5, 0.5]) add(s.box([L * 0.5, 0.08, 0.1], [-L * 0.1, keelY(0.4) - 0.02, z], dark));
      add(s.box([0.05, 0.75, 0.42], [-L / 2 - 0.06, depth * 0.45, 0], dark));
      add(s.ring(0.3, 0.035, [-L / 2 + 0.25, 0.42, 0], dark)).rotation.y = Math.PI / 2;
      if (a.open) {
        const hx = (hatchU + 0.055 - 0.5) * L, hz = sideZ(hatchU + 0.055, 1);
        const door = add(s.box([L * 0.1, 0.85, 0.05], [hx + L * 0.1, sheerY(0.5) + 0.55, hz + 0.18], s.material(base)));
        door.rotation.y = -0.7 - random() * 0.5;
      }
    }

    // How it sits.
    const heel = a.use === 'untouched' ? 0.26 + random() * 0.2 : (random() - 0.5) * 0.06;
    const lift = a.use === 'sale' ? 0.88 : 0.02;
    boat.rotation.x = heel;
    boat.rotation.z = a.use === 'untouched' ? (random() - 0.5) * 0.1 : 0;
    s.root.add(boat);
    boat.updateMatrixWorld(true);
    boat.position.y = lift - new THREE.Box3().setFromObject(boat).min.y;
    const top = lift + depth + canopyH, half = B / 2;
    const iron = s.material('#3a3632', { metalness: 0.4 });
    const bamboo = s.material('#c9a85c');
    const cloths = ['#c2452f', '#3d6fa3', '#d8b23a', '#3f8a5a', '#e8e2d0', '#8a4a8f', '#e58aa4'];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    if (a.use === 'sale') {
      for (const u of [0.22, 0.52, 0.8]) {
        const drum = s.cylinder(0.29, 0.29, 0.88, [(u - 0.5) * L, 0.44, 0], s.material(pick(['#2f5d8a', '#a8452f', '#3d7a5a']), { metalness: 0.3 }), 18);
        for (const y of [0.15, 0.73]) s.ring(0.295, 0.012, [(u - 0.5) * L, y, 0], iron).rotation.x = Math.PI / 2;
        void drum;
      }
      s.box([0.08, 1.9, 0.08], [L * 0.2, 0.95, half + 1.2], timber);
      s.label('FOR SALE', 1.5, 0.5, [L * 0.2, 1.75, half + 1.25], '#b3261f', '#f3eedd');
      s.label(pick(['₹ 85,000', 'CALL 98250', 'BEST PRICE']), 1.2, 0.3, [L * 0.2, 1.3, half + 1.25], '#1c1d20', '#f3eedd');
      const a0: P3 = [-L / 2, top + 0.4, 0], a1: P3 = [L * 0.2, 1.95, half + 1.2];
      s.rod(a0, a1, 0.01, iron);
      s.rod([-L / 2, lift + depth, 0], a0, 0.03, bamboo);
      for (let i = 1; i < 10; i++) {
        const f = i / 10, flag = s.box([0.24, 0.3, 0.01], [mix(a0[0], a1[0], f), mix(a0[1], a1[1], f) - 0.17, mix(a0[2], a1[2], f)], s.material(pick(cloths), { side: THREE.DoubleSide }));
        flag.rotation.y = Math.atan2(a1[0] - a0[0], a1[2] - a0[2]) + Math.PI / 2;
      }
    } else if (a.use !== 'untouched') {
      for (const u of [0.25, 0.75]) for (const side of [1, -1]) s.box([0.5, 0.26, 0.3], [(u - 0.5) * L, 0.13, side * half * 0.62], timber).rotation.y = random() * 0.4;
    }
    if (a.use === 'untouched') {
      const rope = s.material('#b89f6a', { roughness: 1 });
      s.tube([[L / 2 - 0.1, depth * 0.8, 0.2], [L / 2 + 0.7, 0.05, 0.5], [L / 2 + 1.6, 0.04, 0.1 + random()], [L / 2 + 2.4, 0.04, 0.9], [L / 2 + 3.1, 0.04, 0.4]], 0.035, rope);
      for (const u of [0.3, 0.7]) s.box([0.22, 0.14, B * 1.3], [(u - 0.5) * L, 0.07, 0.2], timber).rotation.y = (random() - 0.5) * 0.3;
    }
    if (a.use === 'tea') {
      const z0 = half + 0.15, z1 = half + 1.9;
      const awning = s.material(pick(['#3d6fa3', '#c2452f', '#d8b23a', '#3f8a5a']), { side: THREE.DoubleSide, roughness: 1 });
      const hi = Math.max(top + 0.15, 2.35), lo = 2.0;
      for (const x of [-1.4, 1.4]) { s.rod([x, 0, z1], [x, lo, z1], 0.035, bamboo); s.rod([x, closed ? top - 0.4 : 0, z0 - 0.5], [x, hi, z0 - 0.5], 0.035, bamboo); }
      const cover = s.box([3.0, 0.02, Math.hypot(z1 - z0 + 0.7, hi - lo)], [0, (hi + lo) / 2 + 0.02, (z0 - 0.5 + z1 + 0.2) / 2], awning);
      cover.rotation.x = Math.atan2(hi - lo, z1 - z0 + 0.7);
      s.label(pick(['CHAI', 'TEA STALL', 'TEA ₹10']), 1.5, 0.34, [0, lo - 0.2, z1 + 0.03], '#f3eedd', '#b3261f');
      s.box([2.3, 0.05, 0.5], [0, 0.85, z0 + 0.75], timber);
      for (const x of [-1, 1]) s.box([0.08, 0.85, 0.4], [x, 0.42, z0 + 0.75], timber);
      const kettle = s.material('#9a9ea0', { metalness: 0.6, roughness: 0.35 });
      s.box([0.3, 0.16, 0.3], [-0.75, 0.96, z0 + 0.75], iron);
      s.box([0.2, 0.02, 0.2], [-0.75, 1.045, z0 + 0.75], new THREE.MeshStandardMaterial({ color: '#ff8a3a', emissive: '#ff5a1a', emissiveIntensity: 1.6 }));
      s.lathe([[0.001, 0], [0.13, 0], [0.15, 0.1], [0.1, 0.2], [0.03, 0.23]], kettle, [-0.75, 1.06, z0 + 0.75]);
      s.rod([-0.62, 1.16, z0 + 0.75], [-0.48, 1.26, z0 + 0.75], 0.015, kettle);
      s.scatter(new THREE.CylinderGeometry(0.03, 0.022, 0.08, 8), new THREE.MeshStandardMaterial({ color: '#c98a4a', roughness: 0.2 }), Array.from({ length: 5 + Math.floor(mood.density * 8) }, (_u, i) => ({ at: [-0.2 + (i % 6) * 0.11, 0.92, z0 + 0.65 + Math.floor(i / 6) * 0.12] as P3, size: 1 })));
      s.cylinder(0.11, 0.09, 0.2, [0.85, 0.98, z0 + 0.8], s.material('#e9e4d2'), 12);
      s.box([1.9, 0.05, 0.28], [0.2, 0.42, z1 + 0.5], timber).rotation.y = 0.1;
      for (const x of [-0.6, 1.0]) s.box([0.2, 0.42, 0.24], [x, 0.21, z1 + 0.5 - x * 0.1], s.material('#a5553a'));
    }
    if (a.use === 'shelter') {
      const tarp = s.material(pick(['#2f6fc0', '#3d7a5a', '#b9a06a']), { side: THREE.DoubleSide, roughness: 0.9 });
      const z0 = closed ? half * 0.55 : -half * 0.4, y0 = closed ? top - 0.15 : top + 1.0, z1 = half + (closed ? 2.1 : 1.5), tx = closed ? 0 : -L * 0.18;
      if (!closed) for (const x of [-1.3, 1.3]) s.rod([tx + x, lift + 0.3, z0], [tx + x, y0, z0], 0.04, bamboo);
      const sheet = s.box([closed ? 3.6 : 2.8, 0.02, Math.hypot(z1 - z0, y0 - 0.5)], [tx, (y0 + 0.5) / 2, (z0 + z1) / 2], tarp);
      sheet.rotation.x = Math.atan2(y0 - 0.5, z1 - z0);
      for (const x of [-1.3, 1.3]) { s.rod([tx + x, 0, z1], [tx + x, 0.55, z1], 0.035, bamboo); s.rod([tx + x, 0.5, z1], [tx + x * 1.1, 0, z1 + 0.6], 0.008, iron); }
      const p0: P3 = [L / 2 - 0.2, top + 0.5, 0], p1: P3 = [L / 2 + 2.4, 1.9, 0.6];
      s.rod([p0[0], lift + depth * 0.5, 0], p0, 0.035, bamboo);
      s.rod([p1[0], 0, p1[2]], [p1[0], p1[1] + 0.1, p1[2]], 0.04, bamboo);
      s.rod(p0, p1, 0.008, iron);
      for (let i = 1; i < 6; i++) {
        const f = i / 6.5 + 0.05, h = 0.4 + random() * 0.5;
        s.box([0.36 + random() * 0.2, h, 0.015], [mix(p0[0], p1[0], f), mix(p0[1], p1[1], f) - h / 2 - 0.02, mix(p0[2], p1[2], f)], s.material(pick(cloths), { side: THREE.DoubleSide, roughness: 1 })).rotation.y = 0.22;
      }
      for (let i = 0; i < 3; i++) s.ball([0.1, 0.08, 0.1], [L * 0.3 + Math.cos(i * 2.1) * 0.17, 0.07, half + 1 + Math.sin(i * 2.1) * 0.17], s.material('#6b655c'), 8);
      s.ball([0.07, 0.03, 0.07], [L * 0.3, 0.06, half + 1], new THREE.MeshStandardMaterial({ color: '#ff8a3a', emissive: '#ff5a1a', emissiveIntensity: 1.8 }), 8);
      s.lathe([[0.001, 0], [0.13, 0.02], [0.17, 0.12], [0.13, 0.2], [0.15, 0.22]], s.material('#2a2623', { metalness: 0.4 }), [L * 0.3, 0.14, half + 1]);
      s.cylinder(0.28, 0.28, 0.9, [-L * 0.32, 0.45, half + 0.6], s.material('#2f6fc0'), 16);
      if (closed) { s.rod([-L * 0.1, top - 0.2, -0.3], [-L * 0.1, top + 0.9, -0.3], 0.06, iron); }
    }
    if (a.use === 'planter') {
      const leaf = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
      const greens = ['#3f7a3a', '#5a9a3f', '#2f6a44', '#7aa84a'], blooms = ['#f2a01e', '#f6c62a', '#e8621c'];
      const points: { at: P3; size: number; color: string }[] = [];
      const n = 60 + Math.floor(mood.density * 90);
      if (!closed) {
        const positions: number[] = [], index: number[] = [];
        for (let i = 0; i <= 16; i++) {
          const u = 0.04 + (i / 16) * 0.92, z = (B / 2) * plan(u) * 0.93, y = lift + sheerY(u) - 0.18;
          positions.push((u - 0.5) * L, y, z, (u - 0.5) * L, y + 0.08, 0, (u - 0.5) * L, y, -z);
          if (i < 16) { const p = i * 3; index.push(p, p + 3, p + 1, p + 1, p + 3, p + 4, p + 1, p + 4, p + 2, p + 2, p + 4, p + 5); }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(index);
        geometry.computeVertexNormals();
        s.mesh(geometry, s.material('#4a3526', { side: THREE.DoubleSide, roughness: 1 }));
        for (let i = 0; i < n; i++) {
          const u = 0.08 + random() * 0.84, z = (random() - 0.5) * B * plan(u) * 0.85, tall = random() ** 2;
          const bloom = random() < 0.3 + mood.cheer * 0.3;
          points.push({ at: [(u - 0.5) * L, lift + sheerY(u) - 0.05 + tall * 0.9 + (bloom ? 0.12 : 0), z], size: bloom ? 0.07 + random() * 0.05 : 0.12 + random() * 0.2, color: bloom ? pick(blooms) : pick(greens) });
          if (tall > 0.35) s.rod([(u - 0.5) * L, lift + sheerY(u) - 0.1, z], [(u - 0.5) * L, lift + sheerY(u) + tall * 0.9, z], 0.012, s.material('#5a7a3a'));
        }
      } else {
        for (let i = 0; i < n; i++) {
          const u = 0.12 + random() * 0.76, phi = 0.25 + random() * (Math.PI - 0.5), p = point(u, phi, 1.03);
          const bloom = random() < 0.15 + mood.cheer * 0.25;
          points.push({ at: [p[0], p[1] + boat.position.y, p[2]], size: bloom ? 0.08 : 0.12 + random() * 0.14, color: bloom ? pick(blooms) : pick(greens) });
        }
        for (let v = 0; v < 3; v++) s.tube(Array.from({ length: 8 }, (_u, i) => { const p = point(0.25 + v * 0.22 + Math.sin(i) * 0.03, -0.25 + (i / 7) * 3.2, 1.02); return [p[0], Math.max(0.03, p[1] + boat.position.y), p[2]] as P3; }), 0.025, s.material('#4a6a34'));
      }
      for (let i = 0; i < 5; i++) {
        const x = (random() - 0.5) * L * 0.8, z = half + 0.35 + random() * 0.5;
        s.cylinder(0.15, 0.11, 0.24, [x, 0.12, z], s.material(pick(['#b26148', '#8f9296', '#2f6fc0'])), 12);
        points.push({ at: [x, 0.38, z], size: 0.2, color: pick(greens) }, { at: [x + 0.08, 0.5, z], size: 0.07, color: pick(blooms) });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), leaf, points);
    }
    if (a.use === 'fishing') {
      const net = s.material('#2f5a5a', { roughness: 1 });
      const heapX = closed ? L * 0.1 : -L * 0.12, heapY = closed ? 0 : lift + depth - 0.25, heapZ = closed ? half + 1.0 : 0;
      for (let i = 0; i < 6; i++) s.ball([0.5 + random() * 0.4, 0.22 + random() * 0.15, 0.4 + random() * 0.3], [heapX + (random() - 0.5) * 1.4, heapY + 0.15 + random() * 0.15, heapZ + (random() - 0.5) * 0.6], net, 10);
      s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff' }), Array.from({ length: 16 }, () => ({ at: [heapX + (random() - 0.5) * 1.8, heapY + 0.36 + random() * 0.15, heapZ + (random() - 0.5) * 0.8] as P3, size: 0.07, color: pick(['#e8621c', '#f3eedd', '#f6c62a']) })));
      s.box([0.32, 0.45, 0.28], [-L / 2 - 0.25, lift + depth + 0.3, 0], s.material('#2a2c30'));
      s.box([0.36, 0.12, 0.3], [-L / 2 - 0.25, lift + depth + 0.56, 0], s.material('#c8281f'));
      s.rod([-L / 2 - 0.25, lift + depth + 0.1, 0], [-L / 2 - 0.3, lift + 0.1, 0], 0.045, s.material('#8f9296'));
      for (const side of [1, -1]) {
        const y = closed ? 0.06 : lift + depth + 0.1, z = closed ? side * 0.2 + half + 2 : side * half * 0.5;
        s.rod([-L * 0.3, y, z], [L * 0.2, y + (closed ? 0 : 0.25), z * 1.3], 0.03, timber);
        s.box([0.6, 0.02, 0.16], [L * 0.2 + 0.3, y + (closed ? 0 : 0.28), z * 1.3], timber);
      }
      s.rod([L / 2 - 0.3, lift + depth, 0], [L / 2 - 0.3, lift + depth + 2.6, 0], 0.03, bamboo);
      s.box([0.6, 0.4, 0.01], [L / 2 - 0.62, lift + depth + 2.35, 0], s.material(pick(cloths), { side: THREE.DoubleSide }));
    }
    void clamp01;
    return s.finish({ footprint: L * 0.5 });
  },
});
