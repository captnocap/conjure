import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const BLANKETS = {
  blue: 'Pale hospital-blue cellular cotton, the standard issue.',
  white: 'Plain white, washed thin.',
  mint: 'Mint green, theatre-gown colour.',
  pink: 'Faded pink, maternity ward.',
  grey: 'Grey wool with a red stripe, an old emergency blanket.',
  foil: 'A crinkled gold foil rescue blanket.',
} as const;
const BLANKET_TINT: Record<keyof typeof BLANKETS, string> = {
  blue: '#8fb4d6', white: '#eceae2', mint: '#8fcdb4', pink: '#e2a6b4', grey: '#8a8d90', foil: '#d9b548',
};

export default defineThing({
  questions: {
    state: choice('What state is the stretcher in?', {
      made: 'Empty and freshly made: a tight white sheet, a plump pillow, a blanket folded square at the foot.',
      vacated: 'Just vacated: the sheet rumpled, the pillow dented, the blanket thrown back and hanging off one side.',
      belongings: 'Made, but with a coat and a clear bag of someone’s belongings left on it while they are elsewhere.',
      stripped: 'Stripped to the bare vinyl mattress with the straps buckled across, waiting to be cleaned.',
      covered: 'A white sheet drawn completely over a long still shape.',
    }),
    rails: choice('How are the side rails set?', {
      up: 'Both rails up and locked, a cage of chrome bars.',
      down: 'Both rails dropped below the mattress.',
      one: 'The near rail dropped, the far one still up, as if someone just climbed off.',
    }),
    back: choice('How is the backrest set?', {
      flat: 'Completely flat.',
      raised: 'Head end raised a little, for resting.',
      upright: 'Propped well up, for someone sitting and waiting.',
    }),
    blanket: choice('What is the blanket like?', BLANKETS),
    mattress: choice('What colour is the vinyl mattress?', {
      black: 'Black vinyl, ambulance-bay practical.',
      teal: 'Teal vinyl, modern ward issue.',
      navy: 'Dark navy vinyl.',
      maroon: 'Old maroon vinyl, cracked at the seams.',
    }),
    frame: choice('What is the frame like?', {
      chrome: 'Bright chrome tube, a standard ward trolley.',
      white: 'White enamelled steel, older and heavier.',
      yellow: 'Yellow powder-coat with black bumpers, an emergency department trolley.',
    }),
    chart: noul('Is there a clipboard chart hanging on the foot end?'),
    extra: choice('What is attached to or stowed on the stretcher?', {
      none: 'Nothing extra.',
      drip: 'A drip pole clamped to the head corner with a fluid bag hanging.',
      oxygen: 'A green oxygen cylinder strapped on the lower tray.',
      both: 'Both a drip pole with a bag and an oxygen cylinder underneath.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.66, HEAD = -0.98, FOOT = 0.98, PIVOT = -0.24, TOP = 0.74;
    const frameColour = { chrome: '#d5dadd', white: '#e9e7df', yellow: '#e2b62a' }[a.frame];
    const frame = s.material(frameColour, { metalness: a.frame === 'chrome' ? 0.85 : 0.2, roughness: a.frame === 'chrome' ? 0.25 : 0.5 });
    const chrome = s.material('#d5dadd', { metalness: 0.85, roughness: 0.25 });
    const dark = s.material('#2b2f33', { roughness: 0.7 });
    const rubber = s.material('#3a3d40', { roughness: 0.9 });
    const vinyl = s.material({ black: '#26282b', teal: '#2f8a8c', navy: '#28365e', maroon: '#6e2a35' }[a.mattress], { roughness: 0.45 });
    const linen = new THREE.Color('#f1f0ea').lerp(new THREE.Color('#cfc8ac'), mood.wear * 0.5);
    const sheet = s.material(linen, { roughness: 0.9, side: THREE.DoubleSide });
    const blanketColour = new THREE.Color(BLANKET_TINT[a.blanket]).lerp(new THREE.Color('#9a9c9c'), (1 - mood.cheer) * 0.25);
    const blanket = s.material(blanketColour, a.blanket === 'foil' ? { metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide } : { roughness: 0.95, side: THREE.DoubleSide });

    // A draped cloth: a grid over a rectangle, with height given per point and edges that hang off the mattress.
    const cloth = (x0: number, x1: number, halfZ: number, material: THREE.Material, height: (x: number, z: number) => number, parent: THREE.Object3D = s.root, hang = 1.6) => {
      const nx = 36, nz = 16;
      const geometry = new THREE.PlaneGeometry(1, 1, nx, nz);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = mix(x0, x1, p.getX(i) + 0.5);
        let z = (p.getY(i)) * 2 * halfZ;
        let y = height(x, z);
        const over = Math.abs(z) - W / 2;
        if (over > 0) { y -= over * hang; z = Math.sign(z) * (W / 2 + 0.012 + over * 0.2); }
        p.setXYZ(i, x, y, -z);
      }
      geometry.computeVertexNormals();
      const mesh = s.mesh(geometry, material);
      parent.add(mesh);
      return mesh;
    };
    const ripple = (amount: number, scale = 1) => {
      const waves = Array.from({ length: 5 }, () => [mix(6, 22, random()) * scale, mix(6, 22, random()) * scale, random() * 6.3]);
      return (x: number, z: number) => waves.reduce((sum, [fx, fz, ph]) => sum + Math.sin(x * fx + z * fz + ph), 0) * amount / 2.2;
    };

    // ---- Undercarriage: four swivel castors, a lower tray, two lift columns.
    for (const x of [-0.8, 0.8]) for (const z of [-0.26, 0.26]) {
      const c = new Sculpture(context);
      const wheel = c.cylinder(0.075, 0.075, 0.036, [0.035, 0.075, 0], rubber, 20); wheel.rotation.x = Math.PI / 2;
      const hub = c.cylinder(0.035, 0.035, 0.042, [0.035, 0.075, 0], chrome, 12); hub.rotation.x = Math.PI / 2;
      c.box([0.11, 0.02, 0.06], [0.02, 0.165, 0], chrome);
      for (const side of [-1, 1]) c.box([0.03, 0.1, 0.006], [0.03, 0.115, side * 0.026], chrome);
      c.cylinder(0.016, 0.016, 0.06, [0, 0.2, 0], chrome, 10);
      if (a.frame === 'yellow') c.box([0.06, 0.02, 0.03], [0.1, 0.1, 0], s.material('#c8362c'));
      c.root.position.set(x, 0, z);
      c.root.rotation.y = (random() - 0.5) * mix(0.3, 3, mood.energy);
      s.root.add(c.root);
    }
    for (const z of [-0.26, 0.26]) s.rod([-0.8, 0.22, z], [0.8, 0.22, z], 0.02, frame);
    for (const x of [-0.8, 0.8]) s.rod([x, 0.22, -0.26], [x, 0.22, 0.26], 0.02, frame);
    s.box([1.25, 0.025, 0.46], [0, 0.235, 0], dark);
    for (const x of [-0.48, 0.48]) {
      s.cylinder(0.06, 0.065, 0.26, [x, 0.36, 0], frame, 16);
      s.cylinder(0.04, 0.04, 0.3, [x, 0.56, 0], chrome, 16);
      s.box([0.2, 0.03, 0.5], [x, 0.69, 0], frame);
    }
    // Foot pedals for brake and lift.
    s.box([0.16, 0.02, 0.07], [0.3, 0.16, 0.33], s.material('#3c9a5a'));
    s.box([0.16, 0.02, 0.07], [0.05, 0.16, 0.33], s.material('#c8362c'));
    s.rod([0.17, 0.2, 0.26], [0.17, 0.17, 0.33], 0.01, chrome);

    // ---- Deck: a fixed leg section and a hinged back section.
    const flat = a.state === 'covered';
    const tilt = flat ? 0 : { flat: 0, raised: 0.38, upright: 0.95 }[a.back] + (random() - 0.5) * 0.04;
    for (const z of [-W / 2 + 0.02, W / 2 - 0.02]) s.rod([PIVOT - 0.05, TOP - 0.035, z], [FOOT, TOP - 0.035, z], 0.018, frame);
    s.rod([FOOT, TOP - 0.035, -W / 2 + 0.02], [FOOT, TOP - 0.035, W / 2 - 0.02], 0.018, frame);
    s.box([FOOT - PIVOT, 0.02, W - 0.04], [(FOOT + PIVOT) / 2, TOP - 0.01, 0], dark);
    const mattressT = 0.085;
    s.box([FOOT - PIVOT - 0.01, mattressT, W], [(FOOT + PIVOT) / 2, TOP + mattressT / 2, 0], vinyl);

    const back = new Sculpture(context);
    const backLen = PIVOT - HEAD;
    back.box([backLen, 0.02, W - 0.04], [-backLen / 2, -0.01, 0], dark);
    for (const z of [-W / 2 + 0.02, W / 2 - 0.02]) back.rod([0, -0.035, z], [-backLen, -0.035, z], 0.018, frame);
    back.box([backLen - 0.01, mattressT, W], [-backLen / 2, mattressT / 2, 0], vinyl);
    back.root.position.set(PIVOT, TOP, 0);
    back.root.rotation.z = -tilt;
    s.root.add(back.root);
    if (tilt > 0.1) s.rod([PIVOT - 0.1, TOP - 0.04, 0], [PIVOT - backLen * 0.6 * Math.cos(tilt), TOP + backLen * 0.6 * Math.sin(tilt) - 0.04, 0], 0.014, chrome);

    const dressed = a.state !== 'stripped';
    const surface = TOP + mattressT;
    const rumple = a.state === 'vacated' ? 0.016 : 0.003;
    if (dressed && a.state !== 'covered') {
      // Fitted sheet over both sections.
      const legRipple = ripple(rumple);
      cloth(PIVOT, FOOT + 0.005, W / 2 + 0.035, sheet, (x, z) => surface + 0.008 + rumple * 2.4 + legRipple(x, z));
      const backRipple = ripple(rumple);
      cloth(-backLen - 0.005, 0, W / 2 + 0.035, sheet, (x, z) => mattressT + 0.008 + rumple * 2.4 + backRipple(x, z), back.root);
      // Pillow, on the back section.
      const dent = a.state === 'vacated';
      const pillow = back.ball([0.17, dent ? 0.045 : 0.06, 0.25], [-backLen + 0.24, mattressT + 0.06, dent ? (random() - 0.5) * 0.1 : 0], sheet, 20);
      pillow.rotation.y = dent ? (random() - 0.5) * 0.5 : 0;
      if (dent) back.ball([0.09, 0.03, 0.11], [-backLen + 0.24, mattressT + 0.085, pillow.position.z], s.material(linen.clone().multiplyScalar(0.9)), 14);
    }

    if (a.state === 'made' || a.state === 'belongings') {
      // Blanket folded square at the foot, in three soft layers.
      const fx = FOOT - 0.26;
      for (let i = 0; i < 3; i++) {
        const fold = s.box([0.42 - i * 0.012, 0.028, W - 0.1 - i * 0.012], [fx + (random() - 0.5) * 0.01, surface + 0.03 + i * 0.029, (random() - 0.5) * 0.01], blanket);
        fold.rotation.y = (random() - 0.5) * 0.04;
      }
      if (a.blanket === 'grey') s.box([0.03, 0.03, W - 0.12], [fx + 0.12, surface + 0.075, 0], s.material('#b4332c'));
      // Top sheet turned down across the middle.
      const fold = ripple(0.002);
      cloth(PIVOT + 0.1, fx - 0.24, W / 2 + 0.05, sheet, (x, z) => surface + 0.016 + fold(x, z));
      s.box([0.07, 0.014, W + 0.02], [PIVOT + 0.12, surface + 0.022, 0], sheet);
    }
    if (a.state === 'belongings') {
      // A clear drawstring bag with dark shapes inside, a folded coat, a pair of shoes.
      const bagX = 0.05 + random() * 0.15, bagZ = (random() - 0.5) * 0.12;
      s.ball([0.13, 0.11, 0.15], [bagX, surface + 0.13, bagZ], new THREE.MeshStandardMaterial({ color: '#e9f1f4', transparent: true, opacity: 0.45, roughness: 0.2, depthWrite: false }), 16);
      s.ball([0.09, 0.06, 0.1], [bagX, surface + 0.09, bagZ], s.material(mix(0, 1, random()) > 0.5 ? '#3b4a6b' : '#7a4b3a'), 12);
      s.ball([0.05, 0.04, 0.06], [bagX + 0.03, surface + 0.16, bagZ + 0.03], s.material('#c9c2a8'), 10);
      s.cylinder(0.012, 0.03, 0.05, [bagX, surface + 0.255, bagZ], s.material('#f4f6f6'), 8);
      s.label('PATIENT PROPERTY', 0.16, 0.035, [bagX, surface + 0.12, bagZ + 0.152], '#2a5a9a', '#f4f6f6');
      const coatColour = ['#5b3f34', '#3d4a3c', '#40455c', '#8a2f36'][Math.floor(random() * 4)];
      const coat = s.material(coatColour, { roughness: 0.95, side: THREE.DoubleSide });
      const lump = ripple(0.035, 0.7);
      cloth(-0.2, 0.0 - 0.02 + 0.0, 0.26, coat, (x, z) => surface + 0.07 + lump(x, z) + 0.04 * Math.cos(z * 6), s.root, 1.2).position.set(-0.22 + PIVOT + 0.34, 0, 0);
      for (const dz of [-0.06, 0.06]) {
        const shoe = s.ball([0.1, 0.035, 0.04], [0.45 + (random() - 0.5) * 0.04, surface + 0.045, 0.18 + dz + 0.0], s.material('#2a2422'), 12);
        shoe.rotation.y = (random() - 0.5) * 0.5;
      }
    }
    if (a.state === 'vacated') {
      // Blanket thrown back toward the foot, heaped and hanging off the near side.
      const heap = ripple(0.05, 0.5);
      const side = random() > 0.3 ? 1 : -1;
      const mesh = cloth(0.1, FOOT - 0.02, 0.55, blanket, (x, z) => {
        const ridge = Math.exp(-((x - 0.3) ** 2) / 0.02) * 0.09;
        return surface + 0.05 + ridge + heap(x, z) + 0.02;
      }, s.root, 1.25);
      mesh.position.z = side * 0.09;
      mesh.rotation.y = (random() - 0.5) * 0.12;
    }
    if (a.state === 'stripped') {
      for (const x of [-0.05, 0.45, 0.8]) {
        s.box([0.05, 0.006, W + 0.012], [x, surface + 0.003, 0], s.material('#1b1c1e'));
        s.box([0.07, 0.014, 0.05], [x, surface + 0.01, (random() - 0.5) * 0.2], chrome);
      }
      const bs = back.box([0.05, 0.006, W + 0.012], [-backLen * 0.45, mattressT + 0.003, 0], s.material('#1b1c1e'));
      bs.castShadow = true;
      if (mood.wear > 0.45) for (let i = 0; i < 3; i++) s.box([0.1 + random() * 0.1, 0.002, 0.02], [mix(-0.1, 0.8, random()), surface + 0.002, mix(-0.25, 0.25, random())], s.material('#b9b2a2'));
    }
    if (a.state === 'covered') {
      const fine = ripple(0.006);
      const bump = (x: number, at: number, wide: number, tall: number) => Math.exp(-((x - at) ** 2) / wide) * tall;
      cloth(HEAD + 0.02, FOOT - 0.02, W / 2 + 0.17, sheet, (x, z) => {
        const along = bump(x, -0.78, 0.008, 0.2) + bump(x, -0.45, 0.03, 0.19) + bump(x, -0.1, 0.05, 0.15) + bump(x, 0.35, 0.06, 0.11) + bump(x, 0.74, 0.004, 0.2) + 0.03;
        const across = Math.exp(-((z / mix(0.2, 0.15, (x - HEAD) / 2)) ** 2));
        return surface + 0.012 + along * across + fine(x, z);
      }, s.root, 1.1);
    }

    // ---- Side rails.
    for (const side of [1, -1]) {
      const up = a.rails === 'up' || (a.rails === 'one' && side === -1);
      const base = up ? TOP + 0.02 : TOP - 0.36;
      const z = side * (W / 2 + 0.035);
      const x0 = -0.62, x1 = 0.5, h = 0.34;
      s.tube([[x0, base, z], [x0, base + h - 0.05, z], [x0 + 0.05, base + h, z], [x1 - 0.05, base + h, z], [x1, base + h - 0.05, z], [x1, base, z]], 0.014, chrome);
      for (let i = 1; i < 6; i++) s.rod([mix(x0, x1, i / 6), base, z], [mix(x0, x1, i / 6), base + h, z], 0.008, chrome);
      s.rod([x0, base + 0.02, z], [x1, base + 0.02, z], 0.012, chrome);
    }
    // Push handles at the head, bumper and chart at the foot.
    for (const z of [-0.22, 0.22]) s.tube([[HEAD + 0.06, TOP - 0.04, z], [HEAD - 0.07, TOP + 0.02, z], [HEAD - 0.1, TOP + 0.26, z], [HEAD - 0.1, TOP + 0.3, z * 0.4]], 0.016, frame);
    s.rod([HEAD - 0.1, TOP + 0.3, -0.09], [HEAD - 0.1, TOP + 0.3, 0.09], 0.02, rubber);
    s.tube([[FOOT - 0.02, TOP - 0.04, -W / 2 + 0.03], [FOOT + 0.07, TOP - 0.02, -W / 2 + 0.06], [FOOT + 0.07, TOP - 0.02, W / 2 - 0.06], [FOOT - 0.02, TOP - 0.04, W / 2 - 0.03]], 0.016, frame);
    const bumper = a.frame === 'yellow' ? s.material('#1e2022', { roughness: 0.9 }) : s.material('#8f979c', { roughness: 0.8 });
    for (const x of [HEAD + 0.03, FOOT - 0.03]) for (const z of [-W / 2, W / 2]) s.cylinder(0.05, 0.05, 0.035, [x, TOP - 0.04, z], bumper, 14);

    if (a.chart) {
      const board = new Sculpture(context);
      board.box([0.24, 0.32, 0.012], [0, -0.16, 0], s.material('#7b5a3a'));
      const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f6f4ec'; ctx.fillRect(0, 0, 192, 256);
      ctx.fillStyle = '#2f6fb0'; ctx.fillRect(12, 12, 168, 22);
      ctx.strokeStyle = '#8b97a0'; ctx.lineWidth = 2;
      for (let y = 52; y < 150; y += 14) { ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(mix(90, 180, random()), y); ctx.stroke(); }
      ctx.strokeStyle = '#c9d2d6'; for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(12 + i * 21, 160); ctx.lineTo(12 + i * 21, 244); ctx.stroke(); }
      ctx.strokeStyle = '#c8362c'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const y = 200 + (random() - 0.5) * 50 * mix(0.4, 1.4, mood.energy); if (i === 0) ctx.moveTo(12, y); else ctx.lineTo(12 + i * 21, y); }
      ctx.stroke();
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      board.mesh(new THREE.PlaneGeometry(0.21, 0.28), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }), [0, -0.17, 0.008]);
      board.box([0.1, 0.03, 0.02], [0, -0.015, 0.008], chrome);
      board.root.position.set(FOOT + 0.09, TOP + 0.0, (random() - 0.5) * 0.2);
      board.root.rotation.y = Math.PI / 2;
      board.root.rotation.z = 0;
      board.root.rotateX(-0.12);
      board.root.rotateZ((random() - 0.5) * 0.12);
      s.root.add(board.root);
    }

    if (a.extra === 'drip' || a.extra === 'both') {
      const px = HEAD + 0.08, pz = -W / 2 - 0.02;
      s.rod([px, TOP - 0.1, pz], [px, 1.9, pz], 0.011, chrome);
      s.box([0.05, 0.06, 0.05], [px, TOP - 0.03, pz], dark);
      for (const dx of [-1, 1]) s.tube([[px, 1.9, pz], [px + dx * 0.07, 1.93, pz], [px + dx * 0.1, 1.88, pz]], 0.006, chrome);
      const fluid = new THREE.MeshStandardMaterial({ color: '#dfeef2', transparent: true, opacity: 0.75, roughness: 0.15 });
      const bx = px + 0.1;
      const bag = s.box([0.1, 0.17, 0.035], [bx, 1.77, pz], fluid); bag.geometry = new THREE.CapsuleGeometry(0.05, 0.1, 4, 12); bag.scale.set(1, 1, 0.4);
      s.label('0.9%', 0.06, 0.03, [bx, 1.79, pz + 0.022], '#2a5a9a', '#f4f6f6');
      s.cylinder(0.012, 0.012, 0.05, [bx, 1.64, pz], fluid, 8);
      const sag = mix(0.1, 0.3, random());
      s.tube([[bx, 1.62, pz], [bx + 0.02, 1.3, pz + 0.03], [bx + 0.25, TOP + 0.35 + sag, pz + 0.12], [bx + 0.5, TOP + 0.2, 0]], 0.004, new THREE.MeshStandardMaterial({ color: '#eef4f4', roughness: 0.3 }));
    }
    if (a.extra === 'oxygen' || a.extra === 'both') {
      const tank = new Sculpture(context);
      tank.lathe([[0, 0], [0.055, 0.005], [0.06, 0.03], [0.06, 0.48], [0.045, 0.55], [0.02, 0.58], [0.02, 0.62]], s.material('#3a8f5f', { metalness: 0.3, roughness: 0.4 }));
      tank.cylinder(0.062, 0.062, 0.1, [0, 0.47, 0], s.material('#eef0ee'), 20);
      tank.box([0.05, 0.05, 0.05], [0, 0.645, 0], s.material('#b89a4a', { metalness: 0.8, roughness: 0.3 }));
      tank.cylinder(0.03, 0.03, 0.015, [0, 0.645, 0.035], s.material('#f4f4ee'), 14).rotation.x = Math.PI / 2;
      tank.root.rotation.z = -Math.PI / 2;
      tank.root.position.set(-0.3, 0.31, 0.08 + (random() - 0.5) * 0.1);
      s.root.add(tank.root);
      for (const x of [-0.2, 0.1]) s.ring(0.064, 0.006, [x, 0.31, tank.root.position.z], dark).rotation.y = Math.PI / 2;
    }

    return s.finish();
  },
});
