import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

/** A made-up handwritten character: a few strokes in a cell. */
function glyph(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, random: () => number) {
  ctx.lineWidth = Math.max(1.5, size * 0.12);
  ctx.lineCap = 'round';
  const strokes = 3 + Math.floor(random() * 4);
  for (let i = 0; i < strokes; i++) {
    const kind = random();
    const a = x + (random() - 0.5) * size * 0.7, b = y + (random() - 0.5) * size * 0.7;
    ctx.beginPath();
    if (kind < 0.4) { ctx.moveTo(x - size * 0.4, b); ctx.lineTo(x + size * 0.4, b); }
    else if (kind < 0.7) { ctx.moveTo(a, y - size * 0.42); ctx.lineTo(a, y + size * 0.42); }
    else { ctx.moveTo(a, b - size * 0.2); ctx.quadraticCurveTo(a, b + size * 0.2, a + (kind < 0.85 ? -1 : 1) * size * 0.35, b + size * 0.35); }
    ctx.stroke();
  }
}

const WISHES = {
  exams: 'Exam season: plaques painted with a red daruma or a galloping horse, crammed with anxious blue-ink writing.',
  love: 'Matchmaking: pink hearts and paired names, hopeful and a little embarrassed.',
  health: 'Recovery and long life: cranes and pine sprigs, written carefully by older hands.',
  fox: 'An Inari shrine: white fox faces, each with a different drawn-on expression.',
  newyear: 'New Year: the zodiac animal of the year stamped in red on every plaque, wishes for luck and money.',
  mixed: 'Everything at once, from many years and many hands.',
} as const;

export default defineThing({
  questions: {
    wishes: choice('What are most of the plaques asking for?', WISHES),
    shape: choice('What shape are the plaques?', {
      house: 'The classic five-sided plaque with a peaked top, like a tiny house.',
      heart: 'Heart-shaped plaques.',
      round: 'Round discs.',
      fox: 'Pointed fox-face plaques with two ears.',
    }),
    frame: choice('What kind of rack holds them?', {
      gabled: 'Two stout posts under a little gabled roof, with three rails.',
      long: 'A long low wall of rails under a lean-to roof, a rack for a busy shrine.',
      ring: 'A great wooden ring you can walk round, plaques hung all over it.',
      tree: 'No frame: plaques tied along a rope strung between two rough posts under a bough.',
    }),
    roof: choice('If it has a roof, what covers it?', {
      copper: 'Copper sheet gone pale green.',
      bark: 'Dark layered cypress bark.',
      tile: 'Grey ceramic tiles.',
      vermilion: 'Painted vermilion boards with black trim.',
    }),
    crowd: choice('How full is it, and why?', {
      newyear: 'Overflowing: plaques hung three and four deep in the first week of the year.',
      steady: 'Comfortably full, the ordinary accumulation of a year.',
      cleared: 'Mostly cleared for the ritual burning: bare hooks and a last few stragglers.',
      single: 'Almost empty; one or two plaques at a shrine nobody visits.',
    }),
    age: choice('How old do the plaques look?', {
      fresh: 'Pale new wood and bright ink.',
      weathered: 'Greyed by rain, ink run and faded.',
      mixed: 'Fresh ones hung over grey old ones.',
    }),
    fortunes: noul('Are white paper fortunes knotted along the rails as well?'),
    desk: noul('Is there a small writing shelf with pens and a stack of blank plaques?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const woodTone = new THREE.Color('#7a5536').lerp(new THREE.Color('#8c877c'), mood.wear * 0.6);
    const wood = s.material(woodTone, { roughness: 0.85 });
    const dark = s.material('#2b2622', { roughness: 0.8 });
    const vermilion = s.material('#d5401f', { roughness: 0.6 });
    const frameWood = a.roof === 'vermilion' && a.frame !== 'tree' ? vermilion : wood;

    // Plaque outline in a unit square, hanging point at the top centre.
    const outline = new THREE.Shape();
    if (a.shape === 'house') { outline.moveTo(0, 0); outline.lineTo(1, 0); outline.lineTo(1, 0.68); outline.lineTo(0.5, 1); outline.lineTo(0, 0.68); }
    else if (a.shape === 'round') outline.absarc(0.5, 0.5, 0.5, 0, Math.PI * 2, false);
    else if (a.shape === 'heart') {
      outline.moveTo(0.5, 0.02);
      outline.bezierCurveTo(0.0, 0.4, -0.08, 0.72, 0.14, 0.92);
      outline.bezierCurveTo(0.3, 1.04, 0.46, 0.94, 0.5, 0.8);
      outline.bezierCurveTo(0.54, 0.94, 0.7, 1.04, 0.86, 0.92);
      outline.bezierCurveTo(1.08, 0.72, 1.0, 0.4, 0.5, 0.02);
    } else { outline.moveTo(0.5, 0); outline.lineTo(0.92, 0.42); outline.lineTo(1, 1); outline.lineTo(0.68, 0.74); outline.lineTo(0.32, 0.74); outline.lineTo(0, 1); outline.lineTo(0.08, 0.42); }
    outline.closePath();
    const W = a.shape === 'house' ? 0.25 : 0.21, H = a.shape === 'house' ? 0.18 : 0.2;
    const plaqueGeometry = new THREE.ExtrudeGeometry(outline, { depth: 0.06, bevelEnabled: false, curveSegments: 8 });
    plaqueGeometry.translate(-0.5, -1, -0.03);
    plaqueGeometry.scale(W, H, 0.1);

    // Several painted faces; each becomes one instanced batch.
    const kinds = a.wishes === 'mixed' ? ['exams', 'love', 'health', 'fox', 'newyear'] as const : [a.wishes, a.wishes, a.wishes] as const;
    const face = (kind: Exclude<keyof typeof WISHES, 'mixed'>, old: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const paper = a.shape === 'fox' ? '#f2efe8' : a.shape === 'heart' ? '#f6cdd3' : '#e8cf9e';
      const base = new THREE.Color(paper).lerp(new THREE.Color('#9d978b'), old ? 0.7 : 0);
      ctx.fillStyle = `#${base.getHexString()}`;
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(90,60,30,0.08)'; ctx.fillRect(0, random() * 128, 128, 1 + random() * 2); }
      ctx.globalAlpha = old ? 0.45 : 1;
      const red = '#cf2a1e', px = 38, py = 62;
      if (a.shape === 'fox') {
        ctx.strokeStyle = '#1d1a18'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        const mood01 = random();
        for (const side of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(64 + side * 14, 52 + mood01 * 8); ctx.lineTo(64 + side * 38, 44 + (1 - mood01) * 10); ctx.stroke();
          ctx.fillStyle = red; ctx.beginPath(); ctx.moveTo(64 + side * 56, 14); ctx.lineTo(64 + side * 40, 30); ctx.lineTo(64 + side * 58, 36); ctx.fill();
          ctx.beginPath(); ctx.moveTo(64 + side * 6, 96); ctx.lineTo(64 + side * 22, 84 + random() * 6); ctx.stroke();
        }
        ctx.fillStyle = '#1d1a18'; ctx.beginPath(); ctx.arc(64, 112, 5, 0, 7); ctx.fill();
        ctx.fillStyle = red; ctx.beginPath(); ctx.arc(64, 70, 4, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = red; ctx.strokeStyle = red; ctx.lineWidth = 5;
        if (kind === 'exams') { ctx.beginPath(); ctx.ellipse(px, py + 8, 20, 24, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#f4ead4'; ctx.beginPath(); ctx.ellipse(px, py + 2, 12, 11, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#1d1a18'; ctx.fillRect(px - 8, py - 1, 5, 5); ctx.fillRect(px + 3, py - 1, 5, 5); }
        else if (kind === 'love') { ctx.beginPath(); ctx.moveTo(px, py + 30); ctx.bezierCurveTo(px - 40, py, px - 14, py - 26, px, py - 6); ctx.bezierCurveTo(px + 14, py - 26, px + 40, py, px, py + 30); ctx.fillStyle = '#e8497a'; ctx.fill(); }
        else if (kind === 'health') { ctx.strokeStyle = '#2f7a4a'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(px, py + 28); ctx.lineTo(px - 26 + i * 10, py - 18 + Math.abs(i - 2.5) * 5); ctx.stroke(); } ctx.fillStyle = red; ctx.beginPath(); ctx.arc(px + 16, py - 20, 9, 0, 7); ctx.fill(); }
        else if (kind === 'fox') { ctx.beginPath(); ctx.moveTo(px - 24, py - 22); ctx.lineTo(px - 10, py - 4); ctx.lineTo(px + 10, py - 4); ctx.lineTo(px + 24, py - 22); ctx.lineTo(px + 18, py + 12); ctx.lineTo(px, py + 30); ctx.lineTo(px - 18, py + 12); ctx.closePath(); ctx.fill(); }
        else { ctx.lineWidth = 6; ctx.strokeRect(px - 24, py - 22, 48, 48); ctx.beginPath(); ctx.arc(px, py + 2, 12, 0, 7); ctx.fill(); }
        ctx.strokeStyle = kind === 'exams' ? '#27407e' : '#1d1a18';
        for (let column = 0; column < 3; column++) for (let row = 0; row < 4; row++) if (random() < 0.85) glyph(ctx, 112 - column * 17, 48 + row * 17, 13, random);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
    };
    const faces = kinds.flatMap((kind) => {
      const olds = a.age === 'fresh' ? [false] : a.age === 'weathered' ? [true] : [false, true];
      return olds.map((old) => face(kind, old));
    });

    // Where plaques may hang: rails as line segments, each with an outward direction.
    const rails: { from: THREE.Vector3; to: THREE.Vector3; out: THREE.Vector3 }[] = [];
    const rail = (from: [number, number, number], to: [number, number, number], both = true) => {
      const f = new THREE.Vector3(...from), t = new THREE.Vector3(...to);
      const along = t.clone().sub(f).normalize();
      const out = new THREE.Vector3(-along.z, 0, along.x).multiplyScalar(-1);
      rails.push({ from: f, to: t, out });
      if (both) rails.push({ from: f, to: t, out: out.clone().negate() });
      s.rod(from, to, 0.02, frameWood);
    };
    const roofColour = { copper: '#7fb09a', bark: '#3b2d24', tile: '#70757a', vermilion: '#c93a1d' }[a.roof];
    const roofing = s.material(roofColour, { roughness: a.roof === 'tile' ? 0.5 : 0.9 });
    const gable = (width: number, depth: number, y: number, rise: number) => {
      const profile = new THREE.Shape();
      profile.moveTo(-depth / 2, 0); profile.quadraticCurveTo(-depth / 5, rise * 0.55, 0, rise); profile.quadraticCurveTo(depth / 5, rise * 0.55, depth / 2, 0);
      profile.lineTo(depth / 2, 0.05); profile.quadraticCurveTo(depth / 5, rise * 0.55 + 0.06, 0, rise + 0.07); profile.quadraticCurveTo(-depth / 5, rise * 0.55 + 0.06, -depth / 2, 0.05);
      profile.closePath();
      const geometry = new THREE.ExtrudeGeometry(profile, { depth: width, bevelEnabled: false, curveSegments: 6 });
      geometry.translate(0, 0, -width / 2);
      geometry.rotateY(Math.PI / 2);
      s.mesh(geometry, roofing, [0, y, 0]);
      s.box([width + 0.08, 0.07, 0.09], [0, y + rise + 0.07, 0], a.roof === 'vermilion' ? dark : roofing);
      // Ribs so the roof does not read as a blank slab.
      const ribs = Math.round(width / 0.22);
      for (let i = 0; i <= ribs; i++) for (const side of [-1, 1]) {
        s.rod([-width / 2 + i * width / ribs, y + rise + 0.05, 0], [-width / 2 + i * width / ribs, y + 0.07, side * depth / 2], 0.014, a.roof === 'vermilion' ? dark : roofing);
      }
    };

    let width = 1.9;
    if (a.frame === 'gabled') {
      for (const x of [-1, 1]) {
        s.box([0.13, 2.1, 0.13], [x * 0.95, 1.05, 0], frameWood);
        s.box([0.24, 0.12, 0.5], [x * 0.95, 0.06, 0], s.material('#9a998f', { roughness: 0.95 }));
        s.box([0.1, 0.1, 0.75], [x * 0.95, 2.1, 0], frameWood);
      }
      s.box([2.2, 0.1, 0.1], [0, 2.02, 0], frameWood);
      for (const y of [1.78, 1.36, 0.94]) rail([-0.9, y, 0], [0.9, y, 0]);
      gable(2.5, 1.05, 2.15, 0.36);
    } else if (a.frame === 'long') {
      width = 3.4;
      for (const x of [-1.7, -0.57, 0.57, 1.7]) {
        s.box([0.1, 1.9, 0.1], [x, 0.95, -0.12], frameWood);
        s.box([0.2, 0.1, 0.3], [x, 0.05, -0.12], s.material('#9a998f', { roughness: 0.95 }));
      }
      s.box([3.5, 1.5, 0.03], [0, 1.05, -0.17], s.material(woodTone.clone().multiplyScalar(0.75), { roughness: 0.9 }));
      for (const y of [1.7, 1.3, 0.9]) rail([-1.65, y, -0.08], [1.65, y, -0.08], false);
      const lean = s.box([3.8, 0.06, 0.8], [0, 2.0, 0.08], roofing);
      lean.rotation.x = 0.3;
      for (let i = 0; i <= 14; i++) s.box([0.03, 0.03, 0.82], [-1.82 + i * 0.26, 2.04, 0.08], a.roof === 'vermilion' ? dark : roofing).rotation.x = 0.3;
    } else if (a.frame === 'ring') {
      width = 1.9;
      const R = 0.95;
      s.cylinder(0.07, 0.09, 2.3, [0, 1.15, 0], frameWood, 12);
      s.cylinder(0.3, 0.36, 0.14, [0, 0.07, 0], s.material('#9a998f', { roughness: 0.95 }), 10);
      for (const y of [1.95, 1.5, 1.05]) {
        const hoop = s.ring(R, 0.02, [0, y, 0], frameWood);
        hoop.rotation.x = Math.PI / 2;
        const sides = 12;
        for (let i = 0; i < sides; i++) {
          const p = i / sides * Math.PI * 2, q = (i + 1) / sides * Math.PI * 2;
          const f = new THREE.Vector3(Math.sin(p) * R, y, Math.cos(p) * R), t = new THREE.Vector3(Math.sin(q) * R, y, Math.cos(q) * R);
          rails.push({ from: f, to: t, out: f.clone().add(t).setY(0).normalize() });
        }
        for (let i = 0; i < 4; i++) s.rod([0, y + 0.1, 0], [Math.sin(i * Math.PI / 2) * R, y, Math.cos(i * Math.PI / 2) * R], 0.014, frameWood);
      }
      s.mesh(new THREE.ConeGeometry(0.62, 0.34, 8), roofing, [0, 2.42, 0]);
      s.ball([0.07, 0.09, 0.07], [0, 2.63, 0], a.roof === 'vermilion' ? dark : roofing, 10);
    } else {
      width = 2.6;
      for (const x of [-1.3, 1.3]) {
        const post = s.cylinder(0.05, 0.075, 1.8, [x, 0.9, 0], wood, 8);
        post.rotation.z = x * 0.04;
      }
      const sag = (y: number): [number, number, number][] => [-1.3, -0.65, 0, 0.65, 1.3].map((x) => [x, y - (1 - (x / 1.3) ** 2) * 0.14, 0] as [number, number, number]);
      for (const y of [1.7, 1.15]) {
        const points = sag(y);
        s.tube(points, 0.014, s.material('#c8b27a', { roughness: 0.95 }));
        for (let i = 0; i < points.length - 1; i++) {
          const f = new THREE.Vector3(...points[i]), t = new THREE.Vector3(...points[i + 1]);
          rails.push({ from: f, to: t, out: new THREE.Vector3(0, 0, 1) }, { from: f, to: t, out: new THREE.Vector3(0, 0, -1) });
        }
      }
      // A cedar bough reaching over the rope.
      const bough = s.material('#4a3a2c', { roughness: 0.95 });
      s.tube([[-1.5, 2.15, -0.2], [-0.6, 2.25, 0], [0.5, 2.18, 0.1], [1.5, 2.05, 0]], 0.045, bough);
      const needles = s.material(new THREE.Color('#31553a').lerp(new THREE.Color('#6d6a45'), mood.wear * 0.4), { roughness: 0.9 });
      for (let i = 0; i < 9; i++) s.ball([0.3 + random() * 0.15, 0.09, 0.22], [-1.3 + i * 0.33, 2.16 + random() * 0.1, (random() - 0.5) * 0.3], needles, 8);
    }

    // Hang the plaques.
    const fill = { newyear: 1, steady: 0.62, cleared: 0.22, single: 0.02 }[a.crowd] * mix(0.8, 1.15, mood.density);
    const total = rails.reduce((sum, r) => sum + r.from.distanceTo(r.to), 0);
    const layers = a.crowd === 'newyear' ? 3 : a.crowd === 'steady' ? 2 : 1;
    const count = Math.max(a.crowd === 'single' ? 1 : 3, Math.round(total / (W * 0.8) * fill * layers * 0.75));
    const batches: { matrix: THREE.Matrix4; phase: number; pivot: THREE.Vector3; yaw: number; tilt: number }[][] = faces.map(() => []);
    const cordPoints: { at: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < count; i++) {
      let pick = random() * total, r = rails[0];
      for (const candidate of rails) { r = candidate; pick -= candidate.from.distanceTo(candidate.to); if (pick <= 0) break; }
      const layer = Math.floor(random() * layers);
      const at = r.from.clone().lerp(r.to, random());
      const drop = 0.03 + random() * 0.05 + layer * 0.012;
      const pivot = at.clone().addScaledVector(r.out, 0.03 + layer * 0.018);
      pivot.y -= 0.01;
      const yaw = Math.atan2(r.out.x, r.out.z) + (random() - 0.5) * 0.5;
      const tilt = (random() - 0.5) * 0.3;
      batches[Math.floor(random() * faces.length)].push({ matrix: new THREE.Matrix4(), phase: random() * 6, pivot: pivot.clone().setY(pivot.y - drop), yaw, tilt });
      cordPoints.push({ at: [pivot.x, pivot.y - drop / 2 + 0.005, pivot.z], size: drop / 0.06 });
    }
    const meshes = batches.map((batch, index) => {
      const mesh = new THREE.InstancedMesh(plaqueGeometry, faces[index], Math.max(batch.length, 1));
      mesh.count = batch.length;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    });
    const q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    const hang = (time: number, swing: number) => {
      batches.forEach((batch, index) => {
        batch.forEach((plaque, i) => {
          e.set(Math.sin(time * 2.1 + plaque.phase) * swing, plaque.yaw + Math.sin(time * 1.3 + plaque.phase * 2) * swing * 1.5, plaque.tilt, 'YXZ');
          plaque.matrix.compose(plaque.pivot, q.setFromEuler(e), one);
          meshes[index].setMatrixAt(i, plaque.matrix);
        });
        meshes[index].instanceMatrix.needsUpdate = true;
      });
    };
    hang(0, 0);
    for (const mesh of meshes) mesh.computeBoundingBox();
    if (cordPoints.length) {
      const cord = new THREE.CylinderGeometry(0.0035, 0.0035, 0.06, 4);
      s.scatter(cord, s.material(a.shape === 'heart' ? '#e8497a' : '#c8261f', { roughness: 0.9 }), cordPoints.map((p) => ({ at: p.at, size: 1 }))).castShadow = false;
    }

    if (a.fortunes) {
      const knots: { at: [number, number, number]; size: number }[] = [];
      const n = Math.round(mix(25, 110, mood.density));
      for (let i = 0; i < n; i++) {
        const r = rails[Math.floor(random() * rails.length)];
        const at = r.from.clone().lerp(r.to, random());
        knots.push({ at: [at.x, at.y + 0.02, at.z], size: 0.7 + random() * 0.6 });
      }
      const knot = new THREE.BoxGeometry(0.02, 0.1, 0.04);
      s.scatter(knot, new THREE.MeshStandardMaterial({ color: '#f6f4ec', roughness: 0.9 }), knots);
    }

    if (a.desk) {
      const x = width / 2 + 0.45;
      s.box([0.6, 0.04, 0.4], [x, 0.8, 0], wood);
      for (const dx of [-0.25, 0.25]) for (const dz of [-0.15, 0.15]) s.box([0.04, 0.8, 0.04], [x + dx, 0.4, dz], wood);
      const blank = s.material('#e8cf9e', { roughness: 0.85 });
      const stack = 4 + Math.floor(random() * 6);
      for (let i = 0; i < stack; i++) s.box([0.15, 0.012, 0.1], [x - 0.12 + (random() - 0.5) * 0.02, 0.827 + i * 0.012, 0.02], blank).rotation.y = (random() - 0.5) * 0.3;
      s.cylinder(0.035, 0.03, 0.09, [x + 0.16, 0.865, -0.06], dark, 10);
      for (let i = 0; i < 3; i++) s.rod([x + 0.16, 0.86, -0.06], [x + 0.16 + (i - 1) * 0.03, 0.99, -0.06 + (random() - 0.5) * 0.04], 0.006, i === 1 ? vermilion : dark);
      s.label('500', 0.14, 0.07, [x + 0.05, 0.86, 0.201], '#2b2622', '#f1e8c9');
    }

    const swing = mix(0.01, 0.2, mood.energy);
    return s.finish({ update: swing > 0.03 ? (_dt, time) => hang(time, swing) : undefined });
  },
});
