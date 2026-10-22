import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, disposeTree, mix, score } from '@conjure/kit';

type P = [number, number, number];
const MARKS = {
  recombination: 'z = 1100, the wall of first light itself.',
  dawn: 'z = 20, the first stars.',
  age: '13.8 Gyr, an age instead of a distance.',
  question: 'Only a question mark.',
  nodata: 'NO DATA.',
  here: 'A small arrow and the words YOU ARE HERE.',
  blank: 'Nothing: the last tag is blank.',
} as const;
const MARK_TEXT: Record<keyof typeof MARKS, string> = { recombination: 'z = 1100', dawn: 'z = 20', age: '13.8 Gyr', question: '?', nodata: 'NO DATA', here: '< YOU ARE HERE', blank: ' ' };
const FIGURES = ['0', '0.1', '0.3', '0.5', '1', '2', '3', '6', '10', '20', '50', '1100'];
const STOPS: [number, string][] = [[0, '#3046d8'], [0.14, '#2c8fe8'], [0.28, '#2fb7a8'], [0.4, '#6fc040'], [0.5, '#e8cc30'], [0.6, '#ef8a26'], [0.72, '#d83a26'], [0.84, '#8a1f24'], [0.93, '#3d1620'], [1, '#17131a']];

export default defineThing({
  questions: {
    style: choice('What kind of instrument is it?', {
      brass: 'A brass survey rod with an enamel colour inlay, engraved ticks and capped ends.',
      staff: "A white levelling staff printed with blocky E-shaped graduations, as road surveyors use.",
      pole: 'A round striped ranging pole with a steel spike, its bands coloured instead of red and white.',
      spectrum: 'A flat glassy spectrum strip crossed by dark absorption lines.',
      folding: "A hinged folding carpenter's rule, opened out in a crooked zigzag.",
    }),
    fade: score('How far does the red end fade?', ['Readable to the very tip', 'The last third sinks into dark', 'Half of it is ghost: dim, broken pieces drifting off']),
    mark: choice('What does the last readable mark say?', MARKS),
    pose: choice('How is it set down?', {
      planted: 'Planted upright like a ranging pole, the red end lost overhead.',
      leaning: 'Leaning at a steep angle as if propped against nothing.',
      lying: 'Lying flat, face up, like a ruler on a desk.',
      adrift: 'Adrift at a shallow slant, floating free.',
    }),
    kit: choice('What was left with it?', {
      nothing: 'Nothing. Just the staff.',
      level: "A surveyor's level on a tripod, sighting along it.",
      plumb: 'A plumb line and brass bob hanging from it.',
      tags: 'Paper tags tied on with string at several marks, notes from earlier surveys.',
      chain: "A coiled surveyor's chain and a pair of marker pins at its foot.",
    }),
    ticks: choice('How finely is it divided?', {
      coarse: 'A few bold divisions.',
      fine: 'Close, careful ticks in fives and tens.',
      log: 'Divisions that crowd closer and closer toward the far end, a logarithmic scale.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = 6, flat = a.style !== 'pole';
    const W = { brass: 0.42, staff: 0.5, pole: 0.22, spectrum: 0.8, folding: 0.36 }[a.style], T = a.style === 'spectrum' ? 0.05 : 0.11;
    const fade = clamp01(a.fade);
    const readable = mix(1, 0.52, fade);
    const vivid = mix(0.75, 1, mood.cheer);
    const colourAt = (t: number) => {
      // Fading drags the whole far end toward dark sooner.
      const u = clamp01(t < readable ? t * mix(0.86, 0.7, fade) / readable : mix(0.86, 0.7, fade) + (t - readable) / (1 - readable + 1e-6) * mix(0.14, 0.3, fade));
      let i = 0;
      while (i < STOPS.length - 2 && STOPS[i + 1][0] < u) i++;
      const c = new THREE.Color(STOPS[i][1]).lerp(new THREE.Color(STOPS[i + 1][1]), (u - STOPS[i][0]) / (STOPS[i + 1][0] - STOPS[i][0]));
      const grey = (c.r + c.g + c.b) / 3;
      return c.lerp(new THREE.Color(grey, grey, grey), 1 - vivid);
    };
    const css = (c: THREE.Color) => `#${c.getHexString()}`;
    const tickAt = (i: number, n: number) => (a.ticks === 'log' ? Math.log(1 + 9 * i / n) / Math.log(10) : i / n);
    const divisions = { coarse: 24, fine: 120, log: 90 }[a.ticks];

    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    const Wc = 2048, Hc = 160;
    const strip = (y: number, h: number) => { for (let x = 0; x < Wc; x += 4) { ctx.fillStyle = css(colourAt(x / Wc)); ctx.fillRect(x, y, 4, h); } };
    const ink = a.style === 'brass' ? '#3a2a10' : a.style === 'spectrum' ? '#0d0d12' : '#1d2126';
    if (a.style === 'brass') {
      ctx.fillStyle = '#b08a34'; ctx.fillRect(0, 0, Wc, Hc);
      strip(58, 62);
      ctx.fillStyle = '#7d5f1e'; ctx.fillRect(0, 54, Wc, 4); ctx.fillRect(0, 120, Wc, 4);
    } else if (a.style === 'staff') {
      ctx.fillStyle = '#eeeadc'; ctx.fillRect(0, 0, Wc, Hc);
      // E-blocks: alternating solid blocks and three-fingered combs, each in the colour of its place.
      const blocks = 30;
      for (let i = 0; i < blocks; i++) {
        const x0 = i * Wc / blocks, w = Wc / blocks;
        ctx.fillStyle = css(colourAt((i + 0.5) / blocks));
        if (i % 2 === 0) { ctx.fillRect(x0, 70, w * 0.3, 80); for (let k = 0; k < 3; k++) ctx.fillRect(x0, 70 + k * 32, w * 0.9, 16); }
        else ctx.fillRect(x0 + w * 0.1, 8, w * 0.5, 52);
      }
    } else if (a.style === 'spectrum') {
      strip(0, Hc);
      // Absorption lines, the same pattern repeated further and further toward the red.
      const pattern = [0.02, 0.035, 0.07, 0.074, 0.11];
      for (let rep = 0; rep < 5; rep++) for (const p of pattern) {
        const x = (0.05 + rep * 0.2 + p * (1 + rep * 0.5)) * Wc;
        ctx.fillStyle = 'rgba(8,8,12,0.9)'; ctx.fillRect(x, 0, 3 + rep * 1.5 + random() * 3, Hc);
      }
    } else if (a.style === 'folding') {
      ctx.fillStyle = '#e2c56a'; ctx.fillRect(0, 0, Wc, Hc);
      ctx.globalAlpha = 0.72; strip(0, Hc); ctx.globalAlpha = 1;
    } else {
      strip(0, Hc);
    }
    if (flat) {
      ctx.fillStyle = ink;
      if (a.style !== 'staff') for (let i = 0; i <= divisions; i++) {
        const x = tickAt(i, divisions) * Wc, major = i % 10 === 0, mid = i % 5 === 0;
        if (x / Wc > readable + 0.04) break;
        ctx.fillRect(x - (major ? 2.5 : 1.2), 0, major ? 5 : 2.4, a.ticks === 'coarse' ? 46 : major ? 50 : mid ? 34 : 20);
      }
      ctx.font = 'bold 44px Georgia, serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      FIGURES.forEach((figure, i) => {
        const t = (i + 0.25) / FIGURES.length;
        if (t > readable) return;
        const x = t * Wc + 8, y = a.style === 'brass' ? 88 : a.style === 'staff' ? 36 : 104;
        if (a.style === 'staff' && i % 2 === 0) return;
        ctx.fillStyle = a.style === 'brass' || a.style === 'spectrum' ? '#f4ead0' : ink;
        ctx.fillText(figure, x, y);
      });
      // Past the last readable mark the figures give out and darkness covers the face.
      const g = ctx.createLinearGradient(readable * Wc, 0, Math.min(Wc, (readable + 0.22) * Wc), 0);
      g.addColorStop(0, 'rgba(20,16,22,0)'); g.addColorStop(1, `rgba(20,16,22,${mix(0.15, 0.92, fade)})`);
      ctx.fillStyle = g; ctx.fillRect(readable * Wc, 0, Wc, Hc);
      ctx.strokeStyle = `rgba(245,240,225,${mood.wear * 0.5})`; ctx.lineWidth = 1.5;
      for (let i = 0; i < mood.wear * 90; i++) { const x = random() * Wc, y = random() * Hc; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 70, y + (random() - 0.5) * 14); ctx.stroke(); }
    }
    const master = new THREE.CanvasTexture(canvas);
    master.colorSpace = THREE.SRGBColorSpace;
    master.anisotropy = 8;
    const slice = (from: number, to: number) => {
      const texture = master.clone();
      texture.repeat.x = to - from; texture.offset.x = from; texture.needsUpdate = true;
      return texture;
    };

    const rule = new THREE.Group();
    const edgePaint = s.material({ brass: '#a07a2c', staff: '#d9d4c2', pole: '#888888', spectrum: '#20222a', folding: '#b99a48' }[a.style], { metalness: a.style === 'brass' ? 0.7 : 0.05, roughness: a.style === 'brass' ? 0.4 : 0.7 });
    const brass = s.material('#c39a3c', { metalness: 0.8, roughness: 0.35 });
    const steel = s.material('#8b9197', { metalness: 0.8, roughness: 0.4 });
    const drifting: { part: THREE.Object3D; base: THREE.Vector3; phase: number }[] = [];
    // A length of the staff from t0 to t1; ghosts are see-through and may wander.
    const piece = (t0: number, t1: number, ghost: number, parent: THREE.Object3D = rule, local = false) => {
      const length = (t1 - t0) * L;
      const face = new THREE.MeshStandardMaterial({ map: slice(t0, t1), roughness: a.style === 'spectrum' ? 0.25 : 0.6, metalness: a.style === 'brass' ? 0.35 : 0, transparent: ghost > 0, opacity: 1 - ghost * 0.6, emissive: '#ffffff', emissiveMap: null, emissiveIntensity: 0 });
      const side = ghost > 0 ? new THREE.MeshStandardMaterial({ color: '#2a2228', transparent: true, opacity: 1 - ghost * 0.6 }) : edgePaint;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(length, W, T), [side, side, side, side, face, face]);
      bar.castShadow = true;
      bar.position.x = local ? length / 2 : (t0 + t1) / 2 * L;
      parent.add(bar);
      return bar;
    };

    const solidEnd = fade > 0.55 ? readable + 0.06 : 1;
    if (a.style === 'pole') {
      const bands = 16;
      for (let i = 0; i < bands; i++) {
        const t0 = i / bands, t1 = (i + 1) / bands, ghost = t0 >= solidEnd ? clamp01((t0 - solidEnd) / (1 - solidEnd) + 0.3) : 0;
        const colour = i % 2 ? colourAt((t0 + t1) / 2).lerp(new THREE.Color('#f1ecdd'), t0 < readable ? 0.82 : 0.2) : colourAt((t0 + t1) / 2);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 2, (t1 - t0) * L * (ghost ? 0.8 : 1.001), 20), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.55, transparent: ghost > 0, opacity: 1 - ghost * 0.6 }));
        band.rotation.z = -Math.PI / 2;
        band.position.set((t0 + t1) / 2 * L, ghost ? (random() - 0.5) * ghost * 0.9 : 0, ghost ? (random() - 0.5) * ghost * 0.6 : 0);
        if (ghost) { band.rotation.y = (random() - 0.5) * ghost; drifting.push({ part: band, base: band.position.clone(), phase: random() * 6 }); }
        band.castShadow = true;
        rule.add(band);
      }
      const shoe = new THREE.Mesh(new THREE.ConeGeometry(W / 2, 0.5, 16), steel);
      shoe.rotation.z = Math.PI / 2; shoe.position.x = -0.25; shoe.castShadow = true;
      rule.add(shoe);
    } else if (a.style === 'folding') {
      // Hinged lengths, each opened to a slightly different angle.
      const leaves = 6;
      let joint = new THREE.Group();
      rule.add(joint);
      for (let i = 0; i < leaves; i++) {
        const t0 = i / leaves, t1 = (i + 1) / leaves, ghost = t0 >= solidEnd - 0.01 ? clamp01((t0 - solidEnd) / (1 - solidEnd) + 0.4) : 0;
        const bar = piece(t0, t1, ghost, joint, true);
        bar.position.z = (i % 2) * T * 1.05;
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, T * 2.3, 12), brass);
        pin.rotation.x = Math.PI / 2; pin.position.set(L / leaves, 0, T * 0.5);
        joint.add(pin);
        const next = new THREE.Group();
        next.position.x = L / leaves;
        next.rotation.z = (i % 2 ? 1 : -1) * mix(0.25, 0.75, random()) * (i === 0 ? 0.6 : 1);
        joint.add(next);
        joint = next;
      }
      rule.rotation.z = 0.2;
    } else {
      piece(0, solidEnd, 0);
      if (solidEnd < 1) {
        const n = 4;
        for (let i = 0; i < n; i++) {
          const t0 = solidEnd + (1 - solidEnd) * (i + 0.18) / n, t1 = solidEnd + (1 - solidEnd) * (i + 0.86 - i * 0.08) / n;
          const bar = piece(t0, t1, (i + 1) / n);
          bar.position.y = (random() - 0.5) * 0.35 * (i + 1);
          bar.position.z = (random() - 0.5) * 0.3 * (i + 1);
          bar.rotation.set((random() - 0.5) * 0.3 * i, (random() - 0.5) * 0.2 * i, (random() - 0.5) * 0.25 * (i + 1));
          drifting.push({ part: bar, base: bar.position.clone(), phase: random() * 6 });
        }
      }
      if (a.style === 'brass') {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.2, W * 1.12, T * 1.5), brass);
        cap.position.x = 0.02; cap.castShadow = true; rule.add(cap);
        for (let i = 1; i < 4; i++) { const collar = new THREE.Mesh(new THREE.BoxGeometry(0.06, W * 1.06, T * 1.3), brass); collar.position.x = i * L * solidEnd / 4; rule.add(collar); }
      }
      if (a.style === 'staff') {
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, W * 1.05, T * 1.4), steel);
        shoe.position.x = -0.03; rule.add(shoe);
        const rib = new THREE.Mesh(new THREE.BoxGeometry(L * solidEnd, W * 0.25, T), s.material('#d9d4c2'));
        rib.position.set(L * solidEnd / 2, 0, -T); rule.add(rib);
      }
    }

    // Pose the staff, then hang everything else off the posed positions so text stays level.
    const posed = new THREE.Group();
    posed.add(rule);
    s.root.add(posed);
    const angle = { planted: Math.PI / 2 - 0.03, leaning: 1.02, lying: 0, adrift: 0.33 }[a.pose] + (random() - 0.5) * 0.05;
    if (a.pose === 'lying') { posed.rotation.x = -Math.PI / 2 + 0.1; posed.rotation.y = 0.12; }
    else posed.rotation.z = angle;
    posed.updateMatrixWorld(true);
    const along = (t: number, lift = 0): P => {
      const p = new THREE.Vector3(t * L, lift, 0).applyMatrix4(posed.matrixWorld);
      return [p.x, p.y, p.z];
    };

    // The last readable mark, on a tag or plate at the point where the figures give out.
    const at = along(Math.min(readable, 0.97));
    const tagW = Math.max(0.75, MARK_TEXT[a.mark].length * 0.14), tagH = 0.36;
    const brassTag = a.style === 'brass';
    const side = a.pose === 'lying' ? 0 : 1;
    const tagAt: P = a.pose === 'lying' ? [at[0], 0.75, at[2] - 0.5] : [at[0] + side * (tagW / 2 + 0.45), at[1] - 0.1, at[2] + T + 0.02];
    const tag = s.label(MARK_TEXT[a.mark], tagW, tagH, tagAt, brassTag ? '#33240c' : '#27313a', brassTag ? '#c9a548' : mood.wear > 0.6 ? '#d8cfb4' : '#f1ead6');
    tag.rotation.z = (random() - 0.5) * 0.16;
    const back = s.box([tagW + 0.05, tagH + 0.05, 0.02], [tagAt[0], tagAt[1], tagAt[2] - 0.012], brassTag ? brass : s.material('#8a7f68'));
    back.rotation.z = tag.rotation.z;
    if (a.pose === 'lying') s.rod([tagAt[0], 0, tagAt[2]], [tagAt[0], tagAt[1], tagAt[2] - 0.02], 0.02, steel);
    else s.rod([at[0], at[1], at[2] + T], [tagAt[0] - tagW / 2, tagAt[1] + tagH * 0.3, tagAt[2]], 0.012, s.material('#5a4a36'));

    const foot = along(0);
    const baseY = a.pose === 'lying' ? 0 : Math.min(foot[1], along(1)[1]) - (a.pose === 'adrift' ? 0.9 : 0);
    if (a.kit === 'level') {
      const x = foot[0] - 1.5, top = baseY + 1.5;
      const wood = s.material('#b98a4a');
      for (let i = 0; i < 3; i++) { const ang = i * 2.094 + 0.5; s.rod([x + Math.cos(ang) * 0.6, baseY, Math.sin(ang) * 0.6 + 0.3], [x, top, 0.3], 0.035, wood); }
      s.cylinder(0.14, 0.14, 0.08, [x, top + 0.04, 0.3], brass, 16);
      const scope = s.cylinder(0.07, 0.09, 0.62, [x + 0.05, top + 0.2, 0.3], s.material('#2f4f5e', { metalness: 0.4 }), 14);
      scope.rotation.z = -Math.PI / 2 + (a.pose === 'planted' || a.pose === 'leaning' ? 0.5 : 0.1);
      s.box([0.2, 0.05, 0.05], [x, top + 0.31, 0.3], brass);
    }
    if (a.kit === 'plumb') {
      const t = a.pose === 'lying' ? 0.2 : mix(0.45, 0.7, random());
      const from = along(t, a.pose === 'lying' ? 0 : -W / 2);
      const hang: P = a.pose === 'lying' ? [from[0], 1.6, from[2] + 0.5] : from;
      const drop = Math.max(0.7, hang[1] - baseY - 0.25);
      if (a.pose === 'lying') s.rod([hang[0], 0, hang[2]], hang, 0.025, steel);
      s.rod(hang, [hang[0], hang[1] - drop, hang[2]], 0.008, s.material('#40382c'));
      s.lathe([[0, -0.22], [0.07, -0.04], [0.085, 0.02], [0.05, 0.09], [0, 0.1]], brass, [hang[0], hang[1] - drop, hang[2]]);
    }
    if (a.kit === 'tags') {
      const notes = ['z=0.5', 'z=2', 'CHECK', 'z=6', 'AGAIN?'];
      const n = 3 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) {
        const t = mix(0.08, readable - 0.1, (i + random() * 0.6) / n);
        const p = along(t, a.pose === 'lying' ? 0 : -W / 2), drop = 0.3 + random() * 0.3;
        const y = a.pose === 'lying' ? 0.35 : p[1] - drop;
        const z = a.pose === 'lying' ? p[2] + 0.45 : p[2] + T;
        s.rod([p[0], p[1], p[2] + T / 2], [p[0], y + 0.13, z], 0.007, s.material('#6b5a40'));
        const note = s.label(notes[i % notes.length], 0.42, 0.24, [p[0], y, z + 0.01], '#3a3f48', i % 2 ? '#e9dfc2' : '#d9e2e6');
        note.rotation.z = (random() - 0.5) * 0.5;
      }
    }
    if (a.kit === 'chain') {
      const x = foot[0] - (a.pose === 'lying' ? 0.2 : 1), z = a.pose === 'lying' ? 1.1 : 0.4;
      for (let i = 0; i < 5; i++) { const loop = s.ring(0.34 - i * 0.03, 0.022, [x + (random() - 0.5) * 0.08, baseY + 0.03 + i * 0.035, z + (random() - 0.5) * 0.08], steel); loop.rotation.x = Math.PI / 2; }
      for (let i = 0; i < 2; i++) {
        const px = x + 0.6 + i * 0.35;
        s.rod([px, baseY, z], [px + 0.06, baseY + 0.8, z], 0.016, steel);
        const eye = s.ring(0.05, 0.014, [px + 0.065, baseY + 0.85, z], steel); eye.rotation.y = 0.3;
        s.box([0.16, 0.11, 0.008], [px + 0.15, baseY + 0.72, z], s.material(i ? '#d83a26' : '#2c8fe8'));
      }
    }

    const built = s.finish();
    const energy = mood.energy;
    return {
      object: built.object,
      update(_dt, time) {
        for (const { part, base, phase } of drifting) {
          part.position.y = base.y + Math.sin(time * mix(0.2, 1.4, energy) + phase) * mix(0.01, 0.07, energy);
          part.rotation.x += 0.001 * energy;
        }
      },
      dispose: () => { master.dispose(); disposeTree(built.object); },
    };
  },
});
