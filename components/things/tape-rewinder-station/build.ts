import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
const SIGN = { kind: ['BE KIND', 'REWIND'], fee: ['$1 FEE', 'IF NOT REWOUND'], free: ['FREE', 'REWINDS'], please: ['PLEASE', 'REWIND «'], none: ['', ''] } as const;

export default defineThing({
  questions: {
    style: choice('What does the rewinder look like?', {
      sports: 'A red wedge-shaped sports car whose cabin pops up to take the tape.',
      cruiser: 'A black-and-white police cruiser with a light bar.',
      cadillac: 'A long pink convertible with tail fins.',
      plain: 'A plain beige box with a smoked lid, no fun at all.',
    }),
    lid: noul('Is the lid popped up with a tape sitting in it?'),
    stack: score('How tall is the stack of returned cassettes beside it?', ['Two tapes', 'A handful', 'A tall stack', 'A leaning tower of a whole weekend']),
    spill: noul('Has one tape been chewed, with brown ribbon spilled out across the counter?'),
    sign: choice('What does the little sign say?', {
      kind: 'BE KIND REWIND', fee: '$1 FEE IF NOT REWOUND', free: 'FREE REWINDS', please: 'PLEASE REWIND', none: 'There is no sign.',
    }),
    counter: choice('What surface is it on?', {
      laminate: 'Speckled grey laminate with a dark rubber edge.',
      wood: 'Honey wood-grain veneer.',
      glass: 'A glass display counter top with a chrome rim.',
      blue: 'Royal blue laminate with a yellow edge, a chain store.',
    }),
    extra: choice('What else has been left on the counter?', {
      none: 'Nothing else.',
      mug: 'A mug of coffee gone cold.',
      mints: 'A bowl of free peppermints.',
      spike: 'A receipt spike stacked with late-fee slips.',
      jar: 'A tip jar with a few coins.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const chrome = s.material('#dfe3e4', { metalness: 0.9, roughness: 0.2 });
    const dark = s.material('#141416', { roughness: 0.5 });
    const glass = s.material('#1c2630', { roughness: 0.15, metalness: 0.4 });

    // Counter slab.
    const top = { laminate: '#b9bcc0', wood: '#c9954e', glass: '#a9c8cc', blue: '#1f46a8' }[a.counter];
    const edge = { laminate: '#2a2c30', wood: '#7a5630', glass: '#dfe3e4', blue: '#f2c21a' }[a.counter];
    const CW = 0.9, CD = 0.52, CH = 0.04;
    const topTexture = paint(256, 128, (ctx) => {
      ctx.fillStyle = top; ctx.fillRect(0, 0, 256, 128);
      if (a.counter === 'laminate') for (let i = 0; i < 700; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(40,40,50,0.4)'; ctx.fillRect(random() * 256, random() * 128, 1.5, 1.5); }
      if (a.counter === 'wood') { ctx.strokeStyle = 'rgba(90,50,20,0.35)'; for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.moveTo(0, i * 8 + 3); ctx.bezierCurveTo(80, i * 8 - 4, 170, i * 8 + 10, 256, i * 8 + 2); ctx.stroke(); } }
      ctx.strokeStyle = 'rgba(40,30,20,0.3)';
      for (let i = 0; i < mood.wear * 9; i++) { ctx.beginPath(); ctx.arc(random() * 256, random() * 128, 9 + random() * 4, 0, 7); ctx.stroke(); }
    });
    s.box([CW, CH, CD], [0, CH / 2, 0], s.material(edge, { metalness: a.counter === 'glass' ? 0.8 : 0 }));
    const surface = s.mesh(new THREE.PlaneGeometry(CW - 0.02, CD - 0.02), new THREE.MeshStandardMaterial({ map: topTexture, roughness: a.counter === 'glass' ? 0.1 : 0.5 }), [0, CH + 0.0006, 0]);
    surface.rotation.x = -Math.PI / 2;
    const Y = CH;

    // Cassettes.
    const topMap = paint(256, 144, (ctx) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 144);
      ctx.fillStyle = '#18181a'; ctx.fillRect(0, 0, 256, 78);
      ctx.fillStyle = '#3a3f46'; ctx.fillRect(44, 14, 168, 50);
      for (const x of [86, 170]) { ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(x, 39, 19, 0, 7); ctx.fill(); ctx.fillStyle = '#18181a'; ctx.beginPath(); ctx.arc(x, 39, 7, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#18181a'; ctx.fillRect(0, 132, 256, 12); ctx.fillRect(0, 78, 14, 66); ctx.fillRect(242, 78, 14, 66);
      ctx.fillStyle = 'rgba(30,40,120,0.75)'; ctx.fillRect(30, 94, 150, 7); ctx.fillRect(30, 110, 96, 6);
      ctx.fillStyle = 'rgba(200,30,30,0.8)'; ctx.fillRect(200, 92, 30, 26);
    });
    const shell = s.material('#ffffff', { roughness: 0.5 });
    const blackM = s.material('#161618', { roughness: 0.5 });
    const labelM = new THREE.MeshStandardMaterial({ map: topMap, roughness: 0.6 });
    const spineM = s.material('#ece8da', { roughness: 0.7 });
    void shell;
    const tapes: { matrix: THREE.Matrix4; tint: THREE.Color }[] = [];
    const tints = ['#ffffff', '#fff6c8', '#ffe0e0', '#dff0ff', '#ffffff', '#e8ffe0'];
    const tape = (x: number, y: number, z: number, ry: number, rx = 0, rz = 0) =>
      tapes.push({ matrix: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1)), tint: new THREE.Color(tints[Math.floor(random() * tints.length)]) });

    const count = Math.round(mix(2, 15, a.stack) * mix(0.85, 1.15, random()));
    const sx = 0.27, sz = -0.06;
    const lean = a.stack > 0.7 ? (random() - 0.5) * 0.012 : 0;
    const spin = (random() - 0.5) * 0.5;
    for (let i = 0; i < count; i++) tape(sx + lean * i + (random() - 0.5) * 0.012, Y + 0.0128 + i * 0.0256, sz + (random() - 0.5) * 0.012 + Math.abs(lean) * i * 0.5, spin + (random() - 0.5) * mix(0.1, 0.5, mood.wear));
    if (mood.density > 0.55) { const n = 1 + Math.floor(random() * 4 * mood.density); for (let i = 0; i < n; i++) tape(0.3 + (random() - 0.5) * 0.02, Y + 0.0128 + i * 0.0256, 0.14 + (random() - 0.5) * 0.01, 1.3 + (random() - 0.5) * 0.4); }

    // The rewinder.
    const car = new THREE.Group();
    car.position.set(-0.17, Y, -0.06);
    car.rotation.y = (random() - 0.5) * 0.3 + 0.12;
    car.scale.setScalar(1.4);
    s.root.add(car);
    const spinners: THREE.Object3D[] = [];
    const extrude = (points: readonly (readonly [number, number])[], width: number, material: THREE.Material, bevel = 0.006) => {
      const shape = new THREE.Shape();
      points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 });
      geometry.translate(0, 0, -(width - bevel * 2) / 2);
      return s.mesh(geometry, material);
    };
    const lidGroup = new THREE.Group();
    const popped = a.lid;
    const inside = () => {
      const t = new THREE.Group();
      t.add(s.box([0.15, 0.02, 0.085], [0, 0, 0], blackM));
      for (const x of [-0.035, 0.035]) { const hub = s.cylinder(0.02, 0.02, 0.004, [x, 0.011, 0], s.material('#f2f2f2'), 6); t.add(hub); spinners.push(hub); }
      return t;
    };
    if (a.style === 'plain') {
      const beige = s.material('#cfc6b0', { roughness: 0.6 });
      car.add(s.box([0.27, 0.07, 0.18], [0, 0.04, 0], beige));
      car.add(s.box([0.27, 0.012, 0.18], [0, 0.006, 0], dark));
      car.add(s.box([0.03, 0.012, 0.02], [0.1, 0.05, 0.092], s.material('#d8d2c0')));
      car.add(s.ball([0.006, 0.006, 0.003], [0.06, 0.05, 0.091], s.material('#ff2a1a', { emissive: '#ff2a1a', emissiveIntensity: mix(0.3, 1.2, mood.energy) }), 8));
      car.add(s.label('REWINDER', 0.1, 0.018, [-0.06, 0.05, 0.0905], '#3a3a3a', '#cfc6b0'));
      lidGroup.position.set(0, 0.076, -0.08);
      lidGroup.add(s.box([0.22, 0.012, 0.15], [0, 0.004, 0.08], glass));
      const cassette = inside(); cassette.position.set(0, 0.078, 0); car.add(cassette);
    } else {
      const tone = { sports: mood.cheer > 0.25 ? '#d81e1e' : '#8a1a1a', cruiser: '#f2f2ee', cadillac: '#f08ab4' }[a.style];
      const body = s.material(tone, { roughness: 0.28, metalness: 0.25 });
      const profile: Record<string, [number, number][]> = {
        sports: [[-0.15, 0.018], [-0.152, 0.052], [-0.14, 0.07], [-0.06, 0.072], [0.07, 0.066], [0.142, 0.046], [0.152, 0.03], [0.15, 0.018]],
        cruiser: [[-0.15, 0.018], [-0.152, 0.062], [-0.14, 0.072], [-0.05, 0.074], [0.06, 0.072], [0.145, 0.066], [0.152, 0.04], [0.15, 0.018]],
        cadillac: [[-0.165, 0.018], [-0.172, 0.05], [-0.175, 0.092], [-0.13, 0.07], [-0.03, 0.068], [0.08, 0.066], [0.16, 0.058], [0.168, 0.034], [0.165, 0.018]],
      };
      car.add(extrude(profile[a.style], 0.125, body));
      // Wheels with chrome hubs.
      for (const x of [-0.095, 0.098]) for (const z of [-1, 1]) {
        const wheel = s.cylinder(0.026, 0.026, 0.022, [x, 0.026, z * 0.057], dark, 16);
        wheel.rotation.x = Math.PI / 2;
        const hub = s.cylinder(0.014, 0.014, 0.024, [x, 0.026, z * 0.058], chrome, 10);
        hub.rotation.x = Math.PI / 2;
        car.add(wheel, hub);
      }
      // Bumpers and lamps.
      const front = a.style === 'cadillac' ? 0.168 : 0.152;
      car.add(s.box([0.012, 0.012, 0.128], [front, 0.026, 0], chrome), s.box([0.012, 0.012, 0.128], [-front, 0.026, 0], chrome));
      const glow = mix(0.2, 1.4, mood.energy);
      for (const z of [-1, 1]) {
        car.add(s.box([0.006, 0.014, 0.024], [front - 0.003, 0.046, z * 0.042], s.material('#fff4b0', { emissive: '#fff0a0', emissiveIntensity: glow })));
        car.add(s.box([0.006, 0.012, 0.022], [-front + (a.style === 'cadillac' ? -0.004 : 0.002), a.style === 'cadillac' ? 0.078 : 0.052, z * 0.044], s.material('#e01818', { emissive: '#ff1a1a', emissiveIntensity: glow * 0.6 })));
      }
      if (a.style === 'sports') { car.add(s.box([0.09, 0.002, 0.03], [0.1, 0.059, 0], s.material('#f4f1e6'))).rotation.z = 0; const stripe = car.children[car.children.length - 1]; stripe.rotation.z = -0.19; car.add(s.box([0.012, 0.022, 0.12], [-0.14, 0.085, 0], body)); car.add(s.box([0.03, 0.004, 0.125], [-0.14, 0.097, 0], body)); }
      if (a.style === 'cruiser') {
        for (const z of [-1, 1]) car.add(s.box([0.1, 0.04, 0.003], [0.0, 0.048, z * 0.0632], dark));
        car.add(s.box([0.09, 0.003, 0.127], [0.105, 0.0705, 0], dark)); car.add(s.box([0.08, 0.003, 0.127], [-0.105, 0.0745, 0], dark));
      }
      // Cabin: the lid that pops up on a rear hinge.
      const cab: [number, number][] = a.style === 'cadillac' ? [[-0.05, 0], [-0.045, 0.006], [0.03, 0.006], [0.04, 0.03], [0.05, 0.03], [0.062, 0]] : a.style === 'cruiser' ? [[-0.07, 0], [-0.055, 0.034], [0.035, 0.034], [0.06, 0]] : [[-0.065, 0], [-0.03, 0.03], [0.025, 0.03], [0.07, 0]];
      const hingeX = cab[0][0];
      lidGroup.position.set(hingeX, 0.071, 0);
      const cabin = extrude(cab.map(([x, y]) => [x - hingeX, y] as const), 0.112, glass, 0.004);
      lidGroup.add(cabin);
      if (a.style !== 'cadillac') lidGroup.add(s.box([a.style === 'cruiser' ? 0.088 : 0.054, 0.004, 0.106], [(a.style === 'cruiser' ? -0.01 : -0.003) - hingeX, a.style === 'cruiser' ? 0.036 : 0.032, 0], body));
      if (a.style === 'cruiser') {
        lidGroup.add(s.box([0.016, 0.012, 0.04], [-0.01 - hingeX, 0.044, -0.024], s.material('#e01818', { emissive: '#ff1a1a', emissiveIntensity: glow })));
        lidGroup.add(s.box([0.016, 0.012, 0.04], [-0.01 - hingeX, 0.044, 0.024], s.material('#1a4ae0', { emissive: '#2a5aff', emissiveIntensity: glow })));
      }
      if (popped || a.style === 'cadillac') { const cassette = inside(); cassette.position.set(0.0, 0.074, 0); cassette.scale.set(0.78, 1, 0.95); car.add(cassette); }
    }
    car.add(lidGroup);
    if (popped) lidGroup.rotation[a.style === 'plain' ? 'x' : 'z'] = a.style === 'plain' ? -mix(0.7, 1.1, random()) : mix(0.75, 1.15, random());

    // A chewed tape with its ribbon across the counter.
    if (a.spill) {
      const tx = -0.02 + random() * 0.08, tz = 0.15;
      tape(tx, Y + 0.0128, tz, 0.5 + random() * 0.6);
      const ribbon = s.material('#3a2414', { roughness: 0.18, metalness: 0.5 });
      const points: [number, number, number][] = [[tx - 0.02, Y + 0.012, tz - 0.03]];
      let px = tx - 0.06, pz = tz - 0.02;
      const loops = 12 + Math.floor(random() * 8);
      for (let i = 0; i < loops; i++) {
        px += -0.022 + (random() - 0.5) * 0.11; pz += (random() - 0.5) * 0.12;
        px = Math.max(-CW / 2 + 0.03, Math.min(tx + 0.05, px)); pz = Math.max(0.03, Math.min(CD / 2 - 0.02, pz));
        points.push([px, Y + 0.004 + random() * 0.035, pz]);
      }
      const coil = s.tube(points, 0.0045, ribbon);
      coil.scale.y = 1;
    }
    if (tapes.length) {
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.187, 0.025, 0.103), [blackM, blackM, labelM, blackM, spineM, blackM], tapes.length);
      tapes.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, item.tint); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    // Sign on a little acrylic foot.
    if (a.sign !== 'none') {
      const [l1, l2] = SIGN[a.sign];
      const paper = mood.cheer > 0.5 ? '#ffe23a' : '#f4efdc';
      const texture = paint(384, 256, (ctx) => {
        ctx.fillStyle = paper; ctx.fillRect(0, 0, 384, 256);
        ctx.strokeStyle = '#141414'; ctx.lineWidth = 10; ctx.strokeRect(10, 10, 364, 236);
        ctx.fillStyle = '#141414'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `900 ${Math.min(92, 560 / l1.length)}px sans-serif`; ctx.fillText(l1, 192, 88, 340);
        ctx.fillStyle = '#c4161c';
        ctx.font = `900 ${Math.min(92, 560 / l2.length)}px sans-serif`; ctx.fillText(l2, 192, 172, 340);
      });
      const g = new THREE.Group();
      g.position.set(-0.02 + (random() - 0.5) * 0.06, Y, -0.19);
      g.rotation.y = (random() - 0.5) * 0.3;
      g.add(s.box([0.24, 0.16, 0.006], [0, 0.095, -0.012], s.material(paper)));
      const face = s.mesh(new THREE.PlaneGeometry(0.235, 0.155), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5 }), [0, 0.095, -0.0085]);
      g.add(face);
      g.add(s.box([0.2, 0.008, 0.07], [0, 0.004, 0], s.material('#dfe8ea', { roughness: 0.1 })));
      g.children.slice(0, 2).forEach((child) => { child.rotation.x = -0.16; });
      if (mood.wear > 0.75) { g.rotation.z = 0; g.children.slice(0, 2).forEach((child) => { child.rotation.z = 0.06; }); }
      s.root.add(g);
    }

    // What else was left there.
    const ex = 0.33, ez = 0.13 - (mood.density > 0.55 ? 0.27 : 0);
    const exZ = mood.density > 0.55 ? -0.2 : 0.14;
    void ez;
    if (a.extra === 'mug') {
      s.lathe([[0, 0], [0.036, 0], [0.04, 0.01], [0.04, 0.09], [0.035, 0.09], [0.035, 0.012], [0, 0.012]], s.material('#f1eee4', { roughness: 0.3 }), [-0.36, Y, 0.17]);
      s.cylinder(0.0345, 0.0345, 0.002, [-0.36, Y + 0.075, 0.17], s.material('#3a2414', { roughness: 0.15 }), 18);
      const handle = s.ring(0.024, 0.006, [-0.4, Y + 0.05, 0.17], s.material('#f1eee4'), Math.PI);
      handle.rotation.z = Math.PI / 2;
    }
    if (a.extra === 'mints') {
      s.lathe([[0, 0], [0.04, 0], [0.075, 0.035], [0.078, 0.04], [0.07, 0.036], [0.038, 0.008], [0, 0.008]], s.material('#dff0f4', { roughness: 0.1 }), [-0.35, Y, 0.17]);
      s.scatter(new THREE.CylinderGeometry(0.011, 0.011, 0.007, 10), s.material('#ffffff', { roughness: 0.4 }), Array.from({ length: 16 }, () => { const t = random() * 6.3, r = random() * 0.045; return { at: [-0.35 + Math.cos(t) * r, Y + 0.016 + random() * 0.018, 0.17 + Math.sin(t) * r] as [number, number, number], size: 1, color: random() < 0.5 ? '#f4f4f4' : '#e8303a' }; }));
    }
    if (a.extra === 'spike') {
      s.cylinder(0.035, 0.04, 0.012, [-0.36, Y + 0.006, 0.17], dark, 14);
      s.cylinder(0.0015, 0.0015, 0.13, [-0.36, Y + 0.07, 0.17], chrome, 6);
      const slips = 5 + Math.floor(random() * 8);
      for (let i = 0; i < slips; i++) { const slip = s.box([0.06, 0.0012, 0.09], [-0.36 + (random() - 0.5) * 0.008, Y + 0.016 + i * 0.004, 0.17], s.material(i % 3 ? '#f6f2e6' : '#f6c8d0')); slip.rotation.y = random() * 3; slip.rotation.z = (random() - 0.5) * 0.2; }
    }
    if (a.extra === 'jar') {
      const jarGlass = new THREE.MeshPhysicalMaterial({ color: '#eaf6f8', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false });
      s.cylinder(0.04, 0.04, 0.1, [-0.36, Y + 0.05, 0.17], jarGlass, 18);
      s.ring(0.04, 0.003, [-0.36, Y + 0.1, 0.17], chrome).rotation.x = Math.PI / 2;
      s.scatter(new THREE.CylinderGeometry(0.011, 0.011, 0.002, 10), s.material('#c9a23c', { metalness: 0.8, roughness: 0.3 }), Array.from({ length: 7 + Math.floor(random() * 8) }, () => ({ at: [-0.36 + (random() - 0.5) * 0.05, Y + 0.003 + random() * 0.014, 0.17 + (random() - 0.5) * 0.05] as [number, number, number], size: 1, color: random() < 0.6 ? '#c9a23c' : '#c8ccd0' })));
      s.label('TIPS', 0.05, 0.028, [-0.36, Y + 0.055, 0.211], '#141414', '#f6f2e6');
    }
    void ex; void exZ;

    const rate = mix(0, 26, mood.energy) * (popped ? 0.25 : 1);
    return s.finish({ update: rate > 0.5 ? (dt) => { for (const hub of spinners) hub.rotation.y += dt * rate; } : undefined });
  },
});
