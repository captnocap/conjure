import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';
import { boardTexture, brickTexture, grime, paint, panel, pick, tiledBox, tone, write } from './lib';

export default defineWorld({
  questions: {
    church: choice('What does the church at the back of the lot look like?', {
      clapboard: 'White clapboard with a square bell tower and a pointed spire.',
      brick: 'Red brick with white trim and a squat tower, built to last by people who paid for it a dollar at a time.',
      block: 'Painted cinder block with a low metal roof and a small white steeple bolted on top.',
    }),
    occasion: choice('What is going on in the lot today?', {
      'ordinary-sunday': 'An ordinary Sunday: cars nosed in along the edge, people lingering after the service.',
      homecoming: 'Homecoming and dinner on the grounds: bunting strung across the lot, every space taken.',
      wedding: 'A wedding: white bows on the fence posts, a getaway car trailing cans, petals on the gravel.',
      funeral: 'A funeral: a black hearse at the door, cars with little flags, a green canopy over a fresh grave.',
      revival: 'Revival week: strings of bare bulbs run from the church to a pole and a painted banner by the road.',
      'empty-weekday': 'A weekday with nobody here: one old pickup, a tipped trash barrel, the lot ticking in the heat.',
      abandoned: 'Given up: windows boarded, weeds through the gravel, the fence leaning, a faded FOR SALE sign.',
    }),
    surface: choice('What is the lot surfaced with?', {
      gravel: 'White limestone gravel thinning into grass at the edges.',
      'red-clay': 'Packed red clay and patchy grass.',
      asphalt: 'Old grey asphalt, cracked, with faded yellow lines.',
      grass: 'Just a mown field with tyre ruts worn through it.',
    }),
    cemetery: choice('What is behind the fence beside the church?', {
      'old-stones': 'An old burying ground: thin leaning slabs behind black iron pickets.',
      'tidy-rows': 'Neat rows of granite markers with flowers and small flags, behind a white picket fence.',
      'few-graves': 'Only a handful of graves in a big mown plot behind a chain-link fence, room left for everyone.',
    }),
    beyond: choice('What lies beyond the church and the graves?', {
      corn: 'Tall green corn in rows right up to the fence.',
      cotton: 'Low cotton rows flecked with white.',
      wheat: 'Flat gold wheat to the horizon.',
      pines: 'A dark wall of pine woods.',
      pasture: 'Pasture with round hay bales.',
      soybeans: 'Low dark-green soybean rows.',
    }),
    fixture: choice('What stands in the corner of the lot?', {
      oak: 'A big shade oak with a bench under it.',
      'light-pole': 'A single wooden light pole with a yard lamp.',
      bell: 'The old church bell on a brick stand.',
      hoop: 'A basketball hoop on a pole with a bent rim.',
      'picnic-shelter': 'A tin-roofed picnic shelter with a table.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const wear = Math.min(1, mood.wear + (a.occasion === 'abandoned' ? 0.4 : 0));
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const abandoned = a.occasion === 'abandoned';
    const background = new THREE.Color('#e3e8e6').lerp(new THREE.Color(mood.daylight > 0.5 ? '#edd6bf' : '#dde2ec'), dusk * 0.8).lerp(new THREE.Color('#d6d6d2'), (1 - mood.cheer) * 0.35);
    const grassHex = tone(new THREE.Color('#7f9c50').lerp(new THREE.Color('#9a9460'), wear * 0.5 + (1 - mood.cheer) * 0.2), 0);
    const W = 19, D = 14;
    const { art: s, world } = diorama(context, {
      background: `#${background.getHexString()}`, floor: grassHex, width: W, depth: D, maxHeight: 3.3, radius: 1.6, pitch: 30, yaw: 30,
      slots: [[0.8, 1.6], [-3.4, 2.6], [4.8, 0.8], [-0.6, 5.2], [4.2, 4.8], [7.4, 2.4]],
    });
    const root = s.root;
    const add = <T extends THREE.Object3D>(mesh: T, at: readonly [number, number, number], rotY = 0, parent: THREE.Object3D = root) => { mesh.position.set(...at); mesh.rotation.y = rotY; parent.add(mesh); return mesh; };
    const shadowed = <T extends THREE.Object3D>(node: T) => { node.traverse((child) => { child.castShadow = child.receiveShadow = true; }); return node; };
    const white = s.material('#f3f1e8');
    const dark = s.material('#26282a');
    const woodMat = s.material('#7a5c40', { roughness: 0.95 });

    // ---- The lot surface, with its lines painted in and grass eating the edges
    const LW = 16.5, LD = 10.2, lotX = -0.4, lotZ = 2.2;
    const surfaceHex = { gravel: '#d9d5c8', 'red-clay': '#b8684a', asphalt: '#7d7f80', grass: '#9aa86a' }[a.surface];
    const lineHex = a.surface === 'asphalt' ? '#d8b83a' : '#f4f1e6';
    const lot = panel(LW, LD, (ctx, w, h) => {
      const px = (x: number) => (x - lotX + LW / 2) / LW * w, pz = (z: number) => (z - lotZ + LD / 2) / LD * h, k = w / LW;
      ctx.clearRect(0, 0, w, h);
      // an irregular patch rather than a rectangle
      ctx.fillStyle = surfaceHex;
      ctx.beginPath();
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const angle = i / steps * Math.PI * 2;
        const cx = Math.cos(angle), cz = Math.sin(angle);
        const square = 1 / Math.max(Math.abs(cx), Math.abs(cz));
        const r = Math.min(square, 1.32) * (0.93 + Math.sin(angle * 7 + context.seed) * 0.025 + Math.sin(angle * 13) * 0.02);
        const x = w / 2 + cx * r * w / 2, y = h / 2 + cz * r * h / 2;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.fill();
      ctx.globalCompositeOperation = 'source-atop';
      // texture: stones, clay streaks or mown stripes
      const speck = a.surface === 'gravel' ? ['#c4c0b2', '#e8e5da', '#b3ae9e', '#f1efe6'] : a.surface === 'red-clay' ? ['#a85a3e', '#c47a58', '#9a4f36'] : a.surface === 'asphalt' ? ['#6f7172', '#8a8c8c', '#666869'] : ['#8a9a5c', '#a4b274', '#93a364'];
      for (let i = 0; i < 5200; i++) { ctx.fillStyle = pick(random, speck); ctx.fillRect(random() * w, random() * h, 1 + random() * 3, 1 + random() * 2.4); }
      // tyre tracks from the road (front) curving to the bays
      ctx.strokeStyle = a.surface === 'grass' ? 'rgba(150,120,80,0.55)' : 'rgba(90,80,66,0.16)'; ctx.lineWidth = k * 0.32;
      for (const offset of [-0.8, 0.8]) for (const target of [-6.5, 4.5]) { ctx.beginPath(); ctx.moveTo(px(1.5 + offset), h); ctx.bezierCurveTo(px(1.5 + offset), pz(4), px(target * 0.5 + offset), pz(2.5 + offset * 0.3), px(target), pz(1 + offset)); ctx.stroke(); }
      if (a.surface === 'asphalt') { ctx.strokeStyle = 'rgba(40,40,42,0.6)'; ctx.lineWidth = 2; for (let i = 0; i < 16; i++) { let x = random() * w, y = random() * h; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (random() - 0.5) * 90; y += (random() - 0.5) * 70; ctx.lineTo(x, y); } ctx.stroke(); } }
      // faded parking lines: bays along the left edge and a row in front of the cemetery fence
      if (a.surface !== 'grass') {
        const fade = mix(0.85, 0.3, wear) * (a.surface === 'red-clay' ? 0.6 : 1);
        ctx.fillStyle = lineHex;
        const dash = (x0: number, z0: number, x1: number, z1: number) => {
          const n = 14;
          for (let i = 0; i < n; i++) {
            if (random() < wear * 0.55) continue;
            ctx.globalAlpha = fade * (0.55 + random() * 0.45);
            const t0 = i / n, t1 = (i + 1.05) / n;
            const ax = px(mix(x0, x1, t0)), az = pz(mix(z0, z1, t0)), bx = px(mix(x0, x1, t1)), bz = pz(mix(z0, z1, t1));
            ctx.fillRect(Math.min(ax, bx) - (x0 === x1 ? k * 0.06 : 0), Math.min(az, bz) - (z0 === z1 ? k * 0.06 : 0), Math.abs(bx - ax) + (x0 === x1 ? k * 0.12 : 0), Math.abs(bz - az) + (z0 === z1 ? k * 0.12 : 0));
          }
          ctx.globalAlpha = 1;
        };
        for (let i = 0; i < 5; i++) dash(-8.3, -1.4 + i * 2.35, -5.2, -1.4 + i * 2.35);
        for (let i = 0; i < 4; i++) dash(1.4 + i * 2.3, -2.6, 1.4 + i * 2.3, -0.2);
      }
      // grass breaking through
      ctx.globalCompositeOperation = 'destination-out';
      const holes = Math.round(mix(6, 60, wear) * (a.surface === 'asphalt' ? 0.5 : 1));
      for (let i = 0; i < holes; i++) { const x = random() * w, y = random() * h, r = (0.15 + random() * 0.5 * (0.5 + wear)) * k; ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.5 + random() * 0.5), random() * 3, 0, 7); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    }, { px: 1024, cutout: true, roughness: 1 });
    lot.rotation.x = -Math.PI / 2;
    lot.position.set(lotX, 0.012, lotZ);
    root.add(lot);

    // grass tufts and weeds
    const tufts = Math.round(mix(60, 240, (mood.density + wear) / 2) * (abandoned ? 1.6 : 1));
    s.scatter(new THREE.ConeGeometry(0.5, 1, 4), s.material('#ffffff', { roughness: 1 }), Array.from({ length: tufts }, () => {
      const edge = random() < 0.7 - wear * 0.4;
      const x = edge ? (random() < 0.5 ? -1 : 1) * (W / 2 - random() * 1.6) : (random() - 0.5) * (W - 1), z = edge && random() < 0.5 ? D / 2 - random() * 1.2 : -2.2 + random() * (D / 2 + 2);
      const tall = abandoned || random() < wear * 0.4;
      return { at: [x, tall ? 0.22 : 0.08, z] as const, size: tall ? 0.3 + random() * 0.5 : 0.14 + random() * 0.16, color: pick(random, ['#7d9a52', '#93a85a', '#a8a868', '#6f8a48', '#b8b070']) };
    }));

    // ---- The church
    const church = new THREE.Group();
    const CW = 5.2, CL = 5.0, CH = a.church === 'block' ? 3.2 : 3.9, cf = 0.45;
    const wallHex = { clapboard: '#f3f1e8', brick: pick(random, ['#9a4b38', '#a3573f', '#8a4636']), block: pick(random, ['#e6e2d2', '#d2e0dc', '#efe0bc']) }[a.church];
    const wallMap = a.church === 'clapboard' ? boardTexture(random, wallHex, wear, 6) : brickTexture(random, wallHex, a.church === 'brick' ? '#cfc6b4' : tone(wallHex, -0.1), wear * 0.7);
    const wallTile = a.church === 'clapboard' ? 1 : a.church === 'brick' ? 0.64 : 1.6;
    const wall = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.9 });
    const metal = a.church === 'block';
    const roofHex = metal ? pick(random, ['#8a9aa0', '#7c3a2e', '#5a7260']) : pick(random, ['#4a4440', '#56483e', '#3e484a']);
    const roofMat = new THREE.MeshStandardMaterial({ map: boardTexture(random, roofHex, wear, metal ? 5 : 8, !metal), roughness: metal ? 0.55 : 0.95, metalness: metal ? 0.3 : 0 });
    const pitch = a.church === 'block' ? 0.4 : 0.76, rise = CW / 2 * Math.tan(pitch), eave = cf + CH;
    add(tiledBox([CW + 0.1, cf, CL + 0.1], 1, s.material('#a8a297', { roughness: 1 })), [0, cf / 2, 0], 0, church);
    add(tiledBox([CW, CH, CL], wallTile, wall), [0, cf + CH / 2, 0], 0, church);
    const gable = new THREE.Shape(); gable.moveTo(-CW / 2, 0); gable.lineTo(CW / 2, 0); gable.lineTo(0, rise); gable.closePath();
    const gableMat = wall.clone(); gableMat.map = wallMap.clone(); gableMat.map.repeat.set(1 / wallTile, 1 / wallTile);
    add(new THREE.Mesh(new THREE.ShapeGeometry(gable), gableMat), [0, eave, CL / 2 - 0.001], 0, church);
    const slope = Math.hypot(CW / 2, rise) + 0.4, angle = Math.atan2(rise, CW / 2);
    for (const side of [-1, 1]) add(tiledBox([slope, 0.09, CL + 0.6], 1, roofMat), [side * (CW / 4 + 0.14 * Math.cos(angle)), eave + rise / 2 + 0.04, 0], 0, church).rotation.z = -side * angle;
    const lit = !abandoned && a.occasion !== 'empty-weekday' && (a.occasion === 'revival' || dusk > 0.45);
    const glow = lit ? mix(0.4, 1.1, dusk) : 0;
    const windowPanel = (w: number, h: number) => panel(w, h, (ctx, cw, ch) => {
      ctx.clearRect(0, 0, cw, ch);
      const path = (x: number, y: number, pw: number, ph: number) => { ctx.beginPath(); ctx.moveTo(x, y + ph); ctx.lineTo(x, y + pw / 2); ctx.arc(x + pw / 2, y + pw / 2, pw / 2, Math.PI, 0); ctx.lineTo(x + pw, y + ph); ctx.closePath(); };
      path(0, 0, cw, ch); ctx.fillStyle = '#f4f1e6'; ctx.fill();
      ctx.save(); path(cw * 0.1, cw * 0.1, cw * 0.8, ch - cw * 0.2); ctx.clip();
      if (abandoned) { ctx.fillStyle = '#b3935f'; ctx.fillRect(0, 0, cw, ch); for (let i = 0; i < 18; i++) { ctx.fillStyle = `rgba(90,62,30,${0.1 + random() * 0.15})`; ctx.fillRect(0, random() * ch, cw, 2); } }
      else {
        ctx.fillStyle = lit ? '#ffd98a' : '#3f4f5a'; ctx.fillRect(0, 0, cw, ch);
        const jewel = ['#b3261e', '#1f5fa8', '#e0a81e', '#2f8a4f', '#7a2f8a'];
        for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) { ctx.globalAlpha = lit ? 0.75 : 0.45; ctx.fillStyle = pick(random, jewel); ctx.fillRect(cw * (0.14 + c * 0.38), ch * (0.1 + r * 0.15), cw * 0.34, ch * 0.13); }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }, { px: 160, cutout: true, glow, roughness: 0.4 });
    for (let i = 0; i < 2; i++) for (const side of [-1, 1]) add(windowPanel(0.85, a.church === 'block' ? 1.4 : 2.1), [side * (CW / 2 + 0.012), cf + (a.church === 'block' ? 1.75 : 2.0), -CL / 2 + (i + 0.5) * CL / 2], side * Math.PI / 2, church);
    // tower / steeple and door, facing the lot
    let doorZ = CL / 2, top: [number, number, number];
    if (a.church === 'block') {
      const y = eave + rise - 0.2, z = CL / 2 - 1.1;
      add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.0), white), [0, y + 0.4, z], 0, church);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.7, 1.9, 4), white), [0, y + 0.8 + 0.95, z], Math.PI / 4, church);
      top = [0, y + 2.7, z];
      add(new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 1.5), roofMat), [0, cf + 2.6, CL / 2 + 0.75], 0, church).rotation.x = 0.12;
      for (const x of [-1.3, 1.3]) add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.55, 0.1), white), [x, cf + 1.27, CL / 2 + 1.38], 0, church);
    } else {
      const tw = 2.1, th = CH + rise + (a.church === 'brick' ? 0.2 : 0.4), tz = CL / 2 + tw / 2 - 0.5;
      add(tiledBox([tw, th, tw], wallTile, wall), [0, cf + th / 2, tz], 0, church);
      add(new THREE.Mesh(new THREE.BoxGeometry(tw + 0.25, 0.12, tw + 0.25), white), [0, cf + th + 0.06, tz], 0, church);
      const by = cf + th + 0.12, bw = tw - 0.3, bh = 1.1;
      add(tiledBox([bw, bh, bw], wallTile, a.church === 'brick' ? wall : wall), [0, by + bh / 2, tz], 0, church);
      for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2; add(new THREE.Mesh(new THREE.BoxGeometry(bw * 0.5, bh * 0.62, 0.04), dark), [Math.sin(t) * (bw / 2 + 0.005), by + bh / 2, tz + Math.cos(t) * (bw / 2 + 0.005)], t, church); }
      add(new THREE.Mesh(new THREE.BoxGeometry(bw + 0.3, 0.1, bw + 0.3), white), [0, by + bh + 0.05, tz], 0, church);
      const sh = a.church === 'brick' ? 0.9 : 2.4;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, (bw + 0.2) * 0.707, sh, 4), new THREE.MeshStandardMaterial({ color: roofHex, roughness: 0.9 })), [0, by + bh + 0.1 + sh / 2, tz], Math.PI / 4, church);
      top = [0, by + bh + 0.1 + sh, tz];
      doorZ = tz + tw / 2;
      add(windowPanel(0.6, 0.6), [0, cf + 3.3, doorZ + 0.012], 0, church);
    }
    const crossTilt = (random() - 0.5) * 0.5 * wear * wear;
    const cross = new THREE.Group();
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), white); upright.position.y = 0.55;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1), white); arm.position.y = 0.75;
    cross.add(upright, arm); cross.position.set(...top); cross.rotation.z = crossTilt; church.add(cross);
    const doorHex = abandoned ? '#6a5a4a' : pick(random, ['#8e1f1c', '#234a34', '#f4f1e6', '#7a4f2c']);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.4, 0.08), white), [0, cf + 1.2, doorZ + 0.02], 0, church);
    const doorsOpen = !abandoned && a.occasion !== 'empty-weekday';
    add(new THREE.Mesh(new THREE.BoxGeometry(1.46, 2.25, 0.09), new THREE.MeshStandardMaterial({ color: doorsOpen ? '#3a2616' : doorHex, emissive: '#ffb45a', emissiveIntensity: doorsOpen ? glow * 0.6 : 0, roughness: 0.8 })), [0, cf + 1.125, doorZ + 0.022], 0, church);
    if (doorsOpen) for (const side of [-1, 1]) { const leaf = add(new THREE.Mesh(new THREE.BoxGeometry(0.73, 2.25, 0.05), new THREE.MeshStandardMaterial({ color: doorHex, roughness: 0.7 })), [side * 0.95, cf + 1.125, doorZ + 0.36], 0, church); leaf.rotation.y = -side * 1.35; }
    if (abandoned) { add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.04), new THREE.MeshStandardMaterial({ color: '#b3935f' })), [0, cf + 1.2, doorZ + 0.1], 0, church).rotation.z = 0.12; }
    for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.BoxGeometry(2.3, cf - i * 0.15, 0.32), s.material('#c4c0b4', { roughness: 1 })), [0, (cf - i * 0.15) / 2, doorZ + 0.3 + i * 0.32], 0, church);
    church.scale.setScalar(0.86);
    church.position.set(-4.6, 0, -4.4);
    shadowed(church);
    root.add(church);
    const churchDoor: [number, number] = [-4.6, -4.4 + (doorZ + 1.3) * 0.86];

    // ---- Cemetery and its fence
    const fenceZ = -3.2, fenceX0 = -0.6, fenceX1 = W / 2 - 0.2;
    const fenceHex = a.cemetery === 'old-stones' ? '#26282a' : a.cemetery === 'tidy-rows' ? '#f3f1e8' : '#9aa0a2';
    const fenceMat = s.material(fenceHex, { metalness: a.cemetery === 'tidy-rows' ? 0 : 0.4, roughness: 0.6 });
    const fenceH = a.cemetery === 'few-graves' ? 1.2 : 1.0;
    const lean = (random() - 0.5) * 0.1 + (abandoned ? 0.22 : wear * 0.1);
    const fence = new THREE.Group();
    const runFence = (x0: number, z0: number, x1: number, z1: number, gateAt = -1) => {
      const length = Math.hypot(x1 - x0, z1 - z0), n = Math.round(length / (a.cemetery === 'few-graves' ? 0.5 : 0.22));
      const pickets: { at: readonly [number, number, number]; size: number }[] = [];
      for (let i = 0; i <= n; i++) { const t = i / n; if (gateAt >= 0 && Math.abs(t - gateAt) < 0.07) continue; pickets.push({ at: [mix(x0, x1, t), fenceH / 2, mix(z0, z1, t)], size: 1 }); }
      const geo = a.cemetery === 'tidy-rows' ? new THREE.BoxGeometry(0.09, fenceH, 0.025) : new THREE.CylinderGeometry(0.012, 0.012, fenceH, 5);
      const mesh = new THREE.InstancedMesh(geo, fenceMat, pickets.length);
      const m = new THREE.Matrix4();
      pickets.forEach((p, i) => { m.makeRotationY(x0 === x1 ? Math.PI / 2 : 0).setPosition(...p.at); mesh.setMatrixAt(i, m); });
      mesh.castShadow = true; fence.add(mesh);
      for (const y of [fenceH * 0.25, fenceH * 0.85]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(x0 === x1 ? 0.03 : length, 0.04, x0 === x1 ? length : 0.03), fenceMat); rail.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); rail.castShadow = true; fence.add(rail); }
      const posts = Math.round(length / 2.4);
      for (let i = 0; i <= posts; i++) { const t = i / posts; const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, fenceH + 0.15, 0.1), fenceMat); post.position.set(mix(x0, x1, t), (fenceH + 0.15) / 2, mix(z0, z1, t)); post.castShadow = true; fence.add(post); }
    };
    runFence(fenceX0, fenceZ, fenceX1, fenceZ, 0.3);
    runFence(fenceX0, fenceZ, fenceX0, -D / 2 + 0.2);
    fence.rotation.x = -lean;
    root.add(fence);
    // stones
    const stoneGeo = (() => { const slab = new THREE.BoxGeometry(0.5, 0.6, 0.12); slab.translate(0, 0.3, 0); const cap = new THREE.CylinderGeometry(0.25, 0.25, 0.12, 12, 1, false, 0, Math.PI); cap.rotateX(Math.PI / 2); cap.rotateZ(-Math.PI / 2); cap.translate(0, 0.6, 0); return mergeGeometries([slab, cap])!; })();
    const stones: { x: number; z: number }[] = [];
    const rowsOfStones = a.cemetery === 'few-graves' ? 1 : 3, perRow = a.cemetery === 'few-graves' ? 4 : Math.round(mix(5, 9, mood.density));
    for (let r = 0; r < rowsOfStones; r++) for (let c = 0; c < perRow; c++) {
      if (a.cemetery === 'old-stones' && random() < 0.2) continue;
      stones.push({ x: fenceX0 + 1.0 + c * (fenceX1 - fenceX0 - 1.6) / Math.max(1, perRow - 1) + (a.cemetery === 'old-stones' ? (random() - 0.5) * 0.5 : 0), z: fenceZ - 1.0 - r * 1.15 + (a.cemetery === 'old-stones' ? (random() - 0.5) * 0.3 : 0) });
    }
    const fresh = a.occasion === 'funeral' ? stones.splice(Math.min(stones.length - 1, 1), 1)[0] : null;
    {
      const mesh = new THREE.InstancedMesh(stoneGeo, s.material('#ffffff', { roughness: 0.9 }), stones.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      stones.forEach((stone, i) => {
        const old = a.cemetery === 'old-stones';
        e.set((random() - 0.5) * (old ? 0.5 : 0.06) * (0.4 + wear), (random() - 0.5) * 0.2, (random() - 0.5) * (old ? 0.4 : 0.04) * (0.4 + wear));
        q.setFromEuler(e);
        const k = old ? 0.8 + random() * 0.6 : 1;
        m.compose(new THREE.Vector3(stone.x, 0, stone.z), q, new THREE.Vector3(old ? 0.8 : 1.15, k, 1));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, new THREE.Color(pick(random, old ? ['#8f9088', '#a3a296', '#7d8478', '#b3b0a2'] : ['#9a9ca0', '#b8b4b0', '#70747a', '#c4b8b0'])));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    }
    if (a.cemetery === 'tidy-rows') {
      s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#ffffff'), stones.filter(() => random() < 0.7).flatMap((stone) => Array.from({ length: 3 }, () => ({ at: [stone.x + (random() - 0.5) * 0.4, 0.12 + random() * 0.1, stone.z + 0.22 + random() * 0.1] as const, size: 0.06 + random() * 0.03, color: pick(random, mood.cheer > 0.4 ? ['#d8263c', '#f4e04a', '#ffffff', '#d93f87', '#7a4fc0'] : ['#e8e2d0', '#b9a676', '#a58aa0']) }))));
      for (const stone of stones.filter(() => random() < 0.25)) { s.rod([stone.x + 0.38, 0, stone.z + 0.1], [stone.x + 0.38, 0.5, stone.z + 0.1], 0.008, white); s.box([0.2, 0.13, 0.01], [stone.x + 0.48, 0.43, stone.z + 0.1], s.material(pick(random, ['#b3261e', '#27408b']))); }
    }
    if (fresh) {
      s.ball([0.55, 0.16, 1.05], [fresh.x, 0, fresh.z + 0.9], s.material('#8a4a2e', { roughness: 1 }), 14);
      const green = s.material('#2f5a3a', { roughness: 0.9 });
      for (const dx of [-1.2, 1.2]) for (const dz of [-0.3, 2.0]) s.rod([fresh.x + dx, 0, fresh.z + dz], [fresh.x + dx, 2.1, fresh.z + dz], 0.03, s.material('#c9cdd0', { metalness: 0.4 }));
      s.box([2.7, 0.06, 2.6], [fresh.x, 2.15, fresh.z + 0.85], green);
      s.mesh(new THREE.ConeGeometry(1.9, 0.6, 4), green, [fresh.x, 2.48, fresh.z + 0.85]).rotation.y = Math.PI / 4;
      s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#ffffff'), Array.from({ length: 26 }, () => ({ at: [fresh.x + (random() - 0.5) * 0.8, 0.2 + random() * 0.12, fresh.z + 0.5 + random() * 0.9] as const, size: 0.06 + random() * 0.04, color: pick(random, ['#ffffff', '#f4efe2', '#d8263c', '#f2a6c0', '#f4e04a']) })));
    }

    // ---- Fields beyond: a strip behind the lot with its crop, poles and wires
    const fieldZ0 = -D / 2 - 3.2, fieldZ1 = -D / 2;
    const fieldHex = { corn: '#6f8a4a', cotton: '#7a6a4e', wheat: '#d9b85a', pines: '#5a6a4a', pasture: '#9ab868', soybeans: '#5f6f44' }[a.beyond];
    s.box([W, 0.24, 3.2], [0, -0.12, (fieldZ0 + fieldZ1) / 2], s.material(fieldHex, { roughness: 1 }));
    const crop: { at: readonly [number, number, number]; size: number; color?: string }[] = [];
    const cropRows = a.beyond === 'pines' ? 16 : a.beyond === 'pasture' ? 0 : a.beyond === 'wheat' ? 44 : 26;
    for (let r = 0; r < cropRows; r++) {
      const x = -W / 2 + 0.3 + r * (W - 0.6) / (cropRows - 1);
      const perRowCrop = a.beyond === 'pines' ? 2 : 7;
      for (let i = 0; i < perRowCrop; i++) {
        const z = fieldZ0 + 0.25 + i * (3.0 / perRowCrop) + (random() - 0.5) * 0.12;
        const height = a.beyond === 'corn' ? 1.5 + random() * 0.4 : a.beyond === 'pines' ? 2.6 + random() * 1.3 : a.beyond === 'wheat' ? 0.55 + random() * 0.15 : 0.35 + random() * 0.12;
        crop.push({ at: [x + (a.beyond === 'pines' ? (random() - 0.5) * 0.6 : 0), height / 2, z], size: height, color: a.beyond === 'corn' ? pick(random, ['#5f8a3a', '#6f9a44', '#7da04a']) : a.beyond === 'pines' ? pick(random, ['#2f4a34', '#3a5a3c', '#284230']) : a.beyond === 'wheat' ? pick(random, ['#d9b84a', '#e6c860', '#c9a83e']) : a.beyond === 'cotton' ? pick(random, ['#4f6a3a', '#5a7442']) : pick(random, ['#3f5f34', '#4a6a3a']) });
      }
    }
    if (crop.length) s.scatter(new THREE.ConeGeometry(a.beyond === 'pines' ? 0.26 : a.beyond === 'corn' ? 0.16 : 0.45, 1, a.beyond === 'pines' ? 7 : 5), s.material('#ffffff', { roughness: 1 }), crop);
    if (a.beyond === 'cotton') s.scatter(new THREE.SphereGeometry(1, 5, 4), s.material('#fbf8f0'), crop.flatMap((c) => random() < 0.8 ? [{ at: [c.at[0] + (random() - 0.5) * 0.2, c.size * 0.8, c.at[2] + (random() - 0.5) * 0.2] as const, size: 0.07 }] : []));
    if (a.beyond === 'pasture') for (let i = 0; i < 5; i++) { const bale = s.cylinder(0.65, 0.65, 1.2, [-W / 2 + 1.5 + i * 4 + random() * 1.5, 0.65, fieldZ0 + 0.9 + random() * 1.4], s.material('#d9bc62', { roughness: 1 }), 14); bale.rotation.z = Math.PI / 2; bale.rotation.y = random(); }
    // utility poles and a sagging wire along the road edge of the field
    for (let i = 0; i < 3; i++) { const x = -W / 2 + 1.2 + i * (W - 2.4) / 2; s.rod([x, 0, fieldZ1 - 0.25], [x, 5.2, fieldZ1 - 0.25], 0.07, woodMat, 0.05); s.box([1.1, 0.07, 0.07], [x, 4.9, fieldZ1 - 0.25], woodMat); }
    for (const dx of [-0.45, 0.45]) for (let i = 0; i < 2; i++) { const x0 = -W / 2 + 1.2 + i * (W - 2.4) / 2 + dx, x1 = x0 + (W - 2.4) / 2; s.tube([[x0, 4.95, fieldZ1 - 0.25], [(x0 + x1) / 2, 4.5, fieldZ1 - 0.25], [x1, 4.95, fieldZ1 - 0.25]], 0.012, dark); }

    // ---- Parked cars
    const car = (x: number, z: number, rotY: number, colour: string, kind: 'sedan' | 'pickup' | 'hearse', extras?: (group: THREE.Group) => void) => {
      const group = new THREE.Group();
      const paintMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colour).lerp(new THREE.Color('#8a8478'), wear * 0.3), roughness: mix(0.3, 0.8, wear), metalness: 0.2 });
      const glass = new THREE.MeshStandardMaterial({ color: '#27323a', roughness: 0.2 });
      const length = kind === 'sedan' ? 4.2 : 5.0;
      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(length, 0.62, 1.75), paintMat); bodyMesh.position.y = 0.6; group.add(bodyMesh);
      const cabL = kind === 'sedan' ? 2.1 : kind === 'pickup' ? 1.5 : 3.3, cabX = kind === 'sedan' ? -0.2 : kind === 'pickup' ? 0.45 : -0.6;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabL, 0.52, 1.6), paintMat); cabin.position.set(cabX, 1.16, 0); group.add(cabin);
      const band = new THREE.Mesh(new THREE.BoxGeometry(cabL + 0.02, 0.34, 1.62), glass); band.position.set(cabX, 1.17, 0); group.add(band);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(cabL + 0.03, 0.08, 1.63), paintMat); lid.position.set(cabX, 1.42, 0); group.add(lid);
      for (const px of [-0.5, 0.5]) { const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 1.63), paintMat); pillar.position.set(cabX + px * cabL * (kind === 'hearse' ? 0.3 : 0.05), 1.17, 0); group.add(pillar); }
      if (kind === 'pickup') { const bed = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 1.5), s.material('#3a3a3c')); bed.position.set(-1.35, 0.92, 0); group.add(bed); }
      for (const wx of [-length * 0.32, length * 0.32]) for (const wz of [-0.82, 0.82]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 14), s.material('#1c1c1e')); wheel.rotation.x = Math.PI / 2; wheel.position.set(wx, 0.33, wz); group.add(wheel); }
      for (const wz of [-0.6, 0.6]) { const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.3), s.material('#fdf6dc', a.occasion === 'funeral' ? { emissive: '#fff2c0', emissiveIntensity: 1.2 } : {})); lamp.position.set(length / 2, 0.7, wz); group.add(lamp); }
      extras?.(group);
      shadowed(group);
      group.position.set(x, 0, z); group.rotation.y = rotY;
      root.add(group);
      return group;
    };
    const carColours = ['#f1efe8', '#8a2a2a', '#2a4a7a', '#c9c2a8', '#5a6a5a', '#b8bcc0', '#3a3a3c', '#d9c08a', '#7a4a2a'];
    const bays = [-0.2, 2.15, 4.5, 6.85];
    const fullness = { 'ordinary-sunday': mix(0.4, 0.9, mood.density), homecoming: 1, wedding: 0.8, funeral: 0.85, revival: 0.75, 'empty-weekday': 0, abandoned: 0 }[a.occasion];
    const flagMat = s.material('#5a2a8a');
    for (const z of bays) {
      if (random() > fullness) continue;
      const kind = random() < 0.35 ? 'pickup' : 'sedan';
      car(-6.75 + (random() - 0.5) * 0.3, z + (random() - 0.5) * 0.2, (random() - 0.5) * 0.08, a.occasion === 'funeral' && random() < 0.5 ? '#2a2a2e' : pick(random, carColours), kind, a.occasion === 'funeral' ? (group) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 5), white); pole.position.set(1.3, 1.15, 0.8); group.add(pole);
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.01), flagMat); flag.position.set(1.16, 1.3, 0.8); group.add(flag);
      } : undefined);
    }
    if (a.occasion === 'empty-weekday') car(-6.6, 4.4, 0.3, pick(random, ['#5a6a5a', '#8a2a2a', '#c9c2a8']), 'pickup');
    if (a.occasion === 'funeral') car(churchDoor[0] + 0.3, churchDoor[1] + 1.6, 0.05, '#17171a', 'hearse');
    if (a.occasion === 'wedding') {
      car(churchDoor[0] + 0.5, churchDoor[1] + 1.7, 0.1, pick(random, ['#f1efe8', '#b8bcc0', '#2a4a7a']), 'sedan', (group) => {
        const sign = panel(1.2, 0.36, (ctx, w, h) => { ctx.fillStyle = '#f7f4ea'; ctx.fillRect(0, 0, w, h); write(ctx, 'JUST MARRIED', w / 2, h / 2, h * 0.5, '#b3261e', { max: w * 0.92 }); }, { px: 256 });
        sign.position.set(-2.115, 0.72, 0); sign.rotation.y = -Math.PI / 2; group.add(sign);
        for (let i = 0; i < 5; i++) { const can = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.13, 8), s.material('#c9cdd0', { metalness: 0.5 })); can.position.set(-2.5 - random() * 0.9, 0.06, (random() - 0.5) * 1.4); can.rotation.set(Math.PI / 2, 0, random() * 3); group.add(can); }
      });
      s.scatter(new THREE.SphereGeometry(1, 5, 4), s.material('#ffffff'), Array.from({ length: Math.round(mix(60, 200, mood.density)) }, () => ({ at: [churchDoor[0] + (random() - 0.5) * 2.6, 0.03, churchDoor[1] - 0.6 + random() * 2.6] as const, size: 0.025 + random() * 0.02, color: pick(random, ['#f7d6dc', '#ffffff', '#f2a6b8', '#f6e7b0']) })));
      const posts = Math.round((fenceX1 - fenceX0) / 2.4);
      for (let i = 0; i <= posts; i++) { const x = mix(fenceX0, fenceX1, i / posts); s.ball([0.16, 0.12, 0.08], [x - 0.1, fenceH + 0.05, fenceZ + 0.1], white, 8); s.ball([0.16, 0.12, 0.08], [x + 0.1, fenceH + 0.05, fenceZ + 0.1], white, 8); s.box([0.06, 0.4, 0.02], [x, fenceH - 0.2, fenceZ + 0.1], white); }
    }

    // ---- The corner fixture (front right)
    const fx = 7.6, fz = 5.6;
    let lampTop: [number, number, number] = [fx, 4.6, fz];
    const lampOn = dusk > 0.45 && !abandoned;
    if (a.fixture === 'oak') {
      s.rod([fx, 0, fz], [fx + 0.1, 2.6, fz - 0.1], 0.32, s.material('#5a4634', { roughness: 1 }), 0.22);
      for (let i = 0; i < 4; i++) s.rod([fx + 0.1, 2.3, fz - 0.1], [fx + Math.cos(i * 1.7) * 1.5, 3.6, fz + Math.sin(i * 1.7) * 1.5], 0.12, s.material('#5a4634', { roughness: 1 }), 0.06);
      const leafHex = new THREE.Color('#4f7a3a').lerp(new THREE.Color('#8a7a3a'), wear * 0.5);
      for (let i = 0; i < 9; i++) { const t = i * 2.4, r = i ? 1.2 + random() * 0.6 : 0; s.ball([1.1 + random() * 0.5, 0.8 + random() * 0.35, 1.1 + random() * 0.5], [fx + Math.cos(t) * r, 4.1 + random() * 0.7, fz + Math.sin(t) * r], s.material(`#${leafHex.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08).getHexString()}`, { roughness: 1 }), 9); }
      s.box([1.4, 0.06, 0.36], [fx - 1.4, 0.45, fz + 0.3], woodMat); for (const dx of [-0.55, 0.55]) s.box([0.08, 0.45, 0.32], [fx - 1.4 + dx, 0.225, fz + 0.3], woodMat);
      lampTop = [fx - 0.8, 3.4, fz - 0.5];
    } else if (a.fixture === 'light-pole') {
      s.rod([fx, 0, fz], [fx, 5.0, fz], 0.09, woodMat, 0.06);
      s.rod([fx, 4.7, fz], [fx - 0.9, 4.9, fz - 0.3], 0.025, s.material('#8f9494', { metalness: 0.4 }));
      s.cylinder(0.26, 0.1, 0.16, [fx - 0.9, 4.86, fz - 0.3], s.material('#8f9494', { metalness: 0.4 }), 12);
      s.ball([0.14, 0.1, 0.14], [fx - 0.9, 4.74, fz - 0.3], s.material('#fff4d0', { emissive: mood.warmth > 0.5 ? '#ffb45a' : '#bfe0ff', emissiveIntensity: lampOn ? 2.2 : 0.05 }), 10);
      lampTop = [fx, 4.8, fz];
    } else if (a.fixture === 'bell') {
      const brickMat = new THREE.MeshStandardMaterial({ map: brickTexture(random, '#9a4b38', '#cfc6b4', wear), roughness: 0.9 });
      for (const dx of [-0.6, 0.6]) add(tiledBox([0.4, 1.7, 0.4], 0.64, brickMat), [fx + dx, 0.85, fz]);
      add(tiledBox([1.9, 0.3, 0.6], 0.64, brickMat), [fx, 0.15, fz]);
      s.box([1.7, 0.12, 0.2], [fx, 1.76, fz], woodMat);
      s.lathe([[0.02, 0.62], [0.14, 0.6], [0.24, 0.38], [0.29, 0.12], [0.4, 0], [0.36, -0.03]], s.material('#8a7a4a', { metalness: 0.6, roughness: 0.4 }), [fx, 1.05, fz]).rotation.z = (random() - 0.5) * 0.4 * mood.energy;
      lampTop = [fx, 1.9, fz];
    } else if (a.fixture === 'hoop') {
      s.rod([fx, 0, fz], [fx, 3.3, fz], 0.06, s.material('#5a5e62', { metalness: 0.4 }));
      s.box([0.06, 1.0, 1.5], [fx - 0.25, 3.4, fz], white);
      const rim = s.ring(0.23, 0.02, [fx - 0.52, 3.05, fz], s.material('#e8552d')); rim.rotation.set(Math.PI / 2 + wear * 0.5, 0, 0);
      s.ball([0.12, 0.12, 0.12], [fx - 1.6, 0.12, fz + 0.8], s.material('#d9732a', { roughness: 0.9 }), 12);
      lampTop = [fx, 3.6, fz];
    } else {
      for (const dx of [-1.4, 1.4]) for (const dz of [-1, 1]) s.box([0.12, 2.3, 0.12], [fx - 0.4 + dx, 1.15, fz + dz], woodMat);
      for (const side of [-1, 1]) s.box([1.75, 0.05, 2.6], [fx - 0.4 + side * 0.8, 2.6, fz], s.material('#9aa4a6', { metalness: 0.4, roughness: 0.5 })).rotation.z = -side * 0.3;
      s.box([1.8, 0.06, 0.75], [fx - 0.4, 0.75, fz], woodMat);
      for (const dz of [-0.6, 0.6]) s.box([1.8, 0.05, 0.26], [fx - 0.4, 0.45, fz + dz], woodMat);
      for (const dx of [-0.7, 0.7]) s.box([0.08, 0.75, 1.4], [fx - 0.4 + dx, 0.375, fz], woodMat);
      lampTop = [fx - 0.4, 2.6, fz - 1];
    }

    // ---- Occasion dressing strung across the lot
    const swaying: THREE.Object3D[] = [];
    const towerTop: [number, number, number] = [church.position.x, 5.4, church.position.z + doorZ * 0.86];
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff0c0', emissive: new THREE.Color().setHSL(mix(0.14, 0.08, mood.warmth), 1, 0.6), emissiveIntensity: mix(0.7, 2.2, dusk), roughness: 0.3 });
    if (a.occasion === 'homecoming' || a.occasion === 'revival') {
      const anchors: [number, number, number][] = [towerTop, [1.2, 3.4, -3.0], lampTop];
      if (a.fixture !== 'light-pole' && a.fixture !== 'oak') { s.rod([lampTop[0] - 1.6, 0, lampTop[2] + 0.4], [lampTop[0] - 1.6, 3.6, lampTop[2] + 0.4], 0.05, woodMat); anchors[2] = [lampTop[0] - 1.6, 3.6, lampTop[2] + 0.4]; }
      s.rod([1.2, 0, -3.0], [1.2, 3.4, -3.0], 0.05, woodMat);
      const points: [number, number, number][] = [];
      for (let seg = 0; seg < anchors.length - 1; seg++) { const p = anchors[seg], q = anchors[seg + 1]; const n = 16; for (let i = seg ? 1 : 0; i <= n; i++) { const t = i / n; points.push([mix(p[0], q[0], t), mix(p[1], q[1], t) - Math.sin(t * Math.PI) * 0.7, mix(p[2], q[2], t)]); } }
      s.tube(points, 0.012, dark);
      if (a.occasion === 'revival') s.scatter(new THREE.SphereGeometry(1, 8, 6), bulbMat, points.filter((_p, i) => i % 1 === 0).map((p) => ({ at: [p[0], p[1] - 0.09, p[2]] as const, size: 0.075 }))).castShadow = false;
      else {
        const flags = ['#d8263c', '#f4e04a', '#2a6fd0', '#f4f1e6', '#2f8a4f', '#f08a1e'];
        const bunting = new THREE.Group();
        points.forEach((p, i) => { if (i === 0) return; const flag = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 3), s.material(mood.cheer > 0.35 ? flags[i % flags.length] : pick(random, ['#d8d2c0', '#b9a676', '#8a8f94']))); flag.scale.z = 0.12; flag.rotation.x = Math.PI; flag.position.set(p[0], p[1] - 0.17, p[2]); flag.castShadow = true; bunting.add(flag); swaying.push(flag); });
        root.add(bunting);
      }
    }
    if (a.occasion === 'revival' || abandoned) {
      // a board on two posts by the road at the front left
      const bx = -5.6, bz = D / 2 - 1.0;
      for (const dx of [-1.1, 1.1]) s.box([0.1, 2.0, 0.1], [bx + dx, 1.0, bz], woodMat);
      const board = add(panel(2.3, 1.0, (ctx, w, h) => {
        ctx.fillStyle = abandoned ? '#e8e2d0' : '#f4ecd0'; ctx.fillRect(0, 0, w, h);
        if (abandoned) { write(ctx, 'FOR SALE', w / 2, h * 0.36, h * 0.36, '#b3261e', { max: w * 0.9 }); write(ctx, '2.1 ACRES + BLDG', w / 2, h * 0.74, h * 0.17, '#26282a', { max: w * 0.9 }); }
        else { write(ctx, 'REVIVAL', w / 2, h * 0.34, h * 0.4, '#b3261e', { max: w * 0.9 }); write(ctx, 'NIGHTLY 7 PM', w / 2, h * 0.74, h * 0.2, '#1f2a4a', { max: w * 0.9 }); }
        grime(ctx, w, h, wear, random);
      }, { px: 384 }), [bx, 1.5, bz + 0.06]);
      board.rotation.z = abandoned ? 0.08 : 0;
      board.castShadow = true;
    }
    if (a.occasion === 'empty-weekday' || abandoned) {
      const barrel = s.cylinder(0.3, 0.3, 0.85, [-2.2, 0.3, -1.6], s.material('#4a6a8a', { metalness: 0.3, roughness: 0.7 }), 14);
      barrel.rotation.z = Math.PI / 2; barrel.rotation.y = 0.5;
      s.scatter(new THREE.BoxGeometry(1, 0.2, 0.7), s.material('#ffffff'), Array.from({ length: 9 }, () => ({ at: [-1.6 + random() * 1.6, 0.03, -2.0 + random() * 1.4] as const, size: 0.1 + random() * 0.12, color: pick(random, ['#f4f1e6', '#d8263c', '#c9cdd0', '#e8d9a0']) })));
    }
    // concrete wheel stops along the left bays
    if (a.surface !== 'grass') for (const z of bays) if (random() > wear * 0.5) s.box([0.2, 0.13, 1.7], [-8.75, 0.065, z + (random() - 0.5) * 0.1], s.material('#c9c5b8', { roughness: 1 })).rotation.y = (random() - 0.5) * 0.1 * (1 + wear * 3);

    // ---- Motion
    const flutter = mix(0.1, 1, mood.energy);
    const baseGlow = bulbMat.emissiveIntensity;
    world.update = (_dt, time) => {
      swaying.forEach((flag, i) => { flag.rotation.z = Math.sin(time * 2.4 * flutter + i * 0.7) * 0.35 * flutter; });
      bulbMat.emissiveIntensity = baseGlow * (1 + Math.sin(time * 8.7) * Math.sin(time * 1.9) * 0.1 * flutter);
    };
    return world;
  },
});
