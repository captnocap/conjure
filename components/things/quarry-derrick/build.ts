import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
const v = (p: P3) => new THREE.Vector3(...p);
const arr = (p: THREE.Vector3) => p.toArray() as P3;

export default defineThing({
  questions: {
    build: choice('How is the derrick built?', {
      'timber-guyed': 'A single great timber mast with iron bands, held up by a spider-web of guy wires.',
      'timber-stiffleg': 'A timber mast braced by two timber stifflegs on sills weighted with stone.',
      'steel-stiffleg': 'A riveted steel lattice mast and boom with two lattice stifflegs, painted red oxide.',
      'steel-guyed': 'A slim steel tube mast and lattice boom held by guy wires, mid-century and efficient.',
    }),
    hook: choice('What is on the hook?', {
      empty: 'Nothing: a bare hook block swinging.',
      clamp: 'An empty scissor stone clamp hanging open like a pair of iron tongs.',
      block: 'A squared block of white stone in slings.',
      drum: 'A fluted column drum lifted by a lewis in its top.',
      skip: 'A dented steel skip heaped with rubble.',
      rider: 'A quarryman riding the hook with one boot in it, the way they were told not to.',
    }),
    guys: score('How are its wires and ropes?', ['Slack and sagging in long curves', 'Holding', 'Bar-taut and singing']),
    status: choice('Is it in use?', {
      working: 'In use: the load is in the air, mid-swing.',
      idle: 'Idle: the load set down or the hook drawn up, everything waiting.',
      relic: 'A relic: the boom dropped to the ground, wires fallen, a nest at the masthead.',
    }),
    reach: score('How is the boom set?', ['Laid out low, reaching far over the pit', 'At forty-five degrees', 'Topped up steep, close to the mast']),
    winch: choice('What drives it?', {
      hand: 'A hand crab winch with two crank handles.',
      steam: 'A steam donkey engine with an upright boiler and a smokestack.',
      shed: 'An electric winch in a small tin-roofed shed.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steelBuild = a.build.startsWith('steel');
    const guyed = a.build.endsWith('guyed');
    const relic = a.status === 'relic';
    const wear = Math.min(1, mood.wear + (relic ? 0.5 : 0));
    const rust = (hex: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
      s.material(new THREE.Color(hex).lerp(new THREE.Color('#70452b'), wear * 0.7), { roughness: mix(0.55, 0.95, wear), ...extra });
    const timber = s.material(new THREE.Color('#94703f').lerp(new THREE.Color('#77766c'), wear * 0.6), { roughness: 0.9 });
    const frame = steelBuild ? rust(mood.cheer > 0.6 ? '#d9a514' : a.build === 'steel-stiffleg' ? '#a5402c' : '#5f6e78') : timber;
    const iron = rust('#3c4146', { metalness: 0.5 });
    const wire = new THREE.MeshStandardMaterial({ color: relic ? '#6b4a32' : '#2e3236', roughness: 0.7 });
    const stone = s.material('#ebe9e1', { roughness: 0.85 });
    const WR = 0.035;

    const H = mix(9.5, 11, random());
    const Lb = H * mix(0.85, 0.98, random());
    const heading = THREE.MathUtils.degToRad(mix(20, 50, random()));
    const hx = Math.cos(heading), hz = Math.sin(heading);

    /** A square lattice member between two points. */
    const lattice = (from: P3, to: P3, w0: number, w1: number, bays: number, material: THREE.Material) => {
      const A = v(from), B = v(to);
      const axis = B.clone().sub(A).normalize();
      const side = new THREE.Vector3(0, 1, 0).cross(axis);
      if (side.lengthSq() < 0.01) side.set(1, 0, 0);
      side.normalize();
      const up = axis.clone().cross(side).normalize();
      const corner = (t: number, i: number) => {
        const w = mix(w0, w1, t) / 2;
        return A.clone().lerp(B, t).addScaledVector(side, [1, 1, -1, -1][i] * w).addScaledVector(up, [1, -1, -1, 1][i] * w);
      };
      for (let i = 0; i < 4; i++) s.rod(arr(corner(0, i)), arr(corner(1, i)), 0.045, material);
      for (let b = 0; b < bays; b++)
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4;
          const [p, q] = b % 2 ? [i, j] : [j, i];
          s.rod(arr(corner(b / bays, p)), arr(corner((b + 1) / bays, q)), 0.025, material);
        }
    };
    const line = (from: P3, to: P3, sag: number, radius = WR) => {
      if (sag < 0.03) { s.rod(from, to, radius, wire); return; }
      const mid: P3 = [(from[0] + to[0]) / 2, Math.max(0.05, (from[1] + to[1]) / 2 - sag), (from[2] + to[2]) / 2];
      s.tube([from, mid, to], radius, wire);
    };

    // ---- Foundation, mast and bull wheel ---------------------------------------------------
    s.box([2.2, 0.35, 2.2], [0, 0.175, 0], s.material('#b9b6aa', { roughness: 1 }));
    const top: P3 = [0, H, 0];
    if (a.build === 'steel-stiffleg') lattice([0, 0.5, 0], [0, H, 0], 0.8, 0.5, 9, frame);
    else if (a.build === 'steel-guyed') s.cylinder(0.14, 0.2, H - 0.4, [0, 0.4 + (H - 0.4) / 2, 0], frame, 12);
    else {
      s.cylinder(0.2, 0.3, H - 0.4, [0, 0.4 + (H - 0.4) / 2, 0], timber, 10);
      for (let i = 1; i < 7; i++) s.cylinder(0.3 - i * 0.013, 0.3 - i * 0.013, 0.1, [0, 0.4 + i * (H - 0.6) / 7, 0], iron, 10);
    }
    s.cylinder(0.4, 0.4, 0.14, [0, H + 0.02, 0], iron, 12);
    s.cylinder(0.07, 0.07, 0.5, [0, H + 0.3, 0], iron, 8);
    const bull = s.ring(1.25, 0.07, [0, 0.85, 0], iron);
    bull.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) s.rod([Math.cos(i * 0.785 + heading) * 1.25, 0.85, Math.sin(i * 0.785 + heading) * 1.25], [-Math.cos(i * 0.785 + heading) * 1.25, 0.85, -Math.sin(i * 0.785 + heading) * 1.25], 0.035, iron);

    // ---- Boom ----------------------------------------------------------------------------
    const pivot: P3 = [hx * 0.35, 1.0, hz * 0.35];
    const theta = relic ? -Math.asin(0.8 / Lb) : THREE.MathUtils.degToRad(mix(18, 68, a.reach));
    const tipV = v(pivot).add(new THREE.Vector3(hx * Math.cos(theta), Math.sin(theta), hz * Math.cos(theta)).multiplyScalar(Lb));
    const tip = arr(tipV);
    if (steelBuild) lattice(pivot, tip, 0.6, 0.3, 9, frame);
    else {
      s.rod(pivot, tip, 0.2, timber, 0.12);
      for (const t of [0.05, 0.5, 0.97]) s.rod(arr(v(pivot).lerp(tipV, t)), arr(v(pivot).lerp(tipV, t + 0.02)), 0.22 - t * 0.08, iron);
    }
    s.cylinder(0.24, 0.24, 0.12, tip, iron, 12).rotation.set(Math.PI / 2, 0, heading);

    // Topping lift: two parts of rope and a block between masthead and boom tip.
    const tension = a.guys;
    const ropeSag = relic ? 0 : mix(0.5, 0, tension);
    if (!relic) {
      const blockAt = arr(v(top).lerp(tipV, 0.45));
      line(top, blockAt, ropeSag * 0.5);
      for (const off of [-0.08, 0.08]) line([blockAt[0] - hz * off, blockAt[1], blockAt[2] + hx * off], [tip[0] - hz * off, tip[1], tip[2] + hx * off], ropeSag * 0.5, 0.028);
      s.box([0.2, 0.4, 0.14], blockAt, iron).lookAt(tipV);
    } else {
      // The fallen topping lift hangs down the mast and trails to the boom.
      s.tube([top, [hx * 0.6, H * 0.5, hz * 0.6], [hx * 1.2, 0.5, hz * 1.2], [hx * 3 - hz, 0.06, hz * 3 + hx], arr(v(pivot).lerp(tipV, 0.6).setY(0.3))], WR, wire);
    }

    // ---- Guys or stifflegs -----------------------------------------------------------------
    if (guyed) {
      const count = a.build === 'timber-guyed' ? 7 : 5;
      const Rg = mix(4.6, 5.4, random());
      for (let i = 0; i < count; i++) {
        const angle = heading + Math.PI * 0.42 + (i / (count - 1)) * Math.PI * 1.16 + (random() - 0.5) * 0.12;
        const anchor: P3 = [Math.cos(angle) * Rg, 0.12, Math.sin(angle) * Rg];
        s.box([0.5, 0.3, 0.5], [anchor[0], 0.13, anchor[2]], i % 2 ? stone : s.material('#a9a79d', { roughness: 1 })).rotation.y = angle;
        s.ring(0.1, 0.03, [anchor[0], 0.34, anchor[2]], iron).rotation.y = -angle;
        if (relic && i % 3 === 1) {
          // A fallen guy lies where it dropped.
          const pts: P3[] = [[anchor[0], 0.3, anchor[2]]];
          for (let k = 1; k < 7; k++) pts.push([anchor[0] * (1 - k / 7.5) + (random() - 0.5) * 0.7, 0.05, anchor[2] * (1 - k / 7.5) + (random() - 0.5) * 0.7]);
          s.tube(pts, WR, wire);
        } else line([0, H + 0.1, 0], [anchor[0], 0.34, anchor[2]], mix(1.5, 0, tension) + (relic ? 0.8 : 0));
      }
    } else {
      for (const offset of [Math.PI * 0.75, Math.PI * 1.25]) {
        const angle = heading + offset;
        const foot: P3 = [Math.cos(angle) * 5.2, 0.35, Math.sin(angle) * 5.2];
        if (steelBuild) {
          lattice(foot, [0, H - 0.3, 0], 0.45, 0.35, 8, frame);
          s.box([5.4, 0.2, 0.3], [foot[0] / 2, 0.25, foot[2] / 2], frame).rotation.y = -angle;
        } else {
          s.rod(foot, [0, H - 0.3, 0], 0.17, timber, 0.13);
          s.box([5.6, 0.3, 0.34], [foot[0] / 2, 0.25, foot[2] / 2], timber).rotation.y = -angle;
          s.rod([foot[0] * 0.55, 0.4, foot[2] * 0.55], [foot[0] * 0.38, (H - 0.3) * 0.62, foot[2] * 0.38], 0.09, timber);
        }
        // Ballast: offcut blocks piled on the sill end.
        for (let k = 0; k < 3; k++) {
          const ballast = s.box([0.8 + random() * 0.5, 0.5 + random() * 0.25, 0.7 + random() * 0.4], [foot[0] * (1.0 - k * 0.02) + (random() - 0.5) * 0.5, 0.62 + k * 0.5, foot[2] * (1.0 - k * 0.02) + (random() - 0.5) * 0.5], stone);
          ballast.rotation.y = random() * 3;
          if (k === 2) ballast.scale.setScalar(0.7);
        }
      }
    }

    // ---- Winch ---------------------------------------------------------------------------
    const back = heading + Math.PI;
    const wx = Math.cos(back) * 2.2, wz = Math.sin(back) * 2.2;
    const winch = new THREE.Group();
    winch.position.set(wx, 0, wz);
    winch.rotation.y = -heading;
    s.root.add(winch);
    const wadd = (mesh: THREE.Mesh) => { s.root.remove(mesh); winch.add(mesh); return mesh; };
    wadd(s.box([1.7, 0.2, 1.5], [0, 0.1, 0], timber));
    const drum = wadd(s.cylinder(0.32, 0.32, 0.9, [0.3, 0.6, 0], s.material('#56524a', { roughness: 0.9 }), 14));
    drum.rotation.x = Math.PI / 2;
    for (const z of [-0.5, 0.5]) {
      wadd(s.cylinder(0.48, 0.48, 0.05, [0.3, 0.6, z], iron, 16)).rotation.x = Math.PI / 2;
      wadd(s.box([0.9, 0.9, 0.08], [0.3, 0.5, z * 1.25], iron));
    }
    if (a.winch === 'hand') {
      for (const z of [-0.78, 0.78]) {
        wadd(s.rod([0.3, 0.6, z * 0.8], [0.3, 0.6, z], 0.03, iron));
        wadd(s.rod([0.3, 0.6, z], [0.3 + 0.3, 0.6 + 0.3 * z, z], 0.03, iron));
        wadd(s.rod([0.6, 0.6 + 0.3 * z, z], [0.6, 0.6 + 0.3 * z, z * 1.3], 0.035, timber));
      }
      wadd(s.cylinder(0.6, 0.6, 0.06, [0.3, 0.6, 0.56], iron, 20)).rotation.x = Math.PI / 2;
    } else if (a.winch === 'steam') {
      wadd(s.cylinder(0.5, 0.5, 1.9, [-0.6, 1.15, 0], rust('#2f3336'), 16));
      wadd(s.cylinder(0.15, 0.5, 0.4, [-0.6, 2.3, 0], rust('#2f3336'), 16));
      wadd(s.cylinder(0.13, 0.13, 1.6, [-0.6, 3.2, 0], rust('#2f3336'), 10));
      wadd(s.cylinder(0.2, 0.13, 0.25, [-0.6, 4.1, 0], iron, 10));
      for (const y of [0.5, 1.2, 1.9]) wadd(s.cylinder(0.52, 0.52, 0.06, [-0.6, y, 0], rust('#b08a3c', { metalness: 0.6 }), 16));
      wadd(s.box([0.3, 0.3, 0.02], [-0.6, 0.6, 0.5], s.material('#ff7a2a', { emissive: '#ff5a10', emissiveIntensity: relic ? 0 : mix(0.3, 1.4, mood.energy) })));
      if (!relic) for (let i = 0; i < 4; i++) wadd(s.ball([0.25 + i * 0.12, 0.22 + i * 0.1, 0.25 + i * 0.12], [-0.6 + i * 0.22, 4.5 + i * 0.42, i * 0.1], s.material('#e9e9e4', { roughness: 1 }), 10));
    } else {
      const tin = rust('#8fa39a');
      wadd(s.box([2.1, 1.7, 0.08], [-0.2, 0.95, -0.85], tin));
      wadd(s.box([0.08, 1.7, 1.7], [-1.2, 0.95, 0], tin));
      for (const [x, z] of [[0.8, 0.8], [0.8, -0.8], [-1.2, 0.8]]) wadd(s.box([0.1, 1.8, 0.1], [x, 0.9, z], timber));
      const roof = wadd(s.box([2.5, 0.07, 2.1], [-0.2, 1.95, 0], rust('#7d8d86')));
      roof.rotation.z = -0.14;
      wadd(s.box([0.6, 0.5, 0.5], [-0.65, 0.5, 0], rust('#2d6a4a')));
      wadd(s.cylinder(0.2, 0.2, 0.5, [-0.65, 0.55, 0.45], rust('#2d6a4a'), 12)).rotation.x = Math.PI / 2;
    }
    // Hoist rope from the drum to the masthead and out to the boom tip.
    const drumTop: P3 = [wx + hx * 0.3, 0.9, wz + hz * 0.3];
    if (!relic) {
      line(drumTop, [0, 1.3, 0], 0);
      line([hx * 0.3, 1.3, hz * 0.3], [hx * 0.25, H - 0.2, hz * 0.25], 0, 0.028);
      line([hx * 0.25, H - 0.2, hz * 0.25], [tip[0], tip[1] + 0.2, tip[2]], ropeSag * 0.6, 0.028);
    }

    // ---- The hook and what hangs from it -----------------------------------------------------
    const pend = new THREE.Group();
    s.root.add(pend);
    const padd = (mesh: THREE.Mesh) => { s.root.remove(mesh); pend.add(mesh); return mesh; };
    const heavy = a.hook === 'block' || a.hook === 'drum' || a.hook === 'skip';
    const loadH = { empty: 0, clamp: 1.3, block: 1.9, drum: 1.6, skip: 1.7, rider: 1.2 }[a.hook];
    // Height of the hook above the ground.
    let hookY = a.status === 'working' ? (heavy ? loadH + mix(0.9, 1.8, random()) : mix(2.4, 3.4, random())) : heavy ? loadH + 0.02 : Math.min(tip[1] - 1.2, mix(2.6, 4, random()));
    if (a.hook === 'rider') hookY = mix(2.6, 4.2, random());
    if (relic) hookY = 0.75;
    hookY = Math.min(hookY, tip[1] - 0.9);
    const drop = Math.max(0.1, tip[1] - hookY);
    if (relic) {
      pend.position.set(tip[0] + hz * 0.5, 0, tip[2] - hx * 0.5);
      pend.rotation.z = 1.3;
      pend.position.y = 0.2;
    } else {
      pend.position.set(tip[0], tip[1], tip[2]);
      for (const off of [-0.07, 0.07]) padd(s.rod([off, 0, 0], [off, -drop + 0.8, 0], 0.025, wire));
    }
    const y0 = relic ? 0 : -drop; // hook point in pendulum space
    const yellow = rust('#d9a514');
    padd(s.box([0.36, 0.55, 0.22], [0, y0 + 0.62, 0], steelBuild ? yellow : iron));
    padd(s.cylinder(0.2, 0.2, 0.26, [0, y0 + 0.66, 0], iron, 14)).rotation.x = Math.PI / 2;
    const hook = padd(s.ring(0.14, 0.045, [0, y0 + 0.2, 0], iron, Math.PI * 1.45));
    hook.rotation.z = -Math.PI * 0.95;
    padd(s.rod([0, y0 + 0.36, 0], [0, y0 + 0.3, 0], 0.045, iron));
    if (!relic) {
      const slingMat = wire;
      if (a.hook === 'block') {
        const bw = 1.7, bh = 1.05, bd = 1.1, by = y0 - loadH + bh / 2 + 0.02;
        padd(s.box([bw, bh, bd], [0, by, 0], stone));
        padd(s.label(`${Math.floor(100 + random() * 899)}`, 0.8, 0.4, [0, by, bd / 2 + 0.006], '#b8261c', '#ebe9e1'));
        for (const x of [-0.5, 0.5]) {
          for (const z of [-1, 1]) {
            padd(s.rod([x, by - bh / 2, z * (bd / 2 + 0.02)], [x, by + bh / 2, z * (bd / 2 + 0.02)], 0.03, slingMat));
            padd(s.rod([x, by + bh / 2, z * (bd / 2 + 0.02)], [0, y0 + 0.1, 0], 0.03, slingMat));
          }
        }
      } else if (a.hook === 'drum') {
        const dy = y0 - loadH + 0.5;
        const drumGeo = new THREE.CylinderGeometry(0.62, 0.66, 1.0, 20);
        const fluted = padd(s.mesh(drumGeo, s.material('#ebe9e1', { roughness: 0.8, flatShading: true }), [0, dy, 0]));
        void fluted;
        for (let i = 0; i < 20; i++) padd(s.box([0.03, 0.96, 0.03], [Math.cos(i / 20 * 6.283) * 0.645, dy, Math.sin(i / 20 * 6.283) * 0.645], s.material('#cfcdc4')));
        padd(s.rod([0, dy + 0.5, 0], [0, y0 + 0.08, 0], 0.03, slingMat));
        padd(s.box([0.14, 0.2, 0.1], [0, dy + 0.56, 0], iron));
      } else if (a.hook === 'skip') {
        const sy = y0 - loadH + 0.5;
        const skipGeo = new THREE.CylinderGeometry(0.85, 0.55, 0.9, 4, 1);
        skipGeo.rotateY(Math.PI / 4);
        padd(s.mesh(skipGeo, rust('#4a6a7c'), [0, sy, 0]));
        for (let i = 0; i < 9; i++) padd(s.mesh(new THREE.DodecahedronGeometry(0.2 + random() * 0.14, 0), s.material('#dcdad2', { flatShading: true }), [(random() - 0.5) * 0.8, sy + 0.45 + random() * 0.14, (random() - 0.5) * 0.8]));
        for (const x of [-0.58, 0.58]) for (const z of [-0.58, 0.58]) padd(s.rod([x, sy + 0.45, z], [0, y0 + 0.1, 0], 0.022, slingMat));
      } else if (a.hook === 'clamp') {
        // Scissor tongs: two crossed arms on a pin, chains to the hook, points turned in.
        const cy0 = y0 - 0.75;
        for (const side of [-1, 1]) {
          padd(s.rod([side * 0.42, cy0 + 0.45, 0.03 * side], [-side * 0.34, cy0 - 0.3, 0.03 * side], 0.045, iron));
          padd(s.rod([-side * 0.34, cy0 - 0.3, 0.03 * side], [-side * 0.3, cy0 - 0.55, 0.03 * side], 0.045, iron));
          padd(s.rod([-side * 0.3, cy0 - 0.55, 0.03 * side], [-side * 0.14, cy0 - 0.58, 0.03 * side], 0.04, iron, 0.01));
          padd(s.rod([side * 0.42, cy0 + 0.45, 0], [0, y0 + 0.08, 0], 0.022, slingMat));
        }
        padd(s.cylinder(0.06, 0.06, 0.16, [0, cy0 + 0.08, 0], iron, 8)).rotation.x = Math.PI / 2;
      } else if (a.hook === 'rider') {
        const cloth = s.material(mood.cheer > 0.5 ? '#3d6aa8' : '#4b4a44');
        const skin = s.material('#c99772');
        padd(s.rod([0.05, y0 + 0.12, 0], [0.1, y0 + 0.75, 0.1], 0.08, cloth));      // standing leg
        padd(s.rod([0.1, y0 + 0.75, 0.1], [0.32, y0 + 0.35, 0.2], 0.07, cloth));    // free leg
        padd(s.box([0.34, 0.6, 0.22], [0.14, y0 + 1.08, 0.12], s.material(mood.cheer > 0.5 ? '#e8e2d0' : '#8d8676')));
        padd(s.ball([0.12, 0.13, 0.12], [0.16, y0 + 1.53, 0.12], skin, 12));
        padd(s.cylinder(0.17, 0.2, 0.06, [0.16, y0 + 1.63, 0.12], s.material('#3a3630'), 12));
        padd(s.rod([0.14, y0 + 1.3, 0.12], [0.02, y0 + 1.7, 0.02], 0.045, skin));      // arm on the rope
        padd(s.rod([0.3, y0 + 1.3, 0.14], [0.6, y0 + 1.5, 0.3], 0.045, skin));         // arm waving out
      }
    }
    if (a.status !== 'working' && heavy && !relic) {
      // Timber bearers under a load that has been set down.
      for (const x of [-0.5, 0.5]) s.box([0.2, 0.14, 1.5], [tip[0] + x, 0.07, tip[2]], timber);
      pend.position.y += 0.14;
    }

    if (relic) {
      // A stork-sized nest of sticks on the masthead and weeds at the foot.
      s.cylinder(0.75, 0.5, 0.3, [0, H + 0.55, 0], s.material('#6b5a3c', { roughness: 1, flatShading: true }), 9);
      s.cylinder(0.5, 0.55, 0.05, [0, H + 0.7, 0], s.material('#4a3f2b', { roughness: 1 }), 9);
      const weeds: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 60; i++) {
        const r = 1.2 + random() * 3.2, an = random() * 6.283;
        weeds.push({ at: [Math.cos(an) * r, 0.02, Math.sin(an) * r], size: 0.2 + random() * 0.5, color: ['#6f8a3c', '#8a9a48', '#55702f', '#a39f52'][Math.floor(random() * 4)] });
      }
      const blade = new THREE.ConeGeometry(0.3, 1, 5);
      blade.translate(0, 0.5, 0);
      s.scatter(blade, s.material('#ffffff', { roughness: 1 }), weeds);
    }
    // A red-and-white pennant or a lamp at the masthead when the place is lively.
    if (!relic && mood.cheer > 0.45) {
      const flag = s.box([0.7, 0.4, 0.02], [0.38, H + 0.38, 0], new THREE.MeshStandardMaterial({ color: '#d03024', roughness: 0.8, side: THREE.DoubleSide }));
      flag.rotation.y = heading;
    }

    const swing = a.status === 'working' ? mix(0.01, 0.07, mood.energy) : relic ? 0 : 0.008;
    const phase = random() * 6;
    const rest = pend.rotation.z;
    pend.rotation.z = rest + Math.sin(phase) * swing;
    return s.finish({
      footprint: guyed ? 3.4 : 4.2,
      update: (_dt, time) => {
        if (!swing) return;
        pend.rotation.z = rest + Math.sin(time * 1.1 + phase) * swing;
        pend.rotation.x = Math.cos(time * 0.8 + phase) * swing * 0.6;
      },
    });
  },
});
