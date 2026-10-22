import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

/** Radius of the 19-litre bottle at a height above its mouth, mouth downward. */
function bottleRadius(y: number) {
  if (y < 0.05) return 0.03;
  if (y < 0.12) return mix(0.03, 0.135, (y - 0.05) / 0.07) ** 1;
  if (y > 0.44) return Math.max(0, 0.135 * Math.sqrt(Math.max(0, 1 - ((y - 0.44) / 0.035) ** 2)) * 0.98 + 0.002);
  // Two grip ribs.
  const rib = Math.min(Math.abs(y - 0.22), Math.abs(y - 0.33));
  return 0.135 - Math.max(0, 0.012 - rib) * 0.7;
}

export default defineThing({
  questions: {
    body: choice('What kind of cooler is it?', {
      tower: 'A white floor-standing plastic tower, the standard office model.',
      slate: 'A slim dark-grey and silver tower in a smarter reception.',
      retro: 'A rounded green-enamelled cabinet with a chrome band and a single spigot, decades old.',
      counter: 'A squat countertop unit sitting on a two-drawer filing cabinet.',
    }),
    level: score('How much water is left in the bottle?', ['Bone dry; nobody has changed it', 'A last few inches', 'Half', 'A fresh bottle, full to the shoulder']),
    cups: choice('What are the cups like?', {
      cones: 'A clear tube of paper cones, well stocked.',
      lastcones: 'The cone tube nearly empty, two or three left at the bottom.',
      plastic: 'A leaning stack of thin plastic cups on a bracket.',
      none: 'No cups at all, only a handwritten BRING YOUR OWN note.',
    }),
    around: choice('What is around its feet?', {
      nothing: 'Nothing; it stands alone.',
      spares: 'Full spare bottles standing beside it, delivered today.',
      empties: 'A cluster of empty bottles waiting for collection, one on its side.',
      bin: 'A small bin overflowing with crushed cones.',
      puddle: 'A puddle from a leak and a yellow wet-floor sign.',
    }),
    notice: choice('Is anything taped to the front?', {
      none: 'No, the front is clean.',
      order: 'An OUT OF ORDER sheet.',
      hot: 'A CAUTION HOT sticker by the red tap.',
      rota: 'A WHO CHANGED THE BOTTLE rota that nobody fills in.',
    }),
    left: noul('Has someone left a half-drunk cup behind on the drip tray?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const yellowed = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#d9cd9a'), mood.wear * 0.45);
    const counter = a.body === 'counter', retro = a.body === 'retro';
    const shellHex = { tower: '#f1f0ea', slate: '#3a3f45', retro: '#5f8f74', counter: '#eeece4' }[a.body];
    const shell = s.material(a.body === 'slate' || retro ? shellHex : yellowed(shellHex), { roughness: retro ? 0.3 : 0.45, metalness: retro ? 0.2 : 0 });
    const trim = s.material(a.body === 'slate' ? '#c9ced0' : retro ? '#dfe3e4' : '#c9ccc8', { metalness: a.body === 'tower' || counter ? 0.1 : 0.85, roughness: 0.3 });
    const dark = s.material('#1f2326', { roughness: 0.6 });
    const paper = s.material('#fbfaf4', { roughness: 0.9 });
    const W = retro ? 0.38 : 0.32, D = retro ? 0.36 : 0.33;
    const baseY = counter ? 0.72 : 0;
    const bodyH = counter ? 0.46 : retro ? 0.92 : 1.0;
    const topY = baseY + bodyH;

    // ---- Cabinet ---------------------------------------------------------------------------
    if (counter) {
      const cabinet = s.material('#8f9698', { metalness: 0.4, roughness: 0.5 });
      s.box([0.47, 0.7, 0.6], [0, 0.36, -0.08], cabinet);
      s.box([0.5, 0.02, 0.63], [0, 0.71, -0.08], s.material('#6f7577', { metalness: 0.4, roughness: 0.5 }));
      for (const y of [0.2, 0.53]) {
        s.box([0.43, 0.3, 0.012], [0, y, 0.224], s.material('#9aa1a3', { metalness: 0.4, roughness: 0.45 }));
        s.box([0.14, 0.02, 0.02], [0, y + 0.06, 0.238], trim);
        s.box([0.09, 0.045, 0.004], [0, y - 0.03, 0.232], paper);
      }
    }
    s.mesh(new RoundedBoxGeometry(W, bodyH, D, 4, retro ? 0.07 : 0.03), shell, [0, baseY + bodyH / 2, 0]);
    if (!counter) for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.018, 0.022, 0.02, [x * (W / 2 - 0.05), 0.0, z * (D / 2 - 0.05)], dark, 8);
    // Dispensing alcove, taps and drip tray.
    const alcoveY = topY - (counter ? 0.2 : 0.27), front = D / 2;
    s.box([W * 0.78, 0.26, 0.02], [0, alcoveY, front - 0.006], a.body === 'slate' ? trim : dark);
    s.box([W * 0.8, 0.05, 0.035], [0, alcoveY + 0.105, front + 0.012], shell);
    const taps: [number, string][] = retro ? [[0, '#dfe3e4']] : [[-0.06, '#2a7fd0'], [0.06, '#d5362a']];
    for (const [x, hue] of taps) {
      s.cylinder(0.016, 0.016, 0.05, [x, alcoveY + 0.07, front + 0.03], trim, 10).rotation.x = Math.PI / 2;
      s.cylinder(0.011, 0.014, 0.045, [x, alcoveY + 0.045, front + 0.05], trim, 10);
      const paddle = s.mesh(new RoundedBoxGeometry(0.045, 0.06, 0.012, 2, 0.005), s.material(hue, { roughness: 0.4, metalness: retro ? 0.85 : 0 }), [x, alcoveY + 0.02, front + 0.03]);
      paddle.rotation.x = 0.25;
    }
    s.box([W * 0.74, 0.02, 0.11], [0, alcoveY - 0.135, front + 0.045], a.body === 'slate' ? trim : shell);
    for (let i = 0; i < 7; i++) s.box([W * 0.66, 0.004, 0.006], [0, alcoveY - 0.124, front + 0.008 + i * 0.013], dark);
    // Indicator lamps.
    const lamp = (x: number, hue: string, on: boolean) => s.cylinder(0.007, 0.007, 0.006, [x, alcoveY + 0.105, front + 0.031], new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: on ? 1.5 : 0.05 }), 8).rotation.x = Math.PI / 2;
    const dead = a.notice === 'order';
    if (!retro) { lamp(-0.1, '#3ad06a', !dead); lamp(-0.08, '#3a8ae0', !dead && mood.warmth < 0.6); lamp(0.1, '#e0452a', !dead && mood.warmth > 0.3); }
    // Lower front: vent slats, or the retro maker's badge.
    if (!counter) {
      if (retro) {
        s.box([W + 0.006, 0.03, D + 0.006], [0, topY - 0.46, 0], trim);
        s.label('POLAR', 0.16, 0.05, [0, 0.3, front + 0.002], '#f3efe0', '#3d6b55');
      } else {
        for (let i = 0; i < 6; i++) s.box([W * 0.6, 0.008, 0.004], [0, 0.12 + i * 0.03, front + 0.001], a.body === 'slate' ? dark : s.material('#b9bbb5'));
        s.box([W * 0.82, 0.006, 0.004], [0, topY - 0.45, front + 0.001], a.body === 'slate' ? trim : s.material('#b9bbb5'));
      }
    }
    // Collar that receives the bottle.
    s.cylinder(0.11, 0.14, 0.05, [0, topY + 0.025, 0], a.body === 'slate' ? trim : shell, 28);

    // ---- Bottle, water and the bubble ------------------------------------------------------
    const mouthY = topY + 0.02;
    const profile: [number, number][] = [];
    for (let i = 0; i <= 48; i++) { const y = (i / 48) * 0.475; profile.push([bottleRadius(y), y]); }
    const glassTint = retro ? '#bfe6d6' : '#9fd4f0';
    const bottle = s.lathe(profile, new THREE.MeshStandardMaterial({ color: glassTint, roughness: 0.08, transparent: true, opacity: 0.34, side: THREE.DoubleSide }), [0, mouthY, 0]);
    bottle.renderOrder = 2;
    const fill = mix(0.0, 0.43, a.level) * mix(0.9, 1, random());
    const water: [number, number][] = [[0, 0.01]];
    if (fill > 0.02) {
      for (let i = 1; i <= 40; i++) { const y = 0.01 + (i / 40) * (fill - 0.01); water.push([Math.max(0.004, bottleRadius(y) - 0.011), y]); }
      water.push([0, fill]);
      s.lathe(water, new THREE.MeshStandardMaterial({ color: retro ? '#5fc0a8' : '#2f8fdc', roughness: 0.12, emissive: '#1f6fc0', emissiveIntensity: 0.3 }), [0, mouthY, 0]);
    }
    // Paper label band and a handling scuff.
    s.cylinder(0.1365, 0.1365, 0.045, [0, mouthY + 0.275, 0], s.material(retro ? '#f1ead0' : '#f6f6f0', { roughness: 0.6 }), 28);
    s.cylinder(0.137, 0.137, 0.012, [0, mouthY + 0.275, 0], s.material(retro ? '#3d6b55' : '#2a62b8', { roughness: 0.6 }), 28);
    // Bubbles ride up between the water and the bottle wall so they show from any side.
    const bubbleMaterial = new THREE.MeshStandardMaterial({ color: '#f4fbff', emissive: '#cfeaff', emissiveIntensity: 0.5, roughness: 0.1 });
    const bubbles = Array.from({ length: 5 }, (_unused, index) => {
      const mesh = s.ball([0.014, 0.017, 0.014], [0, mouthY, 0], bubbleMaterial, 10);
      mesh.castShadow = false;
      mesh.visible = false;
      return { mesh, angle: random() * Math.PI * 2, lag: index * 0.07 + random() * 0.05, size: 0.6 + random() * 0.8 };
    });
    // A still bubble caught for the print so a single frame shows it too.
    const place = (bubble: (typeof bubbles)[number], t: number) => {
      const y = 0.03 + t * Math.max(0.02, fill - 0.04);
      const r = Math.max(0.006, bottleRadius(y) - 0.006);
      const wobble = Math.sin(t * 9 + bubble.angle) * 0.25;
      bubble.mesh.position.set(Math.sin(bubble.angle + wobble) * r, mouthY + y, Math.cos(bubble.angle + wobble) * r);
      bubble.mesh.scale.setScalar(0.021 * bubble.size * (0.7 + t * 0.6));
      bubble.mesh.visible = fill > 0.08 && t > 0 && t < 1;
    };
    bubbles.forEach((bubble, index) => place(bubble, 0.25 + index * 0.14));

    // ---- Cups ------------------------------------------------------------------------------
    const side = W / 2;
    if (a.cups === 'cones' || a.cups === 'lastcones') {
      const tubeY = topY - (counter ? 0.2 : 0.42), len = counter ? 0.34 : 0.46;
      const x = side + 0.058;
      s.cylinder(0.052, 0.052, len, [x, tubeY, 0.04], new THREE.MeshStandardMaterial({ color: '#e6f3f6', roughness: 0.08, transparent: true, opacity: 0.3 }), 16).renderOrder = 2;
      for (const y of [tubeY + len / 2 - 0.02, tubeY - len / 2 + 0.03]) { s.ring(0.054, 0.006, [x, y, 0.04], trim).rotation.x = Math.PI / 2; s.box([0.05, 0.02, 0.03], [x - 0.03, y, 0.04], trim); }
      const stock = a.cups === 'cones' ? mix(0.6, 0.95, random()) : 0.08;
      s.cylinder(0.045, 0.045, len * stock, [x, tubeY - len / 2 + 0.02 + (len * stock) / 2, 0.04], paper, 14);
      const tip = s.mesh(new THREE.ConeGeometry(0.045, 0.11, 14), paper, [x, tubeY - len / 2 - 0.03, 0.04]);
      tip.rotation.x = Math.PI;
    } else if (a.cups === 'plastic') {
      const x = side + 0.055, y0 = topY - (counter ? 0.3 : 0.5);
      s.box([0.11, 0.012, 0.1], [x - 0.01, y0, 0.04], trim);
      const n = 8 + Math.floor(random() * 14), lean = (random() - 0.5) * 0.004;
      for (let i = 0; i < n; i++) s.cylinder(0.036, 0.026, 0.085, [x + lean * i, y0 + 0.048 + i * 0.011, 0.04 + lean * i * 0.6], new THREE.MeshStandardMaterial({ color: '#f4f8f8', roughness: 0.2, transparent: true, opacity: 0.85 }), 12);
    } else {
      const note = s.label('BRING YOUR OWN CUP', 0.2, 0.09, [side + 0.002, topY - 0.3, 0.02], '#1f3e8a', '#f6ef9a');
      note.rotation.set(0, Math.PI / 2, (random() - 0.5) * 0.15, 'YXZ');
      s.box([0.004, 0.02, 0.05], [side + 0.004, topY - 0.25, 0.02], s.material('#e9e2c4'));
    }

    // ---- Notices ---------------------------------------------------------------------------
    const noteY = counter ? baseY + 0.1 : topY - 0.62;
    if (a.notice === 'order') {
      const sheet = s.label('OUT OF ORDER', counter ? 0.2 : 0.24, counter ? 0.11 : 0.17, [0, counter ? alcoveY + 0.02 : noteY, front + (counter ? 0.075 : 0.004)], '#b3201a', '#fbfaf2');
      sheet.rotation.z = (random() - 0.5) * 0.18;
    } else if (a.notice === 'hot') {
      s.label('CAUTION HOT', 0.13, 0.04, [0.05, alcoveY + 0.155, front + 0.004], '#1a1a1a', '#f2c81a');
    } else if (a.notice === 'rota') {
      const rota = s.mesh(new THREE.PlaneGeometry(0.2, 0.26), new THREE.MeshStandardMaterial({ roughness: 0.9, map: (() => {
        const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 168;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fbfaf2'; ctx.fillRect(0, 0, 128, 168);
        ctx.fillStyle = '#222'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('BOTTLE ROTA', 12, 20);
        ctx.strokeStyle = '#888';
        for (let row = 0; row < 9; row++) { ctx.strokeRect(10, 30 + row * 14, 108, 14); if (row < 2) { ctx.strokeStyle = '#1f3e8a'; ctx.beginPath(); ctx.moveTo(16, 40 + row * 14); ctx.lineTo(50 + random() * 30, 37 + row * 14); ctx.stroke(); ctx.strokeStyle = '#888'; } }
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
      })() }), counter ? [-side - 0.002, baseY + 0.24, 0] : [0, noteY, front + 0.004]);
      if (counter) rota.rotation.y = -Math.PI / 2;
      rota.rotation.z = (random() - 0.5) * 0.1;
    }

    if (a.left) {
      const cx = (random() - 0.5) * 0.12, cy = alcoveY - 0.122, cz = front + 0.05;
      if (a.cups === 'plastic') {
        s.cylinder(0.036, 0.026, 0.085, [cx, cy + 0.043, cz], new THREE.MeshStandardMaterial({ color: '#f4f8f8', roughness: 0.2, transparent: true, opacity: 0.8 }), 12);
        s.cylinder(0.03, 0.026, 0.035, [cx, cy + 0.02, cz], s.material('#7cc4ec', { roughness: 0.1 }), 12);
      } else {
        // A cone cannot stand, so it has been wedged point-down through the grille.
        const cone = s.mesh(new THREE.ConeGeometry(0.04, 0.1, 14), paper, [cx, cy + 0.045, cz]);
        cone.rotation.set(Math.PI + (random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.3);
        s.cylinder(0.03, 0.02, 0.004, [cx, cy + 0.075, cz], s.material('#7cc4ec', { roughness: 0.1 }), 12);
      }
    }

    // ---- Around its feet -------------------------------------------------------------------
    const spare = (x: number, z: number, full: boolean, lying = false) => {
      const g = new THREE.Group();
      s.root.add(g);
      const upright: [number, number][] = profile.map(([r, y]) => [r, 0.475 - y] as [number, number]).reverse();
      const glass = new THREE.Mesh(new THREE.LatheGeometry(upright.map(([r, y]) => new THREE.Vector2(r, y)), 28), new THREE.MeshStandardMaterial({ color: glassTint, roughness: 0.08, transparent: true, opacity: full ? 0.4 : 0.3, side: THREE.DoubleSide }));
      glass.castShadow = true;
      glass.renderOrder = 2;
      g.add(glass);
      if (full) {
        const inner = new THREE.Mesh(new THREE.LatheGeometry(upright.filter(([, y]) => y < 0.4).map(([r, y]) => new THREE.Vector2(Math.max(0.004, r - 0.011), y + 0.004)), 24), new THREE.MeshStandardMaterial({ color: '#2f8fdc', roughness: 0.12, emissive: '#1f6fc0', emissiveIntensity: 0.3 }));
        g.add(inner);
      }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.03, 12), s.material(full ? '#2a62b8' : '#e9e9e4'));
      cap.position.y = 0.47;
      g.add(cap);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1365, 0.1365, 0.04, 24), s.material('#f6f6f0', { roughness: 0.6 }));
      band.position.y = 0.2;
      g.add(band);
      if (lying) { g.rotation.set(0, random() * 6, Math.PI / 2, 'YXZ'); g.position.set(x, 0.136, z); }
      else g.position.set(x, 0, z);
    };
    const out = Math.max(W / 2, counter ? 0.25 : 0) + 0.19;
    if (a.around === 'spares') {
      spare(-out, 0.02, true);
      if (mood.density > 0.35) spare(-out - 0.05, 0.31, true);
      if (mood.density > 0.7) spare(-out - 0.3, 0.12, true);
    } else if (a.around === 'empties') {
      spare(-out, -0.02, false);
      spare(-out - 0.06, 0.3, false);
      spare(-out - 0.42, 0.25, false, true);
    } else if (a.around === 'bin') {
      const x = -out + 0.02, z = 0.08;
      s.mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.28, 18, 1, true), s.material('#4a5054', { roughness: 0.6, side: THREE.DoubleSide }), [x, 0.14, z]);
      s.cylinder(0.1, 0.1, 0.01, [x, 0.005, z], s.material('#4a5054'), 18);
      s.cylinder(0.115, 0.105, 0.2, [x, 0.13, z], s.material('#e9e7de', { roughness: 0.95 }), 14);
      const crushed = 8 + Math.round(mood.density * 12);
      for (let i = 0; i < crushed; i++) {
        const inBin = i < crushed * 0.55, r = inBin ? random() * 0.09 : 0.16 + random() * 0.22, angle = random() * 6;
        const cone = s.mesh(new THREE.ConeGeometry(0.036, 0.09, 6), paper, [x + Math.cos(angle) * r, inBin ? 0.25 + random() * 0.07 : 0.03, z + Math.sin(angle) * r * (inBin ? 1 : 0.8) + (inBin ? 0 : 0.1)]);
        cone.rotation.set(Math.PI / 2 + (random() - 0.5), random() * 6, random() * 3);
        cone.scale.set(1, 1, 0.45 + random() * 0.4);
      }
    } else if (a.around === 'puddle') {
      const wet = new THREE.MeshStandardMaterial({ color: '#6fa9c9', roughness: 0.02, transparent: true, opacity: 0.45, depthWrite: false });
      for (let i = 0; i < 4; i++) {
        const pool = s.mesh(new THREE.CircleGeometry(0.14 + random() * 0.14, 24), wet, [(random() - 0.5) * 0.3, 0.004 + i * 0.0005, D / 2 + 0.12 + random() * 0.22]);
        pool.rotation.x = -Math.PI / 2;
        pool.scale.y = 0.6 + random() * 0.5;
        pool.castShadow = false;
      }
      const yellow = s.material('#f2c81a', { roughness: 0.5 });
      const sx = out + 0.08, sz = D / 2 + 0.25;
      for (const lean of [-1, 1]) {
        const board = s.box([0.26, 0.56, 0.012], [sx, 0.27, sz + lean * 0.09], yellow);
        board.rotation.x = lean * -0.33;
        const mark = s.label('WET FLOOR', 0.22, 0.12, [sx, 0.36, sz + lean * 0.079 + lean * 0.011], '#1a1a1a', '#f2c81a');
        mark.rotation.x = lean * -0.33;
        if (lean < 0) mark.rotation.y = Math.PI;
      }
      s.box([0.1, 0.03, 0.05], [sx, 0.545, sz], yellow);
    }

    // Glug: every few seconds a burst of bubbles climbs the bottle.
    const period = mix(9, 2.2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (fill <= 0.08 || dead) return;
        const cycle = (time % period) / 1.1;
        for (const bubble of bubbles) place(bubble, cycle - bubble.lag);
      },
    });
  },
});
