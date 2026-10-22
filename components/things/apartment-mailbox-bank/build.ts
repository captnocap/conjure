import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const PAINTS = {
  'grey-blue': 'Institutional grey-blue enamel, the colour of every entrance hall.',
  green: 'Thick hospital green, repainted many times over the hinges.',
  oxide: 'Red-brown oxide primer that was never given a top coat.',
  cream: 'Yellowed cream enamel, chipped to steel at the corners.',
  steel: 'Bare galvanised steel, dull and cold.',
  sky: 'A cheerful sky blue someone chose at a residents meeting.',
} as const;
const PAINT: Record<keyof typeof PAINTS, string> = {
  'grey-blue': '#6f8796', green: '#5f8a6d', oxide: '#8a4a3a', cream: '#d9cfa8', steel: '#a9afb0', sky: '#5aa2d0',
};
const DADO = {
  olive: 'Olive green gloss to shoulder height, whitewash above.',
  blue: 'Pale powder blue gloss below, whitewash above.',
  ochre: 'Mustard ochre gloss below, cream above.',
  brown: 'Dark brown gloss below, grey plaster above.',
} as const;
const DADO_COLOUR: Record<keyof typeof DADO, [string, string]> = {
  olive: ['#7c8a5a', '#e4e0d2'], blue: ['#9fb9c6', '#e8e7df'], ochre: ['#c39a45', '#ebe2c6'], brown: ['#6a4c3a', '#cfcbc0'],
};
const FLYERS = ['#e9d94a', '#e2574c', '#5aa9d6', '#f1efe6', '#f08a3c', '#7cc36b', '#e58ab8'];

export default defineThing({
  questions: {
    size: choice('How many flats does the bank serve?', {
      eight: 'Eight boxes in two short rows: a small house with one entrance.',
      fifteen: 'Fifteen boxes in three rows: a five-storey walk-up.',
      'twenty-four': 'Twenty-four boxes, four rows of six: a full panel-block entrance.',
      'thirty-two': 'Thirty-two boxes in a long wall of steel: a tower with a lift.',
    }),
    numbering: choice('How are the boxes numbered?', {
      stencil: 'Black stencilled numerals sprayed by the housing office.',
      enamel: 'Small white enamel ovals with blue numbers, screwed on.',
      brush: 'White numbers painted by hand with a brush, uneven and slanting.',
      tape: 'Strips of masking tape with numbers in marker pen.',
      stamped: 'Numbers stamped into the steel, barely visible under the paint.',
      ghost: 'Mostly worn away: half the numbers are missing or only shadows.',
    }),
    paint: choice('What colour are the boxes?', PAINTS),
    wall: choice('What is the wall behind painted like?', DADO),
    overflow: score('How many boxes overflow with flyers and junk mail?', ['None, all emptied daily', 'One or two', 'About half', 'Nearly every slot is stuffed']),
    story: choice('What state are the doors in, and what does it say about the building?', {
      kept: 'All shut and straight: a caretaker still checks them.',
      pried: 'A few doors are bent open at the corner where someone forced the locks.',
      hanging: 'One door hangs by a single hinge and another is missing altogether.',
      emptied: 'Most doors stand open on empty boxes: people are moving out.',
      newcomer: 'All old and dull except one door freshly painted a different colour.',
    }),
    sticking: choice('What sticks out of one particular slot?', {
      newspaper: 'A rolled newspaper, still delivered every morning.',
      bill: 'A long white envelope with a red stripe: a final notice.',
      flower: 'A single red carnation on its stem.',
      key: 'A key hanging on a loop of string, left for someone.',
      postcard: 'A bright postcard from somewhere with a sea.',
      nothing: 'Nothing: no slot is singled out.',
    }),
    name: choice('What is handwritten on one of the boxes?', {
      widow: 'A surname in careful blue ballpoint on a yellowed card.',
      family: 'A family name in thick black marker, with the number of people.',
      couple: 'Two first names and a plus sign on a strip of tape.',
      crossed: 'An old name crossed out and a new one squeezed beneath.',
      none: 'No name anywhere: only numbers.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [cols, rows] = { eight: [4, 2], fifteen: [5, 3], 'twenty-four': [6, 4], 'thirty-two': [8, 4] }[a.size];
    const bw = 0.25, bh = 0.2, gap = 0.014, depth = 0.13;
    const bankW = cols * (bw + gap) + gap + 0.03, bankH = rows * (bh + gap) + gap + 0.03;
    const bankY = 0.72 + bankH / 2;
    const wallW = bankW + 0.36, dadoH = Math.max(1.45, bankY + bankH / 2 + 0.1), wallH = dadoH + 0.28;
    const count = cols * rows;
    const start = [1, 1, 17, 33, 41, 61, 97][Math.floor(random() * 7)];
    const paint = new THREE.Color(PAINT[a.paint]);
    const fresh = new THREE.Color(['#d8433a', '#f0c23a', '#3d7fd0', '#ffffff'][Math.floor(random() * 4)]);

    // Wall slab with the two-tone paint line and a strip of floor.
    const [low, high] = DADO_COLOUR[a.wall];
    s.box([wallW, dadoH, 0.12], [0, dadoH / 2, -0.06], s.material(low, { roughness: 0.45 }));
    s.box([wallW, wallH - dadoH, 0.12], [0, dadoH + (wallH - dadoH) / 2, -0.06], s.material(high, { roughness: 0.95 }));
    s.box([wallW, 0.025, 0.005], [0, dadoH, 0.002], s.material(new THREE.Color(low).multiplyScalar(0.55)));
    s.box([wallW, 0.05, 0.45], [0, -0.025, 0.105], s.material('#9b978c', { roughness: 0.95 }));
    s.box([wallW, 0.09, 0.02], [0, 0.045, 0.01], s.material('#4a4640'));

    // Per-door state.
    const special = Math.floor(random() * count);
    let named = Math.floor(random() * count);
    if (named === special) named = (named + 1) % count;
    let newcomer = Math.floor(random() * count);
    const doors = Array.from({ length: count }, (_u, i) => {
      let open = 0, sag = 0, missing = false;
      const r = random();
      if (a.story === 'pried' && r < 0.2) { open = mix(0.25, 0.7, random()); sag = (random() - 0.5) * 0.12; }
      if (a.story === 'emptied' && r < 0.7) { open = mix(0.6, 2.2, random()); sag = (random() - 0.3) * 0.15; }
      if (a.story !== 'kept' && r > 1 - mood.wear * 0.18) { open = mix(0.15, 0.5, random()); }
      return { open, sag, missing, stuffed: false, i };
    });
    if (a.story === 'pried') { doors[(special + 3) % count].open = 0.6; doors[(special + 3) % count].sag = 0.08; }
    if (a.story === 'hanging') {
      const h = (special + 2) % count, m = (special + 5) % count;
      doors[h].open = 1.2; doors[h].sag = -0.75;
      if (m !== named) doors[m].missing = true; else doors[(m + 1) % count].missing = true;
    }
    doors[special].open = 0; doors[special].missing = false;
    doors[named].open = Math.min(doors[named].open, 0.2); doors[named].missing = false;
    while (newcomer === named || newcomer === special) newcomer = (newcomer + 1) % count;
    const stuffRate = mix(0, 0.95, a.overflow) * mix(0.8, 1.15, mood.density);
    for (const d of doors) d.stuffed = !d.missing && d.open < 0.3 && random() < stuffRate;
    if (a.overflow > 0.15 && !doors.some((d) => d.stuffed)) doors[(special + 1) % count].stuffed = true;

    // One atlas for every door face: number, slot, peep holes, lock, rust.
    const cw = 160, ch = 136;
    const canvas = document.createElement('canvas');
    canvas.width = cols * cw; canvas.height = rows * ch;
    const g = canvas.getContext('2d')!;
    const surnames = ['Nováková', 'Kowalska', 'Petrova', 'Horváth', 'Ionescu', 'Dvořák', 'Wiśniewska', 'Stoica'];
    const firsts = ['Tomek', 'Ania', 'Mira', 'Pavel', 'Ilona', 'Dan', 'Vera', 'Jurek'];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    for (const d of doors) {
      const cx = (d.i % cols) * cw, cy = Math.floor(d.i / cols) * ch;
      const base = (a.story === 'newcomer' && d.i === newcomer ? fresh : paint).clone();
      base.offsetHSL(0, 0, (random() - 0.5) * 0.05);
      g.save();
      g.translate(cx, cy);
      g.beginPath(); g.rect(0, 0, cw, ch); g.clip();
      g.fillStyle = `#${base.getHexString()}`;
      g.fillRect(0, 0, cw, ch);
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 3; g.strokeRect(5, 5, cw - 10, ch - 10);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.strokeRect(7, 7, cw - 11, ch - 11);
      // Letter slot.
      g.fillStyle = '#14171a'; g.fillRect(22, 16, cw - 44, 12);
      // Row of peep holes to see whether anything waits inside.
      for (let h = 0; h < 5; h++) { g.beginPath(); g.arc(34 + h * 23, ch - 22, 6, 0, Math.PI * 2); g.fill(); }
      // Lock.
      g.fillStyle = '#c9cdd0'; g.beginPath(); g.arc(cw - 24, 62, 8, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#22262a'; g.fillRect(cw - 26, 57, 4, 10);
      const number = String(start + d.i);
      const fresher = a.story === 'newcomer' && d.i === newcomer;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.translate(64, 66);
      const faded = a.numbering === 'ghost' && !fresher && random() < 0.55;
      if (a.numbering === 'stencil') { g.fillStyle = '#15181b'; g.font = 'bold 50px monospace'; g.fillText(number, 0, 0); g.fillStyle = `#${base.getHexString()}`; g.fillRect(-50, -2, 100, 4); }
      else if (a.numbering === 'enamel') {
        g.fillStyle = '#f6f4ec'; g.beginPath(); g.ellipse(0, 0, 44, 28, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#27458f'; g.lineWidth = 4; g.stroke();
        g.fillStyle = '#27458f'; g.font = 'bold 36px serif'; g.fillText(number, 0, 2);
      } else if (a.numbering === 'brush') {
        g.rotate((random() - 0.5) * 0.3); g.fillStyle = '#f3f0e6'; g.font = `italic bold ${44 + Math.floor(random() * 14)}px serif`; g.fillText(number, (random() - 0.5) * 12, (random() - 0.5) * 8);
      } else if (a.numbering === 'tape') {
        g.rotate((random() - 0.5) * 0.25); g.fillStyle = '#e6d9ae'; g.fillRect(-42, -22, 84, 44);
        g.fillStyle = '#1b1b24'; g.font = 'bold 36px sans-serif'; g.fillText(number, 0, 2);
      } else if (a.numbering === 'stamped') {
        g.font = 'bold 50px sans-serif'; g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillText(number, 2, 2); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillText(number, -1, -1);
      } else {
        g.font = 'bold 50px monospace'; g.fillStyle = faded ? 'rgba(20,20,20,0.12)' : 'rgba(20,20,20,0.8)';
        g.fillText(number, 0, 0);
        if (!faded) { g.fillStyle = `#${base.getHexString()}`; for (let k = 0; k < 5; k++) g.fillRect(-50 + random() * 90, -28 + random() * 50, 18, 5); }
      }
      g.setTransform(1, 0, 0, 1, cx, cy);
      if (a.name !== 'none' && d.i === named) {
        g.translate(cw / 2 - 8, ch - 50); g.rotate((random() - 0.5) * 0.12);
        g.fillStyle = a.name === 'couple' ? '#e6d9ae' : a.name === 'widow' ? '#efe3b4' : '#f4f2ea';
        g.fillRect(-62, -19, 124, 38);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        if (a.name === 'widow') { g.fillStyle = '#2742a6'; g.font = 'italic 25px serif'; g.fillText(pick(surnames), 0, 1, 116); }
        else if (a.name === 'family') { g.fillStyle = '#111'; g.font = 'bold 23px sans-serif'; g.fillText(`${pick(surnames).toUpperCase()} ${2 + Math.floor(random() * 4)}x`, 0, 1, 116); }
        else if (a.name === 'couple') { g.fillStyle = '#b02a2a'; g.font = 'italic bold 22px sans-serif'; g.fillText(`${pick(firsts)} + ${pick(firsts)}`, 0, 1, 116); }
        else {
          g.fillStyle = '#555'; g.font = 'italic 17px serif'; g.fillText(pick(surnames), 0, -9, 110);
          g.strokeStyle = '#333'; g.lineWidth = 2; g.beginPath(); g.moveTo(-50, -8); g.lineTo(50, -10); g.stroke();
          g.fillStyle = '#1a2f8a'; g.font = 'italic bold 17px serif'; g.fillText(pick(surnames), 0, 9, 110);
        }
        g.setTransform(1, 0, 0, 1, cx, cy);
      }
      // Rust and chips grow with wear.
      if (!fresher) for (let k = 0; k < mood.wear * 16; k++) {
        g.fillStyle = `rgba(${110 + random() * 50},${50 + random() * 30},25,${0.25 + random() * 0.45})`;
        const edge = random() < 0.6;
        g.beginPath(); g.ellipse(edge ? (random() < 0.5 ? 6 : cw - 6) + (random() - 0.5) * 14 : random() * cw, edge ? random() * ch : ch - random() * 20, 3 + random() * 9, 2 + random() * 6, random() * 3, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
    const atlas = new THREE.CanvasTexture(canvas);
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.anisotropy = 4;
    const metal = a.paint === 'steel';
    const face = new THREE.MeshStandardMaterial({ map: atlas, roughness: metal ? 0.4 : 0.55, metalness: metal ? 0.5 : 0.1 });
    const shell = s.material(paint.clone().multiplyScalar(0.8), { roughness: 0.55, metalness: metal ? 0.5 : 0.1 });
    const dark = s.material('#15181a', { roughness: 0.9 });

    // Carcass.
    s.box([bankW, bankH, depth], [0, bankY, depth / 2], shell);
    s.box([bankW + 0.03, 0.02, depth + 0.02], [0, bankY + bankH / 2 + 0.01, depth / 2 + 0.005], shell);

    const front = depth + 0.001;
    const doorGeo = new THREE.BoxGeometry(bw, bh, 0.006);
    const flyerPoints: { x: number; y: number }[] = [];
    let specialAt = { x: 0, y: 0 };
    for (const d of doors) {
      const c = d.i % cols, r = Math.floor(d.i / cols);
      const x = (c - (cols - 1) / 2) * (bw + gap), y = bankY + ((rows - 1) / 2 - r) * (bh + gap);
      if (d.i === special) specialAt = { x, y };
      s.box([bw - 0.004, bh - 0.004, 0.002], [x, y, front], dark);
      if (d.missing) {
        if (random() < 0.6) s.box([0.13, 0.002, 0.08], [x, y - bh / 2 + 0.02, depth - 0.03], s.material('#e8e4d6')).rotation.z = 0.2;
        continue;
      }
      const hinge = new THREE.Group();
      hinge.position.set(x - bw / 2, y, front + 0.002);
      hinge.rotation.set(0, -d.open, d.sag);
      const plane = new THREE.PlaneGeometry(bw, bh);
      const uv = plane.attributes.uv as THREE.BufferAttribute;
      const u0 = c / cols, u1 = (c + 1) / cols, v1 = 1 - r / rows, v0 = 1 - (r + 1) / rows;
      uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
      const panel = new THREE.Mesh(doorGeo, shell);
      panel.position.set(bw / 2, 0, 0.003);
      const skin = new THREE.Mesh(plane, face);
      skin.position.set(bw / 2, 0, 0.0065);
      panel.castShadow = skin.receiveShadow = true;
      hinge.add(panel, skin);
      s.root.add(hinge);
      if (d.stuffed) flyerPoints.push({ x, y });
    }

    // Junk mail fanned out of the slots, and what fell on the floor.
    const flyerMat = (colour: string) => s.material(new THREE.Color(colour).lerp(new THREE.Color('#bdb8a8'), (1 - mood.cheer) * 0.45), { roughness: 0.9, side: THREE.DoubleSide });
    const mats = FLYERS.map(flyerMat);
    for (const p of flyerPoints) {
      const n = 1 + Math.floor(random() * 3);
      for (let k = 0; k < n; k++) {
        const w = 0.09 + random() * 0.06, len = 0.07 + random() * 0.07;
        const f = s.box([w, 0.003, len], [p.x + (random() - 0.5) * 0.04, p.y + bh / 2 - 0.028 - k * 0.003, front + len * 0.33], pick(mats));
        f.rotation.set(0.35 + random() * 0.75, 0, (random() - 0.5) * 0.3);
      }
    }
    const fallen = Math.round(flyerPoints.length * mix(0.2, 0.9, mood.density) * random() * 1.6);
    for (let k = 0; k < fallen; k++) {
      const f = s.box([0.15, 0.003, 0.21], [(random() - 0.5) * bankW, 0.003 + k * 0.0015, 0.08 + random() * 0.2], pick(mats));
      f.rotation.y = random() * 3;
    }

    // The one slot with something particular in it.
    const sx = specialAt.x, sy = specialAt.y + bh / 2 - 0.028, sz = front + 0.01;
    if (a.sticking === 'newspaper') {
      const roll = s.cylinder(0.022, 0.022, 0.3, [sx - 0.01, sy + 0.02, sz + 0.07], s.material('#d9d6c8', { roughness: 0.95 }), 12);
      roll.rotation.set(Math.PI / 2 - 0.45, 0, 0.2);
      const band = s.cylinder(0.0235, 0.0235, 0.04, [sx - 0.01, sy + 0.035, sz + 0.1], s.material('#3a3a3a'), 12);
      band.rotation.copy(roll.rotation);
    } else if (a.sticking === 'bill') {
      const e = s.box([0.17, 0.004, 0.11], [sx, sy + 0.012, sz + 0.035], s.material('#f6f5ef'));
      e.rotation.set(0.5, 0, -0.1);
      const stripe = s.box([0.17, 0.0045, 0.022], [sx, sy - 0.004, sz + 0.064], s.material('#d02a2a', { emissive: '#d02a2a', emissiveIntensity: 0.2 }));
      stripe.rotation.copy(e.rotation);
    } else if (a.sticking === 'flower') {
      s.rod([sx, sy, sz - 0.01], [sx + 0.03, sy + 0.1, sz + 0.13], 0.004, s.material('#3f7a3c'));
      s.ball([0.03, 0.026, 0.03], [sx + 0.03, sy + 0.105, sz + 0.14], s.material('#d3202e', { emissive: '#d3202e', emissiveIntensity: 0.15 }), 10);
      s.ball([0.022, 0.006, 0.01], [sx + 0.02, sy + 0.05, sz + 0.075], s.material('#3f7a3c'), 8).rotation.z = 0.6;
    } else if (a.sticking === 'key') {
      s.rod([sx - 0.012, sy, sz], [sx, sy - 0.1, sz + 0.004], 0.0015, s.material('#d8cfae'));
      s.rod([sx + 0.012, sy, sz], [sx, sy - 0.1, sz + 0.004], 0.0015, s.material('#d8cfae'));
      const brass = s.material('#c9a44a', { metalness: 0.8, roughness: 0.3 });
      s.ring(0.012, 0.003, [sx, sy - 0.112, sz + 0.004], brass);
      s.box([0.006, 0.05, 0.003], [sx, sy - 0.148, sz + 0.004], brass);
      s.box([0.012, 0.006, 0.003], [sx + 0.006, sy - 0.165, sz + 0.004], brass);
    } else if (a.sticking === 'postcard') {
      const card = s.box([0.15, 0.003, 0.105], [sx, sy + 0.01, sz + 0.03], s.material('#f2efe4'));
      card.rotation.set(0.75, 0, 0.12);
      const sea = s.box([0.14, 0.0035, 0.05], [sx + 0.002, sy - 0.005, sz + 0.05], s.material('#27a7d8', { emissive: '#27a7d8', emissiveIntensity: 0.25 }));
      sea.rotation.copy(card.rotation);
      const sun = s.box([0.03, 0.004, 0.03], [sx + 0.04, sy - 0.003, sz + 0.048], s.material('#ffcf3a', { emissive: '#ffcf3a', emissiveIntensity: 0.3 }));
      sun.rotation.copy(card.rotation);
    }

    return s.finish();
  },
});
