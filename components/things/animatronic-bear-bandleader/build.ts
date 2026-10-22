import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

const FUR = {
  brown: 'Chestnut brown with a tan muzzle and belly, the classic showbiz bear.',
  honey: 'Golden honey yellow, friendly and loud.',
  blue: 'Faded powder blue, a cartoon bear from a lunchbox.',
  pink: 'Bubblegum pink gone slightly grey.',
  cream: 'Polar cream white that shows every stain.',
  black: 'Dark charcoal fur with a pale snout, a little menacing.',
} as const;
const FUR_TINT: Record<keyof typeof FUR, [string, string]> = {
  brown: ['#8a5a34', '#dcb98a'], honey: ['#d9a12e', '#f4dfa6'], blue: ['#7fa3c4', '#e3e9ee'],
  pink: ['#d58aa5', '#f3dbe0'], cream: ['#e6dcc3', '#f6f0df'], black: ['#3a3634', '#c9b9a2'],
};

function furTexture(base: string, wear: number, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) {
    const x = random() * 128, y = random() * 128;
    ctx.strokeStyle = random() > 0.5 ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 3, y + 3 + random() * 5); ctx.stroke();
  }
  for (let i = 0; i < wear * 26; i++) {
    const x = random() * 128, y = random() * 128, r = 5 + random() * 16;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(40,32,24,${0.25 + wear * 0.3})`); g.addColorStop(1, 'rgba(40,32,24,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

export default defineThing({
  questions: {
    pose: choice('What pose is the bear frozen in?', {
      singing: 'Mid-song: head thrown back, jaw wide open, instrument up.',
      dropped: 'Head dropped forward on its chest, arms hanging, as if asleep or switched off mid-bar.',
      wave: 'One arm raised high in a stiff wave to the birthday child, head cocked.',
      staring: 'Bolt upright, arms at its sides, staring straight out at the room.',
    }),
    eyes: choice('What state are its eyes in?', {
      bright: 'Wide and bright, glassy pupils dead ahead.',
      drooped: 'One eyelid drooped half shut, a lazy broken wink.',
      rolled: 'Both eyes rolled up into the head showing mostly white.',
      crossed: 'Pupils stuck pointing in different directions.',
      shut: 'Both lids closed.',
    }),
    fur: choice('What colour is the fur?', FUR),
    outfit: choice('What is it dressed in?', {
      bandleader: 'A black bowler hat and a big red bow tie, nothing else.',
      waistcoat: 'Bowler, bow tie and a red satin waistcoat with gold buttons.',
      boater: 'A straw boater hat and a striped barbershop vest.',
      tophat: 'A tall top hat with a band and a spotted bow tie, a ringmaster.',
      birthday: 'A paper party cone hat and a ruffled collar.',
    }),
    instrument: choice('What does it hold?', {
      microphone: 'A chrome stage microphone on a cable.',
      banjo: 'A banjo slung across its belly.',
      nothing: 'Empty paws; whatever it held is gone.',
    }),
    story: choice('What has happened to it?', {
      performing: 'Still performing nightly: stage bulbs lit, joints moving, eyes shining.',
      'powered-down': 'Powered down in 1989 and never switched back on: dark, still, intact.',
      stripped: 'Half stripped for parts: one arm bare metal, an eye and an ear gone, chest panel open.',
      twitching: 'Unplugged for years yet it still twitches now and then.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [furColour, paleColour] = FUR_TINT[a.fur];
    const live = a.story === 'performing';
    const stripped = a.story === 'stripped';
    const fur = s.material('#ffffff', { map: furTexture(furColour, mood.wear, random), roughness: 0.95 });
    const pale = s.material('#ffffff', { map: furTexture(paleColour, mood.wear, random), roughness: 0.95 });
    const metal = s.material('#aab0b3', { metalness: 0.8, roughness: 0.35 });
    const dark = s.material('#1b1a1c', { roughness: 0.7 });
    const white = s.material('#f4f1e8', { roughness: 0.25 });
    const red = s.material('#c22a2a', { roughness: 0.45 });
    const gold = s.material('#d8ac3c', { metalness: 0.7, roughness: 0.3 });
    const add = (group: THREE.Object3D, ...meshes: THREE.Object3D[]) => { for (const m of meshes) group.add(m); };

    // Stage base with a bulb ring and a star.
    const baseH = 0.24;
    s.cylinder(0.66, 0.7, baseH, [0, baseH / 2, 0], s.material(mood.cheer > 0.45 ? '#b3262e' : '#6d3a3d'), 32);
    s.cylinder(0.68, 0.68, 0.03, [0, baseH, 0], s.material('#2b2a30'), 32);
    const glow = live ? mix(0.5, 2.2, mood.cheer) : 0;
    const bulbOn = new THREE.MeshStandardMaterial({ color: '#fff0b0', emissive: '#ffcf60', emissiveIntensity: glow, roughness: 0.4 });
    const bulbOff = s.material('#8d8672', { roughness: 0.5 });
    const bulbs: { at: P3; size: number; color: string }[] = [];
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * Math.PI * 2;
      bulbs.push({ at: [Math.sin(t) * 0.69, baseH * 0.55, Math.cos(t) * 0.69], size: 0.035, color: '#ffffff' });
    }
    s.scatter(new THREE.SphereGeometry(1, 10, 8), live ? bulbOn : bulbOff, bulbs);
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.035 : 0.085, t = (i / 10) * Math.PI * 2;
      if (i === 0) star.moveTo(Math.sin(t) * r, Math.cos(t) * r); else star.lineTo(Math.sin(t) * r, Math.cos(t) * r);
    }
    for (const t of [-0.5, 0, 0.5]) {
      const m = s.mesh(new THREE.ShapeGeometry(star), new THREE.MeshStandardMaterial({ color: '#f2d24a', side: THREE.DoubleSide }), [Math.sin(t) * 0.7, baseH * 0.5, Math.cos(t) * 0.7]);
      m.rotation.y = t;
    }
    for (let i = 0; i < 4; i++) s.cylinder(0.025, 0.025, 0.03, [Math.sin(i * 1.57 + 0.8) * 0.56, baseH + 0.02, Math.cos(i * 1.57 + 0.8) * 0.56], metal, 6);

    const y0 = baseH + 0.015;
    // Legs and feet.
    for (const side of [-1, 1]) {
      s.cylinder(0.13, 0.15, 0.5, [side * 0.17, y0 + 0.3, 0], fur, 14);
      s.ball([0.16, 0.09, 0.23], [side * 0.18, y0 + 0.08, 0.07], fur, 14);
      s.ball([0.1, 0.02, 0.14], [side * 0.18, y0 + 0.005, 0.09], pale, 10);
    }
    // Torso.
    const torsoY = y0 + 0.86;
    s.ball([0.38, 0.44, 0.33], [0, torsoY, 0], fur, 24);
    s.ball([0.27, 0.32, 0.12], [0, torsoY - 0.03, 0.24], pale, 20);
    // Support post up the back, the tell of a bolted-down show figure.
    s.rod([0, baseH, -0.3], [0, torsoY + 0.1, -0.3], 0.03, metal);

    if (a.outfit === 'waistcoat' || a.outfit === 'boater') {
      const striped = a.outfit === 'boater';
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = striped ? '#f1ead6' : '#b21f2b'; ctx.fillRect(0, 0, 64, 64);
      if (striped) { ctx.fillStyle = '#b21f2b'; for (let i = 0; i < 8; i++) ctx.fillRect(i * 8, 0, 4, 64); }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = THREE.RepeatWrapping; map.repeat.set(3, 1);
      const vest = s.mesh(new THREE.SphereGeometry(1, 28, 16, Math.PI / 2 + 0.42, Math.PI * 2 - 0.84, 0.55, 1.75), s.material('#ffffff', { map, roughness: 0.4, side: THREE.DoubleSide }), [0, torsoY, 0]);
      vest.scale.set(0.4, 0.46, 0.35);
      for (let i = 0; i < 3; i++) s.ball([0.022, 0.022, 0.012], [0.13, torsoY + 0.1 - i * 0.12, 0.3 - Math.abs(i - 1) * 0.02], gold, 8);
    }

    // Head group, pivoting at the neck.
    const head = new THREE.Group();
    head.position.set(0, torsoY + 0.4, 0.02);
    s.root.add(head);
    const skull = s.ball([0.3, 0.27, 0.27], [0, 0.24, 0], fur, 24);
    const muzzle = s.ball([0.16, 0.11, 0.14], [0, 0.17, 0.22], pale, 18);
    const nose = s.ball([0.055, 0.04, 0.04], [0, 0.22, 0.35], dark, 12);
    const teeth = s.box([0.16, 0.03, 0.02], [0, 0.1, 0.3], white);
    add(head, skull, muzzle, nose, teeth);
    for (const side of [-1, 1]) {
      if (stripped && side === -1) {
        const stub = s.cylinder(0.02, 0.02, 0.08, [side * 0.22, 0.48, 0], metal, 8);
        add(head, stub);
        continue;
      }
      const ear = s.ball([0.1, 0.1, 0.05], [side * 0.23, 0.47, 0], fur, 14);
      const inner = s.ball([0.06, 0.06, 0.03], [side * 0.23, 0.47, 0.03], pale, 12);
      add(head, ear, inner);
    }
    // Eyes.
    const eyeGlow = live ? mix(0.15, 0.9, mood.cheer) : a.story === 'twitching' ? 0.25 : 0;
    const iris = new THREE.MeshStandardMaterial({ color: '#2a5fb0', emissive: '#3f8cff', emissiveIntensity: eyeGlow, roughness: 0.2 });
    const lidMaterial = s.material(new THREE.Color(furColour).multiplyScalar(0.75), { roughness: 0.9, side: THREE.DoubleSide });
    for (const side of [-1, 1]) {
      const ex = side * 0.115, ey = 0.31, ez = 0.215;
      if (stripped && side === 1) {
        add(head, s.ball([0.058, 0.058, 0.03], [ex, ey, ez + 0.01], dark, 12));
        add(head, s.rod([ex, ey, ez + 0.02], [ex + 0.04, ey - 0.12, ez + 0.07], 0.006, s.material('#b33a2a')));
        continue;
      }
      const ball = s.ball([0.062, 0.062, 0.062], [ex, ey, ez], white, 16);
      let px = 0, py = 0;
      if (a.eyes === 'rolled') py = 0.045;
      if (a.eyes === 'crossed') { px = side === 1 ? -0.03 : 0.035; py = side === 1 ? -0.02 : 0.03; }
      const pupilZ = Math.sqrt(Math.max(0.0001, 0.062 ** 2 - px * px - py * py));
      const irisMesh = s.ball([0.03, 0.03, 0.012], [ex + px, ey + py, ez + pupilZ - 0.004], iris, 12);
      const pupil = s.ball([0.015, 0.015, 0.008], [ex + px * 1.05, ey + py * 1.05, ez + pupilZ + 0.004], dark, 10);
      const lid = s.mesh(new THREE.SphereGeometry(0.067, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), lidMaterial, [ex, ey, ez]);
      const closed = a.eyes === 'shut' ? 1.25 : a.eyes === 'drooped' && side === -1 ? 0.75 : a.eyes === 'rolled' ? -0.1 : -0.55;
      lid.rotation.x = closed + mood.wear * 0.12;
      const brow = s.ball([0.07, 0.018, 0.02], [ex, ey + 0.085, ez + 0.03], lidMaterial, 8);
      brow.rotation.z = side * (a.eyes === 'drooped' ? 0.3 : -0.15);
      add(head, ball, irisMesh, pupil, lid, brow);
    }
    // Jaw.
    const jaw = new THREE.Group();
    jaw.position.set(0, 0.13, 0.1);
    const jawFur = s.ball([0.14, 0.055, 0.15], [0, -0.03, 0.12], pale, 14);
    const tongue = s.ball([0.08, 0.02, 0.09], [0, 0.005, 0.11], s.material('#c9485a'), 10);
    add(jaw, jawFur, tongue);
    head.add(jaw);
    add(head, s.ball([0.11, 0.06, 0.1], [0, 0.1, 0.17], dark, 10));
    if (stripped) {
      // A patch of fur cut away from the cheek showing the frame.
      add(head, s.ball([0.1, 0.11, 0.03], [-0.17, 0.2, 0.19], metal, 10));
      for (let i = 0; i < 3; i++) add(head, s.cylinder(0.01, 0.01, 0.02, [-0.2 + i * 0.03, 0.17 + i * 0.04, 0.215], dark, 6));
    }

    // Hats.
    const hat = new THREE.Group();
    hat.position.set(0, 0.47, 0);
    head.add(hat);
    const felt = s.material('#1d1d21', { roughness: 0.55 });
    if (a.outfit === 'bandleader' || a.outfit === 'waistcoat') {
      add(hat, s.cylinder(0.24, 0.25, 0.02, [0, 0.02, 0], felt, 28));
      const crown = s.ball([0.17, 0.16, 0.17], [0, 0.05, 0], felt, 20);
      add(hat, crown, s.cylinder(0.172, 0.172, 0.035, [0, 0.05, 0], red, 24));
    } else if (a.outfit === 'tophat') {
      add(hat, s.cylinder(0.25, 0.25, 0.02, [0, 0.02, 0], felt, 28), s.cylinder(0.17, 0.155, 0.34, [0, 0.19, 0], felt, 24), s.cylinder(0.162, 0.16, 0.05, [0, 0.06, 0], gold, 24));
    } else if (a.outfit === 'boater') {
      const straw = s.material('#e3c877', { roughness: 0.8 });
      add(hat, s.cylinder(0.27, 0.27, 0.018, [0, 0.02, 0], straw, 28), s.cylinder(0.17, 0.17, 0.1, [0, 0.07, 0], straw, 24), s.cylinder(0.173, 0.173, 0.04, [0, 0.05, 0], red, 24));
    } else {
      const cone = s.mesh(new THREE.ConeGeometry(0.12, 0.34, 20), s.material(mood.cheer > 0.5 ? '#3fb6d8' : '#7d93a0'), [0, 0.16, 0]);
      add(hat, cone, s.ball([0.035, 0.035, 0.035], [0, 0.34, 0], s.material('#f2d24a'), 8));
      hat.rotation.z = 0.25; hat.position.x = -0.08;
    }
    if (stripped) { hat.rotation.z += 0.35; hat.position.x += 0.06; }
    else hat.rotation.z += (random() - 0.5) * 0.12 + mood.wear * 0.15;

    // Bow tie or ruff at the neck.
    const neckY = torsoY + 0.36;
    if (a.outfit === 'birthday') {
      const ruff = s.mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 24), s.material('#f1ead6'), [0, neckY, 0]);
      ruff.rotation.x = Math.PI / 2; ruff.scale.z = 0.6;
    } else {
      const tie = a.outfit === 'tophat' ? s.material('#2a4fa8') : red;
      for (const side of [-1, 1]) {
        const wing = s.mesh(new THREE.ConeGeometry(0.085, 0.17, 4), tie, [side * 0.1, neckY - 0.02, 0.27]);
        wing.rotation.z = side * Math.PI / 2; wing.scale.z = 0.45;
      }
      s.ball([0.04, 0.045, 0.035], [0, neckY - 0.02, 0.28], tie, 10);
    }

    // Arms: shoulder -> elbow -> paw.
    const shoulders: P3[] = [[-0.36, torsoY + 0.22, 0], [0.36, torsoY + 0.22, 0]];
    const hang = (side: number): P3 => [side * 0.48, torsoY - 0.32, 0.08];
    let hands: [P3, P3] = [hang(-1), hang(1)];
    const banjo = a.instrument === 'banjo', mic = a.instrument === 'microphone';
    if (a.pose !== 'dropped' && a.pose !== 'staring') {
      if (mic) hands[1] = [0.2, torsoY + 0.28, 0.4];
      if (a.pose === 'singing' && !banjo) hands[0] = [-0.62, torsoY + 0.2, 0.32];
    }
    if (banjo) { hands = [[-0.4, torsoY + 0.13, 0.36], [0.16, torsoY - 0.13, 0.4]]; }
    if (a.pose === 'wave') hands[0] = [-0.72, torsoY + 0.78, 0.12];
    if (a.pose === 'dropped' && !banjo) hands = [hang(-1), hang(1)];
    const armGroups: THREE.Group[] = [];
    shoulders.forEach((shoulder, index) => {
      const side = index ? 1 : -1;
      const hand = hands[index];
      const g = new THREE.Group();
      s.root.add(g);
      armGroups.push(g);
      const mid = new THREE.Vector3(...shoulder).lerp(new THREE.Vector3(...hand), 0.5);
      const raised = hand[1] > shoulder[1] + 0.2;
      mid.x += side * (raised ? 0.16 : 0.1); mid.y -= raised ? 0.12 : 0.06; mid.z -= 0.04;
      const elbow = mid.toArray() as P3;
      const bare = stripped && side === -1;
      if (bare) {
        add(g, s.rod(shoulder, elbow, 0.022, metal), s.rod(elbow, hand, 0.018, metal), s.ball([0.05, 0.05, 0.05], shoulder, metal, 10), s.ball([0.04, 0.04, 0.04], elbow, dark, 10));
        add(g, s.rod([shoulder[0], shoulder[1] - 0.05, shoulder[2] + 0.03], [elbow[0], elbow[1] + 0.04, elbow[2] + 0.03], 0.012, gold));
        for (let f = -1; f <= 1; f++) add(g, s.rod(hand, [hand[0] + f * 0.03, hand[1] - 0.07, hand[2] + 0.03], 0.008, metal));
      } else {
        add(g, s.ball([0.13, 0.13, 0.13], shoulder, fur, 12), s.rod(shoulder, elbow, 0.105, fur, 0.095), s.ball([0.095, 0.095, 0.095], elbow, fur, 12), s.rod(elbow, hand, 0.092, fur, 0.085), s.ball([0.11, 0.1, 0.11], hand, fur, 14));
        add(g, s.ball([0.06, 0.05, 0.03], [hand[0], hand[1], hand[2] + 0.09], pale, 8));
      }
    });

    if (mic) {
      const h = hands[1];
      const down = h[1] < torsoY;
      const tip: P3 = down ? [h[0], h[1] - 0.2, h[2] + 0.03] : [h[0] - 0.08, h[1] + 0.2, h[2] + 0.02];
      const grip: P3 = down ? [h[0], h[1] + 0.05, h[2] + 0.02] : [h[0] + 0.03, h[1] - 0.08, h[2]];
      add(armGroups[1], s.rod(grip, tip, 0.022, s.material('#2b2b30'), 0.026), s.ball([0.05, 0.05, 0.05], tip, metal, 12));
      s.tube([grip, [grip[0] + 0.12, baseH + 0.5, 0.42], [0.35, baseH + 0.06, 0.5], [0.1, baseH + 0.03, 0.6], [-0.2, baseH + 0.03, 0.52]], 0.008, dark);
    }
    if (banjo) {
      const g = new THREE.Group();
      g.position.set(0.12, torsoY - 0.1, 0.42);
      g.rotation.z = 0.5;
      const pot = s.cylinder(0.17, 0.17, 0.07, [0, 0, 0], metal, 24); pot.rotation.x = Math.PI / 2;
      const skin = s.cylinder(0.155, 0.155, 0.072, [0, 0, 0.003], s.material('#f0e8d2'), 24); skin.rotation.x = Math.PI / 2;
      const neck = s.box([0.62, 0.045, 0.03], [-0.45, 0, 0.01], s.material('#6b4326'));
      const peg = s.box([0.1, 0.07, 0.03], [-0.8, 0, 0.01], s.material('#3d2616'));
      add(g, pot, skin, neck, peg);
      for (let i = 0; i < 4; i++) add(g, s.box([0.86, 0.003, 0.003], [-0.36, -0.015 + i * 0.01, 0.042], white));
      s.root.add(g);
    }

    if (stripped) {
      // Open chest panel with a control box and loose wires.
      s.box([0.2, 0.22, 0.04], [0.02, torsoY + 0.02, 0.33], dark);
      s.box([0.12, 0.09, 0.05], [0.02, torsoY + 0.04, 0.345], metal);
      for (let i = 0; i < 4; i++) {
        const x = -0.05 + i * 0.045;
        s.tube([[x, torsoY - 0.02, 0.36], [x + (random() - 0.5) * 0.1, torsoY - 0.2, 0.42], [x + (random() - 0.5) * 0.2, torsoY - 0.36 - random() * 0.1, 0.36]], 0.007, s.material(['#c33', '#e0b020', '#2a6', '#2a4fa8'][i]));
      }
      const panel = s.box([0.2, 0.22, 0.012], [0.22, torsoY - 0.02, 0.36], pale); panel.rotation.y = 1.1; panel.rotation.z = -0.2;
    }

    // Pose the head and jaw.
    const rest = {
      singing: { x: -0.1, z: 0.05, jaw: 0.75 },
      dropped: { x: 0.72, z: 0.12, jaw: 0.22 },
      wave: { x: -0.05, z: -0.22, jaw: 0.3 },
      staring: { x: 0, z: 0, jaw: 0.04 },
    }[a.pose];
    const tilt = (random() - 0.5) * 0.1;
    head.rotation.set(rest.x, (random() - 0.5) * 0.2, rest.z + tilt);
    jaw.rotation.x = rest.jaw;

    const energy = mood.energy;
    const moving = live ? 1 : a.story === 'twitching' ? 0.35 : 0;
    const phase = random() * 10;
    return s.finish({
      update: (_dt, time) => {
        if (!moving) return;
        const t = time * mix(1.2, 5.5, energy) + phase;
        if (live) {
          head.rotation.z = rest.z + tilt + Math.sin(t * 0.5) * 0.12 * energy;
          head.rotation.x = rest.x + Math.sin(t * 0.37) * 0.06 * energy;
          if (a.pose !== 'dropped') jaw.rotation.x = Math.max(0.02, rest.jaw * (0.55 + 0.45 * Math.sin(t * 2.1)) + 0.1 * energy);
        } else {
          // A rare spasm: mostly still, then a jerk.
          const spasm = Math.max(0, Math.sin(t * 0.6) - 0.93) * 14;
          head.rotation.z = rest.z + tilt + spasm * 0.1;
          jaw.rotation.x = rest.jaw + spasm * 0.15;
        }
      },
    });
  },
});
