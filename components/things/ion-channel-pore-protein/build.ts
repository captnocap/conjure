import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, score } from '@conjure/kit';
import { PALETTES, STYLES, bilayer, helixCurve, paint, tone } from './membrane';

const IONS = {
  sodium: 'Sodium: a quick file of small violet beads.',
  potassium: 'Potassium: plump amber-orange beads in single file.',
  calcium: 'Calcium: little bright green beads, each wearing a pale halo of charge.',
  chloride: 'Chloride: big lemon-yellow beads crowding the mouth.',
  water: 'Water: tiny red-and-white bent molecules filing through an aquaporin.',
} as const;
const ION_LOOK: Record<keyof typeof IONS, { color: string; size: number }> = {
  sodium: { color: '#8a4fe0', size: 0.0135 },
  potassium: { color: '#f08a24', size: 0.017 },
  calcium: { color: '#3fcf5a', size: 0.012 },
  chloride: { color: '#e6d12c', size: 0.019 },
  water: { color: '#e0412f', size: 0.012 },
};

export default defineThing({
  questions: {
    ion: choice('What passes through the channel?', IONS),
    state: choice('What is the gate doing right now?', {
      open: 'Swung wide open: the pore glows and the ions stream through in single file.',
      closed: 'Shut tight: the flaps meet over the mouth and the ions wait in a queue on top.',
      flicker: 'Flickering: the gate snaps open and shut, letting ions through in bursts.',
      plugged: 'Jammed by a toxin: a spiky foreign molecule is wedged in the mouth and the ions pile up behind it.',
    }),
    sensor: choice('What opens it?', {
      voltage: 'Voltage: paddle-like sensor arms stand at its sides studded with bright plus charges.',
      ligand: 'A messenger molecule: small ring-shaped molecules are docked in pockets on its crown.',
      light: 'Light: a glowing amber pigment sits inside and a shaft of light falls on it.',
      leak: 'Nothing: a plain leak channel, always ready, no sensors.',
    }),
    subunits: choice('How many units make up the barrel?', {
      four: 'Four, square and compact, like a potassium channel.',
      five: 'Five, a rosette with a tall funnel, like a receptor channel.',
      six: 'Six, a wide hexagonal tube, like a gap junction connexon.',
    }),
    form: choice('How are its helices drawn?', {
      ribbon: 'Coiled ribbons, springs of protein like a structural biology figure.',
      rods: 'Smooth fat cylinders, the cartoon tube diagram.',
    }),
    height: score('How far does the protein tower above the membrane?', ['Barely above the lipid heads', 'A modest crown', 'A tall funnel rising high above']),
    style: choice('How is it drawn?', STYLES),
  },

  build(a, context) {
    const { mood, random } = context;
    const palette = PALETTES[a.style];
    const root = new THREE.Group();
    const n = { four: 4, five: 5, six: 6 }[a.subunits];
    const pore = { four: 0.03, five: 0.036, six: 0.047 }[a.subunits];
    const T = 0.13;
    const top = T + mix(0.07, 0.24, a.height) + (a.subunits === 'five' ? 0.04 : 0);
    const inner = pore + 0.021;
    const outer = inner + 0.027;
    const sensorReach = a.sensor === 'voltage' ? outer + 0.05 : outer + 0.012;

    // The slab of bilayer, with a hole where the protein stands.
    const patch = bilayer(context, palette, {
      width: 0.5, depth: 0.4, head: 0.0135, thickness: T,
      hole: (x, z) => Math.hypot(x, z) < sensorReach + 0.008,
      mix: 0.28,
    });
    root.add(patch.group);

    const colours = palette.protein.map((hex) => hex);
    const materials = colours.map((hex) => paint(hex, context, a.style));
    const light = colours.map((hex) => paint(new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), 0.3), context, a.style));
    const Y = new THREE.Vector3(0, 1, 0);

    // One helix stood between two points.
    const helix = (from: THREE.Vector3, to: THREE.Vector3, material: THREE.Material, thick = 1) => {
      const length = from.distanceTo(to);
      const geometry = a.form === 'ribbon'
        ? new THREE.TubeGeometry(helixCurve(0.0135 * thick, length, length / 0.028, random() * 6), Math.round(length / 0.028 * 9), 0.0058 * thick, 5)
        : new THREE.CapsuleGeometry(0.0165 * thick, length - 0.033, 4, 10).translate(0, length / 2, 0);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(from);
      mesh.quaternion.setFromUnitVectors(Y, to.clone().sub(from).normalize());
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };
    const blob = (size: [number, number, number], at: THREE.Vector3, material: THREE.Material, turn = 0) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), material);
      mesh.scale.set(...size);
      mesh.position.copy(at);
      mesh.rotation.y = turn;
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };

    const hinges: THREE.Group[] = [];
    for (let k = 0; k < n; k++) {
      const angle = (k / n) * Math.PI * 2 + 0.3;
      const c = Math.cos(angle), s = Math.sin(angle);
      const material = materials[k % materials.length];
      const pale = light[k % light.length];
      // An inner pore helix leaning out like a teepee, and an outer helix beside it.
      helix(new THREE.Vector3(c * inner * 0.7, -0.01, s * inner * 0.7), new THREE.Vector3(c * inner, top - 0.01, s * inner), material);
      const side = angle + Math.PI / n * 0.9;
      helix(new THREE.Vector3(Math.cos(side) * outer, -0.01, Math.sin(side) * outer), new THREE.Vector3(Math.cos(side) * outer * 1.08, top - 0.04, Math.sin(side) * outer * 1.08), pale);
      {
        const back = angle - Math.PI / n * 0.6;
        helix(new THREE.Vector3(Math.cos(back) * outer * 1.05, 0.0, Math.sin(back) * outer * 1.05), new THREE.Vector3(Math.cos(back) * outer, top - 0.06, Math.sin(back) * outer), material, 0.9);
      }
      // The turret: a lump of loops crowning each unit around the mouth.
      blob([0.027, 0.012 + a.height * 0.008, 0.022], new THREE.Vector3(c * (inner + 0.012), top + 0.004, s * (inner + 0.012)), pale, -angle);
      if (a.subunits === 'five') blob([0.018, 0.04, 0.016], new THREE.Vector3(c * (inner + 0.02), top - 0.045, s * (inner + 0.02)), material, -angle);
      // A small cytoplasmic foot under each unit, visible at the cut.
      blob([0.016, 0.012, 0.016], new THREE.Vector3(c * inner * 0.9, 0.012, s * inner * 0.9), material);

      // The hinged gate: one flap per unit, pivoting on the rim of the mouth.
      const pivot = new THREE.Group();
      pivot.position.set(c * (pore + 0.006), top + 0.012, s * (pore + 0.006));
      pivot.rotation.y = -angle;
      const hinge = new THREE.Group();
      const flapWidth = (Math.PI * 2 * (pore + 0.006)) / n * 0.62;
      const flap = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), pale);
      flap.scale.set((pore + 0.006) / 2 + 0.002, 0.0045, flapWidth);
      flap.position.x = -(pore + 0.006) / 2;
      flap.castShadow = flap.receiveShadow = true;
      hinge.add(flap);
      pivot.add(hinge);
      root.add(pivot);
      hinges.push(hinge);

      // Sensors.
      if (a.sensor === 'voltage') {
        const at = angle + Math.PI / n;
        const r = outer + 0.032;
        const base = new THREE.Vector3(Math.cos(at) * r, 0.0, Math.sin(at) * r);
        for (let h = 0; h < 3; h++) {
          const o = at + (h - 1) * 0.28;
          helix(new THREE.Vector3(Math.cos(o) * r, 0.0, Math.sin(o) * r), new THREE.Vector3(Math.cos(o) * (r + 0.006), T + 0.025 + h * 0.008, Math.sin(o) * (r + 0.006)), h === 1 ? material : pale, 0.85);
        }
        const plus = new THREE.MeshStandardMaterial({ color: '#2e7bff', emissive: '#4f9bff', emissiveIntensity: 0.6, roughness: 0.4 });
        for (let q = 0; q < 3; q++) {
          const charge = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 10, 8), plus);
          charge.position.set(Math.cos(at) * (r + 0.019), T * 0.45 + q * 0.035, Math.sin(at) * (r + 0.019));
          charge.castShadow = true;
          root.add(charge);
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.0022, 0.0022), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
          bar.position.copy(charge.position).add(new THREE.Vector3(Math.cos(at) * 0.0072, 0, Math.sin(at) * 0.0072));
          bar.rotation.y = -at + Math.PI / 2;
          const bar2 = bar.clone();
          bar2.rotation.set(0, -at + Math.PI / 2, Math.PI / 2);
          root.add(bar, bar2);
        }
        void base;
      } else if (a.sensor === 'ligand' && (k % 2 === 0 || n === 4)) {
        // A ring-shaped messenger, ball-and-stick, docked in a pocket on the crown.
        const ligand = new THREE.Group();
        const atom = paint(palette.protein[3], context, a.style, { emissive: tone(palette.protein[3], context), emissiveIntensity: 0.25 });
        for (let q = 0; q < 6; q++) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 10, 8), atom);
          b.position.set(Math.cos(q * Math.PI / 3) * 0.011, 0, Math.sin(q * Math.PI / 3) * 0.011);
          b.castShadow = true;
          ligand.add(b);
        }
        const ringBond = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0018, 4, 6), atom);
        ringBond.rotation.x = Math.PI / 2;
        ligand.add(ringBond);
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 10, 8), atom);
        tail.position.set(0.02, 0.004, 0);
        ligand.add(tail);
        ligand.position.set(c * (inner + 0.03), top + 0.014, s * (inner + 0.03));
        ligand.rotation.set(0.5, -angle, 0.3);
        root.add(ligand);
      }
    }

    // The glow down the pore when it is open.
    const glowMaterial = new THREE.MeshBasicMaterial({ color: tone(palette.glow, context), transparent: true, opacity: 0.4, depthWrite: false });
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(pore * 0.8, pore * 0.55, top + 0.02, 16, 1, true), glowMaterial);
    glow.position.y = (top + 0.02) / 2 - 0.01;
    root.add(glow);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(pore * 2.2, 24), new THREE.MeshBasicMaterial({ color: tone(palette.glow, context), transparent: true, opacity: 0.3, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = top + 0.006;
    root.add(halo);

    if (a.sensor === 'light') {
      const pigment = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.05, 4, 8), new THREE.MeshStandardMaterial({ color: '#ffb21a', emissive: '#ff9a00', emissiveIntensity: 0.9 }));
      pigment.position.set(outer * 0.95, T * 0.6, outer * 0.4);
      pigment.rotation.z = 1.1;
      root.add(pigment);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.09, 0.5, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe680', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.set(-0.08, top + 0.2, 0.05);
      beam.rotation.z = -0.45;
      root.add(beam);
    }

    // The toxin plug.
    const plugged = a.state === 'plugged';
    if (plugged) {
      const toxin = new THREE.Group();
      const tox = paint(a.style === 'micrograph' ? '#4a4a46' : '#8c1f3a', context, a.style);
      const core = new THREE.Mesh(new THREE.DodecahedronGeometry(pore * 1.05, 0), tox);
      core.castShadow = true;
      toxin.add(core);
      for (let q = 0; q < 9; q++) {
        const dir = new THREE.Vector3(random() - 0.5, random() * 0.8, random() - 0.5).normalize();
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.026, 6), tox);
        spike.position.copy(dir).multiplyScalar(pore * 1.1);
        spike.quaternion.setFromUnitVectors(Y, dir);
        spike.castShadow = true;
        toxin.add(spike);
      }
      toxin.position.set(0, top + pore * 0.55, 0);
      root.add(toxin);
    }

    // The queue of ions: a path that wanders in over the membrane and drops down the axis.
    const look = ION_LOOK[a.ion];
    const swing = random() * Math.PI * 2;
    const far = 0.17 + random() * 0.04;
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(swing) * far, T + 0.03, Math.sin(swing) * far),
      new THREE.Vector3(Math.cos(swing + 0.5) * far * 0.6, top + 0.05, Math.sin(swing + 0.5) * far * 0.6),
      new THREE.Vector3(Math.cos(swing + 0.9) * 0.025, top + 0.045, Math.sin(swing + 0.9) * 0.025),
      new THREE.Vector3(0, top - 0.01, 0),
      new THREE.Vector3(0, T * 0.5, 0),
      new THREE.Vector3(0, -0.03, 0),
    ]);
    const total = path.getLength();
    const gateAt = 1 - (top + 0.03 - -0.03) / total;
    const count = Math.round(mix(6, 14, mood.density));
    const ionMaterial = new THREE.MeshStandardMaterial({ color: tone(look.color, context), emissive: tone(look.color, context), emissiveIntensity: 0.15, roughness: 0.35, metalness: 0.05 });
    const shell = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false });
    const hydrogen = new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.4 });
    const ions: THREE.Object3D[] = [];
    for (let q = 0; q < count; q++) {
      const ion = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(look.size, 14, 10), ionMaterial);
      ball.castShadow = true;
      ion.add(ball);
      if (a.ion === 'calcium') ion.add(new THREE.Mesh(new THREE.SphereGeometry(look.size * 1.6, 12, 8), shell));
      if (a.ion === 'water') for (const side of [-1, 1]) {
        const h = new THREE.Mesh(new THREE.SphereGeometry(look.size * 0.62, 10, 8), hydrogen);
        h.position.set(side * look.size * 0.8, look.size * 0.6, 0);
        ion.add(h);
      }
      ion.rotation.set(random() * 6, random() * 6, 0);
      root.add(ion);
      ions.push(ion);
    }
    const spacing = (look.size * 2.5) / total;
    // Beads that do not fit in the queue wait in a loose crowd where the path begins.
    const crowd = ions.map(() => new THREE.Vector3((random() - 0.5) * 0.09, look.size + random() * 0.03, (random() - 0.5) * 0.09));
    const start = path.getPointAt(0);
    // Where each bead sits along the path, 0..1.
    const place = (shift: number, open: number) => {
      const flowing = open > 0.5 && !plugged;
      ions.forEach((ion, q) => {
        if (flowing) {
          ion.position.copy(path.getPointAt(((q / count + shift) % 1) * 0.985));
        } else {
          const t = gateAt - (plugged ? 0.05 : 0.025) - q * spacing;
          if (t > 0.03) ion.position.copy(path.getPointAt(t));
          else ion.position.copy(start).add(crowd[q]);
        }
        ion.visible = ion.position.y > -0.012;
      });
    };

    const speed = mix(0.02, 0.16, mood.energy);
    let shift = random();
    let gate = a.state === 'open' ? 1 : a.state === 'flicker' ? (random() > 0.5 ? 1 : 0) : 0;
    const setGate = (open: number) => {
      for (const hinge of hinges) hinge.rotation.z = mix(0.12, -1.25, open);
      glowMaterial.opacity = mix(0.04, 0.42, open) * mix(0.7, 1.2, mood.cheer);
      (halo.material as THREE.MeshBasicMaterial).opacity = mix(0.0, 0.3, open);
      ionMaterial.emissiveIntensity = mix(0.08, 0.45, open);
    };
    setGate(gate);
    place(shift, gate);

    const update = (dt: number, time: number) => {
      if (a.state === 'flicker') {
        const target = Math.sin(time * mix(1.2, 5, mood.energy) + swing) + Math.sin(time * 2.7) * 0.6 > 0.2 ? 1 : 0;
        gate += (target - gate) * Math.min(1, dt * 12);
        setGate(gate);
      }
      if (gate > 0.5 && !plugged) shift = (shift + dt * speed) % 1;
      place(shift, gate);
    };
    return { object: root, update, dispose: () => disposeTree(root) };
  },
});
