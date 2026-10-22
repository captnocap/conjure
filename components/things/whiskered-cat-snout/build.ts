import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { arc, ball, cone, cyl, paint } from './parts';

type Coat = 'tabby' | 'tuxedo' | 'calico' | 'hairless' | 'tom';

/** Fur painted onto a sphere map. The face looks down +z, which is u = 0.25 on a three.js sphere. */
function furTexture(coat: Coat, random: () => number, wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const g = canvas.getContext('2d')!;
  const base = { tabby: '#9a8468', tuxedo: '#1d1b1c', calico: '#e0893a', hairless: '#d8a79b', tom: '#d9853b' }[coat];
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 256);
  const stroke = (colour: string, width: number, points: [number, number][]) => {
    g.strokeStyle = colour; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  };
  if (coat === 'calico') {
    // Split face: black on one side of the nose line, orange on the other, patches behind.
    g.fillStyle = '#1e1b1b';
    g.fillRect(128, 0, 140, 256);
    g.fillRect(0, 0, 12, 256);
    g.fillStyle = '#f2ece1';
    for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(290 + random() * 200, 40 + random() * 180, 30 + random() * 40, 20 + random() * 30, random() * 3, 0, 7); g.fill(); }
    g.fillStyle = '#f2ece1';
    g.beginPath(); g.ellipse(128, 215, 60, 60, 0, 0, 7); g.fill();
  }
  if (coat === 'tabby' || coat === 'tom') {
    const dark = coat === 'tabby' ? '#3d3026' : '#a8551c';
    // Stripes running back over the skull, and the M on the forehead.
    for (let i = -4; i <= 4; i++) if (i) stroke(dark, 6, [[128 + i * 13, 58], [128 + i * 16 + (random() - 0.5) * 6, 28], [128 + i * 22, 0]]);
    stroke(dark, 6, [[104, 92], [108, 62], [120, 82], [128, 60], [136, 82], [148, 62], [152, 92]]);
    for (const side of [-1, 1]) {
      for (let k = 0; k < 3; k++) stroke(dark, 6, [[128 + side * 52, 118 + k * 14], [128 + side * 78, 122 + k * 18], [128 + side * 108, 116 + k * 22]]);
      stroke(dark, 4, [[128 + side * 38, 108], [128 + side * 64, 100], [128 + side * 100, 92]]);
    }
    for (let i = 0; i < 14; i++) stroke(dark, 7, [[270 + i * 17, 20 + random() * 20], [274 + i * 17 + (random() - 0.5) * 12, 150 + random() * 60]]);
  }
  if (coat === 'tuxedo') {
    g.fillStyle = '#f2ece1';
    g.beginPath(); g.moveTo(128, 96); g.lineTo(156, 150); g.lineTo(168, 256); g.lineTo(88, 256); g.lineTo(100, 150); g.closePath(); g.fill();
  }
  if (coat === 'hairless') {
    for (let i = 0; i < 6; i++) stroke('#b98377', 3, [[92, 40 + i * 9], [128, 34 + i * 9 + (random() - 0.5) * 4], [164, 40 + i * 9]]);
    for (const side of [-1, 1]) for (let k = 0; k < 4; k++) stroke('#b98377', 3, [[128 + side * 60, 150 + k * 10], [128 + side * 84, 158 + k * 11]]);
    g.fillStyle = 'rgba(120,110,120,0.35)';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(random() * 512, random() * 256, 30 + random() * 30, 20 + random() * 20, 0, 0, 7); g.fill(); }
  }
  if (coat === 'tom' || wear > 0.6) {
    // Old scars.
    for (let i = 0; i < (coat === 'tom' ? 4 : 2); i++) {
      const x = 80 + random() * 96, y = 60 + random() * 110, r = random() * 3;
      stroke('#f0c9b4', 3, [[x, y], [x + Math.cos(r) * 22, y + Math.sin(r) * 22]]);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    coat: choice('What cat is it?', {
      tabby: 'A brown mackerel tabby with the M on its forehead and striped cheeks.',
      tuxedo: 'A black-and-white tuxedo: black mask, white muzzle and bib.',
      calico: 'A calico with a face split straight down the nose, black one side and orange the other.',
      hairless: 'A hairless sphynx: bare pink wrinkles, huge ears, almost no whiskers.',
      tom: 'A battered ginger street tom with heavy jowls, scars and one ear torn away.',
    }),
    pupils: score('How wide are the pupils?', ['Noon slits, thin as a knife cut', 'Narrow almonds', 'Round and curious', 'Full black saucers, all hunt or all fear']),
    ears: choice('What are the ears doing?', {
      forward: 'Pricked forward, interested.',
      airplane: 'Swivelled out sideways like aeroplane wings, uneasy.',
      back: 'Pinned flat back against the skull, furious or terrified.',
    }),
    mouth: choice('What is the mouth doing?', {
      shut: 'Shut in a neat inverted Y.',
      meow: 'A small silent meow, mouth open with no sound.',
      hiss: 'A full hiss: jaws wide, fangs and curled tongue showing, nose wrinkled.',
      flehmen: 'The flehmen gape: lip lifted, mouth slack, tasting a smell with a stunned look.',
      blep: 'Shut, with the tongue tip left sticking out.',
    }),
    whiskers: choice('What state are the whiskers in?', {
      full: 'A full white fan, wider than the head.',
      broken: 'Snapped and kinked, several missing.',
      kitten: 'Short soft kitten whiskers.',
    }),
    gaze: choice('What has its attention?', {
      you: 'Staring straight at the viewer.',
      above: 'Tracking something overhead: a fly, a dangling string.',
      aside: 'Cut sideways at a noise in the next room.',
      blink: 'Eyes half closed in a slow blink of trust.',
    }),
    neck: choice('What is round its neck?', {
      none: 'Nothing.',
      bell: 'A thin collar with a small brass bell.',
      bowtie: 'A ridiculous little bow tie.',
      cone: 'A shaved patch and a strip of bandage: just back from the vet.',
    }),
    eyeColour: choice('What colour are the eyes?', {
      green: 'Gooseberry green.',
      amber: 'Copper amber.',
      blue: 'Pale ice blue.',
      odd: 'Odd eyes: one blue, one amber.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const coat = a.coat as Coat;
    const hairless = coat === 'hairless', tom = coat === 'tom';
    const fur = new THREE.MeshStandardMaterial({ map: furTexture(coat, random, mood.wear), roughness: hairless ? 0.55 : 0.92 });
    const baseHex = { tabby: '#9a8468', tuxedo: '#1d1b1c', calico: '#e0893a', hairless: '#d8a79b', tom: '#d9853b' }[coat];
    const plain = paint(baseHex, { roughness: hairless ? 0.55 : 0.92 });
    const padHex = { tabby: '#e9dfcf', tuxedo: '#f2ece1', calico: '#f2ece1', hairless: '#e3b5a9', tom: '#f0d9bd' }[coat];
    const pad = paint(padHex, { roughness: 0.9 });
    const earIn = paint(hairless ? '#e7a29a' : '#e3a6a0', { roughness: 0.7 });
    const noseMat = paint(coat === 'tuxedo' ? '#2a2224' : '#d9737a', { roughness: 0.35 });
    const black = paint('#070707', { roughness: 0.15 });
    const mouthMat = paint('#7a1f2c', { roughness: 0.5 });
    const pink = paint('#ef8f9c', { roughness: 0.45 });
    const tooth = paint('#fbf7ea', { roughness: 0.3 });
    const glint = paint('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.7 });
    const whisker = paint('#fbfaf5', { roughness: 0.5 });
    const line = paint(coat === 'tuxedo' ? '#f2ece1' : '#3a2a26');

    const head = new THREE.Group();
    s.root.add(head);

    // Neck and shoulders: just enough to stand on.
    ball(s.root, fur, [0, 0.03, -0.02], [0.075, 0.06, 0.07]);
    ball(s.root, coat === 'tabby' || tom || hairless ? plain : pad, [0, 0.035, 0.03], [0.05, 0.05, 0.035]);

    // Skull and cheeks.
    ball(head, fur, [0, 0, 0], [0.078, 0.068, 0.066], [0, 0, 0], 32);
    const jowl = tom ? 1.35 : hairless ? 0.8 : 1;
    for (const x of [-1, 1]) {
      const side = coat === 'calico' ? paint(x < 0 ? '#e0893a' : '#1e1b1b', { roughness: 0.92 }) : plain;
      ball(head, side, [x * 0.052, -0.022, 0.018], [0.036 * jowl, 0.032 * jowl, 0.04]);
    }
    // Whisker pads, chin, nose bridge and nose leather.
    const hiss = a.mouth === 'hiss';
    const gape = hiss ? 0.03 : a.mouth === 'meow' ? 0.014 : a.mouth === 'flehmen' ? 0.018 : 0;
    const padPos: [number, number, number][] = [];
    for (const x of [-1, 1]) {
      const p: [number, number, number] = [x * 0.0175, -0.024 + (hiss ? 0.004 : 0), 0.06];
      padPos.push(p);
      ball(head, pad, p, [0.021, 0.0165, 0.017]);
    }
    ball(head, pad, [0, -0.045 - gape, 0.05], [0.018, 0.012, 0.016]);
    ball(head, coat === 'tuxedo' ? pad : plain, [0, 0.0, 0.058], [0.014, 0.024, 0.014]);
    cone(head, noseMat, 0.0085, 0.009, [0, -0.011, 0.0745], [Math.PI, 0, 0], [1.25, 1, 0.6], 3).rotation.y = Math.PI;
    if (hiss || a.mouth === 'flehmen') for (let i = 0; i < 3; i++) arc(head, line, 0.012 + i * 0.002, 0.0012, Math.PI * 0.6, [0, 0.004 + i * 0.006, 0.07 - i * 0.003], [-0.5, 0, Math.PI * 0.2]);

    // Mouth.
    if (gape) {
      ball(head, mouthMat, [0, -0.038 - gape * 0.45, 0.056], [0.017 + gape * 0.25, gape * 0.72, 0.014]);
      if (hiss || a.mouth === 'flehmen') {
        for (const x of [-1, 1]) {
          cone(head, tooth, 0.0032, hiss ? 0.014 : 0.009, [x * 0.011, -0.037, 0.066], [Math.PI, 0, 0], [1, 1, 1], 8);
          if (hiss) cone(head, tooth, 0.0026, 0.009, [x * 0.009, -0.062, 0.062], [0, 0, 0], [1, 1, 1], 8);
        }
        if (hiss) for (let i = -1; i <= 1; i++) cone(head, tooth, 0.0015, 0.004, [i * 0.004, -0.036, 0.07], [Math.PI, 0, 0], [1, 1, 1], 6);
      }
      ball(head, pink, [0, -0.04 - gape * 0.95, 0.058], [0.011, 0.004, 0.012], [hiss ? -0.5 : 0, 0, 0]);
    } else {
      // The inverted Y under the nose.
      cyl(head, line, 0.001, 0.001, 0.012, [0, -0.022, 0.0765], [0.2, 0, 0], 6);
      for (const x of [-1, 1]) arc(head, line, 0.011, 0.0011, Math.PI * 0.55, [x * 0.011, -0.027, 0.0715], [0.3, x * 0.4, x > 0 ? Math.PI * 1.05 : Math.PI * 1.4]);
      if (a.mouth === 'blep') ball(head, pink, [0, -0.04, 0.074], [0.0065, 0.006, 0.004], [0.3, 0, 0]);
    }

    // Eyes: the iris is the whole visible globe, the pupil a black lens that widens.
    const eyeR = 0.0195;
    const hues = { green: ['#a9c44a', '#a9c44a'], amber: ['#d9902a', '#d9902a'], blue: ['#8cc4e2', '#8cc4e2'], odd: ['#8cc4e2', '#d9902a'] }[a.eyeColour];
    const g = a.gaze === 'above' ? [0, 0.55] : a.gaze === 'aside' ? [(random() < 0.5 ? -1 : 1) * 0.6, 0.05] : [0, 0];
    const blink = a.gaze === 'blink';
    [-1, 1].forEach((x, i) => {
      const c: [number, number, number] = [x * 0.033, 0.012, 0.047];
      const iris = paint(hues[i], { roughness: 0.12, emissive: hues[i], emissiveIntensity: 0.18 });
      ball(head, iris, c, [eyeR, eyeR * 0.95, eyeR]);
      const dir = new THREE.Vector3(g[0] + x * 0.28, g[1], 1).normalize();
      const pw = mix(0.1, 0.8, a.pupils), ph = mix(0.82, 0.84, a.pupils);
      const pupil = ball(head, black, [c[0] + dir.x * eyeR * 0.94, c[1] + dir.y * eyeR * 0.94, c[2] + dir.z * eyeR * 0.94], [eyeR * pw, eyeR * ph, eyeR * 0.12]);
      pupil.lookAt(new THREE.Vector3(c[0] + dir.x, c[1] + dir.y, c[2] + dir.z));
      ball(head, glint, [c[0] + dir.x * eyeR - 0.005, c[1] + dir.y * eyeR + 0.007, c[2] + dir.z * eyeR + 0.001], [0.0032, 0.0032, 0.0032], [0, 0, 0], 8);
      // Dark eyeliner rim and the lids.
      const lidMat = coat === 'calico' ? paint(x < 0 ? '#e0893a' : '#1e1b1b', { roughness: 0.92 }) : plain;
      arc(head, black, eyeR * 0.98, 0.0022, Math.PI * 2, [c[0] + x * 0.002, c[1], c[2] + 0.0075], [0, x * 0.3, 0]).scale.y = 0.9;
      const lidDrop = blink ? 0.011 : hiss ? 0.004 : a.pupils > 0.8 ? -0.002 : 0.001;
      ball(head, lidMat, [c[0], c[1] + eyeR * 0.95 - lidDrop, c[2] + 0.002], [eyeR * 1.12, eyeR * 0.62, eyeR * 1.02], [0.2, 0, x * (hiss ? -0.35 : -0.12)]);
      if (blink) ball(head, lidMat, [c[0], c[1] - eyeR * 0.9, c[2] + 0.002], [eyeR * 1.1, eyeR * 0.5, eyeR * 1.0]);
    });

    // Ears.
    const earH = hairless ? 0.085 : 0.058, earW = hairless ? 0.04 : 0.03;
    const missing = tom ? (random() < 0.5 ? -1 : 1) : 0;
    for (const x of [-1, 1]) {
      const ear = new THREE.Group();
      const torn = x === missing;
      const h = torn ? earH * 0.35 : earH;
      const outer = coat === 'calico' ? paint(x < 0 ? '#e0893a' : '#1e1b1b', { roughness: 0.92 }) : plain;
      cone(ear, outer, earW, h, [0, h / 2, 0], [0, 0, 0], [1, 1, 0.35], torn ? 5 : 12);
      if (!torn) cone(ear, earIn, earW * 0.68, h * 0.78, [0, h * 0.42, earW * 0.2], [0, 0, 0], [1, 1, 0.2], 12);
      ear.position.set(x * 0.046, 0.046, -0.004);
      if (a.ears === 'forward') ear.rotation.set(0.1, x * -0.25, x * -0.3);
      else if (a.ears === 'airplane') { ear.rotation.set(0.15, x * -0.2, x * -1.15); ear.position.set(x * 0.058, 0.036, -0.004); }
      else { ear.rotation.set(-1.15, x * -0.5, x * -0.55); ear.position.set(x * 0.05, 0.044, -0.012); }
      head.add(ear);
    }

    // Whiskers and brow hairs.
    const lengths = { full: 0.105, broken: 0.085, kitten: 0.04 }[a.whiskers] * (hairless ? 0.35 : 1);
    padPos.forEach((p, i) => {
      const x = i ? 1 : -1;
      const count = hairless ? 2 : 6;
      for (let k = 0; k < count; k++) {
        if (a.whiskers === 'broken' && random() < 0.3) continue;
        const row = k % 2, t = (k / (count - 1 || 1) - 0.5);
        const len = lengths * mix(0.7, 1, random()) * (a.whiskers === 'broken' && random() < 0.5 ? 0.35 : 1);
        const up = t * 0.9 + (a.ears === 'back' ? -0.15 : 0.1) + (random() - 0.5) * 0.12;
        const fwd = hiss ? -0.35 : a.pupils > 0.7 ? 0.45 : 0.12;
        const start = new THREE.Vector3(p[0] + x * 0.012, p[1] + t * 0.012 + row * 0.002, p[2] + 0.008);
        const dir = new THREE.Vector3(x, up, fwd).normalize();
        const mid = start.clone().addScaledVector(dir, len * 0.5);
        mid.y -= len * 0.06;
        const rod = cyl(head, whisker, 0.0002, 0.0009, len, [mid.x, mid.y, mid.z], [0, 0, 0], 5);
        rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        rod.castShadow = false;
        if (a.whiskers === 'broken' && random() < 0.4) rod.rotateZ((random() - 0.5) * 0.9);
      }
      if (!hairless) for (let k = 0; k < 3; k++) {
        const dir = new THREE.Vector3(x * (0.35 + k * 0.2), 1, 0.25).normalize();
        const len = lengths * 0.42;
        const start = new THREE.Vector3(x * (0.028 + k * 0.004), 0.036, 0.05);
        const mid = start.addScaledVector(dir, len / 2);
        const rod = cyl(head, whisker, 0.0002, 0.0007, len, [mid.x, mid.y, mid.z], [0, 0, 0], 5);
        rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        rod.castShadow = false;
      }
    });

    // Neckwear.
    const accent = s.material(new THREE.Color().setHSL(mix(0.58, 0.0, mood.warmth), 0.7, mix(0.35, 0.52, mood.cheer)));
    if (a.neck === 'bell' || a.neck === 'bowtie') arc(s.root, accent, 0.056, 0.006, Math.PI * 2, [0, 0.068, 0.0], [Math.PI / 2 - 0.25, 0, 0]);
    let bell: THREE.Object3D | null = null;
    if (a.neck === 'bell') {
      bell = ball(s.root, paint('#d8a93a', { metalness: 0.8, roughness: 0.3 }), [0, 0.046, 0.058], [0.011, 0.011, 0.011]);
    } else if (a.neck === 'bowtie') {
      for (const x of [-1, 1]) cone(s.root, accent, 0.016, 0.03, [x * 0.016, 0.052, 0.058], [0, 0, x * Math.PI / 2], [1, 1, 0.45], 4);
      ball(s.root, accent, [0, 0.052, 0.06], [0.006, 0.008, 0.006]);
    } else if (a.neck === 'cone') {
      const gauze = paint('#f3efe4', { roughness: 0.95 });
      arc(s.root, gauze, 0.06, 0.012, Math.PI * 2, [0, 0.062, 0.0], [Math.PI / 2 - 0.25, 0, 0]);
      ball(head, paint('#e9b9ae', { roughness: 0.6 }), [0.04, 0.05, 0.025], [0.022, 0.016, 0.012], [0, 0.6, 0.5]);
      for (let k = 0; k < 4; k++) cyl(head, paint('#3a2a2a'), 0.0008, 0.0008, 0.012, [0.036 + k * 0.004, 0.058 - k * 0.0035, 0.036 - k * 0.003], [0.3, 0, 0.9], 5);
    }

    head.position.set(0, 0.13, 0.012);
    const baseTilt = a.gaze === 'above' ? -0.3 : hiss ? 0.12 : a.mouth === 'flehmen' ? -0.2 : 0;
    const roll = (random() - 0.5) * 0.24;
    head.rotation.set(baseTilt, a.gaze === 'aside' ? g[0] * 0.25 : 0, roll);

    const twitch = mix(0.4, 3, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        head.rotation.z = roll + Math.sin(time * twitch) * 0.02 * (0.5 + mood.energy);
        if (bell) bell.rotation.z = Math.sin(time * twitch * 2) * 0.3;
      },
    });
  },
});
