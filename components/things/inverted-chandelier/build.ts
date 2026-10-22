import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const METALS = {
  brass: 'Warm polished brass.', silver: 'Cold bright silver.', iron: 'Black wrought iron.', gilt: 'Rich yellow gilt.', enamel: 'White enamel, like a wedding cake.',
} as const;
const METAL: Record<keyof typeof METALS, [string, number]> = { brass: ['#c59a45', 0.85], silver: ['#cfd5d8', 0.9], iron: ['#2b2b2d', 0.5], gilt: ['#e6bd3d', 0.9], enamel: ['#f1ede2', 0.05] };
const GLASS = {
  clear: 'Clear cut glass, icy.', amber: 'Amber, like boiled sweets.', rose: 'Pale rose pink.', sea: 'Sea green.', smoke: 'Smoky grey.', violet: 'Deep violet.',
} as const;
const GLASS_TINT: Record<keyof typeof GLASS, string> = { clear: '#9ccbe0', amber: '#e39a2e', rose: '#e88ba0', sea: '#4fb89c', smoke: '#666874', violet: '#8a62d0' };

export default defineThing({
  questions: {
    flames: choice('Are the downward candles lit?', {
      lit: 'All lit, small flames burning steadily downward.',
      guttering: 'Half of them have gone out; the rest gutter.',
      out: 'All out, cold wicks, thin smoke sinking toward the floor.',
      blue: 'Lit with cold blue flames.',
    }),
    wax: score('How much wax is dripping upward?', ['None', 'A few beads creeping up', 'Long upward icicles of wax', 'Streaming up and breaking into floating drops']),
    shedding: score('How many crystals have come loose and are floating away?', ['None, all in place', 'One or two drifting', 'A scattering rising', 'A whole swarm lifting off']),
    size: choice('How grand is it?', {
      sparse: 'Four arms, modest, from a hallway.',
      ring: 'One generous ring of six arms.',
      tiered: 'Two tiers of arms, a dining room piece.',
      grand: 'Three tiers, a ballroom giant.',
    }),
    metal: choice('What is the frame made of?', METALS),
    glass: choice('What colour are the crystals?', GLASS),
    chain: choice('How does the chain hold it up?', {
      taut: 'Straight and stiff as a stem.',
      wavering: 'Swaying in an S like seaweed in a current.',
      leaning: 'Leaning well over, as if toward a window.',
    }),
    root: choice('What does it grow out of?', {
      rose: 'A plaster ceiling rose lying on the floor.',
      boards: 'A splintered hole in a patch of floorboards.',
      pool: 'A dark still pool, like its own reflection.',
      pot: 'A terracotta flowerpot of soil, as though planted.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [metalTint, metalness] = METAL[a.metal];
    const metal = s.material(metalTint, { metalness, roughness: a.metal === 'enamel' ? 0.4 : 0.3 });
    const waxMat = s.material('#e6d5a8', { roughness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({ color: GLASS_TINT[a.glass], roughness: 0.08, metalness: 0.35, flatShading: true, emissive: GLASS_TINT[a.glass], emissiveIntensity: mix(0.08, 0.3, mood.cheer) });

    // What it grows from.
    let rootTop = 0.02;
    if (a.root === 'rose') {
      s.lathe([[0, 0], [0.46, 0], [0.47, 0.02], [0.4, 0.035], [0.36, 0.02], [0.3, 0.05], [0.24, 0.03], [0.16, 0.07], [0.07, 0.09], [0, 0.09]], s.material('#ece7da', { roughness: 0.9 }));
      for (let i = 0; i < 10; i++) s.ball([0.05, 0.02, 0.03], [Math.cos(i * 0.628) * 0.33, 0.035, Math.sin(i * 0.628) * 0.33], s.material('#ece7da'), 8).rotation.y = -i * 0.628;
      for (let i = 0; i < Math.round(mood.wear * 7); i++) s.box([0.05 + random() * 0.06, 0.02, 0.04 + random() * 0.05], [(random() - 0.5) * 1.2, 0.01, (random() - 0.5) * 1.2], s.material('#ece7da')).rotation.y = random() * 3;
      rootTop = 0.09;
    } else if (a.root === 'boards') {
      const board = s.material('#8a6846');
      for (let i = 0; i < 6; i++) s.box([0.17, 0.03, 1.0 + random() * 0.2], [-0.45 + i * 0.18, 0.015, (random() - 0.5) * 0.08], i % 2 ? board : s.material('#7a5a3c'));
      s.cylinder(0.11, 0.11, 0.032, [0, 0.016, 0], s.material('#1b1512'), 9);
      for (let i = 0; i < 7; i++) s.rod([Math.cos(i * 0.9) * 0.1, 0.02, Math.sin(i * 0.9) * 0.1], [Math.cos(i * 0.9) * 0.17, 0.08 + random() * 0.08, Math.sin(i * 0.9) * 0.17], 0.018, board, 0.003);
      rootTop = 0.03;
    } else if (a.root === 'pool') {
      s.cylinder(0.6, 0.62, 0.012, [0, 0.006, 0], s.material('#2a3340', { roughness: 0.03, metalness: 0.6 }), 40).scale.z = 0.85;
      s.ring(0.25, 0.006, [0, 0.014, 0], s.material('#7b8794')).rotation.x = Math.PI / 2;
      s.ring(0.42, 0.005, [0, 0.014, 0], s.material('#5b6774')).rotation.x = Math.PI / 2;
    } else {
      s.lathe([[0, 0], [0.16, 0], [0.24, 0.3], [0.26, 0.3], [0.26, 0.35], [0.22, 0.35], [0.21, 0.3], [0, 0.3]], s.material('#b5623f', { roughness: 0.9 }));
      s.cylinder(0.215, 0.215, 0.02, [0, 0.31, 0], s.material('#3a2a20', { roughness: 1 }));
      rootTop = 0.31;
    }

    // The chain: a stem of links following a curve from the root to the body.
    const tiers = { sparse: 1, ring: 1, tiered: 2, grand: 3 }[a.size];
    const stem = mix(0.7, 0.9, random());
    const lean = a.chain === 'leaning' ? 0.3 * (random() < 0.5 ? -1 : 1) : 0;
    const wave = a.chain === 'wavering' ? 0.14 : 0.01;
    const path = new THREE.CatmullRomCurve3(Array.from({ length: 7 }, (_unused, i) => {
      const u = i / 6;
      return new THREE.Vector3(Math.sin(u * Math.PI * 2) * wave + lean * u * u, rootTop + u * stem, Math.sin(u * Math.PI * 3 + 1) * wave * 0.5);
    }));
    const linkCount = Math.round(stem / 0.088);
    const links = new THREE.InstancedMesh(new THREE.TorusGeometry(0.043, 0.012, 6, 14), metal, linkCount);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), twist = new THREE.Quaternion();
    for (let i = 0; i < linkCount; i++) {
      const u = (i + 0.5) / linkCount, tangent = path.getTangentAt(u);
      q.setFromUnitVectors(up, tangent).multiply(twist.setFromAxisAngle(up, i % 2 ? Math.PI / 2 : 0));
      m4.compose(path.getPointAt(u), q, new THREE.Vector3(1, 1.45, 1));
      links.setMatrixAt(i, m4);
    }
    links.castShadow = true;
    s.root.add(links);

    // The body and everything on it lives in a head group that tips with the chain.
    const head = new THREE.Group();
    head.position.copy(path.getPointAt(1));
    const tip = path.getTangentAt(1);
    head.quaternion.setFromUnitVectors(up, tip.lerp(up, 0.45).normalize());
    head.scale.setScalar(1.3);
    s.root.add(head);
    const add = <T extends THREE.Object3D>(node: T, x = 0, y = 0, z = 0) => { node.position.set(x, y, z); node.castShadow = true; head.add(node); return node; };
    const bodyH = 0.55 + tiers * 0.22;
    const profile: [number, number][] = [[0, 0], [0.035, 0], [0.05, 0.04], [0.03, 0.08], [0.09, 0.16], [0.11, 0.22], [0.05, 0.3]];
    for (let t = 0; t < tiers; t++) { const y = 0.34 + t * 0.24; profile.push([0.04, y], [0.1 - t * 0.012, y + 0.06], [0.1 - t * 0.012, y + 0.1], [0.04, y + 0.16]); }
    profile.push([0.03, bodyH - 0.08], [0.07, bodyH - 0.04], [0.02, bodyH], [0, bodyH]);
    add(new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x * 1.5, y)), 24), metal));

    const flames: THREE.Mesh[] = [];
    const crystalPoints: { at: THREE.Vector3; size: number }[] = [];
    const flameTint = a.flames === 'blue' ? '#7fc4ff' : '#ffb347';
    const flameMat = new THREE.MeshStandardMaterial({ color: flameTint, emissive: flameTint, emissiveIntensity: 1.6, roughness: 0.4 });
    const haloMat = new THREE.MeshBasicMaterial({ color: flameTint, transparent: true, opacity: 0.16, depthWrite: false });
    const smokeMat = new THREE.MeshBasicMaterial({ color: '#8a8a90', transparent: true, opacity: 0.18, depthWrite: false });
    const flameGeo = new THREE.LatheGeometry([[0, 0], [0.012, -0.01], [0.032, -0.04], [0.022, -0.08], [0, -0.15]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
    const waxDrops: { at: THREE.Vector3; size: number }[] = [];

    for (let t = 0; t < tiers; t++) {
      const count = a.size === 'sparse' ? 4 : [6, 5, 4][t] + (a.size === 'grand' && t === 0 ? 2 : 0);
      const reach = [0.58, 0.44, 0.3][t] * (a.size === 'sparse' ? 0.85 : 1), y0 = 0.42 + t * 0.24;
      for (let i = 0; i < count; i++) {
        const turn = (i / count) * Math.PI * 2 + t * 0.5, cx = Math.cos(turn), cz = Math.sin(turn);
        const P = (r: number, y: number): [number, number, number] => [cx * r, y, cz * r];
        // The arm rises from the body, arches over and droops to a cup that opens downward.
        const curve = new THREE.CatmullRomCurve3([P(0.1, y0), P(reach * 0.3, y0 + 0.02), P(reach * 0.62, y0 + 0.2), P(reach * 0.92, y0 + 0.16), P(reach, y0 + 0.02)].map((p) => new THREE.Vector3(...p)));
        add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.017, 6), metal));
        add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.06, 14, 1, true), metal), ...P(reach, y0 - 0.005)).material.side = THREE.DoubleSide;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.15, 10), waxMat), ...P(reach, y0 - 0.09));
        const lit = a.flames === 'lit' || a.flames === 'blue' || (a.flames === 'guttering' && random() < 0.5);
        if (lit) {
          const flame = add(new THREE.Mesh(flameGeo, flameMat), ...P(reach, y0 - 0.165));
          flame.castShadow = false; flames.push(flame);
          add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), haloMat), ...P(reach, y0 - 0.23)).castShadow = false;
        } else {
          add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 4), s.material('#222')), ...P(reach, y0 - 0.175));
          const smoke = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 5 }, (_u, k) => new THREE.Vector3(Math.sin(k * 1.7 + i) * 0.03, -k * 0.09, Math.cos(k * 1.3 + i) * 0.03))), 16, 0.012, 5), smokeMat), ...P(reach, y0 - 0.18));
          smoke.castShadow = false;
        }
        // Wax runs up from the cup.
        const runs = Math.round(a.wax * 3 * (0.5 + random()));
        for (let k = 0; k < runs; k++) {
          const ang = random() * 6.28, len = (0.04 + random() * 0.2) * mix(0.4, 1, a.wax);
          const bx = cx * reach + Math.cos(ang) * 0.055, bz = cz * reach + Math.sin(ang) * 0.055;
          const drip = add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.008, len, 6), waxMat), bx, y0 + 0.01 + len / 2, bz);
          drip.name = 'wax';
          if (a.wax > 0.7) waxDrops.push({ at: new THREE.Vector3(bx, y0 + len + 0.06 + random() * 0.5, bz), size: 0.016 + random() * 0.014 });
        }
        // Crystals rise from the arch of each arm and from the cup, strung upward.
        const beads = 2 + Math.floor(random() * 3);
        for (let k = 0; k < beads; k++) crystalPoints.push({ at: new THREE.Vector3(cx * reach * 0.66, y0 + 0.26 + k * 0.1, cz * reach * 0.66), size: k === beads - 1 ? 0.055 : 0.032 });
        crystalPoints.push({ at: new THREE.Vector3(cx * (reach + 0.06), y0 + 0.07, cz * (reach + 0.06)), size: 0.045 });
        // A swag of beads arching up to the crown.
        if (t === 0) for (let k = 1; k < 9; k++) {
          const u = k / 9, r = mix(reach * 0.66, 0.06, u), y = mix(y0 + 0.22, bodyH - 0.02, u) + Math.sin(u * Math.PI) * 0.12;
          crystalPoints.push({ at: new THREE.Vector3(cx * r, y, cz * r), size: 0.023 });
        }
      }
    }
    // The crown: a spray standing straight up where a hanging one would have a drop.
    for (let k = 0; k < 5; k++) crystalPoints.push({ at: new THREE.Vector3(0, bodyH + 0.06 + k * 0.11, 0), size: k === 4 ? 0.09 : 0.04 });

    // Loose crystals lifting away, further and wider the more it has shed.
    const loose = Math.round(a.shedding ** 1.4 * 46);
    const floating: { at: THREE.Vector3; size: number }[] = [];
    for (let i = 0; i < loose; i++) {
      const h = random() ** 0.8, ang = random() * 6.28, r = 0.1 + random() * (0.35 + h * 0.3);
      floating.push({ at: new THREE.Vector3(Math.cos(ang) * r + h * 0.15, bodyH + 0.15 + h * mix(0.35, 0.95, a.shedding), Math.sin(ang) * r), size: 0.03 + random() * 0.04 });
    }
    const gem = new THREE.OctahedronGeometry(1, 0);
    gem.scale(0.7, 1.35, 0.7);
    const instance = (points: { at: THREE.Vector3; size: number }[], geometry: THREE.BufferGeometry, material: THREE.Material, spin = false) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(points.length, 1));
      mesh.count = points.length;
      points.forEach((p, i) => {
        q.setFromEuler(new THREE.Euler(spin ? random() * 3 : 0, random() * 3, spin ? random() * 3 : 0));
        mesh.setMatrixAt(i, m4.compose(p.at, q, new THREE.Vector3(p.size, p.size, p.size)));
      });
      mesh.castShadow = true;
      head.add(mesh);
      return mesh;
    };
    instance(crystalPoints, gem, glass);
    const drifting = instance(floating, gem, glass, true);
    instance(waxDrops, new THREE.SphereGeometry(1, 8, 6), waxMat);

    const energy = mood.energy;
    const base = head.quaternion.clone(), rock = new THREE.Quaternion(), axis = new THREE.Vector3(0, 0, 1);
    return s.finish({
      footprint: 0.6,
      update: (_dt, time) => {
        rock.setFromAxisAngle(axis, Math.sin(time * mix(0.5, 1.4, energy)) * mix(0.01, 0.06, energy));
        head.quaternion.copy(base).multiply(rock);
        drifting.position.y = Math.sin(time * 0.6) * 0.03;
        drifting.rotation.y = time * 0.05;
        flames.forEach((flame, i) => { const f = 1 + Math.sin(time * (9 + i) + i * 2) * mix(0.05, 0.3, energy); flame.scale.set(1, f, 1); });
      },
    });
  },
});
