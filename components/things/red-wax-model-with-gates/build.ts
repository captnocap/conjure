import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

/** Push vertices along their normals by smooth waves: tool marks and thumb dents in soft wax. */
function dented(geometry: THREE.BufferGeometry, amount: number, phase: number) {
  if (amount <= 0) return geometry;
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const normal = geometry.attributes.normal as THREE.BufferAttribute;
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    n.fromBufferAttribute(normal, i);
    const wave = Math.sin(p.x * 60 + phase) * Math.sin(p.y * 55 + phase * 0.7) * Math.sin(p.z * 70 + phase * 1.3);
    p.addScaledVector(n, wave * amount);
    position.setXYZ(i, p.x, p.y, p.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** A pencil sketch of the subject on cartridge paper, pinned at the corners. */
function sketch(random: () => number, subject: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 320;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#efe8d6';
  c.fillRect(0, 0, 256, 320);
  for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(120,100,70,${random() * 0.12})`; c.fillRect(random() * 256, random() * 320, 2, 2); }
  c.strokeStyle = 'rgba(50,40,40,0.85)';
  c.lineWidth = 2;
  const wobble = (x: number, y: number) => [x + (random() - 0.5) * 6, y + (random() - 0.5) * 6] as const;
  const stroke = (points: readonly (readonly [number, number])[]) => {
    for (let pass = 0; pass < 2; pass++) {
      c.beginPath();
      points.forEach(([x, y], i) => { const [wx, wy] = wobble(x, y); if (i) c.lineTo(wx, wy); else c.moveTo(wx, wy); });
      c.stroke();
    }
  };
  const circle = (x: number, y: number, r: number) => { for (let pass = 0; pass < 2; pass++) { c.beginPath(); c.ellipse(x + (random() - 0.5) * 4, y + (random() - 0.5) * 4, r, r * 1.1, 0, 0, 7); c.stroke(); } };
  if (subject === 'figure') { circle(128, 60, 22); stroke([[128, 82], [128, 190]]); stroke([[100, 100], [128, 92], [156, 100]]); stroke([[100, 100], [92, 170]]); stroke([[156, 100], [166, 170]]); stroke([[128, 190], [108, 280]]); stroke([[128, 190], [150, 280]]); }
  else if (subject === 'bust') { circle(128, 90, 34); stroke([[128, 124], [128, 150]]); stroke([[60, 200], [90, 160], [166, 160], [196, 200]]); stroke([[60, 200], [60, 250], [196, 250], [196, 200]]); }
  else if (subject === 'horse') { stroke([[60, 200], [70, 150], [180, 150], [190, 200]]); stroke([[180, 150], [205, 90], [240, 95]]); stroke([[205, 90], [230, 70]]); for (const x of [70, 95, 165, 185]) stroke([[x, 190], [x, 270]]); stroke([[60, 160], [40, 200]]); }
  else if (subject === 'heron') { stroke([[128, 160], [120, 100], [150, 60], [190, 70]]); circle(140, 150, 30); for (const x of [128, 148]) stroke([[x, 180], [x, 290]]); }
  else { circle(128, 200, 50); circle(128, 120, 36); stroke([[70, 200], [190, 140]]); }
  for (let i = 0; i < 6; i++) { c.strokeStyle = 'rgba(50,40,40,0.25)'; c.lineWidth = 1; stroke([[40 + random() * 60, 40 + random() * 240], [60 + random() * 100, 40 + random() * 240]]); }
  c.fillStyle = '#c0372b';
  for (const [x, y] of [[14, 14], [242, 14], [14, 306], [242, 306]]) { c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    subject: choice('What is the wax model of?', {
      figure: 'A standing figure, one arm raised, about forearm high.',
      bust: 'A portrait head and shoulders on a small block.',
      horse: 'A horse mid-stride, head up.',
      heron: 'A heron on two thin legs, neck curled.',
      abstract: 'An abstract: three swelling forms threaded on a loop.',
    }),
    finish: score('How finished is the wax?', ['A rough lump, barely blocked out, thumb-dented all over', 'Blocked in, the pose clear, tool marks everywhere', 'Smoothed and detailed, nearly ready for the shell']),
    gates: score('How much gating has been attached?', ['None yet, just the bare wax', 'A main sprue and a couple of gates', 'A full cage of runners and vents']),
    wax: choice('What colour is the wax?', {
      oxblood: 'Dark oxblood red, the classic foundry wax.',
      brown: 'Warm brown microcrystalline wax.',
      green: 'Pale sea-green modelling wax.',
    }),
    stand: choice('What does it stand on?', {
      board: 'A scarred plywood board.',
      turntable: 'A cast-iron banding wheel on a short stem.',
      tray: 'A dented baking tray.',
    }),
    tools: choice('What tools lie on the board?', {
      knife: 'A wax knife, a steel spatula and a drift of shavings.',
      loops: 'Wire loop tools, a brush and a rag.',
      heated: 'An electric wax pen with a trailing cord and a small gas torch.',
      none: 'Nothing: the board has been cleared.',
    }),
    lamp: noul('Is the alcohol lamp lit, a small blue flame beside the model?'),
    sketch: noul('Is a pencil sketch of the subject pinned on a board behind it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const waxHex = { oxblood: '#5e1a1e', brown: '#6b4a2a', green: '#8fae8a' }[a.wax];
    const wax = new THREE.MeshStandardMaterial({ color: new THREE.Color(waxHex).lerp(new THREE.Color('#8b8275'), mood.wear * 0.1), roughness: mix(0.55, 0.3, a.finish), metalness: 0 });
    const wood = s.material('#b89060', { roughness: 0.85 });
    const steel = s.material('#9a9ea2', { metalness: 0.8, roughness: 0.35 });
    const dark = s.material('#2a2b2e', { roughness: 0.7 });
    const dent = mix(0.006, 0, a.finish);

    // ---- What it stands on.
    let top = 0.018;
    if (a.stand === 'board') {
      s.box([0.6, 0.018, 0.42], [0, 0.009, 0], wood);
      for (let i = 0; i < 5; i++) s.box([0.1 + random() * 0.2, 0.001, 0.004], [(random() - 0.5) * 0.45, 0.019, (random() - 0.5) * 0.35], s.material('#6e5438')).rotation.y = random() * 3;
    } else if (a.stand === 'turntable') {
      s.cylinder(0.19, 0.19, 0.012, [0, 0.07, 0], dark, 32);
      s.cylinder(0.03, 0.03, 0.06, [0, 0.035, 0], dark, 12);
      s.cylinder(0.14, 0.15, 0.012, [0, 0.006, 0], dark, 28);
      top = 0.076;
    } else {
      const tray = s.material('#8e8a80', { metalness: 0.7, roughness: 0.45 });
      s.box([0.5, 0.006, 0.36], [0, 0.003, 0], tray);
      for (const [x, z, w, d] of [[0, 0.18, 0.5, 0.01], [0, -0.18, 0.5, 0.01], [0.25, 0, 0.01, 0.36], [-0.25, 0, 0.01, 0.36]]) s.box([w, 0.03, d], [x, 0.015, z], tray);
      top = 0.006;
    }

    // ---- The wax itself: soft primitives in one material, standing on a wax pad.
    const model = new THREE.Group();
    model.position.y = top;
    s.root.add(model);
    let phase = random() * 10;
    const part = (geometry: THREE.BufferGeometry, at: P3, rotation: P3 = [0, 0, 0], scale: P3 = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(dented(geometry, dent, (phase += 2.1)), wax);
      mesh.position.set(...at);
      mesh.rotation.set(...rotation);
      mesh.scale.set(...scale);
      mesh.castShadow = mesh.receiveShadow = true;
      model.add(mesh);
      return mesh;
    };
    const sphere = (r: number) => new THREE.SphereGeometry(r, 20, 14);
    const capsule = (r: number, length: number) => new THREE.CapsuleGeometry(r, length, 5, 16);
    // Where gates may attach: [point, outward direction] pairs on the model.
    const anchors: P3[] = [];
    const base = 0.012;
    part(new THREE.CylinderGeometry(0.11, 0.12, base, 20), [0, base / 2, 0]);
    if (a.subject === 'figure') {
      const H = 0.42;
      for (const side of [-1, 1]) part(capsule(0.02 * H, 0.42 * H), [side * 0.06 * H, 0.25 * H, 0]);
      part(capsule(0.065 * H, 0.3 * H), [0, 0.62 * H, 0]);
      part(sphere(0.07 * H), [0, 0.9 * H, 0.01 * H], [0, 0, 0], [1, 1.15, 1]);
      part(capsule(0.022 * H, 0.32 * H), [-0.11 * H, 0.58 * H, 0.02 * H], [0, 0, -0.15]);
      part(capsule(0.022 * H, 0.32 * H), [0.14 * H, 0.9 * H, 0.02 * H], [0, 0, -0.5]);
      anchors.push([0, 0.98 * H, 0], [-0.12 * H, 0.42 * H, 0], [0.19 * H, 1.04 * H, 0], [0.06 * H, 0.1 * H, 0], [-0.06 * H, 0.1 * H, 0], [0.08 * H, 0.7 * H, 0]);
    } else if (a.subject === 'bust') {
      part(new THREE.BoxGeometry(0.1, 0.06, 0.09, 4, 3, 4), [0, 0.04, 0]);
      part(sphere(0.09), [0, 0.11, 0], [0, 0, 0], [1.3, 0.55, 0.8]);
      part(capsule(0.028, 0.035), [0, 0.17, 0]);
      part(sphere(0.06), [0, 0.24, 0.01], [0, 0, 0], [0.9, 1.15, 1]);
      anchors.push([0, 0.31, 0], [0.11, 0.11, 0], [-0.11, 0.11, 0], [0, 0.04, 0.05]);
    } else if (a.subject === 'horse') {
      part(sphere(0.07), [0, 0.19, 0], [0, 0, 0], [1.7, 0.95, 0.8]);
      part(capsule(0.035, 0.1), [0.11, 0.27, 0], [0, 0, -0.7]);
      part(sphere(0.035), [0.17, 0.33, 0], [0, 0, 0.4], [1.6, 0.9, 0.7]);
      for (const [x, z, lean] of [[-0.07, -0.03, 0.3], [-0.08, 0.03, -0.2], [0.07, -0.03, 0.2], [0.09, 0.03, -0.35]]) part(capsule(0.016, 0.12), [x, 0.085, z], [0, 0, lean]);
      part(capsule(0.014, 0.1), [-0.13, 0.2, 0], [0, 0, 0.9]);
      anchors.push([0.2, 0.36, 0], [-0.15, 0.24, 0], [0, 0.26, 0], [0.09, 0.015, 0.03], [-0.08, 0.015, -0.03]);
    } else if (a.subject === 'heron') {
      for (const x of [-0.025, 0.025]) part(capsule(0.006, 0.2), [x, 0.12, 0]);
      part(sphere(0.06), [0, 0.26, 0], [0, 0, 0], [1.4, 0.8, 0.9]);
      part(capsule(0.016, 0.16), [0.03, 0.36, 0], [0, 0, -0.35]);
      part(sphere(0.025), [0.08, 0.45, 0], [0, 0, 0], [1.3, 0.9, 0.9]);
      part(new THREE.ConeGeometry(0.01, 0.08, 8), [0.14, 0.44, 0], [0, 0, -Math.PI / 2 + 0.2]);
      anchors.push([0.1, 0.48, 0], [-0.08, 0.27, 0], [0.025, 0.02, 0], [-0.025, 0.02, 0], [0.05, 0.3, 0]);
    } else {
      part(sphere(0.07), [0, 0.08, 0], [0, 0, 0], [1.1, 0.8, 1.1]);
      part(sphere(0.06), [0.01, 0.2, 0], [0, 0, 0.3], [0.8, 1.2, 0.8]);
      part(sphere(0.05), [-0.02, 0.31, 0.01]);
      part(new THREE.TorusGeometry(0.085, 0.018, 8, 24), [0, 0.2, 0], [0, 0.4, 0.2]);
      anchors.push([0, 0.36, 0], [0.08, 0.08, 0], [-0.08, 0.08, 0], [0, 0.2, 0.08]);
    }
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const modelTop = bounds.max.y - top;

    // ---- Gating: a main sprue beside the model rising to a cup, gates reaching across to it, vents up.
    const gating = a.gates;
    if (gating > 0.1) {
      const side = random() < 0.5 ? -1 : 1;
      const sx = side * (bounds.max.x - bounds.min.x) * 0.55 + side * 0.03, sz = 0.02;
      const cupY = modelTop + 0.06;
      const sprue = part(new THREE.CylinderGeometry(0.012, 0.014, cupY, 10), [sx, cupY / 2, sz]);
      void sprue;
      part(new THREE.CylinderGeometry(0.035, 0.014, 0.045, 12, 1, true), [sx, cupY + 0.02, sz]);
      const count = Math.max(2, Math.round(mix(2, anchors.length + 2, gating)));
      const chosen = anchors.slice().sort(() => random() - 0.5).slice(0, count);
      chosen.forEach((anchor, i) => {
        const [ax, ay, az] = anchor;
        const y = Math.min(cupY - 0.01, Math.max(0.02, ay + (random() - 0.5) * 0.02));
        const rod = part(new THREE.CylinderGeometry(0.0075, 0.0075, 1, 8), [0, 0, 0]);
        const from = new THREE.Vector3(ax, ay, az), to = new THREE.Vector3(sx, y, sz);
        const dir = to.clone().sub(from);
        rod.scale.y = dir.length();
        rod.position.copy(from).lerp(to, 0.5);
        rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        if (gating > 0.6 && i % 2 === 0) {
          const vent = part(new THREE.CylinderGeometry(0.005, 0.005, 0.09, 6), [ax + side * 0.01, ay + 0.045, az]);
          vent.rotation.z = -side * 0.25;
        }
      });
    }

    // ---- The tools, the lamp and the shavings.
    const X = a.stand === 'turntable' ? 0.26 : 0.2, Z = a.stand === 'turntable' ? 0.16 : 0.14;
    const floor = a.stand === 'turntable' ? 0 : top;
    if (a.tools === 'knife') {
      const kx = -X + 0.02, kz = Z;
      s.box([0.11, 0.012, 0.014], [kx, floor + 0.006, kz], wood).rotation.y = 0.3;
      s.box([0.09, 0.003, 0.012], [kx + 0.095, floor + 0.006, kz - 0.03], steel).rotation.y = 0.3;
      s.box([0.16, 0.003, 0.016], [kx + 0.1, floor + 0.0015, kz + 0.08], steel).rotation.y = -0.2;
      const curls = new THREE.InstancedMesh(new THREE.TorusGeometry(0.006, 0.0018, 5, 10, 4.5), wax, 40);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 40; i++) {
        e.set(random() * 3, random() * 3, random() * 3);
        m.compose(new THREE.Vector3(kx + random() * 0.2, floor + 0.006, kz - 0.12 + random() * 0.2), q.setFromEuler(e), new THREE.Vector3(1, 1, 1));
        curls.setMatrixAt(i, m);
      }
      curls.instanceMatrix.needsUpdate = true;
      curls.castShadow = true;
      s.root.add(curls);
    } else if (a.tools === 'loops') {
      for (let i = 0; i < 3; i++) {
        const lx = -X + 0.02 + i * 0.03, lz = Z - 0.02 + i * 0.04;
        s.cylinder(0.006, 0.007, 0.1, [lx, floor + 0.007, lz], wood, 8).rotation.set(Math.PI / 2, 0, 0.3 + i * 0.1);
        s.ring(0.008, 0.0015, [lx + 0.03, floor + 0.007, lz - 0.065], steel).rotation.x = Math.PI / 2;
      }
      s.cylinder(0.005, 0.005, 0.12, [X - 0.05, floor + 0.006, -Z], s.material('#3a3a3c'), 8).rotation.set(Math.PI / 2, 0, 0.5);
      s.box([0.12, 0.01, 0.08], [X - 0.08, floor + 0.005, Z - 0.02], s.material('#c9bfa7', { roughness: 1 })).rotation.y = 0.4;
    } else if (a.tools === 'heated') {
      s.cylinder(0.009, 0.011, 0.13, [-X + 0.03, floor + 0.01, Z], s.material('#2f5a9a'), 10).rotation.set(Math.PI / 2, 0, 0.4);
      s.cylinder(0.003, 0.003, 0.05, [-X + 0.09, floor + 0.01, Z - 0.04], steel, 6).rotation.set(Math.PI / 2, 0, 0.4);
      s.tube([[-X - 0.02, floor + 0.005, Z + 0.03], [-X - 0.1, floor + 0.004, Z + 0.1], [-X - 0.16, floor + 0.003, Z - 0.05], [-X - 0.22, 0.002, Z - 0.1]], 0.003, dark);
      s.cylinder(0.02, 0.02, 0.09, [X - 0.04, floor + 0.045, -Z + 0.02], s.material('#d4a017', { metalness: 0.4 }), 14);
      s.cylinder(0.008, 0.012, 0.05, [X - 0.04, floor + 0.11, -Z + 0.02], steel, 10);
    }
    let flame: THREE.Mesh | null = null;
    if (a.lamp) {
      const lx = X - 0.03, lz = Z - 0.01;
      s.lathe([[0.028, 0], [0.03, 0.01], [0.032, 0.035], [0.012, 0.055], [0.012, 0.065], [0, 0.065]], new THREE.MeshPhysicalMaterial({ color: '#dfe8ef', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }), [lx, floor, lz]);
      s.cylinder(0.026, 0.028, 0.03, [lx, floor + 0.016, lz], s.material('#c9d4ff', { transparent: true, opacity: 0.6, depthWrite: false }), 14);
      s.cylinder(0.006, 0.006, 0.02, [lx, floor + 0.07, lz], s.material('#f1ebdc', { roughness: 1 }), 8);
      flame = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.045, 8), new THREE.MeshStandardMaterial({ color: '#8fc4ff', emissive: '#4a90ff', emissiveIntensity: 2.5, transparent: true, opacity: 0.8, depthWrite: false }));
      flame.position.set(lx, floor + 0.1, lz);
      flame.castShadow = flame.receiveShadow = false;
      s.root.add(flame);
    }

    // ---- The sketch board behind.
    if (a.sketch) {
      const bx = 0.05, bz = -Z - 0.08;
      const board = s.box([0.3, 0.37, 0.01], [bx, 0.2, bz], s.material('#8b7355', { roughness: 0.9 }));
      board.rotation.x = -0.18;
      board.rotation.y = -0.1;
      const paper = s.mesh(new THREE.PlaneGeometry(0.24, 0.3), new THREE.MeshStandardMaterial({ map: sketch(random, a.subject), roughness: 0.95 }), [bx, 0.205, bz + 0.0065]);
      paper.rotation.copy(board.rotation);
      paper.position.add(new THREE.Vector3(0, 0, 0.0065).applyEuler(board.rotation)).sub(new THREE.Vector3(0, 0, 0.0065));
      s.box([0.03, 0.08, 0.03], [bx - 0.08, 0.04, bz + 0.06], wood).rotation.x = 0.4;
      s.box([0.03, 0.08, 0.03], [bx + 0.08, 0.04, bz + 0.06], wood).rotation.x = 0.4;
    }

    const flicker = mix(0.5, 2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (flame) {
          flame.scale.set(1 + Math.sin(time * 11 * flicker) * 0.12, 1 + Math.sin(time * 7 * flicker + 1) * 0.2, 1);
          flame.rotation.z = Math.sin(time * 9 * flicker) * 0.12;
        }
      },
    });
  },
});
