import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, score } from '@conjure/kit';
import { PALETTES, STYLES, bilayer, instances, paint, revolvedHeads, tone } from './membrane';

type Kind = 'adeno' | 'corona' | 'flu' | 'phage';
const VIRUS_COLOURS: Record<keyof typeof STYLES, Record<Kind, [string, string, string]>> = {
  pastel: { adeno: ['#b8c7e6', '#8ea3d1', '#f08c7a'], corona: ['#c9ccd3', '#e8726b', '#f2b25c'], flu: ['#f3c6a5', '#d7867c', '#7fb2a6'], phage: ['#c6b3e3', '#9a86c4', '#7fc7a8'] },
  micrograph: { adeno: ['#9c9c96', '#7a7a75', '#4f4f4b'], corona: ['#a9a9a3', '#5c5c58', '#3f3f3c'], flu: ['#b3b3ad', '#6a6a66', '#4a4a47'], phage: ['#a4a49e', '#6e6e6a', '#545450'] },
  glossy: { adeno: ['#4f8ff0', '#2b5fc4', '#ff5a3c'], corona: ['#d9dde4', '#e8262c', '#ffb21f'], flu: ['#ffb38a', '#e0412f', '#18b38a'], phage: ['#9a5cf0', '#5b2fb8', '#20c08f'] },
};

/** Evenly spread directions over a sphere. */
const fibonacci = (count: number) => Array.from({ length: count }, (_unused, i) => {
  const y = 1 - (2 * (i + 0.5)) / count, r = Math.sqrt(1 - y * y), a = i * 2.39996;
  return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
});

export default defineThing({
  questions: {
    virus: choice('What kind of virus is it?', {
      adeno: 'An icosahedral capsid, a faceted twenty-sided gem with long knobbed fibres at its corners.',
      corona: 'A round enveloped virus wearing a crown of club-shaped spikes.',
      flu: 'A plump enveloped virus bristling with dense short rods and mushroom-headed knobs.',
      phage: 'A bacteriophage: a geometric head on a ribbed tail, landed on six spidery legs.',
    }),
    stage: choice('How far has the infection got?', {
      landing: 'Just touching down, balanced on its spike tips on a flat membrane.',
      latched: 'Latched on: spikes gripping receptor stalks, the membrane dimpling under it.',
      sinking: 'One side sinking in as the membrane wells up around its flank (a phage fires its tail instead).',
      engulfed: 'Half swallowed: a lip of membrane has climbed up round it like a cup.',
    }),
    spikes: score('How spiky is it?', ['A few sparse spikes', 'A good crown', 'Bristling all over']),
    company: choice('Is it alone?', {
      alone: 'Alone: one invader.',
      pair: 'A second, smaller copy is drifting down behind it.',
      crowd: 'Several smaller copies are already docked across the membrane.',
    }),
    cutaway: choice('Is the capsid opened to show what is inside?', {
      closed: 'Closed, a solid shell.',
      cut: 'Cut away in quarter, revealing the coiled genome packed inside.',
    }),
    style: choice('How is it drawn?', STYLES),
  },

  build(a, context) {
    const { mood, random } = context;
    const palette = PALETTES[a.style];
    const colours = VIRUS_COLOURS[a.style][a.virus];
    const root = new THREE.Group();
    const R = 0.012, T = 0.11, ys = T - R;
    const W = 0.64, D = 0.52;
    const phage = a.virus === 'phage';
    const cut = a.cutaway === 'cut';
    const Y = new THREE.Vector3(0, 1, 0);
    const bodyMaterial = paint(colours[0], context, a.style, cut ? { side: THREE.DoubleSide } : {});
    const spikeMaterial = paint(colours[1], context, a.style);
    const tipMaterial = paint(colours[2], context, a.style);
    const genomeMaterial = new THREE.MeshStandardMaterial({ color: tone(a.style === 'micrograph' ? '#2c2c2a' : '#ff8a2a', context), emissive: tone(a.style === 'micrograph' ? '#000000' : '#ff6a00', context), emissiveIntensity: 0.25, roughness: 0.5 });
    const inQuarter = (p: THREE.Vector3) => p.x > 0.002 && p.z > 0.002;

    const Rv = 0.11;
    const spikeLength = { adeno: mix(0.06, 0.11, a.spikes), corona: mix(0.03, 0.048, a.spikes), flu: mix(0.022, 0.032, a.spikes), phage: 0 }[a.virus];
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35 + random() * 0.3, random() * 6.28, 0.2 + random() * 0.2));
    const injecting = phage && (a.stage === 'sinking' || a.stage === 'engulfed');

    /** A coiled genome as a tangled tube packed into a ball. */
    const genome = (radius: number, turns = 46) => {
      const points: THREE.Vector3[] = [];
      let p = new THREE.Vector3();
      for (let i = 0; i < turns; i++) {
        p = p.clone().add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(radius * 0.9));
        if (p.length() > radius) p.setLength(radius * 0.8);
        points.push(p);
      }
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), turns * 6, radius * 0.06, 5), genomeMaterial);
      mesh.castShadow = true;
      return mesh;
    };

    /** One virus with its capsid centre at the origin; tips are the spike ends in the same frame. */
    const virus = (scale: number, opened: boolean, rotation: THREE.Quaternion) => {
      const group = new THREE.Group();
      const tips: THREE.Vector3[] = [];
      const keep = (p: THREE.Vector3) => !(opened && inQuarter(p));
      if (a.virus === 'adeno') {
        const ico = new THREE.IcosahedronGeometry(Rv * scale, 0).applyQuaternion(rotation);
        const position = ico.attributes.position;
        const kept: number[] = [];
        const caps: { matrix: THREE.Matrix4 }[] = [];
        for (let f = 0; f < position.count / 3; f++) {
          const v = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(position, f * 3 + k));
          const centre = v[0].clone().add(v[1]).add(v[2]).divideScalar(3);
          if (!keep(centre)) continue;
          for (const p of v) kept.push(p.x, p.y, p.z);
          const normal = centre.clone().normalize();
          // Capsomeres: a triangular grid of hexagonal bumps on every face.
          for (let i = 0; i <= 3; i++) for (let j = 0; j <= 3 - i; j++) {
            const k = 3 - i - j;
            const p = v[0].clone().multiplyScalar((i + 0.5) / 4.5).add(v[1].clone().multiplyScalar((j + 0.5) / 4.5)).add(v[2].clone().multiplyScalar((k + 0.5) / 4.5));
            caps.push({ matrix: new THREE.Matrix4().compose(p.addScaledVector(normal, 0.003 * scale), new THREE.Quaternion().setFromUnitVectors(Y, normal), new THREE.Vector3(0.0125 * scale, 0.008 * scale, 0.0125 * scale)) });
          }
        }
        const faces = new THREE.BufferGeometry();
        faces.setAttribute('position', new THREE.Float32BufferAttribute(kept, 3));
        faces.computeVertexNormals();
        const shell = new THREE.Mesh(faces, bodyMaterial);
        shell.castShadow = shell.receiveShadow = true;
        group.add(shell);
        group.add(instances(new THREE.CylinderGeometry(1, 1, 1, 6), spikeMaterial, caps));
        // Fibres from the twelve corners, each ending in a knob.
        const corners = new THREE.IcosahedronGeometry(1, 0);
        const seen = new Set<string>();
        const cp = corners.attributes.position;
        for (let i = 0; i < cp.count; i++) {
          const dir = new THREE.Vector3().fromBufferAttribute(cp, i).normalize().applyQuaternion(rotation);
          const key = dir.toArray().map((value) => value.toFixed(2)).join();
          if (seen.has(key)) continue;
          seen.add(key);
          const base = dir.clone().multiplyScalar(Rv * scale * 0.98);
          if (!keep(base)) continue;
          const length = spikeLength * scale * mix(0.9, 1.1, random());
          const tip = base.clone().addScaledVector(dir, length);
          const fibre = new THREE.Mesh(new THREE.CylinderGeometry(0.0032 * scale, 0.0032 * scale, length, 6), spikeMaterial);
          fibre.position.copy(base.clone().add(tip).multiplyScalar(0.5));
          fibre.quaternion.setFromUnitVectors(Y, dir);
          const knob = new THREE.Mesh(new THREE.SphereGeometry(0.013 * scale, 12, 9), tipMaterial);
          knob.position.copy(tip);
          const penton = new THREE.Mesh(new THREE.ConeGeometry(0.018 * scale, 0.014 * scale, 5), spikeMaterial);
          penton.position.copy(dir.clone().multiplyScalar(Rv * scale * 1.02));
          penton.quaternion.setFromUnitVectors(Y, dir);
          for (const mesh of [fibre, knob, penton]) { mesh.castShadow = true; group.add(mesh); }
          tips.push(tip.clone().addScaledVector(dir, 0.013 * scale));
        }
        corners.dispose();
      } else if (a.virus === 'corona' || a.virus === 'flu') {
        const body = new THREE.Mesh(opened ? new THREE.SphereGeometry(Rv * scale, 36, 22, Math.PI, Math.PI * 1.5) : new THREE.SphereGeometry(Rv * scale, 36, 22), bodyMaterial);
        body.castShadow = body.receiveShadow = true;
        group.add(body);
        if (opened) {
          // The two walls of the notch, half discs on the planes z = 0 and x = 0.
          for (const turn of [0, -Math.PI / 2]) {
            const face = new THREE.Mesh(new THREE.CircleGeometry(Rv * scale * 0.995, 32, -Math.PI / 2, Math.PI), paint(new THREE.Color(colours[0]).multiplyScalar(0.8), context, a.style, { side: THREE.DoubleSide }));
            face.rotation.y = turn;
            group.add(face);
          }
        }
        const count = Math.round((a.virus === 'corona' ? mix(22, 70, a.spikes) : mix(70, 170, a.spikes)) * mix(0.8, 1, scale));
        const stalks: { matrix: THREE.Matrix4 }[] = [];
        const heads: { matrix: THREE.Matrix4 }[] = [];
        const mushrooms: { matrix: THREE.Matrix4 }[] = [];
        fibonacci(count).forEach((local, index) => {
          const dir = local.applyQuaternion(rotation);
          const base = dir.clone().multiplyScalar(Rv * scale);
          if (!keep(base)) return;
          const length = spikeLength * scale * mix(0.85, 1.15, random());
          const q = new THREE.Quaternion().setFromUnitVectors(Y, dir);
          const mushroom = a.virus === 'flu' && index % 6 === 0;
          stalks.push({ matrix: new THREE.Matrix4().compose(base.clone().addScaledVector(dir, length * 0.4), q, new THREE.Vector3(0.0035 * scale, length * 0.8, 0.0035 * scale)) });
          const tip = base.clone().addScaledVector(dir, length * 0.85);
          if (a.virus === 'corona') heads.push({ matrix: new THREE.Matrix4().compose(tip, q, new THREE.Vector3(0.011, 0.016, 0.011).multiplyScalar(scale)) });
          else if (mushroom) mushrooms.push({ matrix: new THREE.Matrix4().compose(tip, q, new THREE.Vector3(0.012, 0.004, 0.012).multiplyScalar(scale)) });
          else heads.push({ matrix: new THREE.Matrix4().compose(tip, q, new THREE.Vector3(0.0058, 0.011, 0.0058).multiplyScalar(scale)) });
          tips.push(base.clone().addScaledVector(dir, length));
        });
        group.add(instances(new THREE.CylinderGeometry(1, 1, 1, 6), spikeMaterial, stalks));
        group.add(instances(new THREE.SphereGeometry(1, 10, 8), a.virus === 'corona' ? tipMaterial : spikeMaterial, heads));
        if (mushrooms.length) group.add(instances(new THREE.CylinderGeometry(1, 1, 1, 8), tipMaterial, mushrooms));
      }
      if (opened && !phage) group.add(genome(Rv * scale * 0.72));
      return { group, tips };
    };

    // Where it stands and how the membrane responds.
    let cy = 0, dip = 0, wellSide = random() * Math.PI * 2, well = 0;
    let lowest = Rv;
    let main: { group: THREE.Group; tips: THREE.Vector3[] } | null = null;
    if (!phage) {
      main = virus(1, cut, tilt);
      lowest = -Math.min(...main.tips.map((tip) => tip.y), -Rv);
      cy = { landing: T + lowest - 0.004, latched: T + lowest * 0.72, sinking: T + Rv * 0.55, engulfed: T + Rv * 0.15 }[a.stage];
      dip = { landing: 0, latched: 0.022, sinking: 0.03, engulfed: 0 }[a.stage];
      well = a.stage === 'sinking' ? Rv * 0.75 : 0;
    } else {
      dip = a.stage === 'landing' ? 0 : 0.012;
    }
    const lift = (x: number, z: number) => {
      const d = Math.hypot(x, z);
      let h = -dip * Math.exp(-(d * d) / (2 * (Rv * 0.9) ** 2));
      if (well) {
        const side = Math.max(0, Math.cos(Math.atan2(z, x) - wellSide));
        h += well * Math.exp(-((d - Rv * 0.95) ** 2) / (2 * 0.045 ** 2)) * side ** 1.4;
        if (d < Rv * 0.95) h += well * side ** 1.4 * 0.6 * (d / Rv);
      }
      return h;
    };
    const cupBase = Rv + 0.07;
    const patch = bilayer(context, palette, {
      width: W, depth: D, head: R, thickness: T, lift,
      hole: (x, z) => a.stage === 'engulfed' && !phage && Math.hypot(x, z) < cupBase,
      mix: 0.3,
    });
    root.add(patch.group);

    if (main) {
      main.group.position.y = cy;
      root.add(main.group);
      // The membrane lip climbing round it.
      if (a.stage === 'engulfed') {
        const Rc = Rv + R * 1.3;
        const profile: [number, number][] = [[cupBase, ys]];
        const start = new THREE.Vector2(Rc, cy);
        const fillet = new THREE.QuadraticBezierCurve(new THREE.Vector2(cupBase - 0.015, ys), new THREE.Vector2(Rc + 0.004, ys), new THREE.Vector2(Rc, Math.max(cy, ys + 0.02)));
        for (const p of fillet.getPoints(8)) profile.push([p.x, p.y]);
        void start;
        for (let i = 1; i <= 8; i++) {
          const t = Math.asin(Math.min(0.99, (Math.max(cy, ys + 0.02) - cy) / Rc)) + (i / 8) * 0.62;
          profile.push([Math.cos(t) * Rc, cy + Math.sin(t) * Rc]);
        }
        root.add(revolvedHeads(context, palette, profile, R, 0.3, (p) => !(cut && inQuarter(p) && p.y > ys + 0.03)));
      }
      // Receptors under every spike tip that reaches the membrane.
      if (a.stage !== 'landing') {
        const receptor = paint(palette.protein[1], context, a.style);
        const cup = paint(palette.protein[3], context, a.style);
        for (const local of main.tips) {
          const tip = local.clone().add(main.group.position);
          const surface = T + lift(tip.x, tip.z);
          if (tip.y > surface + 0.05 || tip.y < surface - 0.005) continue;
          if (a.stage === 'engulfed' && Math.hypot(tip.x, tip.z) < cupBase) continue;
          const height = Math.max(tip.y - surface, 0.012);
          const stalk = new THREE.Mesh(new THREE.CapsuleGeometry(0.0065, height, 3, 8), receptor);
          stalk.position.set(tip.x, surface + height / 2 - 0.004, tip.z);
          const grip = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), cup);
          grip.position.set(tip.x, tip.y - 0.006, tip.z);
          grip.rotation.x = Math.PI;
          for (const mesh of [stalk, grip]) { mesh.castShadow = true; root.add(mesh); }
        }
      }
    }

    // The phage, built upright: legs, baseplate, ribbed tail, collar and head.
    let phageHead: THREE.Object3D | null = null;
    const buildPhage = (scale: number, stage: string, opened: boolean) => {
      const group = new THREE.Group();
      const fire = stage === 'sinking' || stage === 'engulfed';
      const planted = stage !== 'landing';
      const sheath = fire ? 0.075 : 0.16;
      const sheathR = fire ? 0.028 : 0.019;
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.016, 6), spikeMaterial);
      plate.position.y = 0.03;
      group.add(plate);
      for (let k = 0; k < 6; k++) {
        const angle = (k / 6) * Math.PI * 2 + 0.3;
        const c = Math.cos(angle), s = Math.sin(angle);
        const foot = planted ? 0.16 : 0.13;
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(c * 0.03, 0.03, s * 0.03), new THREE.Vector3(c * 0.09, planted ? 0.08 : 0.07, s * 0.09), new THREE.Vector3(c * foot, planted ? 0.004 : 0.02, s * foot)]);
        const leg = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.0045, 6), spikeMaterial);
        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), tipMaterial);
        knee.position.set(c * 0.09, planted ? 0.08 : 0.07, s * 0.09);
        const pad = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 6), tipMaterial);
        pad.position.set(c * foot, planted ? 0.004 : 0.02, s * foot);
        group.add(leg, knee, pad);
      }
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(sheathR, sheathR, sheath, 16), spikeMaterial);
      tail.position.y = 0.038 + sheath / 2;
      group.add(tail);
      const rings: { matrix: THREE.Matrix4 }[] = [];
      for (let y = 0.045; y < 0.038 + sheath - 0.004; y += fire ? 0.009 : 0.012)
        rings.push({ matrix: new THREE.Matrix4().compose(new THREE.Vector3(0, y, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)) });
      group.add(instances(new THREE.TorusGeometry(sheathR + 0.002, 0.0028, 5, 18), tipMaterial, rings));
      if (fire) {
        // The inner tube punched down through the membrane.
        const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.09, 10), spikeMaterial);
        needle.position.y = -0.01;
        group.add(needle);
      }
      const collarY = 0.038 + sheath;
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.01, 6), spikeMaterial);
      collar.position.y = collarY + 0.005;
      group.add(collar);
      for (let k = 0; k < 6; k++) {
        const angle = (k / 6) * Math.PI * 2;
        const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.05, 4), spikeMaterial);
        whisker.position.set(Math.cos(angle) * 0.045, collarY - 0.008, Math.sin(angle) * 0.045);
        whisker.rotation.set(Math.sin(angle) * 1.2, 0, -Math.cos(angle) * 1.2);
        group.add(whisker);
      }
      const see = opened || fire;
      const headMaterial = see ? paint(colours[0], context, a.style, { transparent: true, opacity: 0.4, depthWrite: false }) : bodyMaterial;
      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), headMaterial);
      head.scale.set(1, 1.45, 1);
      head.position.y = collarY + 0.01 + 0.07 * 1.3;
      head.rotation.y = 0.3;
      group.add(head);
      // The edges of the head as struts, so a see-through head still reads as a solid.
      if (see) {
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(head.geometry), new THREE.LineBasicMaterial({ color: tone(colours[1], context) }));
        edges.scale.copy(head.scale); edges.position.copy(head.position); edges.rotation.copy(head.rotation);
        group.add(edges);
        if (!fire || random() < 0.5) {
          const dna = genome(0.05, fire ? 18 : 40);
          dna.scale.set(1, 1.3, 1);
          dna.position.copy(head.position);
          group.add(dna);
        }
      }
      group.traverse((node) => { node.castShadow = true; });
      group.scale.setScalar(scale);
      phageHead = head;
      return group;
    };
    if (phage) {
      const p = buildPhage(1.2, a.stage, cut);
      p.position.y = T - 0.006;
      p.rotation.z = a.stage === 'landing' ? 0.18 : 0.06;
      p.rotation.y = random() * 6;
      root.add(p);
    }

    // Company.
    const extras: THREE.Object3D[] = [];
    if (a.company !== 'alone') {
      const n = a.company === 'pair' ? 1 : 2 + Math.round(mood.density * 2);
      for (let i = 0; i < n; i++) {
        const angle = (a.company === 'pair' ? 2.4 : 1.8 + i * 1.5) + random() * 0.5;
        const x = Math.cos(angle) * W * 0.36, z = Math.sin(angle) * D * 0.36;
        const scale = a.company === 'pair' ? 0.55 : mix(0.32, 0.42, random());
        let item: THREE.Object3D;
        if (phage) {
          item = buildPhage(scale * 1.2, a.company === 'pair' ? 'landing' : 'latched', false);
          item.position.set(x, a.company === 'pair' ? T + 0.18 : T - 0.004, z);
        } else {
          const copy = virus(scale, false, new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6)));
          item = copy.group;
          const reach = -Math.min(...copy.tips.map((tip) => tip.y), -Rv * scale);
          item.position.set(x, a.company === 'pair' ? T + reach + 0.16 : T + lift(x, z) + reach * 0.85, z);
        }
        root.add(item);
        extras.push(item);
      }
    }

    const speed = mix(0.2, 1.6, mood.energy);
    const phase = random() * 6;
    const base = extras.map((item) => item.position.y);
    const update = (_dt: number, time: number) => {
      const t = time * speed + phase;
      if (main) main.group.rotation.y = Math.sin(t * 0.5) * 0.04;
      if (main && a.stage === 'landing') main.group.position.y = cy + Math.sin(t) * 0.003;
      if (phageHead) phageHead.rotation.y = 0.3 + Math.sin(t * 0.7) * 0.05;
      extras.forEach((item, i) => {
        if (a.company === 'pair') { item.position.y = base[i] + Math.sin(t + i) * 0.01; item.rotation.y = t * 0.1; }
      });
    };
    return { object: root, update, dispose: () => disposeTree(root) };
  },
});
