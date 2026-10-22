import * as THREE from 'three';
import { choice, clamp01, defineWorld, diorama, mix, score } from '@conjure/kit';
import { gearGeometry, painted, windKey, type KeyStyle } from './parts';

type V3 = readonly [number, number, number];

const DISTRICTS = {
  guild: { walls: ['#bf8a3c', '#c9983f', '#a9742f', '#b98045'], trim: '#6a4524', roof: '#5b4238', door: '#3f2a1f', cobble: '#8d8272' },
  foundry: { walls: ['#7d5438', '#6b4a36', '#8a5a36', '#5d4a40'], trim: '#2e2a28', roof: '#38322f', door: '#1f1b1a', cobble: '#6f675f' },
  palace: { walls: ['#eadfc0', '#e3d3ac', '#efe6cf'], trim: '#c49a35', roof: '#4a8a82', door: '#7a2f2a', cobble: '#b3ab98' },
  tenement: { walls: ['#8f8a6a', '#6f9186', '#a0683e', '#84786a', '#9a8450'], trim: '#4a4038', roof: '#55483f', door: '#3a4a48', cobble: '#7e786c' },
} as const;

/** Many boxes or cylinders in one draw call, each with its own colour and frame. */
class Batch {
  private matrices: THREE.Matrix4[] = [];
  private colours: THREE.Color[] = [];
  constructor(private geometry: THREE.BufferGeometry, private material: THREE.Material) {}
  add(frame: THREE.Matrix4, size: V3, at: V3, colour: THREE.ColorRepresentation, turn: V3 = [0, 0, 0]) {
    const local = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)), new THREE.Vector3(...size));
    this.raw(frame.clone().multiply(local), colour);
  }
  raw(matrix: THREE.Matrix4, colour: THREE.ColorRepresentation) {
    this.matrices.push(matrix);
    this.colours.push(new THREE.Color(colour));
  }
  into(root: THREE.Object3D) {
    if (!this.matrices.length) {
      this.geometry.dispose();
      this.material.dispose();
      return;
    }
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.matrices.length);
    this.matrices.forEach((matrix, index) => {
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, this.colours[index]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  }
}

export default defineWorld({
  questions: {
    district: choice('Whose quarter of the city is this square in?', {
      guild: 'The guild quarter: polished brass merchant houses with stepped gables and hanging trade signs.',
      foundry: 'The foundry quarter: soot-dark copper and riveted iron, flat roofs, tall chimney stacks.',
      palace: 'The palace quarter: ivory enamel and gilt trim under verdigris copper domes.',
      tenement: 'The tenements: narrow crooked houses of patched tin and green copper, laundry between them.',
    }),
    paving: choice('How much of the machinery shows through the cobbles?', {
      grates: 'Round brass-rimmed openings in the paving, each showing gears turning underneath.',
      trench: 'A long open trench beside the canal with a train of great cogs standing half out of the ground.',
      sealed: 'Almost none: tidy cobbles with only two small glazed inspection ports.',
      exposed: 'Everything: openings everywhere, cobbles lifted in heaps, trestle barriers around the works.',
    }),
    state: choice('What is the city doing right now?', {
      running: 'Running to time: every key turning, canisters flying through the tubes.',
      winding: 'Winding down: half the keys have stopped, the lamps are going dim, everything is slow.',
      stopped: 'Run down completely: nothing moves, shutters half closed, canisters stuck in the tubes.',
      festival: 'Winding day: bunting across the square, everything freshly wound and spinning fast.',
      curfew: 'Curfew: every shutter closed, lamps lit, only the machinery under the street still turning.',
    }),
    canal: choice('What is in the canal?', {
      oil: 'Black machine oil with a rainbow sheen, dripping from brass spouts.',
      amber: 'Clear golden lubricant that almost glows.',
      dry: 'Nothing: it has been drained to a bed of cracked sludge, and the barge sits on the bottom.',
      overflow: 'Too much oil: it is brimming over the quay and pooling across the cobbles.',
    }),
    tubes: score('How much pneumatic tubing runs overhead?', ['None at all', 'One line along the house-fronts', 'A second line out to a street terminal', 'A web of tubes crossing the square']),
    landmark: choice('What marks the tallest house at the back of the square?', {
      clock: 'A great ivory clock dial that the whole square keeps time by.',
      key: 'A giant municipal winding key standing out of the wall, slowly turning.',
      governor: 'A spinning flyball governor on the roof, its brass balls flung wide.',
      plain: 'Nothing: it is only a taller house.',
    }),
    left: choice('What has been left in the middle of the square?', {
      nothing: 'Nothing. The cobbles are swept.',
      key: 'A dropped wind-up key as long as an arm, lying where someone ran down.',
      queue: 'Brass stanchions and a red rope marking out an empty queue.',
      spill: 'A spill of loose cogs and springs from something that burst.',
      cart: 'An oiler\'s handcart loaded with cans.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const d = DISTRICTS[a.district];
    const slots: [number, number, number?, number?][] = [[0, 1.2, 0, 1.15], [-4.2, -1.2], [3.4, -1.6], [-3.6, 4.2], [2.6, 4.6], [0, -3.8]];
    const { art: s, world } = diorama(context, { floor: null, width: 18, depth: 14, maxHeight: 3.2, radius: 1.5, pitch: 31, yaw: 30, slots });
    const root = s.root;

    // Copper afternoon: a warm paper sky and a key light pulled toward orange.
    const sky = new THREE.Color('#ecdcc0').lerp(new THREE.Color('#dde2e0'), (1 - mood.warmth) * 0.8);
    sky.lerp(new THREE.Color('#cdc5b8'), (1 - mood.cheer) * 0.3).lerp(new THREE.Color('#e6c49a'), clamp01(mood.daylight - 0.7) * 1.2);
    world.background.copy(sky);
    world.keyLight?.color.lerp(new THREE.Color('#ffb070'), 0.4 * mood.warmth);

    const glow = clamp01(Math.abs(mood.daylight - 0.5) * 2.2);
    const pace = { running: 1, winding: 0.22, stopped: 0, festival: 1.4, curfew: 0.5 }[a.state] * mix(0.35, 1.5, mood.energy);
    const still = a.state === 'stopped';
    const verdigris = new THREE.Color('#5f9a8a'), grime = new THREE.Color('#5a5148');
    const tone = (hex: string, patina = 1) => {
      const colour = new THREE.Color(hex);
      colour.offsetHSL(0, (random() - 0.5) * 0.06, (random() - 0.5) * 0.07);
      if (random() < mood.wear * 0.7 * patina) colour.lerp(verdigris, 0.2 + random() * 0.5 * mood.wear);
      return colour.lerp(grime, mood.wear * 0.22);
    };
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    const boxes = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.72 }));
    const metal = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.35 }));
    const rounds = new Batch(new THREE.CylinderGeometry(1, 1, 1, 14), new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.3 }));
    const lit = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffb648', emissiveIntensity: mix(0.5, 1.5, glow), roughness: 0.4 }));
    const dark = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.2 }));
    const brass = s.material('#c99a3e', { metalness: 0.5, roughness: 0.38 });
    const copper = s.material('#b5673c', { metalness: 0.5, roughness: 0.42 });
    const steel = s.material('#8d8f8c', { metalness: 0.5, roughness: 0.45 });
    const iron = s.material('#4c4640', { metalness: 0.35, roughness: 0.6 });
    const gearPaints = [brass, copper, steel, iron, brass];
    const roofPaint = s.material(d.roof, { roughness: 0.7, metalness: a.district === 'palace' ? 0.3 : 0.05 });
    const BRASS = '#c99a3e';
    const flat = new THREE.Matrix4();

    const spins: { object: THREE.Object3D; axis: 'x' | 'y' | 'z'; rate: number }[] = [];
    const spin = (object: THREE.Object3D, axis: 'x' | 'y' | 'z', rate: number) => spins.push({ object, axis, rate });
    const tick: ((dt: number, time: number) => void)[] = [];

    // ---------- Ground: a cross-section block, cobbles on top, machinery showing through ----------
    const pits: [number, number, number][] = {
      grates: [[-1.3, -1.4, 1.1], [3.7, 1.5, 1.15], [-5.9, 1.5, 1.2], [-0.5, 5.3, 1.15], [-6, -4.3, 0.9]],
      trench: [[-1.3, -1.4, 1.1], [-5.9, 1.5, 1.2], [-0.5, 5.3, 1.15]],
      sealed: [[3.7, 1.5, 0.75], [-5.9, 1.5, 0.8]],
      exposed: [[-1.3, -1.4, 1.1], [3.7, 1.5, 1.15], [-5.9, 1.5, 1.2], [-0.5, 5.3, 1.15], [-6, -4.3, 0.9], [3, -4.6, 1]],
    }[a.paving].map(([x, z, r]) => [x, z, r] as [number, number, number]);
    const trench = a.paving === 'trench' || a.paving === 'exposed';

    const shape = new THREE.Shape();
    shape.moveTo(-9, -7); shape.lineTo(6.3, -7); shape.lineTo(6.3, 7); shape.lineTo(-9, 7); shape.closePath();
    for (const [x, z, r] of pits) {
      const hole = new THREE.Path();
      hole.absarc(x, -z, r, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
    if (trench) {
      const hole = new THREE.Path();
      hole.moveTo(5.38, -6.4); hole.lineTo(5.92, -6.4); hole.lineTo(5.92, 4.6); hole.lineTo(5.38, 4.6); hole.closePath();
      shape.holes.push(hole);
    }
    const cobbleBase = new THREE.Color(d.cobble).lerp(grime, mood.wear * 0.25);
    const cobbles = painted(512, 512, (ctx, w, h) => {
      ctx.fillStyle = `#${cobbleBase.clone().multiplyScalar(0.55).getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      const size = 32;
      for (let row = 0; row < h / size; row++)
        for (let col = -1; col < w / size; col++) {
          const stone = cobbleBase.clone().offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.14);
          if (random() < mood.wear * 0.25) stone.multiplyScalar(0.6);
          ctx.fillStyle = `#${stone.getHexString()}`;
          const x = col * size + (row % 2) * size * 0.5 + 2, y = row * size + 2;
          ctx.beginPath();
          ctx.roundRect(x, y, size - 4 - random() * 2, size - 4 - random() * 2, 7);
          ctx.fill();
          if (x + size > w) { ctx.beginPath(); ctx.roundRect(x - w, y, size - 5, size - 5, 7); ctx.fill(); }
        }
      for (let i = 0; i < mood.wear * 14; i++) {
        ctx.fillStyle = 'rgba(25,20,16,0.28)';
        ctx.beginPath();
        ctx.ellipse(random() * w, random() * h, 20 + random() * 50, 14 + random() * 30, random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    cobbles.wrapS = cobbles.wrapT = THREE.RepeatWrapping;
    cobbles.repeat.set(1 / 3.2, 1 / 3.2);
    const pavingGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false, curveSegments: 28 });
    pavingGeometry.rotateX(-Math.PI / 2);
    pavingGeometry.translate(0, -0.14, 0);
    const paving = s.mesh(pavingGeometry, new THREE.MeshStandardMaterial({ map: cobbles, roughness: 0.9 }));
    paving.castShadow = false;
    world.ground = paving;

    const deep = '#3a332d';
    boxes.add(flat, [18, 1.8, 14], [0, -1.7, 0], deep);
    boxes.add(flat, [15.3, 0.7, 0.2], [-1.35, -0.47, 6.9], tone('#6b6258', 0));
    boxes.add(flat, [0.2, 0.7, 14], [6.2, -0.47, 0], tone('#6b6258', 0));
    boxes.add(flat, [0.7, 0.8, 14], [8.65, -0.4, 0], `#${cobbleBase.getHexString()}`);
    boxes.add(flat, [2, 0.8, 1.2], [7.3, -0.4, -6.4], deep);

    const flatGear = (x: number, y: number, z: number, radius: number, paint: THREE.Material, rate: number, spokes = 5) => {
      const gear = s.mesh(gearGeometry(radius, Math.max(8, Math.round(radius * 13)), 0.1, radius * 0.12, radius > 0.35 ? spokes : 0, 0.08), paint, [x, y, z]);
      gear.rotation.set(-Math.PI / 2, 0, random() * 6);
      spin(gear, 'z', rate);
      return gear;
    };
    for (const [x, z, r] of pits) {
      const rim = s.ring(r + 0.04, 0.07, [x, 0.02, z], brass);
      rim.rotation.x = Math.PI / 2;
      const r1 = r * 0.74, r2 = r * (0.5 + random() * 0.25), angle = random() * Math.PI * 2;
      const ox = (random() - 0.5) * 0.2 * r, oz = (random() - 0.5) * 0.2 * r, turn = (random() < 0.5 ? 1 : -1) * (0.5 + random() * 0.4);
      const first = Math.floor(random() * 4);
      flatGear(x + ox, -0.21, z + oz, r1, gearPaints[first], turn);
      flatGear(x + ox + Math.cos(angle) * (r1 + r2 - 0.07), -0.21, z + oz + Math.sin(angle) * (r1 + r2 - 0.07), r2, gearPaints[first + 1], -turn * r1 / r2);
      flatGear(x + ox, -0.09, z + oz, r1 * 0.38, gearPaints[(first + 2) % 4], turn, 0);
      rounds.add(flat, [0.07, 0.75, 0.07], [x + ox, -0.4, z + oz], '#2c2826');
      rounds.add(flat, [r + 0.3, 0.04, r + 0.3], [x, -0.55, z], '#7a6650');
      if (a.paving === 'sealed') {
        const pane = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.02, 32), new THREE.MeshStandardMaterial({ color: '#cfe6e2', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false }));
        pane.position.set(x, -0.01, z);
        root.add(pane);
        for (const turnBar of [0, Math.PI / 2]) metal.add(flat, [r * 2, 0.04, 0.05], [x, 0.0, z], BRASS, [0, turnBar, 0]);
      }
      if (a.paving === 'exposed') {
        const side = random() * Math.PI * 2;
        for (let i = 0; i < 16; i++) {
          const reach = r + 0.25 + random() * 0.45, around = side + (random() - 0.5) * 1.1, lift = random() < 0.35 ? 0.24 : 0.08;
          boxes.add(flat, [0.19, 0.15, 0.19], [x + Math.cos(around) * reach, lift, z + Math.sin(around) * reach], cobbleBase.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12), [random() * 0.5, random() * 3, random() * 0.5]);
        }
      }
    }
    if (trench) {
      let z = -4.1, direction = 1, radius = 0.55 + random() * 0.3;
      while (z < 5.9) {
        const gear = s.mesh(gearGeometry(radius, Math.round(radius * 13), 0.16, radius * 0.14, 5, 0.09), gearPaints[Math.floor(random() * 4)], [5.65, -0.12, z]);
        gear.rotation.set(0, Math.PI / 2, random() * 6);
        spin(gear, 'z', direction * 0.45 / radius);
        rounds.add(flat, [0.06, 0.7, 0.06], [5.65, -0.12, z], '#2c2826', [0, 0, Math.PI / 2]);
        const next = 0.5 + random() * 0.38;
        z += radius + next - 0.08;
        radius = next;
        direction = -direction;
      }
    }
    if (a.paving === 'exposed')
      for (const [x, z, turn] of [[-0.5, 6.72, 0], [-5.9, 3.05, 0.1], [1.3, -5.2, -0.1]] as const) {
        const frame = new THREE.Matrix4().makeRotationY(turn).setPosition(x, 0, z);
        for (let i = 0; i < 6; i++) boxes.add(frame, [0.26, 0.17, 0.05], [-0.65 + i * 0.26, 0.78, 0], i % 2 ? '#e8dcc0' : '#a8352c');
        for (const side of [-1, 1]) for (const lean of [-1, 1]) boxes.add(frame, [0.05, 0.92, 0.05], [side * 0.62, 0.44, lean * 0.14], d.trim, [lean * 0.3, 0, 0]);
      }

    // Gear trains on the cut faces of the block, so the square reads as the lid of a machine.
    for (const face of ['front', 'side'] as const) {
      let along = -8.1, direction = 1, radius = 0.55 + random() * 0.3;
      const limit = face === 'front' ? 8.3 : 6.3;
      if (face === 'side') along = -6.2;
      while (along < limit) {
        const at: V3 = face === 'front' ? [along, -1.72, 7.06] : [9.06, -1.72, -along];
        const gear = s.mesh(gearGeometry(radius, Math.round(radius * 13), 0.1, radius * 0.12, 5, 0.09), gearPaints[Math.floor(random() * 4)], at);
        gear.rotation.set(0, face === 'side' ? Math.PI / 2 : 0, random() * 6);
        spin(gear, 'z', direction * 0.4 / radius);
        const next = 0.5 + random() * 0.34;
        along += radius + next - 0.08;
        radius = next;
        direction = -direction;
      }
    }

    // ---------- House-fronts ----------
    const depth = 1.2;
    const keyStyles: KeyStyle[] = ['butterfly', 'heart', 'ring', 'tbar'];
    let keyIndex = 0;
    const house = (frame: THREE.Matrix4, w: number, h: number, kind: 'house' | 'landmark' | 'sluice') => {
      const group = new THREE.Group();
      group.applyMatrix4(frame);
      root.add(group);
      const put = (object: THREE.Object3D, at: V3) => { object.position.set(...at); group.add(object); return object; };
      const cast = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; return mesh; };
      const wall = tone(pick(d.walls)), trim = tone(d.trim, 0.4), door = tone(d.door, 0.3);
      boxes.add(frame, [w - 0.04, h, depth], [0, h / 2, -depth / 2], wall);
      boxes.add(frame, [w + 0.06, 0.45, depth + 0.12], [0, 0.225, -depth / 2], trim);
      boxes.add(frame, [w + 0.16, 0.2, depth + 0.2], [0, h - 0.06, -depth / 2], trim);
      for (const side of [-1, 1]) boxes.add(frame, [0.14, h, 0.1], [side * (w / 2 - 0.09), h / 2, 0.02], trim);
      boxes.add(frame, [w - 0.1, 0.12, 0.07], [0, 2.52, 0.02], a.district === 'palace' ? tone(d.trim, 0.2) : trim);

      const feature = kind === 'landmark' && a.landmark !== 'plain' && a.landmark !== 'governor';
      const top = feature ? h - 3.6 : h - 0.3;
      const rows = Math.max(1, Math.floor((top - 2.6) / 1.75)), rowHeight = (top - 2.6) / rows;
      const columns = Math.max(1, Math.round((w - 0.3) / 1.25)), pitch = (w - 0.3) / columns;
      for (let row = 0; row < rows; row++)
        for (let column = 0; column < columns; column++) {
          const x = (column - (columns - 1) / 2) * pitch, y = 2.6 + (row + 0.5) * rowHeight;
          boxes.add(frame, [0.8, 1.2, 0.08], [x, y, 0.02], trim);
          boxes.add(frame, [0.92, 0.07, 0.22], [x, y - 0.62, 0.08], trim);
          const shut = a.state === 'curfew' || (still && random() < 0.55) || random() < mood.wear * 0.2;
          if (shut) {
            boxes.add(frame, [0.64, 1.04, 0.1], [x, y, 0.05], door);
            boxes.add(frame, [0.03, 1.04, 0.12], [x, y, 0.05], trim);
          } else {
            const on = random() < mix(0.12, 0.9, glow) * { running: 1, winding: 0.45, stopped: 0.06, festival: 1.2, curfew: 0 }[a.state];
            (on ? lit : dark).add(frame, [0.64, 1.04, 0.1], [x, y, 0.045], on ? '#ffffff' : random() < mood.wear * 0.4 ? '#15171a' : '#4a5c66');
            boxes.add(frame, [0.035, 1.04, 0.12], [x, y, 0.045], trim);
            boxes.add(frame, [0.64, 0.035, 0.12], [x, y + 0.1, 0.045], trim);
            if (random() < mood.wear * 0.3) boxes.add(frame, [0.9, 0.12, 0.04], [x, y, 0.12], '#7a5a3a', [0, 0, (random() - 0.5) * 1.2]);
            else if (random() < mood.cheer * 0.5) boxes.add(frame, [0.7, 0.14, 0.16], [x, y - 0.52, 0.2], pick(['#c2452f', '#d9a514', '#4f8f5a', '#c66a8e']));
          }
        }
      if (a.district === 'palace')
        for (let column = 0; column <= columns; column++) metal.add(frame, [0.09, top - 2.62, 0.07], [(column - columns / 2) * pitch, (top + 2.6) / 2, 0.02], tone(d.trim, 0.2));
      if (a.district === 'foundry') {
        for (const y of [2.42, h - 0.3]) for (let i = 0; i < Math.floor(w / 0.34); i++) metal.add(frame, [0.07, 0.07, 0.05], [-w / 2 + 0.25 + i * 0.34, y, 0.05], '#2a2625');
        rounds.add(frame, [0.07, h - 0.5, 0.07], [w / 2 - 0.32, h / 2 + 0.1, 0.14], tone('#b5673c'));
      }
      if (a.district === 'tenement')
        for (let i = 0; i < 4; i++) boxes.add(frame, [0.5 + random() * 0.7, 0.4 + random() * 0.6, 0.03], [(random() - 0.5) * (w - 1), 0.8 + random() * (h - 1.6), 0.005], tone(pick(d.walls)), [0, 0, (random() - 0.5) * 0.12]);

      const side = random() < 0.5 ? -1 : 1;
      const doorX = kind === 'sluice' ? 0 : side * w * 0.26, keyX = kind === 'sluice' ? 0.95 : -side * w * 0.24;
      if (kind === 'sluice') {
        dark.add(frame, [1.8, 1.35, 0.06], [-0.15, 0, 0.09], '#0c0b0a');
        boxes.add(frame, [2.15, 0.2, 0.16], [-0.15, 0.76, 0.08], trim);
        boxes.add(frame, [0.3, 0.34, 0.2], [-0.15, 0.8, 0.09], tone(BRASS));
      } else {
        boxes.add(frame, [1.08, 2.16, 0.08], [doorX, 1.08, 0.02], trim);
        boxes.add(frame, [0.86, 2, 0.1], [doorX, 1, 0.05], door);
        boxes.add(frame, [1.3, 0.12, 0.42], [doorX, 0.06, 0.2], tone('#8a8072', 0));
        rounds.add(frame, [0.05, 0.06, 0.05], [doorX + 0.28 * side, 1, 0.12], BRASS, [Math.PI / 2, 0, 0]);
        const emblem = cast(new THREE.Mesh(gearGeometry(0.27, 10, 0.06, 0.05, 0, 0.07), brass));
        put(emblem, [doorX, 2.48, 0.1]);
        spin(emblem, 'z', 0.8 * (random() < 0.5 ? 1 : -1));
        if (a.district === 'guild') {
          metal.add(frame, [0.04, 0.04, 0.6], [doorX, 3.3, 0.3], '#2a2625');
          boxes.add(frame, [0.05, 0.42, 0.46], [doorX, 3.02, 0.34], pick(['#7a2f2a', '#2f5a6a', '#3c5a34', '#c9a03c', '#e8dcc0']));
        }
      }
      // The wind-up key in the wall.
      rounds.add(frame, [0.26, 0.06, 0.26], [keyX, 1.55, 0.04], tone(BRASS), [Math.PI / 2, 0, 0]);
      const socket = new THREE.Group();
      socket.rotation.x = Math.PI / 2;
      const key = windKey(brass, mix(0.8, 1.05, random()), keyStyles[keyIndex++ % keyStyles.length]);
      key.rotation.y = random() * Math.PI;
      socket.add(key);
      put(socket, [keyX, 1.55, 0.05]);
      const stalled = still || a.state === 'curfew' || (a.state === 'winding' && random() < 0.55);
      if (stalled && random() < 0.5) socket.rotation.z = (random() - 0.5) * 0.5;
      if (!stalled) spin(key, 'y', 0.7 + random() * 0.6);

      // Roof.
      const back = -depth / 2;
      let roofTop = h;
      if (kind === 'landmark' && a.landmark === 'governor') {
        boxes.add(frame, [w * 0.7, 0.3, depth * 0.8], [0, h + 0.15, back], trim);
        const mast = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.1, 10), iron));
        put(mast, [0, h + 1.3, back]);
        const whirl = new THREE.Group();
        const spread = mix(0.25, 1.1, clamp01(pace / 1.4));
        for (const arm of [-1, 1]) {
          const rod = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 8), brass));
          rod.position.set(arm * Math.sin(spread) * 0.475, -Math.cos(spread) * 0.475, 0);
          rod.rotation.z = arm * spread;
          const ball = cast(new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12), brass));
          ball.position.set(arm * Math.sin(spread) * 0.95, -Math.cos(spread) * 0.95, 0);
          whirl.add(rod, ball);
        }
        whirl.rotation.y = random() * 3;
        put(whirl, [0, h + 2.3, back]);
        spin(whirl, 'y', 2.4);
        roofTop = h + 2.4;
      } else if (a.district === 'guild') {
        const half = w / 2 + 0.04, steps = 4, rise = Math.min(0.5, w * 0.16), run = half / (steps + 0.7);
        const gable = new THREE.Shape();
        gable.moveTo(-half, 0);
        for (let i = 1; i <= steps; i++) { gable.lineTo(-half + (i - 1) * run, i * rise); gable.lineTo(-half + i * run, i * rise); }
        for (let i = steps; i >= 1; i--) { gable.lineTo(half - i * run, i * rise); gable.lineTo(half - (i - 1) * run, i * rise); }
        gable.lineTo(half, 0);
        const geometry = new THREE.ExtrudeGeometry(gable, { depth: depth + 0.08, bevelEnabled: false });
        put(cast(new THREE.Mesh(geometry, roofPaint)), [0, h, -depth - 0.04]);
        roofTop = h + steps * rise;
        rounds.add(frame, [0.05, 0.6, 0.05], [0, roofTop + 0.3, back], BRASS);
      } else if (a.district === 'tenement') {
        const half = w / 2 + 0.08, rise = w * mix(0.4, 0.7, random()), peak = (random() - 0.5) * w * 0.35;
        const gable = new THREE.Shape();
        gable.moveTo(-half, 0); gable.lineTo(peak, rise); gable.lineTo(half, 0); gable.closePath();
        put(cast(new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: depth + 0.16, bevelEnabled: false }), roofPaint)), [0, h, -depth - 0.08]);
        boxes.add(frame, [0.34, rise * 0.9, 0.34], [-peak * 0.8 + (peak < 0 ? -0.2 : 0.2), h + rise * 0.45, back], tone('#8a5a48'));
        roofTop = h + rise;
      } else if (a.district === 'foundry') {
        boxes.add(frame, [w - 0.1, 0.3, 0.14], [0, h + 0.15, -0.08], trim);
        const stacks = 1 + Math.floor(random() * 2);
        for (let i = 0; i < stacks; i++) {
          const x = (random() - 0.5) * (w - 1), tall = 1.6 + random() * 1.8;
          rounds.add(frame, [0.27, tall, 0.27], [x, h + tall / 2, back], tone('#6a4a3a'));
          rounds.add(frame, [0.33, 0.16, 0.33], [x, h + tall, back], '#26221f');
          roofTop = Math.max(roofTop, h + tall);
        }
        if (random() < 0.5) rounds.add(frame, [0.45, 0.8, 0.45], [w * 0.25, h + 0.4, back], tone('#b5673c'));
      } else {
        boxes.add(frame, [w * 0.88, 0.7, depth * 0.9], [0, h + 0.35, back], tone(d.roof, 0));
        const radius = Math.min(w * 0.3, 1.1);
        put(cast(new THREE.Mesh(new THREE.SphereGeometry(radius, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), roofPaint)), [0, h + 0.7, back]).scale.set(1, 1.15, 0.6);
        rounds.add(frame, [0.04, 0.7, 0.04], [0, h + 0.7 + radius * 1.15 + 0.3, back], BRASS);
        roofTop = h + 0.7 + radius * 1.15;
      }

      if (feature && a.landmark === 'clock') {
        const face = painted(512, 512, (ctx, size) => {
          const c = size / 2;
          ctx.fillStyle = '#7a5524'; ctx.beginPath(); ctx.arc(c, c, c, 0, 7); ctx.fill();
          ctx.fillStyle = '#f1e7cd'; ctx.beginPath(); ctx.arc(c, c, c * 0.9, 0, 7); ctx.fill();
          ctx.fillStyle = '#2f4d6e'; ctx.beginPath(); ctx.arc(c, c, c * 0.5, 0, 7); ctx.fill();
          ctx.fillStyle = '#e6c25a';
          for (let i = 0; i < 24; i++) { ctx.beginPath(); ctx.arc(c + Math.cos(i * 2.4) * c * (0.1 + (i % 5) * 0.08), c + Math.sin(i * 2.4) * c * (0.1 + (i % 5) * 0.08), 5, 0, 7); ctx.fill(); }
          ctx.fillStyle = '#2a1f17';
          ctx.font = 'bold 44px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((numeral, i) => {
            const angle = i * Math.PI / 6 - Math.PI / 2;
            ctx.fillText(numeral, c + Math.cos(angle) * c * 0.72, c + Math.sin(angle) * c * 0.72);
          });
        });
        put(cast(new THREE.Mesh(new THREE.CircleGeometry(1.4, 40), new THREE.MeshStandardMaterial({ map: face, roughness: 0.6 }))), [0, h - 1.9, 0.09]);
        put(cast(new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.09, 8, 48), brass)), [0, h - 1.9, 0.09]);
        const hands = [[0.1, 0.72, 1 / 12], [0.065, 1.12, 1]].map(([wide, long, rate]) => {
          const pivot = new THREE.Group();
          const hand = cast(new THREE.Mesh(new THREE.BoxGeometry(wide, long, 0.03), iron));
          hand.position.y = long / 2 - 0.1;
          pivot.add(hand);
          pivot.rotation.z = -random() * Math.PI * 2;
          put(pivot, [0, h - 1.9, 0.14 + rate * 0.02]);
          spin(pivot, 'z', -0.5 * rate);
          return pivot;
        });
        void hands;
      }
      if (feature && a.landmark === 'key') {
        rounds.add(frame, [0.75, 0.1, 0.75], [0, h - 1.9, 0.05], tone(BRASS), [Math.PI / 2, 0, 0]);
        const socketBig = new THREE.Group();
        socketBig.rotation.x = Math.PI / 2;
        const great = windKey(brass, 2.7, 'butterfly');
        great.rotation.y = random() * Math.PI;
        socketBig.add(great);
        put(socketBig, [0, h - 1.9, 0.08]);
        if (!still) spin(great, 'y', 0.35);
      }
      return roofTop;
    };

    const split = (from: number, to: number, grain: number) => {
      const count = Math.max(1, Math.round((to - from) / grain));
      const weights = Array.from({ length: count }, () => 0.8 + random() * 0.4), total = weights.reduce((sum, weight) => sum + weight, 0);
      let at = from;
      return weights.map((weight) => { const width = (to - from) * weight / total; at += width; return [at - width / 2, width] as const; });
    };
    const grain = { guild: 2.9, foundry: 3.3, palace: 3.4, tenement: 2.4 }[a.district];
    const tall = () => (a.district === 'tenement' ? mix(6, 8, random()) : a.district === 'palace' ? mix(4.8, 6, random()) : mix(5.2, 7.2, random()));
    for (const [x, w] of [...split(-9, -2.3, grain), ...split(1.3, 5.9, grain)]) house(new THREE.Matrix4().setPosition(x, 0, -5.8), w, tall(), 'house');
    house(new THREE.Matrix4().setPosition(-0.5, 0, -5.8), 3.6, a.district === 'palace' ? 8 : 9, 'landmark');
    house(new THREE.Matrix4().setPosition(7.45, 0, -5.8), 3.1, tall(), 'sluice');
    for (const [z, w] of split(-5.8, 7, grain)) house(new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(-7.8, 0, z), w, tall(), 'house');

    if (a.district === 'tenement')
      for (let line = 0; line < 2; line++) {
        const z = -1 + line * 4.5, y = 4.4 + random();
        s.tube([[-7.7, y, z], [-6.4, y - 0.25, z - 2.6], [-5.6, y + 0.2, -5.7]], 0.012, iron);
        for (let i = 0; i < 4; i++) {
          const t = 0.2 + i * 0.18;
          boxes.add(flat, [0.03, 0.5 + random() * 0.3, 0.4], [-7.7 + t * 2.1, y - 0.5, z - t * 4.7], pick(mood.cheer > 0.5 ? ['#e8dcc0', '#c2452f', '#4f7f9a', '#d9a514'] : ['#cfc8b8', '#8a8478', '#a59a84']), [0, -0.42, 0]);
        }
      }

    // ---------- Canal ----------
    const level = { oil: -0.42, amber: -0.42, dry: -0.7, overflow: -0.02 }[a.canal];
    const oilTexture = painted(256, 512, (ctx, w, h) => {
      ctx.fillStyle = a.canal === 'amber' ? '#c98a1e' : a.canal === 'dry' ? '#4b4034' : '#17130f';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        ctx.strokeStyle = a.canal === 'amber' ? `rgba(255,${200 + random() * 40},120,0.35)` : a.canal === 'dry' ? 'rgba(20,16,12,0.6)' : pick(['rgba(190,90,200,0.3)', 'rgba(70,190,180,0.3)', 'rgba(220,180,70,0.28)', 'rgba(90,120,220,0.28)']);
        ctx.lineWidth = a.canal === 'dry' ? 2 : 3 + random() * 7;
        ctx.beginPath();
        const x = random() * w, y = random() * h;
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + (random() - 0.5) * 90, y + random() * 60, x + (random() - 0.5) * 90, y + 60 + random() * 60, x + (random() - 0.5) * 60, y + 120 + random() * 80);
        ctx.stroke();
      }
    });
    const oilPaint = new THREE.MeshStandardMaterial({ map: oilTexture, roughness: a.canal === 'dry' ? 0.95 : 0.18, metalness: a.canal === 'dry' ? 0 : 0.35, emissive: a.canal === 'amber' ? '#b86a10' : '#000000', emissiveIntensity: 0.45 });
    s.box([2, level + 0.8, 14], [7.3, (level - 0.8) / 2, 0], oilPaint).castShadow = false;
    const oilColour = a.canal === 'amber' ? '#d39424' : '#1a1512';
    if (a.canal === 'overflow')
      for (let i = 0; i < 9; i++) {
        const r = 0.35 + random() * 0.7;
        dark.add(flat, [r, 0.012, r * (0.6 + random() * 0.5)], [mix(4.4, 6.1, random()), 0.012, mix(-4.5, 6.4, random())], oilColour, [0, random() * 3, 0]);
      }
    for (const x of [6.12, 8.48]) boxes.add(flat, [0.26, 0.2, 12.9], [x, 0.1, 0.6], tone('#9a9082', 0));
    const drops: { mesh: THREE.Mesh; phase: number }[] = [];
    for (const z of [-3.9, 0.8, 4.9]) {
      rounds.add(flat, [0.09, 0.42, 0.09], [6.42, -0.16, z], tone(BRASS), [0, 0, Math.PI / 2]);
      if (a.canal === 'dry') continue;
      const strand = s.rod([6.6, -0.2, z], [6.6, level, z], 0.022, oilPaint, 0.012);
      strand.castShadow = false;
      const drop = s.ball([0.05, 0.07, 0.05], [6.6, -0.3, z], oilPaint, 10);
      drops.push({ mesh: drop, phase: random() });
    }
    tick.push((_dt, time) => { for (const { mesh, phase } of drops) mesh.position.y = mix(-0.22, level + 0.03, (time * 0.7 * Math.max(pace, 0.001) + phase) % 1); });

    // A footbridge over the canal.
    const arch = new THREE.Shape();
    arch.moveTo(-1.4, 0); arch.quadraticCurveTo(0, 1.1, 1.4, 0); arch.lineTo(1.1, -0.05); arch.quadraticCurveTo(0, 0.72, -1.1, -0.05); arch.closePath();
    s.mesh(new THREE.ExtrudeGeometry(arch, { depth: 1.1, bevelEnabled: false, curveSegments: 14 }), s.material('#8f8577'), [7.3, 0, -2.55]);
    for (const z of [-2.5, -1.5]) {
      const rail: V3[] = [];
      for (let i = 0; i <= 6; i++) {
        const t = i / 6, x = 5.9 + t * 2.8, y = 2 * t * (1 - t) * 1.1;
        rail.push([x, y + 0.62, z]);
        if (i % 2 === 0) rounds.add(flat, [0.035, 0.66, 0.035], [x, y + 0.3, z], BRASS);
      }
      s.tube(rail, 0.03, brass);
    }
    // Bollards and chain along the quay.
    let previous: V3 | null = null;
    for (let z = -5; z < 6.8; z += 1.95) {
      if (Math.abs(z + 2) < 1) { previous = null; continue; }
      rounds.add(flat, [0.1, 0.62, 0.1], [5.98, 0.31, z], '#2f2a27');
      rounds.add(flat, [0.13, 0.08, 0.13], [5.98, 0.64, z], BRASS);
      if (previous) s.tube([previous, [5.98, 0.36, z - 0.97], [5.98, 0.55, z]], 0.018, iron);
      previous = [5.98, 0.55, z];
    }
    // The oiler's barge.
    const barge = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.34, 2.7), s.material('#4a352a'));
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 2.3), s.material('#7a5a40'));
    deck.position.y = 0.18;
    barge.add(hull, deck);
    for (let i = 0; i < 3; i++) {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 14), i === 1 ? copper : brass);
      drum.position.set((random() - 0.5) * 0.3, 0.5, -0.8 + i * 0.6);
      barge.add(drum);
    }
    barge.traverse((node) => { node.castShadow = node.receiveShadow = true; });
    barge.position.set(7.3, level + 0.1, 3 + random() * 1.5);
    if (a.canal === 'dry') barge.rotation.set(0.04, 0.2, 0.2);
    root.add(barge);
    if (a.canal !== 'dry') tick.push((_dt, time) => { barge.position.y = level + 0.1 + Math.sin(time * 1.3) * 0.025 * pace; });

    // ---------- Pneumatic tubes ----------
    const glass = new THREE.MeshStandardMaterial({ color: '#cfe8e4', transparent: true, opacity: 0.45, roughness: 0.08, depthWrite: false });
    const canisterPaints = [brass, s.material('#a8352c', { metalness: 0.3 }), s.material('#e8dcc0')];
    const up = new THREE.Vector3(0, 1, 0);
    const runs: { curve: THREE.CatmullRomCurve3; mesh: THREE.Mesh; at: number; speed: number }[] = [];
    const setOn = (run: (typeof runs)[number]) => {
      run.mesh.position.copy(run.curve.getPointAt(run.at));
      run.mesh.quaternion.setFromUnitVectors(up, run.curve.getTangentAt(run.at));
    };
    const tubeRun = (points: V3[], canisters: number) => {
      const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, 'catmullrom', 0.15);
      const pipe = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, 0.17, 10), glass);
      root.add(pipe);
      const length = curve.getLength();
      for (let along = 0.3; along < length; along += 1.15) {
        const t = along / length;
        const matrix = new THREE.Matrix4().compose(curve.getPointAt(t), new THREE.Quaternion().setFromUnitVectors(up, curve.getTangentAt(t)), new THREE.Vector3(0.2, 0.13, 0.2));
        rounds.raw(matrix, tone(BRASS));
      }
      const jam = 0.3 + random() * 0.4;
      for (let i = 0; i < canisters; i++) {
        const mesh = s.mesh(new THREE.CapsuleGeometry(0.105, 0.3, 4, 10), canisterPaints[i % 3]);
        const run = { curve, mesh, at: still ? jam + i * 0.42 / length : random(), speed: (1.6 + random()) / length * (random() < 0.3 ? -1 : 1) };
        setOn(run);
        runs.push(run);
      }
    };
    if (a.tubes > 0.17) {
      tubeRun([[7.9, 4.6, -5.5], [3, 4.75, -5.5], [-2, 4.6, -5.5], [-7, 4.7, -5.5], [-7.5, 4.75, -5.1], [-7.5, 4.9, -1], [-7.5, 4.8, 6.6]], 4 + Math.round(mood.density * 3));
      for (let x = -6.5; x < 8; x += 2.4) metal.add(flat, [0.06, 0.06, 0.4], [x, 4.48, -5.65], '#2a2625');
      for (let z = -3.5; z < 6.5; z += 2.4) metal.add(flat, [0.4, 0.06, 0.06], [-7.65, 4.62, z], '#2a2625');
    }
    if (a.tubes > 0.5) {
      tubeRun([[4.6, 4.75, -5.5], [5.05, 5.3, -4.4], [5.05, 5.3, -1], [5.05, 5.1, 1.9], [5.05, 4.2, 2.65], [5.05, 0.9, 2.7]], 2);
      rounds.add(flat, [0.06, 5.3, 0.06], [5.05, 2.65, -2.2], '#2f2a27');
      metal.add(flat, [0.5, 0.05, 0.05], [5.05, 5.08, -2.2], '#2f2a27');
      rounds.add(flat, [0.26, 0.95, 0.26], [5.05, 0.475, 2.7], tone(BRASS));
      rounds.add(flat, [0.32, 0.1, 0.32], [5.05, 0.05, 2.7], '#2f2a27');
      rounds.add(flat, [0.3, 0.08, 0.3], [5.05, 0.95, 2.7], '#2f2a27');
    }
    if (a.tubes > 0.83) {
      tubeRun([[-7.5, 4.9, 3.2], [-6.6, 5.9, 2.4], [-3.5, 6.3, -0.8], [0.8, 6.2, -4], [2.4, 5.6, -5.5]], 2);
      tubeRun([[-7.5, 4.9, -2.6], [-6.4, 5.6, -3.4], [-4.6, 5.5, -5.5]], 1);
      rounds.add(flat, [0.05, 6.2, 0.05], [-3.5, 3.1, -5.0], '#2f2a27');
    }
    tick.push((dt) => {
      if (still) return;
      for (const run of runs) { run.at = (run.at + run.speed * dt * pace + 1) % 1; setOn(run); }
    });

    // ---------- Street furniture ----------
    const lamps = ([[-7.15, -3.4], [1.6, -5.3], [-7.15, 4.5], [-2.9, -5.3], [4.8, -4.6]] as const).slice(0, 2 + Math.round(mood.density * 3));
    for (const [x, z] of lamps) {
      const frame = new THREE.Matrix4().makeRotationZ((random() - 0.5) * mood.wear * 0.22).setPosition(x, 0, z);
      rounds.add(frame, [0.15, 0.34, 0.15], [0, 0.17, 0], '#2f2a27');
      rounds.add(frame, [0.05, 3, 0.05], [0, 1.6, 0], '#2f2a27');
      const on = !still && (a.state === 'curfew' || glow > 0.35) && !(a.state === 'winding' && random() < 0.5);
      (on ? lit : dark).add(frame, [0.28, 0.36, 0.28], [0, 3.28, 0], on ? '#ffffff' : '#5a6468');
      metal.add(frame, [0.38, 0.06, 0.38], [0, 3.49, 0], BRASS);
      metal.add(frame, [0.2, 0.1, 0.2], [0, 3.57, 0], BRASS);
      metal.add(frame, [0.34, 0.05, 0.34], [0, 3.08, 0], BRASS);
    }
    for (let i = 0; i < Math.round(mood.density * 9); i++) {
      const alongBack = random() < 0.5;
      const x = alongBack ? (random() < 0.5 ? mix(-6.4, -2.6, random()) : mix(2.2, 4.4, random())) : -7.42;
      const z = alongBack ? -5.38 : mix(-2.6, 6.4, random());
      if (random() < 0.6) {
        rounds.add(flat, [0.23, 0.68, 0.23], [x, 0.34, z], tone(pick(['#8a4a30', '#3f6a66', '#b98a3a', '#3a3532'])));
        rounds.add(flat, [0.24, 0.05, 0.24], [x, 0.5, z], '#2a2625');
      } else boxes.add(flat, [0.5, 0.45, 0.5], [x, 0.225, z], tone('#8a6a48', 0.2), [0, random(), 0]);
    }

    if (a.state === 'festival') {
      const flags = new Batch(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.17, 0, 0), new THREE.Vector3(0.17, 0, 0), new THREE.Vector3(0, -0.42, 0)]), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }));
      const palette = mood.cheer > 0.45 ? ['#c2452f', '#e3b024', '#3f7f8f', '#e8dcc0', '#c66a8e'] : ['#7a2f2a', '#a8894a', '#d8ccb0', '#4a5a5e'];
      const strings: [V3, V3][] = [[[-7.7, 5.7, 5], [4.8, 5.9, -5.7]], [[-7.7, 5.4, -0.6], [2.2, 6.1, -5.7]]];
      if (mood.density > 0.4) strings.push([[-7.7, 5.5, 6.6], [5.98, 4.6, 6.6]]);
      for (const [from, to] of strings) {
        const line: V3[] = [];
        const heading = Math.atan2(-(to[2] - from[2]), to[0] - from[0]);
        for (let i = 0; i <= 24; i++) {
          const t = i / 24, at: V3 = [mix(from[0], to[0], t), mix(from[1], to[1], t) - Math.sin(t * Math.PI) * 1.1, mix(from[2], to[2], t)];
          if (i % 4 === 0) line.push(at);
          if (i > 0 && i < 24) flags.raw(new THREE.Matrix4().makeRotationY(heading).setPosition(at[0], at[1], at[2]), palette[i % palette.length]);
        }
        s.tube(line, 0.012, iron);
      }
      flags.into(root);
    }

    // ---------- What was left in the square ----------
    const [lx, lz] = [-1.6, 3.6];
    if (a.left === 'key') {
      const dropped = windKey(brass, 1.25, 'butterfly');
      dropped.rotation.set(Math.PI / 2, 0, 0.6 + random() * 2);
      dropped.position.set(lx, 0.09, lz);
      root.add(dropped);
    } else if (a.left === 'queue') {
      const rope: V3[] = [];
      for (let i = 0; i < 4; i++) {
        const x = lx - 1 + i * 0.7, z = lz + (i % 2 ? 0.45 : -0.2);
        rounds.add(flat, [0.035, 0.95, 0.035], [x, 0.475, z], BRASS);
        rounds.add(flat, [0.16, 0.05, 0.16], [x, 0.025, z], BRASS);
        rounds.add(flat, [0.07, 0.07, 0.07], [x, 0.98, z], BRASS);
        if (i) rope.push([x - 0.35, 0.68, (z + rope[rope.length - 1][2]) / 2]);
        rope.push([x, 0.9, z]);
      }
      s.tube(rope, 0.028, s.material('#a8262c'));
    } else if (a.left === 'spill') {
      const cog = gearGeometry(1, 10, 0.25, 0.22, 0, 0.22);
      const loose = new Batch(cog, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.45 }));
      for (let i = 0; i < 18; i++) {
        const reach = random() * 0.95, around = random() * 6.3, size = 0.07 + random() * 0.14;
        loose.raw(new THREE.Matrix4().compose(new THREE.Vector3(lx + Math.cos(around) * reach, size * 0.14, lz + Math.sin(around) * reach * 0.8), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + (random() - 0.5) * 0.3, 0, random() * 6)), new THREE.Vector3(size, size, size)), pick([BRASS, '#b5673c', '#8d8f8c', '#4c4640']));
      }
      loose.into(root);
      for (let n = 0; n < 2; n++) {
        const coil: V3[] = [], cx = lx + (random() - 0.5), cz = lz + (random() - 0.5) * 0.8, heading = random() * 3;
        for (let i = 0; i <= 40; i++) coil.push([cx + Math.cos(heading) * i * 0.012 + Math.sin(heading) * Math.cos(i * 0.9) * 0.08, 0.1 + Math.sin(i * 0.9) * 0.08, cz + Math.sin(heading) * i * 0.012 - Math.cos(heading) * Math.cos(i * 0.9) * 0.08]);
        s.tube(coil, 0.012, steel);
      }
    } else if (a.left === 'cart') {
      const frame = new THREE.Matrix4().makeRotationY(0.5 + random()).setPosition(lx, 0, lz);
      boxes.add(frame, [0.8, 0.1, 1.2], [0, 0.55, 0], tone('#7a5a40', 0.2));
      for (const side of [-1, 1]) {
        boxes.add(frame, [0.05, 0.3, 1.2], [side * 0.4, 0.72, 0], tone('#7a5a40', 0.2));
        boxes.add(frame, [0.05, 0.05, 0.8], [side * 0.36, 0.6, 0.95], d.trim, [-0.15, 0, 0]);
        rounds.add(frame, [0.42, 0.06, 0.42], [side * 0.47, 0.42, -0.1], '#2f2a27', [0, 0, Math.PI / 2]);
        rounds.add(frame, [0.1, 0.09, 0.1], [side * 0.48, 0.42, -0.1], BRASS, [0, 0, Math.PI / 2]);
      }
      boxes.add(frame, [0.06, 0.5, 0.06], [0, 0.25, 0.5], d.trim);
      for (let i = 0; i < 5; i++) {
        const x = (random() - 0.5) * 0.5, z = -0.45 + i * 0.22;
        rounds.add(frame, [0.1, 0.3, 0.1], [x, 0.75, z], pick([BRASS, '#b5673c', '#3f6a66']));
        rounds.add(frame, [0.03, 0.16, 0.03], [x + 0.1, 0.95, z], BRASS, [0, 0, -0.7]);
      }
    }

    for (const batch of [boxes, metal, rounds, lit, dark]) batch.into(root);

    world.update = (dt, time) => {
      for (const { object, axis, rate } of spins) object.rotation[axis] += rate * dt * pace;
      for (const step of tick) step(dt, time);
    };
    return world;
  },
});
