import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix, noul, visibleBounds } from '@conjure/kit';

const VOIDS = {
  milk: 'Warm milk white, like the inside of an eyelid in the morning.',
  sky: 'Pale washed blue, a cloudless height with no ground under it.',
  blush: 'Faint pink, tender and feverish, a remembered nursery.',
  mint: 'Pale hospital green, clean, waiting-room quiet.',
  lilac: 'Soft violet dusk, the hour of falling asleep.',
  fog: 'Even grey fog, flat and soundless.',
} as const;
const VOID_COLOURS: Record<keyof typeof VOIDS, [string, string, string]> = {
  milk: ['#f5f2ea', '#e2dbcc', '#c4b6a2'],
  sky: ['#eff4f7', '#cfdde8', '#aebbc8'],
  blush: ['#f7ecea', '#ebd0ca', '#cfaaa2'],
  mint: ['#eef4ef', '#d0e1d5', '#a9bdae'],
  lilac: ['#f2eff7', '#d9d1e9', '#b4a8cb'],
  fog: ['#ededea', '#d0d1ce', '#a9aaa6'],
};

type Tint = THREE.Color;
type P3 = readonly [number, number, number];
const UP = new THREE.Vector3(0, 1, 0);
const AXES: P3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const vec = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const AXIS_Z = vec(0, 0, 1);

/** Thousands of small blocks drawn as one mesh. */
class Batch {
  private list: { matrix: THREE.Matrix4; tint: Tint }[] = [];
  add(frame: THREE.Matrix4, at: P3, size: P3, tint: Tint, turn = 0) {
    const local = new THREE.Matrix4().compose(vec(...at), new THREE.Quaternion().setFromAxisAngle(AXIS_Z, turn), vec(...size));
    this.list.push({ matrix: frame.clone().multiply(local), tint });
  }
  build(geometry: THREE.BufferGeometry, material: THREE.Material) {
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(this.list.length, 1));
    mesh.count = this.list.length;
    this.list.forEach((entry, index) => {
      mesh.setMatrixAt(index, entry.matrix);
      mesh.setColorAt(index, entry.tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return mesh;
  }
}

const basis = (origin: THREE.Vector3, run: THREE.Vector3, up: THREE.Vector3) =>
  new THREE.Matrix4().makeBasis(run, up, new THREE.Vector3().crossVectors(run, up)).setPosition(origin);

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineWorld({
  questions: {
    stairs: choice('What are the stairs made of?', {
      plaster: 'Smooth solid blocks of pale plaster with low parapet walls, like an architect’s model or an Escher print.',
      house: 'The stairs of a childhood house: brown wooden treads, white risers, a carpet runner, turned balusters and a dark handrail.',
      floating: 'Thin open slate treads on a single spine with wire-thin rails, nothing underneath, modern and precarious.',
      school: 'Institutional terrazzo with dark nosing strips, checkered lino landings and painted steel pipe rails, a school or a hospital.',
    }),
    gravity: choice('Do the landings agree about which way is down?', {
      agreed: 'Yes. The stairs tangle, but everyone stands the same way up.',
      sideways: 'One landing is a wall: whatever stands on it sticks straight out sideways, unbothered.',
      overhead: 'One landing hangs upside down overhead, and what stands on it hangs like a bat.',
      every: 'No two agree: one stands sideways, another hangs overhead, the rest keep to the floor.',
    }),
    hush: choice('What colour is the void?', VOIDS),
    ends: choice('Where do the flights that lead away end up?', {
      fade: 'They simply pale and dissolve into the void, step by step.',
      broken: 'They snap off in mid-air, the last few steps tumbling loose and never landing.',
      door: 'Each one ends at a closed door standing in its frame with nothing behind it.',
      fold: 'Each one grows a second staircase on its own underside, running back the way it came.',
    }),
    hung: choice('What hangs in the void where a wall ought to be?', {
      nothing: 'Nothing. Only stairs.',
      clock: 'A big round wall clock with no wall, its hands insisting you are late.',
      exit: 'A glowing green EXIT sign whose arrow points somewhere that is not a way out.',
      window: 'A sash window frame floating alone, warm light behind its panes and a curtain lifting.',
      portraits: 'A drift of framed family portraits hung crooked, their faces blank ovals.',
    }),
    left: choice('What has been left behind on the stairs?', {
      nothing: 'Nothing. No one has been here, or everyone has gone.',
      papers: 'Loose sheets of paper drifting through the air, homework or exam pages that got away.',
      shoes: 'A child’s red shoes, dropped one at a time on the way up.',
      suitcase: 'A packed suitcase with a hat on it, set down on a landing and not collected.',
      balloon: 'A single red balloon tied to the edge of a landing, tugging upward.',
      footprints: 'A trail of dark wet footprints climbing from one flight to the next.',
    }),
    view: choice('Where is the dreamer looking from?', {
      survey: 'Floating level with it at a calm three-quarter angle, like looking at a model.',
      below: 'From low down, looking across and up: the flights stack overhead.',
      above: 'From high above, looking steeply down into the tangle.',
    }),
    rails: noul('Is there anything to hold on to: handrails, balusters or parapets?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const [topHex, bottomHex, stoneHex] = VOID_COLOURS[a.hush];
    const warmShift = (colour: THREE.Color) => colour.offsetHSL((mood.warmth - 0.5) * -0.035, 0, (mood.cheer - 0.5) * 0.03);
    const top = warmShift(new THREE.Color(topHex)), bottom = warmShift(new THREE.Color(bottomHex));
    const stone = warmShift(new THREE.Color(stoneHex)).multiplyScalar(0.76).lerp(new THREE.Color("#8b8478"), mood.wear * 0.25);
    const background = top.clone().lerp(bottom, 0.5);
    const hazeAt = (colour: Tint, amount: number) => colour.clone().lerp(background, clamp01(amount));

    // Soft, nearly shadowless light.
    root.add(new THREE.HemisphereLight('#ffffff', bottom.clone().multiplyScalar(0.6), 1.2));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.6, 0.09, mood.warmth), 0.35, 0.9), 2.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 6;
    key.shadow.intensity = 0.32;
    root.add(key, key.target);

    const yaw = THREE.MathUtils.degToRad(30 + (random() - 0.5) * 8);
    const pitch = THREE.MathUtils.degToRad({ survey: 25, below: 11, above: 42 }[a.view]);
    const toCamera = vec(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const screenX = new THREE.Vector3().crossVectors(UP, toCamera).normalize();
    const screenY = new THREE.Vector3().crossVectors(toCamera, screenX).normalize();
    const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 400);

    // Palette for the chosen kind of stair.
    const c = (hex: string) => new THREE.Color(hex);
    const cheerRed = c('#6d6f6a').lerp(c('#bb2f2c'), clamp01(mood.cheer * 1.3 + 0.2));
    const kit = {
      plaster: { tread: stone.clone(), riser: stone.clone(), trim: stone.clone().multiplyScalar(0.9), rail: stone.clone().multiplyScalar(0.94), floor: stone.clone(), alt: stone.clone() },
      house: { tread: c('#8a5a3a'), riser: c('#eee7d8'), trim: c('#eee7d8'), rail: c('#4b2f20'), floor: c('#94643f'), alt: c('#7d5133') },
      floating: { tread: c('#737b84').lerp(stone, 0.25), riser: c('#737b84'), trim: c('#555b63'), rail: c('#555b63'), floor: c('#7f878f').lerp(stone, 0.25), alt: c('#7f878f') },
      school: { tread: c('#a8aa9c'), riser: c('#a8aa9c'), trim: mood.cheer > 0.55 ? c('#d2a52c') : c('#3c3e3b'), rail: c('#566069').lerp(c('#2f6fb0'), mood.cheer), floor: c('#bdbcab'), alt: c('#7d9186') },
    }[a.stairs];
    const runner = cheerRed;

    const blocks = new Batch(), posts = new Batch(), knobs = new Batch();
    const loose: { mesh: THREE.Mesh; home: THREE.Vector3; axis: THREE.Vector3; phase: number }[] = [];
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const paintMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82 });

    interface FlightOptions { haze?: number; dissolve?: boolean; rails?: boolean; cut?: number; sturdy?: boolean }
    /** Steps climb along the frame's +x and rise along its +y, starting level with the origin. */
    const flight = (frame: THREE.Matrix4, steps: number, tread: number, rise: number, width: number, o: FlightOptions = {}) => {
      const slope = Math.atan2(rise, tread), hyp = Math.hypot(tread, rise) * 1.03;
      const far = new THREE.Vector3().setFromMatrixColumn(frame, 2).dot(toCamera) > 0 ? -1 : 1;
      const rails = o.rails ?? a.rails;
      for (let i = 0; i < steps; i++) {
        if (o.cut !== undefined && i >= o.cut) break;
        const gone = !o.sturdy && random() < mood.wear * 0.13;
        const t = (i + 0.5) / steps;
        const haze = clamp01((o.haze ?? 0) + (o.dissolve ? t * t * 1.05 : 0));
        if (haze > 0.94) continue;
        const tint = (colour: Tint) => hazeAt(colour, haze);
        const x = (i + 0.5) * tread, y = (i + 1) * rise, mid = (i + 0.5) * rise;
        const sides = a.stairs === 'plaster' ? [far] : [-1, 1];
        if (a.stairs === 'plaster' || a.stairs === 'school') {
          if (!gone) blocks.add(frame, [x, y - rise * 1.15, 0], [tread, rise * 2.3, width], tint(kit.tread));
          if (a.stairs === 'school' && !gone) blocks.add(frame, [i * tread + 0.04, y + 0.008, 0], [0.08, 0.016, width], tint(kit.trim));
        } else if (a.stairs === 'house') {
          if (!gone) {
            blocks.add(frame, [x + 0.015, y - 0.02, 0], [tread + 0.03, 0.04, width], tint(kit.tread));
            blocks.add(frame, [x + 0.02, y + 0.005, 0], [tread + 0.035, 0.014, width * 0.5], tint(runner));
            blocks.add(frame, [i * tread - 0.006, y - rise / 2, 0], [0.014, rise, width * 0.5], tint(runner.clone().multiplyScalar(0.85)));
          }
          blocks.add(frame, [i * tread + 0.012, y - rise / 2 - 0.02, 0], [0.024, rise, width], tint(kit.riser));
          for (const side of [-1, 1]) blocks.add(frame, [x, mid - 0.1, side * (width / 2 + 0.02)], [hyp, 0.32, 0.04], tint(kit.trim), slope);
        } else {
          if (!gone) blocks.add(frame, [x, y - 0.03, 0], [tread * 0.8, 0.06, width], tint(kit.tread));
          blocks.add(frame, [x, mid - 0.13, 0], [hyp, 0.14, 0.18], tint(kit.trim), slope);
        }
        if (!rails) continue;
        for (const side of sides) {
          const z = side * (width / 2 - 0.05);
          if (a.stairs === 'plaster') blocks.add(frame, [x, mid + 0.36, side * (width / 2 - 0.07)], [hyp, 0.86, 0.14], tint(kit.rail), slope);
          else {
            const every = a.stairs === 'house' ? 1 : a.stairs === 'floating' ? 2 : 3;
            const thick = a.stairs === 'house' ? 0.024 : a.stairs === 'floating' ? 0.012 : 0.022;
            if (i % every === 0) posts.add(frame, [x, y + 0.44, z], [thick, 0.88, thick], tint(a.stairs === 'house' ? kit.riser : kit.rail));
            const bar = a.stairs === 'house' ? 0.075 : a.stairs === 'floating' ? 0.028 : 0.05;
            blocks.add(frame, [x, mid + 0.92, z], [hyp, bar * 0.85, bar], tint(kit.rail), slope);
          }
        }
      }
    };

    type Edge = '+x' | '-x' | '+z' | '-z';
    /** A platform whose top surface is the frame's y = 0 plane. */
    const landing = (frame: THREE.Matrix4, w: number, d: number, edges: readonly Edge[], haze = 0, slab = true) => {
      const tint = (colour: Tint) => hazeAt(colour, haze);
      const thickness = a.stairs === 'floating' ? 0.1 : 0.26;
      if (slab) blocks.add(frame, [0, -thickness / 2, 0], [w, thickness, d], tint(a.stairs === 'house' ? kit.riser : kit.floor));
      if (a.stairs === 'house' && haze < 0.4) {
        const boards = Math.round(d / 0.2);
        for (let i = 0; i < boards; i++) blocks.add(frame, [0, 0.006, -d / 2 + (i + 0.5) * (d / boards)], [w - 0.02, 0.014, d / boards - 0.012], tint(i % 3 === 1 ? kit.alt : kit.floor));
        blocks.add(frame, [0, 0.018, 0], [w * 0.56, 0.012, d * 0.56], tint(runner));
        blocks.add(frame, [0, 0.022, 0], [w * 0.46, 0.012, d * 0.46], tint(runner.clone().lerp(c('#e9dcc0'), 0.35)));
      }
      if (a.stairs === 'school' && haze < 0.4) {
        const nx = Math.round(w / 0.45), nz = Math.round(d / 0.45);
        for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++)
          if ((ix + iz) % 2 === 0) blocks.add(frame, [-w / 2 + (ix + 0.5) * (w / nx), 0.006, -d / 2 + (iz + 0.5) * (d / nz)], [w / nx - 0.01, 0.012, d / nz - 0.01], tint(kit.alt));
      }
      if (a.stairs === 'floating') blocks.add(frame, [0, -0.2, 0], [w * 0.5, 0.2, 0.2], tint(kit.trim));
      if (!a.rails) return;
      for (const edge of edges) {
        const alongX = edge.endsWith('z'), sign = edge.startsWith('+') ? 1 : -1;
        const length = alongX ? w : d, inset = (alongX ? d : w) / 2 - 0.07;
        const at = (along: number, y: number): P3 => (alongX ? [along, y, sign * inset] : [sign * inset, y, along]);
        const size = (along: number, y: number, across: number): P3 => (alongX ? [along, y, across] : [across, y, along]);
        if (a.stairs === 'plaster') { blocks.add(frame, at(0, 0.43), size(length, 0.86, 0.14), tint(kit.rail)); continue; }
        const gap = a.stairs === 'house' ? 0.2 : a.stairs === 'floating' ? 0.5 : 0.8;
        const thick = a.stairs === 'house' ? 0.024 : a.stairs === 'floating' ? 0.012 : 0.022;
        const count = Math.round(length / gap);
        for (let i = 0; i <= count; i++) posts.add(frame, at(-length / 2 + 0.05 + i * ((length - 0.1) / count), 0.44), [thick, 0.88, thick], tint(a.stairs === 'house' ? kit.riser : kit.rail));
        const bar = a.stairs === 'house' ? 0.075 : a.stairs === 'floating' ? 0.028 : 0.05;
        blocks.add(frame, at(0, 0.9), size(length, bar * 0.85, bar), tint(kit.rail));
        if (a.stairs === 'school') blocks.add(frame, at(0, 0.45), size(length, 0.04, 0.04), tint(kit.rail));
        if (a.stairs === 'house') for (const end of [-1, 1]) {
          blocks.add(frame, at(end * (length / 2 - 0.05), 0.52), [0.11, 1.04, 0.11], tint(kit.riser));
          knobs.add(frame, at(end * (length / 2 - 0.05), 1.1), [0.075, 0.075, 0.075], tint(kit.rail));
        }
      }
    };

    /** A flight joining a lower point to a higher one. */
    const connect = (from: P3, to: P3, width: number) => {
      const start = vec(...from), flat = vec(to[0] - from[0], 0, to[2] - from[2]);
      const steps = Math.max(2, Math.round((to[1] - from[1]) / 0.18));
      flight(basis(start, flat.clone().normalize(), UP), steps, flat.length() / steps, (to[1] - from[1]) / steps, width, { sturdy: true });
    };

    const doorTint = c('#5f6b6a').lerp(c('#2f7f86'), mood.cheer).lerp(c('#b9482f'), mood.warmth * 0.6);
    /** A flight that leads away from the cast and ends the way the dream decides. */
    const wander = (origin: THREE.Vector3, run: THREE.Vector3, up: THREE.Vector3, steps: number, width: number, haze = 0, descending = false) => {
      const tread = 0.29, rise = 0.18;
      let frame = basis(origin, run, up);
      // A descending flight is built from its lower end and climbs back to the origin.
      if (descending) frame = basis(origin.clone().addScaledVector(run, steps * tread).addScaledVector(up, -steps * rise), run.clone().negate(), up);
      const tip = descending ? [0, 0, 0] as P3 : [steps * tread, steps * rise, 0] as P3;
      const outward = descending ? -1 : 1;
      if (a.ends === 'fade' && !descending) flight(frame, steps, tread, rise, width, { haze, dissolve: true });
      else if (a.ends === 'fade') {
        // Dissolving downward: fade the low end by hazing in bands.
        const bands = 4, per = Math.ceil(steps / bands);
        for (let band = 0; band < bands; band++) {
          const lift = new THREE.Matrix4().makeTranslation(band * per * tread, band * per * rise, 0);
          flight(frame.clone().multiply(lift), Math.min(per, steps - band * per), tread, rise, width, { haze: clamp01(haze + (1 - band / bands) ** 2 * 0.95) });
        }
      } else if (a.ends === 'broken') {
        const lost = 2 + Math.floor(random() * 3);
        if (descending) {
          const lift = new THREE.Matrix4().makeTranslation(lost * tread, lost * rise, 0);
          flight(frame.clone().multiply(lift), steps - lost, tread, rise, width, { haze });
        } else flight(frame, steps, tread, rise, width, { haze, cut: steps - lost });
        for (let i = 0; i < lost; i++) {
          const mesh = new THREE.Mesh(blockGeometry, new THREE.MeshStandardMaterial({ color: hazeAt(kit.tread, haze), roughness: 0.82 }));
          mesh.scale.set(tread, a.stairs === 'plaster' || a.stairs === 'school' ? rise * 1.6 : 0.06, width * mix(0.6, 1, random()));
          const along = descending ? lost - 1 - i : steps - lost + i;
          const home = vec((along + 0.5) * tread + outward * (0.2 + i * 0.35), (along + 1) * rise - 0.3 - i * mix(0.25, 0.7, random()), (random() - 0.5) * 0.8).applyMatrix4(frame);
          mesh.position.copy(home);
          mesh.quaternion.setFromRotationMatrix(frame).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 2, random() * 2, random() * 2)));
          mesh.castShadow = true;
          root.add(mesh);
          loose.push({ mesh, home, axis: vec(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), phase: random() * 6 });
        }
      } else if (a.ends === 'door') {
        flight(frame, steps, tread, rise, width, { haze });
        const pad = new THREE.Matrix4().makeTranslation(tip[0] + outward * 0.6, tip[1], 0);
        const there = frame.clone().multiply(pad);
        landing(there, 1.2, width, [], haze);
        const tint = (colour: Tint) => hazeAt(colour, haze);
        const x = outward * 0.42;
        for (const side of [-1, 1]) blocks.add(there, [x, 1.06, side * 0.5], [0.12, 2.12, 0.1], tint(kit.riser.clone().lerp(c('#f2ede2'), 0.6)));
        blocks.add(there, [x, 2.17, 0], [0.12, 0.1, 1.1], tint(kit.riser.clone().lerp(c('#f2ede2'), 0.6)));
        blocks.add(there, [x, 1.03, 0], [0.055, 2.02, 0.9], tint(doorTint));
        for (const [y, h] of [[1.5, 0.7], [0.55, 0.6]] as const) blocks.add(there, [x - outward * 0.03, y, 0], [0.02, h, 0.62], tint(doorTint.clone().multiplyScalar(0.84)));
        knobs.add(there, [x - outward * 0.07, 1.0, 0.34], [0.045, 0.045, 0.045], tint(c('#c9a24a')));
      } else {
        flight(frame, steps, tread, rise, width, { haze });
        const under = basis(vec(steps * tread, steps * rise - 0.62, 0).applyMatrix4(frame), new THREE.Vector3().setFromMatrixColumn(frame, 0).negate(), new THREE.Vector3().setFromMatrixColumn(frame, 1).negate());
        flight(under, steps, tread, rise, width, { haze: haze + 0.12, rails: false });
      }
    };

    // The landings the cast stands on. Hero first; the others are reached by sound flights.
    const H = { at: vec(0, 0, 1.2), w: 4.6, d: 4.0 };
    const A = { at: vec(-6.4, 1.8, -1.6), w: 3.2, d: 3.2 };
    const B = { at: vec(5.6, 1.08, 0.4), w: 3.2, d: 3.2 };
    const C = { at: vec(-2.6, -1.62, 6.8), w: 3.2, d: 3.0 };
    const S = { at: vec(-1.3, 3.9, -4.9), w: 3.2, d: 3.4 };
    const O = { at: vec(-4.8, 7.6, -3.8), w: 3.2, d: 3.2 };
    const level = (p: THREE.Vector3) => basis(p, vec(1, 0, 0), UP);
    const sideFrame = basis(S.at, vec(0, 0, 1), vec(1, 0, 0));
    const overFrame = basis(O.at, vec(1, 0, 0), vec(0, -1, 0));

    const thickness = a.stairs === 'floating' ? 0.1 : 0.26;
    const ground = new THREE.Mesh(new THREE.BoxGeometry(H.w, thickness, H.d), new THREE.MeshStandardMaterial({ color: a.stairs === 'house' ? kit.riser : kit.floor, roughness: 0.85 }));
    ground.position.set(H.at.x, -thickness / 2, H.at.z);
    ground.castShadow = ground.receiveShadow = true;
    root.add(ground);
    landing(level(H.at), H.w, H.d, [], 0, false);
    landing(level(A.at), A.w, A.d, ['-z'], 0);
    landing(level(B.at), B.w, B.d, ['-z'], 0);
    landing(level(C.at), C.w, C.d, [], 0);
    landing(sideFrame, S.w, S.d, ['-x'], 0);
    landing(overFrame, O.w, O.d, ['-z'], 0);

    connect([2.3, 0, 0.8], [4.0, 1.08, 0.5], 1.5);
    connect([-2.3, 0, 0.2], [-4.8, 1.8, -1.2], 1.5);
    connect([-1.9, -1.62, 5.3], [-1.2, 0, 3.2], 1.5);
    // The hero landing's own back stair climbs straight into the foot of the sideways landing.
    connect([-0.35, 0, -0.8], [-0.35, 2.2, -4.0], 1.5);

    wander(vec(-8.0, 1.8, -1.6), vec(-1, 0, 0), UP, 13, 1.5);
    wander(vec(7.2, 1.08, 0.4), vec(1, 0, 0), UP, 12, 1.5);
    wander(vec(-4.2, -1.62, 6.8), vec(-1, 0, 0), UP, 11, 1.5, 0, true);
    wander(vec(-1.3, 5.6, -4.9), vec(0, 1, 0), vec(1, 0, 0), 11, 1.5);
    wander(vec(-6.4, 7.6, -3.8), vec(-1, 0, 0), vec(0, -1, 0), 10, 1.5);

    // Where each guest stands, and which way is up for it.
    interface Slot { at: THREE.Vector3; up: THREE.Vector3; turn: THREE.Quaternion; height: number; radius: number }
    const upright = new THREE.Quaternion();
    const slot = (at: THREE.Vector3, up: THREE.Vector3, turn: THREE.Quaternion, height = 2.2, radius = 1.15): Slot => ({ at, up, turn, height, radius });
    const hero = slot(H.at, UP, upright, 2.7, 1.5);
    const sA = slot(A.at, UP, upright), sB = slot(B.at, UP, upright), sC = slot(C.at, UP, upright);
    const sS = slot(S.at, vec(1, 0, 0), new THREE.Quaternion().setFromAxisAngle(AXIS_Z, -Math.PI / 2));
    const sO = slot(O.at, vec(0, -1, 0), new THREE.Quaternion().setFromAxisAngle(AXIS_Z, Math.PI));
    const slots = { agreed: [hero, sB, sA, sC], sideways: [hero, sB, sS, sA, sC], overhead: [hero, sB, sO, sA, sC], every: [hero, sS, sO, sB, sA, sC] }[a.gravity];

    // Screen-space keep-out so stray stairs never pass in front of anyone.
    const seen = (p: THREE.Vector3) => ({ x: p.dot(screenX), y: p.dot(screenY), depth: p.dot(toCamera) });
    const guarded = [hero, sA, sB, sC, sS, sO].map((s) => ({ ...seen(s.at.clone().addScaledVector(s.up, s.height / 2)), reach: s.height / 2 + 0.7 }));
    const blocked = (p: THREE.Vector3, margin = 0) => {
      const q = seen(p);
      return guarded.some((g) => Math.abs(q.x - g.x) < g.reach + margin && Math.abs(q.y - g.y) < g.reach + margin && q.depth > g.depth - 2.5);
    };
    const perpendicular = (run: P3) => AXES.filter((axis) => axis[0] * run[0] + axis[1] * run[1] + axis[2] * run[2] === 0);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // Stray flights near the cast, at every wrong angle.
    const strays = Math.round(mix(2, 7, mood.density));
    for (let made = 0, tries = 0; made < strays && tries < 140; tries++) {
      const run = pick(AXES), up = pick(perpendicular(run));
      const steps = 8 + Math.floor(random() * 8), width = mix(1.2, 1.7, random());
      const origin = vec(mix(-11, 11, random()), mix(-5, 10, random()), mix(-10, 5, random()));
      const runV = vec(...run), upV = vec(...up);
      const end = origin.clone().addScaledVector(runV, steps * 0.29).addScaledVector(upV, steps * 0.18);
      let clear = true;
      for (let k = 0; k <= 8 && clear; k++) clear = !blocked(origin.clone().lerp(end, k / 8), 1.3);
      // Keep them out of the solid landings too.
      for (const land of [H, A, B, C, S, O]) if (origin.clone().lerp(end, 0.5).distanceTo(land.at) < 4.2) clear = false;
      if (!clear) continue;
      const startFrame = basis(origin.clone().addScaledVector(runV, -0.7), runV, upV);
      landing(startFrame, 1.4, width, [], 0.12);
      wander(origin, runV, upV, steps, width, 0.12);
      made++;
    }

    // Distant chains of stairs paling into the void: the endlessness.
    const centre = vec(0, 2.6, 0);
    const chains = Math.round(mix(4, 9, mood.density));
    const savedRails = a.rails;
    for (let chain = 0; chain < chains; chain++) {
      const depth = mix(15, 46, random());
      const haze = mix(0.58, 0.88, (depth - 15) / 31);
      let cursor = centre.clone().addScaledVector(screenX, mix(-15, 15, random())).addScaledVector(screenY, mix(-12, 13, random())).addScaledVector(toCamera, -depth);
      const size = mix(0.9, 1.5, random());
      const legs = 2 + Math.floor(random() * 2);
      for (let leg = 0; leg < legs; leg++) {
        const run = pick(AXES), up = pick(perpendicular(run));
        const steps = 8 + Math.floor(random() * 9), width = 1.5 * size;
        const runV = vec(...run), upV = vec(...up);
        const frame = basis(cursor, runV, upV);
        landing(basis(cursor.clone().addScaledVector(runV, -width * 0.5), runV, upV), width, width, [], haze);
        flight(frame, steps, 0.29 * size, 0.18 * size, width, { haze, rails: savedRails && a.stairs !== 'house' && leg % 2 === 0, sturdy: true });
        cursor = cursor.clone().addScaledVector(runV, steps * 0.29 * size + width * 0.5).addScaledVector(upV, steps * 0.18 * size);
      }
    }

    const postGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
    const knobGeometry = new THREE.SphereGeometry(1, 12, 8);
    root.add(blocks.build(blockGeometry, paintMaterial), posts.build(postGeometry, paintMaterial), knobs.build(knobGeometry, paintMaterial));

    // Things hung where a wall ought to be.
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const solid = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.7, ...options });
    const hangSpots: P3[] = [[4.9, 4.9, -2.6], [5.6, -1.9, 5.2], [-8.6, 4.6, -5.5]];
    const swingers: THREE.Object3D[] = [];
    const hang = (index: number, size: number) => {
      const group = new THREE.Group();
      group.position.set(...hangSpots[index]);
      group.rotation.set(0, yaw, (random() - 0.5) * mix(0.05, 0.5, mood.wear));
      group.scale.setScalar(size);
      root.add(group);
      return group;
    };
    if (a.hung === 'clock') {
      [1.5, 0.9].forEach((size, index) => {
        const g = hang(index, size);
        const hour = Math.floor(random() * 12);
        const face = paint(256, 256, (ctx) => {
          ctx.fillStyle = '#f4efe2'; ctx.fillRect(0, 0, 256, 256);
          ctx.fillStyle = '#22262a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 26px serif';
          for (let n = 1; n <= 12; n++) ctx.fillText(String(n), 128 + Math.sin(n * Math.PI / 6) * 98, 128 - Math.cos(n * Math.PI / 6) * 98);
          const hand = (angle: number, length: number, thick: number, colour = '#22262a') => {
            ctx.strokeStyle = colour; ctx.lineWidth = thick; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(128, 128);
            ctx.lineTo(128 + Math.sin(angle) * length, 128 - Math.cos(angle) * length); ctx.stroke();
          };
          hand((hour + 0.95) * Math.PI / 6, 56, 9); hand(-0.18 - index * 0.5, 88, 6); hand(random() * 6, 92, 2, '#b3261e');
          ctx.beginPath(); ctx.arc(128, 128, 7, 0, 7); ctx.fill();
        });
        part(g, new THREE.CylinderGeometry(0.62, 0.62, 0.12, 40), solid('#2c3136'), [0, 0, 0]).rotation.x = Math.PI / 2;
        part(g, new THREE.CircleGeometry(0.55, 40), new THREE.MeshStandardMaterial({ map: face, roughness: 0.6 }), [0, 0, 0.065]);
      });
    } else if (a.hung === 'exit') {
      [1.3, 0.8].forEach((size, index) => {
        const g = hang(index, size);
        const sign = paint(512, 200, (ctx) => {
          ctx.fillStyle = '#0f7a43'; ctx.fillRect(0, 0, 512, 200);
          ctx.fillStyle = '#f2fff4'; ctx.font = 'bold 120px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('EXIT', 28, 106);
          ctx.save(); ctx.translate(410, 100); ctx.rotate([-Math.PI / 2, Math.PI / 2, Math.PI, -2.4][Math.floor(random() * 4)]);
          ctx.beginPath(); ctx.moveTo(-60, -16); ctx.lineTo(10, -16); ctx.lineTo(10, -46); ctx.lineTo(62, 0); ctx.lineTo(10, 46); ctx.lineTo(10, 16); ctx.lineTo(-60, 16); ctx.closePath(); ctx.fill(); ctx.restore();
        });
        part(g, new THREE.BoxGeometry(1.4, 0.58, 0.12), solid('#d9dbd6'), [0, 0, 0]);
        part(g, new THREE.PlaneGeometry(1.3, 0.5), new THREE.MeshStandardMaterial({ map: sign, emissiveMap: sign, emissive: '#ffffff', emissiveIntensity: mix(0.25, 0.8, 1 - mood.wear), roughness: 0.5 }), [0, 0, 0.062]);
        for (const x of [-0.5, 0.5]) part(g, new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), solid('#6c7075'), [x, 0.64, 0]);
      });
    } else if (a.hung === 'window') {
      [1.25, 0.8].forEach((size, index) => {
        const g = hang(index, size);
        const wood = solid('#f1ece0');
        const glow = new THREE.Color().setHSL(mix(0.56, 0.11, mood.warmth), 0.75, 0.7);
        part(g, new THREE.PlaneGeometry(1.2, 1.9), new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 0.7, roughness: 0.3, side: THREE.DoubleSide }), [0, 0, 0]);
        for (const x of [-0.65, 0.65]) part(g, new THREE.BoxGeometry(0.12, 2.14, 0.14), wood, [x, 0, 0]);
        for (const y of [-1.0, 0, 1.0]) part(g, new THREE.BoxGeometry(1.42, y === 0 ? 0.08 : 0.12, 0.14), wood, [0, y, 0]);
        part(g, new THREE.BoxGeometry(0.05, 1.9, 0.06), wood, [0, 0, 0.03]);
        part(g, new THREE.BoxGeometry(1.6, 0.06, 0.26), wood, [0, -1.08, 0.08]);
        const curtain = part(g, new THREE.PlaneGeometry(0.62, 1.95, 6, 1), solid(cheerRed.clone().lerp(c('#f3ead8'), 0.55), { side: THREE.DoubleSide }), [-0.4, 0, 0.12]);
        const wave = curtain.geometry.getAttribute('position');
        for (let i = 0; i < wave.count; i++) wave.setZ(i, Math.sin(wave.getX(i) * 22) * 0.05 + (wave.getY(i) < 0 ? 0.25 * -wave.getY(i) : 0));
        curtain.geometry.computeVertexNormals();
        curtain.rotation.z = 0.12;
        swingers.push(curtain);
      });
    } else if (a.hung === 'portraits') {
      const count = 3 + Math.round(mood.density * 3);
      for (let i = 0; i < count; i++) {
        const g = hang(i % 3, 1);
        g.position.add(vec((random() - 0.5) * 2.4, (random() - 0.5) * 2.2, (random() - 0.5) * 1.5));
        g.rotation.z = (random() - 0.5) * 0.5;
        const w = mix(0.6, 1.0, random()), h = mix(0.8, 1.3, random());
        const sitter = paint(128, 160, (ctx) => {
          ctx.fillStyle = ['#6f7f78', '#8a6f5c', '#59607a', '#7b6a7c'][Math.floor(random() * 4)]; ctx.fillRect(0, 0, 128, 160);
          ctx.fillStyle = '#2c2a2a'; ctx.beginPath(); ctx.ellipse(64, 170, 52, 62, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#e9ddd0'; ctx.beginPath(); ctx.ellipse(64, 70, 26, 34, 0, 0, 7); ctx.fill();
        });
        part(g, new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.06), solid(i % 2 ? '#3a2a1e' : '#b08d3c', { metalness: i % 2 ? 0 : 0.5 }), [0, 0, 0]);
        part(g, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: sitter, roughness: 0.8 }), [0, 0, 0.034]);
      }
    }

    // What was left behind.
    let balloon: THREE.Group | null = null;
    let sheets: THREE.InstancedMesh | null = null;
    const sheetHomes: { at: THREE.Vector3; spin: THREE.Euler; phase: number }[] = [];
    if (a.left === 'suitcase') {
      const g = new THREE.Group();
      g.position.set(-1.75, 0, 2.75);
      g.rotation.y = 0.5 + random() * 0.5;
      const leather = solid(c('#7a4b2c').lerp(c('#55606a'), 1 - mood.warmth));
      part(g, new THREE.BoxGeometry(0.8, 0.52, 0.26), leather, [0, 0.27, 0]);
      for (const x of [-0.25, 0.25]) part(g, new THREE.BoxGeometry(0.06, 0.54, 0.275), solid('#3a2416'), [x, 0.27, 0]);
      part(g, new THREE.TorusGeometry(0.09, 0.016, 6, 16, Math.PI), solid('#3a2416'), [0, 0.53, 0]);
      part(g, new THREE.CylinderGeometry(0.2, 0.2, 0.012, 20), solid('#34363a'), [0.12, 0.6, 0]);
      part(g, new THREE.CylinderGeometry(0.11, 0.12, 0.12, 20), solid('#34363a'), [0.12, 0.66, 0]);
      root.add(g);
    } else if (a.left === 'balloon') {
      balloon = new THREE.Group();
      balloon.position.set(2.2, 0, -0.65);
      const red = solid(c('#c9302c').lerp(c('#8d8f93'), (1 - mood.cheer) * 0.5), { roughness: 0.25 });
      part(balloon, new THREE.SphereGeometry(0.34, 20, 14), red, [0, 2.75, 0]).scale.y = 1.18;
      part(balloon, new THREE.ConeGeometry(0.05, 0.08, 8), red, [0, 2.32, 0]);
      part(balloon, new THREE.CylinderGeometry(0.008, 0.008, 2.3, 5), solid('#f4f1ea'), [0, 1.15, 0]);
      root.add(balloon);
    } else if (a.left === 'shoes' || a.left === 'footprints') {
      const marks = new Batch();
      const prints = a.left === 'footprints';
      const tone = prints ? kit.floor.clone().multiplyScalar(0.42) : c('#c2281f');
      const trail: THREE.Vector3[] = [];
      // Up the front flight, across the hero landing's left side and up the left flight.
      for (let i = 0; i < 9; i++) trail.push(vec(-1.9 + i * 0.078, -1.62 + (i + 1) * 0.18, 5.3 - (i + 0.5) * 0.233));
      for (let i = 0; i < 5; i++) trail.push(vec(mix(-1.3, -2.0, i / 4), 0, mix(2.9, 0.5, i / 4)));
      for (let i = 0; i < 10; i++) trail.push(vec(-2.3 - (i + 0.5) * 0.25, (i + 1) * 0.18, 0.2 - (i + 0.5) * 0.14));
      trail.forEach((p, index) => {
        if (!prints && index % 5 !== 2) return;
        const side = index % 2 ? 0.13 : -0.13;
        const next = trail[Math.min(index + 1, trail.length - 1)], before = trail[Math.max(index - 1, 0)];
        const heading = vec(next.x - before.x, 0, next.z - before.z).normalize();
        const across = new THREE.Vector3().crossVectors(UP, heading);
        const frame = basis(p.clone().addScaledVector(across, side), heading, UP);
        if (prints) {
          marks.add(frame, [0, 0.016, 0], [0.2, 0.006, 0.1], tone);
          marks.add(frame, [-0.15, 0.016, 0], [0.07, 0.006, 0.075], tone);
        } else {
          const tumble = (random() - 0.5) * 1.2;
          const shoe = frame.clone().multiply(new THREE.Matrix4().makeRotationY(tumble));
          marks.add(shoe, [0, 0.05, 0], [0.3, 0.07, 0.12], tone);
          marks.add(shoe, [-0.07, 0.11, 0], [0.15, 0.08, 0.115], tone);
          marks.add(shoe, [0, 0.012, 0], [0.31, 0.024, 0.125], c('#efe6d6'));
        }
      });
      root.add(marks.build(blockGeometry, paintMaterial));
    } else if (a.left === 'papers') {
      const count = Math.round(mix(18, 60, mood.density));
      for (let tries = 0; sheetHomes.length < count && tries < count * 12; tries++) {
        const at = vec(mix(-10, 10, random()), mix(-4, 10, random()), mix(-7, 8, random()));
        if (blocked(at, 0.2)) continue;
        sheetHomes.push({ at, spin: new THREE.Euler(random() * 3, random() * 6, random() * 3), phase: random() * 6 });
      }
      sheets = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.34, 0.46), new THREE.MeshStandardMaterial({ color: '#fbf9f2', roughness: 0.9, side: THREE.DoubleSide }), sheetHomes.length);
      sheets.castShadow = true;
      sheets.frustumCulled = false;
      root.add(sheets);
    }
    const sheetMatrix = new THREE.Matrix4(), sheetTurn = new THREE.Quaternion(), sheetEuler = new THREE.Euler(), sheetAt = new THREE.Vector3(), ONE = vec(1, 1, 1);
    const drift = (time: number) => {
      if (!sheets) return;
      sheetHomes.forEach((sheet, index) => {
        sheetEuler.set(sheet.spin.x + time * 0.5, sheet.spin.y + time * 0.3, sheet.spin.z + Math.sin(time + sheet.phase) * 0.4);
        sheetAt.copy(sheet.at);
        sheetAt.y += Math.sin(time * 0.7 + sheet.phase) * 0.25;
        sheets!.setMatrixAt(index, sheetMatrix.compose(sheetAt, sheetTurn.setFromEuler(sheetEuler), ONE));
      });
      sheets.instanceMatrix.needsUpdate = true;
    };
    drift(0);

    // The horizonless gradient, far behind everything and never measured as solid.
    const gradient = paint(8, 256, (ctx, w, h) => {
      const fill = ctx.createLinearGradient(0, 0, 0, h);
      const high = mood.daylight > 0.75 ? bottom : top, low = mood.daylight > 0.75 ? top : bottom;
      fill.addColorStop(0, `#${high.getHexString()}`);
      fill.addColorStop(0.5, `#${background.getHexString()}`);
      fill.addColorStop(1, `#${low.getHexString()}`);
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, w, h);
    });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: gradient, depthWrite: false, toneMapped: false, fog: false }));
    backdrop.renderOrder = -10;
    backdrop.frustumCulled = false;
    root.add(backdrop);

    const landingBoxes = [H, A, B, C].map((land) => new THREE.Box3(vec(land.at.x - land.w / 2, land.at.y - 0.3, land.at.z - land.d / 2), vec(land.at.x + land.w / 2, land.at.y + 1.6, land.at.z + land.d / 2)));
    landingBoxes.push(new THREE.Box3(vec(S.at.x - 0.3, S.at.y - S.d / 2, S.at.z - S.w / 2), vec(S.at.x + 1.6, S.at.y + S.d / 2, S.at.z + S.w / 2)));
    landingBoxes.push(new THREE.Box3(vec(O.at.x - O.w / 2, O.at.y - 1.6, O.at.z - O.d / 2), vec(O.at.x + O.w / 2, O.at.y + 0.3, O.at.z + O.d / 2)));

    const speed = mix(0.15, 1.3, mood.energy);
    return {
      object: root,
      camera,
      background,
      capacity: slots.length,
      ground,
      keyLight: key,
      place(items: readonly Placeable[]) {
        const boxes = landingBoxes.map((box) => box.clone());
        items.forEach((item, index) => {
          const spot = slots[index % slots.length];
          const scale = Math.min(spot.height / Math.max(item.height, 0.05), spot.radius / Math.max(item.radius, 0.05));
          item.holder.scale.setScalar(scale);
          item.holder.position.copy(spot.at);
          item.holder.quaternion.copy(spot.turn).multiply(new THREE.Quaternion().setFromAxisAngle(UP, yaw * 0.5 + (random() - 0.5) * 0.3));
          item.holder.updateMatrixWorld(true);
          const box = visibleBounds(item.holder);
          if (!box.isEmpty()) boxes.push(box);
        });
        const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
        const middle3 = bounds.getCenter(new THREE.Vector3());
        camera.position.copy(middle3).addScaledVector(toCamera, 110);
        camera.lookAt(middle3);
        camera.updateMatrixWorld(true);
        const frame = new THREE.Box2(), corner = new THREE.Vector3();
        for (const box of boxes)
          for (const x of [box.min.x, box.max.x])
            for (const y of [box.min.y, box.max.y])
              for (const z of [box.min.z, box.max.z]) {
                corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
                frame.expandByPoint(new THREE.Vector2(corner.x, corner.y));
              }
        const middle = frame.getCenter(new THREE.Vector2());
        const extent = Math.max(...frame.getSize(new THREE.Vector2()).toArray()) * 0.53;
        camera.translateX(middle.x);
        camera.translateY(middle.y);
        camera.left = camera.bottom = -extent;
        camera.right = camera.top = extent;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        backdrop.position.copy(camera.position).addScaledVector(toCamera, -330);
        backdrop.quaternion.copy(camera.quaternion);
        backdrop.scale.set(extent * 2.2, extent * 2.2, 1);

        const span = bounds.getSize(new THREE.Vector3()).length();
        key.target.position.copy(middle3);
        key.position.copy(middle3).add(vec(mix(-7, 7, mood.daylight), 14, 6).normalize().multiplyScalar(span * 1.6));
        const shadow = key.shadow.camera;
        shadow.left = shadow.bottom = -span * 0.62;
        shadow.right = shadow.top = span * 0.62;
        shadow.near = 0.1;
        shadow.far = span * 4;
        shadow.updateProjectionMatrix();
      },
      update(_dt: number, time: number) {
        const t = time * speed;
        for (const piece of loose) {
          piece.mesh.position.copy(piece.home);
          piece.mesh.position.y += Math.sin(t * 0.8 + piece.phase) * 0.12;
          piece.mesh.rotateOnAxis(piece.axis, _dt * speed * 0.5);
        }
        if (balloon) balloon.rotation.set(Math.sin(t * 0.9) * 0.06, 0, Math.sin(t * 0.6 + 1) * 0.09);
        for (const curtain of swingers) curtain.rotation.z = 0.12 + Math.sin(t * 1.1) * 0.06;
        drift(t);
      },
      dispose() {
        key.shadow.map?.dispose();
        disposeTree(root);
      },
    };
  },
});
