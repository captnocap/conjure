import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, paint, paintHex } from '@conjure/kit';

const flat = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);
const sharpTexture = (canvas: HTMLCanvasElement, colour = false) => {
  const t = new THREE.CanvasTexture(canvas);
  if (colour) t.colorSpace = THREE.SRGBColorSpace;
  // Letters are cut out with alphaTest, which mipmaps would erode at a distance.
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  return t;
};
const Y = new THREE.Vector3(0, 1, 0);
const segment = (a: THREE.Vector3, b: THREE.Vector3, w: number, d = w) => {
  const dir = b.clone().sub(a), len = dir.length();
  return new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize()), new THREE.Vector3(w, len, d));
};

const TEXT = 'Pepsi-Cola';
const PANEL_W = 37, PANEL_H = 13, PANEL_Y = 6.5, TEXT_X = -2.5, BOW = 0.006;
const CW = 2048, CH = 720;

export default defineThing({
  questions: {
    neon: paint('What colour is the neon?', ['red', 'magenta', 'white', 'amber', 'turquoise']),
    state: choice('What state is the sign in?', {
      lit: 'Fully lit, every letter glowing steadily.',
      buzzing: 'Buzzing and failing: several letters dead so it spells something shorter, one stuttering on and off.',
      unlit: 'Unlit and rusting: dark tubes, peeling paint, the lattice streaked orange.',
      moving: 'Being relocated: a crane lifting the whole sign off its footings on cables.',
    }),
    era: choice('Which version of the sign is it?', {
      forties: 'The 1940s original: cream enamel letter faces edged in neon, the bottle with a paper label.',
      nineties: 'The 1990s restoration: glossy red letters, the bottle with the round red-white-blue cap logo.',
    }),
    birds: choice('What is perched along the top rail?', {
      none: 'Nothing: just the bare top rail.',
      gulls: 'A row of white herring gulls.',
      pigeons: 'A crowd of grey pigeons huddled together.',
    }),
    weather: choice('What is the weather?', {
      clear: 'A clear evening, the glow crisp.',
      rain: 'Rain smearing the glow into a wide wet halo, the steel shining.',
      snow: 'Snow lying along the girders and the tops of the letters.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.25) / 0.75));
    const dark = a.state === 'unlit';
    const rust = Math.min(1, Math.max(0, mood.wear - 0.35) * 0.8 + (dark ? 0.55 : 0));
    const neonHex = paintHex(a.neon);
    const wet = a.weather === 'rain';

    // ---- Lettering laid out once, then drawn as faces, tubes and glow.
    const measure = document.createElement('canvas').getContext('2d')!;
    const font = (px: number) => `italic bold ${px}px "Z003", "URW Chancery L", "Brush Script MT", "Segoe Script", cursive, serif`;
    let px = 640;
    measure.font = font(px);
    px = Math.min(px, px * (CW * 0.92) / measure.measureText(TEXT).width);
    measure.font = font(px);
    const total = measure.measureText(TEXT).width;
    const x0 = (CW - total) / 2, base = CH * 0.68;
    const glyphs = [...TEXT].map((ch, i) => ({ ch, x: x0 + measure.measureText(TEXT.slice(0, i)).width }));
    // Dead letters: the buzzing state kills several, wear can kill one more on a lit sign.
    const live = glyphs.map(() => !dark);
    let stutter = -1;
    if (a.state === 'buzzing') {
      const kill = 2 + Math.round(mood.wear * 2 + random());
      for (let k = 0; k < kill; k++) live[1 + Math.floor(random() * (glyphs.length - 1))] = false;
      do stutter = Math.floor(random() * glyphs.length); while (!live[stutter] && stutter !== 0);
      live[0] = true;
    } else if (!dark && mood.wear > 0.6) live[1 + Math.floor(random() * (glyphs.length - 1))] = false;
    if (glyphs[5].ch === '-' && a.state !== 'buzzing') live[5] = !dark;

    const draw = (pick: (i: number) => boolean, paintIt: (c: CanvasRenderingContext2D, ch: string, x: number) => void, blur = 0) => {
      const canvas = document.createElement('canvas');
      canvas.width = CW; canvas.height = CH;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#000'; c.fillRect(0, 0, CW, CH);
      c.font = font(px); c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
      if (blur) c.filter = `blur(${blur}px)`;
      glyphs.forEach((g, i) => { if (pick(i)) paintIt(c, g.ch, g.x); });
      return canvas;
    };
    const faces = draw(() => true, (c, ch, x) => { c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = 34; c.strokeText(ch, x, base); c.fillText(ch, x, base); });
    const tubes = (pick: (i: number) => boolean) => draw(pick, (c, ch, x) => { c.strokeStyle = '#fff'; c.lineWidth = 13; c.strokeText(ch, x, base); });
    const glowCanvas = draw((i) => live[i], (c, ch, x) => { c.strokeStyle = '#fff'; c.lineWidth = 30; c.strokeText(ch, x, base); }, wet ? 40 : 18);

    // A slightly bowed panel: the curve pushes the ends back.
    const bowed = (dz: number, scale = 1) => {
      const geo = new THREE.PlaneGeometry(PANEL_W * scale, PANEL_H * scale, 48, 1);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, -BOW * p.getX(i) ** 2 + dz);
      geo.computeVertexNormals();
      return geo.translate(TEXT_X, PANEL_Y + PANEL_H / 2, 0);
    };
    const faceTone = a.era === 'forties' ? '#efe3c4' : '#c8102e';
    const backing = s.material(new THREE.Color(faceTone).lerp(new THREE.Color('#7a5a40'), rust * 0.4), { alphaMap: sharpTexture(faces), alphaTest: 0.5, side: THREE.DoubleSide, roughness: wet ? 0.3 : 0.7 });
    const glowLevel = dark ? 0 : mix(0.5, 3.2, night) * (0.85 + mood.cheer * 0.3);
    const neon = new THREE.MeshStandardMaterial({ color: dark ? '#5a5a5a' : neonHex, emissive: neonHex, emissiveIntensity: glowLevel, alphaMap: sharpTexture(tubes((i) => live[i] && i !== stutter)), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.3 });
    const deadTube = new THREE.MeshStandardMaterial({ color: '#7d7470', alphaMap: sharpTexture(tubes((i) => !live[i])), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4 });
    const meshes: THREE.Mesh[] = [];
    const put = (geo: THREE.BufferGeometry, mat: THREE.Material, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; meshes.push(m); return m; };
    put(bowed(0), backing);
    put(bowed(0.25), neon);
    if (live.some((v) => !v) && !dark) put(bowed(0.22), deadTube);
    if (dark) neon.color.set('#6c6560');
    let stutterMat: THREE.MeshStandardMaterial | null = null;
    if (stutter >= 0) { stutterMat = neon.clone(); stutterMat.alphaMap = sharpTexture(tubes((i) => i === stutter)); put(bowed(0.26), stutterMat); }
    const glowMat = new THREE.MeshBasicMaterial({ color: neonHex, alphaMap: sharpTexture(glowCanvas), transparent: true, opacity: dark ? 0 : mix(0.15, 0.85, night) * (wet ? 1.2 : 1), depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const glow = put(bowed(0.6, 1.04), glowMat, false);
    glow.visible = !dark;

    // ---- The bottle standing at the right-hand end.
    const bottleX = 20.5, bottleY = PANEL_Y - 0.5;
    const profile: [number, number][] = [[0, 0], [1.5, 0], [1.65, 0.6], [1.6, 3], [1.25, 5], [1.35, 6.5], [1.75, 8.6], [1.6, 10.2], [0.75, 12.6], [0.62, 14.2], [0.75, 14.6], [0.75, 15.3], [0, 15.4]];
    const glass = s.material(a.era === 'forties' ? '#4c6a5a' : '#3a2a20', { roughness: 0.25, metalness: 0.1, emissive: neonHex, emissiveIntensity: dark ? 0 : night * 0.15 });
    const bottle = put(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 28).translate(bottleX, bottleY, 0), glass);
    void bottle;
    const swirlGeos: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 5; k++) {
      const pts: THREE.Vector3[] = [];
      for (let t = 0; t <= 1.001; t += 0.05) { const y = 0.8 + t * 5.6, an = k * 1.2566 + t * 2.4, r = 1.62 - Math.sin(t * Math.PI) * 0.3; pts.push(new THREE.Vector3(bottleX + Math.cos(an) * r, bottleY + y, Math.sin(an) * r)); }
      swirlGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.09, 5));
    }
    put(mergeGeometries(swirlGeos), glass);
    // Label or cap logo.
    const label = document.createElement('canvas'); label.width = 512; label.height = 128;
    {
      const c = label.getContext('2d')!;
      if (a.era === 'forties') { c.fillStyle = '#efe3c4'; c.fillRect(0, 0, 512, 128); c.fillStyle = '#c8102e'; c.font = font(70); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(TEXT, 128, 64, 240); c.fillText(TEXT, 384, 64, 240); }
      else { c.fillStyle = '#f4f2ec'; c.fillRect(0, 0, 512, 128); for (const cx of [128, 384]) { c.fillStyle = '#c8102e'; c.fillRect(cx - 60, 14, 120, 50); c.fillStyle = '#1f4fbf'; c.fillRect(cx - 60, 64, 120, 50); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(cx, 64, 60, 12, 0, 0, Math.PI * 2); c.fill(); } }
    }
    put(new THREE.CylinderGeometry(1.76, 1.76, 1.8, 28, 1, true).translate(bottleX, bottleY + 8.6, 0), new THREE.MeshStandardMaterial({ map: sharpTexture(label, true), roughness: 0.6 }));
    // The bottle's neon outline on its front.
    const outline = profile.slice(1, -1).map(([r, y]) => [r + 0.12, y] as const);
    const outlineGeos: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) outlineGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outline.map(([r, y]) => new THREE.Vector3(bottleX + side * r * 0.97, bottleY + y, r * 0.25))), 60, 0.12, 6));
    put(mergeGeometries(outlineGeos), live[0] ? neon : deadTube);

    // ---- The black steel lattice behind and beneath.
    const steel = s.material(new THREE.Color('#1d1f22').lerp(new THREE.Color('#7a3e1c'), rust * 0.55), { metalness: 0.2, roughness: 0.55 + rust * 0.3 });
    const beams: THREE.Matrix4[] = [];
    const left = TEXT_X - PANEL_W / 2 - 0.5, right = bottleX + 2, top = PANEL_Y + PANEL_H + 0.8;
    const zAt = (x: number) => -BOW * (x - TEXT_X) ** 2;
    const planes = [-1.2, -4.2];
    for (let x = left; x <= right + 0.01; x += (right - left) / 14) {
      const zc = x > TEXT_X + PANEL_W / 2 ? zAt(TEXT_X + PANEL_W / 2) : zAt(x);
      for (const dz of planes) beams.push(segment(new THREE.Vector3(x, -0.5, zc + dz), new THREE.Vector3(x, top, zc + dz), 0.35, 0.35));
      beams.push(segment(new THREE.Vector3(x, PANEL_Y, zc + planes[0]), new THREE.Vector3(x, PANEL_Y, zc + planes[1]), 0.22));
      beams.push(segment(new THREE.Vector3(x, top, zc + planes[0]), new THREE.Vector3(x, top, zc + planes[1]), 0.22));
      beams.push(segment(new THREE.Vector3(x, PANEL_Y, zc + planes[0]), new THREE.Vector3(x, top, zc + planes[1]), 0.14));
    }
    for (const dz of planes) for (const y of [0.4, PANEL_Y, PANEL_Y + PANEL_H / 2, top]) {
      for (let x = left; x < right - 0.01; x += (right - left) / 14) {
        const x2 = x + (right - left) / 14;
        const z1 = (x > TEXT_X + PANEL_W / 2 ? zAt(TEXT_X + PANEL_W / 2) : zAt(x)) + dz, z2 = (x2 > TEXT_X + PANEL_W / 2 ? zAt(TEXT_X + PANEL_W / 2) : zAt(x2)) + dz;
        beams.push(segment(new THREE.Vector3(x, y, z1), new THREE.Vector3(x2, y, z2), 0.26));
        if (y === PANEL_Y || y === 0.4) beams.push(segment(new THREE.Vector3(x, y, z1), new THREE.Vector3(x2, y === 0.4 ? PANEL_Y : y + PANEL_H / 2, z2), 0.14));
      }
    }
    const lattice = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), steel, beams.length);
    beams.forEach((m, i) => lattice.setMatrixAt(i, m));
    lattice.instanceMatrix.needsUpdate = true;
    lattice.castShadow = lattice.receiveShadow = true;
    const g = new THREE.Group();
    for (const m of meshes) g.add(m);
    g.add(lattice);
    // Footings.
    const concrete = s.material('#9d988e', { roughness: 0.95 });
    const foot = new THREE.Mesh(mergeGeometries([new THREE.BoxGeometry(right - left + 3, 0.8, 6.2).translate((left + right) / 2, 0.4, -3.4)]), concrete);
    foot.receiveShadow = true;
    g.add(foot);

    const updates: ((time: number) => void)[] = [];

    // ---- Birds on the top rail.
    if (a.birds !== 'none') {
      const n = a.birds === 'gulls' ? 9 + Math.round(mood.density * 8) : 18 + Math.round(mood.density * 14);
      const birdGeo = a.birds === 'gulls'
        ? mergeGeometries([new THREE.SphereGeometry(0.32, 8, 6).scale(1.8, 0.9, 0.9), new THREE.SphereGeometry(0.17, 8, 6).translate(0.48, 0.25, 0), new THREE.ConeGeometry(0.06, 0.25, 5).rotateZ(-Math.PI / 2).translate(0.7, 0.22, 0)].map(flat))
        : mergeGeometries([new THREE.SphereGeometry(0.22, 8, 6).scale(1.5, 1, 1), new THREE.SphereGeometry(0.12, 8, 6).translate(0.28, 0.18, 0)].map(flat));
      const birds = new THREE.InstancedMesh(birdGeo, s.material(a.birds === 'gulls' ? '#f2f2ee' : '#7f8288'), n);
      for (let i = 0; i < n; i++) {
        const x = left + 1 + random() * (right - left - 2), dz = planes[random() < 0.5 ? 0 : 1];
        const zc = x > TEXT_X + PANEL_W / 2 ? zAt(TEXT_X + PANEL_W / 2) : zAt(x);
        birds.setMatrixAt(i, new THREE.Matrix4().makeRotationY(random() * Math.PI * 2).setPosition(x, top + 0.4, zc + dz));
      }
      birds.instanceMatrix.needsUpdate = true;
      birds.castShadow = true;
      g.add(birds);
    }

    // ---- Weather.
    if (a.weather === 'snow') {
      const caps: THREE.BufferGeometry[] = [];
      for (const dz of planes) for (const y of [PANEL_Y, top]) caps.push(new THREE.BoxGeometry(right - left, 0.3, 0.6).translate((left + right) / 2, y + 0.3, dz - 1.4));
      caps.push(new THREE.BoxGeometry(right - left + 3, 0.3, 6.2).translate((left + right) / 2, 0.95, -3.4));
      const snow = new THREE.Mesh(mergeGeometries(caps), s.material('#f5f7fa', { roughness: 0.95 }));
      g.add(snow);
    } else if (wet) {
      const drops: THREE.Matrix4[] = [];
      for (let i = 0; i < 400; i++) drops.push(new THREE.Matrix4().makeScale(0.05, 1.8, 0.05).setPosition(left + random() * (right - left), random() * 26, -8 + random() * 14));
      const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#b9c6d4', transparent: true, opacity: 0.4, depthWrite: false }), drops.length);
      drops.forEach((m, i) => rain.setMatrixAt(i, m));
      rain.instanceMatrix.needsUpdate = true;
      g.add(rain);
      updates.push((time) => { rain.position.y = -((time * 14) % 5); });
    }

    // ---- Being moved by a crane.
    if (a.state === 'moving') {
      const lift = 3.2;
      for (const m of [...meshes, lattice]) m.position.y += lift;
      const yellow = s.material('#e8b21a', { roughness: 0.6 });
      const crane: THREE.Matrix4[] = [];
      const cx = left - 9, cz = 6, tipY = 46;
      const tip = new THREE.Vector3((left + right) / 2, tipY, -2);
      for (const dz of [-1, 1]) for (const dx of [-1, 1]) crane.push(segment(new THREE.Vector3(cx + dx * 0.9, 3, cz + dz * 0.9), tip.clone().add(new THREE.Vector3(dx * 0.4, 0, dz * 0.4)), 0.3));
      for (let t = 0.1; t < 1; t += 0.1) { const p = new THREE.Vector3(cx, 3, cz).lerp(tip, t); crane.push(segment(p.clone().add(new THREE.Vector3(-0.9, 0, -0.9)), p.clone().add(new THREE.Vector3(0.9, 1.5, 0.9)), 0.15)); }
      const boom = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), yellow, crane.length);
      crane.forEach((m, i) => boom.setMatrixAt(i, m));
      boom.instanceMatrix.needsUpdate = true; boom.castShadow = true;
      g.add(boom);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 4).translate(cx, 1.7, cz), yellow); cab.castShadow = true; g.add(cab);
      const cables = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), steel, 4);
      [left + 4, (left + right) / 2 - 6, (left + right) / 2 + 6, right - 4].forEach((x, i) => cables.setMatrixAt(i, segment(tip, new THREE.Vector3(x, top + lift, -2.6), 0.06)));
      cables.instanceMatrix.needsUpdate = true;
      g.add(cables);
    }

    // Flicker with the scene's energy; the stuttering letter cuts in and out.
    const energy = mood.energy;
    updates.push((time) => {
      if (dark) return;
      const hum = 1 + Math.sin(time * 37) * 0.04 * energy + (Math.sin(time * 5.3) > 0.97 - energy * 0.05 ? -0.35 * energy : 0);
      neon.emissiveIntensity = glowLevel * hum;
      glowMat.opacity = mix(0.15, 0.85, night) * (wet ? 1.2 : 1) * hum;
      if (stutterMat) stutterMat.emissiveIntensity = Math.sin(time * (6 + energy * 18)) > 0.2 ? glowLevel : 0.02;
    });

    g.rotation.y = 25 * Math.PI / 180;
    s.root.add(g);
    return s.finish({ footprint: 20, update: (_dt, time) => { for (const fn of updates) fn(time); } });
  },
});
