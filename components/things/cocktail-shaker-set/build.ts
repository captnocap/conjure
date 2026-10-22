import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Profile = readonly (readonly [number, number])[];

const STYLES = {
  cobbler: 'A three-piece cobbler shaker: straight tin, domed strainer shoulder and a little cap, the home-bar classic.',
  boston: 'A two-piece Boston shaker: a tall tin with a smaller tin jammed in at a tilt, the working bartender\'s tool.',
  parisian: 'A curvy two-piece Parisian shaker with a bullet-shaped lid, elegant and old-world.',
  tiki: 'A tall banded tiki shaker crowned with a pineapple-leaf cap, loud and tropical.',
} as const;

const METALS = {
  steel: 'Bright stainless steel.',
  copper: 'Rosy polished copper.',
  gold: 'Showy yellow gold plate.',
  black: 'Matte gunmetal black.',
} as const;
const METAL_TINT: Record<keyof typeof METALS, string> = { steel: '#cfd5d8', copper: '#c9764a', gold: '#d9b24a', black: '#3a3d42' };

const BODY: Record<keyof typeof STYLES, { body: Profile; top: Profile; cap?: Profile }> = {
  cobbler: {
    body: [[0, 0], [0.037, 0], [0.041, 0.008], [0.046, 0.135], [0.047, 0.142]],
    top: [[0.047, 0], [0.046, 0.012], [0.038, 0.034], [0.025, 0.05], [0.023, 0.062]],
    cap: [[0.025, 0], [0.026, 0.03], [0.021, 0.042], [0, 0.044]],
  },
  boston: {
    body: [[0, 0], [0.034, 0], [0.037, 0.006], [0.047, 0.175]],
    top: [[0.043, 0], [0.033, 0.118], [0.03, 0.124], [0, 0.124]],
  },
  parisian: {
    body: [[0, 0], [0.028, 0], [0.04, 0.02], [0.047, 0.07], [0.047, 0.118], [0.045, 0.126]],
    top: [[0.045, 0], [0.047, 0.006], [0.044, 0.04], [0.032, 0.08], [0.016, 0.1], [0, 0.104]],
  },
  tiki: {
    body: [[0, 0], [0.04, 0], [0.043, 0.01], [0.043, 0.19], [0.045, 0.2]],
    top: [[0.045, 0], [0.044, 0.014], [0.03, 0.04], [0.02, 0.05], [0, 0.052]],
  },
};

const radiusAt = (profile: Profile, y: number) => {
  for (let i = 1; i < profile.length; i++) {
    const [r0, y0] = profile[i - 1], [r1, y1] = profile[i];
    if (y >= y0 && y <= y1 && y1 > y0) return mix(r0, r1, (y - y0) / (y1 - y0));
  }
  return profile[profile.length - 1][0];
};
const topOf = (profile: Profile) => profile[profile.length - 1][1];

export default defineThing({
  questions: {
    style: choice('What style of shaker is it?', STYLES),
    metal: choice('What is the shaker made of?', METALS),
    state: choice('What is the set doing right now?', {
      shaken: 'Just shaken: the shaker stands sealed and ice cold, ready to pour.',
      poured: 'Mid-service: the shaker is open with ice showing, the strainer clamped on top.',
      drying: 'Washed up and left to dry: the pieces apart and upside down on the mat.',
      display: 'Untouched and lined up, polished for show.',
    }),
    frost: score('How much condensation is on the metal?', ['Bone dry and gleaming', 'A light mist', 'Beaded with droplets', 'Frosted white and running wet']),
    debris: choice('What garnish debris is lying around it?', {
      none: 'Nothing: the mat is clean.',
      lemon: 'Curled strips of yellow lemon peel.',
      lime: 'Squeezed green lime wedges.',
      orange: 'Broad swathes of orange peel.',
      mint: 'Bruised mint leaves and a couple of red cherries.',
    }),
    mat: choice('What is the set standing on?', {
      rubber: 'A black ribbed rubber bar mat.',
      towel: 'A folded striped bar towel.',
      board: 'A small wooden cutting board with a paring knife.',
      tray: 'A shallow round steel tray.',
    }),
    extra: choice('What else is out with the shaker, strainer, jigger and spoon?', {
      nothing: 'Only the essentials.',
      muddler: 'A wooden muddler.',
      glass: 'A stemmed coupe glass with a freshly strained drink in it.',
      bitters: 'Two little dasher bottles of bitters.',
      citrus: 'A halved lemon and a hand juicer.',
    }),
    spill: noul('Has something been spilled on the mat?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = new THREE.Color(METAL_TINT[a.metal]);
    const frost = a.state === 'display' ? a.frost * 0.2 : a.state === 'drying' ? a.frost * 0.6 : a.frost;
    const metalParams = (f: number): THREE.MeshStandardMaterialParameters => ({
      color: tint.clone().lerp(new THREE.Color('#eef4f7'), f * 0.55).lerp(new THREE.Color('#77705f'), mood.wear * 0.25),
      metalness: mix(a.metal === 'black' ? 0.6 : 0.95, 0.25, f),
      roughness: mix(a.metal === 'black' ? 0.5 : 0.2, 0.75, f) + mood.wear * 0.15,
      side: THREE.DoubleSide,
    });
    const cold = new THREE.MeshStandardMaterial(metalParams(frost));
    const clean = new THREE.MeshStandardMaterial(metalParams(frost * 0.25));
    const steel = new THREE.MeshStandardMaterial({ color: '#cdd3d6', metalness: 0.9, roughness: 0.25 + mood.wear * 0.2, side: THREE.DoubleSide });
    const wood = s.material('#8a5a34', { roughness: 0.6 });
    const drop = new THREE.MeshStandardMaterial({ color: '#f4fbff', roughness: 0.08, metalness: 0.1 });

    const turned = (profile: Profile, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 36), material);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };
    const group = (at: readonly [number, number, number]) => {
      const g = new THREE.Group();
      g.position.set(...at);
      s.root.add(g);
      return g;
    };
    /** Beads of condensation scattered over a turned surface. */
    const bead = (target: THREE.Object3D, profile: Profile, amount: number, from = 0.1, to = 0.95) => {
      const count = Math.round(amount * amount * 260);
      if (count < 4) return;
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), drop, count);
      const m = new THREE.Matrix4();
      const height = topOf(profile);
      for (let i = 0; i < count; i++) {
        const y = mix(from, to, random()) * height, angle = random() * Math.PI * 2, r = radiusAt(profile, y) + 0.0004;
        const size = mix(0.0009, 0.0026, random() ** 2) * mix(0.8, 1.3, amount);
        m.makeScale(size, size * mix(1, 2.4, random() * amount), size).setPosition(Math.cos(angle) * r, y, Math.sin(angle) * r);
        mesh.setMatrixAt(i, m);
      }
      mesh.castShadow = false;
      target.add(mesh);
    };

    // The mat.
    const matY = { rubber: 0.008, towel: 0.014, board: 0.018, tray: 0.006 }[a.mat];
    if (a.mat === 'rubber') {
      const rubber = s.material('#1d1f22', { roughness: 0.85 });
      s.box([0.46, 0.006, 0.3], [0, 0.003, 0], rubber);
      const ribs = Array.from({ length: 22 }, (_u, i) => ({ at: [-0.21 + i * 0.02, 0.0065, 0] as const, size: 1 }));
      s.scatter(new THREE.BoxGeometry(0.008, 0.004, 0.27), s.material('#2b2e33', { roughness: 0.8 }), ribs);
      for (const z of [-0.143, 0.143]) s.box([0.46, 0.01, 0.014], [0, 0.005, z], rubber);
      for (const x of [-0.223, 0.223]) s.box([0.014, 0.01, 0.3], [x, 0.005, 0], rubber);
    } else if (a.mat === 'towel') {
      const cloth = s.material('#ece6d6', { roughness: 0.95 });
      s.box([0.44, 0.012, 0.28], [0, 0.006, 0], cloth);
      s.box([0.43, 0.004, 0.27], [0.006, 0.013, 0.004], cloth).rotation.y = 0.03;
      const stripe = s.material(mood.cheer > 0.5 ? '#c8463c' : '#3d5d8a', { roughness: 0.95 });
      for (const x of [-0.17, -0.15, 0.16]) s.box([0.008, 0.0045, 0.27], [x, 0.0135, 0.004], stripe);
    } else if (a.mat === 'board') {
      s.box([0.44, 0.018, 0.28], [0, 0.009, 0], wood);
      s.cylinder(0.012, 0.012, 0.02, [0.19, 0.009, -0.11], s.material('#2a1d14'), 12);
    } else {
      s.lathe([[0, 0], [0.22, 0], [0.235, 0.012], [0.238, 0.012], [0.224, 0.004], [0, 0.004]], steel, [0, 0, 0]);
    }

    // The shaker.
    const shape = BODY[a.style];
    const bodyH = topOf(shape.body), topH = topOf(shape.top);
    const dress = (g: THREE.Object3D, upper: THREE.Object3D | null) => {
      if (a.style === 'tiki') {
        const band = new THREE.MeshStandardMaterial({ color: '#a8793a', roughness: 0.6 });
        for (const y of [0.03, 0.036, 0.1, 0.106, 0.17, 0.176]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0435, 0.003, 6, 32), band);
          ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring);
        }
        if (upper) {
          const leaf = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.4 ? '#4f9a4a' : '#6b7d55', roughness: 0.6, side: THREE.DoubleSide });
          for (let i = 0; i < 9; i++) {
            const blade = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.06 + (i % 3) * 0.015, 4), leaf);
            const angle = i * 2.4, lean = 0.2 + (i % 3) * 0.22;
            blade.position.set(Math.sin(angle) * 0.012 * (1 + lean * 2), topH + 0.022, Math.cos(angle) * 0.012 * (1 + lean * 2));
            blade.rotation.set(Math.cos(angle) * lean, 0, -Math.sin(angle) * lean);
            blade.scale.z = 0.35; blade.castShadow = true;
            upper.add(blade);
          }
        }
      }
    };
    const makeBody = () => { const g = new THREE.Group(); g.add(turned(shape.body, cold)); bead(g, shape.body, frost); dress(g, null); return g; };
    const makeTop = () => {
      const g = new THREE.Group();
      g.add(turned(shape.top, a.style === 'boston' ? cold : clean));
      if (a.style === 'boston') bead(g, shape.top, frost * 0.8);
      if (a.style === 'tiki') dress(new THREE.Group(), g);
      return g;
    };
    const makeCap = () => turned(shape.cap!, clean);

    const home: [number, number, number] = [-0.07, matY, -0.03];
    if (a.state === 'shaken' || a.state === 'display') {
      const g = group(home);
      g.add(makeBody());
      const top = makeTop();
      if (a.style === 'boston') {
        // The small tin is driven in upside down, slightly off true.
        top.rotation.set(Math.PI, 0, 0.09);
        top.position.set(0.006, bodyH + topH - 0.045, 0);
      } else top.position.y = bodyH;
      g.add(top);
      if (shape.cap) { const cap = makeCap(); cap.position.y = bodyH + topH - 0.004; g.add(cap); }
      g.rotation.y = random() * 6;
    } else if (a.state === 'poured') {
      const g = group(home);
      g.add(makeBody());
      // Ice heaped in the open mouth.
      const ice = new THREE.MeshStandardMaterial({ color: '#e9f6fb', roughness: 0.15, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 7; i++) {
        const cube = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.022), ice);
        const angle = random() * 6.3, r = random() * 0.022;
        cube.position.set(Math.cos(angle) * r, bodyH - 0.012 + random() * 0.014, Math.sin(angle) * r);
        cube.rotation.set(random() * 3, random() * 3, random() * 3);
        g.add(cube);
      }
      const top = makeTop();
      top.position.set(0.15, 0, 0.09);
      if (a.style === 'boston') top.rotation.y = random() * 6;
      top.rotation.y = random() * 6;
      g.add(top);
      if (shape.cap) { const cap = makeCap(); cap.rotation.x = Math.PI; cap.position.set(0.1, topOf(shape.cap), 0.14); g.add(cap); }
    } else {
      // Drying: everything mouth down and apart.
      const g = group([0, matY, 0]);
      const body = makeBody();
      body.rotation.x = Math.PI; body.position.set(-0.13, bodyH, -0.04);
      g.add(body);
      const top = makeTop();
      if (a.style === 'boston') { top.position.set(-0.02, 0, -0.07); }
      else { top.rotation.x = Math.PI; top.position.set(-0.02, topH, -0.07); }
      g.add(top);
      if (shape.cap) { const cap = makeCap(); cap.rotation.x = Math.PI; cap.position.set(0.05, topOf(shape.cap), -0.02); g.add(cap); }
    }

    // Hawthorne strainer: a perforated plate, a coiled spring and a flat handle.
    const strainer = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.0025, 28), steel);
    plate.castShadow = true;
    strainer.add(plate);
    const holes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.0032, 8), new THREE.MeshStandardMaterial({ color: '#23262a' }), 19);
    const hm = new THREE.Matrix4();
    let hole = 0;
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < [1, 6, 12][ring]; i++) {
      const angle = i / [1, 6, 12][ring] * Math.PI * 2;
      hm.makeTranslation(Math.cos(angle) * ring * 0.011, 0, Math.sin(angle) * ring * 0.011);
      holes.setMatrixAt(hole++, hm);
    }
    strainer.add(holes);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.0045, 6, 40, Math.PI * 1.55), steel);
    coil.rotation.set(Math.PI / 2, 0, Math.PI * 0.72); coil.position.y = -0.005; coil.castShadow = true;
    strainer.add(coil);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.0025, 0.075), steel);
    handle.position.set(0, 0, 0.075); handle.castShadow = true;
    strainer.add(handle);
    for (const x of [-1, 1]) { const ear = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.0025, 0.014), steel); ear.position.set(x * 0.047, 0, -0.012); strainer.add(ear); }
    if (a.state === 'poured') { strainer.position.set(home[0], matY + bodyH + 0.012, home[2]); strainer.rotation.y = 0.5 + random(); }
    else { strainer.position.set(0.075, matY + 0.011, 0.075); strainer.rotation.y = -0.6 + random() * 0.5; }
    s.root.add(strainer);

    // Jigger: two cones joined at the waist.
    const jig = group([0.165, matY, -0.04]);
    const jiggerProfile: Profile = [[0.017, 0], [0.006, 0.036], [0.006, 0.04], [0.021, 0.09]];
    const jigger = turned(jiggerProfile, clean);
    jig.add(jigger);
    if (a.state === 'drying') { jig.rotation.z = Math.PI / 2; jig.position.set(0.17, matY + 0.021, -0.07); jig.rotation.y = random(); }
    else bead(jig, jiggerProfile, frost * 0.4, 0.5, 0.95);

    // Bar spoon: a long twisted stem, a bowl at one end and a teardrop at the other.
    const spoon = group([0.01, matY + 0.004, 0.118]);
    spoon.rotation.y = mix(-0.14, 0.14, random());
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.27, 6), clean);
    stem.rotation.z = Math.PI / 2; stem.castShadow = true;
    spoon.add(stem);
    for (let i = 0; i < 16; i++) {
      const twist = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0056, 0.0026), clean);
      twist.position.x = -0.09 + i * 0.012; twist.rotation.x = i * 0.7;
      spoon.add(twist);
    }
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), clean);
    bowl.scale.set(0.02, 0.004, 0.012); bowl.position.x = 0.15; bowl.castShadow = true;
    const tear = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), clean);
    tear.scale.x = 1.6; tear.position.x = -0.14;
    spoon.add(bowl, tear);

    // The optional extra.
    if (a.extra === 'muddler') {
      const m = group([-0.17, matY + 0.016, 0.075]);
      m.rotation.set(0, 0.4 + random() * 0.4, Math.PI / 2);
      const muddler = turned([[0, 0], [0.016, 0], [0.016, 0.03], [0.011, 0.06], [0.012, 0.17], [0.015, 0.2], [0.012, 0.215], [0, 0.218]], wood);
      muddler.position.y = -0.1;
      m.add(muddler);
    } else if (a.extra === 'glass') {
      const g = group([-0.16, matY, 0.06]);
      const glass = new THREE.MeshPhysicalMaterial({ color: '#e8f3f6', transparent: true, opacity: 0.38, roughness: 0.05, side: THREE.DoubleSide });
      g.add(turned([[0, 0], [0.034, 0], [0.034, 0.003], [0.004, 0.008], [0.004, 0.075], [0.03, 0.09], [0.046, 0.115], [0.047, 0.125]], glass));
      const drink = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.028, 0.026, 24), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(mix(0.95, 0.12, mood.warmth), 0.7, 0.6), roughness: 0.15 }));
      drink.position.y = 0.105;
      g.add(drink);
    } else if (a.extra === 'bitters') {
      for (let i = 0; i < 2; i++) {
        const g = group([-0.19 + i * 0.045, matY, 0.06 + i * 0.03]);
        g.add(turned([[0, 0], [0.017, 0], [0.018, 0.06], [0.008, 0.075], [0.007, 0.1]], new THREE.MeshStandardMaterial({ color: i ? '#5a2a1c' : '#2b3a26', roughness: 0.2 })));
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.016, 12), new THREE.MeshStandardMaterial({ color: i ? '#e3c95a' : '#c23b30' }));
        cap.position.y = 0.106; g.add(cap);
        const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.0185, 0.04, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#efe6c8', roughness: 0.9 }));
        paper.position.y = 0.035; g.add(paper);
      }
    } else if (a.extra === 'citrus') {
      const rind = new THREE.MeshStandardMaterial({ color: '#f0cf3a', roughness: 0.55 });
      const flesh = new THREE.MeshStandardMaterial({ color: '#f6eaa0', roughness: 0.4 });
      for (let i = 0; i < 2; i++) {
        const g = group([-0.19 + i * 0.06, matY, 0.05 + i * 0.045]);
        const half = new THREE.Mesh(new THREE.SphereGeometry(0.028, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), rind);
        half.scale.y = 1.15; half.castShadow = true;
        if (i) { half.rotation.x = Math.PI * 0.62; half.position.y = 0.024; }
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.026, 18), flesh);
        face.rotation.x = Math.PI / 2; face.position.y = -0.0004;
        half.add(face);
        g.add(half);
      }
    }

    // Garnish debris, more of it when the scene is busy.
    const scraps = a.debris === 'none' ? 0 : Math.round(mix(2, 8, mood.density) + random() * 2);
    const spot = (): [number, number] => {
      for (let tries = 0; tries < 20; tries++) {
        const x = mix(-0.2, 0.21, random()), z = mix(-0.12, 0.13, random());
        if (Math.hypot(x - home[0], z - home[2]) > 0.065 && Math.abs(z - 0.118) > 0.02) return [x, z];
      }
      return [0.2, 0.12];
    };
    for (let i = 0; i < scraps; i++) {
      const [x, z] = i < scraps - 2 ? spot() : [mix(-0.22, 0.22, random()), 0.165 + random() * 0.02];
      const y = i < scraps - 2 ? matY : 0;
      if (a.debris === 'lemon' || a.debris === 'orange') {
        const wide = a.debris === 'orange';
        const peel = new THREE.MeshStandardMaterial({ color: wide ? '#ef8a2a' : '#f2d23c', roughness: 0.6, side: THREE.DoubleSide });
        const turns = wide ? 0.35 : mix(0.8, 1.6, random()), r = wide ? 0.03 : 0.011;
        const points = Array.from({ length: 12 }, (_u, k) => {
          const t = k / 11 * turns * Math.PI * 2;
          return new THREE.Vector3(Math.cos(t) * r, r + Math.sin(t) * r * (wide ? 0.25 : 1), k * (wide ? 0.004 : 0.0035));
        });
        const curl = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, wide ? 0.009 : 0.004, 5), peel);
        curl.scale.y = wide ? 0.35 : 1;
        curl.position.set(x, y, z); curl.rotation.y = random() * 6; curl.castShadow = true;
        s.root.add(curl);
      } else if (a.debris === 'lime') {
        const wedge = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: '#5f9e2f', roughness: 0.6, side: THREE.DoubleSide }));
        wedge.scale.set(1, 1.25, 1); wedge.rotation.set(Math.PI / 2, 0, random() * 6); wedge.position.set(x, y + 0.008, z); wedge.castShadow = true;
        const pulp = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 6, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: '#d5e68a', roughness: 0.4, side: THREE.DoubleSide }));
        wedge.add(pulp);
        s.root.add(wedge);
      } else if (i % 4 === 3) {
        s.ball([0.011, 0.011, 0.011], [x, y + 0.011, z], new THREE.MeshStandardMaterial({ color: '#b01f2e', roughness: 0.2 }), 12);
        s.rod([x, y + 0.02, z], [x + 0.012, y + 0.05, z + 0.006], 0.0008, new THREE.MeshStandardMaterial({ color: '#5a3b22' }));
      } else {
        const leaf = s.ball([0.014, 0.0025, 0.009], [x, y + 0.003, z], new THREE.MeshStandardMaterial({ color: i % 2 ? '#3f8f3f' : '#5aa54c', roughness: 0.7 }), 10);
        leaf.rotation.set(random() * 0.5, random() * 6, random() * 0.5);
      }
    }

    if (a.spill) {
      const wet = new THREE.MeshStandardMaterial({ color: a.mat === 'towel' ? '#c9b98f' : '#f1e3b0', roughness: 0.05, transparent: true, opacity: 0.7 });
      const [px, pz] = [0.1 + random() * 0.06, 0.02 + random() * 0.05];
      for (let i = 0; i < 5; i++) {
        const blot = s.cylinder(1, 1, 0.0016, [px + (random() - 0.5) * 0.07, matY + 0.001 + i * 0.0002, pz + (random() - 0.5) * 0.05], wet, 18);
        blot.scale.set(0.018 + random() * 0.03, 1, 0.014 + random() * 0.022);
        blot.castShadow = false;
      }
    }

    return s.finish();
  },
});
