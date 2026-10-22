import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Draw = (c: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, turn = 0) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = turn + (i * Math.PI) / 5 - Math.PI / 2;
    const reach = i % 2 ? r * 0.42 : r;
    c.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
  }
  c.closePath();
  c.fill();
}

const SCHEMES = {
  'red-gold': 'Fire-engine red barrel scattered with gold stars on a royal blue carriage: the classic poster cannon.',
  midnight: 'Deep midnight blue with silver stars, on a crimson carriage: night sky, dreamlike.',
  candy: 'Red and white barber-pole stripes spiralling up the barrel: sweet, loud, comic.',
  harlequin: 'Harlequin diamonds in yellow, purple and teal: a clown act, chaotic.',
  'black-iron': 'Soot-black iron with thin gold pinstripes and a few pale stars: severe, dangerous, old.',
  pastel: 'Faded pink and mint with white stars: gentle, dreamy, a toy.',
} as const;
const PALETTE: Record<keyof typeof SCHEMES, { base: string; mark: string; band: string; carriage: string; trim: string }> = {
  'red-gold': { base: '#c8202a', mark: '#f4c531', band: '#f4c531', carriage: '#1f3f9c', trim: '#f4c531' },
  midnight: { base: '#17235e', mark: '#e3e7ee', band: '#b9c0cc', carriage: '#9c1f2e', trim: '#d9dde4' },
  candy: { base: '#f3ece0', mark: '#d3222c', band: '#2749a6', carriage: '#d3222c', trim: '#f3ece0' },
  harlequin: { base: '#f0c32e', mark: '#6b2f93', band: '#178a86', carriage: '#6b2f93', trim: '#f0c32e' },
  'black-iron': { base: '#26262a', mark: '#c9a548', band: '#c9a548', carriage: '#3a2a22', trim: '#c9a548' },
  pastel: { base: '#f1a9bd', mark: '#fbf7ee', band: '#8fd3bd', carriage: '#8fd3bd', trim: '#fbf7ee' },
};
const BANNERS = {
  bullet: 'THE HUMAN BULLET',
  zazel: 'ZAZEL',
  boom: 'BOOM!',
  fearless: 'FEARLESS FRITZ',
  last: 'LAST SHOW TONIGHT',
  death: 'DEFIES DEATH',
} as const;

export default defineThing({
  questions: {
    paint: choice('How is the cannon painted?', SCHEMES),
    angle: score('How steeply is the barrel raised?', ['Almost level, aimed straight across the ring', 'A classic forty-five degree arc', 'Steep, aimed at the top of the tent']),
    state: choice('What is happening at the cannon right now?', {
      waiting: 'Ready but empty: the crash helmet hangs on the muzzle lip, the fuse unlit, waiting for its rider.',
      loaded: 'Loaded: a helmeted head and two gloved hands peek out of the muzzle and the fuse is sparking.',
      smoking: 'Just fired: the muzzle is scorched and smoke rolls out and upward, the rider already gone.',
      abandoned: 'Abandoned: the helmet lies on the ground beside the wheel and there is no one in sight.',
    }),
    helmet: choice('What is the crash helmet like?', {
      white: 'A white dome with a red racing stripe.',
      gold: 'A glittering gold dome.',
      red: 'A red dome with a white stripe, matching the poster.',
      leather: 'A battered brown leather flying cap with goggles.',
    }),
    ladder: choice('How does the rider climb up?', {
      leaning: 'A plain wooden ladder leaned against the barrel.',
      steps: 'A painted set of show steps standing beside the breech.',
      none: 'No ladder at all.',
    }),
    banner: choice('What is lettered on the side of the carriage?', BANNERS),
    kegs: noul('Are there powder kegs stacked beside the carriage?'),
    wheels: choice('What are the wagon wheels like?', {
      sunburst: 'Tall spoked wagon wheels painted as sunbursts.',
      solid: 'Solid painted discs with a star on each.',
      iron: 'Small heavy iron gun-carriage wheels.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const p = PALETTE[a.paint];
    const chips = Math.floor(mood.wear * 140);

    const barrelMap = paint(512, 512, (c, w, h) => {
      c.fillStyle = p.base;
      c.fillRect(0, 0, w, h);
      c.fillStyle = p.mark;
      if (a.paint === 'candy') {
        const period = w / 4;
        for (let k = -6; k < 8; k++) {
          c.beginPath();
          c.moveTo(k * period, h);
          c.lineTo(k * period + period / 2, h);
          c.lineTo(k * period + period / 2 + period * 2, 0);
          c.lineTo(k * period + period * 2, 0);
          c.fill();
        }
      } else if (a.paint === 'harlequin') {
        const cols = 6, rows = 7, dw = w / cols, dh = h / rows;
        for (let i = 0; i <= cols; i++)
          for (let j = 0; j <= rows; j++) {
            c.fillStyle = (i + j) % 2 ? p.mark : p.band;
            c.beginPath();
            c.moveTo(i * dw, j * dh - dh / 2);
            c.lineTo(i * dw + dw / 2, j * dh);
            c.lineTo(i * dw, j * dh + dh / 2);
            c.lineTo(i * dw - dw / 2, j * dh);
            c.fill();
          }
      } else if (a.paint === 'black-iron') {
        for (let i = 0; i < 12; i++) c.fillRect((i + 0.5) * (w / 12) - 2, 0, 4, h);
        for (let i = 0; i < 4; i++) star(c, (i + 0.5) * (w / 4), h * 0.42, 30, random());
      } else {
        for (let j = 0; j < 5; j++)
          for (let i = 0; i < 4; i++)
            star(c, ((i + (j % 2) * 0.5 + 0.25) * w) / 4, 70 + j * 78 + (random() - 0.5) * 18, 24 + random() * 20, random() * 0.6);
      }
      // Painted bands at the breech (bottom of the canvas) and the muzzle (top).
      c.fillStyle = p.band;
      c.fillRect(0, 0, w, 40);
      c.fillRect(0, h - 96, w, 26);
      c.fillRect(0, h - 40, w, 40);
      if (a.state === 'smoking') {
        const soot = c.createLinearGradient(0, 0, 0, 150);
        soot.addColorStop(0, 'rgba(20,18,16,0.95)');
        soot.addColorStop(1, 'rgba(20,18,16,0)');
        c.fillStyle = soot;
        c.fillRect(0, 0, w, 150);
      }
      for (let i = 0; i < chips; i++) {
        c.fillStyle = random() < 0.5 ? '#6b5a4a' : '#8d8478';
        c.beginPath();
        c.ellipse(random() * w, random() * h, 3 + random() * 14, 2 + random() * 7, random() * 3, 0, 7);
        c.fill();
      }
    });

    const carriage = s.material(p.carriage);
    const trim = s.material(p.trim, { metalness: 0.35, roughness: 0.45 });
    const iron = s.material('#2c2d31', { metalness: 0.6, roughness: 0.5 });
    const wood = s.material('#8a6238');
    const dark = s.material('#111114', { roughness: 0.9 });
    const barrelPaint = new THREE.MeshStandardMaterial({ map: barrelMap, roughness: 0.45 + mood.wear * 0.4, metalness: 0.15 });

    // Carriage: bed, gilt rails, drawbar and four wheels.
    const iw = a.wheels === 'iron';
    const wheelR = a.wheels === 'sunburst' ? 0.46 : iw ? 0.3 : 0.4;
    const bedY = iw ? 0.62 : 0.95;
    s.box([3.1, 0.46, 1.3], [0, bedY, 0], carriage);
    s.box([3.16, 0.07, 1.36], [0, bedY + 0.24, 0], trim);
    s.box([3.16, 0.07, 1.36], [0, bedY - 0.24, 0], trim);
    const banner = s.label(BANNERS[a.banner], 2.5, 0.3, [0, bedY, 0.655], p.trim, p.carriage);
    banner.castShadow = false;
    for (const x of [-1.42, 1.42]) for (const z of [-0.6, 0.6]) s.cylinder(0.06, 0.06, 0.62, [x, bedY, z], trim, 10);
    s.rod([1.5, bedY - 0.2, 0], [2.45, 0.32, 0], 0.045, wood);
    s.rod([2.45, 0.32, -0.3], [2.45, 0.32, 0.3], 0.035, iron);

    const wheelFace = paint(256, 256, (c, w, h) => {
      c.fillStyle = p.base;
      c.fillRect(0, 0, w, h);
      c.fillStyle = p.mark;
      star(c, w / 2, h / 2, 96, random());
    });
    const discPaint = new THREE.MeshStandardMaterial({ map: wheelFace, roughness: 0.6 });
    for (const x of [-1.0, 1.0])
      for (const z of [-0.78, 0.78]) {
        const wheel = new Sculpture(context);
        const rim = wheel.ring(wheelR, iw ? 0.07 : 0.045, [0, 0, 0], iw ? iron : trim);
        rim.rotation.set(0, 0, 0);
        if (a.wheels === 'solid') wheel.cylinder(wheelR, wheelR, 0.07, [0, 0, 0], [carriage, discPaint, discPaint] as unknown as THREE.Material, 28).rotation.x = Math.PI / 2;
        else {
          const spokes = iw ? 4 : 7;
          for (let i = 0; i < spokes; i++) {
            const spoke = wheel.box([wheelR * 2, iw ? 0.07 : 0.045, 0.04], [0, 0, 0], iw ? iron : i % 2 ? trim : s.material(p.base));
            spoke.rotation.z = (i * Math.PI) / spokes;
          }
        }
        wheel.cylinder(0.09, 0.09, 0.16, [0, 0, 0], iw ? iron : trim, 14).rotation.x = Math.PI / 2;
        wheel.root.position.set(x, wheelR, z);
        wheel.root.rotation.z = random() * Math.PI;
        s.root.add(wheel.root);
      }
    for (const x of [-1.0, 1.0]) s.rod([x, wheelR, -0.78], [x, wheelR, 0.78], 0.04, iron);

    // Trunnion cheeks holding the barrel.
    const pivot = new THREE.Vector3(-0.45, bedY + 0.95, 0);
    const cheekShape = new THREE.Shape();
    cheekShape.moveTo(-0.75, 0);
    cheekShape.lineTo(0.75, 0);
    cheekShape.lineTo(0.2, 0.92);
    cheekShape.lineTo(-0.2, 0.92);
    cheekShape.closePath();
    for (const z of [-0.62, 0.54]) s.mesh(new THREE.ExtrudeGeometry(cheekShape, { depth: 0.08, bevelEnabled: false }), carriage, [pivot.x, bedY + 0.23, z]);
    s.rod([pivot.x, pivot.y, -0.7], [pivot.x, pivot.y, 0.7], 0.08, trim);
    s.ring(0.52, 0.02, [pivot.x, pivot.y, 0.64], trim, Math.PI).rotation.z = Math.PI;

    const tilt = THREE.MathUtils.degToRad(mix(10, 64, a.angle));
    const dir = new THREE.Vector3(Math.cos(tilt), Math.sin(tilt), 0);
    const up = new THREE.Vector3(-Math.sin(tilt), Math.cos(tilt), 0);
    const LENGTH = 2.6, BREECH = -0.6;
    const profile: [number, number][] = [[0.001, BREECH - 0.02], [0.3, BREECH], [0.5, BREECH + 0.18], [0.54, BREECH + 0.4]];
    for (let i = 0; i <= 14; i++) profile.push([mix(0.52, 0.4, i / 14), BREECH + 0.5 + ((LENGTH - BREECH - 0.75) * i) / 14]);
    profile.push([0.48, LENGTH - 0.15], [0.5, LENGTH - 0.05], [0.48, LENGTH], [0.37, LENGTH], [0.35, LENGTH - 0.5]);
    const barrel = new Sculpture(context);
    barrel.lathe(profile, barrelPaint).material.side = THREE.DoubleSide;
    barrel.cylinder(0.36, 0.36, 0.02, [0, LENGTH - 0.42, 0], dark, 24);
    barrel.ring(0.53, 0.035, [0, 0.0, 0], trim).rotation.x = Math.PI / 2;
    barrel.ring(0.47, 0.03, [0, 1.3, 0], trim).rotation.x = Math.PI / 2;
    barrel.ball([0.13, 0.13, 0.13], [0, BREECH - 0.1, 0], trim, 12);
    barrel.root.position.copy(pivot);
    barrel.root.rotation.z = tilt - Math.PI / 2;
    s.root.add(barrel.root);
    const along = (d: number, lift = 0, z = 0): [number, number, number] => [pivot.x + dir.x * d + up.x * lift, pivot.y + dir.y * d + up.y * lift, z];

    // Fuse trailing from the breech.
    const fuseEnd: [number, number, number] = [along(BREECH, 0.75)[0] - 0.25, along(BREECH, 0.75)[1] + 0.05, 0.1];
    s.tube([along(BREECH + 0.25, 0.5), along(BREECH + 0.1, 0.7), fuseEnd], 0.018, s.material('#d8c9a3'));
    const sparks: THREE.Mesh[] = [];
    if (a.state === 'loaded') {
      const spark = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff8a1e', emissiveIntensity: 2.2 });
      for (let i = 0; i < 5; i++) {
        const size = i ? 0.035 : 0.07;
        sparks.push(s.ball([size, size, size], [fuseEnd[0] + (i ? (random() - 0.5) * 0.22 : 0), fuseEnd[1] + (i ? random() * 0.2 : 0), fuseEnd[2] + (i ? (random() - 0.5) * 0.22 : 0)], spark, 8));
      }
    }

    // The crash helmet, wherever the story has left it.
    const helmet = new Sculpture(context);
    const shell = { white: '#f2efe6', gold: '#e2b23a', red: '#c9242d', leather: '#6a4428' }[a.helmet];
    const stripe = { white: '#c9242d', gold: '#fff3c0', red: '#f2efe6', leather: '#3a2616' }[a.helmet];
    const shellPaint = s.material(shell, a.helmet === 'gold' ? { metalness: 0.7, roughness: 0.3 } : { roughness: a.helmet === 'leather' ? 0.9 : 0.35 });
    helmet.mesh(new THREE.SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), shellPaint);
    helmet.mesh(new THREE.SphereGeometry(0.204, 8, 12, -0.22 - Math.PI / 2, 0.44, 0, Math.PI * 0.6), s.material(stripe));
    if (a.helmet === 'leather') {
      for (const x of [-0.08, 0.08]) {
        const lens = helmet.cylinder(0.06, 0.06, 0.04, [x, 0.04, 0.18], s.material('#9fc6cf', { metalness: 0.5, roughness: 0.2 }), 14);
        lens.rotation.x = Math.PI / 2;
      }
      helmet.ring(0.2, 0.018, [0, 0.03, 0], s.material('#2b1c12')).rotation.x = Math.PI / 2;
    } else helmet.box([0.26, 0.02, 0.1], [0, -0.04, 0.2], s.material(stripe));
    if (a.state === 'loaded') {
      const [mx, my] = along(LENGTH + 0.02);
      s.ball([0.15, 0.17, 0.15], [mx, my - 0.02, 0], s.material('#e3b594'), 14);
      helmet.root.position.set(mx, my + 0.05, 0);
      helmet.root.rotation.y = Math.PI / 2 - 0.5;
      const glove = s.material('#f4f1e8');
      for (const z of [-0.36, 0.36]) s.ball([0.08, 0.07, 0.09], along(LENGTH + 0.02, 0.2, z), glove, 10);
    } else if (a.state === 'abandoned' || a.state === 'smoking') {
      const far = a.state === 'smoking';
      helmet.root.position.set(far ? 1.2 + random() * 0.3 : 0.2 + random() * 0.5, 0.17, 1.0 + random() * 0.12);
      helmet.root.rotation.set(1.9 + random() * 0.4, random() * 6, 0.3);
    } else {
      const [mx, my] = along(LENGTH - 0.08, 0.5);
      helmet.root.position.set(mx, my + 0.05, 0);
      helmet.root.rotation.set(0, Math.PI / 2 - 0.4, (random() - 0.5) * 0.3);
    }
    s.root.add(helmet.root);

    // Smoke rolling out of the muzzle after the shot.
    const puffs: { mesh: THREE.Mesh; home: THREE.Vector3; phase: number }[] = [];
    if (a.state === 'smoking') {
      const smoke = s.material('#d9d6cf', { roughness: 1 });
      const sootSmoke = s.material('#8f8b86', { roughness: 1 });
      const count = 9 + Math.floor(mood.density * 6);
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const reach = LENGTH + 0.1 + t * 1.0;
        const home = new THREE.Vector3(...along(reach, (random() - 0.5) * 0.5 * (0.4 + t), (random() - 0.5) * 0.7 * (0.4 + t)));
        home.y += t * t * 0.8;
        const size = 0.2 + t * 0.22 + random() * 0.1;
        const mesh = s.ball([size, size * 0.9, size], home.toArray() as [number, number, number], i % 3 === 0 ? sootSmoke : smoke, 10);
        puffs.push({ mesh, home, phase: random() * 6 });
      }
    }

    if (a.ladder === 'leaning') {
      const top = along(0.9, 0.5, 0);
      const foot: [number, number, number] = [top[0] - 0.1, 0, 1.75];
      for (const dx of [-0.24, 0.24]) s.rod([foot[0] + dx, 0, foot[2]], [top[0] + dx, top[1] + 0.25, 0.42], 0.035, wood);
      const rungs = Math.max(4, Math.round(top[1] / 0.32));
      for (let i = 1; i < rungs; i++) {
        const t = i / rungs;
        s.rod([foot[0] - 0.24, top[1] * t, mix(foot[2], 0.42, t)], [foot[0] + 0.24 + (top[0] - foot[0]), top[1] * t, mix(foot[2], 0.42, t)], 0.022, wood);
      }
    } else if (a.ladder === 'steps') {
      const stepPaint = s.material(p.base), n = 5;
      for (let i = 0; i < n; i++) {
        s.box([0.7, 0.06, 0.3], [-1.3, (i + 1) * (bedY + 0.2) / n, 1.9 - i * 0.26], i % 2 ? trim : stepPaint);
        s.box([0.66, (i + 1) * (bedY + 0.2) / n, 0.04], [-1.3, ((i + 1) * (bedY + 0.2)) / n / 2, 1.76 - i * 0.26], carriage);
      }
    }

    if (a.kegs) {
      const count = 2 + Math.floor(mood.density * 3);
      const kegProfile: [number, number][] = [[0.001, 0], [0.19, 0], [0.24, 0.18], [0.24, 0.34], [0.19, 0.52], [0.001, 0.52]];
      for (let i = 0; i < count; i++) {
        const x = 1.0 + (i % 3) * 0.52 + (random() - 0.5) * 0.08, z = -1.25 - (random() * 0.15), y = i >= 3 ? 0.52 : 0;
        s.lathe(kegProfile, wood, [x - (i >= 3 ? 0.26 : 0), y, z]);
        for (const h of [0.1, 0.42]) s.ring(0.225, 0.014, [x - (i >= 3 ? 0.26 : 0), y + h, z], iron).rotation.x = Math.PI / 2;
      }
      s.label('POWDER', 0.34, 0.12, [1.0, 0.27, -1.0], '#1a1512', '#d9c49a').castShadow = false;
    }

    const lively = mix(0.2, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        sparks.forEach((spark, i) => spark.scale.setScalar((i ? 0.035 : 0.07) * (0.6 + 0.6 * Math.abs(Math.sin(time * (9 + i * 3) * lively + i)))));
        for (const puff of puffs) {
          puff.mesh.position.y = puff.home.y + Math.sin(time * lively + puff.phase) * 0.06;
          puff.mesh.position.x = puff.home.x + Math.cos(time * lively * 0.7 + puff.phase) * 0.04;
        }
      },
    });
  },
});
