import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, figure, mix, noul, paint, paintHex } from '@conjure/kit';

type V3 = [number, number, number];
type R = () => number;

const canvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t;
};

function bubble(text: string, whisper: boolean, random: R) {
  return canvasTexture(512, 256, (ctx) => {
    ctx.clearRect(0, 0, 512, 256);
    ctx.fillStyle = '#fffdf6'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = whisper ? 6 : 8;
    if (whisper) ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(60, 20); ctx.lineTo(452, 20); ctx.quadraticCurveTo(492, 20, 492, 60); ctx.lineTo(492, 150); ctx.quadraticCurveTo(492, 190, 452, 190);
    ctx.lineTo(150, 190); ctx.lineTo(70, 246); ctx.lineTo(100, 190); ctx.lineTo(60, 190); ctx.quadraticCurveTo(20, 190, 20, 150); ctx.lineTo(20, 60); ctx.quadraticCurveTo(20, 20, 60, 20); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    const lines = text.split('\n');
    ctx.fillStyle = whisper ? '#3a3430' : '#c8281a';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const size = whisper ? 64 : Math.min(84, 150 / lines.length);
    ctx.font = `${whisper ? 'italic bold ' : 'bold '}${size}px "Comic Sans MS", "Chalkboard", cursive, sans-serif`;
    lines.forEach((line, i) => {
      ctx.save(); ctx.translate(256, 105 + (i - (lines.length - 1) / 2) * size * 1.05); ctx.rotate((random() - 0.5) * (whisper ? 0.02 : 0.08));
      ctx.fillText(line, 0, 0, 440); ctx.restore();
    });
  });
}

export default defineThing({
  questions: {
    costume: choice('What costume is the child wearing?', {
      witch: 'A witch: pointed hat, cape, little black dress with a jagged hem and striped tights, a toy broom.',
      wizard: 'A wizard: a tall starry cone hat, a long robe, a cotton-wool beard and a wand.',
      cat: 'A black cat: ears on a headband, a long tail, a bow at the collar.',
      superhero: 'A superhero: a cape, an eye mask and a badge on the chest.',
      skeleton: 'Skeleton pyjamas: black with white bones printed on.',
    }),
    hat: paint('What colour is the hat (or the bow, mask and badge)?', ['black', 'purple', 'indigo', 'green', 'orange', 'navy', 'red', 'magenta']),
    cape: paint('What colour is the cape or robe?', ['black', 'purple', 'crimson', 'red', 'blue', 'green', 'orange', 'navy']),
    pose: choice('What are they doing?', {
      doorbell: 'Up on tiptoe, one finger out, ringing the doorbell.',
      bowl: 'Bent over a candy bowl on the step, hand plunged in.',
      loot: 'Kneeling on the pavement, comparing their loot, holding a candy bar up to inspect it.',
      running: 'Running to the next house, cape flying.',
    }),
    glow: noul('Is a glow-stick bracelet glowing on their wrist?'),
    saying: choice('What are they saying?', {
      shouting: 'Shouting TRICK OR TREAT! at the top of their lungs.',
      feet: 'Chanting TRICK OR TREAT, SMELL MY FEET!',
      thanks: 'Whispering a shy thank you.',
      nothing: 'Nothing: too busy concentrating.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = 1.05 + random() * 0.25;
    const glowAmount = clamp01(0.3 + 0.7 * (0.4 * mood.cheer + 0.3 * mood.energy + 0.3 * mood.warmth));
    const hatHex = paintHex(a.hat), capeHex = paintHex(a.cape);
    const skin = pick(['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b']);
    const hairCol = pick(['#2a1c14', '#5a3a22', '#c89a5a', '#1a1414', '#8a3a1a']);
    const outfit = {
      witch: { top: '#1d1a22', bottom: '#ffffff', shoes: '#141414', hair: 'long' as const },
      wizard: { top: capeHex, bottom: capeHex, shoes: '#3a2a1a', hair: 'short' as const },
      cat: { top: '#16161a', bottom: '#16161a', shoes: '#16161a', hair: 'short' as const },
      superhero: { top: pick(['#1f5fd1', '#2f9e44', '#7b2fa8', '#d6198a']), bottom: '#1b2a55', shoes: '#c8102e', hair: 'short' as const },
      skeleton: { top: '#ffffff', bottom: '#ffffff', shoes: '#e8e4dc', hair: 'short' as const },
    }[a.costume];
    const pose = a.pose === 'loot' ? 'kneeling' : a.pose === 'running' ? 'running' : 'standing';
    const person = figure(s, {
      height: H, style: 'doll', pose, hair: outfit.hair, hairColor: hairCol, skin, top: outfit.top, bottom: outfit.bottom, shoes: outfit.shoes, sleeves: 'long',
      gaze: a.saying === 'thanks' || a.pose === 'loot' ? 'down' : a.saying === 'shouting' || a.saying === 'feet' ? 'up' : 'ahead', mirror: random() < 0.5,
    });
    s.root.add(person.root);
    const { joints } = person;
    const headR = 0.064 * H, torsoL = 0.28 * H, limb = 0.036 * H;
    const legMat = (joints.hips.left.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const torso = joints.spine.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh;
    const topMat = torso.material as THREE.MeshStandardMaterial;

    // ---- printed fabrics ----
    if (a.costume === 'witch') {
      const stripe = pick(['#ee7a12', '#7b2fa8', '#2f9e44', '#f4f2ec']);
      legMat.map = canvasTexture(16, 128, (ctx) => { ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, 16, 128); ctx.fillStyle = stripe; for (let y = 0; y < 128; y += 16) ctx.fillRect(0, y, 16, 8); });
      legMat.color.set('#ffffff');
    }
    if (a.costume === 'skeleton') {
      topMat.map = canvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = '#121214'; ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#efece2';
        // u = 0 and 1 are the front of a capsule: ribs there, the spine at the back.
        for (let i = 0; i < 5; i++) { const y = 70 + i * 26, w = 34 - i * 2; ctx.fillRect(0, y, w, 10); ctx.fillRect(256 - w, y, w, 10); }
        ctx.fillRect(0, 40, 6, 170); ctx.fillRect(250, 40, 6, 170);
        ctx.fillRect(120, 30, 16, 200);
      });
      topMat.color.set('#ffffff');
      const boneMat = s.material('#ffffff', { roughness: 0.45 });
      boneMat.map = canvasTexture(64, 128, (ctx) => {
        ctx.fillStyle = '#121214'; ctx.fillRect(0, 0, 64, 128);
        ctx.fillStyle = '#efece2'; ctx.fillRect(0, 10, 7, 108); ctx.fillRect(57, 10, 7, 108);
        for (const y of [10, 118]) { ctx.beginPath(); ctx.arc(4, y, 8, 0, 7); ctx.arc(60, y, 8, 0, 7); ctx.fill(); }
      });
      legMat.map = boneMat.map; legMat.color.set('#ffffff');
      for (const sideKey of ['left', 'right'] as const) joints.shoulders[sideKey].traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.material === topMat) m.material = boneMat; });
    }
    if (a.costume === 'wizard') {
      topMat.map = canvasTexture(128, 128, (ctx) => {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#f6d24a';
        for (let i = 0; i < 14; i++) { const x = random() * 128, y = random() * 128; ctx.beginPath(); for (let k = 0; k < 10; k++) { const ang = k * Math.PI / 5, r = k % 2 ? 2.5 : 6; ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r); } ctx.fill(); }
      });
    }

    // ---- the costume pieces ----
    const hatMat = s.material(hatHex, { roughness: 0.7 });
    const capeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(capeHex), roughness: 0.55, side: THREE.DoubleSide });
    const attach = (parent: THREE.Object3D, mesh: THREE.Mesh, at: V3) => { mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const head = person.head;
    if (a.costume === 'witch' || a.costume === 'wizard') {
      const tall = a.costume === 'wizard' ? 3.8 : 3.0;
      attach(head, new THREE.Mesh(new THREE.CylinderGeometry(headR * (a.costume === 'witch' ? 2.1 : 1.5), headR * (a.costume === 'witch' ? 2.1 : 1.5), headR * 0.08, 28), hatMat), [0, headR * 0.62, 0]);
      const cone = attach(head, new THREE.Mesh(new THREE.ConeGeometry(headR * 1.08, headR * tall, 24, 4), hatMat), [0, headR * (0.62 + tall / 2), -headR * 0.05]);
      cone.rotation.x = -0.12;
      // The tip flops over.
      const tip = attach(head, new THREE.Mesh(new THREE.ConeGeometry(headR * 0.32, headR * 1.1, 12), hatMat), [0, headR * (0.62 + tall * 0.95), -headR * 0.55]);
      tip.rotation.x = -0.9;
      const band = attach(head, new THREE.Mesh(new THREE.TorusGeometry(headR * 1.02, headR * 0.1, 6, 28), s.material(a.costume === 'witch' ? pick(['#ee7a12', '#9bd10f', '#7b2fa8']) : '#f6d24a')), [0, headR * 0.82, -headR * 0.02]);
      band.rotation.x = Math.PI / 2;
      if (a.costume === 'wizard') {
        const star = s.material('#f6d24a', { emissive: '#f6c02a', emissiveIntensity: 0.3 });
        for (let i = 0; i < 6; i++) { const t = 0.2 + random() * 0.6, ang = random() * Math.PI * 2; attach(head, new THREE.Mesh(new THREE.SphereGeometry(headR * 0.12, 6, 4), star), [Math.sin(ang) * headR * 1.08 * (1 - t) + 0, headR * (0.62 + tall * t), Math.cos(ang) * headR * 1.08 * (1 - t)]); }
        const beard = attach(head, new THREE.Mesh(new THREE.ConeGeometry(headR * 0.8, headR * 2.2, 16), s.material('#f4f2ec', { roughness: 1 })), [0, -headR * 1.4, headR * 0.55]);
        beard.rotation.x = Math.PI + 0.25;
      }
    }
    if (a.costume === 'cat') {
      const pink = s.material('#f2a0b8');
      for (const sx of [-1, 1]) {
        const ear = attach(head, new THREE.Mesh(new THREE.ConeGeometry(headR * 0.42, headR * 0.8, 4), s.material('#16161a')), [sx * headR * 0.6, headR * 1.05, 0]);
        ear.rotation.z = -sx * 0.25;
        const inner = attach(head, new THREE.Mesh(new THREE.ConeGeometry(headR * 0.24, headR * 0.5, 4), pink), [sx * headR * 0.62, headR * 1.02, headR * 0.12]);
        inner.rotation.z = -sx * 0.25;
      }
      attach(head, new THREE.Mesh(new THREE.TorusGeometry(headR * 1.04, headR * 0.06, 6, 24, Math.PI), s.material('#16161a')), [0, headR * 0.2, 0]).rotation.y = Math.PI / 2;
      attach(head, new THREE.Mesh(new THREE.SphereGeometry(headR * 0.13, 8, 6), pink), [0, -headR * 0.2, headR * 0.98]);
      for (const sx of [-1, 1]) for (const dy of [-0.05, -0.2]) {
        const w = attach(head, new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.03, headR * 0.03), s.material('#16161a')), [sx * headR * 0.5, -headR * 0.15 + dy * headR, headR * 0.86]);
        w.rotation.z = sx * dy * 2;
      }
      const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, -0.02, -0.06], [0, -0.14, -0.18], [0.02, -0.12, -0.32], [0.05, 0.02, -0.38], [0.04, 0.12, -0.34]].map(([x, y, z]) => new THREE.Vector3(x * H, y * H, z * H))), 24, 0.014 * H, 8), s.material('#16161a'));
      attach(person.pelvis, tail, [0, 0, 0]);
      const bow = s.material(hatHex);
      for (const sx of [-1, 1]) attach(joints.spine, new THREE.Mesh(new THREE.ConeGeometry(0.03 * H, 0.05 * H, 4), bow), [sx * 0.025 * H, torsoL * 0.98, limb * 1.35]).rotation.z = sx * Math.PI / 2;
      attach(joints.spine, new THREE.Mesh(new THREE.SphereGeometry(0.014 * H, 8, 6), bow), [0, torsoL * 0.98, limb * 1.4]);
    }
    if (a.costume === 'superhero') {
      const mask = attach(head, new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.04, headR * 1.04, headR * 0.38, 24, 1, true), new THREE.MeshStandardMaterial({ color: hatHex, roughness: 0.5, side: THREE.DoubleSide })), [0, headR * 0.12, 0]);
      void mask;
      const badge = attach(joints.spine, new THREE.Mesh(new THREE.CircleGeometry(0.045 * H, 20), s.material('#f4d40c')), [0, torsoL * 0.62, limb * 1.38]);
      const bolt = new THREE.Shape(); bolt.moveTo(0.01, 0.035); bolt.lineTo(-0.018, -0.002); bolt.lineTo(0.0, -0.002); bolt.lineTo(-0.01, -0.035); bolt.lineTo(0.02, 0.006); bolt.lineTo(0.002, 0.006); bolt.closePath();
      const mark = new THREE.Mesh(new THREE.ShapeGeometry(bolt), s.material(hatHex));
      mark.scale.setScalar(H); mark.position.z = 0.002; badge.add(mark);
      attach(person.pelvis, new THREE.Mesh(new THREE.CylinderGeometry(limb * 1.3, limb * 1.3, 0.025 * H, 16), s.material(hatHex)), [0, 0.03 * H, 0]).scale.x = 2.1;
    }
    if (a.costume === 'witch' || a.costume === 'wizard') {
      // A skirt or robe from the waist: jagged for the witch, to the ankles for the wizard.
      const long = a.costume === 'wizard';
      const len = long ? 0.42 * H : 0.2 * H;
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 6; i++) pts.push(new THREE.Vector2(0.085 * H + (i / 6) ** 1.4 * (long ? 0.08 : 0.1) * H, -(i / 6) * len));
      const geo = new THREE.LatheGeometry(pts, 24);
      if (!long) {
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) if (p.getY(i) < -len * 0.99) { const ang = Math.atan2(p.getX(i), p.getZ(i)); p.setY(i, -len + (Math.round(ang / (Math.PI / 12)) % 2 ? 0.03 * H : 0)); }
      }
      attach(person.pelvis, new THREE.Mesh(geo, long ? topMat : new THREE.MeshStandardMaterial({ color: '#1d1a22', roughness: 0.6, side: THREE.DoubleSide })), [0, 0.03 * H, 0]);
    }

    // The cape: from the shoulders round the back, flaring toward the hem.
    const running = a.pose === 'running';
    if (a.costume === 'witch' || a.costume === 'superhero' || a.costume === 'wizard') {
      const L = (a.costume === 'wizard' ? 0.62 : 0.5) * H;
      const top = torsoL * 0.97;
      const ripple = random() * 6;
      const cape = s.surface((u, v, t) => {
        const ang = (u - 0.5) * Math.PI * 1.15;
        const r = mix(0.1 * H, 0.21 * H, v) + 0.012 * H * Math.sin(ang * 6 + ripple) * v;
        const fly = running ? 0.32 * H * v * v : 0.02 * H * v;
        t.set(Math.sin(ang) * r, top - v * L * (running ? 0.8 : 1) + (running ? 0.18 * H * v * v : 0), -Math.cos(ang) * r * 0.75 - fly);
      }, capeMat, { segments: [28, 14] });
      cape.removeFromParent();
      joints.spine.add(cape);
      // A collar tie at the throat.
      attach(joints.spine, new THREE.Mesh(new THREE.TorusGeometry(0.05 * H, 0.006 * H, 6, 20, Math.PI), capeMat), [0, top, 0]).rotation.set(Math.PI / 2, 0, 0);
    }

    // ---- the pose ----
    if (a.pose === 'doorbell') {
      // Up on tiptoe.
      for (const k of ['left', 'right'] as const) joints.ankles[k].rotation.x = 0.45;
      joints.body.rotation.x = -0.04;
    }
    if (a.pose === 'bowl') { joints.body.rotation.x = 0.3; joints.spine.rotation.x = 0.55; for (const k of ['left', 'right'] as const) { joints.hips[k].rotation.x = -0.35; joints.knees[k].rotation.x = 0.6; joints.ankles[k].rotation.x = -0.25; } }
    person.settle();
    s.root.updateMatrixWorld(true);
    const reachSide = random() < 0.5 ? 'right' : 'left';
    const otherSide = reachSide === 'right' ? 'left' : 'right';
    const shoulder = joints.shoulders[reachSide].getWorldPosition(new THREE.Vector3());
    const extras: THREE.Object3D[] = [];
    // The candy pail or bag.
    const orange = s.material('#ee7a12', { roughness: 0.35 }), black = s.material('#141414', { roughness: 0.4 });
    const makePail = (parent: THREE.Object3D, at: V3, tip = 0) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.085, 0.03], [0.095, 0.08], [0.088, 0.13], [0.082, 0.145], [0.078, 0.145], [0.078, 0.01], [0, 0.01]].map(([x, y]) => new THREE.Vector2(x, y)), 24), orange);
      body.castShadow = true; g.add(body);
      for (const dx of [-1, 1]) { const eye = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.022, 3), black); eye.position.set(dx * 0.03, 0.095, 0.09); eye.rotation.x = Math.PI / 2; eye.scale.z = 0.25; g.add(eye); }
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.005, 6, 20, Math.PI), black); handle.position.y = 0.13; g.add(handle);
      const loot = ['#c8102e', '#f4d40c', '#1f5fd1', '#7b2fa8', '#2f9e44'];
      for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.022), s.material(loot[i % 5], { roughness: 0.4 })); c.position.set((random() - 0.5) * 0.08, 0.13, (random() - 0.5) * 0.08); c.rotation.set(random(), random() * 6, random()); g.add(c); }
      g.position.set(...at); g.rotation.z = tip;
      parent.add(g);
      return g;
    };
    const wrist = new THREE.Vector3();
    if (a.pose === 'doorbell') {
      person.reach(reachSide, new THREE.Vector3(shoulder.x * 0.5, shoulder.y + 0.26 * H, shoulder.z + 0.24 * H), { space: s.root });
    } else if (a.pose === 'bowl') {
      const hand = new THREE.Vector3(shoulder.x * 0.5, shoulder.y - 0.3 * H, shoulder.z + 0.16 * H);
      const stepH = Math.min(0.22, Math.max(0.15, hand.y - 0.07));
      // The edge of the porch, with the bowl set out on it.
      const wood = s.material('#8a6a4a', { roughness: 0.85 });
      s.box([1.0, stepH, 0.4], [0, stepH / 2, hand.z + 0.13], wood);
      s.box([1.02, 0.03, 0.42], [0, stepH + 0.015, hand.z + 0.13], s.material('#6a4a32', { roughness: 0.85 }));
      s.lathe([[0, 0], [0.08, 0], [0.13, 0.04], [0.16, 0.09], [0.152, 0.092], [0.12, 0.045], [0.07, 0.012], [0, 0.012]], s.material(pick(['#ee7a12', '#111214', '#7b2fa8']), { roughness: 0.3, side: THREE.DoubleSide }), [hand.x, stepH + 0.03, hand.z + 0.04]);
      const cols = ['#c8102e', '#f4d40c', '#1f5fd1', '#7b2fa8', '#2f9e44', '#5a3320'];
      for (let i = 0; i < 22; i++) { const r = random() * 0.12, th = random() * 6; const c = s.box([0.05, 0.012, 0.024], [hand.x + Math.cos(th) * r, stepH + 0.1 + random() * 0.02, hand.z + 0.04 + Math.sin(th) * r], s.material(cols[i % cols.length], { roughness: 0.35, metalness: 0.2 })); c.rotation.set(random() * 0.6, random() * 6, random() * 0.6); }
      hand.y = stepH + 0.1;
      person.reach(reachSide, hand, { space: s.root });
      person.lookAt(hand, s.root);
    } else if (a.pose === 'loot') {
      const face = person.head.getWorldPosition(new THREE.Vector3());
      const bar = new THREE.Vector3(shoulder.x * 0.5, face.y - 0.04 * H, face.z + 0.22 * H);
      person.reach(reachSide, bar, { space: s.root });
      person.reach(otherSide, new THREE.Vector3(-shoulder.x * 0.3, face.y - 0.12 * H, face.z + 0.2 * H), { space: s.root });
      person.lookAt(bar, s.root);
      const held = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.03, 0.016), s.material(pick(['#c8102e', '#ee7a12', '#5a3320', '#1f5fd1']), { roughness: 0.3, metalness: 0.25 }));
      held.position.y = -0.01; held.castShadow = true; person.hands[reachSide].add(held);
      // The haul spread out on the pavement in front.
      const cols = ['#c8102e', '#f4d40c', '#1f5fd1', '#7b2fa8', '#2f9e44', '#5a3320', '#ee7a12', '#f4f2ec'];
      for (let i = 0; i < 26; i++) { const c = s.box([0.06, 0.012, 0.028], [(random() - 0.5) * 0.5, 0.006, 0.3 * H + random() * 0.25], s.material(cols[i % cols.length], { roughness: 0.35, metalness: 0.2 })); c.rotation.y = random() * 6; }
      for (let i = 0; i < 4; i++) s.cylinder(0.002, 0.002, 0.06, [(random() - 0.5) * 0.4, 0.004, 0.32 * H + random() * 0.2], s.material('#f4f1e8'), 5).rotation.set(Math.PI / 2, 0, random() * 6);
      extras.push(makePail(s.root, [-shoulder.x * 1.8 + (shoulder.x > 0 ? -0.1 : 0.1), 0.085, 0.05], Math.PI / 2 - 0.15));
    }
    // The bag in the free hand, except when the pail is on the ground.
    if (a.pose !== 'loot') {
      const free = a.pose === 'running' ? (random() < 0.5 ? 'left' : 'right') : otherSide;
      if (random() < 0.7) {
        makePail(person.hands[free], [0, -0.14, 0]);
      } else {
        const sack = s.material(pick(['#f2efe6', '#c9dcef', '#f3d0dc']), { roughness: 0.95 });
        const bag = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.08, 0.01], [0.11, 0.07], [0.1, 0.15], [0.05, 0.21], [0.02, 0.24], [0.03, 0.26]].map(([x, y]) => new THREE.Vector2(x, y)), 18), sack);
        bag.position.y = -0.27; bag.castShadow = true; person.hands[free].add(bag);
      }
    }
    if (a.glow) {
      const hue = pick(['#9bff3a', '#ff4ad0', '#3ad6ff', '#ffe23a']);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.2, 0.0065, 8, 24), new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: mix(0.8, 3.2, glowAmount), roughness: 0.3 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.055 * H * 0.8;
      person.hands[reachSide].add(ring);
      extras.push(ring);
    }
    if (a.costume === 'witch' || a.costume === 'wizard') {
      // A toy broom or a star wand.
      const free = a.pose === 'loot' ? null : a.pose === 'running' ? reachSide : null;
      if (a.costume === 'witch' && a.pose !== 'loot') {
        const broom = new THREE.Group();
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.75 * H, 8), s.material('#8a6a3a'));
        const straw = new THREE.Mesh(new THREE.ConeGeometry(0.07 * H, 0.2 * H, 12, 1, true), s.material('#d8b45a', { side: THREE.DoubleSide, roughness: 1 }));
        straw.position.y = -0.4 * H; stick.castShadow = straw.castShadow = true;
        broom.add(stick, straw);
        if (free) { broom.position.y = -0.02; broom.rotation.x = 1.3; person.hands[free].add(broom); }
        else { broom.position.set(-shoulder.x * 2.2, 0.38 * H, -0.08); broom.rotation.z = Math.sign(shoulder.x || 1) * 0.25; broom.rotation.x = Math.PI; s.root.add(broom); }
      }
      if (a.costume === 'wizard' && a.pose !== 'bowl' && a.pose !== 'loot') {
        const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.28 * H, 6), s.material('#3a2a1a'));
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.025 * H, 0), new THREE.MeshStandardMaterial({ color: '#ffe27a', emissive: '#ffd040', emissiveIntensity: mix(0.4, 2, glowAmount) }));
        star.position.y = 0.15 * H; wand.add(star); wand.position.y = 0.06 * H; wand.castShadow = true;
        person.hands[reachSide].add(wand);
      }
    }

    // ---- what they say ----
    if (a.saying !== 'nothing') {
      const text = { shouting: 'TRICK OR\nTREAT!', feet: 'TRICK OR TREAT\nSMELL MY FEET!', thanks: 'thank you...' }[a.saying];
      const whisper = a.saying === 'thanks';
      s.root.updateMatrixWorld(true);
      const top = new THREE.Box3().setFromObject(person.root);
      const w = (whisper ? 0.46 : 0.56) * H, h = w / 2;
      const map = bubble(text, whisper, random);
      const card = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5 }));
      const sx = shoulder.x >= 0 ? 1 : -1;
      card.position.set(sx * 0.32 * H, top.max.y + h * 0.35, 0.05);
      card.rotation.z = (random() - 0.5) * 0.06;
      s.root.add(card);
    }

    const energy = mood.energy;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (running) person.root.position.y = Math.abs(Math.sin(time * (3 + energy * 6))) * 0.01 * energy;
      },
    });
  },
});
