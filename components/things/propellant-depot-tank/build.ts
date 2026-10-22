import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

function hazardTexture(repeat: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f2c21a';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#1b1b1d';
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(k * 64, 0); ctx.lineTo(k * 64 + 32, 0); ctx.lineTo(k * 64 - 32, 64); ctx.lineTo(k * 64 - 64, 64);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, 1);
  return texture;
}

const CARGO = {
  hydrogen: 'Liquid hydrogen: LH2 stencils and pale blue collars, the coldest and leakiest load.',
  oxygen: 'Liquid oxygen: LOX stencils and green collars.',
  methane: 'Methane: CH4 stencils and burnt-orange collars, a working rig for working ships.',
  xenon: 'Xenon for ion drives: Xe stencils and violet collars, expensive and quiet.',
  water: 'Plain water ice: H2O stencils and white-cyan collars, the humblest cargo.',
} as const;
const CARGO_TEXT: Record<keyof typeof CARGO, string> = { hydrogen: 'LH2', oxygen: 'LOX', methane: 'CH4', xenon: 'Xe', water: 'H2O' };
const CARGO_TINT: Record<keyof typeof CARGO, string> = { hydrogen: '#6fb6e8', oxygen: '#4fb86a', methane: '#d9722a', xenon: '#9a6ad6', water: '#9fe3e6' };
const SIGNS = { open: 'OPEN', self: 'SELF SERVE', last: 'LAST FUEL', closed: 'NO SERVICE', none: '' } as const;

export default defineThing({
  questions: {
    layout: choice('How are the tanks arranged?', {
      single: 'One great sphere in a girdle of struts.',
      pair: 'Two tall capsule tanks standing side by side.',
      quad: 'Four spheres clustered round a slim central column.',
      rack: 'Six small capsules lying in a two-tier rack, like bottles in a crate.',
      mother: 'One long horizontal capsule with small spheres strapped along its back.',
    }),
    cargo: choice('What does it hold?', CARGO),
    blanket: choice('How are the tanks wrapped?', {
      bare: 'Bare frost-white skin with only straps.',
      gold: 'Bands of gold foil blanket over white.',
      quilted: 'Fully quilted in faceted silver insulation.',
      peeled: 'Gold foil half peeled away, strips hanging loose.',
    }),
    arm: choice('What is the fill arm doing?', {
      stowed: 'Folded against the frame, nozzle capped. Nobody has called.',
      waiting: 'Swung out with the nozzle open, waiting for a customer.',
      hooked: 'Plugged into a small drop tank that is taking on a load.',
      leaking: 'Left hanging with the hose adrift, venting a spray of ice crystals.',
    }),
    level: score('How much propellant is left, by the gauge lights?', ['Dry, one red light', 'A quarter', 'Half', 'Brim full, every light on']),
    sign: choice('What does its sign say, if it has one?', {
      open: 'OPEN', self: 'SELF SERVE', last: 'LAST FUEL', closed: 'NO SERVICE', none: 'No sign at all.',
    }),
    canopy: noul('Does it have a flat filling-station canopy roof over it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const frost = s.material('#f1f5f7', { roughness: 0.55, emissive: '#9db8c8', emissiveIntensity: 0.12 });
    const gold = new THREE.MeshStandardMaterial({ color: '#dba63a', metalness: 0.4, roughness: 0.4, flatShading: true, emissive: '#5a3a08', emissiveIntensity: 0.35, side: THREE.DoubleSide });
    const silver = new THREE.MeshStandardMaterial({ color: '#c3cad2', metalness: 0.45, roughness: 0.4, flatShading: true, emissive: '#39404a', emissiveIntensity: 0.25 });
    const girder = s.material('#565d66', { metalness: 0.4, roughness: 0.5 });
    const dark = s.material('#2a2e33', { roughness: 0.6 });
    const collar = s.material(CARGO_TINT[a.cargo], { roughness: 0.5, emissive: CARGO_TINT[a.cargo], emissiveIntensity: 0.15 });
    const stain = s.material('#6a5f50', { roughness: 0.95 });
    const stripes = (repeat: number) => new THREE.MeshStandardMaterial({ map: hazardTexture(repeat), roughness: 0.7 });
    const gaugeOn = new THREE.MeshStandardMaterial({ color: CARGO_TINT[a.cargo], emissive: CARGO_TINT[a.cargo], emissiveIntensity: 2 });
    const gaugeLow = new THREE.MeshStandardMaterial({ color: '#ff4030', emissive: '#ff2a1a', emissiveIntensity: 2 });
    const gaugeOff = s.material('#30353b');
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    /** A tank whose long axis is the group's local y. length 0 makes a sphere. */
    const tank = (r: number, length: number, at: [number, number, number], lie: 'up' | 'x' | 'z' = 'up') => {
      const group = new THREE.Group();
      group.position.set(...at);
      if (lie === 'x') group.rotation.z = Math.PI / 2;
      if (lie === 'z') group.rotation.x = Math.PI / 2;
      s.root.add(group);
      const sphere = length === 0;
      add(group, sphere ? new THREE.SphereGeometry(r, 28, 18) : new THREE.CapsuleGeometry(r, length, 10, 28), frost);
      if (a.blanket === 'quilted') add(group, sphere ? new THREE.SphereGeometry(r * 1.025, 12, 7) : new THREE.CapsuleGeometry(r * 1.025, length, 3, 12), silver);
      if (a.blanket === 'gold' || a.blanket === 'peeled') {
        const span = a.blanket === 'peeled' ? Math.PI * mix(0.8, 1.3, random()) : Math.PI * 2;
        const turn = random() * 6;
        if (sphere) {
          add(group, new THREE.SphereGeometry(r * 1.025, 14, 3, turn, span, Math.PI * 0.16, Math.PI * 0.2), gold);
          add(group, new THREE.SphereGeometry(r * 1.025, 14, 3, turn + 1, span, Math.PI * 0.6, Math.PI * 0.2), gold);
        } else {
          add(group, new THREE.CylinderGeometry(r * 1.03, r * 1.03, length * 0.3, 14, 2, true, turn, span), gold, 0, length * 0.24, 0);
          add(group, new THREE.CylinderGeometry(r * 1.03, r * 1.03, length * 0.3, 14, 2, true, turn + 1, span), gold, 0, -length * 0.2, 0);
        }
        if (a.blanket === 'peeled')
          for (let k = 0; k < 3; k++) {
            const t = turn + span + random() * 0.6;
            const strip = add(group, new THREE.PlaneGeometry(r * 0.35, r * mix(0.6, 1.3, random()), 1, 3), gold, Math.sin(t) * r * 1.15, (random() - 0.5) * Math.max(length, r), Math.cos(t) * r * 1.15);
            strip.rotation.set(random() - 0.5, t, random() - 0.5);
          }
      }
      // Collars, straps, the hazard band and a valve cap.
      const ringAt = sphere ? [0] : [length * 0.46, -length * 0.46, 0.02];
      for (const y of ringAt) add(group, new THREE.TorusGeometry(r * 1.03, r * 0.035, 6, 28).rotateX(Math.PI / 2), girder, 0, y, 0);
      add(group, new THREE.CylinderGeometry(r * 1.045, r * 1.045, r * 0.2, 28, 1, true), stripes(Math.round(r * 5)), 0, sphere ? -r * 0.12 : -length * 0.36, 0);
      const top = length / 2 + r;
      add(group, new THREE.CylinderGeometry(r * 0.34, r * 0.5, r * 0.22, 16), collar, 0, top - r * 0.04, 0);
      add(group, new THREE.CylinderGeometry(r * 0.16, r * 0.16, r * 0.3, 10), dark, 0, top + r * 0.14, 0);
      if (!sphere) add(group, new THREE.CylinderGeometry(r * 1.04, r * 1.04, r * 0.16, 28, 1, true), collar, 0, length * 0.36, 0);
      // Gauge: a ladder of lights up the side that faces the viewer.
      const lights = 6, on = Math.round(a.level * lights * mix(0.8, 1, random()));
      const side = lie === 'z' ? [0, 0, 0] : [0, 0, 1];
      void side;
      for (let k = 0; k < lights; k++) {
        const along = sphere ? (k - 2.5) * r * 0.17 : (k - 2.5) * Math.min(length, r * 2) * 0.13;
        const reach = sphere ? Math.sqrt(Math.max(r * r - along * along, 0)) * 1.03 : r * 1.06;
        const material = on === 0 && k === 0 ? gaugeLow : k < on ? gaugeOn : gaugeOff;
        const dot = add(group, new THREE.BoxGeometry(r * 0.16, r * 0.1, r * 0.06), material, 0, along, reach);
        if (lie === 'z') { dot.position.set(reach * 0.72, along, -reach * 0.72); dot.rotation.y = -Math.PI / 4 + Math.PI; }
        if (lie === 'x') dot.rotation.z = Math.PI / 2;
        dot.castShadow = false;
      }
      for (let k = 0, n = Math.round(mood.wear * 4 * random() + mood.wear); k < n; k++) {
        const t = random() * 6.28;
        add(group, new THREE.SphereGeometry(r * mix(0.12, 0.3, random()), 8, 5), stain, Math.sin(t) * r * 0.97, (random() - 0.5) * (length + r), Math.cos(t) * r * 0.97).scale.z = 0.4;
      }
      return group;
    };

    // ---- the cluster ---------------------------------------------------------------
    const deck = 1.5;
    let width = 8, depth = 8, top = 10;
    if (a.layout === 'single') {
      tank(4.3, 0, [0, deck + 4.6, 0]);
      for (let k = 0; k < 8; k++) {
        const t = (k / 8) * Math.PI * 2 + 0.39;
        s.rod([Math.cos(t) * 4.6, deck, Math.sin(t) * 4.6], [Math.cos(t) * 4.25, deck + 4.2, Math.sin(t) * 4.25], 0.12, girder);
      }
      width = depth = 10.4; top = deck + 9.2;
    } else if (a.layout === 'pair') {
      for (const x of [-2.5, 2.5]) { tank(2.3, 5.6, [x, deck + 5.3, 0]); s.cylinder(1.6, 2.0, 0.5, [x, deck + 0.25, 0], girder, 16); }
      s.box([1.2, 0.3, 0.5], [0, deck + 6.2, 0], girder); s.box([1.2, 0.3, 0.5], [0, deck + 3.2, 0], girder);
      width = 10.6; depth = 6; top = deck + 10.6;
    } else if (a.layout === 'quad') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) { tank(2.25, 0, [x * 2.55, deck + 2.7, z * 2.55]); s.cylinder(0.9, 1.3, 0.5, [x * 2.55, deck + 0.25, z * 2.55], girder, 12); }
      tank(0.95, 5.2, [0, deck + 4.6, 0]);
      width = depth = 10.4; top = deck + 8.3;
    } else if (a.layout === 'rack') {
      for (let tier = 0; tier < 2; tier++) for (const x of [-2.5, 0, 2.5]) tank(1.05, 4.2, [x, deck + 1.25 + tier * 2.5, 0], 'z');
      for (const x of [-3.75, -1.25, 1.25, 3.75]) for (const z of [-2.2, 2.2]) s.box([0.18, 5.2, 0.18], [x, deck + 2.6, z], girder);
      for (const z of [-2.2, 2.2]) for (const y of [2.5, 5.1]) s.box([7.7, 0.16, 0.16], [0, deck + y, z], girder);
      width = 9; depth = 7.6; top = deck + 5.4;
    } else {
      tank(2.5, 7.4, [0, deck + 3.0, 0], 'x');
      for (const x of [-3.9, -1.3, 1.3, 3.9]) tank(1.1, 0, [x, deck + 6.4, 0]);
      for (const x of [-3.2, 3.2]) { s.box([0.5, 3.0, 5.4], [x, deck + 0.4, 0], girder); }
      width = 13.4; depth = 6.4; top = deck + 7.6;
    }

    // ---- skid ----------------------------------------------------------------------
    s.box([width, 0.22, depth], [0, deck - 0.11, 0], s.material('#7b828a', { metalness: 0.3, roughness: 0.55 }));
    for (const z of [-depth / 2, depth / 2]) s.box([width + 0.3, 0.5, 0.3], [0, deck - 0.3, z], girder);
    for (const x of [-width / 2, width / 2]) s.box([0.3, 0.5, depth + 0.3], [x, deck - 0.3, 0], girder);
    s.mesh(new THREE.BoxGeometry(width * 0.5, 0.26, 0.34), stripes(8), [0, deck - 0.3, depth / 2 + 0.03]);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.rod([x * (width / 2 - 0.5), deck - 0.4, z * (depth / 2 - 0.5)], [x * (width / 2 + 0.3), 0.15, z * (depth / 2 + 0.3)], 0.14, girder);
      s.cylinder(0.55, 0.65, 0.16, [x * (width / 2 + 0.3), 0.08, z * (depth / 2 + 0.3)], dark, 12);
    }
    // Stencilled placard on the front rail.
    const placard = s.label(CARGO_TEXT[a.cargo], 2.2, 1.0, [-width / 2 + 1.6, deck + 0.75, depth / 2 + 0.06], '#1b1b1d', '#f3efe2');
    placard.castShadow = false;
    s.box([2.36, 1.16, 0.06], [-width / 2 + 1.6, deck + 0.75, depth / 2 + 0.01], collar);

    // ---- fill arm ------------------------------------------------------------------
    const px = width / 2 - 0.7, pz = depth / 2 - 0.5;
    s.cylinder(0.32, 0.42, 2.6, [px, deck + 1.3, pz], s.material('#e3b21f', { roughness: 0.5 }), 12);
    s.mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.5, 12, 1, true), stripes(4), [px, deck + 0.5, pz]);
    const shoulder: [number, number, number] = [px, deck + 2.6, pz];
    const pose = {
      stowed: { elbow: [px - 0.3, deck + 4.9, pz - 0.2], hand: [px - 0.9, deck + 2.5, pz + 0.3] },
      waiting: { elbow: [px + 1.6, deck + 4.7, pz + 1.3], hand: [px + 3.8, deck + 3.3, pz + 3.0] },
      hooked: { elbow: [px + 1.4, deck + 4.9, pz + 1.5], hand: [px + 3.4, deck + 3.6, pz + 3.4] },
      leaking: { elbow: [px + 1.9, deck + 3.6, pz + 0.6], hand: [px + 2.6, deck + 1.2, pz + 1.9] },
    }[a.arm] as { elbow: [number, number, number]; hand: [number, number, number] };
    s.rod(shoulder, pose.elbow, 0.16, girder);
    s.rod(pose.elbow, pose.hand, 0.13, girder);
    s.ball([0.28, 0.28, 0.28], shoulder, dark, 10); s.ball([0.24, 0.24, 0.24], pose.elbow, dark, 10);
    const nozzle = s.cylinder(0.14, 0.3, 0.7, pose.hand, a.arm === 'stowed' ? dark : collar, 12);
    nozzle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(pose.hand[0] - pose.elbow[0], pose.hand[1] - pose.elbow[1], pose.hand[2] - pose.elbow[2]).normalize());
    const hoseEnd: [number, number, number] = a.arm === 'leaking' ? [px + 4.4 + random(), deck + 3.4 + random() * 2, pz + 3.6 + random()] : pose.hand;
    s.tube([[px - 1.6, deck + 0.4, pz - 0.6], [px - 0.6, deck + 0.9 + random() * 0.6, pz + 0.9], [mix(px, hoseEnd[0], 0.5), mix(deck + 1.4, hoseEnd[1], 0.5) - 0.9, mix(pz, hoseEnd[2], 0.5) + 0.5], hoseEnd], 0.1, dark);
    if (a.arm === 'hooked') {
      const [hx, hy, hz] = pose.hand;
      const pod = new THREE.Group();
      pod.position.set(hx + 0.9, hy - 0.4, hz + 1.5);
      pod.rotation.set(0.35, 0.5, Math.PI / 2 - 0.3);
      s.root.add(pod);
      add(pod, new THREE.CapsuleGeometry(1.0, 2.2, 6, 18), s.material('#dfe3e6', { roughness: 0.5 }));
      add(pod, new THREE.CylinderGeometry(1.03, 1.03, 0.45, 18, 1, true), collar, 0, 0.6, 0);
      add(pod, new THREE.CylinderGeometry(1.03, 1.03, 0.3, 18, 1, true), stripes(6), 0, -0.7, 0);
      add(pod, new THREE.CylinderGeometry(0.5, 0.8, 0.5, 12), dark, 0, -2.2, 0);
    }
    if (a.arm === 'leaking') {
      const flakes = Array.from({ length: 46 }, () => {
        const spread = random() * 3.4;
        return { at: [hoseEnd[0] + spread * 0.6 + (random() - 0.5) * spread, hoseEnd[1] + spread * 0.5 + (random() - 0.5) * spread, hoseEnd[2] + spread * 0.5 + (random() - 0.5) * spread] as [number, number, number], size: 0.05 + random() * 0.13 };
      });
      s.scatter(new THREE.OctahedronGeometry(1), new THREE.MeshStandardMaterial({ color: '#f4fbff', emissive: '#bfe6ff', emissiveIntensity: 0.6 }), flakes);
    }

    // ---- canopy and sign -----------------------------------------------------------
    const text = SIGNS[a.sign];
    const signOn = a.sign !== 'closed' && a.sign !== 'none';
    const signInk = signOn ? '#fff7d6' : '#8f8a7c', signPaper = signOn ? (mood.cheer > 0.5 ? '#c8402c' : '#1f3f7a') : '#3a3d42';
    const glowSign = (mesh: THREE.Mesh) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (signOn) { material.emissive = new THREE.Color('#ffffff'); material.emissiveMap = material.map; material.emissiveIntensity = mix(0.5, 1.1, mood.cheer); }
      mesh.castShadow = false;
    };
    let beacon: THREE.Mesh;
    if (a.canopy) {
      const roofY = top + 1.6;
      const roof = s.material('#e9e6dc', { roughness: 0.6 });
      s.box([width + 3, 0.5, depth + 3], [0, roofY, 0], roof);
      s.box([width + 3.1, 0.18, depth + 3.1], [0, roofY - 0.2, 0], collar);
      for (const x of [-1, 1]) s.cylinder(0.22, 0.28, roofY - deck, [x * (width / 2 - 0.3), (roofY + deck) / 2, -depth / 2 + 0.4], girder, 10);
      const tubeLight = new THREE.MeshStandardMaterial({ color: '#fff8dc', emissive: new THREE.Color().setHSL(mix(0.55, 0.11, mood.warmth), 0.7, 0.75), emissiveIntensity: signOn || a.sign === 'none' ? 1.6 : 0.15 });
      for (const x of [-width / 4, width / 4]) s.box([0.3, 0.1, depth * 0.8], [x, roofY - 0.3, 0], tubeLight).castShadow = false;
      if (text) glowSign(s.label(text, Math.min(width, 7), 0.42, [0, roofY, depth / 2 + 1.52], signInk, signPaper));
      beacon = s.ball([0.25, 0.25, 0.25], [width / 2 + 1.2, roofY + 0.45, depth / 2 + 1.2], gaugeLow, 10);
    } else {
      const mastX = -width / 2 + 0.4, mastZ = -depth / 2 + 0.6;
      const mastTop = top + (text ? 3.4 : 1.6);
      s.cylinder(0.14, 0.2, mastTop - deck, [mastX, (mastTop + deck) / 2, mastZ], girder, 8);
      if (text) {
        s.box([4.3, 1.5, 0.3], [mastX + 1.4, mastTop - 0.9, mastZ], dark);
        glowSign(s.label(text, 4.0, 1.2, [mastX + 1.4, mastTop - 0.9, mastZ + 0.16], signInk, signPaper));
      }
      beacon = s.ball([0.25, 0.25, 0.25], [mastX, mastTop + 0.2, mastZ], gaugeLow, 10);
    }
    beacon.castShadow = false;

    const beaconMaterial = new THREE.MeshStandardMaterial({ color: '#ff4030', emissive: '#ff2a1a', emissiveIntensity: 2 });
    beacon.material = beaconMaterial;
    const rate = mix(0.6, 5, mood.energy);
    return s.finish({ update: (_dt, time) => { beaconMaterial.emissiveIntensity = Math.sin(time * rate) > 0.3 ? 2.6 : 0.2; } });
  },
});
