import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { glass, labelWrap, liquid, paint } from './lab';

const IRIS = {
  blue: ['#2f6fb8', '#9cc8ee'],
  brown: ['#5a3414', '#b9783a'],
  green: ['#2f7a3c', '#b6d86a'],
  amber: ['#b8730c', '#ffd75a'],
  red: ['#8e1010', '#ff6a3c'],
  milky: ['#aab6bd', '#e9eef0'],
} as const;

const FLUID = {
  formalin: '#d8b84a',
  absinthe: '#6fd23a',
  blood: '#b01c2c',
  brine: '#3aa7d6',
  violet: '#9a4be0',
  clear: '#cfe6dc',
} as const;

const LABELS = {
  specimen: ['SPECIMEN', 'No. 13'],
  latin: ['Oculus', 'sinister'],
  feed: ['DO NOT', 'FEED'],
  sees: ['IT SEES', 'YOU'],
  mother: ['Mother'],
  mine: ['the last one', 'I needed'],
} as const;

type Profile = [number, number][];

/** Everything of a lathe profile at or below a height, ending in a flat cap. */
function below(profile: Profile, top: number, inset: number): Profile {
  const out: Profile = [[0, profile[0][1] + 0.002]];
  for (let i = 0; i < profile.length; i++) {
    const [r, y] = profile[i];
    if (y <= top) { if (r > 0) out.push([r * inset, Math.max(y, profile[0][1] + 0.002)]); continue; }
    const [pr, py] = profile[i - 1];
    const t = (top - py) / Math.max(y - py, 1e-6);
    out.push([mix(pr, r, t) * inset, top]);
    break;
  }
  out.push([0, top]);
  return out;
}

function eyeTexture(kind: 'round' | 'slit', iris: readonly [string, string], bloodshot: number, clouded: boolean, random: () => number) {
  return paint(1024, 512, (ctx, w, h) => {
    const cx = w * 0.25, cy = h * 0.5;
    const white = ctx.createRadialGradient(cx, cy, 40, cx, cy, 300);
    white.addColorStop(0, '#f6f1e4');
    white.addColorStop(0.55, '#eedfce');
    white.addColorStop(1, '#d99a8c');
    ctx.fillStyle = white;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c66a62';
    ctx.fillRect(w * 0.55, 0, w * 0.45, h);
    // Veins creep in from the back of the globe toward the iris.
    const veins = 10 + Math.round(bloodshot * 34);
    for (let i = 0; i < veins; i++) {
      const angle = random() * Math.PI * 2;
      let r = 250 + random() * 60, a = angle;
      ctx.strokeStyle = `rgba(176,30,30,${0.35 + bloodshot * 0.5})`;
      ctx.lineWidth = 1.5 + random() * 2.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      const reach = mix(150, 96, bloodshot) + random() * 50;
      while (r > reach) {
        r -= 14 + random() * 12;
        a += (random() - 0.5) * 0.3;
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.stroke();
    }
    const R = 88;
    ctx.fillStyle = '#1a1410';
    ctx.beginPath(); ctx.arc(cx, cy, R + 7, 0, Math.PI * 2); ctx.fill();
    const disc = ctx.createRadialGradient(cx, cy, 10, cx, cy, R);
    disc.addColorStop(0, iris[1]);
    disc.addColorStop(0.75, iris[0]);
    disc.addColorStop(1, '#141414');
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 70; i++) {
      const a = random() * Math.PI * 2;
      ctx.strokeStyle = i % 2 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
      ctx.lineTo(cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6));
      ctx.stroke();
    }
    ctx.fillStyle = clouded ? '#8d9aa0' : '#050505';
    ctx.beginPath();
    if (kind === 'slit') ctx.ellipse(cx, cy, 15, R * 0.92, 0, 0, Math.PI * 2);
    else ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.ellipse(cx - 30, cy - 34, 17, 12, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 28, cy + 30, 6, 0, Math.PI * 2); ctx.fill();
  });
}

export default defineThing({
  questions: {
    eye: choice('What kind of eye hangs in the jar?', {
      human: 'One ordinary human eyeball, small and lonely in the fluid.',
      cyclops: 'A single enormous eye that almost fills the jar, pressed close to the glass.',
      beast: 'A yellow predator\'s eye with a vertical slit pupil.',
      many: 'A cluster of small eyes on branching stalks, like a bunch of grapes, all looking different ways.',
    }),
    iris: choice('What colour is the iris?', {
      blue: 'Pale watchful blue.',
      brown: 'Warm dark brown.',
      green: 'Sharp green.',
      amber: 'Animal amber gold.',
      red: 'Blood red, something unnatural.',
      milky: 'Clouded blue-grey, blind with cataract.',
    }),
    fluid: choice('What colour is the fluid?', {
      formalin: 'Yellowed formalin, the colour of old museums.',
      absinthe: 'Sickly luminous green, reanimation serum.',
      blood: 'Dark red, wine or worse.',
      brine: 'Cold clear blue.',
      violet: 'Unnatural violet, alchemical.',
      clear: 'Almost colourless spirit.',
    }),
    glow: score('Does the fluid glow?', ['Dull dead liquid', 'A faint inner light', 'Lit from within like a lamp']),
    jar: choice('What shape is the jar?', {
      cylinder: 'A tall straight museum cylinder.',
      shouldered: 'A shouldered apothecary bottle with a narrower neck.',
      globe: 'A round-bellied globe flask on a ring foot.',
    }),
    seal: choice('How is the lid sealed?', {
      wax: 'A cork buried under dripping red sealing wax.',
      clamp: 'A glass lid held down by a brass clamp and wire bail.',
      twine: 'A bung under oilcloth, tied round the neck with twine.',
      cracked: 'A tin lid, but the glass is cracked and the fluid is leaking out.',
    }),
    label: choice('What is written on the label?', {
      specimen: 'SPECIMEN No. 13, in neat catalogue capitals.',
      latin: 'Oculus sinister, a careful Latin hand.',
      feed: 'DO NOT FEED.',
      sees: 'IT SEES YOU.',
      mother: 'Just the word Mother.',
      mine: 'A private note: the last one I needed.',
      none: 'No label, only a pale rectangle where one was.',
    }),
    gaze: choice('Where is the eye looking?', {
      viewer: 'Straight out at whoever is looking in.',
      up: 'Up at the lid, wanting out.',
      aside: 'Off to one side at something beside it.',
      down: 'Down at the bench, ashamed or sleeping.',
      back: 'Rolled back so mostly white shows.',
      roaming: 'Darting everywhere, never still.',
    }),
    bubbles: score('How much is the fluid bubbling?', ['Perfectly still', 'A few rising beads', 'Fizzing like something is breathing']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const big = a.eye === 'cyclops';
    const R = big ? 0.085 : 0.06;
    const H = a.jar === 'globe' ? R * 2.75 : R * 3.1;
    const base = 0.022;

    const profile: Profile = a.jar === 'cylinder'
      ? [[0, 0], [R * 0.96, 0], [R, 0.012], [R, H * 0.9], [R * 0.9, H * 0.95], [R * 0.9, H]]
      : a.jar === 'shouldered'
        ? [[0, 0], [R * 0.96, 0], [R, 0.012], [R, H * 0.74], [R * 0.9, H * 0.84], [R * 0.64, H * 0.91], [R * 0.64, H]]
        : [[0, 0], [R * 0.55, 0], [R * 0.55, H * 0.05], ...Array.from({ length: 13 }, (_u, i): [number, number] => {
          const t = -1.05 + i * (2.1 / 12);
          return [Math.cos(t) * R * 1.12, H * 0.46 + Math.sin(t) * H * 0.42];
        }), [R * 0.56, H * 0.9], [R * 0.56, H]];
    const neck = profile[profile.length - 1][0];
    const eyeY = a.jar === 'shouldered' ? H * 0.46 : a.jar === 'globe' ? H * 0.47 : H * 0.56;
    const room = a.jar === 'globe' ? R * 1.12 : R;

    // Turned wooden foot and the glass itself.
    const wood = s.material('#4a2f1e', { roughness: 0.55 });
    s.lathe([[0, 0], [R * 1.22, 0], [R * 1.25, base * 0.45], [R * 1.1, base * 0.6], [R * 1.05, base], [0, base]], wood);
    const jar = new THREE.Group();
    jar.position.y = base;
    s.root.add(jar);
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = jar) => { parent.add(node); return node; };
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = jar) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      return add(mesh, parent);
    };
    const pane = glass('#e4f4ea', 0.2);
    add(new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 40), pane));
    // Thick glass at foot and rim catches the light so the jar reads as glass.
    const thick = new THREE.MeshStandardMaterial({ color: '#bfe0d2', transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false });
    const footR = profile[2][0];
    const foot = add(new THREE.Mesh(new THREE.TorusGeometry(footR, 0.005, 8, 40), thick)); foot.rotation.x = Math.PI / 2; foot.position.y = 0.006;
    const rim = solid(new THREE.TorusGeometry(neck, 0.0055, 8, 40), new THREE.MeshStandardMaterial({ color: '#cfe6dc', roughness: 0.15 })); rim.rotation.x = Math.PI / 2; rim.position.y = H;
    const shine = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
    for (const [angle, width] of [[-0.75, 0.16], [-0.55, 0.05], [0.95, 0.07]] as const) {
      const strip = add(new THREE.Mesh(a.jar === 'globe'
        ? new THREE.SphereGeometry(room * 1.004, 6, 10, Math.PI / 2 + angle, width, 0.75, 0.8)
        : new THREE.CylinderGeometry(room * 1.004, room * 1.004, H * 0.62, 6, 1, true, angle, width), shine));
      strip.scale.y = a.jar === 'globe' ? (H * 0.42) / room : 1;
      strip.position.y = a.jar === 'globe' ? H * 0.46 : H * 0.42;
    }

    // Fluid.
    const leaking = a.seal === 'cracked';
    const tint = new THREE.Color(FLUID[a.fluid]);
    tint.lerp(new THREE.Color('#6b5a2a'), mood.wear * 0.35);
    const level = H * (leaking ? mix(0.62, 0.5, mood.wear) : 0.86);
    const glow = mix(0.05, 1.6, a.glow);
    const fluid = liquid(tint, glow, mix(0.5, 0.64, mood.wear));
    add(new THREE.Mesh(new THREE.LatheGeometry(below(profile, level, 0.955).map(([x, y]) => new THREE.Vector2(x, y)), 36), fluid));
    const sediment = s.material('#5b4a2c', { roughness: 0.95 });
    if (a.jar !== 'globe') solid(new THREE.CylinderGeometry(R * 0.9, R * 0.92, 0.004 + mood.wear * 0.008, 28), sediment).position.y = 0.006;

    // The eye, or eyes, hanging on the optic nerve.
    const flesh = s.material('#b84a48', { roughness: 0.5 });
    const nerve = s.material('#e3b49a', { roughness: 0.6 });
    const irisKey = a.eye === 'beast' && a.iris !== 'red' && a.iris !== 'milky' ? 'amber' : a.iris;
    const pupil = a.eye === 'beast' ? 'slit' : 'round';
    const bloodshot = mix(0.15, 1, mood.wear * 0.6 + mood.energy * 0.4);
    const map = eyeTexture(pupil, IRIS[irisKey], bloodshot, a.iris === 'milky', random);
    const eyeMaterial = new THREE.MeshStandardMaterial({ map, roughness: 0.18, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.12 + a.glow * 0.2 });
    const eyeGeometry = new THREE.SphereGeometry(1, 40, 28);
    const hang = add(new THREE.Group());
    hang.position.y = eyeY;
    const targets = { viewer: [0, 0], up: [0.1, -0.7], aside: [0.95, 0.05], down: [-0.1, 0.72], back: [0.15, -1.3], roaming: [0, 0] } as const;
    const eyes: { ball: THREE.Group; yaw: number; pitch: number; phase: number }[] = [];
    const makeEye = (radius: number, at: THREE.Vector3, from: THREE.Vector3, yaw: number, pitch: number) => {
      const ball = add(new THREE.Group(), hang);
      ball.position.copy(at);
      const globe = solid(eyeGeometry, eyeMaterial, ball);
      globe.scale.setScalar(radius);
      // A cuff of muscle where the nerve leaves the back of the globe.
      const back = at.clone().add(new THREE.Vector3(0, radius * 0.55, -radius * 0.8));
      const cuff = solid(new THREE.SphereGeometry(radius * 0.42, 12, 8), flesh, hang);
      cuff.position.copy(back);
      const mid = back.clone().lerp(from, 0.5).add(new THREE.Vector3((random() - 0.5) * radius, 0, -radius * 0.5));
      const path = new THREE.CatmullRomCurve3([back, mid, from]);
      solid(new THREE.TubeGeometry(path, 20, radius * 0.16, 7), nerve, hang);
      for (let i = 0; i < 3; i++) {
        const strand = new THREE.CatmullRomCurve3([
          back.clone().add(new THREE.Vector3((random() - 0.5) * radius * 0.5, 0, 0)),
          back.clone().add(new THREE.Vector3((random() - 0.5) * radius * 1.6, -radius * (0.5 + random() * 0.8), -radius * 0.3)),
          back.clone().add(new THREE.Vector3((random() - 0.5) * radius * 2, -radius * (1.2 + random() * 0.9), -radius * 0.1)),
        ]);
        solid(new THREE.TubeGeometry(strand, 10, radius * 0.045, 5), flesh, hang);
      }
      ball.rotation.set(pitch, yaw, 0, 'YXZ');
      eyes.push({ ball, yaw, pitch, phase: random() * 10 });
    };
    const top = new THREE.Vector3(0, H - eyeY - 0.004, 0);
    const [gy, gp] = targets[a.gaze];
    if (a.eye === 'many') {
      const count = 6 + Math.floor(random() * 4);
      const knot = new THREE.Vector3(0, room * 0.75, -room * 0.1);
      solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([top, top.clone().lerp(knot, 0.5).add(new THREE.Vector3(room * 0.12, 0, 0)), knot]), 16, room * 0.07, 7), nerve, hang);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + random();
        const ring = i % 2 ? 0.52 : 0.3;
        const at = new THREE.Vector3(Math.sin(angle) * room * ring, room * mix(0.35, -0.75, i / (count - 1)), Math.cos(angle) * room * ring * 0.85 + room * 0.08);
        const stray = a.gaze === 'viewer' ? 0.25 : 1.5;
        makeEye(room * mix(0.2, 0.27, random()), at, knot, gy + (random() - 0.5) * stray, gp + (random() - 0.5) * stray * 0.6);
      }
    } else {
      const radius = room * (big ? (a.jar === 'shouldered' ? 0.7 : 0.8) : a.eye === 'beast' ? 0.56 : 0.46);
      makeEye(radius, new THREE.Vector3(0, 0, big ? 0 : room * 0.12), top, gy, gp);
    }

    // Lid and seal.
    const lid = add(new THREE.Group());
    lid.position.y = H;
    const brass = s.material('#b58a35', { metalness: 0.85, roughness: 0.35 });
    const cork = s.material('#b08a5a', { roughness: 0.9 });
    const lathe = (points: Profile, material: THREE.Material) => solid(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), 28), material, lid);
    if (a.seal === 'wax') {
      lathe([[0, -0.01], [neck * 0.94, -0.01], [neck * 0.98, 0.02], [0, 0.02]], cork);
      const wax = s.material('#a3161c', { roughness: 0.35 });
      lathe([[0, 0.036], [neck * 0.5, 0.034], [neck * 0.95, 0.024], [neck * 1.12, 0.008], [neck * 1.1, -0.012], [neck * 1.02, -0.02]], wax);
      const drips = 5 + Math.floor(random() * 5);
      for (let i = 0; i < drips; i++) {
        const angle = random() * Math.PI * 2, length = 0.012 + random() * 0.045;
        const drip = solid(new THREE.CapsuleGeometry(0.0045 + random() * 0.003, length, 4, 8), wax, lid);
        drip.position.set(Math.sin(angle) * neck * 1.06, -0.012 - length / 2, Math.cos(angle) * neck * 1.06);
      }
    } else if (a.seal === 'clamp') {
      lathe([[0, 0.03], [neck * 0.25, 0.032], [neck * 0.8, 0.02], [neck * 1.06, 0.006], [neck * 1.06, 0], [0, 0]], new THREE.MeshStandardMaterial({ color: '#b9d8c8', roughness: 0.15, transparent: true, opacity: 0.85 }));
      solid(new THREE.SphereGeometry(neck * 0.2, 12, 8), brass, lid).position.y = 0.04;
      const band = solid(new THREE.CylinderGeometry(neck * 1.09, neck * 1.09, 0.012, 32, 1, true), brass, lid); band.position.y = -0.012;
      (band.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      const bail = solid(new THREE.TorusGeometry(neck * 1.12, 0.003, 6, 24, Math.PI), brass, lid); bail.position.y = -0.008; bail.rotation.y = Math.PI / 2;
      for (const side of [-1, 1]) solid(new THREE.BoxGeometry(0.012, 0.03, 0.014), brass, lid).position.set(side * neck * 1.13, -0.014, 0);
    } else if (a.seal === 'twine') {
      lathe([[0, 0.02], [neck * 0.7, 0.02], [neck * 1.02, 0.012], [neck * 1.1, -0.004], [neck * 1.16, -0.026], [neck * 1.26, -0.034]], s.material('#3f3a2c', { roughness: 0.8, side: THREE.DoubleSide }));
      const twine = s.material('#c9b07a', { roughness: 1 });
      for (let i = 0; i < 3; i++) { const loop = solid(new THREE.TorusGeometry(neck * 1.12, 0.0022, 5, 28), twine, lid); loop.rotation.x = Math.PI / 2 + (random() - 0.5) * 0.08; loop.position.y = -0.012 - i * 0.004; }
      for (const side of [-1, 1]) solid(new THREE.CapsuleGeometry(0.002, 0.03 + random() * 0.02, 3, 6), twine, lid).position.set(neck * 0.5 * side, -0.035, neck * 1.08);
    } else {
      const tin = s.material('#8d9494', { metalness: 0.7, roughness: 0.5 });
      lathe([[0, 0.014], [neck * 1.05, 0.014], [neck * 1.08, 0.008], [neck * 1.08, -0.016]], tin);
      // Crack lines over the glass, and what has got out.
      const line = new THREE.MeshBasicMaterial({ color: '#f4fff8' });
      const crackY = level * mix(0.9, 1.05, random()), crackA = (random() - 0.5) * 1.2 + 0.7;
      for (let branch = 0; branch < 5; branch++) {
        let ang = crackA, y = crackY;
        const points: THREE.Vector3[] = [];
        for (let i = 0; i < 6; i++) {
          points.push(new THREE.Vector3(Math.sin(ang) * room * 1.006, y, Math.cos(ang) * room * 1.006));
          ang += (random() - 0.5) * 0.3 + (branch - 2) * 0.05;
          y += (random() - 0.35) * H * 0.09 * (branch % 2 ? 1 : -1);
          y = THREE.MathUtils.clamp(y, 0.01, H * (a.jar === 'cylinder' ? 0.88 : 0.72));
        }
        if (a.jar === 'globe') for (const p of points) { const k = Math.sqrt(Math.max(0.2, 1 - ((p.y - H * 0.46) / (H * 0.42)) ** 2)); p.x *= k; p.z *= k; }
        add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, 0.0012, 4), line));
      }
      const spill = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: glow * 0.6, roughness: 0.15 });
      const k = a.jar === 'globe' ? Math.sqrt(Math.max(0.2, 1 - ((crackY * 0.8 - H * 0.46) / (H * 0.42)) ** 2)) : 1;
      const run = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.sin(crackA) * room * k, crackY * 0.8, Math.cos(crackA) * room * k),
        new THREE.Vector3(Math.sin(crackA + 0.05) * room * 1.01, crackY * 0.4, Math.cos(crackA + 0.05) * room * 1.01),
        new THREE.Vector3(Math.sin(crackA) * footR * 1.03, 0.004, Math.cos(crackA) * footR * 1.03),
      ]);
      if (a.jar !== 'globe') solid(new THREE.TubeGeometry(run, 12, 0.0028, 6), spill);
      const pool = solid(new THREE.CylinderGeometry(R * 0.5, R * 0.55, 0.003, 20), spill, s.root);
      pool.scale.set(1, 1, 0.7);
      pool.position.set(Math.sin(crackA) * R * 1.05, 0.0015, Math.cos(crackA) * R * 1.05);
    }

    // Paper label low on the glass, under the eye.
    const labelR = a.jar === 'globe' ? R * 0.98 : R * 1.006;
    const labelY = a.jar === 'globe' ? H * 0.2 : H * 0.16;
    const labelH = H * 0.2, labelW = R * 1.5;
    if (a.label === 'none') {
      const ghost = add(new THREE.Mesh(new THREE.CylinderGeometry(labelR, labelR, labelH, 16, 1, true, -labelW / labelR / 2, labelW / labelR), new THREE.MeshStandardMaterial({ color: '#e9e2cf', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })));
      ghost.position.y = labelY;
    } else {
      const hand = a.label === 'specimen' || a.label === 'feed' ? 'caps' : a.label === 'sees' ? 'scrawl' : 'script';
      const paper = labelWrap(LABELS[a.label], labelR, labelW, labelH, { hand, wear: mood.wear, random, ink: a.label === 'sees' || a.label === 'feed' ? '#7a1414' : '#2a2018' });
      paper.position.y = labelY;
      paper.rotation.z = (random() - 0.5) * 0.06;
      add(paper);
    }

    // Bubbles rise through the fluid.
    const beadCount = Math.round(a.bubbles * 46 + (a.bubbles > 0.05 ? 3 : 0));
    const beads = beadCount ? add(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false }), beadCount)) : null;
    const bead = Array.from({ length: beadCount }, () => ({ angle: random() * Math.PI * 2, radius: Math.sqrt(random()) * neck * 0.82, phase: random(), size: 0.0018 + random() * 0.0035, speed: 0.5 + random() }));
    const matrix = new THREE.Matrix4();
    const placeBeads = (time: number) => {
      if (!beads) return;
      bead.forEach((b, i) => {
        const t = (b.phase + time * b.speed * mix(0.05, 0.3, mood.energy)) % 1;
        const wobble = Math.sin(time * 3 + b.phase * 20) * 0.003;
        matrix.makeScale(b.size, b.size, b.size).setPosition(Math.sin(b.angle) * b.radius + wobble, 0.012 + t * (level - 0.016), Math.cos(b.angle) * b.radius);
        beads.setMatrixAt(i, matrix);
      });
      beads.instanceMatrix.needsUpdate = true;
    };
    placeBeads(0);

    const energy = mix(0.25, 1, mood.energy);
    const roam = a.gaze === 'roaming';
    const glances = Array.from({ length: 12 }, () => [(random() - 0.5) * 2, (random() - 0.5) * 1.1]);
    return s.finish({
      update(dt, time) {
        placeBeads(time);
        hang.position.y = eyeY + Math.sin(time * 0.8) * R * 0.035 * energy;
        hang.rotation.z = Math.sin(time * 0.55) * 0.05 * energy;
        for (const eye of eyes) {
          const beat = Math.floor((time + eye.phase) / mix(4.5, 0.9, mood.energy));
          const glance = glances[(beat + Math.floor(eye.phase * 7)) % glances.length];
          const reach = roam ? 1 : 0.16 * energy;
          const yaw = (roam ? 0 : eye.yaw) + glance[0] * reach, pitch = (roam ? 0 : eye.pitch) + glance[1] * reach;
          const ease = Math.min(1, dt * 7);
          eye.ball.rotation.y += (yaw - eye.ball.rotation.y) * ease;
          eye.ball.rotation.x += (pitch - eye.ball.rotation.x) * ease;
        }
      },
    });
  },
});
