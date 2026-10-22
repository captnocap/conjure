import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { Batch, aged } from './lib';

type V3 = [number, number, number];
interface Panel { o: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3; n: THREE.Vector3; w: number; h: number }
const UP = new THREE.Vector3(0, 1, 0);
const arr = (v: THREE.Vector3) => v.toArray() as V3;

export default defineThing({
  questions: {
    shape: choice('What shape is the backstop?', {
      flat: 'One broad flat screen propped by back braces, a sandlot or schoolyard.',
      winged: 'A centre screen with two wings angled forward round the plate.',
      hooded: 'Three panels with an overhanging hood leaning out over the catcher, a proper league field.',
    }),
    height: score('How tall is it?', ['Barely head high', 'Twice a man', 'Towering over the infield']),
    mesh: choice('What is the chain-link like?', {
      galvanised: 'Bare galvanised silver wire.',
      green: 'Dark green vinyl-coated wire, parks department issue.',
      black: 'Black coated wire, newer and sharper.',
    }),
    kick: choice('What runs along the bottom, where wild pitches hit?', {
      bare: 'Nothing: wire right down to the dirt.',
      planks: 'Weathered wooden kick-boards bolted across the bottom.',
      pads: 'Thick vinyl safety pads in team colours with a padded top rail on the wings.',
    }),
    left: choice('What has been left on it?', {
      nothing: 'Nothing: bare and waiting.',
      ball: 'A scuffed baseball wedged high in the links where nobody can reach it.',
      jacket: 'A team jacket hung on the wire by its collar, forgotten.',
      gear: 'Bats leaning on the fence, a helmet and a bucket of balls: practice in progress.',
      everything: 'A wedged ball, a hung jacket and scattered gear, a busy afternoon.',
    }),
    plate: choice('What state is the ground around home plate in?', {
      crisp: 'Freshly dragged dirt with sharp white batter\'s boxes, before the first pitch.',
      scuffed: 'Lines kicked half away and the dirt chewed by cleats, late in a game.',
      puddled: 'Rain standing in the batter\'s boxes, the chalk washed out.',
      overgrown: 'Grass and weeds creeping over the plate, no lines at all.',
    }),
    sign: choice('What sign hangs on the screen?', {
      none: 'No sign.',
      field: 'A small FIELD 2 number board at the top.',
      champs: 'A proud vinyl banner: DISTRICT CHAMPS.',
      closed: 'A FIELD CLOSED notice wired on at eye level.',
      pepper: 'A stencilled NO PEPPER GAMES board.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const b = new Batch();
    const H = mix(2.6, 5.6, a.height) + random() * 0.3;
    const zb = -1.7, half = a.shape === 'flat' ? 3.4 : 2.5, wingLength = 2.7, theta = 0.87;
    const wireColour = aged({ galvanised: '#aab1b0', green: '#2f5c43', black: '#2a2d2f' }[a.mesh], mood.wear * 0.55, '#8a5a3c');
    const pipeColour = aged(a.mesh === 'black' ? '#3a3e40' : '#b4babb', mood.wear * 0.5, '#86573a');

    const panels: Panel[] = [];
    const panel = (o: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, w: number, h: number) => {
      const made = { o, u: u.clone().normalize(), v: v.clone().normalize(), n: new THREE.Vector3().crossVectors(u, v).normalize(), w, h };
      panels.push(made);
      return made;
    };
    const walls = [panel(new THREE.Vector3(-half, 0, zb), new THREE.Vector3(1, 0, 0), UP, half * 2, H)];
    if (a.shape !== 'flat') {
      const uL = new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta));
      walls.push(panel(new THREE.Vector3(-half, 0, zb).addScaledVector(uL, -wingLength), uL, UP, wingLength, H));
      walls.push(panel(new THREE.Vector3(half, 0, zb), new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)), UP, wingLength, H));
    }
    const hoods = a.shape === 'hooded' ? walls.map((wall) => panel(wall.o.clone().addScaledVector(UP, wall.h), wall.u, wall.n.clone().multiplyScalar(0.72).add(new THREE.Vector3(0, 0.7, 0)), wall.w, mix(0.9, 1.5, a.height))) : [];

    // ----- chain-link: real ribbons of wire, bellied where the balls hit -----
    const positions: number[] = [], normals: number[] = [];
    const sag = mood.wear * mood.wear * 0.34 + 0.02;
    const weave = (p: Panel, isHood: boolean) => {
      const bumps = Array.from({ length: 3 }, () => ({ u: mix(0.15, 0.85, random()) * p.w, v: (isHood ? mix(0.3, 0.7, random()) : mix(0.12, 0.55, random())) * p.h, r: mix(0.5, 1.1, random()), d: (random() < 0.8 ? -1 : 0.5) * random() }));
      const hole = !isHood && mood.wear > 0.6 && random() < mood.wear ? { u: random() < 0.5 ? 0.15 * p.w : 0.85 * p.w, v: 0.1, r: mix(0.4, 0.9, random()) } : null;
      const at = (u: number, v: number, lift = 0) => {
        const pin = Math.sin(Math.PI * Math.min(1, Math.max(0, u / p.w))) * Math.sin(Math.PI * Math.min(1, Math.max(0, v / p.h)));
        let bulge = 0;
        for (const bump of bumps) bulge += bump.d * Math.exp(-((u - bump.u) ** 2 + (v - bump.v) ** 2) / (bump.r * bump.r));
        return p.o.clone().addScaledVector(p.u, u).addScaledVector(p.v, v).addScaledVector(p.n, bulge * sag * Math.sqrt(pin) * (isHood ? 0.6 : 1) + lift);
      };
      const spacing = 0.2, step = 0.4, halfWidth = 0.011;
      const strand = (u0: number, v0: number, u1: number, v1: number) => {
        const length = Math.hypot(u1 - u0, v1 - v0);
        const pieces = Math.max(1, Math.round(length / step));
        for (let i = 0; i < pieces; i++) {
          const t0 = i / pieces, t1 = (i + 1) / pieces;
          const ua = mix(u0, u1, t0), va = mix(v0, v1, t0), ub = mix(u0, u1, t1), vb = mix(v0, v1, t1);
          if (hole && Math.hypot((ua + ub) / 2 - hole.u, (va + vb) / 2 - hole.v) < hole.r) continue;
          const pa = at(ua, va), pb = at(ub, vb);
          const side = new THREE.Vector3().subVectors(pb, pa).cross(p.n).normalize().multiplyScalar(halfWidth);
          for (const corner of [pa.clone().sub(side), pa.clone().add(side), pb.clone().add(side), pa.clone().sub(side), pb.clone().add(side), pb.clone().sub(side)]) {
            positions.push(corner.x, corner.y, corner.z);
            normals.push(p.n.x, p.n.y, p.n.z);
          }
        }
      };
      for (let c = -p.h + spacing / 2; c < p.w; c += spacing) {
        const v0 = Math.max(0, -c), v1 = Math.min(p.h, p.w - c);
        if (v1 > v0) strand(c + v0, v0, c + v1, v1);
      }
      for (let c = spacing / 2; c < p.w + p.h; c += spacing) {
        const v0 = Math.max(0, c - p.w), v1 = Math.min(p.h, c);
        if (v1 > v0) strand(c - v0, v0, c - v1, v1);
      }
      return { at, hole };
    };
    const woven = walls.map((wall) => weave(wall, false));
    hoods.forEach((hood) => weave(hood, true));
    const wire = new THREE.BufferGeometry();
    wire.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    wire.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    s.mesh(wire, new THREE.MeshStandardMaterial({ color: wireColour, roughness: 0.55, metalness: a.mesh === 'galvanised' ? 0.45 : 0.1, side: THREE.DoubleSide }));

    // ----- pipe frame -----
    const pipe = (from: THREE.Vector3, to: THREE.Vector3, r = 0.045) => b.rod(arr(from), arr(to), r, pipeColour, 7);
    walls.forEach((wall, index) => {
      const posts = index === 0 ? (a.shape === 'flat' ? 4 : 3) : 2;
      for (let i = 0; i < posts; i++) {
        if (index > 0 && i === (index === 1 ? 1 : 0)) continue; // shared corner post
        const foot = wall.o.clone().addScaledVector(wall.u, (i / (posts - 1)) * wall.w).addScaledVector(wall.n, -0.05);
        pipe(foot.clone().setY(-0.02), foot.clone().setY(wall.h + 0.03), 0.055);
        b.ball([0.065, 0.045, 0.065], arr(foot.clone().setY(wall.h + 0.04)), pipeColour, 8);
        if (a.shape === 'flat') pipe(foot.clone().setY(wall.h * 0.72), foot.clone().add(new THREE.Vector3(0, 0, -wall.h * 0.42)), 0.04);
      }
      for (const level of [0.03, 0.5, 1]) pipe(wall.o.clone().addScaledVector(wall.n, -0.03).setY(wall.h * level), wall.o.clone().addScaledVector(wall.u, wall.w).addScaledVector(wall.n, -0.03).setY(wall.h * level), 0.035);
    });
    hoods.forEach((hood, index) => {
      for (const end of [0, 1]) pipe(hood.o.clone().addScaledVector(hood.u, end * hood.w), hood.o.clone().addScaledVector(hood.u, end * hood.w).addScaledVector(hood.v, hood.h), 0.045);
      if (index === 0) pipe(hood.o.clone().addScaledVector(hood.u, hood.w / 2), hood.o.clone().addScaledVector(hood.u, hood.w / 2).addScaledVector(hood.v, hood.h), 0.04);
      pipe(hood.o.clone().addScaledVector(hood.v, hood.h), hood.o.clone().addScaledVector(hood.u, hood.w).addScaledVector(hood.v, hood.h), 0.035);
    });

    // ----- kick-boards or pads -----
    const yawOf = (p: Panel) => Math.atan2(-p.u.z, p.u.x);
    const teamHue = mix(0.6, 0.0, mood.warmth > 0.5 ? 1 : 0);
    const padColour = new THREE.Color().setHSL(a.mesh === 'green' ? 0.38 : teamHue, mix(0.25, 0.7, mood.cheer), 0.33);
    const plank = aged('#9a7a54', mood.wear * 0.6, '#8d8b84');
    walls.forEach((wall) => {
      const centre = (v: number, out: number) => arr(wall.o.clone().addScaledVector(wall.u, wall.w / 2).addScaledVector(wall.n, out).setY(v));
      if (a.kick === 'planks') {
        for (let i = 0; i < 3; i++) {
          if (random() < mood.wear * 0.3) continue;
          b.box([wall.w - 0.1, 0.24, 0.035], centre(0.16 + i * 0.27, 0.035), aged(plank, random() * 0.25, '#5d5245'), [0, yawOf(wall), (random() - 0.5) * mood.wear * 0.05]);
        }
      } else if (a.kick === 'pads') {
        const count = Math.round(wall.w / 1.25);
        for (let i = 0; i < count; i++) {
          const at = wall.o.clone().addScaledVector(wall.u, ((i + 0.5) / count) * wall.w).addScaledVector(wall.n, 0.075).setY(0.62);
          b.box([wall.w / count - 0.03, 1.16, 0.11], arr(at), aged(padColour, random() * 0.08 + mood.wear * 0.12, '#4a4c50'), [0, yawOf(wall), 0]);
          b.box([wall.w / count - 0.03, 0.05, 0.115], arr(at.clone().setY(1.17)), '#ece6d2', [0, yawOf(wall), 0]);
        }
      }
    });
    if (a.kick === 'pads') walls.slice(1).forEach((wall) => b.add(new THREE.CylinderGeometry(0.085, 0.085, wall.w, 10), '#e5b92c', arr(wall.o.clone().addScaledVector(wall.u, wall.w / 2).setY(wall.h + 0.02)), [0, yawOf(wall), Math.PI / 2]));

    // ----- home plate and its dirt -----
    const plateZ = 2.0;
    const dirtColour = new THREE.Color().setHSL(mix(0.07, 0.065, mood.warmth), mix(0.3, 0.48, mood.warmth), a.plate === 'puddled' ? 0.36 : a.plate === 'overgrown' ? 0.44 : 0.5);
    const dirt = new THREE.Shape();
    dirt.absellipse(0, 0, 3.3, 2.7, 0, Math.PI * 2);
    const dirtMesh = s.mesh(new THREE.ShapeGeometry(dirt, 40), new THREE.MeshStandardMaterial({ color: dirtColour, roughness: 1 }), [0, 0.012, 1.25]);
    dirtMesh.rotation.x = -Math.PI / 2;
    dirtMesh.castShadow = false;
    const chalk = '#f4f2ea';
    const line = (x0: number, z0: number, x1: number, z1: number) => {
      const length = Math.hypot(x1 - x0, z1 - z0), pieces = Math.max(1, Math.round(length / 0.3));
      for (let i = 0; i < pieces; i++) {
        if (a.plate === 'scuffed' && random() < 0.42) continue;
        const t = (i + 0.5) / pieces, jitter = a.plate === 'scuffed' ? (random() - 0.5) * 0.05 : 0;
        b.box([length / pieces + 0.01, 0.012, a.plate === 'scuffed' ? 0.05 + random() * 0.05 : 0.075], [mix(x0, x1, t) + jitter, 0.02, mix(z0, z1, t) + jitter], chalk, [0, Math.atan2(-(z1 - z0), x1 - x0), 0]);
      }
    };
    if (a.plate === 'crisp' || a.plate === 'scuffed') {
      for (const side of [-1, 1]) {
        const x0 = side * 0.45, x1 = side * 1.55, z0 = plateZ - 0.9, z1 = plateZ + 0.9;
        line(x0, z0, x1, z0); line(x1, z0, x1, z1); line(x1, z1, x0, z1); line(x0, z1, x0, z0);
        line(side * 1.75, plateZ + 1.15, side * 2.55, plateZ + 1.95);
      }
      line(-0.62, plateZ - 1.1, -0.62, plateZ - 1.9); line(0.62, plateZ - 1.1, 0.62, plateZ - 1.9); line(-0.62, plateZ - 1.9, 0.62, plateZ - 1.9);
    }
    const plateShape = new THREE.Shape();
    for (const [index, [x, y]] of [[-0.36, 0.36], [0.36, 0.36], [0.36, 0], [0, -0.36], [-0.36, 0]].entries()) index ? plateShape.lineTo(x, y) : plateShape.moveTo(x, y);
    const plateGeometry = new THREE.ExtrudeGeometry(plateShape, { depth: 0.035, bevelEnabled: false });
    plateGeometry.rotateX(Math.PI / 2);
    b.add(plateGeometry, aged('#f6f4ee', a.plate === 'crisp' ? 0 : 0.3 + mood.wear * 0.3, '#9a7b58'), [0, 0.05, plateZ]);
    if (a.plate === 'scuffed') for (let i = 0; i < 16; i++) b.cyl(0.1 + random() * 0.2, 0.1 + random() * 0.2, 0.008, [(random() < 0.5 ? -1 : 1) * (0.6 + random() * 0.8), 0.018, plateZ + (random() - 0.5) * 1.5], aged(dirtColour, 0.3, '#5d4630'), 9);
    if (a.plate === 'puddled') {
      const water = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.58, 0.2, mix(0.42, 0.62, mood.cheer)), roughness: 0.08, metalness: 0.5 });
      for (const side of [-1, 1, 0]) {
        const puddle = s.cylinder(1, 1, 0.01, [side * (0.95 + random() * 0.2), 0.022, side ? plateZ + (random() - 0.5) * 0.5 : plateZ - 1.5], water, 22);
        puddle.scale.set(0.45 + random() * 0.3, 1, 0.7 + random() * 0.35);
        puddle.rotation.y = random() * 3;
        puddle.castShadow = false;
      }
    }
    // Grass: weeds at the fence line always, a takeover if overgrown.
    const tufts: { at: V3; size: number; color: THREE.Color }[] = [];
    const green = () => new THREE.Color().setHSL(mix(0.2, 0.31, random()), mix(0.25, 0.55, mood.cheer), mix(0.24, 0.38, random()));
    walls.forEach((wall) => {
      for (let i = 0; i < mix(4, 26, mood.density) * mix(0.5, 1.6, mood.wear); i++) tufts.push({ at: arr(wall.o.clone().addScaledVector(wall.u, random() * wall.w).addScaledVector(wall.n, (random() - 0.6) * 0.5)), size: 0.5 + random() * (0.5 + mood.wear), color: green() });
    });
    if (a.plate === 'overgrown') for (let i = 0; i < 120; i++) { const angle = random() * 6.3, r = Math.sqrt(random()); tufts.push({ at: [Math.cos(angle) * r * 3.2, 0, 1.25 + Math.sin(angle) * r * 2.6], size: 0.4 + random() * 0.9, color: green() }); }
    const blade = new THREE.ConeGeometry(0.06, 0.36, 4);
    blade.translate(0, 0.18, 0);
    if (tufts.length) s.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 0.95 }), tufts);

    // ----- what was left -----
    const everything = a.left === 'everything';
    if (a.left === 'ball' || everything) {
      const p = walls[0], spot = woven[0].at(mix(0.2, 0.8, random()) * p.w, mix(0.55, 0.85, random()) * p.h, 0.03);
      b.ball([0.1, 0.1, 0.1], arr(spot), aged('#f3efe4', 0.15 + mood.wear * 0.3, '#9b8160'), 12);
      b.add(new THREE.TorusGeometry(0.085, 0.012, 4, 14, 4.2), '#b3261e', arr(spot.clone().add(new THREE.Vector3(0, 0, 0.03))), [0.4, 0.9, 0]);
    }
    let jacket: THREE.Mesh | null = null;
    if (a.left === 'jacket' || everything) {
      const p = walls[walls.length - 1];
      const j = new Batch();
      const body = new THREE.Color().setHSL(mood.warmth > 0.5 ? 0.0 : 0.61, mix(0.35, 0.75, mood.cheer), 0.36), sleeve = '#e9e2cc';
      j.box([0.62, 0.72, 0.09], [0, -0.42, 0], body, [0, 0, 0.03]);
      j.box([0.64, 0.09, 0.1], [0, -0.8, 0], '#e9e2cc');
      j.box([0.3, 0.1, 0.11], [0, -0.03, 0], sleeve);
      for (const side of [-1, 1]) {
        j.rod([side * 0.3, -0.1, 0], [side * 0.44, -0.72, 0.02], 0.085, sleeve, 7, 0.07);
        j.cyl(0.075, 0.075, 0.07, [side * 0.445, -0.75, 0.02], body, 7);
      }
      for (let i = 0; i < 5; i++) j.cyl(0.018, 0.018, 0.02, [0.02, -0.14 - i * 0.14, 0.05], '#f4f1e6', 6, [Math.PI / 2, 0, 0]);
      jacket = j.into(s.root, { roughness: 0.85 });
      jacket!.position.copy(p.o).addScaledVector(p.u, p.w * 0.55).addScaledVector(p.n, 0.09).setY(Math.min(2.0, p.h * 0.72));
      jacket!.rotation.y = yawOf(p);
    }
    if (a.left === 'gear' || everything) {
      const woodBat = '#c9a36a';
      const count = 2 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const x = 0.9 + i * 0.16 + random() * 0.05, lean = 0.3 + random() * 0.15;
        const colour = random() < 0.4 ? '#b9c0c2' : random() < 0.5 ? '#2b2b2e' : woodBat;
        b.rod([x, 0.02, zb + lean + 0.08], [x + (random() - 0.5) * 0.1, 0.82, zb + 0.09], 0.036, colour, 7, 0.016);
        b.ball([0.026, 0.02, 0.026], [x, 0.84, zb + 0.085], colour, 6);
      }
      const hx = -1.3 - random() * 0.5, hz = zb + 0.7 + random() * 0.4;
      const shell = new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
      b.add(shell, padColour.clone().offsetHSL(0, 0.1, 0.05), [hx, 0.07, hz], [0.15, random() * 3, 0.1]);
      b.box([0.2, 0.02, 0.14], [hx + 0.02, 0.06, hz + 0.16], '#1f2224', [0.1, 0, 0]);
      const bx = hx - 0.55, bz = hz - 0.25;
      b.cyl(0.17, 0.14, 0.36, [bx, 0.18, bz], '#ecebe4', 14);
      for (let i = 0; i < 7; i++) b.ball([0.055, 0.055, 0.055], [bx + (random() - 0.5) * 0.2, 0.37 + random() * 0.03, bz + (random() - 0.5) * 0.2], '#f5f2e8', 8);
      for (let i = 0; i < 2 + mood.density * 5; i++) b.ball([0.055, 0.055, 0.055], [(random() - 0.5) * 4, 0.055, zb + 0.3 + random() * 1.6], '#f5f2e8', 8);
    }

    // ----- sign -----
    if (a.sign !== 'none') {
      const p = walls[0];
      const spec = { field: ['FIELD 2', 1.5, 0.5, 0.86, '#f4f1e4', '#234a35'], champs: ['DISTRICT CHAMPS', 3.2, 0.62, 0.72, '#f6d23d', '#1d3566'], closed: ['FIELD CLOSED', 1.5, 0.42, 0.42, '#b1281c', '#f5f0de'], pepper: ['NO PEPPER GAMES', 2.3, 0.4, 0.62, '#20221f', '#eee6c8'] }[a.sign] as [string, number, number, number, string, string];
      const height = Math.max(1.5, Math.min(p.h - spec[2] / 2 - 0.1, p.h * spec[3]));
      const sign = s.label(spec[0], spec[1], spec[2], arr(p.o.clone().addScaledVector(p.u, p.w * (a.sign === 'closed' ? 0.3 : 0.5)).addScaledVector(p.n, 0.06 + sag).setY(height)), spec[4], spec[5]);
      sign.rotation.z = (random() - 0.5) * (0.03 + mood.wear * 0.12);
    }

    b.into(s.root, { roughness: mix(0.5, 0.9, mood.wear), metalness: 0.15 });
    const sway = mix(0.01, 0.09, mood.energy), baseYaw = jacket?.rotation.y ?? 0;
    return s.finish({
      update: jacket ? (_dt, time) => { jacket!.rotation.z = Math.sin(time * mix(0.6, 2.2, mood.energy)) * sway; jacket!.rotation.y = baseYaw; } : undefined,
    });
  },
});
