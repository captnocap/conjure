import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix } from '@conjure/kit';

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};
const flat = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);
const Y = new THREE.Vector3(0, 1, 0);
const bar = (a: THREE.Vector3, b: THREE.Vector3, w: number, d: number) => {
  const dir = b.clone().sub(a), len = dir.length();
  return new THREE.BoxGeometry(w, len, d).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize())).translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
};

const LIVERY = {
  yellow: '#f2c21a', cream: '#ece0bd', redwhite: '#b8202a', black: '#18191b',
} as const;
const W = 1.86, HW = W / 2, WB = 1.55, TYRE = 0.36, BELT = 1.02, ROOF = 1.6;

export default defineThing({
  questions: {
    livery: choice('What livery is it painted in?', {
      yellow: 'Taxi yellow, the classic New York cab.',
      cream: 'Cream, like a private Checker or an old fleet colour.',
      redwhite: 'Red body with a white roof, an old fleet two-tone.',
      black: 'Gloss black, a private car service Checker.',
    }),
    state: choice('What state is it in?', {
      gleaming: 'Gleaming new, fresh off the line in Kalamazoo.',
      battered: 'Battered: dents, rust spots and one mismatched grey-primer door.',
      abandoned: 'Abandoned: flat tyres, a broken window, snow piled on the roof.',
      brokendown: 'Broken down with the hood up, the engine showing.',
    }),
    roofLight: choice('What does the roof light say?', {
      forhire: 'Lit for hire: the medallion number glowing.',
      offduty: 'OFF DUTY lit on the side panels.',
      off: 'Dark: the roof light switched off.',
    }),
    company: choice('Who is with it?', {
      nobody: 'Nobody: the cab waiting alone at the kerb.',
      driver: 'The driver leaning on the front fender, smoking.',
      passenger: 'A passenger climbing out with shopping bags.',
    }),
    plates: choice('What plates does it carry?', {
      sixties: '1960s plates: orange numbers on dark blue.',
      seventies: '1970s plates: dark blue numbers on an orange plate.',
      none: 'No plates: removed, a car past its days.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.3) / 0.7));
    const wreck = a.state === 'abandoned' ? 1 : a.state === 'battered' ? 0.6 : 0;
    const grime = Math.min(1, mood.wear * 0.7 + wreck * 0.4 - (a.state === 'gleaming' ? 0.3 : 0));
    const bodyHex = LIVERY[a.livery];
    const body = s.material(new THREE.Color(bodyHex).lerp(new THREE.Color('#7a6b52'), Math.max(0, grime) * 0.3), { roughness: a.state === 'gleaming' ? 0.25 : 0.45 + grime * 0.35, metalness: 0.15 });
    const roofMat = a.livery === 'redwhite' ? s.material('#f1eee6', { roughness: 0.35 }) : body;
    const chrome = s.material('#dde2e6', { metalness: 0.85, roughness: a.state === 'gleaming' ? 0.12 : 0.3 + grime * 0.3 });
    const black = s.material('#141416', { roughness: 0.7 });
    const glass = new THREE.MeshStandardMaterial({ color: '#9db3bf', transparent: true, opacity: 0.38, roughness: 0.08, metalness: 0.2, side: THREE.DoubleSide });
    const rubber = s.material('#1a1a1b', { roughness: 0.85 });
    const interior = s.material('#2a2624', { roughness: 0.9 });
    const lampOn = mix(0.25, 2.6, night);

    const g = new THREE.Group();
    const parts: THREE.Mesh[] = [];
    const add = (geos: THREE.BufferGeometry[], mat: THREE.Material) => { const m = new THREE.Mesh(mergeGeometries(geos.map(flat)), mat); m.castShadow = m.receiveShadow = true; g.add(m); parts.push(m); return m; };

    // ---- Lower body: the side profile extruded across, with arches over both wheels.
    const prof = new THREE.Shape();
    prof.moveTo(2.45, 0.3); prof.lineTo(2.53, 0.55); prof.lineTo(2.48, 0.92); prof.lineTo(1.3, 0.99); prof.lineTo(0.95, BELT);
    prof.lineTo(-1.9, BELT + 0.02); prof.lineTo(-2.45, 0.99); prof.lineTo(-2.53, 0.62); prof.lineTo(-2.45, 0.3);
    for (const cz of [-WB, WB]) { prof.lineTo(cz - 0.47, 0.3); prof.absarc(cz, TYRE, 0.47, Math.PI + 0.13, -0.13, true); }
    prof.closePath();
    const bodyGeo = new THREE.ExtrudeGeometry(prof, { depth: W - 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 10 })
      .translate(0, 0, -(W - 0.08) / 2).rotateY(-Math.PI / 2);
    add([bodyGeo], body);
    // Fender crease and wheel-arch lips in black.
    const trimGeos: THREE.BufferGeometry[] = [];
    for (const sx of [-1, 1]) for (const cz of [-WB, WB]) trimGeos.push(new THREE.TorusGeometry(0.48, 0.03, 6, 20, Math.PI).rotateY(Math.PI / 2).translate(sx * (HW + 0.01), TYRE, cz));
    add(trimGeos, black);

    // ---- The checkerboard band along both flanks.
    const checks = canvasTexture(1024, 64, (c) => {
      for (let i = 0; i < 64; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#111111' : '#f4f2ec'; c.fillRect(i * 16, j * 16, 16, 16); }
    });
    const band = new THREE.MeshStandardMaterial({ color: '#ffffff', map: checks, roughness: 0.4 });
    for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.12), band); m.position.set(sx * (HW + 0.045), 0.82, 0); m.rotation.y = sx * Math.PI / 2; g.add(m); }

    // ---- Cabin: pillars, flat roof, glass and the interior with its jump seats.
    const cabin: THREE.BufferGeometry[] = [new THREE.BoxGeometry(W - 0.1, 0.07, 2.3).translate(0, ROOF, -0.42), new THREE.BoxGeometry(W - 0.04, 0.04, 2.36).translate(0, ROOF - 0.05, -0.42)];
    for (const sx of [-1, 1]) {
      const x = sx * (HW - 0.06);
      cabin.push(bar(new THREE.Vector3(x, BELT, 0.95), new THREE.Vector3(x, ROOF, 0.72), 0.07, 0.08));
      cabin.push(bar(new THREE.Vector3(x, BELT, -0.18), new THREE.Vector3(x, ROOF, -0.18), 0.07, 0.12));
      cabin.push(bar(new THREE.Vector3(x, BELT + 0.04, -1.86), new THREE.Vector3(x, ROOF - 0.05, -1.6), 0.07, 0.3));
    }
    add(cabin, roofMat);
    // Glass panes.
    const panes: THREE.BufferGeometry[] = [];
    const wind = new THREE.PlaneGeometry(W - 0.14, 0.6).rotateX(-Math.atan2(0.23, 0.56)).translate(0, (BELT + ROOF) / 2, 0.84);
    const rear = new THREE.PlaneGeometry(W - 0.3, 0.6).rotateX(Math.atan2(0.37, 0.56)).translate(0, (BELT + ROOF) / 2, -1.73);
    panes.push(wind, rear);
    for (const sx of [-1, 1]) panes.push(new THREE.PlaneGeometry(2.5, ROOF - BELT - 0.04).rotateY(Math.PI / 2).translate(sx * (HW - 0.05), (BELT + ROOF) / 2, -0.43));
    const glassMesh = new THREE.Mesh(mergeGeometries(panes.map(flat)), glass);
    g.add(glassMesh);
    // Seats: front bench, the two fold-down jump seats, the rear bench, and a partition.
    const seats: THREE.BufferGeometry[] = [
      new THREE.BoxGeometry(W - 0.25, 0.16, 0.5).translate(0, 0.62, 0.35), new THREE.BoxGeometry(W - 0.25, 0.5, 0.12).translate(0, 0.92, 0.08),
      new THREE.BoxGeometry(W - 0.25, 0.16, 0.55).translate(0, 0.6, -1.35), new THREE.BoxGeometry(W - 0.25, 0.55, 0.14).translate(0, 0.92, -1.62),
      new THREE.BoxGeometry(0.5, 0.06, 0.4).translate(-0.4, 0.64, -0.5), new THREE.BoxGeometry(0.5, 0.06, 0.4).translate(0.4, 0.64, -0.5),
      new THREE.BoxGeometry(0.5, 0.4, 0.05).translate(-0.4, 0.86, -0.3), new THREE.BoxGeometry(0.5, 0.4, 0.05).translate(0.4, 0.86, -0.3),
      new THREE.CylinderGeometry(0.19, 0.19, 0.04, 16).rotateX(Math.PI / 2 - 0.4).translate(0.42, 1.08, 0.62),
    ];
    add(seats, interior);
    const partition = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, 0.5), new THREE.MeshStandardMaterial({ color: '#d8e4e8', transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
    partition.position.set(0, 1.25, -0.08);
    g.add(partition);

    // ---- Front: grille, quad round headlights; rear: tail lamps; chrome bumpers.
    const front: THREE.BufferGeometry[] = [new THREE.BoxGeometry(1.0, 0.24, 0.04).translate(0, 0.7, 2.52)];
    for (let i = 0; i < 6; i++) front.push(new THREE.BoxGeometry(0.96, 0.015, 0.05).translate(0, 0.6 + i * 0.04, 2.53));
    add(front, black);
    const bumpers: THREE.BufferGeometry[] = [
      new THREE.BoxGeometry(W + 0.06, 0.16, 0.14).translate(0, 0.42, 2.58), new THREE.BoxGeometry(W + 0.06, 0.16, 0.14).translate(0, 0.42, -2.58),
      new THREE.BoxGeometry(1.06, 0.3, 0.02).translate(0, 0.7, 2.545),
    ];
    for (const sx of [-1, 1]) for (const k of [0.62, 0.86]) bumpers.push(new THREE.TorusGeometry(0.085, 0.015, 6, 16).translate(sx * k, 0.72, 2.53));
    // Door handles and a side rub strip.
    for (const sx of [-1, 1]) {
      for (const z of [0.35, -0.65]) bumpers.push(new THREE.BoxGeometry(0.03, 0.03, 0.16).translate(sx * (HW + 0.03), 0.96, z));
      bumpers.push(new THREE.BoxGeometry(0.02, 0.03, 4.4).translate(sx * (HW + 0.035), 0.64, 0));
    }
    add(bumpers, chrome);
    const headMat = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff1c4', emissiveIntensity: a.state === 'abandoned' ? 0 : lampOn, roughness: 0.2 });
    const heads: THREE.BufferGeometry[] = [];
    for (const sx of [-1, 1]) for (const k of [0.62, 0.86]) heads.push(new THREE.CircleGeometry(0.075, 16).translate(sx * k, 0.72, 2.535));
    add(heads, headMat);
    const tailMat = new THREE.MeshStandardMaterial({ color: '#b0101a', emissive: '#ff2020', emissiveIntensity: a.state === 'abandoned' ? 0 : lampOn * 0.6, roughness: 0.3 });
    add([-0.75, 0.75].map((x) => new THREE.BoxGeometry(0.22, 0.12, 0.03).translate(x, 0.82, -2.535)), tailMat);

    // ---- Wheels.
    const flatTyre = a.state === 'abandoned';
    const wheels: THREE.BufferGeometry[] = [], caps: THREE.BufferGeometry[] = [];
    for (const sx of [-1, 1]) for (const cz of [-WB, WB]) {
      const y = flatTyre ? TYRE * 0.78 : TYRE;
      wheels.push(new THREE.CylinderGeometry(TYRE, TYRE, 0.22, 22).rotateZ(Math.PI / 2).scale(1, flatTyre ? 0.8 : 1, 1).translate(sx * (HW - 0.12), y, cz));
      caps.push(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 18).rotateZ(Math.PI / 2).translate(sx * (HW - 0.003), y, cz));
    }
    add(wheels, rubber);
    add(caps, chrome);

    // ---- Roof light and door lettering.
    const medallion = `${1 + Math.floor(random() * 9)}${String.fromCharCode(65 + Math.floor(random() * 20))}${10 + Math.floor(random() * 89)}`;
    const roofText = a.roofLight === 'offduty' ? 'OFF DUTY' : medallion;
    const sign = canvasTexture(256, 96, (c) => {
      c.fillStyle = '#f7f1dc'; c.fillRect(0, 0, 256, 96);
      c.fillStyle = a.roofLight === 'offduty' ? '#b8202a' : '#141416'; c.font = 'bold 54px "Liberation Sans", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(roofText, 128, 50, 240);
    });
    const signMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: sign, emissive: '#fff2cc', emissiveMap: sign, emissiveIntensity: a.roofLight === 'off' || a.state === 'abandoned' ? 0 : mix(0.4, 1.8, night), roughness: 0.5 });
    const roofBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.62), signMat);
    roofBox.position.set(0, ROOF + 0.14, 0.25);
    roofBox.castShadow = true;
    g.add(roofBox);
    add([new THREE.BoxGeometry(0.26, 0.03, 0.66).translate(0, ROOF + 0.05, 0.25)], black);
    const door = canvasTexture(256, 128, (c) => {
      c.clearRect(0, 0, 256, 128); c.fillStyle = '#141416'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 34px "Liberation Sans", Arial, sans-serif'; c.fillText('N.Y.C. TAXI', 128, 36, 240);
      c.font = 'bold 44px "Liberation Sans", Arial, sans-serif'; c.fillText(medallion, 128, 88, 240);
    });
    const doorMat = new THREE.MeshStandardMaterial({ map: door, transparent: true, alphaTest: 0.4, roughness: 0.5 });
    for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), doorMat); m.position.set(sx * (HW + 0.046), 0.62, -0.7); m.rotation.y = sx * Math.PI / 2; g.add(m); }

    // ---- Plates.
    if (a.plates !== 'none') {
      const plate = canvasTexture(256, 128, (c) => {
        const bg = a.plates === 'sixties' ? '#1b2a55' : '#f0a215', fg = a.plates === 'sixties' ? '#f0a215' : '#1b2a55';
        c.fillStyle = bg; c.fillRect(0, 0, 256, 128); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = 'bold 20px sans-serif'; c.fillText('NEW YORK', 128, 18);
        c.font = 'bold 60px "Liberation Mono", monospace'; c.fillText(`${medallion}T`, 128, 76, 236);
      });
      const pm = new THREE.MeshStandardMaterial({ map: plate, roughness: 0.5 });
      for (const z of [2.66, -2.66]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.155), pm); m.position.set(0, 0.42, z); if (z < 0) m.rotation.y = Math.PI; g.add(m); }
    }

    // ---- State.
    if (a.state === 'battered') {
      const primer = s.material('#7b8088', { roughness: 0.9 });
      const side = random() < 0.5 ? -1 : 1;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.66, 0.95), primer); m.position.set(side * (HW + 0.05), 0.68, -0.66); g.add(m);
      const rustMat = s.material('#8a4a24', { roughness: 1 });
      const spots: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 7; i++) spots.push(new THREE.CircleGeometry(0.05 + random() * 0.07, 8).rotateY(Math.PI / 2 * (random() < 0.5 ? 1 : -1)).translate((random() < 0.5 ? -1 : 1) * (HW + 0.048), 0.4 + random() * 0.3, -2.2 + random() * 4.4));
      const r = new THREE.Mesh(mergeGeometries(spots), rustMat); r.material.side = THREE.DoubleSide; g.add(r);
    } else if (a.state === 'abandoned') {
      const snow = s.material('#f4f6f8', { roughness: 0.95 });
      add([
        new THREE.BoxGeometry(W - 0.12, 0.22, 2.2).translate(0, ROOF + 0.14, -0.42),
        new THREE.BoxGeometry(W - 0.2, 0.12, 1.3).translate(0, 1.04, 1.7),
        new THREE.BoxGeometry(W - 0.2, 0.1, 0.5).translate(0, 1.04, -2.2),
      ], snow);
      roofBox.position.y += 0.18;
      glassMesh.geometry.dispose();
      glassMesh.geometry = mergeGeometries([wind, rear].map(flat));
      const shards = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.3).rotateY(Math.PI / 2).translate(HW - 0.05, BELT + 0.12, -0.6), glass);
      g.add(shards);
    } else if (a.state === 'brokendown') {
      const hood = new THREE.Group();
      const panel = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 0.05, 1.45).translate(0, 0, 0.72), body);
      panel.castShadow = true;
      hood.add(panel);
      hood.position.set(0, 1.03, 0.98);
      hood.rotation.x = -1.0;
      g.add(hood);
      add([new THREE.BoxGeometry(0.9, 0.3, 0.9).translate(0, 1.05, 1.75), new THREE.CylinderGeometry(0.18, 0.18, 0.1, 14).translate(0, 1.22, 1.9)], s.material('#3a3c3e', { metalness: 0.5 }));
    }

    const updates: ((time: number) => void)[] = [];
    // ---- Who is with it.
    if (a.company === 'driver') {
      const p = figure(s, { height: 1.74, build: random() < 0.5 ? 'heavy' : 'average', pose: 'leaning', style: 'doll', hair: 'cap', top: '#5b4636', bottom: '#2d3038', skin: '#c99470' });
      s.root.remove(p.root);
      p.root.position.set(-HW - 0.45, 0, 1.6);
      p.root.rotation.y = Math.PI / 2 - 0.5;
      g.add(p.root);
      g.updateMatrixWorld(true);
      const mouth = p.head.getWorldPosition(new THREE.Vector3());
      p.reach('right', new THREE.Vector3(mouth.x - 0.05, mouth.y - 0.08, mouth.z + 0.12), { space: g });
      const smoke = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#e8eaec', transparent: true, opacity: 0.35, depthWrite: false }), 8);
      g.add(smoke);
      updates.push((time) => {
        p.update(0.016, time);
        for (let i = 0; i < 8; i++) { const t = ((time * (0.15 + mood.energy * 0.3)) + i / 8) % 1; smoke.setMatrixAt(i, new THREE.Matrix4().makeScale(0.03 + t * 0.12, 0.03 + t * 0.12, 0.03 + t * 0.12).setPosition(mouth.x + t * 0.25, mouth.y + 0.05 + t * 0.7, mouth.z + 0.1)); }
        smoke.instanceMatrix.needsUpdate = true;
      });
    } else if (a.company === 'passenger') {
      const p = figure(s, { height: 1.66, pose: 'carrying', style: 'doll', hair: random() < 0.5 ? 'bun' : 'long', top: '#a33a3a', bottom: '#3d4652', skin: '#e0b48f' });
      s.root.remove(p.root);
      p.root.position.set(-HW - 0.6, 0, -0.75);
      p.root.rotation.y = -0.9;
      g.add(p.root);
      const paper = s.material('#c8a77e', { roughness: 0.9 });
      g.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
      for (const side of ['left', 'right'] as const) {
        const hand = p.hands[side].getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.2), paper);
        bag.position.set(hand.x, hand.y - 0.12, hand.z);
        bag.rotation.y = -0.9;
        bag.castShadow = true;
        g.add(bag);
        if (side === 'left') { const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6).scale(1, 0.6, 1), s.material('#3f7a3a')); leaf.position.set(hand.x, hand.y + 0.1, hand.z); g.add(leaf); }
      }
      updates.push((time) => p.update(0.016, time));
    }

    g.rotation.y = 30 * Math.PI / 180;
    s.root.add(g);
    return s.finish({ footprint: 2.2, update: (_dt, time) => { for (const fn of updates) fn(time); } });
  },
});
