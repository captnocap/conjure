import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = [number, number, number];
const L = 3.2, R = 0.3;

export default defineThing({
  questions: {
    pose: choice('Where is the cryobot right now?', {
      hanging: 'Hanging nose-down from a launch gantry, clear of the hole, on its umbilical.',
      lowering: 'Halfway down the hole: only the tail and thruster still show above the ice.',
      cradle: 'Lying on a sled cradle, umbilical neatly coiled, awaiting launch.',
      beached: 'Hauled out and left lying on the bare ice, umbilical trailing back to the hole.',
    }),
    lights: choice('What are its lights doing?', {
      dark: 'All dark and dead.',
      flood: 'White floodlights blazing from the nose.',
      red: 'A single red status lamp, everything else off.',
      green: 'An eerie green glow from every lamp.',
      amber: 'Warm amber running lights along its length.',
    }),
    damage: choice('What condition is the hull in?', {
      pristine: 'Unmarked, straight from the clean room.',
      scraped: 'Scored with long scrapes from the ice.',
      bitten: 'Marked with crescents of deep punctures, as if something bit it, and a fin torn away.',
      breached: 'Breached: a ragged black hole in the side with the plating bent outward.',
      rimed: 'Crusted white with rime and hung with icicles.',
    }),
    clinging: choice('What is clinging to it?', {
      nothing: 'Nothing.',
      tendrils: 'Pale tendrils wound around the hull like vines.',
      shells: 'A crust of small pale shells, like barnacles.',
      slime: 'Patches of softly glowing blue slime.',
      creature: 'A single many-armed creature gripping the tail, arms wrapped down the body.',
      eggs: 'A cluster of translucent glowing eggs stuck to its side.',
    }),
    arm: choice('What is the sampling arm doing?', {
      stowed: 'Folded flat against the hull.',
      sample: 'Extended, holding a sample canister with something glowing inside.',
      reaching: 'Extended with its claw open, reaching for something.',
      torn: 'Torn off: only a stub and loose wires remain.',
    }),
    hull: choice('What colour is the hull?', {
      yellow: 'Research-submarine yellow with black bands.',
      white: 'White with a blue agency stripe.',
      orange: 'Rescue orange.',
      titanium: 'Bare grey titanium.',
    }),
    umbilical: choice('What is the umbilical like?', {
      yellow: 'A thick yellow hose.',
      black: 'A thin black fibre line.',
      orange: 'A ribbed orange cable.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const b = new Sculpture(context); // the vehicle, built along +y with its nose at the origin
    s.root.add(b.root);
    const { mood, random } = context;
    const hullColour = { yellow: '#f2c21c', white: '#eef0ee', orange: '#f0641c', titanium: '#9aa3a8' }[a.hull];
    const hull = b.material(hullColour, { metalness: a.hull === 'titanium' ? 0.8 : 0.25, roughness: a.hull === 'titanium' ? 0.35 : 0.45 });
    const trim = b.material(a.hull === 'white' ? '#2b62b8' : '#1d2125', { roughness: 0.5 });
    const dark = s.material('#1d2125', { roughness: 0.7 });
    const steel = s.material('#8c969b', { metalness: 0.75, roughness: 0.4 });
    const ice = s.material('#d8ecf4', { roughness: 0.35, flatShading: true });
    const lampColour = { dark: '#30363a', flood: '#ffffff', red: '#30363a', green: '#63ff9a', amber: '#ffb040' }[a.lights];
    const lampOn = a.lights !== 'dark' && a.lights !== 'red';
    const lamp = b.material(lampColour, lampOn ? { emissive: lampColour, emissiveIntensity: mix(1.6, 3, mood.cheer) } : {});
    const tetherColour = { yellow: '#e8c21a', black: '#17191b', orange: '#e8641c' }[a.umbilical];
    const tetherR = { yellow: 0.05, black: 0.022, orange: 0.04 }[a.umbilical];
    const tether = s.material(tetherColour, { roughness: 0.6 });

    // ---- the vehicle ----
    b.lathe([[0.001, 0.26], [0.3, 0.3], [R, 2.4], [0.27, 2.7], [0.17, 3.0], [0.1, L], [0.001, L]], hull);
    b.lathe([[0.001, 0], [0.14, 0.03], [0.24, 0.12], [0.3, 0.3], [0.302, 0.42]], b.material('#b5652c', { metalness: 0.7, roughness: 0.35, emissive: '#ff5a14', emissiveIntensity: mix(0.05, 0.7, mood.warmth) }));
    for (const y of [0.7, 1.9, 2.35]) b.cylinder(R + 0.004, R + 0.004, y === 1.9 ? 0.22 : 0.08, [0, y, 0], trim, 28);
    b.ring(0.33, 0.035, [0, 3.02, 0], trim).rotation.x = Math.PI / 2;
    const finCount = a.damage === 'bitten' ? 3 : 4;
    for (let f = 0; f < finCount; f++) {
      const fin = b.box([0.34, 0.5, 0.025], [Math.cos(f * Math.PI / 2 + Math.PI / 4) * 0.3, 2.8, Math.sin(f * Math.PI / 2 + Math.PI / 4) * 0.3], trim);
      fin.rotation.y = -(f * Math.PI / 2 + Math.PI / 4);
    }
    const prop = b.box([0.5, 0.02, 0.07], [0, 3.1, 0], steel);
    b.box([0.07, 0.02, 0.5], [0, 3.1, 0], steel);
    const badge = b.label(`CB-${1 + Math.floor(random() * 9)}`, 0.5, 0.2, [0, 1.9, R + 0.012], '#f4f4f4', a.hull === 'white' ? '#2b62b8' : '#1d2125');
    badge.rotation.z = Math.PI / 2;
    // Lamps on stalks round the nose, with soft beams when lit.
    const beam = new THREE.MeshStandardMaterial({ color: lampColour, emissive: lampColour, emissiveIntensity: 1, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      const x = Math.cos(angle) * (R + 0.12), z = Math.sin(angle) * (R + 0.12);
      b.rod([Math.cos(angle) * R, 0.75, Math.sin(angle) * R], [x, 0.62, z], 0.02, dark);
      b.cylinder(0.075, 0.06, 0.12, [x, 0.56, z], dark, 12);
      b.cylinder(0.062, 0.062, 0.02, [x, 0.495, z], lamp, 12);
      if (a.lights === 'flood' || a.lights === 'green') {
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.55, 1.5, 14, 1, true), beam);
        cone.position.set(x * 1.5, -0.25, z * 1.5); cone.rotation.set(-Math.sin(angle) * 0.22, 0, Math.cos(angle) * 0.22);
        b.root.add(cone);
      }
    }
    for (let i = 0; i < 6; i++) b.ball([0.035, 0.035, 0.02], [0.06 * (i % 2 ? 1 : -1), 0.95 + i * 0.13, R * 0.985], a.lights === 'amber' || a.lights === 'green' ? lamp : dark, 8);
    let redLamp: THREE.MeshStandardMaterial | null = null;
    if (a.lights === 'red') {
      redLamp = b.material('#ff2a1a', { emissive: '#ff2a1a', emissiveIntensity: 3 });
      b.ball([0.07, 0.07, 0.07], [0, 2.55, R], redLamp, 10);
    }

    // Sampling arm, mounted on the side facing the viewer.
    const armMat = steel;
    const shoulder: P = [0.12, 1.45, R * 0.95];
    b.ball([0.07, 0.07, 0.07], shoulder, dark, 10);
    let sampleGlow: THREE.MeshStandardMaterial | null = null;
    if (a.arm === 'stowed') {
      b.rod(shoulder, [0.12, 0.85, R + 0.05], 0.03, armMat);
      b.rod([0.12, 0.85, R + 0.05], [0.16, 1.3, R + 0.11], 0.025, armMat);
    } else if (a.arm === 'torn') {
      b.rod(shoulder, [0.16, 1.3, R + 0.2], 0.03, armMat);
      for (let w = 0; w < 4; w++) b.tube([[0.16, 1.3, R + 0.2], [0.16 + (random() - 0.5) * 0.2, 1.2, R + 0.32], [0.16 + (random() - 0.5) * 0.3, 1.02 + random() * 0.1, R + 0.3 + random() * 0.15]], 0.008, b.material(['#d33', '#2a6fd3', '#e8c21a', '#111'][w]));
    } else {
      const elbow: P = [0.14, 1.05, R + 0.62], wrist: P = [0.1, 0.42, R + 0.95];
      b.rod(shoulder, elbow, 0.032, armMat);
      b.ball([0.055, 0.055, 0.055], elbow, dark, 10);
      b.rod(elbow, wrist, 0.026, armMat);
      const open = a.arm === 'reaching' ? 0.16 : 0.07;
      for (const side of [-1, 1]) {
        b.rod(wrist, [wrist[0] + side * open, wrist[1] - 0.12, wrist[2] + 0.1], 0.014, dark);
        b.rod([wrist[0] + side * open, wrist[1] - 0.12, wrist[2] + 0.1], [wrist[0] + side * open * 0.4, wrist[1] - 0.26, wrist[2] + 0.16], 0.012, dark);
      }
      if (a.arm === 'sample') {
        sampleGlow = b.material('#9dffd0', { emissive: '#4dffb0', emissiveIntensity: 2, roughness: 0.2 });
        b.cylinder(0.062, 0.062, 0.2, [wrist[0], wrist[1] - 0.17, wrist[2] + 0.13], sampleGlow, 12);
        for (const dy of [-0.07, -0.275]) b.cylinder(0.068, 0.068, 0.03, [wrist[0], wrist[1] + dy, wrist[2] + 0.13], steel, 12);
      }
    }

    // Damage.
    const onHull = (y: number, angle: number, out = 0): P => [Math.cos(angle) * (R + out), y, Math.sin(angle) * (R + out)];
    if (a.damage === 'scraped') {
      const scar = b.material('#5d6468', { metalness: 0.6, roughness: 0.5 });
      for (let i = 0; i < 12; i++) {
        const angle = random() * Math.PI * 2, y = 0.6 + random() * 1.4, len = 0.3 + random() * 0.7;
        b.rod(onHull(y, angle, 0.004), onHull(y + len, angle + (random() - 0.5) * 0.3, 0.004), 0.012, scar);
      }
    } else if (a.damage === 'bitten') {
      const pit = b.material('#0b0d0e', { roughness: 0.9 });
      for (const [y0, a0] of [[1.2, 1.2], [2.2, 2.0], [0.9, -0.4]] as const) {
        for (let tooth = 0; tooth < 9; tooth++) {
          const t = tooth / 8 - 0.5;
          for (const row of [-1, 1]) b.ball([0.035, 0.05, 0.035], onHull(y0 + row * (0.16 - t * t * 0.4), a0 + t * 1.3, -0.005), pit, 8);
        }
      }
    } else if (a.damage === 'breached') {
      const soot = b.material('#0a0b0c', { roughness: 1 });
      const hole = b.ball([0.3, 0.38, 0.1], onHull(1.25, 1.0, -0.03), soot, 14);
      hole.rotation.y = -1.0 + Math.PI / 2;
      for (let p = 0; p < 9; p++) {
        const angle = p * 0.7;
        const from = onHull(1.25 + Math.sin(angle) * 0.34, 1.0 + Math.cos(angle) * 0.75, 0.0), to = onHull(1.25 + Math.sin(angle) * 0.5, 1.0 + Math.cos(angle) * 1.0, 0.16 + random() * 0.14);
        b.rod(from, to, 0.05, hull, 0.008);
      }
      for (let i = 0; i < 8; i++) b.ball([0.14, 0.2, 0.02], onHull(1.25 + (random() - 0.5) * 1.0, 1.0 + (random() - 0.5) * 1.6, 0.0), soot, 8).rotation.y = random() * 3;
    } else if (a.damage === 'rimed') {
      const rime = b.material('#f6fbff', { roughness: 1 });
      b.scatter(new THREE.IcosahedronGeometry(1, 0), rime, Array.from({ length: 150 }, () => ({ at: onHull(0.2 + random() * 2.7, random() * Math.PI * 2, -0.01), size: 0.03 + random() * 0.06 })));
    }

    // Passengers.
    const pulse: THREE.MeshStandardMaterial[] = [];
    if (a.clinging === 'tendrils') {
      const flesh = b.material('#e3c3cf', { roughness: 0.35, emissive: '#7a3a5a', emissiveIntensity: 0.2 });
      for (let t = 0; t < 4; t++) {
        const y0 = 0.45 + random() * 0.5, phi = random() * 6.28, turns = 1.2 + random() * 1.2, len = 1.2 + random() * 1.0, dir = random() < 0.5 ? 1 : -1;
        const pts: P[] = [];
        for (let k = 0; k <= 14; k++) { const u = k / 14; pts.push(onHull(y0 + u * len, phi + dir * u * turns * 6.28, 0.035 + (u > 0.85 ? (u - 0.85) * 2.4 : 0))); }
        b.tube(pts, 0.035, flesh);
      }
    } else if (a.clinging === 'shells') {
      const shell = b.material('#e9e2cf', { roughness: 0.8 });
      const patches = [[0.9, 0.6], [1.7, 2.2], [2.3, -0.8], [1.2, 3.6]];
      b.scatter(new THREE.ConeGeometry(1, 1.1, 7), shell, Array.from({ length: 90 }, () => { const [py, pa] = patches[Math.floor(random() * patches.length)]; return { at: onHull(py + (random() - 0.5) * 0.6, pa + (random() - 0.5) * 1.3, 0.0), size: 0.03 + random() * 0.045 }; }));
    } else if (a.clinging === 'slime') {
      const slime = b.material('#7fd8ff', { emissive: '#35b8ff', emissiveIntensity: 1.3, roughness: 0.15 });
      pulse.push(slime);
      for (let i = 0; i < 12; i++) {
        const angle = random() * 6.28, y = 0.4 + random() * 2.3;
        const blob = b.ball([0.1 + random() * 0.14, 0.14 + random() * 0.25, 0.03], onHull(y, angle, 0), slime, 10);
        blob.rotation.y = -angle + Math.PI / 2;
      }
    } else if (a.clinging === 'creature') {
      const skin = b.material('#c9b6d6', { roughness: 0.3, emissive: '#6a3a8a', emissiveIntensity: 0.25 });
      b.ball([0.42, 0.5, 0.42], [0.1, 2.75, 0.2], skin, 16);
      const eye = b.material('#fff3a8', { emissive: '#ffe45a', emissiveIntensity: 1.6 });
      pulse.push(eye);
      for (const dx of [-0.14, 0.2]) b.ball([0.07, 0.09, 0.05], [0.1 + dx, 2.7, 0.6], eye, 10);
      for (let arm = 0; arm < 7; arm++) {
        const phi = arm * 0.9 + random() * 0.3, len = 1.2 + random() * 0.9, wind = (random() - 0.5) * 2.4;
        const pts: P[] = [[Math.cos(phi) * 0.2 + 0.1, 2.6, Math.sin(phi) * 0.2 + 0.2]];
        for (let k = 1; k <= 8; k++) { const u = k / 8; pts.push(onHull(2.45 - u * len, phi + wind * u, 0.045 + (k === 8 ? 0.15 : 0))); }
        b.tube(pts, 0.045, skin);
      }
    } else if (a.clinging === 'eggs') {
      const egg = b.material('#c8ffe0', { emissive: '#5dffb0', emissiveIntensity: 1.2, roughness: 0.15 });
      pulse.push(egg);
      b.scatter(new THREE.SphereGeometry(1, 10, 8), egg, Array.from({ length: 34 }, () => ({ at: onHull(1.6 + (random() - 0.5) * 0.9, -0.3 + (random() - 0.5) * 1.5, 0.03 + random() * 0.07), size: 0.05 + random() * 0.05 })));
    }

    // ---- the site ----
    const hole = (x: number, z: number, r: number) => {
      const rim = s.lathe([[r - 0.05, 0.02], [r, 0.2], [r + 0.2, 0.15], [r + 0.55, 0.05], [r + 0.9, 0]], ice, [x, 0, z]);
      rim.rotation.y = random() * 3;
      s.cylinder(r - 0.04, r - 0.04, 0.02, [x, 0.13, z], s.material('#04090d', { roughness: 0.25, emissive: '#0a3a5a', emissiveIntensity: mix(0.2, 0.8, mood.cheer) }), 24);
      for (let i = 0; i < 6; i++) { const angle = random() * 6.28, size = 0.07 + random() * 0.12; s.mesh(new THREE.DodecahedronGeometry(size, 0), ice, [x + Math.cos(angle) * (r + 0.6 + random() * 0.5), size * 0.5, z + Math.sin(angle) * (r + 0.6 + random() * 0.5)]).rotation.set(random() * 3, random() * 3, 0); }
    };
    const reel = (x: number, z: number) => {
      for (const dz of [-0.3, 0.3]) {
        s.cylinder(0.5, 0.5, 0.04, [x, 0.55, z + dz], steel, 22).rotation.x = Math.PI / 2;
        s.rod([x - 0.4, 0, z + dz * 1.15], [x, 0.55, z + dz * 1.15], 0.03, steel);
        s.rod([x + 0.4, 0, z + dz * 1.15], [x, 0.55, z + dz * 1.15], 0.03, steel);
      }
      s.cylinder(0.38, 0.38, 0.56, [x, 0.55, z], tether, 22).rotation.x = Math.PI / 2;
    };
    let sunk = false;
    if (a.pose === 'hanging' || a.pose === 'lowering') {
      const top = 4.7;
      for (const x of [-1.25, 1.25]) {
        for (const z of [-1.0, 1.0]) { s.rod([x, 0, z], [x, top, 0], 0.05, steel); s.cylinder(0.14, 0.17, 0.05, [x, 0.025, z], dark, 10); }
        s.rod([x, 1.6, -0.75], [x, 1.6, 0.75], 0.03, steel);
      }
      s.rod([-1.45, top, 0], [1.45, top, 0], 0.07, steel);
      s.box([0.3, 0.3, 0.24], [0, top - 0.2, 0], dark);
      hole(0, 0, 0.62);
      const noseY = a.pose === 'hanging' ? 0.95 : -1.0;
      sunk = a.pose === 'lowering';
      b.root.position.set(0, noseY, 0);
      b.root.rotation.y = -0.5;
      s.rod([0, noseY + L, 0], [0, top - 0.3, 0], tetherR, tether);
      s.tube([[0, top + 0.08, 0], [-0.7, top + 0.1, 0], [-1.4, top + 0.06, 0.05], [-1.8, 3.2, 0.2], [-2.2, 1.2, 0.3], [-2.4, 0.9, 0.3]], tetherR, tether);
      reel(-2.45, 0.3);
    } else if (a.pose === 'cradle') {
      b.root.rotation.z = -Math.PI / 2;
      b.root.rotation.x = -0.9;
      b.root.position.set(-L / 2, 0.62 + R, 0);
      const sledMat = s.material('#3d6f8e', { roughness: 0.6 });
      for (const z of [-0.45, 0.45]) {
        s.tube([[-1.9, 0.22, z], [-1.7, 0.05, z], [1.5, 0.05, z], [1.8, 0.05, z]], 0.04, sledMat);
      }
      for (const x of [-1.0, 0.9]) {
        s.rod([x, 0.05, -0.45], [x, 0.05, 0.45], 0.035, sledMat);
        for (const side of [-1, 1]) { s.rod([x, 0.05, side * 0.45], [x, 0.5, side * 0.3], 0.035, sledMat); s.rod([x, 0.5, side * 0.3], [x, 0.36, 0], 0.03, sledMat); }
      }
      // Umbilical: from the tail to a neat coil on the ice.
      const cx = 2.6, cz = 0.5;
      for (let turn = 0; turn < 5; turn++) s.ring(0.5 - (turn % 2) * 0.05, tetherR, [cx, tetherR + turn * tetherR * 1.7, cz], tether).rotation.x = Math.PI / 2;
      s.tube([[L / 2, 0.92, 0], [L / 2 + 0.5, 0.75, 0.1], [2.3, 0.2, 0.2], [cx + 0.45, tetherR * 9, cz]], tetherR, tether);
      hole(0.3, -1.7, 0.5);
    } else {
      b.root.rotation.z = -Math.PI / 2 + 0.05;
      b.root.rotation.x = -1.2;
      b.root.rotation.y = 0.25;
      b.root.position.set(-L / 2, R + 0.02, 0.4);
      hole(2.3, -1.3, 0.5);
      s.tube([[L / 2 - 0.05, 0.3, 0.0], [2.0, 0.06, 0.3], [2.4, 0.05, 0.9], [3.0, 0.05, 0.4], [3.0, 0.05, -0.6], [2.5, 0.22, -1.1], [2.3, 0.05, -1.3]], tetherR, tether);
      // Drag marks and a puddle refreezing under it.
      const wet = s.material('#9cc4d6', { roughness: 0.1, metalness: 0.2 });
      s.cylinder(0.6, 0.6, 0.012, [-0.2, 0.008, 0.45], wet, 20).scale.x = 2.6;
      for (const dz of [0.15, 0.6]) s.box([1.6, 0.01, 0.07], [1.7, 0.006, dz - 0.5], wet).rotation.y = 0.5;
    }

    const thing = s.finish({
      footprint: 2.6,
      update: (dt, time) => {
        prop.rotation.y += dt * mix(0, 6, mood.energy) * (a.lights === 'dark' ? 0 : 1);
        if (redLamp) redLamp.emissiveIntensity = Math.sin(time * mix(2, 8, mood.energy)) > 0 ? 3 : 0.1;
        if (sampleGlow) sampleGlow.emissiveIntensity = 1.6 + Math.sin(time * 2.3) * 0.6;
        for (const material of pulse) material.emissiveIntensity = 1.2 + Math.sin(time * 1.4) * 0.4;
        if (a.pose === 'hanging') b.root.rotation.y = -0.5 + Math.sin(time * 0.5) * 0.25 * mood.energy;
      },
    });
    // The half-lowered vehicle really is below the ice: keep the ground at y = 0.
    if (sunk) thing.object.position.y = 0;
    return thing;
  },
});
