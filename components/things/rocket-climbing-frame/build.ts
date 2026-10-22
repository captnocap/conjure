import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

const SCHEMES = {
  primary: ['#c9302b', '#e0b22a', '#2f62ad'],
  tricolour: ['#c9302b', '#ece8dc', '#2f62ad'],
  sky: ['#5d9ccb', '#e9e4d2', '#5d9ccb'],
  meadow: ['#3f8a4a', '#e0b22a', '#3f8a4a'],
  silver: ['#b9bdbd', '#b9bdbd', '#c9302b'],
  rust: ['#7a4630', '#6b3a24', '#84503a'],
} as const;

export default defineThing({
  questions: {
    scheme: choice('What colours was it painted?', {
      primary: 'Red, yellow and blue in bands, the classic playground trio.',
      tricolour: 'Red, white and blue bands.',
      sky: 'Sky blue with a white middle, calm and faded.',
      meadow: 'Green with a yellow band, repainted to match the benches.',
      silver: 'Aluminium silver all over with a red nose, like a real rocket.',
      rust: 'No paint left at all, only brown rust.',
    }),
    build: choice('What kind of rocket is it?', {
      slender: 'Tall and slender, a needle pointing at the sky.',
      stout: 'Short and fat, a cartoon rocket a toddler can manage.',
      staged: 'Two stages: a wide barrel below and a narrow one stacked on top.',
    }),
    state: choice('What shape is it in?', {
      intact: 'Straight and whole, every rung in place.',
      bent: 'The nose section is kinked over to one side.',
      leaning: 'The whole rocket leans, its footing heaved by frost.',
      gapped: 'Several rungs and a fin are missing, sawn off or stolen for scrap.',
    }),
    top: choice('What is at the very top?', {
      nothing: 'Only the bare nose cone.',
      scarf: 'A striped scarf someone tied there and never fetched.',
      star: 'A red five-pointed star.',
      flag: 'A small faded pennant.',
      trainers: 'A pair of trainers hung by their laces.',
    }),
    side: choice('What is attached to its side?', {
      none: 'Nothing: the rocket stands alone.',
      slide: 'A steel slide coming out of its belly.',
      bars: 'A run of monkey bars to a separate post.',
      gantry: 'A launch-tower ladder with a little bridge across.',
    }),
    plate: choice('If there is a sheet-metal name plate, what does it say?', {
      none: 'There is no plate.',
      cccp: 'СССР',
      vostok: 'ВОСТОК',
      mir: 'МИР',
      number: 'A yard number, like ДВОР 7.',
    }),
    snow: score('How much snow sits on the rungs?', ['None, bare steel', 'A dusting', 'A ridge on every rung', 'Thick caps and a drift at the base']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 0.028;
    const dull = new THREE.Color('#7b7068');
    const colours = SCHEMES[a.scheme].map((hex) => new THREE.Color(hex).lerp(dull, mood.wear * 0.3 + (1 - mood.cheer) * 0.12));
    const band = colours.map((c) => s.material(c, { metalness: 0.2, roughness: 0.5 }));
    const rust = s.material('#6b3a24', { roughness: 0.95 });
    const snowMat = new THREE.MeshStandardMaterial({ color: '#f1f4f7', roughness: 0.95 });
    const flake = a.scheme === 'rust' ? 0 : mix(0.04, 0.5, mood.wear);
    const pick = (index: number) => (random() < flake ? rust : band[index]);

    // Radius profile by level, from the ground hoop up to the collar under the nose.
    const profile: [number, number][] = {
      slender: [[0.25, 0.82], [0.85, 0.86], [1.45, 0.84], [2.05, 0.74], [2.65, 0.58], [3.2, 0.42], [3.7, 0.27], [4.1, 0.15]],
      stout: [[0.25, 0.95], [0.8, 1.08], [1.35, 1.1], [1.9, 0.98], [2.4, 0.74], [2.85, 0.45], [3.15, 0.2]],
      staged: [[0.25, 0.98], [0.85, 1.0], [1.45, 1.0], [2.0, 0.92], [2.25, 0.52], [2.85, 0.52], [3.45, 0.5], [3.95, 0.34], [4.3, 0.16]],
    }[a.build] as [number, number][];
    const levels = profile.length;
    const topY = profile[levels - 1][0];
    const noseH = a.build === 'stout' ? 0.6 : 0.8;
    const ribs = 8;
    const kinkY = profile[Math.floor(levels * 0.62)][0] + 0.02;
    const kinkAngle = a.state === 'bent' ? mix(0.25, 0.45, random()) * (random() < 0.5 ? -1 : 1) : 0;
    const kink = new THREE.Matrix4().makeRotationZ(kinkAngle);
    const bend = (p: THREE.Vector3) => { if (kinkAngle && p.y > kinkY) { p.y -= kinkY; p.applyMatrix4(kink); p.y += kinkY; } return p; };
    const at = (level: number, rib: number): P3 => {
      const [y, r] = profile[level];
      const angle = (rib + 0.5) / ribs * Math.PI * 2;
      return bend(new THREE.Vector3(Math.sin(angle) * r, y, Math.cos(angle) * r)).toArray() as P3;
    };
    const bandOf = (level: number) => Math.min(2, Math.floor(level / levels * 3));
    const gapped = a.state === 'gapped';

    // Ribs: straight welded lengths from hoop to hoop, and legs down into the ground.
    for (let rib = 0; rib < ribs; rib++) {
      const [x, y, z] = at(0, rib);
      s.rod([x * 1.04, -0.04, z * 1.04], [x, y, z], R, pick(0));
      for (let level = 0; level < levels - 1; level++) {
        if (gapped && level > 0 && level < levels - 2 && random() < 0.12) continue;
        s.rod(at(level, rib), at(level + 1, rib), R, pick(bandOf(level)));
      }
    }
    // Hoops: one welded ring per level, as an octagon of rungs.
    const snowLevel = a.snow;
    const caps: { at: P3; size: number }[] = [];
    for (let level = 0; level < levels; level++) {
      for (let rib = 0; rib < ribs; rib++) {
        // Leave a doorway in the front of the lowest hoops so a child can climb in.
        if (level === 1 && (rib === ribs - 1)) continue;
        if (gapped && level > 0 && random() < 0.28) continue;
        const p = at(level, rib), q = at(level, (rib + 1) % ribs);
        s.rod(p, q, R * 0.9, pick(bandOf(level)));
        if (snowLevel > 0.3) {
          const n = 2;
          for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; caps.push({ at: [mix(p[0], q[0], t), mix(p[1], q[1], t) + R * 1.1, mix(p[2], q[2], t)], size: mix(0.03, 0.075, snowLevel) * (0.8 + random() * 0.4) * Math.min(1, profile[level][1] * 2.2) }); }
        }
      }
    }
    if (caps.length) { const g = new THREE.SphereGeometry(1, 7, 5); g.scale(2.6, 0.55, 1.5); s.scatter(g, snowMat, caps); }

    // Nose cone in sheet steel, with a collar.
    const noseBase = bend(new THREE.Vector3(0, topY, 0));
    const nose = new THREE.Group();
    nose.position.copy(noseBase); nose.rotation.z = kinkAngle;
    s.root.add(nose);
    const noseR = profile[levels - 1][1] + 0.03;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(noseR, noseH, 16), a.scheme === 'silver' ? band[2] : pick(0));
    cone.position.y = noseH / 2; cone.castShadow = true; nose.add(cone);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(noseR + 0.015, noseR + 0.015, 0.05, 16), band[1]);
    collar.castShadow = true; nose.add(collar);
    if (snowLevel > 0.55) { const cap = new THREE.Mesh(new THREE.ConeGeometry(noseR * 0.5, noseH * 0.5, 12), snowMat); cap.position.y = noseH * 0.77; nose.add(cap); }

    // Fins: pipe triangles with a sheet infill.
    const finCount = a.build === 'stout' ? 3 : 4;
    const finTop = profile[2][0] + 0.1, finOut = a.build === 'slender' ? 0.75 : 0.6;
    for (let i = 0; i < finCount; i++) {
      if (gapped && i === 1) continue;
      const angle = i / finCount * Math.PI * 2 + Math.PI / 4;
      const dir = (r: number, y: number): P3 => [Math.sin(angle) * r, y, Math.cos(angle) * r];
      const r0 = profile[2][1], r1 = profile[0][1];
      const m = pick(2 - (i % 2) * 2);
      s.rod(dir(r0, finTop), dir(r1 + finOut, -0.03), R, m);
      s.rod(dir(r1 + finOut, 0.12), dir(r1, 0.3), R, m);
      const shape = new THREE.Shape([new THREE.Vector2(r0 + 0.02, finTop - 0.12), new THREE.Vector2(r1 + finOut - 0.08, 0.16), new THREE.Vector2(r1 + 0.02, 0.34)]);
      const sheet = s.mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: (m as THREE.MeshStandardMaterial).color, roughness: 0.8, side: THREE.DoubleSide }));
      sheet.rotation.y = angle - Math.PI / 2;
    }

    // Name plate bolted across the front ribs.
    if (a.plate !== 'none') {
      const text = { cccp: 'СССР', vostok: 'ВОСТОК', mir: 'МИР', number: `ДВОР ${1 + Math.floor(random() * 12)}` }[a.plate];
      const level = a.build === 'staged' ? 1 : 2;
      const [y, r] = [(profile[level][0] + profile[level + 1][0]) / 2, Math.max(profile[level][1], profile[level + 1][1])];
      const w = r * 0.95, h = 0.3;
      s.box([w + 0.06, h + 0.06, 0.012], [0, y, r + 0.02], band[2]);
      s.label(text, w, h, [0, y, r + 0.03], '#f4efe0', '#' + colours[0].getHexString()).rotation.z = (random() - 0.5) * mood.wear * 0.2;
    }

    // What is at the top.
    const tipY = noseH;
    let flutter: THREE.Object3D | null = null;
    const pole = (h: number) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, h, 6), rust); m.position.y = tipY + h / 2 - 0.05; nose.add(m); };
    if (a.top === 'star') {
      pole(0.3);
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.085 : 0.21, t = i / 10 * Math.PI * 2; shape[i ? 'lineTo' : 'moveTo'](Math.sin(t) * r, Math.cos(t) * r); }
      const star = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false }), s.material('#c9302b', { emissive: '#7a0d0d', emissiveIntensity: mix(0.05, 0.5, mood.cheer) }));
      star.position.set(0, tipY + 0.4, -0.015); star.castShadow = true; nose.add(star);
    } else if (a.top === 'flag') {
      pole(0.75);
      const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.5, -0.13), new THREE.Vector2(0, -0.26)]);
      flutter = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9302b').lerp(dull, mood.wear * 0.5), side: THREE.DoubleSide, roughness: 1 }));
      flutter.position.y = tipY + 0.68; flutter.castShadow = true; nose.add(flutter);
    } else if (a.top === 'scarf') {
      const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 128;
      const g = canvas.getContext('2d')!;
      const stripes = [['#c9302b', '#f0ead8'], ['#2f62ad', '#e0b22a'], ['#3f8a4a', '#f0ead8'], ['#7a3a8c', '#e9a03a']][Math.floor(random() * 4)];
      for (let i = 0; i < 16; i++) { g.fillStyle = stripes[i % 2]; g.fillRect(0, i * 8, 16, 8); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const wool = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, side: THREE.DoubleSide });
      const knot = new THREE.Mesh(new THREE.TorusGeometry(noseR * 0.45 + 0.03, 0.045, 8, 16), wool);
      knot.rotation.x = Math.PI / 2; knot.position.y = tipY * 0.5; knot.castShadow = true; nose.add(knot);
      flutter = new THREE.Group(); flutter.position.set(noseR * 0.45, tipY * 0.5, 0); nose.add(flutter);
      for (const [len, tilt] of [[1.0, -0.5], [0.7, -0.95]] as const) {
        const geometry = new THREE.PlaneGeometry(0.16, len, 1, 10);
        const p = geometry.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getY(i) * 7 + len * 4) * 0.05);
        geometry.translate(0, -len / 2, 0); geometry.computeVertexNormals();
        const tail = new THREE.Mesh(geometry, wool); tail.rotation.z = -tilt - Math.PI / 2 + 1.1; tail.castShadow = true; flutter.add(tail);
      }
    } else if (a.top === 'trainers') {
      const lace = s.material('#e9e4d8'), shoe = s.material(['#2f62ad', '#f0ead8', '#26262a'][Math.floor(random() * 3)]);
      const hang = bend(new THREE.Vector3(0, topY, 0)).add(new THREE.Vector3(profile[levels - 1][1], 0, 0.02));
      for (const [dx, drop] of [[0.0, 0.5], [0.09, 0.66]] as const) {
        s.rod([hang.x, hang.y, hang.z], [hang.x + dx, hang.y - drop, hang.z + 0.03], 0.005, lace);
        s.ball([0.05, 0.05, 0.12], [hang.x + dx, hang.y - drop - 0.05, hang.z + 0.03], shoe, 10).rotation.x = 1.1 + dx * 3;
        s.box([0.09, 0.02, 0.24], [hang.x + dx, hang.y - drop - 0.1, hang.z + 0.03], s.material('#efeadc')).rotation.x = 1.1 + dx * 3;
      }
    }

    // Side attachment, always out to +x so the rocket itself stays readable.
    const steel = s.material('#aab0b1', { metalness: 0.7, roughness: 0.35 });
    const r1 = profile[2][1];
    if (a.side === 'slide') {
      const y0 = profile[2][0] + 0.05, len = 2.2, x0 = r1 * 0.75, x1 = x0 + len * 0.85;
      const tilt = Math.atan2(y0 - 0.25, x1 - x0);
      const chute = new THREE.Group(); chute.position.set((x0 + x1) / 2, (y0 + 0.25) / 2, 0); chute.rotation.z = -tilt; s.root.add(chute);
      const L = Math.hypot(x1 - x0, y0 - 0.25);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(L, 0.02, 0.5), steel); bed.castShadow = true; chute.add(bed);
      for (const z of [-0.26, 0.26]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(L, 0.14, 0.025), pick(0)); rail.position.set(0, 0.06, z); rail.castShadow = true; chute.add(rail); }
      s.box([0.6, 0.02, 0.5], [x1 + 0.28, 0.25, 0], steel);
      for (const z of [-0.22, 0.22]) { s.rod([x1 + 0.3, -0.04, z], [x1 + 0.3, 0.25, z], R, pick(2)); s.rod([(x0 + x1) / 2, -0.04, z], [(x0 + x1) / 2, (y0 + 0.25) / 2, z], R, pick(2)); }
      if (snowLevel > 0.5) { const drift = new THREE.Mesh(new THREE.BoxGeometry(L * 0.9, 0.05, 0.44), snowMat); drift.position.y = 0.03; chute.add(drift); }
    } else if (a.side === 'bars') {
      const y = 2.0, x0 = r1 * 0.9, x1 = x0 + 2.4;
      for (const z of [-0.3, 0.3]) { s.rod([x0, y, z], [x1, y, z], R, pick(1)); s.rod([x1, -0.04, z], [x1, y, z], R, pick(2)); }
      for (let i = 1; i < 8; i++) { if (gapped && random() < 0.3) continue; s.rod([x0 + i * 0.3, y, -0.3], [x0 + i * 0.3, y, 0.3], R * 0.8, pick(0)); }
      for (const h of [0.5, 1.0, 1.5]) s.rod([x1, h, -0.3], [x1, h, 0.3], R * 0.8, pick(0));
    } else if (a.side === 'gantry') {
      const x = r1 + 1.1, h = Math.min(topY - 0.4, 3.0);
      for (const z of [-0.28, 0.28]) for (const dx of [0, 0.5]) s.rod([x + dx, -0.04, z], [x + dx, h + (dx ? 0.7 : 0.7), z], R, pick(2));
      for (let y = 0.4; y < h + 0.6; y += 0.4) { s.rod([x + 0.5, y, -0.28], [x + 0.5, y, 0.28], R * 0.8, pick(1)); if (Math.round(y / 0.4) % 2) s.rod([x, y, -0.28], [x + 0.5, y + 0.4, -0.28], R * 0.7, pick(1)); }
      s.box([0.62, 0.03, 0.62], [x + 0.25, h, 0], steel);
      s.box([x - r1 * 0.5, 0.03, 0.5], [(x + r1 * 0.5) / 2, h, 0], steel);
      for (const z of [-0.26, 0.26]) s.rod([r1 * 0.5, h + 0.45, z], [x, h + 0.45, z], R * 0.8, pick(0));
    }

    // Ground: worn sand under the rocket, or a drift.
    const earth = new THREE.Color('#a48f6a').lerp(new THREE.Color('#e6eaed'), Math.min(1, a.snow * 1.3));
    s.cylinder(1.6, 1.7, 0.05, [0, -0.02, 0], new THREE.MeshStandardMaterial({ color: earth, roughness: 1 }), 36);
    if (a.snow > 0.7) for (let i = 0; i < 5; i++) { const t = random() * 6.28; s.ball([0.5 + random() * 0.4, 0.12 + random() * 0.1, 0.4 + random() * 0.3], [Math.cos(t) * 1.2, 0.0, Math.sin(t) * 1.2], snowMat, 10); }
    else { const marks: { at: P3; size: number }[] = []; for (let i = 0; i < 16; i++) { const t = random() * 6.28, d = random() * 1.45; marks.push({ at: [Math.cos(t) * d, 0.005, Math.sin(t) * d], size: 0.1 + random() * 0.15 }); } const g = new THREE.SphereGeometry(1, 7, 5); g.scale(1, 0.1, 0.7); s.scatter(g, new THREE.MeshStandardMaterial({ color: earth.clone().multiplyScalar(0.8), roughness: 1 }), marks); }

    if (a.state === 'leaning') { s.root.rotation.z = mix(0.07, 0.14, random()) * (random() < 0.5 ? -1 : 1); s.root.rotation.x = (random() - 0.5) * 0.08; }
    const holder = new Sculpture(context);
    holder.root.add(s.root);
    const speed = mix(0.4, 3.5, mood.energy), swing = mix(0.03, 0.3, mood.energy), phase = random() * 6;
    const thing = holder.finish({ update: (_dt, time) => { if (flutter) flutter.rotation.y = Math.sin(time * speed + phase) * swing; } });
    return { ...thing, dispose: () => { thing.dispose(); } };
  },
});
