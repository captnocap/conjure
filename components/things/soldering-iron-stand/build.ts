import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];
const HANDLES = { blue: '#2a5fb0', red: '#b8302a', yellow: '#dba820', black: '#26262a', green: '#2f7d4f', orange: '#d9682a' } as const;

export default defineThing({
  questions: {
    bit: choice('What tip is fitted?', { original: 'The usual bit for this iron.', needle: 'A fine conical needle.', chisel: 'A broad flat chisel.', bent: 'A bent precision tip.' }),
    grip: choice('What is the grip surface?', { original: 'The original moulded or turned handle.', smooth: 'A smooth untextured grip.', cork: 'A cork sleeve over the handle.', knurled: 'A closely ridged grip for a firm hold.' }),
    spares: choice('Are spare bits laid out?', { none: 'No spares.', row: 'Three spare bits in a row.', block: 'Three bits standing in a drilled wooden block.', tube: 'Spare bits in an open metal storage tube.' }),
    desolder: choice('What desoldering tool is alongside?', { none: 'None.', braid: 'A reel of copper desoldering braid with its end pulled out.', pump: 'A spring-loaded solder sucker.', forceps: 'A pair of fine forceps for lifting a freed lead.' }),
    mat: choice('What protects the bench under the work?', { bare: 'The bare bench.', silicone: 'A blue silicone heat mat.', ceramic: 'A pale ceramic tile.', steel: 'A shallow steel work tray.' }),
    extraction: choice('Is there a small fume collector nearby?', { none: 'No collector.', fan: 'A square filter fan on a little stand.', hood: 'A low flared extraction hood.', duct: 'A round flexible extraction duct.' }),
    iron: choice('What style of soldering iron is it?', {
      pencil: 'A slim modern pencil iron with a coloured plastic handle and a fine tip.',
      wooden: 'An old iron with a turned wooden handle, a thick steel shaft and a fat copper bit.',
      station: 'A temperature-controlled iron wired to a boxy base station with a dial and a pilot light.',
      heavy: 'A big hundred-watt iron with a vented heat shield and a chisel tip, for chassis work.',
    }),
    handle: choice('What colour is the handle?', {
      blue: 'Royal blue.', red: 'Signal red.', yellow: 'Mustard yellow.', black: 'Black.', green: 'Workshop green.', orange: 'Safety orange.',
    }),
    heat: choice('How hot is it right now?', {
      cold: 'Stone cold and unplugged, the cord coiled with its plug lying on the bench.',
      warming: 'Just switched on, tip barely warm, no smoke yet.',
      hot: 'At working heat: tip bright and tinned, a thin thread of flux smoke rising.',
      scorching: 'Left on far too long: the tip glows dull red and smoke pours off it.',
    }),
    stand: choice('What does it rest on?', {
      spring: 'A coiled spring holder on a heavy cast base with a sponge tray.',
      cradle: 'A bent-wire cradle on a pressed tin plate.',
      ashtray: 'An old glass ashtray, pressed into service.',
    }),
    resting: choice('Where has the iron been put down?', {
      bench: 'Flat on the bench in a hurry, the tip burning into the surface.',
      holder: 'Safely in its holder, where it belongs.',
      propped: 'Propped with its tip up on the edge of the stand, half put away.',
    }),
    cleaner: choice('What is there to wipe the tip on?', {
      wet: 'A fat wet yellow sponge.',
      dry: 'A shrunken, dried-out brown sponge with burnt gouges.',
      brass: 'A ball of curly brass wool in a little pot.',
      none: 'Nothing: the tip gets wiped on whatever is to hand.',
    }),
    burns: score('How many burn marks are there on the bench around it?', ['None, a clean surface', 'One or two old scorches', 'A scatter of black rings and scars', 'Burned all over, years of accidents']),
    flux: noul('Is there an open tin of flux paste beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steel = s.material('#b4b9bb', { metalness: 0.75, roughness: 0.3 });
    const iron = s.material('#3b3d40', { metalness: 0.5, roughness: 0.55 });
    const dark = s.material('#1c1c1e', { roughness: 0.7 });
    const copper = s.material('#b86a35', { metalness: 0.7, roughness: 0.4 });
    const handleMat = a.iron === 'wooden' ? s.material('#8a5a30', { roughness: 0.5 }) : s.material(HANDLES[a.handle], { roughness: 0.4 });
    const level = { cold: 0, warming: 1, hot: 2, scorching: 3 }[a.heat];
    const glow = [0, 0.15, 0.9, 2.4][level] * mix(0.8, 1.3, mood.warmth);
    const tipMat = new THREE.MeshStandardMaterial({
      color: level === 3 ? '#e0703a' : mood.wear > 0.6 ? '#4a4038' : '#c9ccc8', metalness: 0.6, roughness: 0.35,
      emissive: level === 3 ? '#ff3a10' : '#ff7a20', emissiveIntensity: glow,
    });
    const barrelMat = new THREE.MeshStandardMaterial({ color: level === 3 ? '#8a6a5a' : '#9aa0a2', metalness: 0.7, roughness: 0.4, emissive: '#ff3a10', emissiveIntensity: level === 3 ? 0.5 : 0 });

    // ---- The iron, built along +y with the tip at the origin.
    const tool = new Sculpture(context);
    const big = a.iron === 'wooden' || a.iron === 'heavy';
    const tipLen = big ? 0.04 : 0.022, barrelLen = big ? 0.085 : 0.06, barrelR = big ? 0.0085 : 0.0045, gripR = a.iron === 'wooden' ? 0.016 : big ? 0.015 : 0.0105, gripLen = big ? 0.12 : 0.105;
    if (a.bit === 'bent') {
      tool.tube([[0, 0, 0], [0.005, tipLen * 0.24, 0], [0.008, tipLen * 0.55, 0], [0, tipLen, 0]], barrelR * 0.55, tipMat);
    } else if (a.bit === 'chisel') {
      const chisel = tool.cylinder(barrelR * 1.3, barrelR * 0.2, tipLen, [0, tipLen / 2, 0], tipMat, 4); chisel.scale.z = 0.45;
    } else if (a.bit === 'needle') tool.cylinder(barrelR * 0.85, 0.0005, tipLen, [0, tipLen / 2, 0], tipMat, 12);
    else if (big) {
      tool.cylinder(barrelR * 1.3, barrelR * 0.3, tipLen * 0.55, [0, tipLen * 0.275, 0], a.iron === 'wooden' ? new THREE.MeshStandardMaterial({ color: mood.wear > 0.5 ? '#6b4a34' : '#c47a42', metalness: 0.6, roughness: 0.45, emissive: '#ff4a10', emissiveIntensity: glow }) : tipMat, 4);
      tool.cylinder(barrelR * 1.3, barrelR * 1.3, tipLen * 0.5, [0, tipLen * 0.78, 0], a.iron === 'wooden' ? copper : tipMat, 12);
    } else tool.cylinder(barrelR * 0.9, 0.0006, tipLen, [0, tipLen / 2, 0], tipMat, 10);
    tool.cylinder(barrelR, barrelR, barrelLen, [0, tipLen + barrelLen / 2, 0], barrelMat, 12);
    if (a.iron === 'heavy') for (let i = 0; i < 5; i++) tool.cylinder(0.014, 0.014, 0.003, [0, tipLen + 0.012 + i * 0.012, 0], steel, 14);
    const y0 = tipLen + barrelLen;
    tool.cylinder(gripR * 1.25, barrelR * 1.2, 0.012, [0, y0 + 0.006, 0], a.iron === 'wooden' ? steel : dark, 16);
    if (a.iron === 'wooden') {
      tool.lathe([[0.009, 0], [0.016, 0.012], [0.0165, 0.05], [0.012, 0.085], [0.015, 0.105], [0.009, 0.12]], handleMat, [0, y0 + 0.012, 0]);
    } else {
      tool.cylinder(gripR, gripR * 1.15, gripLen, [0, y0 + 0.012 + gripLen / 2, 0], handleMat, 16);
      // A ribbed cushion grip near the hot end.
      if (a.grip === 'original') for (let i = 0; i < 5; i++) tool.cylinder(gripR * 1.22, gripR * 1.22, 0.004, [0, y0 + 0.022 + i * 0.008, 0], dark, 16);
    }
    if (a.grip === 'cork') {
      const cork = s.material('#b89765', { roughness: 1 }); tool.cylinder(gripR * 1.16, gripR * 1.16, gripLen * 0.68, [0, y0 + 0.02 + gripLen * 0.34, 0], cork, 18);
      for (let i = 0; i < 22; i++) { const t = i * 2.4, y = y0 + 0.027 + random() * gripLen * 0.55; tool.ball([0.0013, 0.0018, 0.0013], [Math.cos(t) * gripR * 1.16, y, Math.sin(t) * gripR * 1.16], s.material('#836b46'), 5); }
    } else if (a.grip === 'knurled') {
      for (let i = 0; i < 14; i++) tool.cylinder(gripR * 1.17, gripR * 1.17, 0.0014, [0, y0 + 0.021 + i * gripLen * 0.047, 0], dark, 16);
    }
    const tail = y0 + 0.012 + gripLen;
    tool.cylinder(0.004, gripR * 0.8, 0.02, [0, tail + 0.01, 0], dark, 10);

    // ---- The stand.
    const sponge: P = [0.0, 0, 0.0];
    let tip = new THREE.Vector3(), aim = new THREE.Vector3(0, 1, 0);
    if (a.stand === 'spring') {
      s.box([0.085, 0.014, 0.12], [0, 0.007, 0], iron);
      s.box([0.064, 0.006, 0.05], [0, 0.015, 0.03], dark);
      sponge[2] = 0.03; sponge[1] = 0.016;
      // The spring: a conical helix on a tilted post.
      const axis = new THREE.Vector3(Math.cos(0.72) * 0.9, Math.sin(0.72), Math.cos(0.72) * 0.42).normalize();
      const base = new THREE.Vector3(-0.025, 0.035, -0.045);
      const u = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0)).normalize(), v = new THREE.Vector3().crossVectors(axis, u);
      const pts: P[] = [];
      for (let i = 0; i <= 150; i++) {
        const t = i / 150, ang = t * Math.PI * 2 * 11, r = mix(0.011, 0.02, t);
        const p = base.clone().addScaledVector(axis, t * 0.085).addScaledVector(u, Math.cos(ang) * r).addScaledVector(v, Math.sin(ang) * r);
        pts.push([p.x, p.y, p.z]);
      }
      const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 500, 0.0015, 5), steel);
      coil.castShadow = true; s.root.add(coil);
      s.rod([-0.028, 0.012, -0.047], [-0.03, 0.036, -0.047], 0.004, steel);
      s.cylinder(0.008, 0.01, 0.006, [-0.028, 0.016, -0.047], steel, 10);
      tip = base.clone().addScaledVector(axis, 0.004); aim = axis;
    } else if (a.stand === 'cradle') {
      s.box([0.15, 0.003, 0.07], [0, 0.0015, 0], s.material('#8d9396', { metalness: 0.6, roughness: 0.4 }));
      for (const x of [-0.045, 0.04]) {
        const h = x < 0 ? 0.03 : 0.042;
        s.tube([[x, 0.002, -0.028], [x, h + 0.014, -0.014], [x, h, 0], [x, h + 0.014, 0.014], [x, 0.002, 0.028]], 0.0018, steel);
      }
      sponge[0] = 0.0; sponge[2] = 0.075; sponge[1] = 0.0;
      tip = new THREE.Vector3(-0.075, 0.03, 0); aim = new THREE.Vector3(1, 0.13, 0).normalize();
    } else {
      const glass = new THREE.MeshStandardMaterial({ color: '#9fc5b5', transparent: true, opacity: 0.55, roughness: 0.08, metalness: 0.1 });
      s.lathe([[0, 0.004], [0.036, 0.004], [0.04, 0.02], [0.05, 0.02], [0.052, 0], [0, 0]], glass);
      for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; s.ball([0.006, 0.01, 0.006], [Math.cos(t) * 0.047, 0.012, Math.sin(t) * 0.047], glass, 8); }
      const ash = [];
      for (let i = 0; i < 14; i++) { const t = random() * 6.28, r = random() * 0.03; ash.push({ at: [Math.cos(t) * r, 0.006, Math.sin(t) * r] as P, size: 0.5 + random() }); }
      s.scatter(new THREE.SphereGeometry(0.003, 6, 4), s.material('#9a9a94', { metalness: 0.6, roughness: 0.4 }), ash);
      sponge[0] = -0.01; sponge[2] = 0.09;
      tip = new THREE.Vector3(-0.02, 0.012, 0); aim = new THREE.Vector3(1, 0.24, 0.12).normalize();
    }
    const burnSpots: { at: P; size: number }[] = [];
    if (a.resting === 'bench') {
      const side = a.stand === 'spring' ? 0.085 : 0.02;
      tip = new THREE.Vector3(-0.1 + random() * 0.02, barrelR * 1.3 + 0.0015, 0.075 + side * 0.4 + random() * 0.01);
      aim = new THREE.Vector3(1, 0.035, 0.22 + random() * 0.2).normalize();
      if (level > 1) burnSpots.push({ at: [tip.x + 0.004, 0.0008, tip.z], size: 1.6 });
    } else if (a.resting === 'propped') {
      const top = a.stand === 'spring' ? 0.016 : a.stand === 'cradle' ? 0.005 : 0.022;
      const edge = a.stand === 'spring' ? 0.043 : a.stand === 'cradle' ? 0.075 : 0.05;
      const len = tail;
      const reach = 0.03;
      const rise = Math.asin(Math.min(0.9, (top + 0.006) / reach));
      aim = new THREE.Vector3(Math.cos(rise) * 0.96, -Math.sin(rise) * 0.2, 0.28).normalize();
      // Handle end on the bench, shaft across the stand's edge, tip in the air.
      const end = new THREE.Vector3(edge + len * 0.62, gripR + 0.001, 0.045);
      aim = new THREE.Vector3(-(len * 0.9), (top + 0.03) - gripR, -0.03).normalize().negate();
      tip = end.clone().addScaledVector(aim, -len);
    }
    tool.root.position.copy(tip);
    tool.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aim);
    s.root.add(tool.root);
    const tailAt = tip.clone().addScaledVector(aim, tail + 0.02);

    // ---- Cord, and for a station the base unit it runs to.
    const cordMat = s.material(a.iron === 'wooden' ? '#5a4632' : '#222226', { roughness: 0.7 });
    const out = tailAt.clone().addScaledVector(aim, 0.05); out.y = Math.max(0.004, out.y * 0.4);
    if (a.iron === 'station') {
      const bx = -0.14, bz = -0.03;
      s.box([0.1, 0.075, 0.12], [bx, 0.0375, bz], s.material(HANDLES[a.handle], { roughness: 0.45 }));
      s.box([0.102, 0.06, 0.004], [bx, 0.04, bz + 0.061], dark);
      s.cylinder(0.014, 0.016, 0.012, [bx + 0.02, 0.04, bz + 0.068], steel, 18).rotation.x = Math.PI / 2;
      s.box([0.003, 0.012, 0.004], [bx + 0.02, 0.048, bz + 0.075], s.material('#e8e8e0'));
      s.ball([0.005, 0.005, 0.004], [bx - 0.025, 0.052, bz + 0.064], new THREE.MeshStandardMaterial({ color: level ? '#ff5030' : '#5a2a22', emissive: '#ff3010', emissiveIntensity: level ? 1.8 : 0 }), 10);
      s.box([0.032, 0.014, 0.003], [bx - 0.022, 0.03, bz + 0.064], new THREE.MeshStandardMaterial({ color: level ? '#7dff9a' : '#27352b', emissive: '#40ff70', emissiveIntensity: level ? 1 : 0 }));
      for (let i = 0; i < 5; i++) s.box([0.07, 0.002, 0.004], [bx, 0.076, bz - 0.04 + i * 0.012], dark);
      s.tube([[tailAt.x, tailAt.y, tailAt.z], [out.x + 0.02, out.y + 0.01, out.z + 0.05], [bx + 0.06, 0.006, bz + 0.13], [bx + 0.03, 0.02, bz + 0.064]], 0.0028, cordMat);
    } else if (level === 0) {
      // Unplugged: the cord loops back in a loose coil that ends in a plug.
      const cx = 0.02, cz = -0.105, pts: P[] = [[tailAt.x, tailAt.y, tailAt.z], [out.x, out.y, out.z]];
      for (let i = 0; i <= 26; i++) { const t = i / 26 * Math.PI * 4.6; pts.push([cx + Math.cos(t) * (0.04 + i * 0.0006), 0.004 + (i % 9) * 0.0012, cz + Math.sin(t) * 0.032]); }
      pts.push([cx + 0.085, 0.008, cz + 0.025]);
      s.tube(pts, 0.0026, cordMat);
      const plug = s.box([0.03, 0.016, 0.022], [cx + 0.1, 0.008, cz + 0.027], dark);
      plug.rotation.y = 0.3;
      for (const z of [-0.006, 0.006]) s.box([0.016, 0.002, 0.005], [cx + 0.122, 0.008, cz + 0.02 + z], s.material('#c9a54a', { metalness: 0.8, roughness: 0.3 })).rotation.y = 0.3;
    } else {
      s.tube([[tailAt.x, tailAt.y, tailAt.z], [out.x, out.y, out.z], [out.x - 0.02, 0.004, out.z - 0.06], [out.x - 0.07, 0.004, -0.1], [out.x - 0.13, 0.004, -0.115]], 0.0026, cordMat);
    }

    // ---- Tip cleaner.
    const [px, py, pz] = sponge;
    const tray = a.stand !== 'spring';
    if (a.cleaner !== 'none' && tray) s.box([0.062, 0.008, 0.05], [px, 0.004, pz], s.material('#6f7577', { metalness: 0.5, roughness: 0.5 }));
    const cy = tray ? 0.008 : py;
    if (a.cleaner === 'wet') {
      const sp = s.mesh(new THREE.BoxGeometry(0.056, 0.016, 0.043, 3, 1, 3), s.material('#e3c53a', { roughness: 0.75 }), [px, cy + 0.008, pz]);
      s.cylinder(0.009, 0.009, 0.017, [px, cy + 0.008, pz], dark, 12);
      sp.rotation.y = (random() - 0.5) * 0.1;
      s.box([0.02, 0.0015, 0.012], [px + 0.012, cy + 0.0165, pz - 0.01], s.material('#7a7f84', { metalness: 0.7, roughness: 0.3 }));
    } else if (a.cleaner === 'dry') {
      const sp = s.box([0.044, 0.008, 0.032], [px - 0.004, cy + 0.004, pz + 0.003], s.material('#7a5a2e', { roughness: 0.95 }));
      sp.rotation.y = 0.25;
      for (let i = 0; i < 3; i++) s.box([0.02, 0.001, 0.004], [px - 0.01 + i * 0.006, cy + 0.0085, pz - 0.006 + i * 0.008], dark).rotation.y = 0.25 + i * 0.5;
    } else if (a.cleaner === 'brass') {
      s.cylinder(0.024, 0.02, 0.022, [px, cy + 0.011, pz], dark, 18);
      const curls = [];
      for (let i = 0; i < 46; i++) { const t = random() * 6.28, r = Math.sqrt(random()) * 0.019; curls.push({ at: [px + Math.cos(t) * r, cy + 0.022 + random() * 0.008 - r * 0.2, pz + Math.sin(t) * r] as P, size: 0.7 + random() * 0.6 }); }
      s.scatter(new THREE.TorusGeometry(0.004, 0.0009, 4, 10), s.material('#d9a93a', { metalness: 0.85, roughness: 0.25 }), curls);
    }

    // ---- Flux tin, burn marks and solder splashes.
    if (a.flux) {
      const fx = a.stand === 'spring' ? 0.085 : 0.095, fz = a.stand === 'spring' ? -0.04 : -0.06;
      s.cylinder(0.026, 0.026, 0.016, [fx, 0.008, fz], s.material('#b8302a', { metalness: 0.4, roughness: 0.4 }), 22);
      s.cylinder(0.024, 0.024, 0.002, [fx, 0.0165, fz], s.material('#c9892a', { roughness: 0.25, emissive: '#5a2a00', emissiveIntensity: 0.3 }), 22);
      const lid = s.cylinder(0.027, 0.027, 0.005, [fx + 0.04, 0.012, fz - 0.02], s.material('#c8c2b0', { metalness: 0.6, roughness: 0.35 }), 22);
      lid.rotation.set(0.5, 0, -0.5);
    }
    const marks = Math.round(a.burns * a.burns * 16 + (a.burns > 0.2 ? 1 : 0));
    for (let i = 0; i < marks; i++) {
      const t = random() * 6.28, r = 0.06 + random() * 0.06;
      burnSpots.push({ at: [Math.cos(t) * r * 1.15, 0.0006 + i * 0.00003, Math.sin(t) * r + 0.02], size: 0.5 + random() * 1.3 });
    }
    if (burnSpots.length) {
      const scorch = s.scatter(new THREE.CylinderGeometry(0.0065, 0.0065, 0.0006, 9), new THREE.MeshStandardMaterial({ color: '#2a1c14', roughness: 1 }), burnSpots);
      scorch.castShadow = false;
      const halo = s.scatter(new THREE.CylinderGeometry(0.0085, 0.0085, 0.0004, 9), new THREE.MeshStandardMaterial({ color: '#4a3220', roughness: 1 }), burnSpots.map((b) => ({ at: [b.at[0], b.at[1] - 0.0003, b.at[2]] as P, size: b.size })));
      halo.castShadow = false;
    }
    const blobs = [];
    for (let i = 0; i < 2 + Math.floor(mood.density * 9); i++) { const t = random() * 6.28, r = 0.05 + random() * 0.06; blobs.push({ at: [Math.cos(t) * r, 0.0012, Math.sin(t) * r + 0.02] as P, size: 0.4 + random() }); }
    s.scatter(new THREE.SphereGeometry(0.0035, 8, 5), s.material('#d4d8da', { metalness: 0.9, roughness: 0.2 }), blobs).scale.y = 1;

    if (a.spares !== 'none') {
      const sx = -0.1, sz = 0.15;
      if (a.spares === 'block') s.box([0.066, 0.018, 0.026], [sx, 0.009, sz], s.material('#9d7b50'));
      if (a.spares === 'tube') { const tube = s.lathe([[0.009, 0], [0.011, 0], [0.011, 0.072], [0.009, 0.072], [0.009, 0]], steel, [sx, 0.011, sz]); tube.rotation.z = Math.PI / 2; }
      for (let i = 0; i < 3; i++) {
        const x = sx + (i - 1) * 0.02, z = sz + (a.spares === 'tube' ? i * 0.003 : 0);
        if (a.spares === 'block') { s.cylinder(0.003, 0.003, 0.032 + i * 0.006, [x, 0.029 + i * 0.003, z], steel, 10); s.cylinder(0.0006, 0.003, 0.012, [x, 0.051 + i * 0.006, z], copper, 8); }
        else { const bx = a.spares === 'tube' ? sx + 0.013 + i * 0.006 : x; s.rod([bx, 0.004, z - 0.022], [bx, 0.004, z + 0.014], 0.003, steel); s.rod([bx, 0.004, z + 0.014], [bx, 0.004, z + 0.025], 0.003, copper, 0.0005); }
      }
    }
    if (a.desolder === 'braid') {
      s.cylinder(0.024, 0.024, 0.012, [0.16, 0.006, 0.08], s.material('#a45c39'), 20);
      s.cylinder(0.009, 0.009, 0.013, [0.16, 0.0065, 0.08], dark, 14);
      s.tube([[0.18, 0.006, 0.08], [0.195, 0.003, 0.1], [0.18, 0.002, 0.13], [0.155, 0.002, 0.135]], 0.0024, copper);
    } else if (a.desolder === 'pump') {
      s.rod([0.155, 0.012, 0.02], [0.155, 0.012, 0.15], 0.011, s.material('#4387a5'), 0.011);
      s.rod([0.155, 0.012, 0.15], [0.155, 0.012, 0.175], 0.004, dark, 0.002);
      s.rod([0.155, 0.012, 0.02], [0.155, 0.012, -0.005], 0.004, steel);
      s.ball([0.009, 0.009, 0.004], [0.155, 0.012, -0.008], dark, 10);
    } else if (a.desolder === 'forceps') {
      s.tube([[0.145, 0.003, 0.15], [0.15, 0.005, 0.055], [0.158, 0.005, 0.05], [0.165, 0.003, 0.15]], 0.0016, steel);
    }
    const extractor = new THREE.Vector3(0.12, 0.14, -0.17);
    if (a.extraction !== 'none') {
      const ex = extractor.x, ez = extractor.z;
      s.box([0.12, 0.008, 0.08], [ex, 0.004, ez], iron);
      s.rod([ex, 0.008, ez], [ex, 0.14, ez], 0.007, steel);
      if (a.extraction === 'fan') {
        s.box([0.12, 0.11, 0.035], [ex, 0.14, ez], dark);
        s.box([0.1, 0.09, 0.002], [ex, 0.14, ez + 0.018], s.material('#4c554c'));
        for (let i = -4; i <= 4; i++) { s.rod([ex - 0.05, 0.14 + i * 0.01, ez + 0.02], [ex + 0.05, 0.14 + i * 0.01, ez + 0.02], 0.0009, steel); s.rod([ex + i * 0.011, 0.095, ez + 0.02], [ex + i * 0.011, 0.185, ez + 0.02], 0.0009, steel); }
      } else if (a.extraction === 'hood') {
        const hood = s.mesh(new THREE.CylinderGeometry(0.025, 0.06, 0.07, 4, 1, true), new THREE.MeshStandardMaterial({ color: '#657677', roughness: 0.6, side: THREE.DoubleSide }), [ex, 0.14, ez]); hood.rotation.set(Math.PI / 2, Math.PI / 4, 0);
      } else {
        const duct: P[] = [[ex, 0.015, ez - 0.03], [ex, 0.11, ez - 0.06], [ex, 0.16, ez - 0.02], [ex, 0.14, ez + 0.045]];
        s.tube(duct, 0.025, dark);
        const curve = new THREE.CatmullRomCurve3(duct.map(p => new THREE.Vector3(...p)));
        for (let i = 0; i < 16; i++) { const t = i / 15, ring = s.ring(0.026, 0.002, curve.getPoint(t).toArray() as P, iron); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangent(t).normalize()); }
      }
    }
    const matLift = a.mat === 'bare' ? 0 : a.mat === 'ceramic' ? 0.009 : 0.004;
    if (matLift) {
      for (const child of s.root.children) child.position.y += matLift;
      const surface = s.material(a.mat === 'silicone' ? '#608a9c' : a.mat === 'ceramic' ? '#d5d1b9' : '#959e9f', { roughness: a.mat === 'ceramic' ? 0.3 : 0.75, metalness: a.mat === 'steel' ? 0.6 : 0 });
      s.box([0.5, matLift, 0.5], [0, matLift / 2, 0], surface);
      if (a.mat === 'steel') for (const x of [-0.25, 0.25]) s.box([0.008, 0.014, 0.5], [x, 0.011, 0], surface);
      if (a.mat === 'silicone') for (let i = 0; i < 7; i++) s.box([0.025, 0.003, 0.06], [-0.21 + i * 0.065, matLift + 0.0015, -0.205], s.material('#4f7887'));
    }

    // ---- Smoke from the tip: a slow thread, or a pour when scorching.
    const puffs: { mesh: THREE.Mesh; phase: number; drift: number }[] = [];
    if (level >= 2) {
      const smoke = new THREE.MeshStandardMaterial({ color: '#aab0b8', transparent: true, opacity: level === 3 ? 0.6 : 0.48, depthWrite: false, roughness: 1 });
      const count = level === 3 ? 16 : 9;
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), smoke);
        s.root.add(m);
        puffs.push({ mesh: m, phase: i / count, drift: random() * 6.28 });
      }
    }
    const origin = tip.clone().addScaledVector(aim, 0.004);
    origin.y += matLift; extractor.y += matLift;
    const height = level === 3 ? 0.2 : 0.15, speed = mix(0.12, 0.5, mood.energy), sway = mix(0.004, 0.02, mood.energy);
    const place = (time: number) => {
      for (const p of puffs) {
        const t = (p.phase + time * speed) % 1;
        const w = t * t;
        p.mesh.position.set(origin.x + Math.sin(t * 7 + p.drift + time) * sway * (0.3 + w * 3) + w * 0.03, origin.y + t * height, origin.z + Math.cos(t * 5 + p.drift) * sway * (0.3 + w * 2));
        if (a.extraction !== 'none') p.mesh.position.lerp(extractor, w * 0.7);
        p.mesh.scale.setScalar((level === 3 ? 0.008 : 0.005) + t * (level === 3 ? 0.024 : 0.013));
      }
    };
    place(0);
    return s.finish({ update: puffs.length ? (_dt, time) => place(time) : undefined });
  },
});
