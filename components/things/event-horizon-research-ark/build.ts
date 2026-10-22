import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
const NAMES = {
  moth: 'MOTH: the crew named her honestly.',
  icarus: 'ICARUS II: someone thought the first one was a lesson for other people.',
  vigil: 'VIGIL: patient, pious, a little grim.',
  closer: 'CLOSER: a dare painted on the hull.',
  perihelion: 'PERIHELION: sober agency lettering, a committee\'s choice.',
  blank: 'No name survives: burnt off, or never painted.',
} as const;
const LETTERS: Record<keyof typeof NAMES, string> = { moth: 'MOTH', icarus: 'ICARUS II', vigil: 'VIGIL', closer: 'CLOSER', perihelion: 'PERIHELION', blank: '' };

export default defineThing({
  questions: {
    design: choice('What kind of vessel is it?', {
      parasol: 'A long open truss sheltering behind one great mirrored parasol, like an umbrella held against a furnace.',
      sphere: 'A squat armoured sphere of thick plates with a single shuttered eye and a small stand-off shield.',
      pods: 'A wheel of small pods tethered round a hub, each hiding behind its own little sunshade.',
    }),
    crew: choice('What state is the crew in?', {
      lit: 'Lights on in every window, radiators glowing: busy, absorbed, at work.',
      dark: 'Running dark: windows black, radiators cold. Hiding, sleeping, or nobody left.',
      evacuating: 'Evacuating: a string of small boats pulling away from her with their engines lit.',
    }),
    scorch: score('How scorched is the shield?', ['Mirror bright, newly arrived', 'Heat-stained', 'Blackened on one side', 'Burnt through: holes, bare ribs, edges still glowing']),
    instruments: choice('How many instruments does she push out past the shield?', {
      few: 'A couple of modest booms. Cautious.',
      bristling: 'A dozen booms, dishes and probes: a pincushion of curiosity.',
      reach: 'One absurdly long boom reaching far ahead of the shield, toward the thing itself.',
    }),
    name: choice('What name is on the hull?', NAMES),
    livery: choice('What colours is she painted in?', {
      agency: 'White and pale grey with an orange stripe, like a research agency.',
      industrial: 'Bare dull metal and hazard yellow, a mining rig pressed into science.',
      old: 'Faded teal and cream, decades out of date.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const ship = s.root;
    const lit = a.crew !== 'dark';
    const hullHex = { agency: '#e2e4e0', industrial: '#9a9c98', old: '#d9d2b4' }[a.livery];
    const accentHex = { agency: '#e8641c', industrial: '#e8b71c', old: '#3f8f88' }[a.livery];
    const hull = s.material(hullHex, { roughness: 0.55, metalness: 0.15 });
    const accent = s.material(accentHex, { roughness: 0.6 });
    const dark = s.material('#33373d', { roughness: 0.7, metalness: 0.3 });
    const frame = s.material('#70767c', { roughness: 0.5, metalness: 0.4 });
    const foil = s.material('#c79a2e', { roughness: 0.4, metalness: 0.45, side: THREE.DoubleSide });
    const glow = new THREE.Color().setHSL(mix(0.03, 0.09, mood.warmth), 1, 0.55);
    const windowLight = new THREE.Color(lit ? (mood.cheer > 0.4 ? '#ffd76a' : '#bfe6ff') : '#15181c');
    const hot = new THREE.MeshBasicMaterial({ color: glow });

    // Collected and drawn in single calls: struts, windows.
    const struts: { from: P; to: P; radius: number }[] = [];
    const panes: { at: P; size: P; turn?: number }[] = [];
    const strut = (from: P, to: P, radius: number) => struts.push({ from, to, radius });

    // The shield texture: mirrored gores, soot spreading from one side, and at the worst, holes.
    const shieldMaterials = () => {
      const canvas = document.createElement('canvas'), heat = document.createElement('canvas');
      canvas.width = heat.width = 512; canvas.height = heat.height = 256;
      const ctx = canvas.getContext('2d')!, hx = heat.getContext('2d')!;
      ctx.fillStyle = '#dfe5e8'; ctx.fillRect(0, 0, 512, 256);
      hx.fillStyle = '#000000'; hx.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? 'rgba(160,176,186,0.55)' : 'rgba(255,255,255,0.5)'; ctx.fillRect(i * 32, 0, 32, 256); }
      ctx.strokeStyle = 'rgba(70,80,90,0.8)'; ctx.lineWidth = 2;
      for (let i = 0; i <= 16; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 256); ctx.stroke(); }
      for (const y of [70, 140, 200]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
      const centre = random() * 512, burn = a.scorch;
      const blots = Math.round(burn * 70 + mood.wear * 14);
      for (let i = 0; i < blots; i++) {
        const x = centre + (random() + random() - 1) * mix(90, 230, burn), y = 256 * random() ** mix(1.6, 0.8, burn), r = mix(12, 46, random()) * mix(0.7, 1.3, burn);
        for (const shift of [-512, 0, 512]) {
          const soot = ctx.createRadialGradient(x + shift, y, 0, x + shift, y, r);
          soot.addColorStop(0, `rgba(18,14,12,${mix(0.45, 0.95, burn)})`); soot.addColorStop(0.7, `rgba(60,34,20,${mix(0.25, 0.6, burn)})`); soot.addColorStop(1, 'rgba(90,50,20,0)');
          ctx.fillStyle = soot; ctx.fillRect(x + shift - r, y - r, r * 2, r * 2);
          if (burn > 0.45 && random() < burn * 0.5) {
            hx.strokeStyle = `rgba(255,${Math.round(110 + random() * 90)},30,${mix(0.3, 0.95, burn)})`; hx.lineWidth = 1.5 + random() * 3;
            hx.beginPath(); hx.arc(x + shift, y, r * mix(0.3, 0.6, random()), random() * 6, random() * 6 + 2.5); hx.stroke();
          }
        }
      }
      if (burn > 0.72) {
        ctx.globalCompositeOperation = 'destination-out';
        const holes = Math.round((burn - 0.72) * 40) + 2;
        for (let i = 0; i < holes; i++) {
          const x = centre + (random() - 0.5) * 240, y = 30 + random() * 215, rx = 9 + random() * 26, ry = 7 + random() * 22;
          for (const shift of [-512, 0, 512]) { ctx.beginPath(); ctx.ellipse(x + shift, y, rx, ry, random(), 0, Math.PI * 2); ctx.fill(); }
          hx.strokeStyle = 'rgba(255,150,40,1)'; hx.lineWidth = 4;
          for (const shift of [-512, 0, 512]) { hx.beginPath(); hx.ellipse(x + shift, y, rx + 2, ry + 2, 0, 0, Math.PI * 2); hx.stroke(); }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      const map = new THREE.CanvasTexture(canvas), emissiveMap = new THREE.CanvasTexture(heat);
      map.colorSpace = emissiveMap.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = emissiveMap.wrapS = THREE.RepeatWrapping;
      return {
        outer: new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: '#ffffff', emissiveIntensity: 1.4, roughness: mix(0.22, 0.8, burn), metalness: mix(0.5, 0.15, burn), side: THREE.DoubleSide, alphaTest: 0.5 }),
        inner: new THREE.MeshStandardMaterial({ color: '#b98a2a', map, roughness: 0.45, metalness: 0.4, side: THREE.DoubleSide, alphaTest: 0.5 }),
      };
    };
    const shield = shieldMaterials();

    /** An umbrella with its point toward -x (the core): mirrored outside, gold foil and ribs inside. */
    const parasol = (radius: number, depth: number, at: P, ribs = 12) => {
      const group = new THREE.Group();
      const profile = Array.from({ length: 12 }, (_unused, i) => { const t = i / 11; return new THREE.Vector2(radius * t + 0.001, depth * (1 - t ** 1.7)); });
      const skin = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), shield.outer);
      skin.castShadow = skin.receiveShadow = true;
      const lining = new THREE.Mesh(skin.geometry, shield.inner);
      lining.scale.setScalar(0.985);
      lining.position.y = -radius * 0.02;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.018, 6, 48), frame);
      rim.rotation.x = Math.PI / 2;
      group.add(skin, lining, rim);
      group.rotation.z = Math.PI / 2;
      group.position.set(...at);
      ship.add(group);
      for (let i = 0; i < ribs; i++) {
        const angle = (i / ribs) * Math.PI * 2;
        strut([at[0] - depth * 0.9, at[1], at[2]], [at[0] + radius * 0.03, at[1] + Math.cos(angle) * radius, at[2] + Math.sin(angle) * radius], radius * 0.012);
        if (i % 3 === 0) strut([at[0] + radius * 0.55, at[1], at[2]], [at[0] - depth * 0.42, at[1] + Math.cos(angle) * radius * 0.6, at[2] + Math.sin(angle) * radius * 0.6], radius * 0.014);
      }
      return group;
    };

    /** A pressurised can lying along x with a band of windows. */
    const module = (radius: number, length: number, at: P, rows = 2) => {
      const can = s.cylinder(radius, radius, length, at, hull, 20);
      can.rotation.z = Math.PI / 2;
      for (const end of [-1, 1]) { const cap = s.ball([radius * 0.45, radius, radius], [at[0] + end * length / 2, at[1], at[2]], hull, 16); cap.castShadow = true; }
      const band = s.cylinder(radius * 1.02, radius * 1.02, length * 0.12, [at[0] - length * 0.3, at[1], at[2]], accent, 20);
      band.rotation.z = Math.PI / 2;
      const perRow = Math.max(3, Math.round(length / (radius * 0.55)));
      for (let row = 0; row < rows; row++)
        for (let i = 0; i < perRow; i++) {
          if (!lit ? false : random() < 0.12) continue;
          const tilt = (row - (rows - 1) / 2) * 0.55 + 0.25;
          for (const face of [1, -1])
            panes.push({ at: [at[0] - length * 0.36 + (i + 0.5) * (length * 0.78 / perRow), at[1] + Math.sin(tilt) * radius * 1.01, at[2] + face * Math.cos(tilt) * radius * 1.01], size: [radius * 0.26, radius * 0.2, radius * 0.06], turn: face * -tilt });
        }
      return can;
    };

    const boom = (from: P, to: P, radius: number, head: 'dish' | 'box' | 'probe') => {
      strut(from, to, radius);
      if (head === 'box') s.box([radius * 6, radius * 6, radius * 8], to, dark);
      else if (head === 'probe') { s.ball([radius * 3.5, radius * 3.5, radius * 3.5], to, accent, 10); strut(to, [to[0] - radius * 22, to[1], to[2]], radius * 0.5); }
      else {
        const dish = s.lathe([[0.01, 0], [radius * 5, radius * 1.2], [radius * 9, radius * 3.6]], foil, to);
        dish.rotation.z = Math.PI / 2;
        (dish.material as THREE.Material).side = THREE.DoubleSide;
      }
      if (lit) s.ball([radius * 1.6, radius * 1.6, radius * 1.6], [to[0], to[1] + radius * 5, to[2]], new THREE.MeshBasicMaterial({ color: random() < 0.5 ? '#ff3b30' : '#35e06a' }), 8).castShadow = false;
    };

    let hatch: P = [0, 0, 0];
    let nameAt: { at: P; width: number; height: number } | null = null;
    let front = -40, girth = 26;

    if (a.design === 'parasol') {
      const length = 84, half = 3.2, bays = 12;
      // The spine: four longerons, battens and a zig-zag of diagonals.
      const x0 = -length / 2 + 6, x1 = length / 2;
      const corners: [number, number][] = [[half, half], [half, -half], [-half, -half], [-half, half]];
      for (const [y, z] of corners) strut([x0, y, z], [x1, y, z], 0.34);
      for (let bay = 0; bay <= bays; bay++) {
        const x = mix(x0, x1, bay / bays);
        corners.forEach(([y, z], i) => {
          const [ny, nz] = corners[(i + 1) % 4];
          strut([x, y, z], [x, ny, nz], 0.2);
          if (bay < bays) strut([x, y, z], [mix(x0, x1, (bay + 1) / bays), ny, nz], 0.16);
        });
      }
      const radius = 27, depth = 11;
      parasol(radius, depth, [-length / 2 + depth, 0, 0], 16);
      front = -length / 2; girth = radius;
      // Habitat cans slung under and over the spine, in the shadow.
      module(4.6, 17, [-4, half + 4.4, 0]);
      module(3.8, 13, [10, -half - 3.6, 0], 1);
      const lab = s.ball([5.2, 5.2, 5.2], [-21, 0, 0], hull, 20);
      lab.castShadow = true;
      s.ring(5.3, 0.5, [-21, 0, 0], accent).rotation.y = Math.PI / 2;
      hatch = [10, -half - 7.4, 0];
      nameAt = { at: [-4, half + 4.4, 4.75], width: 12, height: 2.6 };
      // Radiators: edge-on to the heat, glowing with what the ship throws away.
      const fin = new THREE.MeshStandardMaterial({ color: lit ? '#7a2a1c' : '#3a3d42', emissive: lit ? glow : new THREE.Color('#000000'), emissiveIntensity: lit ? mix(0.35, 0.9, mood.energy) : 0, roughness: 0.7, side: THREE.DoubleSide });
      for (const [x, span] of [[22, 19], [30, 15]] as const)
        for (const side of [-1, 1]) {
          s.box([7, 0.3, span], [x, 0, side * (half + span / 2 + 0.6)], fin);
          strut([x, 0, side * half], [x, 0, side * (half + span + 0.6)], 0.22);
        }
      // The tail: tankage, an antenna that points home, engine bells.
      for (const [y, z] of [[1, 1], [-1, -1]] as const) s.ball([3.1, 3.1, 3.1], [36, y * 2.4, z * 2.4], foil, 14);
      const dish = s.lathe([[0.01, 0], [3, 0.5], [5.4, 1.7], [6.6, 3]], hull, [x1 + 3.2, 6.5, 0]);
      dish.rotation.z = -Math.PI / 2 + 0.5;
      (dish.material as THREE.Material).side = THREE.DoubleSide;
      strut([x1 - 2, half, 0], [x1 + 3, 6.2, 0], 0.3);
      for (const z of [-2, 2]) { const bell = s.cylinder(0.8, 1.9, 3.4, [x1 + 1.6, -1, z], dark, 14); bell.rotation.z = Math.PI / 2; }
    } else if (a.design === 'sphere') {
      const R = 21;
      const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 2), s.material(hullHex, { roughness: 0.6, metalness: 0.2, flatShading: true, vertexColors: true }));
      // Plates darken on the side that faces the core.
      const at = shell.geometry.getAttribute('position');
      const colours: number[] = [], plate = new THREE.Color(), soot = new THREE.Color('#2b211c');
      for (let i = 0; i < at.count; i += 3) {
        const facing = clamp01((-(at.getX(i) + at.getX(i + 1) + at.getX(i + 2)) / 3 / R) * 0.9 + 0.25);
        plate.set('#ffffff').multiplyScalar(mix(0.82, 1, random())).lerp(soot, clamp01(facing * a.scorch * 1.5 + (random() - 0.5) * 0.3 * a.scorch));
        for (let k = 0; k < 3; k++) colours.push(plate.r, plate.g, plate.b);
      }
      shell.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      shell.castShadow = shell.receiveShadow = true;
      ship.add(shell);
      // The eye: a shuttered aperture on the hot side.
      const eye = s.cylinder(6.5, 7.5, 2.4, [-R * 0.97, 0, 0], dark, 28);
      eye.rotation.z = Math.PI / 2;
      const lens = s.cylinder(4.4, 4.4, 0.5, [-R * 0.97 - 1.2, 0, 0], lit ? hot : dark, 24);
      lens.rotation.z = Math.PI / 2;
      for (let i = 0; i < 5; i++) s.box([0.5, 1.1, 14.4], [-R * 0.97 - 1.5, -5 + i * 2.5, 0], frame).rotation.x = lit ? 0.5 : 0;
      // A belt of cabins round the waist, in the lee.
      const belt = s.ring(R * 1.02, 2.4, [3, 0, 0], hull);
      belt.rotation.y = Math.PI / 2;
      for (let i = 0; i < 22; i++) {
        const angle = (i / 22) * Math.PI * 2;
        if (lit && random() < 0.15) continue;
        panes.push({ at: [5.3, Math.cos(angle) * (R * 1.02 + 1), Math.sin(angle) * (R * 1.02 + 1)], size: [0.5, 1.3, 1.6], turn: -angle });
      }
      s.ring(R * 0.995, 0.9, [-6, 0, 0], accent).rotation.y = Math.PI / 2;
      // A small stand-off shield held out in front on a tripod.
      parasol(11, 4, [-R - 13, 0, 0], 9);
      for (let i = 0; i < 3; i++) { const angle = (i / 3) * Math.PI * 2 + 0.4; strut([-R * 0.8, Math.cos(angle) * R * 0.58, Math.sin(angle) * R * 0.58], [-R - 12.6, Math.cos(angle) * 9, Math.sin(angle) * 9], 0.4); }
      for (const z of [-5, 0, 5]) { const bell = s.cylinder(1.4, 3, 5, [R + 1.5, z === 0 ? 3 : -2, z], dark, 14); bell.rotation.z = Math.PI / 2; }
      front = -R - 17; girth = R * 0.8;
      hatch = [8, -R * 0.9, 0];
      nameAt = { at: [9, 9, 0], width: 15, height: 3.4 };
    } else {
      const pods = 5 + Math.floor(random() * 3), ringR = 25;
      const hub = s.cylinder(4.4, 4.4, 15, [2, 0, 0], hull, 20);
      hub.rotation.z = Math.PI / 2;
      s.ball([5.6, 5.6, 5.6], [-5, 0, 0], hull, 18);
      s.ring(4.6, 0.6, [2, 0, 0], accent).rotation.y = Math.PI / 2;
      parasol(9.5, 3.6, [-10, 0, 0], 9);
      const dish = s.lathe([[0.01, 0], [2.6, 0.5], [4.6, 1.6]], hull, [12.5, 0, 0]);
      dish.rotation.z = -Math.PI / 2;
      (dish.material as THREE.Material).side = THREE.DoubleSide;
      const gone = a.crew === 'evacuating' ? Math.floor(random() * pods) : -1;
      for (let i = 0; i < pods; i++) {
        const angle = (i / pods) * Math.PI * 2;
        const y = Math.cos(angle) * ringR, z = Math.sin(angle) * ringR;
        if (i === gone) { strut([2, 0, 0], [2, y * 0.45, z * 0.45], 0.14); continue; }
        strut([4, 0, 0], [2, y, z], 0.16);
        strut([-3, 0, 0], [-1, y, z], 0.16);
        const next = ((i + 1) / pods) * Math.PI * 2;
        if (i + 1 !== gone && (i + 1) % pods !== gone) strut([1, y, z], [1, Math.cos(next) * ringR, Math.sin(next) * ringR], 0.12);
        module(2.9, 8.5, [2.5, y, z], 1);
        parasol(6.6, 2.6, [-4.2, y, z], 6);
      }
      front = -14; girth = ringR + 6;
      hatch = [8, -5, 0];
      nameAt = { at: [2, 0, 4.5], width: 9, height: 2.2 };
    }

    // Instruments peering past the shield.
    if (a.instruments === 'reach') {
      const tip: P = [front - mix(34, 46, random()), girth * 0.2, girth * 0.12];
      boom([front + 14, a.design === 'sphere' ? girth * 0.9 : 3.2, 2], tip, 0.42, 'probe');
      strut([front + 26, 8, 0], [mix(front, tip[0], 0.55), tip[1] + 1.5, tip[2]], 0.12);
      boom([front + 20, -3.2, -2], [front + 4, -girth * 1.12, -girth * 0.3], 0.3, 'box');
    } else {
      const count = a.instruments === 'few' ? 2 : 9 + Math.floor(random() * 5);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + random() * 0.5, out = girth * mix(1.08, 1.4, random());
        const rootX = front + mix(14, 30, random());
        boom([rootX, Math.cos(angle) * 3, Math.sin(angle) * 3], [front + mix(-6, 9, random()), Math.cos(angle) * out, Math.sin(angle) * out], a.instruments === 'few' ? 0.34 : mix(0.2, 0.32, random()), (['dish', 'box', 'probe'] as const)[i % 3]);
      }
    }

    // The name, on a plate where the light from the core can read it.
    const letters = LETTERS[a.name];
    if (letters && nameAt) {
      const plate = s.label(letters, nameAt.width, nameAt.height, nameAt.at, a.livery === 'industrial' ? '#1d1d1d' : '#1f2d3a', a.livery === 'industrial' ? '#e8b71c' : hullHex);
      plate.castShadow = false;
      const backing = s.box([nameAt.width + 0.5, nameAt.height + 0.5, 0.25], [nameAt.at[0], nameAt.at[1], nameAt.at[2] - 0.2], frame);
      if (a.design === 'sphere') for (const part of [plate, backing]) { part.position.z += 21 * 0.86; part.rotation.y = 0.36; part.rotation.x = -0.4; }
    }

    // Lifeboats: a string of them leaving on the cool side.
    const boats: { boat: THREE.Group; from: THREE.Vector3; way: THREE.Vector3; far: number }[] = [];
    if (a.crew === 'evacuating') {
      const count = 3 + Math.floor(random() * 4);
      const course = new THREE.Vector3(1, mix(0.25, 0.6, random()), mix(0.5, 1.1, random())).normalize();
      const flame = new THREE.MeshBasicMaterial({ color: '#9fd8ff' });
      for (let i = 0; i < count; i++) {
        const boat = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 3.4, 4, 10), hull);
        body.rotation.z = Math.PI / 2;
        body.castShadow = true;
        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.56, 1.56, 0.9, 10), accent);
        stripe.rotation.z = Math.PI / 2;
        const burn = new THREE.Mesh(new THREE.ConeGeometry(0.9, mix(3, 6, random()), 8), flame);
        burn.rotation.z = Math.PI / 2;
        burn.position.x = -4.6;
        boat.add(body, stripe, burn);
        boat.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), course.clone().add(new THREE.Vector3((random() - 0.5) * 0.2, (random() - 0.5) * 0.2, (random() - 0.5) * 0.2)).normalize());
        ship.add(boat);
        boats.push({ boat, from: new THREE.Vector3(...hatch), way: course.clone(), far: 4 + i * mix(6, 8, random()) });
      }
      // The open hatch they came from.
      s.box([3, 0.5, 3], hatch, new THREE.MeshBasicMaterial({ color: '#ff5a36' }));
    }

    // Draw the collected struts and windows.
    if (struts.length) {
      const lattice = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), frame, struts.length);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), from = new THREE.Vector3(), to = new THREE.Vector3();
      struts.forEach((one, i) => {
        from.set(...one.from); to.set(...one.to);
        const span = to.clone().sub(from), length = span.length();
        turn.setFromUnitVectors(up, span.normalize());
        lattice.setMatrixAt(i, matrix.compose(from.add(to).multiplyScalar(0.5), turn, new THREE.Vector3(one.radius, length, one.radius)));
      });
      lattice.castShadow = true;
      ship.add(lattice);
    }
    if (panes.length) {
      const glass = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: windowLight }), panes.length);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion();
      panes.forEach((pane, i) => {
        turn.setFromEuler(new THREE.Euler(pane.turn ?? 0, 0, 0));
        glass.setMatrixAt(i, matrix.compose(new THREE.Vector3(...pane.at), turn, new THREE.Vector3(...pane.size)));
      });
      ship.add(glass);
    }

    // Three-quarter on: the scorched face of the shield toward us, the ship trailing away behind it.
    ship.rotation.set((random() - 0.5) * 0.12, mix(0.42, 0.7, random()), mix(-0.1, 0.06, random()));
    const wrap = new Sculpture(context);
    wrap.root.add(ship);
    const pace = mix(0.25, 1.4, mood.energy);
    let clock = random() * 10;
    const settle = (dt: number) => {
      clock += dt * pace;
      for (const [index, one] of boats.entries()) {
        const out = ((one.far + clock * 1.6) % 46) + 8;
        one.boat.position.copy(one.from).addScaledVector(one.way, out);
        one.boat.position.y += Math.sin(clock * 0.7 + index) * 0.6;
        one.boat.scale.setScalar(mix(1, 0.72, out / 54));
      }
    };
    settle(0);
    return wrap.finish({ update: settle });
  },
});
