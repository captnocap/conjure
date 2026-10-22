import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { MEDIA, MEDIA_COLOUR, TAU, agarPad, dryingCracks, gloss, painted } from './plate';

const CODES = {
  P10: 'P 10: penicillin, the original.',
  AMP: 'AMP 10: ampicillin, everyday and overused.',
  VA30: 'VA 30: vancomycin, the drug of last resort.',
  CIP5: 'CIP 5: ciprofloxacin.',
  TE30: 'TE 30: tetracycline.',
  MET5: 'MET 5: methicillin, the one in the headlines.',
  blank: 'No print at all: a blank control disc.',
} as const;
const LAWNS = {
  cream: 'A matte cream-white lawn, like a skin on milk.',
  yellow: 'A golden-yellow lawn.',
  pink: 'A pinkish-red pigmented lawn.',
  green: 'A grey-green lawn that has stained the gel around it.',
} as const;
const LAWN_COLOUR: Record<keyof typeof LAWNS, string> = { cream: '#e9dfc0', yellow: '#e3b63c', pink: '#d8707a', green: '#9aa86a' };

export default defineThing({
  questions: {
    layout: choice('How many discs, and how are they laid out?', {
      single: 'One disc alone in the middle.',
      pair: 'Two discs close together, their zones running into one another.',
      panel: 'A ring of discs, each a different drug with a different result: a full sensitivity panel.',
      strip: 'A long paper gradient strip with a printed scale, in a teardrop-shaped clearing.',
    }),
    outcome: choice('What happened around the main disc?', {
      wide: 'A wide, crisp clear halo: the drug works.',
      narrow: 'A thin, grudging halo, only just holding.',
      overgrown: 'No halo at all: growth right up to the paper edge. Resistant.',
      breakthrough: 'A wide halo, but with a few resistant colonies growing inside it.',
      hazy: 'A halo with a soft, fuzzy double edge, hard to call either way.',
    }),
    code: choice('What is stamped on the disc?', CODES),
    lawn: choice('What does the bacterial lawn look like?', LAWNS),
    medium: choice('What agar is underneath?', MEDIA),
    note: choice('What has the person reading the plate done?', {
      nothing: 'Nothing yet: the plate is unread.',
      measured: 'Drawn a line across the halo in marker and written its width in millimetres.',
      sensitive: 'Written a large S beside it in blue marker.',
      resistant: 'Written a large R beside it and circled it in red.',
      forceps: 'Is still placing the disc: steel forceps hold it at an angle.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const padR = 24, thickness = 1.6, faceR = padR - thickness * 0.35;
    const lawn = new THREE.Color(LAWN_COLOUR[a.lawn]).offsetHSL(0, (mood.cheer - 0.5) * 0.15, -mood.wear * 0.06);
    const agar = MEDIA_COLOUR[a.medium];

    interface Spot { x: number; z: number; r: number; halo: number; soft: boolean; code: string; rx?: number }
    const haloFor = (outcome: typeof a.outcome, scale = 1) => ({ wide: 11.5, narrow: 5.2, overgrown: 0, breakthrough: 12, hazy: 9.5 }[outcome] * scale * (0.92 + random() * 0.16));
    const others = (Object.keys(CODES) as (keyof typeof CODES)[]).filter((code) => code !== a.code && code !== 'blank');
    const spots: Spot[] = [];
    if (a.layout === 'single') spots.push({ x: 0, z: 0, r: 3.1, halo: haloFor(a.outcome), soft: a.outcome === 'hazy', code: a.code });
    else if (a.layout === 'pair') {
      spots.push({ x: -6.5, z: 1, r: 3, halo: haloFor(a.outcome, 0.85), soft: a.outcome === 'hazy', code: a.code });
      spots.push({ x: 7.5, z: -1.5, r: 3, halo: random() < 0.5 ? 0 : 4 + random() * 6, soft: false, code: others[Math.floor(random() * others.length)] });
    } else if (a.layout === 'panel') {
      const count = Math.round(mix(4, 7, mood.density));
      for (let i = 0; i < count; i++) {
        const angle = Math.PI / 2 + (i / count) * TAU;
        spots.push({ x: Math.cos(angle) * 14.5, z: Math.sin(angle) * 14.5, r: 2.4, halo: i === 0 ? haloFor(a.outcome, 0.55) : random() < 0.3 ? 0 : 3 + random() * 4, soft: i === 0 && a.outcome === 'hazy', code: i === 0 ? a.code : others[(i + Math.floor(random() * 3)) % others.length] });
      }
    } else spots.push({ x: 0, z: -5, r: 2.5, halo: a.outcome === 'overgrown' ? 0 : haloFor(a.outcome, 1.3), rx: a.outcome === 'overgrown' ? 0 : haloFor(a.outcome, 0.75), soft: a.outcome === 'hazy', code: a.code });

    const px = (v: number, size: number) => (0.5 + v / (2 * faceR)) * size;
    const mm = (v: number, size: number) => (v / (2 * faceR)) * size;
    const hero = spots[0];
    const reading = Math.round(hero.halo * 2);
    const map = painted(768, 768, (ctx, w, h) => {
      ctx.fillStyle = agar;
      ctx.fillRect(0, 0, w, h);
      const sheet = document.createElement('canvas');
      sheet.width = w; sheet.height = h;
      const g = sheet.getContext('2d')!;
      g.fillStyle = `#${lawn.getHexString()}`;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5200; i++) {
        g.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.14)' : 'rgba(60,40,10,0.1)';
        g.beginPath();
        g.arc(random() * w, random() * h, 1 + random() * 3.2, 0, TAU);
        g.fill();
      }
      // Swab strokes: the lawn was spread in three directions.
      g.strokeStyle = 'rgba(255,255,255,0.07)';
      g.lineWidth = 5;
      for (let i = 0; i < 46; i++) { const turn = Math.floor(random() * 3) * (Math.PI / 3) + 0.2, y = random() * h * 1.6 - h * 0.3; g.save(); g.translate(w / 2, h / 2); g.rotate(turn); g.beginPath(); g.moveTo(-w, y - h / 2); g.lineTo(w, y - h / 2); g.stroke(); g.restore(); }
      g.globalCompositeOperation = 'destination-out';
      for (const spot of spots) {
        if (spot.halo <= 0) continue;
        const cx = px(spot.x, w), cy = px(spot.z, h), r = mm(spot.halo, w);
        g.save();
        g.translate(cx, cy);
        if (spot.rx !== undefined) g.scale(spot.rx / spot.halo, 1);
        const fade = g.createRadialGradient(0, 0, r * (spot.soft ? 0.55 : 0.93), 0, 0, r);
        fade.addColorStop(0, 'rgba(0,0,0,1)');
        if (spot.soft) fade.addColorStop(0.5, 'rgba(0,0,0,0.55)');
        fade.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = fade;
        g.beginPath();
        // An uneven edge, so the zone is not a compass circle.
        const k1 = 3 + Math.floor(random() * 3), p1 = random() * TAU;
        for (let i = 0; i <= 64; i++) { const t = (i / 64) * TAU, rr = r * (1 + 0.025 * Math.sin(t * k1 + p1)); g.lineTo(Math.cos(t) * rr, Math.sin(t) * rr + (spot.rx !== undefined ? -r * 0.3 : 0)); }
        g.fill();
        g.restore();
      }
      g.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.95;
      ctx.drawImage(sheet, 0, 0);
      ctx.globalAlpha = 1;
      // Marker notes are written on the underside of the dish and show through the gel.
      ctx.lineCap = 'round';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const noteAt = (dx: number, dz: number) => [px(hero.x + dx, w), px(hero.z + dz, h)] as const;
      if (a.note === 'measured' && hero.halo > 0 && hero.rx === undefined) {
        ctx.strokeStyle = ctx.fillStyle = '#16171c';
        ctx.lineWidth = 5;
        const [x0, y0] = noteAt(-hero.halo, -hero.r - 1.4), [x1, y1] = noteAt(hero.halo, -hero.r - 1.4);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1 + (random() - 0.5) * 8);
        ctx.moveTo(x0, y0 - 12); ctx.lineTo(x0, y0 + 12); ctx.moveTo(x1, y1 - 12); ctx.lineTo(x1, y1 + 12); ctx.stroke();
        ctx.font = 'italic bold 44px sans-serif';
        const [tx, ty] = noteAt(0, -hero.r - 4.4);
        ctx.save(); ctx.translate(tx, ty); ctx.rotate(-0.06); ctx.fillText(`${reading} mm`, 0, 0); ctx.restore();
      } else if (a.note === 'measured') {
        ctx.fillStyle = '#16171c';
        ctx.font = 'italic bold 44px sans-serif';
        const [tx, ty] = noteAt(hero.rx === undefined ? 0 : 11, hero.rx === undefined ? -8 : 2);
        ctx.fillText(hero.rx === undefined ? '0 mm' : 'MIC ?', tx, ty);
      } else if (a.note === 'sensitive' || a.note === 'resistant') {
        const red = a.note === 'resistant';
        const d = a.layout === 'panel' ? -6.5 : Math.min(15.5, Math.max(hero.rx ?? hero.halo, hero.r) + 4.5);
        const [tx, ty] = a.layout === 'panel' ? noteAt(0, d) : noteAt(d * 0.82, d * 0.5);
        ctx.fillStyle = ctx.strokeStyle = red ? '#c4141f' : '#1f3fae';
        ctx.font = 'italic bold 92px sans-serif';
        ctx.save(); ctx.translate(tx, ty); ctx.rotate(0.12 * (random() - 0.5) * 4); ctx.fillText(red ? 'R' : 'S', 0, 4);
        if (red) { ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(0, 0, 58, 64, 0.2, 0.3, TAU + 0.1); ctx.stroke(); }
        ctx.restore();
      }
    });
    const top = agarPad(s, padR, a.medium, { thickness, map });
    dryingCracks(s, padR, top, Math.max(0, mood.wear - 0.5) * 1.6);

    const paperTint = new THREE.Color('#fbfaf3').lerp(new THREE.Color('#d9c992'), mood.wear * 0.6);
    const edge = s.material(paperTint, { roughness: 0.95 });
    const face = (code: string) => painted(160, 160, (ctx, w, h) => {
      ctx.fillStyle = `#${paperTint.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) { ctx.fillStyle = 'rgba(120,110,80,0.12)'; ctx.fillRect(random() * w, random() * h, 1 + random() * 5, 1); }
      if (code === 'blank') return;
      const [letters, digits] = [code.replace(/\d+/g, ''), code.replace(/\D+/g, '')];
      ctx.fillStyle = '#1b1c22';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${digits ? 62 : 70}px monospace`;
      ctx.fillText(letters, w / 2, digits ? h * 0.36 : h / 2, w * 0.8);
      if (digits) { ctx.font = 'bold 50px monospace'; ctx.fillText(digits, w / 2, h * 0.7); }
    });

    const forceps = a.note === 'forceps';
    spots.forEach((spot, index) => {
      if (spot.rx !== undefined) {
        // The gradient strip: a ruler of concentrations, read where the teardrop meets the paper.
        const scale = painted(96, 512, (ctx, w, h) => {
          ctx.fillStyle = `#${paperTint.getHexString()}`;
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#1b1c22';
          ctx.textAlign = 'center';
          ctx.font = 'bold 30px monospace';
          ctx.fillText(spot.code.replace(/\d+/g, '') || 'XX', w / 2, 40);
          ctx.font = 'bold 20px monospace';
          ['256', '64', '16', '4', '1', '.25', '.06'].forEach((mark, i) => { const y = 92 + i * 56; ctx.fillText(mark, w / 2, y); ctx.fillRect(8, y + 10, w - 16, 3); });
          ctx.fillStyle = '#c4141f';
          ctx.fillRect(0, h - 26, w, 26);
        });
        const strip = s.mesh(new THREE.BoxGeometry(5, 0.35, 34), [edge, edge, new THREE.MeshStandardMaterial({ map: scale, roughness: 0.9 }), edge, edge, edge] as unknown as THREE.Material, [spot.x, top + 0.2, spot.z + 5]);
        strip.rotation.y = (random() - 0.5) * 0.12;
        return;
      }
      const disc = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(spot.r, spot.r, 0.7, 28), edge);
      const print = new THREE.Mesh(new THREE.CircleGeometry(spot.r * 0.98, 28), new THREE.MeshStandardMaterial({ map: face(spot.code), roughness: 0.92 }));
      print.rotation.x = -Math.PI / 2;
      print.position.y = 0.36;
      body.castShadow = body.receiveShadow = true;
      disc.add(body, print);
      disc.position.set(spot.x, top + 0.36, spot.z);
      disc.rotation.y = (random() - 0.5) * 1.1;
      if (forceps && index === 0) {
        disc.rotation.set(0, 0.5, 0);
        disc.rotateZ(0.42);
        disc.position.y += spot.r * 0.42 + 0.2;
        const steel = s.material('#cfd4d6', { metalness: 0.8, roughness: 0.28 });
        const grip = new THREE.Vector3(spot.x + spot.r * 0.55, disc.position.y + spot.r * 0.25, spot.z + spot.r * 0.3);
        const heel = grip.clone().add(new THREE.Vector3(20, 15, 7));
        for (const side of [-1, 1]) {
          const mid = grip.clone().lerp(heel, 0.55).add(new THREE.Vector3(0, side * 1.7, 0));
          const tine = s.tube([[grip.x, grip.y + side * 0.42, grip.z], mid.toArray() as [number, number, number], heel.toArray() as [number, number, number]], 0.6, steel);
          tine.scale.set(1, 1, 1);
        }
        s.ball([1.1, 1.1, 1.1], heel.toArray() as [number, number, number], steel, 12);
      }
      s.root.add(disc);
    });

    if (a.outcome === 'breakthrough' && hero.halo > 0) {
      const count = Math.round(mix(3, 10, mood.density));
      const points = Array.from({ length: count }, () => {
        const angle = random() * TAU, d = hero.r + 1 + random() * (hero.halo - hero.r - 2) * (hero.rx !== undefined ? 0.5 : 1);
        return { at: [hero.x + Math.cos(angle) * d, top, hero.z + Math.sin(angle) * d] as [number, number, number], size: 0.45 + random() * 0.7 };
      });
      s.scatter(new THREE.SphereGeometry(1, 12, 6, 0, TAU, 0, Math.PI / 2).scale(1, 0.6, 1), gloss(lawn.clone().offsetHSL(0, 0.05, 0.04)), points);
    }

    s.root.scale.setScalar(0.01);
    return s.finish();
  },
});
