import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

const ROPES = {
  red: 'Deep crimson velvet, the classic.',
  blue: 'Royal blue velvet, a bank or a gala.',
  black: 'Black velvet, a nightclub door.',
  purple: 'Imperial purple velvet.',
  green: 'Emerald velvet, a museum or an old hotel.',
  gold: 'Twisted gold silk cord.',
  white: 'White rope, a wedding or a yacht club.',
} as const;
const ROPE: Record<keyof typeof ROPES, string> = { red: '#9c1424', blue: '#1b3f9a', black: '#1b1b20', purple: '#5a2283', green: '#126b46', gold: '#d2a53c', white: '#efe9dc' };

export default defineThing({
  questions: {
    rope: choice('What colour is the rope?', ROPES),
    posts: choice('How many posts are in the run?', {
      two: 'Just two posts and one rope.',
      three: 'Three posts.',
      four: 'Four posts.',
      five: 'Five posts.',
      six: 'Six posts, a long cordon.',
    }),
    layout: choice('How is the run laid out?', {
      line: 'A straight line beside the carpet.',
      corner: 'A guarded corner, the line turning back at one end.',
      corridor: 'Two facing rows making a roped corridor along the carpet.',
      trailing: 'A straight line with the last rope unclipped and trailing on the floor.',
      toppled: 'A line broken by a post knocked over, the rope dragged down with it.',
    }),
    guards: choice('What is it guarding?', {
      nothing: 'Nothing visible; just the line itself.',
      door: 'A padded, studded door to a private room.',
      painting: 'A gilt-framed painting on an easel.',
      jewel: 'A glass display case holding a single jewel on a cushion.',
      chair: 'An empty gilded throne of a chair, kept for someone important.',
      puddle: 'A spill on the floor behind a yellow caution cone.',
    }),
    sign: choice('What does the sign say?', {
      none: 'There is no sign.',
      reserved: 'RESERVED',
      vip: 'VIP ONLY',
      private: 'PRIVATE',
      queue: 'QUEUE HERE',
      touch: 'DO NOT TOUCH',
      closed: 'CLOSED',
    }),
    metal: choice('What are the posts made of?', {
      brass: 'Polished brass.',
      chrome: 'Mirror chrome.',
      black: 'Matte black steel.',
      bronze: 'Dull antique bronze.',
    }),
    finial: choice('How do the posts finish at the top?', {
      ball: 'A plain round ball.',
      urn: 'A turned urn with a point.',
      crown: 'A flat-topped crown cap.',
    }),
    carpet: choice('What runs along the floor?', {
      red: 'A red carpet runner with a gold border.',
      blue: 'A midnight blue runner.',
      pattern: 'A busy patterned hotel runner.',
      none: 'Bare floor.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const metal = s.material({ brass: '#dcab3c', chrome: '#e2e6e8', black: '#202226', bronze: '#7a5a34' }[a.metal], { metalness: a.metal === 'black' ? 0.4 : 0.95, roughness: a.metal === 'chrome' ? 0.12 : a.metal === 'brass' ? 0.2 : 0.5 });
    const velvet = s.material(ROPE[a.rope], { roughness: 1 });
    const n = { two: 2, three: 3, four: 4, five: 5, six: 6 }[a.posts];
    const gap = n > 4 ? 0.88 : n > 2 ? 1.0 : 1.2;
    const H = 0.98;

    // Where the posts stand.
    type P2 = [number, number];
    const runs: P2[][] = [];
    let behind: P2 = [0, -0.72];
    let runner: { at: P2; size: P2 } | null = null;
    if (a.layout === 'corridor') {
      const per = Math.max(2, Math.ceil(n / 2)), len = (per - 1) * gap;
      for (const x of [-0.8, 0.8]) runs.push(Array.from({ length: per }, (_u, i) => [x, len / 2 - i * gap] as P2));
      behind = [0, -len / 2 - 0.85];
      runner = { at: [0, 0.1], size: [1.1, len + 1.3] };
    } else if (a.layout === 'corner' && n > 2) {
      const along = n - 1 - Math.floor((n - 1) / 3) || 1, len = along * gap;
      const run: P2[] = [];
      for (let i = 0; i <= along; i++) run.push([-len / 2 + i * gap, 0.45]);
      for (let i = 1; i < n - along; i++) run.push([len / 2, 0.45 - i * gap]);
      runs.push(run);
      behind = [0, -0.6];
      runner = { at: [0, 1.05], size: [len + 0.9, 0.85] };
    } else {
      const len = (n - 1) * gap;
      runs.push(Array.from({ length: n }, (_u, i) => [-len / 2 + i * gap, 0.2] as P2));
      runner = { at: [0, 0.82], size: [len + 0.9, 0.85] };
    }

    // Carpet runner.
    if (a.carpet !== 'none' && runner) {
      const [w, d] = runner.size;
      const base = { red: '#a3161f', blue: '#1c2a5c', pattern: '#7a1f2c' }[a.carpet];
      const texture = paint(Math.round(128 * w), Math.round(128 * d), (c) => {
        const W = 128 * w, D = 128 * d;
        c.fillStyle = base; c.fillRect(0, 0, W, D);
        if (a.carpet === 'pattern') {
          for (let x = 0; x < W; x += 42) for (let y = 0; y < D; y += 42) {
            c.fillStyle = '#d9a93a'; c.beginPath(); c.moveTo(x + 21, y + 4); c.lineTo(x + 38, y + 21); c.lineTo(x + 21, y + 38); c.lineTo(x + 4, y + 21); c.closePath(); c.fill();
            c.fillStyle = '#1c2a5c'; c.beginPath(); c.arc(x + 21, y + 21, 8, 0, 7); c.fill();
          }
        }
        for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(0,0,0,${0.03 + mood.wear * 0.07})`; c.fillRect(random() * W, random() * D, 4 + random() * 14, 4 + random() * 14); }
        c.strokeStyle = a.carpet === 'blue' ? '#c9ccd0' : '#e3b94f'; c.lineWidth = 6; c.strokeRect(10, 10, W - 20, D - 20);
      });
      s.mesh(new THREE.BoxGeometry(w, 0.018, d), [0, 0, 1, 0, 0, 0].map((top) => top ? new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }) : s.material(base, { roughness: 1 })) as unknown as THREE.Material, [runner.at[0], 0.009, runner.at[1]]);
    }

    // Posts.
    const finial: [number, number][] = a.finial === 'ball' ? [[0.03, H - 0.02], [0.02, H], [0.045, H + 0.03], [0.055, H + 0.06], [0.045, H + 0.09], [0, H + 0.115]]
      : a.finial === 'urn' ? [[0.03, H - 0.02], [0.05, H], [0.06, H + 0.04], [0.03, H + 0.08], [0.04, H + 0.1], [0.012, H + 0.14], [0, H + 0.17]]
      : [[0.03, H - 0.02], [0.055, H - 0.01], [0.062, H + 0.03], [0.058, H + 0.05], [0, H + 0.055]];
    const profile: [number, number][] = [[0, 0], [0.17, 0], [0.175, 0.02], [0.15, 0.045], [0.06, 0.062], [0.032, 0.085], [0.03, 0.11], [0.03, H - 0.08], [0.04, H - 0.07], [0.046, H - 0.045], ...finial];
    const postGeometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 24);
    const fallen = a.layout === 'toppled' ? Math.min(runs[0].length - 1, 1 + Math.floor(random() * (runs[0].length - 1))) : -1;
    const tops: THREE.Vector3[][] = runs.map((run, r) => run.map(([x, z], i) => {
      const post = s.mesh(postGeometry, metal, [x, 0, z]);
      if (r === 0 && i === fallen) {
        const way = random() * 0.8 + 0.3;
        post.rotation.set(0, way, 0); post.rotateX(Math.PI / 2 - 0.17); post.position.y = 0.16;
        return new THREE.Vector3(x + Math.sin(way) * (H - 0.07), 0.08, z + Math.cos(way) * (H - 0.07));
      }
      post.rotation.z = (random() - 0.5) * 0.02 * (1 + mood.wear * 3);
      return new THREE.Vector3(x, H - 0.06, z);
    }));

    // Ropes, swagged between the posts.
    const swings: { group: THREE.Group; axis: THREE.Vector3; phase: number }[] = [];
    const hang = (from: THREE.Vector3, to: THREE.Vector3, onFloor: boolean) => {
      const span = to.clone().sub(from), flat = Math.hypot(span.x, span.z);
      const sag = onFloor ? 0 : mix(0.16, 0.3, random()) * Math.min(1, flat / 1.1) + mood.wear * 0.05;
      const points: [number, number, number][] = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        const y = onFloor ? Math.max(0.024, from.y * Math.pow(1 - t, 3.2)) : from.y + span.y * t - sag * 4 * t * (1 - t);
        const wiggle = onFloor ? Math.sin(t * 5) * 0.22 * t : 0;
        points.push([span.x * t - (span.z / flat) * wiggle, Math.max(0.024, y) - from.y, span.z * t + (span.x / flat) * wiggle]);
      }
      const group = new THREE.Group();
      group.position.copy(from);
      group.add(s.tube(points, 0.028, velvet));
      for (const end of [points[0], points[12]]) {
        const snap = s.mesh(new THREE.SphereGeometry(0.036, 10, 8), metal, end);
        snap.scale.set(1, 1.4, 1);
        group.add(snap);
      }
      s.root.add(group);
      if (!onFloor && Math.abs(span.y) < 0.01) swings.push({ group, axis: span.clone().normalize(), phase: random() * 6 });
    };
    tops.forEach((run) => {
      for (let i = 0; i < run.length - 1; i++) {
        if (a.layout === 'trailing' && i === run.length - 2) {
          const out = new THREE.Vector3(run[i].x + 0.75 + random() * 0.2, 0, run[i].z + 0.55 + random() * 0.3);
          hang(run[i], out, true);
        } else hang(run[i], run[i + 1], false);
      }
    });

    // Sign on its own stand.
    if (a.sign !== 'none') {
      const text = { reserved: 'RESERVED', vip: 'VIP ONLY', private: 'PRIVATE', queue: 'QUEUE HERE', touch: 'DO NOT TOUCH', closed: 'CLOSED' }[a.sign];
      const first = runs[0][0];
      const x = a.layout === 'corridor' ? 0 : first[0] - 0.5, z = a.layout === 'corridor' ? first[1] + 0.55 : first[1] + 0.25;
      s.cylinder(0.15, 0.16, 0.03, [x, 0.015, z], metal, 24);
      s.cylinder(0.014, 0.014, 1.1, [x, 0.56, z], metal, 10);
      s.box([0.62, 0.44, 0.025], [x, 1.3, z], metal);
      const plate = s.label(text, 0.56, 0.38, [x, 1.3, z + 0.014], a.rope === 'black' || a.metal === 'black' ? '#e3b94f' : '#f6eed2', a.rope === 'gold' || a.rope === 'white' ? '#1b1b20' : ROPE[a.rope]);
      plate.castShadow = false;
      const group = new THREE.Group();
      s.root.children.slice(-4).forEach((child) => group.attach(child));
      group.position.set(x, 0, z);
      group.children.forEach((child) => { child.position.x -= x; child.position.z -= z; });
      group.rotation.y = a.layout === 'corridor' ? 0 : 0.3;
      s.root.add(group);
    }

    // What it guards.
    const [gx, gz] = behind;
    const gold = s.material('#d9a93a', { metalness: 0.9, roughness: 0.3 });
    if (a.guards === 'door') {
      const leather = paint(128, 256, (c) => {
        c.fillStyle = '#5a1420'; c.fillRect(0, 0, 128, 256);
        c.strokeStyle = '#3a0a12'; c.lineWidth = 3;
        for (let i = -256; i < 256; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 256, 256); c.moveTo(i + 256, 0); c.lineTo(i, 256); c.stroke(); }
        c.fillStyle = '#e3b94f';
        for (let x = 0; x <= 128; x += 16) for (let y = 0; y <= 256; y += 16) if ((x / 16 + y / 16) % 2 === 0) { c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); }
      });
      const wall = s.material('#3b2f38');
      s.box([2.4, 2.6, 0.16], [gx, 1.3, gz - 0.1], wall);
      s.box([1.18, 2.26, 0.2], [gx, 1.13, gz - 0.07], gold);
      s.mesh(new THREE.BoxGeometry(1.0, 2.14, 0.06), new THREE.MeshStandardMaterial({ map: leather, roughness: 0.6 }), [gx, 1.07, gz + 0.02]);
      s.cylinder(0.035, 0.035, 0.3, [gx + 0.38, 1.05, gz + 0.08], gold, 10);
      s.label(a.sign === 'vip' ? 'VIP' : 'PRIVATE', 0.36, 0.1, [gx, 1.75, gz + 0.055], '#3a0a12', '#e3b94f');
      for (const side of [-1, 1]) { s.cylinder(0.05, 0.07, 0.25, [gx + side * 0.85, 1.9, gz + 0.06], gold, 12); s.ball([0.07, 0.09, 0.07], [gx + side * 0.85, 2.08, gz + 0.06], s.material('#fff1c4', { emissive: '#ffd98a', emissiveIntensity: mix(0.5, 1.5, mood.cheer) }), 12); }
    } else if (a.guards === 'painting') {
      const wood = s.material('#5a3a22');
      for (const side of [-1, 1]) s.rod([gx + side * 0.42, 0, gz + 0.12], [gx + side * 0.1, 1.9, gz - 0.1], 0.022, wood);
      s.rod([gx, 0, gz - 0.6], [gx, 1.9, gz - 0.1], 0.022, wood);
      s.box([0.9, 0.04, 0.08], [gx, 0.72, gz + 0.06], wood);
      const hue = random();
      const picture = paint(160, 128, (c) => {
        const sky = c.createLinearGradient(0, 0, 0, 128);
        sky.addColorStop(0, `hsl(${hue * 360},45%,${mix(30, 70, mood.cheer)}%)`); sky.addColorStop(1, `hsl(${hue * 360 + 50},50%,75%)`);
        c.fillStyle = sky; c.fillRect(0, 0, 160, 128);
        c.fillStyle = `hsl(${hue * 360 + 30},80%,80%)`; c.beginPath(); c.arc(40 + random() * 80, 40, 14, 0, 7); c.fill();
        for (let k = 0; k < 3; k++) { c.fillStyle = `hsl(${hue * 360 + 140 + k * 15},35%,${34 - k * 8}%)`; c.beginPath(); c.moveTo(0, 128); let y = 70 + k * 16; for (let x = 0; x <= 160; x += 20) { y += (random() - 0.5) * 22; c.lineTo(x, y); } c.lineTo(160, 128); c.fill(); }
      });
      const tilt = -0.12;
      const frame = s.box([1.08, 0.9, 0.07], [gx, 1.22, gz + 0.03], gold); frame.rotation.x = tilt;
      const canvas = s.mesh(new THREE.PlaneGeometry(0.9, 0.72), new THREE.MeshStandardMaterial({ map: picture, roughness: 0.8 }), [gx, 1.22, gz + 0.07]); canvas.rotation.x = tilt; canvas.castShadow = false;
    } else if (a.guards === 'jewel') {
      s.box([0.55, 1.0, 0.55], [gx, 0.5, gz], s.material('#ece8dc'));
      s.box([0.6, 0.04, 0.6], [gx, 1.02, gz], s.material('#1b1b20'));
      s.box([0.5, 0.5, 0.5], [gx, 1.29, gz], new THREE.MeshPhysicalMaterial({ color: '#dff2ff', transparent: true, opacity: 0.22, roughness: 0.03, depthWrite: false }));
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.015, 0.5, 0.015], [gx + x * 0.25, 1.29, gz + z * 0.25], metal);
      s.box([0.53, 0.015, 0.53], [gx, 1.545, gz], metal);
      s.box([0.24, 0.07, 0.24], [gx, 1.075, gz], velvet);
      const stone = ['#ff3b5c', '#3bd6ff', '#5cff9a', '#fff2b0'][Math.floor(random() * 4)];
      s.mesh(new THREE.OctahedronGeometry(0.075), s.material(stone, { roughness: 0.05, emissive: stone, emissiveIntensity: mix(0.4, 1.3, mood.cheer) }), [gx, 1.2, gz]).rotation.y = 0.5;
    } else if (a.guards === 'chair') {
      s.box([0.62, 0.12, 0.58], [gx, 0.5, gz], velvet);
      s.box([0.66, 0.06, 0.62], [gx, 0.42, gz], gold);
      s.box([0.62, 0.95, 0.09], [gx, 1.0, gz - 0.27], velvet);
      s.box([0.7, 1.03, 0.06], [gx, 1.0, gz - 0.31], gold);
      s.ring(0.3, 0.04, [gx, 1.5, gz - 0.31], gold, Math.PI);
      s.ball([0.07, 0.07, 0.07], [gx, 1.84, gz - 0.31], gold);
      for (const x of [-1, 1]) {
        s.box([0.08, 0.07, 0.56], [gx + x * 0.35, 0.74, gz], gold);
        s.box([0.07, 0.3, 0.07], [gx + x * 0.35, 0.58, gz + 0.24], gold);
        for (const z of [-1, 1]) s.lathe([[0.03, 0], [0.05, 0.03], [0.03, 0.2], [0.05, 0.4]], gold, [gx + x * 0.28, 0, gz + z * 0.24]);
      }
    } else if (a.guards === 'puddle') {
      const water = s.mesh(new THREE.CircleGeometry(0.5, 24), s.material('#7ea7b8', { roughness: 0.05, metalness: 0.5 }), [gx, 0.004, gz + 0.1]);
      water.rotation.x = -Math.PI / 2; water.scale.set(1.3, 0.8, 1); water.castShadow = false;
      const cone = s.mesh(new THREE.ConeGeometry(0.17, 0.62, 4, 1, true), s.material('#f2c416', { side: THREE.DoubleSide }), [gx + 0.15, 0.31, gz - 0.05]);
      cone.rotation.y = 0.5;
      s.label('WET', 0.16, 0.09, [gx + 0.2, 0.3, gz + 0.045], '#16181c', '#f2c416').rotation.set(-0.28, 0.5, 0, 'YXZ');
    }

    const sway = mix(0, 0.14, mood.energy);
    return s.finish({
      update: (_dt, time) => { for (const swing of swings) swing.group.setRotationFromAxisAngle(swing.axis, Math.sin(time * 1.7 + swing.phase) * sway); },
    });
  },
});
