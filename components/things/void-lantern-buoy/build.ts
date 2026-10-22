import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    design: choice('What kind of buoy is it?', {
      cage: 'A fat drum float with a short lattice tower and a caged lantern on top, like a harbour buoy.',
      tetra: 'An open tetrahedral frame of struts and reflector plates with the lamp at its heart.',
      bell: 'A bell buoy: an open tower with a bronze bell and clapper hanging inside, the lamp above.',
      spar: 'A tall thin spar, a striped pole with a small lamp and a topmark.',
    }),
    lamp: choice('What colour is the lamp?', {
      red: 'Port red.',
      green: 'Starboard green.',
      amber: 'Warm amber, like a window.',
      white: 'Cold white.',
      violet: 'A strange blue-violet.',
    }),
    state: choice('How is the light holding up?', {
      steady: 'Still lit and regular: a slow, patient blink.',
      double: 'A quick double flash, then a long dark pause.',
      guttering: 'Guttering: dim, uneven, close to going out.',
      ember: 'Almost dead: only a dull ember left in the glass.',
    }),
    warns: choice('What does it mark or warn of?', {
      lane: 'The edge of a lane: a plain painted number.',
      wreck: 'A wreck: black and red bands and two black balls on top.',
      edge: 'The end of the chart: yellow, with a cross on top.',
      harbour: 'The way home: a white band and a cone pointing up.',
      nothing: 'Nothing any more: the paint and the placard have worn blank.',
    }),
    petals: choice('How many solar petals does it still have?', {
      none: 'None: only torn hinge stubs.',
      one: 'One, angled hopefully.',
      two: 'Two, like small wings.',
      four: 'All four, opened like a flower.',
    }),
    gathered: choice('What has gathered on it?', {
      nothing: 'Nothing.',
      chain: 'A length of broken mooring chain trailing from its base.',
      ice: 'A crust of ice crystals, like barnacles.',
      ribbons: 'Faded ribbons and tokens tied on by passing crews.',
      nest: 'A small probe that has docked on it and gone to sleep.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const buoy = new THREE.Group();
    s.root.add(buoy);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: V3 = [0, 0, 0], parent: THREE.Object3D = buoy) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const rod = (from: V3, to: V3, radius: number, material: THREE.Material, parent: THREE.Object3D = buoy) => { const m = s.rod(from, to, radius, material); parent.add(m); return m; };

    const rust = new THREE.Color('#7b4a2c');
    const worn = (hex: string, extra: THREE.MeshStandardMaterialParameters = {}) => s.material(new THREE.Color(hex).lerp(rust, mood.wear * 0.45), { roughness: 0.7, ...extra });
    const scheme = { lane: ['#b8342c', '#b8342c'], wreck: ['#22252a', '#b8342c'], edge: ['#e3b322', '#e3b322'], harbour: ['#2f7d5c', '#ece8dc'], nothing: ['#8d8e88', '#9b9a90'] }[a.warns];
    if (a.warns === 'lane' && a.lamp === 'green') scheme[0] = scheme[1] = '#2f7d5c';
    const paintA = worn(scheme[0]), paintB = worn(scheme[1]);
    const iron = worn('#4a4f55', { metalness: 0.6, roughness: 0.5 });
    const steel = worn('#a9afb5', { metalness: 0.8, roughness: 0.35 });
    const dark = s.material('#1f2328', { roughness: 0.6 });

    const lampHex = { red: '#ff3b2f', green: '#35e089', amber: '#ffb347', white: '#f3f6ff', violet: '#8f7bff' }[a.lamp];
    const glassMat = new THREE.MeshStandardMaterial({ color: lampHex, emissive: lampHex, emissiveIntensity: 2.5, roughness: 0.3 });
    const haloMat = new THREE.MeshBasicMaterial({ color: lampHex, transparent: true, opacity: 0.28, depthWrite: false });
    const halo2Mat = new THREE.MeshBasicMaterial({ color: lampHex, transparent: true, opacity: 0.12, depthWrite: false });

    /** Lantern with a wire cage and a cap; origin at its base. */
    const lantern = (at: V3, size: number, parent: THREE.Object3D = buoy) => {
      const g = new THREE.Group();
      g.position.set(...at);
      g.scale.setScalar(size);
      parent.add(g);
      add(new THREE.CylinderGeometry(0.2, 0.24, 0.1, 16), iron, [0, 0.05, 0], g);
      add(new THREE.CylinderGeometry(0.13, 0.15, 0.3, 16), glassMat, [0, 0.25, 0], g);
      for (let i = 0; i < 4; i++) add(new THREE.TorusGeometry(0.152 - i * 0.004, 0.012, 6, 20), glassMat, [0, 0.14 + i * 0.07, 0], g).rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) { const ang = (i / 8) * Math.PI * 2; const bar = s.rod([Math.cos(ang) * 0.2, 0.1, Math.sin(ang) * 0.2], [Math.cos(ang) * 0.19, 0.42, Math.sin(ang) * 0.19], 0.011, iron); g.add(bar); }
      add(new THREE.TorusGeometry(0.2, 0.012, 6, 24), iron, [0, 0.26, 0], g).rotation.x = Math.PI / 2;
      add(new THREE.ConeGeometry(0.23, 0.14, 16), iron, [0, 0.49, 0], g);
      add(new THREE.SphereGeometry(0.03, 8, 6), iron, [0, 0.57, 0], g);
      add(new THREE.SphereGeometry(0.42, 20, 14), haloMat, [0, 0.26, 0], g);
      add(new THREE.SphereGeometry(0.8, 20, 14), halo2Mat, [0, 0.26, 0], g);
      return g;
    };
    const topmark = (y: number, parent: THREE.Object3D = buoy) => {
      if (a.warns === 'wreck') { for (const dy of [0.12, 0.38]) add(new THREE.SphereGeometry(0.12, 14, 10), dark, [0, y + dy, 0], parent); rod([0, y, 0], [0, y + 0.5, 0], 0.015, iron, parent); }
      else if (a.warns === 'edge') { rod([0, y, 0], [0, y + 0.22, 0], 0.015, iron, parent); for (const z of [-1, 1]) { const arm = add(new THREE.BoxGeometry(0.4, 0.06, 0.03), paintA, [0, y + 0.3, 0], parent); arm.rotation.z = (z * Math.PI) / 4; } }
      else if (a.warns === 'harbour') { rod([0, y, 0], [0, y + 0.1, 0], 0.015, iron, parent); add(new THREE.ConeGeometry(0.15, 0.3, 14), paintA, [0, y + 0.25, 0], parent); }
    };
    const placard = (at: V3, width: number, parent: THREE.Object3D = buoy) => {
      const text = { lane: String(1 + Math.floor(random() * 98)), wreck: 'WRECK', edge: 'END OF CHART', harbour: 'HARBOUR', nothing: '' }[a.warns];
      const plate = s.label(text, width, width * 0.42, at, '#1f2328', a.warns === 'nothing' ? '#a8a69b' : '#ece8dc');
      parent.add(plate);
      add(new THREE.BoxGeometry(width + 0.05, width * 0.42 + 0.05, 0.02), iron, [at[0], at[1], at[2] - 0.012], parent);
      return plate;
    };

    let swing: THREE.Group | null = null;
    let lampTop = 0, petalAt: V3 = [0, 1.5, 0], petalReach = 0.3, baseY = 0, girth = 0.7;
    if (a.design === 'cage' || a.design === 'bell') {
      // Drum float: keel cone, striped drum, sloped deck.
      add(new THREE.CylinderGeometry(0.72, 0.3, 0.45, 28), paintA, [0, 0.225, 0]);
      add(new THREE.CylinderGeometry(0.74, 0.74, 0.3, 28), paintB, [0, 0.6, 0]);
      add(new THREE.CylinderGeometry(0.72, 0.74, 0.25, 28), paintA, [0, 0.875, 0]);
      add(new THREE.CylinderGeometry(0.42, 0.72, 0.18, 28), iron, [0, 1.09, 0]);
      for (const y of [0.45, 0.75, 1.0]) add(new THREE.TorusGeometry(0.745, 0.022, 6, 32), iron, [0, y, 0]).rotation.x = Math.PI / 2;
      add(new THREE.CylinderGeometry(0.12, 0.16, 0.3, 12), iron, [0, -0.13, 0]);
      add(new THREE.TorusGeometry(0.09, 0.025, 6, 16), iron, [0, -0.33, 0]);
      for (let i = 0; i < 4; i++) { const ang = (i / 4) * Math.PI * 2 + 0.4; add(new THREE.TorusGeometry(0.07, 0.016, 6, 12, Math.PI), iron, [Math.cos(ang) * 0.55, 1.1, Math.sin(ang) * 0.55]).rotation.y = -ang + Math.PI / 2; }
      placard([0, 0.66, 0.775], 0.62);
      const towerTop = a.design === 'bell' ? 2.55 : 2.05;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI / 4, next = ang + Math.PI / 2;
        const foot: V3 = [Math.cos(ang) * 0.5, 1.15, Math.sin(ang) * 0.5], head: V3 = [Math.cos(ang) * 0.2, towerTop, Math.sin(ang) * 0.2];
        rod(foot, head, 0.028, iron);
        const lerp = (k: number, an: number): V3 => [Math.cos(an) * mix(0.5, 0.2, k), mix(1.15, towerTop, k), Math.sin(an) * mix(0.5, 0.2, k)];
        if (a.design === 'cage') { rod(lerp(0.05, ang), lerp(0.5, next), 0.014, iron); rod(lerp(0.5, ang), lerp(0.95, next), 0.014, iron); }
        rod(lerp(0.5, ang), lerp(0.5, next), 0.016, iron);
      }
      add(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 20), iron, [0, towerTop, 0]);
      if (a.design === 'bell') {
        const bronze = worn('#a8782f', { metalness: 0.85, roughness: 0.4 });
        const bell = new THREE.Group();
        bell.position.set(0, 2.5, 0);
        buoy.add(bell);
        const profile: [number, number][] = [[0.03, 0], [0.12, -0.02], [0.2, -0.12], [0.24, -0.36], [0.3, -0.56], [0.38, -0.66], [0.36, -0.68], [0.27, -0.56]];
        const shell = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 28), bronze);
        (shell.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        shell.castShadow = true;
        bell.add(shell);
        rod([0, 0.06, 0], [0, 0, 0], 0.03, iron, bell);
        const clapper = new THREE.Group();
        clapper.rotation.z = 0.32;
        bell.add(clapper);
        rod([0, -0.05, 0], [0, -0.62, 0], 0.014, iron, clapper);
        add(new THREE.SphereGeometry(0.07, 12, 8), iron, [0, -0.66, 0], clapper);
        swing = clapper;
      }
      lantern([0, towerTop + 0.025, 0], 1.3);
      lampTop = towerTop + 0.8;
      petalAt = [0, a.design === 'bell' ? 1.2 : 1.55, 0]; petalReach = a.design === 'bell' ? 0.68 : 0.42;
      baseY = -0.4; girth = 0.74;
    } else if (a.design === 'tetra') {
      const E = 1.3, verts: V3[] = [[0, 2.5, 0], [E, 0.55, E * 0.58], [-E, 0.55, E * 0.58], [0, 0.55, -E * 1.15]];
      for (let i = 0; i < 4; i++) for (let k = i + 1; k < 4; k++) rod(verts[i], verts[k], 0.035, iron);
      for (const v of verts) add(new THREE.SphereGeometry(0.075, 12, 8), steel, v);
      // Reflector plates: three triangles meeting at the centre, like a radar corner.
      const centre: V3 = [0, 1.05, 0];
      const plateMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c3c9cf').lerp(rust, mood.wear * 0.3), metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide });
      const tri = (p: V3, q: V3, r: V3, material: THREE.Material) => { const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute([...p, ...q, ...r], 3)); geometry.computeVertexNormals(); return add(geometry, material); };
      const shrink = (v: V3, k: number): V3 => [mix(centre[0], v[0], k), mix(centre[1], v[1], k), mix(centre[2], v[2], k)];
      tri(centre, shrink(verts[1], 0.86), shrink(verts[2], 0.86), plateMat);
      tri(centre, shrink(verts[2], 0.86), shrink(verts[3], 0.86), plateMat);
      tri(centre, shrink(verts[3], 0.86), shrink(verts[1], 0.86), plateMat);
      const band = new THREE.MeshStandardMaterial({ color: paintA.color, roughness: 0.7, side: THREE.DoubleSide });
      tri(shrink(verts[1], 0.86), shrink(verts[2], 0.86), [0, 0.56, E * 0.5], band);
      add(new THREE.SphereGeometry(0.3, 18, 12), paintB, [0, 1.15, 0]);
      add(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 14), iron, [0, 1.5, 0]);
      rod([0, 1.7, 0], [0, 2.5, 0], 0.03, iron);
      placard([0, 0.75, E * 0.58 + 0.04], 0.6);
      lantern([0, 2.55, 0], 0.9);
      lampTop = 3.08;
      petalAt = [0, 1.55, 0]; petalReach = 0.26; baseY = 0.5; girth = 0.3;
    } else {
      // Spar: a long striped pole with a float collar.
      const bands = 7;
      for (let i = 0; i < bands; i++) add(new THREE.CylinderGeometry(0.2, 0.2, 3.0 / bands, 18), i % 2 ? paintB : paintA, [0, 0.2 + (i + 0.5) * (3.0 / bands), 0]);
      add(new THREE.ConeGeometry(0.2, 0.4, 18), iron, [0, 0, 0]).rotation.x = Math.PI;
      add(new THREE.CylinderGeometry(0.2, 0.48, 0.3, 20), paintA, [0, 1.05, 0]);
      add(new THREE.CylinderGeometry(0.48, 0.48, 0.28, 20), paintB, [0, 0.76, 0]);
      add(new THREE.CylinderGeometry(0.48, 0.2, 0.3, 20), paintA, [0, 0.47, 0]);
      add(new THREE.TorusGeometry(0.07, 0.02, 6, 14), iron, [0, -0.25, 0]);
      add(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 18), iron, [0, 3.22, 0]);
      placard([0, 2.3, 0.22], 0.44);
      lantern([0, 3.24, 0], 0.72);
      lampTop = 3.68;
      petalAt = [0, 2.75, 0]; petalReach = 0.22; baseY = -0.3; girth = 0.48;
    }
    topmark(lampTop);

    // Solar petals on hinged arms; missing ones leave a stub.
    const cell = new THREE.MeshStandardMaterial({ color: '#1e3566', metalness: 0.5, roughness: 0.3, emissive: '#16306a', emissiveIntensity: 0.35 });
    const kept = { none: 0, one: 1, two: 2, four: 4 }[a.petals];
    const order = a.petals === 'two' ? [0, 2] : [0, 1, 2, 3];
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + (a.design === 'tetra' ? Math.PI / 3 : 0);
      const arm = new THREE.Group();
      arm.position.set(petalAt[0] + Math.cos(ang) * petalReach, petalAt[1], petalAt[2] + Math.sin(ang) * petalReach);
      arm.rotation.y = -ang;
      buoy.add(arm);
      add(new THREE.BoxGeometry(0.1, 0.06, 0.08), iron, [0, 0, 0], arm);
      if (order.indexOf(i) < 0 || order.indexOf(i) >= kept) { rod([0, 0, 0], [0.12 + random() * 0.1, 0.03, random() * 0.05], 0.012, iron, arm); continue; }
      const leaf = new THREE.Group();
      leaf.rotation.z = mix(0.45, -0.5, mood.wear) + (random() - 0.5) * 0.4;
      arm.add(leaf);
      rod([0, 0, 0], [0.2, 0, 0], 0.014, iron, leaf);
      add(new THREE.BoxGeometry(0.85, 0.025, 0.5), steel, [0.62, 0, 0], leaf);
      add(new THREE.BoxGeometry(0.8, 0.012, 0.45), cell, [0.62, 0.016, 0], leaf);
      for (let k = 1; k < 4; k++) add(new THREE.BoxGeometry(0.01, 0.014, 0.45), steel, [0.22 + k * 0.2, 0.017, 0], leaf);
      add(new THREE.BoxGeometry(0.8, 0.014, 0.01), steel, [0.62, 0.017, 0], leaf);
    }

    // Antenna: straighter when new, kinked when worn.
    const mastFrom: V3 = [a.design === 'tetra' ? 0.25 : 0.24 * (a.design === 'spar' ? 0.8 : 1), lampTop - 0.55, -0.1];
    const kink: V3 = [mastFrom[0] + 0.05, mastFrom[1] + 0.55, mastFrom[2]];
    const bend = mix(0.1, 1.3, mood.wear) + random() * 0.3;
    rod(mastFrom, kink, 0.012, steel);
    rod(kink, [kink[0] + Math.sin(bend) * 0.6, kink[1] + Math.cos(bend) * 0.6, kink[2] - Math.sin(bend) * 0.2], 0.009, steel);
    add(new THREE.SphereGeometry(0.022, 8, 6), steel, kink);

    // Whatever has gathered.
    if (a.gathered === 'chain') {
      const linkMat = iron;
      let p = new THREE.Vector3(0, baseY - 0.02, 0);
      const drift = new THREE.Vector3(random() < 0.5 ? -0.7 : 0.7, -0.8, 0.4).normalize();
      for (let i = 0; i < 9; i++) {
        drift.x += (random() - 0.5) * 0.4; drift.z += (random() - 0.5) * 0.4; drift.y += 0.16; drift.normalize();
        p = p.clone().addScaledVector(drift, 0.115);
        const link = add(new THREE.TorusGeometry(0.06, 0.017, 6, 12), linkMat, p.toArray() as V3);
        link.scale.set(0.7, 1.15, 1);
        link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), drift);
        link.rotateY(i % 2 ? Math.PI / 2 : 0);
      }
    } else if (a.gathered === 'ice') {
      const crystals = Array.from({ length: 130 }, () => { const ang = random() * Math.PI * 2, y = baseY + 0.4 + random() ** 1.6 * (lampTop - baseY - 0.9), r = (y < 1.15 ? girth : 0.22) * (1 + random() * 0.08); return { at: [Math.cos(ang) * r, y, Math.sin(ang) * r] as V3, size: 0.014 + random() ** 2 * 0.034 }; });
      buoy.add(s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#eaf4fa', roughness: 0.35, flatShading: true }), crystals));
    } else if (a.gathered === 'ribbons') {
      const hues = ['#d94a5a', '#f0c23c', '#4a8fd9', '#ece8dc', '#7fc98a', '#c887d6'];
      for (let i = 0; i < 9; i++) {
        const ang = random() * Math.PI * 2, y = a.design === 'spar' ? 1.4 + random() * 1.6 : 1.3 + random() * (lampTop - 2), r = a.design === 'spar' ? 0.21 : a.design === 'tetra' ? 0.3 : mix(0.46, 0.22, (y - 1.15) / 1);
        const from = new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r);
        const pts = [from]; const away = new THREE.Vector3(Math.cos(ang + 1) * 0.5, -0.25 + random() * 0.5, Math.sin(ang + 1) * 0.5);
        for (let k = 1; k <= 4; k++) pts.push(from.clone().addScaledVector(away, k * 0.14).add(new THREE.Vector3((random() - 0.5) * 0.12, (random() - 0.5) * 0.12, (random() - 0.5) * 0.12)));
        const ribbon = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.024, 4), new THREE.MeshStandardMaterial({ color: new THREE.Color(hues[i % hues.length]).lerp(new THREE.Color('#9c968a'), mood.wear * 0.6), roughness: 0.9 }));
        ribbon.scale.y = 1;
      }
    } else if (a.gathered === 'nest') {
      const probe = new THREE.Group();
      const side = a.design === 'spar' ? 0.34 : a.design === 'tetra' ? 0.5 : 0.5;
      probe.position.set(-side, a.design === 'spar' ? 1.35 : a.design === 'tetra' ? 1.5 : 1.32, 0.22);
      probe.rotation.set(0.2, 0.6, 0.3);
      buoy.add(probe);
      add(new THREE.BoxGeometry(0.3, 0.2, 0.22), s.material('#d9c58a', { metalness: 0.6, roughness: 0.4 }), [0, 0, 0], probe);
      add(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: '#10161d', roughness: 0.2 }), [0.1, 0.02, 0.11], probe);
      for (const z of [-1, 1]) add(new THREE.BoxGeometry(0.2, 0.012, 0.3), cell, [0, 0.08, z * 0.27], probe).rotation.x = z * 0.5;
      const dish = add(new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, 0, 1.1), steel, [-0.08, 0.2, 0], probe);
      dish.rotation.x = Math.PI; (dish.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      add(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshStandardMaterial({ color: '#4fd8ff', emissive: '#4fd8ff', emissiveIntensity: 1.2 }), [0.15, 0.08, 0.06], probe);
    }

    const lean = (0.12 + random() * 0.22) * (random() < 0.5 ? -1 : 1);
    buoy.rotation.set((random() - 0.5) * 0.2, random() * 0.6 - 0.1, lean);
    const period = { steady: mix(4.2, 1.6, mood.energy), double: mix(5, 2.4, mood.energy), guttering: 1, ember: 1 }[a.state];
    const bright = mix(1.8, 3.4, mood.cheer);
    const shine = (level: number) => {
      glassMat.emissiveIntensity = 0.06 + level * bright;
      haloMat.opacity = level * 0.3;
      halo2Mat.opacity = level * 0.13;
    };
    const levelAt = (time: number) => {
      const t = (time % period) / period;
      if (a.state === 'steady') return t < 0.42 ? 1 : 0.02;
      if (a.state === 'double') return t < 0.12 || (t > 0.2 && t < 0.32) ? 1 : 0.02;
      if (a.state === 'guttering') return 0.28 + 0.22 * Math.sin(time * 9.1) * Math.sin(time * 3.7) + (Math.sin(time * 23) > 0.9 ? 0.4 : 0);
      return 0.07 + 0.03 * Math.sin(time * 1.3);
    };
    shine(levelAt(0));
    let clock = 0;
    const sway = mix(0.01, 0.07, mood.energy);
    return s.finish({
      update: (dt) => {
        clock += dt;
        shine(Math.max(0, levelAt(clock)));
        buoy.rotation.z = lean + Math.sin(clock * 0.7) * sway;
        if (swing) swing.rotation.z = Math.sin(clock * 1.9) * mix(0.15, 0.45, mood.energy);
      },
    });
  },
});
