import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const INKS = {
  indigo: 'Indigo blue, a draughtsman\'s diagram.',
  red: 'Seismograph red, an alarm.',
  teal: 'Teal green, a phosphor trace on an old instrument.',
  violet: 'Violet, dreamlike and remote.',
  graphite: 'Soft graphite grey, a pencil study.',
  gold: 'Warm gold, a blessing rather than a warning.',
} as const;
const INK: Record<keyof typeof INKS, string> = { indigo: '#2f4fb8', red: '#cf3a34', teal: '#1f9c8c', violet: '#7b46cf', graphite: '#555b68', gold: '#d6962a' };

function gridTexture(ink: string, lines: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = ink;
  for (let i = 0; i <= lines; i++) {
    const at = Math.round((i / lines) * 1016);
    ctx.fillRect(at, 0, 8, 1024);
    ctx.fillRect(0, at, 1024, 8);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** A closed ring of tube that follows any height function. */
function ringTube(radius: number, tube: number, height: (angle: number) => number, swell: (angle: number) => number, steps = 120, sides = 7) {
  const positions: number[] = [], index: number[] = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2, y = height(angle);
    for (let j = 0; j < sides; j++) {
      const around = (j / sides) * Math.PI * 2, out = radius * swell(angle) + Math.cos(around) * tube;
      positions.push(Math.cos(angle) * out, y + Math.sin(around) * tube, Math.sin(angle) * out);
    }
  }
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + ((j + 1) % sides), c = ((i + 1) % steps) * sides + j, d = ((i + 1) % steps) * sides + ((j + 1) % sides);
      index.push(a, b, c, b, d, c);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    drawn: choice('How is the wave drawn?', {
      sheet: 'A rippling square grid sheet, like a pond surface ruled with graph lines.',
      rings: 'Free-floating concentric rings that rise and dip as they go round, a wobbling target.',
      points: 'An upright ring of test points squeezed into an oval and back, the textbook diagram.',
      chirp: 'A long strip of chart paper with the chirp inked on it: a wiggle that speeds up, peaks and stops.',
    }),
    amplitude: score('How strong is it?', ['Barely a shiver', 'A clear ripple', 'A heavy swell', 'A violent heave that bends everything']),
    train: choice('Is it one pulse or many?', {
      single: 'A single pulse passing through and gone.',
      train: 'A steady train of ripples, one after another.',
      fading: 'One great wave followed by smaller and smaller aftershocks.',
      building: 'Growing: each ripple larger and closer than the last, something is about to happen.',
    }),
    through: choice('What is it passing through?', {
      nothing: 'Nothing: empty space.',
      stars: 'A few reference stars, stretched and squeezed as it passes.',
      planet: 'A small blue planet, briefly squashed into an egg.',
      detector: 'An L-shaped detector, two long arms at right angles with a beam of laser light inside.',
      heart: 'A single red sphere on a pin, a heart taking the tremor.',
    }),
    ink: choice('What colour is it drawn in?', INKS),
    source: noul('Is the tiny source visible at the centre, two dark specks circling?'),
    tilt: choice('How is it presented?', {
      level: 'Level, like a tabletop model.',
      raised: 'Tipped up toward the viewer like a display plate.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const ink = new THREE.Color(INK[a.ink]).offsetHSL((mood.warmth - 0.5) * -0.02, (mood.cheer - 0.5) * 0.2, 0);
    const pale = ink.clone().lerp(new THREE.Color('#ffffff'), 0.45);
    const glow = mix(0.15, 0.55, mood.cheer);
    const A = mix(0.07, 0.5, a.amplitude);
    const R = 3.3, k = (Math.PI * 2) / 1.25, omega = mix(0.25, 2.6, mood.energy);
    const inkMaterial = new THREE.MeshStandardMaterial({ color: ink, roughness: 0.6, emissive: ink, emissiveIntensity: glow });
    const steel = new THREE.MeshStandardMaterial({ color: '#8d94a0', roughness: 0.4, metalness: 0.6 });
    const shellAt = (time: number) => ((0.5 * R + time * omega * 0.35) % (R * 1.2));
    const envelope = (r: number, time: number) => {
      const centre = Math.min(1, r / 0.5);
      if (a.train === 'train') return centre * (1.1 / (0.8 + 0.3 * r));
      if (a.train === 'building') return centre * mix(1.5, 0.25, Math.min(1, r / R));
      const at = shellAt(time);
      const shell = (c: number, width: number) => Math.exp(-(((r - c) / width) ** 2));
      if (a.train === 'single') return centre * 1.35 * shell(at, 0.65);
      return centre * (1.4 * shell(at + 0.6, 0.55) + 0.75 * shell(at - 0.75, 0.45) + 0.4 * shell(at - 1.8, 0.4) + 0.2 * shell(at - 2.7, 0.4));
    };
    const pitch = a.train === 'building' ? 0.55 : 1;
    const phase = (r: number, angle: number, time: number) => k * (a.train === 'building' ? r * (1 + (1 - r / R) * pitch) : r) - 2 * angle - omega * time;
    const wave = (x: number, z: number, time: number) => {
      const r = Math.hypot(x, z);
      return A * envelope(r, time) * Math.sin(phase(r, Math.atan2(z, x), time));
    };
    const updates: ((time: number) => void)[] = [];
    const stage = new THREE.Group();
    s.root.add(stage);
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = stage) => {
      node.traverse((child) => { if ((child as THREE.Mesh).isMesh) child.castShadow = true; });
      parent.add(node);
      return node;
    };

    /** The subject being shaken. It is built round its own origin; `strain` squeezes it. */
    const subject = (): { node: THREE.Group; strain(e: number): void } | null => {
      const node = new THREE.Group();
      if (a.through === 'nothing') return null;
      if (a.through === 'stars') return null; // handled per mode, several of them
      if (a.through === 'planet' || a.through === 'heart') {
        const tint = a.through === 'planet' ? new THREE.Color('#2f78c8') : new THREE.Color('#d2303c');
        const ball = add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 18), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.55, emissive: tint, emissiveIntensity: 0.15 })), node);
        if (a.through === 'planet') {
          for (let i = 0; i < 7; i++) {
            const land = new THREE.Mesh(new THREE.SphereGeometry(mix(0.1, 0.2, random()), 10, 8), new THREE.MeshStandardMaterial({ color: i % 3 ? '#4f9a52' : '#e9eef2', roughness: 0.8 }));
            land.position.setFromSphericalCoords(0.37, mix(0.4, 2.7, random()), random() * 6.28);
            land.scale.multiplyScalar(1).y *= 0.9;
            ball.add(land);
          }
        }
        return { node, strain: (e) => node.scale.set(1 + e, 1 - e, 1 + e * 0.3) };
      }
      // Detector: two arms, corner station, end mirrors, and the beams.
      const arms: THREE.Group[] = [];
      add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.32), steel), node).position.y = 0.02;
      for (const turn of [0, Math.PI / 2]) {
        const arm = new THREE.Group();
        arm.rotation.y = turn;
        const pipe = add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 10), steel), arm);
        pipe.rotation.z = Math.PI / 2;
        pipe.position.x = 0.5;
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), new THREE.MeshBasicMaterial({ color: '#ff3b30' }));
        beam.rotation.z = Math.PI / 2;
        beam.position.set(0.5, 0.11, 0);
        arm.add(beam);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.24), new THREE.MeshStandardMaterial({ color: '#d9dde4', roughness: 0.3, metalness: 0.5 })), arm).position.x = 1;
        node.add(arm);
        arms.push(arm);
      }
      return {
        node,
        strain(e) {
          arms[0].scale.x = 1.7 * (1 + e * 0.6);
          arms[1].scale.x = 1.7 * (1 - e * 0.6);
        },
      };
    };

    const speck = (parent: THREE.Object3D, y: number) => {
      const pair = new THREE.Group();
      pair.position.y = y;
      for (const side of [-1, 1]) {
        const hole = new THREE.Group();
        hole.position.x = side * 0.22;
        add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ color: '#07080d', roughness: 0.3 })), hole);
        hole.add(new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 12), new THREE.MeshBasicMaterial({ color: side > 0 ? '#f2a630' : '#58a0f4', side: THREE.BackSide })));
        pair.add(hole);
      }
      parent.add(pair);
      updates.push((time) => (pair.rotation.y = time * omega * 1.5));
    };

    const starTints = ['#e8a630', '#3f7fe0', '#e05a8c'];
    const pinMaterial = new THREE.MeshStandardMaterial({ color: '#7d8492', roughness: 0.5, metalness: 0.4 });

    if (a.drawn === 'sheet' || a.drawn === 'rings') {
      if (a.drawn === 'sheet') {
        const size = R * 2, cells = 72;
        const geometry = new THREE.PlaneGeometry(size, size, cells, cells);
        geometry.rotateX(-Math.PI / 2);
        const position = geometry.attributes.position as THREE.BufferAttribute;
        const rest = Float32Array.from(position.array);
        const sheet = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: gridTexture(`#${ink.getHexString()}`, 14), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8, emissive: ink, emissiveIntensity: glow * 0.6 }));
        sheet.receiveShadow = true;
        stage.add(sheet);
        const shape = (time: number) => {
          for (let i = 0; i < position.count; i++) {
            const x = rest[i * 3], z = rest[i * 3 + 2], r = Math.hypot(x, z) || 1, edge = Math.min(1, (R * 1.38 - r) / 0.9);
            const h = wave(x, z, time) * Math.max(0, edge), push = 1 + (h * 0.45) / r;
            position.setXYZ(i, x * push, h, z * push);
          }
          position.needsUpdate = true;
        };
        shape(0);
        geometry.computeVertexNormals();
        if (mood.energy > 0.02) updates.push(shape);
      } else {
        const rings = Math.round(mix(5, 8, mood.density));
        const spinner = new THREE.Group();
        stage.add(spinner);
        for (let i = 0; i < rings; i++) {
          const r = mix(0.55, R, i / (rings - 1));
          const strength = envelope(r, 0);
          const tint = ink.clone().lerp(pale, 0.6 * (1 - Math.min(1, strength)));
          add(new THREE.Mesh(ringTube(r, mix(0.04, 0.08, Math.min(1, strength)), (angle) => A * strength * 0.7 * Math.sin(phase(r, angle, 0)), (angle) => 1 + Math.min(0.2, A * strength * 0.4) * Math.cos(phase(r, angle, 0))), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.6, emissive: tint, emissiveIntensity: glow })), spinner);
        }
        updates.push((time) => (spinner.rotation.y = (omega * time) / 2));
      }
      if (a.source) speck(stage, A + 0.35);
      // Reference stars on pins, or a single subject, standing where the wave is strong.
      const stand = (x: number, z: number, lift: number, node: THREE.Object3D, strain: (e: number) => void, gain: number) => {
        const holder = new THREE.Group();
        holder.add(node);
        node.position.y = lift;
        const pin = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 6), pinMaterial), holder);
        pin.scale.y = lift;
        pin.position.y = lift / 2;
        stage.add(holder);
        const settle = (time: number) => {
          const h = wave(x, z, time);
          holder.position.set(x, h, z);
          strain((h / A) * A * gain);
        };
        settle(0);
        updates.push(settle);
      };
      if (a.through === 'stars') {
        const count = 5 + Math.floor(random() * 3);
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + random() * 0.6, r = mix(1.1, R * 0.92, random());
          const tint = new THREE.Color(starTints[i % 3]);
          const star = new THREE.Mesh(new THREE.SphereGeometry(mix(0.14, 0.24, random()), 18, 12), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.4, emissive: tint, emissiveIntensity: 0.7 }));
          star.castShadow = true;
          stand(Math.cos(angle) * r, Math.sin(angle) * r, mix(0.5, 1.2, random()) + A, star, (e) => star.scale.set(1 + e, 1 - e, 1), 1.5);
        }
      } else {
        const made = subject();
        if (made) {
          const angle = mix(0.3, 1.2, random()), r = a.through === 'detector' ? 1.2 : 1.7;
          const lift = a.through === 'detector' ? A + 0.35 : A + 0.75;
          made.strain(0);
          stand(Math.cos(angle) * r, Math.sin(angle) * r, lift, made.node, made.strain, a.through === 'detector' ? 1.2 : 1.4);
        }
      }
      stage.rotation.x = a.tilt === 'raised' ? 0.6 : 0;
    } else if (a.drawn === 'points') {
      // The textbook picture: rings of free points in a plane facing the viewer.
      const layers = a.train === 'single' ? [1.75] : a.train === 'train' ? [1.1, 1.75, 2.4] : [0.9, 1.5, 2.05, 2.55];
      const gains = a.train === 'fading' ? [1.3, 0.8, 0.45, 0.2] : a.train === 'building' ? [0.3, 0.6, 1, 1.4] : [1, 1, 1, 1];
      const upright = new THREE.Group();
      stage.add(upright);
      const beadGeometry = new THREE.SphereGeometry(1, 14, 10);
      layers.forEach((radius, layer) => {
        add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.014, 5, 80), new THREE.MeshStandardMaterial({ color: pale, roughness: 0.8 })), upright);
        const count = Math.round(radius * 9);
        const starry = a.through === 'stars';
        const beads = Array.from({ length: count }, (_unused, i) => {
          const tint = starry ? new THREE.Color(starTints[i % 3]) : ink;
          const bead = add(new THREE.Mesh(beadGeometry, starry ? new THREE.MeshStandardMaterial({ color: tint, roughness: 0.4, emissive: tint, emissiveIntensity: 0.6 }) : inkMaterial), upright);
          bead.scale.setScalar(starry ? 0.12 : 0.085);
          return bead;
        });
        const oval = add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.022, 5, 80), inkMaterial), upright);
        const settle = (time: number) => {
          const e = Math.min(0.42, A * 0.75 * gains[layer]) * Math.cos(omega * time * 2 - layer * 0.9);
          beads.forEach((bead, i) => {
            const angle = (i / count) * Math.PI * 2;
            bead.position.set(Math.cos(angle) * radius * (1 + e), Math.sin(angle) * radius * (1 - e), 0);
          });
          oval.scale.set(1 + e, 1 - e, 1);
        };
        settle(0);
        updates.push(settle);
      });
      const made = subject();
      if (made) {
        if (a.through === 'detector') made.node.rotation.x = Math.PI / 2;
        made.node.scale.multiplyScalar(0.9);
        const inner = new THREE.Group();
        inner.add(made.node);
        upright.add(inner);
        const settle = (time: number) => made.strain(Math.min(0.42, A * 0.75) * Math.cos(omega * time * 2));
        settle(0);
        updates.push(settle);
      } else if (a.source) speck(upright, 0);
      upright.rotation.x = a.tilt === 'raised' ? -0.1 : -0.45;
    } else {
      // A strip of chart paper: a roll at one end, the trace running along it.
      const width = 1.7, length = 6.2;
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 400;
      const ctx = canvas.getContext('2d')!;
      const paper = new THREE.Color('#f3ecd8').lerp(new THREE.Color('#d9c59a'), mood.wear * 0.7);
      ctx.fillStyle = `#${paper.getHexString()}`;
      ctx.fillRect(0, 0, 2048, 400);
      ctx.strokeStyle = `#${pale.clone().lerp(paper, 0.4).getHexString()}`;
      ctx.lineWidth = 2;
      for (let x = 0; x < 2048; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 400); ctx.stroke(); }
      for (let y = 40; y < 400; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(2048, y); ctx.stroke(); }
      for (let i = 0; i < mood.wear * 14; i++) {
        ctx.fillStyle = `rgba(120,80,30,${0.05 + random() * 0.1})`;
        ctx.beginPath();
        ctx.arc(random() * 2048, random() * 400, 20 + random() * 60, 0, 6.3);
        ctx.fill();
      }
      const bursts = a.train === 'single' ? [[0.16, 0.9, 1]] : a.train === 'train' ? [[0.12, 0.38, 0.9], [0.4, 0.66, 0.9], [0.68, 0.94, 0.9]] : a.train === 'fading' ? [[0.12, 0.5, 1], [0.52, 0.7, 0.55], [0.72, 0.84, 0.3], [0.86, 0.94, 0.15]] : [[0.12, 0.3, 0.25], [0.32, 0.52, 0.45], [0.54, 0.72, 0.7], [0.74, 0.94, 1]];
      ctx.strokeStyle = `#${ink.getHexString()}`;
      ctx.lineWidth = 10;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let x = 0; x <= 2048; x += 2) {
        const u = x / 2048;
        let y = (random() - 0.5) * 6;
        for (const [from, to, gain] of bursts) {
          if (u < from || u > to + 0.03) continue;
          const t = (u - from) / (to - from);
          const swing = gain * mix(55, 175, a.amplitude), cycles = 6 + 22 * (to - from);
          if (t <= 1) y += Math.sin(Math.PI * 2 * cycles * (0.35 * t + 0.65 * Math.pow(t, 3))) * swing * (0.15 + 0.85 * Math.pow(t, 2.2));
          else y += Math.sin((t - 1) * 260) * swing * Math.exp(-(t - 1) * 140);
        }
        if (x === 0) ctx.moveTo(x, 200 + y); else ctx.lineTo(x, 200 + Math.max(-185, Math.min(185, y)));
      }
      ctx.stroke();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      // Side profile: a spiral roll, then a run that lifts and curls at the free end.
      const profile: [number, number][] = [];
      const turnsOfRoll = 2.2, rollRadius = 0.42;
      for (let i = 0; i <= 50; i++) {
        const t = i / 50, angle = -Math.PI / 2 - (1 - t) * turnsOfRoll * Math.PI * 2, r = rollRadius * mix(0.45, 1, t);
        profile.push([-length / 2 + Math.cos(angle) * r, rollRadius + Math.sin(angle) * r]);
      }
      const rollPoints = profile.length;
      for (let i = 1; i <= 90; i++) {
        const t = i / 90, x = -length / 2 + t * length;
        profile.push([x, 0.02 + Math.sin(t * Math.PI * 2.2 + 0.4) ** 2 * 0.16 * (0.4 + t) + Math.pow(Math.max(0, t - 0.78) / 0.22, 2) * 0.9]);
      }
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      profile.forEach(([x, y], i) => {
        const u = i < rollPoints ? 0 : (i - rollPoints) / 90;
        positions.push(x, y, -width / 2, x, y, width / 2);
        uvs.push(u, 0, u, 1);
        if (i < profile.length - 1) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, roughness: 0.9 })));
      const spindle = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, width + 0.4, 12), steel));
      spindle.rotation.x = Math.PI / 2;
      spindle.position.set(-length / 2, rollRadius, 0);
      for (const side of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.12, rollRadius + 0.1, 0.06), steel)).position.set(-length / 2, (rollRadius + 0.1) / 2, side * (width / 2 + 0.15));
      // The pen arm, resting where the trace has got to.
      const pen = new THREE.Group();
      const penX = length * 0.22;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), steel), pen).position.set(0, 0.25, -width / 2 - 0.3);
      const arm = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, width * 0.85, 6), steel), pen);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(0, 0.42, -width * 0.08 - 0.3 + width * 0.2);
      add(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 8), inkMaterial), pen).position.set(0, 0.3, 0.05);
      pen.children[2].rotation.x = Math.PI;
      pen.position.x = penX;
      stage.add(pen);
      updates.push((time) => (pen.position.z = Math.sin(time * omega * 3) * A * 0.5));
      if (a.source) speck(stage, 1.5);
      const made = subject();
      if (made) {
        made.node.position.set(length * 0.05, a.through === 'detector' ? 0.75 : 1.1, -width * 0.5 - 1);
        stage.add(made.node);
        const post = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, made.node.position.y, 6), pinMaterial));
        post.position.set(made.node.position.x, made.node.position.y / 2, made.node.position.z);
        const settle = (time: number) => made.strain(A * Math.cos(omega * time * 2));
        settle(0);
        updates.push(settle);
      } else if (a.through === 'stars') {
        for (let i = 0; i < 5; i++) {
          const tint = new THREE.Color(starTints[i % 3]);
          const star = add(new THREE.Mesh(new THREE.SphereGeometry(mix(0.12, 0.2, random()), 16, 10), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.4, emissive: tint, emissiveIntensity: 0.7 })));
          star.position.set(mix(-2.2, 2.4, i / 4), mix(0.9, 1.7, random()), -width / 2 - mix(0.4, 1.2, random()));
          updates.push((time) => { const e = A * 1.4 * Math.cos(omega * time * 2 - i); star.scale.set(1 + e, 1 - e, 1); });
          updates.at(-1)!(0);
        }
      }
      stage.rotation.x = a.tilt === 'raised' ? 0.5 : 0;
    }

    return s.finish({ update(_dt, time) { for (const update of updates) update(time); } });
  },
});
