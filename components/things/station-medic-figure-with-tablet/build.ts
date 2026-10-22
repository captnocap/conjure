import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, type FigureStyle, mix, score } from '@conjure/kit';

type G = CanvasRenderingContext2D;
type Side = 'left' | 'right';
const RAD = Math.PI / 180;

function paint(width: number, height: number, draw: (g: G, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const CLOTHES = {
  scrubs: { top: '#3f8f8a', bottom: '#3f8f8a', shoes: '#f0efe8', sleeves: 'short', note: 'Teal scrubs and white clogs.' },
  polo: { top: '#1f3a5a', bottom: '#b8a888', shoes: '#2a2a2c', sleeves: 'short', note: 'A navy medical polo with khaki trousers.' },
  coat: { top: '#eeeeea', bottom: '#3a4d6b', shoes: '#2a2a2c', sleeves: 'long', note: 'A white coat over blue, the classic doctor.' },
  red: { top: '#b8312f', bottom: '#2a2d33', shoes: '#2a2a2c', sleeves: 'short', note: 'A red crew-medic polo and black trousers.' },
  jumpsuit: { top: '#8d9298', bottom: '#8d9298', shoes: '#2a2a2c', sleeves: 'long', note: 'A grey station jumpsuit with a red-cross armband.' },
} as const;

/** Arm angles in degrees: forward swing, outward swing, elbow bend, forearm swung in across the body. */
type Arm = [number, number, number, number];
function arm(person: Figure, side: Side, [armF, armOut, elbow, foreIn]: Arm) {
  const sign = side === 'left' ? 1 : -1;
  person.joints.shoulders[side].rotation.set(-armF * RAD, 0, sign * armOut * RAD);
  person.joints.elbows[side].rotation.set(-elbow * RAD, -sign * foreIn * RAD, 0);
}
function leg(person: Figure, side: Side, legF: number, knee: number, legOut: number) {
  const sign = side === 'left' ? 1 : -1;
  person.joints.hips[side].rotation.set(-legF * RAD, 0, sign * legOut * RAD);
  person.joints.knees[side].rotation.set(knee * RAD, 0, 0);
  person.joints.ankles[side].rotation.x = -(knee - legF) * RAD;
}

export default defineThing({
  questions: {
    clothes: choice('What are they wearing?', Object.fromEntries(Object.entries(CLOTHES).map(([key, value]) => [key, value.note])) as Record<keyof typeof CLOTHES, string>),
    holding: choice('What is in their hand?', {
      tablet: 'A tablet cradled on the forearm, screen lit.',
      clipboard: 'A clipboard with a paper chart.',
      syringe: 'A syringe held up, ready.',
      blanket: 'A folded grey blanket over the forearm.',
      cup: 'A warm drink in a cup, brought over.',
      nothing: 'Nothing: both hands free.',
    }),
    screen: choice('If there is a tablet or chart, what is on it?', {
      vitals: 'A green heartbeat trace on black.',
      message: 'A text message from home, lines of writing.',
      scan: 'A grey scan image, a skull or a chest.',
      chart: 'A chart of bars and numbers.',
      dark: 'The screen is off, dark glass.',
    }),
    free: choice('What is the other hand doing?', {
      reaching: 'Reaching out to rest on the patient\'s shoulder.',
      pointing: 'Pointing at the screen, explaining.',
      hip: 'Resting on the hip.',
      pocket: 'Hanging loose at the side.',
    }),
    stance: choice('How are they standing?', {
      upright: 'Standing straight, calm and professional.',
      leaning: 'Leaning in toward the patient, one foot forward.',
      crouching: 'Crouched down to be at eye level.',
      kneeling: 'Down on one knee beside the patient.',
    }),
    gaze: choice('Where are they looking?', {
      patient: 'At the patient, head tilted kindly.',
      screen: 'Down at the screen, reading.',
      away: 'Over their shoulder, calling to someone else.',
    }),
    neck: choice('What do they wear on the head or round the neck?', {
      headset: 'A radio headset with a boom microphone.',
      stethoscope: 'A stethoscope slung round the neck.',
      lanyard: 'A lanyard with an ID badge.',
      nothing: 'Nothing.',
    }),
    hair: choice('What is their hair like?', { short: 'Short cropped hair.', long: 'Long hair.', bun: 'Hair tied back in a bun.', cap: 'A surgical cap.', none: 'A shaved head.' }),
    style: choice('What kind of figure is it?', {
      person: 'A simplified clothed person with two dot eyes.',
      mannequin: 'A jointed wooden artist mannequin, faceless.',
      silhouette: 'A flat dark silhouette, like a cut-out against the light.',
      toy: 'A blocky toy figure with square limbs.',
    }),
    height: score('How tall are they?', ['Short', 'Average', 'Tall']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const clothes = CLOTHES[a.clothes];
    const style: FigureStyle = ({ person: 'doll', mannequin: 'mannequin', silhouette: 'silhouette', toy: 'blocky' } as const)[a.style];
    const H = mix(1.55, 1.92, a.height);
    const mirror = random() < 0.5;
    const hold: Side = mirror ? 'right' : 'left', free: Side = mirror ? 'left' : 'right';
    const bodyBuild = random() < 0.25 ? 'heavy' : random() < 0.4 ? 'slight' : 'average';
    const wide = { slight: 0.85, average: 1, heavy: 1.3 }[bodyBuild];
    const person = figure(s, {
      height: H, style, hair: a.hair, hairColor: a.hair === 'cap' ? pick(['#4f86b8', '#3f8f8a', '#7aa6c8', '#6a5a9a']) : pick(['#2a1e18', '#5a3a22', '#c8a060', '#8a8a86', '#1a1a1a']),
      skin: pick(['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b', '#5a3a28']),
      top: clothes.top, bottom: clothes.bottom, shoes: clothes.shoes, sleeves: clothes.sleeves,
      build: bodyBuild,
    });
    s.root.add(person.root);
    const limb = H * 0.036 * wide, front = limb * 1.35 * (bodyBuild === 'heavy' ? 1.25 : 1) + 0.004, torsoL = H * 0.28, shoulderW = H * 0.115 * wide, headR = H * 0.064, foreL = H * 0.15;

    // ---- the pose: legs by stance, the holding arm by prop, the free arm by its job ----
    const j = person.joints;
    const jitter = () => (random() - 0.5) * 6;
    if (a.stance === 'upright') { leg(person, 'left', 0, 0, 4); leg(person, 'right', 0, 0, 4); j.body.rotation.x = 0; }
    if (a.stance === 'leaning') { leg(person, hold, -8, 4, 5); leg(person, free, 18, 10, 3); j.body.rotation.x = 12 * RAD; j.spine.rotation.x = 12 * RAD; }
    if (a.stance === 'crouching') { leg(person, 'left', 95 + jitter(), 140, 14); leg(person, 'right', 95 + jitter(), 140, 14); j.body.rotation.x = 26 * RAD; j.spine.rotation.x = -10 * RAD; }
    if (a.stance === 'kneeling') { leg(person, free, 74, 74, 8); leg(person, hold, -8, 96, 6); j.body.rotation.x = 8 * RAD; j.spine.rotation.x = 6 * RAD; }
    const holdArm: Arm = a.holding === 'nothing' ? [4 + jitter(), 6, 12, 0]
      : a.holding === 'syringe' ? [38, 12, 110, 20]
      : a.holding === 'cup' ? [28, 6, 95, 25]
      : a.holding === 'blanket' ? [20, 10, 92, 30]
      : [26, 6, 82, 38];
    arm(person, hold, holdArm);
    const freeArm: Arm = a.free === 'reaching' ? [mix(55, 68, random()), 12, 14, 0]
      : a.free === 'pointing' ? [34, -2, 100, 58]
      : a.free === 'hip' ? [-10, 38, 95, 55]
      : [4 + jitter(), 6, 12, 0];
    if (a.free === 'pointing' && a.holding === 'nothing') arm(person, free, [mix(55, 68, random()), 12, 14, 0]);
    else arm(person, free, freeArm);
    const yawToward = (side: Side) => (side === 'left' ? 1 : -1) * 18 * RAD;
    if (a.gaze === 'patient') j.neck.rotation.set((a.stance === 'crouching' ? 2 : 16) * RAD, yawToward(free) * 0.8, (free === 'left' ? -1 : 1) * 6 * RAD);
    if (a.gaze === 'screen') j.neck.rotation.set(36 * RAD, yawToward(hold), 0);
    if (a.gaze === 'away') j.neck.rotation.set(-4 * RAD, (random() < 0.5 ? 1 : -1) * 100 * RAD, 0);
    person.settle();

    // ---- clothes details: a coat skirt, an armband, a pocket, a name tape ----
    const silhouette = style === 'silhouette';
    if (!silhouette) {
      if (a.clothes === 'coat') {
        const coat = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.12, H * 0.2, 16, 1, true, Math.PI * 0.3, Math.PI * 1.4), new THREE.MeshStandardMaterial({ color: '#eeeeea', roughness: 0.75, side: THREE.DoubleSide }));
        coat.scale.set(shoulderW * 1.05, 1, limb * 2.1);
        coat.position.y = -H * 0.07;
        coat.castShadow = true;
        j.pelvis.add(coat);
      }
      if (a.clothes === 'jumpsuit') {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(limb * 1.12, limb * 1.12, limb * 1.4, 12), s.material('#f2f2ee', { roughness: 0.8 }));
        band.position.y = -H * 0.07;
        const cross = s.material('#d8262c', { roughness: 0.6 });
        for (const [w, h] of [[limb * 0.3, limb * 0.9], [limb * 0.9, limb * 0.3]] as const) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, limb * 0.1), cross);
          bar.position.set(limb * 1.12, 0, 0);
          bar.rotation.y = Math.PI / 2;
          band.add(bar);
        }
        j.shoulders[free].add(band);
      }
      const tape = s.label(pick(['DR OKAFOR', 'MED HALE', 'SATO RN', 'MEDIC', 'DR LINDQVIST', 'NAIR MD']), 0.1 * H, 0.022 * H, [0, 0, 0], a.clothes === 'coat' || a.clothes === 'scrubs' ? '#1d1d1f' : '#f4f1e6', a.clothes === 'coat' ? '#dfe4ec' : a.clothes === 'scrubs' ? '#f4f1e6' : a.clothes === 'jumpsuit' ? '#2a2d33' : '#f4f1e6');
      tape.position.set(-shoulderW * 0.45, torsoL * 0.74, front);
      j.spine.add(tape);
      // A medical cross patch on the other breast, so the role reads at a glance.
      if (a.clothes !== 'coat') {
        const redGround = a.clothes === 'red';
        const patchMap = paint(64, 64, (g, w, h) => {
          g.fillStyle = redGround ? '#f4f1e6' : '#f4f1e6'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 1, 0, 7); g.fill();
          g.fillStyle = redGround ? '#1d1d1f' : '#d8262c'; g.fillRect(w * 0.4, h * 0.18, w * 0.2, h * 0.64); g.fillRect(w * 0.18, h * 0.4, w * 0.64, h * 0.2);
        });
        const patch = new THREE.Mesh(new THREE.CircleGeometry(limb * 1.0, 20), new THREE.MeshStandardMaterial({ map: patchMap, roughness: 0.8 }));
        patch.position.set(shoulderW * 0.5, torsoL * 0.72, front);
        j.spine.add(patch);
      }
    }

    // ---- head and neck: a headset, a stethoscope, or a lanyard ----
    const dark = s.material('#2a2d33', { roughness: 0.6 });
    if (a.neck === 'headset') {
      const band = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.08, headR * 0.09, 8, 24, Math.PI), dark);
      band.rotation.z = 0; band.position.y = headR * 0.1;
      band.castShadow = true;
      const earSide = free === 'left' ? -1 : 1;
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.32, headR * 0.32, headR * 0.22, 14), dark);
      cup.rotation.z = Math.PI / 2; cup.position.set(earSide * headR * 1.05, 0, 0);
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.05, headR * 0.05, headR * 1.2, 8), dark);
      boom.position.set(earSide * headR * 0.62, -headR * 0.38, headR * 0.6);
      boom.rotation.set(0.9, 0, earSide * 0.9);
      const mic = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.14, 10, 8), dark);
      mic.position.set(earSide * headR * 0.2, -headR * 0.6, headR * 1.05);
      person.head.add(band, cup, boom, mic);
    }
    if (a.neck === 'stethoscope') {
      const rubber = s.material('#3a3f48', { roughness: 0.85 });
      const base = torsoL + limb * 0.4;
      for (const side of [-1, 1]) {
        const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, base, -limb * 1.3), new THREE.Vector3(side * limb * 1.5, base, 0), new THREE.Vector3(side * limb * 1.4, base - torsoL * 0.35, front + 0.006), new THREE.Vector3(side * limb * (side > 0 ? 0.9 : 1.6), base - torsoL * 0.62, front + 0.008),
        ]), 16, limb * 0.11, 6, false);
        const tubeMesh = new THREE.Mesh(tube, rubber);
        tubeMesh.castShadow = true;
        j.spine.add(tubeMesh);
      }
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(limb * 0.42, limb * 0.42, limb * 0.18, 16), s.material('#c9ccd0', { metalness: 0.7, roughness: 0.3 }));
      bell.rotation.x = Math.PI / 2; bell.position.set(limb * 0.9, base - torsoL * 0.64, front + 0.012);
      j.spine.add(bell);
    }
    if (a.neck === 'lanyard') {
      const cord = s.material(pick(['#2f4f8a', '#d8262c', '#2e8a4a', '#f0c419']), { roughness: 0.9 });
      const base = torsoL + limb * 0.4;
      for (const side of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(limb * 0.22, torsoL * 0.5, limb * 0.06), cord);
        strap.position.set(side * limb * 0.9, base - torsoL * 0.25, front + 0.002);
        strap.rotation.z = side * 0.12;
        j.spine.add(strap);
      }
      const badgeMap = paint(64, 96, (g, w, h) => { g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f4f8a'; g.fillRect(0, 0, w, 16); g.fillStyle = '#d9b08c'; g.beginPath(); g.arc(w / 2, 44, 14, 0, 7); g.fill(); g.fillStyle = '#8a8f96'; for (let i = 0; i < 3; i++) g.fillRect(10, 66 + i * 9, w - 20, 4); });
      const badge = new THREE.Mesh(new THREE.PlaneGeometry(limb * 1.1, limb * 1.6), new THREE.MeshStandardMaterial({ map: badgeMap, roughness: 0.8, side: THREE.DoubleSide }));
      badge.position.set(0, base - torsoL * 0.55, front + 0.006);
      j.spine.add(badge);
    }

    // ---- the thing in the hand: a hand's local -y runs on along the forearm, +z faces up when the forearm is level ----
    const palm = person.hands[hold];
    let screenMat: THREE.MeshStandardMaterial | null = null;
    const screenMap = (w: number, h: number) => paint(w, h, (g, cw, ch) => {
      if (a.screen === 'dark') { g.fillStyle = '#111317'; g.fillRect(0, 0, cw, ch); return; }
      if (a.screen === 'vitals') {
        g.fillStyle = '#0a0f12'; g.fillRect(0, 0, cw, ch);
        g.strokeStyle = '#3df27a'; g.lineWidth = 3; g.beginPath();
        for (let x = 0; x < cw; x += 2) { const t = (x / cw) * 6 * Math.PI; const beat = Math.exp(-(((t % (2 * Math.PI)) - 2.2) ** 2) * 18) * ch * 0.3; g.lineTo(x, ch * 0.45 - beat + Math.sin(t * 2) * 3); }
        g.stroke();
        g.strokeStyle = '#49c0ff'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x < cw; x += 2) g.lineTo(x, ch * 0.78 + Math.sin((x / cw) * 9) * ch * 0.05); g.stroke();
        g.fillStyle = '#3df27a'; g.font = `bold ${ch * 0.16}px monospace`; g.fillText(`${58 + Math.floor(random() * 50)}`, cw * 0.72, ch * 0.22);
        return;
      }
      if (a.screen === 'message') {
        g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, cw, ch);
        for (let i = 0; i < 7; i++) { g.fillStyle = i % 3 === 2 ? '#8fd0f0' : '#d0d3d8'; const wline = cw * (0.5 + random() * 0.4); g.beginPath(); g.roundRect(i % 3 === 2 ? cw - wline - 8 : 8, 10 + i * ch * 0.13, wline, ch * 0.09, 8); g.fill(); }
        return;
      }
      if (a.screen === 'scan') {
        g.fillStyle = '#05070a'; g.fillRect(0, 0, cw, ch);
        const grad = g.createRadialGradient(cw / 2, ch / 2, 4, cw / 2, ch / 2, cw * 0.4);
        grad.addColorStop(0, '#dfe6ee'); grad.addColorStop(0.5, '#8a98a8'); grad.addColorStop(1, '#05070a');
        g.fillStyle = grad; g.beginPath(); g.ellipse(cw / 2, ch / 2, cw * 0.36, ch * 0.42, 0, 0, 7); g.fill();
        g.fillStyle = '#2a3440'; g.beginPath(); g.ellipse(cw / 2, ch * 0.55, cw * 0.12, ch * 0.16, 0, 0, 7); g.fill();
        return;
      }
      g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 6; i++) { g.fillStyle = ['#2f4f8a', '#49c0ff', '#d8262c'][i % 3]; const bar = ch * (0.2 + random() * 0.55); g.fillRect(8 + i * (cw / 6), ch - 8 - bar, cw / 6 - 10, bar); }
    });
    if (a.holding === 'tablet' || a.holding === 'clipboard') {
      const group = new THREE.Group();
      const w = 0.18 * (H / 1.7), h = 0.25 * (H / 1.7);
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), a.holding === 'tablet' ? s.material('#1d1f24', { roughness: 0.4 }) : s.material('#6b4a33', { roughness: 0.7 }));
      body.castShadow = true;
      group.add(body);
      screenMat = new THREE.MeshStandardMaterial({ map: screenMap(128, 176), roughness: 0.3, emissive: '#ffffff', emissiveMap: a.holding === 'tablet' && a.screen !== 'dark' ? screenMap(128, 176) : null, emissiveIntensity: a.holding === 'tablet' && a.screen !== 'dark' ? 0.55 : 0 });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.9), screenMat);
      face.position.z = 0.0065;
      group.add(face);
      if (a.holding === 'clipboard') {
        const clip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, h * 0.08, 0.02), s.material('#c9ccd0', { metalness: 0.7, roughness: 0.3 }));
        clip.position.set(0, h * 0.46, 0.01);
        group.add(clip);
      }
      // Propped on the fingertips with its top against the chest, so the screen faces up and forward.
      group.position.set(0, 0.02 * H, 0.045 * H);
      group.rotation.x = 0.85;
      palm.add(group);
    }
    if (a.holding === 'syringe') {
      const group = new THREE.Group();
      const glass = new THREE.MeshStandardMaterial({ color: '#dff0f8', transparent: true, opacity: 0.7, roughness: 0.15, depthWrite: false });
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 12), glass);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 8), s.material('#f0efe8'));
      const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.08, 8), s.material('#f0efe8'));
      plunger.position.y = 0.075;
      const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.005, 12), s.material('#f0efe8'));
      thumb.position.y = 0.115;
      const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.045, 6), s.material('#c9ccd0', { metalness: 0.8, roughness: 0.3 }));
      needle.position.y = -0.075;
      for (const part of [barrel, core, plunger, thumb, needle]) { part.castShadow = part !== barrel; group.add(part); }
      group.position.set(0, -0.01, 0.015);
      group.rotation.x = -Math.PI / 2 - 0.3;
      palm.add(group);
    }
    if (a.holding === 'blanket') {
      const fold = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.16), s.material(pick(['#7f8488', '#5a6a8a', '#b8a888']), { roughness: 1 }));
      fold.position.set(0, foreL * 0.45, 0.02);
      fold.rotation.x = -0.15;
      fold.castShadow = true;
      palm.add(fold);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.012), (fold.material as THREE.Material));
      tail.position.set(0, foreL * 0.45 - 0.05, -0.08);
      tail.rotation.x = 0.2;
      palm.add(tail);
    }
    if (a.holding === 'cup') {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.1, 14), s.material(pick(['#e8e4dc', '#c0392b', '#f0efe8']), { roughness: 0.7 }));
      cup.position.set(0, -0.01, 0.045);
      cup.rotation.x = Math.PI / 2 + 0.2;
      cup.castShadow = true;
      palm.add(cup);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.008, 14), s.material('#4a4e55'));
      lid.position.y = 0.054;
      cup.add(lid);
    }

    // ---- motion: breathing, a reaching hand that pats, a screen that flickers ----
    const energy = mood.energy;
    const patRest = j.shoulders[free].rotation.x;
    const screen = screenMat;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (a.free === 'reaching') j.shoulders[free].rotation.x = patRest + Math.sin(time * mix(1.5, 4, energy)) * 0.03 * (0.3 + energy);
        if (screen && a.screen === 'vitals') screen.emissiveIntensity = 0.5 + 0.12 * Math.max(0, Math.sin(time * 5));
      },
    });
  },
});
