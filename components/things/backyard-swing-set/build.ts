import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const PAINTS = {
  'candy-stripe': ['#d8352f', '#f3efe4'],
  'sky-blue': ['#4f9bd6', '#4f9bd6'],
  'bottle-green': ['#2f6b4a', '#2f6b4a'],
  'sun-yellow': ['#f0c12e', '#f0c12e'],
  galvanised: ['#aeb5b6', '#aeb5b6'],
  'faded-pink': ['#e4a2ad', '#e4a2ad'],
} as const;

export default defineThing({
  questions: {
    paint: choice('What colour is the frame painted?', {
      'candy-stripe': 'Red and white barber stripes spiralling up the legs, a catalogue toy.',
      'sky-blue': 'Cheerful sky blue enamel.',
      'bottle-green': 'Dark bottle green that disappears against a hedge.',
      'sun-yellow': 'Bright yellow, loud against the lawn.',
      galvanised: 'Bare grey galvanised tube, never painted.',
      'faded-pink': 'Pink bleached almost white by years of sun.',
    }),
    seats: choice('What are the swing seats made of?', {
      belt: 'Black rubber belt seats that curl around you.',
      plank: 'Flat wooden planks, grey and splintery.',
      moulded: 'Moulded plastic in a primary colour.',
      tyre: 'Old car tyres hung flat on chains.',
    }),
    second: choice('What has happened to the second swing?', {
      working: 'It hangs level and ready, a matching pair.',
      snapped: 'One chain has snapped; the seat dangles on end from the other.',
      'tied-up': 'Thrown over the top bar and wound up out of reach.',
      gone: 'Removed; only the hooks and a stub of chain remain.',
      'baby-seat': 'Swapped for a high-backed baby bucket seat.',
    }),
    extra: choice('What else hangs from the frame?', {
      none: 'Nothing; just the two swings.',
      glider: 'A two-seat face-to-face glider on rigid rods.',
      trapeze: 'A trapeze bar with a pair of gym rings.',
      rope: 'A thick knotted climbing rope.',
    }),
    movement: choice('How is the first swing moving right now?', {
      'just-left': 'Swinging high and crooked, someone jumped off seconds ago.',
      drifting: 'Rocking gently, almost stopped.',
      wind: 'Both seats stirring a little in the wind.',
      still: 'Hanging dead still.',
    }),
    left: choice('What was left behind beneath it?', {
      nothing: 'Nothing.',
      sandals: 'A small pair of sandals kicked off in the grass.',
      cardigan: 'A red cardigan draped over a seat.',
      ball: 'A plastic football rolled against a leg.',
      'skipping-rope': 'A skipping rope dropped in a loop.',
    }),
    scuffed: noul('Are there bare dirt patches worn under the seats by dragging feet?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;

    // Paint: canvas so stripes, rust blooms and chips show on every tube.
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 256;
    const g = canvas.getContext('2d')!;
    const [c1, c2] = PAINTS[a.paint];
    g.fillStyle = c1; g.fillRect(0, 0, 64, 256);
    if (c1 !== c2) {
      g.fillStyle = c2;
      for (let y = -64; y < 256; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y + 64); g.lineTo(64, y + 96); g.lineTo(0, y + 32); g.fill(); }
    }
    const blooms = Math.round(wear * wear * 90);
    for (let i = 0; i < blooms; i++) {
      g.fillStyle = ['#7c4322', '#9a5a2c', '#5e3219'][Math.floor(random() * 3)];
      g.globalAlpha = 0.55 + random() * 0.45;
      g.beginPath(); g.ellipse(random() * 64, random() * 256, 3 + random() * 10 * wear, 4 + random() * 22 * wear, 0, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const paint = new THREE.MeshStandardMaterial({ map: tex, roughness: mix(0.35, 0.9, wear), metalness: a.paint === 'galvanised' ? 0.5 : 0.15 });
    const steel = s.material(new THREE.Color('#9aa1a3').lerp(new THREE.Color('#7a4a2a'), wear * 0.7), { metalness: 0.6, roughness: mix(0.35, 0.85, wear) });
    const rust = s.material('#74401f', { roughness: 0.95 });
    const dark = s.material('#1f2022', { roughness: 0.8 });
    const wood = s.material(new THREE.Color('#b98a52').lerp(new THREE.Color('#8a8a84'), wear * 0.8), { roughness: 0.9 });
    const plasticColour = ['#e23b2e', '#2f6fd0', '#f2c230', '#2fa56a'][Math.floor(random() * 4)];
    const plastic = s.material(plasticColour, { roughness: 0.4 });

    const bays = a.extra === 'none' ? 2 : 3;
    const pitch = 0.92, H = 2.2, W = bays * pitch + 0.35, spread = 0.95, flare = 0.22;

    // Frame.
    s.rod([-W / 2 - 0.06, H, 0], [W / 2 + 0.06, H, 0], 0.044, paint);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        s.rod([sx * (W / 2 + flare), -0.05, sz * spread], [sx * W / 2, H + 0.02, 0], 0.038, paint);
        s.cylinder(0.04, 0.045, 0.06, [sx * (W / 2 + flare), 0.03, sz * spread], dark, 10);
      }
      const t = 0.34;
      s.rod([sx * (W / 2 + flare * (1 - t)), H * t, -spread * (1 - t)], [sx * (W / 2 + flare * (1 - t)), H * t, spread * (1 - t)], 0.022, paint);
      s.ball([0.05, 0.05, 0.05], [sx * (W / 2 + 0.07), H, 0], dark, 10);
      if (wear > 0.35) s.cylinder(0.04, 0.04, 0.16, [sx * W / 2, H - 0.06, 0], rust, 10).rotation.z = sx * 0.1;
    }
    if (wear > 0.75) s.root.rotation.z = (random() - 0.5) * 0.06;

    const linkGeo = new THREE.TorusGeometry(0.028, 0.009, 5, 8);
    const chain = (group: THREE.Group, from: THREE.Vector3, to: THREE.Vector3) => {
      const length = from.distanceTo(to), count = Math.max(2, Math.round(length / 0.042));
      const links = new THREE.InstancedMesh(linkGeo, steel, count);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), dir = to.clone().sub(from).normalize();
      const base = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      for (let i = 0; i < count; i++) {
        q.copy(base).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i % 2 ? Math.PI / 2 : 0));
        m.compose(from.clone().lerp(to, (i + 0.5) / count), q, new THREE.Vector3(0.75, 1, 1));
        links.setMatrixAt(i, m);
      }
      links.castShadow = true;
      group.add(links);
    };
    const part = (group: THREE.Group, mesh: THREE.Mesh) => { group.add(mesh); return mesh; };
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

    interface Pivot { group: THREE.Group; amp: number; phase: number; rate: number; twist: number }
    const pivots: Pivot[] = [];
    const L = H - 0.52, hw = 0.2;

    const seat = (group: THREE.Group, kind: typeof a.seats | 'baby', at: THREE.Vector3) => {
      const seatGroup = new THREE.Group();
      seatGroup.position.copy(at);
      group.add(seatGroup);
      if (kind === 'belt') {
        const curve = new THREE.Shape();
        curve.moveTo(-hw, 0.05); curve.quadraticCurveTo(0, -0.07, hw, 0.05); curve.lineTo(hw, 0.075); curve.quadraticCurveTo(0, -0.045, -hw, 0.075);
        const mesh = part(seatGroup, s.mesh(new THREE.ExtrudeGeometry(curve, { depth: 0.15, bevelEnabled: false }), dark));
        mesh.position.z = -0.075;
      } else if (kind === 'plank') {
        part(seatGroup, s.box([hw * 2 + 0.08, 0.03, 0.17], [0, 0, 0], wood));
      } else if (kind === 'moulded') {
        part(seatGroup, s.box([hw * 2 + 0.06, 0.035, 0.2], [0, 0, 0], plastic));
        part(seatGroup, s.box([hw * 2 + 0.06, 0.05, 0.025], [0, 0.03, -0.1], plastic));
        part(seatGroup, s.box([hw * 2 + 0.06, 0.03, 0.025], [0, 0.015, 0.1], plastic));
      } else if (kind === 'tyre') {
        const tyre = part(seatGroup, s.mesh(new THREE.TorusGeometry(0.2, 0.085, 10, 24), dark));
        tyre.rotation.x = Math.PI / 2;
      } else {
        const red = s.material('#d8402f', { roughness: 0.45 });
        part(seatGroup, s.box([0.34, 0.04, 0.3], [0, -0.1, 0], red));
        part(seatGroup, s.box([0.34, 0.42, 0.04], [0, 0.1, -0.15], red));
        for (const x of [-1, 1]) part(seatGroup, s.box([0.04, 0.24, 0.3], [x * 0.17, 0.02, 0], red));
        part(seatGroup, s.box([0.34, 0.05, 0.04], [0, 0.11, 0.15], s.material('#f2c230')));
        part(seatGroup, s.box([0.05, 0.2, 0.04], [0, 0, 0.15], s.material('#f2c230')));
      }
      return seatGroup;
    };

    const swing = (x: number, state: typeof a.second, amp: number, phase: number) => {
      const group = new THREE.Group();
      group.position.set(x, H - 0.04, 0);
      s.root.add(group);
      for (const sx of [-1, 1]) { const hook = part(group, s.mesh(new THREE.TorusGeometry(0.04, 0.009, 6, 12), steel)); hook.position.set(sx * hw, 0, 0); hook.rotation.y = Math.PI / 2; }
      let seatGroup: THREE.Group | null = null;
      if (state === 'working' || state === 'baby-seat') {
        const kind = state === 'baby-seat' ? 'baby' : a.seats;
        const drop = kind === 'baby' ? L - 0.25 : L;
        for (const sx of [-1, 1]) chain(group, V(sx * hw, -0.04, 0), V(sx * hw, -drop, 0));
        seatGroup = seat(group, kind, V(0, -drop - (kind === 'tyre' ? 0.06 : 0), 0));
      } else if (state === 'snapped') {
        chain(group, V(-hw, -0.04, 0), V(-hw, -L, 0));
        chain(group, V(hw, -0.04, 0), V(hw, -0.3 - random() * 0.4, 0));
        seatGroup = seat(group, a.seats === 'tyre' ? 'plank' : a.seats, V(-hw, -L - hw, 0));
        seatGroup.rotation.z = Math.PI / 2 - 0.12;
        amp *= 0.5;
      } else if (state === 'tied-up') {
        for (const sx of [-1, 1]) {
          for (let turn = 0; turn < 3; turn++) { const loop = part(group, s.mesh(new THREE.TorusGeometry(0.058, 0.011, 6, 14), steel)); loop.position.set(sx * (hw - 0.03 + turn * 0.03), 0.04, 0); loop.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.3; }
          chain(group, V(sx * hw, -0.05, 0.03), V(sx * hw, -0.42, 0.05));
        }
        seatGroup = seat(group, a.seats === 'tyre' ? 'belt' : a.seats, V(0, -0.45, 0.05));
        seatGroup.rotation.z = (random() - 0.5) * 0.3;
        amp = 0;
      } else {
        chain(group, V(-hw, -0.04, 0), V(-hw, -0.12 - random() * 0.5, 0));
        amp *= 0.3;
      }
      const twist = state === 'working' ? (random() - 0.5) * 0.5 * amp : 0;
      pivots.push({ group, amp, phase, rate: Math.sqrt(9.8 / L), twist });
      return seatGroup;
    };

    const energy = mix(0.55, 1.25, mood.energy);
    const amp1 = { 'just-left': 0.62, drifting: 0.24, wind: 0.16, still: 0 }[a.movement] * energy;
    const amp2 = { 'just-left': 0.07, drifting: 0.03, wind: 0.13, still: 0 }[a.movement] * energy;
    const x0 = -(bays - 1) / 2 * pitch;
    const seat1 = swing(x0, 'working', amp1, random() * 0.5);
    swing(x0 + pitch, a.second, amp2, 1.3 + random() * 2);

    if (a.extra !== 'none') {
      const x = x0 + pitch * 2;
      const group = new THREE.Group();
      group.position.set(x, H - 0.04, 0);
      s.root.add(group);
      if (a.extra === 'glider') {
        const drop = H - 0.3;
        for (const sx of [-1, 1]) {
          part(group, s.rod([sx * 0.26, 0, 0], [sx * 0.26, -drop, 0], 0.016, paint));
          part(group, s.rod([sx * 0.26, -drop, -0.52], [sx * 0.26, -drop, 0.52], 0.018, paint));
        }
        part(group, s.box([0.5, 0.025, 0.5], [0, -drop + 0.01, 0], wood));
        part(group, s.rod([-0.26, -drop + 0.75, 0], [0.26, -drop + 0.75, 0], 0.014, paint));
        for (const sz of [-1, 1]) {
          part(group, s.box([0.56, 0.03, 0.22], [0, -drop + 0.3, sz * 0.46], plastic));
          part(group, s.box([0.56, 0.3, 0.03], [0, -drop + 0.47, sz * 0.57], plastic)).rotation.x = sz * 0.15;
          for (const sx of [-1, 1]) part(group, s.rod([sx * 0.26, -drop, sz * 0.46], [sx * 0.26, -drop + 0.3, sz * 0.46], 0.014, paint));
        }
        pivots.push({ group, amp: amp2 * 0.6, phase: 2.2, rate: 2.1, twist: 0 });
      } else if (a.extra === 'trapeze') {
        for (const sx of [-1, 1]) chain(group, V(sx * 0.24, -0.02, 0), V(sx * 0.24, -1.05, 0));
        part(group, s.rod([-0.3, -1.05, 0], [0.3, -1.05, 0], 0.017, wood));
        for (const sx of [-1, 1]) {
          chain(group, V(sx * 0.24, -1.07, 0), V(sx * 0.24, -1.3, 0));
          part(group, s.mesh(new THREE.TorusGeometry(0.085, 0.014, 8, 20), plastic)).position.set(sx * 0.24, -1.4, 0);
        }
        pivots.push({ group, amp: amp2 * 1.2 + 0.02, phase: 4, rate: 3, twist: 0 });
      } else {
        const rope = s.material('#c9b48a', { roughness: 1 });
        part(group, s.rod([0, 0, 0], [0, -1.85, 0], 0.024, rope));
        for (let k = 0; k < 5; k++) part(group, s.ball([0.045, 0.04, 0.045], [0, -0.45 - k * 0.34, 0], rope, 10));
        part(group, s.cylinder(0.035, 0.01, 0.1, [0, -1.9, 0], rope, 8));
        pivots.push({ group, amp: amp2 * 1.5 + 0.02, phase: 5, rate: 2.3, twist: 0 });
      }
    }

    // What the garden remembers.
    if (a.scuffed) {
      const dirt = s.material('#7b5e3f', { roughness: 1 });
      for (let i = 0; i < 2; i++) {
        if (i === 1 && (a.second === 'gone' || a.second === 'tied-up')) continue;
        const patch = s.mesh(new THREE.CircleGeometry(1, 20), dirt, [x0 + i * pitch + (random() - 0.5) * 0.08, 0.006, (random() - 0.5) * 0.1]);
        patch.rotation.x = -Math.PI / 2; patch.scale.set(0.26 + random() * 0.08, 0.55 + random() * 0.2, 1); patch.castShadow = false;
      }
    }
    if (a.left === 'sandals') {
      const strap = s.material('#3c6fb5');
      for (let i = 0; i < 2; i++) {
        const sx = x0 + 0.1 + i * 0.16 + random() * 0.05, sz = 0.55 + random() * 0.2, turn = (random() - 0.5) * 1.4;
        const sole = s.box([0.075, 0.018, 0.17], [sx, 0.012, sz], s.material('#d9c9a3')); sole.rotation.y = turn;
        const band = s.box([0.085, 0.035, 0.03], [sx, 0.03, sz], strap); band.rotation.y = turn;
      }
    } else if (a.left === 'cardigan' && seat1) {
      const red = s.material('#c0362c', { roughness: 1 });
      const drape = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.3), red); drape.position.set(0.04, 0.035, 0); drape.castShadow = true; seat1.add(drape);
      for (const sz of [-1, 1]) { const flap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26 + random() * 0.1, 0.03), red); flap.position.set(0.04, -0.1, sz * 0.15); flap.rotation.x = sz * 0.12; flap.castShadow = true; seat1.add(flap); }
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.03), red); sleeve.position.set(0.21, -0.13, 0.13); sleeve.rotation.z = 0.35; sleeve.castShadow = true; seat1.add(sleeve);
    } else if (a.left === 'ball') {
      const ball = s.ball([0.11, 0.11, 0.11], [W / 2 + flare - 0.2, 0.11, spread - 0.22], s.material('#f1ede2', { roughness: 0.5 }), 16);
      for (let i = 0; i < 5; i++) { const spot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), dark); spot.position.setFromSphericalCoords(0.86, 0.5 + i * 0.55, i * 2.1); ball.add(spot); }
    } else if (a.left === 'skipping-rope') {
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12 * Math.PI * 1.7; pts.push([x0 + 0.3 + Math.cos(t) * (0.3 + 0.08 * Math.sin(t * 3)), 0.012, 0.75 + Math.sin(t) * 0.22]); }
      s.tube(pts, 0.009, s.material('#e9e3d2'));
      const handle = s.material('#d8352f');
      for (const end of [pts[0], pts[12]]) s.cylinder(0.016, 0.016, 0.12, [end[0], 0.018, end[2]], handle, 8).rotation.set(Math.PI / 2, 0, random() * 3);
    }

    const pose = (time: number) => {
      for (const p of pivots) {
        p.group.rotation.x = p.amp * Math.cos(time * p.rate + p.phase);
        p.group.rotation.y = p.twist * Math.sin(time * p.rate * 0.61 + p.phase);
      }
    };
    pose(0);
    const thing = s.finish({ update: (_dt, time) => pose(time) });
    return thing;
  },
});
