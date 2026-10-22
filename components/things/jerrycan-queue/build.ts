import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
const NAMES = { none: '', mama: 'MAMA TOLU', bayo: 'BAYO', number: 'NO 14', ibeji: 'IYA IBEJI', mine: 'NOT 4 SALE' } as const;

function lettering(text: string, w: number, h: number, ink: string, paper: string, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = Math.max(32, Math.round((256 * h) / w));
  const c = canvas.getContext('2d')!;
  c.fillStyle = paper;
  c.fillRect(0, 0, canvas.width, canvas.height);
  const words = text.split(' ');
  const lines = words.length > 1 && canvas.height > 100 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [text];
  const longest = Math.max(...lines.map((line) => line.length));
  c.font = `900 ${Math.min((canvas.height / lines.length) * 0.7, (256 / longest) * 1.45)}px "Comic Sans MS", "Arial Black", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = ink;
  lines.forEach((line, index) => {
    c.save();
    c.translate(128, (canvas.height * (index + 0.5)) / lines.length);
    c.rotate((random() - 0.5) * 0.16);
    c.fillText(line, 0, 0, 236);
    c.restore();
  });
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.7 });
}

export default defineThing({
  questions: {
    length: score('How long is the line?', ['Three cans', 'Half a dozen', 'A dozen', 'Twenty and still growing, curling round the corner']),
    colours: choice('What colours are the cans?', {
      yellow: 'All yellow cooking-oil kegs, a single bright stripe.',
      mixed: 'Yellow and blue alternating by chance.',
      motley: 'Every colour going: yellow, blue, white, green, black, one red.',
      faded: 'Sun-bleached pale yellow and chalky blue, years in service.',
    }),
    others: choice('What else is standing in for people?', {
      only: 'Only jerrycans.',
      buckets: 'A few paint buckets and a basin among the cans.',
      anything: 'Anything will do: a stone, a single slipper, a broken block holding places too.',
    }),
    tied: score('How many are tied together with cord?', ['None, each on its own', 'One pair', 'Family strings of three and four', 'Almost the whole line roped handle to handle']),
    upset: choice('What has disturbed the line?', {
      nothing: 'Nothing: it stands as it was left.',
      knocked: 'One can has been knocked over and lies on its side.',
      gap: 'One is gone: a gap and a damp ring where it stood.',
      jumper: 'One has been pushed in sideways near the front, jumping the queue.',
    }),
    name: choice('If a name is scratched on one, what does it say?', {
      none: 'No names, everyone knows their own.',
      mama: 'MAMA TOLU.',
      bayo: 'BAYO.',
      number: 'NO 14, a house number.',
      ibeji: 'IYA IBEJI, mother of twins.',
      mine: 'NOT 4 SALE.',
    }),
    waiting: choice('What is the line waiting at?', {
      dry: 'A public standpipe with nothing coming out.',
      trickle: 'A standpipe giving a thin trickle into the first can.',
      hose: 'The end of a hose lying on the ground from a tanker that has not come.',
      kerosene: 'A drum with a hand pump and a price board.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // One jerrycan shape, reused.
    const shape = new THREE.Shape();
    ([[-0.115, 0.012], [0.115, 0.012], [0.125, 0.03], [0.125, 0.3], [0.07, 0.385], [0.02, 0.385], [0.01, 0.37], [-0.115, 0.37], [-0.125, 0.35], [-0.125, 0.03]] as const).forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    const handle = new THREE.Path();
    ([[-0.095, 0.285], [-0.005, 0.285], [0.005, 0.338], [-0.095, 0.338]] as const).forEach(([x, y], i) => (i ? handle.lineTo(x, y) : handle.moveTo(x, y)));
    shape.holes.push(handle);
    const canGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
    canGeometry.translate(0, 0, -0.065);
    const palettes = {
      yellow: ['#ecc21a', '#e6b818', '#f0cc30'],
      mixed: ['#ecc21a', '#2458c0', '#e6b818', '#2f66cc'],
      motley: ['#ecc21a', '#2458c0', '#f0efe8', '#2c8a56', '#222226', '#c8322a', '#e6b818'],
      faded: ['#e2cc62', '#6f94c8', '#dcc050', '#84a4cc'],
    }[a.colours];
    const mats = new Map<string, THREE.MeshStandardMaterial>();
    const plastic = (colour: string) => mats.get(colour) ?? (mats.set(colour, s.material(colour, { roughness: 0.45 })), mats.get(colour)!);
    const capMat = s.material('#1e1e20'), capRed = s.material('#c8322a');
    const grime = s.material('#6a5a44', { roughness: 1 });

    const count = Math.round(mix(3, 20, a.length));
    // The line runs back from the tap and curls toward the viewer.
    let x = 0.55, z = 0, heading = Math.PI;
    const spots: { at: P; turn: number }[] = [];
    const bend = count > 7 ? 1 / mix(3.2, 2.0, a.length) : 0.04;
    for (let i = 0; i < count; i++) {
      const step = 0.36 + random() * 0.07;
      x += Math.cos(heading) * step;
      z += Math.sin(heading) * step;
      spots.push({ at: [x + (random() - 0.5) * 0.05, 0, z + (random() - 0.5) * 0.06], turn: -heading + Math.PI / 2 + (random() - 0.5) * 0.5 });
      heading -= step * bend * (0.7 + random() * 0.6);
    }
    const upsetIndex = count < 3 ? -1 : a.upset === 'jumper' ? 1 : Math.min(count - 1, 1 + Math.floor(random() * (count - 1)));
    const nameIndex = Math.min(count - 1, upsetIndex === 0 ? 1 : 0 + (count > 4 ? Math.floor(random() * 3) : 0));
    const handles: (THREE.Vector3 | null)[] = [];
    const otherChance = a.others === 'only' ? 0 : a.others === 'buckets' ? 0.22 : 0.32;

    spots.forEach((spot, index) => {
      const [sx, , sz] = spot.at;
      if (a.upset === 'gap' && index === upsetIndex) {
        const ring = s.ring(0.11, 0.035, [sx, 0.003, sz], s.material('#5e584c', { roughness: 0.3 }));
        ring.rotation.x = Math.PI / 2;
        ring.scale.z = 0.05;
        handles.push(null);
        return;
      }
      const special = index === nameIndex || index === upsetIndex;
      if (!special && index > 0 && random() < otherChance) {
        handles.push(null);
        const kind = a.others === 'anything' ? pick(['stone', 'slipper', 'block', 'bucket']) : pick(['bucket', 'bucket', 'basin']);
        if (kind === 'bucket') {
          const colour = pick(['#f0efe8', '#c8322a', '#2458c0', '#2c8a56']);
          s.mesh(new THREE.CylinderGeometry(0.13, 0.105, 0.26, 14, 1, true), s.material(colour, { side: THREE.DoubleSide, roughness: 0.5 }), [sx, 0.13, sz]);
          s.cylinder(0.105, 0.105, 0.01, [sx, 0.008, sz], s.material(colour), 14);
          s.ring(0.13, 0.006, [sx, 0.27, sz], s.material('#8a8f92', { metalness: 0.6 }), Math.PI).rotation.y = random() * 3;
        } else if (kind === 'basin') {
          s.lathe([[0, 0], [0.13, 0], [0.22, 0.12], [0.235, 0.12], [0.14, 0.012], [0, 0.012]], s.material(pick(['#c8322a', '#2458c0', '#e87a20']), { side: THREE.DoubleSide, roughness: 0.5 }), [sx, 0, sz]);
        } else if (kind === 'stone') {
          const stone = s.mesh(new THREE.DodecahedronGeometry(0.09, 0), s.material('#8a857a'), [sx, 0.06, sz]);
          stone.scale.set(1.2, 0.7, 1);
          stone.rotation.y = random() * 3;
        } else if (kind === 'slipper') {
          const slipper = s.box([0.1, 0.022, 0.25], [sx, 0.011, sz], s.material(pick(['#2458c0', '#c8322a', '#2c8a56'])));
          slipper.rotation.y = spot.turn + 1.3;
          s.ring(0.04, 0.006, [sx, 0.03, sz], s.material('#f0efe8'), Math.PI).rotation.y = spot.turn + 1.3;
        } else {
          const block = s.box([0.4, 0.2, 0.15], [sx, 0.1, sz], s.material('#a39f94'));
          block.rotation.y = spot.turn + 0.3;
        }
        return;
      }
      const scale = 1.15 * (special ? 1 : random() < 0.2 ? 0.74 : random() < 0.15 ? 1.12 : 1);
      const colour = pick(palettes);
      const can = new THREE.Group();
      const body = new THREE.Mesh(canGeometry, plastic(colour));
      body.castShadow = body.receiveShadow = true;
      can.add(body);
      const capOn = random() > 0.2 + mood.wear * 0.25;
      if (capOn) can.add(s.cylinder(0.026, 0.026, 0.035, [0.045, 0.4, 0], random() > 0.75 ? capRed : capMat, 10));
      else can.add(s.cylinder(0.02, 0.02, 0.02, [0.045, 0.392, 0], s.material('#101012'), 10));
      // Moulded cross on the big faces, grime at the foot.
      for (const side of [-1, 1]) {
        can.add(s.box([0.15, 0.012, 0.004], [0, 0.17, side * 0.078], plastic(colour)));
        can.add(s.box([0.012, 0.15, 0.004], [0, 0.17, side * 0.078], plastic(colour)));
      }
      if (mood.wear > 0.3) can.add(s.box([0.252, 0.03 + mood.wear * 0.06, 0.158], [0, 0.03 + mood.wear * 0.02, 0], grime));
      if (index === nameIndex && a.name !== 'none') {
        const dark = colour === '#222226' || colour === '#2458c0' || colour === '#2f66cc';
        const tag = s.mesh(new THREE.PlaneGeometry(0.21, 0.19), lettering(NAMES[a.name], 0.21, 0.19, dark ? '#f4f0e0' : '#1c1c1e', colour, random), [0, 0.16, 0.081]);
        can.add(tag);
        const back = tag.clone();
        back.position.z = -0.081;
        back.rotation.y = Math.PI;
        can.add(back);
      } else if (random() < 0.3) {
        // Owners' marks: a paint dab or a knotted rag.
        if (random() > 0.5) can.add(s.ball([0.04, 0.04, 0.004], [-0.04, 0.23, 0.079], s.material(pick(['#c8322a', '#f0efe8', '#2c8a56', '#e87a20'])), 8));
        else can.add(s.ball([0.03, 0.045, 0.03], [-0.045, 0.3, 0.02], s.material(pick(['#c8322a', '#d86a9a', '#f0efe8', '#3a8a8a'])), 6));
      }
      can.scale.setScalar(scale);
      can.position.set(sx, 0, sz);
      can.rotation.y = spot.turn;
      let tieable = true;
      if (a.upset === 'knocked' && index === upsetIndex) {
        can.rotation.set(Math.PI / 2, 0, spot.turn + 0.6);
        can.position.set(sx + 0.12, 0.078 * scale, sz + 0.28);
        tieable = false;
      }
      if (a.upset === 'jumper' && index === upsetIndex) {
        can.position.set(sx + 0.05, 0, sz + 0.34);
        can.rotation.y = spot.turn + 0.9;
        tieable = false;
      }
      s.root.add(can);
      can.updateMatrixWorld(true);
      handles.push(tieable ? can.localToWorld(new THREE.Vector3(-0.045, 0.345, 0)) : null);
    });

    // Cord from handle to handle.
    const cord = s.material(pick(['#c8322a', '#1e1e20', '#f4f0e0', '#2c8a56']));
    let run: THREE.Vector3[] = [];
    const flush = () => {
      if (run.length > 1) {
        const points: P[] = [];
        run.forEach((point, i) => {
          if (i) { const prev = run[i - 1]; points.push([(prev.x + point.x) / 2, Math.min(prev.y, point.y) - 0.04 - random() * 0.04, (prev.z + point.z) / 2]); }
          points.push([point.x, point.y, point.z]);
        });
        s.tube(points, 0.011, cord);
        for (const point of run) s.ball([0.016, 0.016, 0.016], [point.x, point.y, point.z], cord, 6);
      }
      run = [];
    };
    const maxRun = a.tied > 0.85 ? 99 : a.tied > 0.5 ? 4 : 2;
    const tieChance = a.tied < 0.12 ? 0 : mix(0.25, 1, a.tied);
    let pairs = a.tied < 0.12 ? 0 : a.tied < 0.4 ? 1 : 99;
    handles.forEach((point) => {
      if (!point) return flush();
      if (run.length === 0) { if (pairs > 0 && random() < tieChance) run.push(point); return; }
      run.push(point);
      if (run.length >= maxRun || random() > tieChance + 0.35) { pairs--; flush(); }
    });
    flush();

    // What they are waiting at.
    const metal = s.material('#7d8386', { metalness: 0.6, roughness: 0.5 });
    const tx = 0.62;
    if (a.waiting === 'dry' || a.waiting === 'trickle') {
      s.box([0.7, 0.07, 0.6], [tx - 0.2, 0.035, 0], s.material('#a39f94'));
      s.box([0.2, 0.9, 0.2], [tx + 0.05, 0.45, 0], s.material('#b3afa2'));
      s.rod([tx + 0.05, 0.8, 0], [tx - 0.2, 0.8, 0], 0.022, metal);
      s.rod([tx - 0.2, 0.8, 0], [tx - 0.24, 0.72, 0], 0.02, metal);
      s.box([0.03, 0.02, 0.1], [tx - 0.14, 0.835, 0], s.material('#c8322a'));
      const wet = s.material('#6a8a9a', { roughness: 0.1 });
      if (a.waiting === 'trickle') {
        s.rod([tx - 0.24, 0.71, 0], [tx - 0.25, 0.4, 0], 0.006, s.material('#bfe0f0', { roughness: 0.1, emissive: '#bfe0f0', emissiveIntensity: 0.3 }));
        const puddle = s.cylinder(0.42, 0.42, 0.004, [tx - 0.3, 0.073, 0.05], wet, 18);
        puddle.scale.z = 0.6;
        const run2 = s.cylinder(0.3, 0.3, 0.004, [tx - 0.1, 0.002, 0.5], wet, 14);
        run2.scale.x = 0.5;
      } else {
        s.ring(0.12, 0.02, [tx - 0.25, 0.072, 0], s.material('#8a8274'), Math.PI * 2).rotation.x = Math.PI / 2;
      }
    }
    if (a.waiting === 'hose') {
      s.tube([[tx - 0.25, 0.03, 0.02], [tx + 0.1, 0.02, 0.1], [tx + 0.5, 0.02, -0.15], [tx + 0.9, 0.02, 0.1], [tx + 1.3, 0.02, -0.05]], 0.022, s.material('#2c8a56'));
      s.cylinder(0.026, 0.026, 0.05, [tx - 0.26, 0.03, 0.02], metal, 8).rotation.z = Math.PI / 2;
      const dust = s.cylinder(0.25, 0.25, 0.003, [tx - 0.35, 0.002, 0.02], s.material('#7a7264'), 12);
      dust.scale.z = 0.6;
    }
    if (a.waiting === 'kerosene') {
      const drum = s.material(pick(['#2458c0', '#2c8a56', '#8a4e2c']), { metalness: 0.3 });
      s.cylinder(0.29, 0.29, 0.88, [tx + 0.1, 0.44, 0], drum, 20);
      for (const y of [0.3, 0.6]) s.ring(0.295, 0.012, [tx + 0.1, y, 0], drum).rotation.x = Math.PI / 2;
      s.rod([tx + 0.2, 0.88, 0], [tx + 0.2, 1.25, 0], 0.025, metal);
      s.rod([tx + 0.2, 1.2, 0], [tx - 0.15, 1.1, 0], 0.016, metal);
      s.rod([tx - 0.15, 1.1, 0], [tx - 0.2, 0.75, 0], 0.014, s.material('#1e1e20'));
      s.rod([tx + 0.2, 1.25, 0], [tx + 0.38, 1.38, 0.1], 0.012, metal);
      const board = s.mesh(new THREE.PlaneGeometry(0.5, 0.34), lettering(mood.cheer > 0.45 ? 'KERO DEY' : 'NO KERO', 0.5, 0.34, '#b3261e', '#f0e6c0', random), [tx + 0.1, 0.5, 0.31]);
      board.rotation.x = -0.12;
      const stain = s.cylinder(0.5, 0.5, 0.003, [tx - 0.05, 0.002, 0.05], s.material('#3a3630', { roughness: 0.3 }), 16);
      stain.scale.z = 0.8;
    }
    // Footprints of the people who are not here.
    const prints = Math.round(mood.density * 10);
    for (let i = 0; i < prints; i++) {
      const spot = spots[Math.floor(random() * spots.length)];
      const print = s.cylinder(0.04, 0.04, 0.003, [spot.at[0] + (random() - 0.5) * 0.3, 0.002, spot.at[2] + 0.4 + random() * 0.4], s.material('#77705f'), 8);
      print.scale.set(0.8, 1, 2.2);
      print.rotation.y = random() * 3;
      print.castShadow = false;
    }
    return s.finish();
  },
});
