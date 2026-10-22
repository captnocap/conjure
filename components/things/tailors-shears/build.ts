import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const STUFFS = {
  wool: 'Charcoal suiting wool with a faint chalk stripe.',
  silk: 'Scarlet silk.',
  ivory: 'Ivory satin.',
  floral: 'Flowered cotton print.',
  navy: 'Plain navy serge.',
  tweed: 'Brown and green tweed.',
} as const;
type Stuff = keyof typeof STUFFS;
const BASE: Record<Stuff, string> = { wool: '#3d3f45', silk: '#c41f2c', ivory: '#efe7d5', floral: '#f0e4c8', navy: '#22335e', tweed: '#7a6a45' };

function canvasTexture(size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  paint(canvas.getContext('2d')!, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function stuffTexture(kind: Stuff, random: () => number) {
  return canvasTexture(256, (ctx) => {
    ctx.fillStyle = BASE[kind];
    ctx.fillRect(0, 0, 256, 256);
    if (kind === 'wool') {
      ctx.fillStyle = 'rgba(230,230,235,0.5)';
      for (let x = 0; x < 256; x += 64) ctx.fillRect(x, 0, 3, 256);
    } else if (kind === 'floral') {
      for (let i = 0; i < 40; i++) {
        const x = random() * 256, y = random() * 256;
        ctx.fillStyle = ['#c7323d', '#3a5fa8', '#d9788f'][i % 3];
        for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.257) * 9, y + Math.sin(p * 1.257) * 9, 6.5, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#e6b53a'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
      }
    } else if (kind === 'tweed') {
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = ['#4f5a36', '#a18a55', '#3e3323', '#b9783a'][i % 4];
        ctx.fillRect(random() * 256, random() * 256, 3, 3);
      }
    } else if (kind === 'ivory' || kind === 'silk') {
      for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(0, i * 32 + random() * 10, 256, 8); }
    } else {
      ctx.strokeStyle = 'rgba(150,170,220,0.22)';
      for (let i = -256; i < 256; i += 7) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke(); }
    }
  });
}

export default defineThing({
  questions: {
    style: choice('What kind of scissors are they?', {
      embroidery: 'Tiny gilt embroidery scissors with needle-fine points.',
      pinking: 'Heavy pinking shears with saw-toothed blades that leave a zigzag edge.',
      orange: 'Light modern scissors with moulded orange plastic handles.',
      antique: 'Hand-forged all-steel shears with big round bows, dark with age.',
      shears: 'Large bent-handled dressmaker\'s shears, black enamel bows and long bright blades.',
    }),
    open: score('How far open are the blades?', ['Shut tight', 'Slightly parted', 'Open, mid-cut', 'Gaping wide']),
    cut: choice('What was just cut?', {
      cloth: 'A length of good cloth, the cut half made, the offcut strip already swinging away.',
      pattern: 'A tissue-paper pattern piece printed with lines and notches.',
      ribbon: 'A ribbon, its end snipped to a swallowtail.',
      hair: 'A long lock of hair, tied with a ribbon.',
      photograph: 'A photograph cut in two, one figure parted from the other.',
      thread: 'Nothing but thread ends: the last stitch has just been snipped off.',
    }),
    stuff: choice('If cloth or ribbon was cut, what is it?', STUFFS),
    progress: score('If cloth or paper is being cut, how far has the cut run?', ['Just nicked at the edge', 'Halfway across', 'Almost through']),
    snippets: score('How much has been cut away around them?', ['One or two stray snips', 'A scatter of offcuts', 'Drifts of snippets, a long afternoon of cutting']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const kind = a.style;
    const dims = {
      shears: { blade: 0.145, width: 0.024, handle: 0.085, bows: [[0.013, 0.012], [0.03, 0.016]], tube: 0.0042 },
      pinking: { blade: 0.11, width: 0.032, handle: 0.085, bows: [[0.014, 0.013], [0.03, 0.017]], tube: 0.005 },
      embroidery: { blade: 0.042, width: 0.008, handle: 0.04, bows: [[0.0085, 0.0085], [0.0085, 0.0085]], tube: 0.0017 },
      orange: { blade: 0.12, width: 0.019, handle: 0.08, bows: [[0.015, 0.013], [0.03, 0.016]], tube: 0.0058 },
      antique: { blade: 0.135, width: 0.022, handle: 0.085, bows: [[0.02, 0.019], [0.022, 0.02]], tube: 0.0036 },
    }[kind];
    const rust = new THREE.Color('#7b5a40');
    const steelTint = new THREE.Color(kind === 'antique' ? '#7d7f80' : kind === 'embroidery' ? '#d9b65a' : '#d5d9dc').lerp(rust, mood.wear * (kind === 'antique' ? 0.5 : 0.25));
    const steel = new THREE.MeshStandardMaterial({ color: steelTint, metalness: 0.85, roughness: mix(0.22, 0.6, mood.wear), side: THREE.DoubleSide });
    const edgeMat = new THREE.MeshStandardMaterial({ color: '#f2f4f5', metalness: 0.6, roughness: 0.25 });
    const grip = kind === 'shears' || kind === 'pinking' ? s.material('#17171a', { roughness: 0.35, metalness: 0.2 })
      : kind === 'orange' ? s.material('#ee6a1c', { roughness: 0.45 })
      : kind === 'embroidery' ? s.material('#d2a63f', { metalness: 0.85, roughness: 0.3 }) : steel;

    const angle = mix(0, 1.05, a.open);
    const half = (sign: 1 | -1, y: number, bow: number[]) => {
      const g = new THREE.Group();
      const L = dims.blade, w = dims.width;
      const points: [number, number][] = [[-0.02 * (L / 0.14), -w / 2], [L * 0.55, -w * 0.42], [L, w * 0.2]];
      if (kind === 'pinking') {
        const teeth = Math.floor(L / 0.007);
        for (let i = 1; i < teeth; i++) points.push([L - i * (L / teeth), w * 0.2 + (w * 0.3) * (i / teeth) + (i % 2 ? 0.0032 : 0)]);
      }
      points.push([0, w / 2], [-0.02 * (L / 0.14), w / 2]);
      const outline = points.map(([x, z]) => new THREE.Vector2(x, z * sign));
      if (sign < 0) outline.reverse();
      const thick = kind === 'embroidery' ? 0.0012 : 0.0028;
      const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(outline), { depth: thick, bevelEnabled: false });
      geometry.rotateX(Math.PI / 2);
      geometry.translate(0, thick, 0);
      const blade = new THREE.Mesh(geometry, steel);
      g.add(blade);
      if (kind !== 'pinking') {
        // The ground bevel along the cutting edge catches the light.
        const from = new THREE.Vector3(L * 0.98, thick + 0.0002, w * 0.2 * sign), to = new THREE.Vector3(0.004, thick + 0.0002, w * 0.47 * sign);
        const bevel = new THREE.Mesh(new THREE.BoxGeometry(from.distanceTo(to), 0.0004, w * 0.16), edgeMat);
        bevel.position.copy(from).add(to).multiplyScalar(0.5);
        bevel.rotation.y = -Math.atan2(to.z - from.z, to.x - from.x);
        g.add(bevel);
      }
      // Shank and bow.
      const centre = new THREE.Vector3(-dims.handle, thick / 2, sign * (bow[1] + dims.tube * 0.6 + w * 0.12));
      const loop: THREE.Vector3[] = [];
      for (let i = 0; i < 20; i++) loop.push(new THREE.Vector3(centre.x + Math.cos(i / 20 * Math.PI * 2) * bow[0], centre.y, centre.z + Math.sin(i / 20 * Math.PI * 2) * bow[1]));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true), 48, dims.tube, 8, true), grip));
      const start = new THREE.Vector3(-0.016 * (L / 0.14), thick / 2, sign * w * 0.1), end = new THREE.Vector3(centre.x + bow[0], thick / 2, centre.z - sign * bow[1] * 0.35);
      const shank = new THREE.Mesh(new THREE.CylinderGeometry(dims.tube * 1.05, w * 0.34, start.distanceTo(end), 10), grip);
      shank.position.copy(start).add(end).multiplyScalar(0.5);
      shank.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
      shank.scale.z = 1;
      const flatten = new THREE.Group();
      flatten.add(shank);
      flatten.scale.y = 0.55;
      flatten.position.y = thick * 0.25;
      g.add(flatten);
      g.position.y = y;
      g.rotation.y = sign * angle / 2;
      g.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      return g;
    };
    const scissors = new THREE.Group();
    const thickness = kind === 'embroidery' ? 0.0012 : 0.0028;
    scissors.add(half(-1, 0, dims.bows[1]), half(1, thickness, dims.bows[0]));
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(dims.width * 0.2, dims.width * 0.2, thickness * 2 + 0.0016, 14), kind === 'embroidery' ? grip : new THREE.MeshStandardMaterial({ color: '#b98f3c', metalness: 0.85, roughness: 0.35 }));
    screw.position.y = thickness + 0.0004;
    screw.castShadow = true;
    scissors.add(screw);
    s.root.add(scissors);

    // What they were cutting.
    const tint = BASE[a.stuff];
    const lift = 0.0026;
    const snipTints: string[] = [];
    const flat = (outline: [number, number][], material: THREE.Material, y: number) => {
      const geometry = new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z))));
      geometry.rotateX(Math.PI / 2);
      const mesh = s.mesh(geometry, material, [0, y, 0]);
      return mesh;
    };
    scissors.position.y = lift;

    if (a.cut === 'cloth' || a.cut === 'pattern') {
      const paper = a.cut === 'pattern';
      const texture = paper
        ? canvasTexture(512, (ctx, size) => {
          ctx.fillStyle = '#e6d5ab';
          ctx.fillRect(0, 0, size, size);
          ctx.strokeStyle = ctx.fillStyle = '#3a3226';
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(40, 60); ctx.bezierCurveTo(200, 20, 330, 120, 470, 70); ctx.lineTo(450, 300); ctx.bezierCurveTo(300, 340, 180, 300, 60, 330); ctx.closePath(); ctx.stroke();
          ctx.setLineDash([14, 10]); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(70, 90); ctx.bezierCurveTo(200, 60, 320, 150, 440, 105); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(256, 80); ctx.lineTo(256, 310); ctx.stroke();
          ctx.setLineDash([]);
          for (const x of [120, 250, 380]) { ctx.beginPath(); ctx.moveTo(x - 10, 322); ctx.lineTo(x, 300); ctx.lineTo(x + 10, 322); ctx.fill(); }
          ctx.font = 'bold 40px sans-serif';
          ctx.fillText('FRONT', 130, 200);
          ctx.font = '26px sans-serif';
          ctx.fillText('CUT 2  ·  ' + (8 + Math.floor(random() * 5) * 2), 130, 240);
          ctx.beginPath(); ctx.moveTo(330, 180); ctx.lineTo(420, 180); ctx.lineTo(405, 170); ctx.moveTo(420, 180); ctx.lineTo(405, 190); ctx.stroke();
          ctx.fillRect(0, 440, size, 4);
        })
        : stuffTexture(a.stuff, random);
      texture.repeat.set(paper ? 2.2 : 7, paper ? 2.2 : 7);
      if (paper) texture.offset.set(0.52, 0.5);
      const material = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, roughness: paper ? 0.95 : a.stuff === 'ivory' || a.stuff === 'silk' ? 0.4 : 0.92 });
      material.color.lerp(new THREE.Color('#8b8275'), mood.wear * 0.2);
      const scale = kind === 'embroidery' ? 0.45 : 1;
      const left = -0.17 * scale, right = 0.19 * scale, back = -0.15 * scale, strip = 0.05 * scale;
      const apex = mix(left + 0.07 * scale, right - 0.04 * scale, a.progress);
      const wobble = () => (random() - 0.5) * 0.012 * scale;
      const zig = (from: number, to: number, z: number): [number, number][] => {
        const out: [number, number][] = [];
        if (kind !== 'pinking') return [[from, z], [to, z]];
        const steps = Math.max(2, Math.round(Math.abs(to - from) / 0.007));
        for (let i = 0; i <= steps; i++) out.push([from + (to - from) * i / steps, z + (i % 2 ? 0.0035 : 0)]);
        return out;
      };
      flat([[left + wobble(), back + wobble()], [right + wobble(), back + wobble()], [right, strip], [apex, strip], [apex, 0], ...zig(apex, left, 0)], material, 0.0008);
      const swing = new THREE.Group();
      const piece = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([...zig(0, left - apex, 0), [left - apex, strip] as [number, number], [0, strip] as [number, number]].map(([x, z]) => new THREE.Vector2(x, z)))), material);
      piece.geometry.rotateX(Math.PI / 2);
      piece.castShadow = piece.receiveShadow = true;
      swing.add(piece);
      swing.position.set(apex, 0.0012, 0);
      const gap = mix(0.1, 0.22, a.open) * mix(1, 0.6, a.progress);
      swing.rotation.y = gap;
      s.root.add(swing);
      // The blades sit in the wedge with their tips toward the uncut cloth.
      scissors.position.set(apex - dims.blade * 0.72, lift, -Math.sin(gap / 2) * dims.blade * 0.4);
      scissors.rotation.y = gap / 2 + (random() - 0.5) * 0.08;
      snipTints.push(paper ? '#e6d5ab' : tint, paper ? '#d9c79a' : tint);
    } else if (a.cut === 'ribbon') {
      const sheen = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.35, side: THREE.DoubleSide });
      const w = 0.016;
      flat([[0.03, -w], [0.19, -w - 0.006], [0.2, w - 0.006], [0.03, w], [0.05, 0]], sheen, 0.001).rotation.y = 0.12;
      const off = flat([[-0.05, -w], [0.02, -w], [0.035, 0], [0.02, w], [-0.05, w], [-0.035, 0]], sheen, 0.001);
      off.position.set(-0.03, 0, 0.06);
      off.rotation.y = 0.7 + random() * 0.6;
      // The rest of the roll, curling back on itself.
      const curl: THREE.Vector3[] = [];
      for (let i = 0; i <= 26; i++) { const t = i / 26 * Math.PI * 3.2, r = 0.012 + i * 0.0009; curl.push(new THREE.Vector3(0.2 + Math.cos(t) * r + 0.02, 0.016, -0.035 + Math.sin(t) * r)); }
      const roll = s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curl), 80, 0.0012, 4), sheen);
      roll.scale.y = 13;
      roll.position.y = -0.016 * 13 + 0.017;
      scissors.position.set(-0.02, lift - 0.0018, 0.015);
      scissors.rotation.y = -1.1 + random() * 0.4;
      snipTints.push(tint);
    } else if (a.cut === 'hair') {
      const shades = ['#2a1b12', '#6b4424', '#c9a35a', '#b5522a', '#9a9a98', '#17140f'];
      const shade = new THREE.Color(shades[Math.floor(random() * shades.length)]);
      const hair = s.material(shade, { roughness: 0.5 });
      const tieAt = new THREE.Vector3(0.05, 0.006, -0.07);
      for (let i = 0; i < 22; i++) {
        const spread = (i / 21 - 0.5), wave = random() * 6;
        const points: [number, number, number][] = [];
        for (let t = 0; t <= 6; t++) {
          const along = t / 6;
          points.push([tieAt.x + along * 0.15, 0.004 + Math.abs(spread) * 0.004 * (1 - along) + (i % 3) * 0.0015, tieAt.z + spread * (0.012 + along * 0.05) + Math.sin(along * 7 + wave) * 0.006 * along - along * along * 0.05]);
        }
        s.tube(points, 0.0016, hair);
      }
      for (let i = 0; i < 9; i++) {
        const spread = i / 8 - 0.5;
        s.rod([tieAt.x, 0.005, tieAt.z + spread * 0.012], [tieAt.x - 0.03 - random() * 0.012, 0.003, tieAt.z + spread * 0.03], 0.0015, hair);
      }
      const ribbon = s.material(['#c41f2c', '#22335e', '#efe7d5', '#e58aa5'][Math.floor(random() * 4)], { roughness: 0.4 });
      s.cylinder(0.0085, 0.0085, 0.007, [tieAt.x, 0.006, tieAt.z], ribbon, 14).rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        s.ball([0.006, 0.003, 0.011], [tieAt.x, 0.012, tieAt.z + side * 0.011], ribbon, 10);
        s.box([0.005, 0.001, 0.028], [tieAt.x - 0.004 * side, 0.002, tieAt.z + side * 0.022], ribbon).rotation.y = side * 0.5;
      }
      scissors.position.set(-0.04, lift - 0.0018, 0.03);
      scissors.rotation.y = 0.5 + random() * 0.3;
      snipTints.push('#' + shade.getHexString());
    } else if (a.cut === 'photograph') {
      const sepia = canvasTexture(512, (ctx, size) => {
        ctx.fillStyle = '#f1e9d6';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#b79c74';
        ctx.fillRect(26, 26, size - 52, size - 52);
        ctx.fillStyle = '#8f7450';
        ctx.fillRect(26, 330, size - 52, size - 356);
        for (const [x, tall, dress] of [[160, 250, false], [352, 215, true]] as const) {
          ctx.fillStyle = '#4b3a28';
          ctx.beginPath(); ctx.arc(x, size - 40 - tall, 34, 0, 7); ctx.fill();
          ctx.beginPath();
          if (dress) { ctx.moveTo(x - 30, size - tall); ctx.lineTo(x + 30, size - tall); ctx.lineTo(x + 78, size - 26); ctx.lineTo(x - 78, size - 26); }
          else { ctx.moveTo(x - 46, size - tall); ctx.lineTo(x + 46, size - tall); ctx.lineTo(x + 50, size - 26); ctx.lineTo(x - 50, size - 26); }
          ctx.fill();
          ctx.fillStyle = dress ? '#e9dcc0' : '#2f2419';
          ctx.fillRect(x - 12, size - tall, 24, dress ? 60 : 110);
        }
      });
      sepia.wrapS = sepia.wrapT = THREE.ClampToEdgeWrapping;
      const w = 0.09, h = 0.115;
      [-1, 1].forEach((side) => {
        const map = sepia.clone();
        map.needsUpdate = true;
        map.repeat.set(0.5, 1);
        map.offset.set(side < 0 ? 0 : 0.5, 0);
        const piece = new THREE.Mesh(new THREE.BoxGeometry(w / 2, 0.0008, h), [0, 1, 2, 3, 4, 5].map((face) => new THREE.MeshStandardMaterial(face === 2 ? { map, roughness: 0.5 } : { color: '#efe8d8', roughness: 0.9 })));
        piece.castShadow = piece.receiveShadow = true;
        piece.position.set(0.07 + side * (w / 4 + 0.006), 0.001, -0.035);
        if (side > 0) { piece.position.x += 0.03 + random() * 0.02; piece.position.z += 0.02 + random() * 0.04; piece.rotation.y = -0.35 - random() * 0.5; }
        s.root.add(piece);
      });
      sepia.dispose();
      scissors.position.set(-0.03, lift - 0.0018, 0.045);
      scissors.rotation.y = 0.75 + random() * 0.3;
      snipTints.push('#efe8d8', '#b79c74');
    } else {
      const threadTint = ['#c41f2c', '#22335e', '#efe7d5', '#1c1b1d', '#c99a2c'][Math.floor(random() * 5)];
      const threadMat = s.material(threadTint, { roughness: 0.9 });
      const reel = s.material('#d6b98a');
      const at: [number, number, number] = [0.13, 0.0155, -0.06];
      const spool = new THREE.Group();
      for (const [r1, r2, h, y, m] of [[0.0155, 0.011, 0.006, -0.016, reel], [0.011, 0.0155, 0.006, 0.016, reel], [0.0135, 0.0135, 0.026, 0, threadMat]] as const) {
        const part = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, h, 18), m);
        part.position.y = y;
        part.castShadow = true;
        spool.add(part);
      }
      spool.rotation.set(Math.PI / 2, 0, random() * 2);
      spool.position.set(...at);
      s.root.add(spool);
      const tail: [number, number, number][] = [[at[0] - 0.012, 0.004, at[2] + 0.005]];
      let x = at[0] - 0.02, z = at[2] + 0.02, turn = 2.4;
      for (let i = 0; i < 9; i++) { turn += (random() - 0.5) * 1.6; x += Math.cos(turn) * 0.018; z += Math.abs(Math.sin(turn)) * 0.012; tail.push([x, 0.001, z]); }
      s.tube(tail, 0.0009, threadMat);
      scissors.position.set(-0.03, 0, 0.02);
      scissors.rotation.y = 0.35 + random() * 0.4;
      snipTints.push(threadTint, threadTint);
    }

    // Snippets.
    const count = Math.round(mix(2, 70, a.snippets * a.snippets) * mix(0.6, 1.4, mood.density));
    const reach = kind === 'embroidery' ? 0.07 : 0.14;
    const stringy = a.cut === 'thread' || a.cut === 'hair';
    const snips = new THREE.InstancedMesh(stringy ? new THREE.BoxGeometry(1, 0.2, 0.08) : new THREE.CylinderGeometry(1, 1, 0.12, 3), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), count);
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < count; i++) {
      const size = (stringy ? mix(0.008, 0.022, random()) : mix(0.003, 0.009, random())) * (kind === 'embroidery' ? 0.6 : 1);
      const r = Math.sqrt(random()) * reach, t = random() * Math.PI * 2;
      matrix.compose(new THREE.Vector3(scissors.position.x + 0.02 + Math.cos(t) * r, 0.0022 + (i % 5) * 0.0002, scissors.position.z + 0.03 + Math.sin(t) * r * 0.7), turn.setFromAxisAngle(up, random() * 6), new THREE.Vector3(size, size * 0.4, size * mix(0.5, 1.6, random())));
      snips.setMatrixAt(i, matrix);
      snips.setColorAt(i, new THREE.Color(snipTints[i % snipTints.length]).offsetHSL(0, 0, (random() - 0.5) * 0.08));
    }
    snips.castShadow = snips.receiveShadow = true;
    s.root.add(snips);

    return s.finish();
  },
});
