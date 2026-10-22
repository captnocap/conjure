import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { Head, type HeadSpec, blob, noise3, smooth, taperTube } from './fx';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const Y = V(0, 1, 0), Z = V(0, 0, 1);

const STYLES = {
  'classic-green': 'Classic drive-in green, gaunt, with sunken eyes.',
  'grey-shambler': 'A long grey shambler: ashen, hollow-cheeked, tired.',
  'bloated-swamp': 'A bloated drowned thing, blue-green and lumpy with weed stains.',
  'comic-purple': 'Comic-book purple with lime highlights and a huge brow and chin.',
  'fresh-pale': 'Freshly dead: waxy pale flesh with bruised eye sockets.',
} as const;

const SPECS: Record<keyof typeof STYLES, Partial<HeadSpec>> = {
  'classic-green': { jaw: 0.3, cheek: -0.8, socket: 1.1, nose: 0.4, brow: 0.9, chin: 0.45, mouth: 0.9, lump: 0.012, lumpScale: 9 },
  'grey-shambler': { jaw: 0.15, cheek: -1.1, socket: 1.2, nose: 0.5, brow: 0.7, chin: 0.6, mouth: 0.8, height: 1.1, width: 0.94, lump: 0.01, lumpScale: 11 },
  'bloated-swamp': { jaw: 1, cheek: 0.8, socket: 0.7, nose: 0.75, brow: 0.5, chin: 0.2, mouth: 0.8, width: 1.2, depth: 1.08, lump: 0.032, lumpScale: 5 },
  'comic-purple': { jaw: 0.85, cheek: -0.4, socket: 1.2, nose: 0.7, brow: 1.7, chin: 1.1, mouth: 1, lump: 0.006, lumpScale: 8 },
  'fresh-pale': { jaw: 0.5, cheek: -0.2, socket: 0.9, nose: 0.6, brow: 0.5, chin: 0.4, mouth: 0.6, lump: 0.004, lumpScale: 12 },
};
const PALETTE: Record<keyof typeof STYLES, [string, string, string]> = {
  // base, shadow, highlight
  'classic-green': ['#7f9a52', '#3d4a2a', '#c3cf86'],
  'grey-shambler': ['#8f918a', '#45464a', '#cfcdc0'],
  'bloated-swamp': ['#5f8f86', '#2b4a4f', '#a9c98f'],
  'comic-purple': ['#8a4fb5', '#3c2360', '#b6e04a'],
  'fresh-pale': ['#d6c7b4', '#6e5a78', '#f1e8da'],
};

export default defineThing({
  questions: {
    style: choice('What kind of zombie is the mask?', STYLES),
    paint: score('How finished is the paint job?', [
      'Raw unpainted latex, the colour of old custard',
      'One flat base coat',
      'Shadows washed into the hollows',
      'Full detail: veins, drybrushed highlights, blood round the mouth',
    ]),
    hair: choice('What hair does it have?', {
      bald: 'Bald.',
      tufts: 'A few sad punched tufts of long hair.',
      'cheap-wig': 'A cheap party wig sitting crooked on top.',
      'comb-over': 'A thin greasy grey comb-over stuck across the scalp.',
    }),
    missing: choice('What part of the face is missing?', {
      nothing: 'Nothing: the whole rotten face is there.',
      ear: 'An ear has been torn off, leaving a ragged dark stump.',
      nose: 'The nose is gone: a dark triangular hole.',
      cheek: 'A cheek has rotted through, showing a row of teeth.',
      scalp: 'A flap of scalp is peeled back off white skull.',
    }),
    mouth: choice('What is the mouth doing?', {
      gape: 'Hanging open in a slack gape.',
      grimace: 'A wide lipless grimace, all teeth.',
      tongue: 'Open with a swollen tongue lolling out.',
      shut: 'Sewn shut with coarse black stitches.',
    }),
    neck: score('How does the empty neck of the mask hang?', ['Standing stiff like a collar', 'Sagging in soft folds', 'Limp and twisted over to one side']),
    stuck: choice('What has been stuck in or on it?', {
      nothing: 'Nothing.',
      pins: 'T-pins with coloured heads holding it to the block.',
      'note-blood': 'A paper note pinned to the forehead: MORE BLOOD.',
      'note-hero': 'A paper note pinned to the forehead: HERO DO NOT TOUCH.',
      tag: 'A numbered string tag hanging from one ear, one of a batch of extras.',
    }),
    block: choice('What is it sitting on?', {
      canvas: 'A cream canvas wig block on a steel post and round base.',
      cork: 'A brown cork-filled block clamped to a table edge.',
      styrofoam: 'A cheap white polystyrene head.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const stage = a.paint < 0.17 ? 0 : a.paint < 0.5 ? 1 : a.paint < 0.83 ? 2 : 3;
    const [baseHex, shadowHex, highHex] = PALETTE[a.style];
    const latex = new THREE.Color('#e3d29a');
    const base = stage === 0 ? latex.clone() : new THREE.Color(baseHex);
    const shadow = new THREE.Color(shadowHex), high = new THREE.Color(highHex);
    const seed = random() * 50;
    const mask = new Head(SPECS[a.style]);
    const e = mask.spec.eyeSpread, eh = mask.spec.eyeHeight;
    const g2 = (d: THREE.Vector3, cx: number, cy: number, w: number) => (d.z > 0 ? Math.exp(-(((d.x - cx) / w) ** 2) - ((d.y - cy) / w) ** 2) : 0);
    const mouthOpen = { gape: 1, grimace: 0.45, tongue: 0.9, shut: 0.05 }[a.mouth];
    const wide = { gape: 0.26, grimace: 0.4, tongue: 0.28, shut: 0.3 }[a.mouth];
    const my = -0.47 - mouthOpen * 0.05;

    const paint = (p: THREE.Vector3, d: THREE.Vector3) => {
      const c = base.clone();
      c.offsetHSL(0, 0, noise3(p.x * 70 + seed, p.y * 70, p.z * 70) * 0.03);
      if (stage >= 2) {
        const hollow = g2(d, -e, eh, 0.2) + g2(d, e, eh, 0.2) + 0.7 * (g2(d, -0.5, -0.25, 0.2) + g2(d, 0.5, -0.25, 0.2)) + 0.6 * g2(d, 0, -0.5, 0.3) + smooth(-0.5, -0.95, d.y) * 0.6;
        c.lerp(shadow, Math.min(0.85, hollow * 0.8));
        c.lerp(shadow, Math.max(0, noise3(d.x * 6 + seed, d.y * 6, d.z * 6)) * 0.35);
      }
      if (stage >= 3) {
        const bump = noise3(d.x * 14 + seed, d.y * 14, d.z * 14);
        c.lerp(high, Math.max(0, bump) * 0.5 + 0.35 * (g2(d, 0, 0.36, 0.3) + g2(d, 0, -0.12, 0.1)));
        // Veins as thin noise contours, blood down from the mouth.
        const vein = Math.abs(noise3(d.x * 5 + 20 + seed, d.y * 5, d.z * 5));
        if (vein < 0.035 && d.y > -0.2) c.lerp(new THREE.Color('#5a2f5c'), 0.6);
        const blood = g2(d, 0, my - 0.02, 0.26) * (0.6 + 0.6 * noise3(d.x * 18, d.y * 4, seed)) + (d.z > 0.3 && Math.abs(d.x - 0.08) < 0.05 && d.y < my && d.y > my - 0.4 ? 0.7 : 0);
        c.lerp(new THREE.Color('#8e1420'), Math.min(0.9, blood * mix(0.6, 1.3, 1 - mood.cheer)));
      }
      if (a.style === 'bloated-swamp' && stage >= 2) c.lerp(new THREE.Color('#40552c'), Math.max(0, noise3(d.x * 3.5 + seed, d.y * 3.5, d.z * 3.5) - 0.25) * 1.2);
      c.lerp(new THREE.Color('#5c5144'), mood.wear * 0.25 * Math.max(0, noise3(d.x * 4, d.y * 4 + seed, d.z * 4)));
      return c;
    };

    const rubber = s.material('#ffffff', { vertexColors: true, roughness: stage === 3 ? 0.5 : 0.78 });
    const flat = new THREE.MeshStandardMaterial({ color: base.clone().lerp(shadow, stage >= 2 ? 0.25 : 0), roughness: 0.78, side: THREE.DoubleSide });
    const dark = new THREE.MeshStandardMaterial({ color: stage === 0 ? '#5d5338' : shadow.clone().multiplyScalar(0.55), roughness: 0.9 });
    const blockColour = { canvas: '#d9caa4', cork: '#9a6f45', styrofoam: '#f3f3ee' }[a.block];
    const blockMat = s.material(blockColour, { roughness: 0.95 });
    const steel = s.material('#9ea4a8', { metalness: 0.85, roughness: 0.3 });
    const toothMat = s.material(stage >= 2 ? '#d9c98a' : stage === 1 ? baseHex : '#e3d29a', { roughness: 0.5 });
    const wood = s.material('#8a6238', { roughness: 0.7 });

    // Stand and block.
    const HY = 0.36, S = 1.25;
    if (a.block === 'cork') {
      s.box([0.2, 0.02, 0.12], [0, 0.01, 0], wood);
      s.box([0.05, 0.07, 0.04], [0, 0.045, -0.02], steel);
      s.cylinder(0.006, 0.006, 0.06, [0, 0.03, 0.02], steel, 8);
      s.cylinder(0.018, 0.018, 0.006, [0, 0.024, 0.02], steel, 10);
    } else {
      s.lathe([[0, 0], [0.085, 0], [0.09, 0.008], [0.08, 0.02], [0.02, 0.03], [0, 0.03]], a.block === 'styrofoam' ? blockMat : steel);
    }
    s.cylinder(a.block === 'styrofoam' ? 0.03 : 0.011, a.block === 'styrofoam' ? 0.04 : 0.011, HY - 0.16, [0, 0.03 + (HY - 0.16) / 2, -0.012], a.block === 'styrofoam' ? blockMat : steel, 14);
    s.cylinder(0.045 * S, 0.04 * S, 0.07, [0, HY - 0.15, -0.012], blockMat, 18);

    const group = new THREE.Group();
    group.position.set(0, HY, 0);
    group.scale.setScalar(S);
    group.rotation.z = (random() - 0.5) * 0.1;
    group.rotation.y = (random() - 0.5) * 0.3;
    s.root.add(group);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at?: THREE.Vector3, parent: THREE.Object3D = group) => {
      const mesh = new THREE.Mesh(geometry, material);
      if (at) mesh.position.copy(at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const onSkin = (mesh: THREE.Object3D, x: number, y: number) => { mesh.quaternion.setFromUnitVectors(Z, mask.normal(V(x, y, Math.sqrt(Math.max(0.0001, 1 - x * x - y * y))))); return mesh; };

    const block = new Head({ socket: 0, nose: 0.05, brow: 0, mouth: 0, cheek: 0, chin: 0.2, size: 0.8 });
    add(block.geometry(36), blockMat);
    add(mask.geometry(72, paint), rubber);

    // Eye holes: you see the block through them.
    for (const side of [-1, 1]) {
      const hole = onSkin(add(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color(blockColour).multiplyScalar(0.3), roughness: 1 }), mask.face(side * e, eh, 0.0005)), side * e, eh);
      hole.scale.set(0.022, 0.015, 0.003);
      hole.rotation.z += side * -0.18;
      const rim = onSkin(add(new THREE.TorusGeometry(1, 0.16, 6, 20), dark, mask.face(side * e, eh, 0.001)), side * e, eh);
      rim.scale.set(0.022, 0.015, 0.012);
      rim.rotation.z += side * -0.18;
    }

    // Mouth.
    const lipY = (x: number, upper: boolean) => my + (upper ? 1 : -1) * (0.012 + mouthOpen * 0.15) * (1 - (x / wide) ** 2) - 0.04 * (x / wide) ** 2;
    const cavity = add(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ color: '#1c1210', roughness: 1 }), mask.face(0, my, -0.01));
    cavity.scale.set(wide * 0.086, 0.004 + mouthOpen * 0.024, 0.016);
    const lip: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) { const x = mix(-wide, wide, k / 10); lip.push(mask.face(x, lipY(x, true), 0.002)); }
    for (let k = 9; k >= 1; k--) { const x = mix(-wide, wide, k / 10); lip.push(mask.face(x, lipY(x, false), 0.002)); }
    add(taperTube(lip, () => (a.mouth === 'grimace' ? 0.003 : 0.0055), 48, 6, true), flat);
    if (a.mouth !== 'shut') {
      const n = a.mouth === 'grimace' ? 9 : 7;
      for (const upper of [true, false])
        for (let k = 0; k < n; k++) {
          if (random() < 0.18 + mood.wear * 0.2) continue;
          const x = mix(-wide * 0.8, wide * 0.8, (k + 0.5) / n) + (random() - 0.5) * 0.02;
          const h = (0.007 + random() * 0.005) * (a.mouth === 'grimace' ? 1.3 : 1);
          const t = add(new THREE.BoxGeometry(0.0062, h, 0.004), toothMat, mask.face(x, lipY(x, upper) + (upper ? -1 : 1) * h * 4.2, -0.001));
          t.rotation.z = (random() - 0.5) * 0.3;
        }
    } else {
      for (let k = 0; k < 6; k++) {
        const x = mix(-wide * 0.8, wide * 0.8, k / 5);
        add(taperTube([mask.face(x - 0.02, my + 0.07, 0.002), mask.face(x, my, 0.006), mask.face(x + 0.02, my - 0.07, 0.002)], () => 0.0013, 8, 4), new THREE.MeshStandardMaterial({ color: '#141214', roughness: 0.9 }));
      }
    }
    if (a.mouth === 'tongue') {
      const from = mask.face(0.04, my, -0.004);
      add(taperTube([from, from.clone().add(V(0.004, -0.012, 0.016)), from.clone().add(V(0.01, -0.04, 0.014))], (t) => 0.011 * (1 - t * 0.35), 14, 8), new THREE.MeshStandardMaterial({ color: stage >= 2 ? '#7d3a5c' : base, roughness: 0.4 })).scale.set(1, 1, 0.8);
    }

    // Ears, and whatever is missing.
    for (const side of [-1, 1]) {
      const at = mask.point(V(side * 0.98, 0.02, -0.1));
      if (a.missing === 'ear' && side > 0) {
        const stump = add(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: stage >= 2 ? '#5e1620' : '#3a3324', roughness: 0.9 }), at);
        stump.scale.set(0.004, 0.016, 0.011);
        continue;
      }
      const ear = add(new THREE.SphereGeometry(1, 12, 9), flat, at);
      ear.scale.set(0.008, 0.03, 0.017);
      ear.rotation.set(0, side * 0.5, -side * (0.2 + random() * 0.25));
    }
    if (a.missing === 'nose') {
      const hole = onSkin(add(new THREE.ConeGeometry(1, 1, 3), new THREE.MeshStandardMaterial({ color: '#1c1210', roughness: 1 }), mask.face(0, -0.15, 0.004)), 0, -0.15);
      hole.scale.set(0.014, 0.024, 0.01);
      hole.rotateX(0.2);
    }
    if (a.missing === 'cheek') {
      const cx = 0.5, cy = -0.3;
      const hole = onSkin(add(new THREE.SphereGeometry(1, 14, 9), new THREE.MeshStandardMaterial({ color: '#1c1210', roughness: 1 }), mask.face(cx, cy, 0.0005)), cx, cy);
      hole.scale.set(0.026, 0.017, 0.004);
      hole.rotation.z += 0.3;
      for (let k = 0; k < 5; k++) {
        const x = cx - 0.16 + k * 0.08;
        add(new THREE.BoxGeometry(0.006, 0.01, 0.004), toothMat, mask.face(x, cy + (x - cx) * 0.3 + 0.03, 0.003)).rotation.y = 0.6;
        if (k % 2 === 0) add(new THREE.BoxGeometry(0.006, 0.009, 0.004), toothMat, mask.face(x, cy + (x - cx) * 0.3 - 0.06, 0.003)).rotation.y = 0.6;
      }
    }
    if (a.missing === 'scalp') {
      const bone = add(new THREE.SphereGeometry(1, 16, 10), s.material('#ece5d2', { roughness: 0.6 }), mask.point(V(0.45, 0.8, 0.3)).multiplyScalar(0.7));
      bone.scale.set(0.046, 0.04, 0.048);
      const flapShape = new THREE.Shape();
      flapShape.moveTo(-0.03, 0); flapShape.lineTo(-0.02, 0.05); flapShape.lineTo(0.005, 0.038); flapShape.lineTo(0.025, 0.06); flapShape.lineTo(0.032, 0); flapShape.closePath();
      const flap = add(new THREE.ShapeGeometry(flapShape), flat, mask.point(V(0.75, 0.62, 0.2)).multiplyScalar(1.02));
      flap.rotation.set(0.2, 0.9, -1.1);
    }

    // Hair.
    const strandGeometry = new THREE.ConeGeometry(1, 1, 4);
    strandGeometry.translate(0, -0.5, 0);
    const strands: { at: THREE.Vector3; q: THREE.Quaternion; len: number; colour: THREE.Color }[] = [];
    const hairColour = new THREE.Color(a.hair === 'cheap-wig' ? ['#e0661f', '#1d1b1f', '#d9d23a', '#c9c9cf'][Math.floor(random() * 4)] : a.hair === 'comb-over' ? '#8d8a84' : ['#3a3028', '#b9b4a8', '#5c4a30'][Math.floor(random() * 3)]);
    const strandAt = (d: THREE.Vector3, len: number, sideways = 0) => {
      const n = mask.normal(d);
      const lean = n.clone().multiplyScalar(0.45).add(V(sideways, -1, -0.15)).add(V(random() - 0.5, 0, random() - 0.5).multiplyScalar(0.3)).normalize();
      strands.push({ at: mask.point(d).multiplyScalar(a.hair === 'cheap-wig' ? 1.08 : 1), q: new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), lean), len, colour: hairColour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.14) });
    };
    let wig: THREE.Object3D | null = null;
    if (a.hair === 'tufts') {
      const clumps = 5 + Math.floor(random() * 5);
      for (let c = 0; c < clumps; c++) {
        const centre = V(random() * 1.8 - 0.9, 0.35 + random() * 0.6, random() * 1.3 - 0.9).normalize();
        for (let k = 0; k < 14; k++) strandAt(centre.clone().add(V(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.18)).normalize(), 0.05 + random() * 0.08);
      }
    } else if (a.hair === 'cheap-wig') {
      const tilt = new THREE.Group();
      tilt.rotation.set(0.05, 0, (random() < 0.5 ? -1 : 1) * (0.12 + random() * 0.14));
      group.add(tilt);
      wig = tilt;
      const line = (d: THREE.Vector3) => (d.z > 0 ? mix(0.42, 0.05, Math.min(1, Math.abs(d.x) * 1.3)) : -0.25);
      add(blob(40, (d) => {
        const on = smooth(-0.04, 0.04, d.y - line(d));
        return mask.point(d).multiplyScalar(mix(0.8, 1.1 + 0.03 * noise3(d.x * 9, d.y * 9, d.z * 9), on));
      }), new THREE.MeshStandardMaterial({ color: hairColour, roughness: 0.55 }), undefined, tilt);
      for (let k = 0; k < 150; k++) {
        const ang = random() * Math.PI * 2;
        const d = V(Math.cos(ang), 0, Math.sin(ang));
        d.y = line(d) + random() * 0.25;
        strandAt(d.normalize(), 0.03 + random() * 0.06);
      }
    } else if (a.hair === 'comb-over') {
      for (let k = 0; k < 9; k++) {
        const z = mix(0.45, -0.5, k / 8);
        const pts = [-0.75, -0.4, 0, 0.4, 0.72].map((x) => mask.point(V(x, 0.75 - Math.abs(x) * 0.35, z + x * 0.1).normalize()).multiplyScalar(1.012));
        add(taperTube(pts, (t) => 0.0028 * (1 - t * 0.6), 20, 4), new THREE.MeshStandardMaterial({ color: hairColour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1), roughness: 0.35 }));
      }
      for (let k = 0; k < 30; k++) strandAt(V(-0.8 - random() * 0.15, 0.25 + random() * 0.3, random() * 1.2 - 0.9).normalize(), 0.03 + random() * 0.04);
    }
    if (strands.length) {
      const hair = new THREE.InstancedMesh(strandGeometry, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), strands.length);
      const matrix = new THREE.Matrix4();
      strands.forEach((h, i) => {
        matrix.compose(h.at, h.q, V(0.0032, h.len, 0.0022));
        hair.setMatrixAt(i, matrix);
        hair.setColorAt(i, h.colour);
      });
      hair.instanceMatrix.needsUpdate = true;
      if (hair.instanceColor) hair.instanceColor.needsUpdate = true;
      hair.castShadow = true;
      (wig ?? group).add(hair);
    }

    // The empty neck of the mask.
    const droop = a.neck;
    const neck = new THREE.Group();
    neck.position.set(0, -0.085, -0.012);
    group.add(neck);
    const neckLen = mix(0.14, 0.1, droop);
    const side = random() < 0.5 ? -1 : 1;
    const neckPts = [V(0, 0.02, 0), V(side * droop * 0.012, -neckLen * 0.4, 0.004 * droop), V(side * droop ** 2 * 0.05, -neckLen * 0.75, 0.012 * droop), V(side * droop ** 2 * 0.085, -neckLen * mix(1, 0.86, droop), 0.016 * droop)];
    const folds = 5 + Math.floor(random() * 3);
    const neckGeometry = taperTube(neckPts, (t, ang) => mix(0.056, mix(0.062, 0.048, droop), t) * (1 + t * mix(0.03, 0.2, droop) * Math.sin(ang * folds + t * 4 + seed)) * (1 + 0.03 * Math.sin(ang * 9 + t * 30) * (t > 0.85 ? 1 : 0)), 26, 28);
    const neckPos = neckGeometry.getAttribute('position');
    const neckColours = new Float32Array(neckPos.count * 3);
    for (let i = 0; i < neckPos.count; i++) {
      const p = V(neckPos.getX(i), neckPos.getY(i), neckPos.getZ(i));
      const c = paint(p, V(p.x * 8, -0.75, p.z * 8).normalize());
      neckColours.set([c.r, c.g, c.b], i * 3);
    }
    neckGeometry.setAttribute('color', new THREE.BufferAttribute(neckColours, 3));
    add(neckGeometry, rubber, undefined, neck);

    // Pins, notes and tags.
    const tags: THREE.Object3D[] = [];
    const pin = (x: number, y: number, colour: string) => {
      const d = V(x, y, Math.sqrt(Math.max(0.0001, 1 - x * x - y * y)));
      const n = mask.normal(d).add(V((random() - 0.5) * 0.5, 0.3, 0)).normalize();
      const at = mask.face(x, y);
      const shaft = add(new THREE.CylinderGeometry(0.0009, 0.0009, 0.03, 5), steel, at.clone().addScaledVector(n, 0.012));
      shaft.quaternion.setFromUnitVectors(Y, n);
      add(new THREE.SphereGeometry(0.0042, 8, 6), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.3 }), at.clone().addScaledVector(n, 0.028));
    };
    const pinColours = ['#e23a3a', '#f2c230', '#3a7fe2', '#f4f1ea', '#3fb060'];
    if (a.stuck === 'pins') {
      const n = 5 + Math.round(mood.density * 6);
      for (let k = 0; k < n; k++) pin((random() - 0.5) * 1.3, random() * 1.2 - 0.35, pinColours[k % pinColours.length]);
    }
    if (a.stuck === 'note-blood' || a.stuck === 'note-hero') {
      const hero = a.stuck === 'note-hero';
      const holder = new THREE.Group();
      holder.position.copy(mask.face(0.05, 0.56, 0.006));
      holder.quaternion.setFromUnitVectors(Z, mask.normal(V(0.05, 0.56, 0.82)));
      holder.rotateZ((random() - 0.5) * 0.4);
      group.add(holder);
      const paper = new Sculpture(context);
      paper.label(hero ? 'HERO' : 'MORE', 0.075, 0.026, [0, 0.012, 0], hero ? '#b3202c' : '#22252b', hero ? '#f6f0d8' : '#f7e36a');
      paper.label(hero ? 'DO NOT TOUCH' : 'BLOOD!', 0.075, 0.026, [0, -0.014, 0], hero ? '#22252b' : '#b3202c', hero ? '#f6f0d8' : '#f7e36a');
      holder.add(paper.root);
      pin(0.05, 0.66, '#e23a3a');
    }
    if (a.stuck === 'tag') {
      const at = mask.point(V(-0.98, -0.05, -0.1)).add(V(-0.008, -0.02, 0.004));
      const swing = new THREE.Group();
      swing.position.copy(at);
      group.add(swing);
      const paper = new Sculpture(context);
      paper.label(`No. ${1 + Math.floor(random() * 23)}`, 0.04, 0.024, [0, -0.05, 0], '#22252b', '#e9d9ae');
      swing.add(paper.root);
      add(new THREE.CylinderGeometry(0.0006, 0.0006, 0.04, 4), new THREE.MeshStandardMaterial({ color: '#f1ede0' }), V(0, -0.02, 0), swing);
      swing.rotation.set(0, 0.5, 0.1);
      tags.push(swing);
    }
    if (a.stuck !== 'nothing' && a.stuck !== 'pins') for (let k = 0; k < 2 + Math.round(mood.density * 3); k++) pin((random() - 0.5) * 1.3, -0.3 + random() * 0.5, pinColours[k % pinColours.length]);

    // A paint pot and brush wait at the foot when the bench is busy.
    if (mood.density > 0.45 && stage > 0 && a.block !== 'cork') {
      s.cylinder(0.022, 0.02, 0.035, [0.13, 0.0175, 0.05], s.material('#e8e6df', { roughness: 0.4 }), 14);
      s.cylinder(0.019, 0.019, 0.004, [0.13, 0.034, 0.05], new THREE.MeshStandardMaterial({ color: stage === 3 ? '#8e1420' : baseHex, roughness: 0.2 }), 14);
      s.rod([0.118, 0.03, 0.05], [0.15, 0.1, 0.03], 0.003, wood);
    }

    const energy = mood.energy, phase = random() * 9;
    return s.finish({
      footprint: 0.16,
      update: (_dt, time) => {
        const t = time * mix(0.5, 2.2, energy) + phase;
        neck.rotation.z = energy * 0.05 * Math.sin(t) * (0.3 + droop);
        neck.rotation.x = energy * 0.03 * Math.sin(t * 0.7 + 1);
        for (const tag of tags) tag.rotation.z = 0.1 + energy * 0.3 * Math.sin(t * 1.6);
      },
    });
  },
});
