import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { grazer } from './grazer';

const HIDES = {
  slate: 'Blue-grey slate hide.',
  rust: 'Rust red-brown.',
  bone: 'Bone-pale cream.',
  dun: 'Dusty tan dun.',
  moss: 'Dull olive green.',
} as const;
const HIDE_COLOUR: Record<keyof typeof HIDES, [string, string]> = {
  slate: ['#5f6b78', '#9aa0a3'], rust: ['#8c4a2e', '#c4a37a'], bone: ['#e3dccb', '#b8ad97'], dun: ['#b08e62', '#8a7355'], moss: ['#6b7046', '#a39f78'],
};

/** A tarp with grommets and a seam, or a wool blanket with border stripes, painted on a canvas. */
function clothTexture(tarp: boolean, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  if (tarp) {
    const base = ['#2f5fae', '#2f5fae', '#56603f', '#7d6b4c'][Math.floor(random() * 4)];
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 256; i += 6) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 124, 256, 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 250);
    ctx.fillStyle = '#c9c9c4';
    for (let i = 16; i < 256; i += 40) for (const [x, y] of [[i, 8], [i, 248], [8, i], [248, i]]) { ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
  } else {
    const [base, stripe] = [['#8a3b33', '#e0c78e'], ['#6c6a60', '#2c2a28'], ['#4e5a3f', '#d8cfae'], ['#b98a4a', '#3d2a22']][Math.floor(random() * 4)];
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(random() * 256, random() * 256, 2, 2);
    }
    ctx.fillStyle = stripe;
    for (const at of [18, 34, 214, 230]) { ctx.fillRect(0, at, 256, at === 34 || at === 214 ? 5 : 10); ctx.fillRect(at, 0, at === 34 || at === 214 ? 5 : 10, 256); }
  }
  return new THREE.CanvasTexture(canvas);
}

export default defineThing({
  questions: {
    state: choice('What state is the body in?', {
      fresh: 'Fresh, hide intact, as if it were only asleep.',
      bloated: 'Bloated, belly swollen, legs stiff in the air.',
      picked: 'Picked over: the upper flank opened and the ribs showing.',
      old: 'Days old, sunken, hide sagging over bone.',
    }),
    cause: choice('What killed it?', {
      unknown: 'No visible cause at all.',
      bites: 'Deep bite marks torn into the neck and flank.',
      holes: 'Three neat round holes in a line along its side.',
      burn: 'A scorched black patch on its side.',
    }),
    marked: choice('How has it been marked?', {
      none: 'Not marked; nobody has found it yet.',
      stake: 'A marker stake with an orange flag driven in by the head.',
      paint: 'A ring of orange marking paint sprayed on the ground around it.',
      tape: 'Hazard tape on sticks around it.',
    }),
    covered: choice('What has been thrown over it?', {
      nothing: 'Nothing: it lies open to the sky.',
      blanket: 'A wool blanket over the head and shoulders.',
      tarp: 'A blue tarp over the whole body, weighted with stones.',
    }),
    hide: choice('What colour is its hide?', HIDES),
    gnats: score('How thick are the carrion gnats?', ['None yet', 'A few hovering', 'A cloud of them']),
    pool: score('How much green has pooled beneath it?', ['A dark patch', 'A pool spreading from the belly', 'A wide slick running downhill']),
    size: score('How big was it?', ['A yearling', 'Cow-sized', 'A heavy old bull']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random, mood } = context;
    const [hide, plate] = HIDE_COLOUR[a.hide];
    const S = mix(0.6, 1.08, a.size);
    const side: 1 | -1 = random() < 0.5 ? 1 : -1;
    const beast = grazer(s, { size: S, hide, plate, markings: 'plain', horns: random() < 0.5 ? 'stubs' : 'none', pose: 'dead', side });
    const g = beast.group;
    const { centre, radii } = beast.body;
    if (a.state === 'bloated') beast.bodyMesh.scale.multiply(new THREE.Vector3(1.22, 1.2, 1.06));
    if (a.state === 'old') beast.bodyMesh.scale.multiply(new THREE.Vector3(0.78, 0.92, 1));
    // Bloated, it rolls further onto its back and the stiff legs lift toward the sky.
    if (a.state === 'bloated') g.rotation.z = side * (Math.PI / 2 + 0.38);
    // Settle the barrel into the ground a little, whatever its swelling or roll.
    s.root.updateMatrixWorld(true);
    const barrel = new THREE.Box3().setFromObject(beast.bodyMesh, true);
    g.position.y -= barrel.min.y + 0.04 * S;
    // In the group's own space the upper flank is at local +x·side; the ground is at local -x·side.
    const up = side;

    // Wounds on the upper flank and neck, in the group's space so they roll with the body.
    const gore = s.material('#1f3b24', { roughness: 0.25, metalness: 0.1 });
    const meat = s.material('#3a2320', { roughness: 0.7 });
    const bone = s.material('#e6e0d0', { roughness: 0.8 });
    const put = (m: THREE.Object3D) => { g.add(m); return m; };
    const onFlank = (y: number, z: number, out = 0): [number, number, number] => {
      const rr = Math.sqrt(Math.max(0, 1 - ((z - centre.z) / radii.z) ** 2 - ((y - centre.y) / radii.y) ** 2));
      return [up * (radii.x * rr + out), y, z];
    };
    if (a.state === 'picked') {
      // The upper flank opened: a dark wet hollow with pale ribs arching over it.
      const hollow = s.material('#22301f', { roughness: 0.35, metalness: 0.1 });
      put(s.ball([radii.x * 0.16, radii.y * 0.62, radii.z * 0.5], onFlank(centre.y, centre.z - radii.z * 0.08, -0.03 * S), hollow, 14));
      put(s.ball([radii.x * 0.1, radii.y * 0.45, radii.z * 0.36], onFlank(centre.y, centre.z - radii.z * 0.08, -0.01 * S), meat, 12));
      for (let i = 0; i < 7; i++) {
        const z = centre.z - radii.z * 0.5 + i * radii.z * 0.14;
        const k = Math.sqrt(Math.max(0.05, 1 - ((z - centre.z) / radii.z) ** 2)) * 1.04;
        const rib = put(s.ring(1, 0.028 / Math.max(radii.x * k, 0.1), [0, centre.y, z], bone, 1.25 + random() * 0.2));
        rib.scale.set(radii.x * k, radii.y * k, 1);
        rib.rotation.z = up > 0 ? -0.62 : Math.PI - 0.62;
      }
      // The spine showing along the back where the plates were torn away.
      for (let i = 0; i < 4; i++) put(s.ball([0.06 * S, 0.05 * S, 0.07 * S], onFlank(centre.y + radii.y * (0.5 + random() * 0.4), centre.z + (random() - 0.5) * radii.z * 1.2, 0.01), gore, 8));
    }
    if (a.cause === 'bites') {
      for (let i = 0; i < 6; i++) {
        const neck = i < 3;
        const y = neck ? centre.y + 0.1 * S : centre.y + (random() - 0.3) * radii.y * 0.8;
        const z = neck ? radii.z + 0.2 * S + random() * 0.3 * S : centre.z + (random() - 0.5) * radii.z;
        const at = neck ? [up * (0.17 * S), y, z] as [number, number, number] : onFlank(y, z, 0.005);
        const bite = put(s.ball([0.03 * S, 0.11 * S, 0.07 * S], at, meat, 8));
        bite.rotation.z = random() * 0.8 - 0.4;
        put(s.ball([0.02 * S, 0.14 * S, 0.1 * S], at, gore, 8)).position.x += up * -0.01 * S;
      }
    }
    if (a.cause === 'holes') for (let i = 0; i < 3; i++) {
      const hole = put(s.cylinder(0.045 * S, 0.045 * S, 0.02 * S, onFlank(centre.y + radii.y * 0.1, centre.z - radii.z * 0.35 + i * radii.z * 0.32, 0.004), s.material('#0f0f0f', { roughness: 1 }), 12));
      hole.rotation.z = Math.PI / 2;
      put(s.ring(0.065 * S, 0.012 * S, onFlank(centre.y + radii.y * 0.1, centre.z - radii.z * 0.35 + i * radii.z * 0.32, 0.006), gore)).rotation.y = Math.PI / 2;
    }
    if (a.cause === 'burn') {
      const char = put(s.ball([radii.x * 0.08, radii.y * 0.62, radii.z * 0.5], onFlank(centre.y + radii.y * 0.15, centre.z + radii.z * 0.05, -0.01), s.material('#141210', { roughness: 1 }), 12));
      char.rotation.x = 0.2;
      put(s.ball([radii.x * 0.1, radii.y * 0.4, radii.z * 0.32], onFlank(centre.y + radii.y * 0.15, centre.z + radii.z * 0.05, 0), s.material('#3a2a20', { roughness: 1 }), 10));
    }

    // Everything on the ground is placed in world space, from the rolled body.
    s.root.updateMatrixWorld(true);
    const toWorld = (x: number, y: number, z: number) => g.localToWorld(new THREE.Vector3(x, y, z));
    const bodyW = toWorld(centre.x, centre.y, centre.z);
    const headW = toWorld(0, centre.y, radii.z + 0.6 * S);
    const bellyW = toWorld(0, centre.y - radii.y, centre.z);
    const length = radii.z * 2 + 1.3 * S;

    // The pool: dark green spreading from under the belly, thin and glossy when fresh.
    const fresh = a.state === 'fresh' || a.state === 'bloated';
    const poolR = mix(0.5, 1.5, a.pool) * S;
    const poolMat = s.material(new THREE.Color('#163b22').lerp(new THREE.Color('#5f6650'), fresh ? 0 : 0.5), { roughness: fresh ? 0.15 : 0.9, metalness: fresh ? 0.15 : 0 });
    const puddle = (cx: number, cz: number, r: number, stretch: [number, number], angle: number, height: number, material: THREE.Material) => {
      const shape = new THREE.Shape();
      const bumps = [random() * 6, random() * 6, random() * 6];
      for (let i = 0; i <= 30; i++) {
        const t = (i / 30) * Math.PI * 2;
        const rr = r * (1 + 0.5 * 0.4 * Math.sin(t * 3 + bumps[0]) + 0.25 * Math.sin(t * 5 + bumps[1]) + 0.12 * Math.sin(t * 9 + bumps[2]));
        const x = Math.cos(t) * rr * stretch[0], y = Math.sin(t) * rr * stretch[1];
        const px = x * Math.cos(angle) - y * Math.sin(angle), py = x * Math.sin(angle) + y * Math.cos(angle);
        if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
      }
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(cx, height, cz);
      const m = s.mesh(geometry, material, [0, 0, 0]);
      m.castShadow = false;
      return m;
    };
    const bellyDir = Math.sign(bellyW.x - bodyW.x) || 1;
    puddle(bodyW.x + bellyDir * poolR * 0.35, bodyW.z, poolR, [1.1, 1.5], 0, 0.006, poolMat);
    if (a.pool > 0.5) {
      // A slick running off one way, as the ground falls.
      const runDir = random() < 0.5 ? 1 : -1;
      puddle(bodyW.x + bellyDir * poolR * 0.6 + runDir * poolR * 0.9, bodyW.z + runDir * poolR * 0.6, poolR * 0.55, [1.8, 0.6], runDir * 0.7, 0.004, poolMat);
      puddle(bodyW.x + bellyDir * poolR * 0.2 + runDir * poolR * 1.7, bodyW.z + runDir * poolR * 1.3, poolR * 0.3, [1.4, 0.7], runDir * 0.8, 0.004, poolMat);
    }
    for (let i = 0; i < 7; i++) {
      const t = random() * Math.PI * 2, d = poolR * mix(0.9, 1.6, random());
      puddle(bodyW.x + bellyDir * poolR * 0.35 + Math.sin(t) * d, bodyW.z + Math.cos(t) * d, poolR * mix(0.04, 0.1, random()), [1, 1], 0, 0.004, poolMat);
    }

    // Covers: cloth thrown over it and settling under its own weight. Each vertex of a grid is
    // dropped onto the body from above (a raycast), then relaxed into a sagging membrane that can
    // only rest on top of what is under it, so legs and the head tent it and the hem lies flat.
    if (a.covered !== 'nothing') {
      const tarp = a.covered === 'tarp';
      const w = (tarp ? 2.5 : 1.55) * S, d = (tarp ? 2.9 : 1.45) * S;
      const cx = bodyW.x + (tarp ? 0 : -bellyDir * 0.1 * S), cz = tarp ? bodyW.z + 0.1 * S : headW.z - 0.45 * S;
      const n = 44;
      const plane = new THREE.PlaneGeometry(w, d, n, n);
      plane.rotateX(-Math.PI / 2);
      const turn = (random() - 0.5) * 0.35;
      plane.rotateY(turn);
      plane.translate(cx, 0, cz);
      const pos = plane.attributes.position as THREE.BufferAttribute;
      const raw = new Float32Array(pos.count);
      const ray = new THREE.Raycaster();
      const down = new THREE.Vector3(0, -1, 0);
      const targets: THREE.Object3D[] = [];
      g.traverse((o) => { if ((o as THREE.Mesh).isMesh) targets.push(o); });
      const floor = 0.012;
      for (let i = 0; i < pos.count; i++) {
        ray.set(new THREE.Vector3(pos.getX(i), 6 * S, pos.getZ(i)), down);
        const hit = ray.intersectObjects(targets, false)[0];
        raw[i] = hit ? hit.point.y + 0.035 * S : floor;
      }
      let h = Float32Array.from(raw);
      const slack = (tarp ? 0.006 : 0.008) * S;
      for (let it = 0; it < 90; it++) {
        const next = new Float32Array(h.length);
        for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) {
          const i = r * (n + 1) + c;
          const up = h[Math.max(0, r - 1) * (n + 1) + c], dn = h[Math.min(n, r + 1) * (n + 1) + c];
          const lf = h[r * (n + 1) + Math.max(0, c - 1)], rt = h[r * (n + 1) + Math.min(n, c + 1)];
          next[i] = Math.max(raw[i], (up + dn + lf + rt) / 4 - slack, floor);
        }
        h = next;
      }
      // Creases and a lifted hem, so it reads as cloth and not a shell.
      const f1 = random() * 6, f2 = random() * 6;
      for (let i = 0; i < pos.count; i++) {
        const r = Math.floor(i / (n + 1)), c = i % (n + 1);
        const edge = Math.min(r, c, n - r, n - c);
        const crease = (Math.sin(c * 0.55 + f1 + r * 0.12) * 0.5 + Math.sin(r * 0.8 + f2) * 0.3) * 0.012 * S * Math.min(1, (h[i] - floor) / (0.15 * S));
        pos.setY(i, h[i] + crease + (edge === 0 ? 0.015 * S * random() : 0));
      }
      plane.computeVertexNormals();
      const cloth = new THREE.MeshStandardMaterial({ map: clothTexture(tarp, random), roughness: tarp ? 0.55 : 1, side: THREE.DoubleSide });
      cloth.map!.colorSpace = THREE.SRGBColorSpace;
      if (!tarp) cloth.color.lerp(new THREE.Color('#9a9080'), mood.wear * 0.3);
      s.mesh(plane, cloth, [0, 0, 0]);
      if (tarp) {
        // Stones on the corners and the hem to hold it down.
        const rock = s.material('#8a8378', { roughness: 0.95, flatShading: true });
        const corners: [number, number][] = [[-0.46, -0.46], [0.46, -0.46], [0.46, 0.46], [-0.46, 0.46], [0, 0.5], [-0.5, 0]];
        for (const [u, v] of corners) {
          if (random() < 0.25) continue;
          const lx = u * w, lz = v * d;
          const x = cx + lx * Math.cos(turn) + lz * Math.sin(turn), z = cz - lx * Math.sin(turn) + lz * Math.cos(turn);
          const r = mix(0.09, 0.15, random()) * S;
          const stone = s.mesh(new THREE.IcosahedronGeometry(1, 1), rock, [x, r * 0.55, z]);
          stone.scale.set(r * 1.3, r * 0.8, r);
          stone.rotation.y = random() * 3;
        }
      }
    }

    // Marks left by whoever found it.
    const orange = s.material('#ff6a1f', { roughness: 0.6, emissive: '#ff4a00', emissiveIntensity: 0.15 });
    if (a.marked === 'stake') {
      const sx = headW.x + 0.5 * S, sz = headW.z + 0.5 * S;
      s.rod([sx, 0, sz], [sx + 0.04, 1.0 * S, sz], 0.018 * S, s.material('#8d7a62', { roughness: 0.9 }));
      s.box([0.02 * S, 0.14 * S, 0.22 * S], [sx + 0.04, 0.93 * S, sz + 0.11 * S], orange);
    } else if (a.marked === 'paint') {
      const ring = s.ring(length * 0.62, 0.03 * S, [bodyW.x, 0.012, bodyW.z + 0.1 * S], orange, Math.PI * 1.85);
      ring.rotation.x = -Math.PI / 2;
      ring.scale.y = 0.75;
      ring.rotation.z = random() * 3;
    } else if (a.marked === 'tape') {
      const stick = s.material('#5a4a38', { roughness: 0.9 });
      const tapeY = 0.55 * S, rx = length * 0.72, rz = length * 0.5;
      const corners: [number, number][] = [[bodyW.x - rx, bodyW.z - rz], [bodyW.x + rx, bodyW.z - rz], [bodyW.x + rx, bodyW.z + rz], [bodyW.x - rx, bodyW.z + rz]];
      for (const [i, [x, z]] of corners.entries()) {
        s.rod([x, 0, z], [x + (random() - 0.5) * 0.1, tapeY + 0.15 * S, z], 0.015 * S, stick);
        const [nx, nz] = corners[(i + 1) % 4];
        const tape = s.label('KEEP BACK', Math.hypot(nx - x, nz - z) * 0.98, 0.08 * S, [(x + nx) / 2, tapeY, (z + nz) / 2], '#1c1a16', '#f2cf2f');
        tape.rotation.y = Math.atan2(nx - x, nz - z) + Math.PI / 2;
      }
    }
    // Carrion gnats: a few dark motes circling above the body, more when it has been lying longer.
    const gnatCount = Math.round(mix(0, 22, a.gnats));
    const gnats: { mesh: THREE.Mesh; r: number; h: number; phase: number; speed: number }[] = [];
    const mote = s.material('#1d1b18', { roughness: 1 });
    const gnatGeo = new THREE.SphereGeometry(0.026 * S, 6, 4);
    for (let i = 0; i < gnatCount; i++) {
      const mesh = s.mesh(gnatGeo, mote, [bodyW.x, bodyW.y + radii.x + 0.3 * S, bodyW.z]);
      mesh.castShadow = false;
      gnats.push({ mesh, r: mix(0.15, 0.9, random()) * S, h: bodyW.y + radii.x * 1.1 + random() * 0.6 * S, phase: random() * 6.3, speed: mix(0.6, 1.6, random()) });
    }
    const centreX = bodyW.x, centreZ = bodyW.z;
    const energy = mix(0.3, 1.6, mood.energy);
    const fly = (time: number) => {
      for (const gnat of gnats) {
        const t = time * energy * gnat.speed + gnat.phase;
        gnat.mesh.position.set(centreX + Math.cos(t * 1.7) * gnat.r + Math.sin(t * 5.1) * 0.05, gnat.h + Math.sin(t * 3.3) * 0.08 * S, centreZ + Math.sin(t * 1.3) * gnat.r * 1.4 + Math.cos(t * 4.7) * 0.05);
      }
    };
    fly(0);
    return s.finish({ update: (_dt, time) => fly(time) });
  },
});
