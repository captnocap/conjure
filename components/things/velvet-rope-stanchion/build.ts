import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

function sign(lines: readonly string[], width: number, height: number, ink: string, paper: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 384; canvas.height = Math.round((384 * height) / width);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const row = (canvas.height - 40) / Math.max(lines.length, 1);
  lines.forEach((line, i) => { ctx.font = `bold ${Math.min(row * 0.78, 520 / Math.max(line.length, 1))}px serif`; ctx.fillText(line, 192, 20 + row * (i + 0.53), 340); });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  return mesh;
}

const SIGNS = {
  touch: ['DO NOT', 'TOUCH'],
  please: ['PLEASE', 'TOUCH'],
  queue: ['QUEUE', 'HERE'],
  removed: ['EXHIBIT', 'REMOVED'],
  private: ['PRIVATE', 'VIEW'],
  wet: ['WET', 'PAINT'],
  blank: [],
} as const;

export default defineThing({
  questions: {
    state: choice('What state is the rope in?', {
      clipped: 'Clipped at both ends, hanging in a neat, heavy sag.',
      unhooked: 'Unhooked at one end and trailing on the floor: someone has been let through, or let themselves through.',
      toppled: 'One post has been knocked over and lies on the floor, dragging the rope down with it.',
      taut: 'Pulled officiously tight, barely sagging at all.',
      knotted: 'Too long for the gap, so it has been looped twice round one post.',
    }),
    sign: choice('What does the small sign say?', {
      touch: 'DO NOT TOUCH',
      please: 'PLEASE TOUCH',
      queue: 'QUEUE HERE',
      removed: 'EXHIBIT REMOVED',
      private: 'PRIVATE VIEW',
      wet: 'WET PAINT',
      blank: 'Nothing: a blank card in a frame.',
    }),
    mount: choice('Where is the sign?', {
      top: 'In a small frame standing on top of one post.',
      hung: 'Hanging from the middle of the rope on two short chains.',
      floor: 'On its own low floor stand just behind the rope.',
      none: 'There is no sign at all.',
    }),
    rope: choice('What is the rope?', {
      red: 'Plump red velvet.',
      navy: 'Navy blue velvet.',
      green: 'Bottle-green velvet.',
      gold: 'A thick twisted gold cord with tassels.',
      black: 'A black retractable belt, airport style.',
      chain: 'A red and white plastic chain.',
    }),
    posts: choice('How are the posts arranged?', {
      pair: 'Just two posts and one rope.',
      line: 'Three posts in a straight line.',
      corner: 'Three posts turning a corner.',
      square: 'Four posts enclosing a small square of floor.',
    }),
    finial: choice('What tops the posts?', {
      ball: 'A plain polished ball.',
      urn: 'A fluted urn shape.',
      flat: 'A flat modern cap.',
      crown: 'A little crown, absurdly grand.',
    }),
    metal: choice('What are the posts made of?', {
      brass: 'Polished brass.',
      chrome: 'Mirror chrome.',
      black: 'Matt black steel.',
      tarnished: 'Brass gone brown and green with neglect.',
    }),
    guarding: choice('What is behind the rope?', {
      nothing: 'Nothing at all.',
      mark: 'A pale rectangle on the floor where something stood for years.',
      pebble: 'One small ordinary pebble on a tiny cushion.',
      carpet: 'A strip of red carpet running up to it.',
      puddle: 'A bucket catching a drip, and a puddle.',
    }),
    tassel: noul('Has a visitor left something draped on the rope, like a scarf or a lanyard?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const metalTint = { brass: '#c9a23f', chrome: '#d9dde0', black: '#26272a', tarnished: '#7d6a3a' }[a.metal];
    const metal = s.material(metalTint, { metalness: a.metal === 'black' ? 0.3 : 0.9, roughness: a.metal === 'tarnished' ? 0.7 : a.metal === 'black' ? 0.6 : 0.22 });
    const ropeTint = { red: '#a3182a', navy: '#1f2f6a', green: '#1d5a3a', gold: '#c9a23f', black: '#1c1c1f', chain: '#d8281f' }[a.rope];
    const ropeMat = s.material(ropeTint, { roughness: a.rope === 'gold' ? 0.6 : 1 });
    const HEIGHT = 0.95, HOOK = 0.86, GAP = 1.1;

    const layout: [number, number][] = {
      pair: [[-GAP / 2, 0], [GAP / 2, 0]],
      line: [[-GAP, 0], [0, 0], [GAP, 0]],
      corner: [[-GAP * 0.55, 0.45], [GAP * 0.45, 0.45], [GAP * 0.45, -0.75]],
      square: [[-0.6, 0.6], [0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]],
    }[a.posts] as [number, number][];
    const spans: [number, number][] = layout.slice(1).map((_p, i) => [i, i + 1]);
    if (a.posts === 'square') spans.push([3, 0]);
    const toppled = a.state === 'toppled' ? layout.length - 1 : -1;

    const postGroups = layout.map(([x, z], index) => {
      const post = new THREE.Group();
      const add = <T extends THREE.Object3D>(child: T) => { post.add(child); return child; };
      add(s.lathe([[0, 0], [0.16, 0], [0.165, 0.012], [0.15, 0.03], [0.07, 0.055], [0.03, 0.075], [0.026, 0.09]], metal));
      add(s.cylinder(0.024, 0.026, HEIGHT - 0.2, [0, 0.09 + (HEIGHT - 0.2) / 2, 0], metal, 16));
      add(s.lathe([[0.026, 0], [0.05, 0.015], [0.052, 0.05], [0.03, 0.065], [0.026, 0.08]], metal, [0, HEIGHT - 0.14, 0]));
      const topY = HEIGHT - 0.06;
      if (a.finial === 'ball') add(s.ball([0.05, 0.05, 0.05], [0, topY + 0.04, 0], metal, 18));
      else if (a.finial === 'urn') add(s.lathe([[0.02, 0], [0.03, 0.01], [0.055, 0.04], [0.045, 0.075], [0.02, 0.09], [0.028, 0.105], [0, 0.12]], metal, [0, topY, 0]));
      else if (a.finial === 'flat') add(s.cylinder(0.055, 0.055, 0.025, [0, topY + 0.012, 0], metal, 20));
      else {
        add(s.cylinder(0.05, 0.042, 0.035, [0, topY + 0.018, 0], metal, 16));
        for (let i = 0; i < 6; i++) add(s.cylinder(0.002, 0.012, 0.04, [Math.cos(i * 1.047) * 0.044, topY + 0.055, Math.sin(i * 1.047) * 0.044], metal, 6));
        add(s.ball([0.03, 0.022, 0.03], [0, topY + 0.03, 0], s.material('#8f1d2c', { roughness: 0.9 }), 10));
      }
      if (a.rope === 'black') add(s.cylinder(0.045, 0.045, 0.1, [0, HOOK, 0], s.material('#1c1c1f', { roughness: 0.5 }), 16));
      post.position.set(x, 0, z);
      if (index === toppled) {
        // Fall away from the neighbour it is roped to, pivoting on the base rim.
        const [px, pz] = layout[index - 1];
        const away = new THREE.Vector2(x - px, z - pz).normalize().rotateAround(new THREE.Vector2(), 0.5 + jitter(0.5));
        post.rotation.order = 'YXZ';
        post.rotation.y = Math.atan2(away.x, away.y);
        post.rotation.x = Math.PI / 2 - 0.16;
        post.position.y = 0.15;
      }
      s.root.add(post);
      return post;
    });
    s.root.updateMatrixWorld(true);
    const hookOf = (index: number): THREE.Vector3 => postGroups[index].localToWorld(new THREE.Vector3(0, HOOK, 0));

    // ---- Ropes ----
    const hang = (from: THREE.Vector3, to: THREE.Vector3, sag: number, segments = 14): P3[] => Array.from({ length: segments + 1 }, (_u, i) => {
      const t = i / segments, p = from.clone().lerp(to, t);
      p.y = Math.max(0.022, p.y - sag * 4 * t * (1 - t));
      return p.toArray() as P3;
    });
    const drawRope = (points: P3[]) => {
      if (a.rope === 'chain') {
        const links = points.flatMap((p, i) => (i ? [0.25, 0.75].map((t) => [mix(points[i - 1][0], p[0], t), mix(points[i - 1][1], p[1], t), mix(points[i - 1][2], p[2], t)] as P3) : []));
        s.scatter(new THREE.TorusGeometry(1, 0.28, 5, 10), ropeMat, links.map((at, i) => ({ at, size: 0.026, color: i % 2 ? '#f2f0ea' : '#d8281f' })));
      } else if (a.rope === 'black') {
        const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
        const shape = new THREE.Shape([new THREE.Vector2(-0.025, -0.002), new THREE.Vector2(0.025, -0.002), new THREE.Vector2(0.025, 0.002), new THREE.Vector2(-0.025, 0.002)]);
        s.mesh(new THREE.ExtrudeGeometry(shape, { steps: 30, extrudePath: curve, bevelEnabled: false }), ropeMat);
      } else {
        s.tube(points, a.rope === 'gold' ? 0.017 : 0.024, ropeMat);
        if (a.rope === 'gold') s.scatter(new THREE.TorusGeometry(1, 0.3, 5, 10), s.material('#a17d28', { roughness: 0.6 }), points.flatMap((p, i) => (i ? [{ at: [(p[0] + points[i - 1][0]) / 2, (p[1] + points[i - 1][1]) / 2, (p[2] + points[i - 1][2]) / 2] as P3, size: 0.017 }, { at: p, size: 0.017 }] : [])));
      }
    };
    const clip = (at: THREE.Vector3 | P3) => { const p = Array.isArray(at) ? at : (at.toArray() as P3); s.ball([0.03, 0.03, 0.03], p, metal, 10); };
    const sagBase = a.state === 'taut' ? 0.035 : a.rope === 'black' ? 0.02 : mix(0.16, 0.3, random());
    let signSpan: { mid: THREE.Vector3; dir: THREE.Vector3 } | null = null;
    spans.forEach(([i, j], n) => {
      const from = hookOf(i), to = hookOf(j);
      const dir = to.clone().sub(from).setY(0).normalize();
      const start = from.clone().addScaledVector(dir, 0.05), end = to.clone().addScaledVector(dir, -0.05);
      const last = n === spans.length - 1;
      if (a.state === 'unhooked' && last && a.posts !== 'square' || (a.state === 'unhooked' && n === 0 && a.posts === 'square')) {
        // Falls from the first post and lies in a lazy curl on the floor.
        const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(random() < 0.5 ? 1 : -1);
        const floorY = a.rope === 'black' ? 0.004 : 0.024;
        const pts: P3[] = [start.toArray() as P3, [start.x + dir.x * 0.07, start.y - 0.3, start.z + dir.z * 0.07], [start.x + dir.x * 0.12, 0.12, start.z + dir.z * 0.12]];
        for (let k = 0; k <= 7; k++) { const t = k / 7; pts.push([start.x + dir.x * (0.2 + t * 0.75) + side.x * Math.sin(t * 4.2) * 0.22, floorY, start.z + dir.z * (0.2 + t * 0.75) + side.z * Math.sin(t * 4.2) * 0.22]); }
        drawRope(pts);
        clip(start); clip(pts[pts.length - 1]);
        s.ring(0.02, 0.005, pts[pts.length - 1], metal).rotation.x = Math.PI / 2;
        s.ring(0.022, 0.005, [end.x, end.y, end.z], metal); // the empty eye on the far post
      } else {
        const sag = j === toppled || i === toppled ? 0.1 : sagBase * (0.85 + random() * 0.3);
        const pts = hang(start, end, sag);
        drawRope(pts);
        clip(start); clip(end);
        if (!signSpan && j !== toppled) signSpan = { mid: new THREE.Vector3(...pts[7]), dir };
        if (a.state === 'knotted' && n === 0) {
          for (let k = 0; k < 2; k++) s.ring(0.05, a.rope === 'gold' ? 0.017 : 0.022, [layout[i][0], HOOK - 0.03 - k * 0.05, layout[i][1]], ropeMat).rotation.x = Math.PI / 2 + jitter(0.2);
          const tail = hang(from.clone().addScaledVector(dir, -0.05), new THREE.Vector3(layout[i][0] - dir.x * 0.12, 0.3, layout[i][1] - dir.z * 0.12 + 0.05), 0.02, 5);
          drawRope(tail); clip(tail[tail.length - 1]);
        }
      }
      if (a.rope === 'gold') for (const p of [start, end]) { s.cylinder(0.012, 0.03, 0.09, [p.x, p.y - 0.07, p.z], ropeMat, 10); }
    });

    // ---- Sign ----
    const lines = SIGNS[a.sign];
    const paper = a.sign === 'wet' ? '#f3e04a' : a.metal === 'black' ? '#f1f0ea' : '#f4efdc';
    const ink = a.sign === 'please' ? '#1e6a3a' : a.sign === 'touch' || a.sign === 'removed' ? '#8c1a1a' : '#26221d';
    const front = layout[0];
    if (a.mount === 'top') {
      const host = toppled === 0 ? 1 : 0, [x, z] = layout[host];
      const plate = sign(lines, 0.24, 0.17, ink, paper);
      const y = HEIGHT + (a.finial === 'flat' ? 0.07 : 0.16);
      plate.position.set(x, y, z + 0.012);
      plate.rotation.y = jitter(0.3);
      s.root.add(plate);
      const back = s.box([0.27, 0.2, 0.012], [x, y, z], metal); back.rotation.y = plate.rotation.y; plate.position.set(x + Math.sin(plate.rotation.y) * 0.008, y, z + Math.cos(plate.rotation.y) * 0.008);
      s.cylinder(0.008, 0.008, 0.12, [x, HEIGHT + 0.02, z], metal, 8);
    } else if (a.mount === 'hung' && signSpan) {
      const { mid, dir } = signSpan as { mid: THREE.Vector3; dir: THREE.Vector3 };
      const plate = sign(lines, 0.36, 0.22, ink, paper);
      plate.position.set(mid.x, mid.y - 0.19, mid.z);
      plate.rotation.y = Math.atan2(dir.x, dir.z) - Math.PI / 2;
      if (Math.cos(plate.rotation.y) < 0) plate.rotation.y += Math.PI;
      plate.rotation.z = jitter(0.14);
      s.root.add(plate);
      for (const e of [-1, 1]) s.rod([mid.x + dir.x * e * 0.13, mid.y - 0.005, mid.z + dir.z * e * 0.13], [mid.x + dir.x * e * 0.13, mid.y - 0.085, mid.z + dir.z * e * 0.13], 0.004, metal);
    } else if (a.mount !== 'none') {
      const x = (front[0] + layout[1][0]) / 2 + jitter(0.3), z = front[1] + 0.3;
      const plate = sign(lines, 0.3, 0.2, ink, paper);
      plate.position.set(x, 0.42, z + 0.012); plate.rotation.x = -0.35;
      s.root.add(plate);
      s.box([0.33, 0.23, 0.012], [x, 0.42, z + 0.004], metal).rotation.x = -0.35;
      s.rod([x, 0.02, z - 0.03], [x, 0.38, z - 0.01], 0.01, metal);
      s.cylinder(0.11, 0.12, 0.018, [x, 0.009, z - 0.03], metal, 20);
    }

    // ---- What it guards ----
    const centre = layout.reduce((sum, [x, z]) => [sum[0] + x / layout.length, sum[1] + z / layout.length], [0, 0]);
    const behind: [number, number] = a.posts === 'square' ? [0, 0] : a.posts === 'corner' ? [-0.15, -0.3] : [centre[0], -0.55];
    if (a.guarding === 'mark') {
      const pale = s.box([0.7, 0.004, 0.5], [behind[0], 0.002, behind[1]], s.material('#f4f0e2', { roughness: 1 }));
      pale.castShadow = false; pale.rotation.y = jitter(0.1);
      for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) s.cylinder(0.03, 0.03, 0.005, [behind[0] + x, 0.003, behind[1] + z], s.material('#8d8676', { roughness: 1 }), 12).castShadow = false;
    } else if (a.guarding === 'pebble') {
      s.box([0.26, 0.5, 0.26], [behind[0], 0.25, behind[1]], s.material('#ebe8df'));
      s.ball([0.1, 0.03, 0.1], [behind[0], 0.52, behind[1]], s.material('#7d1f2e', { roughness: 1 }), 16);
      s.ball([0.035, 0.022, 0.028], [behind[0], 0.56, behind[1]], s.material('#8b8a84', { roughness: 0.9 }), 10).rotation.y = random() * 3;
    } else if (a.guarding === 'carpet') {
      const run = s.box([0.7, 0.012, 1.2], [centre[0], 0.006, behind[1] + 0.25], s.material('#9a1c2b', { roughness: 1 }));
      run.castShadow = false;
      for (const x of [-0.32, 0.32]) s.box([0.03, 0.014, 1.2], [centre[0] + x, 0.007, behind[1] + 0.25], s.material('#c9a23f', { roughness: 0.8 })).castShadow = false;
    } else if (a.guarding === 'puddle') {
      const water = new THREE.MeshStandardMaterial({ color: '#9fb6c2', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.7 });
      const pool = s.cylinder(0.3, 0.3, 0.004, [behind[0] + 0.15, 0.002, behind[1]], water, 28); pool.scale.set(1.2, 1, 0.8); pool.castShadow = false;
      const pail = s.material('#c8423a', { roughness: 0.5 });
      s.lathe([[0.1, 0], [0.11, 0.01], [0.14, 0.26], [0.145, 0.27]], pail, [behind[0] - 0.1, 0, behind[1]]).material.side = THREE.DoubleSide;
      s.ring(0.14, 0.006, [behind[0] - 0.1, 0.27, behind[1]], s.material('#b9bdc0', { metalness: 0.8 })).rotation.x = Math.PI / 2;
      s.cylinder(0.125, 0.125, 0.004, [behind[0] - 0.1, 0.18, behind[1]], water, 20).castShadow = false;
    }

    if (a.tassel && signSpan) {
      const { mid, dir } = signSpan as { mid: THREE.Vector3; dir: THREE.Vector3 };
      const at = mid.clone().addScaledVector(dir, 0.25);
      const scarf = s.material(mood.cheer > 0.5 ? '#e9b52c' : '#5c6f8a', { roughness: 1, side: THREE.DoubleSide });
      const side = new THREE.Vector3(-dir.z, 0, dir.x);
      const turn = Math.atan2(dir.x, dir.z) + Math.PI / 2;
      for (const e of [-1, 1]) {
        const drop = 0.26 + random() * 0.16;
        const strip = s.box([0.11, drop, 0.01], [at.x + side.x * e * 0.03, at.y + 0.02 - drop / 2, at.z + side.z * e * 0.03], scarf);
        strip.rotation.y = turn; strip.rotation.z = jitter(0.08);
        for (let k = 0; k < 2; k++) s.box([0.112, 0.025, 0.012], [strip.position.x, at.y + 0.02 - drop + 0.04 + k * 0.05, strip.position.z], s.material('#f1ece0', { roughness: 1 })).rotation.y = turn;
      }
      s.box([0.11, 0.02, 0.075], [at.x, at.y + 0.028, at.z], scarf).rotation.y = turn;
    }

    // Scuffs and dust on the floor with wear.
    return s.finish({ footprint: a.posts === 'pair' ? 0.75 : 1 });
  },
});
