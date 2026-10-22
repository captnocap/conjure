import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';

/** One block on a metre grid: x, y, z are the block's low corner; w, h, d are fractions of a block. */
type Vox = { x: number; y: number; z: number; c: THREE.ColorRepresentation; w?: number; h?: number; d?: number };

function pixelMap(random: () => number, low = 0.82) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const v = Math.round(255 * mix(low, 1, random()));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
  const map = new THREE.CanvasTexture(canvas);
  map.magFilter = map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  return map;
}

function voxels(s: Sculpture, cubes: readonly Vox[], material: THREE.Material) {
  if (!cubes.length) return null;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, cubes.length);
  const m = new THREE.Matrix4();
  cubes.forEach((v, i) => {
    const w = v.w ?? 1, h = v.h ?? 1, d = v.d ?? 1;
    m.makeScale(w, h, d).setPosition(v.x + w / 2, v.y + h / 2, v.z + d / 2);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(v.c));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor!.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  s.root.add(mesh);
  return mesh;
}

const jitter = (base: string, random: () => number, amount = 0.035) => '#' + new THREE.Color(base).offsetHSL(0, 0, (random() - 0.5) * amount * 2).getHexString();

export default defineThing({
  questions: {
    height: score('How tall is the pillar?', ['Five blocks, barely out of reach', 'Seven blocks', 'Nine blocks', 'Twelve blocks, absurdly high']),
    top: choice('What is on top?', {
      torch: 'A single lit torch.',
      bed: 'A red and white bed, somebody trying to sleep up there.',
      person: 'A blocky person crouched on the top block, hugging their knees.',
      both: 'A crouching person with a torch planted beside them.',
      nothing: 'Nothing: they got down, or never got up.',
    }),
    blocks: choice('What is the pillar made of?', {
      dirt: 'Plain brown dirt blocks.',
      cobble: 'Grey cobblestone.',
      sand: 'Pale sandstone, from a desert.',
      junk: 'Whatever was in the pockets: dirt, planks, cobble and gravel mixed.',
    }),
    knocked: noul('Have a few blocks been knocked out, leaving the rest floating?'),
    base: choice('What circles its base?', {
      nothing: 'Nothing: bare ground.',
      shadows: 'Square-headed dark figures standing around it, looking up.',
      pumpkin: 'A single carved pumpkin with a glowing face, set facing the tower.',
      spiders: 'A few flat dark spider-shapes with red eyes.',
      both: 'Shadows and a glowing pumpkin together.',
    }),
    night: choice('How did the night go?', {
      calm: 'Quietly: nothing touched it.',
      arrows: 'Arrows stuck all up one side of the pillar.',
      crater: 'A blast crater bitten out of the ground beside the base.',
      scorched: 'Scorch marks and a burnt-out torch on the ground.',
      flowers: 'Morning came: flowers have grown around the base.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const map = pixelMap(random);
    const solid = s.material('#ffffff', { map, roughness: 0.92 });
    const glowMat = new THREE.MeshStandardMaterial({ color: '#ffd978', emissive: '#ffb640', emissiveIntensity: mix(0.7, 1.8, 1 - mood.daylight), roughness: 0.6 });
    const cubes: Vox[] = [];
    const glows: Vox[] = [];
    const H = Math.round(mix(5, 12, a.height));
    const palette = { dirt: ['#7a5230'], cobble: ['#8d8f8a'], sand: ['#d4b978'], junk: ['#7a5230', '#8d8f8a', '#b88a4a', '#8a8378', '#7a5230'] }[a.blocks];
    const missing = new Set<number>();
    if (a.knocked) {
      const gaps = 1 + Math.round(random() * Math.min(2, H / 4));
      for (let i = 0; i < gaps; i++) missing.add(2 + Math.floor(random() * (H - 4)));
    }
    for (let y = 0; y < H; y++) {
      if (missing.has(y)) continue;
      const colour = palette[Math.floor(random() * palette.length)];
      cubes.push({ x: 0, y, z: 0, c: jitter(colour, random, a.blocks === 'cobble' ? 0.08 : 0.04) });
    }
    // Knocked-out blocks lie on the ground as small item cubes.
    for (const y of missing) {
      void y;
      cubes.push({ x: 0.8 + random() * 1.4, y: 0, z: -0.8 + random() * 1.6, c: jitter(palette[0], random), w: 0.4, h: 0.4, d: 0.4 });
    }

    // On top.
    const topY = H;
    const oak = s.material('#8a5a2b');
    if (a.top === 'torch' || a.top === 'both') {
      const tx = a.top === 'both' ? 0.82 : 0.5, tz = a.top === 'both' ? 0.18 : 0.5;
      s.box([0.1, 0.7, 0.1], [tx, topY + 0.35, tz], oak);
      glows.push({ x: tx - 0.12, y: topY + 0.7, z: tz - 0.12, c: '#ffd978', w: 0.24, h: 0.24, d: 0.24 });
    }
    if (a.top === 'bed') {
      cubes.push({ x: -0.05, y: topY, z: -0.45, c: '#8a5a2b', w: 1.1, h: 0.25, d: 1.9 });
      cubes.push({ x: 0, y: topY + 0.25, z: -0.4, c: '#c23b3b', w: 1.0, h: 0.2, d: 1.3 });
      cubes.push({ x: 0, y: topY + 0.25, z: 0.9, c: '#f1e9d6', w: 1.0, h: 0.28, d: 0.5 });
    }
    let person: ReturnType<typeof figure> | null = null;
    if (a.top === 'person' || a.top === 'both') {
      const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0'][Math.floor(random() * 4)];
      person = figure(s, {
        height: 1.75, style: 'blocky', pose: 'crouching', gaze: mood.cheer > 0.5 ? 'ahead' : 'down', skin,
        top: ['#3aa8a0', '#4fd4e0', '#a46a3a', '#c23b3b'][Math.floor(random() * 4)], bottom: '#3c4aa8', shoes: '#4a4a4a', hair: 'short',
      });
      person.root.position.set(0.5, topY, 0.5);
      person.root.rotation.y = random() * Math.PI * 2;
      s.root.add(person.root);
    }

    // Around the base.
    const shadows: ReturnType<typeof figure>[] = [];
    if (a.base === 'shadows' || a.base === 'both') {
      const count = 2 + Math.round(random() * 2 + mood.density);
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + random() * 0.8;
        const dist = 1.6 + random() * 1.2;
        const shade = figure(s, { height: 1.75 + random() * 0.25, style: 'blocky', pose: random() < 0.6 ? 'standing' : 'reaching', gaze: 'up', face: 'blank', hair: 'none',
          skin: '#2a4a2a', top: '#2a4a2a', bottom: '#2a4a2a', shoes: '#1a2a1a' });
        shade.root.position.set(0.5 + Math.cos(ang) * dist, 0, 0.5 + Math.sin(ang) * dist);
        shade.root.lookAt(0.5, 0, 0.5);
        s.root.add(shade.root);
        shadows.push(shade);
      }
    }
    if (a.base === 'pumpkin' || a.base === 'both') {
      const px = 0.5 + (random() < 0.5 ? -2.2 : 2.2), pz = 0.5 + (random() - 0.5) * 2;
      cubes.push({ x: px - 0.45, y: 0, z: pz - 0.45, c: '#e58a1f', w: 0.9, h: 0.8, d: 0.9 });
      cubes.push({ x: px - 0.12, y: 0.8, z: pz - 0.12, c: '#3f8d2a', w: 0.24, h: 0.22, d: 0.24 });
      // The carved face looks toward the tower.
      const toward = px < 0.5 ? 1 : -1;
      const fx = px + toward * 0.46;
      glows.push({ x: fx - (toward > 0 ? 0 : 0.03), y: 0.45, z: pz - 0.32, c: '#ffd978', w: 0.03, h: 0.18, d: 0.18 });
      glows.push({ x: fx - (toward > 0 ? 0 : 0.03), y: 0.45, z: pz + 0.14, c: '#ffd978', w: 0.03, h: 0.18, d: 0.18 });
      glows.push({ x: fx - (toward > 0 ? 0 : 0.03), y: 0.15, z: pz - 0.3, c: '#ffd978', w: 0.03, h: 0.12, d: 0.6 });
    }
    if (a.base === 'spiders')
      for (let i = 0; i < 3; i++) {
        const sx = 0.5 + (random() - 0.5) * 4.5, sz = 0.5 + (random() - 0.5) * 4.5;
        if (Math.hypot(sx - 0.5, sz - 0.5) < 1.2) continue;
        cubes.push({ x: sx - 0.45, y: 0.15, z: sz - 0.35, c: '#2a2630', w: 0.9, h: 0.4, d: 0.7 });
        cubes.push({ x: sx - 0.2, y: 0.2, z: sz + 0.3, c: '#2a2630', w: 0.4, h: 0.32, d: 0.4 });
        for (const leg of [-0.3, -0.1, 0.1, 0.3]) for (const side of [-1, 1]) cubes.push({ x: sx + leg, y: 0, z: sz + side * 0.55, c: '#1e1a24', w: 0.08, h: 0.4, d: 0.08 });
        glows.push({ x: sx - 0.12, y: 0.4, z: sz + 0.7, c: '#ff3a3a', w: 0.08, h: 0.08, d: 0.03 });
        glows.push({ x: sx + 0.06, y: 0.4, z: sz + 0.7, c: '#ff3a3a', w: 0.08, h: 0.08, d: 0.03 });
      }

    // How the night went.
    if (a.night === 'arrows') {
      const feather = s.material('#e9e4d6');
      const side = Math.floor(random() * 4);
      for (let i = 0; i < 4 + Math.round(random() * 4); i++) {
        const y = 0.3 + random() * (H - 0.6);
        const along = 0.15 + random() * 0.7;
        const shaft = new THREE.Group();
        shaft.add(s.box([0.03, 0.03, 0.55], [0, 0, 0.2], oak), s.box([0.03, 0.1, 0.12], [0, 0, 0.42], feather));
        const pos = [[1.0, along], [0, along], [along, 1.0], [along, 0]][side];
        shaft.position.set(pos[0], y, pos[1]);
        shaft.rotation.y = [Math.PI / 2, -Math.PI / 2, 0, Math.PI][side];
        shaft.rotation.x = (random() - 0.5) * 0.4;
        s.root.add(shaft);
      }
    }
    if (a.night === 'crater') {
      const cx = 0.5 + (random() < 0.5 ? -1.6 : 1.6), cz = 0.5 + (random() - 0.5) * 1.5;
      cubes.push({ x: cx - 0.9, y: 0, z: cz - 0.9, c: '#4a3520', w: 1.8, h: 0.1, d: 1.8 });
      cubes.push({ x: cx - 0.5, y: 0.1, z: cz - 0.5, c: '#2a1d10', w: 1.0, h: 0.02, d: 1.0 });
      for (let i = 0; i < 8; i++) cubes.push({ x: cx + (random() - 0.5) * 2.6, y: 0, z: cz + (random() - 0.5) * 2.6, c: jitter('#7a5230', random), w: 0.3, h: 0.25, d: 0.3 });
    }
    if (a.night === 'scorched') {
      for (let i = 0; i < 5; i++) cubes.push({ x: 0.5 + (random() - 0.5) * 3, y: 0, z: 0.5 + (random() - 0.5) * 3, c: jitter('#2a2320', random, 0.08), w: 0.4 + random() * 0.5, h: 0.04, d: 0.4 + random() * 0.5 });
      const dead = s.box([0.1, 0.6, 0.1], [1.6, 0.06, 0.9], s.material('#3a2a1a'));
      dead.rotation.z = Math.PI / 2 - 0.1;
      s.box([0.2, 0.2, 0.2], [1.95, 0.1, 0.9], s.material('#2a2320'));
    }
    if (a.night === 'flowers')
      for (let i = 0; i < 10; i++) {
        const ang = random() * Math.PI * 2, dist = 0.9 + random() * 1.8;
        const fx = 0.5 + Math.cos(ang) * dist, fz = 0.5 + Math.sin(ang) * dist;
        cubes.push({ x: fx, y: 0, z: fz, c: '#3f8d2a', w: 0.08, h: 0.35, d: 0.08 });
        cubes.push({ x: fx - 0.1, y: 0.35, z: fz - 0.1, c: ['#e23b3b', '#f4d53a', '#f08ac0', '#ffffff'][i % 4], w: 0.28, h: 0.22, d: 0.28 });
      }
    // A little dirt scatter at the foot, as if blocks were placed in a hurry.
    for (let i = 0; i < 3 + Math.round(mood.wear * 4); i++) cubes.push({ x: 0.5 + (random() - 0.5) * 2.2, y: 0, z: 0.5 + (random() - 0.5) * 2.2, c: jitter(palette[0], random), w: 0.2 + random() * 0.3, h: 0.08, d: 0.2 + random() * 0.3 });

    voxels(s, cubes, solid);
    voxels(s, glows, glowMat);
    const energy = mood.energy;
    const phase = random() * 6;
    return s.finish({
      footprint: 0.7,
      update: (dt, time) => {
        glowMat.emissiveIntensity = mix(0.7, 1.8, 1 - mood.daylight) * (0.92 + Math.sin(time * 8 + phase) * 0.08 * (0.3 + energy));
        person?.update(dt, time);
        for (const shade of shadows) shade.update(dt, time);
      },
    });
  },
});
