import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { bump, fuse, lerp, painted, placed, smooth, strut, sweep } from './form';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export default defineThing({
  questions: {
    surface: choice('What is the top of the tongue like?', {
      zones: 'Painted with the old taste map: a green bitter band at the back, yellow sour and blue salt sides, a purple sweet tip, each lettered.',
      natural: 'Natural wet pink, dotted with paler bumps.',
      coated: 'Coated with a thick white fur down the middle, the tongue a doctor frowns at.',
      hairy: 'Black hairy tongue: a dark bristling patch across the back and centre.',
      candy: 'Stained bright blue by a lollipop or a slush drink, pink only at the edges.',
    }),
    pose: choice('How is it held?', {
      flat: 'Lolling out flat and loose.',
      curled: 'The tip curled up and back on itself.',
      rolled: 'Its sides rolled up into a tube.',
      out: 'Stuck straight out, stiff and pointed, a rude gesture.',
    }),
    doing: choice('What is it doing?', {
      still: 'Nothing; it is just a model.',
      licking: 'Licking an ice cream.',
      tasting: 'Tasting a drop falling from a glass dropper held above it.',
      dripping: 'Drooling: strings of saliva hang from it and pool below.',
    }),
    state: choice('What state is it in?', {
      healthy: 'Healthy and whole.',
      bitten: 'Bitten: a crescent of red tooth marks in one edge.',
      pierced: 'Pierced with a steel barbell through the middle.',
      forked: 'Forked: the tip split in two like a snake\'s.',
    }),
    length: choice('How long is it?', {
      short: 'Short: it barely clears the teeth.',
      long: 'Long: it hangs down past the stand to the table.',
      absurd: 'Absurdly long: it runs off the stand and snakes away across the ground.',
    }),
    teeth: choice('What are the teeth it lolls over like?', {
      neat: 'A neat white row.',
      crooked: 'Crooked and yellowed, with a gap.',
      gold: 'Mostly sound, with one gold tooth.',
      gums: 'No teeth at all, only bare gums.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const H = 0.44, W = a.pose === 'out' ? 0.2 : 0.265;
    const outer = { short: 0.8, long: 1.1, absurd: 2.9 }[a.length] * (1 + jitter(0.06));

    // ---- spine: a short run inside the mouth, then whatever gravity and the pose make of the rest --------
    const path: THREE.Vector3[] = [V(0, H - 0.02, -0.36), V(0, H + 0.08, -0.2), V(0, H + 0.145, 0.05), V(0, H + 0.15, 0.3)];
    {
      const ds = 0.02, ground = 0.07;
      const p = V(0, H + 0.15, 0.3);
      let pitch = a.pose === 'out' ? 0.3 : 0.02, yaw = 0, grounded = -1;
      const droop = a.pose === 'out' ? (a.length === 'short' ? 0.1 : 0.55) : a.pose === 'rolled' ? (a.length === 'short' ? 0.35 : 1.5) : (a.length === 'short' ? 1.1 : 2.6);
      const limit = a.length === 'short' ? (a.pose === 'out' ? 0.1 : -0.45) : -1.3;
      const swing = 0.55 + random() * 0.3, phase = random() * 6.28, side = random() < 0.5 ? -1 : 1;
      for (let d = 0; d < outer; d += ds) {
        if (grounded < 0) pitch = Math.max(limit, pitch - droop * ds * (d > 0.12 ? 1 : 0.3));
        if (a.pose === 'curled' && d > outer - (a.length === 'short' ? 0.24 : 0.34)) pitch += ds * (a.length === 'short' ? 9 : 10.5);
        if (grounded >= 0 && a.length === 'absurd') yaw = side * swing * Math.sin((d - grounded) * 3.4 + phase) * smooth(0, 0.3, d - grounded);
        p.add(V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(ds));
        if (p.y < ground && pitch < 0.2) { p.y = ground; pitch *= 0.55; if (grounded < 0) grounded = d; }
        path.push(p.clone());
      }
    }
    const curve = new THREE.CatmullRomCurve3(path, false, 'centripetal');
    const NF = Math.min(420, Math.round(90 + outer * 110));
    const length = curve.getLength();
    const P: THREE.Vector3[] = [], T: THREE.Vector3[] = [], N: THREE.Vector3[] = [], B: THREE.Vector3[] = [];
    let normal = V(0, 1, 0);
    for (let i = 0; i <= NF; i++) {
      const t = i / NF;
      P.push(curve.getPointAt(t));
      const tangent = curve.getTangentAt(t).normalize();
      normal = normal.clone().addScaledVector(tangent, -normal.dot(tangent)).normalize();
      T.push(tangent); N.push(normal); B.push(new THREE.Vector3().crossVectors(normal, tangent).normalize());
    }
    const inside = 0.72 / length;
    const tipLength = (a.pose === 'out' ? 0.42 : 0.24) / length;
    const fork = a.state === 'forked' ? 1 : 0;
    const biteAt = 1 - (0.3 + random() * 0.12) / length, biteSide = random() < 0.5 ? -1 : 1;
    const width = (t: number, u: number) => {
      let w = lerp(0.19, W, smooth(0, inside, t));
      if (t > 1 - tipLength) { const q = (t - (1 - tipLength)) / tipLength; w *= a.pose === 'out' ? Math.max(0, 1 - q * q) ** 0.85 : Math.sqrt(Math.max(0, 1 - q * q)) ** 0.9; }
      if (a.state === 'bitten' && u * biteSide > 0) w *= 1 - 0.2 * Math.abs(u) * bump(t, biteAt, 0.05 / length);
      return w;
    };
    const thick = (t: number) => lerp(0.2, 0.11, smooth(0, inside * 1.2, t)) * lerp(1, 0.45, smooth(1 - tipLength * 1.5, 1, t));
    const rollOf = (t: number) => (a.pose === 'rolled' ? 7.6 * smooth(inside * 0.7, inside * 1.5, t) : 0.5);
    const at = new THREE.Vector3();
    /** A point on the tongue: t along, u across (-1 to 1), on the top or the underside, lifted off the surface. */
    const surf = (t: number, u: number, top = true, lift = 0, out = new THREE.Vector3()) => {
      const te = Math.max(0, t - fork * (0.2 / length) * smooth(1 - 0.4 / length, 1, t) * (1 - Math.abs(u)) ** 1.3);
      const f = te * NF, i = Math.min(NF - 1, Math.floor(f)), g = f - i;
      const w = width(t, u), th = thick(t), k = rollOf(t);
      const x = w * u + fork * Math.sign(u) * Math.min(1, Math.abs(u) * 4) * 0.075 * smooth(1 - 0.34 / length, 1, t);
      const dome = Math.sqrt(Math.max(0, 1 - u * u));
      const y = (top ? th * 0.5 * dome - 0.022 * Math.exp(-((u / 0.09) ** 2)) * smooth(0, 0.15, 1 - t) : -th * 0.5 * dome) + lift * (top ? 1 : -1);
      const cx = Math.sin(x * k) / k, cy = (1 - Math.cos(x * k)) / k, nx = -Math.sin(x * k), ny = Math.cos(x * k);
      out.copy(P[i]).lerp(P[i + 1], g);
      at.copy(B[i]).lerp(B[i + 1], g).normalize();
      out.addScaledVector(at, cx + nx * y);
      at.copy(N[i]).lerp(N[i + 1], g).normalize();
      return out.addScaledVector(at, cy + ny * y);
    };

    // ---- skin ---------------------------------------------------------------------------------------
    const pink = new THREE.Color(a.surface === 'zones' ? '#ee8f9c' : '#e77a8c').lerp(new THREE.Color('#b9788a'), (1 - mood.cheer) * 0.35);
    const hex = (colour: THREE.Color) => `#${colour.getHexString()}`;
    const stretch = (length / (2 * W)) / 2;
    const map = painted(512, 1024, (ctx, w, h) => {
      // work in u (-1..1) across and t (0..1) along, tip at the top of the canvas
      ctx.setTransform(w / 2, 0, 0, -h, w / 2, h);
      const fade = ctx.createLinearGradient(0, 0, 0, 1);
      fade.addColorStop(0, hex(pink.clone().multiplyScalar(0.72)));
      fade.addColorStop(0.35, hex(pink));
      fade.addColorStop(1, hex(pink.clone().lerp(new THREE.Color('#f08a8a'), 0.4)));
      ctx.fillStyle = fade; ctx.fillRect(-1, 0, 2, 1);
      const blot = (u: number, t: number, ru: number, rt: number, colour: string, alpha: number) => {
        ctx.save(); ctx.translate(u, t); ctx.scale(ru, rt);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        const c = new THREE.Color(colour), rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
        g.addColorStop(0, `rgba(${rgb},${alpha})`); g.addColorStop(0.6, `rgba(${rgb},${alpha * 0.8})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      };
      for (const side of [-1, 1]) blot(side * 1.05, 0.5, 0.3, 0.7, '#c44a5e', 0.5);
      const label = (text: string, u: number, t: number, size: number, turn: number, colour = '#ffffff') => {
        ctx.save(); ctx.translate(u, t); ctx.scale(1, -1 / (2 * stretch)); ctx.rotate(turn);
        ctx.font = `bold ${size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = size * 0.16; ctx.strokeStyle = 'rgba(40,20,30,0.55)'; ctx.strokeText(text, 0, 0);
        ctx.fillStyle = colour; ctx.fillText(text, 0, 0); ctx.restore();
      };
      if (a.surface === 'zones') {
        const vivid = mix(0.72, 0.95, mood.cheer);
        const zone = (colour: string, draw: () => void) => { ctx.globalAlpha = vivid; ctx.fillStyle = colour; ctx.beginPath(); draw(); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#fff7ea'; ctx.lineWidth = 0.02; ctx.stroke(); };
        const b0 = inside * 0.55, b1 = inside * 1.05, tipT = 1 - 0.23 / length, mid = lerp(b1, tipT, 0.5);
        zone('#3c9a55', () => { ctx.moveTo(-1.1, b0); ctx.lineTo(1.1, b0); ctx.lineTo(1.1, b1); ctx.quadraticCurveTo(0, b1 - inside * 0.25, -1.1, b1); ctx.closePath(); });
        for (const side of [-1, 1]) {
          zone('#ecc52c', () => { ctx.moveTo(side * 1.1, b1); ctx.lineTo(side * 0.5, b1 - inside * 0.08); ctx.quadraticCurveTo(side * 0.36, lerp(b1, mid, 0.5), side * 0.5, mid); ctx.lineTo(side * 1.1, mid); ctx.closePath(); });
          zone('#3a78d2', () => { ctx.moveTo(side * 1.1, mid); ctx.lineTo(side * 0.5, mid); ctx.quadraticCurveTo(side * 0.36, lerp(mid, tipT, 0.5), side * 0.5, tipT); ctx.lineTo(side * 1.1, tipT); ctx.closePath(); });
        }
        zone('#8a48c2', () => { ctx.moveTo(-1.1, tipT); ctx.quadraticCurveTo(0, tipT - 0.1 / length, 1.1, tipT); ctx.lineTo(1.1, 1.01); ctx.lineTo(-1.1, 1.01); ctx.closePath(); });
        label('BITTER', 0, (b0 + b1) / 2 + 0.01, 0.2, 0);
        label('SOUR', -0.76, lerp(b1, mid, 0.5), 0.17, Math.PI / 2); label('SOUR', 0.76, lerp(b1, mid, 0.5), 0.17, -Math.PI / 2);
        label('SALT', -0.76, lerp(mid, tipT, 0.5), 0.17, Math.PI / 2); label('SALT', 0.76, lerp(mid, tipT, 0.5), 0.17, -Math.PI / 2);
        label('SWEET', 0, 1 - 0.115 / length, 0.19, 0);
      }
      if (a.surface === 'coated') for (let i = 0; i < 46; i++) blot(jitter(0.5), 0.08 + random() * (0.8 - 0.08), 0.24 + random() * 0.2, (0.1 + random() * 0.08) / stretch, '#f4f0df', 0.55);
      if (a.surface === 'hairy') for (let i = 0; i < 50; i++) blot(jitter(0.42), inside * 0.4 + random() * (0.74 - inside * 0.4), 0.2 + random() * 0.16, (0.08 + random() * 0.07) / stretch, i % 4 ? '#1c1512' : '#4a3320', 0.7);
      if (a.surface === 'candy') {
        const dye = mood.warmth > 0.72 ? '#c2143c' : mood.warmth < 0.15 ? '#6a2fc0' : '#1668e6';
        for (let i = 0; i < 44; i++) blot(jitter(0.5), 0.2 + random() * 0.8, 0.3 + random() * 0.22, (0.11 + random() * 0.08) / stretch, dye, 0.62);
      }
      // median groove and stipple
      ctx.strokeStyle = 'rgba(120,30,50,0.45)'; ctx.lineWidth = 0.035;
      ctx.beginPath(); ctx.moveTo(0, inside * 0.6); ctx.lineTo(0, 1 - 0.1 / length); ctx.stroke();
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = random() < 0.5 ? 'rgba(255,225,225,0.3)' : 'rgba(150,40,60,0.2)';
        ctx.beginPath(); ctx.ellipse(jitter(1), random(), 0.012, 0.012 / (2 * stretch), 0, 0, Math.PI * 2); ctx.fill();
      }
      if (a.state === 'bitten') {
        blot(biteSide * 0.86, biteAt, 0.3, 0.085 / length, '#8a1220', 0.85);
        ctx.fillStyle = '#5a0a14';
        for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(biteSide * (0.7 + 0.04 * i * i * 0.3), biteAt + i * 0.017 / length, 0.07, 0.006 / length, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      for (let i = 0; i < mood.wear * 26; i++) blot(jitter(1), random(), 0.04 + random() * 0.08, (0.02 + random() * 0.04) / stretch, '#efe9da', 0.95);
      for (let i = 0; i < mood.wear * 14; i++) blot(jitter(1), random(), 0.2 + random() * 0.2, (0.08 + random() * 0.08) / stretch, '#5c4a3a', 0.25);
    });
    const gloss = mix(0.28, 0.62, mood.wear);
    const topMaterial = new THREE.MeshStandardMaterial({ map, roughness: gloss });
    const underMaterial = new THREE.MeshStandardMaterial({ color: pink.clone().lerp(new THREE.Color('#b24a66'), 0.45), roughness: gloss });

    const NA = Math.min(520, Math.round(110 + outer * 130)), NU = 26;
    const sheet = (top: boolean) => {
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      const p = new THREE.Vector3();
      for (let i = 0; i <= NA; i++) {
        const t = 1 - (1 - i / NA) ** 1.25;
        for (let j = 0; j <= NU; j++) {
          const u = Math.sin((j / NU - 0.5) * Math.PI);
          surf(t, u, top, 0, p);
          positions.push(p.x, p.y, p.z);
          uvs.push(0.5 + u / 2, t);
        }
      }
      for (let i = 0; i < NA; i++)
        for (let j = 0; j < NU; j++) {
          const v00 = i * (NU + 1) + j, v01 = v00 + 1, v10 = v00 + NU + 1, v11 = v10 + 1;
          if (top) index.push(v00, v11, v01, v00, v10, v11); else index.push(v00, v01, v11, v00, v11, v10);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(index);
      g.computeVertexNormals();
      return g;
    };
    s.mesh(sheet(true), topMaterial);
    s.mesh(sheet(false), underMaterial);

    // ---- papillae -----------------------------------------------------------------------------------
    const bumps: { at: [number, number, number]; size: number; color: THREE.ColorRepresentation }[] = [];
    const paleBump = pink.clone().lerp(new THREE.Color('#ffd9d6'), 0.32);
    const count = Math.round(120 + outer * 90);
    for (let i = 0; i < count; i++) {
      const t = inside * 0.7 + random() * (0.985 - inside * 0.7), u = jitter(0.86);
      if (a.state === 'forked' && t > 1 - 0.3 / length) continue;
      const p = surf(t, u, true, 0.001);
      bumps.push({ at: [p.x, p.y, p.z], size: 0.005 + random() * 0.005, color: a.surface === 'hairy' && Math.abs(u) < 0.45 && t < 0.74 ? '#2a1d18' : paleBump });
    }
    for (let i = -4; i <= 4; i++) {
      const p = surf(inside * (0.62 - Math.abs(i) * 0.05), i * 0.15, true, 0.002);
      bumps.push({ at: [p.x, p.y, p.z], size: 0.021, color: pink.clone().lerp(new THREE.Color('#c2475e'), 0.5) });
    }
    s.scatter(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ roughness: gloss }), bumps);
    if (a.surface === 'hairy') {
      const bristle = new THREE.ConeGeometry(0.007, 0.07, 4);
      bristle.translate(0, 0.03, 0);
      const fur = new THREE.InstancedMesh(bristle, new THREE.MeshStandardMaterial({ color: '#17110f', roughness: 0.9 }), 520);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
      for (let i = 0; i < 520; i++) {
        const t = inside * 0.45 + random() * (0.72 - inside * 0.45), u = jitter(0.5);
        surf(t, u, true, 0, p0); surf(t, u, true, 0.05, p1);
        p1.sub(p0).normalize().add(V(jitter(0.5), jitter(0.5), jitter(0.5))).normalize();
        q.setFromUnitVectors(up, p1);
        m.compose(p0, q, V(1, 0.6 + random() * 0.9, 1));
        fur.setMatrixAt(i, m);
      }
      fur.castShadow = true;
      s.root.add(fur);
    }

    // ---- the mouth it comes out of: gum, teeth, stand ----------------------------------------------------
    const gumColour = new THREE.Color('#d9606f').lerp(new THREE.Color('#8d4a55'), mood.wear * 0.4);
    const gum = new THREE.MeshStandardMaterial({ color: gumColour, roughness: 0.4 });
    const arch = (alpha: number, r = 1) => V(Math.sin(alpha) * 0.33 * r, 0, Math.cos(alpha) * 0.36 * r - 0.02);
    const gumLine: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) { const p = arch(lerp(-2.0, 2.0, i / 16)); gumLine.push(V(p.x, H, p.z)); }
    s.mesh(sweep(gumLine, () => [0.062, 0.07], { steps: 60, sides: 10 }), gum);
    s.mesh(placed(new THREE.SphereGeometry(1, 24, 12), [0, H - 0.04, -0.08], [0.33, 0.09, 0.36]), new THREE.MeshStandardMaterial({ color: gumColour.clone().multiplyScalar(0.72), roughness: 0.5 }));
    if (a.teeth !== 'gums') {
      const crooked = a.teeth === 'crooked';
      const enamel = new THREE.MeshStandardMaterial({ color: new THREE.Color(crooked ? '#dccf9a' : '#f6f2e6').lerp(new THREE.Color('#b9a56e'), mood.wear * 0.35), roughness: 0.22 });
      const parts: THREE.BufferGeometry[] = [], golden: THREE.BufferGeometry[] = [];
      const missing = crooked ? Math.floor(random() * 6) + 4 : -1, goldTooth = a.teeth === 'gold' ? 4 + Math.floor(random() * 6) : -1;
      for (let i = 0; i < 14; i++) {
        if (i === missing) continue;
        const alpha = lerp(-1.82, 1.82, i / 13), p = arch(alpha), front = Math.abs(i - 6.5);
        const kind = front < 2 ? 0 : front < 3 ? 1 : 2;
        const size: [number, number, number] = kind === 0 ? [0.036, 0.062, 0.02] : kind === 1 ? [0.036, 0.074, 0.032] : [0.05, 0.05, 0.05];
        const g = kind === 2 ? new THREE.SphereGeometry(1, 10, 8) : new THREE.SphereGeometry(1, 10, 8);
        if (kind === 1) { const gp = g.attributes.position; for (let v = 0; v < gp.count; v++) if (gp.getY(v) > 0) gp.setXYZ(v, gp.getX(v) * (1 - gp.getY(v) * 0.6), gp.getY(v) * 1.15, gp.getZ(v) * (1 - gp.getY(v) * 0.6)); }
        if (kind === 2) { const gp = g.attributes.position; for (let v = 0; v < gp.count; v++) { const y = gp.getY(v); gp.setY(v, Math.sign(y) * Math.abs(y) ** 0.5 * 0.9); } g.computeVertexNormals(); }
        const tooth = placed(g, [p.x, H + 0.05 + size[1] * 0.55 + (crooked ? jitter(0.012) : 0), p.z], size, [crooked ? jitter(0.3) : 0, alpha + (crooked ? jitter(0.4) : 0), crooked ? jitter(0.25) : 0]);
        (i === goldTooth ? golden : parts).push(tooth);
      }
      s.root.add(fuse(parts, enamel));
      if (golden.length) s.root.add(fuse(golden, new THREE.MeshStandardMaterial({ color: '#e0b030', metalness: 0.95, roughness: 0.2 })));
    }
    const woodColour = new THREE.Color().setHSL(0.07 + mood.warmth * 0.03, 0.42, mix(0.16, 0.32, random()));
    const wood = s.material(woodColour, { roughness: 0.45 });
    s.lathe([[0, 0], [0.34, 0], [0.36, 0.02], [0.36, 0.05], [0.31, 0.075], [0.12, 0.09], [0.075, 0.12], [0.06, 0.2], [0.075, 0.26], [0.055, 0.3], [0.06, H - 0.1], [0.16, H - 0.07], [0, H - 0.06]], wood, [0, 0, -0.08]);
    const plaque = painted(256, 64, (ctx, w, h) => {
      ctx.fillStyle = '#c8a850'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#6b5520'; ctx.lineWidth = 4; ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#2b2415'; ctx.font = 'bold 36px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(a.surface === 'zones' ? 'TASTE' : 'LINGUA', w / 2, h / 2 + 2);
    });
    const brass = s.mesh(new THREE.CylinderGeometry(0.362, 0.362, 0.034, 24, 1, true, -0.3, 0.6), new THREE.MeshStandardMaterial({ map: plaque, roughness: 0.35, metalness: 0.5 }), [0, 0.034, -0.08]);
    brass.castShadow = false;

    // ---- state and action -----------------------------------------------------------------------------
    const steel = new THREE.MeshStandardMaterial({ color: '#d5d8da', metalness: 0.95, roughness: 0.16 });
    if (a.state === 'pierced') {
      const t = 1 - Math.min(0.42, outer * 0.6) / length;
      const top = surf(t, 0, true, 0.03), under = surf(t, 0, false, 0.03);
      s.mesh(fuse([placed(new THREE.SphereGeometry(0.04, 14, 10), [top.x, top.y, top.z]), placed(new THREE.SphereGeometry(0.034, 12, 8), [under.x, under.y, under.z]), strut([top.x, top.y, top.z], [under.x, under.y, under.z], 0.012)], steel).geometry, steel);
    }
    const tip = P[NF].clone(), tipDir = T[NF].clone();
    const moving: ((time: number) => void)[] = [];
    if (a.doing === 'licking') {
      const flavour = ['#f3a6bd', '#a8dcc0', '#6b452f', '#f6ecd0'][Math.floor(random() * 4)];
      const cream = new THREE.MeshStandardMaterial({ color: flavour, roughness: 0.55 });
      const wafer = new THREE.MeshStandardMaterial({ color: '#d59a4e', roughness: 0.75 });
      const flat = V(tipDir.x, 0, tipDir.z).normalize();
      if (flat.lengthSq() < 0.5) flat.set(0, 0, 1);
      const I = new THREE.Group();
      const add = (g: THREE.BufferGeometry, material: THREE.Material) => { const mesh = new THREE.Mesh(g, material); mesh.castShadow = mesh.receiveShadow = true; I.add(mesh); return mesh; };
      if (tip.y > 0.3 && a.pose !== 'curled') {
        // held up to the tongue on a wire stand
        const c = tip.clone().addScaledVector(flat, 0.15); c.y = Math.max(c.y, 0.5);
        add(placed(new THREE.SphereGeometry(0.13, 20, 14), [c.x, c.y, c.z], [1, 0.95, 1]), cream);
        add(placed(new THREE.TorusGeometry(0.1, 0.03, 8, 20), [c.x, c.y - 0.07, c.z], [1, 1, 1], [Math.PI / 2, 0, 0]), cream);
        add(placed(new THREE.ConeGeometry(0.105, 0.34, 20), [c.x, c.y - 0.25, c.z], [1, 1, 1], [Math.PI, 0, 0]), wafer);
        add(fuse([strut([c.x, 0, c.z], [c.x, c.y - 0.34, c.z], 0.01), placed(new THREE.TorusGeometry(0.06, 0.01, 6, 18), [c.x, c.y - 0.3, c.z], [1, 1, 1], [Math.PI / 2, 0, 0]), placed(new THREE.CylinderGeometry(0.1, 0.11, 0.015, 20), [c.x, 0.0075, c.z])], steel).geometry, steel);
      } else {
        // dropped: a scoop splatted on the ground with the cone tipped over on top
        const c = tip.clone().addScaledVector(flat, a.pose === 'curled' ? -0.02 : 0.17); c.y = 0;
        if (a.pose === 'curled') c.addScaledVector(flat, 0.3);
        add(placed(new THREE.SphereGeometry(0.14, 20, 12), [c.x, 0.07, c.z], [1, 0.62, 1]), cream);
        add(placed(new THREE.CylinderGeometry(0.2, 0.22, 0.012, 22), [c.x, 0.006, c.z], [1, 1, 0.85]), cream);
        add(placed(new THREE.ConeGeometry(0.105, 0.34, 20), [c.x + 0.02, 0.26, c.z + 0.03], [1, 1, 1], [0.35, 0, 0.3]), wafer);
      }
      s.root.add(I);
    }
    if (a.doing === 'tasting') {
      const t = 1 - Math.min(0.3, outer * 0.5) / length;
      const land = surf(t, 0, true, 0.004);
      const liquid = ['#f2d21f', '#3aa0e8', '#e4572e', '#7ac74f'][Math.floor(random() * 4)];
      const drop = new THREE.MeshStandardMaterial({ color: liquid, roughness: 0.1, emissive: liquid, emissiveIntensity: 0.25 });
      const glass = new THREE.MeshStandardMaterial({ color: '#dfeaec', roughness: 0.08, metalness: 0.1 });
      const rubber = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#c6332e' : '#232326', roughness: 0.6 });
      const tipY = Math.max(land.y + 0.3, H + 0.5);
      s.mesh(placed(new THREE.CylinderGeometry(0.03, 0.008, 0.3, 12), [land.x, tipY + 0.15, land.z]), glass);
      s.mesh(placed(new THREE.CylinderGeometry(0.024, 0.024, 0.14, 10), [land.x, tipY + 0.2, land.z]), drop);
      s.mesh(placed(new THREE.SphereGeometry(0.06, 14, 10), [land.x, tipY + 0.36, land.z], [1, 1.35, 1]), rubber);
      // retort stand and clamp
      const sx = (land.x < 0 ? 1 : -1) * 0.48, sz = Math.min(land.z, 0.5);
      s.mesh(fuse([strut([sx, 0, sz], [sx, tipY + 0.42, sz], 0.014), strut([sx, tipY + 0.24, sz], [land.x, tipY + 0.24, land.z], 0.011), placed(new THREE.BoxGeometry(0.2, 0.025, 0.14), [sx, 0.0125, sz]), placed(new THREE.TorusGeometry(0.036, 0.012, 6, 14), [land.x, tipY + 0.24, land.z], [1, 1, 1], [Math.PI / 2, 0, 0])], steel).geometry, steel);
      s.mesh(placed(new THREE.SphereGeometry(1, 14, 8), [land.x, land.y, land.z], [0.07, 0.012, 0.07]), drop);
      const falling = s.mesh(new THREE.SphereGeometry(0.022, 10, 8), drop, [land.x, tipY - 0.03, land.z]);
      falling.scale.y = 1.35;
      const fall = tipY - 0.03 - land.y, rate = mix(0.25, 1.4, mood.energy);
      moving.push((time) => { const f = (time * rate) % 1; falling.position.y = tipY - 0.03 - fall * f * f; });
    }
    if (a.doing === 'dripping') {
      const spit = new THREE.MeshStandardMaterial({ color: '#e6f1f2', roughness: 0.06, transparent: true, opacity: 0.82 });
      const strands = 3 + Math.floor(random() * 3 + mood.energy * 2);
      for (let i = 0; i < strands; i++) {
        const t = i === 0 ? 0.985 : 1 - (0.03 + random() * Math.min(0.5, outer * 0.7)) / length;
        const from = surf(t, i === 0 ? 0 : (random() < 0.5 ? -1 : 1) * 0.92, false, -0.01);
        if (from.y < 0.14) continue;
        const reach = Math.min(from.y - 0.03, 0.08 + random() * 0.3);
        s.mesh(strut([from.x, from.y, from.z], [from.x, from.y - reach, from.z], 0.012, 0.004, 6), spit);
        const bead = s.mesh(new THREE.SphereGeometry(0.022, 10, 8), spit, [from.x, from.y - reach, from.z]);
        bead.scale.y = 1.5;
        const phase = random(), rate = mix(0.15, 1.1, mood.energy) * (0.7 + random() * 0.6), floor = from.y - reach - 0.02;
        moving.push((time) => { const f = (time * rate + phase) % 1; bead.position.y = from.y - reach - Math.max(0, f - 0.6) / 0.4 * floor; });
        const pool = s.mesh(new THREE.CylinderGeometry(0.06 + random() * 0.07, 0.07 + random() * 0.07, 0.008, 18), spit, [from.x + jitter(0.02), 0.004, from.z + jitter(0.02)]);
        pool.castShadow = false;
      }
    }

    s.root.scale.setScalar(0.3);
    return s.finish(moving.length ? { update: (_dt, time) => { for (const move of moving) move(time); } } : {});
  },
});
