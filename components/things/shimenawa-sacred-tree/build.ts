import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    form: choice('What shape has the old tree grown into?', {
      towering: 'A straight colossal trunk under a dark conical crown.',
      broad: 'Squat and immensely thick, with heavy limbs spreading low and wide.',
      snag: 'Lightning-blasted: the trunk broken off high up, hollow and jagged, with one living bough.',
      twin: 'Two trunks risen from one root, a married pair bound together by the rope.',
    }),
    rope: choice('What kind of rope girdles it?', {
      thick: 'One fat twisted straw rope, freshly made and golden.',
      great: 'A colossal rope as thick as a person, sagging under its own weight.',
      triple: 'Three thinner ropes wound one above the other.',
      frayed: 'An old thin rope gone grey, fraying, half its streamers lost.',
    }),
    streamers: choice('What hangs from the rope?', {
      paper: 'Crisp white zigzag paper streamers.',
      tassels: 'White paper streamers alternating with hanging straw tassels.',
      gold: 'Gold and white streamers for a festival.',
      red: 'Red and white streamers.',
    }),
    bark: choice('What is the bark like?', {
      cedar: 'Fibrous red-brown cedar bark in long vertical strips.',
      grey: 'Silver-grey and deeply furrowed with great age.',
      mossy: 'Furred green with moss up one side.',
      charred: 'Blackened by an old fire up one flank.',
    }),
    foot: choice('What stands at its foot?', {
      nothing: 'Nothing but its own roots.',
      fence: 'A low sacred fence of posts and rails ringing the roots.',
      hokora: 'A tiny wooden shrine box on a stone, with offerings.',
      barrels: 'A stack of straw-wrapped sake barrels offered by brewers.',
      sign: 'A roofed wooden signboard telling the tree\'s age and name.',
      torii: 'A small red gate standing before it.',
    }),
    presence: choice('What shows that the tree is inhabited?', {
      nothing: 'Nothing you can see.',
      kodama: 'Small white tree spirits with dot eyes sitting on the roots and boughs.',
      lights: 'Soft balls of light drifting round the trunk.',
      hollow: 'A dark hollow at the base, big enough to crouch in, with a candle inside.',
      wishes: 'Coins pressed into the bark and paper wishes tucked under the rope.',
    }),
    season: choice('What season lies on it?', {
      green: 'Deep summer green.',
      snow: 'Snow on every bough and banked against the roots.',
      autumn: 'Red and gold leaves from neighbouring maples drifted round the roots.',
      spring: 'Fresh ferns unrolling between the roots and pale new tips on the boughs.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    // Bark: long vertical fibres painted once and wrapped round every trunk.
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const barkBase = new THREE.Color({ cedar: '#8a5a3c', grey: '#8d8a84', mossy: '#7a5b40', charred: '#6f5544' }[a.bark]).lerp(new THREE.Color('#77736b'), mood.wear * 0.3);
    ctx.fillStyle = `#${barkBase.getHexString()}`;
    ctx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 420; i++) {
      const x = random() * 256, y = random() * 512, h = 40 + random() * 220;
      ctx.fillStyle = random() < 0.55 ? 'rgba(30,18,10,0.3)' : 'rgba(255,225,190,0.16)';
      ctx.fillRect(x, y, 1 + random() * 3.5, h);
      ctx.fillRect(x, y - 512, 1 + random() * 3.5, h);
    }
    if (a.bark === 'mossy' || a.bark === 'charred') {
      const tint = a.bark === 'mossy' ? '70,110,50' : '22,20,20';
      for (let i = 0; i < 160; i++) {
        const x = 60 + (random() + random() - 1) * 90, y = random() * (a.bark === 'charred' ? 400 : 512) + (a.bark === 'charred' ? 112 : 0), r = 10 + random() * 30;
        const blot = ctx.createRadialGradient(x, y, 0, x, y, r);
        blot.addColorStop(0, `rgba(${tint},0.9)`); blot.addColorStop(1, `rgba(${tint},0)`);
        ctx.fillStyle = blot; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    const barkMap = new THREE.CanvasTexture(canvas);
    barkMap.colorSpace = THREE.SRGBColorSpace;
    barkMap.wrapS = barkMap.wrapT = THREE.RepeatWrapping;
    const bark = new THREE.MeshStandardMaterial({ map: barkMap, roughness: 1 });
    const green = new THREE.Color().setHSL(mix(0.4, 0.3, mood.warmth), mix(0.4, 0.6, mood.cheer), mix(0.09, 0.14, mood.cheer)).lerp(new THREE.Color('#5d5335'), mood.wear * 0.35);
    const foliage = new THREE.MeshStandardMaterial({ color: green, roughness: 1, flatShading: true });
    const tips = new THREE.MeshStandardMaterial({ color: green.clone().offsetHSL(-0.04, 0.1, 0.1), roughness: 1, flatShading: true });
    const snow = new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.9, flatShading: true });
    const straw = s.material(a.rope === 'frayed' ? '#a39b85' : new THREE.Color('#d9b862').lerp(new THREE.Color('#a79c7c'), mood.wear * 0.6), { roughness: 0.95 });

    /** A fluted trunk with buttress roots; returns its radius at a given height. */
    const trunk = (x: number, z: number, base: number, height: number, lean: number, open: boolean) => {
      const profile: [number, number][] = [[1.75, -0.15], [1.45, 0.25], [1.2, 0.8], [1.08, 1.6], [1.0, 3], [0.88, height * 0.55], [0.66, height * 0.8], [open ? 0.56 : 0.3, height]];
      const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r * base, y)), 40);
      const at = geometry.attributes.position;
      const flutes = 7 + Math.floor(random() * 4), phase = random() * 6;
      for (let i = 0; i < at.count; i++) {
        const px = at.getX(i), py = at.getY(i), pz = at.getZ(i);
        const angle = Math.atan2(px, pz);
        const low = Math.max(0, 1 - py / 2.2);
        const k = 1 + Math.cos(angle * flutes + phase) * (0.05 + low * low * 0.24) + Math.cos(angle * 3 + phase * 2) * 0.05;
        at.setXYZ(i, px * k + lean * py, py, pz * k);
      }
      geometry.computeVertexNormals();
      const mesh = s.mesh(geometry, bark, [x, 0, z]);
      const uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 1.5);
      const radius = (y: number) => {
        for (let i = 1; i < profile.length; i++) if (y <= profile[i][1]) { const [r0, y0] = profile[i - 1], [r1, y1] = profile[i]; return mix(r0, r1, (y - y0) / (y1 - y0)) * base; }
        return profile[profile.length - 1][0] * base;
      };
      return { mesh, radius, height, x, z, lean };
    };
    const instances = (geometry: THREE.BufferGeometry, material: THREE.Material, list: { at: THREE.Vector3; scale: THREE.Vector3; rot?: THREE.Euler }[]) => {
      if (!list.length) return null;
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      const q = new THREE.Quaternion(), m = new THREE.Matrix4();
      list.forEach((item, i) => { mesh.setMatrixAt(i, m.compose(item.at, q.setFromEuler(item.rot ?? new THREE.Euler()), item.scale)); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const cone = new THREE.ConeGeometry(1, 1, 9);
    const blob = new THREE.IcosahedronGeometry(1, 1);
    const layers: { at: THREE.Vector3; scale: THREE.Vector3; rot?: THREE.Euler }[] = [];
    const pale: typeof layers = [], caps: typeof layers = [];
    const crown = (x: number, z: number, from: number, to: number, spread: number) => {
      const n = 5;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = mix(from, to, t), r = mix(spread, spread * 0.3, t) * mix(0.9, 1.1, random()), h = (to - from) / n * 2.1;
        const at = new THREE.Vector3(x + (random() - 0.5) * 0.3, y + h / 2, z + (random() - 0.5) * 0.3);
        const rot = new THREE.Euler((random() - 0.5) * 0.1, random() * 3, (random() - 0.5) * 0.1);
        layers.push({ at, scale: new THREE.Vector3(r, h, r), rot });
        if (a.season === 'spring') pale.push({ at: at.clone().setY(at.y - h * 0.32), scale: new THREE.Vector3(r * 0.86, h * 0.36, r * 0.86), rot });
        if (a.season === 'snow') caps.push({ at: at.clone().setY(at.y + h * 0.25 + 0.14), scale: new THREE.Vector3(r * 0.6, h * 0.5, r * 0.6), rot });
      }
    };
    const bough = (t: { radius: (y: number) => number; x: number; z: number; lean: number }, y: number, angle: number, length: number, droop: number) => {
      const r0 = t.radius(y) * 0.8;
      const from: P = [t.x + t.lean * y + Math.sin(angle) * r0, y, t.z + Math.cos(angle) * r0];
      const mid: P = [from[0] + Math.sin(angle) * length * 0.55, y + length * 0.22, from[2] + Math.cos(angle) * length * 0.55];
      const end: P = [from[0] + Math.sin(angle) * length, y + length * 0.22 - droop, from[2] + Math.cos(angle) * length];
      s.tube([from, mid, end], Math.max(0.07, length * 0.05), bark);
      for (const [p, k] of [[mid, 1], [end, 0.8]] as [P, number][]) {
        const at = new THREE.Vector3(p[0], p[1] + 0.15, p[2]);
        const scale = new THREE.Vector3(length * 0.42 * k, length * 0.17 * k, length * 0.42 * k);
        layers.push({ at, scale: scale.clone().multiply(new THREE.Vector3(1, 2.2, 1)), rot: new THREE.Euler(0, random() * 3, 0) });
        if (a.season === 'snow') caps.push({ at: at.clone().setY(at.y + 0.12), scale: scale.clone().multiply(new THREE.Vector3(0.8, 1.9, 0.8)) });
      }
    };

    // The tree itself.
    const trunks: ReturnType<typeof trunk>[] = [];
    let girth = 1;
    if (a.form === 'towering') {
      girth = 1.25;
      const t = trunk(0, 0, 1.25, 10, (random() - 0.5) * 0.02, false);
      trunks.push(t);
      crown(t.lean * 10, 0, 7, 13, 2.5);
      for (let i = 0; i < 5; i++) bough(t, 4.6 + i * 0.5 + random() * 0.3, random() * 6.28, 1.5 + random() * 0.8, 0.5);
    } else if (a.form === 'broad') {
      girth = 1.5;
      const t = trunk(0, 0, 1.5, 5.4, 0, false);
      trunks.push(t);
      const n = 7 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) bough(t, 2.9 + random() * 1.8, i / n * 6.28 + random() * 0.4, 2.3 + random() * 1.3, 0.3 + random() * 0.6);
      crown(0, 0, 4.8, 7.4, 2.2);
    } else if (a.form === 'snag') {
      girth = 1.15;
      const t = trunk(0, 0, 1.15, 5.4, 0.02, true);
      trunks.push(t);
      // Jagged broken rim and the black hollow inside it.
      const rim = t.radius(5.4);
      const char = s.material('#1f1b19', { roughness: 1 });
      s.cylinder(rim * 0.86, rim * 0.86, 0.05, [5.4 * 0.02, 5.36, 0], char, 14).castShadow = false;
      for (let i = 0; i < 9; i++) {
        const g = i / 9 * 6.28 + random() * 0.3, h = 0.4 + random() * 1.5;
        const shard = s.mesh(new THREE.ConeGeometry(rim * 0.36, h, 4), i % 3 ? bark : char, [5.4 * 0.02 + Math.sin(g) * rim * 0.72, 5.35 + h / 2, Math.cos(g) * rim * 0.72]);
        shard.rotation.y = g;
        shard.scale.z = 0.45;
      }
      bough(t, 3.4, 0.8 + random(), 2.8, 0.2);
      bough(t, 4.2, 3.4 + random(), 1.6, 0.4);
    } else {
      girth = 1.25;
      const left = trunk(-0.62, 0, 0.8, 9, -0.035, false), right = trunk(0.62, 0.1, 0.72, 8.2, 0.04, false);
      trunks.push(left, right);
      crown(-0.62 - 0.035 * 9, 0, 6, 11.4, 1.9);
      crown(0.62 + 0.04 * 8.4, 0.1, 5.4, 10, 1.7);
      // One shared root mound.
      s.lathe([[1.9, -0.15], [1.7, 0.2], [1.4, 0.55], [0, 0.7]], bark);
    }
    instances(cone, foliage, layers);
    instances(cone, tips, pale);
    instances(cone, snow, caps);

    // Radius of the girdle: the trunk (or the pair) at rope height.
    const ropeY = 1.55;
    const single = trunks.length === 1;
    const hoop = (y: number, angle: number) => {
      if (single) { const r = trunks[0].radius(y) * 1.08; return new THREE.Vector3(Math.sin(angle) * r + trunks[0].lean * y, y, Math.cos(angle) * r); }
      // An ellipse round both trunks.
      const rx = 0.62 + trunks[0].radius(y) * 1.06, rz = trunks[0].radius(y) * 1.12;
      return new THREE.Vector3(Math.sin(angle) * rx, y, Math.cos(angle) * rz + 0.05);
    };
    const ropeAt: { y: number; fat: number }[] = a.rope === 'triple' ? [{ y: ropeY + 0.4, fat: 0.07 }, { y: ropeY, fat: 0.07 }, { y: ropeY - 0.4, fat: 0.07 }]
      : [{ y: ropeY, fat: a.rope === 'great' ? 0.21 : a.rope === 'frayed' ? 0.05 : 0.13 }];
    const sagAmount = a.rope === 'great' ? 0.22 : 0.07, sagPhase = random() * 6;
    const line = (y: number, angle: number) => { const p = hoop(y, angle); p.y += Math.sin(angle * 2 + sagPhase) * sagAmount; return p; };
    for (const { y, fat } of ropeAt) {
      const twists = Math.round(girth * 9 / (fat * 9));
      for (const strand of [0, Math.PI]) {
        const points: THREE.Vector3[] = [];
        const steps = 180;
        for (let i = 0; i < steps; i++) {
          const angle = i / steps * Math.PI * 2;
          const centre = line(y, angle);
          const out = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
          const spin = angle * twists + strand;
          points.push(centre.addScaledVector(out, fat * 0.9 + Math.cos(spin) * fat * 0.62).add(new THREE.Vector3(0, Math.sin(spin) * fat * 0.62, 0)));
        }
        s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 360, fat * 0.72, 6, true), straw);
      }
    }

    // Streamers and tassels hanging from the lowest rope.
    const low = ropeAt[ropeAt.length - 1];
    const zig = new THREE.BufferGeometry();
    {
      const w = 0.11, h = 0.13, quads: number[] = [];
      for (let i = 0; i < 4; i++) {
        const x0 = (i % 2 ? 0.035 : -0.035) - w / 2 + (i > 1 ? 0.03 : 0), y0 = -i * h * 0.86;
        quads.push(x0, y0, 0, x0 + w, y0, 0, x0 + w, y0 - h, 0, x0, y0, 0, x0 + w, y0 - h, 0, x0, y0 - h, 0);
      }
      zig.setAttribute('position', new THREE.Float32BufferAttribute(quads, 3));
      zig.computeVertexNormals();
    }
    const paperColour = { paper: '#fbfaf5', tassels: '#fbfaf5', gold: '#e9c046', red: '#d3322a' }[a.streamers];
    const white = new THREE.MeshStandardMaterial({ color: '#fbfaf5', roughness: 0.8, side: THREE.DoubleSide, emissive: '#fbfaf5', emissiveIntensity: 0.12 });
    const coloured = new THREE.MeshStandardMaterial({ color: paperColour, roughness: 0.7, side: THREE.DoubleSide, emissive: paperColour, emissiveIntensity: 0.12, metalness: a.streamers === 'gold' ? 0.4 : 0 });
    const count = Math.round(girth * (a.rope === 'frayed' ? 5 : 10));
    const size = a.rope === 'great' ? 2.6 : 2.1;
    const shide: { mesh: THREE.Mesh; phase: number }[] = [];
    for (let i = 0; i < count; i++) {
      if (a.rope === 'frayed' && random() < 0.35) continue;
      const angle = i / count * Math.PI * 2 + 0.2;
      const p = line(low.y, angle);
      const out = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      p.addScaledVector(out, low.fat * 1.9);
      p.y -= low.fat * 0.9;
      if (a.streamers === 'tassels' && i % 2 === 1) {
        const tassel = s.mesh(new THREE.ConeGeometry(0.07 * size, 0.42 * size, 7), straw, [p.x, p.y - 0.2 * size, p.z]);
        tassel.rotation.x = Math.PI;
        continue;
      }
      const paper = new THREE.Mesh(zig, i % 2 ? coloured : white);
      paper.position.copy(p);
      paper.scale.setScalar(size);
      paper.rotation.y = angle;
      paper.castShadow = true;
      s.root.add(paper);
      shide.push({ mesh: paper, phase: random() * 6 });
    }
    if (a.rope === 'frayed') for (let i = 0; i < 7; i++) {
      const angle = random() * 6.28, p = line(low.y, angle);
      s.rod([p.x * 1.05, p.y, p.z * 1.05], [p.x * 1.07 + (random() - 0.5) * 0.1, p.y - 0.2 - random() * 0.4, p.z * 1.07], 0.012, straw);
    }

    // Roots breaking the surface.
    const rootCount = 6 + Math.floor(random() * 4);
    const reach = single ? trunks[0].radius(0) : 1.9;
    for (let i = 0; i < rootCount; i++) {
      const g = i / rootCount * 6.28 + random() * 0.5, len = 0.8 + random() * 1.1;
      s.tube([[Math.sin(g) * reach * 0.7, 0.4, Math.cos(g) * reach * 0.7], [Math.sin(g) * (reach + len * 0.4), 0.14, Math.cos(g) * (reach + len * 0.4)], [Math.sin(g + 0.2) * (reach + len), -0.12, Math.cos(g + 0.2) * (reach + len)]], 0.13 + random() * 0.08, bark);
    }
    const ringR = reach + 1.25;
    const around = (r0: number, r1: number): P => { const g = random() * 6.28, r = mix(r0, r1, random()); return [Math.sin(g) * r, 0, Math.cos(g) * r]; };

    // Season on the ground.
    if (a.season === 'snow') {
      const drifts: { at: P; size: number }[] = [];
      for (let i = 0; i < 26; i++) { const p = around(reach * 0.75, ringR); drifts.push({ at: [p[0], 0.02, p[2]], size: 0.5 + random() * 0.9 }); }
      const drift = new THREE.SphereGeometry(0.5, 8, 5);
      drift.scale(1, 0.3, 1);
      s.scatter(drift, snow, drifts);
    } else if (a.season === 'autumn') {
      const leaves: { at: P; size: number; color: THREE.Color }[] = [];
      const n = Math.round(mix(160, 420, mood.density));
      for (let i = 0; i < n; i++) { const p = around(reach * 0.6, ringR); leaves.push({ at: [p[0], 0.03 + random() * 0.25 * Math.max(0, 1 - Math.hypot(p[0], p[2]) / ringR), p[2]], size: 0.6 + random() * 0.9, color: new THREE.Color().setHSL(random() * 0.13, 0.85, 0.4 + random() * 0.15) }); }
      const leaf = new THREE.CircleGeometry(0.1, 5);
      leaf.rotateX(-Math.PI / 2);
      s.scatter(leaf, new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), leaves).castShadow = false;
    } else {
      const ferns: { at: P; size: number; color: THREE.Color }[] = [];
      const n = Math.round((a.season === 'spring' ? 110 : 40) * mix(0.6, 1.3, mood.density));
      for (let i = 0; i < n; i++) { const p = around(reach * 0.85, ringR); ferns.push({ at: p, size: 0.5 + random() * (a.season === 'spring' ? 1.1 : 0.7), color: green.clone().offsetHSL(-0.04, 0.1, 0.03 + random() * 0.08) }); }
      const frond = new THREE.SphereGeometry(0.2, 6, 4);
      frond.scale(1, 0.55, 1);
      frond.translate(0, 0.08, 0);
      s.scatter(frond, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), ferns);
    }

    // What stands at the foot.
    const wood = s.material('#7b5a3e', { roughness: 0.85 });
    const stone = s.material('#9d9c93', { roughness: 0.95 });
    const vermilion = s.material('#d8431f', { roughness: 0.6 });
    const frontZ = reach + 0.75;
    if (a.foot === 'fence') {
      const posts = 14, r = reach + 0.95;
      for (let i = 0; i < posts; i++) {
        const g = i / posts * 6.28, h = 0.8;
        s.box([0.12, h, 0.12], [Math.sin(g) * r, h / 2, Math.cos(g) * r], stone).rotation.y = g;
        s.mesh(new THREE.ConeGeometry(0.09, 0.09, 4), stone, [Math.sin(g) * r, h + 0.045, Math.cos(g) * r]).rotation.y = g + Math.PI / 4;
        const g2 = (i + 1) / posts * 6.28;
        if (i !== 0) for (const y of [0.3, 0.62]) s.rod([Math.sin(g) * r, y, Math.cos(g) * r], [Math.sin(g2) * r, y, Math.cos(g2) * r], 0.035, wood);
      }
    } else if (a.foot === 'hokora') {
      s.box([0.7, 0.4, 0.6], [0.4, 0.2, frontZ], stone);
      s.box([0.5, 0.42, 0.4], [0.4, 0.61, frontZ], wood);
      s.box([0.2, 0.26, 0.02], [0.4, 0.58, frontZ + 0.205], s.material('#2a211b'));
      const roof = s.mesh(new THREE.ConeGeometry(0.52, 0.3, 4), s.material('#3b2e26', { roughness: 0.9 }), [0.4, 0.97, frontZ]);
      roof.rotation.y = Math.PI / 4;
      roof.scale.z = 0.85;
      s.cylinder(0.035, 0.03, 0.07, [0.2, 0.435, frontZ + 0.25], s.material('#f3f1ea', { roughness: 0.3 }), 10);
      s.ball([0.05, 0.045, 0.05], [0.6, 0.445, frontZ + 0.24], s.material('#f08a1d'), 10);
    } else if (a.foot === 'barrels') {
      const wrap = s.material('#e6d7a8', { roughness: 0.95 });
      const bands = ['#c8261f', '#1f3f7a', '#1d1a18', '#2f6b54'];
      const barrel = (x: number, y: number, z: number) => {
        s.cylinder(0.3, 0.3, 0.56, [x, y + 0.28, z], wrap, 14);
        s.cylinder(0.305, 0.305, 0.16, [x, y + 0.3, z], s.material(bands[Math.floor(random() * bands.length)], { roughness: 0.8 }), 14);
        for (const dy of [0.06, 0.5]) s.cylinder(0.31, 0.31, 0.03, [x, y + dy, z], straw, 14);
      };
      const rows = mood.density > 0.5 ? 3 : 2;
      for (let row = 0; row < rows; row++) for (let i = 0; i < 3 - row; i++) barrel(-0.62 + i * 0.62 + row * 0.31 - 0.5, row * 0.57, frontZ + 0.1);
    } else if (a.foot === 'sign') {
      const x = 1.0;
      for (const dx of [-0.42, 0.42]) s.box([0.08, 1.5, 0.08], [x + dx, 0.75, frontZ], wood);
      s.label('1000', 0.8, 0.55, [x, 1.05, frontZ + 0.045], '#2b2622', '#e9dcb8').rotation.y = 0;
      s.box([0.84, 0.6, 0.04], [x, 1.05, frontZ + 0.02], wood);
      const cap = s.box([1.1, 0.05, 0.3], [x, 1.52, frontZ], s.material('#3b2e26'));
      cap.rotation.x = 0.2;
    } else if (a.foot === 'torii') {
      const z = frontZ + 0.5, h = 2.0, w = 0.75;
      for (const side of [-1, 1]) { s.cylinder(0.065, 0.08, h, [side * w, h / 2, z], vermilion, 10); s.cylinder(0.1, 0.11, 0.22, [side * w, 0.11, z], s.material('#1b1a1c'), 10); }
      s.box([w * 2 + 0.36, 0.1, 0.08], [0, h - 0.36, z], vermilion);
      s.box([w * 2 + 0.6, 0.12, 0.14], [0, h - 0.02, z], vermilion);
      s.box([w * 2 + 0.74, 0.06, 0.18], [0, h + 0.07, z], s.material('#1b1a1c'));
    }

    // What shows it is inhabited.
    const lights: { mesh: THREE.Mesh; y: number; phase: number }[] = [];
    if (a.presence === 'kodama') {
      const spirit = new THREE.MeshStandardMaterial({ color: '#f6f6ee', roughness: 0.6, emissive: '#e8ffe8', emissiveIntensity: 0.25 });
      const dark = s.material('#1c1b1a');
      const n = Math.round(mix(3, 9, mood.density));
      for (let i = 0; i < n; i++) {
        const g = random() * 6.28, r = reach * mix(0.95, 1.5, random()), k = 0.7 + random() * 0.6;
        const x = Math.sin(g) * r, z = Math.cos(g) * r, y = 0.12 + random() * 0.15;
        s.ball([0.07 * k, 0.1 * k, 0.06 * k], [x, y + 0.1 * k, z], spirit, 10);
        const head = s.ball([0.1 * k, 0.085 * k, 0.09 * k], [x, y + 0.25 * k, z], spirit, 10);
        head.rotation.z = (random() - 0.5) * 0.8;
        for (const side of [-1, 1]) s.ball([0.014 * k, 0.018 * k, 0.01 * k], [x + Math.sin(g) * 0.085 * k + Math.cos(g) * side * 0.035 * k, y + 0.26 * k, z + Math.cos(g) * 0.085 * k - Math.sin(g) * side * 0.035 * k], dark, 6);
      }
    } else if (a.presence === 'lights') {
      const orb = new THREE.MeshStandardMaterial({ color: '#fff7d0', emissive: new THREE.Color().setHSL(mix(0.45, 0.12, mood.warmth), 0.9, 0.6), emissiveIntensity: 2.4, roughness: 0.5 });
      const n = Math.round(mix(5, 14, mood.density));
      for (let i = 0; i < n; i++) {
        const g = random() * 6.28, r = reach * mix(0.9, 1.7, random()), y = 0.6 + random() * 3.2;
        const mesh = s.ball([0.09, 0.09, 0.09], [Math.sin(g) * r, y, Math.cos(g) * r], orb, 10);
        mesh.castShadow = false;
        lights.push({ mesh, y, phase: random() * 6 });
      }
    } else if (a.presence === 'hollow') {
      const r = single ? trunks[0].radius(0.6) : 1.5;
      const mouth = s.ball([0.42, 0.72, 0.2], [-0.25, 0.55, r * 0.97], s.material('#141110', { roughness: 1 }), 14);
      mouth.castShadow = false;
      const flame = s.ball([0.03, 0.06, 0.03], [-0.25, 0.3, r * 1.02 + 0.15], new THREE.MeshStandardMaterial({ color: '#fff0b0', emissive: '#ffae35', emissiveIntensity: 3 }), 8);
      flame.castShadow = false;
      s.cylinder(0.025, 0.03, 0.2, [-0.25, 0.14, r * 1.02 + 0.15], s.material('#f1ede2'), 8);
      lights.push({ mesh: flame, y: 0.3, phase: 0 });
    } else if (a.presence === 'wishes') {
      const gold = s.material('#d8ad3c', { metalness: 0.8, roughness: 0.35 });
      const paper = s.material('#f6f4ec', { roughness: 0.9 });
      for (let i = 0; i < 36; i++) {
        const g = random() * 6.28, y = 0.7 + random() * 0.6, p = hoop(y, g);
        const coin = s.cylinder(0.035, 0.035, 0.012, [p.x * 0.94, y, p.z * 0.94], gold, 8);
        coin.rotation.set(Math.PI / 2, 0, -g, 'YXZ');
        coin.rotation.y = g;
      }
      for (let i = 0; i < 12; i++) {
        const g = random() * 6.28, p = line(ropeAt[0].y, g);
        const slip = s.box([0.05, 0.22, 0.02], [p.x * 1.1, p.y + ropeAt[0].fat + 0.08, p.z * 1.1], paper);
        slip.rotation.set(0, g, (random() - 0.5) * 0.6);
      }
    }

    const flutter = mix(0.02, 0.4, mood.energy), speed = mix(0.6, 3, mood.energy);
    const yaws = shide.map((item) => item.mesh.rotation.y);
    return s.finish({
      footprint: reach + 0.9,
      update: (_dt, time) => {
        for (const [i, item] of shide.entries()) { item.mesh.rotation.y = yaws[i] + Math.sin(time * speed + item.phase) * flutter; item.mesh.rotation.x = Math.sin(time * speed * 0.7 + item.phase) * flutter * 0.5; }
        for (const light of lights) if (a.presence === 'lights') light.mesh.position.y = light.y + Math.sin(time * 0.6 * speed + light.phase) * 0.25; else light.mesh.scale.y = 0.06 * (1 + 0.25 * Math.sin(time * 11));
      },
    });
  },
});
