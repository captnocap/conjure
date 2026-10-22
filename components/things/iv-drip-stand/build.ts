import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const FLUIDS = {
  saline: 'Clear saline, water-bright.',
  blood: 'Dark red blood, a transfusion.',
  yellow: 'Vivid yellow vitamin infusion, a "banana bag".',
  milk: 'Opaque milky white feed.',
  chemo: 'A bag hidden inside an amber light-proof cover: chemotherapy.',
  blue: 'A faintly blue antibiotic.',
} as const;
type Fluid = keyof typeof FLUIDS;
const FLUID_TINT: Record<Fluid, string> = { saline: '#b4dbea', blood: '#8e1220', yellow: '#f0cf2a', milk: '#f4efe2', chemo: '#b8691c', blue: '#7fb6e6' };

export default defineThing({
  questions: {
    bags: choice('How many bags hang from the pole?', {
      one: 'A single bag.',
      two: 'Two bags, a main and a piggyback.',
      three: 'Three bags crowding the hooks.',
      four: 'Four bags, every hook taken: someone very ill.',
    }),
    first: choice('What is in the main bag?', FLUIDS),
    second: choice('If there is a second bag, what is in it?', FLUIDS),
    level: score('How much fluid is left in the bags?', ['Drained flat and wrinkled', 'A last few centimetres', 'Half gone', 'Freshly hung and full']),
    pump: choice('What controls the flow?', {
      gravity: 'No pump: just gravity and a roller clamp, the old way.',
      one: 'One boxy infusion pump clamped to the pole.',
      two: 'Two pumps stacked one above the other.',
    }),
    display: choice('If there is a pump, what is its display doing?', {
      running: 'Running calmly: steady green numbers.',
      alarm: 'Alarming: a red screen flashing, nobody answering.',
      standby: 'On standby: a dim amber glow.',
      dead: 'Dark and unplugged, its cable wound round the pole.',
    }),
    line: choice('Where does the tubing go?', {
      connected: 'It trails off sideways at arm height toward a patient just out of frame.',
      looped: 'Finished: the line is clamped and looped back up over a hook.',
      dragging: 'Abandoned mid-use, the line falling to the floor in a loose coil.',
    }),
    base: choice('What does it stand on?', {
      star: 'A five-legged chrome star on small twin castors.',
      dome: 'A heavy weighted dome base on hidden wheels.',
      old: 'An old four-legged enamelled iron base, cream paint chipped.',
    }),
    token: choice('What has been hung on it besides the medicine?', {
      none: 'Nothing: it is purely clinical.',
      toy: 'A small soft toy tied to the pole, a child’s companion.',
      gown: 'A pale patient gown draped over the handle.',
      handbag: 'A visitor’s handbag hung from the handle.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const chrome = s.material('#dde2e5', { metalness: 0.9, roughness: 0.22 });
    const dark = s.material('#2c3034', { roughness: 0.7 });
    const cream = s.material('#e6dfc9', { roughness: 0.55 });
    const clearLine = new THREE.MeshStandardMaterial({ color: '#f1f6f6', roughness: 0.25, transparent: true, opacity: 0.85 });
    const TOP = 1.92;

    // ---- Base.
    if (a.base === 'dome') {
      s.lathe([[0, 0.03], [0.24, 0.03], [0.26, 0.05], [0.25, 0.08], [0.12, 0.13], [0.03, 0.15], [0, 0.15]], s.material('#5c646a', { metalness: 0.4, roughness: 0.5 }));
      for (let i = 0; i < 5; i++) { const t = i / 5 * Math.PI * 2; s.ball([0.03, 0.03, 0.03], [Math.cos(t) * 0.2, 0.03, Math.sin(t) * 0.2], dark, 10); }
    } else {
      const legs = a.base === 'star' ? 5 : 4, reach = a.base === 'star' ? 0.29 : 0.26;
      const metal = a.base === 'star' ? chrome : cream;
      const spin = random() * 6.3;
      for (let i = 0; i < legs; i++) {
        const t = spin + i / legs * Math.PI * 2, cx = Math.cos(t) * reach, cz = Math.sin(t) * reach;
        if (a.base === 'star') s.tube([[0, 0.14, 0], [cx * 0.5, 0.13, cz * 0.5], [cx, 0.085, cz]], 0.015, metal);
        else { s.rod([0, 0.2, 0], [cx, 0.09, cz], 0.02, metal, 0.014); }
        const castor = new Sculpture(context);
        for (const side of [-1, 1]) { const w = castor.cylinder(0.032, 0.032, 0.018, [0.015, 0.032, side * 0.014], dark, 14); w.rotation.x = Math.PI / 2; }
        castor.box([0.05, 0.035, 0.012], [0.008, 0.055, 0], a.base === 'star' ? s.material('#8c949a') : dark);
        castor.root.position.set(cx, 0, cz);
        castor.root.rotation.y = random() * 6.3;
        s.root.add(castor.root);
      }
      s.cylinder(0.035, 0.045, 0.1, [0, a.base === 'star' ? 0.15 : 0.21, 0], metal, 16);
    }
    // ---- Pole: a fat lower tube, a clamp collar, a thinner upper tube and curled hooks.
    s.cylinder(0.017, 0.017, 0.95, [0, 0.6, 0], a.base === 'old' ? cream : chrome, 14);
    s.cylinder(0.011, 0.011, TOP - 1.05, [0, (TOP + 1.05) / 2, 0], chrome, 12);
    s.cylinder(0.026, 0.026, 0.05, [0, 1.07, 0], dark, 14);
    const knob = s.cylinder(0.018, 0.018, 0.05, [0.04, 1.07, 0], dark, 10); knob.rotation.z = Math.PI / 2;
    // Push handle ring.
    const handleY = 0.98;
    s.ring(0.09, 0.009, [0, handleY, 0.0], chrome).rotation.x = Math.PI / 2;
    for (const t of [0, Math.PI]) s.rod([0, handleY, 0], [Math.cos(t) * 0.09, handleY, Math.sin(t) * 0.09], 0.006, chrome);

    const count = { one: 1, two: 2, three: 3, four: 4 }[a.bags];
    const hooks = Math.max(count, a.line === 'looped' ? count + 1 : 2, 2) > 2 ? 4 : 2;
    const hookAt = (i: number) => { const t = hooks === 2 ? i * Math.PI : Math.PI / 4 + i * Math.PI / 2; return [Math.cos(t) * 0.13, Math.sin(t) * -0.13] as const; };
    s.ball([0.018, 0.018, 0.018], [0, TOP, 0], chrome, 10);
    for (let i = 0; i < hooks; i++) {
      const [hx, hz] = hookAt(i);
      s.tube([[0, TOP - 0.02, 0], [hx * 0.5, TOP + 0.03, hz * 0.5], [hx * 0.95, TOP + 0.02, hz * 0.95], [hx * 1.15, TOP - 0.02, hz * 1.15], [hx, TOP - 0.05, hz], [hx * 0.85, TOP - 0.03, hz * 0.85]], 0.005, chrome);
    }

    // ---- Pumps.
    const pumps = { gravity: 0, one: 1, two: 2 }[a.pump];
    const screens: { material: THREE.MeshStandardMaterial; alarm: boolean }[] = [];
    const pumpY = (i: number) => 1.3 - i * 0.24;
    for (let i = 0; i < pumps; i++) {
      const state = i === 1 && a.display === 'alarm' ? 'running' : a.display;
      const y = pumpY(i);
      const body = s.material(i === 0 ? '#e9ecec' : '#dfe4e6', { roughness: 0.5 });
      const p = new Sculpture(context);
      p.box([0.17, 0.2, 0.11], [0, 0, 0.08], body);
      p.box([0.172, 0.03, 0.112], [0, -0.085, 0.08], s.material('#2f7fb4'));
      p.box([0.05, 0.08, 0.05], [0, 0, 0.012], dark); // pole clamp
      p.box([0.045, 0.16, 0.012], [-0.055, 0.0, 0.137], s.material('#c8d0d2')); // cassette door
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 96;
      const ctx = canvas.getContext('2d')!;
      const ink = { running: '#63f08a', alarm: '#ffffff', standby: '#e8a53a', dead: '#20262a' }[state];
      ctx.fillStyle = { running: '#0c2a1c', alarm: '#d21f1f', standby: '#2a2110', dead: '#15191c' }[state]; ctx.fillRect(0, 0, 128, 96);
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (state === 'running') { ctx.font = 'bold 44px monospace'; ctx.fillText(String(25 + Math.floor(random() * 20) * 25), 64, 40); ctx.font = 'bold 18px monospace'; ctx.fillText('mL/h  >>>', 64, 78); }
      if (state === 'alarm') { ctx.font = 'bold 26px monospace'; ctx.fillText(random() > 0.5 ? 'OCCLUDED' : 'AIR LINE', 64, 34); ctx.font = 'bold 30px monospace'; ctx.fillText('!!!', 64, 72); }
      if (state === 'standby') { ctx.font = 'bold 22px monospace'; ctx.fillText('STANDBY', 64, 48); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const glow = state === 'dead' ? 0 : state === 'standby' ? 0.5 : mix(1.3, 0.9, mood.daylight > 0.5 ? 1 - mood.daylight : mood.daylight);
      const material = new THREE.MeshStandardMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: glow, roughness: 0.3 });
      p.mesh(new THREE.PlaneGeometry(0.085, 0.064), material, [0.025, 0.045, 0.1365]);
      screens.push({ material, alarm: state === 'alarm' });
      // Keypad and status lamp.
      for (let k = 0; k < 6; k++) p.box([0.02, 0.016, 0.006], [-0.005 + (k % 3) * 0.03, -0.02 - Math.floor(k / 3) * 0.026, 0.137], s.material(k === 5 ? '#d8452f' : k === 3 ? '#3fa35c' : '#7d868c'));
      const lamp = { running: '#3fe07a', alarm: '#ff3524', standby: '#f0a630', dead: '#3a3f42' }[state];
      p.ball([0.008, 0.008, 0.005], [0.07, 0.085, 0.136], new THREE.MeshStandardMaterial({ color: lamp, emissive: lamp, emissiveIntensity: state === 'dead' ? 0 : 1.5 }), 8);
      p.root.position.set(0, y, 0);
      p.root.rotation.y = (random() - 0.5) * 0.25;
      s.root.add(p.root);
    }
    if (pumps && a.display === 'dead') {
      // Mains cable wound round the pole with the plug hanging.
      const coil: [number, number, number][] = [];
      for (let i = 0; i <= 28; i++) coil.push([Math.cos(i * 0.9) * 0.03, 0.72 - i * 0.008, Math.sin(i * 0.9) * 0.03]);
      coil.push([0.05, 0.42, 0.02], [0.055, 0.36, 0.02]);
      s.tube(coil, 0.006, dark);
      s.box([0.03, 0.045, 0.025], [0.055, 0.335, 0.02], s.material('#f1f1ec'));
    } else if (pumps) {
      s.tube([[0.02, pumpY(pumps - 1) - 0.1, -0.02], [0.03, 0.7, -0.05], [0.1, 0.2, -0.15], [0.3, 0.012, -0.3], [0.55, 0.008, -0.34 + random() * 0.2]], 0.006, dark);
    }

    // ---- Bags, each with its drip chamber and line.
    const keys = Object.keys(FLUIDS) as Fluid[];
    const profile: [number, number][] = [[0.0, 0], [0.012, 0], [0.014, 0.02], [0.05, 0.035], [0.066, 0.08], [0.066, 0.21], [0.06, 0.235], [0.03, 0.245], [0, 0.245]];
    const lineEnds: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const fluid: Fluid = i === 0 ? a.first : i === 1 ? a.second : keys[Math.floor(random() * keys.length)];
      const [hx, hz] = hookAt(i);
      const small = i > 0 && (fluid === 'blue' || random() < 0.35) ? 0.7 : 1;
      const fill = Math.min(1, Math.max(0.02, a.level * mix(0.7, 1.15, random()) + (random() - 0.5) * 0.12));
      const bag = new Sculpture(context);
      const H = 0.245;
      const plump = mix(0.16, 0.42, fill);
      const shroud = fluid === 'chemo';
      const skin = new THREE.MeshStandardMaterial(shroud
        ? { color: '#a8611a', roughness: 0.5, transparent: true, opacity: 0.92 }
        : { color: '#e4f0f3', roughness: 0.12, transparent: true, opacity: 0.5, depthWrite: false });
      const shell = bag.lathe(profile, skin, [0, -H, 0]); shell.scale.set(1, 1, plump);
      if (!shroud) {
        // The liquid: the same profile cut off at the fill line.
        const cut = 0.03 + fill * 0.2;
        const inner: [number, number][] = [];
        for (const [r, y] of profile) { if (y <= cut) inner.push([r * 0.94, y]); }
        const last = profile.findIndex(([, y]) => y > cut);
        const [r0, y0] = profile[last - 1], [r1, y1] = profile[last];
        inner.push([mix(r0, r1, (cut - y0) / (y1 - y0)) * 0.94, cut], [0, cut]);
        const liquid = new THREE.MeshStandardMaterial({ color: FLUID_TINT[fluid], roughness: 0.2, transparent: fluid === 'saline' || fluid === 'blue', opacity: fluid === 'saline' ? 0.8 : fluid === 'blue' ? 0.85 : 1, emissive: FLUID_TINT[fluid], emissiveIntensity: fluid === 'blood' ? 0.05 : 0.12 });
        const l = bag.lathe(inner, liquid, [0, -H, 0]); l.scale.set(1, 1, plump * 0.92);
      }
      // Hanger tab, label, ports.
      bag.box([0.05, 0.03, 0.004], [0, 0.008, 0], new THREE.MeshStandardMaterial({ color: '#eef5f6', roughness: 0.3 }));
      const labelInk = { saline: '#2a5a9a', blood: '#8e1220', yellow: '#7a5a00', milk: '#49657a', chemo: '#ffffff', blue: '#22508a' }[fluid];
      const text = { saline: 'NaCl 0.9%', blood: 'O NEG', yellow: 'MVI', milk: 'TPN', chemo: 'CYTOTOXIC', blue: 'ABX' }[fluid];
      const tag = bag.label(text, 0.085, shroud ? 0.035 : 0.06, [0, -0.1, 0.066 * plump + 0.003], labelInk, shroud ? '#c8362c' : '#f6f8f8');
      tag.castShadow = false;
      bag.cylinder(0.007, 0.007, 0.03, [0.02, -H - 0.012, 0], s.material('#3f7fc0'), 8);
      // Drip chamber.
      const chamberY = -H - 0.07;
      bag.cylinder(0.006, 0.006, 0.03, [0, -H - 0.015, 0], s.material('#f4f6f6'), 8);
      bag.cylinder(0.013, 0.011, 0.055, [0, chamberY, 0], new THREE.MeshStandardMaterial({ color: '#f1f7f7', roughness: 0.1, transparent: true, opacity: 0.6 }), 12);
      bag.cylinder(0.011, 0.01, 0.022, [0, chamberY - 0.015, 0], new THREE.MeshStandardMaterial({ color: FLUID_TINT[fluid], roughness: 0.2 }), 12);
      bag.root.scale.setScalar(small);
      bag.root.position.set(hx, TOP - 0.065, hz);
      bag.root.rotation.y = Math.atan2(hx, hz) * 0 + (random() - 0.5) * 0.5;
      bag.root.rotation.z = (random() - 0.5) * 0.08;
      s.root.add(bag.root);
      const startY = TOP - 0.065 + (chamberY - 0.03) * small;
      // Line from chamber down to the pump (or a roller clamp), then out.
      const lineColour = fluid === 'blood' ? new THREE.MeshStandardMaterial({ color: '#9a2430', roughness: 0.3 }) : clearLine;
      if (pumps) {
        const y = pumpY(i % pumps);
        s.tube([[hx, startY, hz], [hx * 0.9, startY - 0.12, hz * 0.9 + 0.02], [-0.055 + i * 0.012, y + 0.16, 0.12], [-0.055 + i * 0.012, y + 0.1, 0.135]], 0.006, lineColour);
        if (i < pumps || i === 0) lineEnds.push([-0.055, y - 0.1, 0.135]);
      } else {
        const cy = mix(1.25, 1.0, random());
        s.tube([[hx, startY, hz], [hx * 1.05, (startY + cy) / 2, hz * 1.05 + 0.02], [hx * 0.8, cy, hz * 0.8 + 0.03]], 0.006, lineColour);
        s.box([0.022, 0.045, 0.016], [hx * 0.8, cy, hz * 0.8 + 0.03], s.material('#f4f6f6'));
        s.cylinder(0.008, 0.008, 0.02, [hx * 0.8 + 0.006, cy + mix(-0.012, 0.012, random()), hz * 0.8 + 0.03], s.material('#3f7fc0'), 8).rotation.z = Math.PI / 2;
        if (i === 0) lineEnds.push([hx * 0.8, cy - 0.02, hz * 0.8 + 0.03]);
      }
    }
    for (const [index, [x, y, z]] of lineEnds.entries()) {
      const flip = index % 2 ? -1 : 1;
      if (a.line === 'connected') {
        const sag = mix(0.18, 0.4, random());
        s.tube([[x, y, z], [x + 0.01, y - 0.15, z + 0.03], [flip * 0.22, y - sag - 0.1, z + 0.12], [flip * 0.45, 0.8 - sag * 0.3, 0.14], [flip * 0.62, 0.86, 0.1 + random() * 0.1]], 0.006, clearLine);
        s.box([0.03, 0.012, 0.012], [flip * 0.63, 0.86, 0.1], s.material('#3f7fc0'));
      } else if (a.line === 'looped') {
        const [hx, hz] = hookAt(hooks - 1 - index);
        s.tube([[x, y, z], [x + 0.02, y - 0.25, z + 0.05], [hx * 0.9 + 0.03, y - 0.1, hz + 0.04], [hx, TOP - 0.2, hz], [hx, TOP - 0.03, hz], [hx * 1.25, TOP - 0.2, hz * 1.25], [hx * 1.2, TOP - 0.45, hz * 1.2]], 0.006, clearLine);
        s.box([0.02, 0.03, 0.014], [hx * 1.2, TOP - 0.46, hz * 1.2], s.material('#f1f1ec'));
      } else {
        const points: [number, number, number][] = [[x, y, z], [x + 0.02, y * 0.5, z + 0.08], [flip * 0.12, 0.05, 0.3]];
        const turns = 9 + Math.floor(random() * 6), cx = flip * 0.2, cz = 0.38;
        for (let k = 0; k <= turns; k++) points.push([cx + Math.cos(k * 1.3) * (0.08 + k * 0.006), 0.006, cz + Math.sin(k * 1.3) * (0.07 + k * 0.006)]);
        s.tube(points, 0.006, clearLine);
      }
    }

    // ---- Something human hung on it.
    if (a.token === 'toy') {
      const fur = s.material(['#c9a06a', '#e8d9c0', '#9a8fb8', '#e7b7c2'][Math.floor(random() * 4)], { roughness: 1 });
      const y = 0.72, z = 0.045;
      s.ball([0.05, 0.06, 0.045], [0, y, z], fur, 14);
      s.ball([0.042, 0.04, 0.04], [0, y + 0.085, z + 0.005], fur, 14);
      for (const side of [-1, 1]) {
        s.ball([0.016, 0.016, 0.01], [side * 0.032, y + 0.12, z], fur, 8);
        s.ball([0.018, 0.035, 0.018], [side * 0.05, y + 0.005, z + 0.015], fur, 8).rotation.z = side * 0.6;
        s.ball([0.02, 0.035, 0.02], [side * 0.03, y - 0.065, z + 0.02], fur, 8);
        s.ball([0.006, 0.006, 0.004], [side * 0.015, y + 0.093, z + 0.043], dark, 6);
      }
      s.ball([0.016, 0.012, 0.012], [0, y + 0.078, z + 0.042], s.material('#f1e6d2'), 8);
      s.ring(0.024, 0.004, [0, y + 0.03, 0.01], s.material(mood.cheer > 0.5 ? '#d8452f' : '#5a7fb0')).rotation.x = Math.PI / 2;
    }
    if (a.token === 'gown') {
      const cloth = s.material(mood.cheer > 0.5 ? '#8fc4bb' : '#9fb3c4', { roughness: 0.95, side: THREE.DoubleSide });
      const geometry = new THREE.PlaneGeometry(0.34, 0.62, 10, 14);
      const p = geometry.attributes.position;
      const ph = random() * 6;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        const drop = (0.31 - y) / 0.62;
        p.setZ(i, Math.sin(x * 30 + ph) * 0.035 * (0.25 + drop) + 0.03 * Math.cos(x * 9) - (1 - drop) * 0.05);
        p.setX(i, x * (0.4 + drop * 0.7));
      }
      geometry.computeVertexNormals();
      const front = s.mesh(geometry, cloth, [0.02, handleY - 0.3, 0.1]);
      front.rotation.y = (random() - 0.5) * 0.4;
      s.ball([0.1, 0.035, 0.1], [0.01, handleY + 0.012, 0.03], cloth, 12);
      for (let i = 0; i < 2; i++) s.rod([0.02 + (i - 0.5) * 0.1, handleY - 0.15, 0.115], [0.02 + (i - 0.5) * 0.16, handleY - 0.4 - random() * 0.1, 0.13], 0.004, s.material('#f4f6f6'));
    }
    if (a.token === 'handbag') {
      const leather = s.material(['#7a3f2c', '#2e3440', '#8c2f3c', '#b7903f'][Math.floor(random() * 4)], { roughness: 0.6 });
      const bx = 0.1, bz = 0.03, by = handleY - 0.3;
      const bagMesh = s.box([0.06, 0.17, 0.22], [bx + 0.02, by, bz], leather);
      bagMesh.rotation.z = 0.08;
      s.tube([[bx + 0.02, by + 0.08, bz - 0.07], [bx - 0.01, handleY - 0.02, bz - 0.03], [bx - 0.015, handleY + 0.012, bz], [bx - 0.01, handleY - 0.02, bz + 0.03], [bx + 0.02, by + 0.08, bz + 0.07]], 0.006, leather);
      s.box([0.064, 0.02, 0.05], [bx + 0.025, by + 0.06, bz], s.material('#c9a94a', { metalness: 0.8, roughness: 0.3 }));
    }

    const alarms = screens.filter((screen) => screen.alarm);
    const rate = mix(1.5, 5, mood.energy);
    return s.finish({
      footprint: 0.34,
      update: alarms.length ? (_dt, time) => { for (const { material } of alarms) material.emissiveIntensity = Math.sin(time * rate * Math.PI) > 0 ? 1.6 : 0.35; } : undefined,
    });
  },
});
