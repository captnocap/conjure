import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, visibleBounds } from '@conjure/kit';

// One unit is the widest half-width of a crown, in metres, at each scale.
const UNITS: Record<string, number> = { cosmic: 5, planetary: 5, landscape: 5, street: 1.5, room: 0.4, tabletop: 0.05, macro: 0.012 };

type Keys = readonly (readonly [number, number, number, number])[];
// Crown profiles from the neck (v = 0) to the biting surface (v = 1): [v, half-width, half-depth, height].
const KINDS: Record<'molar' | 'incisor' | 'canine' | 'child', { power: number; tall: number; keys: Keys; cusps: 'four' | 'edge' | 'none'; amp: number; root: number; roots: number }> = {
  molar: { power: 3.2, tall: 1.6, keys: [[0, 0.74, 0.68, 0], [0.15, 0.86, 0.8, 0.14], [0.45, 1, 0.92, 0.48], [0.7, 0.97, 0.9, 0.76], [0.82, 0.86, 0.8, 0.9], [0.92, 0.55, 0.5, 0.97], [1, 0, 0, 0.95]], cusps: 'four', amp: 0.34, root: 1.9, roots: 2 },
  incisor: { power: 2.4, tall: 2, keys: [[0, 0.55, 0.5, 0], [0.25, 0.78, 0.58, 0.25], [0.6, 0.9, 0.42, 0.6], [0.9, 0.92, 0.16, 0.9], [0.98, 0.88, 0.05, 0.99], [1, 0.84, 0, 1]], cusps: 'edge', amp: 0.05, root: 2.2, roots: 1 },
  canine: { power: 2, tall: 2.2, keys: [[0, 0.6, 0.55, 0], [0.2, 0.8, 0.7, 0.2], [0.45, 0.86, 0.72, 0.45], [0.75, 0.56, 0.45, 0.76], [0.92, 0.22, 0.18, 0.93], [1, 0, 0, 1]], cusps: 'none', amp: 0, root: 2.5, roots: 1 },
  child: { power: 2.6, tall: 1.15, keys: [[0, 0.72, 0.68, 0], [0.4, 1, 0.95, 0.4], [0.75, 0.92, 0.86, 0.76], [0.9, 0.55, 0.5, 0.94], [1, 0, 0, 0.92]], cusps: 'four', amp: 0.17, root: 1.0, roots: 3 },
};
const at = (keys: Keys, v: number, column: 1 | 2 | 3) => {
  for (let i = 1; i < keys.length; i++) {
    if (v <= keys[i][0]) {
      const u = (v - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
      return mix(keys[i - 1][column], keys[i][column], column === 3 ? u : u * u * (3 - 2 * u));
    }
  }
  return keys[keys.length - 1][column];
};

export default defineThing({
  questions: {
    arrangement: choice('How are the teeth arranged?', {
      single: 'One tooth standing upright and alone, like a menhir.',
      leaning: 'One tooth leaning far over, half sunk, about to fall.',
      henge: 'A ring of standing teeth like a stone circle.',
      colonnade: 'A straight row of them like a ruined colonnade, one toppled.',
    }),
    kind: choice('What kind of tooth?', {
      molar: 'A broad molar with four cusps and two roots, the tooth everyone draws.',
      incisor: 'A flat front tooth, a tall blade with a chisel edge.',
      canine: 'A pointed canine, a fang.',
      child: "A child's milk tooth: small, round and nearly rootless.",
    }),
    condition: choice('What condition is it in?', {
      clean: 'Clean polished ivory.',
      cavity: 'A black cavity big enough for a doorway, with a ladder up to it.',
      cracked: 'Split by long dark cracks.',
      gold: 'Capped in bright gold.',
      mossy: 'Green with moss and lichen.',
    }),
    foot: choice('What is at its foot?', {
      nothing: 'Nothing but the ground.',
      offerings: 'Offerings: candles, bowls and flowers left by believers.',
      rubble: 'Rubble: shards of enamel broken off and lying about.',
      brush: 'A toothbrush leaning against it like a ladder, absurdly small.',
    }),
    whose: choice('Whose tooth was it?', {
      human: 'Human, only enormous.',
      ape: 'A giant ape: heavier, yellowed, with longer roots and fangs.',
      unknown: 'Unknown: pale blue and faintly glowing, with too many points and roots.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const U = (UNITS[context.scale] ?? 1.5) * mix(0.9, 1.1, random());
    const kind = KINDS[a.kind];
    const ape = a.whose === 'ape', alien = a.whose === 'unknown';
    const tall = kind.tall * U * (ape && a.kind === 'canine' ? 1.45 : 1), wide = ape ? 1.15 : 1;
    const rootLong = kind.root * U * (ape ? 1.2 : 1), rootCount = alien ? kind.roots + 2 : kind.roots;
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, where: readonly [number, number, number] = [0, 0, 0], parent: THREE.Object3D = root) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...where);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const rod = (from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material, parent: THREE.Object3D = root) => {
      const mesh = add(new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 7), material, [0, 0, 0], parent);
      mesh.position.copy(from).add(to).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      return mesh;
    };

    // The crown: stacked rounded-square rings, with the cusps pushed up out of the top.
    const power = (c: number) => Math.sign(c) * Math.abs(c) ** (2 / kind.power);
    const surface = (v: number, theta: number) => {
      const rx = at(kind.keys, v, 1) * U * wide, rz = at(kind.keys, v, 2) * U * wide;
      const x = rx * power(Math.cos(theta)), z = rz * power(Math.sin(theta));
      const lift = Math.min(1, Math.max(0, (v - 0.62) / 0.23));
      let cusp = 0;
      if (alien && kind.cusps !== 'edge') cusp = 0.45 * U * (0.5 + 0.5 * Math.cos(theta * 6)) * Math.hypot(x, z) / U;
      else if (kind.cusps === 'four') { const bump = (p: number) => Math.exp(-(((Math.abs(p) - 0.5 * U * wide) / (0.3 * U)) ** 2)); cusp = kind.amp * U * bump(x) * bump(z); }
      else if (kind.cusps === 'edge') cusp = kind.amp * U * Math.cos(x / (U * wide) * Math.PI * 3);
      const curve = a.kind === 'canine' ? -0.28 * U * (ape ? 2 : 1) * v * v : 0;
      return new THREE.Vector3(x, at(kind.keys, v, 3) * tall + cusp * lift * lift * (3 - 2 * lift), z + curve);
    };
    const crown = (from: number) => {
      const rings = 30, segments = 44, positions: number[] = [], uvs: number[] = [], indices: number[] = [];
      for (let i = 0; i <= rings; i++) {
        const v = mix(from, 1, i / rings);
        for (let j = 0; j <= segments; j++) {
          const p = surface(v, j / segments * Math.PI * 2);
          positions.push(p.x, p.y, p.z);
          uvs.push(j / segments, v);
        }
      }
      for (let i = 0; i < rings; i++) for (let j = 0; j < segments; j++) {
        const p = i * (segments + 1) + j, q = p + segments + 1;
        indices.push(p, q, p + 1, p + 1, q, q + 1);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    };

    // Enamel is painted: stains at the neck, then whatever has happened to it.
    const ivory = new THREE.Color(ape ? '#e6d3a3' : alien ? '#cfe6ea' : '#f3ecdc').lerp(new THREE.Color('#bda982'), mood.wear * 0.35);
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const wash = ctx.createLinearGradient(0, 256, 0, 0);
    wash.addColorStop(0, '#' + ivory.clone().lerp(new THREE.Color('#b99a5c'), 0.45).getHexString());
    wash.addColorStop(0.35, '#' + ivory.getHexString());
    wash.addColorStop(1, '#' + ivory.clone().lerp(new THREE.Color('#ffffff'), 0.5).getHexString());
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 60; i++) { ctx.globalAlpha = 0.05 + random() * 0.08; ctx.fillStyle = random() < 0.5 ? '#ffffff' : '#a48a58'; ctx.fillRect(random() * 512, 0, 2 + random() * 5, 256); }
    for (let i = 0; i < mood.wear * 40; i++) { ctx.globalAlpha = 0.1 + random() * 0.2; ctx.fillStyle = '#7a5a2c'; ctx.beginPath(); ctx.ellipse(random() * 512, 256 - random() * random() * 256, 8 + random() * 26, 6 + random() * 18, 0, 0, Math.PI * 2); ctx.fill(); }
    if (a.condition === 'cracked') {
      ctx.strokeStyle = '#2a1c14'; ctx.lineJoin = 'round';
      for (let i = 0; i < 9; i++) {
        let x = (i === 0 ? 0.25 : random()) * 512, y = 0;
        ctx.globalAlpha = 0.9; ctx.lineWidth = i < 3 ? 5 : 2.5; ctx.beginPath(); ctx.moveTo(x, y);
        const reach = i < 3 ? 256 : 60 + random() * 150;
        while (y < reach) {
          x += (random() - 0.5) * 34; y += 8 + random() * 22; ctx.lineTo(x, y);
          if (random() < 0.3) { ctx.lineTo(x + (random() - 0.5) * 70, y + random() * 30); ctx.moveTo(x, y); }
        }
        ctx.stroke();
      }
    }
    if (a.condition === 'mossy') {
      for (let i = 0; i < 520; i++) {
        const low = random() < 0.75, y = low ? 256 - random() * random() * 200 : random() * 60;
        ctx.globalAlpha = 0.35 + random() * 0.5; ctx.fillStyle = ['#4f7a2e', '#6c9a3a', '#3b5f2a', '#9aa84a'][Math.floor(random() * 4)];
        ctx.beginPath(); ctx.ellipse(random() * 512, y, 5 + random() * 20, 4 + random() * 12, random() * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (a.condition === 'cavity') {
      const halo = ctx.createRadialGradient(128, 150, 14, 128, 150, 70);
      halo.addColorStop(0, '#2a1608'); halo.addColorStop(0.5, 'rgba(96,60,24,0.85)'); halo.addColorStop(1, 'rgba(120,84,40,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = halo; ctx.fillRect(40, 60, 180, 180);
    }
    ctx.globalAlpha = 1;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    const glow = alien ? mix(0.15, 0.6, mood.energy) : 0;
    const enamel = new THREE.MeshPhysicalMaterial({ map, roughness: mix(0.22, 0.75, mood.wear), clearcoat: 1 - mood.wear, clearcoatRoughness: 0.2, emissive: alien ? '#3aa6b8' : '#000000', emissiveIntensity: glow });
    const cementum = new THREE.MeshStandardMaterial({ color: ivory.clone().lerp(new THREE.Color(alien ? '#4f8a9a' : '#a87a3c'), 0.62), roughness: 0.85 });
    const gold = new THREE.MeshStandardMaterial({ color: '#e8b63a', metalness: 1, roughness: 0.24, emissive: '#6b4a08', emissiveIntensity: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: '#120b08', roughness: 1 });
    const crownGeometry = crown(0), capGeometry = a.condition === 'gold' ? crown(a.kind === 'child' ? 0.2 : 0.32) : null;
    const single = kind.roots === 1;
    const rootGeometry = new THREE.CylinderGeometry((single ? 0.57 : 0.36) * U * wide, 0.06 * U, rootLong + 0.25 * U, 16, 10);
    const rootPositions = rootGeometry.getAttribute('position');
    for (let i = 0; i < rootPositions.count; i++) {
      const t = 1 - (rootPositions.getY(i) / (rootLong + 0.25 * U) + 0.5);
      if (single) rootPositions.setZ(i, rootPositions.getZ(i) - 0.28 * U * t * t);
      else rootPositions.setX(i, rootPositions.getX(i) + (a.kind === 'child' ? 0.4 : 0.55) * U * Math.sin(t * Math.PI * 0.8) * 0.6);
    }
    rootGeometry.computeVertexNormals();
    const neck = at(kind.keys, 0, 1) * U * wide;

    const tooth = (special: boolean) => {
      const group = new THREE.Group();
      add(crownGeometry, enamel, [0, rootLong, 0], group);
      if (capGeometry && special) { const cap = add(capGeometry, gold, [0, rootLong, 0], group); cap.scale.set(1.04, 1.015, 1.04); }
      if (single) add(rootGeometry, cementum, [0, rootLong / 2 + 0.125 * U, 0], group).scale.z = 0.9;
      else {
        add(new THREE.SphereGeometry(1, 20, 12), cementum, [0, rootLong - 0.02 * U, 0], group).scale.set(neck * 1.02, 0.42 * U, neck * 0.92);
        for (let i = 0; i < rootCount; i++) {
          const angle = i / rootCount * Math.PI * 2 + (rootCount === 3 ? Math.PI / 2 : 0);
          const prong = add(rootGeometry, cementum, [Math.cos(angle) * 0.4 * U * wide, rootLong / 2 + 0.05 * U, -Math.sin(angle) * 0.4 * U * wide], group);
          prong.rotation.y = angle;
        }
      }
      if (a.condition === 'cavity' && special) add(new THREE.SphereGeometry(1, 18, 12), dark, [0, rootLong + at(kind.keys, 0.42, 3) * tall, at(kind.keys, 0.42, 2) * U * wide * 0.9], group).scale.set(0.3 * U, 0.42 * U, 0.2 * U);
      root.add(group);
      return group;
    };

    // Standing them up.
    const sink = rootLong * (a.kind === 'child' ? 0.25 : a.arrangement === 'single' ? 0.38 : 0.5);
    const stand = (group: THREE.Group, x: number, z: number, facing: number, size = 1) => {
      group.scale.setScalar(size);
      group.position.set(x, -sink * size, z);
      group.rotation.set((random() - 0.5) * 0.12 * (0.3 + mood.wear), facing, (random() - 0.5) * 0.14 * (0.3 + mood.wear));
    };
    const topple = (group: THREE.Group, x: number, z: number, facing: number) => {
      group.rotation.set(Math.PI / 2 - 0.08, 0, facing, 'ZYX');
      group.rotation.set(0, facing, Math.PI / 2 - 0.1);
      group.position.set(x, at(kind.keys, 0.45, 1) * U * wide * 0.8, z);
    };
    const sand = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9c59a').lerp(new THREE.Color('#b9ad9a'), 1 - mood.warmth), roughness: 1 });
    const hero = tooth(true);
    const standing: THREE.Group[] = [hero];
    let anchor = new THREE.Vector3(0, 0, 1.9 * U), spread = 1.3 * U;
    if (a.arrangement === 'single') stand(hero, 0, 0, (random() - 0.5) * 0.5);
    if (a.arrangement === 'leaning') {
      const lean = mix(0.42, 0.62, random());
      hero.position.set(0, -sink * 1.1, 0);
      hero.rotation.set(0, (random() - 0.5) * 0.4, -lean);
      add(new THREE.SphereGeometry(1, 24, 12), sand, [-0.7 * U, -0.1 * U, 0]).scale.set(1.15 * U, 0.6 * U, 1.05 * U);
      add(new THREE.SphereGeometry(1, 20, 10), sand, [0.9 * U, -0.05 * U, 0.3 * U]).scale.set(0.8 * U, 0.25 * U, 0.75 * U);
      anchor = new THREE.Vector3(1.4 * U, 0, 1.9 * U);
    }
    if (a.arrangement === 'henge') {
      const number = 6 + Math.round(mood.density * 3), radius = number * 2.75 * U * wide / (Math.PI * 2);
      const gap = mood.wear > 0.35 ? 1 + Math.floor(random() * (number - 1)) : -1;
      for (let i = 0; i < number; i++) {
        const angle = Math.PI / 2 + i / number * Math.PI * 2, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
        const group = i === 0 ? hero : tooth(random() < 0.3);
        if (i === gap) topple(group, x * 1.25, z * 1.25, random() * Math.PI);
        else { stand(group, x, z, Math.PI / 2 - angle, mix(0.82, 1.08, random())); standing.push(group); }
      }
      anchor = new THREE.Vector3(0, 0, 0);
      spread = radius * 0.45;
      if (a.foot === 'offerings') add(new THREE.CylinderGeometry(0.8 * U, 0.95 * U, 0.3 * U, 7), cementum, [0, 0.15 * U, 0]);
    }
    if (a.arrangement === 'colonnade') {
      const number = 4 + Math.round(mood.density * 2), fallen = 1 + Math.floor(random() * (number - 1));
      for (let i = 0; i < number; i++) {
        const x = (i - (number - 1) / 2) * 2.6 * U * wide;
        const group = i === 0 ? hero : tooth(random() < 0.3);
        if (i === fallen) topple(group, x, 1.6 * U, Math.PI / 2 + (random() - 0.5) * 0.8);
        else { stand(group, x, 0, (random() - 0.5) * 0.3, mix(0.88, 1.06, random())); standing.push(group); }
      }
      anchor = new THREE.Vector3(hero.position.x + 0.3 * U, 0, 1.9 * U);
    }
    root.updateMatrixWorld(true);
    const onHero = (v: number, out = 1) => hero.localToWorld(new THREE.Vector3(0, rootLong + at(kind.keys, v, 3) * tall, at(kind.keys, v, 2) * U * wide * out + (a.kind === 'canine' ? -0.28 * U * v * v : 0)));

    // What has been left at its foot.
    const timber = new THREE.MeshStandardMaterial({ color: '#7a5a38', roughness: 0.9 });
    const ladder = (top: THREE.Vector3, foot: THREE.Vector3, width: number, material: THREE.Material) => {
      const across = new THREE.Vector3().subVectors(top, foot).cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(width / 2);
      for (const side of [-1, 1]) rod(foot.clone().addScaledVector(across, side), top.clone().addScaledVector(across, side), width * 0.07, material);
      const rungs = Math.max(4, Math.round(foot.distanceTo(top) / (width * 0.7)));
      for (let i = 1; i < rungs; i++) { const p = foot.clone().lerp(top, i / rungs); rod(p.clone().sub(across), p.clone().add(across), width * 0.05, material); }
    };
    if (a.condition === 'cavity') {
      const door = onHero(0.3, 1.02);
      ladder(door, new THREE.Vector3(door.x + 0.2 * U, 0, door.z + Math.max(0.6 * U, door.y * 0.42)), 0.28 * U, timber);
    }
    const flames: THREE.MeshStandardMaterial[] = [];
    if (a.foot === 'offerings') {
      const wax = new THREE.MeshStandardMaterial({ color: '#f1e6c8', roughness: 0.6 });
      const fire = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff9a2a', emissiveIntensity: 2 });
      flames.push(fire);
      const candles = 5 + Math.round(mood.density * 8);
      for (let i = 0; i < candles; i++) {
        const angle = random() * Math.PI * 2, reach = spread * (0.35 + random() * 0.75), high = (0.18 + random() * 0.4) * U;
        const x = anchor.x + Math.cos(angle) * reach, z = anchor.z + Math.sin(angle) * reach * 0.6;
        add(new THREE.CylinderGeometry(0.06 * U, 0.07 * U, high, 8), wax, [x, high / 2, z]);
        add(new THREE.SphereGeometry(0.05 * U, 8, 6), fire, [x, high + 0.07 * U, z]).scale.y = 1.8;
      }
      for (let i = 0; i < 3; i++) {
        const x = anchor.x + (i - 1) * 0.55 * spread + (random() - 0.5) * 0.2 * U, z = anchor.z + spread * 0.55 + random() * 0.3 * U;
        add(new THREE.SphereGeometry(0.22 * U, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8a4a2c', roughness: 0.8, side: THREE.DoubleSide }), [x, 0.22 * U, z]);
        for (let k = 0; k < 4; k++) add(new THREE.SphereGeometry(0.075 * U, 8, 6), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(random() * 0.16, 0.8, 0.55), roughness: 0.5 }), [x + (random() - 0.5) * 0.2 * U, 0.2 * U, z + (random() - 0.5) * 0.2 * U]);
      }
      const petals = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05 * U, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 60);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < 60; i++) {
        const angle = random() * Math.PI * 2, reach = spread * (0.2 + random());
        matrix.makeScale(1, 0.4, 1).setPosition(anchor.x + Math.cos(angle) * reach, 0.015 * U, anchor.z + Math.sin(angle) * reach * 0.65);
        petals.setMatrixAt(i, matrix);
        petals.setColorAt(i, new THREE.Color().setHSL(random() < 0.5 ? 0.95 : 0.12, 0.85, mix(0.5, 0.7, random())));
      }
      petals.castShadow = true;
      root.add(petals);
    }
    if (a.foot === 'rubble') {
      const shard = new THREE.MeshStandardMaterial({ color: ivory, roughness: 0.5, flatShading: true });
      const pieces = 7 + Math.round(mood.density * 12);
      for (let i = 0; i < pieces; i++) {
        const base = standing[Math.floor(random() * standing.length)].position, angle = random() * Math.PI * 2, reach = (1.2 + random() * 1.5) * U, size = (0.12 + random() * random() * 0.5) * U;
        const piece = add(new THREE.DodecahedronGeometry(size, 0), shard, [base.x + Math.cos(angle) * reach, size * 0.45, base.z + Math.sin(angle) * reach]);
        piece.scale.set(1, 0.5 + random() * 0.5, 0.6 + random() * 0.6);
        piece.rotation.set(random() * 3, random() * 3, random() * 3);
      }
    }
    if (a.foot === 'brush') {
      const plastic = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(mood.cheer > 0.5 ? 0.48 : 0.6, 0.7, 0.5), roughness: 0.3 });
      const top = onHero(0.55, 1.12), foot = new THREE.Vector3(top.x + 0.5 * U, 0, top.z + Math.max(0.8 * U, top.y * 0.4));
      const along = top.clone().sub(foot).normalize();
      const brush = new THREE.Group();
      brush.position.copy(foot);
      brush.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along);
      root.add(brush);
      const long = foot.distanceTo(top) + 0.5 * U;
      add(new THREE.BoxGeometry(0.2 * U, long, 0.09 * U), plastic, [0, long / 2, 0], brush);
      add(new THREE.BoxGeometry(0.26 * U, 0.6 * U, 0.1 * U), plastic, [0, long - 0.3 * U, 0], brush);
      add(new THREE.BoxGeometry(0.22 * U, 0.52 * U, 0.2 * U), new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 1 }), [0, long - 0.3 * U, -0.14 * U], brush);
      add(new THREE.BoxGeometry(0.22 * U, 0.12 * U, 0.21 * U), new THREE.MeshStandardMaterial({ color: '#3d8fe0', roughness: 1 }), [0, long - 0.3 * U, -0.14 * U], brush);
      for (let i = 1; i < 7; i++) add(new THREE.BoxGeometry(0.42 * U, 0.04 * U, 0.05 * U), plastic, [0, i / 7 * (long - 0.7 * U), 0.03 * U], brush);
    }
    if (a.condition === 'mossy') {
      const moss = new THREE.MeshStandardMaterial({ color: '#557d32', roughness: 1 });
      for (const group of standing) for (let i = 0; i < 6; i++) {
        const angle = random() * Math.PI * 2, reach = neck * (0.8 + random() * 0.5);
        add(new THREE.SphereGeometry(1, 8, 6), moss, [group.position.x + Math.cos(angle) * reach, 0.03 * U, group.position.z + Math.sin(angle) * reach]).scale.set((0.2 + random() * 0.25) * U, (0.1 + random() * 0.12) * U, (0.2 + random() * 0.25) * U);
      }
    }

    const centre = visibleBounds(root).getCenter(new THREE.Vector3());
    const body = new THREE.Group();
    body.add(root);
    root.position.set(-centre.x, 0, -centre.z);
    const beat = random() * 6;
    return {
      object: body,
      update(_dt, time) {
        for (const fire of flames) fire.emissiveIntensity = 1.6 + Math.sin(time * mix(4, 14, mood.energy) + beat) * 0.5;
        if (alien) enamel.emissiveIntensity = glow * (1 + 0.4 * Math.sin(time * mix(0.5, 2.5, mood.energy) + beat));
      },
      dispose() { map.dispose(); disposeTree(body); },
    };
  },
});
