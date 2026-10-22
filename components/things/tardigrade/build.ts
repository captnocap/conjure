import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const COAT = {
  pearl: 'Milky pearl white, almost see-through.',
  amber: 'Warm honey amber.',
  rust: 'Rusty orange-red, like a boiled sweet.',
  moss: 'Pale with a full dark green gut showing through.',
  ice: 'Cold glassy blue.',
  gummy: 'Soft pink, a gummy bear with claws.',
} as const;
const COAT_COLOUR: Record<keyof typeof COAT, string> = { pearl: '#e6e2d2', amber: '#d9a85a', rust: '#c8603a', moss: '#cfd6b0', ice: '#a9cfe0', gummy: '#e89aa6' };

export default defineThing({
  questions: {
    doing: choice('What is the water bear doing?', {
      ambling: 'Ambling along on all eight legs, unhurried.',
      rearing: 'Reared up on its hind legs, front claws pawing at the air.',
      tun: 'Curled into a tun: a dry wrinkled barrel with its legs pulled in, waiting out the end of the world.',
      adrift: 'Adrift on its back, legs paddling slowly at nothing.',
      waking: 'Half unrolled, just waking: still wrinkled, front legs stretching out.',
    }),
    survived: choice('What has it just survived, or is it surviving?', {
      nothing: 'Nothing at all; an ordinary day on a moss cushion.',
      frozen: 'Deep cold: it sits among shards of clear ice.',
      drought: 'Drought: a plate of cracked dry mud.',
      vacuum: 'The vacuum of space: a pitted grey chip of meteorite.',
      fire: 'Fire: a bed of black cinders with embers still glowing.',
      bare: 'Nobody says; it stands on nothing in particular.',
    }),
    kind: choice('What kind of tardigrade is it?', {
      plump: 'A smooth plump one, soft folds between the segments.',
      armoured: 'An armoured one with overlapping back plates and long trailing hairs.',
      glassy: 'A glassy translucent one with its gut and little organs showing.',
    }),
    coat: choice('What colour is it?', COAT),
    plumpness: score('How plump is it?', ['Lean and long', 'Comfortably rounded', 'A fat little sausage about to burst']),
    claws: score('How big are its claws?', ['Tiny nubs', 'Neat hooked claws', 'Long curved hooks like a sloth']),
    face: choice('What is its face like?', {
      eyeless: 'No eyes, just the round puckered snout.',
      dots: 'Two small black eyespots above the snout.',
      sleepy: 'Two heavy-lidded eyespots, half asleep.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tun = a.doing === 'tun', waking = a.doing === 'waking';
    const curl = tun ? 1 : waking ? 0.5 : 0;
    const plump = mix(0.8, 1.22, a.plumpness) * (tun ? 0.92 : 1);
    const tint = new THREE.Color(COAT_COLOUR[a.coat]);
    tint.offsetHSL((mood.warmth - 0.5) * 0.04, (mood.cheer - 0.5) * 0.25 - curl * 0.18, -curl * 0.1 - mood.wear * 0.06);
    const glassy = a.kind === 'glassy';
    const skin = new THREE.MeshPhysicalMaterial({
      color: tint, roughness: mix(0.38, 0.8, Math.max(curl, mood.wear * 0.6)), clearcoat: glassy ? 0.8 : 0.25, sheen: 0.5,
      transparent: glassy, opacity: glassy ? 0.58 : 1,
    });
    const fold = new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(0.62), roughness: 0.7 });
    const plate = new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(0.72).offsetHSL(0, 0.1, 0), roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1d1b1a', roughness: 0.4 });
    const horn = new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 0.35 });
    const gut = new THREE.MeshStandardMaterial({ color: a.coat === 'moss' ? '#2f6b2c' : '#7a5a2e', roughness: 0.5, emissive: a.coat === 'moss' ? '#1d4a1b' : '#3d2a12', emissiveIntensity: 0.4 });

    const bear = new THREE.Group();
    const unit = new THREE.SphereGeometry(1, 22, 16);
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number] = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.scale.set(...scale);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Five fat segments along x, head at +x. Curling pulls them into a barrel.
    const squeeze = mix(1, 0.56, curl);
    const xs = [-0.92, -0.46, 0, 0.46, 0.88].map((x) => x * squeeze);
    const rs = [0.34, 0.43, 0.46, 0.42, mix(0.31, 0.36, curl)].map((r) => r * plump * mix(1, 1.08, curl));
    const arch = (x: number) => 0.62 + 0.08 - 0.16 * (x / squeeze) ** 2 * mix(1, 2.2, curl);
    xs.forEach((x, i) => add(bear, unit, skin, [x, arch(x), 0], [rs[i] * mix(1.02, 0.7, curl), rs[i], rs[i] * 1.04]));
    // Folds of skin in the grooves between segments (many more when dried).
    const rings = tun ? 13 : waking ? 9 : 4;
    for (let i = 0; i < rings; i++) {
      const u = (i + 0.5) / rings, x = mix(xs[0], xs[4], u), k = u * 4, lo = Math.floor(k), r = mix(rs[lo], rs[Math.min(4, lo + 1)], k - lo) * (tun ? 0.99 : 0.9);
      const ring = add(bear, new THREE.TorusGeometry(r, tun ? 0.035 : 0.045, 6, 28), fold, [x, arch(x), 0]);
      ring.rotation.y = Math.PI / 2;
      ring.scale.set(1.04, 1, 1);
    }
    if (a.kind === 'armoured') {
      const shell = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
      xs.forEach((x, i) => add(bear, shell, plate, [x, arch(x) + 0.02, 0], [rs[i] * 0.86 * mix(1, 0.72, curl), rs[i] * 1.08, rs[i] * 1.12]));
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
        const x = xs[i + (i > 1 ? 1 : 0)], y = arch(x) + rs[2] * 0.5, reach = mix(0.7, 1.3, random());
        const hairPath = new THREE.CatmullRomCurve3([new THREE.Vector3(x, y, side * rs[2] * 0.7), new THREE.Vector3(x - 0.15, y + 0.35 * reach, side * (rs[2] + 0.35 * reach)), new THREE.Vector3(x - 0.5 * reach, y + 0.2, side * (rs[2] + 0.75 * reach))]);
        add(bear, new THREE.TubeGeometry(hairPath, 12, 0.012, 4), horn, [0, 0, 0]);
      }
    }
    if (glassy) {
      add(bear, unit, gut, [xs[2] - 0.1, arch(0) - 0.02, 0], [0.5 * squeeze, 0.2 * plump, 0.22 * plump]);
      for (const side of [-1, 1]) add(bear, unit, new THREE.MeshStandardMaterial({ color: '#f1ead0', roughness: 0.3 }), [xs[1], arch(xs[1]) + 0.12, side * 0.14], [0.14, 0.09, 0.08]);
      add(bear, unit, horn, [xs[4] - 0.08, arch(xs[4]), 0], [0.12, 0.09, 0.09]);
    }

    // Head: a folded, puckered snout with a ring mouth and stylets.
    const hx = xs[4], hy = arch(hx), hr = rs[4];
    const snout = new THREE.Group();
    snout.position.set(hx + hr * 0.72, hy - hr * 0.1, 0);
    snout.rotation.z = -0.25 - curl * 0.9;
    add(snout, new THREE.CylinderGeometry(hr * 0.3, hr * 0.44, hr * 0.42, 16), skin, [hr * 0.12, 0, 0]).rotation.z = -Math.PI / 2;
    add(snout, new THREE.TorusGeometry(hr * 0.25, hr * 0.085, 8, 18), fold, [hr * 0.34, 0, 0]).rotation.y = Math.PI / 2;
    add(snout, unit, dark, [hr * 0.33, 0, 0], [hr * 0.05, hr * 0.17, hr * 0.17]);
    bear.add(snout);
    if (a.face !== 'eyeless') for (const side of [-1, 1]) {
      add(bear, unit, dark, [hx + hr * 0.52, hy + hr * 0.42, side * hr * 0.5], [hr * 0.1, hr * (a.face === 'sleepy' ? 0.05 : 0.1), hr * 0.1]);
      if (a.face === 'sleepy') add(bear, unit, fold, [hx + hr * 0.5, hy + hr * 0.5, side * hr * 0.5], [hr * 0.14, hr * 0.06, hr * 0.14]);
    }

    // Eight legs: three pairs along the flanks and a fourth pair trailing behind.
    const legs: { pivot: THREE.Group; phase: number; rest: number }[] = [];
    const clawLength = mix(0.07, 0.3, a.claws);
    const legLength = mix(0.5, 0.14, curl);
    const hook = new THREE.ConeGeometry(0.022, 1, 5);
    hook.translate(0, -0.5, 0);
    const makeLeg = (x: number, side: number, rear: boolean, index: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, arch(x) - 0.2 * plump, side * (rear ? 0.16 : 0.3) * plump);
      const splay = new THREE.Group();
      splay.rotation.x = -side * (rear ? 0.25 : 0.42);
      pivot.add(splay);
      const length = legLength * (waking && index > 3 ? 0.5 : 1) * (a.doing === 'rearing' && !rear ? 1.05 : 1);
      add(splay, new THREE.CylinderGeometry(0.15 * plump, 0.1, length, 12), skin, [0, -length / 2, 0]);
      add(splay, new THREE.TorusGeometry(0.115, 0.022, 5, 14), fold, [0, -length * 0.55, 0]).rotation.x = Math.PI / 2;
      add(splay, unit, skin, [0, -length, 0], [0.1, 0.075, 0.1]);
      if (!tun) for (let c = 0; c < 4; c++) {
        const claw = add(splay, hook, horn, [0.035 + (c % 2) * 0.02, -length - 0.02, (c - 1.5) * 0.045], [1 + a.claws, clawLength, 1 + a.claws]);
        claw.rotation.z = 0.75 + c * 0.05;
        claw.rotation.x = (c - 1.5) * 0.22;
      }
      const rest = rear ? -0.85 : 0;
      pivot.rotation.z = rest;
      bear.add(pivot);
      legs.push({ pivot, phase: index * 1.3 + (side > 0 ? 0 : Math.PI), rest });
    };
    [xs[3], xs[2], xs[1]].forEach((x, i) => { makeLeg(x + 0.05, 1, false, i * 2); makeLeg(x + 0.05, -1, false, i * 2 + 1); });
    makeLeg(xs[0] - 0.12 * squeeze, 1, true, 6);
    makeLeg(xs[0] - 0.12 * squeeze, -1, true, 7);

    const stance = new THREE.Group();
    stance.add(bear);
    if (a.doing === 'rearing') { bear.rotation.z = 0.95; legs.slice(0, 4).forEach((leg, i) => { leg.rest = -0.5 - (i < 2 ? 0.5 : 0); leg.pivot.rotation.z = leg.rest; }); }
    if (a.doing === 'adrift') { bear.rotation.x = Math.PI * 0.92; bear.rotation.z = 0.2; }
    if (tun) bear.rotation.z = -0.12;
    stance.rotation.y = -0.55 + (random() - 0.5) * 0.3;
    // Rest the animal on the ground before adding what it stands on.
    stance.updateMatrixWorld(true);
    const low = new THREE.Box3().setFromObject(stance).min.y;
    stance.position.y = -low + (a.doing === 'adrift' ? 0.25 : 0);
    s.root.add(stance);

    // What it has survived, as the ground under it.
    const spread = 1.5;
    if (a.survived === 'nothing') {
      const moss = s.material('#5f8a3a', { roughness: 0.95 });
      s.ball([spread, 0.3, spread * 0.85], [0, -0.26, 0], moss, 20);
      const leaf = new THREE.ConeGeometry(0.05, 0.3, 4);
      const tufts: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < Math.round(mix(60, 240, mood.density)); i++) {
        const angle = random() * Math.PI * 2, d = Math.sqrt(random()) * spread * 0.95;
        tufts.push({ at: [Math.cos(angle) * d, 0.02 - 0.24 * (d / spread) ** 2, Math.sin(angle) * d * 0.85], size: mix(0.6, 1.4, random()), color: ['#6f9a3c', '#4f7a34', '#8aa84a'][i % 3] });
      }
      s.scatter(leaf, s.material('#ffffff', { roughness: 0.9 }), tufts);
    } else if (a.survived === 'frozen') {
      const ice = new THREE.MeshPhysicalMaterial({ color: '#cfe8f2', roughness: 0.08, transparent: true, opacity: 0.7, clearcoat: 1, flatShading: true });
      s.mesh(new THREE.CylinderGeometry(spread * 0.95, spread * 1.05, 0.22, 7), ice, [0, -0.11, 0]);
      for (let i = 0; i < 9; i++) {
        const angle = random() * Math.PI * 2, d = mix(0.75, 1.2, random()) * spread * 0.85, h = mix(0.25, 0.95, random());
        const shard = s.mesh(new THREE.ConeGeometry(mix(0.1, 0.22, random()), h, 4), ice, [Math.cos(angle) * d, h / 2 - 0.02, Math.sin(angle) * d]);
        shard.rotation.set((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7);
      }
    } else if (a.survived === 'drought') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#b89a6c'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#4a3622'; ctx.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        let x = random() * 256, y = random() * 256;
        ctx.lineWidth = mix(1.5, 4, random());
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (random() - 0.5) * 90; y += (random() - 0.5) * 90; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      const mud = new THREE.CanvasTexture(canvas);
      mud.colorSpace = THREE.SRGBColorSpace;
      s.mesh(new THREE.CylinderGeometry(spread, spread * 1.04, 0.12, 9), new THREE.MeshStandardMaterial({ map: mud, roughness: 0.95 }), [0, -0.06, 0]);
      for (let i = 0; i < 5; i++) {
        const angle = random() * Math.PI * 2;
        const curlUp = s.mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 5), s.material('#a88a5c'), [Math.cos(angle) * spread * 0.8, 0.04, Math.sin(angle) * spread * 0.8]);
        curlUp.rotation.set((random() - 0.5) * 0.9, random() * 3, (random() - 0.5) * 0.9);
      }
    } else if (a.survived === 'vacuum') {
      const rock = s.mesh(new THREE.IcosahedronGeometry(spread * 0.95, 1), s.material('#6f6f73', { flatShading: true, roughness: 0.9 }), [0, -0.3, 0]);
      rock.scale.set(1, 0.3, 0.85);
      const pit = s.material('#3d3d42', { roughness: 1 });
      for (let i = 0; i < 9; i++) { const angle = random() * Math.PI * 2, d = mix(0.5, 0.9, random()) * spread; s.cylinder(0.1, 0.07, 0.02, [Math.cos(angle) * d * 0.9, -0.05 - 0.14 * (d / spread) ** 2, Math.sin(angle) * d * 0.75], pit, 10); }
      const star = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#fff0b0', emissiveIntensity: 1.2 });
      s.scatter(new THREE.OctahedronGeometry(0.03, 0), star, Array.from({ length: 22 }, () => ({ at: [(random() - 0.5) * 3.2, mix(0.3, 2.1, random()), (random() - 0.5) * 2.6] as [number, number, number], size: mix(0.5, 1.5, random()) })));
    } else if (a.survived === 'fire') {
      const cinder = s.material('#26221f', { flatShading: true, roughness: 1 });
      const ember = new THREE.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff5a10', emissiveIntensity: mix(0.6, 1.8, mood.energy), flatShading: true });
      s.cylinder(spread * 0.95, spread, 0.08, [0, -0.05, 0], cinder, 10);
      for (let i = 0; i < 26; i++) {
        const angle = random() * Math.PI * 2, d = mix(0.5, 1.05, Math.sqrt(random())) * spread, size = mix(0.06, 0.2, random());
        s.mesh(new THREE.DodecahedronGeometry(size, 0), i % 4 === 0 ? ember : cinder, [Math.cos(angle) * d, size * 0.5, Math.sin(angle) * d * 0.85]).rotation.set(random() * 3, random() * 3, 0);
      }
    }

    s.root.scale.setScalar(0.15);
    const pace = tun ? 0 : mix(0.25, 2.2, mood.energy) * (waking ? 0.4 : a.doing === 'adrift' ? 0.6 : 1);
    return s.finish({
      update: (_dt, time) => {
        for (const leg of legs) leg.pivot.rotation.z = leg.rest + Math.sin(time * pace * 3 + leg.phase) * 0.32 * Math.min(1, pace);
        bear.position.y = Math.sin(time * pace * 3) * 0.015;
        if (a.doing === 'adrift') bear.rotation.z = 0.2 + Math.sin(time * 0.5) * 0.2;
        snout.scale.x = 1 + Math.sin(time * pace * 2) * 0.08;
      },
    });
  },
});
