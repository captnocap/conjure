import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const SEATS = {
  three: 'Three seats, a short row against a pillar.',
  four: 'Four seats, the standard run.',
  five: 'Five seats, a long unbroken bench of them.',
} as const;
const UPHOLSTERY = {
  'black-vinyl': 'Black padded vinyl on brushed steel, the international default.',
  'blue-fabric': 'Blue airline-carpet fabric pads, slightly pilled.',
  perforated: 'Bare perforated steel shells with no padding at all, cold to sit on.',
  'orange-shell': 'Moulded orange plastic shells from the 1970s.',
  'tan-leather': 'Tan leatherette pads with chrome arms, a lounge that was once smart.',
  'teal-vinyl': 'Teal vinyl pads on white frames, a regional airport refit.',
} as const;
const PAD: Record<keyof typeof UPHOLSTERY, { pad: string; frame: string; metal: number }> = {
  'black-vinyl': { pad: '#2c2f36', frame: '#b4babf', metal: 0.8 },
  'blue-fabric': { pad: '#33528f', frame: '#8f979d', metal: 0.7 },
  perforated: { pad: '#a9b0b4', frame: '#a9b0b4', metal: 0.85 },
  'orange-shell': { pad: '#e0732c', frame: '#4a4d52', metal: 0.4 },
  'tan-leather': { pad: '#b98a5c', frame: '#d7dcdf', metal: 0.9 },
  'teal-vinyl': { pad: '#2f8f8c', frame: '#e8e8e2', metal: 0.2 },
};
const LEFT = {
  nothing: 'Nothing at all. Wiped, empty, waiting.',
  coat: 'A coat folded over one seat back, its sleeve hanging.',
  pillow: 'A horseshoe neck pillow left on a seat.',
  coffee: "Someone's abandoned paper coffee cup, lid on, long cold.",
  newspaper: 'A newspaper opened and left tented over an armrest.',
  backpack: 'A backpack sitting upright in a seat as if it were a passenger.',
  flowers: 'A bunch of arrival flowers in cellophane, never handed over.',
  pass: 'A boarding pass and a passport lying on the seat.',
} as const;

export default defineThing({
  questions: {
    seats: choice('How many seats are on the beam?', SEATS),
    upholstery: choice('What are the seats made of?', UPHOLSTERY),
    left: choice('What was left on it?', LEFT),
    sleeper: noul('Is a traveller-shaped heap of coat sleeping across it?'),
    arms: choice('How are the armrests arranged?', {
      every: 'A fixed armrest between every seat, so nobody can lie flat.',
      ends: 'Armrests only at the two ends: a rare row you can stretch out on.',
    }),
    table: noul('Is one seat replaced by a small laminate side table?'),
    double: noul('Is it a double row, with a second set of seats back to back?'),
    reserved: choice('If one seat carries a sign or sticker, what is it?', {
      none: 'No sign on any seat.',
      priority: 'A blue priority-seating sticker on the end seat back.',
      tape: 'An X of hazard tape across one seat: do not sit here.',
      charging: 'A small green charging-point plate under one armrest.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = { three: 3, four: 4, five: 5 }[a.seats];
    const kit = PAD[a.upholstery];
    const pitch = 0.6;
    const width = n * pitch;
    const x0 = -width / 2 + pitch / 2;
    const frame = s.material(kit.frame, { metalness: kit.metal, roughness: 0.35 });
    const padMat = s.material(kit.pad, { roughness: a.upholstery === 'blue-fabric' ? 0.95 : 0.5, metalness: a.upholstery === 'perforated' ? 0.8 : 0 });
    const dark = s.material('#1d1f22', { roughness: 0.7 });
    const tableAt = a.table ? (random() < 0.5 ? 0 : n - 1) : -1;
    const rows = a.double ? [1, -1] : [1];
    const zOff = a.double ? 0.36 : 0;
    const shell = a.upholstery === 'perforated' || a.upholstery === 'orange-shell';

    // Beam, legs and floor feet.
    for (const dir of rows) s.box([width - 0.1, 0.07, 0.09], [0, 0.33, dir * zOff], frame);
    const legs = n >= 5 ? [-width / 2 + 0.35, 0, width / 2 - 0.35] : [-width / 2 + 0.35, width / 2 - 0.35];
    for (const x of legs) {
      s.box([0.06, 0.3, a.double ? 0.8 : 0.1], [x, 0.18, 0], frame);
      s.box([0.08, 0.035, a.double ? 1.25 : 0.62], [x, 0.018, a.double ? 0 : 0.02], frame);
      for (const z of a.double ? [-0.6, 0.6] : [-0.27, 0.31]) s.cylinder(0.03, 0.035, 0.012, [x, 0.006, z], dark, 10);
    }

    const seatTop = 0.44;
    const lean = 0.24;
    type Spot = { x: number; dir: number; index: number };
    const spots: Spot[] = [];
    for (const dir of rows) {
      for (let i = 0; i < n; i++) {
        const x = x0 + i * pitch;
        const zc = dir * zOff;
        if (dir === 1 && i === tableAt) {
          s.box([0.05, 0.14, 0.05], [x, 0.42, zc + 0.1], frame);
          s.mesh(new RoundedBoxGeometry(0.5, 0.035, 0.5, 2, 0.012), s.material('#d9d4c4', { roughness: 0.4 }), [x, 0.5, zc + 0.14]);
          s.box([0.51, 0.02, 0.51], [x, 0.485, zc + 0.14], dark);
          continue;
        }
        spots.push({ x, dir, index: i });
        const seat = new THREE.Group();
        seat.position.set(x, 0, zc);
        seat.rotation.y = dir === 1 ? 0 : Math.PI;
        s.root.add(seat);
        const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], rx = 0) => {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(...at);
          mesh.rotation.x = rx;
          mesh.castShadow = mesh.receiveShadow = true;
          seat.add(mesh);
          return mesh;
        };
        // Bracket up from the beam, a steel pan, then the pad or shell.
        add(new THREE.BoxGeometry(0.2, 0.08, 0.3), frame, [0, 0.385, 0.16]);
        add(new RoundedBoxGeometry(0.54, 0.03, 0.5, 2, 0.012), frame, [0, seatTop - 0.035, 0.24], 0.06);
        add(new RoundedBoxGeometry(0.54, 0.03, 0.52, 2, 0.012), frame, [0, 0.72, -0.075], Math.PI / 2 - lean);
        if (shell) {
          add(new RoundedBoxGeometry(0.5, 0.025, 0.46, 3, 0.012), padMat, [0, seatTop - 0.012, 0.24], 0.06);
          add(new RoundedBoxGeometry(0.5, 0.025, 0.48, 3, 0.012), padMat, [0, 0.72, -0.055], Math.PI / 2 - lean);
          if (a.upholstery === 'perforated') {
            const holes: { at: [number, number, number]; size: number }[] = [];
            for (let u = -4; u <= 4; u++) for (let v = -3; v <= 3; v++) holes.push({ at: [u * 0.05, seatTop + 0.006 - (v * 0.055) * 0.06, 0.24 + v * 0.055], size: 1 });
            const dots = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.011, 0.011, 0.004, 8), dark, holes.length);
            const m = new THREE.Matrix4();
            holes.forEach((h, k) => dots.setMatrixAt(k, m.makeTranslation(...h.at)));
            seat.add(dots);
          }
        } else {
          const sag = mood.wear * 0.012;
          add(new RoundedBoxGeometry(0.48, 0.07 - sag, 0.44, 4, 0.03), padMat, [0, seatTop + 0.01, 0.245], 0.06);
          add(new RoundedBoxGeometry(0.48, 0.06, 0.4, 4, 0.028), padMat, [0, 0.74, -0.04], Math.PI / 2 - lean);
          add(new RoundedBoxGeometry(0.4, 0.05, 0.13, 3, 0.022), padMat, [0, 0.965, -0.085], Math.PI / 2 - lean);
        }
        // A split in the pad, patched with silver tape, where the row has had a hard life.
        if (!shell && mood.wear > 0.45 && random() < mood.wear) {
          const tape = add(new THREE.BoxGeometry(0.2 + random() * 0.12, 0.004, 0.05), s.material('#b9bcbd', { metalness: 0.5, roughness: 0.4 }), [(random() - 0.5) * 0.2, seatTop + 0.046, 0.2 + random() * 0.14], 0.06);
          tape.rotation.y = (random() - 0.5) * 1.2;
        }
      }
      // Armrests: a post off the beam and a flat pad on top.
      for (let i = 0; i <= n; i++) {
        const inner = i > 0 && i < n;
        if (inner && a.arms === 'ends') continue;
        if (dir === 1 && (i === tableAt || i - 1 === tableAt) && inner) continue;
        const x = -width / 2 + i * pitch + (i === 0 ? 0.02 : i === n ? -0.02 : 0);
        const z = dir * zOff;
        s.rod([x, 0.34, z + dir * 0.06], [x, 0.63, z + dir * 0.1], 0.016, frame);
        s.rod([x, 0.34, z + dir * 0.3], [x, 0.63, z + dir * 0.38], 0.016, frame);
        s.mesh(new RoundedBoxGeometry(0.05, 0.03, 0.4, 2, 0.012), a.upholstery === 'tan-leather' ? frame : dark, [x, 0.645, z + dir * 0.24]);
      }
    }

    const front = spots.filter((spot) => spot.dir === 1);
    const pick = () => front.splice(Math.floor(random() * front.length), 1)[0];
    const lift = a.arms === 'every' ? 0.2 : 0;

    // The sleeper: a coat pulled over a body, a hood, and two shoes off the end.
    if (a.sleeper) {
      const coatTint = new THREE.Color('#232c3a').lerp(new THREE.Color('#3b3122'), mood.warmth).lerp(new THREE.Color('#8a6a1e'), mood.cheer * 0.4);
      const coat = s.material(coatTint, { roughness: 0.95 });
      const flip = random() < 0.5 ? 1 : -1;
      const span = Math.min(width - 0.25, 1.75);
      const y = seatTop + 0.14 + lift;
      const lumps = 7;
      for (let k = 0; k < lumps; k++) {
        const t = k / (lumps - 1);
        const x = flip * mix(-span / 2 + 0.28, span / 2 - 0.25, t);
        // Shoulder high, waist dipping, hip, then knees drawn up.
        const bulk = [0.17, 0.19, 0.15, 0.17, 0.15, 0.14, 0.11][k];
        const up = [0.02, 0.04, 0, 0.03, 0.01, 0.05, 0][k];
        s.ball([0.27, bulk, 0.2 + (k === 5 ? 0.06 : 0)], [x, y + up + (random() - 0.5) * 0.015, 0.2 + (k === 5 ? 0.08 : 0)], coat, 14);
      }
      s.ball([0.15, 0.13, 0.15], [flip * (-span / 2 + 0.1), y + 0.03, 0.2], s.material(coatTint.clone().multiplyScalar(0.8), { roughness: 1 }), 14);
      s.ball([0.05, 0.07, 0.09], [flip * (-span / 2 + 0.02), y + 0.01, 0.26], s.material('#b98f77', { roughness: 0.8 }), 10);
      const shoe = s.material(mood.cheer > 0.6 ? '#e9e6dc' : '#2a2422', { roughness: 0.7 });
      for (const dz of [0, 0.09]) s.mesh(new RoundedBoxGeometry(0.24, 0.09, 0.09, 2, 0.03), shoe, [flip * (span / 2 - 0.02), y - 0.03 + dz * 0.5, 0.16 + dz]).rotation.z = flip * -0.3;
      // A sleeve that has slipped off and hangs toward the carpet.
      s.tube([[flip * -0.1, y + 0.02, 0.36], [flip * -0.08, y - 0.12, 0.5], [flip * -0.06, y - 0.36, 0.52]], 0.045, coat);
      // Shoes kicked off underneath only when the sleeper still has theirs on; a bag as a pillow guard.
      const bag = s.material('#3f4a44', { roughness: 0.9 });
      s.mesh(new RoundedBoxGeometry(0.42, 0.3, 0.2, 3, 0.05), bag, [flip * (-span / 2 + 0.2), 0.15, 0.62]).rotation.y = (random() - 0.5) * 0.5;
      front.length = 0;
      for (const spot of spots) if (spot.dir === 1 && Math.abs(spot.x) > span / 2) front.push(spot);
    }

    const leave = (kind: keyof typeof LEFT) => {
      const spot = front.length ? pick() : spots.find((entry) => entry.dir === -1);
      if (!spot) return;
      const dir = spot.dir;
      const x = spot.x + (random() - 0.5) * 0.08;
      const z = dir * (zOff + 0.24);
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = (dir === 1 ? 0 : Math.PI) + (random() - 0.5) * 0.5;
      s.root.add(group);
      const put = (mesh: THREE.Mesh) => { mesh.removeFromParent(); group.add(mesh); return mesh; };
      const top = seatTop + (shell ? 0.01 : 0.05);
      if (kind === 'coat') {
        const cloth = s.material(mood.cheer > 0.55 ? '#b5483a' : '#6b6558', { roughness: 0.95 });
        put(s.mesh(new RoundedBoxGeometry(0.46, 0.5, 0.09, 3, 0.04), cloth, [0, 0.82, -0.2])).rotation.x = -0.24;
        put(s.mesh(new RoundedBoxGeometry(0.44, 0.3, 0.07, 3, 0.03), cloth, [0, 0.86, -0.3])).rotation.x = 0.1;
        put(s.tube([[0.2, 0.9, -0.16], [0.27, 0.7, -0.05], [0.25, 0.48, 0.02]], 0.05, cloth));
        put(s.ball([0.2, 0.05, 0.14], [0, 1.05, -0.26], s.material('#c9bfa8', { roughness: 1 }), 12));
      } else if (kind === 'pillow') {
        const plush = s.material(mood.cheer > 0.5 ? '#7a5fb0' : '#5a6370', { roughness: 1 });
        const ring = put(s.mesh(new THREE.TorusGeometry(0.11, 0.055, 10, 24, Math.PI * 1.55), plush, [0, top + 0.055, 0]));
        ring.rotation.x = Math.PI / 2;
        ring.rotation.z = random() * 6;
      } else if (kind === 'coffee') {
        put(s.cylinder(0.042, 0.03, 0.11, [0.1, top + 0.055, 0.05], s.material('#f0ece0', { roughness: 0.8 }), 14));
        put(s.cylinder(0.044, 0.044, 0.014, [0.1, top + 0.115, 0.05], s.material('#2b2b2b'), 14));
        put(s.cylinder(0.04, 0.034, 0.05, [0.1, top + 0.05, 0.05], s.material('#8a5a34', { roughness: 0.9 }), 14));
        put(s.box([0.11, 0.003, 0.11], [-0.08, top + 0.003, 0.02], s.material('#f4f1e8'))).rotation.y = 0.5;
      } else if (kind === 'newspaper') {
        const paper = s.material('#d8d4c6', { roughness: 1, side: THREE.DoubleSide });
        for (const side of [-1, 1]) {
          const page = put(s.box([0.3, 0.004, 0.4], [0.3 + side * 0.13, 0.57, 0], paper));
          page.rotation.z = side * -1.05;
          for (let k = 0; k < 5; k++) { const line = put(s.box([0.22, 0.001, 0.03], [0.3 + side * 0.135, 0.572, -0.14 + k * 0.07], s.material('#77756c'))); line.rotation.z = side * -1.05; }
        }
      } else if (kind === 'backpack') {
        const pack = s.material(mood.cheer > 0.5 ? '#d2622b' : '#35506a', { roughness: 0.9 });
        put(s.mesh(new RoundedBoxGeometry(0.34, 0.46, 0.22, 4, 0.08), pack, [0, top + 0.23, -0.04])).rotation.x = -0.18;
        put(s.mesh(new RoundedBoxGeometry(0.26, 0.18, 0.08, 3, 0.035), s.material('#22303c', { roughness: 0.9 }), [0, top + 0.16, 0.09])).rotation.x = -0.18;
        put(s.tube([[-0.1, top + 0.46, -0.1], [0, top + 0.54, -0.11], [0.1, top + 0.46, -0.1]], 0.012, dark));
        put(s.tube([[-0.14, top + 0.4, 0.02], [-0.2, top + 0.1, 0.12], [-0.17, top - 0.12, 0.26]], 0.014, dark));
      } else if (kind === 'flowers') {
        const wrap = new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.3, side: THREE.DoubleSide });
        const cone = put(s.mesh(new THREE.ConeGeometry(0.1, 0.42, 12, 1, true), wrap, [0, top + 0.09, 0.02]));
        cone.rotation.z = Math.PI / 2 + 0.12;
        const hue = mix(0.92, 0.12, random());
        for (let k = 0; k < 7; k++) put(s.ball([0.045, 0.045, 0.045], [-0.2 - random() * 0.05, top + 0.08 + (random() - 0.3) * 0.1, 0.02 + (random() - 0.5) * 0.14], s.material(new THREE.Color().setHSL(hue + (random() - 0.5) * 0.08, 0.7, mix(0.45, 0.65, mood.cheer)), { roughness: 0.8 }), 8));
        put(s.rod([0.2, top + 0.06, 0.02], [0.3, top + 0.04, 0.02], 0.012, s.material('#4c7a3f')));
      } else if (kind === 'pass') {
        put(s.box([0.09, 0.012, 0.125], [-0.06, top + 0.007, 0.03], s.material('#5a1f2a', { roughness: 0.6 }))).rotation.y = 0.4;
        const stub = put(s.box([0.2, 0.003, 0.085], [0.06, top + 0.016, 0.0], s.material('#f3f0e6')));
        stub.rotation.y = -0.3;
        put(s.box([0.05, 0.004, 0.086], [0.13, top + 0.017, -0.022], s.material('#2f6fb5'))).rotation.y = -0.3;
      }
    };
    if (a.left !== 'nothing') leave(a.left);
    // A busier terminal leaves more behind.
    const extras: (keyof typeof LEFT)[] = ['coffee', 'newspaper', 'pillow', 'pass'];
    const more = Math.floor(mood.density * 2.4 * random() + mood.density * 0.6);
    for (let k = 0; k < more && front.length; k++) {
      const kind = extras[Math.floor(random() * extras.length)];
      if (kind !== a.left) leave(kind);
    }

    if (a.reserved !== 'none') {
      const target = spots.filter((spot) => spot.dir === 1).at(-1);
      if (target) {
        if (a.reserved === 'priority') {
          const sign = s.label('PRIORITY', 0.26, 0.09, [target.x, 0.86, zOff - 0.03], '#ffffff', '#2c63b8');
          sign.rotation.x = -lean;
          sign.position.z = zOff + (shell ? -0.085 : -0.05) + 0.045;
        } else if (a.reserved === 'tape') {
          const hazard = s.material('#e8c021', { roughness: 0.6, emissive: '#5a4a00', emissiveIntensity: 0.3 });
          for (const turn of [-0.7, 0.7]) {
            const strip = s.box([0.62, 0.006, 0.05], [target.x, seatTop + 0.09, zOff + 0.25], hazard);
            strip.rotation.y = turn;
            const up = s.box([0.6, 0.05, 0.006], [target.x, 0.76, zOff + 0.03], hazard);
            up.rotation.set(-lean, 0, turn);
          }
        } else {
          s.box([0.07, 0.1, 0.02], [target.x + 0.3, 0.5, zOff + 0.46], s.material('#3c9a54', { emissive: '#3cff7a', emissiveIntensity: 0.5 }));
          s.tube([[target.x + 0.3, 0.46, zOff + 0.47], [target.x + 0.26, 0.2, zOff + 0.56], [target.x + 0.1, 0.02, zOff + 0.62], [target.x - 0.1, 0.012, zOff + 0.58]], 0.008, dark);
        }
      }
    }

    return s.finish();
  },
});
