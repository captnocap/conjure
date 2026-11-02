import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Profile = readonly (readonly [number, number])[];

const JARS = {
  mason: 'A screw-top mason jar with the lid off.',
  pickle: 'A big wide-mouthed pickle jar from the kitchen.',
  snifter: 'A balloon brandy snifter on a short stem, the piano-bar classic.',
  pitcher: 'A glass beer pitcher with a handle.',
  can: 'A dented coffee tin with the label torn off, not glass at all.',
} as const;
const SHAPES: Record<keyof typeof JARS, { profile: Profile; floor: number; inner: number; mouth: number }> = {
  mason: { profile: [[0, 0], [0.04, 0], [0.043, 0.006], [0.043, 0.105], [0.036, 0.118], [0.036, 0.135], [0.038, 0.136]], floor: 0.004, inner: 0.04, mouth: 0.135 },
  pickle: { profile: [[0, 0], [0.056, 0], [0.06, 0.008], [0.06, 0.15], [0.052, 0.168], [0.052, 0.185]], floor: 0.004, inner: 0.057, mouth: 0.185 },
  snifter: { profile: [[0, 0], [0.04, 0], [0.04, 0.003], [0.008, 0.01], [0.007, 0.035], [0.045, 0.055], [0.066, 0.09], [0.066, 0.115], [0.05, 0.165], [0.046, 0.175]], floor: 0.045, inner: 0.058, mouth: 0.175 },
  pitcher: { profile: [[0, 0], [0.052, 0], [0.055, 0.008], [0.062, 0.19], [0.064, 0.2]], floor: 0.006, inner: 0.053, mouth: 0.2 },
  can: { profile: [[0, 0], [0.05, 0], [0.05, 0.13], [0.052, 0.132]], floor: 0.003, inner: 0.048, mouth: 0.132 },
};
const SIGNS = {
  tips: ['TIPS', ''],
  karma: ['GOOD', 'KARMA'],
  college: ['COLLEGE', 'FUND'],
  bail: ['BAIL', 'MONEY'],
  thanks: ['THANK', 'YOU!'],
  rent: ['RENT', 'IS DUE'],
  shy: ["DON'T", 'BE SHY'],
} as const;

function texture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    vesselColour: choice('What colour is the vessel?', { clear: 'Colourless glass or bare metal.', amber: 'Amber glass or ochre-painted tin.', green: 'Bottle-green glass or green-painted tin.', blue: 'Cobalt glass or blue-painted tin.' }),
    lettering: choice('How is the sign lettered?', { marker: 'Thick casual marker lettering.', block: 'Neat square block capitals.', serif: 'Formal serif letters.', fine: 'Fine slanted handwriting.' }),
    neckwear: choice('What is tied around its mouth?', { bare: 'Nothing.', twine: 'Several turns of natural twine.', ribbon: 'A red ribbon with a bow.', beads: 'A little string of coloured beads.' }),
    folding: choice('How have the paper tips been folded?', { crumpled: 'Crumpled into little wads.', folded: 'Folded into flat packets.', rolled: 'Rolled tightly into little tubes.', accordion: 'Pleated into little accordion folds.' }),
    strays: choice('How is any loose change arranged outside?', { scattered: 'Scattered where it landed.', row: 'Counted into a tidy row.', stack: 'Gathered into little stacks.', arc: 'Pushed into an arc in front of the jar.' }),
    counting: choice('What helps with counting the tips?', { none: 'Nothing.', pencil: 'A short pencil and a tally slip.', tally: 'A folded tally card with rows of five marks.', counter: 'A small mechanical tally counter.' }),
    footing: choice('What is underneath the collection?', { bare: 'The bare counter.', cork: 'A rectangular cork mat.', felt: 'A green felt counting mat.', tray: 'A shallow wooden counting tray.' }),
    jar: choice('What is the tip jar?', JARS),
    sign: choice('What does the hand-lettered sign say?', {
      tips: 'Just TIPS.',
      karma: 'GOOD KARMA, hopeful and jokey.',
      college: 'COLLEGE FUND, a student behind the bar.',
      bail: 'BAIL MONEY, a dive-bar joke.',
      thanks: 'THANK YOU! with a little heart.',
      rent: 'RENT IS DUE, blunt and a bit desperate.',
      shy: "DON'T BE SHY, flirtatious.",
    }),
    card: choice('How is the sign made?', {
      taped: 'A scrap of paper taped to the front of the jar.',
      tent: 'A folded card standing beside the jar.',
      tag: 'A brown luggage tag tied round the neck with string.',
      chalk: 'A little chalkboard on a stick stuck in the jar.',
    }),
    fill: score('How full is it?', ['One seed note put in by the bartender', 'A thin layer', 'Half full', 'Stuffed to overflowing']),
    mostly: choice('What is mostly in it?', {
      coins: 'Coins: small change, heavy and worth little.',
      notes: 'Crumpled small notes.',
      mixed: 'Coins at the bottom with notes on top.',
      big: 'Small change with one big folded note on top that somebody generous left.',
    }),
    currency: choice('What money is it?', {
      dollars: 'Green dollar bills.',
      euros: 'Colourful notes: blues, oranges, pinks.',
      gold: 'Old-fashioned gold and silver coin with sepia notes.',
    }),
    odd: choice('What odd thing is in with the money?', {
      nothing: 'Nothing unusual.',
      number: 'A phone number on a folded napkin.',
      foreign: 'A big foreign coin with a hole in the middle.',
      button: 'A coat button, dropped in by someone with no change.',
      chip: 'A casino chip.',
      pick: 'A guitar pick.',
      iou: 'An IOU on a torn beer mat.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const shape = SHAPES[a.jar];
    const isCan = a.jar === 'can';
    const vesselTint = a.vesselColour === 'clear' ? (isCan ? '#b9bcbc' : '#dcecf0') : { amber: '#c49a4c', green: '#4f8064', blue: '#537dad' }[a.vesselColour];
    const wall = isCan
      ? new THREE.MeshStandardMaterial({ color: vesselTint, metalness: a.vesselColour === 'clear' ? 0.8 : 0.25, roughness: 0.4 + mood.wear * 0.3, side: THREE.DoubleSide })
      : new THREE.MeshPhysicalMaterial({ color: vesselTint, transparent: true, opacity: 0.3, roughness: 0.05, side: THREE.DoubleSide });
    const bright = new THREE.MeshStandardMaterial({ color: '#f1fafc', transparent: true, opacity: 0.7, roughness: 0.05 });
    s.lathe(shape.profile, wall);
    const mouthR = shape.profile[shape.profile.length - 1][0];
    if (a.neckwear !== 'bare') {
      const cord = s.material(a.neckwear === 'ribbon' ? '#a62e3e' : '#b49b70', { roughness: 0.85 });
      if (a.neckwear === 'beads') {
        const colours = ['#d1a958', '#628fa0', '#a54b48', '#e6d6ad'];
        const n = 32;
        for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; s.ball([0.0032, 0.0032, 0.0032], [Math.sin(t) * (mouthR + 0.002), shape.mouth - 0.006, Math.cos(t) * (mouthR + 0.002)], s.material(colours[i % 4]), 8); }
      } else {
        for (let i = 0; i < 4; i++) s.ring(mouthR + 0.001, a.neckwear === 'ribbon' ? 0.0015 : 0.0009, [0, shape.mouth - 0.008 + i * 0.0018, 0], cord).rotation.x = Math.PI / 2;
        if (a.neckwear === 'ribbon') {
          for (const side of [-1, 1]) { const loop = s.ring(0.009, 0.0023, [side * 0.008, shape.mouth - 0.005, mouthR + 0.004], cord); loop.scale.set(1.3, 0.65, 1); loop.rotation.z = side * 0.4; s.rod([0, shape.mouth - 0.007, mouthR + 0.004], [side * 0.01, shape.mouth - 0.032, mouthR + 0.007], 0.002, cord); }
        }
      }
    }
    s.ring(mouthR, 0.0018, [0, shape.mouth, 0], isCan ? wall : bright).rotation.x = Math.PI / 2;
    if (a.jar === 'mason') for (let i = 0; i < 3; i++) s.ring(0.0368, 0.0012, [0, 0.122 + i * 0.005, 0], bright).rotation.x = Math.PI / 2;
    if (a.jar === 'pitcher') {
      s.tube([[0.058, 0.17, 0], [0.105, 0.165, 0], [0.11, 0.1, 0], [0.057, 0.045, 0]], 0.008, bright);
      s.mesh(new THREE.ConeGeometry(0.022, 0.03, 3), bright, [-0.066, 0.192, 0]).rotation.set(0, 0, Math.PI * 0.62);
    }
    if (isCan) for (const y of [0.03, 0.065, 0.1]) s.ring(0.0503, 0.0014, [0, y, 0], wall).rotation.x = Math.PI / 2;

    const radiusAt = (y: number) => {
      const p = shape.profile;
      for (let i = 1; i < p.length; i++) if (y <= p[i][1]) return mix(p[i - 1][0], p[i][0], Math.max(0, (y - p[i - 1][1]) / Math.max(1e-6, p[i][1] - p[i - 1][1])));
      return mouthR;
    };

    // Money.
    const palette = { dollars: ['#7ea878', '#8fb489', '#6f9a70'], euros: ['#6fa0d8', '#f0a04a', '#e58aa8', '#8ac28a'], gold: ['#c9b58a', '#bfa67a', '#d4c39a'] }[a.currency];
    const coinTints = a.currency === 'gold' ? ['#e0b63c', '#d8dcdc', '#e0b63c'] : ['#c9ccce', '#b87a4a', '#d9b548', '#c9ccce'];
    const room = shape.mouth - shape.floor;
    const fillTop = shape.floor + room * mix(0.04, 1.0, a.fill);
    const coinShare = { coins: 1, notes: 0.08, mixed: 0.4, big: 0.75 }[a.mostly];
    const coinTop = shape.floor + (fillTop - shape.floor) * coinShare;
    const inside = (y: number) => Math.max(0.006, (isCan ? shape.inner : radiusAt(y) - 0.004));

    // Coins: one instanced heap.
    const coinCount = Math.round(mix(3, 150, a.fill) * mix(0.15, 1, coinShare) * (shape.inner / 0.05) ** 2);
    const coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.14, 14), new THREE.MeshStandardMaterial({ metalness: 0.85, roughness: 0.3 + mood.wear * 0.3 }), coinCount);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < coinCount; i++) {
      const y = mix(shape.floor + 0.002, Math.max(shape.floor + 0.004, coinTop), random() ** 0.8);
      const size = mix(0.0085, 0.013, random());
      const r = Math.sqrt(random()) * Math.max(0.002, inside(y) - size * 0.8), t = random() * Math.PI * 2;
      e.set((random() - 0.5) * 1.1, random() * 6, (random() - 0.5) * 1.1);
      m.compose(v.set(Math.cos(t) * r, y, Math.sin(t) * r), q.setFromEuler(e), sc.setScalar(size));
      coins.setMatrixAt(i, m);
      coins.setColorAt(i, new THREE.Color(coinTints[Math.floor(random() * coinTints.length)]));
    }
    coins.castShadow = true;
    s.root.add(coins);

    // Crumpled notes: lumpy low-poly wads.
    const wad = (at: [number, number, number], size: number, colour: string) => {
      const geometry = a.folding === 'rolled' ? new THREE.CylinderGeometry(0.24, 0.24, 1.7, 12, 1, true) : a.folding === 'folded' ? new THREE.BoxGeometry(1.6, 0.22, 0.9) : a.folding === 'accordion' ? new THREE.PlaneGeometry(1.6, 1.1, 10, 1).rotateX(-Math.PI / 2) : new THREE.IcosahedronGeometry(1, 1);
      const p = geometry.attributes.position;
      if (a.folding === 'crumpled') for (let i = 0; i < p.count; i++) { const k = 0.72 + ((Math.sin(i * 12.9898 + at[0] * 900 + at[1] * 700) * 43758.5453) % 1 + 1) % 1 * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k); }
      if (a.folding === 'accordion') for (let i = 0; i < p.count; i++) p.setY(i, (i % 2 ? 1 : -1) * 0.15);
      geometry.computeVertexNormals();
      const mesh = s.mesh(geometry, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.9, flatShading: true, side: THREE.DoubleSide }), at);
      mesh.scale.setScalar(size);
      mesh.rotation.set(random() * 6, random() * 6, random() * 6);
      return mesh;
    };
    const noteShare = 1 - coinShare;
    const wads = Math.round(mix(1, 22, a.fill) * mix(0.25, 1, noteShare) * (shape.inner / 0.05));
    for (let i = 0; i < wads; i++) {
      const y = mix(Math.max(coinTop, shape.floor) + 0.012, Math.max(fillTop, shape.floor + 0.02), wads === 1 ? 0 : i / (wads - 1));
      const size = mix(0.016, 0.024, random());
      const r = Math.sqrt(random()) * Math.max(0, inside(y) - size * 0.9), t = random() * 6.28;
      wad([Math.cos(t) * r, Math.min(y, shape.mouth + 0.012), Math.sin(t) * r], size, palette[Math.floor(random() * palette.length)]);
    }
    // Folded notes standing up out of the top when it is generous.
    const flags = a.fill > 0.7 ? 3 + Math.floor(random() * 2) : a.mostly === 'big' ? 1 : 0;
    for (let i = 0; i < flags; i++) {
      const big = a.mostly === 'big' && i === 0;
      const geometry = new THREE.PlaneGeometry(0.05, big ? 0.1 : 0.08, 1, 6);
      const p = geometry.attributes.position;
      for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(p.getY(k) * 55) * 0.004 + Math.abs(p.getX(k)) * 0.25);
      geometry.computeVertexNormals();
      const colour = big ? (a.currency === 'dollars' ? '#4f8f5a' : a.currency === 'euros' ? '#b06fc0' : '#a8843a') : palette[i % palette.length];
      const note = s.mesh(geometry, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.85, side: THREE.DoubleSide }), [(random() - 0.5) * inside(fillTop), Math.min(Math.max(fillTop, coinTop + 0.03), shape.mouth - 0.01) + 0.015, (random() - 0.5) * inside(fillTop)]);
      note.rotation.set((random() - 0.5) * 0.7, random() * 6, (random() - 0.5) * 0.7);
    }
    // A few strays on the bar when the scene is busy or the jar is brimming.
    const strays = Math.round(mood.density * 4 + (a.fill > 0.85 ? 3 : 0));
    for (let i = 0; i < strays; i++) {
      const t = a.strays === 'arc' ? mix(-0.65, 0.65, i / Math.max(1, strays - 1)) : mix(-0.4, 1.9, random()), r = shape.profile[1][0] + 0.035 + (a.strays === 'arc' ? 0.04 : random() * 0.05);
      const x = a.strays === 'row' ? (i - (strays - 1) / 2) * 0.025 : a.strays === 'stack' ? 0.08 + (i % 2) * 0.027 : Math.sin(t) * r;
      const z = a.strays === 'row' ? 0.13 : a.strays === 'stack' ? 0.09 : Math.cos(t) * r;
      if (i % 3 === 2 && a.mostly !== 'coins' && a.strays === 'scattered') wad([x, 0.011, z], 0.016, palette[i % palette.length]);
      else s.cylinder(0.011, 0.011, 0.0016, [x, 0.0008 + (a.strays === 'stack' ? Math.floor(i / 2) * 0.0016 : i * 0.0001), z], new THREE.MeshStandardMaterial({ color: coinTints[i % coinTints.length], metalness: 0.85, roughness: 0.3 }), 14);
    }

    // The odd thing: resting on top of the heap against the front glass, or propped at the foot of a tin.
    const heap = Math.min(Math.max(fillTop, shape.floor + 0.012), shape.mouth - 0.004);
    const oddY = isCan ? shape.mouth + 0.004 : heap + 0.006;
    const oddZ = isCan ? 0 : Math.max(0, inside(oddY) - 0.02);
    const oddAt: [number, number, number] = [0.004, oddY, oddZ];
    const tiltBack = -0.9;
    if (a.odd === 'number') {
      const digits = Array.from({ length: 7 }, () => Math.floor(random() * 10)).join('');
      const map = texture(192, 128, (c) => {
        c.fillStyle = '#f7f4ea'; c.fillRect(0, 0, 192, 128);
        c.fillStyle = '#1b2f7a'; c.font = 'italic bold 34px cursive'; c.textAlign = 'center';
        c.fillText(`${digits.slice(0, 3)}-${digits.slice(3)}`, 96, 60, 180); c.fillText('xo', 96, 104);
      });
      const note = s.mesh(new THREE.PlaneGeometry(0.06, 0.04), new THREE.MeshStandardMaterial({ map, roughness: 1, side: THREE.DoubleSide }), [oddAt[0], oddAt[1] + 0.014, oddAt[2]]);
      note.rotation.set(-0.5, (random() - 0.5) * 0.5, 0.1);
    } else if (a.odd === 'foreign') {
      const coin = s.ring(0.014, 0.0055, oddAt, new THREE.MeshStandardMaterial({ color: '#d9a534', metalness: 0.9, roughness: 0.25 }));
      coin.scale.z = 0.3; coin.rotation.x = tiltBack;
    } else if (a.odd === 'button') {
      const tone = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#c8463c' : '#3b3530', roughness: 0.35 });
      const button = s.cylinder(0.016, 0.016, 0.004, oddAt, tone, 20);
      button.rotation.x = tiltBack + Math.PI / 2;
      for (let i = 0; i < 4; i++) { const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0045, 8), new THREE.MeshStandardMaterial({ color: '#f1ede2' })); hole.position.set(i % 2 ? 0.005 : -0.005, 0, i < 2 ? 0.005 : -0.005); button.add(hole); }
      s.ring(0.013, 0.0016, oddAt, tone).rotation.x = tiltBack;
    } else if (a.odd === 'chip') {
      const chip = s.cylinder(0.02, 0.02, 0.0035, oddAt, new THREE.MeshStandardMaterial({ color: '#b3202c', roughness: 0.4 }), 24);
      chip.rotation.x = tiltBack + Math.PI / 2;
      const inlay = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 20), new THREE.MeshStandardMaterial({ color: '#f4f1e6' }));
      chip.add(inlay);
      for (let i = 0; i < 6; i++) { const dash = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0038, 0.005), inlay.material); dash.position.set(Math.cos(i * 1.047) * 0.0175, 0, Math.sin(i * 1.047) * 0.0175); dash.rotation.y = -i * 1.047 + Math.PI / 2; chip.add(dash); }
    } else if (a.odd === 'pick') {
      const outline = new THREE.Shape();
      outline.moveTo(0, -0.017); outline.quadraticCurveTo(0.02, 0.004, 0.012, 0.014); outline.quadraticCurveTo(0, 0.02, -0.012, 0.014); outline.quadraticCurveTo(-0.02, 0.004, 0, -0.017);
      const pick = s.mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.0012, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#f0862a' : '#3d7ab8', roughness: 0.3, emissive: '#f0862a', emissiveIntensity: mood.cheer > 0.5 ? 0.2 : 0 }), oddAt);
      pick.rotation.set(tiltBack + Math.PI / 2, 0, 0.4);
    } else if (a.odd === 'iou') {
      const map = texture(128, 128, (c) => {
        c.fillStyle = '#e8dcc0'; c.fillRect(0, 0, 128, 128);
        c.strokeStyle = '#a8322a'; c.lineWidth = 8; c.strokeRect(8, 8, 112, 112);
        c.fillStyle = '#1c1c22'; c.font = 'bold 44px cursive'; c.textAlign = 'center'; c.fillText('I.O.U.', 64, 62, 104); c.font = 'bold 26px cursive'; c.fillText('1 pint', 64, 100);
      });
      const mat = s.mesh(new THREE.PlaneGeometry(0.05, 0.05), new THREE.MeshStandardMaterial({ map, roughness: 1, side: THREE.DoubleSide }), [oddAt[0], oddAt[1] + 0.016, oddAt[2]]);
      mat.rotation.set(-0.45, (random() - 0.5) * 0.5, -0.15);
    }

    // The sign.
    const [line1, line2] = SIGNS[a.sign];
    const chalk = a.card === 'chalk', tag = a.card === 'tag';
    const signMap = texture(256, 192, (c) => {
      c.fillStyle = chalk ? '#262b2a' : tag ? '#c9a66e' : '#f4efdf'; c.fillRect(0, 0, 256, 192);
      if (!chalk && !tag) { c.strokeStyle = 'rgba(120,150,190,0.5)'; c.lineWidth = 2; for (let y = 40; y < 192; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); } }
      c.fillStyle = chalk ? '#f3f1e8' : mood.cheer > 0.55 ? '#c2283a' : '#1b1d26';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.save(); c.translate(128, 96); c.rotate(-0.05 + (random() - 0.5) * 0.08);
      const size = line2 ? 66 : 96;
      c.font = a.lettering === 'fine' ? `italic ${size * 0.9}px cursive` : `bold ${size}px ${a.lettering === 'block' ? 'sans-serif' : a.lettering === 'serif' ? 'serif' : 'cursive'}`;
      if (line2) { c.fillText(line1, 0, -36, 236); c.fillText(line2, 0, 38, 236); } else c.fillText(line1, 0, 0, 236);
      if (a.sign === 'thanks') { c.fillStyle = '#d83a55'; c.font = '40px sans-serif'; c.fillText('♥', 96, 44); }
      c.lineWidth = 5; c.strokeStyle = c.fillStyle; c.beginPath(); c.moveTo(-80, line2 ? 78 : 60); c.quadraticCurveTo(0, (line2 ? 78 : 60) + 10, 84, (line2 ? 78 : 60) - 4); c.stroke();
      c.restore();
    });
    const signMat = new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.95, side: THREE.DoubleSide });
    if (a.card === 'taped') {
      const y = a.jar === 'snifter' ? 0.1 : shape.mouth * 0.48, h = 0.06, r = radiusAt(y) + 0.0012;
      const arc = Math.min(1.9, 0.085 / r);
      const paper = s.mesh(new THREE.CylinderGeometry(radiusAt(y + h / 2) + 0.0012, radiusAt(y - h / 2) + 0.0012, h, 16, 1, true, -arc / 2, arc), signMat, [0, y, 0]);
      paper.rotation.y = (random() - 0.5) * 0.3;
      const tape = new THREE.MeshStandardMaterial({ color: '#e9dfae', transparent: true, opacity: 0.8, roughness: 0.4 });
      for (const side of [-1, 1]) {
        const strip = s.mesh(new THREE.CylinderGeometry(r + 0.0006, r + 0.0006, 0.014, 6, 1, true, side * arc / 2 - 0.14, 0.28), tape, [0, y + 0.02 * side, 0]);
        strip.rotation.y = paper.rotation.y;
      }
    } else if (a.card === 'tent') {
      const x = -(shape.profile[1][0] + 0.055);
      const front = s.mesh(new THREE.PlaneGeometry(0.085, 0.064), signMat, [x, 0.031, 0.03]);
      front.rotation.set(-0.32, 0.25, 0);
      const back = s.mesh(new THREE.PlaneGeometry(0.085, 0.064), s.material('#efe9d6', { side: THREE.DoubleSide }), [x - 0.005, 0.031, 0.01]);
      back.rotation.set(0.32, 0.25, 0);
    } else if (tag) {
      const neckY = a.jar === 'snifter' ? 0.03 : shape.mouth - 0.022, neckR = radiusAt(neckY) + 0.0015;
      s.ring(neckR, 0.0012, [0, neckY, 0], s.material('#b89a6a')).rotation.x = Math.PI / 2;
      const card = s.mesh(new THREE.PlaneGeometry(0.075, 0.056), signMat, [0.012, neckY - 0.042, Math.max(neckR, radiusAt(neckY - 0.04)) + 0.006]);
      card.rotation.set(0.08, 0, 0.12 + (random() - 0.5) * 0.2);
      s.rod([0, neckY, neckR], [0.004, neckY - 0.016, card.position.z], 0.0007, s.material('#b89a6a'));
    } else {
      const top = shape.mouth + 0.075;
      s.rod([0.012, shape.floor + 0.01, -0.01], [0.03, top, -0.02], 0.0025, s.material('#b08a55'));
      s.box([0.1, 0.074, 0.006], [0.03, top + 0.02, -0.02], s.material('#8a623a')).rotation.z = -0.06;
      const board = s.mesh(new THREE.PlaneGeometry(0.09, 0.064), signMat, [0.03, top + 0.02, -0.0166]);
      board.rotation.z = -0.06;
    }

    if (a.counting === 'pencil' || a.counting === 'tally') {
      const tallyMap = texture(192, 128, c => { c.fillStyle = '#eee4c9'; c.fillRect(0, 0, 192, 128); c.strokeStyle = '#394653'; c.lineWidth = 3; for (let row = 0; row < 3; row++) for (let group = 0; group < 3; group++) { const x = 14 + group * 57, y = 18 + row * 35; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x + k * 8, y); c.lineTo(x + k * 8, y + 24); c.stroke(); } c.beginPath(); c.moveTo(x - 2, y + 21); c.lineTo(x + 28, y + 2); c.stroke(); } });
      const card = s.box([0.074, 0.001, 0.052], [0.132, 0.0005, -0.062], new THREE.MeshStandardMaterial({ map: tallyMap, roughness: 1 })); card.rotation.y = -0.2;
      if (a.counting === 'pencil') { s.rod([0.1, 0.003, -0.103], [0.174, 0.003, -0.081], 0.0025, s.material('#cf9b36')); s.rod([0.174, 0.003, -0.081], [0.182, 0.003, -0.079], 0.0025, s.material('#bba67d'), 0.0004); }
      else { const fold = s.box([0.074, 0.001, 0.017], [0.132, 0.007, -0.079], new THREE.MeshStandardMaterial({ map: tallyMap, roughness: 1 })); fold.rotation.set(-0.75, -0.2, 0); }
    } else if (a.counting === 'counter') {
      const metal = s.material('#afb8bb', { metalness: 0.8, roughness: 0.3 });
      s.box([0.042, 0.028, 0.035], [0.13, 0.014, -0.06], metal);
      s.box([0.027, 0.012, 0.001], [0.13, 0.019, -0.042], s.material('#242b2b'));
      s.label('0042', 0.024, 0.009, [0.13, 0.019, -0.0413], '#e8e1c9', '#242b2b');
      s.cylinder(0.007, 0.007, 0.009, [0.13, 0.032, -0.06], metal, 12);
      s.ring(0.018, 0.0015, [0.13, 0.018, -0.081], metal);
    }
    if (a.footing !== 'bare') {
      const lift = a.footing === 'tray' ? 0.009 : 0.003;
      for (const child of s.root.children) child.position.y += lift;
      const mat = s.material(a.footing === 'felt' ? '#365e4c' : a.footing === 'cork' ? '#b99865' : '#735033', { roughness: 0.9 });
      s.box([0.44, lift, 0.36], [0.025, lift / 2, 0.025], mat);
      if (a.footing === 'tray') {
        for (const x of [-0.195, 0.245]) s.box([0.008, 0.021, 0.36], [x, 0.015, 0.025], mat);
        for (const z of [-0.155, 0.205]) s.box([0.44, 0.021, 0.008], [0.025, 0.015, z], mat);
      }
    }
    return s.finish();
  },
});
