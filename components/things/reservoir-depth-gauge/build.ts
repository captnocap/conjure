import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { concrete, lampGlow } from './util';

const UNITS = {
  metres: { head: 'LEVEL m', step: 1, first: 0, by: 1, suffix: '' },
  feet: { head: 'DEPTH FT', step: 0.6096, first: 0, by: 2, suffix: '' },
  cyrillic: { head: 'УРОВЕНЬ м', step: 1, first: 0, by: 1, suffix: '' },
  german: { head: 'PEGEL m ü.NN', step: 1, first: 411, by: 1, suffix: '' },
  spanish: { head: 'NIVEL m', step: 1, first: 0, by: 1, suffix: '' },
} as const;
const ENAMEL = {
  white: ['#f4f1e6', '#17191b', '#b8261f'],
  yellow: ['#f0c624', '#17191b', '#17191b'],
  blue: ['#f4f1e6', '#1e4f93', '#1e4f93'],
  red: ['#f4f1e6', '#b8261f', '#17191b'],
} as const;
const EVENTS = {
  none: null,
  flood: { at: 4.55, lines: ['FLOOD', '31 · I · 1953'], ink: '#b3261e' },
  'first-fill': { at: 3.9, lines: ['FIRST FILLED', 'JUNE 1936'], ink: '#f2efe4' },
  melt: { at: 4.25, lines: ['MAY 1978', 'the big melt'], ink: '#1e3f73' },
  drought: { at: 0.95, lines: ['DROUGHT', 'AUG 1976'], ink: '#b3261e' },
  never: { at: 4.9, lines: ['НИКОГДА', 'БОЛЬШЕ · 1963'], ink: '#17191b' },
} as const;
const TOP = 5.2;

function canvasPlane(width: number, height: number, pixels: number, paint: (ctx: CanvasRenderingContext2D, W: number, H: number, scale: number) => void, cutout = false) {
  const canvas = document.createElement('canvas');
  canvas.width = pixels; canvas.height = Math.round((pixels * height) / width);
  const ctx = canvas.getContext('2d')!;
  paint(ctx, canvas.width, canvas.height, pixels / width);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, alphaTest: cutout ? 0.4 : 0 }));
  mesh.receiveShadow = true;
  return mesh;
}

export default defineThing({
  questions: {
    reading: choice('Where does the water stand on the gauge?', {
      flood: 'Flood: brown water over the top marks and lapping at the cabinet.',
      full: 'Full supply level, near the top of the staff.',
      normal: 'An ordinary level about halfway up.',
      low: 'Low: most of the staff showing above a stained band.',
      drought: 'Drought: the water is gone, the staff stands over cracked mud.',
    }),
    units: choice('What units and language is it marked in?', {
      metres: 'Metres, with an English header.',
      feet: 'Feet, numbered every two.',
      cyrillic: 'Metres, with a Russian header.',
      german: 'Metres above sea level, with a German header.',
      spanish: 'Metres, with a Spanish header.',
    }),
    enamel: choice('What colours is the enamel?', {
      white: 'White with black marks and red numerals.',
      yellow: 'Yellow and black.',
      blue: 'White and blue.',
      red: 'White with red marks.',
    }),
    event: choice('What high-water event has someone marked by hand on the concrete?', {
      none: 'Nothing is marked.',
      flood: 'A red line near the top: the flood of January 1953.',
      'first-fill': 'A white line: the day the reservoir first filled, 1936.',
      melt: 'A blue line and a scrawl: the big spring melt of 1978.',
      drought: 'A red line near the bottom: the drought of 1976.',
      never: 'A black line above everything, in Russian: never again, 1963.',
    }),
    cabinet: choice('What is the recorder cabinet like?', {
      locked: 'A green steel box, shut and padlocked.',
      open: 'Its door stands open on a brass chart drum.',
      modern: 'A grey telemetry box with a solar panel and an aerial.',
      robbed: 'Gutted: door hanging, nothing inside.',
    }),
    rungs: noul('Are there iron rungs up the side of the pier and a handrail on top?'),
    afloat: choice('What is on the water, or left on the mud?', {
      nothing: 'Nothing.',
      driftwood: 'Driftwood and a plastic bottle.',
      ice: 'A skin of ice, and snow on the pier cap.',
      ducks: 'A few ducks.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const level = { flood: 4.62, full: 3.9, normal: 2.6, low: 1.25, drought: 0 }[a.reading];
    const pz = -0.7, face = pz + 0.75;                          // pier centre and its front face
    const crete = concrete(random, mood.wear, '#bdb9ab', 1);
    const dark = s.material('#2b2f32', { metalness: 0.4, roughness: 0.5 });
    const rustTone = new THREE.Color('#7a4a2c');

    // Bed, pier and water.
    const mud = s.material('#8b785d', { roughness: 1 });
    if (level === 0) { s.box([5, 0.4, 5], [0, -0.2, 0], mud); s.box([3, 0.5, 2.1], [0, 0.25, pz], crete); }
    s.box([2.4, TOP - level, 1.5], [0, (TOP + level) / 2, pz], crete);
    s.box([2.9, 0.25, 2], [0, TOP + 0.125, pz], crete);
    const iced = a.afloat === 'ice';
    const waterTone = a.reading === 'flood' ? new THREE.Color('#8a7556') : new THREE.Color().setHSL(mix(0.57, 0.5, mood.warmth), 0.42, mix(0.2, 0.32, mood.cheer));
    if (level > 0) s.box([5, 0.4, 5], [0, level - 0.2, 0], new THREE.MeshStandardMaterial({ color: iced ? '#dfe9ee' : waterTone, roughness: iced ? 0.5 : 0.15, metalness: 0.1 }));
    else {
      const cracks = canvasPlane(5, 5, 256, (ctx, W, H) => {
        ctx.fillStyle = '#93805f'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#4c3f2e'; ctx.lineWidth = 2.5;
        const nodes = Array.from({ length: 46 }, () => [random() * W, random() * H]);
        for (const [x, y] of nodes) { const near = nodes.map(([nx, ny]) => [Math.hypot(nx - x, ny - y), nx, ny]).sort((p, q) => p[0] - q[0]).slice(1, 4); for (const [, nx, ny] of near) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo((x + nx) / 2 + (random() - 0.5) * 8, (y + ny) / 2 + (random() - 0.5) * 8); ctx.lineTo(nx, ny); ctx.stroke(); } }
      });
      cracks.rotation.x = -Math.PI / 2; cracks.position.y = 0.005; s.root.add(cracks);
      s.cylinder(0.9, 0.9, 0.02, [1.2, 0.012, 1.5], new THREE.MeshStandardMaterial({ color: waterTone, roughness: 0.1 }), 20).scale.z = 0.6;
    }

    // Wet and bleached bands on the pier above the present level.
    const band = (low: number, high: number, tone: string) => { if (high > level && low < TOP) s.box([2.43, Math.min(high, TOP) - Math.max(low, level), 1.53], [0, (Math.min(high, TOP) + Math.max(low, level)) / 2, pz], new THREE.MeshStandardMaterial({ color: tone, roughness: 1 })); };
    band(level, level + 0.3, '#4f5a4a');
    band(level + 0.3, Math.max(level + 0.3, 3.9), '#a9a595');
    if (a.reading !== 'flood') band(3.9, 3.96, '#6e6a58');

    // The staff gauge.
    const unit = UNITS[a.units], [paper, ink, numeral] = ENAMEL[a.enamel];
    const gx = -0.72, gw = 0.62, g0 = 0.25, g1 = 4.95, lo = Math.max(g0, level);
    s.box([gw + 0.08, g1 - lo + 0.04, 0.05], [gx, (lo + g1) / 2 + 0.02, face + 0.025], dark);
    const staff = canvasPlane(gw, g1 - g0, 160, (ctx, W, H, scale) => {
      ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
      const y = (metres: number) => H - metres * scale;
      const tick = unit.step / 10;
      for (let i = 0; i * tick < g1 - g0; i++) {
        ctx.fillStyle = ink;
        const base = y(i * tick), h = tick * scale;
        if (i % 2 === 0) ctx.fillRect(Math.floor(i / 10) % 2 ? W * 0.5 : 0, base - h, W * 0.3, h);
        if (i % 5 === 0) ctx.fillRect(Math.floor(i / 10) % 2 ? W * 0.3 : W * 0.3, base - 3, W * 0.2, 3);
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let n = 1; n * unit.step < g1 - g0 - 0.2; n++) {
        const label = String(unit.first + n * unit.by);
        ctx.fillStyle = numeral; ctx.font = `bold ${label.length > 2 ? 44 : 78}px sans-serif`;
        ctx.fillText(label, W * (n % 2 ? 0.7 : 0.66), y(n * unit.step) - 34, W * 0.62);
      }
      // Chips and rust blooms in the enamel.
      const chips = Math.round(mood.wear * 26);
      for (let i = 0; i < chips; i++) { ctx.fillStyle = random() > 0.5 ? '#5b3a22' : '#22201d'; ctx.beginPath(); ctx.ellipse(random() > 0.5 ? random() * 14 : W - random() * 14 + (random() - 0.5) * W * 0.3 * mood.wear, random() * H, 3 + random() * 9, 3 + random() * 14, 0, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = 'rgba(70,84,60,0.45)'; ctx.fillRect(0, y(Math.max(0, level - g0) + 0.25), W, H);
    });
    const shown = (g1 - lo) / (g1 - g0), staffMap = (staff.material as THREE.MeshStandardMaterial).map!;
    staff.geometry.dispose(); staff.geometry = new THREE.PlaneGeometry(gw, g1 - lo);
    staffMap.repeat.set(1, shown); staffMap.offset.set(0, 1 - shown);
    staff.position.set(gx, (lo + g1) / 2, face + 0.055); s.root.add(staff);
    const header = canvasPlane(1.1, 0.3, 256, (ctx, W, H) => {
      ctx.fillStyle = ink; ctx.fillRect(0, 0, W, H); ctx.fillStyle = paper; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${H * 0.62}px sans-serif`; ctx.fillText(unit.head, W / 2, H / 2, W * 0.9);
    });
    header.position.set(gx + 0.24, TOP + 0.02 - 0.02, face + 0.14); s.root.add(header);
    s.box([1.16, 0.36, 0.04], [gx + 0.24, TOP, face + 0.115], dark);
    s.scatter(new THREE.SphereGeometry(0.025, 6, 4), dark, [g0 + 0.1, 1.4, 2.6, 3.8, g1 - 0.1].filter((y) => y > level + 0.05).flatMap((y) => [-1, 1].map((side) => ({ at: [gx + side * (gw / 2 - 0.04), y, face + 0.06] as const, size: 1 }))));

    // The hand-painted mark.
    const event = EVENTS[a.event];
    if (event && event.at - (event.at > 2 ? 0.9 : 0.1) > level) {
      const below = event.at > 2, lineY = (H: number) => (below ? 22 : H - 22);
      const fresh = 1 - mood.wear * 0.45;
      const daub = canvasPlane(1.5, 1.1, 384, (ctx, W, H) => {
        ctx.globalAlpha = 1; ctx.strokeStyle = event.ink; ctx.fillStyle = event.ink; ctx.lineCap = 'round';
        ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(14, lineY(H)); ctx.bezierCurveTo(W * 0.3, lineY(H) - 8 + random() * 12, W * 0.7, lineY(H) + 8 - random() * 10, W - 16, lineY(H) - 2); ctx.stroke();
        for (let i = 0; i < 3; i++) ctx.fillRect(W * (0.2 + random() * 0.6), lineY(H), 5, 10 + random() * 16 * fresh);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        event.lines.forEach((line, index) => { ctx.font = `${index ? 'italic ' : ''}bold ${index ? 62 : 84}px ${index ? 'cursive' : 'sans-serif'}`; ctx.save(); ctx.translate(W / 2, (below ? 104 : 60) + index * 86); ctx.rotate((random() - 0.5) * 0.06); ctx.fillText(line, 0, 0, W * 0.92); ctx.restore(); });
      }, true);
      daub.position.set(0.42, event.at + (below ? -0.47 : 0.47), face + 0.03); s.root.add(daub);
    }

    // Stilling well pipe and the recorder cabinet on the cap.
    const cx = 0.85, cz = pz + 0.35, capTop = TOP + 0.25;
    s.rod([1.02, Math.max(level - 0.1, 0.05), face + 0.14], [1.02, capTop + 0.5, face + 0.14], 0.1, s.material('#6f7a78', { metalness: 0.4 }));
    for (const y of [1.2, 2.9, 4.5]) if (y > level + 0.1) s.box([0.34, 0.07, 0.2], [1.02, y, face + 0.1], dark);
    s.rod([1.02, capTop + 0.5, face + 0.14], [cx, capTop + 0.5, cz + 0.2], 0.07, dark);
    const boxTone = new THREE.Color(a.cabinet === 'modern' ? '#b9bfc1' : '#4f7556').lerp(rustTone, mood.wear * 0.5);
    const shell = s.material(boxTone, { metalness: 0.3, roughness: 0.6 });
    s.box([0.12, 0.6, 0.12], [cx, capTop + 0.3, cz], dark);
    const shut = a.cabinet === 'locked' || a.cabinet === 'modern';
    s.box([0.9, 1, 0.08], [cx, capTop + 1.1, cz - 0.26], shell);
    for (const side of [-1, 1]) s.box([0.06, 1, 0.6], [cx + side * 0.42, capTop + 1.1, cz], shell);
    s.box([0.9, 0.06, 0.6], [cx, capTop + 0.63, cz], shell);
    const lid = s.box([1.05, 0.06, 0.75], [cx, capTop + 1.63, cz + 0.02], shell); lid.rotation.x = 0.12;
    s.box([0.78, 0.9, 0.5], [cx, capTop + 1.1, cz - 0.02], new THREE.MeshStandardMaterial({ color: '#15181a', roughness: 1 }));
    if (shut) {
      s.box([0.9, 1, 0.05], [cx, capTop + 1.1, cz + 0.28], shell);
      s.box([0.3, 0.2, 0.02], [cx - 0.1, capTop + 1.3, cz + 0.31], s.material('#dfe6e2', { emissive: '#bfe6c8', emissiveIntensity: a.cabinet === 'modern' ? lampGlow(mood.daylight) * 0.6 : 0 }));
      s.box([0.08, 0.12, 0.05], [cx + 0.34, capTop + 1.05, cz + 0.32], s.material('#c9a53a', { metalness: 0.6 }));
    } else {
      const door = s.box([0.9, 1, 0.05], [cx + 0.45 + 0.4, capTop + 1.1 - (a.cabinet === 'robbed' ? 0.12 : 0), cz + 0.62], shell);
      door.rotation.y = -1.1; if (a.cabinet === 'robbed') door.rotation.z = -0.22;
      if (a.cabinet === 'open') {
        s.cylinder(0.2, 0.2, 0.55, [cx - 0.1, capTop + 1.15, cz + 0.02], s.material('#efe8d2'), 16);
        for (const y of [0.86, 1.44]) s.cylinder(0.22, 0.22, 0.04, [cx - 0.1, capTop + y, cz + 0.02], s.material('#c9a53a', { metalness: 0.6, roughness: 0.3 }), 16);
        s.rod([cx + 0.3, capTop + 0.7, cz + 0.05], [cx + 0.12, capTop + 1.2, cz + 0.12], 0.012, s.material('#c9a53a', { metalness: 0.6 }));
      } else s.rod([cx - 0.2, capTop + 0.66, cz + 0.2], [cx + 0.25, capTop + 0.4, cz + 0.6], 0.015, dark);
    }
    if (a.cabinet === 'modern') {
      const panel = s.box([0.8, 0.04, 0.55], [cx - 0.05, capTop + 2.15, cz - 0.1], s.material('#1c2c4a', { metalness: 0.5, roughness: 0.25 })); panel.rotation.x = 0.6;
      s.rod([cx + 0.4, capTop + 1.6, cz - 0.25], [cx + 0.4, capTop + 3, cz - 0.25], 0.02, dark);
      s.rod([cx - 0.05, capTop + 1.65, cz - 0.2], [cx - 0.05, capTop + 2.05, cz - 0.15], 0.03, dark);
    }

    if (a.rungs) {
      const iron = s.material(new THREE.Color('#3a3d3f').lerp(rustTone, mood.wear * 0.7), { metalness: 0.4 });
      s.scatter(new THREE.BoxGeometry(0.2, 0.04, 0.42), iron, Array.from({ length: 13 }, (_unused, index) => ({ at: [1.3, 0.55 + index * 0.37, pz] as const, size: 1 })).filter((rung) => rung.at[1] > level + 0.1));
      const rail: [number, number][] = [[-1.4, pz + 0.95], [-1.4, pz - 0.95], [1.4, pz - 0.95], [1.4, pz - 0.35]];
      rail.forEach(([x, z], index) => {
        s.rod([x, capTop, z], [x, capTop + 1, z], 0.03, iron);
        if (index) for (const h of [1, 0.55]) s.rod([rail[index - 1][0], capTop + h, rail[index - 1][1]], [x, capTop + h, z], 0.025, iron);
      });
    }

    // On the water or the mud.
    const top = Math.max(level, 0.01);
    if (a.afloat === 'driftwood') {
      const wood = s.material('#9a8364', { roughness: 1 });
      for (let i = 0; i < 4; i++) { const log = s.cylinder(0.06, 0.09, 0.9 + random() * 1.4, [-1.6 + random() * 3.2, top + 0.03, 0.9 + random() * 1.3], wood, 7); log.rotation.set(Math.PI / 2, 0, random() * 3); }
      const bottle = s.cylinder(0.05, 0.05, 0.28, [0.9 + random(), top + 0.05, 1.1 + random()], s.material('#8fd0c8', { roughness: 0.2 }), 8); bottle.rotation.set(Math.PI / 2, 0, random() * 3);
    } else if (iced) {
      const snow = s.material('#f6f9fa', { roughness: 0.9 });
      s.box([2.92, 0.14, 2.02], [0, capTop + 0.07, pz], snow);
      s.box([0.9, 0.1, 0.68], [cx, capTop + 1.72, cz + 0.02], snow).rotation.x = 0.12;
      if (level > 0) for (let i = 0; i < 4; i++) s.rod([(random() - 0.5) * 4.6, level + 0.01, 0.3 + random() * 2], [(random() - 0.5) * 4.6, level + 0.01, 0.3 + random() * 2], 0.02, s.material('#8fa6b3'));
      else s.box([5.02, 0.06, 5.02], [0, 0.03, 0], snow);
      const icicles = Array.from({ length: 9 }, () => ({ at: [-1.4 + random() * 2.8, capTop - 0.02, pz + 1] as const, size: 0.5 + random() }));
      s.scatter(new THREE.ConeGeometry(0.04, 0.4, 5).rotateX(Math.PI).translate(0, -0.2, 0), s.material('#e3eef3', { roughness: 0.3 }), icicles);
    } else if (a.afloat === 'ducks') {
      const count = 2 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) {
        const x = -1.8 + random() * 3.4, z = 0.7 + random() * 1.5, turn = random() * 6.28, drake = random() > 0.5;
        const duck = new THREE.Group();
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8).scale(1, 0.7, 1.6), s.material(drake ? '#b9b3a6' : '#8a6c4a'));
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), s.material(drake ? '#1f5a3c' : '#7a5c3c')); head.position.set(0, 0.17, 0.2);
        const bill = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.09), s.material('#e0a52a')); bill.position.set(0, 0.16, 0.3);
        duck.add(body, head, bill); duck.position.set(x, top + 0.06, z); duck.rotation.y = turn; duck.scale.setScalar(1.3);
        duck.traverse((node) => { node.castShadow = true; });
        s.root.add(duck);
      }
    }

    return s.finish();
  },
});
