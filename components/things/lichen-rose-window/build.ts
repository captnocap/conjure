import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type P3, cluster, mottle, mushroom, paint, put } from './fungi';

const IMAGES = {
  rose: 'A red rose, petal within petal, in crimson and green glass.',
  sun: 'A golden sun with a calm face and pointed rays, on blue.',
  eye: 'A single open eye in teal and violet, watching.',
  stars: 'A night sky: a crescent moon and stars in deep blue.',
  mushroom: 'A red-capped mushroom, as if the glaziers knew what was coming.',
  lost: 'Nothing: the centre has fallen out and only the surrounding colours remain.',
} as const;
const PALETTE: Record<keyof typeof IMAGES, string[]> = {
  rose: ['#d4213a', '#f06a8a', '#2f9a4a', '#f3d9a0', '#8a1230'],
  sun: ['#f6b81e', '#2a5fd0', '#f08a1a', '#fbe9a0', '#1f3f9a'],
  eye: ['#18a8a0', '#7a3fd0', '#e8f0f0', '#1f6f9a', '#c03fa0'],
  stars: ['#1f3fb0', '#3a1f8a', '#f2c83a', '#2a7fd0', '#12205a'],
  mushroom: ['#d8301f', '#f4ead0', '#3f9a3a', '#f09a2a', '#7a4a2a'],
  lost: ['#c8402a', '#2a6fc0', '#e8b82a', '#3f9a5a', '#8a3fa8'],
};
const LICHEN: Record<string, { pane: string; spots: string[]; crust: string; glow: number }> = {
  gold: { pane: '#e0b63a', spots: ['#f0d05a', '#c8862a', '#f6e69a'], crust: '#e2a82e', glow: 0.12 },
  leaf: { pane: '#a9b99a', spots: ['#c4d2b4', '#7f9478', '#dde6d0'], crust: '#9fb08e', glow: 0.1 },
  beard: { pane: '#c9d1a8', spots: ['#e2e8c8', '#a3b084', '#f0f2dc'], crust: '#b9c49a', glow: 0.1 },
  ghost: { pane: '#8fe8d0', spots: ['#c4fff0', '#5fd0b8', '#e6fff8'], crust: '#7fe0c8', glow: 0.75 },
};

function leading(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(0,0,0,${random() * 0.22})`;
    ctx.beginPath();
    ctx.arc(random() * 256, random() * 256, 8 + random() * 26, 0, 6.3);
    ctx.fill();
  }
  ctx.strokeStyle = '#1c1a18';
  ctx.lineWidth = 5;
  for (let i = -8; i <= 16; i++) {
    ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32 + 256, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32 - 256, 256); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function motif(image: keyof typeof IMAGES, colours: string[]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const disc = (x: number, y: number, r: number, fill: string) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill(); };
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#1c1a18';
  ctx.lineJoin = 'round';
  const outline = () => ctx.stroke();
  if (image === 'rose') {
    ctx.fillStyle = colours[2]; ctx.fillRect(0, 0, 256, 256);
    for (let ring = 3; ring >= 0; ring--)
      for (let i = 0; i < 5; i++) {
        const angle = i * 1.2566 + ring * 0.6, reach = ring * 26;
        disc(128 + Math.cos(angle) * reach, 128 + Math.sin(angle) * reach, 44 - ring * 3, ring % 2 ? colours[0] : colours[1]);
        outline();
      }
    disc(128, 128, 14, colours[4]);
  } else if (image === 'sun') {
    ctx.fillStyle = colours[1]; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = colours[2];
    for (let i = 0; i < 12; i++) {
      const angle = i * 0.5236;
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(angle - 0.2) * 60, 128 + Math.sin(angle - 0.2) * 60);
      ctx.lineTo(128 + Math.cos(angle) * 124, 128 + Math.sin(angle) * 124);
      ctx.lineTo(128 + Math.cos(angle + 0.2) * 60, 128 + Math.sin(angle + 0.2) * 60);
      ctx.fill(); outline();
    }
    disc(128, 128, 66, colours[0]); outline();
    disc(104, 114, 8, '#1c1a18'); disc(152, 114, 8, '#1c1a18');
    ctx.beginPath(); ctx.arc(128, 132, 30, 0.5, 2.64); ctx.stroke();
  } else if (image === 'eye') {
    ctx.fillStyle = colours[1]; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = colours[2];
    ctx.beginPath(); ctx.moveTo(14, 128); ctx.quadraticCurveTo(128, 10, 242, 128); ctx.quadraticCurveTo(128, 246, 14, 128); ctx.fill(); outline();
    disc(128, 128, 52, colours[0]); outline();
    disc(128, 128, 24, '#141218');
    disc(114, 114, 8, '#ffffff');
  } else if (image === 'stars') {
    ctx.fillStyle = colours[4]; ctx.fillRect(0, 0, 256, 256);
    disc(128, 128, 110, colours[0]);
    disc(110, 124, 62, colours[2]);
    disc(136, 110, 56, colours[0]);
    for (const [x, y, r] of [[180, 170, 13], [70, 200, 9], [196, 80, 9], [150, 214, 7], [58, 60, 8], [210, 130, 6]]) disc(x, y, r, colours[2]);
  } else if (image === 'mushroom') {
    ctx.fillStyle = colours[2]; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = colours[1];
    ctx.fillRect(104, 120, 48, 110); ctx.strokeRect(104, 120, 48, 110);
    ctx.fillStyle = colours[0];
    ctx.beginPath(); ctx.moveTo(18, 138); ctx.quadraticCurveTo(128, -50, 238, 138); ctx.closePath(); ctx.fill(); outline();
    for (const [x, y, r] of [[92, 84, 14], [150, 64, 16], [182, 110, 11], [126, 112, 9], [60, 118, 9]]) disc(x, y, r, colours[1]);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    image: choice('What image survives at the heart of the window?', IMAGES),
    glass: score('How much of the coloured glass is left?', ['None, every pane is gone or grown over', 'A few bright panes', 'About half', 'Nearly all of it, blazing']),
    tracery: choice('What pattern does the stone tracery make?', {
      wheel: 'A wheel: eight stout straight spokes like little columns.',
      petal: 'A daisy: twelve thin spokes each ending in a round loop.',
      flame: 'Flamboyant: ten curving, flame-like bars that swirl.',
      foils: 'Six big circles ringed around the centre.',
    }),
    remains: choice('How much of the circle still stands?', {
      whole: 'The whole circle, complete.',
      crown: 'Most of it: the top has fallen away.',
      half: 'About half, one side rising like a horn.',
      crescent: 'Only a low crescent of the bottom with stumps of tracery.',
    }),
    support: choice('What holds it upright?', {
      wall: 'A ragged gable of masonry still around it.',
      props: 'A stone sill and two old timber props leaning against the back.',
      rubble: 'Nothing: it leans back, half buried in a heap of its own rubble.',
      stalks: 'Thick pale fungal stalks that have grown up and lifted it off the ground.',
    }),
    lichen: choice('What kind of lichen fills the empty panes?', {
      gold: 'Crusty golden-orange sunburst lichen.',
      leaf: 'Leafy grey-green lichen, soft and layered.',
      beard: 'Pale beard lichen hanging in long strands from the bars.',
      ghost: 'A thin blue-green film that glows faintly by itself.',
    }),
    light: noul('Does coloured light still fall through it onto the ground?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 1.7, HUB = 0.5, RIM = 0.15;
    const colours = PALETTE[a.image];
    const lichen = LICHEN[a.lichen];
    const level = mix(0.55, 1.05, mood.cheer) * mix(1.15, 0.85, Math.sin(mood.daylight * Math.PI));
    const stoneTex = mottle(random, '#b7b1a1', ['#8f9a78', '#d0cab9', '#7e7b70', lichen.crust], Math.round(mix(60, 240, mood.wear)));
    const stone = paint('#ffffff', { map: stoneTex, roughness: 0.95 });

    // ---- how much of the circle survives: an arc centred near the bottom
    const sign = random() < 0.5 ? -1 : 1;
    const [arc, shift] = {
      whole: [Math.PI * 2, 0],
      crown: [Math.PI * mix(1.3, 1.55, random()), sign * random() * 0.3],
      half: [Math.PI * mix(1.08, 1.25, random()), sign * mix(0.5, 0.8, random())],
      crescent: [Math.PI * mix(0.68, 0.85, random()), sign * random() * 0.25],
    }[a.remains];
    const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
    const stands = (angle: number, margin = 0) => arc >= Math.PI * 2 - 0.01 || Math.abs(wrapAngle(angle - shift)) <= arc / 2 + margin;
    /** A point in the window plane: angle measured from straight down, turning toward +x. */
    const at = (angle: number, reach: number, z = 0): P3 => [Math.sin(angle) * reach, -Math.cos(angle) * reach, z];

    const centreY = a.support === 'stalks' ? R + 0.95 : a.support === 'rubble' ? R - 0.2 : R + 0.5;
    const win = new THREE.Group();
    put(s.root, win, [0, centreY, 0]);
    if (a.support === 'rubble') win.rotation.set(-0.24, 0, sign * 0.07);

    // ---- stone ring and hub
    const ringProfile = [[R - RIM, -0.24], [R + RIM, -0.24], [R + RIM, 0.24], [R - RIM + 0.05, 0.24], [R - RIM, 0.17], [R - RIM, -0.24]].map(([x, y]) => new THREE.Vector2(x, y));
    const ring = put(win, new THREE.Mesh(new THREE.LatheGeometry(ringProfile, 56, shift - arc / 2, arc), stone));
    ring.rotation.x = Math.PI / 2;
    if (arc < 6.2)
      for (const end of [shift - arc / 2, shift + arc / 2]) put(win, new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), stone), at(end, R)).rotation.set(random() * 3, random() * 3, 0);
    const hasHub = a.image !== 'lost';
    put(win, new THREE.Mesh(new THREE.TorusGeometry(HUB, 0.07, 8, 32), stone));

    // ---- tracery
    const count = { wheel: 8, petal: 12, flame: 10, foils: 6 }[a.tracery];
    const step = (Math.PI * 2) / count;
    const bar = (from: P3, to: P3, radius: number) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to);
      const mesh = put(win, new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, p.distanceTo(q), 8), stone));
      mesh.position.copy(p).add(q).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize());
    };
    const loopR = a.tracery === 'petal' ? 0.25 : 0.5;
    const loopAt = R - RIM - loopR + 0.02;
    for (let i = 0; i < count; i++) {
      const angle = i * step;
      const whole = stands(angle);
      // a bar that has lost its outer end is left as a stump on the hub
      const stump = !whole ? mix(0.25, 0.6, random()) : 1;
      if (!whole && random() < 0.35) continue;
      if (a.tracery === 'wheel') {
        bar(at(angle, HUB), at(angle, HUB + (R - RIM - HUB) * stump), 0.075);
        put(win, new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), stone), at(angle, HUB + 0.12));
        if (whole) put(win, new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), stone), at(angle, R - RIM - 0.12));
      } else if (a.tracery === 'petal') {
        bar(at(angle, HUB), at(angle, HUB + (loopAt - loopR - HUB) * stump), 0.045);
        if (whole) put(win, new THREE.Mesh(new THREE.TorusGeometry(loopR, 0.04, 6, 24), stone), at(angle, loopAt));
      } else if (a.tracery === 'flame') {
        const points = [0, 0.33, 0.66, 1].filter((t) => t <= stump + 0.01).map((t) => new THREE.Vector3(...at(angle + Math.sin(t * Math.PI) * 0.26 + t * 0.12, mix(HUB, R - RIM, t))));
        if (points.length > 1) put(win, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 14, 0.05, 6), stone));
      } else if (whole) {
        put(win, new THREE.Mesh(new THREE.TorusGeometry(loopR, 0.06, 6, 28), stone), at(angle + step / 2, loopAt));
        put(win, new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), stone), at(angle, R - RIM - 0.1));
      }
    }

    // ---- panes: glass, lichen or nothing
    const lead = leading(random);
    const glassMats = colours.map((colour) => new THREE.MeshStandardMaterial({ color: colour, map: lead, emissive: colour, emissiveMap: lead, emissiveIntensity: level, roughness: 0.25, side: THREE.DoubleSide, transparent: true, opacity: 0.94 }));
    const lichenTex = mottle(random, lichen.pane, lichen.spots, 200);
    const lichenMat = new THREE.MeshStandardMaterial({ map: lichenTex, emissive: lichen.pane, emissiveMap: lichenTex, emissiveIntensity: lichen.glow * mix(0.7, 1.4, mood.cheer), roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.93 });
    const lit: { x: number; y: number; colour: string }[] = [];
    const bearded: P3[] = [];
    const skew = a.tracery === 'flame' ? 0.19 : 0;
    const offset = a.tracery === 'foils' ? 0 : 0;
    for (let i = 0; i < count; i++) {
      const from = i * step + offset, mid = from + step / 2;
      if (!stands(mid + skew, -step * 0.3)) continue;
      const roll = random();
      const state = roll < a.glass * 0.92 ? 'glass' : random() < mix(0.9, 0.6, mood.wear * (1 - mood.density)) ? 'lichen' : 'gap';
      if (state === 'gap') continue;
      const colour = (i * 2 + Math.floor(random() * 2)) % colours.length;
      const material = state === 'glass' ? glassMats[colour] : lichenMat;
      // RingGeometry measures from +x, anticlockwise; the window measures from straight down toward +x.
      const sector = put(win, new THREE.Mesh(new THREE.RingGeometry(HUB, R - RIM + 0.02, 14, 1, from - Math.PI / 2 + 0.02 + skew, step - 0.04), material), [0, 0, state === 'glass' ? 0 : 0.02]);
      sector.castShadow = false;
      if (state === 'glass') lit.push({ x: Math.sin(mid) * R * 0.62, y: -Math.cos(mid) * R * 0.62, colour: colours[colour] });
      else bearded.push(at(mid, R * mix(0.5, 0.85, random()), 0.05));
      if (a.tracery === 'petal' || a.tracery === 'foils') {
        const angle = a.tracery === 'petal' ? from : mid;
        if (stands(angle)) put(win, new THREE.Mesh(new THREE.CircleGeometry(loopR, 20), state === 'glass' ? glassMats[(colour + 2) % colours.length] : lichenMat), at(angle, loopAt, 0.03)).castShadow = false;
      }
    }
    // the heart of the window
    let heart: THREE.MeshStandardMaterial | null = null;
    if (hasHub) {
      const picture = motif(a.image, colours);
      heart = new THREE.MeshStandardMaterial({ map: picture, emissive: '#ffffff', emissiveMap: picture, emissiveIntensity: level * 0.9, roughness: 0.3, side: THREE.DoubleSide });
      put(win, new THREE.Mesh(new THREE.CircleGeometry(HUB, 28), heart), [0, 0, 0.01]);
      lit.push({ x: 0, y: 0, colour: colours[0] });
    }

    // ---- lichen on the stone, and beards from the bars
    const crusts = Math.round(mix(10, 60, (mood.wear + mood.density) / 2));
    cluster(win, new THREE.IcosahedronGeometry(1, 1), paint('#ffffff', { roughness: 1, emissive: lichen.crust, emissiveIntensity: lichen.glow * 0.5 }), Array.from({ length: crusts }, () => {
      let angle = shift + (random() - 0.5) * arc;
      if (arc > 6.2) angle = random() * Math.PI * 2;
      const size = 0.05 + random() * 0.11;
      return { at: at(angle, R + (random() - 0.5) * RIM * 1.6, 0.24), size: [size, size * (0.6 + random() * 0.6), 0.03] as P3, color: random() < 0.75 ? lichen.crust : lichen.spots[0] };
    }));
    if (a.lichen === 'beard') {
      const beard = paint(lichen.spots[0], { roughness: 1 });
      const roots = [...bearded, ...Array.from({ length: 8 }, () => at(shift + (random() - 0.5) * Math.min(arc, 2.4) + Math.PI, R - RIM, 0.1)).filter((p) => stands(Math.atan2(p[0], -p[1])))];
      for (const root of roots)
        for (let k = 0; k < 3; k++) {
          const x = root[0] + (random() - 0.5) * 0.2, drop = 0.25 + random() * 0.6;
          const p = new THREE.Vector3(x, root[1], root[2] + 0.02), q = new THREE.Vector3(x + (random() - 0.5) * 0.1, root[1] - drop, root[2] + 0.06);
          const mesh = put(win, new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.016, drop, 5), beard));
          mesh.position.copy(p).add(q).multiplyScalar(0.5);
          mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().sub(q).normalize());
        }
    }

    // ---- what holds it up
    if (a.support === 'wall') {
      const blocks: { at: P3; size: P3; color: string }[] = [];
      const half = R + 0.85, course = 0.32, wide = 0.62;
      const peak = centreY + R + 0.75;
      for (let row = 0; row * course < peak; row++) {
        const y = row * course + course / 2;
        for (let x = -half + ((row % 2) * wide) / 2; x <= half; x += wide) {
          const dx = x, dy = y - centreY, far = Math.hypot(dx, dy);
          if (far < R + 0.02) continue;
          const angle = Math.atan2(dx, -dy);
          const gable = peak - Math.abs(x) * 0.75 - random() * 0.5;
          const low = y < centreY - R * 0.55 + random() * 0.4;
          if (!(low || (stands(angle, 0.05) && y < gable && far < R + 1.25 + random() * 0.3))) continue;
          if (!low && random() < mood.wear * 0.12) continue;
          const tone = 0.84 + random() * 0.16;
          blocks.push({ at: [x, y, 0], size: [wide - 0.03, course - 0.03, 0.5 + random() * 0.05], color: `rgb(${Math.round(tone * 255)},${Math.round(tone * 250)},${Math.round(tone * 232)})` });
        }
      }
      cluster(s.root, new THREE.BoxGeometry(1, 1, 1), paint('#ffffff', { map: stoneTex, roughness: 0.95 }), blocks);
    } else if (a.support === 'props') {
      s.box([2.3, 0.5, 0.8], [0, 0.25, 0], stone);
      s.box([2.6, 0.12, 0.95], [0, 0.06, 0], stone);
      const timber = s.material('#6a4b34');
      for (const side of [-1, 1]) {
        const top = at(shift + side * Math.min(arc / 2 - 0.25, 1.9), R);
        s.rod([side * 1.2, 0, -1.7], [top[0], top[1] + centreY, -0.25], 0.07, timber);
        s.box([0.5, 0.1, 0.3], [side * 1.2, 0.05, -1.75], timber);
      }
    } else if (a.support === 'rubble') {
      const lumps = Math.round(mix(10, 24, mood.density));
      for (let i = 0; i < lumps; i++) {
        const size = 0.2 + random() * 0.35;
        const lump = s.box([size * 1.5, size, size * 1.1], [(random() - 0.5) * 3.2, size * 0.3, (random() - 0.5) * 1.5 - 0.1], stone);
        lump.rotation.set(random() * 0.6, random() * 3, random() * 0.6);
      }
      s.ball([1.5, 0.3, 0.8], [0, 0, -0.1], paint('#8a8674', { map: stoneTex }), 14);
    } else {
      const pale = paint('#ffffff', { map: mottle(random, '#e9e0c8', ['#cbbf9f', '#f6f1e2', '#b3a780'], 90) });
      const capMat = paint(lichen.crust, { side: THREE.DoubleSide, emissive: lichen.crust, emissiveIntensity: 0.15 + lichen.glow * 0.5 });
      [-0.75, 0.75, 0.05].forEach((angle, index) => {
        const hold = at(shift * 0.5 + angle, R + 0.05);
        const footX = hold[0] * 1.25 + (random() - 0.5) * 0.3, footZ = index === 2 ? -0.8 : (random() - 0.5) * 0.5;
        s.tube([[footX, 0, footZ], [footX * 0.9, (hold[1] + centreY) * 0.55, footZ * 0.6], [hold[0], hold[1] + centreY - 0.1, 0]], 0.16, pale);
        s.lathe([[0.3, 0], [0.2, 0.12], [0.16, 0.3]], pale, [footX, 0, footZ]);
        mushroom(s.root, { at: [hold[0], hold[1] + centreY - 0.2, 0], height: 0.1, cap: 0.42, capHeight: 0.2, stalk: 0.15, shape: 0.6, capMat, gillMat: pale, stalkMat: pale });
      });
      for (let i = 0; i < 6; i++) mushroom(s.root, { at: [(random() - 0.5) * 2.6, 0, (random() - 0.5) * 1.2], height: 0.2 + random() * 0.4, cap: 0.1 + random() * 0.12, lean: [(random() - 0.5) * 0.4, (random() - 0.5) * 0.4], capMat, gillMat: pale, stalkMat: pale });
    }

    // ---- fallen glass and fallen light
    const shards = Math.round(mix(4, 34, (1 - a.glass) * 0.5 + mood.wear * 0.5));
    cluster(s.root, new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.2, emissive: '#ffffff', emissiveIntensity: 0.08 }), Array.from({ length: shards }, () => {
      const size = 0.04 + random() * 0.08;
      return { at: [(random() - 0.5) * 2.6, 0.012, 0.4 + random() * 0.8] as P3, size: [size, 0.012, size * (0.5 + random())] as P3, turn: [0, random() * 6, 0] as P3, color: colours[Math.floor(random() * colours.length)] };
    }));
    const pools: THREE.MeshBasicMaterial[] = [];
    if (a.light) {
      const throwZ = mix(1.1, 0.55, Math.sin(mood.daylight * Math.PI)), slide = (mood.daylight - 0.5) * 1.2;
      for (const pane of lit) {
        const material = new THREE.MeshBasicMaterial({ color: pane.colour, transparent: true, opacity: 0.42, depthWrite: false });
        pools.push(material);
        const height = pane.y + centreY;
        const pool = new THREE.Mesh(new THREE.CircleGeometry(pane.x === 0 && pane.y === 0 ? 0.42 : 0.34, 16), material);
        pool.rotation.x = -Math.PI / 2;
        pool.scale.set(1, 1 + throwZ * 0.5, 1);
        pool.position.set(pane.x * 0.9 + height * slide * 0.25, 0.015, 0.45 + height * throwZ * 0.42);
        pool.renderOrder = 2;
        s.root.add(pool);
      }
    }

    const shimmer = mix(0.02, 0.22, mood.energy), pace = mix(0.4, 2.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        glassMats.forEach((material, index) => { material.emissiveIntensity = level * (1 + shimmer * Math.sin(time * pace + index * 1.7)); });
        if (heart) heart.emissiveIntensity = level * 0.9 * (1 + shimmer * Math.sin(time * pace * 0.7));
        pools.forEach((material, index) => { material.opacity = 0.42 * (1 + shimmer * Math.sin(time * pace + index)); });
      },
    });
  },
});
