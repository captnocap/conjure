import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, score } from '@conjure/kit';
import { PALETTES, STYLES, helixCurve, instances, paint, revolvedHeads, tone } from './membrane';

const RAILS: Record<keyof typeof STYLES, [string, string]> = {
  pastel: ['#dfe8f2', '#93b4d9'],
  micrograph: ['#d2d2cb', '#8d8d87'],
  glossy: ['#a6ec84', '#2e9e5a'],
};

export default defineThing({
  questions: {
    motor: choice('Which motor is doing the carrying?', {
      kinesin: 'Kinesin: two neat round feet stepping hand over hand on a microtubule, a long thin stalk above.',
      dynein: 'Dynein: two big wheel-shaped heads on long thin stilts, shuffling backwards along a microtubule.',
      myosin: 'Myosin V: long lever legs taking huge strides along a twisted actin cable.',
    }),
    cargo: choice('What is it carrying?', {
      vesicle: 'A bubble of membrane, its lipid heads tiled like a ball.',
      mitochondrion: 'A striped bean-shaped mitochondrion, the cell\'s power plant.',
      granule: 'A tangled ball of messenger RNA with loops of ribbon sticking out.',
      cluster: 'A bunch of small vesicles held together like grapes.',
    }),
    load: score('How big is the load?', ['A light parcel', 'A fair burden', 'An enormous, comical load']),
    gait: choice('What is the walker doing right now?', {
      striding: 'Striding: one foot swinging over the other, marching on.',
      resting: 'Resting with both feet down, catching its breath.',
      straining: 'Straining against the load, leaning back, barely inching forward.',
      slipping: 'Slipping: one foot has come loose and it is tipping off the rail.',
    }),
    rail: choice('What is the track like?', {
      fresh: 'A clean straight rail.',
      fraying: 'The far end of the rail is fraying, its strands curling back like a peeled banana.',
      roadblock: 'A lumpy protein roadblock sits on the rail ahead.',
      crossing: 'Another rail crosses over this one ahead, a junction to negotiate.',
    }),
    style: choice('How is it drawn?', STYLES),
  },

  build(a, context) {
    const { mood, random } = context;
    const palette = PALETTES[a.style];
    const root = new THREE.Group();
    const Y = new THREE.Vector3(0, 1, 0);
    const actin = a.motor === 'myosin';
    const dir = a.motor === 'dynein' ? -1 : 1;
    const L = 0.64;
    const [alpha, beta] = RAILS[a.style];

    // The rail: a hollow tube of thirteen bead strands, or a twisted double string for actin.
    const railBeads = (length: number, at: THREE.Vector3, turn: number, fray: boolean) => {
      const light: { matrix: THREE.Matrix4 }[] = [];
      const dark: { matrix: THREE.Matrix4 }[] = [];
      const q = new THREE.Quaternion().setFromAxisAngle(Y, turn);
      if (actin) {
        const rb = 0.0115, step = 0.0185;
        const count = Math.round(length / step);
        for (let i = 0; i < count; i++) for (let s = 0; s < 2; s++) {
          const angle = i * (Math.PI / 13) + s * Math.PI;
          const p = new THREE.Vector3(-length / 2 + i * step + s * step / 2, Math.cos(angle) * 0.011, Math.sin(angle) * 0.011).applyQuaternion(q).add(at);
          (s ? dark : light).push({ matrix: new THREE.Matrix4().compose(p, new THREE.Quaternion(), new THREE.Vector3(rb, rb, rb)) });
        }
        return { light, dark, top: at.y + 0.011 + rb };
      }
      const Rm = 0.03, rb = 0.0082, step = 0.0158;
      const count = Math.round(length / step);
      for (let i = 0; i < count; i++) for (let p = 0; p < 13; p++) {
        const angle = (p / 13) * Math.PI * 2;
        let x = -length / 2 + i * step + p * (3 * step / 13) * 0.5;
        let r = Rm;
        const k = fray ? i - (count - 7) : -1;
        if (k > 0) {
          // Peeling strands curl outward and back.
          r += k * k * 0.0028;
          x -= k * k * 0.0012;
        }
        const pos = new THREE.Vector3(x, Math.cos(angle) * r, Math.sin(angle) * r).applyQuaternion(q).add(at);
        ((i + (p > 9 ? 1 : 0)) % 2 ? dark : light).push({ matrix: new THREE.Matrix4().compose(pos, new THREE.Quaternion(), new THREE.Vector3(rb * 1.05, rb, rb)) });
      }
      return { light, dark, top: at.y + Rm + rb };
    };
    const lightMaterial = paint(alpha, context, a.style);
    const darkMaterial = paint(beta, context, a.style);
    const bead = new THREE.SphereGeometry(1, 10, 7);
    const railY = actin ? 0.024 : 0.039;
    const rail = railBeads(L, new THREE.Vector3(0, railY, 0), 0, a.rail === 'fraying');
    root.add(instances(bead, lightMaterial, rail.light), instances(bead, darkMaterial, rail.dark));
    const top = rail.top;
    // Small footings so the rail rests on something.
    for (const x of [-L * 0.36, L * 0.36]) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, railY - (actin ? 0.012 : 0.03), 10), paint(palette.protein[2], context, a.style));
      foot.position.set(x, (railY - (actin ? 0.012 : 0.03)) / 2, 0);
      foot.castShadow = true;
      root.add(foot);
    }

    // What lies ahead.
    let reachEnd = L * 0.3;
    if (a.rail === 'roadblock') {
      const block = new THREE.Group();
      const lump = paint(palette.protein[3], context, a.style);
      for (let i = 0; i < 5; i++) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(0.03 + random() * 0.015, 14, 10), lump);
        blob.position.set((random() - 0.5) * 0.05, top + 0.015 + random() * 0.035, (random() - 0.5) * 0.04);
        blob.castShadow = true;
        block.add(blob);
      }
      block.position.x = dir * L * 0.3;
      root.add(block);
      reachEnd = L * 0.16;
    } else if (a.rail === 'crossing') {
      const cross = railBeads(L * 0.8, new THREE.Vector3(dir * L * 0.32, top + (actin ? 0.012 : 0.031), 0), Math.PI / 2 - 0.35, false);
      root.add(instances(bead, lightMaterial, cross.light), instances(bead, darkMaterial, cross.dark));
      for (const z of [-0.26, 0.26]) {
        const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, top + 0.01, 10), paint(palette.protein[2], context, a.style));
        prop.position.set(dir * L * 0.32 + Math.sin(0.35) * z * -1, (top + 0.01) / 2, z * Math.cos(0.35));
        prop.castShadow = true;
        root.add(prop);
      }
      reachEnd = L * 0.14;
    }

    // The motor's dimensions.
    const spec = {
      kinesin: { d: 0.042, lift: 0.045, headY: top + 0.018, junction: top + 0.11, head: [0.036, 0.025, 0.029] },
      dynein: { d: 0.045, lift: 0.022, headY: top + 0.1, junction: top + 0.175, head: [0.04, 0.04, 0.02] },
      myosin: { d: 0.07, lift: 0.055, headY: top + 0.018, junction: top + 0.13, head: [0.03, 0.022, 0.024] },
    }[a.motor];
    const headMaterial = paint(palette.protein[0], context, a.style);
    const neckMaterial = paint(palette.protein[1], context, a.style);
    const accent = paint(palette.protein[3], context, a.style);

    const walker = new THREE.Group();
    root.add(walker);
    const heads: THREE.Group[] = [];
    const rods: THREE.Mesh[] = [];
    const stilts: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
      const head = new THREE.Group();
      if (a.motor === 'dynein') {
        // A ring of six domains round a hub, standing upright, with a stilt down to the rail.
        for (let k = 0; k < 6; k++) {
          const angle = (k / 6) * Math.PI * 2;
          const domain = new THREE.Mesh(new THREE.SphereGeometry(0.0145, 12, 9), k === 0 ? accent : headMaterial);
          domain.position.set(Math.cos(angle) * 0.036, Math.sin(angle) * 0.036, 0);
          domain.scale.set(1, 1, 0.8);
          head.add(domain);
        }
        head.add(new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.007, 6, 24), neckMaterial));
        head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.014, 10).rotateX(Math.PI / 2), accent));
        const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 1, 6), neckMaterial);
        root.add(stilt);
        stilts.push(stilt);
      } else {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), headMaterial);
        blob.scale.set(...(spec.head as [number, number, number]));
        head.add(blob);
        const nose = new THREE.Mesh(new THREE.SphereGeometry(spec.head[0] * 0.45, 10, 8), accent);
        nose.position.set(dir * spec.head[0] * 0.8, spec.head[1] * 0.3, 0);
        head.add(nose);
      }
      head.traverse((node) => { node.castShadow = true; });
      head.position.z = (i ? -1 : 1) * (a.motor === 'dynein' ? 0.036 : 0.008);
      walker.add(head);
      heads.push(head);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(actin ? 0.0085 : 0.0072, actin ? 0.0085 : 0.0072, 1, 8), actin ? accent : neckMaterial);
      rod.castShadow = true;
      walker.add(rod);
      rods.push(rod);
    }

    // The stalk: a coiled coil of two strands, hinged once, carrying the load on top.
    const body = new THREE.Group();
    body.position.y = spec.junction;
    walker.add(body);
    const stalkLength = mix(0.15, 0.22, random()) + (a.motor === 'dynein' ? -0.05 : 0);
    const lower = stalkLength * 0.55, upper = stalkLength * 0.45;
    const hinge = new THREE.Group();
    hinge.position.y = lower;
    body.add(hinge);
    for (let s = 0; s < 2; s++) {
      const strand = new THREE.Mesh(new THREE.TubeGeometry(helixCurve(0.0065, lower, lower / 0.036, s * Math.PI), Math.round(lower / 0.003), 0.0058, 6), neckMaterial);
      body.add(strand);
      const strand2 = new THREE.Mesh(new THREE.TubeGeometry(helixCurve(0.0065, upper, upper / 0.036, s * Math.PI), Math.round(upper / 0.003), 0.0058, 6), neckMaterial);
      hinge.add(strand2);
    }
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), accent);
    body.add(knuckle);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), neckMaterial);
    elbow.position.y = lower;
    body.add(elbow);
    hinge.rotation.z = -dir * mix(0.05, 0.3, random());

    // The load, held by light chains at the top of the stalk.
    const cargo = new THREE.Group();
    const r = mix(0.06, 0.15, a.load);
    cargo.position.y = upper + r * 0.92;
    hinge.add(cargo);
    for (let k = 0; k < 2; k++) {
      const grip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), accent);
      grip.position.set((k ? -1 : 1) * 0.016, upper + 0.006, 0);
      hinge.add(grip);
    }
    if (a.cargo === 'vesicle') {
      const ball: [number, number][] = [];
      for (let i = 0; i <= 18; i++) {
        const t = -Math.PI / 2 + (i / 18) * Math.PI;
        ball.push([Math.max(0.0001, Math.cos(t) * r), Math.sin(t) * r]);
      }
      cargo.add(revolvedHeads(context, palette, ball, Math.max(0.0095, r * 0.09), 0.3));
      const inner = new THREE.Mesh(new THREE.SphereGeometry(r * 0.93, 24, 16), paint(palette.core, context, a.style));
      cargo.add(inner);
    } else if (a.cargo === 'mitochondrion') {
      const skin = paint(a.style === 'micrograph' ? '#a3a39c' : a.style === 'glossy' ? '#ff7a4a' : '#f0a07a', context, a.style);
      const ridge = paint(a.style === 'micrograph' ? '#6f6f69' : a.style === 'glossy' ? '#c8401f' : '#d77a5c', context, a.style);
      const bean = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.62, r * 1.3, 8, 20), skin);
      bean.rotation.z = Math.PI / 2;
      cargo.add(bean);
      for (let i = 0; i < 6; i++) {
        const fold = new THREE.Mesh(new THREE.TorusGeometry(r * 0.62, r * 0.05, 6, 28), ridge);
        fold.position.x = -r * 0.85 + i * r * 0.34;
        fold.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.3;
        fold.scale.set(1, 1, 1);
        cargo.add(fold);
      }
      cargo.position.y = upper + r * 0.6;
    } else if (a.cargo === 'granule') {
      const goo = paint(a.style === 'micrograph' ? '#8a8a84' : palette.protein[2], context, a.style);
      for (let i = 0; i < 7; i++) {
        const lump = new THREE.Mesh(new THREE.SphereGeometry(r * mix(0.45, 0.62, random()), 16, 12), goo);
        lump.position.set((random() - 0.5) * r * 0.8, (random() - 0.5) * r * 0.6, (random() - 0.5) * r * 0.8);
        cargo.add(lump);
      }
      const ribbon = new THREE.MeshStandardMaterial({ color: tone(a.style === 'micrograph' ? '#3d3d3a' : '#e8344f', context), roughness: 0.5 });
      for (let i = 0; i < 5; i++) {
        const angle = random() * Math.PI * 2, tilt = (random() - 0.3) * 1.2;
        const out = new THREE.Vector3(Math.cos(angle) * Math.cos(tilt), Math.sin(tilt), Math.sin(angle) * Math.cos(tilt));
        const side = new THREE.Vector3().crossVectors(out, Y).normalize().multiplyScalar(r * 0.3);
        const loop = new THREE.CatmullRomCurve3([out.clone().multiplyScalar(r * 0.5).add(side), out.clone().multiplyScalar(r * 1.15).add(side.clone().multiplyScalar(0.6)), out.clone().multiplyScalar(r * 1.25).sub(side.clone().multiplyScalar(0.6)), out.clone().multiplyScalar(r * 0.5).sub(side)]);
        cargo.add(new THREE.Mesh(new THREE.TubeGeometry(loop, 20, r * 0.05, 6), ribbon));
      }
    } else {
      const skin = paint(palette.heads[0], context, a.style);
      const skin2 = paint(palette.heads[1], context, a.style);
      for (let i = 0; i < 8; i++) {
        const small = r * mix(0.32, 0.46, random());
        const ball = new THREE.Mesh(new THREE.SphereGeometry(small, 16, 12), i % 3 ? skin : skin2);
        const p = new THREE.Vector3(random() - 0.5, random() - 0.35, random() - 0.5).normalize().multiplyScalar(r * 0.55);
        ball.position.copy(p);
        cargo.add(ball);
      }
    }
    cargo.traverse((node) => { node.castShadow = true; node.receiveShadow = true; });
    body.traverse((node) => { node.castShadow = true; });

    // The walk cycle: each foot is planted for half the cycle while the walker advances, then swings over.
    const walking = a.gait === 'striding' || a.gait === 'straining';
    const pace = (a.gait === 'straining' ? 0.25 : 1) * mix(0.12, 1.1, mood.energy);
    const period = 1 / Math.max(pace, 0.01);
    const lean = a.gait === 'straining' ? -dir * 0.32 : 0;
    let phase = a.gait === 'resting' ? 0.02 : a.gait === 'slipping' ? 0.72 : 0.62 + random() * 0.15;
    let travel = L * 0.3;
    const span = reachEnd + L * 0.3;
    const pose = () => {
      const x0 = -L * 0.3 + ((travel % span) + span) % span;
      walker.position.x = dir * x0;
      for (let i = 0; i < 2; i++) {
        const p = (phase + i * 0.5) % 1;
        let x: number, y: number, roll = 0;
        if (p < 0.5) { x = spec.d - (p / 0.5) * spec.d * 2; y = spec.headY; }
        else { const s = (p - 0.5) / 0.5; x = -spec.d + s * spec.d * 2; y = spec.headY + Math.sin(Math.PI * s) * spec.lift; roll = Math.sin(Math.PI * s) * 0.4; }
        if (a.gait === 'slipping' && i === 1) { y = spec.headY + spec.lift * 1.3; x = spec.d * 0.3; roll = 0.9; }
        const head = heads[i];
        head.position.set(dir * x, y, head.position.z);
        head.rotation.set(0, 0, -dir * roll);
        // The neck linker from head to the junction.
        const from = new THREE.Vector3(dir * x, y + (a.motor === 'dynein' ? 0.03 : spec.head[1] * 0.8), head.position.z);
        const to = new THREE.Vector3(0, spec.junction, 0);
        const d = to.clone().sub(from);
        rods[i].position.copy(from).add(to).multiplyScalar(0.5);
        rods[i].quaternion.setFromUnitVectors(Y, d.clone().normalize());
        rods[i].scale.set(1, d.length(), 1);
        if (stilts[i]) {
          const foot = new THREE.Vector3(walker.position.x + dir * x, top + 0.002 + (y - spec.headY), head.position.z * 0.5);
          const hub = new THREE.Vector3(walker.position.x + dir * x, y - 0.03, head.position.z);
          const s = hub.clone().sub(foot);
          stilts[i].position.copy(foot).add(hub).multiplyScalar(0.5);
          stilts[i].quaternion.setFromUnitVectors(Y, s.clone().normalize());
          stilts[i].scale.set(1, s.length(), 1);
        }
      }
    };
    body.rotation.z = lean;
    if (a.gait === 'slipping') { walker.rotation.x = 0.35; }
    pose();
    const sway = mix(0.01, 0.05, mood.energy);
    const update = (dt: number, time: number) => {
      if (walking) {
        phase = (phase + dt / period) % 1;
        travel += (dt / period) * spec.d * 4;
      }
      body.rotation.z = lean + Math.sin(time * 2.1) * sway * (a.gait === 'resting' ? 0.4 : 1) + (a.gait === 'straining' ? Math.sin(time * 23) * 0.01 : 0);
      if (a.gait === 'slipping') walker.rotation.x = 0.35 + Math.sin(time * 3) * 0.04;
      pose();
    };
    return { object: root, update, dispose: () => disposeTree(root) };
  },
});
