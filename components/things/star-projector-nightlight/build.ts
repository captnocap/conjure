import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P2 = readonly [number, number];
const ring = (n: number, f: (q: number, i: number) => P2) => Array.from({ length: n }, (_, i) => f(i / n * Math.PI * 2, i));
const OUTLINES: Record<string, P2[]> = {
  star: ring(10, (q, i) => { const r = i % 2 ? 0.42 : 1; return [Math.sin(q) * r, Math.cos(q) * r]; }),
  moon: [
    ...Array.from({ length: 18 }, (_, i): P2 => { const q = mix(50, 310, i / 17) * Math.PI / 180; return [Math.cos(q) + 0.2, Math.sin(q)]; }),
    ...Array.from({ length: 14 }, (_, i): P2 => { const q = mix(280.6, 79.4, i / 13) * Math.PI / 180; return [0.7 + 0.779 * Math.cos(q), 0.779 * Math.sin(q)]; }),
  ],
  cloud: ring(40, (q) => { const r = 1 + 0.16 * Math.cos(q * 5 + 0.6); return [Math.cos(q) * r, Math.sin(q) * r * 0.6 + (Math.sin(q) < 0 ? 0.12 : 0)]; }),
  fish: [...Array.from({ length: 24 }, (_, i): P2 => { const q = mix(20, 340, i / 23) * Math.PI / 180; return [-0.2 + Math.cos(q) * 0.8, Math.sin(q) * 0.5]; }), [1.05, -0.5], [0.85, 0], [1.05, 0.5]],
  bubble: ring(20, (q) => [Math.cos(q) * 0.55, Math.sin(q) * 0.55]),
  heart: ring(40, (q) => [16 * Math.sin(q) ** 3 / 17, (13 * Math.cos(q) - 5 * Math.cos(2 * q) - 2 * Math.cos(3 * q) - Math.cos(4 * q)) / 17 + 0.1]),
  flake: ring(24, (q, i) => { const r = [1, 0.3, 0.55, 0.3][i % 4]; return [Math.sin(q) * r, Math.cos(q) * r]; }),
};
const MOTIFS = {
  stars: ['star', 'star', 'star', 'moon'],
  ocean: ['fish', 'fish', 'bubble', 'bubble'],
  clouds: ['cloud', 'cloud', 'star', 'moon'],
  hearts: ['heart', 'heart', 'heart', 'star'],
  snow: ['flake', 'flake', 'flake', 'bubble'],
} as const;
const TINTS = {
  amber: ['#ffb02e', '#ffd35c', '#ff8a1f'],
  blue: ['#3fa0ff', '#8fd0ff', '#4f6dff'],
  pink: ['#ff5f9a', '#ffa3c4', '#ff4f7a'],
  green: ['#35d88a', '#9af5b8', '#22c7b0'],
  white: ['#fff0b8', '#ffffff', '#e4dcff'],
  rainbow: ['#ff5a5a', '#ffc12e', '#4fd870', '#3fa0ff', '#a86bff', '#ff6fc0'],
} as const;

export default defineThing({
  questions: {
    motif: choice('What shapes does it throw?', {
      stars: 'Stars and a crescent moon, the night sky.',
      ocean: 'Fish and bubbles, an underwater drift.',
      clouds: 'Soft clouds with a moon and a few stars.',
      hearts: 'Hearts.',
      snow: 'Snowflakes falling round and round.',
    }),
    colour: choice('What colour is the light?', {
      amber: 'Warm amber, like a candle.',
      blue: 'Cool sleepy blue.',
      pink: 'Rosy pink.',
      green: 'Soft aurora green.',
      white: 'Plain warm white.',
      rainbow: 'Every shape a different colour, slowly cycling.',
    }),
    body: choice('What does the lamp itself look like?', {
      dome: 'A pierced dome on a round plastic base with buttons.',
      turtle: 'A plush turtle whose hard shell is pierced with star holes.',
      egg: 'A smooth glowing silicone egg on a little charging ring.',
    }),
    power: choice('How is it running?', {
      bright: 'Bright and steady, just switched on at bedtime.',
      dim: 'Dimmed low, the timer nearly run out.',
      flicker: 'Flickering on dying batteries, some shapes missing.',
      off: 'Switched off: no projection, just the lamp in the grey.',
    }),
    reach: score('How far does it throw the shapes?', ['A tight halo hugging the lamp', 'An arm\'s length', 'Flung wide, filling the corner of the room']),
    spin: choice('How does the sky move?', {
      turning: 'Turning slowly and evenly like a carousel.',
      still: 'Almost still, drifting barely at all.',
      rocking: 'Rocking gently back and forth.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tints = TINTS[a.colour].map((hex) => new THREE.Color(hex));
    const level = { bright: 1, dim: 0.42, flicker: 0.7, off: 0 }[a.power] * mix(0.8, 1.1, mood.cheer);
    const lit = a.power !== 'off';
    const plastic = s.material(a.body === 'egg' ? '#f1ece2' : '#ece8de', { roughness: 0.4 });

    // The pierced shell: a dark skin whose holes glow.
    const skin = document.createElement('canvas'); skin.width = 512; skin.height = 256;
    const glow = document.createElement('canvas'); glow.width = 512; glow.height = 256;
    const g = skin.getContext('2d')!, e = glow.getContext('2d')!;
    const shellColour = a.body === 'egg' ? '#f4efe6' : a.body === 'turtle' ? '#3f6b5c' : '#35406b';
    g.fillStyle = shellColour; g.fillRect(0, 0, 512, 256);
    e.fillStyle = a.body === 'egg' ? '#8a8a8a' : '#000'; e.fillRect(0, 0, 512, 256);
    if (a.body === 'turtle') { g.strokeStyle = '#2c4f43'; g.lineWidth = 5; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 32, 256); g.stroke(); } g.beginPath(); g.moveTo(0, 150); g.lineTo(512, 150); g.stroke(); }
    const kinds = MOTIFS[a.motif];
    const stamp = (ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, size: number, turn: number) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(turn); ctx.scale(size * (1 + (y / 256) * 0.0), -size);
      ctx.beginPath(); OUTLINES[kind].forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill(); ctx.restore();
    };
    for (let i = 0; i < 26; i++) {
      const kind = kinds[i % kinds.length], x = (i * 197 + random() * 30) % 512, y = 26 + random() * 190, size = 9 + random() * 8, turn = random() * 6;
      const tint = tints[i % tints.length];
      g.fillStyle = `#${tint.getHexString()}`; e.fillStyle = '#ffffff';
      stamp(g, kind, x, y, size, turn); stamp(e, kind, x, y, size, turn);
    }
    const skinMap = new THREE.CanvasTexture(skin); skinMap.colorSpace = THREE.SRGBColorSpace;
    const glowMap = new THREE.CanvasTexture(glow); glowMap.colorSpace = THREE.SRGBColorSpace;
    const shellMaterial = new THREE.MeshStandardMaterial({ map: skinMap, emissive: tints[0].clone().lerp(new THREE.Color('#ffffff'), 0.3), emissiveMap: glowMap, emissiveIntensity: level * 1.5, roughness: 0.35 });

    let cy = 0.04, dome = 0.058;
    if (a.body === 'dome') {
      s.lathe([[0, 0], [0.07, 0], [0.074, 0.008], [0.072, 0.03], [0.062, 0.04], [0, 0.04]], plastic);
      for (let i = 0; i < 3; i++) { const q = (i - 1) * 0.42; s.cylinder(0.008, 0.008, 0.006, [Math.sin(q) * 0.071, 0.02, Math.cos(q) * 0.071], s.material(['#8fb6d9', '#f2c14e', '#e58a8a'][i], { roughness: 0.4 }), 12).rotation.x = Math.PI / 2; }
      s.mesh(new THREE.SphereGeometry(dome, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), shellMaterial, [0, cy, 0]);
      s.tube([[0, 0.006, -0.07], [0.02, 0.004, -0.11], [0.07, 0.004, -0.12], [0.1, 0.004, -0.1]], 0.0025, s.material('#d8d4ca'));
    } else if (a.body === 'turtle') {
      const plush = s.material(mix(0, 1, mood.warmth) > 0.5 ? '#8fc7a4' : '#7fb7c9', { roughness: 1 });
      cy = 0.032; dome = 0.07;
      s.ball([0.085, 0.03, 0.095], [0, 0.03, 0], plush, 20);
      s.ball([0.036, 0.032, 0.04], [0, 0.045, 0.105], plush, 18);
      for (const x of [-1, 1]) {
        s.ball([0.007, 0.007, 0.005], [x * 0.016, 0.055, 0.138], s.material('#1d1c1f', { roughness: 0.2 }), 10);
        s.ball([0.04, 0.012, 0.026], [x * 0.09, 0.014, 0.055], plush, 12).rotation.y = -x * 0.6;
        s.ball([0.03, 0.011, 0.022], [x * 0.08, 0.013, -0.07], plush, 12).rotation.y = x * 0.6;
      }
      s.ball([0.012, 0.01, 0.025], [0, 0.018, -0.105], plush, 10);
      const shell = s.mesh(new THREE.SphereGeometry(dome, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), shellMaterial, [0, cy, -0.004]);
      shell.scale.set(1, 0.78, 1.12);
    } else {
      cy = 0.07; dome = 0.062;
      s.ring(0.045, 0.008, [0, 0.008, 0], s.material('#d9d3c6', { roughness: 0.5 })).rotation.x = Math.PI / 2;
      const egg = s.mesh(new THREE.SphereGeometry(dome, 32, 20), shellMaterial, [0, 0.085, 0]);
      egg.scale.set(1, 1.3, 1);
      shellMaterial.emissiveIntensity = level * 0.9;
    }

    // The thrown sky: shapes hanging on an invisible shell, beams reaching out to them.
    const sky = new THREE.Group(); sky.position.set(0, cy, 0); s.root.add(sky);
    const R = mix(0.2, 0.36, a.reach);
    const materials = tints.map((tint) => new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: level * 0.7, roughness: 0.6, side: THREE.DoubleSide }));
    const beam = new THREE.MeshBasicMaterial({ color: tints[0], transparent: true, opacity: 0.1 * level, depthWrite: false, side: THREE.DoubleSide });
    const geometries = new Map<string, THREE.ShapeGeometry>();
    const shapeOf = (kind: string) => { let geo = geometries.get(kind); if (!geo) { geo = new THREE.ShapeGeometry(new THREE.Shape(OUTLINES[kind].map(([x, y]) => new THREE.Vector2(x, y)))); geometries.set(kind, geo); } return geo; };
    const count = lit ? Math.round(mix(14, 26, mood.density)) : 0;
    const up = new THREE.Vector3(0, 1, 0), out = new THREE.Vector3(0, 0, 1);
    const twinkle: { mesh: THREE.Mesh; phase: number }[] = [];
    for (let i = 0; i < count; i++) {
      if (a.power === 'flicker' && random() < 0.22) continue;
      const kind = kinds[i % kinds.length];
      const big = kind === 'moon' && i < kinds.length;
      const elevation = big ? 0.9 : Math.asin(mix(0.12, 0.97, (i + random() * 0.8) / count));
      const around = i * 2.39996 + random() * 0.5;
      const dir = new THREE.Vector3(Math.cos(around) * Math.cos(elevation), Math.sin(elevation), Math.sin(around) * Math.cos(elevation));
      const size = R * (big ? 0.19 : kind === 'bubble' ? mix(0.05, 0.09, random()) : mix(0.085, 0.14, random()));
      const mesh = new THREE.Mesh(shapeOf(kind), materials[i % materials.length]);
      mesh.position.copy(dir).multiplyScalar(R * mix(0.92, 1.04, random()));
      mesh.quaternion.setFromUnitVectors(out, dir);
      mesh.rotateZ(kind === 'fish' || kind === 'cloud' ? (random() - 0.5) * 0.5 : random() * 6);
      mesh.scale.setScalar(size);
      mesh.castShadow = false;
      sky.add(mesh);
      twinkle.push({ mesh, phase: random() * 6 });
      const length = mesh.position.length() - dome;
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.9, 0.004, length, 7, 1, true), beam);
      cone.position.copy(dir).multiplyScalar(dome + length / 2);
      cone.quaternion.setFromUnitVectors(up, dir);
      sky.add(cone);
    }
    if (lit) {
      const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#232a55', transparent: true, opacity: 0.2 + 0.12 * level, depthWrite: false, side: THREE.BackSide }));
      sky.add(halo);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(R * 0.9, 32), new THREE.MeshBasicMaterial({ color: tints[0], transparent: true, opacity: 0.2 * level, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.002, 0); s.root.add(pool);
    }

    const rate = { turning: 0.32, still: 0.03, rocking: 0 }[a.spin] * mix(0.5, 1.8, mood.energy);
    const tilt = random() * 6;
    const hsl = { h: 0, s: 0, l: 0 };
    return s.finish({
      footprint: 0.12,
      update: (dt, time) => {
        if (!lit) return;
        if (a.spin === 'rocking') sky.rotation.y = Math.sin(time * 0.5 * mix(0.5, 1.8, mood.energy) + tilt) * 0.6;
        else sky.rotation.y += dt * rate;
        const sputter = a.power === 'flicker' ? (Math.sin(time * 23) * Math.sin(time * 7.3) > 0.55 ? 0.25 : 1) : 1;
        materials.forEach((material, i) => {
          material.emissiveIntensity = level * sputter * (0.7 + 0.15 * Math.sin(time * 1.3 + i * 2.1));
          if (a.colour === 'rainbow') { material.emissive.getHSL(hsl); material.emissive.setHSL((hsl.h + dt * 0.04) % 1, hsl.s, hsl.l); material.color.copy(material.emissive); }
        });
        shellMaterial.emissiveIntensity = level * sputter * (a.body === 'egg' ? 0.9 : 1.5);
        for (const item of twinkle) item.mesh.rotateZ(dt * 0.15 * Math.sin(item.phase));
      },
    });
  },
});
