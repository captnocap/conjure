import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { Batch, card, painted, pick } from './util';

type V3 = [number, number, number];

const DIMS = {
  trumpet: { L: 0.62, D: 0.27, HB: 0.1, HL: 0.07 },
  saxophone: { L: 0.76, D: 0.34, HB: 0.12, HL: 0.08 },
  violin: { L: 0.84, D: 0.3, HB: 0.09, HL: 0.065 },
  accordion: { L: 0.56, D: 0.46, HB: 0.2, HL: 0.1 },
} as const;

export default defineThing({
  questions: {
    instrument: choice('What is in the case?', {
      trumpet: 'A trumpet: bell, three valves, a loop of tube.',
      saxophone: 'An alto saxophone, its curved bell and pearl keys.',
      violin: 'A violin with its bow clipped in the lid.',
      accordion: 'A piano accordion, bellows strapped shut.',
    }),
    finish: choice('What condition is its finish in?', {
      gleaming: 'Gleaming: polished lacquer or fresh varnish, loved until last week.',
      silver: 'Pale and cool: silver plate, blond wood or white pearl.',
      tarnished: 'Tarnished dull and dark, years of fingerprints etched in.',
      battered: 'Battered: dents, bare patches, a repair that shows.',
    }),
    plush: choice('What colour is the plush lining?', {
      royal: 'Royal blue plush.',
      crimson: 'Crimson plush, a little theatrical.',
      mustard: 'Mustard-gold plush from the 1950s.',
      purple: 'Deep purple crushed velvet.',
      grey: 'Grey lining gone bald at the edges.',
    }),
    shell: choice('What is the outside of the case like?', {
      black: 'Black pebbled leatherette with chrome latches.',
      tweed: 'Brown tweed with a stripe, an old band-room case.',
      leather: 'Tan leather with stitched edges and brass corners.',
      flight: 'A battered aluminium flight case with riveted edges.',
    }),
    stand: choice('What does the open case rest on?', {
      xframe: 'A folding X-frame luggage stand with webbing straps.',
      stool: 'A round wooden stool.',
      cases: 'A stack of other closed instrument cases, each with its own ticket.',
      draped: 'A display table draped in dark cloth.',
    }),
    lid: choice('What is tucked into the lid?', {
      bare: 'Nothing; just the lining.',
      photo: 'A curled photograph of someone playing it.',
      'sheet-music': 'A few pages of sheet music.',
      setlist: 'A handwritten set list on yellow paper.',
      ribbons: 'Old contest ribbons, first and second place.',
    }),
    missing: noul('Is its mouthpiece or bow missing, the slot in the plush empty?'),
    ticket: choice('What does the tag tied to the handle say?', {
      pawn: 'A pink pawn ticket with a number: the owner means to come back.',
      hold: 'A manila tag reading HOLD.',
      forfeit: 'A red tag: FORFEIT, now for sale.',
      price: 'A plain white price tag.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const { L, D, HB, HL } = DIMS[a.instrument];
    const T = 0.012;

    // ---- stand ----
    const steel = s.material('#c3c7c9', { metalness: 0.5, roughness: 0.32 });
    const dark = s.material('#161618');
    let top = 0.52;
    if (a.stand === 'xframe') {
      top = 0.5;
      const span = D * 0.5 + 0.03;
      for (const x of [-1, 1]) {
        const px = x * (L / 2 - 0.08);
        s.rod([px, 0, -span], [px, top, span], 0.011, steel);
        s.rod([px, 0, span], [px, top, -span], 0.011, steel);
        s.cylinder(0.014, 0.014, 0.03, [px, top / 2, 0], dark, 8).rotation.z = Math.PI / 2;
      }
      for (const z of [-1, 1]) {
        s.rod([-(L / 2 - 0.08), top, z * span], [L / 2 - 0.08, top, z * span], 0.011, steel);
        s.rod([-(L / 2 - 0.08), 0.012, z * span], [L / 2 - 0.08, 0.012, z * span], 0.009, steel);
      }
      const web = s.material(pick(random, ['#2a2a2e', '#7a2a22', '#3a4a3a']), { roughness: 1 });
      for (let i = 0; i < 3; i++) s.box([0.045, 0.004, span * 2], [(i - 1) * (L / 2 - 0.16), top + 0.012, 0], web);
      top += 0.014;
    } else if (a.stand === 'stool') {
      top = 0.6;
      const wood = s.material('#8a5a34', { roughness: 0.55 });
      s.cylinder(0.17, 0.17, 0.035, [0, top - 0.0175, 0], wood, 24);
      for (let i = 0; i < 4; i++) {
        const t = (i / 4) * 6.283 + 0.785;
        s.rod([Math.cos(t) * 0.12, top - 0.03, Math.sin(t) * 0.12], [Math.cos(t) * 0.2, 0, Math.sin(t) * 0.2], 0.016, wood);
      }
      s.ring(0.165, 0.008, [0, 0.2, 0], wood).rotation.x = Math.PI / 2;
    } else if (a.stand === 'cases') {
      let y = 0;
      const n = 2 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) {
        const cw = L * (1.25 - i * 0.1) + random() * 0.08, ch = 0.13 + random() * 0.07, cd = D * (1.2 - i * 0.05) + random() * 0.05;
        const skin = s.material(pick(random, ['#1b1b1e', '#4a2f1c', '#6a5a3c', '#22262c', '#7a2a22']), { roughness: 0.85 });
        const cx = (random() - 0.5) * 0.06, turn = (random() - 0.5) * 0.14;
        const body = s.box([cw, ch, cd], [cx, y + ch / 2, 0], skin);
        body.rotation.y = turn;
        const seam = s.box([cw + 0.004, 0.006, cd + 0.004], [cx, y + ch * 0.6, 0], steel);
        seam.rotation.y = turn;
        for (const dx of [-1, 1]) s.box([0.035, 0.04, 0.012], [cx + dx * cw * 0.3, y + ch * 0.6, cd / 2 + 0.004], steel).rotation.y = turn;
        s.ring(0.05, 0.008, [cx, y + ch * 0.5, cd / 2 + 0.01], dark, Math.PI).rotation.z = Math.PI;
        // each has its own little tag
        const tag = s.box([0.05, 0.07, 0.002], [cx + 0.07, y + ch * 0.32, cd / 2 + 0.02], s.material(pick(random, ['#f2a7c0', '#e2c583', '#f6f3ea'])));
        tag.rotation.z = (random() - 0.5) * 0.6;
        y += ch;
      }
      top = y;
    } else {
      top = 0.68;
      const cloth = s.material(pick(random, ['#2a2530', '#3a1f24', '#1f2a3a', '#2d3a2a']), { roughness: 1 });
      const tw = L + 0.24, td = D + 0.24;
      s.box([tw, 0.02, td], [0, top - 0.01, 0], cloth);
      // the cloth hangs nearly to the floor, with a few soft folds catching the light
      s.box([tw - 0.01, top - 0.035, td - 0.01], [0, (top - 0.035) / 2 + 0.025, 0], cloth);
      const fold = s.material(new THREE.Color((cloth as THREE.MeshStandardMaterial).color).offsetHSL(0, 0, 0.06), { roughness: 1 });
      const ridges = new Batch(new THREE.CylinderGeometry(0.012, 0.02, 1, 6), fold);
      for (let i = 0; i < 9; i++) {
        const x = -tw / 2 + 0.05 + (i / 8) * (tw - 0.1) + (random() - 0.5) * 0.03, len = top - 0.05 - random() * 0.04;
        ridges.add([x, top - 0.012 - len / 2, td / 2 - 0.006], [1, len, 1]);
      }
      for (let i = 0; i < 5; i++) for (const x of [-1, 1]) {
        const len = top - 0.05 - random() * 0.04;
        ridges.add([x * (tw / 2 - 0.006), top - 0.012 - len / 2, -td / 2 + 0.06 + (i / 4) * (td - 0.12)], [1, len, 1]);
      }
      ridges.into(s.root);
    }

    // ---- the case ----
    const box = new THREE.Group();
    box.position.set(0, top, 0);
    box.rotation.y = (random() - 0.5) * 0.16;
    s.root.add(box);
    const shellColour = { black: '#1a1a1d', tweed: '#8a6a44', leather: '#a8703c', flight: '#aab0b3' }[a.shell];
    const shell = s.material(shellColour, { roughness: a.shell === 'flight' ? 0.4 : 0.85, metalness: a.shell === 'flight' ? 0.5 : 0 });
    const hardware = s.material(a.shell === 'leather' ? '#c9a23e' : '#cfd3d5', { metalness: 0.5, roughness: 0.3 });
    const plushColour = new THREE.Color({ royal: '#1f3a9c', crimson: '#9c1a2a', mustard: '#c99a2a', purple: '#5a2a8a', grey: '#8a8a8c' }[a.plush]).multiplyScalar(0.8).lerp(new THREE.Color('#9a9488'), mood.wear * 0.3);
    const plush = new THREE.MeshStandardMaterial({ color: plushColour, roughness: 1 });
    const part = (parent: THREE.Object3D, size: V3, at: V3, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    // bottom half: rim trim is four strips rather than a plate
    const rim = (parent: THREE.Object3D, depth: number) => {
      for (const z of [-1, 1]) part(parent, [L + 0.006, 0.008, T + 0.003], [0, depth - 0.004, z * (D / 2 - T / 2)], hardware);
      for (const x of [-1, 1]) part(parent, [T + 0.003, 0.008, D + 0.006], [x * (L / 2 - T / 2), depth - 0.004, 0], hardware);
    };
    const half = (parent: THREE.Object3D, depth: number) => {
      part(parent, [L, T, D], [0, T / 2, 0], shell);
      for (const z of [-1, 1]) part(parent, [L, depth, T], [0, depth / 2, z * (D / 2 - T / 2)], shell);
      for (const x of [-1, 1]) part(parent, [T, depth, D - T * 2], [x * (L / 2 - T / 2), depth / 2, 0], shell);
      for (const z of [-1, 1]) part(parent, [L - T * 2, depth - T, 0.006], [0, depth / 2 + T / 2, z * (D / 2 - T - 0.003)], plush);
      for (const x of [-1, 1]) part(parent, [0.006, depth - T, D - T * 2], [x * (L / 2 - T - 0.003), depth / 2 + T / 2, 0], plush);
      rim(parent, depth);
    };
    half(box, HB);
    const PAD = Math.min(0.035, HB * 0.3);
    part(box, [L - T * 2, PAD, D - T * 2], [0, T + PAD / 2, 0], plush);
    const floorY = T + PAD;
    if (a.shell === 'tweed') for (const x of [-0.28, 0.28]) part(box, [0.03, HB * 0.9, 0.002], [x * L, HB * 0.48, D / 2 + 0.001], s.material('#e9dcc0'));
    if (a.shell === 'flight') {
      const rivets = new Batch(new THREE.SphereGeometry(0.006, 6, 4), steel);
      for (let i = 0; i <= 10; i++) for (const y of [0.015, HB - 0.02]) rivets.add([-L / 2 + 0.02 + (i / 10) * (L - 0.04), y, D / 2 + 0.001]);
      rivets.into(box);
    }
    // corners, latches, handle
    for (const x of [-1, 1]) for (const z of [-1, 1]) part(box, [0.03, 0.03, 0.03], [x * (L / 2 - 0.012), 0.014, z * (D / 2 - 0.012)], hardware);
    for (const x of [-1, 1]) {
      part(box, [0.04, 0.035, 0.008], [x * L * 0.3, HB - 0.03, D / 2 + 0.004], hardware);
      const flap = part(box, [0.028, 0.035, 0.005], [x * L * 0.3, HB + 0.006, D / 2 + 0.014], hardware);
      flap.rotation.x = 0.7;
    }
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 6, 16, Math.PI), s.material(a.shell === 'leather' ? '#6a4424' : '#1c1c1f'));
    handle.rotation.set(Math.PI / 2 + 0.5, 0, Math.PI);
    handle.position.set(0, HB * 0.5, D / 2 + 0.006);
    handle.castShadow = true;
    box.add(handle);
    for (const x of [-1, 1]) part(box, [0.016, 0.022, 0.01], [x * 0.055, HB * 0.5, D / 2 + 0.005], hardware);

    // lid, hinged at the back
    const lid = new THREE.Group();
    lid.position.set(0, HB, -D / 2);
    const open = 1.75 + random() * 0.25 + mood.wear * 0.12;
    lid.rotation.x = -open;
    box.add(lid);
    const lidIn = new THREE.Group();
    lidIn.position.set(0, HL, D / 2);
    lidIn.rotation.z = Math.PI;
    lid.add(lidIn);
    half(lidIn, HL);
    part(lidIn, [L - T * 2, 0.012, D - T * 2], [0, T + 0.006, 0], plush);
    // lidIn's +y points into the lid's hollow; things tucked in the lid sit just above its lining
    const lidY = T + 0.014;
    for (const x of [-1, 1]) part(box, [0.05, 0.006, 0.02], [x * L * 0.3, HB + 0.001, -D / 2 - 0.004], hardware);
    // a stay holds it open
    const stayTop = new THREE.Vector3(L / 2 - T - 0.01, HL * 0.5, D * 0.42 - D / 2 + D / 2).applyEuler(new THREE.Euler(-open, 0, 0));
    const stay = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 5), steel);
    const from = new THREE.Vector3(L / 2 - T - 0.01, HB - 0.01, -D * 0.1), to = new THREE.Vector3(stayTop.x, HB + stayTop.y, -D / 2 + stayTop.z);
    stay.position.copy(from).add(to).multiplyScalar(0.5);
    stay.scale.y = from.distanceTo(to);
    stay.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    box.add(stay);

    // ---- the instrument ----
    const tone = { gleaming: '#e9bb3c', silver: '#d6dadd', tarnished: '#86703a', battered: '#b8963f' }[a.finish];
    const brassColour = new THREE.Color(tone).lerp(new THREE.Color('#6f6a48'), mood.wear * 0.25);
    const dull = a.finish === 'tarnished' || a.finish === 'battered';
    const brass = new THREE.MeshStandardMaterial({ color: brassColour, metalness: 0.5, roughness: dull ? 0.6 : 0.24, emissive: new THREE.Color(tone).multiplyScalar(0.35), emissiveIntensity: dull ? 0.25 : mix(0.5, 0.9, mood.cheer), side: THREE.DoubleSide });
    const pearl = new THREE.MeshStandardMaterial({ color: '#f3efe2', roughness: 0.25 });
    const ebony = new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.4 });
    const inst = new THREE.Group();
    inst.position.set(0, floorY, 0);
    box.add(inst);
    const add = <M extends THREE.Object3D>(mesh: M, at: V3 = [0, 0, 0]) => { mesh.position.set(...at); mesh.traverse((n) => { n.castShadow = true; }); inst.add(mesh); return mesh; };
    const tube = (points: V3[], radius: number, material: THREE.Material, closed = false) => add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed), Math.max(20, points.length * 8), radius, 8, closed), material));
    const lathe = (profile: [number, number][], material: THREE.Material) => new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, t]) => new THREE.Vector2(r, t)), 24), material);
    const cyl = (r1: number, r2: number, h: number, material: THREE.Material, seg = 14) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), material);
    const slot = (x: number, z: number, r: number) => {
      // an empty moulded recess
      const hole = add(cyl(r, r, 0.004, new THREE.MeshStandardMaterial({ color: plushColour.clone().multiplyScalar(0.35), roughness: 1 }), 16), [x, 0.002, z]);
      return hole;
    };

    if (a.instrument === 'trumpet') {
      const y = 0.042, zt = 0.032;
      const bell = add(lathe([[0.0068, 0], [0.008, 0.1], [0.012, 0.16], [0.02, 0.2], [0.034, 0.224], [0.052, 0.238], [0.06, 0.242]], brass), [0.02, y, -zt]);
      bell.rotation.z = -Math.PI / 2;
      tube([[-0.1, y, -zt], [0.08, y, -zt], [0.115, y, -zt * 0.6], [0.127, y, 0], [0.115, y, zt * 0.6], [0.08, y, zt], [-0.1, y, zt], [-0.135, y, zt * 0.6], [-0.147, y, 0], [-0.135, y, -zt * 0.6]], 0.0068, brass, true);
      tube([[-0.1, y, zt], [-0.24, y, zt]], 0.006, brass);
      for (let i = 0; i < 3; i++) {
        const x = -0.05 + i * 0.031;
        add(cyl(0.0125, 0.0125, 0.088, brass), [x, y, 0.004]).rotation.x = Math.PI / 2;
        add(cyl(0.014, 0.014, 0.01, brass), [x, y, 0.05]).rotation.x = Math.PI / 2;
        add(cyl(0.003, 0.003, 0.03, brass, 6), [x, y, -0.052]).rotation.x = Math.PI / 2;
        add(cyl(0.01, 0.01, 0.006, pearl), [x, y, -0.068]).rotation.x = Math.PI / 2;
      }
      tube([[0.03, y + 0.012, 0.01], [0.075, y + 0.016, 0.012], [0.085, y + 0.016, 0], [0.075, y + 0.016, -0.012], [0.03, y + 0.012, -0.01]], 0.0048, brass);
      if (a.missing) slot(-L / 2 + 0.07, -D / 2 + 0.06, 0.016);
      else {
        const mp = add(lathe([[0.004, 0], [0.005, 0.05], [0.009, 0.062], [0.0135, 0.075], [0.0135, 0.082], [0.008, 0.082]], brass), [-0.235, y, zt]);
        mp.rotation.z = Math.PI / 2;
      }
      if (a.finish === 'battered') add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.003), new THREE.MeshStandardMaterial({ color: '#9da2a4', roughness: 0.5 })), [0.2, y + 0.03, -zt]).rotation.set(0.3, 0, 0.4);
    } else if (a.instrument === 'saxophone') {
      const y = 0.055, zb = 0.05, zl = -0.07;
      const body = add(cyl(0.031, 0.013, 0.44, brass, 20), [0.0, y, zb]);
      body.rotation.z = -Math.PI / 2;
      const bow = add(new THREE.Mesh(new THREE.TorusGeometry((zb - zl) / 2, 0.032, 10, 20, Math.PI), brass), [0.22, y, (zb + zl) / 2]);
      bow.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
      const bell = add(lathe([[0.032, 0], [0.035, 0.07], [0.042, 0.12], [0.056, 0.16], [0.074, 0.182], [0.08, 0.186]], brass), [0.22, y, zl]);
      bell.rotation.z = Math.PI / 2;
      tube([[-0.22, y, zb], [-0.275, y + 0.012, zb - 0.005], [-0.31, y + 0.012, zb - 0.045], [-0.315, y, zb - 0.1]], 0.011, brass);
      if (a.missing) slot(-L / 2 + 0.08, D / 2 - 0.07, 0.02);
      else add(cyl(0.012, 0.009, 0.075, ebony), [-0.315, y, zb - 0.13]).rotation.x = Math.PI / 2;
      const keys = new Batch(new THREE.CylinderGeometry(1, 1, 1, 14), brass);
      const pearls = new Batch(new THREE.CylinderGeometry(1, 1, 1, 10), pearl);
      for (let i = 0; i < 8; i++) {
        const x = -0.17 + i * 0.047, r = 0.012 + i * 0.0016, rr = 0.016 + i * 0.0026;
        keys.add([x, y + rr + 0.006, zb + (i % 2 ? 0.006 : -0.004)], [r, 0.004, r]);
        if (i < 6) pearls.add([x, y + rr + 0.009, zb + (i % 2 ? 0.006 : -0.004)], [r * 0.5, 0.003, r * 0.5]);
      }
      for (let i = 0; i < 3; i++) keys.add([0.02 + i * 0.07, y + 0.012, zb + 0.035 + i * 0.004], [0.017, 0.004, 0.017], [0.9, 0, 0]);
      keys.add([0.1, y + 0.05, zl], [0.026, 0.004, 0.026]);
      keys.into(inst);
      pearls.into(inst);
      tube([[-0.19, y + 0.03, zb - 0.02], [0.16, y + 0.05, zb - 0.03]], 0.003, brass);
    } else if (a.instrument === 'violin') {
      const varnish = new THREE.MeshStandardMaterial({ color: new THREE.Color({ gleaming: '#b3521c', silver: '#d6a257', tarnished: '#4c2a17', battered: '#8a5529' }[a.finish]), roughness: dull ? 0.7 : 0.22, emissive: '#3a1808', emissiveIntensity: dull ? 0.1 : 0.4 });
      const turn = new THREE.Group();
      turn.rotation.y = Math.PI / 2;
      const flat = new THREE.Group();
      flat.rotation.x = -Math.PI / 2;
      turn.add(flat);
      add(turn, [0.1, 0.004, 0.015]);
      const half2: [number, number][] = [[0, -0.18], [0.07, -0.175], [0.103, -0.13], [0.1, -0.07], [0.076, -0.042], [0.058, 0], [0.076, 0.045], [0.086, 0.09], [0.075, 0.14], [0.04, 0.172], [0, 0.178]];
      const pts = [...half2, ...half2.slice(1, -1).reverse().map(([x, y2]) => [-x, y2] as [number, number])].map(([x, y2]) => new THREE.Vector2(x, y2));
      const shape = new THREE.Shape();
      shape.moveTo(pts[0].x, pts[0].y);
      shape.splineThru([...pts.slice(1), pts[0]]);
      const v = (mesh: THREE.Mesh, at: V3) => { mesh.position.set(...at); mesh.castShadow = true; flat.add(mesh); return mesh; };
      v(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.032, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 8 }), varnish), [0, 0, 0]);
      const zt = 0.037;
      for (const x of [-1, 1]) v(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.07, 0.002), ebony), [x * 0.04, -0.01, zt]).rotation.z = x * 0.12;
      v(new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.14, 0.018), varnish), [0, 0.245, 0.024]);
      v(new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.27, 0.007), ebony), [0, 0.175, zt + 0.01]);
      v(new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.07, 0.022), varnish), [0, 0.345, 0.02]);
      v(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.022, 14), varnish), [0, 0.39, 0.014]).rotation.z = Math.PI / 2;
      for (let i = 0; i < 4; i++) v(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, 0.03, 6), ebony), [(i % 2 ? 1 : -1) * 0.024, 0.325 + i * 0.012, 0.022]).rotation.z = Math.PI / 2;
      v(new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.004, 0.03), new THREE.MeshStandardMaterial({ color: '#d9b77a' })), [0, -0.03, zt + 0.014]);
      v(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.007), ebony), [0, -0.12, zt + 0.008]);
      v(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), ebony), [-0.055, -0.15, zt + 0.004]).scale.set(0.04, 0.03, 0.01);
      const stringMat = new THREE.MeshStandardMaterial({ color: '#e6e2d4', metalness: 0.3 });
      const broken = a.finish === 'battered' ? Math.floor(random() * 4) : -1;
      for (let i = 0; i < 4; i++) if (i !== broken) v(new THREE.Mesh(new THREE.BoxGeometry(0.0014, 0.4, 0.0014), stringMat), [(i - 1.5) * 0.007, 0.13, zt + 0.02]);
      // the bow lives in the lid
      const clip = new THREE.MeshStandardMaterial({ color: '#3a2618' });
      for (const x of [-1, 1]) part(lidIn, [0.012, 0.02, 0.03], [x * L * 0.3, lidY + 0.008, D * 0.3], clip);
      if (!a.missing) {
        const bow = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, L * 0.86, 6), new THREE.MeshStandardMaterial({ color: '#6a3418', roughness: 0.4 }));
        bow.rotation.z = Math.PI / 2;
        bow.position.set(0, lidY + 0.016, D * 0.3);
        bow.castShadow = true;
        lidIn.add(bow);
        part(lidIn, [L * 0.8, 0.002, 0.008], [0, lidY + 0.012, D * 0.3 - 0.012], new THREE.MeshStandardMaterial({ color: '#efe9d6' }));
        part(lidIn, [0.04, 0.012, 0.022], [L * 0.38, lidY + 0.014, D * 0.3 - 0.008], ebony);
      }
    } else {
      // accordion on its back: keyboard, bellows, bass end
      const skin = new THREE.MeshStandardMaterial({ color: { gleaming: '#b31f2a', silver: '#e8e3d4', tarnished: '#1b1b1e', battered: '#1f6a4a' }[a.finish], roughness: dull ? 0.6 : 0.2, emissive: '#200808', emissiveIntensity: 0.3 });
      const AH = 0.17, AD = D - 0.11, y = AH / 2;
      const x0 = -0.2;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.12, AH, AD), skin), [x0 + 0.06, y, 0]);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.11, AH, AD), skin), [x0 + 0.345, y, 0]);
      const pleats = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }));
      const n = 13;
      for (let i = 0; i < n; i++) pleats.add([x0 + 0.125 + (i + 0.5) * (0.165 / n), y, 0], [0.165 / n * (i % 2 ? 0.55 : 1), AH - (i % 2 ? 0.014 : 0.004), AD - (i % 2 ? 0.014 : 0.004)], [0, 0, 0], i % 2 ? '#151517' : pick(random, ['#8a1c22', '#8a1c22', '#a8242a']));
      pleats.into(inst);
      // bellows strap
      add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.02), new THREE.MeshStandardMaterial({ color: '#3a2618' })), [x0 + 0.21, AH + 0.002, AD * 0.3]);
      // treble grille and keyboard
      add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, AD * 0.5), new THREE.MeshStandardMaterial({ color: '#d5d8da', metalness: 0.5, roughness: 0.3 })), [x0 + 0.06, AH + 0.003, AD * 0.2]);
      const kb = add(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.02, AD * 0.92), pearl), [x0 - 0.02, AH - 0.03, 0]);
      kb.rotation.z = 0.5;
      const blacks = new Batch(new THREE.BoxGeometry(0.04, 0.008, 0.008), ebony);
      const whites = new Batch(new THREE.BoxGeometry(0.076, 0.0015, 0.002), new THREE.MeshStandardMaterial({ color: '#8a8678' }));
      const nk = 17;
      for (let i = 0; i < nk; i++) {
        const z = -AD * 0.44 + (i + 0.5) * (AD * 0.88 / nk);
        whites.add([x0 - 0.02, AH - 0.019, z + AD * 0.44 / nk], 1, [0, 0, 0.5]);
        if (![2, 6].includes(i % 7)) blacks.add([x0 - 0.008, AH - 0.012, z + AD * 0.44 / nk], 1, [0, 0, 0.5]);
      }
      blacks.into(inst);
      whites.into(inst);
      // bass buttons
      const buttons = new Batch(new THREE.CylinderGeometry(0.005, 0.005, 0.006, 8), pearl);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 12; j++) buttons.add([x0 + 0.31 + i * 0.016, AH + 0.003, -AD * 0.36 + j * (AD * 0.72 / 11) + i * 0.004]);
      buttons.into(inst);
      tube([[x0 + 0.02, AH + 0.004, -AD * 0.4], [x0 + 0.1, AH + 0.03, -AD * 0.47], [x0 + 0.24, AH + 0.02, -AD * 0.47], [x0 + 0.33, AH + 0.004, -AD * 0.42]], 0.008, new THREE.MeshStandardMaterial({ color: '#2a1c14', roughness: 0.9 }));
      if (a.missing) slot(L / 2 - 0.06, D / 2 - 0.05, 0.02);
    }
    // an accessory pocket with a cloth and a little bottle
    if (a.instrument !== 'accordion') {
      const px = L / 2 - 0.08, pz = D / 2 - 0.06;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.006), plush), [px - 0.01, 0.01, pz - 0.05]);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.05), new THREE.MeshStandardMaterial({ color: pick(random, ['#e9d94a', '#d9d2c0', '#c8262b']), roughness: 1 })), [px, 0.004, pz - 0.01]).rotation.y = 0.3;
      if (a.instrument !== 'violin') add(cyl(0.011, 0.011, 0.05, new THREE.MeshStandardMaterial({ color: '#3a6ad0', roughness: 0.3 }), 10), [px - 0.01, 0.014, pz + 0.005]).rotation.z = Math.PI / 2;
      else add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.018, 0.03), new THREE.MeshStandardMaterial({ color: '#c9862a', roughness: 0.3, emissive: '#5a3008', emissiveIntensity: 0.5 })), [px - 0.01, 0.012, pz]);
    }

    // ---- what is tucked in the lid ----
    // lidIn coordinates: x along the case, z from the hinge (−D/2) to the free edge (+D/2), y into the hollow
    const tuck = (mesh: THREE.Mesh, x: number, z: number, turnZ: number, lift = 0) => {
      const holder = new THREE.Group();
      holder.position.set(x, lidY + 0.002 + lift, z);
      holder.rotation.x = -Math.PI / 2;
      mesh.rotation.z = Math.PI + turnZ;
      holder.add(mesh);
      lidIn.add(holder);
    };
    const bowRoom = a.instrument === 'violin' ? -D * 0.08 : 0;
    if (a.lid !== 'bare') part(lidIn, [L - T * 2 - 0.02, 0.003, 0.012], [0, lidY + 0.004, bowRoom + D * 0.12], new THREE.MeshStandardMaterial({ color: plushColour.clone().multiplyScalar(0.6) }));
    if (a.lid === 'photo') {
      const sepia = mood.warmth > 0.5;
      const photo = card(0.11, 0.14, painted(200, 256, (ctx, w, h) => {
        ctx.fillStyle = '#f3efe2';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = sepia ? '#b9a27a' : '#9aa0a6';
        ctx.fillRect(12, 12, w - 24, h - 44);
        ctx.fillStyle = sepia ? '#3a2a1a' : '#22262c';
        ctx.beginPath();
        ctx.arc(w / 2, 82, 26, 0, 7);
        ctx.fill();
        ctx.fillRect(w / 2 - 44, 108, 88, h - 152);
        ctx.fillStyle = '#e9bb3c';
        ctx.fillRect(w / 2 + 6, 112, 70, 10);
        ctx.beginPath();
        ctx.arc(w / 2 + 80, 117, 16, 0, 7);
        ctx.fill();
      }));
      tuck(photo, (random() - 0.5) * L * 0.4, bowRoom, (random() - 0.5) * 0.5);
    } else if (a.lid === 'sheet-music' || a.lid === 'setlist') {
      const music = a.lid === 'sheet-music';
      const pages = music ? 2 + Math.floor(random() * 2) : 1;
      for (let i = 0; i < pages; i++) {
        const sheet = card(music ? 0.15 : 0.12, Math.min(D * 0.62, 0.2), painted(220, 290, (ctx, w, h) => {
          ctx.fillStyle = music ? (mood.wear > 0.5 ? '#e6dbb8' : '#f4f0e2') : '#f3e36a';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#222';
          ctx.fillStyle = '#222';
          if (music) {
            for (let st = 0; st < 6; st++) {
              const y0 = 26 + st * 44;
              ctx.lineWidth = 1;
              for (let l = 0; l < 5; l++) { ctx.beginPath(); ctx.moveTo(14, y0 + l * 5); ctx.lineTo(w - 14, y0 + l * 5); ctx.stroke(); }
              for (let nn = 0; nn < 9; nn++) {
                const nx = 30 + nn * 20 + random() * 6, ny = y0 + random() * 22 - 1;
                ctx.beginPath();
                ctx.ellipse(nx, ny, 4.5, 3.4, -0.4, 0, 7);
                ctx.fill();
                ctx.fillRect(nx + 3.5, ny - 17, 1.6, 17);
              }
            }
          } else {
            ctx.font = 'italic bold 22px cursive, sans-serif';
            ['1. Stardust', '2. Caravan', '3. Misty', '4. Body+Soul', '5. ???', '6. So What', 'ENC: Georgia'].forEach((t, k) => { ctx.fillText(t, 16 + random() * 8, 40 + k * 36); });
            ctx.strokeStyle = '#b3201d';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(12, 178);
            ctx.lineTo(120, 172);
            ctx.stroke();
          }
        }));
        tuck(sheet, (i - (pages - 1) / 2) * 0.11 + (random() - 0.5) * 0.05, bowRoom + (random() - 0.5) * 0.01, (random() - 0.5) * 0.35, i * 0.001);
      }
    } else if (a.lid === 'ribbons') {
      const n = 2 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const colour = pick(random, ['#1f4fb0', '#1f4fb0', '#c8202c', '#e9e4d6', '#e2c81f']);
        const ribbon = card(0.05, Math.min(0.16, D * 0.5), painted(80, 256, (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = colour;
          ctx.beginPath();
          ctx.arc(w / 2, 40, 38, 0, 7);
          ctx.fill();
          ctx.fillRect(w / 2 - 22, 60, 44, h - 80);
          ctx.beginPath();
          ctx.moveTo(w / 2 - 22, h - 22); ctx.lineTo(w / 2, h - 40); ctx.lineTo(w / 2 + 22, h - 22); ctx.lineTo(w / 2 + 22, h); ctx.lineTo(w / 2, h - 16); ctx.lineTo(w / 2 - 22, h);
          ctx.fill();
          ctx.fillStyle = '#e9c84a';
          ctx.beginPath();
          ctx.arc(w / 2, 40, 20, 0, 7);
          ctx.fill();
          ctx.fillStyle = colour;
          ctx.font = 'bold 24px serif';
          ctx.textAlign = 'center';
          ctx.fillText(colour === '#1f4fb0' ? '1' : colour === '#c8202c' ? '2' : '3', w / 2, 49);
        }), { transparent: true, alphaTest: 0.4 });
        tuck(ribbon, (i - (n - 1) / 2) * 0.075 + (random() - 0.5) * 0.02, bowRoom - 0.01, (random() - 0.5) * 0.3, i * 0.0008);
      }
    }

    // ---- the ticket on the handle ----
    const tagStyle = { pawn: ['#f2a7c0', '#1d1d1d', `No. ${1000 + Math.floor(random() * 8999)}`], hold: ['#e2c583', '#1d1d1d', 'HOLD'], forfeit: ['#d3302b', '#fff3e0', 'FORFEIT'], price: ['#f6f3ea', '#1d1d1d', pick(random, ['$45', '$85', '$120', '$160', '$240'])] }[a.ticket];
    const pivot = new THREE.Group();
    pivot.position.set(0.03, HB * 0.5 - 0.035, D / 2 + 0.04);
    const ticket = card(0.085, 0.13, painted(170, 260, (ctx, w, h) => {
      ctx.fillStyle = tagStyle[0];
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = tagStyle[1];
      ctx.beginPath();
      ctx.arc(w / 2, 24, 9, 0, 7);
      ctx.fill();
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      if (a.ticket === 'pawn') ctx.fillText('PAWN', w / 2, 80);
      ctx.font = `${a.ticket === 'price' ? 'italic bold 58px cursive, ' : 'bold 34px '}sans-serif`;
      ctx.fillText(tagStyle[2], w / 2, 140, w - 16);
      ctx.fillRect(18, 180, w - 36, 3);
      ctx.fillRect(18, 206, w - 60, 3);
    }));
    ticket.position.y = -0.11;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.06, 4), new THREE.MeshStandardMaterial({ color: '#d8d2c0' }));
    cord.position.y = -0.03;
    pivot.add(ticket, cord);
    pivot.rotation.z = (random() - 0.5) * 0.5;
    box.add(pivot);

    const sway = mix(0, 0.14, mood.energy), rest = pivot.rotation.z;
    return s.finish({ update: (_dt, time) => { pivot.rotation.z = rest + Math.sin(time * 1.6) * sway; } });
  },
});
