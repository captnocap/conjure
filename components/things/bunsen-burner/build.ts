import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

function gauzeTexture(heat: number, wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#6f7375';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#2f3336';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 12) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  const disc = ctx.createRadialGradient(128, 128, 4, 128, 128, 84);
  const core = heat > 0.6 ? '#ff7a2e' : heat > 0.3 ? '#e9b78c' : '#efece2';
  disc.addColorStop(0, core);
  disc.addColorStop(0.55, heat > 0.6 ? '#f0c9a0' : '#e8e4d8');
  disc.addColorStop(1, wear > 0.5 ? '#b9b1a0' : '#dcd8cc');
  ctx.fillStyle = disc;
  ctx.beginPath(); ctx.arc(128, 128, 84, 0, Math.PI * 2); ctx.fill();
  if (wear > 0.35) {
    ctx.fillStyle = `rgba(60,45,30,${wear * 0.35})`;
    ctx.beginPath(); ctx.arc(140, 120, 40, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    flame: choice('What is the flame doing right now?', {
      off: 'Unlit: cold brass, gas off, nothing happening yet.',
      yellow: 'A lazy, tall, wavering yellow safety flame with the air hole closed.',
      blue: 'A steady blue working flame with a pale inner cone.',
      roaring: 'A fierce roaring blue flame, air hole wide open, the gauze glowing orange.',
    }),
    above: choice('What sits above the burner?', {
      gauze: 'An iron tripod and wire gauze with nothing on it yet.',
      beaker: 'A glass beaker of water on the gauze, coming to the boil.',
      dish: 'A white evaporating basin of blue copper sulphate solution, crystals forming at the rim.',
      crucible: 'A small porcelain crucible on a pipeclay triangle, its lid askew.',
      tin: 'A dented food tin being heated: mischief, camping, or lunch.',
      bare: 'Nothing at all: no tripod, just the naked burner and its flame.',
    }),
    hose: choice('How does the rubber gas hose lie?', {
      tidy: 'A tidy smooth curve leading away to the gas tap.',
      coiled: 'Too long, looped once on the bench before it leaves.',
      kinked: 'Sharply kinked and folded on itself, starving the flame.',
      patched: 'An old perished hose bound with white tape where it split.',
    }),
    body: choice('What is the burner made of?', {
      brass: 'Warm polished brass on a heavy black iron foot.',
      nickel: 'Bright nickel plate, newer and colder.',
      enamel: 'A chipped green enamel foot under a brass barrel, decades of school use.',
    }),
    mat: noul('Does it stand on a heatproof mat?'),
    left: choice('What has been left beside it?', {
      nothing: 'Nothing: the bench is clear.',
      matches: 'An open matchbox and several spent matches.',
      splints: 'Wooden splints, one with a charred end.',
      goggles: 'A pair of safety goggles, taken off and set down.',
      scorch: 'A black scorch mark and spatter from something that went wrong.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lit = a.flame !== 'off';
    const heat = { off: 0, yellow: 0.35, blue: 0.6, roaring: 1 }[a.flame];
    const tripod = a.above !== 'bare';

    const metalColour = { brass: '#c79a3c', nickel: '#c9ced0', enamel: '#c29a45' }[a.body];
    const metal = s.material(metalColour, { metalness: 0.85, roughness: mix(0.22, 0.5, mood.wear) });
    const footColour = { brass: '#26282a', nickel: '#b9bfc2', enamel: '#3f7a56' }[a.body];
    const foot = s.material(footColour, { metalness: a.body === 'nickel' ? 0.8 : 0.3, roughness: 0.5 });
    const iron = s.material('#35383b', { metalness: 0.5, roughness: 0.6 });
    const soot = s.material('#1c1b1a', { roughness: 0.95 });
    const y0 = a.mat ? 0.008 : 0;

    if (a.mat) {
      const mat = s.box([0.26, 0.008, 0.26], [0, 0.004, 0], s.material(mix(0.4, 0.9, mood.cheer) > 0.6 ? '#e6e3da' : '#b9b8b0', { roughness: 0.95 }));
      mat.rotation.y = (random() - 0.5) * 0.3;
    }

    // Foot, gas inlet, air collar and barrel.
    s.lathe([[0, 0], [0.047, 0], [0.05, 0.004], [0.046, 0.012], [0.03, 0.018], [0.016, 0.03], [0.014, 0.04], [0, 0.04]], foot, [0, y0, 0]);
    s.rod([-0.012, y0 + 0.028, 0], [-0.06, y0 + 0.028, 0], 0.006, metal);
    for (let i = 0; i < 3; i++) s.ring(0.0068, 0.0015, [-0.04 - i * 0.007, y0 + 0.028, 0], metal).rotation.y = Math.PI / 2;
    const H = 0.15;
    s.cylinder(0.0115, 0.0125, H - 0.04, [0, y0 + 0.04 + (H - 0.04) / 2, 0], metal, 20);
    s.cylinder(0.0165, 0.0165, 0.024, [0, y0 + 0.056, 0], metal, 20);
    for (const yy of [0.045, 0.068]) s.ring(0.017, 0.0022, [0, y0 + yy, 0], metal).rotation.x = Math.PI / 2;
    const hole = s.cylinder(0.005, 0.005, 0.004, [0, y0 + 0.056, 0.016], a.flame === 'yellow' || a.flame === 'off' ? metal : soot, 12);
    hole.rotation.x = Math.PI / 2;
    s.ring(0.0125, 0.002, [0, y0 + H, 0], mood.wear > 0.5 || a.flame === 'yellow' ? soot : metal).rotation.x = Math.PI / 2;
    // Gas tap lever on the inlet.
    s.box([0.006, 0.02, 0.006], [-0.03, y0 + 0.04, 0], iron).rotation.z = lit ? 0.9 : 0;

    // Hose, trailing off to the back left.
    const rubber = s.material(a.hose === 'patched' ? '#8a5a35' : random() < 0.5 ? '#b3432e' : '#c9812f', { roughness: 0.8 });
    const hy = 0.0075;
    const paths: Record<typeof a.hose, P3[]> = {
      tidy: [[-0.06, y0 + 0.028, 0], [-0.1, y0 + 0.02, 0.005], [-0.15, hy, 0.02], [-0.21, hy, 0.0], [-0.25, hy, -0.07], [-0.26, hy, -0.16]],
      coiled: [[-0.06, y0 + 0.028, 0], [-0.1, y0 + 0.018, 0.01], [-0.16, hy, 0.05], [-0.23, hy, 0.02], [-0.24, hy, -0.06], [-0.17, hy + 0.012, -0.09], [-0.12, hy + 0.014, -0.03], [-0.16, hy, 0.04], [-0.23, hy, 0.05], [-0.28, hy, -0.04], [-0.29, hy, -0.15]],
      kinked: [[-0.06, y0 + 0.028, 0], [-0.1, y0 + 0.02, 0.0], [-0.15, hy, 0.03], [-0.19, 0.03, 0.035], [-0.205, 0.062, 0.03], [-0.212, 0.03, 0.01], [-0.2, hy, -0.03], [-0.24, hy, -0.09], [-0.25, hy, -0.17]],
      patched: [[-0.06, y0 + 0.028, 0], [-0.1, y0 + 0.02, 0.01], [-0.14, hy, 0.04], [-0.2, hy, 0.05], [-0.24, hy, 0.0], [-0.2, hy, -0.07], [-0.24, hy, -0.15]],
    };
    const jitter = (p: P3, i: number): P3 => (i < 2 ? p : [-0.06 + (p[0] + 0.06) * 0.7 + (random() - 0.5) * 0.012, p[1], p[2] * 0.85 + (random() - 0.5) * 0.015]);
    const points = paths[a.hose].map(jitter);
    s.tube(points, 0.0075, rubber);
    const end = points[points.length - 1];
    s.ball([0.009, 0.009, 0.009], end, metal, 10);
    if (a.hose === 'patched') {
      const tape = s.material('#ece8dc', { roughness: 0.9 });
      for (const i of [3, 4]) s.ball([0.011, 0.0085, 0.011], points[i], tape, 10);
    }
    if (a.hose === 'kinked') s.ball([0.006, 0.009, 0.008], points[4], s.material('#5e2418'), 8);

    // Tripod and gauze.
    const ringY = y0 + 0.212;
    const heater = lit && tripod ? heat : 0;
    if (tripod) {
      s.ring(0.058, 0.0045, [0, ringY, 0], iron).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const t = i * (Math.PI * 2) / 3 + Math.PI / 6;
        s.rod([Math.cos(t) * 0.058, ringY, Math.sin(t) * 0.058], [Math.cos(t) * 0.092, 0, Math.sin(t) * 0.092], 0.0048, iron, 0.004);
      }
      if (a.above === 'crucible') {
        const clay = s.material('#e9e4d6', { roughness: 0.9 });
        for (let i = 0; i < 3; i++) {
          const t0 = i * (Math.PI * 2) / 3 + Math.PI / 2, t1 = t0 + (Math.PI * 2) / 3;
          const p = (t: number, r: number): P3 => [Math.cos(t) * r, ringY + 0.006, Math.sin(t) * r];
          s.rod(p(t0, 0.05), p(t1, 0.05), 0.005, clay);
          s.rod(p(t0, 0.05), p(t0, 0.085), 0.0018, iron);
        }
      } else {
        const gauze = s.mesh(new THREE.BoxGeometry(0.135, 0.003, 0.135), new THREE.MeshStandardMaterial({ map: gauzeTexture(heater, mood.wear), roughness: 0.8, emissive: '#ff5a1e', emissiveIntensity: heater > 0.9 ? 0.25 : 0 }), [0, ringY + 0.005, 0]);
        gauze.rotation.y = (random() - 0.5) * 0.5;
      }
    }
    const topY = ringY + 0.007;

    // Whatever is being heated.
    const bubbles: THREE.Mesh[] = [];
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d5ecf0', transparent: true, opacity: 0.32, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    if (a.above === 'beaker') {
      s.mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.095, 28, 1, true), glass, [0, topY + 0.0475, 0]);
      s.ring(0.0405, 0.0018, [0, topY + 0.095, 0], s.material('#eef6f7', { roughness: 0.1 })).rotation.x = Math.PI / 2;
      s.cylinder(0.037, 0.036, 0.05, [0, topY + 0.027, 0], s.material('#a9cfe0', { roughness: 0.1, transparent: true, opacity: 0.82 }), 28);
      for (let i = 0; i < 4; i++) s.box([0.012, 0.0012, 0.001], [0.012, topY + 0.03 + i * 0.014, 0.0395], s.material('#f4f4f0'));
      if (lit) for (let i = 0; i < Math.round(mix(3, 14, heat)); i++) {
        const t = random() * 6.28, r = random() * 0.03;
        bubbles.push(s.ball([0.004, 0.004, 0.004], [Math.cos(t) * r, topY + 0.052 + random() * 0.004, Math.sin(t) * r], s.material('#f3fbfd', { roughness: 0.1 }), 8));
      }
    } else if (a.above === 'dish') {
      const porcelain = s.material('#f1eee6', { roughness: 0.3 });
      s.lathe([[0, 0.002], [0.02, 0], [0.04, 0.012], [0.055, 0.032], [0.058, 0.034], [0.052, 0.03], [0.038, 0.014], [0, 0.008]], porcelain, [0, topY, 0]);
      s.cylinder(0.047, 0.04, 0.004, [0, topY + 0.024, 0], s.material('#2a78c8', { roughness: 0.15, emissive: '#0b3f86', emissiveIntensity: 0.25 }), 28);
      const crystal = s.material('#4fa2ea', { roughness: 0.2 });
      for (let i = 0; i < Math.round(mix(4, 16, heat)); i++) {
        const t = random() * 6.28;
        const c = s.box([0.006, 0.005, 0.006], [Math.cos(t) * 0.047, topY + 0.027, Math.sin(t) * 0.047], crystal);
        c.rotation.set(random(), random(), random());
      }
    } else if (a.above === 'crucible') {
      const porcelain = s.material('#eeeae0', { roughness: 0.35 });
      s.lathe([[0, 0], [0.014, 0], [0.026, 0.03], [0.028, 0.042], [0.025, 0.042], [0.022, 0.03], [0, 0.006]], porcelain, [0, topY - 0.012, 0]);
      s.cylinder(0.022, 0.022, 0.003, [0, topY + 0.024, 0], s.material(heat > 0.5 ? '#ff8a2a' : '#8d8f8c', { emissive: '#ff5a10', emissiveIntensity: heat > 0.5 ? 0.9 : 0 }), 18);
      const lid = s.lathe([[0, 0.012], [0.006, 0.012], [0.006, 0.006], [0.03, 0], [0.03, 0.003], [0, 0.008]], porcelain, [0.014, topY + 0.03, 0.004]);
      lid.rotation.z = -0.35;
    } else if (a.above === 'tin') {
      const tin = s.material('#b9bcbb', { metalness: 0.8, roughness: 0.35 });
      s.mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.1, 24, 6), tin, [0, topY + 0.05, 0]);
      for (let i = 0; i < 5; i++) s.ring(0.0375, 0.0012, [0, topY + 0.025 + i * 0.012, 0], tin).rotation.x = Math.PI / 2;
      const label = s.label('BEANS', 0.075, 0.05, [0, topY + 0.052, 0.0382], '#f6efd8', mood.cheer > 0.5 ? '#2f8f9a' : '#a3382c');
      label.rotation.z = (random() - 0.5) * 0.1;
      s.cylinder(0.034, 0.034, 0.004, [0, topY + 0.096, 0], s.material('#c2552a', { roughness: 0.6 }), 20);
      const flap = s.cylinder(0.036, 0.036, 0.002, [-0.03, topY + 0.118, 0], tin, 20);
      flap.rotation.z = 1.1;
    }

    // Flame: an opaque bright core inside a soft halo.
    const flames: THREE.Mesh[] = [];
    if (lit) {
      const room = tripod ? ringY - (y0 + H) - 0.004 : 1;
      const want = { yellow: 0.14, blue: 0.085, roaring: 0.16 }[a.flame];
      const h = Math.min(want, room);
      const squash = want > room ? 1.5 : 1;
      const profile = (r: number, height: number) => Array.from({ length: 13 }, (_u, i) => {
        const t = i / 12;
        return [r * Math.sin(Math.PI * Math.pow(t, 0.55)) + 0.0001, t * height] as const;
      });
      const base: P3 = [0, y0 + H, 0];
      if (a.flame === 'yellow') {
        flames.push(s.lathe(profile(0.024 * squash, h), new THREE.MeshStandardMaterial({ color: '#ffb52e', emissive: '#ff9a1a', emissiveIntensity: 1.3, transparent: true, opacity: 0.55, depthWrite: false }), base));
        flames.push(s.lathe(profile(0.014 * squash, h * 0.78), new THREE.MeshStandardMaterial({ color: '#ffe27a', emissive: '#ffd24a', emissiveIntensity: 1.6 }), base));
      } else {
        const strong = a.flame === 'roaring';
        flames.push(s.lathe(profile((strong ? 0.027 : 0.02) * squash, h), new THREE.MeshStandardMaterial({ color: strong ? '#4a6cff' : '#5aa2ff', emissive: strong ? '#3550ff' : '#3f86ff', emissiveIntensity: 1.2, transparent: true, opacity: strong ? 0.7 : 0.55, depthWrite: false }), base));
        flames.push(s.lathe(profile(0.011, h * (strong ? 0.5 : 0.42)), new THREE.MeshStandardMaterial({ color: '#b6f2ff', emissive: '#8fe6ff', emissiveIntensity: 1.8 }), base));
        if (strong && tripod) flames.push(s.cylinder(0.045, 0.02, 0.006, [0, ringY - 0.002, 0], new THREE.MeshStandardMaterial({ color: '#5a78ff', emissive: '#4a66ff', emissiveIntensity: 1.2, transparent: true, opacity: 0.6, depthWrite: false }), 20));
      }
    }

    // What was left beside it.
    const side = 0.14;
    if (a.left === 'matches') {
      const box = s.box([0.055, 0.016, 0.036], [side, y0 + 0.008, 0.06], s.material('#c33a2c'));
      box.rotation.y = 0.4 + random() * 0.4;
      const tray = s.box([0.05, 0.012, 0.032], [side + 0.02, y0 + 0.007, 0.075], s.material('#e3d9bd'));
      tray.rotation.y = box.rotation.y;
      const wood = s.material('#e6d3a1'), burnt = s.material('#1d1b19');
      for (let i = 0; i < Math.round(mix(2, 7, mood.density)); i++) {
        const x = 0.09 + random() * 0.1, z = 0.1 + random() * 0.06, t = random() * 6.28;
        const dx = Math.cos(t) * 0.02, dz = Math.sin(t) * 0.02;
        s.rod([x - dx, y0 + 0.002, z - dz], [x + dx * 0.4, y0 + 0.002, z + dz * 0.4], 0.0012, wood);
        s.rod([x + dx * 0.4, y0 + 0.002, z + dz * 0.4], [x + dx, y0 + 0.003, z + dz], 0.0013, burnt);
      }
    } else if (a.left === 'splints') {
      const wood = s.material('#e3cc97'), burnt = s.material('#1d1b19');
      for (let i = 0; i < 4; i++) {
        const z = 0.04 + i * 0.012 + random() * 0.006, tilt = (random() - 0.5) * 0.03;
        s.rod([0.1, y0 + 0.002, z + tilt], [0.22, y0 + 0.002, z - tilt], 0.0018, wood);
        if (i === 0) s.rod([0.2, y0 + 0.002, z - tilt * 0.7], [0.23, y0 + 0.003, z - tilt], 0.002, burnt);
      }
    } else if (a.left === 'goggles') {
      const frame = s.material('#2c4a66', { roughness: 0.5 });
      const g = new THREE.Group();
      for (const x of [-0.033, 0.033]) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.028, 20, 1, true), frame);
        cup.rotation.x = Math.PI / 2; cup.position.set(x, 0.03, 0); cup.castShadow = true;
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.026, 20), new THREE.MeshStandardMaterial({ color: '#cfe9f2', roughness: 0.08, metalness: 0.3 }));
        lens.position.set(x, 0.03, 0.014);
        g.add(cup, lens);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.012), frame);
      bridge.position.set(0, 0.034, 0);
      g.add(bridge);
      g.position.set(side + 0.01, y0, 0.07);
      g.rotation.set(-0.5, -0.5 + random() * 0.4, 0);
      s.root.add(g);
      s.tube([[side - 0.05, y0 + 0.02, 0.05], [side - 0.02, y0 + 0.004, 0.0], [side + 0.04, y0 + 0.004, -0.02], [side + 0.08, y0 + 0.018, 0.04]], 0.004, s.material('#22262a'));
    } else if (a.left === 'scorch') {
      const mark = s.material('#161514', { roughness: 1 });
      s.cylinder(0.05, 0.055, 0.0015, [side - 0.01, y0 + 0.001, 0.07], mark, 20).scale.set(1, 1, 0.7);
      for (let i = 0; i < 9; i++) {
        const t = random() * 6.28, r = 0.05 + random() * 0.06, size = 0.004 + random() * 0.008;
        s.cylinder(size, size, 0.0012, [side - 0.01 + Math.cos(t) * r, y0 + 0.001, 0.07 + Math.sin(t) * r * 0.7], mark, 8);
      }
      const shard = s.material('#d9eef2', { roughness: 0.1 });
      for (let i = 0; i < 4; i++) s.box([0.014, 0.001, 0.008], [side - 0.03 + random() * 0.05, y0 + 0.003, 0.05 + random() * 0.05], shard).rotation.y = random() * 3;
    }

    const flick = mix(0.03, 0.16, mood.energy) * (a.flame === 'yellow' ? 1.6 : 1);
    return s.finish({
      update: (_dt, time) => {
        flames.forEach((f, i) => {
          f.scale.y = 1 + Math.sin(time * (11 + i * 3.7)) * flick;
          f.scale.x = f.scale.z = 1 - Math.sin(time * (11 + i * 3.7)) * flick * 0.4;
          if (a.flame === 'yellow') f.rotation.z = Math.sin(time * 2.3 + i) * flick * 0.8;
        });
        bubbles.forEach((b, i) => { b.position.y += Math.sin(time * 9 + i * 1.9) * 0.00008; });
      },
    });
  },
});
