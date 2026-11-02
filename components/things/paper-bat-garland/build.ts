import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, paint, paintHex, score } from '@conjure/kit';

type R = () => number;
type Kind = 'bat' | 'cat' | 'ghost' | 'witch';
type XY = [number, number];

/** The outline of one cut-out, in metres, about 0.18 m across, with a little scissor wobble. */
function cutout(kind: Kind, random: R): { shapes: THREE.Shape[]; eyes: XY[] } {
  const wob = () => (random() - 0.5) * 0.004;
  const fromPoints = (pts: XY[]) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x + wob(), y + wob()) : s.moveTo(x, y))); s.closePath(); return s; };
  if (kind === 'bat') {
    const right: XY[] = [[0, 0.026], [0.011, 0.045], [0.016, 0.024], [0.03, 0.022], [0.05, 0.03], [0.072, 0.04], [0.092, 0.05], [0.086, 0.028], [0.078, 0.004], [0.064, 0.014], [0.052, -0.01], [0.038, 0.002], [0.024, -0.016], [0.012, -0.012], [0, -0.034]];
    const left = right.slice(1, -1).reverse().map(([x, y]) => [-x, y] as XY);
    return { shapes: [fromPoints([...right, ...left])], eyes: [[-0.008, 0.016], [0.008, 0.016]] };
  }
  if (kind === 'cat') {
    const head = new THREE.Shape(); head.absarc(0, 0.045, 0.028, 0, Math.PI * 2, false);
    const ears = fromPoints([[-0.026, 0.05], [-0.024, 0.088], [-0.004, 0.068], [0.004, 0.068], [0.024, 0.088], [0.026, 0.05]]);
    const body = new THREE.Shape(); body.absellipse(0, -0.03, 0.04, 0.055, 0, Math.PI * 2, false, 0);
    const tail = new THREE.Shape(); tail.moveTo(0.03, -0.07); tail.quadraticCurveTo(0.095, -0.07, 0.085, -0.01); tail.quadraticCurveTo(0.082, 0.02, 0.07, 0.02); tail.quadraticCurveTo(0.074, -0.05, 0.03, -0.055); tail.closePath();
    return { shapes: [head, ears, body, tail], eyes: [[-0.011, 0.05], [0.011, 0.05]] };
  }
  if (kind === 'ghost') {
    const g = new THREE.Shape();
    g.moveTo(-0.045, -0.055); g.lineTo(-0.047, 0.02); g.absarc(0, 0.02, 0.047, Math.PI, 0, true); g.lineTo(0.045, -0.055);
    for (let i = 0; i < 4; i++) { const x0 = 0.045 - i * 0.0225; g.quadraticCurveTo(x0 - 0.011, -0.075 + wob(), x0 - 0.0225, -0.055); }
    g.closePath();
    for (const x of [-0.016, 0.016]) { const eye = new THREE.Path(); eye.absellipse(x, 0.025, 0.007, 0.011, 0, Math.PI * 2, true, 0); g.holes.push(eye); }
    const mouth = new THREE.Path(); mouth.absellipse(0, -0.005, 0.009, 0.012, 0, Math.PI * 2, true, 0); g.holes.push(mouth);
    return { shapes: [g], eyes: [[-0.016, 0.025], [0.016, 0.025]] };
  }
  // A witch riding her broom, facing right.
  const broom = fromPoints([[-0.08, -0.004], [0.085, 0.006], [0.085, 0.0], [-0.08, -0.01]]);
  const bristles = fromPoints([[-0.075, 0.0], [-0.115, 0.022], [-0.122, 0.002], [-0.118, -0.022], [-0.075, -0.014]]);
  const cape = fromPoints([[-0.018, -0.004], [0.026, -0.004], [0.022, 0.05], [0.004, 0.056], [-0.06, 0.03], [-0.035, 0.022], [-0.05, 0.008]]);
  const head = new THREE.Shape(); head.absarc(0.016, 0.066, 0.013, 0, Math.PI * 2, false);
  const nose = fromPoints([[0.026, 0.07], [0.042, 0.062], [0.026, 0.06]]);
  const hat = fromPoints([[-0.012, 0.074], [0.044, 0.078], [0.044, 0.084], [0.024, 0.084], [-0.006, 0.124], [0.006, 0.084], [-0.012, 0.082]]);
  const leg = fromPoints([[0.01, -0.004], [0.03, -0.03], [0.04, -0.028], [0.022, -0.004]]);
  return { shapes: [broom, bristles, cape, head, nose, hat, leg], eyes: [[0.02, 0.068]] };
}

function glitterTexture(random: R) {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) { ctx.fillStyle = `hsl(${40 + random() * 30},80%,${60 + random() * 40}%)`; ctx.fillRect(random() * 128, random() * 128, 1.5, 1.5); }
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 12);
  return t;
}

export default defineThing({
  questions: {
    figures: choice('What are the paper cut-outs?', {
      bats: 'Bats with scalloped wings and pointy ears.',
      cats: 'Sitting black cats with curled tails.',
      ghosts: 'Round-topped ghosts with wavy hems and cut-out eyes.',
      witches: 'Little witches riding broomsticks.',
      mixed: 'A mixed batch from the whole class: bats, cats, ghosts and witches.',
    }),
    hung: choice('What is it strung between?', {
      hooks: 'Two black wrought-iron shepherd\'s hooks staked in the lawn.',
      railing: 'The posts of a white-painted wooden porch railing.',
      mantel: 'The two ends of a fireplace mantelpiece indoors.',
    }),
    count: score('How many cut-outs are on the string?', ['Five lonely ones', 'About eight', 'A dozen', 'Crammed with sixteen']),
    sag: score('How does the string hang?', ['Pulled nearly taut', 'A gentle swag', 'Sagging low in the middle', 'Drooping deep, almost to the ground']),
    decor: choice('How are the cut-outs decorated?', {
      plain: 'Plain paper, carefully cut.',
      googly: 'Wobbly stick-on googly eyes.',
      glitter: 'Glitter glue smeared across them.',
      both: 'Googly eyes and glitter: the full craft table.',
    }),
    paper: paint('What colour is the paper?', ['black', 'orange', 'purple', 'white', 'lime', 'charcoal', 'red', 'gold']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    // ---- the supports ----
    let left = new THREE.Vector3(), right = new THREE.Vector3();
    let scallops = 1;
    const n = Math.round(mix(5, 16, a.count));
    if (a.hung === 'hooks') {
      const iron = s.material('#1c1c1e', { roughness: 0.5, metalness: 0.5 });
      const span = 1.5, top = 1.25;
      for (const side of [-1, 1]) {
        const x = side * span / 2;
        s.rod([x, -0.15, 0], [x, top, 0], 0.009, iron);
        // The crook, curling inward over the garland end.
        const crook: [number, number, number][] = [];
        for (let i = 0; i <= 14; i++) { const t = i / 14 * Math.PI * 1.15; crook.push([x - side * (0.09 - Math.cos(t) * 0.09), top + Math.sin(t) * 0.09, 0]); }
        s.tube(crook, 0.008, iron);
        s.rod([x - side * 0.04, 0.05, 0], [x + side * 0.04, 0.05, 0], 0.006, iron);
        const end = crook[crook.length - 1];
        (side < 0 ? left : right).set(end[0], end[1] - 0.02, 0);
      }
      left.y -= 0.03; right.y -= 0.03;
    } else if (a.hung === 'railing') {
      const paintWood = s.material(mood.wear > 0.6 ? '#d9d2c0' : '#f1eee6', { roughness: 0.7 });
      const span = 1.7;
      for (const side of [-1, 1]) {
        s.box([0.09, 1.0, 0.09], [side * span / 2, 0.5, 0], paintWood);
        s.box([0.12, 0.04, 0.12], [side * span / 2, 1.02, 0], paintWood);
        s.ball([0.03, 0.03, 0.03], [side * span / 2, 1.06, 0], paintWood, 12);
      }
      s.box([span, 0.05, 0.08], [0, 0.94, 0], paintWood);
      s.box([span, 0.04, 0.06], [0, 0.08, 0], paintWood);
      for (let x = -span / 2 + 0.13; x < span / 2 - 0.08; x += 0.12) s.box([0.032, 0.84, 0.032], [x, 0.5, 0], paintWood);
      left.set(-span / 2 + 0.05, 0.9, 0.07); right.set(span / 2 - 0.05, 0.9, 0.07);
      if (n > 10) scallops = 2;
    } else {
      const wood = s.material(random() < 0.5 ? '#efe9dc' : '#6a4630', { roughness: 0.6 });
      const brick = s.material('#7a3a2a', { roughness: 0.95 });
      const span = 1.7, h = 1.15;
      for (const side of [-1, 1]) s.box([0.2, h, 0.12], [side * (span / 2 - 0.1), h / 2, 0], wood);
      s.box([span - 0.4, 0.2, 0.12], [0, h - 0.1, 0], wood);
      s.box([span - 0.4, h - 0.2, 0.05], [0, (h - 0.2) / 2, -0.04], brick);
      s.box([0.7, 0.62, 0.02], [0, 0.31, -0.005], s.material('#141210', { roughness: 1 }));
      s.box([span + 0.16, 0.06, 0.24], [0, h + 0.03, 0.03], wood);
      s.box([span + 0.3, 0.04, 0.4], [0, 0.02, 0.12], brick);
      left.set(-span / 2 - 0.05, h + 0.0, 0.15); right.set(span / 2 + 0.05, h + 0.0, 0.15);
      if (n > 10) scallops = 2;
    }

    // ---- the string ----
    const L = right.x - left.x;
    const maxDrop = a.hung === 'hooks' ? 1.0 : a.hung === 'railing' ? 0.6 : 0.85;
    const drop = mix(0.04, maxDrop, a.sag) / scallops * (scallops > 1 ? 1.3 : 1);
    const stringAt = (t: number) => {
      // t from 0 to 1 along the run; each scallop is a parabola between tacks.
      const k = t * scallops, local = k - Math.floor(Math.min(k, scallops - 1e-6));
      const x = mix(left.x, right.x, t), y = mix(left.y, right.y, t) - drop * 4 * local * (1 - local);
      return new THREE.Vector3(x, y, mix(left.z, right.z, t));
    };
    const twine = s.material('#8a7a5a', { roughness: 1 });
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 40; i++) pts.push(stringAt(i / 40).toArray() as [number, number, number]);
    s.tube(pts, 0.0025, twine);
    for (let k = 1; k < scallops; k++) s.ball([0.009, 0.009, 0.009], stringAt(k / scallops).toArray() as [number, number, number], s.material('#c8102e', { roughness: 0.3 }), 8);
    for (const p of [left, right]) s.ball([0.008, 0.008, 0.008], p.toArray() as [number, number, number], s.material('#c9ccd1', { metalness: 0.8 }), 8);

    // ---- the cut-outs ----
    const colour = paintHex(a.paper);
    const glitter = a.decor === 'glitter' || a.decor === 'both';
    const sparkle = glitter ? glitterTexture(random) : null;
    const paper = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colour).lerp(new THREE.Color('#8b8275'), mood.wear * 0.2), roughness: glitter ? 0.45 : 0.95, metalness: glitter ? 0.3 : 0, side: THREE.DoubleSide,
      emissive: glitter ? new THREE.Color('#fff3c0') : new THREE.Color('#000'), emissiveMap: sparkle, emissiveIntensity: glitter ? 0.5 + mood.cheer * 0.6 : 0,
    });
    const googly = a.decor === 'googly' || a.decor === 'both';
    const white = s.material('#fbfbf6', { roughness: 0.3 }), pupil = s.material('#0e0e10', { roughness: 0.3 });
    const kinds: Kind[] = a.figures === 'mixed' ? ['bat', 'cat', 'ghost', 'witch'] : [({ bats: 'bat', cats: 'cat', ghosts: 'ghost', witches: 'witch' } as const)[a.figures]];
    const spacing = L / (n + 0.6);
    const width = Math.min(0.3, Math.max(0.15, spacing * 1.45));
    const swingers: { pivot: THREE.Group; phase: number; base: number; twist: number }[] = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.8) / (n + 0.6) + (random() - 0.5) * 0.25 / n;
      const kind = a.figures === 'mixed' ? kinds[(i + Math.floor(random() * 2)) % kinds.length] : kinds[0];
      const { shapes, eyes } = cutout(kind, random);
      const geometry = new THREE.ShapeGeometry(shapes, 10);
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      const cx = (box.min.x + box.max.x) / 2, topY = box.max.y;
      geometry.translate(-cx, -topY, 0);
      const scale = width / 0.19 * (0.9 + random() * 0.2) * (kind === 'witch' ? 1.05 : kind === 'bat' ? 1 : 0.85);
      const pivot = new THREE.Group();
      const hang = stringAt(t);
      pivot.position.copy(hang);
      const thread = 0.015 + random() * 0.04;
      const body = new THREE.Mesh(geometry, paper);
      body.castShadow = body.receiveShadow = true;
      body.position.y = -thread;
      body.scale.setScalar(scale);
      // A thread from the string to the top of the paper.
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, thread, 4), twine);
      line.position.y = -thread / 2;
      pivot.add(line, body);
      if (googly) {
        for (const [ex, ey] of eyes) {
          const r = 0.0075 * (0.8 + random() * 0.5);
          const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 14), white);
          disc.position.set((ex - cx) * scale, -thread + (ey - topY) * scale, 0.002);
          const dot = new THREE.Mesh(new THREE.CircleGeometry(r * 0.5, 10), pupil);
          const a0 = random() * Math.PI * 2;
          dot.position.set(disc.position.x + Math.cos(a0) * r * 0.4, disc.position.y + Math.sin(a0) * r * 0.4 - r * 0.15, 0.0035);
          const back = disc.clone(); back.rotation.y = Math.PI; back.position.z = -0.002;
          pivot.add(disc, dot, back);
        }
      } else if (kind !== 'ghost' && kind !== 'witch') {
        // A crayon dot of an eye on the plain ones.
        for (const [ex, ey] of eyes) {
          const dot = new THREE.Mesh(new THREE.CircleGeometry(0.004, 8), a.paper === 'black' || a.paper === 'charcoal' ? s.material('#f4d40c') : pupil);
          dot.position.set((ex - cx) * scale, -thread + (ey - topY) * scale, 0.0015);
          pivot.add(dot);
        }
      }
      // Each hangs as it was taped: a little crooked, some flipped the other way.
      const base = (random() - 0.5) * 0.35;
      pivot.rotation.z = base;
      const twist = (random() - 0.5) * 0.7 + (kind === 'witch' && random() < 0.35 ? Math.PI : 0);
      pivot.rotation.y = twist;
      s.root.add(pivot);
      swingers.push({ pivot, phase: random() * 6, base, twist });
    }

    const energy = mood.energy;
    const amp = 0.04 + energy * 0.3;
    return s.finish({
      update(_dt, time) {
        for (const w of swingers) {
          w.pivot.rotation.z = w.base + Math.sin(time * (0.8 + energy * 2.4) + w.phase) * amp;
          w.pivot.rotation.y = w.twist + Math.sin(time * (0.5 + energy * 1.5) + w.phase * 1.7) * amp * 1.6;
        }
      },
    });
  },
});
