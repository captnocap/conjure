import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    colours: choice('What colours are the cylinders painted?', {
      'black-maroon': 'Black oxygen with a white shoulder beside a maroon fuel bottle.',
      'green-red': 'Green oxygen beside a bright red fuel bottle.',
      'blue-orange': 'Blue oxygen beside an orange gas bottle.',
      'grey-yellow': 'Grey oxygen beside a yellow bottle, mismatched from two suppliers.',
      bare: 'Paint long gone: rust-brown steel with chalked letters.',
    }),
    fuel: choice('What is the fuel bottle?', {
      acetylene: 'A stout shoulder-high acetylene cylinder.',
      lpg: 'A squat domestic cooking-gas bottle with a carrying collar.',
      'tall-lpg': 'A tall fat propane cylinder with a collar, as big as the oxygen.',
    }),
    cart: choice('What kind of cart carries them?', {
      factory: 'A factory hand truck: tubular steel, rubber tyres, a safety chain.',
      makeshift: 'Welded from rebar and scrap, one bicycle wheel and one iron wheel, bottles tied on with cloth.',
      barrow: 'A low wooden barrow with plank sides and spoked wooden wheels.',
    }),
    torch: choice('What is the torch doing?', {
      hung: 'Unlit, hung up on the cart by its head.',
      idling: 'Lit and laid on a brick, a small blue flame hissing to itself.',
      cutting: 'Roaring through a steel plate on the ground, throwing sparks.',
    }),
    hoses: choice('How are the twin hoses kept?', {
      coiled: 'Coiled in neat loops on a hook.',
      trailing: 'Snaking away across the ground in loose loops.',
      patched: 'Trailing, and bandaged every little way with tape and wire.',
    }),
    kit: choice('What protective kit is with it?', {
      full: 'All of it: goggles, leather gauntlets, a dark face shield and a helmet.',
      goggles: 'Just a pair of round welding goggles on the handle.',
      scarf: 'Cheap sunglasses and a cotton scarf to wrap the face.',
      none: 'None. A pair of flip-flops stands beside the wheel.',
    }),
    spare: noul('Is an empty cylinder lying on the ground beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const SCHEME: Record<typeof a.colours, [string, string, string]> = {
      'black-maroon': ['#1c1d20', '#ece9df', '#7a1f2b'],
      'green-red': ['#2e7a48', '#2e7a48', '#c8281f'],
      'blue-orange': ['#2456a6', '#e8e6de', '#e2761b'],
      'grey-yellow': ['#8b9196', '#1c1d20', '#e0b81e'],
      bare: ['#7d4a30', '#6a3f2a', '#8a5234'],
    };
    const [oxygen, shoulder, fuel] = SCHEME[a.colours];
    const steel = s.material(a.cart === 'factory' ? '#b3261f' : '#5a4034', { metalness: 0.35, roughness: 0.6 });
    const iron = s.material('#2f2c2a', { metalness: 0.4 });
    const brass = s.material('#c79a3a', { metalness: 0.6, roughness: 0.35 });
    const rubber = s.material('#1b1b1c', { roughness: 0.95 });
    const wood = s.material('#8a6540', { roughness: 0.95 });
    const deck = a.cart === 'barrow' ? 0.34 : 0.1;

    const bottle = (x: number, z: number, r: number, h: number, body: string, top: string, collar: boolean) => {
      const paint = s.material(body, { roughness: 0.5, metalness: 0.2 });
      s.lathe([[0.001, 0], [r * 0.85, 0], [r, 0.03], [r, h * 0.8], [r * 0.9, h * 0.88], [r * 0.6, h * 0.95], [r * 0.3, h * 0.985], [r * 0.3, h]], paint, [x, deck, z]);
      if (top !== body) s.lathe([[r * 1.005, h * 0.74], [r * 1.005, h * 0.8], [r * 0.905, h * 0.88], [r * 0.605, h * 0.951], [r * 0.3, h * 0.987]], s.material(top, { roughness: 0.5 }), [x, deck, z]);
      const y = deck + h;
      if (collar) {
        s.cylinder(r * 0.72, r * 0.72, 0.13, [x, y + 0.02, z], paint, 20).material = s.material(body, { side: THREE.DoubleSide });
        s.cylinder(0.02, 0.02, 0.05, [x, y + 0.02, z], brass, 8);
      } else {
        s.box([0.05, 0.07, 0.05], [x, y + 0.035, z], brass);
        s.cylinder(0.04, 0.04, 0.012, [x, y + 0.08, z], iron, 10);
      }
      // Regulator with two gauges.
      const ry = y + (collar ? 0.1 : 0.04);
      s.cylinder(0.03, 0.03, 0.09, [x, ry, z + 0.06], brass, 10).rotation.x = Math.PI / 2;
      for (const dx of [-0.045, 0.045]) {
        s.cylinder(0.034, 0.034, 0.02, [x + dx, ry + 0.05, z + 0.09], iron, 14).rotation.x = Math.PI / 2;
        s.cylinder(0.028, 0.028, 0.022, [x + dx, ry + 0.05, z + 0.092], s.material('#f1eee2'), 14).rotation.x = Math.PI / 2;
      }
      if (a.colours === 'bare') s.label(['O2', 'FULL', 'X', 'MT'][Math.floor(random() * 4)], r * 1.2, r * 0.7, [x, deck + h * 0.55, z + r + 0.004], '#f2efe2', body);
      return [x, ry, z + 0.11] as P3;
    };
    const fuelSpec = { acetylene: [0.135, 1.08, false], lpg: [0.16, 0.56, true], 'tall-lpg': [0.155, 1.18, true] }[a.fuel] as [number, number, boolean];
    const oxyOut = bottle(-0.15, 0, 0.115, 1.42, oxygen, shoulder, false);
    const fuelOut = bottle(0.14, 0.01, fuelSpec[0], fuelSpec[1], fuel, fuel, fuelSpec[2]);

    // The cart.
    const hook: P3 = [0.36, 1.12, -0.2];
    if (a.cart === 'factory') {
      s.box([0.66, 0.03, 0.4], [0, deck - 0.015, 0], steel);
      for (const x of [-0.31, 0.31]) {
        s.rod([x, deck, -0.19], [x, 1.25, -0.19], 0.018, steel);
        s.rod([x, 1.25, -0.19], [x, 1.5, -0.42], 0.018, steel);
        s.box([0.04, deck, 0.04], [x, deck / 2, 0.17], steel);
      }
      s.rod([-0.31, 1.5, -0.42], [0.31, 1.5, -0.42], 0.02, rubber);
      for (const y of [0.55, 1.0]) s.rod([-0.31, y, -0.19], [0.31, y, -0.19], 0.014, steel);
      s.tube([[-0.31, 0.98, -0.19], [-0.3, 0.97, 0.13], [0, 0.95, 0.19], [0.32, 0.97, 0.15], [0.31, 0.98, -0.19]], 0.008, iron);
      for (const x of [-0.39, 0.39]) {
        s.ring(0.14, 0.05, [x, 0.19, -0.24], rubber).rotation.y = Math.PI / 2;
        s.cylinder(0.1, 0.1, 0.05, [x, 0.19, -0.24], s.material('#d8d4c6'), 14).rotation.z = Math.PI / 2;
      }
      s.rod([-0.42, 0.19, -0.24], [0.42, 0.19, -0.24], 0.014, iron);
    } else if (a.cart === 'makeshift') {
      const rebar = s.material('#6b4030', { roughness: 0.95 });
      for (const [x, z] of [[-0.3, 0.17], [0.32, 0.17], [-0.3, -0.18], [0.32, -0.18]]) s.rod([x, deck, z], [x * 0.98, deck, -z * 0.02], 0.012, rebar);
      for (const z of [-0.18, -0.06, 0.06, 0.17]) s.rod([-0.32, deck - 0.01, z], [0.34, deck - 0.01, z + (random() - 0.5) * 0.03], 0.012, rebar);
      for (const x of [-0.3, 0.32]) {
        s.rod([x, deck, -0.18], [x + (random() - 0.5) * 0.04, 1.3, -0.2], 0.012, rebar);
        s.rod([x, 1.3, -0.2], [x, 1.42, -0.5], 0.012, rebar);
        s.rod([x, deck, 0.17], [x, 0, 0.19], 0.012, rebar);
      }
      s.rod([-0.3, 1.42, -0.5], [0.32, 1.42, -0.5], 0.016, wood);
      s.rod([-0.3, 0.7, -0.19], [0.32, 0.95, -0.19], 0.012, rebar);
      // One bicycle wheel, one small iron wheel.
      s.ring(0.3, 0.016, [-0.37, 0.316, -0.22], rubber).rotation.y = Math.PI / 2;
      for (let i = 0; i < 6; i++) s.rod([-0.37, 0.316 + Math.sin(i * 0.52) * 0.29, -0.22 + Math.cos(i * 0.52) * 0.29], [-0.37, 0.316 - Math.sin(i * 0.52) * 0.29, -0.22 - Math.cos(i * 0.52) * 0.29], 0.003, iron);
      s.rod([-0.31, deck, -0.2], [-0.37, 0.316, -0.22], 0.012, rebar);
      s.cylinder(0.13, 0.13, 0.04, [0.39, 0.13, -0.22], iron, 16).rotation.z = Math.PI / 2;
      s.rod([-0.37, 0.316, -0.22], [0.39, 0.13, -0.22], 0.01, rebar);
      const rag = s.material(['#c2452f', '#3d6fa3', '#d8b23a', '#3f8a5a'][Math.floor(random() * 4)], { roughness: 1 });
      for (const y of [0.5, 0.92]) {
        const band = s.ring(0.27, 0.02, [0, y + random() * 0.05, 0.0], rag);
        band.rotation.x = Math.PI / 2 + (random() - 0.5) * 0.12;
        band.scale.set(1.12, 0.62, 1.6);
      }
    } else {
      s.box([0.86, 0.045, 0.6], [0, deck - 0.022, 0], wood);
      for (const x of [-0.42, 0.42]) s.box([0.03, 0.2, 0.6], [x, deck + 0.1, 0], wood);
      s.box([0.86, 0.2, 0.03], [0, deck + 0.1, -0.3], wood);
      s.box([0.07, 1.15, 0.07], [0, deck + 0.57, -0.26], wood);
      s.box([0.5, 0.05, 0.05], [0, 1.44, -0.26], wood);
      for (const x of [-0.47, 0.47]) {
        s.ring(0.32, 0.022, [x, 0.34, -0.05], iron).rotation.y = Math.PI / 2;
        for (let i = 0; i < 4; i++) { const spoke = s.box([0.03, 0.62, 0.04], [x, 0.34, -0.05], wood); spoke.rotation.x = (i * Math.PI) / 4; }
        s.cylinder(0.05, 0.05, 0.07, [x, 0.34, -0.05], iron, 10).rotation.z = Math.PI / 2;
      }
      s.box([0.05, deck, 0.05], [0, deck / 2, 0.26], wood);
      for (const x of [-0.3, 0.3]) s.rod([x, deck, -0.3], [x * 0.7, 0.75, -0.95], 0.022, wood);
      s.rod([-0.25, 0.75, -0.95], [0.25, 0.75, -0.95], 0.02, wood);
      const band = s.ring(0.27, 0.012, [0, 0.95, -0.02], s.material('#b89f6a'));
      band.rotation.x = Math.PI / 2;
      band.scale.set(1.1, 0.75, 1);
      hook[0] = 0.3; hook[2] = -0.3; hook[1] = 1.38;
    }
    const top = a.cart === 'factory' ? 1.5 : a.cart === 'makeshift' ? 1.42 : 1.44, back = a.cart === 'factory' ? -0.42 : a.cart === 'makeshift' ? -0.5 : -0.26;

    // Torch: brass handle, two tubes, a head turned down.
    const torch = new THREE.Group();
    const piece = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3, rz = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at); mesh.rotation.z = rz; mesh.castShadow = true;
      torch.add(mesh);
      return mesh;
    };
    piece(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 10), brass, [0.1, 0, 0], Math.PI / 2);
    for (const dz of [-0.012, 0.012]) piece(new THREE.CylinderGeometry(0.007, 0.007, 0.34, 6), brass, [0.37, 0, dz], Math.PI / 2);
    piece(new THREE.CylinderGeometry(0.007, 0.007, 0.3, 6), brass, [0.35, 0.03, 0], Math.PI / 2);
    piece(new THREE.CylinderGeometry(0.018, 0.022, 0.06, 8), brass, [0.55, -0.01, 0]);
    piece(new THREE.CylinderGeometry(0.008, 0.014, 0.05, 8), s.material('#b0703a', { metalness: 0.6 }), [0.55, -0.06, 0]);
    for (const [x, c] of [[0.04, '#2456a6'], [0.16, '#c8281f']] as const) piece(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 8), s.material(c), [x, 0.03, 0]);
    piece(new THREE.BoxGeometry(0.12, 0.012, 0.012), brass, [0.24, -0.03, 0], 0.15);
    const flames: THREE.Mesh[] = [];
    if (a.torch !== 'hung') {
      const big = a.torch === 'cutting';
      const outer = piece(new THREE.ConeGeometry(big ? 0.045 : 0.026, big ? 0.2 : 0.11, 10), new THREE.MeshBasicMaterial({ color: big ? '#ffb24a' : '#6fb8ff', transparent: true, opacity: 0.7, depthWrite: false }), [0.55, -0.085 - (big ? 0.1 : 0.045), 0], Math.PI);
      const core = piece(new THREE.ConeGeometry(0.014, big ? 0.1 : 0.05, 8), new THREE.MeshStandardMaterial({ color: '#eaf6ff', emissive: '#bfe4ff', emissiveIntensity: 3 }), [0.55, -0.085 - (big ? 0.05 : 0.025), 0], Math.PI);
      outer.castShadow = core.castShadow = false;
      flames.push(outer, core);
    }
    s.root.add(torch);
    let torchEnd: P3;
    if (a.torch === 'hung') {
      torch.position.set(-hook[0] - 0.02, hook[1] + 0.1, hook[2] + 0.02);
      torch.rotation.set(0, Math.PI / 2, -Math.PI / 2 + 0.12);
      s.rod([-hook[0] + 0.03, hook[1] + 0.12, hook[2]], [-hook[0] - 0.08, hook[1] + 0.12, hook[2]], 0.008, iron);
      torchEnd = [-hook[0] - 0.02, hook[1] - 0.45, hook[2] + 0.02];
      torch.position.y = hook[1] - 0.42;
      torch.rotation.set(0, Math.PI / 2, Math.PI / 2 - 0.1);
    } else if (a.torch === 'idling') {
      s.box([0.22, 0.07, 0.11], [0.72, 0.035, 0.62], s.material('#a5553a', { roughness: 1 })).rotation.y = 0.5;
      torch.position.set(0.5, 0.13, 0.75);
      torch.rotation.set(Math.PI / 2 - 0.3, 0.55, 0.1);
      torchEnd = [0.5, 0.13, 0.75];
    } else {
      const plate = s.box([1.0, 0.03, 0.62], [0.55, 0.06, 0.95], s.material('#5b473c', { roughness: 0.9, metalness: 0.3 }));
      plate.rotation.y = 0.2;
      s.box([0.06, 0.06, 0.7], [0.2, 0.03, 0.9], wood).rotation.y = 0.2;
      s.box([0.06, 0.06, 0.7], [0.9, 0.03, 1.03], wood).rotation.y = 0.2;
      const hot = new THREE.MeshStandardMaterial({ color: '#ff9a3a', emissive: '#ff6a1a', emissiveIntensity: 2.5 });
      s.box([0.36, 0.034, 0.016], [0.43, 0.06, 0.96], s.material('#141110')).rotation.y = 0.2;
      s.box([0.1, 0.036, 0.02], [0.63, 0.06, 0.92], hot).rotation.y = 0.2;
      torch.position.set(0.3, 0.3, 1.22);
      torch.rotation.set(0, 0.72, -0.1);
      torchEnd = [0.3, 0.3, 1.22];
      torch.updateMatrixWorld(true);
      const tip = new THREE.Vector3(0.55, -0.2, 0).applyMatrix4(torch.matrixWorld);
      const sparks = Array.from({ length: 30 + Math.floor(mood.energy * 50) }, () => {
        const d = random() ** 1.5 * 0.7, ang = random() * Math.PI * 2;
        return { at: [tip.x + Math.cos(ang) * d, 0.08 + Math.sin(Math.min(1, d / 0.7) * Math.PI) * random() * 0.22, tip.z + Math.sin(ang) * d] as P3, size: 0.006 + random() * 0.008 };
      });
      s.scatter(new THREE.SphereGeometry(1, 5, 4), new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffae3a', emissiveIntensity: 3 }), sparks);
    }

    // Twin hoses: oxygen blue or green, fuel red.
    const hoseColours = [a.colours === 'green-red' ? '#2f8a4a' : '#2456a6', '#c8281f'];
    const hoseMaterials = hoseColours.map((c) => s.material(c, { roughness: 0.8 }));
    const twin = (points: P3[]) => hoseMaterials.forEach((material, i) => s.tube(points.map(([x, y, z]) => [x + (i ? 0.014 : -0.014), y + (i ? 0.004 : 0), z + (i ? 0.01 : -0.01)] as P3), 0.013, material));
    const down: P3[] = [[0, Math.max(oxyOut[1], fuelOut[1]), 0.12], [0.2, 1.0, 0.26], [0.34, 0.6, 0.2]];
    if (a.hoses === 'coiled') {
      s.rod([hook[0] - 0.05, hook[1] + 0.17, hook[2]], [hook[0] + 0.08, hook[1] + 0.19, hook[2]], 0.01, iron);
      for (let i = 0; i < 7; i++) {
        const coil = s.ring(0.17 + random() * 0.012, 0.013, [hook[0] + 0.02 + i * 0.011, hook[1] + (random() - 0.5) * 0.015, hook[2]], hoseMaterials[i % 2]);
        coil.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.12;
        coil.scale.y = 1.25;
      }
      twin([[0, Math.max(oxyOut[1], fuelOut[1]), 0.12], [0.26, 1.2, 0.12], [hook[0] + 0.05, hook[1] - 0.15, hook[2] + 0.05]]);
      if (a.torch !== 'hung') twin([[hook[0] + 0.05, hook[1] - 0.2, hook[2]], [0.55, 0.3, 0.1], [0.62, 0.02, 0.4], [torchEnd[0] - 0.12, 0.03, torchEnd[2] + 0.2], torchEnd]);
      else twin([[hook[0] + 0.05, hook[1] - 0.2, hook[2]], [0.2, 0.42, -0.34], [-0.2, 0.5, -0.33], [torchEnd[0], torchEnd[1] - 0.12, torchEnd[2]], torchEnd]);
    } else {
      const reach = 0.45;
      const loops: P3[] = [...down, [0.5, 0.03, 0.3]];
      const n = 5;
      for (let i = 0; i < n; i++) loops.push([0.75 + Math.sin(i * 1.9 + random()) * 0.4 * reach + i * 0.05, 0.03, 0.45 + Math.cos(i * 1.4) * 0.25 + i * 0.06]);
      if (a.torch === 'hung') loops.push([-0.1, 0.03, 0.75], [-0.62, 0.03, 0.25], [-0.6, 0.2, -0.25], [torchEnd[0], torchEnd[1] - 0.12, torchEnd[2]]);
      loops.push(torchEnd);
      twin(loops);
      if (a.hoses === 'patched') {
        const curve = new THREE.CatmullRomCurve3(loops.map((p) => new THREE.Vector3(...p)));
        const tape = [s.material('#e9e4d2'), s.material('#1b1b1c'), s.material('#d2a23a')];
        for (let i = 0; i < 9; i++) {
          const t = 0.12 + random() * 0.8, p = curve.getPoint(t), d = curve.getTangent(t);
          const wrap = s.cylinder(0.034, 0.034, 0.05 + random() * 0.05, [p.x, p.y + 0.002, p.z], tape[i % 3], 8);
          wrap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
          wrap.scale.z = 0.62;
        }
      }
    }

    // Protective kit, or the lack of it.
    const lens = s.material('#1d3a2a', { roughness: 0.2 });
    if (a.kit === 'full' || a.kit === 'goggles') {
      s.ring(0.075, 0.006, [0.08, top - 0.07, back], rubber).scale.set(1, 1.2, 1);
      for (const dx of [-0.045, 0.045]) {
        s.cylinder(0.04, 0.04, 0.035, [0.08 + dx, top - 0.16, back + 0.012], iron, 14).rotation.x = Math.PI / 2;
        s.cylinder(0.032, 0.032, 0.037, [0.08 + dx, top - 0.16, back + 0.014], lens, 14).rotation.x = Math.PI / 2;
      }
    }
    if (a.kit === 'full') {
      const leather = s.material('#b98a4e', { roughness: 1 });
      for (const dx of [-0.2, -0.1]) {
        s.box([0.085, 0.24, 0.03], [dx, top - 0.11, back + 0.02], leather).rotation.z = (random() - 0.5) * 0.3;
        s.box([0.1, 0.09, 0.035], [dx, top - 0.27, back + 0.02], leather);
      }
      s.box([0.2, 0.26, 0.012], [-hook[0] * 1.02, 0.78, hook[2] + 0.03], s.material('#16181a', { roughness: 0.3 })).rotation.y = Math.PI / 2 + 0.2;
      s.ring(0.09, 0.008, [-hook[0] * 1.02, 0.93, hook[2] + 0.03], rubber).rotation.x = Math.PI / 2;
      s.ball([0.125, 0.09, 0.14], [-0.15, deck + 1.42 + 0.14, 0], s.material('#e3c53a'), 14);
    }
    if (a.kit === 'scarf') {
      const cloth = s.material(mood.cheer > 0.5 ? '#d85a3a' : '#7d8a6a', { roughness: 1, side: THREE.DoubleSide });
      s.box([0.2, 0.34, 0.012], [-0.08, top - 0.17, back + 0.012], cloth).rotation.z = 0.1;
      s.box([0.12, 0.5, 0.012], [0.03, top - 0.25, back - 0.012], cloth).rotation.z = -0.08;
      s.box([0.13, 0.012, 0.012], [0.2, top - 0.06, back + 0.02], rubber);
      for (const dx of [-0.035, 0.035]) s.box([0.055, 0.04, 0.006], [0.2 + dx, top - 0.08, back + 0.024], s.material('#111', { roughness: 0.15 }));
    }
    if (a.kit === 'none') {
      const flop = s.material(['#2a6fb0', '#c8402f', '#3a3a3a'][Math.floor(random() * 3)]);
      for (const dx of [0, 0.13]) {
        s.box([0.1, 0.018, 0.26], [-0.72 + dx, 0.009, 0.3 + dx * 0.4], flop).rotation.y = 0.3 + dx;
        s.rod([-0.76 + dx, 0.02, 0.36 + dx * 0.4], [-0.68 + dx, 0.02, 0.36 + dx * 0.4], 0.006, rubber);
      }
    }
    if (a.spare) {
      const empty = s.lathe([[0.001, 0], [0.1, 0], [0.115, 0.03], [0.115, 1.16], [0.07, 1.34], [0.035, 1.4], [0.035, 1.46]], s.material(a.colours === 'bare' ? '#70452e' : oxygen, { roughness: 0.6 }), [-0.62, 0.115, -0.2]);
      empty.rotation.set(Math.PI / 2, 0, 0.15 + random() * 0.25);
      s.label('MT', 0.2, 0.1, [-0.56, 0.232, 0.25], '#f2efe2', a.colours === 'bare' ? '#70452e' : oxygen).rotation.set(-Math.PI / 2, 0, 0.4);
    }
    const flicker = mix(0.05, 0.3, mood.energy);
    return s.finish({
      update: (_dt, time) => flames.forEach((flame, i) => { flame.scale.y = 1 + Math.sin(time * (23 + i * 9)) * flicker; }),
    });
  },
});
