import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

const CRATES = {
  italian: 'ESPLOSIVI / DINAMITE, an Italian quarry crate.',
  english: 'DANGER HIGH EXPLOSIVES, British or American.',
  german: 'SPRENGSTOFF / VORSICHT in heavy black letters.',
  spanish: 'DINAMITA / PELIGRO, sun-bleached.',
  french: 'EXPLOSIFS / DANGER DE MORT.',
  cartoon: 'Just TNT in huge letters, like a cartoon.',
} as const;
const CRATE_TEXT: Record<keyof typeof CRATES, [string, string]> = {
  italian: ['ESPLOSIVI', 'DINAMITE'], english: ['DANGER', 'HIGH EXPLOSIVES'], german: ['SPRENGSTOFF', 'VORSICHT'],
  spanish: ['DINAMITA', 'PELIGRO'], french: ['EXPLOSIFS', 'DANGER DE MORT'], cartoon: ['TNT', ''],
};

export default defineThing({
  questions: {
    handle: choice('Where is the T-handle?', {
      up: 'Drawn all the way up, armed, waiting for someone to lean on it.',
      halfway: 'Halfway down, caught mid-push.',
      down: 'Pushed home: it has just been fired.',
      removed: 'Taken out for safety and laid on the ground beside the box.',
    }),
    era: choice('What era is the exploder?', {
      victorian: 'Dovetailed oak with brass terminals and a leather strap, around 1900.',
      wartime: 'Olive-drab steel with stencilled numbers and a canvas sling, 1940s.',
      seventies: 'A scuffed orange box with a rubber boot on the plunger and a red charge lamp, 1970s.',
      cartoon: 'Bright red with a yellow handle, exactly as in the cartoons.',
    }),
    crate: choice('What is stencilled on the crate of charges?', CRATES),
    contents: choice('What is left in the crate?', {
      full: 'Packed full of waxed-paper sticks in rows.',
      few: 'Three or four sticks rattling in straw.',
      empty: 'Empty but for straw: everything has been placed.',
      closed: 'Lid still nailed shut.',
    }),
    wire: choice('Where does the firing wire lead?', {
      rock: 'A short way to a drilled boulder: you can see it enter the shot hole.',
      away: 'Away out of sight in a long careless line.',
      cut: 'Nowhere: the wire ends in a frayed, cut stub.',
      reel: 'Nowhere yet: it is all still wound on the reel, unconnected.',
    }),
    flag: choice('What warns people off?', {
      flying: 'A red flag on a stick wedged in a pile of stones.',
      fallen: 'A red flag that has fallen over.',
      sign: 'A hand-painted board on a stake.',
      horn: 'A brass hand-cranked siren beside a red flag.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const eraPaint = { victorian: '#9a6a3a', wartime: '#5a6340', seventies: '#e0701e', cartoon: '#d8261c' }[a.era];
    const body = s.material(eraPaint, { roughness: a.era === 'victorian' ? 0.7 : 0.55, metalness: a.era === 'wartime' ? 0.3 : 0 });
    const brass = s.material('#c9a03c', { metalness: 0.85, roughness: mix(0.25, 0.6, wear) });
    const steel = s.material('#555a5e', { metalness: 0.7, roughness: 0.4 });
    const dark = s.material('#26282a', { roughness: 0.7 });
    const leather = s.material('#5a3a22', { roughness: 0.9 });
    const wood = s.material('#b08c56', { roughness: 0.9 });
    const woodDark = s.material('#8a6a3e', { roughness: 0.95 });
    const wireMat = new THREE.MeshStandardMaterial({ color: a.era === 'victorian' ? '#2c2a26' : a.era === 'wartime' ? '#3a3f2c' : '#e2c21a', roughness: 0.7 });
    const red = new THREE.MeshStandardMaterial({ color: '#d42a1e', roughness: 0.8, side: THREE.DoubleSide });
    const WR = 0.012;

    // ---- The exploder ---------------------------------------------------------------------
    const bw = 0.3, bh = 0.42, bd = 0.25;
    s.box([bw, bh, bd], [0, bh / 2, 0], body);
    s.box([bw + 0.02, 0.025, bd + 0.02], [0, bh + 0.012, 0], a.era === 'victorian' ? woodDark : body);
    s.box([bw + 0.02, 0.02, bd + 0.02], [0, 0.01, 0], a.era === 'victorian' ? woodDark : dark);
    if (a.era === 'victorian') {
      for (let i = 0; i < 6; i++) for (const x of [-1, 1]) s.box([0.012, 0.028, 0.004], [x * (bw / 2 - 0.008), 0.045 + i * 0.05, bd / 2 + 0.001], woodDark);
      for (const x of [-1, 1]) for (const y of [0.03, bh - 0.02]) s.box([0.04, 0.04, 0.005], [x * (bw / 2 - 0.02), y, bd / 2 + 0.003], brass);
      s.label('No. 3  50 SHOTS', 0.13, 0.05, [0, 0.24, bd / 2 + 0.003], '#2a2114', '#c9a03c');
    } else if (a.era === 'wartime') {
      s.label('EXPLODER MK II', 0.18, 0.05, [0, 0.22, bd / 2 + 0.002], '#e8e2c0', eraPaint);
      s.label(`${1000 + Math.floor(random() * 8999)}`, 0.1, 0.04, [0, 0.14, bd / 2 + 0.002], '#e8e2c0', eraPaint);
      for (const x of [-1, 1]) s.box([0.012, bh, 0.012], [x * (bw / 2), bh / 2, bd / 2], dark);
    } else if (a.era === 'seventies') {
      s.box([bw + 0.004, 0.06, bd + 0.004], [0, 0.26, 0], dark);
      s.label('FIRE', 0.1, 0.045, [-0.04, 0.17, bd / 2 + 0.002], '#ffffff', '#26282a');
      s.cylinder(0.018, 0.018, 0.012, [0.07, 0.17, bd / 2 + 0.006], new THREE.MeshStandardMaterial({ color: '#ff3a2a', emissive: '#ff2010', emissiveIntensity: a.handle === 'down' ? 0.1 : 1.8 }), 12).rotation.x = Math.PI / 2;
      s.cylinder(0.035, 0.05, 0.05, [0, bh + 0.05, 0], dark, 12);
    } else {
      s.box([bw + 0.006, 0.05, bd + 0.006], [0, 0.08, 0], s.material('#f2c21a'));
      s.box([bw + 0.006, 0.05, bd + 0.006], [0, 0.27, 0], s.material('#f2c21a'));
    }
    // Carrying strap.
    const strap = s.ring(0.07, 0.012, [-bw / 2 - 0.005, 0.2, 0], a.era === 'wartime' ? s.material('#8a8560', { roughness: 1 }) : leather, Math.PI);
    strap.rotation.set(0, Math.PI / 2, Math.PI / 2);
    // Terminals on top.
    const terminals: P3[] = [[0.075, bh + 0.025, -0.055], [0.075, bh + 0.025, 0.055]];
    for (const t of terminals) {
      s.cylinder(0.012, 0.012, 0.045, [t[0], t[1] + 0.022, t[2]], brass, 8);
      s.cylinder(0.022, 0.022, 0.012, [t[0], t[1] + 0.045, t[2]], brass, 6);
      s.cylinder(0.02, 0.024, 0.008, [t[0], t[1] + 0.004, t[2]], dark, 10);
    }
    // The rack plunger and T-handle.
    const travel = 0.38;
    const rise = { up: travel, halfway: travel * 0.5, down: 0.035, removed: 0 }[a.handle];
    const grip = s.material(a.era === 'cartoon' ? '#f2c21a' : '#6b4a2d', { roughness: 0.7 });
    const handle = new THREE.Group();
    const hAdd = (mesh: THREE.Mesh) => { handle.add(mesh); return mesh; };
    hAdd(s.box([0.022, travel + 0.06, 0.022], [0, (travel + 0.06) / 2, 0], steel));
    for (let i = 0; i < 9; i++) hAdd(s.box([0.008, 0.012, 0.024], [0.014, 0.03 + i * 0.03, 0], dark));
    hAdd(s.cylinder(0.02, 0.02, 0.2, [0, travel + 0.075, 0], grip, 12)).rotation.z = Math.PI / 2;
    for (const x of [-0.1, 0.1]) hAdd(s.ball([0.024, 0.024, 0.024], [x, travel + 0.075, 0], grip, 10));
    hAdd(s.cylinder(0.014, 0.014, 0.03, [0, travel + 0.055, 0], brass, 8));
    s.cylinder(0.03, 0.035, 0.03, [-0.03, bh + 0.035, 0], brass, 10);
    if (a.handle === 'removed') {
      handle.rotation.z = Math.PI / 2;
      handle.rotation.y = 0.5 + random() * 0.6;
      handle.position.set(0.08, 0.022, bd / 2 + 0.2);
    } else handle.position.set(-0.03, bh + rise - travel + 0.02, 0);
    s.root.add(handle);

    // ---- Reel -----------------------------------------------------------------------------
    const rx = 0.5, rz = -0.02, ry = 0.22;
    for (const z of [-0.13, 0.13]) {
      s.rod([rx - 0.14, 0, rz + z], [rx, ry + 0.02, rz + z], 0.012, steel);
      s.rod([rx + 0.14, 0, rz + z], [rx, ry + 0.02, rz + z], 0.012, steel);
      s.cylinder(0.17, 0.17, 0.014, [rx, ry, rz + z * 0.82], a.era === 'victorian' ? wood : steel, 20).rotation.x = Math.PI / 2;
    }
    s.rod([rx - 0.14, 0.01, rz - 0.13], [rx - 0.14, 0.01, rz + 0.13], 0.012, steel);
    s.rod([rx + 0.14, 0.01, rz - 0.13], [rx + 0.14, 0.01, rz + 0.13], 0.012, steel);
    const wound = a.wire === 'reel' ? 0.15 : a.wire === 'away' ? 0.06 : 0.1;
    s.cylinder(wound, wound, 0.2, [rx, ry, rz], wireMat, 18).rotation.x = Math.PI / 2;
    s.cylinder(0.02, 0.02, 0.36, [rx, ry, rz], steel, 8).rotation.x = Math.PI / 2;
    s.rod([rx, ry, rz + 0.17], [rx + 0.07, ry + 0.06, rz + 0.17], 0.01, steel);
    s.rod([rx + 0.07, ry + 0.06, rz + 0.17], [rx + 0.07, ry + 0.06, rz + 0.23], 0.014, grip);

    // ---- The firing wire ---------------------------------------------------------------------
    const ground = 0.012;
    const wander = (from: P3, to: P3, n: number, amount: number): P3[] => {
      const pts: P3[] = [from];
      for (let i = 1; i < n; i++) {
        const t = i / n;
        pts.push([mix(from[0], to[0], t) + (random() - 0.5) * amount, ground, mix(from[2], to[2], t) + (random() - 0.5) * amount]);
      }
      pts.push(to);
      return pts;
    };
    if (a.wire !== 'reel') {
      // Twin leads from the terminals drop to the ground and run to the reel.
      for (const t of terminals) s.tube([[t[0], t[1] + 0.035, t[2]], [t[0] + 0.07, t[1] - 0.02, t[2] * 1.2], [bw / 2 + 0.06, 0.1, t[2] * 1.4], [bw / 2 + 0.1, ground, t[2] * 0.8], [rx - 0.2, ground, rz + t[2] * 0.3], [rx - 0.08, ry - wound + 0.02, rz]], WR, wireMat);
    } else {
      for (const t of terminals) s.tube([[t[0], t[1] + 0.035, t[2]], [t[0] + 0.06, t[1], t[2] * 1.3], [bw / 2 + 0.05, 0.14, t[2] * 1.6]], WR, wireMat);
      s.tube([[rx + 0.1, ry - 0.1, rz], [rx + 0.2, ground, rz + 0.05], [rx + 0.28, ground, rz + 0.12 + random() * 0.05]], WR, wireMat);
    }
    const out: P3 = [rx + 0.12, ry - wound * 0.7, rz];
    if (a.wire === 'rock') {
      const bx = rx + 0.75, bz = rz - 0.25;
      const stone = s.material('#e4e2da', { roughness: 0.95, flatShading: true });
      const boulder = s.mesh(new THREE.DodecahedronGeometry(0.3, 1), stone, [bx, 0.2, bz]);
      boulder.scale.set(1.2, 0.85, 1);
      boulder.rotation.set(random(), random() * 3, random());
      s.mesh(new THREE.DodecahedronGeometry(0.14, 0), stone, [bx - 0.3, 0.07, bz + 0.3]);
      s.cylinder(0.03, 0.03, 0.03, [bx - 0.1, 0.45, bz + 0.05], dark, 10);
      s.tube([out, ...wander([rx + 0.25, ground, rz + 0.05], [bx - 0.34, ground, bz + 0.2], 3, 0.12).slice(0, -1), [bx - 0.36, 0.06, bz + 0.16], [bx - 0.26, 0.36, bz + 0.1], [bx - 0.1, 0.47, bz + 0.05]], WR, wireMat);
      // Clay tamping plug and the wooden tamping rod.
      s.ball([0.045, 0.02, 0.045], [bx - 0.1, 0.46, bz + 0.05], s.material('#a5774a'), 8);
      s.rod([bx + 0.1, 0.02, bz + 0.42], [bx + 0.6, 0.02, bz + 0.3], 0.014, wood);
    } else if (a.wire === 'away') {
      s.tube([out, ...wander([rx + 0.25, ground, rz + 0.08], [rx + 0.85, ground, rz - 0.55], 6, 0.2)], WR, wireMat);
    } else if (a.wire === 'cut') {
      const end: P3 = [rx + 0.5, ground, rz + 0.2];
      s.tube([out, ...wander([rx + 0.22, ground, rz + 0.05], end, 3, 0.1)], WR, wireMat);
      for (let i = 0; i < 4; i++) s.rod(end, [end[0] + 0.05 + random() * 0.04, 0.02 + random() * 0.05, end[2] + (random() - 0.5) * 0.09], 0.003, brass);
      // The pliers that did it.
      s.rod([end[0] + 0.12, 0.012, end[2] + 0.1], [end[0] + 0.3, 0.012, end[2] + 0.16], 0.01, new THREE.MeshStandardMaterial({ color: '#c22a20', roughness: 0.6 }));
      s.rod([end[0] + 0.12, 0.012, end[2] + 0.13], [end[0] + 0.3, 0.012, end[2] + 0.11], 0.01, new THREE.MeshStandardMaterial({ color: '#c22a20', roughness: 0.6 }));
      s.rod([end[0] + 0.05, 0.012, end[2] + 0.1], [end[0] + 0.12, 0.012, end[2] + 0.115], 0.008, steel);
    }

    // ---- Crate of charges --------------------------------------------------------------------
    const cx = -0.5, cz = -0.22, cw = 0.5, chh = 0.26, cd = 0.32;
    const crate = new THREE.Group();
    crate.position.set(cx, 0, cz);
    crate.rotation.y = 0.2 + (random() - 0.5) * 0.3;
    s.root.add(crate);
    const cAdd = <T extends THREE.Object3D>(mesh: T) => { crate.add(mesh); return mesh; };
    const plank = (size: P3, at: P3, alt = false) => cAdd(s.box(size, at, alt ? woodDark : wood));
    plank([cw, 0.02, cd], [0, 0.01, 0]);
    for (const z of [-1, 1]) for (let i = 0; i < 3; i++) plank([cw, chh / 3 - 0.006, 0.018], [0, 0.02 + (i + 0.5) * (chh / 3), z * (cd / 2 - 0.009)], i === 1);
    for (const x of [-1, 1]) {
      plank([0.018, chh, cd - 0.036], [x * (cw / 2 - 0.009), 0.02 + chh / 2, 0], true);
      plank([0.03, chh, 0.03], [x * (cw / 2 - 0.03), 0.02 + chh / 2, cd / 2 + 0.012]);
      // Rope handles.
      const rope = cAdd(s.ring(0.05, 0.01, [x * (cw / 2 + 0.002), 0.2, 0], s.material('#c9b27a', { roughness: 1 }), Math.PI));
      rope.rotation.set(0, Math.PI / 2, Math.PI);
    }
    const [line1, line2] = CRATE_TEXT[a.crate];
    const stencilInk = a.crate === 'cartoon' ? '#c22a20' : '#1f1c18';
    const paper = '#b08c56';
    cAdd(s.label(line1, cw * 0.84, line2 ? 0.1 : 0.2, [0, line2 ? 0.215 : 0.16, cd / 2 + 0.002], stencilInk, paper));
    if (line2) cAdd(s.label(line2, cw * 0.84, 0.08, [0, 0.1, cd / 2 + 0.002], a.crate === 'cartoon' ? stencilInk : '#b3271c', paper));
    const lid = new THREE.Group();
    const lAdd = (mesh: THREE.Mesh) => { lid.add(mesh); return mesh; };
    lAdd(s.box([cw + 0.02, 0.018, cd + 0.02], [0, 0, 0], wood));
    for (const x of [-0.18, 0.18]) lAdd(s.box([0.05, 0.016, cd + 0.02], [x, 0.016, 0], woodDark));
    const top = lAdd(s.label(line1, cw * 0.6, 0.12, [0, 0.011, 0.04], stencilInk, paper));
    top.rotation.x = -Math.PI / 2;
    if (a.contents === 'closed') lid.position.set(0, 0.02 + chh + 0.009, 0);
    else {
      // Prised off and leaned against the back.
      lid.position.set(0.05, 0.19, -cd / 2 - 0.13);
      lid.rotation.x = 1.15;
      lid.rotation.z = 0.06;
    }
    crate.add(lid);
    if (a.contents !== 'closed') {
      const straw: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 60; i++) straw.push({ at: [(random() - 0.5) * (cw - 0.08), (a.contents === 'full' ? 0.12 : 0.1) + random() * 0.08, (random() - 0.5) * (cd - 0.08)], size: 0.02 + random() * 0.025, color: ['#d9c070', '#c9ad5a', '#e4d08a'][Math.floor(random() * 3)] });
      for (let i = 0; i < 10; i++) straw.push({ at: [(random() - 0.5) * (cw + 0.3), 0.005, cd / 2 + random() * 0.2], size: 0.015 + random() * 0.02, color: '#d9c070' });
      const strawGeo = new THREE.BoxGeometry(3.5, 0.3, 0.3);
      const strawMesh = cAdd(s.scatter(strawGeo, s.material('#ffffff', { roughness: 1 }), straw));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
      for (let i = 0; i < straw.length; i++) {
        strawMesh.getMatrixAt(i, m);
        m.decompose(p, q, sc);
        q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.6, random() * Math.PI, (random() - 0.5) * 0.6));
        m.compose(p, q, sc);
        strawMesh.setMatrixAt(i, m);
      }
      const stickMat = s.material(a.crate === 'cartoon' ? '#d42a1e' : '#b5653a', { roughness: 0.8 });
      const count = a.contents === 'full' ? 10 : a.contents === 'few' ? 3 + Math.floor(random() * 2) : 0;
      for (let i = 0; i < count; i++) {
        const full = a.contents === 'full';
        const x = full ? -cw / 2 + 0.07 + i * ((cw - 0.14) / 9) : (random() - 0.5) * (cw - 0.16);
        const stick = cAdd(s.cylinder(0.022, 0.022, cd - 0.08, [x, full ? 0.265 : 0.2 + random() * 0.03, 0], stickMat, 10));
        stick.rotation.x = Math.PI / 2;
        if (!full) stick.rotation.z = (random() - 0.5) * 0.9;
      }
    }
    // One primed stick and a coil of fuse beside the box, if any were taken out.
    if (a.contents === 'few' || a.contents === 'empty') {
      const stickMat = s.material(a.crate === 'cartoon' ? '#d42a1e' : '#b5653a', { roughness: 0.8 });
      const sx = -0.2, sz = 0.3;
      for (let i = 0; i < (a.contents === 'few' ? 3 : 1); i++) s.cylinder(0.022, 0.022, 0.22, [sx + i * 0.046 - (i === 2 ? 0.07 : 0), 0.022 + (i === 2 ? 0.04 : 0), sz], stickMat, 10).rotation.x = Math.PI / 2;
      s.box([0.1, 0.006, 0.03], [sx + 0.03, 0.05, sz], dark);
      const fuse = s.ring(0.06, 0.006, [sx - 0.16, 0.01, sz + 0.02], s.material('#e8e2d0', { roughness: 1 }));
      fuse.rotation.x = Math.PI / 2;
      s.ring(0.045, 0.006, [sx - 0.16, 0.02, sz + 0.02], s.material('#e8e2d0', { roughness: 1 })).rotation.x = Math.PI / 2;
    }

    // ---- Warning ---------------------------------------------------------------------------
    const fx = 0.12, fz = -0.48;
    let cloth: THREE.Mesh | null = null;
    const flagCloth = () => {
      const geometry = new THREE.PlaneGeometry(0.42, 0.3, 8, 3);
      geometry.translate(0.21, 0, 0);
      const mesh = new THREE.Mesh(geometry, red);
      mesh.castShadow = true;
      return mesh;
    };
    const cairn = (x: number, z: number) => {
      const stone = s.material('#dcdad2', { roughness: 1, flatShading: true });
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * 6.283;
        s.mesh(new THREE.DodecahedronGeometry(0.06 + random() * 0.04, 0), stone, [x + Math.cos(ang) * 0.09, 0.05, z + Math.sin(ang) * 0.09]).rotation.set(random() * 3, random() * 3, 0);
      }
      s.mesh(new THREE.DodecahedronGeometry(0.07, 0), stone, [x + 0.03, 0.13, z + 0.02]);
    };
    if (a.flag === 'flying' || a.flag === 'horn') {
      const px = a.flag === 'horn' ? fx - 0.25 : fx;
      cairn(px, fz);
      s.rod([px, 0, fz], [px + 0.04, 1.15, fz], 0.014, wood);
      cloth = flagCloth();
      cloth.position.set(px + 0.04, 0.98, fz);
      cloth.rotation.y = -0.3;
      s.root.add(cloth);
    } else if (a.flag === 'fallen') {
      cairn(fx, fz);
      s.rod([fx + 0.1, 0.03, fz + 0.08], [fx + 0.8, 0.02, fz + 0.2], 0.014, wood);
      cloth = flagCloth();
      cloth.position.set(fx + 0.76, 0.03, fz + 0.2);
      cloth.rotation.set(-Math.PI / 2 + 0.06, 0, 2.2);
      s.root.add(cloth);
    } else {
      s.rod([fx, 0, fz], [fx, 0.85, fz], 0.02, wood);
      const words = { italian: 'MINE!', english: 'BLASTING', german: 'SPRENGUNG', spanish: 'VOLADURA', french: 'TIR DE MINE', cartoon: 'KEEP OUT' }[a.crate];
      const board = s.label(words, 0.5, 0.26, [fx, 0.78, fz + 0.022], '#c22a20', '#f1ead2');
      board.rotation.z = (random() - 0.5) * 0.14;
      s.box([0.52, 0.28, 0.018], [fx, 0.78, fz + 0.01], wood).rotation.z = board.rotation.z;
    }
    if (a.flag === 'horn') {
      // Hand-cranked siren on a little tripod.
      const hx = fx + 0.2, hz = fz + 0.02;
      for (const ang of [0, 2.1, 4.2]) s.rod([hx + Math.cos(ang) * 0.14, 0, hz + Math.sin(ang) * 0.14], [hx, 0.36, hz], 0.01, steel);
      s.cylinder(0.08, 0.08, 0.1, [hx, 0.42, hz], s.material('#c22a20', { metalness: 0.3 }), 14).rotation.x = Math.PI / 2;
      s.cylinder(0.14, 0.05, 0.16, [hx, 0.42, hz + 0.13], brass, 16).rotation.x = Math.PI / 2;
      s.rod([hx + 0.08, 0.42, hz], [hx + 0.14, 0.42, hz], 0.008, steel);
      s.rod([hx + 0.14, 0.42, hz], [hx + 0.14, 0.34, hz], 0.008, steel);
    }

    // Dust and grit under everything in a worn place.
    const grit: { at: P3; size: number }[] = [];
    for (let i = 0; i < 10 + wear * 30 + mood.density * 20; i++) grit.push({ at: [-0.9 + random() * 2.0, 0.006, -0.6 + random() * 1.1], size: 0.008 + random() * 0.02 });
    s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#d9d6cc', { roughness: 1, flatShading: true }), grit);

    const base = cloth ? Float32Array.from(cloth.geometry.attributes.position.array) : null;
    const flying = a.flag === 'flying' || a.flag === 'horn';
    const wave = (time: number) => {
      if (!cloth || !base) return;
      const pos = cloth.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        pos.setZ(i, Math.sin(x * 14 - time * mix(2, 9, mood.energy)) * 0.035 * (x / 0.42) * (flying ? 1 : 0.3));
        if (flying) pos.setY(i, base[i * 3 + 1] - x * x * mix(1.4, 0.2, mood.energy));
      }
      pos.needsUpdate = true;
      cloth.geometry.computeVertexNormals();
    };
    wave(random() * 6);
    return s.finish({ update: (_dt, time) => { if (flying) wave(time); } });
  },
});
