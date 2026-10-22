import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
const METAL = { tin: '#c9ced2', silver: '#ecebe6', brass: '#c79c48', gilt: '#e6b83a' } as const;
const CLOTH = { crimson: '#7d1c2a', black: '#221f22', blue: '#1f2f6b', green: '#1f4a35', purple: '#4a2360' } as const;

/** One plaque, 1 unit wide, lying in the xy plane facing +z. Returns the metal and the dark parts. */
function plaqueGeometry(style: 'naive' | 'engraved' | 'rays' | 'tear') {
  const metal: THREE.BufferGeometry[] = [], dark: THREE.BufferGeometry[] = [];
  const oval = style === 'engraved' || style === 'rays';
  const plate = new THREE.Shape();
  if (oval) plate.absellipse(0, 0, 0.5, 0.3, 0, Math.PI * 2);
  else {
    const w = 0.5, h = 0.28, c = 0.07;
    plate.moveTo(-w + c, -h);
    plate.lineTo(w - c, -h); plate.lineTo(w, -h + c); plate.lineTo(w, h - c); plate.lineTo(w - c, h);
    plate.lineTo(-w + c, h); plate.lineTo(-w, h - c); plate.lineTo(-w, -h + c); plate.closePath();
  }
  metal.push(new THREE.ExtrudeGeometry(plate, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, curveSegments: 18 }));
  for (const side of [-1, 1]) {
    const cx = side * 0.235;
    const lid = new THREE.Shape();
    lid.moveTo(-0.19, 0); lid.quadraticCurveTo(0, 0.2, 0.19, 0); lid.quadraticCurveTo(0, -0.2, -0.19, 0);
    const hole = new THREE.Path();
    hole.moveTo(-0.14, 0); hole.quadraticCurveTo(0, -0.135, 0.14, 0); hole.quadraticCurveTo(0, 0.135, -0.14, 0);
    lid.holes.push(hole);
    const rim = new THREE.ExtrudeGeometry(lid, { depth: 0.035, bevelEnabled: false, curveSegments: 10 });
    rim.translate(cx, 0, 0.02);
    metal.push(rim);
    const white = new THREE.Shape();
    white.moveTo(-0.15, 0); white.quadraticCurveTo(0, 0.15, 0.15, 0); white.quadraticCurveTo(0, -0.15, -0.15, 0);
    const socket = new THREE.ExtrudeGeometry(white, { depth: 0.012, bevelEnabled: false, curveSegments: 10 });
    socket.translate(cx, 0, 0.022);
    dark.push(socket);
    const iris = new THREE.SphereGeometry(0.06, 12, 8);
    iris.scale(1, 1, 0.6);
    iris.translate(cx, 0, 0.03);
    metal.push(iris);
    const pupil = new THREE.CylinderGeometry(0.03, 0.03, 0.01, 10);
    pupil.rotateX(Math.PI / 2);
    pupil.translate(cx, 0, 0.074);
    dark.push(pupil);
    if (style === 'engraved' || style === 'tear') {
      const brow = new THREE.TorusGeometry(0.2, 0.014, 5, 12, Math.PI * 0.55);
      brow.rotateZ(Math.PI * 0.225);
      brow.translate(cx, -0.03, 0.03);
      metal.push(brow);
    }
    if (style === 'engraved')
      for (let i = 0; i < 6; i++) {
        const t = (i + 0.5) / 6, x = mix(-0.15, 0.15, t), y = 0.1 * (1 - (2 * t - 1) ** 2) + 0.03;
        const lash = new THREE.BoxGeometry(0.012, 0.06, 0.012);
        lash.rotateZ(-(t - 0.5) * 1.3);
        lash.translate(cx + x, y + 0.03, 0.035);
        metal.push(lash);
      }
  }
  if (style === 'engraved')
    for (let i = 0; i < 26; i++) {
      const angle = i / 26 * Math.PI * 2;
      const bead = new THREE.SphereGeometry(0.02, 6, 4);
      bead.translate(Math.cos(angle) * 0.46, Math.sin(angle) * 0.265, 0.03);
      metal.push(bead);
    }
  if (style === 'rays')
    for (let i = 0; i < 22; i++) {
      const angle = i / 22 * Math.PI * 2, long = i % 2 ? 0.2 : 0.11;
      const ray = new THREE.ConeGeometry(0.03, long, 4);
      ray.scale(1, 1, 0.3);
      ray.rotateZ(angle - Math.PI / 2);
      ray.translate(Math.cos(angle) * (0.5 + long / 2), Math.sin(angle) * (0.3 + long / 2), 0.012);
      metal.push(ray);
    }
  if (style === 'tear') {
    const tear = new THREE.SphereGeometry(0.045, 10, 8);
    tear.scale(1, 1.5, 0.8);
    tear.translate(0.2, -0.17, 0.04);
    const tip = new THREE.ConeGeometry(0.035, 0.09, 8);
    tip.translate(0.2, -0.09, 0.04);
    metal.push(tear, tip);
  }
  const nail = new THREE.SphereGeometry(0.022, 6, 4);
  nail.translate(0, style === 'tear' || style === 'naive' ? 0.23 : 0.25, 0.035);
  dark.push(nail);
  const flat = (list: THREE.BufferGeometry[]) => mergeGeometries(list.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); return n; }))!;
  return { metal: flat(metal), dark: flat(dark) };
}

export default defineThing({
  questions: {
    metal: choice('What metal are the eye charms stamped from?', {
      tin: 'Bright cheap tin, thin as a can lid.', silver: 'Real silver, pale and precious.', brass: 'Yellow brass.', gilt: 'Gilded, gaudy and glowing.',
    }),
    arrangement: choice('How are they arranged?', {
      single: 'One large pair of eyes alone on its little cushion of velvet.',
      heart: 'A heart-shaped cluster of plaques.',
      crowded: 'A board crowded edge to edge with rows of eyes.',
      robe: 'Pinned all over the robe of a small saint statue.',
    }),
    style: choice('How are the eyes worked?', {
      naive: 'Naively stamped: two almonds and two dots on a clipped rectangle.',
      engraved: 'Finely worked ovals with lashes, brows and a beaded border.',
      rays: 'Ovals bursting with rays of light, eyes like suns.',
      tear: 'Each pair with a single heavy tear falling from one eye.',
    }),
    condition: choice('What condition is the metal in?', {
      shining: 'Polished and shining, pinned up this week.',
      tarnished: 'Tarnished almost black, only the high points still bright.',
      rusted: 'Rusted orange-brown and flaking, some hanging crooked.',
    }),
    cloth: choice('What colour is the velvet or robe they are pinned to?', {
      crimson: 'Crimson.', black: 'Funeral black.', blue: 'Deep Marian blue.', green: 'Bottle green.', purple: 'Penitential purple.',
    }),
    companion: choice('What hangs with them?', {
      nothing: 'Nothing else.',
      ribbon: 'A red ribbon tied in a bow with long tails.',
      spectacles: 'A pair of old wire spectacles, no longer needed.',
      candle: 'A small votive candle in a red glass burning in front.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = new THREE.Color(METAL[a.metal]);
    const metalMat = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: a.condition === 'rusted' ? 0.15 : 0.5, roughness: a.condition === 'shining' ? mix(0.22, 0.4, mood.wear) : a.condition === 'tarnished' ? 0.5 : 0.9, emissive: base, emissiveIntensity: a.condition === 'shining' ? 0.16 : 0.03 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#1d1a18', roughness: 0.7 });
    const tintFor = () => {
      const c = base.clone();
      if (a.condition === 'tarnished') c.lerp(new THREE.Color('#2b2925'), 0.55 + random() * 0.35);
      else if (a.condition === 'rusted') c.lerp(new THREE.Color(random() < 0.5 ? '#8f4a22' : '#6b3a22'), 0.5 + random() * 0.45);
      else c.lerp(new THREE.Color('#77736a'), mood.wear * random() * 0.5);
      return c;
    };
    const cloth = s.material(CLOTH[a.cloth], { roughness: 1 });
    const wood = s.material('#3b2a1e', { roughness: 0.85 });
    const geometry = plaqueGeometry(a.style);
    const reach = a.style === 'rays' ? 1.4 : 1; // rays need elbow room
    const crooked = a.condition === 'rusted' ? 0.5 : 0.12;

    type Pin = { at: THREE.Vector3; width: number; turn: THREE.Quaternion };
    const pins: Pin[] = [];
    const flatPin = (x: number, y: number, z: number, width: number) =>
      pins.push({ at: new THREE.Vector3(x, y, z), width, turn: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, (random() - 0.5) * crooked)) });

    let boardW = 0.3, boardH = 0.3, front = 0.012, anchor: P3 = [0, 0.3, 0.02];
    if (a.arrangement === 'robe') {
      // A small saint: bell robe, veiled head, halo. The plaques follow the cloth.
      const H = 0.5;
      const profile: [number, number][] = [[0.15, 0], [0.155, 0.02], [0.13, 0.12], [0.1, 0.24], [0.075, 0.33], [0.06, 0.37], [0.035, 0.385], [0, 0.39]];
      s.lathe(profile, cloth);
      s.cylinder(0.17, 0.18, 0.03, [0, -0.015 + 0.03, 0], wood, 8).position.y = 0.0;
      s.ball([0.042, 0.05, 0.045], [0, 0.42, 0.005], s.material('#d9b79a', { roughness: 0.7 }), 16);
      s.ball([0.052, 0.058, 0.05], [0, 0.428, -0.012], cloth, 16);
      const halo = s.ring(0.07, 0.006, [0, 0.44, -0.035], s.material('#e3b53b', { metalness: 0.5, roughness: 0.3, emissive: '#e3b53b', emissiveIntensity: 0.25 }));
      halo.castShadow = true;
      for (const side of [-1, 1]) s.rod([side * 0.06, 0.33, 0.02], [side * 0.02, 0.26, 0.085], 0.02, cloth, 0.016);
      s.ball([0.022, 0.03, 0.018], [0, 0.262, 0.092], s.material('#d9b79a', { roughness: 0.7 }), 10);
      const radiusAt = (y: number) => {
        for (let i = 1; i < profile.length; i++) if (y <= profile[i][1]) { const t = (y - profile[i - 1][1]) / (profile[i][1] - profile[i - 1][1]); return mix(profile[i - 1][0], profile[i][0], t); }
        return 0.03;
      };
      const count = 14 + Math.floor(mood.density * 16 + random() * 6);
      for (let i = 0; i < count; i++) {
        const y = 0.03 + random() * 0.2, angle = (random() - 0.5) * 2.5;
        const r = radiusAt(y) + 0.003;
        const width = (0.032 + random() * 0.014) / reach;
        const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.28, angle, (random() - 0.5) * crooked, 'YXZ'));
        pins.push({ at: new THREE.Vector3(Math.sin(angle) * r, y, Math.cos(angle) * r), width, turn });
      }
      anchor = [0, 0.335, 0.062];
      boardW = 0.3; boardH = H;
    } else {
      if (a.arrangement === 'single') { boardW = 0.22; boardH = 0.17; }
      else if (a.arrangement === 'heart') { boardW = 0.4; boardH = 0.4; }
      else { boardW = 0.42; boardH = 0.5; }
      const y0 = 0.03;
      s.box([boardW, boardH, 0.014], [0, y0 + boardH / 2, 0], cloth);
      const frame = a.metal === 'gilt' || a.metal === 'brass' ? s.material('#b98d3a', { metalness: 0.45, roughness: 0.4 }) : wood;
      for (const side of [-1, 1]) s.box([0.018, boardH + 0.036, 0.03], [side * (boardW / 2 + 0.009), y0 + boardH / 2, 0], frame);
      for (const y of [y0 - 0.009, y0 + boardH + 0.009]) s.box([boardW + 0.036, 0.018, 0.03], [0, y, 0], frame);
      s.box([boardW * 0.7, 0.012, 0.11], [0, 0.006, 0], wood);
      front = 0.009;
      const cy = y0 + boardH / 2;
      if (a.arrangement === 'single') {
        s.ball([0.085, 0.055, 0.012], [0, cy, front], s.material(new THREE.Color(CLOTH[a.cloth]).multiplyScalar(1.35), { roughness: 1 }), 20);
        flatPin(0, cy, front + 0.012, 0.13 / reach);
      } else if (a.arrangement === 'heart') {
        const rings: [number, number][] = [[1, 22], [0.68, 14], [0.36, 7], [0.05, 1]];
        for (const [scale, count] of rings)
          for (let i = 0; i < count; i++) {
            // even out the parametric heart so the lobes and the point all get plaques
            const u = (i + 0.5) / count * 2 - 1, t = Math.sign(u) * Math.abs(u) ** 0.8 * Math.PI;
            const hx = 16 * Math.sin(t) ** 3, hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            flatPin(hx / 17 * 0.175 * scale + (random() - 0.5) * 0.004, cy + (hy + 2.5) / 17 * 0.175 * scale + (random() - 0.5) * 0.004, front + 0.002 + random() * 0.004, (0.044 + random() * 0.006) / (a.style === 'rays' ? 1.25 : 1));
          }
      } else {
        const cols = 4 + Math.floor(mood.density * 2.2), rows = 6 + Math.floor(mood.density * 2.2);
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) {
            if (random() < 0.12 * (1 - mood.density)) continue; // a few gaps where one fell
            const cellW = (boardW - 0.02) / cols, cellH = (boardH - 0.02) / rows;
            flatPin(-boardW / 2 + 0.01 + cellW * (c + 0.5) + (random() - 0.5) * cellW * 0.12, y0 + 0.01 + cellH * (r + 0.5) + (random() - 0.5) * cellH * 0.15, front + 0.002 + random() * 0.004, Math.min(cellW * 0.92, cellH * 1.5) * (0.85 + random() * 0.15) / reach);
          }
      }
      anchor = [0, y0 + boardH - 0.012, front + 0.012];
    }

    const plaques = new THREE.InstancedMesh(geometry.metal, metalMat, pins.length);
    const dots = new THREE.InstancedMesh(geometry.dark, darkMat, pins.length);
    const matrix = new THREE.Matrix4();
    pins.forEach((pin, i) => {
      matrix.compose(pin.at, pin.turn, new THREE.Vector3(pin.width, pin.width, pin.width));
      plaques.setMatrixAt(i, matrix);
      dots.setMatrixAt(i, matrix);
      plaques.setColorAt(i, tintFor());
    });
    plaques.castShadow = plaques.receiveShadow = true;
    plaques.instanceMatrix.needsUpdate = true;
    if (plaques.instanceColor) plaques.instanceColor.needsUpdate = true;
    s.root.add(plaques, dots);

    // What hangs with them.
    const [ax, ay, az] = anchor;
    if (a.companion === 'ribbon') {
      const red = s.material('#c0202c', { roughness: 0.5, side: THREE.DoubleSide });
      const size = a.arrangement === 'single' ? 0.02 : 0.03;
      for (const side of [-1, 1]) {
        const loop = s.ring(size, size * 0.3, [ax + side * size, ay + size * 0.2, az + 0.006], red);
        loop.scale.set(1, 0.6, 0.5);
        loop.rotation.z = side * 0.4;
        const sway = (random() - 0.3) * 0.03;
        s.tube([[ax, ay, az + 0.006], [ax + side * size * 1.2, ay - size * 2, az + 0.012], [ax + side * (size * 1.6 + sway), ay - size * (4 + random() * 2), az + 0.008]], size * 0.2, red).scale.z = 0.6;
      }
      s.ball([size * 0.4, size * 0.4, size * 0.3], [ax, ay, az + 0.008], red, 10);
    } else if (a.companion === 'spectacles') {
      const wire = s.material('#b9a56a', { metalness: 0.5, roughness: 0.35 });
      const gy = a.arrangement === 'robe' ? ay - 0.045 : a.arrangement === 'single' ? 0.022 : ay - 0.035;
      const gz = a.arrangement === 'single' ? 0.045 : az + 0.012;
      const lens = new THREE.MeshStandardMaterial({ color: '#dfeaf0', transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.05 });
      const tiltX = a.arrangement === 'single' ? -1.2 : 0;
      const frame = new THREE.Group();
      for (const side of [-1, 1]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.021, 0.0017, 6, 28), wire);
        rim.position.x = side * 0.027;
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.02, 20), lens);
        glass.position.x = side * 0.027;
        const temple = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.08, 6), wire);
        temple.rotation.x = Math.PI / 2;
        temple.rotation.z = side * -0.2;
        temple.position.set(side * 0.052, 0, -0.035);
        rim.castShadow = temple.castShadow = true;
        frame.add(rim, glass, temple);
      }
      const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0015, 6, 12, Math.PI), wire);
      bridge.position.y = 0.003;
      frame.add(bridge);
      frame.position.set(ax + (a.arrangement === 'single' ? 0.02 : 0), gy, gz + (tiltX ? 0.04 : 0.006));
      frame.rotation.set(tiltX, 0, (random() - 0.5) * 0.3);
      if (!tiltX) frame.children.forEach((child) => { if ((child as THREE.Mesh).geometry.type === 'CylinderGeometry') child.visible = false; });
      s.root.add(frame);
    }
    let flame: THREE.Mesh | null = null;
    if (a.companion === 'candle') {
      const cx = a.arrangement === 'robe' ? 0.2 : boardW / 2 + 0.05, cz = a.arrangement === 'robe' ? 0.08 : 0.05;
      const glass = new THREE.MeshStandardMaterial({ color: '#b3202a', transparent: true, opacity: 0.75, roughness: 0.15, emissive: '#d2401e', emissiveIntensity: 0.5 + mood.warmth * 0.5 });
      s.cylinder(0.022, 0.017, 0.05, [cx, 0.025, cz], glass, 16);
      flame = s.ball([0.006, 0.013, 0.006], [cx, 0.06, cz], new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffb040', emissiveIntensity: 2.4 }), 10);
      flame.castShadow = false;
    }

    return s.finish({
      update: (_dt, time) => {
        if (flame) flame.scale.y = 0.013 * (1 + Math.sin(time * (6 + mood.energy * 14)) * 0.15 * (0.4 + mood.energy));
        metalMat.emissiveIntensity = (a.condition === 'shining' ? 0.16 : 0.03) * (1 + Math.sin(time * 3.1) * 0.25 * mood.energy);
      },
    });
  },
});
