import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = readonly [number, number, number];

/** A tube that narrows along a curve, flattened across `side`. */
function taper(points: readonly P3[], from: number, to: number, side: P3, flat = 1, segments = 14, sides = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const position: number[] = [], index: number[] = [];
  const n = new THREE.Vector3(...side);
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const p = curve.getPoint(u), t = curve.getTangent(u).normalize();
    n.addScaledVector(t, -n.dot(t)).normalize();
    const b = new THREE.Vector3().crossVectors(t, n);
    const r = mix(from, to, u) * (i === 0 ? 0.6 : 1);
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      const v = p.clone().addScaledVector(n, Math.cos(angle) * r * flat).addScaledVector(b, Math.sin(angle) * r);
      position.push(v.x, v.y, v.z);
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
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

function paint(size: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const CLAWS = {
  orange: 'Hot traffic-cone orange fading to a cream tip.',
  red: 'Lacquer red, a boxing glove.',
  white: 'Chalk white, a porcelain shield flashing in the sun.',
  lemon: 'Bright lemon yellow.',
  violet: 'Purple at the wrist blushing to pink fingers.',
  blue: 'Unlikely sky blue, like a toy.',
} as const;
const CLAW_COLOURS: Record<keyof typeof CLAWS, [string, string]> = {
  orange: ['#f2701d', '#fbe6c0'], red: ['#c81e24', '#f3b9a0'], white: ['#f1ede2', '#ffffff'],
  lemon: ['#f2cf2b', '#fff6c8'], violet: ['#7b3fa6', '#f2a5c8'], blue: ['#3d9be0', '#d9f1ff'],
};
const SHELLS = {
  mud: 'Dull mottled mud brown, built to vanish.',
  porcelain: 'Pale blue-white blotched with ink, like a broken teacup.',
  banded: 'Black crossed by crisp white bands.',
  turquoise: 'Bright turquoise freckled with black.',
  ember: 'Dark shell flushed with a red-orange saddle.',
} as const;

export default defineThing({
  questions: {
    claw: choice('What colour is the big claw?', CLAWS),
    doing: choice('What is the crab doing?', {
      waving: 'Claw flung high overhead in a beckoning wave to any female watching.',
      guarding: 'Claw held across its face like a shield, squared up in the doorway.',
      feeding: 'Big claw resting on the mud while the small one spoons mud to its mouth.',
      retreating: 'Half down its burrow, only eyes and the claw still showing.',
      duelling: 'Locked claw to claw with a rival, pushing.',
    }),
    clawSize: score('How large is the big claw compared with the body?', ['Merely oversized', 'As big as the crab', 'Absurd, bigger than the whole animal']),
    shell: choice('What does its back look like?', SHELLS),
    burrow: choice('What is the burrow entrance like?', {
      hole: 'A plain neat round hole in the mud.',
      chimney: 'A raised mud chimney, a little turret around the hole.',
      hood: 'A half-dome mud hood arched over the hole like a porch.',
      plugged: 'Sealed with a mud plug against the coming tide.',
    }),
    pellets: choice('What pattern have its feeding pellets left on the mud?', {
      spokes: 'Neat lines of sand balls radiating from the burrow like a sunburst.',
      rings: 'Concentric arcs of pellets around the burrow.',
      scattered: 'Pellets strewn at random all over.',
      clean: 'None: the tide has just wiped the flat smooth.',
    }),
    neighbours: choice('Who else is on the flat?', {
      alone: 'Nobody, one crab and its door.',
      few: 'Two or three smaller crabs at their own holes in the background.',
      crowd: 'A whole waving neighbourhood of little crabs.',
    }),
    tracks: noul('Are there fine dotted leg tracks stitched across the mud?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.032;
    const BR = W * { alone: 2.5, few: 3.0, crowd: 3.5 }[a.neighbours], H = W * 0.3;
    const [clawBase, clawTip] = CLAW_COLOURS[a.claw];
    const glow = mix(0.05, 0.35, mood.cheer);
    const shellBase = { mud: '#6d5a48', porcelain: '#cfdde6', banded: '#1b1b1f', turquoise: '#1fb3ac', ember: '#3a2c2a' }[a.shell];
    const shellTexture = paint(128, (ctx) => {
      ctx.fillStyle = shellBase;
      ctx.fillRect(0, 0, 128, 128);
      if (a.shell === 'mud') for (let i = 0; i < 50; i++) { ctx.fillStyle = random() < 0.5 ? '#4a3c30' : '#8a7662'; ctx.beginPath(); ctx.arc(random() * 128, random() * 128, 3 + random() * 6, 0, 7); ctx.fill(); }
      if (a.shell === 'porcelain') for (let i = 0; i < 16; i++) { ctx.fillStyle = '#1e2a44'; ctx.beginPath(); ctx.ellipse(random() * 128, random() * 128, 4 + random() * 10, 3 + random() * 6, random() * 3, 0, 7); ctx.fill(); }
      if (a.shell === 'banded') { ctx.fillStyle = '#f0ece0'; for (const y of [30, 62, 92]) ctx.fillRect(0, y, 128, 11); }
      if (a.shell === 'turquoise') for (let i = 0; i < 60; i++) { ctx.fillStyle = '#0c2b2e'; ctx.beginPath(); ctx.arc(random() * 128, random() * 128, 2.5, 0, 7); ctx.fill(); }
      if (a.shell === 'ember') { const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 52); g.addColorStop(0, '#f2602a'); g.addColorStop(1, 'rgba(242,96,42,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); }
    });
    const shell = new THREE.MeshStandardMaterial({ map: shellTexture, roughness: mix(0.3, 0.7, mood.wear) });
    const legPaint = s.material(new THREE.Color(shellBase).lerp(new THREE.Color('#7a4a36'), 0.55), { roughness: 0.5 });
    const clawPaint = s.material(clawBase, { roughness: 0.35, emissive: clawBase, emissiveIntensity: glow });
    const tipPaint = s.material(clawTip, { roughness: 0.3, emissive: clawTip, emissiveIntensity: glow * 0.5 });
    const dark = s.material('#121214', { roughness: 0.2 });

    const wavers: { pivot: THREE.Group; base: THREE.Quaternion; phase: number; swing: number }[] = [];
    type Doing = typeof a.doing;

    const crab = (w: number, doing: Doing, side: number, clawScale: number, hero: boolean) => {
      const group = new THREE.Group();
      const add = <T extends THREE.Object3D>(node: T) => { node.traverse((child) => { child.castShadow = child.receiveShadow = true; }); group.add(node); return node; };
      // Carapace: a squared-off dome, wider at the front, mapped from above.
      const dome = new THREE.SphereGeometry(1, 20, 12);
      const pos = dome.attributes.position, uv = dome.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const square = (v: number) => Math.sign(v) * Math.abs(v) ** 0.6;
        let x = square(pos.getX(i)), y = pos.getY(i), z = square(pos.getZ(i));
        y = y > 0 ? y ** 0.7 * 0.8 : y;
        x *= mix(0.74, 1.04, (z + 1) / 2);
        uv.setXY(i, x * 0.5 + 0.5, z * 0.5 + 0.5);
        pos.setXYZ(i, x * w * 0.5, y * w * 0.2, z * w * 0.33);
      }
      dome.computeVertexNormals();
      const bodyY = w * 0.46;
      const carapace = add(new THREE.Mesh(dome, shell));
      carapace.position.y = bodyY;
      carapace.rotation.x = -0.16;
      // Stalked eyes.
      for (const e of [-1, 1]) {
        const lean = e * (hero && doing === 'waving' ? 0.16 : 0.08);
        const stalk = add(new THREE.Mesh(new THREE.CylinderGeometry(w * 0.02, w * 0.028, w * 0.42, 6), legPaint));
        stalk.position.set(e * w * 0.12 + lean * w * 0.5, bodyY + w * 0.3, w * 0.28);
        stalk.rotation.z = -lean * 2;
        const eye = add(new THREE.Mesh(new THREE.SphereGeometry(w * 0.05, 8, 6), dark));
        eye.scale.y = 1.5;
        eye.position.set(e * w * 0.12 + lean * w, bodyY + w * 0.53, w * 0.28);
      }
      // Eight walking legs: thigh up to a knee, shin down to a point.
      for (const e of [-1, 1])
        for (let i = 0; i < 4; i++) {
          const z = mix(0.12, -0.24, i / 3) * w, spread = mix(0.5, -0.85, i / 3) + (random() - 0.5) * 0.2;
          const root = new THREE.Vector3(e * w * 0.4, bodyY - w * 0.05, z);
          const out = new THREE.Vector3(e * Math.cos(spread), 0, Math.sin(spread));
          const knee = root.clone().addScaledVector(out, w * 0.42).setY(bodyY + w * 0.2);
          const foot = root.clone().addScaledVector(out, w * mix(0.85, 1.0, random())).setY(0);
          for (const [from, to, r0, r1] of [[root, knee, 0.055, 0.045], [knee, foot, 0.045, 0.008]] as const) {
            const span = to.clone().sub(from);
            const limb = add(new THREE.Mesh(new THREE.CylinderGeometry(w * r1, w * r0, span.length(), 6), legPaint));
            limb.position.copy(from).add(to).multiplyScalar(0.5);
            limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.normalize());
          }
        }
      // The small feeding claw.
      const small = new THREE.Vector3(-side * w * 0.3, bodyY - w * 0.08, w * 0.3);
      const smallTo = doing === 'feeding' ? new THREE.Vector3(-side * w * 0.08, bodyY - w * 0.02, w * 0.42) : new THREE.Vector3(-side * w * 0.36, w * 0.12, w * 0.56);
      const span = smallTo.clone().sub(small);
      const nipper = add(new THREE.Mesh(new THREE.CylinderGeometry(w * 0.03, w * 0.045, span.length(), 6), legPaint));
      nipper.position.copy(small).add(smallTo).multiplyScalar(0.5);
      nipper.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.normalize());
      const pinch = add(new THREE.Mesh(new THREE.SphereGeometry(w * 0.06, 8, 6), tipPaint));
      pinch.position.copy(smallTo);

      // The great claw, built along +x in the xy plane and then aimed.
      const L = w * mix(1.35, 2.7, clawScale);
      const claw = new THREE.Group();
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.05, L * 0.05, L * 0.3, 8), legPaint);
      arm.rotation.z = Math.PI / 2;
      arm.position.x = L * 0.13;
      const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), clawPaint);
      palm.scale.set(L * 0.26, L * 0.2, L * 0.1);
      palm.position.x = L * 0.42;
      const open = doing === 'waving' ? 0.05 : doing === 'duelling' ? 0.1 : 0;
      const lower = new THREE.Mesh(taper([[L * 0.5, -L * 0.1, 0], [L * 0.78, -L * 0.13, 0], [L * 1.0, -L * 0.02, 0]], L * 0.075, L * 0.012, [0, 0, 1], 0.6), tipPaint);
      const upper = new THREE.Mesh(taper([[L * 0.5, L * 0.1, 0], [L * 0.76, L * (0.17 + open), 0], [L * 1.0, L * (0.03 + open * 1.6), 0]], L * 0.07, L * 0.012, [0, 0, 1], 0.6), tipPaint);
      claw.add(arm, palm, lower, upper);
      const aim: Record<Doing, [P3, P3]> = {
        waving: [[side * 0.5, 1, 0.15], [0, 0, 1]],
        guarding: [[-side, 0.12, 0.42], [0, 0, 1]],
        retreating: [[-side * 0.8, 0.5, 0.3], [0, 0, 1]],
        feeding: [[side * 0.45, -0.16, 0.9], [side, 0, 0]],
        duelling: [[-side * 0.25, 0.3, 1], [side, 0.4, 0]],
      };
      const x = new THREE.Vector3(...aim[doing][0]).normalize();
      const z = new THREE.Vector3(...aim[doing][1]);
      z.addScaledVector(x, -z.dot(x)).normalize();
      const pivot = new THREE.Group();
      pivot.position.set(side * w * 0.42, bodyY + w * 0.02, w * 0.26);
      pivot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, new THREE.Vector3().crossVectors(z, x), z));
      pivot.add(claw);
      add(pivot);
      if (doing === 'waving' || doing === 'duelling') wavers.push({ pivot, base: pivot.quaternion.clone(), phase: random() * 6, swing: doing === 'waving' ? 0.45 : 0.08 });
      return group;
    };

    // The flat.
    const mudColour = new THREE.Color('#8a7660').lerp(new THREE.Color('#a8885c'), mood.warmth * 0.7);
    const mudTexture = paint(256, (ctx) => {
      ctx.fillStyle = `#${mudColour.getHexString()}`;
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,245,220,0.10)';
        ctx.beginPath();
        ctx.arc(random() * 256, random() * 256, 1 + random() * 6, 0, 7);
        ctx.fill();
      }
    });
    const mud = new THREE.MeshStandardMaterial({ map: mudTexture, roughness: mix(0.45, 0.8, mood.wear) });
    const pelletPaint = s.material(mudColour.clone().lerp(new THREE.Color('#f3e6c8'), 0.6), { roughness: 0.9 });
    const hollow = s.material('#1c1612', { roughness: 0.9 });
    s.lathe([[BR * 1.03, 0], [BR * 0.96, H * 0.4], [BR * 0.8, H * 0.85], [BR * 0.55, H], [0, H]], mud).scale.z = 0.88;

    const burrowAt = new THREE.Vector3(-W * 0.95, H, -W * 0.7);
    const door = (at: THREE.Vector3, r: number, kind: typeof a.burrow) => {
      if (kind === 'plugged') {
        s.ball([r * 1.15, r * 0.5, r * 1.15], [at.x, at.y, at.z], mud, 12);
        return;
      }
      s.cylinder(r, r, 0.0006, [at.x, at.y + 0.0004, at.z], hollow, 18);
      s.ring(r * 1.1, r * 0.2, [at.x, at.y, at.z], mud).rotation.x = Math.PI / 2;
      if (kind === 'chimney') {
        s.lathe([[r * 1.7, 0], [r * 1.35, r * 1.2], [r * 1.25, r * 2.1], [r * 1.0, r * 2.15], [r * 0.95, 0]], mud, [at.x, at.y, at.z]);
        s.cylinder(r * 0.98, r * 0.98, 0.0006, [at.x, at.y + r * 1.6, at.z], hollow, 18);
      }
      if (kind === 'hood') {
        const hood = s.mesh(new THREE.SphereGeometry(r * 2.1, 18, 10, 0, Math.PI, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: mudTexture, roughness: 0.8, side: THREE.DoubleSide }), [at.x, at.y, at.z]);
        hood.rotation.y = Math.PI * 0.75;
        hood.scale.y = 1.15;
      }
    };
    const side = random() < 0.5 ? -1 : 1;
    const heroAt = a.doing === 'retreating' ? burrowAt.clone() : new THREE.Vector3(W * 0.45, H, W * 0.35);
    if (a.doing !== 'retreating') door(burrowAt, W * 0.34, a.burrow);
    else door(burrowAt, W * 0.52, a.burrow === 'plugged' ? 'hole' : a.burrow === 'chimney' ? 'hole' : a.burrow);
    const hero = crab(W, a.doing, side, a.clawSize, true);
    hero.position.copy(heroAt);
    hero.rotation.y = 0.35;
    if (a.doing === 'retreating') { hero.position.y = H - W * 0.3; hero.rotation.x = -0.5; hero.rotation.y = 0.5; }
    s.root.add(hero);
    if (a.doing === 'duelling') {
      const rival = crab(W * mix(0.8, 0.95, random()), 'duelling', side, a.clawSize * mix(0.6, 1, random()), false);
      rival.position.set(heroAt.x + Math.sin(0.35) * W * 2.3 - side * W * 0.35, H, heroAt.z + Math.cos(0.35) * W * 2.3);
      rival.rotation.y = 0.35 + Math.PI;
      s.root.add(rival);
      hero.position.x -= W * 0.5;
      hero.position.z -= W * 0.7;
    }
    const others = { alone: 0, few: 2 + Math.floor(random() * 2), crowd: 4 + Math.floor(mood.density * 3.5) }[a.neighbours];
    for (let i = 0; i < others; i++) {
      const angle = Math.PI * (0.55 + (i / Math.max(1, others - 1)) * 1.1) + (random() - 0.5) * 0.25;
      const reach = BR * mix(0.62, 0.8, random());
      const at = new THREE.Vector3(Math.sin(angle) * reach, H * 0.9, Math.cos(angle) * reach * 0.88);
      const w = W * mix(0.36, 0.55, random());
      const little = crab(w, random() < 0.6 ? 'waving' : 'guarding', random() < 0.5 ? -1 : 1, mix(0.3, 0.9, random()), false);
      little.position.copy(at);
      little.rotation.y = (random() - 0.5) * 1.6;
      s.root.add(little);
      door(new THREE.Vector3(at.x - w * 1.1, H * 0.9, at.z - w * 0.6), w * 0.34, 'hole');
    }

    // Feeding pellets.
    const balls: { at: [number, number, number]; size: number }[] = [];
    const drop = (x: number, z: number, size = 1) => {
      if (Math.hypot(x, z / 0.88) > BR * 0.9) return;
      if (Math.hypot(x - heroAt.x, z - heroAt.z) < W * 0.7 && a.doing !== 'retreating') return;
      const edge = Math.hypot(x, z / 0.88) > BR * 0.6;
      balls.push({ at: [x, (edge ? H * 0.75 : H) + W * 0.03, z], size: W * mix(0.06, 0.085, random()) * size });
    };
    const amount = mix(0.6, 1.5, mood.density);
    if (a.pellets === 'spokes') {
      const spokes = Math.round(7 * amount);
      for (let k = 0; k < spokes; k++) {
        const angle = (k / spokes) * Math.PI * 2 + random() * 0.2;
        for (let d = 2; d < 16; d++) drop(burrowAt.x + Math.sin(angle) * W * d * 0.3 + (random() - 0.5) * W * 0.08, burrowAt.z + Math.cos(angle) * W * d * 0.3 + (random() - 0.5) * W * 0.08);
      }
    } else if (a.pellets === 'rings') {
      for (let ring = 1; ring <= 5; ring++)
        for (let k = 0; k < ring * 14 * amount; k++) {
          const angle = (k / (ring * 14 * amount)) * Math.PI * 2;
          if (Math.sin(angle * 2 + ring) > 0.55) continue;
          drop(burrowAt.x + Math.sin(angle) * W * (0.4 + ring * 0.62), burrowAt.z + Math.cos(angle) * W * (0.4 + ring * 0.62));
        }
    } else if (a.pellets === 'scattered') {
      for (let k = 0; k < 90 * amount; k++) drop((random() - 0.5) * BR * 2, (random() - 0.5) * BR * 2, mix(0.8, 1.6, random()));
    }
    if (balls.length) s.scatter(new THREE.SphereGeometry(1, 6, 5), pelletPaint, balls);
    if (a.tracks) {
      const dots: { at: [number, number, number]; size: number }[] = [];
      let x = heroAt.x, z = heroAt.z, heading = Math.PI + 0.9 + random();
      for (let k = 0; k < 46; k++) {
        heading += (random() - 0.5) * 0.5;
        x += Math.sin(heading) * W * 0.16;
        z += Math.cos(heading) * W * 0.16;
        if (Math.hypot(x, z / 0.88) > BR * 0.55) heading += 1.2;
        for (const e of [-1, 1]) dots.push({ at: [x + Math.cos(heading) * e * W * 0.34, H + 0.0002, z - Math.sin(heading) * e * W * 0.34], size: W * 0.03 });
      }
      const marks = s.scatter(new THREE.SphereGeometry(1, 5, 4), hollow, dots);
      marks.scale.y = 1;
    }
    if (mood.wear > 0.55) {
      // A shed claw and shell grit when things are rough.
      s.mesh(taper([[0, 0, 0], [W * 0.4, W * 0.05, W * 0.1], [W * 0.8, 0, 0]], W * 0.08, W * 0.012, [0, 1, 0], 0.5), s.material('#d9d2c2'), [BR * 0.3, H + W * 0.03, -BR * 0.42]);
    }

    const energy = mix(0.3, 2.2, mood.energy);
    const spin = new THREE.Quaternion(), axis = new THREE.Vector3(0, 0, 1);
    return s.finish({
      footprint: BR,
      update: (_dt, time) => {
        for (const waver of wavers) {
          const beat = Math.sin(time * 2.4 * energy + waver.phase);
          waver.pivot.quaternion.copy(waver.base).multiply(spin.setFromAxisAngle(axis, beat * waver.swing));
        }
      },
    });
  },
});
