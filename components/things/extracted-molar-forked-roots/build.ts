import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix } from '@conjure/kit';
import { crownGeometry, lump, sweep } from './teeth';


export default defineThing({
  questions: {
    owner: choice('Whose mouth did it come from, by age?', {
      milk: 'A child: a small bluish-white milk molar with short, thin, wide-splayed roots.',
      adult: 'An adult: full sized, sharp cusps, cream enamel, long strong roots.',
      elderly: 'Someone very old: yellowed ivory, cusps ground flat, long exposed roots.',
    }),
    condition: choice('What state is the crown in?', {
      pristine: 'Perfect and unblemished, pulled for no visible reason.',
      cavity: 'A dark brown crater eaten into the biting surface.',
      cracked: 'Split clean in two down the middle, the halves lying apart.',
      amalgam: 'A dull silver amalgam filling packed into the top.',
      rotten: 'Blackened and crumbling, more decay than tooth.',
    }),
    roots: choice('What are the roots like?', {
      two: 'Two straight tapering roots, a tidy fork.',
      three: 'Three roots splayed like a tripod.',
      hooked: 'Long roots with tips that curl sideways into hooks, the kind that fight the forceps.',
      fused: 'One thick fused cone of root.',
    }),
    aftermath: choice('What has just happened to it?', {
      fresh: 'Pulled a minute ago: wet blood on the roots, drops on the surface, a stained gauze wad beside it.',
      dried: 'Long dried and clean, a chalky object from a drawer.',
      mounted: 'Kept as a keepsake, pinned upright on a little turned wooden stand with a brass plate.',
      tagged: 'Catalogued: a paper specimen tag tied round its neck with thread.',
    }),
    pose: choice('How is it resting?', {
      side: 'Lying on its side, roots sprawled.',
      standing: 'Standing crown-up on its root tips like a little creature.',
      inverted: 'Crown down, roots pointing up in the air.',
    }),
    species: choice('What kind of creature grew it?', {
      human: 'Human, ordinary and familiar.',
      ape: 'A great ape: half as big again, heavy peaked cusps, thick tawny roots.',
      undead: 'Something dead that still walks: grey-green enamel, black roots, a faint sick glow.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const milk = a.owner === 'milk', old = a.owner === 'elderly', rot = a.condition === 'rotten', undead = a.species === 'undead';
    const fresh = a.aftermath === 'fresh';
    const k = (milk ? 0.66 : 1) * { human: 1, ape: 1.5, undead: 1.06 }[a.species];
    const W = 0.0105 * k, D = 0.0098 * k, H = 0.0076 * k * (old ? 0.84 : 1) * (a.species === 'ape' ? 1.15 : 1);
    const rootLength = 0.0135 * k * (milk ? 0.62 : old ? 1.12 : 1) * (a.roots === 'hooked' ? 1.12 : 1);

    const enamel = new THREE.Color({ human: '#f4efe1', ape: '#eadcb4', undead: '#a7b596' }[a.species]);
    if (milk && !undead) enamel.lerp(new THREE.Color('#f3f7fb'), 0.7);
    if (old) enamel.lerp(new THREE.Color(undead ? '#7d8a66' : '#d8c084'), 0.5);
    const stain = new THREE.Color(undead ? '#3f4a30' : '#9a7434');
    const grime = clamp01(mood.wear * 0.55 + (old ? 0.3 : 0) + (rot ? 0.4 : 0));
    const pit = a.condition === 'cavity' || a.condition === 'amalgam' ? { u: 0.18 + (random() - 0.5) * 0.3, w: (random() - 0.5) * 0.4, r: a.condition === 'cavity' ? 0.75 : 0.6, depth: a.condition === 'cavity' ? 0.5 : 0.22 } : undefined;
    const shade = (t: number, u: number, w: number) => {
      const c = enamel.clone().lerp(stain, grime * Math.pow(1 - t, 1.4));
      if (t > 0.6) c.lerp(stain, (1 - Math.sin(Math.min(Math.abs(u), 1) * Math.PI * 0.8) * Math.sin(Math.min(Math.abs(w), 1) * Math.PI * 0.8)) * Math.max(0, 1 - Math.max(Math.abs(u), Math.abs(w)) * 1.15) * (0.3 + grime * 0.5));
      if (rot) c.lerp(new THREE.Color(random() > 0.45 ? '#130d09' : '#4a2c14'), clamp01(0.62 + random() * 0.4 + (t - 0.5) * 0.4));
      if (pit && a.condition === 'cavity' && t > 0.55) c.lerp(new THREE.Color('#3a2210'), clamp01(1.25 - Math.hypot(u - pit.u, w - pit.w) / pit.r) * 0.95);
      return c;
    };
    const enamelPaint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.2, 0.55, mood.wear) + (rot ? 0.25 : 0), emissive: undead ? '#5dff7a' : '#000000', emissiveIntensity: undead ? 0.12 : 0 });
    const rootBase = new THREE.Color(undead ? '#2b2a22' : a.species === 'ape' ? '#cdb078' : '#e4d2a2').lerp(stain, grime * 0.5);
    const blood = new THREE.Color('#7d0a10');
    const rootPaint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: fresh ? 0.3 : 0.75 });
    const bloodPaint = new THREE.MeshStandardMaterial({ color: blood, roughness: 0.12 });
    const rootTint = (t: number) => {
      const c = rootBase.clone().lerp(new THREE.Color(undead ? '#0f0f0c' : '#a07a48'), t * 0.45);
      if (fresh) c.lerp(blood, clamp01(t * 1.6 - 0.15 + random() * 0.25));
      return c;
    };

    // Root plan: where each root leaves the trunk, and which way it leans and curls.
    type Root = { x: number; z: number; splay: number; curl: number; long: number; thick: number };
    const splay = (milk ? 1.9 : 1) * (0.8 + random() * 0.4);
    const plans: Root[] = {
      two: [{ x: -0.27, z: 0, splay: 0.16, curl: 0, long: 1, thick: 1 }, { x: 0.27, z: 0, splay: 0.16, curl: 0, long: 0.93, thick: 1 }],
      three: [{ x: -0.27, z: 0.2, splay: 0.3, curl: 0, long: 0.95, thick: 0.85 }, { x: 0.27, z: 0.2, splay: 0.3, curl: 0, long: 0.9, thick: 0.85 }, { x: -0.02, z: -0.3, splay: 0.42, curl: 0, long: 1.05, thick: 0.95 }],
      hooked: [{ x: -0.27, z: 0, splay: 0.14, curl: 0.5, long: 1, thick: 0.95 }, { x: 0.27, z: 0, splay: 0.1, curl: 0.62, long: 1.06, thick: 0.95 }],
      fused: [{ x: 0.03, z: 0, splay: 0.05, curl: 0.08, long: 0.95, thick: 2.1 }],
    }[a.roots];

    const tooth = new THREE.Group();
    const halves: (-1 | 0 | 1)[] = a.condition === 'cracked' ? [-1, 1] : [0];
    for (const half of halves) {
      const piece = new THREE.Group();
      const crown = new THREE.Mesh(crownGeometry('molar', W, H, D, { detail: 10, worn: old ? 0.8 : a.species === 'ape' ? -0.35 : milk ? 0.25 : 0, half, dent: pit, shade }), enamelPaint);
      piece.add(crown);
      const trunkEnd = -rootLength * (a.roots === 'fused' ? 0.1 : 0.24);
      const mine = plans.filter((root) => half === 0 || (root.x === 0.03 ? half === 1 : Math.sign(root.x) === half));
      if (half === 0) piece.add(new THREE.Mesh(sweep([new THREE.Vector3(0, H * 0.12, 0), new THREE.Vector3(0, trunkEnd * 0.5, 0), new THREE.Vector3(0, trunkEnd * 1.2, 0)], (t) => [D * mix(0.43, 0.3, t), W * mix(0.43, 0.36, t)], { normal: new THREE.Vector3(0, 0, 1), radial: 16, color: () => rootBase }), rootPaint));
      for (const root of mine) {
        const length = rootLength * root.long * (0.92 + random() * 0.16);
        const dir = new THREE.Vector3(root.x, 0, root.z).normalize();
        const lean = root.splay * splay;
        const at = (t: number, bend: number) => new THREE.Vector3(root.x * W, 0, root.z * D).addScaledVector(dir, length * lean * t).add(new THREE.Vector3(root.curl * length * bend, -length * t + (root.curl > 0.3 ? root.curl * length * bend * bend * 0.35 : 0), (random() - 0.5) * length * 0.05));
        const points = [new THREE.Vector3(root.x * W * 0.7, H * 0.1, root.z * D * 0.7), at(0.22, 0), at(0.5, 0.04), at(0.78, 0.25), at(1, 1)];
        const r0 = W * 0.2 * root.thick * (milk ? 0.8 : 1);
        piece.add(new THREE.Mesh(sweep(points, (t) => r0 * mix(1, 0.16, Math.pow(t, 1.25)), { radial: 10, steps: 28, color: rootTint }), rootPaint));
      }
      if (half !== 0) {
        const lying = a.pose === 'side' && a.aftermath !== 'mounted';
        piece.position.x = half * W * (lying ? 0.1 : 0.05);
        piece.rotation.z = -half * (lying ? 0.1 : 0.07);
        if (half === 1 && lying) { piece.position.set(W * 0.5, -H * 0.2, D * 0.9); piece.rotation.y = 0.5 + random() * 0.4; }
      }
      tooth.add(piece);
    }
    if (pit) {
      const fill = a.condition === 'amalgam'
        ? new THREE.MeshStandardMaterial({ color: mix(0.5, 0.3, mood.wear) > 0.4 ? '#8b9096' : '#5e6266', metalness: 0.85, roughness: 0.38 })
        : new THREE.MeshStandardMaterial({ color: '#1c0f08', roughness: 0.9 });
      const plug = new THREE.Mesh(lump(W * (a.condition === 'amalgam' ? 0.3 : 0.2), random, 0.18, 2), fill);
      plug.scale.y = a.condition === 'amalgam' ? 0.32 : 0.4;
      plug.position.set(pit.u * W * 0.5, H * (a.condition === 'amalgam' ? 0.83 : 0.7), pit.w * D * 0.5);
      tooth.add(plug);
    }

    const pose = a.aftermath === 'mounted' ? 'standing' : a.pose;
    if (pose === 'side') { tooth.rotation.set((random() - 0.5) * 0.3, 0, Math.PI / 2 + (random() - 0.5) * 0.12); }
    else if (pose === 'inverted') tooth.rotation.set(Math.PI + (random() - 0.5) * 0.12, 0, (random() - 0.5) * 0.1);
    else tooth.rotation.set((random() - 0.5) * 0.08, 0, (random() - 0.5) * 0.08);
    const turned = new THREE.Group();
    turned.add(tooth);
    turned.rotation.y = pose === 'side' ? 0.5 + random() * 0.5 : (random() - 0.5) * 0.7;
    s.root.add(turned);
    turned.traverse((node) => { node.castShadow = node.receiveShadow = true; });
    turned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(turned);
    const floor = box.min.y, size = box.getSize(new THREE.Vector3());

    if (fresh) {
      const drops = 3 + Math.round(mix(1, 7, (1 - mood.cheer) * 0.6 + mood.density * 0.4));
      for (let i = 0; i < drops; i++) {
        const r = W * mix(0.08, 0.28, random() * random());
        const drop = s.mesh(lump(r, random, 0.12, 1), bloodPaint, [mix(box.min.x, box.max.x, random()) + (random() - 0.5) * W, floor + r * 0.12, mix(box.min.z, box.max.z, random()) + (random() - 0.3) * W]);
        drop.scale.y = 0.16;
      }
      const r = W * 0.5;
      const wad = s.mesh(lump(r, random, 0.16, 3, (v) => new THREE.Color('#f1efe6').lerp(blood, clamp01((v.x / r) * -0.9 + 0.2 + random() * 0.3))), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), [box.max.x + r * 1.5, floor + r * 0.36, box.getCenter(new THREE.Vector3()).z + r * 0.3]);
      wad.scale.set(1.2, 0.45, 0.95);
      wad.rotation.y = random() * 3;
    }
    if (a.aftermath === 'mounted') {
      const wood = s.material(mood.warmth > 0.5 ? '#6a3f24' : '#3e2a1e', { roughness: 0.5 });
      const brass = s.material('#b8923e', { metalness: 0.85, roughness: mix(0.25, 0.6, mood.wear) });
      const R = Math.max(size.x, size.z) * 0.62, top = floor - H * 0.35;
      s.lathe([[0, top - R * 0.6], [R, top - R * 0.6], [R, top - R * 0.5], [R * 0.95, top - R * 0.34], [R * 0.74, top - R * 0.2], [R * 0.8, top - R * 0.08], [R * 0.72, top], [0, top]], wood);
      for (const root of plans) s.rod([root.x * W * 1.2, top, root.z * D * 1.2], [root.x * W * 1.05, floor + rootLength * 0.3, root.z * D * 1.05], W * 0.035, brass);
      s.ring(R * 0.86, R * 0.03, [0, top - R * 0.27, 0], brass).rotation.x = Math.PI / 2;
      const year = 1890 + Math.floor(random() * 120);
      const plaque = s.label(String(year), R * 0.75, R * 0.2, [0, top - R * 0.46, R * 1.005], '#3a2a10', '#c9a54e');
      plaque.position.z = R * 0.99;
      (plaque.material as THREE.MeshStandardMaterial).metalness = 0.6;
    }
    if (a.aftermath === 'tagged') {
      const neck = new THREE.Vector3(0, 0, 0).applyMatrix4(tooth.matrixWorld);
      const tagAt = new THREE.Vector3(box.max.x + W * 0.9, floor + 0.0003, box.max.z + W * 0.1);
      const thread = s.material('#c9b58a', { roughness: 0.9 });
      const loop = s.ring(Math.max(W, D) * 0.47, W * 0.025, [neck.x, neck.y, neck.z], thread);
      loop.quaternion.copy(tooth.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
      const mid = neck.clone().lerp(tagAt, 0.5); mid.y = floor + W * 0.08;
      s.mesh(sweep([neck.clone().add(new THREE.Vector3(W * 0.3, -W * 0.3, W * 0.3)), mid, tagAt.clone().add(new THREE.Vector3(-W * 0.7, 0.0004, 0))], () => W * 0.022, { radial: 6 }), thread);
      const tag = s.label(`No. ${10 + Math.floor(random() * 980)}`, W * 1.7, W * 0.85, [tagAt.x, tagAt.y, tagAt.z], '#3b2f2a', mood.wear > 0.5 ? '#d8c9a0' : '#efe6cc');
      tag.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.6);
      s.ring(W * 0.07, W * 0.03, [tagAt.x - W * 0.68, tagAt.y + 0.0002, tagAt.z], s.material('#b8923e', { metalness: 0.8 })).rotation.x = Math.PI / 2;
    }
    // A tooth is true size under a lens; in a room it is a sculpture, on a street a monument.
    const thing = s.finish();
    const outer = new THREE.Group();
    outer.name = 'REV_molar_5';
    outer.add(thing.object);
    outer.scale.setScalar(({ macro: 1, tabletop: 1.6, room: 14, street: 90 } as Record<string, number>)[context.scale] ?? 14);
    return { object: outer, dispose: thing.dispose };
  },
});
