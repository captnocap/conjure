import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = readonly [number, number, number];
interface Frame { p: THREE.Vector3; t: THREE.Vector3; n: THREE.Vector3; b: THREE.Vector3; r: number }

/** A tube whose radius changes along a curve; frames are carried along so parts can be attached. */
function taper(points: readonly P3[], radius: (u: number) => number, flat = 1, segments = 36, sides = 12) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const position: number[] = [], uv: number[] = [], index: number[] = [];
  const frames: Frame[] = [];
  const n = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const p = curve.getPoint(u), t = curve.getTangent(u).normalize();
    n.addScaledVector(t, -n.dot(t)).normalize();
    const b = new THREE.Vector3().crossVectors(t, n);
    const r = radius(u);
    frames.push({ p, t, n: n.clone(), b, r });
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      const v = p.clone().addScaledVector(n, Math.cos(angle) * r * flat).addScaledVector(b, Math.sin(angle) * r);
      position.push(v.x, v.y, v.z);
      uv.push(j / sides, u);
    }
  }
  const ring = sides + 1;
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * ring + j;
      index.push(a, a + 1, a + ring, a + 1, a + ring + 1, a + ring);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const at = (u: number) => frames[Math.round(THREE.MathUtils.clamp(u, 0, 1) * segments)];
  return { geometry, at };
}

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const COATS = {
  mud: 'Mottled grey-brown with darker saddles, almost invisible against the bank.',
  'blue-spotted': 'Olive brown scattered with electric blue freckles that catch the light.',
  barred: 'Sandy tan with dark slanting bars down the flank, like a tiny tiger.',
  slate: 'Dark wet slate with a pale cream belly, sleek and serious.',
  ghost: 'Pale bleached sand, nearly white, sun-dried and ghostly.',
} as const;
const COAT_COLOURS: Record<keyof typeof COATS, { base: string; dark: string; belly: string; spot: string | null }> = {
  mud: { base: '#84705a', dark: '#4e4034', belly: '#b8a88e', spot: null },
  'blue-spotted': { base: '#6f6a45', dark: '#474426', belly: '#b9b48c', spot: '#39c9f0' },
  barred: { base: '#b89a66', dark: '#523a22', belly: '#e0d0a8', spot: null },
  slate: { base: '#3d4750', dark: '#22282e', belly: '#d9d2bb', spot: '#9fb4c0' },
  ghost: { base: '#d8ccb2', dark: '#a39478', belly: '#efe8d6', spot: null },
};
const FINS = {
  plain: 'A plain smoky translucent sail the colour of the fish.',
  'blue-dotted': 'A dark sail sprinkled with bright blue dots.',
  'red-edged': 'A black sail with a hot red margin and a white rim, a warning flag.',
  flame: 'An orange and yellow flame of a fin, shameless.',
} as const;

export default defineThing({
  questions: {
    posture: choice('What is the mudskipper doing right now?', {
      resting: 'Resting flat on the mud, propped on its fins, fin half folded, watching.',
      displaying: 'Reared up on its fins with the sail fin fully raised, showing off.',
      leaping: 'Caught mid-leap, flung clear of the mud with its tail whipping.',
      gaping: 'Mouth stretched wide open at a rival, a silent shout.',
      crawling: 'Dragging itself forward on its fins like a tiny seal, tail trailing.',
    }),
    coat: choice('What is its colouring?', COATS),
    fin: choice('What does the raised dorsal fin look like?', FINS),
    company: choice('How many are on the bank?', {
      alone: 'One, sole owner of its patch.',
      pair: 'Two squared off nose to nose over a border.',
      colony: 'A handful scattered over the bank, all facing different ways.',
    }),
    bank: choice('What is the mud bank like?', {
      slick: 'Glossy wet mud with a shallow puddle left by the tide.',
      burrow: 'A raised mud turret around a water-filled burrow mouth.',
      roots: 'Mud pierced by a little forest of pencil roots.',
      cracked: 'Drying mud split into pale cracked tiles.',
      leaf: 'Bare mud with a fallen yellow mangrove leaf lying on it.',
    }),
    size: score('How big is it?', ['A thumbnail juvenile', 'Finger length', 'A fat hand-long giant']),
    trail: noul('Has it left a trail of fin prints across the mud behind it?'),
    wink: noul('Is it mid-blink, one goggle eye pulled down into its head?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const coat = COAT_COLOURS[a.coat];
    const length = mix(0.06, 0.2, a.size);
    const bankRadius = length * { alone: 0.72, pair: 0.98, colony: 1.12 }[a.company];
    const bankHeight = bankRadius * 0.11;

    // Skin: circumference across, tail-to-snout up. uv.x 0.25 is the back, 0.75 the belly.
    const skin = paint(128, 256, (ctx) => {
      ctx.fillStyle = coat.base;
      ctx.fillRect(0, 0, 128, 256);
      const belly = ctx.createLinearGradient(56, 0, 128, 0);
      belly.addColorStop(0, 'rgba(0,0,0,0)');
      belly.addColorStop(0.5, coat.belly);
      belly.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = belly;
      ctx.fillRect(56, 0, 72, 256);
      ctx.fillStyle = coat.dark;
      if (a.coat === 'barred') {
        for (let i = 0; i < 9; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * 30); ctx.lineTo(64, i * 30 - 22); ctx.lineTo(64, i * 30 - 10); ctx.lineTo(0, i * 30 + 12);
          ctx.fill();
        }
      } else {
        ctx.globalAlpha = 0.75;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.ellipse(32 + (random() - 0.5) * 12, 20 + i * 40, 26 + random() * 8, 9 + random() * 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let i = 0; i < 60; i++) ctx.fillRect(random() * 128, random() * 256, 3, 3);
        ctx.globalAlpha = 1;
      }
      if (coat.spot) {
        ctx.fillStyle = coat.spot;
        for (let i = 0; i < 70; i++) {
          ctx.beginPath();
          ctx.arc((random() * 0.62 + 0.94) * 128 % 128, random() * 256, 1.6 + random() * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Mud splashed up from below as things get rougher.
      ctx.fillStyle = '#5b4a3a';
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < mood.wear * 90; i++) ctx.fillRect(70 + random() * 50, random() * 256, 5, 4);
    });
    const body = new THREE.MeshStandardMaterial({ map: skin, roughness: mix(0.28, 0.6, mood.wear) });
    const flesh = s.material(coat.base, { roughness: 0.4 });
    const finTexture = paint(128, 64, (ctx) => {
      const colours = { plain: [coat.base, coat.dark], 'blue-dotted': ['#2a2f3a', '#171a22'], 'red-edged': ['#1d1b1e', '#101012'], flame: ['#f08a1c', '#d8401a'] }[a.fin];
      const fill = ctx.createLinearGradient(0, 64, 0, 0);
      fill.addColorStop(0, colours[1]);
      fill.addColorStop(1, colours[0]);
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, 128, 64);
      if (a.fin === 'flame') { ctx.fillStyle = '#ffd94a'; ctx.fillRect(0, 0, 128, 14); }
      if (a.fin === 'red-edged') { ctx.fillStyle = '#e8283a'; ctx.fillRect(0, 5, 128, 13); ctx.fillStyle = '#f6f2e6'; ctx.fillRect(0, 0, 128, 5); }
      if (a.fin === 'blue-dotted') {
        ctx.fillStyle = '#4fd6ff';
        for (let i = 0; i < 46; i++) { ctx.beginPath(); ctx.arc(random() * 128, random() * 60, 2.4, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5;
      for (let x = 6; x < 128; x += 12) { ctx.beginPath(); ctx.moveTo(x, 64); ctx.lineTo(x + 3, 0); ctx.stroke(); }
    });
    const finPaint = new THREE.MeshStandardMaterial({ map: finTexture, side: THREE.DoubleSide, roughness: 0.5, emissive: a.fin === 'flame' ? '#7a2a05' : a.fin === 'red-edged' ? '#3a0508' : '#000000', emissiveIntensity: mix(0.2, 0.7, mood.cheer) });
    const eyeWhite = s.material('#d9c98a', { roughness: 0.2 });
    const pupil = s.material('#0d0d0f', { roughness: 0.1 });
    const mouthPaint = s.material('#e9a6a0', { roughness: 0.5 });

    type Posture = typeof a.posture;
    const movers: { group: THREE.Group; posture: Posture; phase: number; baseY: number }[] = [];

    const fish = (L: number, posture: Posture, blink: boolean) => {
      const group = new THREE.Group();
      const R = L * 0.105;
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh; };
      const spine: Record<Posture, P3[]> = {
        resting: [[0.06 * L, R * 0.7, -0.5 * L], [0, R * 0.8, -0.2 * L], [0, R * 1.05, 0.15 * L], [0, R * 1.7, 0.5 * L]],
        crawling: [[-0.1 * L, R * 0.6, -0.5 * L], [0.03 * L, R * 0.75, -0.2 * L], [0, R * 1.0, 0.15 * L], [0, R * 1.5, 0.5 * L]],
        displaying: [[0.3 * L, R * 0.7, -0.33 * L], [0.04 * L, R * 0.8, -0.24 * L], [0, R * 1.5, 0.1 * L], [0, R * 3.6, 0.42 * L]],
        gaping: [[-0.22 * L, R * 0.7, -0.4 * L], [-0.02 * L, R * 0.8, -0.22 * L], [0, R * 1.3, 0.12 * L], [0, R * 3.0, 0.45 * L]],
        leaping: [[0.1 * L, R * 2.2, -0.46 * L], [0, R * 4.4, -0.2 * L], [0, R * 5.4, 0.14 * L], [0, R * 4.8, 0.48 * L]],
      };
      const profile = (u: number) => {
        const swell = mix(0.2, 1, THREE.MathUtils.smoothstep(u, 0, 0.78));
        const nose = u > 0.84 ? Math.sqrt(Math.max(0, 1 - ((u - 0.84) / 0.16) ** 2)) : 1;
        return R * swell * nose * (u < 0.04 ? u / 0.04 * 0.6 + 0.4 : 1);
      };
      const { geometry, at } = taper(spine[posture], profile, 0.92);
      add(new THREE.Mesh(geometry, body));
      const basis = (f: Frame) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.n, f.b, f.t));

      // Goggle eyes riding on top of the head.
      const head = at(0.9);
      for (const side of [-1, 1]) {
        const down = blink && side === 1;
        const centre = head.p.clone().addScaledVector(head.b, R * (down ? 0.72 : 1.12)).addScaledVector(head.n, side * R * 0.42);
        const ball = add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.44, 14, 10), down ? flesh : eyeWhite));
        ball.position.copy(centre);
        if (down) continue;
        const iris = add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.27, 10, 8), pupil));
        iris.position.copy(centre).addScaledVector(head.n, side * R * 0.2).addScaledVector(head.t, R * 0.16).addScaledVector(head.b, R * 0.06);
        const socket = add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.46, 12, 8), flesh));
        socket.position.copy(centre).addScaledVector(head.b, -R * 0.3);
      }
      // A wide frog mouth, or a pink gape.
      const snout = at(0.97);
      const gape = posture === 'gaping';
      const mouth = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), gape ? mouthPaint : pupil));
      mouth.scale.set(R * (gape ? 0.72 : 0.8), R * (gape ? 0.62 : 0.07), R * (gape ? 0.4 : 0.42));
      mouth.position.copy(snout.p).addScaledVector(snout.b, -R * (gape ? 0.1 : 0.3)).addScaledVector(snout.t, gape ? R * 0.42 : R * 0.12);
      mouth.quaternion.copy(basis(snout));
      if (gape) {
        const throat = add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.4, 10, 8), s.material('#5a1f24')));
        throat.position.copy(mouth.position).addScaledVector(snout.t, R * 0.18);
        const jaw = add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), flesh));
        jaw.scale.set(R * 0.8, R * 0.2, R * 0.6);
        jaw.position.copy(snout.p).addScaledVector(snout.b, -R * 0.85).addScaledVector(snout.t, R * 0.25);
        jaw.quaternion.copy(basis(snout)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.5));
      }

      // Sail fins: a strip standing on the spine, with a painted membrane.
      const sail = (from: number, to: number, tall: number, rake: number) => {
        const steps = 10, position: number[] = [], uv: number[] = [], index: number[] = [];
        for (let i = 0; i <= steps; i++) {
          const k = i / steps, f = at(mix(from, to, k));
          const lift = tall * R * Math.sin(Math.PI * Math.min(1, 0.12 + k * 0.95)) ** 0.6;
          const foot = f.p.clone().addScaledVector(f.b, f.r * 0.9);
          const tip = foot.clone().addScaledVector(f.b, lift).addScaledVector(f.t, -rake * lift);
          position.push(foot.x, foot.y, foot.z, tip.x, tip.y, tip.z);
          uv.push(k, 0, k, 1);
          if (i < steps) index.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geometry.setIndex(index);
        geometry.computeVertexNormals();
        add(new THREE.Mesh(geometry, finPaint));
      };
      const raised = { resting: 0.9, crawling: 0.5, displaying: 3.1, gaping: 2.6, leaping: 2.2 }[posture];
      sail(0.5, 0.74, raised, 0.35);
      sail(0.14, 0.44, 0.75 + raised * 0.22, 0.5);

      // Tail fan.
      const tail = at(0);
      const fan = add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), finPaint));
      fan.scale.set(R * 0.07, R * 0.95, R * 1.25);
      fan.position.copy(tail.p).addScaledVector(tail.t, -R * 1.0);
      fan.quaternion.copy(basis(tail));

      // Arm-like pectoral fins: a muscular stalk and a webbed hand planted on the mud.
      const shoulder = at(0.7);
      for (const side of [-1, 1]) {
        const from = shoulder.p.clone().addScaledVector(shoulder.n, side * shoulder.r * 0.75).addScaledVector(shoulder.b, -shoulder.r * 0.3);
        const to = posture === 'leaping'
          ? from.clone().addScaledVector(shoulder.n, side * R * 1.4).addScaledVector(shoulder.t, -R * 1.8)
          : new THREE.Vector3(from.x + side * R * 1.5, R * 0.14, from.z + R * (posture === 'crawling' ? side * 0.9 : 0.5));
        const direction = to.clone().sub(from);
        const arm = add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.22, R * 0.34, direction.length(), 8), flesh));
        arm.position.copy(from).add(to).multiplyScalar(0.5);
        arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        const hand = add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), finPaint));
        hand.scale.set(R * 0.85, R * 0.12, R * 0.75);
        hand.position.copy(to).addScaledVector(new THREE.Vector3(side, 0, 0.3), R * 0.45);
        if (posture === 'leaping') hand.quaternion.copy(basis(shoulder));
        else hand.rotation.y = -side * 0.5;
      }
      return group;
    };

    // The bank.
    const mudColour = new THREE.Color('#6a5646').lerp(new THREE.Color('#7d5a3c'), mood.warmth * 0.6).lerp(new THREE.Color('#8b8478'), a.bank === 'cracked' ? 0.45 : 0);
    const mudTexture = paint(256, 256, (ctx) => {
      ctx.fillStyle = `#${mudColour.getHexString()}`;
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,240,215,0.08)';
        ctx.beginPath();
        ctx.arc(random() * 256, random() * 256, 2 + random() * 9, 0, Math.PI * 2);
        ctx.fill();
      }
      if (a.bank === 'cracked') {
        ctx.strokeStyle = 'rgba(40,28,20,0.85)';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 46; i++) {
          let x = random() * 256, y = random() * 256;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let k = 0; k < 4; k++) { x += (random() - 0.5) * 60; y += (random() - 0.5) * 60; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
    });
    mudTexture.wrapS = mudTexture.wrapT = THREE.RepeatWrapping;
    const mud = new THREE.MeshStandardMaterial({ map: mudTexture, roughness: a.bank === 'cracked' ? 0.95 : mix(0.22, 0.5, mood.wear), metalness: a.bank === 'cracked' ? 0 : 0.15 });
    const H = bankHeight, BR = bankRadius;
    const mound = s.lathe([[BR * 1.04, 0], [BR * 0.97, H * 0.3], [BR * 0.84, H * 0.72], [BR * 0.62, H], [0, H]], mud);
    mound.scale.z = 0.86;
    const water = s.material(new THREE.Color('#7c6a4e').lerp(new THREE.Color('#9db6bd'), 0.35), { roughness: 0.05, metalness: 0.35 });
    const wetSkirt = s.cylinder(BR * 1.14, BR * 1.14, 0.0015, [0, 0.0008, 0], water, 40);
    wetSkirt.scale.z = 0.9;

    const count = a.company === 'alone' ? 1 : a.company === 'pair' ? 2 : 3 + Math.floor(random() * 2 + mood.density * 1.5);
    const yaw = 0.55;
    const spots: { x: number; z: number; turn: number; L: number; posture: Posture }[] = [];
    if (a.company === 'pair') {
      spots.push({ x: -length * 0.33, z: -length * 0.2, turn: yaw + 0.5, L: length, posture: a.posture });
      spots.push({ x: length * 0.42, z: length * 0.42, turn: yaw + 0.5 + Math.PI, L: length * mix(0.78, 0.95, random()), posture: a.posture === 'leaping' ? 'gaping' : a.posture === 'resting' ? 'resting' : 'displaying' });
    } else {
      spots.push({ x: 0, z: 0, turn: yaw, L: length, posture: a.posture });
      const others: Posture[] = ['resting', 'crawling', 'displaying', 'resting', 'gaping'];
      for (let i = 1; i < count; i++) {
        const angle = (i / (count - 1)) * Math.PI * 2 + random() * 0.6 + 1;
        spots.push({ x: Math.sin(angle) * BR * 0.6, z: Math.cos(angle) * BR * 0.5, turn: random() * Math.PI * 2, L: length * mix(0.4, 0.62, random()), posture: others[Math.floor(random() * others.length)] });
      }
    }
    spots.forEach((spot, i) => {
      const group = fish(spot.L, spot.posture, a.wink && i === 0);
      group.position.set(spot.x, H, spot.z);
      group.rotation.y = spot.turn;
      s.root.add(group);
      movers.push({ group, posture: spot.posture, phase: random() * 6, baseY: H });
    });
    const main = spots[0];
    const back = new THREE.Vector3(-Math.sin(main.turn), 0, -Math.cos(main.turn));
    const sideways = new THREE.Vector3(back.z, 0, -back.x);

    if (a.trail) {
      const print = s.material(mudColour.clone().multiplyScalar(0.55), { roughness: 0.3 });
      for (let i = 1; i <= 7; i++) {
        const along = main.L * (0.45 + i * 0.2);
        for (const side of [-1, 1]) {
          const x = main.x + back.x * along + sideways.x * side * main.L * 0.19, z = main.z + back.z * along + sideways.z * side * main.L * 0.19;
          if (Math.hypot(x, z / 0.86) > BR * 0.92) continue;
          const dent = s.ball([main.L * 0.07, 0.0012, main.L * 0.05], [x, H * (Math.hypot(x, z) > BR * 0.62 ? 0.82 : 1), z], print, 8);
          dent.rotation.y = main.turn + side * 0.6;
        }
        const drag = s.ball([main.L * 0.035, 0.001, main.L * 0.11], [main.x + back.x * along, H, main.z + back.z * along], print, 8);
        drag.rotation.y = main.turn;
        if (Math.hypot(drag.position.x, drag.position.z) > BR * 0.62) drag.visible = false;
      }
    }
    if (a.posture === 'leaping') {
      // Flung mud under the jumper.
      const drops = Array.from({ length: 9 }, () => ({ at: [main.x + (random() - 0.5) * main.L * 0.7, H + random() * main.L * 0.4, main.z + (random() - 0.5) * main.L * 0.7] as [number, number, number], size: main.L * mix(0.012, 0.03, random()) }));
      s.scatter(new THREE.SphereGeometry(1, 6, 5), mud, drops);
      s.ring(main.L * 0.16, main.L * 0.02, [main.x, H, main.z], mud).rotation.x = Math.PI / 2;
    }

    const free = (minimum: number) => {
      for (let attempt = 0; attempt < 30; attempt++) {
        const angle = random() * Math.PI * 2, reach = BR * mix(0.25, 0.58, random());
        const x = Math.sin(angle) * reach, z = Math.cos(angle) * reach * 0.86;
        if (spots.every((spot) => Math.hypot(spot.x - x, spot.z - z) > spot.L * 0.5 + minimum)) return [x, z] as const;
      }
      return [BR * 0.5, -BR * 0.3] as const;
    };
    if (a.bank === 'slick') {
      const [x, z] = free(BR * 0.2);
      const puddle = s.cylinder(BR * 0.24, BR * 0.24, 0.001, [x, H + 0.0006, z], water, 24);
      puddle.scale.set(1.3, 1, 0.8);
      puddle.rotation.y = random() * 3;
    } else if (a.bank === 'burrow') {
      const [x, z] = free(BR * 0.2);
      const r = BR * 0.15;
      s.lathe([[r * 1.5, 0], [r * 1.1, r * 0.25], [r * 0.8, r * 0.6], [r * 0.62, r * 0.55], [r * 0.55, 0]], mud, [x, H, z]);
      s.cylinder(r * 0.6, r * 0.6, 0.001, [x, H + r * 0.3, z], s.material('#2c2520', { roughness: 0.05, metalness: 0.4 }), 16);
      s.scatter(new THREE.SphereGeometry(1, 6, 5), mud, Array.from({ length: 16 }, () => { const g = random() * 6.3, d = r * mix(1.5, 2.6, random()); return { at: [x + Math.sin(g) * d, H + r * 0.08, z + Math.cos(g) * d] as [number, number, number], size: r * 0.13 }; }));
    } else if (a.bank === 'roots') {
      const bark = s.material('#4a3d33', { roughness: 0.9 });
      const n = 9 + Math.floor(mood.density * 12);
      for (let i = 0; i < n; i++) {
        const [x, z] = free(BR * 0.05);
        const tall = BR * mix(0.1, 0.3, random());
        s.rod([x, H * 0.5, z], [x + (random() - 0.5) * 0.004, H + tall, z + (random() - 0.5) * 0.004], BR * 0.022, bark, BR * 0.008);
      }
    } else if (a.bank === 'leaf') {
      const [x, z] = free(BR * 0.22);
      const shape = new THREE.Shape();
      shape.moveTo(0, -1);
      shape.quadraticCurveTo(0.55, -0.2, 0, 1);
      shape.quadraticCurveTo(-0.55, -0.2, 0, -1);
      const leaf = s.mesh(new THREE.ShapeGeometry(shape, 10), s.material(mood.cheer > 0.5 ? '#e2b62c' : '#b9862a', { side: THREE.DoubleSide, roughness: 0.4 }), [x, H + 0.0012, z]);
      leaf.scale.setScalar(BR * 0.3);
      leaf.rotation.set(-Math.PI / 2 + 0.06, 0, random() * 6);
      s.rod([x, H + 0.0016, z], [x + Math.sin(leaf.rotation.z) * -BR * 0.36, H + 0.003, z + Math.cos(leaf.rotation.z) * -BR * 0.36], BR * 0.006, s.material('#7a5a22'));
    }
    // Loose pellets and shell grit thicken with density.
    const pellets = Array.from({ length: Math.floor(6 + mood.density * 30) }, () => {
      const angle = random() * Math.PI * 2, reach = BR * mix(0.5, 0.98, random());
      return { at: [Math.sin(angle) * reach, reach > BR * 0.62 ? H * 0.5 : H, Math.cos(angle) * reach * 0.86] as [number, number, number], size: BR * mix(0.012, 0.026, random()), color: random() < 0.2 ? '#d8d2c2' : '#ffffff' };
    });
    s.scatter(new THREE.SphereGeometry(1, 6, 5), mud, pellets);

    const energy = mix(0.25, 1.6, mood.energy);
    return s.finish({
      footprint: BR * 1.1,
      update: (_dt, time) => {
        for (const mover of movers) {
          if (mover.posture === 'leaping') {
            mover.group.position.y = mover.baseY + Math.abs(Math.sin(time * 2.2 * energy + mover.phase)) * length * 0.18;
            mover.group.rotation.x = Math.sin(time * 2.2 * energy + mover.phase) * 0.12;
          } else {
            // Push-ups and a nervous shuffle.
            mover.group.rotation.x = -(Math.max(0, Math.sin(time * 1.7 * energy + mover.phase)) ** 6) * 0.14;
            mover.group.rotation.z = Math.sin(time * 0.9 * energy + mover.phase) * 0.025;
          }
        }
      },
    });
  },
});
