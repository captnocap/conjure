import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

function paint(size: number, draw: (g: CanvasRenderingContext2D, n: number) => void, repeat = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  return texture;
}

export default defineThing({
  questions: {
    order: choice('What is on the table?', {
      espresso: 'One small espresso and a carafe of water: a quick solitary stop.',
      two: 'Two coffees, one finished and one untouched and gone cold.',
      wine: 'A carafe of red wine and two stemmed glasses, an evening settling in.',
      pastis: 'Two tall cloudy yellow glasses of pastis and a water carafe, late afternoon.',
      breakfast: 'A cafe creme, a croissant on a plate and an orange juice.',
      bill: 'Only an empty cup and the bill on a saucer under a few coins: they have left.',
    }),
    chairs: choice('How do the two chairs stand?', {
      facing: 'Facing each other across the table, close, a conversation.',
      street: 'Side by side behind the table, both turned out to watch the street.',
      pushed: 'One tucked in, the other shoved back at an angle as if someone left in a hurry.',
      tipped: 'One upright, one knocked over on the pavement.',
      single: 'Only one chair; the other has been borrowed by another table.',
    }),
    weave: choice('What colours is the rattan weave?', {
      red: 'Red and cream checks.',
      navy: 'Navy and cream checks.',
      green: 'Bottle green and cream.',
      black: 'Black and white, sharp.',
      honey: 'Plain honey-coloured cane.',
    }),
    top: choice('What is the table top?', {
      white: 'White marble with grey veins and a brass rim.',
      green: 'Dark green marble.',
      zinc: 'Dull grey zinc, ringed with old glass marks.',
      red: 'Red enamel with a chrome band.',
    }),
    ashtray: choice('Is there an ashtray, and what is in it?', {
      none: 'No ashtray.',
      clean: 'A clean yellow ashtray.',
      smoking: 'One cigarette balanced on it, still burning, a thread of smoke.',
      full: 'Heaped with stubs: someone waited here a long time.',
    }),
    note: noul('Is there a folded note tucked under a saucer?'),
    lipstick: noul('Is there a lipstick print on the rim of a cup or glass?'),
    left: choice('What has been left on a chair?', {
      nothing: 'Nothing.',
      scarf: 'A scarf draped over the back.',
      newspaper: 'A folded newspaper on the seat.',
      rose: 'A single red rose laid on the seat.',
      hat: 'A hat.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [w1, w2] = { red: ['#b3262a', '#eadfc2'], navy: ['#1f2f5c', '#eadfc2'], green: ['#1f5a3c', '#eadfc2'], black: ['#1a1a1c', '#f1eee6'], honey: ['#c99848', '#b98434'] }[a.weave];
    const weave = paint(64, (g, n) => {
      const cell = n / 8;
      for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
        g.fillStyle = ((x + y) % 4 < 2) ? w1 : w2; g.fillRect(x * cell, y * cell, cell, cell);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x * cell, y * cell, cell, 1.5); g.fillRect(x * cell, y * cell, 1.5, cell);
      }
    }, 3);
    const woven = new THREE.MeshStandardMaterial({ map: weave, roughness: 0.75, side: THREE.DoubleSide });
    const cane = s.material('#c9a15a', { roughness: 0.55 });
    const iron = s.material('#232629', { metalness: 0.5, roughness: 0.5 });
    const china = s.material('#f4f1e8', { roughness: 0.3 });

    // Table.
    const T = 0.73, R = 0.31;
    const topTexture = a.top === 'white' || a.top === 'green' ? paint(256, (g, n) => {
      g.fillStyle = a.top === 'white' ? '#ece9e2' : '#1f4638'; g.fillRect(0, 0, n, n);
      g.strokeStyle = a.top === 'white' ? 'rgba(110,112,120,0.55)' : 'rgba(200,225,205,0.5)';
      for (let i = 0; i < 9; i++) {
        g.lineWidth = 0.6 + random() * 2.2; g.beginPath();
        let x = random() * n, y = 0; g.moveTo(x, y);
        while (y < n) { x += (random() - 0.5) * 50; y += 12 + random() * 30; g.lineTo(x, y); }
        g.stroke();
      }
    }) : a.top === 'zinc' ? paint(256, (g, n) => {
      g.fillStyle = '#8f9697'; g.fillRect(0, 0, n, n);
      g.strokeStyle = 'rgba(60,66,70,0.45)'; g.lineWidth = 3;
      for (let i = 0; i < 5 + mood.wear * 8; i++) { g.beginPath(); g.arc(random() * n, random() * n, 18 + random() * 14, 0, 7); g.stroke(); }
    }) : null;
    const topMaterial = new THREE.MeshStandardMaterial({ map: topTexture, color: a.top === 'red' ? '#b8282a' : '#ffffff', roughness: a.top === 'zinc' ? 0.5 : 0.22, metalness: a.top === 'zinc' ? 0.6 : 0 });
    s.cylinder(R, R, 0.03, [0, T - 0.015, 0], topMaterial, 40);
    s.ring(R, 0.014, [0, T - 0.015, 0], s.material(a.top === 'red' || a.top === 'zinc' ? '#c9cdd0' : '#c2a04a', { metalness: 0.8, roughness: 0.3 })).rotation.x = Math.PI / 2;
    s.lathe([[0.1, 0.06], [0.05, 0.1], [0.028, 0.2], [0.035, 0.4], [0.025, 0.62], [0.06, 0.68], [0.14, 0.7]], iron);
    for (let i = 0; i < 3; i++) {
      const t = i * Math.PI * 2 / 3 + 0.5;
      s.tube([[0, 0.12, 0], [Math.sin(t) * 0.12, 0.1, Math.cos(t) * 0.12], [Math.sin(t) * 0.24, 0.035, Math.cos(t) * 0.24], [Math.sin(t) * 0.3, 0.02, Math.cos(t) * 0.3]], 0.02, iron);
      s.ball([0.03, 0.02, 0.03], [Math.sin(t) * 0.3, 0.02, Math.cos(t) * 0.3], iron, 8);
    }

    // Chairs.
    const makeChair = () => {
      const c = new Sculpture(context);
      const seat = c.cylinder(0.2, 0.2, 0.03, [0, 0.455, 0], [cane, woven, woven] as unknown as THREE.Material, 24);
      seat.scale.z = 0.95;
      c.ring(0.2, 0.016, [0, 0.455, 0], cane).rotation.x = Math.PI / 2;
      for (const sx of [-1, 1]) {
        c.rod([sx * 0.15, 0.45, 0.13], [sx * 0.18, 0, 0.17], 0.016, cane);
        c.tube([[sx * 0.2, 0, -0.2], [sx * 0.165, 0.45, -0.15], [sx * 0.17, 0.72, -0.2], [sx * 0.12, 0.87, -0.225], [0, 0.91, -0.235]], 0.016, cane);
      }
      c.ring(0.16, 0.009, [0, 0.24, 0], cane).rotation.x = Math.PI / 2;
      const back = c.mesh(new THREE.PlaneGeometry(0.29, 0.3), woven, [0, 0.7, -0.2]);
      back.rotation.x = -0.14;
      c.rod([-0.165, 0.54, -0.165], [0.165, 0.54, -0.165], 0.012, cane);
      s.root.add(c.root);
      return c;
    };
    const place = (c: Sculpture, x: number, z: number, turn: number) => { c.root.position.set(x, 0, z); c.root.rotation.y = turn; };
    const first = makeChair();
    const second = a.chairs === 'single' ? null : makeChair();
    const jitter = () => (random() - 0.5) * 0.2;
    if (a.chairs === 'facing' || a.chairs === 'single') {
      place(first, -0.56, 0.02, Math.PI / 2 + jitter());
      if (second) place(second, 0.56, -0.02, -Math.PI / 2 + jitter());
    } else if (a.chairs === 'street') {
      place(first, -0.36, -0.5, 0.25 + jitter());
      place(second!, 0.36, -0.5, -0.25 + jitter());
    } else if (a.chairs === 'pushed') {
      place(first, -0.55, 0, Math.PI / 2 + jitter());
      place(second!, 0.95 + random() * 0.2, 0.25, -Math.PI / 2 - 0.8 - random() * 0.5);
    } else {
      place(first, -0.55, 0, Math.PI / 2 + jitter());
      second!.root.rotation.set(-Math.PI / 2, 0, 0.5 + random() * 0.6, 'ZYX');
      second!.root.position.set(0.85, 0.24, 0.35);
    }

    // Tableware.
    const cup = (x: number, z: number, big: boolean, full: boolean, lip: boolean) => {
      const k = big ? 1.35 : 1;
      s.lathe([[0, 0.004], [0.055 * k, 0.006], [0.07 * k, 0.014], [0.068 * k, 0.018], [0.03 * k, 0.01]], china, [x, T, z]);
      s.lathe([[0.02 * k, 0.01], [0.03 * k, 0.03], [0.036 * k, 0.055 * k], [0.032 * k, 0.055 * k], [0.026 * k, 0.03]], china, [x, T, z]).material.side = THREE.DoubleSide;
      s.ring(0.014 * k, 0.004, [x + 0.045 * k, T + 0.036 * k, z], china).rotation.y = 0;
      s.cylinder(0.031 * k, 0.03 * k, 0.004, [x, T + (full ? 0.048 * k : 0.018), z], s.material(full ? (big ? '#b98a5a' : '#2a1a10') : '#5a3a22', { roughness: 0.2 }), 14).castShadow = false;
      if (lip) s.ring(0.034 * k, 0.0045, [x, T + 0.055 * k, z], s.material('#c0182c', { roughness: 0.4 }), 1.1).rotation.set(Math.PI / 2, 0, random() * 6);
    };
    const clear = (colour: string, opacity: number) => new THREE.MeshStandardMaterial({ color: colour, transparent: true, opacity, roughness: 0.08, side: THREE.DoubleSide });
    const carafe = (x: number, z: number, liquid: string, level: number) => {
      s.lathe([[0.0, 0.003], [0.05, 0.003], [0.055, 0.03], [0.05, 0.11], [0.028, 0.16], [0.026, 0.2], [0.036, 0.22]], clear('#dcecef', 0.42), [x, T, z]).castShadow = false;
      s.lathe([[0, 0.006], [0.046, 0.006], [0.051, 0.03], [0.047, level * 0.11], [0, level * 0.11]], s.material(liquid, { roughness: 0.1 }), [x, T, z]);
    };
    const glass = (x: number, z: number, stem: boolean, liquid: string | null, lip: boolean) => {
      const profile: [number, number][] = stem ? [[0.03, 0.002], [0.005, 0.008], [0.004, 0.07], [0.03, 0.1], [0.036, 0.13], [0.031, 0.16]] : [[0, 0.003], [0.026, 0.003], [0.03, 0.13]];
      s.lathe(profile, clear('#e3eff1', 0.45), [x, T, z]).castShadow = false;
      if (liquid) s.cylinder(stem ? 0.032 : 0.027, stem ? 0.02 : 0.025, stem ? 0.035 : 0.08, [x, T + (stem ? 0.105 : 0.046), z], s.material(liquid, { roughness: 0.15 }), 12);
      if (lip) s.ring(stem ? 0.031 : 0.03, 0.004, [x, T + (stem ? 0.16 : 0.13), z], s.material('#c0182c'), 1.1).rotation.set(Math.PI / 2, 0, random() * 6);
    };
    const spot = (r: number, t: number): [number, number] => [Math.sin(t) * r, Math.cos(t) * r];
    const base = random() * 6;
    let saucerAt: [number, number] = spot(0.15, base);
    if (a.order === 'espresso') { cup(...saucerAt, false, true, a.lipstick); carafe(...spot(0.14, base + 2.4), '#bfdfe8', 0.8); glass(...spot(0.17, base + 4), false, null, false); }
    else if (a.order === 'two') { cup(...saucerAt, false, false, a.lipstick); cup(...spot(0.16, base + Math.PI), false, true, false); carafe(...spot(0.05, base + 1.5), '#bfdfe8', 0.5); }
    else if (a.order === 'wine') { carafe(...spot(0.04, base), '#6a1024', mix(0.3, 0.9, random())); glass(...spot(0.18, base + 1.6), true, '#7a1228', a.lipstick); glass(...spot(0.18, base + 4.4), true, random() < 0.5 ? '#7a1228' : null, false); saucerAt = spot(0.19, base + 3); s.lathe([[0, 0.004], [0.05, 0.006], [0.062, 0.016]], china, [saucerAt[0], T, saucerAt[1]]); }
    else if (a.order === 'pastis') { carafe(...spot(0.05, base), '#bfdfe8', 0.6); glass(...spot(0.18, base + 1.6), false, '#e6d98a', a.lipstick); glass(...spot(0.18, base + 4.4), false, '#e6d98a', false); saucerAt = spot(0.19, base + 3); s.lathe([[0, 0.004], [0.05, 0.006], [0.062, 0.016]], china, [saucerAt[0], T, saucerAt[1]]); for (let i = 0; i < 5; i++) s.ball([0.012, 0.009, 0.01], [saucerAt[0] + (random() - 0.5) * 0.05, T + 0.018, saucerAt[1] + (random() - 0.5) * 0.05], s.material('#5a6a2c'), 6); }
    else if (a.order === 'breakfast') {
      cup(...saucerAt, true, true, a.lipstick);
      const [px, pz] = spot(0.15, base + 2.2);
      s.lathe([[0, 0.004], [0.07, 0.006], [0.09, 0.016]], china, [px, T, pz]);
      s.ring(0.035, 0.02, [px, T + 0.03, pz + 0.01], s.material('#c98a3a', { roughness: 0.7 }), Math.PI * 1.1).rotation.x = Math.PI / 2;
      glass(...spot(0.17, base + 4.2), false, '#f09a1e', false);
    } else {
      cup(...spot(0.16, base + 2.5), false, false, a.lipstick);
      s.lathe([[0, 0.004], [0.055, 0.006], [0.07, 0.016]], china, [saucerAt[0], T, saucerAt[1]]);
      const slip = s.box([0.05, 0.002, 0.11], [saucerAt[0], T + 0.02, saucerAt[1]], s.material('#fbfaf4'));
      slip.rotation.y = random() * 3;
      for (let i = 0; i < 3 + Math.floor(random() * 4); i++) s.cylinder(0.011, 0.011, 0.003, [saucerAt[0] + (random() - 0.5) * 0.06, T + 0.024 + i * 0.001, saucerAt[1] + (random() - 0.5) * 0.06], s.material(random() < 0.5 ? '#c9a23a' : '#b9bcc0', { metalness: 0.8, roughness: 0.3 }), 10);
    }
    if (a.note) {
      const t = random() * 6;
      const note = s.box([0.1, 0.004, 0.065], [saucerAt[0] + Math.sin(t) * 0.07, T + 0.004, saucerAt[1] + Math.cos(t) * 0.07], s.material(mood.cheer > 0.6 ? '#f6d6dc' : '#f7f3e4'));
      note.rotation.y = t + 0.4;
      const fold = s.box([0.1, 0.003, 0.03], [saucerAt[0] + Math.sin(t) * 0.085, T + 0.012, saucerAt[1] + Math.cos(t) * 0.085], s.material('#e9e3d0'));
      fold.rotation.set(0.35, t + 0.4, 0, 'YXZ');
    }
    let smoke: THREE.Mesh | null = null;
    if (a.ashtray !== 'none') {
      const [x, z] = spot(0.2, base + (a.order === 'breakfast' ? 5.4 : 5.5));
      s.lathe([[0, 0.006], [0.045, 0.006], [0.055, 0.028], [0.048, 0.028], [0.04, 0.012]], s.material('#e8b81e', { roughness: 0.3 }), [x, T, z]);
      const butt = (dx: number, dz: number, turn: number, lit: boolean) => {
        const stick = s.cylinder(0.004, 0.004, lit ? 0.07 : 0.03, [x + dx, T + (lit ? 0.03 : 0.018), z + dz], s.material('#f3efe6'), 6);
        stick.rotation.set(Math.PI / 2 - (lit ? 0.15 : random() * 0.6), turn, 0, 'YXZ');
        if (lit) s.ball([0.005, 0.005, 0.005], [x + dx + Math.sin(turn) * 0.036, T + 0.036, z + dz + Math.cos(turn) * 0.036], new THREE.MeshStandardMaterial({ color: '#ff5a1e', emissive: '#ff4a10', emissiveIntensity: 2 }), 6);
      };
      if (a.ashtray === 'smoking') {
        const turn = random() * 6;
        butt(0, 0, turn, true);
        const px = x + Math.sin(turn) * 0.036, pz = z + Math.cos(turn) * 0.036;
        smoke = s.tube([[px, T + 0.04, pz], [px + 0.012, T + 0.12, pz - 0.008], [px - 0.015, T + 0.2, pz + 0.012], [px + 0.02, T + 0.3, pz], [px - 0.01, T + 0.4, pz + 0.02]], 0.004, new THREE.MeshStandardMaterial({ color: '#dfe3e6', transparent: true, opacity: 0.45, depthWrite: false }));
        smoke.castShadow = false;
      } else if (a.ashtray === 'full') {
        for (let i = 0; i < 9 + Math.round(mood.density * 6); i++) butt((random() - 0.5) * 0.06, (random() - 0.5) * 0.06, random() * 6, false);
        s.cylinder(0.04, 0.04, 0.006, [x, T + 0.014, z], s.material('#6a6660', { roughness: 1 }), 12);
      }
    }

    // Left on the first chair.
    if (a.left !== 'nothing') {
      const c = first;
      if (a.left === 'scarf') {
        const wool = c.material(mood.cheer > 0.5 ? '#d8452c' : '#3a4a6a', { roughness: 1, side: THREE.DoubleSide });
        c.tube([[-0.1, 0.5, -0.27], [-0.09, 0.8, -0.26], [-0.05, 0.93, -0.235], [0.0, 0.84, -0.19], [0.03, 0.6, -0.17]], 0.03, wool).scale.z = 1;
      } else if (a.left === 'newspaper') {
        c.box([0.26, 0.018, 0.19], [0.01, 0.48, 0.0], c.material('#dcd6c6')).rotation.y = 0.3;
        c.box([0.2, 0.002, 0.03], [0.0, 0.49, 0.04], c.material('#2a2a2a')).rotation.y = 0.3;
      } else if (a.left === 'rose') {
        c.rod([-0.12, 0.48, -0.06], [0.1, 0.48, 0.06], 0.005, c.material('#2f6a34'));
        c.ball([0.028, 0.025, 0.028], [0.12, 0.485, 0.07], c.material('#b8142a', { roughness: 0.6 }), 10);
        c.ball([0.025, 0.004, 0.012], [0.0, 0.482, 0.02], c.material('#2f6a34'), 6);
      } else {
        const felt = c.material(mood.cheer > 0.5 ? '#c9a868' : '#2a2a2e', { roughness: 0.9 });
        c.cylinder(0.15, 0.15, 0.008, [0, 0.476, 0], felt, 20);
        c.lathe([[0.09, 0], [0.085, 0.07], [0.06, 0.09], [0, 0.085]], felt, [0, 0.478, 0]);
        c.cylinder(0.092, 0.092, 0.02, [0, 0.49, 0], c.material('#1a1a1a'), 20);
      }
    }

    const sway = mix(0.4, 2.5, mood.energy);
    return s.finish({ update: (_dt, time) => { if (smoke) smoke.rotation.y = Math.sin(time * sway) * 0.02; } });
  },
});
