import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const TRIM = {
  red: 'Pillar-box red sails and trim.',
  blue: 'Delft blue sails and trim.',
  yellow: 'Custard yellow sails and trim.',
  green: 'Seafront railing green sails and trim.',
  pink: 'Candy-floss pink sails and trim.',
  white: 'Plain white sails and trim, a little ghostly.',
} as const;
const TRIM_HEX: Record<keyof typeof TRIM, string> = {
  red: '#c9302a', blue: '#2a5aa6', yellow: '#e9b724', green: '#2c8a57', pink: '#e8669a', white: '#f3efe2',
};
const BALLS = ['#f2e9d0', '#e23b2e', '#f4c20d', '#2f7fd6', '#ef7f1a', '#d94f9b', '#44b85a'];

export default defineThing({
  questions: {
    style: choice('What kind of windmill is it?', {
      dutch: 'A tapered eight-sided Dutch mill, cream with a domed cap, a gallery rail and tiny painted windows.',
      cartoon: 'A fat wobbly storybook mill in sweet-shop colours with a pointed witch-hat roof and paddle sails.',
      barn: 'A square red barn mill with white corner boards, a gambrel roof and a hayloft door.',
    }),
    trim: choice('What colour are the sails and trim?', TRIM),
    paint: choice('How was it last painted?', {
      fresh: 'Glossy and saturated, repainted this spring before opening day.',
      faded: 'The original paint, chalky and bleached pale by years of salt and sun.',
      patched: 'Touched up in squares of whatever tins were left, none of them matching.',
      peeling: 'Flaking away in scabs to grey fibreglass underneath.',
    }),
    sails: choice('How many sails survive?', {
      four: 'All four sails, a complete cross.',
      three: 'Three sails and one snapped stub.',
      two: 'Two sails left, turning lopsided.',
      one: 'A single sail swinging round like a clock hand.',
      none: 'Only the hub and four broken stubs.',
    }),
    ball: choice('Is there a ball at the tunnel?', {
      none: 'No ball, the hole is waiting for the next player.',
      trapped: 'One ball sits stuck in the mouth of the tunnel.',
      waiting: 'A ball lies on the felt a putt short of the sails.',
      jam: 'Several balls of different colours are jammed in the tunnel together.',
      through: 'A ball has just rolled out of the far side, clean through.',
    }),
    beside: choice('What stands beside the windmill?', {
      nothing: 'Nothing, just felt and kerb.',
      tulips: 'A row of plastic tulips stuck in the border.',
      fence: 'A knee-high white picket fence.',
      sign: 'A numbered hole marker on a short post.',
      putter: 'A rental putter left leaning against the tower.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fade = { fresh: 0, faded: 0.42, patched: 0.12, peeling: 0.18 }[a.paint];
    const pale = new THREE.Color('#ddd8c8');
    const tone = (hex: string, extra = 0) => new THREE.Color(hex).lerp(pale, Math.min(0.85, fade + extra)).getStyle();
    const gloss = a.paint === 'fresh' ? 0.3 : 0.75;
    const wallHex = tone({ dutch: '#f0e8d2', cartoon: mood.cheer > 0.45 ? '#55b9dc' : '#7d8fc0', barn: '#a92f27' }[a.style]);
    const trimHex = tone(a.style === 'barn' && a.trim === 'red' ? '#f3efe2' : TRIM_HEX[a.trim]);
    const roofHex = tone({ dutch: TRIM_HEX[a.trim], cartoon: a.trim === 'yellow' ? '#e8669a' : '#f2c230', barn: '#4a4f55' }[a.style]);

    // The tower skin is one painted canvas: patches, flaking, rust runs and boards.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = wallHex;
    ctx.fillRect(0, 0, 256, 256);
    if (a.style === 'barn') {
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2;
      for (let x = 0; x < 256; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
    } else if (a.style === 'dutch') {
      ctx.strokeStyle = 'rgba(90,70,40,0.16)';
      ctx.lineWidth = 2;
      for (let y = 8; y < 256; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
    } else {
      ctx.fillStyle = tone('#f6f2e6');
      for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc(random() * 256, random() * 256, 9 + random() * 6, 0, 7); ctx.fill(); }
    }
    if (a.paint === 'patched') {
      const tins = ['#8fb7a2', '#e6dfc4', '#c9a45a', '#9aa9c9', '#d98f7c', wallHex];
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = tins[Math.floor(random() * tins.length)];
        ctx.globalAlpha = 0.85;
        ctx.fillRect(random() * 230, random() * 230, 22 + random() * 46, 18 + random() * 40);
      }
      ctx.globalAlpha = 1;
    }
    if (a.paint === 'peeling') {
      for (let i = 0; i < 16; i++) {
        const x = random() * 256, y = random() * 256, r = 5 + random() * 13;
        ctx.fillStyle = '#6f6a5c';
        ctx.beginPath(); ctx.ellipse(x, y, r + 2, r * 0.7 + 2, random() * 3, 0, 7); ctx.fill();
        ctx.fillStyle = '#b8b5a6';
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, random() * 3, 0, 7); ctx.fill();
      }
    }
    for (let i = 0; i < Math.round(mood.wear * 14); i++) {
      const x = random() * 256, y = random() * 120, len = 40 + random() * 110;
      const g = ctx.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, 'rgba(120,62,24,0.7)');
      g.addColorStop(1, 'rgba(120,62,24,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 3 + random() * 5, len);
    }
    const skin = new THREE.CanvasTexture(canvas);
    skin.colorSpace = THREE.SRGBColorSpace;
    skin.wrapS = THREE.RepeatWrapping;
    const wall = new THREE.MeshStandardMaterial({ map: skin, roughness: gloss + mood.wear * 0.2 });
    const trim = s.material(trimHex, { roughness: gloss });
    const roof = s.material(roofHex, { roughness: gloss });
    const dark = s.material('#15181a', { roughness: 0.9 });
    const concrete = s.material('#cfcabd', { roughness: 0.95 });
    const steel = s.material('#8d9494', { metalness: 0.6, roughness: 0.45 });

    // Felt strip with painted concrete kerbs, running front to back.
    const feltW = 0.95, feltL = 1.7;
    s.box([feltW, 0.04, feltL], [0, 0.02, 0], s.material(new THREE.Color('#2e9150').lerp(new THREE.Color('#7f9c76'), mood.wear * 0.7 + fade * 0.2), { roughness: 1 }));
    const kerbPaint = s.material(tone('#f3efe2'), { roughness: 0.8 });
    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
      const chipped = random() < mood.wear * 0.5;
      s.box([0.09, 0.09, feltL / 6 - 0.006], [side * (feltW / 2 + 0.045), 0.045, -feltL / 2 + (i + 0.5) * feltL / 6], chipped ? concrete : i % 2 ? trim : kerbPaint);
    }

    // Tower.
    let frontZ = 0.26, topY = 1.0;
    if (a.style === 'dutch') {
      s.mesh(new THREE.CylinderGeometry(0.2, 0.35, 1.0, 8), wall, [0, 0.54, 0]).rotation.y = Math.PI / 8;
      s.mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.025, 8), trim, [0, 0.52, 0]).rotation.y = Math.PI / 8;
      for (let i = 0; i < 8; i++) {
        const t = (i + 0.5) / 8 * Math.PI * 2;
        s.rod([Math.sin(t) * 0.32, 0.53, Math.cos(t) * 0.32], [Math.sin(t) * 0.32, 0.62, Math.cos(t) * 0.32], 0.008, trim);
      }
      s.ring(0.32, 0.008, [0, 0.62, 0], trim).rotation.x = Math.PI / 2;
      s.lathe([[0.24, 0], [0.25, 0.05], [0.21, 0.15], [0.11, 0.25], [0, 0.28]], roof, [0, 1.04, 0]);
      s.ball([0.03, 0.03, 0.03], [0, 1.33, 0], trim, 10);
      for (const [x, y] of [[-0.09, 0.82], [0.1, 0.4]] as const) {
        const w = s.box([0.09, 0.12, 0.02], [x, y, 0.34 - y * 0.15 + 0.005], dark);
        w.rotation.x = -0.14;
        s.box([0.11, 0.015, 0.03], [x, y - 0.065, 0.34 - (y - 0.065) * 0.15 + 0.008], trim);
      }
      topY = 1.32; frontZ = 0.24;
    } else if (a.style === 'cartoon') {
      const body = s.lathe([[0.3, 0.04], [0.38, 0.18], [0.35, 0.45], [0.25, 0.8], [0.27, 0.98]], wall);
      body.rotation.z = (random() - 0.5) * 0.06;
      const hat = s.mesh(new THREE.ConeGeometry(0.36, 0.42, 20), roof, [0, 1.18, 0]);
      hat.rotation.z = (random() - 0.5) * 0.16;
      s.ball([0.045, 0.045, 0.045], [hat.rotation.z * -0.2, 1.41, 0], trim, 12);
      s.ring(0.3, 0.03, [0, 0.98, 0], trim).rotation.x = Math.PI / 2;
      for (const x of [-0.11, 0.11]) {
        s.ball([0.05, 0.065, 0.02], [x, 0.9, 0.245], s.material('#fbf7ea', { roughness: 0.4 }), 12);
        s.ball([0.022, 0.03, 0.012], [x + 0.008, 0.89, 0.262], dark, 10);
      }
      topY = 1.45; frontZ = 0.3;
    } else {
      s.box([0.62, 0.86, 0.56], [0, 0.47, 0], wall);
      const white = s.material(tone('#f3efe2'), { roughness: gloss });
      for (const x of [-0.31, 0.31]) for (const z of [-0.28, 0.28]) s.box([0.05, 0.86, 0.05], [x, 0.47, z], white);
      const gable = new THREE.Shape();
      gable.moveTo(-0.37, 0); gable.lineTo(-0.25, 0.2); gable.lineTo(0, 0.31); gable.lineTo(0.25, 0.2); gable.lineTo(0.37, 0); gable.closePath();
      s.mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.66, bevelEnabled: false }), roof, [0, 0.9, -0.33]);
      s.box([0.2, 0.2, 0.02], [0, 0.99, 0.335], white);
      s.box([0.15, 0.15, 0.025], [0, 0.99, 0.337], dark);
      s.rod([-0.075, 0.915, 0.352], [0.075, 1.065, 0.352], 0.008, white);
      s.rod([0.075, 0.915, 0.352], [-0.075, 1.065, 0.352], 0.008, white);
      topY = 1.21; frontZ = 0.3;
    }

    // The tunnel: a little porch right through the base with a dark arched mouth at each end.
    s.box([0.34, 0.24, 0.8], [0, 0.16, 0], trim);
    s.box([0.2, 0.11, 0.81], [0, 0.095, 0], dark);
    s.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.81, 16), dark, [0, 0.15, 0]).rotation.x = Math.PI / 2;

    // Sails on an axle, low enough to sweep the tunnel mouth.
    const hubY = 0.8, reach = 0.62, sailZ = 0.46;
    s.rod([0, hubY, 0], [0, hubY, sailZ + 0.03], 0.022, steel);
    const sails = new THREE.Group();
    sails.position.set(0, hubY, sailZ);
    s.root.add(sails);
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x: number, y: number, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const hub = put(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), roof, sails, 0, 0);
    hub.rotation.x = Math.PI / 2;
    const alive = { four: 4, three: 3, two: 2, one: 1, none: 0 }[a.sails];
    const order = [0, 1, 2, 3].sort(() => random() - 0.5);
    const kept = new Set(a.sails === 'two' && random() < 0.5 ? [order[0], (order[0] + 2) % 4] : order.slice(0, alive));
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = i * Math.PI / 2;
      sails.add(arm);
      if (!kept.has(i)) {
        const stub = 0.1 + random() * 0.14;
        put(new THREE.BoxGeometry(0.035, stub, 0.022), trim, arm, 0, stub / 2 + 0.04);
        const splinter = put(new THREE.ConeGeometry(0.02, 0.06, 5), trim, arm, 0.004, stub + 0.06);
        splinter.rotation.z = (random() - 0.5) * 0.5;
        continue;
      }
      put(new THREE.BoxGeometry(0.035, reach, 0.022), trim, arm, 0, reach / 2 + 0.03);
      if (a.style === 'cartoon') {
        const paddle = put(new THREE.BoxGeometry(0.19, reach * 0.66, 0.016), i % 2 ? roof : trim, arm, 0.085, reach * 0.66 + 0.02, -0.004);
        paddle.rotation.z = (random() - 0.5) * 0.08 * (1 + mood.wear * 3);
      } else {
        const lattice = s.material(tone('#f3efe2', a.trim === 'white' ? 0.2 : 0), { roughness: gloss });
        const h = reach * 0.7, y0 = reach * 0.31;
        put(new THREE.BoxGeometry(0.014, h, 0.012), lattice, arm, 0.17, y0 + h / 2);
        put(new THREE.BoxGeometry(0.014, h, 0.012), lattice, arm, 0.09, y0 + h / 2);
        for (let k = 0; k < 6; k++) {
          if (random() < mood.wear * 0.35) continue;
          put(new THREE.BoxGeometry(0.17, 0.014, 0.012), lattice, arm, 0.095, y0 + 0.02 + k * (h - 0.04) / 5);
        }
        // Canvas cloth behind the lattice so the sail reads as a solid blade at a distance.
        put(new THREE.BoxGeometry(0.15, h * 0.96, 0.004), trim, arm, 0.095, y0 + h / 2, -0.008);
      }
    }
    sails.rotation.z = random() * Math.PI / 2;

    // Balls.
    const ballAt = (x: number, y: number, z: number, hex: string) => s.ball([0.033, 0.033, 0.033], [x, y + 0.073, z], s.material(hex, { roughness: 0.35 }), 14);
    const pick = () => BALLS[Math.floor(random() * BALLS.length)];
    if (a.ball === 'trapped') ballAt((random() - 0.5) * 0.06, 0, 0.4, pick());
    if (a.ball === 'waiting') ballAt((random() - 0.5) * 0.4, 0, 0.62 + random() * 0.22, pick());
    if (a.ball === 'through') ballAt((random() - 0.5) * 0.3, 0, -0.55 - random() * 0.3, pick());
    if (a.ball === 'jam') {
      const first = Math.floor(random() * BALLS.length);
      [[-0.05, 0, 0.4], [0.035, 0, 0.415], [-0.01, 0.055, 0.405], [0.02, 0, 0.5], [-0.09, 0, 0.5]].forEach(([x, y, z], i) => ballAt(x, y, z, BALLS[(first + i * 2) % BALLS.length]));
    }
    for (let i = 0; i < Math.round(mood.density * 2.4 - 0.6); i++) ballAt((random() - 0.5) * 0.8, 0, (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.4), pick());

    // Company.
    const edge = feltW / 2 + 0.16;
    if (a.beside === 'tulips') {
      const stem = s.material('#3f8f3c');
      for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
        const x = side * (edge + (random() - 0.5) * 0.06), z = -0.7 + i * 0.23 + (random() - 0.5) * 0.08, h = 0.16 + random() * 0.08;
        const lean = (random() - 0.5) * 0.12 * (1 + mood.wear * 2);
        s.rod([x, 0, z], [x + lean, h, z], 0.007, stem);
        s.ball([0.03, 0.042, 0.03], [x + lean, h + 0.03, z], s.material(['#e23b2e', '#f4c20d', '#e8669a', '#f3efe2'][Math.floor(random() * 4)], { roughness: 0.5 }), 10);
      }
    }
    if (a.beside === 'fence') {
      const picket = s.material(tone('#f6f2e6'));
      for (const side of [-1, 1]) {
        s.box([0.02, 0.025, feltL], [side * edge, 0.2, 0], picket);
        s.box([0.02, 0.025, feltL], [side * edge, 0.09, 0], picket);
        for (let i = 0; i < 16; i++) {
          if (random() < mood.wear * 0.3) continue;
          const p = s.box([0.025, 0.3, 0.07], [side * (edge + 0.02), 0.15, -feltL / 2 + 0.06 + i * (feltL - 0.12) / 15], picket);
          p.rotation.x = (random() - 0.5) * 0.3 * mood.wear;
        }
      }
    }
    if (a.beside === 'sign') {
      const n = 1 + Math.floor(random() * 18);
      s.rod([edge, 0, 0.6], [edge, 0.5, 0.6], 0.015, steel);
      const disc = s.cylinder(0.11, 0.11, 0.02, [edge, 0.56, 0.6], trim, 20);
      disc.rotation.x = Math.PI / 2;
      s.label(String(n), 0.14, 0.14, [edge, 0.56, 0.612], '#20262a', '#f6f1df');
    }
    if (a.beside === 'putter') {
      const lean: [number, number, number] = [0.4, 0.82, 0.08];
      s.rod([0.56, 0.05, 0.3], lean, 0.009, steel);
      s.rod([0.45, 0.63, 0.14], lean, 0.015, s.material(TRIM_HEX[a.trim === 'red' ? 'blue' : 'red']));
      s.box([0.1, 0.025, 0.03], [0.6, 0.055, 0.31], dark);
    }

    const speed = mix(0.12, 2.6, mood.energy) * (alive === 0 ? 1.4 : 1);
    void topY; void frontZ;
    return s.finish({ update: (dt) => { sails.rotation.z -= dt * speed; } });
  },
});
