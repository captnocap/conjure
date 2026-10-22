import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { SAND, bed, lump, rest, strew, type Speck } from './grains';

const COLOURS = {
  porcelain: 'Glazed porcelain white.',
  pink: 'Coral pink, the colour of pink-sand beaches.',
  amber: 'Glassy amber, thin enough to glow.',
  chalk: 'Dull chalk grey, a fossil out of a cliff.',
  rust: 'Tan with rusty staining in the seams.',
  green: 'Greenish, still tinted by the algae that lived inside it.',
} as const;
const TINT: Record<keyof typeof COLOURS, string> = { porcelain: '#f7f4ec', pink: '#f3a9b0', amber: '#e8b25e', chalk: '#bdbab2', rust: '#d9b48a', green: '#c5d6a2' };

/** A speckle of pores, so the shell reads as perforated rather than plastic. */
function pores(random: () => number, ink: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = ink;
  for (let i = 0; i < 520; i++) {
    ctx.globalAlpha = 0.35 + random() * 0.5;
    ctx.beginPath();
    ctx.arc(random() * 256, random() * 256, 1.6 + random() * 2.6, 0, 6.283);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    form: choice('What shape is the shell?', {
      spiral: 'A flat coil of swelling chambers, like a tiny ammonite or nautilus.',
      cone: 'A low snail-like spire of bubbles winding up to a point.',
      star: 'A lens with blunt spikes all round its rim: a grain of star sand.',
      string: 'A gently curved string of globes, each bigger than the last, like beads.',
      globes: 'A loose cluster of four or five inflated bubbles, a floating kind.',
      flask: 'A single ribbed flask with a narrow neck, a perfume bottle for nobody.',
    }),
    colour: choice('What colour is it?', COLOURS),
    state: choice('What has happened to it?', {
      whole: 'Nothing: it is perfect, as if still lived in.',
      opened: 'The newest chamber is broken open, showing the hollow room inside.',
      drilled: 'A neat round hole has been bored through it by whatever ate the owner.',
      fragment: 'Only a piece survives, with shards lying round it.',
    }),
    spines: noul('Does it still carry its fine radiating spines, as it did when alive and floating?'),
    pose: choice('How does it lie?', {
      upright: 'Standing on edge, displayed like a wheel or a monument.',
      leaning: 'Propped at a slant against a grain of sand.',
      flat: 'Lying flat, as the tide dropped it.',
    }),
    company: choice('What is around it?', {
      alone: 'Nothing at all.',
      sand: 'A small patch of sand grains, each as big as one of its chambers.',
      kin: 'A patch of sand strewn with smaller shells of its own kind: the beach is made of them.',
      ooze: 'Fine pale mud, the sea-floor ooze that becomes chalk.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.03); // modelled in millimetres, shown magnified: a specimen under the lens
    const tint = new THREE.Color(TINT[a.colour]).lerp(new THREE.Color('#a59f93'), mood.wear * 0.3).offsetHSL(0, 0, mix(-0.04, 0.03, mood.cheer));
    const map = pores(random, a.colour === 'chalk' ? '#6f6b63' : a.colour === 'rust' ? '#9a5a2c' : '#8f7f78');
    map.repeat.set(3, 2);
    const glassy = a.colour === 'amber';
    const wall = new THREE.MeshStandardMaterial({ color: tint, map, roughness: glassy ? 0.2 : mix(0.3, 0.75, mood.wear), side: THREE.DoubleSide, emissive: tint, emissiveIntensity: glassy ? 0.3 : 0.06 });
    const hollow = new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(0.32), roughness: 0.9, side: THREE.BackSide });
    const dark = new THREE.MeshStandardMaterial({ color: '#2b2522', roughness: 0.9 });
    const ball = new THREE.SphereGeometry(1, 22, 16);
    const cup = new THREE.SphereGeometry(1, 22, 16, 0, Math.PI * 2, 0.95, Math.PI - 0.95);
    const shell = new THREE.Group();
    type Chamber = { p: THREE.Vector3; s: THREE.Vector3; out: THREE.Vector3 };
    const chambers: Chamber[] = [];
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    let lieOnSide = false; // forms modelled standing that should fall over sideways rather than backwards

    if (a.form === 'spiral') {
      const n = 13, grow = 1.135;
      let r = 0.2;
      for (let i = 0; i < n; i++) {
        const t = i * 0.56 + 1;
        r *= grow;
        const size = r * 0.56;
        chambers.push({ p: V(Math.cos(t) * r, Math.sin(t) * r, 0), s: V(size, size, size * 0.72), out: V(-Math.sin(t), Math.cos(t), 0) });
      }
      chambers.unshift({ p: V(0, 0, 0), s: V(0.22, 0.22, 0.2), out: V(0, 0, 1) });
    } else if (a.form === 'cone') {
      const n = 12;
      let r = 0.12;
      for (let i = 0; i < n; i++) {
        const t = i * 0.95;
        r *= 1.16;
        const size = r * 0.72;
        chambers.push({ p: V(Math.cos(t) * r, 1.05 - i * 0.085 - r * 0.25, Math.sin(t) * r), s: V(size, size * 0.9, size), out: V(-Math.sin(t), -0.15, Math.cos(t)).normalize() });
      }
    } else if (a.form === 'star') {
      chambers.push({ p: V(0, 0, 0), s: V(0.62, 0.62, 0.36), out: V(0, 0, 1) });
      const arms = 5 + Math.floor(random() * 3);
      for (let i = 0; i < arms; i++) {
        const t = (i / arms) * 6.283 + (random() - 0.5) * 0.35, len = 0.55 + random() * 0.3;
        // Each arm is a short run of shrinking beads, blunt at the tip.
        for (let k = 0; k < 4; k++) {
          const d = 0.55 + (k / 3) * len, size = 0.2 - k * 0.038;
          chambers.push({ p: V(Math.cos(t) * d, Math.sin(t) * d, 0), s: V(size * 1.25, size * 1.25, size), out: V(Math.cos(t), Math.sin(t), 0) });
        }
      }
      // Knobbly face.
      for (let i = 0; i < 9; i++) for (const side of [-1, 1]) {
        const t = random() * 6.283, d = random() * 0.42;
        chambers.splice(1, 0, { p: V(Math.cos(t) * d, Math.sin(t) * d, side * 0.3 * (1 - d * 0.9)), s: V(0.1, 0.1, 0.08), out: V(0, 0, side) });
      }
    } else if (a.form === 'string') {
      const n = 6 + Math.floor(random() * 2);
      let y = 0, size = 0.44;
      const bend = (random() - 0.5) * 0.5;
      for (let i = 0; i < n; i++) {
        chambers.unshift({ p: V(Math.sin(i * bend * 0.4) * 0.5, y, 0), s: V(size, size * 1.08, size), out: V(0, -1, 0) });
        y += size * 1.55;
        size *= 0.83;
      }
      chambers.reverse();
      chambers.forEach((c) => c.out.set(0, -1, 0));
      chambers.reverse(); // newest (largest) last
      lieOnSide = true;
    } else if (a.form === 'globes') {
      const n = 4 + Math.floor(random() * 2);
      let r = 0.26;
      for (let i = 0; i < n; i++) {
        const t = i * 1.5;
        r *= 1.25;
        chambers.push({ p: V(Math.cos(t) * r * 0.75, 0.2 + i * 0.05 + (random() - 0.5) * 0.15, Math.sin(t) * r * 0.75), s: V(r * 0.95, r * 0.95, r * 0.95), out: V(Math.cos(t), 0.3, Math.sin(t)).normalize() });
      }
    }

    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, c: Chamber) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(c.p);
      mesh.scale.copy(c.s);
      mesh.castShadow = mesh.receiveShadow = true;
      shell.add(mesh);
      return mesh;
    };
    const shards: Speck[] = [];

    if (a.form === 'flask') {
      // One chamber: a ribbed bottle turned on a lathe, broken at the neck when opened.
      const opened = a.state === 'opened' || a.state === 'fragment';
      const profile: [number, number][] = [[0.02, 0], [0.3, 0.04], [0.56, 0.3], [0.62, 0.62], [0.52, 0.98], [0.3, 1.26], [0.16, 1.42]];
      if (!opened) profile.push([0.11, 1.75], [0.12, 1.98], [0.19, 2.04], [0.17, 2.08], [0.08, 2.08]);
      else profile.push([0.15, 1.5 + random() * 0.1]);
      const geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 36);
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      const ribs = 9 + Math.floor(random() * 5);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
        const k = 1 + 0.09 * Math.cos(Math.atan2(z, x) * ribs) * Math.sin(Math.min(1, y / 1.3) * Math.PI);
        pos.setXYZ(i, x * k, y, z * k);
      }
      geometry.computeVertexNormals();
      const body = new THREE.Mesh(geometry, wall);
      body.castShadow = body.receiveShadow = true;
      shell.add(body);
      if (opened) {
        const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 16), dark);
        inner.position.y = profile.at(-1)![1] - 0.04;
        shell.add(inner);
        shards.push({ x: 0.9, y: 0.1, z: 0.5, size: 0.14, color: tint }, { x: 1.2, y: 0.08, z: 0.1, size: 0.1, color: tint });
      }
      if (a.state === 'drilled') { const hole = new THREE.Mesh(ball, dark); hole.position.set(0.25, 0.7, 0.52); hole.scale.set(0.13, 0.13, 0.05); hole.lookAt(0.6, 0.75, 1.5); shell.add(hole); }
      chambers.push({ p: V(0, 0.65, 0), s: V(0.6, 0.6, 0.6), out: V(0, 1, 0) });
      lieOnSide = true;
    } else {
      let list = chambers;
      if (a.state === 'fragment') {
        const keep = a.form === 'star' ? Math.ceil(list.length * 0.55) : Math.min(list.length, a.form === 'string' ? 3 : 5);
        const lost = a.form === 'star' ? list.slice(keep) : list.slice(0, list.length - keep);
        list = a.form === 'star' ? list.slice(0, keep) : list.slice(list.length - keep);
        lost.slice(0, 7).forEach((c, i) => shards.push({ x: 1.3 + random() * 0.7 * (i % 2 ? 1 : -2.6), y: 0.08, z: 0.4 + random() * 0.8, size: Math.max(0.08, c.s.x * 0.45), color: tint, flat: 0.3 }));
      }
      const last = list.at(-1)!;
      list.forEach((c) => {
        const broken = c === last && (a.state === 'opened' || a.state === 'fragment') && a.form !== 'star';
        const mesh = add(broken ? cup : ball, wall, c);
        if (broken) {
          mesh.quaternion.setFromUnitVectors(V(0, 1, 0), c.out);
          add(cup, hollow, { ...c, s: c.s.clone().multiplyScalar(0.94) }).quaternion.copy(mesh.quaternion);
        }
      });
      if (a.state === 'opened' && a.form === 'star') {
        // A star loses an arm instead.
        const arm = shell.children.splice(shell.children.length - 3, 3);
        arm.forEach((piece, i) => shards.push({ x: 1.4 + i * 0.2, y: 0.08, z: 0.6 - i * 0.2, size: 0.14, color: tint }));
      }
      if (a.state === 'drilled') {
        const big = list.reduce((best, c) => (c.s.x > best.s.x ? c : best), list[0]);
        const n = V(0.25, 0.3, 0.92).normalize();
        const hole = add(ball, dark, { p: big.p.clone().add(n.clone().multiply(big.s).multiplyScalar(0.97)), s: V(big.s.x * 0.32, big.s.x * 0.32, big.s.x * 0.06), out: n });
        hole.lookAt(hole.position.clone().add(n));
      }
      // The mouth of the newest chamber: a dark slot where the animal reached out.
      if (a.state === 'whole' && a.form !== 'star') {
        const mouth = add(ball, dark, { p: last.p.clone().add(last.out.clone().multiply(last.s).multiplyScalar(0.93)), s: V(last.s.x * 0.3, last.s.x * 0.12, last.s.x * 0.3), out: last.out });
        mouth.quaternion.setFromUnitVectors(V(0, 1, 0), last.out);
      }
    }

    let bristles: THREE.Object3D | null = null;
    if (a.spines) {
      const needle = new THREE.CylinderGeometry(0.004, 0.022, 1, 5);
      needle.translate(0, 0.5, 0);
      const glass = new THREE.MeshStandardMaterial({ color: tint.clone().lerp(new THREE.Color('#ffffff'), 0.5), roughness: 0.2, emissive: '#ffffff', emissiveIntensity: 0.2 });
      const hosts = chambers.filter((c) => c.s.x > 0.18);
      const count = 26 + Math.round(mood.density * 30);
      const spines = new THREE.InstancedMesh(needle, glass, count);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < count; i++) {
        const c = hosts[Math.floor(random() * hosts.length)];
        const flatForm = a.form === 'spiral' || a.form === 'star';
        const n = V(random() - 0.5, random() - 0.5, (random() - 0.5) * (flatForm ? 0.5 : 1)).normalize();
        if (c.p.lengthSq() > 0.01 && a.form !== 'string' && a.form !== 'flask') n.add(c.p.clone().setY(a.form === 'cone' || a.form === 'globes' ? 0 : c.p.y).normalize()).normalize();
        q.setFromUnitVectors(V(0, 1, 0), n);
        const len = (0.5 + random() * 0.9) * mix(1, 0.6, mood.wear);
        m.compose(c.p.clone().add(n.clone().multiply(c.s).multiplyScalar(0.9)), q, V(1, len, 1));
        spines.setMatrixAt(i, m);
      }
      spines.castShadow = true;
      bristles = spines;
    }

    // Pose.
    const holder = new THREE.Group();
    holder.add(shell);
    const tilt = a.pose === 'flat' ? Math.PI / 2 - 0.08 : a.pose === 'leaning' ? 0.62 : (random() - 0.5) * 0.12;
    if (lieOnSide) shell.rotation.z = -tilt; else shell.rotation.x = -tilt;
    if (a.form === 'cone' || a.form === 'globes') shell.rotation.x = a.pose === 'flat' ? 0 : a.pose === 'leaning' ? -0.5 : (random() - 0.5) * 0.2;
    holder.rotation.y = (random() - 0.5) * 0.5;
    s.root.add(holder);
    rest(holder, a.company === 'ooze' ? -0.06 : 0);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder, true);
    const centre = box.getCenter(V(0, 0, 0)), span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    holder.position.x -= centre.x;
    holder.position.z -= centre.z;
    if (bristles) shell.add(bristles); // added after resting, so the shell lies on its chambers and the spines dig in
    if (a.pose === 'leaning') {
      // The grain it leans on, tucked behind.
      const prop = new THREE.Mesh(lump(random, { detail: 2, amp: 0.2, chips: 3 }), new THREE.MeshStandardMaterial({ color: SAND.tan[1], roughness: 0.5 }));
      const size = (box.max.y - box.min.y) * 0.3;
      prop.scale.set(size * 1.2, size, size);
      if (lieOnSide) prop.position.set(-span * 0.12, size * 0.8, -0.1); else prop.position.set(0, size * 0.8, -span * 0.25 - size * 0.4);
      prop.castShadow = prop.receiveShadow = true;
      s.root.add(prop);
    }

    const reach = Math.max(1.5, span * 0.5 + 0.7);
    if (a.company === 'sand' || a.company === 'kin') s.root.add(bed(random, { radius: reach, grain: 0.24, count: 240 + Math.round(mood.density * 220), palette: SAND.tan }));
    if (a.company === 'kin') {
      // Smaller shells of the same family, simplified to coils of three beads.
      const kin: Speck[] = [];
      const n = 10 + Math.round(mood.density * 14);
      for (let i = 0; i < n; i++) {
        const t = random() * 6.283, r = reach * (0.5 + random() * 0.45), size = 0.13 + random() * 0.1;
        for (let k = 0; k < 3; k++) kin.push({ x: Math.cos(t) * r + Math.cos(k * 2.1) * size * 0.8, y: size * 0.4, z: Math.sin(t) * r + Math.sin(k * 2.1) * size * 0.8, size: size * (0.7 + k * 0.2), color: tint, flat: 0.8 });
      }
      s.root.add(strew(random, kin, ball, new THREE.MeshStandardMaterial({ roughness: 0.4 })));
    }
    if (a.company === 'ooze') {
      const mud = s.cylinder(reach * 0.95, reach * 1.05, 0.14, [0, -0.07, 0], s.material('#e4dfd2', { roughness: 0.95 }), 40);
      mud.castShadow = false;
      const dots: Speck[] = [];
      for (let i = 0; i < 90; i++) { const t = random() * 6.283, r = Math.sqrt(random()) * reach * 0.9; dots.push({ x: Math.cos(t) * r, y: 0, z: Math.sin(t) * r, size: 0.04 + random() * 0.07, color: random() < 0.3 ? '#bdb6a6' : '#f4f0e6', flat: 0.4 }); }
      s.root.add(strew(random, dots, ball, new THREE.MeshStandardMaterial({ roughness: 0.8 })));
    }
    if (shards.length) {
      shards.forEach((shard) => { const r = Math.hypot(shard.x, shard.z), k = Math.min(1, (reach * 0.85) / r); shard.x *= k; shard.z *= k; });
      s.root.add(strew(random, shards, cup, wall));
    }

    return s.finish({ footprint: reach * 0.03 * 0.8 });
  },
});
