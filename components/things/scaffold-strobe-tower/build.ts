import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { glow, paint, pick, pickSkin, rig } from './rig';

const PALETTES = {
  'red-blue': ['#ff2a3a', '#2a6cff'],
  'green-magenta': ['#3dff5a', '#ff3fb0'],
  amber: ['#ffb02a', '#ff7a1a'],
  white: ['#fff4e0', '#e8f0ff'],
  rainbow: ['#ff2a3a', '#ffb02a', '#3dff5a', '#2a6cff', '#b04dff'],
} as const;
const BANNERS = {
  'free-party': { say: 'FREE PARTY in dripping red.', text: 'FREE PARTY', ink: '#e62d2d', paper: '#f1e9d2' },
  'sound-system': { say: 'SOUND SYSTEM in block white on black.', text: 'SOUND SYSTEM', ink: '#f4f4f0', paper: '#1d1d1f' },
  'no-sleep': { say: 'NO SLEEP TIL DAWN in yellow.', text: 'NO SLEEP TIL DAWN', ink: '#f2e21c', paper: '#1d1d1f' },
  peace: { say: 'PEACE LOVE UNITY in rainbow letters.', text: 'PEACE LOVE UNITY', ink: '#ff3fb0', paper: '#2b6cc4' },
  stage: { say: 'STAGE 2 stencilled in black on orange.', text: 'STAGE 2', ink: '#1d1d1f', paper: '#ff8c1a' },
} as const;

export default defineThing({
  questions: {
    height: choice('How tall is the tower?', {
      low: 'Two lifts, head height: a lighting stand for a small room.',
      mid: 'Three lifts, about three metres.',
      tall: 'Four lifts, four metres, a proper tower.',
      towering: 'Six lifts, towering over everything.',
    }),
    lit: choice('Which lights are on?', {
      all: 'Everything lit: par cans, LED bars and the strobe going.',
      pars: 'Only the par cans, steady colour.',
      leds: 'Only the LED bars, chasing colour.',
      strobe: 'Only the strobe, flashing white.',
      dark: 'Nothing lit yet: still rigging.',
    }),
    colour: choice('What colour is the light?', {
      'red-blue': 'Red and blue.',
      'green-magenta': 'Acid green and magenta.',
      amber: 'Warm amber and orange.',
      white: 'Plain white.',
      rainbow: 'Every colour at once.',
    }),
    side: choice('What hangs off one side?', {
      banner: 'A painted banner.',
      tarp: 'A blue tarpaulin lashed on against the rain.',
      flag: 'A flag on a pole from the top corner.',
      bare: 'Nothing: bare tubes.',
    }),
    banner: choice('If there is a banner, what does it say?', Object.fromEntries(Object.entries(BANNERS).map(([k, v]) => [k, v.say])) as Record<keyof typeof BANNERS, string>),
    base: choice('What weighs the base down?', {
      sandbags: 'Sandbags on every foot.',
      drums: 'Blue water drums strapped to two legs.',
      bare: 'Nothing, just base plates on the ground.',
    }),
    crew: noul('Does a crew member stand on the top boards, a hand on the rail?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lifts = { low: 2, mid: 3, tall: 4, towering: 6 }[a.height];
    const LIFT = 1.0, W = 1.3, D = 1.3, R = 0.024;
    const topY = lifts * LIFT;
    const tube = s.material('#8e9398', { metalness: 0.7, roughness: 0.4 });
    const clampMat = s.material('#5a5e63', { metalness: 0.6, roughness: 0.5 });
    const plank = s.material('#a8835a', { roughness: 0.9 });
    const black = s.material('#1c1d20', { roughness: 0.55 });
    const palette = PALETTES[a.colour];
    const colourAt = (i: number) => palette[i % palette.length];
    const parsOn = a.lit === 'all' || a.lit === 'pars';
    const ledsOn = a.lit === 'all' || a.lit === 'leds';
    const strobeOn = a.lit === 'all' || a.lit === 'strobe';

    // Legs, ledgers, braces, couplers.
    const corners: [number, number][] = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]];
    const clamps: { at: [number, number, number]; size: number }[] = [];
    for (const [x, z] of corners) {
      s.rod([x, 0, z], [x, topY + 0.05, z], R, tube);
      s.box([0.16, 0.012, 0.16], [x, 0.006, z], clampMat);
    }
    for (let level = 0; level <= lifts; level++) {
      const y = level === 0 ? 0.25 : level * LIFT;
      for (let i = 0; i < 4; i++) {
        const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 4];
        s.rod([x0, y, z0], [x1, y, z1], R * 0.9, tube);
        clamps.push({ at: [x0, y, z0], size: 1 });
      }
      // A diagonal brace on alternating faces.
      if (level < lifts) {
        const face = level % 2;
        const [x0, z0] = corners[face], [x1, z1] = corners[face + 1];
        s.rod([x0, y, z0], [x1, y + LIFT, z1], R * 0.8, tube);
        const [x2, z2] = corners[face + 2], [x3, z3] = corners[(face + 3) % 4];
        s.rod([x2, y + LIFT, z2], [x3, y, z3], R * 0.8, tube);
      }
    }
    s.scatter(new THREE.BoxGeometry(0.07, 0.09, 0.07), clampMat, clamps);
    // Top boards, toe boards and a guard rail.
    for (let i = 0; i < 5; i++) s.box([W - 0.1, 0.035, 0.22], [0, topY + 0.02, -D / 2 + 0.15 + i * 0.25], plank);
    for (const [x, z] of corners) s.rod([x, topY, z], [x, topY + 1.0, z], R * 0.9, tube);
    for (let i = 0; i < 4; i++) { const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 4]; s.rod([x0, topY + 1.0, z0], [x1, topY + 1.0, z1], R * 0.8, tube); s.rod([x0, topY + 0.5, z0], [x1, topY + 0.5, z1], R * 0.7, tube); }
    // A ladder up the back.
    for (let i = 0; i < Math.round(topY / 0.3); i++) s.rod([-0.3, 0.3 + i * 0.3, -D / 2 - 0.02], [0.3, 0.3 + i * 0.3, -D / 2 - 0.02], 0.012, tube);
    for (const x of [-0.32, 0.32]) s.rod([x, 0.1, -D / 2 - 0.02], [x, topY + 0.9, -D / 2 - 0.02], 0.014, tube);

    // Par cans along the front top ledger and halfway up, each with a yoke and a lens.
    const lensMats: THREE.MeshStandardMaterial[] = [];
    const parCan = (x: number, y: number, colour: string, tiltDown: number, yaw: number) => {
      const group = new THREE.Group();
      group.position.set(x, y, D / 2 + 0.05);
      group.rotation.set(tiltDown, yaw, 0);
      s.root.add(group);
      const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 16, Math.PI), clampMat);
      yoke.rotation.z = 0; yoke.position.y = 0.0;
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.3, 16), black);
      can.rotation.x = Math.PI / 2;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.085, 16), glow(parsOn ? colour : '#2a2a30', parsOn ? 2.4 : 0));
      lens.position.z = 0.151;
      lensMats.push(lens.material as THREE.MeshStandardMaterial);
      can.castShadow = yoke.castShadow = true;
      group.add(yoke, can, lens);
      if (parsOn) {
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.55, 3.2, 16, 1, true), new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
        cone.rotation.x = -Math.PI / 2;
        cone.position.z = 1.75;
        cone.castShadow = false;
        group.add(cone);
      }
      s.rod([x, y + 0.12, D / 2 + 0.05], [x, y + 0.12, D / 2 - 0.01], 0.01, clampMat);
    };
    const parCount = lifts >= 4 ? 4 : 3;
    for (let i = 0; i < parCount; i++) {
      const x = (i - (parCount - 1) / 2) * (W / parCount);
      parCan(x, topY - 0.25, colourAt(i), 0.55 + random() * 0.2, (i - (parCount - 1) / 2) * 0.25);
    }
    if (lifts >= 3) for (let i = 0; i < 2; i++) parCan((i - 0.5) * 0.8, Math.floor(lifts / 2) * LIFT - 0.25, colourAt(i + 1), 0.4, (i - 0.5) * 0.5);

    // The strobe box under the top ledger, and the LED bars on the second lift.
    const strobe = glow(strobeOn ? '#ffffff' : '#3a3a40', strobeOn ? 3 : 0);
    const strobeBox = s.box([0.34, 0.16, 0.14], [W / 2 - 0.3, topY - 0.6, D / 2 + 0.1], black);
    void strobeBox;
    const strobeLens = s.mesh(new THREE.PlaneGeometry(0.3, 0.12), strobe, [W / 2 - 0.3, topY - 0.6, D / 2 + 0.172]);
    strobeLens.castShadow = false;
    const dots: { at: [number, number, number]; size: number; color: string }[] = [];
    const barY = LIFT + 0.3;
    for (const row of [0, 1]) {
      const y = barY + row * 0.2;
      s.box([W - 0.2, 0.06, 0.08], [0, y, D / 2 + 0.06], black);
      for (let i = 0; i < 16; i++) dots.push({ at: [-W / 2 + 0.14 + i * ((W - 0.28) / 15), y, D / 2 + 0.103], size: 0.016, color: ledsOn ? colourAt(i + row) : '#2a2a30' });
    }
    const ledMesh = s.scatter(new THREE.SphereGeometry(1, 8, 6), glow('#ffffff', ledsOn ? 2 : 0), dots);
    ledMesh.castShadow = false;
    for (const sx of [-1, 1]) s.rod([sx * (W / 2 - 0.15), barY - 0.05, D / 2 + 0.06], [sx * (W / 2 - 0.15), barY + 0.25, D / 2 + 0.06], 0.008, clampMat);

    // Cables zip-tied down one leg, and the power lead off across the floor.
    const cable = s.material('#1a1a1c', { roughness: 0.9 });
    const legX = W / 2, legZ = D / 2;
    s.tube([[legX - 0.1, topY - 0.3, legZ + 0.08], [legX + 0.03, topY - 0.6, legZ + 0.05], [legX + 0.03, 0.4, legZ + 0.05], [legX + 0.1, 0.02, legZ + 0.15], [legX + 0.6, 0.02, legZ + 0.5]], 0.012, cable);
    s.tube([[legX - 0.4, barY, legZ + 0.1], [legX + 0.04, barY - 0.2, legZ + 0.06], [legX + 0.04, 0.3, legZ + 0.06], [legX + 0.3, 0.02, legZ + 0.3], [legX + 1.0, 0.02, legZ + 0.1]], 0.009, cable);
    const ties = Array.from({ length: Math.round(topY / 0.35) }, (_u, i) => ({ at: [legX + 0.02, 0.3 + i * 0.35, legZ + 0.03] as [number, number, number], size: 1 }));
    s.scatter(new THREE.TorusGeometry(0.035, 0.004, 5, 10), s.material('#e8e8e8', { roughness: 0.8 }), ties);

    // Ballast.
    if (a.base === 'sandbags') {
      const sand = s.material(pick(random, ['#b9a06a', '#6b6b5a', '#7a5a3a']), { roughness: 1 });
      for (const [x, z] of corners) {
        const bag = s.ball([0.22, 0.1, 0.16], [x + (random() - 0.5) * 0.1, 0.09, z + (random() - 0.5) * 0.1], sand, 12);
        bag.rotation.y = random() * 3;
        if (random() < 0.5) s.ball([0.2, 0.09, 0.15], [x + (random() - 0.5) * 0.1, 0.25, z + (random() - 0.5) * 0.1], sand, 12).rotation.y = random() * 3;
      }
    }
    if (a.base === 'drums') {
      const drum = s.material('#2b6cc4', { roughness: 0.5 });
      for (const [x, z] of [corners[0], corners[2]]) {
        s.cylinder(0.2, 0.2, 0.6, [x + (x > 0 ? 0.25 : -0.25), 0.3, z], drum, 18);
        s.box([0.05, 0.01, 0.5], [x + (x > 0 ? 0.12 : -0.12), 0.45, z], s.material('#ff7a1a'));
      }
    }

    // What hangs off the side.
    const sideX = -W / 2 - 0.03;
    if (a.side === 'banner') {
      const { text, ink, paper } = BANNERS[a.banner];
      const map = paint(1024, 384, (c, w, h) => {
        c.fillStyle = paper; c.fillRect(0, 0, w, h);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const size = Math.min(h * 0.5, (w * 0.9) / text.length * 1.7);
        c.font = `bold ${size}px sans-serif`;
        c.fillStyle = ink;
        c.fillText(text, w / 2, h / 2);
        for (let i = 0; i < 12; i++) { c.fillRect(w * 0.1 + random() * w * 0.8, h * 0.62, 5, 10 + random() * 40); }
        c.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(w * 0.06 + i * w * 0.125, h * 0.06, 8, 0, 7); c.fill(); }
      });
      const bannerH = Math.min(1.6, topY * 0.45), bannerW = Math.min(D - 0.1, 2.4);
      const banner = s.mesh(new THREE.PlaneGeometry(bannerW, bannerH), new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide }), [sideX, topY - 0.3 - bannerH / 2, 0]);
      banner.rotation.y = -Math.PI / 2;
      banner.rotation.x = 0.04;
      for (let i = 0; i < 4; i++) s.rod([sideX + 0.02, topY - 0.3, -bannerW / 2 + i * (bannerW / 3)], [-W / 2, topY - 0.05, -bannerW / 2 + i * (bannerW / 3)], 0.004, s.material('#e8e2d0'));
    }
    if (a.side === 'tarp') {
      const map = paint(256, 256, (c, w, h) => {
        c.fillStyle = '#2b6cc4'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 2;
        for (let i = 0; i < w; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
        c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(random() * w, 0); c.lineTo(random() * w, h); c.stroke(); }
        c.fillStyle = '#d9dde3'; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(16 + i * 32, 12, 5, 0, 7); c.fill(); c.beginPath(); c.arc(16 + i * 32, h - 12, 5, 0, 7); c.fill(); }
      });
      const tarpH = Math.min(topY - 0.4, 2.6);
      const tarp = s.mesh(new THREE.PlaneGeometry(D + 0.2, tarpH), new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }), [sideX - 0.04, topY - 0.2 - tarpH / 2, 0]);
      tarp.rotation.y = -Math.PI / 2;
      tarp.rotation.x = 0.06;
      const rope = s.material('#d9c9a1', { roughness: 1 });
      for (let i = 0; i < 4; i++) s.rod([sideX - 0.04, topY - 0.2, -D / 2 + i * (D / 3)], [-W / 2, topY + 0.02, -D / 2 + i * (D / 3) + 0.1], 0.005, rope);
    }
    if (a.side === 'flag') {
      const pole = [-W / 2, topY + 1.0, -D / 2] as [number, number, number];
      s.rod(pole, [-W / 2 - 0.3, topY + 2.2, -D / 2 - 0.2], 0.012, tube);
      const map = paint(256, 160, (c, w, h) => { const bands = pick(random, [['#e62d2d', '#f2e21c', '#2ec24a'], ['#1d1d1f', '#f4f1e8'], ['#ff3fb0', '#2b6cc4', '#f2e21c']]); bands.forEach((b, i) => { c.fillStyle = b; c.fillRect(0, i * h / bands.length, w, h / bands.length); }); });
      const flag = s.mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide }), [-W / 2 - 0.3 + 0.45, topY + 2.2 - 0.3, -D / 2 - 0.2]);
      flag.rotation.set(0, 0.2, -0.1);
    }

    // A crew member on the boards.
    let crew: ReturnType<typeof figure> | null = null;
    if (a.crew) {
      const skin = pickSkin(random);
      const Hc = mix(1.6, 1.85, random());
      crew = figure(s, {
        height: Hc, style: 'doll', skin, hair: pick(random, ['short', 'cap', 'hood', 'bun'] as const), hairColor: '#1d1d1f',
        pose: 'standing', gaze: 'down', top: pick(random, ['#1d1d1f', '#ff8c1a', '#3a3a3c']), bottom: '#2a2a2c', shoes: '#3a2a1a', sleeves: 'long',
      });
      s.root.add(crew.root);
      const joints = rig(crew);
      joints.arm('left', { forward: 50, out: 18, bend: 10 });
      joints.arm('right', { forward: 20, out: 10, bend: 80, across: 30 });
      joints.look(24, -20);
      joints.lean(4);
      joints.settle();
      crew.root.position.set(-0.1, topY + 0.04, 0.1);
      crew.root.rotation.y = 0.3;
      // A hi-vis vest as a flat panel on the chest.
      const vest = new THREE.Mesh(new THREE.BoxGeometry(Hc * 0.2, Hc * 0.2, Hc * 0.01), glow('#e8ff2a', 0.5));
      vest.position.set(0, Hc * 0.17, Hc * 0.065);
      joints.spine.add(vest);
    }

    const energy = mood.energy;
    const chase = mix(1, 6, energy);
    return s.finish({
      footprint: W * 0.75,
      update: (dt, time) => {
        crew?.update(dt, time);
        if (strobeOn) strobe.emissiveIntensity = (Math.sin(time * chase * 4) > 0.75 ? 3.2 : 0.15);
        if (ledsOn) {
          const shift = Math.floor(time * chase) % palette.length;
          const colour = new THREE.Color();
          for (let i = 0; i < dots.length; i++) { colour.set(colourAt(i + shift)); ledMesh.setColorAt(i, colour); }
          if (ledMesh.instanceColor) ledMesh.instanceColor.needsUpdate = true;
        }
        if (parsOn) for (const [i, m] of lensMats.entries()) m.emissiveIntensity = 2.1 + Math.sin(time * 2 + i) * 0.3;
      },
    });
  },
});
