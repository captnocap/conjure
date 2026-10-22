import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Item = { p: THREE.Vector3; q?: THREE.Quaternion; s?: THREE.Vector3 };
function instanced(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, items: Item[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1));
  mesh.count = items.length;
  const m = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1), id = new THREE.Quaternion();
  items.forEach((item, i) => mesh.setMatrixAt(i, m.compose(item.p, item.q ?? id, item.s ?? one)));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
const UP = new THREE.Vector3(0, 1, 0);
function chain(parent: THREE.Object3D, material: THREE.Material, from: THREE.Vector3, to: THREE.Vector3, rope: boolean) {
  const d = to.clone().sub(from), length = d.length();
  if (length < 0.01) return;
  const q0 = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
  if (rope) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, length, 6), material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5); mesh.quaternion.copy(q0); mesh.castShadow = true; parent.add(mesh);
    return;
  }
  const n = Math.max(2, Math.round(length / 0.05));
  const q1 = q0.clone().multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2));
  const scale = new THREE.Vector3(1, 1.5, 1);
  instanced(parent, new THREE.TorusGeometry(0.02, 0.0055, 5, 10), material,
    Array.from({ length: n }, (_u, i) => ({ p: from.clone().lerp(to, (i + 0.5) / n), q: i % 2 ? q1 : q0, s: scale })));
}

// Half-width and half-height of the animal along its length: snout tip (0) to tail tip (1).
const KEYS: [number, number, number][] = [
  [0, 0.022, 0.012], [0.04, 0.044, 0.02], [0.17, 0.05, 0.024], [0.215, 0.082, 0.05], [0.26, 0.084, 0.058], [0.31, 0.072, 0.055],
  [0.42, 0.118, 0.082], [0.55, 0.122, 0.085], [0.65, 0.092, 0.07], [0.76, 0.05, 0.055], [0.9, 0.018, 0.035], [1, 0.003, 0.008],
];
function girth(t: number): [number, number] {
  for (let i = 1; i < KEYS.length; i++) if (t <= KEYS[i][0]) {
    const [t0, w0, h0] = KEYS[i - 1], [t1, w1, h1] = KEYS[i];
    let u = (t - t0) / (t1 - t0); u = u * u * (3 - 2 * u);
    return [w0 + (w1 - w0) * u, h0 + (h1 - h0) * u];
  }
  return [0.003, 0.008];
}

export default defineThing({
  questions: {
    mount: choice('What is it hung from?', {
      beam: 'A heavy ceiling beam carried on two posts.',
      gibbet: 'A single post with a braced arm, like a shop sign bracket.',
      arch: 'The underside of a brick vault arch between two piers.',
    }),
    size: score('How big is the crocodile?', ['A hatchling the length of a forearm', 'A small one, about a yard long', 'A grown beast longer than a man']),
    pose: choice('How was it stuffed?', {
      stiff: 'Ramrod straight, like a log with legs.',
      swimming: 'In a lively S-bend, as if still swimming.',
      sagging: 'Badly: head and tail droop from the middle.',
      curled: 'With the tail curled round to one side.',
    }),
    mouth: choice('How is its mouth set?', {
      closed: 'Shut, with a row of teeth just showing.',
      grin: 'Propped slightly open in a toothy grin.',
      gaping: 'Gaping wide, wired open to frighten customers.',
    }),
    hide: choice('What colour is the hide?', {
      olive: 'Dull olive green with darker bands.',
      varnished: 'Dark brown and shiny with old varnish.',
      bleached: 'Sun-bleached pale straw and grey.',
      sooty: 'Blackened by years of furnace smoke.',
      gilded: 'Daubed with gold paint, a showman\'s touch.',
    }),
    condition: choice('What has become of it?', {
      proud: 'Freshly mounted, the pride of the shop.',
      dusty: 'Thick with dust and hung with cobwebs.',
      motheaten: 'Moth-eaten: seams split, straw poking out, a leg gone.',
      snapped: 'One chain has snapped and it dangles nose-up by the other, tail to the floor.',
    }),
    eyes: choice('What are its eyes?', {
      glass: 'Yellow glass eyes with slit pupils.',
      empty: 'Empty dark sockets.',
      buttons: 'Two mismatched buttons sewn in.',
      embers: 'Small red glass beads that catch the furnace light like embers.',
    }),
    adornment: choice('What has been hung on it or tied to it?', {
      none: 'Nothing.',
      bow: 'A ribbon bow round its neck.',
      tag: 'A big paper price tag on a string.',
      herbs: 'Bunches of drying herbs tied to its legs.',
      lantern: 'A small lit lantern hooked over its jaw.',
    }),
    hanger: choice('What does it hang by?', {
      chain: 'Iron chains.',
      rope: 'Hemp rope.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = 1.3, k = mix(0.8, 1.75, a.size);
    const dust = Math.min(1, mood.wear * 0.5 + (a.condition === 'dusty' ? 0.55 : a.condition === 'proud' ? 0 : 0.2));
    const dusted = (colour: string, amount = dust) => new THREE.Color(colour).lerp(new THREE.Color('#aaa494'), amount);

    // Spine.
    const spine = (t: number): [number, number, number] => {
      let y = 0, z = 0;
      if (a.pose === 'swimming') z = 0.075 * Math.sin(t * 7 + 0.4) * (0.25 + t);
      if (a.pose === 'sagging') y = -0.42 * (t - 0.5) * (t - 0.5);
      if (a.pose === 'curled') z = 2.4 * Math.max(0, t - 0.6) ** 2;
      const x = (0.5 - t) * L - (a.pose === 'curled' ? -0.5 * Math.max(0, t - 0.7) ** 2 * 3 : 0);
      return [x, y, z];
    };

    // Hide texture: u along the body, v round it from the belly.
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const [base, belly, band, rough, metal] = ({
      olive: ['#6b7340', '#c9c08a', '#3c4424', 0.8, 0], varnished: ['#5a3a1e', '#a8824a', '#2e1c0e', 0.3, 0.1], bleached: ['#b9ad88', '#ddd4b4', '#8a8062', 0.95, 0],
      sooty: ['#2c2a28', '#55504a', '#151413', 0.9, 0], gilded: ['#c9a02c', '#e2c860', '#8a6a14', 0.38, 0.75],
    } as const)[a.hide];
    ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = belly; ctx.fillRect(0, 0, 512, 36); ctx.fillRect(0, 220, 512, 36);
    for (let i = 0; i < 13; i++) { ctx.fillStyle = band; ctx.globalAlpha = 0.55; const x = 120 + i * 31 + random() * 8; ctx.fillRect(x, 50, 9 + random() * 8, 156); }
    ctx.globalAlpha = 0.5; ctx.strokeStyle = band; ctx.lineWidth = 1.3;
    for (let x = 0; x < 512; x += 9) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
    for (let y = 0; y < 256; y += 13) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (let i = 0; i < dust * 500; i++) { ctx.fillStyle = `rgba(175,170,155,${0.1 + random() * 0.25})`; ctx.fillRect(random() * 512, 70 + random() * 120, 4 + random() * 22, 3 + random() * 12); }
    const hideMap = new THREE.CanvasTexture(canvas); hideMap.colorSpace = THREE.SRGBColorSpace;
    const hide = new THREE.MeshStandardMaterial({ map: hideMap, roughness: mix(rough, 1, dust * 0.7), metalness: metal * (1 - dust) });
    const plain = new THREE.MeshStandardMaterial({ color: dusted(base, dust * 0.6), roughness: mix(rough, 1, dust * 0.7), metalness: metal * (1 - dust) });
    const ridge = new THREE.MeshStandardMaterial({ color: dusted(band, dust * 0.6), roughness: 0.9, flatShading: true });

    // Body surface.
    const croc = new THREE.Group();
    const NT = 60, NR = 14, positions: number[] = [], uvs: number[] = [], index: number[] = [];
    for (let i = 0; i <= NT; i++) {
      const t = i / NT, [w, h] = girth(t), [x, y, z] = spine(t);
      const jaw = t < 0.2; // the snout carries only the upper jaw
      for (let j = 0; j <= NR; j++) {
        const phi = -Math.PI / 2 + (j / NR) * Math.PI * 2, sy = Math.sin(phi);
        positions.push(x, y + (sy < 0 ? sy * h * (jaw ? 0.12 : 0.72) : sy * h), z + Math.cos(phi) * w);
        uvs.push(t, j / NR);
      }
    }
    for (let i = 0; i < NT; i++) for (let j = 0; j < NR; j++) { const p = i * (NR + 1) + j, q = p + NR + 1; index.push(p, p + 1, q, p + 1, q + 1, q); }
    const bodyGeometry = new THREE.BufferGeometry();
    bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    bodyGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    bodyGeometry.setIndex(index); bodyGeometry.computeVertexNormals();
    const body = new THREE.Mesh(bodyGeometry, hide); body.castShadow = body.receiveShadow = true; croc.add(body);

    // Back scutes: two rows over the trunk, one tall row down the tail.
    const scutes: Item[] = [];
    for (let t = 0.3; t < 0.97; t += 0.022) {
      const [w, h] = girth(t), [x, y, z] = spine(t);
      if (t < 0.68) for (const d of [-1, 1]) scutes.push({ p: new THREE.Vector3(x, y + h * 0.93, z + d * w * 0.42), s: new THREE.Vector3(1, 0.8, 1) });
      else scutes.push({ p: new THREE.Vector3(x, y + h * 0.95, z), s: new THREE.Vector3(1.1, mix(1.9, 0.6, (t - 0.68) / 0.3), 0.5) });
    }
    instanced(croc, new THREE.ConeGeometry(0.014, 0.03, 4), ridge, scutes);

    // Eyes.
    const [ex, ey, ez] = spine(0.232), [ew, eh] = girth(0.232);
    for (const d of [-1, 1]) {
      const brow = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), plain); brow.position.set(ex, ey + eh * 0.92, ez + d * ew * 0.55); brow.castShadow = true; croc.add(brow);
      if (a.condition === 'motheaten' && d > 0) continue;
      const colour = { glass: '#e8c020', empty: '#0c0a08', buttons: d > 0 ? '#2a4a8a' : '#e8e2d0', embers: '#ff2a10' }[a.eyes];
      const eye = new THREE.Mesh(new THREE.SphereGeometry(a.eyes === 'buttons' ? 0.016 : 0.013, 10, 8), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.15, emissive: a.eyes === 'embers' ? '#ff2a10' : '#000000', emissiveIntensity: a.eyes === 'embers' ? 1.4 : 0 }));
      eye.position.set(ex + 0.004, ey + eh * 0.98, ez + d * (ew * 0.55 + 0.018)); if (a.eyes === 'buttons') eye.scale.z = 0.35; croc.add(eye);
      if (a.eyes === 'glass') { const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.02, 0.004), new THREE.MeshStandardMaterial({ color: '#0c0a08' })); pupil.position.set(ex + 0.004, ey + eh * 0.98, ez + d * (ew * 0.55 + 0.031)); croc.add(pupil); }
    }

    // Lower jaw and teeth.
    const tooth = new THREE.MeshStandardMaterial({ color: dusted('#efe8d2', dust * 0.4), roughness: 0.5 });
    const hingeT = 0.215, [hx, hy, hz] = spine(hingeT), jawLen = hingeT * L - 0.012;
    const halfAt = (u: number) => mix(0.074, 0.026, u); // u: hinge 0 → tip 1
    const jawGeometry = new THREE.BoxGeometry(jawLen, 0.024, 1, 6, 1, 1);
    const jp = jawGeometry.attributes.position;
    for (let i = 0; i < jp.count; i++) { const u = jp.getX(i) / jawLen + 0.5; jp.setZ(i, jp.getZ(i) * 2 * halfAt(u)); if (jp.getY(i) < 0) jp.setY(i, jp.getY(i) * mix(1.6, 0.6, u)); }
    jawGeometry.computeVertexNormals();
    const jaw = new THREE.Group(); jaw.position.set(hx, hy - 0.012, hz);
    const jawMesh = new THREE.Mesh(jawGeometry, new THREE.MeshStandardMaterial({ color: dusted(belly, dust * 0.6), roughness: 0.85 })); jawMesh.position.set(jawLen / 2, -0.012, 0); jawMesh.castShadow = true; jaw.add(jawMesh);
    const gape = { closed: 0.03, grin: 0.27, gaping: 0.7 }[a.mouth] + random() * 0.04;
    jaw.rotation.z = -gape; croc.add(jaw);
    if (a.mouth !== 'closed') { const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshStandardMaterial({ color: dusted('#b05a50', dust * 0.5), roughness: 0.7 })); tongue.scale.set(jawLen * 0.4, 0.008, 0.03); tongue.position.set(jawLen * 0.45, 0.004, 0); jaw.add(tongue); }
    const down = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    const upper: Item[] = [], lower: Item[] = [];
    for (let i = 0; i < 13; i++) {
      const t = 0.012 + i * 0.0145, [w] = girth(t), [x, y, z] = spine(t), size = 0.8 + random() * 0.7;
      if (a.condition === 'motheaten' && random() < 0.3) continue;
      for (const d of [-1, 1]) upper.push({ p: new THREE.Vector3(x, y - 0.01, z + d * w * 0.86), q: down, s: new THREE.Vector3(1, size, 1) });
      const u = 1 - (i + 0.5) / 13.5;
      for (const d of [-1, 1]) lower.push({ p: new THREE.Vector3(u * jawLen, 0.008, d * halfAt(u) * 0.84), s: new THREE.Vector3(1, size * 0.9, 1) });
    }
    const toothGeometry = new THREE.ConeGeometry(0.0065, 0.022, 5);
    instanced(croc, toothGeometry, tooth, upper);
    instanced(jaw, toothGeometry.clone(), tooth, lower);

    // Legs dangle from the trunk.
    const feet: THREE.Vector3[] = [];
    [[0.36, 1], [0.36, -1], [0.63, 1], [0.63, -1]].forEach(([t, d], i) => {
      if (a.condition === 'motheaten' && i === 2) return;
      const [w, h] = girth(t), [x, y, z] = spine(t), back = t > 0.5 ? 1 : 0;
      const A = new THREE.Vector3(x, y - h * 0.3, z + d * w * 0.8);
      const B = A.clone().add(new THREE.Vector3(back ? 0.05 : -0.03, -0.05 - random() * 0.02, d * (0.075 + back * 0.02)));
      const C = B.clone().add(new THREE.Vector3(back ? -0.05 : 0.04, -0.085 - random() * 0.02, d * 0.01));
      for (const [P, Q, r0, r1] of [[A, B, 0.034 + back * 0.008, 0.024], [B, C, 0.024, 0.016]] as const) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, P.distanceTo(Q), 8), plain);
        seg.position.copy(P).add(Q).multiplyScalar(0.5); seg.quaternion.setFromUnitVectors(UP, Q.clone().sub(P).normalize()); seg.castShadow = true; croc.add(seg);
      }
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), plain); knee.position.copy(B); croc.add(knee);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), plain); foot.scale.set(0.03, 0.014, 0.026); foot.position.copy(C).add(new THREE.Vector3(0.012, -0.008, 0)); croc.add(foot);
      const claws: Item[] = [];
      for (let c = -1; c <= 1; c++) claws.push({ p: C.clone().add(new THREE.Vector3(0.04, -0.012, c * 0.016)), q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -1.9) });
      instanced(croc, new THREE.ConeGeometry(0.005, 0.028, 4), tooth, claws);
      feet.push(C);
    });

    // Straw from split seams.
    if (a.condition === 'motheaten') {
      const straw: Item[] = [];
      for (const t of [0.63, 0.44, 0.8, 0.232]) {
        const [w, h] = girth(t), [x, y, z] = spine(t), sideZ = t === 0.63 ? 1 : random() < 0.5 ? 1 : -1;
        for (let i = 0; i < 14; i++) {
          const dir = new THREE.Vector3((random() - 0.5) * 1.2, t === 0.232 ? 0.6 : -0.9 + random() * 0.8, sideZ * (0.5 + random())).normalize();
          straw.push({ p: new THREE.Vector3(x + (random() - 0.5) * 0.04, y - h * 0.2, z + sideZ * w * 0.75).addScaledVector(dir, 0.03), q: new THREE.Quaternion().setFromUnitVectors(UP, dir), s: new THREE.Vector3(1, 0.6 + random() * 0.9, 1) });
        }
      }
      instanced(croc, new THREE.CylinderGeometry(0.002, 0.003, 0.09, 4), new THREE.MeshStandardMaterial({ color: '#d9b95a', roughness: 1 }), straw);
    }

    // Straps.
    const iron = s.material('#2a292c', { metalness: 0.5, roughness: 0.65 });
    const hemp = s.material('#a88a56', { roughness: 1 });
    const line = a.hanger === 'rope' ? hemp : iron;
    const holds = [0.37, 0.62].map((t) => {
      const [w, h] = girth(t), [x, y, z] = spine(t);
      const band = new THREE.Mesh(new THREE.TorusGeometry(w + 0.004, 0.009, 6, 28), line);
      band.rotation.y = Math.PI / 2; band.scale.set(1, (h * 0.87) / w, 1); band.position.set(x, y + h * 0.13, z); band.castShadow = true; croc.add(band);
      return new THREE.Vector3(x, y + h + 0.006, z);
    });

    // Adornments, in the animal's own space.
    const [nx, ny, nz] = spine(0.3), [nw, nh] = girth(0.3);
    if (a.adornment === 'bow') {
      const silk = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#d8263c' : '#3a2a5a', roughness: 0.5, side: THREE.DoubleSide });
      const band = new THREE.Mesh(new THREE.TorusGeometry(nw + 0.006, 0.012, 6, 24), silk); band.rotation.y = Math.PI / 2; band.scale.set(1, nh / nw, 1); band.position.set(nx, ny + nh * 0.1, nz); croc.add(band);
      for (const d of [-1, 1]) { const loop = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), silk); loop.scale.set(0.018, 0.035, 0.055); loop.position.set(nx, ny + nh + 0.03, nz + d * 0.055); loop.rotation.x = d * 0.4; loop.castShadow = true; croc.add(loop); const tail = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.11, 0.03), silk); tail.position.set(nx + 0.01, ny + nh - 0.03, nz + d * 0.03 + nw * 0.55); tail.rotation.x = -d * 0.3 - 0.5; croc.add(tail); }
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), silk); knot.position.set(nx, ny + nh + 0.02, nz); croc.add(knot);
    }
    if (a.adornment === 'tag') {
      const tc = document.createElement('canvas'); tc.width = 128; tc.height = 192; const t2 = tc.getContext('2d')!;
      t2.fillStyle = '#e9dcba'; t2.fillRect(0, 0, 128, 192); t2.fillStyle = '#2a1c12'; t2.textAlign = 'center'; t2.font = 'bold 30px Georgia, serif'; t2.fillText(['NOT', 'RARE', 'SOLD', 'NILE'][Math.floor(random() * 4)], 64, 80); t2.font = 'bold 34px Georgia, serif'; t2.fillText(['FOR SALE', 'XII s.', '3 gns', 'A.D. 1602'][Math.floor(random() * 4)].slice(0, 7), 64, 130); t2.beginPath(); t2.arc(64, 22, 8, 0, 7); t2.fill();
      const map = new THREE.CanvasTexture(tc); map.colorSpace = THREE.SRGBColorSpace;
      const [fx, fy, fz] = spine(0.36), [fw] = girth(0.36);
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.18), new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }));
      tag.position.set(fx - 0.02, fy - 0.3, fz + fw + 0.07); tag.rotation.set(0.1, 0.2, (random() - 0.5) * 0.4); tag.castShadow = true; croc.add(tag);
      chain(croc, hemp, new THREE.Vector3(fx - 0.02, fy - 0.215, fz + fw + 0.07), new THREE.Vector3(fx, fy - 0.03, fz + fw * 0.9), true);
    }
    if (a.adornment === 'herbs') {
      const greens = ['#6a7a3a', '#8a8a4a', '#7a6a8a', '#a89a5a'];
      feet.forEach((C) => {
        const n = 1 + Math.round(mood.density * 2);
        for (let b = 0; b < n; b++) {
          const drop = 0.07 + random() * 0.08, at = C.clone().add(new THREE.Vector3((b - (n - 1) / 2) * 0.05, -drop, 0));
          chain(croc, hemp, C, at, true);
          const bunch = new THREE.Mesh(new THREE.ConeGeometry(0.045 + random() * 0.02, 0.17 + random() * 0.06, 7), new THREE.MeshStandardMaterial({ color: dusted(greens[Math.floor(random() * 4)], dust * 0.5), roughness: 1, flatShading: true }));
          bunch.position.copy(at).add(new THREE.Vector3(0, -0.08, 0)); bunch.castShadow = true; croc.add(bunch);
        }
      });
    }
    let lamp: THREE.MeshStandardMaterial | null = null;
    if (a.adornment === 'lantern') {
      const hang = new THREE.Vector3(jawLen * 0.75, -0.03, 0), end = hang.clone().add(new THREE.Vector3(0, -0.1, 0));
      const lantern = new THREE.Group(); jaw.add(lantern); lantern.rotation.z = gape; // hangs plumb whatever the gape
      lantern.position.copy(hang.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), 0)); lantern.position.set(hang.x, hang.y, 0);
      chain(lantern, iron, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.1, 0), true); void end;
      const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.11, 6, 1, true), new THREE.MeshStandardMaterial({ color: '#2a292c', metalness: 0.5, wireframe: false, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); cage.position.y = -0.165; lantern.add(cage);
      lamp = new THREE.MeshStandardMaterial({ color: '#ffd070', emissive: '#ffb030', emissiveIntensity: 1.3 });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), lamp); glow.position.y = -0.17; lantern.add(glow);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.04, 6), iron); cap.position.y = -0.095; cap.castShadow = true; lantern.add(cap);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.012, 6), iron); foot.position.y = -0.225; lantern.add(foot);
    }

    // Mount.
    const span = L * k + 0.3, drop = 0.2 + 0.06 * k;
    const beamY = Math.max(1.3 + 0.22 * k, a.condition === 'snapped' ? drop + 0.75 * k + 0.3 : 0);
    const archR = span / 2 + 0.1, archRise = 0.5;
    const timber = s.material(dusted('#5e4630', dust * 0.4).getStyle(), { roughness: 0.95 });
    const attachY = (x: number) => a.mount === 'arch' ? beamY - 0.42 + 0.07 + Math.sqrt(Math.max(0.0001, 1 - (x / archR) ** 2)) * archRise - 0.11 : beamY - 0.07;
    if (a.mount === 'beam') {
      s.box([span + 0.3, 0.14, 0.16], [0, beamY, 0], timber);
      for (const d of [-1, 1]) {
        s.box([0.13, beamY - 0.07, 0.13], [d * span / 2, (beamY - 0.07) / 2, 0], timber);
        s.box([0.4, 0.08, 0.5], [d * span / 2, 0.04, 0], timber);
        s.rod([d * span / 2, beamY - 0.36, 0], [d * (span / 2 - 0.28), beamY - 0.06, 0], 0.035, timber);
      }
    } else if (a.mount === 'gibbet') {
      const px = -span / 2;
      s.box([0.15, beamY + 0.2, 0.15], [px, (beamY + 0.2) / 2, 0], timber);
      s.box([0.7, 0.1, 0.7], [px, 0.05, 0], timber);
      for (const z of [-1, 1]) s.rod([px, 0.55, 0], [px, 0.08, z * 0.3], 0.04, timber);
      s.rod([px, 0.55, 0], [px + 0.3, 0.08, 0], 0.04, timber);
      s.box([span + 0.1, 0.12, 0.12], [px + (span + 0.1) / 2, beamY, 0], timber);
      s.rod([px, beamY - 0.5, 0], [px + 0.48, beamY - 0.05, 0], 0.04, timber);
      s.ball([0.07, 0.07, 0.07], [px, beamY + 0.24, 0], timber, 10);
    } else {
      const bc = document.createElement('canvas'); bc.width = bc.height = 256; const b = bc.getContext('2d')!; b.fillStyle = '#c8bda6'; b.fillRect(0, 0, 256, 256);
      const c = new THREE.Color();
      for (let r = 0; r < 12; r++) for (let i = -1; i < 3; i++) { c.set('#96503a').lerp(new THREE.Color('#aaa494'), dust * 0.4).offsetHSL(0, (random() - 0.5) * 0.1, (random() - 0.5) * 0.14); b.fillStyle = c.getStyle(); b.fillRect((i + (r % 2) / 2) * 86 + 2, r * 21.3 + 2, 82, 17.5); }
      const map = new THREE.CanvasTexture(bc); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping;
      const brick = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
      const spring = beamY - 0.42;
      for (const d of [-1, 1]) { s.box([0.3, spring, 0.42], [d * (span / 2 + 0.12), spring / 2, 0], brick); s.box([0.36, 0.07, 0.48], [d * (span / 2 + 0.12), spring + 0.035, 0], s.material('#8d8a80')); }
      const steps = 13;
      const point = (g: number) => new THREE.Vector2(Math.cos(g) * archR, spring + 0.07 + Math.sin(g) * archRise);
      for (let i = 0; i < steps; i++) {
        const g = Math.PI * (i + 0.5) / steps, at = point(g);
        const length = point(Math.PI * i / steps).distanceTo(point(Math.PI * (i + 1) / steps)) * 1.12;
        const voussoir = s.box([0.2, length, 0.42], [at.x, at.y, 0], brick);
        voussoir.rotation.z = Math.atan2(Math.cos(g) * archRise, -Math.sin(g) * archR) - Math.PI / 2;
      }
    }

    // Hang it.
    const swing = new THREE.Group(); swing.position.y = beamY - 0.07; s.root.add(swing);
    croc.scale.setScalar(k);
    const hookWorld = holds.map((h) => new THREE.Vector3(h.x * k, 0, 0));
    const snapped = a.condition === 'snapped';
    if (!snapped) {
      croc.position.set(0, -drop - holds[0].y * k, -holds[0].z * k * 0.5);
      swing.add(croc);
      holds.forEach((h, i) => {
        const top = new THREE.Vector3(hookWorld[i].x, attachY(hookWorld[i].x) - (beamY - 0.07), 0);
        chain(swing, line, top, new THREE.Vector3(h.x * k, croc.position.y + h.y * k, croc.position.z + h.z * k), a.hanger === 'rope');
        s.ring(0.03, 0.007, [top.x, beamY - 0.07 + top.y + 0.01, 0], iron);
      });
    } else {
      // Pivot on the front strap; the tail swings down.
      const pivot = new THREE.Group(); pivot.position.set(hookWorld[0].x * 0.4, -drop, 0); swing.add(pivot);
      croc.position.set(-holds[0].x * k, -holds[0].y * k, -holds[0].z * k); pivot.add(croc);
      pivot.rotation.z = 1.12 + random() * 0.12;
      chain(swing, line, new THREE.Vector3(pivot.position.x, attachY(pivot.position.x) - (beamY - 0.07), 0), pivot.position.clone(), a.hanger === 'rope');
      const topX = hookWorld[1].x, topY = attachY(topX) - (beamY - 0.07);
      chain(swing, line, new THREE.Vector3(topX, topY, 0), new THREE.Vector3(topX + 0.02, topY - drop * 0.55, 0), a.hanger === 'rope');
    }

    // Cobwebs.
    if (a.condition === 'dusty' || mood.wear > 0.75) {
      const web = new THREE.MeshStandardMaterial({ color: '#f0efe8', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
      const n = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) {
        const x = (random() - 0.5) * span * 0.8, w = 0.25 + random() * 0.3, h = 0.2 + random() * 0.25;
        const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(w, 0); shape.quadraticCurveTo(w * 0.3, -h * 0.25, w * 0.1, -h); shape.quadraticCurveTo(w * 0.12, -h * 0.3, 0, 0);
        const sheet = s.mesh(new THREE.ShapeGeometry(shape), web, [x, attachY(x) - 0.005, (random() - 0.5) * 0.06]); sheet.castShadow = false; if (random() < 0.5) sheet.scale.x = -1;
      }
    }

    const speed = mix(0.3, 1.8, mood.energy), amp = mix(0.01, 0.07, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        swing.rotation.x = Math.sin(time * speed) * amp;
        if (lamp) lamp.emissiveIntensity = 1.3 + 0.25 * Math.sin(time * 9);
      },
    });
  },
});
