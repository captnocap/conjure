import * as THREE from 'three';
import { choice, defineThing, mix } from '@conjure/kit';
import { Bag, V, WOOL, crimp, finish, matte, tube, xf } from './bits';

export default defineThing({
  questions: {
    state: choice('How far has the bubble frozen?', {
      fresh: 'Just blown: still liquid and clear, with the first few frost stars starting on its skin.',
      half: 'Half frozen: ferns of frost have climbed from the bottom to its waist, the top still clear film.',
      frozen: 'Frozen right over: a white globe netted with ferns, like a Christmas bauble.',
      holed: 'Frozen and then burst: a brittle globe with a ragged hole broken in it.',
      collapsed: 'Collapsed: only a torn cup of frozen film is left, sagging, with shards round it.',
    }),
    film: choice('What colour is the soap film?', {
      rainbow: 'Swirling oil-slick rainbow: pink, green and gold.',
      blue: 'Cold blue and violet.',
      gold: 'Gold and rose, low sun through it.',
      silver: 'Nearly colourless, silver-grey.',
    }),
    frost: choice('What do the frost crystals on it look like?', {
      fern: 'Curling fern fronds.',
      feather: 'Long straight feathers.',
      star: 'Separate six-pointed stars, like a printed pattern.',
    }),
    perch: choice('What is it sitting on?', {
      wool: 'A tuft of dark wool fibres on a mitten.',
      snow: 'A soft mound of snow.',
      wand: 'The ring of a plastic bubble wand lying on the ground.',
      twig: 'A bare twig with a bud.',
    }),
    company: choice('Is it alone?', {
      single: 'One bubble.',
      double: 'A smaller bubble is stuck to its side.',
      foam: 'A froth of little bubbles sits round its foot.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group(), globe = new THREE.Group();
    const fernBag = new Bag(), base = new Bag(), plastic = new Bag(), shard = new Bag();
    const R = 0.15;
    const whole = a.state !== 'collapsed', icy = a.state === 'frozen' || a.state === 'holed' || a.state === 'collapsed';
    const hues = { rainbow: [0.92, 0.36, 0.13, 0.55], blue: [0.58, 0.66, 0.6, 0.72], gold: [0.1, 0.02, 0.13, 0.95], silver: [0.58, 0.6, 0.56, 0.6] }[a.film];
    const sat = (a.film === 'silver' ? 0.12 : a.film === 'rainbow' ? 0.75 : 0.6) * mix(0.75, 1.1, mood.cheer) * (icy ? 0.55 : 1);

    // Where the skin is missing: above a jagged line (collapsed) or inside a jagged hole.
    const holeDir = V(0.45, 0.6, 0.66).normalize(), jag = [random() * 6, random() * 6];
    const edge = (d: THREE.Vector3) => Math.sin(Math.atan2(d.z, d.x) * 5 + jag[0]) * 0.1 + Math.sin(Math.atan2(d.z, d.x) * 11 + jag[1]) * 0.06;
    const gone = (d: THREE.Vector3) => a.state === 'collapsed' ? d.y > -0.12 + edge(d) * 1.6 : a.state === 'holed' ? d.dot(holeDir) > 0.74 + edge(d) * 0.6 : false;

    const skinFor = (radius: number, phase: number) => {
      const source = new THREE.SphereGeometry(1, 56, 40).toNonIndexed(), p = source.getAttribute('position');
      const pos: number[] = [], col: number[] = [], c = new THREE.Color(), d = V(), centre = V();
      for (let i = 0; i < p.count; i += 3) {
        centre.set(0, 0, 0);
        for (let k = 0; k < 3; k++) centre.add(d.set(p.getX(i + k), p.getY(i + k), p.getZ(i + k)));
        if (gone(centre.normalize())) continue;
        for (let k = 0; k < 3; k++) {
          d.set(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
          pos.push(d.x * radius, d.y * radius, d.z * radius);
          const swirl = d.y * 2.2 + Math.sin(d.x * 4 + phase) * 0.6 + Math.sin(d.z * 5 + phase * 2) * 0.5 + phase, band = ((swirl % 4) + 4) % 4, i0 = Math.floor(band), f = band - i0;
          const hue = hues[i0] + (((hues[(i0 + 1) % 4] - hues[i0] + 1.5) % 1) - 0.5) * f;
          c.setHSL((hue + 1) % 1, sat, icy ? 0.74 : 0.56);
          col.push(c.r, c.g, c.b);
        }
      }
      source.dispose();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geometry.computeVertexNormals();
      // Flat shading would facet the film; rebuild smooth normals from position.
      const n = geometry.getAttribute('normal'), q = geometry.getAttribute('position');
      for (let i = 0; i < q.count; i++) { d.set(q.getX(i), q.getY(i), q.getZ(i)).normalize(); n.setXYZ(i, d.x, d.y, d.z); }
      return geometry;
    };
    const film = new THREE.MeshPhysicalMaterial({ vertexColors: true, transparent: true, opacity: icy ? 0.62 : 0.4, roughness: icy ? 0.3 : 0.04, clearcoat: 1, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0, iridescence: icy ? 0.3 : 1 });
    const rim = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hues[0], sat * 0.6, 0.42), transparent: true, opacity: 0.22, side: THREE.BackSide, depthWrite: false });
    const skin = new THREE.Mesh(skinFor(R, random() * 6), film);
    skin.castShadow = true;
    globe.add(skin);
    if (whole) globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 40, 28), rim));

    // ---- Frost grown over the sphere: walk great circles, branching as it goes. ----
    const P = { fern: { curl: 2.2, barb: 1.05, scale: 0.42, steps: 12 }, feather: { curl: 0.3, barb: 0.6, scale: 0.3, steps: 14 }, star: { curl: 0, barb: 1.047, scale: 0.4, steps: 5 } }[a.frost];
    const limit = a.state === 'fresh' ? -2 : a.state === 'half' ? 0.12 : 2;
    const grow = (from: THREE.Vector3, heading: THREE.Vector3, length: number, depth: number, curl: number) => {
      const steps = depth === 0 ? P.steps : depth === 1 ? 5 : 2, step = length / steps;
      const p = from.clone(), h = heading.clone(), points = [p.clone()], axis = V();
      for (let i = 0; i < steps; i++) {
        axis.crossVectors(p, h).normalize();
        p.applyAxisAngle(axis, step); h.applyAxisAngle(axis, step);
        h.applyAxisAngle(p, (curl / steps) * (0.4 + (i / steps) * 1.4));
        if (gone(p) || (depth === 0 && p.y > limit + 0.2)) break;
        points.push(p.clone());
        const t = i / steps;
        if (depth < 2 && (depth === 0 || a.frost !== 'star')) {
          const envelope = Math.sin(Math.min(1, t * 1.1 + 0.15) * Math.PI) ** 0.6;
          for (const side of [-1, 1]) grow(p, h.clone().applyAxisAngle(p, side * P.barb), length * P.scale * envelope * (0.8 + random() * 0.4), depth + 1, curl * side * 0.5);
        }
      }
      if (points.length < 2) return;
      const lift = R * (1.006 + (2 - depth) * 0.003), r = [0.0036, 0.002, 0.0012][depth];
      fernBag.add(tube(points.map((q) => q.clone().multiplyScalar(lift)), (t) => r * (1 - t * 0.6), { sides: depth === 0 ? 5 : 3 }), depth === 0 ? '#ffffff' : depth === 1 ? '#eef5fb' : '#dfeaf3');
    };
    const tangent = (p: THREE.Vector3) => { const t = V(random() - 0.5, random() - 0.5, random() - 0.5); return t.addScaledVector(p, -t.dot(p)).normalize(); };
    const starAt = (p: THREE.Vector3, size: number) => { const t = tangent(p); for (let k = 0; k < 6; k++) grow(p, t.clone().applyAxisAngle(p, (k * Math.PI) / 3), size, 0, 0); };
    const south = V(0, -1, 0);
    const climbers = a.state === 'fresh' ? 0 : Math.round(mix(6, 10, mood.density));
    for (let i = 0; i < climbers; i++) {
      const angle = ((i + random() * 0.5) / climbers) * Math.PI * 2, start = south.clone().applyAxisAngle(V(Math.cos(angle), 0, Math.sin(angle)), 0.22);
      const up = V(0, 1, 0).addScaledVector(start, -start.y).normalize();
      const length = (a.state === 'half' ? 1.25 : 2.3) * (0.75 + random() * 0.4) * mix(1.1, 0.85, mood.warmth);
      if (a.frost === 'star') { for (let k = 1; k <= (a.state === 'half' ? 2 : 4); k++) { const at = start.clone().applyAxisAngle(V().crossVectors(start, up).normalize(), k * 0.55 + random() * 0.2); if (!gone(at)) starAt(at, 0.3 + random() * 0.14); } }
      else grow(start, up, length, 0, (random() < 0.5 ? -1 : 1) * P.curl * (0.5 + random() * 0.6));
    }
    const loose = a.state === 'fresh' ? 4 + Math.floor(random() * 3) : a.state === 'half' ? 3 : 7;
    for (let i = 0; i < loose; i++) {
      const p = V(random() - 0.5, a.state === 'frozen' || a.state === 'holed' ? random() - 0.2 : random() - 0.5, random() - 0.3).normalize();
      if (!gone(p)) starAt(p, a.state === 'fresh' ? 0.2 + random() * 0.16 : 0.26 + random() * 0.14);
    }
    fernBag.into(globe, matte({ roughness: 0.5, emissive: '#c4d6e6', emissiveIntensity: 0.4 }));

    // Shards where the film broke.
    if (!whole || a.state === 'holed') {
      const count = a.state === 'holed' ? 7 : 14;
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, dist = R * (a.state === 'holed' ? 0.9 + random() * 0.5 : 0.5 + random() * 1.1), s = R * (0.08 + random() * 0.16);
        const piece = new THREE.SphereGeometry(1, 5, 3, 0, 0.9, 1.1, 0.7);
        shard.add(piece, new THREE.Color().setHSL(hues[i % 4], sat * 0.6, 0.78), xf(V(Math.cos(angle) * dist + (a.state === 'holed' ? R * 0.5 : 0), s * 0.2 - s * 0.55, Math.sin(angle) * dist + (a.state === 'holed' ? R * 0.6 : 0)), s, new THREE.Euler(random() * 0.6 - 0.3, random() * 6, random() * 0.6 - 0.3)));
      }
    }

    // ---- The perch. `seat` is the height of the bubble's lowest point. ----
    let seat = 0.02;
    const dye = new THREE.Color(Object.values(WOOL)[Math.floor(random() * 4)]);
    if (a.perch === 'wool') {
      base.add(new THREE.CylinderGeometry(R * 0.95, R * 1.05, 0.016, 24), dye.clone().multiplyScalar(0.7), xf(V(0, 0.008, 0)));
      const count = Math.round(mix(40, 80, mood.density));
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, dist = R * (0.15 + random() * 0.85), from = V(Math.cos(angle) * dist, 0.014, Math.sin(angle) * dist);
        const out = dist / R, to = from.clone().add(V(Math.cos(angle) * 0.03 * out, 0.035 + out * 0.07 * random() + 0.01, Math.sin(angle) * 0.03 * out));
        base.add(tube(crimp(from, to, 0.005, 3 + random() * 3, random, 0.1), (t) => mix(0.0034, 0.0014, t), { sides: 5 }), dye.clone().offsetHSL(0, 0, (random() - 0.3) * 0.16));
      }
      seat = 0.04;
    } else if (a.perch === 'snow') {
      const mound = new THREE.SphereGeometry(1, 32, 14), p = mound.getAttribute('position');
      for (let i = 0; i < p.count; i++) p.setY(i, Math.max(0, p.getY(i)) * (1 + Math.sin(p.getX(i) * 6) * Math.sin(p.getZ(i) * 5) * 0.2));
      mound.computeVertexNormals();
      base.add(mound, '#d3dfe9', xf(V(0, 0, 0), V(R * 1.35, 0.06, R * 1.2)));
      seat = 0.045;
    } else if (a.perch === 'wand') {
      const colour = new THREE.Color().setHSL([0.93, 0.14, 0.55, 0.35][Math.floor(random() * 4)], 0.7, mix(0.42, 0.58, mood.cheer));
      const ring = R * 0.52;
      plastic.add(new THREE.TorusGeometry(ring, 0.011, 10, 40), colour, xf(V(0, 0.011, 0), 1, new THREE.Euler(Math.PI / 2, 0, 0)));
      for (let i = 0; i < 28; i++) plastic.add(new THREE.BoxGeometry(0.004, 0.006, 0.026), colour.clone().offsetHSL(0, 0, -0.06), xf(V(Math.cos(i / 28 * 6.283) * ring, 0.022, Math.sin(i / 28 * 6.283) * ring), 1, new THREE.Euler(0, -i / 28 * 6.283 + Math.PI / 2, 0)));
      plastic.add(new THREE.CylinderGeometry(0.009, 0.011, R * 1.7, 10), colour, xf(V(ring + R * 0.85, 0.011, 0), 1, new THREE.Euler(0, 0, Math.PI / 2)));
      plastic.add(new THREE.SphereGeometry(0.017, 12, 8), colour, xf(V(ring + R * 1.7, 0.013, 0)));
      seat = 0.022 - R * (1 - Math.sqrt(1 - 0.52 * 0.52));
    } else {
      const bark = new THREE.Color('#4b3a30');
      const path = [V(-R * 1.5, 0.012, 0.03), V(-R * 0.6, 0.04, 0.0), V(0, 0.05, 0), V(R * 0.7, 0.043, -0.01), V(R * 1.5, 0.02, 0.03)];
      base.add(tube(path, (t) => mix(0.016, 0.008, t), { sides: 7, smooth: 24 }), bark);
      base.add(tube([V(-R * 0.5, 0.04, 0), V(-R * 0.3, 0.07, 0.07), V(-R * 0.15, 0.075, 0.13)], (t) => mix(0.008, 0.004, t), { sides: 6, smooth: 8 }), bark);
      for (const at of [V(R * 1.5, 0.024, 0.03), V(-R * 0.15, 0.079, 0.135), V(R * 0.3, 0.063, -0.004)]) base.add(new THREE.SphereGeometry(1, 8, 6), '#7a5a3a', xf(at, V(0.008, 0.013, 0.008)));
      for (let i = 0; i < 20; i++) base.add(new THREE.IcosahedronGeometry(1, 0), '#eef5fb', xf(V((random() - 0.5) * R * 2.6, 0.046 + random() * 0.012, (random() - 0.5) * 0.012), 0.004 + random() * 0.004));
      seat = 0.058;
    }

    globe.position.y = seat + R * (whole ? 0.985 : 0.97);
    if (!whole) globe.scale.set(1.08, 0.82, 1.08);
    root.add(globe);

    // Companions.
    const others = new THREE.Group();
    const small = (at: THREE.Vector3, r: number, phase: number) => {
      const colour = new THREE.Color().setHSL(hues[Math.floor(phase) % 4], sat, 0.6);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshPhysicalMaterial({ color: colour, transparent: true, opacity: 0.45, roughness: 0.05, clearcoat: 1, iridescence: 1 }));
      mesh.position.copy(at); mesh.castShadow = true;
      others.add(mesh);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: colour, emissiveIntensity: 0.4, roughness: 0.2 }));
      glint.position.copy(at).add(V(-r * 0.45, r * 0.6, r * 0.55));
      others.add(glint);
    };
    if (a.company === 'double' && whole) {
      const r = R * 0.52, dir = V(0.8, -0.3, 0.52).normalize();
      small(globe.position.clone().addScaledVector(dir, R + r * 0.72), r, 1);
    } else if (a.company === 'foam' || (a.company === 'double' && !whole)) {
      const count = 7 + Math.round(mood.density * 8);
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, r = R * (0.1 + random() * 0.16), dist = R * (0.62 + random() * 0.5);
        small(V(Math.cos(angle) * dist, Math.max(r, seat * 0.5 + r * 0.8), Math.sin(angle) * dist), r, i);
      }
    }
    root.add(others);
    // One bright window reflection sells the liquid film.
    if (whole) {
      const shine = new Bag();
      shine.add(new THREE.SphereGeometry(1, 12, 8), '#ffffff', xf(V(-R * 0.52, R * 0.6, R * 0.62), V(R * 0.16, R * 0.09, R * 0.03), new THREE.Euler(-0.6, -0.6, 0.5)));
      shine.add(new THREE.SphereGeometry(1, 8, 6), '#ffffff', xf(V(R * 0.5, -R * 0.45, R * 0.74), V(R * 0.05, R * 0.04, R * 0.02)));
      const mesh = shine.into(root, new THREE.MeshStandardMaterial({ emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.2 }));
      if (mesh) mesh.position.copy(globe.position);
    }
    base.into(root, matte({ roughness: 0.95 }));
    plastic.into(root, matte({ roughness: 0.35 }));
    shard.into(root, new THREE.MeshPhysicalMaterial({ roughness: 0.25, side: THREE.DoubleSide, transparent: true, opacity: 0.8, emissive: '#aebfd0', emissiveIntensity: 0.2 }));

    const pace = mix(0.03, 0.5, mood.energy);
    return finish(root, whole ? (dt) => { globe.rotation.y += dt * pace; } : undefined, R * 1.05);
  },
});
