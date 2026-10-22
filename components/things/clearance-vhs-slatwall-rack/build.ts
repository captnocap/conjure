import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const GENRES = {
  horror: { text: 'HORROR', sign: '#7a1218', ink: '#f4e9d0', covers: ['#22222a', '#8c141c', '#3d1014', '#41414f', '#c22a33', '#5b2a6b'] },
  comedy: { text: 'COMEDY', sign: '#f2c12e', ink: '#1d1d1f', covers: ['#f6d53a', '#3a8fe0', '#ff7fae', '#ffffff', '#f08a2a', '#5fcf8a'] },
  action: { text: 'ACTION', sign: '#d8531f', ink: '#ffffff', covers: ['#e8662a', '#2b2e33', '#b9c0c4', '#c22a33', '#f0b62a', '#33507a'] },
  drama: { text: 'DRAMA', sign: '#2b3a5c', ink: '#f1e6c8', covers: ['#34456b', '#7a2f3a', '#e6dcc2', '#5a6a5c', '#8a6a4a', '#2b2b33'] },
  kids: { text: 'KIDS', sign: '#2fa35a', ink: '#fff36b', covers: ['#e8382f', '#f6c829', '#2f7fe0', '#3cb563', '#b45ad6', '#ff8a2a'] },
  scifi: { text: 'SCI-FI', sign: '#1f6f78', ink: '#d8fff6', covers: ['#1f8f98', '#5a3fa0', '#c9d2d8', '#23283a', '#3fd0c0', '#8a4fd0'] },
  romance: { text: 'ROMANCE', sign: '#c8436f', ink: '#fff1f4', covers: ['#e86a8f', '#f4d9d0', '#b3202c', '#c9a0d8', '#f2e2c0', '#8a2f5a'] },
  newrel: { text: 'NEW RELEASES', sign: '#1d1d1f', ink: '#ffd84a', covers: ['#e8382f', '#23283a', '#f0c23a', '#2f7fe0', '#ffffff', '#3cb563'] },
} as const;

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
  return texture;
}

/** Greyscale sleeve art; the instance colour tints it, so four drawings become a whole shelf. */
function cover(variant: number) {
  return paint(128, 224, (c) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 224);
    const dark = 'rgba(0,0,0,0.62)', mid = 'rgba(0,0,0,0.3)', pale = 'rgba(255,255,255,0.75)';
    if (variant === 0) {
      c.fillStyle = dark; c.fillRect(0, 0, 128, 52);
      c.fillStyle = '#fff'; c.fillRect(14, 14, 100, 12); c.fillRect(30, 32, 68, 8);
      c.fillStyle = mid; c.beginPath(); c.arc(64, 128, 46, 0, 7); c.fill();
      c.fillStyle = dark; c.beginPath(); c.arc(64, 118, 18, 0, 7); c.fill(); c.fillRect(38, 138, 52, 40);
      c.fillStyle = dark; c.fillRect(0, 196, 128, 28);
    } else if (variant === 1) {
      c.fillStyle = dark; c.beginPath(); c.moveTo(0, 0); c.lineTo(128, 0); c.lineTo(0, 170); c.fill();
      c.fillStyle = '#fff'; c.fillRect(10, 16, 70, 14); c.fillRect(10, 36, 46, 10);
      c.fillStyle = mid; c.fillRect(46, 120, 72, 60);
      c.fillStyle = dark; c.fillRect(10, 192, 108, 16);
    } else if (variant === 2) {
      c.fillStyle = mid; c.fillRect(0, 60, 128, 164);
      c.fillStyle = dark; c.beginPath(); c.ellipse(64, 104, 20, 24, 0, 0, 7); c.fill();
      c.beginPath(); c.moveTo(22, 224); c.lineTo(34, 142); c.lineTo(94, 142); c.lineTo(106, 224); c.fill();
      c.fillStyle = dark; c.fillRect(12, 12, 104, 16); c.fillRect(28, 34, 72, 10);
    } else {
      c.fillStyle = dark; c.fillRect(0, 0, 128, 224);
      c.fillStyle = pale; c.fillRect(12, 60, 104, 26); c.fillRect(12, 96, 80, 26); c.fillRect(12, 132, 96, 26);
      c.fillStyle = '#fff'; c.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 9 : 20, t = i / 10 * Math.PI * 2 - Math.PI / 2; c.lineTo(98 + Math.cos(t) * r, 30 + Math.sin(t) * r); }
      c.fill();
      c.fillRect(12, 190, 60, 10);
    }
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 3; c.strokeRect(1.5, 1.5, 125, 221);
  });
}

export default defineThing({
  questions: {
    genre: choice('What genre is the section?', {
      horror: 'HORROR: black and blood-red sleeves.',
      comedy: 'COMEDY: loud yellow, pink and blue sleeves.',
      action: 'ACTION: orange explosions and gunmetal.',
      drama: 'DRAMA: sober navy, burgundy and cream.',
      kids: 'KIDS: primary colours, clamshell cases.',
      scifi: 'SCI-FI: teal, violet and silver.',
      romance: 'ROMANCE: pinks, blush and deep red.',
      newrel: 'NEW RELEASES: the wall by the door, every colour, once fought over.',
    }),
    picked: score('How picked-over is it?', ['Fully stocked, every slot filled', 'A few gaps', 'Half gone', 'Mostly bare ledges', 'One or two last cases']),
    format: choice('What is on it?', {
      vhs: 'Chunky VHS sleeves.',
      dvd: 'Slim DVD cases.',
      mixed: 'Both, the tapes being pushed out by discs.',
    }),
    stickers: choice('Are the cases stickered for clearance?', {
      none: 'No stickers: still priced to rent.',
      dots: 'A small fluorescent price dot on the corner of each case.',
      stars: 'Big fluorescent starburst price stickers slapped on the fronts.',
      bands: 'Yellow PREVIOUSLY VIEWED bands across the bottom of each case.',
    }),
    fixture: choice('What kind of fixture is it?', {
      slatwall: 'A grey slatwall gondola panel on a melamine plinth.',
      wire: 'A black wire rack on tube legs, see-through and rattly.',
      wood: 'A stained timber unit with side cheeks, an old independent shop.',
    }),
    header: choice('What is the genre header like?', {
      printed: 'A printed plastic strip in the genre colour.',
      lettered: 'A hand-lettered card, slightly wonky.',
      lightbox: 'An illuminated lightbox header.',
      hanging: 'The header has come loose and hangs by one corner.',
    }),
    topper: choice('What sits on top of or is clipped to the unit?', {
      nothing: 'Nothing.',
      price: 'A fluorescent card: ALL TAPES $2.',
      returns: 'A stack of returned tapes nobody reshelved.',
      forsale: 'A note: THIS FIXTURE FOR SALE, ASK AT COUNTER.',
    }),
    fallen: noul('Have some cases toppled over on the ledges and slid to the floor?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const genre = GENRES[a.genre];
    const W = 1.2, slope = 0.2, top = 1.82;
    const boardZ = (y: number) => 0.1 - (y - 0.3) * slope;
    const lean = Math.atan(slope);
    const frame = { slatwall: '#c9c7c0', wire: '#1f2124', wood: '#7a5230' }[a.fixture];
    const frameMat = s.material(frame, { metalness: a.fixture === 'wire' ? 0.6 : 0.05 });
    const length = Math.hypot(top - 0.3, (top - 0.3) * slope);
    const midY = (top + 0.3) / 2;

    if (a.fixture === 'wire') {
      const wires: THREE.Matrix4[] = [];
      const rodMatrix = (from: THREE.Vector3, to: THREE.Vector3, radius: number) => {
        const direction = to.clone().sub(from), size = direction.length();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        return new THREE.Matrix4().compose(from.clone().add(to).multiplyScalar(0.5), q, new THREE.Vector3(radius, size, radius));
      };
      for (let i = 0; i <= 12; i++) { const x = -W / 2 + i * W / 12; wires.push(rodMatrix(new THREE.Vector3(x, 0.3, boardZ(0.3) - 0.01), new THREE.Vector3(x, top, boardZ(top) - 0.01), 0.004)); }
      for (let i = 0; i <= 15; i++) { const y = 0.3 + i * (top - 0.3) / 15; wires.push(rodMatrix(new THREE.Vector3(-W / 2, y, boardZ(y) - 0.012), new THREE.Vector3(W / 2, y, boardZ(y) - 0.012), 0.004)); }
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), frameMat, wires.length);
      wires.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = true; s.root.add(mesh);
      for (const x of [-1, 1]) {
        s.rod([x * W / 2, 0, 0.2], [x * W / 2, top + 0.02, boardZ(top) - 0.01], 0.014, frameMat);
        s.rod([x * W / 2, 0, -0.26], [x * W / 2, top * 0.86, boardZ(top * 0.86) - 0.01], 0.012, frameMat);
        s.rod([x * W / 2, 0.012, 0.22], [x * W / 2, 0.012, -0.28], 0.014, frameMat);
      }
      s.rod([-W / 2, top + 0.02, boardZ(top) - 0.01], [W / 2, top + 0.02, boardZ(top) - 0.01], 0.014, frameMat);
      s.rod([-W / 2, 0.15, 0.13], [W / 2, 0.15, 0.13], 0.01, frameMat);
    } else {
      const map = a.fixture === 'slatwall'
        ? paint(64, 64, (c) => { c.fillStyle = '#d6d3ca'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#8f8c84'; c.fillRect(0, 54, 64, 10); c.fillStyle = '#f0ede4'; c.fillRect(0, 50, 64, 4); }, [1, 18])
        : paint(64, 256, (c) => { c.fillStyle = '#8a5f38'; c.fillRect(0, 0, 64, 256); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(50,28,10,${0.05 + random() * 0.12})`; c.fillRect(random() * 64, 0, 1 + random() * 3, 256); } }, [6, 1]);
      const board = s.box([W, length, 0.03], [0, midY, boardZ(midY) - 0.03], new THREE.MeshStandardMaterial({ map, roughness: 0.8 }));
      board.rotation.x = -lean;
      s.box([W, 0.3, 0.46], [0, 0.15, -0.03], frameMat);
      s.box([W + 0.02, 0.02, 0.48], [0, 0.305, -0.03], s.material(a.fixture === 'wood' ? '#5d3c20' : '#a5a39c'));
      if (a.fixture === 'wood') for (const x of [-1, 1]) s.box([0.025, top + 0.06, 0.46], [x * (W / 2 + 0.0125), (top + 0.06) / 2, -0.03], frameMat);
      else s.box([W, top - 0.2, 0.03], [0, (top + 0.2) / 2, -0.245], frameMat);
    }

    // Ledges with a price-strip lip.
    const tiers = [0.36, 0.66, 0.96, 1.26, 1.52];
    const lipMat = s.material(a.fixture === 'wire' ? '#1f2124' : '#e8e4d8');
    for (const y of tiers) {
      const ledge = s.box([W - 0.03, 0.01, 0.07], [0, y - 0.006, boardZ(y) + 0.03], a.fixture === 'wood' ? frameMat : s.material(a.fixture === 'wire' ? '#1f2124' : '#b9b7b0'));
      ledge.rotation.x = -lean;
      s.box([W - 0.03, 0.028, 0.006], [0, y + 0.008, boardZ(y) + 0.066], lipMat);
    }

    // Stock. Eye-level ledges empty first; the bottom row is where the leftovers live.
    type Case = { m: THREE.Matrix4; color: THREE.Color; variant: number; front: THREE.Matrix4; size: [number, number, number] };
    const cases: Case[] = [];
    const grey = new THREE.Color('#8f8a80');
    const keep = 1 - a.picked * 0.97;
    const tint = () => new THREE.Color(genre.covers[Math.floor(random() * genre.covers.length)]).lerp(grey, (1 - mood.cheer) * 0.25 + mood.wear * 0.15).offsetHSL((random() - 0.5) * 0.04, 0, (random() - 0.5) * 0.08);
    const sizeOf = (): [number, number, number] => (a.format === 'vhs' || (a.format === 'mixed' && random() < 0.45) ? [0.108, 0.19, 0.028] : [0.134, 0.188, 0.015]);
    const pushCase = (base: THREE.Matrix4, size: [number, number, number]) => {
      const m = base.clone().multiply(new THREE.Matrix4().makeTranslation(0, size[1] / 2, size[2] / 2));
      cases.push({ m: m.clone().multiply(new THREE.Matrix4().makeScale(...size)), color: tint(), variant: Math.floor(random() * 4), front: m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, size[2] / 2 + 0.0015)), size });
    };
    tiers.forEach((y, tier) => {
      const rowKeep = Math.min(1, keep * [1.5, 1.05, 0.75, 0.8, 1.0][tier] * mix(0.85, 1.1, mood.density));
      let x = -W / 2 + 0.035;
      let previousGone = false;
      while (true) {
        const size = sizeOf();
        if (x + size[0] > W / 2 - 0.03) break;
        const here = random() < rowKeep;
        if (here) {
          const loose = previousGone && (a.fallen ? random() < 0.6 : random() < 0.12);
          const tilt = loose ? (random() < 0.5 ? -1 : 1) * (0.2 + random() * 0.5) : (random() - 0.5) * 0.03;
          const base = new THREE.Matrix4().makeTranslation(x + size[0] / 2, y, boardZ(y) + 0.004)
            .multiply(new THREE.Matrix4().makeRotationX(-lean))
            .multiply(new THREE.Matrix4().makeRotationZ(tilt));
          pushCase(base, size);
        }
        previousGone = !here;
        x += size[0] + 0.012 + random() * 0.004;
      }
    });
    if (cases.length === 0) {
      const size = sizeOf();
      pushCase(new THREE.Matrix4().makeTranslation((random() - 0.5) * 0.8, tiers[0], boardZ(tiers[0]) + 0.004).multiply(new THREE.Matrix4().makeRotationX(-lean)), size);
    }
    if (a.fallen) {
      const count = 2 + Math.round(random() * 3 + mood.density * 3);
      for (let i = 0; i < count; i++) {
        const size = sizeOf();
        const base = new THREE.Matrix4().makeTranslation((random() - 0.5) * 1.3, 0.001, 0.34 + random() * 0.4)
          .multiply(new THREE.Matrix4().makeRotationY(random() * Math.PI * 2))
          .multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
          .multiply(new THREE.Matrix4().makeTranslation(0, -size[1] / 2, 0));
        pushCase(base, size);
      }
    }
    if (a.topper === 'returns' && a.fixture !== 'wire') {
      const stack = 3 + Math.floor(random() * 4);
      const sx = (random() - 0.5) * 0.6;
      for (let i = 0; i < stack; i++) {
        const size: [number, number, number] = [0.108, 0.19, 0.028];
        const base = new THREE.Matrix4().makeTranslation(sx + (random() - 0.5) * 0.02, top + 0.0 + i * 0.0285 - (a.fixture === 'wood' ? -0.06 : 0.0) + 0.0, -0.14)
          .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2 + (random() - 0.5) * 0.4))
          .multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
          .multiply(new THREE.Matrix4().makeTranslation(0, -size[1] / 2, 0));
        pushCase(base, size);
      }
    }
    const side = new THREE.MeshStandardMaterial({ color: '#e9e6de', roughness: 0.6 });
    for (let variant = 0; variant < 4; variant++) {
      const set = cases.filter((item) => item.variant === variant);
      if (!set.length) continue;
      const face = new THREE.MeshStandardMaterial({ map: cover(variant), roughness: 0.45 });
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), [side, side, side, side, face, side], set.length);
      set.forEach((item, i) => { mesh.setMatrixAt(i, item.m); mesh.setColorAt(i, item.color); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    if (a.stickers !== 'none') {
      const neon = ['#f9f02a', '#ff5fb0', '#ff8a2a', '#a6f23a'];
      let geometry: THREE.BufferGeometry;
      if (a.stickers === 'dots') geometry = new THREE.CircleGeometry(0.016, 14);
      else if (a.stickers === 'bands') geometry = new THREE.PlaneGeometry(1, 0.03);
      else {
        const shape = new THREE.Shape();
        for (let i = 0; i < 20; i++) { const r = i % 2 ? 0.026 : 0.04, t = i / 20 * Math.PI * 2; if (i) shape.lineTo(Math.cos(t) * r, Math.sin(t) * r); else shape.moveTo(r, 0); }
        geometry = new THREE.ShapeGeometry(shape);
      }
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.05 }), cases.length);
      cases.forEach((item, i) => {
        const [w, h] = item.size;
        const local = a.stickers === 'dots' ? new THREE.Matrix4().makeTranslation(w * 0.3, h * 0.36, 0)
          : a.stickers === 'bands' ? new THREE.Matrix4().makeTranslation(0, -h * 0.3, 0).multiply(new THREE.Matrix4().makeScale(w, 1, 1))
            : new THREE.Matrix4().makeTranslation((random() - 0.5) * w * 0.4, (random() - 0.5) * h * 0.4, 0).multiply(new THREE.Matrix4().makeRotationZ(random() * 3));
        mesh.setMatrixAt(i, item.front.clone().multiply(local));
        mesh.setColorAt(i, new THREE.Color(a.stickers === 'bands' ? '#f6d53a' : neon[Math.floor(random() * neon.length)]));
      });
      s.root.add(mesh);
    }

    // Genre header.
    const headerZ = boardZ(top) - 0.01, headerW = a.genre === 'newrel' ? W : W * 0.8;
    const sign = new THREE.Group();
    s.root.add(sign);
    sign.position.set(0, top + 0.115, headerZ);
    const hand = a.header === 'lettered';
    const signMap = paint(512, 110, (c) => {
      c.fillStyle = hand ? '#f4eed8' : genre.sign; c.fillRect(0, 0, 512, 110);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = hand ? genre.sign : genre.ink;
      if (hand) {
        c.font = 'bold 74px "Comic Sans MS", "Marker Felt", "DejaVu Sans", sans-serif';
        const total = c.measureText(genre.text).width, squeeze = Math.min(1, 440 / total);
        let x = 256 - total * squeeze / 2;
        for (const glyph of genre.text) {
          const advance = c.measureText(glyph).width * squeeze;
          c.save(); c.translate(x + advance / 2, 58 + (random() - 0.5) * 12); c.rotate((random() - 0.5) * 0.18); c.scale(squeeze, 1); c.fillText(glyph, 0, 0); c.restore();
          x += advance;
        }
        c.strokeStyle = genre.sign; c.lineWidth = 5; c.beginPath(); c.moveTo(60, 98); c.lineTo(452, 94); c.stroke();
      } else {
        c.font = 'bold 78px Impact, "Arial Black", "DejaVu Sans Condensed", sans-serif';
        c.fillText(genre.text, 256, 58, 460);
        c.fillRect(0, 0, 512, 6); c.fillRect(0, 104, 512, 6);
      }
    });
    const lit = a.header === 'lightbox';
    const signMat = new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.6, emissive: '#ffffff', emissiveMap: lit ? signMap : null, emissiveIntensity: lit ? mix(0.9, 0.5, mood.wear) : 0 });
    const plate = s.box([headerW, 0.19, lit ? 0.07 : 0.012], [0, 0, 0], [frameMat, frameMat, frameMat, frameMat, signMat, frameMat] as unknown as THREE.Material);
    sign.add(plate);
    if (a.header === 'hanging') {
      sign.position.set(headerW * 0.42, top + 0.02, headerZ + 0.075); sign.rotation.x = -lean;
      plate.position.set(-headerW / 2 + 0.03, -0.09, 0);
      sign.rotation.z = 1.0 + random() * 0.35;
    } else if (hand) sign.rotation.z = (random() - 0.5) * 0.06;

    if (a.topper === 'price' || a.topper === 'forsale') {
      const price = a.topper === 'price';
      const card = s.mesh(new THREE.PlaneGeometry(price ? 0.34 : 0.3, 0.22), new THREE.MeshStandardMaterial({
        roughness: 0.8, side: THREE.DoubleSide,
        map: paint(256, 166, (c) => {
          c.fillStyle = price ? '#f9f02a' : '#fbfaf2'; c.fillRect(0, 0, 256, 166);
          c.fillStyle = price ? '#c3221c' : '#1b2a4a'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.font = 'bold 40px "Comic Sans MS", "DejaVu Sans", sans-serif';
          if (price) { c.fillText('ALL TAPES', 128, 42, 230); c.font = 'bold 86px Impact, "DejaVu Sans", sans-serif'; c.fillText(['$2', '$1', '99¢', '3 FOR $5'][Math.floor(random() * 4)], 128, 112, 230); }
          else { c.font = 'bold 30px "Comic Sans MS", "DejaVu Sans", sans-serif'; c.fillText('THIS FIXTURE', 128, 34, 236); c.fillStyle = '#c3221c'; c.font = 'bold 44px "Comic Sans MS", "DejaVu Sans", sans-serif'; c.fillText('FOR SALE', 128, 82, 236); c.fillStyle = '#1b2a4a'; c.font = 'bold 24px "Comic Sans MS", "DejaVu Sans", sans-serif'; c.fillText('ask at counter', 128, 132, 236); }
        }),
      }), [W * 0.32 * (random() < 0.5 ? -1 : 1), 1.1 + random() * 0.35, 0]);
      card.position.z = boardZ(card.position.y) + 0.09;
      card.rotation.set(-lean, 0, (random() - 0.5) * 0.25);
    }
    return s.finish({ footprint: 0.66 });
  },
});
