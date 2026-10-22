import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = readonly [number, number, number];
type Profile = readonly (readonly [radius: number, down: number])[];
interface Cut { bodice: Profile; skirt: Profile; sleeves: 'puff' | 'cap' | 'long' | 'bell' | 'none'; straps: boolean; fullness: number; satin: boolean; year: string; }

// Radii and distances down from the hanger's shoulder line, metres.
const CUTS = {
  eighties: { bodice: [[0.07, 0], [0.19, 0.03], [0.17, 0.2], [0.12, 0.42]], skirt: [[0.12, 0.42], [0.34, 0.58], [0.5, 1.05], [0.56, 1.5]], sleeves: 'puff', straps: false, fullness: 0.72, satin: true, year: '1986' },
  fifties: { bodice: [[0.08, 0.02], [0.18, 0.04], [0.16, 0.2], [0.115, 0.4]], skirt: [[0.115, 0.4], [0.3, 0.56], [0.42, 0.9], [0.46, 1.1]], sleeves: 'cap', straps: false, fullness: 0.74, satin: false, year: '1957' },
  sixties: { bodice: [[0.07, 0], [0.18, 0.03], [0.165, 0.16], [0.16, 0.27]], skirt: [[0.16, 0.27], [0.19, 0.8], [0.25, 1.48]], sleeves: 'long', straps: false, fullness: 0.55, satin: false, year: '1962' },
  seventies: { bodice: [[0.05, -0.05], [0.06, 0], [0.18, 0.04], [0.16, 0.3]], skirt: [[0.16, 0.3], [0.22, 0.75], [0.3, 1.15], [0.38, 1.48]], sleeves: 'bell', straps: false, fullness: 0.55, satin: false, year: '1974' },
  nineties: { bodice: [[0.15, 0.14], [0.155, 0.28], [0.125, 0.45]], skirt: [[0.125, 0.45], [0.165, 0.7], [0.175, 1.45]], sleeves: 'none', straps: true, fullness: 0.45, satin: true, year: '1996' },
  mermaid: { bodice: [[0.16, 0.14], [0.155, 0.3], [0.115, 0.46]], skirt: [[0.115, 0.46], [0.165, 0.64], [0.13, 1.02], [0.36, 1.4], [0.45, 1.5]], sleeves: 'none', straps: true, fullness: 0.6, satin: true, year: '2008' },
} as const satisfies Record<string, Cut>;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    silhouette: choice('What silhouette and decade is the dress?', {
      eighties: 'A 1980s meringue: enormous puffed sleeves, a vast satin skirt and a bow.',
      fifties: 'A 1950s tea-length dress with cap sleeves and a full skirt ending at the calf.',
      sixties: 'An early-1960s empire-line column with long narrow sleeves, modest and plain.',
      seventies: 'A 1970s bohemian gown: high lace neck, tiered skirt, trailing bell sleeves.',
      nineties: 'A 1990s bias-cut satin slip on thin straps, minimal and narrow.',
      mermaid: 'A 2000s strapless mermaid gown, tight to the knee then flaring into a fishtail.',
    }),
    bag: choice('What state is the clear garment bag in?', {
      zipped: 'Zipped to the top, the dress a pale blur behind milky plastic.',
      open: 'Unzipped and pulled apart at the front so the dress shows through the gap.',
      fallen: 'Slipped off entirely and lying crumpled at the foot of the stand.',
    }),
    tag: choice('What is written on the donation tag?', {
      never: 'NEVER WORN',
      year: 'Just the year of the wedding.',
      half: 'HALF PRICE',
      once: 'WORN ONCE',
      cheap: '$15 AS IS',
      blank: 'Nothing: the tag is blank.',
    }),
    extras: choice('What came with the dress?', {
      none: 'Nothing but the dress.',
      veil: 'A long tulle veil draped over the hanger.',
      shoes: 'A pair of white satin heels set beneath it.',
      both: 'The veil and the shoes, the whole day in one donation.',
      bouquet: 'A dried bouquet tied upside down to the hanger.',
    }),
    mark: choice('What mark did its history leave on it?', {
      none: 'None: it is spotless.',
      hem: 'A grey, trodden hem from a long night of dancing.',
      wine: 'A red wine stain spreading across the front.',
      unfinished: 'It was never finished: a blue tacking line and coloured pins still run round the raw hem.',
    }),
    stand: choice('What does it hang on?', {
      pole: 'A chrome single-pole hanger stand with a round weighted base.',
      rail: 'A short rolling garment rail on casters.',
      coatstand: 'A dark wooden coat stand with curved hooks.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const cut: Cut = CUTS[a.silhouette];
    const hookY = 1.8, top = 1.69;
    const swing = new THREE.Group(), hung = new THREE.Group();
    swing.position.y = hookY; hung.position.y = -hookY;
    swing.add(hung); s.root.add(swing);
    const hang = <T extends THREE.Object3D>(node: T) => { hung.add(node); return node; };

    // Stand.
    const chrome = s.material('#d5dade', { metalness: 0.9, roughness: mix(0.2, 0.6, mood.wear) });
    if (a.stand === 'pole') {
      s.cylinder(0.25, 0.27, 0.03, [0, 0.015, -0.16], chrome, 36);
      s.cylinder(0.018, 0.018, 1.9, [0, 0.97, -0.16], chrome, 12);
      s.rod([0, 1.9, -0.16], [0, hookY + 0.03, 0.02], 0.012, chrome);
      s.ball([0.02, 0.02, 0.02], [0, hookY + 0.03, 0.02], chrome, 10);
    } else if (a.stand === 'rail') {
      for (const x of [-0.5, 0.5]) {
        s.cylinder(0.016, 0.016, hookY - 0.06, [x, (hookY + 0.06) / 2, 0], chrome, 10);
        s.box([0.04, 0.03, 0.56], [x, 0.085, 0], chrome);
        for (const z of [-0.26, 0.26]) s.cylinder(0.035, 0.035, 0.026, [x, 0.035, z], s.material('#222226'), 12).rotation.z = Math.PI / 2;
      }
      s.rod([-0.5, hookY, 0], [0.5, hookY, 0], 0.014, chrome);
      s.rod([-0.5, 0.1, 0], [0.5, 0.1, 0], 0.012, chrome);
    } else {
      const wood = s.material('#4a2f1e', { roughness: 0.5 });
      s.cylinder(0.022, 0.03, 1.92, [0, 0.98, -0.2], wood, 12);
      s.ball([0.035, 0.035, 0.035], [0, 1.95, -0.2], wood, 12);
      for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2 + Math.PI / 4; s.tube([[0, 0.5, -0.2], [Math.sin(t) * 0.14, 0.2, -0.2 + Math.cos(t) * 0.14], [Math.sin(t) * 0.3, 0.02, -0.2 + Math.cos(t) * 0.3]], 0.018, wood); }
      for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2; s.tube([[0, 1.72, -0.2], [Math.sin(t) * 0.13, 1.74, -0.2 + Math.cos(t) * 0.13], [Math.sin(t) * 0.2, hookY + 0.02, -0.2 + Math.cos(t) * 0.2], [Math.sin(t) * 0.19, hookY + 0.07, -0.2 + Math.cos(t) * 0.19]], 0.012, wood); }
    }

    // Hanger.
    const satinPad = s.material('#efe3d2', { roughness: 0.5 });
    const hook = hang(s.ring(0.025, 0.004, [0, hookY - 0.025, 0], chrome, Math.PI * 1.5)); hook.rotation.z = -Math.PI / 4;
    hang(s.rod([0, hookY - 0.05, 0], [0, top + 0.02, 0], 0.004, chrome));
    hang(s.tube([[-0.2, top - 0.035, 0], [-0.1, top + 0.005, 0], [0, top + 0.02, 0], [0.1, top + 0.005, 0], [0.2, top - 0.035, 0]], 0.016, satinPad));

    // Cloth: white that yellows with age, with a lace figure and whatever history left on it.
    const base = new THREE.Color('#fbfaf5').lerp(new THREE.Color('#e3d0a0'), mood.wear * 0.75 + (a.silhouette === 'seventies' || a.silhouette === 'fifties' ? 0.12 : 0));
    const css = `#${base.getHexString()}`;
    const lace = (ctx: CanvasRenderingContext2D, w: number, h: number, dense: boolean) => {
      ctx.fillStyle = css; ctx.fillRect(0, 0, w, h);
      if (cut.satin && !dense) { for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(${i % 2 ? '255,255,255' : '150,140,120'},0.1)`; ctx.fillRect(random() * w, 0, 3 + random() * 10, h); } return; }
      ctx.strokeStyle = 'rgba(140,125,95,0.4)'; ctx.lineWidth = 1.4;
      for (let y = 8; y < h; y += 16) for (let x = (y / 16) % 2 ? 8 : 16; x < w; x += 16) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 1.5, 0, 7); ctx.stroke(); }
    };
    const skirtMap = paint(512, 256, (ctx) => {
      // Lathe rows run waist to hem, so draw upside down: canvas bottom becomes the hem.
      ctx.translate(0, 256); ctx.scale(1, -1);
      lace(ctx, 512, 256, a.silhouette === 'seventies');
      if (a.silhouette === 'seventies') { ctx.fillStyle = 'rgba(120,105,80,0.3)'; for (const y of [84, 168, 250]) ctx.fillRect(0, y, 512, 6); }
      if (a.mark === 'hem') { const g = ctx.createLinearGradient(0, 150, 0, 256); g.addColorStop(0, 'rgba(90,82,70,0)'); g.addColorStop(1, 'rgba(70,62,52,0.85)'); ctx.fillStyle = g; ctx.fillRect(0, 150, 512, 106); }
      if (a.mark === 'wine') for (const [x, y, r] of [[40, 70, 46], [70, 120, 30], [20, 150, 22], [500, 90, 30]]) { ctx.fillStyle = 'rgba(122,20,48,0.8)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.5, 0.3, 0, 7); ctx.fill(); }
      if (a.mark === 'unfinished') {
        ctx.setLineDash([14, 9]); ctx.strokeStyle = '#2d5fd0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 226); ctx.lineTo(512, 226); ctx.stroke(); ctx.setLineDash([]);
        for (let i = 0; i < 22; i++) { ctx.fillStyle = ['#e0312b', '#f2c21b', '#2aa84a', '#2d5fd0'][i % 4]; ctx.beginPath(); ctx.arc(i * 24 + 8, 238 + (i % 3) * 3, 5, 0, 7); ctx.fill(); }
      }
    });
    const bodiceMap = paint(256, 128, (ctx) => {
      lace(ctx, 256, 128, true);
      if (a.mark === 'wine') { ctx.fillStyle = 'rgba(122,20,48,0.8)'; ctx.beginPath(); ctx.ellipse(18, 100, 20, 30, 0, 0, 7); ctx.fill(); }
    });
    const sheen = cut.satin ? 0.3 : 0.8;
    const skirtCloth = new THREE.MeshStandardMaterial({ map: skirtMap, roughness: sheen, side: THREE.DoubleSide, emissive: base, emissiveIntensity: 0.06 });
    const bodiceCloth = new THREE.MeshStandardMaterial({ map: bodiceMap, roughness: sheen, side: THREE.DoubleSide, emissive: base, emissiveIntensity: 0.06 });
    const plain = new THREE.MeshStandardMaterial({ color: base, roughness: sheen, emissive: base, emissiveIntensity: 0.06 });
    const lathe = (profile: Profile, material: THREE.Material, squash: number, segments = 36, start = 0, sweep = Math.PI * 2) => {
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, d]) => new THREE.Vector2(r, top - d)), segments, start, sweep), material);
      mesh.scale.z = squash; mesh.castShadow = mesh.receiveShadow = true;
      return hang(mesh);
    };

    // The dress, hanging limp and a little flat.
    const hem = cut.skirt.at(-1)!;
    const raw = a.mark === 'unfinished';
    lathe(cut.bodice, bodiceCloth, 0.5);
    const skirt = lathe(cut.skirt, skirtCloth, cut.fullness, 44);
    const sp = skirt.geometry.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      // Soft folds deepen toward the hem.
      const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i), fall = Math.max(0, (top - cut.skirt[0][1] - y) / (hem[1] - cut.skirt[0][1]));
      const angle = Math.atan2(x, z), fold = 1 + Math.sin(angle * 9 + context.seed % 7) * 0.07 * fall;
      sp.setXYZ(i, x * fold, y + (raw ? Math.sin(angle * 5) * 0.03 * fall : 0), z * fold);
    }
    skirt.geometry.computeVertexNormals();
    if (a.silhouette === 'seventies') for (const [r, d] of [[0.2, 0.68], [0.285, 1.07]] as const) { const frill = hang(s.ring(r, 0.016, [0, top - d, 0], plain)); frill.rotation.x = Math.PI / 2; frill.scale.y = cut.fullness; }
    const waist = cut.skirt[0];
    const sash = hang(s.ring(waist[0] + 0.004, 0.012, [0, top - waist[1], 0], a.silhouette === 'fifties' ? s.material('#c9b8d8') : plain)); sash.rotation.x = Math.PI / 2; sash.scale.y = 0.52;
    if (a.silhouette === 'eighties') {
      for (const sx of [-1, 1]) { const loop = hang(s.ball([0.09, 0.055, 0.03], [sx * 0.085, top - waist[1] - 0.01, 0.075], plain, 12)); loop.rotation.z = sx * 0.35; hang(s.box([0.05, 0.3, 0.012], [sx * 0.045, top - waist[1] - 0.18, 0.085], plain)).rotation.z = sx * 0.16; }
      hang(s.ball([0.03, 0.03, 0.025], [0, top - waist[1], 0.085], plain, 10));
    }
    for (const sx of [-1, 1]) {
      const shoulder: P3 = [sx * 0.19, top - 0.045, 0];
      if (cut.sleeves === 'puff') { hang(s.ball([0.125, 0.115, 0.09], [sx * 0.25, top - 0.13, 0], plain, 16)); hang(s.rod([sx * 0.27, top - 0.22, 0], [sx * 0.29, top - 0.52, 0.01], 0.05, plain, 0.035)).scale.z = 0.5; }
      if (cut.sleeves === 'cap') hang(s.ball([0.075, 0.055, 0.06], [sx * 0.2, top - 0.07, 0], plain, 12));
      if (cut.sleeves === 'long') hang(s.rod(shoulder, [sx * 0.25, top - 0.66, 0.01], 0.052, plain, 0.032)).scale.z = 0.5;
      if (cut.sleeves === 'bell') { hang(s.rod(shoulder, [sx * 0.235, top - 0.36, 0.01], 0.05, plain, 0.045)).scale.z = 0.5; hang(s.rod([sx * 0.235, top - 0.36, 0.01], [sx * 0.27, top - 0.72, 0.01], 0.045, bodiceCloth, 0.14)).scale.z = 0.4; }
      if (cut.straps) hang(s.rod([sx * 0.12, top - 0.14, 0.03], [sx * 0.15, top - 0.02, 0], 0.004, plain));
    }

    // The garment bag.
    const bagR = Math.max(0.3, Math.max(...cut.skirt.map(([r]) => r)) * cut.fullness / 0.74 + 0.05);
    const bagProfile: Profile = [[0.03, -0.09], [0.24, -0.02], [Math.min(bagR, 0.32), 0.3], [bagR, Math.max(0.75, hem[1] - 0.5)], [bagR, hem[1] + 0.05], [bagR - 0.03, hem[1] + 0.09]];
    const film = new THREE.MeshPhysicalMaterial({ color: '#e8f3f8', transparent: true, opacity: a.bag === 'zipped' ? mix(0.26, 0.42, mood.wear) : 0.24, roughness: 0.12, depthWrite: false, side: THREE.DoubleSide });
    const glint = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
    const zip = s.material('#f4f4f0', { roughness: 0.6 });
    const bagZ = 0.74;
    const seam = (angle: number, radius: number, material: THREE.Material, lift = 0.006) => {
      const line = hang(s.tube(bagProfile.map(([r, d]): P3 => [Math.sin(angle) * (r + lift), top - d, Math.cos(angle) * (r + lift) * bagZ]), radius, material));
      line.castShadow = false;
      return line;
    };
    if (a.bag !== 'fallen') {
      const gap = a.bag === 'open' ? mix(0.7, 1.0, random()) : 0;
      const cover = lathe(bagProfile, film, bagZ, 40, gap, Math.PI * 2 - gap * 2);
      cover.castShadow = false; cover.renderOrder = 2;
      for (let i = 0; i < 5; i++) seam(1.2 + random() * 3.9, 0.004, glint);
      for (const t of [0.75, -0.9, 0.3]) if (!gap || Math.abs(t) > gap) seam(t, 0.005, glint);
      if (gap) { seam(gap, 0.007, zip); seam(-gap, 0.007, zip); hang(s.box([0.02, 0.035, 0.008], [Math.sin(gap) * bagR, top - hem[1] + 0.02, Math.cos(gap) * bagR * bagZ + 0.01], chrome)); }
      else { seam(0, 0.007, zip); hang(s.box([0.022, 0.04, 0.01], [0, top - 0.04, 0.24 * bagZ + 0.02], chrome)); }
    } else {
      for (let i = 0; i < 6; i++) { const blob = s.ball([mix(0.14, 0.26, random()), mix(0.03, 0.07, random()), mix(0.1, 0.2, random())], [(random() - 0.5) * 0.5, 0.04 + (i % 2) * 0.04, 0.28 + random() * 0.22], film, 12); blob.rotation.y = random() * 3; blob.castShadow = false; }
      s.tube([[-0.2, 0.09, 0.3], [-0.05, 0.11, 0.42], [0.12, 0.08, 0.36], [0.24, 0.06, 0.46]], 0.007, zip);
    }

    // Donation tag on a string from the hanger hook.
    const tag = new THREE.Group();
    const text = { never: 'NEVER WORN', year: cut.year, half: 'HALF PRICE', once: 'WORN ONCE', cheap: '$15 AS IS', blank: '' }[a.tag];
    const card = s.mesh(new THREE.PlaneGeometry(0.21, 0.12), new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, map: paint(256, 146, (ctx) => {
      ctx.fillStyle = '#e9d6a6'; ctx.fillRect(0, 0, 256, 146);
      ctx.strokeStyle = '#8a6d3a'; ctx.lineWidth = 5; ctx.strokeRect(5, 5, 246, 136);
      ctx.fillStyle = '#6b5632'; ctx.beginPath(); ctx.arc(128, 20, 8, 0, 7); ctx.fill();
      ctx.fillStyle = a.tag === 'half' || a.tag === 'cheap' ? '#b3202a' : '#1d2f6b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const words = text.split(' ');
      if (!text) { ctx.strokeStyle = 'rgba(100,80,40,0.5)'; ctx.lineWidth = 2; for (const y of [62, 92, 122]) { ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(226, y); ctx.stroke(); } }
      else if (words.length === 1) { ctx.font = 'italic bold 78px serif'; ctx.fillText(text, 128, 88, 220); }
      else words.reduce<string[]>((rows, word) => { if (rows.length < 2) rows.push(word); else rows[1] += ` ${word}`; return rows; }, []).forEach((row, i) => { ctx.font = 'italic bold 50px serif'; ctx.fillText(row, 128, 62 + i * 50, 220); });
    }) }), [0, -0.075, 0]);
    tag.add(card);
    const tagAt: P3 = [0.1 + random() * 0.06, top - 0.3, Math.min(bagR, 0.32) * bagZ * 0.9 + 0.035];
    tag.position.set(tagAt[0], tagAt[1], tagAt[2]);
    tag.rotation.z = (random() - 0.5) * 0.35; tag.rotation.x = -0.12;
    hang(tag);
    hang(s.rod([0, hookY - 0.04, 0.005], [tagAt[0], tagAt[1] - 0.02, tagAt[2]], 0.0025, s.material('#b8a67a')));

    // What came with it.
    if (a.extras === 'veil' || a.extras === 'both') {
      const tulle = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.42, roughness: 0.9, depthWrite: false, side: THREE.DoubleSide });
      const veil = lathe([[0.03, -0.05], [0.2, 0.05], [0.33, 0.5], [0.44, 1.05], [0.5, 1.25]], tulle, 0.6, 20, Math.PI * 0.55, Math.PI * 1.05);
      veil.position.set(-0.05, 0, -0.03); veil.castShadow = false; veil.renderOrder = 3;
      hang(s.tube([[-0.16, top - 0.02, -0.02], [-0.08, top + 0.045, -0.03], [0.02, top + 0.05, -0.03]], 0.012, s.material('#e9e4d2', { metalness: 0.5, roughness: 0.35 })));
      for (let i = 0; i < 5; i++) hang(s.ball([0.013, 0.013, 0.013], [-0.15 + i * 0.04, top + 0.01 + Math.sin(i * 0.8) * 0.04, 0], s.material('#fffdf4', { roughness: 0.25 }), 8));
    }
    if (a.extras === 'shoes' || a.extras === 'both') {
      const satin = s.material(base.clone().offsetHSL(0, 0, -0.03), { roughness: 0.35 });
      [-1, 1].forEach((sx, index) => {
        const shoe = new THREE.Group();
        const sole = s.box([0.075, 0.012, 0.15], [0, 0.045, 0.02], satin); sole.rotation.x = 0.35;
        shoe.add(sole, s.ball([0.042, 0.03, 0.055], [0, 0.03, 0.075], satin, 12), s.cylinder(0.012, 0.006, 0.085, [0, 0.043, -0.045], satin, 8), s.box([0.07, 0.04, 0.012], [0, 0.085, -0.05], satin));
        const toppled = index === 1 && mood.wear + random() * 0.5 > 0.8;
        shoe.position.set(sx * 0.07 + 0.3, toppled ? 0.035 : 0, 0.34 + index * 0.05);
        shoe.rotation.set(0, -0.5 + sx * 0.18, toppled ? Math.PI / 2 : 0);
        s.root.add(shoe);
      });
    }
    if (a.extras === 'bouquet') {
      const bunch = hang(new THREE.Group());
      const stem = s.cylinder(0.02, 0.035, 0.2, [0, -0.1, 0], s.material('#7a6a3c'), 8);
      const ribbon = s.cylinder(0.026, 0.03, 0.035, [0, -0.07, 0], s.material('#c9b8d8'), 8);
      bunch.add(stem, ribbon);
      for (let i = 0; i < 11; i++) bunch.add(s.ball([0.035, 0.035, 0.035], [(random() - 0.5) * 0.13, -0.22 - random() * 0.08, (random() - 0.5) * 0.1], s.material(['#b98a8a', '#c9a878', '#8a6f5a', '#d9c7a8', '#9a7a8a'][i % 5], { roughness: 1 }), 8));
      bunch.position.set(-0.17, top + 0.02, 0.06);
      bunch.rotation.z = 0.2;
    }

    const rest = (random() - 0.5) * 0.03, rate = mix(0.35, 1.5, mood.energy), reach = mix(0.004, 0.035, mood.energy);
    const tagRest = tag.rotation.z;
    return s.finish({ update: (_dt, time) => { swing.rotation.z = rest + Math.sin(time * rate) * reach; tag.rotation.z = tagRest + Math.sin(time * rate * 1.7 + 1) * reach * 3; } });
  },
});
