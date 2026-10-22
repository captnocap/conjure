import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];

const CHEMISTRY = {
  water: 'Pure water ice: brilliant white with a blue cast.',
  ammonia: 'Ammonia slush: pale sea-green.',
  sulphur: 'Sulphur compounds: acid yellow.',
  salts: 'Iron salts and brine: rust orange.',
  tholin: 'Organic tholins: dusky pink-brown.',
  phosphor: 'Something phosphorescent: the plume glows mint green from within.',
} as const;
const TINT: Record<keyof typeof CHEMISTRY, string> = {
  water: '#9fd4f2', ammonia: '#86d9bd', sulphur: '#ecd548', salts: '#dc7d44', tholin: '#c9788a', phosphor: '#62f7ae',
};

/** Roughen a smooth solid into chipped ice, the same way at every shared vertex. */
function chip(geometry: THREE.BufferGeometry, amount: number, seed: number) {
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const noise = (k: number) => { const v = Math.sin(Math.round(x * 50) * 12.9898 + Math.round(y * 50) * 78.233 + Math.round(z * 50) * 37.719 + seed + k) * 43758.5453; return (v - Math.floor(v)) - 0.5; };
    position.setXYZ(i, x + noise(1) * amount, Math.max(0, y + noise(2) * amount * 0.6), z + noise(3) * amount);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    vent: choice('What does the vent look like?', {
      chimney: 'A steep rimed cone like a chimney, built up by its own fallout.',
      dome: 'A low, wide cracked dome with a ragged crater.',
      fissure: 'No cone: a long open crack between two low ridges, erupting along its length.',
    }),
    shape: choice('What shape is the plume?', {
      column: 'A single narrow jet, straight up like a searchlight.',
      fan: 'A broad flat fan, like a peacock tail seen side-on.',
      umbrella: 'A fountain that spreads at the top and rains down all around.',
      twin: 'Two jets leaning apart in a V.',
    }),
    chemistry: choice('What is the plume made of, by its colour?', CHEMISTRY),
    throat: choice('What light shows in the throat of the vent?', {
      none: 'None: a black hole in the ice.',
      blue: 'A cold blue glow from deep water.',
      orange: 'A dull orange glow, a hint of real heat below.',
      green: 'A green glow that seems to move.',
    }),
    caught: choice('What is caught up in the plume?', {
      nothing: 'Nothing but fine crystals.',
      boulders: 'House-sized chunks of ice, thrown out and strewn around the vent.',
      dark: 'A dark streak of something organic, staining one side of the plume and the snow under it.',
      halo: 'A rainbow halo ringing the top of the plume where light catches the crystals.',
      wreck: 'Wreckage: a panel, a strut and a flag of some instrument that stood too close.',
    }),
    snow: score('How much fallen snow has built up around the vent?', ['Bare swept ice', 'A dusting', 'Soft drifts', 'Deep rounded drifts burying the foot of the cone']),
    marker: noul('Is there a small survey instrument standing near the foot, giving a sense of its size?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = new THREE.Color(TINT[a.chemistry]);
    const glowing = a.chemistry === 'phosphor';
    const ice = s.material(new THREE.Color('#b4d2e4').lerp(tint, 0.2), { roughness: 0.4, flatShading: true });
    const snow = s.material(new THREE.Color('#f6fbff').lerp(tint, 0.3), { roughness: 0.95 });
    const dark = s.material('#1c2227', { roughness: 0.7 });
    const throatColour = { none: '#04070a', blue: '#39b6ff', orange: '#ff7a2a', green: '#4dff8c' }[a.throat];
    const throat = s.material(throatColour, a.throat === 'none' ? { roughness: 0.4 } : { emissive: throatColour, emissiveIntensity: mix(1.2, 2.6, mood.energy) });
    const seed = random() * 100;

    // The vent itself.
    let ventY = 0.3, ventR = 0.4;
    const fissure = a.vent === 'fissure';
    if (a.vent === 'chimney') {
      ventY = 2.3; ventR = 0.32;
      const cone = new THREE.LatheGeometry([[0.01, 1.9], [ventR, 2.0], [ventR + 0.1, 2.35], [0.6, 2.1], [0.85, 1.4], [1.3, 0.8], [1.9, 0.35], [2.6, 0.08], [3.0, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 18);
      s.mesh(chip(cone, 0.22, seed), ice);
      s.cylinder(ventR, ventR, 0.05, [0, 2.12, 0], throat, 14);
    } else if (a.vent === 'dome') {
      ventY = 1.0; ventR = 0.62;
      const dome = new THREE.LatheGeometry([[0.01, 0.6], [ventR, 0.7], [ventR + 0.14, 1.05], [1.2, 0.92], [2.0, 0.6], [2.8, 0.22], [3.3, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
      s.mesh(chip(dome, 0.2, seed), ice);
      s.cylinder(ventR, ventR, 0.05, [0, 0.82, 0], throat, 16);
      for (let c = 0; c < 7; c++) {
        const angle = c * 0.9 + random() * 0.5;
        s.rod([Math.cos(angle) * 0.75, 1.0, Math.sin(angle) * 0.75], [Math.cos(angle + 0.15) * 2.9, 0.2, Math.sin(angle + 0.15) * 2.9], 0.035, a.throat === 'none' ? dark : throat, 0.012);
      }
    } else {
      ventY = 0.7; ventR = 0.3;
      for (const side of [-1, 1]) {
        const ridge = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        ridge.scale(3.4, 1.15, 0.8);
        const mesh = s.mesh(chip(ridge, 0.2, seed + side), ice, [0, 0, side * 0.82]);
        mesh.rotation.y = side * 0.04;
      }
      s.box([6.0, 0.04, 0.5], [0, 0.03, 0], throat);
    }

    // The plume. Height and vigour come from the mood, not from a question.
    // It is drawn as solid streams on ballistic arcs, so it holds up in every print treatment.
    const H = mix(3.2, 12, mood.energy) * (a.shape === 'column' ? 1.15 : a.shape === 'umbrella' ? 0.8 : 1);
    const spray = new THREE.MeshStandardMaterial({ color: new THREE.Color(tint).lerp(new THREE.Color('#ffffff'), 0.25), emissive: tint, emissiveIntensity: glowing ? 1.1 : 0.3, roughness: 0.9 });
    interface Stream { x0: number; dx: number; dz: number; h: number; end: number }
    const streams: Stream[] = [];
    const along = () => (fissure ? (random() - 0.5) * 4.4 : 0);
    if (a.shape === 'column') {
      const n = Math.round(mix(4, 7, mood.energy));
      streams.push({ x0: 0, dx: 0, dz: 0, h: H, end: 0.5 });
      for (let i = 0; i < n; i++) { const angle = i / n * Math.PI * 2 + random(), reach = H * 0.16 * (0.6 + random() * 0.8); streams.push({ x0: along() * 0.4, dx: Math.cos(angle) * reach, dz: Math.sin(angle) * reach, h: H * (0.72 + random() * 0.25), end: 0.6 + random() * 0.1 }); }
    } else if (a.shape === 'fan') {
      const n = Math.round(mix(9, 19, mood.energy));
      for (let i = 0; i < n; i++) { const offset = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; streams.push({ x0: fissure ? offset * 2.3 : 0, dx: offset * H * 0.8, dz: (random() - 0.5) * H * 0.06, h: H * (1 - 0.4 * Math.abs(offset)) * (0.9 + random() * 0.2), end: 0.66 + random() * 0.1 }); }
    } else if (a.shape === 'umbrella') {
      const n = Math.round(mix(12, 24, mood.energy));
      for (let i = 0; i < n; i++) { const angle = i / n * Math.PI * 2 + random() * 0.3, reach = H * 0.6 * (0.8 + random() * 0.4); streams.push({ x0: along(), dx: Math.cos(angle) * reach, dz: Math.sin(angle) * reach, h: H * (0.8 + random() * 0.25), end: 0.86 + random() * 0.08 }); }
    } else {
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) streams.push({ x0: fissure ? side * 1.5 : 0, dx: side * H * (0.42 + random() * 0.22), dz: (random() - 0.5) * H * 0.12, h: H * (0.75 + random() * 0.25), end: 0.55 + random() * 0.12 });
    }
    const arc = (stream: Stream, t: number): P => [stream.x0 + stream.dx * t, ventY + 4 * stream.h * t * (1 - t), stream.dz * t];
    for (const stream of streams) {
      const steps = 9;
      const points = Array.from({ length: steps + 1 }, (_unused, k) => arc(stream, (k / steps) * stream.end));
      const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
      const geometry = new THREE.TubeGeometry(curve, 22, 1, 7);
      const position = geometry.getAttribute('position');
      const centre = new THREE.Vector3(), vertex = new THREE.Vector3();
      const tipR = H * (a.shape === 'column' ? 0.034 : 0.024) * (0.8 + random() * 0.5);
      for (let i = 0; i < position.count; i++) {
        const u = Math.floor(i / 8) / 22;
        curve.getPointAt(Math.min(1, u), centre);
        vertex.fromBufferAttribute(position, i).sub(centre).multiplyScalar(mix(ventR * 0.35, tipR, u ** 0.8)).add(centre);
        position.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
      geometry.computeVertexNormals();
      s.mesh(geometry, spray);
      const tip = arc(stream, stream.end);
      if (a.shape === 'column') s.ball([tipR * 1.25, tipR * 1.5, tipR * 1.25], tip, spray, 10);
      else for (let k = 0; k < 3; k++) { const far = arc(stream, Math.min(1, stream.end + 0.03 + k * 0.05)), size = tipR * (0.95 - k * 0.22); s.ball([size, size * 1.3, size], [far[0] + (random() - 0.5) * tipR, far[1], far[2] + (random() - 0.5) * tipR], spray, 8); }
    }

    // Loose crystals shed from the streams, falling the rest of the way as snow.
    const count = Math.round(mix(160, 520, mood.energy));
    const grains = Array.from({ length: count }, (_unused, index) => {
      const stream = streams[index % streams.length];
      return {
        stream, phase: random(), size: (0.05 + random() * 0.08) * (0.55 + H / 12),
        jx: (random() - 0.5) * H * 0.1, jz: (random() - 0.5) * H * 0.1, lift: 0.75 + random() * 0.3,
        dark: a.caught === 'dark' && stream.dx > 0,
      };
    });
    const crystals = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: tint, emissiveIntensity: glowing ? 1.4 : 0.3, roughness: 0.3, flatShading: true }), count);
    const matrix = new THREE.Matrix4();
    const streak = new THREE.Color('#2b1d1a');
    const pale = new THREE.Color('#ffffff').lerp(tint, 0.7);
    const speed = mix(0.04, 0.22, mood.energy);
    const setGrains = (time: number) => {
      grains.forEach((grain, index) => {
        const t = Math.min(1, grain.stream.end * 0.75 + ((grain.phase + time * speed) % 1) * (1.02 - grain.stream.end * 0.75));
        const p = arc(grain.stream, t);
        matrix.makeScale(grain.size, grain.size * 1.5, grain.size).setPosition(p[0] + grain.jx * t, Math.max(0.03, (p[1] - ventY) * grain.lift + ventY * (1 - t)), p[2] + grain.jz * t);
        crystals.setMatrixAt(index, matrix);
      });
      crystals.instanceMatrix.needsUpdate = true;
    };
    grains.forEach((grain, index) => crystals.setColorAt(index, grain.dark ? streak : pale));
    setGrains(0);
    crystals.castShadow = true;
    s.root.add(crystals);
    const spreadX = Math.max(...streams.map((stream) => Math.abs(stream.x0 + stream.dx))), spreadZ = Math.max(...streams.map((stream) => Math.abs(stream.dz)));

    // Fallout.
    const reachX = Math.max(3.4, spreadX * 0.85);
    const reachZ = Math.max(3.2, spreadZ * 0.85);
    const drifts = Math.round(a.snow * mix(10, 26, mood.density));
    for (let i = 0; i < drifts; i++) {
      const angle = random() * Math.PI * 2, r = 0.55 + random() * 0.5, size = mix(0.4, 1.0, a.snow) * (0.5 + random());
      s.ball([size, size * mix(0.15, 0.3, a.snow), size * (0.6 + random() * 0.5)], [Math.cos(angle) * reachX * r, 0, Math.sin(angle) * reachZ * r], snow, 12);
    }
    if (a.caught === 'dark') {
      const stain = s.material('#3a2622', { roughness: 0.9 });
      for (let i = 0; i < 12; i++) s.ball([0.4 + random() * 0.7, 0.04, 0.3 + random() * 0.5], [reachX * (0.3 + random() * 0.7), 0.02, (random() - 0.5) * reachZ], stain, 10);
    }
    if (a.caught === 'boulders') {
      for (let i = 0; i < 9; i++) {
        const angle = random() * Math.PI * 2, r = 0.5 + random() * 0.55, size = 0.35 + random() * 0.75;
        const flying = i < 3;
        const block = s.mesh(new THREE.DodecahedronGeometry(size, 0), ice, flying ? arc(streams[i % streams.length], 0.3 + random() * 0.25) : [Math.cos(angle) * reachX * r, size * 0.45, Math.sin(angle) * reachZ * r]);
        block.rotation.set(random() * 3, random() * 3, random() * 3);
        block.scale.y = 0.7;
      }
    }
    if (a.caught === 'halo') {
      const hues = ['#ff5a5a', '#ffb84a', '#fff46a', '#6aff8a', '#5ac8ff', '#a878ff'];
      hues.forEach((hue, index) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(H * 0.3 + index * H * 0.014, H * 0.007, 6, 72),
          new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: 1.3, transparent: true, opacity: 0.85, depthWrite: false }));
        ring.position.set(0, ventY + H * 0.78, 0);
        s.root.add(ring);
      });
    }
    if (a.caught === 'wreck') {
      const metal = s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 });
      const orange = s.material('#ee6a1e');
      const panel = s.box([1.0, 0.04, 0.7], [-H * 0.12, ventY + H * 0.55, 0.2], s.material('#16305f', { metalness: 0.5, roughness: 0.3 }));
      panel.rotation.set(0.7, 0.4, 1.0);
      s.rod([H * 0.1, ventY + H * 0.38, -0.1], [H * 0.1 + 0.9, ventY + H * 0.38 + 0.7, 0.2], 0.035, metal);
      s.box([0.5, 0.35, 0.02], [H * 0.02, ventY + H * 0.7, 0], orange).rotation.set(0.3, 0.5, 0.8);
      const leg = s.rod([2.2, 0.05, 1.6], [3.3, 0.08, 1.9], 0.035, metal);
      leg.castShadow = true;
      s.box([0.5, 0.35, 0.4], [2.6, 0.17, 2.3], orange).rotation.set(0.2, 0.6, 0.15);
    }
    if (a.marker) {
      const steel = s.material('#8c969b', { metalness: 0.7, roughness: 0.4 });
      const mx = Math.min(reachX * 0.75, 3.4), mz = Math.max(2.4, reachZ * 0.8);
      for (let leg = 0; leg < 3; leg++) s.rod([mx + Math.cos(leg * 2.09) * 0.4, 0, mz + Math.sin(leg * 2.09) * 0.4], [mx, 1.15, mz], 0.018, steel);
      s.box([0.28, 0.2, 0.22], [mx, 1.22, mz], s.material('#f0b81e'));
      s.cylinder(0.05, 0.06, 0.14, [mx, 1.24, mz + 0.16], dark, 10).rotation.x = Math.PI / 2;
      s.rod([mx + 0.9, 0, mz - 0.2], [mx + 0.9, 1.5, mz - 0.2], 0.012, steel);
      s.box([0.4, 0.24, 0.01], [mx + 1.1, 1.36, mz - 0.2], s.material('#e23b3b', { emissive: '#e23b3b', emissiveIntensity: 0.2 }));
    }

    return s.finish({ footprint: 3.2, update: (_dt, time) => setGrains(time) });
  },
});
