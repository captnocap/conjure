import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type V = THREE.Vector3;
const BELTS = {
  black: 'Plain black webbing.',
  red: 'Red webbing, a cinema or a bank.',
  blue: 'Airline blue.',
  hazard: 'Yellow and black diagonal hazard stripes.',
  green: 'Green, a customs channel with nothing to declare.',
  purple: 'Purple, a premium lane.',
  printed: 'White webbing printed over and over with PLEASE WAIT HERE.',
} as const;
const BELT: Record<keyof typeof BELTS, string> = { black: '#1d1f22', red: '#c22a26', blue: '#2356b0', hazard: '#f2c41c', green: '#2f9148', purple: '#6a35a8', printed: '#eeeeea' };
const SIGNS = {
  none: 'No sign.',
  queue: 'QUEUE HERE',
  closed: 'LANE CLOSED',
  priority: 'PRIORITY ONLY',
  wait: 'PLEASE WAIT TO BE CALLED',
  arrow: 'A large arrow and THIS WAY',
  wet: 'A yellow CAUTION sign',
  handwritten: 'A sheet of paper taped on, handwritten: USE OTHER DESK',
} as const;

export default defineThing({
  questions: {
    layout: choice('How are the posts laid out?', {
      lane: 'Two parallel rows making one straight lane to walk down.',
      zigzag: 'A serpentine zigzag of switchbacks, the full snaking queue.',
      line: 'A single line of posts cutting straight across the way.',
      cordon: 'A closed square cordon around a patch of floor.',
      funnel: 'Two rows narrowing from a wide mouth to a single gap.',
      stored: 'Belts all retracted and the posts shoved together in a cluster, put away.',
    }),
    belt: choice('What colour are the belts?', BELTS),
    state: choice('What state are the belts in?', {
      taut: 'All clipped and pulled taut, freshly set out.',
      sagging: 'Clipped but slack, each one drooping in the middle.',
      unhooked: 'One belt unhooked and lying snaked on the floor: someone ducked through.',
      abandoned: 'Several belts trailing on the floor and a post knocked flat.',
    }),
    sign: choice('What is the sign on the lead post?', SIGNS),
    posts: choice('What are the posts like?', {
      chrome: 'Polished chrome.',
      black: 'Matt black with a rubber-ringed base.',
      brass: 'Brass, an older and grander queue.',
      yellow: 'Chunky safety-yellow plastic.',
      steel: 'Scuffed satin steel, bought by the hundred.',
    }),
    floor: choice('What is on the floor inside it?', {
      nothing: 'Nothing.',
      footprints: 'Stick-on footprint markers spaced along the lane.',
      carpet: 'A strip of red carpet.',
      pass: 'A dropped boarding pass, face down.',
      spill: 'A shining puddle and a cone: this is why it is closed.',
      bag: 'One small suitcase standing alone where a person should be.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const finish = { chrome: ['#dfe4e7', 0.95, 0.12], black: ['#232528', 0.2, 0.6], brass: ['#c9a04a', 0.9, 0.25], yellow: ['#f0c21c', 0, 0.55], steel: ['#a5abb0', 0.8, 0.45] }[a.posts] as [string, number, number];
    const postMat = s.material(finish[0], { metalness: finish[1], roughness: finish[2] });
    const dark = s.material('#1c1e21', { roughness: 0.6 });
    const H = 0.96, HEAD = 0.9;

    // Belt material: a painted strip that repeats along the run.
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 32;
    const c = canvas.getContext('2d')!;
    c.fillStyle = BELT[a.belt]; c.fillRect(0, 0, 256, 32);
    if (a.belt === 'hazard') { c.fillStyle = '#17181a'; for (let x = -32; x < 256; x += 64) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 32, 0); c.lineTo(x + 64, 0); c.lineTo(x + 32, 32); c.fill(); } }
    else if (a.belt === 'printed') { c.fillStyle = '#b3231c'; c.font = 'bold 20px sans-serif'; c.textBaseline = 'middle'; c.fillText('PLEASE WAIT HERE  •', 8, 17); }
    else { c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(0, 3, 256, 2); c.fillRect(0, 27, 256, 2); }
    const beltMap = new THREE.CanvasTexture(canvas);
    beltMap.colorSpace = THREE.SRGBColorSpace;
    beltMap.wrapS = THREE.RepeatWrapping;
    const beltMat = new THREE.MeshStandardMaterial({ map: beltMap, roughness: 0.85, side: THREE.DoubleSide });

    /** A webbing strip through points; `flat` in 0..1 lays it down from standing on edge to lying on the floor. */
    const ribbon = (points: { p: V; flat: number }[]) => {
      const curve = new THREE.CatmullRomCurve3(points.map((entry) => entry.p));
      const steps = Math.max(12, points.length * 8), half = 0.034;
      const pos: number[] = [], uv: number[] = [], idx: number[] = [];
      const length = curve.getLength();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
        const f = t * (points.length - 1), k = Math.min(points.length - 2, Math.floor(f));
        const flat = mix(points[k].flat, points[k + 1].flat, f - k);
        const sideways = new THREE.Vector3(tangent.z, 0, -tangent.x);
        if (sideways.lengthSq() < 1e-6) sideways.set(1, 0, 0);
        sideways.normalize();
        const across = new THREE.Vector3(0, 1, 0).multiplyScalar(1 - flat).addScaledVector(sideways, flat).normalize().multiplyScalar(half);
        const thick = new THREE.Vector3().crossVectors(tangent, across).normalize().multiplyScalar(0.007);
        // Four corners of a thin box section, so the belt still shows when seen edge-on.
        const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([u, v]) => p.clone().addScaledVector(across, u).addScaledVector(thick, v));
        for (let q = 0; q < 4; q++) {
          const c0 = corners[q], c1 = corners[(q + 1) % 4];
          pos.push(c0.x, c0.y, c0.z, c1.x, c1.y, c1.z);
          uv.push(t * length / 0.4, q % 2 ? 0.5 : 1, t * length / 0.4, q % 2 ? 0.5 : 0);
          if (i < steps) { const o = i * 8 + q * 2, n = o + 8; idx.push(o, o + 1, n, o + 1, n + 1, n); }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.setIndex(idx);
      geometry.computeVertexNormals();
      return s.mesh(geometry, beltMat);
    };

    // Plan: posts and which pairs are joined.
    const posts: [number, number][] = [];
    const links: [number, number][] = [];
    const more = mood.density > 0.6 ? 1 : 0;
    const gap = 1.5;
    if (a.layout === 'lane') {
      const n = 3 + more;
      for (const x of [-0.6, 0.6]) for (let i = 0; i < n; i++) { posts.push([x, (i - (n - 1) / 2) * gap]); if (i) links.push([posts.length - 2, posts.length - 1]); }
    } else if (a.layout === 'zigzag') {
      const rows = 3 + more, n = 3;
      for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) { posts.push([(i - 1) * gap, (r - (rows - 1) / 2) * 1.0]); if (i) links.push([posts.length - 2, posts.length - 1]); }
      for (let r = 0; r + 1 < rows; r++) { const end = r % 2 ? 0 : n - 1; links.push([r * n + end, (r + 1) * n + end]); }
    } else if (a.layout === 'line') {
      const n = 3 + more + (random() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) { posts.push([(i - (n - 1) / 2) * gap, 0]); if (i) links.push([i - 1, i]); }
    } else if (a.layout === 'cordon') {
      const w = 0.85 + more * 0.3;
      [[-w, -w], [w, -w], [w, w], [-w, w]].forEach(([x, z], i) => { posts.push([x, z]); links.push([i, (i + 1) % 4]); });
    } else if (a.layout === 'funnel') {
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { posts.push([side * (0.45 + (2 - i) * 0.55), (i - 1) * 1.35]); if (i) links.push([posts.length - 2, posts.length - 1]); }
    } else {
      const n = 5 + Math.floor(random() * 3) + more * 2;
      for (let i = 0; i < n; i++) posts.push([(i % 3 - 1) * 0.37 + (random() - 0.5) * 0.08, (Math.floor(i / 3) - 1) * 0.37 + (random() - 0.5) * 0.08]);
    }
    // Posts are never set out perfectly.
    const wobble = a.state === 'taut' ? 0.03 : a.state === 'abandoned' ? 0.22 : 0.1;
    if (a.layout !== 'stored') for (const post of posts) { post[0] += (random() - 0.5) * wobble; post[1] += (random() - 0.5) * wobble; }

    const loose = new Set<number>();
    if (links.length && (a.state === 'unhooked' || a.state === 'abandoned')) {
      const count = a.state === 'unhooked' ? 1 : Math.max(2, Math.round(links.length * 0.5));
      while (loose.size < Math.min(count, links.length)) loose.add(Math.floor(random() * links.length));
    }
    let fallen = -1;
    if (a.state === 'abandoned' && posts.length > 1) {
      // Knock over a post whose belts have all come loose, if there is one.
      const free = posts.map((_p, i) => i).filter((i) => i !== 0 && links.every((link, k) => !link.includes(i) || loose.has(k)));
      fallen = free.length ? free[Math.floor(random() * free.length)] : -1;
      if (fallen < 0) { fallen = posts.length - 1; links.forEach((link, k) => { if (link.includes(fallen)) loose.add(k); }); }
    }

    const base = [[0, 0], [0.175, 0], [0.18, 0.012], [0.15, 0.03], [0.06, 0.055], [0.034, 0.075], [0.03, 0.09]] as const;
    posts.forEach(([x, z], index) => {
      const g = new Sculpture(context);
      g.lathe(base, a.posts === 'black' ? dark : postMat);
      if (a.posts === 'black' || a.posts === 'yellow') g.ring(0.178, 0.012, [0, 0.012, 0], s.material('#101112', { roughness: 0.9 })).rotation.x = Math.PI / 2;
      g.cylinder(a.posts === 'yellow' ? 0.045 : 0.03, a.posts === 'yellow' ? 0.05 : 0.03, H - 0.16, [0, 0.08 + (H - 0.16) / 2, 0], postMat, 16);
      g.cylinder(0.042, 0.042, 0.1, [0, HEAD, 0], a.posts === 'brass' ? postMat : dark, 16);
      g.cylinder(0.036, 0.042, 0.02, [0, H, 0], postMat, 16);
      for (let k = 0; k < 4; k++) g.box([0.012, 0.062, 0.006], [Math.sin(k * Math.PI / 2) * 0.042, HEAD, Math.cos(k * Math.PI / 2) * 0.042], s.material(BELT[a.belt])).rotation.y = k * Math.PI / 2;
      // Scuffs where trolleys and shoes have hit the base.
      for (let k = 0; k < Math.round(mood.wear * 3); k++) { const t = random() * 6.3; g.box([0.05, 0.004, 0.014], [Math.sin(t) * 0.13, 0.036, Math.cos(t) * 0.13], s.material('#3b3a37', { roughness: 1 })).rotation.y = t; }
      g.root.position.set(x, 0, z);
      if (index === fallen) {
        const heading = random() * Math.PI * 2;
        g.root.rotation.set(Math.PI / 2 + 0.13, 0, 0);
        const lie = new THREE.Group();
        lie.rotation.y = heading; lie.position.set(x, 0.167, z);
        g.root.position.set(0, 0, 0);
        lie.add(g.root);
        s.root.add(lie);
      } else s.root.add(g.root);
    });

    const headOf = (i: number) => new THREE.Vector3(posts[i][0], HEAD, posts[i][1]);
    links.forEach(([from, to], k) => {
      const A = headOf(from), B = headOf(to);
      const along = B.clone().sub(A).setY(0);
      const dir = along.clone().normalize();
      const edge = (p: V, toward: V) => p.clone().addScaledVector(toward, 0.045);
      if (!loose.has(k)) {
        const sag = a.state === 'taut' ? 0.012 : mix(0.06, 0.2, random());
        const mid = A.clone().lerp(B, 0.5); mid.y -= sag;
        const q1 = A.clone().lerp(B, 0.25), q3 = A.clone().lerp(B, 0.75); q1.y -= sag * 0.75; q3.y -= sag * 0.75;
        ribbon([edge(A, dir), q1, mid, q3, edge(B, dir.clone().negate())].map((p) => ({ p, flat: 0 })));
        return;
      }
      // Unhooked: still anchored at one post, falling to the floor and snaking away.
      const anchor = from === fallen ? B : A, heading = from === fallen ? dir.clone().negate() : dir;
      if ((from === fallen ? to : from) === fallen) return;
      const side = new THREE.Vector3(heading.z, 0, -heading.x);
      const reach = Math.min(along.length() * mix(0.5, 0.95, random()), 1.6);
      const wig = (random() < 0.5 ? 1 : -1) * mix(0.12, 0.3, random());
      const at = (d: number, y: number, w: number) => anchor.clone().addScaledVector(heading, d).addScaledVector(side, w).setY(y);
      ribbon([
        { p: edge(anchor, heading), flat: 0 }, { p: at(0.16, HEAD - 0.2, wig * 0.1), flat: 0 }, { p: at(0.26, 0.35, wig * 0.3), flat: 0.2 },
        { p: at(0.36, 0.02, wig * 0.6), flat: 1 }, { p: at(reach * 0.45, 0.006, wig), flat: 1 }, { p: at(reach * 0.75, 0.006, -wig * 0.7), flat: 1 }, { p: at(reach, 0.006, wig * 0.3), flat: 1 },
      ]);
      const clip = at(reach + 0.02, 0.012, wig * 0.3);
      s.box([0.04, 0.02, 0.06], [clip.x, clip.y, clip.z], dark).rotation.y = Math.atan2(heading.x, heading.z);
    });

    // Sign on the lead post.
    if (a.sign !== 'none' && fallen !== 0) {
      const [x, z] = posts[0];
      const text = { queue: 'QUEUE HERE', closed: 'LANE CLOSED', priority: 'PRIORITY ONLY', wait: 'PLEASE WAIT', arrow: '← THIS WAY', wet: 'CAUTION', handwritten: 'USE OTHER DESK' }[a.sign];
      const [ink, paper] = { queue: ['#ffffff', '#1f4f9a'], closed: ['#ffffff', '#b3231c'], priority: ['#f4d98a', '#3a2a5a'], wait: ['#1c1e21', '#f1f1ec'], arrow: ['#ffffff', '#1c1e21'], wet: ['#141414', '#ffd21e'], handwritten: ['#22306a', '#f7f4e8'] }[a.sign];
      const turn = (random() - 0.5) * 0.5 + (a.sign === 'handwritten' ? 0.05 : 0);
      const holder = new THREE.Group();
      holder.position.set(x, 0, z); holder.rotation.y = turn;
      s.root.add(holder);
      const add = (mesh: THREE.Object3D) => { mesh.removeFromParent(); holder.add(mesh); return mesh; };
      add(s.rod([0, H, 0], [0, H + 0.12, 0], 0.012, postMat));
      const portrait = a.sign === 'handwritten' || a.sign === 'wet';
      const w = portrait ? 0.32 : 0.48, h = portrait ? 0.44 : 0.3;
      add(s.box([w + 0.03, h + 0.03, 0.014], [0, H + 0.12 + h / 2, 0], a.sign === 'handwritten' ? s.material('#d8d8d2') : dark));
      for (const face of [1, -1]) {
        const plate = add(s.label(text, w, h, [0, H + 0.12 + h / 2, face * 0.009], ink, paper));
        plate.rotation.y = face === 1 ? 0 : Math.PI;
        if (a.sign === 'handwritten') { plate.rotation.z = face * 0.06; add(s.box([0.07, 0.025, 0.002], [0, H + 0.12 + h - 0.005, face * 0.011], s.material('#d9c98a', { roughness: 0.4 }))); }
      }
    }

    // What is on the floor inside.
    const centre = posts.reduce((sum, p) => [sum[0] + p[0] / posts.length, sum[1] + p[1] / posts.length], [0, 0]);
    const inside: [number, number] = a.layout === 'line' ? [centre[0] + (random() - 0.5), centre[1] - 0.7] : a.layout === 'zigzag' ? [centre[0] + (random() - 0.5) * 1.5, centre[1] + 0.5] : a.layout === 'stored' ? [centre[0] + 0.9, centre[1] + 0.3] : [centre[0] + (random() - 0.5) * 0.3, centre[1] + (random() - 0.5) * 0.6];
    if (a.floor === 'footprints') {
      const sticker = s.material('#f2c41c', { roughness: 0.7 });
      const alongX = a.layout === 'line' || a.layout === 'zigzag';
      for (let k = -1; k <= 1; k++) {
        const px = alongX ? inside[0] + k * 1.0 : inside[0], pz = alongX ? inside[1] : inside[1] + k * 1.2;
        s.cylinder(0.2, 0.2, 0.004, [px, 0.002, pz], sticker, 24).castShadow = false;
        for (const f of [-0.06, 0.06]) { const foot = s.ball([0.035, 0.003, 0.085], [px + (alongX ? 0 : f), 0.005, pz + (alongX ? f : 0)], dark, 10); foot.rotation.y = alongX ? Math.PI / 2 : 0; foot.castShadow = false; }
      }
    } else if (a.floor === 'carpet') {
      const long = a.layout === 'line' || a.layout === 'zigzag';
      const span = Math.max(...posts.map((p) => Math.abs(p[long ? 0 : 1]))) * 2 + 0.6;
      s.box(long ? [span, 0.012, 0.75] : [0.85, 0.012, span], [long ? centre[0] : inside[0] * 0.3, 0.006, long ? inside[1] : centre[1]], s.material('#a8201f', { roughness: 1 }));
    } else if (a.floor === 'pass') {
      s.box([0.2, 0.003, 0.085], [inside[0], 0.002, inside[1]], s.material('#f3f0e6')).rotation.y = random() * 3;
    } else if (a.floor === 'spill') {
      const puddle = s.cylinder(0.42, 0.42, 0.004, [inside[0], 0.002, inside[1]], new THREE.MeshStandardMaterial({ color: '#cfe6f5', transparent: true, opacity: 0.5, roughness: 0.02, metalness: 0.5, depthWrite: false }), 28);
      puddle.scale.set(1.2 + random() * 0.4, 1, 0.8); puddle.rotation.y = random() * 3; puddle.castShadow = false;
      const hazard = s.material('#ef6a1c', { roughness: 0.6 });
      const cx = inside[0] + 0.25, cz = inside[1] + 0.2;
      s.box([0.26, 0.022, 0.26], [cx, 0.011, cz], hazard);
      s.cylinder(0.025, 0.1, 0.42, [cx, 0.23, cz], hazard, 16);
      s.cylinder(0.05, 0.07, 0.08, [cx, 0.28, cz], s.material('#f4f4f0'), 16);
    } else if (a.floor === 'bag') {
      const shell = s.material(mood.cheer > 0.5 ? '#e2513f' : '#3a4a5c', { roughness: 0.4 });
      const turn = random() * 3;
      const bag = s.box([0.38, 0.55, 0.24], [inside[0], 0.32, inside[1]], shell); bag.rotation.y = turn;
      for (const dx of [-0.1, 0.1]) { const handle = s.rod([inside[0] + Math.cos(turn) * dx, 0.6, inside[1] - Math.sin(turn) * dx], [inside[0] + Math.cos(turn) * dx, 0.95, inside[1] - Math.sin(turn) * dx], 0.008, dark); handle.castShadow = true; }
      const grip = s.rod([inside[0] - Math.cos(turn) * 0.1, 0.95, inside[1] + Math.sin(turn) * 0.1], [inside[0] + Math.cos(turn) * 0.1, 0.95, inside[1] - Math.sin(turn) * 0.1], 0.013, dark);
      grip.castShadow = true;
      for (const dx of [-0.14, 0.14]) s.cylinder(0.025, 0.025, 0.03, [inside[0] + Math.cos(turn) * dx, 0.025, inside[1] - Math.sin(turn) * dx], dark, 10);
    }

    return s.finish();
  },
});
