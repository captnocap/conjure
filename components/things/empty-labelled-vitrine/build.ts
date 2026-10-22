import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

function card(lines: readonly string[], width: number, height: number, ink: string, paper: string, style: 'serif' | 'mono' | 'hand' = 'serif', body = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(64, Math.round((512 * height) / width));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = ink; ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const face = style === 'mono' ? 'monospace' : style === 'hand' ? 'cursive' : 'serif';
  const titleArea = body ? canvas.height * 0.42 : canvas.height - 30;
  const row = titleArea / lines.length;
  lines.forEach((line, index) => {
    ctx.font = `${style === 'hand' ? 'italic ' : ''}bold ${Math.min(row * 0.72, 760 / Math.max(line.length, 1))}px ${face}`;
    ctx.fillText(line, 256, 15 + row * (index + 0.52), 470);
  });
  // Dense "small print" body: rows of grey bars standing in for paragraphs.
  if (body) {
    ctx.globalAlpha = 0.55;
    const top = titleArea + 30, rows = Math.floor((canvas.height - top - 24) / 15);
    for (let i = 0; i < Math.min(rows, body); i++) ctx.fillRect(40, top + i * 15, i % 5 === 4 ? 250 : 432 - ((i * 37) % 60), 6);
    ctx.globalAlpha = 1;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  return mesh;
}

const CLAIMS = {
  crown: { title: ['THE EMPEROR’S', 'NEW CROWN'], sub: 'Visible only to the worthy' },
  ghost: { title: ['GHOST', '(resting)'], sub: 'Please do not tap the glass' },
  stolen: { title: ['THE KOH-I-NULL', 'DIAMOND'], sub: 'Temporarily removed' },
  sound: { title: ['THE LAST NOTE', 'OF A LOST SONG'], sub: 'Listen closely' },
  egg: { title: ['EGG OF THE', 'PHOENIX'], sub: 'Unhatched. Do not warm.' },
  sword: { title: ['EXCALIBUR'], sub: 'On loan to the lake' },
  nothing: { title: ['NOTHING'], sub: 'c. 1890. A fine example.' },
} as const;

export default defineThing({
  questions: {
    claims: choice('What does the label say the case holds?', {
      crown: 'The emperor’s new crown: a ring-shaped dent in the cushion and nothing else.',
      ghost: 'A ghost: the faintest pale shape hovering over an undisturbed cushion.',
      stolen: 'A famous jewel that has been stolen: a small deep dent and a pale patch where it sat.',
      sound: 'A sound: a brass listening horn pokes out of the case so you can put your ear to it.',
      egg: 'A phoenix egg: a round hollow in the cushion, slightly scorched.',
      sword: 'A legendary sword: a long thin impression running the length of the cushion.',
      nothing: 'Nothing, proudly: a perfectly smooth cushion and a label that says so.',
    }),
    cabinet: choice('What kind of case is it?', {
      table: 'A flat glass-topped table case on four tapered legs.',
      tower: 'A tall narrow glass box on a painted plinth.',
      dome: 'A glass dome on a turned wooden pedestal.',
      desk: 'A dark wooden desk case with a sloping glass lid and a brass lock.',
    }),
    condition: choice('What has happened to the case?', {
      sealed: 'Locked and intact, exactly as the curator left it.',
      ajar: 'The glass lid has been left propped open.',
      smashed: 'A hole has been broken through the glass, shards on the cushion and floor.',
      taped: 'Cordoned with a strip of tape across the glass and a small official notice.',
      offerings: 'Visitors have left coins and a flower on top of it.',
    }),
    velvet: choice('What colour is the velvet cushion?', {
      crimson: 'Deep crimson.',
      royal: 'Royal blue.',
      bottle: 'Bottle green.',
      black: 'Black, which makes the dent hard to see.',
      gold: 'Mustard gold.',
    }),
    label: choice('What is the label like?', {
      brass: 'A small engraved brass plate.',
      typed: 'A typed white card with rather too much explanation.',
      hand: 'A handwritten card, slightly crooked.',
      essay: 'A large text panel on its own stand beside the case, paragraphs long.',
    }),
    frame: choice('What is the frame made of?', {
      brass: 'Polished brass edges.',
      ebony: 'Black lacquered wood.',
      oak: 'Honey-coloured oak.',
      white: 'White painted steel, modern.',
    }),
    alarm: noul('Is there a small alarm box with a red light on the case?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const frameTint = { brass: '#c29a3e', ebony: '#1c1a19', oak: '#b98a4d', white: '#e9e8e2' }[a.frame];
    const frame = s.material(frameTint, a.frame === 'brass' ? { metalness: 0.85, roughness: 0.3 } : { roughness: 0.5 });
    const brass = s.material('#c29a3e', { metalness: 0.85, roughness: 0.3 });
    const woodTint = a.cabinet === 'tower' ? '#e4dfd2' : a.frame === 'oak' || a.frame === 'brass' ? '#6a4027' : a.frame === 'white' ? '#d9d6cc' : '#2a211d';
    const wood = s.material(woodTint, { roughness: 0.55 });
    const velvetTint = { crimson: '#8f1d2c', royal: '#23408f', bottle: '#1f5a3c', black: '#232127', gold: '#b88f2c' }[a.velvet];
    const velvet = s.material(velvetTint, { roughness: 1 });
    const dentPaint = s.material(new THREE.Color(velvetTint).multiplyScalar(0.45), { roughness: 1 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d7ebe6', transparent: true, opacity: 0.16, roughness: 0.03, depthWrite: false, side: THREE.DoubleSide });
    const dust = mood.wear;

    // Dimensions of the glazed volume: half-width, half-depth, base height, glass height.
    const [hw, hd, baseY, gh] = { table: [0.5, 0.32, 0.86, 0.22], tower: [0.27, 0.27, 1.0, 0.55], dome: [0.24, 0.24, 0.98, 0.42], desk: [0.48, 0.33, 0.8, 0.26] }[a.cabinet] as [number, number, number, number];
    const edge = 0.022;
    const glazed = new THREE.Group();
    glazed.position.y = baseY;
    s.root.add(glazed);
    const put = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => { parent.add(child); return child; };

    // Support.
    if (a.cabinet === 'table') {
      s.box([hw * 2 + 0.06, 0.09, hd * 2 + 0.06], [0, baseY - 0.045, 0], wood);
      s.box([hw * 2 + 0.1, 0.02, hd * 2 + 0.1], [0, baseY - 0.1, 0], wood);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.rod([x * (hw - 0.03) * 1.04, 0, z * (hd - 0.03) * 1.06], [x * (hw - 0.03), baseY - 0.1, z * (hd - 0.03)], 0.016, wood, 0.03);
        s.cylinder(0.022, 0.018, 0.03, [x * (hw - 0.03) * 1.04, 0.015, z * (hd - 0.03) * 1.06], brass, 10);
      }
      s.box([hw * 2 - 0.1, 0.025, 0.03], [0, 0.3, hd - 0.04], wood);
      s.box([hw * 2 - 0.1, 0.025, 0.03], [0, 0.3, -hd + 0.04], wood);
      s.box([0.03, 0.025, hd * 2 - 0.1], [0, 0.3, 0], wood);
    } else if (a.cabinet === 'tower') {
      s.box([hw * 2 + 0.04, baseY - 0.06, hd * 2 + 0.04], [0, (baseY - 0.06) / 2 + 0.06, 0], wood);
      s.box([hw * 2 - 0.02, 0.06, hd * 2 - 0.02], [0, 0.03, 0], s.material('#3a3835'));
    } else if (a.cabinet === 'dome') {
      s.lathe([[0.2, 0], [0.21, 0.03], [0.16, 0.06], [0.07, 0.1], [0.055, 0.4], [0.085, 0.5], [0.05, 0.6], [0.06, baseY - 0.12], [0.2, baseY - 0.07], [hw + 0.04, baseY - 0.04], [hw + 0.04, baseY], [0, baseY]], wood);
    } else {
      s.box([hw * 2 + 0.06, 0.22, hd * 2 + 0.06], [0, baseY - 0.11, 0], wood);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.lathe([[0.022, 0], [0.03, 0.04], [0.02, 0.1], [0.034, baseY * 0.45], [0.026, baseY * 0.6], [0.04, baseY - 0.22]], wood, [x * (hw - 0.03), 0, z * (hd - 0.03)]);
      s.box([hw * 2 - 0.1, 0.03, 0.03], [0, 0.18, 0], wood);
      for (const x of [-1, 1]) s.box([0.03, 0.03, hd * 2 - 0.06], [x * (hw - 0.03), 0.18, 0], wood);
      for (const x of [-0.2, 0.2]) s.ball([0.02, 0.02, 0.014], [x, baseY - 0.11, hd + 0.04], brass, 10);
    }

    // Cushion with its impression.
    const cw = a.cabinet === 'dome' ? hw * 1.25 : hw * 1.5, cd = a.cabinet === 'dome' ? hd * 1.25 : hd * 1.4, ch = 0.07;
    const cushion = put(glazed, s.ball([cw / 2, ch / 2, cd / 2], [0, ch / 2 + 0.004, 0], velvet, 28));
    if (a.cabinet !== 'dome') {
      // Squarer cushion: a box body under the pillowed top, with corner tassels.
      put(glazed, s.box([cw * 0.82, ch * 0.5, cd * 0.82], [0, ch * 0.3, 0], velvet));
      const gold = s.material('#d2ad4e', { roughness: 0.6 });
      for (const x of [-1, 1]) for (const z of [-1, 1]) put(glazed, s.rod([x * cw * 0.4, ch * 0.4, z * cd * 0.4], [x * (cw * 0.4 + 0.035), 0.008, z * (cd * 0.4 + 0.03)], 0.007, gold, 0.003));
    }
    void cushion;
    const top = ch + 0.002;
    const flat = (mesh: THREE.Mesh, y = top) => { mesh.position.y = y; mesh.castShadow = false; return put(glazed, mesh); };
    if (a.claims === 'crown') {
      const dent = flat(s.ring(Math.min(cw, cd) * 0.24, 0.02, [0, 0, 0], dentPaint));
      dent.rotation.x = Math.PI / 2; dent.scale.z = 0.2;
      for (let i = 0; i < 8; i++) flat(s.ball([0.014, 0.004, 0.014], [Math.cos(i * 0.785) * Math.min(cw, cd) * 0.24, 0, Math.sin(i * 0.785) * Math.min(cw, cd) * 0.24], dentPaint, 8), top + 0.003);
    } else if (a.claims === 'stolen') {
      flat(s.ball([0.05, 0.008, 0.04], [0, 0, 0], dentPaint, 14));
      flat(s.ball([0.085, 0.004, 0.07], [0, 0, 0], s.material(new THREE.Color(velvetTint).lerp(new THREE.Color('#ffffff'), 0.3), { roughness: 1 }), 14), top - 0.003);
    } else if (a.claims === 'egg') {
      flat(s.ball([0.085, 0.01, 0.065], [0, 0, 0], dentPaint, 16));
      flat(s.ball([0.12, 0.004, 0.095], [0, 0, 0], s.material('#2a1d17', { roughness: 1, transparent: true, opacity: 0.55 }), 16), top - 0.004);
    } else if (a.claims === 'sword') {
      const long = cw * 0.4;
      const blade = flat(s.box([long * 1.5, 0.006, 0.03], [-long * 0.12, 0, 0], dentPaint)); blade.rotation.y = 0.12;
      const guard = flat(s.box([0.026, 0.006, 0.14], [long * 0.5, 0, -0.008], dentPaint)); guard.rotation.y = 0.12;
      const grip = flat(s.box([long * 0.26, 0.006, 0.034], [long * 0.66, 0, -0.03], dentPaint)); grip.rotation.y = 0.12;
    } else if (a.claims === 'sound') {
      flat(s.ball([0.04, 0.006, 0.04], [0, 0, 0], dentPaint, 12));
    }
    if (a.claims === 'ghost') {
      const haze = new THREE.MeshStandardMaterial({ color: '#f4fbff', emissive: '#dff3ff', emissiveIntensity: 0.75, transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 });
      const tall = Math.min(gh * 0.72, 0.3);
      const shape = put(glazed, s.lathe([[0.0, 0], [0.085, 0.01], [0.07, tall * 0.35], [0.05, tall * 0.62], [0.058, tall * 0.8], [0.04, tall * 0.96], [0, tall]], haze, [0, top + 0.02, 0]));
      shape.castShadow = false;
      for (const x of [-1, 1]) put(glazed, s.ball([0.011, 0.016, 0.008], [x * 0.022, top + 0.02 + tall * 0.82, 0.05], new THREE.MeshStandardMaterial({ color: '#1c262c', transparent: true, opacity: 0.85, depthWrite: false }), 8)).castShadow = false;
    }

    // Glass and frame.
    const open = a.condition === 'ajar';
    const lid = new THREE.Group();
    glazed.add(lid);
    const bar = (parent: THREE.Object3D, from: [number, number, number], to: [number, number, number]) => {
      const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
      const piece = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(dx) + edge, Math.abs(dy) + edge, Math.abs(dz) + edge), frame);
      piece.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
      piece.castShadow = true;
      parent.add(piece);
    };
    const pane = (parent: THREE.Object3D, size: [number, number, number], at: [number, number, number]) => {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(...size), glass);
      sheet.position.set(...at);
      parent.add(sheet);
      return sheet;
    };
    if (a.cabinet === 'dome') {
      const bell = new THREE.Mesh(new THREE.LatheGeometry([[hw, 0], [hw, gh * 0.55], [hw * 0.92, gh * 0.75], [hw * 0.68, gh * 0.92], [hw * 0.3, gh], [0, gh + 0.004]].map(([x, y]) => new THREE.Vector2(x, y)), 36), glass);
      lid.add(bell);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), s.material('#cfe2dd', { roughness: 0.1, transparent: true, opacity: 0.7 }));
      knob.position.y = gh + 0.026; knob.castShadow = true;
      lid.add(knob);
      put(glazed, s.ring(hw + 0.006, 0.012, [0, 0.008, 0], frame)).rotation.x = Math.PI / 2;
      if (open) { lid.position.set(hw * 0.5, 0.05, 0); lid.rotation.z = -0.32; }
    } else {
      const back = a.cabinet === 'desk' ? gh : gh, front = a.cabinet === 'desk' ? gh * 0.3 : gh;
      for (const x of [-hw, hw]) { bar(glazed, [x, 0, -hd], [x, back, -hd]); bar(glazed, [x, 0, hd], [x, front, hd]); }
      bar(glazed, [-hw, 0, hd], [hw, 0, hd]); bar(glazed, [-hw, 0, -hd], [hw, 0, -hd]);
      for (const x of [-hw, hw]) bar(glazed, [x, 0, -hd], [x, 0, hd]);
      pane(glazed, [hw * 2, front, 0.006], [0, front / 2, hd]);
      pane(glazed, [hw * 2, back, 0.006], [0, back / 2, -hd]);
      for (const x of [-hw, hw]) pane(glazed, [0.006, Math.min(front, back), hd * 2], [x, Math.min(front, back) / 2, 0]);
      // Lid hinged along the back top edge.
      const slope = Math.atan2(back - front, hd * 2), run = Math.hypot(back - front, hd * 2);
      lid.position.set(0, back, -hd);
      lid.rotation.x = slope + (open ? -0.75 : 0);
      for (const x of [-hw, hw]) bar(lid, [x, 0, 0], [x, 0, run]);
      bar(lid, [-hw, 0, 0], [hw, 0, 0]); bar(lid, [-hw, 0, run], [hw, 0, run]);
      if (a.condition !== 'smashed') pane(lid, [hw * 2, 0.006, run], [0, 0, run / 2]);
      if (open) {
        const prop = s.rod([hw - 0.04, baseY + front, hd - 0.02], [hw - 0.04, baseY + front + Math.sin(0.75) * run * 0.92 - (back - front) * 0.0, hd - 0.02 - (1 - Math.cos(0.75)) * run], 0.006, brass);
        void prop;
      }
      // Lock on the front rail.
      put(glazed, s.box([0.05, 0.04, 0.012], [0, 0.0, hd + edge / 2 + 0.004], brass));
      put(glazed, s.cylinder(0.006, 0.006, 0.014, [0, -0.004, hd + edge / 2 + 0.01], s.material('#1b1714'), 8)).rotation.x = Math.PI / 2;
    }

    const topY = baseY + gh;
    if (a.condition === 'smashed') {
      const shard = new THREE.MeshStandardMaterial({ color: '#e9f6f3', roughness: 0.05, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
      const pieces = Array.from({ length: 22 }, (_u, i) => {
        const inside = i < 9;
        const x = inside ? (random() - 0.5) * cw * 0.8 : (random() - 0.2) * (hw + 0.35), z = inside ? (random() - 0.5) * cd * 0.8 : hd + 0.05 + random() * 0.4;
        return { at: [x, inside ? baseY + ch + 0.006 : 0.004, z] as const, size: 0.015 + random() * 0.035 };
      });
      s.scatter(new THREE.TetrahedronGeometry(1).scale(1, 0.12, 0.7), shard, pieces);
      if (a.cabinet === 'dome') {
        // Jagged star hole painted on the dome as dark cracks.
        for (let i = 0; i < 7; i++) put(glazed, s.rod([hw * 0.55, gh * 0.55, hw * 0.75], [hw * 0.55 + (random() - 0.5) * 0.25, gh * 0.55 + (random() - 0.5) * 0.3, hw * 0.78], 0.003, s.material('#f8ffff', { emissive: '#ffffff', emissiveIntensity: 0.4 })));
      } else {
        // Remaining jagged rim of the lid glass.
        const slope = a.cabinet === 'desk' ? Math.atan2(gh * 0.7, hd * 2) : 0;
        for (let i = 0; i < 9; i++) {
          const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.09 + random() * 0.1, 0), new THREE.Vector2(0.02 + random() * 0.05, 0.05 + random() * 0.09)]);
          const tooth = new THREE.Mesh(new THREE.ShapeGeometry(tri), shard);
          const onFront = i % 2 === 0;
          tooth.rotation.x = -Math.PI / 2 + (onFront ? Math.PI : 0);
          tooth.position.set(-hw + random() * (hw * 2 - 0.2) + (onFront ? 0 : 0), topY - (onFront && slope ? gh * 0.7 : 0) + 0.002, onFront ? hd : -hd);
          if (onFront) tooth.rotation.x = Math.PI / 2;
          s.root.add(tooth);
        }
      }
      // A brick: the oldest explanation.
      const brick = s.box([0.2, 0.065, 0.1], [cw * 0.18, baseY + ch + 0.03, 0.02], s.material('#9a4a35', { roughness: 0.95 }));
      brick.rotation.set(0.1, 0.5 + random(), 0.12);
    } else if (a.condition === 'taped') {
      const tape = card(['DO NOT CROSS   DO NOT CROSS'], hw * 2.3, 0.05, '#1a1a1a', '#f1c62f', 'mono');
      tape.position.set(0, baseY + (a.cabinet === 'desk' ? gh * 0.2 : gh * 0.5), (a.cabinet === 'dome' ? hw : hd) + 0.02);
      tape.rotation.z = 0.1 + (random() - 0.5) * 0.15;
      s.root.add(tape);
      const notice = card(['NOTICE', 'under investigation'], 0.16, 0.11, '#7c1a16', '#f4f1e6', 'mono');
      notice.position.set(-hw * 0.5, baseY - 0.1, (a.cabinet === 'dome' ? 0.06 : hd + 0.04) + 0.012);
      if (a.cabinet === 'dome') notice.position.set(0.0, 0.42, 0.075);
      notice.rotation.z = -0.06;
      s.root.add(notice);
    } else if (a.condition === 'offerings') {
      const coinPaint = s.material('#c9a03c', { metalness: 0.8, roughness: 0.35 });
      const ledge = a.cabinet === 'dome' ? baseY + 0.004 : a.cabinet === 'desk' ? baseY + 0.004 : topY + 0.012;
      const spots = Array.from({ length: 9 }, () => {
        const t = random() * Math.PI * 2, r = a.cabinet === 'dome' ? hw + 0.02 : 0;
        return a.cabinet === 'dome' || a.cabinet === 'desk'
          ? { at: [a.cabinet === 'dome' ? Math.cos(t) * r : (random() - 0.5) * hw * 1.8, ledge + 0.002, a.cabinet === 'dome' ? Math.abs(Math.sin(t)) * r : hd + 0.022] as const, size: 0.013 }
          : { at: [(random() - 0.5) * hw * 1.5, ledge, (random() - 0.5) * hd * 1.4] as const, size: 0.013 };
      });
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.16, 12), coinPaint, spots);
      const fy = a.cabinet === 'table' || a.cabinet === 'tower' ? topY + 0.02 : 0.012, fz = a.cabinet === 'table' || a.cabinet === 'tower' ? 0.05 : (a.cabinet === 'dome' ? 0.3 : hd + 0.25);
      s.rod([-0.14, fy, fz], [0.1, fy, fz + 0.04], 0.005, s.material('#3f6b3a'));
      for (let i = 0; i < 6; i++) s.ball([0.022, 0.012, 0.022], [0.115 + Math.cos(i) * 0.02, fy + 0.006, fz + 0.045 + Math.sin(i) * 0.02], s.material(mood.cheer > 0.5 ? '#e8c12c' : '#f3f0ea'), 8);
      s.ball([0.014, 0.012, 0.014], [0.115, fy + 0.012, fz + 0.045], s.material('#7a4a1c'), 8);
      const candle = s.cylinder(0.016, 0.018, 0.07, [-0.25, fy + 0.035 - 0.01, fz + 0.02], s.material('#f1ead8'));
      void candle;
      s.ball([0.007, 0.014, 0.007], [-0.25, fy + 0.075, fz + 0.02], s.material('#ffb347', { emissive: '#ff9a2c', emissiveIntensity: 1.5 }), 8);
    }

    // Listening horn for the sound.
    if (a.claims === 'sound') {
      const side = a.cabinet === 'dome' ? hw : hw;
      const horn = s.lathe([[0.012, 0], [0.014, 0.1], [0.03, 0.2], [0.07, 0.27], [0.11, 0.3]], brass);
      horn.rotation.z = -Math.PI / 2 - 0.35;
      horn.position.set(side - 0.04, baseY + Math.min(gh * 0.5, 0.16), 0);
      (horn.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      s.ring(0.11, 0.006, [0, 0, 0], brass).visible = false;
    }

    // The label.
    const claim = CLAIMS[a.claims];
    const number = `Acc. No. ${1800 + Math.floor(random() * 150)}.${1 + Math.floor(random() * 99)}`;
    const frontZ = a.cabinet === 'dome' ? 0.2 : hd + 0.04;
    if (a.label === 'essay') {
      const panel = card([...claim.title, claim.sub], 0.34, 0.46, '#26221d', '#f4f0e3', 'serif', 16);
      const px = hw + 0.34;
      panel.position.set(px, 1.02, 0.12);
      panel.rotation.set(-0.3, -0.25, 0);
      s.root.add(panel);
      const backing = s.box([0.36, 0.48, 0.012], [px, 1.02, 0.12], s.material('#2c2a28'));
      backing.rotation.copy(panel.rotation); backing.translateZ(-0.008);
      s.rod([px, 0.02, 0.06], [px, 0.95, 0.06], 0.012, s.material('#2c2a28'));
      s.cylinder(0.13, 0.14, 0.02, [px, 0.01, 0.06], s.material('#2c2a28'), 20);
    } else {
      const style = a.label === 'hand' ? 'hand' : a.label === 'typed' ? 'mono' : 'serif';
      const big = a.label === 'typed';
      const plate = card(a.label === 'brass' ? [...claim.title] : [...claim.title, claim.sub, ...(big ? [number] : [])], big ? 0.3 : 0.24, big ? 0.2 : 0.12, a.label === 'brass' ? '#3b2a10' : a.label === 'hand' ? '#1d2b5a' : '#26221d', a.label === 'brass' ? '#d1ab52' : dust > 0.6 ? '#e3d9bd' : '#f6f3e8', style, 0);
      if (a.cabinet === 'table' || a.cabinet === 'desk') { plate.position.set(a.cabinet === 'table' ? -hw * 0.35 : 0.0, baseY - (a.cabinet === 'desk' ? 0.12 : 0.045) - (big ? 0.04 : 0), frontZ - 0.008); if (a.cabinet === 'desk') plate.position.x = -0.0; }
      else if (a.cabinet === 'tower') plate.position.set(0, baseY - 0.2, hd + 0.022);
      else { plate.position.set(0, 0.52, 0.09); const post = s.box([0.01, 0.2, 0.01], [0, 0.45, 0.075], brass); void post; }
      if (a.label === 'hand') plate.rotation.z = (random() - 0.5) * 0.3;
      s.root.add(plate);
    }

    // Alarm.
    if (a.alarm) {
      const ax = a.cabinet === 'dome' ? 0.1 : hw - 0.07, ay = a.cabinet === 'dome' ? baseY - 0.02 : baseY - (a.cabinet === 'tower' ? 0.08 : 0.045), az = a.cabinet === 'dome' ? hw - 0.02 : hd + 0.045;
      s.box([0.07, 0.05, 0.03], [ax, ay, az], s.material('#ecebe6'));
      s.ball([0.01, 0.01, 0.008], [ax + 0.018, ay + 0.008, az + 0.016], s.material('#ff2a1a', { emissive: '#ff2a1a', emissiveIntensity: a.condition === 'smashed' ? 2.5 : 1.2 }), 8);
      s.rod([ax - 0.03, ay, az - 0.01], [ax - 0.03, 0.02, az - 0.03], 0.004, s.material('#ecebe6'));
    }

    // Dust and cobweb with wear.
    if (dust > 0.55) {
      const web = s.material('#f1efe8', { transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
      const corner = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.05, -0.05), new THREE.Vector2(0, -0.22)])), web);
      corner.position.set(-hw, baseY - (a.cabinet === 'dome' ? 0.1 : 0.1), (a.cabinet === 'dome' ? 0.0 : hd - 0.02));
      s.root.add(corner);
    }
    void mix;

    const pulse = { t: random() * 6 };
    const lights: THREE.MeshStandardMaterial[] = [];
    s.root.traverse((node) => { const m = (node as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && m.emissive && m.emissive.getHex() === 0xff2a1a) lights.push(m); });
    const base = lights[0]?.emissiveIntensity ?? 0;
    return s.finish({
      update: (dt) => { pulse.t += dt * (1 + mood.energy * 5); for (const m of lights) m.emissiveIntensity = base * (0.35 + 0.65 * (Math.sin(pulse.t) > 0 ? 1 : 0.2)); },
    });
  },
});
