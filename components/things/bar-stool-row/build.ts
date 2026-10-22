import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];
type Kind = 'chrome' | 'wood' | 'backed' | 'taped';

export default defineThing({
  questions: {
    stools: choice('What kind of stools are they?', {
      chrome: 'Chrome pedestals with round cracked-vinyl seats, diner style.',
      wood: 'Turned wooden four-leg stools worn pale on the rungs.',
      backed: 'Chrome stools with low padded backrests, lounge style.',
      mismatched: 'No two alike: chrome, wood and backed stools collected over the decades.',
      taped: 'Cracked vinyl stools, one of them repaired with bands of silver duct tape.',
    }),
    count: choice('How many stools?', { three: 'Three.', four: 'Four.', five: 'Five squeezed in.' }),
    vinyl: choice('What colour are the padded seats?', {
      red: 'Oxblood red.', green: 'Bottle green.', black: 'Black gone grey at the edges.', mustard: 'Mustard yellow.', teal: 'Turquoise sparkle.',
    }),
    story: choice('What was left on the bar top in front of one stool?', {
      shot: 'A full shot and a beer poured for someone, beside a stool pulled out and empty.',
      tab: 'A cleared tab: a receipt on a tray, a pen and a few coins of tip.',
      phone: 'A phone lying face down beside a half-finished drink.',
      hat: 'A hat somebody forgot, set crown-down next to an empty glass.',
      ring: 'A wedding ring on a coaster beside a drained glass and car keys.',
      empties: 'A row of upturned empty shot glasses and squeezed lime wedges.',
      nothing: 'Nothing: wiped clean, the towel still on the bar.',
    }),
    disturbed: choice('How have the stools been left?', {
      line: 'In a tidy line, pushed in for the night.',
      pulled: 'One pulled well out and turned away, as if someone left in a hurry.',
      tipped: 'One knocked over and lying on the floor.',
      up: 'Turned upside down on the bar top for mopping.',
    }),
    front: choice('What is the bar front made of?', {
      panel: 'Dark stained wood panelling with moulded frames.',
      tufted: 'Buttoned padded leatherette with brass studs.',
      tin: 'Corrugated tin nailed over plywood.',
      tile: 'Small glazed tiles, a few missing.',
    }),
    jacket: noul('Is a jacket left hanging over one of the stools?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = { three: 3, four: 4, five: 5 }[a.count];
    const pitch = 0.62, width = n * pitch + 0.3, topY = 1.08, barZ = -0.3;
    const vinylHex = { red: '#8e2424', green: '#245a3c', black: '#26262a', mustard: '#c9972a', teal: '#2a9c9c' }[a.vinyl];
    const wood = s.material('#5a3520', { roughness: 0.5 }), woodLight = s.material('#a8743f', { roughness: 0.6 });
    const brass = s.material('#c9a03c', { metalness: 0.85, roughness: 0.28 }), chrome = s.material('#d9dde0', { metalness: 0.9, roughness: 0.22 });
    const vinyl = s.material(vinylHex, { roughness: 0.4 }), dark = s.material('#1b1b1e');
    const tape = s.material('#aeb2b6', { metalness: 0.4, roughness: 0.5 });

    // Bar front, top with padded arm rail, kick plate and brass foot rail.
    s.box([width, topY - 0.06, 0.5], [0, (topY - 0.06) / 2, barZ], a.front === 'tufted' ? vinyl : a.front === 'tin' ? s.material('#9aa3a6', { metalness: 0.6, roughness: 0.5 }) : a.front === 'tile' ? s.material('#d9d2bd', { roughness: 0.3 }) : wood);
    const fz = barZ + 0.25;
    if (a.front === 'panel') for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * pitch;
      s.box([pitch - 0.1, 0.62, 0.02], [x, 0.56, fz], s.material('#6d4128', { roughness: 0.5 }));
      s.box([pitch - 0.2, 0.5, 0.025], [x, 0.56, fz + 0.005], wood);
    } else if (a.front === 'tufted') {
      const studs: { at: P3; size: number }[] = [];
      for (let x = -width / 2 + 0.12; x < width / 2 - 0.05; x += 0.2) for (let y = 0.3; y < 0.95; y += 0.2) studs.push({ at: [x + (Math.round(y * 5) % 2) * 0.1, y, fz + 0.004], size: 1 });
      s.scatter(new THREE.SphereGeometry(0.014, 8, 6), brass, studs);
    } else if (a.front === 'tin') {
      for (let x = -width / 2 + 0.03; x < width / 2; x += 0.06) s.cylinder(0.016, 0.016, topY - 0.3, [x, (topY - 0.3) / 2 + 0.2, fz], s.material('#b4bcbf', { metalness: 0.6, roughness: 0.45 }), 8);
    } else {
      const tiles: { at: P3; size: number; color: string }[] = [];
      for (let x = -width / 2 + 0.05; x < width / 2 - 0.02; x += 0.1) for (let y = 0.25; y < 0.98; y += 0.1) if (random() > mood.wear * 0.2) tiles.push({ at: [x, y, fz], size: 1, color: random() < 0.3 ? '#2f6f78' : random() < 0.5 ? '#e9e2cc' : '#c8553a' });
      s.scatter(new THREE.BoxGeometry(0.09, 0.09, 0.012), new THREE.MeshStandardMaterial({ roughness: 0.25 }), tiles);
    }
    s.box([width, 0.16, 0.52], [0, 0.08, barZ], dark);
    s.box([width + 0.06, 0.06, 0.7], [0, topY - 0.03, barZ + 0.04], woodLight);
    s.cylinder(0.045, 0.045, width + 0.06, [0, topY - 0.02, barZ + 0.39], wood, 12).rotation.z = Math.PI / 2;
    s.cylinder(0.026, 0.026, width + 0.04, [0, 0.2, fz + 0.14], brass, 14).rotation.z = Math.PI / 2;
    for (let i = 0; i <= n; i++) {
      const x = (i - n / 2) * pitch * 0.98;
      s.rod([x, 0.2, fz + 0.14], [x, 0.24, fz], 0.014, brass); s.rod([x, 0.2, fz + 0.14], [x, 0, fz + 0.16], 0.014, brass);
      s.ball([0.036, 0.036, 0.036], [x, 0.2, fz + 0.14], brass, 10);
    }

    // Stools.
    const stool = (kind: Kind) => {
      const g = new Sculpture(context);
      if (kind === 'wood') {
        g.cylinder(0.17, 0.165, 0.045, [0, 0.74, 0], woodLight, 20);
        for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          g.rod([x * 0.2, 0, z * 0.2], [x * 0.1, 0.72, z * 0.1], 0.022, woodLight, 0.017);
          g.ball([0.028, 0.02, 0.028], [x * 0.166, 0.25, z * 0.166], woodLight, 8);
        }
        for (const y of [0.25, 0.45]) { const r = 0.2 - y * 0.139; g.rod([-r, y, r], [r, y, r], 0.012, woodLight); g.rod([-r, y, -r], [r, y, -r], 0.012, woodLight); g.rod([r, y + 0.04, -r], [r, y + 0.04, r], 0.012, woodLight); g.rod([-r, y + 0.04, -r], [-r, y + 0.04, r], 0.012, woodLight); }
      } else {
        g.lathe([[0.21, 0], [0.2, 0.025], [0.06, 0.05], [0.032, 0.08], [0.03, 0.66], [0.1, 0.69]], chrome);
        g.ring(0.16, 0.012, [0, 0.27, 0], chrome).rotation.x = Math.PI / 2;
        for (let i = 0; i < 3; i++) g.rod([0, 0.27, 0], [Math.cos(i * 2.1) * 0.16, 0.27, Math.sin(i * 2.1) * 0.16], 0.008, chrome);
        g.cylinder(0.185, 0.19, 0.03, [0, 0.705, 0], chrome, 24);
        g.lathe([[0, 0.8], [0.12, 0.795], [0.175, 0.77], [0.185, 0.72], [0, 0.72]], vinyl);
        const cracks = Math.round(mood.wear * 4 + (kind === 'taped' ? 1 : 0));
        for (let i = 0; i < cracks; i++) g.box([0.006, 0.004, 0.04 + random() * 0.06], [(random() - 0.5) * 0.2, 0.794, (random() - 0.5) * 0.14], s.material('#d8cfae')).rotation.y = random() * 3;
        if (kind === 'taped') { for (const o of [-0.05, 0.03, 0.09]) g.box([0.38, 0.012, 0.05], [0, 0.8, o], tape).rotation.y = 0.5 + o * 2; g.cylinder(0.036, 0.036, 0.12, [0, 0.45, 0], tape, 10); }
        if (kind === 'backed') {
          for (const x of [-0.12, 0.12]) g.rod([x, 0.72, 0.15], [x, 1.02, 0.2], 0.011, chrome);
          const back = g.mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.16, 16, 1, false, -0.8, 1.6), vinyl, [0, 1.03, 0]); back.scale.z = 1;
          (back.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
      return g.root;
    };
    const kinds: Kind[] = Array.from({ length: n }, (_u, i) =>
      a.stools === 'mismatched' ? (['chrome', 'wood', 'backed', 'taped'] as const)[(i + Math.floor(context.seed % 4)) % 4] : a.stools === 'taped' ? 'chrome' : a.stools);
    const special = Math.floor(random() * n);
    if (a.stools === 'taped') kinds[special] = 'taped';
    const storyAt = a.story === 'shot' || a.disturbed === 'pulled' ? special : Math.floor(random() * n);
    const seatTop: P3[] = [];
    kinds.forEach((kind, i) => {
      const g = stool(kind), x = (i - (n - 1) / 2) * pitch + (random() - 0.5) * 0.08;
      let z = 0.42 + (random() - 0.5) * 0.1;
      g.rotation.y = (random() - 0.5) * (kind === 'wood' ? 1.5 : 0.7);
      if (i === special && a.disturbed === 'pulled') { z += 0.38; g.rotation.y = 2 + random() * 2; }
      else if (i === storyAt && a.story === 'shot') z += 0.16;
      if (i === special && a.disturbed === 'tipped') { g.rotation.set(0, random() * 0.8 - 0.4, 0); g.rotation.x = Math.PI / 2; g.position.set(x, 0.19, z + 0.05); }
      else if (a.disturbed === 'up') { g.rotation.x = Math.PI; g.position.set(x, topY + 0.8, barZ + 0.02); }
      else { g.position.set(x, 0, z); seatTop.push([x, 0.8, z]); }
      s.root.add(g);
    });
    if (a.jacket && seatTop.length) {
      const [x, y, z] = seatTop[Math.floor(random() * seatTop.length)];
      const cloth = s.material(['#3d4a5c', '#6b4a2a', '#2c2c2e', '#5d6b3a'][Math.floor(random() * 4)], { roughness: 0.95 });
      s.cylinder(0.2, 0.2, 0.035, [x, y + 0.012, z], cloth, 16);
      s.box([0.32, 0.36, 0.03], [x, y - 0.16, z + 0.2], cloth).rotation.x = -0.1;
      s.box([0.3, 0.14, 0.03], [x, y - 0.05, z - 0.2], cloth).rotation.x = 0.1;
      for (const o of [-1, 1]) s.box([0.07, 0.4, 0.06], [x + o * 0.19, y - 0.2, z + 0.12], cloth).rotation.z = o * 0.2;
    }

    // The bar top: the story, and clutter that follows density.
    const y = topY, sx = (storyAt - (n - 1) / 2) * pitch, bz = barZ + 0.12;
    const glassMat = new THREE.MeshStandardMaterial({ color: '#eef6f4', transparent: true, opacity: 0.38, roughness: 0.05 });
    const beer = s.material('#d8962a', { roughness: 0.25 }), whiskey = s.material('#a8571c', { roughness: 0.2, emissive: '#a8571c', emissiveIntensity: 0.15 });
    const pint = (x: number, z: number, fill: number) => { s.cylinder(0.042, 0.032, 0.15, [x, y + 0.075, z], glassMat, 14); if (fill > 0.03) { s.cylinder(0.03 + fill * 0.009, 0.029, 0.14 * fill, [x, y + 0.008 + 0.07 * fill, z], beer, 14); s.cylinder(0.031 + fill * 0.009, 0.031 + fill * 0.009, 0.012, [x, y + 0.014 + 0.14 * fill, z], s.material('#f6efdc'), 14); } };
    const shot = (x: number, z: number, full: boolean, flip = false) => { s.cylinder(flip ? 0.02 : 0.027, flip ? 0.027 : 0.02, 0.065, [x, y + 0.0325, z], glassMat, 10); if (full) s.cylinder(0.023, 0.019, 0.045, [x, y + 0.03, z], whiskey, 10); };
    const coaster = (x: number, z: number) => s.cylinder(0.05, 0.05, 0.004, [x, y + 0.002, z], s.material('#e6dcc0'), 16);
    const coins = (x: number, z: number, k: number) => { for (let i = 0; i < k; i++) s.cylinder(0.014, 0.014, 0.004, [x + (random() - 0.5) * 0.09, y + 0.002, z + (random() - 0.5) * 0.07], chrome, 10); };
    if (a.story === 'shot') { coaster(sx - 0.08, bz); shot(sx - 0.08, bz, true); coaster(sx + 0.07, bz - 0.03); pint(sx + 0.07, bz - 0.03, 1); }
    else if (a.story === 'tab') {
      s.box([0.2, 0.012, 0.13], [sx, y + 0.006, bz], dark);
      const slip = s.label('TAB  $' + (14 + Math.floor(random() * 60)) + '.50', 0.16, 0.08, [sx - 0.01, y + 0.014, bz], '#333', '#fbf8ee'); slip.rotation.x = -Math.PI / 2; slip.rotation.z = (random() - 0.5) * 0.5;
      s.rod([sx + 0.12, y + 0.008, bz - 0.05], [sx + 0.16, y + 0.008, bz + 0.08], 0.006, s.material('#1c3fa0')); coins(sx - 0.14, bz + 0.02, 3 + Math.floor(random() * 4));
    } else if (a.story === 'phone') {
      const ph = s.box([0.078, 0.01, 0.155], [sx - 0.06, y + 0.005, bz], dark); ph.rotation.y = (random() - 0.5) * 1.2;
      s.box([0.085, 0.004, 0.16], [sx - 0.06, y + 0.002, bz], new THREE.MeshStandardMaterial({ color: '#bfe0ff', emissive: '#8fc8ff', emissiveIntensity: mix(0.2, 1.4, mood.energy) })).rotation.y = ph.rotation.y;
      coaster(sx + 0.1, bz - 0.02); pint(sx + 0.1, bz - 0.02, 0.45);
    } else if (a.story === 'hat') {
      const felt = s.material(random() < 0.5 ? '#6b5a44' : '#33363d', { roughness: 0.95 });
      s.lathe([[0.001, 0.0], [0.075, 0.0], [0.09, 0.09], [0.155, 0.1], [0.16, 0.112], [0.085, 0.1], [0.07, 0.012], [0.001, 0.012]], felt, [sx - 0.05, y, bz - 0.02]);
      s.cylinder(0.092, 0.084, 0.02, [sx - 0.05, y + 0.075, bz - 0.02], dark, 20);
      pint(sx + 0.17, bz, 0);
    } else if (a.story === 'ring') {
      coaster(sx, bz); s.ring(0.014, 0.004, [sx, y + 0.009, bz], new THREE.MeshStandardMaterial({ color: '#f2c84a', metalness: 0.9, roughness: 0.2, emissive: '#f2c84a', emissiveIntensity: 0.35 })).rotation.x = Math.PI / 2;
      s.ring(0.02, 0.003, [sx + 0.15, y + 0.004, bz + 0.03], chrome).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) s.box([0.012, 0.004, 0.05], [sx + 0.17 + i * 0.012, y + 0.003, bz + 0.065], brass).rotation.y = (i - 1) * 0.5;
      pint(sx - 0.14, bz - 0.04, 0);
    } else if (a.story === 'empties') {
      const k = 4 + Math.floor(random() * 4);
      for (let i = 0; i < k; i++) shot(sx - 0.16 + i * 0.062, bz + (random() - 0.5) * 0.02, false, true);
      for (let i = 0; i < 3; i++) s.ball([0.022, 0.012, 0.014], [sx - 0.1 + random() * 0.25, y + 0.01, bz + 0.1], s.material('#9bc23a'), 8).rotation.y = random() * 3;
    } else {
      s.box([0.24, 0.02, 0.14], [sx, y + 0.01, bz], s.material('#e9e6dc', { roughness: 1 })).rotation.y = (random() - 0.5) * 0.8;
      s.box([0.24, 0.022, 0.02], [sx, y + 0.01, bz], s.material('#b03a2e', { roughness: 1 }));
    }
    if (a.disturbed !== 'up') {
      const extras = Math.round(mix(0, n * 1.6, mood.density));
      for (let i = 0; i < extras; i++) {
        let x = (random() - 0.5) * (width - 0.2); if (Math.abs(x - sx) < 0.3) x += x < sx ? -0.3 : 0.3;
        if (Math.abs(x) > width / 2 - 0.08) continue;
        const z = barZ - 0.12 + random() * 0.3, kind = random();
        if (kind < 0.4) { coaster(x, z); pint(x, z, random() < 0.4 ? 0 : random()); }
        else if (kind < 0.65) { const c = s.material(random() < 0.5 ? '#5a3a14' : '#2f6b3a', { roughness: 0.2 }); s.cylinder(0.03, 0.03, 0.14, [x, y + 0.07, z], c, 12); s.cylinder(0.012, 0.028, 0.09, [x, y + 0.185, z], c, 12); }
        else if (kind < 0.8) { s.cylinder(0.06, 0.04, 0.035, [x, y + 0.0175, z], s.material('#7a5a34'), 14); s.cylinder(0.055, 0.055, 0.012, [x, y + 0.036, z], s.material('#d9b36a', { roughness: 1 }), 14); }
        else { s.box([0.1, 0.12, 0.07], [x, y + 0.06, z], chrome); s.box([0.085, 0.02, 0.05], [x, y + 0.125, z], s.material('#f4f1e6')); }
      }
    }
    if (mood.wear > 0.5) for (let i = 0; i < 4; i++) s.cylinder(0.04, 0.04, 0.002, [(random() - 0.5) * (width - 0.3), y + 0.001, barZ + (random() - 0.5) * 0.4], s.material('#8f6535', { roughness: 0.3 }), 16);
    return s.finish();
  },
});
