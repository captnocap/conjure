import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type V, add, ball, box, cyl, decal, group, hazard, paint, rod, stencil, tube } from './h';

export default defineThing({
  questions: {
    levels: choice('How tall is the tower?', {
      one: 'A single raised deck, head height, for belly and knee work.',
      two: 'Two decks, as tall as a house, the usual hangar tower.',
      three: 'Three decks, a swaying spire of scaffold for shoulder and head work.',
    }),
    paint: choice('What colour is the steelwork?', {
      yellow: 'Chipped safety yellow.',
      galvanised: 'Bare galvanised grey tube.',
      oxide: 'Red oxide primer, never top-coated.',
      blue: 'Navy-issue blue with white rail tops.',
    }),
    left: choice('What was left on the work platform?', {
      tools: 'An open red toolbox with a big wrench and a torque gun beside it.',
      lunch: 'A lunch pail, a thermos and a half-eaten sandwich on its paper.',
      radio: 'A battered radio with its aerial up, still playing to nobody.',
      jacket: 'A work jacket hung over the rail with a hard hat on the post.',
      nothing: 'Nothing. Swept clean and signed off.',
    }),
    swing: score('Where is the swing-out platform?', ['Folded flat against the tower', 'Swung half out', 'Reached fully out over the job']),
    cables: choice('What hangs from it?', {
      power: 'Fat black power cables looping down to a coil on the floor.',
      hose: 'A yellow air hose on a side reel, trailing across the floor.',
      festoon: 'A string of caged work bulbs along the rails.',
      chain: 'A chain hoist with a hook dangling from a jib at the top.',
      bare: 'Nothing; the tower stands clean.',
    }),
    clipboard: choice('What is on the clipboard hung on the rail?', {
      checklist: 'A checklist, most boxes ticked.',
      redtag: 'A red DO NOT OPERATE tag.',
      signed: 'A sheet with one big signature and a stamp: released for service.',
      blank: 'A blank sheet; nobody started the paperwork.',
    }),
    lamp: noul('Is the floodlight at the top switched on?'),
    braced: noul('Are the outriggers down and the wheels chocked?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = s.root;
    const n = { one: 1, two: 2, three: 3 }[a.levels];
    const LH = 2.1, W = 2.3, D = 1.6;
    const top = n * LH + 0.35;
    const tone = { yellow: '#dba91c', galvanised: '#a3aaac', oxide: '#9a4a36', blue: '#2f4f78' }[a.paint];
    const steel = s.material(tone, { metalness: a.paint === 'galvanised' ? 0.7 : 0.2, roughness: 0.55 });
    const railTop = a.paint === 'blue' ? s.material('#e8e8e2') : steel;
    const deck = s.material('#5d6062', { metalness: 0.5, roughness: 0.7 });
    const dark = s.material('#232527', { roughness: 0.8 });
    const rubber = s.material('#1c1c1c', { roughness: 0.95 });
    const hx = W / 2, hz = D / 2;

    // Corner posts, with rails and bracing at each level.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(R, [sx * hx, 0.3, sz * hz], [sx * hx, top + 1.05, sz * hz], 0.05, steel);
    for (let l = 0; l <= n; l++) {
      const y = l * LH + 0.35;
      for (const sz of [-1, 1]) rod(R, [-hx, y, sz * hz], [hx, y, sz * hz], 0.045, steel);
      for (const sx of [-1, 1]) rod(R, [sx * hx, y, -hz], [sx * hx, y, hz], 0.045, steel);
      if (l < n) {
        const flip = l % 2 ? -1 : 1;
        rod(R, [-hx * flip, y, -hz], [hx * flip, y + LH, -hz], 0.03, steel);
        rod(R, [-hx, y, -hz * flip], [-hx, y + LH, hz * flip], 0.03, steel);
      }
      if (l > 0) {
        // Deck over the back strip, plus the full top deck; guard rails around it.
        const full = l === n;
        box(R, [W + 0.06, 0.06, full ? D + 0.06 : D * 0.5], [0, y + 0.03, full ? 0 : -D * 0.25], deck);
        for (const h of [0.55, 1.05]) {
          rod(R, [-hx, y + h, -hz], [hx, y + h, -hz], 0.03, h > 1 ? railTop : steel);
          rod(R, [-hx, y + h, -hz], [-hx, y + h, hz], 0.03, h > 1 ? railTop : steel);
          if (!full) rod(R, [hx, y + h, -hz], [hx, y + h, hz], 0.03, h > 1 ? railTop : steel);
          if (full) rod(R, [-hx, y + h, hz], [hx * 0.1, y + h, hz], 0.03, h > 1 ? railTop : steel);
        }
        box(R, [W, 0.14, 0.02], [0, y + 0.13, -hz], steel);
      }
      // Stairs in the front strip, switching direction every flight.
      if (l < n) {
        const dir = l % 2 ? -1 : 1;
        const x0 = -dir * (hx - 0.15), x1 = dir * (hx - 0.45), z = hz * 0.5;
        for (const side of [-1, 1]) rod(R, [x0, y - 0.05, z + side * 0.33], [x1, y + LH - 0.05, z + side * 0.33], 0.035, steel);
        const steps = 8;
        for (let i = 1; i <= steps; i++) box(R, [0.24, 0.035, 0.62], [mix(x0, x1, i / (steps + 1)), y + (LH * i) / (steps + 1), z], deck);
        rod(R, [x0, y + 0.9, z + 0.36], [x1, y + LH + 0.9, z + 0.36], 0.025, railTop);
        rod(R, [x0, y, z + 0.36], [x0, y + 0.9, z + 0.36], 0.025, steel);
      }
    }

    // Rolling base: hazard-striped skirt, four casters, optional outriggers and chocks.
    const stripes = hazard();
    stripes.wrapS = THREE.RepeatWrapping;
    stripes.repeat.set(2, 1);
    const skirt = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.7 });
    for (const sz of [-1, 1]) box(R, [W + 0.2, 0.22, 0.08], [0, 0.42, sz * (hz + 0.02)], skirt);
    for (const sx of [-1, 1]) box(R, [0.08, 0.22, D + 0.12], [sx * (hx + 0.02), 0.42, 0], skirt);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * hx, z = sz * hz;
      box(R, [0.12, 0.12, 0.2], [x, 0.3, z], dark);
      cyl(R, 0.16, 0.16, 0.1, [x, 0.16, z + 0.03], rubber, [0, 0, Math.PI / 2], 14);
      cyl(R, 0.07, 0.07, 0.12, [x, 0.16, z + 0.03], s.material('#c9c9c2', { metalness: 0.6 }), [0, 0, Math.PI / 2], 10);
      if (a.braced) {
        rod(R, [x, 1.2, z], [x + sx * 0.75, 0.1, z + sz * 0.6], 0.04, steel);
        cyl(R, 0.14, 0.16, 0.06, [x + sx * 0.75, 0.03, z + sz * 0.6], dark, [0, 0, 0], 12);
        if (sz === 1) box(R, [0.14, 0.14, 0.2], [x, 0.07, z + 0.27], s.material('#c8321f'), [0.5, 0, 0]);
      }
    }

    // The swing-out platform: hinged on the front-right post at the top deck.
    const angle = mix(Math.PI / 2, -Math.PI / 2.6, a.swing);
    const arm = group(R, [hx, top, hz], [0, angle, 0]);
    const PL = 1.9, PW = 0.95;
    box(arm, [PL, 0.07, PW], [PL / 2 + 0.05, 0.03, PW / 2], deck);
    const edge = new THREE.MeshStandardMaterial({ map: hazard('#e8b21c', '#1d1d1b', 10), roughness: 0.7 });
    box(arm, [PL, 0.12, 0.03], [PL / 2 + 0.05, 0.02, PW + 0.01], edge);
    box(arm, [0.03, 0.12, PW], [PL + 0.06, 0.02, PW / 2], edge);
    for (const px of [0.05, PL / 2, PL]) rod(arm, [px, 0, PW], [px, 1.05, PW], 0.03, steel);
    rod(arm, [PL, 0, 0.02], [PL, 1.05, 0.02], 0.03, steel);
    for (const h of [0.55, 1.05]) {
      rod(arm, [0.05, h, PW], [PL, h, PW], 0.03, h > 1 ? railTop : steel);
      rod(arm, [PL, h, 0.02], [PL, h, PW], 0.03, h > 1 ? railTop : steel);
    }
    rod(arm, [0.02, -1.3, 0.05], [PL * 0.8, -0.03, PW * 0.5], 0.035, steel);
    cyl(R, 0.08, 0.08, 0.35, [hx, top - 0.05, hz], dark, [0, 0, 0], 10);

    // Whatever was left up there.
    const cx = PL * 0.55, cz = PW * 0.5;
    if (a.left === 'tools') {
      const redBox = s.material('#c22a1e', { roughness: 0.45 });
      box(arm, [0.62, 0.26, 0.32], [cx, 0.2, cz], redBox);
      box(arm, [0.62, 0.05, 0.32], [cx, 0.42, cz - 0.2], redBox, [-1.1, 0, 0]);
      box(arm, [0.56, 0.04, 0.26], [cx, 0.32, cz], dark);
      const chrome = s.material('#d5d9db', { metalness: 0.9, roughness: 0.25 });
      rod(arm, [cx - 0.75, 0.09, cz - 0.2], [cx - 0.45, 0.09, cz + 0.3], 0.03, chrome);
      add(arm, new THREE.TorusGeometry(0.07, 0.025, 6, 12, 4.6), chrome, [cx - 0.42, 0.09, cz + 0.36], [Math.PI / 2, 0, 0.5]);
      box(arm, [0.12, 0.16, 0.36], [cx + 0.55, 0.15, cz + 0.05], s.material('#e0a11b'), [0, 0.5, 0]);
      cyl(arm, 0.03, 0.03, 0.2, [cx + 0.66, 0.15, cz + 0.27], chrome, [Math.PI / 2, 0, -0.5], 8);
    } else if (a.left === 'lunch') {
      box(arm, [0.4, 0.26, 0.22], [cx, 0.2, cz], s.material('#3f6fb0', { metalness: 0.4 }));
      add(arm, new THREE.TorusGeometry(0.11, 0.015, 6, 12, Math.PI), dark, [cx, 0.33, cz]);
      cyl(arm, 0.065, 0.065, 0.4, [cx + 0.4, 0.27, cz - 0.1], s.material('#3e7a4e', { metalness: 0.5 }), [0, 0, 0], 12);
      cyl(arm, 0.07, 0.07, 0.08, [cx + 0.4, 0.5, cz - 0.1], s.material('#d8d8d0', { metalness: 0.7 }), [0, 0, 0], 12);
      box(arm, [0.34, 0.01, 0.34], [cx - 0.5, 0.075, cz + 0.05], s.material('#f1ecd9'), [0, 0.4, 0]);
      box(arm, [0.17, 0.07, 0.17], [cx - 0.5, 0.115, cz + 0.05], s.material('#d9b56f'), [0, 0.9, 0]);
      ball(arm, [0.07, 0.07, 0.07], [cx - 0.3, 0.14, cz + 0.22], s.material('#c7392b'), 10);
    } else if (a.left === 'radio') {
      const on = new THREE.Color().setHSL(mix(0.5, 0.08, mood.warmth), 0.8, 0.6);
      box(arm, [0.56, 0.34, 0.2], [cx, 0.24, cz], s.material('#56616a', { roughness: 0.5 }));
      cyl(arm, 0.11, 0.11, 0.02, [cx - 0.13, 0.24, cz + 0.105], dark, [Math.PI / 2, 0, 0], 14);
      box(arm, [0.2, 0.09, 0.02], [cx + 0.14, 0.3, cz + 0.105], new THREE.MeshStandardMaterial({ color: on, emissive: on, emissiveIntensity: 1.2 }));
      rod(arm, [cx + 0.24, 0.4, cz], [cx + 0.5, 1.25, cz - 0.1], 0.012, s.material('#d5d9db', { metalness: 0.9 }));
      add(arm, new THREE.TorusGeometry(0.2, 0.015, 6, 14, Math.PI), dark, [cx, 0.41, cz]);
    } else if (a.left === 'jacket') {
      const cloth = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(mix(0.6, 0.07, mood.cheer), 0.5, 0.36), roughness: 0.95, side: THREE.DoubleSide });
      const fold = new THREE.PlaneGeometry(0.7, 1.5, 6, 10);
      const p = fold.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        p.setZ(i, (Math.abs(y) < 0.1 ? 0 : (y > 0 ? 1 : -1) * 0.06) + Math.sin(p.getX(i) * 9) * 0.02);
        p.setY(i, 0.38 - Math.abs(y) * 0.95 + (y > 0 ? 0 : -0.15));
      }
      fold.computeVertexNormals();
      add(arm, fold, cloth, [cx, 0.7, PW]);
      box(arm, [0.22, 0.5, 0.03], [cx - 0.42, 0.72, PW + 0.07], cloth, [0, 0, 0.15]);
      const hat = s.material('#f2d22b', { roughness: 0.4 });
      ball(arm, [0.15, 0.12, 0.17], [0.05, 1.12, PW], hat, 12);
      cyl(arm, 0.19, 0.19, 0.02, [0.05, 1.07, PW + 0.03], hat, [0, 0, 0], 14);
    }

    // What hangs from it.
    const cable = s.material('#17181a', { roughness: 0.85 });
    if (a.cables === 'power') {
      const count = 2 + Math.round(mood.density * 2);
      for (let i = 0; i < count; i++) {
        const x = -hx + 0.25 + i * 0.3, out = hz + 0.35 + random() * 0.5;
        tube(R, [[x, top + 0.5, hz], [x + 0.05, top * 0.6, hz + 0.18], [x, 0.5, hz + 0.12], [x + 0.1, 0.06, out], [x + 0.5 + random() * 0.4, 0.06, out + 0.3], [x + 0.2, 0.06, out + 0.7]], 0.045, cable);
      }
      add(R, new THREE.TorusGeometry(0.4, 0.05, 6, 20), cable, [-hx + 0.5, 0.06, hz + 1.0], [Math.PI / 2, 0, 0]);
      add(R, new THREE.TorusGeometry(0.34, 0.05, 6, 20), cable, [-hx + 0.55, 0.15, hz + 1.02], [Math.PI / 2, 0, 0]);
    } else if (a.cables === 'hose') {
      const hose = s.material('#e3b81f', { roughness: 0.6 });
      cyl(R, 0.36, 0.36, 0.05, [-hx - 0.09, 1.25, 0], dark, [0, 0, Math.PI / 2], 18);
      cyl(R, 0.36, 0.36, 0.05, [-hx - 0.33, 1.25, 0], dark, [0, 0, Math.PI / 2], 18);
      cyl(R, 0.27, 0.27, 0.2, [-hx - 0.21, 1.25, 0], hose, [0, 0, Math.PI / 2], 18);
      tube(R, [[-hx - 0.21, 1.0, 0.2], [-hx - 0.25, 0.3, 0.5], [-hx - 0.1, 0.05, 1.1], [-hx + 0.7, 0.05, hz + 0.9], [-hx + 1.4, 0.05, hz + 0.5 + random() * 0.4], [0.5, 0.05, hz + 1.1]], 0.035, hose);
      cyl(R, 0.03, 0.045, 0.2, [0.58, 0.06, hz + 1.14], s.material('#b9bcbe', { metalness: 0.8 }), [Math.PI / 2, 0, 0.5], 8);
    } else if (a.cables === 'festoon') {
      const bulb = new THREE.MeshStandardMaterial({ color: '#fff0b8', emissive: new THREE.Color().setHSL(mix(0.14, 0.08, mood.warmth), 1, 0.6), emissiveIntensity: mix(0.6, 1.8, mood.cheer) });
      const pts: V[] = [];
      for (let l = 1; l <= n; l++) {
        const run: V[] = [];
        for (let i = 0; i <= 5; i++) run.push([mix(-hx, hx, i / 5), l * LH + 1.45 - Math.sin((i / 5) * Math.PI) * 0.22, hz + 0.06]);
        tube(R, run, 0.015, cable);
        pts.push(...run);
      }
      const dots = pts.filter((_p, i) => i % 6 !== 0 && i % 6 !== 5).map((p) => ({ at: [p[0], p[1] - 0.08, p[2]] as V, size: 0.075 }));
      s.scatter(new THREE.SphereGeometry(1, 8, 6), bulb, dots);
    } else if (a.cables === 'chain') {
      rod(R, [-hx, top + 1.05, -hz], [-hx, top + 1.75, -hz], 0.05, steel);
      rod(R, [-hx, top + 1.7, -hz], [-hx - 1.3, top + 1.7, -hz + 0.5], 0.05, steel);
      rod(R, [-hx, top + 1.0, -hz], [-hx - 0.9, top + 1.7, -hz + 0.35], 0.03, steel);
      const hookY = mix(1.0, top - 0.5, random());
      rod(R, [-hx - 1.2, top + 1.65, -hz + 0.46], [-hx - 1.2, hookY, -hz + 0.46], 0.02, s.material('#8d9193', { metalness: 0.8 }));
      box(R, [0.2, 0.26, 0.14], [-hx - 1.2, top + 1.5, -hz + 0.46], s.material('#d8a21c'));
      add(R, new THREE.TorusGeometry(0.11, 0.03, 6, 12, 4.4), s.material('#c8321f'), [-hx - 1.2, hookY - 0.12, -hz + 0.46], [0, 0, -2.2]);
    }

    // The clipboard, oversized as hangar paperwork always is, hung on the first rail facing out.
    const sheet = paint(192, 256, (ctx, w, h) => {
      ctx.fillStyle = '#8a6a44'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = a.clipboard === 'redtag' ? '#c9281d' : '#f3efe2'; ctx.fillRect(14, 30, w - 28, h - 44);
      ctx.fillStyle = '#9aa0a3'; ctx.fillRect(w / 2 - 34, 8, 68, 30);
      if (a.clipboard === 'checklist') for (let i = 0; i < 7; i++) {
        ctx.strokeStyle = '#30343a'; ctx.lineWidth = 3; ctx.strokeRect(30, 58 + i * 26, 16, 16);
        ctx.fillStyle = '#6d7377'; ctx.fillRect(58, 63 + i * 26, 70 + ((i * 37) % 40), 6);
        if (i < 5 || random() < 0.4) { ctx.strokeStyle = '#1d6a36'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(30, 66 + i * 26); ctx.lineTo(38, 74 + i * 26); ctx.lineTo(52, 54 + i * 26); ctx.stroke(); }
      } else if (a.clipboard === 'redtag') { stencil(ctx, 'DO NOT', w / 2, 96, 44, '#fff'); stencil(ctx, 'OPERATE', w / 2, 146, 40, '#fff'); ctx.fillStyle = '#fff'; ctx.fillRect(34, 190, w - 68, 6); ctx.fillRect(34, 212, w - 100, 6); }
      else if (a.clipboard === 'signed') {
        for (let i = 0; i < 4; i++) { ctx.fillStyle = '#8c9296'; ctx.fillRect(30, 60 + i * 20, 120 - i * 14, 5); }
        ctx.strokeStyle = '#1b2f7a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(30, 190);
        for (let i = 1; i <= 8; i++) ctx.quadraticCurveTo(30 + i * 16 - 8, 150 + ((i * 53) % 60), 30 + i * 16, 185 - (i % 2) * 12);
        ctx.stroke();
        ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(138, 208, 26, 0, 7); ctx.stroke();
      }
    });
    const clipY = Math.min(LH + 0.35, top) + 0.62;
    const clip = decal(R, sheet, 0.5, 0.66, [hx * 0.55, clipY, hz + 0.05], [0, 0, (random() - 0.5) * 0.2], { alphaTest: 0 });
    clip.castShadow = true;
    if (n > 1) rod(R, [hx * 0.1, LH + 1.4, hz], [hx, LH + 1.4, hz], 0.03, railTop);

    // Floodlight on a mast at the back corner.
    const lit = a.lamp;
    const lampTone = new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.7, 0.8);
    const lens = new THREE.MeshStandardMaterial({ color: lit ? lampTone : '#5a6166', emissive: lit ? lampTone : '#000000', emissiveIntensity: 1.6, roughness: 0.3 });
    rod(R, [hx, top + 1.05, -hz], [hx, top + 1.7, -hz], 0.04, steel);
    const flood = group(R, [hx, top + 1.8, -hz], [0.5, -0.5, 0]);
    box(flood, [0.5, 0.36, 0.2], [0, 0, 0], dark);
    box(flood, [0.44, 0.3, 0.02], [0, 0, 0.105], lens);
    // An amber beacon on the opposite post.
    const amber = new THREE.MeshStandardMaterial({ color: '#f19a1c', emissive: '#f19a1c', emissiveIntensity: 0.4, roughness: 0.3 });
    cyl(R, 0.07, 0.08, 0.14, [-hx, top + 1.13, hz], amber, [0, 0, 0], 10);

    // Density brings the mess of a busy bay around the foot.
    const extras = Math.round(mood.density * 3);
    const cone = s.material('#e8601c', { roughness: 0.6 });
    for (let i = 0; i < extras; i++) {
      const x = hx + 0.5 + random() * 0.5, z = -hz + i * 0.75 + random() * 0.3;
      cyl(R, 0.03, 0.15, 0.5, [x, 0.27, z], cone, [0, 0, 0], 10);
      box(R, [0.36, 0.03, 0.36], [x, 0.015, z], cone);
    }

    return s.finish({
      footprint: 1.9,
      update: (_dt, time) => {
        amber.emissiveIntensity = 0.3 + mood.energy * (Math.sin(time * 6) > 0.3 ? 2.2 : 0);
        if (lit && mood.wear > 0.6) lens.emissiveIntensity = Math.sin(time * 23) > 0.92 ? 0.3 : 1.6;
      },
    });
  },
});
