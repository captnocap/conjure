import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const DUST = { ochre: '#c88a4c', sand: '#cfae74', grit: '#9c968c', rust: '#a9512f', soot: '#45403d' } as const;

/** Diagonal streaks that wrap, so a turning texture looks like dust winding up the column. */
function streaks(random: () => number, base: THREE.Color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);
  const light = `#${base.clone().lerp(new THREE.Color('#fff4dc'), 0.45).getHexString()}`;
  const dark = `#${base.clone().multiplyScalar(0.62).getHexString()}`;
  for (let i = 0; i < 46; i++) {
    ctx.strokeStyle = random() < 0.5 ? light : dark;
    ctx.globalAlpha = 0.25 + random() * 0.5;
    ctx.lineWidth = 2 + random() * 9;
    const x = random() * 256, y = random() * 256, run = 60 + random() * 150;
    for (const dx of [-256, 0, 256])
      for (const dy of [-256, 0, 256]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.lineTo(x + dx + run, y + dy - run * 0.45);
        ctx.stroke();
      }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    form: choice('What shape is the whirl?', {
      column: 'A classic even column, a little wider at the top.',
      rope: 'A thin tight rope of dust, very tall for its width.',
      funnel: 'A squat funnel that flares wide like a small tornado.',
      twin: 'Two thin whirls wound round each other.',
      ragged: 'A broken, bulging column coming apart into puffs.',
    }),
    lean: score('How far does it lean?', ['Bolt upright', 'Tilted a little', 'Leaning hard, its top dragged well ahead of its foot']),
    dust: choice('What is it made of?', {
      ochre: 'Butterscotch-ochre Martian dust.',
      sand: 'Pale desert sand.',
      grit: 'Grey vacant-lot grit and cement dust.',
      rust: 'Deep red laterite soil.',
      soot: 'Black ash and soot from a burn scar.',
    }),
    cargo: choice('What has it picked up?', {
      nothing: 'Only dust.',
      litter: 'Scraps of paper and wrappers wheeling round it.',
      leaves: 'Dry brown leaves and a tumbleweed.',
      embers: 'Glowing orange embers.',
      bag: 'One white plastic bag riding high.',
    }),
    skirt: score('How big is the skirt of dust at its foot?', ['A tight bright spot', 'A low boiling ring', 'A wide ragged cloud dragged along the ground']),
    track: noul('Has it left a dark scoured track on the ground behind it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = new THREE.Color(DUST[a.dust]).lerp(new THREE.Color('#e0a060'), Math.max(mood.warmth - 0.5, 0) * 0.25);
    const pale = base.clone().lerp(new THREE.Color('#fff0d0'), 0.3 + mood.cheer * 0.15);
    const height = mix(4.2, 13, mood.energy) * { column: 1, rope: 1.2, funnel: 0.75, twin: 1, ragged: 0.9 }[a.form];
    const foot = 0.16 + height * 0.03;
    const lean = a.lean * height * 0.42;
    const wiggle = 0.25 + random() * 0.35, phase = random() * 6, twist = 2 + random() * 2;
    const bulges = [random() * 6, random() * 6];
    const strands = a.form === 'twin' ? 2 : 1;

    const radiusAt = (t: number) => {
      const flare = { column: 1 + 1.5 * t ** 1.4, rope: 0.7 + 0.5 * t, funnel: 0.8 + 6 * t ** 2.2, twin: 0.6 + 0.6 * t, ragged: 1 + 1.8 * t }[a.form];
      const lumps = a.form === 'ragged' ? 1 + 0.38 * Math.sin(t * 13 + bulges[0]) + 0.2 * Math.sin(t * 29 + bulges[1]) : 1 + 0.08 * Math.sin(t * 17 + bulges[0]);
      return foot * flare * lumps * (1 + 0.5 * Math.exp(-t * 14));
    };
    const centreAt = (t: number, strand = 0, out = new THREE.Vector3()) => {
      const sway = Math.sin(t * twist + phase) * wiggle * foot * 3 * t;
      out.set(lean * t ** 1.6 + sway, t * height, Math.cos(t * twist * 1.3 + phase) * wiggle * foot * 3 * t);
      if (strands === 2) {
        const angle = t * 9 + strand * Math.PI, gap = foot * (1.3 + t * 1.6);
        out.x += Math.cos(angle) * gap;
        out.z += Math.sin(angle) * gap;
      }
      return out;
    };

    const sweep = (strand: number, grow: number, taper: number) => {
      const rows = 48, cols = 20;
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      const centre = new THREE.Vector3();
      for (let row = 0; row <= rows; row++) {
        const t = row / rows;
        centreAt(t, strand, centre);
        const radius = radiusAt(t) * grow * (1 - taper * t ** 6);
        for (let col = 0; col <= cols; col++) {
          const angle = (col / cols) * Math.PI * 2;
          positions.push(centre.x + Math.cos(angle) * radius, centre.y, centre.z + Math.sin(angle) * radius);
          uvs.push((col / cols) * 2, t * Math.max(1, Math.round(height / 3)));
        }
      }
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
          const i = row * (cols + 1) + col;
          index.push(i, i + cols + 1, i + 1, i + 1, i + cols + 1, i + cols + 2);
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      return geometry;
    };

    const coreMap = streaks(random, base), veilMap = streaks(random, base.clone().lerp(pale, 0.4));
    const core = new THREE.MeshStandardMaterial({ map: coreMap, roughness: 1, side: THREE.DoubleSide });
    const veil = new THREE.MeshStandardMaterial({ map: veilMap, roughness: 1, transparent: true, opacity: 0.42, depthWrite: false });
    for (let strand = 0; strand < strands; strand++) {
      s.mesh(sweep(strand, 0.72, 0.6), core);
      const outer = s.mesh(sweep(strand, 1.12, 0.2), veil);
      outer.castShadow = false;
    }

    // Loose grains wound round the column: solid, so every print treatment sees them.
    type Grain = { t: number; angle: number; reach: number; size: number; spin: number; rise: number; strand: number };
    const makeGrains = (count: number, sizes: [number, number], low = 0, high = 1): Grain[] => Array.from({ length: count }, () => ({
      t: mix(low, high, random() ** 1.3), angle: random() * Math.PI * 2, reach: 0.7 + random() * 0.9,
      size: mix(sizes[0], sizes[1], random()), spin: 0.6 + random() * 0.8, rise: 0.04 + random() * 0.08, strand: Math.floor(random() * strands),
    }));
    const dummy = new THREE.Object3D(), centre = new THREE.Vector3();
    const layout = (mesh: THREE.InstancedMesh, grains: Grain[], flat = false) => {
      grains.forEach((grain, i) => {
        centreAt(grain.t, grain.strand, centre);
        const radius = radiusAt(grain.t) * grain.reach * (1 + (grain.t < 0.06 ? a.skirt * 2.5 : 0));
        dummy.position.set(centre.x + Math.cos(grain.angle) * radius, centre.y + 0.03, centre.z + Math.sin(grain.angle) * radius);
        dummy.rotation.set(grain.angle * 3, grain.angle, flat ? grain.t * 40 : 0);
        dummy.scale.setScalar(grain.size);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    const swarms: { mesh: THREE.InstancedMesh; grains: Grain[]; flat: boolean }[] = [];
    const swarm = (geometry: THREE.BufferGeometry, material: THREE.Material, grains: Grain[], tint?: (i: number) => THREE.Color, flat = false) => {
      const mesh = new THREE.InstancedMesh(geometry, material, grains.length);
      if (tint) grains.forEach((_grain, i) => mesh.setColorAt(i, tint(i)));
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      layout(mesh, grains, flat);
      s.root.add(mesh);
      swarms.push({ mesh, grains, flat });
    };
    const dustCount = Math.round(mix(160, 420, mood.density) * (0.6 + height / 13));
    swarm(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), makeGrains(dustCount, [0.02 + foot * 0.07, 0.04 + foot * 0.2]),
      () => base.clone().lerp(random() < 0.5 ? pale : base.clone().multiplyScalar(0.6), random() * 0.7));
    if (a.cargo === 'litter') swarm(new THREE.BoxGeometry(1, 0.04, 0.75), new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), makeGrains(26, [0.14, 0.3], 0.05, 0.95),
      () => new THREE.Color(['#f4f1e8', '#f4f1e8', '#d94a3a', '#3d78c4', '#e9c94a'][Math.floor(random() * 5)]), true);
    if (a.cargo === 'leaves') {
      swarm(new THREE.SphereGeometry(1, 6, 4).scale(1, 0.08, 0.55), new THREE.MeshStandardMaterial({ roughness: 0.9 }), makeGrains(34, [0.1, 0.2], 0.03, 0.9),
        () => new THREE.Color(['#8a5a2b', '#a5712f', '#6e4a24', '#b98a3a'][Math.floor(random() * 4)]), true);
      const weed = s.mesh(new THREE.IcosahedronGeometry(0.34, 1), new THREE.MeshStandardMaterial({ color: '#8c6a3c', wireframe: true }), [foot * 3 + 0.6, 0.34, 0.5]);
      s.mesh(new THREE.IcosahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: '#75552e', roughness: 1 }), [foot * 3 + 0.6, 0.34, 0.5]);
      weed.rotation.set(random(), random(), random());
    }
    if (a.cargo === 'embers') swarm(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff5a10', emissiveIntensity: 2.2 }), makeGrains(46, [0.035, 0.09], 0, 1));
    if (a.cargo === 'bag') {
      const at = centreAt(0.72), r = radiusAt(0.72) * 1.3;
      const bag = s.mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: '#f6f6f2', roughness: 0.4, transparent: true, opacity: 0.85 }), [at.x + r, at.y, at.z + r * 0.4]);
      bag.scale.set(1, 1.3, 0.7);
      bag.rotation.z = 0.5;
      for (const dx of [-0.12, 0.12]) s.rod([at.x + r + dx, at.y - 0.3, at.z + r * 0.4], [at.x + r + dx * 1.8, at.y - 0.62, at.z + r * 0.4], 0.035, bag.material as THREE.Material);
    }

    // The bright skirt where it touches the ground.
    const skirtR = foot * mix(1.8, 6.5, a.skirt);
    const bright = new THREE.MeshStandardMaterial({ color: pale, roughness: 1, emissive: pale, emissiveIntensity: mix(0.05, 0.3, mood.cheer) });
    const puffs = Math.round(mix(5, 16, a.skirt));
    for (let i = 0; i < puffs; i++) {
      const angle = (i / puffs) * Math.PI * 2 + random(), r = skirtR * mix(0.35, 1, random());
      const drag = a.skirt > 0.6 ? -random() * skirtR * 1.2 : 0;
      const size = foot * mix(0.6, 1.4, random()) * mix(0.8, 1.2, a.skirt);
      s.ball([size * 1.3, size * 0.75, size * 1.3], [Math.cos(angle) * r + drag, size * 0.3, Math.sin(angle) * r], bright, 10);
    }
    s.cylinder(skirtR * 0.9, skirtR * 1.1, 0.03, [0, 0.015, 0], bright, 20).castShadow = false;
    // Ragged top: a few loose puffs where the whirl gives out.
    const haze = new THREE.MeshStandardMaterial({ color: base.clone().lerp(pale, 0.5), roughness: 1, transparent: true, opacity: 0.38, depthWrite: false });
    for (let strand = 0; strand < strands; strand++)
      for (let i = 0; i < (a.form === 'ragged' ? 8 : 4); i++) {
        const t = a.form === 'ragged' ? mix(0.35, 1.04, random()) : mix(0.9, 1.05, random());
        const at = centreAt(Math.min(t, 1), strand), r = Math.min(radiusAt(Math.min(t, 1)), foot * 4) * 0.8;
        const puff = s.ball([r * (0.8 + random()), r * 0.6, r * (0.8 + random())], [at.x + (random() - 0.5) * r * 1.6, t * height, at.z + (random() - 0.5) * r * 1.6], haze, 10);
        puff.castShadow = false;
      }

    if (a.track) {
      const scour = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.45), roughness: 1 });
      const length = Math.min(2 + height * 0.22, 4.2), steps = 30;
      const marks = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.014, 12), scour, steps);
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        dummy.position.set(-t * length, 0.008, Math.sin(t * 5 + phase) * 0.7 * t + Math.sin(t * 13) * 0.15 * t);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(foot * mix(1.5, 1.1, t), 1, foot * mix(1.5, 1.1, t));
        dummy.updateMatrix();
        marks.setMatrixAt(i, dummy.matrix);
      }
      marks.receiveShadow = true;
      s.root.add(marks);
    }

    const rate = mix(0.5, 4, mood.energy);
    return s.finish({
      update: (dt) => {
        coreMap.offset.x -= dt * rate * 0.35;
        coreMap.offset.y -= dt * rate * 0.06;
        veilMap.offset.x -= dt * rate * 0.22;
        for (const { mesh, grains, flat } of swarms) {
          for (const grain of grains) {
            grain.angle += dt * rate * grain.spin * 1.6;
            grain.t += dt * rate * grain.rise * 0.25;
            if (grain.t > 1) grain.t -= 1;
          }
          layout(mesh, grains, flat);
        }
      },
    });
  },
});
