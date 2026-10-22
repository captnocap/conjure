import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { gearGeometry, painted, windKey } from './parts';

type P = readonly [number, number, number];

export default defineThing({
  questions: {
    owner: choice('Whose carriage is it?', {
      aristocrat: 'An aristocrat: midnight-blue lacquer, gold lining, a crest on the door, red curtains.',
      post: 'The post: pillar-box red, lettered sides, mail sacks and parcels roped to the roof, a brass horn.',
      hearse: 'An undertaker: black with long glass sides, a coffin within, black plumes at the roof corners.',
      circus: 'A circus: red and yellow stripes, bunting, a painted signboard and stars.',
      cab: 'A cab for hire: mustard and brown, a FOR HIRE flag, a trunk on the roof.',
    }),
    state: choice('What is the carriage doing?', {
      waits: 'Waiting at the kerb, wound and patient, step folded down, lanterns half-lidded.',
      departs: 'Pulling away: wheels turning, key spinning, dust kicking up behind.',
      'run-down': 'Run down in the middle of its journey: dark lanterns, a door hanging open, nobody near.',
      thrown: 'It has thrown its spring: steel ribbon coiled out across the road, a wheel off, the body tipped over.',
    }),
    driver: choice('Who sits on the box seat?', {
      empty: 'No one. The seat is bare.',
      coachman: 'A brass automaton coachman in a top hat, hand on the tiller.',
      levers: 'No driver, only a bank of brass levers and a steering wheel.',
    }),
    inside: choice('What shows at the windows?', {
      curtains: 'Drawn curtains.',
      dark: 'Nothing: an empty dark interior.',
      passenger: 'The still silhouette of one passenger.',
    }),
    eyes: choice('What are its front lanterns like?', {
      round: 'Two big round glass eyes.',
      square: 'Two square four-paned coach lamps.',
      cyclops: 'A single great lamp in the middle.',
      stalks: 'Small lamps on long curved stalks, like a snail.',
    }),
    drum: choice('What is the mainspring drum like?', {
      brass: 'A banded brass barrel.',
      glass: 'Open-sided, the coiled blue-steel spring plain to see.',
      iron: 'A black riveted iron barrel, heavy and industrial.',
    }),
    key: choice('What is the bow of its great key shaped like?', {
      butterfly: 'Two loops.',
      heart: 'A heart.',
      ring: 'A plain ring.',
      tbar: 'A T-bar with ball ends.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const thrown = a.state === 'thrown';
    const dead = a.state === 'run-down' || thrown;
    const paint = { aristocrat: '#1a2140', post: '#b3261e', hearse: '#17171a', circus: '#e2b62c', cab: '#b08a2e' }[a.owner];
    const trimTone = a.owner === 'hearse' ? '#c9ced2' : '#d6aa3c';
    const body = s.material(paint, { roughness: 0.32, metalness: 0.15 });
    const trim = s.material(new THREE.Color(trimTone).lerp(new THREE.Color('#5f9a84'), mood.wear * 0.3), { metalness: 0.55, roughness: 0.35 });
    const brass = s.material(new THREE.Color('#c99a3e').lerp(new THREE.Color('#5f9a84'), mood.wear * 0.4), { metalness: 0.55, roughness: 0.38 });
    const dark = s.material('#1b1b1e', { roughness: 0.7 });
    const wood = s.material(a.owner === 'cab' ? '#5a3a26' : '#3a2a20', { roughness: 0.7 });
    const glow = new THREE.Color().setHSL(mix(0.14, 0.08, mood.warmth), 0.95, 0.66);
    const lampOn = !dead;

    // Body: a coach profile extruded across its width.
    const W = 1.42;
    const outline = new THREE.Shape();
    outline.moveTo(-1.0, 1.05);
    outline.quadraticCurveTo(-0.95, 0.66, -0.55, 0.62);
    outline.lineTo(0.55, 0.62);
    outline.quadraticCurveTo(0.95, 0.66, 1.0, 1.05);
    outline.lineTo(0.98, 1.6);
    outline.lineTo(0.9, 2.08);
    outline.quadraticCurveTo(0, 2.3, -0.9, 2.08);
    outline.lineTo(-0.98, 1.6);
    outline.closePath();
    const shell = new THREE.ExtrudeGeometry(outline, { depth: W, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 8 });
    shell.translate(0, 0, -W / 2);
    s.mesh(shell, body).rotation.y = -Math.PI / 2;
    // Roof and waist mouldings.
    s.box([W + 0.12, 0.05, 2.0], [0, 2.1, 0], trim).scale.set(1, 1, 0.96);
    s.box([W + 0.08, 0.04, 2.02], [0, 1.2, 0], trim);
    const hearse = a.owner === 'hearse';
    const glass = new THREE.MeshStandardMaterial({ color: hearse ? '#b8c6cc' : '#27303a', roughness: 0.15, metalness: 0.2, transparent: hearse, opacity: hearse ? 0.45 : 1 });
    const curtain = s.material(a.owner === 'aristocrat' ? '#9a1f2a' : a.owner === 'circus' ? '#c2261e' : '#7a6a58', { roughness: 0.9 });
    let door: THREE.Group | null = null;
    for (const side of [-1, 1]) {
      const x = side * (W / 2 + 0.035);
      if (hearse) {
        s.box([0.02, 0.74, 1.66], [x, 1.63, 0], glass).castShadow = false;
        for (const z of [-0.84, 0, 0.84]) s.box([0.04, 0.8, 0.05], [x, 1.63, z], trim);
      } else {
        for (const z of [-0.62, 0.62]) s.box([0.02, 0.5, 0.4], [x, 1.62, z], glass);
        // Door with its own window, handle and lining.
        const leaf = new THREE.Group();
        leaf.position.set(x, 1.3, 0.28);
        s.root.add(leaf);
        const dz = -0.28;
        leaf.add(s.box([0.03, 1.2, 0.56], [0, 0, dz], body), s.box([0.035, 0.46, 0.4], [side * 0.004, 0.32, dz], glass));
        for (const [w, h, y, z] of [[0.6, 0.03, 0.6, dz], [0.6, 0.03, -0.6, dz], [0.03, 1.2, 0, dz - 0.29], [0.03, 1.2, 0, dz + 0.29]] as const) leaf.add(s.box([0.04, h, w], [side * 0.004, y, z], trim));
        leaf.add(s.ball([0.03, 0.03, 0.05], [side * 0.03, -0.02, dz - 0.2], trim, 8));
        if (a.inside === 'curtains') leaf.add(s.box([0.04, 0.46, 0.3], [side * 0.008, 0.32, dz - 0.03], curtain));
        if (a.inside === 'passenger' && !thrown) {
          leaf.add(s.ball([0.012, 0.11, 0.09], [side * 0.012, 0.3, dz], dark, 10), s.box([0.014, 0.14, 0.26], [side * 0.012, 0.16, dz], dark));
        }
        if (a.owner === 'aristocrat') leaf.add(s.mesh(gearGeometry(0.13, 10, 0.02, 0.04), trim, [side * 0.02, -0.25, dz])).children.at(-1)!.rotation.y = Math.PI / 2;
        if (a.owner === 'circus') leaf.add(s.mesh(gearGeometry(0.16, 5, 0.02, 0, 0, 0.09), s.material('#c2261e'), [side * 0.02, -0.25, dz])).children.at(-1)!.rotation.y = Math.PI / 2;
        if (a.owner === 'cab') { const plate = s.label(String(10 + Math.floor(random() * 89)), 0.3, 0.2, [side * 0.022, -0.25, dz], '#1b1b1e', '#efe6cf'); plate.rotation.y = side * Math.PI / 2; leaf.add(plate); }
        if (a.owner === 'post') { const plate = s.label('POST', 0.46, 0.2, [side * 0.022, -0.25, dz], '#f4e6b0', '#8f1c16'); plate.rotation.y = side * Math.PI / 2; leaf.add(plate); }
        if (a.inside === 'curtains') for (const z of [-0.62, 0.62]) s.box([0.03, 0.5, 0.3], [x + side * 0.004, 1.62, z], curtain);
        if (side === 1 && a.state === 'run-down') { leaf.rotation.y = 1.15; door = leaf; }
        if (side === 1 && a.state !== 'departs') {
          s.box([0.26, 0.03, 0.4], [x + 0.14, 0.42, 0], brass);
          for (const z of [-0.18, 0.18]) s.rod([x - 0.03, 0.66, z], [x + 0.14, 0.42, z], 0.012, dark);
        }
      }
    }
    if (hearse) {
      s.box([0.62, 0.34, 1.6], [0, 1.44, 0], s.material('#5a3a26', { roughness: 0.4 }));
      s.box([0.5, 0.06, 1.3], [0, 1.64, 0], s.material('#6a4630', { roughness: 0.4 }));
      s.box([0.06, 0.02, 0.5], [0, 1.675, 0.1], trim);
      s.box([0.26, 0.02, 0.06], [0, 1.675, 0.22], trim);
    }
    if (a.owner === 'circus') {
      for (const side of [-1, 1]) for (let i = 0; i < 7; i++) if (i !== 3) s.box([0.012, 0.56, 0.13], [side * (W / 2 + 0.036), 0.9, -0.84 + i * 0.28], s.material('#c2261e', { roughness: 0.4 }));
      const sign = s.label(['CIRCUS', 'MENAGERIE', 'WONDERS'][Math.floor(random() * 3)], 1.7, 0.36, [W / 2 + 0.02, 2.36, 0], '#f7e7a8', '#b3261e');
      sign.rotation.y = Math.PI / 2;
      const flags = Array.from({ length: 14 }, (_unused, i) => ({ at: [(i % 2 ? -1 : 1) * (W / 2 + 0.07), 2.02, -0.9 + Math.floor(i / 2) * 0.3] as const, size: 0.07, color: ['#c2261e', '#2f66b0', '#f2f0e6', '#3d8a4a'][i % 4] }));
      s.scatter(new THREE.ConeGeometry(0.8, 1.6, 3).rotateX(Math.PI), s.material('#ffffff'), flags);
    }
    if (a.owner === 'post') {
      const text = s.label('CLOCKWORK MAIL', 1.7, 0.18, [W / 2 + 0.06, 2.0, 0], '#f4e6b0', '#8f1c16');
      text.rotation.y = Math.PI / 2;
      const text2 = s.label('CLOCKWORK MAIL', 1.7, 0.18, [-W / 2 - 0.06, 2.0, 0], '#f4e6b0', '#8f1c16');
      text2.rotation.y = -Math.PI / 2;
    }

    // Roof load.
    const roofY = 2.2;
    if (a.owner === 'post' || a.owner === 'cab' || (a.owner === 'aristocrat' && mood.density > 0.45)) {
      for (const x of [-1, 1]) s.rod([x * 0.6, roofY + 0.14, -0.8], [x * 0.6, roofY + 0.14, 0.8], 0.012, trim);
      for (const x of [-1, 1]) for (const z of [-0.8, 0, 0.8]) s.rod([x * 0.6, roofY - 0.08, z], [x * 0.6, roofY + 0.14, z], 0.012, trim);
      if (a.owner === 'post') {
        const sack = s.material('#b9a680', { roughness: 1 });
        for (let i = 0; i < 3 + Math.round(mood.density * 3); i++) {
          const lump = s.ball([0.2 + random() * 0.08, 0.16 + random() * 0.06, 0.24 + random() * 0.1], [(random() - 0.5) * 0.7, roofY + 0.1 + random() * 0.08, -0.6 + random() * 1.2], sack, 10);
          lump.rotation.y = random() * 3;
        }
        s.box([0.4, 0.26, 0.3], [0.2, roofY + 0.12, 0.5], s.material('#8a6a42', { roughness: 0.9 })).rotation.y = 0.3;
      } else {
        s.box([0.8, 0.34, 0.5], [(random() - 0.5) * 0.2, roofY + 0.14, -0.25 + random() * 0.3], s.material('#6b4a2c', { roughness: 0.8 })).rotation.y = (random() - 0.5) * 0.4;
        s.box([0.82, 0.03, 0.06], [0, roofY + 0.32, -0.1], brass);
        if (mood.density > 0.5) s.cylinder(0.17, 0.17, 0.28, [0.25, roofY + 0.12, 0.55], s.material('#3d5a66', { roughness: 0.7 }), 16);
      }
    } else if (hearse) {
      const plume = s.material('#141416', { roughness: 1 });
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.rod([x * 0.58, 2.1, z * 0.8], [x * 0.58, 2.42, z * 0.8], 0.016, trim);
        for (let k = 0; k < 5; k++) {
          const angle = k / 5 * Math.PI * 2 + random();
          s.rod([x * 0.58, 2.4, z * 0.8], [x * 0.58 + Math.cos(angle) * 0.13, 2.68 + random() * 0.08, z * 0.8 + Math.sin(angle) * 0.13], 0.05, plume, 0.012);
        }
      }
    } else if (a.owner === 'aristocrat') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.lathe([[0, 0], [0.05, 0.02], [0.03, 0.06], [0.06, 0.12], [0.02, 0.2], [0, 0.22]], trim, [x * 0.6, 2.1, z * 0.85]);
    }
    if (a.owner === 'cab') {
      s.rod([0.62, 2.1, 0.86], [0.62, 2.62, 0.86], 0.014, dark);
      const flag = s.label(a.state === 'departs' ? 'HIRED' : 'FOR HIRE', 0.5, 0.2, [0.62, 2.54, 0.6], '#1b1b1e', '#f4e6b0');
      flag.rotation.y = Math.PI / 2;
    }

    // Box seat, dashboard and whoever drives.
    s.box([1.2, 0.1, 0.5], [0, 1.4, 1.26], wood);
    s.box([1.1, 0.12, 0.42], [0, 1.5, 1.24], s.material(a.owner === 'aristocrat' ? '#7a1f2a' : '#3a2a20', { roughness: 0.9 }));
    s.box([1.2, 0.5, 0.06], [0, 1.2, 1.5], body).rotation.x = -0.25;
    s.box([1.2, 0.05, 0.5], [0, 0.9, 1.66], wood);
    s.box([1.24, 0.5, 0.08], [0, 1.1, 1.03], body);
    for (const x of [-1, 1]) s.rod([x * 0.6, 0.62, 1.0], [x * 0.6, 0.9, 1.88], 0.035, dark);
    if (a.driver === 'coachman') {
      const fig = s.material('#c99a3e', { metalness: 0.5, roughness: 0.4 });
      s.lathe([[0.14, 0], [0.19, 0.3], [0.14, 0.46], [0.05, 0.5]], fig, [0.1, 1.56, 1.24]);
      s.ball([0.1, 0.12, 0.1], [0.1, 2.16, 1.25], s.material('#f1ece2', { roughness: 0.3 }), 16);
      s.cylinder(0.16, 0.16, 0.014, [0.1, 2.26, 1.24], dark, 20);
      s.cylinder(0.1, 0.095, 0.2, [0.1, 2.36, 1.24], dark, 20);
      s.rod([0.26, 1.98, 1.26], [0.3, 1.74, 1.56], 0.035, fig);
      s.rod([-0.06, 1.98, 1.26], [-0.2, 1.74, 1.5], 0.035, fig);
      s.rod([0.3, 1.74, 1.56], [0.3, 1.2, 1.74], 0.015, dark);
      const mini = windKey(brass, 0.3, 'butterfly');
      mini.position.set(0.1, 1.84, 1.1);
      mini.rotation.x = -Math.PI / 2;
      s.root.add(mini);
    } else if (a.driver === 'levers') {
      for (let i = 0; i < 4; i++) {
        const lean = (random() - 0.5) * 0.5;
        s.rod([-0.42 + i * 0.16, 0.92, 1.6], [-0.42 + i * 0.16, 1.5, 1.6 + lean * 0.5], 0.014, brass);
        s.ball([0.035, 0.035, 0.035], [-0.42 + i * 0.16, 1.52, 1.6 + lean * 0.5], s.material(['#b3261e', '#1b1b1e', '#f1ece2', '#2f66b0'][i]), 10);
      }
      s.rod([0.34, 0.92, 1.6], [0.34, 1.6, 1.42], 0.016, dark);
      const steer = s.ring(0.17, 0.016, [0.34, 1.62, 1.41], brass);
      steer.rotation.x = -Math.PI / 2 + 0.3;
    }
    if (a.owner === 'post') {
      const horn = s.cylinder(0.11, 0.015, 0.7, [-0.62, 1.72, 1.36], brass, 14);
      horn.rotation.x = Math.PI / 2 - 0.25;
    }

    // Lantern eyes.
    const lampMaterial = new THREE.MeshStandardMaterial({ color: lampOn ? glow : new THREE.Color('#5a5548'), emissive: glow, emissiveIntensity: lampOn ? mix(0.9, 2.2, 1 - Math.abs(mood.daylight - 0.5) * 2 * 0 + (a.state === 'departs' ? 0.4 : 0)) : 0.0, roughness: 0.3 });
    const lidded = a.state === 'waits';
    const eye = (at: P, r: number, square = false) => {
      if (square) {
        s.box([r * 1.5, r * 1.9, r * 1.5], at, lampMaterial);
        for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([r * 0.16, r * 2.0, r * 0.16], [at[0] + x * r * 0.75, at[1], at[2] + z * r * 0.75], trim);
        s.cylinder(0, r * 1.25, r * 0.7, [at[0], at[1] + r * 1.3, at[2]], trim, 4).rotation.y = Math.PI / 4;
        s.box([r * 1.7, r * 0.14, r * 1.7], [at[0], at[1] - r, at[2]], trim);
      } else {
        s.ball([r, r, r * 0.8], at, lampMaterial, 18);
        s.ring(r, r * 0.16, [at[0], at[1], at[2] + r * 0.2], trim);
        s.cylinder(r * 1.02, r * 0.8, r * 0.9, [at[0], at[1], at[2] - r * 0.5], trim, 16).rotation.x = Math.PI / 2;
        if (lidded) {
          const lid = s.mesh(new THREE.SphereGeometry(r * 1.06, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), trim, [at[0], at[1], at[2] + r * 0.05]);
          lid.scale.z = 0.85;
          lid.rotation.x = 0.35;
        }
      }
    };
    if (a.eyes === 'cyclops') eye([0, 1.28, 1.86], 0.3);
    else if (a.eyes === 'stalks') {
      for (const x of [-1, 1]) {
        s.tube([[x * 0.5, 1.2, 1.56], [x * 0.62, 1.7, 1.8], [x * 0.7, 2.1, 2.0], [x * 0.66, 2.2, 2.16]], 0.022, trim);
        eye([x * 0.66, 2.2, 2.24], 0.13);
      }
    } else for (const x of [-1, 1]) eye([x * 0.48, a.eyes === 'square' ? 1.36 : 1.26, 1.82], a.eyes === 'square' ? 0.15 : 0.21, a.eyes === 'square');
    if (thrown && a.eyes !== 'cyclops') {
      // One eye went out when it hit the road.
      s.ball([0.12, 0.12, 0.05], [0.48, 1.26, 1.98], dark, 10).visible = a.eyes === 'round';
    }

    // Chassis, axles and cog-toothed wheels.
    s.box([0.14, 0.12, 3.5], [0, 0.56, -0.2], dark);
    for (const x of [-1, 1]) for (const z of [-0.9, 0.9]) s.ring(0.26, 0.03, [x * 0.5, 0.74, z + Math.sign(z) * 0.25], dark, Math.PI * 1.2).rotation.set(0, Math.PI / 2, z > 0 ? 0.3 : 2.2);
    const wheels: THREE.Object3D[] = [];
    const wheel = (x: number, z: number, r: number, off = false) => {
      const holder = new THREE.Group();
      holder.position.set(x, r, z);
      holder.rotation.y = Math.PI / 2;
      s.root.add(holder);
      const cog = s.mesh(gearGeometry(r, Math.round(r * 38), 0.09, 0.05, 8, 0.045), wood);
      const rim = s.ring(r - 0.05, 0.035, [0, 0, 0], brass);
      const hub = s.cylinder(0.1, 0.1, 0.2, [0, 0, 0], brass, 12);
      hub.rotation.x = Math.PI / 2;
      const spin = new THREE.Group();
      spin.add(cog, rim, hub);
      spin.rotation.z = random() * 2;
      holder.add(spin);
      if (off) {
        holder.position.set(x * 2.1 + 0.2, 0.06, z - 0.5 - random() * 0.4);
        holder.rotation.set(Math.PI / 2, 0, random());
      } else wheels.push(spin);
      return holder;
    };
    const rearZ = -1.0, frontZ = 1.32, RR = 0.8, RF = 0.56;
    for (const x of [-1, 1]) {
      wheel(x * 0.9, rearZ, RR, thrown && x === -1);
      wheel(x * 0.86, frontZ, RF);
    }
    s.cylinder(0.05, 0.05, 1.9, [0, RR, rearZ], dark, 10).rotation.z = Math.PI / 2;
    s.cylinder(0.045, 0.045, 1.8, [0, RF, frontZ], dark, 10).rotation.z = Math.PI / 2;
    s.rod([0, 0.56, frontZ], [0, RF, frontZ], 0.05, dark);

    // Mainspring drum at the rear, and the key that winds it.
    const drumZ = -1.74, drumY = 1.18, DR = 0.66, DW = 1.16;
    const drumMaterial = a.drum === 'iron' ? s.material('#2c2e33', { metalness: 0.4, roughness: 0.6 }) : brass;
    const spiral = painted(256, 256, (ctx) => {
      ctx.fillStyle = a.drum === 'iron' ? '#2c2e33' : '#8a6a2c';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = thrown ? '#17120f' : '#6d8fb0';
      ctx.lineWidth = 7;
      ctx.beginPath();
      const turns = thrown ? 1.5 : mix(8, 4, a.state === 'run-down' ? 1 : 0);
      for (let i = 0; i <= 300; i++) {
        const t = i / 300, angle = t * Math.PI * 2 * turns, r = 18 + t * 96;
        ctx.lineTo(128 + Math.cos(angle) * r, 128 + Math.sin(angle) * r);
      }
      ctx.stroke();
      ctx.fillStyle = '#d6aa3c'; ctx.beginPath(); ctx.arc(128, 128, 16, 0, Math.PI * 2); ctx.fill();
    });
    const open = a.drum === 'glass';
    const barrel = s.mesh(new THREE.CylinderGeometry(DR, DR, DW, 32, 1, open), drumMaterial, [0, drumY, drumZ]);
    barrel.rotation.z = Math.PI / 2;
    (barrel.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    for (const x of [-1, 1]) {
      const face = s.mesh(new THREE.CircleGeometry(DR * (open ? 0.98 : 0.86), 32), new THREE.MeshStandardMaterial({ map: spiral, roughness: 0.4, metalness: 0.2 }), [x * (DW / 2 + (open ? -0.02 : 0.006)), drumY, drumZ]);
      face.rotation.y = x * Math.PI / 2;
      const hoop = s.ring(DR, 0.04, [x * DW / 2, drumY, drumZ], a.drum === 'iron' ? brass : trim);
      hoop.rotation.y = Math.PI / 2;
    }
    for (const x of [-0.25, 0.25]) s.ring(DR + 0.005, 0.028, [x, drumY, drumZ], a.drum === 'iron' ? brass : s.material('#7c4a2e', { metalness: 0.5 })).rotation.y = Math.PI / 2;
    if (a.drum === 'iron') for (let i = 0; i < 12; i++) for (const x of [-0.45, 0, 0.45]) s.ball([0.03, 0.03, 0.03], [x, drumY + Math.sin(i / 12 * Math.PI * 2) * (DR + 0.005), drumZ + Math.cos(i / 12 * Math.PI * 2) * (DR + 0.005)], brass, 6);
    for (const x of [-1, 1]) s.rod([x * 0.3, 0.6, -1.3], [x * 0.5, drumY, drumZ], 0.05, dark);
    // Drive cog from drum to rear axle.
    const drive = s.mesh(gearGeometry(0.34, 14, 0.07, 0.05, 5), brass, [0.66, drumY - 0.42, drumZ + 0.56]);
    drive.rotation.y = Math.PI / 2;
    const keyHolder = new THREE.Group();
    keyHolder.position.set(0, drumY, drumZ - DR + 0.02);
    keyHolder.rotation.x = -Math.PI / 2;
    s.root.add(keyHolder);
    const key = windKey(trim, 1.1, a.key);
    key.rotation.y = random() * 3;
    keyHolder.add(key);

    // Tip the whole coach before adding what lies on the road.
    const coach = new THREE.Group();
    for (const child of [...s.root.children]) if (!(thrown && child.rotation.x === Math.PI / 2 && child.position.y === 0.06)) coach.add(child);
    s.root.add(coach);
    if (thrown) {
      coach.rotation.z = 0.2;
      coach.rotation.x = -0.07;
      coach.position.y = -0.1;
      const steel = s.material('#7f97b3', { metalness: 0.5, roughness: 0.3 });
      const path: P[] = [];
      for (let i = 0; i <= 70; i++) {
        const t = i / 70, angle = t * Math.PI * 2 * 3.3 + 1.2, r = 0.5 + t * 1.25;
        path.push([-0.5 + Math.cos(angle) * r * 0.9 - t * 0.9, Math.max(0.03, (1 - t) * 1.2 * (0.6 + 0.4 * Math.sin(angle * 1.3))), drumZ - 0.7 + Math.sin(angle) * r * 0.75 - t * 0.5]);
      }
      const ribbon = s.tube(path, 0.035, steel);
      ribbon.scale.y = 1;
      for (let i = 0; i < 5; i++) {
        const r = 0.07 + random() * 0.1;
        const cog = s.mesh(gearGeometry(r, 8 + Math.floor(random() * 4), 0.025, r * 0.25), brass, [-1.2 + random() * 2.4, 0.013, drumZ - 0.4 - random() * 1.2]);
        cog.rotation.set(Math.PI / 2, 0, random() * 3);
      }
    }
    const puffs: THREE.Mesh[] = [];
    if (a.state === 'departs') {
      coach.rotation.x = -0.035;
      const dust = new THREE.MeshStandardMaterial({ color: '#cfc6b4', transparent: true, opacity: 0.55, roughness: 1, depthWrite: false });
      for (let i = 0; i < 6 + Math.round(mood.energy * 5); i++) {
        const size = 0.16 + random() * 0.26;
        const puff = s.ball([size, size * 0.8, size], [(random() - 0.5) * 2.0, 0.12 + random() * 0.4, -2.3 - random() * 1.3], dust, 10);
        puff.castShadow = false;
        puffs.push(puff);
      }
    }

    const speed = a.state === 'departs' ? mix(1.2, 5, mood.energy) : a.state === 'waits' ? mix(0.1, 0.5, mood.energy) : 0;
    return s.finish({
      footprint: 1.9,
      update: (dt, time) => {
        key.rotation.y += dt * speed;
        drive.rotation.z += dt * speed * (a.state === 'departs' ? 1 : 0);
        if (a.state === 'departs') {
          for (const [index, spin] of wheels.entries()) spin.rotation.z -= dt * speed * (index % 2 ? 1.4 : 1);
          coach.position.y = Math.sin(time * 9) * 0.008;
          for (const [index, puff] of puffs.entries()) puff.position.y = 0.2 + ((time * 0.4 + index * 0.37) % 1) * 0.5;
        }
        if (door) door.rotation.y = 1.15 + Math.sin(time * 0.8) * 0.08 * mood.energy;
      },
    });
  },
});
