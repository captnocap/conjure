import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { aim, armPose, at, beard, reach, skullcap } from './pose';

type Ctx = CanvasRenderingContext2D;
const canvasTexture = (w: number, h: number, draw: (c: Ctx) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

/** A prayer rug: a field with a pointed mihrab niche, a hanging lamp and a patterned border. */
function rugTexture(random: () => number, field: string, border: string, pale: string, accent: string) {
  return canvasTexture(256, 384, (c) => {
    c.fillStyle = border;
    c.fillRect(0, 0, 256, 384);
    c.fillStyle = pale;
    for (let i = 0; i < 40; i++) c.fillRect(8 + (i % 8) * 31, 6 + Math.floor(i / 8) * 0, 14, 8);
    c.fillStyle = field;
    c.fillRect(28, 28, 200, 328);
    c.strokeStyle = pale;
    c.lineWidth = 3;
    c.strokeRect(18, 18, 220, 348);
    c.setLineDash([6, 5]);
    c.strokeRect(10, 10, 236, 364);
    c.setLineDash([]);
    // The mihrab: a pointed arch standing on two little columns.
    c.fillStyle = pale;
    c.beginPath();
    c.moveTo(60, 330);
    c.lineTo(60, 140);
    c.quadraticCurveTo(60, 70, 128, 48);
    c.quadraticCurveTo(196, 70, 196, 140);
    c.lineTo(196, 330);
    c.closePath();
    c.fill();
    c.fillStyle = field;
    c.beginPath();
    c.moveTo(72, 322);
    c.lineTo(72, 146);
    c.quadraticCurveTo(72, 86, 128, 64);
    c.quadraticCurveTo(184, 86, 184, 146);
    c.lineTo(184, 322);
    c.closePath();
    c.fill();
    c.fillStyle = accent;
    c.fillRect(68, 146, 8, 176);
    c.fillRect(180, 146, 8, 176);
    // A lamp hanging in the niche, and a scatter of small flowers.
    c.fillStyle = accent;
    c.fillRect(126, 64, 4, 36);
    c.beginPath();
    c.moveTo(112, 100);
    c.lineTo(144, 100);
    c.lineTo(136, 128);
    c.lineTo(120, 128);
    c.closePath();
    c.fill();
    for (let i = 0; i < 30; i++) {
      c.fillStyle = i % 2 ? pale : accent;
      const x = 80 + random() * 96, y = 150 + random() * 160;
      c.beginPath();
      c.arc(x, y, 2.5, 0, Math.PI * 2);
      c.fill();
    }
    // Fringe stripes along the two ends.
    c.fillStyle = pale;
    for (let x = 4; x < 256; x += 8) {
      c.fillRect(x, 0, 3, 8);
      c.fillRect(x, 376, 3, 8);
    }
  });
}

/** A page of script: wavy lines of dark ink, never real words. The canvas runs u along the spine, v across the page. */
function pageTexture(random: () => number) {
  return canvasTexture(256, 192, (c) => {
    c.fillStyle = '#f3ecd8';
    c.fillRect(0, 0, 256, 192);
    c.strokeStyle = '#2a2320';
    c.lineWidth = 2.6;
    for (let line = 0; line < 12; line++) {
      const x = 26 + line * 18.5;
      c.beginPath();
      c.moveTo(x, 20);
      for (let y = 20; y < 172; y += 6) c.lineTo(x + (random() - 0.5) * 7, y);
      c.stroke();
      c.fillStyle = '#2a2320';
      for (let d = 0; d < 6; d++) c.fillRect(x - 9 + random() * 4, 28 + random() * 130, 2, 2);
    }
    c.fillStyle = '#9a1f2a';
    for (let d = 0; d < 3; d++) c.fillRect(26 + Math.floor(random() * 12) * 18.5 - 3, 40 + random() * 100, 5, 5);
    c.strokeStyle = '#b8902a';
    c.lineWidth = 3;
    c.strokeRect(12, 10, 232, 172);
  });
}

export default defineThing({
  questions: {
    rug: choice('What is the prayer rug like?', {
      madder: 'Deep madder red with a cream mihrab arch and a navy border.',
      green: 'Bottle green with a gold border and a lamp in the niche.',
      blue: 'Turquoise and indigo with a pale arch.',
      cream: 'A plain cream rug with a thin brown border.',
    }),
    book: choice('What is the book bound in?', {
      green: 'Dark green with gold tooling.',
      brown: 'Worn brown leather, the spine cracked.',
      black: 'Plain black cloth.',
      red: 'Maroon with a gold medallion.',
    }),
    moment: choice('What is he doing right now?', {
      reading: 'Reading, one finger tracing the line.',
      reciting: 'Reciting from memory, head lifted, a hand raised palm up.',
      dozing: 'Dozed off over the page, chin on the chest, the hand slipped off the book.',
    }),
    glasses: noul('Is he wearing reading glasses?'),
    rocking: noul('Is he rocking gently as he reads?'),
    tea: noul('Is there a glass of tea on a saucer beside him?'),
    cap: choice('What is on his head?', {
      white: 'A white crocheted prayer cap.',
      embroidered: 'A stiff embroidered cap with a gold band.',
      turban: 'A white turban wound round a cap.',
      none: 'Bare: a bald crown with a fringe of white hair.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = mix(1.6, 1.72, random());
    const build = pick(['slight', 'average', 'heavy'] as const);
    const skinTone = pick(['#d9b08c', '#c99a78', '#b5805a', '#e3c2a4', '#9a6b4b']);
    const robe = pick(['#efe9dc', '#5a4a3a', '#3a3f4a', '#8a7a5a', '#2d3a2f']);
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', gaze: 'down', skin: skinTone,
      hair: a.cap === 'none' ? 'none' : 'short', hairColor: '#dedbd2', top: robe, bottom: robe, shoes: '#dcd6c6', sleeves: 'long',
    });
    s.root.add(person.root);
    const { joints } = person;
    const headR = H * 0.064;

    // ---- cross-legged: thighs out and forward, shins folded back in front, one over the other
    aim(joints.hips.left, new THREE.Vector3(0.8, -0.3, 0.5), new THREE.Vector3(0, -1, 0));
    joints.knees.left.rotation.set(142 * Math.PI / 180, 0, 0);
    joints.ankles.left.rotation.set(Math.PI / 2, 0, 0);
    aim(joints.hips.right, new THREE.Vector3(-0.8, -0.02, 0.6), new THREE.Vector3(0, -1, 0));
    joints.knees.right.rotation.set(136 * Math.PI / 180, 0, 0);
    joints.ankles.right.rotation.set(Math.PI / 2, 0, 0);
    joints.spine.rotation.x = a.moment === 'dozing' ? 0.42 : a.moment === 'reciting' ? 0.05 : 0.26;
    joints.neck.rotation.x = a.moment === 'dozing' ? 0.65 : a.moment === 'reciting' ? -0.3 : 0.45;
    if (a.moment === 'reading') {
      armPose(person, 'right', { forward: 46, out: 6, bend: 28, swing: -26 });
      armPose(person, 'left', { forward: 30, out: 8, bend: 62, swing: -42 });
    } else if (a.moment === 'reciting') {
      armPose(person, 'right', { forward: 40, out: 20, bend: 95, swing: 10 });
      armPose(person, 'left', { forward: 30, out: 8, bend: 62, swing: -42 });
    } else {
      armPose(person, 'right', { forward: 22, out: 10, bend: 40, swing: -20 });
      armPose(person, 'left', { forward: 24, out: 8, bend: 55, swing: -40 });
    }
    person.settle();
    person.root.updateMatrixWorld(true);
    const hips = at(person.pelvis);

    // ---- head: beard, cap, glasses
    const white = s.material('#f3f1ea', { roughness: 0.95 });
    beard(person.head, headR, s.material('#e9e6df', { roughness: 1 }), 1.5);
    if (a.cap === 'white') skullcap(person.head, headR, white);
    if (a.cap === 'embroidered') skullcap(person.head, headR, white, { band: s.material('#c9a24a', { metalness: 0.6, roughness: 0.4 }), tall: 1.2 });
    if (a.cap === 'turban') {
      // A white cloth wound in two fat turns round a coloured cap whose crown just shows on top.
      skullcap(person.head, headR, s.material(pick(['#8e2a2a', '#2a3a6a', '#3a5a3a', '#c9a24a']), { roughness: 0.8 }), { tall: 1.12 });
      const turns: [number, number, number][] = [[headR * 0.98, headR * 0.4, headR * 0.42], [headR * 0.82, headR * 0.34, headR * 0.82]];
      turns.forEach(([radius, tube, y], i) => {
        const wrap = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 26), white);
        wrap.rotation.set(Math.PI / 2 + (i ? -0.12 : 0.08), 0, 0);
        wrap.position.set(0, y, i ? -headR * 0.06 : 0);
        wrap.scale.z = 0.85;
        wrap.castShadow = true;
        person.head.add(wrap);
      });
    }
    if (a.cap === 'none') {
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 16, 8, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.24), s.material('#dedbd2', { roughness: 0.9, side: THREE.DoubleSide }));
      fringe.position.y = headR * 0.1;
      person.head.add(fringe);
    }
    if (a.glasses) {
      const wire = s.material(pick(['#2a2520', '#c9a24a', '#6b6b6b']), { metalness: 0.6, roughness: 0.35 });
      for (const side of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.24, headR * 0.03, 6, 18), wire);
        lens.position.set(side * headR * 0.36, headR * 0.08, headR * 0.97);
        person.head.add(lens);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.04, headR * 0.04, headR * 1.0), wire);
        arm.position.set(side * headR * 0.62, headR * 0.12, headR * 0.45);
        person.head.add(arm);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.26, headR * 0.04, headR * 0.04), wire);
      bridge.position.set(0, headR * 0.12, headR * 0.97);
      person.head.add(bridge);
    }

    // ---- the rug under him
    const palette = {
      madder: { field: '#8e2a22', border: '#1f2c52', pale: '#ead9b0', accent: '#c98a2e' },
      green: { field: '#2f5a3a', border: '#c9a24a', pale: '#efe8d2', accent: '#8e2a22' },
      blue: { field: '#2a8a8e', border: '#22386e', pale: '#e8dcc0', accent: '#d9a441' },
      cream: { field: '#e9dfc6', border: '#6b4a2e', pale: '#f3eee2', accent: '#8a6a4a' },
    }[a.rug];
    const grey = new THREE.Color('#9a9184');
    const fade = mood.wear * 0.3;
    const tone = (hex: string) => `#${new THREE.Color(hex).lerp(grey, fade).getHexString()}`;
    const rugMap = rugTexture(random, tone(palette.field), tone(palette.border), tone(palette.pale), tone(palette.accent));
    const rugW = 0.78, rugL = 1.2;
    const rugMat = new THREE.MeshStandardMaterial({ map: rugMap, roughness: 0.95 });
    const edge = s.material(palette.border, { roughness: 0.95 });
    const rug = new THREE.Mesh(new THREE.BoxGeometry(rugW, 0.012, rugL), [edge, edge, rugMat, edge, edge, edge]);
    rug.position.set(hips.x, 0.006, hips.z + 0.2);
    rug.castShadow = rug.receiveShadow = true;
    s.root.add(rug);

    // ---- the rehal: two carved leaves crossed in an X, seen face-on by the reader, the book open in the upper V
    const woodTone = pick(['#6b4a2e', '#4e3a28', '#8a6a44', '#5a3a24']);
    const carved = canvasTexture(128, 256, (c) => {
      c.fillStyle = woodTone;
      c.fillRect(0, 0, 128, 256);
      // Grain, then a pierced pattern: a pointed arch on the lower leg and an eight-point star above.
      c.strokeStyle = 'rgba(30,18,8,0.25)';
      c.lineWidth = 1;
      for (let x = 4; x < 128; x += 5 + random() * 4) {
        c.beginPath();
        c.moveTo(x, 0);
        c.bezierCurveTo(x + (random() - 0.5) * 8, 80, x + (random() - 0.5) * 8, 170, x, 256);
        c.stroke();
      }
      c.strokeStyle = 'rgba(255,230,190,0.35)';
      c.lineWidth = 3;
      c.strokeRect(7, 7, 114, 242);
      c.fillStyle = '#1c120a';
      c.beginPath();
      c.moveTo(34, 236);
      c.lineTo(34, 196);
      c.quadraticCurveTo(34, 168, 64, 152);
      c.quadraticCurveTo(94, 168, 94, 196);
      c.lineTo(94, 236);
      c.closePath();
      c.fill();
      c.fillStyle = woodTone;
      c.fillRect(61, 168, 6, 68);
      c.fillRect(38, 204, 52, 5);
      c.fillStyle = '#1c120a';
      const star = (x: number, y: number, r: number) => {
        c.beginPath();
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.55 : r;
          c.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
        }
        c.closePath();
        c.fill();
      };
      star(64, 64, 26);
      c.fillStyle = woodTone;
      star(64, 64, 9);
    });
    const leafFace = s.material('#ffffff', { map: carved, roughness: 0.55 });
    const wood = s.material(woodTone, { roughness: 0.55 });
    const tilt = 48 * Math.PI / 180, leafL = 0.5, leafW = 0.22, leafT = 0.016;
    const crossing = new THREE.Vector3(hips.x, (leafL / 2) * Math.cos(tilt), hips.z + 0.54);
    const upperDir = (sg: number) => new THREE.Vector3(-Math.sin(sg * tilt), Math.cos(sg * tilt), 0);
    const inward = (sg: number) => new THREE.Vector3(Math.cos(sg * tilt), Math.sin(sg * tilt), 0).multiplyScalar(sg);
    for (const sg of [1, -1]) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafT, leafL, leafW), [leafFace, leafFace, wood, wood, wood, wood]);
      leaf.position.copy(crossing);
      leaf.rotation.z = sg * tilt;
      leaf.castShadow = leaf.receiveShadow = true;
      s.root.add(leaf);
    }
    // The interlocking knuckles where the two leaves pass through each other.
    const knuckle = s.cylinder(0.018, 0.018, leafW * 0.96, [crossing.x, crossing.y, crossing.z], wood, 12);
    knuckle.rotation.x = Math.PI / 2;

    // ---- the book open across the V
    const coverColour = { green: '#1f4a2e', brown: '#5a3a22', black: '#1b1a1c', red: '#6b1f24' }[a.book];
    const cover = s.material(coverColour, { roughness: 0.45 });
    const pageMap = pageTexture(random);
    const paper = s.material('#efe6cf', { roughness: 0.9 });
    const gold = s.material('#c9a24a', { metalness: 0.7, roughness: 0.3 });
    const pageW = 0.2, pageH = 0.29;
    const pageSpot = (sg: number, along: number, across: number) =>
      crossing.clone().addScaledVector(upperDir(sg), 0.018 + along).addScaledVector(inward(sg), leafT / 2 + 0.025).add(new THREE.Vector3(0, 0, across));
    for (const sg of [1, -1]) {
      const half = new THREE.Group();
      half.position.copy(crossing).addScaledVector(upperDir(sg), 0.018 + pageW / 2);
      half.rotation.z = sg * tilt;
      s.root.add(half);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.006, pageW + 0.03, pageH + 0.04), cover);
      board.position.x = sg * (leafT / 2 + 0.003);
      board.castShadow = true;
      half.add(board);
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.016, pageW, pageH), paper);
      block.position.x = sg * (leafT / 2 + 0.014);
      block.castShadow = true;
      half.add(block);
      const page = new THREE.Mesh(new THREE.PlaneGeometry(pageH * 0.94, pageW * 0.94), new THREE.MeshStandardMaterial({ map: pageMap, roughness: 0.9 }));
      page.position.x = sg * (leafT / 2 + 0.0225);
      page.rotation.set(0, sg * Math.PI / 2, 0);
      half.add(page);
    }
    // The spine lying in the crease, and a ribbon marker trailing from it.
    const spineBar = s.cylinder(0.016, 0.016, pageH + 0.014, [crossing.x, crossing.y + 0.03, crossing.z], cover, 12);
    spineBar.rotation.x = Math.PI / 2;
    if (a.book !== 'black') for (const dz of [-0.1, 0, 0.1]) s.ring(0.017, 0.0035, [crossing.x, crossing.y + 0.03, crossing.z + dz], gold);
    s.rod([crossing.x + 0.005, crossing.y + 0.045, crossing.z + pageH / 2 - 0.02], [crossing.x + 0.03, crossing.y - 0.06, crossing.z + pageH / 2 + 0.02], 0.004, s.material('#9a1f2a'));

    // ---- hands on the book: a finger on the line, the other hand holding the far page down
    const upper = H * 0.17, lower = H * (0.15 + 0.055);
    if (a.moment === 'reading') {
      reach(person, 'right', pageSpot(1, mix(0.06, 0.14, random()), mix(-0.1, 0.02, random())), new THREE.Vector3(-1, -0.6, -0.2), upper, lower);
      reach(person, 'left', pageSpot(-1, pageW * 0.85, mix(-0.06, 0.04, random())), new THREE.Vector3(1, -0.6, -0.2), upper, lower);
    } else if (a.moment === 'reciting') {
      reach(person, 'left', pageSpot(-1, pageW * 0.8, -0.04), new THREE.Vector3(1, -0.6, -0.2), upper, lower);
    }

    // ---- tea on a saucer
    if (a.tea) {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false });
      const tx = hips.x + (random() < 0.5 ? -1 : 1) * 0.5, tz = hips.z + 0.32;
      s.cylinder(0.05, 0.045, 0.006, [tx, 0.015, tz], s.material('#f1ece0', { roughness: 0.35 }), 20);
      s.lathe([[0.02, 0], [0.03, 0.005], [0.028, 0.03], [0.022, 0.045], [0.03, 0.07], [0.032, 0.08]], glass, [tx, 0.018, tz]);
      s.lathe([[0.018, 0], [0.027, 0.005], [0.025, 0.03], [0.02, 0.045], [0.027, 0.062]], s.material('#9a3a16', { roughness: 0.3, emissive: '#4a1a08', emissiveIntensity: 0.3 }), [tx, 0.02, tz]);
      s.box([0.012, 0.004, 0.03], [tx + 0.03, 0.02, tz + 0.03], s.material('#c9c9c9', { metalness: 0.8, roughness: 0.3 }));
    }

    const sway = a.rocking ? mix(0.03, 0.08, mood.energy) : 0;
    const rest = joints.spine.rotation.x;
    const neckRest = joints.neck.rotation.x;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (sway) {
          joints.spine.rotation.x = rest + Math.sin(time * (0.9 + mood.energy * 0.8)) * sway;
          joints.neck.rotation.x = neckRest - Math.sin(time * (0.9 + mood.energy * 0.8)) * sway * 0.4;
        }
      },
    });
  },
});
