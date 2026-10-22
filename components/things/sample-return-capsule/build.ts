import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

const INSIDE = {
  dust: 'Vials of plain grey dust: priceless, and it looks like nothing.',
  ice: 'A core of blue-white ice, frosting the glass.',
  glow: 'Something that gives off its own soft green light.',
  seedling: 'A single green seedling in a tube of soil.',
  ember: 'A fragment of red-black rock that still looks hot.',
  letters: 'Rolled paper letters tied with string, not science at all.',
} as const;
const INSIDE_COLOUR: Record<keyof typeof INSIDE, string> = { dust: '#8d8a84', ice: '#bfe4f2', glow: '#6dff9a', seedling: '#5a3d28', ember: '#c0341d', letters: '#efe6cc' };

export default defineThing({
  questions: {
    state: choice('Is it open or sealed?', {
      sealed: 'Sealed tight, exactly as it was packed.',
      open: 'Lid hinged open, the sample canister standing in its cradle.',
      emptied: 'Lid open and the cradle empty: somebody got here first.',
      burst: 'Burst on impact, lid thrown clear, the canister rolled out and its contents spilled.',
    }),
    inside: choice('What is in the canister?', INSIDE),
    landing: choice('How did it come to rest?', {
      upright: 'Sitting on its blunt heat shield, slightly cocked.',
      crater: 'Half-buried and tilted in a small splash crater of its own making.',
      side: 'Rolled over onto its side.',
      cradle: 'Lifted onto a three-legged recovery stand, handled with care.',
    }),
    time: choice('How long has it been down?', {
      minutes: 'Minutes: the shield rim still glows and the ground beneath is scorched.',
      hours: 'Hours: cold now, the beacon strobe flashing for a pickup.',
      years: 'Years: dusted over, the beacon dead, nobody came.',
    }),
    livery: choice('What does the backshell look like?', {
      white: 'White paint with black roll-pattern bands.',
      gold: 'Gold thermal foil.',
      bare: 'Bare machined metal with rivets.',
      orange: 'High-visibility orange, meant to be found.',
    }),
    chute: choice('What became of the parachute?', {
      none: 'There is no parachute to be seen.',
      draped: 'An orange and white canopy lies collapsed beside it, lines still attached.',
      streamer: 'Only a thin drogue ribbon trails away from it.',
    }),
    shield: choice('How did the heat shield fare?', {
      charred: 'Charred black and brown in streaks, as designed.',
      tiles: 'A honeycomb of tiles, several burnt through or missing.',
      pristine: 'Unmarked tan cork: it never went through an atmosphere.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const old = a.time === 'years';
    const dust = old ? mix(0.35, 0.6, mood.wear) : mood.wear * 0.15;
    const grime = new THREE.Color('#8d8982');
    const tone = (hex: string) => new THREE.Color(hex).lerp(grime, dust);
    const mat = (hex: string, metalness = 0, roughness = 0.55, more: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color: tone(hex), metalness: metalness * (1 - dust), roughness: mix(roughness, 0.95, dust), ...more });

    // --- Heat shield map: char streaks run from the nose to the rim -------------------------------
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const char = a.shield === 'pristine' ? 0 : mix(0.55, 1, mood.wear);
    const fade = ctx.createLinearGradient(0, 0, 0, 256);
    fade.addColorStop(0, a.shield === 'pristine' ? '#c9a878' : '#2a221d');
    fade.addColorStop(0.6, a.shield === 'pristine' ? '#c4a06e' : '#6a4630');
    fade.addColorStop(1, a.shield === 'pristine' ? '#b8935f' : '#a57a4d');
    ctx.fillStyle = fade; ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 240 * char; i++) {
      const x = random() * 512, from = random() * 120, len = mix(40, 200, random());
      ctx.strokeStyle = random() < 0.7 ? `rgba(14,11,10,${mix(0.2, 0.7, random())})` : `rgba(214,170,110,${mix(0.15, 0.4, random())})`;
      ctx.lineWidth = mix(1, 7, random());
      ctx.beginPath(); ctx.moveTo(x, from); ctx.lineTo(x + (random() - 0.5) * 10, from + len); ctx.stroke();
    }
    if (a.shield === 'tiles') {
      ctx.strokeStyle = 'rgba(10,8,8,0.8)'; ctx.lineWidth = 2;
      for (let row = 0; row < 7; row++) for (let col = 0; col < 16; col++) {
        const x = col * 32 + (row % 2) * 16, y = row * 38;
        ctx.strokeRect(x, y, 32, 38);
        if (random() < 0.12 + mood.wear * 0.2) { ctx.fillStyle = random() < 0.5 ? '#0c0a0a' : '#d9c7a4'; ctx.fillRect(x + 2, y + 2, 28, 34); }
      }
    }
    const shieldMap = new THREE.CanvasTexture(canvas);
    shieldMap.colorSpace = THREE.SRGBColorSpace;
    const hot = a.time === 'minutes';
    const shieldMaterial = new THREE.MeshStandardMaterial({ map: shieldMap, roughness: 0.95, emissive: hot ? '#ff4a12' : '#000000', emissiveIntensity: hot ? mix(0.25, 0.7, mood.warmth) : 0, side: THREE.DoubleSide });

    const liveryHex = { white: '#eceae3', gold: '#d2a43c', bare: '#b4b9bc', orange: '#d9480f' }[a.livery];
    const shellMaterial = mat(`#${new THREE.Color(liveryHex).offsetHSL(0, (mood.cheer - 0.5) * 0.15, 0).getHexString()}`, a.livery === 'white' || a.livery === 'orange' ? 0.05 : 0.75, a.livery === 'gold' ? 0.4 : 0.5, { side: THREE.DoubleSide });
    const band = mat(a.livery === 'white' ? '#1b1b1d' : a.livery === 'orange' ? '#f4f1e8' : '#3c3f43', 0.2, 0.6);
    const steel = mat('#c2c7ca', 0.8, 0.3), dark = mat('#141517', 0.2, 0.9), goldFoil = mat('#d8ad3f', 0.85, 0.3);

    // --- The capsule, built nose-down ------------------------------------------------------------
    const C = new Sculpture(context);
    const capsule = C.root;
    C.lathe([[0, 0], [0.15, 0.012], [0.3, 0.05], [0.43, 0.11], [0.52, 0.18], [0.555, 0.24], [0.555, 0.262]], shieldMaterial);
    C.lathe([[0.555, 0.262], [0.535, 0.285], [0.36, 0.5]], shellMaterial);
    C.lathe([[0.558, 0.255], [0.56, 0.275], [0.54, 0.29]], steel); // separation ring
    C.lathe([[0.487, 0.345], [0.44, 0.403]], band).scale.multiplyScalar(1.004);
    for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; C.ball([0.012, 0.012, 0.012], [Math.cos(t) * 0.548, 0.275, Math.sin(t) * 0.548], steel, 6); }
    // Two lifting handles and a stencilled serial.
    for (const side of [-1, 1]) {
      const handle = C.ring(0.06, 0.009, [side * 0.455, 0.4, 0], steel, Math.PI);
      handle.rotation.set(0, Math.PI / 2, -side * 0.68, 'ZYX');
    }
    const serial = C.label(`SRC-${1 + Math.floor(random() * 9)}`, 0.2, 0.07, [0, 0.45, 0.405], `#${tone('#1b1b1d').getHexString()}`, `#${tone(a.livery === 'bare' ? '#d7dadc' : '#f4f1e8').getHexString()}`);
    serial.rotation.x = -0.68;
    serial.castShadow = false;
    C.cylinder(0.355, 0.355, 0.012, [0, 0.492, 0], dark, 28);

    // Lid, on a hinge at the back.
    const lid = new Sculpture(context);
    const hinge = new THREE.Group();
    hinge.position.set(-0.36, 0.5, 0);
    lid.root.position.set(0.36, -0.5, 0);
    hinge.add(lid.root);
    capsule.add(hinge);
    lid.lathe([[0.36, 0.5], [0.245, 0.65], [0.2, 0.672], [0, 0.676]], shellMaterial);
    lid.lathe([[0.3, 0.578], [0.27, 0.618]], band).scale.multiplyScalar(1.006);
    lid.cylinder(0.07, 0.085, 0.03, [0, 0.69, 0], steel, 14);
    C.box([0.07, 0.04, 0.12], [-0.375, 0.5, 0], steel);

    // Canister and its cradle.
    const sample = new THREE.Color(INSIDE_COLOUR[a.inside]);
    const sampleMaterial = new THREE.MeshStandardMaterial({ color: sample, roughness: 0.6, emissive: a.inside === 'glow' ? '#3dff84' : a.inside === 'ember' ? '#ff3a12' : a.inside === 'ice' ? '#7fd0ff' : '#000000', emissiveIntensity: a.inside === 'glow' ? 1.6 : a.inside === 'ember' ? 0.7 : a.inside === 'ice' ? 0.25 : 0 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff3ff', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false });
    const canister = new Sculpture(context);
    canister.cylinder(0.105, 0.105, 0.05, [0, 0.025, 0], goldFoil, 18);
    canister.cylinder(0.105, 0.105, 0.05, [0, 0.265, 0], goldFoil, 18);
    canister.cylinder(0.035, 0.05, 0.03, [0, 0.305, 0], steel, 12);
    canister.cylinder(0.095, 0.095, 0.19, [0, 0.145, 0], glass, 18);
    for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2; canister.rod([Math.cos(t) * 0.1, 0.05, Math.sin(t) * 0.1], [Math.cos(t) * 0.1, 0.24, Math.sin(t) * 0.1], 0.007, steel); }
    if (a.inside === 'seedling') {
      canister.cylinder(0.08, 0.08, 0.07, [0, 0.085, 0], sampleMaterial, 14);
      const leaf = new THREE.MeshStandardMaterial({ color: '#4fb04a', roughness: 0.6, emissive: '#1d5a1a', emissiveIntensity: 0.4 });
      canister.rod([0, 0.12, 0], [0.01, 0.2, 0], 0.005, leaf);
      for (const side of [-1, 1]) canister.ball([0.03, 0.006, 0.016], [0.01 + side * 0.03, 0.2, 0], leaf, 8).rotation.z = side * 0.4;
    } else if (a.inside === 'letters') {
      for (let i = 0; i < 5; i++) { const t = (i / 5) * Math.PI * 2; canister.cylinder(0.022, 0.022, 0.17, [Math.cos(t) * 0.045, 0.145, Math.sin(t) * 0.045], sampleMaterial, 8); }
      const string = canister.ring(0.07, 0.004, [0, 0.15, 0], new THREE.MeshStandardMaterial({ color: '#b3202c' }));
      string.rotation.x = Math.PI / 2;
    } else if (a.inside === 'dust') {
      for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI * 2 + 0.4; canister.cylinder(0.026, 0.026, 0.12 + (i % 2) * 0.03, [Math.cos(t) * 0.045, 0.12, Math.sin(t) * 0.045], sampleMaterial, 8); }
    } else if (a.inside === 'ember') {
      const rock = canister.mesh(new THREE.DodecahedronGeometry(0.065, 0), sampleMaterial, [0, 0.14, 0]);
      rock.scale.set(1, 1.2, 0.9); (rock.material as THREE.MeshStandardMaterial).flatShading = true;
    } else canister.cylinder(0.075, 0.075, 0.17, [0, 0.145, 0], sampleMaterial, 14);
    const clamp = C.ring(0.12, 0.014, [0, 0.505, 0], steel);
    clamp.rotation.x = Math.PI / 2;

    // Beacon on the shoulder.
    const strobe = new THREE.MeshStandardMaterial({ color: old ? '#3a2422' : '#5a1410', emissive: '#ff3b2a', emissiveIntensity: old ? 0 : 1.2 });
    C.box([0.09, 0.05, 0.07], [0.3, 0.44, 0.3], band).rotation.y = 0.78;
    C.ball([0.024, 0.024, 0.024], [0.3, 0.485, 0.3], strobe, 10);
    const whipTip: P3 = old ? [0.62, 0.52, 0.5] : [0.4, 0.98, 0.4];
    C.rod([0.33, 0.45, 0.33], whipTip, 0.006, steel, 0.003);

    // --- Lid, canister and contents by state -------------------------------------------------------
    const loose = new Sculpture(context); // things that end up on the ground
    s.root.add(loose.root);
    if (a.state === 'open' || a.state === 'emptied') {
      hinge.rotation.z = mix(1.75, 2.15, random());
      if (a.state === 'open') { canister.root.position.set(0, 0.5, 0); canister.root.scale.setScalar(1.15); capsule.add(canister.root); }
    } else if (a.state === 'burst') {
      capsule.remove(hinge);
      lid.root.position.set(0, 0, 0);
      const thrown = new THREE.Group();
      thrown.add(lid.root);
      lid.root.position.y = -0.676;
      thrown.rotation.set(Math.PI - 0.25, random() * 3, 0.1);
      thrown.position.set(-0.75 - random() * 0.2, 0.01, 0.75 + random() * 0.3);
      loose.root.add(thrown);
      const spill: P3 = [0.75, 0, 0.6];
      canister.root.rotation.set(0, random() * 3, Math.PI / 2);
      canister.root.position.set(spill[0], 0.105, spill[2]);
      loose.root.add(canister.root);
      const pieces = Array.from({ length: 26 }, () => { const t = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.3; return { at: [spill[0] + 0.3 + Math.cos(t) * r, 0.015, spill[2] + Math.sin(t) * r * 0.7] as P3, size: mix(0.012, 0.035, random()) }; });
      const spilled = loose.scatter(new THREE.IcosahedronGeometry(1, 0), sampleMaterial, pieces);
      spilled.castShadow = false;
      // A crack down the backshell.
      for (let i = 0; i < 5; i++) { const piece = C.box([0.012, 0.07, 0.012], [0.11 + i * 0.012 + (i % 2) * 0.02, 0.46 - i * 0.04, 0.38 + i * 0.022], dark); piece.rotation.set(-0.68, 0, (i % 2 ? 1 : -1) * 0.5); }
    } else { canister.root.position.set(0, 0.36, 0); capsule.add(canister.root); }

    // --- Come to rest ------------------------------------------------------------------------------
    s.root.add(capsule);
    const facing = (random() - 0.5) * 0.8;
    const settle = (lowest: number) => { capsule.updateMatrixWorld(true); capsule.position.y += lowest - new THREE.Box3().setFromObject(capsule).min.y; };
    const groundTone = old ? '#8d8982' : '#9a968e';
    if (a.landing === 'upright') {
      capsule.rotation.set(mix(-0.12, 0.12, random()), facing, mix(0.04, 0.16, random()));
      settle(0);
    } else if (a.landing === 'crater') {
      capsule.rotation.set(0.12, facing, -mix(0.3, 0.5, random()));
      settle(-0.1);
      const rim = s.ring(0.74, 0.11, [0.06, 0, 0], new THREE.MeshStandardMaterial({ color: groundTone, roughness: 1 }));
      rim.rotation.x = Math.PI / 2; rim.scale.z = 0.75;
      const ejecta = Array.from({ length: Math.round(mix(14, 40, mood.density)) }, () => { const t = random() * Math.PI * 2, r = mix(0.8, 1.5, random()); return { at: [Math.cos(t) * r, 0.02, Math.sin(t) * r] as P3, size: mix(0.02, 0.07, random() * random()) }; });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#7d7973', roughness: 1, flatShading: true }), ejecta);
    } else if (a.landing === 'side') {
      capsule.rotation.set(0, facing, -mix(1.5, 1.72, random()));
      settle(0);
    } else {
      capsule.rotation.set(0, facing, 0);
      capsule.position.y = 0.34;
      const frame = mat('#e2b21f', 0.4, 0.5);
      const hoop = s.ring(0.47, 0.022, [0, 0.47, 0], frame);
      hoop.rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const t = (i / 3) * Math.PI * 2 + 0.5;
        s.rod([Math.cos(t) * 0.47, 0.47, Math.sin(t) * 0.47], [Math.cos(t) * 0.78, 0, Math.sin(t) * 0.78], 0.02, frame);
        s.cylinder(0.06, 0.07, 0.02, [Math.cos(t) * 0.78, 0.01, Math.sin(t) * 0.78], dark, 12);
      }
    }
    if (hot && a.landing !== 'cradle') s.cylinder(0.85, 0.9, 0.012, [0, 0.006, 0], new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 1 }), 28).castShadow = false;
    if (old && a.landing !== 'cradle') for (let i = 0; i < 5; i++) { const t = random() * Math.PI * 2; s.ball([mix(0.2, 0.4, random()), 0.05, mix(0.15, 0.3, random())], [Math.cos(t) * 0.5, 0, Math.sin(t) * 0.5], new THREE.MeshStandardMaterial({ color: groundTone, roughness: 1 }), 10).castShadow = false; }

    // --- Parachute ---------------------------------------------------------------------------------
    if (a.chute === 'draped') {
      const dome = new THREE.SphereGeometry(0.95, 20, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      const position = dome.attributes.position as THREE.BufferAttribute, colours = new Float32Array(position.count * 3);
      const orange = tone('#ee6a1f'), white = tone('#f1eee6'), tint = new THREE.Color();
      for (let i = 0; i < position.count; i++) {
        const gore = Math.floor(((Math.atan2(position.getZ(i), position.getX(i)) + Math.PI) / (Math.PI * 2)) * 10 + 0.001) % 2;
        tint.copy(gore ? orange : white).toArray(colours, i * 3);
        const fold = Math.sin(position.getX(i) * 9) * Math.cos(position.getZ(i) * 7);
        position.setY(i, Math.max(0.012, position.getY(i) * 0.2 + fold * 0.07 + 0.03));
      }
      dome.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      dome.computeVertexNormals();
      const canopy = s.mesh(dome, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide, flatShading: true }), [-1.55, 0, -0.35]);
      canopy.scale.set(1, 1, 0.8);
      canopy.rotation.y = random() * 3;
      const line = mat('#e8e4d8', 0, 0.8);
      for (let i = 0; i < 5; i++) { const t = -0.9 + i * 0.45; s.tube([[-0.3, 0.42, 0], [-0.6, 0.03, t * 0.25], [-1.55 + Math.cos(t) * 0.9, 0.03, -0.35 + Math.sin(t) * 0.7]], 0.006, line); }
    } else if (a.chute === 'streamer') {
      const points: P3[] = [];
      for (let i = 0; i <= 10; i++) points.push([-0.3 - i * 0.16, i === 0 ? 0.42 : 0.02 + Math.abs(Math.sin(i * 1.3)) * 0.03, Math.sin(i * 0.9) * 0.22]);
      const ribbon = s.tube(points, 0.03, mat('#ee6a1f', 0, 0.8));
      ribbon.scale.y = 0.35;
    }

    const rate = mix(1.5, 7, mood.energy);
    return s.finish({
      footprint: a.chute === 'none' ? 0.75 : 1.3,
      update: (_dt, time) => {
        if (!old) strobe.emissiveIntensity = Math.sin(time * rate) > 0.75 ? 3 : 0.1;
        if (a.inside === 'glow') sampleMaterial.emissiveIntensity = 1.4 + Math.sin(time * 1.3) * 0.5;
      },
    });
  },
});
