import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
type Dot = { at: P3; size: number; color: THREE.ColorRepresentation };

export default defineThing({
  questions: {
    drawn: choice('How is the invisible halo drawn?', {
      contours: 'Fine contour rings, like the height lines of a hill on a map.',
      glass: 'A sphere of clear refractive glass with a bright rim and a highlight.',
      mesh: 'A dotted survey mesh, thousands of plotted points on a sphere.',
      ghost: 'Not drawn at all: there is only the bent starlight and what it holds.',
    }),
    lumps: score('How lumpy is it?', ['Perfectly smooth', 'One or two small bulges', 'Knobbly with sub-halos', 'A cluster of bubbles']),
    holds: choice('What does it cradle at its centre?', {
      empty: 'Nothing: a dark halo that never lit a single star.',
      spiral: 'One small bright spiral galaxy, tiny against the halo around it.',
      dwarf: 'A dim ragged smudge of a dwarf.',
      pair: 'Two small galaxies circling each other.',
      stream: 'A galaxy wrapped in a looping stream of stars it has torn from something smaller.',
    }),
    bend: score('How strongly does it bend the stars behind it?', ['A faint shear, barely noticeable', 'Stars near the edge lean sideways', 'A crowd of short arcs around the rim', 'A near-complete ring of smeared light']),
    form: choice('What shape is the halo?', {
      round: 'A true sphere.',
      squashed: 'Squashed flat like a lentil.',
      stretched: 'Stretched tall like an egg or a rugby ball.',
    }),
    company: choice('Is it connected to anything?', {
      alone: 'Alone and closed.',
      merging: 'Merging: a second, smaller halo overlaps it on one side.',
      tethered: 'Tethered: thin dotted threads of matter run into it from either side.',
    }),
    base: choice('What does it rest on?', {
      none: 'Nothing: it hangs in space.',
      globe: 'A turned wooden base, like a snow globe on a mantelpiece.',
      stand: 'A brass ring on three thin legs, like a specimen or a crystal ball.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const unit = context.scale === 'tabletop' ? 0.045 : context.scale === 'room' ? 0.16 : 1;
    const body = new THREE.Group();
    body.scale.setScalar(unit);
    s.root.add(body);
    const gauss = () => (random() + random() + random() + random() - 2) / 1.2;
    const R = 1.7;
    const line = new THREE.Color('#5f58a6').lerp(new THREE.Color('#b08a3a'), mood.warmth * 0.45).lerp(new THREE.Color('#77717f'), mood.wear * 0.3);
    const linePaint = new THREE.MeshStandardMaterial({ color: line, emissive: line, emissiveIntensity: 0.35, roughness: 0.6 });
    const deepPaint = new THREE.MeshStandardMaterial({ color: line.clone().multiplyScalar(0.72), emissive: line, emissiveIntensity: 0.2, roughness: 0.6 });
    const veil = (opacity: number, side: THREE.Side = THREE.FrontSide, colour: THREE.ColorRepresentation = '#b9b4e6') => new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false, side });
    const squash = a.form === 'squashed' ? new THREE.Vector3(1.12, 0.68, 1.12) : a.form === 'stretched' ? new THREE.Vector3(0.82, 1.3, 0.82) : new THREE.Vector3(1, 1, 1);
    const dots: Dot[] = [];
    const ringGeometry = (radius: number, tube: number) => new THREE.TorusGeometry(radius, tube, 6, 56);

    const drawHalo = (centre: THREE.Vector3, radius: number, detail: number) => {
      const group = new THREE.Group();
      group.position.copy(centre);
      group.scale.copy(squash);
      body.add(group);
      const put = (mesh: THREE.Mesh, shadow = false) => { mesh.castShadow = shadow; group.add(mesh); return mesh; };
      put(new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), veil(a.drawn === 'ghost' ? 0.05 : 0.1)));
      if (a.drawn === 'ghost') put(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.01, 32, 20), veil(0.16, THREE.BackSide, '#8f96d8')));
      if (a.drawn === 'contours') {
        const rings = Math.round(9 * detail) + 2;
        for (let k = 1; k < rings; k++) {
          const lat = -Math.PI / 2 + Math.PI * k / rings;
          const ring = put(new THREE.Mesh(ringGeometry(radius * Math.cos(lat), 0.014 * Math.sqrt(radius / R) * R), linePaint), true);
          ring.rotation.x = Math.PI / 2; ring.position.y = radius * Math.sin(lat);
        }
        if (detail >= 1) {
          for (let k = 1; k < 5; k++) {
            const lat = -Math.PI / 2 + Math.PI * k / 5;
            const ring = put(new THREE.Mesh(ringGeometry(radius * 0.52 * Math.cos(lat), 0.011 * R), deepPaint), true);
            ring.rotation.x = Math.PI / 2; ring.position.y = radius * 0.52 * Math.sin(lat);
          }
          for (const turn of [0, Math.PI / 2]) put(new THREE.Mesh(ringGeometry(radius, 0.009 * R), deepPaint), true).rotation.y = turn;
        }
      } else if (a.drawn === 'glass') {
        put(new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), new THREE.MeshPhysicalMaterial({ color: '#dfe6ff', transparent: true, opacity: 0.2, roughness: 0.04, metalness: 0, clearcoat: 1, depthWrite: false })));
        put(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.012, 32, 20), veil(0.3, THREE.BackSide, '#8f96d8')));
        const shine = put(new THREE.Mesh(new THREE.SphereGeometry(radius * 0.2, 14, 10), veil(0.75, THREE.FrontSide, '#ffffff')));
        shine.position.set(-radius * 0.42, radius * 0.6, radius * 0.6); shine.scale.set(1, 0.45, 0.25); shine.lookAt(group.position);
        put(new THREE.Mesh(ringGeometry(radius, 0.008 * R), linePaint), true).rotation.x = Math.PI / 2;
      } else if (a.drawn === 'mesh') {
        const count = Math.round(520 * detail * detail + 60);
        for (let i = 0; i < count; i++) {
          const y = 1 - (i + 0.5) / count * 2, r = Math.sqrt(1 - y * y), turn = i * 2.399963;
          dots.push({ at: [centre.x + Math.cos(turn) * r * radius * squash.x, centre.y + y * radius * squash.y, centre.z + Math.sin(turn) * r * radius * squash.z], size: 0.022 * R * (0.7 + 0.3 * detail), color: i % 7 === 0 ? '#c9902a' : line });
        }
        for (const turn of [0, Math.PI / 3, Math.PI * 2 / 3]) put(new THREE.Mesh(ringGeometry(radius, 0.006 * R), deepPaint), true).rotation.y = turn;
      }
    };

    drawHalo(new THREE.Vector3(0, 0, 0), R, 1);
    const subs = Math.round(mix(0, 8, a.lumps));
    for (let k = 0; k < subs; k++) {
      const dir = new THREE.Vector3(gauss(), gauss() * 0.8, gauss() * 0.6 + 0.3).normalize();
      const radius = R * mix(0.2, 0.4, random());
      drawHalo(dir.multiplyScalar(R * mix(0.82, 1.02, random())).multiply(squash), radius, 0.45);
    }
    if (a.company === 'merging') drawHalo(new THREE.Vector3((random() < 0.5 ? -1 : 1) * R * 1.05, R * 0.15, R * 0.2), R * 0.62, 0.7);

    // The starfield behind it: undisturbed far from the halo, smeared into arcs near its rim.
    const based = a.base !== 'none';
    const lensR = based ? R * 0.6 : R * 1.02, fieldR = based ? R * 0.95 : R * 2.05;
    const stars = Math.round(mix(110, 240, mood.density) * (based ? 0.6 : 1));
    const starTints = ['#3d4c86', '#6b5fb0', '#c08a24', '#2f3a66', '#8a4f8e'].map((colour) => new THREE.Color(colour));
    const field = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), stars);
    const matrix = new THREE.Matrix4(), turnQ = new THREE.Quaternion(), scale = new THREE.Vector3(), at = new THREE.Vector3();
    for (let i = 0; i < stars; i++) {
      const angle = random() * Math.PI * 2;
      const raw = Math.sqrt(random()) * fieldR;
      // Light is pushed outward from the centre and stretched round the rim.
      const push = mix(0.15, 0.55, a.bend) * lensR;
      const rho = Math.min(fieldR, Math.sqrt(raw * raw + push * push * 4) * 0.5 + raw * 0.5 + push * 0.2);
      const near = Math.exp(-(((rho - lensR) / (lensR * 0.3)) ** 2));
      const size = (0.03 + random() * 0.03) * R / 1.7 * (based ? 0.75 : 1);
      const shear = 1 + near * mix(1, 9, a.bend);
      const x = Math.cos(angle) * rho * (based ? squash.x : 1), y = Math.sin(angle) * rho * (based ? squash.y : 1);
      at.set(x, y, based ? -Math.sqrt(Math.max(0.01, R * R - rho * rho)) * 0.9 * squash.z : -R * 1.12 * squash.z);
      turnQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle + Math.PI / 2);
      scale.set(size * shear, size * 0.8, size * 0.8);
      field.setMatrixAt(i, matrix.compose(at, turnQ, scale));
      field.setColorAt(i, starTints[Math.floor(random() * starTints.length)].clone().lerp(new THREE.Color('#e9c25a'), near * 0.5));
    }
    field.instanceMatrix.needsUpdate = true;
    if (field.instanceColor) field.instanceColor.needsUpdate = true;
    body.add(field);

    // What it holds.
    const gold = new THREE.MeshStandardMaterial({ color: '#f3cd6a', emissive: '#e09a26', emissiveIntensity: mix(0.5, 1, mood.cheer), roughness: 0.5 });
    const cradle = new THREE.Group();
    body.add(cradle);
    const spiral = (centre: THREE.Vector3, radius: number, count: number, tilt: number) => {
      const basis = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(tilt, random() * 3, 0.3));
      for (let i = 0; i < count; i++) {
        const r = 0.12 * radius + Math.pow(random(), 0.8) * radius, angle = (i % 2) * Math.PI + r / radius * 4.2 + gauss() * 0.3;
        const p = new THREE.Vector3(Math.cos(angle) * r, gauss() * 0.03 * radius, Math.sin(angle) * r).applyMatrix4(basis).add(centre);
        dots.push({ at: p.toArray() as P3, size: 0.018 + random() * 0.022, color: ['#e2a528', '#f0c858', '#6f9be6', '#c98016'][i % 4] });
      }
      const bulge = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.2, 16, 12), gold);
      bulge.position.copy(centre); bulge.castShadow = true; cradle.add(bulge);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.5, 16, 12), veil(0.3, THREE.FrontSide, '#f2b63a'));
      glow.position.copy(centre); cradle.add(glow);
    };
    if (a.holds === 'spiral' || a.holds === 'stream') spiral(new THREE.Vector3(0, 0, 0), R * 0.34, 320, 0.7);
    if (a.holds === 'pair') { spiral(new THREE.Vector3(-R * 0.22, 0.05, 0), R * 0.2, 170, 0.5); spiral(new THREE.Vector3(R * 0.24, -0.08, 0.1), R * 0.15, 130, 1.3); }
    if (a.holds === 'dwarf') for (let i = 0; i < 220; i++) dots.push({ at: [gauss() * R * 0.16 + (i % 3) * 0.08, gauss() * R * 0.07, gauss() * R * 0.12], size: 0.018 + random() * 0.022, color: ['#8f86ac', '#b9603a', '#6f9be6'][i % 3] });
    if (a.holds === 'dwarf') { const knot = new THREE.Mesh(new THREE.SphereGeometry(R * 0.045, 12, 8), new THREE.MeshStandardMaterial({ color: '#f0679a', emissive: '#e23d7e', emissiveIntensity: 0.8 })); knot.position.set(0.1, 0.03, 0.05); cradle.add(knot); }
    if (a.holds === 'stream') {
      const basis = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(1.1, 0.4, 0.5));
      for (let i = 0; i < 420; i++) {
        const angle = random() * Math.PI * 3.2, r = R * (0.5 + 0.12 * Math.sin(angle * 2.1));
        const p = new THREE.Vector3(Math.cos(angle) * r + gauss() * 0.04, gauss() * 0.04, Math.sin(angle) * r * 0.8 + gauss() * 0.04).applyMatrix4(basis);
        dots.push({ at: p.toArray() as P3, size: 0.016 + random() * 0.02, color: random() < 0.7 ? '#6f9be6' : '#f0c858' });
      }
    }

    if (a.company === 'tethered') for (const side of [-1, 1]) {
      const lift = (random() - 0.5) * 1.2;
      for (let i = 0; i < 230; i++) {
        const u = random(), x = side * R * (0.95 + u * 1.25);
        dots.push({ at: [x + gauss() * 0.03, lift * u + Math.sin(u * 3) * 0.25 + gauss() * (0.05 + (1 - u) * 0.12), gauss() * (0.05 + (1 - u) * 0.12)], size: 0.02 + random() * 0.028, color: random() < 0.6 ? '#c98016' : '#e9ac28' });
      }
    }
    if (dots.length) { const cloud = s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), dots); cloud.castShadow = false; body.add(cloud); }

    const low = -R * squash.y;
    if (a.base === 'globe') {
      const wood = s.material('#6b4630', { roughness: 0.55 });
      const brass = s.material('#b8923c', { metalness: 0.8, roughness: 0.3 });
      body.add(s.lathe([[0, 0], [1.25, 0], [1.3, 0.08], [1.22, 0.16], [1.1, 0.2], [1.02, 0.42], [1.08, 0.5], [0.95, 0.56], [0, 0.56]].map(([x, y]) => [x * R * 0.72, y * R * 0.72] as const), wood, [0, low - R * 0.28, 0]));
      const band = s.ring(R * 0.7, R * 0.03, [0, low + R * 0.13, 0], brass); band.rotation.x = Math.PI / 2; body.add(band);
    } else if (a.base === 'stand') {
      const brass = s.material('#b8923c', { metalness: 0.8, roughness: 0.3 });
      const hoop = s.ring(R * 0.62 * squash.x, R * 0.035, [0, low + R * 0.22 * squash.y, 0], brass); hoop.rotation.x = Math.PI / 2; body.add(hoop);
      for (let k = 0; k < 3; k++) {
        const angle = k * Math.PI * 2 / 3 + 0.5, c = Math.cos(angle), z = Math.sin(angle);
        body.add(s.rod([c * R * 0.62 * squash.x, low + R * 0.22 * squash.y, z * R * 0.62 * squash.x], [c * R * 0.85, low - R * 0.45, z * R * 0.85], R * 0.022, brass));
        body.add(s.ball([R * 0.05, R * 0.03, R * 0.05], [c * R * 0.85, low - R * 0.45, z * R * 0.85], brass, 10));
      }
    }

    const speed = mix(0.02, 0.25, mood.energy);
    return s.finish({ update: (dt) => { cradle.rotation.y += dt * speed; } });
  },
});
