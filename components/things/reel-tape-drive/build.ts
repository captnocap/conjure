import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const SCHEMES = {
  blue: 'Corporate blue cabinet with a pale grey tape deck and red accents, the classic mainframe.',
  cream: 'Cream enamel cabinet with a dark deck and green accents, a utility or laboratory machine.',
  charcoal: 'Charcoal cabinet with a silver deck and amber accents, severe and expensive.',
  orange: 'Burnt orange cabinet with an off-white deck, a bright 1970s data centre.',
  olive: 'Military olive cabinet with a black deck and yellow stencils.',
} as const;
const SCHEME_HEX: Record<keyof typeof SCHEMES, [string, string, string]> = {
  blue: ['#44699a', '#dcddd6', '#c9302c'], cream: ['#e2d9bd', '#39423f', '#3a8f5a'], charcoal: ['#3b3e44', '#c3c6c4', '#d98a1c'],
  orange: ['#d2602c', '#ece6d8', '#2b2b2b'], olive: ['#6f7655', '#2a2e29', '#d2bd3c'],
};
const PLACARDS = {
  unit: 'TAPE UNIT 3', secret: 'TOP SECRET', payroll: 'PAYROLL', census: 'CENSUS 1960', target: 'TARGET DATA', keep: 'DO NOT ERASE',
} as const;

export default defineThing({
  questions: {
    state: choice('What is the tape doing right now?', {
      running: 'Running: both reels turning, tape threaded tight through the heads, loops riding in the columns.',
      stalled: 'Stalled: reels dead, the tape gone slack and drooping out of its path, a red fault light.',
      unspooled: 'Unspooled: the door open and yards of tape spilled out in a tangled heap on the floor.',
      empty: 'Empty: no reels mounted, bare hubs behind an open door. The tapes have been taken away.',
    }),
    wound: score('Where is most of the tape?', ['All still on the left supply reel, barely started', 'Half and half', 'Nearly all wound onto the right reel, almost finished']),
    bank: choice('How many drives stand together?', {
      one: 'A single cabinet standing alone.',
      pair: 'Two cabinets side by side.',
      three: 'A bank of three, a wall of reels.',
    }),
    scheme: choice('What colours is the cabinet?', SCHEMES),
    reels: choice('What are the reels like?', {
      clear: 'Clear plastic flanges with three round windows, the tape visible through them.',
      aluminium: 'Solid brushed aluminium flanges with small spoke slots.',
      red: 'Red plastic flanges, colour-coded and urgent.',
      amber: 'Smoked amber flanges, warm and dated.',
    }),
    placard: choice('What does the placard on the cabinet say?', {
      unit: 'TAPE UNIT 3, a plain equipment number.',
      secret: 'TOP SECRET in red.',
      payroll: 'PAYROLL, dull and essential.',
      census: 'CENSUS 1960, an archive of everyone.',
      target: 'TARGET DATA, cold and military.',
      keep: 'DO NOT ERASE, a pleading handwritten note.',
    }),
    top: choice('What sits on top of the cabinet?', {
      bare: 'Nothing, a clean top.',
      canisters: 'A stack of flat round tape canisters with paper labels.',
      box: 'A sagging cardboard box of loose reels and printout.',
      printout: 'A drift of green-striped fanfold printout hanging over the edge.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [bodyHex, deckHex, accentHex] = SCHEME_HEX[a.scheme];
    const body = s.material(bodyHex, { roughness: 0.45, metalness: 0.15 });
    const deck = s.material(deckHex, { roughness: 0.5 });
    const accent = s.material(accentHex, { roughness: 0.5 });
    const dark = s.material('#1c1f21', { roughness: 0.6 });
    const chrome = s.material('#d6dadb', { metalness: 0.85, roughness: 0.25 });
    const oxide = s.material('#3b2416', { roughness: 0.28, metalness: 0.2 });
    const glass = new THREE.MeshStandardMaterial({ color: '#cfe6ea', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const lampOn = (hex: string) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 1.1, roughness: 0.4 });
    const lampOff = s.material('#5a5f5c', { roughness: 0.5 });
    const flangeHex = { clear: '#e8f0f0', aluminium: '#b9bfc1', red: '#cf2f26', amber: '#c98a2a' }[a.reels];
    const flangeMap = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const c = canvas.getContext('2d')!;
      c.fillStyle = flangeHex;
      c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 4; c.beginPath(); c.arc(128, 128, 123, 0, 7); c.stroke();
      c.globalCompositeOperation = 'destination-out';
      if (a.reels === 'aluminium') for (let i = 0; i < 6; i++) { c.save(); c.translate(128, 128); c.rotate(i * Math.PI / 3); c.fillRect(48, -7, 56, 14); c.restore(); }
      else for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(128 + Math.cos(i * 2.094) * 76, 128 + Math.sin(i * 2.094) * 76, 36, 0, 7); c.fill(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();
    const flange = new THREE.MeshStandardMaterial({ map: flangeMap, alphaTest: 0.5, roughness: 0.35, metalness: a.reels === 'aluminium' ? 0.6 : 0.05, side: THREE.DoubleSide });

    const W = 0.76, H = 1.86, D = 0.7, F = D / 2;
    const spinners: { node: THREE.Object3D; rate: number }[] = [];
    const blinkers: THREE.MeshStandardMaterial[] = [];
    const count = { one: 1, pair: 2, three: 3 }[a.bank];
    const hero = count === 3 ? 1 : 0;

    for (let u = 0; u < count; u++) {
      const g = new THREE.Group();
      g.position.x = (u - (count - 1) / 2) * (W + 0.015);
      s.root.add(g);
      const add = <T extends THREE.Object3D>(child: T, parent: THREE.Object3D = g) => { parent.add(child); return child; };
      const state = u === hero ? a.state : a.state === 'unspooled' ? 'stalled' : a.state === 'empty' && random() < 0.5 ? 'stalled' : a.state;
      const wound = u === hero ? a.wound : random();
      const open = state === 'unspooled' || state === 'empty';

      add(s.box([W, H - 0.08, D], [0, 0.08 + (H - 0.08) / 2, 0], body));
      add(s.box([W - 0.06, 0.08, D - 0.08], [0, 0.04, 0], dark));
      add(s.box([W - 0.08, 1.36, 0.02], [0, 1.04, F + 0.002], deck));
      // Header with push buttons.
      add(s.box([W - 0.08, 0.1, 0.02], [0, 1.79, F + 0.004], dark));
      const buttons = state === 'running' ? ['#2fd66b', '#fff2c4', '', '', ''] : state === 'stalled' ? ['', '', '#ff3324', '#ffab1f', ''] : state === 'unspooled' ? ['', '', '#ff3324', '', '#ff3324'] : ['', '', '', '', mood.wear > 0.6 ? '' : '#ffab1f'];
      buttons.forEach((hex, i) => {
        const material = hex ? lampOn(hex) : lampOff;
        if (hex === '#ff3324') blinkers.push(material as THREE.MeshStandardMaterial);
        add(s.box([0.075, 0.055, 0.02], [-0.22 + i * 0.11, 1.79, F + 0.018], material));
      });
      // Lower door: louvres and placard.
      add(s.box([W - 0.1, 0.24, 0.015], [0, 0.22, F + 0.004], accent));
      for (let i = 0; i < 5; i++) add(s.box([W - 0.2, 0.012, 0.012], [0, 0.14 + i * 0.022, F + 0.014], dark));
      if (u === hero) {
        const handwritten = a.placard === 'keep';
        const plate = add(s.label(PLACARDS[a.placard], handwritten ? 0.34 : 0.44, 0.075, [0, 0.29, F + 0.016], a.placard === 'secret' ? '#c0201a' : '#1d2226', handwritten ? '#f3e9a8' : '#efeadb'));
        if (handwritten) plate.rotation.z = (random() - 0.5) * 0.3;
      }

      // Reels and hubs.
      const ry = 1.47, rx = 0.19, R = 0.165, rmin = 0.062, rmax = 0.152;
      const pack = (share: number) => Math.sqrt(rmin * rmin + (rmax * rmax - rmin * rmin) * share);
      const spilled = state === 'unspooled' ? 0.55 : 0;
      const radii = [pack(Math.max(0, 1 - wound)), pack(Math.max(0, wound * (1 - spilled)))];
      for (const side of [0, 1]) {
        const reel = add(new THREE.Group());
        reel.position.set(side ? rx : -rx, ry, F + 0.03);
        reel.rotation.z = random() * 6;
        add(s.cylinder(0.05, 0.05, 0.03, [0, 0, -0.008], chrome, 20), reel).rotation.x = Math.PI / 2;
        for (let k = 0; k < 3; k++) {
          const lobe = add(s.box([0.014, 0.05, 0.02], [0, 0, 0.012], dark), reel);
          lobe.rotation.z = k * 2.094;
          lobe.translateY(0.02);
        }
        if (state !== 'empty') {
          add(s.cylinder(radii[side], radii[side], 0.02, [0, 0, 0], oxide, 40), reel).rotation.x = Math.PI / 2;
          add(s.cylinder(rmin, rmin, 0.024, [0, 0, 0], s.material(flangeHex), 24), reel).rotation.x = Math.PI / 2;
          add(s.mesh(new THREE.CircleGeometry(R, 40), flange, [0, 0, 0.013]), reel).castShadow = false;
          add(s.mesh(new THREE.CircleGeometry(R, 40), flange, [0, 0, -0.013]), reel).castShadow = false;
        }
        if (state === 'running') spinners.push({ node: reel, rate: -(0.11 / Math.max(radii[side], 0.06)) });
      }

      // Head block and guide rollers.
      add(s.box([0.2, 0.11, 0.05], [0, 1.2, F + 0.03], dark));
      add(s.box([0.09, 0.05, 0.06], [0, 1.2, F + 0.035], chrome));
      for (const x of [-0.16, -0.06, 0.06, 0.16]) add(s.cylinder(0.014, 0.014, 0.04, [x, 1.06, F + 0.03], chrome, 12)).rotation.x = Math.PI / 2;

      // Vacuum columns.
      const top = 1.02, bottom = 0.42;
      for (const side of [-1, 1]) {
        add(s.box([0.135, top - bottom, 0.012], [side * 0.11, (top + bottom) / 2, F + 0.012], dark));
        for (const edge of [-1, 1]) add(s.box([0.01, top - bottom, 0.04], [side * 0.11 + edge * 0.0675, (top + bottom) / 2, F + 0.03], chrome));
        add(s.box([0.145, 0.012, 0.04], [side * 0.11, bottom, F + 0.03], chrome));
        add(s.box([0.135, top - bottom, 0.004], [side * 0.11, (top + bottom) / 2, F + 0.05], glass)).castShadow = false;
      }

      // Tape path.
      const z = F + 0.03;
      const strand = (x0: number, y0: number, x1: number, y1: number) => add(s.rod([x0, y0, z], [x1, y1, z], 0.0065, oxide));
      const loop = (side: number, depth: number) => {
        const y = top - depth * (top - bottom - 0.08);
        const arc = add(s.ring(0.05, 0.0065, [side * 0.11, y, z], oxide, Math.PI));
        arc.rotation.z = Math.PI;
        return y;
      };
      if (state === 'running') {
        const yl = loop(-1, 0.35 + random() * 0.5), yr = loop(1, 0.35 + random() * 0.5);
        strand(-0.16, ry - Math.sqrt(Math.max(radii[0] ** 2 - 0.0009, 0)), -0.16, yl);
        strand(-0.06, yl, -0.06, 1.2); strand(-0.06, 1.2, 0.06, 1.2); strand(0.06, 1.2, 0.06, yr);
        strand(0.16, yr, 0.16, ry - Math.sqrt(Math.max(radii[1] ** 2 - 0.0009, 0)));
      } else if (state === 'stalled') {
        const yl = loop(-1, 1);
        strand(-0.16, ry - Math.sqrt(Math.max(radii[0] ** 2 - 0.0009, 0)), -0.16, yl);
        strand(-0.06, yl, -0.06, 1.2);
        // The right-hand side has lost vacuum: tape sags out of the head in a slack belly.
        const sag = 0.2 + random() * 0.25;
        add(s.tube([[-0.06, 1.2, z], [0.02, 1.16, z + 0.02], [0.1, 1.2 - sag, z + 0.04], [0.2, 1.22 - sag * 0.6, z + 0.03], [0.24, 1.3, z], [0.19 + radii[1] * 0.9, ry - radii[1] * 0.4, z]], 0.0045, oxide));
      } else if (state === 'unspooled') {
        const yl = loop(-1, 1);
        strand(-0.16, ry - Math.sqrt(Math.max(radii[0] ** 2 - 0.0009, 0)), -0.16, yl);
        strand(-0.06, yl, -0.06, 1.2);
        for (let strandIndex = 0; strandIndex < 3; strandIndex++) {
          const start: [number, number, number] = strandIndex === 0 ? [-0.06, 1.2, z] : [rx + (random() - 0.5) * 0.2, ry - radii[1] * 0.8, z + 0.01];
          const points: [number, number, number][] = [start, [start[0] + 0.05, start[1] - 0.25, z + 0.12], [(random() - 0.5) * 0.3, 0.5 + random() * 0.2, F + 0.2 + random() * 0.1]];
          const turns = 26 + Math.floor(random() * 10 + mood.density * 14);
          for (let i = 0; i < turns; i++) {
            const q = random() * 6.283, r = 0.08 + random() * 0.36;
            points.push([Math.cos(q) * r * 1.2, 0.012 + random() * random() * 0.22 * (1 - r), F + 0.42 + Math.sin(q) * r * 0.8]);
          }
          const tape = add(s.tube(points, 0.006, oxide));
          tape.scale.y = 1;
        }
      }

      // Glass door on a left-hand hinge.
      const door = add(new THREE.Group());
      door.position.set(-W / 2 + 0.03, 0, F + 0.065);
      door.rotation.y = open ? -(1.5 + random() * 0.7) : 0;
      const dw = W - 0.06, dy0 = 1.08, dy1 = 1.72;
      add(s.box([dw, dy1 - dy0, 0.006], [dw / 2, (dy0 + dy1) / 2, 0], glass), door).castShadow = false;
      for (const y of [dy0, dy1]) add(s.box([dw, 0.022, 0.02], [dw / 2, y, 0], chrome), door);
      for (const x of [0, dw]) add(s.box([0.022, dy1 - dy0, 0.02], [x, (dy0 + dy1) / 2, 0], chrome), door);
      add(s.box([0.02, 0.12, 0.03], [dw - 0.04, 1.4, 0.02], chrome), door);

      // Dust and age: a broken tape end hanging off a worn machine.
      if (mood.wear > 0.55 && state !== 'empty' && random() < 0.8) add(s.tube([[0.3, 1.1, F + 0.02], [0.33, 0.9, F + 0.05], [0.3, 0.7, F + 0.04], [0.34, 0.52, F + 0.06]], 0.0045, oxide));

      // On top.
      const topKind = u === hero || random() < mood.density ? a.top : 'bare';
      if (topKind === 'canisters') {
        const tins = 2 + Math.floor(random() * 3 + mood.density * 3);
        const tin = s.material('#a9b0b0', { metalness: 0.6, roughness: 0.4 });
        for (let i = 0; i < tins; i++) {
          const x = (random() - 0.5) * 0.08 - 0.1, zz = (random() - 0.5) * 0.08;
          add(s.cylinder(0.15, 0.15, 0.036, [x, H + 0.018 + i * 0.037, zz], tin, 28));
          add(s.box([0.1, 0.004, 0.05], [x, H + 0.038 + i * 0.037, zz + 0.07], s.material('#f1ecdc')));
        }
        const leaning = add(s.cylinder(0.15, 0.15, 0.036, [0.22, H + 0.14, -0.05], tin, 28));
        leaning.rotation.z = Math.PI / 2 - 0.3;
      } else if (topKind === 'box') {
        const card = s.material('#b08a5a', { roughness: 0.9 });
        add(s.box([0.5, 0.24, 0.4], [0, H + 0.12, 0], card)).rotation.y = (random() - 0.5) * 0.4;
        for (let i = 0; i < 3; i++) {
          const spare = add(s.cylinder(0.14, 0.14, 0.025, [-0.14 + i * 0.13, H + 0.28, (random() - 0.5) * 0.1], s.material(flangeHex), 24));
          spare.rotation.set(Math.PI / 2 - 0.3 + random() * 0.6, random(), 0);
        }
      } else if (topKind === 'printout') {
        const map = (() => {
          const canvas = document.createElement('canvas');
          canvas.width = 64; canvas.height = 256;
          const c = canvas.getContext('2d')!;
          for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#f3f1e6' : '#cfe6cf'; c.fillRect(0, i * 16, 64, 16); }
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          return texture;
        })();
        const paper = new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide });
        const px = (random() - 0.5) * 0.2;
        add(s.box([0.38, 0.05 + mood.density * 0.08, 0.28], [px, H + 0.03 + mood.density * 0.04, 0.05], paper));
        const drop = 0.06 + random() * 0.07;
        add(s.box([0.38, drop, 0.003], [px, H + 0.05 - drop / 2, F + 0.09], paper)).rotation.x = 0.05;
        add(s.box([0.38, 0.003, 0.16], [px, H + 0.055, F + 0.01], paper));
      }
    }

    const speed = mix(1.2, 9, mood.energy);
    return s.finish({
      update: (dt, time) => {
        for (const spinner of spinners) spinner.node.rotation.z += dt * speed * spinner.rate * 6;
        const on = Math.sin(time * mix(2, 8, mood.energy)) > 0;
        for (const blinker of blinkers) blinker.emissiveIntensity = on ? 1.2 : 0.15;
      },
    });
  },
});
