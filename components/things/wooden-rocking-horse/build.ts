import * as THREE from 'three';
import { Sculpture, choice, defineThing, disposeTree, mix, score, visibleBounds } from '@conjure/kit';

type P3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const COATS = {
  dapple: 'Dapple grey, the classic nursery horse.',
  chestnut: 'Glossy chestnut brown with a pale mane.',
  black: 'Jet black, handsome and a little frightening.',
  palomino: 'Golden palomino with a white blaze.',
  piebald: 'White with big dark patches, a fairground pony.',
  carousel: 'Cream with painted roses and gilt, straight off a carousel.',
} as const;
const COAT_BASE: Record<keyof typeof COATS, string> = { dapple: '#cfd2d3', chestnut: '#8c4a22', black: '#222021', palomino: '#d7b06c', piebald: '#f0ebe0', carousel: '#f3ead2' };
const HAIR: Record<keyof typeof COATS, string> = { dapple: '#e9e4d6', chestnut: '#e2cf9c', black: '#19171a', palomino: '#f3ecd8', piebald: '#2a2522', carousel: '#d9aa3a' };

export default defineThing({
  questions: {
    coat: choice('How is the horse painted?', COATS),
    eyes: choice('What are its eyes like?', {
      glass: 'Two dark glass eyes, bright and alive.',
      'one-missing': 'One glass eye, and one empty socket.',
      painted: 'Flat painted eyes, wide and staring.',
      button: 'One glass eye and one replaced with a sewn-on red button.',
    }),
    mane: choice('What is left of the mane and tail?', {
      flowing: 'A full flowing horsehair mane and long tail.',
      cropped: 'A stiff cropped mane and a short docked tail.',
      'moth-eaten': 'A few thin hanks, the rest eaten away.',
      gone: 'Gone entirely: only the row of holes where the hair was pegged.',
    }),
    rider: choice('What is on its back?', {
      empty: 'Nothing. The saddle is empty.',
      doll: 'A rag doll slumped forward in the saddle.',
      teddy: 'A teddy bear sat up as the rider.',
      sheet: 'A dust sheet half pulled off its hindquarters.',
      hat: 'A child\'s cowboy hat hooked over its head.',
    }),
    saddle: choice('What tack does it wear?', {
      red: 'A red leather saddle on a blue blanket with brass studs.',
      brown: 'A plain brown leather saddle, cracked along the seat.',
      blanket: 'Only a striped blanket; the saddle is lost.',
      bare: 'Nothing at all, bareback.',
    }),
    pose: choice('How does it carry its head?', {
      arched: 'Neck arched and proud, chin tucked.',
      gallop: 'Stretched out flat in full gallop.',
      bowed: 'Head lowered, tired or grazing.',
    }),
    rockers: choice('What colour are the bow rockers?', {
      oak: 'Varnished oak.',
      red: 'Pillar-box red with a gold line.',
      green: 'Dark bottle green.',
      blue: 'Sky blue, nursery paint.',
    }),
    size: score('How big is it?', ['Small enough for a toddler', 'A proper nursery horse', 'Huge, a horse for a grand house']),
  },

  build(a, context) {
    const h = new Sculpture(context);
    const { mood, random } = context;
    const R = 1.25; // radius of the bow rockers

    // ---- painted coat, flaking to bare wood with wear
    const coatTexture = paint(256, 256, (ctx) => {
      ctx.fillStyle = COAT_BASE[a.coat]; ctx.fillRect(0, 0, 256, 256);
      if (a.coat === 'dapple') for (let i = 0; i < 90; i++) { const x = random() * 256, y = random() * 256, r = 7 + random() * 9; ctx.strokeStyle = 'rgba(105,112,118,0.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); }
      if (a.coat === 'piebald') for (let i = 0; i < 7; i++) { ctx.fillStyle = '#2b2320'; ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 25 + random() * 40, 18 + random() * 28, random() * 3, 0, 7); ctx.fill(); }
      if (a.coat === 'carousel') for (let i = 0; i < 16; i++) { const x = random() * 256, y = random() * 256; ctx.fillStyle = '#c9364c'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.257) * 7, y + Math.sin(k * 1.257) * 7, 6, 0, 7); ctx.fill(); } ctx.fillStyle = '#d9aa3a'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#3f8a5a'; ctx.fillRect(x + 10, y + 8, 12, 5); }
      if (a.coat === 'chestnut' || a.coat === 'palomino' || a.coat === 'black') { ctx.globalAlpha = 0.12; for (let i = 0; i < 40; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#000000'; ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 30, 10, random() * 3, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
      const flakes = Math.round(mood.wear ** 1.4 * 70);
      for (let i = 0; i < flakes; i++) {
        const x = random() * 256, y = random() * 256, r = 6 + random() * 20 * mood.wear;
        ctx.fillStyle = '#7d5a34'; ctx.beginPath(); for (let k = 0; k < 9; k++) { const t = k / 9 * 6.283, q = r * (0.6 + random() * 0.6) + 2; ctx.lineTo(x + Math.cos(t) * q, y + Math.sin(t) * q); } ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#b98f5c'; ctx.beginPath(); for (let k = 0; k < 9; k++) { const t = k / 9 * 6.283, q = r * (0.6 + random() * 0.6); ctx.lineTo(x + Math.cos(t) * q, y + Math.sin(t) * q); } ctx.closePath(); ctx.fill();
      }
      if (mood.wear > 0.3) { ctx.strokeStyle = 'rgba(40,28,16,0.55)'; ctx.lineWidth = 1.5; for (let i = 0; i < mood.wear * 14; i++) { let x = random() * 256, y = random() * 256; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (random() - 0.5) * 30; y += 8 + random() * 14; ctx.lineTo(x, y); } ctx.stroke(); } }
    });
    coatTexture.wrapS = coatTexture.wrapT = THREE.RepeatWrapping;
    const coat = new THREE.MeshStandardMaterial({ map: coatTexture, roughness: mix(0.28, 0.85, mood.wear) });
    const hoofPaint = h.material('#1c1a1a', { roughness: 0.4 });
    const hair = h.material(HAIR[a.coat], { roughness: 0.95 });
    const brass = new THREE.MeshStandardMaterial({ color: '#c9a046', metalness: 0.8, roughness: 0.35 });
    const iron = h.material('#2c2b2d', { metalness: 0.6, roughness: 0.5 });
    const red = h.material('#b3202a', { roughness: 0.5 });

    // ---- body
    const barrel = h.mesh(new THREE.CapsuleGeometry(0.165, 0.34, 8, 24), coat, [0, 0.74, 0]); barrel.rotation.x = Math.PI / 2;
    h.ball([0.172, 0.18, 0.2], [0, 0.745, -0.2], coat, 24);
    h.ball([0.16, 0.175, 0.17], [0, 0.75, 0.2], coat, 24);
    const A = new THREE.Vector3(0, 0.8, 0.25);
    const P = { arched: new THREE.Vector3(0, 1.15, 0.36), gallop: new THREE.Vector3(0, 1.06, 0.5), bowed: new THREE.Vector3(0, 0.96, 0.5) }[a.pose];
    const dir = { arched: new THREE.Vector3(0, -0.24, 0.17), gallop: new THREE.Vector3(0, -0.11, 0.27), bowed: new THREE.Vector3(0, -0.26, 0.13) }[a.pose];
    const headLength = dir.length(); dir.normalize();
    const brow = new THREE.Vector3(0, dir.z, -dir.y); // out of the forehead
    const neck = h.rod(A.toArray() as P3, P.toArray() as P3, 0.135, coat, 0.085); neck.scale.x = 0.72;
    h.ball([0.07, 0.092, 0.092], P.toArray() as P3, coat, 18);
    const M = P.clone().addScaledVector(dir, headLength);
    const face = h.rod(P.toArray() as P3, M.toArray() as P3, 0.085, coat, 0.052); face.scale.x = 0.8;
    h.ball([0.05, 0.054, 0.054], M.toArray() as P3, coat, 16);
    const along = (t: number, side: number, lift: number): P3 => P.clone().addScaledVector(dir, t * headLength).addScaledVector(brow, lift).add(new THREE.Vector3(side, 0, 0)).toArray() as P3;
    for (const side of [-1, 1]) {
      const ear = h.mesh(new THREE.ConeGeometry(0.024, 0.075, 8), coat, [side * 0.042, P.y + 0.105, P.z - 0.02]); ear.rotation.set(0.25, 0, -side * 0.25);
      const nostril = h.ball([0.012, 0.012, 0.012], along(1.05, side * 0.024, 0.036), red, 8); nostril.castShadow = false;
    }
    const mouth = h.box([0.085, 0.008, 0.05], along(0.98, 0, -0.03), red); mouth.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

    // eyes: the damaged one faces the viewer's side
    const eye = (side: number, kind: 'glass' | 'missing' | 'painted' | 'button') => {
      const at = along(0.24, side * 0.066, 0.03);
      if (kind === 'glass') {
        const white = h.ball([0.006, 0.024, 0.024], at, h.material('#efe9dc'), 12); white.castShadow = false;
        h.ball([0.017, 0.017, 0.017], [at[0] + side * 0.004, at[1], at[2]], new THREE.MeshStandardMaterial({ color: '#150d08', roughness: 0.05, metalness: 0.2 }), 12);
        h.ball([0.004, 0.004, 0.004], [at[0] + side * 0.019, at[1] + 0.006, at[2] + 0.005], new THREE.MeshBasicMaterial({ color: '#ffffff' }), 6).castShadow = false;
      } else if (kind === 'missing') {
        h.ball([0.006, 0.027, 0.027], at, h.material('#b98f5c'), 12).castShadow = false;
        h.ball([0.008, 0.018, 0.018], [at[0] + side * 0.002, at[1], at[2]], new THREE.MeshStandardMaterial({ color: '#120c08', roughness: 1 }), 12).castShadow = false;
      } else if (kind === 'painted') {
        h.ball([0.006, 0.03, 0.03], at, h.material('#f6f2e8'), 12).castShadow = false;
        h.ball([0.007, 0.019, 0.019], [at[0] + side * 0.002, at[1], at[2]], h.material('#2f5f9a'), 12).castShadow = false;
        h.ball([0.008, 0.009, 0.009], [at[0] + side * 0.003, at[1], at[2]], h.material('#0d0b0b'), 8).castShadow = false;
      } else {
        const button = h.cylinder(0.024, 0.024, 0.008, [at[0] + side * 0.004, at[1], at[2]], red, 14); button.rotation.z = Math.PI / 2;
        for (const [dy, dz] of [[0.007, 0.007], [-0.007, -0.007], [0.007, -0.007], [-0.007, 0.007]]) h.ball([0.003, 0.003, 0.003], [at[0] + side * 0.009, at[1] + dy, at[2] + dz], h.material('#1a1414'), 5).castShadow = false;
      }
    };
    eye(-1, a.eyes === 'painted' ? 'painted' : 'glass');
    eye(1, a.eyes === 'one-missing' ? 'missing' : a.eyes === 'button' ? 'button' : a.eyes === 'painted' ? 'painted' : 'glass');

    // ---- legs, stretched fore and aft onto the rockers
    const RX = 0.125;
    const rockerTop = (z: number) => R - Math.sqrt((R - 0.07) ** 2 - z * z);
    for (const side of [-1, 1]) {
      const fore: P3[] = [[side * 0.085, 0.67, 0.2], [side * 0.1, 0.46, 0.43], [side * RX, rockerTop(0.6) + 0.035, 0.6]];
      const hind: P3[] = [[side * 0.09, 0.68, -0.22], [side * 0.105, 0.47, -0.42], [side * RX, rockerTop(-0.62) + 0.035, -0.62]];
      for (const leg of [fore, hind]) {
        h.rod(leg[0], leg[1], 0.075, coat, 0.045);
        h.ball([0.047, 0.047, 0.047], leg[1], coat, 12);
        h.rod(leg[1], leg[2], 0.043, coat, 0.03);
        const hoof = h.cylinder(0.034, 0.042, 0.05, [leg[2][0], leg[2][1] - 0.01, leg[2][2]], hoofPaint, 12); hoof.rotation.x = leg === fore ? 0.45 : -0.45;
      }
    }

    // ---- bow rockers
    const rockerHex = { oak: '#8a5a2c', red: '#b3202a', green: '#1f4a36', blue: '#6fa6cf' }[a.rockers];
    const rockerPaint = h.material(rockerHex, { roughness: a.rockers === 'oak' ? 0.5 : 0.4 });
    const span = 0.74;
    const band = (inner: number, outer: number, thickness: number) => {
      const shape = new THREE.Shape();
      for (let i = 0; i <= 32; i++) { const phi = -span + 2 * span * i / 32; const x = outer * Math.sin(phi), y = R - outer * Math.cos(phi); if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y); }
      for (let i = 32; i >= 0; i--) { const phi = -span + 2 * span * i / 32; shape.lineTo(inner * Math.sin(phi), R - inner * Math.cos(phi)); }
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
      geometry.rotateY(-Math.PI / 2); geometry.translate(thickness / 2, 0, 0);
      return geometry;
    };
    for (const side of [-1, 1]) {
      h.mesh(band(R - 0.07, R, 0.034), rockerPaint, [side * RX, 0, 0]);
      if (a.rockers !== 'oak') h.mesh(band(R - 0.04, R - 0.03, 0.036), brass, [side * RX, 0, 0]);
    }
    for (const phi of [-0.6, -0.33, 0.33, 0.6]) {
      const bar = h.cylinder(0.016, 0.016, RX * 2 + 0.08, [0, R - (R - 0.035) * Math.cos(phi), (R - 0.035) * Math.sin(phi)], a.rockers === 'oak' ? rockerPaint : brass, 10); bar.rotation.z = Math.PI / 2;
    }
    h.box([RX * 2 + 0.06, 0.018, 0.5], [0, 0.085, 0], rockerPaint);

    // ---- tack
    if (a.saddle !== 'bare') {
      const blanketTexture = paint(64, 64, (ctx) => {
        ctx.fillStyle = a.saddle === 'red' ? '#2f4f9a' : a.saddle === 'brown' ? '#7a6a4a' : '#c8402f'; ctx.fillRect(0, 0, 64, 64);
        if (a.saddle === 'blanket') { ctx.fillStyle = '#f1e6c4'; for (let x = 4; x < 64; x += 16) ctx.fillRect(x, 0, 5, 64); ctx.fillStyle = '#2f6a56'; for (let x = 12; x < 64; x += 16) ctx.fillRect(x, 0, 3, 64); }
        else { ctx.fillStyle = '#d9aa3a'; ctx.fillRect(0, 0, 64, 5); ctx.fillRect(0, 59, 64, 5); }
      });
      const blanket = h.mesh(new THREE.CylinderGeometry(0.173, 0.173, 0.34, 24, 1, true, -1.25, 2.5), new THREE.MeshStandardMaterial({ map: blanketTexture, roughness: 0.95, side: THREE.DoubleSide }), [0, 0.745, -0.02]);
      blanket.rotation.x = Math.PI / 2; blanket.rotation.y = 0; blanket.rotation.order = 'XYZ'; blanket.rotation.set(Math.PI / 2, Math.PI, 0);
      const girth = h.mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 32), h.material('#4a2d1a'), [0, 0.74, 0.04]);
      girth.castShadow = false;
      if (a.saddle !== 'blanket') {
        const leather = h.material(a.saddle === 'red' ? '#a3212b' : '#5c3a20', { roughness: mix(0.4, 0.9, mood.wear) });
        h.ball([0.13, 0.045, 0.17], [0, 0.915, -0.03], leather, 18);
        h.ball([0.07, 0.05, 0.035], [0, 0.945, 0.12], leather, 12);
        h.ball([0.105, 0.06, 0.035], [0, 0.95, -0.18], leather, 12);
        for (const side of [-1, 1]) {
          h.ball([0.02, 0.1, 0.09], [side * 0.165, 0.83, -0.02], leather, 12);
          h.rod([side * 0.172, 0.86, 0.03], [side * 0.185, 0.6, 0.05], 0.008, h.material('#3a2415'));
          const stirrup = h.mesh(new THREE.TorusGeometry(0.035, 0.007, 6, 16), iron, [side * 0.187, 0.565, 0.05]); stirrup.rotation.y = Math.PI / 2; stirrup.rotation.x = (random() - 0.5) * 0.5;
        }
        if (a.saddle === 'red') for (let i = 0; i < 7; i++) for (const side of [-1, 1]) h.ball([0.009, 0.009, 0.009], [side * 0.168, 0.705, -0.16 + i * 0.05], brass, 6).castShadow = false;
        if (mood.wear > 0.5) for (let i = 0; i < 3; i++) { const crack = h.box([0.1 + random() * 0.08, 0.003, 0.006], [(random() - 0.5) * 0.06, 0.957, -0.1 + i * 0.06], h.material('#1c120b')); crack.rotation.y = (random() - 0.5) * 0.8; crack.castShadow = false; }
      }
      // bridle and reins
      const strap = h.material(a.saddle === 'red' ? '#a3212b' : '#4a2d1a');
      const noseband = h.mesh(new THREE.TorusGeometry(0.062, 0.008, 6, 20), strap, along(0.68, 0, 0)); noseband.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); noseband.scale.x = 0.82;
      for (const side of [-1, 1]) {
        h.rod(along(0.68, side * 0.052, 0.0), along(0.02, side * 0.066, -0.01), 0.006, strap);
        h.ball([0.012, 0.012, 0.012], along(0.68, side * 0.054, 0.0), brass, 8);
        if (a.saddle !== 'blanket') h.tube([along(0.7, side * 0.055, -0.02), [side * 0.11, mix(P.y, 0.9, 0.55), mix(P.z, 0.14, 0.5)], [side * 0.03, 0.96, 0.13]], 0.005, strap);
      }
    }

    // ---- mane and tail
    const crest = (t: number) => new THREE.Vector3(0, mix(0.9, P.y + 0.07, t), mix(0.17, P.z - 0.05, t));
    if (a.mane === 'gone') {
      for (let i = 0; i < 8; i++) { const c = crest(i / 7); h.ball([0.008, 0.008, 0.008], [0, c.y + 0.006, c.z - 0.006], h.material('#120c08'), 6).castShadow = false; }
      h.ball([0.012, 0.012, 0.012], [0, 0.83, -0.385], h.material('#120c08'), 6);
    } else if (a.mane === 'cropped') {
      for (let i = 0; i < 12; i++) { const c = crest(i / 11); const tuft = h.box([0.022, 0.055, 0.04], [0, c.y + 0.012, c.z - 0.012], hair); tuft.rotation.x = -0.6; }
      h.rod([0, 0.83, -0.37], [0, 0.78, -0.5], 0.03, hair, 0.02);
    } else {
      const sparse = a.mane === 'moth-eaten';
      const hanks = sparse ? 4 : 13;
      for (let i = 0; i < hanks; i++) {
        const t = sparse ? random() : i / (hanks - 1), c = crest(t), length = (sparse ? 0.1 : 0.16) + random() * 0.1, sway = (random() - 0.5) * 0.06;
        h.tube([[0, c.y, c.z], [0.05, c.y + 0.01, c.z - 0.02], [0.085, c.y - length * 0.5, c.z - 0.04 + sway], [0.075, c.y - length, c.z - 0.05 + sway * 2]], sparse ? 0.008 : 0.016, hair);
      }
      if (!sparse) for (let i = 0; i < 3; i++) h.tube([[(i - 1) * 0.02, P.y + 0.08, P.z], along(0.05, (i - 1) * 0.022, 0.085), along(0.3 + random() * 0.15, (i - 1) * 0.03, 0.07)], 0.012, hair);
      for (let i = 0; i < (sparse ? 2 : 7); i++) {
        const dx = (random() - 0.5) * 0.07, reach = sparse ? 0.5 : 1;
        h.tube([[0, 0.83, -0.36], [dx * 0.5, 0.86, -0.46], [dx, 0.83 - 0.25 * reach, -0.56 - random() * 0.04], [dx * 1.4, 0.83 - 0.47 * reach - random() * 0.06, -0.55 + random() * 0.05]], sparse ? 0.008 : 0.016, hair);
      }
    }

    // ---- what rides it
    if (a.rider === 'doll') {
      const dress = h.material(mood.cheer > 0.5 ? '#d8506a' : '#5a6f8a', { roughness: 1 }), skin = h.material('#efd3b4', { roughness: 1 }), yarn = h.material('#b5562a', { roughness: 1 });
      const body = h.ball([0.07, 0.11, 0.06], [0, 1.03, -0.02], dress, 12); body.rotation.x = 0.55;
      h.ball([0.062, 0.062, 0.058], [0.015, 1.14, 0.09], skin, 14);
      for (let i = 0; i < 8; i++) { const t = i / 7 * Math.PI; h.rod([0.015 + Math.cos(t) * 0.05, 1.165 + Math.sin(t) * 0.02, 0.075], [0.015 + Math.cos(t) * 0.085, 1.07 + random() * 0.03, 0.06], 0.011, yarn); }
      for (const side of [-1, 1]) {
        h.tube([[side * 0.06, 1.07, 0.03], [side * 0.1, 0.98, 0.1], [side * 0.09, 0.88, 0.16]], 0.018, skin);
        h.tube([[side * 0.05, 0.96, -0.04], [side * 0.17, 0.9, 0.0], [side * 0.2, 0.74, 0.03]], 0.022, h.material('#f1ede2', { roughness: 1 }));
        h.ball([0.028, 0.02, 0.04], [side * 0.2, 0.72, 0.045], h.material('#22201f'), 8);
        h.ball([0.007, 0.007, 0.007], [0.015 + side * 0.022, 1.15, 0.143], h.material('#161313'), 6).castShadow = false;
      }
    } else if (a.rider === 'teddy') {
      const fur = h.material('#a8743c', { roughness: 1 }), pad = h.material('#dcc097', { roughness: 1 });
      h.ball([0.085, 0.1, 0.075], [0, 1.03, -0.03], fur, 14);
      h.ball([0.07, 0.066, 0.064], [0, 1.175, -0.015], fur, 14);
      h.ball([0.032, 0.026, 0.03], [0, 1.16, 0.045], pad, 10);
      h.ball([0.01, 0.008, 0.008], [0, 1.168, 0.075], h.material('#161313'), 6);
      for (const side of [-1, 1]) {
        h.ball([0.027, 0.027, 0.014], [side * 0.052, 1.235, -0.02], fur, 10);
        h.ball([0.008, 0.008, 0.008], [side * 0.026, 1.19, 0.043], h.material('#161313'), 6);
        h.tube([[side * 0.07, 1.07, -0.01], [side * 0.11, 1.0, 0.07], [side * 0.08, 0.96, 0.13]], 0.03, fur);
        h.tube([[side * 0.06, 0.96, -0.02], [side * 0.17, 0.9, 0.03], [side * 0.19, 0.8, 0.07]], 0.036, fur);
        h.ball([0.03, 0.03, 0.012], [side * 0.195, 0.775, 0.085], pad, 8);
      }
    } else if (a.rider === 'hat') {
      const felt = h.material(mood.cheer > 0.5 ? '#c2473a' : '#6b4a2c', { roughness: 0.9 });
      const hat = new THREE.Group(); hat.position.set(0.02, P.y + 0.12, P.z - 0.01); hat.rotation.set(0.25, 0, -0.3); h.root.add(hat);
      const crown = new THREE.Mesh(new THREE.LatheGeometry([[0.19, 0.03], [0.17, 0.0], [0.09, -0.01], [0.085, 0.07], [0.07, 0.1], [0.0, 0.09]].map(([r, y]) => new THREE.Vector2(r, y)), 24), felt); crown.castShadow = true; crown.scale.z = 1.2; hat.add(crown);
      const bandMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.09, 0.02, 20), h.material('#f1e6c4')); bandMesh.position.y = 0.01; bandMesh.scale.z = 1.2; hat.add(bandMesh);
      h.tube([[0.1, P.y + 0.1, P.z], [0.1, P.y - 0.1, P.z + 0.03], [0.0, P.y - 0.2, P.z + 0.06], [-0.09, P.y - 0.08, P.z + 0.03], [-0.09, P.y + 0.14, P.z]], 0.004, h.material('#e9e2cf'));
    } else if (a.rider === 'sheet') {
      const geometry = new THREE.PlaneGeometry(0.95, 0.95, 26, 26); geometry.rotateX(-Math.PI / 2);
      const position = geometry.getAttribute('position'), k = random() * 6;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), z = position.getZ(i) - 0.33;
        const e = (x / 0.21) ** 2 + ((z + 0.12) / 0.42) ** 2;
        const top = e < 1 ? 0.76 + 0.19 * Math.sqrt(1 - e) : 0.76;
        const outside = Math.max(0, Math.sqrt(e) - 1);
        const fall = Math.min(outside * 0.62, 0.58) + (outside > 0 ? 0.02 * Math.sin(Math.atan2(x, z + 0.12) * 9 + k) * Math.min(outside * 3, 1) : 0);
        const pull = outside > 0 ? 1 - Math.min(outside, 1) * 0.28 : 1;
        position.setXYZ(i, x * pull, Math.max(top - fall, 0.2) + 0.012, (z + 0.12) * pull - 0.12);
      }
      geometry.computeVertexNormals();
      h.mesh(geometry, new THREE.MeshStandardMaterial({ color: new THREE.Color('#e9e4d6').lerp(new THREE.Color('#a9a08c'), mood.wear * 0.6), roughness: 1, side: THREE.DoubleSide }));
    }

    // ---- set it rocking on the centre of its own curve
    const outer = new THREE.Group(), sizer = new THREE.Group(), pivot = new THREE.Group();
    const scale = mix(0.72, 1.3, a.size);
    sizer.scale.setScalar(scale); outer.add(sizer); sizer.rotation.y = 1.0 + (random() - 0.5) * 0.3;
    pivot.position.y = R; sizer.add(pivot); h.root.position.y = -R; pivot.add(h.root);
    const swing = mix(0.008, 0.13, mood.energy), phase = random() * 6.283, rate = mix(1.2, 3.4, mood.energy);
    pivot.rotation.x = swing * Math.sin(phase);
    const bounds = visibleBounds(outer), centre = bounds.getCenter(new THREE.Vector3());
    sizer.position.set(-centre.x, 0, -centre.z);
    return {
      object: outer,
      footprint: 0.5 * scale,
      update: (_dt, time) => { pivot.rotation.x = swing * Math.sin(phase + time * rate); },
      dispose: () => disposeTree(outer),
    };
  },
});
