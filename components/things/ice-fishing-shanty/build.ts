import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const PAINTS = {
  red: 'Barn red with white trim.',
  green: 'Deep forest green.',
  blue: 'Faded sky blue.',
  yellow: 'Cheerful school-bus yellow.',
  pink: 'Bubblegum pink, somebody\'s joke that stuck.',
  bare: 'Unpainted: raw weathered boards or plain undyed cloth.',
} as const;
const PAINT: Record<keyof typeof PAINTS, string> = { red: '#a8322a', green: '#2f5a3d', blue: '#6f9fc4', yellow: '#e3b62c', pink: '#e58fb0', bare: '#b89a6c' };
const SIGNS = { none: '', gone: 'GONE FISHIN', number: 'MN 4471', keep: 'KEEP OUT', bait: 'BAIT', home: 'HOME' } as const;

export default defineThing({
  questions: {
    construction: choice('How is the shanty built?', {
      plywood: 'A plywood box with a sloping shed roof, knocked together in a garage.',
      canvas: 'A canvas wall tent stretched over a frame on a sledge base, old-fashioned and glowing when lit.',
      tin: 'A corrugated metal shack with an arched roof, rattling and a little rusty.',
      cabin: 'A proper miniature cabin with a peaked shingle roof, built with pride.',
    }),
    paint: choice('What colour is it?', PAINTS),
    light: choice('Is anyone home?', {
      dark: 'Dark and shut. Nobody is here tonight.',
      lit: 'The window glows steady warm yellow.',
      lantern: 'A lantern flickers inside, dim and orange.',
      open: 'The door stands open and light spills out across the ice.',
    }),
    stove: noul('Is smoke rising from the stovepipe?'),
    outside: choice('What has been left outside?', {
      nothing: 'Nothing but the hole.',
      auger: 'A tall hand auger with a spiral bit, leaning against the wall.',
      sled: 'A plastic haul sled loaded with a bucket and tackle box.',
      catch: 'The catch laid out in a row on the ice beside a bucket.',
      chair: 'A folding stool, a thermos and a short jigging rod set over the hole.',
    }),
    tipups: choice('What are the tip-up flags doing?', {
      none: 'No tip-ups, just the one open hole.',
      set: 'One tip-up set over the hole, flag folded down, waiting.',
      sprung: 'The flag has sprung straight up: a fish is on.',
      spread: 'Several tip-ups set in a spread of holes, one of them sprung.',
    }),
    state: choice('What state is it in?', {
      tidy: 'Squared away and well kept, set up for the season.',
      drifted: 'Half buried by drifting snow, roof loaded white.',
      sinking: 'Left out too late in spring: tilting and settling into meltwater.',
    }),
    sign: choice('If something is painted on it, what does it say?', { none: 'Nothing.', gone: 'GONE FISHIN', number: 'A licence number, MN 4471.', keep: 'KEEP OUT', bait: 'BAIT', home: 'HOME' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const h = new Sculpture(context);
    s.root.add(h.root);
    const { mood, random } = context;
    const W = 1.9, D = 2.3, F = 0.18;
    const lit = a.light !== 'dark';
    const glowColour = a.light === 'lantern' ? '#ff9a3c' : '#ffd27a';
    const glow = new THREE.MeshStandardMaterial({ color: lit ? glowColour : '#1c2a38', emissive: lit ? glowColour : '#000000', emissiveIntensity: lit ? (a.light === 'lantern' ? 0.9 : 1.3) : 0, roughness: 0.3 });
    const base = new THREE.Color(PAINT[a.paint]);
    const canvas = a.construction === 'canvas';
    const wallColour = canvas ? base.clone().lerp(new THREE.Color('#e4d9bd'), a.paint === 'bare' ? 0.9 : 0.55) : a.construction === 'tin' ? base.clone().lerp(new THREE.Color('#9aa3a6'), a.paint === 'bare' ? 0.95 : 0.35) : base;
    const wall = h.material(wallColour, { roughness: a.construction === 'tin' ? 0.5 : 0.9, metalness: a.construction === 'tin' ? 0.5 : 0, emissive: canvas && lit ? glowColour : '#000000', emissiveIntensity: canvas && lit ? 0.35 : 0 });
    const trim = h.material(a.paint === 'bare' ? '#7a6244' : '#efe9da');
    const wood = h.material('#7b5a3a');
    const darkWood = h.material('#4a3626');
    const iron = h.material('#2a2c2e', { metalness: 0.6, roughness: 0.5 });
    const snow = s.material('#f6fafc', { roughness: 1 });

    const prismZ = (profile: [number, number][], depth: number) => {
      const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
      return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
    };
    const prismX = (profile: [number, number][], width: number) => prismZ(profile, width).rotateY(-Math.PI / 2);

    // Runners with upturned noses and cross bearers.
    for (const x of [-0.72, 0.72]) {
      h.box([0.09, 0.14, D + 0.5], [x, 0.07, 0], wood);
      const nose = h.box([0.09, 0.14, 0.4], [x, 0.14, D / 2 + 0.4], wood);
      nose.rotation.x = -0.5;
    }
    for (const z of [-0.9, 0, 0.9]) h.box([W, 0.06, 0.1], [0, 0.15, z], darkWood);
    h.tube([[-0.72, 0.2, D / 2 + 0.55], [-0.4, 0.04, D / 2 + 0.95], [0.4, 0.04, D / 2 + 0.95], [0.72, 0.2, D / 2 + 0.55]], 0.015, h.material('#c9b27c'));

    let top = 2.1, frontTop = 2.0;
    if (a.construction === 'plywood') {
      h.mesh(prismX([[-D / 2, F], [D / 2, F], [D / 2, 2.05], [-D / 2, 1.7]], W), wall).position.x = 0;
      const roof = h.box([W + 0.24, 0.06, D + 0.36], [0, 1.9, 0], darkWood);
      roof.rotation.x = -Math.atan2(0.35, D);
      for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) h.box([0.07, 1.6, 0.07], [x, F + 0.8, z], trim);
      top = 2.1; frontTop = 2.0;
    } else if (canvas) {
      h.box([W + 0.1, 0.1, D + 0.1], [0, F + 0.05, 0], wood);
      h.mesh(prismZ([[-W / 2, F + 0.1], [W / 2, F + 0.1], [W / 2 - 0.06, 1.3], [0, 2.12], [-W / 2 + 0.06, 1.3]], D), wall);
      h.rod([0, 2.13, -D / 2 - 0.25], [0, 2.13, D / 2 + 0.25], 0.035, wood);
      for (const z of [-D / 2 - 0.02, D / 2 + 0.02]) { h.rod([-0.25, F, z], [0, 2.13, z], 0.03, wood); h.rod([0.25, F, z], [0, 2.13, z], 0.03, wood); }
      const rope = h.material('#c9b27c');
      for (const x of [-1, 1]) for (const z of [-0.8, 0.8]) { h.rod([x * (W / 2 - 0.06), 1.3, z], [x * (W / 2 + 0.75), 0.02, z * 1.2], 0.01, rope); h.rod([x * (W / 2 + 0.75), -0.05, z * 1.2], [x * (W / 2 + 0.8), 0.2, z * 1.2], 0.02, wood); }
      top = 2.15; frontTop = 1.9;
    } else if (a.construction === 'tin') {
      const arch: [number, number][] = [[-W / 2, F], [W / 2, F]];
      for (let i = 0; i <= 10; i++) { const angle = i / 10 * Math.PI; arch.push([Math.cos(angle) * W / 2, 1.5 + Math.sin(angle) * 0.55]); }
      h.mesh(prismZ(arch, D), wall);
      const rib = h.material(wallColour.clone().multiplyScalar(0.72), { metalness: 0.5, roughness: 0.6 });
      for (let i = 0; i < 12; i++) {
        const z = -D / 2 + (i + 0.5) * D / 12;
        for (const x of [-1, 1]) h.box([0.02, 1.3, 0.05], [x * (W / 2 + 0.008), F + 0.67, z], rib);
      }
      for (let i = 0; i < 9; i++) h.box([0.05, 1.6 + Math.sin((i + 0.5) / 9 * Math.PI) * 0.45, 0.02], [-W / 2 + (i + 0.5) * W / 9, F + 0.8 + Math.sin((i + 0.5) / 9 * Math.PI) * 0.22, D / 2 + 0.008], rib);
      const rust = new THREE.MeshStandardMaterial({ color: '#8c4a24', roughness: 1, transparent: true, opacity: mix(0.25, 0.9, mood.wear), depthWrite: false });
      for (let i = 0; i < 6; i++) h.box([0.012, 0.2 + random() * 0.6, 0.2 + random() * 0.5], [(random() < 0.5 ? -1 : 1) * (W / 2 + 0.02), F + 0.2 + random() * 0.4, (random() - 0.5) * D * 0.8], rust).castShadow = false;
      top = 2.05; frontTop = 1.95;
    } else {
      h.mesh(prismZ([[-W / 2, F], [W / 2, F], [W / 2, 1.55], [0, 2.3], [-W / 2, 1.55]], D), wall);
      const shingle = h.material('#4b4038');
      const pitch = Math.atan2(0.75, W / 2), run = Math.hypot(0.75, W / 2) + 0.22;
      for (const side of [-1, 1]) {
        const plane = h.box([run, 0.07, D + 0.4], [side * (W / 4 + 0.07), 1.94, 0], shingle);
        plane.rotation.z = -side * pitch;
        for (let i = 1; i < 5; i++) { const lap = h.box([0.03, 0.09, D + 0.42], [side * (i / 5 * (W / 2 + 0.15)), 2.33 - i / 5 * 0.86, 0], h.material('#3a312b')); lap.rotation.z = -side * pitch; }
      }
      for (let i = 0; i < 6; i++) for (const x of [-1, 1]) h.box([0.012, 0.02, D], [x * (W / 2 + 0.004), F + 0.25 + i * 0.22, 0], h.material(base.clone().multiplyScalar(0.7)));
      for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) h.box([0.08, 1.4, 0.08], [x, F + 0.7, z], trim);
      top = 2.35; frontTop = 2.1;
    }

    // Door and window on the front (+z), another window on the +x side.
    const fz = D / 2 + 0.012;
    const doorOpen = a.light === 'open';
    if (canvas) {
      h.mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.34, F + 0.1), new THREE.Vector2(0.34, F + 0.1), new THREE.Vector2(0.04, 1.75), new THREE.Vector2(-0.04, 1.75)])), doorOpen ? glow : h.material(wallColour.clone().multiplyScalar(0.78)), [0, 0, fz]);
      if (doorOpen) for (const side of [-1, 1]) { const flap = h.box([0.3, 1.3, 0.03], [side * 0.42, F + 0.8, fz + 0.03], h.material(wallColour.clone().multiplyScalar(0.88))); flap.rotation.z = side * 0.18; }
      else for (let i = 0; i < 4; i++) h.box([0.1, 0.02, 0.02], [0, F + 0.4 + i * 0.35, fz + 0.01], h.material('#c9b27c'));
    } else {
      h.box([0.74, 1.5, 0.02], [-0.38, F + 0.77, fz], doorOpen ? glow : darkWood);
      for (const [x, y, w, t] of [[-0.38, F + 1.54, 0.86, 0.06], [-0.78, F + 0.77, 0.06, 1.56], [0.02, F + 0.77, 0.06, 1.56]] as const) h.box([w, t, 0.04], [x, y, fz + 0.01], trim);
      if (doorOpen) {
        const leaf = h.box([0.72, 1.48, 0.04], [-0.78 - 0.3, F + 0.77, fz + 0.2], darkWood);
        leaf.rotation.y = 0.9;
      } else h.ball([0.03, 0.03, 0.03], [-0.1, F + 0.75, fz + 0.03], iron, 8);
      h.box([0.44, 0.4, 0.02], [0.52, 1.25, fz], glow);
      h.box([0.52, 0.05, 0.04], [0.52, 1.03, fz + 0.01], trim); h.box([0.52, 0.05, 0.04], [0.52, 1.47, fz + 0.01], trim);
      h.box([0.03, 0.4, 0.035], [0.52, 1.25, fz + 0.01], trim); h.box([0.44, 0.03, 0.035], [0.52, 1.25, fz + 0.01], trim);
      for (const x of [0.28, 0.76]) h.box([0.05, 0.48, 0.04], [x, 1.25, fz + 0.01], trim);
    }
    const sx = W / 2 + 0.012;
    if (!canvas) {
      h.box([0.02, 0.4, 0.5], [sx, 1.2, -0.2], glow);
      for (const y of [0.98, 1.42]) h.box([0.04, 0.05, 0.6], [sx + 0.01, y, -0.2], trim);
      for (const z of [-0.47, 0.07, -0.2]) h.box([0.04, 0.4, z === -0.2 ? 0.03 : 0.05], [sx + 0.01, 1.2, z], trim);
    } else h.box([0.02, 0.3, 0.3], [W / 2 - 0.03, 0.95, -0.2], glow);
    const text = SIGNS[a.sign];
    if (text) {
      const plate = h.label(text, 0.9, 0.2, [-sx - 0.006, 1.2, 0], a.paint === 'bare' || canvas ? '#2b2620' : '#f4efe2', `#${wallColour.getHexString()}`);
      plate.rotation.y = -Math.PI / 2;
      const copy = h.label(text, 0.62, 0.14, canvas ? [0.5, 0.75, fz + 0.01] : [0.52, 0.78, fz + 0.005], a.paint === 'bare' || canvas ? '#2b2620' : '#f4efe2', `#${wallColour.getHexString()}`);
      if (canvas) copy.rotation.z = 0.05;
    }

    // Stovepipe with a rain cap.
    const px = canvas ? 0.45 : -0.5, pz = -0.65;
    h.cylinder(0.065, 0.065, top - 0.7, [px, 1.2 + (top - 0.7) / 2 + 0.2, pz], iron, 12);
    h.cylinder(0.11, 0.11, 0.03, [px, top + 0.55, pz], iron, 12);
    h.cylinder(0.02, 0.13, 0.08, [px, top + 0.62, pz], iron, 12);
    const puffs: THREE.Mesh[] = [];
    if (a.stove) {
      const smoke = new THREE.MeshStandardMaterial({ color: '#e7ebee', transparent: true, opacity: 0.55, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 7; i++) {
        const puff = s.ball([1, 1, 1], [px, top + 0.8, pz], smoke, 10);
        puff.castShadow = false;
        puff.userData.offset = i / 7;
        puffs.push(puff);
      }
    }

    // Snow load, drift and meltwater.
    if (a.state === 'drifted') {
      const cap = h.ball([W * 0.55, 0.16, D * 0.56], [0, frontTop + (a.construction === 'cabin' || canvas ? 0.12 : 0.02), 0], snow, 14);
      if (a.construction === 'plywood') cap.rotation.x = -0.15;
      if (a.construction === 'cabin' || canvas) cap.scale.set(0.5, 0.14, D * 0.56);
      s.ball([1.0, 0.75, 1.7], [-W / 2 - 0.35, 0, -0.2], snow, 14);
      s.ball([1.3, 0.5, 0.9], [-0.3, 0, -D / 2 - 0.3], snow, 14);
      s.ball([0.5, 0.25, 0.5], [W / 2 + 0.2, 0, -D / 2 + 0.2], snow, 10);
    } else if (a.state === 'sinking') {
      h.root.rotation.set(-0.06, 0, 0.13);
      h.root.position.y = -0.14;
      const melt = s.mesh(new THREE.CircleGeometry(1.9, 22).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#4fb4cc', roughness: 0.08, emissive: '#1f8aa3', emissiveIntensity: 0.2 }), [0.35, 0.008, 0.1]);
      melt.scale.set(1, 1, 1.15);
      melt.castShadow = false;
    }

    // Light spilled on the ice.
    if (lit) {
      const spill = new THREE.MeshBasicMaterial({ color: glowColour, transparent: true, opacity: doorOpen ? 0.5 : 0.28, depthWrite: false });
      const pool = s.mesh(new THREE.PlaneGeometry(doorOpen ? 0.9 : 0.6, doorOpen ? 1.3 : 0.9).rotateX(-Math.PI / 2), spill, [canvas ? 0 : doorOpen ? -0.38 : 0.52, 0.012, D / 2 + (doorOpen ? 0.7 : 0.5)]);
      pool.castShadow = false;
    }

    // Holes and tip-ups.
    const holeMaterial = new THREE.MeshStandardMaterial({ color: '#0d2130', roughness: 0.12 });
    const flagMaterial = new THREE.MeshStandardMaterial({ color: '#f25c1c', emissive: '#f25c1c', emissiveIntensity: 0.25, side: THREE.DoubleSide, roughness: 0.8 });
    const flags: THREE.Object3D[] = [];
    const hole = (x: number, z: number) => {
      const water = s.cylinder(0.14, 0.14, 0.012, [x, 0.012, z], holeMaterial, 14);
      water.castShadow = false;
      const rim = s.ring(0.17, 0.035, [x, 0.012, z], snow);
      rim.rotation.x = Math.PI / 2;
      rim.scale.z = 0.6;
    };
    const tipup = (x: number, z: number, sprung: boolean, spin: number) => {
      const t = new Sculpture(context);
      t.box([0.6, 0.025, 0.05], [0, 0.04, 0], wood);
      t.box([0.05, 0.025, 0.5], [0, 0.04, 0], wood);
      t.box([0.03, 0.34, 0.03], [0, 0.2, 0], wood);
      t.cylinder(0.035, 0.035, 0.02, [0.05, 0.1, 0], iron, 10).rotation.z = Math.PI / 2;
      const arm = new THREE.Group();
      arm.position.set(0, 0.37, 0);
      const strip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.55, 6).translate(0, 0.275, 0), iron);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.14).translate(0.1, 0.48, 0), flagMaterial);
      strip.castShadow = cloth.castShadow = true;
      arm.add(strip, cloth);
      arm.rotation.z = sprung ? (random() - 0.5) * 0.15 : -1.75;
      t.root.add(arm);
      if (sprung) flags.push(arm);
      t.root.position.set(x, 0, z);
      t.root.rotation.y = spin;
      s.root.add(t.root);
    };
    const hx = W / 2 + 0.75, hz = 0.75;
    hole(hx, hz);
    if (a.tipups !== 'none' && a.outside !== 'chair') tipup(hx, hz, a.tipups === 'sprung', random() * 3);
    if (a.tipups === 'spread') {
      const extra = 2 + Math.round(mood.density * 2);
      const sprungOne = Math.floor(random() * extra);
      for (let i = 0; i < extra; i++) {
        const angle = -0.5 + i / Math.max(1, extra - 1) * 2.3, far = 2.25 + random() * 0.45;
        const x = Math.sin(angle) * far * 0.95 + 0.5, z = Math.cos(angle) * far + 0.2;
        hole(x, z);
        tipup(x, z, i === sprungOne, random() * 3);
      }
    }

    // What is outside.
    if (a.outside === 'auger') {
      const g = new Sculpture(context);
      const steel = g.material('#c2392f', { metalness: 0.3, roughness: 0.5 });
      g.rod([0, 0, 0], [0, 1.45, 0], 0.018, iron);
      g.tube(Array.from({ length: 41 }, (_unused, i) => [Math.cos(i * 0.63) * 0.085, 0.04 + i * 0.016, Math.sin(i * 0.63) * 0.085] as const), 0.016, steel);
      g.cylinder(0.02, 0.09, 0.05, [0, 0.02, 0], iron, 10);
      g.rod([0, 1.45, 0], [0.16, 1.45, 0], 0.016, iron); g.rod([0.16, 1.45, 0], [0.16, 1.62, 0], 0.016, iron);
      g.cylinder(0.03, 0.03, 0.12, [0.16, 1.68, 0], wood, 8);
      g.rod([0, 1.15, 0], [-0.16, 1.15, 0], 0.016, iron); g.cylinder(0.03, 0.03, 0.12, [-0.16, 1.1, 0], wood, 8);
      g.root.position.set(W / 2 + 0.42, 0, -0.55);
      g.root.rotation.z = 0.24;
      s.root.add(g.root);
    } else if (a.outside === 'sled') {
      const g = new Sculpture(context);
      const tub = g.material('#e2671e', { roughness: 0.5 });
      g.box([0.62, 0.05, 1.25], [0, 0.03, 0], tub);
      for (const x of [-0.31, 0.31]) g.box([0.04, 0.2, 1.25], [x, 0.12, 0], tub);
      g.box([0.62, 0.2, 0.04], [0, 0.12, -0.62], tub);
      g.box([0.62, 0.04, 0.3], [0, 0.14, 0.72], tub).rotation.x = -0.75;
      g.cylinder(0.15, 0.12, 0.34, [0, 0.23, -0.3], g.material('#f1f0ea'), 14);
      g.ring(0.15, 0.008, [0, 0.42, -0.3], iron, Math.PI).rotation.y = 0.4;
      g.box([0.4, 0.2, 0.24], [0.02, 0.16, 0.15], g.material('#2f6b4a'));
      g.box([0.42, 0.03, 0.26], [0.02, 0.27, 0.15], g.material('#234f37'));
      g.tube([[-0.2, 0.2, 0.8], [-0.15, 0.03, 1.2], [0.2, 0.03, 1.45], [0.25, 0.03, 1.1]], 0.012, g.material('#f0e6a8'));
      g.root.position.set(W / 2 + 0.75, 0, -0.75);
      g.root.rotation.y = 0.35 + random() * 0.4;
      s.root.add(g.root);
    } else if (a.outside === 'catch') {
      const count = 3 + Math.round(mood.density * 4);
      for (let i = 0; i < count; i++) {
        const tone = new THREE.Color(['#8a9a5a', '#b9a24c', '#9aa7ad'][i % 3]);
        const fish = new THREE.MeshStandardMaterial({ color: tone, roughness: 0.35, metalness: 0.3 });
        const length = 0.16 + random() * 0.1;
        const x = W / 2 + 0.38 + i * 0.17, z = -0.7 + (random() - 0.5) * 0.08;
        s.ball([0.04, 0.03, length], [x, 0.03, z], fish, 10);
        const tail = s.mesh(new THREE.ConeGeometry(0.05, 0.1, 4).rotateX(-Math.PI / 2), fish, [x, 0.03, z - length - 0.03]);
        tail.scale.set(1, 0.25, 1);
        s.ball([0.012, 0.012, 0.012], [x, 0.055, z + length * 0.7], iron, 6);
      }
      s.cylinder(0.15, 0.12, 0.34, [W / 2 + 0.45, 0.17, -1.25], s.material('#f1f0ea'), 14);
    } else if (a.outside === 'chair') {
      const cx = hx + 0.1, cz = hz - 0.6;
      for (const x of [-0.18, 0.18]) { s.rod([cx + x, 0, cz - 0.16], [cx + x, 0.42, cz + 0.16], 0.014, iron); s.rod([cx + x, 0, cz + 0.16], [cx + x, 0.42, cz - 0.16], 0.014, iron); }
      s.box([0.42, 0.025, 0.36], [cx, 0.43, cz], s.material('#3d5a80'));
      s.cylinder(0.045, 0.045, 0.28, [cx - 0.4, 0.14, cz + 0.1], s.material('#2f6b4a', { metalness: 0.3 }), 12);
      s.cylinder(0.04, 0.045, 0.06, [cx - 0.4, 0.31, cz + 0.1], s.material('#c9cdd0', { metalness: 0.7, roughness: 0.3 }), 12);
      s.rod([cx + 0.05, 0.45, cz + 0.1], [hx, 0.5, hz + 0.02], 0.008, iron);
      s.rod([hx, 0.5, hz + 0.02], [hx, 0.01, hz], 0.003, s.material('#e8e8e8'));
      s.cylinder(0.035, 0.035, 0.03, [cx + 0.07, 0.45, cz + 0.12], s.material('#c2392f'), 10).rotation.z = Math.PI / 2;
    }

    // The ice it all stands on.
    const shape = new THREE.Shape();
    const corners = 14, spread = a.tipups === 'spread' ? 3.3 : 2.5;
    for (let i = 0; i < corners; i++) {
      const angle = i / corners * 6.283, wobble = 0.92 + random() * 0.14;
      const x = 0.35 + Math.cos(angle) * spread * wobble, z = 0.25 + Math.sin(angle) * spread * wobble;
      if (i === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z);
    }
    const lake = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false }).rotateX(-Math.PI / 2), s.material(a.state === 'sinking' ? '#b7d3df' : '#cfe0ea', { roughness: 0.35, flatShading: true }), [0, -0.14, 0]);
    lake.castShadow = false;
    const patch = s.material('#eef4f8', { roughness: 1 });
    if (a.state !== 'sinking') for (let i = 0; i < 6; i++) {
      const angle = random() * 6.283, far = spread * mix(0.55, 0.85, random());
      s.ball([0.4 + random() * 0.6, 0.03 + random() * 0.03, 0.25 + random() * 0.3], [0.35 + Math.cos(angle) * far, 0, 0.25 + Math.sin(angle) * far], patch, 10).rotation.y = random() * 3;
    }

    const thing = s.finish({
      update: (_dt, time) => {
        const speed = mix(0.08, 0.3, mood.energy);
        for (const puff of puffs) {
          const t = (time * speed + puff.userData.offset) % 1;
          puff.position.set(px + t * t * mix(0.3, 1.6, mood.energy), top + 0.75 + t * 1.5, pz + Math.sin(t * 5 + puff.userData.offset * 9) * 0.08);
          puff.scale.setScalar(0.09 + t * 0.3);
        }
        if (a.light === 'lantern') glow.emissiveIntensity = 0.75 + Math.sin(time * 9) * 0.12 + Math.sin(time * 23.7) * 0.1;
        for (const flag of flags) flag.rotation.x = Math.sin(time * mix(2, 7, mood.energy)) * 0.08;
      },
    });
    thing.update?.(0, 0);
    return { ...thing, dispose: () => { thing.dispose(); glow.dispose(); holeMaterial.dispose(); flagMaterial.dispose(); } };
  },
});
