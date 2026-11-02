import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix } from '@conjure/kit';

type P3 = [number, number, number];

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

/** Smooth-ish noise from a few sines, deterministic from a seed offset. */
const noise = (x: number, y: number, z: number, o: number) =>
  Math.sin(x * 2.1 + o) * Math.cos(z * 1.7 - o * 0.5) * 0.5 + Math.sin(y * 3.3 + x * 1.1 + o * 1.3) * 0.3 + Math.sin(z * 4.7 + y * 2.3 - o) * 0.2;

const LAYERS = ['#e0b273', '#c98f4e', '#dcae72', '#b98048', '#e6be86'].map((c) => new THREE.Color(c));
const OXIDE = new THREE.Color('#9a4a22');
const GREY = new THREE.Color('#6f6a5e');

export default defineThing({
  questions: {
    who: choice('Who is at the chair?', {
      empty: 'Nobody: the bench alone above the water.',
      governess: 'A governor\'s wife in 1810s dress and bonnet sitting on the seat, gazing out over the harbour for ships from home.',
      selfie: 'A tourist in a cap standing in front of the seat taking a selfie, phone held up.',
      chips: 'A couple sitting on the seat sharing hot chips while gulls crowd in at their feet.',
    }),
    state: choice('What state is the stone in?', {
      fresh: 'Freshly cut in 1810: crisp edges, pale stone, the pick marks still sharp.',
      worn: 'Worn smooth by two centuries of sitters and weather: rounded edges, darkened stone, lichen.',
      graffiti: 'Worn and scratched with graffiti: initials and hearts cut into the back, a smear of spray paint.',
    }),
    left: choice('What has been left on the seat?', {
      nothing: 'Nothing.',
      flowers: 'A bunch of flowers in paper, laid on the seat as if in memory.',
      hat: 'A forgotten straw hat.',
      bottle: 'An empty wine bottle and two plastic cups from last night.',
    }),
    joints: choice('What grows in the joints of the rock?', {
      grass: 'Tufts of grass along the cracks and the foot of the ledge.',
      moss: 'Dark moss and grey-green lichen crusting the top surfaces.',
      bare: 'Nothing: clean bare stone.',
      fig: 'A little native fig seedling rooting in a crack beside the seat.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fresh = a.state === 'fresh';
    const wornness = fresh ? 0.05 : Math.max(0.45, mood.wear);
    const offset = random() * 10;
    // Bedding: layered honey bands, cross-bedding and iron-oxide rings, projected so the layers run level.
    const bedding = canvasTexture(256, 512, (g) => {
      let y = 0;
      while (y < 512) {
        const h = 10 + random() * 46;
        g.fillStyle = LAYERS[Math.floor(random() * LAYERS.length)].clone().offsetHSL(0, (random() - 0.5) * 0.06, (random() - 0.5) * 0.08).getStyle();
        g.fillRect(0, y, 256, h);
        g.strokeStyle = 'rgba(120,80,40,0.25)'; g.lineWidth = 1;
        for (let k = 0; k < 6; k++) { const x = random() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30 + random() * 30, y + h); g.stroke(); }
        y += h;
      }
      for (let k = 0; k < 7; k++) {
        g.strokeStyle = `rgba(130,52,22,${0.35 + random() * 0.4})`; g.lineWidth = 2 + random() * 5;
        const y0 = random() * 512;
        g.beginPath();
        for (let x = -10; x <= 266; x += 8) g.lineTo(x, y0 + Math.sin(x / 40 + k) * 18 + Math.sin(x / 13) * 4);
        g.stroke();
      }
      for (let k = 0; k < 1600; k++) { g.fillStyle = random() < 0.5 ? 'rgba(90,60,30,0.25)' : 'rgba(255,240,210,0.25)'; g.fillRect(random() * 256, random() * 512, 2, 2); }
    });
    bedding.wrapS = bedding.wrapT = THREE.RepeatWrapping;
    const rock = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, color: '#ffffff', map: bedding });

    // Each block is a rounded box roughened by a position-only displacement, so its seams never crack.
    const blocks: THREE.BufferGeometry[] = [];
    const block = (size: P3, at: P3, round: number, rough = 1) => {
      const g = new RoundedBoxGeometry(size[0], size[1], size[2], 5, Math.min(round * (fresh ? 0.35 : 1), Math.min(...size) * 0.45));
      const nonIndexed = g.index ? g.toNonIndexed() : g;
      nonIndexed.translate(...at);
      const pos = nonIndexed.attributes.position as THREE.BufferAttribute;
      const amp = (0.03 + wornness * 0.07) * rough;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        pos.setXYZ(i, x + noise(x, y, z, offset) * amp, y + noise(z, x, y, offset + 3) * amp * 0.6, z + noise(y, z, x, offset + 7) * amp);
      }
      blocks.push(nonIndexed);
    };
    // Ledge and foot step, the carved seat, the back face, the arms and the rock running on behind.
    block([5.2, 0.5, 3.2], [0, 0.0, -0.2], 0.12, 1.6);
    block([3.0, 0.5, 0.7], [0, 0.45, -0.75], 0.08);
    block([3.4, 1.15, 0.8], [0, 0.78, -1.45], 0.12);
    for (const sx of [-1, 1]) block([0.55, 0.95, 1.6], [sx * 1.72, 0.62, -0.9], 0.18);
    block([5.6, 1.3, 1.6], [0, 0.55, -2.4], 0.3, 2);
    block([1.2, 1.25, 1.4], [2.75, 0.55, -0.6], 0.2, 1.2);
    block([1.4, 0.8, 1.6], [-2.8, 0.25, -0.9], 0.3, 2);
    block([2.2, 0.9, 1.3], [-1.6, 1.45, -2.7], 0.35, 2.5);
    block([1.6, 0.6, 1.1], [1.9, 1.35, -2.6], 0.3, 2.5);
    block([1.0, 0.7, 1.0], [-3.3, 0.6, -2.3], 0.3, 2);
    const geo = mergeGeometries(blocks);
    // Bedding layers by height, iron-oxide bands cutting across them, weathering darkening the tops.
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colours = new Float32Array(pos.count * 3);
    const uvs = new Float32Array(pos.count * 2);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const t = y * 7 + Math.sin(x * 0.9 + z * 0.6 + offset) * 0.7;
      const layer = LAYERS[((Math.floor(t) % LAYERS.length) + LAYERS.length) % LAYERS.length];
      c.set('#ffffff').lerp(layer, 0.15);
      const ring = Math.sin((x * 1.6 + y * 4.2 + z * 1.1 + offset) * 2.2);
      if (ring > 0.8) c.lerp(OXIDE, (ring - 0.8) * 1.5);
      if (fresh) c.lerp(new THREE.Color('#fff6e6'), 0.3);
      c.lerp(GREY, wornness * 0.4 * (0.5 + 0.5 * Math.sin(x * 3 + z * 2 + offset)) * Math.min(1, Math.max(0, y + 0.3)));
      colours.set([c.r, c.g, c.b], i * 3);
      uvs[i * 2] = (x + z) * 0.3; uvs[i * 2 + 1] = y * 0.42;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geo.computeVertexNormals();
    s.mesh(geo, rock);

    // Pick marks on fresh stone: little dark chisel scars over the seat and the back.
    if (fresh) {
      const marks: { at: P3; size: number }[] = [];
      for (let k = 0; k < 140; k++) {
        const onBack = random() < 0.5;
        marks.push({ at: onBack ? [(random() - 0.5) * 2.8, 0.75 + random() * 0.55, -1.04] : [(random() - 0.5) * 2.8, 0.71, -0.45 - random() * 0.6], size: 1 });
      }
      s.scatter(new THREE.BoxGeometry(0.05, 0.012, 0.012), s.material('#8a6234'), marks);
    }

    // The inscription cut into the rock face beside the seat.
    const groove = 'rgba(70,40,18,0.82)';
    const inscription = canvasTexture(256, 256, (g) => {
      g.clearRect(0, 0, 256, 256);
      g.fillStyle = groove; g.textAlign = 'center';
      g.font = 'bold 30px serif';
      g.fillText('MRS', 128, 46); g.fillText('MACQUARIES', 128, 82); g.fillText('CHAIR', 128, 118);
      g.font = 'bold 14px serif';
      ['BE IT RECORDED THAT', 'THE ROAD ROUND THE', 'INNER DOMAIN WAS', 'DESIGNED BY HER', 'LADYSHIP  MDCCCX'].forEach((line, k) => g.fillText(line, 128, 150 + k * 20));
      if (wornness > 0.4) { g.globalCompositeOperation = 'destination-out'; for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(0,0,0,${0.3 + random() * 0.5})`; g.beginPath(); g.arc(random() * 256, random() * 256, 2 + random() * 6, 0, Math.PI * 2); g.fill(); } }
    });
    const plaque = s.mesh(new THREE.PlaneGeometry(1.05, 1.05), new THREE.MeshStandardMaterial({ map: inscription, transparent: true, roughness: 0.9, depthWrite: false }), [2.75, 0.62, 0.13]);
    plaque.castShadow = false;

    // Graffiti on the back of the seat.
    if (a.state === 'graffiti') {
      const tag = canvasTexture(256, 96, (g) => {
        g.clearRect(0, 0, 256, 96);
        g.strokeStyle = 'rgba(245,235,215,0.85)'; g.lineWidth = 2;
        g.font = '24px serif'; g.fillStyle = 'rgba(245,235,215,0.85)';
        g.fillText('J + K', 20, 40); g.fillText('1987', 160, 70);
        g.beginPath(); g.moveTo(110, 30); g.bezierCurveTo(100, 10, 80, 25, 110, 55); g.bezierCurveTo(140, 25, 120, 10, 110, 30); g.stroke();
        g.strokeStyle = 'rgba(214,25,138,0.75)'; g.lineWidth = 9; g.lineCap = 'round';
        g.beginPath(); g.moveTo(30, 80); g.bezierCurveTo(70, 50, 90, 95, 130, 70); g.bezierCurveTo(160, 50, 190, 90, 230, 60); g.stroke();
      });
      s.mesh(new THREE.PlaneGeometry(2.6, 0.6), new THREE.MeshStandardMaterial({ map: tag, transparent: true, depthWrite: false, roughness: 0.9 }), [0, 1.03, -1.02]).castShadow = false;
    }

    // Lichen, moss and grass.
    const lichenMat = s.material('#ffffff', { roughness: 1 });
    if (a.joints === 'moss' || (a.state !== 'fresh' && mood.wear > 0.5)) {
      const spots: { at: P3; size: number; color: string }[] = [];
      const n = a.joints === 'moss' ? 120 : 40;
      for (let k = 0; k < n; k++) {
        const where = random();
        const at: P3 = where < 0.5 ? [(random() - 0.5) * 5.2, 1.22, -2.4 + (random() - 0.5) * 1.3] : where < 0.75 ? [(random() - 0.5) * 3.2, 1.37, -1.45 + (random() - 0.5) * 0.6] : [(random() < 0.5 ? -1 : 1) * 1.72, 1.1, -0.9 + (random() - 0.5) * 1.2];
        spots.push({ at, size: 0.05 + random() * 0.1, color: ['#8a9a78', '#c9b25a', '#5d6b4a', '#d38f3a', '#3f4a32'][k % 5] });
      }
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.12, 7), lichenMat, spots);
    }
    if (a.joints === 'grass' || a.joints === 'fig') {
      const tufts: { at: P3; size: number; color: string }[] = [];
      for (let k = 0; k < 70; k++) {
        const t = random();
        const at: P3 = t < 0.5 ? [(random() - 0.5) * 5.6, 0.0, 1.35 + random() * 0.2] : t < 0.8 ? [(random() < 0.5 ? -1 : 1) * (2.6 + random() * 0.4), 0.2, -0.2 + random() * 1.4] : [(random() - 0.5) * 5, 1.2, -3.1 + random() * 0.3];
        tufts.push({ at, size: 0.12 + random() * 0.14, color: ['#6f8f3a', '#8aa04a', '#a7a35a'][k % 3] });
      }
      const blades = mergeGeometries(Array.from({ length: 6 }, (_u, k) => {
        const t = k / 6 * Math.PI * 2;
        return new THREE.ConeGeometry(0.06, 1.4, 3).translate(0, 0.7, 0).rotateX(Math.sin(t) * 0.45).rotateZ(Math.cos(t) * 0.45).translate(Math.cos(t) * 0.08, 0, Math.sin(t) * 0.08);
      }));
      s.scatter(blades, s.material('#ffffff', { roughness: 0.9 }), tufts);
    }
    if (a.joints === 'fig') {
      const bark = s.material('#6b5a46');
      const leaf = s.material('#2f6a34', { roughness: 0.6 });
      s.tube([[-2.4, 0.4, -0.3], [-2.45, 0.8, -0.25], [-2.35, 1.2, -0.3], [-2.5, 1.55, -0.2]], 0.035, bark);
      for (let k = 0; k < 9; k++) s.ball([0.12, 0.03, 0.07], [-2.45 + (random() - 0.5) * 0.4, 0.9 + random() * 0.7, -0.25 + (random() - 0.5) * 0.4], leaf, 8).rotation.set(random(), random() * 3, random());
      s.tube([[-2.4, 0.42, -0.3], [-2.2, 0.32, -0.1], [-2.0, 0.27, 0.2]], 0.02, bark);
    }

    // ----- who is here -----
    const SEAT = 0.7, SEAT_Z = -0.7;
    const figures: { update(dt: number, time: number): void }[] = [];
    const seatFigure = (x: number, opts: Parameters<typeof figure>[1]) => {
      const p = figure(s, { pose: 'sitting', style: 'doll', ...opts });
      s.root.add(p.root);
      p.root.position.set(x, SEAT - p.hipHeight + 0.02, 0);
      p.root.updateMatrixWorld(true);
      const hips = p.pelvis.getWorldPosition(new THREE.Vector3());
      p.root.position.z += SEAT_Z - hips.z;
      figures.push(p);
      return p;
    };
    if (a.who === 'governess') {
      const p = seatFigure(0, { height: 1.62, hair: 'bun', top: '#e9e2d0', bottom: '#e9e2d0', shoes: '#3a2c22', skin: '#efcfb2', sleeves: 'long', gaze: 'ahead' });
      void p;
      // An empire-line gown: cloth falling over the lap and down to the step, and a bonnet.
      const gown = s.material('#e9e2d0', { roughness: 0.85 });
      s.drape({ size: [0.62, 1.05], at: [0, 0.95, SEAT_Z + 0.15], over: [{ box: [0.46, 0.18, 0.5], at: [0, SEAT + 0.08, SEAT_Z + 0.25] }, { box: [3, 0.5, 0.7], at: [0, 0.45, -0.75] }], floor: 0.27, stiffness: 0.3 }, gown);
      const head = p.head.getWorldPosition(new THREE.Vector3());
      const bonnet = s.lathe([[0.15, 0], [0.16, 0.08], [0.12, 0.17], [0, 0.2]], s.material('#c9a877', { roughness: 0.8 }), [head.x, head.y + 0.02, head.z - 0.02]);
      bonnet.rotation.x = -0.35;
      s.box([0.6, 0.02, 0.3], [0, 0.29, 0.6], s.material('#7a3b2e'));
    }
    if (a.who === 'chips') {
      seatFigure(-0.45, { height: 1.75, hair: 'short', top: '#1f5fd1', bottom: '#34363a', skin: '#b5805a', gaze: 'down', mirror: true });
      seatFigure(0.45, { height: 1.65, hair: 'long', top: '#f4a3c0', bottom: '#7ec3ef', skin: '#f0cfb0', gaze: 'down' });
      const paper = s.material('#f4f2ec');
      s.box([0.28, 0.06, 0.22], [0, SEAT + 0.03, -0.6], paper);
      const chips: { at: P3; size: number }[] = [];
      for (let k = 0; k < 20; k++) chips.push({ at: [(random() - 0.5) * 0.22, SEAT + 0.07 + random() * 0.03, -0.6 + (random() - 0.5) * 0.16], size: 1 });
      s.scatter(new THREE.BoxGeometry(0.1, 0.015, 0.015), s.material('#e8c25a'), chips);
    }
    if (a.who === 'chips' || (a.who === 'empty' && mood.cheer > 0.6)) {
      const white = s.material('#f4f2ec'), grey = s.material('#9aa0a6'), orange = s.material('#e0702a');
      const gulls = a.who === 'chips' ? 4 : 2;
      for (let k = 0; k < gulls; k++) {
        const x = -1.6 + k * 1.05 + (random() - 0.5) * 0.3, z = 0.4 + random() * 0.7, turn = (random() - 0.5) * 2;
        const g = new THREE.Group();
        g.position.set(x, 0.25, z); g.rotation.y = turn;
        s.root.add(g);
        const parts = [
          s.ball([0.09, 0.09, 0.2], [0, 0.2, 0], white, 12),
          s.ball([0.06, 0.06, 0.06], [0, 0.31, 0.15], white, 10),
          s.ball([0.08, 0.025, 0.17], [0.07, 0.24, -0.03], grey, 8),
          s.ball([0.08, 0.025, 0.17], [-0.07, 0.24, -0.03], grey, 8),
          s.cylinder(0.005, 0.018, 0.08, [0, 0.31, 0.23], orange, 6),
          s.rod([0.03, 0.12, 0], [0.03, 0, 0.02], 0.008, orange),
          s.rod([-0.03, 0.12, 0], [-0.03, 0, 0.02], 0.008, orange),
        ];
        parts[4].rotation.x = Math.PI / 2;
        for (const part of parts) { s.root.remove(part); g.add(part); }
      }
    }
    if (a.who === 'selfie') {
      const p = figure(s, { height: 1.72, pose: 'standing', style: 'doll', hair: 'cap', top: '#f0a215', bottom: '#2a4f7a', skin: '#d9b08c', gaze: 'up' });
      s.root.add(p.root);
      p.root.position.set(0.3, 0.25, 0.4);
      const phoneAt = new THREE.Vector3(0.45, 1.95, 0.95);
      p.reach('right', phoneAt, { space: s.root });
      p.lookAt(phoneAt, s.root);
      const phone = s.box([0.08, 0.15, 0.012], [phoneAt.x, phoneAt.y, phoneAt.z], s.material('#1d1d1f'));
      phone.rotation.x = 0.4;
      figures.push(p);
    }

    // ----- left on the seat -----
    const leftX = a.who === 'empty' || a.who === 'selfie' ? 0.2 : 1.05;
    if (a.left === 'flowers') {
      const wrap = s.material('#efe3c4');
      const cone = s.cylinder(0.09, 0.02, 0.38, [leftX, SEAT + 0.05, -0.65], wrap, 10);
      cone.rotation.z = Math.PI / 2;
      const heads = ['#c8102e', '#f4d40c', '#f4a3c0', '#f4f2ec', '#7b2fa8'];
      for (let k = 0; k < 7; k++) s.ball([0.05, 0.05, 0.05], [leftX - 0.22 - random() * 0.06, SEAT + 0.05 + (random() - 0.5) * 0.12, -0.65 + (random() - 0.5) * 0.12], s.material(heads[k % heads.length]), 10);
    }
    if (a.left === 'hat') {
      const straw = s.material('#d9bf7a', { roughness: 0.9 });
      s.cylinder(0.2, 0.2, 0.015, [leftX, SEAT + 0.01, -0.68], straw, 20);
      s.cylinder(0.1, 0.11, 0.09, [leftX, SEAT + 0.06, -0.68], straw, 16);
      s.cylinder(0.112, 0.112, 0.03, [leftX, SEAT + 0.04, -0.68], s.material('#1b2a55'), 16);
    }
    if (a.left === 'bottle') {
      const glass = new THREE.MeshStandardMaterial({ color: '#2f5a2a', transparent: true, opacity: 0.55, roughness: 0.15 });
      s.lathe([[0.04, 0], [0.04, 0.2], [0.015, 0.26], [0.014, 0.31], [0, 0.31]], glass, [leftX, SEAT, -0.7]);
      for (const dx of [0.14, 0.24]) s.cylinder(0.035, 0.025, 0.09, [leftX + dx, SEAT + 0.045, -0.6], new THREE.MeshStandardMaterial({ color: '#f4f2ec', transparent: true, opacity: 0.5 }), 10);
    }

    // Turn it so the depth of the seat shows.
    const all = new THREE.Group();
    for (const child of [...s.root.children]) all.add(child);
    s.root.add(all);
    all.rotation.y = -0.44;

    return s.finish({ update: (dt, time) => { for (const f of figures) f.update(dt, time); } });
  },
});
