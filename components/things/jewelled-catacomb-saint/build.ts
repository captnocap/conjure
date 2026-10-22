import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { SOCKET, SKULL, buildSkull, capPatch, painted, strands, surface } from './skull';

const NAMES = {
  felix: 'S. FELIX', valentinus: 'S. VALENTINUS', clemens: 'S. CLEMENS M.', pancratius: 'S. PANCRATIUS', munditia: 'S. MUNDITIA', ignotus: 'MARTYR IGNOTUS',
} as const;
const ROBE = { crimson: '#8f1f2c', gold: '#b98a2c', blue: '#3a6aa6', black: '#26232b', white: '#e9e3d3', green: '#2f6a4c' } as const;
const GEMS = ['#c81e3a', '#1f4fc0', '#1f9a5a', '#e0a81e', '#8a3fc0'];

export default defineThing({
  questions: {
    eyes: choice('What fills the eye sockets?', {
      rubies: 'Two great faceted rubies.',
      sapphires: 'Deep blue sapphires.',
      glass: 'Painted glass eyes that stare straight ahead.',
      gauze: 'Pads of silk gauze, each embroidered with a gold spiral.',
      pearls: 'A large pearl in each socket.',
      nothing: 'Nothing: bare sockets ringed with gold wire.',
    }),
    crown: choice('What does it wear on its head?', {
      royal: 'A closed royal crown with arches and a cross.',
      laurel: 'A victor\'s wreath of gold laurel leaves.',
      halo: 'A sunburst halo of gilded rays standing behind the head.',
      mitre: 'A tall embroidered bishop\'s mitre.',
      garland: 'A garland of silk flowers.',
      circlet: 'A plain thin circlet with one stone.',
    }),
    stolen: score('How much of the finery has been picked off or stolen?', ['Complete and gleaming', 'A few stones missing', 'Half picked clean, an eye gone', 'Stripped to wire and bone']),
    hand: choice('Is there a skeletal hand, and what is it doing?', {
      none: 'No hand, only the bust.',
      blessing: 'Raised in blessing, two fingers up.',
      palm: 'Holding a martyr\'s palm frond.',
      chalice: 'Holding up a gold chalice.',
      sword: 'Gripping a sword point upward.',
    }),
    robe: choice('What is the bust dressed in?', {
      crimson: 'Crimson velvet with gold trim.',
      gold: 'Stiff cloth of gold.',
      blue: 'Sky-blue silk.',
      black: 'Black velvet sewn with silver.',
      white: 'White linen and lace.',
      green: 'Emerald damask.',
    }),
    label: choice('What does the label scroll on the base say?', NAMES),
    teeth: choice('What has been done with the teeth?', {
      natural: 'Left as they were.',
      gilded: 'Every tooth gilded.',
      pearls: 'Replaced one by one with pearls.',
      wired: 'Mostly gone; the jaws are bound shut with gold wire.',
    }),
    glass: noul('Is it kept inside a glass case with a gilt frame?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const U = SKULL.unit;
    const g = new THREE.Group();
    g.scale.setScalar(U);
    s.root.add(g);
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number] = [0, 0, 0]) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(...at);
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const rod = (parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) => {
      const along = to.clone().sub(from);
      const m = mesh(parent, new THREE.CylinderGeometry(radius * 0.85, radius, along.length(), 7), material, from.clone().add(to).multiplyScalar(0.5).toArray() as [number, number, number]);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize());
      return m;
    };

    const tarnish = mood.wear * 0.6;
    const goldColour = new THREE.Color('#e0b43e').lerp(new THREE.Color('#6f6a3c'), tarnish);
    const gold = new THREE.MeshStandardMaterial({ color: goldColour, metalness: 0.55, roughness: 0.32 + tarnish * 0.4, emissive: goldColour, emissiveIntensity: 0.22 * (1 - tarnish) });
    const pearl = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f4efe4').lerp(new THREE.Color('#9d978a'), tarnish), roughness: 0.25, emissive: '#6d6a60', emissiveIntensity: 0.25 });
    const gemMats = GEMS.map((hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.12, emissive: hex, emissiveIntensity: 0.55, flatShading: true }));
    const empty = new THREE.MeshStandardMaterial({ color: '#2a2218', roughness: 1 });
    const gone = () => random() < a.stolen * 0.95;
    const jewel = (parent: THREE.Object3D, at: THREE.Vector3, size: number, index = Math.floor(random() * GEMS.length)) => {
      const taken = gone();
      const m = mesh(parent, taken ? new THREE.CylinderGeometry(size * 0.9, size * 0.9, size * 0.3, 8) : new THREE.OctahedronGeometry(size, 1), taken ? empty : gemMats[index], at.toArray() as [number, number, number]);
      return m;
    };

    const boneColour = new THREE.Color('#e2d6b6').lerp(new THREE.Color('#a08a68'), mood.wear * 0.4);
    const toothColour = { natural: undefined, gilded: goldColour, pearls: '#f6f1e6', wired: undefined }[a.teeth];
    const skull = buildSkull({
      bone: boneColour, hollow: '#2a1f18', stain: '#7c6240', blotch: mix(0.1, 0.8, mood.wear), random, jaw: 'closed',
      upper: () => (a.teeth === 'wired' ? random() < 0.3 : true), lower: () => (a.teeth === 'wired' ? random() < 0.3 : true),
      tooth: toothColour,
    });
    const Y = 4.3;
    const head = new THREE.Group();
    head.add(skull.root);
    head.position.y = Y;
    head.rotation.set(jitter(0.06), jitter(0.2), jitter(0.07));
    g.add(head);
    const k = skull.root;

    // Gold wire: rings round the sockets, a lattice over the brow and cheeks, jaw bindings.
    const wires: THREE.Vector3[][] = [];
    for (const side of [-1, 1]) {
      const ring: THREE.Vector3[] = [];
      for (let i = 0; i <= 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        ring.push(new THREE.Vector3(side * SOCKET[0] + Math.cos(angle) * 0.31, SOCKET[1] + Math.sin(angle) * 0.29, SOCKET[2] + 0.1 - Math.abs(Math.cos(angle)) * 0.06 - (Math.cos(angle) * side > 0 ? 0.1 * Math.cos(angle) * side : 0)));
      }
      wires.push(ring);
    }
    const studs: THREE.Vector3[] = [];
    for (let row = 0; row < 3; row++) {
      const line: THREE.Vector3[] = [];
      for (let i = 0; i <= 16; i++) {
        const phi = mix(-1.5, 1.5, i / 16), y = 0.22 + row * 0.2 + Math.sin(i * 0.785 + row * 1.57) * 0.07;
        const v = new THREE.Vector3(Math.sin(phi), y, Math.cos(phi));
        line.push(surface(v, 1.02));
        if (i % 4 === 2 && row < 2) studs.push(surface(v, 1.04));
      }
      wires.push(line);
    }
    for (const side of [-1, 1]) {
      wires.push([[0.5, -0.5, 0.62], [0.52, -0.8, 0.55], [0.42, -1.2, 0.5], [0.3, -1.42, 0.55]].map(([x, y, z]) => new THREE.Vector3(side * x, y, z)));
      wires.push([[0.14, -0.62, 0.86], [0.2, -0.9, 0.8], [0.18, -1.3, 0.8]].map(([x, y, z]) => new THREE.Vector3(side * x, y, z)));
    }
    if (a.teeth === 'wired') for (let i = 0; i < 5; i++) {
      const x = -0.3 + i * 0.15;
      const z = 0.38 + Math.sqrt(1 - (x / 0.42) ** 2) * 0.43;
      wires.push([new THREE.Vector3(x, -0.85, z), new THREE.Vector3(x + 0.03, -1.07, z + 0.02), new THREE.Vector3(x, -1.3, z)]);
    }
    k.add(strands(wires, 0.022, gold, 5));
    studs.forEach((at, i) => jewel(k, at, i === 1 || i === 5 ? 0.1 : 0.07));
    jewel(k, surface(new THREE.Vector3(0, 0.42, 0.9), 1.05), 0.14, 0);

    // Eyes.
    const eyeGone = [a.stolen > 0.5 && random() < 0.8, a.stolen > 0.88];
    [-1, 1].forEach((side, index) => {
      const at: [number, number, number] = [side * SOCKET[0], SOCKET[1], SOCKET[2] - 0.08];
      if (a.eyes === 'nothing' || eyeGone[index]) return;
      if (a.eyes === 'rubies' || a.eyes === 'sapphires') {
        const gem = mesh(k, new THREE.IcosahedronGeometry(0.23, 0), gemMats[a.eyes === 'rubies' ? 0 : 1], at);
        gem.scale.z = 0.7;
        gem.rotation.z = jitter(0.5);
      } else if (a.eyes === 'pearls') mesh(k, new THREE.SphereGeometry(0.22, 16, 12), pearl, at);
      else if (a.eyes === 'glass') {
        mesh(k, new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: '#f3efe6', roughness: 0.15 }), at);
        mesh(k, new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: mood.warmth > 0.5 ? '#6a4a22' : '#3f6fa0', roughness: 0.2 }), [at[0], at[1], at[2] + 0.13]).scale.z = 0.5;
        mesh(k, new THREE.SphereGeometry(0.055, 8, 6), empty, [at[0], at[1], at[2] + 0.18]).scale.z = 0.5;
      } else {
        const pad = mesh(k, new THREE.SphereGeometry(0.25, 14, 10), new THREE.MeshStandardMaterial({ color: '#efe6d0', roughness: 0.95 }), at);
        pad.scale.z = 0.5;
        const spiral: THREE.Vector3[] = [];
        for (let i = 0; i < 26; i++) { const t = i / 25, angle = t * 12; spiral.push(new THREE.Vector3(at[0] + Math.cos(angle) * t * 0.19, at[1] + Math.sin(angle) * t * 0.19, at[2] + 0.13 - t * t * 0.05)); }
        k.add(strands([spiral], 0.014, gold, 4));
      }
    });

    // Veil over the back of the head, falling to the shoulders, sewn with pearls.
    const robeColour = new THREE.Color(ROBE[a.robe]).lerp(new THREE.Color('#77705f'), mood.wear * 0.35);
    const veilColour = new THREE.Color(a.robe === 'white' ? '#d9c79a' : '#efe7d2').lerp(new THREE.Color('#8f8878'), mood.wear * 0.4);
    const veilTexture = painted(256, 256, (ctx, w, h) => {
      ctx.fillStyle = `#${veilColour.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { ctx.beginPath(); ctx.arc(x * 32 + (y % 2) * 16 + 8, y * 32 + 12, 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = `#${goldColour.getHexString()}`;
      ctx.lineWidth = 3;
      for (let y = 0; y < 8; y++) { ctx.beginPath(); for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y * 32 + 28 + Math.sin(x * 0.2) * 4); ctx.stroke(); }
    });
    veilTexture.wrapS = veilTexture.wrapT = THREE.RepeatWrapping;
    veilTexture.repeat.set(3, 2);
    const veil = new THREE.MeshStandardMaterial({ map: veilTexture, roughness: 0.85, side: THREE.DoubleSide });
    const torn = a.stolen > 0.6;
    const halfWidth = torn ? 1.3 : 2.05;
    mesh(k, capPatch(Math.PI + (torn ? 0.5 : 0), halfWidth, 0.3, 1.75, 1.06), veil);
    const drapeLength = torn ? 1.1 : 2.3;
    const drape = new THREE.CylinderGeometry(1.0, 1.35, drapeLength, 24, 6, true, Math.PI - halfWidth + (torn ? 0.5 : 0), halfWidth * 2);
    const dp = drape.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < dp.count; i++) {
      const angle = Math.atan2(dp.getX(i), dp.getZ(i));
      const fold = 1 + Math.sin(angle * 9) * 0.05 * (0.5 - dp.getY(i) / drapeLength);
      dp.setXYZ(i, dp.getX(i) * 0.86 * fold, dp.getY(i) + (torn && dp.getY(i) < 0 ? Math.sin(angle * 5) * 0.25 : 0), dp.getZ(i) * 1.05 * fold - 0.05);
    }
    drape.computeVertexNormals();
    mesh(k, drape, veil, [0, -0.35 - drapeLength / 2, 0]);
    const edgePearls: THREE.Vector3[] = [];
    for (let i = 0; i <= 26; i++) {
      const t = i / 26, theta = mix(0.3, 1.75, t);
      for (const side of [-1, 1]) {
        if (torn && side > 0) continue;
        const phi = Math.PI + side * (halfWidth - 0.02) + (torn ? 0.5 : 0);
        edgePearls.push(surface(new THREE.Vector3(Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi)), 1.085));
      }
    }
    const kept = edgePearls.filter(() => !gone());
    if (kept.length) {
      const sewn = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), pearl, kept.length);
      const matrix = new THREE.Matrix4();
      kept.forEach((at, i) => sewn.setMatrixAt(i, matrix.makeTranslation(at.x, at.y, at.z)));
      sewn.castShadow = true;
      k.add(sewn);
    }

    // Headwear.
    const crown = new THREE.Group();
    crown.position.copy(surface(new THREE.Vector3(0, 1, 0.08), 1));
    crown.rotation.set(-0.08 + (a.stolen > 0.55 ? 0.12 : 0), 0, a.stolen > 0.55 ? 0.22 : jitter(0.04));
    k.add(crown);
    if (a.crown === 'royal') {
      { const band = gold.clone(); band.side = THREE.DoubleSide; mesh(crown, new THREE.CylinderGeometry(0.62, 0.58, 0.26, 24, 1, true), band, [0, -0.02, 0]); }
      mesh(crown, new THREE.SphereGeometry(0.52, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: robeColour.clone().lerp(new THREE.Color('#8f1f2c'), 0.6), roughness: 0.95 }), [0, 0.08, 0]).scale.y = 0.9;
      for (let i = 0; i < 4; i++) {
        const arch = mesh(crown, new THREE.TorusGeometry(0.58, 0.04, 6, 16, Math.PI), gold, [0, 0.1, 0]);
        arch.rotation.y = i * Math.PI / 4;
        arch.scale.y = 1.0;
      }
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        jewel(crown, new THREE.Vector3(Math.sin(angle) * 0.63, 0, Math.cos(angle) * 0.63), 0.075);
        if (!(a.stolen > 0.8 && i % 2)) mesh(crown, new THREE.ConeGeometry(0.07, 0.24, 4), gold, [Math.sin(angle + 0.39) * 0.6, 0.22, Math.cos(angle + 0.39) * 0.6]);
      }
      mesh(crown, new THREE.SphereGeometry(0.1, 10, 8), gold, [0, 0.72, 0]);
      mesh(crown, new THREE.BoxGeometry(0.06, 0.34, 0.05), gold, [0, 0.96, 0]);
      mesh(crown, new THREE.BoxGeometry(0.22, 0.06, 0.05), gold, [0, 1.0, 0]);
    } else if (a.crown === 'laurel') {
      const leaf = new THREE.SphereGeometry(1, 8, 5);
      const count = a.stolen > 0.7 ? 12 : 30;
      const leaves = new THREE.InstancedMesh(leaf, gold, count);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < count; i++) {
        const sideSign = i % 2 ? 1 : -1, t = Math.floor(i / 2) / (count / 2);
        const phi = sideSign * mix(2.9, 0.25, t);
        const at = surface(new THREE.Vector3(Math.sin(phi), 0.62, Math.cos(phi)), 1.07).sub(crown.position);
        q.setFromEuler(e.set(0.5, phi + sideSign * 1.1, sideSign * 0.5 + jitter(0.3)));
        leaves.setMatrixAt(i, matrix.compose(at, q, new THREE.Vector3(0.2, 0.035, 0.08)));
      }
      leaves.castShadow = true;
      crown.add(leaves);
      jewel(crown, surface(new THREE.Vector3(0, 0.62, 1), 1.1).sub(crown.position), 0.11, 2);
    } else if (a.crown === 'halo') {
      const disc = new THREE.Group();
      disc.position.set(0, -0.35, -0.75);
      disc.rotation.x = -0.12;
      crown.add(disc);
      mesh(disc, new THREE.TorusGeometry(1.0, 0.05, 6, 40), gold);
      mesh(disc, new THREE.TorusGeometry(0.8, 0.03, 6, 40), gold);
      const rays = a.stolen > 0.7 ? 11 : 24;
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2 + (a.stolen > 0.7 ? jitter(0.2) : 0), long = i % 2 === 0;
        const ray = mesh(disc, new THREE.ConeGeometry(0.07, long ? 0.95 : 0.55, 4), gold, [Math.sin(angle) * (1.0 + (long ? 0.47 : 0.27)), Math.cos(angle) * (1.0 + (long ? 0.47 : 0.27)), 0]);
        ray.rotation.z = -angle;
        ray.scale.z = 0.35;
      }
      for (let i = 0; i < 8; i++) jewel(disc, new THREE.Vector3(Math.sin(i * 0.785) * 0.9, Math.cos(i * 0.785) * 0.9, 0.05), 0.07);
    } else if (a.crown === 'mitre') {
      const cloth = new THREE.MeshStandardMaterial({ color: a.robe === 'white' ? '#b8892e' : '#eee6d2', roughness: 0.85 });
      for (const z of [-1, 1]) {
        const shape = new THREE.Shape();
        shape.moveTo(-0.62, 0); shape.lineTo(0.62, 0); shape.lineTo(0.7, 0.75); shape.lineTo(0, 1.75); shape.lineTo(-0.7, 0.75); shape.closePath();
        const panel = mesh(crown, new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false }), cloth, [0, -0.1, z * 0.32 - 0.04]);
        panel.rotation.x = -z * 0.12;
        mesh(crown, new THREE.BoxGeometry(0.14, 1.5, 0.03), gold, [0, 0.72, z * 0.42 - z * 0.05]).rotation.x = -z * 0.12;
      }
      mesh(crown, new THREE.CylinderGeometry(0.66, 0.64, 0.2, 20), gold, [0, 0, 0]).scale.z = 0.72;
      for (let i = -1; i <= 1; i++) jewel(crown, new THREE.Vector3(i * 0.3, 0.0, 0.48), 0.08);
      jewel(crown, new THREE.Vector3(0, 0.85, 0.4), 0.12, 0);
    } else if (a.crown === 'garland') {
      const silk = (mood.cheer > 0.4 ? ['#e2607a', '#f0c84a', '#f1ebe0', '#7fa8d8'] : ['#8d4a58', '#a8904a', '#bdb6a6', '#5d7088']).map((hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.8 }));
      const count = a.stolen > 0.7 ? 7 : 16;
      for (let i = 0; i < count; i++) {
        const phi = (i / count) * Math.PI * 2 + jitter(0.1);
        const at = surface(new THREE.Vector3(Math.sin(phi), 0.6, Math.cos(phi)), 1.1).sub(crown.position);
        const bloom = mesh(crown, new THREE.IcosahedronGeometry(mix(0.14, 0.22, random()), 0), silk[i % 4], at.toArray() as [number, number, number]);
        bloom.rotation.set(random() * 3, random() * 3, 0);
        mesh(crown, new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshStandardMaterial({ color: '#4f7a48', roughness: 0.8 }), [at.x * 1.02, at.y - 0.12, at.z * 1.02]).scale.set(1.6, 0.4, 1);
      }
    } else {
      const band = mesh(crown, new THREE.TorusGeometry(0.72, 0.035, 6, 36), gold, [0, -0.3, -0.05]);
      band.rotation.x = Math.PI / 2 + 0.1;
      band.scale.y = 1.2;
      jewel(crown, new THREE.Vector3(0, -0.24, 0.84), 0.12, 0);
    }

    // The bust: neck ruff, shoulders, gilt socle and label.
    const brocade = painted(256, 256, (ctx, w, h) => {
      ctx.fillStyle = `#${robeColour.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = a.robe === 'black' ? '#c9ccd2' : `#${goldColour.getHexString()}`;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 3;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const cx = x * 64 + (y % 2) * 32 + 16, cy = y * 64 + 32;
        ctx.beginPath(); ctx.moveTo(cx, cy - 24); ctx.lineTo(cx + 18, cy); ctx.lineTo(cx, cy + 24); ctx.lineTo(cx - 18, cy); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
      }
    });
    brocade.wrapS = brocade.wrapT = THREE.RepeatWrapping;
    brocade.repeat.set(4, 1.5);
    const cloth = new THREE.MeshStandardMaterial({ map: brocade, roughness: 0.8 });
    const bust = mesh(g, new THREE.LatheGeometry([[0.95, 0.75], [1.3, 1.1], [1.75, 1.75], [1.8, 2.15], [1.5, 2.5], [0.75, 2.72], [0.5, 2.95], [0, 2.98]].map(([x, y]) => new THREE.Vector2(x, y)), 36), cloth);
    bust.scale.z = 0.62;
    for (let i = 0; i < 3; i++) {
      const ruff = mesh(g, new THREE.TorusGeometry(0.62 - i * 0.07, 0.11, 8, 28), i === 1 ? gold : pearl, [0, 2.78 + i * 0.13, 0.03]);
      ruff.rotation.x = Math.PI / 2;
      ruff.scale.y = 0.8;
    }
    const trim = mesh(g, new THREE.TorusGeometry(1.32, 0.07, 6, 40), gold, [0, 1.12, 0]);
    trim.rotation.x = Math.PI / 2;
    trim.scale.y = 0.62;
    for (let i = 0; i < 5; i++) jewel(g, new THREE.Vector3(-0.8 + i * 0.4, 2.1 - Math.abs(i - 2) * 0.12 - 0.35, 1.02 + (2 - Math.abs(i - 2)) * 0.045), i === 2 ? 0.16 : 0.1);
    const chain: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12 - 0.5; chain.push(new THREE.Vector3(t * 2.2, 2.45 - (0.25 - t * t) * 3.0, 0.72 + (0.25 - t * t) * 1.5)); }
    g.add(strands([chain], 0.03, gold, 5));
    mesh(g, new THREE.BoxGeometry(2.7, 0.2, 1.9), gold, [0, 0.1, 0]);
    mesh(g, new THREE.BoxGeometry(2.4, 0.5, 1.6), new THREE.MeshStandardMaterial({ color: robeColour.clone().multiplyScalar(0.7), roughness: 0.6 }), [0, 0.42, 0]);
    mesh(g, new THREE.BoxGeometry(2.6, 0.14, 1.8), gold, [0, 0.72, 0]);
    for (const x of [-1, 1]) for (const z of [-1, 1]) mesh(g, new THREE.SphereGeometry(0.17, 10, 8), gold, [x * 1.2, 0.02, z * 0.8]);
    const scroll = s.label(NAMES[a.label], 2.1 * U, 0.36 * U, [0, 0.42 * U, 0.815 * U], '#3a2416', '#efe3c0');
    scroll.castShadow = false;
    for (const x of [-1, 1]) mesh(g, new THREE.CylinderGeometry(0.09, 0.09, 0.42, 10), new THREE.MeshStandardMaterial({ color: '#e2d5ae', roughness: 0.8 }), [x * 1.07, 0.42, 0.84]);

    // The hand.
    if (a.hand !== 'none') {
      const boneMat = new THREE.MeshStandardMaterial({ color: boneColour, roughness: 0.8 });
      const wrist = new THREE.Vector3(1.55, 2.45, 0.75);
      rod(g, new THREE.Vector3(1.35, 1.5, 0.55), wrist, 0.12, boneMat);
      rod(g, new THREE.Vector3(1.5, 1.5, 0.5), wrist.clone().add(new THREE.Vector3(0.1, 0, -0.05)), 0.08, boneMat);
      const cuff = mesh(g, new THREE.CylinderGeometry(0.24, 0.3, 0.5, 12), cloth, [1.43, 1.55, 0.53]);
      cuff.rotation.z = -0.2;
      const cuffTrim = mesh(g, new THREE.TorusGeometry(0.25, 0.05, 6, 16), gold, [1.47, 1.8, 0.56]);
      cuffTrim.rotation.set(Math.PI / 2, 0.2, 0);
      const fist = a.hand !== 'blessing';
      for (let f = 0; f < 5; f++) {
        const thumb = f === 0;
        const spreadX = thumb ? -0.3 : -0.15 + (f - 1) * 0.11;
        let at = wrist.clone().add(new THREE.Vector3(spreadX, thumb ? 0.05 : 0.38, thumb ? 0.1 : 0));
        rod(g, wrist.clone().add(new THREE.Vector3(spreadX * 0.4, 0, 0)), at, 0.045, boneMat);
        const curled = fist || (!thumb && f >= 3) || thumb;
        let dir = new THREE.Vector3(thumb ? -0.5 : (f - 2.5) * 0.06, 1, 0.05).normalize();
        const lengths = thumb ? [0.2, 0.16] : [0.26, 0.2, 0.15];
        for (const length of lengths) {
          if (curled) dir = dir.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), fist ? 1.15 : 1.3).normalize();
          const next = at.clone().addScaledVector(dir, length);
          rod(g, at, next, 0.04, boneMat);
          mesh(g, new THREE.SphereGeometry(0.048, 6, 5), boneMat, at.toArray() as [number, number, number]);
          at = next;
        }
        if (f === 2 && !gone()) {
          const ring = mesh(g, new THREE.TorusGeometry(0.06, 0.02, 5, 10), gold, wrist.clone().add(new THREE.Vector3(spreadX, 0.42, 0)).toArray() as [number, number, number]);
          ring.rotation.x = Math.PI / 2;
        }
      }
      const grip = wrist.clone().add(new THREE.Vector3(0, 0.4, 0.2));
      if (a.hand === 'palm') {
        const green = new THREE.MeshStandardMaterial({ color: new THREE.Color('#5d8a3a').lerp(goldColour, 0.35 + mood.wear * 0.4), roughness: 0.7 });
        const fronds: THREE.Vector3[][] = [];
        const base = grip.clone().add(new THREE.Vector3(0, -0.9, 0)), tipAt = grip.clone().add(new THREE.Vector3(0.45, 3.0, -0.1));
        const spine: THREE.Vector3[] = [];
        for (let i = 0; i <= 10; i++) { const t = i / 10; spine.push(base.clone().lerp(tipAt, t).add(new THREE.Vector3(Math.sin(t * 1.6) * 0.3, 0, 0))); }
        fronds.push(spine);
        for (let i = 3; i <= 10; i++) for (const side of [-1, 1]) {
          const from = spine[i], reach = mix(0.75, 0.25, (i - 3) / 7);
          fronds.push([from, from.clone().add(new THREE.Vector3(side * reach * 0.6, reach * 0.5, 0.05)), from.clone().add(new THREE.Vector3(side * reach, reach * 0.55, 0.02))]);
        }
        g.add(strands(fronds, 0.04, green, 4));
      } else if (a.hand === 'chalice') {
        const cup = mesh(g, new THREE.LatheGeometry([[0, 0], [0.3, 0.02], [0.08, 0.12], [0.06, 0.5], [0.14, 0.58], [0.06, 0.66], [0.3, 0.9], [0.36, 1.25], [0.32, 1.25], [0.05, 0.78], [0, 0.78]].map(([x, y]) => new THREE.Vector2(x, y)), 20), gold, [grip.x, grip.y - 0.55, grip.z]);
        cup.rotation.z = -0.05;
        jewel(g, new THREE.Vector3(grip.x, grip.y + 0.03, grip.z + 0.15), 0.07);
      } else if (a.hand === 'sword') {
        const steel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9cdd2').lerp(new THREE.Color('#6d5a48'), mood.wear * 0.6), metalness: 0.5, roughness: 0.35 });
        const sword = new THREE.Group();
        mesh(sword, new THREE.BoxGeometry(0.16, 3.0, 0.04), steel, [0, 1.75, 0]);
        mesh(sword, new THREE.ConeGeometry(0.08, 0.3, 4), steel, [0, 3.4, 0]).scale.z = 0.25;
        mesh(sword, new THREE.BoxGeometry(0.8, 0.09, 0.1), gold, [0, 0.22, 0]);
        mesh(sword, new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8), new THREE.MeshStandardMaterial({ color: '#3a2a22' }), [0, -0.08, 0]);
        mesh(sword, new THREE.SphereGeometry(0.09, 8, 6), gold, [0, -0.4, 0]);
        sword.position.copy(grip).add(new THREE.Vector3(0, -0.1, 0));
        sword.rotation.z = -0.1;
        g.add(sword);
      }
    }

    if (a.glass) {
      const pane = new THREE.MeshStandardMaterial({ color: '#dfeff2', transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false });
      const w = 5.2, h = a.crown === 'mitre' || a.hand === 'sword' || a.hand === 'palm' ? 8.0 : 7.0, dpt = 3.4;
      const glass = mesh(g, new THREE.BoxGeometry(w, h, dpt), pane, [0.2, h / 2, 0]);
      glass.castShadow = glass.receiveShadow = false;
      for (const x of [-1, 1]) for (const z of [-1, 1]) mesh(g, new THREE.BoxGeometry(0.12, h, 0.12), gold, [0.2 + x * w / 2, h / 2, z * dpt / 2]);
      for (const y of [0.06, h]) {
        for (const z of [-1, 1]) mesh(g, new THREE.BoxGeometry(w + 0.12, 0.12, 0.12), gold, [0.2, y, z * dpt / 2]);
        for (const x of [-1, 1]) mesh(g, new THREE.BoxGeometry(0.12, 0.12, dpt), gold, [0.2 + x * w / 2, y, 0]);
      }
      mesh(g, new THREE.BoxGeometry(w + 0.5, 0.25, dpt + 0.5), s.material('#3a2a22'), [0.2, -0.125, 0]);
    }

    const glint = mix(0.4, 3, mood.energy);
    return s.finish({
      update: (_dt, time) => { gemMats.forEach((material, i) => { material.emissiveIntensity = 0.55 + Math.sin(time * glint + i * 1.3) * 0.2; }); },
    });
  },
});
