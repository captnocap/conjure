import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    era: choice('What era and kind of desk is it?', {
      inkwell: 'Victorian: a sloping wooden lift-lid with an inkwell on curled cast-iron sides, bench seat joined on behind.',
      lidded: 'Mid-century: a wooden box desk with a hinged lid on tapered legs, and a separate wooden chair.',
      tubular: '1970s: a laminate top on bent tubular steel with a book shelf under it, and a moulded plastic chair.',
      combo: 'A one-piece chair-desk with a kidney-shaped writing tablet on a steel arm, American style.',
      exam: 'A bare folding exam desk on crossed legs with a stacking chair, set out in a hall.',
    }),
    chair: choice('If the chair is separate, where is it?', {
      tucked: 'Pushed in neatly under the desk.',
      askew: 'Shoved back at an angle, as if someone left in a hurry.',
      tipped: 'Tipped over backwards on the floor.',
      stacked: 'Turned upside down on top of the desk for the cleaners.',
    }),
    left: choice('What is on the desk?', {
      book: 'An open exercise book with a pen lying across it.',
      stack: 'A neat stack of textbooks, a pencil case and a ruler.',
      plane: 'A paper aeroplane, crumpled paper balls and a folded note.',
      test: 'A single marked test paper and a chewed pencil.',
      lunch: 'An open lunchbox, an apple and a juice carton.',
      nothing: 'Nothing at all.',
    }),
    carving: choice('How much has been carved and inked into the top?', {
      clean: 'None: the top is unmarked.',
      few: 'A few initials and one heart with an arrow.',
      dense: 'Covered: decades of names, dates, tallies and insults cut deep and inked in.',
    }),
    lid: noul('If it has a lift-lid, is the lid propped open showing what is inside?'),
    bag: choice('Has a bag or coat been left behind?', {
      none: 'No, nothing was left.',
      satchel: 'A brown leather satchel leaning against the leg.',
      backpack: 'A bright nylon backpack slumped on the floor, half unzipped.',
      gymbag: 'A drawstring PE bag hanging from the side.',
      coat: 'A coat left hanging over the back of the seat.',
    }),
    gum: noul('Is there chewing gum stuck to it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const woodTone = new THREE.Color(a.era === 'inkwell' ? '#7a4a26' : '#b9884e').lerp(new THREE.Color('#4a3020'), mood.wear * 0.35);
    const wood = s.material(woodTone, { roughness: 0.55 });
    const iron = s.material('#232426', { metalness: 0.5, roughness: 0.6 });
    const tubeColour = a.era === 'tubular' ? ['#8d9698', '#2f5fa8', '#3d6a4a'][Math.floor(random() * 3)] : '#b9bfc0';
    const steel = s.material(tubeColour, { metalness: 0.6, roughness: 0.4 });
    const shellColour = new THREE.Color(['#d8642a', '#2f6fb8', '#3f8f5a', '#b8322e', '#d8b02a'][Math.floor(random() * 5)]).lerp(new THREE.Color('#88857a'), (1 - mood.cheer) * 0.4);
    const shell = s.material(shellColour, { roughness: 0.5 });
    const paper = s.material('#f4f1e4', { roughness: 0.9 });
    const lifted = (a.era === 'inkwell' || a.era === 'lidded');
    const open = lifted && a.lid;
    const fixed = a.era === 'inkwell' || a.era === 'combo';
    const stacked = !fixed && a.chair === 'stacked';

    // The writing surface, with whatever generations have cut into it.
    const topTexture = (w: number, d: number) => {
      const c = document.createElement('canvas');
      c.width = 512; c.height = Math.round(512 * d / w);
      const g = c.getContext('2d')!;
      const laminate = a.era === 'tubular' || a.era === 'exam';
      const base = laminate ? ['#cfc8b2', '#b9c4b4', '#c9cdd0'][Math.floor(random() * 3)] : `#${woodTone.clone().multiplyScalar(1.12).getHexString()}`;
      g.fillStyle = base; g.fillRect(0, 0, c.width, c.height);
      if (!laminate) for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(40,20,5,${0.05 + random() * 0.1})`; g.lineWidth = 1 + random() * 2; g.beginPath(); const y = random() * c.height; g.moveTo(0, y); g.bezierCurveTo(170, y + (random() - 0.5) * 20, 340, y + (random() - 0.5) * 20, 512, y + (random() - 0.5) * 10); g.stroke(); }
      const marks = a.carving === 'clean' ? 0 : a.carving === 'few' ? 4 : 26;
      const words = ['JK', 'M+T', 'DAZ', '1987', 'BORED', 'SKOOL', 'HELP', 'T.R.', 'LIZ', 'NO', '4EVA', 'SAM', '1963', 'WAS ERE', 'ZZZ', 'A.W.', 'KEV', 'IIII'];
      for (let i = 0; i < marks; i++) {
        g.save();
        g.translate(30 + random() * (c.width - 120), 40 + random() * (c.height - 60));
        g.rotate((random() - 0.5) * 0.9);
        const size = 22 + random() * 30;
        g.font = `bold ${size}px monospace`;
        const inked = random() < 0.5;
        g.fillStyle = inked ? ['#1c2f7a', '#16161a', '#8a1c1c'][Math.floor(random() * 3)] : laminate ? '#6a6456' : '#2a1608';
        g.globalAlpha = 0.85;
        if (i === 0) {
          g.strokeStyle = g.fillStyle; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 12); g.bezierCurveTo(-40, -22, -8, -42, 0, -18); g.bezierCurveTo(8, -42, 40, -22, 0, 12); g.stroke();
          g.beginPath(); g.moveTo(-42, 14); g.lineTo(44, -30); g.stroke();
        } else g.fillText(words[Math.floor(random() * words.length)], 0, 0);
        g.restore();
      }
      for (let i = 0; i < mood.wear * 7; i++) { g.fillStyle = `rgba(20,30,90,${0.25 + random() * 0.3})`; g.beginPath(); g.ellipse(random() * c.width, random() * c.height, 6 + random() * 22, 5 + random() * 14, random() * 3, 0, 7); g.fill(); }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
    };
    const surface = (parent: THREE.Object3D, w: number, d: number, at: P) => {
      const m = s.mesh(new THREE.PlaneGeometry(w, d), topTexture(w, d), at);
      m.rotation.x = -Math.PI / 2;
      parent.add(m);
    };

    // A seat that faces -z, toward the desk. Returns where its back is, for coats.
    const makeChair = (kind: 'wood' | 'shell') => {
      const g = new THREE.Group();
      if (kind === 'wood') {
        g.add(s.box([0.36, 0.025, 0.36], [0, 0.44, 0], wood));
        for (const x of [-1, 1]) {
          g.add(s.rod([x * 0.15, 0.43, -0.15], [x * 0.17, 0, -0.17], 0.018, wood, 0.014));
          g.add(s.rod([x * 0.15, 0.84, 0.19], [x * 0.17, 0, 0.19], 0.016, wood, 0.016));
          g.add(s.rod([x * 0.16, 0.2, -0.16], [x * 0.16, 0.2, 0.18], 0.01, wood));
        }
        g.add(s.box([0.34, 0.1, 0.018], [0, 0.78, 0.19], wood), s.box([0.34, 0.05, 0.018], [0, 0.63, 0.19], wood));
      } else {
        const seat = s.box([0.38, 0.02, 0.37], [0, 0.44, 0], shell);
        const lip = s.cylinder(0.02, 0.02, 0.38, [0, 0.435, -0.185], shell, 10);
        lip.rotation.z = Math.PI / 2;
        const back = s.box([0.38, 0.26, 0.02], [0, 0.7, 0.2], shell);
        back.rotation.x = 0.14;
        const slot = s.box([0.12, 0.03, 0.03], [0, 0.6, 0.19], iron);
        slot.rotation.x = 0.14;
        g.add(seat, lip, back, slot);
        const curve = s.tube([[-0.19, 0.44, 0.17], [-0.19, 0.55, 0.19], [-0.19, 0.6, 0.2]], 0.01, steel);
        g.add(curve, curve.clone().translateX(0.38));
        for (const x of [-1, 1]) g.add(s.tube([[x * 0.2, 0, -0.2], [x * 0.17, 0.4, -0.15], [x * 0.17, 0.43, -0.1], [x * 0.17, 0.43, 0.1], [x * 0.17, 0.4, 0.15], [x * 0.2, 0, 0.22]], 0.011, steel));
      }
      return g;
    };
    const coatOn = (g: THREE.Group, y: number, z: number) => {
      const cloth = s.material(new THREE.Color(['#2c3f6a', '#6a2c2c', '#3a4a3a', '#c8a02a'][Math.floor(random() * 4)]), { roughness: 0.95 });
      g.add(s.box([0.42, 0.06, 0.1], [0, y, z], cloth), s.box([0.42, 0.5, 0.03], [0, y - 0.24, z + 0.04], cloth), s.box([0.4, 0.22, 0.03], [0, y - 0.1, z - 0.04], cloth));
      for (const x of [-1, 1]) { const sleeve = s.cylinder(0.045, 0.04, 0.46, [x * 0.24, y - 0.25, z + 0.03], cloth, 10); sleeve.rotation.z = x * 0.12; g.add(sleeve); }
      const hood = s.ball([0.11, 0.08, 0.06], [0, y - 0.03, z + 0.07], cloth, 12);
      g.add(hood);
    };

    let H = 0.72, tw = 0.62, td = 0.46, tx = 0, tz = 0;
    const topG = new THREE.Group();
    s.root.add(topG);
    let seat: THREE.Group | null = null, seatBack: [number, number] = [0.84, 0.19];
    let hookX = 0.33;

    if (lifted) {
      // Box body, a flat strip at the far edge and a sloping lid hinged to it.
      const by = 0.6, bh = 0.11;
      s.box([0.6, 0.012, 0.42], [0, by, 0.01], wood);
      for (const x of [-1, 1]) s.box([0.014, bh, 0.42], [x * 0.293, by + bh / 2, 0.01], wood);
      s.box([0.6, bh, 0.014], [0, by + bh / 2, -0.2], wood);
      s.box([0.6, bh * 0.6, 0.014], [0, by + bh * 0.3, 0.215], wood);
      s.box([0.62, 0.02, 0.1], [0, by + bh + 0.008, -0.25], wood);
      const groove = s.box([0.3, 0.004, 0.02], [-0.08, by + bh + 0.019, -0.25], s.material(woodTone.clone().multiplyScalar(0.6)));
      groove.castShadow = false;
      if (a.era === 'inkwell') {
        s.cylinder(0.028, 0.028, 0.006, [0.22, by + bh + 0.02, -0.25], s.material('#f1efe6', { roughness: 0.3 }), 14);
        s.cylinder(0.02, 0.02, 0.007, [0.22, by + bh + 0.021, -0.25], s.material('#10142a', { roughness: 0.2 }), 12);
      }
      const lid = new THREE.Group();
      lid.position.set(0, by + bh + 0.008, -0.2);
      lid.rotation.x = open ? -mix(0.9, 1.25, random()) : 0.1;
      s.root.add(lid);
      lid.add(s.box([0.62, 0.02, 0.45], [0, 0, 0.225], wood));
      surface(lid, 0.6, 0.43, [0, 0.0105, 0.225]);
      if (open) {
        // Inside the desk.
        const colours = ['#b8322e', '#2f5fa8', '#3f8f5a', '#d8b02a', '#6a3a8a'];
        for (let i = 0; i < Math.round(mix(2, 5, mood.density)); i++) {
          const book = s.box([0.17 + random() * 0.05, 0.016, 0.23], [-0.16 + random() * 0.08, by + 0.016 + i * 0.017, random() * 0.06], s.material(colours[Math.floor(random() * 5)]));
          book.rotation.y = (random() - 0.5) * 0.5;
        }
        s.ball([0.03, 0.028, 0.03], [0.17, by + 0.035, 0.1], s.material('#8a9a3a'), 10);
        const comic = s.label('WHAM!', 0.2, 0.26, [0.1, by + 0.01, -0.03], '#d8262c', '#f3df5a');
        comic.rotation.x = -Math.PI / 2; comic.rotation.z = 0.3;
        s.cylinder(0.012, 0.012, 0.15, [0.2, by + 0.02, -0.12], s.material('#d8b02a'), 8).rotation.z = Math.PI / 2;
      } else {
        topG.position.copy(lid.position);
        topG.rotation.x = 0.1;
        tz = 0.225;
      }
      H = by + bh + 0.02; tw = 0.56; td = 0.38;
      if (a.era === 'inkwell') {
        for (const x of [-1, 1]) {
          const X = x * 0.3;
          s.box([0.045, 0.03, 1.0], [X, 0.015, 0.2], iron);
          s.tube([[X, 0.03, -0.22], [X, 0.22, -0.02], [X, 0.42, -0.2], [X, 0.6, -0.08]], 0.016, iron);
          s.tube([[X, 0.03, 0.12], [X, 0.3, 0.0], [X, 0.6, 0.14]], 0.016, iron);
          s.ring(0.07, 0.01, [X, 0.36, -0.03], iron).rotation.y = Math.PI / 2;
          s.tube([[X, 0.03, 0.46], [X, 0.25, 0.4], [X, 0.42, 0.5]], 0.016, iron);
          s.tube([[X, 0.03, 0.66], [X, 0.42, 0.63], [X, 0.84, 0.7]], 0.016, iron);
        }
        seat = new THREE.Group();
        seat.position.z = 0.52;
        s.root.add(seat);
        for (let i = 0; i < 3; i++) seat.add(s.box([0.64, 0.025, 0.085], [0, 0.43, -0.09 + i * 0.09], wood));
        seat.add(s.box([0.64, 0.1, 0.022], [0, 0.78, 0.165], wood), s.box([0.64, 0.07, 0.022], [0, 0.62, 0.135], wood));
        seatBack = [0.84, 0.165];
      } else {
        for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * 0.27, by, z * 0.18], [x * 0.31, 0, z * 0.22], 0.022, wood, 0.016);
        for (const x of [-1, 1]) s.rod([x * 0.29, 0.2, -0.2], [x * 0.29, 0.2, 0.2], 0.012, wood);
      }
    } else if (a.era === 'tubular') {
      s.box([tw, 0.024, td], [0, H - 0.012, 0], s.material('#3a3c3e'));
      surface(s.root, tw - 0.012, td - 0.012, [0, H + 0.0006, 0]);
      for (const x of [-1, 1]) {
        const X = x * 0.27;
        s.tube([[X, 0, -0.2], [X, 0.62, -0.2], [X, 0.69, -0.17], [X, 0.69, 0.17], [X, 0.62, 0.2], [X, 0, 0.2]], 0.013, steel);
        for (const z of [-1, 1]) s.cylinder(0.016, 0.016, 0.02, [X, 0.01, z * 0.2], iron, 8);
      }
      s.rod([-0.27, 0.25, -0.2], [0.27, 0.25, -0.2], 0.011, steel);
      s.box([0.52, 0.01, 0.36], [0, 0.56, 0], steel);
      for (const x of [-1, 1]) s.box([0.01, 0.07, 0.36], [x * 0.26, 0.59, 0], steel);
      s.box([0.52, 0.07, 0.01], [0, 0.59, -0.18], steel);
      const n = Math.round(mix(0, 3, mood.density));
      for (let i = 0; i < n; i++) s.box([0.2, 0.02, 0.26], [-0.1 + i * 0.03, 0.575 + i * 0.021, 0.02], s.material(['#b8322e', '#2f5fa8', '#d8b02a'][i]));
      hookX = 0.3;
    } else if (a.era === 'exam') {
      tw = 0.6; td = 0.45; H = 0.71;
      s.box([tw, 0.02, td], [0, H - 0.01, 0], s.material('#7a5a3a'));
      surface(s.root, tw - 0.012, td - 0.012, [0, H + 0.0006, 0]);
      for (const x of [-1, 1]) {
        const X = x * 0.26;
        s.rod([X, 0, -0.22], [X, H - 0.02, 0.18], 0.012, steel);
        s.rod([X, 0, 0.22], [X, H - 0.02, -0.18], 0.012, steel);
        s.ball([0.016, 0.016, 0.016], [X + x * 0.012, H / 2 - 0.01, 0], iron, 8);
      }
      s.rod([-0.26, 0.04, -0.21], [0.26, 0.04, -0.21], 0.01, steel);
      s.rod([-0.26, 0.04, 0.21], [0.26, 0.04, 0.21], 0.01, steel);
      const number = s.label(String(1 + Math.floor(random() * 240)), 0.09, 0.055, [tw / 2 - 0.07, H + 0.002, -td / 2 + 0.05], '#1a1a1a', '#f4f1e4');
      number.rotation.x = -Math.PI / 2;
    } else {
      // Chair-desk: a seat with a tablet arm on the right-hand side.
      seat = new THREE.Group();
      seat.position.z = 0.12;
      s.root.add(seat);
      const ply = s.material('#c99a5e', { roughness: 0.5 });
      seat.add(s.box([0.4, 0.025, 0.4], [0, 0.44, 0], ply));
      const back = s.box([0.4, 0.24, 0.022], [0, 0.72, 0.21], ply);
      back.rotation.x = 0.12;
      seat.add(back);
      for (const x of [-1, 1]) {
        seat.add(s.tube([[x * 0.2, 0, -0.24], [x * 0.18, 0.4, -0.17], [x * 0.18, 0.43, -0.1], [x * 0.18, 0.43, 0.14], [x * 0.18, 0.5, 0.2], [x * 0.18, 0.84, 0.24]], 0.012, steel));
        seat.add(s.rod([x * 0.18, 0.43, 0.14], [x * 0.2, 0, 0.26], 0.012, steel));
      }
      seat.add(s.box([0.34, 0.008, 0.3], [0, 0.17, 0], steel), s.rod([-0.19, 0.17, -0.2], [0.19, 0.17, -0.2], 0.008, steel), s.rod([-0.19, 0.17, 0.2], [0.19, 0.17, 0.2], 0.008, steel));
      seat.add(s.tube([[0.19, 0.3, -0.2], [0.3, 0.5, -0.24], [0.3, 0.68, -0.22]], 0.012, steel), s.rod([0.19, 0.45, 0.16], [0.33, 0.68, 0.1], 0.012, steel));
      const slab = s.material('#b98a52', { roughness: 0.45 });
      seat.add(s.box([0.4, 0.022, 0.34], [0.14, 0.7, -0.3], slab), s.box([0.16, 0.022, 0.36], [0.28, 0.7, 0.0], slab), s.cylinder(0.17, 0.17, 0.022, [0.11, 0.7, -0.3], slab, 20));
      surface(seat, 0.38, 0.32, [0.14, 0.7116, -0.3]);
      const books = Math.round(mix(0, 3, mood.density));
      for (let i = 0; i < books; i++) seat.add(s.box([0.2, 0.022, 0.25], [0, 0.185 + i * 0.023, 0], s.material(['#b8322e', '#2f5fa8', '#3f8f5a'][i])));
      H = 0.711; tw = 0.34; td = 0.3; tx = 0.14; tz = -0.18;
      seatBack = [0.86, 0.24]; hookX = 0.35;
    }
    if (!lifted) topG.position.set(tx, H, tz);

    // Separate chair.
    if (!fixed) {
      seat = makeChair(a.era === 'lidded' ? 'wood' : 'shell');
      seatBack = a.era === 'lidded' ? [0.85, 0.19] : [0.84, 0.215];
      if (stacked) { seat.rotation.z = Math.PI; seat.position.set(0, H + 0.455, 0.04); seat.rotation.y = (random() - 0.5) * 0.2; }
      else if (a.chair === 'tipped') { seat.rotation.x = Math.PI / 2; seat.rotation.z = (random() - 0.5) * 0.8; seat.position.set((random() - 0.5) * 0.3, 0.22, 0.6); }
      else if (a.chair === 'askew') { seat.position.set(0.12 + random() * 0.15, 0, 0.62 + random() * 0.1); seat.rotation.y = 0.4 + random() * 0.5; }
      else seat.position.set(0, 0, 0.3);
      s.root.add(seat);
    }

    // What was left on the top.
    const t = <M extends THREE.Object3D>(m: M) => (topG.add(m), m);
    const flat = (m: THREE.Object3D, turn = 0) => { m.rotation.x = -Math.PI / 2; m.rotation.z = turn; return m; };
    if (!open && !stacked) {
      const u = Math.min(tw, 0.5) / 0.5;
      if (a.left === 'book') {
        const turn = (random() - 0.5) * 0.5;
        const book = new THREE.Group();
        book.position.set((random() - 0.5) * 0.1 * u, 0, 0);
        book.rotation.y = turn;
        topG.add(book);
        book.add(s.box([0.3 * u, 0.006, 0.2], [0, 0.003, 0], s.material('#3a6ea8')));
        for (const x of [-1, 1]) {
          const page = s.label(x < 0 ? '=====' : '== =', 0.14 * u, 0.19, [x * 0.072 * u, 0.008, 0], '#8fa6c8', '#f6f3e6');
          flat(page);
          book.add(page);
        }
        book.add(s.rod([-0.04, 0.014, 0.05], [0.09 * u, 0.014, -0.03], 0.005, s.material('#1c3fa0')));
      } else if (a.left === 'stack') {
        const n = Math.round(mix(2, 5, mood.density));
        for (let i = 0; i < n; i++) t(s.box([0.19, 0.024, 0.25], [-0.1 * u, 0.012 + i * 0.025, 0], s.material(['#b8322e', '#2f5fa8', '#3f8f5a', '#d8b02a', '#6a3a8a'][Math.floor(random() * 5)]))).rotation.y = (random() - 0.5) * 0.3;
        t(s.cylinder(0.03, 0.03, 0.2, [0.13 * u, 0.03, 0.05], shell, 12)).rotation.x = Math.PI / 2;
        t(s.box([0.03, 0.003, 0.3], [0.2 * u, 0.002, -0.02], s.material('#e8d27a'))).rotation.y = 0.2;
      } else if (a.left === 'plane') {
        const plane = new THREE.Group();
        plane.position.set(-0.05 * u, 0.02, 0.02);
        plane.rotation.y = random() * 6;
        topG.add(plane);
        for (const x of [-1, 1]) {
          const wing = s.mesh(new THREE.ConeGeometry(0.06, 0.24, 3), paper);
          wing.scale.z = 0.05; wing.rotation.set(Math.PI / 2, 0, x * 0.25); wing.position.set(x * 0.035, 0.012, 0);
          plane.add(wing);
        }
        const keel = s.mesh(new THREE.ConeGeometry(0.03, 0.24, 3), paper);
        keel.scale.x = 0.08; keel.rotation.x = Math.PI / 2;
        plane.add(keel);
        for (let i = 0; i < Math.round(mix(2, 7, mood.density)); i++) {
          const r = 0.02 + random() * 0.012;
          t(s.mesh(new THREE.IcosahedronGeometry(r, 0), paper, [(random() - 0.5) * tw * 0.8, r, (random() - 0.5) * td * 0.8]));
        }
        t(flat(s.label('do u like me? Y/N', 0.12, 0.05, [0.14 * u, 0.003, 0.1], '#3b4a8a', '#f6f3e6'), 0.4));
      } else if (a.left === 'test') {
        const good = mood.cheer > 0.55;
        const sheet = t(flat(s.label(good ? 'A+' : mood.cheer < 0.25 ? 'F' : 'C-', 0.21 * u, 0.29, [0, 0.003, 0], '#d8262c', '#f6f3e6'), (random() - 0.5) * 0.4));
        sheet.castShadow = false;
        t(s.rod([0.14 * u, 0.008, 0.1], [0.2 * u, 0.008, -0.05], 0.005, s.material('#e8c22a')));
      } else if (a.left === 'lunch') {
        t(s.box([0.2 * u, 0.06, 0.14], [-0.08 * u, 0.03, 0], shell));
        t(s.box([0.18 * u, 0.02, 0.12], [-0.08 * u, 0.055, 0], s.material('#e8d9a8')));
        const lidM = t(s.box([0.2 * u, 0.012, 0.14], [-0.08 * u, 0.1, -0.09], shell));
        lidM.rotation.x = 1.2;
        t(s.ball([0.035, 0.033, 0.035], [0.12 * u, 0.033, 0.08], s.material('#c8242c', { roughness: 0.3 }), 12));
        t(s.box([0.05, 0.1, 0.035], [0.14 * u, 0.05, -0.08], s.material('#f29a2a')));
        t(s.rod([0.15 * u, 0.1, -0.08], [0.17 * u, 0.15, -0.07], 0.003, paper));
      }
    }

    // Gum.
    if (a.gum) {
      const gum = s.material(['#f29ab8', '#e8e4d8', '#9ad8c8'][Math.floor(random() * 3)], { roughness: 0.5 });
      const front = lifted ? 0.235 : td / 2 + tz;
      for (let i = 0; i < 3 + Math.round(mood.wear * 4); i++) s.ball([0.018, 0.012, 0.014], [tx + (random() - 0.5) * tw, H - 0.035 - random() * 0.02, front + 0.004], gum, 8);
      s.ball([0.02, 0.008, 0.02], [tx + tw * 0.3, H + 0.004 + (lifted ? -0.02 : 0), tz + (lifted ? -0.25 : td * 0.3)], gum, 8);
    }

    // Bag or coat.
    if (a.bag === 'satchel') {
      const leather = s.material('#7a4a26', { roughness: 0.6 });
      const bag = new THREE.Group();
      bag.position.set(-0.42, 0, 0.05);
      bag.rotation.set(0, 0.3 + random() * 0.4, 0.14);
      s.root.add(bag);
      bag.add(s.box([0.1, 0.27, 0.36], [0, 0.135, 0], leather), s.box([0.012, 0.17, 0.37], [-0.055, 0.2, 0], s.material('#6a3e1e')));
      for (const z of [-1, 1]) bag.add(s.box([0.016, 0.1, 0.03], [-0.062, 0.14, z * 0.1], s.material('#5a3418')), s.box([0.018, 0.022, 0.035], [-0.066, 0.1, z * 0.1], s.material('#c8a84a', { metalness: 0.7 })));
      bag.add(s.tube([[0, 0.27, -0.16], [0.06, 0.42, -0.08], [0.1, 0.3, 0.05], [0, 0.27, 0.16]], 0.012, leather));
    } else if (a.bag === 'backpack') {
      const nylon = s.material(shellColour.clone().offsetHSL(0.45, 0, 0), { roughness: 0.8 });
      const bag = new THREE.Group();
      bag.position.set(-0.46, 0, 0.12);
      bag.rotation.set(-0.25, random() * 1.2, 0.1);
      s.root.add(bag);
      bag.add(s.ball([0.15, 0.2, 0.11], [0, 0.19, 0], nylon, 14), s.ball([0.11, 0.09, 0.05], [0, 0.13, 0.1], s.material('#22262a'), 10));
      bag.add(s.tube([[-0.09, 0.33, -0.06], [-0.13, 0.2, -0.13], [-0.09, 0.06, -0.07]], 0.014, s.material('#22262a')), s.tube([[0.09, 0.33, -0.06], [0.15, 0.25, -0.15], [0.2, 0.02, -0.12]], 0.014, s.material('#22262a')));
      bag.add(s.box([0.14, 0.02, 0.18], [0.02, 0.385, 0.01], paper));
    } else if (a.bag === 'gymbag') {
      const sack = s.material(shellColour.clone().offsetHSL(0.3, 0, -0.1), { roughness: 0.9 });
      const hx = tx + (a.era === 'combo' ? -0.2 : -hookX), hy = a.era === 'combo' ? 0.84 : H - 0.06, hz = a.era === 'combo' ? 0.36 : 0.05;
      s.rod([hx, hy, hz], [hx - 0.04, hy - 0.16, hz], 0.004, paper);
      s.rod([hx, hy, hz], [hx - 0.08, hy - 0.16, hz + 0.02], 0.004, paper);
      s.lathe([[0, 0], [0.09, 0.03], [0.13, 0.14], [0.11, 0.27], [0.03, 0.34], [0.045, 0.37]], sack, [hx - 0.06, hy - 0.5, hz + 0.01]);
    } else if (a.bag === 'coat' && seat) {
      if (!fixed && (stacked || a.chair === 'tipped')) {
        // No upright seat back to hang on: it has slid to the floor in a heap.
        const cloth = s.material('#2c3f6a', { roughness: 0.95 });
        s.ball([0.26, 0.07, 0.2], [-0.5, 0.05, 0.2], cloth, 12);
        s.ball([0.12, 0.06, 0.1], [-0.42, 0.1, 0.12], cloth, 10);
        s.cylinder(0.045, 0.04, 0.4, [-0.6, 0.04, 0.42], cloth, 10).rotation.set(Math.PI / 2, 0, 0.5);
      } else coatOn(seat, seatBack[0], seatBack[1]);
    }

    return s.finish();
  },
});
