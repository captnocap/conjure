import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type P3, type Pupil, ball, box, card, eye, eyeMaterial, furMaterial, group, limb, part, taper, tufts, woodMaterial } from './parts';

type Ear = 'leaf' | 'point' | 'round' | 'fold';
interface Spec { k: number; skull: P3; len: number; r0: number; r1: number; wide: number; drop: number; ear: Ear; eyeR: number; eyeAt: P3; eyeYaw: number; iris: string; pupil: Pupil; fur: string; pale: string }
const SPEC: Record<'deer' | 'fox' | 'bobcat' | 'monkey' | 'pug', Spec> = {
  deer: { k: 1, skull: [0.074, 0.082, 0.098], len: 0.2, r0: 0.056, r1: 0.031, wide: 0.82, drop: 0.075, ear: 'leaf', eyeR: 0.018, eyeAt: [0.062, 0.02, 0.05], eyeYaw: 1.0, iris: '#3a230f', pupil: 'dark', fur: '#9c7d5c', pale: '#e9dfc8' },
  fox: { k: 0.95, skull: [0.062, 0.06, 0.072], len: 0.12, r0: 0.04, r1: 0.016, wide: 0.9, drop: 0.035, ear: 'point', eyeR: 0.0125, eyeAt: [0.04, 0.02, 0.055], eyeYaw: 0.5, iris: '#d07a1c', pupil: 'vslit', fur: '#c2622a', pale: '#f1ebdd' },
  bobcat: { k: 1, skull: [0.072, 0.07, 0.076], len: 0.05, r0: 0.048, r1: 0.036, wide: 1.15, drop: 0.03, ear: 'point', eyeR: 0.0145, eyeAt: [0.036, 0.022, 0.062], eyeYaw: 0.3, iris: '#c2ad3c', pupil: 'vslit', fur: '#a98b63', pale: '#eee4cf' },
  monkey: { k: 1, skull: [0.064, 0.072, 0.074], len: 0.04, r0: 0.042, r1: 0.036, wide: 1.1, drop: 0.05, ear: 'round', eyeR: 0.0125, eyeAt: [0.027, 0.012, 0.064], eyeYaw: 0.1, iris: '#7a4a1a', pupil: 'round', fur: '#5a4634', pale: '#c9a78a' },
  pug: { k: 1, skull: [0.078, 0.072, 0.078], len: 0.022, r0: 0.05, r1: 0.044, wide: 1.25, drop: 0.03, ear: 'fold', eyeR: 0.018, eyeAt: [0.04, 0.012, 0.066], eyeYaw: 0.25, iris: '#3a230f', pupil: 'dark', fur: '#cdb089', pale: '#2a2320' },
};

function referenceTexture(kind: 'photo' | 'sketch' | 'catalogue', spec: Spec, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 192; canvas.height = 240;
  const ctx = canvas.getContext('2d')!;
  const sketch = kind === 'sketch';
  ctx.fillStyle = sketch ? '#f2ecdc' : kind === 'photo' ? '#f7f4ec' : '#d9c24a';
  ctx.fillRect(0, 0, 192, 240);
  if (kind === 'photo') { ctx.fillStyle = ['#7fa0b4', '#6f8f5c', '#b9a27c'][Math.floor(random() * 3)]; ctx.fillRect(12, 12, 168, 180); }
  if (kind === 'catalogue') { ctx.fillStyle = '#a3261f'; ctx.fillRect(0, 0, 192, 44); ctx.fillStyle = '#fff6d8'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center'; ctx.fillText('FORMS No.7', 96, 31); }
  const cx = 96, cy = kind === 'catalogue' ? 140 : 108, fur = sketch ? 'rgba(0,0,0,0)' : spec.fur;
  ctx.lineWidth = 3; ctx.strokeStyle = sketch ? '#3c3a44' : '#1c1612'; ctx.fillStyle = fur;
  const blob = (x: number, y: number, rx: number, ry: number, rot = 0, fill = fur) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
  for (const sx of [-1, 1]) {
    if (spec.ear === 'leaf') blob(cx + sx * 58, cy - 34, 30, 13, sx * -0.5);
    else if (spec.ear === 'round') blob(cx + sx * 44, cy - 6, 13, 16);
    else if (spec.ear === 'fold') blob(cx + sx * 40, cy - 38, 14, 18, sx * 0.6, sketch ? fur : '#3a2e26');
    else { ctx.fillStyle = fur; ctx.beginPath(); ctx.moveTo(cx + sx * 16, cy - 36); ctx.lineTo(cx + sx * 42, cy - 86); ctx.lineTo(cx + sx * 50, cy - 22); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  blob(cx, cy, 46 * spec.wide, 50);
  blob(cx, cy + 26 + spec.len * 160, 24 * spec.wide, 18 + spec.len * 110, 0, sketch ? fur : spec.pale);
  blob(cx, cy + 30 + spec.len * 250, 9, 6, 0, sketch ? fur : '#17120f');
  for (const sx of [-1, 1]) blob(cx + sx * (16 + spec.eyeYaw * 16), cy - 8, 7, 7, 0, sketch ? fur : spec.iris);
  if (sketch) {
    ctx.lineWidth = 1; ctx.strokeStyle = '#b0483c';
    for (const y of [cy - 8, cy + 40]) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(178, y); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx, 12); ctx.lineTo(cx, 228); ctx.stroke();
    ctx.fillStyle = '#3c3a44'; ctx.font = 'italic 15px Georgia, serif'; ctx.fillText(`${(4 + random() * 9).toFixed(1)} in`, 126, 222); ctx.fillText('eye to nose', 14, 222);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    animal: choice('What animal is the form for?', {
      deer: 'A whitetail deer: long tapering muzzle, the bread-and-butter job.',
      fox: 'A fox: small, sharp-nosed and narrow.',
      bobcat: 'A bobcat: short broad cat face with tufted ears.',
      monkey: 'A monkey: flat face, brow ridge and round side ears, an unsettling commission.',
      pug: "A pug: somebody's pet, a round flat face with folded ears.",
    }),
    stage: choice('How far along is the work?', {
      bare: 'Bare foam: a blank pale head with pencil centre lines and empty sockets.',
      eyes: 'Eyes set: glass eyes bedded in brown clay, staring out of blank foam.',
      half: 'Skin half fitted: fur pulled over the neck and crown, pinned along its edge, the face still bare foam.',
      drying: 'Fully skinned and drying: pins round the eyes and lips, cards clipped to the ears.',
    }),
    mouth: noul('Is the mouth open, with a pink jaw set and teeth fitted?'),
    skill: score('How skilled is the hand at work?', ['A first attempt: lopsided, eyes at different heights, lumpy clay', 'Competent everyday work', 'Prize-winning: symmetrical, tidy and exact']),
    reference: choice('What reference is propped beside it?', {
      none: 'None: done from memory.',
      photo: 'A snapshot of the living animal, taped to a wire stand.',
      sketch: 'A pencil sketch with red measuring lines.',
      catalogue: 'A page torn from a supply catalogue of forms.',
    }),
    tag: choice('What does the tag tied to the stand say?', {
      none: 'There is no tag.',
      pet: "A pet's name in careful handwriting.",
      hunter: "A hunter's job number and point count.",
      rush: 'RUSH and a due date in red.',
      unpaid: 'UNCLAIMED, with a year long past.',
    }),
    beside: choice('What sits beside it on the stand?', {
      paint: 'An open pot of paint with a fine brush laid across it.',
      clay: 'A lump of clay and a wire modelling tool.',
      liners: 'A pair of pale plastic ear liners waiting to go in.',
      coffee: 'A mug of coffee gone cold.',
      pins: 'A tomato pincushion bristling with pins.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const root = s.root, wear = mood.wear, spec = SPEC[a.animal], k = spec.k * 1.15;
    const stage = { bare: 0, eyes: 1, half: 2, drying: 3 }[a.stage];
    const rough = 1 - a.skill;
    const foam = s.material(wear > 0.6 ? '#d6c48c' : '#eadfae', { roughness: 0.95 });
    const foamDark = s.material('#c2ad78', { roughness: 1 });
    const hide = furMaterial(random, spec.fur, { dust: wear * 0.4, bald: Math.max(0, wear - 0.7) * (0.6 + rough) });
    const clay = s.material('#8f5f43', { roughness: 0.9 });
    const steel = s.material('#9a9fa2', { metalness: 0.8, roughness: 0.35 });
    const dark = s.material('#17120f', { roughness: 0.4 });
    const pencil = s.material('#4a4750', { roughness: 1 });
    const wood = woodMaterial(random, mood.warmth > 0.5 ? '#9a6b3c' : '#7b5a3c', 0.25 * (1 - wear));

    // Bench stand.
    const BW = 0.36, BD = 0.26;
    box(root, [BW, 0.026, BD], [0, 0.013, 0], wood);
    limb(root, [0, 0.026, -0.06], [0, 0.2, -0.085], 0.008, 0.008, steel);
    part(root, new THREE.CylinderGeometry(0.03, 0.036, 0.012, 16), steel, [0, 0.032, -0.06]);

    // The form itself, turned a little on its post.
    const G = group(root, [0, 0.2, -0.085], [0, (random() - 0.5) * 0.7, 0]);
    const skinOn = stage >= 2, full = stage === 3;
    const body = skinOn ? hide : foam, face = full ? hide : foam;
    const headAt: P3 = [0, 0.13 * k, 0.15 * k];
    part(G, new THREE.CylinderGeometry(0.088 * k, 0.088 * k, 0.014, 20), wood, [0, 0, -0.008 * k], 1, [0.95, 0, 0]);
    taper(G, [[0, 0, 0], [0, 0.06 * k, 0.05 * k], [headAt[0], headAt[1] - 0.03 * k, headAt[2] - 0.045 * k]], 0.082 * k, 0.06 * k, body, 14);
    const H = group(G, headAt, [0.1, rough * (random() - 0.5) * 0.3, rough * (random() - 0.5) * 0.35]);
    H.scale.setScalar(k);
    const [sx0, sy0, sz0] = spec.skull;
    ball(H, [sx0, sy0, sz0], [0, 0, 0], body);
    const tipZ = sz0 * 0.6 + spec.len, tipY = -spec.drop;
    limb(H, [0, -0.012, sz0 * 0.45], [0, tipY, tipZ], spec.r0, spec.r1, face, spec.wide);
    if (a.animal === 'monkey') { ball(H, [0.056, 0.015, 0.022], [0, 0.03, 0.058], body); ball(H, [0.046, 0.05, 0.02], [0, -0.012, 0.062], full ? s.material(spec.pale, { roughness: 0.8 }) : foam); }
    if (a.animal === 'pug') for (let i = 0; i < 3; i++) part(H, new THREE.TorusGeometry(0.03 + i * 0.012, 0.007, 6, 16, Math.PI), face, [0, -0.012 - i * 0.004, sz0 * 0.72 - i * 0.012], [1.2, 1, 1], [0.3, 0, 0]);
    if (a.animal === 'bobcat' || a.animal === 'fox') for (const sx of [-1, 1]) ball(H, [0.03, 0.034, 0.03], [sx * sx0 * 0.78, -0.03, 0.02], body);
    // Lower jaw, perhaps open on a jaw set.
    const J = group(H, [0, -spec.r0 * 0.72, sz0 * 0.25], [a.mouth ? 0.3 : 0.03, 0, 0]);
    const jl = sz0 * 0.38 + spec.len * 0.95;
    limb(J, [0, 0, 0], [0, -spec.drop * 0.55, jl], spec.r0 * 0.62, spec.r1 * 0.66, face, spec.wide * 0.9);
    if (a.mouth) {
      const gum = s.material('#c05a68', { roughness: 0.3 }), tooth = s.material('#f3edd8', { roughness: 0.3 });
      const fall = spec.drop * 0.55, slope = Math.atan2(fall, jl);
      ball(J, [spec.r0 * 0.46 * spec.wide, 0.01, jl * 0.46], [0, -fall * 0.5 + spec.r0 * 0.3, jl * 0.5], gum, [slope, 0, 0]);
      ball(H, [spec.r0 * 0.55 * spec.wide, 0.014, (tipZ - sz0 * 0.3) * 0.5], [0, -spec.r0 * 0.55 - spec.drop * 0.5, (tipZ + sz0 * 0.3) * 0.5], gum, [spec.drop / Math.max(spec.len, 0.08) * 0.6, 0, 0]);
      limb(J, [0, -fall * 0.2 + spec.r0 * 0.36, jl * 0.2], [0, -fall + spec.r1 * 0.75, jl * 1.0], 0.011, 0.009, s.material('#e58c96', { roughness: 0.3 }), 1.5);
      for (const sx of [-1, 1]) {
        part(J, new THREE.ConeGeometry(0.006, 0.024, 7), tooth, [sx * spec.r1 * 0.55 * spec.wide, -spec.drop * 0.5 + 0.03, jl * 0.9]);
        part(H, new THREE.ConeGeometry(0.0065, 0.026, 7), tooth, [sx * spec.r1 * 0.7 * spec.wide, tipY - spec.r1 * 0.9, tipZ - 0.012], 1, [0, 0, Math.PI]);
        for (let i = 0; i < 3; i++) part(J, new THREE.ConeGeometry(0.0045, 0.011, 6), tooth, [sx * spec.r0 * 0.4 * spec.wide, -fall * (0.35 + i * 0.14) + spec.r0 * 0.36, jl * (0.35 + i * 0.14)]);
      }
    }
    // Nose: painted black once the skin is on, a pencil cross before.
    const noseAt: P3 = [0, tipY + spec.r1 * 0.25, tipZ + spec.r1 * 0.8];
    ball(H, [0.02 * spec.wide, 0.014, 0.012], noseAt, full ? s.material(a.animal === 'fox' || a.animal === 'pug' || a.animal === 'deer' ? '#17120f' : '#5a3a34', { roughness: a.beside === 'paint' ? 0.15 : 0.5 }) : foamDark);
    if (!skinOn) {
      // Centre line and eye line, drawn on the foam.
      const top: P3[] = [];
      for (let i = 0; i <= 8; i++) { const t = -0.9 + (i / 8) * 2.1; top.push([0, Math.cos(t) * sy0 * 1.01, Math.sin(t) * sz0 * 1.01]); }
      taper(H, top, 0.0016, 0.0016, pencil, 5);
      limb(H, [0, 0.004, sz0 * 0.75], [0, tipY + spec.r1 * 1.02, tipZ], 0.0016, 0.0016, pencil);
    }

    // Eyes.
    const pinList: { at: THREE.Vector3; dir: THREE.Vector3 }[] = [];
    const pinAt = (parent: THREE.Object3D, p: P3, d: P3) => { root.updateMatrixWorld(true); const at = parent.localToWorld(new THREE.Vector3(...p)); const dir = parent.localToWorld(new THREE.Vector3(p[0] + d[0], p[1] + d[1], p[2] + d[2])).sub(at).normalize(); pinList.push({ at, dir }); };
    const glass = eyeMaterial(spec.iris, spec.pupil, a.animal === 'monkey');
    for (const sx of [-1, 1]) {
      const off = sx === 1 ? rough * (random() - 0.3) * 0.022 : 0;
      const at: P3 = [sx * spec.eyeAt[0], spec.eyeAt[1] + off, spec.eyeAt[2]];
      if (stage === 0) ball(H, [spec.eyeR * 1.1, spec.eyeR * 0.9, spec.eyeR * 0.6], at, foamDark, [0, sx * spec.eyeYaw, 0]);
      else {
        const lump = 1.45 + rough * (0.3 + random() * 0.5);
        if (!full) ball(H, [spec.eyeR * lump, spec.eyeR * lump * (0.85 + rough * random() * 0.3), spec.eyeR * 0.75], [at[0] * 0.97, at[1], at[2] - spec.eyeR * 0.25], clay, [0, sx * spec.eyeYaw, random() * rough]);
        eye(H, at, spec.eyeR, glass, [sx * spec.eyeYaw + (sx === 1 ? rough * (random() - 0.5) * 0.9 : 0), sx === 1 ? rough * (random() - 0.5) * 0.5 : 0]);
        if (full) {
          ball(H, [spec.eyeR * 1.35, spec.eyeR * 0.55, spec.eyeR * 1.1], [at[0] * 0.98, at[1] + spec.eyeR * 0.8, at[2]], hide, [0, sx * spec.eyeYaw, sx * -0.2], 10);
          for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2, c = Math.cos(spec.eyeYaw), sn = Math.sin(spec.eyeYaw) * sx; const ox = Math.cos(t) * spec.eyeR * 1.5; pinAt(H, [at[0] + ox * c, at[1] + Math.sin(t) * spec.eyeR * 1.5, at[2] - ox * sn * 0.6 + spec.eyeR * 0.3], [sn, 0.2 * Math.sin(t), c]); }
        }
      }
      // Ears, or where they will go.
      const E = group(H, spec.ear === 'round' ? [sx * sx0 * 0.98, 0.0, -0.005] : spec.ear === 'leaf' ? [sx * sx0 * 0.85, sy0 * 0.62, -sz0 * 0.4] : [sx * sx0 * 0.62, sy0 * 0.78, -sz0 * 0.1]);
      const liner = s.material('#d8d6cc', { roughness: 0.5 });
      const earMat = full ? hide : liner;
      if (stage < 2) ball(E, [0.014, 0.012, 0.014], [0, 0, 0], foamDark);
      else {
        const tiltZ = spec.ear === 'leaf' ? -sx * 1.05 : spec.ear === 'round' ? -sx * 0.2 : -sx * 0.3;
        E.rotation.set(spec.ear === 'fold' ? 0.5 : 0.05, sx * -0.3, tiltZ + (random() - 0.5) * (0.1 + rough * 0.6));
        let eh = 0.07, ew = 0.03;
        if (spec.ear === 'leaf') { eh = 0.085; ew = 0.036; ball(E, [ew, eh, 0.012], [0, eh, 0], earMat); }
        else if (spec.ear === 'round') { eh = 0.03; ew = 0.028; ball(E, [ew, eh, 0.01], [sx * 0.012, 0.012, 0], earMat); }
        else if (spec.ear === 'fold') { eh = 0.03; ew = 0.03; part(E, new THREE.ConeGeometry(ew, 0.06, 4), full ? s.material('#2e2622') : liner, [0, 0.012, 0.02], [1, 1, 0.35], [1.9, 0, 0]); }
        else { eh = a.animal === 'fox' ? 0.05 : 0.04; ew = 0.034; part(E, new THREE.ConeGeometry(ew, eh * 2, 8), earMat, [0, eh, 0], [1, 1, 0.32]); if (full && a.animal === 'bobcat') part(E, new THREE.ConeGeometry(0.004, 0.03, 4), dark, [0, eh * 2 + 0.012, 0]); }
        if (full && spec.ear !== 'fold') {
          // Cards clipped either side of the ear while it dries.
          const paper = s.material('#e9e2cc', { roughness: 0.95 });
          const cy = spec.ear === 'round' ? 0.012 : eh * 0.9, cw = ew * 1.9, ch = (spec.ear === 'round' ? eh * 2.1 : eh * 1.6);
          for (const dz of [-1, 1]) box(E, [cw, ch, 0.0025], [spec.ear === 'round' ? sx * 0.012 : 0, cy, dz * 0.011], paper, [0, 0, (random() - 0.5) * 0.08]);
          box(E, [0.022, 0.014, 0.03], [spec.ear === 'round' ? sx * 0.012 : 0, cy + ch / 2 - 0.004, 0], dark);
        } else if (stage === 2) for (let i = 0; i < 2; i++) pinAt(E, [(i - 0.5) * 0.02, 0.006, 0.008], [0, -0.3, 1]);
      }
    }
    // The edge of a half-fitted skin: a rolled hem, a hanging flap, a row of pins.
    if (stage === 2) {
      const hem = new THREE.TorusGeometry(spec.r0 * 1.04, 0.008, 6, 20);
      part(H, hem, hide, [0, -0.012, sz0 * 0.62], [spec.wide, 1, 1], [0.25, 0, 0]);
      for (let i = 0; i < 9; i++) { const t = (i / 9) * Math.PI * 2; pinAt(H, [Math.cos(t) * spec.r0 * 1.04 * spec.wide, -0.012 + Math.sin(t) * spec.r0 * 1.04, sz0 * 0.62 + 0.006], [Math.cos(t) * 0.7, Math.sin(t) * 0.7, 0.6]); }
      const side = random() < 0.5 ? -1 : 1;
      ball(H, [0.012, 0.06, 0.045], [side * sx0 * 0.9, -sy0 * 0.75, sz0 * 0.3], hide, [0.3, 0, side * 0.25]);
      ball(H, [0.01, 0.045, 0.035], [-side * sx0 * 0.7, -sy0 * 0.9, sz0 * 0.1], s.material('#e6d3b4', { roughness: 0.8 }), [0.2, 0, -side * 0.3]);
    }
    if (full) {
      for (let i = 0; i < 8; i++) { const t = i / 7, sx = i % 2 ? 1 : -1; pinAt(H, [sx * mix(spec.r0, spec.r1, t) * 0.82 * spec.wide, mix(-spec.r0 * 0.6, tipY - spec.r1 * 0.55, t), mix(sz0 * 0.6, tipZ - 0.005, t)], [sx, -0.3, 0.2]); }
      if (a.animal === 'bobcat') { const ruff: { at: P3; dir: P3; len: number; r: number }[] = []; for (let i = 0; i < 26; i++) { const sx = i % 2 ? 1 : -1; ruff.push({ at: [sx * sx0 * 0.8, -0.02 - random() * 0.04, 0.0 + random() * 0.04], dir: [sx, -0.7, -0.1], len: mix(0.03, 0.06, random()), r: 0.01 }); } tufts(H, hide, ruff); }
      if (wear > 0.6 || rough > 0.7) for (let i = 0; i < 7; i++) box(H, [0.004, 0.012, 0.004], [0.004 * (i % 2 ? 1 : -1), sy0 * (1 - i * 0.012), -0.02 + i * 0.013], s.material('#e8e0c8'), [0.3, 0, (i % 2 ? 1 : -1) * 0.8]);
    }

    // Things on the stand.
    const spot: P3 = [BW * 0.3, 0.026, BD * 0.26];
    const item = (what: typeof a.beside, at: P3) => {
      const T = group(root, at, [0, random() * 6, 0]);
      if (what === 'paint') {
        const colour = ['#1a1614', '#7a4a2a', '#c96a6a', '#e8e0c8'][Math.floor(random() * 4)];
        part(T, new THREE.CylinderGeometry(0.024, 0.022, 0.04, 16), s.material('#cfd6d8', { roughness: 0.15, metalness: 0.2 }), [0, 0.02, 0]);
        part(T, new THREE.CylinderGeometry(0.021, 0.021, 0.004, 16), s.material(colour, { roughness: 0.1 }), [0, 0.04, 0]);
        limb(T, [-0.05, 0.043, 0.01], [0.06, 0.043, -0.008], 0.003, 0.0035, s.material('#b3271f'));
        limb(T, [0.06, 0.043, -0.008], [0.082, 0.043, -0.012], 0.0035, 0.001, s.material(colour));
        if (wear > 0.4) ball(T, [0.012, 0.002, 0.009], [0.04, 0.001, 0.03], s.material(colour, { roughness: 0.1 }));
      } else if (what === 'clay') {
        ball(T, [0.035, 0.022, 0.03], [0, 0.018, 0], clay, [0.2, 0, 0.3], 10);
        ball(T, [0.016, 0.012, 0.014], [0.04, 0.01, 0.02], clay, [0, 0, 0], 8);
        limb(T, [-0.06, 0.006, 0.04], [0.03, 0.006, 0.06], 0.004, 0.004, wood);
        part(T, new THREE.TorusGeometry(0.008, 0.001, 4, 10), steel, [0.04, 0.006, 0.062], 1, [Math.PI / 2, 0, 0]);
      } else if (what === 'liners') {
        const liner = s.material('#d8d6cc', { roughness: 0.5 });
        for (const dx of [-0.03, 0.03]) part(T, new THREE.ConeGeometry(0.026, 0.085, 8), liner, [dx, 0.01, dx * 0.4], [1, 1, 0.35], [Math.PI / 2, 0, dx * 14]);
      } else if (what === 'coffee') {
        part(T, new THREE.CylinderGeometry(0.03, 0.027, 0.07, 18), s.material(mood.cheer > 0.5 ? '#d9b43a' : '#e9e6dc', { roughness: 0.3 }), [0, 0.035, 0]);
        part(T, new THREE.CylinderGeometry(0.026, 0.026, 0.004, 18), s.material('#2e1c12', { roughness: 0.15 }), [0, 0.068, 0]);
        part(T, new THREE.TorusGeometry(0.018, 0.005, 6, 14), s.material('#e9e6dc', { roughness: 0.3 }), [0.034, 0.036, 0]);
      } else {
        ball(T, [0.03, 0.022, 0.03], [0, 0.02, 0], s.material('#c8362b', { roughness: 0.9 }));
        ball(T, [0.008, 0.006, 0.008], [0, 0.042, 0], s.material('#2f7a3a'));
        for (let i = 0; i < 9; i++) { const t = random() * 6.28, r = random() * 0.02; pinAt(T, [Math.cos(t) * r, 0.036, Math.sin(t) * r], [Math.cos(t) * r * 30, 1, Math.sin(t) * r * 30]); }
      }
    };
    item(a.beside, spot);
    if (mood.density > 0.55) {
      const others = (['paint', 'clay', 'liners', 'coffee', 'pins'] as const).filter((w) => w !== a.beside);
      item(others[Math.floor(random() * others.length)], [-BW * 0.32, 0.026, BD * 0.3]);
    }
    if (mood.density > 0.3) { root.updateMatrixWorld(true); for (let i = 0; i < Math.round(mood.density * 8); i++) pinAt(root, [(random() - 0.5) * BW * 0.8, 0.028, (random() - 0.2) * BD * 0.55], [random() - 0.5, 0.08, random() - 0.5]); }

    // Pins: one instanced batch of shafts and one of coloured heads.
    if (pinList.length) {
      const shaft = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.028, 4), steel, pinList.length);
      const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0034, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.3 }), pinList.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
      const hues = ['#e23b2e', '#f4d23a', '#f2f2ee', '#2f6fd0', '#2fa857'];
      pinList.forEach((p, i) => {
        q.setFromUnitVectors(up, p.dir);
        shaft.setMatrixAt(i, m.compose(p.at.clone().addScaledVector(p.dir, 0.006), q, one));
        heads.setMatrixAt(i, m.compose(p.at.clone().addScaledVector(p.dir, 0.02), q, one));
        heads.setColorAt(i, new THREE.Color(hues[Math.floor(random() * hues.length)]));
      });
      shaft.castShadow = heads.castShadow = true;
      root.add(shaft, heads);
    }

    // Reference picture on a wire stand.
    if (a.reference !== 'none') {
      const R = group(root, [-BW * 0.34, 0.026, -BD * 0.3], [0, 0.45 + (random() - 0.5) * 0.3, 0]);
      limb(R, [0, 0, 0], [0, 0.2, -0.01], 0.0025, 0.0025, steel);
      const sheet = new THREE.MeshStandardMaterial({ map: referenceTexture(a.reference, spec, random), roughness: 0.9, side: THREE.DoubleSide });
      part(R, new THREE.PlaneGeometry(0.12, 0.15), sheet, [0, 0.19, 0.004], 1, [-0.12, 0, (random() - 0.5) * (0.1 + rough * 0.3)]);
      const tape = s.material('#d8c98a', { roughness: 0.6 });
      box(R, [0.03, 0.012, 0.001], [0, 0.262, 0.0], tape, [-0.12, 0, 0.2]);
      box(R, [0.014, 0.012, 0.012], [0, 0.265, -0.004], dark);
    }

    // The customer's tag, on a string from the post.
    if (a.tag !== 'none') {
      const year = 1961 + Math.floor(random() * 40), n = 1000 + Math.floor(random() * 8999);
      const pets = ['BISCUIT', 'MR PICKLES', 'DUCHESS', 'BANDIT', 'PEANUT', 'OLD BLUE', 'MITTENS'];
      const lines = { pet: [pets[Math.floor(random() * pets.length)], 'handle w/ care'], hunter: [`No. ${n}`, `${6 + Math.floor(random() * 7)} PT  PAID`], rush: ['RUSH', `DUE ${['FRI', 'MON', 'SAT'][Math.floor(random() * 3)]}`], unpaid: ['UNCLAIMED', `${year}`] }[a.tag];
      const tx = (random() - 0.5) * 0.06, tz = BD * 0.37, turn = (random() - 0.5) * 0.7;
      limb(root, [0.02, 0.03, -0.05], [tx, 0.028, tz - 0.03], 0.0012, 0.0012, s.material('#b8a888'));
      card(root, lines, 0.11, 0.06, [tx, 0.0275, tz], { paper: wear > 0.6 ? '#c9b58a' : '#e9cf9a', ink: a.tag === 'rush' ? '#b3261f' : '#2b2420', font: a.tag === 'pet' ? 'italic' : 'bold', border: a.tag !== 'pet', rot: [-Math.PI / 2, 0, turn] });
    }
    return s.finish();
  },
});
