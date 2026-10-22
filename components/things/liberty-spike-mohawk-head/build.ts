import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const PROFILE: readonly (readonly [number, number])[] = [
  [0.07, 0], [0.068, 0.012], [0.042, 0.035], [0.038, 0.085], [0.05, 0.105], [0.066, 0.135], [0.078, 0.17],
  [0.086, 0.21], [0.088, 0.25], [0.083, 0.29], [0.068, 0.325], [0.042, 0.345], [0.0001, 0.352],
];
const DEEP = 1.15;
function radiusAt(y: number) {
  for (let i = 1; i < PROFILE.length; i++) {
    const [r0, y0] = PROFILE[i - 1], [r1, y1] = PROFILE[i];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return 0;
}
/** A point on the head at height y and angle theta round from the nose, pushed out by `out`. */
function on(y: number, theta: number, out = 0): [number, number, number] {
  const r = radiusAt(y) + out;
  return [Math.sin(theta) * r, y, Math.cos(theta) * r * DEEP];
}

const HAIR = {
  green: ['#42e11e'], pink: ['#ff2b9c'], blue: ['#1f58ff'], red: ['#e01b24'], bleach: ['#f3e58c'], black: ['#141218'],
  rainbow: ['#e01b24', '#ff8a1f', '#f5e02a', '#42e11e', '#1f58ff', '#8a2be2', '#ff2b9c'],
  tipped: ['#2a1c14'],
} as const;

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    kind: choice('Whose head is it?', {
      human: 'A glossy shop mannequin, smooth and blank-faced.',
      zombie: 'A rotting zombie head: grey-green skin, a missing eye, teeth showing through the cheek.',
      ape: 'An ape head: dark fur, heavy brow, jutting muzzle and big round ears.',
      skull: 'A bare bone skull that still somehow has a mohawk.',
    }),
    hair: choice('What is the hair?', {
      liberty: 'Liberty spikes: a single row of tall stiff cones from forehead to nape.',
      fan: 'A fan mohawk: one solid upright crest like a circular saw blade.',
      bihawk: 'A bihawk: two parallel rows of shorter spikes.',
      devilock: 'A devilock: shaved round the sides with one long forelock hanging down over the face.',
      rattail: 'Shaved to stubble with a long thin rat-tail braid at the nape.',
      chelsea: 'A chelsea: cropped skull with a feathered fringe and long wisps in front of the ears.',
    }),
    colour: choice('What colour is the hair?', {
      green: 'Manic green.', pink: 'Hot pink.', blue: 'Electric blue.', red: 'Fire-engine red.',
      bleach: 'Bleached straw yellow.', black: 'Jet black.',
      rainbow: 'Every spike a different colour.', tipped: 'Dark natural roots with bright dyed tips.',
    }),
    extras: choice('What has been added to the face?', {
      none: 'Nothing, a bare face.',
      eyeliner: 'Heavy drawn-on black eyeliner with wings.',
      pin: 'A big safety pin pushed through the cheek.',
      bandage: 'A strip of white tape across a broken nose.',
      plaster: 'A sticking plaster over one eyebrow.',
      works: 'All of it: eyeliner, safety pin, taped nose and a plaster.',
    }),
    piercings: choice('What piercings does it wear?', {
      none: 'None.',
      septum: 'A heavy septum ring.',
      ears: 'A ladder of hoops up both ears.',
      chain: 'A chain swinging from nostril to ear.',
      spikes: 'Metal spikes through the brow, the bridge of the nose and under the lip.',
    }),
    mouth: choice('What is the mouth doing?', {
      closed: 'Closed, with painted lips.',
      snarl: 'A snarl with both rows of teeth bared.',
      tongue: 'Tongue stuck right out.',
      gold: 'A grin with one gold tooth.',
      cigarette: 'A lit cigarette stuck in the corner.',
    }),
    mount: choice('What is it standing on?', {
      bare: 'Just its own neck stump, on whatever surface is there.',
      block: 'A turned wooden wig-block stand.',
      crate: 'An upturned beer crate.',
      pole: 'Jammed on top of a microphone stand like a totem.',
    }),
    story: choice('What is it used for?', {
      practice: 'A hairspray practice dummy: a comb stuck in the hair and clips in it.',
      mascot: 'The venue mascot, in a studded dog collar.',
      trophy: 'A trophy everyone has signed and kissed: lipstick prints and marker all over it.',
      warning: 'A warning: a cardboard sign hung round its neck.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const h = new Sculpture(context);
    const { mood, random } = context;
    const palette = HAIR[a.colour];
    const tipHex = ['#42e11e', '#ff2b9c', '#1f58ff', '#e01b24'][Math.floor(random() * 4)];
    const glow = mix(0.05, 0.4, mood.cheer);
    const hairMaterials = palette.map((hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55, emissive: hex, emissiveIntensity: a.colour === 'black' || a.colour === 'tipped' ? 0 : glow }));
    const tipMaterial = new THREE.MeshStandardMaterial({ color: tipHex, roughness: 0.5, emissive: tipHex, emissiveIntensity: glow });
    const hairOf = (index: number) => hairMaterials[index % hairMaterials.length];
    const stubbleHex = a.colour === 'tipped' || a.colour === 'rainbow' ? '#2a1c14' : palette[0];

    const skinHex = { human: ['#e3c1a4', '#d9d6cf', '#8a5a3c', '#e9d2bd'][Math.floor(random() * 4)], zombie: '#84966a', ape: '#2b211c', skull: '#e2d9bf' }[a.kind];
    const skinTint = new THREE.Color(skinHex).lerp(new THREE.Color('#77705f'), mood.wear * 0.25);
    const faceHex = a.kind === 'ape' ? '#a98566' : `#${skinTint.getHexString()}`;
    const metal = new THREE.MeshStandardMaterial({ color: '#d5d8da', metalness: 0.95, roughness: 0.22 });
    const gold = new THREE.MeshStandardMaterial({ color: '#e9c452', metalness: 0.95, roughness: 0.2, emissive: '#5a430a', emissiveIntensity: 0.5 });
    const black = new THREE.MeshStandardMaterial({ color: '#0d0c10', roughness: 0.6 });
    const toothMaterial = new THREE.MeshStandardMaterial({ color: a.kind === 'zombie' ? '#d6cf9a' : '#f4f1e4', roughness: 0.35 });
    const shaved = a.hair !== 'chelsea' || true;

    // --- Skin texture: stubble on the scalp, rot, fur, chips, kisses.
    const skinTexture = paint(1024, 512, (g, w, hgt) => {
      g.fillStyle = `#${skinTint.getHexString()}`; g.fillRect(0, 0, w, hgt);
      const blot = (x: number, y: number, rx: number, ry: number, colour: string, alpha: number) => {
        g.globalAlpha = alpha; g.fillStyle = colour;
        for (const dx of [0, -w, w]) { g.beginPath(); g.ellipse(x + dx, y, rx, ry, 0, 0, 7); g.fill(); }
        g.globalAlpha = 1;
      };
      if (a.kind === 'zombie') {
        for (let k = 0; k < 60; k++) blot(random() * w, random() * hgt, 10 + random() * 50, 8 + random() * 34, ['#5d6b4c', '#6f5a76', '#9aa57a', '#4c5a44'][k % 4], 0.4);
        for (let k = 0; k < 9; k++) { const x = random() * w, y = hgt * (0.25 + random() * 0.6); blot(x, y, 16 + random() * 26, 12 + random() * 20, '#5a1414', 0.95); blot(x, y, 8 + random() * 10, 6 + random() * 8, '#b3262a', 0.9); }
      } else if (a.kind === 'ape') {
        g.strokeStyle = 'rgba(90,66,48,0.55)'; g.lineWidth = 2;
        for (let k = 0; k < 1400; k++) { const x = random() * w, y = random() * hgt; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 8, y + 10 + random() * 14); g.stroke(); }
      } else if (a.kind === 'skull') {
        g.strokeStyle = 'rgba(70,60,40,0.7)'; g.lineWidth = 2;
        for (const u of [0.25, 0.5, 0.75]) { let x = u * w, y = 0; g.beginPath(); g.moveTo(x, y); for (let n = 0; n < 30; n++) { x += (random() - 0.5) * 16; y += 8; g.lineTo(x, y); } g.stroke(); }
        for (let k = 0; k < 30; k++) blot(random() * w, random() * hgt, 20 + random() * 40, 14 + random() * 30, '#b9a97f', 0.25);
      }
      // Shaved stubble above the hairline (canvas top is the crown).
      if (a.kind !== 'skull' && a.kind !== 'ape') {
        g.fillStyle = stubbleHex;
        for (let k = 0; k < 9000; k++) {
          const u = random(), v = random();
          const front = Math.cos(u * Math.PI * 2) * 0.5 + 0.5;
          const line = mix(0.56, 0.3, front);
          if (v > line) continue;
          g.globalAlpha = 0.35 + random() * 0.4;
          g.fillRect(u * w, v * hgt, 2, 3);
        }
        g.globalAlpha = 1;
      }
      // Chips and scuffs with wear.
      if (a.kind === 'human')
        for (let k = 0; k < mood.wear * 26; k++) blot(random() * w, random() * hgt, 4 + random() * 16, 4 + random() * 12, random() < 0.5 ? '#f3f0e6' : '#6a6257', 0.9);
      if (a.story === 'trophy') {
        for (let k = 0; k < 9; k++) {
          const x = random() * w, y = hgt * (0.3 + random() * 0.55);
          g.save(); g.translate(x, y); g.rotate(random() * 3);
          g.fillStyle = ['#d1123f', '#8e1560', '#111'][k % 3];
          g.beginPath(); g.ellipse(0, -5, 20, 7, 0, Math.PI, 0); g.fill();
          g.beginPath(); g.ellipse(0, 5, 18, 8, 0, 0, Math.PI); g.fill();
          g.restore();
        }
        g.fillStyle = a.kind === 'ape' ? '#f1f1f1' : '#141414'; g.font = 'bold 30px cursive';
        for (const word of ['SID', 'kev woz ere', 'OI!', 'xx Tash', 'UP THE PUNX', '1 2 3 4', 'Dee + Jo']) {
          g.save(); g.translate(random() * w * 0.8 + 60, hgt * (0.3 + random() * 0.6)); g.rotate((random() - 0.5) * 0.8);
          g.fillText(word, 0, 0); g.restore();
        }
      }
    });
    const skin = new THREE.MeshStandardMaterial({ map: skinTexture, roughness: a.kind === 'human' ? 0.3 + mood.wear * 0.4 : 0.85 });
    const flat = (hex: string, rough = 0.6) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough });
    const skinFlat = flat(`#${skinTint.getHexString()}`, a.kind === 'human' ? 0.35 : 0.85);
    const faceSkin = a.kind === 'ape' ? flat(faceHex, 0.8) : skinFlat;

    const head = h.lathe(PROFILE, skin);
    head.scale.z = DEEP;

    // --- Face structure by kind.
    const part = (size: [number, number, number], at: [number, number, number], material: THREE.Material, turn = 0, segments = 16) => {
      const mesh = h.ball(size, at, material, segments);
      mesh.rotation.y = turn;
      return mesh;
    };
    let mouthAt: [number, number, number] = [0, 0.147, 0.086];
    let noseAt: [number, number, number] = [0, 0.19, 0.105];
    const eyeY = a.kind === 'ape' ? 0.218 : 0.224, eyeT = a.kind === 'ape' ? 0.3 : 0.37;
    if (a.kind === 'human' || a.kind === 'zombie') {
      part([0.05, 0.04, 0.05], [0, 0.128, 0.04], skinFlat); // chin
      part([0.013, 0.03, 0.022], [0, 0.195, 0.097], skinFlat); // nose
      part([0.018, 0.012, 0.014], [0, 0.178, 0.105], skinFlat);
      for (const side of [-1, 1]) part([0.02, 0.006, 0.01], on(0.243, side * 0.36, 0.002), skinFlat, side * 0.36);
    } else if (a.kind === 'ape') {
      part([0.07, 0.075, 0.03], [0, 0.2, 0.078], faceSkin); // bare face mask
      part([0.062, 0.05, 0.055], [0, 0.148, 0.08], faceSkin); // muzzle
      const brow = h.mesh(new THREE.CapsuleGeometry(0.017, 0.085, 6, 12), flat('#2b211c', 0.85), [0, 0.243, 0.092]);
      brow.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        part([0.007, 0.006, 0.006], [side * 0.014, 0.176, 0.132], black);
        const ear = part([0.012, 0.04, 0.036], [side * 0.098, 0.215, 0.0], faceSkin);
        ear.rotation.y = side * 0.5;
        part([0.006, 0.026, 0.022], [side * 0.103, 0.215, 0.008], flat('#6a4a38'), side * 0.5);
      }
      mouthAt = [0, 0.14, 0.132]; noseAt = [0, 0.178, 0.13];
    } else {
      // Skull: sockets, nose hole, cheekbones, jaw.
      for (const side of [-1, 1]) {
        part([0.026, 0.026, 0.012], on(0.222, side * 0.37, -0.002), black, side * 0.37);
        part([0.03, 0.012, 0.02], on(0.185, side * 0.75, 0.002), skinFlat, side * 0.75);
        part([0.02, 0.03, 0.012], on(0.15, side * 0.8, -0.004), black, side * 0.8);
      }
      const hole = h.mesh(new THREE.ConeGeometry(0.014, 0.03, 3), black, [0, 0.188, 0.096]);
      hole.scale.z = 0.3;
      part([0.046, 0.03, 0.045], [0, 0.118, 0.04], skinFlat);
      mouthAt = [0, 0.145, 0.088]; noseAt = [0, 0.185, 0.098];
    }

    // Ears (not the ape's, not the skull's).
    const earTop: [number, number, number][] = [];
    if (a.kind === 'human' || a.kind === 'zombie')
      for (const side of [-1, 1]) {
        if (a.kind === 'zombie' && side === 1 && random() < 0.6) { part([0.006, 0.014, 0.012], [side * 0.088, 0.205, 0], flat('#5a1414')); continue; }
        part([0.008, 0.03, 0.018], [side * 0.091, 0.21, -0.002], skinFlat).rotation.y = side * 0.35;
        earTop.push([side * 0.098, 0.21, 0.002]);
      }
    else if (a.kind === 'ape') for (const side of [-1, 1]) earTop.push([side * 0.112, 0.215, 0.012]);

    // Eyes.
    const liner = a.extras === 'eyeliner' || a.extras === 'works';
    for (const side of [-1, 1]) {
      const t = side * eyeT;
      if (a.kind === 'skull') {
        if (random() < 0.5) part([0.006, 0.006, 0.004], on(eyeY, t, 0.004), new THREE.MeshStandardMaterial({ color: '#ff3b2a', emissive: '#ff3b2a', emissiveIntensity: 1.2 }), t);
        continue;
      }
      if (a.kind === 'zombie' && side === -1) {
        part([0.022, 0.02, 0.008], on(eyeY, t, 0.001), black, t);
        if (random() < 0.6) { // the eye hangs out on its nerve
          const from = on(eyeY - 0.005, t, 0.004), to: [number, number, number] = [from[0] - 0.006, eyeY - 0.06, from[2] + 0.012];
          h.rod(from, to, 0.003, flat('#8a2a2a'));
          part([0.013, 0.013, 0.013], [to[0], to[1] - 0.01, to[2]], flat('#e9e4c4', 0.3));
          part([0.006, 0.006, 0.004], [to[0], to[1] - 0.012, to[2] + 0.011], black);
        }
        continue;
      }
      if (liner) {
        part([0.027, 0.017, 0.004], on(eyeY, t, 0.001), black, t);
        h.rod(on(eyeY, t + side * 0.2, 0.004), on(eyeY + 0.016, t + side * 0.48, 0.004), 0.004, black, 0.0015);
      }
      const white = a.kind === 'zombie' ? '#e3e07a' : a.kind === 'ape' ? '#3a2616' : '#f6f4ea';
      part([0.017, 0.0095, 0.004], on(eyeY, t, 0.003), flat(white, 0.25), t);
      part([0.006, 0.007, 0.003], on(eyeY, t + (random() - 0.5) * 0.06, 0.006), a.kind === 'ape' ? flat('#c9862a', 0.3) : black, t);
      if (a.kind === 'ape') part([0.003, 0.0035, 0.002], on(eyeY, t, 0.0075), black, t);
      // Smudged or running make-up when the night has gone badly.
      if (liner && mood.cheer < 0.4)
        for (let k = 0; k < 2; k++) {
          const tt = t + (k - 0.5) * 0.1, len = 0.03 + random() * 0.05 * (1 - mood.cheer);
          h.rod(on(eyeY - 0.008, tt, 0.003), on(eyeY - 0.008 - len, tt, 0.003), 0.0028, black, 0.001);
        }
      if (a.kind === 'human' && !liner) h.rod(on(0.246, t - side * 0.14, 0.006), on(0.25, t + side * 0.16, 0.005), 0.003, flat(stubbleHex));
    }

    // Zombie: teeth showing through one cheek, and a missing nose.
    const teeth = (centre: [number, number, number], width: number, count: number, up: boolean, special = -1) => {
      for (let k = 0; k < count; k++) {
        const f = count === 1 ? 0 : k / (count - 1) - 0.5;
        if (a.kind === 'zombie' && random() < 0.2) continue;
        const tooth = h.box([width / count * 0.86, 0.011 + random() * 0.003, 0.006], [centre[0] + f * width, centre[1] + (up ? 0.006 : -0.006), centre[2] - f * f * width * 0.9], k === special ? gold : toothMaterial);
        tooth.rotation.y = -f * 1.1;
      }
    };
    if (a.kind === 'zombie') {
      part([0.012, 0.014, 0.006], [0, 0.185, 0.118], black);
      const t = 0.75;
      part([0.024, 0.02, 0.006], on(0.152, t, 0.0), flat('#3a0d0d'), t);
      for (let k = 0; k < 4; k++) h.box([0.006, 0.011, 0.005], on(0.156, t - 0.2 + k * 0.13, 0.003), toothMaterial).rotation.y = t;
      for (let k = 0; k < 4; k++) h.box([0.006, 0.01, 0.005], on(0.144, t - 0.2 + k * 0.13, 0.003), toothMaterial).rotation.y = t;
      // Skull showing at the temple.
      part([0.03, 0.035, 0.012], on(0.285, -1.0, -0.003), flat('#e2d9bf', 0.5), -1.0);
      for (let k = 0; k < 3; k++) { const from = on(0.13 + random() * 0.02, -0.5 + k * 0.5, 0.0); h.rod(from, [from[0], from[1] - 0.03 - random() * 0.03, from[2]], 0.005, flat('#5d6b4c'), 0.001); }
    }

    // Mouth.
    const [mx, my, mz] = mouthAt;
    const lipHex = a.kind === 'ape' ? '#5a3a2c' : a.kind === 'zombie' ? '#3d3046' : ['#c4122f', '#111014', '#7b1fa2', '#c4122f'][Math.floor(random() * 4)];
    const lip = flat(lipHex, 0.35);
    const openMouth = (height: number) => part([0.034, height, 0.008], [mx, my, mz + 0.001], flat('#2a0a0c'));
    const mouthWide = a.kind === 'ape' ? 0.062 : 0.05;
    if (a.kind === 'skull') { teeth([mx, my + 0.004, mz + 0.006], 0.06, 9, true, a.mouth === 'gold' ? 2 : -1); teeth([mx, my - 0.004, mz + 0.004], 0.054, 8, false); }
    if (a.mouth === 'closed' && a.kind !== 'skull') {
      part([mouthWide * 0.5, 0.006, 0.007], [mx, my + 0.004, mz + 0.004], lip);
      part([mouthWide * 0.42, 0.007, 0.007], [mx, my - 0.006, mz + 0.003], lip);
    } else if (a.mouth === 'snarl' && a.kind !== 'skull') {
      openMouth(0.02);
      teeth([mx, my + 0.004, mz + 0.008], mouthWide, 8, true); teeth([mx, my - 0.005, mz + 0.007], mouthWide * 0.9, 7, false);
      if (a.kind === 'ape') for (const side of [-1, 1]) h.mesh(new THREE.ConeGeometry(0.005, 0.022, 6), toothMaterial, [side * 0.024, my - 0.002, mz + 0.006]).rotation.z = Math.PI;
    } else if (a.mouth === 'tongue') {
      if (a.kind !== 'skull') { openMouth(0.016); teeth([mx, my + 0.008, mz + 0.008], mouthWide * 0.9, 7, true); }
      const tongue = h.mesh(new THREE.CapsuleGeometry(0.014, 0.04, 6, 12), flat(a.kind === 'zombie' ? '#6a4a78' : '#e8527a', 0.4), [mx, my - 0.03, mz + 0.016]);
      tongue.scale.z = 0.45; tongue.rotation.x = 0.5;
      if (a.piercings !== 'none') part([0.005, 0.005, 0.005], [mx, my - 0.038, mz + 0.03], metal);
    } else if (a.mouth === 'gold' && a.kind !== 'skull') {
      openMouth(0.013);
      teeth([mx, my + 0.002, mz + 0.008], mouthWide * 1.05, 8, true, 2 + Math.floor(random() * 4));
      for (const side of [-1, 1]) part([0.006, 0.006, 0.005], [mx + side * mouthWide * 0.56, my + 0.008, mz], lip);
    } else if (a.mouth === 'cigarette') {
      if (a.kind !== 'skull') part([mouthWide * 0.48, 0.006, 0.007], [mx, my, mz + 0.004], lip);
      const from: [number, number, number] = [mx + 0.018, my, mz + 0.004], to: [number, number, number] = [mx + 0.045, my - 0.012, mz + 0.06];
      h.rod(from, to, 0.0042, flat('#f3efe4'));
      h.rod([to[0] - 0.004, to[1] + 0.002, to[2] - 0.009], to, 0.0044, new THREE.MeshStandardMaterial({ color: '#ff6a1a', emissive: '#ff4a0a', emissiveIntensity: 1.6 }));
    }

    // --- Things done to the face.
    if (a.extras === 'pin' || a.extras === 'works') {
      const t = -0.95, from = on(0.185, t, 0.012), to = on(0.14, t + 0.25, 0.012);
      h.rod(from, to, 0.0028, metal);
      h.rod([from[0] - 0.009, from[1], from[2] + 0.005], [to[0] - 0.009, to[1] + 0.008, to[2] + 0.005], 0.0028, metal);
      const coil = h.ring(0.007, 0.0028, [to[0] - 0.005, to[1] - 0.004, to[2] + 0.003], metal); coil.rotation.y = t + Math.PI / 2;
      h.box([0.016, 0.014, 0.008], [from[0] - 0.005, from[1] + 0.004, from[2] + 0.003], metal).rotation.y = t;
      part([0.004, 0.006, 0.003], on(0.17, t + 0.06, 0.002), flat('#9c1418'), t);
    }
    if (a.extras === 'bandage' || a.extras === 'works') {
      const tape = flat('#f4f1e6', 0.9);
      for (const side of [-1, 0, 1]) {
        const strip = h.box([0.024, 0.016, 0.004], [noseAt[0] + side * 0.02, noseAt[1] + 0.012, noseAt[2] + 0.014 - Math.abs(side) * 0.012], tape);
        strip.rotation.y = side * 0.75;
      }
      if (random() < 0.6) part([0.004, 0.005, 0.003], [noseAt[0] + 0.004, noseAt[1] + 0.012, noseAt[2] + 0.017], flat('#9c1418'));
    }
    if (a.extras === 'plaster' || a.extras === 'works') {
      const at = on(0.25, 0.36, 0.008);
      const strip = h.box([0.042, 0.014, 0.004], at, flat('#d9a878', 0.8));
      strip.rotation.set(0, 0.36, 0.35);
      const pad = h.box([0.014, 0.0145, 0.0045], at, flat('#efd9bd', 0.8));
      pad.rotation.copy(strip.rotation);
    }

    // --- Piercings.
    if (a.piercings === 'septum') {
      const ring = h.ring(0.012, 0.003, [noseAt[0], noseAt[1] - 0.02, noseAt[2] + 0.004], gold, Math.PI * 1.6);
      ring.rotation.z = Math.PI * 1.2;
      for (const side of [-1, 1]) part([0.0045, 0.0045, 0.0045], [side * 0.007, noseAt[1] - 0.031, noseAt[2] + 0.004], gold);
    } else if (a.piercings === 'ears') {
      for (const top of earTop)
        for (let k = 0; k < 5; k++) {
          const hoop = h.ring(0.007 + (k === 4 ? 0.006 : 0), 0.0018, [top[0] + Math.sign(top[0]) * 0.004, top[1] + 0.022 - k * 0.012, top[2] + 0.004 - Math.abs(k - 2) * 0.004], k % 2 ? gold : metal);
          hoop.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.5;
        }
      if (!earTop.length) h.ring(0.012, 0.003, [noseAt[0], noseAt[1] - 0.02, noseAt[2] + 0.004], metal).rotation.z = 0;
    } else if (a.piercings === 'chain') {
      const start: [number, number, number] = [noseAt[0] + 0.014, noseAt[1] - 0.012, noseAt[2]];
      const end: [number, number, number] = earTop.find((p) => p[0] > 0) ?? on(0.2, 1.4, 0.006);
      const points: [number, number, number][] = [];
      for (let k = 0; k <= 8; k++) {
        const f = k / 8, t = mix(0.15, 1.45, f), y = mix(start[1], end[1] - 0.012, f) - Math.sin(f * Math.PI) * 0.045;
        const p = on(Math.max(0.11, y), t, 0.012);
        points.push(k === 0 ? start : k === 8 ? [end[0], end[1] - 0.012, end[2]] : [p[0], y, p[2]]);
      }
      h.tube(points, 0.0022, gold);
      h.ring(0.006, 0.002, start, gold); part([0.005, 0.005, 0.005], [end[0], end[1] - 0.012, end[2]], gold);
    } else if (a.piercings === 'spikes') {
      const spike = (at: [number, number, number], direction: [number, number, number]) => {
        const cone = h.mesh(new THREE.ConeGeometry(0.0045, 0.02, 8), metal, at);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...direction).normalize());
      };
      for (const k of [0, 1, 2]) spike(on(0.252 + k * 0.004, -0.5 + k * 0.1, 0.016), [-0.4, 0.6, 0.8]);
      spike([0.014, noseAt[1] + 0.03, noseAt[2] - 0.004], [1, 0.2, 0.3]); spike([-0.014, noseAt[1] + 0.03, noseAt[2] - 0.004], [-1, 0.2, 0.3]);
      spike([mx, my - 0.022, mz + 0.008], [0, -0.5, 1]);
      for (const side of [-1, 1]) spike([mx + side * 0.03, my - 0.006, mz + 0.002], [side * 0.6, -0.3, 1]);
    }

    // --- Hair. The scalp line runs from the forehead (phi 0.6) over the crown to the nape.
    const YC = 0.24, YTOP = 0.352;
    const scalp = (phi: number, x = 0) => {
      const y = YC + (YTOP - YC) * Math.sin(phi);
      const r = radiusAt(Math.min(y, YTOP - 0.0005));
      const zFull = r * DEEP * Math.sign(Math.cos(phi)) * Math.sqrt(Math.max(0, 1 - (x / Math.max(r, 0.001)) ** 2));
      const normal = new THREE.Vector3(x * 4, Math.sin(phi) * 0.9 + 0.1, Math.cos(phi)).normalize();
      return { at: new THREE.Vector3(x, y, zFull), normal };
    };
    const droop = mood.wear * 0.5;
    const cone = (phi: number, x: number, length: number, base: number, index: number, lean = 0) => {
      const { at, normal } = scalp(phi, x);
      normal.x += lean + (random() - 0.5) * (0.12 + droop);
      normal.z += (random() - 0.5) * (0.1 + droop);
      normal.normalize();
      const mesh = h.mesh(new THREE.ConeGeometry(base, length, 9), hairOf(index));
      mesh.position.copy(at).addScaledVector(normal, length / 2 - 0.006);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      if (a.colour === 'tipped') {
        const tip = h.mesh(new THREE.ConeGeometry(base * 0.47, length * 0.45, 9), tipMaterial);
        tip.position.copy(at).addScaledVector(normal, length * 0.775 - 0.005);
        tip.quaternion.copy(mesh.quaternion);
      }
      return mesh;
    };
    const tall = mix(0.13, 0.2, random()) * mix(1, 0.85, mood.wear);
    const ridge = (x: number) => { // a strip of short hair under the spikes
      const points: [number, number, number][] = [];
      for (let k = 0; k <= 10; k++) { const p = scalp(mix(0.55, 3.45, k / 10), x).at; points.push([p.x, p.y, p.z]); }
      h.tube(points, 0.011, hairOf(0));
    };
    let hairTop = YTOP;
    if (a.hair === 'liberty') {
      const n = 5 + Math.floor(random() * 3);
      ridge(0);
      for (let k = 0; k < n; k++) cone(mix(0.62, 3.25, k / (n - 1)), 0, tall * mix(0.85, 1.1, random()) * (1 - Math.abs(k / (n - 1) - 0.45) * 0.35), 0.02, k);
      hairTop += tall;
    } else if (a.hair === 'bihawk') {
      const n = 5 + Math.floor(random() * 2);
      for (const side of [-1, 1]) {
        ridge(side * 0.034);
        for (let k = 0; k < n; k++) cone(mix(0.7, 3.1, k / (n - 1)), side * 0.034, tall * 0.62 * mix(0.85, 1.1, random()), 0.016, k + (side > 0 ? 3 : 0), side * 0.45);
      }
      hairTop += tall * 0.6;
    } else if (a.hair === 'fan') {
      const outline = new THREE.Shape();
      const steps = 34, outer: [number, number][] = [], innerPts: [number, number][] = [];
      const reach = tall * 0.95;
      for (let k = 0; k <= steps; k++) {
        const phi = mix(0.55, 3.45, k / steps), p = scalp(phi);
        const length = reach * (0.75 + 0.25 * Math.sin((k / steps) * Math.PI)) * (k % 2 ? 1 : 0.86 - random() * 0.08);
        outer.push([p.at.z + Math.cos(phi) * length, p.at.y + (Math.sin(phi) * 0.9 + 0.1) * length]);
        innerPts.push([p.at.z - Math.cos(phi) * 0.008, p.at.y - Math.sin(phi) * 0.008]);
      }
      outline.moveTo(...innerPts[0]);
      for (const p of outer) outline.lineTo(...p);
      for (const p of innerPts.reverse()) outline.lineTo(...p);
      outline.closePath();
      const geometry = new THREE.ExtrudeGeometry(outline, { depth: 0.016, bevelEnabled: false });
      geometry.translate(0, 0, -0.008);
      // Vertical colour bands for rainbow and tips.
      const fan = h.mesh(geometry, hairOf(0));
      fan.rotation.y = -Math.PI / 2;
      if (a.colour === 'rainbow' || a.colour === 'tipped') {
        const colours = new Float32Array(geometry.attributes.position.count * 3), c = new THREE.Color();
        for (let k = 0; k < geometry.attributes.position.count; k++) {
          const px = geometry.attributes.position.getX(k), py = geometry.attributes.position.getY(k);
          const distance = Math.hypot(px, py - YC), angle = Math.atan2(py - YC, px);
          if (a.colour === 'rainbow') c.setHSL(((angle + 0.5) / 4.2 + 1) % 1, 0.95, 0.52);
          else c.set(distance > 0.17 ? tipHex : '#2a1c14');
          colours.set([c.r, c.g, c.b], k * 3);
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
        fan.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: '#ffffff', emissiveIntensity: 0 });
      }
      hairTop += reach;
    } else if (a.hair === 'devilock') {
      const start = scalp(0.9).at;
      const sway = (random() - 0.5) * 0.05;
      const lock: [number, number, number][] = [[0, start.y - 0.01, start.z - 0.02], [0, start.y + 0.035, start.z + 0.03], [sway * 0.4, 0.27, 0.14], [sway, 0.19, 0.155], [sway * 1.4, 0.1, 0.135], [sway * 1.2, 0.04 + random() * 0.03, 0.12]];
      const path = new THREE.CatmullRomCurve3(lock.map((p) => new THREE.Vector3(...p)));
      const frames = 30, geometry = new THREE.TubeGeometry(path, frames, 0.024, 8, false);
      const position = geometry.attributes.position, centre = new THREE.Vector3(), vertex = new THREE.Vector3();
      for (let i = 0; i <= frames; i++) {
        path.getPointAt(i / frames, centre);
        const taper = Math.max(0.06, 1 - (i / frames) ** 1.6);
        for (let j = 0; j <= 8; j++) {
          const index = i * 9 + j;
          vertex.fromBufferAttribute(position, index).sub(centre).multiplyScalar(taper).add(centre);
          position.setXYZ(index, vertex.x, vertex.y, vertex.z);
        }
      }
      geometry.computeVertexNormals();
      h.mesh(geometry, hairOf(0));
      if (a.colour === 'tipped' || a.colour === 'rainbow') part([0.008, 0.03, 0.008], [lock[5][0], lock[5][1] + 0.03, lock[5][2]], tipMaterial);
      for (let k = 0; k < 4; k++) cone(1.0 + k * 0.12, (k - 1.5) * 0.012, 0.03, 0.012, k);
      hairTop += 0.03;
    } else if (a.hair === 'rattail') {
      const base = scalp(3.35).at, length = 0.16 + random() * 0.12, sway = (random() - 0.5) * 0.08;
      const points: [number, number, number][] = [[0, base.y, base.z + 0.005], [0, base.y - 0.02, base.z - 0.025], [sway * 0.5, base.y - length * 0.5, base.z - 0.03], [sway, Math.max(0.01, base.y - length), base.z - 0.015]];
      h.tube(points, 0.007, hairOf(0));
      for (let k = 1; k < 7; k++) { const f = k / 7; part([0.0095, 0.006, 0.0095], [mix(points[1][0], points[3][0], f), mix(points[1][1], points[3][1], f), mix(points[1][2], points[3][2], f) - Math.sin(f * 3.1) * 0.006], hairOf(k)); }
      part([0.009, 0.012, 0.009], points[3], a.colour === 'tipped' ? tipMaterial : flat('#c4122f'));
      part([0.022, 0.012, 0.014], [0, base.y + 0.004, base.z], hairOf(0));
    } else {
      // Chelsea: a feathered fringe and long side wisps.
      for (let k = 0; k < 11; k++) {
        const t = (k - 5) * 0.11, from = on(0.3 + random() * 0.01, t, 0.004), length = 0.045 + random() * 0.03;
        const tuft = h.mesh(new THREE.ConeGeometry(0.012, length, 5), hairOf(k), [from[0], from[1] - length / 2 + 0.008, from[2] + 0.004 + (0.3 - (from[1] - length / 2)) * 0.12]);
        tuft.rotation.set(Math.PI + 0.25, t, (random() - 0.5) * 0.25);
        tuft.scale.z = 0.5;
      }
      for (const side of [-1, 1]) {
        const length = 0.13 + random() * 0.08;
        for (let k = 0; k < 3; k++) {
          const t = side * (1.05 + k * 0.13), from = on(0.275, t, 0.006);
          const wisp = h.mesh(new THREE.ConeGeometry(0.011, length * (1 - k * 0.15), 5), k === 1 && a.colour === 'tipped' ? tipMaterial : hairOf(k + 2), [from[0], from[1] - length * (1 - k * 0.15) / 2, from[2]]);
          wisp.rotation.set(Math.PI, 0, side * 0.06);
        }
      }
      for (let k = 0; k < 5; k++) { const t = Math.PI + (k - 2) * 0.3, from = on(0.2, t, 0.004), wisp = h.mesh(new THREE.ConeGeometry(0.011, 0.11, 5), hairOf(k), [from[0], from[1] - 0.05, from[2]]); wisp.rotation.x = Math.PI; }
    }

    // --- Story dressing.
    const neckY = 0.06;
    if (a.story === 'mascot') {
      const leather = flat('#15141a', 0.5);
      const collar = h.cylinder(0.043, 0.045, 0.022, [0, neckY, 0], leather, 24);
      collar.scale.z = DEEP;
      for (let k = 0; k < 12; k++) {
        const t = (k / 12) * Math.PI * 2;
        const stud = h.mesh(new THREE.ConeGeometry(0.006, 0.02, 6), metal, [Math.sin(t) * 0.052, neckY, Math.cos(t) * 0.052 * DEEP]);
        stud.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.sin(t), 0, Math.cos(t)));
      }
      h.ring(0.009, 0.002, [0, neckY - 0.016, 0.055], metal);
    } else if (a.story === 'warning') {
      const text = ['NO POSERS', 'KEEP OUT', 'DEAD INSIDE', 'ASK FIRST', 'NOT FOR SALE'][Math.floor(random() * 5)];
      const sign = h.label(text, 0.15, 0.07, [0, 0.035, 0.092], '#16130f', '#b89b6a');
      sign.rotation.set(-0.25, 0, (random() - 0.5) * 0.15);
      for (const side of [-1, 1]) h.rod([side * 0.068, 0.068, 0.088], [side * 0.03, neckY + 0.03, -0.02], 0.0015, flat('#d8d0bb'));
    } else if (a.story === 'practice') {
      const combAt = scalp(2.3, 0.01).at;
      const comb = h.box([0.008, 0.035, 0.12], [combAt.x + 0.03, combAt.y + 0.02, combAt.z - 0.02], flat(['#e02a7a', '#111', '#2ad0c0'][Math.floor(random() * 3)], 0.4));
      comb.rotation.set(0.5, 0.3, 0.5);
      for (let k = 0; k < 3; k++) {
        const clip = h.box([0.008, 0.012, 0.045], on(0.27 + k * 0.012, 1.3 + k * 0.4, 0.006), metal);
        clip.rotation.y = 1.3 + k * 0.4;
      }
    }

    // --- Mount.
    let lift = 0;
    const wood = s.material('#8a623c');
    if (a.mount === 'block') {
      s.lathe([[0.085, 0], [0.09, 0.012], [0.075, 0.025], [0.03, 0.04], [0.024, 0.09], [0.035, 0.105], [0.06, 0.115], [0.065, 0.13], [0, 0.13]], wood);
      lift = 0.13;
    } else if (a.mount === 'crate') {
      const crateHex = ['#c22a2a', '#1f5fb0', '#e0a81f', '#2f8a4a'][Math.floor(random() * 4)];
      const plastic = s.material(crateHex, { roughness: 0.5 });
      const cw = 0.4, cd = 0.3, ch = 0.26;
      s.box([cw, 0.02, cd], [0, ch - 0.01, 0], plastic);
      for (const y of [0.02, ch * 0.5, ch - 0.045]) { s.box([cw, 0.03, 0.015], [0, y, cd / 2], plastic); s.box([cw, 0.03, 0.015], [0, y, -cd / 2], plastic); s.box([0.015, 0.03, cd], [cw / 2, y, 0], plastic); s.box([0.015, 0.03, cd], [-cw / 2, y, 0], plastic); }
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.025, ch, 0.025], [x * (cw / 2 - 0.005), ch / 2, z * (cd / 2 - 0.005)], plastic);
      for (const x of [-0.1, 0, 0.1]) s.box([0.012, ch, 0.012], [x, ch / 2, cd / 2], plastic);
      s.label(['LAGER', 'PILS', 'STOUT', 'CIDER'][Math.floor(random() * 4)], 0.2, 0.05, [0, ch * 0.5, cd / 2 + 0.009], '#f6f1de', crateHex);
      lift = ch;
      // A can or two of hairspray next to it.
      for (let k = 0; k < 1 + Math.round(mood.density * 2); k++) {
        const x = (k % 2 ? -1 : 1) * (0.12 + random() * 0.04), z = 0.08 - k * 0.07;
        s.cylinder(0.022, 0.022, 0.14, [x, ch + 0.07, z], s.material(['#d92b7a', '#27b0c9', '#e8c62a'][k % 3], { metalness: 0.5, roughness: 0.35 }), 14);
        s.cylinder(0.012, 0.02, 0.025, [x, ch + 0.15, z], s.material('#f1f1f1'), 12);
      }
    } else if (a.mount === 'pole') {
      const steel = s.material('#2a2a2e', { metalness: 0.7, roughness: 0.4 });
      const top = 1.25 + random() * 0.25;
      s.cylinder(0.014, 0.014, top, [0, top / 2, 0], steel, 12);
      s.cylinder(0.02, 0.02, 0.08, [0, top * 0.55, 0], s.material('#b9bcc0', { metalness: 0.9, roughness: 0.25 }), 12);
      for (let k = 0; k < 3; k++) { const t = (k / 3) * Math.PI * 2 + 0.5; s.rod([0, 0.2, 0], [Math.sin(t) * 0.3, 0.012, Math.cos(t) * 0.3], 0.011, steel); s.ball([0.018, 0.012, 0.018], [Math.sin(t) * 0.3, 0.012, Math.cos(t) * 0.3], steel, 10); }
      // Rags, tape and a cable tied round it.
      for (let k = 0; k < 2 + Math.round(mood.density * 4); k++) {
        const y = top - 0.08 - k * 0.09, length = 0.15 + random() * 0.25, t = random() * 6.3;
        const rag = s.box([0.035, length, 0.004], [Math.sin(t) * 0.03, y - length / 2, Math.cos(t) * 0.03], k % 2 ? tipMaterial : s.material(['#c4122f', '#f1d21f', '#111', '#f1f1f1'][k % 4]));
        rag.rotation.set((random() - 0.5) * 0.4, t, (random() - 0.5) * 0.3);
      }
      lift = top - 0.03;
    }
    h.root.position.y = lift;
    h.root.rotation.y = (random() - 0.5) * 0.3;
    if (a.mount !== 'pole') h.root.rotation.z = (random() - 0.5) * 0.08 * mood.wear;
    s.root.add(h.root);
    void shaved; void hairTop;

    return s.finish({ footprint: a.mount === 'pole' ? 0.32 : a.mount === 'crate' ? 0.26 : 0.1 });
  },
});
