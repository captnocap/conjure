import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

/** A small speckled canvas so big plain surfaces read as dusty regolith rather than plastic. */
function speckle(random: () => number, base: string, dark: string, light: string, bands = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = i % 2 ? dark : light;
    ctx.globalAlpha = 0.22;
    ctx.fillRect(0, (i / bands) * 128, 128, 1.6);
  }
  for (let i = 0; i < 700; i++) {
    ctx.globalAlpha = 0.15 + random() * 0.3;
    ctx.fillStyle = random() < 0.5 ? dark : light;
    const size = 1 + random() * 2.5;
    ctx.fillRect(random() * 128, random() * 128, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const MARKS = { none: '', hab: 'HAB-1', home: 'HOME', outpost: 'OUTPOST 7', keepout: 'KEEP SEALED', sol: 'SOL 1482' } as const;

export default defineThing({
  questions: {
    era: choice('What kind of habitat is it?', {
      pulp: 'A 1950s pulp-magazine glass bubble on a chrome ring with fins, the whole living room on show.',
      printed: 'A 3D-printed beehive shell of layered regolith, ribbed like a coiled clay pot.',
      can: 'A flown-in tuna-can pressure module, white metal with regolith bulldozed up its sides.',
      buried: 'A raw mound of piled rubble with only the hatch and a window poking out, a burrow more than a building.',
    }),
    life: choice('What signs of life show from inside?', {
      lit: 'A warm yellow light in the porthole: someone is home.',
      garden: 'Green leaves pressed against the glass, lit violet-green by grow lamps.',
      suit: 'A dusty pressure suit and boots left standing by the airlock door.',
      beacon: 'Nothing but a red beacon blinking on the roof.',
      dark: 'Dark glass and a drift of sand against the hatch: nobody has opened it in a long time.',
    }),
    airlock: choice('What is the airlock like?', {
      stub: 'A short blunt hatch barely proud of the wall.',
      tube: 'A long ribbed tunnel ending in a round wheel-locked door.',
      dock: 'A wide collar with hazard stripes and a ramp, built for a rover to back up to.',
    }),
    antenna: choice('What stands on the roof?', {
      whip: 'A thin whip aerial held by guy wires.',
      dish: 'A dish on a short mast, tilted at the sky.',
      mast: 'A lattice weather mast with spinning wind cups.',
      snapped: 'A mast bent over at the root, its dish fallen in the dust.',
    }),
    sandbags: score('How much has been heaped against the base?', ['Nothing, bare footing', 'A single ring of sandbags', 'Stacked rows of sandbags', 'Bags and drifted regolith halfway up the wall']),
    marking: choice('What is stencilled on the airlock, if anything?', {
      none: 'Nothing, bare metal.',
      hab: 'HAB-1',
      home: 'HOME',
      outpost: 'OUTPOST 7',
      keepout: 'KEEP SEALED',
      sol: 'SOL 1482',
    }),
    panels: noul('Is there a solar panel array staked out beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dust = new THREE.Color('#b9683d').lerp(new THREE.Color('#d39a5e'), mood.warmth * 0.5);
    const dustHex = `#${dust.getHexString()}`;
    const regolith = s.material('#ffffff', { map: speckle(random, dustHex, '#6e3a22', '#e0a877', a.era === 'printed' ? 26 : 0), roughness: 0.95 });
    const soil = s.material(dustHex, { roughness: 1 });
    const white = s.material(new THREE.Color('#e9e4d8').lerp(dust, mood.wear * 0.45), { roughness: 0.55, metalness: 0.15 });
    const chrome = s.material('#cfd6d8', { metalness: 0.85, roughness: 0.25 });
    const dark = s.material('#2c2a2b', { roughness: 0.7 });
    const hazard = s.material('#e0a11c', { roughness: 0.6 });
    const bag = s.material(new THREE.Color('#c9b48c').lerp(dust, 0.25 + mood.wear * 0.4), { roughness: 1 });
    const glowing = a.life === 'lit' || a.life === 'garden' || a.life === 'suit';
    const windowColour = a.life === 'garden' ? '#9cff7a' : a.life === 'lit' ? '#ffd27a' : a.life === 'suit' ? '#c9b98a' : '#1b2228';
    const glass = s.material(windowColour, {
      emissive: glowing ? windowColour : '#000000',
      emissiveIntensity: a.life === 'suit' ? 0.25 : mix(0.7, 1.5, 1 - Math.abs(mood.daylight - 0.5) * 0 + mood.cheer * 0.3),
      roughness: 0.2,
    });

    // The shell: each era is a radius-by-height profile so fittings can find the wall.
    const R = 3.6;
    const top = { pulp: 4.5, printed: 4.3, can: 3.7, buried: 2.7 }[a.era];
    const radiusAt = (y: number): number => {
      if (a.era === 'pulp') return y < 0.9 ? R + 0.12 : Math.sqrt(Math.max(R * R - (y - 0.9) ** 2, 0));
      if (a.era === 'printed') return R * Math.sqrt(Math.max(1 - (y / top) ** 2.6, 0));
      if (a.era === 'can') return y < 2.9 ? 2.9 : 2.9 * Math.sqrt(Math.max(1 - ((y - 2.9) / 0.8) ** 2, 0));
      return R * 1.12 * Math.sqrt(Math.max(1 - (y / top) ** 2, 0));
    };
    const shell = (ripple: number, material: THREE.Material, from = 0, to = top, grow = 0) => {
      const points: [number, number][] = [];
      for (let i = 0; i <= 56; i++) {
        const y = mix(from, to, i / 56);
        points.push([Math.max(radiusAt(y) + grow + (i % 2 ? ripple : 0), 0.001), y]);
      }
      return s.lathe(points, material);
    };

    if (a.era === 'pulp') {
      s.cylinder(R + 0.12, R + 0.3, 0.9, [0, 0.45, 0], chrome, 40);
      s.ring(R + 0.14, 0.09, [0, 0.9, 0], dark).rotation.x = Math.PI / 2;
      const bubble = new THREE.MeshPhysicalMaterial({ color: '#cfeee8', transparent: true, opacity: 0.26, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
      s.mesh(new THREE.SphereGeometry(R, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), bubble, [0, 0.9, 0]);
      // Meridian ribs make the bubble read even where the glass washes out.
      for (let i = 0; i < 6; i++) {
        const rib = s.ring(R, 0.045, [0, 0.9, 0], chrome, Math.PI);
        rib.rotation.y = (i / 6) * Math.PI;
      }
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2 + Math.PI / 4;
        const fin = s.box([0.12, 1.5, 1.3], [Math.sin(angle) * (R + 0.6), 0.75, Math.cos(angle) * (R + 0.6)], chrome);
        fin.rotation.y = angle;
        fin.geometry.translate(0, 0, 0);
      }
      // The living room on show.
      s.cylinder(R - 0.15, R - 0.15, 0.08, [0, 0.94, 0], s.material('#7d5a48'), 32);
      s.cylinder(0.16, 0.22, 3.4, [0, 2.6, 0], chrome, 12);
      s.box([1.5, 0.5, 0.7], [-1.3, 1.25, 0.9], s.material('#b8493a'));
      s.box([1.5, 0.6, 0.18], [-1.3, 1.7, 0.6], s.material('#b8493a'));
      s.cylinder(0.5, 0.5, 0.06, [1.3, 1.5, 0.8], white, 18);
      s.cylinder(0.05, 0.05, 0.55, [1.3, 1.22, 0.8], chrome, 8);
      if (glowing) s.ball([0.28, 0.28, 0.28], [0, 3.6, 0], glass, 14);
      if (a.life === 'garden') {
        const leaf = s.material('#4f9b3f', { emissive: '#2c6b22', emissiveIntensity: 0.4 });
        s.scatter(new THREE.IcosahedronGeometry(1, 0), leaf, Array.from({ length: 26 }, () => {
          const angle = random() * Math.PI * 2, r = 1 + random() * 2.1;
          return { at: [Math.sin(angle) * r, 1.15 + random() * 0.9, Math.cos(angle) * r] as const, size: 0.22 + random() * 0.3 };
        }));
      }
    } else if (a.era === 'printed') {
      shell(0.07, regolith);
      s.cylinder(0.45, 0.6, 0.25, [0, top - 0.02, 0], dark, 16);
    } else if (a.era === 'can') {
      shell(0, white);
      for (const y of [0.9, 1.9, 2.9]) s.ring(2.92, 0.06, [0, y, 0], chrome).rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + 0.2;
        s.box([0.1, 2.9, 0.08], [Math.sin(angle) * 2.93, 1.45, Math.cos(angle) * 2.93], white).rotation.y = angle;
      }
      // Regolith bulldozed up the sides.
      s.lathe([[5, 0], [4.3, 0.5], [3.4, 1.2], [2.85, 1.5 + random() * 0.3]], regolith);
    } else {
      const mound = shell(0, regolith);
      const position = mound.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        const wobble = 1 + Math.sin(position.getX(i) * 2.1 + position.getY(i) * 3.3) * 0.05 + Math.sin(position.getZ(i) * 2.7) * 0.05;
        position.setXYZ(i, position.getX(i) * wobble, position.getY(i), position.getZ(i) * wobble);
      }
      mound.geometry.computeVertexNormals();
      const rock = s.material('#ffffff', { roughness: 1 });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), rock, Array.from({ length: 34 }, () => {
        const angle = random() * Math.PI * 2, y = random() * top * 0.85;
        const r = radiusAt(y) * 1.02;
        return { at: [Math.sin(angle) * r, y, Math.cos(angle) * r] as const, size: 0.18 + random() * 0.3, color: random() < 0.5 ? '#7a4a36' : '#9c5f3e' };
      }));
    }

    // Porthole on the front wall, a little to one side.
    const portY = { pulp: 0.5, printed: 1.9, can: 2.3, buried: 1.3 }[a.era];
    const portAngle = -0.5;
    const portR = radiusAt(portY) + (a.era === 'buried' ? 0.25 : 0.03);
    const port = new THREE.Group();
    port.position.set(Math.sin(portAngle) * portR, portY, Math.cos(portAngle) * portR);
    port.rotation.y = portAngle;
    if (a.era !== 'pulp') {
      const slope = Math.atan2(radiusAt(portY - 0.3) - radiusAt(portY + 0.3), 0.6);
      port.rotation.x = -slope * 0.8;
    }
    s.root.add(port);
    const size = a.era === 'pulp' ? 0.28 : 0.52;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(size, 0.1, 10, 28), a.era === 'printed' || a.era === 'buried' ? dark : chrome);
    const pane = new THREE.Mesh(new THREE.CylinderGeometry(size, size, 0.12, 24), glass);
    pane.rotation.x = Math.PI / 2;
    rim.castShadow = pane.castShadow = true;
    port.add(rim, pane);
    if (a.era === 'buried') {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(size + 0.08, size + 0.08, 0.7, 20), dark);
      sleeve.rotation.x = Math.PI / 2;
      sleeve.position.z = -0.35;
      port.add(sleeve);
    }
    if (a.life === 'garden' && a.era !== 'pulp') {
      const leaf = new THREE.MeshStandardMaterial({ color: '#2f7a2a', roughness: 0.8 });
      for (let i = 0; i < 5; i++) {
        const blade = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), leaf);
        blade.scale.set(0.6, 1.3, 0.2);
        blade.position.set((random() - 0.5) * 0.6, -0.25 + random() * 0.3, 0.07);
        blade.rotation.z = (random() - 0.5) * 1.2;
        port.add(blade);
      }
    }

    // Airlock runs out along +x.
    const lockY = 1.15, lockR = a.airlock === 'dock' ? 1.3 : 1.05;
    const inner = Math.max(radiusAt(lockY) - 0.6, 0.5);
    const length = { stub: 0.9, tube: 3.4, dock: 1.9 }[a.airlock] + (a.era === 'can' ? 1.6 : 0);
    const end = radiusAt(lockY) + length;
    const tube = s.cylinder(lockR, lockR, end - inner, [(inner + end) / 2, lockY, 0], white, 24);
    tube.rotation.z = Math.PI / 2;
    const ribs = a.airlock === 'tube' ? 7 : a.airlock === 'dock' ? 2 : 1;
    for (let i = 0; i < ribs; i++) {
      const x = mix(radiusAt(lockY) + 0.25, end - 0.12, ribs === 1 ? 1 : i / (ribs - 1));
      const rib = s.ring(lockR + 0.03, a.airlock === 'tube' ? 0.09 : 0.13, [x, lockY, 0], a.airlock === 'dock' && i === ribs - 1 ? hazard : chrome);
      rib.rotation.y = Math.PI / 2;
    }
    const door = s.cylinder(lockR * 0.82, lockR * 0.82, 0.14, [end + 0.02, lockY, 0], s.material('#8d949a', { metalness: 0.5, roughness: 0.45 }), 24);
    door.rotation.z = Math.PI / 2;
    s.ring(0.32, 0.045, [end + 0.14, lockY, 0], dark).rotation.y = Math.PI / 2;
    s.box([0.06, 0.05, 0.62], [end + 0.14, lockY, 0], dark);
    s.box([0.06, 0.62, 0.05], [end + 0.14, lockY, 0], dark);
    s.box([end - inner, 0.5, lockR * 1.7], [(inner + end) / 2, 0.02, 0], dark);
    if (a.airlock === 'dock') {
      const ramp = s.box([2.2, 0.1, 1.9], [end + 1.05, 0.22, 0], s.material('#7d8085', { metalness: 0.5 }));
      ramp.rotation.z = -0.19;
      for (let i = 0; i < 6; i++) s.box([0.08, 0.04, 1.9], [end + 0.25 + i * 0.36, 0.44 - i * 0.068, 0], hazard).rotation.z = -0.19;
    } else s.box([0.7, 0.14, 1.1], [end + 0.4, 0.07, 0], dark);
    if (a.marking !== 'none') {
      const plate = s.label(MARKS[a.marking], Math.min(end - radiusAt(lockY) - 0.3, 2.2), 0.42, [(radiusAt(lockY) + end) / 2 + 0.1, lockY + 0.25, lockR * 0.97], '#30302e', '#e7dfcb');
      plate.rotation.x = -0.25;
      plate.castShadow = false;
    }
    if (a.life === 'dark') {
      const drift = s.ball([1.3, 0.6, 1.2], [end + 0.35, 0, 0.1], soil, 14);
      drift.rotation.y = random();
    }
    if (a.life === 'suit') {
      const suit = s.material(new THREE.Color('#e8e2d2').lerp(dust, 0.3 + mood.wear * 0.3));
      const sx = end + 0.35, sz = lockR + 0.55;
      for (const dz of [-0.14, 0.14]) {
        s.box([0.2, 0.75, 0.2], [sx, 0.47, sz + dz], suit);
        s.box([0.3, 0.14, 0.24], [sx + 0.04, 0.07, sz + dz], dark);
        s.rod([sx, 1.4, sz + dz * 2.3], [sx + 0.05, 0.85, sz + dz * 2.9], 0.085, suit);
      }
      s.box([0.36, 0.62, 0.52], [sx, 1.15, sz], suit);
      s.box([0.2, 0.5, 0.42], [sx - 0.26, 1.2, sz], white);
      s.ball([0.24, 0.25, 0.24], [sx, 1.68, sz], suit, 14);
      s.ball([0.17, 0.16, 0.19], [sx + 0.11, 1.69, sz], s.material('#c98a2b', { metalness: 0.8, roughness: 0.2 }), 12);
      s.rod([sx - 0.2, 0, sz - 0.5], [sx - 0.2, 1.95, sz - 0.5], 0.03, chrome);
    }

    // Roof fittings.
    const spinners: { node: THREE.Object3D; rate: number }[] = [];
    let beacon: THREE.MeshStandardMaterial | null = null;
    const apex = top + (a.era === 'pulp' ? 0 : 0.05);
    if (a.era === 'pulp') s.cylinder(0.3, 0.5, 0.3, [0, apex, 0], chrome, 16);
    if (a.antenna === 'whip') {
      s.rod([0, apex, 0], [0.15, apex + 3.4, 0], 0.045, dark, 0.012);
      s.ball([0.09, 0.09, 0.09], [0.15, apex + 3.4, 0], hazard, 10);
      for (let i = 0; i < 3; i++) {
        const angle = i * 2.094 + 0.4, y = top * 0.55;
        s.rod([0.07, apex + 1.7, 0], [Math.sin(angle) * radiusAt(y), y, Math.cos(angle) * radiusAt(y)], 0.012, dark);
      }
    } else if (a.antenna === 'dish') {
      s.rod([0, apex, 0], [0, apex + 1.3, 0], 0.07, chrome);
      const dish = new THREE.Group();
      const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0.02, 0], [0.4, 0.06], [0.75, 0.22], [1, 0.46]].map(([x, y]) => new THREE.Vector2(x, y)), 24), s.material('#e6e2d6', { side: THREE.DoubleSide, roughness: 0.5 }));
      const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), dark);
      feed.position.y = 0.4;
      bowl.castShadow = true;
      const tilt = new THREE.Group();
      tilt.rotation.z = -0.75;
      tilt.add(bowl, feed);
      dish.add(tilt);
      dish.position.set(0, apex + 1.3, 0);
      dish.rotation.y = random() * 6.28;
      s.root.add(dish);
      spinners.push({ node: dish, rate: 0.25 });
    } else if (a.antenna === 'mast') {
      for (let i = 0; i < 3; i++) {
        const angle = i * 2.094;
        s.rod([Math.sin(angle) * 0.35, apex - 0.15, Math.cos(angle) * 0.35], [Math.sin(angle) * 0.06, apex + 2.9, Math.cos(angle) * 0.06], 0.03, chrome);
      }
      for (let i = 1; i < 6; i++) s.ring(mix(0.33, 0.07, i / 6), 0.018, [0, apex + i * 0.48, 0], chrome).rotation.x = Math.PI / 2;
      const cups = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.02), dark);
        const cup = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), white);
        arm.position.x = 0.21; cup.position.x = 0.44;
        const spoke = new THREE.Group();
        spoke.rotation.y = i * 2.094;
        spoke.add(arm, cup);
        cups.add(spoke);
      }
      cups.position.set(0, apex + 3.0, 0);
      s.root.add(cups);
      spinners.push({ node: cups, rate: 3 });
      s.box([0.5, 0.26, 0.02], [0.3, apex + 2.5, 0], hazard);
    } else {
      s.rod([0, apex, 0], [0.1, apex + 0.7, 0], 0.07, chrome);
      s.rod([0.1, apex + 0.7, 0], [-1.6, apex + 0.25, -0.9], 0.06, chrome, 0.03);
      const fallenAngle = 2.2 + random() * 0.8, fr = R + 2.1;
      const fallen = s.lathe([[0.02, 0], [0.4, 0.06], [0.75, 0.22], [1, 0.46]], s.material('#d8d2c2', { side: THREE.DoubleSide }), [Math.sin(fallenAngle) * fr, 0.35, Math.cos(fallenAngle) * fr]);
      fallen.rotation.set(1.9, 0, 0.4);
    }
    if (a.life === 'beacon') {
      beacon = s.material('#ff3b2a', { emissive: '#ff2a18', emissiveIntensity: 2 });
      s.rod([-0.45, top - 0.25, 0.2], [-0.45, top + 0.55, 0.2], 0.04, dark);
      s.ball([0.19, 0.19, 0.19], [-0.45, top + 0.7, 0.2], beacon, 12);
    }

    // Sandbags and drifted regolith round the footing.
    const rows = Math.round(a.sandbags * 3);
    const footing = radiusAt(0.2) + (a.era === 'can' ? 2.1 : a.era === 'pulp' ? 0.3 : 0.05);
    const bags: { at: readonly [number, number, number]; size: number; color?: string }[] = [];
    for (let row = 0; row < rows; row++) {
      const r = footing + 0.25 - row * 0.12;
      const count = Math.floor((Math.PI * 2 * r) / 0.78);
      for (let i = 0; i < count; i++) {
        const angle = ((i + (row % 2) * 0.5) / count) * Math.PI * 2;
        if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)) - Math.PI / 2) < lockR / r + 0.08) continue;
        if (random() < mood.wear * 0.18) continue;
        bags.push({ at: [Math.sin(angle) * r, 0.13 + row * 0.24, Math.cos(angle) * r], size: 1, color: random() < 0.3 ? '#b59a72' : '#d1bd96' });
      }
    }
    if (bags.length) {
      const geometry = new THREE.SphereGeometry(0.42, 10, 7);
      geometry.scale(1, 0.34, 0.62);
      const mesh = new THREE.InstancedMesh(geometry, bag, bags.length);
      const dummy = new THREE.Object3D();
      bags.forEach((b, i) => {
        dummy.position.set(...b.at);
        dummy.rotation.set(0, Math.atan2(b.at[0], b.at[2]) + Math.PI / 2 + (random() - 0.5) * 0.3, (random() - 0.5) * 0.12);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, new THREE.Color(b.color));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    if (a.sandbags > 0.78 && a.era !== 'can') {
      const reach = footing + 1.5;
      s.lathe([[reach + 0.5, 0], [reach * 0.93, 0.3], [mix(radiusAt(1.5), reach, 0.4), 0.9], [radiusAt(1.5) - 0.05, 1.5]], regolith).rotation.y = random() * 6;
    }
    // Wind-drifted dust on the lee side grows with wear.
    if (mood.wear > 0.35) {
      const lee = s.ball([2.4, mix(0.2, 0.75, mood.wear), 1.5], [-footing * 0.8, 0, -footing * 0.62], soil, 16);
      lee.rotation.y = 0.5;
    }

    // Yard clutter.
    const clutter = Math.round(mix(0, 6, mood.density) + random());
    for (let i = 0; i < clutter; i++) {
      const angle = mix(-0.25, 1.1, random()) + (random() < 0.5 ? 0 : 0);
      const r = footing + 1.1 + random() * 1.2;
      const x = Math.sin(angle) * r, z = Math.cos(angle) * r;
      if (x > lockR * -1 && Math.abs(z) < lockR + 0.6 && x > 0) continue;
      if (random() < 0.5) {
        const crate = s.box([0.7, 0.55, 0.7], [x, 0.275, z], random() < 0.5 ? hazard : white);
        crate.rotation.y = random() * 3;
      } else {
        s.cylinder(0.22, 0.22, 1.2, [x, 0.6, z], s.material(random() < 0.5 ? '#3e7fa8' : '#b4b9bb', { metalness: 0.4 }), 14);
        s.ball([0.22, 0.14, 0.22], [x, 1.2, z], chrome, 12);
      }
    }
    if (a.panels) {
      const cell = s.material('#243a66', { metalness: 0.6, roughness: 0.3 });
      for (let i = 0; i < 3; i++) {
        const group = new THREE.Group();
        const face = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 1), cell);
        const grime = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.052, 1), soil);
        face.position.y = 0.75; face.rotation.x = 0.55;
        grime.position.copy(face.position); grime.rotation.copy(face.rotation);
        grime.scale.set(1, 1, mood.wear * 0.9 + 0.02);
        grime.position.z += 0.42 * (1 - grime.scale.z) * Math.cos(0.55);
        grime.position.y -= 0.42 * (1 - grime.scale.z) * Math.sin(0.55);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 6), chrome);
        leg.position.y = 0.37;
        face.castShadow = leg.castShadow = true;
        group.add(face, grime, leg);
        group.position.set(-footing - 1.4 + (random() - 0.5) * 0.2, 0, 2.6 - i * 1.3);
        group.rotation.y = -0.9 + (random() - 0.5) * 0.25;
        s.root.add(group);
      }
    }

    const speed = mix(0.3, 2.2, mood.energy);
    return s.finish({
      footprint: footing + 1.2,
      update: (dt, time) => {
        for (const spinner of spinners) spinner.node.rotation.y += dt * spinner.rate * speed;
        if (beacon) beacon.emissiveIntensity = Math.sin(time * mix(1.5, 5, mood.energy)) > 0.2 ? 2.4 : 0.15;
      },
    });
  },
});
