import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const SKIN = {
  green: { say: 'Glossy carnivore green with a wet red mouth.', skin: '#4f9a3a', dark: '#2f6a2a', mouth: '#c2263a', spot: '#b7d94a', glow: 0 },
  purple: { say: 'Bruise purple with yellow spots and a yellow throat.', skin: '#6f3f96', dark: '#47286a', mouth: '#f2c53a', spot: '#f0d04a', glow: 0 },
  flesh: { say: 'Fleshy pink like a tongue, veined, with a dark crimson mouth.', skin: '#e2938a', dark: '#b8605f', mouth: '#8f1d3a', spot: '#f6c9bd', glow: 0 },
  teal: { say: 'Deep teal that glows from within, spots and throat shining lime.', skin: '#1f8f8a', dark: '#15605f', mouth: '#c8ff6a', spot: '#8affea', glow: 1 },
  orange: { say: 'Poison-dart orange with black spots and a plum mouth.', skin: '#e67d24', dark: '#b2531a', mouth: '#5a1a4a', spot: '#2a1410', glow: 0 },
  ghost: { say: 'Corpse white with red veins and a blood-red mouth.', skin: '#e9e3cf', dark: '#bdb59c', mouth: '#b0182a', spot: '#c8363a', glow: 0 },
} as const;

/** A tube that narrows along its length, with v running tip-ward for the painted skin. */
function taperTube(curve: THREE.Curve<THREE.Vector3>, segments: number, r0: number, r1: number, sides = 7) {
  const frames = curve.computeFrenetFrames(segments, false);
  const position: number[] = [], uv: number[] = [], index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, c = curve.getPointAt(t), r = mix(r0, r1, t);
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2, n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      position.push(c.x + n.x * r, c.y + n.y * r, c.z + n.z * r); uv.push(j / sides, t);
    }
    if (i) for (let j = 0; j < sides; j++) { const a = (i - 1) * (sides + 1) + j, b = a + sides + 1; index.push(a, b, a + 1, b, b + 1, a + 1); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index); geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    pod: choice('What is the central pod doing?', {
      closed: 'Shut tight like a bud, teeth meshed along the seams.',
      parted: 'Parted a little, teeth showing, tasting the air.',
      gaping: 'Gaping wide open, throat and tongue on show.',
      chewing: 'Closed and bulging around something, working at it.',
    }),
    jaws: choice('How does the pod split?', {
      clam: 'Two halves like a clam or a flytrap.',
      tri: 'Three jaws that peel apart.',
      star: 'Five petals opening like a monstrous flower.',
    }),
    colour: choice('What colour is it?', Object.fromEntries(Object.entries(SKIN).map(([k, s]) => [k, s.say])) as Record<keyof typeof SKIN, string>),
    caught: choice('What has it caught?', {
      nothing: 'Nothing yet.',
      boot: 'A boot and a trouser leg sticking out of the pod.',
      helmet: 'A glass space helmet held up in one tendril like a trophy.',
      bones: 'A scatter of clean bones and a skull at its roots.',
      bug: 'A giant winged insect wrapped in a tendril.',
      raygun: 'A raygun, plucked from somebody and held out of reach.',
    }),
    heads: choice('How many pods does it carry?', {
      one: 'A single great pod.',
      two: 'A big pod and a smaller one beside it.',
      three: 'Three pods on separate stalks, a hydra.',
    }),
    size: score('How big has it grown?', ['A knee-high potted seedling', 'Waist high', 'Taller than a person', 'A towering tree-sized monster']),
    extra: choice('What else does it have?', {
      none: 'Nothing more.',
      lure: 'A glowing bulb dangling on a stalk over the mouth, like an anglerfish.',
      frill: 'A ruff of bright petals behind the pod, pretending to be a flower.',
      drool: 'Strands of sap dripping from the teeth.',
      thorns: 'Thorns all the way up the stalk.',
    }),
    roots: choice('What is it growing out of?', {
      ground: 'Straight out of the ground from a knot of roots.',
      pot: 'A terracotta pot it has long outgrown, cracked.',
      mound: 'A mound of broad leaves like a giant cabbage.',
      crate: 'A broken shipping crate stencilled LIVE SPECIMEN.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const c = SKIN[a.colour];
    const menace = 1 - mood.cheer;

    // ---- Painted skins ----
    const paintSkin = (stripes: boolean) => {
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const base = ctx.createLinearGradient(0, 256, 0, 0); base.addColorStop(0, c.dark); base.addColorStop(0.35, c.skin); base.addColorStop(1, c.skin);
      ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 256);
      if (stripes) {
        // Pale underside with a row of suckers.
        ctx.fillStyle = c.spot; ctx.globalAlpha = 0.55; ctx.fillRect(44, 0, 40, 256); ctx.globalAlpha = 1;
        ctx.fillStyle = c.mouth; for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.arc(64, i * 16 + 8, 6, 0, 7); ctx.fill(); }
      } else {
        ctx.fillStyle = c.spot;
        for (let i = 0; i < 46; i++) { ctx.globalAlpha = 0.5 + random() * 0.5; ctx.beginPath(); ctx.ellipse(random() * 128, random() * 256, 2 + random() * 6, 3 + random() * 9, 0, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
        if (a.colour === 'ghost' || a.colour === 'flesh') { ctx.strokeStyle = c.mouth; ctx.lineWidth = 1.5; for (let i = 0; i < 14; i++) { let x = random() * 128, y = 256; ctx.beginPath(); ctx.moveTo(x, y); while (y > 40 + random() * 100) { x += (random() - 0.5) * 16; y -= 14; ctx.lineTo(x, y); } ctx.stroke(); } }
      }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping;
      return map;
    };
    const wilt = new THREE.Color('#ffffff').lerp(new THREE.Color('#b9a57a'), mood.wear * 0.5);
    const glowOf = (map: THREE.Texture) => c.glow ? { emissive: new THREE.Color('#ffffff'), emissiveMap: map, emissiveIntensity: 0.45 } : {};
    const podMap = paintSkin(false), armMap = paintSkin(true);
    armMap.repeat.set(1, 3);
    const podSkin = new THREE.MeshStandardMaterial({ map: podMap, color: wilt, roughness: 0.42, ...glowOf(podMap) });
    const armSkin = new THREE.MeshStandardMaterial({ map: armMap, color: wilt, roughness: 0.45, ...glowOf(armMap) });
    const mouth = new THREE.MeshStandardMaterial({ color: c.mouth, roughness: 0.3, side: THREE.BackSide, emissive: c.mouth, emissiveIntensity: c.glow ? 0.9 : 0.12 });
    const mouthSolid = new THREE.MeshStandardMaterial({ color: c.mouth, roughness: 0.3, emissive: c.mouth, emissiveIntensity: c.glow ? 0.9 : 0.12 });
    const tooth = new THREE.MeshStandardMaterial({ color: '#f6efd9', roughness: 0.35 });
    const stalkMat = s.material(c.dark, { roughness: 0.55 });
    const leafMat = s.material(new THREE.Color(a.colour === 'green' || a.colour === 'teal' ? c.dark : '#3f7a3a').lerp(new THREE.Color('#8a7a3a'), mood.wear * 0.5), { roughness: 0.6, side: THREE.DoubleSide });

    // ---- Pods ----
    const N = { clam: 2, tri: 3, star: 5 }[a.jaws];
    const open = { closed: 0.0, parted: 0.2, gaping: N === 2 ? 0.62 : 0.85, chewing: 0.05 }[a.pod];
    const hinges: { g: THREE.Group; base: number; phase: number }[] = [];
    const pods: { g: THREE.Group; R: number; phase: number }[] = [];
    const makePod = (R: number, state: number) => {
      const pod = new THREE.Group();
      const w = Math.PI * 2 / N - 0.05, sy = 1.4, teethPer = N === 2 ? 9 : 6;
      const petalGeo = new THREE.SphereGeometry(1, N === 2 ? 20 : 12, 16, Math.PI / 2 - w / 2, w, 0, Math.PI * 0.96);
      for (let k = 0; k < N; k++) {
        const turn = new THREE.Group(); turn.rotation.y = k / N * Math.PI * 2 + (N === 2 ? 0 : Math.PI / N);
        const hinge = new THREE.Group(); hinge.rotation.x = state;
        const shell = new THREE.Mesh(petalGeo, podSkin); shell.scale.set(R, R * sy, R); shell.position.y = R * sy; shell.castShadow = true;
        const lining = new THREE.Mesh(petalGeo, mouth); lining.scale.set(R * 0.97, R * sy * 0.97, R * 0.97); lining.position.y = R * sy;
        const fangs: THREE.BufferGeometry[] = [];
        for (const edge of [-1, 1]) for (let i = 0; i < teethPer; i++) {
          const theta = mix(0.12, 0.8, (i + (edge > 0 ? 0.5 : 0)) / teethPer) * Math.PI, phi = Math.PI / 2 + edge * w / 2;
          const at = new THREE.Vector3(-Math.cos(phi) * Math.sin(theta) * R, Math.cos(theta) * R * sy + R * sy, Math.sin(phi) * Math.sin(theta) * R);
          const tangent = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi)).multiplyScalar(edge);
          const inward = new THREE.Vector3(-at.x, 0, -at.z).normalize();
          const dir = tangent.multiplyScalar(0.9).addScaledVector(inward, 0.45).normalize();
          const len = R * mix(0.16, 0.3, menace) * (0.8 + random() * 0.4);
          const cone = new THREE.ConeGeometry(R * 0.055, len, 5); cone.translate(0, len / 2, 0);
          cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)); cone.translate(at.x, at.y, at.z);
          fangs.push(cone);
        }
        const teeth = new THREE.Mesh(mergeGeometries(fangs), tooth); teeth.castShadow = true;
        hinge.add(shell, lining, teeth); turn.add(hinge); pod.add(turn);
        hinges.push({ g: hinge, base: state, phase: random() * 6 });
      }
      // The swollen base the jaws grow from, and a throat.
      const cup = new THREE.Mesh(new THREE.SphereGeometry(R * 0.72, 16, 10), podSkin); cup.scale.y = 0.75; cup.position.y = R * 0.32; cup.castShadow = true; pod.add(cup);
      const throat = new THREE.Mesh(new THREE.SphereGeometry(R * 0.6, 14, 8), mouthSolid); throat.scale.y = 0.6; throat.position.y = R * 0.6; pod.add(throat);
      if (state > 0.4) {
        const pts = [new THREE.Vector3(0, R * 0.7, 0), new THREE.Vector3(R * 0.1, R * 1.5, R * 0.2), new THREE.Vector3(-R * 0.1, R * 2.1, R * 0.5), new THREE.Vector3(R * 0.15, R * 2.5, R * 0.95)];
        const tongue = new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts), 20, R * 0.13, R * 0.035), mouthSolid); tongue.castShadow = true; pod.add(tongue);
      }
      return pod;
    };

    const headCount = { one: 1, two: 2, three: 3 }[a.heads];
    const H = 1.75, R0 = 0.4;
    let mainPod: THREE.Group | null = null;
    for (let h = 0; h < headCount; h++) {
      const side = h === 0 ? 0 : h === 1 ? 1 : -1, small = h === 0 ? 1 : 0.62 - (h - 1) * 0.08;
      const height = H * (h === 0 ? 1 : 0.62 + random() * 0.12), dx = side * (0.75 + random() * 0.2) + (h === 0 && headCount > 1 ? -0.12 : 0), bow = (random() - 0.5) * 0.3;
      const face = a.pod === 'gaping' ? 0.75 : 0.42;
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.1, 0.05, 0), new THREE.Vector3(dx * 0.35 + bow, height * 0.4, -0.22), new THREE.Vector3(dx * 0.85, height * 0.8, -0.2),
        new THREE.Vector3(dx, height, -0.02), new THREE.Vector3(dx + side * 0.05, height + 0.12, face * 0.18),
      ]);
      s.mesh(taperTube(path, 28, 0.15 * small + 0.03, 0.085 * small + 0.02, 9), stalkMat);
      for (let i = 1; i < 7; i++) { const t = i / 7, p = path.getPointAt(t), ring = s.ring((mix(0.15, 0.085, t) * small + 0.03) * 1.08, 0.014, [p.x, p.y, p.z], stalkMat); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), path.getTangentAt(t)); }
      if (a.extra === 'thorns') {
        const spikes: THREE.BufferGeometry[] = [];
        for (let i = 0; i < 22; i++) {
          const t = 0.08 + random() * 0.84, p = path.getPointAt(t), out = new THREE.Vector3(random() - 0.5, random() * 0.4, random() - 0.5).normalize();
          const cone = new THREE.ConeGeometry(0.022, 0.16, 4); cone.translate(0, 0.08, 0); cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), out));
          cone.translate(p.x + out.x * 0.09 * small, p.y + out.y * 0.09, p.z + out.z * 0.09 * small); spikes.push(cone);
        }
        s.mesh(mergeGeometries(spikes), tooth);
      }
      const R = R0 * small;
      const pod = makePod(R, open * (h === 0 ? 1 : 0.5 + random() * 0.7));
      const end = path.getPointAt(1);
      const aim = new THREE.Vector3(side * 0.25 + (random() - 0.5) * 0.2, 1 - face * 0.55, face).normalize();
      pod.position.copy(end); pod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aim);
      s.root.add(pod);
      pods.push({ g: pod, R, phase: random() * 6 });
      if (h === 0) mainPod = pod;
      if (a.extra === 'frill') {
        const hues = ['#ff5aa8', '#ffd23a', '#ff7a3a', '#f4f0ff'], hue = hues[Math.floor(random() * hues.length)];
        const petalMat = new THREE.MeshStandardMaterial({ color: hue, roughness: 0.6, side: THREE.DoubleSide, emissive: hue, emissiveIntensity: 0.15 });
        for (let i = 0; i < 9; i++) {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), petalMat); leaf.scale.set(R * 0.42, R * 0.9, R * 0.05);
          const arm = new THREE.Group(); arm.rotation.y = i / 9 * Math.PI * 2; const tip = new THREE.Group(); tip.rotation.x = 1.25; tip.position.y = R * 0.2;
          leaf.position.y = R * 1.0; leaf.castShadow = true; tip.add(leaf); arm.add(tip); pod.add(arm);
        }
      }
      if (a.extra === 'drool') {
        const sap = new THREE.MeshStandardMaterial({ color: '#d8f29a', transparent: true, opacity: 0.8, roughness: 0.1 });
        for (let i = 0; i < 5; i++) {
          const world = pod.localToWorld(new THREE.Vector3(Math.sin(i * 1.4) * R * 0.8, R * (1.3 + random() * 1.2), Math.cos(i * 1.4) * R * 0.8)), len = 0.2 + random() * 0.5;
          s.rod([world.x, world.y, world.z], [world.x, world.y - len, world.z], 0.012, sap, 0.004);
          s.ball([0.028, 0.04, 0.028], [world.x, world.y - len, world.z], sap, 8);
        }
      }
    }
    const main = mainPod!;
    let lureMat: THREE.MeshStandardMaterial | null = null;
    if (a.extra === 'lure') {
      lureMat = new THREE.MeshStandardMaterial({ color: '#fff7c0', emissive: '#ffe45a', emissiveIntensity: 2.2 });
      const from = main.localToWorld(new THREE.Vector3(0, R0 * 0.3, -R0 * 0.7)), tip = main.localToWorld(new THREE.Vector3(0, R0 * 3.6, R0 * 1.3));
      const mid = from.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, 0.75, -0.35));
      s.mesh(taperTube(new THREE.CatmullRomCurve3([from, mid, tip.clone().add(new THREE.Vector3(0, 0.22, 0)), tip]), 20, 0.035, 0.012, 6), stalkMat);
      s.ball([0.1, 0.12, 0.1], [tip.x, tip.y - 0.08, tip.z], lureMat, 14);
      const halo = s.ball([0.2, 0.22, 0.2], [tip.x, tip.y - 0.08, tip.z], new THREE.MeshBasicMaterial({ color: '#ffe98a', transparent: true, opacity: 0.3, depthWrite: false }), 12); halo.castShadow = false;
    }
    if (a.pod === 'chewing' || a.caught === 'boot') {
      // A lump in the pod, and whatever is left sticking out of the top.
      const leather = s.material('#4a3022', { roughness: 0.6 }), cloth = s.material('#3f5f8f', { roughness: 0.8 });
      const meal = new THREE.Group(); meal.position.y = R0 * 2.55; meal.rotation.set(0.5, random() * 3, 0.5 + random() * 0.4); main.add(meal);
      if (a.caught === 'boot' || a.caught === 'nothing' || a.caught === 'bones') {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.45, 10), cloth); leg.position.y = -0.05; leg.castShadow = true;
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.24, 10), leather); shaft.position.y = 0.26; shaft.castShadow = true;
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), leather); foot.scale.set(1, 0.75, 1.9); foot.position.set(0, 0.4, 0.09); foot.castShadow = true;
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.34), s.material('#1c1a1a')); sole.position.set(0, 0.47, 0.09);
        meal.add(leg, shaft, foot, sole);
      }
      if (a.pod === 'chewing') { const lump = new THREE.Mesh(new THREE.SphereGeometry(R0 * 0.62, 12, 8), podSkin); lump.position.set(R0 * 0.55, R0 * 1.3, R0 * 0.35); lump.castShadow = true; main.add(lump); }
    }

    // ---- Tendrils ----
    const count = Math.round(mix(4, 9, mood.density)) + (a.caught === 'helmet' || a.caught === 'bug' || a.caught === 'raygun' ? 1 : 0);
    const arms: { g: THREE.Group; phase: number; amp: number }[] = [];
    const holding = a.caught === 'helmet' || a.caught === 'bug' || a.caught === 'raygun';
    for (let i = 0; i < count; i++) {
      const trophy = holding && i === 0;
      const angle = trophy ? -0.95 : (i / count) * Math.PI * 2 + (random() - 0.5) * 0.5;
      const L = trophy ? 1.35 : mix(0.7, 1.35, random()), curl = L * mix(0.2, 0.3, random()) * (trophy ? 1.15 : 1), droop = trophy ? 0 : mood.wear * 0.35;
      const pts: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(L * 0.34, L * 0.3 * (1 - droop), (random() - 0.5) * 0.2), new THREE.Vector3(L * 0.5, L * 0.72 * (1 - droop), (random() - 0.5) * 0.2)];
      const centre = new THREE.Vector3(L * 0.5 + curl, L * (1 - droop), 0), twist = (random() - 0.5) * 0.5;
      const turns = trophy ? 9 : 8 + Math.floor(random() * 6);
      for (let k = 0; k <= turns; k++) { const phi = Math.PI - k * 0.62, rho = curl * (1 - k / (turns + 3)); pts.push(new THREE.Vector3(centre.x + Math.cos(phi) * rho, centre.y + Math.sin(phi) * rho, k * twist * 0.05)); }
      const arm = new THREE.Group();
      const mesh = new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts), 54, mix(0.075, 0.1, random()), 0.012, 7), armSkin); mesh.castShadow = true; arm.add(mesh);
      arm.position.set(Math.sin(angle) * 0.22, 0.06, Math.cos(angle) * 0.22); arm.rotation.y = angle - Math.PI / 2;
      s.root.add(arm); arms.push({ g: arm, phase: random() * 6, amp: trophy ? 0.35 : 1 });
      if (trophy) {
        const held = new THREE.Group(); held.position.copy(centre); arm.add(held);
        const steel = s.material('#b9c0c6', { metalness: 0.4, roughness: 0.3 });
        const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; held.add(m); return m; };
        if (a.caught === 'helmet') {
          const glass = add(new THREE.SphereGeometry(0.27, 20, 14), new THREE.MeshStandardMaterial({ color: '#c9eef7', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false })); glass.castShadow = false;
          const shine = add(new THREE.SphereGeometry(0.275, 8, 6, 0.6, 0.6, 0.6, 0.7), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.65, depthWrite: false })); shine.castShadow = false;
          const collar = add(new THREE.TorusGeometry(0.17, 0.045, 8, 20), steel); collar.rotation.x = Math.PI / 2; collar.position.y = -0.22;
          const stub = add(new THREE.CylinderGeometry(0.008, 0.012, 0.3, 5), steel); stub.position.set(-0.16, 0.3, 0); add(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: '#d8262c' })).position.set(-0.16, 0.46, 0);
          held.rotation.z = 0.5;
        } else if (a.caught === 'bug') {
          const shell = s.material('#2a3a4a', { roughness: 0.3, metalness: 0.3 }), wing = new THREE.MeshStandardMaterial({ color: '#dff6ff', transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.2 });
          add(new THREE.SphereGeometry(0.11, 10, 8), shell).scale.set(1, 1, 1.2);
          const tail = add(new THREE.SphereGeometry(0.1, 10, 8), s.material('#e2b22a')); tail.scale.set(0.9, 0.9, 2.4); tail.position.z = -0.3;
          add(new THREE.SphereGeometry(0.08, 10, 8), shell).position.z = 0.16;
          for (const x of [-1, 1]) { add(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: '#c8202a', emissive: '#c8202a', emissiveIntensity: 0.5 })).position.set(x * 0.05, 0.03, 0.21); const w = add(new THREE.CircleGeometry(0.3, 10), wing); w.scale.set(1.5, 0.45, 1); w.position.set(x * 0.4, 0.14, -0.02); w.rotation.set(-1.2, 0, x * 0.4); }
          for (let k = 0; k < 6; k++) { const leg = add(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 4), shell); leg.position.set((k % 2 ? 1 : -1) * 0.13, -0.1, -0.1 + Math.floor(k / 2) * 0.1); leg.rotation.z = (k % 2 ? 1 : -1) * 0.9; }
          held.rotation.set(0.3, 1.2, 0.3);
        } else {
          const red = s.material('#c8302a', { roughness: 0.4 });
          add(new THREE.SphereGeometry(0.1, 12, 8), red).scale.set(1.8, 1, 1);
          const barrel = add(new THREE.CylinderGeometry(0.025, 0.04, 0.4, 8), steel); barrel.rotation.z = -Math.PI / 2; barrel.position.x = 0.32;
          for (let k = 0; k < 3; k++) { const ring = add(new THREE.TorusGeometry(0.075 - k * 0.014, 0.016, 6, 14), steel); ring.rotation.y = Math.PI / 2; ring.position.x = 0.24 + k * 0.1; }
          add(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffe23a', emissive: '#ffb81e', emissiveIntensity: 1.6 })).position.x = 0.54;
          const grip = add(new THREE.BoxGeometry(0.08, 0.22, 0.06), s.material('#2a2a2e')); grip.position.set(-0.08, -0.15, 0); grip.rotation.z = 0.3;
          held.rotation.z = -0.5;
        }
      }
    }

    // ---- Roots, leaves and what it grows from ----
    const leaves = Math.round(mix(4, 8, mood.density)) + (a.roots === 'mound' ? 6 : 0);
    for (let i = 0; i < leaves; i++) {
      const len = (a.roots === 'mound' ? 0.75 : 0.6) * mix(0.7, 1.2, random()), geo = new THREE.PlaneGeometry(len, 0.42, 8, 2);
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) { const t = Math.min(1, Math.max(0, p.getX(k) / len + 0.5)), wide = Math.sin(Math.pow(t, 0.7) * Math.PI) * 0.9 + 0.08; p.setXYZ(k, t * len, p.getY(k) * wide, -Math.abs(p.getY(k)) * 0.5 * wide + Math.sin(t * 2.4) * len * 0.3 - t * t * len * mood.wear * 0.4); }
      geo.computeVertexNormals();
      const leaf = s.mesh(geo, leafMat); leaf.rotation.order = 'YXZ'; leaf.rotation.y = i / leaves * Math.PI * 2 + random() * 0.4; leaf.rotation.x = -Math.PI / 2; leaf.position.y = 0.05 + (a.roots === 'mound' ? (i % 3) * 0.1 : 0);
    }
    const bulb = s.ball([0.34, 0.2, 0.34], [0, 0.08, 0], stalkMat, 14);
    void bulb;
    let baseLift = 0;
    if (a.roots === 'ground') for (let i = 0; i < 7; i++) {
      const t = i / 7 * Math.PI * 2 + random() * 0.5, r = 0.55 + random() * 0.35;
      s.mesh(taperTube(new THREE.CatmullRomCurve3([new THREE.Vector3(Math.sin(t) * 0.15, 0.12, Math.cos(t) * 0.15), new THREE.Vector3(Math.sin(t) * r * 0.5, 0.1, Math.cos(t) * r * 0.5), new THREE.Vector3(Math.sin(t + 0.3) * r, -0.03, Math.cos(t + 0.3) * r)]), 10, 0.06, 0.02, 6), stalkMat);
    }
    if (a.roots === 'pot') {
      baseLift = 0.5;
      const clay = s.material('#b9623a', { roughness: 0.85, side: THREE.DoubleSide });
      s.lathe([[0.3, -0.5], [0.42, -0.08], [0.47, -0.08], [0.47, 0.02], [0.4, 0.02]], clay);
      s.cylinder(0.4, 0.4, 0.04, [0, -0.02, 0], s.material('#3a2a22', { roughness: 1 }), 20);
      const crack = new THREE.MeshStandardMaterial({ color: '#2a1a14', roughness: 1 });
      for (let i = 0; i < 3; i++) { const t = -0.4 + i * 0.9 + random() * 0.3; s.rod([Math.sin(t) * 0.455, -0.05, Math.cos(t) * 0.455], [Math.sin(t + 0.12) * 0.37, -0.36, Math.cos(t + 0.12) * 0.37], 0.012, crack); s.mesh(taperTube(new THREE.CatmullRomCurve3([new THREE.Vector3(Math.sin(t) * 0.36, -0.1, Math.cos(t) * 0.36), new THREE.Vector3(Math.sin(t) * 0.55, -0.3, Math.cos(t) * 0.55), new THREE.Vector3(Math.sin(t + 0.4) * 0.75, -0.5, Math.cos(t + 0.4) * 0.75)]), 10, 0.045, 0.015, 6), stalkMat); }
    }
    if (a.roots === 'crate') {
      baseLift = 0.42;
      const wood = s.material('#a67a44', { roughness: 0.9 });
      for (const [x, z, w, d] of [[0, 0.5, 1.06, 0.05], [0, -0.5, 1.06, 0.05], [0.5, 0, 0.05, 1.0], [-0.5, 0, 0.05, 1.0]] as const) {
        const broken = x > 0;
        for (let i = 0; i < 3; i++) { if (broken && i === 2) continue; const plank = s.box([w, 0.13, d], [x, -0.42 + 0.07 + i * 0.145, z], wood); if (broken) plank.rotation.z = (random() - 0.5) * 0.2; }
      }
      s.label('LIVE SPECIMEN', 0.9, 0.13, [0, -0.2, 0.527], '#2a1a14', '#b88a52');
      s.box([1, 0.04, 1], [0, -0.4, 0], wood);
      s.cylinder(0.52, 0.52, 0.03, [0, -0.03, 0], s.material('#3a2a22', { roughness: 1 }), 4).rotation.y = Math.PI / 4;
      const loose = s.box([0.7, 0.13, 0.05], [0.95, -0.38, 0.3], wood); loose.rotation.set(Math.PI / 2, 0.4, 0);
    }
    if (a.caught === 'bones') {
      const bone = s.material('#efe8d2', { roughness: 0.6 }), hole = new THREE.MeshStandardMaterial({ color: '#17130f', roughness: 1 });
      const y = -baseLift, bx = 0.55, bz = 0.75;
      s.ball([0.13, 0.12, 0.15], [bx, y + 0.12, bz], bone, 12); s.box([0.13, 0.07, 0.1], [bx, y + 0.04, bz + 0.07], bone);
      for (const x of [-0.05, 0.05]) s.ball([0.036, 0.04, 0.02], [bx + x, y + 0.13, bz + 0.135], hole, 8);
      for (let i = 0; i < 6; i++) { const t = random() * 3, x = -0.7 + random() * 1.1, z = 0.6 + random() * 0.5, len = 0.14 + random() * 0.16; s.rod([x - Math.sin(t) * len, y + 0.025, z - Math.cos(t) * len], [x + Math.sin(t) * len, y + 0.025, z + Math.cos(t) * len], 0.02, bone); s.ball([0.033, 0.03, 0.033], [x + Math.sin(t) * len, y + 0.025, z + Math.cos(t) * len], bone, 6); s.ball([0.033, 0.03, 0.033], [x - Math.sin(t) * len, y + 0.025, z - Math.cos(t) * len], bone, 6); }
      for (let i = 0; i < 4; i++) s.ring(0.11, 0.012, [-0.25, y + 0.05, 0.75 + i * 0.07], bone, Math.PI).rotation.y = 0.3;
    }

    const grow = mix(0.3, 1.9, a.size);
    s.root.scale.setScalar(grow);
    const animate = (time: number) => {
      const speed = mix(0.25, 2.4, mood.energy), reach = mix(0.03, 0.14, mood.energy);
      for (const arm of arms) { arm.g.rotation.z = Math.sin(time * speed + arm.phase) * reach * arm.amp; arm.g.rotation.x = Math.cos(time * speed * 0.7 + arm.phase) * reach * 0.8 * arm.amp; }
      for (const hinge of hinges) hinge.g.rotation.x = Math.max(0, hinge.base + Math.sin(time * speed * (a.pod === 'chewing' ? 3 : 0.8) + (a.pod === 'chewing' ? 0 : hinge.phase)) * (a.pod === 'closed' ? 0.008 : 0.05));
      if (lureMat) lureMat.emissiveIntensity = 1.8 + Math.sin(time * speed * 2) * 0.6;
    };
    animate(0);
    void pods;
    return s.finish({ footprint: 0.6 * grow, update: (_dt, time) => animate(time) });
  },
});
