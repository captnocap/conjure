import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const WORDS = {
  english: ['CAUTION', 'WET FLOOR'],
  bilingual: ['CUIDADO', 'PISO MOJADO'],
  french: ['ATTENTION', 'SOL GLISSANT'],
  german: ['VORSICHT', 'RUTSCHGEFAHR'],
  closed: ['CLOSED', 'CLEANING IN PROGRESS'],
  wordless: ['', ''],
} as const;
const SPILLS = {
  milk: 'Milk: an opaque white pool spreading from a burst carton.',
  icecream: 'Melted ice cream: a pink and cream swirl with a dropped cone in it.',
  mopwater: 'Grey mop water with a skin of suds, the job half done.',
  cola: 'Cola: a dark sticky brown slick with a crushed can.',
  sauce: 'A dropped jar of pasta sauce: red splatter and broken glass.',
  detergent: 'Laundry detergent: a slow electric-blue ooze.',
  dry: 'Nothing at all. The floor dried hours ago and the sign was forgotten.',
} as const;
const SPILL_COLOUR: Record<keyof typeof SPILLS, string> = {
  milk: '#f4f3ea', icecream: '#f2b8c4', mopwater: '#8f979a', cola: '#4a2a18', sauce: '#b8281c', detergent: '#2a6fe0', dry: '#000000',
};

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    form: choice('What kind of caution sign is it?', {
      aframe: 'The classic two-panel folding A-frame with a carry handle cut in the top.',
      tower: 'A tall four-sided pop-up cone tower, taller than a child.',
      cone: 'A striped traffic cone with a sign plate clipped to its tip, borrowed from the car park.',
    }),
    words: choice('What does the sign say?', {
      english: 'CAUTION / WET FLOOR in black capitals.',
      bilingual: 'CUIDADO / PISO MOJADO, the Spanish side facing out.',
      french: 'ATTENTION / SOL GLISSANT.',
      german: 'VORSICHT / RUTSCHGEFAHR.',
      closed: 'CLOSED / CLEANING IN PROGRESS, blocking the way.',
      wordless: 'No words at all, only the pictogram, as in a Japanese food hall or an airport.',
    }),
    pictogram: choice('What pictogram is on it?', {
      slip: 'The falling stick figure, legs flying, in a warning triangle.',
      exclaim: 'A bare exclamation mark in a triangle.',
      mop: 'A mop and bucket silhouette.',
      drops: 'Three fat water drops.',
    }),
    colour: choice('What colour is the plastic?', {
      yellow: 'Safety yellow.',
      orange: 'Traffic orange.',
      white: 'White with a red band, the hospital kind.',
      pink: 'Hot pink, from a boutique or a nail salon.',
    }),
    stance: choice('How is the sign standing?', {
      upright: 'Upright and square, doing its job.',
      splayed: 'Legs slid too far apart, sagging low and about to collapse.',
      flat: 'Knocked flat on its face in the puddle by a cart or a kick.',
      folded: 'Folded shut and dropped on its side, never set up.',
    }),
    spill: choice('What was spilled?', SPILLS),
    footprints: noul('Has someone walked through the spill and tracked it away?'),
    mop: noul('Was the mop and bucket left beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = { yellow: '#f6c81a', orange: '#f07a16', white: '#f1efe8', pink: '#f04a9a' }[a.colour];
    const ink = a.colour === 'white' ? '#c21f1f' : '#17171a';
    const [top, bottom] = WORDS[a.words];
    const tall = a.form === 'tower';

    const face = paint(256, 512, (ctx) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 512);
      if (a.colour === 'white') { ctx.fillStyle = '#c21f1f'; ctx.fillRect(0, 0, 256, 36); ctx.fillRect(0, 476, 256, 36); }
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const cy = top ? 250 : 215, r = top ? 92 : 125;
      if (top) { ctx.font = '900 46px sans-serif'; ctx.fillText(top, 128, 96, 220); }
      // Warning triangle.
      ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = ink;
      ctx.beginPath(); ctx.moveTo(128, cy - r); ctx.lineTo(128 + r, cy + r * 0.72); ctx.lineTo(128 - r, cy + r * 0.72); ctx.closePath(); ctx.stroke();
      ctx.save(); ctx.translate(128, cy + r * 0.2); ctx.scale(r / 92, r / 92);
      ctx.lineCap = 'round';
      if (a.pictogram === 'slip') {
        ctx.beginPath(); ctx.arc(-22, -30, 11, 0, 7); ctx.fill();
        ctx.lineWidth = 11; ctx.beginPath();
        ctx.moveTo(-14, -16); ctx.lineTo(6, 14); ctx.moveTo(6, 14); ctx.lineTo(34, 2); ctx.moveTo(6, 14); ctx.lineTo(26, 34);
        ctx.moveTo(-8, -6); ctx.lineTo(-36, 4); ctx.moveTo(-8, -6); ctx.lineTo(18, -22); ctx.stroke();
        ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-46, 44); ctx.lineTo(46, 44); ctx.stroke();
      } else if (a.pictogram === 'exclaim') {
        ctx.beginPath(); ctx.moveTo(-10, -42); ctx.lineTo(10, -42); ctx.lineTo(5, 16); ctx.lineTo(-5, 16); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 34, 9, 0, 7); ctx.fill();
      } else if (a.pictogram === 'mop') {
        ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(22, -44); ctx.lineTo(-12, 26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-30, 24); ctx.lineTo(4, 24); ctx.lineTo(8, 46); ctx.lineTo(-36, 46); ctx.closePath(); ctx.fill();
        ctx.fillRect(18, 12, 30, 34);
      } else {
        for (const [x, y, k] of [[-26, 14, 1], [22, 20, 0.85], [0, -24, 0.7]] as const) {
          ctx.beginPath(); ctx.moveTo(x, y - 30 * k); ctx.bezierCurveTo(x + 26 * k, y, x + 18 * k, y + 22 * k, x, y + 22 * k); ctx.bezierCurveTo(x - 18 * k, y + 22 * k, x - 26 * k, y, x, y - 30 * k); ctx.fill();
        }
      }
      ctx.restore();
      if (bottom) { ctx.font = '900 40px sans-serif'; const words = bottom.split(' '); if (bottom.length > 12 && words.length > 1) { const half = Math.ceil(words.length / 2); ctx.fillText(words.slice(0, half).join(' '), 128, 385, 226); ctx.fillText(words.slice(half).join(' '), 128, 430, 226); } else ctx.fillText(bottom, 128, 405, 226); }
      // Scuffs and grime with wear.
      for (let i = 0; i < mood.wear * 70; i++) { ctx.globalAlpha = 0.12 + random() * 0.25; ctx.fillStyle = random() < 0.5 ? '#3a3428' : '#ffffff'; ctx.fillRect(random() * 256, 300 + random() * 212, 2 + random() * 26, 1 + random() * 3); }
      ctx.globalAlpha = 1;
    });
    const plastic = new THREE.MeshStandardMaterial({ map: face, roughness: mix(0.38, 0.8, mood.wear) });
    const plain = s.material(base, { roughness: 0.5 });
    const sign = new THREE.Group();
    s.root.add(sign);
    const add = (mesh: THREE.Mesh, parent: THREE.Object3D) => { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };

    const H = tall ? 0.98 : 0.64, W = tall ? 0.3 : 0.3;
    let reach = 0.3;
    if (a.form === 'cone') {
      // A traffic cone wearing a square sign plate on its tip.
      const rubber = s.material(a.colour === 'yellow' ? '#f07a16' : base, { roughness: 0.55 });
      add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.36), s.material('#2a2a2c')), sign).position.y = 0.015;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.14, 0.62, 20), rubber), sign).position.y = 0.34;
      for (const [y, r] of [[0.3, 0.127], [0.44, 0.092]] as const) add(new THREE.Mesh(new THREE.CylinderGeometry(r - 0.012, r + 0.004, 0.07, 20), s.material('#f4f4f0', { roughness: 0.3 })), sign).position.y = y;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 10), s.material('#2a2a2c')), sign).position.y = 0.68;
      const plate = add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.52, 0.012), [plain, plain, plain, plain, plastic, plastic]), sign);
      plate.position.y = 0.94;
      reach = 0.2;
    } else if (tall) {
      const b2 = W * 0.52, t2 = 0.03;
      const side = new THREE.BufferGeometry();
      side.setAttribute('position', new THREE.Float32BufferAttribute([-b2, 0, b2, b2, 0, b2, t2, H, t2, -t2, H, t2], 3));
      side.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.62, 1, 0.38, 1], 2));
      side.setIndex([0, 1, 2, 0, 2, 3]); side.computeVertexNormals();
      for (let i = 0; i < 4; i++) add(new THREE.Mesh(side, new THREE.MeshStandardMaterial({ map: face, roughness: 0.5, side: THREE.DoubleSide })), sign).rotation.y = i * Math.PI / 2;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.08), s.material('#2a2a2c')), sign).position.y = H + 0.012;
      add(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 16), s.material('#2a2a2c')), sign).position.y = H + 0.05;
      add(new THREE.Mesh(new THREE.BoxGeometry(W * 1.12, 0.025, W * 1.12), s.material('#2a2a2c')), sign).position.y = 0.012;
      reach = 0.25;
    } else {
      const spread = { upright: 0.3, splayed: 0.86, flat: 1.5, folded: 0.03 }[a.stance];
      for (const side of [1, -1]) {
        const leaf = new THREE.Group();
        const shape = new THREE.Shape();
        shape.moveTo(-W / 2, -H); shape.lineTo(W / 2, -H); shape.lineTo(W / 2 - 0.03, 0); shape.lineTo(-W / 2 + 0.03, 0); shape.closePath();
        const slot = new THREE.Path(); slot.absellipse(0, -0.055, 0.055, 0.02, 0, Math.PI * 2, false); shape.holes.push(slot);
        const foot = new THREE.Path(); foot.moveTo(-W / 2 + 0.06, -H - 0.001); foot.lineTo(W / 2 - 0.06, -H - 0.001); foot.lineTo(W / 2 - 0.09, -H + 0.035); foot.lineTo(-W / 2 + 0.09, -H + 0.035); foot.closePath(); shape.holes.push(foot);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.014, bevelEnabled: false });
        const uv = geo.attributes.uv, pos = geo.attributes.position;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / W + 0.5, 1 + pos.getY(i) / H);
        add(new THREE.Mesh(geo, [plastic, plain]), leaf);
        leaf.rotation.x = spread;
        if (side > 0) leaf.rotation.x = -spread; else leaf.rotation.y = Math.PI;
        leaf.position.y = H * Math.cos(spread);
        sign.add(leaf);
      }
      const hinge = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, W - 0.05, 8), plain), sign);
      hinge.rotation.z = Math.PI / 2; hinge.position.y = H * Math.cos(spread);
      reach = Math.max(0.2, H * Math.sin(spread));
    }
    // Stance for the non-A-frame forms, and the knocked-over poses.
    const lean = (random() - 0.5) * 0.5;
    const turn = new THREE.Group(); s.root.add(turn); turn.add(sign);
    if (a.form === 'aframe' && a.stance === 'flat') {
      // Legs kicked out from under it: both leaves lie open on the floor like a dropped book.
      sign.position.y = 0.012; turn.rotation.y = 0.5 + lean;
    } else if (a.form === 'aframe' && a.stance === 'folded') {
      sign.rotation.x = Math.PI / 2; sign.position.set(0, 0.035, -H * 0.5); turn.rotation.y = 0.7 + lean;
    } else if (a.stance === 'flat' || a.stance === 'folded') {
      sign.rotation.x = a.form === 'tower' ? Math.PI / 2 - 0.2 : Math.PI / 2 - 0.12;
      sign.position.set(0, a.form === 'tower' ? 0.15 : 0.17, -H * 0.45);
      turn.rotation.y = 0.6 + lean * 2;
    } else {
      if (a.stance === 'splayed' && a.form !== 'aframe') sign.rotation.z = 0.2, sign.position.y = 0.02;
      turn.rotation.y = lean * 0.8;
    }

    // The spill: an irregular glossy pool with its evidence.
    const wet = a.spill !== 'dry';
    const size = mix(0.2, 0.32, random()) + reach * 0.35;
    if (wet) {
      const blob = (radius: number, wobble: number, lobes: number) => {
        const shape = new THREE.Shape(); const phase = random() * 6, n = 40;
        for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2; const r = radius * (1 + wobble * Math.sin(t * lobes + phase) + wobble * 0.6 * Math.sin(t * (lobes + 2) + phase * 2)); const x = Math.cos(t) * r * 1.2, y = Math.sin(t) * r; if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y); }
        return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
      };
      const thin = a.spill === 'mopwater';
      const liquid = new THREE.MeshStandardMaterial({ color: SPILL_COLOUR[a.spill], roughness: 0.06, metalness: thin ? 0.35 : 0.1, transparent: thin, opacity: thin ? 0.72 : 1 });
      const pool = s.mesh(blob(size, 0.16, 3), liquid, [0.06, 0.004, 0.08]); pool.castShadow = false;
      for (let i = 0; i < 4; i++) { const d = s.mesh(blob(0.03 + random() * 0.05, 0.1, 2), liquid, [(random() - 0.5) * size * 3, 0.004, (random() - 0.5) * size * 2.4]); d.castShadow = false; }
      if (a.footprints) for (let i = 0; i < 5; i++) {
        const print = s.mesh(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: SPILL_COLOUR[a.spill], roughness: 0.15, transparent: true, opacity: 0.85 - i * 0.14 }), [size * 0.7 + i * 0.26, 0.005, 0.25 + (i % 2 ? 0.09 : -0.09) + i * 0.1]);
        print.scale.set(0.085, 1, 0.04); print.rotation.y = -0.35; print.castShadow = false;
      }
      const at = (r: number): [number, number] => { const t = random() * 6.28; return [0.06 + Math.cos(t) * size * r * 1.1, 0.08 + Math.sin(t) * size * r]; };
      if (a.spill === 'milk') {
        const [x, z] = at(0.8); const carton = s.box([0.07, 0.07, 0.19], [x, 0.036, z], s.material('#f6f6f2')); carton.rotation.y = random() * 3;
        const band = s.box([0.072, 0.072, 0.07], [x, 0.036, z], s.material('#2a62c8')); band.rotation.y = carton.rotation.y;
      } else if (a.spill === 'icecream') {
        const [x, z] = at(0.5);
        s.mesh(blob(size * 0.5, 0.25, 4), new THREE.MeshStandardMaterial({ color: '#fbf1dc', roughness: 0.1 }), [x * 0.4, 0.006, z * 0.4]).castShadow = false;
        s.ball([0.05, 0.035, 0.05], [x, 0.03, z], s.material('#f29ab0', { roughness: 0.3 }));
        const cone = s.mesh(new THREE.ConeGeometry(0.03, 0.12, 12), s.material('#c9924a'), [x + 0.08, 0.03, z + 0.02]); cone.rotation.z = Math.PI / 2 + 0.2; cone.rotation.y = random() * 3;
      } else if (a.spill === 'mopwater') {
        const suds = Array.from({ length: 26 }, () => { const [x, z] = at(random() * 0.9); return { at: [x, 0.012, z] as const, size: 0.008 + random() * 0.018 }; });
        s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#f4f6f6', { roughness: 0.2 }), suds);
      } else if (a.spill === 'cola') {
        const [x, z] = at(0.75); const can = s.cylinder(0.033, 0.033, 0.12, [x, 0.03, z], s.material('#c8201c', { metalness: 0.6, roughness: 0.3 }), 14); can.rotation.z = Math.PI / 2; can.rotation.y = random() * 3; can.scale.x = 0.85;
      } else if (a.spill === 'sauce') {
        const [x, z] = at(0.3); const glass = new THREE.MeshPhysicalMaterial({ color: '#dff0ea', roughness: 0.05, transparent: true, opacity: 0.55 });
        for (let i = 0; i < 7; i++) { const shard = s.mesh(new THREE.TetrahedronGeometry(0.02 + random() * 0.025), glass, [x + (random() - 0.5) * 0.25, 0.015, z + (random() - 0.5) * 0.25]); shard.rotation.set(random() * 3, random() * 3, random() * 3); }
        s.cylinder(0.036, 0.036, 0.014, [x, 0.012, z], s.material('#c9a23a', { metalness: 0.7 }), 16);
        for (let i = 0; i < 9; i++) { const t = random() * 6.28, r = size * (1 + random() * 0.6); const d = s.mesh(blob(0.012 + random() * 0.03, 0.2, 3), liquid, [Math.cos(t) * r * 1.2, 0.004, Math.sin(t) * r]); d.castShadow = false; }
      } else if (a.spill === 'detergent') {
        const [x, z] = at(0.8); const jug = s.box([0.16, 0.1, 0.26], [x, 0.05, z], s.material('#f07a16')); jug.rotation.y = random() * 3;
        s.cylinder(0.025, 0.025, 0.04, [x + Math.sin(jug.rotation.y) * 0.15, 0.05, z + Math.cos(jug.rotation.y) * 0.15], s.material('#2a4fb0'), 10).rotation.x = Math.PI / 2;
      }
    }

    if (a.mop) {
      const bx = -(size * 1.15 + 0.22), bz = -0.12;
      const bucket = s.material(a.colour === 'yellow' ? '#e8b81c' : '#3a68b0', { roughness: 0.5 });
      s.lathe([[0.001, 0.02], [0.13, 0.02], [0.17, 0.3], [0.18, 0.3], [0.14, 0.0], [0.001, 0.0]], bucket, [bx, 0, bz]);
      if (wet) s.cylinder(0.155, 0.15, 0.01, [bx, 0.23, bz], new THREE.MeshStandardMaterial({ color: '#7d878a', roughness: 0.08 }), 20);
      s.box([0.2, 0.09, 0.12], [bx, 0.33, bz - 0.11], s.material('#2a2c30'));
      for (const side of [-1, 1]) s.cylinder(0.03, 0.03, 0.025, [bx + side * 0.13, 0.03, bz + 0.12], s.material('#222'), 10).rotation.z = Math.PI / 2;
      const head: [number, number, number] = [bx + 0.03, 0.2, bz + 0.02];
      s.rod(head, [bx + 0.3, 1.32, bz - 0.2], 0.013, s.material('#b9a078'));
      const strands = s.material('#e9e4d4', { roughness: 0.95 });
      for (let i = 0; i < 9; i++) s.rod(head, [head[0] + (random() - 0.5) * 0.14, 0.03, head[2] + (random() - 0.5) * 0.14], 0.012, strands);
    }
    return s.finish();
  },
});
