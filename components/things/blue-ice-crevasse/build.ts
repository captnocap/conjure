import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];

const LIGHTS = {
  none: 'None: the walls go down into flat black.',
  blue: 'A steady deep blue glow, the ice lit from within.',
  green: 'A green bioluminescent glow that seems alive.',
  orange: 'A warm orange light, as if lamps or a fire burned far below.',
  white: 'A hard white beam, like a lost headlamp still shining.',
  violet: 'An uncanny violet light.',
} as const;
const LIGHT_COLOUR: Record<keyof typeof LIGHTS, string> = {
  none: '#05090f', blue: '#1fa8ff', green: '#3dff8f', orange: '#ff8a2e', white: '#f2fbff', violet: '#a45cff',
};

export default defineThing({
  questions: {
    width: score('How wide is the crevasse?', ['A crack you could step across', 'A stride and a jump', 'Too wide to jump', 'A chasm']),
    span: choice('What spans it?', {
      nothing: 'Nothing: there is no way across.',
      ladder: 'An aluminium ladder laid flat across as a bridge, with a hand line.',
      rope: 'A single rope pulled tight between two anchors.',
      bridge: 'A sagging rope bridge with wooden slats.',
      snow: 'A natural snow bridge, thin in the middle, that may not hold.',
      fallen: 'A ladder that has slipped: one end still on the lip, the other hanging down inside.',
    }),
    light: choice('What light comes up from below?', LIGHTS),
    walls: choice('What are the walls like?', {
      glassy: 'Smooth and glassy, pure blue.',
      banded: 'Banded with thin dark layers of old dust, like tree rings.',
      shattered: 'Fractured and hung with icicles.',
    }),
    left: choice('What has been left at the edge?', {
      nothing: 'Nothing: untouched snow.',
      axe: 'An ice axe planted in the snow beside a coil of rope.',
      pack: 'An abandoned rucksack.',
      wands: 'A line of marker flags warning of the edge.',
      tracks: 'Footprints that walk up to the lip and stop, and a dropped glove.',
      descent: 'A rope anchored at the lip and dropping down into the crevasse.',
    }),
    cornice: noul('Do soft snow cornices overhang the lips?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 3.0, X = 3.1, Z = 2.6;
    const gap = mix(0.45, 2.9, a.width);
    const glow = new THREE.Color(LIGHT_COLOUR[a.light]);
    const lit = a.light !== 'none';

    // Wall texture: the light from below stains the lower ice, fading to pale blue at the lip.
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 256, 0, 0);
    gradient.addColorStop(0, `#${glow.getHexString()}`);
    gradient.addColorStop(lit ? 0.3 : 0.4, lit ? `#${glow.clone().lerp(new THREE.Color('#0b3c6e'), 0.7).getHexString()}` : '#0a2c4c');
    gradient.addColorStop(0.62, '#2586d0');
    gradient.addColorStop(0.86, '#6fc0ec');
    gradient.addColorStop(1, '#c9ecfa');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
    if (a.walls === 'banded') {
      for (let i = 0; i < 16; i++) { ctx.globalAlpha = 0.35 + random() * 0.45; ctx.fillStyle = random() < 0.5 ? '#16222c' : '#3d4a44'; ctx.fillRect(0, random() * 256, 256, 1.5 + random() * 6); }
    } else if (a.walls === 'shattered') {
      ctx.strokeStyle = '#eaf8ff'; ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) {
        ctx.globalAlpha = 0.4 + random() * 0.5; ctx.beginPath();
        let x = random() * 256, y = random() * 256; ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (random() - 0.5) * 40; y += 14 + random() * 40; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 9; i++) { ctx.globalAlpha = 0.12; ctx.fillStyle = '#ffffff'; ctx.fillRect(random() * 256, 0, 6 + random() * 20, 256); }
    }
    ctx.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    const wall = new THREE.MeshStandardMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: mix(0.45, 0.8, mood.cheer), roughness: a.walls === 'glassy' ? 0.12 : 0.4 });
    const snow = s.material('#f3f8fb', { roughness: 0.95 });
    const paleIce = s.material('#c4dfee', { roughness: 0.5 });

    // The split: one wandering centre line, two matching edges.
    const N = 13;
    let drift = (random() - 0.5) * 0.4;
    const line = Array.from({ length: N }, (_unused, i) => {
      drift = THREE.MathUtils.clamp(drift + (random() - 0.5) * 0.55, -0.6, 0.6);
      return { z: -Z + (2 * Z * i) / (N - 1), c: drift, g: gap / 2 * (0.75 + random() * 0.5) + (random() < 0.25 ? 0.12 : 0) };
    });
    const edgeAt = (z: number, side: number) => {
      const f = THREE.MathUtils.clamp((z + Z) / (2 * Z) * (N - 1), 0, N - 1.001), i = Math.floor(f), t = f - i;
      return mix(line[i].c, line[i + 1].c, t) + side * mix(line[i].g, line[i + 1].g, t);
    };
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape();
      const outer = side * X;
      shape.moveTo(outer, Z - 0.5);
      shape.lineTo(outer - side * 0.4, Z);
      for (const p of line) shape.lineTo(p.c + side * p.g, -p.z);
      shape.lineTo(outer - side * 0.5, -Z);
      shape.lineTo(outer, -Z + 0.6);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: false, steps: 1 });
      geometry.rotateX(-Math.PI / 2);
      const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
      for (let i = 0; i < position.count; i++) uv.setXY(i, (position.getX(i) + position.getZ(i)) * 0.22, position.getY(i) / H);
      // Only the faces inside the split are blue; the outside of the block is plain pale ice.
      const groups = geometry.groups.slice();
      geometry.clearGroups();
      for (const group of groups) {
        if (group.materialIndex === 0) { geometry.addGroup(group.start, group.count, 0); continue; }
        let runStart = group.start, runKind = -1;
        for (let v = group.start; v < group.start + group.count; v += 3) {
          const cx = (position.getX(v) + position.getX(v + 1) + position.getX(v + 2)) / 3, cz = (position.getZ(v) + position.getZ(v + 1) + position.getZ(v + 2)) / 3;
          const kind = Math.abs(cz) < Z - 0.02 && Math.abs(cx - edgeAt(cz, side)) < 0.15 ? 1 : 2;
          if (kind !== runKind) { if (runKind >= 0) geometry.addGroup(runStart, v - runStart, runKind); runStart = v; runKind = kind; }
        }
        geometry.addGroup(runStart, group.start + group.count - runStart, runKind);
      }
      s.mesh(geometry, [snow, wall, paleIce] as unknown as THREE.Material);
    }
    // The bottom: where the light comes from.
    const floor = s.material(LIGHT_COLOUR[a.light], lit ? { emissive: LIGHT_COLOUR[a.light], emissiveIntensity: mix(0.7, 1.1, mood.cheer) } : { roughness: 0.3 });
    s.box([gap * 1.25 + 1.5, 0.06, Z * 2 - 0.06], [0, 0.03, 0], floor);
    if (a.walls === 'shattered') {
      const icicle = s.material('#cfeefa', { roughness: 0.15, emissive: '#5ab8e8', emissiveIntensity: 0.3 });
      for (let i = 0; i < 26; i++) {
        const side = i % 2 ? 1 : -1, z = (random() - 0.5) * Z * 1.8, len = 0.25 + random() * 0.7;
        const cone = s.mesh(new THREE.ConeGeometry(0.035 + random() * 0.04, len, 6), icicle, [edgeAt(z, side) - side * 0.04, H - len / 2 - 0.02, z]);
        cone.rotation.x = Math.PI;
      }
      for (let i = 0; i < 7; i++) {
        const side = i % 2 ? 1 : -1, z = (random() - 0.5) * Z * 1.6, size = 0.25 + random() * 0.3;
        const block = s.mesh(new THREE.DodecahedronGeometry(size, 0), wall, [edgeAt(z, side) + side * (0.3 + random() * 0.4), H + size * 0.5, z]);
        block.rotation.set(random() * 3, random() * 3, 0);
      }
    }
    if (a.cornice) {
      for (let i = 0; i < 20; i++) {
        const side = i % 2 ? 1 : -1, z = -Z + 0.3 + (i / 20) * (Z * 2 - 0.6) + random() * 0.2, size = 0.3 + random() * 0.25;
        s.ball([size * 0.7, size * 0.22, size * 1.3], [edgeAt(z, side) + side * size * 0.05, H + 0.01, z], snow, 12);
      }
    }
    const drifts = Math.round(mix(2, 9, mood.density));
    for (let i = 0; i < drifts; i++) {
      const side = random() < 0.5 ? 1 : -1, size = 0.4 + random() * 0.6;
      s.ball([size, size * 0.2, size * 0.8], [side * (X - 0.6 - random() * 1.0), H, (random() - 0.5) * Z * 1.6], snow, 12);
    }

    // What spans it. Crossings run along x near the front third.
    const steel = s.material('#c3c9cc', { metalness: 0.8, roughness: 0.3 });
    const rope = s.material('#e0792b', { roughness: 0.8 });
    const wood = s.material('#8a6845', { roughness: 0.9 });
    const dark = s.material('#24292d', { roughness: 0.7 });
    const cz = 0.6;
    const lx = edgeAt(cz, -1), rx = edgeAt(cz, 1), reach = rx - lx;
    const anchor = (x: number, z: number) => { s.rod([x, H - 0.1, z], [x + (x < 0 ? -0.06 : 0.06), H + 0.42, z], 0.022, steel); s.ball([0.04, 0.04, 0.04], [x, H + 0.4, z], dark, 8); };
    const ladder = (from: P, to: P) => {
      const d = new THREE.Vector3(...to).sub(new THREE.Vector3(...from));
      for (const dz of [-0.22, 0.22]) s.rod([from[0], from[1], from[2] + dz], [to[0], to[1], to[2] + dz], 0.025, steel);
      const rungs = Math.max(4, Math.round(d.length() / 0.3));
      for (let r = 0; r <= rungs; r++) { const t = r / rungs; s.rod([from[0] + d.x * t, from[1] + d.y * t, from[2] - 0.22], [from[0] + d.x * t, from[1] + d.y * t, from[2] + 0.22], 0.016, steel); }
    };
    if (a.span === 'ladder') {
      ladder([lx - 0.75, H + 0.05, cz], [rx + 0.75, H + 0.05, cz]);
      anchor(lx - 0.9, cz - 0.55); anchor(rx + 0.9, cz - 0.55);
      s.tube([[lx - 0.9, H + 0.4, cz - 0.55], [(lx + rx) / 2, H + 0.3 - reach * 0.04, cz - 0.5], [rx + 0.9, H + 0.4, cz - 0.55]], 0.014, rope);
    } else if (a.span === 'rope') {
      anchor(lx - 0.7, cz); anchor(rx + 0.7, cz);
      s.tube([[lx - 0.7, H + 0.38, cz], [(lx + rx) / 2, H + 0.3 - reach * 0.05, cz], [rx + 0.7, H + 0.38, cz]], 0.02, rope);
      for (const x of [lx - 0.7, rx + 0.7]) s.rod([x, H + 0.38, cz], [x + (x < 0 ? -0.7 : 0.7), H, cz - 0.3], 0.012, rope);
    } else if (a.span === 'bridge') {
      const sag = (t: number) => -reach * 0.16 * 4 * t * (1 - t);
      const x0 = lx - 0.35, x1 = rx + 0.35;
      for (const dz of [-0.4, 0.4]) {
        for (const x of [x0 - 0.15, x1 + 0.15]) s.rod([x, H - 0.1, cz + dz], [x, H + 1.0, cz + dz], 0.035, wood);
        const pts: P[] = [], low: P[] = [];
        for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([mix(x0 - 0.15, x1 + 0.15, t), H + 0.95 + sag(t) * 0.8, cz + dz]); low.push([mix(x0, x1, t), H + 0.06 + sag(t), cz + dz * 0.9]); }
        s.tube(pts, 0.016, rope); s.tube(low, 0.016, rope);
      }
      const slats = Math.max(5, Math.round((x1 - x0) / 0.22));
      for (let k = 0; k <= slats; k++) {
        const t = k / slats;
        if (mood.wear > 0.55 && random() < (mood.wear - 0.4) * 0.6) continue; // missing slats on a worn bridge
        s.box([0.16, 0.03, 0.78], [mix(x0, x1, t), H + 0.08 + sag(t), cz], wood).rotation.z = Math.atan2(sag(t + 0.02) - sag(t - 0.02), 0.04 * (x1 - x0));
      }
    } else if (a.span === 'snow') {
      const arch = s.ball([reach / 2 + 0.7, 0.3, 0.75], [(lx + rx) / 2, H - 0.1, cz], snow, 20);
      arch.rotation.y = (random() - 0.5) * 0.3;
      for (let i = 0; i < 5; i++) s.ball([0.2 + random() * 0.2, 0.14, 0.22], [(lx + rx) / 2 + (random() - 0.5) * reach, H + 0.02, cz + (random() - 0.5) * 1.1], snow, 10);
    } else if (a.span === 'fallen') {
      ladder([lx - 0.7, H + 0.06, cz], [Math.min(rx - 0.15, lx + Math.max(0.3, reach * 0.8)), H - Math.max(0.5, reach * 0.75), cz]);
      anchor(rx + 0.8, cz); 
      s.tube([[rx + 0.8, H + 0.4, cz], [rx + 0.2, H + 0.05, cz + 0.1], [rx - 0.05, H - 0.9, cz + 0.1]], 0.014, rope);
    }

    // What was left at the edge (always on the left bank, toward the front).
    const ex = edgeAt(2.0, -1) - 1.0, ez = 2.0;
    if (a.left === 'axe') {
      s.rod([ex, H - 0.1, ez], [ex + 0.08, H + 0.75, ez], 0.018, s.material('#d33a2c'));
      s.box([0.34, 0.035, 0.03], [ex + 0.1, H + 0.75, ez], steel).rotation.z = 0.12;
      for (let turn = 0; turn < 5; turn++) s.ring(0.26, 0.025, [ex - 0.7, H + 0.03 + turn * 0.04, ez - 0.2], rope).rotation.x = Math.PI / 2;
    } else if (a.left === 'pack') {
      s.ball([0.28, 0.4, 0.22], [ex, H + 0.36, ez], s.material('#c8342c'), 14).rotation.z = 0.25;
      s.box([0.34, 0.18, 0.12], [ex + 0.03, H + 0.25, ez + 0.2], s.material('#8a241f'));
      s.cylinder(0.08, 0.08, 0.5, [ex + 0.05, H + 0.78, ez], s.material('#3d6f8e'), 10).rotation.z = Math.PI / 2 + 0.25;
    } else if (a.left === 'wands') {
      for (let i = 0; i < 7; i++) {
        const z = -Z + 0.5 + i * (Z * 2 - 1) / 6, x = edgeAt(z, -1) - 0.55, lean = (random() - 0.5) * 0.25;
        s.rod([x, H - 0.1, z], [x + lean, H + 1.1, z], 0.012, dark);
        s.box([0.3, 0.2, 0.012], [x + lean + 0.15, H + 0.98, z], s.material('#f0331e', { emissive: '#f0331e', emissiveIntensity: 0.3 })).rotation.y = (random() - 0.5) * 0.8;
      }
    } else if (a.left === 'tracks') {
      const print = s.material('#9db9c9', { roughness: 1 });
      const stop = edgeAt(ez - 0.6, -1) - 0.25;
      for (let i = 0; i < 9; i++) s.box([0.3, 0.012, 0.13], [stop - i * 0.34, H + 0.004, ez - 0.6 + (i % 2 ? 0.14 : -0.14) + i * 0.05], print).rotation.y = -0.15;
      s.ball([0.1, 0.045, 0.14], [stop - 0.3, H + 0.04, ez - 0.05], s.material('#e23b3b'), 10).rotation.y = 0.8;
    } else if (a.left === 'descent') {
      const lip = edgeAt(ez - 0.4, -1);
      anchor(lip - 0.9, ez - 0.4); anchor(lip - 1.1, ez - 0.1);
      s.tube([[lip - 0.9, H + 0.4, ez - 0.4], [lip - 0.3, H + 0.06, ez - 0.4], [lip + 0.03, H - 0.02, ez - 0.4], [lip + 0.1, H * 0.5, ez - 0.4], [lip + 0.12, 0.1, ez - 0.4]], 0.018, rope);
      s.rod([lip - 1.1, H + 0.4, ez - 0.1], [lip - 0.9, H + 0.4, ez - 0.4], 0.012, rope);
    }

    const base = (floor as THREE.MeshStandardMaterial).emissiveIntensity;
    const rate = mix(0.4, 2.6, mood.energy);
    return s.finish({ update: (_dt, time) => { if (lit) floor.emissiveIntensity = base * (0.85 + 0.15 * Math.sin(time * rate)); } });
  },
});
