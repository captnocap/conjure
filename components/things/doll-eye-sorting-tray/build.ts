import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PALETTES = {
  blues: ['#2f6fd0', '#4f93e0', '#1f4fa0', '#7fb4e8'],
  browns: ['#6b3d1c', '#8a5626', '#4a2a14', '#a8702e'],
  greens: ['#5f8f6a', '#7c9a8a', '#8a9aa2', '#4f7a4a'],
  mixed: ['#2f6fd0', '#6b3d1c', '#5f8f6a', '#8a9aa2', '#7a4fc8'],
  amber: ['#d8962a', '#c2701c', '#e0b23c', '#a85a18'],
} as const;

export default defineThing({
  questions: {
    colours: choice('What colour are the irises?', {
      blues: 'Every shade of blue, from pale sky to deep paperweight cobalt.',
      browns: 'Browns and hazels, warm and ordinary.',
      greens: 'Grey-greens and cool greys.',
      mixed: 'Every colour, one colour to each row of compartments.',
      amber: 'Amber and orange animal eyes meant for teddy bears.',
      'one-odd': 'All brown except a single blood-red eye that does not belong.',
    }),
    order: choice('How well sorted are they?', {
      strict: 'Perfectly graded: each compartment holds one size in neat rows.',
      loose: 'Roughly sorted, eyes heaped and rolled into the wrong compartments.',
      spilled: 'The tray has been knocked: eyes have rolled out across the bench in a spreading trail.',
      picked: 'Picked over until nearly empty, a few strays left in each compartment.',
    }),
    type: choice('What kind of eyes are they?', {
      flat: 'Flat-backed domes that sit steady, all looking straight up.',
      blown: 'Hollow blown glass spheres that roll and stare in every direction.',
      rockers: 'Matched pairs joined on wire rockers with small lead weights, laid out two by two.',
    }),
    size: score('How big are the eyes?', ['Seed-small, for miniature dolls', 'Ordinary doll sizes', 'Large and lifelike, nearly human']),
    tray: choice('What is the tray like?', {
      oak: 'Pale oak with green baize in each compartment.',
      mahogany: 'Dark red mahogany lined with wine-black velvet.',
      card: 'A grey cardboard box with thin card dividers, a supplier\'s stock box.',
      tin: 'A dented japanned tin tray, black with gold lines.',
    }),
    pad: noul('Is one pair singled out on a velvet pad in front of the tray?'),
    label: choice('What does the label card say?', {
      grade: 'BLUE No. 6',
      pairs: 'PAIRS ONLY',
      odd: 'ODDS - DO NOT USE',
      french: 'YEUX DE POUPEE',
      seen: 'SOLD AS SEEN',
      none: 'There is no label card.',
    }),
    tool: choice('What are the tools doing?', {
      resting: 'Tweezers and loupe laid down beside the tray, work paused.',
      holding: 'The tweezers are propped up, pinching a single eye above the tray.',
      away: 'Only the loupe is left; the tweezers are gone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const cols = 4, rows = 3, cw = 0.072, cd = 0.07, wall = 0.005, depth = 0.02;
    const W = cols * cw + wall, D = rows * cd + wall;
    const wood = { oak: '#c69a5e', mahogany: '#6e2f22', card: '#9a9a94', tin: '#1d1d20' }[a.tray];
    const lining = { oak: '#3f6b4a', mahogany: '#3a1620', card: '#7d776b', tin: '#2a2a2e' }[a.tray];
    const t = new Sculpture(context);
    const tilt = 0.2;
    t.root.rotation.x = tilt;
    t.root.position.y = Math.sin(tilt) * D / 2;
    s.root.add(t.root);
    t.root.updateMatrix();
    const frame = s.material(wood, { roughness: a.tray === 'tin' ? 0.3 : 0.7, metalness: a.tray === 'tin' ? 0.6 : 0 });
    const bed = s.material(lining, { roughness: 1 });
    const thin = a.tray === 'card' || a.tray === 'tin' ? 0.0022 : wall;
    t.box([W, 0.006, D], [0, 0.003, 0], frame);
    t.box([W - wall, 0.002, D - wall], [0, 0.007, 0], bed);
    for (const side of [-1, 1]) {
      t.box([W, depth, wall], [0, depth / 2, side * (D - wall) / 2], frame);
      t.box([wall, depth, D], [side * (W - wall) / 2, depth / 2, 0], frame);
    }
    for (let c = 1; c < cols; c++) t.box([thin, depth * 0.85, D - wall], [-W / 2 + wall / 2 + c * cw, depth * 0.425, 0], frame);
    for (let r = 1; r < rows; r++) t.box([W - wall, depth * 0.85, thin], [0, depth * 0.425, -D / 2 + wall / 2 + r * cd], frame);
    if (a.tray === 'tin') for (const side of [-1, 1]) t.box([W * 0.9, 0.0012, 0.0012], [0, depth + 0.0003, side * (D - wall) / 2], s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 }));

    const block = s.box([W * 0.7, Math.sin(tilt) * D * 0.86, 0.03], [0, Math.sin(tilt) * D * 0.43, -D / 2 + 0.03], s.material('#5a4636'));
    block.rotation.y = (random() - 0.5) * 0.1;
    // Eyes: three instanced layers (white, iris, pupil) share one set of placements.
    type Eye = { p: THREE.Vector3; q: THREE.Quaternion; r: number; colour: THREE.Color; loose?: boolean };
    const eyes: Eye[] = [];
    const bars: { p: THREE.Vector3; yaw: number; r: number }[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const paletteFor = (row: number) => {
      if (a.colours === 'mixed') return [PALETTES.mixed[row % 5], PALETTES.mixed[(row + 3) % 5]];
      if (a.colours === 'one-odd') return [...PALETTES.browns];
      return [...PALETTES[a.colours]];
    };
    const tilted = (amount: number) => {
      const axis = new THREE.Vector3(random() - 0.5, 0, random() - 0.5).normalize();
      return new THREE.Quaternion().setFromAxisAngle(axis, amount * random());
    };
    const wobble = a.type === 'flat' ? 0.12 : a.type === 'rockers' ? 0.2 : 1.1;
    const lift = (r: number) => (a.type === 'flat' ? 0 : r);
    const dull = new THREE.Color('#9a968c');
    const pick = (row: number, c: number) => {
      const palette = paletteFor(row);
      const base = new THREE.Color(a.order === 'strict' || a.colours === 'mixed' ? palette[c % palette.length] : palette[Math.floor(random() * palette.length)]);
      if (random() < wear * 0.35) base.lerp(dull, 0.7);
      return base;
    };
    const fillBase = { strict: 1, loose: 0.85, spilled: 0.5, picked: 0.16 }[a.order] * mix(0.6, 1, mood.density);
    const sizeScale = mix(0.75, 1.3, a.size);
    for (let row = 0; row < rows; row++) {
      for (let c = 0; c < cols; c++) {
        const r = (0.0065 + c * 0.002) * sizeScale;
        const cx = -W / 2 + wall / 2 + (c + 0.5) * cw, cz = -D / 2 + wall / 2 + (row + 0.5) * cd;
        const pairWidth = a.type === 'rockers' ? r * 4.9 : r * 2.25;
        const nx = Math.max(1, Math.floor((cw - wall - 0.004) / pairWidth));
        const nz = Math.max(1, Math.floor((cd - wall - 0.004) / (a.type === 'rockers' ? r * 3.6 : r * 2.25)));
        const emptied = a.order === 'picked' ? random() < 0.25 : random() < wear * 0.12;
        if (emptied) continue;
        for (let ix = 0; ix < nx; ix++) {
          for (let iz = 0; iz < nz; iz++) {
            if (random() > fillBase) continue;
            const messy = a.order === 'strict' ? 0.08 : 0.6;
            const rr = a.order === 'strict' ? r : r * mix(0.8, 1.25, random());
            const x = cx + ((ix + 0.5) / nx - 0.5) * (cw - wall - 0.004) + (random() - 0.5) * pairWidth * messy * 0.5;
            const z = cz + ((iz + 0.5) / nz - 0.5) * (cd - wall - 0.004) + (random() - 0.5) * r * 2 * messy;
            const colour = pick(a.order === 'loose' && random() < 0.2 ? Math.floor(random() * rows) : row, c);
            if (a.type === 'rockers') {
              const yaw = (random() - 0.5) * (a.order === 'strict' ? 0.15 : 1.2);
              for (const side of [-1, 1]) {
                eyes.push({ p: new THREE.Vector3(x + Math.cos(yaw) * side * rr * 1.25, 0.008 + rr, z - Math.sin(yaw) * side * rr * 1.25), q: tilted(wobble), r: rr, colour });
              }
              bars.push({ p: new THREE.Vector3(x, 0.008 + rr * 0.6, z), yaw, r: rr });
            } else {
              eyes.push({ p: new THREE.Vector3(x, 0.008 + lift(rr), z), q: tilted(wobble), r: rr, colour });
            }
          }
        }
      }
    }
    // Spilled eyes roll out over one corner and across the bench.
    if (a.order === 'spilled') {
      const side = random() < 0.5 ? -1 : 1;
      const n = Math.round(mix(22, 48, mood.density));
      for (let i = 0; i < n; i++) {
        const t = random() ** 0.7, spread = (random() - 0.5) * (0.05 + t * 0.22);
        const r = (0.0065 + Math.floor(random() * 4) * 0.002) * sizeScale;
        eyes.push({
          p: new THREE.Vector3(side * (W / 2 - 0.04 + t * 0.2) + spread * 0.3, lift(r), D / 2 + 0.012 + t * 0.14 + spread * 0.6),
          q: tilted(a.type === 'flat' ? 0.3 : 2.4), r, loose: true, colour: pick(Math.floor(random() * rows), Math.floor(random() * 4)),
        });
      }
    }
    if (a.pad) {
      const padZ = D / 2 + 0.06, padX = a.order === 'spilled' ? 0 : -W * 0.18;
      const velvet = s.material(mood.cheer > 0.5 ? '#7a1830' : '#2a1a48', { roughness: 1 });
      const pad = s.box([0.1, 0.012, 0.06], [padX, 0.006, padZ], velvet);
      pad.rotation.y = (random() - 0.5) * 0.3;
      const r = 0.013 * sizeScale;
      const colour = new THREE.Color(a.colours === 'one-odd' ? '#c0121e' : paletteFor(0)[0]);
      for (const sideways of [-1, 1]) eyes.push({ p: new THREE.Vector3(padX + sideways * r * 1.35, 0.012 + lift(r), padZ), q: tilted(0.15), r, colour, loose: true });
    } else if (a.colours === 'one-odd' && eyes.length) {
      eyes[Math.floor(random() * eyes.length)].colour = new THREE.Color('#c0121e');
    }
    let held: Eye | null = null;
    if (a.tool === 'holding') {
      held = { p: new THREE.Vector3(W * 0.2, 0.1, 0.01), q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.7), r: 0.011 * sizeScale, loose: true, colour: pick(1, 2) };
      eyes.push(held);
    }

    const dome = a.type === 'flat';
    const whiteGeometry = dome ? new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2) : new THREE.SphereGeometry(1, 14, 10);
    const glass = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.1 + wear * 0.35 });
    const irisMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.12 + wear * 0.3 });
    const pupilMaterial = new THREE.MeshStandardMaterial({ color: '#0a0a0b', roughness: 0.1 });
    const whites = new THREE.InstancedMesh(whiteGeometry, glass, eyes.length);
    const irises = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 6), irisMaterial, eyes.length);
    const pupils = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), pupilMaterial, eyes.length);
    const m = new THREE.Matrix4(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const trayQ = t.root.quaternion.clone();
    for (const eye of eyes) if (!eye.loose) { eye.p.applyMatrix4(t.root.matrix); eye.q.premultiply(trayQ); }
    for (const bar of bars) bar.p.applyMatrix4(t.root.matrix);
    eyes.forEach((eye, i) => {
      m.compose(eye.p, eye.q, sc.setScalar(eye.r));
      whites.setMatrixAt(i, m);
      v.copy(up).applyQuaternion(eye.q).multiplyScalar(eye.r * 0.83).add(eye.p);
      m.compose(v, eye.q, sc.set(eye.r * 0.62, eye.r * 0.26, eye.r * 0.62));
      irises.setMatrixAt(i, m);
      irises.setColorAt(i, eye.colour);
      v.copy(up).applyQuaternion(eye.q).multiplyScalar(eye.r * 0.95).add(eye.p);
      m.compose(v, eye.q, sc.set(eye.r * 0.3, eye.r * 0.18, eye.r * 0.3));
      pupils.setMatrixAt(i, m);
    });
    for (const mesh of [whites, irises, pupils]) {
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      s.root.add(mesh);
    }
    if (irises.instanceColor) irises.instanceColor.needsUpdate = true;
    if (bars.length) {
      const wire = new THREE.MeshStandardMaterial({ color: '#8d8a80', metalness: 0.7, roughness: 0.4 });
      const lead = new THREE.MeshStandardMaterial({ color: '#5c5e62', metalness: 0.5, roughness: 0.6 });
      const barMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wire, bars.length * 2);
      const weightMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), lead, bars.length);
      const q = new THREE.Quaternion();
      bars.forEach((bar, i) => {
        q.setFromAxisAngle(up, bar.yaw).premultiply(trayQ);
        m.compose(bar.p, q, sc.set(bar.r * 2.6, bar.r * 0.16, bar.r * 0.16));
        barMesh.setMatrixAt(i * 2, m);
        v.set(0, 0, bar.r * 0.9).applyQuaternion(q).add(bar.p);
        m.compose(v, q, sc.set(bar.r * 0.16, bar.r * 0.16, bar.r * 1.8));
        barMesh.setMatrixAt(i * 2 + 1, m);
        v.set(0, 0, bar.r * 1.9).applyQuaternion(q).add(bar.p);
        m.compose(v, q, sc.set(bar.r * 0.5, bar.r * 0.45, bar.r * 0.6));
        weightMesh.setMatrixAt(i, m);
      });
      for (const mesh of [barMesh, weightMesh]) {
        mesh.castShadow = true;
        s.root.add(mesh);
      }
    }

    // Label card on a brass clip at the back of the tray.
    if (a.label !== 'none') {
      const text = { grade: (a.colours === 'browns' ? 'BROWN' : a.colours === 'greens' ? 'GREY' : a.colours === 'amber' ? 'AMBER' : 'BLUE') + ' No. ' + (2 + Math.floor(random() * 9)), pairs: 'PAIRS ONLY', odd: 'ODDS - DO NOT USE', french: 'YEUX DE POUPEE', seen: 'SOLD AS SEEN' }[a.label];
      const paper = new THREE.Color('#f1e7c9').lerp(new THREE.Color('#b99b62'), wear * 0.6).getStyle();
      const card = t.label(text, 0.2, 0.06, [(random() - 0.5) * 0.06, depth + 0.034, -D / 2 - 0.004], '#3b2c20', paper);
      card.rotation.x = -0.5;
      card.rotation.z = (random() - 0.5) * 0.12 * (1 + wear * 2);
      t.box([0.02, 0.014, 0.004], [card.position.x, depth + 0.004, -D / 2 - 0.001], s.material('#b8963a', { metalness: 0.8, roughness: 0.3 }));
    }

    // Tools.
    const steel = s.material('#c9cdd0', { metalness: 0.85, roughness: 0.25 });
    const toolX = W / 2 + 0.05;
    if (a.tool !== 'away') {
      const tweezers = new THREE.Group();
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0012, 0.13), steel);
        arm.geometry.translate(0, 0, 0.065);
        arm.rotation.x = side * 0.045;
        arm.castShadow = true;
        tweezers.add(arm);
      }
      const heel = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.004, 0.03), steel);
      heel.position.z = 0.012;
      tweezers.add(heel);
      if (held) {
        // Tips pinch the lifted eye; the heel rests on the tray rim.
        const tip = held.p.clone().add(new THREE.Vector3(0, 0, 0));
        const tail = new THREE.Vector3(W / 2 + 0.035, 0.03, D * 0.2 + 0.07);
        tweezers.position.copy(tail);
        tweezers.lookAt(tip);
        tweezers.scale.z = tail.distanceTo(tip) / 0.13;
        s.rod([tail.x, 0, tail.z + 0.004], [tail.x, tail.y, tail.z], 0.004, s.material('#3a2c22'));
      } else {
        tweezers.position.set(toolX - 0.025, 0.004, -0.05);
        tweezers.rotation.y = (random() - 0.5) * 0.7;
        tweezers.rotation.z = Math.PI / 2;
      }
      s.root.add(tweezers);
    }
    const black = s.material('#17171a', { roughness: 0.45 });
    const lx = toolX + 0.005, lz = D * 0.28;
    s.lathe([[0.019, 0], [0.021, 0.004], [0.017, 0.03], [0.0185, 0.034], [0.0185, 0.038]], black, [lx, 0, lz]);
    s.cylinder(0.0165, 0.0165, 0.002, [lx, 0.036, lz], new THREE.MeshStandardMaterial({ color: '#bfe0ea', roughness: 0.05, metalness: 0.3 }), 20);

    return s.finish();
  },
});
