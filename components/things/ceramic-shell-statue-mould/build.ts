import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

/** Push every vertex along its normal by smooth position-based waves, so a primitive reads as a lumpy dipped shell. */
function lumpy(geometry: THREE.BufferGeometry, amount: number, phase: number) {
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const normal = geometry.attributes.normal as THREE.BufferAttribute;
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    n.fromBufferAttribute(normal, i);
    const wave = Math.sin(p.x * 23 + phase) * Math.sin(p.y * 19 + phase * 0.7) * Math.sin(p.z * 27 + phase * 1.3)
      + 0.5 * Math.sin(p.x * 51 + p.y * 47 + phase) * Math.cos(p.z * 43 - phase);
    p.addScaledVector(n, wave * amount);
    position.setXYZ(i, p.x, p.y, p.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** The dipped ceramic slurry: chalk white with grit, a few cracks, and scorch creeping up from the bottom. */
function shellTexture(random: () => number, scorch: number, cracks: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#ebe6dc';
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const g = 150 + random() * 90;
    c.fillStyle = `rgba(${g},${g - 6},${g - 14},${0.25 + random() * 0.4})`;
    c.fillRect(random() * 256, random() * 256, 1 + random() * 2.5, 1 + random() * 2.5);
  }
  for (let i = 0; i < 14; i++) {
    c.fillStyle = `rgba(120,110,95,${0.08 + random() * 0.12})`;
    c.beginPath();
    c.ellipse(random() * 256, random() * 256, 8 + random() * 30, 6 + random() * 20, random() * 3, 0, 7);
    c.fill();
  }
  const bottom = c.createLinearGradient(0, 256, 0, 256 - 120 * scorch - 10);
  bottom.addColorStop(0, `rgba(70,50,35,${0.35 + scorch * 0.45})`);
  bottom.addColorStop(1, 'rgba(70,50,35,0)');
  c.fillStyle = bottom;
  c.fillRect(0, 0, 256, 256);
  c.strokeStyle = 'rgba(40,32,28,0.8)';
  for (let i = 0; i < cracks; i++) {
    c.lineWidth = 0.8 + random() * 1.4;
    c.beginPath();
    let x = random() * 256, y = random() * 256;
    c.moveTo(x, y);
    for (let step = 0; step < 6; step++) {
      x += (random() - 0.5) * 50; y += (random() - 0.5) * 50;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    subject: choice('What shape is hidden inside the shell?', {
      figure: 'A standing human figure, arms at its sides, head and shoulders rising out of the sand.',
      bust: 'A portrait bust: head, neck and shoulders on a block.',
      horse: 'A horse, a long body on four legs with a raised neck and head.',
      hand: 'A giant open hand, fingers spread to the sky.',
      abstract: 'An abstract: stacked swelling forms with a ring through them.',
    }),
    state: choice('What state is the mould in?', {
      waiting: 'Empty and waiting, the pour cup a dark open hole, everything chalk white.',
      fresh: 'Just poured: the cup and the riser tops glowing orange, the shell steaming.',
      cooling: 'Poured an hour ago: a dark skin of metal in the cup, faint smoke, the shell browned.',
      burst: 'A run-out: the shell split low down and a tongue of metal has frozen onto the sand.',
    }),
    orientation: choice('Which way up was it buried?', {
      upright: 'Upright, the subject the right way up and the cup on its head.',
      inverted: 'Upside down, as founders prefer: the cup on what will be the base.',
    }),
    risers: score('How many vent risers sprout from it?', ['Just the pour cup', 'Three or four stubby vents', 'A thicket of antlers']),
    pit: choice('What holds the mould?', {
      mound: 'A loose rounded mound of foundry sand on the floor.',
      box: 'A square steel-edged sand box, the sand raked flat.',
      drum: 'A cut-down oil drum packed with sand.',
      bricks: 'A steel plate with firebricks stacked around the shell and a strap holding it.',
    }),
    marked: noul('Is there a number chalked on the shell?'),
    tools: noul('Are a shovel and a pair of tongs dropped beside the pit?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fresh = a.state === 'fresh', cooling = a.state === 'cooling', burst = a.state === 'burst';
    const scorch = fresh ? 0.5 : cooling ? 0.9 : burst ? 0.8 : mix(0.05, 0.4, mood.wear);
    const shell = s.material('#ffffff', { map: shellTexture(random, scorch, Math.round(mix(1, 6, mood.wear) + (burst ? 4 : 0))), roughness: 0.96 });
    const glowColour = new THREE.Color().setHSL(mix(0.08, 0.04, mood.warmth), 1, 0.5);
    const glow = new THREE.MeshStandardMaterial({ color: '#ff6a10', emissive: glowColour, emissiveIntensity: fresh ? 1.3 : 0, roughness: 0.5 });
    const skin = s.material(cooling ? '#3a2a22' : '#5c4a3a', { metalness: 0.6, roughness: 0.6, emissive: '#6a1c00', emissiveIntensity: cooling ? 0.5 : 0 });
    const steel = s.material('#5a5c60', { metalness: 0.7, roughness: 0.5 });
    const sandHex = mood.warmth > 0.5 ? '#c7ad80' : '#b9ab8c';
    const sand = s.material(sandHex, { roughness: 1 });
    const SAND = { mound: 0.48, box: 0.42, drum: 0.5, bricks: 0.3 }[a.pit]; // the top of the sand

    // ---- The subject, as the ceramic coat around it: lumpy primitives in one material.
    const subject = new THREE.Group();
    let phase = random() * 10;
    const part = (geometry: THREE.BufferGeometry, at: P3, rotation: P3 = [0, 0, 0], scale: P3 = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(lumpy(geometry, 0.012, (phase += 1.7)), shell);
      mesh.position.set(...at);
      mesh.rotation.set(...rotation);
      mesh.scale.set(...scale);
      mesh.castShadow = mesh.receiveShadow = true;
      subject.add(mesh);
      return mesh;
    };
    const sphere = (r: number) => new THREE.SphereGeometry(r, 24, 16);
    const capsule = (r: number, length: number) => new THREE.CapsuleGeometry(r, length, 6, 20);
    if (a.subject === 'figure') {
      part(capsule(0.19, 0.9), [0, 0.65, 0]);
      part(sphere(0.15), [0, 1.33, 0.02], [0, 0, 0], [1, 1.15, 1]);
      part(sphere(0.12), [0, 1.14, 0]);
      for (const side of [-1, 1]) {
        part(sphere(0.12), [side * 0.24, 1.08, 0]);
        part(capsule(0.085, 0.55), [side * 0.29, 0.72, 0.02], [0, 0, side * 0.1]);
      }
    } else if (a.subject === 'bust') {
      part(new THREE.BoxGeometry(0.34, 0.2, 0.3, 5, 4, 5), [0, 0.2, 0]);
      part(sphere(0.3), [0, 0.5, 0], [0, 0, 0], [1.25, 0.6, 0.75]);
      part(capsule(0.1, 0.1), [0, 0.72, 0]);
      part(sphere(0.2), [0, 0.98, 0.02], [0, 0, 0], [0.9, 1.15, 1]);
    } else if (a.subject === 'horse') {
      part(sphere(0.3), [0, 0.75, 0], [0, 0, 0], [1.5, 0.95, 0.85]);
      part(capsule(0.15, 0.4), [0.42, 1.05, 0], [0, 0, -0.7]);
      part(sphere(0.14), [0.68, 1.3, 0], [0, 0, 0.5], [1.5, 0.9, 0.75]);
      for (const x of [-0.3, 0.3]) for (const z of [-0.12, 0.12]) part(capsule(0.08, 0.45), [x, 0.4, z]);
      part(capsule(0.07, 0.35), [-0.5, 0.65, 0], [0, 0, 0.6]);
    } else if (a.subject === 'hand') {
      part(capsule(0.14, 0.3), [0, 0.3, 0]);
      part(new THREE.BoxGeometry(0.5, 0.5, 0.2, 6, 6, 4), [0, 0.68, 0]);
      for (let i = 0; i < 4; i++) part(capsule(0.065, 0.42 - Math.abs(i - 1.3) * 0.07), [-0.19 + i * 0.125, 1.13 - Math.abs(i - 1.3) * 0.04, 0], [0, 0, (i - 1.5) * -0.12]);
      part(capsule(0.07, 0.3), [0.33, 0.78, 0.04], [0, 0, -0.9]);
    } else {
      part(sphere(0.25), [0, 0.3, 0], [0, 0, 0], [1.1, 0.8, 1.1]);
      part(sphere(0.22), [0.05, 0.72, 0], [0, 0, 0.3], [0.8, 1.2, 0.8]);
      part(sphere(0.18), [-0.08, 1.15, 0.02]);
      part(new THREE.TorusGeometry(0.3, 0.07, 10, 28), [0.0, 0.75, 0], [0, 0.4, 0.2]);
    }
    if (a.orientation === 'inverted') subject.rotation.z = Math.PI;
    s.root.add(subject);
    subject.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(subject);
    // Bury the shell to the waist: its lower part sits in the sand, below the floor if need be.
    const height = box.max.y - box.min.y;
    subject.position.y += SAND - Math.min(0.75, height * 0.45) - box.min.y;
    subject.updateMatrixWorld(true);
    box.setFromObject(subject);
    const topY = box.max.y;
    const topX = (box.min.x + box.max.x) / 2, topZ = (box.min.z + box.max.z) / 2;

    // ---- The pour cup on top, and the risers.
    const cupY = topY + 0.1;
    s.cylinder(0.07, 0.07, 0.22, [topX, topY, topZ], shell, 14);
    s.mesh(new THREE.CylinderGeometry(0.15, 0.07, 0.2, 18, 1, true), shell, [topX, cupY + 0.1, topZ]);
    const fill = fresh ? glow : cooling || burst ? skin : s.material('#2a2622', { roughness: 0.9 });
    s.cylinder(0.12, 0.12, 0.02, [topX, cupY + (a.state === 'waiting' ? 0.06 : 0.17), topZ], fill, 18);
    const riserCount = Math.round(mix(0, 8, a.risers));
    for (let i = 0; i < riserCount; i++) {
      const angle = random() * Math.PI * 2, r = 0.12 + random() * 0.14;
      const base: P3 = [topX + Math.cos(angle) * r, topY - 0.15 - random() * 0.35, topZ + Math.sin(angle) * r];
      const reach = 0.32 + random() * 0.18;
      const tip: P3 = [topX + Math.cos(angle) * reach, cupY + 0.05 + random() * 0.25, topZ + Math.sin(angle) * reach];
      s.rod(base, tip, 0.03, shell, 0.032);
      const cap = s.mesh(new THREE.CylinderGeometry(0.055, 0.032, 0.07, 10, 1, true), shell, [tip[0], tip[1] + 0.02, tip[2]]);
      void cap;
      if (fresh || cooling) s.cylinder(0.04, 0.04, 0.015, [tip[0], tip[1] + 0.04, tip[2]], fresh ? glow : skin, 10);
    }

    // ---- The pit.
    if (a.pit === 'mound') {
      const profile: [number, number][] = [[0.95, 0], [0.88, 0.05], [0.72, SAND * 0.45], [0.55, SAND * 0.8], [0.35, SAND - 0.02], [0, SAND + 0.02]];
      s.lathe(profile.map(([x, y]): [number, number] => [x * (1 + (x ? (random() - 0.5) * 0.1 : 0)), y]), sand);
    } else if (a.pit === 'box') {
      s.box([1.9, SAND - 0.02, 1.9], [0, (SAND - 0.02) / 2, 0], sand);
      for (const [x, z, w, d] of [[0, 0.95, 2.0, 0.08], [0, -0.95, 2.0, 0.08], [0.95, 0, 0.08, 2.0], [-0.95, 0, 0.08, 2.0]]) s.box([w, SAND + 0.04, d], [x, (SAND + 0.04) / 2, z], steel);
    } else if (a.pit === 'drum') {
      const drum = s.material(['#8d3b2a', '#2d5fa3', '#3a3d41'][Math.floor(random() * 3)], { metalness: 0.3, roughness: 0.6 });
      s.mesh(new THREE.CylinderGeometry(0.62, 0.6, SAND + 0.1, 28, 1, true), drum, [0, (SAND + 0.1) / 2, 0]);
      s.cylinder(0.6, 0.6, 0.03, [0, 0.02, 0], drum, 28);
      s.cylinder(0.6, 0.6, 0.02, [0, SAND, 0], sand, 28);
      s.cylinder(0.63, 0.63, 0.04, [0, SAND * 0.5, 0], drum, 28);
    } else {
      s.box([1.5, 0.03, 1.5], [0, 0.015, 0], steel);
      const brick = s.material('#cfae74', { roughness: 0.95 });
      const bricks: P3[] = [];
      for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 11; i++) {
        const angle = (i + layer * 0.5) / 11 * Math.PI * 2, r = 0.4;
        bricks.push([Math.cos(angle) * r, 0.065 + layer * 0.075, Math.sin(angle) * r]);
      }
      for (const [x, y, z] of bricks) s.box([0.11, 0.07, 0.225], [x, y, z], brick).rotation.y = -Math.atan2(z, x);
      s.ring(0.455, 0.012, [0, 0.14, 0], s.material('#d9c23a', { roughness: 0.8 })).rotation.x = Math.PI / 2;
      s.cylinder(0.38, 0.38, SAND - 0.04, [0, (SAND - 0.04) / 2 + 0.03, 0], sand, 24);
    }
    // Loose grains and clods on the sand.
    const clods = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), s.material(sandHex, { roughness: 1 }), 36);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 36; i++) {
      const angle = random() * Math.PI * 2, r = 0.3 + random() * (a.pit === 'bricks' ? 0.08 : a.pit === 'drum' ? 0.25 : 0.5);
      const size = 0.015 + random() * 0.035;
      m.makeScale(size, size * 0.6, size).setPosition(Math.cos(angle) * r, SAND - 0.03 + (a.pit === 'mound' ? -Math.max(0, r - 0.35) * 0.55 : 0), Math.sin(angle) * r);
      clods.setMatrixAt(i, m);
    }
    clods.instanceMatrix.needsUpdate = true;
    clods.castShadow = clods.receiveShadow = true;
    s.root.add(clods);

    // ---- The run-out: a split in the shell and a frozen tongue of metal on the sand.
    if (burst) {
      const angle = random() * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const edge = box.max.x - topX;
      const crackAt = dir.clone().multiplyScalar(edge * 0.9);
      s.box([0.03, 0.22, 0.012], [crackAt.x + topX, SAND + 0.18, crackAt.z + topZ], skin).rotation.y = -angle + Math.PI / 2;
      const tongue = s.ball([0.14, 0.03, 0.3], [topX + dir.x * (edge + 0.25), SAND, topZ + dir.z * (edge + 0.25)], skin, 12);
      tongue.rotation.y = -angle + Math.PI / 2;
      s.ball([0.08, 0.025, 0.1], [topX + dir.x * (edge + 0.5), SAND - 0.02, topZ + dir.z * (edge + 0.5)], skin, 10);
    }

    // ---- A chalked number.
    if (a.marked) {
      const text = ['No 3', 'No 7', 'B-12', 'RUSH', 'LEFT ARM', 'POUR 2'][Math.floor(random() * 6)];
      const lx = 0.55 + random() * 0.2, lz = 0.6 + random() * 0.2;
      s.rod([lx, SAND - 0.1, lz], [lx, SAND + 0.3, lz], 0.012, s.material('#8a6a42', { roughness: 0.8 }));
      const label = s.label(text, 0.26, 0.11, [lx, SAND + 0.3, lz + 0.015], '#2b2a2c', '#e8e3d9');
      label.rotation.y = 0.35;
    }

    // ---- Tools dropped beside the pit.
    if (a.tools) {
      const handle = s.material('#8a6a42', { roughness: 0.8 });
      const sx = -0.9 - random() * 0.3, sz = 0.6;
      s.rod([sx, 0.03, sz + 0.5], [sx + 0.3, 0.06, sz - 0.55], 0.016, handle);
      s.box([0.22, 0.012, 0.28], [sx + 0.36, 0.02, sz - 0.68], steel).rotation.y = 0.25;
      const tx = 0.95, tz = 0.75;
      s.rod([tx - 0.5, 0.02, tz + 0.1], [tx + 0.5, 0.02, tz - 0.05], 0.012, steel);
      s.rod([tx - 0.5, 0.02, tz + 0.17], [tx + 0.5, 0.02, tz + 0.08], 0.012, steel);
      s.cylinder(0.02, 0.02, 0.05, [tx + 0.2, 0.03, tz + 0.06], steel, 8).rotation.x = Math.PI / 2;
    }

    // ---- Steam or smoke off a hot shell.
    const wisps: { mesh: THREE.Mesh; phase: number }[] = [];
    if (fresh || cooling) {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 128;
      const c = canvas.getContext('2d')!;
      const g = c.createLinearGradient(0, 128, 0, 0);
      g.addColorStop(0, 'rgba(230,220,210,0.7)');
      g.addColorStop(1, 'rgba(230,220,210,0)');
      c.fillStyle = g;
      c.beginPath(); c.ellipse(32, 64, 14, 64, 0, 0, 7); c.fill();
      const texture = new THREE.CanvasTexture(canvas);
      const smoke = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: fresh ? 0.45 : 0.3, depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0; i < 5; i++) {
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.7 + random() * 0.4), smoke);
        plane.position.set(topX + (random() - 0.5) * 0.3, cupY + 0.5 + random() * 0.3, topZ + (random() - 0.5) * 0.3);
        plane.rotation.y = random() * Math.PI;
        plane.castShadow = plane.receiveShadow = false;
        s.root.add(plane);
        wisps.push({ mesh: plane, phase: random() * 6 });
      }
    }
    const energy = mix(0.3, 1.5, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const { mesh, phase: ph } of wisps) {
          mesh.rotation.z = Math.sin(time * energy + ph) * 0.12;
          mesh.position.y += Math.sin(time * 0.8 * energy + ph) * 0.0004;
        }
      },
    });
  },
});
