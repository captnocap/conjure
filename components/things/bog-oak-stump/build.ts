import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

/** A gnarled limb that tapers along a curve; UVs run along its length so grain follows the wood. */
function limb(points: THREE.Vector3[], r0: number, r1: number, phase: number, radial = 7) {
  const curve = new THREE.CatmullRomCurve3(points);
  const segs = Math.max(8, points.length * 5);
  const frames = curve.computeFrenetFrames(segs, false);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const length = curve.getLength();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, c = curve.getPointAt(t), r = mix(r0, r1, t ** 0.75);
    const n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const k = r * (1 + 0.22 * Math.sin(a * 3 + i * 0.7 + phase) + 0.1 * Math.sin(a * 2 - i * 1.3 + phase * 2));
      const cs = Math.cos(a + t * 1.5) * k, sn = Math.sin(a + t * 1.5) * k;
      pos.push(c.x + n.x * cs + b.x * sn, c.y + n.y * cs + b.y * sn, c.z + n.z * cs + b.z * sn);
      uv.push((j / radial) * 2, (t * length) / 0.8);
    }
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < radial; j++) {
      const p = i * (radial + 1) + j, q = p + radial + 1;
      idx.push(p, q, p + 1, p + 1, q, q + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const TIMBER = {
  oak: 'Bog oak: jet black with a blue sheen, silvered only on the high edges.',
  pine: 'Bog pine, called bog deal: fox red and resinous, greying where the wind gets at it.',
  yew: 'Bog yew: deep amber and chestnut, twisted like rope.',
  silver: 'Bleached bone-silver all over, decades in the open air, cracked like driftwood.',
} as const;

export default defineThing({
  questions: {
    form: choice('What shape has the old tree come out of the bog in?', {
      stump: 'A short broken trunk standing on a spider of splayed roots.',
      upturned: 'Tipped on its side, the root plate standing up like a wheel or a crown.',
      snag: 'A tall jagged spire with a few clawed roots at its foot.',
      log: 'A long fallen trunk with the root flare still on one end.',
      antlers: 'No trunk left: only a low tangle of roots like interlocked antlers.',
    }),
    timber: choice('What wood is it, and what colour has the bog made it?', TIMBER),
    size: score('How big is it?', ['Knee high, liftable by two people', 'Chest high', 'Taller than a person, a monument']),
    spread: score('How far do the roots reach?', ['A tight clenched claw', 'An even star', 'A wide sprawling spider']),
    top: choice('How does the broken trunk end?', {
      splintered: 'In long sharp splinters, snapped by a storm five thousand years ago.',
      hollow: 'In a rotted hollow ring, open like a chimney.',
      point: 'Worn to a single smooth leaning point.',
    }),
    setting: choice('How does it sit in the ground?', {
      dug: 'Freshly dragged out: wet black peat and clods still clinging to the roots.',
      weathered: 'Long exposed on a heathery hummock, with moss and pale lichen settling on it.',
      pool: 'Standing in a pool of still dark water, roots going down out of sight.',
      heap: 'Hauled to the side of the cutting and left with other lengths of bog timber.',
      bare: 'Clean and alone on bare ground, like a sculpture.',
    }),
    mark: choice('Has anyone left a mark on it?', {
      none: 'Nobody has touched it.',
      sawn: 'The trunk has been cut through with a chainsaw, pale rings showing, a slice lying beside it.',
      rags: 'Strips of coloured cloth are tied to the root tips: a wishing tree.',
      coins: 'Coins have been hammered edge-on into the trunk for luck.',
      raven: 'A raven is perched on its highest point.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => lo + (hi - lo) * random();
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

    // Grain texture: dark heartwood with silver weathering streaks and black checks.
    const weathering = Math.min(1, mix(0.15, 0.6, mood.wear) + (a.setting === 'weathered' ? 0.25 : 0) - (a.setting === 'dug' ? 0.15 : 0));
    const dark = new THREE.Color({ oak: '#24211f', pine: '#7a4326', yew: '#6e431f', silver: '#8f9390' }[a.timber]);
    dark.lerp(new THREE.Color('#a05a2a'), (mood.warmth - 0.5) * 0.12 + 0.02);
    const pale = new THREE.Color(a.timber === 'silver' ? '#d5d6cf' : '#aeb1ab');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const g = canvas.getContext('2d')!;
    g.fillStyle = `#${dark.getHexString()}`;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) {
      const silver = random() < weathering * 0.9 + 0.12;
      const c = silver ? pale : dark.clone().multiplyScalar(rr(0.2, 0.7));
      g.fillStyle = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${silver ? rr(0.15, 0.6) : rr(0.4, 0.9)})`;
      g.fillRect(rr(0, 256), rr(-40, 256), rr(1, silver ? 7 : 3), rr(30, 200));
    }
    const grain = new THREE.CanvasTexture(canvas);
    grain.colorSpace = THREE.SRGBColorSpace;
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    const wood = new THREE.MeshStandardMaterial({ map: grain, roughness: a.setting === 'dug' ? 0.45 : 0.8, flatShading: false });
    const tree = new THREE.Group();
    s.root.add(tree);
    const addLimb = (pts: THREE.Vector3[], r0: number, r1: number) => {
      const m = new THREE.Mesh(limb(pts, r0, r1, random() * 6), wood);
      m.castShadow = m.receiveShadow = true;
      tree.add(m);
      return m;
    };

    const scale = mix(0.55, 1.9, a.size);
    const form = a.form;
    const R = { stump: 0.3, upturned: 0.27, snag: 0.24, log: 0.3, antlers: 0.2 }[form];
    const fallen = form === 'upturned' || form === 'log';
    const H = { stump: rr(0.85, 1.15), upturned: rr(1.1, 1.5), snag: rr(2.0, 2.5), log: rr(2.6, 3.2), antlers: 0.28 }[form];
    const lift = { stump: 0.32, upturned: 0.1, snag: 0.2, log: 0.1, antlers: 0.22 }[form];
    const lean = fallen ? V(0, 0, 0) : V(rr(-0.18, 0.18), 0, rr(-0.18, 0.18));

    // Trunk: stacked rings with fluted bark-less ridges and a broken crown.
    const cols = 18, rings = 10;
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    const crown = Array.from({ length: cols + 1 }, () => random());
    crown[cols] = crown[0];
    const spike = Math.floor(random() * cols);
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      for (let j = 0; j <= cols; j++) {
        const ang = (j / cols) * Math.PI * 2;
        let r = R * (1 + (fallen ? 0.3 : 0.55) * (1 - t) ** 3) * (1 - 0.3 * t) * (1 + 0.16 * Math.sin(ang * 4 + 1.3) + 0.08 * Math.sin(ang * 7 + t * 4));
        let y = lift + t * H * (form === 'antlers' ? 1 : 0.8);
        if (form !== 'antlers' && i >= rings - 2) {
          const k = (i - (rings - 3)) / 2;
          if (a.mark !== 'sawn') {
            if (a.top === 'splintered') { y += k * H * 0.3 * crown[j] ** 2; r *= 1 - 0.25 * k; }
            else if (a.top === 'hollow') { y += k * H * 0.12 * crown[j]; r *= 1 + 0.04 * k; }
            else { const d = Math.cos(ang - (spike / cols) * 6.28); y += k * H * 0.3 * Math.max(0, d); r *= 1 - 0.55 * k; }
          } else if (i === rings) y = lift + H * 0.72;
        }
        pos.push(Math.cos(ang) * r + lean.x * t * H, y, Math.sin(ang) * r + lean.z * t * H);
        uv.push((j / cols) * 4, y / 0.8);
      }
    }
    for (let i = 0; i < rings; i++)
      for (let j = 0; j < cols; j++) {
        const p = i * (cols + 1) + j, q = p + cols + 1;
        idx.push(p, q, p + 1, p + 1, q, q + 1);
      }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    tg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    tg.setIndex(idx);
    tg.computeVertexNormals();
    const trunk = new THREE.Mesh(tg, wood.clone());
    (trunk.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    trunk.castShadow = trunk.receiveShadow = true;
    tree.add(trunk);
    const topY = lift + H * 0.8, topAt = V(lean.x * H, topY, lean.z * H);
    // Heart of the trunk, so a hollow or a saw cut has something inside it.
    const sawn = a.mark === 'sawn' && form !== 'antlers';
    if (form !== 'antlers') {
      const ringCanvas = document.createElement('canvas');
      ringCanvas.width = ringCanvas.height = 128;
      const rc = ringCanvas.getContext('2d')!;
      const heart = sawn ? new THREE.Color({ oak: '#4a4038', pine: '#c98a4e', yew: '#c07a3a', silver: '#b9b2a2' }[a.timber]) : dark.clone().multiplyScalar(0.35);
      rc.fillStyle = `#${heart.getHexString()}`;
      rc.fillRect(0, 0, 128, 128);
      rc.strokeStyle = sawn ? 'rgba(20,14,10,0.55)' : 'rgba(0,0,0,0.5)';
      for (let r = 4; r < 64; r += rr(2, 5)) { rc.lineWidth = rr(0.5, 1.6); rc.beginPath(); rc.arc(64 + rr(-1, 1), 64, r, 0, 6.3); rc.stroke(); }
      const ringTex = new THREE.CanvasTexture(ringCanvas);
      ringTex.colorSpace = THREE.SRGBColorSpace;
      const cut = new THREE.MeshStandardMaterial({ map: ringTex, roughness: 0.7 });
      const depth = sawn ? 0.72 : a.top === 'hollow' ? 0.5 : 0.78;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(R * 0.78, 18), cut);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(lean.x * H * depth * 1.1, lift + H * depth - 0.004, lean.z * H * depth * 1.1);
      disc.castShadow = true;
      tree.add(disc);
      if (sawn) {
        const slice = s.cylinder(R * 0.74, R * 0.78, 0.09, [0, 0, 0], [wood, cut, cut] as unknown as THREE.Material, 18);
        slice.userData.slice = true;
      }
    }

    // Roots.
    const count = Math.round({ stump: rr(6, 9), upturned: rr(8, 11), snag: rr(3, 5), log: rr(5, 7), antlers: rr(7, 10) }[form]);
    const reach = mix(0.55, 1.5, a.spread) * (form === 'snag' ? 0.75 : 1);
    const tips: THREE.Vector3[] = [];
    let highest = topAt.clone();
    const start = random() * 6.28;
    for (let i = 0; i < count; i++) {
      const ang = start + (i / count) * Math.PI * 2 + rr(-0.25, 0.25);
      const d = V(Math.cos(ang), 0, Math.sin(ang)), side = V(-d.z, 0, d.x);
      const len = reach * rr(0.65, 1.15);
      const r0 = R * rr(0.34, 0.52);
      const pts: THREE.Vector3[] = [d.clone().multiplyScalar(R * 0.55).setY(lift + (fallen ? 0.12 : rr(0.05, 0.3)))];
      const flat = fallen;
      const up = form === 'antlers' ? rr(0.25, 0.9) : 0;
      const bend = rr(-0.3, 0.3);
      for (let k = 1; k <= 4; k++) {
        const t = k / 4;
        const out = R * 0.6 + len * t;
        let y: number;
        if (flat) y = lift + 0.1 - t * len * rr(0.05, 0.35);
        else if (form === 'antlers') y = lift + Math.sin(t * 2.6) * up * len + 0.06;
        else y = lift + Math.sin(t * Math.PI) * len * rr(0.1, 0.32) + (1 - t) * 0.2 - t * (lift + 0.04) + (k === 4 ? rr(0, 0.12) * a.spread : 0);
        pts.push(d.clone().multiplyScalar(out).addScaledVector(side, bend * len * t * t + rr(-0.06, 0.06)).setY(fallen ? y : Math.max(y, 0.02)));
      }
      addLimb(pts, r0, r0 * rr(0.12, 0.25));
      tips.push(pts[4].clone());
      if (pts.some((p) => p.y > highest.y)) highest = pts.reduce((m, p) => (p.y > m.y ? p : m), highest).clone();
      // Forks.
      const forks = form === 'antlers' ? 2 : random() < 0.7 ? 1 : 0;
      for (let f = 0; f < forks; f++) {
        const from = pts[1 + Math.floor(random() * 3)];
        const dir = d.clone().addScaledVector(side, rr(0.5, 1.1) * (random() < 0.5 ? -1 : 1)).normalize();
        const fl = len * rr(0.3, 0.55);
        const rise = form === 'antlers' ? rr(0.2, 0.7) : rr(-0.25, 0.25);
        const end = from.clone().addScaledVector(dir, fl).setY(fallen ? from.y + rise * fl : Math.max(0.03, from.y + rise * fl));
        const mid = from.clone().lerp(end, 0.5).add(V(0, rr(0.02, 0.12), 0));
        addLimb([from.clone(), mid, end], r0 * 0.5, r0 * 0.1);
        tips.push(end.clone());
        if (end.y > highest.y) highest = end.clone();
      }
    }

    // Turn the whole tree for the fallen forms.
    if (form === 'upturned') { tree.rotation.z = Math.PI / 2 - rr(0.12, 0.3); tree.rotation.y = rr(-0.5, 0.5); }
    if (form === 'log') { tree.rotation.z = Math.PI / 2 + rr(0.0, 0.05); tree.rotation.y = rr(-0.4, 0.4); }
    tree.scale.setScalar(scale);
    tree.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(tree);
    const sink = form === 'log' ? Math.max(0, reach * 0.8 - R * 0.9) * scale : form === 'upturned' ? reach * scale * 0.3 : 0;
    tree.position.y -= box.min.y + sink;
    tree.position.x -= (box.min.x + box.max.x) / 2;
    tree.position.z -= (box.min.z + box.max.z) / 2;
    tree.updateMatrixWorld(true);
    box.setFromObject(tree);
    const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
    const sx = Math.max(0.4, (box.max.x - box.min.x) / 2), sz = Math.max(0.4, (box.max.z - box.min.z) / 2);
    const world = (p: THREE.Vector3) => tree.localToWorld(p.clone());

    // Setting.
    const peat = s.material('#30251e', { roughness: a.setting === 'dug' ? 0.65 : 1 });
    if (a.setting === 'dug') {
      const mound = s.ball([sx * 0.95, 0.1, sz * 0.95], [0, 0, 0], peat, 16);
      mound.scale.y = Math.max(0.08, 0.1 * scale);
      for (let i = 0; i < 16; i++) {
        const th = random() * 6.28, d = rr(0.3, 0.95);
        const clod = s.mesh(new THREE.DodecahedronGeometry(rr(0.05, 0.14) * scale, 0), peat, [Math.cos(th) * d * sx, rr(0.03, 0.08), Math.sin(th) * d * sz]);
        clod.rotation.set(rr(0, 3), rr(0, 3), 0);
      }
      for (const tip of tips) { const w = world(tip); if (w.y > -0.05 && w.y < 0.2) s.ball([0.1 * scale, 0.06 * scale, 0.1 * scale], [w.x, 0.03, w.z], peat, 8); }
    } else if (a.setting === 'weathered') {
      const heath = new THREE.Color('#4f4a2c').lerp(new THREE.Color('#5e3a4a'), mood.cheer * 0.5);
      const hum = s.ball([sx * 0.95, 0.2 * scale, sz * 0.95], [0, 0, 0], new THREE.MeshStandardMaterial({ color: heath, roughness: 1 }), 16);
      hum.scale.y = Math.max(0.1, 0.14 * scale);
      const tuft = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
      const palette = ['#5e4229', '#5c2f3c', '#4c5527', '#73582f', '#6d7a35'];
      s.scatter(new THREE.IcosahedronGeometry(1, 0), tuft, Array.from({ length: Math.round(mix(18, 40, mood.density)) }, () => {
        const th = random() * 6.28, d = rr(0.55, 0.98);
        return { at: [Math.cos(th) * d * sx, rr(0.03, 0.08), Math.sin(th) * d * sz] as const, size: rr(0.07, 0.15) * Math.sqrt(scale), color: palette[Math.floor(random() * palette.length)] };
      }));
      // Moss and lichen on the upper surfaces.
      const moss = s.material('#6c7d34', { roughness: 1 });
      const lichen = s.material('#c9d0bd', { roughness: 1 });
      for (const tip of tips) {
        if (random() < 0.5) continue;
        const w = world(tip.clone().multiplyScalar(rr(0.5, 0.8)));
        if (w.y < 0.1) continue;
        s.ball([0.07 * scale, 0.03 * scale, 0.06 * scale], [w.x, w.y + 0.05 * scale, w.z], random() < 0.5 ? moss : lichen, 8);
      }
    } else if (a.setting === 'pool') {
      const water = s.cylinder(1, 1, 0.03, [0, 0.015, 0], new THREE.MeshStandardMaterial({ color: '#10161a', roughness: 0.06, metalness: 0.5 }), 36);
      water.castShadow = false;
      water.scale.set(sx * 1.05, 1, sz * 1.05);
      const rim = s.ring(1, 0.05, [0, 0.02, 0], s.material('#3b3523', { roughness: 1 }));
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(sx * 1.05, sz * 1.05, 1);
      const blade = new THREE.ConeGeometry(0.012, 0.5, 4);
      blade.translate(0, 0.25, 0);
      s.scatter(blade, s.material('#687436'), Array.from({ length: 40 }, () => { const th = random() * 6.28; return { at: [Math.cos(th) * sx * 1.05, 0.02, Math.sin(th) * sz * 1.05] as const, size: rr(0.6, 1.3) }; }));
    } else if (a.setting === 'heap') {
      for (let i = 0; i < 4; i++) {
        const len = rr(0.9, 1.8) * scale, x = rr(-0.3, 0.3) * sx;
        const z = -sz * 0.8 - i * 0.14 * scale;
        const m = new THREE.Mesh(limb([V(x - len / 2, 0.1 * scale + (i % 2) * 0.12 * scale, z + rr(-0.1, 0.1)), V(x, 0.12 * scale + (i % 2) * 0.14 * scale, z), V(x + len / 2, 0.1 * scale + (i % 2) * 0.1 * scale, z + rr(-0.1, 0.1))], 0.1 * scale, 0.05 * scale, random() * 6), wood);
        m.castShadow = true;
        s.root.add(m);
      }
      const pad = s.cylinder(1, 1.04, 0.04, [0, 0.02, -sz * 0.1], peat, 20);
      pad.scale.set(sx * 1.02, 1, sz * 1.05);
    }

    // Marks.
    s.root.traverse((node) => {
      if (!node.userData.slice) return;
      node.position.set(sx * 0.7, 0.06 * scale, sz * 0.6);
      node.rotation.set(rr(-0.15, 0.15), rr(0, 3), rr(-0.1, 0.1));
      node.scale.setScalar(scale);
    });
    if (a.mark === 'rags') {
      const colours = mood.cheer > 0.4 ? ['#c6402f', '#e9e2cf', '#3a66a8', '#e0b23a', '#7c4a8c'] : ['#8a3a30', '#b9b3a2', '#4a5a70', '#6f6a5c'];
      for (const tip of tips) {
        if (random() < 0.25) continue;
        const w = world(tip);
        if (w.y < 0.15 * scale && form !== 'upturned') w.y += 0.1;
        const len = rr(0.16, 0.4) * Math.sqrt(scale);
        const rag = s.box([0.035 * scale + 0.02, len, 0.006], [w.x, w.y - len / 2, w.z], s.material(colours[Math.floor(random() * colours.length)], { roughness: 1, side: THREE.DoubleSide }));
        rag.rotation.set(rr(-0.2, 0.2), rr(0, 3), mix(0.05, 0.6, mood.energy) * rr(0.6, 1.2));
        rag.userData.rag = rr(0, 6);
      }
    } else if (a.mark === 'coins' && form !== 'antlers') {
      const metals = ['#c9a646', '#b9bcc0', '#a8683c'];
      const coins = Array.from({ length: 38 }, () => {
        const t = rr(0.12, 0.6), ang = random() * 6.28, r = R * (1 + 0.55 * (1 - t) ** 3) * (1 - 0.3 * t) * 1.08;
        const w = world(V(Math.cos(ang) * r + lean.x * t * H, lift + t * H * 0.8, Math.sin(ang) * r + lean.z * t * H));
        return { at: [w.x, w.y, w.z] as const, size: rr(0.8, 1.3) * Math.sqrt(scale), color: metals[Math.floor(random() * 3)] };
      });
      s.scatter(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.3 }), coins);
    } else if (a.mark === 'raven') {
      const w = world(highest);
      const bird = new THREE.Group();
      const black = new THREE.MeshStandardMaterial({ color: '#15161b', roughness: 0.35 });
      const part = (geometry: THREE.BufferGeometry, sx: number, sy: number, sz: number, x: number, y: number, z: number, rx = 0) => {
        const m = new THREE.Mesh(geometry, black);
        m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; bird.add(m);
      };
      part(new THREE.SphereGeometry(1, 12, 8), 0.085, 0.1, 0.17, 0, 0.15, 0, -0.5);
      part(new THREE.SphereGeometry(1, 10, 8), 0.06, 0.06, 0.065, 0, 0.28, 0.12);
      part(new THREE.ConeGeometry(1, 1, 6), 0.025, 0.11, 0.03, 0, 0.275, 0.22, Math.PI / 2 + 0.15);
      part(new THREE.BoxGeometry(1, 1, 1), 0.09, 0.015, 0.2, 0, 0.06, -0.2, 0.5);
      part(new THREE.CylinderGeometry(1, 1, 1, 5), 0.008, 0.1, 0.008, -0.03, 0.03, 0.02);
      part(new THREE.CylinderGeometry(1, 1, 1, 5), 0.008, 0.1, 0.008, 0.03, 0.03, 0.02);
      bird.position.set(w.x, w.y - 0.03, w.z);
      bird.rotation.y = rr(-1.2, 1.2);
      bird.scale.setScalar(1.05);
      s.root.add(bird);
    }

    const rags: THREE.Object3D[] = [];
    s.root.traverse((n) => { if (n.userData.rag !== undefined) rags.push(n); });
    const sway = mix(0.03, 0.35, mood.energy);
    const rest = rags.map((r) => r.rotation.z);
    return s.finish({
      footprint: Math.max(0.4, span * 0.8),
      update: rags.length ? (_dt, time) => rags.forEach((r, i) => { r.rotation.z = rest[i] + Math.sin(time * 3 + r.userData.rag) * sway; }) : undefined,
    });
  },
});
