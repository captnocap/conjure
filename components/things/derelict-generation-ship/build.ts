import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
const NAMES = ['ARARAT', 'PROMISE', 'HOPE IV', 'INHERITANCE', 'FAR HARBOUR', 'TOMORROW', 'PATIENCE', 'SECOND EDEN'];

export default defineThing({
  questions: {
    hull: choice('What kind of hull does it have?', {
      ark: 'A riveted iron ark: one long plated cylinder with a blunt prow, ribs and collars.',
      spine: 'A skeletal lattice spine strung with fat habitat drums, tanks and a bow shield.',
      asteroid: 'A hollowed-out asteroid with engines bolted to one end and a wheel round its waist.',
    }),
    fate: choice('What happened to it?', {
      fuel: 'It ran out of fuel: tanks empty or cast off, engines cold, everything else in order.',
      abandoned: 'Abandoned in a hurry: lifeboat bays empty, a hatch left open.',
      inhabited: 'Still inhabited by a few: a greenhouse glows, a vent breathes, a running light blinks.',
      breached: 'Holed by something: a torn wound in the hull and a trail of debris.',
    }),
    lit: score('How much of it is still lit?', ['Entirely dark', 'A single band of windows', 'Several decks still burning']),
    bow: choice('What is painted on the bow?', {
      name: 'Its name in tall stencilled letters.',
      tree: 'A white tree, the emblem of whoever launched it.',
      sun: 'A yellow sun with rays: the star it left, or the one it was promised.',
      tally: 'Row upon row of tally marks, one for every year or every generation.',
      hands: 'Hundreds of small painted handprints in many colours.',
      bare: 'Whatever was there has flaked away to a few scraps of paint.',
    }),
    length: score('How long is it?', ['Stubby, a few hundred metres', 'A long kilometre', 'Impossibly long, with more drums than anyone could fill']),
    drift: choice('How is it drifting?', {
      level: 'Dead level and broadside, like a ship becalmed.',
      nosedown: 'Bow dipped, slowly pitching.',
      tumbling: 'Turning end over end, very slowly.',
      rolling: 'Rolling about its long axis, the lit windows coming round like a clock hand.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = mix(420, 1500, a.length);
    const stretch = mix(0.8, 1.35, a.length); // longer ships are relatively slimmer and carry more drums
    const ship = new THREE.Group();
    ship.scale.setScalar(L / (10 * stretch));
    const pose = new THREE.Group();
    pose.add(ship);
    s.root.add(pose);
    const X = (x: number) => x * stretch;

    const hullTint = new THREE.Color('#454d54').lerp(new THREE.Color('#5a4a40'), mood.warmth * 0.4);
    const glow = mix(0.9, 1.8, mood.cheer);
    const hull = new THREE.MeshStandardMaterial({ color: hullTint, metalness: 0.45, roughness: mix(0.55, 0.9, mood.wear), flatShading: true });
    const darker = new THREE.MeshStandardMaterial({ color: hullTint.clone().multiplyScalar(0.55), metalness: 0.3, roughness: 0.85, flatShading: true });
    const pale = new THREE.MeshStandardMaterial({ color: '#98a2a4', metalness: 0.4, roughness: 0.6, flatShading: true });
    const black = new THREE.MeshStandardMaterial({ color: '#0d0f12', roughness: 1 });
    const windowWarm = new THREE.Color().setHSL(mix(0.14, 0.09, mood.warmth), 0.95, 0.62);
    const lamp = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: windowWarm, emissiveIntensity: 1.1 * glow, roughness: 0.4 });
    const beacon = new THREE.MeshStandardMaterial({ color: '#ff3b30', emissive: '#ff2a20', emissiveIntensity: 2 });
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P = [0, 0, 0], parent: THREE.Object3D = ship) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    // A cylinder lying along the ship's axis, from x0 to x1.
    const barrel = (x0: number, x1: number, r0: number, r1: number, material: THREE.Material, sides = 8, open = false) => {
      const geometry = new THREE.CylinderGeometry(r1, r0, Math.abs(x1 - x0), sides, 1, open);
      geometry.rotateY(Math.PI / sides);
      geometry.rotateZ(-Math.PI / 2);
      return solid(geometry, material, [(x0 + x1) / 2, 0, 0]);
    };

    // Instanced boxes (plates, patches, windows) and rods (truss members).
    const boxes: { at: P; size: P; turn: THREE.Euler; colour: THREE.Color }[] = [];
    const lights: { at: P; size: P; turn: THREE.Euler; colour: THREE.Color }[] = [];
    const rods: { from: THREE.Vector3; to: THREE.Vector3; radius: number }[] = [];
    const patchTints = ['#7c4a34', '#8f989a', '#3a4a5c', '#6a6f58', '#a4683c'].map((hex) => new THREE.Color(hex));
    const around = (x: number, radius: number, theta: number): P => [x, Math.sin(theta) * radius, Math.cos(theta) * radius];
    const patches = (x0: number, x1: number, radius: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const theta = mix(-1.3, 1.9, random());
        boxes.push({ at: around(mix(x0, x1, random()), radius, theta), size: [mix(0.12, 0.5, random()), mix(0.1, 0.3, random()), 0.02], turn: new THREE.Euler(-theta, 0, (random() - 0.5) * 0.2), colour: patchTints[Math.floor(random() * patchTints.length)] });
      }
    };
    const bands: { lit: boolean }[] = [];
    const litBands = Math.max(a.fate === 'inhabited' ? 1 : 0, Math.round(a.lit * 3));
    const litChance = mix(0.35, 0.8, mood.cheer);
    const nextBand = () => {
      const band = { lit: bands.length < litBands };
      bands.push(band);
      return band;
    };
    const pane = (at: P, size: P, turn: THREE.Euler, lit: boolean) => {
      if (lit && random() < litChance) lights.push({ at, size, turn, colour: windowWarm.clone().offsetHSL((random() - 0.5) * 0.04, 0, (random() - 0.5) * 0.15) });
      else boxes.push({ at, size, turn, colour: new THREE.Color('#14181d') });
    };
    // A row of windows along the hull, on the side that faces the viewer.
    const windowRow = (x0: number, x1: number, radius: number, theta: number, lit: boolean) => {
      const count = Math.round((x1 - x0) / 0.085);
      for (let i = 0; i < count; i++) pane(around(mix(x0, x1, (i + 0.5) / count), radius, theta), [0.06, 0.06, 0.02], new THREE.Euler(-theta, 0, 0), lit);
    };
    // A ring of windows round the rim of a drum or wheel.
    const windowRing = (x: number, radius: number, lit: boolean, count = 44) => {
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        pane(around(x, radius, theta), [0.085, 0.07, 0.02], new THREE.Euler(-theta, 0, 0), lit);
      }
    };
    const bell = (x: number, y: number, z: number, radius: number) => {
      const geometry = new THREE.CylinderGeometry(radius * 0.35, radius, radius * 1.7, 14, 1, true);
      geometry.rotateZ(-Math.PI / 2);
      const mesh = solid(geometry, new THREE.MeshStandardMaterial({ color: '#2a2c30', metalness: 0.6, roughness: 0.6, side: THREE.DoubleSide }), [x - radius * 0.85, y, z]);
      return mesh;
    };

    let artAt: { at: P; width: number; height: number; backing: THREE.Color; panel: boolean };
    let woundAt: P, woundOut: THREE.Vector3;
    let bayRow: { x0: number; x1: number; radius: number; theta: number };
    let greenhouseAt: P;
    let stern: number, bowTip: number;
    const drumXs: number[] = [];
    let drumRadius = 0.9;

    if (a.hull === 'ark') {
      const r = 0.62;
      barrel(X(-3.6), X(3.4), r, r, hull);
      barrel(X(3.4), X(4.3), r, r * 0.5, hull);
      solid(new THREE.SphereGeometry(r * 0.5, 16, 10), pale, [X(4.3), 0, 0]).scale.set(0.8, 1, 1);
      barrel(X(-4.1), X(-3.6), r * 0.75, r * 0.9, darker);
      for (const [y, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) bell(X(-4.1), y * 0.26, z * 0.26, 0.24);
      const ribs = Math.round(11 * stretch);
      for (let i = 0; i <= ribs; i++) barrel(X(-3.6) + (X(7) * i) / ribs - 0.025, X(-3.6) + (X(7) * i) / ribs + 0.025, r * 1.045, r * 1.045, darker);
      // Dorsal keel and ventral fin break the tube into a ship.
      solid(new THREE.BoxGeometry(X(5.6), 0.16, 0.1), darker, [X(-0.3), r + 0.06, 0]);
      solid(new THREE.BoxGeometry(X(1.6), 0.34, 0.06), hull, [X(-2.6), -r - 0.14, 0]);
      // Two stopped spin collars.
      const collars = stretch > 1.1 ? [-2.2, 0, 2.0] : [-1.5, 1.4];
      drumRadius = 0.86;
      for (const x of collars) {
        barrel(X(x) - 0.32, X(x) + 0.32, drumRadius, drumRadius, hull, 16);
        drumXs.push(X(x));
      }
      patches(X(-3.5), X(3.3), r * 0.935, Math.round(mix(4, 40, mood.wear)));
      const face = r * Math.cos(Math.PI / 8) + 0.012;
      for (const theta of [0.2, -0.12, 0.52]) windowRow(X(-3.2), X(2.0), face / Math.cos(theta > 0.39 ? theta - Math.PI / 4 : theta), theta, nextBand().lit);
      artAt = { at: [X(2.75), 0, face], width: X(1.7), height: 0.45, backing: hullTint, panel: false };
      woundAt = [X(-0.7), r * 0.5, r * 0.75];
      woundOut = new THREE.Vector3(0, 0.55, 0.83);
      bayRow = { x0: X(-3.0), x1: X(-0.6), radius: r * 0.96, theta: -0.62 };
      greenhouseAt = [X(0.75), r + 0.14, 0];
      stern = X(-4.5);
      bowTip = X(4.7);
    } else if (a.hull === 'spine') {
      for (let k = 0; k < 3; k++) {
        const theta = (k / 3) * Math.PI * 2 + 0.5;
        const [, y, z] = around(0, 0.13, theta);
        rods.push({ from: new THREE.Vector3(X(-4.2), y, z), to: new THREE.Vector3(X(4.2), y, z), radius: 0.022 });
        const bays = Math.round(28 * stretch);
        for (let i = 0; i < bays; i++) {
          const next = around(0, 0.13, theta + (Math.PI * 2) / 3);
          const x0 = X(-4.2) + (X(8.4) * i) / bays, x1 = X(-4.2) + (X(8.4) * (i + 1)) / bays;
          rods.push({ from: new THREE.Vector3(x0, y, z), to: new THREE.Vector3(x1, next[1], next[2]), radius: 0.012 });
        }
      }
      drumRadius = 0.92;
      const drums = Math.max(2, Math.round(mix(2, 3.4, mood.density) * stretch));
      for (let i = 0; i < drums; i++) {
        const x = X(mix(-1.6, 3.0, drums === 1 ? 0.5 : i / (drums - 1)));
        drumXs.push(x);
        const half = Math.min(0.36, (X(4.6) / drums) * 0.36);
        barrel(x - half, x + half, drumRadius, drumRadius, hull, 20);
        barrel(x - half - 0.03, x - half, drumRadius * 1.03, drumRadius * 1.03, darker, 20);
        barrel(x + half, x + half + 0.03, drumRadius * 1.03, drumRadius * 1.03, darker, 20);
        barrel(x - half - 0.12, x + half + 0.12, 0.22, 0.22, pale, 10);
        patches(x - half, x + half, drumRadius * 0.97, Math.round(mix(1, 9, mood.wear)));
      }
      // Bow shield, tanks or their empty cradles, and the engine block.
      const shield = new THREE.ConeGeometry(0.95, 0.4, 20, 1, false);
      shield.rotateZ(-Math.PI / 2);
      solid(shield, pale, [X(4.3), 0, 0]);
      for (let k = 0; k < 4; k++) {
        const [, y, z] = around(0, 0.46, (k / 4) * Math.PI * 2 + 0.78);
        for (const x of [X(-2.6), X(-3.3)]) {
          if (a.fate === 'fuel') {
            const cradle = solid(new THREE.TorusGeometry(0.3, 0.018, 5, 20), pale, [x, y, z]);
            cradle.rotation.y = Math.PI / 2;
          } else solid(new THREE.SphereGeometry(0.3, 14, 10), k % 2 ? pale : hull, [x, y, z]);
        }
      }
      barrel(X(-4.2), X(-3.75), 0.42, 0.3, darker, 10);
      for (let k = 0; k < 3; k++) {
        const [, y, z] = around(0, 0.24, (k / 3) * Math.PI * 2);
        bell(X(-4.2), y, z, 0.24);
      }
      artAt = { at: [X(3.65), -0.05, 0.3], width: X(1.0), height: 0.5, backing: new THREE.Color('#5b6368'), panel: true };
      woundAt = [drumXs[0], drumRadius * 0.45, drumRadius * 0.8];
      woundOut = new THREE.Vector3(0, 0.5, 0.86);
      bayRow = { x0: X(-1.2), x1: X(0.9), radius: 0.24, theta: 0.3 };
      greenhouseAt = [drumXs.length > 1 ? (drumXs[0] + drumXs[1]) / 2 : X(0.6), 0.28, 0];
      stern = X(-4.6);
      bowTip = X(4.5);
    } else {
      // The rock itself.
      const rock = new THREE.IcosahedronGeometry(1, 4);
      const lobes = Array.from({ length: 8 }, () => ({ k: new THREE.Vector3((random() - 0.5) * 7, (random() - 0.5) * 7, (random() - 0.5) * 7), p: random() * 6.3 }));
      const position = rock.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i);
        const lump = 1 + lobes.reduce((sum, lobe) => sum + Math.sin(v.dot(lobe.k) + lobe.p), 0) * 0.035;
        position.setXYZ(i, v.x * lump * X(4.0), v.y * lump * 1.05, v.z * lump * 1.15);
      }
      rock.computeVertexNormals();
      solid(rock, new THREE.MeshStandardMaterial({ color: new THREE.Color('#5d564e').lerp(hullTint, 0.3), roughness: 0.95, flatShading: true }));
      drumRadius = 1.62;
      const wheelX = X(0.9);
      drumXs.push(wheelX);
      const wheel = solid(new THREE.TorusGeometry(drumRadius, 0.11, 8, 56), hull, [wheelX, 0, 0]);
      wheel.rotation.y = Math.PI / 2;
      wheel.scale.z = 1.8;
      for (let k = 0; k < 6; k++) {
        const [, y, z] = around(0, 1, (k / 6) * Math.PI * 2 + 0.3);
        rods.push({ from: new THREE.Vector3(wheelX, y * 0.9, z * 0.9), to: new THREE.Vector3(wheelX, y * drumRadius, z * drumRadius), radius: 0.03 });
      }
      barrel(X(-4.5), X(-3.6), 0.62, 0.7, darker, 10);
      for (let k = 0; k < 3; k++) {
        const [, y, z] = around(0, 0.3, (k / 3) * Math.PI * 2);
        bell(X(-4.5), y, z, 0.28);
      }
      // A carved gallery along the flank, a dock collar and a mast.
      solid(new THREE.BoxGeometry(X(3.6), 0.2, 0.1), black, [X(-1.5), 0.12, 1.1]);
      windowRow(X(-3.2), X(0.2), 1.19, 0.14, nextBand().lit);
      windowRow(X(-3.2), X(0.2), 1.19, 0.06, nextBand().lit);
      barrel(X(3.5), X(4.2), 0.42, 0.3, pale, 12);
      rods.push({ from: new THREE.Vector3(X(2.2), 0.8, 0), to: new THREE.Vector3(X(2.2), 1.75, 0), radius: 0.02 });
      const dish = solid(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, 1), pale, [X(2.2), 1.5, 0.05]);
      dish.rotation.x = Math.PI / 2 + 0.4;
      artAt = { at: [X(2.3), 0.05, 1.02], width: X(1.3), height: 0.52, backing: new THREE.Color('#5b6368'), panel: true };
      woundAt = [X(-2.0), 0.55, 0.85];
      woundOut = new THREE.Vector3(0, 0.6, 0.8);
      bayRow = { x0: X(-2.8), x1: X(-0.6), radius: 1.14, theta: -0.25 };
      greenhouseAt = [X(-0.9), 1.02, 0.1];
      stern = X(-4.95);
      bowTip = X(4.3);
    }

    // Drum windows: every drum carries a band, and they share the lit budget with the hull.
    drumXs.forEach((x) => {
      const band = nextBand();
      windowRing(x - 0.12, drumRadius + (a.hull === 'asteroid' ? 0.1 : 0.012), band.lit, a.hull === 'asteroid' ? 70 : 44);
      if (a.hull !== 'asteroid') windowRing(x + 0.12, drumRadius + 0.012, false);
      if (a.hull !== 'asteroid')
        for (let k = 0; k < 4; k++) {
          const [, y, z] = around(0, 1, (k / 4) * Math.PI * 2 + x);
          rods.push({ from: new THREE.Vector3(x, y * 0.2, z * 0.2), to: new THREE.Vector3(x, y * drumRadius, z * drumRadius), radius: 0.03 });
        }
    });

    // What happened.
    const drifting = new THREE.Group();
    ship.add(drifting);
    if (a.fate === 'fuel') {
      // A cast-off tank hangs behind, and a fuel line dangles.
      const tank = solid(new THREE.CapsuleGeometry(0.26, 0.6, 6, 14), pale, [stern - 0.9, -0.7, 0.5], drifting);
      tank.rotation.set(0.6, 0.3, 1.1);
      solid(new THREE.TorusGeometry(0.27, 0.02, 5, 20), darker, [stern - 0.9, -0.7, 0.5], drifting).rotation.set(0.6, 0.3 + Math.PI / 2, 1.1);
      const hose = new THREE.CatmullRomCurve3([new THREE.Vector3(stern + 0.5, -0.3, 0.3), new THREE.Vector3(stern + 0.1, -0.7, 0.5), new THREE.Vector3(stern - 0.25, -0.55, 0.65), new THREE.Vector3(stern - 0.45, -0.8, 0.5)]);
      solid(new THREE.TubeGeometry(hose, 24, 0.018, 5), black);
    } else if (a.fate === 'abandoned') {
      const bays = 8;
      for (let i = 0; i < bays; i++) {
        const at = around(mix(bayRow.x0, bayRow.x1, i / (bays - 1)), bayRow.radius, bayRow.theta);
        boxes.push({ at, size: [0.17, 0.13, 0.05], turn: new THREE.Euler(-bayRow.theta, 0, 0), colour: new THREE.Color('#0d0f12') });
        boxes.push({ at: [at[0], at[1] + Math.cos(bayRow.theta) * 0.085, at[2] - Math.sin(bayRow.theta) * 0.085], size: [0.2, 0.025, 0.06], turn: new THREE.Euler(-bayRow.theta, 0, 0), colour: new THREE.Color('#d9a21e') });
      }
      // One boat never launched; one is drifting off.
      const boatPaint = new THREE.MeshStandardMaterial({ color: '#d9622a', roughness: 0.6 });
      const kept = around(mix(bayRow.x0, bayRow.x1, 2 / (bays - 1)), bayRow.radius + 0.03, bayRow.theta);
      solid(new THREE.CapsuleGeometry(0.05, 0.1, 4, 8), boatPaint, kept).rotation.z = Math.PI / 2;
      const away = solid(new THREE.CapsuleGeometry(0.06, 0.13, 4, 8), boatPaint, [mix(bayRow.x0, bayRow.x1, 0.7), -1.5, 1.3], drifting);
      away.rotation.set(0.4, 0.6, 1.2);
      // The hatch somebody did not close.
      const hatchAt = around(bayRow.x1 + 0.35, bayRow.radius, bayRow.theta + 0.5);
      boxes.push({ at: hatchAt, size: [0.16, 0.2, 0.04], turn: new THREE.Euler(-bayRow.theta - 0.5, 0, 0), colour: new THREE.Color('#0d0f12') });
      boxes.push({ at: [hatchAt[0] + 0.13, hatchAt[1], hatchAt[2] + 0.07], size: [0.16, 0.2, 0.015], turn: new THREE.Euler(-bayRow.theta - 0.5, 1.1, 0), colour: new THREE.Color('#98a2a4') });
    } else if (a.fate === 'inhabited') {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#bfe8c8', transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false }));
      dome.position.set(...greenhouseAt);
      ship.add(dome);
      solid(new THREE.CylinderGeometry(0.31, 0.33, 0.05, 20), pale, greenhouseAt);
      const leaf = new THREE.MeshStandardMaterial({ color: '#3f9a4a', emissive: '#2fd45a', emissiveIntensity: 0.7 * glow, roughness: 0.8, flatShading: true });
      for (let i = 0; i < 7; i++) solid(new THREE.IcosahedronGeometry(mix(0.05, 0.1, random()), 0), leaf, [greenhouseAt[0] + (random() - 0.5) * 0.36, greenhouseAt[1] + 0.07 + random() * 0.08, greenhouseAt[2] + (random() - 0.5) * 0.36]);
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#7d8a96', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
      plume.position.set(greenhouseAt[0] - 1.1, greenhouseAt[1] + 0.4, greenhouseAt[2]);
      plume.rotation.z = Math.PI + 0.25;
      ship.add(plume);
      solid(new THREE.SphereGeometry(0.045, 8, 6), beacon, [bowTip - 0.35, a.hull === 'asteroid' ? 1.05 : a.hull === 'spine' ? 1.0 : 0.42, 0.05]);
    } else {
      const out = woundOut.clone().normalize();
      const hole = solid(new THREE.SphereGeometry(0.34, 16, 10), black, woundAt);
      hole.scale.set(1.25, 0.9, 0.9);
      hole.position.addScaledVector(out, -0.22);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), out);
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2 + random() * 0.4;
        const petal = solid(new THREE.ConeGeometry(0.1, mix(0.22, 0.42, random()), 3), i % 3 ? hull : pale, woundAt);
        const offset = new THREE.Vector3(Math.cos(angle) * 0.4, Math.sin(angle) * 0.3, 0.04).applyQuaternion(quaternion);
        petal.position.add(offset);
        petal.quaternion.copy(quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - 0.9, 0, angle - Math.PI / 2, 'ZXY')));
      }
      const count = Math.round(mix(30, 110, mood.density));
      const scrap = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1, 0), pale, count);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3(), at = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const far = random() ** 1.5 * 2.6;
        at.set(...woundAt).addScaledVector(out, 0.3 + far).add(new THREE.Vector3(-far * 0.5 + (random() - 0.5) * far * 0.6, (random() - 0.5) * far * 0.5, (random() - 0.5) * far * 0.5));
        turn.setFromEuler(new THREE.Euler(random() * 6, random() * 6, 0));
        scale.set(mix(0.02, 0.09, random() ** 2), mix(0.02, 0.07, random()), 0.012);
        scrap.setMatrixAt(i, matrix.compose(at, turn, scale));
      }
      scrap.castShadow = true;
      drifting.add(scrap);
    }

    // The bow painting.
    {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = Math.round((512 * artAt.height) / artAt.width);
      const ctx = canvas.getContext('2d')!;
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = `#${artAt.backing.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = 'round';
      const white = '#e9e6da';
      if (a.bow === 'name') {
        const name = NAMES[Math.floor(random() * NAMES.length)];
        ctx.fillStyle = white;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.min(h * 0.72, (w / name.length) * 1.45)}px monospace`;
        ctx.fillText(name, w / 2, h * 0.52, w * 0.94);
        ctx.fillRect(w * 0.04, h * 0.9, w * 0.92, h * 0.04);
      } else if (a.bow === 'tree') {
        ctx.strokeStyle = white;
        const branch = (x: number, y: number, angle: number, length: number, depth: number) => {
          const x1 = x + Math.cos(angle) * length, y1 = y + Math.sin(angle) * length;
          ctx.lineWidth = depth * 2.2 + 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x1, y1);
          ctx.stroke();
          if (depth > 0) for (const side of [-1, 1]) branch(x1, y1, angle + side * mix(0.35, 0.7, random()), length * 0.72, depth - 1);
        };
        branch(w / 2, h * 0.97, -Math.PI / 2, h * 0.3, 5);
      } else if (a.bow === 'sun') {
        ctx.fillStyle = ctx.strokeStyle = '#f0c231';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, h * 0.24, 0, 7);
        ctx.fill();
        ctx.lineWidth = h * 0.045;
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2, far = h * (i % 2 ? 0.4 : 0.47);
          ctx.beginPath();
          ctx.moveTo(w * 0.5 + Math.cos(angle) * h * 0.3, h * 0.5 + Math.sin(angle) * h * 0.3);
          ctx.lineTo(w * 0.5 + Math.cos(angle) * far, h * 0.5 + Math.sin(angle) * far);
          ctx.stroke();
        }
      } else if (a.bow === 'tally') {
        ctx.strokeStyle = white;
        ctx.lineWidth = 4;
        const groups = Math.round(mix(14, 38, random()));
        for (let g = 0; g < groups; g++) {
          const gx = 22 + (g % 10) * ((w - 44) / 10), gy = h * 0.1 + Math.floor(g / 10) * h * 0.23;
          const marks = g === groups - 1 ? 1 + Math.floor(random() * 4) : 5;
          for (let k = 0; k < Math.min(4, marks); k++) { ctx.beginPath(); ctx.moveTo(gx + k * 8, gy); ctx.lineTo(gx + k * 8 + (random() - 0.5) * 3, gy + h * 0.16); ctx.stroke(); }
          if (marks === 5) { ctx.beginPath(); ctx.moveTo(gx - 5, gy + h * 0.13); ctx.lineTo(gx + 30, gy + h * 0.03); ctx.stroke(); }
        }
      } else if (a.bow === 'hands') {
        const inks = ['#e9e6da', '#d9622a', '#f0c231', '#4f9ad6', '#c94f6a', '#6cc070'];
        for (let i = 0; i < 90; i++) {
          const x = random() * w, y = random() * h, size = mix(9, 17, random()), tilt = (random() - 0.5) * 1.2 - Math.PI / 2;
          ctx.fillStyle = ctx.strokeStyle = inks[Math.floor(random() * inks.length)];
          ctx.beginPath();
          ctx.ellipse(x, y, size * 0.6, size * 0.7, tilt, 0, 7);
          ctx.fill();
          ctx.lineWidth = size * 0.26;
          for (let f = -2; f <= 2; f++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(tilt + f * 0.38) * size * 1.5, y + Math.sin(tilt + f * 0.38) * size * 1.5); ctx.stroke(); }
        }
      } else {
        for (let i = 0; i < 26; i++) {
          ctx.fillStyle = random() < 0.6 ? 'rgba(233,230,218,0.8)' : 'rgba(200,70,50,0.8)';
          ctx.beginPath();
          ctx.ellipse(random() * w, random() * h, mix(3, 22, random()), mix(2, 9, random()), random() * 3, 0, 7);
          ctx.fill();
        }
      }
      // Time takes the paint off in chips.
      ctx.fillStyle = `#${artAt.backing.getHexString()}`;
      for (let i = 0; i < mood.wear * 260; i++) {
        ctx.beginPath();
        ctx.ellipse(random() * w, random() * h, mix(2, 14, random()), mix(2, 7, random()), random() * 3, 0, 7);
        ctx.fill();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      if (artAt.panel) solid(new THREE.BoxGeometry(artAt.width + 0.08, artAt.height + 0.08, 0.05), darker, [artAt.at[0], artAt.at[1], artAt.at[2] - 0.03]);
      solid(new THREE.PlaneGeometry(artAt.width, artAt.height), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, metalness: 0.2 }), artAt.at);
    }

    // Flush the instanced parts.
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3(), at = new THREE.Vector3();
    const flush = (list: typeof boxes, material: THREE.Material) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, list.length);
      list.forEach((item, index) => {
        mesh.setMatrixAt(index, matrix.compose(at.set(...item.at), turn.setFromEuler(item.turn), scale.set(...item.size)));
        mesh.setColorAt(index, item.colour);
      });
      mesh.castShadow = true;
      ship.add(mesh);
    };
    flush(boxes, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, metalness: 0.3 }));
    flush(lights, lamp);
    if (rods.length) {
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), pale, rods.length);
      const upAxis = new THREE.Vector3(0, 1, 0), span = new THREE.Vector3();
      rods.forEach((rod, index) => {
        span.subVectors(rod.to, rod.from);
        const length = span.length();
        turn.setFromUnitVectors(upAxis, span.normalize());
        mesh.setMatrixAt(index, matrix.compose(at.addVectors(rod.from, rod.to).multiplyScalar(0.5), turn, scale.set(rod.radius, length, rod.radius)));
      });
      mesh.castShadow = true;
      ship.add(mesh);
    }

    const tilt = { level: [0.03, 0.06], nosedown: [-0.3, 0.15], tumbling: [0.5, -0.2], rolling: [0.05, 0.1] }[a.drift];
    pose.rotation.z = tilt[0] + (random() - 0.5) * 0.06;
    pose.rotation.y = tilt[1] + (random() - 0.5) * 0.1;
    if (a.drift === 'rolling') ship.rotation.x = mix(-0.5, 0.5, random());
    const pace = mix(0.3, 1.5, mood.energy);
    return s.finish({
      footprint: L * 0.12,
      update(dt, time) {
        if (a.drift === 'tumbling') pose.rotation.z += dt * 0.03 * pace;
        else if (a.drift === 'nosedown') pose.rotation.z = tilt[0] + Math.sin(time * 0.15 * pace) * 0.08;
        else if (a.drift === 'rolling') ship.rotation.x += dt * 0.05 * pace;
        drifting.position.x -= dt * 0.004 * pace;
        beacon.emissiveIntensity = (time * 0.7) % 1 < 0.2 ? 3 : 0.1;
        lamp.emissiveIntensity = 1.1 * glow * (1 + Math.sin(time * 9) * 0.02 * mood.energy);
      },
    });
  },
});
