import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Style = 'kraft' | 'smile' | 'white';
type Draw = (g: CanvasRenderingContext2D) => void;
function paint(draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    height: score('How tall is the tower?', ['Knee high, this week\'s deliveries', 'Waist high', 'Head high', 'Wedged against the ceiling']),
    opened: score('How many of the boxes have been opened?', ['None: every one still taped shut', 'One or two, slit and looked into', 'About half', 'Nearly all, flaps up and gutted']),
    shape: choice('How are they piled?', {
      tower: 'One teetering tower, a single box wide.',
      twin: 'Two towers side by side, propping each other up.',
      heap: 'A stepped heap, tall at the back and tumbling forward.',
      wall: 'A flat wall of boxes, four columns across.',
    }),
    carrier: choice('What do the boxes look like?', {
      kraft: 'Plain brown cardboard with clear tape and white address labels.',
      smile: 'Brown boxes sealed with black printed tape and a curved arrow logo, all from one giant retailer.',
      white: 'Glossy white mailer boxes with bright brand stripes, boutique and subscription orders.',
      mixed: 'Every sender at once, with grey plastic mailing bags slumped between the boxes.',
    }),
    inside: choice('In the boxes that are open, what shows?', {
      paper: 'Only crumpled brown packing paper; whatever it was is already lost in the house.',
      peanuts: 'White foam packing peanuts, spilling out across the floor.',
      gadget: 'A gadget still sealed in its bright retail box, never taken out.',
      clothes: 'Clothes still folded in their clear plastic bags, tags on.',
    }),
    balance: choice('How steady is it?', {
      square: 'Squared up and steady, stacked by someone careful.',
      leaning: 'Leaning, each box a little further off the one below.',
      toppled: 'The top has already gone: two or three boxes lie where they fell.',
    }),
    base: choice('What state are the lowest boxes in?', {
      sound: 'Sound, bearing the weight.',
      crushed: 'Crushed and bowed, corners split, the oldest orders flattened by the newest.',
      damp: 'Dark with damp along the bottom edge and sagging.',
    }),
    topper: choice('What is on top?', {
      nothing: 'Nothing.',
      card: 'A red "sorry we missed you" card.',
      letters: 'A slide of unopened envelopes.',
      cat: 'A cat sitting in the topmost open box.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D) => { node.removeFromParent(); parent.add(node); return node; };
    const BRANDS = ['#e8456b', '#2f9c8f', '#f0a21e', '#5b54c9'];

    const label = (g: CanvasRenderingContext2D, x: number, y: number) => {
      g.fillStyle = '#f7f6f1';
      g.fillRect(x, y, 104, 78);
      g.fillStyle = '#111';
      g.font = 'bold 20px monospace';
      g.fillText(`${pick(['LS', 'M', 'NW', 'BS', 'G'])}${1 + Math.floor(random() * 28)} ${Math.floor(random() * 9)}${pick(['AB', 'QT', 'XD'])}`, x + 5, y + 20, 94);
      for (let i = 0; i < 3; i++) g.fillRect(x + 5, y + 28 + i * 6, 40 + random() * 40, 2);
      for (let bx = x + 5; bx < x + 98; ) { const bw = 1 + Math.floor(random() * 4); g.fillRect(bx, y + 48, bw, 24); bx += bw + 1 + Math.floor(random() * 3); }
    };
    const grime = (g: CanvasRenderingContext2D) => {
      const dirt = mood.wear * 0.5 + (a.base === 'damp' ? 0.1 : 0);
      for (let i = 0; i < dirt * 26; i++) { g.fillStyle = `rgba(60,45,30,${0.05 + random() * 0.12})`; g.beginPath(); g.ellipse(random() * 256, random() * 256, 10 + random() * 40, 6 + random() * 20, random() * 3, 0, 7); g.fill(); }
    };
    const side = (style: Style, tone: string, labelled: boolean, brand: string) => paint((g) => {
      g.fillStyle = tone;
      g.fillRect(0, 0, 256, 256);
      if (style !== 'white') for (let x = 0; x < 256; x += 5) { g.fillStyle = 'rgba(70,45,20,0.07)'; g.fillRect(x, 0, 2, 256); }
      if (style === 'white') { g.fillStyle = brand; g.fillRect(0, 196, 256, 36); g.fillRect(20, 30, 46, 46); g.fillStyle = '#fff'; g.beginPath(); g.arc(43, 53, 13, 0, 7); g.fill(); }
      if (style === 'smile') {
        g.strokeStyle = '#17181a'; g.lineWidth = 11; g.lineCap = 'round';
        g.beginPath(); g.arc(128, 96, 92, 0.28 * Math.PI, 0.72 * Math.PI); g.stroke();
        g.beginPath(); g.moveTo(198, 152); g.lineTo(200, 176); g.moveTo(198, 152); g.lineTo(176, 160); g.stroke();
      }
      // The tape tab folded down from the lid.
      g.fillStyle = style === 'smile' ? '#17181a' : style === 'white' ? 'rgba(255,255,255,0.75)' : 'rgba(226,196,140,0.9)';
      g.fillRect(104, 0, 48, 54);
      if (style === 'smile') { g.fillStyle = '#f2f2f2'; for (let y = 6; y < 50; y += 14) g.fillRect(120, y, 16, 5); }
      if (labelled) label(g, 14 + random() * 120, 70 + random() * 80);
      else if (random() < 0.5 && style !== 'white') {
        g.strokeStyle = '#b3261f'; g.fillStyle = '#b3261f'; g.lineWidth = 4;
        g.strokeRect(150, 150, 84, 40); g.font = 'bold 20px sans-serif'; g.fillText('FRAGILE', 154, 178, 76);
      }
      grime(g);
    });
    const lid = (style: Style, tone: string, cut: boolean) => paint((g) => {
      g.fillStyle = tone;
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = 'rgba(40,25,10,0.5)';
      g.fillRect(0, 126, 256, cut ? 7 : 3);
      if (!cut) {
        g.fillStyle = style === 'smile' ? '#17181a' : style === 'white' ? 'rgba(255,255,255,0.8)' : 'rgba(226,196,140,0.92)';
        g.fillRect(0, 104, 256, 48);
        if (style === 'smile') { g.fillStyle = '#f2f2f2'; for (let x = 8; x < 250; x += 40) { g.fillRect(x, 122, 22, 5); g.fillRect(x + 8, 132, 14, 4); } }
      } else { g.fillStyle = 'rgba(226,196,140,0.5)'; g.fillRect(0, 104, 256, 9); g.fillRect(0, 143, 256, 9); }
      grime(g);
    });

    const styles: Style[] = a.carrier === 'mixed' ? ['kraft', 'smile', 'white'] : [a.carrier];
    const sets = styles.flatMap((style) => [0, 1, 2].map(() => {
      const tone = style === 'white' ? pick(['#f3f1ea', '#ecebe6']) : pick(['#b98b58', '#c39a66', '#a97c4b', '#b4875a']);
      const brand = pick(BRANDS);
      const mat = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: style === 'white' ? 0.5 : 0.9 });
      const plain = mat(side(style, tone, false, brand)), tagged = mat(side(style, tone, true, brand));
      return {
        tone,
        shut: [plain, plain, mat(lid(style, tone, false)), plain, tagged, tagged] as THREE.Material[],
        slit: [plain, plain, mat(lid(style, tone, true)), plain, tagged, plain] as THREE.Material[],
        open: [plain, plain, new THREE.MeshStandardMaterial({ color: '#3b2a1b', roughness: 1 }), plain, tagged, plain] as THREE.Material[],
        flap: new THREE.MeshStandardMaterial({ color: tone, roughness: 0.9, side: THREE.DoubleSide }),
      };
    }));

    const crushedGeometry = () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
      const p = geometry.attributes.position;
      const k1 = r(2, 5), k2 = r(2, 5), ph = r(0, 6);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const up = y + 0.5;
        const sag = up * (0.12 + 0.1 * Math.sin(x * k1 + ph) * Math.cos(z * k2 + ph) + (0.25 - x * x - z * z) * 0.35);
        const bulge = 1 + Math.sin(up * Math.PI) * 0.09;
        p.setXYZ(i, x * bulge + up * 0.1 * Math.sin(ph), y - sag, z * bulge + up * 0.08 * Math.cos(ph));
      }
      geometry.computeVertexNormals();
      return geometry;
    };
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const paper = s.material('#b89a6c', { flatShading: true, roughness: 1 });
    const foam = s.material('#f4f2ea', { roughness: 0.8 });
    const peanuts: { at: [number, number, number]; size: number }[] = [];

    /** One box whose base centre is the group origin. Returns the group. */
    const box = (w: number, h: number, d: number, state: 'shut' | 'slit' | 'open', squashed = false) => {
      const set = pick(sets);
      const group = new THREE.Group();
      const body = new THREE.Mesh(squashed ? crushedGeometry() : unit, set[state]);
      body.scale.set(w, h, d);
      body.position.y = h / 2;
      body.castShadow = body.receiveShadow = true;
      group.add(body);
      if (state === 'open') {
        // Four flaps thrown back, and whatever the answer says is inside.
        const flaps: [number, number, number, number, number][] = [[0, d / 2, w, d / 2, 0], [0, -d / 2, w, d / 2, Math.PI], [w / 2, 0, d, w / 2, Math.PI / 2], [-w / 2, 0, d, w / 2, -Math.PI / 2]];
        for (const [x, z, span, reach, turn] of flaps) {
          const hinge = new THREE.Group();
          hinge.position.set(x, h, z);
          hinge.rotation.y = turn;
          const flap = new THREE.Mesh(new THREE.PlaneGeometry(span * 0.98, reach), set.flap);
          flap.position.set(0, reach / 2, 0);
          flap.castShadow = true;
          const tilt = new THREE.Group();
          tilt.rotation.x = r(0.25, 1.9);
          tilt.add(flap);
          hinge.add(tilt);
          group.add(hinge);
        }
        if (a.inside === 'paper' || a.inside === 'clothes' || a.inside === 'gadget') {
          for (let i = 0; i < 3; i++) {
            const wad = add(s.mesh(new THREE.IcosahedronGeometry(Math.min(w, d) * r(0.2, 0.3), 0), paper, [r(-0.2, 0.2) * w, h + 0.01, r(-0.2, 0.2) * d]), group);
            wad.rotation.set(r(0, 3), r(0, 3), r(0, 3));
            wad.scale.y = 0.6;
          }
        }
        if (a.inside === 'peanuts') {
          add(s.box([w * 0.94, 0.02, d * 0.94], [0, h - 0.01, 0], foam), group);
        }
        if (a.inside === 'gadget') {
          const tint = pick(BRANDS);
          const retail = add(s.box([w * 0.5, h * 0.9, d * 0.42], [r(-0.05, 0.05), h * 0.75, r(-0.04, 0.04)], s.material(tint, { roughness: 0.35 })), group);
          retail.rotation.set(r(-0.2, 0.2), r(-0.5, 0.5), r(-0.25, 0.25));
          add(s.box([w * 0.3, h * 0.4, 0.004], [0, 0, d * 0.212], s.material('#f6f4ee', { roughness: 0.3 })), retail);
        }
        if (a.inside === 'clothes') {
          const cloth = s.material(pick(['#d94f6a', '#2e6f8e', '#e6c34a', '#3c9a7a', '#f1ece0']), { roughness: 0.25 });
          for (let i = 0; i < 2; i++) add(s.box([w * 0.62, 0.035, d * 0.6], [r(-0.03, 0.03), h + 0.03 + i * 0.04, r(-0.03, 0.03)], i ? cloth : s.material('#e9eef0', { roughness: 0.15 })), group).rotation.y = r(-0.4, 0.4);
        }
      }
      return group;
    };
    const stateFor = (isTop: boolean): 'shut' | 'slit' | 'open' => (random() < a.opened * 0.92 ? (isTop ? 'open' : 'slit') : 'shut');

    const tall = mix(0.55, 2.25, a.height);
    const spots: [number, number, number][] = {
      tower: [[0, 0, 1]],
      twin: [[-0.29, 0, 1], [0.29, 0.02, 0.8]],
      heap: [[-0.3, -0.25, 1], [0.3, -0.27, 0.85], [-0.35, 0.3, 0.5], [0.28, 0.32, 0.32]],
      wall: [[-0.87, 0, 0.85], [-0.29, 0, 1], [0.29, 0, 0.92], [0.87, 0, 0.72]],
    }[a.shape] as [number, number, number][];
    const fallen: THREE.Group[] = [];
    let crown = { x: 0, y: 0, z: 0, w: 0.3, d: 0.3, open: false };
    const drift = a.balance === 'leaning' ? r(0.045, 0.075) * (random() < 0.5 ? -1 : 1) : 0;

    spots.forEach(([sx, sz, share], column) => {
      const target = Math.max(0.3, tall * share * r(0.9, 1.05));
      let y = 0, level = 0, x = sx, z = sz;
      const lost = a.balance === 'toppled' && column === 0 ? 2 + Math.floor(random() * 2) : 0;
      while (y < target) {
        const taper = 1 - (y / target) * 0.3;
        const w = r(0.38, 0.56) * taper, d = r(0.3, 0.46) * taper;
        let h = r(0.16, 0.38) * (level === 0 ? 1.15 : 1);
        const last = y + h >= target;
        const squash = level < 2 && a.base !== 'sound' && (level === 0 || random() < 0.6);
        const state = stateFor(last);
        const made = box(w, h, d, state, squash);
        if (squash) h *= 0.78;
        made.position.set(x, y, z);
        made.rotation.y = r(-0.22, 0.22) + (a.balance === 'square' ? 0 : r(-0.2, 0.2)) + (random() < 0.5 ? Math.PI : 0);
        if (a.balance === 'leaning') made.rotation.z = -drift * (y / target) * 1.6;
        if (a.base === 'damp' && level === 0) {
          add(s.box([w * 1.02, h * 0.3, d * 1.02], [0, h * 0.15, 0], new THREE.MeshStandardMaterial({ color: '#4a3524', roughness: 1, transparent: true, opacity: 0.55 })), made);
        }
        if (last && lost) {
          fallen.push(made);
        } else {
          s.root.add(made);
          if (column === 0) crown = { x, y: y + h, z, w, d, open: state === 'open' };
        }
        y += h;
        x += drift * r(0.6, 1.4) + r(-0.015, 0.015);
        z += r(-0.02, 0.02);
        level++;
      }
      if (lost) {
        // Whatever slid off lies around the foot, on its side or its corner.
        for (let i = 0; i < lost; i++) {
          const made = i === 0 && fallen.length ? fallen[0] : box(r(0.3, 0.42), r(0.18, 0.3), r(0.26, 0.36), stateFor(false));
          const angle = r(0.2, 1.3) + i * 1.1, reach = 0.62 + i * 0.16;
          made.position.set(sx + Math.cos(angle) * reach, i === 1 ? 0.2 : 0, sz + Math.sin(angle) * reach + 0.1);
          made.rotation.set(i === 1 ? Math.PI / 2 : 0, r(0, 3), i === 2 ? 0.0 : 0);
          s.root.add(made);
        }
      }
    });

    if (a.carrier === 'mixed') {
      // Grey mailing bags slumped against the foot.
      const poly = s.material('#8e9499', { roughness: 0.3 });
      for (let i = 0; i < 4; i++) {
        const angle = r(0, Math.PI), reach = r(0.5, 0.75);
        const bag = s.ball([r(0.16, 0.22), r(0.04, 0.07), r(0.12, 0.17)], [Math.cos(angle) * reach, 0.05 + (i === 3 ? 0.07 : 0), Math.sin(angle) * reach * 0.8 + 0.1], poly, 10);
        bag.rotation.y = r(0, 3);
        add(s.box([0.1, 0.002, 0.07], [0, 1.0, 0], s.material('#f7f6f1')), bag).scale.set(4, 1, 5);
      }
    }
    if (a.opened > 0.3) {
      // Opened ones set down beside the pile.
      const count = Math.round(a.opened * 3);
      for (let i = 0; i < count; i++) {
        const made = box(r(0.3, 0.45), r(0.16, 0.28), r(0.26, 0.36), 'open');
        const angle = Math.PI * (0.25 + i * 0.3) + r(-0.15, 0.15);
        const edge = Math.max(...spots.map((spot) => Math.abs(spot[0]))) + 0.55;
        made.position.set(Math.cos(angle) * edge, 0, Math.abs(Math.sin(angle)) * 0.5 + 0.35 + (a.shape === 'heap' ? 0.35 : 0));
        made.rotation.y = r(-0.5, 0.5);
        s.root.add(made);
        if (a.inside === 'peanuts') for (let n = 0; n < 40; n++) peanuts.push({ at: [made.position.x + r(-0.4, 0.4), 0.012, made.position.z + r(-0.3, 0.45)], size: r(0.7, 1.2) });
      }
    }
    if (peanuts.length) s.scatter(new THREE.CapsuleGeometry(0.018, 0.03, 2, 6), foam, peanuts);

    const topY = crown.y + (crown.open ? 0.02 : 0.004);
    if (a.topper === 'card') {
      const card = s.box([0.1, 0.004, 0.21], [crown.x + 0.04, topY, crown.z + 0.02], s.material('#d3242c', { roughness: 0.5 }));
      card.rotation.y = r(-0.6, 0.6);
      add(s.box([0.07, 0.001, 0.05], [0, 0.003, -0.06], s.material('#ffffff')), card);
    } else if (a.topper === 'letters') {
      for (let i = 0; i < 6; i++) {
        const envelope = s.box([0.22, 0.004, 0.11], [crown.x + r(-0.08, 0.08), topY + i * 0.005, crown.z + r(-0.06, 0.06)], s.material(i % 3 === 1 ? '#c9a76d' : '#f4f2ec'));
        envelope.rotation.y = r(-0.9, 0.9);
        if (i % 2 === 0) add(s.box([0.07, 0.001, 0.035], [-0.04, 0.003, 0.01], s.material(i === 4 ? '#c8242c' : '#dfe6ea')), envelope);
      }
    } else if (a.topper === 'cat') {
      const fur = s.material(pick(['#2b2a2c', '#d08a3c', '#8a8a8e', '#efe9dd']), { roughness: 1 });
      const cat = new THREE.Group();
      add(s.ball([0.1, 0.12, 0.13], [0, 0.1, -0.02], fur, 14), cat);
      add(s.ball([0.07, 0.065, 0.065], [0, 0.24, 0.06], fur, 14), cat);
      for (const side of [-1, 1]) {
        const ear = add(s.mesh(new THREE.ConeGeometry(0.025, 0.05, 4), fur, [side * 0.04, 0.3, 0.05]), cat);
        ear.rotation.y = Math.PI / 4;
        add(s.ball([0.008, 0.01, 0.004], [side * 0.026, 0.25, 0.122], s.material('#d9c23a', { emissive: '#d9c23a', emissiveIntensity: 0.3 }), 8), cat);
      }
      add(s.tube([[0.07, 0.05, -0.1], [0.14, 0.04, -0.06], [0.16, 0.06, 0.03], [0.13, 0.1, 0.08]], 0.016, fur), cat);
      cat.position.set(crown.x, crown.y - (crown.open ? 0.05 : 0), crown.z);
      cat.rotation.y = r(-0.7, 0.7);
      s.root.add(cat);
    }

    return s.finish();
  },
});
