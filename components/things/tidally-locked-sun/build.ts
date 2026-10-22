import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const HUES = {
  ember: { say: 'Dim red-orange, a coal seen through smoke.', deep: '#7a1c0c', mid: '#e2521a', bright: '#ffab4a' },
  maroon: { say: 'Dark maroon, barely alight, more bruise than sun.', deep: '#3a0c10', mid: '#8f2218', bright: '#d8553a' },
  amber: { say: 'Swollen amber-gold, thick as honey.', deep: '#9a4a10', mid: '#f08e22', bright: '#ffd98a' },
  rose: { say: 'Pale rose and white, fierce and bleaching.', deep: '#c0584a', mid: '#f5a68a', bright: '#fff1dc' },
  violet: { say: 'An alien violet-magenta, the wrong colour for a sun.', deep: '#3c1250', mid: '#a83a9a', bright: '#f29ad2' },
} as const;

export default defineThing({
  questions: {
    size: score('How much of the sky does it fill?', ['A large coin on the horizon', 'A looming dome', 'A wall of fire across half the sky']),
    sunk: choice('How does it sit on the horizon?', {
      resting: 'The whole disc, just touching the ground.',
      dipped: 'Its lowest fifth below the horizon.',
      half: 'Exactly half sunk, a glowing dome.',
      sliver: 'Only a low arc showing, a lid of light.',
    }),
    hue: choice('What colour is the star?', Object.fromEntries(Object.entries(HUES).map(([k, v]) => [k, v.say])) as Record<keyof typeof HUES, string>),
    spots: choice('What marks its face?', {
      clean: 'Nothing: a smooth unblinking disc.',
      few: 'A few scattered dark spots.',
      belt: 'A belt of spots strung across its middle.',
      eye: 'One enormous dark spot near the centre, like a pupil.',
      pox: 'Dozens of spots, a diseased face.',
    }),
    flares: choice('What rises from its edge?', {
      calm: 'Nothing, a clean limb.',
      loop: 'A single great flare loop arching off one side.',
      prominences: 'Several arches of different sizes.',
      whip: 'A long torn streamer whipping away into the sky.',
      crown: 'A bristling crown of short spikes all around.',
    }),
    transit: choice('Is anything crossing in front of it?', {
      nothing: 'Nothing: the face is unbroken.',
      planet: 'A small black planet in transit.',
      ringed: 'A ringed planet in silhouette.',
      pair: 'A planet and its moon, two dots.',
      clouds: 'Thin dark bars of cloud drawn across its face.',
    }),
    below: choice('What lies along the horizon beneath it?', {
      bare: 'Nothing: a hard bare horizon line.',
      glitter: 'A path of broken reflected light running toward the viewer, as on a sea.',
      ridges: 'A black saw-edge of distant ridges across its lower face.',
      haze: 'Bands of thick glowing haze swallowing its base.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hue = HUES[a.hue];
    const R = mix(3.5, 13, a.size);
    const cy = R * { resting: 0.98, dipped: 0.6, half: 0, sliver: -0.6 }[a.sunk];
    const visibleTop = cy + R;
    const power = mix(0.75, 1.1, mood.cheer) * mix(1, 0.8, mood.wear);

    // Paint the face: limb darkening, granulation, spots.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const limb = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    limb.addColorStop(0, hue.bright); limb.addColorStop(0.55, hue.mid); limb.addColorStop(0.93, hue.deep); limb.addColorStop(1, hue.deep);
    ctx.fillStyle = hue.deep; ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = limb; ctx.beginPath(); ctx.arc(256, 256, 256, 0, Math.PI * 2); ctx.fill();
    const dab = (x: number, y: number, r: number, colour: string, squash = 1) => {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, colour); g.addColorStop(0.6, colour); g.addColorStop(1, `${colour.slice(0, 7)}00`);
      ctx.save(); ctx.translate(x, y); ctx.scale(1, squash); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    };
    for (let i = 0; i < 700; i++) { const t = random() * Math.PI * 2, d = Math.sqrt(random()) * 250; dab(256 + Math.cos(t) * d, 256 + Math.sin(t) * d, 3 + random() * 9, i % 3 ? `${hue.bright}40` : `${hue.deep}55`); }
    const spots: [number, number, number][] = [];
    // Texture v runs upward; only the part above the horizon is worth marking.
    const lowest = Math.max(-0.85, -cy / R + 0.12);
    const place = (x: number, y: number, r: number) => spots.push([x, Math.max(lowest, y), r]);
    if (a.spots === 'few') for (let i = 0; i < 4 + Math.floor(random() * 3); i++) place((random() - 0.5) * 1.4, lowest + random() * (0.8 - lowest), 0.035 + random() * 0.05);
    else if (a.spots === 'belt') { const y = Math.max(lowest + 0.1, 0.05 + random() * 0.2); for (let i = 0; i < 9; i++) place(-0.78 + i * 0.19 + (random() - 0.5) * 0.06, y + (random() - 0.5) * 0.1, 0.035 + random() * 0.055); }
    else if (a.spots === 'eye') { place((random() - 0.5) * 0.2, Math.max(lowest + 0.25, 0.1), 0.22 + random() * 0.06); for (let i = 0; i < 3; i++) place((random() - 0.5) * 1.3, lowest + random() * (0.8 - lowest), 0.03); }
    else if (a.spots === 'pox') for (let i = 0; i < 34; i++) place((random() - 0.5) * 1.6, lowest + random() * (0.85 - lowest), 0.02 + random() * 0.06);
    for (let i = 0; i < Math.round(mood.wear * 5); i++) place((random() - 0.5) * 1.5, lowest + random() * (0.8 - lowest), 0.02 + random() * 0.03);
    for (const [x, y, r] of spots) {
      if (x * x + y * y > 0.8) continue;
      const px = 256 + x * 256, py = 256 - y * 256, squash = 0.7 + random() * 0.3;
      dab(px, py, r * 256 * 1.7, `${hue.deep}e0`, squash);
      dab(px + (random() - 0.5) * 4, py, r * 256, '#170706f5', squash);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: map, emissiveIntensity: power, roughness: 1 });

    // A shallow lens, cut flat where it meets the horizon.
    const lens = (radius: number, bulge: number, rings: number) => {
      const segs = 72, positions: number[] = [], uvs: number[] = [], index: number[] = [];
      for (let i = 0; i <= rings; i++) for (let j = 0; j <= segs; j++) {
        const r = (i / rings) * radius, t = (j / segs) * Math.PI * 2;
        const x = Math.cos(t) * r, y = Math.max(0, cy + Math.sin(t) * r);
        positions.push(x, y, bulge * Math.sqrt(Math.max(0, 1 - (r / radius) ** 2)));
        uvs.push((x / radius + 1) / 2, ((y - cy) / radius + 1) / 2);
      }
      for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
        const p = i * (segs + 1) + j, q = p + segs + 1;
        index.push(p, q, p + 1, p + 1, q, q + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(index);
      g.computeVertexNormals();
      return g;
    };
    const bulge = R * 0.14;
    s.mesh(lens(R, bulge, 14), face).castShadow = false;
    const back = s.mesh(lens(R, bulge, 14), face);
    back.rotation.y = Math.PI;
    const corona = new THREE.MeshBasicMaterial({ color: hue.mid, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    const halo = s.mesh(lens(R * 1.16, 0, 12), corona, [0, 0, -0.05]);
    const halo2 = s.mesh(lens(R * 1.34, 0, 12), corona, [0, 0, -0.08]);
    halo.castShadow = halo2.castShadow = false;

    // Flares stand on the limb, above the horizon only.
    const fire = new THREE.MeshStandardMaterial({ color: hue.bright, emissive: hue.mid, emissiveIntensity: 1.3 * power, roughness: 0.6 });
    const minAngle = Math.asin(THREE.MathUtils.clamp((0.12 * R - cy) / R, -1, 1));
    const limbAngle = () => (random() < 0.5 ? minAngle + random() * (Math.PI / 2 - minAngle) * 0.8 : Math.PI - minAngle - random() * (Math.PI / 2 - minAngle) * 0.8);
    const arches: THREE.Object3D[] = [];
    const arch = (angle: number, size: number) => {
      const g = new THREE.Group();
      g.position.set(Math.cos(angle) * R * 0.985, cy + Math.sin(angle) * R * 0.985, 0);
      g.rotation.z = angle - Math.PI / 2;
      const loop = new THREE.Mesh(new THREE.TorusGeometry(size, size * 0.11, 8, 28, Math.PI), fire);
      loop.scale.y = 1.2 + random() * 0.8;
      g.add(loop);
      s.root.add(g);
      arches.push(g);
    };
    if (a.flares === 'loop') arch(limbAngle(), R * 0.2);
    else if (a.flares === 'prominences') for (let i = 0; i < 4 + Math.floor(random() * 3); i++) arch(limbAngle(), R * (0.05 + random() * 0.13));
    else if (a.flares === 'whip') {
      const angle = limbAngle(), dir = Math.cos(angle) > 0 ? 1 : -1;
      const pts = Array.from({ length: 7 }, (_u, j) => { const u = j / 6, out = R * (0.98 + u * 0.75), turn = angle + dir * -u * u * 0.7; return [Math.cos(turn) * out, cy + Math.sin(turn) * out, 0] as const; });
      arches.push(s.tube(pts, R * 0.035, fire));
      arch(angle + 0.2, R * 0.07);
    } else if (a.flares === 'crown') {
      for (let i = 0; i < 26; i++) {
        const angle = minAngle + (i / 25) * (Math.PI - 2 * minAngle), tall = R * (0.06 + random() * 0.16);
        const spike = s.mesh(new THREE.ConeGeometry(R * 0.028, tall, 5).translate(0, tall / 2, 0), fire, [Math.cos(angle) * R * 0.98, cy + Math.sin(angle) * R * 0.98, 0]);
        spike.rotation.z = angle - Math.PI / 2 + (random() - 0.5) * 0.3;
        arches.push(spike);
      }
    }

    // Whatever crosses the face.
    const shadow = new THREE.MeshStandardMaterial({ color: '#140c0e', roughness: 0.9 });
    const travellers: { body: THREE.Object3D; x: number; speed: number }[] = [];
    const sky = Math.max(visibleTop * 0.25, Math.min(visibleTop - R * 0.3, cy + R * (0.1 + random() * 0.4)));
    const transit = (x: number, y: number, r: number, ring: boolean) => {
      const g = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), shadow);
      g.add(ball);
      if (ring) { const band = new THREE.Mesh(new THREE.TorusGeometry(r * 1.8, r * 0.16, 6, 40), shadow); band.rotation.x = 1.25; band.rotation.y = 0.35; band.scale.z = 0.2; g.add(band); }
      g.position.set(x, y, bulge + r * 1.4);
      s.root.add(g);
      travellers.push({ body: g, x, speed: 0.4 + random() * 0.4 });
    };
    if (a.transit === 'planet') transit((random() - 0.5) * R * 0.9, sky, R * 0.07, false);
    else if (a.transit === 'ringed') transit((random() - 0.5) * R * 0.8, sky, R * 0.075, true);
    else if (a.transit === 'pair') { const x = (random() - 0.5) * R * 0.7; transit(x, sky, R * 0.08, false); transit(x + R * 0.2, sky + R * 0.07, R * 0.028, false); }
    else if (a.transit === 'clouds') {
      const bar = new THREE.MeshStandardMaterial({ color: new THREE.Color(hue.deep).multiplyScalar(0.45), roughness: 1 });
      const n = 3 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const y = visibleTop * (0.2 + (i / n) * 0.62) + random() * R * 0.05;
        const half = Math.sqrt(Math.max(0.05, R * R - (y - cy) ** 2));
        const cloud = s.ball([half * (0.5 + random() * 0.55), R * (0.014 + random() * 0.016), R * 0.03], [(random() - 0.5) * half * 0.8, y, bulge + R * 0.06], bar, 14);
        travellers.push({ body: cloud, x: cloud.position.x, speed: 0.15 + random() * 0.2 });
      }
    }

    // The horizon itself.
    if (a.below === 'glitter') {
      const glint = new THREE.MeshStandardMaterial({ color: hue.bright, emissive: hue.mid, emissiveIntensity: power, roughness: 0.4 });
      const dashes = Math.round(mix(14, 30, mood.density));
      for (let i = 0; i < dashes; i++) {
        const u = (i + random() * 0.6) / dashes, z = bulge + 0.3 + u * R * 1.25;
        s.box([R * mix(0.5, 0.12, u) * (0.5 + random() * 0.7), 0.03, R * 0.018], [(random() - 0.5) * R * 0.2 * (1 - u), 0.015, z], glint);
      }
    } else if (a.below === 'ridges') {
      const shape = new THREE.Shape();
      const wide = R * 1.35, seed = random() * 20;
      shape.moveTo(-wide, 0);
      for (let i = 0; i <= 44; i++) {
        const x = -wide + (2 * wide * i) / 44;
        shape.lineTo(x, R * (0.05 + 0.07 * Math.abs(Math.sin(i * 0.9 + seed)) + 0.06 * Math.abs(Math.sin(i * 0.37 + seed * 2)) + random() * 0.025));
      }
      shape.lineTo(wide, 0);
      s.mesh(new THREE.ExtrudeGeometry(shape, { depth: R * 0.08, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#2a2224', roughness: 1, flatShading: true }), [0, 0, bulge + R * 0.04]);
    } else if (a.below === 'haze') {
      const mist = new THREE.MeshStandardMaterial({ color: new THREE.Color(hue.mid).lerp(new THREE.Color('#d9b8a0'), 0.5), emissive: hue.deep, emissiveIntensity: 0.5, roughness: 1 });
      for (let i = 0; i < 4; i++) s.ball([R * (1.25 - i * 0.18), R * (0.035 - i * 0.004), R * 0.09], [(random() - 0.5) * R * 0.3, R * 0.03 + i * R * 0.055, bulge * 0.4 + R * 0.05], mist, 18);
    }
    if (a.below !== 'ridges' && a.below !== 'haze') s.box([R * 2.5, 0.06, R * 0.06], [0, 0.03, 0], new THREE.MeshStandardMaterial({ color: '#2a2224', roughness: 1 }));

    const pace = mix(0.15, 1.2, mood.energy);
    return s.finish({
      footprint: R * 0.9,
      update: (_dt, time) => {
        arches.forEach((item, i) => { const beat = 1 + Math.sin(time * pace * 1.6 + i * 1.9) * 0.08; item.scale.set(beat, beat, 1); });
        corona.opacity = 0.2 + Math.sin(time * pace) * 0.04;
        for (const t of travellers) t.body.position.x = t.x + Math.sin(time * pace * 0.08 * t.speed) * R * 0.25;
      },
    });
  },
});
