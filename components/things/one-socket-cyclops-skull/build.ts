import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { labelPlane, paint } from './lab';
import { type Surf, cord, eyeTexture, headForm, ticks } from './head';

/** A curved horn or tusk tapering to a point. */
function horn(points: THREE.Vector3[], radius: number, material: THREE.Material, blunt = 0.06) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 28, 1, 9);
  const position = geometry.attributes.position, centre = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i <= 28; i++) {
    curve.getPointAt(i / 28, centre);
    const r = radius * Math.max(blunt, 1 - (i / 28) ** 1.4);
    for (let j = 0; j <= 9; j++) {
      const k = i * 10 + j;
      p.fromBufferAttribute(position, k).sub(centre).multiplyScalar(r).add(centre);
      position.setXYZ(k, p.x, p.y, p.z);
    }
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

const LABELS = {
  proud: ['CYCLOPS', 'Sicily. Genuine.'],
  named: ['Polyphemus ?', 'gift of a sailor'],
  doubt: ['"Cyclops"', 'the hole is odd'],
  honest: ['Not a cyclops.', 'Dwarf elephant:', 'that is its nose.'],
  tag: ['No. 1'],
} as const;

export default defineThing({
  questions: {
    size: choice('How big was the cyclops?', {
      child: 'A child: a small round skull with an oversized socket and milk teeth.',
      grown: 'Full grown, half as big again as a man\'s skull.',
      giant: 'A giant: low, wide and enormously thick, with a human skull beside it for scale.',
    }),
    teeth: choice('What are its teeth like?', {
      blunt: 'Blunt square grinders, a plant eater after all.',
      fangs: 'A full row of pointed fangs.',
      tusks: 'Two boar tusks jutting up from the lower jaw.',
      ivory: 'Two long curving ivory tusks from the upper jaw, suspiciously like an elephant\'s.',
    }),
    extra: choice('What else marks the skull?', {
      none: 'Nothing: clean bone.',
      horn: 'A short horn growing from the brow above the socket.',
      crown: 'A cracked crown with a piece of the skull missing.',
      wound: 'A round hole in the temple with a smooth healed rim: an old spear wound it survived.',
    }),
    socket: choice('What sits in the single socket?', {
      empty: 'Nothing but shadow.',
      glass: 'A huge glass eye somebody fitted, staring.',
      candle: 'A lit candle stub, turning the skull into a lantern.',
      nest: 'A bird\'s nest with eggs and the bird at home.',
    }),
    jaw: choice('What state is the lower jaw in?', {
      closed: 'In place, teeth together.',
      open: 'Hanging wide open in a roar.',
      wired: 'Articulated with brass springs so a curator can make it talk.',
      lost: 'Missing: only the upper skull survives.',
    }),
    mount: choice('How is it mounted?', {
      cradle: 'On a brass armature rising from a polished wooden base.',
      block: 'Resting on a black stone museum block.',
      crate: 'Still in its packing crate, bedded in straw.',
      cushion: 'On a tasselled velvet cushion like a relic.',
    }),
    label: choice('What does the hand-written label say?', {
      proud: 'CYCLOPS. Sicily. Genuine.',
      named: 'Polyphemus? Gift of a sailor.',
      doubt: 'Cyclops in quotation marks, with a note that the hole is odd.',
      honest: 'A later hand admits it: not a cyclops, a dwarf elephant, and that is its nose.',
      tag: 'Only a numbered string tag.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const k = { child: 0, grown: 0.5, giant: 1 }[a.size];
    const W = mix(0.095, 0.118, k), H = mix(0.108, 0.094, k), D = mix(0.105, 0.122, k);
    const head = headForm({ w: W, h: H, d: D, jaw: 0.25, brow: mix(0.1, 0.5, k), nose: 0, socket: 0, cheek: mix(0.5, 1.2, k), chin: 0, lips: 0, muzzle: mix(0.22, 0.42, k) });
    const eyeRx = mix(0.42, 0.35, k), eyeRy = mix(0.36, 0.28, k), eyeY = 0.12;
    const crown = { az: 0.9 * (random() < 0.5 ? -1 : 1), theta: 0.55 };
    const crownJag = Array.from({ length: 9 }, () => 0.7 + random() * 0.6);
    const woundAt: [number, number] = [0.62 * (random() < 0.5 ? -1 : 1), 0.52];
    const holes = (x: number, y: number, az: number, theta: number) => {
      if (Math.abs(az) < 1.5) {
        if ((x / eyeRx) ** 2 + ((y - eyeY) / eyeRy) ** 2 < 1) return true;
        const ny = y + 0.42;
        if ((x / (0.1 + Math.max(0, -ny) * 0.5)) ** 2 + (ny / 0.12) ** 2 < 1) return true;
        if (a.extra === 'wound' && Math.hypot(x - woundAt[0], y - woundAt[1]) < 0.085) return true;
      }
      if (a.extra === 'crown') {
        const da = az - crown.az, dt = theta - crown.theta;
        const ang = Math.atan2(dt, da * 0.6) + Math.PI;
        if (Math.hypot(da * 0.6, dt) < 0.3 * crownJag[Math.floor((ang / (Math.PI * 2)) * 9) % 9]) return true;
      }
      return false;
    };

    const tint = new THREE.Color('#e6dab8').lerp(new THREE.Color('#a98a5a'), mood.wear * 0.5);
    const boneMap = paint(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = `#${tint.getHexString()}`; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40 + mood.wear * 160; i++) {
        const x = random() * w, y = random() * h, r = 10 + random() * 50;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(110,72,30,${0.07 + mood.wear * 0.16})`); g.addColorStop(1, 'rgba(110,72,30,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // Sutures zigzag over the vault; cracks multiply with age.
      ctx.strokeStyle = 'rgba(70,45,20,0.75)'; ctx.lineWidth = 2;
      const zig = (x0: number, y0: number, x1: number, y1: number, steps: number, amp: number) => { ctx.beginPath(); for (let i = 0; i <= steps; i++) { const t = i / steps; const x = mix(x0, x1, t) + (i % 2 ? amp : -amp) * (y0 === y1 ? 0 : 1), y = mix(y0, y1, t) + (i % 2 ? amp : -amp) * (y0 === y1 ? 1 : 0); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); };
      zig(0, h * 0.22, w, h * 0.22, 120, 4);
      zig(w * 0.2, h * 0.22, w * 0.2, h * 0.55, 30, 4); zig(w * 0.8, h * 0.22, w * 0.8, h * 0.55, 30, 4);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3 + mood.wear * 14; i++) {
        let x = random() * w, y = random() * h * 0.7;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let j = 0; j < 8; j++) { x += (random() - 0.5) * 40; y += random() * 22; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      const shade = (fx: number, fy: number, r: number) => { const [u, v] = head.uv(fx, fy); const g = ctx.createRadialGradient(u * w, v * h, r * 0.4, u * w, v * h, r); g.addColorStop(0, 'rgba(60,40,20,0.55)'); g.addColorStop(1, 'rgba(60,40,20,0)'); ctx.fillStyle = g; ctx.fillRect(u * w - r, v * h - r, r * 2, r * 2); };
      shade(0, eyeY, 110); shade(0, -0.42, 50);
    });
    const bone = new THREE.MeshStandardMaterial({ map: boneMap, roughness: 0.75 });
    const plain = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.75 });
    const hollow = new THREE.MeshStandardMaterial({ color: '#2a1c12', roughness: 1, side: THREE.BackSide });
    const flat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.7, ...options });
    const ivory = flat(new THREE.Color('#f1e8cf').lerp(new THREE.Color('#b99a62'), mood.wear * 0.45), { roughness: 0.45 });

    const all = new THREE.Group();
    s.root.add(all);
    const skull = new THREE.Group();
    all.add(skull);
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = skull) => {
      node.traverse((child) => { if ((child as THREE.Mesh).isMesh) child.castShadow = child.receiveShadow = true; });
      parent.add(node);
      return node;
    };
    const cut = 2.22;
    add(new THREE.Mesh(head.grid({ nu: 110, nv: 64, bottom: () => cut, skip: holes }), bone));
    const inner = new THREE.Mesh(head.grid({ nu: 60, nv: 30, bottom: () => cut, lift: -0.006 }), hollow);
    skull.add(inner);

    // Bony rims round the openings, and cheek arches.
    const loop = (cx: number, cy: number, rx: number, ry: number, lift: number, n = 26) => Array.from({ length: n }, (_u, i) => { const ang = (i / n) * Math.PI * 2; return head.face(cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry, lift); });
    add(cord(loop(0, eyeY, eyeRx * 1.03, eyeRy * 1.04, 0.002), mix(0.008, 0.013, k), plain, 0, true));
    add(cord(loop(0, -0.435, 0.115, 0.115, 0, 14), 0.0045, plain, 0, true));
    for (const sx of [-1, 1]) add(cord([head.face(sx * 0.5, -0.2, 0.004), head.surf(sx * 1.0, 1.82, 0.012), head.surf(sx * 1.45, 1.75, 0.004)], mix(0.007, 0.011, k), plain));
    if (a.extra === 'wound') add(cord(loop(woundAt[0], woundAt[1], 0.092, 0.092, 0.001, 14), 0.0075, plain, 0, true));
    if (a.extra === 'horn') {
      const root = head.face(0, 0.62);
      add(horn([root.p.clone().addScaledVector(root.n, -0.01), root.p.clone().addScaledVector(root.n, 0.03).add(new THREE.Vector3(0, 0.01, 0)), root.p.clone().addScaledVector(root.n, 0.055).add(new THREE.Vector3(0, 0.04, 0)), root.p.clone().addScaledVector(root.n, 0.06).add(new THREE.Vector3(0, 0.08, -0.004))], 0.022, flat('#6b5a44', { roughness: 0.5 })));
    }
    if (a.extra === 'crown') {
      const dark = flat('#3a2816');
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 + random();
        const path = Array.from({ length: 5 }, (_u, j) => head.surf(crown.az + (Math.cos(ang) * (0.32 + j * 0.13)) / 0.6 + (random() - 0.5) * 0.08, Math.max(0.08, crown.theta + Math.sin(ang) * (0.32 + j * 0.13) + (random() - 0.5) * 0.08), 0.0006));
        add(cord(path, 0.0014, dark));
      }
    }

    // Upper teeth along the cut of the jaw.
    const toothH = mix(0.014, 0.024, k) * (a.teeth === 'fangs' ? 1.25 : 1), toothW = mix(0.01, 0.015, k);
    const gaps = (path: Surf[]) => path.filter(() => random() > mood.wear * 0.4);
    const upper = gaps(Array.from({ length: 13 }, (_u, i) => head.surf(mix(-0.78, 0.78, i / 12), cut + 0.05, -0.004)));
    const peg = a.teeth === 'fangs' ? new THREE.ConeGeometry(0.5, 1, 5) : null;
    const row = (path: Surf[], up: boolean, parent: THREE.Object3D) => {
      if (!peg) { add(ticks(path, ivory, [toothH, toothW * 0.8, toothW * 0.86]), parent); return; }
      for (const point of path) { const tooth = add(new THREE.Mesh(peg, ivory), parent); tooth.scale.set(toothW, toothH, toothW); tooth.position.copy(point.p); if (!up) tooth.rotation.x = Math.PI; }
    };
    row(upper.map((point) => ({ p: point.p.clone().add(new THREE.Vector3(0, -toothH * 0.25, 0)), n: point.n })), false, skull);
    if (a.teeth === 'ivory') {
      for (const sx of [-1, 1]) {
        const root = head.surf(sx * 0.42, cut - 0.12).p;
        add(horn([root.clone().add(new THREE.Vector3(0, 0.02, -0.02)), root.clone().add(new THREE.Vector3(sx * 0.02, -0.02, 0.05)), root.clone().add(new THREE.Vector3(sx * 0.04, -0.015, 0.14)), root.clone().add(new THREE.Vector3(sx * 0.03, 0.04, 0.22)), root.clone().add(new THREE.Vector3(-sx * 0.005, 0.11, 0.25))], mix(0.014, 0.02, k), ivory));
      }
    }

    // Lower jaw.
    const jaw = new THREE.Group();
    const hinge = new THREE.Vector3(0, -H * 0.2, -D * 0.25);
    jaw.position.copy(hinge);
    const jawDrop = { closed: 0.02, open: 0.5, wired: 0.22, lost: 0 }[a.jaw];
    if (a.jaw !== 'lost') {
      skull.add(jaw);
      const chinY = -H * 1.02 - hinge.y, backY = -H * 0.72 - hinge.y;
      const arch = [[-W * 0.86, 0, 0], [-W * 0.84, backY, -D * 0.05], [-W * 0.62, chinY + 0.01, D * 0.62], [0, chinY, D * 1.08], [W * 0.62, chinY + 0.01, D * 0.62], [W * 0.84, backY, -D * 0.05], [W * 0.86, 0, 0]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
      const curve = new THREE.CatmullRomCurve3(arch, false, 'catmullrom', 0.3);
      const thick = mix(0.012, 0.02, k);
      const bar = add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, thick, 8), plain), jaw);
      bar.scale.y = 1;
      const lower: Surf[] = [];
      for (let i = 0; i <= 12; i++) { const p = curve.getPointAt(mix(0.3, 0.7, i / 12)); lower.push({ p: p.add(new THREE.Vector3(0, thick + toothH * 0.35, 0)), n: new THREE.Vector3(p.x, 0, p.z).normalize() }); }
      row(gaps(lower), true, jaw);
      if (a.teeth === 'tusks') for (const sx of [-1, 1]) { const p = curve.getPointAt(0.5 + sx * 0.085); add(horn([p.clone(), p.clone().add(new THREE.Vector3(sx * 0.012, 0.04, 0.018)), p.clone().add(new THREE.Vector3(sx * 0.03, 0.085, 0.02)), p.clone().add(new THREE.Vector3(sx * 0.04, 0.125, 0.004))], mix(0.011, 0.017, k), ivory), jaw); }
      if (a.jaw === 'wired') {
        const brass = flat('#c39a3c', { metalness: 0.85, roughness: 0.3 });
        for (const sx of [-1, 1]) {
          const coil = Array.from({ length: 40 }, (_u, i) => { const t = i / 39; return new THREE.Vector3(sx * W * 0.95 + Math.cos(t * 44) * 0.006, mix(0.03, backY * 0.8, t), D * 0.12 + Math.sin(t * 44) * 0.006); });
          add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 120, 0.0013, 5), brass), jaw);
          add(new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), brass), jaw).position.set(sx * W * 0.92, 0, 0);
        }
      }
      jaw.rotation.x = jawDrop;
    }

    // What lives in the socket.
    const seat = head.face(0, eyeY).p;
    const socketR = eyeRx * W;
    const flames: THREE.Mesh[] = [];
    let bird: THREE.Group | null = null, glassEye: THREE.Mesh | null = null;
    if (a.socket === 'glass') {
      const map = eyeTexture('round', '#bfe6ff', '#2a6ab0', 0.25, random);
      glassEye = add(new THREE.Mesh(new THREE.SphereGeometry(socketR * 0.9, 28, 18), new THREE.MeshStandardMaterial({ map, roughness: 0.12, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.2 })));
      glassEye.position.set(0, seat.y, seat.z - socketR * 0.62);
      glassEye.rotation.set(0.1, (random() - 0.5) * 0.7, 0, 'YXZ');
    } else if (a.socket === 'candle') {
      (inner.material as THREE.MeshStandardMaterial).emissive.set('#ff8a1c');
      (inner.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.9;
      const wax = flat('#efe6c8', { roughness: 0.4, emissive: '#ffb04a', emissiveIntensity: 0.25 });
      const floorY = seat.y - eyeRy * H * 0.92, z = seat.z - socketR * 0.45;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.03, 12), wax)).position.set(0, floorY + 0.015, z);
      const flame = add(new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 8), new THREE.MeshBasicMaterial({ color: '#ffd76a' })));
      flame.position.set(0, floorY + 0.047, z); flame.castShadow = false; flames.push(flame);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(socketR * 0.8, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.3, depthWrite: false }));
      halo.position.set(0, seat.y, seat.z - socketR * 0.3); skull.add(halo); flames.push(halo);
      for (let i = 0; i < 4; i++) { const drip = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.012 + random() * 0.03, 3, 6), wax)); const at = head.face((random() - 0.5) * eyeRx, eyeY - eyeRy * 1.02, 0.004); drip.position.copy(at.p).add(new THREE.Vector3(0, -0.012, 0)); }
    } else if (a.socket === 'nest') {
      const floorY = seat.y - eyeRy * H * 0.8, z = seat.z - socketR * 0.25;
      const twig = new THREE.BoxGeometry(1, 0.0022, 0.0022), straw = flat('#8a6a3a');
      const twigs = add(new THREE.InstancedMesh(twig, straw, 46));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 46; i++) { const ang = random() * Math.PI * 2, r = socketR * (0.35 + random() * 0.5); e.set((random() - 0.5) * 0.6, ang + Math.PI / 2 + (random() - 0.5), (random() - 0.5) * 0.5); m.compose(new THREE.Vector3(Math.cos(ang) * r, floorY + random() * 0.012, z + Math.sin(ang) * r * 0.6), q.setFromEuler(e), new THREE.Vector3(socketR * (0.5 + random() * 0.6), 1, 1)); twigs.setMatrixAt(i, m); }
      bird = add(new THREE.Group());
      bird.position.set(socketR * 0.1, floorY + 0.014, z + 0.004);
      const feather = flat(mood.cheer > 0.5 ? '#c8502a' : '#3b3b44'), ball = new THREE.SphereGeometry(1, 12, 8);
      const body = add(new THREE.Mesh(ball, feather), bird); body.scale.set(0.013, 0.011, 0.017);
      const noggin = add(new THREE.Mesh(ball, feather), bird); noggin.scale.setScalar(0.008); noggin.position.set(0, 0.012, 0.012);
      const beak = add(new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.009, 5), flat('#e0a21c')), bird); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.012, 0.023);
      for (let i = 0; i < 2; i++) { const egg = add(new THREE.Mesh(ball, flat('#bfe0e6', { roughness: 0.4 }))); egg.scale.set(0.006, 0.0075, 0.006); egg.position.set(-socketR * (0.35 + i * 0.25), floorY + 0.01, z + 0.006 - i * 0.004); }
    }

    // Mount.
    const tall = a.jaw === 'lost' ? H * 0.72 : H * 1.02 + mix(0.012, 0.02, k) + (a.jaw === 'open' ? D * 0.5 : a.jaw === 'wired' ? D * 0.2 : 0);
    let top = 0;
    const m = new Sculpture(context);
    all.add(m.root);
    if (a.mount === 'cradle') {
      const wood = m.material('#5a351f', { roughness: 0.45 }), brass = m.material('#c39a3c', { metalness: 0.85, roughness: 0.3 });
      m.box([W * 2.7, 0.012, D * 2.5], [0, 0.006, 0], wood); m.box([W * 2.5, 0.02, D * 2.3], [0, 0.022, 0], wood);
      top = 0.032 + 0.07;
      m.rod([0, 0.03, -D * 0.55], [0, top + tall - H * 0.55, -D * 0.55], 0.006, brass);
      m.cylinder(0.02, 0.026, 0.012, [0, 0.038, -D * 0.55], brass, 16);
      for (const sx of [-1, 1]) m.tube([[0, top + tall - H * 0.6, -D * 0.55], [sx * W * 0.5, top + tall - H * 0.72, -D * 0.3], [sx * W * 0.7, top + tall - H * 0.66, D * 0.25], [sx * W * 0.72, top + tall - H * 0.5, D * 0.34]], 0.0045, brass);
    } else if (a.mount === 'block') {
      top = 0.07;
      m.box([W * 2.15, top, D * 2.1], [0, top / 2, 0], m.material('#1f2022', { roughness: 0.35 }));
    } else if (a.mount === 'crate') {
      const pine = m.material('#b08a55', { roughness: 0.9 });
      const cw = W * 3, cd = D * 2.9, ch = 0.11;
      m.box([cw, 0.012, cd], [0, 0.006, 0], pine);
      for (const sx of [-1, 1]) { m.box([0.012, ch, cd], [sx * cw / 2, ch / 2, 0], pine); m.box([cw, ch, 0.012], [0, ch / 2, -sx * cd / 2 * (sx > 0 ? 1 : 1) * sx], pine); }
      for (const sx of [-1, 1]) m.box([0.018, ch * 1.05, 0.02], [sx * (cw / 2 - 0.03), ch / 2, cd / 2 + 0.008], m.material('#8d6b3d'));
      const strawMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.0025, 0.0025), new THREE.MeshStandardMaterial({ color: '#d9bd6a', roughness: 0.9 }), 260);
      const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 260; i++) { e.set((random() - 0.5) * 0.9, random() * Math.PI, (random() - 0.5) * 0.9); mat.compose(new THREE.Vector3((random() - 0.5) * cw * 0.9, 0.03 + random() * ch * 0.85, (random() - 0.5) * cd * 0.9), q.setFromEuler(e), new THREE.Vector3(0.04 + random() * 0.06, 1, 1)); strawMesh.setMatrixAt(i, mat); }
      strawMesh.castShadow = true; m.root.add(strawMesh);
      top = ch * 0.55;
    } else {
      const wood = m.material('#3a2618', { roughness: 0.5 });
      m.box([W * 2.5, 0.03, D * 2.3], [0, 0.015, 0], wood);
      const velvet = m.material(mood.cheer > 0.5 ? '#a3243a' : '#4a1f55', { roughness: 0.95 });
      const pad = m.ball([W * 1.22, 0.036, D * 1.14], [0, 0.058, 0], velvet, 24);
      pad.geometry = new THREE.BoxGeometry(2, 2, 2, 8, 2, 8);
      const pos = pad.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, pos.getY(i) * (1 - 0.55 * Math.max(Math.abs(x), Math.abs(z)) ** 3)); }
      pad.geometry.computeVertexNormals();
      const gold = m.material('#d2a63a', { metalness: 0.6, roughness: 0.4 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { m.ball([0.011, 0.011, 0.011], [sx * W * 1.22, 0.052, sz * D * 1.14], gold, 8); m.mesh(new THREE.ConeGeometry(0.009, 0.035, 8), gold, [sx * W * 1.3, 0.036, sz * D * 1.22]); }
      top = 0.078;
    }
    skull.position.y = top + tall;
    if (a.mount === 'crate') skull.rotation.set(-0.12, 0, 0.1);

    // Label, and something for scale.
    const front = D * (a.mount === 'crate' ? 1.62 : 1.45) + (a.teeth === 'ivory' ? 0 : 0);
    if (a.label === 'tag') {
      const tag = labelPlane(LABELS.tag, 0.04, 0.022, { hand: 'caps', random, wear: mood.wear, paper: '#e2cf9f' });
      tag.position.set(W * 0.98, top + tall - H * 0.42, D * 0.55); tag.rotation.set(0, 0.9, -0.15);
      all.add(tag);
      m.rod([W * 0.78, top + tall - H * 0.18, D * 0.42], [W * 0.98, top + tall - H * 0.36, D * 0.55], 0.0008, m.material('#c9b07a'));
    } else {
      const lines = LABELS[a.label];
      const card = labelPlane(lines, 0.105, lines.length > 2 ? 0.066 : 0.05, { hand: a.label === 'proud' ? 'caps' : a.label === 'honest' ? 'scrawl' : 'script', random, wear: mood.wear, ink: a.label === 'honest' ? '#7a1414' : '#2a2018' });
      const side = a.teeth === 'ivory' ? (random() < 0.5 ? -1 : 1) * W * 1.9 : (random() - 0.5) * W * 0.8;
      card.position.set(side, lines.length > 2 ? 0.036 : 0.028, front + 0.02); card.rotation.x = -0.42; card.rotation.z = (random() - 0.5) * 0.08;
      all.add(card);
      m.box([0.03, 0.006, 0.012], [side, 0.003, front + 0.012], m.material('#c39a3c', { metalness: 0.85, roughness: 0.3 }));
    }
    if (a.size === 'giant') {
      const little = new Sculpture(context);
      const pale = little.material('#efe6cc', { roughness: 0.7 }), ink = little.material('#2a1c12');
      little.ball([0.021, 0.022, 0.025], [0, 0.03, 0], pale, 14);
      little.box([0.026, 0.016, 0.02], [0, 0.011, 0.01], pale);
      for (const sx of [-1, 1]) little.ball([0.0055, 0.006, 0.003], [sx * 0.009, 0.028, 0.0225], ink, 8);
      little.ball([0.003, 0.004, 0.002], [0, 0.018, 0.022], ink, 6);
      little.root.position.set(-W * 2.0, a.mount === 'crate' ? 0 : 0, D * 1.1); little.root.rotation.y = 0.5;
      all.add(little.root);
    }
    all.scale.setScalar({ child: 0.7, grown: 1.5, giant: 3.6 }[a.size]);

    const energy = mix(0.2, 1, mood.energy);
    return s.finish({
      update(_dt, time) {
        flames.forEach((flame, i) => { const f = 1 + Math.sin(time * 17 + i) * 0.12 * energy + Math.sin(time * 7.1) * 0.1 * energy; flame.scale.set(1, f, 1); });
        if (bird) { bird.rotation.y = Math.sin(time * 1.7) * 0.5 * energy; bird.position.y += Math.sin(time * 9) * 0.00002 * energy; }
        if (glassEye) glassEye.rotation.y += Math.sin(time * 0.6) * 0.0015 * energy;
        if (a.jaw === 'wired') jaw.rotation.x = jawDrop + Math.max(0, Math.sin(time * mix(1.5, 7, mood.energy))) * 0.16 * energy;
      },
    });
  },
});
