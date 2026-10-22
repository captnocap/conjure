import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const STYLES = {
  turned: { wood: '#4b2817', panel: '#653825', top: '#2d160d', trim: '#c2a04e' },
  panelled: { wood: '#a57a4c', panel: '#bb925f', top: '#70532f', trim: '#8f9396' },
  glass: { wood: '#d6bd93', panel: '#e3cfa8', top: '#34373a', trim: '#b8c0c4' },
  dock: { wood: '#3a2a20', panel: '#4b382a', top: '#221810', trim: '#2b2c2e' },
} as const;
const SIGNS = { witness: 'WITNESS', truth: 'THE WHOLE TRUTH', accused: 'ACCUSED', oath: 'I SWEAR', blank: '' } as const;

export default defineThing({
  questions: {
    style: choice('What kind of witness box is it?', {
      turned: 'Dark old timber with a rail of turned balusters you can see through.',
      panelled: 'A solid honey-oak box with raised panels, ordinary and municipal.',
      glass: 'Pale wood posts with clear glass screens, a modern court.',
      dock: 'Nearly a dock: black timber topped with a row of iron spikes, more cage than seat.',
    }),
    enclosure: score('How enclosed is the person standing in it?', ['A low rail at the hip, exposed to the room', 'Waist high', 'Chest high, half hidden']),
    chair: choice('What has become of the chair?', {
      placed: 'Set squarely in the box, waiting for the next witness.',
      back: 'Pushed back and turned, someone just stepped down.',
      toppled: 'Knocked over, its legs sticking up above the rail.',
      none: 'There is no chair. Witnesses here stand.',
    }),
    book: choice('What is there to swear on?', {
      bible: 'A black leather Bible with a gilt cross.',
      law: 'A fat red-bound book of statutes.',
      stack: 'A neat stack of several holy books, one for every faith.',
      card: 'Only a laminated card with the words of the affirmation.',
      open: 'A big book left lying open, face up.',
    }),
    water: choice('What state is the glass of water in?', {
      full: 'Full and untouched.',
      half: 'Half drunk.',
      empty: 'Drained to the last drop.',
      spilled: 'Knocked over, a puddle running off the ledge.',
      none: 'Nobody offered any water.',
    }),
    left: choice('What did the last witness leave behind?', {
      nothing: 'Nothing at all.',
      handkerchief: 'A crumpled white handkerchief.',
      glasses: 'A pair of spectacles.',
      hat: 'A hat, set down and forgotten.',
      toy: 'A small soft toy, held for courage.',
      tissues: 'A box of tissues and several used ones.',
    }),
    mic: choice('What microphone is there?', {
      none: 'None; you must speak up.',
      gooseneck: 'A thin black gooseneck with a red light.',
      vintage: 'A fat chrome broadcast microphone on a stand.',
    }),
    sign: choice('What is lettered on the front of the box?', { witness: 'WITNESS, plainly.', truth: 'THE WHOLE TRUTH, as a reminder.', accused: 'ACCUSED: this is where the defendant answers.', oath: 'I SWEAR, the first words of the oath.', blank: 'Nothing; the panel is bare.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const st = STYLES[a.style];
    const wood = s.material(st.wood, { roughness: 0.5 });
    const panel = s.material(st.panel, { roughness: 0.55 });
    const top = s.material(st.top, { roughness: 0.4 });
    const trim = s.material(st.trim, { metalness: 0.7, roughness: 0.35 });
    const black = s.material('#17181b');
    const white = s.material('#f1eee4');
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff1f5', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false });
    const water = s.material('#86c0d4', { roughness: 0.1, transparent: true, opacity: 0.8 });

    const W = 1.5, Dp = 1.35, P = 0.26;
    const H = mix(0.72, 1.22, a.enclosure);
    const railY = P + H;

    // Platform with a step at the back-left where the witness climbs in.
    s.box([W + 0.12, P, Dp + 0.12], [0, P / 2, 0], wood);
    s.box([W + 0.2, 0.04, Dp + 0.2], [0, P - 0.01, 0], top);
    s.box([0.7, P / 2, 0.4], [-0.3, P / 4, -Dp / 2 - 0.24], wood);

    // Three walls: front (+z) and two sides. The back is open.
    const walls: { len: number; at: [number, number]; rot: number }[] = [
      { len: W, at: [0, Dp / 2 - 0.04], rot: 0 },
      { len: Dp, at: [-W / 2 + 0.04, 0], rot: Math.PI / 2 },
      { len: Dp, at: [W / 2 - 0.04, 0], rot: Math.PI / 2 },
    ];
    for (const [index, wall] of walls.entries()) {
      const g = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number]) => {
        const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh;
      };
      const out = index === 1 ? -1 : 1; // which local z faces outward after rotation
      add(new THREE.BoxGeometry(wall.len, 0.07, 0.12), top, [0, H - 0.035, 0]);
      add(new THREE.BoxGeometry(wall.len, 0.12, 0.09), wood, [0, 0.06, 0]);
      if (a.style === 'turned') {
        const count = Math.round(wall.len / 0.15);
        for (let i = 0; i < count; i++) {
          if (mood.wear > 0.7 && random() < 0.12) continue;
          const x = (i - (count - 1) / 2) * (wall.len - 0.16) / (count - 1);
          add(new THREE.LatheGeometry([[0.022, 0], [0.04, 0.12], [0.02, 0.3], [0.045, 0.55], [0.02, 0.8], [0.03, 1]].map(([r, y]) => new THREE.Vector2(r, y * (H - 0.18))), 10), panel, [x, 0.12, 0]);
        }
      } else if (a.style === 'glass') {
        add(new THREE.BoxGeometry(wall.len - 0.1, H - 0.2, 0.02), glass, [0, H / 2, 0]);
        add(new THREE.BoxGeometry(wall.len, 0.3, 0.06), panel, [0, 0.25, 0]);
      } else {
        add(new THREE.BoxGeometry(wall.len, H - 0.18, 0.06), wood, [0, H / 2, 0]);
        const cols = wall.len > 1.4 ? 3 : 2;
        for (let i = 0; i < cols; i++) {
          const x = (i - (cols - 1) / 2) * (wall.len - 0.14) / cols;
          add(new THREE.BoxGeometry((wall.len - 0.14) / cols - 0.1, H - 0.38, 0.03), panel, [x, H / 2, out * 0.04]);
          if (a.style === 'panelled') add(new THREE.BoxGeometry((wall.len - 0.14) / cols - 0.22, H - 0.5, 0.02), wood, [x, H / 2, out * 0.058]);
        }
      }
      if (a.style === 'dock') {
        const count = Math.round(wall.len / 0.13);
        for (let i = 0; i < count; i++) {
          const x = (i - (count - 1) / 2) * (wall.len - 0.14) / (count - 1);
          add(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6), trim, [x, H + 0.16, 0]);
          add(new THREE.ConeGeometry(0.028, 0.1, 6), trim, [x, H + 0.36, 0]);
        }
        add(new THREE.BoxGeometry(wall.len, 0.02, 0.03), trim, [0, H + 0.26, 0]);
      }
      g.position.set(wall.at[0], P, wall.at[1]); g.rotation.y = wall.rot;
      s.root.add(g);
    }
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.box([0.11, H + 0.06, 0.11], [x * (W / 2 - 0.04), P + (H + 0.06) / 2, z * (Dp / 2 - 0.04)], wood);
      if (a.style === 'turned') s.ball([0.07, 0.07, 0.07], [x * (W / 2 - 0.04), P + H + 0.12, z * (Dp / 2 - 0.04)], a.style === 'turned' ? trim : top, 12);
    }

    // The ledge on the front rail where everything is set down.
    const lz = Dp / 2 - 0.16, ly = railY + 0.03;
    s.box([W - 0.1, 0.04, 0.36], [0, ly - 0.02, lz], top);
    if (a.sign !== 'blank') s.label(SIGNS[a.sign], 0.9, 0.16, [0, P + H * 0.5, Dp / 2 + 0.05], a.style === 'glass' ? '#f4f1e8' : st.trim, a.style === 'glass' ? '#34373a' : st.top);

    // Book.
    const bx = -0.42, bz = lz + 0.02;
    const gilt = s.material('#d2ab4c', { metalness: 0.6, roughness: 0.35 });
    if (a.book === 'bible' || a.book === 'law') {
      const thick = a.book === 'law' ? 0.09 : 0.06;
      const cover = a.book === 'law' ? s.material('#8d1f2a') : black;
      const b = s.box([0.3, thick, 0.22], [bx, ly + thick / 2, bz], cover); b.rotation.y = (random() - 0.5) * 0.4;
      s.box([0.28, thick - 0.016, 0.2], [bx + 0.012, ly + thick / 2, bz + 0.012], white).rotation.y = b.rotation.y;
      s.box([0.3, 0.008, 0.22], [bx, ly + thick, bz], cover).rotation.y = b.rotation.y;
      if (a.book === 'bible') { s.box([0.03, 0.004, 0.13], [bx, ly + thick + 0.008, bz], gilt).rotation.y = b.rotation.y; s.box([0.09, 0.004, 0.03], [bx, ly + thick + 0.008, bz - 0.02], gilt).rotation.y = b.rotation.y; }
      else s.box([0.3, 0.005, 0.04], [bx, ly + thick + 0.008, bz + 0.04], gilt).rotation.y = b.rotation.y;
    } else if (a.book === 'stack') {
      const hues = ['#17181b', '#1f5a3c', '#22386b', '#8d1f2a', '#6b4a22'];
      for (let i = 0; i < 5; i++) { const b = s.box([0.3 - i * 0.02, 0.05, 0.22 - i * 0.012], [bx, ly + 0.025 + i * 0.052, bz], s.material(hues[i])); b.rotation.y = (random() - 0.5) * 0.3; }
    } else if (a.book === 'card') {
      const c = s.box([0.22, 0.004, 0.14], [bx, ly + 0.004, bz], white); c.rotation.y = 0.2;
      for (let i = 0; i < 4; i++) s.box([0.17, 0.002, 0.008], [bx, ly + 0.008, bz - 0.04 + i * 0.026], black).rotation.y = 0.2;
    } else {
      for (const side of [-1, 1]) { const p = s.box([0.21, 0.04, 0.28], [bx + side * 0.105, ly + 0.03, bz], white); p.rotation.z = side * -0.12; }
      s.box([0.44, 0.012, 0.3], [bx, ly + 0.006, bz], black);
      s.box([0.012, 0.006, 0.3], [bx + 0.04, ly + 0.05, bz], s.material('#b3273a'));
    }

    // Water.
    const wx = 0.5, wz = lz;
    if (a.water === 'spilled') {
      const g = s.cylinder(0.045, 0.038, 0.13, [wx, ly + 0.045, wz], glass, 14); g.rotation.z = Math.PI / 2;
      s.cylinder(0.16, 0.16, 0.005, [wx - 0.12, ly + 0.003, wz + 0.03], water, 20).scale.set(1.2, 1, 0.7);
      s.rod([wx - 0.15, ly, lz + 0.18], [wx - 0.15, ly - 0.25 - random() * 0.3, lz + 0.2], 0.012, water, 0.004);
      s.cylinder(0.14, 0.14, 0.005, [wx - 0.15, 0.003, Dp / 2 + 0.3], water, 18).scale.set(1, 1, 0.7);
    } else if (a.water !== 'none') {
      s.cylinder(0.045, 0.038, 0.13, [wx, ly + 0.065, wz], glass, 14);
      const level = { full: 0.11, half: 0.055, empty: 0 }[a.water];
      if (level) s.cylinder(0.04, 0.035, level, [wx, ly + 0.008 + level / 2, wz], water, 14);
    }

    // What was left behind.
    const ix = 0.12, iz = lz + 0.04;
    if (a.left === 'handkerchief' || a.left === 'tissues') {
      const wad = (x: number, y: number, z: number, r: number) => {
        const geometry = new THREE.IcosahedronGeometry(r, 1);
        const pos = geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * mix(0.6, 1.3, random()), pos.getY(i) * mix(0.3, 0.7, random()), pos.getZ(i) * mix(0.6, 1.3, random()));
        geometry.computeVertexNormals();
        s.mesh(geometry, white, [x, y + r * 0.35, z]);
      };
      if (a.left === 'handkerchief') wad(ix, ly, iz, 0.1);
      else {
        s.box([0.24, 0.09, 0.13], [ix, ly + 0.045, iz - 0.03], s.material(mood.cheer > 0.5 ? '#7fb6d9' : '#9aa3a8'));
        wad(ix, ly + 0.08, iz - 0.03, 0.05);
        for (let i = 0; i < 3 + Math.floor(random() * 3); i++) wad(ix - 0.1 + random() * 0.45, ly, iz + 0.02 + random() * 0.08, 0.045);
        wad(ix + random() * 0.4, 0, Dp / 2 + 0.25 + random() * 0.2, 0.06);
      }
    } else if (a.left === 'glasses') {
      for (const x of [-1, 1]) { const r = s.ring(0.035, 0.006, [ix + x * 0.045, ly + 0.04, iz], black); r.rotation.x = -0.2; s.rod([ix + x * 0.08, ly + 0.04, iz], [ix + x * 0.085, ly + 0.01, iz - 0.13], 0.005, black); }
      s.rod([ix - 0.012, ly + 0.045, iz], [ix + 0.012, ly + 0.045, iz], 0.005, black);
    } else if (a.left === 'hat') {
      const felt = s.material(['#4a3b2c', '#2b2e33', '#6d6a5f'][Math.floor(random() * 3)]);
      s.cylinder(0.17, 0.17, 0.012, [ix + 0.03, ly + 0.006, iz - 0.02], felt, 24);
      s.cylinder(0.085, 0.1, 0.11, [ix + 0.03, ly + 0.065, iz - 0.02], felt, 24);
      s.cylinder(0.102, 0.102, 0.025, [ix + 0.03, ly + 0.025, iz - 0.02], black, 24);
    } else if (a.left === 'toy') {
      const fur = s.material(mood.cheer > 0.5 ? '#c99657' : '#9a8a78');
      s.ball([0.075, 0.085, 0.065], [ix, ly + 0.085, iz], fur, 12);
      s.ball([0.06, 0.058, 0.055], [ix, ly + 0.2, iz + 0.005], fur, 12);
      for (const x of [-1, 1]) { s.ball([0.024, 0.024, 0.014], [ix + x * 0.048, ly + 0.25, iz], fur, 8); s.ball([0.03, 0.045, 0.03], [ix + x * 0.08, ly + 0.1, iz + 0.03], fur, 8); s.ball([0.035, 0.03, 0.05], [ix + x * 0.05, ly + 0.025, iz + 0.06], fur, 8); }
      s.ball([0.022, 0.018, 0.02], [ix, ly + 0.19, iz + 0.055], white, 8);
    }

    // Microphone.
    let led: THREE.MeshStandardMaterial | null = null;
    if (a.mic === 'gooseneck') {
      s.cylinder(0.05, 0.06, 0.02, [-0.05, ly + 0.01, lz - 0.08], black, 14);
      s.tube([[-0.05, ly, lz - 0.08], [-0.05, ly + 0.22, lz - 0.09], [-0.05, ly + 0.36, lz - 0.16], [-0.05, ly + 0.4, lz - 0.26]], 0.008, black);
      s.ball([0.022, 0.022, 0.035], [-0.05, ly + 0.405, lz - 0.28], black, 10);
      led = s.material('#ff3524', { emissive: '#ff2a18', emissiveIntensity: 1.5 });
      s.cylinder(0.014, 0.014, 0.012, [-0.05, ly + 0.395, lz - 0.245], led, 10).rotation.x = Math.PI / 2;
    } else if (a.mic === 'vintage') {
      const chrome = s.material('#d9dee0', { metalness: 0.9, roughness: 0.2 });
      s.cylinder(0.075, 0.085, 0.03, [-0.05, ly + 0.015, lz - 0.06], chrome, 18);
      s.rod([-0.05, ly, lz - 0.06], [-0.05, ly + 0.2, lz - 0.06], 0.012, chrome);
      const yoke = s.ring(0.065, 0.008, [-0.05, ly + 0.27, lz - 0.06], chrome, Math.PI); yoke.rotation.z = Math.PI;
      s.ball([0.05, 0.075, 0.05], [-0.05, ly + 0.29, lz - 0.06], chrome, 14);
      for (let i = 0; i < 4; i++) s.cylinder(0.052, 0.052, 0.006, [-0.05, ly + 0.25 + i * 0.027, lz - 0.06], black, 14);
    }

    // Chair.
    if (a.chair !== 'none') {
      const chair = new THREE.Group();
      const add = (size: [number, number, number], at: [number, number, number], material: THREE.Material) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; chair.add(mesh);
      };
      const seat = a.style === 'glass' ? black : a.style === 'panelled' ? s.material('#3d4d5c') : s.material('#6a1826');
      add([0.46, 0.06, 0.44], [0, 0.47, 0], seat);
      for (const x of [-1, 1]) { add([0.05, 0.45, 0.05], [x * 0.2, 0.225, 0.19], wood); add([0.05, 1.05, 0.05], [x * 0.2, 0.525, -0.2], wood); }
      add([0.45, 0.1, 0.04], [0, 1.0, -0.2], wood);
      for (let i = 0; i < 4; i++) add([0.03, 0.42, 0.03], [(i - 1.5) * 0.09, 0.74, -0.2], wood);
      if (a.chair === 'placed') { chair.position.set(0, P, -0.2); chair.rotation.y = (random() - 0.5) * 0.1; }
      else if (a.chair === 'back') { chair.position.set(0.15, P, -0.42); chair.rotation.y = mix(0.5, 1.1, random()) * (random() > 0.5 ? 1 : -1); }
      else { chair.position.set(0.1, P + 0.3 + H * 0.35, -0.25); chair.rotation.set(-2.0 - random() * 0.3, mix(-0.5, 0.5, random()), 0.2); }
      s.root.add(chair);
    }

    // Scuffs and a dropped paper when things are worn.
    if (mood.wear > 0.55) for (let i = 0; i < 3; i++) { const p = s.box([0.21, 0.004, 0.3], [(random() - 0.5) * 1.8, 0.005, Dp / 2 + 0.2 + random() * 0.4], white); p.rotation.y = random() * 3; }

    const blink = mix(1, 7, mood.energy);
    const lamp = led;
    return s.finish({ update: lamp ? (_dt, time) => { lamp.emissiveIntensity = 0.9 + Math.sin(time * blink) * 0.8; } : undefined });
  },
});
