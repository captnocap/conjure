import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const LIVERIES = {
  'courier-yellow': 'Taxi yellow with black chevrons, a gig-fleet workhorse.',
  'corporate-white': 'Clean white and grey, anonymous corporate logistics.',
  'matte-black': 'Matte black with no markings, not on any registry.',
  'kawaii-pink': 'Bubblegum pink with a cartoon mascot face on the nose.',
  'hazard-orange': 'Safety orange with reflective bands, municipal or medical.',
  patchwork: 'A patchwork of mismatched salvaged panels in primer, green and bare metal.',
} as const;
const HULL: Record<keyof typeof LIVERIES, string> = {
  'courier-yellow': '#f2c21a', 'corporate-white': '#e8eaec', 'matte-black': '#26282c', 'kawaii-pink': '#f58ab6', 'hazard-orange': '#f0661e', patchwork: '#8c9a7b',
};

export default defineThing({
  questions: {
    state: choice('What is the drone doing right now?', {
      arriving: 'Arriving: nose dipped, rotors blurring, a green light on.',
      holding: 'Hovering level in place, waiting for someone to come out.',
      parked: 'Parked on its skids with the rotors stopped, an amber light blinking.',
      crashed: 'Crashed: lying tilted on the ground with a snapped arm and its cargo spilled.',
    }),
    cargo: choice('What is it carrying?', {
      noodles: 'An insulated food box with a steaming-bowl logo.',
      medical: 'A white medical cooler with a red cross.',
      contraband: 'An unmarked black case wrapped in tape.',
      parcel: 'A brown paper parcel tied with string.',
      flowers: 'A paper cone of bright flowers strapped underneath.',
      nothing: 'Nothing: an empty hook swings under it.',
    }),
    livery: choice('What does the shell look like?', LIVERIES),
    frame: choice('What is the airframe like?', {
      quad: 'Four open propellers on slim arms.',
      ducted: 'Four propellers inside ring guards, safe for crowded streets.',
      hex: 'Six rotors on a wide heavy-lift frame.',
    }),
    stickers: score('How covered in stickers is it?', ['Bare shell', 'A few decals', 'Plastered edge to edge']),
    eye: choice('What is on its nose?', {
      camera: 'A single dark camera ball.',
      visor: 'A wide glowing visor strip, almost a face.',
      spotlight: 'A bright landing spotlight.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const d = new THREE.Group(); // the drone itself, skids at y = 0
    s.root.add(d);
    const on = <T extends THREE.Object3D>(group: THREE.Object3D, mesh: T) => { group.add(mesh); return mesh; };
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const flying = a.state === 'arriving' || a.state === 'holding';
    const crashed = a.state === 'crashed';

    const paintStickers = (base: string, w: number, h: number, mark: (c: CanvasRenderingContext2D, W: number, H: number) => void, amount: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = Math.round(256 * h / w);
      const c = canvas.getContext('2d')!;
      const W = canvas.width, H = canvas.height;
      c.fillStyle = base; c.fillRect(0, 0, W, H);
      mark(c, W, H);
      const colours = ['#ff3d7f', '#2fe6ff', '#ffd23a', '#3dffb0', '#ffffff', '#ff7a1a', '#8a7bff', '#111111'];
      for (let i = 0; i < Math.round(amount * 18); i++) {
        const x = random() * W, y = random() * H, size = 14 + random() * 26;
        c.save(); c.translate(x, y); c.rotate((random() - 0.5) * 1.2);
        c.fillStyle = pick(colours); c.strokeStyle = '#ffffff'; c.lineWidth = 3;
        const kind = Math.floor(random() * 4);
        if (kind === 0) { c.beginPath(); c.arc(0, 0, size / 2, 0, 6.28); c.fill(); c.stroke(); }
        else if (kind === 1) { c.fillRect(-size * 0.8, -size * 0.3, size * 1.6, size * 0.6); c.fillStyle = pick(colours); for (let k = 0; k < 4; k++) c.fillRect(-size * 0.65 + k * size * 0.35, -size * 0.15, size * 0.18, size * 0.3); }
        else if (kind === 2) { c.beginPath(); for (let k = 0; k < 10; k++) { const t = k * Math.PI / 5, q = k % 2 ? size * 0.25 : size * 0.6; c.lineTo(Math.cos(t) * q, Math.sin(t) * q); } c.closePath(); c.fill(); }
        else { c.fillStyle = '#f4f1e6'; c.fillRect(-size * 0.6, -size * 0.4, size * 1.2, size * 0.8); c.fillStyle = '#111'; for (let k = 0; k < 7; k++) c.fillRect(-size * 0.5 + k * size * 0.15, -size * 0.3, size * (0.03 + random() * 0.07), size * 0.6); }
        c.restore();
      }
      // Scuffs.
      c.strokeStyle = 'rgba(60,60,60,0.5)'; c.lineWidth = 2;
      for (let i = 0; i < Math.round(mood.wear * 26); i++) { const x = random() * W, y = random() * H; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 50, y + (random() - 0.5) * 16); c.stroke(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const hullColour = HULL[a.livery];
    const hullTexture = paintStickers(hullColour, 1, 1, (c, W, H) => {
      if (a.livery === 'courier-yellow') { c.fillStyle = '#17181a'; for (let i = -2; i < 6; i++) { c.beginPath(); c.moveTo(i * 60, H); c.lineTo(i * 60 + 30, H); c.lineTo(i * 60 + 90, H * 0.72); c.lineTo(i * 60 + 60, H * 0.72); c.fill(); } }
      if (a.livery === 'corporate-white') { c.fillStyle = '#7c8894'; c.fillRect(0, H * 0.42, W, H * 0.1); }
      if (a.livery === 'hazard-orange') { c.fillStyle = '#f5f2df'; c.fillRect(0, H * 0.3, W, H * 0.08); c.fillRect(0, H * 0.62, W, H * 0.08); }
      if (a.livery === 'kawaii-pink') { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(W * 0.5, H * 0.5, 40, 0, 6.28); c.fill(); c.fillStyle = '#2a1a22'; c.beginPath(); c.arc(W * 0.5 - 14, H * 0.5 - 4, 5, 0, 6.28); c.arc(W * 0.5 + 14, H * 0.5 - 4, 5, 0, 6.28); c.fill(); c.lineWidth = 3; c.strokeStyle = '#2a1a22'; c.beginPath(); c.arc(W * 0.5, H * 0.5 + 6, 10, 0.2, Math.PI - 0.2); c.stroke(); }
      if (a.livery === 'patchwork') for (let i = 0; i < 7; i++) { c.fillStyle = pick(['#b9bdbf', '#b4533a', '#5d7f6a', '#d8d2c0', '#6a6f78']); c.fillRect(random() * W, random() * H, 50 + random() * 80, 40 + random() * 70); }
    }, a.stickers);
    const shell = new THREE.MeshStandardMaterial({ map: hullTexture, roughness: a.livery === 'matte-black' ? 0.85 : 0.4 + mood.wear * 0.3 });
    const plain = s.material(hullColour, { roughness: 0.5 });
    const dark = s.material('#1d1f23', { roughness: 0.6 });
    const metal = s.material('#aeb4b8', { metalness: 0.6, roughness: 0.35 });
    const carbon = s.material('#2b2d31', { roughness: 0.45, metalness: 0.2 });

    // Hull.
    const hy = 0.43;
    on(d, s.ball([0.2, 0.1, 0.27], [0, hy + 0.02, 0], shell, 24));
    on(d, s.box([0.28, 0.06, 0.38], [0, hy - 0.025, 0], dark));
    on(d, s.box([0.16, 0.05, 0.1], [0, hy + 0.085, -0.16], carbon)); // battery
    const statusColour = { arriving: '#3dff7a', holding: '#39b8ff', parked: '#ffb020', crashed: '#ff2d2d' }[a.state];
    const status = new THREE.MeshStandardMaterial({ color: statusColour, emissive: statusColour, emissiveIntensity: crashed ? 0.5 : 1.6 });
    on(d, s.box([0.12, 0.012, 0.012], [0, hy + 0.113, -0.16], status));
    for (const x of [-0.05, 0.06]) on(d, s.rod([x, hy + 0.08, -0.17], [x * 1.3, hy + 0.2 + random() * 0.08, -0.22], 0.004, dark));
    // Nose.
    const lens = new THREE.MeshStandardMaterial({ color: a.eye === 'camera' ? '#0c0d10' : '#eaf6ff', emissive: a.eye === 'camera' ? '#000000' : a.eye === 'visor' ? statusColour : '#fff3c9', emissiveIntensity: crashed ? 0.15 : 1.5, roughness: 0.1 });
    if (a.eye === 'camera') {
      on(d, s.ball([0.05, 0.05, 0.05], [0, hy - 0.03, 0.23], dark, 14));
      on(d, s.cylinder(0.026, 0.026, 0.02, [0, hy - 0.035, 0.275], lens, 14)).rotation.x = Math.PI / 2;
      on(d, s.cylinder(0.008, 0.008, 0.006, [0.012, hy - 0.025, 0.286], status, 8)).rotation.x = Math.PI / 2;
    } else if (a.eye === 'visor') {
      on(d, s.box([0.22, 0.04, 0.02], [0, hy + 0.01, 0.235], lens)).rotation.x = -0.3;
      on(d, s.box([0.25, 0.065, 0.03], [0, hy + 0.008, 0.222], dark)).rotation.x = -0.3;
    } else {
      on(d, s.cylinder(0.05, 0.035, 0.05, [0, hy - 0.04, 0.24], metal, 16)).rotation.x = Math.PI / 2 + 0.5;
      on(d, s.cylinder(0.042, 0.042, 0.01, [0, hy - 0.053, 0.262], lens, 16)).rotation.x = Math.PI / 2 + 0.5;
    }

    // Arms, motors, rotors.
    const rotorCount = a.frame === 'hex' ? 6 : 4;
    const reach = a.frame === 'hex' ? 0.44 : 0.38;
    const propR = a.frame === 'hex' ? 0.15 : a.frame === 'ducted' ? 0.15 : 0.19;
    const spinners: THREE.Object3D[] = [];
    const broken = crashed ? Math.floor(random() * rotorCount) : -1;
    const blur = new THREE.MeshStandardMaterial({ color: '#cfd6da', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < rotorCount; i++) {
      const angle = a.frame === 'hex' ? i * Math.PI / 3 + Math.PI / 6 : i * Math.PI / 2 + Math.PI / 4;
      const arm = new THREE.Group();
      arm.rotation.y = -angle; arm.position.y = hy;
      d.add(arm);
      const pod = new THREE.Group();
      arm.add(pod);
      on(pod, s.rod([0.1, 0, 0], [reach, 0.03, 0], 0.014, carbon));
      on(pod, s.cylinder(0.032, 0.036, 0.06, [reach, 0.04, 0], metal, 14));
      on(pod, s.cylinder(0.014, 0.014, 0.02, [reach, 0.0, 0], new THREE.MeshStandardMaterial({ color: Math.cos(angle - Math.PI / 2) > 0 ? '#ffffff' : '#ff3030', emissive: Math.cos(angle - Math.PI / 2) > 0 ? '#ffffff' : '#ff2020', emissiveIntensity: crashed ? 0.1 : 1.2 }), 8));
      const prop = new THREE.Group();
      prop.position.set(reach, 0.078, 0); prop.rotation.y = random() * 3;
      pod.add(prop);
      on(prop, s.cylinder(0.014, 0.014, 0.02, [0, 0, 0], dark, 8));
      const bladeCount = a.frame === 'ducted' ? 3 : 2;
      for (let b = 0; b < bladeCount; b++) {
        const holder = new THREE.Group(); holder.rotation.y = b * Math.PI * 2 / bladeCount; prop.add(holder);
        const blade = on(holder, s.box([propR - 0.01, 0.005, 0.03], [propR / 2, 0.006, 0], carbon));
        blade.rotation.x = 0.25;
        if (crashed && random() < 0.5) { blade.rotation.z = -0.5 - random() * 0.6; blade.scale.x = 0.6; }
      }
      if (flying) { const disc = on(prop, s.mesh(new THREE.CircleGeometry(propR, 28), blur, [0, 0.008, 0])); disc.rotation.x = -Math.PI / 2; disc.castShadow = false; }
      spinners.push(prop);
      if (a.frame === 'ducted') {
        on(pod, s.ring(propR + 0.015, 0.012, [reach, 0.075, 0], plain)).rotation.x = Math.PI / 2;
        for (let k = 0; k < 3; k++) on(pod, s.rod([reach, 0.05, 0], [reach + Math.cos(k * 2.1 + 1) * (propR + 0.015), 0.07, Math.sin(k * 2.1 + 1) * (propR + 0.015)], 0.005, carbon));
      }
      if (i === broken) { pod.position.set(0.06, 0, 0); pod.rotation.z = -0.9 - random() * 0.5; pod.rotation.y = 0.4; }
    }

    // Skids.
    for (const x of [-0.2, 0.2]) {
      on(d, s.rod([x, 0.012, -0.22], [x, 0.012, 0.22], 0.012, carbon));
      for (const z of [-0.12, 0.12]) on(d, s.rod([x, 0.012, z * 1.4], [x * 0.6, hy - 0.04, z], 0.008, carbon));
      for (const z of [-0.22, 0.22]) on(d, s.ball([0.016, 0.016, 0.016], [x, 0.012, z], dark, 8));
    }

    // Cargo: built in its own group so a crash can throw it clear.
    const cargo = new THREE.Group();
    const spilled: THREE.Object3D[] = [];
    const amount = a.stickers;
    if (a.cargo === 'noodles' || a.cargo === 'medical' || a.cargo === 'contraband') {
      const base = { noodles: mood.warmth > 0.5 ? '#c7352b' : '#c9cdd0', medical: '#eef0ee', contraband: '#18191b' }[a.cargo];
      const texture = paintStickers(base, 1, 0.85, (c, W, H) => {
        c.lineCap = 'round';
        if (a.cargo === 'noodles') {
          c.fillStyle = c.strokeStyle = '#fff4d6'; c.lineWidth = 7;
          c.beginPath(); c.arc(W / 2, H * 0.52, 52, 0, Math.PI); c.closePath(); c.fill();
          for (const k of [-24, 0, 24]) { c.beginPath(); c.moveTo(W / 2 + k, H * 0.44); c.bezierCurveTo(W / 2 + k - 16, H * 0.34, W / 2 + k + 16, H * 0.26, W / 2 + k, H * 0.14); c.stroke(); }
          c.fillStyle = '#e9f0d0'; c.fillRect(0, H * 0.86, W, H * 0.07);
        } else if (a.cargo === 'medical') {
          c.fillStyle = '#d2222a'; c.fillRect(W / 2 - 18, H * 0.2, 36, H * 0.6); c.fillRect(W / 2 - H * 0.3, H / 2 - 18, H * 0.6, 36);
          c.fillStyle = '#3a8fd0'; c.fillRect(0, H * 0.9, W, H * 0.1);
        } else {
          c.strokeStyle = '#8f8a78'; c.lineWidth = 16;
          for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(0, H * (0.2 + i * 0.3) + random() * 20); c.lineTo(W, H * (0.2 + i * 0.3) + random() * 20); c.stroke(); }
        }
      }, a.cargo === 'contraband' ? 0 : amount);
      const boxMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55 });
      on(cargo, s.box([0.3, 0.25, 0.3], [0, 0.125, 0], boxMat));
      const lid = on(cargo, s.box([0.32, 0.04, 0.32], [0, 0.268, 0], s.material(a.cargo === 'contraband' ? '#222327' : a.cargo === 'medical' ? '#3a8fd0' : '#2a2c30', { roughness: 0.5 })));
      on(cargo, s.box([0.306, 0.02, 0.306], [0, 0.03, 0], s.material('#e9f0d0', { emissive: '#cfe58a', emissiveIntensity: 0.4 })));
      on(cargo, s.ring(0.05, 0.008, [0, 0.29, 0], dark, Math.PI));
      if (crashed) {
        lid.position.set(0.14, 0.3, 0.02); lid.rotation.z = -1.1;
        const stuff = { noodles: '#ecd58a', medical: '#58e6e0', contraband: '#7fd66b' }[a.cargo];
        const glow = new THREE.MeshStandardMaterial({ color: stuff, emissive: stuff, emissiveIntensity: a.cargo === 'noodles' ? 0.05 : 0.7, roughness: 0.5 });
        for (let i = 0; i < 7; i++) {
          const piece = a.cargo === 'noodles' ? s.ball([0.045, 0.02, 0.04], [0, 0.02, 0], glow, 8) : a.cargo === 'medical' ? s.cylinder(0.012, 0.012, 0.07, [0, 0.012, 0], glow, 8) : s.box([0.07, 0.012, 0.035], [0, 0.008, 0], glow);
          if (a.cargo === 'medical') piece.rotation.z = Math.PI / 2;
          piece.rotation.y = random() * 3;
          spilled.push(piece);
        }
        if (a.cargo === 'noodles') spilled.push(s.lathe([[0.03, 0], [0.035, 0.008], [0.075, 0.05], [0.085, 0.07], [0.08, 0.07], [0.03, 0.012], [0, 0.012]], s.material('#f1ebdd', { side: THREE.DoubleSide })));
      }
    } else if (a.cargo === 'parcel') {
      on(cargo, s.box([0.24, 0.15, 0.26], [0, 0.075, 0], s.material('#b58a55', { roughness: 0.95 })));
      on(cargo, s.box([0.245, 0.155, 0.012], [0, 0.075, 0], s.material('#e9dfc4')));
      on(cargo, s.box([0.012, 0.155, 0.265], [0, 0.075, 0], s.material('#e9dfc4')));
      const tag = on(cargo, s.label('▚▞▚ ≡≡', 0.1, 0.05, [0.05, 0.152, 0.06], '#3a2a1a', '#f4f1e6')); tag.rotation.x = -Math.PI / 2;
    } else if (a.cargo === 'flowers') {
      const cone = on(cargo, s.mesh(new THREE.ConeGeometry(0.09, 0.34, 14, 1, true), s.material('#e9dfc4', { side: THREE.DoubleSide, roughness: 0.9 }), [0, 0.1, 0]));
      cone.rotation.x = -Math.PI / 2;
      const petals = ['#ff4f7a', '#ffd23a', '#ffffff', '#c86bff', '#ff7a1a'];
      for (let i = 0; i < 11; i++) on(cargo, s.ball([0.035, 0.035, 0.035], [(random() - 0.5) * 0.13, 0.1 + (random() - 0.5) * 0.12, -0.17 - random() * 0.05], s.material(pick(petals), { roughness: 0.7 }), 8));
      for (let i = 0; i < 4; i++) on(cargo, s.ball([0.03, 0.012, 0.05], [(random() - 0.5) * 0.14, 0.1 + (random() - 0.5) * 0.14, -0.14], s.material('#3f8a3a'), 8));
      on(cargo, s.box([0.03, 0.2, 0.03], [0, 0.13, 0.02], dark));
    } else {
      on(cargo, s.rod([0, 0.33, 0], [0.02, 0.1, 0.01], 0.003, dark));
      on(cargo, s.ring(0.022, 0.006, [0.02, 0.08, 0.01], metal, Math.PI * 1.4)).rotation.z = 2.2;
    }
    cargo.position.y = a.cargo === 'nothing' ? 0.05 : 0.065;

    // Pose.
    let bob: ((time: number) => void) | null = null;
    if (crashed) {
      d.rotation.set(0.25 + random() * 0.2, random() * 1.2 - 0.6, 0.45 + random() * 0.25);
      d.position.set(-0.12, 0.2, -0.05);
      cargo.position.set(0.55, 0.15, 0.3); cargo.rotation.set(0, random() * 2, a.cargo === 'nothing' ? 0 : Math.PI / 2);
      if (a.cargo === 'flowers' || a.cargo === 'parcel' || a.cargo === 'nothing') { cargo.rotation.z = 0; cargo.position.y = 0; }
      s.root.add(cargo);
      spilled.forEach((piece, index) => { piece.position.x += 0.62 + random() * 0.3; piece.position.z += 0.2 + (random() - 0.5) * 0.5; if (index === 7) piece.rotation.z = 1.2; s.root.add(piece); });
      const scorch = s.cylinder(0.3, 0.3, 0.004, [-0.1, 0.002, 0], s.material('#3b3a38', { roughness: 1 }), 20); scorch.scale.z = 0.7;
    } else {
      d.add(cargo);
      if (flying) {
        const lift = 0.3 + random() * 0.2;
        d.position.y = lift;
        if (a.state === 'arriving') d.rotation.x = 0.16;
        const acrylic = new THREE.MeshStandardMaterial({ color: '#dff2f6', transparent: true, opacity: 0.38, roughness: 0.08 });
        s.cylinder(0.2, 0.22, 0.025, [0, 0.0125, 0], acrylic, 28);
        s.cylinder(0.014, 0.014, lift + 0.08, [0, (lift + 0.08) / 2, 0], acrylic, 10);
        const amplitude = mix(0.008, 0.035, mood.energy);
        bob = (time) => { d.position.y = lift + Math.sin(time * 2.1) * amplitude; d.rotation.z = Math.sin(time * 1.3) * amplitude * 1.5; };
      }
    }

    const speed = flying ? mix(18, 45, mood.energy) : a.state === 'parked' ? 0 : 0;
    const blink = a.state === 'parked' || a.state === 'crashed';
    return s.finish({
      footprint: 0.5,
      update: (dt, time) => {
        if (speed) spinners.forEach((prop, index) => { prop.rotation.y += dt * speed * (index % 2 ? 1 : -1); });
        bob?.(time);
        if (blink) status.emissiveIntensity = (Math.sin(time * (crashed ? 9 : 3)) > (crashed ? 0.6 : 0) ? 1.6 : 0.1);
      },
    });
  },
});
