import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const FINISH = {
  cream: 'Cream enamelled steel.',
  eau: 'Pale green enamelled steel.',
  grey: 'Battleship grey paint.',
  slate: 'Polished black slate with brass fittings, a Victorian switchboard.',
  navy: 'Deep navy blue with brass, a ship or a locomotive.',
} as const;
const FINISH_HEX: Record<keyof typeof FINISH, string> = { cream: '#e4dbbf', eau: '#b9cfba', grey: '#8d979b', slate: '#2a2d30', navy: '#27405e' };
const TITLES = { boiler: 'BOILER No 2', reactor: 'PRIMARY LOOP', ship: 'ENGINE ROOM', water: 'PUMPING STATION', chemical: 'STILL HOUSE' } as const;

function painted(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    needles: choice('Where are the needles?', {
      green: 'All resting steadily in the green band: a healthy plant.',
      drifting: 'Scattered: most normal, a couple creeping up into the amber.',
      pinned: 'Pinned hard against the top stop, deep in the red.',
      zero: 'All lying dead at zero: cold, shut down, or nothing left to measure.',
      disagree: 'Two gauges agree and the third says something terrible. Which one is lying?',
    }),
    plant: choice('What does the painted mimic diagram show?', {
      boiler: 'A boiler: furnace, steam drum, feed pump and chimney stack.',
      reactor: 'A reactor loop: pressure vessel, steam generator, pump, turbine.',
      ship: 'A ship in profile with its tanks, engine and propeller shaft.',
      water: 'A waterworks: reservoir, pumps, filter beds and a water tower.',
      chemical: 'A still house: a tall column, vats and a condenser coil.',
    }),
    levels: score('How full are the glass level indicators?', ['Empty, the glass dry', 'Low, near the red line', 'Half', 'High', 'Brimming at the very top']),
    faces: choice('What are the gauge faces like?', {
      white: 'White faces with black figures in black bezels, modern and legible.',
      black: 'Black faces with pale figures in chrome bezels, wartime.',
      ivory: 'Yellowed ivory faces in heavy brass bezels, Victorian.',
    }),
    finish: choice('What is the panel made of?', FINISH),
    span: choice('How wide is the panel?', {
      single: 'One flat bay.',
      triptych: 'A centre bay with two angled wings, a three-part instrument wall.',
      tall: 'A narrow tall bay crowned with one huge master gauge.',
    }),
    tell: choice('What small sign of trouble does it carry?', {
      none: 'None: clean and cared for.',
      cracked: 'One big gauge has cracked glass crossed with tape.',
      tagged: 'A red danger tag hangs from a gauge and another from a valve wheel.',
      missing: 'One gauge has been removed, leaving a dark hole and a capped pipe.',
      leak: 'A rusty weep runs down the panel from a fitting to a puddle on the floor.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const brassy = a.finish === 'slate' || a.finish === 'navy' || a.faces === 'ivory';
    const steel = s.material(FINISH_HEX[a.finish], { roughness: a.finish === 'slate' ? 0.25 : 0.5, metalness: 0.15 });
    const dark = s.material('#1d2022', { roughness: 0.6 });
    const bezel = brassy ? s.material('#b8913f', { metalness: 0.85, roughness: 0.3 }) : a.faces === 'black' ? s.material('#cfd3d4', { metalness: 0.85, roughness: 0.25 }) : s.material('#202325', { roughness: 0.4 });
    const pipeMetal = brassy ? s.material('#a9772f', { metalness: 0.8, roughness: 0.35 }) : s.material('#9aa2a4', { metalness: 0.7, roughness: 0.35 });
    const redPaint = s.material('#c4281c', { roughness: 0.5 });
    const needlePaint = s.material(a.faces === 'black' ? '#f2ead0' : '#b3221a', { roughness: 0.5 });
    const [faceHex, inkHex] = { white: ['#f4f0e2', '#1d2022'], black: ['#17191b', '#efe8d2'], ivory: ['#e2cf9c', '#2a2016'] }[a.faces];
    const dial = painted(256, 256, (c) => {
      c.fillStyle = faceHex; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
      c.lineWidth = 16;
      const band = (from: number, to: number, hex: string) => { c.strokeStyle = hex; c.beginPath(); c.arc(128, 128, 96, Math.PI * (0.75 + from * 1.5), Math.PI * (0.75 + to * 1.5)); c.stroke(); };
      band(0.35, 0.7, '#3d9a52'); band(0.7, 0.85, '#e0a11f'); band(0.85, 1, '#cf2a1e');
      c.strokeStyle = inkHex;
      for (let t = 0; t <= 20; t++) {
        const q = Math.PI * (0.75 + t * 0.075), long = t % 2 === 0;
        c.lineWidth = long ? 6 : 3;
        c.beginPath(); c.moveTo(128 + Math.cos(q) * (long ? 76 : 84), 128 + Math.sin(q) * (long ? 76 : 84)); c.lineTo(128 + Math.cos(q) * 112, 128 + Math.sin(q) * 112); c.stroke();
      }
      c.fillStyle = inkHex; c.fillRect(98, 176, 60, 8); c.fillRect(108, 192, 40, 6);
    });
    const dialMaterial = new THREE.MeshStandardMaterial({ map: dial, roughness: 0.4 });
    const lampMaterial = (hex: string, on: boolean) => new THREE.MeshStandardMaterial({ color: on ? hex : '#4a4f4b', emissive: hex, emissiveIntensity: on ? 1.1 : 0, roughness: 0.4 });
    const needles: { node: THREE.Object3D; rest: number; live: boolean }[] = [];
    let bigIndex = 0;
    const tells = { cracked: false, missing: false, tagged: 0 };

    const reading = (big: boolean) => {
      const i = big ? bigIndex++ : -1;
      if (a.needles === 'zero') return 0;
      if (a.needles === 'green') return 0.42 + random() * 0.22;
      if (a.needles === 'drifting') return random() < 0.3 ? 0.72 + random() * 0.12 : 0.4 + random() * 0.25;
      if (a.needles === 'pinned') return big || random() < 0.7 ? 1.0 : 0.6 + random() * 0.3;
      return i === 2 || (i < 0 && random() < 0.15) ? 0.97 : 0.5 + (i >= 0 ? 0 : (random() - 0.5) * 0.2);
    };

    const gauge = (g: THREE.Object3D, x: number, y: number, r: number, big: boolean) => {
      const value = reading(big);
      if (big && a.tell === 'missing' && !tells.missing && bigIndex >= 2) {
        tells.missing = true;
        const hole = s.cylinder(r * 0.95, r * 0.95, 0.006, [x, y, 0.004], dark, 28); hole.rotation.x = Math.PI / 2; g.add(hole);
        const cap = s.cylinder(r * 0.22, r * 0.22, 0.05, [x, y - r * 0.3, 0.03], pipeMetal, 12); cap.rotation.x = Math.PI / 2; g.add(cap);
        for (let k = 0; k < 4; k++) { const bolt = s.cylinder(0.012, 0.012, 0.012, [x + Math.cos(k * 1.57 + 0.78) * r * 1.02, y + Math.sin(k * 1.57 + 0.78) * r * 1.02, 0.006], pipeMetal, 6); bolt.rotation.x = Math.PI / 2; g.add(bolt); }
        return;
      }
      const rim = s.cylinder(r * 1.13, r * 1.16, 0.05, [x, y, 0.025], bezel, 32); rim.rotation.x = Math.PI / 2; g.add(rim);
      const face = s.mesh(new THREE.CircleGeometry(r, 32), dialMaterial, [x, y, 0.052]); face.castShadow = false; g.add(face);
      const needle = new THREE.Group();
      needle.position.set(x, y, 0.058);
      needle.rotation.z = Math.PI * (0.75 - value * 1.5);
      needle.add(s.box([r * 0.07, r * 1.05, 0.004], [0, r * 0.33, 0], needlePaint), s.cylinder(r * 0.11, r * 0.11, 0.01, [0, 0, 0], dark, 10));
      (needle.children[1] as THREE.Mesh).rotation.x = Math.PI / 2;
      g.add(needle);
      needles.push({ node: needle, rest: needle.rotation.z, live: a.needles !== 'zero' && value < 0.99 });
      if (big && a.tell === 'cracked' && !tells.cracked) {
        tells.cracked = true;
        const tape = s.material('#d8caa0', { roughness: 0.9 });
        for (const turn of [0.6, -0.7]) { const strip = s.box([r * 2.1, r * 0.2, 0.003], [x, y, 0.064], tape); strip.rotation.z = turn; g.add(strip); }
        const crack = s.rod([x - r * 0.6, y + r * 0.7, 0.062], [x + r * 0.2, y - r * 0.8, 0.062], 0.003, dark); g.add(crack);
      }
      if (a.tell === 'tagged' && big && tells.tagged === 0) {
        tells.tagged++;
        const tag = s.box([r * 0.55, r * 0.95, 0.003], [x + r * 0.5, y - r * 1.5, 0.07], redPaint); tag.rotation.z = 0.2 + random() * 0.3; g.add(tag);
        g.add(s.rod([x + r * 0.3, y - r * 0.95, 0.06], [x + r * 0.5, y - r * 1.2, 0.07], 0.003, dark));
      }
    };

    const level = (g: THREE.Object3D, x: number, y0: number, h: number, hex: string) => {
      const amount = Math.min(1, Math.max(0, a.levels + (random() - 0.5) * 0.25));
      g.add(s.box([0.12, h + 0.08, 0.02], [x, y0 + h / 2, 0.01], dark));
      const scale = s.mesh(new THREE.PlaneGeometry(0.04, h), new THREE.MeshStandardMaterial({ map: ticks, roughness: 0.6 }), [x + 0.035, y0 + h / 2, 0.022]); scale.castShadow = false; g.add(scale);
      g.add(s.box([0.042, h, 0.01], [x - 0.02, y0 + h / 2, 0.022], s.material('#e9efe9', { roughness: 0.2 })));
      if (amount > 0.02) g.add(s.box([0.036, h * amount, 0.014], [x - 0.02, y0 + h * amount / 2, 0.024], new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.25, roughness: 0.3 })));
      g.add(s.box([0.06, 0.008, 0.018], [x - 0.02, y0 + h * 0.15, 0.026], redPaint));
      for (const end of [0, 1]) { const nut = s.cylinder(0.026, 0.026, 0.05, [x - 0.02, y0 + end * h, 0.035], pipeMetal, 6); g.add(nut); }
    };
    const ticks = painted(32, 256, (c) => {
      c.fillStyle = faceHex; c.fillRect(0, 0, 32, 256);
      c.fillStyle = inkHex;
      for (let i = 0; i <= 20; i++) c.fillRect(0, 4 + i * 12.3, i % 5 === 0 ? 24 : 12, 3);
    });

    const wheel = (g: THREE.Object3D, x: number, y: number, r: number) => {
      const group = new THREE.Group();
      group.position.set(x, y, 0.1);
      group.rotation.z = random() * 3;
      group.add(s.ring(r, r * 0.13, [0, 0, 0], redPaint));
      for (let k = 0; k < 3; k++) { const spoke = s.box([r * 2, r * 0.14, r * 0.12], [0, 0, 0], redPaint); spoke.rotation.z = k * Math.PI / 3; group.add(spoke); }
      g.add(group);
      const stem = s.cylinder(r * 0.16, r * 0.16, 0.1, [x, y, 0.05], pipeMetal, 10); stem.rotation.x = Math.PI / 2; g.add(stem);
      if (a.tell === 'tagged' && tells.tagged === 1) { tells.tagged++; const tag = s.box([0.08, 0.14, 0.003], [x + r * 0.6, y - r - 0.06, 0.11], redPaint); tag.rotation.z = -0.25; g.add(tag); }
    };

    const mimic = (W: number, H: number) => {
      const nodes: [number, number][] = [];
      const texture = painted(1024, Math.round(1024 * H / W), (c, w, h) => {
        const light = a.finish !== 'slate' && a.finish !== 'navy';
        c.fillStyle = light ? '#efe9d6' : '#1c2126'; c.fillRect(0, 0, w, h);
        c.strokeStyle = light ? '#1d2022' : '#c9a85a'; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16);
        const ink = light ? '#1d2022' : '#e8dfc4';
        const hot = '#cf3a24', cold = '#2a6fb5', steam = '#e08a1e', other = '#2f9050';
        const pipe = (hex: string, points: [number, number][]) => { c.strokeStyle = hex; c.lineWidth = 18; c.lineJoin = 'miter'; c.beginPath(); points.forEach(([u, v], i) => (i ? c.lineTo(u * w, v * h) : c.moveTo(u * w, v * h))); c.stroke(); };
        const vessel = (u: number, v: number, du: number, dv: number, fill: string, round = 0.5) => { c.fillStyle = fill; c.strokeStyle = ink; c.lineWidth = 7; c.beginPath(); c.roundRect(u * w, v * h, du * w, dv * h, Math.min(du * w, dv * h) * round); c.fill(); c.stroke(); };
        const pump = (u: number, v: number) => { c.fillStyle = light ? '#ffffff' : '#30363c'; c.strokeStyle = ink; c.lineWidth = 7; c.beginPath(); c.arc(u * w, v * h, h * 0.07, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(u * w - h * 0.04, v * h + h * 0.035); c.lineTo(u * w + h * 0.05, v * h); c.lineTo(u * w - h * 0.04, v * h - h * 0.035); c.closePath(); c.fillStyle = ink; c.fill(); nodes.push([u, v]); };
        const valve = (u: number, v: number) => { c.fillStyle = ink; c.beginPath(); c.moveTo(u * w - 24, v * h - 18); c.lineTo(u * w + 24, v * h + 18); c.lineTo(u * w + 24, v * h - 18); c.lineTo(u * w - 24, v * h + 18); c.fill(); nodes.push([u, v - 0.12]); };
        const pale = light ? '#d9dfe2' : '#3a444d';
        if (a.plant === 'boiler') {
          pipe(cold, [[0.92, 0.82], [0.62, 0.82], [0.62, 0.3], [0.5, 0.3]]); pipe(steam, [[0.3, 0.2], [0.3, 0.1], [0.92, 0.1]]); pipe(other, [[0.08, 0.86], [0.2, 0.86]]);
          vessel(0.14, 0.4, 0.34, 0.5, '#d9763a', 0.08); vessel(0.12, 0.18, 0.4, 0.2, pale); vessel(0.5, 0.42, 0.07, 0.5, '#6c6f72', 0.05);
          c.fillStyle = '#f7d23e'; c.beginPath(); c.moveTo(0.22 * w, 0.86 * h); c.quadraticCurveTo(0.2 * w, 0.6 * h, 0.31 * w, 0.5 * h); c.quadraticCurveTo(0.42 * w, 0.62 * h, 0.4 * w, 0.86 * h); c.fill();
          pump(0.78, 0.82); valve(0.7, 0.1); valve(0.62, 0.56);
        } else if (a.plant === 'reactor') {
          pipe(hot, [[0.24, 0.3], [0.44, 0.3]]); pipe(cold, [[0.5, 0.82], [0.2, 0.82], [0.2, 0.7]]); pipe(steam, [[0.5, 0.14], [0.76, 0.14], [0.76, 0.3]]); pipe(cold, [[0.8, 0.62], [0.8, 0.86], [0.58, 0.86], [0.58, 0.6]]);
          vessel(0.1, 0.14, 0.18, 0.62, pale); vessel(0.42, 0.1, 0.16, 0.6, pale); 
          c.fillStyle = '#d9502e'; c.fillRect(0.135 * w, 0.4 * h, 0.11 * w, 0.26 * h);
          c.fillStyle = light ? '#ffffff' : '#30363c'; c.strokeStyle = ink; c.beginPath(); c.moveTo(0.68 * w, 0.3 * h); c.lineTo(0.9 * w, 0.22 * h); c.lineTo(0.9 * w, 0.66 * h); c.lineTo(0.68 * w, 0.58 * h); c.closePath(); c.fill(); c.stroke();
          pump(0.34, 0.82); valve(0.34, 0.3); valve(0.64, 0.14); nodes.push([0.19, 0.3]);
        } else if (a.plant === 'ship') {
          c.fillStyle = pale; c.strokeStyle = ink; c.lineWidth = 7; c.beginPath(); c.moveTo(0.05 * w, 0.3 * h); c.lineTo(0.95 * w, 0.3 * h); c.lineTo(0.86 * w, 0.84 * h); c.lineTo(0.14 * w, 0.84 * h); c.quadraticCurveTo(0.06 * w, 0.7 * h, 0.05 * w, 0.3 * h); c.fill(); c.stroke();
          c.fillStyle = light ? '#ffffff' : '#30363c'; c.fillRect(0.3 * w, 0.12 * h, 0.22 * w, 0.18 * h); c.strokeRect(0.3 * w, 0.12 * h, 0.22 * w, 0.18 * h);
          vessel(0.56, 0.4, 0.14, 0.36, cold, 0.05); vessel(0.72, 0.4, 0.12, 0.36, steam, 0.05); vessel(0.3, 0.46, 0.2, 0.3, '#6c6f72', 0.08);
          pipe(hot, [[0.3, 0.66], [0.1, 0.66]]); pipe(other, [[0.5, 0.56], [0.56, 0.56]]);
          pump(0.4, 0.6); valve(0.2, 0.66); nodes.push([0.63, 0.5], [0.78, 0.5]);
        } else if (a.plant === 'water') {
          c.fillStyle = cold; c.strokeStyle = ink; c.lineWidth = 7; c.beginPath(); c.moveTo(0.06 * w, 0.14 * h); c.lineTo(0.4 * w, 0.14 * h); c.lineTo(0.34 * w, 0.42 * h); c.lineTo(0.12 * w, 0.42 * h); c.closePath(); c.fill(); c.stroke();
          pipe(cold, [[0.23, 0.42], [0.23, 0.74], [0.82, 0.74], [0.82, 0.4]]); pipe(other, [[0.5, 0.74], [0.5, 0.9], [0.94, 0.9]]);
          for (let i = 0; i < 3; i++) vessel(0.42 + i * 0.09, 0.42, 0.07, 0.2, pale, 0.08);
          vessel(0.72, 0.1, 0.2, 0.3, pale, 0.2);
          pump(0.34, 0.74); pump(0.64, 0.74); valve(0.72, 0.9); nodes.push([0.82, 0.25]);
        } else {
          pipe(steam, [[0.24, 0.14], [0.24, 0.07], [0.6, 0.07], [0.6, 0.2]]); pipe(other, [[0.7, 0.5], [0.7, 0.86], [0.9, 0.86]]); pipe(cold, [[0.1, 0.86], [0.44, 0.86]]);
          vessel(0.16, 0.12, 0.16, 0.74, pale, 0.3);
          for (let i = 0; i < 5; i++) { c.strokeStyle = ink; c.lineWidth = 5; c.beginPath(); c.moveTo(0.16 * w, (0.26 + i * 0.11) * h); c.lineTo(0.32 * w, (0.26 + i * 0.11) * h); c.stroke(); }
          c.strokeStyle = cold; c.lineWidth = 12; c.beginPath(); for (let i = 0; i <= 8; i++) c.lineTo((i % 2 ? 0.78 : 0.62) * w, (0.2 + i * 0.04) * h); c.stroke();
          for (let i = 0; i < 3; i++) vessel(0.42 + i * 0.16, 0.6, 0.13, 0.22, ['#b0542c', '#c98a16', '#7a4a8a'][i], 0.15);
          pump(0.44, 0.86); valve(0.42, 0.07); valve(0.8, 0.86);
        }
        for (let i = 0; i < 26 * mood.wear; i++) { c.fillStyle = `rgba(80,55,30,${0.05 + random() * 0.12})`; c.beginPath(); c.ellipse(random() * w, random() * h, 20 + random() * 70, 8 + random() * 30, random() * 3, 0, 7); c.fill(); }
      });
      return { texture, nodes };
    };

    const bay = (W: number, kind: 'main' | 'wing' | 'tall') => {
      const g = new THREE.Group();
      s.root.add(g);
      const H = kind === 'tall' ? 2.5 : 2.2;
      g.add(s.box([W, H - 0.1, 0.1], [0, 0.1 + (H - 0.1) / 2, -0.05], steel));
      g.add(s.box([W + 0.02, 0.1, 0.5], [0, 0.05, -0.18], dark));
      g.add(s.box([W + 0.04, 0.05, 0.14], [0, H + 0.025, -0.05], brassy ? pipeMetal : dark));
      for (const side of [-1, 1]) {
        g.add(s.rod([side * (W / 2 - 0.06), H * 0.72, -0.1], [side * (W / 2 - 0.06), 0.1, -0.42], 0.022, dark));
        g.add(s.box([0.03, H - 0.1, 0.12], [side * (W / 2), 0.1 + (H - 0.1) / 2, -0.05], brassy ? pipeMetal : dark));
      }
      // Bolt heads round the edge.
      const bolts: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i <= 8; i++) for (const side of [-1, 1]) bolts.push({ at: [side * (W / 2 - 0.045), 0.22 + i * (H - 0.34) / 8, 0.004], size: 1 });
      const boltMesh = s.scatter(new THREE.SphereGeometry(0.012, 6, 4), pipeMetal, bolts); g.add(boltMesh);
      // Service pipes rising out of the top.
      for (let i = 0; i < (kind === 'wing' ? 1 : 2); i++) {
        const x = (i ? 1 : -1) * W * 0.28 + (random() - 0.5) * 0.1;
        g.add(s.tube([[x, H, -0.05], [x, H + 0.16, -0.05], [x, H + 0.24, -0.14], [x, H + 0.24, -0.4]], 0.028, pipeMetal));
      }

      if (kind === 'main') {
        const title = s.label(TITLES[a.plant], 0.7, 0.085, [0, 2.1, 0.004], brassy ? '#2a2016' : '#f0ead6', brassy ? '#c9a85a' : '#1d2022'); title.castShadow = false; g.add(title);
        for (let i = 0; i < 3; i++) gauge(g, (i - 1) * 0.54, 1.82, 0.19, true);
        const MW = 1.12, MH = 0.6;
        const { texture, nodes } = mimic(MW, MH);
        const plate = s.mesh(new THREE.PlaneGeometry(MW, MH), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55 }), [-0.24, 1.2, 0.006]); plate.castShadow = false; g.add(plate);
        g.add(s.box([MW + 0.05, MH + 0.05, 0.008], [-0.24, 1.2, 0.001], brassy ? pipeMetal : dark));
        const trouble = a.needles === 'pinned' || a.needles === 'disagree';
        nodes.forEach(([u, v], i) => {
          const on = a.needles !== 'zero';
          const hex = trouble && i % 2 === 0 ? '#ff3324' : a.needles === 'drifting' && i === 1 ? '#ffab1f' : '#35e070';
          g.add(s.ball([0.022, 0.022, 0.014], [-0.24 + (u - 0.5) * MW, 1.2 + (0.5 - v) * MH, 0.012], lampMaterial(hex, on), 10));
        });
        ['#2a6fb5', '#c98a16', '#2f9050'].forEach((hex, i) => level(g, 0.5 + i * 0.16, 0.95, 0.52, hex));
        const small = 3 + Math.round(mood.density * 3);
        for (let i = 0; i < small; i++) gauge(g, -0.74 + (i + 0.5) * 1.1 / small, 0.7, Math.min(0.1, 0.42 / small + 0.02), false);
        wheel(g, 0.52, 0.56, 0.1); wheel(g, 0.76, 0.56, 0.075);
        if (random() < 0.5 + mood.density * 0.5) wheel(g, -0.62, 0.38, 0.07);
        if (a.tell === 'leak') {
          const rust = new THREE.MeshStandardMaterial({ color: '#7a4a22', roughness: 0.9, transparent: true, opacity: 0.75 });
          const lx = 0.48;
          const streak = s.box([0.05, 0.86, 0.002], [lx, 0.5, 0.004], rust); streak.castShadow = false; g.add(streak);
          const second = s.box([0.025, 0.5, 0.002], [lx + 0.05, 0.62, 0.004], rust); second.castShadow = false; g.add(second);
          const puddle = s.cylinder(0.22, 0.22, 0.006, [lx + 0.03, 0.004, 0.24], s.material('#6e5238', { roughness: 0.15, metalness: 0.3 }), 24); puddle.scale.z = 0.7; g.add(puddle);
          g.add(s.box([0.4, 0.12, 0.3], [lx - 0.5, 0.06, 0.34], s.material('#9aa2a4', { metalness: 0.5 })));
        }
      } else if (kind === 'tall') {
        const title = s.label(TITLES[a.plant], 0.6, 0.075, [0, 1.62, 0.004], brassy ? '#2a2016' : '#f0ead6', brassy ? '#c9a85a' : '#1d2022'); title.castShadow = false; g.add(title);
        gauge(g, 0, 2.07, 0.34, true);
        gauge(g, -0.2, 1.36, 0.14, true); gauge(g, 0.2, 1.36, 0.14, true);
        ['#2a6fb5', '#c98a16'].forEach((hex, i) => level(g, -0.26 + i * 0.16, 0.62, 0.5, hex));
        gauge(g, 0.22, 1.0, 0.09, false); gauge(g, 0.22, 0.74, 0.09, false);
        wheel(g, 0, 0.36, 0.1);
        if (a.tell === 'leak') {
          const rust = new THREE.MeshStandardMaterial({ color: '#7a4a22', roughness: 0.9, transparent: true, opacity: 0.75 });
          const streak = s.box([0.05, 0.56, 0.002], [-0.3, 0.36, 0.004], rust); streak.castShadow = false; g.add(streak);
          const puddle = s.cylinder(0.2, 0.2, 0.006, [-0.28, 0.004, 0.22], s.material('#6e5238', { roughness: 0.15, metalness: 0.3 }), 24); g.add(puddle);
        }
      } else {
        for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) gauge(g, (i - 0.5) * 0.36, 1.86 - r * 0.4, 0.14, false);
        level(g, -0.18, 0.36, 0.42, '#2a6fb5');
        wheel(g, 0.16, 0.56, 0.09);
      }
      return g;
    };

    if (a.span === 'tall') bay(0.9, 'tall');
    else {
      bay(1.74, 'main');
      if (a.span === 'triptych')
        for (const side of [-1, 1]) {
          const wing = bay(0.78, 'wing');
          const angle = 0.6;
          wing.rotation.y = -side * angle;
          wing.position.set(side * (0.87 + 0.39 * Math.cos(angle)), 0, 0.39 * Math.sin(angle));
        }
    }

    const tremble = 0.006 + mood.energy * 0.05;
    const rate = mix(1.5, 11, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        needles.forEach((needle, i) => { if (needle.live) needle.node.rotation.z = needle.rest + Math.sin(time * rate + i * 1.9) * tremble + Math.sin(time * rate * 0.37 + i) * tremble; });
      },
    });
  },
});
