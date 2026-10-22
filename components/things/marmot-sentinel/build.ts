import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
type Dot = { at: P3; size: number; color?: string };

function rockGeometry(seed: number, detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = 1 + 0.16 * Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed * 1.3) + 0.1 * Math.sin(z * 5 + seed * 2.1);
    p.setXYZ(i, x * r, y * r, z * r);
  }
  g.computeVertexNormals();
  return g;
}

export default defineThing({
  questions: {
    doing: choice('What is the marmot doing right now?', {
      whistling: 'Bolt upright, head thrown back, mouth wide open in an alarm whistle.',
      watching: 'Upright and silent, paws folded on its chest, staring you down.',
      basking: 'Flattened like a pancake on the warm rock, half asleep.',
      peeking: 'Only head and shoulders out of the burrow, ready to drop.',
      eating: 'Sitting up holding a flower to its mouth in both paws.',
    }),
    fat: score('How fat is it?', ['Lean after the winter', 'Comfortable', 'An autumn butterball that can barely bend']),
    coat: choice('What colour is its fur?', {
      grizzled: 'Grizzled grey-brown with an ochre belly.',
      golden: 'Warm golden ochre all over.',
      dark: 'Dark chocolate with a nearly black head.',
      pale: 'Sun-bleached pale blond.',
    }),
    perch: choice('What is its lookout?', {
      granite: 'A rounded granite boulder patched with lichen.',
      slabs: 'A stack of flat tilted slabs.',
      hummock: 'A grassy hummock tufted with flowers.',
      waymark: 'A boulder painted with a red-and-white hiking trail blaze.',
    }),
    burrow: choice('What does the burrow look like?', {
      mound: 'A dark hole in a fresh fan of thrown-out earth.',
      under: 'A worn hole dug in under the boulder itself.',
      colony: 'Several holes and mounds: a whole colony lives here.',
    }),
    around: choice('What else is there?', {
      bare: 'Nothing else.',
      pups: 'Young ones peering out behind it.',
      snack: 'A dropped apple core and a crumpled wrapper from a hiker.',
      flowers: 'Blue gentians and white edelweiss.',
      bones: 'A scatter of small bleached bones and an eagle feather.',
    }),
    sound: noul('If it is whistling, should the whistle be drawn as comic sound lines?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const into = <T extends THREE.Object3D>(g: THREE.Object3D, m: T) => { g.add(m); return m; };
    const furCol = { grizzled: '#7d6a55', golden: '#b98a45', dark: '#4a3528', pale: '#c9b48c' }[a.coat];
    const fur = s.material(furCol, { roughness: 1 });
    const belly = s.material({ grizzled: '#c79a55', golden: '#d9b068', dark: '#7a5a3c', pale: '#e6d6b2' }[a.coat], { roughness: 1 });
    const cap = s.material(new THREE.Color(furCol).multiplyScalar(0.55), { roughness: 1 });
    const black = s.material('#12100f', { roughness: 0.3 });
    const tooth = s.material('#e88a1e', { roughness: 0.4 });
    const mouthIn = s.material('#7a1f26', { roughness: 0.6 });
    const stone = s.material('#9c9a94', { roughness: 0.95, flatShading: true });
    const stoneDark = s.material('#74757a', { roughness: 0.95, flatShading: true });
    const earth = s.material('#6b4f38', { roughness: 1 });
    const grass = s.material('#6c9a43', { roughness: 1 });
    const heads: { node: THREE.Object3D; base: number; amp: number; rate: number }[] = [];
    const bobbers: THREE.Object3D[] = [];

    const marmot = (g: THREE.Group, pose: typeof a.doing, f: number) => {
      const flat = pose === 'basking', peek = pose === 'peeking';
      const head = new THREE.Group();
      if (flat) {
        into(g, s.ball([0.2 * f, 0.085, 0.3], [0, 0.07, 0], fur, 16));
        for (const x of [-1, 1]) for (const z of [-1, 1]) { into(g, s.rod([x * 0.12, 0.05, z * 0.18], [x * 0.27 * f, 0.02, z * 0.26], 0.035, fur, 0.025)); into(g, s.ball([0.035, 0.015, 0.04], [x * 0.28 * f, 0.015, z * 0.28], black, 6)); }
        into(g, s.tube([[0, 0.05, -0.28], [0.03, 0.03, -0.42], [0.1, 0.025, -0.52]], 0.035, cap));
        head.position.set(0, 0.075, 0.32); head.rotation.x = 0.15;
      } else {
        const cut = peek ? 0.3 : 0;
        const profile: [number, number][] = ([[0.001, 0], [0.15 * f, 0.01], [0.2 * f, 0.12], [0.19 * f, 0.25], [0.14 * f, 0.38], [0.105, 0.47], [0.085, 0.53]] as [number, number][]).filter(([, y]) => y >= cut).map(([r, y]) => [r, y - cut]);
        into(g, s.lathe(profile, fur));
        if (!peek) {
          into(g, s.ball([0.15 * f, 0.17, 0.08], [0, 0.2, 0.125 * f], belly, 12));
          for (const x of [-1, 1]) { into(g, s.ball([0.09, 0.1, 0.13], [x * 0.14 * f, 0.08, 0.03], fur, 10)); into(g, s.ball([0.04, 0.02, 0.075], [x * 0.13 * f, 0.02, 0.18 * f], black, 8)); }
          into(g, s.tube([[0, 0.05, -0.15 * f], [0.04, 0.03, -0.27], [0.12, 0.03, -0.36]], 0.04, cap));
        } else into(g, s.ball([0.12, 0.1, 0.06], [0, 0.1, 0.09], belly, 10));
        const hold: P3 = pose === 'eating' ? [0.03, 0.47 - cut, 0.15] : peek ? [0.09, 0.02, 0.17] : [0.05, 0.31, 0.15 * f + 0.02];
        for (const x of [-1, 1]) {
          into(g, s.rod([x * 0.11, 0.41 - cut, 0.04], [x * hold[0], hold[1], hold[2]], 0.04, fur, 0.028));
          into(g, s.ball([0.028, 0.022, 0.03], [x * hold[0], hold[1], hold[2] + 0.01], black, 6));
        }
        if (pose === 'eating') {
          into(g, s.rod([0, 0.3, 0.2], [0, 0.52, 0.17], 0.006, grass));
          into(g, s.ball([0.04, 0.04, 0.02], [0, 0.53, 0.17], s.material('#f4d13a', { roughness: 0.7 }), 8));
        }
        head.position.set(0, 0.57 - cut, 0.02);
        head.rotation.x = pose === 'whistling' ? -0.5 : pose === 'eating' ? 0.25 : 0;
      }
      into(g, head);
      const H = (m: THREE.Mesh) => into(head, m);
      H(s.ball([0.09, 0.08, 0.1], [0, 0, 0], fur, 14));
      H(s.ball([0.075, 0.035, 0.08], [0, 0.055, -0.01], cap, 10));
      H(s.ball([0.055, 0.045, 0.06], [0, -0.012, 0.085], belly, 10));
      H(s.ball([0.022, 0.016, 0.015], [0, 0.005, 0.142], black, 8));
      for (const x of [-1, 1]) {
        H(s.ball([0.042, 0.04, 0.04], [x * 0.052, -0.03, 0.05], belly, 8));
        H(s.ball([0.017, 0.017, 0.012], [x * 0.072, 0.028, 0.055], black, 8));
        H(s.ball([0.024, 0.024, 0.012], [x * 0.078, 0.062, -0.03], cap, 8));
      }
      if (pose === 'whistling') {
        H(s.ball([0.034, 0.04, 0.03], [0, -0.058, 0.1], mouthIn, 8));
        H(s.ball([0.04, 0.02, 0.045], [0, -0.1, 0.075], belly, 8)).rotation.x = 0.5;
        for (const x of [-1, 1]) { H(s.box([0.012, 0.034, 0.008], [x * 0.008, -0.035, 0.128], tooth)); H(s.box([0.01, 0.024, 0.008], [x * 0.007, -0.085, 0.11], tooth)); }
      } else for (const x of [-1, 1]) H(s.box([0.011, 0.022, 0.006], [x * 0.007, -0.045, 0.135], tooth));
      heads.push({ node: head, base: (random() - 0.5) * (flat ? 0.3 : 0.9), amp: pose === 'whistling' ? 0.1 : 0.35, rate: 0.8 + random() });
      head.rotation.order = 'YXZ'; head.rotation.y = heads[heads.length - 1].base;
      if (pose === 'whistling') bobbers.push(g);
      return head;
    };

    // The lookout.
    const px = -0.2;
    let perchTop = 0.6;
    if (a.perch === 'slabs') {
      let y = 0;
      for (let i = 0; i < 3; i++) {
        const h = 0.16 + random() * 0.06;
        const m = s.mesh(rockGeometry(random() * 20), i % 2 ? stoneDark : stone, [px + (random() - 0.5) * 0.12, y + h, (random() - 0.5) * 0.1]);
        m.scale.set(0.5 - i * 0.06, h * 1.15, 0.42 - i * 0.05); m.rotation.set((random() - 0.5) * 0.12, random() * 6, (random() - 0.5) * 0.12); y += h * 1.75;
      }
      perchTop = y + 0.03;
    } else if (a.perch === 'hummock') {
      s.ball([0.55, 0.36, 0.5], [px, 0.04, 0], grass, 20);
      perchTop = 0.38;
      const tufts: Dot[] = [];
      for (let i = 0; i < 60; i++) { const ang = random() * 6.3, r = Math.sqrt(random()); const t = Math.sqrt(Math.max(0, 1 - r * r)); tufts.push({ at: [px + Math.cos(ang) * r * 0.53, 0.04 + t * 0.36 + 0.04, Math.sin(ang) * r * 0.48], size: 0.5 + random() * 0.7, color: random() < 0.25 ? ['#f4d13a', '#ffffff', '#d85aa0'][i % 3] : '#57863a' }); }
      s.scatter(new THREE.ConeGeometry(0.035, 0.16, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), tufts);
    } else {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#a3a19b'; c.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 260; i++) { const v = 120 + random() * 80; c.fillStyle = `rgba(${v},${v},${v - 6},0.5)`; c.fillRect(random() * 512, random() * 256, 2 + random() * 5, 2 + random() * 4); }
      for (let i = 0; i < 22; i++) { c.fillStyle = ['rgba(190,180,70,0.75)', 'rgba(215,215,200,0.7)', 'rgba(90,110,70,0.6)'][i % 3]; c.beginPath(); c.ellipse(random() * 512, random() * 256, 6 + random() * 16, 4 + random() * 10, random() * 3, 0, 7); c.fill(); }
      if (a.perch === 'waymark') { const x = 512 * 0.8, y = 256 * 0.37; c.fillStyle = '#f4f2ea'; c.fillRect(x - 36, y - 26, 72, 52); c.fillStyle = '#d3231f'; c.fillRect(x - 36, y - 9, 72, 18); }
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      const m = s.mesh(rockGeometry(random() * 20, 2), s.material('#ffffff', { map: tex, roughness: 0.95, flatShading: true }), [px, 0.2, 0]);
      m.scale.set(0.52, 0.36, 0.45);
      perchTop = 0.2 + 0.36 * 0.86;
    }

    // Burrows.
    const holes: P3[] = [];
    const mound = (x: number, z: number, size: number) => {
      s.ball([0.46 * size, 0.15 * size, 0.4 * size], [x, 0.01, z], earth, 14);
      s.ball([0.15 * size, 0.09 * size, 0.15 * size], [x - 0.04, 0.12 * size, z + 0.05], black, 12);
      const crumbs: Dot[] = [];
      for (let i = 0; i < 14; i++) { const ang = random() * 6.3, r = (0.3 + random() * 0.35) * size; crumbs.push({ at: [x + Math.cos(ang) * r, 0.02, z + Math.sin(ang) * r * 0.9], size: 0.02 + random() * 0.03 }); }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), earth, crumbs);
      holes.push([x - 0.04, 0.13 * size, z + 0.05]);
    };
    if (a.burrow === 'under') {
      s.ball([0.3, 0.05, 0.28], [px + 0.42, 0.01, 0.36], earth, 12);
      s.ball([0.16, 0.13, 0.12], [px + 0.33, 0.09, 0.3], black, 12);
      holes.push([px + 0.4, 0.05, 0.42]);
    } else {
      mound(0.6, 0.3, 0.85);
      if (a.burrow === 'colony') { mound(0.45, -0.5, 0.6); mound(-0.8, 0.45, 0.55); mound(-0.82, -0.35, 0.5); }
    }

    // The sentinel.
    const f = mix(0.82, 1.32, a.fat);
    const hero = new THREE.Group();
    s.root.add(hero);
    if (a.doing === 'peeking') { hero.position.set(...holes[0]); hero.position.y -= 0.05; }
    else hero.position.set(px, perchTop - 0.03, 0.02);
    hero.rotation.y = 0.25 + (random() - 0.5) * 0.4;
    const head = marmot(hero, a.doing, f);
    hero.scale.setScalar(1.3);
    if (a.doing === 'whistling' && a.sound) {
      const ink = new THREE.MeshBasicMaterial({ color: '#2b2d33', transparent: true, opacity: 0.85, depthWrite: false });
      for (let i = 0; i < 3; i++) {
        const arc = new THREE.Mesh(new THREE.TorusGeometry(0.09 + i * 0.05, 0.009, 6, 20, 1.3), ink);
        arc.rotation.z = -0.65; arc.position.x = 0.1 + i * 0.05;
        const holder = new THREE.Group();
        holder.position.y = -0.04; holder.rotation.set(0.7, -Math.PI / 2, 0, 'YXZ');
        holder.add(arc); head.add(holder);
      }
    }

    // Company and leavings.
    if (a.around === 'pups') {
      const n = 1 + Math.round(mood.density * 2);
      for (let i = 0; i < n; i++) {
        const pup = new THREE.Group();
        const at = i < holes.length && a.doing !== 'peeking' ? holes[i] : null;
        if (at) { pup.position.set(at[0], at[1] - 0.03, at[2]); marmot(pup, 'peeking', 0.9); }
        else { pup.position.set(px + 0.55 + i * 0.22, 0, -0.35 + i * 0.3); marmot(pup, 'watching', 0.9); }
        pup.scale.setScalar(0.7); pup.rotation.y = (random() - 0.5) * 1.2;
        s.root.add(pup);
      }
    } else if (a.around === 'snack') {
      s.ball([0.03, 0.045, 0.03], [0.2, 0.04, 0.62], s.material('#d8cf9a'), 8);
      for (const y of [0.075, 0.012]) s.ball([0.036, 0.016, 0.036], [0.2, y + 0.008, 0.62], s.material('#b5342a'), 8);
      const foil = s.mesh(new THREE.DodecahedronGeometry(0.07, 0), s.material(mood.cheer > 0.5 ? '#3a8fdd' : '#c9cdd0', { metalness: 0.7, roughness: 0.3, flatShading: true }), [-0.15, 0.03, 0.66]);
      foil.scale.set(1.5, 0.35, 0.8); foil.rotation.y = random() * 3;
    } else if (a.around === 'flowers') {
      const dots: Dot[] = [], stems: Dot[] = [];
      for (let i = 0; i < 10 + Math.round(mood.density * 26); i++) {
        const ang = random() * 6.3, r = 0.6 + random() * 0.35;
        const x = Math.cos(ang) * r * 1.1, z = Math.sin(ang) * r * 0.9, h = 0.06 + random() * 0.08;
        dots.push({ at: [x, h + 0.02, z], size: 0.028 + random() * 0.018, color: random() < 0.55 ? '#2c4fd6' : '#f3f1e6' });
        stems.push({ at: [x, h / 2, z], size: h / 0.16 });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), dots);
      s.scatter(new THREE.ConeGeometry(0.02, 0.16, 4), grass, stems);
    } else if (a.around === 'bones') {
      const bone = s.material('#ece6d6', { roughness: 0.8 });
      for (let i = 0; i < 6; i++) { const x = 0.0 + random() * 0.5, z = 0.55 + random() * 0.25, ang = random() * 3; s.rod([x, 0.015, z], [x + Math.cos(ang) * 0.14, 0.015, z + Math.sin(ang) * 0.14], 0.012, bone); }
      s.ball([0.045, 0.035, 0.055], [0.05, 0.035, 0.7], bone, 8);
      const feather = s.box([0.05, 0.004, 0.34], [-0.45, 0.03, 0.62], s.material('#3a2c22', { roughness: 0.9 })); feather.rotation.set(0.1, 0.8, 0.2);
      s.rod([-0.58, 0.02, 0.5], [-0.32, 0.045, 0.74], 0.005, bone);
    }
    // Short grass round the foot of everything.
    const blades: Dot[] = [];
    for (let i = 0; i < Math.round(mix(14, 60, mood.density)); i++) { const ang = random() * 6.3, r = 0.45 + random() * 0.45; blades.push({ at: [Math.cos(ang) * r * 1.15 + (a.burrow !== 'under' ? 0.1 : -0.1), 0.05, Math.sin(ang) * r * 0.9], size: 0.5 + random() * 0.7 }); }
    s.scatter(new THREE.ConeGeometry(0.025, 0.14, 4), grass, blades);

    const energy = mix(0.1, 1.5, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const h of heads) h.node.rotation.y = h.base + Math.sin(time * h.rate * energy) * h.amp * energy;
        for (const b of bobbers) b.scale.y = 1 + Math.max(0, Math.sin(time * 6 * energy)) * 0.05 * energy;
      },
    });
  },
});
