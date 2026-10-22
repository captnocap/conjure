import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { HEAD, at, brow, eye, mouth, nose, parts, skin } from './head';

export default defineThing({
  questions: {
    face: choice('Whose kind of face is it?', {
      judge: 'An old judge: heavy brows, jowls, a big nose and deep lines.',
      girl: 'A drowned girl: smooth, young, hair parted and swept back.',
      boxer: 'A boxer: broad jaw, flattened crooked nose, one swollen brow.',
      child: 'A child: small and round-cheeked.',
      unknown: 'An unknown man with a moustache and hollow cheeks.',
    }),
    expression: choice('What expression was caught?', {
      peace: 'Peace: everything let go.',
      surprise: 'Surprise: mouth open, brows lifted.',
      smile: 'A faint, private smile.',
      grimace: 'A grimace, teeth showing.',
    }),
    damage: choice('What condition is the plaster in?', {
      pristine: 'Pristine and chalk white.',
      cracked: 'Cracked clean across the face.',
      chipped: 'The tip of the nose chipped off.',
      wired: 'Broken once and repaired with wire and staples.',
    }),
    plate: choice('What does the inscription plate say?', {
      none: 'There is no plate.',
      unknown: 'UNKNOWN',
      year: '1887',
      sure: 'HE WAS SURE',
      case: 'CASE No. 12',
      mother: 'MOTHER',
    }),
    opened: noul('Do the eyes seem to have opened since it was cast?'),
    mount: choice('How is it displayed?', {
      plaque: 'On an oval plaque of dark wood, propped upright.',
      stand: 'On a black iron rod and foot, like a specimen.',
      frame: 'In a deep square shadow-box frame lined with cloth.',
      shelf: 'Leaning on a little shelf bracket with a candle stub beside it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const size = a.face === 'child' ? 0.78 : a.face === 'boxer' ? 1.06 : 1;
    const tilt = new THREE.Group();
    s.root.add(tilt);
    const g = new THREE.Group();
    g.scale.set(HEAD * size * (a.face === 'boxer' ? 1.1 : a.face === 'unknown' ? 0.94 : 1), HEAD * size, HEAD * size);
    tilt.add(g);
    const f = parts(g);

    const white = new THREE.Color('#f1eee6').lerp(new THREE.Color('#d6c9a4'), mood.wear * 0.55).lerp(new THREE.Color(mood.warmth > 0.5 ? '#f3e2c8' : '#dfe6ea'), Math.abs(mood.warmth - 0.5) * 0.4);
    const plaster = new THREE.MeshStandardMaterial({ color: white, roughness: 0.92, side: THREE.DoubleSide });
    const shade = new THREE.MeshStandardMaterial({ color: white.clone().multiplyScalar(0.74), roughness: 0.95 });
    const crackM = new THREE.MeshStandardMaterial({ color: '#3d3a35', roughness: 0.9 });
    const iron = s.material('#26262a', { metalness: 0.6, roughness: 0.5 });
    const wood = s.material('#4a2f20', { roughness: 0.6 });
    const brass = s.material('#b9973f', { metalness: 0.8, roughness: 0.35 });

    const expr = { peace: { jaw: 0, curve: 0.05, brow: 0.15 }, surprise: { jaw: 0.6, curve: -0.1, brow: 1.1 }, smile: { jaw: 0, curve: 1.1, brow: 0.3 }, grimace: { jaw: 0.28, curve: -1.2, brow: -1 } }[a.expression];
    const jaw = expr.jaw;
    f.add(new THREE.Mesh(skin({ jaw, keep: (d) => d.z > 0.2 && d.y < 0.86 }), plaster));
    // A raw plaster rim where the mould ended.
    const rim = Array.from({ length: 40 }, (_u, i) => {
      const ang = (i / 39) * Math.PI * 2 * 0.86 - Math.PI * 0.86 - Math.PI / 2 + Math.PI;
      const r = Math.sqrt(1 - 0.21 * 0.21);
      return new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, 0.21);
    });
    void rim;

    const chipped = a.damage === 'chipped';
    const noseSize = { judge: 1.3, girl: 0.82, boxer: 1.2, child: 0.7, unknown: 1 }[a.face] * (chipped ? 0.72 : 1);
    const noseHost = new THREE.Group();
    g.add(noseHost);
    nose(parts(noseHost), plaster, noseSize, jaw * 0.2);
    if (a.face === 'boxer') { noseHost.rotation.z = 0.22; noseHost.position.x = -0.04; noseHost.scale.z = 0.86; }
    if (chipped) {
      const tip = at(0, -0.17, 0);
      f.ball([0.09, 0.08, 0.03], [0.01, tip.y + 0.01, tip.z + 0.1 * noseSize + 0.045], shade).rotation.x = -0.3;
    }
    for (const side of [-1, 1] as const) {
      const ball = eye(f, { side, lid: a.opened ? 0.12 : 1, white: plaster, iris: plaster, pupil: a.opened ? crackM : plaster, lidMaterial: plaster, pupilSize: 0.2, look: [0, 0] });
      void ball;
      brow(f, side, plaster, expr.brow, { judge: 0.065, girl: 0.022, boxer: 0.05, child: 0.02, unknown: 0.035 }[a.face]);
      // The lash line, so a shut eye reads as shut.
      if (!a.opened) f.tube([at(side * 0.2, 0.06, 0, 0.065), at(side * 0.33, 0.035, 0, 0.085), at(side * 0.46, 0.06, 0, 0.06)], 0.012, shade);
    }
    mouth(f, { jaw, curve: expr.curve, lip: plaster, dark: a.expression === 'peace' || a.expression === 'smile' ? shade : crackM, teeth: plaster, width: a.face === 'child' ? 0.2 : 0.27 });

    switch (a.face) {
      case 'judge':
        for (const sx of [-1, 1]) {
          f.ball([0.2, 0.26, 0.14], at(sx * 0.42, -0.66, jaw, -0.04), plaster);
          f.tube([at(sx * 0.14, -0.2, 0, 0.012), at(sx * 0.27, -0.36, jaw * 0.3, 0.012), at(sx * 0.33, -0.56, jaw * 0.5, 0.012)], 0.014, shade);
          f.tube([at(sx * 0.2, -0.04, 0, 0.012), at(sx * 0.34, -0.09, 0, 0.014), at(sx * 0.46, -0.03, 0, 0.012)], 0.012, shade);
        }
        for (let i = 0; i < 3; i++) f.tube([at(-0.4, 0.5 + i * 0.09, 0, 0.006), at(0, 0.53 + i * 0.09, 0, 0.006), at(0.4, 0.5 + i * 0.09, 0, 0.006)], 0.01, shade);
        f.ball([0.24, 0.12, 0.1], at(0, -0.98, jaw, -0.03), plaster);
        break;
      case 'girl':
        for (const sx of [-1, 1]) {
          f.tube([at(0, 0.66, 0, 0.03), at(sx * 0.36, 0.6, 0, 0.05), at(sx * 0.62, 0.36, 0, 0.05), at(sx * 0.72, 0.02, 0, 0.03)], 0.085, plaster);
          f.tube([at(sx * 0.03, 0.74, 0, 0.03), at(sx * 0.4, 0.7, 0, 0.04), at(sx * 0.66, 0.5, 0, 0.03)], 0.06, plaster);
        }
        f.tube([at(0, 0.6, 0, 0.1), at(0, 0.82, 0, 0.07)], 0.01, shade);
        break;
      case 'boxer':
        f.ball([0.2, 0.11, 0.09], at(0.33, 0.24, 0, 0.0), plaster);
        f.ball([0.16, 0.1, 0.06], at(-0.42, -0.12, 0, 0.0), plaster);
        f.tube([at(-0.2, 0.33, 0, 0.03), at(-0.16, 0.42, 0, 0.03)], 0.012, shade);
        f.ball([0.3, 0.16, 0.12], at(0, -0.88, jaw, -0.03), plaster);
        break;
      case 'child':
        for (const sx of [-1, 1]) f.ball([0.2, 0.2, 0.12], at(sx * 0.42, -0.34, 0, -0.04), plaster);
        f.tube([at(-0.3, 0.6, 0, 0.02), at(0, 0.56, 0, 0.03), at(0.3, 0.6, 0, 0.02)], 0.05, plaster);
        break;
      default:
        f.tube([at(-0.3, -0.42, 0, 0.03), at(-0.12, -0.35, 0, 0.055), at(0.12, -0.35, 0, 0.055), at(0.3, -0.42, 0, 0.03)], 0.055, plaster);
        for (const sx of [-1, 1]) f.tube([at(sx * 0.5, -0.1, 0, 0.004), at(sx * 0.44, -0.4, 0, 0.004), at(sx * 0.36, -0.62, 0, 0.004)], 0.016, shade);
    }

    // Damage.
    if (a.damage === 'cracked' || a.damage === 'wired') {
      const flip = random() < 0.5 ? -1 : 1;
      const pts: THREE.Vector3[] = [];
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        pts.push(at(flip * mix(-0.66, 0.6, u) + (random() - 0.5) * 0.07, mix(0.55, -0.62, u) + (random() - 0.5) * 0.1, jaw * u * 0.5, 0.012));
      }
      for (let i = 0; i < n; i++) f.tube([pts[i], pts[i + 1]], 0.016, crackM);
      const branch = pts[3];
      f.tube([branch, branch.clone().add(new THREE.Vector3(flip * 0.14, 0.2, -0.03)), branch.clone().add(new THREE.Vector3(flip * 0.2, 0.38, -0.1))], 0.01, crackM);
      if (a.damage === 'wired') {
        const wire = s.material('#8d7a55', { metalness: 0.8, roughness: 0.4 });
        for (let i = 1; i < n; i += 1) {
          const mid = pts[i].clone().lerp(pts[i + 1] ?? pts[i], 0.5), dir = (pts[i + 1] ?? pts[i]).clone().sub(pts[i - 1]).normalize();
          const across = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(0.085);
          const out = new THREE.Vector3(0, 0, 0.035);
          f.tube([mid.clone().sub(across), mid.clone().sub(across.clone().multiplyScalar(0.9)).add(out), mid.clone().add(across.clone().multiplyScalar(0.9)).add(out), mid.clone().add(across)], 0.014, wire);
        }
      }
    }
    const specks = Math.round(mood.wear * 16);
    for (let i = 0; i < specks; i++) f.ball([0.02 + random() * 0.04, 0.02 + random() * 0.03, 0.01], at((random() - 0.5) * 1.1, (random() - 0.4) * 1.3, 0, 0.004), shade, 6);

    // Mount. The mask's cut edge sits at z = 0.2 head units.
    const U = HEAD * size, back = 0.19 * U, lowest = -1.2 * U - jaw * 0.3 * U;
    const plateText = { none: '', unknown: 'UNKNOWN', year: '1887', sure: 'HE WAS SURE', case: 'CASE No. 12', mother: 'MOTHER' }[a.plate];
    let plateAt: [number, number, number] = [0, 0, 0];
    const baseY = lowest - 0.11;
    if (a.mount === 'plaque') {
      const oval = s.mesh(new THREE.CylinderGeometry(1, 1, 0.022, 40), wood, [0, -0.012, back - 0.011]);
      oval.rotation.x = Math.PI / 2; oval.scale.set(0.15, 1, 0.215);
      const edge = s.mesh(new THREE.TorusGeometry(1, 0.05, 8, 48), s.material('#2e1c12'), [0, -0.012, back - 0.006]);
      edge.scale.set(0.15, 0.215, 0.12);
      s.box([0.2, 0.03, 0.12], [0, baseY - 0.01, back - 0.02], wood);
      s.rod([0, 0.08, back - 0.02], [0, baseY, back - 0.11], 0.008, wood);
      plateAt = [0, lowest - 0.045, back + 0.002];
      tilt.rotation.x = -0.14;
    } else if (a.mount === 'stand') {
      s.cylinder(0.075, 0.09, 0.022, [0, baseY - 0.07, back - 0.05], iron, 28);
      s.rod([0, baseY - 0.06, back - 0.05], [0, 0.02, back - 0.05], 0.007, iron);
      s.rod([0, 0.02, back - 0.05], [0, 0.02, back + 0.01], 0.006, iron);
      s.box([0.11, 0.045, 0.004], [0, baseY - 0.02, back - 0.03], brass);
      plateAt = [0, baseY - 0.02, back - 0.0275];
      tilt.rotation.x = -0.06; tilt.rotation.y = (random() - 0.5) * 0.3;
    } else if (a.mount === 'frame') {
      const w = 0.36, h = 0.44, d = 0.07, cy = -0.015;
      s.box([w, h, 0.012], [0, cy, back - 0.006], s.material(mood.cheer > 0.5 ? '#7a2734' : '#28324a', { roughness: 0.95 }));
      for (const [bw, bh, x, y] of [[w + 0.04, 0.03, 0, h / 2], [w + 0.04, 0.03, 0, -h / 2], [0.03, h, w / 2, 0], [0.03, h, -w / 2, 0]] as const) s.box([bw, bh, d], [x, cy + y, back + d / 2 - 0.012], wood);
      plateAt = [0, cy - h / 2 + 0.045, back + 0.002];
      tilt.rotation.x = -0.12;
      s.rod([0, 0.1, back - 0.02], [0, cy - h / 2 - 0.01, back - 0.16], 0.008, wood);
    } else {
      s.box([0.3, 0.02, 0.15], [0, lowest - 0.012, back + 0.04], wood);
      for (const sx of [-1, 1]) { const b = s.box([0.02, 0.12, 0.11], [sx * 0.1, lowest - 0.08, back + 0.02], wood); b.rotation.x = 0.2; }
      s.box([0.32, 0.5, 0.012], [0, lowest + 0.14, back - 0.03], s.material('#d9d2bf', { roughness: 0.95 }));
      const wax = s.material('#e9dfbf', { roughness: 0.5 });
      const lit = mood.daylight < 0.25 || mood.daylight > 0.75 || mood.cheer < 0.4;
      s.cylinder(0.014, 0.017, 0.03 + random() * 0.03, [0.11, lowest + 0.015, back + 0.085], wax, 12);
      s.cylinder(0.03, 0.03, 0.004, [0.11, lowest, back + 0.085], brass, 14);
      if (lit) s.ball([0.006, 0.013, 0.006], [0.11, lowest + 0.06, back + 0.085], new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffb347', emissiveIntensity: 2.2 }), 8);
      plateAt = [-0.03, lowest - 0.045, back + 0.118];
      tilt.rotation.x = -0.2;
      tilt.position.z = 0.012;
    }
    if (plateText) {
      const plate = s.label(plateText, 0.12, 0.032, plateAt, '#2d2410', '#c8a84e');
      (plate.material as THREE.MeshStandardMaterial).metalness = 0.5;
      tilt.add(plate);
      if (a.mount === 'stand' || a.mount === 'shelf') s.root.add(plate);
    }
    // Everything that is not the mask leans with it only on the plaque and frame.
    if (a.mount === 'plaque' || a.mount === 'frame') {
      const lean = new THREE.Group();
      lean.rotation.x = tilt.rotation.x;
      for (const child of [...s.root.children]) if (child !== tilt && child !== lean) lean.add(child);
      s.root.add(lean);
      // The prop rod and foot stay planted.
    }
    return s.finish();
  },
});
