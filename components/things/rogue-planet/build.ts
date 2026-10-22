import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const W = 1024, H = 512;
const sheet = () => {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  return canvas.getContext('2d')!;
};

export default defineThing({
  questions: {
    surface: choice('What is the surface of this sunless world?', {
      cracked: 'A pale blue-grey ice shell broken into huge plates by dark branching cracks.',
      ocean: 'A smooth frozen ocean, slate and glassy, with long pressure ridges and few marks.',
      rock: 'Bare charcoal rock, airless and cratered, like a moon nobody owns.',
      gas: 'A dark gas giant with dim indigo bands and slow bruise-coloured storms.',
    }),
    heat: choice('Does any of its own inner heat show?', {
      none: 'None at all: it is cold right through.',
      fissure: 'One long warm fissure glowing like a seam of ember across the dark face.',
      network: 'A fine web of glowing cracks, the whole shell faintly alive with heat.',
      pole: 'A single dull glow at one pole, like a pilot light.',
    }),
    company: choice('Does it keep anything with it?', {
      alone: 'Nothing. It travels entirely alone.',
      moon: 'One small grey moon it never let go of.',
      pair: 'Two little moons, one close and one far.',
      ring: 'A thin tilted ring of ice rubble.',
    }),
    life: choice('Is there any sign of life?', {
      none: 'No sign of anything.',
      glow: 'Soft green-blue patches glowing under the ice, like something swimming below.',
      lamp: 'A single tiny artificial light on the surface, one outpost or one window.',
      cities: 'A scatter of small warm lights along one coast, a people who never saw a sun.',
    }),
    starlight: choice('What colour is the faint starlight on its limb?', {
      silver: 'Cold silver-white, thin as a fingernail.',
      blue: 'Pale electric blue.',
      gold: 'Faint old gold, like a distant porch light.',
      violet: 'Dim violet from a far nebula.',
    }),
    frost: score('How much of its old atmosphere lies frozen on it as bright frost?', ['None, a dark bare globe', 'Pale frost at the poles', 'Thick white caps and frost streaks']),
    tilt: noul('Is it knocked over on its side, tumbling as it drifts?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 1.6;
    const paint = sheet(), glow = sheet();
    glow.fillStyle = '#000';
    glow.fillRect(0, 0, W, H);

    // Draw across the seam three times so the map wraps.
    const wrapped = (ctx: CanvasRenderingContext2D, draw: (dx: number) => void) => { for (const dx of [-W, 0, W]) { ctx.save(); ctx.translate(dx, 0); draw(dx); ctx.restore(); } };
    const blot = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, colour: string, alpha: number) =>
      wrapped(ctx, () => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 1);
        ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry); ctx.translate(-x, -y);
        g.addColorStop(0, colour); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
    // A wandering crack; returned so heat can retrace it.
    const wander = (x: number, y: number, length: number, heading: number) => {
      const points: [number, number][] = [[x, y]];
      for (let i = 0; i < length; i++) {
        heading += (random() - 0.5) * 0.9;
        x += Math.cos(heading) * 14; y += Math.sin(heading) * 9;
        y = Math.min(H - 30, Math.max(30, y));
        points.push([x, y]);
      }
      return points;
    };
    const stroke = (ctx: CanvasRenderingContext2D, points: [number, number][], colour: string, width: number, blur = 0) =>
      wrapped(ctx, () => {
        ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineJoin = ctx.lineCap = 'round';
        ctx.shadowColor = colour; ctx.shadowBlur = blur;
        ctx.beginPath(); points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
      });

    const base = { cracked: '#748da6', ocean: '#465a73', rock: '#565354', gas: '#3d4468' }[a.surface];
    const dark = { cracked: '#1f2c3d', ocean: '#27364a', rock: '#262424', gas: '#1d2038' }[a.surface];
    const light = { cracked: '#c4d6e2', ocean: '#8ba3b8', rock: '#8d8782', gas: '#6f6f9c' }[a.surface];
    paint.fillStyle = base;
    paint.fillRect(0, 0, W, H);
    const cracks: [number, number][][] = [];

    if (a.surface === 'gas') {
      let y = 0;
      while (y < H) {
        const band = 12 + random() * 46;
        paint.fillStyle = new THREE.Color(dark).lerp(new THREE.Color(light), random() * 0.75).getStyle();
        paint.globalAlpha = 0.85;
        paint.fillRect(0, y, W, band);
        // Ragged band edge.
        paint.globalAlpha = 0.35;
        for (let x = 0; x < W; x += 40) paint.fillRect(x, y - 3 + Math.sin(x * 0.03 + y) * 3, 40, 6);
        y += band;
      }
      paint.globalAlpha = 1;
      const storms = 2 + Math.round(mood.energy * 5 + random() * 2);
      for (let i = 0; i < storms; i++) {
        const x = random() * W, sy = H * (0.25 + random() * 0.5), r = 18 + random() * 38;
        blot(paint, x, sy, r * 1.9, r, i % 2 ? '#8a6f96' : '#a79a86', 0.75);
        blot(paint, x, sy, r * 0.9, r * 0.45, dark, 0.8);
      }
      for (let i = 0; i < 3; i++) cracks.push(Array.from({ length: 40 }, (_unused, k) => [k * 14 + i * 300, H * (0.3 + i * 0.2) + Math.sin(k * 0.5) * 5] as [number, number]));
    } else {
      for (let i = 0; i < 70; i++) blot(paint, random() * W, random() * H, 40 + random() * 120, 25 + random() * 70, random() < 0.5 ? dark : light, 0.28);
      if (a.surface === 'rock') {
        const craters = 30 + Math.round(mood.wear * 50);
        for (let i = 0; i < craters; i++) {
          const x = random() * W, y = 40 + random() * (H - 80), r = 4 + random() ** 2 * 34;
          const stretch = 1 / Math.max(0.35, Math.sin((y / H) * Math.PI));
          blot(paint, x, y, r * stretch * 1.25, r * 1.25, light, 0.55);
          blot(paint, x + 1.5, y + 1.5, r * stretch * 0.85, r * 0.85, dark, 0.95);
        }
        for (let i = 0; i < 3; i++) cracks.push(wander(random() * W, H * (0.3 + random() * 0.4), 26, random() * 6));
      } else {
        const count = a.surface === 'cracked' ? 16 + Math.round(mood.wear * 14) : 5;
        for (let i = 0; i < count; i++) {
          const line = wander(random() * W, 60 + random() * (H - 120), a.surface === 'cracked' ? 22 + random() * 26 : 50, random() * 6);
          cracks.push(line);
          if (a.surface === 'cracked') {
            stroke(paint, line, dark, 2.5 + random() * 5);
            if (random() < 0.6) { const from = line[Math.floor(line.length / 2)]; const twig = wander(from[0], from[1], 12, random() * 6); stroke(paint, twig, dark, 2); cracks.push(twig); }
          } else {
            stroke(paint, line, light, 5);
            stroke(paint, line.map(([x, y]) => [x + 2, y + 3] as [number, number]), dark, 2);
          }
        }
      }
    }

    // Frozen-out atmosphere: bright caps and streaks.
    if (a.frost > 0.08) {
      for (const top of [true, false]) {
        const reach = H * mix(0.03, 0.26, a.frost) * (top ? 1 : 0.7 + random() * 0.5);
        const g = paint.createLinearGradient(0, top ? 0 : H, 0, top ? reach : H - reach);
        g.addColorStop(0, 'rgba(236,244,250,0.98)'); g.addColorStop(0.7, 'rgba(226,238,248,0.7)'); g.addColorStop(1, 'rgba(226,238,248,0)');
        paint.fillStyle = g;
        paint.fillRect(0, top ? 0 : H - reach, W, reach);
        for (let i = 0; i < 26 * a.frost; i++) blot(paint, random() * W, top ? reach * (0.7 + random() * 0.7) : H - reach * (0.7 + random() * 0.7), 30 + random() * 70, 8 + random() * 16, '#e8f1f8', 0.7);
      }
    }

    // Inner heat, drawn on the emissive sheet and scorched into the paint.
    const ember = new THREE.Color().setHSL(mix(0.0, 0.085, mood.warmth), 1, mix(0.5, 0.62, mood.warmth)).getStyle();
    const heatLines = a.heat === 'fissure' ? [cracks.length ? cracks.reduce((best, line) => (line.length > best.length ? line : best)) : wander(W / 2, H / 2, 40, 0)] : a.heat === 'network' ? cracks : [];
    for (const line of heatLines) {
      const wide = a.heat === 'fissure';
      stroke(paint, line, '#2a1210', wide ? 11 : 5);
      stroke(glow, line, ember, wide ? 5 : 2.2, wide ? 16 : 8);
      stroke(glow, line, '#ffe2b0', wide ? 1.6 : 0.7);
    }
    if (a.heat === 'pole') { glow.globalCompositeOperation = 'lighter'; for (let i = 0; i < 14; i++) blot(glow, random() * W, H * 0.9 + random() * 30, 90, 26, ember, 0.5); glow.globalCompositeOperation = 'source-over'; }

    // Life.
    if (a.life === 'glow') for (let i = 0; i < 9 + mood.density * 10; i++) { const x = W * (0.2 + random() * 0.6), y = H * (0.3 + random() * 0.4); blot(glow, x, y, 22 + random() * 46, 12 + random() * 22, i % 2 ? '#46e0b4' : '#4fb8ff', mix(0.4, 0.85, mood.cheer)); }
    if (a.life === 'cities') {
      const coast = wander(W * 0.3, H * 0.5, 34, 0.3);
      glow.fillStyle = '#ffd58a';
      for (const [x, y] of coast) for (let i = 0; i < 3 + mood.density * 6; i++) glow.fillRect(x + (random() - 0.5) * 26, y + (random() - 0.5) * 18, 2.2, 2.2);
    }

    const map = new THREE.CanvasTexture(paint.canvas), emissiveMap = new THREE.CanvasTexture(glow.canvas);
    map.colorSpace = emissiveMap.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = emissiveMap.wrapS = THREE.RepeatWrapping;
    const spin = new THREE.Group();
    const tumble = new THREE.Group();
    tumble.add(spin);
    s.root.add(tumble);
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 40),
      new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: '#ffffff', emissiveIntensity: 1.6, roughness: a.surface === 'ocean' ? 0.32 : a.surface === 'gas' ? 0.7 : 0.82, metalness: a.surface === 'ocean' ? 0.15 : 0 }),
    );
    globe.castShadow = globe.receiveShadow = true;
    spin.add(globe);

    // One outpost lamp: a real bead of light standing just proud of the surface, facing us.
    if (a.life === 'lamp') {
      const at = new THREE.Vector3(0.35 + random() * 0.3, 0.2 + random() * 0.4, 1).normalize().multiplyScalar(R);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff0b8' }));
      bead.position.copy(at);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffc45e', transparent: true, opacity: 0.35, depthWrite: false }));
      halo.position.copy(at);
      tumble.add(bead, halo);
    }

    // Starlight: a pale shell slipped out from behind one limb shows as a thin crescent.
    const star = { silver: '#eef3f7', blue: '#9fd0ff', gold: '#f3d28c', violet: '#c5a6ff' }[a.starlight];
    const limb = new THREE.Mesh(new THREE.SphereGeometry(R * 1.004, 48, 32), new THREE.MeshBasicMaterial({ color: star, side: THREE.BackSide }));
    limb.position.set(-0.085, 0.05, 0.03);
    s.root.add(limb);
    const haze = new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 48, 32), new THREE.MeshBasicMaterial({ color: star, side: THREE.BackSide, transparent: true, opacity: 0.16, depthWrite: false }));
    haze.position.set(-0.1, 0.06, -0.05);
    s.root.add(haze);

    // Company.
    const moons: { pivot: THREE.Group; rate: number }[] = [];
    const moonAt = (distance: number, size: number, phase: number, lean: number) => {
      const pivot = new THREE.Group();
      pivot.rotation.set(lean, phase, 0);
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 2), s.material('#8f9299', { roughness: 0.95, flatShading: true }));
      const p = rock.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(p.getX(i) * 31 + p.getY(i) * 17 + p.getZ(i) * 23) * 0.06; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
      rock.position.set(distance, 0, 0);
      rock.castShadow = true;
      pivot.add(rock);
      tumble.add(pivot);
      moons.push({ pivot, rate: 0.5 / distance });
    };
    if (a.company === 'moon' || a.company === 'pair') moonAt(R * 1.42, 0.2 + random() * 0.06, -0.7 - random() * 0.5, 0.25);
    if (a.company === 'pair') moonAt(R * 1.85, 0.1 + random() * 0.04, 2.2 + random() * 0.6, -0.2);
    if (a.company === 'ring') {
      const count = 420 + Math.round(mood.density * 380);
      const rubble = s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#c6d3dc', { roughness: 0.6, flatShading: true }), Array.from({ length: count }, () => {
        const angle = random() * Math.PI * 2, d = R * (1.42 + random() ** 1.5 * 0.4);
        return { at: [Math.cos(angle) * d, (random() - 0.5) * 0.03, Math.sin(angle) * d] as [number, number, number], size: 0.012 + random() ** 3 * 0.045 };
      }));
      s.root.remove(rubble);
      const tilted = new THREE.Group();
      tilted.rotation.set(0.3 + random() * 0.15, 0, 0.1 + random() * 0.15);
      const band = new THREE.Mesh(new THREE.RingGeometry(R * 1.4, R * 1.82, 96, 1), new THREE.MeshBasicMaterial({ color: '#b9c9d6', transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }));
      band.rotation.x = -Math.PI / 2;
      const gap = new THREE.Mesh(new THREE.RingGeometry(R * 1.52, R * 1.6, 96, 1), new THREE.MeshBasicMaterial({ color: '#dfe9f0', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
      gap.rotation.x = -Math.PI / 2;
      tilted.add(rubble, band, gap);
      s.root.add(tilted);
      moons.push({ pivot: rubble as unknown as THREE.Group, rate: 0.12 });
    }

    tumble.rotation.set(a.tilt ? 0.35 : 0.1, 0, a.tilt ? 1.15 + random() * 0.3 : 0.18 + random() * 0.2);
    spin.rotation.y = random() * Math.PI * 2;
    const rate = mix(0.015, 0.16, mood.energy) * (a.tilt ? 1.8 : 1);
    return s.finish({
      footprint: R,
      update: (dt) => {
        spin.rotation.y += dt * rate;
        for (const moon of moons) moon.pivot.rotation.y += dt * moon.rate * mix(0.3, 1.5, mood.energy);
      },
    });
  },
});
