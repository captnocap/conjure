import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const NAMES = { none: '', mav: 'MAV-1', home: 'HOME', last: 'LAST CALL', hope: 'HOPE', seats: '4 SEATS' } as const;

function bandTexture(text: string, ink: string, paper: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.min(120, 620 / Math.max(text.length, 3))}px monospace`;
  ctx.fillText(text, 256, 84, 480);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    state: choice('What is happening at the pad?', {
      ready: 'Standing ready: upright, hoses stowed, ladder down, waiting for a crew.',
      fuelling: 'Being fuelled: hoses coupled, frost on the tanks, white vapour venting.',
      tipped: 'Tipped by a storm: leaning badly off a buckled pad, half drifted in.',
      gone: 'Already gone: an empty platform in a black scorch ring, hoses flung outward.',
    }),
    design: choice('What kind of rocket is it?', {
      stubby: 'A fat two-stage booster with a blunt gumdrop capsule on top.',
      pulp: 'A silver pulp-magazine rocket standing on its own swept fins.',
      cab: 'An angular ascent cabin perched on a gold-foil descent stage.',
    }),
    livery: choice('How is it painted?', {
      white: 'White with an orange band.',
      bare: 'Bare unpainted metal.',
      yellow: 'Hazard yellow and black.',
      red: 'White with a red chequered collar.',
    }),
    name: choice('What is painted on its side, if anything?', {
      none: 'Nothing.',
      mav: 'MAV-1',
      home: 'HOME',
      last: 'LAST CALL',
      hope: 'HOPE',
      seats: '4 SEATS',
    }),
    hatch: choice('What is the hatch doing?', {
      shut: 'Sealed shut.',
      open: 'Standing open on a dark cabin.',
      lit: 'Open, with warm cabin light spilling out.',
    }),
    pad: choice('What does it stand on?', {
      table: 'A steel launch table on four legs with a flame hole.',
      slab: 'A low sintered-regolith slab with a painted target ring.',
      sand: 'Nothing but its own footpads on the bare sand.',
    }),
    waiting: score('How long has it been standing there?', ['Just landed, still clean', 'Some months: dust in the seams', 'Years: drifts round the legs and faded paint']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const design = a.design;
    const dust = new THREE.Color('#b96a3f').lerp(new THREE.Color('#d6a064'), mood.warmth * 0.5);
    const age = Math.min(1, a.waiting * 0.7 + mood.wear * 0.3);
    const aged = (hex: string, amount = 1) => new THREE.Color(hex).lerp(dust, age * 0.5 * amount);
    const gone = a.state === 'gone', tipped = a.state === 'tipped';
    const bodyHex = { white: '#ece8dc', bare: '#b9bec2', yellow: '#e3b21f', red: '#efebe2' }[a.livery];
    const accentHex = { white: '#e2622a', bare: '#3a3e42', yellow: '#26272a', red: '#c23028' }[a.livery];
    const body = s.material(aged(bodyHex), { metalness: a.livery === 'bare' || design === 'pulp' ? 0.75 : 0.15, roughness: a.livery === 'bare' || design === 'pulp' ? 0.3 : 0.55 });
    const accent = s.material(aged(accentHex), { roughness: 0.6 });
    const steel = s.material(aged('#8f9498', 0.7), { metalness: 0.6, roughness: 0.45 });
    const dark = s.material('#26262a', { roughness: 0.8 });
    const soot = s.material('#1c1a1a', { roughness: 1 });
    const sand = s.material(dust, { roughness: 1 });
    const hazard = s.material(aged('#e7b81f'), { roughness: 0.6 });
    const cabin = s.material(a.hatch === 'lit' ? '#ffd98a' : '#0f1113', { emissive: a.hatch === 'lit' ? '#ffb347' : '#000000', emissiveIntensity: 1.8 });
    const glass = s.material('#1b2a36', { metalness: 0.6, roughness: 0.15 });

    // The pad.
    const pad = new THREE.Group();
    s.root.add(pad);
    const onPad = <T extends THREE.Object3D>(node: T) => { pad.add(node); return node; };
    const deckY = { table: 1.0, slab: 0.22, sand: 0 }[a.pad];
    const padR = { table: 2.1, slab: 2.8, sand: 1.9 }[a.pad];
    const deckPaint = gone ? soot : steel;
    if (a.pad === 'table') {
      const deck = onPad(s.mesh(new THREE.CylinderGeometry(padR, padR, 0.22, 8), deckPaint, [0, deckY - 0.11, 0]));
      deck.rotation.y = Math.PI / 8;
      onPad(s.ring(0.75, 0.08, [0, deckY + 0.01, 0], dark)).rotation.x = Math.PI / 2;
      onPad(s.cylinder(0.72, 0.72, 0.03, [0, deckY, 0], soot, 16));
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2 + Math.PI / 4;
        const [cx, cz] = [Math.cos(angle), Math.sin(angle)];
        onPad(s.rod([cx * (padR - 0.3), deckY - 0.2, cz * (padR - 0.3)], [cx * (padR + 0.35), 0.06, cz * (padR + 0.35)], 0.09, steel));
        onPad(s.cylinder(0.3, 0.34, 0.08, [cx * (padR + 0.35), 0.04, cz * (padR + 0.35)], dark, 12));
        onPad(s.rod([cx * (padR - 0.3), deckY - 0.2, cz * (padR - 0.3)], [Math.cos(angle + 1.57) * (padR + 0.35), 0.1, Math.sin(angle + 1.57) * (padR + 0.35)], 0.035, steel));
      }
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4 + Math.PI / 8;
        onPad(s.box([0.5, 0.03, 0.14], [Math.cos(angle) * (padR - 0.32), deckY + 0.012, Math.sin(angle) * (padR - 0.32)], i % 2 ? hazard : dark)).rotation.y = -angle + Math.PI / 2;
      }
    } else if (a.pad === 'slab') {
      onPad(s.cylinder(padR, padR + 0.25, deckY, [0, deckY / 2, 0], s.material(gone ? '#3a3230' : aged('#a98772'), { roughness: 1 }), 28));
      onPad(s.ring(padR - 0.5, 0.06, [0, deckY, 0], gone ? soot : hazard)).rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) onPad(s.box([0.9, 0.02, 0.16], [Math.cos(i * 1.57) * (padR - 1.1), deckY + 0.006, Math.sin(i * 1.57) * (padR - 1.1)], gone ? soot : hazard)).rotation.y = -i * 1.57;
    }

    // The rocket, built on its own base so it can lean or be absent.
    const rocket = new THREE.Group();
    const on = <T extends THREE.Object3D>(node: T) => { rocket.add(node); return node; };
    const bell = (y: number, size = 1) => on(s.lathe([[0.22 * size, 0.5 * size], [0.4 * size, 0.28 * size], [0.62 * size, 0]], s.material('#3b3634', { metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }), [0, y, 0]));
    let top = 5.2, hatchAt = { angle: 0.55, y: 3.42, r: 0.86 }, nameAt = { y: 1.9, r: 1.0, h: 0.5 };
    const legs = (reach: number, from: number) => {
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2 + Math.PI / 4, [cx, cz] = [Math.cos(angle), Math.sin(angle)];
        on(s.rod([cx * 0.9, from, cz * 0.9], [cx * reach, 0.06, cz * reach], 0.07, steel));
        on(s.rod([cx * 0.9, from - 0.5, cz * 0.9], [cx * reach, 0.06, cz * reach], 0.04, steel));
        on(s.cylinder(0.26, 0.3, 0.08, [cx * reach, 0.04, cz * reach], dark, 12));
      }
    };
    if (design === 'stubby') {
      bell(0.05);
      on(s.cylinder(1.0, 1.0, 2.15, [0, 1.6, 0], body, 28));
      for (const y of [0.6, 2.62]) on(s.ring(1.0, 0.05, [0, y, 0], steel)).rotation.x = Math.PI / 2;
      on(s.cylinder(0.88, 1.0, 0.3, [0, 2.82, 0], dark, 28));
      on(s.cylinder(0.86, 0.86, 1.05, [0, 3.48, 0], body, 28));
      on(s.cylinder(0.87, 0.87, 0.24, [0, 3.86, 0], accent, 28));
      if (a.livery === 'red') for (let i = 0; i < 12; i++) on(s.box([0.23, 0.12, 0.02], [Math.sin(i * Math.PI / 6) * 0.875, 3.8 + (i % 2) * 0.12, Math.cos(i * Math.PI / 6) * 0.875], s.material('#efebe2'))).rotation.y = i * Math.PI / 6;
      on(s.lathe([[0.86, 0], [0.7, 0.45], [0.45, 0.9], [0.24, 1.12], [0.0, 1.2]], body, [0, 4.0, 0]));
      on(s.cylinder(0.25, 0.3, 0.14, [0, 5.1, 0], accent, 16));
      for (let i = 0; i < 4; i++) on(s.box([0.2, 0.26, 0.16], [Math.cos(i * 1.57 + 0.3) * 0.9, 3.1, Math.sin(i * 1.57 + 0.3) * 0.9], dark));
      for (let i = 0; i < 3; i++) on(s.ball([0.34, 0.34, 0.34], [Math.cos(i * 2.094 + 2.2) * 1.12, 0.75, Math.sin(i * 2.094 + 2.2) * 1.12], steel, 14));
      const pane = on(s.cylinder(0.17, 0.17, 0.06, [Math.sin(-0.4) * 0.62, 4.5, Math.cos(-0.4) * 0.62], glass, 14));
      pane.rotation.set(Math.PI / 2 - 0.42, 0, 0);
      pane.rotation.order = 'YXZ';
      pane.rotation.y = -0.4;
      if (a.pad === 'sand') legs(1.75, 1.3);
    } else if (design === 'pulp') {
      top = 6.3;
      const curve = (t: number) => 0.98 * Math.sin(Math.min(1, t * 1.25 + 0.22) * Math.PI * 0.5 + (t > 0.62 ? 0 : 0)) * (t > 0.5 ? Math.cos((t - 0.5) * Math.PI) ** 0.75 : 1);
      const hull: [number, number][] = [];
      for (let i = 0; i <= 24; i++) hull.push([Math.max(curve(i / 24), 0.02), 0.8 + (i / 24) * 5.2]);
      on(s.lathe(hull, body));
      const nose: [number, number][] = [];
      for (let i = 19; i <= 24; i++) nose.push([Math.max(curve(i / 24), 0.02) + 0.012, 0.8 + (i / 24) * 5.2]);
      on(s.lathe(nose, accent));
      on(s.rod([0, 6.0, 0], [0, 6.75, 0], 0.03, steel, 0.008));
      on(s.ring(0.99, 0.05, [0, 2.4, 0], accent)).rotation.x = Math.PI / 2;
      bell(0.35, 0.9);
      const fin = new THREE.Shape();
      fin.moveTo(0.75, 2.6); fin.lineTo(1.25, 1.5); fin.lineTo(1.95, 0); fin.lineTo(1.55, 0); fin.lineTo(0.85, 0.9); fin.lineTo(0.75, 0.9);
      for (let i = 0; i < 4; i++) {
        const blade = on(s.mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.08, bevelEnabled: false }).translate(0, 0, -0.04), accent));
        blade.rotation.y = i * Math.PI / 2 + Math.PI / 4;
      }
      for (const y of [3.9, 4.6]) {
        const r = curve((y - 0.8) / 5.2);
        const pane = on(s.cylinder(0.16, 0.16, 0.08, [Math.sin(-0.35) * r, y, Math.cos(-0.35) * r], glass, 14));
        pane.rotation.order = 'YXZ';
        pane.rotation.set(Math.PI / 2, -0.35, 0);
        const rim = on(s.ring(0.17, 0.03, [Math.sin(-0.35) * (r + 0.03), y, Math.cos(-0.35) * (r + 0.03)], steel));
        rim.rotation.y = -0.35;
      }
      hatchAt = { angle: 0.6, y: 3.1, r: curve((3.1 - 0.8) / 5.2) };
      nameAt = { y: 2.0, r: curve((2.0 - 0.8) / 5.2) + 0.005, h: 0.42 };
    } else {
      top = 4.1;
      bell(0.05, 0.9);
      const foil = s.material(aged('#c99a2e'), { metalness: 0.75, roughness: 0.35, flatShading: true });
      on(s.mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.95, 8), foil, [0, 0.98, 0])).rotation.y = Math.PI / 8;
      on(s.cylinder(1.2, 1.2, 0.08, [0, 1.48, 0], dark, 8));
      const cab = on(s.mesh(new THREE.IcosahedronGeometry(1.15, 0), s.material(aged(bodyHex), { roughness: 0.5, metalness: 0.2, flatShading: true }), [0, 2.55, 0]));
      cab.scale.set(1.05, 0.95, 0.95);
      cab.rotation.y = 0.3;
      on(s.cylinder(0.4, 0.4, 0.35, [0, 3.65, 0], steel, 14));
      on(s.cylinder(0.44, 0.44, 0.06, [0, 3.84, 0], accent, 14));
      for (const side of [-1, 1]) on(s.ball([0.42, 0.42, 0.42], [side * 1.2, 2.2, -0.35], steel, 14));
      const dish = on(s.lathe([[0.02, 0], [0.25, 0.05], [0.42, 0.16]], s.material('#e6e2d6', { side: THREE.DoubleSide }), [-0.7, 3.75, -0.3]));
      dish.rotation.set(0.5, 0, 0.6);
      on(s.rod([-0.55, 3.3, -0.25], [-0.7, 3.75, -0.3], 0.025, steel));
      for (const side of [-1, 1]) {
        const pane = on(s.mesh(new THREE.CircleGeometry(0.26, 3), glass, [side * 0.38 - 0.2, 2.95, 0.93]));
        pane.rotation.set(-0.35, side * 0.3 - 0.2, side * 0.5 + 0.5);
      }
      legs(2.25, 1.35);
      hatchAt = { angle: 0.75, y: 2.35, r: 0.98 };
      nameAt = { y: 1.0, r: 1.47, h: 0.42 };
    }
    // Name band, wrapped to the hull.
    if (a.name !== 'none') {
      const arc = Math.min(1.25, (NAMES[a.name].length * 0.3 + 0.3) / nameAt.r);
      const band = on(s.mesh(new THREE.CylinderGeometry(nameAt.r + 0.012, nameAt.r + 0.012, nameAt.h, 14, 1, true, -arc / 2 + 0.25, arc),
        new THREE.MeshStandardMaterial({ map: bandTexture(NAMES[a.name], `#${aged(a.livery === 'yellow' ? '#26272a' : accentHex).getHexString()}`, `#${aged(bodyHex).getHexString()}`), roughness: 0.6 }), [0, nameAt.y, 0]));
      band.castShadow = false;
    }
    // Hatch.
    const hx = Math.sin(hatchAt.angle), hz = Math.cos(hatchAt.angle);
    const hatch = new THREE.Group();
    hatch.position.set(hx * hatchAt.r, hatchAt.y, hz * hatchAt.r);
    hatch.rotation.y = hatchAt.angle;
    rocket.add(hatch);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 8, 20), steel);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 18).rotateX(Math.PI / 2), a.hatch === 'shut' ? body : cabin);
    hatch.add(frame, hole);
    if (a.hatch === 'shut') {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 6, 14), dark);
      wheel.position.z = 0.05;
      hatch.add(wheel);
    } else {
      const door = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 18).rotateX(Math.PI / 2), body);
      door.position.set(-0.6, 0, 0.22);
      door.rotation.y = -1.1;
      door.castShadow = true;
      hatch.add(door);
    }

    // Stand the rocket, lean it, or leave only its mark.
    const drifts: [number, number, number, number][] = [];
    if (!gone) {
      rocket.position.y = deckY;
      if (tipped) {
        const lean = 0.42 + random() * 0.22, toward = 2.4 + random() * 0.6;
        rocket.rotation.set(0, 0, 0);
        rocket.rotateOnWorldAxis(new THREE.Vector3(Math.cos(toward), 0, -Math.sin(toward)), lean);
        rocket.position.x += Math.sin(toward) * 0.5;
        rocket.position.z += Math.cos(toward) * 0.5;
        rocket.position.y -= 0.15;
        pad.rotation.set(Math.cos(toward) * 0.09, 0, -Math.sin(toward) * 0.09);
        pad.position.y = -0.12;
        drifts.push([Math.sin(toward) * (padR + 0.3), Math.cos(toward) * (padR + 0.3), 1.5, 0.55]);
        // A prop someone wedged under it afterwards.
        const propTop = new THREE.Vector3(0, top * 0.55, 0).applyEuler(rocket.rotation).add(rocket.position);
        s.rod([propTop.x + Math.sin(toward) * 2.3, 0, propTop.z + Math.cos(toward) * 2.3], [propTop.x + Math.sin(toward) * 0.5, propTop.y - 0.2, propTop.z + Math.cos(toward) * 0.5], 0.07, hazard);
      }
      s.root.add(rocket);
    } else {
      // Scorch ring and rays.
      s.cylinder(padR + 2.0, padR + 2.3, 0.016, [0, 0.008, 0], s.material(dust.clone().multiplyScalar(0.2), { roughness: 1 }), 32).castShadow = false;
      s.ring(padR + 2.15, 0.12, [0, 0, 0], s.material(dust.clone().lerp(new THREE.Color('#f0d8b8'), 0.45), { roughness: 1 })).rotation.x = Math.PI / 2;
      const rays = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.012, 1), soot, 22);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 22; i++) {
        const angle = (i / 22) * Math.PI * 2 + random() * 0.2, length = 0.6 + random() * 1.3;
        dummy.position.set(Math.cos(angle) * (padR + 2.2 + length / 2), 0.007, Math.sin(angle) * (padR + 2.2 + length / 2));
        dummy.rotation.y = -angle;
        dummy.scale.set(length, 1, 0.1 + random() * 0.16);
        dummy.updateMatrix();
        rays.setMatrixAt(i, dummy.matrix);
      }
      s.root.add(rays);
      // What stays behind: the dropped descent hardware.
      if (design === 'cab') {
        const left = s.mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.95, 8), soot, [0, deckY + 0.98, 0]);
        left.rotation.y = Math.PI / 8;
        for (let i = 0; i < 4; i++) {
          const angle = i * Math.PI / 2 + Math.PI / 4;
          s.rod([Math.cos(angle) * 0.9, deckY + 1.35, Math.sin(angle) * 0.9], [Math.cos(angle) * 2.25, deckY + 0.06, Math.sin(angle) * 2.25], 0.07, soot);
        }
      } else s.ring(0.95, 0.07, [0, deckY + 0.06, 0], soot).rotation.x = Math.PI / 2;
    }

    // Ladder to the hatch: up when there is something to climb, down in the dirt otherwise.
    const ladder = new THREE.Group();
    const railLength = Math.hypot(deckY + hatchAt.y - 0.45, padR + 0.5 - hatchAt.r - 0.15);
    const ladderPaint = gone ? soot : hazard;
    for (const side of [-0.24, 0.24]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, railLength, 6), ladderPaint);
      rail.position.set(side, railLength / 2, 0);
      rail.castShadow = true;
      ladder.add(rail);
    }
    for (let y = 0.25; y < railLength; y += 0.3) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.035, 0.05), ladderPaint);
      rung.position.y = y;
      ladder.add(rung);
    }
    if (gone || tipped) {
      ladder.position.set(hx * (padR + 1.2) + 0.6, 0.05, hz * (padR + 1.2));
      ladder.rotation.set(Math.PI / 2 - 0.03, 0, 0.7 + random());
      ladder.rotation.order = 'YXZ';
    } else {
      ladder.position.set(hx * (padR + 0.5), 0, hz * (padR + 0.5));
      ladder.rotation.order = 'YXZ';
      ladder.rotation.set(-Math.atan2(padR + 0.5 - hatchAt.r - 0.15, deckY + hatchAt.y - 0.45), hatchAt.angle, 0);
    }
    s.root.add(ladder);

    // Propellant farm, umbilical mast and hoses on the -x side.
    const tankX = -(padR + 1.9);
    const frost = a.state === 'fuelling';
    const tankPaint = s.material(frost ? '#f4f7f8' : aged('#d8d5cb'), { roughness: frost ? 0.9 : 0.45, metalness: frost ? 0 : 0.3 });
    const tanks = [-1.15, 1.15];
    for (const z of tanks) {
      const tank = s.mesh(new THREE.CapsuleGeometry(0.6, 1.5, 8, 16), tankPaint, [tankX, 0.85, z]);
      tank.rotation.z = Math.PI / 2;
      for (const dx of [-0.6, 0.6]) s.box([0.14, 0.5, 1.0], [tankX + dx, 0.25, z], dark);
      s.cylinder(0.12, 0.12, 0.18, [tankX + 0.4, 1.5, z], steel, 10);
      s.ring(0.61, 0.03, [tankX - 0.2, 0.85, z], z < 0 ? s.material('#3f86c9') : s.material('#d7572b')).rotation.y = Math.PI / 2;
    }
    const mastTop = Math.min(deckY + top * 0.62, deckY + 3.6), mastX = -(padR + 0.55);
    const mastLean = gone ? -0.45 : tipped ? -0.12 : 0;
    const mast = new THREE.Group();
    mast.position.set(mastX, 0, 0);
    mast.rotation.z = -mastLean;
    s.root.add(mast);
    const mastPaint = gone ? soot : steel;
    for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, mastTop, 6), mastPaint);
      post.position.set(dx, mastTop / 2, dz);
      post.castShadow = true;
      mast.add(post);
    }
    for (let y = 0.4; y < mastTop; y += 0.55) {
      const brace = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 4, 4), mastPaint);
      brace.rotation.set(Math.PI / 2, 0, Math.PI / 4);
      brace.position.y = y;
      mast.add(brace);
    }
    const beaconOn = !gone && !tipped;
    const beacon = s.material(frost ? '#ff3b2a' : '#55e07a', { emissive: frost ? '#ff2a18' : '#30d060', emissiveIntensity: beaconOn ? 2 : 0 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), beaconOn ? beacon : dark);
    lamp.position.y = mastTop + 0.12;
    mast.add(lamp);
    const hosePaint = s.material(gone ? '#1f1d1d' : '#2f3033', { roughness: 0.8 });
    tanks.forEach((z, i) => {
      const from: [number, number, number] = [tankX + 0.4, 1.58, z];
      let path: [number, number, number][];
      if (a.state === 'fuelling' || (tipped && i === 0)) {
        const port = new THREE.Vector3(-0.98, i ? 1.3 : 1.9, z * 0.25);
        if (design === 'cab') port.set(-1.4, 1.0, z * 0.3);
        if (design === 'pulp') port.set(-0.95, 2.2 + i * 0.5, z * 0.2);
        port.applyEuler(rocket.rotation).add(rocket.position);
        path = [from, [tankX + 0.9, 1.9, z * 0.9], [mastX - 0.6, 0.3, z * 0.7], [mastX - 0.1, Math.max(port.y * 0.6, 0.5), z * 0.4], [port.x, port.y, port.z]];
        s.ball([0.12, 0.12, 0.12], [port.x, port.y, port.z], hazard, 10);
      } else if (gone) {
        path = [from, [tankX + 0.3, 1.8, z * 1.3], [tankX - 0.3, 0.1, z * 2.0], [tankX - 1.3 - random(), 0.08, z * 2.6 + (random() - 0.5)]];
      } else {
        path = [from, [tankX + 1.0, 1.75, z * 0.9], [tankX + 1.7, 0.1, z * 1.1], [tankX + 2.3, 0.08, z * 1.6], [tankX + 1.9, 0.08, z * 2.0]];
        s.ring(0.35, 0.07, [tankX + 1.75, 0.08, z * 2.0 + Math.sign(z) * 0.2], hosePaint).rotation.x = Math.PI / 2;
      }
      s.tube(path, 0.07, hosePaint);
    });
    // Venting vapour while fuelling.
    const puffs: { mesh: THREE.Mesh; base: number; phase: number }[] = [];
    if (frost) {
      const vapour = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, roughness: 1, depthWrite: false });
      const sources: [number, number, number][] = [[-1.1, deckY + 1.9, 0.3], [-1.3, deckY + 1.4, -0.3], [tankX + 0.4, 1.8, 1.15], [tankX + 0.4, 1.8, -1.15], [0.3, deckY + 0.4, 0.9], [-0.5, deckY + 0.35, -0.8]];
      for (const [x, y, z] of sources) for (let i = 0; i < 3; i++) {
        const mesh = s.ball([0.3 + i * 0.14, 0.24 + i * 0.1, 0.3 + i * 0.14], [x - i * 0.25, y + i * 0.2, z + (random() - 0.5) * 0.3], vapour, 10);
        mesh.castShadow = false;
        puffs.push({ mesh, base: y + i * 0.2, phase: random() * 6 });
      }
      // Frost collar on the first stage.
      if (design === 'stubby') on(s.cylinder(1.012, 1.012, 0.8, [0, 1.15, 0], s.material('#f6f9fa', { roughness: 1 }), 28));
    }

    // Dust drifts and yard clutter.
    const driftCount = Math.round(age * 4);
    for (let i = 0; i < driftCount; i++) {
      const angle = random() * Math.PI * 2;
      drifts.push([Math.cos(angle) * (padR + 0.1), Math.sin(angle) * (padR + 0.1), 0.6 + random() * 0.5, 0.12 + age * 0.2]);
    }
    for (const [x, z, wide, high] of drifts) s.ball([wide, high, wide * 0.7], [x, 0, z], sand, 14).rotation.y = random() * 3;
    const crates = Math.round(mix(0, 5, mood.density));
    for (let i = 0; i < crates; i++) {
      const angle = mix(-0.6, 0.35, random()), r = padR + 1.2 + random() * 1.2;
      s.box([0.7, 0.5 + random() * 0.3, 0.7], [Math.sin(angle) * r, 0.3, Math.cos(angle) * r], random() < 0.5 ? hazard : s.material(aged('#d8d5cb'))).rotation.y = random() * 3;
    }

    const pace = mix(0.4, 2.2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (beaconOn) beacon.emissiveIntensity = frost ? (Math.sin(time * 5 * pace) > 0 ? 2.4 : 0.2) : 1.6 + Math.sin(time * 1.5) * 0.4;
        for (const puff of puffs) {
          const breath = (time * 0.35 * pace + puff.phase) % 1;
          puff.mesh.position.y = puff.base + breath * 0.9;
          const size = 0.7 + breath * 0.9;
          puff.mesh.scale.setScalar(size * 0.4);
        }
      },
    });
  },
});
