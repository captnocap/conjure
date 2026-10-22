import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type V3 = readonly [number, number, number];

const PALETTES = {
  mourning: ['#1b1a1e', '#232228', '#2a2c36', '#1f2430', '#33313a', '#26221f'],
  office: ['#b08a5a', '#6b6f78', '#27365a', '#c9b796', '#3a3a40', '#8a7a62'],
  outdoors: ['#4a5a3a', '#27365a', '#6b2a30', '#3f5a52', '#5a5248', '#2f4a6a'],
  jumble: ['#6a4a5a', '#4a6a6a', '#8a6a3a', '#3a3a40', '#6a6f4a', '#7a4a3a', '#4a4a6a'],
} as const;

export default defineThing({
  questions: {
    stand: choice('What kind of stand is it?', {
      bentwood: 'A dark bentwood hat stand with curled hooks and an umbrella ring.',
      steel: 'A chrome tube stand on a heavy round base with ball-ended pegs.',
      rail: 'A wheeled garment rail with wire hangers, rolled out because the hooks ran out.',
    }),
    coats: choice('What are most of the coats like?', {
      mourning: 'Black and charcoal overcoats, all much the same: funeral coats.',
      office: 'Camel, grey and navy work coats and a beige raincoat.',
      outdoors: 'Waxed jackets and waterproofs in olive, navy and maroon.',
      jumble: 'A muddle of faded colours and odd lengths, nobody\'s best.',
    }),
    standout: choice('What stands out among them?', {
      nothing: 'Nothing: they are anonymous.',
      bright: 'One bright coat, scarlet or yellow, among all the dark ones.',
      child: 'A child\'s small hooded jacket on a low hook, with little wellington boots underneath.',
      last: 'A single coat: every other hook is empty. Everyone else has gone home and one person has not.',
      uniform: 'A dress uniform jacket with brass buttons and a row of medal ribbons, its peaked cap on top.',
      fur: 'An old fur coat, bulky and out of its time.',
    }),
    hat: choice('What hat sits on top?', {
      trilby: 'A grey trilby.',
      cap: 'A tweed flat cap.',
      bowler: 'A black bowler.',
      brim: 'A wide-brimmed black hat with a ribbon.',
      bobble: 'A knitted bobble hat.',
      none: 'No hat.',
    }),
    umbrellas: choice('What is in the base?', {
      black: 'Several long black umbrellas.',
      golf: 'One huge striped golf umbrella among the black ones.',
      stick: 'A walking stick and a single umbrella.',
      none: 'Nothing.',
    }),
    wet: noul('Is it raining outside, so the umbrellas drip into a puddle?'),
    scarf: choice('What scarf hangs among the coats?', {
      none: 'None.',
      club: 'A striped football scarf.',
      tartan: 'A tartan wool scarf.',
      rainbow: 'A very long hand-knitted scarf in every colour.',
      white: 'A white silk evening scarf.',
    }),
    fallen: noul('Has one coat slid off and been left in a heap on the floor?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const palette = PALETTES[a.coats];
    const coatColour = () => new THREE.Color(pick(palette)).offsetHSL(0, mood.cheer * 0.06 - 0.03, rnd(-0.02, 0.03) + (a.coats === 'mourning' ? 0.03 : 0));
    const swayers: THREE.Group[] = [];

    /** A coat hanging by its collar: origin at the hook, front toward +z. */
    const coat = (opts: { length: number; colour: THREE.Color; width?: number; fur?: boolean; hood?: boolean; uniform?: boolean; hanger?: boolean }) => {
      const g = new THREE.Group();
      const L = opts.length, w = opts.width ?? 1;
      const mat = s.material(opts.colour, { roughness: opts.fur ? 1 : 0.85, flatShading: !!opts.fur });
      const profile: [number, number][] = [[0.17 * w, -L], [0.19 * w, -L * 0.72], [0.2 * w, -0.34], [0.215 * w, -0.13], [0.15 * w, -0.045], [0.06 * w, -0.01], [0.045 * w, 0.02]];
      const geo = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x * (opts.fur ? 1.18 : 1), y)), opts.fur ? 12 : 18);
      const pos = geo.getAttribute('position');
      const phase = rnd(0, 6);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const ang = Math.atan2(z, x), depth = Math.min(1, -y / L);
        const fold = 1 + Math.sin(ang * 5 + phase) * 0.09 * depth + (opts.fur ? (random() - 0.5) * 0.12 : 0);
        pos.setXYZ(i, x * fold, y + (opts.hanger ? 0 : Math.abs(Math.sin(ang)) * -0.02 * depth), z * fold * 0.5);
      }
      geo.computeVertexNormals();
      const body = new THREE.Mesh(geo, mat); body.castShadow = body.receiveShadow = true; g.add(body);
      const sleeveL = Math.min(0.62, L * 0.66);
      for (const side of [-1, 1]) {
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.058 * w, 0.046 * w, sleeveL, 8), mat);
        sleeve.position.set(side * 0.215 * w, -0.1 - sleeveL / 2, 0); sleeve.rotation.z = side * 0.07;
        sleeve.castShadow = true; g.add(sleeve);
      }
      const trim = s.material(opts.colour.clone().multiplyScalar(opts.fur ? 0.8 : 0.7), { roughness: 0.8 });
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.07 * w, 0.028 * w, 6, 14), trim); collar.rotation.x = Math.PI / 2 - 0.3; collar.position.y = -0.03; collar.scale.z = 1; collar.castShadow = true; g.add(collar);
      if (!opts.fur) { const placket = new THREE.Mesh(new THREE.BoxGeometry(0.014, L * 0.82, 0.012), trim); placket.position.set(0.01, -L * 0.55, 0.102 * w); g.add(placket); }
      if (opts.hood) { const hood = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat); hood.scale.set(1, 1.1, 0.6); hood.position.set(0, -0.07, -0.07); hood.castShadow = true; g.add(hood); }
      if (opts.uniform) {
        const brass = s.material('#d9b24a', { metalness: 0.6, roughness: 0.3 });
        for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), brass); b.position.set(0.012, -0.22 - i * 0.11, 0.108); g.add(b); }
        for (const side of [-1, 1]) { const ep = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.014, 0.05), brass); ep.position.set(side * 0.16, -0.075, 0); ep.rotation.z = -side * 0.3; g.add(ep); }
        ['#b3241f', '#27365a', '#e3b93a', '#2f5a44', '#f4f1e8'].forEach((c, i) => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.006), s.material(c)); r.position.set(-0.13 + i * 0.023, -0.24, 0.098); g.add(r); });
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.035, 0.012), s.material('#3a2a1a')); belt.position.set(0, -0.48, 0.1); g.add(belt);
      }
      if (opts.hanger) {
        const wireMat = s.material('#9aa0a3', { metalness: 0.5 });
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 14, Math.PI * 1.5), wireMat); hook.position.y = 0.085; hook.rotation.z = -Math.PI / 4; g.add(hook);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 6), wireMat); stem.position.y = 0.035; g.add(stem);
      }
      s.root.add(g);
      return g;
    };

    // ---- the stand ----
    const single = a.standout === 'last';
    const count = single ? 1 : Math.round(mix(5, 11, mood.density));
    const hooks: { p: V3; yaw: number }[] = [];
    const H = 1.82;
    let hatAt: V3 = [0, H, 0], ringR = 0.16, ringY = 0.62, umbrellaCentre: V3 = [0, 0, 0];
    if (a.stand === 'bentwood') {
      const wood = s.material(pick(['#3a2418', '#5a3a22', '#2a1c14']), { roughness: 0.4 });
      s.cylinder(0.022, 0.03, H, [0, H / 2, 0], wood, 12);
      s.ball([0.04, 0.045, 0.04], [0, H + 0.02, 0], wood, 12);
      for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2 + 0.4; s.tube([[0, 0.5, 0], [Math.cos(t) * 0.07, 0.3, Math.sin(t) * 0.07], [Math.cos(t) * 0.27, 0.06, Math.sin(t) * 0.27], [Math.cos(t) * 0.34, 0.015, Math.sin(t) * 0.34]], 0.017, wood); }
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2, y = i % 2 ? 1.72 : 1.56, c = Math.cos(t), sn = Math.sin(t);
        s.tube([[0, y - 0.12, 0], [c * 0.07, y - 0.1, sn * 0.07], [c * 0.15, y, sn * 0.15], [c * 0.2, y + 0.06, sn * 0.2], [c * 0.17, y + 0.1, sn * 0.17]], 0.011, wood);
        hooks.push({ p: [c * 0.16, y + 0.01, sn * 0.16], yaw: t });
      }
      const ring = s.ring(0.17, 0.011, [0, 0.62, 0], wood); ring.rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2 + 0.4; s.rod([0, 0.62, 0], [Math.cos(t) * 0.17, 0.62, Math.sin(t) * 0.17], 0.007, wood); }
      s.cylinder(0.19, 0.17, 0.025, [0, 0.07, 0], s.material('#b89a4e', { metalness: 0.5, roughness: 0.4 }), 20);
      ringR = 0.12;
    } else if (a.stand === 'steel') {
      const chrome = s.material('#dfe3e6', { metalness: 0.45, roughness: 0.22 });
      s.cylinder(0.24, 0.26, 0.035, [0, 0.0175, 0], s.material('#2a2a2e', { roughness: 0.5 }), 28);
      s.cylinder(0.019, 0.019, H, [0, H / 2, 0], chrome, 12);
      s.ball([0.03, 0.03, 0.03], [0, H + 0.01, 0], chrome, 12);
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2 + 0.2, y = i % 2 ? 1.74 : 1.5, c = Math.cos(t), sn = Math.sin(t);
        s.rod([0, y - 0.07, 0], [c * 0.2, y + 0.03, sn * 0.2], 0.009, chrome);
        s.ball([0.018, 0.018, 0.018], [c * 0.2, y + 0.03, sn * 0.2], s.material('#1c1c20'), 8);
        hooks.push({ p: [c * 0.16, y, sn * 0.16], yaw: t });
      }
      const ring = s.ring(0.15, 0.008, [0, 0.66, 0], chrome); ring.rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) { const t = i * 2.094; s.rod([0, 0.66, 0], [Math.cos(t) * 0.15, 0.66, Math.sin(t) * 0.15], 0.006, chrome); }
      ringR = 0.11; ringY = 0.66;
    } else {
      const chrome = s.material('#d5dadd', { metalness: 0.45, roughness: 0.25 });
      const W = 1.3, top = 1.68;
      for (const x of [-W / 2, W / 2]) {
        s.rod([x, 0.1, 0], [x, top, 0], 0.016, chrome);
        s.rod([x, 0.1, -0.26], [x, 0.1, 0.26], 0.016, chrome);
        for (const z of [-0.26, 0.26]) { const wheel = s.cylinder(0.045, 0.045, 0.028, [x, 0.045, z], s.material('#1c1c20'), 12); wheel.rotation.z = Math.PI / 2; }
      }
      s.rod([-W / 2 - 0.05, top, 0], [W / 2 + 0.05, top, 0], 0.014, chrome);
      s.rod([-W / 2, 0.1, 0], [W / 2, 0.1, 0], 0.012, chrome);
      for (const z of [-0.12, 0.12]) s.rod([-W / 2, top + 0.14, z], [W / 2, top + 0.14, z], 0.008, chrome);
      for (const x of [-W / 2, W / 2]) { s.rod([x, top, 0], [x, top + 0.14, -0.12], 0.008, chrome); s.rod([x, top, 0], [x, top + 0.14, 0.12], 0.008, chrome); }
      const slotsN = 13;
      for (let i = 0; i < slotsN; i++) hooks.push({ p: [-W / 2 + 0.09 + (i * (W - 0.18)) / (slotsN - 1), top - 0.1, 0], yaw: Math.PI / 2 * (i % 2 ? 1 : 1) });
      hatAt = [rnd(-0.3, 0.3), top + 0.15, 0];
      umbrellaCentre = [W / 2 + 0.24, 0, 0.05]; ringR = 0.09; ringY = 0.5;
      // A bucket stands in for the umbrella ring.
      if (a.umbrellas !== 'none') s.lathe([[0.001, 0], [0.11, 0], [0.14, 0.34], [0.145, 0.34], [0.12, 0.012], [0.001, 0.012]], s.material(pick(['#5a6a72', '#2a2a2e', '#8a2a22']), { roughness: 0.4, side: THREE.DoubleSide }), umbrellaCentre);
    }

    // ---- coats ----
    const rail = a.stand === 'rail';
    const order = hooks.map((_h, i) => i);
    if (!rail) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    // The one that matters hangs where it will be seen: toward the viewer.
    const frontHook = rail ? Math.floor(hooks.length / 2) : hooks.reduce((best, h, i) => (h.p[2] > hooks[best].p[2] ? i : best), 0);
    const special = a.standout === 'nothing' ? -1 : frontHook;
    const used: number[] = [];
    if (special >= 0 && a.standout !== 'child') used.push(special);
    for (const i of order) { if (used.length >= count) break; if (!used.includes(i)) used.push(i); }
    if (rail) used.sort((x, y) => x - y);
    used.forEach((hi, n) => {
      const hook = hooks[hi];
      const isSpecial = hi === special && a.standout !== 'child';
      const layer = !rail && n >= 8 ? 0.06 : 0;
      let g: THREE.Group;
      if (isSpecial && a.standout === 'bright') g = coat({ length: rnd(0.95, 1.1), colour: new THREE.Color(pick(['#d8202a', '#f0c21e', '#1f6fd0', '#e8641f'])), hanger: rail });
      else if (isSpecial && a.standout === 'uniform') g = coat({ length: 0.78, colour: new THREE.Color(pick(['#3f4a2f', '#1f2a4a', '#5a1f22'])), uniform: true, hanger: rail });
      else if (isSpecial && a.standout === 'fur') g = coat({ length: 1.05, colour: new THREE.Color(pick(['#6a4a2e', '#8a6a42', '#3a2a1e'])), fur: true, hanger: rail });
      else g = coat({ length: rnd(0.78, 1.18), colour: coatColour(), hanger: rail });
      const out = rail ? 0 : 0.035 + layer;
      g.position.set(hook.p[0] + Math.sin(hook.yaw + Math.PI / 2) * 0 + Math.cos(hook.yaw) * out, hook.p[1] - (rail ? 0 : rnd(0, 0.05)), hook.p[2] + Math.sin(hook.yaw) * out);
      g.rotation.y = rail ? Math.PI / 2 + rnd(-0.12, 0.12) : -hook.yaw + Math.PI / 2 + rnd(-0.25, 0.25);
      g.rotation.z = rnd(-0.04, 0.04);
      swayers.push(g);
    });
    if (a.standout === 'child') {
      const jacket = coat({ length: 0.42, width: 0.66, colour: new THREE.Color(pick(['#e8342e', '#f0c21e', '#2f8fd0', '#e96aa0'])), hood: true });
      const low = rail ? 1.02 : 1.08;
      if (rail) { jacket.position.set(-0.75, low, 0.06); s.rod([-0.65, low + 0.02, 0], [-0.78, low + 0.02, 0.05], 0.007, s.material('#d5dadd', { metalness: 0.4 })); }
      else { jacket.position.set(0.02, low, 0.12); s.rod([0, low + 0.03, 0], [0.02, low + 0.03, 0.1], 0.008, s.material('#3a2418')); }
      jacket.rotation.y = rnd(-0.2, 0.2);
      swayers.push(jacket);
      const boot = s.material(pick(['#d8202a', '#f0c21e', '#2f8a4a']), { roughness: 0.3 });
      const bx = rail ? -0.75 : 0.12, bz = rail ? 0.3 : 0.44;
      for (const side of [-1, 1]) { s.cylinder(0.034, 0.03, 0.15, [bx + side * 0.05, 0.085, bz], boot, 10); const toe = s.ball([0.034, 0.026, 0.055], [bx + side * 0.05, 0.026, bz + 0.03], boot, 10); toe.rotation.y = side * 0.2; }
    }

    // ---- scarf ----
    if (a.scarf !== 'none') {
      const stripes = { club: [pick(['#c8202a', '#1f4fa8', '#1f7a3a', '#111114']), '#f4f1e8'], tartan: ['#8a1f22', '#1f3a2a', '#27365a', '#d9b24a'], rainbow: ['#d8202a', '#e8841f', '#f0c21e', '#2f8a4a', '#1f6fd0', '#6a3a9a', '#e96aa0'], white: ['#f6f3ea', '#ece8dc'] }[a.scarf];
      const hook = hooks[rail ? Math.min(hooks.length - 1, Math.floor(hooks.length / 2) + 2) : (frontHook + 1) % hooks.length];
      const g = new THREE.Group();
      const lens = a.scarf === 'rainbow' ? [1.35, 1.1] : [rnd(0.6, 0.8), rnd(0.4, 0.6)];
      const seg = 0.075;
      lens.forEach((len, k) => {
        const n = Math.round(len / seg);
        for (let i = 0; i < n; i++) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(a.scarf === 'white' ? 0.1 : 0.13, seg + 0.002, 0.018), s.material(stripes[(i + k) % stripes.length], { roughness: 0.9 }));
          m.position.set((k - 0.5) * 0.12 + Math.sin(i * 0.5 + k) * 0.008, -0.04 - i * seg, 0.02 + i * 0.002);
          m.castShadow = true; g.add(m);
        }
      });
      const over = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.05), s.material(stripes[0], { roughness: 0.9 })); over.position.y = -0.01; g.add(over);
      const out = rail ? 0.13 : 0.2;
      g.position.set(hook.p[0] + (rail ? 0 : Math.cos(hook.yaw) * out), hook.p[1] + 0.02, hook.p[2] + (rail ? out : Math.sin(hook.yaw) * out));
      g.rotation.y = rail ? 0 : -hook.yaw + Math.PI / 2;
      s.root.add(g); swayers.push(g);
    }

    // ---- hat ----
    const [hx, hy, hz] = hatAt;
    const cap = a.standout === 'uniform';
    if (cap) {
      const cloth = s.material('#3f4a2f');
      s.cylinder(0.125, 0.1, 0.05, [hx, hy + 0.075, hz], cloth, 20);
      s.cylinder(0.1, 0.095, 0.05, [hx, hy + 0.03, hz], s.material('#8a1f22'), 20);
      const peak = s.cylinder(0.1, 0.1, 0.008, [hx, hy + 0.012, hz + 0.07], s.material('#111114', { roughness: 0.2 }), 20); peak.scale.z = 0.8; peak.rotation.x = 0.25;
      s.ball([0.02, 0.022, 0.01], [hx, hy + 0.05, hz + 0.098], s.material('#d9b24a', { metalness: 0.6 }), 8);
    } else if (a.hat === 'trilby') {
      const felt = s.material(pick(['#6b6a68', '#4a3a2a', '#2a2a2e']));
      const h = s.lathe([[0.001, 0.11], [0.06, 0.115], [0.085, 0.09], [0.09, 0.03], [0.093, 0.022], [0.15, 0.012], [0.155, 0.02], [0.15, 0.004], [0.001, 0.004]], felt, [hx, hy, hz]); h.scale.z = 1.12; h.rotation.z = rnd(-0.15, 0.15);
      const band = s.cylinder(0.094, 0.094, 0.025, [hx, hy + 0.036, hz], s.material('#1c1c20'), 20); band.scale.z = 1.12;
    } else if (a.hat === 'cap') {
      const tweed = s.material(pick(['#6b6a4c', '#4a4e58', '#7a5a3c']));
      const h = s.ball([0.13, 0.045, 0.15], [hx, hy + 0.035, hz], tweed, 16); h.rotation.x = 0.12;
      const peak = s.cylinder(0.09, 0.09, 0.012, [hx, hy + 0.012, hz + 0.1], tweed, 16); peak.scale.z = 0.7;
    } else if (a.hat === 'bowler') {
      const felt = s.material('#17161a', { roughness: 0.5 });
      s.lathe([[0.001, 0.125], [0.05, 0.12], [0.085, 0.09], [0.095, 0.03], [0.098, 0.02], [0.13, 0.012], [0.14, 0.03], [0.135, 0.006], [0.001, 0.006]], felt, [hx, hy, hz]);
    } else if (a.hat === 'brim') {
      const felt = s.material('#17161a', { roughness: 0.7 });
      const h = s.lathe([[0.001, 0.1], [0.07, 0.1], [0.09, 0.08], [0.092, 0.02], [0.24, 0.0], [0.245, 0.008], [0.001, 0.008]], felt, [hx, hy, hz]); h.rotation.z = rnd(-0.2, 0.2); h.rotation.x = rnd(-0.1, 0.1);
      s.cylinder(0.094, 0.094, 0.03, [hx, hy + 0.035, hz], s.material(mood.cheer > 0.6 ? '#b3241f' : '#3a3a40'), 20);
    } else if (a.hat === 'bobble') {
      const wool = s.material(pick(['#c8202a', '#1f6fd0', '#e8841f', '#2f8a4a']), { roughness: 1 });
      s.ball([0.1, 0.11, 0.1], [hx, hy + 0.06, hz], wool, 14);
      s.cylinder(0.103, 0.103, 0.04, [hx, hy + 0.02, hz], s.material('#f4f1e8', { roughness: 1 }), 16);
      s.ball([0.04, 0.04, 0.04], [hx, hy + 0.19, hz], s.material('#f4f1e8', { roughness: 1 }), 8);
    }

    // ---- umbrellas ----
    const [ux, , uz] = umbrellaCentre;
    const brolly = (i: number, n: number, opts: { colour: string; big?: boolean; stripes?: string }) => {
      const t = (i / Math.max(n, 1)) * Math.PI * 2 + rnd(-0.3, 0.3);
      const len = opts.big ? 1.15 : rnd(0.78, 0.9), r = opts.big ? 0.06 : 0.036;
      const foot: V3 = [ux + Math.cos(t) * ringR * 0.4, a.stand === 'rail' ? 0.03 : 0.085, uz + Math.sin(t) * ringR * 0.4];
      const leanOut = (rail ? ringR / (ringY - foot[1]) : rnd(0.36, 0.5));
      const top: V3 = [foot[0] + Math.cos(t) * leanOut * len * 0.95, foot[1] + len, foot[2] + Math.sin(t) * leanOut * len * 0.95];
      const fabric = s.material(opts.colour, { roughness: a.wet ? 0.15 : 0.7 });
      const body = s.rod([foot[0] + (top[0] - foot[0]) * 0.08, foot[1] + len * 0.08, foot[2] + (top[2] - foot[2]) * 0.08], [foot[0] + (top[0] - foot[0]) * 0.8, foot[1] + len * 0.8, foot[2] + (top[2] - foot[2]) * 0.8], r * 0.35, fabric, r);
      if (opts.stripes) { const stripe = s.rod([foot[0] + (top[0] - foot[0]) * 0.08, foot[1] + len * 0.08, foot[2] + (top[2] - foot[2]) * 0.08], [foot[0] + (top[0] - foot[0]) * 0.8, foot[1] + len * 0.8, foot[2] + (top[2] - foot[2]) * 0.8], r * 0.36, s.material(opts.stripes, { roughness: 0.5 }), r * 1.02); (stripe.geometry as THREE.BufferGeometry).dispose(); stripe.geometry = new THREE.CylinderGeometry(r * 1.02, r * 0.36, (body.geometry as THREE.CylinderGeometry).parameters.height, 10, 1, false, 0, Math.PI / 5); for (let k = 1; k < 5; k++) { const more = stripe.clone(); more.rotateY(k * Math.PI * 2 / 5); s.root.add(more); } }
      s.rod(foot, top, 0.006, s.material('#2a2a2e'));
      const handle = s.material(pick(['#6a4424', '#1c1c20', '#8a5a34']), { roughness: 0.4 });
      const crook = s.ring(0.035, 0.011, [top[0], top[1], top[2]], handle, Math.PI); crook.rotation.y = -t + Math.PI / 2; crook.position.x += Math.cos(t) * 0.035; crook.position.z += Math.sin(t) * 0.035;
      const band = s.ring(r * 0.75, 0.004, [foot[0] + (top[0] - foot[0]) * 0.5, foot[1] + len * 0.5, foot[2] + (top[2] - foot[2]) * 0.5], s.material('#111114')); band.rotation.x = Math.PI / 2;
    };
    const nBlack = a.umbrellas === 'black' ? (single ? 1 : 3 + Math.round(mood.density * 2)) : a.umbrellas === 'golf' ? 2 : a.umbrellas === 'stick' ? 1 : 0;
    const totalU = nBlack + (a.umbrellas === 'golf' || a.umbrellas === 'stick' ? 1 : 0);
    for (let i = 0; i < nBlack; i++) brolly(i, totalU, { colour: random() < 0.8 ? '#17161a' : pick(['#27365a', '#4a2a30', '#2f4a3a']) });
    if (a.umbrellas === 'golf') brolly(nBlack, totalU, { colour: pick(['#f4f1e8', '#f0c21e']), big: true, stripes: pick(['#c8202a', '#1f6fd0', '#1f7a3a']) });
    if (a.umbrellas === 'stick') {
      const t = rnd(0, 6.28), foot: V3 = [ux + Math.cos(t) * 0.05, 0.085, uz + Math.sin(t) * 0.05], top: V3 = [ux + Math.cos(t) * 0.22, 0.95, uz + Math.sin(t) * 0.22];
      const cane = s.material('#6a4424', { roughness: 0.4 });
      s.rod(foot, top, 0.012, cane, 0.014);
      const crook = s.ring(0.05, 0.014, [top[0] + Math.cos(t) * 0.05, top[1], top[2] + Math.sin(t) * 0.05], cane, Math.PI); crook.rotation.y = -t + Math.PI / 2;
    }
    if (a.wet && a.umbrellas !== 'none') {
      const water = new THREE.MeshStandardMaterial({ color: '#56666e', transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.3, depthWrite: false });
      for (let i = 0; i < 4; i++) { const p = s.cylinder(1, 1, 0.004, [ux + rnd(-0.22, 0.22), 0.003, uz + rnd(-0.2, 0.25)], water, 18); p.scale.set(rnd(0.12, 0.3), 1, rnd(0.1, 0.22)); p.rotation.y = rnd(0, 3); p.castShadow = false; }
    }

    // ---- the one that slid off ----
    if (a.fallen) {
      const colour = coatColour();
      const mat = s.material(colour, { roughness: 0.9, flatShading: true });
      const fx = rail ? rnd(-0.3, 0.3) : rnd(-0.1, 0.1) + 0.42, fz = rail ? 0.4 : 0.36;
      const turn = rnd(0, 6.28);
      // A slumped body, a rucked collar and two sleeves thrown out at different angles.
      for (const [dx, dz, sx, sy, sz] of [[0, 0, 0.3, 0.06, 0.2], [0.12, 0.06, 0.2, 0.085, 0.15], [-0.14, -0.05, 0.17, 0.05, 0.19], [0.02, -0.13, 0.13, 0.1, 0.09]] as const) {
        const lumpMesh = s.mesh(new THREE.IcosahedronGeometry(1, 1), mat, [fx + dx * Math.cos(turn) - dz * Math.sin(turn), sy * 0.6, fz + dx * Math.sin(turn) + dz * Math.cos(turn)]);
        lumpMesh.scale.set(sx * rnd(0.85, 1.15), sy, sz * rnd(0.85, 1.15)); lumpMesh.rotation.y = turn + rnd(-0.5, 0.5);
      }
      for (const side of [-1, 1]) {
        const ang = turn + side * rnd(0.7, 1.5), elbow = rnd(0.2, 0.28), bend = ang + rnd(-1, 1);
        const p0: V3 = [fx + Math.cos(ang) * 0.12, 0.05, fz + Math.sin(ang) * 0.12];
        const p1: V3 = [fx + Math.cos(ang) * (0.12 + elbow), 0.045, fz + Math.sin(ang) * (0.12 + elbow)];
        const p2: V3 = [p1[0] + Math.cos(bend) * 0.2, 0.035, p1[2] + Math.sin(bend) * 0.2];
        const sleeve = s.tube([p0, p1, p2], 0.045, mat);
        sleeve.scale.y = 0.6;
      }
    }

    if (!rail && count > 8) s.root.rotation.z = rnd(0.015, 0.035) * (random() < 0.5 ? -1 : 1);
    const base = swayers.map((g) => g.rotation.z);
    return s.finish({
      update: (_dt, time) => { swayers.forEach((g, i) => { g.rotation.z = base[i] + Math.sin(time * 0.9 + i * 1.7) * 0.012 * mood.energy; }); },
    });
  },
});
