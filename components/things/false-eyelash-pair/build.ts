import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
const W = 0.032;

const COLOUR = { black: '#0b0a0c', brown: '#4a2a17', blue: '#1b52f0', white: '#e9eef2', pink: '#ff3f98' } as const;

/** A unit hair: a tapering cone bent so it leaves along +z and curls up toward +y. */
function hairGeometry(thick: number, curl: number) {
  const geometry = new THREE.CylinderGeometry(0, thick, 1, 5, 6);
  geometry.translate(0, 0.5, 0);
  const spot = geometry.attributes.position;
  for (let i = 0; i < spot.count; i++) {
    const t = spot.getY(i), across = spot.getX(i), out = spot.getZ(i);
    const bend = curl * t;
    const z = curl > 0.01 ? Math.sin(bend) / curl : t, y = curl > 0.01 ? (1 - Math.cos(bend)) / curl : 0;
    spot.setXYZ(i, across, y + out * Math.cos(bend), z - out * Math.sin(bend));
  }
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    style: choice('What style of lash?', {
      natural: 'Natural wisps: short, fine, even, meant to pass as your own.',
      dramatic: 'Dramatic fans: dense, long and sweeping longest at the outer corner.',
      spider: 'Spider clumps: a few thick spikes gathered to points, sixties doll eyes.',
      feathered: 'Feathered showgirl: enormous, with coloured feather tips flaring off the ends.',
      jewelled: 'Jewelled: a line of rhinestones glued along the band, catching the light.',
    }),
    colour: choice('What colour are they?', {
      black: 'Jet black.',
      brown: 'Soft brown.',
      blue: 'Electric blue.',
      white: 'White frost, snow queen.',
      pink: 'Hot pink.',
    }),
    state: choice('What state are they in?', {
      fresh: 'Brand new, both sitting on their plastic crescent tray.',
      oneMissing: 'On the tray, but one is gone: an empty crescent with a smear of glue.',
      worn: 'Worn and pulled off: lying loose, gummed with white glue and clots of mascara, hairs missing.',
      mirror: 'Stuck to the glass of a small round mirror, parked there for tomorrow.',
    }),
    length: score('How long are the hairs?', ['Short and modest', 'Long', 'Absurdly long, brushing the brow']),
    where: choice('Where were they found?', {
      bare: 'Nowhere in particular: on the bare surface.',
      dressing: 'A dressing table: a blush marble dish with a gold rim.',
      sink: 'The wet white edge of a bathroom sink, beads of water around them.',
      pillow: 'A satin pillow, with a smudge of last night left on it.',
    }),
    beside: choice('What lies beside them?', {
      nothing: 'Nothing.',
      glue: 'A tiny tube of lash glue with its cap off and a bead at the nozzle.',
      tweezers: 'A pair of steel tweezers.',
      wand: 'A mascara wand, bristles black.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const worn = a.state === 'worn';
    const tint = new THREE.Color(COLOUR[a.colour]);
    const hairPaint = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.45 });
    const bandPaint = new THREE.MeshStandardMaterial({ color: a.colour === 'white' ? '#cfd6db' : '#0b0a0c', roughness: 0.5 });
    const accent = new THREE.Color().setHSL((0.86 + mood.warmth * 0.3 + random() * 0.1) % 1, 0.85, 0.55);
    const base = mix(0.008, 0.019, a.length) * { natural: 0.8, dramatic: 1.15, spider: 1.2, feathered: 1.3, jewelled: 1 }[a.style];
    const thick = { natural: 0.014, dramatic: 0.02, spider: 0.034, feathered: 0.018, jewelled: 0.02 }[a.style];
    const hair = hairGeometry(thick, a.style === 'natural' ? 0.9 : 1.25);

    /** One strip. `hump` wraps the band over a tray crescent; otherwise it lies in a flat forward arc. */
    const makeLash = (side: 1 | -1, hump: number) => {
      const group = new THREE.Group();
      const count = { natural: 44, dramatic: 64, spider: 44, feathered: 50, jewelled: 54 }[a.style];
      const at = (u: number): P => hump > 0 ? [u * W / 2, hump * Math.cos(u * Math.PI / 2) + 0.0006, 0] : [u * W / 2, 0.0007, W * 0.2 * Math.cos(u * Math.PI / 2)];
      const band = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => new THREE.Vector3(...at(i / 4 - 1)))), 24, 0.0007, 5), bandPaint);
      band.castShadow = true;
      group.add(band);
      const kept: THREE.Matrix4[] = [];
      const tips: THREE.Vector3[] = [];
      const turn = new THREE.Quaternion(), size = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        if (worn && random() < 0.22) continue;
        const u = ((i + 0.5) / count) * 2 - 1;
        const outer = (u * side + 1) / 2;
        let long = base * (a.style === 'natural' ? mix(0.75, 1, Math.sin(outer * Math.PI * 0.8)) : mix(0.55, 1.25, outer ** 1.3)) * (0.85 + random() * 0.3);
        let yaw = u * 0.5 + side * 0.18 + (random() - 0.5) * (worn ? 0.5 : 0.12);
        if (a.style === 'spider') {
          const groupSize = 4, centre = ((Math.floor(i / groupSize) + 0.5) * groupSize / count) * 2 - 1;
          yaw = centre * 0.5 + side * 0.15 + Math.atan2((centre - u) * W / 2, long * 0.8);
          long *= 1 - Math.abs(centre - u) * 1.5;
        }
        if (a.style === 'feathered' && i % 5 === 2) long *= 1.45;
        const roll = hump > 0 ? Math.atan2(-hump * Math.PI / 2 * Math.sin(u * Math.PI / 2), W / 2) : 0;
        turn.setFromEuler(new THREE.Euler((random() - 0.5) * (worn ? 0.6 : 0.12) - (hump > 0 ? 0.1 : 0.05), yaw, roll, 'ZYX'));
        const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...at(u)), turn, size.setScalar(long));
        kept.push(matrix);
        if (a.style === 'feathered' && i % 5 === 2) tips.push(new THREE.Vector3(0, 0.38, 0.72).applyMatrix4(matrix));
      }
      const hairs = new THREE.InstancedMesh(hair, hairPaint, kept.length);
      kept.forEach((matrix, index) => hairs.setMatrixAt(index, matrix));
      hairs.castShadow = true;
      group.add(hairs);
      if (tips.length) {
        const vane = new THREE.SphereGeometry(1, 8, 6);
        const vanes = new THREE.InstancedMesh(vane, new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6 }), tips.length);
        tips.forEach((tip, index) => {
          const far = base * (0.27 + random() * 0.1);
          vanes.setMatrixAt(index, new THREE.Matrix4().compose(tip, turn.setFromEuler(new THREE.Euler(-0.9, (tip.x / W) * 1.2, 0)), size.set(far * 0.42, far * 0.12, far)));
        });
        vanes.castShadow = true;
        group.add(vanes);
      }
      if (a.style === 'jewelled') {
        const gems = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.0011), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: accent, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.15 }), 9);
        for (let i = 0; i < 9; i++) {
          const [x, y, z] = at(i / 4 - 1);
          gems.setMatrixAt(i, new THREE.Matrix4().makeScale(1, 1, 1).setPosition(x, y + 0.0011, z + 0.0004));
        }
        group.add(gems);
      }
      if (worn) {
        const glue = new THREE.MeshStandardMaterial({ color: '#f1efe6', roughness: 0.3 });
        const clot = new THREE.MeshStandardMaterial({ color: '#0b0a0c', roughness: 0.6 });
        for (let i = 0; i < 7; i++) {
          const [x, y, z] = at(random() * 2 - 1);
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0009 + random() * 0.0009, 8, 6), glue);
          bead.position.set(x, y, z - 0.0005);
          bead.scale.x = 1.6 + random();
          group.add(bead);
        }
        for (let i = 0; i < 6; i++) {
          const matrix = kept[Math.floor(random() * kept.length)];
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0007 + random() * 0.0008, 7, 5), clot);
          bead.position.set(0, 0.1 + random() * 0.25, 0.3 + random() * 0.4).applyMatrix4(matrix);
          group.add(bead);
        }
      }
      return group;
    };

    // Where they were found.
    let surface = (_x: number, _z: number) => 0;
    if (a.where === 'dressing') {
      s.lathe([[0, 0], [0.052, 0], [0.06, 0.004], [0.06, 0.007], [0.056, 0.007], [0.05, 0.005], [0, 0.005]], s.material(mood.warmth > 0.45 ? '#e9c3c0' : '#d5d3dc', { roughness: 0.25 }));
      s.ring(0.0585, 0.0012, [0, 0.0072, 0], s.material('#c9a23f', { metalness: 0.8, roughness: 0.3 })).rotation.x = Math.PI / 2;
      surface = () => 0.005;
    } else if (a.where === 'sink') {
      const outline = new THREE.Shape();
      const hw = 0.066, hd = 0.046, round = 0.018;
      outline.moveTo(-hw + round, -hd); outline.lineTo(hw - round, -hd); outline.quadraticCurveTo(hw, -hd, hw, -hd + round);
      outline.lineTo(hw, hd - round); outline.quadraticCurveTo(hw, hd, hw - round, hd); outline.lineTo(-hw + round, hd);
      outline.quadraticCurveTo(-hw, hd, -hw, hd - round); outline.lineTo(-hw, -hd + round); outline.quadraticCurveTo(-hw, -hd, -hw + round, -hd);
      const slab = new THREE.ExtrudeGeometry(outline, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 4 });
      slab.rotateX(-Math.PI / 2);
      s.mesh(slab, s.material('#f6f7f5', { roughness: 0.12 }), [0, 0.004, 0]);
      surface = () => 0.02;
      const water = s.material('#a9d4e6', { roughness: 0.03, metalness: 0.2 });
      for (let i = 0; i < 10 + mood.density * 10; i++) {
        const size = 0.0015 + random() * 0.003;
        s.ball([size, size * 0.45, size], [(random() - 0.5) * 0.12, 0.02, (random() - 0.5) * 0.08], water, 10);
      }
    } else if (a.where === 'pillow') {
      const w = 0.15, d = 0.11, h = 0.026;
      const plump = (x: number, z: number) => h * Math.max(0, (1 - (2 * x / w) ** 2) * (1 - (2 * z / d) ** 2)) ** 0.45;
      const cushion = new THREE.BoxGeometry(w, 1, d, 22, 1, 16);
      const spot = cushion.attributes.position;
      for (let i = 0; i < spot.count; i++) {
        const x = spot.getX(i), z = spot.getZ(i), up = plump(x * 0.999, z * 0.999);
        spot.setY(i, spot.getY(i) > 0 ? h * 0.35 + up : h * 0.35 - up * 0.35);
      }
      cushion.computeVertexNormals();
      s.mesh(cushion, s.material(mood.warmth > 0.5 ? '#ecd9cf' : '#d9dfee', { roughness: 0.3 }));
      surface = (x, z) => h * 0.35 + plump(x, z);
      const smudge = s.ball([0.012, 0.0006, 0.007], [-0.04, surface(-0.04, 0.025) - 0.0002, 0.025], s.material('#3a3338', { roughness: 0.9 }), 12);
      smudge.rotation.y = 0.5;
    }

    const lashes = new THREE.Group();
    s.root.add(lashes);
    const shadow = (node: THREE.Object3D) => node.traverse((child) => { child.castShadow = true; });
    if (a.state === 'fresh' || a.state === 'oneMissing') {
      const tray = new THREE.Group();
      const dark = mood.cheer < 0.4;
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.0016, 0.054), s.material(dark ? '#1c1a22' : `#${accent.clone().lerp(new THREE.Color('#ffffff'), 0.62).getHexString()}`, { roughness: 0.5 }));
      const plastic = s.material('#f4f4f1', { roughness: 0.15 });
      const well = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.0012, 0.034), plastic);
      well.position.set(0, 0.0012, -0.006);
      tray.add(card, well);
      const gone = a.state === 'oneMissing' ? (random() < 0.5 ? -1 : 1) : 0;
      for (const side of [-1, 1] as const) {
        const crescent = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), plastic);
        crescent.scale.set(W * 0.56, 0.0052, 0.008);
        crescent.position.set(side * 0.021, 0.0016, -0.004);
        tray.add(crescent);
        if (side === gone) {
          const smear = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshStandardMaterial({ color: '#cfc9b4', roughness: 0.3 }));
          smear.scale.set(W * 0.3, 0.0008, 0.0012);
          smear.position.set(side * 0.021, 0.0068, -0.004);
          tray.add(smear);
          continue;
        }
        const lash = makeLash(side, 0.0052);
        lash.position.set(side * 0.021, 0.0018, -0.004);
        lash.rotation.y = Math.PI;
        lash.scale.x = -1;
        tray.add(lash);
      }
      const name = { natural: 'NATURAL No.12', dramatic: 'DRAMA QUEEN', spider: 'TWIGGY', feathered: 'SHOWGIRL', jewelled: 'DIAMANTE' }[a.style];
      const label = s.label(name, 0.05, 0.008, [0, 0, 0], dark ? '#f1e6c8' : '#2a2030', dark ? '#1c1a22' : '#ffffff');
      label.rotation.x = -Math.PI / 2;
      label.position.set(0, 0.00095, 0.02);
      tray.add(label);
      const lean = 0.95;
      tray.rotation.x = lean;
      tray.position.set(0, surface(0, 0.012) + 0.027 * Math.sin(lean) + 0.001, -0.004);
      shadow(tray);
      lashes.add(tray);
      // The retail box it leans on.
      const box = s.box([0.07, 0.036, 0.026], [0, surface(0, -0.03) + 0.018, -0.0335], s.material(`#${accent.getHexString()}`, { roughness: 0.4 }));
      box.rotation.y = (random() - 0.5) * 0.1;
    } else if (worn) {
      const spots: P[] = [[-0.02, 0, 0.004], [0.021, 0, -0.012]];
      spots.forEach(([x, , z], index) => {
        const lash = makeLash(index === 0 ? -1 : 1, 0);
        lash.position.set(x, surface(x, z), z);
        lash.rotation.set((random() - 0.5) * 0.2, (random() - 0.5) * 1.6 + (index ? 0.5 : -0.3), (random() - 0.5) * 0.3);
        shadow(lash);
        lashes.add(lash);
      });
    } else {
      const mirror = new THREE.Group();
      const chrome = s.material('#c9ccd0', { metalness: 0.85, roughness: 0.25 });
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const sky = ctx.createLinearGradient(0, 0, 128, 128);
      sky.addColorStop(0, '#eef6f8'); sky.addColorStop(0.45, '#b9ced6'); sky.addColorStop(0.5, '#e6f1f4'); sky.addColorStop(1, '#93aab4');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 128, 128);
      const glassMap = new THREE.CanvasTexture(canvas);
      glassMap.colorSpace = THREE.SRGBColorSpace;
      const R = 0.05;
      const frame = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.004, R + 0.004, 0.005, 40), chrome);
      frame.rotation.x = Math.PI / 2;
      const glass = new THREE.Mesh(new THREE.CircleGeometry(R, 40), new THREE.MeshStandardMaterial({ map: glassMap, roughness: 0.08 }));
      glass.position.z = 0.0027;
      mirror.add(frame, glass);
      const spots = [[-0.019, 0.014, random() * 0.8 - 0.4], [0.017, -0.016, random() * 0.8 + 0.2]];
      spots.forEach(([x, y, roll], index) => {
        const holder = new THREE.Group();
        holder.position.set(x, y, 0.003);
        holder.rotation.z = roll;
        const lash = makeLash(index === 0 ? -1 : 1, 0);
        lash.rotation.x = Math.PI / 2;
        lash.position.y = W * 0.1;
        holder.add(lash);
        mirror.add(holder);
      });
      const floor = surface(0, -0.02);
      mirror.position.set(0, floor + 0.072, -0.02);
      mirror.rotation.x = -0.3;
      shadow(mirror);
      lashes.add(mirror);
      s.rod([0, floor, -0.034], [0, floor + 0.066, -0.024], 0.003, chrome);
      s.lathe([[0, 0], [0.03, 0], [0.03, 0.003], [0.006, 0.007], [0, 0.007]], chrome, [0, floor, -0.034]);
    }

    // What lies beside them.
    const bx = 0.03, bz = 0.03, by = surface(bx, bz);
    if (a.beside === 'glue') {
      const tube = s.cylinder(0.0045, 0.0045, 0.03, [bx, by + 0.0045, bz], s.material('#f3f3f0', { roughness: 0.35 }), 14);
      tube.rotation.set(Math.PI / 2, 0, 0.7, 'ZXY');
      tube.scale.z = 0.8;
      const dir = new THREE.Vector3(Math.sin(-0.7), 0, Math.cos(-0.7));
      s.rod([bx + dir.x * 0.015, by + 0.0045, bz + dir.z * 0.015], [bx + dir.x * 0.023, by + 0.004, bz + dir.z * 0.023], 0.0018, s.material(`#${accent.getHexString()}`, { roughness: 0.4 }), 0.0009);
      s.ball([0.002, 0.0015, 0.002], [bx + dir.x * 0.025, by + 0.0015, bz + dir.z * 0.025], s.material('#fbfaf2', { roughness: 0.2 }), 10);
      s.cylinder(0.0022, 0.0026, 0.007, [bx - 0.024, by + 0.0035, bz + 0.004], s.material('#22202a', { roughness: 0.4 }), 10);
    } else if (a.beside === 'tweezers') {
      const steel = s.material('#c5c9cf', { metalness: 0.85, roughness: 0.25 });
      for (const side of [-1, 1]) s.rod([bx - 0.03, by + 0.0015, bz + 0.012], [bx + 0.022, by + 0.0012 + (side + 1) * 0.0018, bz - 0.006 + side * 0.0012], 0.0016, steel, 0.0007).scale.z = 1.6;
    } else if (a.beside === 'wand') {
      const dir = new THREE.Vector3(0.9, 0, -0.43);
      const from: P = [bx - 0.035, by + 0.0035, bz + 0.016];
      const tip = (far: number): P => [from[0] + dir.x * far, from[1], from[2] + dir.z * far];
      s.rod(from, tip(0.03), 0.0035, s.material('#22202a', { roughness: 0.3, metalness: 0.3 }));
      s.rod(tip(0.03), tip(0.05), 0.0009, s.material('#22202a', { roughness: 0.4 }));
      s.rod(tip(0.05), tip(0.068), 0.0026, s.material('#0b0a0c', { roughness: 0.95 }), 0.0014);
    }
    return s.finish();
  },
});
