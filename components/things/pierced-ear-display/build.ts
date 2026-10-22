import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type P2, blend, bump, distanceTo, insideOf, paint, relief, smooth, spline, stain } from './relief';

const S = 0.2;
const scaled = (points: readonly P2[]): P2[] => points.map(([x, y]) => [x * S, y * S] as const);

export default defineThing({
  questions: {
    load: choice('How much jewellery is the ear carrying?', {
      bare: 'None yet: purple marker dots show where the needle will go.',
      pearl: 'A single pearl stud in the lobe, modest and classic.',
      rings: 'Three rings in a row along the lobe.',
      ladder: 'A full ladder of rings and studs climbing the whole helix.',
      industrial: 'An industrial bar straight across the upper ear, with a couple of studs.',
      tunnel: 'A wide flesh tunnel stretching the lobe into a hoop.',
    }),
    metal: choice('What is the jewellery made of?', {
      gold: 'Warm yellow gold.',
      silver: 'Bright silver steel.',
      black: 'Matte black, heavy and severe.',
      rainbow: 'Anodised titanium, each piece a different oil-slick colour.',
    }),
    form: choice('What is the display ear made of?', {
      silicone: 'Pale flesh-pink practice silicone.',
      brown: 'Brown flesh-tone silicone.',
      plastic: 'Glossy white display plastic.',
      velvet: 'A black velvet form that makes the metal shine.',
    }),
    state: choice('What state is the ear in?', {
      pristine: 'Pristine, a showroom piece.',
      fresh: 'Freshly pierced: red, swollen rings of soreness around every hole.',
      torn: 'A torn lobe: one ring ripped out through the bottom edge and lying below.',
      aid: 'A beige hearing aid hooked behind it, its tube running into the canal.',
    }),
    dangle: choice('Does anything hang from the lobe?', {
      none: 'Nothing hangs.',
      feather: 'A long feather on a short chain.',
      chain: 'A fine chain looping from the lobe up to the top of the ear.',
      chandelier: 'A tiered chandelier earring of drops and gems.',
    }),
    card: choice('What does the little card on the stand say?', {
      price: '$15',
      deal: '2 FOR 1',
      free: 'FREE STUD',
      age: '16+ ONLY',
      sale: 'CLOSING',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tunnel = a.load === 'tunnel';
    const lobe = (p: P2): P2 => (tunnel ? [p[0] * 1.5 + 0.02, -0.28 + (p[1] + 0.28) * 1.45] : p);
    const rimPoints = spline(scaled([
      [-0.14, 0.3], [-0.08, 0.45], [0.08, 0.5], [0.24, 0.4], [0.3, 0.18], [0.25, -0.05], [0.15, -0.24],
      lobe([0.07, -0.43]), lobe([-0.04, -0.5]), lobe([-0.13, -0.42]), [-0.15, -0.28], [-0.17, -0.12], [-0.2, 0], [-0.16, 0.12],
    ]), true, 9);
    const rimDistance = distanceTo(rimPoints, true), within = insideOf(rimPoints);
    const fold = distanceTo(spline(scaled([[0.0, -0.21], [0.1, -0.1], [0.145, 0.08], [0.12, 0.24], [0.06, 0.34]]), false, 8));
    const crus = distanceTo(spline(scaled([[0.135, 0.1], [0.05, 0.2], [-0.06, 0.24]]), false, 8));
    const L: P2[] = scaled([lobe([-0.03, -0.38]), [0.055, -0.3], [0.115, -0.2]]);
    const H: P2[] = scaled([[0.255, 0.0], [0.285, 0.13], [0.272, 0.26], [0.225, 0.365], [0.14, 0.445], [0.04, 0.47]]);
    const tunnelR = 0.062 * S;
    const tornAt = L[0];
    const signed = (x: number, y: number) => {
      let f = (within(x, y) ? 1 : -1) * rimDistance(x, y);
      if (tunnel) f = Math.min(f, Math.hypot(x - L[0][0], y - L[0][1]) - tunnelR);
      if (a.state === 'torn' && !tunnel && y < tornAt[1] + 0.002) f = Math.min(f, Math.abs(x - tornAt[0] - (tornAt[1] - y) * 0.15) - 0.0025 - (tornAt[1] - y) * 0.22);
      return f;
    };
    const surface = (x: number, y: number, d: number) => {
      let z = 0.035 * x;
      z += 0.011 * bump(d - 0.0125, 0.0085) * smooth(-0.2 * S, -0.02 * S, y + x * 0.3) * (1 - 0.6 * smooth(-0.1 * S, -0.2 * S, x) * smooth(0.2 * S, 0, y));
      z += 0.009 * bump(fold(x, y), 0.02) + 0.007 * bump(crus(x, y), 0.014);
      z -= 0.013 * bump(Math.hypot(x + 0.03 * S, (y + 0.03 * S) * 0.8), 0.085 * S);
      z += 0.008 * bump(Math.hypot(x + 0.155 * S, y + 0.01 * S), 0.045 * S);
      z += 0.005 * bump(Math.hypot(x - 0.01 * S, y + 0.22 * S), 0.04 * S);
      z += 0.003 * bump(Math.hypot(x - L[0][0], y - L[0][1]), 0.08 * S);
      return z;
    };
    const round = (d: number) => 0.0045 * Math.sqrt(Math.min(1, Math.max(0, d) / 0.005));
    const zFront = (x: number, y: number) => { const d = Math.max(0, signed(x, y)); return surface(x, y, d) + round(d); };
    const EW = 0.62 * S * (tunnel ? 1.2 : 1), EH = 1.12 * S * (tunnel ? 1.25 : 1);
    const ear = relief(EW, EH, 96, (x, y) => (signed(x - 0.04 * S, y) > 0 ? zFront(x - 0.04 * S, y) : null), (x, y) => { const d = Math.max(0, signed(x - 0.04 * S, y)); return surface(x - 0.04 * S, y, d) * 0.6 - round(d); }, (x, y) => signed(x - 0.04 * S, y));
    const form = new THREE.Group();
    const earGroup = new THREE.Group();
    earGroup.position.x = 0.04 * S;
    form.add(earGroup);

    // The plan: where each piece goes.
    type Site = { at: P2; kind: 'stud' | 'ring' | 'pearl' | 'gem' };
    const sites: Site[] = [];
    if (a.load === 'pearl') sites.push({ at: L[0], kind: 'pearl' });
    if (a.load === 'rings') L.forEach((at) => sites.push({ at, kind: 'ring' }));
    if (a.load === 'ladder') { L.forEach((at, i) => sites.push({ at, kind: i === 0 ? 'gem' : 'ring' })); H.forEach((at, i) => sites.push({ at, kind: i % 3 === 2 ? 'stud' : 'ring' })); sites.push({ at: [-0.15 * S, -0.01 * S], kind: 'stud' }); }
    if (a.load === 'industrial') { sites.push({ at: L[0], kind: 'stud' }, { at: L[1], kind: 'stud' }); if (random() < 0.6) sites.push({ at: [-0.15 * S, -0.01 * S], kind: 'ring' }); }
    if (a.load === 'tunnel') sites.push({ at: H[1], kind: 'ring' }, { at: H[3], kind: 'stud' });
    if (a.load === 'bare') [L[0], L[1], H[2], H[4], [0.02 * S, 0.3 * S] as P2].slice(0, 2 + Math.floor(random() * 4)).forEach((at) => sites.push({ at, kind: 'stud' }));
    const bar: [P2, P2] = [[-0.07 * S, 0.4 * S], [0.25 * S, 0.3 * S]];

    const tone = { silicone: '#eab9a6', brown: '#8a5a40', plastic: '#f2f1ec', velvet: '#1b1a1f' }[a.form];
    const fleshy = a.form === 'silicone' || a.form === 'brown';
    const map = paint(EW, EH, 512, (ctx) => {
      ctx.translate(0.04 * S, 0);
      ctx.fillStyle = tone;
      ctx.fillRect(-EW, -EH, EW * 2, EH * 2);
      const shadow = a.form === 'velvet' ? '#000000' : fleshy ? '#5a1f1c' : '#8b8f96';
      stain(ctx, -0.07 * S, -0.02 * S, 0.07 * S, 0.06 * S, shadow, a.form === 'plastic' ? 0.45 : 0.75);
      stain(ctx, -0.02 * S, -0.03 * S, 0.14 * S, 0.12 * S, shadow, 0.3);
      stain(ctx, 0.1 * S, 0.3 * S, 0.07 * S, 0.05 * S, shadow, 0.25);
      if (fleshy) {
        stain(ctx, L[0][0], L[0][1], 0.1 * S, 0.1 * S, '#e06a6a', 0.22);
        for (let i = 0; i < 30; i++) stain(ctx, (random() - 0.5) * EW, (random() - 0.5) * EH, 0.008, 0.008, random() < 0.5 ? '#c05a50' : '#fff0e6', 0.1);
      }
      if (a.form === 'velvet') for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(90,86,110,${random() * 0.5})`; ctx.fillRect((random() - 0.5) * EW, (random() - 0.5) * EH, 0.0008, 0.0008); }
      const marks = a.load === 'industrial' ? [...sites.map((site) => site.at), ...bar] : sites.map((site) => site.at);
      if (a.state === 'fresh' && a.load !== 'bare') for (const [x, y] of marks) { stain(ctx, x, y, 0.013, 0.013, '#d81f2f', 0.85); stain(ctx, x, y, 0.02, 0.02, '#e0404a', 0.4); }
      if (a.state === 'fresh' && tunnel) for (let i = 0; i < 12; i++) stain(ctx, L[0][0] + Math.cos(i / 1.9) * tunnelR * 1.25, L[0][1] + Math.sin(i / 1.9) * tunnelR * 1.25, 0.007, 0.007, '#d81f2f', 0.6);
      if (a.load === 'bare') for (const [x, y] of marks) { ctx.fillStyle = '#5b2a9a'; ctx.beginPath(); ctx.arc(x, y, 0.0026, 0, 7); ctx.fill(); }
      if (a.state === 'torn' && !tunnel) for (let i = 0; i < 8; i++) stain(ctx, tornAt[0] - i * 0.0004, tornAt[1] - i * 0.0035, 0.006, 0.005, '#9a1420', 0.8);
      for (let i = 0; i < 40 * mood.wear; i++) stain(ctx, (random() - 0.5) * EW, (random() - 0.5) * EH, 0.006, 0.006, a.form === 'velvet' ? '#8a8578' : '#6f675a', 0.22);
    });
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = form) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const body = new THREE.MeshPhysicalMaterial({ map, roughness: { silicone: 0.5, brown: 0.5, plastic: 0.18, velvet: 1 }[a.form], clearcoat: a.form === 'plastic' ? 0.8 : 0, sheen: a.form === 'velvet' ? 1 : 0, sheenColor: new THREE.Color('#6a6680') });
    add(ear.front, body);
    add(ear.shell, s.material(blend(tone, a.form === 'velvet' ? '#000000' : '#5a3a34', 0.25), { roughness: a.form === 'plastic' ? 0.25 : 0.8 }));

    let piece = 0;
    const metal = () => {
      piece++;
      if (a.metal === 'rainbow') return new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL((piece * 0.17 + random() * 0.1) % 1, 0.85, 0.55), metalness: 0.85, roughness: 0.22 });
      return new THREE.MeshStandardMaterial({ color: { gold: '#e6b84c', silver: '#e2e6e9', black: '#232328' }[a.metal], metalness: a.metal === 'black' ? 0.6 : 0.95, roughness: a.metal === 'black' ? 0.45 : 0.2 });
    };
    const nearestRim = (x: number, y: number) => {
      let best = Infinity, at = 0;
      rimPoints.forEach(([px, py], i) => { const d = (px - x) ** 2 + (py - y) ** 2; if (d < best) { best = d; at = i; } });
      const p = rimPoints[at], q = rimPoints[(at + 1) % rimPoints.length];
      return { p, tangent: new THREE.Vector3(q[0] - p[0], q[1] - p[1], 0).normalize() };
    };
    const ringAt = ([x, y]: P2, r: number, material: THREE.Material, parent: THREE.Object3D = form) => {
      const { p, tangent } = nearestRim(x, y);
      const inward = new THREE.Vector3(x - p[0], y - p[1], 0).normalize();
      const cx = p[0] + inward.x * r * 0.5, cy = p[1] + inward.y * r * 0.5;
      const mesh = add(new THREE.TorusGeometry(r, r * 0.2, 8, 28), material, parent);
      mesh.position.set(cx, cy, zFront(cx, cy) - 0.004);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      return mesh;
    };
    const studAt = ([x, y]: P2, r: number, material: THREE.Material) => add(new THREE.SphereGeometry(r, 14, 10), material).position.set(x, y, zFront(x, y) + r * 0.7);
    let torn: THREE.Material | null = null;
    if (a.load !== 'bare') for (const [i, site] of sites.entries()) {
      const m = metal();
      if (a.state === 'torn' && i === 0 && !tunnel) { torn = m; continue; }
      if (site.kind === 'ring') ringAt(site.at, mix(0.012, 0.016, random()), m);
      if (site.kind === 'stud') studAt(site.at, 0.0058, m);
      if (site.kind === 'pearl') studAt(site.at, 0.011, new THREE.MeshPhysicalMaterial({ color: '#f6f1e7', roughness: 0.25, clearcoat: 0.6, sheen: 0.5 }));
      if (site.kind === 'gem') {
        studAt(site.at, 0.003, m);
        const gem = add(new THREE.OctahedronGeometry(0.0058), new THREE.MeshPhysicalMaterial({ color: '#dff6ff', roughness: 0.05, metalness: 0.3, emissive: '#9fd8ff', emissiveIntensity: 0.3, flatShading: true }));
        gem.position.set(site.at[0], site.at[1], zFront(site.at[0], site.at[1]) + 0.006);
      }
    }
    if (a.load === 'industrial') {
      const m = metal();
      const [p, q] = bar;
      const z = Math.max(zFront(p[0], p[1]), zFront(q[0], q[1])) + 0.006;
      const rod = new Sculpture(context);
      rod.rod([p[0] - 0.006, p[1] + 0.002, z], [q[0] + 0.006, q[1] - 0.002, z], 0.0024, m);
      rod.ball([0.0052, 0.0052, 0.0052], [p[0] - 0.007, p[1] + 0.002, z], m, 12);
      rod.ball([0.0052, 0.0052, 0.0052], [q[0] + 0.007, q[1] - 0.002, z], m, 12);
      form.add(rod.root);
    }
    if (tunnel) {
      const m = metal();
      const ring = add(new THREE.CylinderGeometry(tunnelR * 1.03, tunnelR * 1.03, 0.014, 32, 1, true), m);
      (m as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      ring.rotation.x = Math.PI / 2;
      ring.position.set(L[0][0], L[0][1], zFront(L[0][0] + tunnelR + 0.003, L[0][1]) - 0.004);
      for (const z of [-0.007, 0.007]) add(new THREE.TorusGeometry(tunnelR * 1.08, 0.0022, 8, 36), m).position.set(L[0][0], L[0][1], ring.position.z + z);
    }

    // What hangs from the lobe.
    const swing = new THREE.Group();
    const hook: P2 = tunnel ? [L[0][0], L[0][1] - tunnelR] : a.state === 'torn' ? L[1] : L[0];
    const hookEdge = nearestRim(hook[0], hook[1] - 0.02).p;
    swing.position.set(hookEdge[0], hookEdge[1] + 0.004, zFront(hook[0], hook[1]) - 0.003);
    form.add(swing);
    if (a.dangle === 'feather' || a.dangle === 'chandelier') {
      const m = metal();
      add(new THREE.TorusGeometry(0.006, 0.0011, 6, 20), m, swing).position.y = -0.004;
      const links = new Sculpture(context);
      if (a.dangle === 'feather') {
        links.rod([0, -0.009, 0], [0, -0.026, 0], 0.0011, m);
        const vane = new THREE.Shape();
        vane.moveTo(0, 0);
        vane.bezierCurveTo(0.017, -0.012, 0.016, -0.055, 0.002, -0.082);
        vane.bezierCurveTo(-0.014, -0.058, -0.016, -0.014, 0, 0);
        const plume = s.material(new THREE.Color().setHSL(mix(0.55, 0.02, mood.warmth), 0.65, mix(0.3, 0.55, mood.cheer)), { roughness: 0.9, side: THREE.DoubleSide });
        const feather = add(new THREE.ExtrudeGeometry(vane, { depth: 0.0012, bevelEnabled: false }), plume, links.root);
        feather.position.y = -0.026;
        links.rod([0, -0.026, 0.0016], [0.002, -0.108, 0.0016], 0.0009, s.material('#f4ead8'));
        for (let i = 0; i < 9; i++) links.rod([0.0003 * i, -0.034 - i * 0.008, 0.0017], [(i % 2 ? 1 : -1) * 0.011, -0.03 - i * 0.008, 0.0017], 0.0004, s.material('#20262c'));
      } else {
        const gems = new THREE.MeshPhysicalMaterial({ color: mood.cheer > 0.5 ? '#ffd0ec' : '#c8e6ff', roughness: 0.05, metalness: 0.3, emissive: mood.cheer > 0.5 ? '#ff7ac0' : '#7fc4ff', emissiveIntensity: 0.35, flatShading: true });
        links.rod([0, -0.009, 0], [0, -0.02, 0], 0.0012, m);
        add(new THREE.TorusGeometry(0.016, 0.0016, 6, 24, Math.PI), m, links.root).rotation.z = Math.PI;
        links.root.children.at(-1)!.position.y = -0.02;
        links.rod([-0.016, -0.02, 0], [0.016, -0.02, 0], 0.0014, m);
        for (let i = -3; i <= 3; i++) {
          const x = i * 0.0052, top = -0.02 - Math.sqrt(Math.max(0, 0.016 ** 2 - x * x)), length = 0.012 + (3 - Math.abs(i)) * 0.009 + random() * 0.004;
          links.rod([x, top, 0], [x, top - length, 0], 0.0007, m);
          const gem = add(new THREE.OctahedronGeometry(0.0036), gems, links.root);
          gem.position.set(x, top - length - 0.003, 0);
          gem.scale.y = 1.5;
        }
      }
      swing.add(links.root);
    }
    if (a.dangle === 'chain') {
      const m = metal();
      const from = new THREE.Vector3(hook[0], hook[1], zFront(hook[0], hook[1]) + 0.004), to = new THREE.Vector3(H[3][0], H[3][1], zFront(H[3][0], H[3][1]) + 0.004);
      const beads: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i <= 44; i++) {
        const t = i / 44, sag = Math.sin(Math.PI * t);
        const p = from.clone().lerp(to, t).add(new THREE.Vector3(0.05 * sag, -0.03 * sag, 0.012 * sag));
        beads.push({ at: p.toArray() as [number, number, number], size: 0.0019 });
      }
      const chain = new Sculpture(context);
      chain.scatter(new THREE.SphereGeometry(1, 8, 6), m, beads);
      form.add(chain.root);
      studAt(hook, 0.004, m);
      studAt(H[3], 0.004, m);
    }
    if (a.state === 'aid') {
      const beige = s.material('#cfae8c', { roughness: 0.4 });
      const aid = new Sculpture(context);
      aid.tube(scaled([[0.3, -0.02], [0.345, 0.12], [0.33, 0.3], [0.25, 0.44], [0.12, 0.535], [0.0, 0.53]]).map(([x, y], i) => [x, y, -0.002 + i * 0.0012] as const), 0.0105, beige);
      aid.ball([0.0125, 0.0125, 0.0125], [0.3 * S, -0.02 * S, -0.002], beige, 12);
      aid.tube([[0.0, 0.53 * S, 0.004], [-0.1 * S, 0.44 * S, 0.014], [-0.13 * S, 0.2 * S, 0.02], [-0.085 * S, 0.0, 0.012]], 0.0026, s.material('#e9eef0', { roughness: 0.15 }));
      aid.ball([0.011, 0.011, 0.008], [-0.08 * S, -0.02 * S, 0.006], s.material('#e8cdb4', { roughness: 0.3 }), 12);
      aid.box([0.004, 0.012, 0.004], [0.34 * S, 0.2 * S, 0.009], s.material('#5a5148'));
      form.add(aid.root);
    }

    const lift = (a.dangle === 'feather' ? 0.26 : a.dangle === 'chandelier' ? 0.225 : 0.17) + (tunnel ? 0.045 : 0);
    form.position.set(0, lift, 0.004);
    form.rotation.set(-0.16, mix(-0.1, 0.1, random()), 0);
    s.root.add(form);

    // The stand: a weighted foot, a post up the back, a little card.
    const dark = a.form === 'velvet';
    const stand = s.material(dark ? '#16151a' : '#d9ae52', { metalness: dark ? 0.2 : 0.9, roughness: dark ? 0.8 : 0.25 });
    s.cylinder(0.062, 0.068, 0.014, [0, 0.007, -0.01], stand, 36);
    s.rod([0.01, 0.014, -0.022], [0.01, lift + 0.01, -0.022], 0.0045, stand);
    s.rod([0.01, lift + 0.01, -0.022], [0.012, lift + 0.01, 0.0], 0.0035, stand);
    const words = { price: '$15', deal: '2 FOR 1', free: 'FREE STUD', age: '16+ ONLY', sale: 'CLOSING' }[a.card];
    const card = s.label(words, 0.07, 0.034, [-0.012, 0.034, 0.052], a.card === 'sale' ? '#fff3d6' : '#2b2530', a.card === 'sale' ? '#c2202c' : blend('#fbf6e9', '#cdbb93', mood.wear));
    card.rotation.set(-0.35, 0.12 * (random() - 0.5), (random() - 0.5) * 0.12 * (1 + mood.wear * 2));
    s.box([0.05, 0.004, 0.012], [-0.012, 0.016, 0.056], stand);
    if (torn) {
      const fallen = s.mesh(new THREE.TorusGeometry(0.014, 0.0028, 8, 28), torn, [0.03 + random() * 0.02, 0.0165, 0.035]);
      fallen.rotation.set(Math.PI / 2 - 0.1, 0, 0);
      const spot = s.cylinder(0.006, 0.006, 0.001, [0.02, 0.0146, 0.03], s.material('#9a1420', { roughness: 0.3 }), 12);
      spot.scale.x = 1.5;
    }

    const pace = mix(0.3, 2.4, mood.energy);
    return s.finish({ update: (_dt, time) => { swing.rotation.z = Math.sin(time * pace) * 0.12 * mood.energy + 0.02; } });
  },
});
// display ear
