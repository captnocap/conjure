import * as THREE from 'three';
import { diorama, choice, defineWorld, mix, noul } from '@conjure/kit';

type P = [number, number, number];
const SIGNS = { yard: 'L4 YARD', berth: 'BERTH 9', union: 'LOCAL 5', vacancy: 'NO VACANCY', drydock: 'DRYDOCK', none: '' } as const;
const YAW = 24, PITCH = 25;
const SPINE_Z = -1.4;
/** Where the cast berths: [x, z, height above the spine deck, size]. The first is the work bay. */
const SLOTS: readonly (readonly [number, number, number, number])[] = [
  [0, 1.9, 0, 1.25],
  [-4.3, -3.6, 1.5, 0.82],
  [4.2, -3.9, 0.7, 0.82],
  [-4.7, 2.4, -1.1, 0.75],
  [4.6, 2.1, -0.7, 0.75],
  [0.4, -5.0, 2.7, 0.7],
];

function hazardTexture(repeat: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f2c21a';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#1b1b1d';
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(k * 64, 0); ctx.lineTo(k * 64 + 32, 0); ctx.lineTo(k * 64 - 32, 64); ctx.lineTo(k * 64 - 64, 64); ctx.fill(); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, 1);
  return texture;
}

export default defineWorld({
  questions: {
    sky: choice('What does the space behind the yard look like?', {
      deep: 'Deep ink-blue, the stars sharp.',
      slate: 'A soft slate blue-grey, like a long dusk.',
      pale: 'Pale grey-white, the yard drawn like a diagram on paper.',
      amber: 'A dusty amber-brown haze, sodium-lit and warm.',
    }),
    shift: choice('What is the yard doing today?', {
      busy: 'Full day shift: every flood lamp on, welders out on tethers, sparks at the bay.',
      skeleton: 'Night skeleton crew: only the work bay is lit, one figure out, the other berths dark.',
      mothballed: 'Mothballed: lamps dead, tarps lashed over the stores, a few red beacons blinking.',
      handover: 'Handover day: everything lit and strings of coloured pennants hung across the bay.',
    }),
    spine: choice('What is the central spine made of?', {
      lattice: 'An open box-lattice truss, all diagonals.',
      tube: 'A fat pressurised tunnel with ribs, hatches and pipe runs.',
      rails: 'Twin heavy rails tied by sleepers, a gantry track.',
    }),
    neighbour: choice('What hangs in the sky opposite the sun?', {
      earth: 'A thin blue-white crescent planet with a small grey moon.',
      ringed: 'A pale gold crescent giant with a tilted ring.',
      rust: 'A rust-red crescent world with two specks of moon.',
      none: 'Nothing: only stars.',
    }),
    stores: choice('What is stacked along the spine?', {
      containers: 'Stacks of coloured cargo containers.',
      bottles: 'Racks of white gas bottles and round tanks.',
      steel: 'Bundles of girders and curved hull plates.',
      bare: 'Almost nothing; the yard is swept clean.',
    }),
    sign: choice('What does the yard sign over the bay say?', {
      yard: 'L4 YARD', berth: 'BERTH 9', union: 'LOCAL 5', vacancy: 'NO VACANCY', drydock: 'DRYDOCK', none: 'There is no sign.',
    }),
    crane: noul('Does a long jointed crane arm reach over the work bay?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const skyColour = { deep: '#2c3a54', slate: '#5a6b85', pale: '#d5dce2', amber: '#8b7660' }[a.sky];
    const { art: s, world } = diorama(context, { background: skyColour, floor: null, width: 12, depth: 9, maxHeight: 3.5, radius: 1.55, yaw: YAW, pitch: PITCH, slots: SLOTS });
    const root = s.root;
    const paleSky = a.sky === 'pale';
    const sky = new THREE.Color(skyColour);
    for (const child of root.children) {
      const light = child as THREE.HemisphereLight;
      if (light.isHemisphereLight) { light.intensity = paleSky ? 1.3 : 1.05; light.color.set('#eef2ff'); light.groundColor.copy(sky).lerp(new THREE.Color('#8f97a8'), 0.5); }
    }
    const off = a.shift === 'mothballed';
    const allOn = a.shift === 'busy' || a.shift === 'handover';

    const girder = s.material(new THREE.Color('#9aa2ab').lerp(new THREE.Color('#8a6a52'), mood.wear * 0.4), { metalness: 0.35, roughness: 0.5 });
    const dark = s.material('#33383f', { roughness: 0.6 });
    const white = s.material('#e9e8e1', { roughness: 0.55 });
    const yellow = s.material('#e3b21f', { roughness: 0.55 });
    const deckPaint = s.material('#6f7780', { metalness: 0.3, roughness: 0.6 });
    const lampHue = new THREE.Color().setHSL(mix(0.57, 0.1, mood.warmth), 0.85, 0.74);
    const lampOn = new THREE.MeshStandardMaterial({ color: '#fff6dc', emissive: lampHue, emissiveIntensity: mix(1.8, 3, mood.cheer) });
    const lampDim = new THREE.MeshStandardMaterial({ color: '#555b63', emissive: lampHue, emissiveIntensity: 0.04 });
    const beaconColour = off ? '#ff3524' : a.shift === 'skeleton' ? '#ffad1f' : '#58f08a';
    const beacon = new THREE.MeshStandardMaterial({ color: beaconColour, emissive: beaconColour, emissiveIntensity: 2.4 });
    const coneMaterial = new THREE.MeshBasicMaterial({ color: lampHue, transparent: true, opacity: paleSky ? 0.08 : 0.065, depthWrite: false, side: THREE.DoubleSide, blending: paleSky ? THREE.NormalBlending : THREE.AdditiveBlending });

    // ---- one instanced mesh carries every lattice member ---------------------------------
    const members: { from: THREE.Vector3; to: THREE.Vector3; thick: number }[] = [];
    const bar = (from: P | THREE.Vector3, to: P | THREE.Vector3, thick = 0.045) => members.push({ from: Array.isArray(from) ? new THREE.Vector3(...from) : from, to: Array.isArray(to) ? new THREE.Vector3(...to) : to, thick });
    const lattice = (from: P, to: P, width: number, bayLength: number, thick = 0.04) => {
      const a0 = new THREE.Vector3(...from), b0 = new THREE.Vector3(...to);
      const along = b0.clone().sub(a0), length = along.length();
      along.normalize();
      const u = Math.abs(along.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0).cross(along).normalize();
      const v = along.clone().cross(u).normalize();
      const bays = Math.max(1, Math.round(length / bayLength));
      const corner = (k: number, c: number) => a0.clone().addScaledVector(along, (k / bays) * length).addScaledVector(u, (c === 0 || c === 3 ? -1 : 1) * width / 2).addScaledVector(v, (c < 2 ? -1 : 1) * width / 2);
      for (let c = 0; c < 4; c++) bar(corner(0, c), corner(bays, c), thick * 1.25);
      for (let k = 0; k <= bays; k++) for (let c = 0; c < 4; c++) {
        bar(corner(k, c), corner(k, (c + 1) % 4), thick);
        if (k < bays) bar(corner(k, c), corner(k + 1, (c + 1 + (k % 2) * 2) % 4 === (c + 1) % 4 ? (c + 1) % 4 : (c + 3) % 4), thick * 0.75);
      }
    };

    // ---- spine -------------------------------------------------------------------------
    const x0 = -6.3, x1 = 6.3;
    if (a.spine === 'lattice') {
      lattice([x0, -0.45, SPINE_Z], [x1, -0.45, SPINE_Z], 0.9, 0.9, 0.05);
      s.box([x1 - x0, 0.04, 0.5], [0, 0.0, SPINE_Z], deckPaint);
    } else if (a.spine === 'tube') {
      s.mesh(new THREE.CylinderGeometry(0.46, 0.46, x1 - x0, 20).rotateZ(Math.PI / 2), white, [0, -0.46, SPINE_Z]);
      for (let x = x0; x <= x1 + 0.01; x += 1.05) s.mesh(new THREE.TorusGeometry(0.47, 0.05, 6, 20).rotateY(Math.PI / 2), girder, [x, -0.46, SPINE_Z]);
      for (const [dy, dz, colour] of [[-0.05, 0.5, '#c0392b'], [-0.3, 0.52, '#e3b21f'], [-0.75, 0.42, '#2f6f8f']] as const) s.mesh(new THREE.CylinderGeometry(0.035, 0.035, x1 - x0 - 0.4, 6).rotateZ(Math.PI / 2), s.material(colour), [0, -0.46 + dy + 0.3, SPINE_Z + dz]);
      for (const x of [-3.1, 1.0, 5.2]) { s.cylinder(0.26, 0.3, 0.14, [x, 0.02, SPINE_Z], dark, 14); s.cylinder(0.2, 0.2, 0.04, [x, 0.1, SPINE_Z], yellow, 14); }
      for (const side of [-1, 1]) s.ball([0.46, 0.46, 0.46], [side * x1, -0.46, SPINE_Z], white, 18);
    } else {
      for (const dz of [-0.38, 0.38]) {
        s.box([x1 - x0, 0.3, 0.12], [0, -0.16, SPINE_Z + dz], girder);
        s.box([x1 - x0, 0.05, 0.26], [0, -0.02, SPINE_Z + dz], dark);
        s.box([x1 - x0, 0.05, 0.26], [0, -0.3, SPINE_Z + dz], dark);
      }
      for (let x = x0 + 0.3; x < x1; x += 0.7) s.box([0.16, 0.12, 1.0], [x, -0.38, SPINE_Z], deckPaint);
      const tx = mix(-5.4, -3.2, random());
      s.box([0.9, 0.34, 1.1], [tx, 0.2, SPINE_Z], yellow);
      s.box([0.5, 0.4, 0.5], [tx, 0.55, SPINE_Z], dark);
    }
    // Handrail along the front of the deck.
    for (let x = x0; x <= x1 + 0.01; x += 1.05) bar([x, 0, SPINE_Z + 0.42], [x, 0.36, SPINE_Z + 0.42], 0.022);
    bar([x0, 0.36, SPINE_Z + 0.42], [x1, 0.36, SPINE_Z + 0.42], 0.022);
    bar([x0, 0.19, SPINE_Z + 0.42], [x1, 0.19, SPINE_Z + 0.42], 0.016);

    // ---- berths ------------------------------------------------------------------------
    const padStripe = new THREE.MeshStandardMaterial({ map: hazardTexture(18), roughness: 0.7 });
    const cones: THREE.Mesh[] = [];
    const flood = (at: P, aim: P, on: boolean, reach: number, spread: number) => {
      const from = new THREE.Vector3(...at), direction = new THREE.Vector3(...aim).sub(from).normalize();
      const head = s.box([0.3, 0.2, 0.22], at, on ? lampOn : lampDim);
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
      head.castShadow = false;
      if (!on) return;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(spread, reach, 20, 1, true).translate(0, -reach / 2, 0), coneMaterial);
      cone.position.copy(from);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
      root.add(cone);
      cones.push(cone);
    };
    SLOTS.forEach(([x, z, lift, size], index) => {
      const hero = index === 0;
      const padR = 1.55 * (hero ? 1 : 0.85) * size + 0.28;
      s.cylinder(padR, padR, 0.14, [x, lift - 0.07, z], deckPaint, hero ? 8 : 6);
      s.mesh(new THREE.CylinderGeometry(padR + 0.02, padR + 0.02, 0.1, hero ? 8 : 6, 1, true), padStripe, [x, lift - 0.11, z]);
      s.cylinder(padR * 0.55, padR * 0.3, 0.3, [x, lift - 0.29, z], dark, 10);
      const arm: P = [THREE.MathUtils.clamp(x * 0.9, x0 + 0.5, x1 - 0.5), -0.45, SPINE_Z];
      lattice(arm, [x, lift - 0.4, z], 0.4, 0.62, 0.032);
      s.box([0.7, 0.7, 0.7], arm, dark);
      // Corner beacons and one mast lamp per berth.
      const sides = hero ? 8 : 6;
      for (let k = 0; k < sides; k += 2) {
        const t = (k / sides) * Math.PI * 2 + Math.PI / sides;
        s.ball([0.07, 0.07, 0.07], [x + Math.sin(t) * padR * 0.96, lift + 0.05, z + Math.cos(t) * padR * 0.96], beacon, 8).castShadow = false;
      }
      if (!hero) {
        const mast: P = [x - Math.sign(x || 1) * padR * 0.8, lift, z - padR * 0.55];
        bar(mast, [mast[0], lift + 2.5, mast[2]], 0.035);
        flood([mast[0], lift + 2.55, mast[2]], [x, lift + 0.8, z], allOn, 2.6, 1.0);
      }
    });

    // ---- the work bay gantry -----------------------------------------------------------
    const [hx, hz] = [SLOTS[0][0], SLOTS[0][1]];
    const bayR = 1.55 * 1.25 + 0.28;
    const gz = hz - 1.0, gx = bayR + 0.55, top = 5.9;
    for (const side of [-1, 1]) {
      lattice([hx + side * gx, -0.6, gz], [hx + side * gx, top, gz], 0.5, 0.75, 0.04);
      s.box([0.8, 0.3, 0.8], [hx + side * gx, -0.7, gz], dark);
      flood([hx + side * (gx - 0.3), 3.4, gz + 0.35], [hx, 1.6, hz], !off && allOn, 3.2, 1.0);
    }
    lattice([hx - gx, top, gz], [hx + gx, top, gz], 0.5, 0.75, 0.04);
    lattice([hx - gx, -0.6, gz], [hx + gx, -0.6, gz], 0.4, 0.8, 0.035);
    for (const dx of [-1.9, -0.65, 0.65, 1.9]) flood([hx + dx, top - 0.38, gz + 0.3], [hx + dx * 0.5, 1.4, hz], !off || dx === 0.65, 4.8, 1.25);
    s.mesh(new THREE.BoxGeometry(gx * 2 + 0.6, 0.16, 0.08), new THREE.MeshStandardMaterial({ map: hazardTexture(14), roughness: 0.7 }), [hx, top - 0.3, gz + 0.3]);
    const text = SIGNS[a.sign];
    if (text) {
      s.box([3.5, 0.9, 0.1], [hx, top + 0.75, gz], dark);
      const sign = s.label(text, 3.3, 0.72, [hx, top + 0.75, gz + 0.06], off ? '#8f8a7c' : '#fff3d0', off ? '#3a3d42' : mood.cheer > 0.5 ? '#b9432c' : '#1f3f7a');
      sign.castShadow = false;
      if (!off) { const material = sign.material as THREE.MeshStandardMaterial; material.emissive = new THREE.Color('#ffffff'); material.emissiveMap = material.map; material.emissiveIntensity = 0.7; }
      for (const dx of [-1.5, 1.5]) bar([hx + dx, top + 0.2, gz], [hx + dx, top + 0.4, gz], 0.04);
    }
    if (a.shift === 'handover') {
      const colours = ['#d8322a', '#f2c21a', '#2f8fd0', '#3f9a5a', '#f1ede2', '#e86aa8'];
      for (const [fromX, toX, y0, sag] of [[-gx, gx, top - 0.5, 0.9], [-gx, gx, top - 1.6, 0.7]] as const) {
        const flags: { at: P; size: number; color: string }[] = [];
        for (let k = 0; k <= 22; k++) {
          const t = k / 22;
          flags.push({ at: [hx + mix(fromX, toX, t), y0 - Math.sin(t * Math.PI) * sag - 0.09, gz + 0.5 + Math.sin(t * Math.PI) * 0.5], size: 0.13, color: colours[k % colours.length] });
        }
        s.scatter(new THREE.ConeGeometry(0.7, 1.5, 3).rotateX(Math.PI), new THREE.MeshStandardMaterial({ roughness: 0.8, emissive: '#ffffff', emissiveIntensity: 0.08 }), flags);
        s.tube(flags.filter((_f, k) => k % 3 === 0 || k === 22).map((flag) => [flag.at[0], flag.at[1] + 0.1, flag.at[2]] as P), 0.012, dark);
      }
    }

    // ---- crane arm ---------------------------------------------------------------------
    if (a.crane) {
      const foot: P = [-2.9, 0.1, SPINE_Z], shoulder: P = [-3.1, 2.4, SPINE_Z + 0.2], elbow: P = [-1.9, 6.4, 0.2], wrist: P = [-0.6, 5.0, hz - 0.2];
      s.box([0.9, 0.3, 0.9], foot, yellow);
      s.rod(foot, shoulder, 0.16, white);
      s.rod(shoulder, elbow, 0.13, white);
      s.rod(elbow, wrist, 0.1, white);
      for (const joint of [shoulder, elbow, wrist]) s.ball([0.2, 0.2, 0.2], joint, yellow, 12);
      s.rod(wrist, [wrist[0], wrist[1] - 0.45, wrist[2]], 0.05, dark);
      const held = s.box([0.9, 0.06, 0.7], [wrist[0], wrist[1] - 0.5, wrist[2]], girder);
      held.rotation.set(0.2, 0.5, 0.1);
    }

    // ---- stores and fixtures along the spine ---------------------------------------------
    const tarp = s.material(mood.warmth > 0.5 ? '#8a7c52' : '#5d7480', { roughness: 0.95, flatShading: true });
    const piles = a.stores === 'bare' ? 0 : Math.round(mix(2, 6, mood.density));
    const spots = [-5.6, 5.5, -1.5, 2.6, 3.9, -4.4];
    for (let n = 0; n < piles; n++) {
      const x = spots[n] + (random() - 0.5) * 0.3, z = SPINE_Z - 0.05;
      if (off) {
        // Everything shrouded and lashed down.
        const w = mix(0.9, 1.3, random()), h = mix(0.5, 1.0, random());
        const shroud = s.mesh(new THREE.DodecahedronGeometry(0.62, 0), tarp, [x, h * 0.5, z]);
        shroud.scale.set(w, h, 0.8);
        shroud.rotation.y = random();
        for (const dx of [-0.25, 0.25]) bar([x + dx, 0, z + 0.4], [x + dx, h * 0.95, z], 0.012);
        continue;
      }
      if (a.stores === 'containers') {
        const colours = ['#2f6f8f', '#9c3b2e', '#3f7a4c', '#c98a1e', '#d9d5c8'];
        for (let k = 0, stack = 1 + Math.floor(random() * 3); k < stack; k++) {
          const box = s.box([1.0, 0.44, 0.5], [x + (random() - 0.5) * 0.1, 0.24 + k * 0.46, z], s.material(colours[Math.floor(random() * colours.length)], { roughness: 0.7 }));
          box.rotation.y = (random() - 0.5) * 0.12;
        }
      } else if (a.stores === 'bottles') {
        if (n % 2) { s.ball([0.42, 0.42, 0.42], [x, 0.5, z], white, 16); s.cylinder(0.3, 0.36, 0.14, [x, 0.07, z], dark, 12); s.cylinder(0.43, 0.43, 0.08, [x, 0.5, z], yellow, 16); }
        else for (let k = 0; k < 4; k++) { s.mesh(new THREE.CapsuleGeometry(0.11, 0.5, 4, 10), white, [x - 0.36 + k * 0.24, 0.38, z]); s.cylinder(0.115, 0.115, 0.06, [x - 0.36 + k * 0.24, 0.52, z], s.material(['#4fb86a', '#6fb6e8', '#d9722a'][k % 3]), 10); }
        if (!(n % 2)) s.box([1.05, 0.06, 0.34], [x, 0.3, z], dark);
      } else {
        if (n % 2) for (let k = 0; k < 5; k++) s.box([mix(1.3, 1.9, random()), 0.1, 0.1], [x, 0.07 + Math.floor(k / 2) * 0.12, z - 0.12 + (k % 2) * 0.24], k % 2 ? girder : dark).rotation.y = (random() - 0.5) * 0.08;
        else for (let k = 0; k < 3; k++) s.mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.9, 8, 1, true, -0.4, 0.8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: ['#a5482f', '#8f9aa6', '#a9b04a'][k], roughness: 0.6, metalness: 0.25, side: THREE.DoubleSide, flatShading: true }), [x, -1.28 + k * 0.1, z]).rotation.x = Math.PI / 2;
      }
    }
    // Crew shack at one end: a can with lit ports, an airlock and a dish.
    const shackX = x0 - 0.2;
    s.mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.9, 18).rotateZ(Math.PI / 2), white, [shackX, 0.72, SPINE_Z]);
    for (const dx of [-0.95, 0.95]) s.ball([0.62 * 0.4, 0.62, 0.62], [shackX + dx, 0.72, SPINE_Z], white, 16);
    s.mesh(new THREE.CylinderGeometry(0.635, 0.635, 0.16, 18).rotateZ(Math.PI / 2), s.material(mood.cheer > 0.5 ? '#c8402c' : '#4a6a8a'), [shackX + 0.55, 0.72, SPINE_Z]);
    const shackLit = !off || true;
    for (let k = 0; k < 4; k++) s.ball([0.1, 0.1, 0.05], [shackX - 0.55 + k * 0.34, 0.86, SPINE_Z + 0.6], shackLit && (a.shift !== 'mothballed' || k === 1) && (a.shift !== 'skeleton' || k < 2) ? lampOn : lampDim, 8).castShadow = false;
    s.box([0.5, 0.6, 0.3], [shackX - 0.2, 0.3, SPINE_Z], dark);
    bar([shackX - 0.6, 1.3, SPINE_Z], [shackX - 0.6, 2.2, SPINE_Z], 0.03);
    const dish = s.lathe([[0.02, 0], [0.22, 0.05], [0.4, 0.17], [0.5, 0.32]], new THREE.MeshStandardMaterial({ color: '#eeeeea', side: THREE.DoubleSide, roughness: 0.5 }), [shackX - 0.6, 2.25, SPINE_Z]);
    dish.rotation.set(0.7, 0, -0.5);
    // Solar wing and radiators at the other end.
    const cells = s.material('#1f3a7a', { metalness: 0.3, roughness: 0.3, emissive: '#0d1f4d', emissiveIntensity: 0.5 });
    const wingX = x1 + 0.2;
    bar([wingX, -0.45, SPINE_Z], [wingX, 4.4, SPINE_Z], 0.07);
    for (let k = 0; k < 4; k++) for (const side of [-1, 1]) {
      const cell = s.box([0.05, 0.95, 1.5], [wingX, 0.95 + k * 1.02, SPINE_Z + side * 0.85], cells);
      cell.rotation.y = 0.35;
      if (mood.wear > 0.7 && random() < 0.25) cell.rotation.x = 0.4;
    }
    for (const side of [-1, 1]) s.box([1.5, 0.05, 0.8], [x1 - 1.3, -0.95, SPINE_Z + side * 0.05], white).rotation.x = side * 0.5;
    // Loose umbilicals drifting between the spine and the bay: nothing here hangs straight down.
    for (let k = 0; k < 3; k++) {
      const fx = mix(-2.2, 2.2, random());
      s.tube([[fx, -0.1, SPINE_Z + 0.4], [fx + mix(-0.8, 0.8, random()), mix(0.3, 1.1, random()), SPINE_Z + 1.3], [fx * 0.6 + mix(-0.5, 0.5, random()), mix(-0.6, 0.2, random()), hz - bayR * 0.8], [fx * 0.5, -0.15, hz - bayR * 0.55]], 0.025, s.material(['#c0392b', '#e3b21f', '#24272b'][k]));
    }

    // ---- the crew ------------------------------------------------------------------------
    const suit = s.material('#f1f1ec', { roughness: 0.7 });
    const visor = s.material('#c98a1e', { metalness: 0.5, roughness: 0.25 });
    const sparks: THREE.Mesh[] = [];
    const worker = (at: P, facing: number, welding: boolean) => {
      const figure = new THREE.Group();
      figure.position.set(...at);
      figure.rotation.set((random() - 0.5) * 0.5, facing, (random() - 0.5) * 0.6);
      root.add(figure);
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, rz = 0) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.rotation.z = rz; mesh.castShadow = true; figure.add(mesh); };
      part(new THREE.CapsuleGeometry(0.1, 0.16, 4, 10), suit, 0, 0, 0);
      part(new THREE.SphereGeometry(0.095, 12, 8), suit, 0, 0.24, 0);
      part(new THREE.BoxGeometry(0.11, 0.07, 0.04), visor, 0, 0.245, 0.075);
      part(new THREE.BoxGeometry(0.2, 0.26, 0.1), suit, 0, 0.03, -0.12);
      for (const side of [-1, 1]) { part(new THREE.CapsuleGeometry(0.04, 0.2, 3, 8), suit, side * 0.07, -0.28, 0.02, side * 0.25); part(new THREE.CapsuleGeometry(0.035, 0.18, 3, 8), suit, side * 0.17, 0.06, 0.07, side * 1.1); }
      s.tube([at, [at[0] + mix(-0.5, 0.5, random()), at[1] - 0.5, at[2] - 0.4], [at[0] * 0.8, 0.5, SPINE_Z + 0.9], [at[0] * 0.7, 0.05, SPINE_Z + 0.3]], 0.012, s.material('#e25b2a'));
      if (welding) {
        const point: P = [at[0] + Math.sin(facing) * 0.3, at[1] + 0.05, at[2] + Math.cos(facing) * 0.3];
        const star = s.mesh(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshStandardMaterial({ color: '#e8f6ff', emissive: '#9fd8ff', emissiveIntensity: 4 }), point);
        star.castShadow = false;
        sparks.push(star);
      }
    };
    if (a.shift === 'busy' || a.shift === 'handover') { worker([hx - gx + 0.5, 2.7, gz + 0.3], 0.9, a.shift === 'busy'); worker([hx + gx - 0.45, 1.2, gz + 0.35], -0.9, a.shift === 'busy'); worker([3.2, 0.5, SPINE_Z + 0.2], 0.3, false); }
    if (a.shift === 'skeleton') worker([hx - gx + 0.5, 1.9, gz + 0.3], 0.9, true);

    // ---- flush the lattice ---------------------------------------------------------------
    {
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), girder, members.length);
      const up = new THREE.Vector3(0, 1, 0), matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
      members.forEach(({ from, to, thick }, index) => {
        const direction = to.clone().sub(from), length = direction.length();
        quaternion.setFromUnitVectors(up, direction.normalize());
        matrix.compose(from.clone().add(to).multiplyScalar(0.5), quaternion, new THREE.Vector3(thick, length, thick));
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    }

    // ---- sky: stars, a small sun, a faint crescent ----------------------------------------
    const yaw = THREE.MathUtils.degToRad(YAW), pitch = THREE.MathUtils.degToRad(PITCH);
    const toCamera = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const upward = toCamera.clone().cross(right).normalize();
    const behind = (u: number, v: number, depth = 11): P => new THREE.Vector3(0, 2.4, 0).addScaledVector(right, u).addScaledVector(upward, v).addScaledVector(toCamera, -depth).toArray() as P;
    const facing = new THREE.Euler(-pitch, yaw, 0, 'YXZ');
    const starColour = paleSky ? '#8494a8' : '#f4f7ff';
    const stars = Array.from({ length: Math.round(mix(110, 190, mood.density)) }, () => ({ at: behind(mix(-10, 10, random()), mix(-8, 9, random())), size: mix(0.03, 0.085, random() ** 2) }));
    s.scatter(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: starColour, transparent: true, depthWrite: false }), stars).castShadow = false;
    const sunSide = mood.daylight < 0.5 ? -1 : 1;
    const flat = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P, roll = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.rotation.copy(facing);
      mesh.rotateZ(roll);
      mesh.castShadow = mesh.receiveShadow = false;
      root.add(mesh);
      return mesh;
    };
    const sunAt: [number, number] = [sunSide * 6.4, 5.6];
    const sunColour = new THREE.Color().setHSL(mix(0.14, 0.08, mood.warmth), 1, paleSky ? 0.62 : 0.88);
    flat(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ color: sunColour, transparent: true, depthWrite: false }), behind(...sunAt, 10.9)).renderOrder = 3;
    for (const [radius, opacity] of [[0.62, 0.3], [1.1, 0.14], [1.9, 0.07]] as const) flat(new THREE.CircleGeometry(radius, 40), new THREE.MeshBasicMaterial({ color: sunColour, transparent: true, opacity, depthWrite: false }), behind(...sunAt, 10.95 + radius * 0.01));
    for (let k = 0; k < 4; k++) flat(new THREE.PlaneGeometry(k % 2 ? 2.6 : 3.6, 0.02), new THREE.MeshBasicMaterial({ color: sunColour, transparent: true, opacity: 0.35, depthWrite: false }), behind(...sunAt, 10.92), (k * Math.PI) / 4);
    if (a.neighbour !== 'none') {
      const limb = { earth: '#bcd8f0', ringed: '#ead7a4', rust: '#d98a5a' }[a.neighbour];
      const radius = a.neighbour === 'ringed' ? 1.5 : 1.25;
      const at: [number, number] = [-sunSide * 5.9, 5.0];
      const faint = (colour: string, amount: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).lerp(sky, amount), side: THREE.DoubleSide, transparent: true, depthWrite: false });
      const crescent = (r: number, thickness: number) => {
        const shape = new THREE.Shape();
        for (let k = 0; k <= 40; k++) { const t = -Math.PI / 2 + (k / 40) * Math.PI; if (k === 0) shape.moveTo(Math.cos(t) * r, Math.sin(t) * r); else shape.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
        for (let k = 40; k >= 0; k--) { const t = -Math.PI / 2 + (k / 40) * Math.PI; shape.lineTo(Math.cos(t) * r * (1 - thickness), Math.sin(t) * r); }
        return new THREE.ShapeGeometry(shape);
      };
      // The lit limb faces the sun; the night side is only a little lighter or darker than the sky.
      const roll = sunSide > 0 ? 0.25 : Math.PI - 0.25;
      flat(new THREE.CircleGeometry(radius, 48), faint(paleSky ? '#b9c2cc' : '#101826', paleSky ? 0.45 : 0.62), behind(...at, 11.2));
      flat(crescent(radius, 0.42), faint(limb, paleSky ? 0.25 : 0.12), behind(...at, 11.15), roll);
      if (a.neighbour === 'ringed') {
        const ring = flat(new THREE.RingGeometry(radius * 1.35, radius * 1.9, 64), faint(limb, 0.45), behind(...at, 11.1), 0.4);
        ring.scale.y = 0.22;
      }
      const moons: [number, number, number][] = a.neighbour === 'earth' ? [[1.9, 1.2, 0.26]] : a.neighbour === 'rust' ? [[1.7, 0.9, 0.1], [-1.5, 1.5, 0.07]] : [[2.6, -0.9, 0.12]];
      for (const [du, dv, size] of moons) {
        flat(new THREE.CircleGeometry(size, 24), faint(paleSky ? '#b9c2cc' : '#161d2a', 0.55), behind(at[0] + du * -sunSide, at[1] + dv, 11.2));
        flat(crescent(size, 0.5), faint('#d9dde2', 0.2), behind(at[0] + du * -sunSide, at[1] + dv, 11.15), roll);
      }
    }

    const pace = mix(0.5, 3.2, mood.energy);
    return {
      ...world,
      update: (_dt, time) => {
        beacon.emissiveIntensity = off ? (Math.sin(time * pace * 0.8) > 0.6 ? 2.6 : 0.15) : 1.9 + Math.sin(time * pace) * 0.6;
        sparks.forEach((star, index) => { star.visible = Math.sin(time * pace * 9 + index * 2) + Math.sin(time * pace * 3.1 + index) > -0.2; star.rotation.y = time * 7; });
        cones.forEach((cone, index) => { cone.scale.setScalar(1 + Math.sin(time * pace * 0.7 + index) * 0.015); });
      },
    };
  },
});
