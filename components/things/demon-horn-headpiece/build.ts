import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { Head, blob, noise3, painted, smooth, taperTube } from './fx';

type P = [number, number, number];

export default defineThing({
  questions: {
    horns: choice('What shape are the horns?', {
      'ram-spiral': 'Thick ridged ram horns curling back and round beside the ears.',
      antelope: 'Tall, slender, ringed antelope horns rising almost straight up.',
      'devil-nubs': 'A pair of short stubby devil nubs.',
      antlers: 'A branching crown of stag antlers.',
      broken: 'Asymmetrical: one long sweeping bull horn and one snapped to a jagged stump.',
      'spike-crown': 'A ring of six curved spikes round the skull like a crown.',
    }),
    size: score('How big are the horns?', ['Modest, could pass under a hat', 'Impressive', 'Absurdly huge, a neck-strain job']),
    finish: choice('What colour and finish are the horns?', {
      bone: 'Natural bone, ivory at the tip and stained brown at the root.',
      'lacquer-red': 'Glossy lacquer red, a pantomime devil.',
      charred: 'Charred black with ember-orange glowing at the tips.',
      'gold-leaf': 'Bright gold leaf over everything.',
      'raw-latex': 'Unpainted: the pale yellow of fresh foam latex.',
    }),
    brow: choice('How is the brow sculpted?', {
      noble: 'Noble: smooth and high with two elegant ridges sweeping up to the horns.',
      brutish: 'Brutish: a heavy lumpy overhanging shelf.',
      insectile: 'Insectile: banded plates across the forehead and extra glossy black eye-bumps.',
    }),
    ears: choice('Does it have ears attached?', {
      none: 'No ears: the cap stops above them.',
      pointed: 'Long pointed elf ears swept back.',
      bat: 'Huge ribbed bat ears standing out sideways.',
      goat: 'Soft drooping goat ears hanging level.',
    }),
    extra: choice('What has been added or left on it?', {
      nothing: 'Nothing.',
      chains: 'A fine chain draped from horn to horn.',
      rings: 'Gold rings clamped round the horns.',
      'party-hat': 'A striped paper party hat somebody left on it.',
      tag: 'A paper luggage tag on string: hero piece, do not touch.',
    }),
    form: choice('What is it resting on?', {
      plastic: 'A plain grey plastic head form.',
      lifecast: "A white plaster life-cast of the actor's face, eyes closed.",
      wood: 'A turned wooden milliner block with no face.',
      'red-velvet': 'A red flocked display head.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const big = mix(0.72, 1.55, a.size);
    const HY = 0.27;
    const capColour = { bone: '#a8927a', 'lacquer-red': '#a3262a', charred: '#3d3431', 'gold-leaf': '#c79a2e', 'raw-latex': '#e3cf96' }[a.finish];
    const hornColour = { bone: '#e9dfc2', 'lacquer-red': '#c8141d', charred: '#211d1c', 'gold-leaf': '#e6b93a', 'raw-latex': '#e3cf96' }[a.finish];
    const metal = a.finish === 'gold-leaf';
    const capBase = new THREE.Color(capColour);
    const hornBase = new THREE.Color(hornColour);
    const cap = s.material('#ffffff', { vertexColors: true, roughness: metal ? 0.35 : 0.7, metalness: metal ? 0.85 : 0 });
    const capFlat = s.material(capColour, { roughness: metal ? 0.35 : 0.7, metalness: metal ? 0.85 : 0, side: THREE.DoubleSide });
    const horn = s.material('#ffffff', { vertexColors: true, roughness: a.finish === 'lacquer-red' ? 0.12 : metal ? 0.28 : 0.55, metalness: metal ? 0.9 : 0, emissive: a.finish === 'charred' ? '#ff5a10' : '#000000', emissiveIntensity: 0 });
    const ember = new THREE.MeshStandardMaterial({ color: '#ff7a1a', emissive: '#ff5a10', emissiveIntensity: 1.6, roughness: 0.6 });
    const gold = s.material('#e8bd3f', { metalness: 0.95, roughness: 0.22 });

    // Head form on a neck and foot.
    const formColour = { plastic: '#b9bdc0', lifecast: '#f1eee6', wood: '#b98852', 'red-velvet': '#9c1f2b' }[a.form];
    const formMaterial = s.material(formColour, { roughness: a.form === 'plastic' ? 0.35 : a.form === 'red-velvet' ? 1 : 0.8 });
    const form = new Head(a.form === 'wood' ? { socket: 0, nose: 0, brow: 0, mouth: 0, cheek: 0, chin: 0.2 } : a.form === 'lifecast' ? { socket: 0.5, nose: 0.75, brow: 0.5, cheek: 0.4, lump: 0.004, lumpScale: 20 } : { socket: 0.45, nose: 0.6, brow: 0.3 });
    s.mesh(form.geometry(52), formMaterial, [0, HY, 0]);
    s.lathe([[0, 0], [0.085, 0], [0.09, 0.012], [0.05, 0.03], [0.04, 0.09], [0.045, HY - 0.07], [0, HY - 0.07]], formMaterial);
    if (a.form === 'lifecast') {
      for (const side of [-1, 1]) {
        const lidPts = [-0.11, 0, 0.11].map((dx, i) => form.face(side * 0.36 + dx, 0.11 - (i === 1 ? 0.035 : 0), 0.0015).add(new THREE.Vector3(0, HY, 0)));
        s.mesh(taperTube(lidPts, () => 0.0018, 10, 5), s.material('#a9a498'));
      }
      s.mesh(taperTube([-0.2, 0, 0.2].map((x) => form.face(x, -0.47 + Math.abs(x) * 0.05, 0.001).add(new THREE.Vector3(0, HY, 0))), () => 0.0018, 10, 5), s.material('#a9a498'));
      const slab = s.box([0.2, 0.012, 0.16], [0, 0.006, 0], formMaterial); void slab;
    }

    // The cap: a second, slightly larger head that only exists above the brow line.
    const capHead = new Head({
      ...form.spec, socket: 0.25, nose: 0, cheek: 0, mouth: 0,
      brow: a.brow === 'brutish' ? 2.6 : a.brow === 'noble' ? 1.1 : 0.8,
      lump: a.brow === 'brutish' ? 0.035 : 0.006, lumpScale: a.brow === 'brutish' ? 7 : 16, crown: a.brow === 'noble' ? 0.25 : 0,
    });
    const edgeSeed = random() * 40;
    const edgeOf = (d: THREE.Vector3) => (d.z > 0 ? mix(0.3, 0.19, Math.min(1, Math.abs(d.x) * 2.2)) : mix(0.19, -0.12, -d.z)) + (a.brow === 'brutish' ? -0.05 : 0) + 0.03 * noise3(d.x * 5 + edgeSeed, d.z * 5, 1);
    const capPoint = (d: THREE.Vector3, lift = 0) => capHead.point(d).multiplyScalar(1.045).add(lift ? capHead.normal(d).multiplyScalar(lift) : new THREE.Vector3()).add(new THREE.Vector3(0, HY, 0));
    s.mesh(blob(64, (d) => {
      const on = smooth(-0.035, 0.02, d.y - edgeOf(d));
      const p = capHead.point(d).multiplyScalar(mix(0.86, 1.045, on));
      if (a.brow === 'insectile' && d.z > 0.2 && d.y > 0.3) p.multiplyScalar(1 + 0.022 * Math.sin(d.y * 34) ** 2);
      return p;
    }, (p, d) => {
      const c = capBase.clone();
      const n = noise3(p.x * 50, p.y * 50, p.z * 50);
      c.offsetHSL(0, 0, n * 0.04 + (d.y - 0.5) * 0.06);
      if (a.finish === 'bone') c.lerp(new THREE.Color('#6f5140'), Math.max(0, 0.45 - (d.y - edgeOf(d)) * 2) * 0.6);
      return c;
    }), cap, [0, HY, 0]);

    const D3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();
    if (a.brow === 'noble') {
      for (const side of [-1, 1]) s.mesh(taperTube([D3(side * 0.08, 0.36, 0.93), D3(side * 0.25, 0.55, 0.8), D3(side * 0.45, 0.78, 0.45)].map((d) => capPoint(d, 0.002)), (t) => 0.009 * Math.sin(Math.PI * (0.15 + t * 0.8)), 16, 7), capFlat);
      const gem = s.ball([0.011, 0.015, 0.006], capPoint(D3(0, 0.52, 0.85), 0.003).toArray() as P, s.material(a.finish === 'lacquer-red' ? '#1d1a1a' : '#b3141f', { roughness: 0.1 }), 10);
      gem.castShadow = true;
    }
    if (a.brow === 'insectile') {
      const glossy = s.material('#0e0e12', { roughness: 0.08 });
      for (const [x, y, r] of [[-0.2, 0.52, 0.013], [0.2, 0.52, 0.013], [-0.36, 0.42, 0.009], [0.36, 0.42, 0.009], [0, 0.66, 0.009]] as const) s.ball([r, r, r * 0.8], capPoint(D3(x, y, 0.82), 0.002).toArray() as P, glossy, 12);
      for (const side of [-1, 1]) {
        const from = capPoint(D3(side * 0.12, 0.8, 0.55));
        s.mesh(taperTube([from, from.clone().add(new THREE.Vector3(side * 0.02, 0.05, 0.05)), from.clone().add(new THREE.Vector3(side * 0.05, 0.06, 0.11))], (t) => 0.004 * (1 - t * 0.7), 12, 5), capFlat);
      }
    }
    if (a.brow === 'brutish') {
      for (let i = 0; i < 7; i++) {
        const d = D3((random() - 0.5) * 0.9, 0.4 + random() * 0.35, 0.8);
        const r = 0.006 + random() * 0.007;
        s.ball([r, r, r * 0.7], capPoint(d, 0.001).toArray() as P, capFlat, 8);
      }
    }

    // Horns.
    const anchors: { at: THREE.Vector3; tangent: THREE.Vector3; radius: number; tip: THREE.Vector3 }[] = [];
    const ringSpots: { at: THREE.Vector3; tangent: THREE.Vector3; radius: number }[] = [];
    const makeHorn = (points: THREE.Vector3[], r0: number, ridges: number, depth: number, cutAt = 1, power = 0.75) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const radius = (t: number) => r0 * Math.max(0.02, 1 - t * cutAt) ** power;
      const geometry = taperTube(points, (t) => (cutAt < 1 ? r0 * Math.max(0.02, 1 - t * cutAt * 0.6) ** power : radius(t)) * (1 + depth * Math.sin(t * ridges * Math.PI) ** 2), Math.max(24, ridges * 4), 10);
      const position = geometry.getAttribute('position');
      const colours = new Float32Array(position.count * 3);
      const steps = Math.max(24, ridges * 4);
      for (let i = 0; i < position.count; i++) {
        const t = Math.min(1, Math.floor(i / 10) / steps);
        const c = hornBase.clone();
        if (a.finish === 'bone') c.lerp(new THREE.Color('#7a5a3c'), Math.max(0, 0.6 - t * 1.6)).offsetHSL(0, 0, -0.06 * Math.sin(t * ridges * Math.PI) ** 2);
        if (a.finish === 'charred') c.lerp(new THREE.Color('#ff6a18'), Math.max(0, t - 0.72) * 3.2);
        if (a.finish === 'lacquer-red') c.offsetHSL(0, 0, -0.12 * (1 - t));
        colours.set([c.r, c.g, c.b], i * 3);
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      s.mesh(geometry, horn);
      const mid = 0.45;
      anchors.push({ at: curve.getPointAt(mid), tangent: curve.getTangentAt(mid), radius: radius(mid), tip: curve.getPointAt(1) });
      for (const t of [0.22, 0.4]) ringSpots.push({ at: curve.getPointAt(t), tangent: curve.getTangentAt(t), radius: radius(t) * 1.12 });
      if (a.finish === 'charred' && cutAt === 1) s.ball([r0 * 0.3, r0 * 0.3, r0 * 0.3], curve.getPointAt(0.985).toArray() as P, ember, 8);
      return curve;
    };
    const rel = (base: THREE.Vector3, side: number, list: P[]) => list.map(([x, y, z]) => base.clone().add(new THREE.Vector3(x * side * big, y * big, z * big)));
    const baseDir = (side: number) => D3(side * 0.52, 0.74, 0.22);
    for (const side of [-1, 1]) {
      const base = capPoint(baseDir(side)).addScaledVector(baseDir(side), -0.012);
      const collar = s.ring(0.03 * Math.min(1.2, big) * (a.horns === 'devil-nubs' || a.horns === 'antlers' ? 0.7 : a.horns === 'antelope' ? 0.78 : 1), 0.007, capPoint(baseDir(side), 0.001).toArray() as P, capFlat);
      collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), baseDir(side));
      if (a.horns === 'ram-spiral') {
        const pts: P[] = [];
        for (let i = 0; i <= 14; i++) {
          const t = i / 14, phi = 2.75 - t * Math.PI * 1.75, rho = 0.085 * (1 - 0.4 * t);
          pts.push([0.015 + 0.1 * t * t + 0.02 * t, 0.012 + rho * Math.sin(phi) - 0.085 * Math.sin(2.75), -(-0.085 * Math.cos(2.75) + rho * Math.cos(phi))]);
        }
        makeHorn(rel(base, side, pts), 0.034 * Math.min(1.25, big), 22, 0.1);
      } else if (a.horns === 'antelope') {
        makeHorn(rel(base, side, [[0, 0, 0], [0.02, 0.1, -0.025], [0.06, 0.22, -0.04], [0.065, 0.32, -0.02], [0.04, 0.42, 0.02]]), 0.024, 26, 0.16, 1, 0.6);
      } else if (a.horns === 'devil-nubs') {
        makeHorn(rel(base, side, [[0, 0, 0], [0.008, 0.035, 0.008], [0.01, 0.07, 0.022], [0.006, 0.1, 0.045]]), 0.022, 4, 0.04);
      } else if (a.horns === 'antlers') {
        const beam: P[] = [[0, 0, 0], [0.05, 0.09, -0.02], [0.13, 0.17, -0.03], [0.17, 0.27, 0], [0.15, 0.36, 0.04]];
        const curve = makeHorn(rel(base, side, beam), 0.018, 3, 0.03, 0.8, 0.6);
        [0.18, 0.42, 0.66, 0.85].forEach((t, i) => {
          const from = curve.getPointAt(t);
          const len = (0.11 - i * 0.015) * big * (0.85 + random() * 0.3);
          const out = new THREE.Vector3(side * (i % 2 ? 0.5 : -0.25), 0.8, i === 0 ? 0.9 : 0.25 - i * 0.1).normalize();
          const geometry = taperTube([from, from.clone().addScaledVector(out, len * 0.5).add(new THREE.Vector3(0, len * 0.08, 0)), from.clone().addScaledVector(out, len).add(new THREE.Vector3(0, len * 0.3, 0))], (u) => 0.012 * (1 - u) ** 0.7 * Math.min(1.2, big), 12, 8);
          const colours = new Float32Array(geometry.getAttribute('position').count * 3);
          for (let k = 0; k < colours.length; k += 3) colours.set([hornBase.r, hornBase.g, hornBase.b], k);
          geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
          s.mesh(geometry, horn);
        });
      } else if (a.horns === 'broken') {
        const sweep: P[] = [[0, 0, 0], [0.08, 0.03, 0.005], [0.16, 0.09, 0.02], [0.2, 0.19, 0.045], [0.18, 0.3, 0.07]];
        if (side < 0) makeHorn(rel(base, side, sweep), 0.03, 12, 0.07);
        else {
          const stump = rel(base, side, [[0, 0, 0], [0.04, 0.012, 0.002], [0.08, 0.03, 0.005]]);
          const curve = makeHorn(stump, 0.03, 4, 0.07, 0.25);
          const end = curve.getPointAt(1), dir = curve.getTangentAt(1);
          for (let i = 0; i < 6; i++) {
            const shard = s.mesh(new THREE.ConeGeometry(0.007, 0.02 + random() * 0.03, 4), s.material(a.finish === 'bone' ? '#f4eeda' : hornColour), end.clone().add(new THREE.Vector3((random() - 0.5) * 0.03, (random() - 0.5) * 0.03, (random() - 0.5) * 0.03)).toArray() as P);
            shard.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().add(new THREE.Vector3((random() - 0.5) * 0.5, (random() - 0.5) * 0.5, 0)).normalize());
          }
        }
      } else {
        for (let i = 0; i < 3; i++) {
          const az = side * (0.45 + i * 0.95);
          const d = D3(Math.sin(az) * 0.8, 0.62, Math.cos(az) * 0.8);
          const b = capPoint(d).addScaledVector(d, -0.01);
          const out = new THREE.Vector3(d.x, 0, d.z).normalize();
          makeHorn([b, b.clone().addScaledVector(out, 0.035 * big).add(new THREE.Vector3(0, 0.05 * big, 0)), b.clone().addScaledVector(out, 0.04 * big).add(new THREE.Vector3(0, 0.12 * big, 0)), b.clone().addScaledVector(out, 0.015 * big).add(new THREE.Vector3(0, 0.19 * big, 0))], 0.02, 8, 0.08);
        }
      }
    }

    // Ears.
    if (a.ears !== 'none') {
      for (const side of [-1, 1]) {
        const shape = new THREE.Shape();
        if (a.ears === 'pointed') { shape.moveTo(0, -0.03); shape.quadraticCurveTo(0.03, -0.03, 0.045, 0.02); shape.quadraticCurveTo(0.06, 0.08, 0.1, 0.15); shape.quadraticCurveTo(0.03, 0.09, 0, 0.035); }
        else if (a.ears === 'bat') { shape.moveTo(0, -0.04); shape.quadraticCurveTo(0.08, -0.06, 0.12, 0.0); shape.lineTo(0.15, 0.1); shape.lineTo(0.1, 0.085); shape.lineTo(0.09, 0.17); shape.lineTo(0.05, 0.11); shape.lineTo(0.02, 0.16); shape.quadraticCurveTo(-0.01, 0.06, 0, 0.03); }
        else { shape.moveTo(0, -0.02); shape.quadraticCurveTo(0.07, -0.05, 0.15, -0.035); shape.quadraticCurveTo(0.09, 0.02, 0, 0.03); }
        shape.closePath();
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 });
        const ear = s.mesh(geometry, capFlat, capPoint(D3(side * 0.97, 0.08, -0.08)).add(new THREE.Vector3(-side * 0.008, 0, 0)).toArray() as P);
        ear.rotation.y = side > 0 ? -0.55 : Math.PI + 0.55;
        if (a.ears === 'goat') ear.rotation.z = side > 0 ? -0.25 : 0.25;
        if (a.ears === 'bat') {
          const inner = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.002, bevelEnabled: false }), s.material('#d98f84', { side: THREE.DoubleSide }), ear.position.toArray() as P);
          inner.rotation.copy(ear.rotation); inner.scale.setScalar(0.82); inner.position.z += 0.012; inner.position.y += 0.01;
        }
      }
    }

    // Extras.
    const swingers: THREE.Object3D[] = [];
    if (a.extra === 'chains' && anchors.length >= 2) {
      const [from, to] = [anchors[0].at, anchors[anchors.length > 2 ? 3 : 1].at];
      const links = 30, sag = from.distanceTo(to) * 0.45;
      const mesh = new THREE.InstancedMesh(new THREE.TorusGeometry(0.008, 0.0022, 5, 10), gold, links);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), prev = new THREE.Vector3(), here = new THREE.Vector3();
      const at = (t: number, out: THREE.Vector3) => out.lerpVectors(from, to, t).add(new THREE.Vector3(0, -sag * Math.sin(Math.PI * t), 0.03 * Math.sin(Math.PI * t)));
      for (let i = 0; i < links; i++) {
        at(i / (links - 1), here); at(Math.max(0, i - 1) / (links - 1) - 0.001, prev);
        q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), here.clone().sub(prev).normalize());
        if (i % 2) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
        m.compose(here, q, new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(i, m);
      }
      mesh.castShadow = true;
      s.root.add(mesh);
      const charm = s.ball([0.012, 0.016, 0.006], at(0.5, here).add(new THREE.Vector3(0, -0.02, 0)).toArray() as P, s.material('#b3141f', { roughness: 0.1 }), 10); void charm;
    }
    if (a.extra === 'rings') {
      for (const spot of ringSpots) {
        const ring = s.ring(spot.radius + 0.002, 0.0045, spot.at.toArray() as P, gold);
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), spot.tangent);
      }
    }
    if (a.extra === 'party-hat' && anchors.length) {
      const host = anchors[anchors.length - 1];
      const hue = mix(0.55, 0.95, mood.cheer);
      const texture = painted(256, 256, (ctx, w, h) => {
        const A = new THREE.Color().setHSL(hue, 0.8, 0.55).getStyle(), B = '#fff6d8', Cc = new THREE.Color().setHSL((hue + 0.5) % 1, 0.8, 0.55).getStyle();
        for (let i = 0; i < 16; i++) { ctx.fillStyle = [A, B, Cc, B][i % 4]; ctx.beginPath(); ctx.moveTo(i * 32 - 256, h); ctx.lineTo(i * 32 - 224, h); ctx.lineTo(i * 32 + 32, 0); ctx.lineTo(i * 32, 0); ctx.fill(); }
      });
      const hat = new THREE.Group();
      const coneMesh = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.15, 24, 1, true), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, side: THREE.DoubleSide }));
      coneMesh.position.y = 0.045;
      const pom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.016, 1), s.material('#ffe14a', { roughness: 1 })); pom.position.y = 0.125;
      const brim = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.004, 5, 24), s.material('#ffe14a')); brim.rotation.x = Math.PI / 2; brim.position.y = -0.03;
      hat.add(coneMesh, pom, brim);
      hat.traverse((o) => { o.castShadow = true; });
      hat.position.copy(host.tip).add(new THREE.Vector3(0, -0.02, 0));
      hat.rotation.set(0.15, 0, -0.3 + random() * 0.2);
      s.root.add(hat);
    }
    if (a.extra === 'tag' && anchors.length) {
      const host = anchors[0];
      const pivot = new THREE.Group();
      pivot.position.copy(host.at);
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.09, 4), s.material('#d8cfb8')); string.position.y = -0.045;
      const tagTexture = painted(256, 384, (ctx, w, h) => {
        ctx.fillStyle = '#e9d6a4'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#5a4630'; ctx.beginPath(); ctx.arc(w / 2, 40, 16, 0, 7); ctx.fill();
        ctx.fillStyle = '#b3141f'; ctx.font = 'bold 76px monospace'; ctx.textAlign = 'center'; ctx.fillText('HERO', w / 2, 160);
        ctx.fillStyle = '#2a2a33'; ctx.font = 'bold 40px monospace'; ctx.fillText('DO NOT', w / 2, 240); ctx.fillText('TOUCH', w / 2, 290);
        ctx.fillRect(40, 320, w - 80, 5);
      });
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.09), new THREE.MeshStandardMaterial({ map: tagTexture, roughness: 0.85, side: THREE.DoubleSide })); tag.position.y = -0.13;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(host.radius + 0.003, 0.0012, 4, 16), s.material('#d8cfb8'));
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), host.tangent);
      pivot.add(string, tag, ring);
      pivot.traverse((o) => { o.castShadow = true; });
      s.root.add(pivot);
      swingers.push(tag, string);
    }
    // Workshop pins and trimmings scale with density.
    const pins = Math.round(mix(0, 7, mood.density));
    for (let i = 0; i < pins; i++) {
      const d = D3((random() - 0.5) * 1.4, 0.15 + random() * 0.3, random() - 0.3);
      const at = capPoint(d), n = capHead.normal(d);
      s.rod(at.toArray() as P, at.clone().addScaledVector(n, 0.03).toArray() as P, 0.0009, s.material('#d5d8da', { metalness: 0.8 }));
      s.ball([0.004, 0.004, 0.004], at.clone().addScaledVector(n, 0.031).toArray() as P, s.material(['#e3202c', '#f2c230', '#2a8fd0', '#f1efe9'][i % 4], { roughness: 0.3 }), 8);
    }

    return s.finish({
      footprint: 0.12,
      update: swingers.length ? (_dt, time) => { for (const o of swingers) o.parent!.rotation.z = Math.sin(time * mix(0.6, 3, mood.energy)) * mix(0.03, 0.25, mood.energy); } : undefined,
    });
  },
});
