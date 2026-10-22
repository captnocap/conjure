import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const PAINT = { red: '#d3312b', blue: '#2a63c4', yellow: '#efc21c', pink: '#ee6fa8', mint: '#58c9a8' } as const;
const PRICE = { quarter: '25¢', fifty: '50¢', two: '2 RIDES $1', dollar: '$1.00' } as const;
type P3 = readonly [number, number, number];

export default defineThing({
  questions: {
    figure: choice('What is the ride?', {
      rocket: 'A stubby space rocket with fins and a cockpit seat.',
      horse: 'A galloping carousel-style horse with a saddle.',
      racecar: 'A little open-wheel race car with a big number.',
      elephant: 'A round smiling elephant with a raised trunk.',
      saucer: 'A flying saucer with a bubble dome and a ring of lights.',
    }),
    paint: choice('What is its main paint colour?', {
      red: 'Fire-engine red.',
      blue: 'Royal blue.',
      yellow: 'School-bus yellow.',
      pink: 'Bubblegum pink.',
      mint: 'Mint green, very 1980s.',
    }),
    base: choice('What does it rock on?', {
      box: 'A plain boxy steel cabinet with a rubber bellows.',
      rocker: 'Two curved rocker rails like a rocking horse.',
      spring: 'One fat coil spring on a round plate.',
      pedestal: 'A moulded fibreglass pedestal shaped like a cloud or wave.',
    }),
    coinbox: choice('What state is the coin box in?', {
      blinking: 'Working, its little light still blinking for customers.',
      pried: 'Pried open, the door hanging and the cash tray gone.',
      bagged: 'Bagged in plastic with an OUT OF ORDER note taped on.',
      unplugged: 'Intact but unplugged, the cord trailing across the ground.',
    }),
    price: choice('What does a ride cost?', {
      quarter: '25 cents, an old price.',
      fifty: '50 cents.',
      two: 'Two rides for a dollar.',
      dollar: 'One dollar, the last price it ever had.',
    }),
    left: choice('What has been left on the seat?', {
      nothing: 'Nothing. An empty seat.',
      bear: 'A forgotten stuffed bear, sitting upright.',
      cup: 'A fast-food cup with a straw.',
      leaves: 'Dead leaves and a bird nest.',
      balloon: 'A half-deflated balloon tied to the handle.',
    }),
    running: noul('Is it rocking by itself right now, with nobody on it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const faded = (hex: string, amount = 0.5) => new THREE.Color(hex).lerp(new THREE.Color('#e9dfd0'), wear * amount);
    const main = s.material(faded(PAINT[a.paint]), { roughness: mix(0.25, 0.75, wear), metalness: 0.05 });
    const cream = s.material(faded('#f4efe0', 0.2), { roughness: 0.5 });
    const accentHex = { red: '#f2c22a', blue: '#f2f0e8', yellow: '#d3312b', pink: '#7ad0e8', mint: '#ee6fa8' }[a.paint];
    const accent = s.material(faded(accentHex), { roughness: 0.4 });
    const dark = s.material('#202326', { roughness: 0.8 });
    const steel = s.material(new THREE.Color('#aeb4b6').lerp(new THREE.Color('#8a5a3c'), wear * 0.4), { metalness: 0.6, roughness: 0.4 });
    const rubber = s.material('#2b2b2d', { roughness: 0.95 });

    // --- Base -------------------------------------------------------------------------
    let pivotY = 0.52;
    if (a.base === 'box') {
      s.box([1.25, 0.34, 0.7], [0, 0.19, 0], cream);
      s.box([1.29, 0.04, 0.74], [0, 0.02, 0], dark);
      s.box([1.27, 0.03, 0.72], [0, 0.365, 0], steel);
      for (let i = 0; i < 4; i++) s.cylinder(0.17 - (i % 2) * 0.03, 0.17 - (i % 2) * 0.03, 0.035, [0, 0.395 + i * 0.035, 0], rubber, 18);
      s.box([0.5, 0.2, 0.01], [-0.25, 0.2, 0.352], main);
    } else if (a.base === 'rocker') {
      for (const z of [-0.3, 0.3]) {
        const pts: P3[] = [];
        for (let k = 0; k <= 12; k++) { const t = (k / 12 - 0.5) * 1.5; pts.push([Math.sin(t) * 1.0, 0.045 + (1 - Math.cos(t)) * 0.9, z]); }
        s.tube(pts, 0.04, main);
      }
      for (const x of [-0.5, 0, 0.5]) s.rod([x, 0.045 + (1 - Math.cos(x * 0.75)) * 0.9, -0.3], [x, 0.045 + (1 - Math.cos(x * 0.75)) * 0.9, 0.3], 0.03, steel);
      s.box([0.9, 0.06, 0.6], [0, 0.3, 0], cream);
      s.box([0.16, 0.24, 0.16], [0, 0.42, 0], steel);
      pivotY = 0.5;
    } else if (a.base === 'spring') {
      s.cylinder(0.5, 0.55, 0.06, [0, 0.03, 0], steel, 28);
      const coil: P3[] = [];
      for (let k = 0; k <= 60; k++) { const t = k / 60; coil.push([Math.cos(t * Math.PI * 9) * 0.15, 0.07 + t * 0.44, Math.sin(t * Math.PI * 9) * 0.15]); }
      s.tube(coil, 0.028, dark);
      s.cylinder(0.2, 0.2, 0.04, [0, 0.52, 0], steel, 18);
      pivotY = 0.54;
    } else {
      s.lathe([[0, 0], [0.62, 0], [0.66, 0.08], [0.5, 0.16], [0.56, 0.26], [0.36, 0.34], [0.4, 0.42], [0.2, 0.5], [0, 0.5]], cream);
      for (let k = 0; k < 7; k++) { const t = (k / 7) * Math.PI * 2 + random(); s.ball([0.16, 0.12, 0.16], [Math.cos(t) * 0.52, 0.1 + random() * 0.08, Math.sin(t) * 0.52], cream, 12); }
      pivotY = 0.5;
    }

    // --- Figure, built around the pivot -----------------------------------------------
    const fig = new THREE.Group();
    fig.position.set(0, pivotY, 0);
    s.root.add(fig);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, at: P3 = [0, 0, 0], rot: P3 = [0, 0, 0], scale: P3 = [1, 1, 1]) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...at); m.rotation.set(...rot); m.scale.set(...scale);
      m.castShadow = m.receiveShadow = true;
      fig.add(m);
      return m;
    };
    const ball = (size: P3, at: P3, mat: THREE.Material, rot: P3 = [0, 0, 0]) => add(new THREE.SphereGeometry(1, 20, 14), mat, at, rot, size);
    const rod = (from: P3, to: P3, r: number, mat: THREE.Material, r2 = r) => {
      const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), d = B.clone().sub(A);
      const m = add(new THREE.CylinderGeometry(r2, r, d.length(), 10), mat, A.clone().add(B).multiplyScalar(0.5).toArray() as [number, number, number]);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return m;
    };
    let seat: P3 = [0, 0.6, 0];
    let handle: P3 = [0.3, 0.8, 0];
    const glowers: THREE.MeshStandardMaterial[] = [];

    if (a.figure === 'rocket') {
      const body = new THREE.LatheGeometry([[0, -0.62], [0.13, -0.62], [0.22, -0.45], [0.28, -0.12], [0.28, 0.18], [0.21, 0.48], [0.1, 0.7], [0, 0.78]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
      body.rotateZ(-Math.PI / 2);
      add(body, main, [0, 0.36, 0]);
      add(new THREE.ConeGeometry(0.125, 0.3, 20).rotateZ(-Math.PI / 2), accent, [0.68, 0.36, 0]);
      for (const x of [0.3, -0.36]) add(new THREE.TorusGeometry(x > 0 ? 0.262 : 0.25, 0.022, 8, 28).rotateY(Math.PI / 2), cream, [x, 0.36, 0]);
      const fin = new THREE.Shape();
      fin.moveTo(0, 0); fin.lineTo(-0.42, 0.34); fin.lineTo(-0.5, 0.34); fin.lineTo(-0.36, 0); fin.lineTo(0, 0);
      const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.04, bevelEnabled: false }).translate(0, 0, -0.02);
      add(finGeo, accent, [-0.2, 0.6, 0]);
      add(finGeo, accent, [-0.2, 0.3, 0.2], [1.95, 0, 0]);
      add(finGeo, accent, [-0.2, 0.3, -0.2], [-1.95, 0, 0]);
      add(new THREE.CylinderGeometry(0.1, 0.14, 0.14, 16).rotateZ(Math.PI / 2), dark, [-0.66, 0.36, 0]);
      // Cockpit.
      add(new THREE.BoxGeometry(0.44, 0.1, 0.3), dark, [-0.06, 0.62, 0]);
      add(new THREE.BoxGeometry(0.06, 0.26, 0.3), main, [-0.3, 0.72, 0]);
      add(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#bfe6f2', transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false }), [0.26, 0.58, 0], [0, 0, -0.35], [1, 1, 0.8]).castShadow = false;
      for (const z of [-0.285, 0.285]) for (const x of [-0.05, 0.14]) add(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 14).rotateX(Math.PI / 2), cream, [x, 0.36, z]);
      rod([0.12, 0.62, -0.17], [0.12, 0.76, -0.17], 0.015, steel); rod([0.12, 0.62, 0.17], [0.12, 0.76, 0.17], 0.015, steel); rod([0.12, 0.76, -0.19], [0.12, 0.76, 0.19], 0.018, steel);
      if (a.running) {
        const flame = new THREE.MeshStandardMaterial({ color: '#ff9a2a', emissive: '#ff7a10', emissiveIntensity: 1.2 });
        glowers.push(flame);
        add(new THREE.ConeGeometry(0.09, 0.3, 12).rotateZ(Math.PI / 2), flame, [-0.86, 0.36, 0]);
      }
      seat = [-0.06, 0.67, 0]; handle = [0.12, 0.76, 0.19];
    } else if (a.figure === 'horse') {
      const coat = s.material(faded({ red: '#f4efe0', blue: '#f4efe0', yellow: '#8a5a34', pink: '#f4efe0', mint: '#3a3230' }[a.paint], 0.3), { roughness: mix(0.3, 0.7, wear) });
      const hair = s.material(faded({ red: '#3a2a22', blue: '#d9b23a', yellow: '#2a2220', pink: '#f08ab8', mint: '#e8e2d4' }[a.paint], 0.3), { roughness: 0.8 });
      ball([0.43, 0.25, 0.2], [0, 0.42, 0], coat);
      rod([0.28, 0.46, 0], [0.5, 0.86, 0], 0.15, coat, 0.1);
      ball([0.21, 0.115, 0.105], [0.6, 0.9, 0], coat, [0, 0, -0.55]);
      ball([0.085, 0.075, 0.085], [0.74, 0.8, 0], coat);
      for (const z of [-0.06, 0.06]) add(new THREE.ConeGeometry(0.035, 0.11, 8), coat, [0.5, 1.04, z], [0, 0, 0.2]);
      for (const z of [-0.095, 0.095]) ball([0.022, 0.022, 0.012], [0.63, 0.94, z], dark);
      for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(0.1, 0.12, 0.05), hair, [0.29 + k * 0.04, 0.6 + k * 0.075, 0], [0, 0, -0.5 + k * 0.05]);
      const leg = (hip: P3, knee: P3, hoof: P3) => { rod(hip, knee, 0.075, coat, 0.05); rod(knee, hoof, 0.05, coat, 0.04); ball([0.055, 0.04, 0.05], hoof, dark); };
      for (const z of [-0.11, 0.11]) {
        leg([0.3, 0.34, z], [0.52, 0.18 + (z > 0 ? 0.06 : 0), z], [0.72 - (z > 0 ? 0.1 : 0), 0.06 + (z > 0 ? 0.1 : 0), z]);
        leg([-0.3, 0.36, z], [-0.5, 0.2, z], [-0.74 + (z > 0 ? 0.08 : 0), 0.06, z]);
      }
      const tail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.4, 0.5, 0], [-0.58, 0.6, 0], [-0.72, 0.46, 0], [-0.76, 0.24, 0]].map((p) => new THREE.Vector3(...p))), 16, 0.045, 8);
      add(tail, hair);
      ball([0.2, 0.07, 0.215], [-0.03, 0.63, 0], main);
      ball([0.26, 0.03, 0.225], [-0.03, 0.58, 0], accent);
      add(new THREE.TorusGeometry(0.21, 0.018, 6, 24).rotateY(Math.PI / 2), main, [0.3, 0.44, 0], [0, 0, 0], [1, 1.15, 1]);
      rod([0.47, 0.82, -0.24], [0.47, 0.82, 0.24], 0.018, steel);
      for (const z of [-0.23, 0.23]) { rod([-0.02, 0.55, z * 0.9], [-0.02, 0.26, z], 0.008, dark); add(new THREE.TorusGeometry(0.045, 0.01, 6, 12), steel, [-0.02, 0.22, z]); }
      // The pole a carousel horse never lost.
      rod([0.08, 0.5, 0], [0.08, 1.25, 0], 0.016, s.material('#d6b354', { metalness: 0.8, roughness: 0.3 }));
      seat = [-0.03, 0.7, 0]; handle = [0.47, 0.82, 0.24];
    } else if (a.figure === 'racecar') {
      const side = new THREE.Shape();
      const pts: [number, number][] = [[-0.66, 0.12], [0.74, 0.12], [0.8, 0.2], [0.42, 0.33], [0.2, 0.42], [0.1, 0.42], [0.02, 0.3], [-0.3, 0.3], [-0.36, 0.56], [-0.48, 0.58], [-0.62, 0.42], [-0.7, 0.3]];
      side.moveTo(...pts[0]);
      for (const p of pts.slice(1)) side.lineTo(...p);
      side.closePath();
      const bodyGeo = new THREE.ExtrudeGeometry(side, { depth: 0.4, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }).translate(0, 0, -0.2);
      add(bodyGeo, main);
      add(new THREE.BoxGeometry(0.72, 0.012, 0.1), cream, [0.42, 0.275, 0], [0, 0, -0.33]);
      for (const x of [0.46, -0.44]) for (const z of [-0.32, 0.32]) {
        add(new THREE.CylinderGeometry(0.17, 0.17, 0.13, 20).rotateX(Math.PI / 2), rubber, [x, 0.16, z]);
        add(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 12).rotateX(Math.PI / 2), accent, [x, 0.16, z]);
        rod([x, 0.2, z * 0.6], [x, 0.16, z], 0.02, steel);
      }
      add(new THREE.BoxGeometry(0.2, 0.03, 0.62), accent, [-0.66, 0.74, 0]);
      for (const z of [-0.18, 0.18]) { rod([-0.6, 0.45, z], [-0.66, 0.73, z], 0.015, steel); add(new THREE.BoxGeometry(0.2, 0.12, 0.02), accent, [-0.66, 0.7, z * 1.7]); }
      add(new THREE.TorusGeometry(0.09, 0.016, 8, 18), dark, [0.1, 0.5, 0], [0, Math.PI / 2 - 0.5, 0]);
      rod([0.2, 0.4, 0], [0.11, 0.5, 0], 0.012, steel);
      const number = String(1 + Math.floor(random() * 9));
      for (const z of [-0.236, 0.236]) {
        add(new THREE.CylinderGeometry(0.12, 0.12, 0.012, 20).rotateX(Math.PI / 2), cream, [-0.5, 0.36, z]);
        const digit = s.label(number, 0.16, 0.16, [0, 0, 0], '#202326', '#f4efe0');
        s.root.remove(digit); fig.add(digit);
        digit.position.set(-0.5, 0.36, z + Math.sign(z) * 0.008);
        if (z < 0) digit.rotation.y = Math.PI;
      }
      add(new THREE.SphereGeometry(0.18, 16, 8, 0, Math.PI, 0, Math.PI / 2).rotateY(Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#bfe6f2', transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }), [0.2, 0.4, 0]).castShadow = false;
      seat = [-0.16, 0.36, 0]; handle = [0.1, 0.59, 0];
    } else if (a.figure === 'elephant') {
      const hide = s.material(faded(a.paint === 'pink' ? '#f3a6c8' : '#9fb4c9', 0.35), { roughness: mix(0.3, 0.7, wear) });
      const pinkIn = s.material(faded('#f3b6c4', 0.3), { roughness: 0.6 });
      ball([0.44, 0.37, 0.31], [-0.08, 0.42, 0], hide);
      ball([0.27, 0.27, 0.25], [0.4, 0.62, 0], hide);
      for (const z of [-1, 1]) {
        ball([0.05, 0.27, 0.2], [0.33, 0.68, z * 0.32], hide, [0.25 * z, -0.5 * z, 0]);
        ball([0.03, 0.2, 0.14], [0.36, 0.68, z * 0.335], pinkIn, [0.25 * z, -0.5 * z, 0]);
        ball([0.05, 0.055, 0.03], [0.58, 0.72, z * 0.13], cream);
        ball([0.024, 0.028, 0.016], [0.605, 0.72, z * 0.15], dark);
        rod([0.56, 0.5, z * 0.11], [0.7, 0.44, z * 0.13], 0.03, cream, 0.01);
        for (const x of [0.16, -0.3]) add(new THREE.CylinderGeometry(0.115, 0.125, 0.3, 16), hide, [x, 0.13, z * 0.17]);
        for (const x of [0.16, -0.3]) for (let t = -1; t <= 1; t++) ball([0.03, 0.025, 0.02], [x + 0.1, 0.02, z * 0.17 + t * 0.06], cream);
      }
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.6, 0.6, 0], [0.8, 0.44, 0], [0.96, 0.5, 0], [0.98, 0.72, 0], [0.9, 0.86, 0]].map((p) => new THREE.Vector3(...p))), 24, 0.065, 10), hide);
      add(new THREE.TorusGeometry(0.1, 0.02, 6, 16, Math.PI).rotateX(Math.PI), dark, [0.57, 0.5, 0], [0, Math.PI / 2, 0], [1, 0.7, 1]);
      ball([0.3, 0.1, 0.325], [-0.08, 0.72, 0], main);
      ball([0.33, 0.05, 0.335], [-0.08, 0.66, 0], accent);
      add(new THREE.BoxGeometry(0.26, 0.05, 0.3), dark, [-0.1, 0.82, 0]);
      rod([0.22, 0.8, -0.2], [0.22, 0.95, -0.2], 0.015, steel); rod([0.22, 0.8, 0.2], [0.22, 0.95, 0.2], 0.015, steel); rod([0.22, 0.95, -0.22], [0.22, 0.95, 0.22], 0.018, steel);
      rod([-0.5, 0.46, 0], [-0.62, 0.3, 0], 0.02, hide, 0.01);
      ball([0.14, 0.05, 0.14], [0.4, 0.9, 0], main);
      seat = [-0.1, 0.85, 0]; handle = [0.22, 0.95, 0.22];
    } else {
      add(new THREE.LatheGeometry([[0, 0.02], [0.3, 0.02], [0.66, 0.2], [0.76, 0.27], [0.66, 0.34], [0.36, 0.44], [0, 0.44]].map(([x, y]) => new THREE.Vector2(x, y)), 36), main);
      add(new THREE.TorusGeometry(0.75, 0.03, 8, 40).rotateX(Math.PI / 2), steel, [0, 0.27, 0]);
      const lampOn = new THREE.MeshStandardMaterial({ color: '#fff0b0', emissive: '#ffd24a', emissiveIntensity: a.coinbox === 'blinking' || a.running ? 1.2 : 0.05 });
      glowers.push(lampOn);
      for (let k = 0; k < 12; k++) { const t = (k / 12) * Math.PI * 2; ball([0.05, 0.05, 0.05], [Math.cos(t) * 0.58, 0.37, Math.sin(t) * 0.58], k % 2 ? lampOn : accent); }
      add(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 24), dark, [0, 0.46, 0]);
      add(new THREE.SphereGeometry(0.36, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#c6ecf4', transparent: true, opacity: 0.35, roughness: 0.08, depthWrite: false }), [0, 0.44, -0.04], [0, 0, 0], [1, 1, 0.9]).castShadow = false;
      rod([0, 0.44, -0.3], [0, 1.02, -0.36], 0.012, steel); ball([0.035, 0.035, 0.035], [0, 1.03, -0.36], accent);
      rod([0.2, 0.46, 0.18], [0.2, 0.6, 0.18], 0.015, steel); rod([-0.2, 0.46, 0.18], [-0.2, 0.6, 0.18], 0.015, steel); rod([-0.22, 0.6, 0.18], [0.22, 0.6, 0.18], 0.018, steel);
      for (let k = 0; k < 3; k++) { const t = (k / 3) * Math.PI * 2 + 0.5; ball([0.1, 0.06, 0.1], [Math.cos(t) * 0.36, 0.03, Math.sin(t) * 0.36], accent); }
      seat = [0, 0.5, -0.04]; handle = [0.22, 0.6, 0.18];
    }

    // Paint chips and sun-bleach patches on the figure as it wears.
    const chips = Math.round(mix(0, 26, wear));
    if (chips) {
      const box = new THREE.Box3().setFromObject(fig);
      const size = box.getSize(new THREE.Vector3());
      const chip = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), s.material('#e9e2d2', { roughness: 0.9 }), chips);
      const m = new THREE.Matrix4();
      for (let k = 0; k < chips; k++) {
        const r = mix(0.012, 0.04, random());
        m.makeScale(r, r * 0.6, r).setPosition((random() - 0.5) * size.x * 0.7, mix(0.25, 0.6, random()), (random() < 0.5 ? -1 : 1) * size.z * mix(0.3, 0.42, random()));
        chip.setMatrixAt(k, m);
      }
      fig.add(chip);
    }

    // What was left behind.
    if (a.left === 'bear') {
      const fur = s.material('#a8753f', { roughness: 1 });
      const [x, y, z] = seat;
      ball([0.09, 0.1, 0.08], [x, y + 0.09, z], fur); ball([0.07, 0.065, 0.065], [x + 0.01, y + 0.24, z], fur);
      for (const dz of [-0.05, 0.05]) { ball([0.025, 0.025, 0.015], [x, y + 0.3, z + dz], fur); ball([0.03, 0.03, 0.05], [x + 0.06, y + 0.04, z + dz * 1.4], fur); ball([0.028, 0.05, 0.028], [x + 0.03, y + 0.13, z + dz * 2], fur, [dz * 9, 0, 0]); }
      ball([0.03, 0.025, 0.03], [x + 0.07, y + 0.23, z], s.material('#e3c9a0')); ball([0.01, 0.01, 0.01], [x + 0.1, y + 0.235, z], dark);
    } else if (a.left === 'cup') {
      const [x, y, z] = seat;
      add(new THREE.CylinderGeometry(0.045, 0.033, 0.14, 14), s.material('#f1f0ea'), [x + 0.03, y + 0.07, z + 0.04]);
      add(new THREE.CylinderGeometry(0.047, 0.047, 0.012, 14), s.material('#d3312b'), [x + 0.03, y + 0.145, z + 0.04]);
      rod([x + 0.03, y + 0.14, z + 0.04], [x + 0.06, y + 0.25, z + 0.05], 0.005, s.material('#d3312b'));
    } else if (a.left === 'leaves') {
      const [x, y, z] = seat;
      add(new THREE.TorusGeometry(0.08, 0.035, 6, 14).rotateX(Math.PI / 2), s.material('#7a6344', { roughness: 1 }), [x, y + 0.03, z]);
      for (let k = 0; k < 3; k++) ball([0.022, 0.028, 0.022], [x + (k - 1) * 0.03, y + 0.045, z + (k % 2) * 0.03 - 0.01], s.material('#d5e6e4'));
      const hues = ['#8a5a2b', '#a8702f', '#b98a3a'];
      for (let k = 0; k < 9; k++) add(new THREE.TetrahedronGeometry(0.04), s.material(hues[k % 3], { roughness: 1 }), [x + (random() - 0.5) * 0.4, y + 0.01, z + (random() - 0.5) * 0.3], [random() * 3, random() * 3, 0], [1.3, 0.25, 1]);
    } else if (a.left === 'balloon') {
      const [x, y, z] = handle;
      const limp = mix(0.2, 0.9, wear);
      const top: P3 = [x + 0.1, y + mix(0.75, 0.12, limp), z + 0.12];
      rod([x, y, z], top, 0.003, cream);
      ball([0.14 * mix(1, 0.6, limp), 0.17 * mix(1, 0.5, limp), 0.14 * mix(1, 0.6, limp)], [top[0], top[1] + 0.15 * mix(1, 0.5, limp), top[2]], s.material(['#e83a5a', '#f2c22a', '#4ab0e8', '#c0c4c8'][Math.floor(random() * 4)], { roughness: 0.25, metalness: 0.2 }));
    }

    // --- Coin box on its post ----------------------------------------------------------
    const cx = a.figure === 'saucer' ? 0.92 : 0.72, cz = a.figure === 'saucer' ? 0.3 : 0.52;
    s.cylinder(0.035, 0.035, 0.85, [cx, 0.425, cz], steel, 10);
    s.cylinder(0.12, 0.14, 0.03, [cx, 0.015, cz], steel, 14);
    s.box([0.24, 0.36, 0.17], [cx, 0.98, cz], main);
    s.box([0.26, 0.03, 0.19], [cx, 1.17, cz], steel);
    s.label(PRICE[a.price], 0.2, 0.09, [cx, 1.09, cz + 0.087], '#ffffff', '#202326');
    s.box([0.012, 0.05, 0.01], [cx + 0.05, 0.98, cz + 0.087], dark);
    s.cylinder(0.022, 0.022, 0.012, [cx + 0.05, 0.9, cz + 0.088], steel, 10).rotation.x = Math.PI / 2;
    // A little topper sign.
    const topper = s.label('RIDE ME', 0.34, 0.12, [cx, 1.27, cz], accentHex === '#f2f0e8' ? '#2a63c4' : '#202326', '#f4efe0');
    topper.rotation.z = (random() - 0.5) * mix(0, 0.3, wear);
    const lamp = new THREE.MeshStandardMaterial({ color: '#ff5340', emissive: '#ff2a18', emissiveIntensity: a.coinbox === 'blinking' ? 1.3 : 0 });
    s.ball([0.022, 0.022, 0.022], [cx - 0.06, 0.98, cz + 0.09], lamp, 10);
    if (a.coinbox === 'pried') {
      s.box([0.16, 0.14, 0.01], [cx - 0.02, 0.9, cz + 0.088], dark);
      const door = s.box([0.16, 0.14, 0.012], [cx - 0.14, 0.86, cz + 0.15], steel);
      door.rotation.set(0.2, -1.1, 0.25);
      const coin = new THREE.CylinderGeometry(0.014, 0.014, 0.003, 10);
      s.scatter(coin, s.material('#c9cdd0', { metalness: 0.9, roughness: 0.3 }), Array.from({ length: 5 }, () => ({ at: [cx + (random() - 0.5) * 0.4, 0.002, cz + 0.1 + random() * 0.3] as const, size: 1 })));
      s.rod([cx + 0.1, 0.86, cz + 0.1], [cx + 0.2, 0.75, cz + 0.2], 0.008, dark);
    } else if (a.coinbox === 'bagged') {
      const bagGeo = new THREE.BoxGeometry(0.3, 0.46, 0.23, 4, 5, 3);
      const p = bagGeo.attributes.position;
      for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (1 + Math.sin(p.getY(k) * 31 + k) * 0.05), p.getY(k), p.getZ(k) * (1 + Math.cos(p.getY(k) * 23 + k) * 0.06));
      bagGeo.computeVertexNormals();
      s.mesh(bagGeo, new THREE.MeshStandardMaterial({ color: '#d9dde0', roughness: 0.3, transparent: true, opacity: 0.8, flatShading: true }), [cx, 1.0, cz]);
      s.box([0.31, 0.03, 0.24], [cx, 0.86, cz], s.material('#b9a36a'));
      s.label('OUT OF ORDER', 0.24, 0.09, [cx, 1.0, cz + 0.125], '#202326', '#f6f3e6').rotation.z = (random() - 0.5) * 0.25;
    } else if (a.coinbox === 'unplugged') {
      const end: P3 = [cx - 0.5 - random() * 0.4, 0.012, cz + 0.5 + random() * 0.3];
      s.tube([[cx, 0.12, cz + 0.03], [cx + 0.05, 0.015, cz + 0.2], [cx - 0.2, 0.012, cz + 0.42], [cx - 0.3, 0.012, cz + 0.25], end], 0.01, dark);
      s.box([0.05, 0.025, 0.035], end, dark);
    }

    // Idle tilt, or the lonely rocking.
    const rest = a.running ? 0 : (random() - 0.5) * mix(0.04, 0.2, wear);
    fig.rotation.z = rest;
    const speed = mix(1.2, 4.2, mood.energy), swing = a.base === 'spring' ? 0.13 : 0.09;
    return s.finish({
      update: (_dt, time) => {
        if (a.running) {
          fig.rotation.z = Math.sin(time * speed) * swing;
          if (a.base === 'spring') fig.rotation.x = Math.sin(time * speed * 0.7) * 0.05;
        }
        if (a.coinbox === 'blinking') lamp.emissiveIntensity = Math.sin(time * 4) > 0 ? 1.4 : 0.1;
        for (const g of glowers) g.emissiveIntensity = (a.running || a.coinbox === 'blinking') ? 0.9 + Math.sin(time * 9) * 0.4 : g.emissiveIntensity;
      },
    });
  },
});
