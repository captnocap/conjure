import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, matrices: readonly THREE.Matrix4[], colours?: readonly THREE.Color[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, matrices.length));
  mesh.count = matrices.length;
  matrices.forEach((m, i) => {
    mesh.setMatrixAt(i, m);
    if (colours) mesh.setColorAt(i, colours[i]);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const CANS = {
  black: { body: '#17181a', band: '#7cff2a', ink: '#7cff2a', drink: '#2a1a08', name: 'VOLT' },
  blue: { body: '#1b4fd8', band: '#c9d3dc', ink: '#ffffff', drink: '#1a2a6a', name: 'SURGE' },
  red: { body: '#d81f2a', band: '#f2f2ea', ink: '#ffffff', drink: '#3a0a10', name: 'RUSH' },
  yellow: { body: '#f2c21c', band: '#1c1c1e', ink: '#1c1c1e', drink: '#5a4a0a', name: 'JOLT' },
  white: { body: '#f2f2ee', band: '#ff4fa0', ink: '#ff4fa0', drink: '#5a1040', name: 'ZING' },
} as const;

interface Leg { from: THREE.Vector3; to: THREE.Vector3; length: number }

export default defineThing({
  questions: {
    can: choice('What colour is the can?', {
      black: 'Matt black with a lime-green lightning stripe.',
      blue: 'Blue and silver, the classic.',
      red: 'Red and white, a cheap one.',
      yellow: 'Loud yellow with black lettering.',
      white: 'White with a pink zero-sugar stripe.',
    }),
    puddle: choice('What state is the puddle in?', {
      fresh: 'Fresh and glossy, still spreading, fizz at the edge.',
      tacky: 'Half dried: a sticky ring with a wet centre.',
      dried: 'Dried to a dark sticky stain with a tide-mark edge.',
    }),
    trail: score('How long is the ant trail?', ['A short line to the puddle edge', 'Across the floor', 'A long wandering line off toward somewhere unseen']),
    ants: score('How many ants?', ['A few scouts', 'A single file', 'A busy two-lane column', 'A swarm crowding the puddle edge']),
    snack: noul('Is a crumbled snack bar lying in the puddle?'),
    nearby: choice('What lies nearby?', {
      nothing: 'Nothing: it was left exactly as it fell.',
      note: 'A sticky-note apology: SORRY, WILL CLEAN.',
      towel: 'A paper towel dropped on it and never used.',
      both: 'A paper towel and a sticky note saying NOT MINE.',
    }),
    crushed: noul('Is the can dented and crushed?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const can = CANS[a.can];

    // The can on its side, pointing its mouth at the puddle.
    const label = paint(256, 128, (ctx) => {
      ctx.fillStyle = can.body; ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = can.band;
      ctx.beginPath(); ctx.moveTo(0, 70); ctx.lineTo(256, 40); ctx.lineTo(256, 62); ctx.lineTo(0, 92); ctx.fill();
      ctx.fillStyle = can.ink; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
      ctx.save(); ctx.translate(128, 40); ctx.rotate(-0.08); ctx.fillText(can.name, 0, 0); ctx.restore();
      ctx.fillStyle = can.ink; ctx.beginPath(); ctx.moveTo(120, 100); ctx.lineTo(134, 100); ctx.lineTo(126, 112); ctx.lineTo(138, 112); ctx.lineTo(118, 128); ctx.lineTo(126, 116); ctx.lineTo(114, 116); ctx.fill();
    });
    const canGroup = new THREE.Group();
    const R = 0.029, L = 0.16;
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 24, 1, true), new THREE.MeshStandardMaterial({ map: label, metalness: 0.5, roughness: 0.35 }));
    shell.castShadow = shell.receiveShadow = true;
    const alu = s.material('#c9cdd0', { metalness: 0.9, roughness: 0.25 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.86, R, 0.012, 24), alu);
    top.position.y = L / 2 + 0.006;
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.86, 0.012, 24), alu);
    bottom.position.y = -L / 2 - 0.006;
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, 0.02), alu);
    tab.position.set(0, L / 2 + 0.013, 0.004);
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.01), s.material('#101012'));
    mouth.rotation.x = -Math.PI / 2; mouth.position.set(0, L / 2 + 0.0125, 0.014);
    for (const part of [top, bottom, tab, mouth]) part.castShadow = true;
    canGroup.add(shell, top, bottom, tab, mouth);
    // Lying along +x with the mouth toward the puddle, rolled a little.
    canGroup.rotation.set(0, 0, -Math.PI / 2);
    canGroup.rotateY(random() * Math.PI * 2);
    if (a.crushed) {
      canGroup.scale.set(1, 1, 0.78);
      canGroup.rotation.z = -Math.PI / 2 + 0.12;
    }
    canGroup.position.set(-0.16, a.crushed ? R * 0.8 : R, 0.02);
    s.root.add(canGroup);

    // The puddle: a blob flowing out of the mouth, drawn as a flat shape with lobes.
    const blob = (radius: number, stretch: number, seed: number) => {
      const shape = new THREE.Shape();
      for (let i = 0; i <= 40; i++) {
        const t = (i / 40) * Math.PI * 2;
        const r = radius * (1 + 0.22 * Math.sin(t * 3 + seed) + 0.12 * Math.sin(t * 7 + seed * 2) + 0.08 * Math.sin(t * 11));
        const x = Math.cos(t) * r * stretch, z = Math.sin(t) * r;
        if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z);
      }
      shape.closePath();
      const geometry = new THREE.ShapeGeometry(shape, 8).rotateX(Math.PI / 2);
      return geometry;
    };
    const seed = random() * 6;
    const drink = new THREE.Color(can.drink);
    const wet = new THREE.MeshPhysicalMaterial({ color: drink, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
    const dry = new THREE.MeshStandardMaterial({ color: drink.clone().lerp(new THREE.Color('#2a1a0a'), 0.4), roughness: 0.75, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
    const PX = 0.06, PZ = 0.0;
    if (a.puddle === 'fresh') {
      s.mesh(blob(0.17, 1.55, seed), wet, [PX, 0.005, PZ]);
      const fizz = new THREE.Mesh(blob(0.185, 1.55, seed), new THREE.MeshStandardMaterial({ color: '#f2dcb0', roughness: 0.6, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
      fizz.position.set(PX, 0.0045, PZ); s.root.add(fizz);
    } else if (a.puddle === 'tacky') {
      s.mesh(blob(0.18, 1.55, seed), dry, [PX, 0.0045, PZ]);
      s.mesh(blob(0.1, 1.5, seed + 1), wet, [PX + 0.02, 0.0052, PZ]);
    } else {
      const ring = new THREE.Mesh(blob(0.18, 1.55, seed), new THREE.MeshStandardMaterial({ color: drink.clone().lerp(new THREE.Color('#1a0e04'), 0.5), roughness: 0.85, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
      ring.position.set(PX, 0.0045, PZ); s.root.add(ring);
      s.mesh(blob(0.15, 1.55, seed), new THREE.MeshStandardMaterial({ color: drink.clone().lerp(new THREE.Color('#9a7a4a'), 0.35), roughness: 0.9, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }), [PX, 0.0052, PZ]);
    }
    // A few splash drops beyond the edge.
    const drops: THREE.Matrix4[] = [];
    for (let i = 0; i < 14; i++) {
      const t = random() * Math.PI * 2, d = 0.2 + random() * 0.16;
      drops.push(new THREE.Matrix4().makeScale(0.006 + random() * 0.012, 0.0015, 0.005 + random() * 0.01).setPosition(PX + Math.cos(t) * d * 1.5, 0.004, PZ + Math.sin(t) * d));
    }
    s.root.add(instanced(new THREE.SphereGeometry(1, 8, 6), a.puddle === 'fresh' ? wet : dry, drops));

    if (a.snack) {
      const oat = paint(64, 32, (ctx) => {
        ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, 0, 64, 32);
        for (let i = 0; i < 160; i++) { ctx.fillStyle = random() < 0.5 ? '#c9924a' : '#5a3418'; ctx.fillRect(random() * 64, random() * 32, 2 + random() * 3, 1.5 + random() * 2); }
      });
      const bar = s.mesh(new THREE.BoxGeometry(0.09, 0.018, 0.034), new THREE.MeshStandardMaterial({ map: oat, roughness: 0.9 }), [PX + 0.12, 0.009, PZ - 0.06]);
      bar.rotation.y = 0.5;
      const crumbs: THREE.Matrix4[] = [];
      for (let i = 0; i < 40; i++) crumbs.push(new THREE.Matrix4().makeRotationY(random() * 3).multiply(new THREE.Matrix4().makeScale(0.004 + random() * 0.008, 0.004, 0.004 + random() * 0.006)).setPosition(PX + 0.12 + (random() - 0.5) * 0.22, 0.003, PZ - 0.06 + (random() - 0.5) * 0.16));
      s.root.add(instanced(new THREE.BoxGeometry(1, 1, 1), s.material('#a06a34', { roughness: 0.95 }), crumbs));
      s.box([0.1, 0.002, 0.05], [PX + 0.2, 0.002, PZ + 0.02], s.material('#2a6fd6', { metalness: 0.5, roughness: 0.4 })).rotation.y = -0.4;
    }
    if (a.nearby === 'note' || a.nearby === 'both') {
      const note = s.label(a.nearby === 'both' ? 'NOT MINE' : 'SORRY WILL CLEAN', 0.075, 0.075, [PX - 0.12, 0.002, PZ + 0.22], '#2a2a30', '#f5e46a');
      note.rotation.x = -Math.PI / 2;
      note.rotation.z = (random() - 0.5) * 0.6;
    }
    if (a.nearby === 'towel' || a.nearby === 'both') {
      const towelMat = s.material('#f3f1ea', { roughness: 0.95 });
      const sheet = s.mesh(new THREE.PlaneGeometry(0.22, 0.22, 6, 6), towelMat, [PX + 0.04, 0.004, PZ + 0.1]);
      sheet.rotation.x = -Math.PI / 2;
      sheet.rotation.z = random() * 0.8;
      const pos = sheet.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, random() * 0.012);
      sheet.geometry.computeVertexNormals();
      s.mesh(blob(0.06, 1.2, seed + 3), new THREE.MeshStandardMaterial({ color: drink, transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.8, side: THREE.DoubleSide }), [PX + 0.04, 0.009, PZ + 0.08]);
      for (let i = 0; i < 3; i++) s.ball([0.03, 0.02, 0.025], [PX + 0.2 + i * 0.03, 0.02, PZ + 0.2 + (random() - 0.5) * 0.05], towelMat, 8);
    }

    // The ant road: from the puddle edge away along a wandering line.
    const heading = random() * Math.PI * 2;
    const length = mix(0.35, 1.2, a.trail);
    const legs: Leg[] = [];
    const start = new THREE.Vector3(PX + Math.cos(heading) * 0.24, 0.001, PZ + Math.sin(heading) * 0.16);
    let prev = start.clone();
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const wobble = Math.sin(t * 9 + seed) * 0.06 * a.trail + (random() - 0.5) * 0.03;
      const next = new THREE.Vector3(start.x + Math.cos(heading) * length * t - Math.sin(heading) * wobble, 0.001, start.z + Math.sin(heading) * length * t + Math.cos(heading) * wobble);
      legs.push({ from: prev, to: next, length: prev.distanceTo(next) });
      prev = next;
    }
    const total = legs.reduce((sum, leg) => sum + leg.length, 0);
    const AS = 2.6;
    const bead = (sx: number, sy: number, sz: number, x: number, y: number) => new THREE.SphereGeometry(1, 7, 5).scale(sx * AS, sy * AS, sz * AS).translate(x * AS, y * AS, 0);
    const antGeometry = mergeGeometries([bead(0.0055, 0.0035, 0.0036, -0.0045, 0.0038), bead(0.003, 0.0026, 0.0026, 0.0015, 0.004), bead(0.0028, 0.0028, 0.0026, 0.0058, 0.0046)]);
    const antMaterial = s.material('#131110', { roughness: 0.55 });
    const n = Math.round(mix(6, 120, a.ants) * mix(0.6, 1.2, a.trail));
    const spread = mix(0.004, 0.03, a.ants);
    const ants = Array.from({ length: n }, () => ({ u: random() * total, side: (random() - 0.5) * 2 * spread, pace: mix(0.7, 1.3, random()), back: random() < 0.45 }));
    const forward = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), at = new THREE.Vector3();
    const matrixOf = (ant: (typeof ants)[number], out: THREE.Matrix4) => {
      let u = ant.u % total;
      let leg = legs[0];
      for (const candidate of legs) {
        if (u <= candidate.length) { leg = candidate; break; }
        u -= candidate.length;
      }
      forward.subVectors(leg.to, leg.from).normalize();
      right.crossVectors(up, forward).normalize();
      at.copy(leg.from).addScaledVector(forward, u).addScaledVector(right, ant.side);
      if (ant.back) forward.negate();
      right.crossVectors(up, forward).normalize();
      out.makeBasis(forward, up, right).setPosition(at);
    };
    const antMatrices = ants.map((ant) => { const m = new THREE.Matrix4(); matrixOf(ant, m); return m; });
    // The crowd at the puddle's edge, drinking.
    const crowd = Math.round(mix(3, 90, a.ants * a.ants));
    for (let i = 0; i < crowd; i++) {
      const t = heading + (random() - 0.5) * 2.2;
      const r = 1 + random() * 0.18;
      const x = PX + Math.cos(t) * 0.24 * r, z = PZ + Math.sin(t) * 0.16 * r;
      const facing = Math.atan2(PZ - z, PX - x);
      antMatrices.push(new THREE.Matrix4().makeRotationY(-facing + (random() - 0.5) * 0.6).setPosition(x, 0.001, z));
    }
    const antMesh = instanced(antGeometry, antMaterial, antMatrices);
    s.root.add(antMesh);

    const speed = mix(0, 0.04, mood.energy);
    const scratch = new THREE.Matrix4();
    return s.finish({
      update(dt) {
        if (speed === 0) return;
        ants.forEach((ant, i) => {
          ant.u = ((ant.u + dt * speed * ant.pace * (ant.back ? -1 : 1)) % total + total) % total;
          matrixOf(ant, scratch);
          antMesh.setMatrixAt(i, scratch);
        });
        antMesh.instanceMatrix.needsUpdate = true;
      },
    });
  },
});
