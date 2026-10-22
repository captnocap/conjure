import * as THREE from 'three';
import { choice, defineThing, mix, score } from '@conjure/kit';
import { displace, grounded, mat, mesh, noise, paint, range, smooth, terrainDisc } from './lib';

const TONES = {
  dark: ['#5a534c', '#655d55', '#4e4842', '#6e665d'],
  pale: ['#9a9893', '#b3b4b1', '#8a8680', '#c4c8c8'],
  mixed: ['#4e4842', '#aeb0ae', '#5f5850', '#cfd5d7', '#6e665d'],
  bluish: ['#7e8e98', '#95a8b3', '#6a7981', '#b3c6cf'],
} as const;

export default defineThing({
  questions: {
    exposure: choice('Where are the knobs exposed?', {
      slab: 'A tilted slab of crust lifted out of the plain, its face pebbled all over.',
      wall: 'A steep wall face, the bumps stacked up it like a honeycomb.',
      plain: 'A low patch of open plain, knobs half buried in drifted dust.',
      block: 'A broken-off block lying on its side, knobbed on two faces.',
    }),
    packing: choice('How are they packed?', {
      tight: 'Shoulder to shoulder, a pebbled skin like goosebumps.',
      loose: 'Spaced apart, each knob standing on its own.',
      rows: 'In rough rows like old cobbles.',
      colonies: 'Clumped into colonies with bare patches between.',
    }),
    knob: choice('What shape are the knobs?', {
      domes: 'Smooth round domes.',
      cones: 'Pointed cones, like the scales of a pinecone.',
      blocks: 'Angular broken blocks.',
      stubs: 'Short stubby pillars with flat tops.',
    }),
    tone: choice('What colour are they?', {
      dark: 'Dark dusty grey like everything here.',
      pale: 'Pale grey with icy tops.',
      mixed: 'A patchwork of dark and pale knobs.',
      bluish: 'Faintly bluish ice under a thin dust skin.',
    }),
    story: choice('What has happened here?', {
      untouched: 'Nothing: untouched since the solar system formed.',
      cracked: 'A crack has split the slab and one side has dropped.',
      venting: 'Thin wisps of vapour rising from between the knobs in the sun.',
      sockets: 'A few knobs have popped out, leaving bright pale sockets.',
    }),
    drift: score('How deep has dust drifted between them?', ['Clean, every knob distinct', 'Dust pooling in the gaps', 'Drifted nearly to their tops']),
    size: score('How big is each knob?', ['Boulder sized, a metre or so', 'House sized', 'Hill sized, tens of metres']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const n = noise(random);
    const knobR = mix(0.9, 6, a.size ** 1.5) * range(random, 0.9, 1.1);
    const spacing = knobR * { tight: 1.45, loose: 2.2, rows: 1.7, colonies: 1.6 }[a.packing];
    const W = knobR * 26, Dd = knobR * 17;
    const tones = TONES[a.tone].map((c) => new THREE.Color(c).lerp(new THREE.Color('#6b6258'), mood.wear * 0.25));

    // ---- Each knobbed face: a parallelogram on the slab, with a mask that frays its edges ----
    type Face = { origin: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3; normal: THREE.Vector3; part: number };
    const faces: Face[] = [];
    const slabs: { group: THREE.Group; w: number; h: number; d: number; x: number }[] = [];
    const thick = { slab: knobR * 3, wall: knobR * 12, plain: knobR * 1.2, block: knobR * 9 }[a.exposure];
    const tilt = { slab: 0.16, wall: 1.05, plain: 0.04, block: 0.12 }[a.exposure] + range(random, -0.05, 0.05);
    const crack = a.story === 'cracked';
    const parts = crack ? [[-W / 2, -W * 0.08], [W * 0.02, W / 2]] : [[-W / 2, W / 2]];
    const sides = mat('#ffffff', { vertexColors: true, roughness: 1, flatShading: true });
    parts.forEach(([x0, x1], part) => {
      const w = x1 - x0, cx = (x0 + x1) / 2;
      const group = new THREE.Group();
      const drop = crack && part === 1 ? -thick * 0.35 - knobR : 0;
      group.position.set(cx, drop, 0);
      group.rotation.set(tilt, crack && part === 1 ? 0.06 : 0, crack ? (part === 0 ? 0.03 : -0.05) : range(random, -0.04, 0.04));
      root.add(group);
      const box = new THREE.BoxGeometry(w, thick, Dd, 16, 6, 12);
      box.translate(0, -thick / 2, 0);
      displace(box, (p) => n(p.x + cx, p.y, p.z, 0.5 / knobR) * knobR * (p.y > -0.01 ? 0.1 : 0.3));
      paint(box, (p, c) => {
        const band = Math.sin((p.y / knobR) * 1.6 + n(p.x, p.z, 0, 0.3 / knobR) * 2);
        c.set('#2f2b28').lerp(new THREE.Color('#5a524a'), smooth(0.3, 1, band) * 0.6);
      });
      mesh(group, box, sides);
      slabs.push({ group, w, h: thick, d: Dd, x: cx });
      faces.push({ origin: new THREE.Vector3(-w / 2, 0, -Dd / 2), u: new THREE.Vector3(w, 0, 0), v: new THREE.Vector3(0, 0, Dd), normal: new THREE.Vector3(0, 1, 0), part });
      if (a.exposure === 'block') faces.push({ origin: new THREE.Vector3(-w / 2, -thick, Dd / 2), u: new THREE.Vector3(w, 0, 0), v: new THREE.Vector3(0, thick, 0), normal: new THREE.Vector3(0, 0, 1), part });
    });

    // ---- Knobs: close-packed, jittered, one instanced draw ----
    const geometry = {
      domes: new THREE.SphereGeometry(1, 14, 9),
      cones: new THREE.ConeGeometry(1, 1.6, 9).translate(0, 0.4, 0),
      blocks: new THREE.DodecahedronGeometry(1, 0),
      stubs: new THREE.CylinderGeometry(0.75, 0.95, 1.2, 9).translate(0, 0.1, 0),
    }[a.knob];
    const spots: { group: THREE.Group; at: THREE.Vector3; normal: THREE.Vector3; r: number; squash: number; colour: THREE.Color; socket: boolean }[] = [];
    const vents: THREE.Vector3[] = [];
    for (const face of faces) {
      const lenU = face.u.length(), lenV = face.v.length();
      const rowGap = spacing * 0.866;
      for (let row = 0; row * rowGap < lenV; row++) {
        for (let col = 0; col * spacing < lenU + spacing; col++) {
          let s = (col * spacing + (row % 2 ? spacing / 2 : 0)) / lenU, t = (row * rowGap + rowGap * 0.4) / lenV;
          const jitter = a.packing === 'rows' ? 0.08 : 0.28;
          s += range(random, -jitter, jitter) * spacing / lenU;
          t += range(random, -jitter, jitter) * spacing / lenV;
          if (s < 0.01 || s > 0.99 || t < 0.01 || t > 0.99) continue;
          const at = face.origin.clone().addScaledVector(face.u, s).addScaledVector(face.v, t);
          const edge = Math.min(s, 1 - s, t, 1 - t) * Math.min(lenU, lenV) / knobR;
          if (edge < 1.2 + n(at.x, at.z, at.y, 0.2 / knobR) * 0.8) continue;
          const slab = slabs[face.part];
          if (a.packing === 'colonies' && n(at.x + slab.x, at.z, 0, 0.12 / knobR) < -0.12) continue;
          if (a.packing === 'loose' && random() < 0.1) continue;
          const r = knobR * range(random, 0.75, 1.2);
          const socket = a.story === 'sockets' && random() < 0.05;
          const colour = tones[Math.floor(random() * tones.length)].clone().offsetHSL(0, 0, range(random, -0.03, 0.03));
          spots.push({ group: slab.group, at, normal: face.normal, r, squash: range(random, 0.95, 1.3) * (a.knob === 'domes' ? 1 : 0.85), colour, socket });
          if (a.story === 'venting' && random() < 0.06) vents.push(at.clone().addScaledVector(face.normal, r * 0.3));
        }
      }
    }
    // One InstancedMesh per slab part, so a dropped half carries its own knobs.
    const knobMat = mat('#ffffff', { roughness: 0.62, flatShading: a.knob === 'blocks' });
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), spin = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3();
    for (const slab of slabs) {
      const mine = spots.filter((spot) => spot.group === slab.group);
      const im = new THREE.InstancedMesh(geometry, knobMat, Math.max(1, mine.length));
      im.count = mine.length;
      mine.forEach((spot, i) => {
        q.setFromUnitVectors(up, spot.normal).multiply(spin.setFromAxisAngle(up, random() * Math.PI * 2));
        const tiltJ = new THREE.Quaternion().setFromEuler(new THREE.Euler(range(random, -0.15, 0.15), 0, range(random, -0.15, 0.15)));
        q.multiply(tiltJ);
        const r = spot.socket ? spot.r * 0.8 : spot.r;
        sc.set(r, r * (spot.socket ? 0.12 : spot.squash), r);
        const at = spot.at.clone().addScaledVector(spot.normal, spot.socket ? r * 0.02 : r * 0.12);
        im.setMatrixAt(i, matrix.compose(at, q, sc));
        im.setColorAt(i, spot.socket ? new THREE.Color('#e4eef2') : spot.colour);
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = im.receiveShadow = true;
      slab.group.add(im);
      // Dust pooled between the knobs: a soft surface lifted part-way up them.
      if (a.drift > 0.05) {
        const lift = knobR * mix(0.05, 0.42, a.drift);
        const dust = new THREE.PlaneGeometry(slab.w * 0.97, slab.d * 0.97, 24, 16);
        dust.rotateX(-Math.PI / 2);
        const dp = dust.attributes.position;
        for (let i = 0; i < dp.count; i++) {
          const x = dp.getX(i), z = dp.getZ(i);
          const edge = Math.min(slab.w / 2 - Math.abs(x), slab.d / 2 - Math.abs(z)) / knobR;
          dp.setY(i, lift * smooth(0, 2.5, edge) + n(x + slab.x, z, 0, 0.25 / knobR) * lift * 0.5 * smooth(0, 2.5, edge));
        }
        dust.computeVertexNormals();
        const dustColour = a.tone === 'pale' ? '#6a655e' : '#3a3530';
        mesh(slab.group, dust, mat(dustColour, { roughness: 1 }));
        if (a.exposure === 'block') {
          const front = new THREE.PlaneGeometry(slab.w * 0.97, slab.h * 0.97, 1, 1);
          mesh(slab.group, front, mat(dustColour, { roughness: 1 }), [0, -slab.h / 2, slab.d / 2 + lift * 0.4]);
        }
      }
    }

    // ---- The plain around it: a dusty apron the slab is bedded into ----
    const R = Math.hypot(W, Dd) * 0.56;
    const apron = terrainDisc(20, 64, (angle) => R * (1 + n(Math.cos(angle), 0, Math.sin(angle), 0.8) * 0.12), (x, z, t) => {
      const near = Math.max(Math.abs(x) / (W / 2), Math.abs(z) / (Dd / 2));
      return (knobR * 0.6 * (1 - smooth(0.9, 1.5, near)) + n(x, 0, z, 0.15 / knobR) * knobR * 0.2) * (1 - smooth(0.85, 1, t)) - smooth(0.93, 1, t) * knobR * 0.1;
    });
    paint(apron, (p, c) => c.set('#3c3631').lerp(new THREE.Color('#5c544b'), Math.max(0, n(p.x, p.z, 0, 0.2 / knobR)) * 0.5));
    const ground = mesh(root, apron, mat('#ffffff', { vertexColors: true, roughness: 1, flatShading: true }));
    // Seat the slabs so their lower edge is buried in the apron, not perched on it.
    for (const slab of slabs) slab.group.position.y += { slab: Dd / 2 * Math.sin(tilt) + knobR * 0.6, wall: Dd / 2 * Math.sin(tilt) + knobR, plain: knobR * 0.7, block: thick * 0.25 }[a.exposure];
    // ---- Vapour wisps for a waking surface ----
    const wisps: { mesh: THREE.Mesh; base: THREE.Vector3; phase: number }[] = [];
    if (vents.length) {
      const wispMat = new THREE.MeshStandardMaterial({ color: '#eef4f7', emissive: '#dfeaf0', emissiveIntensity: 0.5, transparent: true, opacity: 0.35, depthWrite: false });
      const wispGeo = new THREE.ConeGeometry(knobR * 0.5, knobR * 5, 10, 1, true).translate(0, knobR * 2.5, 0).rotateX(Math.PI);
      wispGeo.translate(0, knobR * 5, 0);
      for (const vent of vents.slice(0, 18)) {
        const slab = slabs[0];
        const world = vent.clone();
        slab.group.updateMatrixWorld(true);
        world.applyMatrix4(slab.group.matrixWorld);
        const wisp = mesh(root, wispGeo, wispMat, world.toArray() as [number, number, number], 1, [range(random, -0.15, 0.15), 0, range(random, -0.15, 0.15)], false);
        wisps.push({ mesh: wisp, base: world, phase: random() * 6 });
      }
    }
    const pace = mix(0.2, 1.6, mood.energy);
    const update = wisps.length ? (_dt: number, time: number) => {
      for (const w of wisps) {
        const k = 0.75 + 0.25 * Math.sin(time * pace + w.phase);
        w.mesh.scale.set(k, 0.8 + 0.4 * Math.sin(time * pace * 0.7 + w.phase), k);
        w.mesh.position.x = w.base.x + Math.sin(time * pace * 0.5 + w.phase) * knobR * 0.3;
      }
    } : undefined;
    return grounded(root, { measure: ground, update, footprint: R * 0.75 });
  },
});
