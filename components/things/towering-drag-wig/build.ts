import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];

const matrix = (at: V3, rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));

export default defineThing({
  questions: {
    silhouette: choice('What is the silhouette of the wig?', {
      beehive: 'A tall wound beehive tower with a swooped fringe and kiss curls.',
      antoinette: 'A powdered Marie Antoinette pouf with sausage curls and a sailing ship riding on top.',
      flame: 'Hair lacquered upward into licking tongues of flame.',
      curls: 'A piled crown spilling long cascading ringlets down to the table.',
      bob: 'A hard-edged geometric bob, all flat planes and knife points.',
      clown: 'A huge round clown puff of tight fuzz.',
    }),
    colour: choice('What colour is the hair?', {
      platinum: 'Platinum blonde, almost white.',
      pink: 'Bubblegum pink.',
      blue: 'Electric blue.',
      fire: 'Fire-engine red running to orange.',
      black: 'Glossy jet black.',
      lavender: 'Powdery lavender grey.',
      rainbow: 'Every colour in bands, a full rainbow.',
    }),
    height: score('How tall is the wig?', ['Merely big', 'Twice the head', 'A tower', 'Absurd, scraping the ceiling']),
    ornaments: choice('What is pinned into the hair?', {
      bare: 'Nothing; the shape speaks for itself.',
      bows: 'Fat satin bows.',
      butterflies: 'A flight of bright butterflies on wires.',
      lights: 'A string of fairy lights winding up it.',
      birds: 'Small birds perched in it, with a nest at the top.',
      pearls: 'Ropes of pearls and jewelled pins.',
    }),
    state: choice('What state is the wig in?', {
      immaculate: 'Immaculate, freshly set and sprayed, ready for the stage.',
      wilted: 'Wilted after the show: leaning, sagging, strands escaping.',
      styling: 'Halfway through being built, still in rollers with a comb stuck in it.',
      askew: 'Slipped sideways on the stand, tossed there in a hurry.',
    }),
    stand: choice('What is it standing on?', {
      foam: 'A white polystyrene head on a wooden dowel stand.',
      bust: 'A glossy black mannequin head and shoulders.',
      canvas: 'A canvas block head clamped to the counter, stuck with pins.',
      plinth: 'A stone pedestal with a brass plaque, like a monument.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const TAU = Math.PI * 2;

    // ---- Stand and head form ----
    const headMat = {
      foam: s.material('#f1f1ee', { roughness: 0.9 }),
      bust: s.material('#17171c', { roughness: 0.2, metalness: 0.3 }),
      canvas: s.material('#cdb991', { roughness: 0.95 }),
      plinth: s.material('#e8e2d6', { roughness: 0.6 }),
    }[a.stand];
    let hy = 0.42;
    if (a.stand === 'foam') {
      const wood = s.material('#a9794a');
      s.cylinder(0.11, 0.12, 0.025, [0, 0.0125, 0], wood);
      s.cylinder(0.014, 0.014, 0.3, [0, 0.17, 0], wood, 10);
    } else if (a.stand === 'bust') {
      s.lathe([[0.0, 0], [0.17, 0], [0.19, 0.04], [0.17, 0.12], [0.06, 0.2], [0.045, 0.3]], headMat).scale.z = 0.62;
      hy = 0.4;
    } else if (a.stand === 'canvas') {
      const steel = s.material('#8f979b', { metalness: 0.8, roughness: 0.3 });
      s.box([0.1, 0.02, 0.14], [0, 0.01, 0], steel);
      s.box([0.05, 0.1, 0.03], [0, 0.06, -0.06], steel);
      s.cylinder(0.016, 0.016, 0.28, [0, 0.16, 0], steel, 10);
      hy = 0.4;
    } else {
      const stone = s.material('#9a968c', { roughness: 0.95 });
      s.box([0.5, 0.06, 0.5], [0, 0.03, 0], stone);
      s.box([0.38, 0.4, 0.38], [0, 0.26, 0], stone);
      s.box([0.46, 0.05, 0.46], [0, 0.485, 0], stone);
      s.label('THE WIG', 0.24, 0.08, [0, 0.28, 0.192], '#3a2c12', '#c9a13c');
      s.cylinder(0.045, 0.06, 0.08, [0, 0.55, 0], headMat, 14);
      hy = 0.7;
    }
    s.cylinder(0.04, 0.048, 0.1, [0, hy - 0.12, 0], headMat, 14);
    s.ball([0.08, 0.108, 0.092], [0, hy, 0], headMat, 20);
    s.ball([0.014, 0.022, 0.02], [0, hy - 0.012, 0.088], headMat, 8);
    if (a.stand === 'bust') for (const sx of [-1, 1]) s.ball([0.02, 0.008, 0.006], [sx * 0.033, hy + 0.015, 0.082], s.material('#e9e9f0'), 8);

    // ---- Hair ----
    const H = a.silhouette === 'bob' ? mix(0.34, 0.66, a.height) : mix(0.42, 1.25, a.height) * (a.silhouette === 'clown' ? 0.75 : 1);
    const y0 = hy + 0.03;
    const base = new THREE.Color({ platinum: '#f3ead0', pink: '#ff6fb5', blue: '#2c7cf2', fire: '#e2281b', black: '#1c1a22', lavender: '#b9a6d6', rainbow: '#ff6fb5' }[a.colour]);
    const dull = new THREE.Color('#8b8275');
    const ramp = (t: number) => {
      const c = new THREE.Color();
      if (a.colour === 'rainbow') c.setHSL(((1 - t) * 0.82 + 0.92) % 1, 0.82, 0.57);
      else {
        c.copy(base).multiplyScalar(mix(0.62, 1.05, Math.min(1, t * 1.6)));
        const tip = a.colour === 'fire' || a.silhouette === 'flame' ? new THREE.Color(a.colour === 'blue' ? '#b9f3ff' : a.colour === 'black' ? '#8a3cf0' : '#ffd84a') : new THREE.Color('#ffffff');
        c.lerp(tip, Math.pow(t, 2.2) * (a.silhouette === 'flame' ? 0.85 : a.colour === 'fire' ? 0.55 : 0.22));
      }
      return c.lerp(dull, mood.wear * 0.22);
    };
    const hairMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.38, 0.8, mood.wear), metalness: 0.05 });
    const wig = new THREE.Group();
    s.root.add(wig);
    const top = y0 + H;
    const hair = (geo: THREE.BufferGeometry, m: THREE.Matrix4) => {
      geo.applyMatrix4(m);
      const pos = geo.getAttribute('position');
      const colours = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const c = ramp(Math.min(1, Math.max(0, (pos.getY(i) - (y0 - 0.1)) / (H + 0.1))));
        colours.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, hairMat);
      mesh.castShadow = mesh.receiveShadow = true;
      wig.add(mesh);
      return mesh;
    };
    const sphere = (at: V3, scale: V3, seg = 18) => hair(new THREE.SphereGeometry(1, seg, Math.max(8, seg / 2)), matrix(at, [0, 0, 0], scale));
    const ringlet = (from: V3, length: number, radius: number, turns: number, tube: number) => {
      const phase = random() * TAU, pts: THREE.Vector3[] = [];
      for (let i = 0; i <= turns * 8; i++) {
        const t = i / (turns * 8);
        pts.push(new THREE.Vector3(from[0] + Math.cos(phase + t * turns * TAU) * radius, from[1] - t * length, from[2] + Math.sin(phase + t * turns * TAU) * radius));
      }
      return hair(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 10, tube * (0.9 + random() * 0.2), 6), new THREE.Matrix4());
    };
    // The skull cap every wig shares, set back so the face of the stand shows.
    sphere([0, hy + 0.04, -0.022], [0.098, 0.1, 0.104]);

    // A point on the outside of the wig, for ornaments: t is height 0..1, angle 0 faces +z.
    let shell: (t: number, angle: number) => V3 = () => [0, top, 0];

    if (a.silhouette === 'beehive') {
      const prof = (t: number) => (0.125 + 0.085 * Math.sin(Math.PI * Math.pow(t, 0.75))) * (t > 0.86 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.86) / 0.14, 2))) * 0.72 + 0.28 * (1 - (t - 0.86) / 0.14) : 1);
      const points: THREE.Vector2[] = [];
      for (let i = 0; i <= 28; i++) points.push(new THREE.Vector2(Math.max(0.001, prof(i / 28)), (i / 28) * H));
      hair(new THREE.LatheGeometry(points, 28), matrix([0, y0, 0]));
      const coil: THREE.Vector3[] = [], turns = Math.round(3 + H * 5);
      for (let i = 0; i <= turns * 14; i++) {
        const t = (i / (turns * 14)) * 0.94, ang = t * turns * TAU;
        coil.push(new THREE.Vector3(Math.sin(ang) * (prof(t) + 0.006), y0 + t * H, Math.cos(ang) * (prof(t) + 0.006)));
      }
      hair(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), turns * 26, 0.03, 6), new THREE.Matrix4());
      sphere([0.03, hy + 0.085, 0.085], [0.1, 0.035, 0.05]).rotation.z = 0;
      for (const sx of [-1, 1]) hair(new THREE.TorusGeometry(0.028, 0.011, 6, 16, Math.PI * 1.6), matrix([sx * 0.085, hy - 0.035, 0.05], [0, sx * 0.9, sx * 1.2]));
      shell = (t, angle) => [Math.sin(angle) * (prof(t) + 0.03), y0 + t * H, Math.cos(angle) * (prof(t) + 0.03)];
    } else if (a.silhouette === 'antoinette') {
      const ph = H * 0.72;
      sphere([0, y0 + ph * 0.5, -0.02], [0.25, ph * 0.56, 0.2], 24);
      sphere([0, y0 + ph * 0.98, -0.02], [0.15, ph * 0.18, 0.13]);
      for (const sx of [-1, 1]) {
        for (let r = 0; r < 3; r++) hair(new THREE.CapsuleGeometry(0.05, 0.16, 4, 12), matrix([sx * (0.2 + r * 0.012), y0 + 0.05 + r * 0.105, 0.0], [Math.PI / 2, 0, 0]));
        ringlet([sx * 0.15, y0 + 0.02, -0.06], 0.3 + random() * 0.08, 0.028, 5, 0.017);
        ringlet([sx * 0.07, y0 - 0.01, -0.11], 0.26 + random() * 0.08, 0.026, 4, 0.016);
      }
      // The ship.
      const ship = new THREE.Group();
      const hull = s.material('#6b4426'), sail = s.material('#f3ead6', { side: THREE.DoubleSide });
      const hullMesh = s.ball([0.15, 0.05, 0.045], [0, 0, 0], hull, 14);
      ship.add(hullMesh);
      ship.add(s.box([0.24, 0.012, 0.07], [0, 0.03, 0], s.material('#8a5a34')));
      [-0.07, 0.01, 0.085].forEach((mx, i) => {
        const mh = [0.2, 0.27, 0.17][i];
        ship.add(s.cylinder(0.005, 0.006, mh, [mx, 0.03 + mh / 2, 0], hull, 6));
        for (let k = 0; k < (i === 1 ? 2 : 1); k++) {
          const geo = new THREE.CylinderGeometry(0.09, 0.09, 0.085 - k * 0.02, 8, 1, true, -0.5, 1);
          const sm = s.mesh(geo, sail, [mx - 0.085, 0.1 + k * 0.095 + (i === 1 ? 0.01 : 0), 0]);
          sm.rotation.y = Math.PI / 2; sm.position.set(mx - 0.04, 0.1 + k * 0.095, -0.085 + 0.085);
          sm.scale.set(1, 1, 0.5);
          ship.add(sm);
        }
        ship.add(s.box([0.04, 0.018, 0.002], [mx + 0.02, 0.03 + mh - 0.01, 0], s.material(mood.cheer > 0.5 ? '#e23a4f' : '#2a2f6b')));
      });
      ship.position.set(0, top + 0.03, 0);
      ship.rotation.y = 0.35 + (random() - 0.5) * 0.4;
      ship.rotation.z = (random() - 0.5) * 0.2;
      ship.scale.setScalar(mix(1, 1.35, a.height));
      wig.add(ship);
      shell = (t, angle) => { const r = Math.sqrt(Math.max(0.05, 1 - Math.pow(t * 2 - 1, 2) * 0.85)); return [Math.sin(angle) * 0.26 * r, y0 + t * ph, Math.cos(angle) * 0.21 * r - 0.02]; };
    } else if (a.silhouette === 'flame') {
      sphere([0, y0 + 0.06, -0.02], [0.2, 0.15, 0.18]);
      const tongues = 9;
      for (let i = 0; i < tongues; i++) {
        const centre = i === 0, ang = (i / (tongues - 1)) * TAU + random(), ring = centre ? 0 : 0.085 + random() * 0.04;
        const th = centre ? H : H * mix(0.45, 0.82, random()), r = centre ? 0.12 : 0.085;
        const geo = new THREE.ConeGeometry(r, th, 10, 14);
        geo.translate(0, th / 2, 0);
        const pos = geo.getAttribute('position'), ph = random() * TAU, amp = centre ? 0.05 : 0.09;
        for (let v = 0; v < pos.count; v++) {
          const t = pos.getY(v) / th;
          pos.setX(v, pos.getX(v) + Math.sin(t * 4.2 + ph) * amp * t + Math.sin(ang) * ring * 1.3 * t);
          pos.setZ(v, pos.getZ(v) + Math.cos(t * 3.1 + ph) * amp * 0.6 * t + Math.cos(ang) * ring * 1.3 * t);
        }
        hair(geo, matrix([Math.sin(ang) * ring, y0 + 0.02, Math.cos(ang) * ring - 0.02]));
      }
      shell = (t, angle) => { const r = 0.2 * (1 - t * 0.75) + 0.02; return [Math.sin(angle) * r, y0 + 0.04 + t * H * 0.7, Math.cos(angle) * r]; };
    } else if (a.silhouette === 'curls') {
      const ph = H * 0.55;
      sphere([0, y0 + 0.07, -0.02], [0.2, 0.15, 0.19]);
      const lumps = Math.round(10 + ph * 30);
      for (let i = 0; i < lumps; i++) {
        const t = i / lumps, ang = i * 2.4, r = 0.15 * (1 - t * 0.7);
        hair(new THREE.TorusGeometry(0.05, 0.026, 6, 12), matrix([Math.sin(ang) * r, y0 + 0.1 + t * ph, Math.cos(ang) * r - 0.02], [random() * 3, random() * 3, random() * 3], [1, 1, 1]));
      }
      sphere([0, y0 + 0.1 + ph * 0.45, -0.02], [0.13, ph * 0.5, 0.13]);
      const falls = 15;
      for (let i = 0; i < falls; i++) {
        const ang = (i / falls) * TAU * 0.82 + TAU * 0.59, r = 0.17 + random() * 0.03;
        if (Math.abs(Math.sin(ang)) < 0.35 && Math.cos(ang) > 0) continue;
        ringlet([Math.sin(ang) * r, y0 + 0.07, Math.cos(ang) * r - 0.02], Math.min(y0 + 0.02, 0.3 + random() * 0.25 + a.height * 0.2), 0.03, 6 + Math.floor(random() * 3), 0.016);
      }
      shell = (t, angle) => { const r = t < 0.25 ? 0.22 : 0.17 * (1 - t * 0.6) + 0.05; return [Math.sin(angle) * r, y0 + 0.05 + t * (ph + 0.1), Math.cos(angle) * r - 0.02]; };
    } else if (a.silhouette === 'bob') {
      const lean = (random() - 0.5) * 0.1, jaw = hy - 0.17;
      const outline: [number, number][] = [[-0.44, jaw - 0.07], [-0.24, jaw + 0.07], [-0.3, y0 + H * 0.5], [-0.2 + lean, top - H * 0.08], [-0.02 + lean, top], [0.24 + lean, top - H * 0.2], [0.32, y0 + H * 0.3], [0.25, jaw + 0.1], [0.46, jaw - 0.04], [0.14, jaw + 0.01], [-0.12, jaw - 0.0]];
      const full = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
      hair(new THREE.ExtrudeGeometry(full, { depth: 0.19, bevelEnabled: false }), matrix([0, 0, -0.19]));
      const front = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
      front.holes.push(new THREE.Path([[-0.085, jaw - 0.02], [0.085, jaw - 0.02], [0.085, hy + 0.035], [-0.085, hy + 0.035]].map(([x, y]) => new THREE.Vector2(x, y))));
      hair(new THREE.ExtrudeGeometry(front, { depth: 0.125, bevelEnabled: false }), matrix([0, 0, 0]));
      hair(new THREE.BoxGeometry(0.2, 0.03, 0.03), matrix([0, hy + 0.045, 0.125], [0, 0, lean]));
      shell = (t, angle) => [Math.sin(angle) * 0.2, y0 + 0.02 + t * H * 0.7, Math.cos(angle) >= 0 ? 0.135 : -0.2];
    } else {
      const rx = 0.3 + H * 0.16, ry = 0.24 + H * 0.26, rz = 0.26 + H * 0.1, cy = y0 + ry * 0.72;
      sphere([0, cy, -0.03], [rx * 0.9, ry * 0.9, rz * 0.9], 20);
      const puffs: { at: V3; size: number; color: THREE.Color }[] = [];
      for (let i = 0; i < 260; i++) {
        const v = 1 - (i + 0.5) / 260 * 1.72, ring = Math.sqrt(Math.max(0, 1 - v * v)), ang = i * 2.39996;
        const p: V3 = [Math.sin(ang) * ring * rx, cy + v * ry, Math.cos(ang) * ring * rz - 0.03];
        if (p[2] > 0.05 && p[1] < hy + 0.06 && Math.abs(p[0]) < 0.1) continue;
        const t = (p[1] - y0) / (ry * 1.7);
        const band = a.colour === 'rainbow' ? new THREE.Color().setHSL((Math.floor((Math.atan2(p[0], p[1] - cy) / TAU + 0.5) * 7) / 7 + 0.02) % 1, 0.85, 0.56) : ramp(Math.max(0, Math.min(1, t)));
        puffs.push({ at: p, size: 0.75 + random() * 0.6, color: band.lerp(dull, mood.wear * 0.2) });
      }
      wig.add(s.scatter(new THREE.IcosahedronGeometry(0.062, 1), new THREE.MeshStandardMaterial({ roughness: 0.95 }), puffs));
      shell = (t, angle) => { const v = t * 1.6 - 0.75, ring = Math.sqrt(Math.max(0.05, 1 - v * v)); return [Math.sin(angle) * ring * (rx + 0.05), cy + v * (ry + 0.05), Math.cos(angle) * ring * (rz + 0.05) - 0.03]; };
    }

    // ---- Ornaments ----
    const accent = new THREE.Color().setHSL(random(), 0.75, 0.55);
    const outward = (group: THREE.Object3D, p: V3) => { group.position.set(...p); group.lookAt(p[0] * 3, p[1] + 0.05, p[2] * 3 + (p[2] >= 0 ? 0.3 : -0.3)); };
    const spotCount = 5 + Math.round(mood.density * 5);
    const spots: V3[] = [];
    for (let i = 0; i < spotCount; i++) spots.push(shell(0.12 + (i / spotCount) * 0.8 + random() * 0.06, (random() - 0.5) * 2.4));
    const wings: THREE.Object3D[] = [];
    const twinkle: THREE.MeshStandardMaterial[] = [];
    if (a.ornaments === 'bows') {
      const satin = s.material(a.colour === 'pink' ? '#111118' : '#ff3d8b', { roughness: 0.3 });
      spots.forEach((p, i) => {
        const bow = new THREE.Group(), k = i === 0 ? 1.6 : 0.8 + random() * 0.5;
        for (const sx of [-1, 1]) { const loop = s.mesh(new THREE.ConeGeometry(0.045, 0.085, 10), satin, [sx * 0.045, 0, 0]); loop.rotation.z = sx * Math.PI / 2; loop.scale.z = 0.45; bow.add(loop); const tail = s.box([0.028, 0.09, 0.006], [sx * 0.025, -0.055, 0], satin); tail.rotation.z = sx * 0.35; bow.add(tail); }
        bow.add(s.ball([0.018, 0.018, 0.016], [0, 0, 0.004], satin, 8));
        bow.scale.setScalar(k);
        outward(bow, p); bow.rotateZ((random() - 0.5) * 0.6);
        wig.add(bow);
      });
    } else if (a.ornaments === 'butterflies') {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0); wingShape.bezierCurveTo(0.02, 0.07, 0.09, 0.08, 0.085, 0.02); wingShape.bezierCurveTo(0.08, -0.01, 0.05, -0.01, 0.04, -0.02); wingShape.bezierCurveTo(0.06, -0.06, 0.02, -0.07, 0, 0);
      spots.forEach((p) => {
        const fly = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(random(), 0.9, 0.58), side: THREE.DoubleSide, roughness: 0.5, emissive: '#221100' });
        for (const sx of [-1, 1]) { const wing = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), mat); wing.scale.x = sx; wing.rotation.y = -sx * 0.5; wing.castShadow = true; fly.add(wing); wings.push(wing); wing.userData.side = sx; wing.userData.phase = random() * 6; }
        fly.add(s.ball([0.006, 0.03, 0.006], [0, 0, 0], s.material('#1b1b1b'), 6));
        const lift = 0.05 + random() * 0.06, q: V3 = [p[0] * 1.0, p[1], p[2]];
        outward(fly, q); fly.translateZ(lift); fly.rotateZ((random() - 0.5) * 1.2); fly.scale.setScalar(0.9 + random() * 0.7);
        wig.add(fly);
        const wire = s.rod(p, [fly.position.x, fly.position.y, fly.position.z], 0.0025, s.material('#c9a13c', { metalness: 0.8 }));
        wig.add(wire);
      });
    } else if (a.ornaments === 'lights') {
      const hues = ['#ffd27a', '#ff6f91', '#7ad7ff', '#a6ff8a'];
      const groups = hues.map((hue) => new THREE.MeshStandardMaterial({ color: '#fff8e8', emissive: hue, emissiveIntensity: 2.2 }));
      twinkle.push(...groups);
      const lamps: { at: V3; size: number }[][] = groups.map(() => []);
      const n = 44 + Math.round(a.height * 30), wirePts: V3[] = [];
      for (let i = 0; i < n; i++) { const t = 0.04 + (i / n) * 0.9, p = shell(t, t * (9 + H * 8)); lamps[i % groups.length].push({ at: p, size: 1 }); if (i % 2 === 0) wirePts.push(p); }
      lamps.forEach((set, i) => wig.add(s.scatter(new THREE.SphereGeometry(0.014, 8, 6), groups[i], set)));
      wig.add(s.tube(wirePts, 0.003, s.material('#2b3a2b')));
    } else if (a.ornaments === 'birds') {
      spots.slice(0, 4).forEach((p) => {
        const bird = new THREE.Group(), feather = s.material(new THREE.Color().setHSL(random(), 0.7, 0.55));
        bird.add(s.ball([0.03, 0.028, 0.045], [0, 0.03, 0], feather, 10));
        bird.add(s.ball([0.02, 0.02, 0.02], [0, 0.058, 0.03], feather, 10));
        const beak = s.mesh(new THREE.ConeGeometry(0.007, 0.022, 6), s.material('#f0a020'), [0, 0.056, 0.056]); beak.rotation.x = Math.PI / 2; bird.add(beak);
        const tail = s.box([0.022, 0.006, 0.05], [0, 0.04, -0.055], feather); tail.rotation.x = -0.5; bird.add(tail);
        bird.add(s.ball([0.004, 0.004, 0.004], [0.012, 0.064, 0.042], s.material('#111'), 6));
        bird.position.set(p[0] * 1.02, p[1], p[2] * 1.02); bird.rotation.y = random() * TAU; bird.scale.setScalar(1.3);
        wig.add(bird);
      });
      const nestAt = shell(0.98, 0);
      const nest = s.ring(0.05, 0.022, [0, top + 0.01, 0], s.material('#8a6a3c', { roughness: 1 }));
      nest.rotation.x = Math.PI / 2; nest.position.set(nestAt[0] * 0.2, a.silhouette === 'antoinette' ? y0 + H * 0.6 : top + 0.005, a.silhouette === 'antoinette' ? 0.19 : nestAt[2] * 0.2); wig.add(nest);
      for (let e = 0; e < 3; e++) wig.add(s.ball([0.014, 0.018, 0.014], [nest.position.x + Math.cos(e * 2.1) * 0.018, nest.position.y + 0.012, nest.position.z + Math.sin(e * 2.1) * 0.018], s.material('#bfe3e6'), 8));
    } else if (a.ornaments === 'pearls') {
      const pearls: { at: V3; size: number }[] = [];
      for (let rope = 0; rope < 3; rope++) for (let i = 0; i < 40; i++) { const t = 0.15 + rope * 0.25 + Math.sin((i / 40) * Math.PI) * 0.12; pearls.push({ at: shell(Math.min(0.97, t), (i / 40 - 0.5) * 2.6), size: 1 }); }
      wig.add(s.scatter(new THREE.SphereGeometry(0.011, 8, 6), s.material('#f7f1e4', { roughness: 0.2, metalness: 0.3 }), pearls));
      spots.slice(0, 5).forEach((p) => { const gem = s.mesh(new THREE.OctahedronGeometry(0.026), s.material(accent, { roughness: 0.1, metalness: 0.5, emissive: accent, emissiveIntensity: 0.4 }), p); wig.add(gem); });
    }

    // ---- State ----
    const pink = s.material('#f48fb6'), pinMat = s.material('#2a2a2e', { metalness: 0.7 });
    const strays = Math.round(mood.wear * 10) + (a.state === 'wilted' ? 14 : a.state === 'askew' ? 6 : 0);
    for (let i = 0; i < strays; i++) {
      const p = shell(random(), random() * TAU), len = 0.08 + random() * 0.14;
      const geo = new THREE.CylinderGeometry(0.001, 0.006, len, 5); geo.translate(0, len / 2, 0);
      const out = new THREE.Vector3(p[0], 0.1 - random() * 0.4, p[2]).normalize();
      const m = new THREE.Matrix4().compose(new THREE.Vector3(p[0] * 0.92, p[1], p[2] * 0.92), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), out), new THREE.Vector3(1, 1, 1));
      hair(geo, m);
    }
    if (a.state === 'styling') {
      for (let i = 0; i < 7; i++) {
        const p = shell(0.08 + random() * 0.5, (i / 6 - 0.5) * 2.6);
        const roller = s.cylinder(0.032, 0.032, 0.1, p, pink, 12); roller.rotation.z = Math.PI / 2; roller.rotation.y = Math.atan2(p[0], p[2]); wig.add(roller);
      }
      const comb = new THREE.Group(), tort = s.material('#3a2414');
      comb.add(s.box([0.17, 0.035, 0.008], [0, 0.11, 0], tort));
      for (let i = 0; i < 12; i++) comb.add(s.box([0.006, 0.09, 0.006], [-0.077 + i * 0.014, 0.05, 0], tort));
      const cp = shell(0.72, 0.9); comb.position.set(...cp); comb.rotation.set(0.3, 0.9, -0.9); wig.add(comb);
      const can = s.cylinder(0.03, 0.03, 0.17, [0.24, 0.085, 0.1], s.material('#d9c24a', { metalness: 0.6, roughness: 0.3 }), 14);
      s.cylinder(0.014, 0.02, 0.03, [0.24, 0.185, 0.1], s.material('#f4f4f4'), 10);
      can.castShadow = true;
      for (let i = 0; i < 6; i++) { const pin = s.rod([0.15 + random() * 0.14, 0.004, -0.05 + random() * 0.2], [0.17 + random() * 0.14, 0.004, -0.05 + random() * 0.2], 0.0025, pinMat); pin.castShadow = false; }
    }
    let leanZ = 0, leanX = 0;
    if (a.state === 'wilted') { leanZ = (random() < 0.5 ? -1 : 1) * mix(0.14, 0.26, random()); wig.scale.y = 0.88; }
    if (a.state === 'askew') { leanZ = (random() < 0.5 ? -1 : 1) * 0.42; leanX = 0.12; }
    // Pivot the wig about the crown of the head so a lean reads as slipping, not floating.
    const pivot = new THREE.Group();
    pivot.position.set(0, hy, 0);
    s.root.add(pivot);
    wig.position.y = -hy * wig.scale.y;
    pivot.add(wig);
    pivot.rotation.set(leanX, 0, leanZ);
    if (a.state === 'wilted' || a.state === 'askew') {
      for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) {
        const ang = random() * TAU, r = 0.16 + random() * 0.16;
        const tuft = s.ball([0.03 + random() * 0.02, 0.008, 0.012], [Math.sin(ang) * r, 0.008, Math.cos(ang) * r], new THREE.MeshStandardMaterial({ color: ramp(random()), roughness: 0.8 }), 8);
        tuft.rotation.y = random() * 3;
      }
    }

    const energy = mood.energy;
    return s.finish({
      footprint: 0.24,
      update: (_dt, time) => {
        const sway = (a.state === 'wilted' ? 0.03 : 0.012) * mix(0.3, 1.5, energy);
        pivot.rotation.z = leanZ + Math.sin(time * mix(0.6, 1.8, energy)) * sway;
        for (const wing of wings) wing.rotation.y = -wing.userData.side * (0.6 + Math.sin(time * mix(3, 12, energy) + wing.userData.phase) * 0.55);
        twinkle.forEach((material, i) => { material.emissiveIntensity = 1.4 + Math.sin(time * mix(1.5, 6, energy) + i * 1.7) * 1.1; });
      },
    });
  },
});
// bob reshaped
