import * as THREE from 'three';
import { choice, defineThing, mix, noul, score } from '@conjure/kit';
import { canvasTexture, grounded, instances, mat, mesh, noise, paint, range, smooth, type Spot, terrainDisc } from './lib';

const DUST = new THREE.Color('#2a2623'), BROWN = new THREE.Color('#4d4136'), GREY = new THREE.Color('#5f5b56'), ICE = new THREE.Color('#9da3a5'), BLUE = new THREE.Color('#c4dde9'), FROST = new THREE.Color('#e3eaec');

export default defineThing({
  questions: {
    form: choice('What shape does the scarp take?', {
      straight: 'A straight wall running right across the view.',
      amphitheatre: 'A curving amphitheatre, its wings reaching forward around the foot.',
      terraced: 'Stepped terraces climbing back like a ruined staircase.',
      prow: 'A jutting prow, a corner of cliff pointing straight at us.',
    }),
    strata: choice('How are its layers banded?', {
      pages: 'Many thin even bands, like the edges of a closed book.',
      bold: 'A few thick bold bands of near-black dust and pale ice.',
      tilted: 'Bands tilted at an angle, dipping across the wall.',
      folded: 'Wavy, folded bands that bend and pinch.',
    }),
    ice: choice('How much clean ice shows in the face?', {
      dusty: 'Hardly any: dark dust over everything, only thin pale seams.',
      streaked: 'Pale ice streaks bleeding down the face from the bands.',
      scar: 'A fresh bright blue-white scar where a slab has just come away.',
      rime: 'A rime of frost along every ledge.',
    }),
    overhang: choice('What is the overhang at the top doing?', {
      holding: 'Holding for now, a deep dark crack running along behind it.',
      leaning: 'Leaning out: a slab already tilted forward over the drop.',
      falling: 'Falling right now: blocks tumbling down the face in mid-air.',
      gone: 'Already gone: a raw notch at the top and a heap of fresh pale blocks below.',
    }),
    top: choice('What lies along the top edge?', {
      smooth: 'A smooth dusty plain running back from the brink.',
      boulders: 'Boulders perched right on the edge.',
      cracks: 'A web of polygonal cracks in the crust.',
    }),
    height: score('How tall does it stand?', ['A low scarp', 'A high wall', 'A colossal cliff hundreds of metres tall']),
    alcoves: noul('Are there dark alcoves and pits in its face?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const n = noise(random), m = noise(random);
    const W = 260, H = mix(70, 230, a.height), Dp = 60;
    const fallen = mix(0.25, 1, mood.wear);

    // ---- Strata: each band has a thickness, a colour and a hardness (how far it stands proud) ----
    const bands: { top: number; colour: THREE.Color; proud: number }[] = [];
    const bandScale = { pages: 0.03, bold: 0.13, tilted: 0.065, folded: 0.075 }[a.strata];
    for (let y = 0, i = 0; y < H * 2; i++) {
      const thick = H * bandScale * range(random, 0.45, 1.6);
      const kind = random();
      const colour = (a.strata === 'bold' ? (i % 2 ? ICE : DUST) : kind < 0.4 ? DUST : kind < 0.6 ? BROWN : kind < 0.85 ? GREY : ICE).clone().offsetHSL(0, 0, range(random, -0.03, 0.03));
      if (a.ice === 'dusty') colour.lerp(DUST, 0.5);
      const hard = colour.getHSL({ h: 0, s: 0, l: 0 }).l > 0.3;
      bands.push({ top: y + thick, colour, proud: (hard ? 1 : random() < 0.5 ? 0.25 : -0.5) * H * 0.022 });
      y += thick;
    }
    const level = (x: number, y: number) => {
      let yy = y;
      if (a.strata === 'tilted') yy += x * 0.2;
      if (a.strata === 'folded') yy += Math.sin(x * 0.028 + n(x, 0, 0, 0.01) * 2) * H * 0.08;
      yy += n(x, y, 0, 0.02) * H * 0.01;
      return Math.max(0, yy + H * 0.4);
    };
    const bandIndex = (x: number, y: number) => {
      const yy = level(x, y);
      let lo = 0, hi = bands.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (yy < bands[mid].top) hi = mid; else lo = mid + 1; }
      return lo;
    };

    // ---- Shape ----
    const notchX = range(random, -0.25, 0.25) * W, notchW = W * range(random, 0.1, 0.16);
    const inNotch = (x: number) => Math.exp(-(((x - notchX) / notchW) ** 2));
    const ledgeDepth = H * 0.13;
    const baseline = (x: number) => {
      const u = x / (W / 2);
      if (a.form === 'amphitheatre') return u * u * W * 0.2;
      if (a.form === 'prow') return -Math.abs(u) * W * 0.3 + W * 0.06;
      return 0;
    };
    // The scarp dies away toward its ends, sinking back into the plain.
    const envelope = (x: number) => 1 - 0.93 * smooth(0.45, 1, Math.abs(x) / (W / 2) + n(x, 0, 0, 0.02) * 0.07);

    // ---- The strata painted as a texture on the face, so the bands stay crisp ----
    const TW = 1024, TH = 512;
    const scarX = range(random, -0.25, 0.25) * W;
    const streaks = Array.from({ length: 12 }, () => [range(random, -W / 2, W / 2), range(random, 3, 8), range(random, 0.25, 0.6)] as const);
    const face = canvasTexture(TW, TH, (ctx) => {
      const image = ctx.createImageData(TW, TH);
      const c = new THREE.Color();
      for (let py = 0; py < TH; py++) {
        const y = (1 - py / TH) * H;
        for (let px = 0; px < TW; px++) {
          const x = (px / TW - 0.5) * W;
          const index = bandIndex(x, y), band = bands[index];
          c.copy(band.colour).offsetHSL(0, 0, m(x, y, 0, 0.06) * 0.025);
          // Dust or ice bleeding down from the bands.
          for (const [sx, w, k] of streaks) {
            const along = Math.exp(-(((x - sx) / w) ** 2)) * smooth(H * 0.95, H * 0.1, y) * k;
            if (along > 0.02) c.lerp(a.ice === 'streaked' ? FROST : DUST, along * (a.ice === 'streaked' ? 0.6 : 0.35));
          }
          if (a.ice === 'rime' && band.proud > 0 && bandIndex(x, y + H * 0.008) !== index) c.lerp(FROST, 0.9);
          if (a.ice === 'scar' || a.overhang === 'gone') {
            const sx = a.overhang === 'gone' ? notchX : scarX;
            const scar = Math.exp(-(((x - sx) / (W * 0.07)) ** 2) - (((y - H * 0.62) / (H * 0.26)) ** 2)) + n(x, y, 0, 0.05) * 0.12;
            c.lerp(BLUE, smooth(0.3, 0.55, scar) * 0.9);
          }
          const o = (py * TW + px) * 4;
          image.data[o] = c.r * 255; image.data[o + 1] = c.g * 255; image.data[o + 2] = c.b * 255; image.data[o + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    }, false);
    face.colorSpace = THREE.LinearSRGBColorSpace;
    face.anisotropy = 4;

    // ---- The wall: a displaced block; the face is carved by the same strata ----
    const wall = new THREE.BoxGeometry(W, H, Dp, 110, 80, 8);
    wall.translate(0, H / 2, -Dp / 2);
    const position = wall.attributes.position;
    const p = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      p.fromBufferAttribute(position, i);
      const y0 = p.y;
      const front = smooth(-Dp * 0.75, 0, p.z), topness = smooth(H * 0.85, H, y0);
      let dz = bands[bandIndex(p.x, y0)].proud * front + n(p.x, y0, p.z, 0.025) * H * 0.035 * front + m(p.x, y0, 0, 0.08) * H * 0.01 * front;
      // The face leans back as it rises, then the overhang juts from the brink.
      dz -= (y0 / H) * H * 0.16 * front;
      if (a.form === 'terraced') dz -= Math.floor(y0 / (H / 4)) * H * 0.14 * front;
      const hang = smooth(H * 0.8, H * 0.9, y0) * front * inNotch(p.x);
      if (a.overhang === 'holding' || a.overhang === 'leaning') dz += ledgeDepth * hang;
      if (a.overhang === 'gone' || a.overhang === 'falling') dz -= ledgeDepth * 1.2 * smooth(H * 0.55, H * 0.85, y0) * front * inNotch(p.x);
      dz += (1 - smooth(0, H * 0.22, y0)) * H * 0.06 * front;
      let y = y0 * envelope(p.x);
      // The plateau behind dips gently away from the brink, swelling with dust.
      y -= smooth(0, -Dp, p.z) * smooth(0, H, y0) * H * 0.08;
      y += n(p.x, 0, p.z, 0.012) * H * 0.04 * topness * envelope(p.x);
      if (a.overhang === 'gone') y -= H * 0.07 * topness * inNotch(p.x) * front;
      p.z += dz + baseline(p.x);
      p.y = y;
      position.setXYZ(i, p.x, p.y, p.z);
    }
    wall.computeVertexNormals();
    // The plateau and back in dusty vertex colour; cracks and the brink crack are drawn here.
    paint(wall, (q, c) => {
      c.copy(DUST).lerp(BROWN, Math.max(0, n(q.x, q.z, 0, 0.03)) * 0.5).lerp(GREY, Math.max(0, m(q.x, q.z, 0, 0.012)) * 0.3);
      const brink = baseline(q.x) - q.z;
      if (a.top === 'cracks') {
        const cell = Math.abs(Math.sin(q.x * 0.1 + n(q.x, q.z, 0, 0.02) * 3) * Math.sin(q.z * 0.12 + n(q.z, q.x, 0, 0.02) * 3));
        if (cell < 0.07) c.lerp(new THREE.Color('#0d0c0b'), 0.85);
      }
      if (a.overhang === 'holding' && inNotch(q.x) > 0.3 && Math.abs(brink - ledgeDepth * 0.25) < 3) c.set('#070606');
    });
    const strataMat = new THREE.MeshStandardMaterial({ map: face, roughness: 0.95 });
    const crustMat = mat('#ffffff', { vertexColors: true, roughness: 1, flatShading: true });
    // Box groups: +x, -x, +y, -y, +z, -z.
    mesh(root, wall, [strataMat, strataMat, crustMat, crustMat, strataMat, crustMat] as unknown as THREE.Material);

    // ---- Alcoves: dark mouths pressed into the face ----
    if (a.alcoves) {
      const holes: Spot[] = Array.from({ length: 4 + Math.floor(random() * 4) }, () => {
        const x = range(random, -0.3, 0.3) * W, y = range(random, 0.1, 0.55) * H * envelope(x), s = H * range(random, 0.03, 0.07) * envelope(x);
        return { at: [x, y, baseline(x) - (y / H) * H * 0.16 + H * 0.02], scale: [s * range(random, 1, 1.8), s, s * 0.5] };
      });
      instances(root, new THREE.SphereGeometry(1, 14, 10), mat('#0b0a09', { roughness: 1 }), holes);
    }

    // ---- The overhang slab or the falling blocks ----
    const block = new THREE.DodecahedronGeometry(1, 0);
    const falling: { mesh: THREE.Object3D; x: number; z: number; y0: number; t: number; spin: THREE.Vector3; speed: number }[] = [];
    if (a.overhang === 'leaning') {
      const slab = new THREE.BoxGeometry(notchW * 1.4, H * 0.2, ledgeDepth * 1.1, 12, 8, 6);
      const sp = slab.attributes.position;
      for (let i = 0; i < sp.count; i++) {
        p.fromBufferAttribute(sp, i);
        const k = 1 + n(p.x, p.y, p.z, 0.03) * 0.18;
        sp.setXYZ(i, p.x * (1 + n(p.y, p.z, 0, 0.04) * 0.1), p.y * k + n(p.x, p.z, 0, 0.05) * H * 0.02, p.z * k + n(p.x, p.y, 0, 0.04) * H * 0.025);
      }
      slab.computeVertexNormals();
      paint(slab, (q, c) => c.copy(bands[bandIndex(notchX + q.x, H * 0.9 + q.y)].colour));
      const hinge = new THREE.Group();
      hinge.position.set(notchX, H * 0.84, baseline(notchX) - H * 0.13 + ledgeDepth * 1.05);
      hinge.rotation.x = range(random, 0.22, 0.32);
      root.add(hinge);
      mesh(hinge, slab, mat('#ffffff', { vertexColors: true, flatShading: true, roughness: 0.95 }), [0, H * 0.1, -ledgeDepth * 0.45]);
    }
    if (a.overhang === 'falling') {
      for (let i = 0; i < 9; i++) {
        const s = H * range(random, 0.015, 0.05);
        const chunk = mesh(root, block, i % 3 === 0 ? mat('#aeb6b9', { flatShading: true }) : mat('#3b3530', { flatShading: true }), [0, 0, 0], [s, s * range(random, 0.6, 1), s * range(random, 0.7, 1.2)]);
        falling.push({ mesh: chunk, x: notchX + range(random, -0.6, 0.6) * notchW, z: baseline(notchX) + range(random, 0.05, 0.16) * H, y0: H * 0.8, t: random(), spin: new THREE.Vector3(random(), random(), random()), speed: range(random, 0.7, 1.3) });
      }
    }

    // ---- Talus fans at the foot ----
    const fans = [{ x: a.overhang === 'gone' || a.overhang === 'falling' ? notchX : range(random, -0.25, 0.25) * W, big: 1 }];
    for (let i = 0; i < 1 + Math.floor(random() * 2); i++) fans.push({ x: range(random, -0.35, 0.35) * W, big: range(random, 0.45, 0.75) });
    const boulders: Spot[] = [];
    const fresh = a.overhang === 'gone';
    for (const fan of fans) {
      const e = envelope(fan.x);
      const R = H * mix(0.32, 0.62, fallen) * fan.big * e, tall = H * mix(0.1, 0.26, fallen) * fan.big * e;
      const foot = baseline(fan.x) + H * 0.03;
      const height = (x: number, z: number, t: number) => {
        const lump = n(x + fan.x, 0, z, 0.08) * tall * 0.08;
        return Math.max(0, tall * (1 - t) ** 1.35 + lump * (1 - t)) * (1 - smooth(0.9, 1, t)) - smooth(0.95, 1, t) * 0.4;
      };
      const g = terrainDisc(16, 48, (angle) => R * (Math.sin(angle) > 0 ? 1 : 0.45) * (1 + n(Math.cos(angle), Math.sin(angle), fan.x, 1) * 0.15), height);
      paint(g, (q, c) => { c.copy(DUST).lerp(GREY, Math.max(0, n(q.x + fan.x, q.z, 0, 0.1)) * 0.5); if (fresh && fan.big === 1) c.lerp(ICE, 0.3); });
      mesh(root, g, mat('#ffffff', { vertexColors: true, flatShading: true, roughness: 1 }), [fan.x, 0, foot]);
      const count = Math.round(mix(14, 40, fallen) * fan.big) + (fresh && fan.big === 1 ? 14 : 0);
      for (let i = 0; i < count; i++) {
        const angle = range(random, 0.1, Math.PI - 0.1), r = Math.sqrt(random()) * R * 0.95, t = r / R;
        const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
        const s = H * range(random, 0.006, 0.028) * (0.6 + t) * (random() < 0.1 ? 2 : 1) * e;
        const pale = (fresh && fan.big === 1 && random() < 0.5) || random() < 0.15;
        boulders.push({ at: [fan.x + x, height(x, z, t) + s * 0.4, foot + z], scale: [s, s * range(random, 0.6, 1), s * range(random, 0.8, 1.3)], rot: [random() * 3, random() * 3, random() * 3], color: pale ? '#aab3b6' : random() < 0.5 ? '#3a342f' : '#544a42' });
      }
    }
    if (a.top === 'boulders') for (let i = 0; i < 9; i++) {
      const x = range(random, -0.35, 0.35) * W, s = H * range(random, 0.012, 0.03);
      boulders.push({ at: [x, H * envelope(x) * 0.97 + s * 0.2, baseline(x) - H * 0.16 - range(random, 4, 14)], scale: s, rot: [random() * 3, random() * 3, 0], color: random() < 0.4 ? '#aab3b6' : '#4a423b' });
    }
    instances(root, block, mat('#ffffff', { flatShading: true, roughness: 0.9 }), boulders);

    // ---- Motion: blocks fall and reset ----
    const pace = mix(0.2, 1.4, mood.energy);
    const lay = () => {
      for (const f of falling) {
        const y = f.y0 - f.t * f.t * f.y0;
        f.mesh.position.set(f.x, Math.max(0, y), f.z + f.t * H * 0.08);
        f.mesh.rotation.set(f.spin.x * f.t * 8, f.spin.y * f.t * 6, f.spin.z * f.t * 5);
      }
    };
    lay();
    const update = (dt: number) => {
      for (const f of falling) { f.t += dt * pace * 0.12 * f.speed; if (f.t > 1) f.t -= 1; }
      lay();
    };
    return grounded(root, { update, footprint: W * 0.4 });
  },
});
