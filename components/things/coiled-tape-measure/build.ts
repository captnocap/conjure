import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

interface Sample { p: THREE.Vector3; w: THREE.Vector3 }
const UP = new THREE.Vector3(0, 1, 0);
const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };

function ribbon(samples: Sample[], width: number, tile: number) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  let run = 0;
  samples.forEach((sample, index) => {
    if (index) run += sample.p.distanceTo(samples[index - 1].p);
    for (const side of [-1, 1]) {
      positions.push(sample.p.x + sample.w.x * side * width / 2, sample.p.y + sample.w.y * side * width / 2, sample.p.z + sample.w.z * side * width / 2);
      uvs.push(run / tile, side < 0 ? 0 : 1);
    }
    if (index) { const b = index * 2; indices.push(b - 2, b - 1, b, b - 1, b + 1, b); }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const TAPES = {
  white: 'White oilcloth with red numerals, a draper\'s shop tape.',
  pink: 'Sugar-pink plastic from a child\'s first sewing kit.',
  linen: 'Unbleached linen gone soft and grey, the figures nearly rubbed away.',
  black: 'Black with gold figures, a gentleman\'s tailor\'s tape.',
  yellow: 'Classic yellow with black figures and brass tips.',
} as const;
const INK: Record<keyof typeof TAPES, [string, string]> = {
  white: ['#f3efe4', '#b3202a'], pink: ['#f2a3bd', '#ffffff'], linen: ['#cfc6b0', '#5a5348'], black: ['#1b1a1c', '#d9b24a'], yellow: ['#f2c81e', '#1a1a1a'],
};

export default defineThing({
  questions: {
    lay: choice('How is the tape lying?', {
      coil: 'Rolled into a tight neat coil standing on its edge, the last length trailing off.',
      tangle: 'Flung down in a twisted heap.',
      waist: 'Left standing in the closed ring of the last waist it went round.',
      cased: 'Pulled out of a round spring case with a button in the middle.',
      loops: 'Looping loosely back and forth across the table.',
    }),
    tape: choice('What is the tape like?', TAPES),
    length: score('How much of it is paid out across the table?', ['A short tail', 'A good arm\'s length', 'The whole sixty inches']),
    company: choice('What lies with it?', {
      alone: 'Nothing: the tape by itself.',
      notebook: 'A little notebook of measurements, old figures crossed out and new ones written beside them, and a pencil stub.',
      pins: 'A scatter of pins and a few safety pins from the fitting.',
      chalk: 'Flat triangles of tailor\'s chalk and a steel thimble.',
    }),
    chalk: choice('If there is chalk, what colour?', {
      white: 'White.',
      blue: 'Blue.',
      red: 'Brick red.',
      assorted: 'One of each: white, blue, red and yellow.',
    }),
    units: choice('How is the measuring scale printed?', {
      metric: 'Centimetres with fine millimetre subdivisions along one edge.',
      imperial: 'Large inch numerals and alternating eighth-inch ticks.',
      dual: 'Two opposed rows: centimetres above and inches below.',
      drafting: 'A bold half-scale drafting tape with boxed ten-unit intervals.',
    }),
    width: choice('How wide is the flexible tape?', {
      narrow: 'A narrow twelve-millimetre ribbon for small fittings.',
      standard: 'A normal twenty-two-millimetre tailoring tape.',
      broad: 'A broad twenty-eight-millimetre tape with roomy figures.',
      wide: 'An extra-wide thirty-five-millimetre measuring belt.',
    }),
    tip: choice('What reinforces the ends?', {
      brass: 'Flat folded brass end caps.',
      steel: 'Silver end caps with small dark rivets.',
      stitched: 'Folded cloth ends secured by contrasting stitches.',
      eyelet: 'Long brass ends pierced by a hanging eyelet.',
    }),
    reference: choice('What fitting references have been added to the tape?', {
      plain: 'No added marks.',
      bands: 'Three red reference bands mark repeated measurements.',
      initials: 'Small handwritten initials sit between the graduations.',
      repair: 'A pale stitched repair patch crosses the middle of the tape.',
    }),
    keeper: choice('If the tape is coiled or cased, how is it kept together?', {
      none: 'Nothing holds it closed.',
      elastic: 'A dark elastic band embraces the coil or case.',
      ribbon: 'A tied ribbon crosses the coil or case, with two bow loops.',
      clip: 'A small spring clip grips its upper rim.',
    }),
    storage: choice('What storage lies beside the tape?', {
      none: 'No storage.',
      pouch: 'A soft leather sleeve with a folded opening.',
      carton: 'An open shallow cardboard box with a separate lid.',
      wallet: 'An open felt needle wallet with its fastening button.',
    }),
    marked: noul('Are there chalk fitting marks, dashes and crosses, on the surface under it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = { narrow: 0.012, standard: 0.022, broad: 0.028, wide: 0.035 }[a.width], low = 0.0014;
    const [paper, ink] = INK[a.tape];
    const rubbed = a.tape === 'linen' ? 0.75 : mood.wear * 0.7;

    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, 2048, 64);
    ctx.fillStyle = ink;
    ctx.globalAlpha = 1 - rubbed * 0.7;
    ctx.font = 'bold 30px sans-serif';
    ctx.textBaseline = 'middle';
    const divisions = a.units === 'imperial' ? 20 : a.units === 'drafting' ? 25 : 50;
    for (let n = 0; n < divisions; n++) {
      const step = 2048 / divisions, x = n * step;
      ctx.fillRect(x, 0, 3, a.units === 'dual' ? 19 : 32);
      const parts = a.units === 'imperial' ? 8 : 10;
      for (let j = 1; j < parts; j++) ctx.fillRect(x + j * step / parts, 0, 1.5, j === parts / 2 ? 20 : 10);
      ctx.font = a.units === 'dual' ? 'bold 19px sans-serif' : 'bold 28px sans-serif';
      if (n) ctx.fillText(String(a.units === 'drafting' ? n * 2 : n), x + 5, a.units === 'dual' ? 24 : 46, step - 7);
      if (a.units === 'drafting' && n % 5 === 0) ctx.strokeRect(x + 2, 28, step - 4, 32);
    }
    if (a.units === 'dual') for (let n = 0; n < 20; n++) {
      const x = n * 102.4;
      ctx.fillRect(x, 44, 3, 20); ctx.fillText(String(n), x + 7, 49, 35);
      for (let j = 1; j < 8; j++) ctx.fillRect(x + j * 12.8, j === 4 ? 50 : 57, 1.5, j === 4 ? 14 : 7);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(120,90,50,0.3)';
    for (let i = 0; i < mood.wear * 30; i++) ctx.fillRect(random() * 2048, 0, 20 + random() * 80, 64);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    const tapeMat = new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: a.tape === 'pink' || a.tape === 'white' ? 0.5 : 0.85 });

    // Lay out the tape as a run of centre points with the direction its width faces.
    const samples: Sample[] = [];
    const flatTail = (from: THREE.Vector3, heading: number, length: number, startUpright: boolean, startY: number) => {
      let h = heading;
      const p = from.clone(), swing = random() * 6, turn = (random() < 0.5 ? -1 : 1) * mix(2.5, 5, random());
      for (let run = 0; run < length; run += 0.004) {
        h = heading + Math.sin(run * 13 + swing) * 0.9 - Math.sin(swing) * 0.9 + run * turn;
        p.x += Math.cos(h) * 0.004;
        p.z += Math.sin(h) * 0.004;
        const k = smooth(run / 0.07), side = new THREE.Vector3(-Math.sin(h), 0, Math.cos(h));
        samples.push({ p: new THREE.Vector3(p.x, mix(startY, low + 0.0012 * Math.sin(run * 40), k), p.z), w: startUpright ? UP.clone().multiplyScalar(1 - k).addScaledVector(side, k).normalize() : side });
      }
    };
    const paid = mix(0.08, 0.5, a.length);
    if (a.lay === 'coil') {
      const turns = mix(17, 10, a.length);
      for (let t = 0; t < turns * Math.PI * 2; t += 0.14) {
        const r = 0.007 + 0.0021 * t / (Math.PI * 2);
        samples.push({ p: new THREE.Vector3(Math.cos(t) * r, W / 2 + 0.0005, Math.sin(t) * r), w: UP.clone() });
      }
      flatTail(samples.at(-1)!.p, turns * Math.PI * 2 + Math.PI / 2, mix(0.06, 0.3, a.length), true, W / 2 + 0.0005);
    } else if (a.lay === 'waist') {
      const R = mix(0.085, 0.13, random());
      for (let t = 0; t < Math.PI * 2 + 0.7; t += 0.05) {
        const r = R - 0.0012 * t + Math.sin(t * 3) * R * 0.035;
        samples.push({ p: new THREE.Vector3(Math.cos(t) * r, W / 2 + 0.0005, Math.sin(t) * r * 0.86), w: UP.clone() });
      }
      flatTail(samples.at(-1)!.p, Math.PI * 2 + 0.7 + Math.PI / 2 + 0.5, paid * 0.5 + 0.05, true, W / 2 + 0.0005);
    } else if (a.lay === 'loops') {
      const loops = 2 + Math.round(a.length * 3), span = 0.1 + a.length * 0.22, R = 0.05, twist = random() * 6;
      const at = (t: number) => { const phi = t * Math.PI * 2 * loops + twist; return new THREE.Vector3(span * (t - 0.5) + R * Math.sin(phi), low + 0.004 * (0.5 + 0.5 * Math.cos(phi)), R * 0.85 * Math.cos(phi) + 0.025 * Math.sin(t * 5 + twist)); };
      const steps = loops * 90;
      for (let i = 0; i <= steps; i++) {
        const p = at(i / steps), tangent = at((i + 0.5) / steps).sub(at((i - 0.5) / steps)).normalize();
        samples.push({ p, w: new THREE.Vector3().crossVectors(UP, tangent).normalize() });
      }
    } else if (a.lay === 'tangle') {
      const control: THREE.Vector3[] = [], lean: number[] = [];
      const count = 12 + Math.round(a.length * 14);
      let spin = random() * 6, tilt = 0;
      for (let i = 0; i < count; i++) {
        const edge = Math.min(i, count - 1 - i) < 2;
        spin += 1.4 + random() * 2.2;
        const r = edge ? 0.085 + random() * 0.03 : random() * 0.055;
        control.push(new THREE.Vector3(Math.cos(spin) * r, edge ? low : 0.004 + random() * 0.03, Math.sin(spin) * r * 0.8));
        tilt = edge ? 0 : tilt + (random() - 0.5) * 1.6;
        lean.push(tilt);
      }
      const curve = new THREE.CatmullRomCurve3(control);
      const steps = count * 22;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, p = curve.getPoint(t), tangent = curve.getTangent(t);
        const side = new THREE.Vector3().crossVectors(UP, tangent);
        if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
        side.normalize();
        const f = t * (count - 1), i0 = Math.floor(f), alpha = mix(lean[i0], lean[Math.min(count - 1, i0 + 1)], f - i0);
        const w = side.multiplyScalar(Math.cos(alpha)).addScaledVector(UP, Math.sin(alpha)).normalize();
        p.y = Math.max(p.y, low + Math.abs(w.y) * W / 2);
        samples.push({ p, w });
      }
    } else {
      const shell = s.material(['#b3202a', '#2c5fa8', '#d9d4c8', '#2f8f6a'][Math.floor(random() * 4)], { roughness: 0.35, metalness: 0.15 });
      const chrome = s.material('#d5d9dc', { metalness: 0.9, roughness: 0.25 });
      s.cylinder(0.031, 0.031, 0.022, [0, 0.011, 0], shell, 36);
      s.cylinder(0.032, 0.032, 0.004, [0, 0.011, 0], chrome, 36);
      s.cylinder(0.011, 0.012, 0.004, [0, 0.0235, 0], chrome, 20);
      s.box([0.008, 0.02, 0.022], [0.031, 0.011, 0], chrome);
      flatTail(new THREE.Vector3(0.033, 0, 0), 0, paid + 0.06, false, 0.011);
      samples.forEach((sample, index) => { if (index < 8) sample.w.set(0, 1, 0).lerp(new THREE.Vector3(0, 0, 1), smooth(index / 8)).normalize(); });
    }
    s.mesh(ribbon(samples, W, 0.5), tapeMat);
    if (a.reference !== 'plain') {
      // Reference annotations use one full-length UV run; only the graduations repeat.
      let total = 0;
      for (let i = 1; i < samples.length; i++) total += samples[i].p.distanceTo(samples[i - 1].p);
      const marks = document.createElement('canvas'); marks.width = 2048; marks.height = 64;
      const mc = marks.getContext('2d')!;
      if (a.reference === 'bands') { mc.fillStyle = '#aa2d37'; for (const x of [410, 1024, 1638]) mc.fillRect(x, 0, Math.max(5, 2048 * 0.003 / total), 64); }
      else if (a.reference === 'initials') { mc.fillStyle = '#35353a'; mc.font = 'italic 28px cursive'; mc.fillText('A.B.', 1450, 55, Math.max(75, 2048 * 0.02 / total)); }
      else { const width = Math.min(700, 2048 * 0.022 / total), x = 1024 - width / 2; mc.fillStyle = '#e8dcc0'; mc.fillRect(x, 0, width, 64); mc.strokeStyle = '#7a6451'; mc.lineWidth = 2; mc.setLineDash([5, 4]); mc.strokeRect(x + 3, 5, Math.max(4, width - 6), 54); }
      const map = new THREE.CanvasTexture(marks); map.colorSpace = THREE.SRGBColorSpace;
      const overlay = ribbon(samples, W, Math.max(total, 0.001));
      // Bias the coplanar ink toward the camera on both ribbon faces, including twists.
      s.mesh(overlay, s.material('#ffffff', { map, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    }

    // Brass tips.
    const brass = s.material(a.tip === 'steel' ? '#c6d0d5' : a.tip === 'stitched' ? '#d8c5a2' : '#c79a3e', { metalness: a.tip === 'stitched' ? 0 : 0.85, roughness: a.tip === 'stitched' ? 0.9 : 0.3 });
    for (const end of a.lay === 'cased' ? [samples.at(-1)!] : [samples[0], samples.at(-1)!]) {
      const tip = s.box([a.tip === 'eyelet' ? 0.012 : 0.006, 0.0012, W + 0.001], [end.p.x, end.p.y, end.p.z], brass);
      const other = end === samples[0] ? samples[1] : samples.at(-2)!;
      const tangent = end.p.clone().sub(other.p).normalize(), normal = new THREE.Vector3().crossVectors(tangent, end.w).normalize();
      tip.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent, normal, end.w));
      if (a.tip === 'eyelet') {
        const hole = new THREE.Mesh(new THREE.TorusGeometry(0.002, 0.0005, 5, 16), brass);
        hole.rotation.x = Math.PI / 2; hole.position.y = 0.001; tip.add(hole);
        const dark = new THREE.Mesh(new THREE.CircleGeometry(0.0015, 14), s.material('#3f382b'));
        dark.rotation.x = -Math.PI / 2; dark.position.y = 0.0007; tip.add(dark);
      } else if (a.tip === 'stitched' || a.tip === 'steel') {
        for (let k = -1; k <= 1; k++) {
          const stitch = new THREE.Mesh(new THREE.BoxGeometry(a.tip === 'steel' ? 0.001 : 0.003, 0.0005, 0.0008), s.material('#4b4336'));
          stitch.position.set(0, 0.0008, k * W * 0.3); tip.add(stitch);
        }
      }
    }

    const bounds = new THREE.Box3();
    for (const sample of samples) bounds.expandByPoint(sample.p);
    if (a.lay === 'cased') bounds.expandByPoint(new THREE.Vector3(-0.032, 0, -0.032)).expandByPoint(new THREE.Vector3(0, 0, 0.032));
    const frontZ = bounds.max.z + 0.03, midX = (bounds.min.x + bounds.max.x) / 2;

    if ((a.lay === 'coil' || a.lay === 'cased') && a.keeper !== 'none') {
      const radius = a.lay === 'cased' ? 0.033 : 0.007 + 0.0021 * mix(17, 10, a.length);
      const topY = a.lay === 'cased' ? 0.027 : W + 0.001;
      const strap = s.material(a.keeper === 'ribbon' ? '#94495c' : '#493f37');
      if (a.keeper === 'clip') {
        s.box([0.016, 0.002, 0.009], [radius - 0.004, topY + 0.001, 0], brass);
        s.rod([radius + 0.003, topY, 0], [radius + 0.003, 0.004, 0], 0.001, brass);
      } else {
        s.box([radius * 2, 0.001, 0.008], [0, topY, 0], strap);
        for (const side of [-1, 1]) s.box([0.001, topY, 0.008], [side * radius, topY / 2, 0], strap);
        if (a.keeper === 'ribbon') for (const side of [-1, 1]) {
          const loop = s.ring(0.009, 0.0012, [side * 0.008, topY + 0.002, 0], strap);
          loop.rotation.x = -Math.PI / 2; loop.scale.z = 0.6;
        }
      }
    }
    if (a.storage !== 'none') {
      const x = bounds.min.x - 0.075, z = (bounds.min.z + bounds.max.z) / 2;
      const cover = s.material(a.storage === 'pouch' ? '#815a40' : a.storage === 'wallet' ? '#6c8790' : '#c7ad83');
      if (a.storage === 'pouch') {
        s.box([0.11, 0.004, 0.075], [x, 0.002, z], cover);
        s.box([0.105, 0.005, 0.06], [x, 0.008, z + 0.006], cover);
        s.box([0.1, 0.002, 0.014], [x, 0.012, z - 0.025], cover);
      } else if (a.storage === 'carton') {
        s.box([0.11, 0.002, 0.075], [x, 0.001, z], cover);
        for (const side of [-1, 1]) {
          s.box([0.002, 0.022, 0.075], [x + side * 0.054, 0.013, z], cover);
          s.box([0.11, 0.022, 0.002], [x, 0.013, z + side * 0.036], cover);
        }
        s.box([0.116, 0.005, 0.081], [x, 0.0025, z + 0.095], cover);
      } else {
        s.box([0.14, 0.003, 0.08], [x, 0.0015, z], cover);
        s.box([0.065, 0.003, 0.07], [x + 0.035, 0.0045, z], s.material('#e8d9ba'));
        for (let i = 0; i < 5; i++) s.rod([x + 0.014 + i * 0.01, 0.0065, z - 0.02], [x + 0.014 + i * 0.01, 0.0065, z + 0.02], 0.0006, brass);
        s.cylinder(0.004, 0.004, 0.002, [x - 0.055, 0.004, z], brass, 12);
      }
    }

    const chalkTints = { white: ['#f4f2ea'], blue: ['#4f7fc4'], red: ['#b5553f'], assorted: ['#f4f2ea', '#4f7fc4', '#b5553f', '#e6c23a'] }[a.chalk];
    if (a.company === 'chalk') {
      const pieces = a.chalk === 'assorted' ? 4 : 1 + Math.floor(random() * 2 + mood.density * 1.5);
      for (let i = 0; i < pieces; i++) {
        const size = mix(0.018, 0.03, random()) * (i === 0 ? 1.1 : 1);
        const shape = new THREE.Shape();
        for (let k = 0; k < 3; k++) { const t = k * Math.PI * 2 / 3 + Math.PI / 2; if (k === 0) shape.moveTo(Math.cos(t) * size, Math.sin(t) * size); else shape.lineTo(Math.cos(t) * size, Math.sin(t) * size); }
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0018, bevelSize: 0.0035, bevelSegments: 2 });
        geometry.rotateX(-Math.PI / 2);
        const piece = s.mesh(geometry, s.material(chalkTints[i % chalkTints.length], { roughness: 1 }), [midX - 0.06 + i * 0.055 + (random() - 0.5) * 0.015, 0.0018, frontZ + 0.03 + (random() - 0.5) * 0.03]);
        piece.rotation.y = random() * 6;
      }
      const thimble = s.lathe([[0.0085, 0], [0.0092, 0.001], [0.0083, 0.014], [0.0068, 0.02], [0.004, 0.0225], [0, 0.023]], s.material('#c4c8cb', { metalness: 0.9, roughness: 0.32, side: THREE.DoubleSide }), [bounds.max.x + 0.02, 0, frontZ - 0.02]);
      if (random() < 0.4) { thimble.rotation.z = Math.PI / 2 + 0.12; thimble.position.y = 0.009; }
    } else if (a.company === 'notebook') {
      const page = document.createElement('canvas');
      page.width = 256;
      page.height = 320;
      const pc = page.getContext('2d')!;
      pc.fillStyle = '#f1ead6';
      pc.fillRect(0, 0, 256, 320);
      pc.fillStyle = 'rgba(90,130,190,0.45)';
      for (let y = 46; y < 320; y += 34) pc.fillRect(0, y, 256, 2);
      pc.fillStyle = '#2a2f55';
      pc.font = 'italic bold 28px cursive';
      const rows = ['Bust', 'Waist', 'Hip', 'Sleeve', 'Nape', 'Hem', 'Chest', 'Inseam'].sort(() => random() - 0.5).slice(0, 6);
      rows.forEach((label, i) => {
        const first = 24 + Math.floor(random() * 16), second = first + Math.round(mix(-1, 4, random())), y = 40 + i * 44;
        pc.fillText(label, 12, y, 110);
        pc.fillText(String(first), 128, y);
        if (second !== first) {
          pc.fillRect(122, y - 10, 44, 3);
          pc.fillText(String(second), 186, y);
          if (random() < 0.4) { pc.fillRect(180, y - 10, 44, 3); pc.fillText(String(second + 1 + Math.floor(random() * 3)), 186, y + 22, 40); }
        }
      });
      const pageMap = new THREE.CanvasTexture(page);
      pageMap.colorSpace = THREE.SRGBColorSpace;
      const book = new THREE.Group();
      const cover = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.003, 0.1), s.material('#3a2a22', { roughness: 0.8 }));
      cover.position.y = 0.0015;
      const sheet = s.material('#efe8d4', { roughness: 0.95 });
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.004, 0.094), sheet);
      left.position.set(-0.036, 0.005, 0);
      const right = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.004, 0.094), [sheet, sheet, new THREE.MeshStandardMaterial({ map: pageMap, roughness: 0.95 }), sheet, sheet, sheet]);
      right.position.set(0.036, 0.005, 0);
      book.add(cover, left, right);
      const pencil = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.07, 6), s.material('#e3b22e', { roughness: 0.5 }));
      shaft.rotation.z = Math.PI / 2;
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.011, 6), s.material('#d9b98a'));
      point.rotation.z = -Math.PI / 2;
      point.position.x = 0.0405;
      const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0012, 0.004, 6), s.material('#2a2a2e'));
      lead.rotation.z = -Math.PI / 2;
      lead.position.x = 0.0445;
      pencil.add(shaft, point, lead);
      pencil.position.set(-0.03, 0.0105, 0.012);
      pencil.rotation.y = 0.5 + random() * 0.6;
      book.add(pencil);
      book.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      book.position.set(midX + (random() - 0.5) * 0.04, 0, frontZ + 0.06);
      book.rotation.y = (random() - 0.5) * 0.5;
      s.root.add(book);
    } else if (a.company === 'pins') {
      const steel = s.material('#cfd3d6', { metalness: 0.85, roughness: 0.3 });
      const count = 8 + Math.floor(mood.density * 16);
      const shafts: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < count; i++) {
        const x = mix(bounds.min.x, bounds.max.x, random()), z = frontZ + random() * 0.07, t = random() * Math.PI;
        const pin = s.rod([x, 0.001, z], [x + Math.cos(t) * 0.028, 0.001, z + Math.sin(t) * 0.028], 0.0006, steel);
        pin.castShadow = false;
        shafts.push({ at: [x, 0.0022, z], size: 1 });
      }
      s.scatter(new THREE.SphereGeometry(0.0022, 8, 6), s.material('#ffffff', { roughness: 0.3 }), shafts.map((shaft, i) => ({ ...shaft, color: ['#e2332e', '#f2c21d', '#f4f1ea', '#2c7fd1', '#2fa35a'][i % 5] })));
    }

    // Fitting marks chalked straight on the surface.
    if (a.marked) {
      const tint = chalkTints[0];
      const dashes: THREE.Matrix4[] = [];
      const cx = midX, cz = (bounds.min.z + bounds.max.z) / 2, rx = (bounds.max.x - bounds.min.x) / 2 + 0.05, rz = (bounds.max.z - bounds.min.z) / 2 + 0.04;
      const q = new THREE.Quaternion();
      const from = random() * 6, sweep = mix(2.2, 4.2, random());
      for (let t = from; t < from + sweep; t += 0.16) {
        q.setFromAxisAngle(UP, -(t + Math.PI / 2) + (random() - 0.5) * 0.15);
        dashes.push(new THREE.Matrix4().compose(new THREE.Vector3(cx + Math.cos(t) * rx, 0.0004, cz + Math.sin(t) * rz), q, new THREE.Vector3(mix(0.014, 0.022, random()), 1, 1)));
      }
      for (let i = 0; i < 3; i++) {
        const t = from + sweep + 0.4 + i * 0.7, x = cx + Math.cos(t) * rx * 0.9, z = cz + Math.sin(t) * rz * 0.9, turn = random() * 3;
        for (const arm of [0, Math.PI / 2]) dashes.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.0004, z), q.clone().setFromAxisAngle(UP, turn + arm), new THREE.Vector3(0.022, 1, 1)));
      }
      const marks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.0005, 0.0026), new THREE.MeshStandardMaterial({ color: tint, roughness: 1 }), dashes.length);
      dashes.forEach((matrix, index) => marks.setMatrixAt(index, matrix));
      marks.receiveShadow = true;
      s.root.add(marks);
    }

    return s.finish();
  },
});
