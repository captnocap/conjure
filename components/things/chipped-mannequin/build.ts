import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix } from '@conjure/kit';

type P3 = readonly [number, number, number];
type ArmPose = 'down' | 'hip' | 'raised' | 'offer';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    outfit: choice('Which decade does the donated outfit come from?', {
      fifties: 'A 1950s polka-dot dress with a nipped waist and a full circle skirt.',
      seventies: 'A 1970s wide-collared shirt in orange and brown with flared trousers.',
      eighties: 'A 1980s power suit: huge shoulder pads, gold buttons, a pencil skirt in a loud colour.',
      nineties: 'A 1990s plaid flannel shirt with rolled sleeves over faded blue jeans.',
      shellsuit: 'A crackly colour-block shell tracksuit, teal and purple, zipped to the chin.',
    }),
    figure: choice('What kind of figure is it?', {
      painted: 'A realistic full figure in flesh-toned fibreglass with a painted face, lashes and red lips.',
      abstract: 'A glossy featureless full figure with an egg-smooth head, white or black.',
      headless: 'A full figure that ends at a capped neck, no head at all.',
      torso: 'A linen-covered dressmaker\'s torso on a pole with a wooden neck knob, no limbs, sleeves hanging empty.',
    }),
    pose: choice('If it has arms, how is it posed?', {
      sides: 'Arms hanging at its sides, patient.',
      hip: 'One hand on its hip, the other down.',
      akimbo: 'Both hands on its hips, confident.',
      wave: 'One arm raised as if hailing someone across the shop.',
      offer: 'Both forearms held out forward, as if offering or asking.',
    }),
    damage: choice('What is wrong with it, beyond the chipped paint?', {
      nothing: 'Nothing else: it is complete.',
      hand: 'One hand is missing, leaving a bare wrist peg.',
      arm: 'A whole arm is gone and the sleeve hangs empty.',
      wig: 'Its wig has slipped sideways, showing the bald scalp.',
      bald: 'It has no wig at all, just a bare scalp.',
    }),
    tag: choice('What does the price tag pinned to its sleeve say, if there is one?', {
      none: 'No tag.',
      price: '$4.99',
      asis: 'AS IS',
      notforsale: 'NOT FOR SALE',
      half: 'HALF PRICE',
    }),
    extra: choice('What has someone added to it?', {
      none: 'Nothing extra.',
      handbag: 'A handbag hooked over its arm.',
      hat: 'A wide-brimmed sun hat set on top.',
      scarf: 'A long scarf wound round the neck with one end trailing.',
      shades: 'A pair of big dark sunglasses.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const body = new THREE.Group();
    s.root.add(body);
    const into = <T extends THREE.Object3D>(node: T) => { body.add(node); return node; };
    const torso = a.figure === 'torso', hasHead = a.figure === 'painted' || a.figure === 'abstract';
    const vivid = (hex: string) => { const c = new THREE.Color(hex), h = { h: 0, s: 0, l: 0 }; c.getHSL(h); return c.setHSL(h.h, clamp01(h.s * mix(0.6, 1.1, mood.cheer)), h.l); };

    // Skin: fibreglass with plaster showing through the chips, or linen for a dress form.
    const skinTone = torso ? '#cdbb98' : a.figure === 'painted' ? pick(['#e2b79a', '#d6a585', '#b98566', '#8c5f45', '#ecc8ae']) : pick(['#f1efe9', '#f1efe9', '#1d1d20', '#c9c2b4']);
    const chips = Math.round(4 + mood.wear * 46);
    const blemish = (ctx: CanvasRenderingContext2D, w: number, h: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const x = random() * w, y = random() * h, r = (3 + random() * 9) * (torso ? 1.4 : 1);
        ctx.beginPath();
        for (let k = 0; k < 7; k++) { const t = k / 7 * Math.PI * 2, d = r * mix(0.5, 1.1, random()); ctx.lineTo(x + Math.cos(t) * d * 1.3, y + Math.sin(t) * d); }
        ctx.closePath();
        ctx.fillStyle = torso ? 'rgba(94,72,48,0.35)' : '#d9d3c4'; ctx.fill();
        if (!torso) { ctx.strokeStyle = '#6f675b'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
    };
    const skinMap = paint(256, 256, (ctx) => {
      ctx.fillStyle = skinTone; ctx.fillRect(0, 0, 256, 256);
      if (torso) { ctx.strokeStyle = 'rgba(80,62,40,0.22)'; for (let i = 0; i < 64; i++) { ctx.beginPath(); ctx.moveTo(0, i * 4); ctx.lineTo(256, i * 4); ctx.moveTo(i * 4, 0); ctx.lineTo(i * 4, 256); ctx.stroke(); } }
      blemish(ctx, 256, 256, chips);
    });
    const gloss = a.figure === 'abstract' ? 0.18 : torso ? 0.95 : 0.42;
    const skin = new THREE.MeshStandardMaterial({ map: skinMap, roughness: mix(gloss, 0.85, mood.wear * 0.7) });
    const steel = s.material('#b9bec2', { metalness: 0.85, roughness: mix(0.25, 0.6, mood.wear) });
    const dark = s.material('#2a2a2d');

    // Outfit palette and cloth.
    const cloth = (color: THREE.ColorRepresentation, map: THREE.Texture | null = null, rough = 0.85) =>
      new THREE.MeshStandardMaterial({ color: map ? '#ffffff' : color, map, roughness: rough, side: THREE.DoubleSide });
    const css = (c: THREE.Color) => `#${c.getHexString()}`;
    let top: THREE.Material, bottom: THREE.Material, trim: THREE.Material;
    if (a.outfit === 'fifties') {
      const base = css(vivid(pick(['#c8322b', '#1f8a8a', '#e6b422', '#e56a9a', '#2c4a9a'])));
      const dots = paint(128, 128, (ctx) => { ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = '#fbf6ea'; for (const [x, y] of [[32, 32], [96, 96], [96, 32], [32, 96], [64, 64], [0, 64], [64, 0], [128, 64], [64, 128], [0, 0], [128, 128], [0, 128], [128, 0]]) { ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill(); } });
      dots.repeat.set(8, 3);
      top = cloth(base, dots); bottom = top; trim = cloth('#fbf6ea');
    } else if (a.outfit === 'seventies') {
      const [c1, c2, c3] = pick([['#d9691e', '#6b3a1e', '#f0d9a6'], ['#c9a227', '#5a3d1c', '#efe2bd'], ['#8a3b1f', '#d98c2b', '#f3e3c2']]).map((c) => css(vivid(c)));
      const swirl = paint(128, 128, (ctx) => { ctx.fillStyle = c1; ctx.fillRect(0, 0, 128, 128); for (let i = 0; i < 4; i++) { ctx.strokeStyle = i % 2 ? c2 : c3; ctx.lineWidth = 9; ctx.beginPath(); for (let x = -10; x <= 138; x += 4) ctx.lineTo(x, 16 + i * 32 + Math.sin(x / 128 * Math.PI * 4) * 10); ctx.stroke(); } });
      swirl.repeat.set(4, 3);
      top = cloth(c1, swirl); bottom = cloth(vivid(pick(['#6a4326', '#d8c8a3', '#8e4a22', '#3b4a35'])), null, 0.8); trim = cloth(c3);
    } else if (a.outfit === 'eighties') {
      const base = vivid(pick(['#d6218b', '#1c56d8', '#7a2cc4', '#e23a2e', '#0fa38f']));
      top = cloth(base, null, 0.6); bottom = top; trim = s.material('#d8b040', { metalness: 0.8, roughness: 0.3 });
    } else if (a.outfit === 'nineties') {
      const [c1, c2] = pick([['#b3261e', '#1c1c1e'], ['#2f6b3c', '#16241a'], ['#3a5fa8', '#e8e2d2'], ['#c99a2a', '#3a2a1a']]).map((c) => css(vivid(c)));
      const plaid = paint(128, 128, (ctx) => { ctx.fillStyle = c1; ctx.fillRect(0, 0, 128, 128); ctx.globalAlpha = 0.6; ctx.fillStyle = c2; ctx.fillRect(0, 0, 44, 128); ctx.fillRect(0, 0, 128, 44); ctx.globalAlpha = 1; ctx.fillRect(0, 0, 44, 44); ctx.fillStyle = '#f1e9c8'; ctx.fillRect(84, 0, 4, 128); ctx.fillRect(0, 84, 128, 4); });
      plaid.repeat.set(7, 4);
      top = cloth(c1, plaid); bottom = cloth(mix(0, 1, mood.wear) > 0.5 ? '#7f97b8' : '#3f5f93', null, 0.9); trim = cloth('#e9e4d6');
    } else {
      const [c1, c2, c3] = pick([['#12a5a0', '#7b2fbf', '#f24b9a'], ['#f2c21b', '#1f4fc4', '#e63b2e'], ['#e85d9b', '#2ab7ca', '#f4f0e6']]).map((c) => css(vivid(c)));
      const block = paint(128, 128, (ctx) => { ctx.fillStyle = c1; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(128, 0); ctx.lineTo(128, 30); ctx.lineTo(0, 70); ctx.fill(); ctx.fillStyle = c3; ctx.beginPath(); ctx.moveTo(0, 70); ctx.lineTo(128, 30); ctx.lineTo(128, 44); ctx.lineTo(0, 84); ctx.fill(); });
      block.repeat.set(2, 1);
      top = cloth(c1, block, 0.45); bottom = cloth(c2, null, 0.45); trim = cloth(c3, null, 0.45);
    }
    const dress = a.outfit === 'fifties', skirted = dress || a.outfit === 'eighties';
    const puff = a.outfit === 'shellsuit' ? 0.03 : a.outfit === 'eighties' ? 0.018 : 0.01;

    const lathe = (profile: readonly (readonly [number, number])[], material: THREE.Material, squash: number) => {
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 28), material);
      mesh.scale.z = squash; mesh.castShadow = mesh.receiveShadow = true;
      return into(mesh);
    };
    const limb = (from: P3, to: P3, r0: number, r1: number, material: THREE.Material) => into(s.rod(from, to, r0, material, r1));
    const ball = (size: P3, at: P3, material: THREE.Material) => into(s.ball(size, at, material, 16));

    // Base plate and support.
    s.cylinder(0.21, 0.22, 0.014, [0, 0.007, 0], steel, 36);
    if (torso) {
      s.cylinder(0.018, 0.018, 0.86, [0, 0.44, 0], steel, 12);
      s.cylinder(0.03, 0.03, 0.1, [0, 0.5, 0], steel, 12);
    } else {
      s.rod([0.09, 0.014, -0.1], [0.09, 0.42, -0.07], 0.009, steel);
      s.box([0.03, 0.02, 0.06], [0.09, 0.42, -0.045], steel);
    }

    // Torso.
    lathe([[0, 0.84], [0.15, 0.86], [0.175, 0.95], [0.13, 1.1], [0.15, 1.22], [0.165, 1.32], [0.16, 1.4], [0.07, 1.46], [0.05, 1.5], [0.05, 1.55], [0, 1.555]], skin, 0.62);
    for (const sx of [-1, 1]) ball([0.06, 0.06, 0.06], [sx * 0.185, 1.4, 0], skin);
    // Top garment shell.
    const hem = a.outfit === 'eighties' ? 0.88 : dress ? 1.08 : a.outfit === 'shellsuit' ? 0.93 : 0.9;
    const shell = ([[0.175, 0.86], [0.178, 0.95], [0.133, 1.1], [0.153, 1.22], [0.168, 1.32], [0.165, 1.4], [0.1, 1.455]] as const)
      .filter(([, y]) => y >= hem - 0.001).map(([x, y]) => [Math.max(x, a.outfit === 'eighties' || a.outfit === 'shellsuit' ? 0.165 : 0) + puff, y] as const);
    lathe([[shell[0][0], hem], ...shell], top, 0.64 + puff * 2);
    if (a.outfit === 'shellsuit') { lathe([[0.2, 0.9], [0.2, 0.95]], trim, 0.68); lathe([[0.075, 1.45], [0.07, 1.52]], trim, 0.8); }
    if (a.outfit === 'seventies' || a.outfit === 'nineties') for (const sx of [-1, 1]) {
      const wing = into(s.box([a.outfit === 'seventies' ? 0.12 : 0.07, 0.008, 0.06], [sx * 0.06, 1.455, 0.075], a.outfit === 'seventies' ? trim : top));
      wing.rotation.set(0.9, 0, sx * -0.5);
    }
    if (a.outfit === 'eighties') {
      for (const sx of [-1, 1]) into(s.box([0.17, 0.07, 0.19], [sx * 0.21, 1.425, 0], top)).rotation.z = sx * -0.12;
      for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) ball([0.014, 0.014, 0.008], [sx * 0.035, 1.02 + i * 0.09, 0.118 + (i === 0 ? 0.004 : 0)], trim);
      const lapel = new THREE.Shape(); lapel.moveTo(0, 1.2); lapel.lineTo(0.075, 1.44); lapel.lineTo(-0.075, 1.44); lapel.closePath();
      const vee = into(new THREE.Mesh(new THREE.ShapeGeometry(lapel), cloth('#f3efe6')));
      vee.position.z = 0.124; vee.rotation.x = -0.06;
    }
    if (dress) { const belt = into(s.ring(0.137, 0.014, [0, 1.09, 0], trim)); belt.rotation.x = Math.PI / 2; belt.scale.y = 0.66; }

    // Lower garment and legs.
    if (dress) lathe([[0.145, 1.09], [0.27, 0.93], [0.37, 0.7], [0.41, 0.52]], bottom, 0.92);
    else if (a.outfit === 'eighties') lathe([[0.19, 0.95], [0.192, 0.88], [0.165, 0.5]], bottom, 0.66);
    else lathe([[0.184, 0.98], [0.19, 0.9], [0.16, 0.82], [0, 0.79]], torso ? skin : bottom, 0.66);
    if (!torso) for (const sx of [-1, 1]) {
      const x = sx * 0.088, knee: P3 = [x, 0.5, 0.012], ankle: P3 = [x, 0.09, -0.01];
      if (skirted) {
        limb([x, 0.9, 0], knee, 0.078, 0.052, skin); limb(knee, ankle, 0.052, 0.034, skin); ball([0.052, 0.052, 0.052], knee, skin);
        ball([0.042, 0.032, 0.105], [x, 0.045, 0.04], a.figure === 'painted' ? skin : skin);
      } else {
        const flare = a.outfit === 'seventies' ? 0.135 : a.outfit === 'shellsuit' ? 0.095 : 0.078;
        const fat = a.outfit === 'shellsuit' ? 0.02 : 0;
        limb([x, 0.9, 0], knee, 0.092 + fat, 0.068 + fat, bottom); ball([0.068 + fat, 0.068 + fat, 0.068 + fat], knee, bottom);
        limb(knee, [x, 0.06, -0.01], 0.068 + fat, flare, bottom);
        if (a.outfit === 'shellsuit') limb([x, 0.1, -0.01], [x, 0.05, -0.01], 0.065, 0.06, trim);
        ball([0.045, 0.034, 0.11], [x, 0.045, 0.045], dark);
      }
    }

    // Arms.
    const poses: Record<typeof a.pose, readonly [ArmPose, ArmPose]> = { sides: ['down', 'down'], hip: ['hip', 'down'], akimbo: ['hip', 'hip'], wave: ['down', 'raised'], offer: ['offer', 'offer'] };
    const joints = (sx: number, pose: ArmPose): readonly [P3, P3] => ({
      down: [[sx * 0.235, 1.13, -0.01], [sx * 0.245, 0.87, 0.045]],
      hip: [[sx * 0.4, 1.17, -0.06], [sx * 0.2, 1.0, 0.06]],
      raised: [[sx * 0.37, 1.34, 0.08], [sx * 0.43, 1.63, 0.17]],
      offer: [[sx * 0.235, 1.14, 0.03], [sx * 0.2, 1.09, 0.29]],
    } as const)[pose];
    const sleeveTo = { fifties: 0.4, seventies: 2, eighties: 2, nineties: 1.35, shellsuit: 2 }[a.outfit];
    const lostSide = random() < 0.5 ? -1 : 1;
    const wrists: P3[] = [];
    [-1, 1].forEach((sx, index) => {
      const shoulder: P3 = [sx * 0.2, 1.4, 0];
      const gone = torso || (a.damage === 'arm' && sx === lostSide);
      if (gone) {
        // Socket plate, and the sleeve hanging flat and empty.
        const plate = into(s.cylinder(0.04, 0.04, 0.012, [sx * 0.225, 1.38, 0], torso ? s.material('#6d4a2c') : dark, 14));
        plate.rotation.z = Math.PI / 2;
        if (sleeveTo >= 1) { const limp = limb(shoulder, [sx * 0.235, 1.4 - 0.5, 0.01 + random() * 0.03], 0.062 + puff, 0.05 + puff, top); limp.scale.z = 0.3; wrists.push([sx * 0.235, 0.92, 0.02]); }
        else if (sleeveTo > 0) limb(shoulder, [sx * 0.24, 1.3, 0], 0.07, 0.075, top).scale.z = 0.5;
        return;
      }
      const [elbow, wrist] = joints(sx, poses[a.pose][index]);
      limb(shoulder, elbow, 0.05, 0.04, skin); ball([0.04, 0.04, 0.04], elbow, skin); limb(elbow, wrist, 0.04, 0.027, skin);
      const along = (from: P3, to: P3, t: number): P3 => [mix(from[0], to[0], t), mix(from[1], to[1], t), mix(from[2], to[2], t)];
      const beyond = along(elbow, wrist, 1.18);
      if (a.damage === 'hand' && sx === lostSide) { limb(wrist, along(elbow, wrist, 1.06), 0.012, 0.012, steel); into(s.cylinder(0.028, 0.028, 0.004, wrist, dark, 12)).quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(wrist[0] - elbow[0], wrist[1] - elbow[1], wrist[2] - elbow[2]).normalize())); }
      else { const hand = limb(wrist, beyond, 0.03, 0.022, skin); hand.scale.z = 0.5; ball([0.027, 0.027, 0.027], wrist, skin); }
      if (sleeveTo > 0) {
        limb(shoulder, sleeveTo >= 1 ? elbow : along(shoulder, elbow, sleeveTo), 0.062 + puff, 0.05 + puff, top);
        if (sleeveTo >= 1) {
          ball([0.05 + puff, 0.05 + puff, 0.05 + puff], elbow, top);
          const end = along(elbow, wrist, Math.min(1, sleeveTo - 1) * 0.94);
          limb(elbow, end, 0.05 + puff, a.outfit === 'seventies' ? 0.062 : 0.038 + puff, top);
          if (a.outfit === 'nineties') ball([0.052, 0.052, 0.052], end, trim);
          if (a.outfit === 'shellsuit') limb(along(elbow, wrist, 0.86), along(elbow, wrist, 0.97), 0.04, 0.036, trim);
        }
      }
      wrists.push(wrist);
    });

    // Head, face and wig.
    const headAt: P3 = [0, 1.665, 0.008];
    if (hasHead) {
      const face = paint(256, 128, (ctx) => {
        ctx.fillStyle = skinTone; ctx.fillRect(0, 0, 256, 128);
        blemish(ctx, 256, 128, Math.round(chips * 0.3));
        if (a.figure === 'painted') {
          for (const sx of [-1, 1]) {
            const x = 64 + sx * 12;
            ctx.fillStyle = '#f6f2ea'; ctx.beginPath(); ctx.ellipse(x, 60, 6.5, 3.6, 0, 0, 7); ctx.fill();
            ctx.fillStyle = pick(['#3c5a78', '#4a3524', '#3f6b4a']); ctx.beginPath(); ctx.arc(x, 60, 3.2, 0, 7); ctx.fill();
            ctx.strokeStyle = '#1b1512'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, 60, 7, 4, 0, Math.PI, Math.PI * 2); ctx.stroke();
            ctx.lineWidth = 1.6; ctx.strokeStyle = '#4a3528'; ctx.beginPath(); ctx.moveTo(x - 7, 51); ctx.quadraticCurveTo(x, 47, x + 7, 51); ctx.stroke();
          }
          ctx.fillStyle = '#b3202a'; ctx.beginPath(); ctx.ellipse(64, 86, 8, 3.2, 0, 0, 7); ctx.fill();
          if (mood.wear > 0.55) { ctx.fillStyle = '#d9d3c4'; ctx.beginPath(); ctx.ellipse(64, 72, 3, 4, 0, 0, 7); ctx.fill(); }
        }
      });
      const head = ball([0.082, 0.108, 0.092], headAt, new THREE.MeshStandardMaterial({ map: face, roughness: skin.roughness }));
      head.rotation.y = (random() - 0.5) * 0.3;
      ball([0.011, 0.016, 0.014], [0, 1.655, 0.097], skin);
      if (a.damage !== 'bald') {
        const hair = s.material(pick(['#e0c170', '#5a371f', '#191616', '#a8431f', '#d9d6cf', '#8a6a45']), { roughness: 0.7 });
        const wig = into(new THREE.Group());
        wig.position.set(...headAt);
        const lock = (size: P3, at: P3) => { const m = s.ball(size, at, hair, 16); wig.add(m); return m; };
        lock([0.091, 0.1, 0.1], [0, 0.03, -0.03]);
        const style = { fifties: 'bob', seventies: 'long', eighties: 'perm', nineties: 'long', shellsuit: 'tail' }[a.outfit];
        if (style === 'bob') { lock([0.11, 0.075, 0.095], [0, -0.035, -0.04]); lock([0.085, 0.03, 0.04], [0, 0.075, 0.055]); }
        if (style === 'long') { lock([0.1, 0.19, 0.055], [0, -0.13, -0.075]); for (const sx of [-1, 1]) lock([0.03, 0.15, 0.045], [sx * 0.085, -0.1, -0.01]); }
        if (style === 'perm') { lock([0.15, 0.13, 0.11], [0, 0.04, -0.07]); for (let i = 0; i < 9; i++) lock([0.05, 0.05, 0.05], [Math.cos(i * 0.7) * 0.13, 0.03 + Math.sin(i * 0.7) * 0.12, -0.03 - random() * 0.05]); }
        if (style === 'tail') { lock([0.035, 0.035, 0.035], [0, 0.07, -0.13]); lock([0.03, 0.11, 0.035], [0, -0.03, -0.17]); }
        if (a.damage === 'wig') { wig.rotation.set(0.15, 0.5, random() < 0.5 ? 0.55 : -0.55); wig.position.x += wig.rotation.z < 0 ? 0.03 : -0.03; wig.position.y -= 0.012; }
      }
    } else if (torso) {
      into(s.lathe([[0.052, 1.55], [0.058, 1.565], [0.03, 1.58], [0.022, 1.6], [0.036, 1.625], [0.02, 1.655], [0, 1.66]], s.material('#6d4a2c', { roughness: 0.5 })));
    } else {
      into(s.cylinder(0.052, 0.052, 0.012, [0, 1.56, 0], dark, 16)); into(s.cylinder(0.012, 0.012, 0.03, [0, 1.58, 0], steel, 8));
    }
    const crown = hasHead ? 1.75 : torso ? 1.63 : 1.56;

    // Things people have added.
    if (a.extra === 'hat') {
      const straw = s.material(pick(['#d8b877', '#e9dcc0', '#2b2b30', '#b8452f']), { roughness: 0.9 });
      const hat = into(new THREE.Group());
      const brim = s.cylinder(0.19, 0.2, 0.012, [0, 0, 0], straw, 32), top2 = s.cylinder(0.085, 0.1, 0.09, [0, 0.045, 0], straw, 24), band = s.cylinder(0.102, 0.102, 0.025, [0, 0.02, 0], cloth(vivid('#b3262e')), 24);
      hat.add(brim, top2, band);
      hat.position.set(0, crown + (hasHead ? -0.015 : 0.01), hasHead ? -0.01 : 0);
      hat.rotation.set(hasHead ? -0.12 : 0.1, 0, (random() - 0.5) * 0.4);
    }
    if (a.extra === 'scarf') {
      const wool = cloth(vivid(pick(['#c23b2e', '#2e6f9e', '#e0a52b', '#6b3fa0', '#2f7d54'])), null, 0.95);
      const wrap = into(s.ring(0.085, 0.035, [0, 1.49, 0.005], wool)); wrap.rotation.x = Math.PI / 2 - 0.15; wrap.scale.y = 0.85;
      const tail = into(s.box([0.09, 0.5, 0.02], [0.07, 1.25, 0.125], wool)); tail.rotation.z = -0.08; tail.rotation.x = -0.05;
      into(s.box([0.09, 0.03, 0.022], [0.09, 0.99, 0.135], trim));
    }
    if (a.extra === 'shades' && hasHead) {
      for (const sx of [-1, 1]) into(s.cylinder(0.03, 0.03, 0.008, [sx * 0.036, 1.682, 0.092], s.material('#101014', { roughness: 0.15, metalness: 0.4 }), 16)).rotation.x = Math.PI / 2;
      into(s.box([0.17, 0.008, 0.008], [0, 1.69, 0.085], dark));
    } else if (a.extra === 'shades') {
      for (const sx of [-1, 1]) into(s.cylinder(0.03, 0.03, 0.008, [sx * 0.036, 1.4, 0.125], s.material('#101014', { roughness: 0.15, metalness: 0.4 }), 16)).rotation.x = Math.PI / 2;
      into(s.box([0.075, 0.008, 0.008], [0, 1.405, 0.122], dark));
    }
    if (a.extra === 'handbag' && wrists.length) {
      const at = wrists[0];
      const leather = s.material(vivid(pick(['#7a3b1f', '#111114', '#c9a227', '#b0263a', '#e8dcc2'])), { roughness: 0.5 });
      const bag = into(new THREE.Group());
      bag.add(s.box([0.2, 0.14, 0.07], [0, -0.2, 0], leather), s.ring(0.065, 0.007, [0, -0.09, 0], leather), s.box([0.2, 0.03, 0.074], [0, -0.14, 0], leather), s.ball([0.012, 0.012, 0.012], [0, -0.16, 0.04], steel));
      bag.position.set(at[0], at[1] + 0.045, at[2]);
      bag.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.6;
    }
    let swing: THREE.Object3D | null = null;
    if (a.tag !== 'none') {
      const at = wrists.at(-1) ?? [0.17, 1.2, 0.1];
      const tag = into(new THREE.Group());
      const text = { price: '$4.99', asis: 'AS IS', notforsale: 'NOT FOR SALE', half: 'HALF PRICE' }[a.tag];
      const card = s.label(text, 0.13, 0.075, [0, -0.115, 0], a.tag === 'notforsale' ? '#fffbe8' : '#8a1f1f', a.tag === 'notforsale' ? '#b3261e' : a.tag === 'half' ? '#f6d53a' : '#f1e6c8');
      tag.add(card, s.rod([0, 0, 0], [0, -0.08, 0], 0.002, dark));
      tag.position.set(at[0], at[1] + 0.03, at[2] + 0.06);
      tag.rotation.set(0, (random() - 0.5) * 0.5, (random() - 0.5) * 0.3);
      swing = tag;
    }

    // An old mannequin never quite stands true on its rod.
    body.rotation.z = (random() - 0.5) * mood.wear * 0.09;
    body.rotation.y = (random() - 0.5) * 0.35;
    const base = swing ? swing.rotation.z : 0, rate = mix(0.5, 2.2, mood.energy), reach = mix(0.01, 0.18, mood.energy);
    return s.finish({ update: swing ? (_dt, time) => { swing!.rotation.z = base + Math.sin(time * rate) * reach; } : undefined });
  },
});
