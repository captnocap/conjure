import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P2 = [number, number];
const OUTLINES: Record<'human' | 'elf' | 'monkey' | 'zombie', P2[]> = {
  human: [[0, 0], [-0.12, 0.05], [-0.17, 0.16], [-0.15, 0.28], [-0.17, 0.38], [-0.14, 0.5], [-0.17, 0.62], [-0.12, 0.8], [0.02, 0.95], [0.2, 1], [0.36, 0.93], [0.44, 0.76], [0.42, 0.56], [0.34, 0.38], [0.24, 0.22], [0.14, 0.08]],
  elf: [[0, 0], [-0.12, 0.05], [-0.17, 0.16], [-0.15, 0.28], [-0.17, 0.38], [-0.14, 0.5], [-0.17, 0.62], [-0.12, 0.8], [0.04, 1], [0.3, 1.24], [0.62, 1.5], [0.52, 1.14], [0.44, 0.8], [0.4, 0.56], [0.33, 0.38], [0.24, 0.22], [0.14, 0.08]],
  monkey: [[0.06, 0.04], [-0.1, 0.1], [-0.18, 0.25], [-0.16, 0.4], [-0.19, 0.55], [-0.15, 0.76], [0, 0.94], [0.24, 1.02], [0.48, 0.95], [0.64, 0.74], [0.67, 0.48], [0.57, 0.24], [0.38, 0.08], [0.2, 0.02]],
  zombie: [[0, 0], [-0.12, 0.05], [-0.17, 0.16], [-0.15, 0.28], [-0.17, 0.38], [-0.14, 0.5], [-0.17, 0.62], [-0.12, 0.8], [0.02, 0.95], [0.2, 1], [0.36, 0.93], [0.44, 0.76], [0.42, 0.56], [0.34, 0.38], [0.24, 0.22], [0.14, 0.08]],
};

export default defineThing({
  questions: {
    species: choice('Whose ear is it?', {
      human: 'An ordinary human ear, rounded with a soft lobe.',
      elf: 'A long pointed elf ear sweeping up and back to a fine tip.',
      monkey: 'A big round leathery monkey ear that sticks out, with a fringe of fur at the root.',
      zombie: 'A grey-green zombie ear with a bite torn out of the rim, blotched and stitched.',
    }),
    style: choice('What style is the jewellery?', {
      constellation: 'A curated constellation of tiny gold studs, huggie hoops and a fine chain.',
      punk: 'Punk: safety pins through the rim, steel spikes and a heavy industrial bar.',
      tribal: 'Heavy tribal: a wide horn tunnel stretching the lobe, thick rings and a bone spike.',
      pearl: 'Demure: a pearl stud in the lobe and little else.',
      rainbow: 'Candy-bright anodised rings in every colour, a mall teenager going all in.',
    }),
    count: score('How many piercings does it carry?', ['Just one', 'Three or four', 'Half a dozen', 'Crowded from lobe to tip']),
    skin: choice('What tone is the silicone?', {
      pale: 'Pale pink-white.',
      light: 'Light beige.',
      olive: 'Warm olive tan.',
      brown: 'Medium brown.',
      deep: 'Deep dark brown.',
      practice: 'Unnatural bubblegum-pink training silicone, obviously fake.',
    }),
    state: choice('What is happening to it right now?', {
      display: 'Finished and on show, every piece seated.',
      marked: 'Dotted with purple surgical-pen marks where the next holes will go.',
      needle: 'A long piercing needle is stuck halfway through the cartilage with a cork on its point.',
      clamped: 'A pair of steel forceps hangs clamped on the lobe, mid-procedure.',
    }),
    stand: choice('What does it stand on?', {
      rod: 'A slim steel rod on a round weighted base.',
      block: 'A chunky wooden block, workshop made.',
      plinth: 'A white museum plinth with a small label, as if it were sculpture.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 0.28;
    const zombie = a.species === 'zombie', monkey = a.species === 'monkey';
    const skinBase = new THREE.Color({ pale: '#f3cfc0', light: '#e6b594', olive: '#c9965f', brown: '#9a6238', deep: '#5c3620', practice: '#ff8fb5' }[a.skin]);
    if (zombie) skinBase.lerp(new THREE.Color('#7f8f6c'), 0.72);
    if (monkey) skinBase.lerp(new THREE.Color('#6b4534'), 0.55);
    const skin = s.material(skinBase, { roughness: mix(0.4, 0.75, mood.wear) });
    const ridge = s.material(skinBase.clone().lerp(new THREE.Color('#ffffff'), 0.1), { roughness: 0.45 });
    const hollow = s.material(skinBase.clone().multiplyScalar(0.62).lerp(new THREE.Color(zombie ? '#3a2a2a' : '#a2413a'), 0.22), { roughness: 0.7 });
    const pit = s.material(skinBase.clone().multiplyScalar(0.22), { roughness: 0.9 });

    // Outline, with a bite out of the zombie's rim.
    const base = OUTLINES[a.species];
    const curve = new THREE.CatmullRomCurve3(base.map(([x, y]) => new THREE.Vector3(x * H, y * H, 0)), true, 'catmullrom', 0.5);
    const N = 120;
    const pts = curve.getSpacedPoints(N).slice(0, N);
    const centre = new THREE.Vector3((monkey ? 0.24 : 0.13) * H, 0.52 * H, 0);
    const biteAt = 0.62 + random() * 0.1;
    if (zombie) for (let i = 0; i < N; i++) {
      const d = Math.abs(i / N - biteAt);
      if (d < 0.055) pts[i].lerp(centre, (0.5 - d * 6) * (0.6 + random() * 0.7));
    }
    const tunnel = a.style === 'tribal';
    const lobe: P2 = [(monkey ? 0.08 : 0.005) * H, (monkey ? 0.17 : 0.145) * H];
    const tunnelR = H * mix(0.055, 0.085, a.count);
    const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, p.y)));
    if (tunnel) { const hole = new THREE.Path(); hole.absarc(lobe[0], lobe[1], tunnelR, 0, Math.PI * 2, true); shape.holes.push(hole); }
    const depth = H * 0.1, bevel = H * 0.055;
    const slab = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelOffset: -bevel * 0.9, bevelSegments: 5, curveSegments: 24 });
    slab.translate(0, 0, -depth / 2);
    const ear = new THREE.Group();
    s.root.add(ear);
    const into = <T extends THREE.Object3D>(o: T) => { ear.add(o); return o; };
    into(s.mesh(slab, skin));
    const F = depth / 2 + bevel; // front face z
    const at = (u: number, inset = 0): THREE.Vector3 => {
      const p = pts[Math.floor((((u % 1) + 1) % 1) * N)].clone();
      return p.lerp(centre, inset);
    };

    // Helix rim, antihelix, tragus, concha.
    const rimFrom = 0.33, rimTo = monkey ? 0.9 : 0.86;
    const rimPts: [number, number, number][] = [];
    for (let i = 0; i <= 26; i++) {
      const u = mix(rimFrom, rimTo, i / 26);
      if (zombie && Math.abs(u - biteAt) < 0.06) continue;
      const p = at(u, 0.1);
      rimPts.push([p.x, p.y, F - H * 0.012]);
    }
    const first = at(rimFrom, 0.5);
    rimPts.unshift([first.x, first.y, F - H * 0.03]);
    into(s.tube(rimPts, H * 0.036, ridge));
    const anti: [number, number, number][] = ([[0.13, 0.24], [0.2, 0.36], [0.24, 0.52], [0.2, 0.68], [0.1, 0.8]] as P2[]).map(([x, y]) => [x * H * (monkey ? 1.5 : 1), y * H, F - H * 0.012]);
    into(s.tube(anti, H * 0.03, ridge));
    into(s.tube([[0.24 * H * (monkey ? 1.5 : 1), 0.52 * H, F - H * 0.015], [0.14 * H, 0.62 * H, F - H * 0.015], [0.0, 0.66 * H, F - H * 0.02]], H * 0.024, ridge));
    into(s.ball([H * 0.11 * (monkey ? 1.5 : 1), H * 0.15, H * 0.02], [0.07 * H * (monkey ? 1.6 : 1), 0.45 * H, F - H * 0.004], hollow));
    into(s.ball([H * 0.04, H * 0.055, H * 0.02], [-0.03 * H, 0.44 * H, F], pit));
    const tragus: P2 = [-0.11 * H, 0.42 * H];
    into(s.ball([H * 0.055, H * 0.07, H * 0.04], [tragus[0], tragus[1], F - H * 0.01], ridge));
    into(s.ball([H * 0.05, H * 0.04, H * 0.035], [0.05 * H, 0.27 * H, F - H * 0.01], ridge));
    if (a.species === 'elf') {
      const tip = at(0.5, 0.0), root = at(0.5, 0.75);
      into(s.rod([root.x, root.y, F - H * 0.02], [tip.x * 0.94, tip.y * 0.95, F - H * 0.04], H * 0.018, ridge, H * 0.004));
    }
    if (monkey) {
      const fur = s.material('#2e1f17', { roughness: 1 });
      const tufts: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 46; i++) {
        const p = at(0.02 + random() * 0.3, -0.1 - random() * 0.12);
        tufts.push({ at: [p.x - random() * 0.03, p.y, (random() - 0.6) * H * 0.25], size: H * (0.05 + random() * 0.05) });
      }
      const g = new THREE.ConeGeometry(0.35, 1.6, 5); g.rotateZ(1.2);
      into(s.scatter(g, fur, tufts));
    }
    if (zombie) {
      const rot = s.material('#4a2620', { roughness: 0.9 }), mould = s.material('#4f5f3c', { roughness: 1 }), thread = s.material('#1c1a18');
      for (let i = 0; i < 5 + Math.round(mood.wear * 5); i++) {
        const p = at(random(), 0.25 + random() * 0.5);
        const r = H * (0.02 + random() * 0.035);
        into(s.ball([r, r * (0.6 + random() * 0.6), H * 0.008], [p.x, p.y, F + H * 0.002], random() < 0.5 ? rot : mould, 10));
      }
      const b = at(biteAt, 0.34);
      into(s.ball([H * 0.07, H * 0.05, H * 0.03], [b.x, b.y, 0], rot, 10));
      const g0 = at(0.9, 0.35), g1 = at(0.97, 0.45);
      into(s.rod([g0.x, g0.y, F + 0.001], [g1.x, g1.y, F + 0.001], H * 0.008, rot));
      for (let i = 0; i < 4; i++) {
        const m = g0.clone().lerp(g1, (i + 0.5) / 4);
        into(s.rod([m.x - H * 0.03, m.y + H * 0.012, F + 0.003], [m.x + H * 0.03, m.y - H * 0.012, F + 0.003], H * 0.004, thread));
      }
    }

    // Jewellery.
    const glow = mix(0.3, 0.75, mood.cheer);
    const metal = (c: string, e = c) => s.material(c, { metalness: 0.92, roughness: 0.2, emissive: e, emissiveIntensity: glow });
    const gold = metal('#f4c63c', '#c98a00'), steel = metal('#e2e8ec', '#7f93a6'), blackMetal = s.material('#2c2d33', { metalness: 0.7, roughness: 0.4 });
    const horn = s.material('#5a3a22', { roughness: 0.5 }), bone = s.material('#efe6cf', { roughness: 0.7 });
    const pearlM = s.material('#fbf6ee', { roughness: 0.18, metalness: 0.2, emissive: '#e8d8c8', emissiveIntensity: 0.45 });
    const candy = ['#ff3d7f', '#22c8e8', '#9b5cff', '#ffcf1f', '#3ddc6a', '#ff7a1a'].map((c) => metal(c));
    const main = { constellation: gold, punk: steel, tribal: horn, pearl: gold, rainbow: candy[0] }[a.style];
    const pick = () => a.style === 'rainbow' ? candy[Math.floor(random() * candy.length)] : a.style === 'tribal' ? (random() < 0.5 ? steel : blackMetal) : main;
    const thick = { constellation: 0.011, punk: 0.016, tribal: 0.024, pearl: 0.011, rainbow: 0.015 }[a.style] * H;

    const rimRing = (u: number, radius: number, m: THREE.Material, tube = thick) => {
      const p = at(u, 0.04);
      const next = at(u + 0.015, 0.04);
      const tangent = next.sub(at(u - 0.015, 0.04)).normalize();
      const ring = into(s.ring(radius, tube, [p.x, p.y, 0], m));
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      const inward = centre.clone().sub(p).normalize();
      ring.position.addScaledVector(inward, radius * 0.45);
      return ring;
    };
    const stud = (x: number, y: number, r: number, m: THREE.Material, z = F) => into(s.ball([r, r, r], [x, y, z + r * 0.6], m, 14));
    const spike = (u: number, len: number, m: THREE.Material) => {
      const p = at(u, 0.08), out = p.clone().sub(centre).normalize();
      into(s.rod([p.x, p.y, F * 0.2], [p.x + out.x * len, p.y + out.y * len, F * 0.2], H * 0.02, m, 0.0005));
      stud(p.x, p.y, H * 0.022, m, F - H * 0.01);
    };
    const pin = (u: number) => {
      const p = at(u, 0.16), q = at(u + 0.07, 0.16);
      const z = F + H * 0.012;
      into(s.tube([[p.x, p.y, z], [q.x, q.y, z + H * 0.02], [q.x + H * 0.02, q.y + H * 0.005, z], [p.x + H * 0.02, p.y - H * 0.012, z + H * 0.012], [p.x, p.y, z]], H * 0.006, steel));
      into(s.ball([H * 0.022, H * 0.016, H * 0.012], [p.x, p.y, z], steel, 10));
    };

    const total = 1 + Math.round(a.count * 9 + (random() - 0.5) * (a.count > 0.05 && a.count < 0.95 ? 1.4 : 0));
    const swingers: THREE.Object3D[] = [];
    // 1: the lobe piece defines the style.
    if (a.style === 'tribal') {
      const t = into(s.ring(tunnelR, H * 0.022, [lobe[0], lobe[1], 0], horn));
      t.scale.z = 2.6;
      into(s.ring(tunnelR + H * 0.012, H * 0.012, [lobe[0], lobe[1], F + H * 0.012], bone));
    } else if (a.style === 'pearl') {
      stud(lobe[0], lobe[1], H * 0.05, pearlM);
      into(s.ring(H * 0.03, H * 0.006, [lobe[0], lobe[1], F + H * 0.004], gold));
    } else if (a.style === 'punk') {
      const g = new THREE.Group(); g.position.set(lobe[0], lobe[1], F); into(g);
      const m = s.tube([[0, 0, 0.004], [H * 0.02, -H * 0.2, 0.012], [H * 0.045, -H * 0.2, 0.004], [H * 0.035, -H * 0.02, 0.008], [0, 0, 0.004]], H * 0.008, steel); g.add(m);
      const head = s.ball([H * 0.03, H * 0.022, H * 0.016], [H * 0.02, -H * 0.005, 0.008], steel, 10); g.add(head);
      swingers.push(g);
    } else {
      const g = new THREE.Group(); g.position.set(lobe[0], lobe[1], 0); into(g);
      const r = H * (a.style === 'rainbow' ? 0.1 : 0.075);
      const hoop = s.ring(r, thick * 1.2, [0, -r * 0.9, 0], main); hoop.rotation.y = Math.PI / 2 - 0.5; g.add(hoop);
      stud(lobe[0], lobe[1], H * 0.02, main);
      swingers.push(g);
    }
    // 2+: work up the ear.
    const steps: (() => void)[] = [
      () => rimRing(0.66 + (zombie ? 0.14 : 0), H * 0.05, pick()),
      () => { const m = a.style === 'pearl' ? pearlM : pick(); stud(tragus[0], tragus[1], H * 0.026, m, F + H * 0.02); },
      () => {
        if (a.style === 'pearl' || a.style === 'constellation') { stud(lobe[0] + H * 0.09, lobe[1] + H * 0.07, H * 0.022, a.style === 'pearl' ? pearlM : gold); return; }
        const p = at(0.4, 0.14), q = at(0.6, 0.12);
        const z = F + H * 0.035;
        const m = a.style === 'tribal' ? bone : pick();
        into(s.rod([p.x, p.y, z], [q.x, q.y, z], H * 0.013, m));
        for (const e of [p, q]) into(s.ball([H * 0.03, H * 0.03, H * 0.03], [e.x, e.y, z], m, 12));
      },
      () => (a.style === 'punk' ? pin(0.72) : rimRing(0.74, H * 0.045, pick())),
      () => stud(0.09 * H * (monkey ? 1.5 : 1), 0.47 * H, H * 0.03, a.style === 'tribal' ? bone : pick(), F + H * 0.012),
      () => (a.style === 'punk' || a.style === 'tribal' ? spike(0.56, H * 0.16, a.style === 'tribal' ? bone : steel) : rimRing(0.58, H * 0.04, pick())),
      () => stud(lobe[0] + H * 0.1, lobe[1] + H * 0.1, H * 0.022, pick()),
      () => (a.style === 'punk' ? spike(0.5, H * 0.13, steel) : rimRing(0.8, H * 0.05, pick())),
      () => { const p = at(0.36, 0.2); stud(p.x, p.y, H * 0.022, pick(), F + H * 0.02); if (a.style === 'punk') pin(0.42); },
    ];
    for (let i = 0; i < Math.min(total - 1, steps.length); i++) steps[i]();
    if (a.style === 'constellation' && total >= 5) {
      const p = at(0.7, 0.1);
      const chain: [number, number, number][] = [[lobe[0], lobe[1], F + H * 0.02], [lobe[0] + H * 0.2, lobe[1] - H * 0.02, F + H * 0.04], [p.x + H * 0.03, (p.y + lobe[1]) / 2, F + H * 0.04], [p.x, p.y, F + H * 0.02]];
      into(s.tube(chain, H * 0.004, gold));
    }

    // What is being done to it.
    if (a.state === 'marked') {
      const pen = s.material('#6a2fc0', { roughness: 0.8, emissive: '#4a1fa0', emissiveIntensity: 0.3 });
      for (let i = 0; i < 4 + Math.round(random() * 3); i++) {
        const p = at(0.36 + random() * 0.5, 0.14 + random() * 0.2);
        into(s.cylinder(H * 0.014, H * 0.014, 0.002, [p.x, p.y, F + H * 0.022], pen, 12)).rotation.x = Math.PI / 2;
      }
      into(s.cylinder(H * 0.014, H * 0.014, 0.002, [lobe[0] - H * 0.07, lobe[1] + H * 0.06, F + 0.001], pen, 12)).rotation.x = Math.PI / 2;
    } else if (a.state === 'needle') {
      const p = at(0.52, 0.16);
      into(s.rod([p.x - H * 0.02, p.y + H * 0.03, -H * 0.42], [p.x + H * 0.02, p.y - H * 0.03, H * 0.55], H * 0.007, steel));
      into(s.cylinder(H * 0.035, H * 0.03, H * 0.07, [p.x - H * 0.02, p.y + H * 0.03, -H * 0.42], s.material('#b98b54', { roughness: 0.95 }), 12)).rotation.x = Math.PI / 2;
      into(s.cylinder(H * 0.02, H * 0.014, H * 0.08, [p.x + H * 0.02, p.y - H * 0.03, H * 0.55], s.material('#2f9be0'), 10)).rotation.x = Math.PI / 2;
    } else if (a.state === 'clamped') {
      const g = new THREE.Group(); g.position.set(lobe[0] + H * 0.1, lobe[1] - H * 0.02, F * 0.5); g.rotation.z = -0.5 + random() * 0.3; into(g);
      for (const k of [-1, 1]) {
        g.add(s.rod([0, 0, k * F * 0.7], [k * H * 0.04, -H * 0.42, k * 0.006], H * 0.008, steel));
        g.add(s.ring(H * 0.035, H * 0.007, [k * H * 0.065, -H * 0.45, 0], steel));
        g.add(s.ring(H * 0.03, H * 0.006, [0, 0, k * F * 1.05], steel));
      }
      swingers.push(g);
    }

    // Stand.
    const cx = (monkey ? 0.2 : 0.08) * H;
    ear.position.x = -cx;
    const standM = { rod: s.material('#c9cfd3', { metalness: 0.9, roughness: 0.25 }), block: s.material('#8a5a34', { roughness: 0.7 }), plinth: s.material('#f1efe8', { roughness: 0.6 }) }[a.stand];
    const gap = a.stand === 'plinth' ? 0.035 : 0.075;
    const baseH = { rod: 0.016, block: 0.05, plinth: 0.1 }[a.stand];
    ear.position.y = baseH + gap + (a.state === 'clamped' ? H * 0.25 : 0);
    const stemTop = ear.position.y + H * 0.2;
    s.rod([0.01, baseH, -0.012], [0.01, stemTop, -0.012], 0.006, a.stand === 'block' ? s.material('#2a2a2c') : s.material('#c9cfd3', { metalness: 0.9, roughness: 0.25 }));
    if (a.stand === 'rod') s.lathe([[0, 0], [0.085, 0], [0.085, 0.006], [0.03, 0.016], [0, 0.016]], standM);
    else if (a.stand === 'block') s.box([0.16, baseH, 0.11], [0, baseH / 2, 0], standM).rotation.y = (random() - 0.5) * 0.2;
    else {
      s.box([0.2, baseH, 0.14], [0, baseH / 2, 0], standM);
      s.label({ human: 'EAR No. 7', elf: 'ELF EAR', monkey: 'PRIMATE', zombie: 'DO NOT TOUCH' }[a.species], 0.1, 0.03, [0, baseH * 0.5, 0.0705], '#33302a', '#e0dccf');
    }
    ear.rotation.y = -0.18 + (random() - 0.5) * 0.12;

    const sway = mix(0.02, 0.22, mood.energy);
    const phase = random() * 6;
    return s.finish({ update: (_dt, time) => { for (const [i, g] of swingers.entries()) g.rotation.z = (i === swingers.length - 1 && a.state === 'clamped' ? -0.35 : 0) + Math.sin(time * 2.4 + phase + i) * sway; } });
  },
});
