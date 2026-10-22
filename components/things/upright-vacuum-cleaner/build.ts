import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const ERAS = {
  fifties: 'A 1950s machine: turquoise enamel, a rounded chrome-trimmed hood, built like a car.',
  sixties: 'A 1960s machine: cream and pillar-box red, a streamlined hood and a round badge.',
  seventies: 'A 1970s machine: orange and chocolate brown plastic, squared off.',
  eighties: 'A 1980s machine: beige and grey plastic, boxy and anonymous.',
} as const;
const PAINT: Record<keyof typeof ERAS, { body: string; trim: string; bag: string; round: boolean }> = {
  fifties: { body: '#4fa7a0', trim: '#d9dde0', bag: '#7f8d96', round: true },
  sixties: { body: '#e8dcc0', trim: '#b3262b', bag: '#b3262b', round: true },
  seventies: { body: '#d9792b', trim: '#4f3322', bag: '#8a5a33', round: false },
  eighties: { body: '#cfc7b4', trim: '#6d7278', bag: '#9a9c9a', round: false },
};

export default defineThing({
  questions: {
    era: choice('What era is the machine from?', ERAS),
    bag: choice('What is the cloth dust bag like?', {
      matching: 'Plain cloth in the maker\'s colour with a stitched badge.',
      tartan: 'A tartan check bag, cosy and Scottish.',
      grey: 'Grey from decades of dust working through the weave.',
      patched: 'Split and mended with strips of silver tape.',
    }),
    fullness: score('How full is the bag?', ['Empty and hanging limp', 'Half full', 'Fat and round', 'Bursting, tight as a drum']),
    state: choice('Does it work?', {
      working: 'Yes: it is switched on right now, bag inflated and headlight glowing.',
      resting: 'It works, but it is off and has not been touched for weeks.',
      broken: 'Broken: the drive belt hangs out, the handle is taped, a screwdriver lies beside it.',
      several: 'It is one of several: two more dead uprights stand behind it, kept for spares.',
    }),
    cord: choice('Where is the flex?', {
      wrapped: 'Wound neatly round the two hooks on the handle.',
      trailing: 'Trailing away across the floor to a plug that has been pulled out.',
      tangled: 'In a knotted tangle at its foot.',
      cut: 'Cut short, a frayed stub with bare copper showing.',
    }),
    posture: choice('How was it left?', {
      upright: 'Handle clicked upright, parked.',
      reclined: 'Handle tipped back at pushing angle, as if someone just let go.',
      dropped: 'Handle dropped flat to the floor behind it.',
    }),
    trace: choice('What does the floor around it show?', {
      none: 'Nothing: bare floor.',
      stripe: 'A strip of carpet with one clean stripe mown through the dust, stopping at the machine.',
      sweepings: 'A dustpan, a brush and a small heap of grey fluff.',
      tools: 'A coiled hose and nozzle attachments laid out and never fitted.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D) => { node.removeFromParent(); parent.add(node); return node; };
    const rubber = s.material('#222325', { roughness: 0.8 });
    const chrome = s.material('#d9dde0', { metalness: 0.85, roughness: 0.25 });
    const flex = s.material(a.era === 'eighties' ? '#3a3c40' : '#5a4630', { roughness: 0.7 });
    const bags: THREE.Object3D[] = [];
    let lamp: THREE.MeshStandardMaterial | null = null;

    const bagCloth = (kind: typeof a.bag, tint: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d')!;
      const base = new THREE.Color(kind === 'grey' ? '#8d8a84' : kind === 'tartan' ? '#9c2f2c' : tint);
      base.lerp(new THREE.Color('#8a8780'), mood.wear * 0.35);
      g.fillStyle = `#${base.getHexString()}`;
      g.fillRect(0, 0, 128, 128);
      if (kind === 'tartan') {
        g.fillStyle = 'rgba(20,50,35,0.55)';
        for (let i = 0; i < 128; i += 32) { g.fillRect(i, 0, 12, 128); g.fillRect(0, i, 128, 12); }
        g.fillStyle = 'rgba(245,215,90,0.7)';
        for (let i = 20; i < 128; i += 32) { g.fillRect(i, 0, 2, 128); g.fillRect(0, i, 128, 2); }
      } else {
        for (let i = 0; i < 700; i++) { g.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'; g.fillRect(random() * 128, random() * 128, 2, 1); }
        if (kind === 'matching') { g.fillStyle = '#e9d9a0'; g.beginPath(); g.ellipse(32, 56, 14, 9, 0, 0, 7); g.fill(); g.fillStyle = '#3a2a1a'; g.fillRect(24, 54, 16, 3); }
      }
      if (kind === 'patched') {
        g.fillStyle = '#b9bec2';
        for (let i = 0; i < 4; i++) { g.save(); g.translate(random() * 128, 30 + random() * 70); g.rotate(r(-0.6, 0.6)); g.fillRect(-22, -5, 44, 10); g.restore(); }
      }
      for (let i = 0; i < mood.wear * 14; i++) { g.fillStyle = 'rgba(70,66,60,0.25)'; g.beginPath(); g.ellipse(random() * 128, 70 + random() * 58, 14, 8, 0, 0, 7); g.fill(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.set(2, 1);
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
    };

    /** One upright. `lead` is the machine the questions describe; spares are duller and stripped. */
    const vacuum = (era: keyof typeof ERAS, lead: boolean) => {
      const paint = PAINT[era];
      const machine = new THREE.Group();
      const body = s.material(paint.body, { roughness: 0.35, metalness: era === 'fifties' ? 0.3 : 0.05 });
      const trim = era === 'fifties' ? chrome : s.material(paint.trim, { roughness: 0.45 });
      const live = lead && a.state === 'working';

      // The head: skirt, hood, bumper, motor dome, headlight and wheels.
      add(s.box([0.33, 0.05, 0.3], [0, 0.045, 0.02], rubber), machine);
      if (paint.round) {
        add(s.ball([0.17, 0.085, 0.19], [0, 0.085, 0.03], body, 20), machine);
        add(s.cylinder(0.085, 0.1, 0.09, [0, 0.165, -0.04], body, 20), machine);
        add(s.ball([0.085, 0.035, 0.085], [0, 0.21, -0.04], trim, 16), machine);
      } else {
        add(s.box([0.33, 0.09, 0.3], [0, 0.11, 0.02], body), machine);
        add(s.box([0.3, 0.05, 0.16], [0, 0.17, -0.04], body), machine).rotation.x = -0.12;
        add(s.box([0.22, 0.07, 0.14], [0, 0.215, -0.07], trim), machine);
      }
      add(s.box([0.345, 0.028, 0.02], [0, 0.07, 0.18], trim), machine);
      for (const side of [-1, 1]) add(s.box([0.012, 0.028, 0.2], [side * 0.167, 0.07, 0.08], trim), machine);
      const glass = new THREE.MeshStandardMaterial({ color: live ? '#fff3c4' : '#c9c6b8', emissive: '#ffd27a', emissiveIntensity: live ? mix(0.9, 1.8, mood.energy) : 0, roughness: 0.2 });
      if (live) lamp = glass;
      add(s.box([0.12, 0.04, 0.012], [0, paint.round ? 0.115 : 0.125, paint.round ? 0.205 : 0.172], chrome), machine);
      add(s.box([0.1, 0.028, 0.012], [0, paint.round ? 0.115 : 0.125, paint.round ? 0.21 : 0.177], glass), machine);
      for (const side of [-1, 1]) {
        const wheel = add(s.cylinder(0.055, 0.055, 0.03, [side * 0.175, 0.055, -0.13], rubber, 16), machine);
        wheel.rotation.z = Math.PI / 2;
        add(s.cylinder(0.025, 0.025, 0.032, [side * 0.176, 0.055, -0.13], trim, 10), machine).rotation.z = Math.PI / 2;
      }
      add(s.box([0.06, 0.02, 0.05], [0.11, 0.1, -0.15], trim), machine);

      // The handle swings on a pivot at the back of the head and carries the bag and flex.
      const arm = new THREE.Group();
      arm.position.set(0, 0.15, -0.12);
      const tilt = !lead ? r(0.08, 0.16) : { upright: 0.1, reclined: 0.8, dropped: 1.5 }[a.posture];
      arm.rotation.x = -tilt;
      machine.add(arm);
      add(s.cylinder(0.035, 0.045, 0.1, [0, 0.03, 0], body, 12), arm);
      add(s.cylinder(0.013, 0.015, 0.92, [0, 0.5, 0], chrome, 10), arm);
      add(s.tube([[0, 0.94, 0], [0, 1.0, -0.005], [0, 1.05, -0.05], [0, 1.03, -0.11], [0, 0.96, -0.12], [0, 0.9, -0.07]], 0.016, rubber), arm);
      add(s.box([0.03, 0.05, 0.025], [0, 0.93, 0.012], trim), arm);
      if (lead && a.state === 'broken') {
        const tape = s.material('#b9bec2', { roughness: 0.5, metalness: 0.3 });
        for (let i = 0; i < 3; i++) add(s.cylinder(0.019, 0.019, 0.045, [0, 0.52 + i * 0.05, 0], tape, 10), arm).rotation.z = r(-0.2, 0.2);
      }
      const hooks = [0.42, 0.82];
      for (const y of hooks) add(s.box([0.012, 0.012, 0.06], [0, y, -0.035], chrome), arm);

      if (lead || random() < 0.5) {
        const fill = lead ? a.fullness : r(0, 0.3);
        const cloth = bagCloth(lead ? a.bag : 'grey', paint.bag);
        const fat = mix(0.055, 0.135, fill) * (live ? 1.08 : 1);
        const sag = (1 - fill) * 0.18;
        const profile: [number, number][] = [[0.03, 0.05], [0.045, 0.1], [fat * 0.9, 0.2 + sag * 0.3], [fat, 0.36 - sag * 0.3], [fat * mix(0.6, 0.92, fill), 0.56 - sag], [fat * mix(0.32, 0.66, fill), 0.72 - sag], [0.03, 0.85 - sag * 0.6], [0.02, 0.87 - sag * 0.6]];
        const bag = add(s.lathe(profile, cloth, [0, 0, fat * 0.72 + 0.02]), arm);
        bag.scale.z = mix(0.55, 0.9, fill);
        if (lead) bags.push(bag);
        add(s.cylinder(0.034, 0.034, 0.03, [0, 0.07, fat * 0.72 + 0.02], chrome, 12), arm);
        add(s.rod([0, 0.86 - sag * 0.6, fat * 0.72 + 0.02], [0, 0.9, 0.01], 0.004, chrome), arm);
      }

      if (lead && a.cord === 'wrapped' || !lead && random() < 0.5) {
        for (let i = 0; i < 5; i++) {
          const loop = add(s.ring(0.2, 0.007, [r(-0.012, 0.012), 0.62, -0.045 - i * 0.004], flex), arm);
          loop.rotation.y = Math.PI / 2;
          loop.scale.set(0.22, 1.05, 1);
        }
      }
      return { machine, arm };
    };

    const lead = vacuum(a.era, true);
    s.root.add(lead.machine);
    const tail: [number, number, number] = [0.02, 0.2, -0.16];

    if (a.cord === 'trailing') {
      const way = random() < 0.5 ? -1 : 1;
      const end: [number, number, number] = [way * r(0.55, 0.8), 0.012, r(0.35, 0.7)];
      s.tube([tail, [0.05, 0.012, -0.3], [way * 0.3, 0.012, -0.38 + r(-0.05, 0.05)], [way * 0.55, 0.012, -0.1], [way * 0.35, 0.012, 0.25], end], 0.007, flex);
      const plug = s.box([0.045, 0.03, 0.05], [end[0], 0.018, end[2] + 0.02], s.material('#ece7da', { roughness: 0.4 }));
      for (const x of [-0.012, 0.012]) add(s.box([0.006, 0.004, 0.02], [x, 0, 0.034], chrome), plug);
    } else if (a.cord === 'tangled') {
      const points: [number, number, number][] = [tail];
      for (let i = 0; i < 16; i++) { const t = i * 1.9; points.push([0.3 + Math.cos(t) * r(0.05, 0.16), 0.012 + (i % 3) * 0.012, -0.22 + Math.sin(t) * r(0.05, 0.16)]); }
      s.tube(points, 0.007, flex);
    } else if (a.cord === 'cut') {
      const end: [number, number, number] = [0.2, 0.012, -0.36];
      s.tube([tail, [0.06, 0.03, -0.28], end], 0.007, flex);
      const copper = s.material('#c9793a', { metalness: 0.7, roughness: 0.4 });
      for (let i = 0; i < 4; i++) s.rod(end, [end[0] + r(0.02, 0.05), 0.012 + r(0, 0.02), end[2] + r(-0.03, 0.03)], 0.002, copper);
    }

    if (a.state === 'broken') {
      const belt = s.ring(0.07, 0.006, [0.1, 0.012, 0.3], rubber);
      belt.rotation.x = Math.PI / 2;
      belt.scale.set(1, 0.55, 1);
      s.rod([-0.2, 0.012, 0.3], [-0.08, 0.012, 0.36], 0.004, chrome);
      s.rod([-0.3, 0.014, 0.25], [-0.2, 0.014, 0.3], 0.012, s.material('#c8362e', { roughness: 0.4 }));
      s.box([0.2, 0.012, 0.035], [0.02, 0.05, 0.19], rubber).rotation.z = 0.2;
    }
    if (a.state === 'several') {
      const others = (Object.keys(ERAS) as (keyof typeof ERAS)[]).filter((era) => era !== a.era);
      [[-0.42, -0.42, 0.5], [0.4, -0.5, -0.4]].forEach(([x, z, turn], index) => {
        const spare = vacuum(others[(index + Math.floor(random() * 3)) % others.length], false).machine;
        spare.position.set(x + r(-0.04, 0.04), 0, z);
        spare.rotation.y = turn + r(-0.2, 0.2);
        s.root.add(spare);
      });
    }

    if (a.trace === 'stripe') {
      const dust = mix(0.25, 0.6, mood.wear);
      const pile = new THREE.Color('#7b5a52').lerp(new THREE.Color('#8f8c86'), dust);
      s.box([0.8, 0.014, 1.5], [0, 0.007, 0.35], s.material(pile, { roughness: 1 }));
      s.box([0.31, 0.004, 0.86], [0, 0.016, 0.66], s.material('#9a4a44', { roughness: 1 }));
      for (let i = 0; i < 6; i++) s.box([0.31, 0.002, 0.004], [0, 0.019, 0.27 + i * 0.15], s.material('#b4605a'));
    } else if (a.trace === 'sweepings') {
      const tin = s.material('#b9442f', { roughness: 0.5 });
      const pan = s.box([0.22, 0.008, 0.2], [0.42, 0.012, 0.3], tin);
      add(s.box([0.22, 0.05, 0.008], [0, 0.025, -0.1], tin), pan);
      for (const side of [-1, 1]) add(s.box([0.008, 0.035, 0.2], [side * 0.11, 0.018, 0], tin), pan);
      add(s.rod([0, 0.04, -0.1], [0, 0.07, -0.26], 0.012, tin), pan);
      pan.rotation.y = -0.5;
      s.rod([0.3, 0.03, 0.55], [0.5, 0.03, 0.62], 0.012, s.material('#8a5a33'));
      s.box([0.1, 0.05, 0.03], [0.26, 0.03, 0.535], s.material('#d9c58a')).rotation.y = -0.33;
      const fluff = s.material('#8e8b86', { roughness: 1 });
      for (let i = 0; i < 6; i++) s.ball([r(0.04, 0.08), r(0.015, 0.035), r(0.04, 0.07)], [0.2 + r(-0.08, 0.08), 0.015, 0.38 + r(-0.06, 0.06)], fluff, 8);
    } else if (a.trace === 'tools') {
      const hose = s.material('#55585c', { roughness: 0.6 });
      const coil: [number, number, number][] = [];
      for (let i = 0; i <= 26; i++) { const t = i * 0.5; coil.push([-0.45 + Math.cos(t) * (0.16 - i * 0.002), 0.02 + i * 0.0035, 0.32 + Math.sin(t) * (0.16 - i * 0.002)]); }
      s.tube(coil, 0.018, hose);
      s.rod([0.3, 0.02, 0.3], [0.62, 0.02, 0.4], 0.016, chrome);
      s.box([0.16, 0.03, 0.05], [0.4, 0.02, 0.52], rubber).rotation.y = 0.4;
      s.cylinder(0.02, 0.035, 0.09, [0.52, 0.045, 0.6], rubber, 12);
    }

    const pulse = mix(0.4, 1.6, mood.energy);
    return s.finish({
      footprint: 0.45,
      update: a.state === 'working' ? (_dt, time) => {
        const breath = 1 + Math.sin(time * 9 * pulse) * 0.02 + Math.sin(time * 37) * 0.008;
        for (const bag of bags) bag.scale.x = breath;
        if (lamp) lamp.emissiveIntensity = mix(0.9, 1.8, mood.energy) * (0.92 + Math.sin(time * 23) * 0.08);
      } : undefined,
    });
  },
});
