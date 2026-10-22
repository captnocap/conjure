import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P2 = [number, number];
type V3 = [number, number, number];

const CARDS = { price: '$4.99', touch: 'DO NOT TOUCH', lost: 'LOST + FOUND', mother: "MOTHER'S", prop: 'PROP DEPT' } as const;

export default defineThing({
  questions: {
    frame: choice('What kind of glasses are they?', {
      cateye: 'Upswept cat-eye frames with winged corners, 1950s secretary gone glamorous.',
      granny: 'Small round granny wires.',
      aviator: 'Teardrop aviators with a double bridge.',
      heart: 'Chunky heart-shaped plastic frames.',
      lorgnette: 'A lorgnette: two lenses held up on an ornate side handle, no arms.',
      monocle: 'A single monocle on a long chain.',
    }),
    colour: choice('What colour are the frames?', {
      black: 'Glossy black.',
      tortoise: 'Mottled tortoiseshell brown.',
      pink: 'Hot pink.',
      white: 'Pearl white.',
      gold: 'Polished gold.',
      red: 'Lipstick red.',
    }),
    tint: choice('What are the lenses like?', {
      clear: 'Clear glass with a bright reflection.',
      rose: 'Rose-tinted.',
      smoke: 'Smoked nearly black.',
      amber: 'Amber, like a 1970s photograph.',
      blue: 'Sky blue.',
      mirror: 'Silver mirrored, showing nothing behind them.',
    }),
    sparkle: choice('How are they decorated?', {
      plain: 'Not at all; plain frames.',
      corners: 'A cluster of rhinestones at each upper corner.',
      encrusted: 'Encrusted with rhinestones all the way round.',
    }),
    condition: choice('What condition are they in?', {
      pristine: 'Pristine, polished, never worn.',
      cracked: 'One lens cracked in a star.',
      taped: 'Broken at the bridge and mended with a wad of white tape.',
      lensout: 'One lens has popped out and lies on the base.',
      bent: 'Bent, sitting crooked with one arm splayed.',
    }),
    stand: choice('What is the nose-and-brow stand made of?', {
      plaster: 'Chalk-white plaster.',
      velvet: 'Black velvet.',
      gilt: 'Shiny gold.',
      flesh: 'Painted shop-dummy pink with drawn-on brows.',
    }),
    card: choice('What does the little card at its foot say?', {
      none: 'There is no card.',
      price: 'A price: $4.99.',
      touch: 'DO NOT TOUCH.',
      lost: 'LOST + FOUND.',
      mother: "MOTHER'S, in a careful hand.",
      prop: 'PROP DEPT.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const TAU = Math.PI * 2;

    // ---- Stand ----
    const standMat = {
      plaster: s.material('#efece4', { roughness: 0.95 }),
      velvet: s.material('#17151b', { roughness: 1 }),
      gilt: s.material('#c9a13c', { roughness: 0.3, metalness: 0.8 }),
      flesh: s.material('#eeb9a6', { roughness: 0.45 }),
    }[a.stand];
    standMat.side = THREE.DoubleSide;
    const cyM = 0.165, R = 0.075;
    s.cylinder(0.07, 0.078, 0.014, [0, 0.007, 0], standMat, 32);
    s.cylinder(0.011, 0.014, cyM - 0.035, [0, 0.014 + (cyM - 0.035) / 2, -0.01], standMat, 12);
    s.rod([0, cyM - 0.028, -0.01], [0, cyM - 0.026, 0.058], 0.009, standMat);
    const mask = s.mesh(new THREE.SphereGeometry(R, 32, 14, Math.PI / 2 - 1.05, 2.1, 0.92, 0.98), standMat, [0, cyM, 0]);
    mask.scale.set(1, 1.1, 0.86);
    // Nose: bridge, tip and wings.
    s.rod([0, cyM + 0.022, 0.058], [0, cyM - 0.03, 0.09], 0.009, standMat, 0.013);
    s.ball([0.015, 0.013, 0.014], [0, cyM - 0.034, 0.092], standMat, 14);
    for (const sx of [-1, 1]) s.ball([0.009, 0.008, 0.01], [sx * 0.014, cyM - 0.038, 0.08], standMat, 10);
    // Brow ridges.
    const browMat = a.stand === 'flesh' ? s.material('#4a2c1c') : standMat;
    for (const sx of [-1, 1]) s.tube([[sx * 0.012, cyM + 0.036, 0.063], [sx * 0.035, cyM + 0.046, 0.058], [sx * 0.058, cyM + 0.036, 0.04]], a.stand === 'flesh' ? 0.004 : 0.006, browMat);

    // ---- Glasses ----
    const wire = a.frame === 'granny' || a.frame === 'aviator' || a.frame === 'lorgnette' || a.frame === 'monocle';
    const tone = { black: '#141418', tortoise: '#6b3b17', pink: '#ff3d96', white: '#f4efe6', gold: '#c9a13c', red: '#c8142c' }[a.colour];
    const frameMat = s.material(tone, wire || a.colour === 'gold' ? { metalness: a.colour === 'gold' ? 0.85 : 0.6, roughness: 0.25 } : { roughness: 0.25 });
    const lensSpec = {
      clear: { color: '#e6f7fb', opacity: 0.3 }, rose: { color: '#ff7fae', opacity: 0.62 }, smoke: { color: '#1c1c22', opacity: 0.88 },
      amber: { color: '#e0962a', opacity: 0.64 }, blue: { color: '#3a8fe0', opacity: 0.62 }, mirror: { color: '#b9dcef', opacity: 1 },
    }[a.tint];
    const lensMat = new THREE.MeshStandardMaterial({ color: lensSpec.color, transparent: lensSpec.opacity < 1, opacity: lensSpec.opacity, roughness: 0.08, metalness: a.tint === 'mirror' ? 0.9 : 0.1, emissive: a.tint === 'mirror' ? '#5fa8d8' : lensSpec.color, emissiveIntensity: a.tint === 'mirror' ? 0.4 : 0.12, side: THREE.DoubleSide });
    const A = { cateye: 0.036, granny: 0.026, aviator: 0.038, heart: 0.036, lorgnette: 0.026, monocle: 0.03 }[a.frame];
    const B = { cateye: 0.023, granny: 0.026, aviator: 0.032, heart: 0.032, lorgnette: 0.026, monocle: 0.03 }[a.frame];
    const N = 56;
    const lensOutline: P2[] = [];
    const rimWidth: number[] = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * TAU, c = Math.cos(t), sn = Math.sin(t);
      let x = A * c, y = B * sn, rim = wire ? 0.0026 : 0.0065;
      if (a.frame === 'cateye') {
        const wing = Math.pow(Math.max(0, c), 2);
        y += B * 0.55 * wing * (sn > -0.3 ? 1 : 0.3);
        x += A * 0.12 * wing * Math.max(0, sn);
        rim = 0.005 + 0.016 * wing * Math.pow(Math.max(0, sn + 0.35), 1.2);
      } else if (a.frame === 'aviator') {
        if (sn < 0) { y *= 1.25; x += A * 0.22 * Math.pow(-sn, 1.5); }
        else y *= 0.8;
      } else if (a.frame === 'heart') {
        const ht = t + Math.PI / 2;
        x = -A * Math.pow(Math.sin(ht), 3);
        y = (B / 15) * (13 * Math.cos(ht) - 5 * Math.cos(2 * ht) - 2 * Math.cos(3 * ht) - Math.cos(4 * ht)) + B * 0.12;
      }
      lensOutline.push([x, y]);
      rimWidth.push(rim);
    }
    const grow = (points: P2[], widths: number[]): P2[] => points.map((p, i) => {
      const n = points.length, p0 = points[(i + n - 1) % n], p1 = points[(i + 1) % n];
      const tx = p1[0] - p0[0], ty = p1[1] - p0[1], len = Math.hypot(tx, ty) || 1;
      return [p[0] + (ty / len) * widths[i], p[1] - (tx / len) * widths[i]] as P2;
    });
    const rimOutline = grow(lensOutline, rimWidth);
    const glasses = new THREE.Group();
    const depth = wire ? 0.003 : 0.007;
    const eyes = a.frame === 'monocle' ? [1] : [-1, 1];
    const cx = a.frame === 'monocle' ? 0.041 : A + (wire ? 0.011 : 0.009);
    const broken = random() < 0.5 ? -1 : 1;
    const gems: { at: V3; size: number; color: THREE.Color }[] = [];
    const lensGeo = (side: number) => new THREE.ShapeGeometry(new THREE.Shape(lensOutline.map(([x, y]) => new THREE.Vector2(x * side, y))), 6);
    for (const side of eyes) {
      const shape = new THREE.Shape(rimOutline.map(([x, y]) => new THREE.Vector2(x * side, y)));
      shape.holes.push(new THREE.Path(lensOutline.map(([x, y]) => new THREE.Vector2(x * side, y))));
      const rim = s.mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.0008, bevelThickness: 0.0008, bevelSegments: 1 }), frameMat, [side * cx, 0, -depth / 2]);
      glasses.add(rim);
      const missing = a.condition === 'lensout' && (side === broken || eyes.length === 1);
      if (!missing) {
        const lens = s.mesh(lensGeo(side), lensMat, [side * cx, 0, 0]);
        lens.castShadow = lensSpec.opacity > 0.5;
        glasses.add(lens);
        // A glint so even clear glass reads as glass.
        const glint = s.mesh(new THREE.PlaneGeometry(A * 0.22, B * 1.1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }), [side * cx - A * 0.3, B * 0.1, 0.0012]);
        glint.rotation.z = -0.5; glint.castShadow = false;
        glasses.add(glint);
        if (a.condition === 'cracked' && (side === broken || eyes.length === 1)) {
          const hit: P2 = [(random() - 0.5) * A * 0.6, (random() - 0.5) * B * 0.6], crackMat = s.material('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 });
          for (let k = 0; k < 9; k++) {
            const ang = (k / 9) * TAU + random() * 0.4, reach = 0.55 + random() * 0.35;
            const mid: P2 = [hit[0] + Math.cos(ang) * A * reach * 0.5 + (random() - 0.5) * 0.004, hit[1] + Math.sin(ang) * B * reach * 0.5 + (random() - 0.5) * 0.004];
            const end: P2 = [hit[0] + Math.cos(ang) * A * reach, hit[1] + Math.sin(ang) * B * reach];
            const clampTo = (p: P2): V3 => { const q = Math.hypot(p[0] / A, p[1] / B); const f = q > 0.86 ? 0.86 / q : 1; return [side * cx + p[0] * f, p[1] * f, 0.0016]; };
            glasses.add(s.rod(clampTo(hit), clampTo(mid), 0.0006, crackMat)); glasses.add(s.rod(clampTo(mid), clampTo(end), 0.0005, crackMat));
          }
        }
      }
      if (a.sparkle !== 'plain') {
        for (let i = 0; i < N; i++) {
          const t = (i / N) * TAU, corner = Math.cos(t) > 0.25 && Math.sin(t) > -0.1;
          if (a.sparkle === 'corners' ? !corner : i % 2 === 1) continue;
          const rows = a.sparkle === 'corners' && !wire ? Math.max(1, Math.round(rimWidth[i] / 0.006)) : 1;
          for (let r = 0; r < rows; r++) {
            const f = (r + 0.5) / rows;
            gems.push({ at: [side * (cx + mix(lensOutline[i][0], rimOutline[i][0], f)), mix(lensOutline[i][1], rimOutline[i][1], f), depth / 2 + 0.0015], size: wire ? 0.75 : 1, color: new THREE.Color().setHSL(random(), 0.25, 0.9) });
          }
        }
      }
    }
    // Bridge.
    const inner = cx - A - (wire ? 0.002 : 0.004);
    if (eyes.length === 2) {
      const by = a.frame === 'heart' ? B * 0.25 : a.frame === 'cateye' ? B * 0.35 : B * 0.2;
      glasses.add(s.tube([[-inner, by, 0], [0, by + 0.007, 0.002], [inner, by, 0]], wire ? 0.0016 : 0.0034, frameMat));
      if (a.frame === 'aviator') glasses.add(s.rod([-cx + A * 0.2, B * 0.78, 0], [cx - A * 0.2, B * 0.78, 0], 0.0015, frameMat));
      if (a.condition === 'taped') {
        const tape = s.cylinder(0.0075, 0.0075, 0.018, [0, by + 0.006, 0.001], s.material('#f1eee4', { roughness: 0.95 }), 10);
        tape.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.3; glasses.add(tape);
        const flap = s.box([0.011, 0.005, 0.0008], [0.004, by + 0.014, 0.004], s.material('#f1eee4', { roughness: 0.95 })); flap.rotation.z = 0.5; glasses.add(flap);
      }
    }
    // Arms, handle or chain.
    const outer = cx + Math.max(...rimOutline.map((p) => p[0]));
    const hingeY = a.frame === 'cateye' ? B * 0.75 : a.frame === 'heart' ? B * 0.45 : B * 0.25;
    if (a.frame === 'lorgnette') {
      const handle = s.tube([[outer - 0.002, 0, 0], [outer + 0.012, -0.004, 0], [outer + 0.02, -0.04, 0.002], [outer + 0.012, -0.1, 0.004], [outer + 0.02, -0.135, 0.004]], 0.0032, frameMat);
      glasses.add(handle);
      glasses.add(s.ball([0.007, 0.007, 0.007], [outer + 0.02, -0.14, 0.004], frameMat, 10));
      glasses.add(s.ring(0.006, 0.0015, [outer + 0.014, -0.004, 0], frameMat));
      for (let i = 0; i < 4; i++) glasses.add(s.ball([0.0045, 0.0045, 0.0045], [outer + 0.019 - i * 0.002, -0.05 - i * 0.016, 0.003], frameMat, 8));
    } else if (a.frame !== 'monocle') {
      for (const side of [-1, 1]) {
        const splay = a.condition === 'bent' && side === broken ? 0.03 : 0, hx = side * (outer - 0.001);
        const arm = s.tube([[hx, hingeY, 0], [hx + side * (0.002 + splay * 0.5), hingeY, -0.05], [hx + side * splay, hingeY - 0.003 + splay * 0.4, -0.1], [hx + side * (splay * 1.3 - 0.003), hingeY - 0.03 + splay * 0.6, -0.128]], wire ? 0.0014 : 0.0032, frameMat);
        glasses.add(arm);
        glasses.add(s.box([0.004, 0.008, 0.006], [hx, hingeY, -0.002], frameMat));
        if (a.sparkle === 'encrusted' && !wire) for (let i = 0; i < 6; i++) gems.push({ at: [hx + side * 0.004, hingeY, -0.012 - i * 0.012], size: 0.8, color: new THREE.Color().setHSL(random(), 0.25, 0.9) });
      }
    }
    if (gems.length) glasses.add(s.scatter(new THREE.OctahedronGeometry(0.0024, 0), new THREE.MeshStandardMaterial({ roughness: 0.05, metalness: 0.5, emissive: '#cfeaff', emissiveIntensity: mix(0.35, 0.9, mood.cheer) }), gems));
    const gy = cyM + 0.012;
    glasses.position.set(0, gy, a.frame === 'monocle' ? 0.064 : 0.071);
    glasses.rotation.x = -0.06;
    if (a.frame === 'monocle') glasses.rotation.y = 0.22;
    if (a.condition === 'bent') { glasses.rotation.z = broken * 0.16; glasses.position.y -= 0.004; }
    if (a.condition === 'taped') glasses.rotation.z = (random() - 0.5) * 0.08;
    s.root.add(glasses);

    // Chain for the monocle, or a neck cord when the scene is busy.
    const chainMat = s.material(a.colour === 'gold' || a.frame === 'monocle' ? '#d6b04a' : '#e9e4d6', { metalness: 0.8, roughness: 0.25 });
    const links: { at: V3; size: number }[] = [];
    if (a.frame === 'monocle') {
      const from = new THREE.Vector3(0.041 + A * 0.9, gy - B * 0.5, 0.064), to = new THREE.Vector3(0.05 + random() * 0.02, 0.016, 0.045);
      for (let i = 0; i <= 60; i++) { const t = i / 60, p = from.clone().lerp(to, t); p.x += Math.sin(t * Math.PI) * 0.035; p.z += Math.sin(t * Math.PI) * 0.03; links.push({ at: [p.x, p.y, p.z], size: 1 }); }
      for (let i = 0; i < 26; i++) { const ang = i * 0.5, r = 0.012 + i * 0.0007; links.push({ at: [to.x + Math.cos(ang) * r, 0.016, to.z + Math.sin(ang) * r], size: 1 }); }
    } else if (a.frame !== 'lorgnette' && mood.density > 0.55) {
      for (let i = 0; i <= 80; i++) { const t = i / 80; links.push({ at: [mix(-outer, outer, t), gy + hingeY - 0.03 - Math.sin(t * Math.PI) * 0.11, -0.125 - Math.sin(t * Math.PI) * 0.02], size: 1 }); }
    }
    if (links.length) s.scatter(new THREE.SphereGeometry(0.0022, 6, 5), chainMat, links);

    // The popped lens, lying on the base.
    if (a.condition === 'lensout') {
      const loose = s.mesh(lensGeo(1), lensMat, [0.03 + random() * 0.02, 0.0155, 0.035]);
      loose.rotation.x = -Math.PI / 2; loose.rotation.z = random() * 3;
      for (let i = 0; i < 2; i++) s.cylinder(0.0012, 0.0012, 0.004, [-0.03 + i * 0.012, 0.015, 0.045 + random() * 0.01], chainMat, 6).rotation.z = Math.PI / 2;
    }
    // The card.
    if (a.card !== 'none') {
      const card = s.label(CARDS[a.card], 0.075, 0.03, [0, 0.0, 0], '#2a2620', mood.wear > 0.6 ? '#e3d6b0' : '#f7f3e8');
      card.position.set((random() - 0.5) * 0.02, 0.03, 0.082);
      card.rotation.x = -0.35; card.rotation.z = (random() - 0.5) * 0.12;
    }
    // Dust on a neglected display: grey flecks on the base.
    if (mood.wear > 0.5) {
      const flecks: { at: V3; size: number }[] = [];
      for (let i = 0; i < (mood.wear - 0.5) * 80; i++) { const ang = random() * TAU, r = Math.sqrt(random()) * 0.066; flecks.push({ at: [Math.cos(ang) * r, 0.0145, Math.sin(ang) * r], size: 0.5 + random() }); }
      s.scatter(new THREE.SphereGeometry(0.0016, 5, 4), s.material('#8f897c', { roughness: 1 }), flecks);
    }

    return s.finish({ footprint: 0.09 });
  },
});
