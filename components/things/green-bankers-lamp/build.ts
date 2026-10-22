import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const SHADES = {
  emerald: 'The classic deep emerald green glass.',
  amber: 'Honey amber glass, warm as whiskey.',
  cobalt: 'Cobalt blue glass, cold and nocturnal.',
  ruby: 'Ruby red glass, a darkroom or a bordello.',
  opal: 'Milky white opal glass, clinical and bright.',
} as const;
const SHADE_TINT: Record<keyof typeof SHADES, [string, string]> = {
  emerald: ['#0e6b43', '#1fc27a'], amber: ['#b9731c', '#ffb84a'], cobalt: ['#1b3f9a', '#4f86ff'], ruby: ['#8f1722', '#ff4a52'], opal: ['#e9e6da', '#fff6dc'],
};
const METALS = {
  brass: 'Polished yellow brass.',
  bronze: 'Dark tarnished bronze, long unpolished.',
  chrome: 'Bright chrome, a 1930s office.',
  iron: 'Black enamelled iron, plain and municipal.',
} as const;
const METAL_LOOK: Record<keyof typeof METALS, [string, number, number]> = { brass: ['#d2a73f', 0.9, 0.28], bronze: ['#6e5330', 0.8, 0.5], chrome: ['#cfd4d8', 0.95, 0.15], iron: ['#1e1e21', 0.3, 0.5] };

export default defineThing({
  questions: {
    shade: choice('What colour is the glass shade?', SHADES),
    light: choice('Is the lamp on?', {
      lit: 'Lit, steady: the shade glows and a pool of light falls on the desk.',
      failing: 'Lit but failing: the bulb flickers and buzzes.',
      dark: 'Dark and cold. Whoever worked here has gone home, or is not coming back.',
    }),
    chain: choice('What is the pull chain doing?', {
      still: 'Hanging perfectly still.',
      swinging: 'Swinging: someone pulled it a moment ago.',
      snapped: 'Snapped off short, only a stub left.',
    }),
    metal: choice('What is the metalwork?', METALS),
    base: choice('What kind of base does it stand on?', {
      round: 'A stepped round weighted foot.',
      tray: 'A long rectangular foot with a pen groove, a clerk\'s lamp.',
      marble: 'A block of dark green marble.',
    }),
    tilt: score('How is the shade angled?', ['Pulled down low, hiding the light, secretive', 'Level', 'Tipped up and back, glaring into the room like an interrogation']),
    beneath: choice('What lies in its pool of light?', {
      nothing: 'Nothing but the bare desk.',
      ledger: 'An open ledger of ruled columns.',
      letter: 'A single letter and its torn envelope.',
      glasses: 'A pair of folded reading glasses.',
      coins: 'Small stacks of coins being counted.',
      revolver: 'A snub-nosed revolver.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [metalColour, metalness, roughness] = METAL_LOOK[a.metal];
    const metal = s.material(metalColour, { metalness, roughness: roughness + mood.wear * 0.25, emissive: metalColour, emissiveIntensity: a.metal === 'iron' ? 0 : 0.12 });
    const on = a.light !== 'dark';
    const [glassColour, glow] = SHADE_TINT[a.shade];
    const warm = new THREE.Color().setHSL(mix(0.14, 0.08, mood.warmth), 0.9, 0.78);

    // Base.
    let baseTop = 0.03;
    if (a.base === 'round') {
      s.lathe([[0, 0], [0.086, 0], [0.088, 0.006], [0.07, 0.012], [0.066, 0.02], [0.03, 0.026], [0.022, 0.034], [0, 0.034]], metal);
      baseTop = 0.034;
    } else if (a.base === 'tray') {
      s.box([0.24, 0.016, 0.12], [0, 0.008, 0], metal);
      s.box([0.2, 0.01, 0.085], [0, 0.021, -0.008], metal);
      s.box([0.17, 0.004, 0.016], [0, 0.0175, 0.045], s.material('#15120e', { roughness: 0.8 }));
      baseTop = 0.026;
    } else {
      s.box([0.2, 0.03, 0.12], [0, 0.015, 0], s.material('#1f4a3a', { roughness: 0.2, metalness: 0.1 }));
      s.box([0.07, 0.008, 0.05], [0, 0.034, -0.02], metal);
      baseTop = 0.038;
    }
    // Column, yoke and shade pivots.
    const PIVOT_Y = 0.3, PIVOT_Z = 0.02, HALF = 0.132, colZ = a.base === 'round' ? 0 : -0.02;
    s.lathe([[0.016, 0], [0.011, 0.02], [0.014, 0.05], [0.008, 0.065], [0.008, 0.14], [0.013, 0.15], [0.009, 0.165]], metal, [0, baseTop, colZ]);
    const yokeY = baseTop + 0.165;
    for (const side of [-1, 1]) {
      s.tube([[0, yokeY, colZ], [side * 0.05, yokeY - 0.004, colZ - 0.012], [side * 0.11, yokeY + 0.02, colZ - 0.02], [side * HALF, PIVOT_Y - 0.04, PIVOT_Z - 0.03], [side * HALF, PIVOT_Y, PIVOT_Z]], 0.0055, metal);
      s.cylinder(0.011, 0.011, 0.01, [side * (HALF + 0.004), PIVOT_Y, PIVOT_Z], metal, 16).rotation.z = Math.PI / 2;
    }
    s.ball([0.013, 0.013, 0.013], [0, yokeY, colZ], metal, 14);

    // The shade: a glass trough, white-lined, open underneath.
    const head = new THREE.Group();
    head.position.set(0, PIVOT_Y, PIVOT_Z);
    head.rotation.x = mix(0.5, -0.75, a.tilt);
    s.root.add(head);
    const RAD = 0.062, LEN = HALF * 2 - 0.012;
    const glass = new THREE.MeshStandardMaterial({ color: glassColour, roughness: 0.18 + mood.wear * 0.3, emissive: glow, emissiveIntensity: on ? 0.75 : 0.03, side: THREE.DoubleSide });
    const lining = new THREE.MeshStandardMaterial({ color: '#efe9d6', roughness: 0.5, emissive: warm, emissiveIntensity: on ? 1.3 : 0, side: THREE.DoubleSide });
    const trough = (radius: number, material: THREE.Material) => {
      const geometry = new THREE.CylinderGeometry(radius, radius, LEN, 28, 1, true, -0.25, Math.PI + 0.5);
      geometry.rotateZ(Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(1, 0.82, 1.08);
      mesh.castShadow = true;
      head.add(mesh);
      for (const side of [-1, 1]) {
        const cap = new THREE.Mesh(new THREE.CircleGeometry(radius, 20, -0.25, Math.PI + 0.5), material);
        cap.rotation.y = Math.PI / 2;
        cap.position.x = side * LEN / 2;
        cap.scale.set(1.08, 0.82, 1);
        cap.castShadow = true;
        head.add(cap);
      }
      return mesh;
    };
    trough(RAD, glass);
    trough(RAD - 0.004, lining);
    const rim = s.box([LEN + 0.006, 0.004, 0.004], [0, -0.014, RAD * 1.07], metal);
    const rimBack = s.box([LEN + 0.006, 0.004, 0.004], [0, -0.014, -RAD * 1.07], metal);
    const socket = s.cylinder(0.012, 0.012, 0.05, [-LEN / 2 + 0.03, 0.006, 0], metal, 12);
    socket.rotation.z = Math.PI / 2;
    const bulbMaterial = new THREE.MeshStandardMaterial({ color: '#f7f1dc', emissive: warm, emissiveIntensity: on ? 2.2 : 0, roughness: 0.3 });
    const bulb = s.ball([0.045, 0.02, 0.02], [0.012, 0.006, 0], bulbMaterial, 14);
    head.add(rim, rimBack, socket, bulb);

    // Pull chain: beads hanging from the socket end, free to swing.
    const chain = new THREE.Group();
    chain.position.set(-LEN / 2 + 0.035, PIVOT_Y - 0.012, PIVOT_Z + 0.012);
    s.root.add(chain);
    const beads = a.chain === 'snapped' ? 4 : 22 + Math.floor(random() * 8);
    const beadMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0021, 8, 6), metal, beads);
    const m = new THREE.Matrix4();
    for (let i = 0; i < beads; i++) beadMesh.setMatrixAt(i, m.makeTranslation(0, -i * 0.0046, 0));
    beadMesh.castShadow = true;
    chain.add(beadMesh);
    if (a.chain !== 'snapped') {
      const pull = s.lathe([[0, 0], [0.004, 0.002], [0.0055, 0.012], [0.002, 0.018], [0, 0.018]], metal, [0, -beads * 0.0046 - 0.016, 0]);
      chain.add(pull);
    }
    chain.rotation.z = a.chain === 'swinging' ? 0.35 : (random() - 0.5) * 0.06;

    // Cord trailing off the back.
    const cz = colZ - (a.base === 'round' ? 0.085 : 0.06), wander = (random() - 0.5) * 0.12;
    s.tube([[0, 0.01, cz + 0.01], [0.02, 0.003, cz - 0.03], [0.06 + wander, 0.003, cz - 0.06], [0.03 + wander, 0.003, cz - 0.1], [0.1 + wander, 0.003, cz - 0.13]], 0.0028, s.material(a.metal === 'iron' ? '#1a1a1c' : '#4a3626', { roughness: 0.9 }));

    // Pool of light on the desk.
    const pools: THREE.MeshBasicMaterial[] = [];
    if (on) {
      const reach = mix(0.07, 0.2, a.tilt);
      for (const [size, opacity] of [[1, 0.2], [0.72, 0.26], [0.42, 0.3]] as const) {
        const material = new THREE.MeshBasicMaterial({ color: warm.clone().lerp(new THREE.Color(glow), 0.12), transparent: true, opacity, depthWrite: false });
        const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 40), material);
        pool.rotation.x = -Math.PI / 2;
        pool.scale.set(0.2 * size, 0.13 * size * mix(1, 1.5, a.tilt), 1);
        pool.position.set(0, 0.0012 + size * 0.0002, PIVOT_Z + reach);
        s.root.add(pool);
        pools.push(material);
      }
    }

    // What is being looked at.
    const fz = PIVOT_Z + 0.15, paper = s.material('#efe8d2', { roughness: 0.9 });
    if (a.beneath === 'ledger') {
      const cover = s.material('#4a1f1c', { roughness: 0.7 });
      s.box([0.25, 0.006, 0.17], [0, 0.003, fz], cover);
      for (const side of [-1, 1]) {
        const page = s.box([0.118, 0.008, 0.16], [side * 0.06, 0.009, fz], paper);
        page.rotation.z = side * -0.05;
        const lines = s.label('', 0.105, 0.14, [side * 0.06, 0.0138, fz], '#5b6f9a', '#efe8d2');
        lines.rotation.x = -Math.PI / 2; lines.rotation.z = 0;
        const canvas = (lines.material as THREE.MeshStandardMaterial).map!.image as HTMLCanvasElement, ctx = canvas.getContext('2d')!;
        ctx.strokeStyle = '#8fa0c4'; ctx.lineWidth = 2;
        for (let y = 30; y < canvas.height; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
        ctx.strokeStyle = '#c46a62'; for (const x of [330, 420]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
        ctx.fillStyle = '#1c2a5a';
        const rows = Math.round(mix(4, 17, mood.density));
        for (let r = 0; r < rows; r++) { ctx.fillRect(20, 42 + r * 34, 120 + random() * 170, 7); ctx.fillRect(345 + random() * 20, 42 + r * 34, 50, 7); }
        lines.castShadow = false;
      }
    } else if (a.beneath === 'letter') {
      const sheet = s.box([0.13, 0.0008, 0.17], [-0.02, 0.0008, fz + 0.01], paper);
      sheet.rotation.y = mix(-0.3, 0.3, random());
      const writing = s.label('', 0.11, 0.14, [0, 0.0006, 0], '#22264a', '#efe8d2');
      writing.rotation.x = -Math.PI / 2;
      const canvas = (writing.material as THREE.MeshStandardMaterial).map!.image as HTMLCanvasElement, ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#22264a';
      for (let r = 0; r < 13; r++) ctx.fillRect(30, 50 + r * 44, r === 12 ? 170 : 380 + random() * 80, 6);
      sheet.add(writing);
      const envelope = s.box([0.14, 0.001, 0.09], [0.11, 0.0006, fz - 0.03], s.material('#dccfae', { roughness: 0.9 }));
      envelope.rotation.y = 0.5;
      const flap = s.box([0.14, 0.0008, 0.04], [0, 0.008, -0.058], s.material('#cfc19c', { roughness: 0.9 }));
      flap.rotation.x = 0.5;
      envelope.add(flap);
    } else if (a.beneath === 'glasses') {
      const wire = s.material('#2a241c', { metalness: 0.5, roughness: 0.4 });
      const g = new THREE.Group();
      g.position.set(0, 0, fz); g.rotation.y = mix(-0.5, 0.5, random());
      s.root.add(g);
      for (const side of [-1, 1]) {
        const lens = s.ring(0.021, 0.0016, [side * 0.03, 0.022, 0], wire);
        lens.rotation.x = -0.25; lens.scale.set(1.15, 0.85, 1);
        const arm = s.rod([side * 0.056, 0.03, -0.002], [side * 0.04, 0.003, -0.09], 0.0012, wire);
        g.add(lens, arm);
      }
      g.add(s.rod([-0.008, 0.026, 0], [0.008, 0.026, 0], 0.0014, wire));
    } else if (a.beneath === 'coins') {
      const silver = s.material('#c9cbcc', { metalness: 0.9, roughness: 0.3 }), gold = s.material('#d9ad45', { metalness: 0.9, roughness: 0.3, emissive: '#5a3c08', emissiveIntensity: 0.3 });
      const stacks = Math.round(mix(3, 9, mood.density));
      for (let i = 0; i < stacks; i++) {
        const n = 1 + Math.floor(random() * 9), r = mix(0.01, 0.014, random()), x = (i - (stacks - 1) / 2) * 0.032 + (random() - 0.5) * 0.006, z = fz + (random() - 0.5) * 0.05;
        s.cylinder(r, r, n * 0.002, [x, n * 0.001, z], random() < 0.4 ? gold : silver, 18);
      }
    } else if (a.beneath === 'revolver') {
      const blue = s.material('#2a2d33', { metalness: 0.8, roughness: 0.35 }), grip = s.material('#4a2d1c', { roughness: 0.6 });
      const gun = new THREE.Group();
      gun.position.set(0, 0.017, fz + 0.01); gun.rotation.set(Math.PI / 2, 0, mix(-0.6, 0.6, random()), 'YXZ');
      gun.rotation.y = mix(-0.6, 0.6, random());
      s.root.add(gun);
      const barrel = s.cylinder(0.008, 0.008, 0.055, [-0.06, 0.018, 0], blue, 12); barrel.rotation.z = Math.PI / 2;
      const frame = s.box([0.06, 0.036, 0.014], [-0.005, 0.01, 0], blue);
      const drum = s.cylinder(0.018, 0.018, 0.034, [-0.012, 0.014, 0], blue, 6); drum.rotation.z = Math.PI / 2;
      const handle = s.box([0.026, 0.06, 0.02], [0.034, -0.026, 0], grip); handle.rotation.z = 0.35;
      const guard = s.ring(0.012, 0.0018, [-0.004, -0.014, 0], blue);
      const hammer = s.box([0.006, 0.014, 0.006], [0.028, 0.032, 0], blue);
      gun.add(barrel, frame, drum, handle, guard, hammer);
    }

    const swing = a.chain === 'swinging' ? mix(0.2, 0.55, mood.energy) : 0;
    const flicker = a.light === 'failing';
    const base = chain.rotation.z;
    return s.finish({
      update: (_dt, time) => {
        if (swing) chain.rotation.z = Math.sin(time * 5.2) * swing;
        else chain.rotation.z = base;
        if (flicker) {
          const k = Math.sin(time * 31) * Math.sin(time * 7.3) > mix(0.5, -0.2, mood.energy) ? 0.15 : 1;
          glass.emissiveIntensity = 0.75 * k; lining.emissiveIntensity = 1.3 * k; bulbMaterial.emissiveIntensity = 2.2 * k;
          pools.forEach((pool, index) => { pool.opacity = [0.2, 0.26, 0.3][index] * k; });
        }
      },
    });
  },
});
